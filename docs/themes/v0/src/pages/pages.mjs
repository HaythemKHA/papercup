/** Pages éditoriales : personnalisation, entreprise, FAQ, contact, 404. */
import { site, fullAddress } from '../data/site.mjs';
import { products, byId, productsJSON } from '../data/products.mjs';
import { faq, faqGroups, plain } from '../data/faq.mjs';
import { cup, icon, fmt } from '../lib/svg.mjs';
import { picture } from '../lib/media.mjs';
import { pageHero, studio, faqList, faqByTag, ctaBand, lineup, gallery, clientsBand } from '../partials/components.mjs';

const home = { label: 'Accueil', href: 'index.html' };

/* ======================================================= Personnalisation */

export const customPage = {
  path: 'personnalisation.html',
  title: 'Gobelets en carton personnalisés avec votre logo | PAPER CUP',
  description: `Faites fabriquer vos gobelets en carton à l’image de votre marque : 4, 6,5, 9 ou 12 oz, à partir de ${fmt(site.minOrder)} gobelets. PAPER CUP, fabricant à Gabès depuis ${site.foundingYear}.`,
  breadcrumb: [home, { label: 'Personnalisation', href: 'personnalisation.html' }],
  main: (r) => `${pageHero({
    r,
    crumbs: customPage.breadcrumb,
    eyebrow: 'Gobelets personnalisés',
    title: 'Des gobelets en carton à l’image de votre marque',
    lead: `Votre logo et vos couleurs sur des gobelets en 4, 6,5, 9 ou 12&nbsp;oz. Depuis ${site.foundingYear}, PAPER CUP fabrique des gobelets spéciaux à la marque de ses clients, à partir de ${fmt(site.minOrder)} pièces.`,
    aside: `<a class="btn btn--accent btn--lg" href="${r}contact.html?type=personnalise#devis">Préparer ma demande ${icon('arrow-right')}</a><a class="btn btn--outline btn--lg" href="${site.phone.href}">${icon('phone')} ${site.phone.display}</a>`,
  })}
<section class="section section--dark" aria-labelledby="studio-title" style="padding-top:clamp(3rem,2rem + 4vw,6rem)">
  <div class="container">
    <header class="section-head section-head--split">
      <div>
        <p class="eyebrow eyebrow--light">${icon('palette', 'eyebrow__icon')}Atelier d’aperçu</p>
        <h2 id="studio-title">Visualisez votre gobelet.</h2>
      </div>
      <p>Saisissez le nom de votre marque, choisissez une teinte et un format : l’aperçu se met à jour instantanément, puis transmettez votre choix dans votre demande de devis.</p>
    </header>
    ${studio(r, { id: 'perso-studio', current: '9oz' })}
  </div>
</section>
<section class="section" aria-labelledby="essentials-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">${icon('register', 'eyebrow__icon')}L’essentiel</p>
      <h2 id="essentials-title">Ce qu’il faut savoir.</h2>
    </header>
    <div class="feature-grid feature-grid--3">
      <article class="feature" data-reveal>
        <span class="feature__figure">4</span>
        <h3>Formats personnalisables</h3>
        <p>4, 6,5, 9 et 12&nbsp;oz : les quatre modèles de la gamme existent en version personnalisée. <a href="${r}produits.html#comparatif">Comparer les formats</a></p>
      </article>
      <article class="feature" data-reveal style="--i:1">
        <span class="feature__figure">${fmt(site.minOrder)}</span>
        <h3>Gobelets minimum</h3>
        <p>Les commandes de gobelets personnalisés sont traitées à partir de ${fmt(site.minOrder)} pièces.</p>
      </article>
      <article class="feature" data-reveal style="--i:2">
        <span class="feature__figure">${site.foundingYear}</span>
        <h3>Depuis ${site.foundingYear}</h3>
        <p>PAPER CUP fabrique des gobelets et des gobelets spéciaux à la marque de ses clients depuis ${site.foundingYear}.</p>
      </article>
    </div>
  </div>
</section>
<section class="section section--surface" aria-labelledby="visibility-title">
  <div class="container split">
    <figure class="photo-frame" data-reveal="scale">
      ${picture('editorial/gabarit-impression', { r, alt: 'Gabarit d’impression déroulé à côté du gobelet personnalisé fini', fallback: 800, sizes: '(min-width: 768px) 46vw, 92vw' })}
      <figcaption>Le décor est imprimé à plat, puis mis en forme en gobelet.</figcaption>
    </figure>
    <div data-reveal style="--i:1">
      <p class="eyebrow">${icon('layers', 'eyebrow__icon')}Visibilité</p>
      <h2 id="visibility-title">Une carte de visite ambulante.</h2>
      <p class="lead" style="margin-top:1rem">Avec vos gobelets personnalisés, vous véhiculez votre image de marque chez vos clients et vos messages publicitaires atteignent efficacement votre cible.</p>
      <p style="margin-top:1rem" class="muted">Les gobelets à emporter peuvent servir de support publicitaire, même de carte de visite ambulante, sans coût additionnel.</p>
    </div>
  </div>
</section>
<section class="section work" aria-labelledby="perso-work-title">
  <div class="container">
    <header class="section-head section-head--split">
      <div>
        <p class="eyebrow">${icon('layers', 'eyebrow__icon')}Réalisations</p>
        <h2 id="perso-work-title">Ils ont mis leur marque sur nos gobelets.</h2>
      </div>
      <p>Quelques gobelets personnalisés présentés sur le site PAPER CUP. Touchez une photo pour l’agrandir.</p>
    </header>
    ${gallery(r)}
  </div>
</section>
<section class="section" aria-labelledby="prep-title">
  <div class="container split" style="align-items:start">
    <header class="section-head" style="margin-bottom:0">
      <p class="eyebrow">${icon('clipboard', 'eyebrow__icon')}Préparer votre projet</p>
      <h2 id="prep-title">Quatre informations pour un devis.</h2>
      <p>Rassemblez-les avant d’appeler : le formulaire de contact vous aide à les mettre en forme.</p>
      <a class="btn btn--accent" href="${r}contact.html?type=personnalise#devis" style="justify-self:start">Préparer ma demande ${icon('arrow-right')}</a>
    </header>
    <ol class="prep-list" role="list">
      <li data-reveal><div><h3>Votre visuel</h3><p>Votre logo et vos couleurs de marque.</p></div></li>
      <li data-reveal style="--i:1"><div><h3>Le format</h3><p>4, 6,5, 9 ou 12&nbsp;oz, selon les boissons que vous servez.</p></div></li>
      <li data-reveal style="--i:2"><div><h3>La quantité</h3><p>À partir de ${fmt(site.minOrder)} gobelets pour une commande personnalisée.</p></div></li>
      <li data-reveal style="--i:3"><div><h3>Vos coordonnées</h3><p>Société, contact et ville, pour que l’équipe puisse établir votre devis.</p></div></li>
    </ol>
  </div>
</section>
<section class="section section--tinted" aria-labelledby="perso-faq-title">
  <div class="container faq-section__grid">
    <header class="section-head">
      <p class="eyebrow">${icon('info', 'eyebrow__icon')}Questions fréquentes</p>
      <h2 id="perso-faq-title">Personnalisation : vos questions.</h2>
      <a class="btn btn--outline" href="${r}faq.html">Toutes les questions ${icon('arrow-right')}</a>
    </header>
    ${faqList(faqByTag('perso', r))}
  </div>
</section>
${ctaBand(r, { title: 'Votre marque sur nos gobelets.', text: `Format, quantité, visuel : appelez l’équipe PAPER CUP au ${site.phone.display} pour établir votre devis.` })}
<script type="application/json" id="pc-products">${productsJSON(r)}</script>`,
};

