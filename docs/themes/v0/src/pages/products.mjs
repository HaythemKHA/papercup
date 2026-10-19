/** Gamme (listing) + fiches produit générées depuis le même jeu de données. */
import { site } from '../data/site.mjs';
import { products, accessories, productsJSON } from '../data/products.mjs';
import { cup, carton, icon, fmt } from '../lib/svg.mjs';
import { picture } from '../lib/media.mjs';
import { absUrl } from '../partials/layout.mjs';
import { pageHero, breadcrumb, lineup, productCard, accessoryCard, estimator, ctaBand, specTable, ozNum } from '../partials/components.mjs';

/* =========================================================== Liste (gamme) */

function specRow(p, r, i) {
  return `<article class="spec-row" id="format-${p.id}" data-reveal>
  <div class="spec-row__visual">
    ${picture(p.photo, { r, alt: p.photoAlt, className: 'spec-row__photo', fallback: 800, sizes: '(min-width: 900px) 46vw, 92vw' })}
    <div class="spec-row__scale" aria-hidden="true">${cup(p, { scale: 0.95, set: products, finish: 'line', dims: false, uid: `row${i}` })}<span>${p.height} mm</span></div>
  </div>
  <div class="spec-row__body">
    <p class="eyebrow">Modèle <span class="ref">${p.model}</span></p>
    <h2 class="spec-row__title">Gobelet carton ${p.label}</h2>
    <p>${p.rank} : ${p.height}&nbsp;mm de haut, Ø&nbsp;${p.top}&nbsp;mm à l’ouverture, conditionné par cartons de ${fmt(p.perBox)} pièces. Contenance : ${p.cl}&nbsp;cl.</p>
    <dl class="spec-grid">
      <div><dt>Contenance</dt><dd>${p.cl} cl</dd></div>
      <div><dt>Ø haut</dt><dd>${p.top} mm</dd></div>
      <div><dt>Ø fond</dt><dd>${p.bottom} mm</dd></div>
      <div><dt>Hauteur</dt><dd>${p.height} mm</dd></div>
      <div><dt>Pièces / carton</dt><dd>${fmt(p.perBox)}</dd></div>
      <div><dt>Carton</dt><dd>${p.carton.join(' × ')}</dd></div>
    </dl>
    <div class="spec-row__actions">
      <a class="btn btn--primary" href="${r}${p.path}">Voir la fiche ${icon('arrow-right')}</a>
      <a class="btn btn--outline" href="${r}contact.html?format=${p.id}#devis">Demander un devis</a>
    </div>
  </div>
</article>`;
}

