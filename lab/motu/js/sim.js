// Game state and the simulation step. The same `advance` drives live play (small steps, events
// handed to the renderer) and offline catch-up (large steps, events resolved automatically).

import { BOATS, boatById, RES, RES_IDS, SPECIES, SITES, BIOMES, PERKS, ZONES, seaSpecies, OFFLINE_CAP_H } from './data.js';
import { setSeed, zoneAt, landAt, islandById, islandsInRect, dockPoint, nearestIsland } from './world.js';

export const FOG = 8;              // fog-of-war cell size in tiles
const REGEN_S = 12 * 60;           // one unit of stock regrows per node every 12 minutes
const GATHER_PER_CREW_H = 14;      // units per crew member per hour while docked
const REPAIR_H = 5;                // free hull points per hour while docked
const SAT_HALF_S = 3600;           // market saturation half-life
const SAVE_KEY = 'motu.save.v1';

export function newGame(seed = (Math.random() * 2 ** 32) >>> 0) {
  setSeed(seed);
  const home = islandById('0,0');
  const dock = dockPoint(home, home.x + 20, home.y + 20);
  const s = {
    v: 1, seed, t: Date.now(), created: Date.now(),
    boat: { type: 'radeau', hull: BOATS[0].hull, x: dock.x, y: dock.y, hd: Math.PI / 4, mode: 'docked' },
    docked: home.id,
    cargo: {}, store: {}, pearls: 5,
    route: null,
    known: { [home.id]: 1 }, visited: { [home.id]: 1 },
    fog: {},
    isl: {},
    carnet: { sp: {}, site: {}, biome: { jungle: 1 } },
    log: [],
    stats: { dist: 0, storms: 0, wrecks: 0, sold: 0 },
    gacc: 0,
    wish: [],
  };
  revealAround(s, null);
  addLog(s, 'Le radeau est prêt, amarré à Motu Iti. Le lagon attend.', 'info');
  return s;
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1) return null;
    setSeed(s.seed);
    return s;
  } catch { return null; }
}

export function save(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {}
}
export function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch {} }

// ---------- derived stats ----------

export const carnetCount = s =>
  Object.keys(s.carnet.sp).length + Object.keys(s.carnet.site).length + Object.keys(s.carnet.biome).length;

export const perks = s => {
  const n = carnetCount(s);
  const out = new Set();
  for (const p of PERKS) if (n >= p.at) out.add(p.id);
  return out;
};

export function stats(s) {
  const B = boatById(s.boat.type);
  const P = perks(s);
  return {
    ...B,
    speed: B.speed * (P.has('speed1') ? 1.1 : 1) * (P.has('speed2') ? 1.15 : 1),
    sight: B.sight + (P.has('sight1') ? 3 : 0) + (P.has('sight2') ? 4 : 0),
    cargo: Math.round(B.cargo * (P.has('cargo1') ? 1.2 : 1)),
    gather: (P.has('gather1') ? 1.25 : 1) * (P.has('gather2') ? 1.4 : 1),
    stormMul: P.has('hull1') ? 0.6 : 1,
  };
}

export const cargoUsed = s => RES_IDS.reduce((a, id) => a + (s.cargo[id] || 0), 0);
export const cargoFree = s => Math.max(0, stats(s).cargo - cargoUsed(s));

function addCargo(s, res, n) {
  const k = Math.min(n, cargoFree(s));
  if (k > 0) s.cargo[res] = (s.cargo[res] || 0) + k;
  return k;
}

export function addLog(s, m, k = 'info', ctx) {
  const e = { t: s.t, m, k };
  s.log.push(e);
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
  if (ctx && ctx.journal) ctx.journal.push(e);
  if (ctx && ctx.onLog) ctx.onLog(e);
}

// ---------- islands: stock and markets ----------

