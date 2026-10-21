'use strict';
let G = null;
const SAVE_KEY = 'dada-party-save-v2';
const CFG_KEY = 'dada-party-cfg-v1';
const MARKET_EVERY = 3;
const EXIT = v => v === 1 || v === 6; // a 1 or a 6 lets a horse leave the stable

const CHANCE = [
  { id: 'or', t: "Pluie d'or !", s: '+6 pièces', good: 1, w: 3 },
  { id: 'vent', t: 'Coup de vent !', s: 'Avance de 5 cases', good: 1, w: 3 },
  { id: 'cadeau', t: 'Joyeux anniversaire !', s: "Chaque adversaire t'offre 2 pièces", good: 1, w: 2 },
  { id: 'de', t: 'Cadeau mystère !', s: 'Un objet gratuit', good: 1, w: 2 },
  { id: 'rejoue', t: 'Encore un tour !', s: 'Tu rejoues après ce coup', good: 1, w: 2 },
  { id: 'impots', t: 'Impôts !', s: 'Donne 1 pièce à chaque adversaire', good: 0, w: 2 },
  { id: 'glisse', t: 'Peau de banane !', s: 'Recule de 4 cases', good: 0, w: 3 },
  { id: 'voleur', t: 'Voleur !', s: 'Le dernier te pique la moitié de tes pièces', good: 0, w: 2 },
  { id: 'echange', t: 'Tornade !', s: 'Échange ta place avec le cheval adverse le plus proche', good: .5, w: 2 },
  { id: 'seisme', t: 'Séisme !', s: 'Tous les chevaux en piste reculent de 2', good: .5, w: 1 },
];

// The board starts plain. Each new round a few special squares appear on free
// squares; past NAT_MAX the oldest natural ones vanish. Players add tiles on top.
const NAT_MAX = 12;
const NAT_POOL = ['coin', 'coin', 'coin', 'chance', 'chance', 'coffre', 'coffre', 'turbo', 'piege', 'portal'];
function freeSquares() {
  const busy = new Set();
  for (const P of G.players) P.pawns.forEach(r => { if (r >= 0 && r <= LAST) busy.add(absOf(P.c, r)); });
  const out = [];
  for (let a = 0; a < 52; a++) if (!SAFE.has(a) && !ENTRY.has(a) && !G.specials[a] && !busy.has(a)) out.push(a);
  return out;
}
function setSquare(a, type, owner) {
  G.specials[a] = type;
  if (owner != null) G.owners[a] = owner; else delete G.owners[a];
}
function clearSquare(a) { delete G.specials[a]; delete G.owners[a]; }
const rebuild = () => R.buildBase(G.specials, G.owners);

// Casino-style reveal: a light chases round the circuit, slows down and stops on
// a free square, then the square's type spins like a slot machine.
async function revealSquare() {
  const free = freeSquares();
  if (!free.length) return;
  const target = pick(free), type = pick(NAT_POOL);
  if (!G.spawnedOnce) {
    G.spawnedOnce = true;
    await UI.banner('Case mystère !', 'De temps en temps, une case spéciale apparaît', { col: '#ffd84a', dur: 1400 });
  }
  UI.hint('Une case spéciale va apparaître…');
  const start = rnd(52), steps = 52 + (target - start + 52) % 52 + (rnd(2) ? 0 : 26);
  const rv = R.reveal = { pos: start, trail: [], target, type: null, flash: false };
  let last = -1;
  SFX.play('whoosh');
  await Tw.add(3000, k => {
    const n = Math.round((1 - Math.pow(1 - k, 3)) * steps);
    if (n === last) return;
    last = n;
    rv.trail.push(rv.pos); if (rv.trail.length > 7) rv.trail.shift();
    rv.pos = (start + n) % 52;
    SFX.play('chase', n / steps);
  });
  rv.trail = []; rv.flash = true;
  SFX.play('ding'); R.addShake(2);
  // the type spins in the lit square
  const kinds = ['coin', 'chance', 'coffre', 'turbo', 'piege', 'portal'];
  for (let i = 0; i < 12; i++) {
    rv.type = i === 11 ? type : kinds[(kinds.indexOf(rv.type) + 1 + rnd(kinds.length - 1)) % kinds.length];
    SFX.play('roulette', i);
    await wait(50 + i * i * 2.5);
  }
  setSquare(target, type); G.nat.push(target);
  while (G.nat.length > NAT_MAX) {
    const a = G.nat.shift();
    if (G.specials[a] && G.owners[a] == null) { clearSquare(a); const [cx, cy] = TRACK[a], p = cellPx(cx, cy); R.burst(p.x, p.y, 8, ['#ffffff', '#cdbff0'], 1.2); }
  }
  R.reveal = null;
  rebuild();
  const [cx, cy] = TRACK[target], p = cellPx(cx, cy);
  SFX.play('spawn');
  R.ring(p.x, p.y, '#ffd84a'); R.ring(p.x, p.y, '#ffffff');
  R.burst(p.x, p.y, 24, [SPECIALS[type].fill, '#ffd84a', '#ffffff'], 2.2);
  UI.pop(SPECIALS[type].nom + ' !', p.x, p.y - 12, { col: SPECIALS[type].fill, size: 2 });
  await wait(900);
  UI.hint('');
}

