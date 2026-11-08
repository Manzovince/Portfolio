// REVERS — moteur de règles (pur, sans DOM). Partagé par l'interface, le worker et tools/sim.mjs.
//
// Plateau : chaque joueur a 2 rangées × 5 colonnes, stockées dans SES coordonnées (colonne 0 = sa gauche).
// Rangée 0 = Front, rangée 1 = Garde. Le joueur 1 est assis en face : sa colonne c est la colonne absolue 4-c.

export const TERRES = ['P', 'F', 'M', 'A'];
export const TNOM = { P: 'Plaine', F: 'Forêt', M: 'Montagne', A: 'Marais', B: 'Blason' };
export const REMPART = { P: 1, F: 2, M: 3, A: 2, B: 2 };
export const CLIMAT_EFFET = {
  P: 'Aucun effet.',
  F: 'Les flèches diagonales ne portent pas.',
  M: 'Toutes les défenses +1.',
  A: 'Manœuvre interdite (sauf Cavalier).',
};
export const DEF_SOUVERAIN = 3;
const DX = { nw: -1, n: 0, ne: 1 };
export const DIRS = ['nw', 'n', 'ne'];

// 11 unités + 1 spécialiste par terre : composition identique pour les 4 terres.
const UNITES = [
  [1, 'nw n ne l r'], [1, 'nw n ne l r'],
  [2, 'nw ne l r'], [2, 'n nw r'], [2, 'n ne l'],
  [3, 'n nw'], [3, 'n ne'], [3, 'nw ne'],
  [4, 'n l'], [4, 'n r'],
  [5, 'n'],
];
const SPECIALISTES = {
  F: [1, 'n', 'eclaireur', 'Éclaireur', 'Révélé : regarde une carte cachée adverse.'],
  A: [1, 'nw ne', 'brume', 'Brume', 'Révélée : échange en secret tes deux Blasons (ou fait semblant).'],
  M: [4, 'l r', 'bastion', 'Bastion', 'Les diagonales ne peuvent pas le viser.'],
  P: [3, 'n', 'cavalier', 'Cavalier', 'Manœuvre avec n’importe quelle case, même sous Marais.'],
};

export const CARDS = [];
function mk(t, f, arrows, kind = 'unit', spec = null, name = null, text = null) {
  const a = new Set(arrows.split(' ').filter(Boolean));
  CARDS.push({ id: CARDS.length, t, f, nw: a.has('nw'), n: a.has('n'), ne: a.has('ne'), l: a.has('l'), r: a.has('r'), kind, spec, name, text });
}
for (const t of TERRES) {
  for (const [f, ar] of UNITES) mk(t, f, ar);
  const [f, ar, spec, name, text] = SPECIALISTES[t];
  mk(t, f, ar, 'spec', spec, name, text);
}
mk('B', 0, '', 'souv', null, 'Souverain', 'Caché : défense 2. Démasqué : défense 3 + soutiens. Capturé : défaite.');
mk('B', 0, '', 'souv', null, 'Souverain', 'Caché : défense 2. Démasqué : défense 3 + soutiens. Capturé : défaite.');
mk('B', 0, '', 'ombre', null, 'Ombre', 'Piège : qui la frappe avec succès perd son attaquant.');
mk('B', 0, '', 'ombre', null, 'Ombre', 'Piège : qui la frappe avec succès perd son attaquant.');
export const souvId = p => 48 + p;
export const ombreId = p => 50 + p;
export const isBlason = id => id >= 48;

export const DEFAULT_CFG = { actions: 1, parachute: true, bonus2: 0, market: 4, hand0: 4, handMax: 7, finalTurns: 2, maxTurns: 300, elan: true, firstNoDraw: true, bonusAct: false };

export function label(id) {
  const c = CARDS[id];
  if (c.kind === 'unit') return `${TNOM[c.t]} ${c.f}`;
  if (c.kind === 'spec') return `${c.name} (${TNOM[c.t]} ${c.f})`;
  return c.name;
}

