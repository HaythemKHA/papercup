# PAPER CUP — Analyse du site existant (Phase 1 · Discovery)

> Site source : <https://www.papercup.com.tn> · relevé du **19 octobre 2026**.
> Le dépôt était vide au démarrage : aucune ressource locale n'a été réutilisée.

## 0. Méthode et limites

| Étape | Résultat |
|---|---|
| Accès direct au site | **Bloqué au départ** par la politique réseau de l'environnement (proxy 403). Première analyse faite à partir de l'index des moteurs de recherche et de la page Facebook. |
| Domaine autorisé par le client | Toutes les pages FR, l'accueil EN et l'accueil AR, ainsi que **54 images**, ont été récupérés et analysés. Les informations de ce document en sont issues. |
| Rendu visuel de l'ancien site | Non évalué en détail : seul le contenu et la structure ont servi. Le design de l'ancien site n'a pas servi de référence, conformément au brief. |
| Non vérifiable en ligne | Prix, délais, livraison, certifications, statut juridique, horaires. Rien de tout cela n'a été inventé. |

## 1. Activité réelle

PAPER CUP (« PAPER CUP Gobelets Tunisie ») **fabrique et personnalise des gobelets en carton**, en standard et personnalisés, depuis **2008**. L'entreprise est basée Route de Médenine, km 5, Teboulbou, **6032 Gabès**, en Tunisie.

C'est une activité **B2B** :
- les commandes de gobelets personnalisés démarrent à **5 000 gobelets** ;
- on demande un devis par téléphone, e-mail ou formulaire ;
- les tarifs et la vente en ligne ne sont pas publiés.

Les segments ont été déduits des références affichées sur le site (bandeau « Ils nous ont fait confiance ») :
- **cafés** : Café Ben Yedder, Brioche Café, Keen's Café, Barista Work…
- **hôtels** : Mövenpick Hôtel du Lac Tunis, Bel Azur Hôtel ;
- **restauration** : Hobo Chicken Trip, Plan B, Smug's, Dolce Vita…
- **boulangeries et pâtisseries** : Gourmandise, Pavillon Gourmand, Le Gourmet, Pomme de Pain, La Brioche ;
- **loisirs et entreprises** : Carthage Land, Agil, Meublatex.

Aucun segment « particuliers » n'est affiché.

## 2. Informations vérifiées

| Donnée | Valeur | Page source |
|---|---|---|
| Raison commerciale | PAPER CUP / PAPER CUP TUNISIE | toutes |
| Signature du logo | « Fabrication de gobelets en carton » | logo d'en-tête |
| Activité | Fabrication de gobelets en carton (standard et personnalisé) | Accueil, Présentation |
| Ancienneté | Depuis 2008 | Accueil, Présentation |
| Adresse | Route de Médenine KM 5 – Teboulbou **6032** Gabès | Contact |
| Téléphone | (+216) 75 290 088 | toutes |
| Mobile | (+216) 26 880 202 | Contact (aussi sur Facebook) |
| Fax | (+216) 75 290 089 | Contact (icône fax) |
| E-mail | paper.cup@hotmail.fr | Contact |
| Facebook | facebook.com/papercuptunisie | index Facebook (pages et numéros concordants) |
| Langues du site | Français, English, عربي (`index?lang=fr\|en\|ar`) | en-tête |
| Minimum de commande | « Nous traitons vos commandes, minimum 5000 gobelets, au plus vite et à votre entière satisfaction. » | Accueil |
| Usage | « pauses café ou boissons fraîches » ; gobelets « personnalisables, jetables et recyclables » | Accueil |
| Accessoires | « Des couvercles avec trous […] sont offerts avec ces gobelets » ; « Couvercle Gobelet », « Agitateur » | Produits |
| Salons | Foire internationale de l'hôtellerie et de matériel de la restauration, **Sousse 2016** et **2017** | Actualités |
| Engagements | « Chaque client a un service particulier », « service de qualité », « Large choix » | Accueil (« Pourquoi choisir ») |
| Positionnement (déclaratif) | « leader sur le marché tunisien », « la société tunisienne la plus importante… » | Accueil, Présentation |

