// Play screen: the stage (rising notes over the oscilloscope, or the staff of
// what is played), the chord readout, and the side panel for the sound.
import { h, icon, knob, param, seg, toggle, toast } from './ui.js?v=202611091';
import { S, save, emit } from './store.js?v=202611091';
import * as E from './engine.js?v=202611091';
import { subscribe, soundingNotes } from './notes.js?v=202611091';
import { applyPart, seq, seqPlay, seqHasNotes, arpClear, allOff } from './perform.js?v=202611091';
import { mountRoll, clearRoll, wake } from './roll.js?v=202611091';
import { mountStaff, clearScore, hasScore, showFullScore, hideFullScore, exportPng, exportSvg, exportMidi } from './score.js?v=202611091';
import { detectChord, chordSymbol, scaleContext, intervalBetween, spellPc, pitchClass, SCALES } from './theory.js?v=202611091';
import { t, chordQuality, inversionName, intervalName, scaleName, spelled, notation, noteLabel } from './i18n.js?v=202611091';
import { createGraph } from './graph.js?v=202611091';
import { soundName, soundMeta, stepVoice, loadVoice } from './create.js?v=202611091';
import { PIANO_SOUNDS } from './engine.js?v=202611091';
import { setSide } from './keys.js?v=202611091';
import { currentSong } from './song.js?v=202611091';

export function renderPlay(view, ctx) {
  setSide(null);
  const stage = h('section', { class: 'stage' });
  const canvas = h('canvas', { class: 'roll' });
  const readout = h('div', { class: 'readout', 'aria-live': 'polite' });
  const hint = h('div', { class: 'stage-hint' }, h('b', {}, t('playHint')), h('span', {}, t('playHint2')));
  const viewSeg = seg({ cls: 'stage-seg', options: [['roll', [icon('roll'), h('span', {}, t('viewRoll'))]], ['staff', [icon('score'), h('span', {}, t('viewStaff'))]]], get: () => S.playView, set: v => { S.playView = v; save(); ctx.rerender(); } });
  const panelBtn = h('button', { type: 'button', class: 'icon-btn panel-btn' + (S.panel ? ' on' : ''), 'aria-label': t('soundPanel'), 'aria-pressed': S.panel, onclick: () => { S.panel = !S.panel; save(); ctx.rerender(); } }, icon('panel'));
  const tools = h('div', { class: 'stage-tools' }, viewSeg, panelBtn);

  if (S.playView === 'staff') {
    const staff = h('div', { class: 'staff-live' });
    const actions = h('div', { class: 'staff-actions' },
      h('button', { type: 'button', class: 'btn ghost', onclick: () => ctx.openSheet(fullScoreSheet) }, icon('expand'), t('fullScore')),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { clearScore(); toast(t('scoreCleared')); } }, icon('trash'), t('clear')));
    stage.classList.add('with-staff');
    stage.append(canvas, readout, h('div', { class: 'staff-wrap' }, staff, actions), tools);
    // here the staff shows what is played (a song's staff lives on the Learn screen)
    requestAnimationFrame(() => mountStaff(staff, false));
    ctx.onLeave(() => mountStaff(null));
  } else {
    stage.append(canvas, readout, hint, tools);
  }

  const body = h('div', { class: 'play' + (S.panel ? '' : ' no-panel') }, stage);
  if (S.panel) body.append(sidePanel(ctx));
  view.append(body);
  requestAnimationFrame(() => { mountRoll(canvas); wake(); });

  // ── chord readout ──
  let lastSig = '', fadeTimer = 0;
  const paint = () => {
    const notes = soundingNotes();
    hint.classList.toggle('gone', notes.length > 0 || hint.dataset.used === '1');
    if (notes.length) hint.dataset.used = '1';
    if (!S.view.chordNames) { readout.textContent = ''; return; }
    const sig = notes.join(',');
    if (sig === lastSig) return;
    lastSig = sig;
    clearTimeout(fadeTimer);
    if (!notes.length) { fadeTimer = setTimeout(() => readout.classList.add('fade'), 900); return; }
    readout.classList.remove('fade');
    readout.textContent = '';
    const context = scaleContext(S.scale.root, S.scale.type);
    const chord = notes.length >= 2 ? detectChord(notes, context) : null;
    const nameOf = m => spelled(spellPc(pitchClass(m), chord, context));
    let big = '', small = '';
    if (chord) {
      big = chordSymbol(chord, notation());
      small = spelled(chord.root) + ' ' + chordQuality(chord.id);
      if (chord.inversion !== 'root') small += ' · ' + inversionName(chord.inversion, { bass: chord.bass ? spelled(chord.bass) : '' });
    } else if (notes.length === 2) {
      const iv = intervalBetween(notes[0], notes[1]);
      big = nameOf(notes[0]) + '–' + nameOf(notes[1]);
      small = intervalName(iv.semis) + (iv.octaves ? ' + ' + t('octaves', { n: iv.octaves }) : '');
    } else {
      big = nameOf(notes[0]);
      small = noteLabel(notes[0]);
    }
    readout.append(h('div', { class: 'chord' }, big), h('div', { class: 'chord-name' }, small),
      h('div', { class: 'chips' }, ...notes.map(m => h('span', { class: 'chip-note' }, nameOf(m)))));
  };
  const un = subscribe(e => { if (e.type === 'on' || e.type === 'off') paint(); });
  ctx.onLeave(un);
  paint();
}

