// The six screens (Jouer, Éditer, Sons, Arp, Séq, Effets) and the settings sheet.
import { h, param, knob, seg, toggle, noteName, toast, icon } from './ui.js?v=202611091438';
import { S, banks, save, saveBanks, emit, on, resetAll } from './store.js?v=202611091438';
import { FACTORY, CATEGORIES } from './presets.js?v=202611091438';
import { clonePatch, parseSyx, buildSyx } from './dx7.js?v=202611091438';
import { createGraph, ratioText } from './graph.js?v=202611091438';
import { createKeys } from './keys.js?v=202611091438';
import * as E from './engine.js?v=202611091438';
import { applyPart, seq, seqPlay, seqRest, seqPosition, arpClear, allOff } from './perform.js?v=202611091438';
import { status as midiStatus, selectInput, connectMidi } from './midi.js?v=202611091438';
import { ALGORITHMS } from './algorithms.js?v=202611091438';

// Subscriptions made while rendering a screen are dropped on the next render.
let CTX = null;
export const bindCtx = c => { CTX = c; };
const sub = (evt, fn) => CTX.sub(evt, fn);

const part = () => S.parts[S.edit];
const patch = () => part().patch;
const PART_NAME = ['A', 'B'];

// Live patch edits: push to the engine at most once per frame.
let pendingPatch = false;
export function patchChanged() {
  part().dirty = true;
  if (!pendingPatch) {
    pendingPatch = true;
    requestAnimationFrame(() => { pendingPatch = false; E.setPatch(S.edit, patch()); });
  }
  save();
  emit('patch');
}

// ── bank helpers ────────────────────────────────────────────
export function bankList() {
  const out = CATEGORIES.map(c => ({ id: 'usine:' + c, name: c, factory: true, voices: FACTORY.map((p, i) => ({ p, i })).filter(v => v.p.cat === c) }));
  for (const b of banks) out.push({ id: b.id, name: b.name, factory: false, user: true, voices: b.voices.map((p, i) => ({ p, i })) });
  return out;
}
const refBank = ref => (ref.bank === 'usine' ? 'usine:' + (FACTORY[ref.i]?.cat || CATEGORIES[0]) : ref.bank);

