// Shuffle models. A deck is an array of card ids, index 0 = top of the deck.
// Every shuffle takes (deck, params, rng) and returns a new array.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rng) {
  let u = 0;
  while (!u) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function binom(n, p, rng) {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng() < p) k++;
  return k;
}

// geometric packet size >= 1 with the given mean
function geom(mean, rng) {
  if (mean <= 1) return 1;
  const p = 1 / mean;
  let k = 1;
  while (rng() > p && k < 10000) k++;
  return k;
}

function packetSizes(n, mean, rng) {
  const sizes = [];
  let left = n;
  while (left > 0) {
    const s = Math.min(left, geom(mean, rng));
    sizes.push(s);
    left -= s;
  }
  return sizes;
}

// take packets off the top one by one, each landing on the previous one:
// packet order reverses, order inside a packet is kept
function reversePackets(deck, sizes) {
  const packets = [];
  let i = 0;
  for (const s of sizes) {
    packets.push(deck.slice(i, i + s));
    i += s;
  }
  return packets.reverse().flat();
}

export function fisherYates(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const human = (p) => p.model === 'human';

export const GROUPS = [
  { id: 'hands', name: 'Hands & table' },
  { id: 'precise', name: 'Dealing & magic' },
  { id: 'model', name: 'Math references' },
];

export const SHUFFLES = [
  {
    id: 'riffle', group: 'hands', name: 'Riffle', fr: 'Mélange américain · queue d’aronde',
    desc: 'Cut the deck in two halves and let them fall interleaved. The GSR model (Gilbert–Shannon–Reeds) is the one Bayer & Diaconis used to prove “7 shuffles are enough”. Real hands drop small clumps instead of single cards.',
    params: [
      { key: 'model', label: 'Model', type: 'select', def: 'gsr', options: [['gsr', 'GSR (mathematical)'], ['human', 'Human hands (clumpy)']] },
      { key: 'clump', label: 'Average clump', type: 'range', min: 1, max: 5, step: 0.1, def: 1.8, unit: 'cards', showIf: human },
      { key: 'cutDev', label: 'Cut wobble', type: 'range', min: 0, max: 10, step: 0.5, def: 3, unit: 'cards', showIf: human },
    ],
    run(d, p, r) {
      const n = d.length;
      const c = human(p) ? clamp(Math.round(n / 2 + gauss(r) * p.cutDev), 0, n) : binom(n, 0.5, r);
      const A = d.slice(0, c), B = d.slice(c);
      if (!human(p)) {
        const out = [];
        let i = 0, j = 0;
        while (i < A.length || j < B.length) {
          const a = A.length - i, b = B.length - j;
          out.push(r() * (a + b) < a ? A[i++] : B[j++]);
        }
        return out;
      }
      // human: clumps fall from the bottom of each half, alternating thumbs
      const out = [];
      let i = A.length - 1, j = B.length - 1;
      let side = r() < 0.5 ? 0 : 1;
      while (i >= 0 || j >= 0) {
        let k = geom(p.clump, r);
        if (side === 0) while (k-- > 0 && i >= 0) out.push(A[i--]);
        else while (k-- > 0 && j >= 0) out.push(B[j--]);
        side ^= 1;
      }
      return out.reverse();
    },
  },
  {
    id: 'overhand', group: 'hands', name: 'Overhand', fr: 'Mélange à la française',
    desc: 'Small packets are pulled off the top into the other hand, each landing on the previous one: packet order is reversed, but the cards inside a packet stay together. Pemantle showed it needs thousands of shuffles to randomise a 52-card deck.',
    params: [{ key: 'packet', label: 'Average packet', type: 'range', min: 1, max: 15, step: 0.5, def: 6, unit: 'cards' }],
    run: (d, p, r) => reversePackets(d, packetSizes(d.length, p.packet, r)),
  },
  {
    id: 'hindu', group: 'hands', name: 'Hindu', fr: 'Mélange hindou',
    desc: 'Packets are pinched off the top and dropped into the other hand. Mathematically the same as the overhand (packets reverse, cards inside stay together), usually with bigger packets.',
    params: [{ key: 'packet', label: 'Average packet', type: 'range', min: 1, max: 20, step: 0.5, def: 9, unit: 'cards' }],
    run: (d, p, r) => reversePackets(d, packetSizes(d.length, p.packet, r)),
  },
  {
    id: 'salad', group: 'hands', name: 'Salad', fr: 'Mélange en salade · wash · smoosh',
    desc: 'Cards are spread face down on the table and stirred with both hands, then gathered. Modelled as hand strokes that drag a clump of cards to somewhere else, with each card jittering a bit. Short washes leave whole clumps intact.',
    params: [
      { key: 'strokes', label: 'Hand strokes', type: 'range', min: 1, max: 200, step: 1, def: 10, unit: '' },
      { key: 'clump', label: 'Clump size', type: 'range', min: 3, max: 50, step: 1, def: 15, unit: '% of deck' },
      { key: 'jitter', label: 'Card jitter', type: 'range', min: 0, max: 6, step: 0.1, def: 0.8, unit: 'cards' },
    ],
    run(d, p, r) {
      const n = d.length;
      let keys = d.map((_, i) => i);
      let order = d.slice();
      for (let s = 0; s < p.strokes; s++) {
        const center = r() * n;
        const width = Math.max(1, (n * p.clump) / 100 * (0.5 + r()));
        const shift = gauss(r) * n * 0.35;
        for (let i = 0; i < n; i++) {
          const x = (keys[i] - center) / width;
          if (Math.abs(x) < 1) {
            const w = 1 - x * x;
            keys[i] += shift * w + gauss(r) * p.jitter * w;
          }
        }
        // re-rank so the "table" stays the same size
        const idx = keys.map((k, i) => i).sort((a, b) => keys[a] - keys[b]);
        order = idx.map((i) => order[i]);
        keys = idx.map((_, rank) => rank);
      }
      return order;
    },
  },
  {
    id: 'cut', group: 'hands', name: 'Cut', fr: 'Coupe',
    desc: 'Lift the top part and put it under. A cut never changes the cyclic order of the cards: every card keeps the same neighbours (except at the seam).',
    params: [
      { key: 'depth', label: 'Cut depth', type: 'range', min: 5, max: 95, step: 1, def: 50, unit: '%' },
      { key: 'wobble', label: 'Wobble', type: 'range', min: 0, max: 15, step: 0.5, def: 5, unit: 'cards' },
    ],
    run(d, p, r) {
      const n = d.length;
      const c = clamp(Math.round((n * p.depth) / 100 + gauss(r) * p.wobble), 1, n - 1);
      return d.slice(c).concat(d.slice(0, c));
    },
  },
  {
    id: 'cuts', group: 'hands', name: 'Running cuts', fr: 'Coupes multiples',
    desc: 'Several random cuts in a row. Fun fact: any number of cuts is still just one cut, so this adds almost nothing to randomness.',
    params: [{ key: 'count', label: 'Number of cuts', type: 'range', min: 1, max: 10, step: 1, def: 3, unit: '' }],
    run(d, p, r) {
      let out = d;
      for (let k = 0; k < p.count; k++) {
        const c = 1 + Math.floor(r() * (d.length - 1));
        out = out.slice(c).concat(out.slice(0, c));
      }
      return out;
    },
  },
  {
    id: 'strip', group: 'hands', name: 'Strip cut', fr: 'Coupe en paquets',
    desc: 'Casino style: strip a few big packets off the top onto the table, one on top of the other. Reverses the order of the packets.',
    params: [
      { key: 'strips', label: 'Packets', type: 'range', min: 2, max: 8, step: 1, def: 4, unit: '' },
      { key: 'wobble', label: 'Wobble', type: 'range', min: 0, max: 8, step: 0.5, def: 3, unit: 'cards' },
    ],
    run(d, p, r) {
      const n = d.length;
      const cuts = [];
      for (let i = 1; i < p.strips; i++) cuts.push(clamp(Math.round((n * i) / p.strips + gauss(r) * p.wobble), 1, n - 1));
      cuts.sort((a, b) => a - b);
      const b = [0, ...cuts, n];
      const sizes = [];
      for (let i = 1; i < b.length; i++) if (b[i] > b[i - 1]) sizes.push(b[i] - b[i - 1]);
      return reversePackets(d, sizes);
    },
  },
  {
    id: 'faro', group: 'precise', name: 'Faro', fr: 'Mélange pharaon',
    desc: 'A perfect riffle: exact half cut, cards interleave one by one. 8 perfect out-faros bring 52 cards back to the start; in-faros take 52. Add imperfection to see how fast a slightly sloppy faro becomes a real shuffle.',
    params: [
      { key: 'type', label: 'Type', type: 'select', def: 'out', options: [['out', 'Out (top card stays on top)'], ['in', 'In (top card goes 2nd)']] },
      { key: 'slip', label: 'Imperfection', type: 'range', min: 0, max: 0.5, step: 0.01, def: 0, unit: 'chance of a 2-card clump', pct: true },
    ],
    deterministic: (p) => p.slip === 0,
    run(d, p, r) {
      const n = d.length;
      const h = p.type === 'out' ? Math.ceil(n / 2) : Math.floor(n / 2);
      const A = d.slice(0, h), B = d.slice(h);
      const first = p.type === 'out' ? A : B, second = p.type === 'out' ? B : A;
      const out = [];
      let i = 0, j = 0, side = 0;
      while (i < first.length || j < second.length) {
        let k = p.slip > 0 && r() < p.slip ? 2 : 1;
        if (side === 0) while (k-- > 0 && i < first.length) out.push(first[i++]);
        else while (k-- > 0 && j < second.length) out.push(second[j++]);
        side ^= 1;
        if (i >= first.length) side = 1;
        if (j >= second.length) side = 0;
      }
      return out;
    },
  },
  {
    id: 'pile', group: 'precise', name: 'Pile shuffle', fr: 'Distribution en tas',
    desc: 'Deal the cards one by one into piles, then stack the piles. Great for counting cards, useless for randomness: with a fixed pickup order it is a fixed permutation.',
    params: [
      { key: 'piles', label: 'Piles', type: 'range', min: 2, max: 10, step: 1, def: 4, unit: '' },
      { key: 'pickup', label: 'Pickup', type: 'select', def: 'order', options: [['order', 'In order (pile 1 on top)'], ['random', 'Random pile order']] },
    ],
    deterministic: (p) => p.pickup === 'order',
    run(d, p, r) {
      const piles = Array.from({ length: p.piles }, () => []);
      d.forEach((c, i) => piles[i % p.piles].unshift(c));
      const order = piles.map((_, i) => i);
      if (p.pickup === 'random') for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      return order.flatMap((i) => piles[i]);
    },
  },
  {
    id: 'mongean', group: 'precise', name: 'Mongean', fr: 'Mélange de Monge',
    desc: 'Take cards off the top one by one, putting each alternately on top of and under the cards already in the other hand. Fully deterministic.',
    params: [],
    deterministic: () => true,
    run(d) {
      const out = [d[0]];
      for (let i = 1; i < d.length; i++) i % 2 ? out.unshift(d[i]) : out.push(d[i]);
      return out;
    },
  },
  {
    id: 'milk', group: 'precise', name: 'Milk shuffle', fr: 'Mélange à la traite',
    desc: 'Pinch the top and bottom cards together and pull them onto a new pile, again and again (also called the Klondike shuffle). Add slips to model fingers grabbing an extra card.',
    params: [{ key: 'slip', label: 'Slips', type: 'range', min: 0, max: 0.5, step: 0.01, def: 0, unit: 'chance of an extra card', pct: true }],
    deterministic: (p) => p.slip === 0,
    run(d, p, r) {
      let lo = 0, hi = d.length - 1;
      let out = [];
      while (lo <= hi) {
        const a = p.slip > 0 && r() < p.slip ? 2 : 1;
        const b = p.slip > 0 && r() < p.slip ? 2 : 1;
        const top = [];
        for (let k = 0; k < a && lo <= hi; k++) top.push(d[lo++]);
        const bottom = [];
        for (let k = 0; k < b && lo <= hi; k++) bottom.unshift(d[hi--]);
        out = top.concat(bottom, out);
      }
      return out;
    },
  },
  {
    id: 'deal', group: 'precise', name: 'Deal down', fr: 'Distribuer en un tas',
    desc: 'Deal every card one by one onto a single pile: the deck is exactly reversed.',
    params: [],
    deterministic: () => true,
    run: (d) => d.slice().reverse(),
  },
  {
    id: 'zarrow', group: 'precise', name: 'Zarrow', fr: 'Faux mélange',
    desc: 'A magician’s false shuffle: it looks exactly like a riffle, but the halves are pushed back through each other and the deck order never changes.',
    params: [],
    deterministic: () => true,
    run: (d) => d.slice(),
  },
  {
    id: 'toprandom', group: 'model', name: 'Top-to-random', fr: 'Carte du dessus au hasard',
    desc: 'Take the top card and insert it at a uniformly random place. Classic textbook model: the deck is perfectly random once the original bottom card has risen to the top and been reinserted, about n·ln n ≈ 236 moves for 52 cards.',
    params: [],
    run(d, p, r) {
      const out = d.slice(1);
      out.splice(Math.floor(r() * d.length), 0, d[0]);
      return out;
    },
  },
  {
    id: 'random', group: 'model', name: 'Perfect random', fr: 'Hasard parfait',
    desc: 'Fisher–Yates: every one of the n! orders is equally likely. This is the target every real shuffle tries to reach, and the baseline for all statistics.',
    params: [],
    run: (d, p, r) => fisherYates(d, r),
  },
];

export const BY_ID = Object.fromEntries(SHUFFLES.map((s) => [s.id, s]));

export function defaultParams(s) {
  return Object.fromEntries(s.params.map((p) => [p.key, p.def]));
}

export function isDeterministic(s, p) {
  return !!(s.deterministic && s.deterministic(p));
}

// how many repetitions of a deterministic shuffle bring the deck back to its start
export function cycleOrder(s, p, n) {
  const id = Array.from({ length: n }, (_, i) => i);
  const perm = s.run(id, p, () => 0.5);
  const seen = new Uint8Array(n);
  let order = 1n;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    let len = 0, j = i;
    while (!seen[j]) { seen[j] = 1; j = perm[j]; len++; }
    const L = BigInt(len);
    order = (order * L) / gcd(order, L);
  }
  return order;
}

