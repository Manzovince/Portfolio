// App state, persisted in localStorage (every access wrapped: private mode can throw).
// One object, S, read and written everywhere; `emit` tells the views what moved.
import { FACTORY } from './presets.js?v=202611120';
import { clonePatch } from './dx7.js?v=202611120';

const KEY = 'octave.state.v1';
const BANKS = 'octave.banks.v1';
const LANG_KEY = 'selectedLanguage'; // shared with the rest of manzovince.com

const steps = () => Array.from({ length: 16 }, () => ({ notes: [], vel: 100, on: true }));
const macros = () => ({ bright: 0, attack: 0, release: 0, vibrato: 0 });

export const pianoPart = (i = 0) => ({ kind: 'piano', ref: { bank: 'piano', i }, patch: null, dirty: false, macros: macros(), volume: 0.85, octave: 0 });
export const fmPart = i => ({ kind: 'fm', ref: { bank: 'usine', i }, patch: clonePatch(FACTORY[i]), dirty: false, macros: macros(), volume: 0.8, octave: 0 });

function defaults() {
  return {
    mode: 'play',              // play | learn | create
    createTab: 'sounds',       // sounds | edit | arp | seq | fx
    learnTab: 'coach',         // coach | songs | drills
    playView: 'roll',          // roll | staff
    panel: true,               // side panel of the Play screen open
    parts: [pianoPart(0), fmPart(0)],
    edit: 0,
    split: { on: false, point: 60 },
    tempo: 100,
    arp: { on: false, target: 0, mode: 'up', rate: 0.25, octaves: 1, gate: 0.6, latch: false },
    seq: { steps: steps(), length: 16, part: 0, gate: 0.5, swing: 0, transpose: false },
    fx: {
      filter: { pos: 0, res: 0.2 },
      chorus: { on: false, rate: 0.6, depth: 0.4, mix: 0.35 },
      delay: { on: false, beats: 0.75, fb: 0.35, mix: 0.25, tone: 0.6 },
      reverb: { on: true, size: 0.4, tone: 0.6, mix: 0.18 },
      master: 0.85,
    },
    scale: { root: 0, type: '' },
    metro: { on: false, beats: 4, sound: true, volume: 0.6 },
    suggest: { on: true, keys: false },
    kb: { dock: 'full', size: 'm', start: 48, follow: 'free', labels: 'c' },
    view: { colors: 'parts', scope: true, chordNames: true },
    midi: { input: 'all', velCurve: 'normal', bendRange: 2, bend: true, poly: 16 },
    practice: { kind: 'chords', chords: 'triads', scales: 'majorScales', reading: 'trebleEasy', roots: 'naturals', hints: true },
    song: { part: 'right', speed: 1, staff: true, lookahead: 3 },
    lumi: { enabled: false, blocks: 'auto', octave: 0, guide: true, color: '#2ec4b6', restore: 'rainbow', restoreColor: '#44aca3', restoreRoot: '#f2b84b', brightness: 0.6 },
    mute: false,               // Octave silent (the piano sounds by itself); the metronome still clicks
    theme: 'auto',
    notation: 'auto',          // auto (solfège in French) | english | solfege
    lang: null,
  };
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(base)) return saved ?? base;
  const out = { ...base };
  for (const k of Object.keys(saved)) {
    if (!(k in base)) continue;
    out[k] = base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? merge(base[k], saved[k]) : saved[k];
  }
  return out;
}

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export const S = merge(defaults(), load(KEY));
if (!Array.isArray(S.seq.steps) || S.seq.steps.length !== 16) S.seq.steps = steps();
if (!Array.isArray(S.parts) || S.parts.length !== 2) S.parts = defaults().parts;
S.parts.forEach((p, i) => { if (p.kind === 'fm' && !p.patch) S.parts[i] = fmPart(0); });

try {
  const l = localStorage.getItem(LANG_KEY);
  if (l === 'fr' || l === 'en') S.lang = l;
} catch {}
if (!S.lang) S.lang = (navigator.language || '').startsWith('fr') ? 'fr' : 'en';

// User banks: [{ id, name, voices: [patch] }]. "mine" always exists.
export const banks = load(BANKS) || [];
if (!banks.find(b => b.id === 'mine')) banks.unshift({ id: 'mine', name: null, voices: [] });

let timer = 0;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  }, 300);
}
export function saveLang() {
  try { localStorage.setItem(LANG_KEY, S.lang); } catch {}
}
export function saveBanks() {
  try { localStorage.setItem(BANKS, JSON.stringify(banks)); return true; } catch { return false; }
}

const listeners = new Map();
export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt).delete(fn);
}
export function emit(evt, data) { listeners.get(evt)?.forEach(fn => fn(data)); }

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch {}
  location.reload();
}
