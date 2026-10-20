<?php
/**
 * PAPER CUP — API des demandes · stockage privé.
 *
 * Arborescence (par défaut hors de la racine web, voir pc_config()['storage_dir']) :
 *   requests/<référence>/request.json   données de la demande
 *   requests/<référence>/files/…        pièces jointes (noms générés par le serveur)
 *   idempotency/  ratelimit/  outbox/  logs/  secret.key
 *
 * Chaque dossier reçoit un .htaccess « Require all denied » et un index.html vide : défense en
 * profondeur si le stockage est placé par erreur sous la racine web (Apache). Sous Nginx, voir README.
 */

declare(strict_types=1);

const PC_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PC_ID_PATTERN = '/^PC-\d{8}-[A-HJKMNP-Z2-9]{5}$/';

/** Racine du stockage (créée à la demande), ou null si elle est inaccessible en écriture. */
function pc_storage_root(): ?string
{
    static $root = false;
    if ($root !== false) {
        return $root;
    }
    $dir = rtrim((string) pc_config()['storage_dir'], '/\\');
    if ($dir === '' || (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) || !is_writable($dir)) {
        return $root = null;
    }
    pc_protect_dir($dir);
    return $root = (realpath($dir) ?: $dir);
}

/** Sous-dossier privé du stockage, créé si besoin. */
function pc_storage_path(string $sub): ?string
{
    $root = pc_storage_root();
    if ($root === null || !preg_match('#^[a-z0-9_-]+(/[A-Za-z0-9_-]+)*$#', $sub)) {
        return null;
    }
    $dir = $root . '/' . $sub;
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
        return null;
    }
    pc_protect_dir($dir);
    return $dir;
}

function pc_protect_dir(string $dir): void
{
    if (!is_file($dir . '/.htaccess')) {
        @file_put_contents(
            $dir . '/.htaccess',
            "# Stockage privé PAPER CUP : aucun accès HTTP direct.\nRequire all denied\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n",
        );
    }
    if (!is_file($dir . '/index.html')) {
        @file_put_contents($dir . '/index.html', '');
    }
}

/** Le stockage est-il sous la racine web ? (avertissement affiché dans l'administration) */
function pc_storage_is_public(): bool
{
    $root = pc_storage_root();
    $docroot = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? '')) ?: '';
    return $root !== null && $docroot !== '' && str_starts_with($root . '/', rtrim($docroot, '/') . '/');
}

/** Secret HMAC : configuration, sinon généré une fois (256 bits) et conservé dans le stockage. */
function pc_secret(): string
{
    static $secret = null;
    if ($secret !== null) {
        return $secret;
    }
    $configured = (string) pc_config()['secret'];
    if (strlen($configured) >= 32) {
        return $secret = $configured;
    }
    $root = pc_storage_root();
    if ($root === null) {
        throw new RuntimeException('Stockage indisponible : secret impossible à initialiser.');
    }
    $file = $root . '/secret.key';
    $read = fn () => trim((string) @file_get_contents($file));
    // Création exclusive (mode « x ») : un seul processus écrit le secret, les autres attendent qu'il soit
    // complet. Un fichier resté vide (écriture interrompue) est remplacé après 10 secondes.
    for ($attempt = 0; $attempt < 40; $attempt++) {
        $value = $read();
        if (strlen($value) >= 32) {
            return $secret = $value;
        }
        clearstatcache(true, $file);
        if (!is_file($file)) {
            $fh = @fopen($file, 'x');
            if ($fh !== false) {
                fwrite($fh, bin2hex(random_bytes(32)));
                fflush($fh);
                fclose($fh);
                @chmod($file, 0600);
                continue;
            }
        } elseif ((int) @filemtime($file) < time() - 10) {
            @unlink($file);
            continue;
        }
        usleep(50000);
    }
    throw new RuntimeException('Secret de stockage illisible.');
}

/* --------------------------------------------------------------- JSON */

