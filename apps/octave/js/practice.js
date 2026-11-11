// Exercises: chords (play the chord shown, any octave or inversion) and scales
// (one octave up then back down, starting anywhere). Logic only: the Learn
// screen draws the state and listens to onPracticeChange.
import { subscribe, soundingNotes } from './notes.js?v=202611118';
import { S } from './store.js?v=202611118';
import { buildChord, scaleNotes, pitchClass, defaultSpelling, SCALES } from './theory.js?v=202611118';
import { t, spelled } from './i18n.js?v=202611118';

export const LEVELS = {
  chords: {
    triads: ['maj', 'min'],
    allTriads: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4'],
    sevenths: ['dom7', 'maj7', 'min7', 'hdim7', 'dim7'],
    allChords: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', 'dom7', 'maj7', 'min7', 'hdim7', 'dim7', 'six', 'min6'],
  },
  reading: {
    trebleEasy: { lo: 60, hi: 79, clefs: ['treble'] },
    bassEasy: { lo: 41, hi: 60, clefs: ['bass'] },
    grandStaff: { lo: 41, hi: 79, clefs: ['treble', 'bass'] },
    withAccidentals: { lo: 41, hi: 79, clefs: ['treble', 'bass'], accidentals: true },
  },
  scales: {
    majorScales: ['major'],
    minorScales: ['minor', 'harmonicMinor'],
    majorMinor: ['major', 'minor', 'harmonicMinor'],
    allScales: Object.keys(SCALES),
  },
};
const ROOTS = { naturals: [0, 2, 4, 5, 7, 9, 11], all: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
const NEXT_DELAY_MS = 900;

let active = false;
let target = null;
let locked = false;
let attemptMissed = false;
let feedback = { kind: '', text: '' };
let missedStep = -1;
const stats = { done: 0, streak: 0, best: 0 };
const listeners = new Set();

// A lesson can run the exercises with its own settings (else the Exercises tab's)
let cfg = null;
const conf = () => cfg || S.practice;
export function setPracticeConfig(c) { cfg = c; stats.done = 0; stats.streak = 0; stats.best = 0; }
const readingLevel = () => { const r = conf().reading; return typeof r === 'object' ? r : LEVELS.reading[r] || LEVELS.reading.trebleEasy; };

export const isPracticing = () => active;
export const onPracticeChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const practiceState = () => ({ target, feedback, stats, missedStep, locked });
const changed = () => listeners.forEach(fn => fn());
export const refreshPractice = () => changed();

// Notes to mark: strong = play these now, soft = the rest of the scale
export function practiceGuide() {
  if (!active || !target || !conf().hints) return null;
  if (target.kind === 'reading') return { midis: new Set([target.midi]) };
  if (target.kind === 'chords') return { strong: target.pcs, soft: new Set() };
  const next = target.steps[target.position];
  return { strong: new Set(next === undefined ? [] : [next.pc]), soft: new Set(target.notes.map(n => n.pc)) };
}

const pick = list => list[Math.floor(Math.random() * list.length)];

// Range of the current note-reading level, so the keyboard can show all of it
export function readingRange() {
  const L = readingLevel();
  return { lo: L.lo, hi: L.hi };
}

const SHARP = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
const FLAT = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];

function readingTarget() {
  const L = readingLevel();
  const black = m => [1, 3, 6, 8, 10].includes(m % 12);
  const pool = [];
  for (let m = L.lo; m <= L.hi; m++) if (L.accidentals || !black(m)) pool.push(m);
  if (L.pool) pool.splice(0, pool.length, ...L.pool);
  let midi;
  do { midi = pick(pool); } while (target && target.kind === 'reading' && target.midi === midi && pool.length > 1);
  const useFlat = black(midi) && Math.random() < 0.5;
  const [letter, acc] = (useFlat ? FLAT : SHARP)[midi % 12];
  // middle C may sit on either staff; elsewhere the staff follows the note
  const clef = L.clefs.length === 1 ? L.clefs[0] : midi > 60 ? 'treble' : midi < 60 ? 'bass' : pick(L.clefs);
  return { kind: 'reading', midi, clef, spelling: { letter, acc }, pcs: new Set([midi % 12]) };
}