export function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

export const absCol = (p, c) => (p === 0 ? c : 4 - c); // involution : sert aussi à repasser en relatif

// place = [{s: col, o: col}, {s, o}] (colonnes de Garde, relatives au joueur) ; aléatoire si absent.
export function newGame(cfg = DEFAULT_CFG, rng = Math.random, place = null, first = 0) {
  cfg = { ...DEFAULT_CFG, ...cfg };
  const deck = shuffle([...Array(48).keys()], rng);
  const s = {
    cfg, deck, market: [], disc: [],
    P: [0, 1].map(() => ({ hand: [], b: [Array(5).fill(null), Array(5).fill(null)] })),
    know: [new Uint8Array(52), new Uint8Array(52)],
    cur: first, first, phase: 'draw', acts: cfg.actions, flipped: false, turn: 1,
    winner: null, why: null, finalLeft: null, peek: null, elan: null,
    stats: { traps: 0, checks: 0, caps: [0, 0], strikes: 0, fails: 0, swaps: 0, brumes: 0, peeks: 0 },
    log: [],
  };
  for (const p of [0, 1]) {
    let pl = place && place[p];
    if (!pl) { const cols = shuffle([0, 1, 2, 3, 4], rng); pl = { s: cols[0], o: cols[1] }; }
    s.P[p].b[1][pl.s] = { id: souvId(p), h: true };
    s.P[p].b[1][pl.o] = { id: ombreId(p), h: true };
    s.know[p][souvId(p)] = 1; s.know[p][ombreId(p)] = 1;
    const n = cfg.hand0 + (p !== first ? +cfg.bonus2 : 0);
    for (let i = 0; i < n; i++) { const id = s.deck.pop(); s.P[p].hand.push(id); s.know[p][id] = 1; }
  }
  for (let i = 0; i < cfg.market; i++) { const id = s.deck.pop(); s.market.push(id); s.know[0][id] = s.know[1][id] = 1; }
  if (cfg.firstNoDraw) s.phase = 'act';
  return s;
}

export function clone(s) {
  return {
    cfg: s.cfg, deck: s.deck.slice(), market: s.market.slice(), disc: s.disc.slice(),
    P: s.P.map(pl => ({ hand: pl.hand.slice(), b: pl.b.map(row => row.map(c => c && { id: c.id, h: c.h })) })),
    know: [s.know[0].slice(), s.know[1].slice()],
    cur: s.cur, first: s.first, phase: s.phase, acts: s.acts, flipped: s.flipped, turn: s.turn,
    winner: s.winner, why: s.why, finalLeft: s.finalLeft, peek: null, elan: s.elan,
    stats: { ...s.stats, caps: s.stats.caps.slice() }, log: null,
  };
}

const log = (s, msg) => { if (s.log) s.log.push({ turn: s.turn, p: s.cur, msg }); };
const who = p => (p === 0 ? 'J1' : 'J2');
export const climat = s => (s.deck.length ? CARDS[s.deck[s.deck.length - 1]].t : null);

// ---------- géométrie & combat ----------

