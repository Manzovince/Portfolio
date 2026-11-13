// The accompaniment bass of the chord suggestions: while the player holds a
// chord, Octave plays its root low down, held, in a rhythm, walking towards
// the next suggested chord, or improvising a jazz line, at the tempo. Its sound is a bass of its own (part 2
// of the engine) or the player's sound (part A).
import * as E from './engine.js?v=202611131';
import { S } from './store.js?v=202611131';
import { FACTORY } from './presets.js?v=202611131';
import { soundingNotes } from './notes.js?v=202611131';
import { clonePatch } from './dx7.js?v=202611131';

const SRC = 'bass';
const BASS_PATCH = () => clonePatch(FACTORY.find(p => p.name === 'Basse ronde') || FACTORY.find(p => p.cat === 'Basses'));
let chord = null;         // { root, third, fifth } pitch classes of the chord held
let next = () => null;    // pitch class the music heads for (first suggestion)
let timer = 0, t0 = 0;

export const setBassTarget = fn => { next = fn; };

// Part 2 follows the choice of sound; "mine" plays on part A instead
export function applyBassSound() { E.setVolume(2, S.bass.volume); }
// set up before the audio starts, so switching part 2 to FM silences nothing
E.setPart(2, { kind: 'fm', patch: BASS_PATCH(), volume: S.bass.volume });
const part = () => (S.bass.sound === 'mine' ? 0 : 2);
// The bass patch sounds an octave below the note sent (transpose −12): aim for
// E1–D♯2 either way, C2–B2 with the piano so it doesn't rumble
const low = pc => (S.bass.sound === 'mine' ? 36 + pc : 40 + ((pc - 4 + 12) % 12));

function play(midi, beats, vel, at) {
  const ctx = E.audio();
  if (!ctx) return;
  const spb = 60 / (S.tempo || 100);
  const p = part();
  E.noteOn(p, midi, vel, SRC, at);
  E.noteOff(p, midi, SRC, at + beats * spb * 0.95);
}

// One bar of notes for a chord, by style: [beat, semitones above the root | 'third' | 'to', length, velocity]
const PATTERNS = {
  rhythm: [[0, 0, 1.4, 100], [1.5, 0, 0.45, 78], [2, 7, 0.9, 88], [3, 12, 0.85, 82]],
  walk: [[0, 0, 0.92, 100], [1, 'third', 0.92, 84], [2, 7, 0.92, 88], [3, 'to', 0.92, 80]],
};
// where the line is heading: the next suggested chord's root, near `from`
function goalNear(c, from) {
  let goal = low(next() ?? c.root);
  while (goal - from > 6) goal -= 12;
  while (from - goal > 6) goal += 12;
  return goal;
}
function noteOf(step, c) {
  const root = low(c.root);
  if (step === 'third') return root + ((c.third - c.root + 12) % 12);
  if (step === 'to') {
    // a semitone next to where it is going (the next chord's root, or back home)
    const goal = goalNear(c, root + 7);
    return goal + (goal > root + 7 ? -1 : 1);
  }
  return root + step;
}

