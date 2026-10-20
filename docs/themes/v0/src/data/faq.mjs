/**
 * FAQ — chaque réponse ne s'appuie que sur les informations publiées par PAPER CUP.
 * `r` est le préfixe relatif vers la racine du thème (liens internes).
 * Groupes : gamme, commande, entreprise. `tags` permet de réutiliser une sélection sur d'autres pages.
 */
import { products } from './products.mjs';
import { site } from './site.mjs';
import { facebook } from './facebook.mjs';
import { fmt } from '../lib/svg.mjs';

export const faqGroups = [
  { id: 'gamme', title: 'Gamme &amp; formats' },
  { id: 'commande', title: 'Personnalisation &amp; commande' },
  { id: 'entreprise', title: "L'entreprise" },
];

export const faq = (r = '') => [
  {
    id: 'formats',
    group: 'gamme',
    tags: ['home'],
    q: 'Quels formats de gobelets en carton propose PAPER CUP ?',
    a: `<p>La gamme compte quatre formats : ${products.map((p) => `<strong>${p.label}</strong> (${p.cl} cl)`).join(', ').replace(/, ([^,]*)$/, ' et $1')}, correspondant aux modèles ${products.map((p) => p.model).join(', ').replace(/, ([^,]*)$/, ' et $1')}. Ces quatre formats existent en version personnalisée.</p><p><a href="${r}produits.html">Découvrir la gamme</a></p>`,
  },
  {
    id: 'dimensions',
    group: 'gamme',
    tags: [],
    q: 'Quelles sont les dimensions de chaque gobelet ?',
    a: `<ul>${products.map((p) => `<li><strong>${p.label}</strong> : Ø ${p.top} mm en haut, Ø ${p.bottom} mm au fond, ${p.height} mm de hauteur.</li>`).join('')}</ul><p><a href="${r}produits.html#comparatif">Voir le comparatif complet</a></p>`,
  },
  {
    id: 'carton',
    group: 'gamme',
    tags: [],
    q: 'Combien de gobelets contient un carton ?',
    a: `<p>Le gobelet 4 oz est conditionné par cartons de ${fmt(1500)} pièces. Les formats 6,5 oz, 9 oz et 12 oz sont conditionnés par cartons de ${fmt(1000)} pièces.</p>`,
  },
  {
    id: 'accessoires',
    group: 'gamme',
    tags: ['home'],
    q: 'Proposez-vous des couvercles et des agitateurs ?',
    a: `<p>Oui. Des couvercles avec trou sont proposés avec les gobelets de la gamme, ainsi que des agitateurs. Précisez-les dans votre demande de devis.</p><p><a href="${r}produits.html#accessoires">Voir les accessoires</a></p>`,
  },
  {
    id: 'autres-emballages',
    group: 'gamme',
    tags: [],
    q: 'Proposez-vous d’autres emballages que les gobelets en carton ?',
    a: `<p>Sur sa page Facebook, PAPER CUP présente aussi des gobelets plastique personnalisés (10, 12, 14 et 16&nbsp;oz), des gobelets transparents personnalisables pour les boissons froides, des gobelets à glace en carton (1 boule de 55&nbsp;cc, 2 boules de 85&nbsp;cc), des pochettes personnalisées (tailles 0 à 4) et des papiers plateaux personnalisés. Choisissez « Autre emballage » dans le <a href="${r}contact.html?type=autre#devis">formulaire de devis</a> et précisez le produit qui vous intéresse.</p><p><a href="${r}produits.html#autres-emballages">Voir les autres emballages</a></p>`,
  },
  {
    id: 'usages',
    group: 'gamme',
    tags: [],
    q: 'Les gobelets conviennent-ils aux boissons chaudes et froides ?',
    a: `<p>PAPER CUP présente sa gamme de gobelets en carton pour vos pauses café comme pour vos boissons fraîches. Pour un usage particulier, posez la question à l'équipe au moment de votre demande de devis.</p>`,
  },
  {
    id: 'recyclable',
    group: 'gamme',
    tags: [],
    q: 'Les gobelets PAPER CUP sont-ils recyclables ?',
    a: `<p>PAPER CUP décrit ses gobelets en carton comme jetables et recyclables. Pour toute question sur les matériaux, contactez directement l'entreprise au <a href="${site.phone.href}">${site.phone.display}</a>.</p>`,
  },
  {
    id: 'personnalisation',
    group: 'commande',
    tags: ['home', 'perso'],
    q: 'Peut-on faire fabriquer des gobelets à l’image de sa marque ?',
    a: `<p>Oui. Depuis ${site.foundingYear}, PAPER CUP fabrique des gobelets et des gobelets spéciaux à la marque de ses clients. Les gobelets personnalisés sont disponibles en 4, 6,5, 9 et 12 oz.</p><p><a href="${r}personnalisation.html">En savoir plus sur la personnalisation</a></p>`,
  },
  {
    id: 'minimum',
    group: 'commande',
    tags: ['home', 'perso'],
    q: 'Quelle est la quantité minimum de commande ?',
    a: `<p>Les commandes de gobelets personnalisés sont traitées à partir de <strong>${fmt(site.minOrder)} gobelets</strong>. Pour les gobelets standard, renseignez-vous auprès de l'équipe au <a href="${site.phone.href}">${site.phone.display}</a>.</p>`,
  },
  {
    id: 'devis',
    group: 'commande',
    tags: ['home', 'perso'],
    q: 'Comment obtenir un devis ?',
    a: `<p>Les tarifs ne sont pas publiés en ligne. Contactez PAPER CUP au <a href="${site.phone.href}">${site.phone.display}</a> ou par e-mail à <a href="mailto:${site.email}">${site.email}</a> en précisant le format, la quantité et, pour un gobelet personnalisé, votre visuel. Le <a href="${r}contact.html#devis">formulaire de la page Contact</a> vous aide à rassembler ces informations et permet de joindre votre logo ou votre maquette. PAPER CUP indique aussi un numéro WhatsApp sur sa page Facebook : <a href="${facebook.whatsapp.href}" rel="noopener" target="_blank">${facebook.whatsapp.display}<span class="visually-hidden"> (nouvel onglet)</span></a>.</p>`,
  },
  {
    id: 'fichiers',
    group: 'commande',
    tags: ['perso'],
    q: 'Puis-je joindre mon logo ou une maquette à ma demande ?',
    a: `<p>Oui, c’est facultatif. Les formulaires « Demande de devis » et « Essayez votre marque » acceptent vos fichiers PNG, JPG, WEBP ou PDF : logo, maquette, image d’inspiration ou document de référence. Le nombre de fichiers et la taille maximale sont indiqués dans le formulaire. Les fichiers envoyés sont conservés dans un espace privé, consultable uniquement par l’équipe PAPER CUP.</p><p>Si l’envoi direct n’est pas disponible, le formulaire vous l’indique : joignez alors vos fichiers à votre e-mail à <a href="mailto:${site.email}">${site.email}</a>.</p>`,
  },
  {
    id: 'references',
    group: 'entreprise',
    tags: [],
    q: 'Quelles marques ont fait confiance à PAPER CUP ?',
    a: `<p>Le site PAPER CUP présente notamment Mövenpick Hôtel du Lac Tunis, Café Ben Yedder, Brioche Café, Bel Azur Hôtel, Pomme de Pain ou Carthage Land parmi les marques qui lui ont fait confiance.</p><p><a href="${r}entreprise.html#salons">Découvrir l'entreprise</a></p>`,
  },
  {
    id: 'adresse',
    group: 'entreprise',
    tags: [],
    q: 'Où se trouve PAPER CUP ?',
    a: `<p>PAPER CUP est situé ${site.address.street}, à ${site.address.locality} (${site.address.postalCode} ${site.address.city}), en ${site.address.country}. Téléphone : <a href="${site.phone.href}">${site.phone.display}</a> ou <a href="${site.mobile.href}">${site.mobile.display}</a>.</p><p><a href="${site.mapsUrl}" rel="noopener" target="_blank">Ouvrir l'itinéraire<span class="visually-hidden"> (Google Maps, nouvel onglet)</span></a></p>`,
  },
];

/** Texte brut pour le JSON-LD FAQPage. */
export const plain = (html) =>
  html
    .replace(/<span class="visually-hidden">[^<]*<\/span>/g, '')
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&amp;/g, '&')
    .replace(/<li>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
