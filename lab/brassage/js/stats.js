// Statistics comparing a deck to a reference deck (an earlier state).

export function positionsOf(deck) {
  const pos = new Int32Array(deck.length);
  deck.forEach((c, i) => (pos[c] = i));
  return pos;
}

// r[i] = position, in the reference, of the card now at position i
export function relative(deck, ref) {
  const refPos = positionsOf(ref);
  return deck.map((c) => refPos[c]);
}

export function risingSequences(r) {
  const n = r.length;
  const where = new Int32Array(n);
  r.forEach((v, i) => (where[v] = i));
  let count = 1;
  for (let v = 1; v < n; v++) if (where[v] < where[v - 1]) count++;
  return count;
}

export function pairsKept(r) {
  let k = 0;
  for (let i = 0; i + 1 < r.length; i++) if (r[i + 1] === r[i] + 1) k++;
  return k;
}

export function fixedPoints(r) {
  let k = 0;
  for (let i = 0; i < r.length; i++) if (r[i] === i) k++;
  return k;
}

export function meanDisplacement(r) {
  let s = 0;
  for (let i = 0; i < r.length; i++) s += Math.abs(r[i] - i);
  return s / r.length;
}

export function spearman(r) {
  const n = r.length;
  let s = 0;
  for (let i = 0; i < n; i++) s += (r[i] - i) ** 2;
  return 1 - (6 * s) / (n * (n * n - 1));
}

export function suitNeighbours(deck, spec) {
  let k = 0;
  for (let i = 0; i + 1 < deck.length; i++) if (spec.suit[deck[i]] === spec.suit[deck[i + 1]]) k++;
  return k;
}

export function longestBlock(r) {
  let best = 1, cur = 1;
  for (let i = 1; i < r.length; i++) {
    cur = r[i] === r[i - 1] + 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
  }
  return best;
}

export const METRICS = [
  {
    id: 'rising', name: { en: 'Rising sequences', fr: 'Séquences montantes' }, fmt: (v) => v.toFixed(v % 1 ? 1 : 0),
    help: { en: 'Groups of cards still in their original relative order. One riffle can at most double them: the key to the “7 shuffles” result.', fr: 'Groupes de cartes encore dans leur ordre relatif d’origine. Un mélange américain peut au plus les doubler : c’est la clé du résultat « 7 mélanges ».' },
    rel: true, value: (r) => risingSequences(r), random: (n) => (n + 1) / 2,
  },
  {
    id: 'pairs', name: { en: 'Neighbours kept', fr: 'Voisins conservés' }, fmt: (v) => v.toFixed(v % 1 ? 1 : 0),
    help: { en: 'Pairs of cards that were next to each other and still are, in the same order. Players notice these.', fr: 'Paires de cartes qui étaient côte à côte et le sont toujours, dans le même ordre. Les joueurs les remarquent.' },
    rel: true, value: (r) => pairsKept(r), random: (n) => (n - 1) / n,
  },
  {
    id: 'block', name: { en: 'Longest intact block', fr: 'Plus long bloc intact' }, fmt: (v) => v.toFixed(v % 1 ? 1 : 0),
    help: { en: 'The longest run of cards that are still together, in order.', fr: 'La plus longue suite de cartes encore ensemble, dans l’ordre.' },
    rel: true, log: true, value: (r) => longestBlock(r), random: (n) => 1 + 1 / Math.max(1, Math.log(n)),
  },
  {
    id: 'fixed', name: { en: 'Cards in place', fr: 'Cartes à leur place' }, fmt: (v) => v.toFixed(v % 1 ? 1 : 0),
    help: { en: 'Cards sitting at exactly the same position as in the reference.', fr: 'Cartes exactement à la même position que dans la référence.' },
    rel: true, value: (r) => fixedPoints(r), random: () => 1,
  },
  {
    id: 'disp', name: { en: 'Mean displacement', fr: 'Déplacement moyen' }, fmt: (v) => v.toFixed(1),
    help: { en: 'How far, on average, a card moved. Moving far is not the same as being random: a reversed deck moves a lot.', fr: 'De combien de places une carte a bougé en moyenne. Bouger beaucoup n’est pas être aléatoire : un paquet inversé bouge énormément.' },
    rel: true, value: (r) => meanDisplacement(r), random: (n) => (n * n - 1) / (3 * n),
  },
  {
    id: 'spearman', name: { en: 'Rank correlation ρ', fr: 'Corrélation de rang ρ' }, fmt: (v) => v.toFixed(2),
    help: { en: 'Spearman correlation between old and new positions. 1 = same order, −1 = reversed, 0 = no relation.', fr: 'Corrélation de Spearman entre anciennes et nouvelles positions. 1 = même ordre, −1 = inversé, 0 = aucun lien.' },
    rel: true, value: (r) => spearman(r), random: () => 0,
  },
  {
    id: 'suits', name: { en: 'Same-suit neighbours', fr: 'Voisins de même couleur' }, fmt: (v) => v.toFixed(v % 1 ? 1 : 0),
    help: { en: 'Adjacent cards sharing a suit, in the deck as it is now, compared to what a random deck gives.', fr: 'Cartes voisines de même couleur dans le paquet actuel, comparé à ce que donne un jeu aléatoire.' },
    rel: false, value: (r, deck, spec) => suitNeighbours(deck, spec),
    random: (n, spec) => Object.values(spec.suitCounts).reduce((s, c) => s + c * (c - 1), 0) / n,
  },
];