export function supports(b, r, c) {
  let n = 0;
  const L = b[r][c - 1], R = b[r][c + 1];
  if (L && !L.h && CARDS[L.id].r) n++;
  if (R && !R.h && CARDS[R.id].l) n++;
  return n;
}
export function attackValue(s, p, r, c) {
  const card = CARDS[s.P[p].b[r][c].id];
  return card.f + (card.t === climat(s) ? 1 : 0);
}
export function defenseValue(s, q, r, c) {
  const cell = s.P[q].b[r][c], card = CARDS[cell.id], cl = climat(s);
  const m = cl === 'M' ? 1 : 0;
  if (cell.h) return REMPART[card.t] + m;
  if (card.kind === 'souv') return DEF_SOUVERAIN + supports(s.P[q].b, r, c) + m;
  return card.f + (card.t === cl ? 1 : 0) + supports(s.P[q].b, r, c) + m;
}
export function canStrikeFrom(s, p, r, c) {
  const cell = s.P[p].b[r][c];
  if (!cell || cell.h || isBlason(cell.id)) return false;
  return r === 0 || !s.P[p].b[0][c];
}
// Cible d'une frappe : {r, c} dans les coordonnées de l'adversaire, ou null.
export function strikeTarget(s, p, r, c, dir) {
  const card = CARDS[s.P[p].b[r][c].id];
  if (!card[dir]) return null;
  if (dir !== 'n' && climat(s) === 'F') return null;
  const q = 1 - p;
  const ta = absCol(p, c) + (p === 0 ? DX[dir] : -DX[dir]);
  if (ta < 0 || ta > 4) return null;
  const tc = absCol(q, ta);
  const B = s.P[q].b;
  const tr = B[0][tc] ? 0 : B[1][tc] ? 1 : -1;
  if (tr < 0) return null;
  const tcell = B[tr][tc];
  if (dir !== 'n' && !tcell.h && CARDS[tcell.id].spec === 'bastion') return null;
  return { r: tr, c: tc };
}
const adj = (a, b) => (a[0] === b[0] && Math.abs(a[1] - b[1]) === 1) || (a[1] === b[1] && a[0] !== b[0]);

// ---------- pioche ----------

export function drawOptions(s) {
  if (s.P[s.cur].hand.length >= s.cfg.handMax) return s.deck.length ? [{ t: 'burn' }] : [];
  const o = s.market.map((_, i) => ({ t: 'take', i }));
  if (s.deck.length) o.push({ t: 'top' });
  return o;
}
export function doDraw(s, o) {
  const p = s.cur, pl = s.P[p];
  if (o && o.t === 'take') {
    const id = s.market[o.i];
    pl.hand.push(id); s.know[p][id] = 1;
    if (s.deck.length) { const m = s.deck.pop(); s.market[o.i] = m; s.know[0][m] = s.know[1][m] = 1; }
    else s.market.splice(o.i, 1);
    log(s, `${who(p)} prend ${label(id)} au marché.`);
  } else if (o && o.t === 'burn') {
    const id = s.deck.pop(); s.disc.push(id); s.know[0][id] = s.know[1][id] = 1;
    log(s, `${who(p)} a la main pleine : ${label(id)} part à la défausse.`);
  } else if (o && o.t === 'top') {
    const id = s.deck.pop();
    pl.hand.push(id); s.know[p][id] = 1;
    log(s, `${who(p)} pioche à l’aveugle (dos ${TNOM[CARDS[id].t]}).`);
  }
  s.phase = 'act';
}

// ---------- actions ----------

function revealExtras(s, p, id) {
  const sp = CARDS[id].spec, q = 1 - p;
  if (sp === 'eclaireur') {
    const out = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { const x = s.P[q].b[r][c]; if (x && x.h && !s.know[p][x.id]) out.push({ r, c }); }
    return out.length ? out : [null];
  }
  if (sp === 'brume' && blasonCells(s, p).filter(x => x.cell.h).length === 2) return [true, false];
  return [null];
}
export function blasonCells(s, p) {
  const out = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { const x = s.P[p].b[r][c]; if (x && isBlason(x.id)) out.push({ r, c, cell: x }); }
  return out;
}

export function flipOptions(s) {
  if (s.flipped || s.phase !== 'act' || s.elan) return [];
  const p = s.cur, out = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    const x = s.P[p].b[r][c];
    if (x && x.h && !isBlason(x.id)) for (const e of revealExtras(s, p, x.id)) out.push({ t: 'flip', r, c, x: e });
  }
  return out;
}

