// Phase — boot, shell (top bar + tab rail), screen switching, meters.
import { h, icon, toast, noteName } from './ui.js?v=202611091438';
import { S, save, on, emit } from './store.js?v=202611091438';
import * as E from './engine.js?v=202611091438';
import { applyAll, midiEvent, seq, seqPlay, keyOn, keyOff } from './perform.js?v=202611091438';
import { connectMidi, onMidi, onMidiState, status as midiStatusNow } from './midi.js?v=202611091438';
import { bindComputerKeys } from './keys.js?v=202611091438';
import * as P from './panels.js?v=202611091438';
import { tempoParam } from './panels.js?v=202611091438';

const TABS = [
  ['play', 'Jouer', P.renderPlay],
  ['edit', 'Éditer', P.renderEdit],
  ['sounds', 'Sons', P.renderSounds],
  ['arp', 'Arp', P.renderArp],
  ['seq', 'Séq', P.renderSeq],
  ['fx', 'Effets', P.renderFx],
];

const app = document.getElementById('app');
const view = h('main', { class: 'view' });
const rail = h('nav', { class: 'rail', 'aria-label': 'Écrans' });
const top = h('header', { class: 'top' });
const sheet = h('div', { class: 'sheet', hidden: true, onclick: e => { if (e.target === sheet) ctx.closeSheet(); } });
const sheetBox = h('div', { class: 'sheet-box', role: 'dialog', 'aria-label': 'Réglages' });
sheet.append(sheetBox);
app.append(top, h('div', { class: 'shell' }, rail, view));
document.body.append(sheet);

let subs = [];
const ctx = {
  graphs: [], scope: null, keys: null, seqPaint: null,
  learnSplit: false, onLearned: null,
  sub(evt, fn) { subs.push(on(evt, fn)); },
  go(tab) { S.tab = tab; save(); render(); },
  rerender: () => render(),
  closeSheet() { sheet.hidden = true; ctx.learnSplit = false; },
  openSheet() { sheetBox.textContent = ''; P.renderSettings(sheetBox, ctx); sheet.hidden = false; },
};

// ── tab rail ──
const tabBtns = TABS.map(([id, label]) => {
  const b = h('button', { type: 'button', class: 'tab', onclick: () => ctx.go(id) }, icon(id === 'play' ? 'play' : id), h('span', {}, label));
  b.dataset.tab = id;
  rail.append(b);
  return b;
});

// ── top bar ──
const logo = h('div', { class: 'logo' }, 'PHASE');
const chips = h('div', { class: 'parts' });
const midiPill = h('button', { type: 'button', class: 'midi', onclick: () => ctx.openSheet() });
const tempo = tempoParam('tempo');
const transport = h('button', { type: 'button', class: 'transport-mini', 'aria-label': 'Lecture du séquenceur', onclick: () => seqPlay() });
const gear = h('button', { type: 'button', class: 'gear', 'aria-label': 'Réglages', onclick: () => ctx.openSheet() }, icon('gear'));
top.append(logo, chips, h('div', { class: 'spacer' }), midiPill, tempo, transport, gear);

function paintTop() {
  chips.textContent = '';
  const n = S.split.on ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const pt = S.parts[i];
    chips.append(h('button', { type: 'button', class: 'part p' + i + (S.edit === i ? ' on' : ''), 'aria-label': (i ? 'B' : 'A') + ' : ' + pt.patch.name + (S.edit === i ? ', choisir un son' : ', sélectionner'), onclick: () => {
        // first tap selects the part, a tap on the active part opens its sound list
        if (S.edit === i) ctx.go('sounds');
        else { S.edit = i; save(); emit('part'); }
      } },
      h('b', {}, i ? 'B' : 'A'), h('span', {}, pt.patch.name + (pt.dirty ? '*' : '')),
      S.split.on ? h('small', {}, i ? '≥ ' + noteName(S.split.point) : '< ' + noteName(S.split.point)) : null));
  }
  transport.innerHTML = '';
  transport.append(icon(seq.playing ? 'stop' : 'start'));
  transport.classList.toggle('on', seq.playing);
  document.documentElement.dataset.part = S.edit;
}

