// Synthesized chiptune-ish sounds, no audio files.
import { S } from './state.js?v=1';

let ctx = null, master = null, noise = null;
const last = {};

export function unlock() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

const ok = (name, gap = 0) => {
  if (!ctx || !S.sound) return false;
  const t = ctx.currentTime;
  if (gap && last[name] && t - last[name] < gap) return false;
  last[name] = t;
  return true;
};

function tone(freq, dur, { type = 'square', vol = 0.2, at = 0, slide = 0, attack = 0.004 } = {}) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function hiss(dur, { vol = 0.2, at = 0, freq = 3000, q = 1, type = 'bandpass' } = {}) {
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}

// Metal-on-metal: two inharmonic partials and a click.
export function clink(strength = 1) {
  if (!ok('clink', 0.035)) return;
  const v = Math.min(1, strength) * 0.11;
  const f = 2600 + Math.random() * 1800;
  tone(f, 0.09, { type: 'sine', vol: v });
  tone(f * 1.47, 0.06, { type: 'sine', vol: v * 0.6 });
  hiss(0.025, { vol: v * 0.8, freq: 6000 });
}

export function drop() {
  if (!ok('drop', 0.03)) return;
  tone(1400, 0.06, { type: 'square', vol: 0.05, slide: 0.6 });
}

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
export function win(combo = 1, big = false) {
  if (!ok('win', 0.04)) return;
  const n = SCALE[Math.min(SCALE.length - 1, combo - 1)];
  const f = 880 * 2 ** (n / 12);
  tone(f, 0.12, { vol: 0.07 });
  tone(f * 1.5, 0.16, { vol: 0.05, at: 0.05 });
  if (big) tone(f * 2, 0.25, { vol: 0.06, at: 0.1 });
}

export function lose() {
  if (!ok('lose', 0.1)) return;
  tone(220, 0.18, { type: 'triangle', vol: 0.12, slide: 0.5 });
}

export function tick(p = 1) {
  if (!ok('tick', 0.03)) return;
  tone(1800 * p, 0.03, { type: 'square', vol: 0.04 });
}

export function clack() {
  if (!ok('clack')) return;
  tone(300, 0.08, { type: 'square', vol: 0.12, slide: 0.5 });
  hiss(0.05, { vol: 0.15, freq: 2000 });
}

export function gate() {
  if (!ok('gate', 0.05)) return;
  [0, 4, 7, 12].forEach((n, i) => tone(1046 * 2 ** (n / 12), 0.1, { vol: 0.06, at: i * 0.04 }));
}

export function fanfare(kind = 'small') {
  if (!ok('fanfare' + kind)) return;
  const seqs = {
    small: [[0, 0], [4, 0.08], [7, 0.16], [12, 0.24]],
    big: [[0, 0], [4, 0.1], [7, 0.2], [12, 0.3], [7, 0.4], [12, 0.5], [16, 0.6], [19, 0.75]],
    level: [[7, 0], [12, 0.09], [16, 0.18], [19, 0.27], [24, 0.4]],
  };
  for (const [n, at] of seqs[kind]) {
    tone(523 * 2 ** (n / 12), 0.22, { vol: 0.08, at });
    tone(523 * 2 ** ((n - 12) / 12), 0.22, { type: 'triangle', vol: 0.1, at });
  }
}

export function jackpot() {
  if (!ok('jackpot')) return;
  const mel = [0, 4, 7, 12, 16, 19, 24, 19, 24, 28, 31, 36];
  mel.forEach((n, i) => {
    tone(392 * 2 ** (n / 12), 0.18, { vol: 0.08, at: i * 0.075 });
    tone(196 * 2 ** (n / 12), 0.18, { type: 'triangle', vol: 0.1, at: i * 0.075 });
  });
  for (let i = 0; i < 6; i++) hiss(0.3, { vol: 0.06, at: 0.9 + i * 0.08, freq: 7000 });
}

export function rumble(dur = 1) {
  if (!ok('rumble', 0.3)) return;
  hiss(dur, { vol: 0.5, freq: 90, q: 0.7, type: 'lowpass' });
  tone(55, dur, { type: 'sawtooth', vol: 0.12, slide: 0.7 });
}

export function thud(strength = 1) {
  if (!ok('thud', 0.08)) return;
  tone(120, 0.2, { type: 'sine', vol: 0.25 * Math.min(1, strength), slide: 0.4 });
  hiss(0.08, { vol: 0.12, freq: 400 });
}

export function buy() {
  if (!ok('buy')) return;
  [0, 7, 12, 19].forEach((n, i) => tone(784 * 2 ** (n / 12), 0.1, { vol: 0.07, at: i * 0.05 }));
}

export function nope() {
  if (!ok('nope', 0.15)) return;
  tone(160, 0.12, { type: 'square', vol: 0.08 });
  tone(120, 0.16, { type: 'square', vol: 0.08, at: 0.08 });
}

export function whoosh() {
  if (!ok('whoosh', 0.2)) return;
  hiss(0.4, { vol: 0.15, freq: 1200, q: 2 });
}

export function ui() {
  if (!ok('ui', 0.03)) return;
  tone(1200, 0.04, { type: 'square', vol: 0.04 });
}

export function buzz(ms) {
  if (S.sound && navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(ms);
}