export function nextTarget() {
  const P = conf();
  const kind = P.kind;
  if (kind === 'reading') {
    target = readingTarget();
    locked = false; attemptMissed = false; missedStep = -1; feedback = { kind: '', text: '' };
    return changed();
  }
  const level = kind === 'chords' ? P.chords : P.scales;
  const types = Array.isArray(level) ? level : LEVELS[kind][level] ?? Object.values(LEVELS[kind])[0];
  const roots = Array.isArray(P.roots) ? P.roots : ROOTS[P.roots] ?? ROOTS.all;
  let root, type;
  do {
    root = pick(roots);
    type = pick(types);
  } while (target && target.kind === kind && target.root === root && target.type === type && roots.length * types.length > 1);
  if (kind === 'chords') {
    const chord = buildChord(root, type);
    target = { kind, root, type, chord, notes: chord.notes, pcs: new Set(chord.notes.map(n => n.pc)) };
  } else {
    const notes = scaleNotes(root, type);
    const upNotes = [...notes, notes[0]];
    const steps = [...upNotes, ...upNotes.slice(0, -1).reverse()];
    target = { kind, root, type, notes, steps, position: 0, lastMidi: null };
  }
  locked = false;
  attemptMissed = false;
  missedStep = -1;
  feedback = { kind: '', text: '' };
  changed();
}

export function skip() { stats.streak = 0; nextTarget(); }

function succeed() {
  stats.done++;
  stats.streak++;
  stats.best = Math.max(stats.best, stats.streak);
  locked = true;
  feedback = { kind: 'success', text: pick(t('drillWell').split('|')) };
  changed();
  setTimeout(() => active && locked && nextTarget(), NEXT_DELAY_MS);
}

function miss(text) {
  stats.streak = 0;
  feedback = { kind: 'miss', text };
  changed();
}

const nameOfPc = pc => spelled(defaultSpelling(pc));

function checkChord(e) {
  const held = new Set(soundingNotes().map(pitchClass));
  if (!held.size) { attemptMissed = false; return changed(); }
  if (held.size === target.pcs.size && [...held].every(pc => target.pcs.has(pc))) return succeed();
  if (e.type === 'on' && !target.pcs.has(pitchClass(e.midi)) && !attemptMissed) {
    attemptMissed = true;
    return miss(t('drillNotInChord', { note: nameOfPc(pitchClass(e.midi)) }));
  }
  changed();
}

function checkScale(e) {
  if (e.type !== 'on') return;
  const step = target.steps[target.position];
  const pc = pitchClass(e.midi);
  const goingUp = target.position <= target.notes.length;
  const rightWay = target.lastMidi === null || (goingUp ? e.midi > target.lastMidi : e.midi < target.lastMidi);
  if (pc === step.pc && rightWay) {
    target.position++;
    target.lastMidi = e.midi;
    missedStep = -1;
    feedback = { kind: '', text: '' };
    if (target.position === target.steps.length) return succeed();
    return changed();
  }
  if (e.midi === target.lastMidi) return; // the previous note again is fine
  missedStep = target.position;
  if (pc === step.pc) return miss(t(goingUp ? 'drillHigher' : 'drillLower'));
  const sp = target.notes.find(n => n.pc === pc)?.spelling;
  miss(t('drillNotNext', { note: sp ? spelled(sp) : nameOfPc(pc) }));
}

export function setPracticing(on) {
  if (on === active) return;
  active = on;
  if (active) nextTarget();
  else { target = null; changed(); }
}

function checkReading(e) {
  if (e.type !== 'on') return;
  if (e.midi === target.midi) return succeed();
  if (e.midi % 12 === target.midi % 12) return miss(t(e.midi < target.midi ? 'drillHigherOct' : 'drillLowerOct'));
  miss(t('drillNotThisNote', { note: nameOfPc(e.midi % 12) }));
}

subscribe(e => {
  if (!active || !target || locked || (e.type !== 'on' && e.type !== 'off')) return;
  if (/^(song|take|suggest|coach)/.test(String(e.source))) return;
  if (target.kind === 'reading') checkReading(e);
  else if (target.kind === 'chords') checkChord(e);
  else checkScale(e);
});
