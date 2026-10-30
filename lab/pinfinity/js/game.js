'use strict';
// ---------------------------------------------------------------------------
// PINFINITY — endless procedural pinball. Physics, game systems, rendering,
// HUD, menus, input. Everything renders into a low-res buffer that is
// upscaled without smoothing.
// ---------------------------------------------------------------------------

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const lo = document.createElement('canvas');
const g = lo.getContext('2d');
const safeProbe = document.getElementById('safe');
const HUDH = 28, BARH = 30;
let VW = 180, VH = 380, SC = 2, DPR = 1, BX = 0, BY = HUDH, TOP = 0, BOT = 0;

const MAXV = 1050, SUBSTEPS = 10;

// ---- save ------------------------------------------------------------------
const SAVE_KEY = 'pinfinity.v1';
const save = (() => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (e) { s = {}; }
  const d = Object.assign({ best: 0, coins: 0, deepest: 0, boards: 0, games: 0, tricks: 0, sfx: true, music: true, haptics: true }, s);
  d.upg = Object.assign({ balls: 0, save: 0, start: 0, luck: 0, kick: 0 }, s.upg || {});
  return d;
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode */ } }

const UPGRADES = [
  { k: 'balls', name: 'EXTRA BALL', desc: 'START WITH +1 BALL', costs: [80, 220, 480] },
  { k: 'save', name: 'BALL SAVER', desc: '+3 SEC BALL SAVE', costs: [60, 160, 340] },
  { k: 'start', name: 'STARTER KIT', desc: 'START WITH AN ITEM', costs: [120, 320] },
  { k: 'luck', name: 'LUCKY CHARM', desc: 'MORE ITEM DROPS', costs: [100, 260, 520] },
  { k: 'kick', name: 'KICKBACKS', desc: 'RELIT ON EVERY NEW BALL', costs: [90, 240] },
];

// ---- layout ------------------------------------------------------------------
function resize() {
  DPR = Math.min(3, window.devicePixelRatio || 1);
  const cw = window.innerWidth, ch = window.innerHeight;
  const cs = getComputedStyle(safeProbe);
  let st = parseFloat(cs.paddingTop) || 0;
  const sb = parseFloat(cs.paddingBottom) || 0;
  // home-screen apps draw under the status bar; if env() hasn't reported it yet, reserve it anyway
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  if (standalone && st < 20 && /iPhone|iPad|iPod/.test(navigator.userAgent)) st = Math.max(window.screen.height, window.screen.width) >= 812 ? 54 : 20;
  lastSafe = cs.paddingTop + '|' + cs.paddingBottom + '|' + cw + 'x' + ch;
  const needH = HUDH + 332 + BARH;
  SC = Math.min(cw / W, (ch - st - sb) / needH);
  VW = Math.ceil(cw / SC); VH = Math.ceil(ch / SC);
  lo.width = VW; lo.height = VH;
  cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  TOP = Math.round(st / SC); BOT = Math.round(sb / SC);
  BX = Math.floor((VW - W) / 2);
  const spare = VH - TOP - BOT - needH;
  BY = TOP + HUDH + Math.max(0, Math.min(10, Math.floor(spare * .2)));
}
let lastSafe = '';
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 300));
setInterval(() => {
  const cs = getComputedStyle(safeProbe);
  if (cs.paddingTop + '|' + cs.paddingBottom + '|' + window.innerWidth + 'x' + window.innerHeight !== lastSafe) resize();
}, 500);
resize();

// ---- game objects -------------------------------------------------------------
function mkFlip(k) { const f = FLIP[k]; return Object.assign({}, f, { key: k, ang: f.rest, prev: f.rest, omega: 0, pressed: false, flash: 0 }); }
function mkBall(x, y) {
  return { x, y, vx: 0, vy: 0, r: 4, mode: 'free', trail: [], z: 0, scale: 1, portalCool: 0, fromCannon: 0, lastFlipSide: null, lastFlipT: -9, minY: 999,
    activeFlipT: -9, contacts: 0, cradleT: 0, cradled: false, touchT: -9, touchSide: null, stillT: 0, px: x, py: y, lane: -1, tube: null, ts: 0, tv: 0 };
}

function newGame(ai = false) {
  const G = {
    ai, seed: (Math.random() * 4294967296) >>> 0, cache: new Map(), mapInfo: new Map(),
    board: null, balls: [], flips: [mkFlip('L'), mkFlip('R')],
    score: 0, dispScore: 0, coinsRun: 0, ballsLeft: 3 + save.upg.balls, items: [null, null],
    fx: { magnet: 0, giant: 0, slow: 0, shield: 0, fire: 0 },
    combo: { n: 0, t: 0, punch: 0, best: 0 }, nextEB: 20, mult: 1, ballSave: 0, tilt: 0, tilted: false, warned: false, nudgeCool: 0, lastNudge: -9,
    time: 0, ptime: 0, rt: 0,
    cannon: { active: false, ball: null, ang: 0, t: 0, charge: 0, charging: false, recoil: 0, fresh: true, hint: true },
    particles: [], popups: [], banners: [], shake: 0, sx: 0, sy: 0, hitstop: 0, flash: 0, flashCol: '#fff',
    trans: null, deepest: 0, boardsSeen: 0, continues: 0, tricksDone: 0,
    frenzy: [], lastRamp: -9, cool: {}, coinStreak: 0, coinT: 0, pendingCannon: 0, pendingOver: 0, multiQ: 0, multiT: 0,
    kick: { L: true, R: true, flash: { L: 0, R: 0 } },
    aiHold: { L: 0, R: 0 }, aiRest: { L: 0, R: 0 }, aiCool: { L: 0, R: 0 }, aiT: 0, lockMsgT: 0, skillLane: -1, dropT: -9,
  };
  G.board = getBoard(G, 0, 0);
  arriveBoard(G, G.board, true);
  if (!ai) {
    const kit = save.upg.start;
    for (let i = 0; i < kit; i++) G.items[i] = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)];
  }
  toCannon(G, true);
  return G;
}

function getBoard(G, x, y) {
  const k = x + ',' + y;
  let B = G.cache.get(k);
  if (B) { G.cache.delete(k); G.cache.set(k, B); return B; }
  B = genBoard(G.seed, x, y);
  G.cache.set(k, B);
  while (G.cache.size > 14) G.cache.delete(G.cache.keys().next().value);
  return B;
}

function gravityFor(B) { return 560 * (1 + Math.min(.3, B.depth * .02)); }
function depthMult(G) { return 1 + G.board.depth * .25; }

const sfx = (G, name, a) => { if (!G.ai) Sfx[name](a); };
const buzz = (G, ms) => { if (!G.ai && save.haptics && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } };

// ---- scoring / feedback ------------------------------------------------------
function comboMult(G) { return Math.min(4, 1 + Math.floor(G.combo.n / 5) * .5); }
function addScore(G, base, x, y, col, force) {
  if (G.tilted) return 0;
  let m = G.mult * comboMult(G) * depthMult(G);
  if (G.fx.giant > 0) m *= 2;
  if (G.fx.fire > 0) m *= 3;
  const pts = Math.max(10, Math.round(base * m / 10) * 10);
  G.score += pts;
  if (x != null && (base >= 100 || force)) popup(G, x, y, fmtShort(pts), col || '#fff');
  return pts;
}
function addCombo(G) {
  const c = G.combo;
  c.n++; c.t = 2.2; c.punch = 1;
  if (c.n > c.best) c.best = c.n;
  if (c.n >= 3) sfx(G, 'combo', c.n);
  if (c.n >= G.nextEB) { G.nextEB += 20; extraBall(G, `COMBO ${c.n} PRIZE`); }
}
function extraBall(G, why) {
  if (G.ai) return;
  G.ballsLeft++;
  banner(G, 'EXTRA BALL!', why, '#4cff7a', 3, 1.8);
  Sfx.unlock(); Sfx.item();
  G.flash = .6; G.flashCol = '#4cff7a';
  shake(G, 5); buzz(G, 80);
  const b = G.balls.find(x => x.mode === 'free') || { x: 90, y: 160 };
  burst(G, b.x, b.y, 40, ['#4cff7a', '#fff', '#ffd93b'], 160);
}
function endCombo(G) {
  const c = G.combo;
  if (c.n >= 5) {
    const bonus = Math.round(c.n * c.n * 25 * depthMult(G) / 10) * 10;
    G.score += bonus;
    banner(G, `COMBO ${c.n}!`, '+' + fmtScore(bonus), comboCol(c.n), 2);
    sfx(G, 'comboEnd', c.n);
  }
  c.n = 0; c.t = 0;
}
function comboCol(n) { return n >= 30 ? '#ff5bd1' : n >= 20 ? '#ff3b5c' : n >= 10 ? '#ff8a1f' : n >= 5 ? '#ffd93b' : '#7af2ff'; }

function popup(G, x, y, text, col = '#fff') {
  if (G.popups.length > 24) G.popups.shift();
  G.popups.push({ x, y, text, col, t: 0, dur: .9 });
}
function banner(G, text, sub = '', col = '#fff', size = 2, dur = 1.25) {
  if (G.ai) return;
  if (G.banners.length > 3) G.banners.splice(1, 1);
  if (G.banners.length) { const b = G.banners[0]; b.dur = Math.min(b.dur, b.t + .35); }
  G.banners.push({ text, sub, col, size, t: 0, dur });
}
function trick(G, name, pts, x, y) {
  const k = 'trick_' + name;
  if ((G.cool[k] || 0) > G.time) return;
  G.cool[k] = G.time + 2.5;
  const p = addScore(G, pts, x, y, '#ffd93b', true);
  banner(G, name, '+' + fmtScore(p), '#ffd93b', 2, 1.1);
  sfx(G, 'trick');
  G.tricksDone++;
  G.flash = Math.max(G.flash, .25); G.flashCol = '#fff6c0';
  burst(G, x, y, 16, ['#ffd93b', '#fff', '#ff8a1f'], 120);
  buzz(G, 20);
}
function shake(G, v) { G.shake = Math.max(G.shake, v); }

function burst(G, x, y, n, cols, sp = 90, grav = 120, life = .6, size = 1) {
  for (let i = 0; i < n; i++) {
    if (G.particles.length > 420) G.particles.shift();
    const a = Math.random() * Math.PI * 2, s = sp * (.3 + Math.random() * .9);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: grav, life: life * (.5 + Math.random() * .7), max: life, col: cols[i % cols.length], size: size + (Math.random() < .25 ? 1 : 0) });
  }
}

// ---- cannon --------------------------------------------------------------------
function toCannon(G, fresh) {
  const b = mkBall(CANNON.x, CANNON.y);
  b.mode = 'cannon';
  G.balls.push(b);
  Object.assign(G.cannon, { active: true, ball: b, t: Math.random() * 3, charge: 0, charging: false, fresh });
  if (fresh && save.upg.kick && !G.ai && G.time > 1) { if (save.upg.kick >= 1) G.kick.L = true; if (save.upg.kick >= 2) G.kick.R = true; }
  G.skillLane = G.board.lanes.length ? Math.floor(Math.random() * G.board.lanes.length) : -1;
  G.aiT = 0;
}
function fireCannon(G, power = null, ang = null) {
  const c = G.cannon;
  if (!c.active || !c.ball) return;
  const b = c.ball;
  const p = power != null ? power : c.charge;
  const a = ang != null ? ang : c.ang;
  const spd = 560 + 380 * p;
  b.vx = Math.sin(a) * spd; b.vy = -Math.cos(a) * spd;
  b.mode = 'free'; b.fromCannon = 2.6; b.ghost = .3;
  c.active = false; c.ball = null; c.recoil = 1; c.charging = false; c.hint = false;
  if (c.fresh) G.ballSave = Math.max(G.ballSave, 6 + 3 * save.upg.save);
  sfx(G, 'launch', p); shake(G, 2 + p * 3); buzz(G, 30);
  burst(G, CANNON.x, CANNON.y - 4, 14, ['#ddd', '#999', '#fff', G.board.theme.a3], 80, -30, .5);
}

// ---- items -----------------------------------------------------------------------
function giveItem(G, key, x, y) {
  const i = G.items.indexOf(null);
  const info = ITEM_INFO[key];
  if (i < 0) {
    G.coinsRun += 10; if (!G.ai) save.coins += 10;
    banner(G, info.name, 'SLOTS FULL: +10 COINS', '#ffd93b', 2);
    sfx(G, 'coin', 8);
    return;
  }
  G.items[i] = key;
  banner(G, 'GOT ' + info.name + '!', 'TAP SLOT TO USE', info.col, 2, 1.4);
  sfx(G, 'pickup');
  if (x != null) burst(G, x, y, 20, [info.col, '#fff'], 110);
}
function useItem(G, i) {
  const key = G.items[i];
  if (!key || G.trans) return;
  G.items[i] = null;
  const info = ITEM_INFO[key];
  switch (key) {
    case 'multi': G.multiQ += 2; G.multiT = .1; G.ballSave = Math.max(G.ballSave, 8); break;
    case 'magnet': G.fx.magnet = 15; break;
    case 'giant': G.fx.giant = 14; break;
    case 'slow': G.fx.slow = 9; break;
    case 'shield': G.fx.shield = 25; break;
    case 'fire': G.fx.fire = 12; break;
    case 'coinrain':
      for (let k = 0; k < 26; k++) G.board.pickups.push({ kind: 'fcoin', x: 20 + Math.random() * 140, y: 14 + Math.random() * 40 - k * 6, vy: 18 + Math.random() * 20, vx: 0, t: 0, life: 14, taken: false });
      break;
    case 'saver': G.ballSave = Math.max(G.ballSave, 20); break;
  }
  banner(G, info.name + '!', info.desc, info.col, 2, 1.3);
  sfx(G, 'item');
  G.flash = .45; G.flashCol = info.col;
  shake(G, 3); buzz(G, 40);
}

