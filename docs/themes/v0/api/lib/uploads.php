<?php
/**
 * PAPER CUP — API des demandes · pièces jointes.
 *
 * Contrôles serveur, indépendants de la validation du navigateur :
 *  1. code d'erreur PHP et provenance (is_uploaded_file) ;
 *  2. nombre, taille unitaire et taille totale (limites effectives, voir pc_upload_limits()) ;
 *  3. extension autorisée ET type réel détecté sur le contenu (finfo), jamais le type annoncé ;
 *  4. contrôle de structure propre au format (image décodable, en-tête PDF, signature PSD/EPS,
 *     SVG sans script ni ressource externe) ;
 *  5. enregistrement sous un nom généré par le serveur, hors racine web ; le nom d'origine n'est
 *     conservé que comme libellé.
 * Les fichiers ne sont jamais exécutés, convertis ni interprétés par le serveur.
 */

declare(strict_types=1);

// Images très grandes refusées : elles alourdiraient l'aperçu de l'administration (décompression).
const PC_MAX_IMAGE_SIDE = 10000;
const PC_MAX_IMAGE_PIXELS = 40_000_000;
// Au-delà, l'administration n'affiche pas l'image en miniature (lien d'aperçu seulement).
const PC_THUMB_MAX_PIXELS = 16_000_000;

/** Liste à plat des fichiers reçus dans le champ multiple « fichiers[] ». Les entrées vides sont ignorées. */
function pc_uploaded_files(string $field = 'fichiers'): array
{
    $raw = $_FILES[$field] ?? null;
    if (!is_array($raw) || !isset($raw['name'])) {
        return [];
    }
    $list = [];
    // Seules les entrées simples sont lues (un champ « fichiers[a][b] » imbriqué est ignoré).
    $scalar = fn ($v) => is_scalar($v) ? (string) $v : null;
    $names = is_array($raw['name']) ? $raw['name'] : [$raw['name']];
    $pick = fn (string $k, $i) => is_array($raw[$k] ?? null) ? ($raw[$k][$i] ?? null) : ($raw[$k] ?? null);
    foreach (array_keys($names) as $pos => $i) {
        $name = $scalar(is_array($raw['name']) ? $raw['name'][$i] : $raw['name']);
        $tmp = $scalar($pick('tmp_name', $i));
        if ($name === null || $tmp === null) {
            continue;
        }
        $list[] = [
            'index' => $pos,
            'name' => $name,
            'tmp_name' => $tmp,
            'error' => (int) $scalar($pick('error', $i) ?? UPLOAD_ERR_NO_FILE),
            'size' => (int) $scalar($pick('size', $i) ?? 0),
        ];
    }
    return array_values(array_filter($list, fn ($f) => !($f['error'] === UPLOAD_ERR_NO_FILE && ($f['name'] === '' || $f['size'] === 0))));
}

/** Extension d'un nom de fichier d'origine (lue avant toute troncature du nom). */
function pc_extension(string $name): string
{
    return strtolower(pathinfo(basename(str_replace('\\', '/', $name)), PATHINFO_EXTENSION));
}

/** Nom d'origine réduit à un libellé sûr (aucun chemin, aucun caractère de contrôle), extension conservée. */
function pc_display_name(string $name): string
{
    $name = basename(str_replace('\\', '/', $name));
    $name = pc_clean($name, 1000);
    $name = preg_replace('/[<>:"|?*]/u', '_', $name) ?? '';
    $name = ltrim($name, '.');
    if (mb_strlen($name) > 140) {
        $ext = pc_extension($name);
        $stem = $ext === '' ? $name : mb_substr($name, 0, -(mb_strlen($ext) + 1));
        $name = mb_substr($stem, 0, 130) . ($ext !== '' ? '.' . $ext : '');
    }
    return $name === '' ? 'fichier' : $name;
}

