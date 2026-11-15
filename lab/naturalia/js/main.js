// Boucle de jeu, entrées, déplacements.
import { generate, G, SOLID, MW, MH } from './world.js';
import { WorldView } from './render.js';
import { bakePlayer, bakeBoat, bakeShadow } from './sprites.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || 20261022;
const W = generate(seed);
const view = new WorldView(W);
const PS = bakePlayer();
const BOAT = bakeBoat();
const SHADOW = bakeShadow(6, 2);

const screen = document.getElementById('screen');
const g = screen.getContext('2d');
let VW = 0, VH = 0;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const cw = innerWidth, ch = innerHeight;
  const portrait = ch > cw;
  const target = portrait ? 300 : 340;
  const scale = Math.max(1, Math.round((portrait ? cw : ch) * dpr / target));
  VW = Math.ceil(cw * dpr / scale); VH = Math.ceil(ch * dpr / scale);
  screen.width = VW; screen.height = VH;
  const cssW = VW * scale / dpr, cssH = VH * scale / dpr;
  screen.style.width = cssW + 'px'; screen.style.height = cssH + 'px';
  screen.style.left = (cw - cssW) / 2 + 'px'; screen.style.top = (ch - cssH) / 2 + 'px';
  g.imageSmoothingEnabled = false;
}
addEventListener('resize', resize);
resize();

// ---------- Monde : ce qui est praticable
const M = W.museum;
const inMuseum = (i, j) => i >= M.i && i < M.i + M.w && j >= M.j && j < M.j + M.d;
function tile(i, j) {
  if (!W.inb(i, j)) return { block: true };
  const k = W.idx(i, j);
  if (W.pier.has(k)) return { h: 1 };
  if (inMuseum(i, j)) return { block: true, museum: true };
  const gr = W.ground[k];
  if (gr === G.DEEP) return { water: true, deep: true, h: 0 };
  if (gr <= G.REEF) return { water: true, h: 0 };
  if (gr === G.FRESH) return { water: true, h: W.height[k] };
  if (gr === G.LAVA) return { block: true };
  const o = W.obj[k];
  if (o && SOLID.has(o.t)) return { block: true };
  return { h: W.height[k] };
}

// ---------- Joueur
const P = { i: W.spawn.i, j: W.spawn.j, z: 3, di: 0.7, dj: 0.7, moving: false, anim: 0, swim: false, boat: false };
const boat = { i: W.boat.i, j: W.boat.j, z: 0, di: 1, dj: 0 };
// le bateau doit être sur l'eau
(function fixBoat() {
  for (let r = 0; r < 6; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
    const t = tile(Math.floor(boat.i + a), Math.floor(boat.j + b));
    if (t.water && !t.deep && !W.pier.has(W.idx(Math.floor(boat.i + a), Math.floor(boat.j + b))) && W.ground[W.idx(Math.floor(boat.i + a), Math.floor(boat.j + b))] !== G.FRESH) { boat.i = Math.floor(boat.i + a) + 0.5; boat.j = Math.floor(boat.j + b) + 0.5; return; }
  }
})();

function canStand(i, j, fromH) {
  const R = 0.22;
  for (const [a, b] of [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R]]) {
    const t = tile(Math.floor(i + a), Math.floor(j + b));
    if (t.block) return false;
    if (P.boat) { if (!t.water || W.ground[W.idx(Math.floor(i + a), Math.floor(j + b))] === G.FRESH) return false; continue; }
    if (t.deep) return false;
    if (Math.abs(t.h - fromH) > 1) return false;
  }
  return true;
}

const keys = new Set();
addEventListener('keydown', (e) => { keys.add(e.key.toLowerCase()); if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); });
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

// joystick tactile
const joy = { id: null, x0: 0, y0: 0, dx: 0, dy: 0 };
screen.addEventListener('pointerdown', (e) => { if (joy.id === null) { joy.id = e.pointerId; joy.x0 = e.clientX; joy.y0 = e.clientY; joy.dx = joy.dy = 0; } });
addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) { joy.dx = e.clientX - joy.x0; joy.dy = e.clientY - joy.y0; } });
addEventListener('pointerup', (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.dx = joy.dy = 0; } });

function inputVec() {
  let x = 0, y = 0, run = keys.has('shift');
  if (keys.has('arrowleft') || keys.has('a') || keys.has('q')) x -= 1;
  if (keys.has('arrowright') || keys.has('d')) x += 1;
  if (keys.has('arrowup') || keys.has('w') || keys.has('z')) y -= 1;
  if (keys.has('arrowdown') || keys.has('s')) y += 1;
  if (joy.id !== null) {
    const len = Math.hypot(joy.dx, joy.dy);
    if (len > 8) { x = joy.dx / len; y = joy.dy / len; run = len > 60; }
  }
  const l = Math.hypot(x, y);
  return l ? { x: x / l, y: y / l, run } : null;
}

