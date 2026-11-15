// Procedural world: an endless ocean cut into cells, each cell holding at most one island.
// Islands are generated lazily from (cell, seed) and cached, so the same seed always gives the same sea.

import { hash2, mulberry, fbm, pick, pickWeighted } from './rng.js';
import { BIOMES, BIOME_IDS, SITES, SITE_IDS, SPECIES, RES, MAX_ZONE } from './data.js';

export const CELL = 44;
const cache = new Map();
let SEED = 1;

export function setSeed(s) { SEED = s >>> 0; cache.clear(); lcache.clear(); }
export const getSeed = () => SEED;

// Sea zones grow outward from home, with a noisy boundary so the frontier is not a perfect circle.
export function zoneF(x, y) {
  const d = Math.hypot(x, y);
  const n = fbm(x / 210, y / 210, SEED + 7, 3) - 0.5;
  return Math.max(1, Math.min(MAX_ZONE + 0.99, 1 + (d + n * 190) / 290));
}
export const zoneAt = (x, y) => Math.floor(zoneF(x, y));

const POLY = ['ma', 'na', 'to', 'ra', 'hi', 'va', 'ta', 'ko', 'mo', 'pa', 'ru', 'fa', 'nu', 'ho', 'ke', 'te', 'ri', 'ua', 'ai', 'pu', 'tu', 'vai', 'rua', 'hau'];
const NAHU = ['xo', 'tla', 'co', 'mi', 'to', 'na', 'te', 'hua', 'ix', 'yo', 'chi', 'ma', 'pa', 'tze', 'cal', 'qui'];
const cap = s => s[0].toUpperCase() + s.slice(1);

function makeName(rnd, biome, small) {
  if (biome === 'mesa') {
    let s = '';
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) s += pick(rnd, NAHU);
    return cap(s + pick(rnd, ['tlan', 'pan', 'co', 'can']));
  }
  let s = '';
  const n = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < n; i++) s += pick(rnd, POLY);
  s = cap(s);
  if (small) return 'Motu ' + s;
  if (biome === 'sacre') return s + ' Tapu';
  if (biome === 'volcan' && rnd() < 0.5) return 'Mauna ' + s;
  return s;
}

export function islandAtCell(cx, cy) {
  const key = cx + ',' + cy;
  if (cache.has(key)) return cache.get(key);
  const isle = genIsland(cx, cy);
  cache.set(key, isle);
  return isle;
}