### Catalogue (valeurs reprises telles quelles)

| Modèle | Contenance | Ø haut | Ø bas | Hauteur | Pièces / boîte | Carton* |
|---|---|---|---|---|---|---|
| 4oz-M | 11,8 cl | 62 mm | 46 mm | 62 mm | 1 500 | 395 × 330 × 340 |
| 6.5oz-M | 19,2 cl | 72 mm | 49 mm | 73 mm | 1 000 | 370 × 300 × 390 |
| 9oz-M | 25 cl | 78 mm | 56 mm | 94 mm | 1 000 | 410 × 335 × 520 |
| 12oz-M | 33 cl | 80 mm | 51 mm | 117 mm | 1 000 | 410 × 335 × 400 |

\* Les dimensions du carton sont publiées sans unité (millimètres probables, **à confirmer**).

Deux points sont à faire valider par le client :
- le Ø bas du 12 oz (51 mm) est plus petit que celui du 9 oz (56 mm) ;
- le carton de 12 oz est moins haut que celui de 9 oz.

### Prix

Aucun prix n'est publié : le thème n'en affiche aucun et n'utilise pas de schéma `Product/Offer` (voir § 8).

## 3. Inventaire des pages existantes

| Page | URL source | Contenu | Dans le thème |
|---|---|---|---|
| Accueil | `/index?lang=fr` | Accroche, « Nos gobelets », visibilité, références, grille de 7 modèles, « Large gamme », « Pourquoi choisir » | `index.html` |
| Présentation | `/apropos?lang=fr` | Vision, réputation, publicité par le gobelet, depuis 2008, qualité, mission | `entreprise.html` |
| Produits | `/produits?lang=fr` | 4 formats en cl, couvercle, agitateur (photos) | `produits.html` + 4 fiches `produits/*.html` |
| Actualités | `/actualite?lang=fr` | 2 salons (2016, 2017) et leurs photos | intégré à `entreprise.html#salons` (page trop mince pour exister seule) |
| Contact | `/contact?lang=fr` | Coordonnées complètes et formulaire (nom, prénom, e-mail, téléphone, sujet, message) | `contact.html` |
| EN / AR | `?lang=en`, `?lang=ar` | Traductions | non produites dans la v0 (voir README § Langues) |

**Fonctionnalités existantes :**
- un carrousel de logos (Owl Carousel) ;
- un formulaire posté vers `sendmail/mail.php` avec captcha (dépend du serveur actuel) ;
- un sélecteur de langue par paramètre d'URL ;
- Google Analytics (UA, obsolète).

**Métadonnées SEO actuelles :**
- titre unique « PAPER CUP Gobelets Tunisie - Accueil » ;
- meta description générique, mots-clés `keywords`.

On ne trouve ni canonical, ni hreflang, ni Open Graph, ni données structurées. La même URL `index?lang=en` sert à plusieurs contenus dans l'index.

## 4. Images et ressources de marque

Les 54 fichiers récupérés ont été triés, puis optimisés en AVIF et WebP par `tools/optimize-images.py`. Le manifeste est `tools/media-manifest.json`.

