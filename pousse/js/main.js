// Glue: input, the game rules (economy, bonuses, prizes) and the frame loop.
import { THREE, renderer, scene, camera, canvas, resize, toScreen, screenToPlaneY } from './gfx.js?v=1';
import { S, save, maxStock, regenEvery, dropCooldown, xpNeed, offlineRegen } from './state.js?v=1';
import { C, KINDS, bodies, pusher, gate, initPhysics, spawnCoin, spawnPrize, step, quake, snapshot, fillBoard, setGutter, setBonusWalls, gutterZ } from './world.js?v=1';
import { syncBodies, setupMachine, updateBulbs, lights, aim, flashRing, showBonusWalls, layoutRails } from './machine.js?v=1';
import { buildPrize, hullPoints, pickPrize, PRIZES, RARITY, thumb } from './prizes.js?v=1';
import { RL, update as updateRoulette, MAX_SPINS } from './roulette.js?v=1';
import * as FX from './fx.js?v=1';
import * as UI from './ui.js?v=1';
import * as A from './audio.js?v=1';

const STEP = 1 / 60;
let T = 0, wallsT = 0;
const timers = [];
const later = (s, fn) => timers.push({ at: T + s, fn });

// ---------- spawning ----------
const eul = new THREE.Euler(), quat = new THREE.Quaternion();
const qFrom = (x, y, z) => { quat.setFromEuler(eul.set(x, y, z)); return { x: quat.x, y: quat.y, z: quat.z, w: quat.w }; };
const rnd = (a, b) => a + Math.random() * (b - a);

function makePrize(id, x, y, z, q, ccd = true) {
  const g = buildPrize(id);
  scene.add(g);
  const o = spawnPrize(id, hullPoints(id, g), x, y, z, q, ccd);
  o.mesh = g;
  return o;
}

function rollKind() {
  const r = Math.random();
  const star = 0.03 + 0.025 * S.up.etoile, rub = 0.035 * S.up.rubis;
  return r < star ? 1 : r < star + rub ? 2 : 0;
}

function drop(x) {
  if (S.stock <= 0) {
    A.nope(); A.buzz(30);
    UI.bump('stockBox', 'shake');
    return;
  }
  S.stock--;
  S.stats.dropped++;
  const k = rollKind();
  const o = spawnCoin(k, THREE.MathUtils.clamp(x, -C.halfW + 0.55, C.halfW - 0.55), C.dropY, C.dropZ + rnd(-0.08, 0.08),
    qFrom(Math.PI / 2 + rnd(-0.25, 0.25), rnd(-0.3, 0.3), 0));
  o.body.setLinvel({ x: 0, y: -3, z: 0 }, true);
  o.body.setAngvel({ x: rnd(-4, 4), y: 0, z: rnd(-3, 3) }, true);
  aim.kick = 1;
  A.drop(); A.buzz(6);
  addXP(1);
}

// coins (and gifts) raining over both decks
function rain(n, opts = {}) {
  for (let i = 0; i < n; i++) later(i * (opts.gap ?? 0.05), () => {
    if (bodies.length > 460) return;
    const k = opts.kinds ? opts.kinds[Math.floor(Math.random() * opts.kinds.length)] : 0;
    const z = rnd(C.wallZ + 0.6, gutterZ() - 0.4);
    const o = spawnCoin(k, rnd(-C.halfW + 0.6, C.halfW - 0.6), C.dropY + rnd(0, 2.5), z, qFrom(rnd(0, 3), rnd(0, 3), rnd(0, 3)));
    o.body.setAngvel({ x: rnd(-8, 8), y: rnd(-8, 8), z: rnd(-8, 8) }, true);
  });
}

function dropMega(x = rnd(-2.5, 2.5)) {
  const o = spawnCoin(3, x, C.dropY + 1.5, rnd(1, 3.5), qFrom(rnd(-0.2, 0.2), 0, rnd(-0.2, 0.2)));
  o.body.setLinvel({ x: 0, y: -6, z: 0 }, true);
}

function dropPrize() {
  const id = pickPrize(S.album);
  makePrize(id, rnd(-2.5, 2.5), C.dropY + 1, rnd(0.5, 3.5), qFrom(0, rnd(0, 6), 0));
  return id;
}