function genIsland(cx, cy) {
  const rnd = mulberry(hash2(cx, cy, SEED));
  const home = cx === 0 && cy === 0;
  if (!home && rnd() > 0.55) return null;

  const x = home ? 0 : Math.round(cx * CELL + (rnd() - 0.5) * CELL * 0.5);
  const y = home ? 0 : Math.round(cy * CELL + (rnd() - 0.5) * CELL * 0.5);
  const zone = zoneAt(x, y);

  let biome;
  if (home) biome = 'jungle';
  else {
    const opts = BIOME_IDS.filter(b => BIOMES[b].minZone <= zone)
      .map(b => [b, BIOMES[b].weight * (b === 'sacre' ? zone - 3 : 1)]);
    biome = pickWeighted(rnd, opts);
  }
  const B = BIOMES[biome];
  let r = home ? 7 : 3 + rnd() * 4.5 + Math.min(zone, 4) * 0.35;
  if (biome === 'atoll') r += 1.5;

  const s = hash2(cx, cy, SEED + 31);
  const passAngle = rnd() * Math.PI * 2;
  const tiles = new Map();
  const R = Math.ceil(r * 1.4) + 1;

  for (let ty = -R; ty <= R; ty++) {
    for (let tx = -R; tx <= R; tx++) {
      const ax = x + tx, ay = y + ty;
      const dist = Math.hypot(tx + 0.5, ty + 0.5);
      const d = dist / r + (fbm(ax / 4.5, ay / 4.5, s, 2) - 0.5) * 0.75;
      if (d >= 1) continue;
      const t = 1 - d;
      let h;
      if (biome === 'atoll') {
        if (d < 0.6) continue;
        const ang = Math.atan2(ty + 0.5, tx + 0.5);
        let da = Math.abs(ang - passAngle); da = Math.min(da, Math.PI * 2 - da);
        if (da < 0.35) continue;
        h = d < 0.82 && fbm(ax / 2, ay / 2, s + 3) > 0.5 ? 2 : 1;
      } else if (B.volcano) {
        h = Math.max(1, Math.round(Math.pow(t, 0.9) * B.maxH * 1.15));
        if (d < 0.14 && r > 4) h -= 2;
      } else if (B.terraced) {
        h = 1 + 2 * Math.floor(t * B.maxH * (0.8 + 0.4 * fbm(ax / 3, ay / 3, s + 5)) / 2);
      } else if (B.cliffs) {
        h = t < 0.16 ? 1 : Math.round(B.maxH * (0.55 + 0.45 * t) * (0.8 + 0.3 * fbm(ax / 3, ay / 3, s + 5)));
      } else {
        h = 1 + Math.floor(t * B.maxH * (0.6 + 0.6 * fbm(ax / 3, ay / 3, s + 5)));
      }
      h = Math.max(1, Math.min(h, B.maxH + 1));
      tiles.set(ax + ',' + ay, h);
    }
  }
  if (tiles.size < 4) {
    tiles.set(x + ',' + y, 1); tiles.set(x + 1 + ',' + y, 1);
    tiles.set(x + ',' + (y + 1), 1); tiles.set(x + 1 + ',' + (y + 1), 1);
  }

  // Land list, shallows and coast (water tiles touching land, outside any lagoon).
  const land = [];
  const shallow = new Map();
  const coast = [];
  let peak = null;
  for (const [k, h] of tiles) {
    const [tx, ty] = k.split(',').map(Number);
    land.push({ tx, ty, h });
    if (!peak || h > peak.h) peak = { tx, ty, h };
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
      const nk = (tx + ox) + ',' + (ty + oy);
      if (tiles.has(nk)) continue;
      const dd = Math.max(Math.abs(ox), Math.abs(oy));
      const prev = shallow.get(nk);
      if (!prev || dd < prev) shallow.set(nk, dd);
    }
  }
  for (const [k, dd] of shallow) {
    if (dd !== 1) continue;
    const [tx, ty] = k.split(',').map(Number);
    const near4 = tiles.has((tx + 1) + ',' + ty) || tiles.has((tx - 1) + ',' + ty) || tiles.has(tx + ',' + (ty + 1)) || tiles.has(tx + ',' + (ty - 1));
    if (!near4) continue;
    if (biome === 'atoll' && Math.hypot(tx + 0.5 - x, ty + 0.5 - y) < r * 0.8) continue;
    coast.push({ x: tx + 0.5, y: ty + 0.5 });
  }
  land.sort((a, b) => (a.tx + a.ty) - (b.tx + b.ty) || a.tx - b.tx);

  // Occupied tiles: features (village, site, nodes) claim tiles before decoration.
  const used = new Set();
  const claim = (filter) => {
    const pool = land.filter(t => !used.has(t.tx + ',' + t.ty) && filter(t));
    if (!pool.length) return null;
    const t = pick(rnd, pool);
    used.add(t.tx + ',' + t.ty);
    return t;
  };

  let site = null;
  if (home || rnd() < (biome === 'sacre' ? 1 : 0.32)) {
    const options = SITE_IDS.filter(id => SITES[id].biomes.includes(biome));
    if (options.length) {
      const top = claim(t => t.h >= Math.max(1, peak.h - 2) && !(B.volcano && t.h < peak.h - 1 && false));
      if (top) site = { type: home ? 'marae' : pick(rnd, options), tx: top.tx, ty: top.ty, h: top.h };
    }
  }

  let village = null;
  if (home || (biome !== 'sacre' && biome !== 'volcan' && r >= 4 && rnd() < 0.32)) {
    const huts = [];
    const nh = home ? 4 : 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < nh; i++) {
      const t = claim(t => t.h <= 2);
      if (t) huts.push(t);
    }
    if (huts.length) {
      const prices = {};
      const produced = new Set(B.res.map(e => e[0]));
      for (const id of Object.keys(RES)) {
        prices[id] = +(RES[id].value * (produced.has(id) ? 0.7 : 1.4) * (0.8 + 0.4 * rnd()) * (1 + 0.1 * (zone - 1))).toFixed(2);
      }
      village = {
        name: home ? 'Fare Iti' : 'Village de ' + makeName(rnd, biome, false),
        huts, prices,
        chantier: home || (r >= 5.5 && rnd() < 0.55),
      };
    }
  }

  const nodes = [];
  const nn = home ? 4 : 2 + Math.floor(rnd() * 3) + (r > 6 ? 1 : 0);
  for (let i = 0; i < nn; i++) {
    const t = claim(() => true);
    if (!t) break;
    const res = home ? ['bois', 'fibre', 'coco', 'bois'][i] : pickWeighted(rnd, B.res);
    nodes.push({ res, max: (home ? 8 : 5) + Math.floor(rnd() * 7) + zone * 2, tx: t.tx, ty: t.ty, h: t.h });
  }
  if (rnd() < B.pearls) {
    const sh = [...shallow].filter(([, d]) => d === 1);
    if (sh.length) {
      const [k] = pick(rnd, sh);
      const [tx, ty] = k.split(',').map(Number);
      nodes.push({ res: 'perle', max: 2 + Math.floor(rnd() * 3) + zone, tx, ty, h: 0 });
    }
  }

  const fauna = [];
  const pool = B.fauna.slice();
  const nf = home ? 2 : 1 + Math.floor(rnd() * 2.6);
  for (let i = 0; i < nf && pool.length; i++) {
    const sp = pickWeighted(rnd, pool.map(id => [id, 1 / SPECIES[id].rare]));
    pool.splice(pool.indexOf(sp), 1);
    fauna.push(sp);
  }

  const deco = [];
  for (const t of land) {
    if (used.has(t.tx + ',' + t.ty)) continue;
    if (B.volcano && t.h >= peak.h - 1) continue;
    const beach = t.h === 1 && biome !== 'mangrove';
    if (rnd() > (beach ? 0.22 : 0.45)) continue;
    const kind = beach ? (rnd() < 0.8 ? 'palm' : 'rock') : pickWeighted(rnd, B.deco);
    deco.push({ kind, tx: t.tx, ty: t.ty, h: t.h, s: rnd() });
  }

  return {
    id: cx + ',' + cy, cx, cy, x: x + 0.5, y: y + 0.5, r, zone, biome, home,
    name: home ? 'Motu Iti' : makeName(rnd, biome, r < 4.2),
    tiles, land, shallow, coast, peak, site, village, nodes, fauna, deco,
  };
}