// ---- board arrival / exits --------------------------------------------------
function arriveBoard(G, B, first) {
  const k = B.gx + ',' + B.gy;
  if (!G.mapInfo.has(k)) {
    G.mapInfo.set(k, { col: B.theme.a1, bg: B.theme.bg2, ex: boardExits(G.seed, B.gx, B.gy) });
    G.boardsSeen++;
    if (!G.ai) save.boards++;
    if (!first) {
      const bonus = addScore(G, 1000 * (1 + B.depth), null, null);
      banner(G, B.name, 'NEW BOARD +' + fmtScore(bonus), B.theme.a3hi, 2, 1.8);
      sfx(G, 'discover');
    }
  } else if (!first) banner(G, B.name, `${B.gx},${B.gy}`, B.theme.a3hi, 2, 1.3);
  if (B.gy > G.deepest) {
    G.deepest = B.gy;
    if (!first) banner(G, 'DEPTH ' + B.gy, 'NEW RECORD', '#7af2ff', 2, 1.3);
  }
  G.grav = gravityFor(B);
  if (!G.ai && save.music) Sfx.startMusic(B.music.seed, B.music.tempo, B.music.minor);
}

function reqLeft(B, e) { return e.req ? Math.max(0, e.req.n - (B.stats[e.req.k] || 0)) : 0; }
function reqLabel(B, e) { const n = reqLeft(B, e); return e.req.n > 1 ? `${n} ${e.req.label}` : e.req.label; }
const EXIT_NAMES = { hole: 'HOLE', elev: 'ELEVATOR', doorL: 'DOOR', doorR: 'DOOR' };

function checkExits(G) {
  const B = G.board;
  for (const e of B.exits) {
    if (e.open || !e.req) continue;
    if (reqLeft(B, e) <= 0) openExit(G, e, true);
  }
}
function openExit(G, e, fanfare) {
  e.open = true; e.flash = 1;
  if (e.bar) e.bar.on = false;
  if (!fanfare) return;
  const arrow = e.type === 'hole' ? 'GO DOWN' : e.type === 'elev' ? 'GO UP' : e.type === 'doorL' ? '< WEST' : 'EAST >';
  banner(G, EXIT_NAMES[e.type] + ' OPEN!', arrow, '#4cff7a', 2, 1.4);
  sfx(G, 'unlock');
  const p = exitPoint(e);
  burst(G, p[0], p[1], 26, ['#4cff7a', '#fff', '#ffd93b'], 130);
  addScore(G, 1500, p[0], p[1], '#4cff7a');
  G.flash = .3; G.flashCol = '#c0ffd0';
  if (G.board.exits.every(x => x.open) && G.board.exits.length > 1) {
    const b = addScore(G, 5000, null, null);
    banner(G, 'ALL EXITS OPEN', '+' + fmtScore(b), '#ff5bd1', 2, 1.4);
  }
}
function exitPoint(e) {
  if (e.type === 'hole') return [e.x, e.y];
  if (e.type === 'elev') return [90, 16];
  if (e.type === 'doorL') return [3, e.y];
  return [177, e.y];
}

function enterPortal(G, b, e) {
  if (G.trans) return;
  const target = exitPoint(e);
  G.trans = { phase: 'suck', t: 0, exit: e, ball: b, sx: b.x, sy: b.y, tx: target[0], ty: target[1], from: G.board, to: null };
  b.mode = 'suck';
  if (G.combo.n >= 6) trick(G, 'STYLISH EXIT', G.combo.n * 400, b.x, b.y);
  addScore(G, 750, b.x, b.y, '#7af2ff');
  sfx(G, 'portal'); shake(G, 3); buzz(G, 50);
  G.hitstop = .06;
}

function updateTrans(G, dt) {
  const T = G.trans;
  T.t += dt;
  if (T.phase === 'suck') {
    const k = Math.min(1, T.t / .42);
    const b = T.ball;
    const sp = (1 - k) * 6;
    b.x = lerp(T.sx, T.tx, ease(k)) + Math.cos(T.t * 30) * sp;
    b.y = lerp(T.sy, T.ty, ease(k)) + Math.sin(T.t * 30) * sp;
    b.scale = 1 - k * .9;
    if (Math.random() < .7) burst(G, T.tx, T.ty, 2, [G.board.theme.a3hi, '#fff'], 40, 0, .4);
    if (k >= 1) {
      const [nx, ny] = T.exit.to;
      T.to = getBoard(G, nx, ny);
      T.dx = nx - G.board.gx; T.dy = ny - G.board.gy;
      T.phase = 'slide'; T.t = 0;
      G.particles.length = 0; G.popups.length = 0;
      sfx(G, 'arrive');
    }
  } else if (T.phase === 'slide') {
    if (T.t >= .62) finishTrans(G);
  }
}

const ARRIVE_FROM = { hole: 'elev', elev: 'hole', doorL: 'doorR', doorR: 'doorL' };
function finishTrans(G) {
  const T = G.trans;
  const B = T.to, from = G.board;
  G.trans = null;
  G.board = B;
  const atype = ARRIVE_FROM[T.exit.type];
  const ae = B.exits.find(e => e.type === atype);
  if (ae && !ae.open) openExit(G, ae, false);
  arriveBoard(G, B, false);
  const live = G.balls.filter(b => b.mode !== 'gone' && b.mode !== 'cannon');
  live.forEach((b, i) => {
    b.mode = 'free'; b.scale = 1; b.z = 0; b.tube = null; b.trail.length = 0; b.portalCool = 1.1; b.lane = -1;
    const j = (i - (live.length - 1) / 2);
    if (atype === 'elev') { b.x = 90 + j * 2; b.y = 30 + i * 3; b.vx = (Math.random() - .5) * 60; b.vy = 150; }
    else if (atype === 'hole' && ae) { b.x = ae.x + j * 3; b.y = ae.y; b.vx = (Math.random() - .5) * 160; b.vy = -260 - Math.random() * 60; b.z = 1; b.hop = .35; }
    else if (atype === 'doorL' && ae) { b.x = 13; b.y = ae.y + j * 3; b.vx = 240; b.vy = -40; }
    else if (atype === 'doorR' && ae) { b.x = 167; b.y = ae.y + j * 3; b.vx = -240; b.vy = -40; }
    else { b.x = 90; b.y = 40; b.vx = 0; b.vy = 100; }
  });
  for (const s of from.saucers) s.ball = null;
  G.ballSave = Math.max(G.ballSave, 4);
  const p = ae ? exitPoint(ae) : [90, 40];
  burst(G, p[0], p[1], 24, [B.theme.a3hi, '#fff', B.theme.a1], 120);
  shake(G, 3);
}

// ---- hits ------------------------------------------------------------------------
function onHit(G, b, kind, obj, imp, nx, ny) {
  const B = G.board, T = B.theme;
  if (kind !== 'flipper' && imp > 40) b.contacts++;
  switch (kind) {
    case 'bumper': case 'mover': {
      if ((obj.cool || 0) > 0) return;
      const kick = (kind === 'mover' ? 230 : 270) * (G.fx.giant > 0 ? .85 : 1);
      b.vx += nx * kick; b.vy += ny * kick;
      obj.cool = .06; obj.flash = 1; obj.squash = 1;
      addScore(G, kind === 'mover' ? 150 : 100, obj.x != null ? obj.x : b.x, (obj.y != null ? obj.y : b.y) - 10, T.a1hi);
      addCombo(G);
      B.stats.bump++; checkExits(G);
      sfx(G, 'bumper', G.combo.n);
      burst(G, b.x - nx * b.r, b.y - ny * b.r, 8, [T.a1hi, '#fff', T.a1], 110, 60, .35);
      shake(G, G.fx.giant > 0 ? 4 : 1.6); buzz(G, 12);
      G.hitstop = Math.max(G.hitstop, G.fx.giant > 0 ? .05 : .018);
      if (G.fx.fire > 0) burst(G, b.x, b.y, 6, ['#ff8a1f', '#ffd93b', '#ff3b5c'], 80, -40, .5);
      const now = G.time;
      G.frenzy.push(now);
      while (G.frenzy.length && now - G.frenzy[0] > 1.6) G.frenzy.shift();
      if (G.frenzy.length >= 6) { trick(G, 'BUMPER FRENZY', 2500, b.x, b.y); G.frenzy.length = 0; }
      break;
    }
    case 'sling':
      if (imp < 35 || (obj.cool || 0) > 0) return;
      b.vx += nx * 210; b.vy += ny * 210;
      obj.flash = 1; obj.cool = .08;
      addScore(G, 30, b.x, b.y);
      sfx(G, 'sling'); shake(G, 1.2);
      burst(G, b.x - nx * b.r, b.y - ny * b.r, 5, ['#fff', T.a1hi], 80, 60, .3);
      break;
    case 'drop': {
      const t = obj;
      if (t.down || (imp < 18 && G.fx.fire <= 0)) return;
      t.down = true; t.seg.on = false; t.flash = 1;
      addScore(G, 250, t.x, t.y - 6, T.a2hi);
      addCombo(G);
      sfx(G, G.fx.fire > 0 ? 'smash' : 'drop');
      burst(G, t.x, t.y, 10, [T.a2hi, T.a2, '#fff'], 100, 100, .5);
      shake(G, 1.5);
      if (G.time - b.activeFlipT < .75 && b.contacts <= 1) trick(G, 'SNIPER', 1500, t.x, t.y);
      if (G.time - G.dropT < .14) trick(G, 'DOUBLE DROP', 800, t.x, t.y);
      G.dropT = G.time;
      if (t.bank.targets.every(q => q.down)) bankDone(G, t.bank);
      break;
    }
    case 'stand': {
      const t = obj;
      if (imp < 18) return;
      t.flash = 1;
      addScore(G, 150, t.x, t.y - 6, T.a3hi);
      if (!t.lit) { t.lit = true; addCombo(G); }
      sfx(G, 'stand');
      burst(G, t.x, t.y, 6, [T.a3hi, '#fff'], 80, 80, .4);
      if (G.time - b.activeFlipT < .75 && b.contacts <= 1) trick(G, 'SNIPER', 1500, t.x, t.y);
      if (t.bank.targets.every(q => q.lit)) bankDone(G, t.bank);
      break;
    }
    case 'post': if (imp > 60) { sfx(G, 'post'); burst(G, b.x - nx * b.r, b.y - ny * b.r, 3, ['#fff'], 50, 0, .2); } break;
    case 'rubber': if (imp > 60) { sfx(G, 'post'); addScore(G, 10); } break;
    case 'windmill': if (imp > 40) { sfx(G, 'post'); addScore(G, 50, b.x, b.y); addCombo(G); burst(G, b.x, b.y, 5, [T.metalHi, '#fff'], 80, 60, .3); } break;
    case 'bar': {
      const e = obj;
      if (imp > 40) {
        e.flash = 1;
        if (G.time > G.lockMsgT) {
          G.lockMsgT = G.time + 1.5;
          popup(G, b.x, b.y - 8, 'LOCKED', '#ff3b5c');
          if (e.req) popup(G, b.x, b.y + 2, reqLabel(B, e), '#ffd93b');
          sfx(G, 'locked');
        }
      }
      break;
    }
    case 'shield':
      if (imp > 40) { G.shieldFlash = 1; sfx(G, 'sling'); burst(G, b.x, b.y + 3, 8, ['#3bb0ff', '#fff'], 90, 50, .4); }
      break;
    case 'flipper': {
      const f = obj;
      b.touchT = G.time; b.touchSide = f.key;
      const active = Math.abs(f.omega) > 6;
      if (active && imp > 60) {
        f.flash = .15;
        if (b.y > 297 && imp > 120) trick(G, 'CLOSE CALL', 1000, b.x, b.y - 10);
        if (G.time - G.lastNudge < 1 && b.y > 275) trick(G, 'NUDGE SAVE', 800, b.x, b.y - 10);
        b.activeFlipT = G.time; b.contacts = 0;
      }
      if (b.lastFlipSide && b.lastFlipSide !== f.key && G.time - b.lastFlipT < 1.4 && b.minY > 236 && !active) trick(G, 'FLIPPER PASS', 800, b.x, b.y - 12);
      if (b.lastFlipSide !== f.key || G.time - b.lastFlipT > .3) b.minY = b.y;
      b.lastFlipSide = f.key; b.lastFlipT = G.time;
      b.fromCannon = 0;
      break;
    }
    default:
      if (imp > 90) sfx(G, 'wall', imp);
  }
}

function bankDone(G, bank) {
  const B = G.board, T = B.theme;
  B.stats.bank++;
  const p = addScore(G, bank.kind === 'drop' ? 1500 : 1000, null, null);
  banner(G, bank.kind === 'drop' ? 'DROPS CLEARED' : 'TARGETS LIT', '+' + fmtScore(p), T.a2hi, 2, 1.2);
  sfx(G, 'bank'); shake(G, 3);
  burst(G, bank.x, bank.y, 24, [T.a2hi, T.a3hi, '#fff', '#ffd93b'], 140);
  bank.clears++;
  bank.resetT = 1.4;
  if (Math.random() < .3 + .1 * save.upg.luck) spawnCapsule(G, bank.x - bank.fx * 16, bank.y - bank.fy * 16);
  armKick(G, !G.kick.L ? 'L' : 'R', 'BANK BONUS');
  checkExits(G);
}

function spawnCapsule(G, x, y) {
  x = clamp(x, 18, 162); y = clamp(y, 30, 205);
  G.board.pickups.push({ kind: 'item', x, y, item: ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)], t: 0, life: 15, taken: false });
  burst(G, x, y, 14, ['#fff', '#ff5bd1', '#7af2ff'], 90);
  popup(G, x, y - 10, 'ITEM!', '#ff5bd1');
}

function armKick(G, side, why) {
  const sides = side ? [side] : ['L', 'R'];
  const fresh = sides.filter(k => !G.kick[k]);
  if (!fresh.length) return;
  for (const k of fresh) { G.kick[k] = true; G.kick.flash[k] = 1.5; }
  banner(G, fresh.length === 2 ? 'KICKBACKS LIT' : (fresh[0] === 'L' ? 'LEFT' : 'RIGHT') + ' KICKBACK LIT', why || 'OUTLANE GUARDED', '#4cff7a', 2, 1.1);
  sfx(G, 'unlock');
}
function kickSensor(G, b) {
  if (b.y < 262 || b.y > 322 || b.vy < -100) return;
  const k = b.x < 22 ? 'L' : b.x > 158 ? 'R' : null;
  if (!k || !G.kick[k]) return;
  G.kick[k] = false; G.kick.flash[k] = 1;
  b.vy = -760 - Math.random() * 60; b.vx = k === 'L' ? 25 : -25;
  addScore(G, 500, b.x, b.y - 10, '#4cff7a', true);
  banner(G, 'KICKBACK!', 'SAVED BY THE OUTLANE', '#4cff7a', 2, 1);
  sfx(G, 'kick'); sfx(G, 'launch', .8); shake(G, 4); buzz(G, 40);
  burst(G, b.x, b.y, 16, ['#4cff7a', '#fff', '#ffd93b'], 120, 60, .5);
  G.hitstop = Math.max(G.hitstop, .05);
}