/* ============================================================== Entreprise */

export const aboutPage = {
  path: 'entreprise.html',
  title: `PAPER CUP, fabricant de gobelets en carton à Gabès depuis ${site.foundingYear}`,
  description: `Basé à Teboulbou (Gabès), PAPER CUP fabrique et personnalise des gobelets en carton depuis ${site.foundingYear}. Repères, salons professionnels et références clients.`,
  webPageType: 'AboutPage',
  breadcrumb: [home, { label: "L'entreprise", href: 'entreprise.html' }],
  main: (r) => `${pageHero({
    r,
    crumbs: aboutPage.breadcrumb,
    eyebrow: 'L’entreprise',
    title: 'PAPER CUP, fabricant tunisien de gobelets en carton',
    lead: `Depuis ${site.foundingYear}, PAPER CUP intervient dans le domaine de la fabrication du gobelet en carton, standard et personnalisé. Sa vision : « être toujours au sommet ».`,
  })}
<section class="section" aria-labelledby="facts-title" style="padding-top:0">
  <div class="container about__grid">
    <div class="year-mark grain" data-reveal>
      <p class="year-mark__label">Depuis</p>
      <span class="year-mark__year">${site.foundingYear}</span>
      <p>PAPER CUP se présente comme une entreprise leader en Tunisie dans la fabrication de gobelets en carton, une réputation bâtie sur son savoir-faire et sa fiabilité.</p>
      ${picture('editorial/gobelets-paper-cup-bleus', { r, alt: 'Deux gobelets en carton bleus à la marque PAPER CUP', fallback: 705, sizes: '(min-width: 1024px) 40vw, 80vw', className: 'year-mark__photo' })}
    </div>
    <div data-reveal style="--i:1">
      <h2 id="facts-title" class="visually-hidden">PAPER CUP en bref</h2>
      <p class="eyebrow">${icon('factory', 'eyebrow__icon')}En bref</p>
      <dl class="fiche">
        <div><dt>Activité</dt><dd>Fabrication et personnalisation de gobelets en carton</dd></div>
        <div><dt>Depuis</dt><dd>${site.foundingYear}</dd></div>
        <div><dt>Siège</dt><dd>${site.address.street}, ${site.address.locality}, ${site.address.postalCode} ${site.address.city}</dd></div>
        <div><dt>Produits</dt><dd>Gobelets 4 · 6,5 · 9 · 12&nbsp;oz, couvercles, agitateurs</dd></div>
        <div><dt>Personnalisation</dt><dd>À partir de ${fmt(site.minOrder)} gobelets</dd></div>
        <div><dt>Téléphone</dt><dd><a href="${site.phone.href}">${site.phone.display}</a> · <a href="${site.mobile.href}">${site.mobile.display}</a></dd></div>
        <div><dt>E-mail</dt><dd><a href="mailto:${site.email}">${site.email}</a></dd></div>
      </dl>
      <div class="mission">
        <h3>Notre mission</h3>
        <p>Offrir à nos clients un réel succès, en leur fournissant des produits de qualité supérieure et un service exceptionnel. PAPER CUP s’engage dans la personnalisation des gobelets en carton avec différentes gammes.</p>
      </div>
    </div>
  </div>
</section>
<section class="section section--tinted" id="salons" aria-labelledby="timeline-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">${icon('calendar', 'eyebrow__icon')}Repères &amp; salons</p>
      <h2 id="timeline-title">Une présence sur le terrain.</h2>
      <p>PAPER CUP a exposé à la ${site.fairs[0].name}, à ${site.fairs[0].city}, en 2016 et en 2017.</p>
    </header>
    <ol class="timeline" role="list">
      <li class="timeline__item" data-reveal>
        <span class="timeline__year">${site.foundingYear}</span>
        <div class="timeline__body"><h3>Début de l’activité</h3><p>Fabrication de gobelets en carton, standard et personnalisés, depuis Gabès.</p></div>
      </li>
      <li class="timeline__item" data-reveal style="--i:1">
        <span class="timeline__year">2016</span>
        <div class="timeline__body"><h3>${site.fairs[1].name}</h3><p>${site.fairs[1].city}</p>
          <div class="timeline__photos">${picture('salons/sousse-2016-1', { r, alt: 'Stand PAPER CUP à la Foire internationale de l’hôtellerie, Sousse 2016', fallback: 400, sizes: '(min-width: 768px) 260px, 70vw' })}</div>
        </div>
      </li>
      <li class="timeline__item" data-reveal style="--i:2">
        <span class="timeline__year">2017</span>
        <div class="timeline__body"><h3>${site.fairs[0].name}</h3><p>${site.fairs[0].city}</p>
          <div class="timeline__photos">
            ${['sousse-2017-1', 'sousse-2017-4', 'sousse-2017-2'].map((k) => picture(`salons/${k}`, { r, alt: 'Stand PAPER CUP à la Foire internationale de l’hôtellerie, Sousse 2017', fallback: 500, sizes: '(min-width: 768px) 260px, 70vw' })).join('')}
          </div>
        </div>
      </li>
      <li class="timeline__item" data-reveal style="--i:3">
        <span class="timeline__year">Aujourd’hui</span>
        <div class="timeline__body"><h3>Quatre formats et des accessoires</h3><p>Gobelets de 11,8 à 33&nbsp;cl, couvercles et agitateurs, pour une clientèle de cafés, d’hôtels, de restaurants et de boulangeries.</p></div>
      </li>
    </ol>
  </div>
</section>
${clientsBand(r)}
<section class="section section--surface" aria-labelledby="range-title">
  <div class="container">
    <header class="section-head section-head--split">
      <div>
        <p class="eyebrow">${icon('layers', 'eyebrow__icon')}Ce que nous fabriquons</p>
        <h2 id="range-title">Des gobelets en carton, de 11,8 à 33&nbsp;cl.</h2>
      </div>
      <p class="muted">Pour les pauses café comme pour les boissons froides, en version standard ou à la marque de nos clients.</p>
    </header>
    <div class="lineup-stage" data-reveal>${lineup(r, { scale: 2.4, uid: 'la' })}</div>
    <p style="margin-top:1.5rem"><a class="link-arrow" href="${r}produits.html">Voir la gamme complète ${icon('arrow-right')}</a></p>
  </div>
</section>
<section class="section" aria-labelledby="where-title">
  <div class="container split">
    <div data-reveal>
      <p class="eyebrow">${icon('map-pin', 'eyebrow__icon')}Où nous trouver</p>
      <h2 id="where-title">À Teboulbou, sur la route de Medenine.</h2>
      <p class="lead" style="margin-top:1rem">Le siège de PAPER CUP se situe au kilomètre 5 de la route de Medenine, à Teboulbou, dans le gouvernorat de Gabès.</p>
    </div>
    <div class="location-card crop-marks" data-reveal style="--i:1">
      <p class="eyebrow" style="margin:0">${icon('register', 'eyebrow__icon')}Adresse</p>
      <address class="location-card__address">${site.address.street}<br>${site.address.locality}, ${site.address.postalCode} ${site.address.city}<br>${site.address.country}</address>
      <div class="location-card__actions">
        <a class="btn btn--primary" href="${site.mapsUrl}" rel="noopener" target="_blank">Itinéraire ${icon('arrow-up-right')}<span class="visually-hidden"> (Google Maps, nouvel onglet)</span></a>
        <a class="btn btn--outline" href="${site.phone.href}">${icon('phone')} ${site.phone.short}</a>
      </div>
    </div>
  </div>
</section>
${ctaBand(r)}`,
};

