// Interface de REVERS : vous (joueur 0, en bas) contre le bot (joueur 1, en haut).
import * as E from './engine.js?v=3';
import { chooseDraw, chooseAction } from './ai.js?v=3';
import { faceHTML, backHTML } from './cards.js?v=3';
import { mergeAgg, emptyAgg } from './sim.js?v=3';
import { rulesHTML, SECTIONS } from './rules.js?v=3';

const ME = 0, BOT = 1;
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};
const DEF_OPTS = { theme: 'signal', level: 'normal', first: '0', actions: 1, elan: true, parachute: true, firstNoDraw: true, bonus2: 0, market: 4 };
let opts = { ...DEF_OPTS, ...store.get('revers.opts', {}) };
const qTheme = new URLSearchParams(location.search).get('style');
if (qTheme) opts.theme = qTheme;
function applyTheme() {
  if (!['signal', 'carto', 'deco'].includes(opts.theme)) opts.theme = 'signal';
  document.body.className = document.body.className.replace(/\bth-\w+/g, '').trim() + ' th-' + opts.theme;
}
applyTheme();
if (qTheme) store.set('revers.opts', opts);
const cfgFromOpts = () => ({ actions: +opts.actions, elan: !!opts.elan, parachute: !!opts.parachute, firstNoDraw: !!opts.firstNoDraw, bonus2: +opts.bonus2, market: +opts.market });

let s = null;
const ui = { sel: null, hide: false, mode: null, setup: null, busy: false, pending: null, endShown: false };

// ---------- partie ----------

function newGame() {
  s = null; ui.sel = null; ui.mode = 'setup'; ui.setup = { s: null, o: null }; ui.endShown = false;
  document.querySelector('.overlay')?.remove();
  render();
}
function begin() {
  const first = opts.first === 'r' ? (Math.random() < 0.5 ? 0 : 1) : +opts.first;
  s = E.newGame(cfgFromOpts(), Math.random, [{ s: ui.setup.s, o: ui.setup.o }, null], first);
  ui.mode = null;
  render();
  if (s.cur === BOT) botTurn();
}

const myTurn = () => s && s.winner === null && s.cur === ME && !ui.busy;
const legal = () => (myTurn() && s.phase === 'act' ? E.legalActions(s) : []);

function doAction(a) {
  E.apply(s, a);
  if (s.peek && s.peek.p === ME) toast(`L’Éclaireur a vu : ${E.label(s.peek.id)}`);
  s.peek = null;
  ui.sel = null; ui.mode = null; ui.pending = null;
  if (s.elan && s.cur === ME) ui.sel = { type: 'cell', r: s.elan.r, c: s.elan.c };
  render();
  if (s.winner !== null) return showEnd();
  if (s.cur === BOT) botTurn();
}

// Plusieurs variantes d'une même action (cible de l'Éclaireur, choix de la Brume) → on demande.
function resolve(cands) {
  if (!cands.length) return;
  if (cands.length === 1) return doAction(cands[0]);
  if (cands[0].x && typeof cands[0].x === 'object') {
    ui.mode = 'peek'; ui.pending = cands; render();
    toast('Éclaireur : choisissez une carte cachée adverse à regarder.');
    return;
  }
  chooser('La Brume se révèle', 'Le bot ne saura pas si vous avez échangé.', [
    ['Échanger mes deux Blasons', () => doAction(cands.find(a => a.x === true))],
    ['Les laisser en place', () => doAction(cands.find(a => a.x === false))],
  ]);
}

async function botTurn() {
  if (ui.busy) return;
  ui.busy = true; const g = s;
  render();
  await sleep(450);
  while (s === g && s.winner === null && s.cur === BOT) {
    if (s.phase === 'draw') {
      const o = chooseDraw(s, opts.level);
      if (o) E.doDraw(s, o); else s.phase = 'act';
      render(); await sleep(550); continue;
    }
    const plan = chooseAction(s, opts.level), turn = s.turn;
    for (const a of plan) {
      if (s !== g || s.winner !== null || s.cur !== BOT || s.turn !== turn) break;
      E.apply(s, a); s.peek = null;
      render(); await sleep(650);
    }
  }
  if (s !== g) return;
  ui.busy = false;
  if (s.elan && s.cur === ME) ui.sel = { type: 'cell', r: s.elan.r, c: s.elan.c };
  render();
  if (s.winner !== null) showEnd();
}