function splitBall(G, b, sp) {
  sp.cool = 18; sp.flash = 1;
  const sp0 = Math.max(260, Math.hypot(b.vx, b.vy));
  const a = Math.atan2(b.vy, b.vx);
  const c = mkBall(b.x, b.y);
  c.r = b.r;
  b.vx = Math.cos(a - .42) * sp0; b.vy = Math.sin(a - .42) * sp0;
  c.vx = Math.cos(a + .42) * sp0; c.vy = Math.sin(a + .42) * sp0;
  c.x += Math.cos(a + Math.PI / 2) * 4; c.y += Math.sin(a + Math.PI / 2) * 4;
  b.x -= Math.cos(a + Math.PI / 2) * 4; b.y -= Math.sin(a + Math.PI / 2) * 4;
  G.balls.push(c);
  G.ballSave = Math.max(G.ballSave, 5);
  const pts = addScore(G, 1000, sp.x, sp.y - 10, '#7af2ff', true);
  banner(G, 'SPLIT!', 'BALL X2 +' + fmtScore(pts), '#7af2ff', 2, 1);
  sfx(G, 'item'); sfx(G, 'kick'); shake(G, 3); buzz(G, 40);
  G.flash = .3; G.flashCol = '#7af2ff'; G.hitstop = Math.max(G.hitstop, .06);
  burst(G, sp.x, sp.y, 24, ['#7af2ff', '#fff', '#c45bff'], 130);
  addCombo(G);
}

function laneHit(G, b, i) {
  const B = G.board, l = B.lanes[i];
  l.flash = 1;
  addScore(G, 200, l.x, l.y + 8, B.theme.a3hi);
  sfx(G, 'lane');
  if (b.fromCannon > 0) {
    b.fromCannon = 0;
    if (i === G.skillLane) { trick(G, 'SKILL SHOT', 5000, l.x, l.y + 10); G.skillLane = -1; }
  }
  if (!l.lit) { l.lit = true; addCombo(G); }
  if (B.lanes.every(q => q.lit)) {
    B.stats.lanes++;
    G.mult = Math.min(6, G.mult + 1);
    const p = addScore(G, 2000, null, null);
    banner(G, `MULTIPLIER ${G.mult}X`, 'LANES +' + fmtScore(p), B.theme.a3hi, 2, 1.3);
    sfx(G, 'bank');
    for (const q of B.lanes) { q.lit = false; q.flash = 1.5; }
    armKick(G, null, 'LANES BONUS');
    checkExits(G);
  }
}
function rotateLanes(B, dir) {
  const L = B.lanes;
  if (L.length < 2) return;
  const s = L.map(l => l.lit);
  for (let i = 0; i < L.length; i++) L[i].lit = s[(i - dir + L.length) % L.length];
}

function enterRamp(G, b, rp) {
  b.mode = 'tube'; b.tube = rp; b.ts = 2; b.laps = 0;
  b.tv = Math.max(80, b.vx * rp.fx + b.vy * rp.fy);
  if (rp.kind === 'loop') b.tv = Math.max(b.tv, Math.hypot(b.vx, b.vy) * .9);
  if (!rp.G) rp.G = 300 * 300 * Math.PI / (2 * rp.L);
  rp.flash = 1;
  sfx(G, 'rampIn');
  addCombo(G);
  if (b.fromCannon > 0 && G.skillLane < 0) { trick(G, 'SKILL SHOT', 5000, b.x, b.y); }
  b.fromCannon = 0;
}
function updateTube(G, b, dt) {
  const rp = b.tube, B = G.board;
  if (rp.kind === 'loop') {
    const before = b.ts;
    b.tv -= 330 * dt;
    b.ts += b.tv * dt;
    if (before < rp.cEnd && b.ts >= rp.cEnd && b.laps < 3 && b.tv > 470) {
      b.ts -= rp.circ; b.laps++; b.tv *= .88;
      popup(G, rp.cx, rp.cy - rp.lr - 6, 'LAP ' + (b.laps + 1), '#fff');
      sfx(G, 'lane'); addCombo(G);
    }
  } else {
    b.tv -= rp.G * Math.cos(Math.PI * b.ts / rp.L) * dt;
    b.ts += b.tv * dt;
  }
  for (const c of B.coins) if (c.ramp === rp && !c.taken && Math.abs(c.s - b.ts) < 7) collectCoin(G, b, c);
  if (b.ts >= rp.L) {
    const p = pathAt(rp, rp.L);
    const v = clamp(b.tv * .85, 140, 420);
    b.x = p[0]; b.y = p[1]; b.vx = p[2] * v; b.vy = p[3] * v;
    b.mode = 'free'; b.tube = null; b.z = 0;
    rp.count++; B.stats.ramp++;
    const loop = rp.kind === 'loop';
    if (!G.kick[rp.side]) armKick(G, rp.side, loop ? 'LOOP BONUS' : 'RAMP BONUS');
    const laps = loop ? 1 + (b.laps || 0) : 0;
    const name = !loop ? 'RAMP!' : ['LOOP!', 'DOUBLE LOOP!', 'TRIPLE LOOP!', 'QUAD LOOP!'][laps - 1];
    const pts = addScore(G, loop ? 1000 * laps * laps : 1200, p[0], p[1] - 14, B.theme.rampHi, true);
    banner(G, name, '+' + fmtScore(pts), loop && laps > 1 ? '#ffd93b' : B.theme.rampHi, laps > 1 ? 3 : 2, laps > 1 ? 1.3 : .9);
    if (laps > 1) { G.tricksDone++; sfx(G, 'trick'); G.flash = .3; G.flashCol = '#fff6c0'; burst(G, rp.cx, rp.cy, 24, ['#ffd93b', '#fff', B.theme.rampHi], 140); }
    sfx(G, 'rampOut'); shake(G, 2 + laps);
    if (G.time - G.lastRamp < 6) trick(G, loop ? 'LOOP COMBO' : 'RAMP COMBO', 3000, p[0], p[1] - 20);
    G.lastRamp = G.time;
    rp.flash = 1;
    checkExits(G);
  } else if (b.ts <= 0) {
    b.x = rp.x - rp.fx * 3; b.y = rp.y - rp.fy * 3;
    const v = Math.max(60, Math.abs(b.tv));
    b.vx = -rp.fx * v; b.vy = -rp.fy * v;
    b.mode = 'free'; b.tube = null; b.z = 0;
    popup(G, b.x, b.y - 8, 'SO CLOSE', '#ff8a1f');
    sfx(G, 'rampFail');
  } else {
    const p = pathAt(rp, b.ts);
    b.x = p[0]; b.y = p[1];
    b.z = rp.kind === 'loop' ? clamp(Math.min(b.ts, rp.L - b.ts) / 10, 0, 1) * .7 : Math.sin(Math.PI * b.ts / rp.L);
    if (Math.random() < .5) b.trail.push([b.x, b.y]);
  }
}

function collectCoin(G, b, c) {
  c.taken = true; c.respawn = 40;
  G.coinsRun += c.val; if (!G.ai) save.coins += c.val;
  G.board.stats.coin += c.val;
  if (G.time - G.coinT < .7) G.coinStreak++; else G.coinStreak = 0;
  G.coinT = G.time;
  sfx(G, 'coin', G.coinStreak);
  popup(G, c.x, c.y - 6, '+' + c.val, '#ffd93b');
  burst(G, c.x, c.y, c.val > 1 ? 16 : 6, ['#ffd93b', '#fff', '#ff8a1f'], 70, 60, .4);
  addScore(G, 50 * c.val);
  checkExits(G);
}
function collectPickup(G, b, p) {
  p.taken = true;
  if (p.kind === 'fcoin') { collectCoin(G, b, { x: p.x, y: p.y, val: 1 }); return; }
  giveItem(G, p.item, p.x, p.y);
}

// ---- physics ------------------------------------------------------------------------
function contact(G, b, nx, ny, pen, svx, svy, e, kind, obj) {
  b.x += nx * pen; b.y += ny * pen;
  const rvx = b.vx - svx, rvy = b.vy - svy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return;
  const tx = -ny, ty = nx;
  const vt = rvx * tx + rvy * ty;
  const nvn = -vn < 22 ? 0 : -vn * e;
  const nvt = -vn > 60 ? vt * .97 : vt;
  b.vx = svx + nx * nvn + tx * nvt;
  b.vy = svy + ny * nvn + ty * nvt;
  onHit(G, b, kind, obj, -vn, nx, ny);
}

function segCollide(G, b, x1, y1, x2, y2, r, e, kind, obj) {
  const R = b.r + r;
  if (b.x < Math.min(x1, x2) - R || b.x > Math.max(x1, x2) + R || b.y < Math.min(y1, y2) - R || b.y > Math.max(y1, y2) + R) return;
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let t = l2 ? ((b.x - x1) * dx + (b.y - y1) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = x1 + dx * t, cy = y1 + dy * t;
  let nx = b.x - cx, ny = b.y - cy;
  const d2 = nx * nx + ny * ny;
  if (d2 >= R * R) return;
  let d = Math.sqrt(d2);
  if (d < 1e-4) { const l = Math.sqrt(l2) || 1; nx = -dy / l; ny = dx / l; d = 0; } else { nx /= d; ny /= d; }
  contact(G, b, nx, ny, R - d, 0, 0, e, kind, obj);
}

function capsuleCollide(G, b, px, py, ang, len, r0, r1, om, e, kind, obj) {
  const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
  const dx = ex - px, dy = ey - py, l2 = dx * dx + dy * dy;
  let t = ((b.x - px) * dx + (b.y - py) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = px + dx * t, cy = py + dy * t, rr = r0 + (r1 - r0) * t, R = b.r + rr;
  let nx = b.x - cx, ny = b.y - cy;
  const d2 = nx * nx + ny * ny;
  if (d2 >= R * R) return false;
  const d = Math.sqrt(d2) || 1e-4;
  nx /= d; ny /= d;
  const qx = cx + nx * rr - px, qy = cy + ny * rr - py;
  contact(G, b, nx, ny, R - d, -om * qy, om * qx, e, kind, obj);
  return true;
}

function physStep(G, h) {
  const B = G.board;
  G.ptime += h;
  for (const f of G.flips) {
    const tgt = f.pressed && !G.tilted ? f.up : f.rest;
    f.prev = f.ang;
    const mx = (f.pressed ? 30 : 17) * h;
    f.ang += clamp(tgt - f.ang, -mx, mx);
    f.omega = (f.ang - f.prev) / h;
  }
  for (const w of B.windmills) w.ang += w.w * h;
  for (const m of B.movers) {
    const c = m.circle, ph = m.ph + G.ptime * m.spd;
    const nx = m.cx + Math.sin(ph) * m.ax, ny = m.cy + Math.sin(ph) * m.ay;
    if (!m.init) { m.init = true; c.vx = c.vy = 0; } else { c.vx = (nx - c.x) / h; c.vy = (ny - c.y) / h; }
    c.x = nx; c.y = ny; m.x = nx; m.y = ny;
  }
  const grav = G.grav;
  for (const b of G.balls) {
    if (b.mode !== 'free') continue;
    b.px = b.x; b.py = b.y;
    b.vy += grav * h;
    b.x += b.vx * h; b.y += b.vy * h;
    for (const s of B.segs) if (s.on) segCollide(G, b, s.x1, s.y1, s.x2, s.y2, s.r, s.e, s.kind, s.ref || s);
    for (const c of B.circles) {
      const R = b.r + c.r, dx = b.x - c.x, dy = b.y - c.y, d2 = dx * dx + dy * dy;
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) || 1e-4;
      contact(G, b, dx / d, dy / d, R - d, c.vx, c.vy, c.e, c.kind, c.ref || c);
    }
    if (!(b.ghost > 0)) for (const f of G.flips) capsuleCollide(G, b, f.px, f.py, f.ang, f.len, f.r0, f.r1, f.omega, .28, 'flipper', f);
    for (const w of B.windmills) {
      capsuleCollide(G, b, w.x, w.y, w.ang, w.len, 2.5, 2.5, w.w, .5, 'windmill', w);
      capsuleCollide(G, b, w.x, w.y, w.ang + Math.PI, w.len, 2.5, 2.5, w.w, .5, 'windmill', w);
    }
    if (G.fx.shield > 0) segCollide(G, b, 10, 318, 170, 318, 2, .95, 'shield', null);
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
    sensors(G, b, h);
    if (b.mode === 'free') kickSensor(G, b);
  }
  // ball-ball
  const bs = G.balls;
  for (let i = 0; i < bs.length; i++) {
    const a = bs[i]; if (a.mode !== 'free') continue;
    for (let j = i + 1; j < bs.length; j++) {
      const c = bs[j]; if (c.mode !== 'free') continue;
      const dx = c.x - a.x, dy = c.y - a.y, R = a.r + c.r, d2 = dx * dx + dy * dy;
      if (d2 >= R * R || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = (R - d) / 2;
      a.x -= nx * pen; a.y -= ny * pen; c.x += nx * pen; c.y += ny * pen;
      const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
      if (rv < 0) { const j2 = -rv * .95; a.vx -= nx * j2; a.vy -= ny * j2; c.vx += nx * j2; c.vy += ny * j2; }
    }
  }
}

function sensors(G, b, h) {
  const B = G.board;
  for (let i = 0; i < B.lanes.length; i++) {
    const l = B.lanes[i];
    const inside = Math.abs(b.x - l.x) < 6 && Math.abs(b.y - l.y) < 6;
    if (inside && b.lane !== i) { b.lane = i; laneHit(G, b, i); }
    else if (!inside && b.lane === i) b.lane = -1;
  }
  for (const sp of B.spinners) {
    const s0 = (b.px - sp.x) * sp.fx + (b.py - sp.y) * sp.fy, s1 = (b.x - sp.x) * sp.fx + (b.y - sp.y) * sp.fy;
    if ((s0 < 0) !== (s1 < 0)) {
      const lat = (b.x - sp.x) * sp.tx + (b.y - sp.y) * sp.ty;
      if (Math.abs(lat) < 7) {
        const v = Math.abs(b.vx * sp.fx + b.vy * sp.fy);
        sp.rate = Math.min(30, (sp.rate || 0) + v / 38);
        if (v > 150) addCombo(G);
      }
    }
  }
  for (const rp of B.ramps) {
    const s0 = (b.px - rp.x) * rp.fx + (b.py - rp.y) * rp.fy, s1 = (b.x - rp.x) * rp.fx + (b.y - rp.y) * rp.fy;
    if (s0 < 0 && s1 >= 0) {
      const lat = (b.x - rp.x) * rp.tx + (b.y - rp.y) * rp.ty;
      if (Math.abs(lat) < rp.hw && b.r < 5.2) { enterRamp(G, b, rp); return; }
    }
  }
  for (const s of B.saucers) {
    if (s.cool <= 0 && !s.ball && Math.abs(b.x - s.x) < 4.5 && Math.abs(b.y - s.y) < 4.5 && Math.hypot(b.vx, b.vy) < 540) {
      b.mode = 'saucer'; b.x = s.x; b.y = s.y; b.vx = b.vy = 0;
      s.ball = b; s.hold = 1.1; s.flash = 1;
      B.stats.saucer++;
      armKick(G, !G.kick.L ? 'L' : 'R', 'SAUCER BONUS');
      addScore(G, 500, s.x, s.y - 10, B.theme.a3hi);
      addCombo(G);
      sfx(G, 'saucer'); shake(G, 2);
      if (b.fromCannon > 0) { trick(G, 'SKILL SHOT', 5000, s.x, s.y); b.fromCannon = 0; }
      checkExits(G);
      return;
    }
  }
  if (b.portalCool <= 0) {
    for (const e of B.exits) {
      if (!e.open) continue;
      if (e.type === 'hole') {
        const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy);
        if (d < 15) {
          const sp = Math.hypot(b.vx, b.vy);
          if (sp < 700) {
            const f = (1 - d / 15) * 1700 * h;
            b.vx += dx / (d || 1) * f; b.vy += dy / (d || 1) * f;
            b.vx *= 1 - 3 * h; b.vy *= 1 - 3 * h;
          }
          if (d < 4) { enterPortal(G, b, e); return; }
        }
      } else if (e.type === 'elev') {
        if (b.y < 27 && b.x > 83 && b.x < 97) { enterPortal(G, b, e); return; }
      } else if (e.type === 'doorL') {
        if (b.x < 11 && Math.abs(b.y - e.y) < 8) { enterPortal(G, b, e); return; }
      } else if (b.x > 169 && Math.abs(b.y - e.y) < 8) { enterPortal(G, b, e); return; }
    }
  }
  for (const sp of B.splitters) {
    if (sp.cool > 0 || Math.abs(b.x - sp.x) > 6 || Math.abs(b.y - sp.y) > 6) continue;
    const live = G.balls.filter(x => x.mode !== 'gone' && x.mode !== 'cannon').length;
    if (live >= 6) continue;
    splitBall(G, b, sp);
  }
  const rr = b.r + 3.2;
  for (const c of B.coins) {
    if (c.taken || c.ramp) continue;
    if (Math.abs(b.x - c.x) < rr && Math.abs(b.y - c.y) < rr) collectCoin(G, b, c);
  }
  for (const p of B.pickups) {
    if (p.taken) continue;
    if (Math.abs(b.x - p.x) < b.r + 5 && Math.abs(b.y - p.y) < b.r + 5) collectPickup(G, b, p);
  }
}

// ---- per-frame update ---------------------------------------------------------------
function updateFx(G, dt) {
  for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 1 - 1.5 * dt; p.life -= dt; }
  G.particles = G.particles.filter(p => p.life > 0);
  for (const p of G.popups) p.t += dt;
  G.popups = G.popups.filter(p => p.t < p.dur);
  if (G.banners.length) { const b = G.banners[0]; b.t += dt; if (b.t >= b.dur) G.banners.shift(); }
  G.shake = Math.max(0, G.shake - dt * 22);
  G.sx = Math.round((Math.random() * 2 - 1) * G.shake); G.sy = Math.round((Math.random() * 2 - 1) * G.shake);
  G.flash = Math.max(0, G.flash - dt * 3);
  G.combo.punch = Math.max(0, G.combo.punch - dt * 6);
  G.dispScore += (G.score - G.dispScore) * Math.min(1, dt * 9);
  if (G.score - G.dispScore < 1) G.dispScore = G.score;
}