// ---------- progression ----------
function addXP(n) {
  S.xp += n;
  if (S.xp < xpNeed()) return;
  S.xp -= xpNeed();
  S.lvl++;
  const gift = 10 + 5 * S.lvl;
  later(0.2, () => {
    UI.banner('NIVEAU ' + S.lvl, `+${gift} pièces`, '#4ad66d', 1800);
    A.fanfare('level');
    confettiFront(40);
    giveFromScreen(gift, innerWidth / 2, innerHeight * 0.42);
  });
}

function giveFromScreen(n, x, y, sprite = 'coin') {
  S.stock += n;
  S.stats.won += n;
  const pieces = Math.min(n, 14), per = Math.floor(n / pieces);
  for (let i = 0; i < pieces; i++) later(i * 0.04, () => UI.flyCoin(x + rnd(-30, 30), y + rnd(-20, 20), i === pieces - 1 ? n - per * (pieces - 1) : per, sprite));
}

function confettiFront(n) {
  for (let i = 0; i < 6; i++) FX.burst(rnd(-4, 4), rnd(1, 4), rnd(3, 8), { n: Math.ceil(n / 6), colors: FX.CONFETTI, speed: 5, up: 7, g: 9, life: 1.6 });
}

const screenPos = () => { const [x, y] = toScreen(0, 4.3, C.wallZ); return [x, y]; };

// ---------- physics events ----------
let comboN = 0, comboT = -9;
const ev = {
  gate(o, p) {
    flashRing();
    A.gate(); A.buzz(15);
    FX.burst(p.x, p.y, p.z, { n: 18, colors: ['#4ad66d', '#ffffff', '#ffd23f'], speed: 3, up: 2, g: 6 });
    const [sx, sy] = toScreen(p.x, p.y, p.z);
    if (S.spins < MAX_SPINS) { S.spins++; UI.pop(sx, sy, '+1 TOUR', 'green'); }
    else { giveFromScreen(2, sx, sy); UI.pop(sx, sy, '+2', 'gold'); }
    lights.mode = 'spin'; lights.until = T + 0.8;
  },
  land(o, v, p) {
    if (o.type === 'prize') { A.thud(v / 14); return; }
    if (o.k === 3) {
      A.thud(1.2); A.buzz(40);
      FX.shake(0.5); FX.zoomPunch(0.4);
      FX.burst(p.x, p.y, p.z, { n: 30, colors: ['#ffffff', '#d9d9ec', '#ffd23f'], speed: 6, up: 2, g: 10 });
      for (const b of bodies) if (b !== o) {
        const q = b.body.translation(), d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < 2.5) b.body.applyImpulse({ x: 0, y: b.body.mass() * (2.5 - d) * 2, z: 0 }, true);
      }
      return;
    }
    A.clink(v / 14);
    if (v > 12) FX.burst(p.x, p.y, p.z, { n: 3, colors: ['#ffffff', '#ffd23f'], speed: 2, up: 1.5, g: 10, life: 0.3 });
  },
  win(o, p) {
    const now = T;
    comboN = now - comboT < 0.9 ? comboN + 1 : 1;
    comboT = now;
    const [sx, sy] = toScreen(p.x, 0, C.front);
    FX.burst(p.x, 0.1, C.front, { n: 10, colors: ['#ffd23f', '#ffffff', '#f29e1f'], speed: 2.5, up: 5, g: 16 });
    lights.mode = 'win'; lights.until = Math.max(lights.until, T + 0.5);
    if (o.type === 'prize') return winPrize(o, sx, sy);
    const K = KINDS[o.k], v = K.value;
    S.stock += v;
    S.stats.won += v;
    UI.pop(sx, sy - 16, '+' + v, o.k === 2 ? 'red' : o.k === 3 ? 'big' : '');
    UI.flyCoin(sx, sy, v, ['coin', 'star', 'gem', 'coin'][o.k]);
    A.win(comboN, v > 1); A.buzz(8);
    UI.combo(comboN);
    if (comboN === 8 || comboN === 15 || comboN === 25) {
      UI.banner(comboN >= 25 ? 'INCROYABLE !' : comboN >= 15 ? 'GÉNIAL !' : 'SUPER !', `combo ×${comboN}`, '#ff7ad9', 1100);
      FX.shake(0.25);
    }
    if (o.k === 1) {
      later(0.15, () => {
        if (S.spins < MAX_SPINS) S.spins++;
        UI.pop(sx, sy - 40, '+1 TOUR', 'green');
        A.gate();
      });
    }
    if (o.k === 3) { FX.shake(0.4); A.fanfare('small'); confettiFront(20); }
  },
  lose(o, p) {
    if (o.type === 'prize') {
      UI.toast(`${PRIZES[o.id].name} est tombé dans la gouttière…`);
      A.lose();
      return;
    }
    A.lose();
    const [sx, sy] = toScreen(p.x, 0, p.z);
    UI.pop(sx, sy, '×', 'grey');
  },
  gone(o) { if (o.mesh) scene.remove(o.mesh); },
};

