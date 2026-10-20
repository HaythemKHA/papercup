/**
 * Gabarit commun : <head> SEO, en-tête, menu mobile, pied de page, barre d'appel mobile.
 * Chaque page fournit son contenu principal ; le build calcule `r` (préfixe relatif vers la racine du thème).
 */
import { site, fullAddress } from '../data/site.mjs';
import { products } from '../data/products.mjs';
import { defs, icon, cup } from '../lib/svg.mjs';

// Version des bundles dans les URL (?v=) : empreinte de leur contenu, fixée par build.mjs à chaque build,
// pour qu'un navigateur ne garde jamais en cache un ancien script face à un nouveau HTML.
let ASSET_VERSION = '1.1.0';
export const setAssetVersion = (v) => {
  ASSET_VERSION = v;
};

const NAV = [
  { href: 'personnalisation.html', label: 'Personnalisation' },
  { href: 'entreprise.html', label: "L'entreprise" },
  { href: 'faq.html', label: 'FAQ' },
  { href: 'contact.html', label: 'Contact' },
];

const abs = (path) => `${site.baseUrl}/${path === 'index.html' ? '' : path}`;

/* ------------------------------------------------------------------ JSON-LD */

const ORG_ID = `${site.baseUrl}/#organization`;
const SITE_ID = `${site.baseUrl}/#website`;

export const organization = () => ({
  '@type': 'Organization',
  '@id': ORG_ID,
  name: site.name,
  alternateName: site.alternateName,
  url: `${site.baseUrl}/`,
  description:
    'Fabricant tunisien de gobelets en carton standard et personnalisés, basé à Gabès, actif depuis 2008.',
  foundingDate: String(site.foundingYear),
  logo: `${site.baseUrl}/assets/images/brand/logo-papercup-512.png`,
  image: `${site.baseUrl}/assets/images/og-image.jpg`,
  telephone: site.phone.schema,
  faxNumber: site.fax.schema,
  email: site.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: `${site.address.street}, ${site.address.locality}`,
    postalCode: site.address.postalCode,
    addressLocality: site.address.city,
    addressCountry: site.address.countryCode,
  },
  contactPoint: [
    { '@type': 'ContactPoint', telephone: site.phone.schema, contactType: 'sales' },
    { '@type': 'ContactPoint', telephone: site.mobile.schema, contactType: 'sales' },
  ],
  sameAs: [site.facebook],
});

const website = () => ({
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: `${site.baseUrl}/`,
  name: site.name,
  inLanguage: 'fr',
  publisher: { '@id': ORG_ID },
});

const breadcrumbLD = (crumbs) => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.label,
    item: abs(c.href),
  })),
});