// ---------- rendu ----------

function chip(id) {
  const c = E.CARDS[id];
  if (c.kind === 'souv') return '♛ Souverain';
  if (c.kind === 'ombre') return 'Ombre';
  return c.kind === 'spec' ? c.name : `${c.f}`;
}

function cellHTML(p, r, c) {
  let cell = s ? s.P[p].b[r][c] : null;
  if (!s && p === ME && r === 1 && ui.setup) {
    if (ui.setup.s === c) cell = { id: E.souvId(ME), h: true };
    if (ui.setup.o === c) cell = { id: E.ombreId(ME), h: true };
  }
  const tag = `<span class="rowtag">${r === 0 ? 'Front' : 'Garde'}</span>`;
  if (!cell) return tag;
  const card = E.CARDS[cell.id], rot = p === BOT ? 'flip180' : '';
  if (!cell.h) return faceHTML(cell.id, rot);
  const t = E.isBlason(cell.id) ? 'B' : card.t;
  if (p === ME) return backHTML(t) + `<span class="seen">${chip(cell.id)}</span>`;
  return backHTML(t, rot) + (s.know[ME][cell.id] ? `<span class="seen">vu : ${chip(cell.id)}</span>` : '');
}

function renderBoard(p) {
  const el = $(p === ME ? 'myBoard' : 'botBoard');
  const rows = p === ME ? [0, 1] : [1, 0];
  const acts = legal();
  const hl = {}; // clé "p,r,c" → classes / texte
  const add = (pp, r, c, cls, html = '') => { const k = `${pp},${r},${c}`; hl[k] = hl[k] || { cls: [], html: '' }; hl[k].cls.push(cls); hl[k].html += html; };

  if (ui.mode === 'setup' && p === ME) for (let c = 0; c < 5; c++) if (ui.setup.s !== c && ui.setup.o !== c) add(ME, 1, c, 'can');
  if (ui.mode === 'peek') for (const a of ui.pending) add(BOT, a.x.r, a.x.c, 'peek');
  else if (ui.sel?.type === 'hand') {
    for (const a of acts) if (a.t === 'dep' && a.i === ui.sel.i && a.h === ui.hide) add(ME, a.r, a.c, 'can');
  } else if (ui.sel?.type === 'cell') {
    const { r, c } = ui.sel;
    add(ME, r, c, 'sel');
    for (const a of acts) {
      if (a.t === 'strike' && a.r === r && a.c === c) {
        const atk = E.attackValue(s, ME, r, c), def = E.defenseValue(s, BOT, a.tr, a.tc), ok = atk >= def;
        add(BOT, a.tr, a.tc, ok ? 'tgt' : 'tgt weak', `<span class="odds ${ok ? 'ok' : 'ko'}">${atk} contre ${def}</span>`);
      }
      if (a.t === 'swap') {
        const [A, B] = [a.a, a.b];
        if (A[0] === r && A[1] === c) add(ME, B[0], B[1], 'swp');
        else if (B[0] === r && B[1] === c) add(ME, A[0], A[1], 'swp');
      }
    }
  }

  let html = '';
  for (const r of rows) for (let A = 0; A < 5; A++) {
    const c = E.absCol(p, A), h = hl[`${p},${r},${c}`];
    html += `<div class="slot${r === 1 ? ' garde' : ''}${h ? ' ' + h.cls.join(' ') : ''}" data-p="${p}" data-r="${r}" data-c="${c}">${cellHTML(p, r, c)}${h ? h.html : ''}</div>`;
  }
  el.innerHTML = html;
}