/**
 * Valide les fichiers reçus.
 * @return array{0: array, 1: array} [fichiers valides, erreurs ['name' => …, 'message' => …]]
 */
function pc_validate_uploads(array $files): array
{
    if ($files === []) {
        return [[], []]; // Demande sans fichier : aucun contrôle de fichier nécessaire.
    }
    $limits = pc_upload_limits();
    $types = pc_allowed_types();
    $valid = [];
    $errors = [];
    $total = 0;
    $seen = [];

    if (!$limits['enabled']) {
        return [[], [['name' => '', 'message' => 'L’envoi de fichiers est désactivé sur ce serveur. Envoyez votre demande sans pièce jointe.']]];
    }
    if (count($files) > $limits['maxFiles']) {
        return [[], [['name' => '', 'message' => sprintf('Vous pouvez joindre %d fichiers au maximum.', $limits['maxFiles'])]]];
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE); // présent : pc_upload_limits() désactive l'envoi sans fileinfo
    foreach ($files as $f) {
        $label = pc_display_name((string) $f['name']);
        $index = (int) $f['index'];
        $fail = function (string $message) use (&$errors, $label, $index) {
            $errors[] = ['index' => $index, 'name' => $label, 'message' => $message];
        };

        switch ($f['error']) {
            case UPLOAD_ERR_OK:
                break;
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $fail(sprintf('Fichier trop volumineux (%s maximum).', pc_format_bytes($limits['maxFileBytes'])));
                continue 2;
            case UPLOAD_ERR_PARTIAL:
                $fail('Le fichier n’a été reçu que partiellement. Réessayez.');
                continue 2;
            default:
                pc_log('upload error code ' . $f['error']);
                $fail('Le serveur n’a pas pu recevoir ce fichier.');
                continue 2;
        }
        $tmp = (string) $f['tmp_name'];
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            $fail('Fichier invalide.');
            continue;
        }
        $size = (int) filesize($tmp);
        if ($size <= 0) {
            $fail('Le fichier est vide.');
            continue;
        }
        if ($size > $limits['maxFileBytes']) {
            $fail(sprintf('Fichier trop volumineux (%s maximum).', pc_format_bytes($limits['maxFileBytes'])));
            continue;
        }
        $ext = pc_extension((string) $f['name']);
        if (!isset($types[$ext])) {
            $fail('Format non accepté. Formats acceptés : ' . pc_accepted_labels() . '.');
            continue;
        }
        $mime = (string) $finfo->file($tmp);
        if (!in_array($mime, $types[$ext]['mimes'], true)) {
            $fail('Le contenu du fichier ne correspond pas à son extension .' . $ext . '.');
            continue;
        }
        $problem = pc_check_structure($ext, $tmp);
        if ($problem !== null) {
            $fail($problem);
            continue;
        }
        $dims = isset(PC_IMAGE_TYPES[$ext]) ? @getimagesize($tmp) : false;
        $sha = hash_file('sha256', $tmp);
        if (isset($seen[$sha])) {
            continue; // Même fichier sélectionné deux fois : un seul exemplaire est conservé.
        }
        $seen[$sha] = true;
        $total += $size;
        $valid[] = [
            'tmp' => $tmp,
            'name' => $label,
            'ext' => $ext,
            'mime' => $mime,
            'size' => $size,
            'sha256' => $sha,
            'width' => $dims ? (int) $dims[0] : null,
            'height' => $dims ? (int) $dims[1] : null,
        ];
    }

    if ($total > $limits['maxTotalBytes']) {
        $errors[] = ['name' => '', 'message' => sprintf('L’ensemble des fichiers dépasse %s. Retirez un ou plusieurs fichiers.', pc_format_bytes($limits['maxTotalBytes']))];
    }
    return [$errors === [] ? $valid : [], $errors];
}

const PC_IMAGE_TYPES = ['png' => IMAGETYPE_PNG, 'jpg' => IMAGETYPE_JPEG, 'jpeg' => IMAGETYPE_JPEG, 'webp' => IMAGETYPE_WEBP];

