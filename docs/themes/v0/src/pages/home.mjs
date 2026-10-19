/** Accueil — page de référence de la direction artistique. */
import { site } from '../data/site.mjs';
import { products, productsJSON } from '../data/products.mjs';
import { icon, fmt } from '../lib/svg.mjs';
import { picture, preloadImage } from '../lib/media.mjs';
import {
  productCard, studio, steps, estimator, faqList, faqByTag, ctaBand, clientsBand, gallery,
} from '../partials/components.mjs';

const HERO_IMG = 'hero/gobelet-paper-cup';
const HERO_SIZES = '(min-width: 1280px) 440px, (min-width: 1024px) 34vw, 62vw';

const badge = `<div class="showcase__badge" aria-hidden="true">
  <svg viewBox="0 0 120 120"><defs><path id="badge-circle" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0"/></defs>
    <g class="showcase__badge-ring"><text font-size="9.6"><textPath href="#badge-circle" textLength="287" lengthAdjust="spacing">FABRICANT TUNISIEN · GABÈS · DEPUIS ${site.foundingYear} · </textPath></text></g>
  </svg>
  <span class="showcase__badge-core">${icon('register')}</span>
</div>`;

function hero(r) {
  return `<section class="hero" aria-labelledby="hero-title">
  <div class="container hero__grid">
    <div class="hero__content">
      <p class="eyebrow hero__eyebrow" data-hero-item style="--d:0">${icon('register', 'eyebrow__icon')}Fabricant tunisien · depuis ${site.foundingYear}</p>
      <h1 id="hero-title" class="hero__title">
        <span class="line" style="--l:0"><span>Gobelets en carton</span></span>
        <span class="line" style="--l:1"><span>à l’image de</span></span>
        <span class="line" style="--l:2"><span>votre <em>marque<svg class="swash" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d="M3 8.5C48 3 118 2.5 197 6.5" pathLength="1"/></svg></em>.</span></span>
      </h1>
      <p class="lead hero__lead" data-hero-item style="--d:380">PAPER CUP fabrique et personnalise des gobelets en carton pour vos pauses café et vos boissons fraîches : quatre formats, de 11,8 à 33&nbsp;cl, par un fabricant basé à Gabès depuis ${site.foundingYear}.</p>
      <div class="hero__actions" data-hero-item style="--d:480">
        <a class="btn btn--accent btn--lg" href="${r}contact.html#devis">Demander un devis ${icon('arrow-right')}</a>
        <a class="btn btn--outline btn--lg" href="${site.phone.href}">${icon('phone')} ${site.phone.short}</a>
      </div>
      <ul class="hero__proof" role="list" data-hero-item style="--d:580">
        <li>${icon('calendar')}Depuis ${site.foundingYear}</li>
        <li>${icon('layers')}Standard &amp; personnalisé</li>
        <li>${icon('box')}Personnalisation dès ${fmt(site.minOrder)} gobelets</li>
      </ul>
    </div>

    <div class="hero__visual" data-hero-item style="--d:150">
      <div class="showcase grain crop-marks">
        ${badge}
        <span class="showcase__halo" aria-hidden="true"></span>
        ${picture(HERO_IMG, { r, alt: 'Gobelet en carton PAPER CUP à décor noir et blanc, avec couvercle noir', priority: true, sizes: HERO_SIZES, className: 'showcase__cup', fallback: 720 })}
        <figure class="showcase__card showcase__card--a">
          ${picture('realisations/b-cafe', { r, alt: 'Gobelet personnalisé B Café', fallback: 480, sizes: '200px' })}
          <figcaption>Réalisation · B Café</figcaption>
        </figure>
        <figure class="showcase__card showcase__card--b">
          ${picture('realisations/galata-grill', { r, alt: 'Gobelet personnalisé Galata Grill', fallback: 420, sizes: '150px' })}
        </figure>
        <a class="showcase__chip" href="${r}produits.html">
          <span class="showcase__chip-label">4 formats</span>
          <span class="showcase__chip-value">11,8 · 19,2 · 25 · 33&nbsp;cl</span>
          ${icon('arrow-up-right', 'showcase__chip-icon')}
        </a>
      </div>
    </div>
  </div>
</section>`;
}