function compareTable(r) {
  return `<div class="table-wrap" role="region" aria-label="Tableau comparatif des formats, défilement horizontal" tabindex="0">
  <table class="compare-table">
    <caption class="visually-hidden">Comparatif des quatre formats de gobelets en carton PAPER CUP</caption>
    <thead><tr>
      <th scope="col">Format</th><th scope="col">Référence</th><th scope="col">Ø haut</th><th scope="col">Ø fond</th><th scope="col">Hauteur</th><th scope="col">Pièces / carton</th><th scope="col">Carton*</th><th scope="col">Contenance</th>
    </tr></thead>
    <tbody>
      ${products
        .map(
          (p) => `<tr>
        <th scope="row"><a href="${r}${p.path}">${p.label}</a></th>
        <td>${p.model}</td><td>${p.top} mm</td><td>${p.bottom} mm</td><td>${p.height} mm</td><td>${fmt(p.perBox)}</td><td>${p.carton.join(' × ')}</td><td>${p.cl} cl</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>
</div>
<p class="footnote">* Dimensions du carton publiées sans unité par la source (millimètres probables, à confirmer).</p>`;
}

export const productsPage = {
  path: 'produits.html',
  title: 'Gobelets en carton 4, 6,5, 9 et 12 oz | PAPER CUP Tunisie',
  description: `Gobelets en carton PAPER CUP de 11,8 à 33 cl (4, 6,5, 9 et 12 oz), couvercles et agitateurs : dimensions, conditionnement et comparatif des formats.`,
  webPageType: 'CollectionPage',
  breadcrumb: [
    { label: 'Accueil', href: 'index.html' },
    { label: 'Gobelets', href: 'produits.html' },
  ],
  schema: [
    {
      '@type': 'ItemList',
      name: 'Gobelets en carton PAPER CUP',
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: `${p.name} (${p.cl} cl)`, url: absUrl(p.path) })),
    },
  ],
  main: (r) => `${pageHero({
    r,
    crumbs: productsPage.breadcrumb,
    eyebrow: 'La gamme PAPER CUP',
    title: 'Gobelets en carton, du 4 au 12&nbsp;oz',
    lead: `Nos gobelets en carton sont disponibles en 4, 6,5, 9 et 12&nbsp;oz, soit 11,8 à 33&nbsp;cl. Comparez leurs cotes et leur conditionnement, puis demandez votre devis.`,
    aside: `<a class="btn btn--accent btn--lg" href="${r}contact.html#devis">Demander un devis ${icon('arrow-right')}</a><a class="btn btn--outline btn--lg" href="#comparatif">Voir le comparatif</a>`,
  })}
<section class="section section--tight" aria-label="Les quatre formats à l’échelle" style="padding-top:0">
  <div class="container">
    <div class="lineup-stage" data-reveal>
      ${lineup(r, { scale: 2.6, dims: true, uid: 'lp' })}
      <div class="lineup-stage__foot"><span>Silhouettes à l’échelle 1:1 entre elles, d’après les cotes publiées.</span><span>Cliquez sur un format pour ouvrir sa fiche.</span></div>
    </div>
  </div>
</section>
<section class="section" aria-label="Fiches des formats" style="padding-top:0">
  <div class="container spec-rows">${products.map((p, i) => specRow(p, r, i)).join('')}</div>
</section>
<section class="section section--kraft" id="accessoires" aria-labelledby="acc-title">
  <div class="container">
    <header class="section-head section-head--split">
      <div>
        <p class="eyebrow">${icon('layers', 'eyebrow__icon')}Accessoires</p>
        <h2 id="acc-title">Couvercles &amp; agitateurs.</h2>
      </div>
      <p>Des couvercles avec trou sont proposés avec les gobelets de la gamme, ainsi que des agitateurs. Précisez-les dans votre demande de devis.</p>
    </header>
    <div class="accessories__grid">${accessories.map((a, i) => accessoryCard(a, r, { i })).join('')}</div>
  </div>
</section>
<section class="section section--surface" id="comparatif" aria-labelledby="compare-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">${icon('ruler', 'eyebrow__icon')}Comparatif</p>
      <h2 id="compare-title">Tous les formats, côte à côte.</h2>
      <p>Les valeurs reprennent les fiches publiées par PAPER CUP pour chaque modèle.</p>
    </header>
    ${compareTable(r)}
    <p class="table-hint">${icon('arrow-right')}Sur mobile, faites défiler le tableau horizontalement.</p>
  </div>
</section>
<section class="section" aria-labelledby="ranges-note-title">
  <div class="container split">
    <div data-reveal>
      <p class="eyebrow">${icon('layers', 'eyebrow__icon')}Standard &amp; personnalisé</p>
      <h2 id="ranges-note-title">Le même format, à vos couleurs.</h2>
    </div>
    <div class="stack" data-reveal style="--i:1">
      <p class="lead">Les quatre modèles présentés existent en version personnalisée, à partir de ${fmt(site.minOrder)} gobelets. Pour les gobelets standard, les formats et disponibilités sont communiqués sur demande.</p>
      <p><a class="link-arrow" href="${r}personnalisation.html">Découvrir la personnalisation ${icon('arrow-right')}</a></p>
    </div>
  </div>
</section>
${ctaBand(r)}`,
};

/* ============================================================ Fiche produit */

function gallery(p, r) {
  const views = [
    ['photo', 'Photo', picture(p.photo, { r, alt: p.photoAlt, priority: true, fallback: 800, sizes: '(min-width: 1024px) 50vw, 92vw', className: 'gallery__photo' }), ' gallery__panel--photo', picture(p.photo, { r, alt: '', fallback: 480, sizes: '80px' })],
    ['plan', 'Plan coté', cup(p, { scale: 3.2, set: [p], finish: 'line', dims: true, uid: `g2`, title: `Plan coté du gobelet ${p.label} : Ø ${p.top} mm en haut, Ø ${p.bottom} mm au fond, ${p.height} mm de hauteur` }), ' gallery__panel--line', cup(p, { scale: 0.5, set: products, finish: 'line', uid: 't2' })],
    ['carton', 'Carton', carton(p, { title: `Carton de ${fmt(p.perBox)} gobelets ${p.label}, dimensions ${p.carton.join(' × ')}` }), '', `<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" style="color:#B58B5E"><use href="#i-box"/></svg>`],
  ];
  return `<div class="gallery" data-tabs>
  <div class="gallery__panels crop-marks">
    ${views.map(([id, , svg, mod], i) => `<div class="gallery__panel${mod}" id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}"${i ? ' hidden' : ''}>${svg}</div>`).join('')}
  </div>
  <div class="gallery__tabs" role="tablist" aria-label="Vues du gobelet ${p.label}">
    ${views.map(([id, label, , , thumb], i) => `<button class="gallery__tab" type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}><span class="gallery__thumb">${thumb}</span>${label}</button>`).join('')}
  </div>
  <p class="gallery__note">${icon('info')}<span>Photo : gobelet ${p.label} personnalisé présenté sur le site PAPER CUP. Plan coté et carton : illustrations à l’échelle d’après les cotes publiées.</span></p>