function update(G, dt) {
  G.rt += dt;
  updateFx(G, dt);
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  const ts = G.fx.slow > 0 ? .5 : 1;
  const sdt = dt * ts;
  G.time += sdt;
  if (G.trans) { updateTrans(G, dt); return; }
  const B = G.board;
  if (G.ai) aiThink(G, sdt);

  for (const k in G.fx) if (G.fx[k] > 0) { G.fx[k] -= dt; if (G.fx[k] <= 0) { G.fx[k] = 0; if (!G.ai) popup(G, 90, 200, ITEM_INFO[k] ? ITEM_INFO[k].name + ' OVER' : '', '#aaa'); } }
  G.ballSave = Math.max(0, G.ballSave - sdt);
  G.tilt = Math.max(0, G.tilt - dt * .35);
  G.nudgeCool -= dt;
  G.shieldFlash = Math.max(0, (G.shieldFlash || 0) - dt * 4);
  if (G.combo.t > 0) { G.combo.t -= sdt; if (G.combo.t <= 0) endCombo(G); }
  for (const f of G.flips) f.flash = Math.max(0, f.flash - dt);

  // cannon
  const c = G.cannon;
  c.recoil = Math.max(0, c.recoil - dt * 4);
  if (c.active && c.ball) {
    if (!c.charging) { c.t += dt; c.ang = Math.sin(c.t * 2.1) * .55; }
    else { c.charge = Math.min(1, c.charge + dt / .8); sfx(G, 'charge', c.charge); }
    c.ball.x = CANNON.x; c.ball.y = CANNON.y;
  }
  if (G.multiQ > 0) {
    G.multiT -= dt;
    if (G.multiT <= 0) {
      G.multiQ--; G.multiT = .35;
      const b = mkBall(CANNON.x, CANNON.y - 2);
      const a = (Math.random() - .5) * .8, s = 650 + Math.random() * 200;
      b.vx = Math.sin(a) * s; b.vy = -Math.cos(a) * s; b.ghost = .3;
      G.balls.push(b);
      sfx(G, 'launch', .6); shake(G, 3); c.recoil = 1;
      burst(G, CANNON.x, CANNON.y - 4, 10, ['#ddd', '#fff'], 80, -30, .4);
    }
  }

  // physics
  const h = sdt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS && !G.trans; i++) physStep(G, h);
  if (G.trans) return;

  // balls: tubes, timers, trail, cradle, stuck
  for (const b of G.balls) {
    b.portalCool = Math.max(0, b.portalCool - sdt);
    if (b.ghost > 0) b.ghost -= sdt;
    b.fromCannon = Math.max(0, b.fromCannon - sdt);
    const targetR = G.fx.giant > 0 ? 5.5 : 4;
    b.r += (targetR - b.r) * Math.min(1, dt * 6);
    if (b.hop) { b.hop -= sdt; b.z = Math.max(0, b.hop / .35); if (b.hop <= 0) { b.hop = 0; b.z = 0; } }
    if (b.mode === 'tube') updateTube(G, b, sdt);
    if (b.mode !== 'free') { if (b.mode !== 'tube') b.trail.length = 0; continue; }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 260 || G.fx.fire > 0) b.trail.push([b.x, b.y]);
    else if (b.trail.length) b.trail.shift();
    if (b.trail.length > (G.fx.fire > 0 ? 10 : 6)) b.trail.shift();
    if (G.fx.fire > 0 && Math.random() < .6) G.particles.push({ x: b.x + (Math.random() - .5) * 4, y: b.y + (Math.random() - .5) * 4, vx: (Math.random() - .5) * 20, vy: -20 - Math.random() * 30, g: -20, life: .35, max: .35, col: Math.random() < .5 ? '#ff8a1f' : '#ffd93b', size: 1 });
    if (b.y < b.minY) b.minY = b.y;
    if (sp > 900 && !G.ai) trickOnce(G, 'SPEED DEMON', 1000, b, 12);
    // cradle
    const fl = G.flips.find(f => f.key === b.touchSide);
    if (fl && fl.pressed && G.time - b.touchT < .06 && sp < 45) {
      b.cradleT += sdt;
      if (b.cradleT > .8 && !b.cradled) { b.cradled = true; trick(G, 'CRADLE', 300, b.x, b.y - 10); }
    } else if (G.time - b.touchT > .3) { b.cradleT = 0; b.cradled = false; }
    // stuck ball search
    if (sp < 8 && !(fl && G.time - b.touchT < .1)) {
      b.stillT += sdt;
      if (b.stillT > 2.2) { b.stillT = 0; b.vy = -260; b.vx = (Math.random() - .5) * 200; popup(G, b.x, b.y - 8, 'BALL SEARCH', '#aaa'); }
    } else b.stillT = 0;
    if (b.y > BH - 2) { b.mode = 'gone'; onDrain(G, b); }
  }
  G.balls = G.balls.filter(b => b.mode !== 'gone');

  // board elements
  for (const bm of B.bumpers) { bm.flash = Math.max(0, bm.flash - dt * 5); bm.squash = Math.max(0, bm.squash - dt * 9); bm.cool -= sdt; }
  for (const m of B.movers) { m.flash = Math.max(0, (m.flash || 0) - dt * 5); m.squash = Math.max(0, (m.squash || 0) - dt * 9); m.cool = (m.cool || 0) - sdt; }
  for (const s of B.slings) { s.flash = Math.max(0, s.flash - dt * 6); s.cool = (s.cool || 0) - sdt; }
  for (const k of ['L', 'R']) G.kick.flash[k] = Math.max(0, G.kick.flash[k] - dt);
  for (const sp of B.splitters) { if (sp.cool > 0) { sp.cool -= sdt; if (sp.cool <= 0) { sp.flash = 1; if (!G.ai) popup(G, sp.x, sp.y - 10, 'SPLIT READY', '#7af2ff'); } } sp.flash = Math.max(0, sp.flash - dt * 2); }
  for (const l of B.lanes) l.flash = Math.max(0, l.flash - dt * 2);
  for (const rp of B.ramps) rp.flash = Math.max(0, rp.flash - dt * 2);
  for (const e of B.exits) { e.flash = Math.max(0, (e.flash || 0) - dt * 3); e.anim += dt; }
  for (const bk of B.banks) {
    for (const t of bk.targets) { t.flash = Math.max(0, t.flash - dt * 4); t.anim = Math.max(0, t.anim - dt * 4); }
    if (bk.resetT > 0) {
      bk.resetT -= sdt;
      if (bk.resetT <= 0) {
        for (const t of bk.targets) { if (t.down) { t.down = false; t.seg.on = true; t.anim = 1; } t.lit = false; }
        sfx(G, 'stand');
      }
    }
  }
  for (const sp of B.spinners) {
    if (sp.rate > .05) {
      const before = Math.floor(sp.ang / Math.PI);
      sp.ang += sp.rate * Math.PI * 2 * sdt;
      sp.rate *= Math.exp(-1.4 * sdt);
      const n = Math.floor(sp.ang / Math.PI) - before;
      for (let k = 0; k < n; k++) { B.stats.spin++; addScore(G, 40); sfx(G, 'spinner'); }
      if (n) { checkExits(G); if (Math.random() < .3) popup(G, sp.x, sp.y - 8, '+' + fmtShort(40 * G.mult * depthMult(G)), B.theme.a3hi); }
    } else sp.rate = 0;
  }
  for (const s of B.saucers) {
    s.flash = Math.max(0, s.flash - dt * 2); s.cool -= sdt;
    if (s.ball) {
      s.hold -= sdt;
      if (Math.random() < .4) burst(G, s.x, s.y, 1, [B.theme.a3hi, '#fff'], 40, 0, .3);
      if (s.hold <= 0) {
        const b = s.ball;
        const tx = 90 + (Math.random() - .5) * 90, ty = 250;
        const d = dist(s.x, s.y, tx, ty) || 1;
        b.vx = (tx - s.x) / d * 280; b.vy = (ty - s.y) / d * 280;
        b.mode = 'free'; b.x += b.vx / 280 * 2; b.y += b.vy / 280 * 2;
        s.ball = null; s.cool = .9;
        sfx(G, 'kick'); shake(G, 2.5);
        burst(G, s.x, s.y, 12, ['#fff', B.theme.a3hi], 100);
        if (Math.random() < .4 + .08 * save.upg.luck) giveItem(G, ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)], s.x, s.y);
        else { G.coinsRun += 3; if (!G.ai) save.coins += 3; popup(G, s.x, s.y - 12, '+3 COINS', '#ffd93b'); sfx(G, 'coin', 6); }
      }
    }
  }
  // coins: respawn + magnet
  for (const cn of B.coins) {
    if (cn.ox == null) { cn.ox = cn.x; cn.oy = cn.y; }
    if (cn.taken) { cn.respawn -= sdt; if (cn.respawn <= 0) { cn.taken = false; cn.x = cn.ox; cn.y = cn.oy; } continue; }
    if (G.fx.magnet > 0 && !cn.ramp) {
      let best = null, bd = 70;
      for (const b of G.balls) if (b.mode === 'free') { const d = dist(b.x, b.y, cn.x, cn.y); if (d < bd) { bd = d; best = b; } }
      if (best) { const k = 160 * sdt / (bd || 1); cn.x += (best.x - cn.x) * Math.min(1, k); cn.y += (best.y - cn.y) * Math.min(1, k); }
    }
  }
  for (const p of B.pickups) {
    p.t += dt;
    if (p.kind === 'fcoin') {
      p.y += p.vy * sdt; p.x += Math.sin(p.t * 3 + p.vy) * 10 * sdt;
      p.life -= sdt;
      if (p.y > 290 || p.life <= 0) p.taken = true;
      if (G.fx.magnet > 0) for (const b of G.balls) if (b.mode === 'free' && dist(b.x, b.y, p.x, p.y) < 60) { p.x += (b.x - p.x) * .08; p.y += (b.y - p.y) * .08; }
    } else if (p.life != null) { p.life -= sdt; if (p.life <= 0) p.taken = true; }
  }
  B.pickups = B.pickups.filter(p => !p.taken || p.static);

  if (G.pendingCannon > 0) { G.pendingCannon -= dt; if (G.pendingCannon <= 0) toCannon(G, true); }
  if (G.pendingOver > 0) { G.pendingOver -= dt; if (G.pendingOver <= 0) gameOver(G); }
}