function winPrize(o, sx, sy) {
  const id = o.id, p = PRIZES[id], R = RARITY[p.rarity];
  const isNew = !S.album[id];
  S.album[id] = (S.album[id] || 0) + 1;
  FX.slowmo(0.5, 0.3);
  FX.shake(0.5);
  FX.flash(R.color, 0.5);
  confettiFront(60);
  lights.mode = 'jackpot'; lights.until = T + 2.5;
  if (isNew) {
    A.fanfare('big'); A.buzz([30, 40, 60]);
    UI.banner('NOUVEAU !', `${p.name} · ${R.name}`, R.color, 2600, thumb(id));
  } else {
    const bonus = [5, 15, 40][p.rarity];
    A.fanfare('small');
    UI.banner(p.name, `doublon · +${bonus} pièces`, R.color, 2000, thumb(id));
    giveFromScreen(bonus, sx, sy);
  }
}

// ---------- roulette outcomes ----------
RL.onReach = () => {
  UI.banner('REACH !', 'plus qu’un…', '#ef3e5c', 1300);
  lights.mode = 'spin'; lights.until = T + 1.6;
  FX.zoomPunch(0.5);
  A.buzz(20);
};
RL.onResult = out => {
  const [sx, sy] = screenPos();
  const big = (t, s, c, ms) => { UI.banner(t, s, c, ms); lights.mode = 'win'; lights.until = T + 1.5; };
  switch (out) {
    case 'none': A.lose(); break;
    case 'pair': big('CERISES', '+3 pièces', '#ef3e5c', 1100); A.fanfare('small'); giveFromScreen(3, sx, sy); break;
    case 'cerises': big('TRIPLE CERISES', '+12 pièces', '#ef3e5c', 1500); A.fanfare('small'); giveFromScreen(12, sx, sy); break;
    case 'pluie': big('PLUIE DE PIÈCES', '', '#ffd23f', 1500); A.fanfare('small'); rain(22, { kinds: [0, 0, 0, 0, 0, 1] }); break;
    case 'mega': big('MÉGA PIÈCE', 'vaut 15', '#ffd23f', 1500); A.fanfare('small'); later(0.3, dropMega); break;
    case 'murs':
      big('MURS !', '30 s sans pertes', '#6ff5ff', 1500); A.fanfare('small');
      wallsT = 30; setBonusWalls(true);
      break;
    case 'turbo': big('TURBO', 'le pousseur s’emballe', '#49b6ff', 1500); A.fanfare('small'); pusher.turbo = 20; break;
    case 'seisme':
      big('SÉISME !', '', '#f29e1f', 1500);
      A.rumble(1.4); A.buzz([60, 40, 80, 40, 120]);
      FX.shake(1.1); FX.flash('#f29e1f', 0.3);
      later(0.1, () => quake(1));
      later(0.6, () => { quake(0.6); FX.shake(0.7); });
      break;
    case 'prix': big('CADEAU !', 'une figurine tombe', '#ff7ad9', 1500); A.fanfare('small'); later(0.3, dropPrize); break;
    case 'jackpot': jackpot(); break;
  }
};

function jackpot() {
  S.stats.jackpots++;
  UI.banner('JACKPOT !!!', '', '#ffd23f', 3200);
  A.jackpot(); A.buzz([80, 50, 80, 50, 200]);
  FX.slowmo(0.7, 0.3);
  FX.flash('#ffd23f', 0.8);
  FX.shake(0.9); FX.zoomPunch(1);
  lights.mode = 'jackpot'; lights.until = T + 5;
  for (let i = 0; i < 8; i++) later(i * 0.25, () => confettiFront(40));
  rain(45, { kinds: [0, 0, 0, 0, 1, 2], gap: 0.04 });
  later(1.2, dropMega);
  later(2.0, dropPrize);
}

