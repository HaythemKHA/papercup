<?php
/**
 * PAPER CUP — téléchargement d'une pièce jointe par lien signé.
 *
 *   GET api/fichier.php?d=<référence>&f=<fichier>&e=<expiration>&s=<signature>
 *
 * Les liens sont créés uniquement dans la notification interne (voir lib/mailer.php) :
 * signature HMAC-SHA256 avec le secret du serveur, durée de validité limitée (signed_link_ttl).
 * Le fichier est toujours téléchargé (jamais affiché), sous CSP « sandbox ».
 */

declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

$deny = function (int $status, string $message): never {
    http_response_code($status);
    pc_security_headers();
    header('Content-Type: text/plain; charset=utf-8');
    exit($message);
};

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    $deny(405, 'Méthode non autorisée.');
}

$id = (string) ($_GET['d'] ?? '');
$stored = (string) ($_GET['f'] ?? '');
$expires = (string) ($_GET['e'] ?? '');
$signature = (string) ($_GET['s'] ?? '');

if (!preg_match(PC_ID_PATTERN, $id) || !preg_match(PC_STORED_PATTERN, $stored) || !ctype_digit($expires) || !preg_match('/^[a-f0-9]{64}$/', $signature)) {
    $deny(400, 'Lien invalide.');
}
if (pc_storage_root() === null) {
    $deny(503, 'Service momentanément indisponible.');
}
// Limite les essais de signature depuis une même connexion.
if (pc_rate('file', 3600, true) > 300) {
    header('Retry-After: 3600');
    $deny(429, 'Trop de téléchargements. Réessayez plus tard.');
}
if (!hash_equals(pc_file_signature($id, $stored, (int) $expires), $signature)) {
    $deny(403, 'Lien invalide.');
}
if ((int) $expires < time()) {
    $deny(410, 'Ce lien a expiré. Retrouvez le fichier dans l’espace d’administration.');
}

pc_send_file($id, $stored, false);
