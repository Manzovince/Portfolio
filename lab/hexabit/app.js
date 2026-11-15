// Hexabit — interface : configuration des règles, partie contre les IA, simulation de masse, paquet.
import * as E from './engine.js';
import { cardSVG, backSVG, bandsSVG, DEFS } from './cards.js';
import { mergeAgg, newAgg } from './stats.js';

const $ = (s, r = document) => r.querySelector(s);
const pct = (x, d = 1) => (x * 100).toFixed(d) + ' %';
const fmt = (x, d = 2) => (Number.isFinite(x) ? (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(d)) : '—');
document.body.insertAdjacentHTML('afterbegin', DEFS);

// =====================================================================
// Configuration
// =====================================================================
const MODE_HAND = { chevauche: 6, duel: 5, plis: 8, registre: 5, rami: 9 };
const MODE_PLAYERS = { chevauche: 3, duel: 2, plis: 4, registre: 3, rami: 3 };

const SCHEMA = {
  common: [
    { k: 'mode', label: 'Jeu', type: 'select', opts: E.MODE_NAMES },
    { k: 'players', label: 'Joueurs', type: 'range', min: 2, max: 6, hide: c => c.mode === 'duel' },
    { k: 'hand', label: 'Cartes en main', type: 'range', min: 1, max: c => E.maxHand(c) },
    { k: 'flip', label: 'Retournement autorisé (180°)', type: 'check' },
  ],
  chevauche: [
    { k: 'refill', label: 'Repiocher après avoir posé', type: 'check' },
    { k: 'blocked', label: 'Joueur bloqué', type: 'select', opts: { draw: 'pioche une carte et passe', pass: 'passe' } },
    { k: 'points', label: 'Valeur d’une colonne', type: 'select', opts: { cards: '1 point par carte', one: '1 point' } },
    { k: 'fullBonus', label: 'Bonus colonne toute noire', type: 'range', min: 0, max: 10 },
  ],
  duel: [
    { k: 'slots', label: 'Cartes sur la table', type: 'range', min: 1, max: 8 },
    { k: 'op', label: 'Jouer une carte', type: 'select', opts: { replace: 'remplace la carte', xor: 'inverse ses bandes (XOR)' } },
    { k: 'win', label: 'Combinaison à colorer', type: 'select', opts: { line: 'une ligne (même bande partout)', card: 'une carte entière', all: 'toute la table' } },
    { k: 'tiebreak', label: 'Mains vides', type: 'select', opts: { majority: 'couleur majoritaire', draw: 'nulle' } },
    { k: 'start', label: 'Premier joueur', type: 'select', opts: { noir: 'Noir', blanc: 'Blanc' } },
    { k: 'setup', label: 'Table de départ', type: 'select', opts: { balanced: 'équilibrée (chaque bande à moitié noire)', neutral: 'neutre (aucune ligne à 1 coup)', random: 'au hasard' } },
    { k: 'swap', label: 'Règle du gâteau (échange des couleurs)', type: 'check' },
    { k: 'handicap', label: 'Cartes en moins pour le 1er joueur', type: 'range', min: 0, max: 3 },
    { k: 'double', label: 'Le 2e joueur joue 2 fois au 1er tour', type: 'check' },
  ],
  plis: [
    { k: 'suitBits', label: 'Bandes de couleur', type: 'range', min: 0, max: 3 },
    { k: 'follow', label: 'Obligation de fournir', type: 'check' },
    { k: 'trump', label: 'Atout', type: 'select', opts: { none: 'aucun', high: 'couleur haute (noire)', low: 'couleur basse (blanche)' } },
    { k: 'lowWins', label: 'La plus faible gagne', type: 'check' },
    { k: 'scoring', label: 'Score', type: 'select', opts: { tricks: '+1 par pli', bands: '+1 par bande noire', avoid: '−1 par pli', avoidBands: '−1 par bande noire' } },
    { k: 'rounds', label: 'Manches', type: 'range', min: 1, max: 10 },
  ],
  registre: [
    { k: 'op', label: 'Opération', type: 'select', opts: { xor: 'XOR', add: '+ (mod 64)', sub: '− (mod 64)', or: 'OU', and: 'ET' } },
    { k: 'cond', label: 'On ramasse quand R', type: 'select', opts: { zero: 'vaut 0', uniform: 'est uniforme (0 ou 63)', palin: 'est un palindrome', single: 'a une seule bande noire' } },
  ],
  rami: [
    { k: 'nulSize', label: 'Combinaison nulle (XOR = 0)', type: 'select', num: true, opts: { 0: 'désactivée', 3: '3 cartes', 4: '4 cartes' } },
    { k: 'nulPts', label: 'Points / carte (nul)', type: 'range', min: 0, max: 5 },
    { k: 'family', label: 'Familles (même nb de bandes)', type: 'check' },
    { k: 'famMin', label: 'Taille mini d’une famille', type: 'range', min: 2, max: 8 },
    { k: 'famPts', label: 'Points / carte (famille)', type: 'range', min: 0, max: 5 },
    { k: 'run', label: 'Suites (valeurs consécutives)', type: 'check' },
    { k: 'runMin', label: 'Longueur mini d’une suite', type: 'range', min: 2, max: 8 },
    { k: 'runPts', label: 'Points / carte (suite)', type: 'range', min: 0, max: 5 },
    { k: 'outBonus', label: 'Bonus main vide', type: 'range', min: 0, max: 20 },
    { k: 'handPenalty', label: 'Pénalité / carte en main', type: 'range', min: 0, max: 5 },
  ],
};

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('hexabit.' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('hexabit.' + k, JSON.stringify(v)); } catch {} },
};
function deepMerge(base, over) {
  const out = structuredClone(base);
  if (over && typeof over === 'object')
    for (const k in base)
      if (k in over) out[k] = base[k] && typeof base[k] === 'object' ? deepMerge(base[k], over[k]) : over[k];
  return out;
}
let cfg = E.normalize(deepMerge(E.DEFAULTS, store.get('cfg')));

const getPath = (o, p) => p.split('.').reduce((a, k) => a[k], o);
function setPath(o, p, v) {
  const ks = p.split('.');
  const last = ks.pop();
  ks.reduce((a, k) => a[k], o)[last] = v;
}
const fieldsFor = c => [...SCHEMA.common.map(f => ({ ...f, path: f.k })), ...SCHEMA[c.mode].map(f => ({ ...f, path: c.mode + '.' + f.k }))];
const resolve = (x, c) => (typeof x === 'function' ? x(c) : x);