function trickOnce(G, name, pts, b, cd) {
  const k = 'once_' + name;
  if ((G.cool[k] || 0) > G.time) return;
  G.cool[k] = G.time + cd;
  trick(G, name, pts, b.x, b.y);
}

function onDrain(G, b) {
  const others = G.balls.filter(x => x !== b && x.mode !== 'gone' && x.mode !== 'cannon').length;
  const T = G.board.theme;
  burst(G, b.x, BH - 6, 12, ['#ff3b5c', '#fff'], 90, 60, .5);
  if (G.ballSave > 0) {
    if (G.ballSave < 3) G.ballSave = 0;
    banner(G, 'BALL SAVED', '', '#4cff7a', 2, 1);
    sfx(G, 'saved'); buzz(G, 30);
    if (!G.cannon.active && others === 0) toCannon(G, false);
    else { G.multiQ++; G.multiT = .4; }
    return;
  }
  if (others > 0 || G.multiQ > 0) { popup(G, b.x, BH - 20, 'BALL LOST', '#ff3b5c'); sfx(G, 'locked'); return; }
  if (G.cannon.active) return;
  endCombo(G);
  G.mult = 1; G.tilted = false; G.tilt = 0; G.warned = false;
  for (const k in G.fx) G.fx[k] = 0;
  if (G.ai) { G.pendingCannon = .8; return; }
  G.ballsLeft--;
  sfx(G, 'drain'); shake(G, 6); buzz(G, 120);
  G.flash = .5; G.flashCol = '#ff3b5c';
  if (G.ballsLeft > 0) { banner(G, 'BALL LOST', G.ballsLeft + (G.ballsLeft > 1 ? ' BALLS LEFT' : ' BALL LEFT'), '#ff3b5c', 2, 1.4); G.pendingCannon = 1.4; }
  else { banner(G, 'GAME OVER', '', '#ff3b5c', 3, 1.8); G.pendingOver = 1.9; }
  void T;
}

function nudge(G) {
  if (G.nudgeCool > 0 || G.trans) return;
  G.nudgeCool = .45; G.lastNudge = G.time;
  for (const b of G.balls) if (b.mode === 'free') { b.vy -= 150; b.vx += (Math.random() - .5) * 90; }
  shake(G, 6); sfx(G, 'nudge'); buzz(G, 35);
  G.tilt += 1;
  if (G.tilt > 3.2 && !G.tilted) { G.tilted = true; banner(G, 'TILT!', 'FLIPPERS DEAD', '#ff3b5c', 3, 1.8); sfx(G, 'tilt'); G.flash = .6; G.flashCol = '#ff3b5c'; endCombo(G); }
  else if (G.tilt > 2.2 && !G.warned) { G.warned = true; banner(G, 'WARNING', 'EASY ON THE NUDGE', '#ff8a1f', 2, 1); }
  if (G.tilt < 1.5) G.warned = false;
}

function aiThink(G, dt) {
  for (const k of ['L', 'R']) { G.aiHold[k] -= dt; G.aiCool[k] -= dt; }
  for (const b of G.balls) {
    if (b.mode !== 'free' || b.y < 262 || b.y > 302 || b.vy < -40) continue;
    const k = b.x < 90 ? 'L' : 'R';
    if (Math.hypot(b.vx, b.vy) < 30 && G.aiHold[k] > 0) {   // cradled: let go, shoot once it rolls
      G.aiRest[k] += dt;
      if (G.aiRest[k] > .5) { G.aiHold[k] = 0; G.aiCool[k] = .3; G.aiRest[k] = 0; }
    } else if (G.aiCool[k] <= 0 && G.aiHold[k] <= 0) G.aiHold[k] = .16 + Math.random() * .08;
    else if (G.aiHold[k] > 0) G.aiHold[k] = Math.max(G.aiHold[k], .05);
  }
  G.flips[0].pressed = G.aiHold.L > 0; G.flips[1].pressed = G.aiHold.R > 0;
  if (G.cannon.active) { G.aiT += dt; if (G.aiT > 1.2) fireCannon(G, .5 + Math.random() * .5); }
}

function setFlipper(G, key, down) {
  const f = G.flips[key === 'L' ? 0 : 1];
  if (f.pressed === down) return;
  f.pressed = down;
  if (G.tilted) return;
  if (down) { sfx(G, 'flip'); rotateLanes(G.board, key === 'L' ? -1 : 1); buzz(G, 8); }
  else sfx(G, 'flipDown');
}

// ---- modes ---------------------------------------------------------------------
let mode = 'title';
let G = null;
let attract = newGame(true);
let UI = [];
let overInfo = null;

function startGame() {
  Sfx.init();
  G = newGame(false);
  mode = 'play';
  save.games++; persist();
  banner(G, G.board.name, 'HOLD TO AIM, RELEASE TO FIRE', G.board.theme.a3hi, 2, 1.6);
}
function gameOver(G) {
  const newBest = G.score > save.best;
  if (newBest) save.best = G.score;
  if (G.deepest > save.deepest) save.deepest = G.deepest;
  save.tricks += G.tricksDone;
  persist();
  overInfo = { newBest, t: 0 };
  mode = 'over';
  Sfx.stopMusic();
  Sfx.gameover();
}
function continueCost() { return 30 * (G.continues + 1); }
function doContinue() {
  const cost = continueCost();
  if (save.coins < cost) return;
  save.coins -= cost; persist();
  G.continues++;
  G.ballsLeft = 1;
  mode = 'play';
  toCannon(G, true);
  banner(G, 'CONTINUE!', 'ONE MORE BALL', '#4cff7a', 2, 1.4);
  Sfx.buy();
  if (save.music) Sfx.startMusic(G.board.music.seed, G.board.music.tempo, G.board.music.minor);
}
function pauseGame() { if (mode === 'play') { mode = 'pause'; Sfx.stopMusic(); persist(); for (const f of G.flips) f.pressed = false; pointers.clear(); } }
function resumeGame() { mode = 'play'; if (save.music) Sfx.startMusic(G.board.music.seed, G.board.music.tempo, G.board.music.minor); }

// ---- rendering --------------------------------------------------------------------
function ellipse(c, x, y, rx, ry, n = 14) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); }
  pxPoly(c, pts);
}
function lockIcon(c, x, y, col) {
  c.fillStyle = '#000'; c.fillRect(x - 3, y - 1, 7, 6); c.fillRect(x - 2, y - 4, 5, 4);
  c.fillStyle = col; c.fillRect(x - 2, y, 5, 4); c.fillRect(x - 1, y - 3, 1, 3); c.fillRect(x + 1, y - 3, 1, 3); c.fillRect(x - 1, y - 3, 3, 1);
  c.fillStyle = '#000'; c.fillRect(x, y + 1, 1, 2);
}

function drawBoardDynamic(G, B, live) {
  const T = B.theme, t = G.rt;
  // inserts in front of ramps
  for (const rp of B.ramps) {
    for (let k = 0; k < 3; k++) {
      const d = 10 + k * 7;
      const x = rp.x - rp.fx * d, y = rp.y - rp.fy * d;
      const on = rp.flash > 0 || ((t * 4 - k) % 3 + 3) % 3 < 1;
      g.fillStyle = T.out;
      pxPoly(g, [[x + rp.fx * 3.5, y + rp.fy * 3.5], [x - rp.fx * 1.5 + rp.tx * 3.5, y - rp.fy * 1.5 + rp.ty * 3.5], [x - rp.fx * 1.5 - rp.tx * 3.5, y - rp.fy * 1.5 - rp.ty * 3.5]]);
      g.fillStyle = on ? T.rampHi : T.rampLo;
      pxPoly(g, [[x + rp.fx * 2.4, y + rp.fy * 2.4], [x - rp.fx * 1 + rp.tx * 2.4, y - rp.fy * 1 + rp.ty * 2.4], [x - rp.fx * 1 - rp.tx * 2.4, y - rp.fy * 1 - rp.ty * 2.4]]);
    }
  }
  // lanes
  B.lanes.forEach((l, i) => {
    const skill = live && i === G.skillLane && G.cannon.active;
    const on = l.lit || (l.flash > 0 && Math.floor(t * 12) % 2 === 0) || (skill && Math.floor(t * 6) % 2 === 0);
    if (on) {
      g.fillStyle = skill && !l.lit ? '#fff' : T.a3hi;
      pxPoly(g, [[l.x, l.y - 4], [l.x + 3, l.y], [l.x, l.y + 4], [l.x - 3, l.y]]);
      g.fillStyle = 'rgba(255,255,255,.18)'; pxCircle(g, l.x, l.y, 7);
    }
  });
  // exits
  for (const e of B.exits) drawExit(G, B, e);
  // saucers
  for (const s of B.saucers) {
    if (s.flash > 0 || s.ball) { g.fillStyle = `rgba(255,255,255,${.25 + .25 * Math.sin(t * 20)})`; pxRing(g, s.x, s.y, 8 + s.flash * 3, 1); }
  }
  // targets
  for (const bk of B.banks) for (const t2 of bk.targets) {
    if (t2.down) continue;
    const k = 1 - t2.anim;
    const x0 = t2.x - t2.tx * 4 * k, y0 = t2.y - t2.ty * 4 * k, x1 = t2.x + t2.tx * 4 * k, y1 = t2.y + t2.ty * 4 * k;
    g.fillStyle = T.out; pxCapsule(g, x0, y0, x1, y1, 2.8);
    const col = bk.kind === 'drop' ? (t2.flash > 0 ? '#fff' : T.a2) : (t2.lit ? T.a3hi : (t2.flash > 0 ? '#fff' : T.a2lo));
    g.fillStyle = col; pxCapsule(g, x0, y0, x1, y1, 1.9);
    g.fillStyle = bk.kind === 'drop' ? T.a2hi : (t2.lit ? '#fff' : T.a2);
    pxLine(g, x0 - t2.fx * .8, y0 - t2.fy * .8, x1 - t2.fx * .8, y1 - t2.fy * .8);
    if (bk.kind === 'stand' && t2.lit) { g.fillStyle = 'rgba(255,255,255,.2)'; pxCircle(g, t2.x, t2.y, 6); }
  }
  // spinners
  for (const sp of B.spinners) {
    const w = Math.abs(Math.cos(sp.ang)) * 2.6 + .5;
    const q = (a, b) => [sp.x + sp.tx * a + sp.fx * b, sp.y + sp.ty * a + sp.fy * b];
    g.fillStyle = T.out; pxPoly(g, [q(-7, -w - 1), q(7, -w - 1), q(7, w + 1), q(-7, w + 1)]);
    g.fillStyle = Math.floor(sp.ang / Math.PI) % 2 ? T.a3 : T.metalHi;
    pxPoly(g, [q(-6, -w), q(6, -w), q(6, w), q(-6, w)]);
    g.fillStyle = T.metalLo; pxLine(g, ...q(-6, 0), ...q(6, 0));
  }
  // slings flash
  for (const s of B.slings) if (s.flash > 0) {
    g.fillStyle = '#fff'; pxCapsule(g, s.kick[0][0], s.kick[0][1], s.kick[1][0], s.kick[1][1], 1.8);
    g.fillStyle = `rgba(255,255,255,${s.flash * .3})`; pxPoly(g, s.pts);
  }
  // bumpers & movers
  for (const bm of B.bumpers) drawBumper(T, bm, T.a1, T.a1hi, T.a1lo);
  for (const m of B.movers) {
    if (m.x == null) { m.x = m.cx; m.y = m.cy; }
    g.fillStyle = T.shadow; pxCircle(g, m.x + 2, m.y + 3, m.r + 1);
    g.fillStyle = T.a3lo;
    if (m.ax) g.fillRect(Math.round(m.cx - m.ax), Math.round(m.cy), Math.round(m.ax * 2), 1);
    else g.fillRect(Math.round(m.cx), Math.round(m.cy - m.ay), 1, Math.round(m.ay * 2));
    drawBumper(T, m, T.a3, T.a3hi, T.a3lo);
  }
  // windmills
  for (const w of B.windmills) {
    const c = Math.cos(w.ang) * w.len, s = Math.sin(w.ang) * w.len;
    g.fillStyle = T.shadow; pxCapsule(g, w.x - c + 2, w.y - s + 3, w.x + c + 2, w.y + s + 3, 2.6);
    g.fillStyle = T.out; pxCapsule(g, w.x - c, w.y - s, w.x + c, w.y + s, 3.4);
    g.fillStyle = T.a2; pxCapsule(g, w.x - c, w.y - s, w.x + c, w.y + s, 2.4);
    g.fillStyle = T.a2hi; pxLine(g, w.x - c * .9, w.y - s * .9 - 1, w.x + c * .9, w.y + s * .9 - 1);
    celBall(g, w.x, w.y, 2.4, T.metal, T.metalLo, T.metalHi, T.out);
  }
  // split pads
  for (const sp of B.splitters) {
    const ready = sp.cool <= 0;
    const hex = (r, o = 0) => { const P = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + o; P.push([sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r]); } return P; };
    if (ready) { g.fillStyle = `rgba(122,242,255,${.15 + .12 * Math.sin(t * 6)})`; pxPoly(g, hex(10 + Math.sin(t * 6), t)); }
    g.fillStyle = T.out; pxPoly(g, hex(7.5));
    g.fillStyle = ready ? (sp.flash > 0 && Math.floor(t * 12) % 2 ? '#fff' : '#1f5a78') : '#241a30'; pxPoly(g, hex(6.5));
    if (ready) { g.fillStyle = '#7af2ff'; pxPoly(g, hex(4.5, t * 2)); }
    else {
      const k = 1 - sp.cool / 18;
      g.fillStyle = '#3a6a88';
      for (let i = 0; i < 12; i++) if (i / 12 < k) { const a = -Math.PI / 2 + i / 12 * Math.PI * 2; g.fillRect(Math.round(sp.x + Math.cos(a) * 5), Math.round(sp.y + Math.sin(a) * 5), 1, 1); }
    }
    drawText(g, 'X2', sp.x + 1, sp.y - 2, ready ? '#120a1c' : '#5a4a68', 1, 'c', null);
  }
  // coins
  for (const cn of B.coins) if (!cn.taken && !cn.ramp) drawCoin(cn, t);
  // pickups
  for (const p of B.pickups) {
    if (p.taken) continue;
    if (p.kind === 'fcoin') { drawCoin({ x: p.x, y: p.y, val: 1, ph: p.vy }, t); continue; }
    if (p.life != null && p.life < 3 && Math.floor(t * 10) % 2) continue;
    const y = p.y + Math.sin(p.t * 3) * 1.5;
    const hue = (t * 200) % 360;
    g.fillStyle = hsl(hue, 90, 70, .25); pxCircle(g, p.x, y, 8 + Math.sin(t * 6));
    g.fillStyle = '#120a1c'; pxCircle(g, p.x, y, 6);
    g.fillStyle = hsl(hue, 85, 55); pxCircle(g, p.x, y, 5);
    g.fillStyle = hsl(hue, 90, 78); pxCircle(g, p.x - 1.5, y - 1.5, 2);
    drawText(g, '?', p.x + 1, y - 2, '#fff', 1, 'c', '#120a1c');
    if (Math.random() < .08) G.particles.push({ x: p.x + (Math.random() - .5) * 12, y: y + (Math.random() - .5) * 12, vx: 0, vy: -10, g: 0, life: .4, max: .4, col: '#fff', size: 1 });
  }
  // flippers
  for (const f of G.flips) drawFlipper(T, f);
  // shield
  if (live && G.fx.shield > 0 && (G.fx.shield > 3 || Math.floor(t * 8) % 2)) {
    g.fillStyle = 'rgba(59,176,255,.35)'; g.fillRect(10, 316, 160, 5);
    g.fillStyle = G.shieldFlash > 0 ? '#fff' : '#7af2ff'; g.fillRect(10, 318, 160, 1);
    for (let x = 10 + (t * 40 % 8); x < 170; x += 8) { g.fillStyle = '#fff'; g.fillRect(Math.round(x), 317, 1, 3); }
  }
  // cannon
  drawCannon(G, T, live);
  // kickback lights in the outlanes
  if (live) for (const k of ['L', 'R']) {
    const x = k === 'L' ? 15 : 165, on = G.kick[k], fl = G.kick.flash[k];
    const blink = fl > 0 && Math.floor(t * 12) % 2;
    for (let i = 0; i < 3; i++) {
      const y = 296 - i * 8 - (on ? Math.round((t * 16) % 8) : 0);
      g.fillStyle = T.out; pxPoly(g, [[x, y - 4], [x + 4, y + 1], [x - 4, y + 1]]);
      g.fillStyle = on ? (blink ? '#fff' : (i === 0 ? '#4cff7a' : '#2a9a4a')) : '#2a2030';
      pxPoly(g, [[x, y - 3], [x + 3, y], [x - 3, y]]);
    }
    if (on) { g.fillStyle = `rgba(76,255,122,${.25 + .15 * Math.sin(t * 6)})`; g.fillRect(x - 5, 306, 11, 3); g.fillStyle = '#4cff7a'; g.fillRect(x - 5, 307, 11, 1); }
  }
  // ball save light
  if (live && G.ballSave > 0 && (G.ballSave > 2 || Math.floor(t * 8) % 2)) drawText(g, 'SAVE', 90, 328, '#4cff7a', 1, 'c', T.out);
}

