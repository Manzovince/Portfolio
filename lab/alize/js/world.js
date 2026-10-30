import * as THREE from 'three';
import { hash, rng, fbm, vnoise } from './noise.js?v=1';
import { toon, smooth } from './util.js?v=1';
import { treeGeometry, rockGeometry, makeLighthouse, buildVillage } from './models.js?v=1';

export const CELL = 520;
// Île de départ, faite main : une grande île avec une anse au sud qui abrite le port.
export const START = {
  x: 0, z: -150, r: 140, peak: 48, seed: 7, kind: 'start', warp: 0.22,
  cove: { x: 0, z: -52, r: 44 },
};
export const SPAWN = { x: 0, z: -46, heading: Math.PI };

const PALETTES = {
  start:  { sand: '#ecd9a2', wet: '#d6c08a', grass: '#7cc24e', grass2: '#64ad45', rock: '#9a8f86', rock2: '#857b74', snow: '#eef0f4', beach: 1.6 },
  forest: { sand: '#ecd9a2', wet: '#d6c08a', grass: '#6fbb48', grass2: '#58a43f', rock: '#94898a', rock2: '#7d7377', snow: '#eef0f4', beach: 1.5 },
  rocky:  { sand: '#ddd0a8', wet: '#c6b88e', grass: '#8cb85a', grass2: '#79a64e', rock: '#8c8f9c', rock2: '#767987', snow: '#eef0f4', beach: 1.0 },
  dune:   { sand: '#f2dea2', wet: '#dcc68a', grass: '#b2c466', grass2: '#9fb55a', rock: '#c2a888', rock2: '#ad9478', snow: '#f2dea2', beach: 3.2 },
};

export function islandHeight(is, x, z) {
  const dx = x - is.x, dz = z - is.z, d2 = dx * dx + dz * dz, R = is.r * 1.45;
  if (d2 > R * R) return -20;
  const d = Math.sqrt(d2) / is.r + (fbm(x * 0.011, z * 0.011, is.seed, 3) - 0.5) * (is.warp ?? 0.5);
  let h;
  if (d > 0.9) {
    h = Math.max(-20, -(d - 0.9) * 30);
  } else {
    const u = (0.9 - d) / 0.9;
    const ridge = 1 - Math.abs(fbm(x * 0.028, z * 0.028, is.seed + 5, 3) * 2 - 1);
    h = 1.4 * smooth(0, 0.09, u) + is.peak * Math.pow(smooth(0.05, 1, u), 1.5) * (0.7 + 0.6 * ridge);
  }
  if (is.cove) {
    const c = is.cove;
    const cd = Math.hypot(x - c.x, z - c.z) / c.r + (vnoise(x * 0.06, z * 0.06, 3) - 0.5) * 0.18;
    if (cd < 1.2) {
      const k = smooth(0.75, 1.2, cd);
      h = Math.min(h, -6 * (1 - k) + h * k);
    }
  }
  return h;
}

const WIN_OFF = new THREE.Color('#3a3f52'), WIN_ON = new THREE.Color('#ffd27a');
const LAMP_DAY = new THREE.Color('#cfe4ea'), LAMP_ON = new THREE.Color('#fff4c0'), LAMP_DEAD = new THREE.Color('#4a5058');

const cellCache = new Map();
export function cellIslands(ci, cj) {
  const key = ci + ',' + cj;
  let list = cellCache.get(key);
  if (list) return list;
  list = [];
  const R = rng(Math.floor(hash(ci, cj, 1234) * 4294967296));
  const roll = R();
  const n = roll < 0.22 ? 0 : roll < 0.78 ? 1 : 2;
  for (let k = 0; k < n; k++) {
    const r = 22 + Math.pow(R(), 1.6) * 68;
    const m = r * 1.3 + 8;
    let x0 = ci * CELL, w = CELL;
    if (n === 2) { w = CELL / 2; if (k === 1) x0 += CELL / 2; }
    const x = x0 + m + R() * Math.max(0, w - 2 * m);
    const z = cj * CELL + m + R() * (CELL - 2 * m);
    const peakRatio = 0.12 + R() * 0.42;
    const kr = R();
    const kind = kr < 0.18 ? 'dune' : peakRatio > 0.42 ? 'rocky' : 'forest';
    const isl = {
      id: key + ':' + k, x, z, r, seed: Math.floor(R() * 1e6), kind,
      peak: kind === 'dune' ? r * 0.08 + 3 : r * peakRatio,
      lighthouse: R() < 0.3,
    };
    if (Math.hypot(x - START.x, z - START.z) < START.r * 1.35 + r * 1.35 + 40) continue;
    isl.name = islandName(isl);
    list.push(isl);
  }
  cellCache.set(key, list);
  return list;
}