export function legalActions(s) {
  const p = s.cur, pl = s.P[p], B = pl.b, out = [], cl = climat(s);
  if (s.elan) {
    const { r, c } = s.elan;
    if (canStrikeFrom(s, p, r, c)) for (const d of DIRS) { const tg = strikeTarget(s, p, r, c, d); if (tg) out.push({ t: 'strike', r, c, d, tr: tg.r, tc: tg.c }); }
    out.push({ t: 'stop' });
    return out;
  }
  const seen = new Set();
  pl.hand.forEach((id, i) => {
    if (seen.has(id)) return; seen.add(id);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
      if (B[r][c]) continue;
      for (const e of revealExtras(s, p, id)) out.push({ t: 'dep', i, r, c, h: false, x: e });
      out.push({ t: 'dep', i, r, c, h: true });
    }
  });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    if (!canStrikeFrom(s, p, r, c)) continue;
    for (const d of DIRS) { const tg = strikeTarget(s, p, r, c, d); if (tg) out.push({ t: 'strike', r, c, d, tr: tg.r, tc: tg.c }); }
  }
  const cells = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) cells.push([r, c]);
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const a = cells[i], b = cells[j], A = B[a[0]][a[1]], Bc = B[b[0]][b[1]];
    if (!A && !Bc) continue;
    const cav = (A && !A.h && CARDS[A.id].spec === 'cavalier') || (Bc && !Bc.h && CARDS[Bc.id].spec === 'cavalier');
    if (cav || (adj(a, b) && cl !== 'A')) out.push({ t: 'swap', a, b });
  }
  out.push({ t: 'pass' });
  return out;
}

function onReveal(s, p, id, x) {
  const q = 1 - p, sp = CARDS[id].spec;
  if (sp === 'eclaireur' && x) {
    const cell = s.P[q].b[x.r][x.c];
    if (cell && cell.h) {
      s.know[p][cell.id] = 1; s.stats.peeks++;
      if (isBlason(cell.id)) { s.know[p][souvId(q)] = 1; s.know[p][ombreId(q)] = 1; }
      s.peek = { p, id: cell.id, r: x.r, c: x.c };
      log(s, `${who(p)} : l’Éclaireur regarde une carte cachée adverse.`);
    }
  } else if (sp === 'brume' && x !== null && x !== undefined) {
    const bl = blasonCells(s, p);
    if (bl.length === 2 && bl[0].cell.h && bl[1].cell.h) {
      if (x === true) { const t = bl[0].cell.id; bl[0].cell.id = bl[1].cell.id; bl[1].cell.id = t; }
      s.know[q][souvId(p)] = 0; s.know[q][ombreId(p)] = 0; s.stats.brumes++;
      log(s, `${who(p)} : la Brume brouille ses Blasons.`);
    }
  }
}

function toHand(s, p, id) {
  if (s.cfg.parachute && s.P[p].hand.length < s.cfg.handMax) s.P[p].hand.push(id); else s.disc.push(id);
}