function update(dt) {
  const v = inputVec();
  P.moving = !!v;
  if (v) {
    // direction écran -> monde
    let di = v.x * 0.5 + v.y, dj = -v.x * 0.5 + v.y;
    const l = Math.hypot(di, dj); di /= l; dj /= l;
    P.di = di; P.dj = dj;
    const sp = (P.boat ? 5.2 : P.swim ? 1.9 : v.run ? 4.6 : 2.9) * dt;
    const here = tile(Math.floor(P.i), Math.floor(P.j));
    const fromH = here.h ?? 0;
    const ni = P.i + di * sp, nj = P.j + dj * sp;
    if (canStand(ni, P.j, fromH)) P.i = ni; else tryBoat(ni, P.j);
    if (canStand(P.i, nj, fromH)) P.j = nj; else tryBoat(P.i, nj);
    P.anim += dt * (v.run ? 12 : 8);
  }
  const t = tile(Math.floor(P.i), Math.floor(P.j));
  P.swim = !P.boat && !!t.water;
  const tz = P.boat ? 0 : t.h ?? 0;
  P.z += (tz - P.z) * Math.min(1, dt * 14);
  if (P.boat) { boat.i = P.i; boat.j = P.j; boat.di = P.di; boat.dj = P.dj; }
  // monter dans la barque en la touchant
  if (!P.boat && Math.hypot(P.i - boat.i, P.j - boat.j) < 0.75) { P.boat = true; P.i = boat.i; P.j = boat.j; }
}
// descendre de la barque sur une plage ou le ponton
function tryBoat(ni, nj) {
  if (!P.boat) return;
  const t = tile(Math.floor(ni), Math.floor(nj));
  if (!t.block && !t.water && t.h <= 1) {
    P.boat = false;
    P.i = Math.floor(ni) + 0.5; P.j = Math.floor(nj) + 0.5;
    boat.i -= P.di * 0.4; boat.j -= P.dj * 0.4;
  }
}

const playerEnt = {
  get i() { return P.i; }, get j() { return P.j; }, get z() { return P.z; },
  draw(g, sx, sy) {
    const back = P.di + P.dj < -0.2;
    const flip = (P.di - P.dj) > 0; // vers la droite de l'écran
    const f = P.moving ? 1 + (Math.floor(P.anim) % 2) : 0;
    let spr = P.swim ? (back ? PS.swimB : PS.swimF) : (back ? PS.back[f] : PS.front[f]);
    if (P.boat) spr = back ? PS.swimB : PS.swimF;
    if (!P.swim && !P.boat) g.drawImage(SHADOW, sx - 7, sy - 3);
    g.save();
    const yoff = P.boat ? -4 : 0;
    if (flip !== back) { g.translate(sx, 0); g.scale(-1, 1); g.drawImage(spr, -8, sy - 23 + yoff); }
    else g.drawImage(spr, sx - 8, sy - 23 + yoff);
    g.restore();
    if (P.swim) { g.fillStyle = 'rgba(244,251,250,0.8)'; g.fillRect(sx - 7, sy - 10, 14, 1); g.fillRect(sx - 5, sy - 9, 10, 1); }
  },
};
const boatEnt = {
  get i() { return boat.i; }, get j() { return boat.j; }, z: 0,
  draw(g, sx, sy) {
    const right = boat.di - boat.dj > 0;
    g.drawImage(right ? BOAT.R : BOAT.L, sx - BOAT.ax, sy - BOAT.ay + 2);
  },
};

let last = performance.now(), T0 = last;
const cam = { x: 0, y: 0 };
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt);
  const tx = (P.i - P.j) * 16, ty = (P.i + P.j) * 8 - P.z * 8 - 8;
  cam.x += (tx - cam.x) * Math.min(1, dt * 8); cam.y += (ty - cam.y) * Math.min(1, dt * 8);
  if (!cam.init) { cam.x = tx; cam.y = ty; cam.init = true; }
  const ents = [playerEnt];
  if (!P.boat) ents.push(boatEnt); else ents.push(boatEnt);
  view.draw(g, VW, VH, { x: Math.round(cam.x), y: Math.round(cam.y) }, Math.max(0, now - T0) / 1000, P.boat ? [boatEnt, { ...playerEnt, get i() { return P.i + 0.01; }, get j() { return P.j + 0.01; }, get z() { return 0; }, draw: playerEnt.draw }] : ents);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__game = { W, P, boat };
