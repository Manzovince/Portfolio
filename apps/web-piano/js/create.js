// Create screen (from Phase): Sounds (piano + FM banks, .syx import/export),
// Edit (six-operator FM editor with the animated graph), Arp, Seq, Effects.
import { h, param, knob, seg, toggle, toast, icon } from './ui.js?v=202611102';
import { S, banks, save, saveBanks, emit, pianoPart } from './store.js?v=202611102';
import { FACTORY, CATEGORIES } from './presets.js?v=202611102';
import { clonePatch, parseSyx, buildSyx } from './dx7.js?v=202611102';
import { createGraph, ratioText } from './graph.js?v=202611102';
import * as E from './engine.js?v=202611102';
import { PIANO_SOUNDS } from './engine.js?v=202611102';
import { applyPart, seq, seqPlay, seqRest, seqPosition, arpClear } from './perform.js?v=202611102';
import { ALGORITHMS } from './algorithms.js?v=202611102';
import { t, noteLabel } from './i18n.js?v=202611102';

let CTX = null;
const sub = (evt, fn) => CTX.sub(evt, fn);
const part = () => S.parts[S.edit];
const patch = () => part().patch;

// ── names ──────────────────────────────────────────────────────
const CAT_KEYS = { Basiques: 'catBasic', Pianos: 'catPianos', Basses: 'catBass', Cloches: 'catBells', Nappes: 'catPads', Leads: 'catLeads', Orgues: 'catOrgans', Percus: 'catPerc' };
const bankName = b => (b.id === 'piano' ? t('bankPiano') : b.factory ? t(CAT_KEYS[b.cat] || b.cat) : b.id === 'mine' ? t('bankMine') : b.name);
export const soundName = pt => (pt.kind === 'piano' ? t('piano_' + (PIANO_SOUNDS[pt.ref.i]?.id || 'grand')) : pt.patch?.name || '—');
export function soundMeta(pt) {
  const b = bankList().find(x => x.id === refBank(pt.ref));
  const p = S.split.on ? (S.edit ? 'B · ' : 'A · ') : '';
  return p + (pt.kind === 'piano' ? t('sampled') : (b ? bankName(b) : 'FM') + (pt.dirty ? ' · ' + t('modified') : ''));
}

// ── banks ──────────────────────────────────────────────────────
export function bankList() {
  const out = [{ id: 'piano', piano: true, voices: PIANO_SOUNDS.map((p, i) => ({ p, i })) }];
  for (const c of CATEGORIES) out.push({ id: 'usine:' + c, cat: c, factory: true, voices: FACTORY.map((p, i) => ({ p, i })).filter(v => v.p.cat === c) });
  for (const b of banks) out.push({ id: b.id, name: b.name, user: true, voices: b.voices.map((p, i) => ({ p, i })) });
  return out;
}
const refBank = ref => (ref.bank === 'usine' ? 'usine:' + (FACTORY[ref.i]?.cat || CATEGORIES[0]) : ref.bank);

export function loadVoice(bankId, i, target = S.edit) {
  if (bankId === 'piano') {
    const vol = S.parts[target].volume;
    S.parts[target] = { ...pianoPart(i), volume: vol, octave: S.parts[target].octave };
  } else {
    const p = bankId.startsWith('usine') ? FACTORY[i] : banks.find(b => b.id === bankId)?.voices[i];
    if (!p) return;
    const pt = S.parts[target];
    pt.kind = 'fm';
    pt.patch = clonePatch(p);
    pt.ref = { bank: bankId.startsWith('usine') ? 'usine' : bankId, i };
    pt.dirty = false;
  }
  applyPart(target);
  save();
  emit('voice');
}

export function stepVoice(d) {
  const pt = part();
  const b = bankList().find(x => x.id === refBank(pt.ref));
  if (!b || !b.voices.length) return;
  let k = b.voices.findIndex(v => v.i === pt.ref.i);
  k = (k + d + b.voices.length) % b.voices.length;
  loadVoice(b.id, b.voices[k].i);
}

// Live patch edits: push to the engine at most once per frame
let pendingPatch = false;
function patchChanged() {
  part().dirty = true;
  if (!pendingPatch) {
    pendingPatch = true;
    requestAnimationFrame(() => { pendingPatch = false; E.setPatch(S.edit, patch()); });
  }
  save();
  emit('patch');
}

