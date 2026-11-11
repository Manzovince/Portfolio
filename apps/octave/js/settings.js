// Settings sheet and theme.
import { h, param, seg, toggle, toast, icon } from './ui.js?v=202611134';
import { S, save, emit, resetAll } from './store.js?v=202611134';
import * as E from './engine.js?v=202611134';
import { allOff } from './perform.js?v=202611134';
import { status as midiStatus, selectInput, connectMidi } from './midi.js?v=202611134';
import { t, noteLabel, setLang } from './i18n.js?v=202611134';
import { keyHint } from './keys.js?v=202611134';
import { lumiState, lumiCount, lumiSettingChanged, LUMI_MODES, lumiBattery, onLumiBattery, lumiSysexLog, requestLumiBattery, lumiBatteryAsked } from './lumi.js?v=202611134';

// 'auto' follows the device; 'light' / 'dark' force it
export function applyTheme() {
  const th = S.theme || 'auto';
  if (th === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = th;
  const light = th === 'light' || (th === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', light ? '#f3f4f7' : '#0b0c10');
  emit('theme');
}

const row = (label, control) => h('div', { class: 'row' }, h('span', { class: 'lab' }, label), control);

// LUMI battery (experimental): level, charging, and the SysEx received, to check the decoding
function batteryBox(box) {
  const gauge = h('span', { class: 'battery-gauge' }, h('i'));
  const text = h('span');
  const log = h('pre', { class: 'lumi-log', hidden: true });
  const logBtn = h('button', { type: 'button', class: 'btn ghost', onclick: () => { log.hidden = !log.hidden; paint(); } }, t('lumiDiag'));
  const copyBtn = h('button', { type: 'button', class: 'btn ghost', onclick: async () => {
    try { await navigator.clipboard.writeText(lumiSysexLog().join('\n') || '—'); toast(t('lumiDiagCopied')); } catch { toast(t('lumiDiagCopyFail')); }
  } }, t('lumiDiagCopy'));
  const el = h('div', { class: 'lumi-battery' },
    h('div', { class: 'row' }, gauge, text, h('div', { class: 'spacer' }), h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('lumiBatteryAsk'), onclick: () => requestLumiBattery() }, icon('restart'))),
    h('div', { class: 'row' }, logBtn, copyBtn), log);
  function paint() {
    const b = lumiBattery();
    gauge.hidden = !b;
    if (b) {
      const pct = Math.round(b.level * 100);
      gauge.querySelector('i').style.width = `calc(${pct}% - 4px)`;
      gauge.classList.toggle('low', pct < 20);
      text.textContent = t('lumiBattery', { pct }) + (b.charging ? ' · ' + t('lumiCharging') : '');
    } else text.textContent = lumiBatteryAsked() ? t('lumiBatteryWaiting') : t('lumiBatteryUnknown');
    copyBtn.hidden = log.hidden;
    if (!log.hidden) log.textContent = (lumiSysexLog().join('\n') || t('lumiDiagEmpty')) + (b ? '\n\n→ ' + JSON.stringify(b.blocks) : '');
  }
  const un = onLumiBattery(paint);
  box.addEventListener('close', un, { once: true });
  paint();
  return el;
}

