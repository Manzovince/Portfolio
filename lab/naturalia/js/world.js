// Génération de l'archipel : îles, relief en niveaux, sols, eau, décor.
import { mulberry32, fbm, vnoise, hash2, clamp } from './util.js';

export const MW = 150, MH = 150; // taille du monde en tuiles

// Types de sol
export const G = {
  DEEP: 0, SEA: 1, REEF: 2, FRESH: 3, SAND: 4, BSAND: 5, GRASS: 6, FOREST: 7, MARSH: 8,
  JUNGLE: 9, ROCK: 10, SNOW: 11, ASH: 12, LAVA: 13, PATH: 14, MOSS: 15,
};
export const isWater = (g) => g <= 3 || g === G.LAVA;
export const isSea = (g) => g <= 2;

export const BIOMES = {
  depart: { nom: 'Île du Musée', maxLv: 3 },
  prairie: { nom: 'Prairie', maxLv: 2 },
  foret: { nom: 'Forêt', maxLv: 3 },
  marais: { nom: 'Marais', maxLv: 2 },
  montagne: { nom: 'Montagne', maxLv: 8 },
  jungle: { nom: 'Jungle', maxLv: 3 },
  volcan: { nom: 'Île volcanique', maxLv: 6 },
  grotte: { nom: 'Îlot des grottes', maxLv: 4 },
};
export const BIOME_IDS = Object.keys(BIOMES);

// Objets de décor : solid = bloque le passage
export const SOLID = new Set(['chene', 'bouleau', 'sapin', 'sapinNeige', 'palmier', 'saule', 'kapok', 'buisson', 'fougere', 'rocher', 'rocherNeige', 'cactus', 'grotte', 'arbreMort']);