function paintMidi(st = midiStatusNow) {
  const label = { idle: 'MIDI…', connected: st.inputs.map(i => i.name).join(', ') || 'MIDI', none: 'Aucun clavier', unsupported: 'Pas de MIDI', denied: 'MIDI refusé' }[st.state];
  midiPill.className = 'midi ' + st.state;
  midiPill.innerHTML = '';
  midiPill.append(h('i'), h('span', {}, label));
}

function render() {
  if (!S.split.on) S.edit = 0; // part B only exists with the split
  subs.forEach(u => u()); subs = [];
  ctx.graphs = []; ctx.scope = null; ctx.keys = null; ctx.seqPaint = null;
  P.bindCtx(ctx);
  view.textContent = '';
  view.className = 'view v-' + S.tab;
  const tab = TABS.find(t => t[0] === S.tab) || TABS[0];
  tab[2](view, ctx);
  tabBtns.forEach(b => b.classList.toggle('on', b.dataset.tab === tab[0]));
  ctx.sub('keys', () => ctx.keys && ctx.keys.paint());
  paintTop();
}

on('voice', () => render());
on('part', () => render());
on('split', () => { render(); if (!sheet.hidden) { /* keep sheet open */ } });
on('patch', () => paintTop());
on('seq', () => paintTop());

// ── meters + scope ──
E.onMeter(m => {
  if (window.phase) window.phase.meter = m;
  const arr = S.edit === 0 ? m.a : m.b;
  for (const g of ctx.graphs) g.meter(arr);
});
let wave;
function loop() {
  requestAnimationFrame(loop);
  if (ctx.seqPaint) ctx.seqPaint();
  const c = ctx.scope, an = E.analyser();
  if (!c || !an || !c.isConnected) return;
  const w = c.clientWidth, hh = c.clientHeight, dpr = devicePixelRatio || 1;
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(hh * dpr); }
  if (!wave || wave.length !== an.fftSize) wave = new Float32Array(an.fftSize);
  an.getFloatTimeDomainData(wave);
  // start on a rising zero crossing so the trace stands still
  let s0 = 0;
  for (let i = 1; i < wave.length / 2; i++) if (wave[i - 1] < 0 && wave[i] >= 0) { s0 = i; break; }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, hh);
  let amp = 0;
  for (let i = 0; i < wave.length; i += 16) amp = Math.max(amp, Math.abs(wave[i]));
  if (amp < 0.002) return;
  g.beginPath();
  const N = 1024;
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * w;
    const y = hh / 2 - wave[s0 + i] * hh * 0.4;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.strokeStyle = getComputedStyle(c).color;
  g.lineWidth = 1.5;
  g.stroke();
}

// ── MIDI ──
onMidi(m => {
  if (ctx.learnSplit && m.type === 'on') {
    ctx.learnSplit = false;
    S.split.point = m.note;
    S.split.on = true;
    save(); emit('split');
    if (ctx.onLearned) ctx.onLearned();
    toast('Split sur ' + noteName(m.note));
    return;
  }
  midiEvent(m);
});
onMidiState(st => {
  paintMidi(st);
  if (!sheet.hidden) ctx.openSheet();
});

// ── start ──
const start = document.getElementById('start');
start.addEventListener('click', async () => {
  try {
    await E.startAudio();
    applyAll();
    start.classList.add('gone');
    setTimeout(() => start.remove(), 400);
  } catch (err) {
    start.querySelector('p').textContent = 'Audio indisponible : ' + (err && err.message ? err.message : err);
  }
});

P.applyTheme();
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => P.applyTheme());
on('theme', () => render());
paintMidi();
render();
loop();
bindComputerKeys();
connectMidi(S.settings.input);
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// keep the tempo-synced delay in step when the tempo changes from anywhere
on('tempo', () => E.setFx(S.fx, S.tempo));
// console handle for testing without a keyboard
window.phase = { keyOn, keyOff, S };