export function islandState(s, isle) {
  let st = s.isl[isle.id];
  if (!st) {
    st = s.isl[isle.id] = { stock: isle.nodes.map(n => n.max), at: s.t, sat: {}, satAt: s.t };
  }
  const el = (s.t - st.at) / 1000;
  if (el > 0) {
    isle.nodes.forEach((n, i) => { st.stock[i] = Math.min(n.max, st.stock[i] + el / REGEN_S); });
    st.at = s.t;
  }
  const es = (s.t - st.satAt) / 1000;
  if (es > 0) {
    const f = Math.pow(0.5, es / SAT_HALF_S);
    for (const k in st.sat) { st.sat[k] *= f; if (Math.abs(st.sat[k]) < 0.005) delete st.sat[k]; }
    st.satAt = s.t;
  }
  return st;
}

export function sellPrice(s, isle, res) {
  const p = isle.village.prices[res], sat = islandState(s, isle).sat[res] || 0;
  return Math.max(0.2 * p, Math.min(2 * p, p * (1 - sat)));
}
export function buyPrice(s, isle, res) {
  const p = isle.village.prices[res], sat = islandState(s, isle).sat[res] || 0;
  return Math.max(0.3 * p, p * 1.6 * (1 - sat));
}

export function sell(s, isle, res, n = 1) {
  const st = islandState(s, isle);
  let got = 0, k = 0;
  while (k < n && (s.cargo[res] || 0) > 0) {
    got += sellPrice(s, isle, res);
    st.sat[res] = (st.sat[res] || 0) + 0.04;
    s.cargo[res]--; k++;
  }
  if (!s.cargo[res]) delete s.cargo[res];
  s.pearls += got; s.stats.sold += k;
  return { k, got };
}

export function buy(s, isle, res, n = 1) {
  const st = islandState(s, isle);
  let k = 0, spent = 0;
  while (k < n && cargoFree(s) > 0) {
    const p = buyPrice(s, isle, res);
    if (s.pearls < p) break;
    s.pearls -= p; spent += p;
    st.sat[res] = (st.sat[res] || 0) - 0.04;
    s.cargo[res] = (s.cargo[res] || 0) + 1; k++;
  }
  return { k, spent };
}

// ---------- discovery ----------

function revealAround(s, ctx) {
  const b = s.boat, R = stats(s).sight;
  const c0x = Math.floor((b.x - R) / FOG), c1x = Math.floor((b.x + R) / FOG);
  const c0y = Math.floor((b.y - R) / FOG), c1y = Math.floor((b.y + R) / FOG);
  for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
    const mx = (cx + 0.5) * FOG, my = (cy + 0.5) * FOG;
    if (Math.hypot(mx - b.x, my - b.y) < R + FOG * 0.6) s.fog[cx + ',' + cy] = 1;
  }
  for (const isle of islandsInRect(b.x - R, b.y - R, b.x + R, b.y + R)) {
    if (s.known[isle.id]) continue;
    if (Math.hypot(isle.x - b.x, isle.y - b.y) - isle.r < R) {
      s.known[isle.id] = 1;
      addLog(s, `Île aperçue : ${isle.name} (${BIOMES[isle.biome].name.toLowerCase()})`, 'isle', ctx);
      if (ctx && ctx.sum) ctx.sum.found++;
    }
  }
}

export function observe(s, sp, ctx, how = 'obs') {
  const first = !s.carnet.sp[sp];
  s.carnet.sp[sp] = (s.carnet.sp[sp] || 0) + 1;
  if (first) {
    addLog(s, `Nouvelle espèce au carnet : ${SPECIES[sp].name}`, 'carnet', ctx);
    checkPerks(s, ctx);
  }
  return first;
}

function checkPerks(s, ctx) {
  const n = carnetCount(s);
  for (const p of PERKS) {
    if (n === p.at) addLog(s, `Savoir des anciens : ${p.name} (${p.desc})`, 'perk', ctx);
  }
}

function visit(s, isle, ctx) {
  s.known[isle.id] = 1;
  if (!s.visited[isle.id]) {
    s.visited[isle.id] = 1;
    addLog(s, `Accosté pour la première fois à ${isle.name}`, 'isle', ctx);
    if (!s.carnet.biome[isle.biome]) {
      s.carnet.biome[isle.biome] = 1;
      addLog(s, `Nouveau biome au carnet : ${BIOMES[isle.biome].name}`, 'carnet', ctx);
      checkPerks(s, ctx);
    }
  }
  islandState(s, isle);
}