// ── side panel: the selected sound and the quick toggles ──
function sidePanel(ctx) {
  const i = S.edit;
  const pt = S.parts[i];
  const name = h('div', { class: 'pname' }, soundName(pt));
  const meta = h('div', { class: 'pmeta' }, soundMeta(pt));
  const preset = h('div', { class: 'preset' },
    h('button', { class: 'nav', type: 'button', 'aria-label': t('prevSound'), onclick: () => stepVoice(-1) }, icon('prev')),
    h('button', { class: 'pinfo', type: 'button', onclick: () => ctx.go('create', 'sounds') }, name, meta),
    h('button', { class: 'nav', type: 'button', 'aria-label': t('nextSound'), onclick: () => stepVoice(1) }, icon('next')));

  const parts = S.split.on ? seg({ cls: 'part-seg', options: [[0, t('partA')], [1, t('partB')]], get: () => S.edit, set: v => { S.edit = v; save(); emit('part'); } }) : null;

  let graphBox = null;
  if (pt.kind === 'fm') {
    const graph = createGraph({ outLabel: t('out') });
    ctx.graphs.push(graph);
    graph.set(pt.patch);
    graphBox = h('button', { type: 'button', class: 'mini-graph', 'aria-label': t('editSound'), onclick: () => ctx.go('create', 'edit') }, graph.el);
  } else {
    // the four colours of the sampled piano, one tap away
    graphBox = h('div', { class: 'piano-pick' }, ...PIANO_SOUNDS.map((p, k) =>
      h('button', { type: 'button', class: 'chip' + (pt.ref.i === k ? ' on' : ''), onclick: () => loadVoice('piano', k) }, t('pianoShort_' + p.id))));
  }

  const m = pt.macros;
  const setM = () => { E.setMacros(i, m); save(); };
  const bi = (key, label) => knob({ label, min: -1, max: 1, bipolar: true, def: 0, get: () => m[key], set: v => { m[key] = v; setM(); }, fmt: v => (v > 0 ? '+' : '') + Math.round(v * 100) });
  const knobs = [bi('bright', t('mBright'))];
  if (pt.kind === 'fm') knobs.push(bi('attack', t('mAttack')));
  knobs.push(bi('release', t('mRelease')));
  if (pt.kind === 'fm') knobs.push(knob({ label: t('mVibrato'), min: 0, max: 1, def: 0, get: () => m.vibrato, set: v => { m.vibrato = v; setM(); } }));
  else knobs.push(knob({ label: t('reverb'), get: () => S.fx.reverb.mix, set: v => { S.fx.reverb.mix = v; S.fx.reverb.on = v > 0.01; E.setFx(S.fx, S.tempo); save(); }, def: 0.18 }));
  const vol = param({ label: t('volume') + (S.split.on ? ' ' + (i ? 'B' : 'A') : ''), min: 0, max: 1, step: 0.01, def: 0.8, get: () => pt.volume, set: v => { pt.volume = v; E.setVolume(i, v); save(); }, fmt: v => Math.round(v * 100) });

  // quick toggles: split, arp, sequence, scale guide
  const quick = h('div', { class: 'quick' },
    toggle({ label: t('split'), get: () => S.split.on, set: v => { S.split.on = v; if (!v) S.edit = 0; allOff(); save(); emit('split'); } }),
    toggle({ label: t('arp'), get: () => S.arp.on, set: v => { S.arp.on = v; if (!v) arpClear(); save(); emit('arp'); } }),
    seqHasNotes() ? h('button', { type: 'button', class: 'btn ghost' + (seq.playing ? ' on' : ''), onclick: () => { seqPlay(); ctx.rerender(); } }, icon(seq.playing ? 'stop' : 'start'), t('pattern')) : null);

  const scaleRow = h('div', { class: 'scale-row' },
    h('span', { class: 'lab' }, t('scaleGuide')),
    selectEl([['', t('none')], ...Object.keys(SCALES).map(k => [k, scaleName(k)])], S.scale.type, v => { S.scale.type = v; save(); emit('scale'); ctx.rerender(); }),
    S.scale.type ? selectEl(Array.from({ length: 12 }, (_, pc) => [pc, noteLabel(60 + pc, false)]), S.scale.root, v => { S.scale.root = +v; save(); emit('scale'); }) : null);

  return h('aside', { class: 'side' }, parts, preset, graphBox, h('div', { class: 'macros' }, ...knobs), vol, quick, scaleRow);
}

export function selectEl(options, value, onchange) {
  return h('select', { class: 'select', onchange: e => onchange(e.target.value) },
    ...options.map(([v, label]) => h('option', { value: v, selected: String(v) === String(value) }, label)));
}

// ── full score sheet ──
export function fullScoreSheet(box, ctx) {
  box.classList.add('wide');
  box.dataset.kind = 'score';
  const view = h('div', { class: 'full-score' });
  const song = S.mode === 'learn' && !!currentSong();
  box.append(
    h('div', { class: 'sheet-head' }, h('h2', {}, t('fullScore')),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn ghost', onclick: () => exportPng() }, icon('download'), 'PNG'),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => exportSvg() }, icon('download'), 'SVG'),
        song ? null : h('button', { type: 'button', class: 'btn ghost', onclick: () => exportMidi() }, icon('download'), 'MIDI'),
        h('button', { type: 'button', class: 'btn', onclick: () => ctx.closeSheet() }, t('close')))),
    hasScore(song) ? view : h('p', { class: 'muted' }, t('scoreEmpty')));
  if (hasScore(song)) requestAnimationFrame(() => showFullScore(view, song));
  box.addEventListener('close', () => hideFullScore(), { once: true });
}
