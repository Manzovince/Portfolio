// Between the note bus and the engine: split, per-part octave, velocity curve,
// arpeggiator, step sequencer (playback, step and live recording, transpose)
// and the shared tempo clock. Song playback skips the arp and the sequencer.
import * as E from './engine.js?v=202611121';
import { PIANO_SOUNDS } from './engine.js?v=202611121';
import { S, save, emit } from './store.js?v=202611121';
import { subscribe } from './notes.js?v=202611121';

const held = new Map(); // midi -> { part, note, arp } | { transpose: true }

const curve = v => {
  const c = S.midi.velCurve;
  if (c === 'fixed') return 100;
  const x = v / 127;
  const y = c === 'soft' ? Math.pow(x, 0.6) : c === 'hard' ? Math.pow(x, 1.6) : x;
  return Math.max(1, Math.min(127, Math.round(y * 127)));
};

export const partOf = key => (S.split.on && key >= S.split.point ? 1 : 0);
const arpOn = part => S.arp.on && (S.arp.target === 'all' || S.arp.target === part || !S.split.on);

// ── arpeggiator ────────────────────────────────────────────────
const arps = [0, 1].map(() => ({ notes: [], down: 0, idx: 0, next: 0 }));

function arpAdd(part, note, vel) {
  const A = arps[part];
  if (S.arp.latch && A.down === 0) A.notes = [];
  A.down++;
  if (!A.notes.find(n => n.note === note)) A.notes.push({ note, vel });
}
function arpRemove(part, note) {
  const A = arps[part];
  A.down = Math.max(0, A.down - 1);
  if (!S.arp.latch) A.notes = A.notes.filter(n => n.note !== note);
}
export function arpClear() {
  for (const A of arps) { A.notes = []; A.down = 0; A.next = 0; }
  E.stopSource('arp');
}

function arpSequence(A) {
  const oct = S.arp.octaves;
  const expand = list => { const out = []; for (let o = 0; o < oct; o++) for (const n of list) out.push({ note: n.note + 12 * o, vel: n.vel }); return out; };
  const up = expand([...A.notes].sort((a, b) => a.note - b.note));
  switch (S.arp.mode) {
    case 'down': return up.reverse();
    case 'updown': return up.length > 2 ? [...up, ...up.slice(1, -1).reverse()] : up;
    case 'order': return expand(A.notes);
    default: return up;
  }
}
function arpPick(A) {
  if (S.arp.mode === 'chord') return A.notes;
  const list = arpSequence(A);
  if (S.arp.mode === 'random') return [list[(Math.random() * list.length) | 0]];
  const n = list[A.idx % list.length];
  A.idx = (A.idx + 1) % list.length;
  return [n];
}

// ── sequencer ──────────────────────────────────────────────────
export const seq = { playing: false, rec: false, step: 0, next: 0, cursor: 0, transpose: 0, marks: [], recDown: 0 };
export const seqHasNotes = () => S.seq.steps.some(s => s.notes.length);

export function seqPlay(on = !seq.playing) {
  const ctx = E.audio();
  if (!ctx) return;
  seq.playing = on;
  if (on) { seq.step = 0; seq.next = ctx.currentTime + 0.06; seq.marks = []; }
  else { E.stopSource('seq'); seq.marks = []; }
  emit('seq');
}
export function seqPosition() {
  const ctx = E.audio();
  if (!ctx || !seq.playing) return -1;
  const now = ctx.currentTime;
  while (seq.marks.length > 1 && seq.marks[1].t <= now) seq.marks.shift();
  return seq.marks.length && seq.marks[0].t <= now ? seq.marks[0].step : -1;
}
export function seqRest() {
  S.seq.steps[seq.cursor].notes = [];
  seq.cursor = (seq.cursor + 1) % S.seq.length;
  save(); emit('seq');
}

function seqRecord(note, vel) {
  const steps = S.seq.steps;
  if (seq.playing) {
    const st = steps[Math.max(0, seqPosition())];
    if (!st.notes.includes(note) && st.notes.length < 6) st.notes.push(note);
    st.on = true; st.vel = vel;
  } else {
    const st = steps[seq.cursor];
    if (seq.recDown === 0) { st.notes = [note]; st.vel = vel; st.on = true; }
    else if (!st.notes.includes(note) && st.notes.length < 6) st.notes.push(note);
    seq.recDown++;
  }
  save(); emit('seq');
}
function seqRecordUp() {
  if (seq.playing || seq.recDown === 0) return;
  seq.recDown--;
  if (seq.recDown === 0) { seq.cursor = (seq.cursor + 1) % S.seq.length; emit('seq'); }
}