const NAMES = {
  forest: [['Île des', 'Île aux'], ['Lucioles', 'Ramiers', 'Fougères', 'Mûriers', 'Grives', 'Pins', 'Brumes', 'Sources', 'Cigales', 'Lanternes', 'Échos', 'Murmures', 'Fanaux', 'Songes', 'Saules', 'Hérons', 'Mésanges', 'Glycines']],
  rocky: [['Pic', 'Rocher', 'Mont', 'Écueil'], ['Pâle', 'du Guetteur', 'Noir', 'des Albatros', 'aux Corbeaux', 'de Brume', 'du Vent', 'Solitaire', 'des Orages', 'Gris', 'des Phoques', 'Fendu', 'des Fous', 'Bleu']],
  dune: [['Banc', 'Atoll', 'Îlot'], ['Doré', 'des Sternes', 'de Sable', 'Blond', 'des Coquillages', 'du Lagon', 'des Tortues', 'Tranquille', 'du Midi', 'des Palmes', 'Clair']],
};
function islandName(is) {
  const [a, b] = NAMES[is.kind];
  return a[is.seed % a.length] + ' ' + b[Math.floor(is.seed / 7) % b.length];
}
START.id = 'start';
START.name = 'Port-Alizé';

// Îles dont la zone touche (x, z), île de départ comprise.
export function islandsNear(x, z, radius = 0) {
  const out = [];
  const near = (is) => Math.hypot(is.x - x, is.z - z) < is.r * 1.45 + radius;
  if (near(START)) out.push(START);
  const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
  const span = 1 + Math.ceil(radius / CELL);
  for (let dj = -span; dj <= span; dj++) {
    for (let di = -span; di <= span; di++) {
      for (const is of cellIslands(ci + di, cj + dj)) if (near(is)) out.push(is);
    }
  }
  return out;
}

export function heightAt(x, z) {
  let h = islandHeight(START, x, z);
  const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      for (const is of cellIslands(ci + di, cj + dj)) {
        const v = islandHeight(is, x, z);
        if (v > h) h = v;
      }
    }
  }
  return h;
}

export class World {
  constructor(scene, isLit = () => false) {
    this.scene = scene;
    this.isLit = isLit;
    this.cells = new Map();
    this.queue = [];
    this.lighthouses = new Set();
    this.groupColliders = new Map();
    this.colliders = [];
    this.surfaces = [];
    this.terrainMat = toon(0xffffff, { vertexColors: true });
    this.treeMat = toon(0xffffff, { vertexColors: true });
    this.rockMat = toon(0xffffff, { vertexColors: true });
    this.treeGeos = { round: treeGeometry('round'), pine: treeGeometry('pine'), palm: treeGeometry('palm') };
    this.rockGeo = rockGeometry();

    const start = this.buildIsland(START);
    scene.add(start);
    const v = buildVillage(START, heightAt);
    scene.add(v.group);
    this.windowMat = v.windowMat;
    const col = this.groupColliders.get(start);
    for (const [x, z] of v.houses) col.push({ x, z, r: 3.3 });
    if (v.lighthouse) {
      Object.assign(v.lighthouse, { lit: true, id: 'start', pos: v.lighthouse.group.position.clone() });
      this.lighthouses.add(v.lighthouse);
      col.push({ x: v.lighthouse.pos.x, z: v.lighthouse.pos.z, r: 2.7 });
    }
    this.surfaces.push(v.pier);
    this.refreshColliders();
  }

  refreshColliders() {
    this.colliders = [].concat(...this.groupColliders.values());
  }