export function apply(s, a) {
  const p = s.cur, q = 1 - p, B = s.P[p].b;
  if (a.t === 'flip') {
    const cell = B[a.r][a.c]; cell.h = false; s.flipped = true;
    s.know[0][cell.id] = s.know[1][cell.id] = 1;
    log(s, `${who(p)} : embuscade, ${label(cell.id)} se révèle.`);
    onReveal(s, p, cell.id, a.x);
    return; // action gratuite
  }
  if (a.t === 'dep') {
    const id = s.P[p].hand.splice(a.i, 1)[0];
    B[a.r][a.c] = { id, h: a.h };
    const where = a.r === 0 ? 'au Front' : 'en Garde';
    if (a.h) log(s, `${who(p)} enfouit une carte ${where} (dos ${TNOM[CARDS[id].t]}).`);
    else { s.know[0][id] = s.know[1][id] = 1; log(s, `${who(p)} déploie ${label(id)} ${where}.`); onReveal(s, p, id, a.x); }
  } else if (a.t === 'strike') {
    s.stats.strikes++;
    const atk = attackValue(s, p, a.r, a.c);
    const tcell = s.P[q].b[a.tr][a.tc], tcard = CARDS[tcell.id];
    const def = defenseValue(s, q, a.tr, a.tc);
    const aname = label(B[a.r][a.c].id);
    const tname = tcell.h ? `une carte cachée (dos ${TNOM[tcard.t]})` : label(tcell.id);
    if (atk < def) {
      s.stats.fails++;
      log(s, `${who(p)} : ${aname} frappe ${tname}, ${atk} contre ${def}, échec.`);
    } else if (tcard.kind === 'ombre') {
      s.stats.traps++;
      const aid = B[a.r][a.c].id; B[a.r][a.c] = null; toHand(s, q, aid);
      s.P[q].b[a.tr][a.tc] = null; s.disc.push(tcell.id);
      s.know[0][tcell.id] = s.know[1][tcell.id] = 1; s.know[p][souvId(q)] = 1;
      log(s, `${who(p)} : ${aname} frappe… c’était l’Ombre ! ${aname} est capturé par ${who(q)}.`);
    } else if (tcard.kind === 'souv') {
      if (tcell.h) {
        tcell.h = false; s.stats.checks++;
        s.know[0][tcell.id] = s.know[1][tcell.id] = 1; s.know[p][ombreId(q)] = 1;
        log(s, `${who(p)} : ${aname} démasque le Souverain de ${who(q)} ! Échec.`);
      } else {
        s.winner = p; s.why = 'souverain';
        log(s, `${who(p)} : ${aname} capture le Souverain. Victoire de ${who(p)} !`);
        return;
      }
    } else {
      s.P[q].b[a.tr][a.tc] = null; s.know[0][tcell.id] = s.know[1][tcell.id] = 1;
      toHand(s, p, tcell.id); s.stats.caps[p]++;
      log(s, `${who(p)} : ${aname} capture ${tcell.h ? label(tcell.id) + ' (cachée)' : tname}, ${atk} contre ${def}.`);
      if (s.cfg.elan && !s.elan) { s.elan = { r: a.r, c: a.c }; s.stats.elans = (s.stats.elans || 0) + 1; log(s, `${who(p)} : Élan ! ${aname} peut frapper encore.`); return; }
    }
    s.elan = null;
  } else if (a.t === 'swap') {
    s.stats.swaps++;
    const x = B[a.a[0]][a.a[1]]; B[a.a[0]][a.a[1]] = B[a.b[0]][a.b[1]]; B[a.b[0]][a.b[1]] = x;
    log(s, `${who(p)} manœuvre.`);
  } else if (a.t === 'stop') {
    s.elan = null;
  } else if (a.t === 'pass') {
    log(s, `${who(p)} passe.`);
    endTurn(s); return;
  }
  s.acts--;
  if (s.acts <= 0) endTurn(s);
}

export function forceOnBoard(s, p) {
  let n = 0;
  for (const row of s.P[p].b) for (const x of row) if (x && !x.h && !isBlason(x.id)) n += CARDS[x.id].f;
  return n;
}

function finish(s) {
  const a = forceOnBoard(s, 0), b = forceOnBoard(s, 1);
  s.winner = a > b ? 0 : b > a ? 1 : 'nul'; s.why = 'force';
  log(s, `Fin de la pioche : force visible ${a} contre ${b}. ${s.winner === 'nul' ? 'Égalité.' : 'Victoire de ' + who(s.winner) + '.'}`);
}

export function endTurn(s) {
  if (s.winner !== null) return;
  if (s.finalLeft !== null) { s.finalLeft--; if (s.finalLeft <= 0) return finish(s); }
  else if (!s.deck.length) {
    s.finalLeft = s.cfg.finalTurns;
    log(s, `La pioche est vide : encore ${s.cfg.finalTurns} tours puis décompte.`);
    if (s.finalLeft <= 0) return finish(s);
  }
  if (s.turn >= s.cfg.maxTurns) return finish(s);
  s.elan = null; s.cur = 1 - s.cur; s.phase = 'draw'; s.acts = s.cfg.actions + (s.turn === 1 && s.cfg.bonusAct ? 1 : 0); s.flipped = false; s.turn++;
  if (!drawOptions(s).length) s.phase = 'act';
}