| Groupe | Fichiers | Qualité | Usage dans le thème |
|---|---|---|---|
| **Logo** | `logo-header.png` (230×50), `logo.png` (blanc, 120×170), `logo-maps.png` | Trop petits pour les écrans haute densité | **Vectorisés** en SVG (`assets/images/brand/`). Les originaux sont conservés à côté. |
| Rendu PAPER CUP détouré | `home/6.png` (2200×2500, transparent) | Excellente | Visuel principal du hero |
| Rendus PAPER CUP | `apropos/paper-1.png`, `home/section-2.jpg`, `home/section_3.jpg` (gabarit déroulé) | Bonne | Gammes, personnalisation, entreprise |
| Photos produit | `collections/src_images/{4oz,6.5oz,9oz,12oz,cover,agitateur}` (1000×662) | Bonne | Cartes produit, fiches, accessoires |
| Réalisations | `home/bottom-grid/11…88.png` (7 photos, ≤ 1280 px) | Bonne | Galerie et visionneuse. Le n° 88 doublonne la photo 6,5 oz et le n° 66 la photo 4 oz : ils sont écartés de la galerie. |
| Références clients | `logos/logo*.jpg` (24 × 320×90) | Correcte | Bandeau « Ils nous ont fait confiance » |
| Salons | `news/news2016_1`, `news2017_1…5` (400–500 px) | Moyenne | Frise « Repères & salons » |
| Ambiance | `background/home-1.jpg` (gobelet tenu dans un café) | Bonne | Section « Pourquoi choisir » |
| Écartés | `phone-icon.png`, `close-papercup.png`, `footer.jpg` (flou), `news2016_2/3` (404 sur le serveur), `map-image.png` (téléchargement refusé) | — | — |

Poids : environ 17 Mo d'originaux, contre **3,1 Mo** de variantes optimisées. L'image LCP du hero pèse 26 à 65 Ko en AVIF.

## 5. Problèmes UX et SEO du site actuel

1. **SEO.**
   - Les langues passent par un paramètre `?lang=`, sans hreflang ni canonical, d'où des doublons.
   - Les titres de page sont génériques.
   - Il n'y a aucune donnée structurée.
   - Google Analytics UA est obsolète.
2. **Hiérarchie de contenu.**
   - L'accroche « Vos gobelets personnalisés à votre image » ne mène vers aucune action claire.
   - Le minimum de 5 000 gobelets est noyé dans un paragraphe.
3. **Catalogue dispersé.**
   - Les cotes sont sur l'accueil, la contenance en cl sur la page Produits.
   - Il n'y a pas de fiche par format ni de comparatif.
   - La grille d'accueil répète quatre fois le modèle 6.5oz.
4. **Conversion.**
   - Le formulaire n'a pas de champ format ni quantité.
   - Il dépend d'un script serveur et d'un captcha.
   - Le téléphone n'est pas cliquable partout.
   - Il n'y a pas d'appel à l'action persistant sur mobile.
5. **Confiance sous-exploitée.**
   - Les 24 références clients défilent dans un carrousel sans contexte.
   - Les salons sont isolés sur une page « Actualités » datée de 2017.
6. **Technique.**
   - Le site charge des dépendances lourdes : jQuery, Bootstrap, Owl Carousel, Masonry, Parallax.js, Font Awesome, Google Fonts.
   - Les images ne sont pas optimisées (PNG de 1 à 3 Mo).
7. **Rédaction.** Des coquilles restent en ligne : « Nous traitons vos commande, », « couvercles avec trous pouvant sont offerts ».

## 6. Opportunités de conversion (traitées dans le thème)

- **Parcours de devis structuré** : format, quantité et type, avec une estimation du nombre de cartons calculée sur le conditionnement publié.
- **Récapitulatif envoyable** : par e-mail (`mailto:` pré-rempli), par téléphone, ou en copie.
- **Atelier « Essayez votre marque »** : aperçu illustratif sur un gobelet, avec transmission du nom et du format dans la demande de devis.
- **Fiches par format** : photo réelle, plan coté, carton, appel à l'action dédié.
- **Contact sur mobile** : barre fixe « Appeler / Devis » et téléphone cliquable dans l'en-tête.
- **Preuves sociales mises en avant** : références clients, réalisations agrandissables, salons professionnels.

## 7. Informations manquantes ou à confirmer

