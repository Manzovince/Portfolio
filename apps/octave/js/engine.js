// Audio graph. Two sound sources share one effects chain:
//   FM worklet (Phase's six-operator engine) ─┐
//   piano sampler, one tone stage per part  ──┴→ input → DJ filter → chorus
//   → delay + reverb sends → compressor → master
// Each of the two parts (A, B) is either the sampled piano or an FM patch.
import { ALGORITHMS } from './algorithms.js?v=202611122';

const V = '?v=202611122';
const SAMPLE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// The sampled piano in a few colours: shelf (dB above 2.5 kHz), lowpass (Hz), damper (s)
export const PIANO_SOUNDS = [
  { id: 'grand', shelf: 0, lp: 18000, damper: 0.25 },
  { id: 'bright', shelf: 6, lp: 20000, damper: 0.22 },
  { id: 'felt', shelf: -14, lp: 2400, damper: 0.4 },
  { id: 'hall', shelf: -3, lp: 9000, damper: 0.6 },
];

let ctx, node, nodes = {};
let meterCb = () => {};
let ready = false;
export const audio = () => ctx;
export const isRunning = () => !!ctx && ctx.state === 'running';
export const onMeter = fn => { meterCb = fn; };

let fmReady = null;
let pendingPosts = []; // settings sent before the worklet is up (notes are dropped)
const post = m => {
  if (node) node.port.postMessage(m);
  else if (!['on', 'off', 'stop', 'panic', 'bend', 'mod'].includes(m.type)) pendingPosts.push(m);
};

// ── parts ──────────────────────────────────────────────────────
const parts = [0, 1].map(() => ({ kind: 'piano', piano: PIANO_SOUNDS[0], volume: 0.85, macros: { bright: 0, attack: 0, release: 0, vibrato: 0 }, bus: null, shelf: null, lp: null }));

export async function startAudio() {
  if (ctx) { if (ctx.state !== 'running') await ctx.resume(); return ctx; }
  // iOS: play through the ring/silent switch when the browser supports it
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  ctx.resume();
  // Unlock on iOS while still inside the tap
  const unlock = ctx.createBufferSource();
  unlock.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  unlock.connect(ctx.destination);
  unlock.start();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx.state !== 'running') ctx.resume(); });
  buildFx();
  ready = true;
  // The FM engine loads in the background: the piano can play meanwhile
  fmReady = ctx.audioWorklet.addModule('js/fm-worklet.js' + V).then(() => {
    node = new AudioWorkletNode(ctx, 'phase-fm', {
      numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
      processorOptions: { algorithms: ALGORITHMS },
    });
    node.port.onmessage = e => { if (e.data.type === 'meter') meterCb(e.data); };
    node.connect(nodes.input);
    pendingPosts.forEach(m => node.port.postMessage(m));
    pendingPosts = [];
  }).catch(err => console.warn('FM engine unavailable', err));
  if (ctx.state !== 'running') ctx.resume();
  preloadSamples();
  return ctx;
}

