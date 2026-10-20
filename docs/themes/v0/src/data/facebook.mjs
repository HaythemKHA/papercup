/**
 * Informations VÉRIFIÉES sur la page Facebook officielle de PAPER CUP
 * (https://www.facebook.com/papercuptunisie/, ID de page 100285101524501, identique au lien du site source).
 *
 * Relevé du 2026-10-20 : textes des publications signées « PAPER CUP » (juillet à octobre 2026) et
 * champs structurés de l'onglet « Coordonnées ». Les images et vidéos n'ont pas pu être consultées
 * (CDN Meta inaccessibles) : rien ici ne repose sur un visuel. Voir ANALYSIS.md, § « Page Facebook ».
 * Ne rien ajouter qui ne soit pas publié par PAPER CUP ; ne publier ni prix, ni délai, ni minimum non publiés.
 */

export const facebook = {
  checkedOn: '2026-10-20',
  // Champ « WhatsApp » de l'onglet Coordonnées, repris par les boutons d'action des publications.
  whatsapp: { display: '(+216) 24 749 110', href: 'https://wa.me/21624749110', schema: '+216 24 749 110' },
  // Secteurs nommés dans les publications (cafés, lounges, restaurants, fast-foods, snacks, hôtels, glaceries, commerces, entreprises).
  sectors: ['Cafés et coffee shops', 'Lounges', 'Restaurants', 'Fast-foods et snacks', 'Hôtels', 'Glaceries', 'Commerces', 'Entreprises'],
  // Autres produits présentés par PAPER CUP sur sa page (texte des publications ; aucune dimension inventée).
  moreProducts: [
    {
      id: 'gobelets-plastique',
      icon: 'cup-cold',
      title: 'Gobelets plastique personnalisés',
      text: 'Logo, couleurs et design à votre image, en 10, 12, 14 et 16&nbsp;oz.',
      source: 'Publication du 14 septembre 2026',
    },
    {
      id: 'gobelets-transparents',
      icon: 'cup-cold',
      title: 'Gobelets transparents personnalisables',
      text: 'Pour les boissons froides : thés glacés, smoothies, boba tea ou cafés frappés.',
      source: 'Vidéo du 23 août 2026',
    },
    {
      id: 'pots-glace',
      icon: 'ice-cream',
      title: 'Gobelets à glace en carton',
      text: 'Deux formats, 1 boule (55&nbsp;cc) et 2 boules (85&nbsp;cc), au design de votre choix.',
      source: 'Vidéo du 27 juillet 2026',
    },
    {
      id: 'pochettes',
      icon: 'bag',
      title: 'Pochettes personnalisées',
      text: 'Tailles 0 à 4, à votre logo, notamment pour les croissants et les sandwichs.',
      source: 'Publications des 29 août et 4 septembre 2026',
    },
    {
      id: 'papiers-plateaux',
      icon: 'tray',
      title: 'Papiers plateaux personnalisés',
      text: 'Imprimés à votre logo et à votre identité visuelle, pour cafés, restaurants, fast-foods, hôtels et commerces.',
      source: 'Publication du 21 septembre 2026',
    },
  ],
};