// ── screen ─────────────────────────────────────────────────────
const TABS = [['sounds', 'tabSounds', renderSounds], ['edit', 'tabEdit', renderEdit], ['arp', 'tabArp', renderArp], ['seq', 'tabSeq', renderSeq], ['fx', 'tabFx', renderFx]];

export function renderCreate(view, ctx) {
  CTX = ctx;
  const tab = TABS.find(x => x[0] === S.createTab) || TABS[0];
  const nav = seg({ cls: 'subnav', options: TABS.map(([id, label]) => [id, t(label)]), get: () => tab[0], set: v => { S.createTab = v; save(); ctx.rerender(); } });
  const parts = S.split.on ? seg({ cls: 'part-seg', options: [[0, t('partA')], [1, t('partB')]], get: () => S.edit, set: v => { S.edit = v; save(); emit('part'); } }) : null;
  const body = h('div', { class: 'create-body c-' + tab[0] });
  view.append(h('div', { class: 'subbar' }, nav, h('div', { class: 'spacer' }), ['sounds', 'edit'].includes(tab[0]) ? parts : null), body);
  tab[2](body, ctx);
}

// ── Sons ───────────────────────────────────────────────────────
let viewBank = null;
let armedDelete = null;
function renderSounds(view, ctx) {
  const list = bankList();
  if (!viewBank || !list.find(b => b.id === viewBank)) viewBank = refBank(part().ref);
  const file = h('input', { type: 'file', accept: '.syx,.SYX,application/octet-stream', hidden: true, onchange: e => importFiles(e.target.files, ctx) });
  const side = h('div', { class: 'banks' },
    bankBtn(list[0], ctx),
    h('div', { class: 'bank-group' }, t('groupFactory')),
    ...list.filter(b => b.factory).map(b => bankBtn(b, ctx)),
    h('div', { class: 'bank-group' }, t('groupYours')),
    ...list.filter(b => b.user).map(b => bankBtn(b, ctx)),
    h('button', { type: 'button', class: 'btn ghost import', onclick: () => file.click() }, icon('upload'), t('importSyx')),
    file);

  const b = list.find(x => x.id === viewBank);
  const pt = part();
  const grid = h('div', { class: 'voice-grid' });
  if (!b.voices.length) grid.append(h('p', { class: 'empty' }, b.id === 'mine' ? t('mineEmpty') : t('bankEmpty')));
  for (const v of b.voices) {
    const cur = refBank(pt.ref) === b.id && pt.ref.i === v.i;
    const label = b.piano ? t('piano_' + v.p.id) : v.p.name;
    const sub2 = b.piano ? t('pianoDesc_' + v.p.id) : 'alg ' + v.p.alg;
    grid.append(h('button', { type: 'button', class: 'voice' + (cur ? ' on' : '') + (b.piano ? ' is-piano' : ''), onclick: () => { loadVoice(b.id, v.i); } },
      h('span', { class: 'vn' }, label), h('small', {}, sub2)));
  }
  const actions = [];
  if (b.user && b.voices.length) actions.push(h('button', { type: 'button', class: 'btn ghost', onclick: () => exportBank(b) }, icon('download'), t('exportSyx')));
  if (b.user && b.id !== 'mine') {
    actions.push(h('button', { type: 'button', class: 'btn ghost danger', onclick: e => {
      if (armedDelete !== b.id) { armedDelete = b.id; e.currentTarget.lastChild.textContent = t('confirm'); setTimeout(() => { armedDelete = null; }, 3000); return; }
      banks.splice(banks.findIndex(x => x.id === b.id), 1); saveBanks(); armedDelete = null; viewBank = null; ctx.rerender(); toast(t('bankDeleted'));
    } }, icon('trash'), h('span', {}, t('delete'))));
  }
  const head = h('div', { class: 'voices-head' }, h('h2', {}, bankName(b), h('em', {}, t('nSounds', { n: b.voices.length }))), ...actions);
  view.append(h('div', { class: 'sounds' }, side, h('div', { class: 'voices' }, head, grid)));
}

