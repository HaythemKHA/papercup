<?php
/**
 * PAPER CUP — espace d'administration des demandes.
 *
 * Accès réservé : identifiant + mot de passe (hachage password_hash dans la configuration),
 * session à cookie HttpOnly / SameSite=Strict / Secure en HTTPS, jeton CSRF sur chaque action,
 * limitation des tentatives de connexion, expiration après inactivité.
 * Tant qu'aucun mot de passe n'est configuré, l'espace est fermé.
 */

declare(strict_types=1);

require dirname(__DIR__) . '/api/lib/bootstrap.php';

$config = pc_config();
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
$self = strtok((string) ($_SERVER['REQUEST_URI'] ?? '/admin/'), '?') ?: '/admin/';
$adminBase = rtrim(dirname($self . 'x'), '/') . '/';

pc_security_headers("default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
header('Content-Type: text/html; charset=utf-8');

/* ------------------------------------------------------------ Gabarit */

function admin_page(string $title, string $body, int $status = 200, bool $signedIn = false, string $csrf = ''): never
{
    http_response_code($status);
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
        '<meta name="robots" content="noindex, nofollow"><title>', pc_h($title), ' | Demandes PAPER CUP</title>',
        '<link rel="stylesheet" href="../assets/css/theme.bundle.css"><link rel="stylesheet" href="admin.css"></head><body class="admin">',
        '<header class="admin-bar"><div class="admin-bar__inner"><a class="admin-bar__brand" href="./"><img src="../assets/images/brand/logo-papercup.svg" alt="PAPER CUP" width="132" height="33"><span>Demandes</span></a>';
    if ($signedIn) {
        echo '<form method="post" action="./"><input type="hidden" name="csrf" value="', pc_h($csrf), '"><input type="hidden" name="action" value="logout">',
            '<button class="btn btn--sm btn--outline" type="submit">Se déconnecter</button></form>';
    }
    echo '</div></header><main class="admin-main" id="contenu">', $body, '</main></body></html>';
    exit;
}

function admin_redirect(string $to): never
{
    header('Location: ' . $to, true, 303);
    exit;
}

$statusLabel = fn (string $s) => PC_STATUSES[$s] ?? $s;
$notifLabels = ['envoyee' => 'E-mail envoyé', 'fichier' => 'E-mail (fichier de test)', 'echec' => 'Échec de l’e-mail', 'desactivee' => 'E-mail désactivé', 'en-attente' => 'En attente'];

/* ------------------------------------------------- Espace non configuré */

if (!pc_admin_enabled()) {
    admin_page('Espace fermé', '<section class="admin-card admin-card--narrow"><h1>Espace d’administration fermé</h1>'
        . '<p>Aucun mot de passe n’est configuré. Générez une empreinte avec <code>php api/tools/hash-password.php</code> sur le serveur, '
        . 'puis renseignez <code>admin_password_hash</code> dans <code>api/config.local.php</code> ou la variable d’environnement <code>PC_ADMIN_PASSWORD_HASH</code>.</p></section>', 503);
}
if (pc_storage_root() === null) {
    admin_page('Stockage indisponible', '<section class="admin-card admin-card--narrow"><h1>Stockage indisponible</h1><p>Le dossier de stockage privé n’existe pas ou n’est pas accessible en écriture. Vérifiez <code>storage_dir</code> dans la configuration.</p></section>', 503);
}

/* ------------------------------------------------------------ Session */

session_name('pc_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => $adminBase,
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Strict',
]);
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.use_trans_sid', '0');
session_start();

if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
$csrf = (string) $_SESSION['csrf'];
$now = time();
$signedIn = isset($_SESSION['auth']['user']) && ($now - (int) ($_SESSION['auth']['seen'] ?? 0)) <= (int) $config['admin_session_ttl'];
if (!$signedIn && isset($_SESSION['auth'])) {
    unset($_SESSION['auth']);
    $_SESSION['flash'] = 'Session expirée : reconnectez-vous.';
}
if ($signedIn) {
    $_SESSION['auth']['seen'] = $now;
}

$requested = (string) ($_GET['demande'] ?? '');
$requested = preg_match(PC_ID_PATTERN, $requested) ? $requested : '';