function drawCoin(cn, t) {
  const big = cn.val > 1;
  const ry = big ? 4.5 : 3.2;
  const w = Math.abs(Math.cos(t * 4 + cn.ph));
  const rx = Math.max(.8, ry * w);
  g.fillStyle = 'rgba(0,0,0,.3)'; ellipse(g, cn.x + 2, cn.y + 3, rx + .5, ry);
  g.fillStyle = '#3a1d00'; ellipse(g, cn.x, cn.y, rx + 1, ry + 1);
  g.fillStyle = '#e88a10'; ellipse(g, cn.x, cn.y, rx, ry);
  if (rx > 1.5) { g.fillStyle = '#ffd93b'; ellipse(g, cn.x - .4, cn.y - .4, rx - 1, ry - 1); }
  g.fillStyle = '#fff8c0';
  if (rx > 2) g.fillRect(Math.round(cn.x - rx * .4), Math.round(cn.y - ry * .5), 1, 2);
  if (big && Math.random() < .05) g.fillRect(Math.round(cn.x + (Math.random() - .5) * 10), Math.round(cn.y + (Math.random() - .5) * 10), 1, 1);
}

function drawBumper(T, b, a, ahi, alo) {
  const s = 1 + (b.squash || 0) * .22, r = b.r * s;
  const fl = b.flash || 0;
  if (fl > 0) { g.fillStyle = `rgba(255,255,255,${fl * .35})`; pxCircle(g, b.x, b.y, r + 3 + (1 - fl) * 5); }
  g.fillStyle = T.out; pxCircle(g, b.x, b.y, r + 1.5);
  g.fillStyle = alo; pxCircle(g, b.x, b.y, r + .5);
  g.fillStyle = T.metalHi;
  for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; g.fillRect(Math.round(b.x + Math.cos(an) * (r - .2) - .5), Math.round(b.y + Math.sin(an) * (r - .2) - .5), 1, 1); }
  g.fillStyle = fl > .4 ? '#fff' : a; pxCircle(g, b.x - .4, b.y - 1, r - 2);
  g.fillStyle = fl > .4 ? a : ahi; pxCircle(g, b.x - .4, b.y - 1, (r - 2) * .55);
  g.fillStyle = '#fff'; pxCircle(g, b.x - r * .35, b.y - r * .45, Math.max(.8, r * .14));
}

function drawFlipper(T, f) {
  const ex = f.px + Math.cos(f.ang) * f.len, ey = f.py + Math.sin(f.ang) * f.len;
  g.fillStyle = T.shadow; pxCapsule(g, f.px + 2, f.py + 3, ex + 2, ey + 3, f.r0, f.r1);
  g.fillStyle = T.out; pxCapsule(g, f.px, f.py, ex, ey, f.r0 + 1, f.r1 + 1);
  g.fillStyle = T.a1; pxCapsule(g, f.px, f.py, ex, ey, f.r0, f.r1);
  g.fillStyle = f.flash > 0 ? '#fff' : T.rubber; pxCapsule(g, f.px, f.py - .7, ex, ey - .7, f.r0 - 1.5, Math.max(.6, f.r1 - 1.3));
  celBall(g, f.px, f.py, 1.6, T.metal, T.metalLo, T.metalHi, T.out);
}

function drawCannon(G, T, live) {
  const c = G.cannon;
  const a = live && c.active ? c.ang : 0;
  const rec = c.recoil * 3;
  const px = CANNON.x, py = CANNON.y + 14;
  const L = 13 - rec;
  const ex = px + Math.sin(a) * L, ey = py - Math.cos(a) * L;
  g.fillStyle = T.out; pxCapsule(g, px, py, ex, ey, 5.2, 4.4);
  g.fillStyle = T.metalLo; pxCapsule(g, px, py, ex, ey, 4.2, 3.4);
  g.fillStyle = T.metal; pxCapsule(g, px - .8, py, ex - .8, ey, 2.6, 2);
  g.fillStyle = T.metalHi; pxLine(g, px - 2, py - 1, ex - 2, ey);
  g.fillStyle = T.a1; pxCapsule(g, px + Math.sin(a) * 5 - Math.cos(a) * 4.5, py - Math.cos(a) * 5 - Math.sin(a) * 4.5, px + Math.sin(a) * 5 + Math.cos(a) * 4.5, py - Math.cos(a) * 5 + Math.sin(a) * 4.5, 1);
  celBall(g, px, py + 3, 5, T.frameHi, T.frameLo, T.wallHi, T.out);
  if (!live || !c.active || !c.ball) return;
  // aim preview
  const spd = 560 + 380 * c.charge;
  let x = CANNON.x, y = CANNON.y, vx = Math.sin(a) * spd, vy = -Math.cos(a) * spd;
  for (let i = 0; i < 16; i++) {
    for (let k = 0; k < 3; k++) { vy += G.grav * .012; x += vx * .012; y += vy * .012; }
    if (y < 10 || x < 10 || x > 170) break;
    if ((i + Math.floor(G.rt * 10)) % 3 === 0) continue;
    g.fillStyle = i < 10 ? '#fff' : 'rgba(255,255,255,.5)';
    g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  // charge meter
  const mh = 22, mx = 112, my = 300;
  g.fillStyle = T.out; g.fillRect(mx - 1, my - mh - 1, 5, mh + 2);
  g.fillStyle = '#1a1020'; g.fillRect(mx, my - mh, 3, mh);
  const fh = Math.round(mh * c.charge);
  g.fillStyle = c.charge > .85 ? (Math.floor(G.rt * 16) % 2 ? '#fff' : '#ff3b5c') : c.charge > .5 ? '#ff8a1f' : '#ffd93b';
  g.fillRect(mx, my - fh, 3, fh);
  if (c.hint && !c.charging && Math.floor(G.rt * 2) % 2 === 0) drawText(g, 'HOLD', 90, 268, '#fff', 1, 'c', T.out);
}

function drawExit(G, B, e) {
  const T = B.theme, t = G.rt;
  const pulse = (Math.sin(t * 5) + 1) / 2;
  if (e.type === 'hole') {
    if (e.open) {
      g.fillStyle = `rgba(255,255,255,${.12 + pulse * .12})`; pxRing(g, e.x, e.y, 13 + pulse * 2, 2);
      for (let i = 0; i < 16; i++) {
        const a = t * 5 + i * .8, r = 7.5 * ((i % 8) / 8 + .1);
        g.fillStyle = i % 2 ? T.a3hi : T.a2;
        g.fillRect(Math.round(e.x + Math.cos(a) * r), Math.round(e.y + Math.sin(a) * r), 1, 1);
      }
      g.fillStyle = T.a3hi;
      const ay = e.y + 13 + Math.round(pulse * 2);
      pxPoly(g, [[e.x - 3, ay], [e.x + 3, ay], [e.x, ay + 3]]);
    } else {
      g.fillStyle = T.metalLo;
      for (let k = -1; k <= 1; k++) { g.fillRect(Math.round(e.x - 7), Math.round(e.y + k * 3), 15, 1); }
      g.fillStyle = T.metalHi;
      for (let k = -1; k <= 1; k++) { g.fillRect(Math.round(e.x - 6), Math.round(e.y + k * 3 - 1), 13, 1); }
      lockIcon(g, Math.round(e.x), Math.round(e.y + 1), e.flash > 0 ? '#fff' : '#ffd93b');
      drawText(g, reqLabel(B, e), e.x, e.y + 14, '#ffd93b', 1, 'c', T.out);
    }
  } else if (e.type === 'elev') {
    if (e.open) {
      for (let k = 0; k < 4; k++) {
        const y = 38 - ((t * 30 + k * 8) % 30);
        g.fillStyle = k % 2 ? T.a3hi : '#fff';
        pxPoly(g, [[90, y - 3], [94, y + 1], [86, y + 1]]);
      }
      g.fillStyle = `rgba(255,255,255,${.1 + pulse * .1})`; g.fillRect(84, 8, 12, 33);
      drawText(g, 'UP', 90, 44, T.a3hi, 1, 'c', T.out);
    } else {
      g.fillStyle = T.out; pxCapsule(g, 82, 40, 98, 40, 3);
      g.fillStyle = e.flash > 0 ? '#fff' : '#ffd93b'; pxCapsule(g, 82, 40, 98, 40, 2);
      g.fillStyle = '#8a5a00'; for (let x = 84; x < 98; x += 3) g.fillRect(x, 40, 1, 1);
      lockIcon(g, 90, 33, '#ffd93b');
      drawText(g, reqLabel(B, e), 90, 45, '#ffd93b', 1, 'c', T.out);
    }
  } else {
    const L = e.type === 'doorL';
    const x = L ? 8 : 172;
    if (e.open) {
      g.fillStyle = `rgba(255,255,255,${.1 + pulse * .15})`; g.fillRect(L ? 0 : 172, e.y - 9, 8, 18);
      for (let k = 0; k < 2; k++) {
        const o = ((t * 14 + k * 5) % 10);
        const ax = L ? x + 4 - o : x - 4 + o;
        g.fillStyle = k ? T.a3hi : '#fff';
        if (L) pxPoly(g, [[ax - 3, e.y], [ax, e.y - 3], [ax, e.y + 3]]);
        else pxPoly(g, [[ax + 3, e.y], [ax, e.y - 3], [ax, e.y + 3]]);
      }
    } else {
      g.fillStyle = T.out; pxCapsule(g, x, e.y - 9, x, e.y + 9, 3);
      g.fillStyle = e.flash > 0 ? '#fff' : '#ffd93b'; pxCapsule(g, x, e.y - 9, x, e.y + 9, 2);
      lockIcon(g, L ? x + 9 : x - 9, e.y - 11, '#ffd93b');
      drawText(g, reqLabel(B, e), L ? 15 : 165, e.y - 2, '#ffd93b', 1, L ? 'l' : 'r', T.out);
    }
  }
}

function drawBall(G, b) {
  const z = b.z || 0;
  const r = b.r * (1 + z * .35) * b.scale;
  if (r < .4) return;
  const fire = G.fx.fire > 0;
  g.fillStyle = 'rgba(0,0,0,.35)'; pxCircle(g, b.x + 2 + z * 4, b.y + 3 + z * 6, r * .95);
  const n = b.trail.length;
  for (let i = 0; i < n; i++) {
    const [tx, ty] = b.trail[i];
    const k = (i + 1) / (n + 1);
    g.fillStyle = fire ? (i % 2 ? `rgba(255,138,31,${k * .8})` : `rgba(255,217,59,${k * .7})`) : `rgba(220,235,255,${k * .35})`;
    pxCircle(g, tx, ty, r * (.35 + .55 * k));
  }
  if (fire) celBall(g, b.x, b.y, r, '#ffb03b', '#e2541b', '#fff6a0', '#3a0a00');
  else if (G.fx.giant > 0) celBall(g, b.x, b.y, r, '#d8e0f0', '#7080a0', '#ffffff', '#10121a');
  else celBall(g, b.x, b.y, r, '#c4ccd8', '#666f84', '#ffffff', '#10121a');
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(Math.round(b.x + r * .3), Math.round(b.y + r * .25), 1, 1);
}

function drawBoard(G, B, ox, oy, live) {
  g.save();
  g.translate(ox, oy);
  g.drawImage(B.cv, 0, 0);
  drawBoardDynamic(G, B, live);
  if (live) {
    for (const b of G.balls) if (b.mode !== 'tube' && !(b.mode === 'free' && b.z > .05) && b.mode !== 'gone') drawBall(G, b);
  }
  g.drawImage(B.over, 0, 0);
  for (const rp of B.ramps) if (rp.flash > 0 && Math.floor(G.rt * 14) % 2 === 0) {
    g.fillStyle = 'rgba(255,255,255,.25)';
    for (let k = 0; k < rp.pts.length; k += 4) g.fillRect(Math.round(rp.pts[k][0]) - 1, Math.round(rp.pts[k][1]) - 1, 2, 2);
  }
  for (const cn of B.coins) if (!cn.taken && cn.ramp) drawCoin(cn, G.rt);
  if (live) {
    for (const b of G.balls) if (b.mode === 'tube' || (b.mode === 'free' && b.z > .05)) drawBall(G, b);
    for (const p of G.particles) {
      g.fillStyle = p.col;
      g.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1);
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;
    for (const p of G.popups) {
      const k = p.t / p.dur;
      const y = p.y - k * 16 - (k < .15 ? (1 - k / .15) * -4 : 0);
      if (k > .75 && Math.floor(p.t * 20) % 2) continue;
      drawText(g, p.text, p.x, y, p.col, 1, 'c', '#000');
    }
  }
  g.restore();
}

function drawBackdrop(T) {
  g.fillStyle = T.frameLo; g.fillRect(0, 0, VW, VH);
  g.fillStyle = dither(g, T.frameLo, T.out);
  for (let y = 0; y < VH; y += 8) g.fillRect(0, y, VW, 3);
}

function renderGame(G, hud) {
  const B = G.board, T = B.theme;
  drawBackdrop(T);
  const ox = BX + G.sx, oy = BY + G.sy;
  const tr = G.trans;
  if (tr && tr.phase === 'slide') {
    const k = ease(Math.min(1, tr.t / .62));
    const sw = W + 12, sh = BH + 12;
    const dx = Math.round(tr.dx * sw * k), dy = Math.round(tr.dy * sh * k);
    drawBoard(G, tr.from, ox - dx, oy - dy, false);
    drawBoard(G, tr.to, ox - dx + tr.dx * sw, oy - dy + tr.dy * sh, false);
  } else drawBoard(G, B, ox, oy, true);
  if (G.fx.slow > 0) {
    g.fillStyle = 'rgba(122,242,255,.07)'; g.fillRect(BX, BY, W, BH);
    g.fillStyle = 'rgba(122,242,255,.25)';
    for (let y = (G.rt * 30) % 4; y < BH; y += 4) g.fillRect(BX, BY + Math.round(y), W, 1);
    g.fillStyle = 'rgba(0,0,0,0)';
  }
  if (hud) {
    drawEffects(G);
    drawHUD(G);
    drawBottom(G);
    drawBanners(G);
  }
  if (G.flash > 0) { g.globalAlpha = G.flash * .5; g.fillStyle = G.flashCol; g.fillRect(0, 0, VW, VH); g.globalAlpha = 1; }
}

function drawEffects(G) {
  let y = BY + 4;
  const x = BX + 3;
  for (const k of ['fire', 'giant', 'magnet', 'slow', 'shield']) {
    const v = G.fx[k];
    if (v <= 0) continue;
    const max = { fire: 12, giant: 14, magnet: 15, slow: 9, shield: 25 }[k];
    if (v < 2.5 && Math.floor(G.rt * 8) % 2) { y += 12; continue; }
    g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, 10, 13);
    g.drawImage(iconCanvas(k, 1), x, y);
    g.fillStyle = '#333'; g.fillRect(x, y + 9, 8, 2);
    g.fillStyle = ITEM_INFO[k].col; g.fillRect(x, y + 9, Math.ceil(8 * v / max), 2);
    y += 14;
  }
}