export function studySite(s, isle, ctx) {
  const st = islandState(s, isle);
  if (!isle.site || st.studied) return null;
  st.studied = 1;
  const S = SITES[isle.site.type];
  const first = !s.carnet.site[isle.site.type];
  s.carnet.site[isle.site.type] = (s.carnet.site[isle.site.type] || 0) + 1;
  const gifts = [];
  for (const [k, n] of Object.entries(S.gift)) {
    if (k === 'pearls') { s.pearls += n; gifts.push(`${n} perles`); }
    else { const g = addCargo(s, k, n); if (g) gifts.push(`${g} ${RES[k].name.toLowerCase()}`); }
  }
  addLog(s, `${S.name} de ${isle.name} étudié${gifts.length ? ' : ' + gifts.join(', ') : ''}`, 'carnet', ctx);
  if (first) checkPerks(s, ctx);
  return gifts;
}

// ---------- harvesting ----------

export function harvest(s, isle, i, n = 1) {
  const st = islandState(s, isle);
  const node = isle.nodes[i];
  const k = Math.min(n, Math.floor(st.stock[i]));
  if (k <= 0) return 0;
  let got;
  if (node.res === 'perle') { got = k; s.pearls += k; }
  else got = addCargo(s, node.res, k);
  st.stock[i] -= got;
  return got;
}

function canGather(s, isle) {
  const st = islandState(s, isle), free = cargoFree(s) > 0;
  return isle.nodes.some((n, i) => st.stock[i] >= 1 && (free || n.res === 'perle'));
}

function crewGather(s, isle, dt, ctx) {
  const S = stats(s);
  s.gacc += dt / 3600 * GATHER_PER_CREW_H * S.crew * S.gather;
  if (s.gacc < 1) return;
  const st = islandState(s, isle);
  while (s.gacc >= 1) {
    // crew orders first, then what the next boat still lacks, then the most valuable
    const nb = nextBoat(s), wish = s.wish || [];
    let bi = -1, bv = -1;
    isle.nodes.forEach((n, i) => {
      if (st.stock[i] < 1 || (n.res !== 'perle' && cargoFree(s) <= 0)) return;
      let v = (n.res === 'perle' ? 30 : RES[n.res].value) * 10 + st.stock[i] * 0.01;
      if (wish.includes(n.res)) v += 2000;
      else if (!wish.length && nb && nb.cost[n.res] && (s.cargo[n.res] || 0) + (s.store[n.res] || 0) < nb.cost[n.res]) v += 1000;
      if (v > bv) { bv = v; bi = i; }
    });
    if (bi < 0) { s.gacc = 0; return; }
    const got = harvest(s, isle, bi, 1);
    s.gacc -= 1;
    if (got && ctx && ctx.sum) {
      const r = isle.nodes[bi].res;
      ctx.sum.res[r] = (ctx.sum.res[r] || 0) + got;
    }
    if (!got) { s.gacc = 0; return; }
  }
}

// ---------- boats ----------

export const nextBoat = s => BOATS[BOATS.findIndex(b => b.id === s.boat.type) + 1] || null;

export function canPay(s, cost, pearls, atHome) {
  for (const [k, n] of Object.entries(cost || {})) {
    if ((s.cargo[k] || 0) + (atHome ? s.store[k] || 0 : 0) < n) return false;
  }
  return s.pearls >= (pearls || 0);
}

function pay(s, cost, pearls, atHome) {
  for (const [k, n] of Object.entries(cost || {})) {
    let left = n;
    const c = Math.min(left, s.cargo[k] || 0);
    s.cargo[k] = (s.cargo[k] || 0) - c; left -= c;
    if (!s.cargo[k]) delete s.cargo[k];
    if (left > 0 && atHome) { s.store[k] -= left; if (!s.store[k]) delete s.store[k]; }
  }
  s.pearls -= pearls || 0;
}