export function islandsInRect(x0, y0, x1, y1) {
  const out = [];
  const c0x = Math.floor(x0 / CELL) - 1, c1x = Math.ceil(x1 / CELL) + 1;
  const c0y = Math.floor(y0 / CELL) - 1, c1y = Math.ceil(y1 / CELL) + 1;
  for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
    const isle = islandAtCell(cx, cy);
    if (isle) out.push(isle);
  }
  return out;
}

export const islandById = id => { const [cx, cy] = id.split(',').map(Number); return islandAtCell(cx, cy); };

const nkey = (tx, ty) => (tx + 1e5) * 2e5 + (ty + 1e5);
const lcache = new Map(); // cell -> nearby islands' land as numeric-key maps
function landNear(cx, cy) {
  const k = cx * 100003 + cy;
  let m = lcache.get(k);
  if (m) return m;
  m = new Map();
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    const isle = islandAtCell(cx + ox, cy + oy);
    if (isle) for (const t of isle.land) m.set(nkey(t.tx, t.ty), t.h);
  }
  if (lcache.size > 400) lcache.delete(lcache.keys().next().value);
  lcache.set(k, m);
  return m;
}

export function landAt(x, y) {
  return landNear(Math.round(x / CELL), Math.round(y / CELL)).get(nkey(Math.floor(x), Math.floor(y))) || 0;
}

export function nearestIsland(x, y, maxDist = Infinity) {
  let best = null, bd = maxDist;
  for (const isle of islandsInRect(x - 1, y - 1, x + 1, y + 1)) {
    const d = Math.hypot(isle.x - x, isle.y - y) - isle.r;
    if (d < bd) { bd = d; best = isle; }
  }
  return best;
}

// Closest coast tile of an island to a point: where boats tie up.
export function dockPoint(isle, fromX, fromY) {
  let best = isle.coast[0], bd = Infinity;
  for (const c of isle.coast) {
    const d = Math.hypot(c.x - fromX, c.y - fromY);
    if (d < bd) { bd = d; best = c; }
  }
  return best || { x: isle.x + isle.r + 1, y: isle.y };
}
