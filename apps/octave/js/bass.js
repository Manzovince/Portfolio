// The accompaniment bass of the chord suggestions: while the player holds a
// chord, Octave plays its root low down, held, in a rhythm, or walking towards
// the next suggested chord, at the tempo. Its sound is a bass of its own (part 2
// of the engine) or the player's sound (part A).
import * as E from './engine.js?v=202611128';
import { S } from './store.js?v=202611128';
import { FACTORY } from './presets.js?v=202611128';
import { soundingNotes } from './notes.js?v=202611128';
import { clonePatch } from './dx7.js?v=202611128';

const SRC = 'bass';
const BASS_PATCH = () => clonePatch(FACTORY.find(p => p.name === 'Basse ronde') || FACTORY.find(p => p.cat === 'Basses'));
let chord = null;         // { root, third, fifth } pitch classes of the chord held
let next = () => null;    // pitch class the music heads for (first suggestion)
let timer = 0, t0 = 0, beat = 0;

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

// One bar of notes for a chord, by style: [beat, semitones above the root | 'to', length, velocity]
const PATTERNS = {
  rhythm: [[0, 0, 1.4, 100], [1.5, 0, 0.45, 78], [2, 7, 0.9, 88], [3, 12, 0.85, 82]],
  walk: [[0, 0, 0.92, 100], [1, 'third', 0.92, 84], [2, 7, 0.92, 88], [3, 'to', 0.92, 80]],
};
function noteOf(step, c) {
  const root = low(c.root);
  if (step === 'third') return root + ((c.third - c.root + 12) % 12);
  if (step === 'to') {
    // a semitone next to where it is going (the next chord's root, or back home)
    const target = next() ?? c.root;
    let goal = low(target);
    if (Math.abs(goal - (root + 7)) > 6) goal += goal < root + 7 ? 12 : -12;
    return goal + (goal > root + 7 ? -1 : 1);
  }
  return root + step;
}

// a scheduler a little ahead of the audio clock, restarted on each new chord
function pump() {
  const ctx = E.audio();
  if (!ctx || !chord) return stop();
  const spb = 60 / (S.tempo || 100);
  const pattern = PATTERNS[S.bass.style];
  while (t0 + beat * spb < ctx.currentTime + 0.25) {
    const inBar = beat % 4;
    for (const [b, step, len, vel] of pattern) if (Math.abs(b - inBar) < 1e-6) play(noteOf(step, chord), len, vel, t0 + beat * spb);
    beat += 0.5;
  }
}
function stop() {
  clearInterval(timer); timer = 0;
  E.stopSource(SRC);
  chord = null;
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
  t0 = ctx.currentTime + 0.01; beat = 0;
  pump();
  if (!timer) timer = setInterval(() => { if (!soundingNotes().length) stop(); else pump(); }, 60);
}
export function bassOff() { if (chord || timer) stop(); }
