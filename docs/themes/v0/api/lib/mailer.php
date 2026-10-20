<?php
/**
 * PAPER CUP — API des demandes · notification interne.
 *
 * Un e-mail texte est envoyé à l'adresse configurée (notify_to) pour chaque demande.
 * Les pièces jointes n'y sont JAMAIS incluses : l'e-mail liste les fichiers et donne, pour chacun,
 * un lien de téléchargement signé (HMAC) et limité dans le temps, ainsi qu'un lien vers la fiche
 * de la demande dans l'espace d'administration (connexion requise).
 *
 * Transports : « mail » (fonction mail() / sendmail du serveur, comme l'ancien site),
 * « file » (fichiers .eml dans le stockage privé, pour les tests), « none » (désactivé).
 */

declare(strict_types=1);

/** Adresse sans retour à la ligne (protection contre l'injection d'en-têtes). */
function pc_header_safe(string $value): string
{
    return trim(str_replace(["\r", "\n", "\0"], '', $value));
}

function pc_admin_enabled(): bool
{
    return (string) pc_config()['admin_password_hash'] !== '';
}

/** Contenu de la notification : [sujet, corps texte]. */
function pc_notification_content(array $r): array
{
    $files = $r['files'] ?? [];
    $count = count($files);
    $form = PC_FORM_LABELS[$r['fields']['formulaire'] ?? ''] ?? 'Demande';
    $who = trim(($r['fields']['societe'] ?? '') !== '' ? $r['fields']['societe'] : ($r['fields']['nom'] ?? ''));
    $subject = sprintf(
        '[PAPER CUP] %s %s%s%s',
        $form,
        $r['id'],
        $who !== '' ? ' — ' . mb_substr($who, 0, 60) : '',
        $count > 0 ? sprintf(' (%d pièce%s jointe%s)', $count, $count > 1 ? 's' : '', $count > 1 ? 's' : '') : '',
    );

    $created = strtotime((string) $r['created_at']) ?: time();
    $lines = [
        'Nouvelle demande reçue sur le site PAPER CUP.',
        '',
        'Référence  : ' . $r['id'],
        'Formulaire : ' . $form,
        'Reçue le   : ' . date('d/m/Y à H:i', $created),
    ];
    if (($r['meta']['page'] ?? '') !== '') {
        $lines[] = 'Page       : ' . $r['meta']['page'];
    }
    $lines[] = '';
    foreach (pc_request_rows($r) as $label => $value) {
        if ($label === 'Projet') {
            continue;
        }
        $lines[] = $label . str_repeat(' ', max(1, 11 - mb_strlen($label))) . ': ' . $value;
    }
    if (($r['fields']['message'] ?? '') !== '') {
        array_push($lines, '', 'Projet :', $r['fields']['message']);
    }

    $lines[] = '';
    $base = pc_site_url();
    if ($count === 0) {
        $lines[] = 'Pièces jointes : aucune.';
    } else {
        $expires = time() + (int) pc_config()['signed_link_ttl'];
        $lines[] = sprintf('PIÈCES JOINTES (%d)', $count);
        $lines[] = 'Les fichiers ne sont pas joints à cet e-mail : ils sont conservés dans l’espace privé du site.';
        if ($base !== null) {
            $lines[] = 'Liens personnels valables jusqu’au ' . date('d/m/Y à H:i', $expires) . ' — ne pas transférer cet e-mail.';
        } else {
            // Sans adresse configurée, aucun lien n'est construit (l'en-tête Host de la requête n'est pas fiable).
            $lines[] = 'Consultez-les dans l’espace d’administration du site (option site_url non configurée : aucun lien direct).';
        }
        foreach (array_values($files) as $i => $f) {
            $lines[] = '';
            $lines[] = sprintf('%d. %s — %s, %s', $i + 1, $f['name'], strtoupper($f['ext']), pc_format_bytes((int) $f['size']));
            if ($base !== null) {
                $lines[] = '   ' . pc_signed_file_url($r['id'], $f['stored'], $expires);
            }
        }
    }
    if (pc_admin_enabled() && $base !== null) {
        $lines[] = '';
        $lines[] = 'Fiche de la demande (connexion requise) :';
        $lines[] = $base . '/admin/?demande=' . rawurlencode($r['id']);
    }
    $lines[] = '';
    $lines[] = '—';
    $lines[] = 'Message automatique du formulaire du site. Répondre à cet e-mail écrit au client s’il a indiqué son adresse.';
    return [$subject, implode("\n", $lines)];
}

/** Envoie la notification ; renvoie l'état à enregistrer dans la demande. */
function pc_notify(array $r): array
{
    $c = pc_config();
    $transport = (string) $c['mail_transport'];
    $at = date('c');
    if ($transport === 'none') {
        return ['status' => 'desactivee', 'at' => $at];
    }
    $to = pc_header_safe((string) $c['notify_to']);
    if ($to === '') {
        return ['status' => 'desactivee', 'at' => $at];
    }
    [$subject, $body] = pc_notification_content($r);

    $headers = [
        'From: ' . pc_header_safe((string) $c['mail_from']),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        'X-Mailer: PAPER CUP formulaires',
        'Auto-Submitted: auto-generated',
    ];
    $client = (string) ($r['fields']['email'] ?? '');
    if ($client !== '' && filter_var($client, FILTER_VALIDATE_EMAIL)) {
        $headers[] = 'Reply-To: ' . pc_header_safe($client);
    }
    $encodedSubject = mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n");
    $encodedBody = chunk_split(base64_encode(str_replace("\n", "\r\n", $body)));

    if ($transport === 'file') {
        $dir = pc_storage_path('outbox');
        $ok = $dir !== null && @file_put_contents(
            $dir . '/' . $r['id'] . '-' . time() . '.eml',
            'To: ' . $to . "\r\nSubject: " . $encodedSubject . "\r\n" . implode("\r\n", $headers) . "\r\n\r\n" . $encodedBody,
        ) !== false;
        return ['status' => $ok ? 'fichier' : 'echec', 'at' => $at];
    }

    $ok = function_exists('mail') && @mail($to, $encodedSubject, $encodedBody, implode("\r\n", $headers));
    if (!$ok) {
        pc_log('notification failed for ' . $r['id']);
    }
    return ['status' => $ok ? 'envoyee' : 'echec', 'at' => $at];
}
