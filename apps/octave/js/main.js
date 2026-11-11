// Octave — boot, shell (top bar, mode switch, keyboard dock), screen switching.
import { h, icon, seg, toast, toggle, param } from './ui.js?v=202611120';
import { setMetro, metroBeat } from './metronome.js?v=202611120';
import { S, save, on, emit } from './store.js?v=202611120';
import * as E from './engine.js?v=202611120';
import { applyAll, seq, seqPlay, seqHasNotes, learnSplit } from './perform.js?v=202611120';
import { connectMidi, onMidiState, status as midiStatusNow } from './midi.js?v=202611120';
import { createDock, bindComputerKeys, setGuide, applyDock } from './keys.js?v=202611120';
import { currentGuide, onGuideChange, refreshGuide } from './guide.js?v=202611120';
import { initLumi } from './lumi.js?v=202611120';
import { t, noteLabel } from './i18n.js?v=202611120';
import { renderPlay } from './play.js?v=202611120';
import { renderLearn } from './learn.js?v=202611120';
import { renderCreate, soundName } from './create.js?v=202611120';
import { renderSettings, applyTheme } from './settings.js?v=202611120';
import { allNotesOff } from './notes.js?v=202611120';

const MODES = [['play', 'play', 'modePlay'], ['learn', 'learn', 'modeLearn'], ['create', 'create', 'modeCreate']];

const app = document.getElementById('app');
const top = h('header', { class: 'top' });
const view = h('main', { class: 'view' });
const dock = createDock();
const sheet = h('div', { class: 'sheet', hidden: true, onclick: e => { if (e.target === sheet) ctx.closeSheet(); } });
const sheetBox = h('div', { class: 'sheet-box', role: 'dialog' });
sheet.append(sheetBox);
app.append(top, view, dock);
document.body.append(sheet);

let subs = [];
const ctx = {
  graphs: [],
  sub(evt, fn) { subs.push(on(evt, fn)); },
  // cleanup functions registered by the current screen
  onLeave(fn) { subs.push(fn); },
  go(mode, tab) {
    S.mode = mode;
    if (tab && mode === 'create') S.createTab = tab;
    if (tab && mode === 'learn') S.learnTab = tab;
    save(); render();
  },
  rerender: () => render(),
  openSheet(fill = renderSettings) {
    sheetBox.textContent = '';
    sheetBox.className = 'sheet-box';
    fill(sheetBox, ctx);
    sheet.hidden = false;
  },
  closeSheet() {
    sheet.hidden = true;
    sheetBox.dispatchEvent(new Event('close'));
    learnSplit(null);
  },
  learnSplit(cb) {
    learnSplit(key => { S.split.point = key; S.split.on = true; save(); emit('split'); toast(t('splitAt', { note: noteLabel(key) })); cb && cb(); });
  },
};

// ── top bar ──
const logo = h('div', { class: 'logo', 'aria-hidden': 'true' }, h('span', {}, 'OCTAVE'));
const modes = h('nav', { class: 'modes', 'aria-label': t('modes') });
const chips = h('div', { class: 'parts' });
const transport = h('button', { type: 'button', class: 'transport-mini', onclick: () => seqPlay() });
const midiPill = h('button', { type: 'button', class: 'midi', onclick: () => ctx.openSheet() });
const gear = h('button', { type: 'button', class: 'gear', onclick: () => ctx.openSheet() }, icon('gear'));
const metroDots = h('span', { class: 'metro-dots' });
const metroBtn = h('button', { type: 'button', class: 'metro-btn', onclick: e => { e.stopPropagation(); toggleMetroPop(); } }, icon('metro'), metroDots);
const muteBtn = h('button', { type: 'button', class: 'mute-btn', onclick: () => {
  S.mute = !S.mute; save(); E.setMuted(S.mute); paintMute();
  toast(t(S.mute ? 'muteOn' : 'muteOff'));
} });
function paintMute() {
  muteBtn.classList.toggle('on', S.mute);
  muteBtn.setAttribute('aria-pressed', S.mute);
  muteBtn.setAttribute('aria-label', t('mute'));
  muteBtn.title = t('mute');
  muteBtn.replaceChildren(icon(S.mute ? 'mute' : 'speaker'));
}
const metroPop = h('div', { class: 'metro-pop', hidden: true, onclick: e => e.stopPropagation() });
top.append(logo, modes, h('div', { class: 'spacer' }), chips, transport, metroBtn, muteBtn, midiPill, gear);
document.body.append(metroPop);

