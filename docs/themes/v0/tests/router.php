<?php
/**
 * Routeur du serveur de développement PHP (php -S), qui ignore les fichiers .htaccess :
 * reproduit les interdictions d'accès de la production pour les tests.
 *
 *   php -S 127.0.0.1:8090 -t docs/themes/v0 docs/themes/v0/tests/router.php
 */

$path = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));
$denied = '#(^|/)\.|^/(api/(lib|tools)/|api/config[^/]*\.php$|tests/|src/|tools/|node_modules/)|\.(md|mjs)$#';
if (preg_match($denied, $path)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Accès interdit.';
    return true;
}
if (str_ends_with($path, '/') && is_file($_SERVER['DOCUMENT_ROOT'] . $path . 'index.php')) {
    $_SERVER['SCRIPT_NAME'] = $path . 'index.php';
    require $_SERVER['DOCUMENT_ROOT'] . $path . 'index.php';
    return true;
}
return false;
