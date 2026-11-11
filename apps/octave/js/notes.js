// Note state: the single source of truth for what is being played.
//
// Every input (MIDI, on-screen keys, computer keys, song playback) goes through
// press/lift, and every output (sound, keys, roll, staff, lights, exercises)
// listens to the "on"/"off" events emitted here. A note sounds from press until
// it is lifted, or with the pedal down, until the pedal comes back up.

const listeners = new Set();
const pressed = new Map();   // midi -> source
const sounding = new Map();  // midi -> { velocity, start, source }
const sustained = new Set(); // lifted while the pedal was down
let pedal = false;

export const LOWEST = 21;   // A0
export const HIGHEST = 108; // C8

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = e => listeners.forEach(fn => fn(e));

export function press(midi, velocity = 90, source = 'keys') {
  if (midi < LOWEST || midi > HIGHEST) return;
  // Striking a note that still rings restarts it, like a hammer
  if (sounding.has(midi)) end(midi);
  sustained.delete(midi);
  pressed.set(midi, source);
  const start = performance.now();
  sounding.set(midi, { velocity, start, source });
  emit({ type: 'on', midi, velocity, time: start, source });
}

export function lift(midi) {
  if (!pressed.has(midi)) return;
  pressed.delete(midi);
  if (pedal) sustained.add(midi);
  else end(midi);
}

function end(midi) {
  const info = sounding.get(midi);
  if (!info) return;
  sounding.delete(midi);
  emit({ type: 'off', midi, time: performance.now(), source: info.source });
}

export function setPedal(down) {
  if (pedal === down) return;
  pedal = down;
  if (!down) {
    for (const midi of sustained) end(midi);
    sustained.clear();
  }
  emit({ type: 'pedal', down });
}

// Release everything one input is holding (e.g. when the window loses focus)
export function liftSource(source) {
  for (const [midi, src] of [...pressed]) if (src === source || (source.endsWith('*') && src.startsWith(source.slice(0, -1)))) lift(midi);
}

export function allNotesOff() {
  pressed.clear();
  sustained.clear();
  pedal = false;
  for (const midi of [...sounding.keys()]) end(midi);
}

export const soundingNotes = () => [...sounding.keys()].sort((a, b) => a - b);
export const noteInfo = midi => sounding.get(midi);
export const isPressed = midi => pressed.has(midi);
export const isPedalDown = () => pedal;