/* ---------------------------------------------------------- Actions POST */

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
        admin_page('Session expirée', '<section class="admin-card admin-card--narrow"><h1>Formulaire expiré</h1><p>Rechargez la page et recommencez.</p><p><a class="btn btn--accent" href="./">Retour</a></p></section>', 400);
    }
    $action = (string) ($_POST['action'] ?? '');

    if ($action === 'login') {
        $window = (int) $config['login_window'];
        if (pc_rate('login', $window, false) >= (int) $config['login_max_attempts']) {
            $_SESSION['flash'] = 'Trop de tentatives. Réessayez dans ' . (int) ceil($window / 60) . ' minutes.';
            admin_redirect($adminBase);
        }
        $user = (string) ($_POST['utilisateur'] ?? '');
        $password = (string) ($_POST['mot_de_passe'] ?? '');
        $userOk = hash_equals((string) $config['admin_user'], $user);
        $passOk = password_verify($password, (string) $config['admin_password_hash']); // toujours évalué : temps constant
        if ($userOk && $passOk) {
            pc_rate_reset('login');
            session_regenerate_id(true);
            $_SESSION['auth'] = ['user' => $user, 'at' => $now, 'seen' => $now];
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            pc_log('admin login ok');
            $next = (string) ($_POST['suite'] ?? '');
            admin_redirect($adminBase . (preg_match(PC_ID_PATTERN, $next) ? '?demande=' . rawurlencode($next) : ''));
        }
        pc_rate('login', $window, true);
        pc_log('admin login failed');
        $_SESSION['flash'] = 'Identifiant ou mot de passe incorrect.';
        admin_redirect($adminBase . ($requested !== '' ? '?demande=' . rawurlencode($requested) : ''));
    }

    if (!$signedIn) {
        admin_redirect($adminBase);
    }
    if ($action === 'logout') {
        $_SESSION = [];
        session_regenerate_id(true);
        session_destroy();
        admin_redirect($adminBase);
    }

    $id = (string) ($_POST['demande'] ?? '');
    $request = preg_match(PC_ID_PATTERN, $id) ? pc_request_load($id) : null;
    if ($request === null) {
        admin_redirect($adminBase);
    }
    if ($action === 'status' && isset(PC_STATUSES[(string) ($_POST['statut'] ?? '')])) {
        $request['status'] = (string) $_POST['statut'];
        $request['history'][] = ['at' => date('c'), 'event' => 'statut:' . $request['status']];
        pc_request_save($request);
        $_SESSION['flash'] = 'Statut mis à jour : ' . $statusLabel($request['status']) . '.';
        admin_redirect($adminBase . '?demande=' . rawurlencode($id));
    }
    if ($action === 'delete' && ($_POST['confirmer'] ?? '') === 'oui') {
        pc_request_delete($id);
        pc_log('request ' . $id . ' deleted by admin');
        $_SESSION['flash'] = 'Demande ' . $id . ' supprimée, avec ses fichiers.';
        admin_redirect($adminBase);
    }
    $_SESSION['flash'] = 'Action non effectuée.';
    admin_redirect($adminBase . '?demande=' . rawurlencode($id));
}

$flash = '';
if (!empty($_SESSION['flash'])) {
    $flash = '<p class="admin-flash" role="status">' . pc_h((string) $_SESSION['flash']) . '</p>';
    unset($_SESSION['flash']);
}

/* ------------------------------------------------------------ Connexion */

if (!$signedIn) {
    session_write_close();
    admin_page('Connexion', '<section class="admin-card admin-card--narrow"><h1>Connexion</h1>' . $flash
        . '<p>Espace réservé à l’équipe PAPER CUP : demandes reçues par le site et fichiers joints.</p>'
        . '<form class="admin-login" method="post" action="./' . ($requested !== '' ? '?demande=' . rawurlencode($requested) : '') . '">'
        . '<input type="hidden" name="csrf" value="' . pc_h($csrf) . '"><input type="hidden" name="action" value="login">'
        . '<input type="hidden" name="suite" value="' . pc_h($requested) . '">'
        . '<div class="field"><label class="field__label" for="a-user">Identifiant</label><input class="input" id="a-user" name="utilisateur" type="text" autocomplete="username" required></div>'
        . '<div class="field"><label class="field__label" for="a-pass">Mot de passe</label><input class="input" id="a-pass" name="mot_de_passe" type="password" autocomplete="current-password" required></div>'
        . '<button class="btn btn--accent" type="submit">Se connecter</button></form></section>', 200);
}

/* ------------------------------------------------ Fichier (aperçu / téléchargement) */

if (isset($_GET['fichier'])) {
    session_write_close();
    pc_send_file($requested, (string) $_GET['fichier'], ($_GET['apercu'] ?? '') === '1');
}

$warning = pc_storage_is_public()
    ? '<p class="admin-flash admin-flash--danger" role="alert">Attention : le dossier de stockage est situé sous la racine web. Déplacez-le hors de la racine (option <code>storage_dir</code>).</p>'
    : '';