function pc_read_json(string $file): ?array
{
    if (!is_file($file)) {
        return null;
    }
    $data = json_decode((string) @file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

/** Écriture atomique (fichier temporaire puis renommage). */
function pc_write_json(string $file, array $data): bool
{
    $tmp = $file . '.tmp-' . bin2hex(random_bytes(6));
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || @file_put_contents($tmp, $json . "\n", LOCK_EX) === false) {
        @unlink($tmp);
        return false;
    }
    @chmod($tmp, 0640);
    if (!@rename($tmp, $file)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

/* ------------------------------------------------------------ Demandes */

/** Crée le dossier d'une nouvelle demande et renvoie [référence, chemin]. L'unicité est garantie par mkdir. */
function pc_new_request_dir(): array
{
    $base = pc_storage_path('requests');
    if ($base === null) {
        throw new RuntimeException('Stockage des demandes indisponible.');
    }
    $len = strlen(PC_ID_ALPHABET);
    for ($attempt = 0; $attempt < 20; $attempt++) {
        $suffix = '';
        for ($i = 0; $i < 5; $i++) {
            $suffix .= PC_ID_ALPHABET[random_int(0, $len - 1)];
        }
        $id = 'PC-' . date('Ymd') . '-' . $suffix;
        $dir = $base . '/' . $id;
        if (@mkdir($dir, 0750)) {
            mkdir($dir . '/files', 0750);
            pc_protect_dir($dir);
            pc_protect_dir($dir . '/files');
            return [$id, $dir];
        }
    }
    throw new RuntimeException('Impossible de créer une référence de demande unique.');
}

function pc_request_dir(string $id): ?string
{
    if (!preg_match(PC_ID_PATTERN, $id)) {
        return null;
    }
    $base = pc_storage_path('requests');
    $dir = $base === null ? null : $base . '/' . $id;
    return $dir !== null && is_dir($dir) ? $dir : null;
}

function pc_request_load(string $id): ?array
{
    $dir = pc_request_dir($id);
    return $dir === null ? null : pc_read_json($dir . '/request.json');
}

function pc_request_save(array $request): bool
{
    $dir = pc_request_dir((string) ($request['id'] ?? ''));
    return $dir !== null && pc_write_json($dir . '/request.json', $request);
}

/** Toutes les demandes, des plus récentes aux plus anciennes. */
function pc_request_list(): array
{
    $base = pc_storage_path('requests');
    if ($base === null) {
        return [];
    }
    $items = [];
    foreach (glob($base . '/PC-*/request.json') ?: [] as $file) {
        $data = pc_read_json($file);
        if ($data !== null) {
            $items[] = $data;
        }
    }
    usort($items, fn ($a, $b) => strcmp((string) ($b['created_at'] ?? ''), (string) ($a['created_at'] ?? '')));
    return $items;
}

/** Supprime une demande et ses fichiers. */
function pc_request_delete(string $id): bool
{
    $dir = pc_request_dir($id);
    if ($dir === null) {
        return false;
    }
    $freed = array_sum(array_map(fn ($f) => (int) ($f['size'] ?? 0), pc_read_json($dir . '/request.json')['files'] ?? []));
    pc_storage_used_add(-$freed);
    foreach ([$dir . '/files', $dir] as $d) {
        foreach (scandir($d) ?: [] as $entry) {
            if ($entry !== '.' && $entry !== '..' && is_file($d . '/' . $entry)) {
                @unlink($d . '/' . $entry);
            }
        }
    }
    @rmdir($dir . '/files');
    return @rmdir($dir);
}

/* -------------------------------------------------------- Idempotence */

/**
 * Exécute $create une seule fois par clé : un renvoi (double clic, coupure réseau, nouvel essai)
 * reçoit le résultat déjà mémorisé au lieu de créer une seconde demande.
 * Le verrou exclusif sérialise les envois concurrents portant la même clé.
 */
function pc_idempotent(string $key, int $ttl, callable $create): array
{
    $dir = pc_storage_path('idempotency');
    if ($dir === null) {
        return $create();
    }
    $hash = hash_hmac('sha256', $key, pc_secret());
    $lock = fopen($dir . '/' . $hash . '.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('Verrou d’idempotence indisponible.');
    }
    try {
        $file = $dir . '/' . $hash . '.json';
        $previous = pc_read_json($file);
        if ($previous !== null && (int) ($previous['at'] ?? 0) > time() - $ttl && is_array($previous['result'] ?? null)) {
            return ['duplicate' => true] + $previous['result'];
        }
        $result = $create();
        if (!empty($result['ok'])) {
            pc_write_json($file, ['at' => time(), 'result' => $result]);
        }
        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
        if (random_int(1, 50) === 1) {
            pc_gc($dir, max($ttl, 86400));
        }
    }
}

/** Nettoyage opportuniste des fichiers techniques expirés. */
function pc_gc(string $dir, int $maxAge): void
{
    $limit = time() - $maxAge;
    // Deux motifs plutôt que GLOB_BRACE, absent de certaines bibliothèques C (musl).
    foreach (array_merge(glob($dir . '/*.json') ?: [], glob($dir . '/*.lock') ?: []) as $file) {
        if (@filemtime($file) < $limit) {
            @unlink($file);
        }
    }
}

/* ---------------------------------------------------------- Anti-abus */

/**
 * Fenêtre glissante par client (adresse IP hachée, jamais stockée en clair).
 * Renvoie le nombre d'événements dans la fenêtre, après enregistrement éventuel du nouvel événement.
 */
function pc_rate(string $bucket, int $window, bool $record, ?int $max = null, bool $global = false): int
{
    $dir = pc_storage_path('ratelimit');
    if ($dir === null) {
        return 0;
    }
    $who = hash_hmac('sha256', $bucket . '|' . ($global ? '*' : pc_client_ip()), pc_secret());
    $fh = fopen($dir . '/' . $bucket . '-' . substr($who, 0, 40) . '.json', 'c+');
    if ($fh === false || !flock($fh, LOCK_EX)) {
        return 0;
    }
    try {
        $hits = json_decode((string) stream_get_contents($fh), true);
        $now = time();
        $hits = array_values(array_filter(is_array($hits) ? $hits : [], fn ($t) => is_int($t) && $t > $now - $window));
        // Avec $max : vérification et enregistrement sous le même verrou (aucun dépassement par envois simultanés),
        // et rien n'est enregistré au-delà du plafond (le fichier ne grossit plus).
        if ($record && ($max === null || count($hits) < $max)) {
            $hits[] = $now;
            $hits = array_slice($hits, -1000);
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($hits));
            return $max === null ? count($hits) : 0;
        }
        return $max === null ? count($hits) : count($hits) + 1;
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
        if (random_int(1, 100) === 1) {
            pc_gc($dir, max($window, 86400));
        }
    }
}

/** Prend une place dans la fenêtre si le plafond n'est pas atteint (vérification et enregistrement atomiques). */
function pc_rate_take(string $bucket, int $window, int $max, bool $global = false): bool
{
    return pc_rate($bucket, $window, true, max(1, $max), $global) === 0;
}

/** Réinitialise un compteur (connexion réussie). */
function pc_rate_reset(string $bucket): void
{
    $dir = pc_storage_path('ratelimit');
    if ($dir !== null) {
        $who = hash_hmac('sha256', $bucket . '|' . pc_client_ip(), pc_secret());
        @unlink($dir . '/' . $bucket . '-' . substr($who, 0, 40) . '.json');
    }
}

/**
 * Les pièces jointes ($incoming octets) peuvent-elles être enregistrées ? Deux garde-fous :
 * le volume total conservé (storage_max_bytes, indépendant des quotas que disk_free_space() ne voit pas)
 * et la réserve d'espace disque (min_free_bytes). Les demandes sans fichier ne sont jamais concernées.
 */
function pc_disk_ok(int $incoming): bool
{
    if ($incoming <= 0) {
        return true;
    }
    $max = (int) pc_config()['storage_max_bytes'];
    if ($max > 0 && pc_storage_used() + $incoming > $max) {
        return false;
    }
    $root = pc_storage_root();
    $free = $root === null || !function_exists('disk_free_space') ? false : @disk_free_space($root);
    if ($free === false) {
        return true; // Fonction désactivée par l'hébergeur : seul le plafond storage_max_bytes s'applique.
    }
    return $free - $incoming >= (int) pc_config()['min_free_bytes'];
}

/**
 * Volume des pièces jointes conservées (d'après les fiches des demandes). Le total est mis en cache
 * une minute : un envoi n'oblige pas à relire toutes les fiches.
 */
function pc_storage_used(bool $fresh = false): int
{
    $base = pc_storage_path('requests');
    if ($base === null) {
        return 0;
    }
    $cache = pc_read_json($base . '/../usage.json');
    if (!$fresh && $cache !== null && (int) ($cache['at'] ?? 0) > time() - 60) {
        return (int) $cache['bytes'];
    }
    $total = 0;
    foreach (glob($base . '/PC-*/request.json') ?: [] as $file) {
        foreach ((pc_read_json($file)['files'] ?? []) as $f) {
            $total += (int) ($f['size'] ?? 0);
        }
    }
    pc_write_json($base . '/../usage.json', ['bytes' => $total, 'at' => time()]);
    return $total;
}

/** Ajoute (ou retire) des octets au total en cache, sans attendre son recalcul. */
function pc_storage_used_add(int $bytes): void
{
    $base = pc_storage_path('requests');
    $cache = $base === null ? null : pc_read_json($base . '/../usage.json');
    if ($cache !== null) {
        pc_write_json($base . '/../usage.json', ['bytes' => max(0, (int) $cache['bytes'] + $bytes), 'at' => (int) $cache['at']]);
    }
}

/* ------------------------------------------- Demandes successives (même clé) */

/** Dernière demande créée avec une clé d'idempotence donnée (renvoi modifié après une coupure). */
function pc_key_latest(string $key): ?string
{
    $dir = pc_storage_path('idempotency');
    $data = $dir === null ? null : pc_read_json($dir . '/latest-' . hash_hmac('sha256', $key, pc_secret()) . '.json');
    return $data !== null && (int) ($data['at'] ?? 0) > time() - 86400 && preg_match(PC_ID_PATTERN, (string) ($data['id'] ?? '')) ? $data['id'] : null;
}

function pc_key_remember(string $key, string $id): void
{
    $dir = pc_storage_path('idempotency');
    if ($dir !== null) {
        pc_write_json($dir . '/latest-' . hash_hmac('sha256', $key, pc_secret()) . '.json', ['id' => $id, 'at' => time()]);
    }
}
