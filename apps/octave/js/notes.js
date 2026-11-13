// Note state: the single source of truth for what is being played.
//
// Every input (MIDI, on-screen keys, computer keys, song playback) goes through
// press/lift, and every output (sound, keys, roll, staff, lights, exercises)
// listens to the "on"/"off" events emitted here. A note sounds from press until
// it is lifted, or with the pedal down, until the pedal comes back up.
//
// Two pedals: the player's (MIDI, space bar) and the playback's (a song or a
// take). Each one only holds the notes of its own side, so a song's pedal never
// sustains what the player plays, and lifting the foot never cuts the song.
//
// `at` (optional, audio-clock seconds): when the sound should start or stop.
// Playback schedules its notes a few ms ahead so they sound in time even when
// the page stutters; live input leaves it out (= now).

const listeners = new Set();
const pressed = new Map();   // midi -> source
const sounding = new Map();  // midi -> { velocity, start, source }
const sustained = new Set(); // lifted while their pedal was down
const pedals = { player: false, auto: false };
// whose pedal holds a note: playback sources (song…, take…) use the 'auto' pedal
export const pedalOf = source => (/^(song|take)/.test(String(source)) ? 'auto' : 'player');

export const LOWEST = 21;   // A0
export const HIGHEST = 108; // C8

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = e => listeners.forEach(fn => fn(e));

export function press(midi, velocity = 90, source = 'keys', at = 0) {
  if (midi < LOWEST || midi > HIGHEST) return;
  // Striking a note that still rings restarts it, like a hammer
  if (sounding.has(midi)) end(midi, at);
  sustained.delete(midi);
  pressed.set(midi, source);
  const start = performance.now();
  sounding.set(midi, { velocity, start, source });
  emit({ type: 'on', midi, velocity, time: start, source, at });
}

export function lift(midi, at = 0) {
  if (!pressed.has(midi)) return;
  const source = pressed.get(midi);
  pressed.delete(midi);
  if (pedals[pedalOf(source)]) sustained.add(midi);
  else end(midi, at);
}

function end(midi, at = 0) {
  const info = sounding.get(midi);
  if (!info) return;
  sounding.delete(midi);
  sustained.delete(midi);
  emit({ type: 'off', midi, time: performance.now(), source: info.source, at });
}

// who: 'player' (default) or 'auto' (song / take playback)
export function setPedal(down, at = 0, who = 'player') {
  if (pedals[who] === down) return;
  pedals[who] = down;
  if (!down) {
    for (const midi of [...sustained]) if (pedalOf(sounding.get(midi)?.source) === who) end(midi, at);
  }
  emit({ type: 'pedal', down, who });
}

// Release everything one input is holding (e.g. when the window loses focus)
export function liftSource(source, at = 0) {
  for (const [midi, src] of [...pressed]) if (src === source || (source.endsWith('*') && src.startsWith(source.slice(0, -1)))) lift(midi, at);
}

export function allNotesOff() {
  pressed.clear();
  sustained.clear();
  pedals.player = pedals.auto = false;
  for (const midi of [...sounding.keys()]) end(midi);
}

export const soundingNotes = () => [...sounding.keys()].sort((a, b) => a - b);
export const noteInfo = midi => sounding.get(midi);
export const isPressed = midi => pressed.has(midi);
export const isPedalDown = (who = 'player') => pedals[who];
