# PAPER CUP — Thème HTML v0

Refonte complète, en HTML, CSS et JavaScript natif, du site de **PAPER CUP**, fabricant tunisien de gobelets en carton standard et personnalisés (Gabès, depuis 2008).

- **Statique et léger** : aucune dépendance à l'exécution, polices et images auto-hébergées.
- **Mobile first** : pensé d'abord pour le téléphone.
- **Orienté devis** : le parcours mène à une demande de devis B2B.

| Document | Contenu |
|---|---|
| [`ANALYSIS.md`](ANALYSIS.md) | Analyse du site source, informations vérifiées, inventaire, limites |
| [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) | Direction artistique, tokens, typographie, composants, mouvement, accessibilité |
| `README.md` | Utilisation, structure, build, déploiement, QA |

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
| `index.html` | Accueil : hero photo, références clients, gammes, formats (photo et vue technique), atelier de personnalisation, réalisations, « Pourquoi PAPER CUP », commande et estimateur, FAQ, CTA |
| `produits.html` | Gamme : frise des 4 formats à l'échelle, fiches photo, accessoires (`#accessoires`), comparatif (`#comparatif`) |
| `produits/gobelet-carton-{4,6-5,9,12}-oz.html` | Fiches produit : galerie Photo / Plan coté / Carton, caractéristiques, conditionnement et estimateur |
| `personnalisation.html` | Gobelets personnalisés : atelier d'aperçu, essentiel, visibilité, réalisations, préparation du projet, FAQ |
| `entreprise.html` | L'entreprise : fiche, mission, repères et salons (`#salons`), références, adresse |
| `faq.html` | Questions fréquentes, en 3 groupes (`FAQPage` en JSON-LD) |
| `contact.html` | Coordonnées complètes et formulaire « Préparer ma demande de devis » (`#devis`) |
| `404.html` | Page d'erreur (`noindex`, liens absolus depuis la racine) |

## 3. Structure

```text
docs/themes/v0/
├── *.html, produits/*.html       pages générées (ne pas éditer à la main : voir § 4)
├── robots.txt · sitemap.xml · site.webmanifest
├── assets/
│   ├── css/  style.css (tokens, base) · components.css · utilities.css · responsive.css
│   │         theme.bundle.css        ← généré (concaténé et minifié)
│   ├── js/   main.js (noyau) · navigation.js · animations.js · components.js · forms.js
│   │         theme.bundle.js         ← généré
│   ├── fonts/  Sora + DM Sans (woff2 variables, sous-ensemble latin, OFL)
│   └── images/ brand/ (logo SVG vectorisé, originaux PNG) · hero/ · products/ · realisations/
│               clients/ · salons/ · editorial/ · og-image.jpg · favicons
├── src/
│   ├── data/      site.mjs · products.mjs · faq.mjs · references.mjs · media.json (généré)
│   ├── lib/       svg.mjs (gobelets, cartons, icônes) · media.mjs (<picture> AVIF/WebP)
│   ├── partials/  layout.mjs (head SEO, en-tête, pied de page) · components.mjs
│   └── pages/     home.mjs · products.mjs · pages.mjs
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

## 5. JavaScript (≈ 35 Ko non minifié, ≈ 10 Ko gzip)

Modules enregistrés dans `window.PC`. Chacun est isolé : une erreur dans l'un ne bloque pas les autres.

| Module | Fonction |
|---|---|
| `header`, `mega-menu`, `mobile-menu`, `mobile-bar` | En-tête au scroll, méga-menu, menu mobile accessible, barre d'appel |
| `reveal` | Apparitions au scroll, frise des étapes |
| `dims-toggle`, `studio`, `marquee`, `lightbox`, `tabs`, `accordion` | Vue technique, atelier, pause des références, visionneuse, onglets, FAQ animée |
| `estimator`, `quote-form` | Estimateur de cartons, formulaire de devis |

Sans JavaScript, tout le contenu reste visible : la FAQ fonctionne (`<details>`) et les liens `tel:` et `mailto:` restent utilisables.

### Formulaire de devis : deux modes

1. **Mode par défaut (sans serveur).**
   - Le formulaire valide les champs, puis génère un récapitulatif.
   - Le visiteur l'envoie par e-mail : le bouton ouvre `mailto:paper.cup@hotmail.fr` avec l'objet et le corps pré-remplis.
   - Il peut aussi le dicter par téléphone ou le copier.
   - **Aucune donnée n'est transmise par le site** : c'est indiqué au visiteur.
2. **Mode connecté.**
   - Renseigner l'attribut `data-endpoint` du formulaire dans `src/pages/pages.mjs` (exemple : `data-endpoint="https://…/devis"`), puis reconstruire.
   - La demande part alors en `POST` JSON, avec états de chargement, de succès et d'erreur.
   - Le nom et le téléphone deviennent requis.
   - Le formulaire actuel du site source (`sendmail/mail.php`, avec captcha) n'est pas réutilisable tel quel par un site statique.

## 6. Déploiement

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

## 7. Langues

La v0 est en **français**, la langue principale du site source. Pour les versions anglaise et arabe :
- dupliquer `src/pages` dans `src/pages/en` et `src/pages/ar` ;
- placer les sorties dans `/en/` et `/ar/` ;
- ajouter `hreflang` (fr, en, ar, x-default) dans `layout.mjs` ;
- pour l'arabe, définir `lang="ar" dir="rtl"`. Le CSS utilise déjà en partie les propriétés logiques (`inset-inline`, `margin-inline-start`…) ; les positionnements `left`/`right` restants sont à basculer ;
- charger une police arabe (par exemple IBM Plex Sans Arabic).

## 8. SEO

- **Balises de page.** `title` et `meta description` uniques (≤ 160 caractères), un seul `h1`, canonical, `robots`, Open Graph et Twitter Card. L'image `og-image.jpg` (1200×630) utilise le logo officiel et une photo réelle.
- **JSON-LD** (valide) :
  - `Organization` : adresse, téléphone, fax, e-mail, logo, `sameAs` Facebook ;
  - `WebSite`, `WebPage`, `CollectionPage`, `AboutPage`, `ContactPage` ;
  - `BreadcrumbList`, `ItemList` (gamme), `FAQPage`.
- **`Product` volontairement absent.** Sans prix (`offers`), il serait invalide pour Google.
- **Fichiers.** `sitemap.xml` (10 URL) et `robots.txt`.
- **Pages et maillage.** URL lisibles en français, fil d'Ariane, liens internes entre gamme, fiches, personnalisation et devis.

## 9. Assurance qualité : tests exécutés le 19/10/2026

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
- Envoi réel du formulaire en mode connecté : aucun point de terminaison n'est fourni.
- Validation du contenu par PAPER CUP : voir `ANALYSIS.md` § 7, notamment les cotes, l'unité des cartons, le logo vectoriel et le minimum standard.

## 10. Crédits

- **Contenus, photos, logos clients et logo PAPER CUP** : site papercup.com.tn (propriété de PAPER CUP). Le logo a été vectorisé depuis les PNG publics.
- **Polices** : Sora et DM Sans, SIL Open Font License 1.1 (`assets/fonts/LICENSE-*.txt`).
- **Illustrations techniques et icônes** : générées pour ce thème (`src/lib/svg.mjs`).