export function generate(seed) {
  const R = mulberry32(seed);
  const N = MW * MH;
  const W = {
    seed, w: MW, h: MH,
    height: new Uint8Array(N), ground: new Uint8Array(N), owner: new Int8Array(N).fill(-1),
    dist: new Uint8Array(N).fill(255), obj: new Array(N).fill(null), islands: [],
    pier: new Set(), museum: null, spawn: null, boat: null,
  };
  const idx = (i, j) => j * MW + i;
  W.idx = idx;
  W.inb = (i, j) => i >= 0 && j >= 0 && i < MW && j < MH;

  // --- 1. Placement des îles
  const isl = [{ x: MW / 2, y: MH / 2, r: 15, biome: 'depart' }];
  for (let t = 0; t < 8000 && isl.length < 17; t++) {
    const r = 5 + R() * 7;
    const x = r + 8 + R() * (MW - 2 * r - 16), y = r + 8 + R() * (MH - 2 * r - 16);
    if (isl.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + r + 7)) isl.push({ x, y, r, biome: null });
  }
  const s0 = isl[0];
  const rest = isl.slice(1).sort((a, b) => Math.hypot(a.x - s0.x, a.y - s0.y) - Math.hypot(b.x - s0.x, b.y - s0.y));
  const order = ['foret', 'marais', 'montagne', 'grotte', 'jungle', 'volcan'];
  const extra = ['prairie', 'foret', 'marais', 'jungle', 'montagne', 'volcan', 'grotte', 'prairie'];
  rest.forEach((o, k) => {
    o.biome = k < order.length ? order[k] : extra[Math.floor(R() * extra.length)];
    if (o.biome === 'montagne') o.r = Math.max(o.r, 9);
    if (o.biome === 'grotte') o.r = Math.min(o.r, 8);
  });
  W.islands = [s0, ...rest].map((o, k) => ({ ...o, id: k, nom: BIOMES[o.biome].nom }));

  // --- 2. Relief
  const fval = new Float32Array(N);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    let best = -9, own = -1;
    W.islands.forEach((o) => {
      const d = Math.hypot(i + 0.5 - o.x, j + 0.5 - o.y) / o.r;
      if (d > 2) return;
      const f = 1 - d + (fbm(i * 0.09, j * 0.09, seed + o.id * 31) - 0.5) * 0.75;
      if (f > best) { best = f; own = o.id; }
    });
    const k = idx(i, j);
    fval[k] = best;
    if (best <= 0) continue;
    const o = W.islands[own], b = o.biome, maxLv = BIOMES[b].maxLv;
    W.owner[k] = own;
    let lv;
    if (best < 0.13) lv = 1;
    else {
      const n = fbm(i * 0.11, j * 0.11, seed + 7);
      let raw = ((best - 0.13) / 0.87) * maxLv * (0.55 + 0.9 * n);
      if (b === 'montagne') raw = Math.pow((best - 0.13) / 0.87, 0.85) * maxLv * (0.7 + 0.5 * n);
      lv = clamp(2 + Math.floor(raw), 2, 9);
      if (b === 'marais') lv = 2;
    }
    W.height[k] = lv;
    W.ground[k] = groundFor(b, lv, best, i, j, seed);
  }
  // cratère du volcan
  W.islands.filter((o) => o.biome === 'volcan').forEach((o) => {
    let top = 0;
    forDisk(o.x, o.y, o.r, (i, j) => { if (W.owner[idx(i, j)] === o.id) top = Math.max(top, W.height[idx(i, j)]); });
    forDisk(o.x, o.y, Math.max(1.6, o.r * 0.2), (i, j) => {
      const k = idx(i, j);
      if (W.owner[k] === o.id && W.height[k] >= top - 1) { W.ground[k] = G.LAVA; W.height[k] = Math.max(2, top - 1); }
    });
  });

  // --- 3. Mares et lacs (eau douce)
  W.islands.forEach((o) => {
    const n = o.biome === 'marais' ? 7 : ['depart', 'foret', 'montagne', 'grotte', 'prairie', 'jungle'].includes(o.biome) ? 1 : 0;
    for (let p = 0; p < n; p++) {
      for (let t = 0; t < 60; t++) {
        const a = R() * Math.PI * 2, d = R() * o.r * (o.biome === 'marais' ? 0.6 : 0.45);
        const cx = Math.floor(o.x + Math.cos(a) * d), cy = Math.floor(o.y + Math.sin(a) * d);
        if (o.biome === 'depart' && Math.hypot(cx - o.x, cy - o.y) < 7) continue;
        const rad = o.biome === 'grotte' ? 1.2 : 1.4 + R() * 1.4;
        const cells = [];
        let ok = true, minH = 99;
        forDisk(cx + 0.5, cy + 0.5, rad + 1.5, (i, j) => {
          const k = idx(i, j);
          if (W.owner[k] !== o.id || W.height[k] < 2 || W.ground[k] === G.LAVA) ok = false;
        });
        if (!ok) continue;
        forDisk(cx + 0.5, cy + 0.5, rad, (i, j) => { const k = idx(i, j); cells.push(k); minH = Math.min(minH, W.height[k]); });
        cells.forEach((k) => { W.ground[k] = G.FRESH; W.height[k] = Math.max(1, minH - 1); });
        break;
      }
    }
  });

  // --- 4. Musée, chemin, ponton (île de départ)
  const ox = Math.floor(s0.x) - 3, oy = Math.floor(s0.y) - 5;
  const base = 3;
  for (let j = oy - 2; j < oy + 5 + 3; j++) for (let i = ox - 2; i < ox + 6 + 2; i++) {
    const k = idx(i, j);
    W.height[k] = base; W.ground[k] = G.GRASS; W.owner[k] = 0;
  }
  W.museum = { i: ox, j: oy, w: 6, d: 5, h: base, door: { i: ox + 3, j: oy + 5 } };
  // chemin vers +j jusqu'à la mer
  let pi = ox + 3, pj = oy + 5, prevH = base;
  const path = [];
  while (W.inb(pi, pj)) {
    const k = idx(pi, pj);
    if (W.height[k] === 0 || W.ground[k] === G.FRESH) break;
    const h = clamp(W.height[k], prevH - 1, prevH);
    W.height[k] = h; prevH = h;
    W.ground[k] = h <= 1 ? G.SAND : G.PATH;
    path.push(k);
    // élargit le chemin d'une tuile côté +i pour un rendu plus doux
    const k2 = idx(pi + 1, pj);
    if (W.height[k2] > 0 && W.ground[k2] !== G.FRESH) { W.height[k2] = h; W.ground[k2] = W.ground[k]; path.push(k2); }
    pj++;
  }
  // ponton sur 4 tuiles dans l'eau
  for (let n = 0; n < 4; n++) W.pier.add(idx(pi, pj + n));
  W.boat = { i: pi + 1.5, j: pj + 3.5 };
  W.spawn = { i: ox + 3.5, j: oy + 7.5 };
  W.pathSet = new Set(path);

  // --- 5. Distance à la terre + propriétaire des eaux (BFS)
  const q = [];
  for (let k = 0; k < N; k++) if (W.height[k] > 0 || W.ground[k] === G.FRESH) { W.dist[k] = 0; q.push(k); }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % MW, j = (k / MW) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (!W.inb(ni, nj)) continue;
      const nk = idx(ni, nj);
      if (W.dist[nk] !== 255) continue;
      W.dist[nk] = Math.min(254, W.dist[k] + 1);
      W.owner[nk] = W.owner[k];
      q.push(nk);
    }
  }
  for (let k = 0; k < N; k++) {
    if (W.height[k] > 0 || W.ground[k] === G.FRESH) continue;
    const o = W.owner[k] >= 0 ? W.islands[W.owner[k]] : null;
    const tropical = o && (o.biome === 'jungle' || o.biome === 'volcan');
    const d = W.dist[k];
    W.ground[k] = d <= 2 ? G.SEA : tropical && d <= 5 ? G.REEF : G.DEEP;
  }

  // --- 6. Décor
  const mus = W.museum;
  const reserved = (i, j) => (i >= mus.i - 2 && i < mus.i + mus.w + 2 && j >= mus.j - 2 && j < mus.j + mus.d + 3) || W.pathSet.has(idx(i, j));
  for (let j = 1; j < MH - 1; j++) for (let i = 1; i < MW - 1; i++) {
    const k = idx(i, j);
    if (W.height[k] === 0 || reserved(i, j)) continue;
    const g = W.ground[k];
    if (g === G.FRESH) { if (hash2(i, j, seed + 3) < 0.18) W.obj[k] = { t: 'nenuphar' }; continue; }
    if (g === G.LAVA || g === G.PATH) continue;
    const o = W.islands[W.owner[k]], b = o ? o.biome : 'depart';
    const r = hash2(i, j, seed + 11), v = Math.floor(hash2(i, j, seed + 12) * 4);
    const nearFresh = neighbors8(i, j).some(([a, c]) => W.ground[idx(a, c)] === G.FRESH);
    const nearSea = neighbors8(i, j).some(([a, c]) => W.height[idx(a, c)] === 0 && W.ground[idx(a, c)] !== G.FRESH);
    const pick = pickDecor(b, g, r, nearFresh, nearSea, W.height[k]);
    if (pick) W.obj[k] = { t: pick, v };
  }
  // entrées de grottes
  W.islands.filter((o) => o.biome === 'grotte').forEach((o) => {
    let n = 0;
    for (let t = 0; t < 300 && n < 4; t++) {
      const i = Math.floor(o.x + (R() - 0.5) * o.r * 1.6), j = Math.floor(o.y + (R() - 0.5) * o.r * 1.6);
      if (!W.inb(i, j)) continue;
      const k = idx(i, j);
      if (W.owner[k] !== o.id || W.height[k] < 2 || W.ground[k] === G.FRESH) continue;
      // il faut une tuile plus basse devant pour voir l'ouverture
      const front = idx(i + 1, j), front2 = idx(i, j + 1);
      if (W.height[front] >= W.height[k] && W.height[front2] >= W.height[k]) continue;
      W.obj[k] = { t: 'grotte', v: 0 };
      n++;
    }
  });
  // spawn et ponton dégagés
  W.pier.forEach((k) => (W.obj[k] = null));

  return W;

  function forDisk(cx, cy, r, f) {
    for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++) for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
      if (!W.inb(i, j)) continue;
      if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= r) f(i, j);
    }
  }
}

