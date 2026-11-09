// Web MIDI input. iOS Safari has no Web MIDI: the app is meant to be opened
// in a browser that adds it (Web MIDI Browser). Nothing is ever sent back to
// the keyboards, so the LUMI lights keep their own mode.
let access = null;
let handler = () => {};
let stateCb = () => {};
let selected = 'all';
export let status = { state: 'idle', inputs: [] };

export function onMidi(fn) { handler = fn; }
export function onMidiState(fn) { stateCb = fn; }

function update() {
  const inputs = [...access.inputs.values()];
  for (const inp of inputs) {
    inp.onmidimessage = selected === 'all' || selected === inp.id ? e => parse(e.data) : null;
  }
  status = { state: inputs.length ? 'connected' : 'none', inputs: inputs.map(i => ({ id: i.id, name: i.name || 'MIDI' })) };
  stateCb(status);
}

export function selectInput(id) {
  selected = id;
  if (access) update();
}

export async function connectMidi(input = 'all') {
  selected = input;
  if (!navigator.requestMIDIAccess) {
    status = { state: 'unsupported', inputs: [] };
    stateCb(status);
    return;
  }
  try {
    access = await navigator.requestMIDIAccess({ sysex: false });
    access.onstatechange = update;
    update();
  } catch {
    status = { state: 'denied', inputs: [] };
    stateCb(status);
  }
}

function parse(d) {
  const st = d[0] & 0xf0, a = d[1], b = d[2] ?? 0;
  switch (st) {
    case 0x90: b > 0 ? handler({ type: 'on', note: a, vel: b }) : handler({ type: 'off', note: a }); break;
    case 0x80: handler({ type: 'off', note: a }); break;
    case 0xb0:
      if (a === 64) handler({ type: 'sustain', on: b >= 64 });
      else if (a === 1) handler({ type: 'mod', value: b / 127 });
      else if (a === 120 || a === 123) handler({ type: 'panic' });
      break;
    case 0xe0: handler({ type: 'bend', value: (((b << 7) | a) - 8192) / 8192 }); break;
  }
}
