<?php
/**
 * PAPER CUP — configuration locale de l'API des demandes (exemple).
 *
 * Copier ce fichier en « config.local.php » (même dossier) sur le serveur, puis adapter.
 * config.local.php est ignoré par Git : il ne doit jamais être commité.
 * Chaque valeur peut aussi être fournie par une variable d'environnement (PC_STORAGE_DIR, PC_SECRET…),
 * prioritaire sur ce fichier. Voir README.md, § « Formulaires et pièces jointes ».
 */

return [
    // Dossier privé des demandes et fichiers : HORS de la racine web, accessible en écriture par PHP.
    // Par défaut : dossier « papercup-data » à côté du dossier du site.
    // 'storage_dir' => '/home/compte/papercup-data',

    // Limites applicatives. Les limites réellement appliquées sont le minimum entre ces valeurs
    // et celles de PHP (upload_max_filesize, post_max_size, max_file_uploads) : voir GET api/demande.php.
    // 'max_files' => 5,
    // 'max_file_bytes' => 10 * 1024 * 1024,
    // 'max_total_bytes' => 25 * 1024 * 1024,
    // Limite du serveur web si elle est inférieure à post_max_size (Nginx client_max_body_size, Apache LimitRequestBody).
    // 'max_request_bytes' => 0,
    // Volume total des pièces jointes conservées, réserve d'espace disque (les demandes sans fichier passent toujours).
    // 'storage_max_bytes' => 2 * 1024 * 1024 * 1024,
    // 'min_free_bytes' => 200 * 1024 * 1024,
    // Envois AVEC fichiers par heure pour l'ensemble du site (les demandes sans fichier n'y sont pas soumises).
    // 'global_rate_max' => 200,

    // SVG, AI, EPS et PSD : à n'activer qu'après lecture du § Sécurité du README.
    // 'allow_design_files' => false,

    // Notification interne (une adresse ; les fichiers ne sont jamais joints à l'e-mail).
    // 'notify_to' => 'paper.cup@hotmail.fr',
    // 'mail_from' => 'PAPER CUP <no-reply@papercup.com.tn>',
    // 'mail_transport' => 'mail', // mail | file | none
    // OBLIGATOIRE pour les liens des notifications (sinon aucun lien n'est envoyé) : https://domaine[:port][/chemin].
    // 'site_url' => 'https://www.papercup.com.tn',
    // 'signed_link_ttl' => 7 * 24 * 3600,

    // Espace d'administration : empreinte générée par « php api/tools/hash-password.php ».
    // 'admin_user' => 'papercup',
    // 'admin_password_hash' => '',
    // 'admin_session_ttl' => 30 * 60,
    // Impose HTTPS à l'administration. Ne pas activer derrière un proxy qui termine TLS sans transmettre HTTPS=on.
    // 'force_https' => false,

    // Secret HMAC des liens signés (64 caractères hexadécimaux) ; généré automatiquement dans le stockage si vide.
    // 'secret' => '',
];