export function applyShuffle(deck, id, params, times, rng) {
  const s = BY_ID[id];
  let d = deck;
  for (let k = 0; k < times; k++) d = s.run(d, params, rng);
  return d;
}

export const PRESETS = [
  { name: 'Bayer–Diaconis: 7 riffles', steps: [['riffle', { model: 'gsr' }, 7]] },
  { name: 'Casino: riffle, riffle, strip, riffle, cut', steps: [['riffle', { model: 'human' }, 1], ['riffle', { model: 'human' }, 1], ['strip', {}, 1], ['riffle', { model: 'human' }, 1], ['cut', {}, 1]] },
  { name: 'Kitchen table: 4 overhands + cut', steps: [['overhand', {}, 4], ['cut', {}, 1]] },
  { name: 'Lazy player: 2 riffles + cut', steps: [['riffle', { model: 'human' }, 2], ['cut', {}, 1]] },
  { name: 'Poker room: wash, then 3 riffles', steps: [['salad', { strokes: 40 }, 1], ['riffle', { model: 'human' }, 3], ['cut', {}, 1]] },
  { name: '8 out-faros (back to start!)', steps: [['faro', { type: 'out', slip: 0 }, 1], ['faro', { type: 'out', slip: 0 }, 1], ['faro', { type: 'out', slip: 0 }, 1], ['faro', { type: 'out', slip: 0 }, 1], ['faro', { type: 'out', slip: 0 }, 1], ['faro', { type: 'out', slip: 0 }, 1], ['faro', { type: 'out', slip: 0 }, 1], ['faro', { type: 'out', slip: 0 }, 1]] },
  { name: 'Pile shuffle ×3', steps: [['pile', { piles: 5, pickup: 'order' }, 3]] },
  { name: 'Top-to-random ×236 (n·ln n)', steps: [['toprandom', {}, 236]] },
];

