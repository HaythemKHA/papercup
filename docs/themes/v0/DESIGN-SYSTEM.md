# PAPER CUP — Design system (thème v0)

## 1. Direction artistique : « Papier & Encre »

Le thème est éditorial et industriel, comme un imprimeur d'emballages qui montrerait son atelier.

| Axe | Choix | Justification |
|---|---|---|
| Matière | Fonds papier chaud, kraft, encre presque noire | La matière du produit : carton, impression |
| Accent | **Vermillon d'impression** | Couleur d'encre forte, lisible, appétente (café, restauration), absente des concurrents locaux observés |
| Logo | Logo officiel (gobelet dessiné à la main + « PAPER CUP » espacé), en encre ou en papier | Identité existante respectée, vectorisée sans modification de forme |
| Signature graphique | Repères de coupe, mire d'impression ⌖, règle millimétrée, cotes techniques | Vocabulaire de l'impression et de la fabrication |
| Imagerie | Photos réelles du site source (produits, réalisations, salons) + **plans cotés SVG à l'échelle** | Le vrai produit pour l'émotion, les cotes pour la précision |
| Ton | Clair, factuel, professionnel. Aucune promesse non sourcée | Brief : aucun contenu inventé |

**Moodboard (descriptif) :**
- gobelets posés sur papier kraft, lumière douce latérale ;
- fiches techniques d'imprimeur avec traits de cote rouges ;
- typographie géométrique compacte ;
- photos de produits sur fonds colorés bleu ciel et rose, issues des réalisations PAPER CUP ;
- noir profond pour les sections « marque ».

## 2. Couleurs

Les tokens sont définis dans `assets/css/style.css` (`:root`). Contrastes WCAG mesurés :

| Token | Valeur | Rôle | Contraste |
|---|---|---|---|
| `--color-primary` | `#1C1A17` | Encre : titres, boutons secondaires, sections sombres | 15,3:1 sur papier |
| `--color-secondary` | `#C49A6C` | Kraft : matière, illustrations | décoratif |
| `--color-accent` | `#CC3D14` | Vermillon : CTA, grands titres accentués | blanc sur accent 4,95:1 |
| `--color-accent-ink` | `#AA320D` | Vermillon « texte » : sur-titres, liens, petits textes | ≥ 4,65:1 sur toutes les surfaces claires |
| `--color-accent-on-dark` | `#FF7A52` | Accent sur fond sombre | 6,7:1 sur encre |
| `--color-background` | `#F5F0E8` | Papier | — |
| `--color-surface` | `#FFFDF9` | Cartes, formulaires | — |
| `--color-surface-2` | `#EFE7DA` | Sections teintées | — |
| `--color-kraft-light` | `#E6D6BF` | Scènes produit, section kraft | — |
| `--color-dark` | `#171512` | Sections sombres, pied de page | — |
| `--color-text` | `#1C1A17` | Texte | 15,3:1 |
| `--color-muted` | `#6B645A` | Texte secondaire (`--color-muted-strong` `#5F584E` sur kraft) | 5,15:1 |
| `--color-border` | `#DDD3C4` | Traits | — |
| `--color-success` | `#2F7A4B` | Validation | — |
| `--color-warning` | `#A86A12` | Avertissement (sous le minimum) | — |
| `--color-danger` | `#B3261E` | Erreurs de formulaire | — |

**Règles d'usage :**
- `--color-accent` sert aux fonds (boutons, bandeau CTA) et aux textes de plus de 24 px.
- Les petits textes accentués utilisent toujours `--color-accent-ink`.

## 3. Typographie

| Usage | Famille | Graisse | Taille (`clamp`) |
|---|---|---|---|
| Display / hero | **Sora** (variable, auto-hébergée) | 600 | `clamp(2.3rem, 10.4cqi, 5.6rem)`, pilotée par la largeur de colonne |
| H1 | Sora | 600, interlettrage −0,04em | `--fs-h1` 2.3 → 4.4rem |
| H2 | Sora | 600 | `--fs-h2` 1.9 → 3.3rem |
| H3 | Sora | 600 | `--fs-h3` 1.3 → 1.7rem |
| H4 | Sora | 600 | `--fs-h4` 1.075 → 1.25rem |
| Lead | DM Sans | 400 | `--fs-lead` 1.08 → 1.32rem |
| Body | **DM Sans** (variable) | 400 / 500 | `--fs-body` 1 → 1.0625rem, interligne 1.62 |
| Small | DM Sans | 400 | 0.9375rem |
| Caption / sur-titres | Sora | 600, capitales, interlettrage 0,14em | 0.75rem |

