// The keyboard dock at the bottom of every screen.
// "full": a playable keyboard (multi-touch, glissando, velocity from where the
// key is struck), sized from the screen and the key-size setting. "mini": a
// thin strip of all 88 keys that only shows what sounds, for MIDI players.
// It also gives the roll and the waterfall their columns (geometry()).
import { h, icon } from './ui.js?v=202611091';
import { S, save, on, emit } from './store.js?v=202611091';
import { press, lift, liftSource, subscribe, soundingNotes, noteInfo, LOWEST, HIGHEST } from './notes.js?v=202611091';
import { partOf } from './perform.js?v=202611091';
import { noteColor } from './colors.js?v=202611091';
import { noteLabel, t } from './i18n.js?v=202611091';
import { pitchClass, scaleNotes } from './theory.js?v=202611091';

const BLACK = new Set([1, 3, 6, 8, 10]);
const isBlack = m => BLACK.has(((m % 12) + 12) % 12);
const MIN_WHITE = { s: 24, m: 34, l: 46 };
const HEIGHT = { s: 92, m: 132, l: 178 };

let wrap, bed, down, up, range = { lo: 48, hi: 72 };
let override = null;        // { lo, hi } forced by a screen (song range)
let lumiRange = () => null; // set by lumi.js
let guide = () => null;     // { strong: Set<pc>, soft: Set<pc>, midis: Set<midi>, hands: Map<midi,0|1> }
let sideOf = midi => partOf(midi);
const keyEls = new Map();
const layoutCbs = new Set();
let geo = new Map();

export const onLayout = fn => { layoutCbs.add(fn); return () => layoutCbs.delete(fn); };
export const geometry = () => geo;
export const keyRange = () => range;
export const setGuide = fn => { guide = fn || (() => null); paint(); };
export const setSide = fn => { sideOf = fn || (midi => partOf(midi)); paint(); };
export const setLumiRange = fn => { lumiRange = fn; };
export function setOverride(r) {
  const same = (r && override && r.lo === override.lo && r.hi === override.hi) || (!r && !override);
  override = r;
  if (!same) build();
}

// Extend a range to whole white keys at both ends
const snap = (lo, hi) => {
  while (isBlack(lo)) lo--;
  while (isBlack(hi)) hi++;
  return { lo: Math.max(LOWEST, lo), hi: Math.min(HIGHEST, hi) };
};
const whitesIn = (lo, hi) => { let n = 0; for (let m = lo; m <= hi; m++) if (!isBlack(m)) n++; return n; };

function computeRange(width) {
  if (S.kb.dock === 'mini') return { lo: LOWEST, hi: HIGHEST };
  if (override) return snap(override.lo, override.hi);
  const lr = S.kb.follow === 'lumi' ? lumiRange() : null;
  if (lr) return snap(lr.lo, lr.hi);
  const whites = Math.max(7, Math.floor(width / MIN_WHITE[S.kb.size]));
  let lo = Math.max(LOWEST, Math.min(S.kb.start, HIGHEST - 12));
  let hi = lo, n = 0;
  while (hi < HIGHEST) { hi++; if (!isBlack(hi) && ++n >= whites - 1) break; }
  // Finish on a B (or the top of the piano) so octaves read cleanly
  return snap(lo, hi);
}

export function build() {
  if (!bed) return;
  const width = bed.clientWidth || window.innerWidth;
  range = computeRange(width);
  const { lo, hi } = range;
  const ww = 100 / whitesIn(lo, hi);
  bed.textContent = '';
  keyEls.clear();
  const whites = [], blacks = [];
  let wi = 0;
  const labels = S.kb.dock === 'full' ? S.kb.labels : 'none';
  for (let m = lo; m <= hi; m++) {
    const black = isBlack(m);
    const k = h('div', { class: 'key ' + (black ? 'b' : 'w'), 'data-n': m });
    if (black) { k.style.left = `calc(${wi * ww}% - ${ww * 0.31}%)`; k.style.width = ww * 0.62 + '%'; blacks.push(k); }
    else {
      k.style.left = wi * ww + '%'; k.style.width = ww + '%'; wi++;
      if (labels === 'all' || (labels === 'c' && m % 12 === 0)) k.append(h('small', {}, noteLabel(m, m % 12 === 0)));
      whites.push(k);
    }
    k.append(h('i', { class: 'dot' }));
    keyEls.set(m, k);
  }
  bed.append(...whites, ...blacks);
  const fixed = S.kb.dock === 'mini' || override || (S.kb.follow === 'lumi' && lumiRange());
  down.hidden = up.hidden = !!fixed;
  measure();
  paint();
}

function measure() {
  const r = bed.getBoundingClientRect();
  geo = new Map();
  const whites = whitesIn(range.lo, range.hi);
  const ww = r.width / whites;
  let wi = 0;
  for (let m = range.lo; m <= range.hi; m++) {
    if (isBlack(m)) geo.set(m, { x: r.left + wi * ww - ww * 0.31, w: ww * 0.62, black: true });
    else { geo.set(m, { x: r.left + wi * ww, w: ww, black: false }); wi++; }
  }
  layoutCbs.forEach(fn => fn(geo));
}

