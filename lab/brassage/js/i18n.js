// FR / EN strings. Values are [en, fr]; each can be a string with {placeholders} or a function(args).

function initialLang() {
  try {
    const saved = localStorage.getItem('brassage-lang');
    if (saved === 'fr' || saved === 'en') return saved;
  } catch (e) { /* storage unavailable */ }
  return (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export let lang = initialLang();

export function setLang(l) {
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem('brassage-lang', l); } catch (e) { /* ignore */ }
}

// pick the current language from an {en, fr} object (plain strings pass through)
export const L = (x) => (x && typeof x === 'object' ? x[lang] ?? x.en : x);

const plural = (n, one, many) => (n > 1 ? many : one);

const STR = {
  title: ['Brassage · shuffle lab', 'Brassage · labo de mélange'],
  sub: ['A lab for watching how card shuffles really move the cards.', 'Un labo pour voir comment les mélanges déplacent vraiment les cartes.'],
  deck: ['Deck', 'Jeu'],
  cards: ['Cards', 'Cartes'],
  howMany: ['How many', 'Combien'],
  startOrder: ['Starting order', 'Ordre de départ'],
  seed: ['Seed', 'Graine'],
  newSeed: ['New', 'Nouvelle'],
  newSeedTitle: ['New random seed', 'Nouvelle graine au hasard'],
  resetDeck: ['Reset deck', 'Remettre le jeu à zéro'],
  shuffles: ['Shuffles', 'Mélanges'],
  sequence: ['Sequence', 'Enchaînement'],
  preset: ['Preset', 'Routine'],
  choosePreset: ['Choose a routine…', 'Choisir une routine…'],
  seqEmpty: ['Add shuffles with “Add to sequence”, or pick a preset.', 'Ajoutez des mélanges avec « Ajouter à l’enchaînement », ou choisissez une routine.'],
  runSeq: ['Run sequence', 'Lancer l’enchaînement'],
  clear: ['Clear', 'Vider'],
  sideView: ['Side view', 'Vue de profil'],
  colour: ['Colour', 'Coloration'],
  'cm.identity': ['Starting position', 'Position de départ'],
  'cm.suit': ['Suit', 'Couleur (♠♥♣♦)'],
  'cm.disp': ['Distance moved', 'Distance parcourue'],
  'cm.signed': ['Moved up / down', 'Monté / descendu'],
  'cm.neighbors': ['Neighbours kept', 'Voisins conservés'],
  'cm.rising': ['Rising sequences', 'Séquences montantes'],
  compareWith: ['Compare with', 'Comparer avec'],
  'cmp.1': ['previous step (n−1)', 'l’étape précédente (n−1)'],
  'cmp.start': ['the start', 'le départ'],
  animate: ['Animate', 'Animer'],
  undo: ['Undo', 'Annuler'],
  undoTitle: ['Remove the last step', 'Retirer la dernière étape'],
  deckHelp: ['Each thin bar is a card seen from the side, top of the deck at the top. Lines join every card to where it was. Click a card to follow it everywhere.',
    'Chaque barre fine est une carte vue de profil, le dessus du paquet en haut. Les lignes relient chaque carte à sa position précédente. Cliquez sur une carte pour la suivre partout.'],
  statistics: ['Statistics', 'Statistiques'],
  chartSub: ['every step compared with the start · dashed = random deck', 'chaque étape comparée au départ · pointillés = jeu aléatoire'],
  wall: ['History wall', 'Mur de l’historique'],
  wallSub: ['every step side by side, coloured by starting position', 'toutes les étapes côte à côte, colorées selon la position de départ'],
  dealIt: ['Deal it', 'Distribuer'],
  players: ['Players', 'Joueurs'],
  lab: ['Lab', 'Labo'],
  tabHeat: ['Where do cards end up?', 'Où finissent les cartes ?'],
  tabConv: ['How many shuffles?', 'Combien de mélanges ?'],
  heatHelp: ['Runs a routine thousands of times from the starting order and counts where each card lands. A perfectly random shuffle gives a flat, even grid.',
    'Rejoue une routine des milliers de fois depuis l’ordre de départ et compte où atterrit chaque carte. Un mélange parfaitement aléatoire donne une grille plate et uniforme.'],
  routine: ['Routine', 'Routine'],
  selectedShuffle: ['Selected shuffle', 'Mélange sélectionné'],
  theSequence: ['The sequence', 'L’enchaînement'],
  theSequenceLower: ['the sequence', 'l’enchaînement'],
  runs: ['Runs', 'Essais'],
  show: ['Show', 'Afficher'],
  probability: ['Probability', 'Probabilité'],
  gapUniform: ['Gap from uniform', 'Écart à l’uniforme'],
  run: ['Run', 'Lancer'],
  convHelp: ['Repeats each shuffle 1, 2, 3… times (with its current settings) and averages a measure over many runs.',
    'Répète chaque mélange 1, 2, 3… fois (avec ses réglages actuels) et fait la moyenne d’une mesure sur de nombreux essais.'],
  measure: ['Measure', 'Mesure'],
  'cv.tv': ['Position distance from uniform', 'Distance des positions à l’uniforme'],
  upTo: ['Up to', 'Jusqu’à'],
  repeats: ['repeats', 'répétitions'],
  view3d: ['3D', '3D'],
  wallShort: ['History', 'Historique'],
  resetView: ['Reset view', 'Recentrer'],
  help3d: ['Drag to turn, scroll or pinch to zoom, click a card to follow it. When you shuffle, cards fly out grouped by rising sequence, so a riffle shows its two halves.',
    'Glissez pour tourner, molette ou pincement pour zoomer, cliquez sur une carte pour la suivre. Au mélange, les cartes s’écartent par séquence montante\u00a0: un américain montre ses deux moitiés.'],
  loading3d: ['Loading 3D…', 'Chargement de la 3D…'],
  no3d: ['3D could not start (WebGL unavailable or offline).', 'La 3D n’a pas pu démarrer (WebGL indisponible ou hors ligne).'],
  langSwitch: ['Français', 'English'],

  start: ['Start', 'Départ'],
  sameStep: ['Same step', 'Même étape'],
  step: ['Step {n}', 'Étape {n}'],
  stepLower: ['step {n}', 'étape {n}'],
  topArrow: ['top ↑', 'dessus ↑'],
  scrub: ['step {v} of {n}', 'étape {v} sur {n}'],
  'lg.idA': ['top of the starting deck', 'dessus du paquet de départ'],
  'lg.idB': ['bottom', 'dessous'],
  'lg.idMid': ['a smooth gradient means the deck is still in order', 'un dégradé régulier = le paquet est encore en ordre'],
  'lg.dispA': ['stayed put', 'resté en place'],
  'lg.dispB': ['moved {n}+ places', 'déplacé de {n}+ places'],
  'lg.sA': ['moved toward the top', 'monté vers le dessus'],
  'lg.sB': ['toward the bottom', 'descendu vers le dessous'],
  'lg.sMid': ['grey = stayed', 'gris = resté en place'],
  'lg.nbBlocks': ['still-together blocks', 'blocs encore groupés'],
  'lg.nbAlt': ['(alternating)', '(en alternance)'],
  'lg.nbSep': ['separated', 'séparées'],
  'lg.nbCount': ['{k} pairs kept in {b} blocks', '{k} paires conservées dans {b} blocs'],
  'lg.rising': [
    (a) => `<b>${a.c}</b> rising sequence${a.c > 1 ? 's' : ''} compared with the left stack`,
    (a) => `<b>${a.c}</b> séquence${a.c > 1 ? 's' : ''} montante${a.c > 1 ? 's' : ''} par rapport à la pile de gauche`],
  'lg.rising3d': [
    (a) => `<b>${a.c}</b> rising sequence${a.c > 1 ? 's' : ''} compared with step ${a.r}`,
    (a) => `<b>${a.c}</b> séquence${a.c > 1 ? 's' : ''} montante${a.c > 1 ? 's' : ''} par rapport à l’étape ${a.r}`],
  'lg.risingRandom': ['a random deck has about {e}', 'un jeu aléatoire en a environ {e}'],
  'tip.pos': ['position {p}', 'position {p}'],
  'tip.moved': ['moved', 'déplacée'],
  'tip.nowhere': ['nowhere', 'nulle part'],
  'tip.up': ['{d} up', 'de {d} vers le haut'],
  'tip.down': ['{d} down', 'de {d} vers le bas'],
  'tip.start': ['at the start:', 'au départ :'],
  following: ['Following <b>{c}</b>: position', 'Suivi de <b>{c}</b> : position'],
  stop: ['Stop', 'Arrêter'],
  statsRef: ['step {v} compared with step {r}', 'étape {v} comparée à l’étape {r}'],
  startParen: [' (start)', ' (départ)'],
  randomDeckApprox: ['random deck ≈ {v}', 'jeu aléatoire ≈ {v}'],
  ordered: ['ordered', 'ordonné'],
  random: ['random', 'aléatoire'],
  overHistory: ['{m} over the history', '{m} au fil de l’historique'],
  player: ['Player {k}', 'Joueur {k}'],
  shape: ['shape {s}', 'répartition {s}'],
  hcp: ['{p} HCP', '{p} points H'],
  dealt: ['Dealt one card at a time, from step {v}.', 'Distribué carte par carte, depuis l’étape {v}.'],
  leftover: [(a) => ` ${a.r} card${plural(a.r, '', 's')} left over.`, (a) => ` ${a.r} carte${plural(a.r, '', 's')} restante${plural(a.r, '', 's')}.`],
  bridgeNote: [' In random deals the most common shapes are 4-4-3-2 (21.6%), 5-3-3-2 (15.5%) and 5-4-3-1 (12.9%); a poorly shuffled deck gives odd shapes like 4-3-3-3 everywhere, or long suits.',
    ' Avec une donne aléatoire, les répartitions les plus fréquentes sont 4-4-3-2 (21,6 %), 5-3-3-2 (15,5 %) et 5-4-3-1 (12,9 %) ; un jeu mal mélangé donne des formes bizarres comme 4-3-3-3 partout, ou de longues couleurs.'],
  badgeRandom: ['Random: every run is different', 'Aléatoire : chaque essai est différent'],
  badgeNothing: ['Deterministic: changes nothing at all', 'Déterministe : ne change rien du tout'],
  badgeCycle: ['Deterministic: {o} in a row bring the {n} cards back to the start', 'Déterministe : {o} d’affilée remettent les {n} cartes dans l’ordre de départ'],
  shuffleBtn: ['Shuffle', 'Mélanger'],
  addSeq: ['Add to sequence', 'Ajouter à l’enchaînement'],
  moveUp: ['Move up', 'Monter'],
  remove: ['Remove', 'Retirer'],
  seqIsEmpty: ['The sequence is empty.', 'L’enchaînement est vide.'],
  pressRun: ['Press Run to fill the grid', 'Appuyez sur Lancer pour remplir la grille'],
  finalPos: ['final position →', 'position finale →'],
  startPos: ['starting position →', 'position de départ →'],
  nRuns: ['{n} runs', '{n} essais'],
  tvDesc: ['average distance from uniform per card (0 = perfectly even, 1 = fully predictable)', 'distance moyenne à l’uniforme par carte (0 = parfaitement égal, 1 = totalement prévisible)'],
  floorNote: ['Noise floor for {n} runs ≈ {f}: even a perfect shuffle can’t score lower.', 'Plancher de bruit pour {n} essais ≈ {f} : même un mélange parfait ne peut pas descendre plus bas.'],
  v1: ['Indistinguishable from random at this number of runs.', 'Impossible à distinguer du hasard avec ce nombre d’essais.'],
  v2: ['Close to random, but still visibly biased.', 'Proche du hasard, mais encore visiblement biaisé.'],
  v3: ['Clearly not random yet.', 'Clairement pas encore aléatoire.'],
  v4: ['Far from random: most cards are predictable.', 'Loin du hasard : la plupart des cartes sont prévisibles.'],
  mostPred: ['Most predictable: the card starting at position {i} ends at position {j} in {p}% of runs (random: {u}%).',
    'Le plus prévisible : la carte en position {i} finit en position {j} dans {p} % des essais (hasard : {u} %).'],
  lessLikely: ['less likely', 'moins probable'],
  moreLikely: ['more likely than 1/{n}', 'plus probable que 1/{n}'],
  uniformNote: ['Uniform (1/{n} = {u}%) is the colour one third of the way along.', 'L’uniforme (1/{n} = {u} %) correspond à la teinte au premier tiers.'],
  heatTip: ['Card starting at <b>{i}</b> lands at <b>{j}</b><br>{p}% of runs <span class="k">(uniform {u}%)</span>',
    'La carte partie de <b>{i}</b> arrive en <b>{j}</b><br>{p} % des essais <span class="k">(uniforme {u} %)</span>'],
  upTo4: ['Up to 4 at a time', '4 au maximum'],
  noiseFloor: ['noise floor for {n} runs', 'plancher de bruit ({n} essais)'],
  tvNote: ['Distance from uniform of where each card lands, averaged over cards. It only looks at single cards, so it can reach the floor while the deck still has patterns between cards. ',
    'Distance à l’uniforme de la position finale de chaque carte, en moyenne sur les cartes. Elle ne regarde que les cartes une par une : elle peut toucher le plancher alors que le paquet garde des motifs entre cartes. '],
  bdNote: ['The dashed line is the exact total-variation distance over all n! orders for GSR riffles (Bayer & Diaconis, 1992): the strictest measure there is, and the source of “7 riffles”.',
    'La ligne en pointillés est la distance en variation totale exacte sur les n! ordres possibles pour des mélanges américains GSR (Bayer & Diaconis, 1992) : la mesure la plus stricte qui soit, et l’origine des « 7 mélanges ».'],
  bdName: ['Riffle exact (Bayer–Diaconis)', 'Américain exact (Bayer–Diaconis)'],
  dashed: [' (dashed)', ' (pointillés)'],
  randomDeck: ['random deck', 'jeu aléatoire'],
  nRepeats: [(a) => `${a.n} repeat${plural(a.n, '', 's')}`, (a) => `${a.n} répétition${plural(a.n, '', 's')}`],
  wallTip: ['click to view · shift-click to follow the card', 'clic pour afficher · maj-clic pour suivre la carte'],
};

export function t(key, args = {}) {
  const v = STR[key];
  if (!v) return key;
  const s = v[lang === 'fr' ? 1 : 0];
  return typeof s === 'function' ? s(args) : s.replace(/\{(\w+)\}/g, (m, k) => (k in args ? args[k] : m));
}

// translate static markup: data-i18n (text), data-i18n-title (title attribute)
export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  document.title = t('title');
}