function bankBtn(b, ctx) {
  return h('button', { type: 'button', class: 'bank' + (b.id === viewBank ? ' on' : ''), onclick: () => { viewBank = b.id; ctx.rerender(); } }, h('span', {}, bankName(b)), h('small', {}, String(b.voices.length)));
}

async function importFiles(files, ctx) {
  let n = 0;
  for (const f of files) {
    const voices = parseSyx(await f.arrayBuffer());
    if (!voices.length) { toast(t('syxNone', { name: f.name })); continue; }
    const id = 'syx-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    banks.push({ id, name: f.name.replace(/\.syx$/i, '').slice(0, 24), voices });
    viewBank = id;
    n += voices.length;
  }
  if (n) {
    toast(saveBanks() ? t('syxImported', { n }) : t('storageFullSession'));
    loadVoice(viewBank, 0);
  }
  ctx.rerender();
}

function exportBank(b) {
  const blob = new Blob([buildSyx(b.voices.map(v => v.p))], { type: 'application/octet-stream' });
  const a = h('a', { href: URL.createObjectURL(blob), download: (bankName(b) || 'octave').replace(/[^\w-]+/g, '_') + '.syx' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ── Éditer ─────────────────────────────────────────────────────
let editOp = 0;
const CURVES = [[0, '−lin'], [1, '−exp'], [2, '+exp'], [3, '+lin']];
const WAVES = [[0, '△'], [1, '⩘'], [2, '⩗'], [3, '⊓'], [4, '∿'], [5, 'S/H']];

// Envelope preview, simulated with the same rules as the worklet
function envCurve(r, l, ol = 99) {
  const OLT = [0, 5, 9, 13, 17, 20, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 45, 46];
  const sc = x => (x >= 20 ? 28 + x : OLT[x]);
  const olu = sc(ol) << 5;
  const tgt = L => Math.max(16, ((sc(L) >> 1) << 6) + olu - 4256);
  const rate = R => { const q = Math.min(63, (R * 41) >> 6); return ((4 + (q & 3)) * Math.pow(2, 2 + (q >> 2)) / 65536) * 44100; };
  const pts = [];
  let lv = 0, st = 0, tt = 0, down = true, holdT = 0;
  const dt = 0.002;
  for (let k = 0; k < 6000; k++) {
    if (st === 3 && down) { holdT += dt; if (holdT > 0.35 || tt > 5) down = false; }
    if (st < 3 || (st === 3 && !down)) {
      const g = tgt(l[st]);
      if (g > lv) { if (lv < 1716) lv = 1716; lv += rate(r[st]) * dt * Math.max(1, Math.floor((4352 - lv) / 256)); if (lv >= g) { lv = g; st++; } }
      else { lv -= rate(r[st]) * dt; if (lv <= g) { lv = g; st++; } }
    }
    pts.push([tt, lv]);
    tt += dt;
    if (st >= 4) break;
    if (tt > 8 && !down) break;
  }
  return pts;
}

function envCanvas(getRL) {
  const c = h('canvas', { class: 'env' });
  c.draw = () => {
    const { r, l } = getRL();
    const dpr = devicePixelRatio || 1;
    const w = c.clientWidth || 300, hh = c.clientHeight || 70;
    c.width = w * dpr; c.height = hh * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const pts = envCurve(r, l);
    const T = pts[pts.length - 1][0] || 1;
    const css = getComputedStyle(document.documentElement);
    g.strokeStyle = css.getPropertyValue('--line').trim();
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, hh - 0.5); g.lineTo(w, hh - 0.5); g.stroke();
    g.beginPath();
    pts.forEach(([tt, lv], i) => {
      const x = (tt / T) * (w - 4) + 2;
      const y = hh - 4 - (Math.pow(2, lv / 256 - 15) * (hh - 10));
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.strokeStyle = css.getPropertyValue('--accent').trim();
    g.lineWidth = 2;
    g.stroke();
    g.lineTo(w - 2, hh); g.lineTo(2, hh); g.closePath();
    g.globalAlpha = 0.12; g.fillStyle = g.strokeStyle; g.fill(); g.globalAlpha = 1;
    g.fillStyle = css.getPropertyValue('--dim').trim();
    g.font = '10px ui-monospace, monospace';
    g.fillText(T < 1 ? Math.round(T * 1000) + ' ms' : T.toFixed(1) + ' s', w - 44, 12);
  };
  requestAnimationFrame(c.draw);
  return c;
}

function rlGrid(obj, onChange, labels) {
  const grid = h('div', { class: 'rl' });
  for (const [key, lab] of [['r', labels[0]], ['l', labels[1]]]) {
    for (let i = 0; i < 4; i++) grid.append(param({ label: lab + ' ' + (i + 1), min: 0, max: 99, get: () => obj[key][i], set: v => { obj[key][i] = v; onChange(); } }));
  }
  return grid;
}

function renderEdit(view, ctx) {
  const pt = part();
  if (pt.kind !== 'fm') {
    view.append(h('div', { class: 'empty-state' },
      icon('piano'), h('h2', {}, t('editPianoTitle')), h('p', {}, t('editPianoText')),
      h('button', { type: 'button', class: 'btn', onclick: () => { viewBank = 'usine:Pianos'; S.createTab = 'sounds'; save(); ctx.rerender(); } }, t('editPianoGo'))));
    return;
  }
  const p = pt.patch;
  const graph = createGraph({ compact: true, outLabel: t('out'), onSelect: op => { editOp = op; ctx.rerender(); } });
  ctx.graphs.push(graph);
  graph.set(p);
  graph.select(editOp);

  const left = h('div', { class: 'edit-left' },
    h('div', { class: 'graph-box' }, graph.el),
    param({ label: t('algorithm'), min: 1, max: 32, get: () => p.alg, set: v => { p.alg = v; graph.set(p); patchChanged(); } }),
    param({ label: t('feedback'), min: 0, max: 7, get: () => p.fb, set: v => { p.fb = v; graph.refreshText(); patchChanged(); } }),
    h('div', { class: 'opbar' },
      h('button', { type: 'button', class: 'chip' + (editOp == null ? ' on' : ''), onclick: () => { editOp = null; ctx.rerender(); } }, t('global')),
      ...[0, 1, 2, 3, 4, 5].map(i => h('button', { type: 'button', class: 'chip op' + (editOp === i ? ' on' : ''), onclick: () => { editOp = i; ctx.rerender(); } }, String(i + 1)))));

  const status = h('span', { class: 'dirty' }, pt.dirty ? t('modified') : '');
  sub('patch', () => { status.textContent = part().dirty ? t('modified') : ''; });
  const head = h('div', { class: 'edit-head' },
    h('h2', {}, editOp == null ? t('global') : t('operator', { n: editOp + 1 }), h('em', {}, editOp == null ? p.name : (isCarrier(p, editOp) ? t('carrier') : t('modulator')))),
    status,
    h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (!pt.dirty) return; loadVoice(pt.ref.bank === 'usine' ? 'usine' : pt.ref.bank, pt.ref.i); toast(t('changesUndone')); } }, t('undo')),
    h('button', { type: 'button', class: 'btn', onclick: () => saveCurrent(ctx) }, t('save')));

  const body = h('div', { class: 'edit-body' });
  if (editOp == null) globalEditor(body, p, graph);
  else opEditor(body, p, editOp, graph);
  view.append(h('div', { class: 'edit' }, left, h('div', { class: 'edit-right' }, head, body)));
}

const isCarrier = (p, i) => ALGORITHMS[p.alg - 1].carriers.includes(i);

function opEditor(body, p, i, graph) {
  const op = p.ops[i];
  const changed = () => { graph.refreshText(); patchChanged(); env.draw(); ratioOut.textContent = ratioText(op); };
  const ratioOut = h('b', { class: 'ratio-big' }, ratioText(op));
  const env = envCanvas(() => op);
  const sign = v => (v > 0 ? '+' : '') + v;
  body.append(
    h('div', { class: 'row' }, seg({ options: [[0, t('ratio')], [1, t('fixed')]], get: () => op.fixed, set: v => { op.fixed = v; changed(); } }), ratioOut),
    h('div', { class: 'grid4' },
      param({ label: t('coarse'), min: 0, max: 31, get: () => op.coarse, set: v => { op.coarse = v; changed(); } }),
      param({ label: t('fine'), min: 0, max: 99, get: () => op.fine, set: v => { op.fine = v; changed(); }, def: 0 }),
      param({ label: t('detune'), min: -7, max: 7, bipolar: true, def: 0, get: () => op.det - 7, set: v => { op.det = v + 7; changed(); }, fmt: sign }),
      param({ label: t('level'), min: 0, max: 99, get: () => op.ol, set: v => { op.ol = v; changed(); } }),
      param({ label: t('velocity'), min: 0, max: 7, get: () => op.vel, set: v => { op.vel = v; changed(); } }),
      param({ label: t('ampMod'), min: 0, max: 3, get: () => op.ams, set: v => { op.ams = v; changed(); } }),
      param({ label: t('rateScale'), min: 0, max: 7, get: () => op.rs, set: v => { op.rs = v; changed(); } })),
    h('h3', {}, t('envelope')),
    env,
    rlGrid(op, changed, [t('rate'), t('level')]),
    h('details', { class: 'more' },
      h('summary', {}, t('keyScaling')),
      h('div', { class: 'grid4' },
        param({ label: t('breakpoint'), min: 0, max: 99, get: () => op.bp, set: v => { op.bp = v; changed(); }, fmt: v => noteLabel(v + 21) }),
        param({ label: t('depthLeft'), min: 0, max: 99, get: () => op.ld, set: v => { op.ld = v; changed(); } }),
        param({ label: t('depthRight'), min: 0, max: 99, get: () => op.rd, set: v => { op.rd = v; changed(); } })),
      h('div', { class: 'row' }, h('span', { class: 'lab' }, t('curveLeft')), seg({ options: CURVES, get: () => op.lc, set: v => { op.lc = v; changed(); } })),
      h('div', { class: 'row' }, h('span', { class: 'lab' }, t('curveRight')), seg({ options: CURVES, get: () => op.rc, set: v => { op.rc = v; changed(); } }))));
}

function globalEditor(body, p, graph) {
  const changed = () => { graph.refreshText(); patchChanged(); };
  const name = h('input', { class: 'name', value: p.name, maxlength: 16, 'aria-label': t('soundName'), oninput: e => { p.name = e.target.value; changed(); } });
  const penv = envCanvasPitch(p);
  body.append(
    h('div', { class: 'row' }, h('span', { class: 'lab' }, t('name')), name),
    h('div', { class: 'grid4' },
      param({ label: t('transpose'), min: -24, max: 24, bipolar: true, def: 0, get: () => p.transpose - 24, set: v => { p.transpose = v + 24; changed(); }, fmt: v => (v > 0 ? '+' : '') + v }),
      toggle({ label: t('oscSync'), get: () => p.oks, set: v => { p.oks = v ? 1 : 0; changed(); } })),
    h('h3', {}, 'LFO'),
    h('div', { class: 'row' }, h('span', { class: 'lab' }, t('wave')), seg({ options: WAVES, get: () => p.lfo.wave, set: v => { p.lfo.wave = v; changed(); } })),
    h('div', { class: 'grid4' },
      param({ label: t('speed'), min: 0, max: 99, get: () => p.lfo.speed, set: v => { p.lfo.speed = v; changed(); } }),
      param({ label: t('delayL'), min: 0, max: 99, get: () => p.lfo.delay, set: v => { p.lfo.delay = v; changed(); } }),
      param({ label: t('pitchDepth'), min: 0, max: 99, get: () => p.lfo.pmd, set: v => { p.lfo.pmd = v; changed(); } }),
      param({ label: t('ampDepth'), min: 0, max: 99, get: () => p.lfo.amd, set: v => { p.lfo.amd = v; changed(); } }),
      param({ label: t('pitchSens'), min: 0, max: 7, get: () => p.lfo.pms, set: v => { p.lfo.pms = v; changed(); } }),
      toggle({ label: t('keySync'), get: () => p.lfo.sync, set: v => { p.lfo.sync = v ? 1 : 0; changed(); } })),
    h('h3', {}, t('pitchEnv')),
    penv,
    rlGrid(p.pitchEnv, () => { changed(); penv.draw(); }, [t('rate'), t('level')]));
}

function envCanvasPitch(p) {
  const c = h('canvas', { class: 'env' });
  c.draw = () => {
    const dpr = devicePixelRatio || 1;
    const w = c.clientWidth || 300, hh = c.clientHeight || 70;
    c.width = w * dpr; c.height = hh * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const { r, l } = p.pitchEnv;
    const y = L => hh / 2 - ((L - 50) / 50) * (hh / 2 - 6);
    const span = R => 0.3 + (99 - R) / 99 * 1.7;
    g.strokeStyle = css.getPropertyValue('--line').trim();
    g.beginPath(); g.moveTo(0, hh / 2); g.lineTo(w, hh / 2); g.stroke();
    const xs = [0, span(r[0]), span(r[1]), span(r[2]), 1, span(r[3])];
    const tot = xs.reduce((a, b) => a + b, 0);
    let x = 2;
    g.beginPath(); g.moveTo(x, y(l[3]));
    const lv = [l[0], l[1], l[2], l[2], l[3]];
    for (let i = 1; i < 6; i++) { x += (xs[i] / tot) * (w - 4); g.lineTo(x, y(lv[i - 1])); }
    g.strokeStyle = css.getPropertyValue('--accent').trim(); g.lineWidth = 2; g.stroke();
  };
  requestAnimationFrame(c.draw);
  return c;
}

function saveCurrent(ctx) {
  const pt = part();
  const p = clonePatch(pt.patch);
  delete p.cat;
  const user = pt.ref.bank !== 'usine' ? banks.find(b => b.id === pt.ref.bank) : null;
  if (user) user.voices[pt.ref.i] = p;
  else {
    const mine = banks.find(b => b.id === 'mine');
    mine.voices.push(p);
    pt.ref = { bank: 'mine', i: mine.voices.length - 1 };
  }
  if (!saveBanks()) { toast(t('storageFull')); return; }
  pt.dirty = false;
  save();
  toast(t('soundSaved', { name: p.name, bank: user ? user.name : t('bankMine') }));
  ctx.rerender();
}

// ── Arp ────────────────────────────────────────────────────────
function renderArp(view) {
  const A = S.arp;
  const ch = () => save();
  view.append(h('div', { class: 'cols' },
    h('div', { class: 'card' },
      toggle({ label: t('arpeggiator'), cls: 'big', get: () => A.on, set: v => { A.on = v; if (!v) arpClear(); ch(); emit('arp'); } }),
      S.split.on ? h('div', { class: 'row' }, h('span', { class: 'lab' }, t('arpOn')), seg({ options: [[0, t('partALow')], [1, t('partBHigh')], ['all', t('both')]], get: () => A.target, set: v => { A.target = v; arpClear(); ch(); } })) : null,
      toggle({ label: t('latch'), get: () => A.latch, set: v => { A.latch = v; if (!v) arpClear(); ch(); } }),
      tempoParam(),
      h('p', { class: 'hint' }, t('arpHint'))),
    h('div', { class: 'card' },
      h('h3', {}, t('mode')),
      seg({ cls: 'wrap', options: [['up', t('arpUp')], ['down', t('arpDown')], ['updown', t('arpUpDown')], ['random', t('arpRandom')], ['order', t('arpOrder')], ['chord', t('arpChord')]], get: () => A.mode, set: v => { A.mode = v; ch(); } }),
      h('h3', {}, t('rateL')),
      seg({ cls: 'wrap', options: [[1, '1/4'], [0.5, '1/8'], [1 / 3, '1/8T'], [0.25, '1/16'], [1 / 6, '1/16T'], [0.125, '1/32']], get: () => A.rate, set: v => { A.rate = v; ch(); } }),
      h('h3', {}, t('octavesL')),
      seg({ options: [[1, '1'], [2, '2'], [3, '3'], [4, '4']], get: () => A.octaves, set: v => { A.octaves = v; ch(); } }),
      param({ label: t('gate'), min: 0.1, max: 0.95, step: 0.01, get: () => A.gate, set: v => { A.gate = v; ch(); }, fmt: v => Math.round(v * 100) + ' %' }))));
}

export function tempoParam(cls = '') {
  const el = param({ label: t('tempo'), min: 40, max: 220, get: () => S.tempo, set: v => { S.tempo = v; E.setFx(S.fx, v); save(); emit('tempo'); }, fmt: v => v + ' bpm', sens: 0.6 });
  if (cls) el.classList.add(cls);
  if (CTX) sub('tempo', () => el.refresh());
  return el;
}

// ── Séq ────────────────────────────────────────────────────────
let selStep = 0;
function renderSeq(view, ctx) {
  const Q = S.seq;
  const cells = [];
  const grid = h('div', { class: 'steps' });
  for (let i = 0; i < 16; i++) {
    const c = h('button', { type: 'button', class: 'step', onclick: () => { selStep = i; if (seq.rec && !seq.playing) seq.cursor = i; paint(); stepEd(); } });
    cells.push(c); grid.append(c);
  }
  const paint = () => {
    cells.forEach((c, i) => {
      const st = Q.steps[i];
      c.className = 'step' + (i >= Q.length ? ' out' : '') + (st.on && st.notes.length ? ' full' : '') + (!st.on ? ' mute' : '') + (i === selStep ? ' sel' : '') + (seq.rec && !seq.playing && i === seq.cursor ? ' cursor' : '') + (i % 4 === 0 ? ' beat' : '');
      c.textContent = '';
      c.append(h('span', {}, st.notes.length ? noteLabel(st.notes[0] + (seq.playing ? seq.transpose : 0)) : '·'), st.notes.length > 1 ? h('small', {}, '+' + (st.notes.length - 1)) : '', h('i', { style: `height:${(st.vel / 127) * 100}%` }));
    });
  };
  let raf = 0;
  const loop = () => {
    if (!grid.isConnected) return;
    raf = requestAnimationFrame(loop);
    const pos = seqPosition();
    cells.forEach((c, i) => c.classList.toggle('now', i === pos));
  };
  raf = requestAnimationFrame(loop);
  ctx.onLeave(() => cancelAnimationFrame(raf));
  const play = h('button', { type: 'button', class: 'btn transport', onclick: () => seqPlay() });
  const rec = toggle({ label: 'REC', cls: 'rec', get: () => seq.rec, set: v => { seq.rec = v; seq.recDown = 0; if (v && !seq.playing) seq.cursor = selStep; paint(); } });
  const syncPlay = () => { play.textContent = ''; play.append(icon(seq.playing ? 'stop' : 'start'), seq.playing ? t('stop') : t('playL')); play.classList.toggle('on', seq.playing); paint(); };
  sub('seq', () => { syncPlay(); stepEd(); });
  syncPlay();
  let armedClear = false;
  const clear = h('button', { type: 'button', class: 'btn ghost danger', onclick: e => {
    if (!armedClear) { armedClear = true; e.currentTarget.textContent = t('confirm'); setTimeout(() => { armedClear = false; clear.textContent = t('clearAll'); }, 3000); return; }
    Q.steps.forEach(s => { s.notes = []; s.on = true; s.vel = 100; }); seq.cursor = 0; save(); paint(); stepEd(); armedClear = false; clear.textContent = t('clearAll'); emit('seq');
  } }, t('clearAll'));

  const ed = h('div', { class: 'step-ed' });
  const stepEd = () => {
    const st = Q.steps[selStep];
    ed.textContent = '';
    ed.append(
      h('span', { class: 'lab' }, t('step', { n: selStep + 1 })),
      h('span', { class: 'notes' }, st.notes.length ? st.notes.map(n => noteLabel(n)).join(' ') : t('silence')),
      toggle({ label: t('active'), get: () => st.on, set: v => { st.on = v; save(); paint(); } }),
      param({ label: t('velocity'), min: 1, max: 127, get: () => st.vel, set: v => { st.vel = v; save(); paint(); } }),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { st.notes = []; save(); paint(); stepEd(); emit('seq'); } }, t('empty')));
  };
  stepEd();

  view.append(h('div', { class: 'seq' },
    h('div', { class: 'seq-bar' }, play, rec,
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (seq.rec && !seq.playing) { seqRest(); paint(); } else toast(t('restHint')); } }, t('rest')),
      clear),
    grid,
    ed,
    h('div', { class: 'grid4' },
      param({ label: t('length'), min: 1, max: 16, get: () => Q.length, set: v => { Q.length = v; save(); paint(); } }),
      param({ label: t('gate'), min: 0.1, max: 1, step: 0.01, get: () => Q.gate, set: v => { Q.gate = v; save(); }, fmt: v => Math.round(v * 100) + ' %' }),
      param({ label: 'Swing', min: 0, max: 0.7, step: 0.01, get: () => Q.swing, set: v => { Q.swing = v; save(); }, fmt: v => Math.round(v * 100) + ' %' }),
      tempoParam()),
    h('div', { class: 'row' },
      S.split.on ? seg({ options: [[0, t('soundA')], [1, t('soundB')]], get: () => Q.part, set: v => { Q.part = v; E.stopSource('seq'); save(); } }) : null,
      toggle({ label: t('transposeKeys'), get: () => Q.transpose, set: v => { Q.transpose = v; if (!v) seq.transpose = 0; save(); paint(); } }),
      h('span', { class: 'hint' }, seq.rec ? (seq.playing ? t('recLiveHint') : t('recStepHint')) : t('transposeHint')))));
  paint();
}