function buildFx() {
  const c = ctx, n = nodes;
  n.input = new GainNode(c);
  for (const p of parts) {
    p.bus = new GainNode(c, { gain: p.volume });
    p.shelf = new BiquadFilterNode(c, { type: 'highshelf', frequency: 2500, gain: 0 });
    p.lp = new BiquadFilterNode(c, { type: 'lowpass', frequency: 18000, Q: 0.5 });
    p.bus.connect(p.shelf).connect(p.lp).connect(n.input);
    applyPianoTone(p);
  }
  n.lp = new BiquadFilterNode(c, { type: 'lowpass', frequency: 20000, Q: 0.7 });
  n.hp = new BiquadFilterNode(c, { type: 'highpass', frequency: 10, Q: 0.7 });
  n.analyser = new AnalyserNode(c, { fftSize: 2048, smoothingTimeConstant: 0 });
  n.input.connect(n.lp).connect(n.hp);
  n.hp.connect(n.analyser);

  // Chorus: two modulated delay lines panned apart, mixed with the dry signal
  n.chIn = new GainNode(c);
  n.chDry = new GainNode(c, { gain: 1 });
  n.chWet = new GainNode(c, { gain: 0 });
  n.chOut = new GainNode(c);
  n.hp.connect(n.chIn);
  n.chIn.connect(n.chDry).connect(n.chOut);
  n.chLfo = [];
  [-0.8, 0.8].forEach((pan, i) => {
    const d = new DelayNode(c, { delayTime: 0.012 + i * 0.004, maxDelayTime: 0.05 });
    const lfo = new OscillatorNode(c, { frequency: 0.6, type: 'sine' });
    const depth = new GainNode(c, { gain: 0.002 });
    const p = new StereoPannerNode(c, { pan });
    lfo.connect(depth).connect(d.delayTime);
    lfo.start(c.currentTime + i * 0.37);
    n.chIn.connect(d).connect(p).connect(n.chWet);
    n.chLfo.push({ lfo, depth });
  });
  n.chWet.connect(n.chOut);
  n.bus = new GainNode(c);
  n.chOut.connect(n.bus);

  // Ping-pong delay (send)
  n.dlSend = new GainNode(c, { gain: 0 });
  n.dlL = new DelayNode(c, { maxDelayTime: 2, delayTime: 0.3 });
  n.dlR = new DelayNode(c, { maxDelayTime: 2, delayTime: 0.3 });
  n.dlFb = new GainNode(c, { gain: 0.35 });
  n.dlTone = new BiquadFilterNode(c, { type: 'lowpass', frequency: 5000 });
  n.dlPanL = new StereoPannerNode(c, { pan: -0.7 });
  n.dlPanR = new StereoPannerNode(c, { pan: 0.7 });
  n.chOut.connect(n.dlSend).connect(n.dlTone).connect(n.dlL);
  n.dlL.connect(n.dlPanL).connect(n.bus);
  n.dlL.connect(n.dlR);
  n.dlR.connect(n.dlPanR).connect(n.bus);
  n.dlR.connect(n.dlFb).connect(n.dlTone);

  // Reverb (send) with a generated impulse response
  n.rvSend = new GainNode(c, { gain: 0 });
  n.rv = new ConvolverNode(c);
  n.rvTone = new BiquadFilterNode(c, { type: 'lowpass', frequency: 6000 });
  n.chOut.connect(n.rvSend).connect(n.rv).connect(n.rvTone).connect(n.bus);
  n.dlPanL.connect(n.rvSend); n.dlPanR.connect(n.rvSend);

  n.comp = new DynamicsCompressorNode(c, { threshold: -12, knee: 8, ratio: 5, attack: 0.004, release: 0.2 });
  n.master = new GainNode(c, { gain: 0.85 });
  // mute sits after the master, so a recording still hears everything
  n.mute = new GainNode(c, { gain: muted ? 0 : 1 });
  n.bus.connect(n.comp).connect(n.master).connect(n.mute).connect(c.destination);
  if (pendingFx) setFx(...pendingFx);
}

let irSize = -1;
function makeIR(size) {
  const c = ctx;
  const secs = 0.6 + size * 5.4;
  const len = Math.round(secs * c.sampleRate);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += 0.5 * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - t, 2.2) * (i < 200 ? i / 200 : 1);
    }
  }
  nodes.rv.buffer = ir;
}

const ramp = (param, v, t = 0.04) => param.setTargetAtTime(v, ctx.currentTime, t);

let pendingFx = null;
// fx: { filter: {pos -1…1, res 0…1}, chorus: {on, rate, depth, mix},
//       delay: {on, beats, fb, mix, tone}, reverb: {on, size, tone, mix}, master }
export function setFx(fx, tempo) {
  pendingFx = [fx, tempo];
  if (!ctx || !nodes.master) return;
  const n = nodes;
  const pos = fx.filter.pos;
  const q = 0.7 + fx.filter.res * 12;
  ramp(n.lp.frequency, pos < 0 ? 20000 * Math.pow(2, pos * 9.5) : 20000);
  ramp(n.hp.frequency, pos > 0 ? 10 * Math.pow(2, pos * 10.5) : 10);
  n.lp.Q.value = pos < -0.02 ? q : 0.7;
  n.hp.Q.value = pos > 0.02 ? q : 0.7;

  const ch = fx.chorus;
  ramp(n.chWet.gain, ch.on ? ch.mix * 1.2 : 0);
  ramp(n.chDry.gain, ch.on ? 1 - ch.mix * 0.35 : 1);
  n.chLfo.forEach(({ lfo, depth }, i) => {
    ramp(lfo.frequency, ch.rate * (i ? 1.13 : 1));
    ramp(depth.gain, 0.0005 + ch.depth * 0.0045);
  });

  const dl = fx.delay;
  const secs = Math.min(2, (60 / tempo) * dl.beats);
  ramp(n.dlL.delayTime, secs, 0.08);
  ramp(n.dlR.delayTime, secs, 0.08);
  ramp(n.dlSend.gain, dl.on ? dl.mix : 0);
  ramp(n.dlFb.gain, Math.min(0.92, dl.fb));
  ramp(n.dlTone.frequency, 800 * Math.pow(2, dl.tone * 4.5));

  const rv = fx.reverb;
  if (Math.abs(rv.size - irSize) > 0.02) { irSize = rv.size; makeIR(rv.size); }
  ramp(n.rvSend.gain, rv.on ? rv.mix * 0.9 : 0);
  ramp(n.rvTone.frequency, 1200 * Math.pow(2, rv.tone * 4));

  ramp(n.master.gain, fx.master);
}

