// Textes par défaut : une illustration à dessiner par carte (56), chacune avec le dos qui lui correspond.
// [texte, dos, élément remarquable, contrainte de bords]
// dos : a:… = terre (Arpent), s:… = mer (Sonde) — 7 cartes par type.
// bords : 'mer' = au moins un bord d'eau, 'large' = au plus un bord de terre.
window.DECK = [
  // Montagne
  ["Un sentier qui serpente vers un col enneigé", "a:montagne", ""],
  ["Une caravane de mules sur une crête", "a:montagne", ""],
  ["Une route de montagne en lacets", "a:montagne", ""],
  ["Une mine abandonnée et ses wagonnets", "a:montagne", "mine"],
  ["Un glacier qui se jette dans la mer", "a:montagne", "", "mer"],
  ["Un loup qui hurle sur un rocher", "a:montagne", ""],
  ["Un aigle qui plane au-dessus d'une vallée", "a:montagne", ""],
  // Forêt
  ["Un cerf immobile à l'orée d'une forêt", "a:foret", ""],
  ["Un hibou perché sur une branche morte", "a:foret", ""],
  ["Un sanglier dans les fougères", "a:foret", ""],
  ["Une forêt de bambous sous la pluie", "a:foret", ""],
  ["Une chapelle perdue dans la brume", "a:foret", "chapelle"],
  ["Un cerf-volant accroché dans un arbre", "a:foret", ""],
  ["Une tour de guet abandonnée", "a:foret", "tour"],
  // Plaine
  ["Un renard qui traverse un champ de blé", "a:plaine", "ferme"],
  ["Un vieux moulin aux ailes déchirées", "a:plaine", "moulin"],
  ["Un troupeau de moutons dans la lande", "a:plaine", ""],
  ["Un champ de lavande et une ferme isolée", "a:plaine", "ferme"],
  ["Un pommier seul au milieu d'une prairie", "a:plaine", ""],
  ["Un menhir couvert de lichen", "a:plaine", "menhirs"],
  ["Un feu de camp sous un ciel étoilé", "a:plaine", ""],
  // Eau (lacs, rivières, marais)
  ["Un héron qui pêche dans les roseaux", "a:eau", ""],
  ["Un chemin de rondins à travers un marais", "a:eau", ""],
  ["Un arc-en-ciel au-dessus d'un lac", "a:eau", ""],
  ["Une pirogue sur une rivière calme", "a:eau", ""],
  ["Un ours qui pêche au pied d'une cascade", "a:eau", ""],
  ["Une lanterne posée au bout d'un ponton", "a:eau", "ponton"],
  ["Un pont de cordes au-dessus d'un torrent", "a:eau", ""],
  // Grande île
  ["Une carte au trésor déchirée en deux", "s:ile", ""],
  ["Une bouteille à la mer sur le sable", "s:ile", ""],
  ["Une crique cachée entre deux falaises", "s:ile", "mouillage"],
  ["Un village de pierre accroché à la falaise", "s:ile", "village"],
  ["Une longue-vue posée sur un rempart", "s:ile", "phare"],
  ["Une grotte éclairée par une torche", "s:ile", ""],
  ["Une source qui jaillit entre deux rochers", "s:ile", ""],
  // Archipel
  ["Une île minuscule avec un seul palmier", "s:archipel", ""],
  ["Un marché flottant à l'aube", "s:archipel", "village"],
  ["Un phare isolé sous un ciel d'orage", "s:archipel", "phare"],
  ["Un cartographe penché sur sa table", "s:archipel", ""],
  ["Un jardin de pierres et un érable rouge", "s:archipel", ""],
  ["Un volcan qui fume au loin", "s:archipel", ""],
  ["Un pêcheur endormi dans sa barque", "s:archipel", "mouillage"],
  // Haut-fond
  ["Une barque échouée sur un banc de sable", "s:hautfond", ""],
  ["Une tortue de mer au-dessus d'un récif", "s:hautfond", "recif"],
  ["Une épave couverte de coraux", "s:hautfond", "epave"],
  ["Un scaphandrier sur le fond marin", "s:hautfond", "epave"],
  ["Une pieuvre enroulée autour d'une amphore", "s:hautfond", "epave"],
  ["Une ancre rouillée sur une plage de galets", "s:hautfond", ""],
  ["Une cabane de pêcheur sur pilotis", "s:hautfond", ""],
  // Grand large
  ["Une baleine qui sonde près d'un voilier", "s:large", "", "large"],
  ["Un banc de poissons argentés", "s:large", "", "large"],
  ["Une méduse translucide dans l'eau sombre", "s:large", "", "large"],
  ["Une boussole dont l'aiguille s'affole", "s:large", "", "large"],
  ["Une nuée d'étourneaux au crépuscule", "s:large", "", "large"],
  ["Une montgolfière au-dessus des nuages", "s:large", "", "large"],
  ["Une bouée rouge ballottée par la houle", "s:large", "bouee", "large"]
];
window.TEXTES = window.DECK.map(d => d[0]);
