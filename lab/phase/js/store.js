// App state, persisted in localStorage (wrapped: private mode can throw).
import { FACTORY } from './presets.js?v=202611091438';
import { clonePatch } from './dx7.js?v=202611091438';

const KEY = 'phase.state.v1';
const BANKS = 'phase.banks.v1';

const steps = () => Array.from({ length: 16 }, () => ({ notes: [], vel: 100, on: true }));

function defaults() {
  return {
    parts: [
      { ref: { bank: 'usine', i: 0 }, patch: clonePatch(FACTORY[0]), dirty: false, macros: { bright: 0, attack: 0, release: 0, vibrato: 0 }, volume: 0.8, octave: 0 },
      { ref: { bank: 'usine', i: 5 }, patch: clonePatch(FACTORY[5]), dirty: false, macros: { bright: 0, attack: 0, release: 0, vibrato: 0 }, volume: 0.8, octave: 0 },
    ],
    edit: 0,
    split: { on: false, point: 60 },
    tempo: 110,
    arp: { on: false, target: 0, mode: 'up', rate: 0.25, octaves: 1, gate: 0.6, latch: false },
    seq: { steps: steps(), length: 16, part: 0, gate: 0.5, swing: 0, transpose: false },
    fx: {
      filter: { pos: 0, res: 0.2 },
      chorus: { on: true, rate: 0.6, depth: 0.4, mix: 0.35 },
      delay: { on: false, beats: 0.75, fb: 0.35, mix: 0.25, tone: 0.6 },
      reverb: { on: true, size: 0.45, tone: 0.6, mix: 0.25 },
      master: 0.8,
    },
    settings: { input: 'all', velCurve: 'normal', bendRange: 2, bend: true, poly: 16, screenKeys: true, keysStart: 48, theme: 'auto' },
    tab: 'play',
  };
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(base)) return saved ?? base;
  const out = { ...base };
  for (const k of Object.keys(saved)) out[k] = k in base && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? merge(base[k], saved[k]) : saved[k];
  return out;
}

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export const S = merge(defaults(), load(KEY));
if (!Array.isArray(S.seq.steps) || S.seq.steps.length !== 16) S.seq.steps = steps();

// User banks: [{ id, name, voices: [patch] }]. "mine" always exists.
export const banks = load(BANKS) || [];
if (!banks.find(b => b.id === 'mine')) banks.unshift({ id: 'mine', name: 'Mes sons', voices: [] });

let t = 0;
export function save() {
  clearTimeout(t);
  t = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  }, 300);
}
export function saveBanks() {
  try { localStorage.setItem(BANKS, JSON.stringify(banks)); return true; } catch { return false; }
}

const listeners = new Map();
export function on(evt, fn) { (listeners.get(evt) || listeners.set(evt, new Set()).get(evt)).add(fn); return () => listeners.get(evt).delete(fn); }
export function emit(evt, data) { listeners.get(evt)?.forEach(fn => fn(data)); }

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch {}
  location.reload();
}
