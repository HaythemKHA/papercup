<?php
/**
 * PAPER CUP — génère l'empreinte du mot de passe de l'espace d'administration.
 *
 *   php api/tools/hash-password.php
 *
 * Le mot de passe est saisi sans écho quand le terminal le permet ; seule l'empreinte (password_hash)
 * est affichée, à recopier dans api/config.local.php (admin_password_hash) ou PC_ADMIN_PASSWORD_HASH.
 * Sans accès en ligne de commande : php -r "echo password_hash('votre mot de passe', PASSWORD_DEFAULT);"
 * sur un poste de confiance (l'empreinte est la même quel que soit le poste).
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$read = function (string $prompt): string {
    fwrite(STDOUT, $prompt);
    // Saisie masquée si possible (stty) ; sinon saisie visible : shell_exec est souvent désactivé sur les hébergements.
    $tty = DIRECTORY_SEPARATOR === '/' && function_exists('posix_isatty') && posix_isatty(STDIN) && function_exists('shell_exec');
    if ($tty) {
        shell_exec('stty -echo');
    }
    $value = rtrim((string) fgets(STDIN), "\r\n");
    if ($tty) {
        shell_exec('stty echo');
        fwrite(STDOUT, "\n");
    }
    return $value;
};

$password = $read('Mot de passe (12 caractères minimum) : ');
if (mb_strlen($password) < 12) {
    fwrite(STDERR, "Mot de passe trop court.\n");
    exit(1);
}
if ($read('Confirmation : ') !== $password) {
    fwrite(STDERR, "Les deux saisies diffèrent.\n");
    exit(1);
}
fwrite(STDOUT, password_hash($password, PASSWORD_DEFAULT) . "\n");