export const analyser = () => nodes.analyser || null;

// Octave's own sound off (a piano that sounds by itself, played over MIDI)
let muted = false;
export function setMuted(on) {
  muted = on;
  if (ctx && nodes.mute) nodes.mute.gain.setTargetAtTime(on ? 0 : 1, ctx.currentTime, 0.015);
}

// Metronome tick, straight to the output (no effects): a short pitched blip
export function click(t, accent, volume = 0.6) {
  if (!ctx || !nodes.master) return;
  const o = new OscillatorNode(ctx, { type: 'sine', frequency: accent ? 1760 : 1180 });
  const g = new GainNode(ctx, { gain: 0 });
  const at = Math.max(t, ctx.currentTime);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(volume * (accent ? 0.5 : 0.32), at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + 0.08);
}

// Everything audible (after the master volume), for recording to an audio file
let captureNode = null;
export function captureStream() {
  if (!ctx || !nodes.master) return null;
  if (!captureNode) {
    captureNode = ctx.createMediaStreamDestination();
    nodes.master.connect(captureNode);
  }
  return captureNode.stream;
}

// ── piano sampler ──────────────────────────────────────────────
const samples = new Map(); // midi -> Promise<AudioBuffer>
const pianoVoices = [];    // { part, note, src, node, gain, startAt, released }

function loadSample(midi) {
  if (!samples.has(midi)) {
    const name = SAMPLE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
    const p = fetch(`sound/piano/${name}.mp3`)
      .then(r => { if (!r.ok) throw new Error(name + ': ' + r.status); return r.arrayBuffer(); })
      .then(d => ctx.decodeAudioData(d))
      .catch(err => { samples.delete(midi); throw err; });
    samples.set(midi, p);
  }
  return samples.get(midi);
}

let preloaded = false;
function preloadSamples() {
  if (preloaded || !parts.some(p => p.kind === 'piano')) return;
  preloaded = true;
  const queue = [];
  for (let d = 0; d <= 24; d++) queue.push(60 + d, 60 - d - 1);
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 50));
  const step = () => {
    const batch = queue.splice(0, 4);
    if (!batch.length) return;
    Promise.allSettled(batch.map(loadSample)).then(() => idle(step));
  };
  idle(step);
}

const velGain = v => 0.06 + 0.94 * Math.pow(v / 127, 1.6);
const damperOf = p => p.piano.damper * Math.pow(2, p.macros.release * 2);

function applyPianoTone(p) {
  if (!p.shelf) return;
  const bright = p.macros.bright; // -1…1
  p.shelf.gain.setTargetAtTime(p.piano.shelf + bright * 9, ctx.currentTime, 0.03);
  p.lp.frequency.setTargetAtTime(Math.min(20000, p.piano.lp * Math.pow(2, bright * 2)), ctx.currentTime, 0.03);
}

