# PAPER CUP — Thème HTML v0

Refonte complète, en HTML, CSS et JavaScript natif, du site de **PAPER CUP**, fabricant tunisien de gobelets en carton standard et personnalisés (Gabès, depuis 2008).

- **Statique et léger** : aucune dépendance à l'exécution, polices et images auto-hébergées.
- **Mobile first** : pensé d'abord pour le téléphone.
- **Orienté devis** : le parcours mène à une demande de devis B2B.
- **Formulaires avec pièces jointes** : une petite API PHP sans dépendance (`api/`) reçoit les demandes « Demande de devis » et « Essayez votre marque », avec logo ou maquette en option, et les présente dans un espace d'administration protégé (`admin/`). Sans PHP, les formulaires gardent leur mode « préparation » (récapitulatif à envoyer par e-mail).

| Document | Contenu |
|---|---|
| [`ANALYSIS.md`](ANALYSIS.md) | Analyse du site source, informations vérifiées, inventaire, limites |
| [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) | Direction artistique, tokens, typographie, composants, mouvement, accessibilité |
| `README.md` | Utilisation, structure, build, formulaires et pièces jointes, déploiement, QA |

---

## 1. Visualiser le thème

Les pages générées sont commitées : **aucune étape de build n'est nécessaire** pour les consulter. Utilisez un petit serveur local plutôt que `file://`, car certains navigateurs bloquent alors polices, presse-papiers ou icônes.

```bash
cd docs/themes/v0
python3 -m http.server 8080        # ou : npx serve .
# → http://localhost:8080/index.html
```

## 2. Pages

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil : hero photo, références clients, gammes et secteurs, formats (photo et vue technique), formulaire « Essayez votre marque » (aperçu + logo + envoi), réalisations, « Pourquoi PAPER CUP », commande et estimateur, FAQ, CTA |
| `produits.html` | Gamme : frise des 4 formats à l'échelle, fiches photo, accessoires (`#accessoires`), autres emballages présentés sur Facebook (`#autres-emballages`), comparatif (`#comparatif`) |
| `produits/gobelet-carton-{4,6-5,9,12}-oz.html` | Fiches produit : galerie Photo / Plan coté / Carton, caractéristiques, conditionnement et estimateur |
| `personnalisation.html` | Gobelets personnalisés : formulaire « Essayez votre marque », essentiel, visibilité, réalisations, préparation du projet, FAQ |
| `entreprise.html` | L'entreprise : fiche, mission, repères et salons (`#salons`), références, adresse |
| `faq.html` | Questions fréquentes, en 3 groupes (`FAQPage` en JSON-LD) |
| `contact.html` | Coordonnées complètes (dont WhatsApp) et formulaire « Demande de devis » avec pièces jointes (`#devis`) |
| `404.html` | Page d'erreur (`noindex`, liens absolus depuis la racine) |
| `api/demande.php` · `api/fichier.php` | API des demandes et téléchargement par lien signé (PHP, voir § 6) |
| `admin/` | Espace d'administration des demandes (PHP, accès protégé) |

## 3. Structure

```text
docs/themes/v0/
├── *.html, produits/*.html       pages générées (ne pas éditer à la main : voir § 4)
├── robots.txt · sitemap.xml · site.webmanifest
├── assets/
│   ├── css/  style.css (tokens, base) · components.css · utilities.css · responsive.css
│   │         theme.bundle.css        ← généré (concaténé et minifié)
│   ├── js/   main.js (noyau) · navigation.js · animations.js · attachments.js · components.js · forms.js
│   │         theme.bundle.js         ← généré
│   ├── fonts/  Sora + DM Sans (woff2 variables, sous-ensemble latin, OFL)
│   └── images/ brand/ (logo SVG vectorisé, originaux PNG) · hero/ · products/ · realisations/
│               clients/ · salons/ · editorial/ · og-image.jpg · favicons
├── src/
│   ├── data/      site.mjs · products.mjs · faq.mjs · references.mjs · facebook.mjs · media.json (généré)
│   ├── lib/       svg.mjs (gobelets, cartons, icônes) · media.mjs (<picture> AVIF/WebP)
│   ├── partials/  layout.mjs (head SEO, en-tête, pied de page) · components.mjs
│   └── pages/     home.mjs · products.mjs · pages.mjs
├── api/
│   ├── demande.php · fichier.php      points d'entrée HTTP
│   ├── lib/   bootstrap · storage · uploads · requests · mailer (.php)   ← jamais servis (.htaccess)
│   ├── tools/hash-password.php        empreinte du mot de passe d'administration (CLI)
│   ├── config.sample.php              modèle de configuration (copier en config.local.php, ignoré par Git)
│   └── .htaccess · .user.ini
├── admin/  index.php · admin.css · .htaccess
├── tests/  api.test.mjs (node --test) · e2e.mjs (Playwright) · router.php (php -S)   ← à ne pas déployer
├── tools/  optimize-images.py · media-manifest.json
├── build.mjs
└── ANALYSIS.md · DESIGN-SYSTEM.md · README.md
```