export const METRIC_BY_ID = Object.fromEntries(METRICS.map((m) => [m.id, m]));

export function metricValue(m, deck, ref, spec) {
  return m.value(relative(deck, ref), deck, spec);
}

// 0 = as orderly as the reference itself, 1 = what a random deck would give
export function randomness(m, deck, ref, spec) {
  const f = m.log ? Math.log : (x) => x; // long blocks shrink geometrically, judge them on a log scale
  const v = f(metricValue(m, deck, ref, spec));
  const v0 = f(metricValue(m, ref, ref, spec));
  const e = f(m.random(deck.length, spec));
  const span = Math.abs(v0 - e);
  if (span < 1e-9) return 1;
  return Math.max(0, Math.min(1, 1 - Math.abs(v - e) / span));
}

// rising-sequence index of each card, relative to the reference
export function risingIndex(deck, ref) {
  const pos = positionsOf(deck);
  const idx = new Int32Array(deck.length);
  let seq = 0;
  for (let v = 0; v < ref.length; v++) {
    if (v > 0 && pos[ref[v]] < pos[ref[v - 1]]) seq++;
    idx[ref[v]] = seq;
  }
  return { idx, count: seq + 1 };
}

// Exact total-variation distance from uniform after k GSR riffles of n cards
// (Bayer & Diaconis 1992), via Eulerian numbers in BigInt.
export function bayerDiaconis(n, kmax) {
  let A = [0n, 1n];
  for (let m = 2; m <= n; m++) {
    const B = new Array(m + 1).fill(0n);
    for (let r = 1; r <= m; r++) B[r] = BigInt(r) * (A[r] || 0n) + BigInt(m - r + 1) * (A[r - 1] || 0n);
    A = B;
  }
  let nf = 1n;
  for (let i = 2n; i <= BigInt(n); i++) nf *= i;
  const N = BigInt(n);
  const choose = (m) => {
    if (m < N) return 0n;
    let num = 1n;
    for (let i = 0n; i < N; i++) num *= m - i;
    return num / nf;
  };
  const out = [];
  for (let k = 1; k <= kmax; k++) {
    const two = 2n ** BigInt(k);
    const den = two ** N;
    let sum = 0n;
    for (let r = 1; r <= n; r++) {
      let diff = choose(two + N - BigInt(r)) * nf - den;
      if (diff < 0n) diff = -diff;
      sum += A[r] * diff;
    }
    const tv = Number((sum * 10n ** 12n) / (2n * den * nf)) / 1e12;
    out.push([k, tv]);
  }
  return out;
}