export function loadVoice(bankId, i, target = S.edit) {
  const p = bankId.startsWith('usine') ? FACTORY[i] : banks.find(b => b.id === bankId)?.voices[i];
  if (!p) return;
  const pt = S.parts[target];
  pt.patch = clonePatch(p);
  pt.ref = { bank: bankId.startsWith('usine') ? 'usine' : bankId, i };
  pt.dirty = false;
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

// ── Jouer ───────────────────────────────────────────────────
let playKeys = null;
export function renderPlay(view, ctx) {
  const graph = createGraph();
  ctx.graphs.push(graph);
  graph.set(patch());
  const scope = h('canvas', { class: 'scope' });
  ctx.scope = scope;
  const stage = h('div', { class: 'stage', onclick: () => ctx.go('edit') }, scope, graph.el);

  const pt = part();
  const name = h('div', { class: 'pname' }, pt.patch.name);
  const meta = h('div', { class: 'pmeta' }, `${PART_NAME[S.edit]} · ${bankList().find(b => b.id === refBank(pt.ref))?.name || ''}${pt.dirty ? ' · modifié' : ''}`);
  const preset = h('div', { class: 'preset' },
    h('button', { class: 'nav', type: 'button', 'aria-label': 'Son précédent', onclick: () => stepVoice(-1) }, icon('prev')),
    h('button', { class: 'pinfo', type: 'button', onclick: () => ctx.go('sounds') }, name, meta),
    h('button', { class: 'nav', type: 'button', 'aria-label': 'Son suivant', onclick: () => stepVoice(1) }, icon('next')));

  const m = pt.macros;
  const mk = (key, label) => knob({ label, min: -1, max: 1, bipolar: true, def: 0, get: () => m[key], set: v => { m[key] = v; E.setMacros(S.edit, m); save(); }, fmt: v => (v > 0 ? '+' : '') + Math.round(v * 100) });
  const macros = h('div', { class: 'macros' },
    mk('bright', 'Brillance'), mk('attack', 'Attaque'), mk('release', 'Relâche'),
    knob({ label: 'Vibrato', min: 0, max: 1, def: 0, get: () => m.vibrato, set: v => { m.vibrato = v; E.setMacros(S.edit, m); save(); } }));
  const vol = param({ label: 'Volume ' + PART_NAME[S.edit], min: 0, max: 1, step: 0.01, def: 0.8, get: () => pt.volume, set: v => { pt.volume = v; E.setVolume(S.edit, v); save(); }, fmt: v => Math.round(v * 100) });

  const side = h('aside', { class: 'side' }, preset, macros, vol);
  const body = h('div', { class: 'play-body' }, stage, side);
  view.append(body);
  if (S.settings.screenKeys) {
    playKeys = createKeys();
    view.append(playKeys.el);
    ctx.keys = playKeys;
  }
  view.classList.toggle('with-keys', !!S.settings.screenKeys);
}

// ── Éditer ──────────────────────────────────────────────────
let editOp = 0;
const CURVES = [[0, '−lin'], [1, '−exp'], [2, '+exp'], [3, '+lin']];
const WAVES = [[0, '△'], [1, '⩘'], [2, '⩗'], [3, '⊓'], [4, '∿'], [5, 'S/H']];

// Envelope preview, simulated with the same rules as the worklet.
function envCurve(r, l, ol = 99) {
  const OLT = [0, 5, 9, 13, 17, 20, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 45, 46];
  const sc = x => (x >= 20 ? 28 + x : OLT[x]);
  const olu = sc(ol) << 5;
  const tgt = L => Math.max(16, ((sc(L) >> 1) << 6) + olu - 4256);
  const rate = R => { const q = Math.min(63, (R * 41) >> 6); return ((4 + (q & 3)) * Math.pow(2, 2 + (q >> 2)) / 65536) * 44100; };
  const pts = [];
  let lv = 0, st = 0, t = 0, down = true, holdT = 0;
  const dt = 0.002;
  for (let k = 0; k < 6000; k++) {
    if (st === 3 && down) { holdT += dt; if (holdT > 0.35 || t > 5) down = false; }
    if (st < 3 || (st === 3 && !down)) {
      const g = tgt(l[st]);
      if (g > lv) { if (lv < 1716) lv = 1716; lv += rate(r[st]) * dt * Math.max(1, Math.floor((4352 - lv) / 256)); if (lv >= g) { lv = g; st++; } }
      else { lv -= rate(r[st]) * dt; if (lv <= g) { lv = g; st++; } }
    }
    pts.push([t, lv, st === 3 && down]);
    t += dt;
    if (st >= 4) break;
    if (t > 8 && !down) break;
  }
  return pts;
}

function envCanvas(getRL) {
  const c = h('canvas', { class: 'env' });
  const draw = () => {
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
    pts.forEach(([t, lv], i) => {
      const x = (t / T) * (w - 4) + 2;
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
  c.draw = draw;
  requestAnimationFrame(draw);
  return c;
}

function rlGrid(obj, onChange, labels = ['R', 'L']) {
  const grid = h('div', { class: 'rl' });
  for (const [key, lab] of [['r', labels[0]], ['l', labels[1]]]) {
    for (let i = 0; i < 4; i++) {
      grid.append(param({ label: lab + (i + 1), min: 0, max: 99, get: () => obj[key][i], set: v => { obj[key][i] = v; onChange(); } }));
    }
  }
  return grid;
}

export function renderEdit(view, ctx) {
  const pt = part();
  const p = pt.patch;
  const graph = createGraph({ compact: true, onSelect: op => { editOp = op; ctx.rerender(); } });
  ctx.graphs.push(graph);
  graph.set(p);
  graph.select(editOp);

  const left = h('div', { class: 'edit-left' },
    h('div', { class: 'graph-box' }, graph.el),
    param({ label: 'Algorithme', min: 1, max: 32, get: () => p.alg, set: v => { p.alg = v; graph.set(p); patchChanged(); } }),
    param({ label: 'Feedback', min: 0, max: 7, get: () => p.fb, set: v => { p.fb = v; graph.refreshText(); patchChanged(); } }),
    h('div', { class: 'opbar' },
      h('button', { type: 'button', class: 'chip' + (editOp == null ? ' on' : ''), onclick: () => { editOp = null; ctx.rerender(); } }, 'Global'),
      ...[0, 1, 2, 3, 4, 5].map(i => h('button', { type: 'button', class: 'chip op' + (editOp === i ? ' on' : ''), onclick: () => { editOp = i; ctx.rerender(); } }, String(i + 1)))));

  const status = h('span', { class: 'dirty' }, pt.dirty ? 'modifié' : '');
  sub('patch', () => { status.textContent = part().dirty ? 'modifié' : ''; });
  const head = h('div', { class: 'edit-head' },
    h('h2', {}, editOp == null ? 'Global' : `Opérateur ${editOp + 1}`, h('em', {}, editOp == null ? p.name : (graph && isCarrier(p, editOp) ? ' porteur' : ' modulateur'))),
    status,
    h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (!pt.dirty) return; loadVoice(pt.ref.bank === 'usine' ? 'usine' : pt.ref.bank, pt.ref.i); ctx.rerender(); toast('Modifications annulées'); } }, 'Annuler'),
    h('button', { type: 'button', class: 'btn', onclick: () => saveCurrent(ctx) }, 'Enregistrer'));

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
  body.append(
    h('div', { class: 'row' },
      seg({ options: [[0, 'Ratio'], [1, 'Fixe']], get: () => op.fixed, set: v => { op.fixed = v; changed(); } }),
      ratioOut),
    h('div', { class: 'grid4' },
      param({ label: 'Grossier', min: 0, max: 31, get: () => op.coarse, set: v => { op.coarse = v; changed(); } }),
      param({ label: 'Fin', min: 0, max: 99, get: () => op.fine, set: v => { op.fine = v; changed(); }, def: 0 }),
      param({ label: 'Désaccord', min: -7, max: 7, bipolar: true, def: 0, get: () => op.det - 7, set: v => { op.det = v + 7; changed(); }, fmt: v => (v > 0 ? '+' : '') + v }),
      param({ label: 'Niveau', min: 0, max: 99, get: () => op.ol, set: v => { op.ol = v; changed(); } }),
      param({ label: 'Vélocité', min: 0, max: 7, get: () => op.vel, set: v => { op.vel = v; changed(); } }),
      param({ label: 'Mod. ampli', min: 0, max: 3, get: () => op.ams, set: v => { op.ams = v; changed(); } }),
      param({ label: 'Suivi vitesse', min: 0, max: 7, get: () => op.rs, set: v => { op.rs = v; changed(); } })),
    h('h3', {}, 'Enveloppe'),
    env,
    rlGrid(op, changed, ['Vitesse ', 'Niveau ']),
    h('details', { class: 'more' },
      h('summary', {}, 'Échelle clavier'),
      h('div', { class: 'grid4' },
        param({ label: 'Point', min: 0, max: 99, get: () => op.bp, set: v => { op.bp = v; changed(); }, fmt: v => noteName(v + 21) }),
        param({ label: 'Prof. gauche', min: 0, max: 99, get: () => op.ld, set: v => { op.ld = v; changed(); } }),
        param({ label: 'Prof. droite', min: 0, max: 99, get: () => op.rd, set: v => { op.rd = v; changed(); } })),
      h('div', { class: 'row' }, h('span', { class: 'lab' }, 'Courbe gauche'), seg({ options: CURVES, get: () => op.lc, set: v => { op.lc = v; changed(); } })),
      h('div', { class: 'row' }, h('span', { class: 'lab' }, 'Courbe droite'), seg({ options: CURVES, get: () => op.rc, set: v => { op.rc = v; changed(); } }))));
}

function globalEditor(body, p, graph) {
  const changed = () => { graph.refreshText(); patchChanged(); };
  const name = h('input', { class: 'name', value: p.name, maxlength: 16, 'aria-label': 'Nom du son', oninput: e => { p.name = e.target.value; changed(); } });
  const penv = envCanvasPitch(p);
  body.append(
    h('div', { class: 'row' }, h('span', { class: 'lab' }, 'Nom'), name),
    h('div', { class: 'grid4' },
      param({ label: 'Transposition', min: -24, max: 24, bipolar: true, def: 0, get: () => p.transpose - 24, set: v => { p.transpose = v + 24; changed(); }, fmt: v => (v > 0 ? '+' : '') + v }),
      toggle({ label: 'Phase OSC fixe', get: () => p.oks, set: v => { p.oks = v ? 1 : 0; changed(); } })),
    h('h3', {}, 'LFO'),
    h('div', { class: 'row' }, h('span', { class: 'lab' }, 'Forme'), seg({ options: WAVES, get: () => p.lfo.wave, set: v => { p.lfo.wave = v; changed(); } })),
    h('div', { class: 'grid4' },
      param({ label: 'Vitesse', min: 0, max: 99, get: () => p.lfo.speed, set: v => { p.lfo.speed = v; changed(); } }),
      param({ label: 'Retard', min: 0, max: 99, get: () => p.lfo.delay, set: v => { p.lfo.delay = v; changed(); } }),
      param({ label: 'Hauteur', min: 0, max: 99, get: () => p.lfo.pmd, set: v => { p.lfo.pmd = v; changed(); } }),
      param({ label: 'Amplitude', min: 0, max: 99, get: () => p.lfo.amd, set: v => { p.lfo.amd = v; changed(); } }),
      param({ label: 'Sens. hauteur', min: 0, max: 7, get: () => p.lfo.pms, set: v => { p.lfo.pms = v; changed(); } }),
      toggle({ label: 'Synchro note', get: () => p.lfo.sync, set: v => { p.lfo.sync = v ? 1 : 0; changed(); } })),
    h('h3', {}, 'Enveloppe de hauteur'),
    penv,
    rlGrid(p.pitchEnv, () => { changed(); penv.draw(); }, ['Vitesse ', 'Niveau ']));
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
    const seg = R => 0.3 + (99 - R) / 99 * 1.7;
    g.strokeStyle = css.getPropertyValue('--line').trim();
    g.beginPath(); g.moveTo(0, hh / 2); g.lineTo(w, hh / 2); g.stroke();
    const xs = [0, seg(r[0]), seg(r[1]), seg(r[2]), 1, seg(r[3])];
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
  if (user) { user.voices[pt.ref.i] = p; }
  else {
    const mine = banks.find(b => b.id === 'mine');
    mine.voices.push(p);
    pt.ref = { bank: 'mine', i: mine.voices.length - 1 };
  }
  if (!saveBanks()) { toast('Stockage plein : son non enregistré'); return; }
  pt.dirty = false;
  save();
  toast(`« ${p.name} » enregistré dans ${user ? user.name : 'Mes sons'}`);
  ctx.rerender();
}

// ── Sons ────────────────────────────────────────────────────
let viewBank = null;
let armedDelete = null;
export function renderSounds(view, ctx) {
  const list = bankList();
  if (!viewBank || !list.find(b => b.id === viewBank)) viewBank = refBank(part().ref);
  const file = h('input', { type: 'file', accept: '.syx,.SYX,application/octet-stream', hidden: true, onchange: e => importFiles(e.target.files, ctx) });
  const side = h('div', { class: 'banks' },
    h('div', { class: 'bank-group' }, 'Usine'),
    ...list.filter(b => b.factory).map(b => bankBtn(b, ctx)),
    h('div', { class: 'bank-group' }, 'À toi'),
    ...list.filter(b => !b.factory).map(b => bankBtn(b, ctx)),
    h('button', { type: 'button', class: 'btn import', onclick: () => file.click() }, '+ Importer .syx'),
    file);

  const b = list.find(x => x.id === viewBank);
  const pt = part();
  const grid = h('div', { class: 'voice-grid' });
  if (!b.voices.length) grid.append(h('p', { class: 'empty' }, b.id === 'mine' ? 'Aucun son enregistré. Modifie un son puis « Enregistrer » dans Éditer.' : 'Banque vide.'));
  for (const v of b.voices) {
    const cur = refBank(pt.ref) === b.id && pt.ref.i === v.i;
    grid.append(h('button', { type: 'button', class: 'voice' + (cur ? ' on' : ''), onclick: () => { loadVoice(b.id, v.i); ctx.rerender(); } },
      h('span', { class: 'vn' }, v.p.name), h('small', {}, `alg ${v.p.alg}`)));
  }
  const actions = [];
  if (b.user && b.voices.length) {
    actions.push(h('button', { type: 'button', class: 'btn ghost', onclick: () => exportBank(b) }, 'Exporter .syx'));
  }
  if (b.user && b.id !== 'mine') {
    actions.push(h('button', { type: 'button', class: 'btn ghost danger', onclick: e => {
      if (armedDelete !== b.id) { armedDelete = b.id; e.target.textContent = 'Confirmer ?'; setTimeout(() => { if (armedDelete === b.id) { armedDelete = null; e.target.textContent = 'Supprimer'; } }, 3000); return; }
      const k = banks.findIndex(x => x.id === b.id); banks.splice(k, 1); saveBanks(); armedDelete = null; viewBank = null; ctx.rerender(); toast('Banque supprimée');
    } }, 'Supprimer'));
  }
  const head = h('div', { class: 'voices-head' },
    h('h2', {}, b.name, h('em', {}, ` ${b.voices.length} son${b.voices.length > 1 ? 's' : ''}`)),
    S.split.on ? seg({ options: [[0, 'Vers A'], [1, 'Vers B']], get: () => S.edit, set: v => { S.edit = v; save(); emit('part'); ctx.rerender(); } }) : null,
    ...actions);
  view.append(h('div', { class: 'sounds' }, side, h('div', { class: 'voices' }, head, grid)));
}

function bankBtn(b, ctx) {
  return h('button', { type: 'button', class: 'bank' + (b.id === viewBank ? ' on' : ''), onclick: () => { viewBank = b.id; ctx.rerender(); } }, b.name, h('small', {}, String(b.voices.length)));
}

async function importFiles(files, ctx) {
  let n = 0;
  for (const f of files) {
    const voices = parseSyx(await f.arrayBuffer());
    if (!voices.length) { toast(`${f.name} : aucun son DX7 trouvé`); continue; }
    const id = 'syx-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    banks.push({ id, name: f.name.replace(/\.syx$/i, '').slice(0, 24), voices });
    viewBank = id;
    n += voices.length;
  }
  if (n) {
    if (!saveBanks()) toast('Stockage plein : banque chargée pour cette session seulement');
    else toast(`${n} sons importés`);
    loadVoice(viewBank, 0);
  }
  ctx.rerender();
}

function exportBank(b) {
  const blob = new Blob([buildSyx(b.voices)], { type: 'application/octet-stream' });
  const a = h('a', { href: URL.createObjectURL(blob), download: b.name.replace(/[^\w-]+/g, '_') + '.syx' });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ── Arp ─────────────────────────────────────────────────────
export function renderArp(view, ctx) {
  const A = S.arp;
  const ch = () => { save(); };
  view.append(h('div', { class: 'cols' },
    h('div', { class: 'card' },
      toggle({ label: 'Arpégiateur', cls: 'big', get: () => A.on, set: v => { A.on = v; if (!v) arpClear(); ch(); emit('arp'); } }),
      S.split.on ? h('div', { class: 'row' }, h('span', { class: 'lab' }, 'Sur'), seg({ options: [[0, 'A (bas)'], [1, 'B (haut)'], ['all', 'Les deux']], get: () => A.target, set: v => { A.target = v; arpClear(); ch(); } })) : null,
      toggle({ label: 'Latch (tient les notes)', get: () => A.latch, set: v => { A.latch = v; if (!v) arpClear(); ch(); } }),
      tempoParam()),
    h('div', { class: 'card' },
      h('h3', {}, 'Mode'),
      seg({ cls: 'wrap', options: [['up', 'Haut'], ['down', 'Bas'], ['updown', 'Haut-bas'], ['random', 'Hasard'], ['order', 'Joué'], ['chord', 'Accord']], get: () => A.mode, set: v => { A.mode = v; ch(); } }),
      h('h3', {}, 'Vitesse'),
      seg({ cls: 'wrap', options: [[1, '1/4'], [0.5, '1/8'], [1 / 3, '1/8T'], [0.25, '1/16'], [1 / 6, '1/16T'], [0.125, '1/32']], get: () => A.rate, set: v => { A.rate = v; ch(); } }),
      h('h3', {}, 'Octaves'),
      seg({ options: [[1, '1'], [2, '2'], [3, '3'], [4, '4']], get: () => A.octaves, set: v => { A.octaves = v; ch(); } }),
      param({ label: 'Durée des notes', min: 0.1, max: 0.95, step: 0.01, get: () => A.gate, set: v => { A.gate = v; ch(); }, fmt: v => Math.round(v * 100) + ' %' }))));
}

export function tempoParam(cls = '') {
  const el = param({ label: cls === 'tempo' ? '♩' : 'Tempo', min: 40, max: 220, get: () => S.tempo, set: v => { S.tempo = v; E.setFx(S.fx, v); save(); emit('tempo'); }, fmt: v => v + ' bpm', sens: 0.6 });
  el.classList.add(...(cls ? [cls] : []));
  (CTX ? sub : on)('tempo', () => el.refresh());
  return el;
}

// ── Séq ─────────────────────────────────────────────────────
let selStep = 0;
export function renderSeq(view, ctx) {
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
      c.innerHTML = '';
      c.append(h('span', {}, st.notes.length ? noteName(st.notes[0] + (seq.playing ? seq.transpose : 0)) : '·'), st.notes.length > 1 ? h('small', {}, '+' + (st.notes.length - 1)) : '', h('i', { style: `height:${(st.vel / 127) * 100}%` }));
    });
  };
  ctx.seqPaint = () => {
    const pos = seqPosition();
    cells.forEach((c, i) => c.classList.toggle('now', i === pos));
  };
  const play = h('button', { type: 'button', class: 'btn transport', onclick: () => { seqPlay(); } });
  const rec = toggle({ label: 'REC', cls: 'rec', get: () => seq.rec, set: v => { seq.rec = v; seq.recDown = 0; if (v && !seq.playing) seq.cursor = selStep; paint(); } });
  const syncPlay = () => { play.innerHTML = ''; play.append(icon(seq.playing ? 'stop' : 'start'), seq.playing ? 'Stop' : 'Lecture'); play.classList.toggle('on', seq.playing); paint(); };
  sub('seq', () => { syncPlay(); stepEd(); });
  syncPlay();
  let armedClear = false;
  const clear = h('button', { type: 'button', class: 'btn ghost danger', onclick: e => {
    if (!armedClear) { armedClear = true; e.target.textContent = 'Confirmer ?'; setTimeout(() => { armedClear = false; e.target.textContent = 'Tout effacer'; }, 3000); return; }
    Q.steps.forEach(s => { s.notes = []; s.on = true; s.vel = 100; }); seq.cursor = 0; save(); paint(); stepEd(); armedClear = false; e.target.textContent = 'Tout effacer';
  } }, 'Tout effacer');

  const ed = h('div', { class: 'step-ed' });
  const stepEd = () => {
    const st = Q.steps[selStep];
    ed.textContent = '';
    ed.append(
      h('span', { class: 'lab' }, `Pas ${selStep + 1}`),
      h('span', { class: 'notes' }, st.notes.length ? st.notes.map(noteName).join(' ') : 'silence'),
      toggle({ label: 'Actif', get: () => st.on, set: v => { st.on = v; save(); paint(); } }),
      param({ label: 'Vélocité', min: 1, max: 127, get: () => st.vel, set: v => { st.vel = v; save(); paint(); } }),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { st.notes = []; save(); paint(); stepEd(); } }, 'Vider'));
  };
  stepEd();

  view.append(h('div', { class: 'seq' },
    h('div', { class: 'seq-bar' }, play, rec,
      h('button', { type: 'button', class: 'btn ghost', title: 'Ajoute un silence en enregistrement pas à pas', onclick: () => { if (seq.rec && !seq.playing) { seqRest(); paint(); } else toast('Active REC (à l’arrêt) pour avancer d’un pas'); } }, 'Silence'),
      clear),
    grid,
    ed,
    h('div', { class: 'grid4' },
      param({ label: 'Longueur', min: 1, max: 16, get: () => Q.length, set: v => { Q.length = v; save(); paint(); } }),
      param({ label: 'Durée', min: 0.1, max: 1, step: 0.01, get: () => Q.gate, set: v => { Q.gate = v; save(); }, fmt: v => Math.round(v * 100) + ' %' }),
      param({ label: 'Swing', min: 0, max: 0.7, step: 0.01, get: () => Q.swing, set: v => { Q.swing = v; save(); }, fmt: v => Math.round(v * 100) + ' %' }),
      tempoParam()),
    h('div', { class: 'row' },
      S.split.on ? seg({ options: [[0, 'Son A'], [1, 'Son B']], get: () => Q.part, set: v => { Q.part = v; E.stopSource('seq'); save(); } }) : null,
      toggle({ label: 'Transposer au clavier', get: () => Q.transpose, set: v => { Q.transpose = v; if (!v) seq.transpose = 0; save(); paint(); } }),
      h('span', { class: 'hint' }, seq.rec ? (seq.playing ? 'REC en lecture : les notes jouées s’ajoutent au pas en cours.' : 'REC pas à pas : joue une note ou un accord, ça passe au pas suivant.') : 'Lecture + transposer : la touche jouée (C3 = original) transpose la boucle.'))));
  paint();
}

