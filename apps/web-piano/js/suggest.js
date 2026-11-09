// Chord suggestions: the chords of the key (from the chosen scale, or guessed
// from what is played), the one being played, and the usual next moves.
import { subscribe, soundingNotes, press, liftSource } from './notes.js?v=202611092';
import { S, emit } from './store.js?v=202611092';
import { detectChord, buildChord, scaleNotes } from './theory.js?v=202611092';

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
let current = null; // index of the last chord played in the key

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
  const next = current == null ? [0, 3, 4] : table[current] || [];
  return { key: k, chords, current, next };
}

// The first suggestion, softly marked on the keys when asked for
export function suggestGuide() {
  if (!S.suggest.on || !S.suggest.keys || S.mode !== 'play') return null;
  const { chords, next } = suggestState();
  const c = chords[next[0]];
  return c ? { soft: c.pcs } : null;
}

subscribe(e => {
  if (e.type !== 'on') return;
  if (String(e.source).startsWith('song')) return;
  const notes = soundingNotes();
  if (notes.length < 2) return;
  const found = detectChord(notes);
  if (!found) return;
  const q = QUALITY[found.id];
  if (!q) return;
  const pc = (found.root.letter != null) ? [0, 2, 4, 5, 7, 9, 11][found.root.letter] + found.root.acc : 0;
  const rootPc = ((pc % 12) + 12) % 12;
  let chords = diatonic();
  let idx = chords.findIndex(c => c.pc === rootPc && c.quality === q);
  // Outside the guessed key: guess again from this chord
  if (idx < 0 && !S.scale.type && (q === 'maj' || q === 'min')) {
    guessed = { root: rootPc, type: q === 'maj' ? 'major' : 'minor' };
    idx = 0;
  }
  if (idx !== current) { current = idx < 0 ? null : idx; emit('suggest'); }
});

export function resetSuggest() { current = null; emit('suggest'); }

// Play a suggested chord, root position around middle C
export function playSuggestion(c) {
  let root = 48 + c.pc;
  if (root < 53) root += 12;
  const offs = [...c.chord.notes].map(n => (n.pc - c.pc + 12) % 12).sort((a, b) => a - b);
  const notes = offs.map(o => root + o);
  notes.forEach(n => press(n, 88, 'suggest' + n));
  setTimeout(() => notes.forEach(n => liftSource('suggest' + n)), 650);
}