## 4. Modifier le contenu et reconstruire

Prérequis : **Node.js 18 ou plus**, sans aucune dépendance npm. Prettier est utilisé s'il est installé, pour formater le HTML.

```bash
cd docs/themes/v0
node build.mjs              # pages + bundles CSS/JS + sitemap/robots/manifest
node build.mjs --no-format  # sans Prettier
```

| Je veux modifier… | Fichier |
|---|---|
| Téléphone, e-mail, adresse, salons | `src/data/site.mjs` (source unique de vérité) |
| Formats, cotes, contenances, photos produit, accessoires | `src/data/products.mjs` |
| Questions et réponses de la FAQ | `src/data/faq.mjs` |
| Informations issues de la page Facebook (WhatsApp, secteurs, autres emballages) | `src/data/facebook.mjs` (faits vérifiés uniquement) |
| Logos clients, réalisations | `src/data/references.mjs` |
| Textes d'une page | `src/pages/*.mjs` |
| En-tête, pied de page, balises SEO | `src/partials/layout.mjs` |
| Styles | `assets/css/*.css` (puis rebuild) |
| Scripts | `assets/js/*.js` (puis rebuild) |

**Images.** Déposer les originaux dans un dossier qui reprend l'arborescence `solixy-cms-assets/` du site, compléter `tools/media-manifest.json`, puis lancer :

```bash
python3 tools/optimize-images.py /chemin/vers/originaux   # Pillow ≥ 11 avec AVIF + WebP
```

Le script écrit des variantes AVIF et WebP aux largeurs demandées, ainsi que `src/data/media.json`, lu par le build.

## 5. JavaScript (≈ 66 Ko non minifié, ≈ 17 Ko gzip)

Modules enregistrés dans `window.PC`. Chacun est isolé : une erreur dans l'un ne bloque pas les autres.

| Module | Fonction |
|---|---|
| `header`, `mega-menu`, `mobile-menu`, `mobile-bar` | En-tête au scroll, méga-menu, menu mobile accessible, barre d'appel |
| `reveal` | Apparitions au scroll, frise des étapes |
| `attachments` | Pièces jointes : glisser-déposer, sélection, liste, retrait, limites du serveur, progression (`PC.attachFor`, `PC.api`) |
| `dims-toggle`, `studio`, `marquee`, `lightbox`, `tabs`, `accordion` | Vue technique, atelier (aperçu du nom, de la teinte, du format et du logo), pause des références, visionneuse, onglets, FAQ animée |
| `estimator`, `quote-form`, `brand-form` | Estimateur de cartons, formulaire « Demande de devis », formulaire « Essayez votre marque » |

Sans JavaScript, tout le contenu reste visible : la FAQ fonctionne (`<details>`), les liens `tel:` et `mailto:` restent utilisables et, sur un hébergement PHP, les deux formulaires s'envoient de façon classique (champ fichier natif, page de confirmation).

### Formulaires : deux modes, choisis automatiquement

Au chargement, chaque formulaire interroge `GET api/demande.php` (chemin défini dans `src/data/site.mjs › api`).