function fieldHTML(f, c) {
  const v = getPath(c, f.path);
  if (f.type === 'check')
    return `<label class="f chk"><input type="checkbox" data-path="${f.path}" ${v ? 'checked' : ''}><span>${f.label}</span></label>`;
  if (f.type === 'range') {
    const max = resolve(f.max, c);
    return `<label class="f"><span>${f.label} <b data-out="${f.path}">${v}</b></span>
      <input type="range" data-path="${f.path}" min="${f.min}" max="${max}" step="1" value="${v}"></label>`;
  }
  const opts = Object.entries(f.opts).map(([k, l]) => `<option value="${k}" ${String(v) === k ? 'selected' : ''}>${l}</option>`).join('');
  return `<label class="f"><span>${f.label}</span><select data-path="${f.path}" ${f.num ? 'data-num' : ''}>${opts}</select></label>`;
}

function renderConfig() {
  const fs = fieldsFor(cfg).filter(f => !(f.hide && f.hide(cfg)));
  const common = fs.filter(f => !f.path.includes('.'));
  const specific = fs.filter(f => f.path.includes('.'));
  $('#config').innerHTML = `
    <h2>Règles</h2>
    <div class="fields">${common.map(f => fieldHTML(f, cfg)).join('')}</div>
    <h3>${E.MODE_NAMES[cfg.mode]}</h3>
    <div class="fields">${specific.map(f => fieldHTML(f, cfg)).join('')}</div>
    <button class="ghost small" id="reset-cfg">Valeurs par défaut</button>
    <h3>Résumé des règles</h3>
    <ol class="rules" id="rules"></ol>`;
  renderRules();
}
function renderRules() {
  $('#rules').innerHTML = E.rulesText(cfg).map(t => `<li>${t}</li>`).join('');
}
function readInput(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'range' || el.dataset.num !== undefined) return Number(el.value);
  return el.value;
}
$('#config').addEventListener('input', e => {
  const el = e.target.closest('[data-path]');
  if (!el) return;
  setPath(cfg, el.dataset.path, readInput(el));
  const out = $(`[data-out="${el.dataset.path}"]`);
  if (out) out.textContent = el.value;
  if (el.type === 'range') {
    cfg = E.normalize(cfg);
    renderRules();
  }
});
$('#config').addEventListener('change', e => {
  const el = e.target.closest('[data-path]');
  if (!el) return;
  setPath(cfg, el.dataset.path, readInput(el));
  if (el.dataset.path === 'mode') {
    cfg.players = MODE_PLAYERS[cfg.mode];
    cfg.hand = MODE_HAND[cfg.mode];
  }
  configChanged();
});
$('#config').addEventListener('click', e => {
  if (e.target.id !== 'reset-cfg') return;
  const mode = cfg.mode;
  cfg = structuredClone(E.DEFAULTS);
  Object.assign(cfg, { mode, players: MODE_PLAYERS[mode], hand: MODE_HAND[mode] });
  configChanged();
});
function configChanged() {
  cfg = E.normalize(cfg);
  store.set('cfg', cfg);
  renderConfig();
  renderGameBar();
  if (G.st) {
    G.outdated = JSON.stringify(G.st.cfg) !== JSON.stringify(cfg);
    renderBoard();
  }
  renderSimPanel();
}

// =====================================================================
// Partie
// =====================================================================
const AI_OPTS = { human: 'Vous', ...E.LEVELS };
const G = {
  st: null,
  seats: store.get('seats') || ['human', 'greedy', 'greedy', 'greedy', 'greedy', 'greedy'],
  speed: store.get('speed') || 700,
  rollouts: 16,
  log: [],
  flipped: new Set(),
  sel: null,
  timer: 0,
  ai: E.makeRng(Date.now()),
  moves: [],
  outdated: false,
};
const seatName = (p, mode = G.st?.mode || cfg.mode) => {
  if (mode !== 'duel') return `Joueur ${p + 1}`;
  const swapped = G.st?.mode === 'duel' && G.st.swapped && mode === G.st.mode;
  return ['Noir', 'Blanc'][swapped ? 1 - p : p];
};
const isHuman = p => G.seats[p] === 'human';
const who = p => seatName(p) + (isHuman(p) ? ' (vous)' : '');

