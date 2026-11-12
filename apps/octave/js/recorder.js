// Recorder: takes of what is played (keys and pedal, with their real timing),
// kept in this browser. A take plays back through the note bus, so it sounds
// with the current sounds and shows on the keys; it exports as MIDI, or as an
// audio file recorded in real time from the output.
import { subscribe, press, liftSource, setPedal } from './notes.js?v=202611127';
import * as E from './engine.js?v=202611127';
import { S, emit } from './store.js?v=202611127';

const KEY = 'octave.takes.v1';
const MAX_TAKES = 30;
const SRC = 'take';

let recording = false;
let startAt = 0;          // performance.now() of the first event (leading silence is trimmed)
let events = [];
let held = new Set();
let playing = null;       // { id, timer, start, i }
export let takes = load();

function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch { return []; }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(takes)); return true; } catch { return false; }
}

export const isRecording = () => recording;
export const recordingMs = () => (recording && events.length ? performance.now() - startAt : 0);
export const playingTake = () => playing?.id ?? null;

subscribe(e => {
  if (!recording) return;
  const src = String(e.source ?? '');
  if (src.startsWith('song') || src.startsWith(SRC)) return;
  if (e.type !== 'on' && e.type !== 'off' && e.type !== 'pedal') return;
  const now = e.time ?? performance.now();
  if (!events.length) {
    if (e.type !== 'on') return; // start with the first note
    startAt = now;
  }
  const t = Math.round(now - startAt);
  if (e.type === 'on') { events.push({ t, on: e.midi, v: e.velocity }); held.add(e.midi); }
  else if (e.type === 'off') { if (held.delete(e.midi)) events.push({ t, off: e.midi }); }
  else events.push({ t, pedal: e.down ? 1 : 0 });
});

export function startRecording() {
  stopTake();
  recording = true;
  events = [];
  held = new Set();
  emit('rec');
}

// Returns the new take, or null when nothing was played
export function stopRecording() {
  if (!recording) return null;
  recording = false;
  const end = events.length ? Math.round(performance.now() - startAt) : 0;
  for (const midi of held) events.push({ t: end, off: midi });
  held.clear();
  let take = null;
  if (events.some(e => e.on != null)) {
    const n = (takes.reduce((a, t) => Math.max(a, t.n || 0), 0)) + 1;
    take = { id: 't' + Date.now().toString(36), n, date: Date.now(), dur: end, tempo: S.tempo, events };
    takes.unshift(take);
    takes = takes.slice(0, MAX_TAKES);
    persist();
  }
  events = [];
  emit('rec');
  return take;
}

export function deleteTake(id) {
  if (playing?.id === id) stopTake();
  takes = takes.filter(t => t.id !== id);
  persist();
  emit('rec');
}

export function renameTake(id, name) {
  const t = takes.find(x => x.id === id);
  if (!t) return;
  t.name = name.slice(0, 40);
  persist();
}

// ── playback ───────────────────────────────────────────────────
export function playTake(id, onEnd, onAbort) {
  stopTake();
  const take = takes.find(t => t.id === id);
  if (!take) return;
  const p = { id, start: performance.now(), i: 0, take, onEnd, onAbort, ended: false };
  p.timer = setInterval(() => step(p), 8);
  playing = p;
  emit('rec');
}

function step(p) {
  const t = performance.now() - p.start;
  const ev = p.take.events;
  while (p.i < ev.length && ev[p.i].t <= t) {
    const e = ev[p.i++];
    if (e.on != null) press(e.on, e.v, SRC + e.on);
    else if (e.off != null) liftSource(SRC + e.off);
    else setPedal(!!e.pedal);
  }
  if (p.i >= ev.length) {
    p.ended = true;
    const end = p.onEnd;
    stopTake();
    end && end();
  }
}

export function stopTake() {
  if (!playing) return;
  const p = playing;
  clearInterval(p.timer);
  playing = null;
  if (!p.ended && p.onAbort) p.onAbort();
  liftSource(SRC + '*');
  setPedal(false);
  emit('rec');
}

export const takeProgress = () => (playing ? Math.min(1, (performance.now() - playing.start) / Math.max(1, playing.take.dur)) : 0);

// ── exports ────────────────────────────────────────────────────
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fileBase = take => 'octave-' + (take.name || 'take-' + take.n).replace(/[^\w-]+/g, '_');

// Standard MIDI file (format 0), at the tempo of the take so it lines up in a DAW
export function exportTakeMidi(id) {
  const take = takes.find(t => t.id === id);
  if (!take) return;
  const PPQ = 480;
  const beatMs = 60000 / (take.tempo || 100);
  const tick = ms => Math.round(ms / beatMs * PPQ);
  const evs = take.events.map(e => ({
    tick: tick(e.t),
    order: e.on != null ? 1 : 0,
    bytes: e.on != null ? [0x90, e.on, Math.max(1, e.v)] : e.off != null ? [0x80, e.off, 0] : [0xb0, 64, e.pedal ? 127 : 0],
  })).sort((a, b) => a.tick - b.tick || a.order - b.order);
  const varLen = n => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; };
  const us = Math.round(beatMs * 1000);
  const track = [0, 0xff, 0x51, 3, (us >> 16) & 0xff, (us >> 8) & 0xff, us & 0xff];
  let last = 0;
  for (const e of evs) { track.push(...varLen(e.tick - last), ...e.bytes); last = e.tick; }
  track.push(0, 0xff, 0x2f, 0);
  const u32 = n => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  const head = [0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, PPQ >> 8, PPQ & 0xff];
  download(new Blob([new Uint8Array([...head, 0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), ...track])], { type: 'audio/midi' }), fileBase(take) + '.mid');
}

// Audio: the take is played again in real time and the output recorded
export function audioExportSupported() {
  return typeof MediaRecorder !== 'undefined' && !!E.audio();
}
export function exportTakeAudio(id, onState) {
  const take = takes.find(t => t.id === id);
  const stream = E.captureStream();
  if (!take || !stream || typeof MediaRecorder === 'undefined') return false;
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(m => MediaRecorder.isTypeSupported?.(m)) || '';
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const mime = rec.mimeType || type || 'audio/webm';
    const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
    download(new Blob(chunks, { type: mime }), fileBase(take) + '.' + ext);
    onState && onState('done');
  };
  rec.start();
  onState && onState('recording');
  // leave room for the reverb tail
  const stop = () => rec.state !== 'inactive' && rec.stop();
  playTake(id, () => setTimeout(stop, 1800), stop);
  return true;
}