- Fichier **vectoriel original** du logo. Le SVG du thème est une vectorisation fidèle des PNG publics, à valider.
- Unité des dimensions de carton ; cotes du 12 oz (voir § 2).
- Minimum de commande pour la gamme **standard**. Le site ne précise le seuil que pour la personnalisation.
- Délais de fabrication, conditions de livraison, zones desservies, prix, modes de paiement.
- Techniques et nombre de couleurs d'impression possibles. L'atelier d'aperçu est illustratif.
- Matières, certifications, normes alimentaires. Le site dit seulement « recyclables » : aucune certification n'est mentionnée dans le thème.
- Mentions légales, matricule fiscal, horaires d'ouverture.
- Le site affirme des « réalisations certifiées par des marques internationales » : affirmation non étayée, **non reprise**.
- Le statut « leader » est repris uniquement comme positionnement déclaré (« PAPER CUP se présente comme… »).

## 8. Recommandations de refonte

1. **Garder un site vitrine B2B orienté devis.** Pas de panier ni de paiement : rien ne l'indique dans l'activité actuelle.
2. **Prévoir des URL propres et des redirections 301** depuis les anciennes URL :

   | Ancienne URL | Nouvelle URL |
   |---|---|
   | `index?lang=fr` | `/` |
   | `apropos?lang=fr` | `/entreprise.html` |
   | `produits?lang=fr` | `/produits.html` |
   | `actualite?lang=fr` | `/entreprise.html#salons` |
   | `contact?lang=fr` | `/contact.html` |

3. **Produire les versions EN et AR** dans `/en/` et `/ar/` (RTL), avec hreflang. La v0 est en français.
4. **Brancher les formulaires sur l'API PHP** fournie (`api/`, voir README § 6) : envoi direct, pièces jointes, notification interne et administration. Sans PHP, le mode préparation ouvre un e-mail pré-rempli.
5. **Faire valider par PAPER CUP** les points du § 7 avant mise en ligne, notamment les cotes, les unités et le logo vectoriel.
6. **Données structurées** : `Organization`, `WebSite`, `BreadcrumbList`, `ItemList` et `FAQPage` sont en place. Le schéma `Product` a été écarté : sans prix (`offers`), il serait invalide pour les résultats enrichis de Google.

---

# Mission « Amélioration du site » (20 octobre 2026)

## 9. Analyse de l'existant (formulaires)

| Élément | Constat avant intervention |
|---|---|
| Pile | Site statique généré par `build.mjs` (Node, sans dépendance) ; HTML/CSS/JS natif ; aucun serveur, aucune base de données, aucun stockage, aucun espace d'administration dans le dépôt |
| « Demande de devis » (`contact.html#devis`) | Validation dans le navigateur (type, format, quantité, téléphone ; nom et téléphone requis seulement en mode connecté), récapitulatif + `mailto:`. Un mode « connecté » existait (`data-endpoint`, `POST` JSON) mais **aucun point de terminaison** n'était fourni |
| « Essayez votre marque » (atelier) | **Aperçu uniquement**, pas un formulaire : nom (18 caractères), teinte, format, puis lien « Préparer ma demande » vers le devis pré-rempli. Aucune donnée envoyée |
| Routes serveur, notifications | Aucune. L'ancien site utilisait `sendmail/mail.php` (PHP + `mail()`), non réutilisable tel quel |
| Pièces jointes | Aucune possibilité de joindre un logo ou une maquette |

**Choix d'architecture.** L'hébergement d'origine exécute PHP (ancien formulaire `mail.php`) : l'API est écrite en **PHP 8.1+ sans dépendance** (fonctions natives : `$_FILES`, `finfo`, `getimagesize`, `mail()`, sessions, `password_hash`, `hash_hmac`, `flock`). Les limites d'envoi sont lues dans la configuration PHP effective, jamais supposées. Sans PHP, le comportement d'origine est conservé.

## 10. Page Facebook (relevé du 20/10/2026)

**Accès.** La page <https://www.facebook.com/papercuptunisie/> exige une connexion pour un navigateur ordinaire. Le HTML public servi aux robots d'indexation a pu être lu pour l'en-tête, l'onglet « Coordonnées », la transparence et les textes de **20 publications (18/08 → 20/10/2026) et 10 vidéos courtes (depuis le 09/07/2026)**, toutes signées « PAPER CUP » (même ID de page que le lien du site). Une vérification croisée indépendante a relu les fichiers bruts et récupéré à nouveau les onglets et 7 publications.