export function buildBoat(s, isle) {
  const nb = nextBoat(s);
  if (!nb || !isle.village || !isle.village.chantier) return false;
  if (!canPay(s, nb.cost, nb.pearls, isle.home)) return false;
  pay(s, nb.cost, nb.pearls, isle.home);
  s.boat.type = nb.id;
  s.boat.hull = nb.hull;
  addLog(s, `Nouveau bateau mis à l'eau : ${nb.name} !`, 'boat');
  revealAround(s, null);
  return true;
}

export function repairCost(s) {
  const missing = stats(s).hull - s.boat.hull;
  return Math.ceil(missing / 5);
}
export function repair(s, atHome) {
  const S = stats(s);
  let need = Math.ceil((S.hull - s.boat.hull) / 5);
  const have = (s.cargo.bois || 0) + (atHome ? s.store.bois || 0 : 0);
  const k = Math.min(need, have);
  if (k <= 0) return 0;
  pay(s, { bois: k }, 0, atHome);
  s.boat.hull = Math.min(S.hull, s.boat.hull + k * 5);
  return k;
}

export function deposit(s) {
  let n = 0;
  for (const k of RES_IDS) {
    if (!s.cargo[k]) continue;
    s.store[k] = (s.store[k] || 0) + s.cargo[k];
    n += s.cargo[k];
    delete s.cargo[k];
  }
  return n;
}

export function withdraw(s, res, n) {
  const k = Math.min(n, s.store[res] || 0, cargoFree(s));
  if (k <= 0) return 0;
  s.store[res] -= k; if (!s.store[res]) delete s.store[res];
  s.cargo[res] = (s.cargo[res] || 0) + k;
  return k;
}

// ---------- routes ----------

// Route waypoints: { x, y, isle?: id, stay: seconds (-1 = until the hold is full) }
export function setRoute(s, wps) {
  if (!wps.length) { s.route = null; if (s.boat.mode === 'route') s.boat.mode = s.docked ? 'docked' : 'idle'; return; }
  s.route = { wps, i: 0, stayLeft: 0, dock: null, stuck: 0, best: 1e9 };
  s.boat.mode = 'route';
  s.docked = null;
  addLog(s, `Cap fixé : ${wps.length} étape${wps.length > 1 ? 's' : ''}`, 'route');
}

export function routeLength(s, wps, from = s.boat) {
  let d = 0, px = from.x, py = from.y;
  for (const w of wps) { d += Math.hypot(w.x - px, w.y - py); px = w.x; py = w.y; }
  return d;
}

// Highest zone met along a polyline (sampled), used for warnings in the planner.
export function routeMaxZone(s, wps, from = s.boat) {
  let z = zoneAt(from.x, from.y), px = from.x, py = from.y;
  for (const w of wps) {
    const L = Math.hypot(w.x - px, w.y - py), n = Math.ceil(L / 6);
    for (let i = 1; i <= n; i++) z = Math.max(z, zoneAt(px + (w.x - px) * i / n, py + (w.y - py) * i / n));
    px = w.x; py = w.y;
  }
  return z;
}

// ---------- the step ----------

function rate(dt, perHour) { return Math.random() < 1 - Math.exp(-perHour * dt / 3600); }

function freeAt(x, y) { return !landAt(x, y); }

// Straight water between two points?
function clearLine(x0, y0, x1, y1) {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L / 0.3);
  for (let i = 1; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    if (!freeAt(x, y) || !freeAt(x + 0.3, y) || !freeAt(x - 0.3, y) || !freeAt(x, y + 0.3) || !freeAt(x, y - 0.3)) return false;
  }
  return true;
}