  // Sol praticable à pied : terrain ou ponton.
  groundAt(x, z) {
    let h = heightAt(x, z);
    for (const s of this.surfaces) {
      if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) h = Math.max(h, s.y);
    }
    return h;
  }

  update(px, pz) {
    const ci = Math.floor(px / CELL), cj = Math.floor(pz / CELL);
    for (let dj = -2; dj <= 2; dj++) {
      for (let di = -2; di <= 2; di++) {
        const key = (ci + di) + ',' + (cj + dj);
        if (this.cells.has(key)) continue;
        const cell = { ci: ci + di, cj: cj + dj, groups: [], dead: false };
        this.cells.set(key, cell);
        for (const is of cellIslands(ci + di, cj + dj)) this.queue.push({ cell, is });
      }
    }
    for (const [key, cell] of this.cells) {
      if (Math.max(Math.abs(cell.ci - ci), Math.abs(cell.cj - cj)) <= 3) continue;
      cell.dead = true;
      for (const g of cell.groups) this.dispose(g);
      this.cells.delete(key);
    }
    if (this.queue.length) {
      this.queue = this.queue.filter((q) => !q.cell.dead);
      let bi = 0, bd = Infinity;
      this.queue.forEach((q, i) => {
        const d = Math.hypot(q.is.x - px, q.is.z - pz);
        if (d < bd) { bd = d; bi = i; }
      });
      const [item] = this.queue.splice(bi, 1);
      if (item) {
        const g = this.buildIsland(item.is);
        item.cell.groups.push(g);
        this.scene.add(g);
        this.refreshColliders();
      }
    }
  }

  dispose(group) {
    this.scene.remove(group);
    group.traverse((o) => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.isInstancedMesh) o.dispose();
    });
    if (group.userData.lighthouse) this.lighthouses.delete(group.userData.lighthouse);
    this.groupColliders.delete(group);
    this.refreshColliders();
  }

  buildIsland(is) {
    const group = new THREE.Group();
    group.position.set(is.x, 0, is.z);
    const colliders = [];
    this.groupColliders.set(group, colliders);
    const pal = Object.fromEntries(Object.entries(PALETTES[is.kind]).map(([k, v]) => [k, typeof v === 'string' ? new THREE.Color(v) : v]));
    const ext = is.r * 1.2, step = Math.max(2.4, is.r / 26), n = Math.ceil((2 * ext) / step), N1 = n + 1;
    const H = new Float32Array(N1 * N1);
    for (let j = 0; j < N1; j++) {
      for (let i = 0; i < N1; i++) H[j * N1 + i] = islandHeight(is, is.x - ext + i * step, is.z - ext + j * step);
    }

    const pos = [], col = [];
    const c = new THREE.Color();
    const V = (i, j) => [-ext + i * step, Math.max(H[j * N1 + i], -5), -ext + j * step];
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = V(i, j), b = V(i + 1, j), cc = V(i + 1, j + 1), d = V(i, j + 1);
        const tris = (i + j) & 1 ? [[a, d, b], [b, d, cc]] : [[a, d, cc], [a, cc, b]];
        for (const t of tris) {
          if (t[0][1] < -3 && t[1][1] < -3 && t[2][1] < -3) continue;
          e1.set(t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]);
          e2.set(t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]);
          const ny = e1.cross(e2).normalize().y;
          const ah = (t[0][1] + t[1][1] + t[2][1]) / 3;
          const cx = is.x + (t[0][0] + t[1][0] + t[2][0]) / 3, cz = is.z + (t[0][2] + t[1][2] + t[2][2]) / 3;
          const nz = vnoise(cx * 0.08, cz * 0.08, is.seed);
          if (ah < 0.25) c.copy(pal.wet);
          else if (ah < pal.beach + nz * 0.8) c.copy(pal.sand);
          else if (ny < 0.72) c.copy(nz > 0.5 ? pal.rock : pal.rock2);
          else if (is.peak > 34 && ah > is.peak * 0.8 + nz * 4) c.copy(pal.snow);
          else c.copy(nz > 0.5 ? pal.grass : pal.grass2);
          c.multiplyScalar(0.96 + hash(i, j, is.seed) * 0.08);
          for (const p of t) { pos.push(p[0], p[1], p[2]); col.push(c.r, c.g, c.b); }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, this.terrainMat);
    terrain.castShadow = terrain.receiveShadow = true;
    group.add(terrain);

    // Végétation.
    const R = rng(is.seed);
    const area = is.r * is.r;
    const count = Math.min(280, Math.floor(area * (is.kind === 'dune' ? 0.004 : is.kind === 'rocky' ? 0.012 : 0.03)));
    const byType = { round: [], pine: [], palm: [] };
    const tint = new THREE.Color();
    for (let k = 0, tries = 0; k < count && tries < count * 4; tries++) {
      const rx = (R() * 2 - 1) * is.r, rz = (R() * 2 - 1) * is.r;
      const wx = is.x + rx, wz = is.z + rz;
      const h = islandHeight(is, wx, wz);
      if (h < 1.8 || h > Math.max(6, is.peak * 0.85)) continue;
      const sl = Math.hypot(islandHeight(is, wx + 1.5, wz) - h, islandHeight(is, wx, wz + 1.5) - h);
      if (sl > 1.5) continue;
      if (is.cove && Math.hypot(wx - is.cove.x, wz - is.cove.z) < is.cove.r * 2.1) continue;
      k++;
      const type = is.kind === 'dune' ? 'palm' : is.kind === 'rocky' ? 'pine' : (R() < 0.8 ? 'round' : 'pine');
      const s = 0.7 + R() * 0.7;
      byType[type].push({ x: rx, y: h - 0.3, z: rz, s, r: R() * Math.PI * 2, t: 0.85 + R() * 0.25 });
      colliders.push({ x: wx, z: wz, r: 0.6 * s });
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (const [type, list] of Object.entries(byType)) {
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(this.treeGeos[type], this.treeMat, list.length);
      list.forEach((t, i) => {
        q.setFromAxisAngle(up, t.r);
        m4.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
        im.setMatrixAt(i, m4);
        im.setColorAt(i, tint.setRGB(t.t, t.t, t.t));
      });
      im.castShadow = im.receiveShadow = true;
      group.add(im);
    }

    // Rochers sur l'estran.
    const rocks = [];
    for (let tries = 0; tries < 200 && rocks.length < 4 + is.r / 8; tries++) {
      const a = R() * Math.PI * 2, rr = is.r * (0.75 + R() * 0.4);
      const rx = Math.cos(a) * rr, rz = Math.sin(a) * rr;
      const h = islandHeight(is, is.x + rx, is.z + rz);
      if (h < -1.6 || h > 1.4) continue;
      const s = 0.8 + R() * 1.8;
      rocks.push({ x: rx, y: h, z: rz, s, a: R() * 6 });
      colliders.push({ x: is.x + rx, z: is.z + rz, r: s * 0.85 });
    }
    if (rocks.length) {
      const im = new THREE.InstancedMesh(this.rockGeo, this.rockMat, rocks.length);
      const rc = new THREE.Color(PALETTES[is.kind].rock);
      rocks.forEach((r, i) => {
        q.setFromEuler(new THREE.Euler(r.a, r.a * 2, 0));
        m4.compose(new THREE.Vector3(r.x, r.y, r.z), q, new THREE.Vector3(r.s, r.s, r.s));
        im.setMatrixAt(i, m4);
        im.setColorAt(i, rc);
      });
      im.castShadow = true;
      group.add(im);
    }

    // Phare éteint : à rallumer plus tard.
    if (is.lighthouse) {
      let best = null, bd = -1;
      for (let j = 0; j < N1; j++) {
        for (let i = 0; i < N1; i++) {
          const h = H[j * N1 + i];
          if (h < 1.8 || h > 7) continue;
          const x = -ext + i * step, z = -ext + j * step, d = x * x + z * z;
          if (d > bd) { bd = d; best = [x, h, z]; }
        }
      }
      if (best) {
        const lh = makeLighthouse();
        lh.id = is.id;
        lh.lit = this.isLit(is.id);
        lh.group.position.set(best[0], best[1] - 0.6, best[2]);
        lh.pos = new THREE.Vector3(is.x + best[0], best[1], is.z + best[2]);
        colliders.push({ x: lh.pos.x, z: lh.pos.z, r: 2.7 });
        group.add(lh.group);
        group.userData.lighthouse = lh;
        this.lighthouses.add(lh);
      }
    }
    return group;
  }

  setNight(night, t) {
    this.windowMat.color.copy(WIN_OFF).lerp(WIN_ON, night);
    for (const lh of this.lighthouses) {
      if (!lh.lit) {
        lh.lampMat.color.copy(LAMP_DEAD);
        lh.beam.visible = false;
        continue;
      }
      lh.lampMat.color.copy(LAMP_DAY).lerp(LAMP_ON, Math.min(1, night * 1.5 + (lh.flash || 0)));
      lh.beam.visible = night > 0.05;
      lh.beamMat.opacity = night * 0.28;
      lh.beam.rotation.y = t * 0.6;
      if (lh.flash) lh.flash = Math.max(0, lh.flash - 0.01);
    }
  }

  // Phare éteint le plus proche à portée de main.
  lighthouseNear(x, z, d = 6) {
    for (const lh of this.lighthouses) {
      if (!lh.lit && Math.hypot(lh.pos.x - x, lh.pos.z - z) < d) return lh;
    }
    return null;
  }
}