function neighbors8(i, j) {
  return [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1], [i + 1, j + 1], [i - 1, j - 1], [i + 1, j - 1], [i - 1, j + 1]];
}

function groundFor(b, lv, f, i, j, seed) {
  const n = fbm(i * 0.15, j * 0.15, seed + 99);
  if (lv === 1) {
    if (b === 'volcan') return G.BSAND;
    if (b === 'grotte' || b === 'montagne') return n > 0.55 ? G.ROCK : G.SAND;
    if (b === 'marais') return n > 0.5 ? G.MARSH : G.SAND;
    return G.SAND;
  }
  switch (b) {
    case 'depart': return n > 0.6 ? G.FOREST : G.GRASS;
    case 'prairie': return n > 0.68 ? G.FOREST : G.GRASS;
    case 'foret': return n < 0.32 ? G.GRASS : G.FOREST;
    case 'marais': return n > 0.62 ? G.GRASS : G.MARSH;
    case 'jungle': return G.JUNGLE;
    case 'montagne': return lv >= 7 ? G.SNOW : lv >= 5 ? (n > 0.5 ? G.ROCK : G.SNOW) : lv >= 4 ? G.ROCK : G.FOREST;
    case 'volcan': return lv >= 4 ? G.ROCK : G.ASH;
    case 'grotte': return n > 0.6 ? G.MOSS : G.ROCK;
  }
  return G.GRASS;
}

