// The sound-design workshop: while a "Créer des sons" lesson is open, part A
// plays a workshop patch instead of the player's own sound. Nothing of it is
// saved over the player's settings; "keep" stores it in Mes sons.
import { h, param } from './ui.js?v=202611129';
import { S, banks, saveBanks, save, setSaveView } from './store.js?v=202611129';
import { clonePatch } from './dx7.js?v=202611129';
import { applyPart, setLabSound } from './perform.js?v=202611129';
import { subscribe } from './notes.js?v=202611129';
import * as E from './engine.js?v=202611129';
import { t } from './i18n.js?v=202611129';

let active = null; // { orig, split, arp, patch }
const macros = () => ({ bright: 0, attack: 0, release: 0, vibrato: 0 });

export const labOn = () => !!active;
export const labPatch = () => active?.patch;

export function startLab(patch) {
  if (!active) {
    active = { orig: S.parts[0], split: S.split.on, arp: S.arp.on };
    // what is saved meanwhile is the player's own setup, not the workshop
    setSaveView(s => ({ ...s, parts: [active.orig, s.parts[1]], split: { ...s.split, on: active.split }, arp: { ...s.arp, on: active.arp } }));
    S.split.on = false;
    S.arp.on = false;
    setLabSound(true);
  }
  setLabPatch(patch);
}

export function setLabPatch(patch) {
  if (!active) return;
  active.patch = clonePatch(patch);
  S.parts[0] = { kind: 'fm', ref: { bank: 'lab', i: 0 }, patch: active.patch, dirty: true, macros: macros(), volume: 0.8, octave: 0 };
  applyPart(0);
}

let pending = false;
export function labChanged() {
  if (!active || pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; if (active) E.setPatch(0, active.patch); });
}

export function endLab() {
  if (!active) return;
  S.parts[0] = active.orig;
  S.split.on = active.split;
  S.arp.on = active.arp;
  setSaveView(null);
  setLabSound(false);
  active = null;
  applyPart(0);
  save();
}

// Store the workshop sound in Mes sons; returns its place
export function keepLab(name) {
  if (!active) return null;
  const p = clonePatch(active.patch);
  p.name = name.slice(0, 16);
  delete p.cat;
  const mine = banks.find(b => b.id === 'mine');
  mine.voices.push(p);
  if (!saveBanks()) { mine.voices.pop(); return null; }
  return { bank: 'mine', i: mine.voices.length - 1, patch: p };
}

// Play a short line with another patch (a target, a sound A or B), then put
// the workshop sound back
export async function playWith(patch, run) {
  if (!active) return;
  E.setPatch(0, patch);
  try { await run(); } finally { if (active) E.setPatch(0, active.patch); }
}

// ── controls ───────────────────────────────────────────────────
// A control is { key, label, min?, max?, invert?, fmt? }. key is a path in the
// patch: "fb", "alg", "op2.ol", "op1.r.0", or several joined by "&" that move
// together ("op1.r.1&op1.r.2").
const LIMITS = { ol: 99, coarse: 31, fine: 99, det: 14, vel: 7, rs: 7, ams: 3, fb: 7, alg: 32, r: 99, l: 99, pmd: 99, amd: 99, speed: 99 };
function access(p, path) {
  const parts = path.split('.');
  let obj = p, i = 0;
  if (/^op\d$/.test(parts[0])) { obj = p.ops[+parts[0][2] - 1]; i = 1; }
  else if (parts[0] === 'lfo') { obj = p.lfo; i = 1; }
  const keys = parts.slice(i);
  const last = keys.pop();
  for (const k of keys) obj = obj[k];
  return { get: () => obj[last], set: v => (obj[last] = v), name: keys[0] ?? last };
}
export function readKey(p, key) { return access(p, key.split('&')[0]).get(); }
export function writeKey(p, key, v) { for (const k of key.split('&')) access(p, k).set(v); }
export const keyMax = key => LIMITS[access({ ops: [{}, {}, {}, {}, {}, {}], lfo: {} }, key.split('&')[0]).name] ?? 99;

// The display value of a control (inverted ones read as a duration)
export const shown = (c, raw) => (c.invert ? keyMax(c.key) - raw : c.key.endsWith('.det') ? raw - 7 : raw);
const rawOf = (c, v) => (c.invert ? keyMax(c.key) - v : c.key.endsWith('.det') ? v + 7 : v);