function ranges(r) {
  return `<section class="section ranges" aria-labelledby="ranges-title">
  <div class="container">
    <header class="section-head section-head--split">
      <div>
        <p class="eyebrow">${icon('layers', 'eyebrow__icon')}Deux gammes</p>
        <h2 id="ranges-title">Standard ou à&nbsp;vos couleurs.</h2>
      </div>
      <p>Un large choix de gobelets en carton personnalisables, jetables et recyclables, pour vos pauses café comme pour vos boissons fraîches.</p>
    </header>
    <div class="ranges__grid">
      <article class="range-card" data-reveal>
        <div class="range-card__visual range-card__visual--cutout">
          ${picture('editorial/gobelets-paper-cup-bleus', { r, alt: 'Deux gobelets en carton bleus à la marque PAPER CUP', fallback: 705, sizes: '(min-width: 900px) 34vw, 86vw' })}
        </div>
        <div class="range-card__body">
          <p class="range-card__kicker">01 — Standard</p>
          <h3>Gobelets en carton standard</h3>
          <p>Des gobelets en carton pour le service quotidien des boissons chaudes et froides, en 4, 6,5, 9 et 12&nbsp;oz. Formats et disponibilités sur demande.</p>
          <a class="link-arrow" href="${r}produits.html">Voir les formats ${icon('arrow-right')}</a>
        </div>
      </article>
      <article class="range-card range-card--dark" data-reveal style="--i:1">
        <div class="range-card__visual range-card__visual--photo">
          ${picture('editorial/gabarit-impression', { r, alt: 'Gabarit d’impression déroulé à côté du gobelet personnalisé fini', fallback: 800, sizes: '(min-width: 900px) 52vw, 92vw' })}
          <span class="range-card__tag">De la maquette au gobelet</span>
        </div>
        <div class="range-card__body">
          <p class="range-card__kicker">02 — Personnalisé</p>
          <h3>Gobelets personnalisés</h3>
          <p>Vos gobelets à votre image, à votre marque : PAPER CUP intervient dans la fabrication et la personnalisation de gobelets depuis ${site.foundingYear}, à partir de ${fmt(site.minOrder)} pièces.</p>
          <a class="link-arrow link-arrow--light" href="${r}personnalisation.html">Découvrir la personnalisation ${icon('arrow-right')}</a>
        </div>
      </article>
    </div>
  </div>
</section>`;
}

function formats(r) {
  return `<section class="section section--surface formats" id="formats" aria-labelledby="formats-title" data-dims-scope>
  <div class="container">
    <header class="section-head section-head--split">
      <div>
        <p class="eyebrow">${icon('ruler', 'eyebrow__icon')}La gamme</p>
        <h2 id="formats-title">Quatre formats, cotés au millimètre.</h2>
      </div>
      <div class="stack" style="--stack:1rem">
        <p class="muted">Contenance, dimensions et conditionnement publiés pour chaque modèle. Basculez en vue technique pour comparer les silhouettes à l’échelle.</p>
        <button class="toggle" type="button" aria-pressed="false" data-dims-toggle><span class="toggle__track" aria-hidden="true"><span class="toggle__thumb"></span></span>Vue technique</button>
      </div>
    </header>
    <div class="formats__rail" role="region" aria-label="Formats de gobelets" tabindex="0">
      <div class="formats__grid">${products.map((p, i) => productCard(p, r, { i })).join('')}</div>
    </div>
    <div class="formats__footer">
      <p>Couvercles avec trou et agitateurs disponibles. <a href="${r}produits.html#accessoires">Voir les accessoires</a></p>
      <a class="btn btn--outline" href="${r}produits.html#comparatif">Comparer tous les formats ${icon('arrow-right')}</a>
    </div>
  </div>
</section>`;
}

function personalize(r) {
  return `<section class="section section--dark personalize" aria-labelledby="perso-title">
  <div class="container personalize__grid">
    <div class="personalize__intro" data-reveal>
      <p class="eyebrow eyebrow--light">${icon('palette', 'eyebrow__icon')}Personnalisation</p>
      <h2 id="perso-title">Votre marque, dans la main de vos clients.</h2>
      <p class="lead">Les gobelets PAPER CUP personnalisés vous permettent de mettre votre marque chez vos clients, pour une plus grande visibilité de votre image de marque.</p>
      <ul class="checklist" role="list">
        <li>Quatre formats personnalisables : 4, 6,5, 9 et 12&nbsp;oz</li>
        <li>Commandes à partir de ${fmt(site.minOrder)} gobelets</li>
        <li>Devis par téléphone au ${site.phone.display}</li>
      </ul>
      <a class="link-arrow link-arrow--light" href="${r}personnalisation.html">Tout savoir sur la personnalisation ${icon('arrow-right')}</a>
    </div>
    <div data-reveal style="--i:1">${studio(r, { id: 'home-studio' })}</div>
  </div>
</section>`;
}

function work(r) {
  return `<section class="section work" aria-labelledby="work-title">
  <div class="container">
    <header class="section-head section-head--split">
      <div>
        <p class="eyebrow">${icon('layers', 'eyebrow__icon')}Réalisations</p>
        <h2 id="work-title">Des gobelets qui portent la marque de leurs clients.</h2>
      </div>
      <p>Cafés, boulangeries, restaurants : quelques gobelets personnalisés présentés sur le site PAPER CUP. Touchez une photo pour l’agrandir.</p>
    </header>
    ${gallery(r)}
  </div>
</section>`;
}