// Squares where a tile may be placed.
const tileSquares = () => freeSquares();
async function placeTile(P, kind, a) {
  const T = TILES[kind];
  removeDie(P, kind); G.usedTile = true;
  setSquare(a, T.tile, pidx(P));
  rebuild();
  const [cx, cy] = TRACK[a], p = cellPx(cx, cy);
  SFX.play('place'); buzz(20); R.addShake(2);
  R.ring(p.x, p.y, COLORS[P.c].l); R.burst(p.x, p.y, 14, [COLORS[P.c].l, SPECIALS[T.tile].fill, '#ffffff'], 1.8);
  UI.pop(`${SPECIALS[T.tile].nom} posé !`, p.x, p.y - 12, { col: COLORS[P.c].l, size: 1 });
  UI.refresh();
  await wait(spd(500));
}

function newGame(cfg) {
  const players = [];
  cfg.slots.forEach((t, c) => {
    if (t === 'off') return;
    players.push({ c, type: t, name: t === 'ai' ? COLORS[c].ia : COLORS[c].nom, pawns: Array(cfg.pawns).fill(-1), coins: 3, dice: ['turbo'], curse: null, bonus: false, stats: { caps: 0, coins: 3 } });
  });
  return { sid: Math.random(), cfg, players, cur: 0, round: 1, specials: {}, owners: {}, nat: [], spawnedOnce: false, marketDue: false, over: false, winner: -1, moves: null, usedSpecial: false };
}

const humanCount = () => G.players.filter(p => p.type === 'human').length;
const progress = P => P.pawns.reduce((s, r) => s + (r < 0 ? 0 : r + 1), 0);
const onTrack = P => P.pawns.some(r => r >= 0 && r < FIN);
const others = P => G.players.filter(Q => Q !== P);
const pidx = P => G.players.indexOf(P);
const spd = ms => ms * (G && G.cfg.speed && G.players[G.cur].type === 'ai' ? G.cfg.speed : 1);
function removeDie(P, kind) { const i = P.dice.indexOf(kind); if (i >= 0) P.dice.splice(i, 1); }
function gain(P, n, bx, by) {
  if (n <= 0) return;
  P.coins += n; P.stats.coins += n;
  UI.coinFly(bx, by, pidx(P), n);
}

