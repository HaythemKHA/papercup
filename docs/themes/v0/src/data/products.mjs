/**
 * Catalogue — les quatre modèles publiés sur papercup.com.tn (+ accessoires de la page Produits).
 *
 * Valeurs reprises telles qu'affichées par la source :
 *  - cl : contenance indiquée sur la page Produits (« 4oz - 11.8 CL », etc.) ;
 *  - top / bottom / height : « Du haut », « En bas », « Hauteur » (mm) ;
 *  - perBox : « Pièce en boîtes » ;
 *  - carton : « Carton en dimensions », publiées sans unité (millimètres probables, à confirmer).
 * Aucune donnée de prix, de stock ou de délai n'est publiée : ne pas en ajouter.
 */

const raw = [
  { id: '4oz', oz: 4, label: '4 oz', cl: '11,8', model: '4oz-M', slug: 'gobelet-carton-4-oz', top: 62, bottom: 46, height: 62, perBox: 1500, carton: [395, 330, 340], rank: 'Le plus compact de la gamme',
    photo: 'products/gobelet-4-oz', photoAlt: 'Gobelet en carton 4 oz personnalisé aux couleurs de California Foods, avec couvercle' },
  { id: '6-5oz', oz: 6.5, label: '6,5 oz', cl: '19,2', model: '6.5oz-M', slug: 'gobelet-carton-6-5-oz', top: 72, bottom: 49, height: 73, perBox: 1000, carton: [370, 300, 390], rank: 'Le format intermédiaire',
    photo: 'products/gobelet-6-5-oz', photoAlt: 'Gobelet en carton 6,5 oz personnalisé pour Unimed, avec couvercle noir' },
  { id: '9oz', oz: 9, label: '9 oz', cl: '25', model: '9oz-M', slug: 'gobelet-carton-9-oz', top: 78, bottom: 56, height: 94, perBox: 1000, carton: [410, 335, 520], rank: 'Le format moyen',
    photo: 'products/gobelet-9-oz', photoAlt: 'Gobelet en carton 9 oz personnalisé Biscottino, décor rouge, avec couvercle' },
  { id: '12oz', oz: 12, label: '12 oz', cl: '33', model: '12oz-M', slug: 'gobelet-carton-12-oz', top: 80, bottom: 51, height: 117, perBox: 1000, carton: [410, 335, 400], rank: 'Le plus grand format de la gamme',
    photo: 'products/gobelet-12-oz', photoAlt: 'Gobelet en carton 12 oz personnalisé Walid Croissanterie, vert, avec couvercle vert' },
];

export const products = raw.map((p) => ({
  ...p,
  path: `produits/${p.slug}.html`,
  name: `Gobelet en carton ${p.label}`,
}));

/** Page Produits : « Des couvercles avec trous […] sont offerts avec ces gobelets », « Couvercle Gobelet », « Agitateur ». */
export const accessories = [
  { id: 'couvercle', name: 'Couvercle pour gobelet', photo: 'products/couvercle', photoAlt: 'Couvercle noir avec ouverture, posé à côté d’un gobelet en carton',
    text: 'Des couvercles avec trou sont proposés avec les gobelets de la gamme.' },
  { id: 'agitateur', name: 'Agitateurs', photo: 'products/agitateurs', photoAlt: 'Agitateurs pour boissons chaudes, blancs et noirs, de plusieurs formes',
    text: 'Des agitateurs sont proposés en complément des gobelets.' },
];

export const byId = Object.fromEntries(products.map((p) => [p.id, p]));

/** Données minimales exposées au JavaScript (estimateur, formulaire, atelier). */
export const productsJSON = (root = '') =>
  JSON.stringify(
    products.map(({ id, label, model, cl, top, bottom, height, perBox, carton, path }) => ({
      id, label, model, cl, top, bottom, height, perBox, carton, url: root + path,
    })),
  );