function why(r) {
  const facts = [
    [String(site.foundingYear), 'Depuis 2008', 'Fabrication et personnalisation de gobelets en carton, standard et personnalisés.'],
    ['4', 'Quatre formats', 'De 11,8 à 33 cl, avec cotes et conditionnement publiés pour chaque modèle.'],
    [fmt(site.minOrder), 'Seuil clair', 'Le minimum indiqué pour une commande de gobelets personnalisés.'],
    ['24', 'Marques', 'Présentées dans les références « Ils nous ont fait confiance ».'],
  ];
  return `<section class="section why" aria-labelledby="why-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">${icon('factory', 'eyebrow__icon')}Pourquoi choisir PAPER CUP</p>
      <h2 id="why-title">Un fabricant, des repères clairs.</h2>
    </header>
    <div class="why__layout">
      <figure class="why__photo" data-reveal="scale">
        ${picture('editorial/gobelet-bar', { r, alt: 'Gobelet PAPER CUP tenu à la main dans un café', fallback: 1100, sizes: '(min-width: 1024px) 40vw, 92vw' })}
        <figcaption>${icon('map-pin')}${site.address.street}, ${site.address.locality} — ${site.address.city}</figcaption>
      </figure>
      <div>
        <div class="why__grid">
          ${facts
            .map(
              ([fig, t, d], i) => `<div class="why__fact" data-reveal style="--i:${i}">
            <span class="why__figure" aria-hidden="true">${fig}${icon('register')}</span>
            <h3>${t}</h3>
            <p>${d}</p>
          </div>`,
            )
            .join('')}
        </div>
        <ul class="why__promises" role="list" data-reveal>
          <li>${icon('check')}Un service attentif à chaque client</li>
          <li>${icon('check')}L’engagement d’un service de qualité</li>
          <li>${icon('check')}Un large choix de formats et d’accessoires</li>
        </ul>
      </div>
    </div>
    <figure class="why__quote" data-reveal>
      <blockquote><p>Nous traitons vos commandes, minimum ${fmt(site.minOrder)} gobelets, au plus vite et à votre entière satisfaction.</p></blockquote>
      <figcaption><strong>PAPER CUP Tunisie</strong> — papercup.com.tn</figcaption>
    </figure>
  </div>
</section>`;
}

function order(r) {
  return `<section class="section section--tinted order" id="commander" aria-labelledby="order-title">
  <div class="container order__grid">
    <div>
      <header class="section-head">
        <p class="eyebrow">${icon('clipboard', 'eyebrow__icon')}Commander</p>
        <h2 id="order-title">Votre commande en quatre étapes.</h2>
        <p>Du choix du format jusqu’à l’appel : un parcours direct, sans compte ni paiement en ligne.</p>
      </header>
      ${steps(r)}
    </div>
    <div class="order__aside" data-reveal style="--i:1">${estimator(r, { id: 'home-est' })}</div>
  </div>
</section>`;
}

function faqSection(r) {
  return `<section class="section faq-section" aria-labelledby="faq-title">
  <div class="container faq-section__grid">
    <header class="section-head">
      <p class="eyebrow">${icon('info', 'eyebrow__icon')}Questions fréquentes</p>
      <h2 id="faq-title">Avant de commander.</h2>
      <p>Formats, minimum de commande, personnalisation et devis : l’essentiel en quelques réponses.</p>
      <a class="btn btn--outline" href="${r}faq.html">Toutes les questions ${icon('arrow-right')}</a>
    </header>
    ${faqList(faqByTag('home', r))}
  </div>
</section>`;
}

export const homePage = {
  path: 'index.html',
  title: 'Gobelets en carton personnalisés en Tunisie | PAPER CUP',
  ogTitle: 'PAPER CUP — Gobelets en carton standard et personnalisés, Gabès',
  description: `Fabricant tunisien depuis ${site.foundingYear}, PAPER CUP produit à Gabès des gobelets en carton standard et personnalisés, de 11,8 à 33 cl. Personnalisation dès ${fmt(site.minOrder)} gobelets.`,
  bodyClass: 'page-home',
  extraHead: (r) => preloadImage(r, HERO_IMG, HERO_SIZES),
  main: (r) => `${hero(r)}
${clientsBand(r)}
${ranges(r)}
${formats(r)}
${personalize(r)}
${work(r)}
${why(r)}
${order(r)}
${faqSection(r)}
${ctaBand(r)}
<script type="application/json" id="pc-products">${productsJSON(r)}</script>`,
};