function jsonLD(page) {
  const graph = [];
  if (page.path === 'index.html') graph.push(organization(), website());
  graph.push({
    '@type': page.webPageType ?? 'WebPage',
    '@id': `${abs(page.path)}#webpage`,
    url: abs(page.path),
    name: page.title,
    description: page.description,
    inLanguage: 'fr',
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
  });
  if (page.breadcrumb) graph.push(breadcrumbLD(page.breadcrumb));
  if (page.schema) graph.push(...page.schema);
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

/* --------------------------------------------------------------------- Head */

function head(page, r) {
  const url = abs(page.path);
  const ogImage = `${site.baseUrl}/assets/images/og-image.jpg`;
  const robots = page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
<meta name="robots" content="${robots}">
${page.noindex ? '' : `<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#F5F0E8">
<meta name="format-detection" content="telephone=no">
<link rel="preload" href="${r}assets/fonts/sora-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${r}assets/css/theme.bundle.css?v=${ASSET_VERSION}">
<script>document.documentElement.classList.add('js')</script>
<script src="${r}assets/js/theme.bundle.js?v=${ASSET_VERSION}" defer></script>
<link rel="icon" href="${r}assets/images/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${r}assets/images/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${r}assets/images/apple-touch-icon.png">
<link rel="manifest" href="${r}site.webmanifest">
<meta property="og:type" content="${page.ogType ?? 'website'}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="${site.locale}">
<meta property="og:title" content="${page.ogTitle ?? page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Gobelets en carton PAPER CUP, du 4 au 12 oz, illustrés à l'échelle">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${page.ogTitle ?? page.title}">
<meta name="twitter:description" content="${page.description}">
<meta name="twitter:image" content="${ogImage}">
${jsonLD(page)}
${typeof page.extraHead === 'function' ? page.extraHead(r) : page.extraHead ?? ''}
</head>`;
}

/* ------------------------------------------------------------------- Header */

// Logo officiel PAPER CUP, vectorisé depuis les PNG du site source (voir ANALYSIS.md § Logo).
const brand = (r, extra = '') => {
  const light = extra.includes('light');
  return `<a class="brand${extra}" href="${r}index.html">
  <img class="brand__logo" src="${r}assets/images/brand/logo-papercup${light ? '-light' : ''}.svg" width="230" height="50" alt="PAPER CUP, fabrication de gobelets en carton — accueil">
</a>`;
};

function megaMenu(r, current) {
  const items = products
    .map(
      (p) => `<li><a class="mega__item${current === p.path ? ' is-current' : ''}" href="${r}${p.path}"${current === p.path ? ' aria-current="page"' : ''}>
        <span class="mega__cup">${cup(p, { scale: 0.62, set: products, finish: 'plain', uid: 'mm' })}</span>
        <span class="mega__text"><strong>${p.label}</strong><span>${p.cl} cl · ${p.height} mm</span></span>
      </a></li>`,
    )
    .join('');
  return `<div class="mega" id="mega-gobelets" data-mega-panel hidden>
    <div class="mega__inner">
      <div class="mega__intro">
        <p class="eyebrow">La gamme</p>
        <p class="mega__title">Quatre formats de gobelets en carton, standard ou personnalisés.</p>
        <a class="link-arrow" href="${r}produits.html">Voir toute la gamme ${icon('arrow-right')}</a>
        <a class="link-arrow" href="${r}produits.html#comparatif">Comparer les formats ${icon('arrow-right')}</a>
        <a class="link-arrow" href="${r}produits.html#accessoires">Couvercles &amp; agitateurs ${icon('arrow-right')}</a>
      </div>
      <ul class="mega__list" role="list">${items}</ul>
    </div>
  </div>`;
}

function header(page, r) {
  const cur = page.path;
  const inProducts = cur === 'produits.html' || cur.startsWith('produits/');
  const links = NAV.map(
    (n) =>
      `<li><a class="nav__link" href="${r}${n.href}"${cur === n.href ? ' aria-current="page"' : ''}>${n.label}</a></li>`,
  ).join('');
  return `<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header${page.headerTone === 'dark' ? ' site-header--on-dark' : ''}" data-header>
  <div class="container site-header__inner">
    ${brand(r)}
    <nav class="nav" aria-label="Navigation principale">
      <ul class="nav__list" role="list">
        <li class="nav__item--mega" data-mega>
          <button class="nav__link nav__trigger${inProducts ? ' is-active' : ''}" type="button" aria-expanded="false" aria-controls="mega-gobelets" data-mega-trigger>Gobelets ${icon('chevron-down', 'nav__chevron')}</button>
          ${megaMenu(r, cur)}
        </li>
        ${links}
      </ul>
    </nav>
    <div class="site-header__actions">
      <a class="header-phone" href="${site.phone.href}" aria-label="Appeler PAPER CUP au ${site.phone.display}">${icon('phone')}<span>${site.phone.short}</span></a>
      <a class="btn btn--accent btn--sm header-cta" href="${r}contact.html#devis">Demander un devis</a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu-mobile" data-menu-toggle>
        <span class="menu-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span>
        <span class="visually-hidden" data-menu-label>Ouvrir le menu</span>
      </button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="menu-mobile" data-menu hidden>
  <div class="mobile-menu__inner">
    <nav aria-label="Navigation mobile">
      <p class="mobile-menu__label">Gobelets</p>
      <ul class="mobile-menu__formats" role="list">
        ${products.map((p) => `<li><a href="${r}${p.path}"${cur === p.path ? ' aria-current="page"' : ''}><span class="mobile-menu__cup">${cup(p, { scale: 0.5, set: products, uid: 'mo' })}</span>${p.label}</a></li>`).join('')}
      </ul>
      <ul class="mobile-menu__links" role="list">
        <li><a href="${r}index.html"${cur === 'index.html' ? ' aria-current="page"' : ''}>Accueil</a></li>
        <li><a href="${r}produits.html"${cur === 'produits.html' ? ' aria-current="page"' : ''}>Toute la gamme</a></li>
        <li><a href="${r}produits.html#accessoires">Couvercles &amp; agitateurs</a></li>
        ${NAV.map((n) => `<li><a href="${r}${n.href}"${cur === n.href ? ' aria-current="page"' : ''}>${n.label}</a></li>`).join('')}
      </ul>
    </nav>
    <div class="mobile-menu__contact">
      <a class="btn btn--accent btn--lg btn--block" href="${r}contact.html#devis">Demander un devis ${icon('arrow-right')}</a>
      <a class="btn btn--outline btn--lg btn--block" href="${site.phone.href}">${icon('phone')} ${site.phone.display}</a>
      <a class="btn btn--ghost btn--block" href="mailto:${site.email}">${site.email}</a>
      <p class="mobile-menu__address">${icon('map-pin')} ${fullAddress}</p>
    </div>
  </div>
</div>`;
}

/* ------------------------------------------------------------------- Footer */

function footer(r) {
  return `<footer class="site-footer" data-footer>
  <div class="container">
    <div class="site-footer__top">
      <div class="site-footer__brand">
        ${brand(r, ' brand--light')}
        <p>Fabrication et personnalisation de gobelets en carton depuis ${site.foundingYear}, à Gabès.</p>
        <a class="social-link" href="${site.facebook}" rel="noopener" target="_blank">${icon('facebook')}<span>PAPER CUP sur Facebook<span class="visually-hidden"> (nouvel onglet)</span></span></a>
      </div>
      <nav class="site-footer__col" aria-label="Gobelets">
        <p class="site-footer__title">Gobelets</p>
        <ul role="list">
          ${products.map((p) => `<li><a href="${r}${p.path}">Gobelet carton ${p.label}</a></li>`).join('')}
          <li><a href="${r}produits.html#accessoires">Couvercles &amp; agitateurs</a></li>
          <li><a href="${r}produits.html#comparatif">Comparatif des formats</a></li>
        </ul>
      </nav>
      <nav class="site-footer__col" aria-label="Entreprise">
        <p class="site-footer__title">PAPER CUP</p>
        <ul role="list">
          <li><a href="${r}personnalisation.html">Gobelets personnalisés</a></li>
          <li><a href="${r}entreprise.html">L'entreprise</a></li>
          <li><a href="${r}faq.html">Questions fréquentes</a></li>
          <li><a href="${r}contact.html">Contact &amp; devis</a></li>
        </ul>
      </nav>
      <div class="site-footer__col site-footer__contact">
        <p class="site-footer__title">Contact</p>
        <a class="site-footer__phone" href="${site.phone.href}">${site.phone.display}</a>
        <a class="site-footer__line" href="${site.mobile.href}">${site.mobile.display}</a>
        <a class="site-footer__line" href="mailto:${site.email}">${site.email}</a>
        <address>${site.address.street}<br>${site.address.locality}, ${site.address.postalCode} ${site.address.city}<br>${site.address.country}</address>
        <a class="link-arrow link-arrow--light" href="${site.mapsUrl}" rel="noopener" target="_blank">Itinéraire ${icon('arrow-up-right')}<span class="visually-hidden"> (Google Maps, nouvel onglet)</span></a>
      </div>
    </div>
    <div class="site-footer__ruler ruler" aria-hidden="true"></div>
    <div class="site-footer__bottom">
      <p>© ${new Date('2026-10-19').getFullYear()} ${site.name} — Gobelets Tunisie</p>
      <p>Photos : réalisations et produits PAPER CUP. Plans cotés et aperçus : illustrations à l’échelle, non contractuelles.</p>
    </div>
  </div>
</footer>`;
}

function mobileBar(r) {
  // Masquée et inerte par défaut ; navigation.js l'active une fois le hero dépassé.
  return `<div class="mobile-bar" data-mobile-bar inert>
  <a class="mobile-bar__call" href="${site.phone.href}">${icon('phone')}<span>Appeler</span></a>
  <a class="mobile-bar__quote" href="${r}contact.html#devis">Demander un devis ${icon('arrow-right')}</a>
</div>`;
}

/* ------------------------------------------------------------------- Layout */

export function render(page, main, r) {
  return `${head(page, r)}
<body class="${page.bodyClass ?? ''}">
${defs()}
${header(page, r)}
<main id="contenu" tabindex="-1">
${main}
</main>
${footer(r)}
${mobileBar(r)}
</body>
</html>
`;
}

export const absUrl = abs;
