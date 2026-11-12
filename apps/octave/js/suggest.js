// Chord suggestions: the chords of the key (from the chosen scale, or guessed
// from what is played), the one being played, and the usual next moves.
import { subscribe, soundingNotes, press, liftSource } from './notes.js?v=202611127';
import { S, emit } from './store.js?v=202611127';
import { detectChord, buildChord, scaleNotes } from './theory.js?v=202611127';
import { MAJOR, MINOR, correlate } from './analysis.js?v=202611127';

const QUALITY = {
  maj: 'maj', dom7: 'maj', maj7: 'maj', six: 'maj', add9: 'maj', dom9: 'maj', maj9: 'maj', sixnine: 'maj', sus4: 'maj', sus2: 'maj', sus4_7: 'maj', dom13: 'maj', dom11: 'maj', power: 'maj',
  min: 'min', min7: 'min', min6: 'min', madd9: 'min', min9: 'min', minmaj7: 'min', min11: 'min',
  dim: 'dim', hdim7: 'dim', dim7: 'dim', aug: 'aug', aug7: 'aug', augmaj7: 'aug',
};
// Usual next chords, by scale degree (0 = I / i)
const NEXT_MAJOR = { 0: [3, 4, 5], 1: [4, 6, 0], 2: [5, 3], 3: [4, 0, 1], 4: [0, 5, 3], 5: [3, 1, 4], 6: [0, 2] };
const NEXT_MINOR = { 0: [3, 5, 6], 1: [4, 0], 2: [5, 3], 3: [4, 0, 6], 4: [0, 5], 5: [3, 6, 2], 6: [2, 0] };
const PARENT = { majorPentatonic: 'major', minorPentatonic: 'minor', blues: 'minor' };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

let guessed = { root: 0, type: 'major' };
let current = null;   // index of the last chord played in the key
let resolveTo = null; // a chord outside the key that leads somewhere: the chord it leads to

// ── key guessing ───────────────────────────────────────────────
// What was played lately, by pitch class, fading out over ~15 s (bass notes and
// chord roots weigh more). The key is the best Krumhansl match, and it only
// changes once another key has clearly won for a while: one borrowed chord no
// longer flips it.
const hist = new Array(12).fill(0);
let histAt = 0, rival = null, rivalHits = 0;
let settled = false; // false until a first key is heard: the default C major gives way at once
const TAU = 15000;
function fade(now) {
  const k = Math.exp(-(now - histAt) / TAU);
  for (let i = 0; i < 12; i++) hist[i] *= k;
  histAt = now;
}
function bestKeys() {
  const out = [];
  for (let root = 0; root < 12; root++) {
    out.push({ root, type: 'major', score: correlate(hist, MAJOR, root) });
    out.push({ root, type: 'minor', score: correlate(hist, MINOR, root) });
  }
  return out.sort((a, b) => b.score - a.score);
}
const scoreOf = (list, k) => list.find(x => x.root === k.root && x.type === k.type)?.score ?? -1;
function reconsider() {
  const total = hist.reduce((a, b) => a + b, 0);
  if (total < 3) { if (total < 0.5) settled = false; return false; } // not enough heard yet (or long silence: start afresh)
  const list = bestKeys();
  const top = list[0];
  if (top.root === guessed.root && top.type === guessed.type) { rival = null; rivalHits = 0; return false; }
  if (!settled) { settled = true; guessed = { root: top.root, type: top.type }; rival = null; rivalHits = 0; return true; }
  const margin = top.score - scoreOf(list, guessed);
  if (rival && rival.root === top.root && rival.type === top.type) rivalHits++;
  else { rival = top; rivalHits = 1; }
  // a clear win switches at once; a narrow one has to hold for several notes
  if (margin > 0.15 || (margin > 0.04 && rivalHits >= 8)) {
    guessed = { root: top.root, type: top.type };
    rival = null; rivalHits = 0;
    return true;
  }
  return false;
}
const FROM_PLAYER = e => !/^(song|take|suggest|coach|ear|jam)/.test(String(e.source));

function key() {
  if (S.scale.type) return { root: S.scale.root, type: PARENT[S.scale.type] || S.scale.type, guessed: false };
  return { ...guessed, guessed: true };
}

const intervalQuality = (a, b) => (a === 4 && b === 7 ? 'maj' : a === 3 && b === 7 ? 'min' : a === 3 && b === 6 ? 'dim' : 'aug');