export function renderSettings(box, ctx) {
  box.dataset.kind = 'settings';
  const st = midiStatus;
  const ms = { idle: t('midiIdle'), connected: t('midiConnected'), none: t('midiNone'), unsupported: t('midiUnsupported'), denied: t('midiDenied') }[st.state];
  const kb = () => { save(); emit('kb'); };
  const lumi = key => { save(); lumiSettingChanged(key); emit('kb'); };

  const input = h('select', { class: 'select', 'aria-label': t('midiInput'), onchange: e => { selectInput(e.target.value); save(); } },
    h('option', { value: 'all' }, t('allInputs')),
    ...st.inputs.map(i => h('option', { value: i.id, selected: S.midi.input === i.id }, i.name)));

  const learn = h('button', { type: 'button', class: 'btn ghost', onclick: () => { learn.textContent = t('playAKey'); ctx.learnSplit(() => { learn.textContent = t('learn'); splitP.refresh(); }); } }, t('learn'));
  const splitP = param({ label: t('splitPoint'), min: 24, max: 108, get: () => S.split.point, set: v => { S.split.point = v; save(); emit('split'); }, fmt: v => noteLabel(v) });
  const sign = v => (v > 0 ? '+' : '') + v;

  let armedReset = false;
  const lumiLine = { off: t('lumiOff'), unsupported: t('midiUnsupported'), denied: t('lumiDenied'), none: t('lumiNone'), connected: t('lumiConnected', { n: lumiCount() }) }[lumiState()] || '';

  box.append(
    h('div', { class: 'sheet-head' }, h('h2', {}, t('settings')), h('button', { type: 'button', class: 'btn', onclick: () => ctx.closeSheet() }, t('close'))),
    h('div', { class: 'sheet-cols' },
      h('div', { class: 'card' },
        h('h3', {}, t('general')),
        row(t('language'), seg({ options: [['fr', 'Français'], ['en', 'English']], get: () => S.lang, set: v => setLang(v) })),
        row(t('theme'), seg({ options: [['auto', t('auto')], ['light', t('light')], ['dark', t('dark')]], get: () => S.theme, set: v => { S.theme = v; save(); applyTheme(); } })),
        row(t('noteNames'), seg({ options: [['auto', t('auto')], ['english', 'C D E'], ['solfege', 'Do Ré Mi']], get: () => S.notation, set: v => { S.notation = v; save(); emit('lang'); } })),
        row(t('colors'), seg({ cls: 'wrap', options: [['parts', t('colParts')], ['rainbow', t('colRainbow')], ['octave', t('colOctave')]], get: () => S.view.colors, set: v => { S.view.colors = v; save(); emit('theme'); } })),
        toggle({ label: t('showScope'), get: () => S.view.scope, set: v => { S.view.scope = v; save(); } }),
        toggle({ label: t('showChords'), get: () => S.view.chordNames, set: v => { S.view.chordNames = v; save(); } })),
      h('div', { class: 'card' },
        h('h3', {}, t('screenKeys')),
        row(t('dock'), seg({ options: [['full', t('dockFull')], ['mini', t('dockMini')]], get: () => S.kb.dock, set: v => { S.kb.dock = v; kb(); } })),
        row(t('keySize'), seg({ options: [['s', 'S'], ['m', 'M'], ['l', 'L']], get: () => S.kb.size, set: v => { S.kb.size = v; kb(); } })),
        row(t('labels'), seg({ options: [['c', t('labelsC')], ['all', t('labelsAll')], ['none', t('none')]], get: () => S.kb.labels, set: v => { S.kb.labels = v; kb(); } })),
        row(t('range'), seg({ options: [['free', t('rangeFree')], ['lumi', 'LUMI']], get: () => S.kb.follow, set: v => { S.kb.follow = v; kb(); } })),
        keyHint('p', { class: 'hint' }, 'computerKeysHint')),
      h('div', { class: 'card' },
        h('h3', {}, t('midiKeyboard')),
        h('p', { class: 'midi-line ' + st.state }, h('i'), ms, st.inputs.length ? ' · ' + st.inputs.map(i => i.name).join(', ') : ''),
        st.state === 'connected' ? input : null,
        h('button', { type: 'button', class: 'btn ghost', onclick: () => connectMidi() }, t('rescan')),
        row(t('velocity'), seg({ cls: 'wrap', options: [['soft', t('velSoft')], ['normal', t('velNormal')], ['hard', t('velHard')], ['fixed', t('velFixed')]], get: () => S.midi.velCurve, set: v => { S.midi.velCurve = v; save(); } })),
        h('div', { class: 'row' }, toggle({ label: 'Pitch bend', get: () => S.midi.bend, set: v => { S.midi.bend = v; if (!v) E.bend(0); save(); } }),
          param({ label: t('bendRange'), min: 1, max: 12, get: () => S.midi.bendRange, set: v => { S.midi.bendRange = v; save(); }, fmt: v => '±' + v })),
        param({ label: t('polyphony'), min: 4, max: 24, get: () => S.midi.poly, set: v => { S.midi.poly = v; E.setPoly(v); save(); }, fmt: v => t('voices', { n: v }) })),
      h('div', { class: 'card' },
        h('h3', {}, t('twoSounds')),
        toggle({ label: t('splitToggle'), get: () => S.split.on, set: v => { S.split.on = v; if (!v) S.edit = 0; allOff(); save(); emit('split'); } }),
        h('div', { class: 'row' }, splitP, learn),
        h('div', { class: 'grid2' },
          param({ label: t('octaveA'), min: -3, max: 3, bipolar: true, def: 0, get: () => S.parts[0].octave, set: v => { S.parts[0].octave = v; save(); }, fmt: sign }),
          param({ label: t('octaveB'), min: -3, max: 3, bipolar: true, def: 0, get: () => S.parts[1].octave, set: v => { S.parts[1].octave = v; save(); }, fmt: sign }))),
      h('div', { class: 'card' },
        h('h3', {}, 'LUMI'),
        toggle({ label: t('lumiEnable'), get: () => S.lumi.enabled, set: v => { S.lumi.enabled = v; lumi('enabled'); ctx.openSheet(); } }),
        S.lumi.enabled ? h('p', { class: 'midi-line ' + lumiState() }, h('i'), lumiLine) : null,
        S.lumi.enabled && lumiState() === 'connected' ? batteryBox(box) : null,
        S.lumi.enabled ? row(t('lumiBlocks'), seg({ options: [['auto', t('auto')], ['1', '1 · 24'], ['2', '2 · 48']], get: () => S.lumi.blocks, set: v => { S.lumi.blocks = v; lumi('blocks'); } })) : null,
        S.lumi.enabled ? param({ label: t('lumiOctave'), min: -3, max: 3, bipolar: true, def: 0, get: () => S.lumi.octave, set: v => { S.lumi.octave = v; lumi('octave'); }, fmt: sign }) : null,
        S.lumi.enabled ? param({ label: t('lumiBrightness'), min: 0.05, max: 1, step: 0.05, def: 0.6, get: () => S.lumi.brightness, set: v => { S.lumi.brightness = v; lumi('brightness'); }, fmt: v => Math.round(v * 100) + ' %' }) : null,
        S.lumi.enabled ? toggle({ label: t('lumiGuide'), get: () => S.lumi.guide, set: v => { S.lumi.guide = v; lumi('guide'); } }) : null,
        S.lumi.enabled ? h('div', { class: 'row' }, h('span', { class: 'lab' }, t('lumiGuideColor')), h('input', { type: 'color', class: 'color', value: S.lumi.color, oninput: e => { S.lumi.color = e.target.value; lumi('color'); } })) : null,
        S.lumi.enabled ? row(t('lumiRestore'), seg({ cls: 'wrap', options: LUMI_MODES.map(m => [m, t('lumiMode_' + m)]), get: () => S.lumi.restore, set: v => { S.lumi.restore = v; lumi('restore'); } })) : null,
        h('p', { class: 'hint' }, t('lumiHelp'))),
      h('div', { class: 'card help' },
        h('h3', {}, t('help')),
        h('p', {}, t('helpIos')),
        h('p', {}, t('helpSplit')),
        h('p', {}, t('helpSound')),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => { allOff(); toast(t('allSoundsOff')); } }, t('allSoundsOff')),
        h('button', { type: 'button', class: 'btn ghost danger', onclick: e => {
          if (!armedReset) { armedReset = true; e.currentTarget.textContent = t('resetConfirm'); setTimeout(() => { armedReset = false; }, 3000); return; }
          resetAll();
        } }, t('reset')))));
}