</div>`;
}

function productPage(p, idx) {
  const crumbs = [
    { label: 'Accueil', href: 'index.html' },
    { label: 'Gobelets', href: 'produits.html' },
    { label: `Gobelet carton ${p.label}`, href: p.path },
  ];
  const others = products.filter((q) => q.id !== p.id);
  return {
    path: p.path,
    title: `Gobelet en carton ${p.label} – ${p.cl} cl | PAPER CUP Tunisie`,
    description: `Gobelet en carton ${p.label} (${p.cl} cl) PAPER CUP : Ø ${p.top} mm en haut, ${p.height} mm de haut, ${fmt(p.perBox)} pièces par carton. Personnalisable dès ${fmt(site.minOrder)} gobelets.`,
    ogType: 'website',
    breadcrumb: crumbs,
    main: (r) => `<section class="product" aria-labelledby="product-title">
  <div class="container">
    ${breadcrumb(crumbs, r)}
    <div class="product__grid">
      <div data-hero-item style="--d:0">${gallery(p, r)}</div>
      <div class="product__info">
        <p class="eyebrow" data-hero-item style="--d:80">${icon('register', 'eyebrow__icon')}Modèle <span class="ref">${p.model}</span></p>
        <h1 id="product-title" class="product__title" data-hero-item style="--d:140">Gobelet en carton ${p.label}</h1>
        <p class="lead" data-hero-item style="--d:220">${p.rank} : ${p.cl}&nbsp;cl. Un gobelet en carton jetable et recyclable pour vos pauses café ou vos boissons fraîches, disponible en version personnalisée à votre marque.</p>
        <ul class="product__chips" role="list" data-hero-item style="--d:280">
          <li>${icon('cup-hot')}${p.cl} cl</li>
          <li>${icon('ruler')}Ø ${p.top} mm</li>
          <li>${icon('ruler')}H ${p.height} mm</li>
          <li>${icon('box')}${fmt(p.perBox)} pcs / carton</li>
        </ul>
        <div data-hero-item style="--d:340">${specTable(p)}</div>
        <div class="product__actions">
          <a class="btn btn--accent btn--lg" href="${r}contact.html?format=${p.id}#devis">Demander un devis pour le ${p.label} ${icon('arrow-right')}</a>
          <a class="btn btn--outline btn--lg" href="${site.phone.href}">${icon('phone')} ${site.phone.short}</a>
        </div>
        <ul class="product__assurance" role="list">
          <li>${icon('palette')}Version personnalisée à partir de ${fmt(site.minOrder)} gobelets</li>
          <li>${icon('cup-hot')}Pensé pour les pauses café et les boissons froides</li>
          <li>${icon('layers')}Couvercle avec trou et agitateurs proposés en accessoires</li>
        </ul>
      </div>
    </div>
  </div>
</section>
<section class="section section--surface" aria-labelledby="compare-${p.id}">
  <div class="container">
    <header class="section-head section-head--split">
      <div>
        <p class="eyebrow">${icon('ruler', 'eyebrow__icon')}Dans la gamme</p>
        <h2 id="compare-${p.id}">Le ${p.label} parmi les quatre formats.</h2>
      </div>
      <p class="muted">Silhouettes à la même échelle. Sélectionnez un autre format pour ouvrir sa fiche.</p>
    </header>
    <div class="lineup-stage" data-reveal>${lineup(r, { current: p.id, scale: 2.4, uid: 'ld' })}</div>
  </div>
</section>
<section class="section section--kraft packaging" aria-labelledby="pack-${p.id}">
  <div class="container packaging__grid">
    <div class="packaging__visual" data-reveal>${carton(p, { scale: 0.48 })}</div>
    <div data-reveal style="--i:1">
      <p class="eyebrow">${icon('box', 'eyebrow__icon')}Conditionnement</p>
      <h2 id="pack-${p.id}">${fmt(p.perBox)} gobelets par carton.</h2>
      <dl class="packaging__facts">
        <div><dt>Pièces / carton</dt><dd>${fmt(p.perBox)}</dd></div>
        <div><dt>Carton</dt><dd>${p.carton.join(' × ')}</dd></div>
        <div><dt>Commande perso.</dt><dd>≥ ${fmt(site.minOrder)}</dd></div>
      </dl>
      <p class="footnote" style="margin-bottom:1.5rem">Dimensions du carton publiées sans unité par la source (millimètres probables, à confirmer).</p>
      ${estimator(r, { id: `est-${p.id}`, current: p.id, title: `Combien de cartons de ${p.label} ?` })}
    </div>
  </div>
</section>
<section class="section" aria-labelledby="others-${p.id}">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">${icon('layers', 'eyebrow__icon')}Autres formats</p>
      <h2 id="others-${p.id}">Comparer avec un autre gobelet.</h2>
    </header>
    <div class="formats__rail" role="region" aria-label="Autres formats" tabindex="0">
      <div class="formats__grid formats__grid--3">${others.map((q, i) => productCard(q, r, { i })).join('')}</div>
    </div>
  </div>
</section>
${ctaBand(r, { title: `Un projet en ${p.label} ?`, text: 'Quantité, personnalisation, conditionnement : appelez l’équipe PAPER CUP pour établir votre devis.' })}
<script type="application/json" id="pc-products">${productsJSON(r)}</script>`,
  };
}

export const productPages = products.map(productPage);
