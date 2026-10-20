<?php
/**
 * PAPER CUP — API des demandes · amorçage commun.
 *
 * Configuration, en-têtes de sécurité, réponses JSON, utilitaires.
 * Aucune dépendance : PHP 8.1+ avec les extensions fileinfo, mbstring et json
 * (présentes par défaut sur les hébergements PHP courants).
 *
 * Priorité de configuration : valeurs par défaut < api/config.local.php < variables d'environnement PC_*.
 */

declare(strict_types=1);

if (PHP_VERSION_ID < 80100) {
    http_response_code(500);
    exit('PHP 8.1 ou supérieur requis.');
}

// Jamais d'erreur affichée au visiteur (chemins, valeurs) : elles vont au journal du serveur.
if (function_exists('ini_set')) {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}

const PC_FORMATS = ['4oz', '6-5oz', '9oz', '12oz'];
const PC_FORMAT_LABELS = ['4oz' => '4 oz', '6-5oz' => '6,5 oz', '9oz' => '9 oz', '12oz' => '12 oz'];
const PC_INKS = ['#CC3D14' => 'Vermillon', '#1C1A17' => 'Encre', '#8A5A2B' => 'Terre', '#55683A' => 'Olive', '#2C4A7A' => 'Indigo'];

/** Configuration effective (mise en cache pour la requête). */
function pc_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $defaults = [
        // Stockage privé : par défaut HORS de la racine web (dossier parent du thème).
        'storage_dir' => dirname(__DIR__, 3) . '/papercup-data',
        // Limites applicatives ; les limites effectives sont plafonnées par php.ini (voir pc_upload_limits()).
        'max_files' => 5,
        'max_file_bytes' => 10 * 1024 * 1024,
        'max_total_bytes' => 25 * 1024 * 1024,
        // Taille maximale d'une requête acceptée par le serveur web (Nginx client_max_body_size,
        // Apache LimitRequestBody) si elle est inférieure à post_max_size. 0 : non renseignée.
        'max_request_bytes' => 0,
        // Volume total maximal des pièces jointes conservées, et demandes maximales par heure (tous visiteurs).
        'storage_max_bytes' => 2 * 1024 * 1024 * 1024,
        'global_rate_max' => 200,
        // Réserve d'espace disque minimale à conserver après l'enregistrement d'une demande.
        'min_free_bytes' => 200 * 1024 * 1024,
        // SVG, EPS et PSD : désactivés par défaut (voir README, § Sécurité des pièces jointes).
        'allow_design_files' => false,
        // Notifications internes.
        'notify_to' => 'paper.cup@hotmail.fr',
        'mail_from' => 'PAPER CUP <no-reply@papercup.com.tn>',
        'mail_transport' => 'mail', // mail (sendmail du serveur) | file (fichiers .eml) | none
        // Adresse publique du site, utilisée pour les liens des notifications. Sans elle, l'e-mail ne contient
        // aucun lien (jamais de lien construit à partir de l'en-tête Host, falsifiable).
        'site_url' => '', // ex. https://www.papercup.com.tn
        'signed_link_ttl' => 7 * 24 * 3600,
        // Espace d'administration (désactivé tant qu'aucun mot de passe n'est configuré).
        'admin_user' => 'papercup',
        'admin_password_hash' => '',
        'admin_session_ttl' => 30 * 60,
        // Refuser l'administration hors HTTPS (redirection en GET, refus en POST). À activer en production,
        // sauf si le serveur redirige déjà tout le site en HTTPS.
        'force_https' => false,
        // Anti-abus.
        'rate_limit_max' => 20,
        'rate_limit_window' => 3600,
        'login_max_attempts' => 5,
        'login_window' => 15 * 60,
        'allowed_origins' => [],
        // Secret HMAC (liens signés, empreintes). Généré et conservé dans le stockage s'il est vide.
        'secret' => '',
        'timezone' => 'Africa/Tunis',
    ];

    $local = [];
    $localFile = dirname(__DIR__) . '/config.local.php';
    if (is_file($localFile)) {
        $loaded = require $localFile;
        if (is_array($loaded)) {
            $local = $loaded;
        }
    }
    $config = array_merge($defaults, $local);

    $env = [
        'PC_STORAGE_DIR' => ['storage_dir', 'string'],
        'PC_MAX_FILES' => ['max_files', 'int'],
        'PC_MAX_FILE_BYTES' => ['max_file_bytes', 'int'],
        'PC_MAX_TOTAL_BYTES' => ['max_total_bytes', 'int'],
        'PC_MAX_REQUEST_BYTES' => ['max_request_bytes', 'int'],
        'PC_STORAGE_MAX_BYTES' => ['storage_max_bytes', 'int'],
        'PC_GLOBAL_RATE_MAX' => ['global_rate_max', 'int'],
        'PC_FORCE_HTTPS' => ['force_https', 'bool'],
        'PC_MIN_FREE_BYTES' => ['min_free_bytes', 'int'],
        'PC_ALLOW_DESIGN_FILES' => ['allow_design_files', 'bool'],
        'PC_NOTIFY_TO' => ['notify_to', 'string'],
        'PC_MAIL_FROM' => ['mail_from', 'string'],
        'PC_MAIL_TRANSPORT' => ['mail_transport', 'string'],
        'PC_SITE_URL' => ['site_url', 'string'],
        'PC_SIGNED_LINK_TTL' => ['signed_link_ttl', 'int'],
        'PC_ADMIN_USER' => ['admin_user', 'string'],
        'PC_ADMIN_PASSWORD_HASH' => ['admin_password_hash', 'string'],
        'PC_RATE_LIMIT_MAX' => ['rate_limit_max', 'int'],
        'PC_ALLOWED_ORIGINS' => ['allowed_origins', 'list'],
        'PC_SECRET' => ['secret', 'string'],
        'PC_TIMEZONE' => ['timezone', 'string'],
    ];
    foreach ($env as $name => [$key, $type]) {
        $value = getenv($name);
        if ($value === false || $value === '') {
            continue;
        }
        $config[$key] = match ($type) {
            'int' => (int) $value,
            'bool' => in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true),
            'list' => array_values(array_filter(array_map('trim', explode(',', $value)))),
            default => $value,
        };
    }
    return $config;
}

