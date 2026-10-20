<?php
/**
 * PAPER CUP — API des demandes · validation des champs et création des demandes.
 *
 * Deux formulaires :
 *   devis  « Demande de devis » (contact.html#devis)
 *   essai  « Essayez votre marque » (atelier d'aperçu, accueil et personnalisation.html)
 * Les règles reprennent celles du navigateur (assets/js/forms.js) et sont appliquées ici quoi qu'il arrive.
 */

declare(strict_types=1);

const PC_MIN_CUSTOM = 5000;
const PC_PHONE_PATTERN = '/^[+()\d\s.\-]{8,20}$/';
const PC_STATUSES = ['nouvelle' => 'Nouvelle', 'en-cours' => 'En cours', 'traitee' => 'Traitée'];
const PC_FORM_LABELS = ['devis' => 'Demande de devis', 'essai' => 'Essayez votre marque'];
const PC_QUOTE_TYPES = ['personnalise' => 'Gobelet personnalisé', 'standard' => 'Gobelet standard', 'autre' => 'Autre emballage'];

/**
 * Valide les champs texte d'une demande.
 * @return array{0: array, 1: array<string,string>} [données nettoyées, erreurs par champ]
 */
function pc_validate_fields(array $in): array
{
    $form = $in['formulaire'] ?? '';
    if (!is_string($form) || !isset(PC_FORM_LABELS[$form])) {
        return [[], ['formulaire' => 'Formulaire inconnu.']];
    }
    $errors = [];
    $d = [
        'nom' => pc_clean($in['nom'] ?? '', 80),
        'telephone' => pc_clean($in['telephone'] ?? '', 20),
        'email' => pc_clean($in['email'] ?? '', 120),
        'societe' => pc_clean($in['societe'] ?? '', 80),
        'ville' => pc_clean($in['ville'] ?? '', 60),
        'message' => pc_clean($in['message'] ?? '', 1500, true),
    ];

    if ($d['nom'] === '') {
        $errors['nom'] = 'Indiquez votre nom.';
    }
    if ($d['telephone'] === '') {
        $errors['telephone'] = 'Indiquez un numéro de téléphone pour être rappelé.';
    } elseif (!preg_match(PC_PHONE_PATTERN, $d['telephone']) || preg_match_all('/\d/', $d['telephone']) < 8) {
        $errors['telephone'] = 'Le numéro de téléphone semble incomplet.';
    }
    if ($d['email'] !== '' && (filter_var($d['email'], FILTER_VALIDATE_EMAIL) === false || preg_match('/[\r\n,;]/', $d['email']))) {
        $errors['email'] = 'L’adresse e-mail semble incorrecte.';
    }

    $format = $in['format'] ?? '';
    $d['format'] = is_string($format) && in_array($format, PC_FORMATS, true) ? $format : '';
    $rawQty = pc_clean($in['quantite'] ?? '', 12);
    $qty = preg_match('/^\d{1,8}$/', str_replace([' ', "\u{00A0}", "\u{202F}", '.'], '', $rawQty)) ? (int) str_replace([' ', "\u{00A0}", "\u{202F}", '.'], '', $rawQty) : 0;

    if ($form === 'devis') {
        $type = $in['type'] ?? '';
        $d['type'] = is_string($type) && isset(PC_QUOTE_TYPES[$type]) ? $type : '';
        if ($d['type'] === '') {
            $errors['type'] = 'Choisissez un type de produit.';
        }
        // « Autre emballage » (gobelets plastique, pots à glace, pochettes…) : le format de gobelet carton est facultatif.
        if ($d['format'] === '' && $d['type'] !== 'autre') {
            $errors['format'] = 'Choisissez un format de gobelet.';
        }
        if ($qty <= 0) {
            $errors['quantite'] = 'Indiquez une quantité de gobelets.';
        } elseif ($d['type'] === 'personnalise' && $qty < PC_MIN_CUSTOM) {
            $errors['quantite'] = 'Les commandes personnalisées démarrent à ' . number_format(PC_MIN_CUSTOM, 0, ',', "\u{00A0}") . ' gobelets.';
        }
        $d['quantite'] = $qty;
    } else {
        $d['marque'] = pc_clean($in['marque'] ?? '', 40);
        $ink = is_string($in['encre'] ?? null) ? strtoupper($in['encre']) : '';
        $d['encre'] = isset(PC_INKS[$ink]) ? $ink : '';
        if ($d['format'] === '') {
            $errors['format'] = 'Choisissez un format de gobelet.';
        }
        $d['quantite'] = $qty > 0 ? $qty : null;
    }
    return [['formulaire' => $form] + $d, $errors];
}