/* ===================================================================== FAQ */

export const faqPage = {
  path: 'faq.html',
  title: 'Questions fréquentes sur nos gobelets en carton | PAPER CUP',
  description: `Formats, dimensions, conditionnement, personnalisation, minimum de commande et devis : les réponses de PAPER CUP, fabricant de gobelets en carton à Gabès.`,
  breadcrumb: [home, { label: 'FAQ', href: 'faq.html' }],
  schema: [
    {
      '@type': 'FAQPage',
      mainEntity: faq('').map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: plain(f.a) },
      })),
    },
  ],
  main: (r) => {
    const all = faq(r);
    return `${pageHero({
      r,
      crumbs: faqPage.breadcrumb,
      eyebrow: 'Questions fréquentes',
      title: 'Tout savoir avant de commander vos gobelets',
      lead: `Les réponses ci-dessous reprennent les informations publiées par PAPER CUP. Pour toute autre question, appelez PAPER CUP au ${site.phone.display}.`,
      aside: `<a class="contact-card contact-card--primary" href="${site.phone.href}"><span class="contact-card__icon">${icon('phone')}</span><span class="contact-card__label">Une autre question ?</span><span class="contact-card__value">${site.phone.display}</span></a>`,
    })}
<section class="section" style="padding-top:0" aria-label="Réponses">
  <div class="container container--narrow">
    ${faqGroups
      .map(
        (g, i) => `<div class="faq-group" id="${g.id}">
      <h2 class="faq-group__title"><span>${String(i + 1).padStart(2, '0')}</span>${g.title}</h2>
      ${faqList(all.filter((f) => f.group === g.id))}
    </div>`,
      )
      .join('')}
  </div>
</section>
${ctaBand(r)}`;
  },
};

