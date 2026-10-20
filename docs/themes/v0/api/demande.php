<?php
/**
 * PAPER CUP — API des demandes (formulaires « Demande de devis » et « Essayez votre marque »).
 *
 *   GET  api/demande.php   état du service et limites EFFECTIVES d'envoi de fichiers (JSON)
 *   POST api/demande.php   création d'une demande (multipart/form-data, pièces jointes facultatives)
 *
 * Réponse JSON si la requête l'accepte (Accept: application/json, envoi par JavaScript),
 * sinon page HTML simple (envoi classique, navigateur sans JavaScript).
 */

declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$wantsJson = str_contains((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json');

/** Réponse JSON, ou page HTML pour un envoi sans JavaScript. */
function pc_respond(int $status, array $payload, bool $json): never
{
    if ($json) {
        pc_json($status, $payload);
    }
    http_response_code($status);
    pc_security_headers("default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    header('Content-Type: text/html; charset=utf-8');
    $ok = !empty($payload['ok']);
    $back = pc_request_origin_page();
    $back = $back !== '' ? $back : '../contact.html';
    // Retour au formulaire de devis (y compris quand PHP a vidé $_POST : envoi trop volumineux).
    if (!str_contains($back, '#') && (pc_param($_POST, 'formulaire') === 'devis' || str_ends_with($back, '/contact.html'))) {
        $back .= '#devis';
    }
    $details = [];
    foreach ($payload['fields'] ?? [] as $message) {
        $details[] = $message;
    }
    foreach ($payload['files'] ?? [] as $f) {
        if (isset($f['message'])) {
            $details[] = ($f['name'] !== '' ? $f['name'] . ' : ' : '') . $f['message'];
        }
    }
    $title = $ok ? 'Demande envoyée' : 'Votre demande n’a pas été envoyée';
    $backLabel = $ok ? 'Retour au site' : 'Recommencer la demande';
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
        '<meta name="robots" content="noindex"><title>', pc_h($title), ' | PAPER CUP</title>',
        '<link rel="stylesheet" href="../assets/css/theme.bundle.css"></head><body>',
        '<main class="section"><div class="container container--narrow"><div class="quote-result">',
        '<div class="quote-result__head"><h1>', pc_h($title), '</h1></div>',
        '<p>', pc_h((string) ($payload['message'] ?? '')), '</p>';
    if ($ok) {
        echo '<p><strong>Référence : ', pc_h((string) $payload['id']), '</strong></p>';
    }
    if ($details !== []) {
        echo '<ul>';
        foreach ($details as $d) {
            echo '<li>', pc_h($d), '</li>';
        }
        echo '</ul>';
    }
    if (!$ok) {
        echo '<p>Pour corriger votre demande sans la ressaisir, utilisez le bouton « Retour » de votre navigateur : vos informations y sont en général conservées, les fichiers devront être sélectionnés à nouveau.</p>';
    }
    echo '<div class="quote-result__actions"><a class="btn btn--accent" href="', pc_h($back), '">', pc_h($backLabel), '</a>',
        '<a class="btn btn--outline" href="tel:+21675290088">Appeler le 75 290 088</a></div>',
        '</div></div></main></body></html>';
    exit;
}

/* ---------------------------------------------------------------- GET */

if ($method === 'GET' || $method === 'HEAD') {
    $limits = pc_upload_limits();
    $types = pc_allowed_types();
    // mbstring est indispensable au nettoyage des saisies : sans elle, les formulaires restent en mode préparation.
    $available = pc_storage_root() !== null && function_exists('mb_check_encoding');
    $mimes = [];
    foreach ($types as $t) {
        $mimes = array_merge($mimes, $t['mimes']);
    }
    pc_json($available ? 200 : 503, [
        'ok' => $available,
        'service' => 'papercup-demandes',
        'version' => 1,
        'uploads' => [
            'enabled' => $available && $limits['enabled'],
            'maxFiles' => $limits['maxFiles'],
            'maxFileBytes' => $limits['maxFileBytes'],
            'maxTotalBytes' => $limits['maxTotalBytes'],
            'extensions' => array_keys($types),
            'mimes' => array_values(array_unique(array_filter($mimes, fn ($m) => !in_array($m, ['text/plain', 'application/octet-stream', 'text/xml', 'application/xml'], true)))),
            'labels' => pc_accepted_labels(),
        ],
    ]);
}

if ($method !== 'POST') {
    header('Allow: GET, HEAD, POST');
    pc_respond(405, ['ok' => false, 'error' => 'method', 'message' => 'Méthode non autorisée.'], $wantsJson);
}

/* --------------------------------------------------------------- POST */

// Envoi depuis une autre origine refusé (les navigateurs envoient toujours Origin en POST).
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '') {
    $o = parse_url($origin);
    $originHost = is_array($o) && isset($o['host']) ? $o['host'] . (isset($o['port']) ? ':' . $o['port'] : '') : '';
    $allowed = array_map('strtolower', (array) pc_config()['allowed_origins']);
    if (strcasecmp($originHost, (string) ($_SERVER['HTTP_HOST'] ?? '')) !== 0 && !in_array(strtolower(rtrim($origin, '/')), $allowed, true)) {
        pc_respond(403, ['ok' => false, 'error' => 'origin', 'message' => 'Envoi refusé : origine non autorisée.'], $wantsJson);
    }
}

$limits = pc_upload_limits();
$phone = '(+216) 75 290 088';

// Corps plus gros que post_max_size : PHP a ignoré tous les champs et fichiers.
$length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($_POST === [] && $_FILES === [] && $length > 0) {
    pc_respond(413, [
        'ok' => false,
        'error' => 'too_large',
        'message' => sprintf('L’envoi dépasse la taille acceptée par le serveur (%s au total). Retirez un ou plusieurs fichiers, puis renvoyez votre demande.', pc_format_bytes($limits['maxTotalBytes'])),
    ], $wantsJson);
}

if (pc_storage_root() === null || !function_exists('mb_check_encoding')) {
    pc_log('storage unavailable or mbstring missing');
    pc_respond(503, ['ok' => false, 'error' => 'unavailable', 'message' => 'Le service d’envoi est momentanément indisponible. Appelez PAPER CUP au ' . $phone . '.'], $wantsJson);
}

try {
    // Champ piège invisible : rempli uniquement par les robots.
    if (trim(pc_param($_POST, 'site_web')) !== '' || is_array($_POST['site_web'] ?? null)) {
        pc_respond(422, ['ok' => false, 'error' => 'rejected', 'message' => 'Envoi refusé.'], $wantsJson);
    }

    $window = (int) pc_config()['rate_limit_window'];
    $maxCreate = max(1, (int) pc_config()['rate_limit_max']);
    $rateLimited = function () use ($window, $phone, $wantsJson): never {
        header('Retry-After: ' . $window);
        pc_respond(429, ['ok' => false, 'error' => 'rate_limited', 'message' => 'Trop de demandes envoyées depuis votre connexion. Réessayez plus tard ou appelez le ' . $phone . '.'], $wantsJson);
    };
    // Tentatives (y compris refusées) plafonnées sans croissance des compteurs ; créations vérifiées plus bas.
    if (!pc_rate_take('post', $window, $maxCreate * 5) || pc_rate('create', $window, false) >= $maxCreate) {
        $rateLimited();
    }

    [$fields, $fieldErrors] = pc_validate_fields($_POST);
    [$validFiles, $fileErrors] = pc_validate_uploads(pc_uploaded_files());

    if ($fieldErrors !== [] || $fileErrors !== []) {
        pc_respond(422, [
            'ok' => false,
            'error' => $fieldErrors !== [] ? 'validation' : 'files',
            'message' => $fieldErrors !== []
                ? 'Merci de corriger les points signalés.'
                : 'Un ou plusieurs fichiers ne peuvent pas être acceptés. Retirez-les ou remplacez-les, puis renvoyez votre demande : vos informations sont conservées.',
            'fields' => (object) $fieldErrors,
            'files' => $fileErrors,
        ], $wantsJson);
    }

    $incoming = array_sum(array_map(fn ($f) => $f['size'], $validFiles));
    if ($incoming > 0 && !pc_disk_ok($incoming)) {
        pc_log('attachment storage full (quota or disk reserve)');
        pc_respond(507, [
            'ok' => false,
            'error' => 'storage_full',
            'message' => 'Le serveur ne peut pas enregistrer de fichiers pour le moment. Envoyez votre demande sans pièce jointe ou appelez le ' . $phone . '.',
        ], $wantsJson);
    }

    // Idempotence : clé générée par le navigateur et conservée entre les tentatives, LIÉE AU CONTENU
    // (un renvoi identique retrouve la demande déjà créée ; un contenu modifié crée une nouvelle demande),
    // sinon empreinte du contenu et du client (double envoi sans JavaScript).
    $key = pc_param($_POST, 'idempotence');
    [$idemKey, $ttl] = preg_match('/^[A-Za-z0-9-]{16,64}$/', $key)
        ? ['key:' . $key . '|' . pc_content_fingerprint($fields, $validFiles), 86400]
        : [pc_request_fingerprint($fields, $validFiles), 600];

    $baseKey = preg_match('/^[A-Za-z0-9-]{16,64}$/', $key) ? 'base:' . $key : null;
    $result = pc_idempotent($idemKey, $ttl, function () use ($fields, $validFiles, $window, $maxCreate, $baseKey): array {
        // Plafond global (ensemble du site) : uniquement pour les envois AVEC fichiers (risque de saturation du
        // stockage). Une demande sans fichier n'est jamais bloquée par l'activité des autres visiteurs.
        if ($validFiles !== [] && !pc_rate_take('create-files-all', 3600, max(1, (int) pc_config()['global_rate_max']), true)) {
            pc_log('global attachment ceiling reached');
            return ['ok' => false, 'error' => 'busy'];
        }
        // Plafond par client, vérifié et consommé atomiquement.
        if (!pc_rate_take('create', $window, $maxCreate)) {
            return ['ok' => false, 'error' => 'rate_limited'];
        }
        $replaces = $baseKey !== null ? pc_key_latest($baseKey) : null;
        $request = pc_request_create($fields, $validFiles, $replaces);
        if ($baseKey !== null) {
            pc_key_remember($baseKey, $request['id']);
        }
        return [
            'ok' => true,
            'id' => $request['id'],
            'notified' => in_array($request['notification']['status'], ['envoyee', 'fichier'], true),
            'replaces' => $replaces,
            'files' => array_map(fn ($f) => ['name' => $f['name'], 'size' => $f['size']], $request['files']),
            'message' => count($request['files']) > 0
                ? 'Votre demande et vos fichiers ont bien été transmis à PAPER CUP.'
                : 'Votre demande a bien été transmise à PAPER CUP.',
        ];
    });
    // Renvoi identique d'une version antérieure (le visiteur est revenu au contenu d'origine) : la demande
    // créée entre-temps est signalée comme remplacée, et la clé pointe de nouveau sur la version confirmée.
    if (!empty($result['duplicate']) && $baseKey !== null) {
        $latest = pc_key_latest($baseKey);
        if ($latest !== null && $latest !== $result['id']) {
            $other = pc_request_load($latest);
            if ($other !== null) {
                $other['meta']['superseded_by'] = $result['id'];
                $other['history'][] = ['at' => date('c'), 'event' => 'remplacee:' . $result['id']];
                pc_request_save($other);
            }
            pc_key_remember($baseKey, (string) $result['id']);
        }
    }
    if (($result['error'] ?? '') === 'busy') {
        header('Retry-After: 900');
        pc_respond(503, [
            'ok' => false,
            'error' => 'busy',
            'message' => 'Le service reçoit beaucoup de fichiers en ce moment. Envoyez votre demande sans pièce jointe (vos informations sont conservées), ou réessayez dans quelques minutes.',
        ], $wantsJson);
    }
    if (empty($result['ok'])) {
        $rateLimited();
    }
    pc_respond(empty($result['duplicate']) ? 201 : 200, $result + ['duplicate' => false], $wantsJson);
} catch (Throwable $e) {
    pc_log('error: ' . $e->getMessage() . ' @' . basename($e->getFile()) . ':' . $e->getLine());
    pc_respond(500, [
        'ok' => false,
        'error' => 'server',
        'message' => 'Une erreur technique a empêché l’envoi. Vos informations sont conservées : réessayez dans un instant ou appelez le ' . $phone . '.',
    ], $wantsJson);
}
