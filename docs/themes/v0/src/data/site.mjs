/**
 * Données entreprise — source unique de vérité.
 *
 * Valeurs relevées sur https://www.papercup.com.tn (pages Accueil, Présentation, Produits,
 * Actualités et Contact, version française, consultées le 2026-10-19).
 * Voir ANALYSIS.md pour la provenance de chaque donnée. Ne rien ajouter qui ne soit pas vérifié.
 */

export const site = {
  name: 'PAPER CUP',
  alternateName: 'PAPER CUP Gobelets Tunisie',
  baseUrl: 'https://www.papercup.com.tn',
  locale: 'fr_TN',
  lang: 'fr',
  foundingYear: 2008,
  minOrder: 5000,
  phone: {
    // Espaces insécables dans le numéro : seul le préfixe (+216) peut passer à la ligne.
    display: '(+216) 75\u00a0290\u00a0088',
    short: '75\u00a0290\u00a0088',
    href: 'tel:+21675290088',
    schema: '+216 75 290 088',
  },
  // Page Contact : « (+216) 75 290 088 - (+216) 26 880 202 | fax (+216) 75 290 089 »
  mobile: { display: '(+216) 26\u00a0880\u00a0202', href: 'tel:+21626880202', schema: '+216 26 880 202' },
  fax: { display: '(+216) 75\u00a0290\u00a0089', schema: '+216 75 290 089' },
  email: 'paper.cup@hotmail.fr',
  address: {
    street: 'Route de Medenine, km 5',
    locality: 'Teboulbou',
    postalCode: '6032',
    city: 'Gabès',
    country: 'Tunisie',
    countryCode: 'TN',
  },
  facebook: 'https://www.facebook.com/papercuptunisie/',
  // Salons mentionnés sur la page Actualités du site source.
  fairs: [
    { year: 2017, name: "Foire internationale de l'hôtellerie et de matériel de la restauration", city: 'Sousse' },
    { year: 2016, name: "Foire internationale de l'hôtellerie et de matériel de la restauration", city: 'Sousse' },
  ],
  // Lien de recherche Google Maps construit à partir de l'adresse publiée (aucune coordonnée GPS inventée).
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent('PAPER CUP, Route de Medenine km 5, Teboulbou, Gabès, Tunisie'),
  lastmod: '2026-10-20',
  // Point d'entrée de l'API PHP des formulaires (relatif à la racine du thème, voir api/demande.php).
  // Sans PHP sur l'hébergement, les formulaires restent en mode « préparation » (récapitulatif).
  api: 'api/demande.php',
};

export const fullAddress = `${site.address.street}, ${site.address.locality}, ${site.address.postalCode} ${site.address.city}, ${site.address.country}`;