/* ================================================================= Contact */

const formatCards = () =>
  products
    .map(
      (p, i) => `<label class="radio-card format-card"><input type="radio" name="format" value="${p.id}" id="f-format-${p.id}"${p.id === '12oz' ? ' checked' : ''}${i === 0 ? ' required' : ''} aria-describedby="err-format"><span class="radio-card__body"><span class="format-card__cup" aria-hidden="true">${cup(p, { scale: 0.62, set: products, uid: 'fc' })}</span><strong>${p.label}</strong><span>${p.cl} cl</span></span></label>`,
    )
    .join('');

const errorSlot = (id) => `<p class="field__error" id="${id}" hidden>${icon('alert')}<span></span></p>`;

export const contactPage = {
  path: 'contact.html',
  title: 'Contact et demande de devis | PAPER CUP Gobelets Tunisie',
  description: `Contactez PAPER CUP au ${site.phone.display} ou par e-mail, et préparez votre demande de devis de gobelets en carton : format, quantité, personnalisation.`,
  webPageType: 'ContactPage',
  breadcrumb: [home, { label: 'Contact', href: 'contact.html' }],
  main: (r) => `${pageHero({
    r,
    crumbs: contactPage.breadcrumb,
    eyebrow: 'Contact &amp; devis',
    title: 'Parlons de votre projet de gobelets',
    lead: `Appelez le ${site.phone.display}, écrivez à ${site.email}, ou décrivez votre besoin ci-dessous : nous préparons un récapitulatif clair à envoyer par e-mail ou à dicter par téléphone.`,
  })}
<section class="section" style="padding-top:0" aria-label="Coordonnées et demande de devis">
  <div class="container contact__grid">
    <div class="contact-cards">
      <a class="contact-card contact-card--primary" href="${site.phone.href}" data-reveal>
        <span class="contact-card__icon">${icon('phone')}</span>
        <span class="contact-card__label">Téléphone</span>
        <span class="contact-card__value">${site.phone.display}</span>
        <span class="contact-card__meta">Devis, formats, personnalisation</span>
        <span class="contact-card__arrow" aria-hidden="true">${icon('arrow-up-right')}</span>
      </a>
      <a class="contact-card" href="mailto:${site.email}" data-reveal style="--i:1">
        <span class="contact-card__icon">${icon('mail')}</span>
        <span class="contact-card__label">E-mail</span>
        <span class="contact-card__value">${site.email}</span>
        <span class="contact-card__meta">Pour envoyer votre visuel ou votre demande</span>
        <span class="contact-card__arrow" aria-hidden="true">${icon('arrow-up-right')}</span>
      </a>
      <div class="contact-card contact-card--lines" data-reveal style="--i:2">
        <span class="contact-card__label">Autres lignes</span>
        <a class="contact-card__line" href="${site.mobile.href}">${icon('phone')}<span>Mobile</span><strong>${site.mobile.display}</strong></a>
        <p class="contact-card__line">${icon('printer')}<span>Fax</span><strong>${site.fax.display}</strong></p>
      </div>
      <a class="contact-card" href="${site.mapsUrl}" rel="noopener" target="_blank" data-reveal style="--i:3">
        <span class="contact-card__icon">${icon('map-pin')}</span>
        <span class="contact-card__label">Adresse</span>
        <span class="contact-card__value">${site.address.street}<br>${site.address.locality}, ${site.address.postalCode} ${site.address.city}</span>
        <span class="contact-card__meta">Itinéraire sur Google Maps<span class="visually-hidden"> (nouvel onglet)</span></span>
        <span class="contact-card__arrow" aria-hidden="true">${icon('arrow-up-right')}</span>
      </a>
      <a class="contact-card" href="${site.facebook}" rel="noopener" target="_blank" data-reveal style="--i:4">
        <span class="contact-card__icon">${icon('facebook')}</span>
        <span class="contact-card__label">Facebook</span>
        <span class="contact-card__value">PAPER CUP</span>
        <span class="contact-card__meta">facebook.com/papercuptunisie<span class="visually-hidden"> (nouvel onglet)</span></span>
        <span class="contact-card__arrow" aria-hidden="true">${icon('arrow-up-right')}</span>
      </a>
    </div>

    <div>
      <form class="quote-form" id="devis" data-quote-form data-endpoint="" novalidate aria-labelledby="devis-title">
        <div class="quote-form__head">
          <h2 id="devis-title">Préparer ma demande de devis</h2>
          <p>Les champs marqués <span class="req" aria-hidden="true">*</span><span class="visually-hidden">d’un astérisque</span> sont requis.</p>
        </div>
        <div class="form-errors" data-form-errors role="alert" tabindex="-1" hidden>
          <p>Merci de corriger les points suivants :</p>
          <ul></ul>
        </div>
        <fieldset class="field">
          <legend class="field__label">Type de gobelet <span class="req" aria-hidden="true">*</span></legend>
          <div class="radio-cards">
            <label class="radio-card"><input type="radio" name="type" value="personnalise" id="f-type-perso" checked required aria-describedby="err-type"><span class="radio-card__body"><strong>Personnalisé</strong><span>À votre marque, dès ${fmt(site.minOrder)} pièces</span></span></label>
            <label class="radio-card"><input type="radio" name="type" value="standard" id="f-type-std" aria-describedby="err-type"><span class="radio-card__body"><strong>Standard</strong><span>Sans impression personnalisée</span></span></label>
          </div>
          ${errorSlot('err-type')}
        </fieldset>
        <fieldset class="field">
          <legend class="field__label">Format <span class="req" aria-hidden="true">*</span></legend>
          <div class="format-cards">${formatCards()}</div>
          ${errorSlot('err-format')}
        </fieldset>
        <div class="field">
          <label class="field__label" for="f-qty">Quantité de gobelets <span class="req" aria-hidden="true">*</span></label>
          <input class="input" id="f-qty" name="quantite" type="number" inputmode="numeric" min="1" step="500" value="${site.minOrder}" required aria-describedby="f-qty-hint err-qty">
          <p class="field__hint" id="f-qty-hint" data-qty-hint>Indiquez le nombre total de gobelets souhaités.</p>
          ${errorSlot('err-qty')}
        </div>
        <div class="form-grid">
          <div class="field">
            <label class="field__label" for="f-company">Société ou marque</label>
            <input class="input" id="f-company" name="societe" type="text" autocomplete="organization" maxlength="80">
          </div>
          <div class="field">
            <label class="field__label" for="f-name">Votre nom</label>
            <input class="input" id="f-name" name="nom" type="text" autocomplete="name" maxlength="80" aria-describedby="err-name" data-required-when-connected>
            ${errorSlot('err-name')}
          </div>
          <div class="field">
            <label class="field__label" for="f-phone">Téléphone</label>
            <input class="input" id="f-phone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" aria-describedby="err-phone" data-required-when-connected>
            ${errorSlot('err-phone')}
          </div>
          <div class="field">
            <label class="field__label" for="f-city">Ville</label>
            <input class="input" id="f-city" name="ville" type="text" autocomplete="address-level2" maxlength="60">
          </div>
        </div>
        <div class="field">
          <label class="field__label" for="f-msg">Votre projet</label>
          <textarea class="input" id="f-msg" name="message" rows="4" maxlength="1500" placeholder="Couleurs, visuel, échéance souhaitée…"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn--accent btn--lg" type="submit">Générer mon récapitulatif ${icon('arrow-right')}</button>
          <p class="form-note">${icon('info')}<span>Ce formulaire n’envoie aucune donnée par lui-même : il prépare un récapitulatif que vous transmettez ensuite par e-mail (${site.email}) ou par téléphone (${site.phone.display}).</span></p>
        </div>
      </form>

      <div class="quote-result" data-quote-result tabindex="-1" aria-labelledby="result-title" hidden>
        <div class="quote-result__head">
          <span class="quote-result__badge" aria-hidden="true">${icon('check')}</span>
          <h2 id="result-title" data-result-title>Votre demande est prête</h2>
        </div>
        <p data-result-text></p>
        <pre class="quote-result__summary" data-quote-summary></pre>
        <div class="quote-result__actions">
          <a class="btn btn--accent" href="mailto:${site.email}" data-mailto data-email="${site.email}">${icon('mail')} Envoyer par e-mail</a>
          <a class="btn btn--primary" href="${site.phone.href}">${icon('phone')} Appeler le ${site.phone.short}</a>
          <button class="btn btn--outline" type="button" data-copy-summary>${icon('copy')} Copier</button>
          <button class="btn btn--ghost" type="button" data-quote-edit>Modifier ma demande</button>
        </div>
        <p class="copy-status" role="status" data-copy-status></p>
      </div>
    </div>
  </div>
</section>
<script type="application/json" id="pc-products">${productsJSON(r)}</script>`,
};

/* ===================================================================== 404 */

export const notFoundPage = {
  path: '404.html',
  title: 'Page introuvable | PAPER CUP',
  description: 'Cette page n’existe pas ou a été déplacée.',
  noindex: true,
  // Servie pour n'importe quelle URL : liens absolus depuis la racine du domaine.
  root: '/',
  main: (r) => `<section class="error-page" aria-labelledby="nf-title">
  <div class="container container--narrow">
    <div class="error-page__cup" aria-hidden="true">${cup(byId['9oz'], { scale: 1.6, finish: 'band', uid: 'nf' })}</div>
    <p class="eyebrow">${icon('register', 'eyebrow__icon')}Erreur 404</p>
    <h1 id="nf-title">Ce gobelet est vide.</h1>
    <p class="lead">La page que vous cherchez n’existe pas ou a été déplacée. Reprenez depuis l’accueil ou parcourez la gamme.</p>
    <div class="error-page__actions">
      <a class="btn btn--accent btn--lg" href="${r}index.html">Retour à l’accueil ${icon('arrow-right')}</a>
      <a class="btn btn--outline btn--lg" href="${r}produits.html">Voir les gobelets</a>
    </div>
  </div>
</section>`,
};

export { fullAddress };