// A* over water tiles in a window around start and goal. Returns tile-centre points, or null.
const SQ2 = Math.SQRT2;
export function findPath(sx, sy, gx, gy, margin = 24) {
  const x0 = Math.floor(Math.min(sx, gx)) - margin, y0 = Math.floor(Math.min(sy, gy)) - margin;
  const W = Math.floor(Math.max(sx, gx)) + margin - x0 + 1, H = Math.floor(Math.max(sy, gy)) + margin - y0 + 1;
  if (W * H > 90000) return null;
  const N = W * H;
  const block = new Uint8Array(N);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (landAt(x0 + i + 0.5, y0 + j + 0.5)) block[j * W + i] = 1;
  const idx = (x, y) => (Math.floor(y) - y0) * W + (Math.floor(x) - x0);
  let start = idx(sx, sy), goal = idx(gx, gy);
  if (block[goal]) {
    // nearest water tile to an on-land goal
    let best = -1, bd = Infinity;
    const gi = goal % W, gj = (goal / W) | 0;
    for (let r = 1; r < 6 && best < 0; r++) for (let j = gj - r; j <= gj + r; j++) for (let i = gi - r; i <= gi + r; i++) {
      if (i < 0 || j < 0 || i >= W || j >= H || block[j * W + i]) continue;
      const d = Math.hypot(i - gi, j - gj);
      if (d < bd) { bd = d; best = j * W + i; }
    }
    if (best < 0) return null;
    goal = best;
  }
  block[start] = 0;
  const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const gxI = goal % W, gyI = (goal / W) | 0;
  const h = k => { const dx = Math.abs(k % W - gxI), dy = Math.abs(((k / W) | 0) - gyI); return Math.max(dx, dy) + (SQ2 - 1) * Math.min(dx, dy); };
  // binary heap of [f, k]
  const heap = [];
  const push = (f, k) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  g[start] = 0; push(h(start), start);
  let found = false;
  while (heap.length) {
    const [, k] = pop();
    if (closed[k]) continue;
    if (k === goal) { found = true; break; }
    closed[k] = 1;
    const i = k % W, j = (k / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nk = nj * W + ni;
      if (block[nk] || closed[nk]) continue;
      if (di && dj && (block[j * W + ni] || block[nj * W + i])) continue; // no corner cutting
      // hug coasts less: tiles touching land cost a little more
      const ng = g[k] + (di && dj ? SQ2 : 1);
      if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(ng + h(nk), nk); }
    }
  }
  if (!found) return null;
  const pts = [];
  for (let k = goal; k !== start && k >= 0; k = from[k]) pts.push({ x: x0 + (k % W) + 0.5, y: y0 + ((k / W) | 0) + 0.5 });
  pts.reverse();
  // string-pull: keep only points needed to stay in clear water
  const out = [];
  let ax = sx, ay = sy, i = 0;
  while (i < pts.length) {
    let j = i;
    while (j + 1 < pts.length && clearLine(ax, ay, pts[j + 1].x, pts[j + 1].y)) j++;
    out.push(pts[j]); ax = pts[j].x; ay = pts[j].y; i = j + 1;
  }
  return out;
}

function turn(cur, target, maxd) {
  let d = target - cur;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return cur + Math.max(-maxd, Math.min(maxd, d));
}

// Next point to steer to on the way to (tx, ty): direct when the water is clear, otherwise along
// an A* path (planned toward a goal at most ~70 tiles away, re-planned as the boat goes).
function steerPoint(b, tx, ty) {
  const dist = Math.hypot(tx - b.x, ty - b.y);
  // a recent clear-water check toward this same target still holds for a while
  const c = b.clear;
  if (c && c.left > 0 && Math.abs(c.tx - tx) < 0.5 && Math.abs(c.ty - ty) < 0.5) return { x: tx, y: ty };
  b.clear = null;
  const look = Math.min(dist, 10);
  const lx = b.x + (tx - b.x) / dist * look, ly = b.y + (ty - b.y) / dist * look;
  if (b.path && b.path.length && Math.hypot(b.pathGoal.x - tx, b.pathGoal.y - ty) < 2) {
    while (b.path.length && Math.hypot(b.path[0].x - b.x, b.path[0].y - b.y) < 0.5) b.path.shift();
    if (b.path.length) {
      if (look === dist && clearLine(b.x, b.y, lx, ly)) { b.path = null; b.clear = { tx, ty, left: look }; return { x: tx, y: ty }; }
      return b.path[0];
    }
  }
  b.path = null;
  if (clearLine(b.x, b.y, lx, ly)) { b.clear = { tx, ty, left: look - 2.5 }; return { x: tx, y: ty }; }
  const far = Math.min(dist, 70);
  const gx = b.x + (tx - b.x) / dist * far, gy = b.y + (ty - b.y) / dist * far;
  const path = findPath(b.x, b.y, gx, gy);
  if (!path || !path.length) return null;
  b.path = path; b.pathGoal = { x: tx, y: ty };
  return path[0];
}