**Chiffres et chargement :**
- Les chiffres techniques sont en `tabular-nums`.
- Polices en sous-ensemble latin (≈ 70 Ko au total), `font-display: swap`.
- Sora est préchargée. Une police de repli métrique (`Sora Fallback`) limite le CLS.
- Les références produit (« 12oz-M ») ne passent jamais en capitales (`.eyebrow .ref`).

## 4. Espacements, grille, formes

| Famille | Tokens |
|---|---|
| Espacements (base 4 px) | `--space-1` 0.25rem … `--space-10` 8rem ; sections `--section-y` = `clamp(4.5rem, …, 9rem)` |
| Conteneurs | `--container` 1240 px (1300 px dès 1440), `--container-narrow` 760 px, `--gutter` `clamp(1rem, …, 2.5rem)` (16 px minimum sur mobile) |
| Grille | CSS Grid ; mobile 1 colonne `minmax(0, 1fr)` (aucun débordement), puis 2 / 3 / 4 colonnes selon le composant |
| Rayons | `--radius-xs` 6, `sm` 10, `md` 16, `lg` 24, `xl` 36, `pill` 999 |
| Ombres | `--shadow-xs/sm/md/lg`, teintées encre (jamais noir pur) |
| Breakpoints | 480 · 640 · 768 · 900 · 1024 · 1280 · 1440 (min-width, mobile first). Ajustements ≤ 479 et ≤ 380 |

## 5. Boutons et états

| Variante | Classe | Usage |
|---|---|---|
| Accent | `.btn--accent` | Action principale : devis, préparer, envoyer |
| Encre | `.btn--primary` / `.btn--ink` | Action forte secondaire, CTA sur fond vermillon |
| Contour | `.btn--outline` / `.btn--outline-light` | Téléphone, actions secondaires |
| Fantôme | `.btn--ghost` | Actions tertiaires |
| Tailles | `.btn--sm` 42 px · défaut 50 px · `.btn--lg` 58 px · `.btn--block` | Cibles tactiles ≥ 44 px |

**États :**
- Survol : teinte et décalage de 3 px de la flèche.
- Actif : `translateY(1px)`.
- Focus : `:focus-visible` avec contour de 2 px vermillon, décalé de 3 px (paper ou on-dark sur fonds sombres).
- Invalide : `aria-invalid` passe la bordure en `--color-danger`.

## 6. Composants

| Composant | Fichier source | Notes |
|---|---|---|
| En-tête sticky, méga-menu, menu mobile | `src/partials/layout.mjs`, `navigation.js` | Logo SVG officiel. Méga-menu au clic et au survol avec Échap. Menu mobile avec piège de focus et `inert` |
| Barre d'appel mobile | `layout.mjs`, `navigation.js` | Apparaît après le hero, disparaît près du CTA final |
| Vitrine hero | `src/pages/home.mjs` | Photo détourée prioritaire (LCP) + cartes réalisations flottantes + puce formats + badge rotatif |
| Bandeau de références | `components.mjs › clientsBand` | Défilement CSS, bouton pause (WCAG 2.2.2), grille statique en mouvement réduit |
| Carte produit | `productCard` | Photo réelle ; interrupteur « Vue technique » vers le plan coté à l'échelle |
| Galerie de réalisations + visionneuse | `gallery` | Grille bento ; `<dialog>` natif (focus, Échap, flèches) |
| Atelier de personnalisation | `studio` | SVG en direct (nom, teinte, format), lien de devis pré-rempli. Mentionné comme « aperçu illustratif » |
| Estimateur de cartons | `estimator` | Calcul `ceil(quantité / pièces par carton)`, alerte sous 5 000 |
| Étapes de commande | `steps` | Frise tracée au scroll |
| FAQ | `faqList` | `<details>` natif (fonctionne sans JS), hauteur animée |
| Fiche produit | `src/pages/products.mjs` | Onglets ARIA Photo / Plan coté / Carton ; tableau de caractéristiques |
| Comparatif | `compareTable` | Tableau défilant, 1ʳᵉ colonne collante |
| Formulaire de devis | `src/pages/pages.mjs`, `forms.js` | Validation accessible, résumé d'erreurs ; envoi direct (mode connecté) ou récapitulatif et `mailto:` pré-rempli (mode préparation) |
| Pièces jointes | `components.mjs › attachmentsField`, `attachments.js` | `fieldset` + `legend`, mention « Facultatif », zone de dépôt en pointillés (contour plein vermillon au survol de fichiers), bouton visible au clavier, champ natif masqué mais utilisé sans JS. Liste : miniature (images) ou pictogramme, nom tronqué, format et taille, barre de progression, bouton « Retirer » de 44 px. Erreurs dans une zone `role="alert"`, annonces dans une zone `role="status"`. Variante claire (devis) et sombre (`.attach--dark`, atelier) |
| Atelier « Essayez votre marque » | `components.mjs › studio`, `components.js`, `forms.js › brand-form` | Formulaire : aperçu (nom, teinte, format, **logo joint affiché sur le gobelet**), pièces jointes, coordonnées et envoi en mode connecté ; confirmation avec référence |
| Autres emballages, secteurs | `products.mjs`, `home.mjs`, `src/data/facebook.mjs` | Cartes `.feature` avec pictogramme et source (« Présenté sur la page Facebook de PAPER CUP · date ») ; puces `.sectors` |
| Frise « Repères & salons », fiche entreprise, cartes contact, bandeau CTA, pied de page | `pages.mjs`, `components.mjs` | — |