/** Lignes « libellé → valeur » d'une demande (notification et administration). */
function pc_request_rows(array $r): array
{
    $f = $r['fields'] ?? [];
    $fmt = fn ($n) => number_format((int) $n, 0, ',', ' ');
    $rows = [];
    if (($f['formulaire'] ?? '') === 'devis') {
        $rows['Type'] = PC_QUOTE_TYPES[$f['type'] ?? ''] ?? '—';
    } else {
        $rows['Nom sur le gobelet'] = ($f['marque'] ?? '') !== '' ? $f['marque'] : '—';
        if (($f['encre'] ?? '') !== '') {
            $rows['Teinte d’aperçu'] = PC_INKS[$f['encre']] . ' (' . $f['encre'] . ')';
        }
    }
    if (($f['format'] ?? '') !== '') {
        $rows['Format'] = PC_FORMAT_LABELS[$f['format']] ?? '—';
    }
    if (!empty($f['quantite'])) {
        $rows['Quantité'] = $fmt($f['quantite']) . (($f['type'] ?? '') === 'autre' ? ' pièces' : ' gobelets');
    }
    foreach (['societe' => 'Société', 'nom' => 'Contact', 'telephone' => 'Téléphone', 'email' => 'E-mail', 'ville' => 'Ville'] as $k => $label) {
        if (($f[$k] ?? '') !== '') {
            $rows[$label] = $f[$k];
        }
    }
    if (($f['message'] ?? '') !== '') {
        $rows['Projet'] = $f['message'];
    }
    return $rows;
}

/** Empreinte du contenu d'une demande : champs nettoyés + empreintes des fichiers. */
function pc_content_fingerprint(array $fields, array $files): string
{
    $parts = $fields;
    ksort($parts);
    $parts['__files'] = array_map(fn ($f) => $f['sha256'], $files);
    return hash('sha256', (string) json_encode($parts, JSON_UNESCAPED_UNICODE));
}

/** Empreinte de déduplication des renvois sans clé d'idempotence (ex. sans JavaScript) : contenu + client. */
function pc_request_fingerprint(array $fields, array $files): string
{
    return 'fp:' . hash('sha256', pc_content_fingerprint($fields, $files) . '|' . pc_client_ip());
}

/** Page d'origine (chemin seul, même site uniquement). */
function pc_request_origin_page(): string
{
    $ref = (string) ($_SERVER['HTTP_REFERER'] ?? '');
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    $parts = $ref === '' ? false : parse_url($ref);
    if (!is_array($parts) || ($parts['host'] ?? '') === '' || strcasecmp($parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : ''), $host) !== 0) {
        return '';
    }
    return pc_clean($parts['path'] ?? '', 200);
}

/**
 * Crée la demande : dossier, fichiers, données, puis notification interne.
 * La demande est enregistrée avant l'envoi de l'e-mail : un échec d'envoi ne perd rien.
 */
function pc_request_create(array $fields, array $validFiles, ?string $replaces = null): array
{
    [$id, $dir] = pc_new_request_dir();
    try {
        $files = pc_store_uploads($validFiles, $dir);
    } catch (Throwable $e) {
        pc_request_delete($id);
        throw $e;
    }
    $request = [
        'id' => $id,
        'version' => 1,
        'created_at' => date('c'),
        'status' => 'nouvelle',
        'fields' => $fields,
        'files' => $files,
        'meta' => [
            'page' => pc_request_origin_page(),
            'client' => substr(hash_hmac('sha256', pc_client_ip(), pc_secret()), 0, 16),
            'user_agent' => pc_clean($_SERVER['HTTP_USER_AGENT'] ?? '', 200),
            // Renvoi modifié par le client après une coupure : demande envoyée juste avant avec la même clé.
            'replaces' => $replaces,
        ],
        'notification' => ['status' => 'en-attente'],
        'history' => [['at' => date('c'), 'event' => 'creation']],
    ];
    if (!pc_request_save($request)) {
        pc_request_delete($id);
        throw new RuntimeException('Enregistrement de la demande impossible.');
    }
    pc_storage_used_add(array_sum(array_map(fn ($f) => (int) $f['size'], $files)));
    // La demande est déjà enregistrée : un échec de notification (mail() désactivé…) ne doit ni la perdre
    // ni provoquer une erreur qui pousserait le visiteur à la renvoyer.
    try {
        $request['notification'] = pc_notify($request);
    } catch (Throwable $e) {
        pc_log('notify error for ' . $id . ': ' . $e->getMessage());
        $request['notification'] = ['status' => 'echec', 'at' => date('c')];
    }
    pc_request_save($request);
    pc_log(sprintf('request %s created (%s, %d file(s), notification %s)', $id, $fields['formulaire'], count($files), $request['notification']['status']));
    return $request;
}
