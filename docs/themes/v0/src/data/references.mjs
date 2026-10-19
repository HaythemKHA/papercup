/**
 * Références et réalisations — reprises du site source.
 *  - clients : bandeau « Ils nous ont fait confiance » de la page d'accueil (24 logos) ;
 *  - realisations : grille « Nos gobelets » de la page d'accueil (photos de gobelets personnalisés).
 * Les noms sont lus sur les logos et les gobelets photographiés.
 */
export const clients = [
  [10, 'Mövenpick Hôtel du Lac Tunis'], [1, 'Café Ben Yedder'], [11, 'Brioche Café'], [15, 'Bel Azur Hôtel'],
  [13, 'Carthage Land'], [14, 'Happyness'], [16, 'Gourmandise'], [17, "Keen's Café"],
  [18, 'Le Gourmet'], [19, 'Pavillon Gourmand'], [2, 'Cosmitto Coffee et Bondin'], [20, 'Hobo Chicken Trip'],
  [21, 'Plan B'], [22, 'Ci Gusta!'], [23, "Smug's"], [24, 'Malibu Bar Pub'],
  [25, "Smug's"], [3, 'Agil et Café Alta'], [4, 'Cappuccino Group'], [5, 'Pomme de Pain'],
  [6, 'Barista Work'], [7, 'Dolce Vita'], [88, 'Meublatex'], [9, 'Pause Gourmande'],
].map(([n, name]) => ({ key: `clients/client-${n}`, name }));

export const realisations = [
  { key: 'realisations/la-brioche', title: 'La Brioche', alt: 'Gobelet personnalisé La Brioche, décor arabesque noir et blanc, couvercle noir', shape: 'tall' },
  { key: 'realisations/b-cafe', title: 'B Café', alt: 'Gobelet personnalisé B Café, motif chevrons lilas, couvercle noir', shape: 'wide' },
  { key: 'realisations/galata-grill', title: 'Galata Grill', alt: 'Gobelet personnalisé Galata Grill, vert d’eau', shape: 'square' },
  { key: 'realisations/switch-coffee-shop', title: 'Switch Coffee Shop', alt: 'Gobelet personnalisé Switch Coffee Shop, couvercle noir', shape: 'wide' },
  { key: 'realisations/gourmandise', title: 'Gourmandise', alt: 'Gobelet personnalisé Gourmandise « À chacun son moment gourmandise », couvercle doré', shape: 'square' },
];