function renderGameBar() {
  const n = cfg.mode === 'duel' ? 2 : cfg.players;
  const seats = Array.from({ length: n }, (_, p) => `
    <label class="seat"><span>${seatName(p, cfg.mode)}</span>
      <select data-seat="${p}">${Object.entries(AI_OPTS).map(([k, l]) => `<option value="${k}" ${G.seats[p] === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </label>`).join('');
  $('#gamebar').innerHTML = `
    <div class="seats">${seats}</div>
    <div class="bar-right">
      <label class="seat"><span>Vitesse des IA</span><select id="speed">
        ${[[1500, 'lente'], [700, 'normale'], [250, 'rapide'], [30, 'éclair']].map(([v, l]) => `<option value="${v}" ${G.speed == v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></label>
      <button id="newgame">Nouvelle partie</button>
    </div>`;
}

function newGameUI() {
  clearTimeout(G.timer);
  G.st = E.newGame(cfg, (Math.random() * 2 ** 32) >>> 0);
  G.log = [];
  G.flipped.clear();
  G.sel = null;
  G.outdated = false;
  addLog(null, `Nouvelle partie : ${E.MODE_NAMES[cfg.mode]}`);
  renderBoard();
  schedule();
}

function schedule() {
  clearTimeout(G.timer);
  const st = G.st;
  if (!st || st.over || isHuman(st.cur)) return;
  const delay = st.mode === 'rami' ? G.speed * 0.6 : G.speed;
  G.timer = setTimeout(() => {
    const level = G.seats[st.cur];
    const m = E.chooseMove(st, level, G.ai, G.rollouts);
    play(m);
  }, delay);
}

function play(m) {
  const st = G.st;
  const p = st.cur;
  const before = { ...st.stats, round: st.round };
  const d = E.describeMove(st, m);
  const name = seatName(p);
  E.applyMove(st, m);
  if (d) addLog(p, d, '', name);
  logEvents(before, st);
  G.flipped.delete(m.card);
  G.sel = null;
  if (st.over) logEnd(st);
  renderBoard();
  schedule();
}

function addLog(p, text, cls = '', name = p != null ? seatName(p) : null) {
  G.log.push({ name, text, cls });
  if (G.log.length > 300) G.log.shift();
}
function logEvents(b, st) {
  const s = st.stats;
  if (st.mode === 'chevauche' && s.columns > b.columns) {
    const c = st.lastClose;
    addLog(c.p, `ramasse la colonne (${c.n} carte${c.n > 1 ? 's' : ''})${c.full ? ' — toute noire, bonus !' : ''}`, 'ev');
  }
  if (st.mode === 'chevauche' && s.passes > b.passes && st.R === 0 && s.columns === b.columns && st.pile.length === 0) {
    /* colonne vide qui reste vide : rien à signaler */
  }
  if (st.mode === 'plis' && s.tricks > b.tricks) addLog(st.lastTrick.winner, 'remporte le pli', 'ev');
  if (st.mode === 'plis' && st.round > b.round && !st.over) addLog(null, `Manche ${st.round + 1}`, 'ev');
  if (st.mode === 'registre' && s.captures > b.captures) addLog(st.lastCapture.p, `ramasse ${st.lastCapture.n} cartes`, 'ev');
}
function logEnd(st) {
  const w = E.winners(st);
  if (st.mode === 'duel' && w.length === 2) addLog(null, 'Partie nulle.', 'end');
  else if (w.length > 1) addLog(null, `Égalité entre ${w.map(seatName).join(' et ')}.`, 'end');
  else addLog(null, `${who(w[0])} gagne la partie.`, 'end');
}

// ---------- Plateau ----------
function viewer(st) {
  if (isHuman(st.cur)) return st.cur;
  const h = G.seats.slice(0, st.n).indexOf('human');
  return h;
}

function renderBoard() {
  const st = G.st;
  const el = $('#board');
  if (!st) {
    el.innerHTML = `<div class="empty">Réglez les règles à gauche, choisissez qui joue, puis lancez une <b>nouvelle partie</b>.</div>`;
    renderLog();
    return;
  }
  const v = viewer(st);
  const myTurn = !st.over && isHuman(st.cur);
  G.moves = myTurn ? E.legalMoves(st) : [];
  el.innerHTML = `
    ${G.outdated ? '<div class="note">Les règles ont changé : elles s’appliqueront à la prochaine partie.</div>' : ''}
    <div class="players">${Array.from({ length: st.n }, (_, p) => playerChip(st, p, v)).join('')}</div>
    <div class="center mode-${st.mode}">${CENTER[st.mode](st, myTurn)}</div>
    ${st.over ? endBanner(st) : ''}
    <div class="hand-area">${v >= 0 ? handHTML(st, v, myTurn) : `<p class="hint">Mode spectateur : toutes les mains sont visibles.</p>`}</div>`;
  renderLog();
}

function playerChip(st, p, v) {
  const show = (v < 0 || st.over) && st.hands[p].length;
  const extra = st.mode === 'plis' ? `<span>${st.tricks[p]} pli${st.tricks[p] > 1 ? 's' : ''}</span>` : '';
  const sw = st.mode === 'duel' ? `<i class="sw ${E.duelColorOf(st, p) ? 'b' : 'w'}"></i>` : '';
  return `<div class="chip ${p === st.cur && !st.over ? 'cur' : ''} ${p === v ? 'me' : ''}">
    <div class="nm">${sw}${seatName(p)}</div>
    <div class="lv">${AI_OPTS[G.seats[p]]}</div>
    <div class="sc">${fmt(st.scores[p], 0)}</div>
    <div class="meta"><span>${st.hands[p].length} en main</span>${extra}</div>
    ${show ? `<div class="mini">${st.hands[p].map(c => cardSVG(c)).join('')}</div>` : ''}
  </div>`;
}

function endBanner(st) {
  const order = [...Array(st.n).keys()].sort((a, b) => st.scores[b] - st.scores[a]);
  const w = E.winners(st);
  const title = st.mode === 'duel' && w.length === 2 ? 'Partie nulle' : w.length > 1 ? 'Égalité' : `${who(w[0])} gagne`;
  return `<div class="end"><b>${title}</b>
    <span>${order.map(p => `${seatName(p)} ${fmt(st.scores[p], 0)}`).join(' · ')}</span>
    <button id="replay">Rejouer</button></div>`;
}

const deckHTML = (n, label = 'pioche') =>
  `<div class="pile-slot">${n ? backSVG() : '<div class="card-empty"></div>'}<small>${n} ${label}</small></div>`;

const CENTER = {
  chevauche(st) {
    const pile = st.pile.map(x => `<div class="stack-card">${cardSVG(x.card, { flip: x.flip })}<small>${seatName(x.p).replace('Joueur ', 'J')}</small></div>`).join('');
    return `
      <div class="reg">
        ${bandsSVG(st.R, 'big')}
        <div class="reg-txt"><b>${E.bin(st.R)}</b><span>colonne = ${st.R}</span><span>${6 - E.POP[st.R]} bande${6 - E.POP[st.R] > 1 ? 's' : ''} libre${6 - E.POP[st.R] > 1 ? 's' : ''}</span>
        ${st.passes ? `<span>${st.passes} passe${st.passes > 1 ? 's' : ''} d’affilée</span>` : ''}</div>
      </div>
      <div class="stack">${pile || '<span class="hint">colonne vide : toute carte est posable</span>'}</div>
      ${deckHTML(st.deck.length)}`;
  },
  duel(st, myTurn) {
    const d = st.cfg.duel;
    const me = E.duelColorOf(st, st.cur); // Noir = 1
    const sel = myTurn && G.sel != null ? G.sel : null;
    const selVal = sel != null ? (G.flipped.has(sel) ? E.MIRROR[sel] : sel) : null;
    const slots = st.table.map((v, k) => {
      const face = st.face[k];
      const art = face ? cardSVG(face.card, { flip: face.flip }) : cardSVG(v);
      let prev = '';
      if (selVal != null) {
        const t = st.table.slice();
        t[k] = d.op === 'xor' ? t[k] ^ selVal : selVal;
        const win = E.duelWins(t, me, d.win), lose = E.duelWins(t, 1 - me, d.win);
        prev = `<div class="prev ${win ? 'win' : lose ? 'lose' : ''}">${bandsSVG(t[k])}<small>${win ? 'gagne' : lose ? 'perd' : '→ ' + t[k]}</small></div>`;
      }
      return `<button class="slot ${sel != null ? 'target' : ''}" data-slot="${k}">${art}<small>${k + 1}</small>${prev}</button>`;
    }).join('');
    const [a, o] = st.table.reduce(([a, o], v) => [a & v, o | v], [63, 0]);
    const rows = Array.from({ length: 6 }, (_, i) => {
      const b = 5 - i;
      const black = (a >> b) & 1, white = !((o >> b) & 1);
      return `<i class="${black ? 'b' : white ? 'w' : ''}"></i>`;
    }).join('');
    return `<div class="duel-table">${slots}${d.win === 'line' ? `<div class="rowmark" title="lignes déjà unies">${rows}</div>` : ''}</div>
      ${deckHTML(st.deck.length)}`;
  },
  plis(st) {
    const c = st.cfg.plis;
    const tr = st.trick.length ? st.trick : st.lastTrick?.cards || [];
    const done = !st.trick.length && st.lastTrick;
    const cards = tr.map(t => `<div class="stack-card ${done && t.p === st.lastTrick.winner ? 'won' : ''}">${cardSVG(t.card, { flip: t.flip })}<small>${seatName(t.p).replace('Joueur ', 'J')}</small></div>`).join('');
    const led = st.trick.length && c.suitBits ? E.bin(st.trick[0].val).slice(0, c.suitBits) : null;
    const left = st.hands[st.leader].length;
    const k = st.over ? st.cfg.hand : st.trick.length ? st.cfg.hand - left : st.cfg.hand - left + 1;
    const info = [`Manche ${Math.min(st.round + 1, c.rounds)}/${c.rounds}`, `pli ${k}/${st.cfg.hand}`];
    if (led) info.push(`couleur demandée : <b>${led}</b>`);
    return `<div class="trick ${done ? 'done' : ''}">${cards || '<span class="hint">le pli est vide</span>'}</div>
      <div class="info">${info.join(' · ')}${done ? ` · pli remporté par <b>${seatName(st.lastTrick.winner)}</b>` : ''}</div>`;
  },
  registre(st) {
    const c = st.cfg.registre;
    const cond = SCHEMA.registre[1].opts[c.cond];
    return `<div class="reg">
        ${bandsSVG(st.R, 'big')}
        <div class="reg-txt"><b>${E.bin(st.R)}</b><span>R = ${st.R}</span><span>opération : ${SCHEMA.registre[0].opts[c.op]}</span><span>on ramasse quand R ${cond}</span></div>
      </div>
      <div class="pile-slot"><div class="count-card">${st.pile.length}</div><small>dans la pile</small></div>
      ${deckHTML(st.deck.length)}
      ${st.lastCapture ? `<div class="info">${seatName(st.lastCapture.p)} vient de ramasser ${st.lastCapture.n} cartes</div>` : ''}`;
  },
  rami(st, myTurn) {
    const top = st.discard[st.discard.length - 1];
    const canTake = myTurn && st.phase === 'draw';
    const by = Array.from({ length: st.n }, () => []);
    st.melds.forEach(m => by[m.p].push(m));
    const melds = by.map((ms, p) => ms.length ? `<div class="melds"><small>${seatName(p)}</small>${ms.map(m => `<div class="meld" title="${m.kind}">${m.cards.map((x, i) => cardSVG(x, { flip: m.flips[i] })).join('')}</div>`).join('')}</div>` : '').join('');
    return `<div class="rami-top">
        <button class="pile-slot" data-draw="deck" ${canTake && st.deck.length ? '' : 'disabled'}>${st.deck.length ? backSVG() : '<div class="card-empty"></div>'}<small>${st.deck.length} pioche</small></button>
        <button class="pile-slot" data-draw="take" ${canTake && top != null ? '' : 'disabled'}>${top != null ? cardSVG(top) : '<div class="card-empty"></div>'}<small>défausse (${st.discard.length})</small></button>
      </div>
      <div class="meld-area">${melds || '<span class="hint">aucune combinaison posée</span>'}</div>`;
  },
};

function handHTML(st, v, myTurn) {
  const h = st.hands[v];
  const ms = G.moves;
  const canFlip = st.cfg.flip;
  let controls = '';
  const status = st.over ? '' : myTurn ? `<b>À vous</b>${G.seats.slice(0, st.n).filter(s => s === 'human').length > 1 ? ` (${seatName(v)})` : ''}` : `Au tour de ${who(st.cur)}…`;
  if (myTurn) {
    if (st.mode === 'chevauche' && ms[0].pass)
      controls = `<button data-move="0">Passer${st.cfg.chevauche.blocked === 'draw' && st.deck.length ? ' (et piocher)' : ''}</button><span class="hint">aucune carte ne tient dans la colonne</span>`;
    if (st.mode === 'duel') {
      const sw = ms.findIndex(m => m.swap);
      controls = `${sw >= 0 ? `<button data-move="${sw}" class="ghost">Échanger les couleurs</button>` : ''}<span class="hint">${G.sel == null ? 'Choisissez une carte…' : '…puis un emplacement sur la table.'}</span>`;
    }
    if (st.mode === 'rami') {
      if (st.phase === 'draw') controls = `<span class="hint">Piochez, ou prenez la carte de la défausse.</span>`;
      if (st.phase === 'meld')
        controls = ms.map((m, i) => (m.t === 'end' ? `<button data-move="${i}" class="ghost">Terminer : défausser</button>` : `<button data-move="${i}" data-hl="${m.meld.cards.join(',')}">${E.MELD_NAMES[m.meld.kind]} ${E.meldLabel(m.meld)} <b>+${m.meld.pts}</b></button>`)).join('');
      if (st.phase === 'discard') controls = `<span class="hint">Cliquez la carte à défausser.</span>`;
    }
  }
  const cards = h.map(card => {
    const fl = G.flipped.has(card);
    let ok = false, alt = false;
    if (myTurn) {
      if (st.mode === 'rami') ok = st.phase === 'discard' && ms.some(m => m.card === card);
      else if (st.mode === 'duel') ok = true;
      else {
        ok = ms.some(m => m.card === card && m.flip === fl);
        alt = !ok && ms.some(m => m.card === card);
      }
    }
    const rot = canFlip && E.MIRROR[card] !== card ? `<button class="rot ${fl ? 'on' : ''}" data-rot="${card}" title="Retourner">↻</button>` : '';
    return `<div class="hc ${ok ? 'ok' : ''} ${alt ? 'alt' : ''} ${myTurn && !ok && !alt ? 'no' : ''} ${G.sel === card ? 'sel' : ''}" data-card="${card}">
      ${cardSVG(card, { flip: fl })}
      <div class="hc-foot">${rot}<span>${fl ? '= ' + E.MIRROR[card] : ''}</span></div>
    </div>`;
  }).join('');
  return `<div class="hand-head"><span>${status}</span><div class="controls">${controls}</div></div>
    <div class="hand">${cards || '<span class="hint">main vide</span>'}</div>`;
}

function renderLog() {
  const el = $('#log');
  el.innerHTML = G.log.map(l => `<li class="${l.cls}">${l.name ? `<b>${l.name}</b> ` : ''}${l.text}</li>`).join('');
  el.scrollTop = el.scrollHeight;
}

function setupGameTab() {
  $('#tab-jeu').innerHTML = `
    <div class="gamebar" id="gamebar"></div>
    <div class="game">
      <div class="board" id="board"></div>
      <div class="logbox"><h3>Journal</h3><ol id="log"></ol></div>
    </div>`;
  const tab = $('#tab-jeu');
  tab.addEventListener('change', e => {
    if (e.target.dataset.seat) {
      G.seats[+e.target.dataset.seat] = e.target.value;
      store.set('seats', G.seats);
      if (G.st) {
        renderBoard();
        schedule();
      }
    }
    if (e.target.id === 'speed') {
      G.speed = +e.target.value;
      store.set('speed', G.speed);
    }
  });
  tab.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#newgame') || t.closest('#replay')) return newGameUI();
    const st = G.st;
    if (!st) return;
    const rot = t.closest('[data-rot]');
    if (rot) {
      const c = +rot.dataset.rot;
      G.flipped.has(c) ? G.flipped.delete(c) : G.flipped.add(c);
      return renderBoard();
    }
    if (st.over || !isHuman(st.cur)) return;
    const mv = t.closest('[data-move]');
    if (mv) return play(G.moves[+mv.dataset.move]);
    const dr = t.closest('[data-draw]');
    if (dr) {
      const m = G.moves.find(m => m.t === dr.dataset.draw);
      return m && play(m);
    }
    const slot = t.closest('[data-slot]');
    if (slot && G.sel != null) {
      const fl = G.flipped.has(G.sel);
      const m = G.moves.find(m => m.card === G.sel && m.flip === fl && m.slot === +slot.dataset.slot);
      return m && play(m);
    }
    const hc = t.closest('[data-card]');
    if (hc) {
      const card = +hc.dataset.card;
      if (st.mode === 'duel') {
        G.sel = G.sel === card ? null : card;
        return renderBoard();
      }
      if (st.mode === 'rami') {
        const m = G.moves.find(m => m.t === 'disc' && m.card === card);
        return m && play(m);
      }
      const fl = G.flipped.has(card);
      const m = G.moves.find(m => m.card === card && m.flip === fl) || G.moves.find(m => m.card === card);
      if (m) return play(m);
      hc.classList.remove('shake');
      void hc.offsetWidth;
      hc.classList.add('shake');
    }
  });
  // Survol d'une combinaison au rami : surligne les cartes concernées.
  tab.addEventListener('mouseover', e => {
    const b = e.target.closest('[data-hl]');
    document.querySelectorAll('.hc.hl').forEach(x => x.classList.remove('hl'));
    if (b) b.dataset.hl.split(',').forEach(c => $(`.hc[data-card="${c}"]`)?.classList.add('hl'));
  });
  renderGameBar();
  renderBoard();
}

// =====================================================================
// Simulation de masse
// =====================================================================
const S = {
  levels: store.get('simLevels') || ['greedy', 'greedy', 'greedy', 'greedy', 'greedy', 'greedy'],
  games: 2000,
  rollouts: 8,
  permute: false,
  seed: 1,
  pool: [],
  running: false,
  agg: null,
  aggCfg: null,
  sweep: { path: 'hand', games: 500, rows: null, running: false },
};
const WORKERS = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1));