// ── impro: a jazz walking line, different every bar ─────────────
// Quarter notes that land on a chord tone on beat 1, wander through chord and
// scale tones, and lean into the next chord by a semitone on beat 4; now and
// then a swung pair of eighths, a ghost note, an octave leap.
const rnd = (a, b) => a + Math.random() * (b - a);
const chance = p => Math.random() < p;
const pickOf = list => list[Math.floor(Math.random() * list.length)];
let lastMidi = null;
function range() { const lo = S.bass.sound === 'mine' ? 36 : 40; return { lo, hi: lo + 19 }; }
function into(m) { const { lo, hi } = range(); while (m < lo) m += 12; while (m > hi) m -= 12; return m; }
function improBar(c) {
  const { lo, hi } = range();
  const r = c.root;
  const minor = c.third === (r + 3) % 12;
  const fifth = c.fifth ?? (r + 7) % 12;
  const seventh = (r + (minor ? 10 : chance(0.5) ? 10 : 9)) % 12;   // ♭7 (or the 6th on a major chord)
  const tones = [r, c.third, fifth, seventh];
  const passing = [(r + 2) % 12, (r + 5) % 12, (r + (minor ? 8 : 9)) % 12];
  const near = (from, pcs, maxStep = 5) => {
    const opts = [];
    for (const pc of pcs) for (let m = lo; m <= hi; m++) if (m % 12 === pc && m !== from && Math.abs(m - from) <= maxStep) opts.push(m);
    return opts.length ? pickOf(opts) : into(from + pickOf([-2, 2]));
  };
  // beat 1: the root most of the time, else the third or fifth
  let b1 = into(low(chance(0.78) ? r : pickOf([c.third, fifth])));
  if (lastMidi != null && Math.abs(b1 - lastMidi) > 7 && b1 + 12 <= hi) b1 += 12;
  if (chance(0.12) && b1 + 12 <= hi) b1 += 12;            // an octave up, for air
  const b2 = near(b1, chance(0.7) ? tones : passing);
  const b3 = near(b2, chance(0.6) ? tones : passing.concat(tones));
  // beat 4: lean into where it goes
  const goal = goalNear(c, b3);
  const b4 = chance(0.65) ? goal + (chance(0.5) ? 1 : -1)       // chromatic approach
    : chance(0.6) ? goal + (goal > b3 ? -2 : 2)                  // a step of the scale
    : into(goal + 7);                                            // its own fifth
  // never the same note twice before the next chord: then the semitone on the other side
  let b4n = into(b4);
  if (b4n === b3) b4n = into(goal + (goal > b3 ? -1 : 1));
  if (b4n === b3) b4n = into(goal - (goal > b3 ? -1 : 1));
  const line = [b1, b2, b3, b4n];
  const ev = line.map((m, i) => ({ beat: i, midi: m, len: 0.92, vel: i === 0 ? Math.round(rnd(90, 104)) : Math.round(rnd(68, 88)) }));
  // a swung pair of eighths on one beat (the second a ghost or the octave)
  if (chance(0.35)) {
    const i = pickOf([1, 2, 3]);
    const e = ev[i];
    e.len = 0.6;
    const second = chance(0.5) ? e.midi : e.midi + 12 <= hi ? e.midi + 12 : e.midi - 12 >= lo ? e.midi - 12 : e.midi;
    ev.push({ beat: i + 0.66, midi: second, len: 0.3, vel: Math.round(rnd(40, 58)) });
  }
  // sometimes a short, dead note instead of a full one
  if (chance(0.15)) { const e = ev[pickOf([1, 2])]; e.len = 0.35; e.vel = Math.round(rnd(45, 60)); }
  lastMidi = line[3];
  return ev;
}

function barEvents(c) {
  if (S.bass.style === 'impro') return improBar(c);
  return PATTERNS[S.bass.style].map(([beat, step, len, vel]) => ({ beat, midi: noteOf(step, c), len, vel }));
}

// a scheduler a little ahead of the audio clock: bars are written one at a
// time, then their notes sent as their time comes; a new chord restarts it
let queue = [], bar = 0;
function pump() {
  const ctx = E.audio();
  if (!ctx || !chord) return stop();
  const spb = 60 / (S.tempo || 100);
  const ahead = ctx.currentTime + 0.25;
  while (t0 + bar * 4 * spb < ahead + 0.1) {
    for (const e of barEvents(chord)) queue.push({ ...e, at: t0 + (bar * 4 + e.beat) * spb });
    bar++;
  }
  queue.sort((x, y) => x.at - y.at);
  while (queue.length && queue[0].at < ahead) { const e = queue.shift(); play(e.midi, e.len, e.vel, Math.max(e.at, ctx.currentTime)); }
}
function stop() {
  clearInterval(timer); timer = 0;
  E.stopSource(SRC);
  chord = null; queue = []; lastMidi = null;
}

// From the chord detector: a chord is held (or null: let go)
export function bassChord(c) {
  if (S.bass.style === 'off' || S.mode !== 'play' || !S.suggest.on) { if (chord) stop(); return; }
  if (!c) return stop();
  if (chord && c.root === chord.root && c.third === chord.third) return; // same chord, same bar
  E.stopSource(SRC);
  chord = c;
  const ctx = E.audio();
  if (!ctx) return;
  if (S.bass.style === 'hold') {
    const root = low(c.root);
    E.noteOn(part(), root, 96, SRC);
    return;
  }
  // a new chord starts a new bar, right now
  t0 = ctx.currentTime + 0.01; bar = 0; queue = [];
  pump();
  if (!timer) timer = setInterval(() => { if (!soundingNotes().length) stop(); else pump(); }, 60);
}
export function bassOff() { if (chord || timer) stop(); }