function render() {
  renderBoard(BOT); renderBoard(ME);
  $('botLvl').textContent = `(${opts.level})`;
  const drawing = myTurn() && s.phase === 'draw';
  const full = drawing && E.drawOptions(s)[0]?.t === 'burn';

  // pioche + climat
  if (s) {
    const cl = E.climat(s);
    $('pile').innerHTML = `<div class="deck${drawing && s.deck.length ? ' pick' : ''}" data-draw="top"><span class="count">${s.deck.length}</span>${cl ? backHTML(cl) : '<div class="card back t-B" style="opacity:.25"></div>'}</div>
      <div class="clim">${cl ? `<b>Climat : ${E.TNOM[cl]}</b><span>${E.CLIMAT_EFFET[cl]} Les unités ${E.TNOM[cl]} ont +1.</span>`
        : `<b>Pioche vide</b><span>Encore ${s.finalLeft ?? 0} tour(s), puis décompte de la force visible.</span>`}</div>`;
    $('market').innerHTML = s.market.map((id, i) => `<div class="${drawing && !full ? 'pick' : ''}" data-draw="${i}">${faceHTML(id)}</div>`).join('');
  } else {
    $('pile').innerHTML = `<div class="clim"><b>Mise en place</b><span>Cachez votre Souverain et votre Ombre dans votre Garde.</span></div>`;
    $('market').innerHTML = '';
  }

  // mains
  $('botHand').innerHTML = s ? s.P[BOT].hand.map(id => backHTML(E.CARDS[id].t, 'mini')).join('') : '';
  $('botN').textContent = s ? s.P[BOT].hand.length : 0;
  $('myHand').innerHTML = s ? s.P[ME].hand.map((id, i) => `<div data-i="${i}">${faceHTML(id, ui.sel?.type === 'hand' && ui.sel.i === i ? 'sel' : '')}</div>`).join('') : '';

  // statut + contrôles
  const st = $('status'); st.className = 'status';
  let msg = '', ctrl = '';
  if (ui.mode === 'setup') msg = ui.setup.s === null ? 'Cliquez une case de votre Garde pour cacher votre ♛ Souverain.' : 'Cliquez une autre case de Garde pour cacher votre Ombre (le leurre).';
  else if (!s) msg = '';
  else if (s.winner !== null) { msg = s.winner === 'nul' ? 'Égalité.' : s.winner === ME ? 'Victoire !' : 'Défaite.'; ctrl = `<button id="cNew" class="primary">Rejouer</button>`; }
  else if (s.cur === BOT || ui.busy) { msg = 'Le bot joue…'; st.classList.add('bot'); }
  else if (s.phase === 'draw' && full) msg = 'Main pleine (7) : cliquez la pioche, son sommet part à la défausse.';
  else if (s.phase === 'draw') msg = 'Puisez : une carte du marché, ou la pioche à l’aveugle (son dos indique sa terre).';
  else if (ui.mode === 'peek') { msg = 'Choisissez la carte cachée adverse à regarder.'; ctrl = `<button id="cCancel">Annuler</button>`; }
  else if (s.elan) {
    msg = 'Élan ! Votre unité peut frapper une seconde fois.';
    ctrl = `<button id="cStop">Terminer sans frapper</button>`;
  } else {
    msg = s.acts > 1 ? `À vous : ${s.acts} actions.` : 'À vous : posez une carte de votre main, ou choisissez une de vos cartes sur la table.';
    if (ui.sel?.type === 'hand') ctrl += `<span class="seg"><button id="cVis" class="${ui.hide ? '' : 'on'}">Face visible</button><button id="cHid" class="${ui.hide ? 'on' : ''}">Face cachée</button></span>`;
    if (ui.sel?.type === 'cell') {
      const fl = E.flipOptions(s).filter(a => a.r === ui.sel.r && a.c === ui.sel.c);
      if (fl.length) ctrl += `<button id="cFlip">Embuscade : retourner (gratuit)</button>`;
    }
    ctrl += `<button id="cPass">Passer</button>`;
  }
  st.textContent = msg;
  $('ctrl').innerHTML = ctrl;
  renderLog();
  const dock = document.querySelector('.dock');
  if (dock) document.documentElement.style.setProperty('--dockh', dock.offsetHeight + 'px');
}