export function controlEl(c, getPatch, onChange) {
  const max = keyMax(c.key);
  const lo = c.min ?? (c.key.endsWith('.det') ? -7 : 0);
  const hi = c.max ?? (c.key.endsWith('.det') ? 7 : max);
  return param({
    label: c.label, min: lo, max: hi, bipolar: c.key.endsWith('.det'),
    get: () => shown(c, readKey(getPatch(), c.key)),
    set: v => { writeKey(getPatch(), c.key, rawOf(c, v)); onChange(); },
    fmt: c.fmt || (c.key.endsWith('.coarse') ? v => '×' + (v === 0 ? '0.5' : v) : c.key.endsWith('.det') ? v => (v > 0 ? '+' : '') + v : v => v),
  });
}

// ── views: oscilloscope and spectrum ───────────────────────────
let lastMidi = 60;
// a finer analyser for the spectrum, fed by the engine's own
let fine = null;
function fineAnalyser() {
  const base = E.analyser(), ctx = E.audio();
  if (!base || !ctx) return null;
  if (!fine) { fine = new AnalyserNode(ctx, { fftSize: 8192, smoothingTimeConstant: 0.5 }); base.connect(fine); }
  return fine;
}
subscribe(e => { if (e.type === 'on') lastMidi = e.midi; });

export function labViews(kinds) {
  const els = kinds.map(k => {
    const c = h('canvas', { class: 'lab-canvas' });
    return h('figure', { class: 'lab-view' }, c, h('figcaption', {}, t(k === 'scope' ? 'labScope' : 'labSpectrum')));
  });
  const wrap = h('div', { class: 'lab-views' }, ...els);
  let raf = 0, wave = null, freq = null, gain = 1;
  const css = () => getComputedStyle(document.documentElement);
  const draw = () => {
    raf = 0;
    if (!wrap.isConnected) return;
    const an = E.analyser();
    const col = css();
    const accent = col.getPropertyValue('--accent').trim(), line = col.getPropertyValue('--line').trim(), dim = col.getPropertyValue('--faint').trim();
    els.forEach((fig, k) => {
      const c = fig.firstChild;
      const dpr = devicePixelRatio || 1, w = c.clientWidth, hh = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(hh * dpr); }
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, hh);
      g.strokeStyle = line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, kinds[k] === 'scope' ? hh / 2 : hh - 0.5); g.lineTo(w, kinds[k] === 'scope' ? hh / 2 : hh - 0.5); g.stroke();
      if (!an) return;
      if (kinds[k] === 'scope') {
        if (!wave || wave.length !== an.fftSize) wave = new Float32Array(an.fftSize);
        an.getFloatTimeDomainData(wave);
        let peak = 0;
        for (let i = 0; i < wave.length; i++) peak = Math.max(peak, Math.abs(wave[i]));
        gain += (Math.min(8, 0.8 / Math.max(peak, 0.01)) - gain) * 0.15;
        let s0 = 0;
        for (let i = 1; i < wave.length - 800; i++) if (wave[i - 1] < 0 && wave[i] >= 0) { s0 = i; break; }
        // about three periods of the last note
        const sr = E.audio()?.sampleRate || 48000;
        const span = Math.min(wave.length - s0 - 1, Math.round((3 * sr) / (440 * Math.pow(2, (lastMidi - 69) / 12))));
        g.strokeStyle = accent; g.lineWidth = 2;
        g.beginPath();
        for (let i = 0; i <= span; i++) {
          const x = (i / span) * w, y = hh / 2 - wave[s0 + i] * gain * (hh / 2 - 6);
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      } else {
        const fa = fineAnalyser() || an;
        if (!freq || freq.length !== fa.frequencyBinCount) freq = new Float32Array(fa.frequencyBinCount);
        fa.getFloatFrequencyData(freq);
        const sr = E.audio()?.sampleRate || 48000;
        const f0 = 440 * Math.pow(2, (lastMidi - 69) / 12);
        const top = f0 * 16.5; // the first 16 harmonics
        const binHz = sr / fa.fftSize;
        // harmonic marks
        g.fillStyle = dim; g.font = '9px ui-monospace, monospace';
        for (let n = 1; n <= 16; n++) {
          const x = (n * f0 / top) * w;
          g.fillRect(x, hh - 4, 1, 4);
          if (n <= 8 || n % 2 === 0) g.fillText(String(n), x - 3, 10);
        }
        g.strokeStyle = accent; g.fillStyle = accent; g.lineWidth = 1.5;
        g.beginPath();
        const bins = Math.min(freq.length, Math.ceil(top / binHz));
        for (let b = 0; b < bins; b++) {
          const x = (b * binHz / top) * w;
          const y = hh - Math.max(0, Math.min(1, (freq[b] + 95) / 75)) * (hh - 14);
          b ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        g.lineTo(w, hh); g.lineTo(0, hh); g.closePath();
        g.globalAlpha = 0.15; g.fill(); g.globalAlpha = 1;
      }
    });
    raf = requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  wrap.stop = () => cancelAnimationFrame(raf);
  return wrap;
}