// ── Effets ──────────────────────────────────────────────────
export function renderFx(view) {
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
    card('Filtre', null, [
      knob({ label: 'Bas ◂ ▸ Haut', min: -1, max: 1, bipolar: true, def: 0, get: () => F.filter.pos, set: v => { F.filter.pos = Math.abs(v) < 0.03 ? 0 : v; ch(); }, fmt: v => (Math.abs(v) < 0.03 ? 'off' : v < 0 ? 'LP ' + pct(-v) : 'HP ' + pct(v)), size: 'l' }),
      knob({ label: 'Résonance', get: () => F.filter.res, set: v => { F.filter.res = v; ch(); }, def: 0.2 })]),
    card('Chorus', F.chorus, [
      knob({ label: 'Vitesse', min: 0.1, max: 4, get: () => F.chorus.rate, set: v => { F.chorus.rate = v; ch(); }, fmt: v => v.toFixed(1) + ' Hz', def: 0.6 }),
      knob({ label: 'Profondeur', get: () => F.chorus.depth, set: v => { F.chorus.depth = v; ch(); }, def: 0.4 }),
      knob({ label: 'Mix', get: () => F.chorus.mix, set: v => { F.chorus.mix = v; ch(); }, def: 0.35 })]),
    card('Delay', F.delay, [
      seg({ cls: 'div', options: [[0.5, '1/8'], [0.75, '1/8.'], [1, '1/4'], [1.5, '1/4.'], [2 / 3, '1/4T']], get: () => F.delay.beats, set: v => { F.delay.beats = v; ch(); } }),
      knob({ label: 'Retours', min: 0, max: 0.9, get: () => F.delay.fb, set: v => { F.delay.fb = v; ch(); }, def: 0.35 }),
      knob({ label: 'Couleur', get: () => F.delay.tone, set: v => { F.delay.tone = v; ch(); }, def: 0.6 }),
      knob({ label: 'Mix', get: () => F.delay.mix, set: v => { F.delay.mix = v; ch(); }, def: 0.25 })]),
    card('Reverb', F.reverb, [
      knob({ label: 'Taille', get: () => F.reverb.size, set: v => { F.reverb.size = v; ch(); }, def: 0.45 }),
      knob({ label: 'Couleur', get: () => F.reverb.tone, set: v => { F.reverb.tone = v; ch(); }, def: 0.6 }),
      knob({ label: 'Mix', get: () => F.reverb.mix, set: v => { F.reverb.mix = v; ch(); }, def: 0.25 })]),
    card('Sortie', null, [
      knob({ label: 'Volume', get: () => F.master, set: v => { F.master = v; ch(); }, def: 0.8, size: 'l' })])));
}

