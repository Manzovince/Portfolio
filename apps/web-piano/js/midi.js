// Web MIDI input. iOS Safari has no Web MIDI: on iPhone / iPad open the app in
// a browser that adds it (Web MIDI Browser). Outputs are only used by lumi.js,
// and only when the LUMI guide lights are switched on.
import { press, lift, setPedal, allNotesOff } from './notes.js?v=202611102';
import * as E from './engine.js?v=202611102';
import { S } from './store.js?v=202611102';

let access = null;
let stateCb = () => {};
const accessCbs = new Set();
export let status = { state: 'idle', inputs: [] };

export const onMidiState = fn => { stateCb = fn; };
export const midiAccess = () => access;
export const onMidiAccess = fn => accessCbs.add(fn);

function parse(d) {
  const st = d[0] & 0xf0, a = d[1], b = d[2] ?? 0;
  switch (st) {
    case 0x90: b > 0 ? press(a, b, 'midi') : lift(a); break;
    case 0x80: lift(a); break;
    case 0xb0:
      if (a === 64) setPedal(b >= 64);
      else if (a === 1) E.modWheel(b / 127);
      else if (a === 120 || a === 123) allNotesOff();
      break;
    case 0xe0: if (S.midi.bend) E.bend(((((b << 7) | a) - 8192) / 8192) * S.midi.bendRange); break;
  }
}

function update() {
  const inputs = [...access.inputs.values()];
  const sel = S.midi.input;
  for (const inp of inputs) inp.onmidimessage = sel === 'all' || sel === inp.id ? e => parse(e.data) : null;
  status = { state: inputs.length ? 'connected' : 'none', inputs: inputs.map(i => ({ id: i.id, name: i.name || 'MIDI' })) };
  stateCb(status);
  accessCbs.forEach(fn => fn(access));
}

export function selectInput(id) {
  S.midi.input = id;
  if (access) update();
}

// SysEx is a separate permission, only asked for when the LUMI lights are on
export async function connectMidi(sysex = S.lumi.enabled) {
  if (!navigator.requestMIDIAccess) {
    status = { state: 'unsupported', inputs: [] };
    return stateCb(status);
  }
  try {
    const next = await navigator.requestMIDIAccess({ sysex });
    if (access && access !== next) { access.onstatechange = null; access.inputs.forEach(i => (i.onmidimessage = null)); }
    access = next;
    access.onstatechange = update;
    update();
  } catch {
    if (sysex) return connectMidi(false);
    status = { state: 'denied', inputs: [] };
    stateCb(status);
  }
}