**Non accessible** : toutes les **images et vidéos** (CDN de Meta bloqués) — aucune description visuelle n'est donc reprise ; les publications antérieures au 18/08/2026 ; l'avis unique de la page ; la bibliothèque publicitaire.

### Faits confirmés et repris sur le site

| Fait (source : texte publié par PAPER CUP) | Utilisation |
|---|---|
| WhatsApp **+216 24 749 110** (champ officiel « WhatsApp » + boutons des publications) | Carte Contact « Autres lignes », FAQ « devis » |
| Gobelets **plastique** personnalisés **10, 12, 14 et 16 oz** (14/09/2026) | `produits.html#autres-emballages`, FAQ |
| Gobelets **transparents** personnalisables pour boissons froides (23/08/2026) | idem |
| Gobelets à **glace** en carton : 1 boule (55 cc), 2 boules (85 cc) (27/07/2026) | idem |
| **Pochettes** personnalisées, tailles 0 à 4, notamment croissants et sandwichs (29/08 et 04/09/2026) | idem |
| **Papiers plateaux** personnalisés (21/09/2026) | idem |
| Secteurs visés : cafés et coffee shops, lounges, restaurants, fast-foods et snacks, hôtels, glaceries, commerces, entreprises | Bandeau « Pour » de l'accueil |

Déjà présents sur le site et confirmés par Facebook : formats 4 / 6,5 / 9 / 12 oz, adresse (Gabès 6032), mobile 26 880 202, positionnement « leader » (déjà sur le site source, repris comme positionnement déclaré).

### Confirmés mais **non publiés** (à valider par PAPER CUP)

| Élément | Raison |
|---|---|
| Clients remerciés publiquement : TIJEN, AGIL, « Sun Side COOFEE » | Accord des clients, orthographe exacte et logos à obtenir |
| Numéro +216 25 672 636 (« Téléphone / WhatsApp » dans 14 publications) | Absent des coordonnées officielles de la page et du site : à confirmer |
| « Gamme complète : pots de glace, gobelets, sacs viennoiseries et boîtes à pizza » (une seule mention, 18/07/2026) | Trop peu précis (fabrication ou négoce ?) |
| « N°1 », « expertise 100 % tunisienne », « de la fabrication à l'impression » | Auto-déclarations promotionnelles non étayées |
| Horaires « Toujours ouvert », zone de service « Tunis » | Réglages vraisemblablement par défaut, contradictoires avec l'implantation à Gabès |
| Équivalences en ml des gobelets plastique (300 à 500 ml) | Lues seulement dans le texte automatique d'une image non consultée |
| Audience (≈ 10 100 abonnés), date de création de la page (16/01/2020) | Chiffres variables, sans intérêt pour le client |

Les liens « Demander un devis » de ces produits ouvrent le formulaire avec le type **« Autre emballage »** : format de gobelet carton facultatif et aucun minimum appliqué, puisque rien n'est publié à ce sujet.

**Aucune** publication ne donne de prix, délai, minimum, technique ou nombre de couleurs d'impression, matière, certification, double paroi ou kraft : rien de tel n'a été ajouté. Les commentaires demandent surtout des **prix et des dimensions**, sans réponse publique visible : la FAQ rappelle que les tarifs sont établis sur devis et que le formulaire permet de joindre un visuel.

### Propositions éditoriales (non réalisées)

- Fiches détaillées pour les autres emballages (dimensions, matières, quantités minimales) une fois les informations fournies par PAPER CUP, avec leurs propres photos.
- Bandeau de références enrichi (TIJEN, AGIL, Sun Side) après accord des clients.
- Réponse type aux questions de prix sur Facebook renvoyant vers le formulaire de devis du site.