## 7. Iconographie

- Sprite SVG maison de 35 pictogrammes : grille 24, trait 1,7, extrémités arrondies, `currentColor` (dont trombone, envoi, fichier, corbeille, glace, pochette, plateau, discussion).
- Le sprite est injecté une fois par page (`src/lib/svg.mjs › defs()`).
- La mire d'impression ⌖ sert de puce de marque.

## 8. Traitement des images

- **Photos** : `<picture>` AVIF puis WebP, `srcset`/`sizes`, `width`/`height` explicites (CLS = 0).
  - `loading="lazy"` hors écran ; `fetchpriority="high"` et préchargement pour le LCP.
  - Recadrage par `object-fit: cover` avec un point focal adapté.
- **Détourés** (hero, gobelets bleus) : PNG transparent converti en AVIF ou WebP avec alpha, ombre portée en CSS.
- **Illustrations techniques** : gobelets et cartons générés en SVG à partir des cotes, à l'échelle entre eux, toujours légendés comme illustrations.
- **Logos clients** : tuiles blanches, rendu fidèle (aucune altération des marques).

## 9. Mouvement

| Moment | Effet | Durée et courbe |
|---|---|---|
| Chargement | Titre révélé ligne par ligne, apparition décalée des éléments, soulignement « marque » tracé | 800 ms, `cubic-bezier(.22, 1, .36, 1)` |
| Scroll | Révélations `[data-reveal]` (fondu et glissement de 28 px, décalage de 90 ms), frise des étapes tracée | IntersectionObserver |
| Survol | Zoom photo (1.03–1.05), élévation des cartes, flèche décalée, bouton de visionneuse | 260 à 800 ms |
| Ambiance | Cartes du hero flottantes (±10 px), badge rotatif (30 s), défilement des références (60 s, pause possible) | lent, en boucle |

- `prefers-reduced-motion: reduce` coupe toutes les animations et transitions, affiche tout le contenu et passe les références en grille statique.
- Le rendu hors écran est différé avec `content-visibility: auto`.

## 10. Accessibilité (règles appliquées)

- HTML sémantique, un seul `h1` par page, landmarks nommés, fil d'Ariane.
- Lien d'évitement, focus visible partout.
- Formulaires : labels explicites, `aria-describedby`, `aria-invalid`, résumé d'erreurs focalisé et liens vers les champs.
- Pièces jointes : opérables au clavier (bouton), retrait avec nom du fichier dans l'intitulé, focus déplacé sur l'élément suivant après un retrait, annonces polies des ajouts et retraits, saisie et fichiers conservés après une erreur.
- Composants ARIA : onglets (flèches, Début, Fin), `aria-expanded`, `aria-pressed`, `aria-live` pour l'estimateur.
- Menu mobile avec piège de focus et `inert` ; `<dialog>` modal pour la visionneuse.
- Textes alternatifs descriptifs (marque et décor visibles sur chaque photo) ; illustrations décoratives en `aria-hidden`.
- Cibles tactiles d'au moins 44 px ; contrastes AA vérifiés (Lighthouse Accessibilité : 100 sur toutes les pages testées).