let painting = false;
export function paint() {
  if (painting || !bed) return;
  painting = true;
  requestAnimationFrame(() => {
    painting = false;
    const g = guide();
    const scale = !g && S.scale.type ? new Set(scaleNotes(S.scale.root, S.scale.type).map(n => n.pc)) : null;
    const split = S.split.on;
    for (const [m, k] of keyEls) {
      const info = noteInfo(m);
      const pc = pitchClass(m);
      const strong = !!(g && (g.midis?.has(m) || g.strong?.has(pc)));
      const soft = !strong && !!((g && g.soft?.has(pc)) || (scale && scale.has(pc)));
      k.classList.toggle('on', !!info);
      k.classList.toggle('guide', strong);
      k.classList.toggle('soft', !!soft);
      k.classList.toggle('hi', split && m >= S.split.point);
      const side = g?.hands?.get(m) ?? sideOf(m);
      if (info || strong) k.style.setProperty('--c', noteColor(m, side));
      else k.style.removeProperty('--c');
    }
  });
}

// ── pointer input ──────────────────────────────────────────────
const touches = new Map(); // pointerId -> midi
function noteAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const k = el && el.closest && el.closest('.key');
  return k && bed.contains(k) ? { n: +k.dataset.n, k } : null;
}
function velAt(k, y) {
  const r = k.getBoundingClientRect();
  return Math.round(40 + 87 * Math.min(1, Math.max(0, (y - r.top) / r.height)));
}

export function createDock() {
  wrap = h('div', { class: 'dock' });
  down = h('button', { class: 'oct', type: 'button', 'aria-label': t('octDown') }, icon('back'));
  up = h('button', { class: 'oct', type: 'button', 'aria-label': t('octUp') }, icon('next'));
  bed = h('div', { class: 'bed', role: 'group', 'aria-label': t('keyboard') });
  wrap.append(down, bed, up);
  applyDock();

  bed.addEventListener('pointerdown', e => {
    if (S.kb.dock !== 'full') return;
    e.preventDefault();
    const hit = noteAt(e.clientX, e.clientY);
    if (!hit) return;
    bed.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, hit.n);
    press(hit.n, velAt(hit.k, e.clientY), 'screen');
  });
  bed.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return;
    const hit = noteAt(e.clientX, e.clientY);
    const cur = touches.get(e.pointerId);
    if (hit && hit.n !== cur) {
      lift(cur);
      touches.set(e.pointerId, hit.n);
      press(hit.n, velAt(hit.k, e.clientY), 'screen');
    }
  });
  const end = e => {
    if (!touches.has(e.pointerId)) return;
    const n = touches.get(e.pointerId);
    touches.delete(e.pointerId);
    if (![...touches.values()].includes(n)) lift(n);
  };
  bed.addEventListener('pointerup', end);
  bed.addEventListener('pointercancel', end);
  bed.addEventListener('contextmenu', e => e.preventDefault());
  const shift = d => {
    // move by an octave, always starting on a C (or the bottom A of the piano)
    const c = range.lo - (range.lo % 12) + d * 12;
    if (d > 0 && range.hi >= HIGHEST) return;
    S.kb.start = Math.max(LOWEST, Math.min(96, c));
    save(); build();
  };
  down.onclick = () => shift(-1);
  up.onclick = () => shift(1);
  new ResizeObserver(() => build()).observe(bed);
  addEventListener('scroll', measure, true);
  return wrap;
}

export function applyDock() {
  if (!wrap) return;
  wrap.className = 'dock ' + S.kb.dock + ' size-' + S.kb.size;
  wrap.style.setProperty('--kh', HEIGHT[S.kb.size] + 'px');
  build();
}

subscribe(() => paint());
on('split', () => paint());
on('scale', () => paint());
on('theme', () => paint());
on('lang', () => build());
on('kb', () => applyDock());

// ── computer keyboard, by physical position (AZERTY and QWERTY alike) ──
// bottom letter row = white keys from the first C on screen, row above = black keys
const CODES = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon', 'Quote'];
let compOctave = 0;
export function bindComputerKeys() {
  const downKeys = new Map();
  addEventListener('keydown', e => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.code === 'KeyZ' || e.code === 'KeyX') { compOctave += e.code === 'KeyZ' ? -1 : 1; compOctave = Math.max(-3, Math.min(3, compOctave)); return; }
    const i = CODES.indexOf(e.code);
    if (i < 0) return;
    let c = range.lo; while (c % 12) c++;
    const n = c + i + compOctave * 12;
    downKeys.set(e.code, n);
    press(n, 96, 'computer');
  });
  addEventListener('keyup', e => {
    const n = downKeys.get(e.code);
    if (n == null) return;
    downKeys.delete(e.code);
    lift(n);
  });
  addEventListener('blur', () => { liftSource('computer'); downKeys.clear(); });
}