// Move the boat toward (tx, ty). Returns 'arrived' | 'moving' | 'blocked' | 'stuck'.
function sail(s, tx, ty, dt, ctx) {
  const b = s.boat, S = stats(s);
  const dist = Math.hypot(tx - b.x, ty - b.y);
  if (dist < 0.6) { b.path = null; return 'arrived'; }
  const p = steerPoint(b, tx, ty);
  if (!p) return 'stuck';
  const want = Math.atan2(p.y - b.y, p.x - b.x);
  b.hd = ctx.online ? turn(b.hd, want, dt * 3.2) : want;
  const z = zoneAt(b.x, b.y);
  const spd = S.speed * (z > S.sea ? 0.6 : 1) * (1 + (ctx.boost || 0) * 0.6);
  const step = Math.min(spd * dt, Math.hypot(p.x - b.x, p.y - b.y) + 0.05, dist);
  // while turning online, move along the current heading only if it is free; else move straight to p
  let nx = b.x + Math.cos(b.hd) * step, ny = b.y + Math.sin(b.hd) * step;
  if (!freeAt(nx, ny)) { nx = b.x + Math.cos(want) * step; ny = b.y + Math.sin(want) * step; }
  const nz = zoneAt(nx, ny);
  if (nz > S.sea + 1) { b.path = null; return 'blocked'; }
  if (!freeAt(nx, ny)) { b.path = null; return 'stuck'; }
  b.x = nx; b.y = ny;
  if (b.clear) b.clear.left -= step;
  s.stats.dist += step;
  if (ctx.sum) ctx.sum.dist += step;
  b.fogAcc = (b.fogAcc || 0) + step;
  if (b.fogAcc > 1.5) { b.fogAcc = 0; revealAround(s, ctx); }
  seaEvents(s, dt, nz, ctx);
  return 'moving';
}

function seaEvents(s, dt, z, ctx) {
  const S = stats(s);
  if (z > S.sea) s.boat.hull -= dt * 0.05 * (z - S.sea);
  if (rate(dt, 0.04 * z + (z > S.sea ? 0.6 : 0))) {
    const dmg = Math.round((4 + Math.random() * 8) * Math.pow(z, 0.7) * S.stormMul * (ctx.online ? 0.6 : 1));
    s.boat.hull -= dmg;
    s.stats.storms++;
    addLog(s, `Grain dans ${ZONES[z].name.toLowerCase()} : coque −${dmg}`, 'storm', ctx);
    if (ctx.onEvent) ctx.onEvent({ type: 'storm' });
  }
  if (rate(dt, 1.2)) {
    if (ctx.online && ctx.onEvent) ctx.onEvent({ type: 'flotsam', zone: z });
    else {
      const loot = flotsamLoot(z);
      const got = addCargo(s, loot.res, loot.n);
      if (got) {
        if (ctx.sum) ctx.sum.res[loot.res] = (ctx.sum.res[loot.res] || 0) + got;
        addLog(s, `Épave repêchée : +${got} ${RES[loot.res].name.toLowerCase()}`, 'loot', ctx);
      }
    }
  }
  if (rate(dt, 0.9)) {
    const pool = seaSpecies(z);
    const w = pool.map(id => [id, 1 / SPECIES[id].rare]);
    let r = Math.random() * w.reduce((a, e) => a + e[1], 0), sp = pool[0];
    for (const [id, wt] of w) if ((r -= wt) <= 0) { sp = id; break; }
    if (ctx.online && ctx.onEvent) ctx.onEvent({ type: 'fauna', sp });
    else if (Math.random() < 0.5) {
      const first = observe(s, sp, ctx);
      if (!first) addLog(s, `${SPECIES[sp].name} aperçu au loin`, 'fauna', ctx);
    }
  }
  if (s.boat.hull <= 0) wreck(s, ctx);
}