// ---------- input ----------
let holding = false, pid = null, cool = 0;
function aimAt(e) {
  const p = screenToPlaneY(e.clientX, e.clientY, C.pTop);
  if (p) aim.x = THREE.MathUtils.clamp(p.x, -C.halfW + 0.55, C.halfW - 0.55);
}
canvas.addEventListener('pointerdown', e => {
  A.unlock();
  if (UI.modalOpen() || pid !== null) return;
  pid = e.pointerId;
  try { canvas.setPointerCapture(pid); } catch {}
  holding = true; aim.on = true;
  aimAt(e);
  if (cool <= 0) { drop(aim.x); cool = Math.max(dropCooldown(), 0.12); }
  UI.hint(false);
});
const release = () => { pid = null; holding = false; aim.on = false; };
const up = e => { if (e.pointerId === pid) release(); };
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== pid) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) return release();
  aimAt(e);
});
addEventListener('pointerup', up);
addEventListener('pointercancel', up);
addEventListener('blur', release);
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { A.unlock(); holding = true; aim.on = true; if (cool <= 0) { drop(aim.x); cool = dropCooldown(); } e.preventDefault(); }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') { holding = false; aim.on = false; } });
canvas.addEventListener('contextmenu', e => e.preventDefault());

UI.hooks.bought = k => {
  if (k === 'bords') { setGutter(); layoutRails(); if (wallsT > 0) setBonusWalls(true); }
  persist();
};

// ---------- loop ----------
const persist = () => save(snapshot());
let last = performance.now(), acc = 0, saveT = 0;
function frame(now) {
  const rdt = Math.min(0.05, (now - last) / 1000);
  last = now;
  T += rdt;
  const dt = rdt * FX.time.scale;

  if (S.stock < maxStock()) {
    S.regen += rdt;
    if (S.regen >= regenEvery()) { S.regen -= regenEvery(); S.stock++; UI.bump('stockBox'); }
  } else S.regen = 0;

  if (keys.ArrowLeft) aim.x = Math.max(-C.halfW + 0.55, aim.x - rdt * 6);
  if (keys.ArrowRight) aim.x = Math.min(C.halfW - 0.55, aim.x + rdt * 6);
  cool -= rdt;
  if (holding && cool <= 0) { drop(aim.x); cool = dropCooldown(); }

  for (let i = timers.length - 1; i >= 0; i--) if (T >= timers[i].at) timers.splice(i, 1)[0].fn();

  gate.x = Math.sin(T * 0.7) * (C.halfW - 1.1);
  gate.r = 0.7 + 0.12 * S.up.chance;
  if (wallsT > 0) { wallsT -= rdt; if (wallsT <= 0) setBonusWalls(false); }
  if (T - comboT > 0.9 && comboN) { comboN = 0; UI.combo(0); }

  acc += dt;
  let n = 0;
  while (acc >= STEP && n < 3) { step(ev); acc -= STEP; n++; }
  if (n === 3) acc = 0;

  syncBodies(T);
  showBonusWalls(wallsT > 0, T);
  updateBulbs(T);
  updateRoulette(rdt);
  FX.updateParticles(dt);
  FX.updateCamera(rdt, T);
  UI.updateFlies(rdt);
  UI.renderHUD();
  const ch = [];
  if (wallsT > 0) ch.push({ icon: 'brick', t: wallsT });
  if (pusher.turbo > 0) ch.push({ icon: 'turbo', t: pusher.turbo });
  UI.chips(ch);

  renderer.render(scene, camera);
  saveT += rdt;
  if (saveT > 5) { saveT = 0; persist(); }
  requestAnimationFrame(frame);
}

// ---------- boot ----------
addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); else last = performance.now(); });
addEventListener('pagehide', persist);

resize();
UI.initUI();
setupMachine();
await initPhysics();
const gained = offlineRegen();
if (S.board?.b?.length) {
  pusher.phase = S.board.phase || 0;
  for (const [k, x, y, z, qx, qy, qz, qw] of S.board.b) {
    const q = { x: qx, y: qy, z: qz, w: qw };
    if (k >= 100) makePrize(k - 100, x, y, z, q, false);
    else spawnCoin(k, x, y, z, q, false);
  }
  for (let i = 0; i < 20; i++) step(ev);
} else {
  fillBoard((x, z) => makePrize(4, x, 0.6, z, null, false));
  const quiet = { gate() {}, land() {}, win() {}, lose() {}, gone: ev.gone };
  for (let i = 0; i < 240; i++) step(quiet);
}
syncBodies(0);
document.getElementById('loading').classList.add('done');
if (gained > 0) UI.toast(`Pendant ton absence : +${gained} pièces`);
if (S.stats.dropped > 0) UI.hint(false);
requestAnimationFrame(frame);