function runJob(jobCfg, levels, games, onProgress) {
  return new Promise(resolve => {
    const n = E.normalize(jobCfg).players;
    let total = newAgg(n), left = 0;
    const id = Math.random();
    const parts = Math.min(WORKERS, Math.max(1, Math.ceil(games / 20)));
    S.pool.forEach(w => w.terminate());
    S.pool = [];
    const per = Math.ceil(games / parts);
    for (let i = 0; i < parts; i++) {
      const from = i * per, to = Math.min(games, from + per);
      if (from >= to) continue;
      left++;
      const w = new Worker('worker.js', { type: 'module' });
      S.pool.push(w);
      w.onmessage = e => {
        if (e.data.id !== id) return;
        total = mergeAgg(total, e.data.agg);
        onProgress?.(total);
        if (e.data.done && --left === 0) {
          S.pool.forEach(w => w.terminate());
          S.pool = [];
          resolve(total);
        }
      };
      w.postMessage({ id, cfg: jobCfg, levels, from, to, seed: S.seed, rollouts: S.rollouts, permute: S.permute });
    }
    S.cancel = () => {
      S.pool.forEach(w => w.terminate());
      S.pool = [];
      resolve(total);
    };
  });
}

function renderSimPanel() {
  const n = cfg.mode === 'duel' ? 2 : cfg.players;
  const seats = Array.from({ length: n }, (_, p) => `
    <label class="seat"><span>${seatName(p, cfg.mode)}</span>
      <select data-simseat="${p}">${Object.entries(E.LEVELS).map(([k, l]) => `<option value="${k}" ${S.levels[p] === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </label>`).join('');
  const hasExpert = S.levels.slice(0, n).includes('expert');
  $('#simpanel').innerHTML = `
    <div class="seats">${seats}</div>
    <div class="sim-opts">
      <label class="seat"><span>Parties</span><select id="sim-games">${[100, 500, 2000, 10000, 50000, 200000].map(v => `<option ${S.games === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="seat"><span>Réflexion de l’Expert</span><select id="sim-roll">${[4, 8, 16, 32].map(v => `<option value="${v}" ${S.rollouts === v ? 'selected' : ''}>${v} mondes / coup</option>`).join('')}</select></label>
      <label class="seat"><span>Graine</span><input id="sim-seed" type="number" value="${S.seed}" min="1"></label>
      <label class="f chk"><input type="checkbox" id="sim-permute" ${S.permute ? 'checked' : ''}><span>Faire tourner les IA entre les sièges</span></label>
      <button id="sim-run">${S.running ? 'Arrêter' : 'Lancer la simulation'}</button>
    </div>
    ${hasExpert ? '<p class="hint">L’Expert simule des parties à chaque coup : comptez quelques secondes par centaine de parties, davantage au rami et au duel.</p>' : ''}
    <div class="progress" id="sim-progress"><i></i><span></span></div>`;
  renderSweepPanel();
}

async function runSim() {
  if (S.running) return S.cancel?.();
  S.running = true;
  renderSimPanel();
  const n = cfg.mode === 'duel' ? 2 : cfg.players;
  const levels = S.levels.slice(0, n);
  const jobCfg = structuredClone(cfg);
  const t0 = performance.now();
  const prog = $('#sim-progress');
  prog.classList.add('on');
  const onP = agg => {
    const f = agg.games / S.games;
    prog.querySelector('i').style.width = pct(f, 2);
    prog.querySelector('span').textContent = `${agg.games.toLocaleString('fr')} / ${S.games.toLocaleString('fr')} parties · ${Math.round(agg.games / ((performance.now() - t0) / 1000)).toLocaleString('fr')} parties/s`;
    S.agg = agg;
    S.aggCfg = { cfg: jobCfg, levels, permute: S.permute };
    renderSimResults();
  };
  const agg = await runJob(jobCfg, levels, S.games, onP);
  onP(agg);
  S.running = false;
  renderSimPanel();
  const p2 = $('#sim-progress');
  p2.classList.add('on');
  p2.querySelector('i').style.width = pct(agg.games / S.games, 2);
  p2.querySelector('span').textContent = `${agg.games.toLocaleString('fr')} parties en ${((performance.now() - t0) / 1000).toFixed(1)} s`;
}

function ci(p, n) {
  const h = 1.96 * Math.sqrt(Math.max(p * (1 - p), 0) / Math.max(n, 1));
  return [Math.max(0, p - h), Math.min(1, p + h)];
}

function renderSimResults() {
  const a = S.agg;
  const el = $('#simres');
  if (!a || !a.games) {
    el.innerHTML = '';
    return;
  }
  const { cfg: c, levels, permute } = S.aggCfg;
  const n = a.n, N = a.games;
  const fair = 1 / n;
  const rows = a.seats.map((s, i) => {
    const p = s.wins / N, [lo, hi] = ci(p, N);
    const mean = s.sum / N, sd = Math.sqrt(Math.max(0, s.sq / N - mean * mean));
    return { i, p, lo, hi, mean, sd, min: s.min, max: s.max };
  });
  const biased = rows.filter(r => r.lo > fair || r.hi < fair);
  const ex = E.EXTRA_LABELS[c.mode];
  const extras = Object.entries(ex).map(([k, [label, rate]]) => `<tr><td>${label}</td><td>${rate ? pct((a.extra[k] || 0) / N) : fmt((a.extra[k] || 0) / N)}</td></tr>`).join('');
  const lv = Object.entries(a.levels);
  const lvTable = lv.length > 1 ? `
    <div class="card-box"><h3>Par niveau d’IA</h3>
      <table><thead><tr><th>IA</th><th>Places jouées</th><th>Victoires</th><th>Score moyen</th></tr></thead>
      <tbody>${lv.map(([k, L]) => `<tr><td>${E.LEVELS[k]}</td><td>${L.plays.toLocaleString('fr')}</td><td>${pct(L.wins / L.plays)}</td><td>${fmt(L.sum / L.plays)}</td></tr>`).join('')}</tbody></table>
      ${permute ? '' : '<p class="hint">Sans rotation, le niveau se confond avec la place à table : cochez « faire tourner les IA » pour une comparaison juste.</p>'}
    </div>` : '';
  el.innerHTML = `
    <div class="kpis">
      <div><small>Parties</small><b>${N.toLocaleString('fr')}</b></div>
      <div><small>Durée moyenne</small><b>${fmt(a.lenSum / N, 1)}</b><small>coups</small></div>
      <div><small>Égalités</small><b>${pct(a.ties / N)}</b></div>
      <div><small>Équilibre des places</small><b>${biased.length ? 'déséquilibré' : 'équitable'}</b><small>${biased.length ? biased.map(r => seatName(r.i, c.mode)).join(', ') + ' hors de ' + pct(fair, 0) : 'à 95 % près'}</small></div>
    </div>
    <div class="grid2">
      <div class="card-box"><h3>Taux de victoire par place</h3>${barChart(rows.map(r => ({ label: seatName(r.i, c.mode), sub: permute ? '' : E.LEVELS[levels[r.i]], v: r.p, lo: r.lo, hi: r.hi })), fair)}</div>
      <div class="card-box"><h3>Détail</h3>
        <table><thead><tr><th>Place</th>${permute ? '' : '<th>IA</th>'}<th>Victoires</th><th>IC 95 %</th><th>Score moy.</th><th>σ</th><th>min–max</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${seatName(r.i, c.mode)}</td>${permute ? '' : `<td>${E.LEVELS[levels[r.i]]}</td>`}<td><b>${pct(r.p)}</b></td><td>${pct(r.lo)} – ${pct(r.hi)}</td><td>${fmt(r.mean)}</td><td>${fmt(r.sd)}</td><td>${fmt(r.min, 0)} – ${fmt(r.max, 0)}</td></tr>`).join('')}</tbody></table>
      </div>
      ${lvTable}
      <div class="card-box"><h3>${E.MODE_NAMES[c.mode]} : par partie</h3><table><tbody>${extras}</tbody></table></div>
      <div class="card-box"><h3>Durée des parties (coups)</h3>${histChart(a.lenHist, N)}</div>
      <div class="card-box"><h3>Écart de score entre le 1er et le 2e</h3>${histChart(a.marginHist, N)}</div>
    </div>`;
}

// ---------- Balayage d'un paramètre ----------
function sweepParams() {
  return fieldsFor(cfg).filter(f => f.path !== 'mode' && !(f.hide && f.hide(cfg)));
}
function sweepValues(f, from, to) {
  if (f.type === 'check') return [false, true];
  if (f.type === 'select') return Object.keys(f.opts).map(k => (f.num ? Number(k) : k));
  const out = [];
  for (let v = from; v <= to; v++) out.push(v);
  return out;
}
function sweepLabel(f, v) {
  if (f.type === 'check') return v ? 'oui' : 'non';
  if (f.type === 'select') return f.opts[v];
  return String(v);
}
function renderSweepPanel() {
  const ps = sweepParams();
  if (!ps.some(f => f.path === S.sweep.path)) S.sweep.path = 'hand';
  const f = ps.find(f => f.path === S.sweep.path);
  const range = f.type === 'range'
    ? `<label class="seat"><span>de</span><input type="number" id="sw-from" value="${S.sweep.from ?? f.min}" min="${f.min}" max="${resolve(f.max, cfg)}"></label>
       <label class="seat"><span>à</span><input type="number" id="sw-to" value="${Math.min(S.sweep.to ?? resolve(f.max, cfg), f.path === 'hand' ? 12 : 99)}" min="${f.min}" max="${resolve(f.max, cfg)}"></label>`
    : '';
  $('#sweeppanel').innerHTML = `
    <label class="seat"><span>Paramètre</span><select id="sw-path">${ps.map(p => `<option value="${p.path}" ${p.path === S.sweep.path ? 'selected' : ''}>${p.label}</option>`).join('')}</select></label>
    ${range}
    <label class="seat"><span>Parties par valeur</span><select id="sw-games">${[100, 300, 1000, 3000, 10000].map(v => `<option ${S.sweep.games === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <button id="sw-run">${S.sweep.running ? 'Arrêter' : 'Lancer le balayage'}</button>`;
}
async function runSweep() {
  if (S.sweep.running) {
    S.sweep.stop = true;
    return S.cancel?.();
  }
  const f = sweepParams().find(f => f.path === S.sweep.path);
  const from = +($('#sw-from')?.value ?? 0), to = +($('#sw-to')?.value ?? 0);
  S.sweep.from = from;
  S.sweep.to = to;
  const vals = sweepValues(f, from, to);
  S.sweep.running = true;
  S.sweep.stop = false;
  S.sweep.rows = [];
  S.sweep.f = f;
  S.sweep.mode = cfg.mode;
  renderSweepPanel();
  const seen = new Set();
  for (const v of vals) {
    if (S.sweep.stop) break;
    const c2 = structuredClone(cfg);
    setPath(c2, f.path, v);
    if (f.path === 'mode') continue;
    const nc = E.normalize(c2);
    const key = JSON.stringify(nc);
    if (seen.has(key)) continue;
    seen.add(key);
    const levels = Array.from({ length: nc.players }, (_, i) => S.levels[i] || S.levels[0]);
    const row = { v, label: sweepLabel(f, getPath(nc, f.path)), agg: null };
    S.sweep.rows.push(row);
    row.agg = await runJob(nc, levels, S.sweep.games, a => {
      row.agg = a;
      renderSweepResults();
    });
    renderSweepResults();
  }
  S.sweep.running = false;
  renderSweepPanel();
}
function renderSweepResults() {
  const rows = (S.sweep.rows || []).filter(r => r.agg && r.agg.games);
  const el = $('#sweepres');
  if (!rows.length) return (el.innerHTML = '');
  const maxN = Math.max(...rows.map(r => r.agg.n));
  const mode = S.sweep.mode;
  const series = Array.from({ length: maxN }, (_, i) => ({ name: seatName(i, mode), ys: rows.map(r => (i < r.agg.n ? r.agg.seats[i].wins / r.agg.games : null)) }));
  const fairLine = rows.map(r => 1 / r.agg.n);
  const ex = E.EXTRA_LABELS[mode];
  el.innerHTML = `
    <div class="grid2">
      <div class="card-box"><h3>Victoires par place selon « ${S.sweep.f.label} »</h3>${lineChart(rows.map(r => r.label), series, fairLine)}</div>
      <div class="card-box"><h3>Durée moyenne (coups)</h3>${lineChart(rows.map(r => r.label), [{ name: 'durée', ys: rows.map(r => r.agg.lenSum / r.agg.games) }], null, false)}</div>
    </div>
    <div class="card-box scroll"><table>
      <thead><tr><th>${S.sweep.f.label}</th><th>Parties</th>${series.map(s => `<th>${s.name}</th>`).join('')}<th>Égalités</th><th>Durée</th>${Object.values(ex).map(([l]) => `<th>${l}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => {
        const a = r.agg;
        return `<tr><td><b>${r.label}</b></td><td>${a.games}</td>${series.map((_, i) => `<td>${i < a.n ? pct(a.seats[i].wins / a.games) : ''}</td>`).join('')}
          <td>${pct(a.ties / a.games)}</td><td>${fmt(a.lenSum / a.games, 1)}</td>${Object.entries(ex).map(([k, [, rate]]) => `<td>${rate ? pct((a.extra[k] || 0) / a.games) : fmt((a.extra[k] || 0) / a.games)}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table></div>`;
}

// ---------- Graphiques SVG (noir et blanc, comme les cartes) ----------
const DASH = ['', '6 3', '2 3', '10 3 2 3', '1 2', '14 4'];
function barChart(items, ref) {
  const W = 520, H = 210, L = 40, B = 40, T = 14;
  const max = Math.min(1, Math.max(ref * 1.6, ...items.map(i => i.hi)) * 1.1);
  const bw = (W - L - 10) / items.length;
  const y = v => T + (H - T - B) * (1 - v / max);
  let s = '';
  for (let g = 0; g <= 4; g++) {
    const v = (max * g) / 4;
    s += `<line class="grid" x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${Math.round(v * 100)}%</text>`;
  }
  items.forEach((it, i) => {
    const x = L + i * bw + bw * 0.22, w = bw * 0.56;
    s += `<rect class="bar" x="${x}" y="${y(it.v)}" width="${w}" height="${y(0) - y(it.v)}"/>`;
    s += `<line class="ci" x1="${x + w / 2}" x2="${x + w / 2}" y1="${y(it.lo)}" y2="${y(it.hi)}"/><line class="ci" x1="${x + w / 2 - 5}" x2="${x + w / 2 + 5}" y1="${y(it.lo)}" y2="${y(it.lo)}"/><line class="ci" x1="${x + w / 2 - 5}" x2="${x + w / 2 + 5}" y1="${y(it.hi)}" y2="${y(it.hi)}"/>`;
    s += `<text class="val" x="${x + w / 2}" y="${y(it.hi) - 5}" text-anchor="middle">${(it.v * 100).toFixed(1)}</text>`;
    s += `<text class="ax" x="${x + w / 2}" y="${H - B + 15}" text-anchor="middle">${it.label}</text>`;
    if (it.sub) s += `<text class="ax dim" x="${x + w / 2}" y="${H - B + 28}" text-anchor="middle">${it.sub}</text>`;
  });
  s += `<line class="ref" x1="${L}" x2="${W - 6}" y1="${y(ref)}" y2="${y(ref)}"/><text class="ax" x="${W - 8}" y="${y(ref) - 4}" text-anchor="end">équité ${Math.round(ref * 100)}%</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}
function histChart(hist, N) {
  const ks = Object.keys(hist).map(Number).sort((a, b) => a - b);
  if (!ks.length) return '';
  const W = 520, H = 170, L = 36, B = 26, T = 12;
  // Regroupe en au plus 40 classes de largeur entière (ou fractionnaire pour les petits écarts).
  const lo = ks[0], hi = ks[ks.length - 1];
  const step = hi - lo <= 40 ? (ks.every(Number.isInteger) ? 1 : Math.max(0.1, (hi - lo) / 40)) : Math.ceil((hi - lo) / 40);
  const nb = Math.floor((hi - lo) / step + 1e-9) + 1;
  const bins = new Array(nb).fill(0);
  for (const k of ks) bins[Math.min(nb - 1, Math.floor((k - lo) / step + 1e-9))] += hist[k];
  const max = Math.max(...bins) / N;
  const bw = Math.min((W - L - 8) / nb, 40);
  const x0 = L + (W - L - 8 - bw * nb) / 2;
  const y = v => T + (H - T - B) * (1 - v / max);
  const lab = b => fmt(lo + b * step, step < 1 ? 1 : 0);
  let s = `<line class="grid" x1="${L}" x2="${W - 6}" y1="${y(0)}" y2="${y(0)}"/><text class="ax" x="${L - 5}" y="${y(max) + 3}" text-anchor="end">${(max * 100).toFixed(0)}%</text>`;
  bins.forEach((c, b) => {
    const v = c / N;
    if (v) s += `<rect class="bar" x="${x0 + b * bw + 0.5}" y="${y(v)}" width="${Math.max(1, bw - 1.5)}" height="${y(0) - y(v)}"><title>${lab(b)} : ${(v * 100).toFixed(1)} %</title></rect>`;
  });
  const ticks = nb <= 14 ? bins.map((_, b) => b) : [0, Math.floor(nb / 2), nb - 1];
  ticks.forEach(b => (s += `<text class="ax" x="${x0 + b * bw + bw / 2}" y="${H - 8}" text-anchor="middle">${lab(b)}</text>`));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}
function lineChart(xs, series, ref, asPct = true) {
  const W = 520, H = 220, L = 42, B = 46, T = 14;
  const all = series.flatMap(s => s.ys).concat(ref || []).filter(v => v != null);
  const max = Math.max(...all) * 1.12 || 1;
  const x = i => L + 10 + (xs.length > 1 ? (i * (W - L - 30)) / (xs.length - 1) : (W - L) / 2);
  const y = v => T + (H - T - B) * (1 - v / max);
  const f = v => (asPct ? Math.round(v * 100) + '%' : fmt(v, 1));
  let s = '';
  for (let g = 0; g <= 4; g++) {
    const v = (max * g) / 4;
    s += `<line class="grid" x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${f(v)}</text>`;
  }
  xs.forEach((l, i) => (s += `<text class="ax" x="${x(i)}" y="${H - B + 16}" text-anchor="middle">${String(l).length > 12 ? String(l).slice(0, 11) + '…' : l}</text>`));
  if (ref) s += `<polyline class="ref" points="${ref.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>`;
  series.forEach((se, k) => {
    const pts = se.ys.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean);
    s += `<polyline class="line" stroke-dasharray="${DASH[k % 6]}" points="${pts.join(' ')}"/>`;
    se.ys.forEach((v, i) => v != null && (s += `<circle class="dot" cx="${x(i)}" cy="${y(v)}" r="2.6"><title>${se.name} : ${f(v)}</title></circle>`));
  });
  if (series.length > 1)
    s += series.map((se, k) => `<g transform="translate(${L + k * 82},${H - 12})"><line class="line" x1="0" x2="22" y1="-3" y2="-3" stroke-dasharray="${DASH[k % 6]}"/><text class="ax" x="27" y="0">${se.name.replace('Joueur ', 'J')}</text></g>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

function setupSimTab() {
  $('#tab-sim').innerHTML = `
    <div class="card-box"><h3>Simulation de masse</h3><p class="hint">Les règles de gauche s’appliquent. Chaque place est tenue par une IA ; les parties sont réparties sur ${WORKERS} cœur${WORKERS > 1 ? 's' : ''} et reproductibles à graine égale.</p><div id="simpanel"></div></div>
    <div id="simres"></div>
    <div class="card-box"><h3>Balayage d’un paramètre</h3><p class="hint">Fait varier une règle et rejoue les mêmes IA pour chaque valeur.</p><div class="sim-opts" id="sweeppanel"></div></div>
    <div id="sweepres"></div>`;
  const tab = $('#tab-sim');
  tab.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.simseat) {
      S.levels[+t.dataset.simseat] = t.value;
      store.set('simLevels', S.levels);
      renderSimPanel();
    }
    if (t.id === 'sim-games') S.games = +t.value;
    if (t.id === 'sim-roll') S.rollouts = +t.value;
    if (t.id === 'sim-seed') S.seed = Math.max(1, +t.value || 1);
    if (t.id === 'sim-permute') S.permute = t.checked;
    if (t.id === 'sw-path') {
      S.sweep.path = t.value;
      S.sweep.from = S.sweep.to = undefined;
      renderSweepPanel();
    }
    if (t.id === 'sw-games') S.sweep.games = +t.value;
  });
  tab.addEventListener('click', e => {
    if (e.target.closest('#sim-run')) runSim();
    if (e.target.closest('#sw-run')) runSweep();
  });
  renderSimPanel();
}

// =====================================================================
// Paquet
// =====================================================================
const P = { flip: false, sort: 'value' };
function renderPaquet() {
  let cards = [...Array(64).keys()];
  if (P.sort === 'pop') cards.sort((a, b) => E.POP[a] - E.POP[b] || a - b);
  if (P.sort === 'palin') cards.sort((a, b) => (E.MIRROR[b] === b) - (E.MIRROR[a] === a) || a - b);
  const pal = cards.filter(c => E.MIRROR[c] === c);
  const byPop = [0, 1, 2, 3, 4, 5, 6].map(k => [...Array(64).keys()].filter(c => E.POP[c] === k).length);
  $('#tab-paquet').innerHTML = `
    <div class="card-box">
      <div class="sim-opts">
        <label class="seat"><span>Ordre</span><select id="pq-sort">
          <option value="value" ${P.sort === 'value' ? 'selected' : ''}>valeur</option>
          <option value="pop" ${P.sort === 'pop' ? 'selected' : ''}>nombre de bandes noires</option>
          <option value="palin" ${P.sort === 'palin' ? 'selected' : ''}>palindromes d’abord</option></select></label>
        <label class="f chk"><input type="checkbox" id="pq-flip" ${P.flip ? 'checked' : ''}><span>Tout retourner (180°)</span></label>
      </div>
      <p class="hint">${pal.length} cartes sont des palindromes (identiques retournées) : ${pal.sort((a, b) => a - b).join(', ')}.
      Bandes noires par carte : ${byPop.map((n, k) => `${k} → ${n}`).join(' · ')}.</p>
    </div>
    <div class="deck-grid">${cards.map(c => `<figure>${cardSVG(c, { flip: P.flip })}<figcaption>${E.bin(c)}${P.flip ? ` · lue ${E.MIRROR[c]}` : ''}</figcaption></figure>`).join('')}
      <figure>${backSVG()}<figcaption>verso</figcaption></figure></div>`;
}
$('#tab-paquet').addEventListener('change', e => {
  if (e.target.id === 'pq-sort') P.sort = e.target.value;
  if (e.target.id === 'pq-flip') P.flip = e.target.checked;
  renderPaquet();
});

// =====================================================================
// Onglets
// =====================================================================
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + name));
  document.body.dataset.tab = name;
  store.set('tab', name);
}
document.querySelector('.tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (b) showTab(b.dataset.tab);
});

renderConfig();
setupGameTab();
setupSimTab();
renderPaquet();
showTab(store.get('tab') || 'jeu');