// ── Réglages (sheet) ────────────────────────────────────────
// 'auto' follows the phone; 'light' / 'dark' force it.
export function applyTheme() {
  const t = S.settings.theme || 'auto';
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const light = t === 'light' || (t === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', light ? '#f3f4f7' : '#0b0c10');
  emit('theme');
}

export function renderSettings(box, ctx) {
  const T = S.settings;
  const st = midiStatus;
  const ms = { idle: 'Connexion…', connected: 'Connecté', none: 'Aucun clavier détecté', unsupported: 'Ce navigateur n’a pas le MIDI', denied: 'Accès MIDI refusé' }[st.state];
  const sel = h('select', { 'aria-label': 'Entrée MIDI', onchange: e => { T.input = e.target.value; selectInput(T.input); save(); } },
    h('option', { value: 'all' }, 'Toutes les entrées'),
    ...st.inputs.map(i => h('option', { value: i.id, selected: T.input === i.id }, i.name)));
  const learn = h('button', { type: 'button', class: 'btn ghost', onclick: () => { ctx.learnSplit = true; learn.textContent = 'Joue une touche…'; } }, 'Apprendre');
  ctx.onLearned = () => { learn.textContent = 'Apprendre'; splitP.refresh(); };
  const splitP = param({ label: 'Point de split', min: 24, max: 108, get: () => S.split.point, set: v => { S.split.point = v; save(); emit('split'); }, fmt: v => noteName(v) });
  let armedReset = false;
  box.append(
    h('div', { class: 'sheet-head' }, h('h2', {}, 'Réglages'), h('button', { type: 'button', class: 'btn ghost', onclick: () => ctx.closeSheet() }, 'Fermer')),
    h('div', { class: 'sheet-cols' },
      h('div', { class: 'card' },
        h('h3', {}, 'Clavier MIDI'),
        h('p', { class: 'midi-line ' + st.state }, h('i'), ms, st.inputs.length ? ' · ' + st.inputs.map(i => i.name).join(', ') : ''),
        st.state === 'connected' ? sel : null,
        h('button', { type: 'button', class: 'btn ghost', onclick: () => connectMidi(T.input) }, 'Rechercher à nouveau'),
        h('h3', {}, 'Deux claviers'),
        toggle({ label: 'Split : un son par moitié', get: () => S.split.on, set: v => { S.split.on = v; if (!v) S.edit = 0; allOff(); save(); emit('split'); } }),
        h('div', { class: 'row' }, splitP, learn),
        h('div', { class: 'grid2' },
          param({ label: 'Octave A', min: -3, max: 3, bipolar: true, def: 0, get: () => S.parts[0].octave, set: v => { S.parts[0].octave = v; save(); }, fmt: v => (v > 0 ? '+' : '') + v }),
          param({ label: 'Octave B', min: -3, max: 3, bipolar: true, def: 0, get: () => S.parts[1].octave, set: v => { S.parts[1].octave = v; save(); }, fmt: v => (v > 0 ? '+' : '') + v }))),
      h('div', { class: 'card' },
        h('h3', {}, 'Jeu'),
        h('div', { class: 'row' }, h('span', { class: 'lab' }, 'Vélocité'), seg({ options: [['soft', 'Douce'], ['normal', 'Normale'], ['hard', 'Dure'], ['fixed', 'Fixe']], get: () => T.velCurve, set: v => { T.velCurve = v; save(); } })),
        h('div', { class: 'row' }, toggle({ label: 'Pitch bend', get: () => T.bend, set: v => { T.bend = v; if (!v) E.bend(0); save(); } }),
          param({ label: 'Amplitude', min: 1, max: 12, get: () => T.bendRange, set: v => { T.bendRange = v; save(); }, fmt: v => '±' + v })),
        param({ label: 'Polyphonie', min: 4, max: 24, get: () => T.poly, set: v => { T.poly = v; E.setPoly(v); save(); }, fmt: v => v + ' voix' }),
        h('div', { class: 'row' }, h('span', { class: 'lab' }, 'Thème'), seg({ options: [['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']], get: () => T.theme || 'auto', set: v => { T.theme = v; applyTheme(); save(); } })),
        toggle({ label: 'Clavier à l’écran', get: () => T.screenKeys, set: v => { T.screenKeys = v; save(); ctx.rerender(); } }),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => { allOff(); toast('Tous les sons coupés'); } }, 'Couper tous les sons'),
        h('button', { type: 'button', class: 'btn ghost danger', onclick: e => {
          if (!armedReset) { armedReset = true; e.target.textContent = 'Confirmer : tout réinitialiser ?'; setTimeout(() => { armedReset = false; e.target.textContent = 'Réinitialiser les réglages'; }, 3000); return; }
          resetAll();
        } }, 'Réinitialiser les réglages')),
      h('div', { class: 'card help' },
        h('h3', {}, 'Brancher les LUMI'),
        h('p', {}, 'Sur iPhone, ouvre Phase dans l’app ', h('b', {}, 'Web MIDI Browser'), ' (Safari n’a pas le MIDI). Branche le LUMI en USB-C : il apparaît tout seul.'),
        h('p', {}, 'Deux blocs aimantés ensemble arrivent comme un seul clavier de 48 touches : active le split pour un son par bloc et règle le point de split sur la première touche du bloc de droite (« Apprendre »).'),
        h('p', {}, 'Pas de son ? Coupe le mode silencieux de l’iPhone et monte le volume.'),
        h('p', {}, 'Phase n’envoie rien aux claviers : les lumières des LUMI restent dans leur mode.'))));
}
