// Coach: the course's progress, the tiny music notation the lessons are written
// in, the keys a lesson lights, and the clock helpers (demo playback, clicks,
// latency calibration) shared by the lesson steps.
import { press, lift } from './notes.js?v=202611141';
import * as E from './engine.js?v=202611141';
import { persistStorage } from './db.js?v=202611141';
import { COURSE } from './course.js?v=202611141';
import { SOUND_COURSE } from './sound-course.js?v=202611141';
export { COURSE };
// Two tracks: playing the piano, and making sounds with the synth
export const TRACKS = { piano: COURSE, sound: SOUND_COURSE };
import { defaultSpelling } from './theory.js?v=202611141';

// Every piece of the course once: versions of one song (right hand, left hand,
// both) count as one, played in its fullest version under its first, plain title
export const COURSE_PIECES = (() => {
  const bySong = new Map();
  COURSE.forEach((u, ui) => u.lessons.forEach(l => l.steps.forEach(s => {
    if (s.type !== 'piece') return;
    const key = s.song || (s.right || '') + '|' + (s.left || '');
    const size = (s.right ? s.right.length : 0) + (s.left ? s.left.length : 0);
    const have = bySong.get(key);
    if (!have) bySong.set(key, { id: 'course-' + l.id, title: s.title, unit: ui + 1, bpm: s.bpm, meter: s.meter || 4, right: s.right, left: s.left, size });
    else if (size > have.size) Object.assign(have, { bpm: s.bpm, right: s.right, left: s.left, size });
  })));
  return [...bySong.values()];
})();
export function pieceNotes(p) {
  const voice = (src, hand) => (src ? notesOf(parse(src)).flatMap(it => it.midis.map(midi => ({ midi, start: it.start, end: it.start + it.beats - 0.06, hand }))) : []);
  return [...voice(p.right, 'right'), ...voice(p.left, 'left')];
}

// ── progress (localStorage, every access wrapped) ──────────────
const KEY = 'octave.coach.v1';
const blank = () => ({ stars: {}, calib: null, unlockAll: false, last: null, track: 'piano' });
function load() {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return blank(); }
}
export const P = load();
export function saveCoach() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch {} }
export function resetCoach() { Object.assign(P, blank()); saveCoach(); }

export const PASS = 2; // stars needed to open the next lesson
export const LESSONS = Object.entries(TRACKS).flatMap(([track, units]) => units.flatMap((u, ui) => u.lessons.map((l, li) => ({ ...l, unit: u, ui, li, track }))));
export const lessonsOf = track => LESSONS.filter(l => l.track === track);
export const lessonById = id => LESSONS.find(l => l.id === id);
export const starsOf = id => P.stars[id] ?? 0;
// A lesson opens once the one before it, in the same track, is passed
export function isOpen(id) {
  if (P.unlockAll) return true;
  const lesson = lessonById(id);
  const list = lessonsOf(lesson.track);
  const i = list.indexOf(lesson);
  return i <= 0 || starsOf(list[i - 1].id) >= PASS;
}
// The lesson to suggest: the first one not passed yet
export const nextLesson = (track = P.track || 'piano') => { const list = lessonsOf(track); return list.find(l => starsOf(l.id) < PASS && isOpen(l.id)) ?? list[list.length - 1]; };
export function recordLesson(id, stars) {
  P.stars[id] = Math.max(starsOf(id), stars);
  P.last = id;
  saveCoach();
  persistStorage(); // progress to keep: ask the browser to keep it (asked once, then a no-op)
}

// ── notation ───────────────────────────────────────────────────
// Tokens separated by spaces: "C4q", "F#4h.", "Bb3e", "C4+E4+G4w", "rq" (rest),
// "q" / "h." (a rhythm with no pitch), "|" (bar line).
const LETTER = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const DUR = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
const VF_DUR = { w: 'w', h: 'h', q: 'q', e: '8', s: '16' };

export function pitch(text) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(text);
  if (!m) throw new Error('Bad pitch ' + text);
  const letter = LETTER[m[1]];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return { midi: 12 * (+m[3] + 1) + LETTER_PC[letter] + acc, spelling: { letter, acc } };
}