/** Contrôle de structure propre au format ; renvoie un message d'erreur ou null. */
function pc_check_structure(string $ext, string $path): ?string
{
    $head = (string) file_get_contents($path, false, null, 0, 2048);
    switch ($ext) {
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'webp':
            $info = @getimagesize($path);
            $expected = PC_IMAGE_TYPES[$ext];
            if ($info === false || $info[2] !== $expected) {
                return 'Image illisible ou endommagée.';
            }
            if ($info[0] < 1 || $info[1] < 1 || $info[0] > PC_MAX_IMAGE_SIDE || $info[1] > PC_MAX_IMAGE_SIDE || $info[0] * $info[1] > PC_MAX_IMAGE_PIXELS) {
                return 'Dimensions de l’image non prises en charge.';
            }
            return null;
        case 'pdf':
        case 'ai':
            // En-tête %PDF- au début et marqueur de fin %%EOF : un document tronqué est refusé.
            $size = (int) filesize($path);
            $tail = (string) file_get_contents($path, false, null, max(0, $size - 2048));
            return str_contains(substr($head, 0, 1024), '%PDF-') && str_contains($tail, '%%EOF') ? null : 'Document PDF invalide ou incomplet.';
        case 'psd':
            return str_starts_with($head, '8BPS') ? null : 'Fichier Photoshop invalide.';
        case 'eps':
            return (str_starts_with($head, '%!PS-Adobe') && str_contains($head, 'EPSF')) || str_starts_with($head, "\xC5\xD0\xD3\xC6")
                ? null
                : 'Fichier EPS invalide.';
        case 'svg':
            return pc_svg_is_safe((string) file_get_contents($path)) ? null : 'Ce SVG contient des éléments non autorisés (script, lien externe…). Exportez-le en PDF ou en PNG.';
    }
    return 'Format non accepté.';
}

/**
 * SVG : refusé (et non « nettoyé ») s'il contient du code actif, une entité XML ou une ressource
 * externe. Approche par liste de refus volontairement stricte : un logo exporté proprement passe.
 */
function pc_svg_is_safe(string $svg): bool
{
    if (!preg_match('/<svg[\s>]/i', $svg) || !mb_check_encoding($svg, 'UTF-8')) {
        return false;
    }
    $forbidden = [
        '/<!DOCTYPE/i', '/<!ENTITY/i', '/<\?xml-stylesheet/i',
        // Références de caractères refusées : elles permettraient de masquer « javascript: » ou un nom d'élément.
        '/&#/', '/&(?!(amp|lt|gt|quot|apos);)[a-z0-9]+;/i',
        // Éléments actifs, y compris préfixés (svg:script) et animations (animate, set) capables de modifier un lien.
        '/<\s*([\w.-]+:)?(script|foreignObject|iframe|embed|object|audio|video|handler|listener|animate\w*|set|discard)\b/i',
        '/\son[a-z]+\s*=/i',
        '/(java|vb)script\s*:/i', '/data\s*:\s*(?!image\/(png|jpe?g|webp|gif);base64,)/i',
        '/(xlink:)?href\s*=\s*["\']\s*(?!#|data:image\/(png|jpe?g|webp|gif);base64,)/i',
        '/@import/i', '/url\(\s*["\']?\s*(?!#)/i',
    ];
    foreach ($forbidden as $pattern) {
        if (preg_match($pattern, $svg)) {
            return false;
        }
    }
    return true;
}

/** Libellés des formats acceptés (« PNG, JPG, JPEG, WEBP, PDF »). */
function pc_accepted_labels(): string
{
    return implode(', ', array_map(fn ($t) => $t['label'], pc_allowed_types()));
}

/**
 * Déplace les fichiers validés dans le dossier privé de la demande.
 * Nom enregistré : « 01-<16 hexadécimaux aléatoires>.<extension contrôlée> ».
 */