/* ---------- French texts, merged into {en, fr} objects ---------- */

const FR = {
  riffle: {
    name: 'Américain', alt: 'Riffle · queue d’aronde',
    desc: 'On coupe le paquet en deux moitiés qu’on laisse retomber imbriquées. Le modèle GSR (Gilbert–Shannon–Reeds) est celui avec lequel Bayer et Diaconis ont prouvé que « 7 mélanges suffisent ». De vraies mains lâchent de petits paquets plutôt que des cartes une à une.',
    params: { model: ['Modèle', '', { gsr: 'GSR (mathématique)', human: 'Mains humaines (par paquets)' }], clump: ['Paquet moyen', 'cartes'], cutDev: ['Coupe imprécise', 'cartes'] },
  },
  overhand: {
    name: 'À la française', alt: 'Overhand',
    desc: 'On fait glisser de petits paquets du dessus vers l’autre main, chacun tombant sur le précédent : l’ordre des paquets s’inverse, mais les cartes d’un même paquet restent ensemble. Pemantle a montré qu’il faut des milliers de mélanges pour rendre un jeu de 52 cartes aléatoire.',
    params: { packet: ['Paquet moyen', 'cartes'] },
  },
  hindu: {
    name: 'Hindou', alt: 'Hindu shuffle',
    desc: 'On pince des paquets sur le dessus et on les laisse tomber dans l’autre main. Mathématiquement identique au mélange à la française (les paquets s’inversent, les cartes à l’intérieur restent groupées), en général avec de plus gros paquets.',
    params: { packet: ['Paquet moyen', 'cartes'] },
  },
  salad: {
    name: 'Salade', alt: 'Wash · smoosh · chemmy',
    desc: 'Les cartes sont étalées faces cachées sur la table, remuées à deux mains, puis rassemblées. Modélisé par des coups de main qui emportent un amas de cartes ailleurs, chaque carte bougeant un peu. Un mélange court laisse des amas entiers intacts.',
    params: { strokes: ['Coups de main', ''], clump: ['Taille des amas', '% du jeu'], jitter: ['Agitation', 'cartes'] },
  },
  cut: {
    name: 'Coupe', alt: 'Cut',
    desc: 'On soulève la partie du dessus et on la passe dessous. Une coupe ne change jamais l’ordre circulaire des cartes : chaque carte garde ses voisines (sauf à la jointure).',
    params: { depth: ['Profondeur', '%'], wobble: ['Imprécision', 'cartes'] },
  },
  cuts: {
    name: 'Coupes multiples', alt: 'Running cuts',
    desc: 'Plusieurs coupes au hasard à la suite. Anecdote : n’importe quel nombre de coupes revient à une seule coupe, donc cela n’ajoute presque rien au hasard.',
    params: { count: ['Nombre de coupes', ''] },
  },
  strip: {
    name: 'Coupe en paquets', alt: 'Strip cut',
    desc: 'Façon casino : on détache quelques gros paquets du dessus qu’on pose sur la table les uns sur les autres. L’ordre des paquets s’inverse.',
    params: { strips: ['Paquets', ''], wobble: ['Imprécision', 'cartes'] },
  },
  faro: {
    name: 'Pharaon', alt: 'Faro · weave',
    desc: 'Un mélange américain parfait : coupe exactement au milieu, les cartes s’imbriquent une à une. 8 pharaons « out » parfaits remettent 52 cartes dans l’ordre ; il en faut 52 en « in ». Ajoutez de l’imperfection pour voir à quelle vitesse un pharaon un peu raté devient un vrai mélange.',
    params: { type: ['Type', '', { out: 'Out (la carte du dessus reste dessus)', in: 'In (la carte du dessus passe 2e)' }], slip: ['Imperfection', 'risque d’un paquet de 2'] },
  },
  pile: {
    name: 'En tas', alt: 'Pile shuffle',
    desc: 'On distribue les cartes une à une en plusieurs tas, puis on empile les tas. Parfait pour compter les cartes, inutile pour le hasard : avec un ramassage fixe, c’est une permutation fixe.',
    params: { piles: ['Tas', ''], pickup: ['Ramassage', '', { order: 'Dans l’ordre (tas 1 dessus)', random: 'Tas dans le désordre' }] },
  },
  mongean: {
    name: 'Monge', alt: 'Mongean shuffle',
    desc: 'On prend les cartes du dessus une à une, en les posant alternativement au-dessus et en dessous de celles déjà dans l’autre main. Entièrement déterministe.',
    params: {},
  },
  milk: {
    name: 'À la traite', alt: 'Milk · Klondike shuffle',
    desc: 'On pince ensemble la carte du dessus et celle du dessous et on les tire sur un nouveau tas, encore et encore. Ajoutez des ratés pour simuler des doigts qui attrapent une carte de trop.',
    params: { slip: ['Ratés', 'risque d’une carte en plus'] },
  },
  deal: {
    name: 'Distribuer', alt: 'Deal down',
    desc: 'On distribue toutes les cartes une à une sur un seul tas : le paquet est exactement inversé.',
    params: {},
  },
  zarrow: {
    name: 'Zarrow', alt: 'False shuffle',
    desc: 'Le faux mélange des magiciens : il ressemble trait pour trait à un mélange américain, mais les moitiés repassent l’une à travers l’autre et l’ordre ne change jamais.',
    params: {},
  },
  toprandom: {
    name: 'Dessus au hasard', alt: 'Top-to-random',
    desc: 'On prend la carte du dessus et on l’insère à un endroit tiré au hasard. Modèle classique des manuels : le paquet est parfaitement aléatoire dès que la carte du dessous d’origine est remontée au sommet puis a été réinsérée, environ n·ln n ≈ 236 coups pour 52 cartes.',
    params: {},
  },
  random: {
    name: 'Hasard parfait', alt: 'Fisher–Yates',
    desc: 'Fisher–Yates : chacun des n! ordres est également probable. C’est la cible que tout vrai mélange essaie d’atteindre, et la référence de toutes les statistiques.',
    params: {},
  },
};