function barTop() { return BY + 332; }
function hudButtons() {
  const R = Math.min(VW - 3, BX + W - 2);
  const y = TOP + 4, by = barTop() + 4, cx = Math.floor(VW / 2);
  return {
    pause: { x: R - 15, y, w: 15, h: 18 },
    slots: [{ x: cx - 61, y: by, w: 58, h: 22 }, { x: cx + 3, y: by, w: 58, h: 22 }],
  };
}
const ITEM_SHORT = { multi: 'MULTI', magnet: 'MAGNET', giant: 'GIANT', slow: 'SLOW-MO', shield: 'SHIELD', fire: 'FIRE', coinrain: 'COINS', saver: 'GUARD' };

function drawHUD(G) {
  const T = G.board.theme;
  const y0 = TOP;
  g.fillStyle = '#0b0712'; g.fillRect(0, 0, VW, y0 + HUDH);
  g.fillStyle = T.a1lo; g.fillRect(0, y0 + HUDH - 2, VW, 1);
  g.fillStyle = '#000'; g.fillRect(0, y0 + HUDH - 1, VW, 1);
  const L = Math.max(3, BX + 3);
  drawText(g, fmtScore(G.dispScore), L, y0 + 4, '#fff', 2, 'l', '#000');
  let x = L;
  x += drawText(g, '$' + save.coins, x, y0 + 18, '#ffd93b', 1, 'l', '#000') + 4;
  x += drawText(g, '~'.repeat(Math.min(5, Math.max(0, G.ballsLeft))) + (G.ballsLeft > 5 ? '+' : ''), x, y0 + 18, '#c4ccd8', 1, 'l', '#000') + 4;
  if (G.mult > 1) x += drawText(g, G.mult + 'X', x, y0 + 18, T.a3hi, 1, 'l', '#000') + 4;
  if (G.tilt > 1.5) drawText(g, 'TILT', x, y0 + 18, Math.floor(G.rt * 8) % 2 ? '#ff3b5c' : '#fff', 1, 'l', '#000');
  // combo
  const c = G.combo;
  const hb = hudButtons();
  if (c.n >= 2) {
    const cx = Math.round((x + hb.pause.x) / 2) + 4;
    const sc = c.punch > .5 ? 2 : 1;
    const near = c.n >= G.nextEB - 5;
    const col = near && Math.floor(G.rt * 8) % 2 ? '#4cff7a' : comboCol(c.n);
    drawText(g, near ? `BALL AT ${G.nextEB}` : 'COMBO', cx, y0 + 4, col, 1, 'c', '#000');
    drawText(g, c.n + (comboMult(G) > 1 ? ' X' + comboMult(G) : ''), cx, y0 + 11 - (sc - 1) * 3, '#fff', sc, 'c', '#000');
    const bw = 30;
    g.fillStyle = '#222'; g.fillRect(cx - bw / 2, y0 + 23, bw, 2);
    g.fillStyle = col; g.fillRect(cx - bw / 2, y0 + 23, Math.round(bw * clamp(c.t / 2.2, 0, 1)), 2);
  }
  const p = hb.pause;
  g.fillStyle = '#000'; g.fillRect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
  g.fillStyle = '#140c1c'; g.fillRect(p.x, p.y, p.w, p.h);
  g.fillStyle = '#fff'; g.fillRect(p.x + 4, p.y + 5, 2, 8); g.fillRect(p.x + 9, p.y + 5, 2, 8);
}

function drawItemBar(G) {
  const T = G.board.theme, y0 = barTop();
  g.fillStyle = '#0b0712'; g.fillRect(0, y0, VW, VH - y0);
  g.fillStyle = '#000'; g.fillRect(0, y0, VW, 1);
  g.fillStyle = T.a1lo; g.fillRect(0, y0 + 1, VW, 1);
  hudButtons().slots.forEach((s, i) => {
    const it = G.items[i];
    const ready = it && Math.floor(G.rt * 2 + i) % 2 === 0;
    g.fillStyle = '#000'; g.fillRect(s.x - 1, s.y - 1, s.w + 2, s.h + 3);
    g.fillStyle = it ? '#2a1838' : '#140c1c'; g.fillRect(s.x, s.y, s.w, s.h);
    g.fillStyle = it ? ITEM_INFO[it].col : '#3a2a48'; g.fillRect(s.x, s.y, s.w, 1);
    if (it && ready) { g.fillStyle = ITEM_INFO[it].col; g.fillRect(s.x, s.y + s.h - 1, s.w, 1); }
    if (it) {
      const bob = Math.round(Math.sin(G.rt * 4 + i) * .7);
      g.drawImage(iconCanvas(it, 2), s.x + 3, s.y + 3 + bob);
      drawText(g, ITEM_SHORT[it], s.x + 22, s.y + 6, '#fff', 1, 'l', '#000');
      drawText(g, 'TAP', s.x + 22, s.y + 13, ITEM_INFO[it].col, 1, 'l', null);
    } else drawText(g, 'EMPTY', s.x + s.w / 2, s.y + 9, '#3a2a48', 1, 'c', null);
  });
}

function drawBottom(G) {
  drawItemBar(G);
  const top = barTop() + BARH;
  const space = VH - BOT - top;
  if (space < 26) return;
  const cy = top + Math.floor(space / 2);
  drawMap(G, Math.floor(VW / 2), cy, 7, 5, Math.min(2, Math.floor((space - 6) / 18)));
}

function drawMap(G, cx, cy, cell, rx, ry) {
  const gap = 3, step = cell + gap;
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
    const gx = G.board.gx + dx, gy = G.board.gy + dy;
    const k = gx + ',' + gy;
    const info = G.mapInfo.get(k);
    const x = Math.round(cx + dx * step - cell / 2), y = Math.round(cy + dy * step - cell / 2);
    if (info) {
      g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, cell + 2, cell + 2);
      g.fillStyle = info.col; g.fillRect(x, y, cell, cell);
      g.fillStyle = info.bg; g.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      g.fillStyle = '#fff';
      const m = Math.floor(cell / 2);
      if (info.ex.down) g.fillRect(x + m, y + cell + 1, 1, gap - 1);
      if (info.ex.right) g.fillRect(x + cell + 1, y + m, gap - 1, 1);
      if (dx === 0 && dy === 0) {
        if (Math.floor(G.rt * 4) % 2) { g.fillStyle = '#fff'; g.fillRect(x - 1, y - 1, cell + 2, 1); g.fillRect(x - 1, y + cell, cell + 2, 1); g.fillRect(x - 1, y, 1, cell); g.fillRect(x + cell, y, 1, cell); }
        g.fillStyle = '#fff'; g.fillRect(x + m - 1, y + m - 1, 2, 2);
      }
    } else {
      // unexplored but reachable from a visited neighbour?
      const ex = boardExits(G.seed, gx, gy);
      const nb = (ex.up && G.mapInfo.has(gx + ',' + (gy - 1))) || (ex.down && G.mapInfo.has(gx + ',' + (gy + 1))) ||
        (ex.left && G.mapInfo.has((gx - 1) + ',' + gy)) || (ex.right && G.mapInfo.has((gx + 1) + ',' + gy));
      if (nb) {
        g.fillStyle = '#2a2034'; g.fillRect(x, y, cell, cell);
        g.fillStyle = '#4a3a58'; g.fillRect(x + Math.floor(cell / 2), y + Math.floor(cell / 2), 1, 1);
      }
    }
  }
}

function drawBanners(G) {
  const b = G.banners[0];
  if (!b) return;
  const k = b.t / b.dur;
  const cy = BY + 128;
  const sc = b.t < .08 ? b.size + 2 : b.t < .14 ? b.size + 1 : b.size;
  const th = 5 * sc;
  let bandH = th + (b.sub ? 14 : 10);
  if (k > .85) bandH = Math.round(bandH * (1 - (k - .85) / .15));
  if (b.t < .1) bandH = Math.round(bandH * b.t / .1);
  if (bandH <= 0) return;
  const y = Math.round(cy - bandH / 2);
  g.fillStyle = 'rgba(8,4,16,.78)'; g.fillRect(0, y, VW, bandH);
  g.fillStyle = b.col; g.fillRect(0, y, VW, 1); g.fillRect(0, y + bandH - 1, VW, 1);
  const stripeX = Math.round((G.rt * 60) % 12);
  g.fillStyle = 'rgba(255,255,255,.06)';
  for (let x = -12 + stripeX; x < VW; x += 12) g.fillRect(x, y + 1, 4, bandH - 2);
  if (bandH < th + 4) return;
  const slide = b.t < .14 ? Math.round((1 - b.t / .14) * 30) : 0;
  const wob = Math.round(Math.sin(b.t * 30) * (b.t < .3 ? 1 : 0));
  drawText(g, b.text, VW / 2 - slide, y + 4 + wob, b.col, sc, 'c', '#000');
  if (b.sub) drawText(g, b.sub, VW / 2 + slide, y + 6 + th, '#fff', 1, 'c', '#000');
}