function save() {
  if (!G || G.over) return;
  try { const s = Object.assign({}, G, { moves: null }); localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }

function resetVis() {
  R.vis = G.players.map(P => P.pawns.map((rel, k) => { const p = posOf(P.c, k, rel); return { x: p.x, y: p.y, h: 0, sx: 1, sy: 1 }; }));
}

// ---------- main loop ----------
async function runGame() {
  const sid = G.sid;
  const alive = () => G && G.sid === sid;
  while (alive() && !G.over) {
    if (G.marketDue) { G.marketDue = false; await market(); if (!alive()) return; }
    save();
    UI.refresh();
    await playTurn(G.players[G.cur]);
    if (!alive()) return;
    if (G.over) break;
    G.cur = (G.cur + 1) % G.players.length;
    if (G.cur === 0) {
      G.round++;
      if ((G.round - 1) % MARKET_EVERY === 0) G.marketDue = true;
      // only some rounds: always the first time, never three dry rounds in a row
      G.dry = (G.dry || 0) + 1;
      if (G.round === 2 || G.dry >= 3 || Math.random() < .35) {
        G.dry = 0;
        await revealSquare();
        if (!alive()) return;
      }
    }
  }
  if (alive() && G.over) await victory();
}

async function playTurn(P) {
  G.usedSpecial = false; G.usedTile = false;
  UI.setActive(P);
  await UI.turnIntro(P);
  let sixes = 0, again = true;
  while (again && !G.over) {
    again = false;
    let kind = 'normal', cursed = false;
    if (P.curse) {
      kind = P.curse; P.curse = null; cursed = true; UI.refresh();
      SFX.play('curse');
      await UI.banner(kind === 'maudit' ? 'MAUDIT !' : 'ESCARGOT !', kind === 'maudit' ? 'Ce lancer te fait reculer…' : 'Seulement 1 à 3 ce tour-ci…', { col: '#b48cff', dur: spd(900) });
    } else {
      kind = P.type === 'human' ? await UI.waitRoll(P) : await AI.chooseDie(P);
    }
    if (G.over) return;
    if (!cursed && kind !== 'normal') { removeDie(P, kind); G.usedSpecial = true; UI.refresh(); }
    const stuck = !onTrack(P) && P.pawns.includes(-1);
    const tries = kind === 'normal' && stuck ? 3 : 1;
    let roll;
    for (let t = 0; t < tries; t++) {
      roll = await rollDice(P, kind);
      if (roll.moves.some(m => m.exit) || !stuck || kind !== 'normal') break;
      if (t < tries - 1) {
        UI.pop(`Raté… encore ${tries - 1 - t} essai${tries - 2 - t ? 's' : ''}`, 128, 100, { col: '#ffffff', size: 1 });
        await wait(spd(500));
        if (P.type === 'human') await UI.waitRoll(P, true); else await wait(spd(300));
      }
    }
    for (const m of roll.moves) { await resolveMove(P, m); if (G.over) return; }
    await wait(spd(150));
    R.hideDice();
    if (roll.natural6 && sixes < 2) {
      sixes++; again = true;
      SFX.play('good');
      await UI.banner('SIX !', 'Relance !', { col: '#ffd84a', dur: spd(650) });
    } else if (P.bonus) {
      const cap = P.bonus === 'capture';
      P.bonus = false; again = true;
      SFX.play('good');
      await UI.banner(cap ? 'CAPTURE !' : 'ENCORE !', 'Tu rejoues', { col: cap ? '#ff8f7f' : '#a7f070', dur: spd(650) });
    }
  }
}

async function rollDice(P, kind) {
  let faces, moves, natural6 = false;
  if (kind === 'dore') {
    const v = P.type === 'human' ? await UI.pickNumber() : AI.dorePick;
    faces = [{ val: v, kind }]; moves = [{ v, exit: EXIT(v) }];
  } else if (kind === 'turbo') {
    const a = d6(), b = d6();
    faces = [{ val: a, kind }, { val: b, kind }]; moves = [{ v: a + b, exit: EXIT(a) || EXIT(b) }];
  } else if (kind === 'bis') {
    const a = d6(), b = d6();
    faces = [{ val: a, kind }, { val: b, kind }]; moves = [{ v: a, exit: EXIT(a) }, { v: b, exit: EXIT(b) }];
  } else if (kind === 'maudit') {
    const a = d6(); faces = [{ val: -a, kind }]; moves = [{ v: -a, exit: false }];
  } else if (kind === 'escargot') {
    const a = 1 + rnd(3); faces = [{ val: a, kind }]; moves = [{ v: a, exit: false }];
  } else {
    const a = d6(); faces = [{ val: a, kind: 'normal' }]; moves = [{ v: a, exit: EXIT(a) }]; natural6 = a === 6;
  }
  await R.roll(faces);
  UI.rollFaces = faces; UI.renderInv(P);
  if (kind === 'turbo') UI.pop(`${faces[0].val} + ${faces[1].val} = ${moves[0].v}`, 128, 104, { col: '#ffb26b', size: 2 });
  else if (kind === 'maudit') UI.pop(`Recule de ${-moves[0].v} !`, 128, 104, { col: '#ff6d7c', size: 2 });
  await wait(spd(220));
  return { moves, natural6 };
}

function legalMoves(P, v, exit) {
  const out = [];
  P.pawns.forEach((rel, k) => {
    if (rel === FIN) return;
    if (rel === -1) { if (exit && v > 0) out.push({ k, from: -1, to: 0 }); return; }
    const to = v > 0 ? Math.min(FIN, rel + v) : Math.max(0, rel + v);
    if (to !== rel) out.push({ k, from: rel, to });
  });
  return out;
}

async function resolveMove(P, { v, exit }) {
  const moves = legalMoves(P, v, exit);
  if (!moves.length) {
    UI.pop('Aucun coup possible', 128, 100, { col: '#ffffff', size: 1 });
    await wait(spd(800));
    return;
  }
  const uniq = [], seen = new Set();
  for (const m of moves) { const key = m.from + '>' + m.to; if (!seen.has(key)) { seen.add(key); uniq.push(m); } }
  let m;
  if (uniq.length === 1) m = uniq[0];
  else if (P.type === 'human') m = await UI.pickPawn(P, moves);
  else { G.moves = moves; await wait(spd(450)); m = AI.pickMove(P, uniq); }
  G.moves = null;
  await movePawn(P, m.k, m.from === -1 ? 'exit' : v);
}

// ---------- movement ----------
async function hop(v, x2, y2, dur, height) {
  const x1 = v.x, y1 = v.y;
  await Tw.add(dur, k => {
    v.x = lerp(x1, x2, k); v.y = lerp(y1, y2, k);
    v.h = Math.sin(k * Math.PI) * height;
    v.sy = k < .2 ? .8 + k : k > .8 ? 1 - (k - .8) * 1.2 : 1.1; v.sx = 2 - v.sy;
  });
  v.h = 0; v.sx = 1; v.sy = 1;
}
async function squash(v) {
  await Tw.add(110, k => { v.sy = 1 - Math.sin(k * Math.PI) * .3; v.sx = 2 - v.sy; });
  v.sx = v.sy = 1;
}

async function movePawn(P, k, v, opts = {}) {
  const pi = pidx(P), vis = R.vis[pi][k], from = P.pawns[k];
  const depth = opts.depth || 0;
  vis.anim = true;
  if (v === 'exit') {
    const p = posOf(P.c, k, 0);
    SFX.play('exit');
    await hop(vis, p.x, p.y, 380, 26);
    P.pawns[k] = 0; vis.anim = false;
    R.dust(p.x, p.y); R.ring(p.x, p.y - 4, COLORS[P.c].l); SFX.play('land'); squash(vis);
    UI.pop('En piste !', p.x, p.y - 18, { col: COLORS[P.c].l });
    await landOn(P, k, depth, { exit: true });
    return;
  }
  const to = v > 0 ? Math.min(FIN, from + v) : Math.max(0, from + v);
  if (to === from) { vis.anim = false; return; }
  const dir = to > from ? 1 : -1, n = Math.abs(to - from);
  const dur = opts.fast ? 75 : n > 7 ? 95 : 125;
  let i = 0;
  for (let r = from + dir; dir > 0 ? r <= to : r >= to; r += dir) {
    const p = posOf(P.c, k, r);
    SFX.play('hop', i++);
    await hop(vis, p.x, p.y, dur, r === to ? 9 : 5);
    P.pawns[k] = r;
    if (r !== to) {
      R.dust(p.x, p.y);
      const ab = r <= LAST ? absOf(P.c, r) : -1, own = G.owners[ab];
      if (dir > 0 && G.specials[ab] === 'peage' && own != null && G.players[own] !== P && P.coins > 0) {
        // toll for passing over someone's péage
        P.coins--; gain(G.players[own], 1, p.x, p.y);
        UI.pop('Péage -1', p.x, p.y - 16, { col: '#ff8f7f', size: 1 });
        SFX.play('coin');
      }
      if (dir > 0 && r <= LAST && REFUGE.has(absOf(P.c, r))) {
        UI.pop('+1', p.x, p.y - 16, { col: '#ffd84a', size: 1 });
        R.burst(p.x, p.y - 6, 5, ['#ffd84a', '#fff6c2'], 1.2);
        gain(P, 1, p.x, p.y);
      }
    }
  }
  vis.anim = false;
  const p = posOf(P.c, k, to);
  R.dust(p.x, p.y); SFX.play('land'); squash(vis);
  await landOn(P, k, depth);
}

async function landOn(P, k, depth, opts = {}) {
  const rel = P.pawns[k], pi = pidx(P);
  const p = posOf(P.c, k, rel);
  if (rel === FIN) {
    SFX.play('finish'); buzz(40);
    R.burst(p.x, p.y - 6, 30, ['#ffd84a', '#ffffff', COLORS[P.c].l], 2.2, .05, 45);
    R.ring(p.x, p.y - 6, '#ffd84a'); R.addShake(3);
    UI.pop('ARRIVÉ !', p.x, p.y - 20, { col: '#ffd84a', size: 2 });
    gain(P, 4, p.x, p.y);
    UI.refresh();
    if (P.pawns.every(r => r === FIN)) { G.over = true; G.winner = pi; }
    await wait(spd(650));
    return;
  }
  if (rel > LAST) { await wait(spd(120)); return; }
  const abs = absOf(P.c, rel);
  if (!SAFE.has(abs) || opts.exit) {
    const victims = [];
    G.players.forEach((Q, qi) => { if (Q !== P) Q.pawns.forEach((r, j) => { if (r >= 0 && r <= LAST && absOf(Q.c, r) === abs) victims.push([qi, j]); }); });
    if (victims.length) await capture(P, k, victims);
  } else if (SAFE.has(abs) && !opts.exit && G.players.some(Q => Q !== P && Q.pawns.some(r => r >= 0 && r <= LAST && absOf(Q.c, r) === abs))) {
    UI.pop('Case refuge', p.x, p.y - 18, { col: '#cfd9e8', size: 1 });
  }
  if (REFUGE.has(abs)) {
    SFX.play('coin'); R.burst(p.x, p.y - 6, 12, ['#ffd84a', '#fff6c2', '#cfd9e8'], 1.6);
    UI.pop('Refuge +3', p.x, p.y - 20, { col: '#ffd84a', size: 2 });
    gain(P, 3, p.x, p.y); UI.refresh(); await wait(spd(400));
  }
  const sp = G.specials[abs];
  if (sp && depth < 4) await special(P, k, sp, depth, abs);
}

async function capture(P, k, victims) {
  const p = posOf(P.c, k, P.pawns[k]);
  SFX.play('capture'); buzz([30, 40, 60]);
  R.addShake(7); R.flash = .8; R.flashCol = '#ffffff';
  R.burst(p.x, p.y - 6, 40, ['#ffffff', '#ffd84a', '#ff5d6c', OUT], 2.8, .08, 40);
  R.ring(p.x, p.y - 6, '#ffffff');
  Tw.slow = .25;
  UI.pop('BOUM !', p.x, p.y - 22, { col: '#ff5d6c', size: 3 });
  await wait(90);
  Tw.slow = 1;
  await Promise.all(victims.map(async ([qi, j]) => {
    const Q = G.players[qi], v = R.vis[qi][j];
    Q.pawns[j] = -1;
    const dest = posOf(Q.c, j, -1), x1 = v.x, y1 = v.y;
    v.anim = true;
    await Tw.add(650, kk => {
      v.x = lerp(x1, dest.x, kk); v.y = lerp(y1, dest.y, kk);
      v.h = Math.sin(kk * Math.PI) * 60; v.spin = kk * Math.PI * 4 * (x1 < dest.x ? 1 : -1);
    });
    v.spin = 0; v.h = 0; v.anim = false;
    R.dust(dest.x, dest.y); R.burst(dest.x, dest.y - 4, 8, [COLORS[Q.c].l, '#ffffff'], 1.2);
  }));
  P.stats.caps += victims.length;
  P.bonus = P.bonus || 'capture';
  gain(P, 3 * victims.length, p.x, p.y);
  UI.pop(`+${3 * victims.length}`, p.x + 10, p.y - 10, { col: '#ffd84a' });
  UI.refresh();
  await wait(spd(250));
}

async function special(P, k, type, depth, abs) {
  const pi = pidx(P), p = posOf(P.c, k, P.pawns[k]);
  const say = (t, col, size = 2) => UI.pop(t, p.x, p.y - 20, { col, size });
  R.ring(p.x, p.y - 4, SPECIALS[type].fill);
  const owner = G.owners[abs];
  if (owner != null) {
    const O = G.players[owner];
    if (owner === pi && type !== 'turbo') { say(type === 'peage' ? 'Ton péage' : 'Ton piège', COLORS[O.c].l, 1); await wait(spd(300)); return; }
    // a player's tile is used up once it triggers
    clearSquare(abs); rebuild();
    if (type === 'peage') {
      const n = Math.min(3, P.coins);
      SFX.play('bad'); say('PÉAGE !', '#ff8f7f');
      P.coins -= n;
      if (n) { gain(O, n, p.x, p.y); UI.pop(`${O.name} +${n}`, p.x, p.y - 6, { col: '#ffd84a', size: 1 }); }
      else UI.pop('Fauché !', p.x, p.y - 6, { col: '#ffffff', size: 1 });
      UI.refresh(); await wait(spd(600));
      return;
    }
    if (type === 'piege') UI.pop(`Piège de ${O.name}`, p.x, p.y + 4, { col: COLORS[O.c].l, size: 1 });
  }
  if (type === 'coin') {
    SFX.play('coin'); say('+3', '#ffd84a');
    R.burst(p.x, p.y - 6, 12, ['#ffd84a', '#fff6c2'], 1.6);
    gain(P, 3, p.x, p.y); UI.refresh(); await wait(spd(450));
  } else if (type === 'coffre') {
    SFX.play('chest'); R.burst(p.x, p.y - 6, 16, ['#ffd84a', '#dca26a', '#ffffff'], 2);
    await giveRandomDie(P, p, 'Coffre');
  } else if (type === 'chance') {
    await chance(P, k, depth);
  } else if (type === 'piege') {
    SFX.play('bad'); buzz(60); R.addShake(4);
    say('PIÈGE !', '#ff6d7c'); UI.pop('Recule de 3', p.x, p.y - 6, { col: '#ffffff', size: 1 });
    await wait(spd(450));
    await movePawn(P, k, -3, { fast: true, depth: depth + 1 });
  } else if (type === 'turbo') {
    SFX.play('turbo'); say('TURBO !', '#ffb26b');
    R.burst(p.x, p.y - 4, 14, ['#ffb26b', '#ffffff'], 1.8);
    await wait(spd(300));
    await movePawn(P, k, 4, { fast: true, depth: depth + 1 });
  } else if (type === 'portal') {
    const rel = P.pawns[k];
    let d = 1; while (d < 52 && G.specials[(abs + d) % 52] !== 'portal') d++;
    if (d >= 52 || rel + d > LAST) { say('Portail fermé', '#73eff7', 1); await wait(spd(500)); return; }
    SFX.play('portal');
    const v = R.vis[pi][k]; v.anim = true;
    await Tw.add(300, kk => { v.scale = 1 - kk; v.spin = kk * 6; });
    R.burst(p.x, p.y - 6, 18, ['#73eff7', '#b48cff', '#ffffff'], 2);
    P.pawns[k] = rel + d;
    const q = posOf(P.c, k, rel + d);
    v.x = q.x; v.y = q.y;
    R.burst(q.x, q.y - 6, 18, ['#73eff7', '#b48cff', '#ffffff'], 2);
    await Tw.add(300, kk => { v.scale = easeOutBack(kk); v.spin = (1 - kk) * 6; });
    v.scale = 1; v.spin = 0; v.anim = false;
    UI.pop(`+${d} !`, q.x, q.y - 20, { col: '#73eff7', size: 2 });
    await landOn(P, k, depth + 1);
  }
}

async function giveRandomDie(P, p, label) {
  if (P.dice.length >= MAXDICE) {
    UI.pop('Sac plein : +3', p.x, p.y - 20, { col: '#ffd84a', size: 1 });
    gain(P, 3, p.x, p.y); UI.refresh(); await wait(spd(500)); return;
  }
  const d = pick(['dore', 'turbo', 'turbo', 'bis', 'bis', 'maudit', 'maudit', 'escargot', 'tpiege', 'tpiege', 'tpeage', 'tturbo']);
  P.dice.push(d);
  UI.refresh();
  await UI.banner(`${label} : ${ITEM(d).nom} !`, ITEM(d).desc, { col: '#ffd84a', icon: d, dur: spd(1300) });
}

async function chance(P, k, depth) {
  const pool = [];
  for (const e of CHANCE) for (let i = 0; i < e.w; i++) pool.push(e);
  const ev = pick(pool);
  await UI.roulette(ev);
  const p = posOf(P.c, k, P.pawns[k]);
  const opp = others(P);
  switch (ev.id) {
    case 'or': SFX.play('coin'); R.burst(p.x, p.y - 6, 24, ['#ffd84a', '#fff6c2'], 2.4); gain(P, 6, p.x, p.y); break;
    case 'vent': SFX.play('turbo'); await movePawn(P, k, 5, { fast: true, depth: depth + 1 }); break;
    case 'cadeau': for (const Q of opp) { const n = Math.min(2, Q.coins); Q.coins -= n; gain(P, n, posOf(Q.c, 0, -1).x, posOf(Q.c, 0, -1).y); } SFX.play('coin'); break;
    case 'de': await giveRandomDie(P, p, 'Cadeau'); break;
    case 'rejoue': P.bonus = true; SFX.play('good'); break;
    case 'impots': for (const Q of opp) { if (P.coins <= 0) break; P.coins--; gain(Q, 1, p.x, p.y); } SFX.play('bad'); break;
    case 'glisse': SFX.play('bad'); await movePawn(P, k, -4, { fast: true, depth: depth + 1 }); break;
    case 'voleur': {
      const last = opp.slice().sort((a, b) => progress(a) - progress(b))[0];
      const n = Math.floor(P.coins / 2);
      P.coins -= n; if (n) { const q = posOf(last.c, 0, -1); gain(last, n, p.x, p.y); UI.pop(`${last.name} +${n}`, q.x, q.y - 16, { col: '#ffd84a', size: 1 }); }
      SFX.play('bad'); break;
    }
    case 'echange': await tornado(P, k); break;
    case 'seisme': await quake(); break;
  }
  UI.refresh();
  await wait(spd(300));
}

async function tornado(P, k) {
  const absP = absOf(P.c, P.pawns[k]);
  let best = null, bd = 99;
  G.players.forEach((Q, qi) => {
    if (Q === P) return;
    Q.pawns.forEach((r, j) => {
      if (r < 0 || r > LAST) return;
      const absQ = absOf(Q.c, r);
      const relP = (absQ - START[P.c] + 52) % 52, relQ = (absP - START[Q.c] + 52) % 52;
      if (relP > LAST || relQ > LAST || absQ === absP) return;
      const d = Math.min((absQ - absP + 52) % 52, (absP - absQ + 52) % 52);
      if (d < bd) { bd = d; best = { qi, j, relP, relQ }; }
    });
  });
  if (!best) { UI.pop('Personne à échanger', 128, 100, { col: '#ffffff', size: 1 }); await wait(spd(500)); return; }
  SFX.play('whoosh'); R.addShake(3);
  const Q = G.players[best.qi], vp = R.vis[pidx(P)][k], vq = R.vis[best.qi][best.j];
  const a = posOf(P.c, k, best.relP), b = posOf(Q.c, best.j, best.relQ);
  P.pawns[k] = best.relP; Q.pawns[best.j] = best.relQ;
  vp.anim = vq.anim = true;
  const pa = { x: vp.x, y: vp.y }, pb = { x: vq.x, y: vq.y };
  await Tw.add(600, kk => {
    vp.x = lerp(pa.x, a.x, kk); vp.y = lerp(pa.y, a.y, kk); vp.h = Math.sin(kk * Math.PI) * 40; vp.spin = kk * Math.PI * 4;
    vq.x = lerp(pb.x, b.x, kk); vq.y = lerp(pb.y, b.y, kk); vq.h = Math.sin(kk * Math.PI) * 40; vq.spin = -kk * Math.PI * 4;
  }, easeInOut);
  for (const v of [vp, vq]) { v.anim = false; v.h = 0; v.spin = 0; }
  R.dust(a.x, a.y); R.dust(b.x, b.y);
}

async function quake() {
  SFX.play('capture'); R.addShake(9); buzz(200);
  const jobs = [];
  G.players.forEach(Q => Q.pawns.forEach((r, j) => {
    if (r >= 1 && r <= LAST) {
      const to = Math.max(0, r - 2);
      Q.pawns[j] = to;
      const v = R.vis[pidx(Q)][j], p = posOf(Q.c, j, to);
      v.anim = true;
      jobs.push(hop(v, p.x, p.y, 380, 12).then(() => { v.anim = false; R.dust(p.x, p.y); }));
    }
  }));
  await Promise.all(jobs);
}

// ---------- market ----------
async function market() {
  SFX.play('market'); UI.hint('Marché ouvert');
  await UI.banner('MARCHÉ !', "Chacun peut acheter jusqu'à 2 objets", { col: '#ffd84a', dur: 1300 });
  const offer = [...shuffle(Object.keys(TILES)).slice(0, 2), ...shuffle(['dore', 'turbo', 'bis', 'maudit', 'escargot', 'sortie']).slice(0, 3)];
  const order = G.players.slice().sort((a, b) => progress(a) - progress(b) || a.coins - b.coins);
  for (const P of order) {
    if (!G || G.over) return;
    G.cur = pidx(P);
    UI.setActive(P);
    const bought = P.type === 'human' ? await UI.shop(P, offer) : await AI.shop(P, offer);
    for (const item of bought) {
      if (item === 'sortie') { const k = P.pawns.indexOf(-1); if (k >= 0) await movePawn(P, k, 'exit'); }
    }
    UI.refresh();
  }
  G.cur = 0;
}

async function victory() {
  clearSave();
  const P = G.players[G.winner];
  SFX.play('win'); buzz([60, 60, 120]);
  R.confetti(); R.addShake(5);
  await UI.banner(`${P.name.toUpperCase()} GAGNE !`, 'Tous ses chevaux sont arrivés', { col: COLORS[P.c].l, dur: 2000 });
  UI.endScreen();
}

// ---------- AI ----------
const AI = {
  dorePick: 6,
  danger(P, abs) {
    let n = 0;
    for (const Q of others(P)) for (const r of Q.pawns) {
      if (r < 0 || r > LAST) continue;
      const d = (abs - absOf(Q.c, r) + 52) % 52;
      if (d >= 1 && d <= 6 && r + d <= LAST) n++;
    }
    return n;
  },
  score(P, k, v, exit) {
    const from = P.pawns[k];
    let to, s = 0;
    if (from === -1) { if (!exit) return -1e9; to = 0; s += 42; if (!onTrack(P)) s += 25; }
    else if (from === FIN) return -1e9;
    else to = v > 0 ? Math.min(FIN, from + v) : Math.max(0, from + v);
    if (from >= 0 && to === from) return -1e9;
    if (to === FIN) return s + 100;
    s += (to - Math.max(0, from)) * .8;
    if (from <= LAST && to > LAST) s += 22;
    if (to <= LAST) {
      const abs = absOf(P.c, to), safe = SAFE.has(abs);
      if (!safe || from === -1) for (const Q of others(P)) for (const r of Q.pawns) if (r >= 0 && r <= LAST && absOf(Q.c, r) === abs) s += 55 + r * .7;
      const sp = G.specials[abs];
      const own = G.owners[abs], mine = own != null && G.players[own] === P;
      if (sp === 'coin') s += 9; else if (sp === 'coffre') s += 15; else if (sp === 'chance') s += 5;
      else if (sp === 'piege') s -= mine ? 0 : 14; else if (sp === 'turbo') s += 13;
      else if (sp === 'peage') s -= mine ? 0 : 12;
      else if (sp === 'portal') { let d = 1; while (d < 52 && G.specials[(abs + d) % 52] !== 'portal') d++; if (to + d <= LAST) s += d * .9; }
      if (REFUGE.has(abs)) s += 6;
      if (safe) s += 8; else s -= this.danger(P, abs) * 13;
    }
    if (from >= 0 && from <= LAST) { const a = absOf(P.c, from); if (!SAFE.has(a)) s += this.danger(P, a) * 10; }
    return s + Math.random() * 3;
  },
  best(P, v, exit) {
    let b = -1e9;
    P.pawns.forEach((_, k) => { b = Math.max(b, this.score(P, k, v, exit)); });
    return b;
  },
  pickMove(P, moves) {
    let best = moves[0], bs = -1e9;
    for (const m of moves) {
      const v = m.from === -1 ? 6 : m.to - m.from;
      const s = this.score(P, m.k, m.from === -1 ? 6 : v, true);
      if (s > bs) { bs = s; best = m; }
    }
    return best;
  },
  leader(P, needTrack) {
    return others(P).filter(Q => !Q.curse && (!needTrack || Q.pawns.some(r => r >= 1 && r < FIN)))
      .sort((a, b) => progress(b) - progress(a))[0];
  },
  // Best free square for a tile: in reach (1-6) of the pawns it should catch.
  tileSpot(P, kind) {
    const friendly = kind === 'tturbo';
    let best = null, bs = 0;
    for (const a of tileSquares()) {
      let sc = 0;
      for (const Q of G.players) for (const r of Q.pawns) {
        if (r < 0 || r > LAST) continue;
        const d = (a - absOf(Q.c, r) + 52) % 52;
        if (d < 1 || d > 6 || r + d > LAST) continue;
        const w = d === 6 ? 1 : 1.2;
        sc += (Q === P) === friendly ? w : -w;
      }
      sc += Math.random() * .3;
      if (sc > bs) { bs = sc; best = a; }
    }
    return bs >= 1 ? best : null;
  },
  async chooseDie(P) {
    await wait(spd(380));
    for (const kind of Object.keys(TILES)) {
      if (G.usedTile || !P.dice.includes(kind) || Math.random() > .8) continue;
      const a = this.tileSpot(P, kind);
      if (a != null) { await placeTile(P, kind, a); break; }
    }
    for (const kind of ['maudit', 'escargot']) {
      if (!P.dice.includes(kind) || Math.random() > .7) continue;
      const Q = this.leader(P, kind === 'maudit');
      if (!Q || progress(Q) < progress(P) * .8) continue;
      await giveCurse(P, Q, kind);
      return 'normal';
    }
    if (P.dice.includes('dore')) {
      let bv = 1, bs = -1e9;
      for (let v = 1; v <= 6; v++) { const s = this.best(P, v, EXIT(v)); if (s > bs) { bs = s; bv = v; } }
      if (bs >= 50) { this.dorePick = bv; return 'dore'; }
    }
    if (P.dice.includes('turbo') && onTrack(P) && Math.random() < .4) return 'turbo';
    if (P.dice.includes('bis') && onTrack(P) && Math.random() < .4) return 'bis';
    return 'normal';
  },
  async shop(P, offer) {
    const pref = ['dore', 'tpeage', 'maudit', 'tpiege', 'turbo', 'tturbo', 'bis', 'sortie', 'escargot'];
    const items = offer.slice().sort((a, b) => pref.indexOf(a) - pref.indexOf(b));
    const bought = [];
    for (const it of items) {
      if (bought.length >= 2) break;
      const S = SHOP[it];
      if (P.coins < S.prix || Math.random() > .85) continue;
      if (it === 'sortie') { if (P.pawns.filter(r => r === -1).length - bought.filter(b => b === 'sortie').length < 1) continue; }
      else if (P.dice.length >= MAXDICE) continue;
      P.coins -= S.prix; bought.push(it);
      if (it !== 'sortie') P.dice.push(it);
    }
    UI.refresh();
    SFX.play(bought.length ? 'buy' : 'select');
    await UI.banner(P.name, bought.length ? 'achète : ' + bought.map(b => SHOP[b].nom).join(', ') : "n'achète rien", { col: COLORS[P.c].l, dur: spd(1100), icon: bought[0] });
    return bought;
  },
};

async function giveCurse(P, Q, kind) {
  removeDie(P, kind); Q.curse = kind; G.usedSpecial = true;
  SFX.play('curse'); buzz(50);
  UI.refresh();
  UI.cardFx(pidx(Q), 'cursed');
  await UI.banner(`${DICE[kind].nom} !`, `${P.name} l'offre à ${Q.name}`, { col: '#b48cff', icon: kind, dur: spd(1100) });
}