function renderLog() {
  const el = $('log');
  if (!s) { el.innerHTML = '<p class="t">Journal</p>'; return; }
  let html = '', t = -1;
  for (const e of s.log) {
    if (e.turn !== t) { t = e.turn; html += `<p class="t">Tour ${t} · ${e.p === ME ? 'vous' : 'bot'}</p>`; }
    html += `<p class="${e.p === ME ? 'me' : ''}">${humanize(e.msg)}</p>`;
  }
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

const VERBES = { prend: 'prenez', pioche: 'piochez', enfouit: 'enfouissez', 'déploie': 'déployez', 'manœuvre.': 'manœuvrez.', 'passe.': 'passez.' };
function humanize(m) {
  m = m.replace(/^J1 (\S+)/, (_, v) => `Vous ${VERBES[v] || v}`);
  m = m.replace(/^J1 :/, 'Vous :').replace(/^J2/, 'Bot');
  m = m.replace(/(de|par) J1\b/g, '$1 vous').replace(/(de|par) J2\b/g, '$1 Bot').replace(/\bJ1\b/g, 'vous').replace(/\bJ2\b/g, 'Bot');
  return m.replace('Victoire de vous', 'Victoire pour vous').replace('Le Souverain de vous', 'votre Souverain').replace('le Souverain de vous', 'votre Souverain');
}

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2600);
}
function chooser(title, text, buttons) {
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="box"><h2>${title}</h2><p>${text}</p><div class="chooser"></div></div>`;
  for (const [lbl, fn] of buttons) {
    const b = document.createElement('button'); b.textContent = lbl;
    b.onclick = () => { o.remove(); fn(); };
    o.querySelector('.chooser').append(b);
  }
  document.body.append(o);
}
function showEnd() {
  if (ui.endShown) return; ui.endShown = true;
  const w = s.winner, why = s.why === 'souverain' ? 'Souverain capturé.' : `Décompte : force visible ${E.forceOnBoard(s, ME)} contre ${E.forceOnBoard(s, BOT)}.`;
  chooser(w === 'nul' ? 'Égalité' : w === ME ? 'Victoire !' : 'Défaite', `${why} Partie en ${s.turn} tours.`, [['Rejouer', newGame], ['Voir la table', () => {}]]);
}

// ---------- clics ----------

document.addEventListener('click', e => {
  const slot = e.target.closest('.slot');
  if (slot) return onSlot(+slot.dataset.p, +slot.dataset.r, +slot.dataset.c);
  const dr = e.target.closest('[data-draw]');
  if (dr && myTurn() && s.phase === 'draw') {
    const v = dr.dataset.draw;
    if (v === 'top' && !s.deck.length) return;
    if (E.drawOptions(s)[0]?.t === 'burn') { if (v === 'top') { E.doDraw(s, { t: 'burn' }); render(); } return; }
    E.doDraw(s, v === 'top' ? { t: 'top' } : { t: 'take', i: +v });
    if (v === 'top') toast(`Vous piochez : ${E.label(s.P[ME].hand.at(-1))}`);
    return render();
  }
  const hc = e.target.closest('#myHand [data-i]');
  if (hc && myTurn() && s.phase === 'act' && !s.elan && ui.mode !== 'peek') {
    const i = +hc.dataset.i;
    ui.sel = ui.sel?.type === 'hand' && ui.sel.i === i ? null : { type: 'hand', i };
    return render();
  }
  const id = e.target.closest('button')?.id;
  if (id === 'cVis') { ui.hide = false; render(); }
  if (id === 'cHid') { ui.hide = true; render(); }
  if (id === 'cPass') doAction({ t: 'pass' });
  if (id === 'cStop') doAction({ t: 'stop' });
  if (id === 'cCancel') { ui.mode = null; ui.pending = null; render(); }
  if (id === 'cNew') newGame();
  if (id === 'cFlip') {
    const fl = E.flipOptions(s).filter(a => a.r === ui.sel.r && a.c === ui.sel.c);
    // l'embuscade est gratuite : on applique sans terminer le tour
    const run = a => { E.apply(s, a); if (s.peek && s.peek.p === ME) toast(`L’Éclaireur a vu : ${E.label(s.peek.id)}`); s.peek = null; ui.mode = null; ui.pending = null; render(); };
    if (fl.length === 1) run(fl[0]);
    else if (fl[0].x && typeof fl[0].x === 'object') { ui.mode = 'peek'; ui.pending = fl; ui.pendingRun = run; render(); }
    else chooser('La Brume se révèle', 'Le bot ne saura pas si vous avez échangé.', [
      ['Échanger mes deux Blasons', () => run(fl.find(a => a.x === true))],
      ['Les laisser en place', () => run(fl.find(a => a.x === false))],
    ]);
  }
});

function onSlot(p, r, c) {
  if (ui.mode === 'setup') {
    if (p !== ME || r !== 1) return;
    if (ui.setup.s === null) ui.setup.s = c;
    else if (c !== ui.setup.s) { ui.setup.o = c; return begin(); }
    return render();
  }
  if (!myTurn() || s.phase !== 'act') return;
  const acts = legal();
  if (ui.mode === 'peek') {
    if (p !== BOT) return;
    const a = ui.pending.find(x => x.x.r === r && x.x.c === c);
    if (!a) return;
    if (a.t === 'flip') { const run = ui.pendingRun; ui.pendingRun = null; return run(a); }
    return doAction(a);
  }
  if (p === BOT) {
    if (ui.sel?.type !== 'cell') return;
    const a = acts.find(x => x.t === 'strike' && x.r === ui.sel.r && x.c === ui.sel.c && x.tr === r && x.tc === c);
    if (a) doAction(a);
    return;
  }
  const cell = s.P[ME].b[r][c];
  if (ui.sel?.type === 'hand' && !cell) {
    return resolve(acts.filter(a => a.t === 'dep' && a.i === ui.sel.i && a.r === r && a.c === c && a.h === ui.hide));
  }
  if (ui.sel?.type === 'cell') {
    const S = ui.sel;
    const sw = acts.find(a => a.t === 'swap' && ((a.a[0] === S.r && a.a[1] === S.c && a.b[0] === r && a.b[1] === c) || (a.b[0] === S.r && a.b[1] === S.c && a.a[0] === r && a.a[1] === c)));
    if (sw && !(S.r === r && S.c === c)) return doAction(sw);
  }
  if (s.elan) return;
  if (cell) ui.sel = ui.sel?.type === 'cell' && ui.sel.r === r && ui.sel.c === c ? null : { type: 'cell', r, c };
  else ui.sel = null;
  render();
}

// ---------- dialogues ----------

const top = document.querySelector('.top');
const setMenu = open => { top.classList.toggle('open', open); $('bMenu').setAttribute('aria-expanded', open); };
$('bMenu').onclick = e => { e.stopPropagation(); setMenu(!top.classList.contains('open')); };
$('nav').addEventListener('click', () => setMenu(false));
document.addEventListener('click', e => { if (!e.target.closest('.top')) setMenu(false); }, true);
$('bNew').onclick = newGame;
function openRules() {
  $('rulesBody').innerHTML = rulesHTML();
  $('rulesNav').innerHTML = SECTIONS.map(([id, t]) => `<button data-sec="${id}">${t}</button>`).join('');
  $('dlgRules').showModal();
  $('rulesBody').scrollTop = 0;
  $('rulesNav').firstElementChild.classList.add('on');
}
$('bRules').onclick = openRules;
$('rulesNav').addEventListener('click', e => {
  const b = e.target.closest('[data-sec]'); if (!b) return;
  const sec = $('r-' + b.dataset.sec), body = $('rulesBody');
  body.scrollTo({ top: sec.offsetTop - body.offsetTop - 8, behavior: 'smooth' });
});
$('rulesBody').addEventListener('scroll', () => {
  const body = $('rulesBody'); let cur = SECTIONS[0][0];
  for (const [id] of SECTIONS) { const sec = $('r-' + id); if (sec && sec.offsetTop - body.offsetTop - 40 <= body.scrollTop) cur = id; }
  for (const b of $('rulesNav').children) b.classList.toggle('on', b.dataset.sec === cur);
}, { passive: true });
// fermer une fenêtre en cliquant sur le fond
for (const d of document.querySelectorAll('dialog.modal')) d.addEventListener('click', e => { if (e.target === d) d.close(); });
$('bSim').onclick = () => $('dlgSim').showModal();
$('bOpts').onclick = () => {
  const f = $('optForm');
  for (const [k, v] of Object.entries(opts)) { const el = f.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = String(v); }
  $('dlgOpts').showModal();
};
function readOpts() {
  const f = $('optForm');
  for (const k of Object.keys(DEF_OPTS)) { const el = f.elements[k]; if (el) opts[k] = el.type === 'checkbox' ? el.checked : el.value; }
  store.set('revers.opts', opts);
  applyTheme();
  $('dlgOpts').close();
}
$('optForm').onsubmit = e => { e.preventDefault(); readOpts(); newGame(); };
$('optKeep').onclick = () => { readOpts(); render(); };
$('optForm').elements.theme.onchange = e => { opts.theme = e.target.value; applyTheme(); store.set('revers.opts', opts); };

let simRun = 0;
$('simGo').onclick = () => {
  const N = Math.max(10, Math.min(20000, +$('simN').value || 500));
  const levels = [$('simA').value, $('simB').value];
  const cfg = cfgFromOpts();
  const W = Math.min(4, navigator.hardwareConcurrency || 2);
  const run = ++simRun, seed = Math.floor(Math.random() * 1e9);
  let agg = emptyAgg(), done = 0, prog = 0;
  $('simProg').max = N; $('simProg').value = 0; $('simOut').innerHTML = '<p class="hint">Simulation en cours…</p>';
  $('simGo').disabled = true;
  const per = Math.ceil(N / W);
  for (let w = 0; w < W; w++) {
    const from = w * per, to = Math.min(N, from + per);
    if (from >= to) { done++; continue; }
    const wk = new Worker('worker.js?v=3', { type: 'module' });
    wk.onmessage = e => {
      if (run !== simRun) return wk.terminate();
      prog += e.data.progress || 0; $('simProg').value = prog;
      if (e.data.done) { agg = mergeAgg(agg, e.data.agg); wk.terminate(); if (++done === W) { $('simGo').disabled = false; showSim(agg, levels); } }
    };
    wk.onerror = err => { $('simOut').innerHTML = `<p class="hint">Erreur du worker : ${err.message}</p>`; $('simGo').disabled = false; };
    wk.postMessage({ id: w, cfg, levels, from, to, seed });
  }
};
function showSim(a, levels) {
  const pc = x => `${(100 * x / a.n).toFixed(1)} %`, per = k => (a[k] / a.n).toFixed(2);
  const keys = Object.keys(a.hist).map(Number).sort((x, y) => x - y);
  const max = Math.max(...keys.map(k => a.hist[k]));
  $('simOut').innerHTML = `<table>
    <tr><td>J1 (${levels[0]}) gagne</td><td>${pc(a.win[0])}</td></tr>
    <tr><td>J2 (${levels[1]}) gagne</td><td>${pc(a.win[1])}</td></tr>
    <tr><td>Égalités</td><td>${pc(a.nul)}</td></tr>
    <tr><td>Le premier joueur gagne</td><td>${pc(a.firstWins)}</td></tr>
    <tr><td>Fin par capture du Souverain</td><td>${pc(a.bySouv)}</td></tr>
    <tr><td>Fin par décompte</td><td>${pc(a.byForce)}</td></tr>
    <tr><td>Durée moyenne</td><td>${(a.turns / a.n).toFixed(1)} tours</td></tr>
    <tr><td>Frappes / échecs par partie</td><td>${per('strikes')} / ${per('fails')}</td></tr>
    <tr><td>Captures par partie</td><td>${per('caps')}</td></tr>
    <tr><td>Pièges de l’Ombre par partie</td><td>${per('traps')}</td></tr>
    <tr><td>Souverains démasqués par partie</td><td>${per('checks')}</td></tr>
    <tr><td>Manœuvres / Éclaireurs / Brumes</td><td>${per('swaps')} / ${per('peeks')} / ${per('brumes')}</td></tr>
  </table>
  <p class="hint" style="margin-top:10px">Durée des parties (tours)</p>
  <div class="bars">${keys.map(k => `<div style="height:${(100 * a.hist[k] / max).toFixed(0)}%" title="${a.hist[k]}"></div>`).join('')}</div>
  <div class="bars-l">${keys.map(k => `<span>${k >= 60 ? '60+' : k}</span>`).join('')}</div>
  <p class="hint">${a.n} parties.</p>`;
}

newGame();