1. **Mode connecté** (l'API PHP répond).
   - La demande et ses fichiers partent en `multipart/form-data`, avec une barre de progression par fichier.
   - Le nom et le téléphone deviennent requis ; l'e-mail reste facultatif.
   - Une clé d'idempotence est conservée entre les tentatives : un double clic, une coupure réseau ou un nouvel essai ne créent jamais de doublon.
   - En cas d'erreur (champ refusé, fichier refusé, réseau), la saisie et les fichiers restent dans le formulaire.
   - Le visiteur reçoit une référence (`PC-AAAAMMJJ-XXXXX`).
2. **Mode préparation** (aucune API : hébergement statique, `file://`). C'est le comportement d'origine, inchangé :
   - le formulaire valide les champs, puis génère un récapitulatif à envoyer par e-mail (`mailto:` pré-rempli), à dicter ou à copier ;
   - les fichiers choisis restent sur l'appareil du visiteur : le formulaire le lui indique, et le récapitulatif liste les fichiers à joindre à son e-mail ;
   - dans l'atelier, le logo s'affiche quand même sur l'aperçu, et le bouton « Préparer ma demande » mène au formulaire de devis pré-rempli.

## 6. Formulaires et pièces jointes (API PHP)

### Fonctionnement

| Étape | Détail |
|---|---|
| Interface | Champ facultatif « Vous avez déjà une idée du design ? » (atelier) et « Vous avez un logo ou un exemple à nous montrer ? » (devis) : glisser-déposer ou bouton, liste avec nom, taille, aperçu et retrait, erreurs explicites |
| Limites | Lues **sur le serveur au moment de la requête** : minimum entre la configuration de l'application et `upload_max_filesize`, `post_max_size` (moins 64 Ko de marge) et `max_file_uploads`. L'interface n'annonce jamais plus que ce que le serveur accepte |
| Formats | PNG, JPG, JPEG, WEBP, PDF. SVG, AI (compatible PDF), EPS et PSD sont **désactivés par défaut** (`allow_design_files`, voir Sécurité) |
| Contrôles serveur | Champs (mêmes règles que le navigateur), nombre, taille unitaire et totale, extension autorisée **et** type réel détecté (`finfo`), structure (image décodable et dimensions, en-tête et fin de PDF, signatures PSD/EPS, SVG sans script ni ressource externe), doublons, espace disque |
| Stockage | Dossier privé **hors de la racine web** : `requests/<référence>/request.json` et `files/01-<16 hexadécimaux>.<ext>`. Le nom d'origine n'est conservé que comme libellé ; empreinte SHA-256 enregistrée |
| Notification | E-mail texte à `notify_to` (par défaut `paper.cup@hotmail.fr`), via la fonction `mail()` du serveur comme l'ancien site. **Aucun fichier n'est joint** : l'e-mail liste les pièces jointes et donne un lien de téléchargement signé (HMAC-SHA256, valable 7 jours) pour chacune, plus un lien vers la fiche dans l'administration. `Reply-To` = e-mail du client s'il l'a indiqué |
| Consultation | `admin/` : connexion, liste filtrable par statut, fiche (champs, pièces jointes avec aperçu des images, téléchargement), changement de statut, suppression confirmée |

### Installation sur l'hébergement

Prérequis : PHP **8.1 ou plus** avec `fileinfo`, `mbstring` et `json` (présents par défaut sur les hébergements PHP courants) ; `intl` est utilisé s'il est présent.

1. Publier le contenu de `docs/themes/v0/` à la racine du site (sans `tests/`, `tools/`, `src/` ni les `.md`, inutiles en production).
2. Créer le dossier de stockage **hors de la racine web**, accessible en écriture par PHP. Par défaut, l'API utilise `../papercup-data` à côté du dossier du site.
3. Copier `api/config.sample.php` en `api/config.local.php` et renseigner au minimum `site_url` (`https://www.papercup.com.tn`). Toutes les options existent aussi en variables d'environnement `PC_*`, prioritaires.
4. Activer l'administration : `php api/tools/hash-password.php` (saisie masquée, 12 caractères minimum), puis copier l'empreinte dans `admin_password_hash`. Tant qu'elle est vide, `admin/` reste fermé.
5. Vérifier `https://www.papercup.com.tn/api/demande.php` : la réponse JSON indique les limites réellement appliquées.
6. Envoyer une demande de test avec un fichier, vérifier la réception de l'e-mail, puis la fiche dans `admin/`.

`api/.user.ini` demande 10 Mo par fichier et 30 Mo par envoi (pris en compte avec PHP-FPM ou CGI ; ignoré par `mod_php`). Si l'hébergeur impose d'autres valeurs, ce sont elles qui s'affichent dans les formulaires.

### Options (`api/config.local.php` ou variables d'environnement)

| Option | Défaut | Rôle |
|---|---|---|
| `storage_dir` (`PC_STORAGE_DIR`) | `../papercup-data` | Dossier privé des demandes |
| `max_files` · `max_file_bytes` · `max_total_bytes` | 5 · 10 Mo · 25 Mo | Limites applicatives (plafonnées par php.ini) |
| `min_free_bytes` | 200 Mo | Réserve d'espace disque : au-delà, les fichiers sont refusés (la demande sans fichier reste possible) |
| `allow_design_files` | `false` | Active SVG, AI, EPS et PSD |
| `notify_to` · `mail_from` · `mail_transport` | `paper.cup@hotmail.fr` · `no-reply@papercup.com.tn` · `mail` | Notification (`mail`, `file` pour les tests, `none`) |
| `site_url` · `signed_link_ttl` | déduit · 7 jours | Liens de la notification |
| `admin_user` · `admin_password_hash` · `admin_session_ttl` | `papercup` · vide · 30 min | Administration |
| `rate_limit_max` · `rate_limit_window` | 20 · 1 h | Demandes par connexion |
| `login_max_attempts` · `login_window` | 5 · 15 min | Tentatives de connexion |
| `allowed_origins` | aucune | Origines supplémentaires autorisées à envoyer le formulaire |
| `secret` (`PC_SECRET`) | généré | Secret HMAC ; créé automatiquement dans le stockage s'il est vide |
| `timezone` | `Africa/Tunis` | Dates des références et des notifications |

### Sécurité

- **Aucune exécution ni interprétation des fichiers** : jamais servis directement, ni convertis, ni redimensionnés par le serveur.
- **Téléchargement** : `Content-Disposition: attachment`, `application/octet-stream`, `X-Content-Type-Options: nosniff`, CSP `sandbox`. Seuls PNG, JPEG et WEBP sont affichés en aperçu, et uniquement dans l'administration.
- **Accès** : liens signés à durée limitée (sans signature valide : 403 ; expiré : 410) ou session d'administration (cookie `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS, régénéré à la connexion, expiration après 30 min d'inactivité, jeton CSRF sur chaque action, 5 tentatives par quart d'heure).
- **Envoi** : origine vérifiée (`Origin`), champ piège anti-robots, limitation par connexion (adresse IP hachée, jamais stockée en clair), idempotence avec verrou exclusif.
- **Défense en profondeur** : `.htaccess` « Require all denied » dans `api/lib`, `api/tools`, `tests` et chaque dossier du stockage ; l'administration signale un stockage placé par erreur sous la racine web.
- **Nginx** (n'utilise pas les `.htaccess`) : ajouter `location ~ ^/(api/(lib|tools)|tests|src|tools)/ { deny all; }` et `location ~ /\. { deny all; }`, et garder le stockage hors de la racine.
- **Fichiers de création** : un SVG peut contenir du script, un EPS est un programme PostScript, un PSD n'est pas lisible par le navigateur. Avec `allow_design_files`, ils sont acceptés après contrôle de signature (SVG refusé s'il contient script, entité XML, gestionnaire d'événement ou ressource externe), jamais prévisualisés, toujours téléchargés. À n'activer que si l'équipe ouvre ces fichiers avec ses logiciels habituels, sur des postes à jour.
- **HTTPS obligatoire** en production pour l'administration et les liens signés.
- **Conservation** : les demandes restent jusqu'à leur suppression dans l'administration. Une durée de conservation est à définir avec PAPER CUP.

### Tests

```bash
cd docs/themes/v0
node --test tests/api.test.mjs     # API et administration : PHP 8.1+ requis, aucune dépendance
node tests/e2e.mjs                 # parcours navigateur : Playwright requis (variable PLAYWRIGHT_MODULE si installé ailleurs)
```

Les tests démarrent leurs propres serveurs (`php -S` + `tests/router.php`) avec un stockage temporaire, puis le suppriment.

## 7. Déploiement

- **PHP.** Pour l'envoi des formulaires et des pièces jointes, suivre le § 6 (stockage hors racine, `config.local.php`, mot de passe d'administration, HTTPS). Sans PHP, le site fonctionne en mode préparation.
- **Racine du domaine.** Publier le contenu de `docs/themes/v0/` à la racine de `https://www.papercup.com.tn/`. Les canonicals, l'Open Graph et le sitemap utilisent cette base, définie dans `src/data/site.mjs › baseUrl`.
- **Page 404.** Configurer le serveur pour servir `404.html`.
- **En-têtes HTTP.** Activer la compression gzip ou brotli et un cache long sur `assets/`. Les bundles sont versionnés par `?v=`.
- **Redirections 301.** Rediriger les anciennes URL :

  | Ancienne URL | Nouvelle URL |
  |---|---|
  | `index?lang=fr` | `/` |
  | `apropos?lang=fr` | `/entreprise.html` |
  | `produits?lang=fr` | `/produits.html` |
  | `actualite?lang=fr` | `/entreprise.html#salons` |
  | `contact?lang=fr` | `/contact.html` |

  Les URL `?lang=en|ar` restent à prévoir lors de la production des traductions.
- **Recette.** Sur un environnement de recette, remplacer `robots.txt` par `Disallow: /` et ajouter `noindex`.
- **Mesure d'audience.** Remplacer l'ancien Google Analytics UA (obsolète) par la solution choisie par le client.

## 8. Langues

La v0 est en **français**, la langue principale du site source. Pour les versions anglaise et arabe :
- dupliquer `src/pages` dans `src/pages/en` et `src/pages/ar` ;
- placer les sorties dans `/en/` et `/ar/` ;
- ajouter `hreflang` (fr, en, ar, x-default) dans `layout.mjs` ;
- pour l'arabe, définir `lang="ar" dir="rtl"`. Le CSS utilise déjà en partie les propriétés logiques (`inset-inline`, `margin-inline-start`…) ; les positionnements `left`/`right` restants sont à basculer ;
- charger une police arabe (par exemple IBM Plex Sans Arabic).

## 9. SEO

- **Balises de page.** `title` et `meta description` uniques (≤ 160 caractères), un seul `h1`, canonical, `robots`, Open Graph et Twitter Card. L'image `og-image.jpg` (1200×630) utilise le logo officiel et une photo réelle.
- **JSON-LD** (valide) :
  - `Organization` : adresse, téléphone, fax, e-mail, logo, `sameAs` Facebook ;
  - `WebSite`, `WebPage`, `CollectionPage`, `AboutPage`, `ContactPage` ;
  - `BreadcrumbList`, `ItemList` (gamme), `FAQPage`.
- **`Product` volontairement absent.** Sans prix (`offers`), il serait invalide pour Google.
- **Fichiers.** `sitemap.xml` (10 URL) et `robots.txt`.
- **Pages et maillage.** URL lisibles en français, fil d'Ariane, liens internes entre gamme, fiches, personnalisation et devis.

## 10. Assurance qualité

### Formulaires et pièces jointes (20/10/2026)

PHP 8.3.6 (serveur intégré + `tests/router.php`), Chromium (Playwright 1.56), Node 22.

| Test | Résultat |
|---|---|
| `php -l` | 0 erreur sur les 11 fichiers PHP |
| `node --test tests/api.test.mjs` | **23/23** : limites effectives, demande sans fichier, fichiers rattachés et renommés, validation serveur, faux PNG / double extension / `.php` / SVG / exécutable / PDF tronqué refusés, nom malveillant neutralisé, nombre / taille / taille totale (413), idempotence (renvoi, envois simultanés, envoi sans JavaScript), origine étrangère, champ piège, réponse HTML sans JS, notification (pièces jointes signalées, aucun fichier joint, liens signés), liens falsifiés / expirés / d'une autre demande, accès direct interdit, administration (accès, cookie, CSRF, mots de passe, aperçu, statut, suppression, limitation des tentatives), limitation des demandes, administration fermée sans mot de passe |
| `node tests/e2e.mjs` | **46/46** : les deux formulaires avec et sans fichier, glisser-déposer, retrait et focus, refus navigateur (format, taille, doublon), refus serveur avec saisie conservée, coupure réseau puis nouvel essai sans doublon, double clic, logo sur l'aperçu, mode préparation sans API (récapitulatif, `mailto`, fichiers à joindre), envoi sans JavaScript. Aucune erreur JavaScript |
| Régression (54 tests fonctionnels du thème) | **54/54** en mode préparation |
| Lighthouse 12 mobile (gzip) | accueil 98 · contact 99 · personnalisation 99 · gamme 99 · FAQ 99 en performance ; **100** en accessibilité, bonnes pratiques et SEO ; CLS 0–0,008 |
| Lighthouse 12 desktop (gzip) | accueil et contact : **100 / 100 / 100 / 100** |
| Validation HTML | `html-validate` : 0 erreur sur les 11 pages, la page de confirmation sans JS et les 3 vues de l'administration |

### Thème (19/10/2026)

Tous les tests ont été réalisés dans Chromium (Playwright 1.56, headless), sur un serveur local avec compression gzip.

| Test | Résultat |
|---|---|
| **Lighthouse 12, mobile** (simulation 4G lente) | Performance **97–100** · Accessibilité **100** · Bonnes pratiques **100** · SEO **100** (accueil, gamme, fiche 9 oz, personnalisation, entreprise, FAQ, contact) |
| **Lighthouse 12, desktop** | **100 / 100 / 100 / 100** sur les mêmes pages |
| LCP / CLS / TBT mobile | LCP 1,7–2,2 s · CLS 0–0,008 · TBT 0–140 ms (accueil : 20 à 140 ms selon les passes) |
| `404.html` | Performance, Accessibilité et Bonnes pratiques 100 ; SEO 66 attendu (`noindex` volontaire) |
| Tests fonctionnels automatisés | **54/54** : hero et préchargement, logo, vue technique, pause des références, visionneuse (clavier et focus), atelier, estimateur, méga-menu, menu mobile (focus, `inert`, Échap), barre mobile, onglets, accordéons, formulaire (pré-remplissage, erreurs, `aria-invalid`, récapitulatif, `mailto`, copie), mouvement réduit, rendu sans JS. Aucune erreur console |
| Débordement horizontal | **0** sur 11 pages × 9 largeurs (320, 375, 390, 414, 480, 768, 1024, 1280, 1440 px) |
| Liens et ancres | 1 325 références, 68 ressources internes : tout répond en 200, ancres présentes, un `h1` par page, 11 blocs JSON-LD valides |
| Validation HTML | `html-validate` (recommandé) : **0 erreur** sur 11 pages. Seule la règle stylistique `doctype-style` est désactivée, car Prettier écrit `<!doctype html>` |

### Non testé ou à faire

- Appareils réels (iOS Safari, Android Chrome), Firefox et Safari desktop. Seul Chromium a été utilisé.
- Lecteurs d'écran en usage réel (NVDA, VoiceOver) : seuls les contrôles automatisés et les tests clavier ont été menés.
- Performance sur l'hébergement de production (CDN, TTFB réel).
- Envoi réel d'e-mails par `mail()` sur l'hébergement de production (les tests utilisent le transport `file`), et délivrabilité vers `paper.cup@hotmail.fr` (SPF/DKIM du domaine expéditeur).
- Comportement réel des `.htaccess` sous Apache et des limites PHP de l'hébergeur : les tests utilisent le serveur intégré de PHP et un routeur équivalent.
- Validation du contenu par PAPER CUP : voir `ANALYSIS.md` § 7, notamment les cotes, l'unité des cartons, le logo vectoriel et le minimum standard.

## 11. Crédits

- **Contenus, photos, logos clients et logo PAPER CUP** : site papercup.com.tn (propriété de PAPER CUP). Le logo a été vectorisé depuis les PNG publics.
- **Polices** : Sora et DM Sans, SIL Open Font License 1.1 (`assets/fonts/LICENSE-*.txt`).
- **Illustrations techniques et icônes** : générées pour ce thème (`src/lib/svg.mjs`).