export function flotsamLoot(z) {
  const table = [['bois', 5], ['fibre', 4], ['coco', 3], ['pierre', z >= 2 ? 1.5 : 0], ['nacre', z >= 2 ? 1 : 0],
    ['obsidienne', z >= 3 ? 1 : 0], ['cacao', z >= 3 ? 1 : 0], ['plume', z >= 4 ? 0.6 : 0]];
  let r = Math.random() * table.reduce((a, e) => a + e[1], 0), res = 'bois';
  for (const [id, w] of table) if ((r -= w) <= 0) { res = id; break; }
  return { res, n: 1 + Math.floor(Math.random() * (RES[res].value > 3 ? 2 : 4)) };
}

function wreck(s, ctx) {
  const S = stats(s);
  let lost = 0;
  for (const k of RES_IDS) {
    if (!s.cargo[k]) continue;
    const l = Math.ceil(s.cargo[k] / 2);
    s.cargo[k] -= l; lost += l;
    if (!s.cargo[k]) delete s.cargo[k];
  }
  // towed by fishermen to the closest island already visited
  let best = islandById('0,0'), bd = Infinity;
  for (const id in s.visited) {
    const isle = islandById(id);
    const d = Math.hypot(isle.x - s.boat.x, isle.y - s.boat.y);
    if (d < bd) { bd = d; best = isle; }
  }
  const dp = dockPoint(best, s.boat.x, s.boat.y);
  s.boat.x = dp.x; s.boat.y = dp.y;
  s.boat.hull = Math.round(S.hull * 0.25);
  s.route = null; s.boat.mode = 'docked'; s.docked = best.id;
  s.stats.wrecks++;
  addLog(s, `Naufrage ! ${lost ? lost + ' ressources perdues. ' : ''}Des pêcheurs vous remorquent jusqu'à ${best.name}.`, 'wreck', ctx);
  if (ctx.onEvent) ctx.onEvent({ type: 'wreck' });
}

export function dockAt(s, isle, ctx = {}) {
  s.docked = isle.id;
  visit(s, isle, ctx);
}

export function undock(s) { s.docked = null; }

function dockedTick(s, dt, ctx) {
  const isle = islandById(s.docked);
  const S = stats(s);
  crewGather(s, isle, dt, ctx);
  if (s.boat.hull < S.hull) s.boat.hull = Math.min(S.hull, s.boat.hull + dt / 3600 * REPAIR_H * (isle.village ? 2 : 1));
  // crew wanders off to watch the island's wildlife
  if (!ctx.online) {
    for (const sp of isle.fauna) {
      if (!s.carnet.sp[sp] && rate(dt, 0.35 / SPECIES[sp].rare)) observe(s, sp, ctx);
    }
  }
}

