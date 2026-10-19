/**
 * Composants réutilisables (générés au build).
 * Chaque fonction reçoit `r`, le préfixe relatif vers la racine du thème.
 */
import { site } from '../data/site.mjs';
import { products, byId } from '../data/products.mjs';
import { faq } from '../data/faq.mjs';
import { clients, realisations } from '../data/references.mjs';
import { cup, cupWidth, icon, fmt } from '../lib/svg.mjs';
import { picture, mediaUrl } from '../lib/media.mjs';

const ozNum = (p) => String(p.oz).replace('.', ',');

/* -------------------------------------------------------------- Breadcrumb */

export function breadcrumb(crumbs, r) {
  const items = crumbs
    .map((c, i) =>
      i === crumbs.length - 1
        ? `<li><span aria-current="page">${c.label}</span></li>`
        : `<li><a href="${r}${c.href}">${c.label}</a></li>`,
    )
    .join('');
  return `<nav class="breadcrumb" aria-label="Fil d'Ariane"><ol role="list">${items}</ol></nav>`;
}

/* --------------------------------------------------------------- Page hero */

export function pageHero({ crumbs, eyebrow, title, lead, aside = '', r, id = 'page-title', modifier = '' }) {
  return `<section class="page-hero${modifier ? ' page-hero--' + modifier : ''}" aria-labelledby="${id}">
  <div class="container">
    ${crumbs ? breadcrumb(crumbs, r) : ''}
    <div class="page-hero__grid${aside ? '' : ' page-hero__grid--single'}">
      <div class="page-hero__content">
        ${eyebrow ? `<p class="eyebrow" data-hero-item>${icon('register', 'eyebrow__icon')}${eyebrow}</p>` : ''}
        <h1 id="${id}" class="page-hero__title" data-hero-item>${title}</h1>
        ${lead ? `<p class="lead" data-hero-item>${lead}</p>` : ''}
      </div>
      ${aside ? `<div class="page-hero__aside" data-hero-item>${aside}</div>` : ''}
    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------ Product card */

export function productCard(p, r, { level = 3, reveal = true, i = 0 } = {}) {
  return `<article class="product-card"${reveal ? ` data-reveal style="--i:${i}"` : ''}>
  <div class="product-card__media">
    ${picture(p.photo, { r, alt: p.photoAlt, className: 'product-card__photo', fallback: 480, sizes: '(min-width: 1100px) 300px, (min-width: 768px) 46vw, 80vw' })}
    <div class="product-card__tech" aria-hidden="true">
      <span class="product-card__oz">${ozNum(p)}</span>
      ${cup(p, { scale: 1.7, set: products, finish: 'line', dims: true, uid: `pc${i}` })}
    </div>
    <span class="product-card__badge">${p.cl} cl</span>
  </div>
  <div class="product-card__body">
    <p class="product-card__model">Modèle ${p.model}</p>
    <h${level} class="product-card__title"><a href="${r}${p.path}">Gobelet carton ${p.label}</a></h${level}>
    <dl class="spec-mini">
      <div><dt>Ø haut</dt><dd>${p.top} mm</dd></div>
      <div><dt>Hauteur</dt><dd>${p.height} mm</dd></div>
      <div><dt>Carton</dt><dd>${fmt(p.perBox)} pcs</dd></div>
    </dl>
    <span class="product-card__cta" aria-hidden="true">Fiche produit ${icon('arrow-right')}</span>
  </div>
</article>`;
}

export function accessoryCard(a, r, { i = 0 } = {}) {
  return `<article class="accessory-card" data-reveal style="--i:${i}">
  ${picture(a.photo, { r, alt: a.photoAlt, className: 'accessory-card__photo', fallback: 800, sizes: '(min-width: 1024px) 560px, 92vw' })}
  <div class="accessory-card__body">
    <p class="eyebrow">${icon('layers', 'eyebrow__icon')}Accessoire</p>
    <h3>${a.name}</h3>
    <p>${a.text}</p>
    <a class="link-arrow" href="${r}contact.html#devis">Demander un devis ${icon('arrow-right')}</a>
  </div>
</article>`;
}

/* ----------------------------------------------------- Références clients */

export function clientsBand(r, { title = 'Ils nous ont fait confiance', tone = '' } = {}) {
  const item = (c, hidden) =>
    `<li class="marquee__item">${picture(c.key, { r, alt: hidden ? '' : c.name, fallback: 320, sizes: '160px' })}</li>`;
  return `<section class="clients${tone ? ' clients--' + tone : ''}" aria-labelledby="clients-title">
  <div class="container clients__head">
    <h2 id="clients-title" class="clients__title">${icon('register', 'eyebrow__icon')}${title}</h2>
    <p class="clients__meta">${clients.length} marques présentées sur le site PAPER CUP</p>
    <button class="clients__toggle" type="button" aria-pressed="false" data-marquee-toggle>${icon('minus', 'clients__pause')}<span data-marquee-label>Mettre en pause</span></button>
  </div>
  <div class="marquee" data-marquee>
    <ul class="marquee__track" role="list">${clients.map((c) => item(c, false)).join('')}</ul>
    <ul class="marquee__track marquee__track--clone" role="list" aria-hidden="true">${clients.map((c) => item(c, true)).join('')}</ul>
  </div>
</section>`;
}

/* --------------------------------------------------- Galerie de réalisations */

export function gallery(r, { items = realisations, label = 'Réalisations PAPER CUP' } = {}) {
  return `<div class="bento" data-lightbox>
  ${items
    .map(
      (g, i) => `<figure class="bento__item bento__item--${g.shape}" data-reveal style="--i:${i % 3}">
    <button class="bento__btn" type="button" data-lightbox-open="${i}" data-full="${mediaUrl(r, g.key, 1200)}" data-full-avif="${mediaUrl(r, g.key, 1200, 'avif')}">
      ${picture(g.key, { r, alt: g.alt, fallback: 480, sizes: g.shape === 'wide' ? '(min-width: 1024px) 50vw, 92vw' : '(min-width: 1024px) 25vw, 46vw' })}
      <span class="bento__zoom" aria-hidden="true">${icon('plus')}</span>
      <span class="visually-hidden">Agrandir la photo</span>
    </button>
    <figcaption class="bento__caption">${g.title}</figcaption>
  </figure>`,
    )
    .join('')}
</div>
<dialog class="lightbox" data-lightbox-dialog aria-label="${label}">
  <div class="lightbox__inner">
    <figure class="lightbox__figure">
      <picture><source type="image/avif" data-lightbox-source><img data-lightbox-img src="${mediaUrl(r, items[0].key, 1200)}" alt="" width="1200" height="800" loading="lazy" decoding="async"></picture>
      <figcaption class="lightbox__caption"><span data-lightbox-caption></span><span class="lightbox__count" data-lightbox-count></span></figcaption>
    </figure>
    <button class="lightbox__btn lightbox__btn--prev" type="button" data-lightbox-prev aria-label="Photo précédente">${icon('arrow-right')}</button>
    <button class="lightbox__btn lightbox__btn--next" type="button" data-lightbox-next aria-label="Photo suivante">${icon('arrow-right')}</button>
    <button class="lightbox__btn lightbox__close" type="button" data-lightbox-close aria-label="Fermer">${icon('close')}</button>
  </div>
</dialog>`;
}

/* ------------------------------------------------------------------ Lineup */

export function lineup(r, { current, scale = 2, dims = false, finish = 'plain', link = true, uid = 'lu' } = {}) {
  const items = products
    .map((p) => {
      const isCur = current === p.id;
      const inner = `${cup(p, { scale, set: products, finish: isCur && finish === 'plain' ? 'band' : finish, dims, uid })}
        <span class="lineup__label"><strong><span class="visually-hidden">Gobelet carton </span>${p.label}</strong> <span>${p.height} mm<span class="visually-hidden"> de hauteur</span></span></span>`;
      const el = link && !isCur
        ? `<a href="${r}${p.path}">${inner}</a>`
        : `<div${isCur ? ' aria-current="true"' : ''}>${inner}</div>`;
      return `<li class="lineup__item${isCur ? ' is-current' : ''}" style="--grow:${cupWidth(p, { scale, dims })}">${el}</li>`;
    })
    .join('');
  return `<ul class="lineup${current ? ' lineup--has-current' : ''}" role="list">${items}</ul>`;
}

/* -------------------------------------------------------------- Estimator */

export function estimator(r, { id = 'est', current = '12oz', title = 'Combien de cartons ?' } = {}) {
  const p = byId[current];
  const qty = site.minOrder;
  const cartons = Math.ceil(qty / p.perBox);
  return `<div class="estimator" data-estimator data-href="${r}contact.html">
  <div class="estimator__head">
    <p class="eyebrow eyebrow--light">${icon('box', 'eyebrow__icon')}Estimateur de conditionnement</p>
    <h3 class="estimator__title">${title}</h3>
  </div>
  <fieldset class="field">
    <legend class="field__label">Format</legend>
    <div class="seg">
      ${products.map((q) => `<label class="seg__opt"><input type="radio" name="${id}-format" value="${q.id}"${q.id === current ? ' checked' : ''}><span>${q.label}</span></label>`).join('')}
    </div>
  </fieldset>
  <div class="field">
    <label class="field__label" for="${id}-qty">Nombre de gobelets</label>
    <div class="stepper">
      <button class="stepper__btn" type="button" data-step="-1000" aria-label="Retirer 1 000 gobelets">${icon('minus')}</button>
      <input class="stepper__input" id="${id}-qty" type="number" inputmode="numeric" min="1000" max="10000000" step="1000" value="${qty}" data-qty aria-describedby="${id}-qty-hint">
      <button class="stepper__btn" type="button" data-step="1000" aria-label="Ajouter 1 000 gobelets">${icon('plus')}</button>
    </div>
    <div class="chips" role="group" aria-label="Quantités rapides">
      ${[5000, 10000, 25000, 50000].map((v) => `<button class="chip" type="button" data-preset="${v}">${fmt(v)}</button>`).join('')}
    </div>
    <p class="field__hint" id="${id}-qty-hint" data-qty-hint>Commandes personnalisées : minimum ${fmt(site.minOrder)} gobelets.</p>
  </div>
  <output class="estimator__result" for="${id}-qty" aria-live="polite">
    <span class="estimator__big"><span data-est-cartons>${cartons}</span> <span data-est-unit>${cartons > 1 ? 'cartons' : 'carton'}</span></span>
    <span class="estimator__detail" data-est-detail>de ${fmt(p.perBox)} gobelets ${p.label} · carton ${p.carton.join(' × ')}</span>
  </output>
  <p class="estimator__note">Estimation indicative, arrondie au carton supérieur, d'après le conditionnement publié. Quantités et conditions à confirmer avec PAPER CUP.</p>
  <div class="estimator__actions">
    <a class="btn btn--accent" href="${r}contact.html?format=${current}&amp;qte=${qty}#devis" data-est-link>Continuer ma demande ${icon('arrow-right')}</a>
    <a class="btn btn--outline-light" href="${site.phone.href}">${icon('phone')} Appeler</a>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ Studio */

const INKS = [
  { id: 'vermillon', label: 'Vermillon', value: '#CC3D14' },
  { id: 'encre', label: 'Encre', value: '#1C1A17' },
  { id: 'terre', label: 'Terre', value: '#8A5A2B' },
  { id: 'olive', label: 'Olive', value: '#55683A' },
  { id: 'indigo', label: 'Indigo', value: '#2C4A7A' },
];

export function studio(r, { id = 'studio', current = '12oz', headingLevel = 3 } = {}) {
  const cups = products
    .map(
      (p) =>
        `<div class="studio__cup${p.id === current ? ' is-active' : ''}" data-studio-cup="${p.id}">${cup(p, { scale: 3.2, set: products, finish: 'brand', live: true, fixedWidth: true, uid: id })}</div>`,
    )
    .join('');
  return `<div class="studio" data-studio data-href="${r}contact.html" style="--print:${INKS[0].value}">
  <div class="studio__preview" aria-hidden="true">
    <div class="studio__stage crop-marks">
      <span class="studio__tag">Aperçu illustratif</span>
      <div class="studio__cups">${cups}</div>
      <span class="studio__format" data-studio-label>${byId[current].label}</span>
    </div>
  </div>
  <div class="studio__controls">
    <h${headingLevel} class="studio__title">Essayez votre marque</h${headingLevel}>
    <div class="field">
      <label class="field__label" for="${id}-name">Nom de votre marque</label>
      <input class="input input--dark" id="${id}-name" type="text" maxlength="18" autocomplete="organization" placeholder="VOTRE MARQUE" data-studio-name>
    </div>
    <fieldset class="field">
      <legend class="field__label">Teinte d'aperçu</legend>
      <div class="swatches">
        ${INKS.map((k, i) => `<label class="swatch" style="--sw:${k.value}"><input type="radio" name="${id}-ink" value="${k.value}"${i === 0 ? ' checked' : ''}><span class="swatch__dot"></span><span class="visually-hidden">${k.label}</span></label>`).join('')}
      </div>
    </fieldset>
    <fieldset class="field">
      <legend class="field__label">Format</legend>
      <div class="seg seg--dark">
        ${products.map((p) => `<label class="seg__opt"><input type="radio" name="${id}-format" value="${p.id}"${p.id === current ? ' checked' : ''}><span>${p.label}</span></label>`).join('')}
      </div>
    </fieldset>
    <a class="btn btn--accent btn--lg" href="${r}contact.html?type=personnalise&amp;format=${current}#devis" data-studio-cta>Préparer ma demande ${icon('arrow-right')}</a>
    <p class="studio__note">${icon('info')}<span>Aperçu non contractuel. Couleurs, surfaces et techniques d'impression sont à valider avec PAPER CUP.</span></p>
  </div>
</div>`;
}

/* ------------------------------------------------------------------- Steps */

export function steps(r) {
  const list = [
    ['Choisissez votre format', `4, 6,5, 9 ou 12 oz : comparez les cotes et le conditionnement de chaque modèle.`, 'ruler', `<a href="${r}produits.html#comparatif">Comparer les formats</a>`],
    ['Fixez la quantité', `Les commandes de gobelets personnalisés démarrent à ${fmt(site.minOrder)} pièces.`, 'box', ''],
    ['Préparez votre visuel', `Pour un gobelet à votre image, rassemblez votre logo et vos couleurs.`, 'palette', `<a href="${r}personnalisation.html">Voir la personnalisation</a>`],
    ['Contactez PAPER CUP', `Appelez le <a href="${site.phone.href}">${site.phone.display}</a> pour établir votre devis.`, 'phone', ''],
  ];
  return `<ol class="steps" role="list" data-steps>
  ${list
    .map(
      ([t, d, ic, more], i) => `<li class="step" data-reveal style="--i:${i}">
    <span class="step__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
    <div class="step__body">
      <h3 class="step__title">${icon(ic, 'step__icon')}${t}</h3>
      <p>${d}</p>
      ${more ? `<p class="step__more">${more}</p>` : ''}
    </div>
  </li>`,
    )
    .join('')}
</ol>`;
}

/* --------------------------------------------------------------------- FAQ */

export function faqList(items, { level = 3 } = {}) {
  return `<div class="faq" data-accordion>
  ${items
    .map(
      (f) => `<details class="faq__item" id="faq-${f.id}">
    <summary class="faq__summary"><h${level} class="faq__q">${f.q}</h${level}><span class="faq__icon" aria-hidden="true"></span></summary>
    <div class="faq__a"><div class="faq__a-inner">${f.a}</div></div>
  </details>`,
    )
    .join('')}
</div>`;
}

export const faqByTag = (tag, r) => faq(r).filter((f) => f.tags.includes(tag));

/* ---------------------------------------------------------------- CTA band */

export function ctaBand(r, { eyebrow = 'Un projet de gobelets ?', title = 'Parlons de vos gobelets.', text = 'Format, quantité, personnalisation : appelez l’équipe PAPER CUP pour établir votre devis.' } = {}) {
  return `<section class="cta-band" aria-labelledby="cta-title" data-cta-final>
  <div class="container cta-band__inner">
    <div class="cta-band__content" data-reveal>
      <p class="eyebrow eyebrow--light">${icon('register', 'eyebrow__icon')}${eyebrow}</p>
      <h2 id="cta-title" class="cta-band__title">${title}</h2>
      <p class="cta-band__text">${text}</p>
    </div>
    <div class="cta-band__actions" data-reveal style="--i:1">
      <a class="cta-band__phone" href="${site.phone.href}">
        <span class="cta-band__phone-label">${icon('phone')} Appelez-nous</span>
        <span class="cta-band__phone-num">${site.phone.display}</span>
      </a>
      <a class="btn btn--ink btn--lg" href="${r}contact.html#devis">Demander un devis ${icon('arrow-right')}</a>
    </div>
  </div>
  <div class="cta-band__ruler ruler ruler--light" aria-hidden="true"></div>
</section>`;
}

/* ------------------------------------------------------------- Spec table */

export function specTable(p) {
  const rows = [
    ['Capacité', `${p.label} · ${p.cl} cl`],
    ['Référence', p.model],
    ['Diamètre haut', `${p.top} mm`],
    ['Diamètre fond', `${p.bottom} mm`],
    ['Hauteur', `${p.height} mm`],
    ['Conditionnement', `${fmt(p.perBox)} pièces par carton`],
    ['Dimensions du carton', `${p.carton.join(' × ')} <span class="muted">(unité non précisée par la source)</span>`],
    ['Personnalisation', `Oui, à partir de ${fmt(site.minOrder)} gobelets`],
    ['Accessoires', 'Couvercle avec trou, agitateurs'],
  ];
  return `<table class="spec-table">
  <caption class="visually-hidden">Caractéristiques du gobelet en carton ${p.label}</caption>
  <tbody>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('')}</tbody>
</table>`;
}

export { ozNum, INKS };