function paintMetroBtn() {
  metroBtn.classList.toggle('on', S.metro.on);
  metroBtn.setAttribute('aria-label', t('metronome'));
  metroDots.textContent = '';
  if (S.metro.on) for (let i = 0; i < S.metro.beats; i++) metroDots.append(h('i'));
}
function toggleMetroPop(open = metroPop.hidden) {
  metroPop.hidden = !open;
  if (!open) return;
  metroPop.textContent = '';
  const r = metroBtn.getBoundingClientRect();
  metroPop.style.top = r.bottom + 8 + 'px';
  metroPop.style.right = Math.max(8, innerWidth - r.right - 60) + 'px';
  metroPop.append(
    toggle({ label: t('metronome'), cls: 'big', get: () => S.metro.on, set: v => { boot(); setMetro(v); } }),
    param({ label: t('tempo'), min: 40, max: 220, get: () => S.tempo, set: v => { S.tempo = v; save(); emit('tempo'); }, fmt: v => v + ' bpm', sens: 0.6 }),
    h('div', { class: 'row' }, h('span', { class: 'lab' }, t('beats')),
      seg({ options: [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [6, '6']], get: () => S.metro.beats, set: v => { S.metro.beats = v; save(); emit('metroBeats'); paintMetroBtn(); } })),
    toggle({ label: t('metroSound'), get: () => S.metro.sound, set: v => { S.metro.sound = v; save(); } }),
    h('div', { class: 'row tap-row' }, h('button', { type: 'button', class: 'btn ghost', onclick: tapTempo }, t('tapTempo')), h('span', { class: 'hint' }, t('tapHint'))));
}
// tap tempo: the average of the last taps
let taps = [];
function tapTempo() {
  const now = performance.now();
  taps = taps.filter(x => now - x < 2500);
  taps.push(now);
  if (taps.length < 2) return;
  const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
  S.tempo = Math.max(40, Math.min(220, Math.round(60000 / avg)));
  save(); emit('tempo');
  toggleMetroPop(true);
}
document.addEventListener('click', () => { if (!metroPop.hidden) metroPop.hidden = true; });
on('metro', paintMetroBtn);
// beat dots follow the clicks
(function metroLoop() {
  requestAnimationFrame(metroLoop);
  if (!S.metro.on) return;
  const b = metroBeat();
  [...metroDots.children].forEach((d, i) => d.classList.toggle('lit', i === b));
  metroBtn.classList.toggle('down', b === 0);
})();
paintMetroBtn();
paintMute();

function paintModes() {
  modes.textContent = '';
  for (const [id, ic, label] of MODES) {
    modes.append(h('button', { type: 'button', class: 'mode' + (S.mode === id ? ' on' : ''), 'aria-pressed': S.mode === id, onclick: () => ctx.go(id) }, icon(ic), h('span', {}, t(label))));
  }
  gear.setAttribute('aria-label', t('settings'));
  transport.setAttribute('aria-label', t('seqPlay'));
}

function paintTop() {
  chips.textContent = '';
  const n = S.split.on ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const pt = S.parts[i];
    chips.append(h('button', {
      type: 'button', class: 'part p' + i + (S.edit === i ? ' on' : ''),
      onclick: () => {
        // first tap selects the part, a tap on the selected one opens its sounds
        if (S.edit === i) ctx.go('create', 'sounds');
        else { S.edit = i; save(); emit('part'); }
      },
    }, h('b', {}, i ? 'B' : 'A'), h('span', {}, soundName(pt) + (pt.dirty ? '*' : ''))));
  }
  transport.hidden = !seqHasNotes() && !seq.playing;
  transport.textContent = '';
  transport.append(icon(seq.playing ? 'stop' : 'start'));
  transport.classList.toggle('on', seq.playing);
  document.documentElement.dataset.part = S.edit;
}

function paintMidi(st = midiStatusNow) {
  const label = { idle: t('midiIdle'), connected: st.inputs.map(i => i.name).join(', ') || 'MIDI', none: t('midiNone'), unsupported: t('midiUnsupported'), denied: t('midiDenied') }[st.state];
  midiPill.className = 'midi ' + st.state;
  midiPill.title = label;
  midiPill.textContent = '';
  midiPill.append(h('i'), h('span', {}, label));
}

function render() {
  if (!S.split.on) S.edit = 0;
  subs.forEach(u => u()); subs = [];
  ctx.graphs = [];
  view.textContent = '';
  view.className = 'view v-' + S.mode;
  document.documentElement.dataset.mode = S.mode;
  ({ play: renderPlay, learn: renderLearn, create: renderCreate }[S.mode] || renderPlay)(view, ctx);
  paintModes();
  paintTop();
  refreshGuide();
}

on('voice', render);
on('part', render);
on('split', render);
on('patch', paintTop);
on('seq', paintTop);
on('lang', () => { render(); paintMidi(); paintMetroBtn(); paintMute(); if (!sheet.hidden) ctx.openSheet(); });
on('theme', () => { if (S.mode !== 'learn') render(); });

// Guide (exercise / song) on the keys
setGuide(() => currentGuide());
onGuideChange(() => setGuide(() => currentGuide()));

E.onMeter(m => {
  const arr = S.edit === 0 ? m.a : m.b;
  for (const g of ctx.graphs) g.meter(arr);
});

onMidiState(st => {
  paintMidi(st);
  if (!sheet.hidden && sheetBox.dataset.kind === 'settings') ctx.openSheet();
});

// ── start: audio needs a gesture ──
const start = document.getElementById('start');
let starting = null;
async function boot() {
  starting ??= (async () => {
    try {
      await E.startAudio();
      applyAll();
      start.classList.add('gone');
      setTimeout(() => start.remove(), 400);
    } catch (err) {
      starting = null;
      start.querySelector('p').textContent = t('audioError') + ' ' + (err?.message || err);
    }
  })();
  return starting;
}
start.addEventListener('click', boot);
addEventListener('keydown', () => boot(), { once: true });

applyTheme();
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme());
document.documentElement.lang = S.lang;
document.getElementById('start-tap').textContent = t('startTap');
if (!navigator.requestMIDIAccess) document.getElementById('start-hint').textContent = t('startNoMidi');

paintMidi();
render();
bindComputerKeys();
initLumi();
connectMidi();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
on('tempo', () => E.setFx(S.fx, S.tempo));
document.addEventListener('visibilitychange', () => { if (document.hidden) allNotesOff(); });

// console handle for testing without a keyboard
import('./notes.js?v=202611120').then(N => { window.octave = { S, press: N.press, lift: N.lift, emit, applyDock }; });
