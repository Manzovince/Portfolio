// Deck specs: labels, suits and starting orders.
import { fisherYates, mulberry32 } from './shuffles.js';

const SUITS = ['♠', '♥', '♣', '♦'];
const RED = [false, true, false, true];

export const DECK_TYPES = [
  ['52', { en: '52 cards', fr: '52 cartes' }],
  ['32', { en: '32 cards (belote, piquet)', fr: '32 cartes (belote, piquet)' }],
  ['54', { en: '54 cards (with 2 jokers)', fr: '54 cartes (avec 2 jokers)' }],
  ['78', { en: '78 cards (tarot)', fr: '78 cartes (tarot)' }],
  ['num', { en: 'Numbered cards…', fr: 'Cartes numérotées…' }],
];

export const ORDERS = [
  ['suit', { en: 'Sorted by suit', fr: 'Trié par couleur' }],
  ['newdeck', { en: 'New deck order', fr: 'Ordre d’un jeu neuf' }],
  ['rank', { en: 'Sorted by rank', fr: 'Trié par valeur' }],
  ['stebbins', { en: 'Si Stebbins stack', fr: 'Chapelet Si Stebbins' }],
  ['random', { en: 'Already random', fr: 'Déjà mélangé' }],
];

const SUIT_NAMES = { en: ['Spades', 'Hearts', 'Clubs', 'Diamonds'], fr: ['Pique', 'Cœur', 'Trèfle', 'Carreau'] };

export function makeSpec(type, customN = 40, lang = 'en') {
  const fr = lang === 'fr';
  const label = [], suit = [], rank = [], red = [];
  const push = (l, s, r, isRed) => { label.push(l); suit.push(s); rank.push(r); red.push(isRed); };
  let suitNames = SUIT_NAMES[fr ? 'fr' : 'en'].map((n, i) => `${SUITS[i]} ${n}`);
  if (type === '52' || type === '54' || type === '32') {
    const face = fr ? ['V', 'D', 'R'] : ['J', 'Q', 'K'];
    const ranks = type === '32' ? ['7', '8', '9', '10', ...face, 'A'] : ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', ...face];
    for (let s = 0; s < 4; s++) ranks.forEach((r, i) => push(r + SUITS[s], s, i, RED[s]));
    if (type === '54') { push('JK', 4, 0, false); push('JK', 4, 1, true); suitNames.push('Jokers'); }
  } else if (type === '78') {
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'C', 'D', 'R'];
    for (let s = 0; s < 4; s++) ranks.forEach((r, i) => push(r + SUITS[s], s, i, RED[s]));
    for (let t = 1; t <= 21; t++) push('T' + t, 4, t, false);
    push(fr ? 'Exc' : 'Fool', 4, 0, false);
    suitNames.push(fr ? 'Atouts' : 'Trumps');
  } else {
    const n = Math.max(4, Math.min(200, customN | 0));
    suitNames = ['1/4', '2/4', '3/4', '4/4'];
    for (let i = 0; i < n; i++) push(String(i + 1), Math.floor((i * 4) / n), i, false);
  }
  const n = label.length;
  const suitCounts = {};
  suit.forEach((s) => (suitCounts[s] = (suitCounts[s] || 0) + 1));
  return { type, n, label, suit, rank, red, suitNames, suitCounts };
}

export function startOrder(spec, order, seed) {
  const ids = Array.from({ length: spec.n }, (_, i) => i);
  const has52 = spec.type === '52' || spec.type === '54';
  if (order === 'random') return fisherYates(ids, mulberry32(seed ^ 0x5eed));
  if (order === 'rank') return ids.slice().sort((a, b) => spec.rank[a] - spec.rank[b] || spec.suit[a] - spec.suit[b]);
  if (order === 'newdeck' && has52) {
    const of = (s) => ids.filter((i) => spec.suit[i] === s);
    const jokers = of(4);
    return [...jokers, ...of(0), ...of(3), ...of(2).reverse(), ...of(1).reverse()];
  }
  if (order === 'stebbins' && has52) {
    const cycle = [2, 1, 0, 3]; // ♣ ♥ ♠ ♦
    const out = [];
    for (let i = 0; i < 52; i++) out.push(cycle[i % 4] * 13 + ((3 * i) % 13));
    return [...ids.filter((i) => spec.suit[i] === 4), ...out];
  }
  return ids;
}