// ---- menus ---------------------------------------------------------------------
function button(label, x, y, w, h, act, col = '#ffd93b', enabled = true) {
  UI.push({ x, y, w, h, act: enabled ? act : null });
  const pressed = pressUI && pressUI.x === x && pressUI.y === y;
  const oy = pressed ? 1 : 0;
  g.fillStyle = '#000'; g.fillRect(x - 1, y - 1 + 2, w + 2, h + 2);
  g.fillStyle = '#000'; g.fillRect(x - 1, y - 1 + oy, w + 2, h + 2);
  g.fillStyle = enabled ? col : '#555'; g.fillRect(x, y + oy, w, h);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y + oy, w, 1);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + oy + h - 2, w, 2);
  drawText(g, label, x + w / 2, y + oy + Math.floor((h - 5) / 2), enabled ? '#120a1c' : '#999', 1, 'c', null);
}
function panel(x, y, w, h, col = '#7af2ff') {
  g.fillStyle = '#000'; g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle = '#140c1c'; g.fillRect(x, y, w, h);
  g.fillStyle = col; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
  g.fillStyle = dither(g, 'rgba(0,0,0,0)', 'rgba(255,255,255,.03)'); g.fillRect(x + 1, y + 1, w - 2, h - 2);
}

function drawLogo(cx, y, t) {
  const word = 'PINFINITY';
  const sc = 4;
  const total = textWidth(word, sc);
  let x = Math.round(cx - total / 2);
  [...word].forEach((ch, i) => {
    const w = textWidth(ch, sc);
    const dy = Math.round(Math.sin(t * 3 + i * .6) * 2);
    const hue = (i * 32 + t * 60) % 360;
    drawText(g, ch, x, y + dy + 2, hsl(hue, 80, 25), sc, 'l', null);
    drawText(g, ch, x, y + dy, hsl(hue, 90, 62), sc, 'l', '#000');
    x += w + sc;
  });
}

function renderTitle() {
  renderGame(attract, false);
  g.fillStyle = 'rgba(8,4,16,.55)'; g.fillRect(0, 0, VW, VH);
  const cx = Math.floor(VW / 2);
  const t = performance.now() / 1000;
  const y = TOP + 40;
  drawLogo(cx, y, t);
  drawText(g, 'AN ENDLESS PINBALL WORLD', cx, y + 28, '#7af2ff', 1, 'c', '#000');
  panel(cx - 70, y + 44, 140, 44, '#ffd93b');
  drawText(g, 'BEST', cx - 62, y + 51, '#aaa', 1, 'l', null);
  drawText(g, fmtScore(save.best), cx + 62, y + 51, '#fff', 1, 'r', null);
  drawText(g, 'COINS', cx - 62, y + 61, '#aaa', 1, 'l', null);
  drawText(g, '$' + save.coins, cx + 62, y + 61, '#ffd93b', 1, 'r', null);
  drawText(g, 'DEEPEST', cx - 62, y + 71, '#aaa', 1, 'l', null);
  drawText(g, String(save.deepest), cx + 62, y + 71, '#7af2ff', 1, 'r', null);
  const by = y + 104;
  button('PLAY', cx - 50, by, 100, 20, startGame, '#4cff7a');
  button('SHOP', cx - 50, by + 28, 100, 16, () => { mode = 'shop'; Sfx.init(); Sfx.ui(); }, '#ffd93b');
  button(save.sfx ? 'SOUND ON' : 'SOUND OFF', cx - 50, by + 50, 48, 14, () => { save.sfx = !save.sfx; Sfx.setSfx(save.sfx); persist(); Sfx.init(); Sfx.ui(); }, '#7af2ff');
  button(save.music ? 'MUSIC ON' : 'MUSIC OFF', cx + 2, by + 50, 48, 14, () => { save.music = !save.music; Sfx.setMusic(save.music); persist(); }, '#7af2ff');
  const hy = VH - BOT - 40;
  const lines = ['TAP LEFT / RIGHT HALF TO FLIP', 'SWIPE UP TO NUDGE', 'OPEN DOORS, ELEVATORS & HOLES', 'TO TRAVEL THE INFINITE CABINET'];
  lines.forEach((l, i) => drawText(g, l, cx, hy + i * 8, i < 2 ? '#fff' : '#ffd93b', 1, 'c', '#000'));
}

function renderShop() {
  renderGame(attract, false);
  g.fillStyle = 'rgba(8,4,16,.75)'; g.fillRect(0, 0, VW, VH);
  const cx = Math.floor(VW / 2);
  let y = TOP + 18;
  drawText(g, 'SHOP', cx, y, '#ffd93b', 3, 'c', '#000');
  drawText(g, '$' + save.coins, cx, y + 20, '#ffd93b', 2, 'c', '#000');
  y += 40;
  for (const u of UPGRADES) {
    const lvl = save.upg[u.k], max = u.costs.length, cost = u.costs[lvl];
    panel(cx - 80, y, 160, 38, lvl >= max ? '#4cff7a' : '#7af2ff');
    drawText(g, u.name, cx - 74, y + 6, '#fff', 1, 'l', null);
    drawText(g, u.desc, cx - 74, y + 14, '#aaa', 1, 'l', null);
    for (let i = 0; i < max; i++) { g.fillStyle = i < lvl ? '#4cff7a' : '#333'; g.fillRect(cx - 74 + i * 8, y + 25, 6, 5); }
    if (lvl < max) button('$' + cost, cx + 28, y + 20, 46, 14, () => { if (save.coins >= cost) { save.coins -= cost; save.upg[u.k]++; persist(); Sfx.buy(); } else Sfx.locked(); }, '#ffd93b', save.coins >= cost);
    else drawText(g, 'MAX', cx + 51, y + 24, '#4cff7a', 1, 'c', null);
    y += 44;
  }
  button('BACK', cx - 40, y + 6, 80, 18, () => { mode = 'title'; Sfx.ui(); }, '#7af2ff');
}

function renderPause() {
  renderGame(G, true);
  g.fillStyle = 'rgba(8,4,16,.78)'; g.fillRect(0, 0, VW, VH);
  const cx = Math.floor(VW / 2);
  let y = TOP + 34;
  drawText(g, 'PAUSED', cx, y, '#fff', 3, 'c', '#000');
  drawText(g, G.board.name, cx, y + 22, G.board.theme.a3hi, 1, 'c', '#000');
  drawText(g, `BOARD ${G.board.gx},${G.board.gy}  ·  ${G.boardsSeen} FOUND`.replace('·', '-'), cx, y + 31, '#aaa', 1, 'c', '#000');
  panel(cx - 82, y + 42, 164, 100, '#7af2ff');
  drawMap(G, cx, y + 92, 9, 6, 3);
  y += 152;
  button('RESUME', cx - 50, y, 100, 20, () => { resumeGame(); Sfx.ui(); }, '#4cff7a');
  button(save.sfx ? 'SOUND ON' : 'SOUND OFF', cx - 50, y + 28, 48, 14, () => { save.sfx = !save.sfx; Sfx.setSfx(save.sfx); persist(); Sfx.ui(); }, '#7af2ff');
  button(save.music ? 'MUSIC ON' : 'MUSIC OFF', cx + 2, y + 28, 48, 14, () => { save.music = !save.music; Sfx.setMusic(save.music); persist(); }, '#7af2ff');
  button(save.haptics ? 'BUZZ ON' : 'BUZZ OFF', cx - 50, y + 48, 48, 14, () => { save.haptics = !save.haptics; persist(); Sfx.ui(); }, '#7af2ff');
  button('QUIT', cx + 2, y + 48, 48, 14, () => { persist(); mode = 'title'; G = null; Sfx.stopMusic(); Sfx.ui(); }, '#ff3b5c');
}

function renderOver() {
  renderGame(G, false);
  g.fillStyle = 'rgba(8,4,16,.8)'; g.fillRect(0, 0, VW, VH);
  const cx = Math.floor(VW / 2);
  overInfo.t += 1 / 60;
  let y = TOP + 30;
  drawText(g, 'GAME', cx, y, '#ff3b5c', 4, 'c', '#000');
  drawText(g, 'OVER', cx, y + 24, '#ff3b5c', 4, 'c', '#000');
  y += 56;
  drawText(g, fmtScore(G.score), cx, y, '#fff', 2, 'c', '#000');
  if (overInfo.newBest && Math.floor(G.rt * 4) % 2) drawText(g, 'NEW BEST!', cx, y + 14, '#ffd93b', 1, 'c', '#000');
  y += 26;
  panel(cx - 72, y, 144, 62, '#7af2ff');
  const rows = [['BOARDS FOUND', G.boardsSeen], ['DEEPEST', G.deepest], ['BEST COMBO', G.combo.best], ['TRICKS', G.tricksDone], ['COINS', '+' + G.coinsRun]];
  rows.forEach(([a, b], i) => { drawText(g, a, cx - 64, y + 6 + i * 10, '#aaa', 1, 'l', null); drawText(g, String(b), cx + 64, y + 6 + i * 10, i === 4 ? '#ffd93b' : '#fff', 1, 'r', null); });
  y += 72;
  const cost = continueCost();
  button(`CONTINUE $${cost}`, cx - 60, y, 120, 18, doContinue, '#4cff7a', save.coins >= cost);
  drawText(g, `YOU HAVE $${save.coins}`, cx, y + 22, '#ffd93b', 1, 'c', '#000');
  button('PLAY AGAIN', cx - 60, y + 34, 120, 18, () => { startGame(); }, '#ffd93b');
  button('MENU', cx - 60, y + 58, 120, 14, () => { mode = 'title'; G = null; Sfx.ui(); }, '#7af2ff');
}

function render() {
  UI = [];
  g.imageSmoothingEnabled = false;
  if (mode === 'title') renderTitle();
  else if (mode === 'shop') renderShop();
  else if (mode === 'play') renderGame(G, true);
  else if (mode === 'pause') renderPause();
  else if (mode === 'over') renderOver();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lo, 0, 0, Math.round(VW * SC * DPR), Math.round(VH * SC * DPR));
}

// ---- input ---------------------------------------------------------------------
const pointers = new Map();
let pressUI = null;
const toInt = e => [e.clientX / SC, e.clientY / SC];
const inRect = (x, y, r) => x >= r.x - 2 && x <= r.x + r.w + 2 && y >= r.y - 2 && y <= r.y + r.h + 2;

function updateFlippersFromPointers() {
  let L = keys.L, R = keys.R;
  for (const p of pointers.values()) { if (p.side === 'L') L = true; if (p.side === 'R') R = true; }
  setFlipper(G, 'L', L); setFlipper(G, 'R', R);
}

cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  Sfx.init();
  const [x, y] = toInt(e);
  if (mode !== 'play') {
    pressUI = UI.find(u => inRect(x, y, u)) || null;
    return;
  }
  if (y < TOP + HUDH + 2) {
    const hb = hudButtons();
    if (inRect(x, y, hb.pause)) { pauseGame(); Sfx.ui(); return; }
    return;
  }
  if (y >= barTop()) {
    const hb = hudButtons();
    for (let i = 0; i < 2; i++) if (inRect(x, y, hb.slots[i])) { useItem(G, i); return; }
    return;
  }
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  const launching = G.cannon.active && !G.balls.some(b => b.mode === 'free' || b.mode === 'tube' || b.mode === 'saucer');
  const side = launching ? 'launch' : x < VW / 2 ? 'L' : 'R';
  pointers.set(e.pointerId, { side, x0: e.clientX, y0: e.clientY, t0: performance.now(), nudged: false });
  updateFlippersFromPointers();
  if (launching && !G.cannon.charging) { G.cannon.charging = true; G.cannon.charge = 0; }
}, { passive: false });

cv.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (!p || mode !== 'play' || p.side === 'launch') return;
  if (!p.nudged && p.y0 - e.clientY > 38 && performance.now() - p.t0 < 300) { p.nudged = true; nudge(G); }
});

function endPointer(e) {
  const [x, y] = toInt(e);
  if (mode !== 'play') {
    const u = UI.find(q => inRect(x, y, q));
    if (u && pressUI && u.x === pressUI.x && u.y === pressUI.y && u.act) u.act();
    pressUI = null;
    return;
  }
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  updateFlippersFromPointers();
  if (G.cannon.active && G.cannon.charging && ![...pointers.values()].some(p => p.side === 'launch') && !keys.space) fireCannon(G);
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); if (mode === 'play') updateFlippersFromPointers(); });
cv.addEventListener('contextmenu', e => e.preventDefault());

const keys = { L: false, R: false, space: false };
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  Sfx.init();
  const k = e.key.toLowerCase();
  if (mode === 'title' && (k === 'enter' || k === ' ')) { startGame(); return; }
  if (mode === 'over' && k === 'enter') { startGame(); return; }
  if (k === 'escape' || k === 'p') { if (mode === 'play') pauseGame(); else if (mode === 'pause') resumeGame(); return; }
  if (mode !== 'play') return;
  if (k === 'arrowleft' || k === 'z' || k === 'shift' && e.location === 1) { keys.L = true; updateFlippersFromPointers(); }
  else if (k === 'arrowright' || k === 'm' || k === '/' || k === 'shift' && e.location === 2) { keys.R = true; updateFlippersFromPointers(); }
  else if (k === ' ') { keys.space = true; if (G.cannon.active && !G.cannon.charging) { G.cannon.charging = true; G.cannon.charge = 0; } else if (!G.cannon.active) nudge(G); }
  else if (k === 'arrowup' || k === 'n') nudge(G);
  else if (k === '1') useItem(G, 0);
  else if (k === '2') useItem(G, 1);
  e.preventDefault();
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (mode !== 'play') { keys.L = keys.R = keys.space = false; return; }
  if (k === 'arrowleft' || k === 'z' || (k === 'shift' && e.location === 1)) { keys.L = false; updateFlippersFromPointers(); }
  else if (k === 'arrowright' || k === 'm' || k === '/' || (k === 'shift' && e.location === 2)) { keys.R = false; updateFlippersFromPointers(); }
  else if (k === ' ') { keys.space = false; if (G.cannon.active && G.cannon.charging && pointers.size === 0) fireCannon(G); }
});

document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode === 'play') pauseGame(); persist(); Sfx.stopMusic(); } });
setInterval(() => { if (mode === 'play') persist(); }, 10000);

// ---- loop ------------------------------------------------------------------------
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - lastT) / 1000);
  lastT = now;
  if (mode === 'title' || mode === 'shop') update(attract, dt);
  else if (mode === 'play') update(G, dt);
  else if (mode === 'over' || mode === 'pause') { G.rt += dt; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__pin = { get G() { return G; }, get attract() { return attract; }, startGame, newGame, genBoard };