/** Octets d'une directive php.ini (« 2M », « 512K », « 1G »). */
function pc_ini_bytes(string $directive): int
{
    $raw = trim((string) ini_get($directive));
    // « 0 » ou « -1 » : pas de limite côté PHP.
    if ($raw === '' || $raw === '-1' || $raw === '0') {
        return PHP_INT_MAX;
    }
    $unit = strtolower(substr($raw, -1));
    $number = (float) $raw;
    return (int) match ($unit) {
        'g' => $number * 1024 ** 3,
        'm' => $number * 1024 ** 2,
        'k' => $number * 1024,
        default => $number,
    };
}

/**
 * Limites EFFECTIVES : minimum entre la configuration applicative et celle du serveur PHP.
 * Le navigateur les reçoit par GET api/demande.php : l'interface n'annonce jamais plus que le serveur n'accepte.
 */
function pc_upload_limits(): array
{
    $c = pc_config();
    // Sans l'extension fileinfo, le type réel des fichiers ne peut pas être contrôlé : envoi de fichiers désactivé.
    $enabled = filter_var(ini_get('file_uploads'), FILTER_VALIDATE_BOOLEAN) && class_exists('finfo');
    $postMax = pc_ini_bytes('post_max_size');
    if ((int) $c['max_request_bytes'] > 0) {
        $postMax = min($postMax, (int) $c['max_request_bytes']);
    }
    // Marge pour les champs texte et l'enveloppe multipart.
    $postBudget = $postMax === PHP_INT_MAX ? PHP_INT_MAX : max(0, $postMax - 64 * 1024);
    $perFile = min((int) $c['max_file_bytes'], pc_ini_bytes('upload_max_filesize'), $postBudget);
    $total = min((int) $c['max_total_bytes'], $postBudget);
    $iniFiles = ini_get('max_file_uploads');
    $count = min((int) $c['max_files'], $iniFiles === false || $iniFiles === '' ? 20 : (int) $iniFiles);
    return [
        'enabled' => $enabled && $perFile > 0 && $count > 0,
        'maxFiles' => max(0, $count),
        'maxFileBytes' => max(0, $perFile),
        'maxTotalBytes' => max(0, min($total, $perFile * max(1, $count))),
        'postMaxBytes' => $postMax,
    ];
}

/** Types acceptés : extension → MIME détecté(s) attendu(s). Les fichiers de création sont optionnels. */
function pc_allowed_types(): array
{
    $types = [
        'png' => ['mimes' => ['image/png'], 'label' => 'PNG'],
        'jpg' => ['mimes' => ['image/jpeg'], 'label' => 'JPG'],
        'jpeg' => ['mimes' => ['image/jpeg'], 'label' => 'JPEG'],
        'webp' => ['mimes' => ['image/webp'], 'label' => 'WEBP'],
        'pdf' => ['mimes' => ['application/pdf'], 'label' => 'PDF'],
    ];
    // Fichiers de création : jamais affichés ni interprétés par le serveur, contrôlés par signature
    // (voir uploads.php). Désactivés par défaut : à activer explicitement (allow_design_files).
    if (pc_config()['allow_design_files']) {
        // Illustrator enregistré avec « Créer un fichier compatible PDF » (option par défaut) : contenu PDF.
        $types['ai'] = ['mimes' => ['application/pdf'], 'label' => 'AI (compatible PDF)'];
        $types['svg'] = ['mimes' => ['image/svg+xml', 'text/xml', 'application/xml', 'text/plain'], 'label' => 'SVG'];
        $types['eps'] = ['mimes' => ['application/postscript', 'image/x-eps', 'application/octet-stream'], 'label' => 'EPS'];
        $types['psd'] = ['mimes' => ['image/vnd.adobe.photoshop', 'application/octet-stream'], 'label' => 'PSD'];
    }
    return $types;
}