function pianoOn(pi, note, vel, src, t) {
  if (note < 21 || note > 108) return;
  const p = parts[pi];
  const v = { part: pi, note, src, node: null, gain: null, startAt: t || ctx.currentTime, released: false, releaseAt: null };
  pianoVoices.push(v);
  // A key struck again stops the previous strike of the same key and source
  for (const o of pianoVoices) if (o !== v && o.part === pi && o.note === note && o.src === src && !o.released) releasePiano(o, v.startAt);
  loadSample(note).then(buffer => {
    if (v.released && v.releaseAt != null && v.releaseAt <= ctx.currentTime) return dropVoice(v);
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    const g = ctx.createGain();
    const at = Math.max(ctx.currentTime, v.startAt);
    const atk = Math.max(0, p.macros.attack) * 0.25;
    if (atk > 0.002) { g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(velGain(vel), at + atk); }
    else g.gain.value = velGain(vel);
    s.connect(g).connect(p.bus);
    s.start(at);
    s.onended = () => { g.disconnect(); dropVoice(v); };
    v.node = s; v.gain = g;
    if (v.released) applyRelease(v, v.releaseAt ?? ctx.currentTime);
  }).catch(() => dropVoice(v));
}

function dropVoice(v) {
  const i = pianoVoices.indexOf(v);
  if (i >= 0) pianoVoices.splice(i, 1);
}

function applyRelease(v, at) {
  const rel = damperOf(parts[v.part]);
  at = Math.max(at, ctx.currentTime);
  v.gain.gain.cancelScheduledValues(at);
  v.gain.gain.setTargetAtTime(0, at, rel / 4);
  try { v.node.stop(at + rel * 1.5); } catch {}
}

function releasePiano(v, at) {
  if (v.released) return;
  v.released = true;
  v.releaseAt = at;
  if (v.node) applyRelease(v, at);
}

function pianoOff(pi, note, src, t) {
  const at = t || ctx.currentTime;
  for (let i = pianoVoices.length - 1; i >= 0; i--) {
    const v = pianoVoices[i];
    if (v.part === pi && v.note === note && v.src === src && !v.released) { releasePiano(v, at); return; }
  }
}

// ── public note API (part-aware) ───────────────────────────────
export function setPart(i, { kind, piano, patch, macros, volume }) {
  const p = parts[i];
  if (kind && kind !== p.kind) { stopPart(i); p.kind = kind; }
  if (piano) p.piano = piano;
  if (macros) p.macros = { ...macros };
  if (volume != null) p.volume = volume;
  if (ctx && p.bus) { p.bus.gain.setTargetAtTime(p.volume, ctx.currentTime, 0.02); applyPianoTone(p); }
  if (p.kind === 'fm' && patch) post({ type: 'patch', part: i, patch });
  post({ type: 'macros', part: i, macros: p.macros });
  post({ type: 'volume', part: i, value: p.volume });
  if (p.kind === 'piano' && ready) preloadSamples();
}
export const setPatch = (i, patch) => post({ type: 'patch', part: i, patch });
export function setMacros(i, macros) { parts[i].macros = { ...macros }; post({ type: 'macros', part: i, macros }); if (ctx) applyPianoTone(parts[i]); }
export function setVolume(i, v) { parts[i].volume = v; post({ type: 'volume', part: i, value: v }); if (ctx && parts[i].bus) parts[i].bus.gain.setTargetAtTime(v, ctx.currentTime, 0.02); }

export function noteOn(part, note, vel, src = 'live', t = 0) {
  if (!ready) return;
  if (parts[part].kind === 'piano') pianoOn(part, note, vel, src, t);
  else post({ type: 'on', part, note, vel, src, t });
}
export function noteOff(part, note, src = 'live', t = 0) {
  if (!ready) return;
  if (parts[part].kind === 'piano') pianoOff(part, note, src, t);
  else post({ type: 'off', part, note, src, t });
}
export const bend = semis => post({ type: 'bend', semis });
export const modWheel = value => post({ type: 'mod', value });
export const setPoly = n => post({ type: 'poly', n });

function stopPart(i) {
  if (!ctx) return;
  for (const v of [...pianoVoices]) if (v.part === i) releasePiano(v, ctx.currentTime);
  post({ type: 'panic' });
}
// Stop scheduled and sounding notes from one source (arp / seq)
export function stopSource(src) {
  post({ type: 'stop', src });
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const v of [...pianoVoices]) {
    if (v.src !== src) continue;
    if (v.startAt > now + 0.005) { v.released = true; v.releaseAt = now; if (v.node) { try { v.node.stop(); } catch {} } dropVoice(v); }
    else releasePiano(v, now);
  }
}
export function panic() {
  post({ type: 'panic' });
  if (ctx) for (const v of [...pianoVoices]) releasePiano(v, ctx.currentTime);
}
export const busy = () => pianoVoices.length > 0;