// The seven triads of the key, stacked in thirds from the scale
export function diatonic(k = key()) {
  const notes = scaleNotes(k.root, k.type);
  if (notes.length !== 7) return [];
  return notes.map((n, i) => {
    const third = (notes[(i + 2) % 7].pc - n.pc + 12) % 12;
    const fifth = (notes[(i + 4) % 7].pc - n.pc + 12) % 12;
    const q = intervalQuality(third, fifth);
    const id = { maj: 'maj', min: 'min', dim: 'dim', aug: 'aug' }[q];
    const r = ROMAN[i];
    const roman = q === 'maj' ? r : q === 'aug' ? r + '+' : q === 'min' ? r.toLowerCase() : r.toLowerCase() + '°';
    const chord = buildChord(n.pc, id);
    chord.root = n.spelling; // spell from the key (B♭ in F, not A♯)
    return { i, roman, pc: n.pc, quality: q, id, chord, pcs: new Set(chord.notes.map(x => x.pc)) };
  });
}

export function suggestState() {
  const k = key();
  const chords = diatonic(k);
  const minor = chords[0]?.quality === 'min';
  const table = minor ? NEXT_MINOR : NEXT_MAJOR;
  let next = current == null ? [0, 3, 4] : table[current] || [];
  if (resolveTo != null) next = [resolveTo, ...next.filter(i => i !== resolveTo)].slice(0, 3);
  return { key: k, chords, current, next };
}

// The suggested chords, each with its colour dot on the keys, when asked for
export const SUGGEST_COLORS = ['var(--s0)', 'var(--s1)', 'var(--s2)'];
export function suggestGuide() {
  if (!S.suggest.on || !S.suggest.keys || S.mode !== 'play') return null;
  const { chords, next } = suggestState();
  const marks = next.slice(0, 3).map((i, r) => chords[i] && { pcs: chords[i].pcs, color: SUGGEST_COLORS[r] }).filter(Boolean);
  return marks.length ? { marks } : null;
}

subscribe(e => {
  if (e.type !== 'on') return;
  if (String(e.source).startsWith('song')) return;
  const notes = soundingNotes();
  let keyMoved = false;
  if (FROM_PLAYER(e)) {
    fade(performance.now());
    hist[((e.midi % 12) + 12) % 12] += e.midi === notes[0] && notes.length > 1 ? 1.6 : 1;
    if (!S.scale.type) keyMoved = reconsider();
  }
  if (notes.length < 2) { if (keyMoved) { current = null; resolveTo = null; emit('suggest'); } return; }
  const found = detectChord(notes);
  if (!found) return;
  const q = QUALITY[found.id];
  if (!q) return;
  const pc = (found.root.letter != null) ? [0, 2, 4, 5, 7, 9, 11][found.root.letter] + found.root.acc : 0;
  const rootPc = ((pc % 12) + 12) % 12;
  // the chord's root counts a little more in the key guess
  if (FROM_PLAYER(e) && !S.scale.type) { hist[rootPc] += 0.5; keyMoved = reconsider() || keyMoved; }
  const chords = diatonic();
  const idx = chords.findIndex(c => c.pc === rootPc && c.quality === q);
  // Outside the key (a borrowed chord, a secondary dominant…): the key stays;
  // if a chord of the key sits a fifth below, that is where it usually goes
  let to = null;
  if (idx < 0) { const k = chords.findIndex(c => c.pc === (rootPc + 5) % 12); to = k < 0 ? null : k; }
  const cur = idx < 0 ? null : idx;
  if (cur !== current || to !== resolveTo || keyMoved) { current = cur; resolveTo = to; emit('suggest'); }
});

export function resetSuggest() { current = null; resolveTo = null; hist.fill(0); settled = false; guessed = { root: 0, type: 'major' }; emit('suggest'); }

// Play a suggested chord, root position around middle C
export function playSuggestion(c) {
  let root = 48 + c.pc;
  if (root < 53) root += 12;
  const offs = [...c.chord.notes].map(n => (n.pc - c.pc + 12) % 12).sort((a, b) => a - b);
  const notes = offs.map(o => root + o);
  notes.forEach(n => press(n, 88, 'suggest' + n));
  setTimeout(() => notes.forEach(n => liftSource('suggest' + n)), 650);
}