/* ------------------------------------------------------------------ Réponses */

function pc_security_headers(string $csp = "default-src 'none'; frame-ancestors 'none'"): void
{
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('X-Frame-Options: DENY');
    header('Content-Security-Policy: ' . $csp);
    header('Cache-Control: no-store, max-age=0');
    header('X-Robots-Tag: noindex, nofollow');
}

/** Réponse JSON et fin de script. */
function pc_json(int $status, array $payload): never
{
    http_response_code($status);
    pc_security_headers();
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function pc_h(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Texte saisi : normalisé NFC, sans caractères de contrôle, longueur bornée. */
function pc_clean(mixed $value, int $max, bool $multiline = false): string
{
    if (!is_string($value)) {
        return '';
    }
    if (!mb_check_encoding($value, 'UTF-8')) {
        $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
    }
    if (class_exists('Normalizer')) {
        $value = Normalizer::normalize($value, Normalizer::FORM_C) ?: $value;
    }
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $pattern = $multiline ? '/[\x00-\x09\x0B-\x1F\x7F]/u' : '/[\x00-\x1F\x7F]/u';
    $value = preg_replace($pattern, '', $value) ?? '';
    if ($multiline) {
        $value = preg_replace("/\n{3,}/", "\n\n", $value) ?? $value;
    }
    return mb_substr(trim($value), 0, $max);
}

function pc_format_bytes(int $bytes): string
{
    if ($bytes >= 1024 * 1024) {
        return str_replace('.', ',', (string) round($bytes / (1024 * 1024), 1)) . ' Mo';
    }
    return max(1, (int) round($bytes / 1024)) . ' Ko';
}

/**
 * URL publique du site, uniquement si elle est configurée (site_url).
 * Jamais déduite de l'en-tête Host : un visiteur pourrait sinon faire pointer les liens des
 * notifications internes vers un autre domaine (hameçonnage de l'équipe).
 */
function pc_site_url(): ?string
{
    $configured = rtrim(trim((string) pc_config()['site_url']), '/');
    return preg_match('#^https?://[A-Za-z0-9.\-]+(:\d+)?(/[A-Za-z0-9._~/\-]*)?$#i', $configured) ? $configured : null;
}

function pc_is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
}

/** Valeur texte d'un paramètre ($_GET, $_POST) ; '' si absent ou non scalaire (tableaux refusés). */
function pc_param(array $source, string $key): string
{
    $value = $source[$key] ?? '';
    return is_string($value) ? $value : '';
}

/**
 * Identifiant du client pour la limitation : REMOTE_ADDR uniquement (les en-têtes X-Forwarded-* sont
 * falsifiables). En IPv6, le préfixe /64 (attribué à un même abonné) : changer d'adresse ne contourne rien.
 */
function pc_client_ip(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    if (str_contains($ip, ':')) {
        $bin = @inet_pton($ip);
        if ($bin !== false && strlen($bin) === 16) {
            // Adresse IPv4 vue par un serveur à double pile (::ffff:a.b.c.d) : l'adresse IPv4 elle-même.
            if (substr($bin, 0, 12) === str_repeat("\0", 10) . "\xff\xff") {
                return (string) inet_ntop(substr($bin, 12));
            }
            // Adresses spéciales (::1, ::) : telles quelles.
            if (substr($bin, 0, 8) === str_repeat("\0", 8)) {
                return $ip;
            }
            return bin2hex(substr($bin, 0, 8)) . '::/64';
        }
    }
    return $ip;
}

/** Journal technique privé (jamais de données personnelles complètes). */
function pc_log(string $message): void
{
    $dir = pc_storage_path('logs');
    if ($dir === null) {
        error_log('[papercup] ' . $message);
        return;
    }
    @file_put_contents($dir . '/api-' . gmdate('Y-m') . '.log', gmdate('c') . ' ' . $message . "\n", FILE_APPEND | LOCK_EX);
}

date_default_timezone_set(in_array(pc_config()['timezone'], timezone_identifiers_list(), true) ? pc_config()['timezone'] : 'UTC');

require __DIR__ . '/storage.php';
require __DIR__ . '/uploads.php';
require __DIR__ . '/requests.php';
require __DIR__ . '/mailer.php';