export function parse(src) {
  const items = [];
  let beat = 0;
  for (const tok of src.trim().split(/\s+/)) {
    if (tok === '|') { items.push({ bar: true }); continue; }
    const m = /^(.*?)([whqes])(\.?)$/.exec(tok);
    if (!m) throw new Error('Bad token ' + tok);
    const beats = DUR[m[2]] * (m[3] ? 1.5 : 1);
    const rest = m[1] === 'r';
    const pitches = rest || !m[1] ? [] : m[1].split('+').map(pitch);
    items.push({ rest, rhythmOnly: !m[1], midis: pitches.map(p => p.midi), spellings: pitches.map(p => p.spelling), beats, start: beat, vf: VF_DUR[m[2]], dots: m[3] ? 1 : 0 });
    beat += beats;
  }
  return items;
}
export const notesOf = items => items.filter(i => !i.bar && !i.rest);
export const lengthOf = items => items.filter(i => !i.bar).reduce((s, i) => s + i.beats, 0);
export const spellingOf = midi => defaultSpelling(((midi % 12) + 12) % 12);

// ── keys lit by the lesson (and the LUMI) ──────────────────────
export { coachGuide, onCoachGuide, setCoachGuide } from './coach-guide.js?v=202611141';

// ── clocks ─────────────────────────────────────────────────────
// Latency between what is heard and what the keyboard reports, measured once
export const latency = () => P.calib ?? 0;

// performance.now() of an audio-clock time, as it leaves the speakers
export function perfOf(audioTime) {
  const ctx = E.audio();
  if (!ctx) return performance.now();
  const out = (ctx.outputLatency || ctx.baseLatency || 0) * 1000;
  return performance.now() + (audioTime - ctx.currentTime) * 1000 + out;
}
export function audioOf(perfTime) {
  const ctx = E.audio();
  if (!ctx) return 0;
  const out = (ctx.outputLatency || ctx.baseLatency || 0);
  return ctx.currentTime + (perfTime - performance.now()) / 1000 - out;
}

// Clicks at a tempo from a given moment: returns the beat times (performance
// clock, as heard) and a stop function.
export function clicks({ bpm, count, beatsPerBar = 4, startIn = 300, volume = 0.7 }) {
  const ctx = E.audio();
  const beatMs = 60000 / bpm;
  const t0 = performance.now() + startIn;
  const times = Array.from({ length: count }, (_, i) => t0 + i * beatMs);
  if (ctx) times.forEach((tp, i) => E.click(audioOf(tp), i % beatsPerBar === 0 && beatsPerBar > 1, volume));
  return { times, beatMs };
}

// Play a parsed line on the keys (source "coach"), lighting each note.
// Resolves when done; the returned promise has cancel().
// vel(k): velocity of the k-th note; gate: share of its length it is held
export function demo(items, bpm = 90, { light = true, vel = () => 82, gate = 1 } = {}) {
  const beatMs = 60000 / bpm;
  const timers = [];
  let cancelled = false;
  const held = new Set();
  const p = new Promise(resolve => {
    const t0 = 120;
    let k = -1;
    for (const it of items) {
      if (it.bar || it.rest) continue;
      const v = vel(++k);
      timers.push(setTimeout(() => {
        it.midis.forEach(m => { press(m, v, 'coach' + m); held.add(m); });
        if (light) setCoachGuide({ midis: new Set(it.midis) });
      }, t0 + it.start * beatMs));
      timers.push(setTimeout(() => {
        it.midis.forEach(m => { lift(m); held.delete(m); });
      }, t0 + (it.start + it.beats * gate) * beatMs - 40));
    }
    timers.push(setTimeout(() => { if (light) setCoachGuide(null); resolve(!cancelled); }, t0 + lengthOf(items) * beatMs + 60));
  });
  p.cancel = () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    held.forEach(m => lift(m));
    if (light) setCoachGuide(null);
  };
  return p;
}

// Play a parsed line for the ear only: straight to the sound, no key lit, no
// note on the bus (so nothing on screen gives the answer away). Resolves when
// done; the returned promise has cancel().
let hearId = 0;
export function hear(items, bpm = 90) {
  const ctx = E.audio();
  const beatMs = 60000 / bpm;
  const src = 'ear' + (++hearId);
  const lead = 0.12;
  if (ctx) {
    const t0 = ctx.currentTime + lead;
    for (const it of items) {
      if (it.bar || it.rest) continue;
      for (const m of it.midis) {
        E.noteOn(0, m, 82, src, t0 + it.start * beatMs / 1000);
        E.noteOff(0, m, src, t0 + (it.start + it.beats) * beatMs / 1000 - 0.04);
      }
    }
  }
  let timer;
  const p = new Promise(resolve => { timer = setTimeout(() => resolve(true), lead * 1000 + lengthOf(items) * beatMs + 60); });
  p.cancel = () => { clearTimeout(timer); E.stopSource(src); };
  return p;
}

// Player's notes only: not the song, the coach, takes or suggestions
export const isPlayer = e => !/^(song|take|suggest|coach)/.test(String(e.source));

export const median = list => {
  const s = [...list].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