const GROUPS_FR = { hands: 'Mains & table', precise: 'Distribution & magie', model: 'Références mathématiques' };
GROUPS.forEach((g) => (g.name = { en: g.name, fr: GROUPS_FR[g.id] }));

for (const s of SHUFFLES) {
  const f = FR[s.id];
  s.alt = { en: s.fr, fr: f.alt };
  delete s.fr;
  s.name = { en: s.name, fr: f.name };
  s.desc = { en: s.desc, fr: f.desc };
  for (const p of s.params) {
    const [label, unit, opts] = f.params[p.key];
    p.label = { en: p.label, fr: label };
    if (p.unit !== undefined) p.unit = { en: p.unit, fr: unit };
    if (p.options) p.options = p.options.map(([v, en]) => [v, { en, fr: opts[v] }]);
  }
}

const PRESETS_FR = [
  'Bayer–Diaconis : 7 américains',
  'Casino : américain, américain, paquets, américain, coupe',
  'Table de cuisine : 4 à la française + coupe',
  'Joueur pressé : 2 américains + coupe',
  'Salle de poker : salade, puis 3 américains',
  '8 pharaons out (retour au départ !)',
  'En tas ×3',
  'Dessus au hasard ×236 (n·ln n)',
];
PRESETS.forEach((p, i) => (p.name = { en: p.name, fr: PRESETS_FR[i] }));