function routeTick(s, dt, ctx) {
  const R = s.route, b = s.boat;
  const wp = R.wps[R.i];
  if (R.staying) {
    dockedTick(s, dt, ctx);
    R.stayLeft -= dt;
    if (R.stayLeft <= 0 || (R.untilFull && !canGather(s, islandById(s.docked)))) { R.staying = false; undock(s); nextWp(s, ctx); }
    return;
  }
  const isle = wp.isle ? islandById(wp.isle) : null;
  if (isle && !R.dock) R.dock = dockPoint(isle, b.x, b.y);
  const tx = R.dock ? R.dock.x : wp.x, ty = R.dock ? R.dock.y : wp.y;
  const res = sail(s, tx, ty, dt, ctx);
  if (s.boat.mode !== 'route' || !s.route) return; // wrecked
  const d = Math.hypot(tx - b.x, ty - b.y);
  if (d < R.best - 0.5) { R.best = d; R.stuck = 0; } else R.stuck += dt;
  if (res === 'arrived') {
    if (isle) {
      dockAt(s, isle, ctx);
      const last = R.i === R.wps.length - 1;
      if (last) { finishRoute(s, ctx, `Arrivé à ${isle.name}, amarré.`); s.boat.mode = 'docked'; return; }
      R.staying = true;
      R.untilFull = wp.stay === -1;
      R.stayLeft = wp.stay === -1 ? 3 * 3600 : Math.max(1, wp.stay);
      addLog(s, `Escale à ${isle.name}`, 'route', ctx);
    } else nextWp(s, ctx);
  } else if (res === 'blocked') {
    const zn = ZONES[Math.min(ZONES.length - 1, zoneAt(b.x, b.y) + 1)].name.toLowerCase();
    addLog(s, `Houle trop forte vers ${zn} : demi-tour vers l'étape suivante.`, 'storm', ctx);
    nextWp(s, ctx);
  } else if (res === 'stuck' || R.stuck > 900) {
    addLog(s, 'Passage introuvable, étape abandonnée.', 'route', ctx);
    nextWp(s, ctx);
  }
}

function nextWp(s, ctx) {
  const R = s.route;
  R.i++; R.dock = null; R.stuck = 0; R.best = 1e9;
  if (R.i >= R.wps.length) finishRoute(s, ctx, 'Fin de la route. Le bateau dérive doucement.');
}

function finishRoute(s, ctx, msg) {
  if (msg) addLog(s, msg, 'route', ctx);
  s.route = null;
  s.boat.mode = s.docked ? 'docked' : 'idle';
}

// ctx: { online, boost, input: {x,y} | null, onEvent, onLog, journal, sum }
export function advance(s, dtTotal, ctx = {}) {
  let left = dtTotal;
  let guard = 0;
  while (left > 1e-6 && guard++ < 400000) {
    const b = s.boat;
    const spd = stats(s).speed;
    const moving = (b.mode === 'route' && !(s.route && s.route.staying)) || (b.mode === 'manual' && ctx.input);
    const maxStep = moving ? Math.min(ctx.online ? 0.1 : 4, 0.45 / spd) : (ctx.online ? 0.25 : 60);
    const dt = Math.min(left, maxStep);
    left -= dt;
    s.t += dt * 1000;

    if (b.mode === 'route' && s.route) routeTick(s, dt, ctx);
    else if (b.mode === 'manual' && ctx.input) {
      if (s.docked) undock(s);
      const r = sail(s, ctx.input.x, ctx.input.y, dt, ctx);
      if (r === 'blocked' && ctx.onEvent) ctx.onEvent({ type: 'blocked' });
    } else if (s.docked) dockedTick(s, dt, ctx);
  }
}

// Offline catch-up: simulate from the last saved instant to now, return a journal.
export function catchUp(s, now = Date.now()) {
  const away = (now - s.t) / 1000;
  if (away < 20) { s.t = now; return null; }
  const capped = Math.min(away, OFFLINE_CAP_H * 3600);
  const ctx = { online: false, journal: [], sum: { res: {}, dist: 0, found: 0 } };
  const start = { x: s.boat.x, y: s.boat.y, hull: s.boat.hull, pearls: s.pearls };
  const t0 = performance.now();
  advance(s, capped, ctx);
  s.t = now;
  return { away, capped: away > capped, ...ctx, start, ms: performance.now() - t0 };
}

export function nearIslandToDock(s) {
  const b = s.boat;
  const isle = nearestIsland(b.x, b.y, 3);
  if (!isle) return null;
  for (const c of isle.coast) if (Math.hypot(c.x - b.x, c.y - b.y) < 2.6) return isle;
  return null;
}

export { zoneAt };
export const gain = (s, res, n) => addCargo(s, res, n);