function pickDecor(b, g, r, nearFresh, nearSea, h) {
  if (g === G.SAND || g === G.BSAND) {
    if (b === 'jungle' && r < 0.08) return 'palmier';
    if (b === 'depart' && r < 0.015) return 'palmier';
    if (nearSea && r > 0.96) return 'rocher';
    if (r > 0.9) return 'coquillage';
    return null;
  }
  if (nearFresh && (g === G.MARSH || g === G.GRASS || g === G.FOREST) && r < 0.35) return 'roseau';
  switch (g) {
    case G.GRASS:
      if (b === 'montagne') return r < 0.1 ? 'sapin' : r > 0.85 ? 'fleur' : null;
      if (r < 0.035) return 'chene';
      if (r < 0.06) return 'buisson';
      if (r > 0.86) return 'fleur';
      if (r > 0.78) return 'herbe';
      return null;
    case G.FOREST:
      if (b === 'montagne') return r < 0.28 ? 'sapin' : r > 0.92 ? 'champignon' : null;
      if (r < 0.2) return 'chene';
      if (r < 0.27) return 'bouleau';
      if (r < 0.31) return 'buisson';
      if (r > 0.94) return 'champignon';
      if (r > 0.86) return 'herbe';
      return null;
    case G.MARSH:
      if (r < 0.07) return 'saule';
      if (r > 0.8) return 'roseau';
      if (r > 0.74) return 'herbe';
      return null;
    case G.JUNGLE:
      if (r < 0.1) return 'palmier';
      if (r < 0.17) return 'kapok';
      if (r < 0.3) return 'fougere';
      if (r > 0.92) return 'fleurTropic';
      return null;
    case G.ROCK:
      if (b === 'montagne' && h <= 4 && r < 0.08) return 'sapin';
      if (r < 0.07) return 'rocher';
      if (b === 'volcan' && r > 0.95) return 'cactus';
      return null;
    case G.MOSS:
      if (r < 0.06) return 'rocher';
      if (r > 0.85) return 'champignon';
      if (r > 0.75) return 'herbe';
      return null;
    case G.SNOW:
      if (r < 0.07) return 'sapinNeige';
      if (r < 0.1) return 'rocherNeige';
      return null;
    case G.ASH:
      if (r < 0.06) return 'cactus';
      if (r < 0.1) return 'rocher';
      if (r < 0.12) return 'arbreMort';
      return null;
  }
  return null;
}

// Pour l'herbe et le relief, valeur de bruit stable par tuile (variantes de texture)
export function tileVariant(i, j, seed) {
  return Math.floor(vnoise(i * 0.7, j * 0.7, seed + 5) * 3.999);
}