// ── keys (from the note bus) ───────────────────────────────────
// Split learning: the next key played sets the split point
let learnCb = null;
export const learnSplit = fn => { learnCb = fn; };

function keyOn(key, vel, source) {
  if (held.has(key)) keyOff(key);
  if (learnCb && !String(source).startsWith('song')) { const cb = learnCb; learnCb = null; cb(key); }
  const fromSong = String(source).startsWith('song');
  vel = fromSong ? vel : curve(vel);
  const part = partOf(key);
  if (!fromSong && S.seq.transpose && seq.playing && part === S.seq.part && !seq.rec) {
    seq.transpose = key - 60;
    held.set(key, { transpose: true });
    emit('seq');
    return;
  }
  const note = key + S.parts[part].octave * 12;
  if (!fromSong && seq.rec && part === S.seq.part) seqRecord(note, vel);
  if (!fromSong && arpOn(part)) {
    arpAdd(part, note, vel);
    held.set(key, { part, note, arp: true });
  } else {
    E.noteOn(part, note, vel);
    held.set(key, { part, note, rec: !fromSong && seq.rec });
  }
}

function keyOff(key) {
  const h = held.get(key);
  if (!h) return;
  held.delete(key);
  if (h.transpose) return;
  if (h.rec) seqRecordUp();
  if (h.arp) arpRemove(h.part, h.note);
  else E.noteOff(h.part, h.note);
}

subscribe(e => {
  if (e.type === 'on') keyOn(e.midi, e.velocity, e.source);
  else if (e.type === 'off') keyOff(e.midi);
});

export function allOff() {
  for (const k of [...held.keys()]) keyOff(k);
  arpClear();
  E.panic();
}

// ── clock ──────────────────────────────────────────────────────
const LOOK = 0.12;
function tick() {
  const ctx = E.audio();
  if (!ctx) return;
  const now = ctx.currentTime, horizon = now + LOOK;
  const beat = 60 / S.tempo;

  if (seq.playing) {
    const dur = beat / 4;
    if (seq.next < now - 0.2) seq.next = now + 0.02; // tab was asleep
    while (seq.next < horizon) {
      const i = seq.step;
      const st = S.seq.steps[i];
      const t = seq.next + (i % 2 ? S.seq.swing * dur * 0.5 : 0);
      if (st.on && st.notes.length) {
        for (const n of st.notes) {
          const note = n + seq.transpose;
          E.noteOn(S.seq.part, note, st.vel, 'seq', t);
          E.noteOff(S.seq.part, note, 'seq', t + dur * S.seq.gate * 0.98);
        }
      }
      seq.marks.push({ t, step: i });
      seq.step = (i + 1) % S.seq.length;
      seq.next += dur;
    }
  }

  for (let p = 0; p < 2; p++) {
    const A = arps[p];
    if (!A.notes.length || !S.arp.on) { A.next = 0; A.idx = 0; continue; }
    const dur = beat * S.arp.rate;
    if (!A.next || A.next < now - 0.2) {
      // follow the sequencer grid when it runs, otherwise start now
      A.next = seq.playing ? seq.next - Math.floor((seq.next - now) / dur) * dur : now + 0.005;
    }
    while (A.next < horizon) {
      for (const n of arpPick(A)) {
        E.noteOn(p, n.note, n.vel, 'arp', A.next);
        E.noteOff(p, n.note, 'arp', A.next + dur * Math.min(0.95, S.arp.gate));
      }
      A.next += dur;
    }
  }
}
setInterval(tick, 25);

// Push a part's sound, macros and volume to the engine
export function applyPart(i) {
  const p = S.parts[i];
  E.setPart(i, {
    kind: p.kind,
    piano: p.kind === 'piano' ? PIANO_SOUNDS[p.ref.i] || PIANO_SOUNDS[0] : null,
    patch: p.kind === 'fm' ? p.patch : null,
    macros: p.macros,
    volume: p.volume,
  });
}
export function applyAll() {
  applyPart(0); applyPart(1);
  E.setPoly(S.midi.poly);
  E.setFx(S.fx, S.tempo);
  E.setMuted(S.mute);
}