if ((string) $config['site_url'] === '') {
    // Sans adresse configurée, les liens des notifications sont construits à partir de l'en-tête Host de la requête.
    $warning .= '<p class="admin-flash admin-flash--danger" role="alert">Configurez l’adresse publique du site (option <code>site_url</code>, ex. https://www.papercup.com.tn) : les liens des e-mails de notification en dépendent.</p>';
}

/* ------------------------------------------------------------- Détail */

if ($requested !== '') {
    $r = pc_request_load($requested);
    session_write_close();
    if ($r === null) {
        admin_page('Demande introuvable', '<section class="admin-card"><h1>Demande introuvable</h1><p><a href="./">Retour à la liste</a></p></section>', 404, true, $csrf);
    }
    $rows = '';
    foreach (pc_request_rows($r) as $label => $value) {
        $display = pc_h((string) $value);
        if ($label === 'Téléphone') {
            $display = '<a href="tel:' . pc_h(preg_replace('/[^+\d]/', '', (string) $value)) . '">' . $display . '</a>';
        } elseif ($label === 'E-mail') {
            $display = '<a href="mailto:' . pc_h((string) $value) . '?subject=' . rawurlencode('Votre demande ' . $r['id']) . '">' . $display . '</a>';
        }
        $rows .= '<div><dt>' . pc_h($label) . '</dt><dd>' . nl2br($display) . '</dd></div>';
    }
    $files = '';
    foreach ($r['files'] ?? [] as $f) {
        $base = './?demande=' . rawurlencode($r['id']) . '&fichier=' . rawurlencode($f['stored']);
        $isImage = in_array($f['mime'], PC_INLINE_MIMES, true);
        $files .= '<li class="admin-file">'
            . ($isImage
                ? '<a class="admin-file__thumb" href="' . pc_h($base . '&apercu=1') . '" target="_blank" rel="noopener"><img src="' . pc_h($base . '&apercu=1') . '" alt="Aperçu de ' . pc_h($f['name']) . '" loading="lazy"></a>'
                : '<span class="admin-file__thumb admin-file__thumb--doc" aria-hidden="true">' . pc_h(strtoupper($f['ext'])) . '</span>')
            . '<div class="admin-file__meta"><strong>' . pc_h($f['name']) . '</strong><span>' . pc_h(strtoupper($f['ext'])) . ' · ' . pc_h(pc_format_bytes((int) $f['size'])) . '</span>'
            . '<span class="admin-file__hash" title="Empreinte SHA-256">SHA-256 ' . pc_h(substr((string) $f['sha256'], 0, 16)) . '…</span></div>'
            . '<a class="btn btn--sm btn--primary" href="' . pc_h($base) . '">Télécharger<span class="visually-hidden"> ' . pc_h($f['name']) . '</span></a></li>';
    }
    $options = '';
    foreach (PC_STATUSES as $value => $label) {
        $options .= '<option value="' . $value . '"' . ($r['status'] === $value ? ' selected' : '') . '>' . $label . '</option>';
    }
    $history = '';
    foreach (array_reverse($r['history'] ?? []) as $h) {
        $event = (string) $h['event'];
        $history .= '<li><time datetime="' . pc_h($h['at']) . '">' . pc_h(date('d/m/Y H:i', strtotime($h['at']) ?: 0)) . '</time> '
            . pc_h($event === 'creation' ? 'Demande reçue' : (str_starts_with($event, 'statut:') ? 'Statut : ' . $statusLabel(substr($event, 7)) : $event)) . '</li>';
    }
    $body = '<p class="admin-back"><a href="./">← Toutes les demandes</a></p>' . $flash . $warning
        . '<section class="admin-card"><header class="admin-head"><div><p class="eyebrow">' . pc_h(PC_FORM_LABELS[$r['fields']['formulaire']] ?? '') . '</p>'
        . '<h1>' . pc_h($r['id']) . '</h1><p class="admin-muted">Reçue le ' . pc_h(date('d/m/Y à H:i', strtotime($r['created_at']) ?: 0))
        . (($r['meta']['page'] ?? '') !== '' ? ' depuis ' . pc_h($r['meta']['page']) : '') . ' · ' . pc_h($notifLabels[$r['notification']['status'] ?? ''] ?? '') . '</p></div>'
        . '<form class="admin-status" method="post" action="./"><input type="hidden" name="csrf" value="' . pc_h($csrf) . '"><input type="hidden" name="action" value="status">'
        . '<input type="hidden" name="demande" value="' . pc_h($r['id']) . '"><label class="field__label" for="a-status">Statut</label>'
        . '<select class="input" id="a-status" name="statut">' . $options . '</select><button class="btn btn--sm btn--accent" type="submit">Enregistrer</button></form></header>'
        . '<dl class="admin-fields">' . $rows . '</dl></section>'
        . '<section class="admin-card" aria-labelledby="pj"><h2 id="pj">Pièces jointes (' . count($r['files'] ?? []) . ')</h2>'
        . ($files !== '' ? '<ul class="admin-files" role="list">' . $files . '</ul><p class="admin-muted">Seuls les PNG, JPEG et WEBP sont prévisualisés. Les autres fichiers sont téléchargés sans être ouverts par le navigateur.</p>' : '<p class="admin-muted">Aucun fichier joint.</p>')
        . '</section>'
        . '<section class="admin-card"><h2>Historique</h2><ul class="admin-history" role="list">' . $history . '</ul></section>'
        . '<section class="admin-card admin-card--danger"><h2>Supprimer la demande</h2><form method="post" action="./" class="admin-delete">'
        . '<input type="hidden" name="csrf" value="' . pc_h($csrf) . '"><input type="hidden" name="action" value="delete"><input type="hidden" name="demande" value="' . pc_h($r['id']) . '">'
        . '<label class="admin-check"><input type="checkbox" name="confirmer" value="oui" required> Je confirme la suppression définitive de cette demande et de ses fichiers.</label>'
        . '<button class="btn btn--sm btn--outline" type="submit">Supprimer définitivement</button></form></section>';
    admin_page($r['id'], $body, 200, true, $csrf);
}