function pc_store_uploads(array $valid, string $requestDir): array
{
    $stored = [];
    foreach (array_values($valid) as $i => $f) {
        $storedName = sprintf('%02d-%s.%s', $i + 1, bin2hex(random_bytes(8)), $f['ext']);
        $target = $requestDir . '/files/' . $storedName;
        if (!move_uploaded_file($f['tmp'], $target)) {
            throw new RuntimeException('Enregistrement du fichier impossible.');
        }
        @chmod($target, 0640);
        $stored[] = [
            'stored' => $storedName,
            'name' => $f['name'],
            'ext' => $f['ext'],
            'mime' => $f['mime'],
            'size' => $f['size'],
            'sha256' => $f['sha256'],
            'width' => $f['width'] ?? null,
            'height' => $f['height'] ?? null,
        ];
    }
    return $stored;
}

/* -------------------------------------------------- Téléchargement */

const PC_STORED_PATTERN = '/^\d{2}-[a-f0-9]{16}\.[a-z0-9]{2,4}$/';
const PC_INLINE_MIMES = ['image/png', 'image/jpeg', 'image/webp'];

/** Jeton d'un lien de téléchargement signé (HMAC-SHA256, expiration incluse). */
function pc_file_signature(string $id, string $stored, int $expires): string
{
    return hash_hmac('sha256', 'file|' . $id . '|' . $stored . '|' . $expires, pc_secret());
}

/** Lien signé absolu, ou null si l'adresse publique du site n'est pas configurée. */
function pc_signed_file_url(string $id, string $stored, ?int $expires = null): ?string
{
    $base = pc_site_url();
    if ($base === null) {
        return null;
    }
    $expires ??= time() + (int) pc_config()['signed_link_ttl'];
    return $base . '/api/fichier.php?' . http_build_query([
        'd' => $id,
        'f' => $stored,
        'e' => $expires,
        's' => pc_file_signature($id, $stored, $expires),
    ]);
}

/**
 * Envoie une pièce jointe d'une demande. Seuls les PNG, JPEG et WEBP peuvent être affichés
 * dans le navigateur ($inline) ; tout le reste est téléchargé, sous CSP « sandbox ».
 */
function pc_send_file(string $id, string $stored, bool $inline = false): never
{
    $request = preg_match(PC_STORED_PATTERN, $stored) ? pc_request_load($id) : null;
    $entry = null;
    foreach ($request['files'] ?? [] as $f) {
        if (($f['stored'] ?? '') === $stored) {
            $entry = $f;
            break;
        }
    }
    $dir = $entry === null ? null : pc_request_dir($id);
    $path = $dir === null ? false : realpath($dir . '/files/' . $stored);
    if ($entry === null || $path === false || !str_starts_with($path, (string) realpath($dir . '/files') . '/') || !is_file($path)) {
        http_response_code(404);
        pc_security_headers();
        header('Content-Type: text/plain; charset=utf-8');
        exit('Fichier introuvable ou lien expiré.');
    }

    $mime = (string) $entry['mime'];
    $inline = $inline && in_array($mime, PC_INLINE_MIMES, true);
    $name = (string) $entry['name'];
    $translit = function_exists('iconv') ? @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) : false;
    $ascii = trim((string) preg_replace('/[^A-Za-z0-9._-]+/', '_', $translit ?: $name), '_') ?: 'fichier';

    http_response_code(200);
    pc_security_headers("default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
    header('Cache-Control: private, no-store, max-age=0');
    header('Content-Type: ' . ($inline ? $mime : 'application/octet-stream'));
    header(sprintf("Content-Disposition: %s; filename=\"%s\"; filename*=UTF-8''%s", $inline ? 'inline' : 'attachment', $ascii, rawurlencode($name)));
    header('Content-Length: ' . filesize($path));
    header('Cross-Origin-Resource-Policy: same-origin');
    readfile($path);
    exit;
}