// ── Effets ─────────────────────────────────────────────────────
function renderFx(view) {
  const F = S.fx;
  const ch = () => { E.setFx(F, S.tempo); save(); };
  const pct = v => Math.round(v * 100);
  const card = (title, obj, kids) => {
    const c = h('div', { class: 'card fx' + (obj && !obj.on ? ' off' : '') });
    c.append(
      h('div', { class: 'fx-head' }, h('h3', {}, title),
        obj ? toggle({ label: '', cls: 'mini', get: () => obj.on, set: v => { obj.on = v; c.classList.toggle('off', !v); ch(); } }) : null),
      h('div', { class: 'knobs' }, ...kids));
    return c;
  };
  view.append(h('div', { class: 'fx-row' },
    card(t('filter'), null, [
      knob({ label: t('filterLH'), min: -1, max: 1, bipolar: true, def: 0, get: () => F.filter.pos, set: v => { F.filter.pos = Math.abs(v) < 0.03 ? 0 : v; ch(); }, fmt: v => (Math.abs(v) < 0.03 ? 'off' : v < 0 ? 'LP ' + pct(-v) : 'HP ' + pct(v)), size: 'l' }),
      knob({ label: t('resonance'), get: () => F.filter.res, set: v => { F.filter.res = v; ch(); }, def: 0.2 })]),
    card('Chorus', F.chorus, [
      knob({ label: t('speed'), min: 0.1, max: 4, get: () => F.chorus.rate, set: v => { F.chorus.rate = v; ch(); }, fmt: v => v.toFixed(1) + ' Hz', def: 0.6 }),
      knob({ label: t('depth'), get: () => F.chorus.depth, set: v => { F.chorus.depth = v; ch(); }, def: 0.4 }),
      knob({ label: 'Mix', get: () => F.chorus.mix, set: v => { F.chorus.mix = v; ch(); }, def: 0.35 })]),
    card('Delay', F.delay, [
      seg({ cls: 'div', options: [[0.5, '1/8'], [0.75, '1/8.'], [1, '1/4'], [1.5, '1/4.'], [2 / 3, '1/4T']], get: () => F.delay.beats, set: v => { F.delay.beats = v; ch(); } }),
      knob({ label: t('feedbackDl'), min: 0, max: 0.9, get: () => F.delay.fb, set: v => { F.delay.fb = v; ch(); }, def: 0.35 }),
      knob({ label: t('tone'), get: () => F.delay.tone, set: v => { F.delay.tone = v; ch(); }, def: 0.6 }),
      knob({ label: 'Mix', get: () => F.delay.mix, set: v => { F.delay.mix = v; ch(); }, def: 0.25 })]),
    card(t('reverb'), F.reverb, [
      knob({ label: t('size'), get: () => F.reverb.size, set: v => { F.reverb.size = v; ch(); }, def: 0.4 }),
      knob({ label: t('tone'), get: () => F.reverb.tone, set: v => { F.reverb.tone = v; ch(); }, def: 0.6 }),
      knob({ label: 'Mix', get: () => F.reverb.mix, set: v => { F.reverb.mix = v; ch(); }, def: 0.18 })]),
    card(t('output'), null, [
      knob({ label: t('volume'), get: () => F.master, set: v => { F.master = v; ch(); }, def: 0.85, size: 'l' })])));
}