/* -------------------------------------------------------------- Liste */

session_write_close();
$filter = (string) ($_GET['statut'] ?? '');
$all = pc_request_list();
$counts = array_fill_keys(array_keys(PC_STATUSES), 0);
foreach ($all as $r) {
    $counts[$r['status']] = ($counts[$r['status']] ?? 0) + 1;
}
$list = isset(PC_STATUSES[$filter]) ? array_values(array_filter($all, fn ($r) => $r['status'] === $filter)) : $all;
$tabs = '<a href="./"' . (!isset(PC_STATUSES[$filter]) ? ' aria-current="page"' : '') . '>Toutes <span>' . count($all) . '</span></a>';
foreach (PC_STATUSES as $value => $label) {
    $tabs .= '<a href="./?statut=' . $value . '"' . ($filter === $value ? ' aria-current="page"' : '') . '>' . $label . ' <span>' . $counts[$value] . '</span></a>';
}
$tbody = '';
foreach (array_slice($list, 0, 200) as $r) {
    $f = $r['fields'];
    $who = trim(($f['societe'] ?? '') !== '' ? $f['societe'] . ' · ' . ($f['nom'] ?? '') : ($f['nom'] ?? ''));
    $n = count($r['files'] ?? []);
    $tbody .= '<tr><td><time datetime="' . pc_h($r['created_at']) . '">' . pc_h(date('d/m/Y H:i', strtotime($r['created_at']) ?: 0)) . '</time></td>'
        . '<th scope="row"><a href="./?demande=' . rawurlencode($r['id']) . '">' . pc_h($r['id']) . '</a></th>'
        . '<td>' . pc_h(PC_FORM_LABELS[$f['formulaire']] ?? '') . '</td>'
        . '<td>' . pc_h($who) . '<br><span class="admin-muted">' . pc_h($f['telephone'] ?? '') . '</span></td>'
        . '<td>' . ($n > 0 ? '<span class="admin-pill admin-pill--files">' . $n . ' fichier' . ($n > 1 ? 's' : '') . '</span>' : '<span class="admin-muted">—</span>') . '</td>'
        . '<td><span class="admin-pill admin-pill--' . pc_h($r['status']) . '">' . pc_h($statusLabel($r['status'])) . '</span>'
        . (($r['notification']['status'] ?? '') === 'echec' ? '<br><span class="admin-warn">E-mail non envoyé</span>' : '') . '</td></tr>';
}
$table = $tbody === ''
    ? '<p class="admin-muted">Aucune demande pour le moment.</p>'
    : '<div class="admin-table-wrap"><table class="admin-table"><caption class="visually-hidden">Demandes reçues</caption><thead><tr><th scope="col">Reçue le</th><th scope="col">Référence</th><th scope="col">Formulaire</th><th scope="col">Contact</th><th scope="col">Pièces jointes</th><th scope="col">Statut</th></tr></thead><tbody>' . $tbody . '</tbody></table></div>'
        . (count($list) > 200 ? '<p class="admin-muted">200 demandes les plus récentes affichées sur ' . count($list) . '.</p>' : '');

admin_page('Demandes', $flash . $warning . '<section class="admin-card"><header class="admin-head"><h1>Demandes reçues</h1></header><nav class="admin-tabs" aria-label="Filtrer par statut">' . $tabs . '</nav>' . $table . '</section>', 200, true, $csrf);
