// Tuiles isométriques 32×16, colonnes de terrain avec faces latérales, eau animée.
import { G } from './world.js';
import { canvas, shade, mix, hash2 } from './util.js';

export const TW = 32, TH = 16, LH = 8;

// Demi-largeur de la ligne y d'un losange 32×16
export const halfW = (y) => (y < 8 ? 2 * y + 2 : 2 * (15 - y) + 2);
// Bord inférieur du losange pour la colonne x
export const lowEdge = (x) => (x < 16 ? 8 + (x >> 1) : 15 - ((x - 16) >> 1));
export const highEdge = (x) => (x < 16 ? 7 - (x >> 1) : (x - 16) >> 1);

export const PAL = {
  sea: '#4fb8d4', seaL: '#86d8e6', reef: '#45cfc4', reefL: '#8ef0e0', deep: '#2f74a6', deepL: '#4b93c2',
  fresh: '#4aa6c8', freshL: '#8fd4e6', foam: '#f4fbfa',
  sand: '#f2d9a0', bsand: '#4b4552', grass: '#7cc464', forest: '#5aa04c', marsh: '#87a35c', jungle: '#3e9a4e',
  rock: '#a09a92', snow: '#eef3f8', ash: '#6e625e', path: '#dcc08a', moss: '#8e9a7c', lava: '#ff7a2a',
  dirt: '#b07a50', stone: '#8c857e', darkStone: '#5c5462',
};

const TOP = {
  [G.SAND]: PAL.sand, [G.BSAND]: PAL.bsand, [G.GRASS]: PAL.grass, [G.FOREST]: PAL.forest, [G.MARSH]: PAL.marsh,
  [G.JUNGLE]: PAL.jungle, [G.ROCK]: PAL.rock, [G.SNOW]: PAL.snow, [G.ASH]: PAL.ash, [G.PATH]: PAL.path, [G.MOSS]: PAL.moss,
};

function diamond(g, ox, oy, colFn) {
  for (let y = 0; y < 16; y++) {
    const hw = halfW(y);
    for (let x = 16 - hw; x < 16 + hw; x++) {
      const c = colFn(x, y);
      if (c) { g.fillStyle = c; g.fillRect(ox + x, oy + y, 1, 1); }
    }
  }
}

function topTexture(gr, v) {
  const base = TOP[gr];
  return (x, y) => {
    const r = hash2(x, y, v * 7 + gr * 131);
    const r2 = hash2(x >> 1, y, v * 3 + gr);
    switch (gr) {
      case G.SAND:
        if (r < 0.06) return shade(base, -0.12);
        if (r > 0.95) return shade(base, 0.35);
        if (r2 < 0.04) return '#e4c58a';
        return base;
      case G.BSAND:
        return r < 0.12 ? '#6a6272' : r > 0.94 ? '#8a8292' : base;
      case G.GRASS: case G.FOREST: case G.JUNGLE: case G.MARSH: {
        if (r < 0.07) return shade(base, -0.16);
        if (r > 0.93) return shade(base, 0.2);
        if (gr === G.FOREST && r2 > 0.97) return '#b9873f';
        if (gr === G.MARSH && r2 < 0.05) return '#6b7c4a';
        return base;
      }
      case G.ROCK: case G.MOSS:
        if (gr === G.MOSS && r2 > 0.55) return r > 0.5 ? '#86a466' : '#76945a';
        return r < 0.08 ? shade(base, -0.18) : r > 0.92 ? shade(base, 0.18) : base;
      case G.SNOW:
        return r < 0.06 ? '#d6e2ee' : r > 0.97 ? '#ffffff' : base;
      case G.ASH:
        return r < 0.1 ? '#5a4e4c' : r > 0.95 ? '#8a7c76' : base;
      case G.PATH:
        if (r < 0.05) return '#b89a68';
        if (r > 0.93) return '#efe0bc';
        return base;
    }
    return base;
  };
}

// Brins d'herbe dessinés par-dessus le haut de la tuile
function tufts(g, gr, v) {
  if (![G.GRASS, G.FOREST, G.JUNGLE, G.MARSH].includes(gr)) return;
  const base = TOP[gr];
  const n = 3 + (v % 3);
  for (let k = 0; k < n; k++) {
    const x = 6 + Math.floor(hash2(k, v, gr) * 20), y = 4 + Math.floor(hash2(v, k, gr + 9) * 8);
    if (halfW(y) < Math.abs(x - 16) + 2) continue;
    g.fillStyle = shade(base, -0.22); g.fillRect(x, y, 1, 1); g.fillRect(x + 2, y, 1, 1);
    g.fillStyle = shade(base, 0.18); g.fillRect(x + 1, y - 1, 1, 1);
  }
}

function sideColors(gr) {
  switch (gr) {
    case G.SAND: return { L: '#d8b878', R: '#e8c88e', line: '#c8a468', lip: null };
    case G.BSAND: return { L: '#3a3440', R: '#4a4450', line: '#2e2834', lip: null };
    case G.ROCK: case G.ASH: case G.MOSS: return { L: '#7a7270', R: '#948c86', line: '#625a5c', lip: gr === G.MOSS ? '#76945a' : null };
    case G.SNOW: return { L: '#7a7a88', R: '#9a98a4', line: '#62606e', lip: '#eef3f8' };
    case G.FRESH: return { L: '#8a5a3c', R: '#a06e4a', line: '#744a32', lip: null };
    case G.LAVA: return { L: '#4a3e44', R: '#5e5056', line: '#3a3036', lip: null };
    default: return { L: '#9a6844', R: '#b07a50', line: '#86583a', lip: TOP[gr] };
  }
}

// Colonne de terrain : losange + faces latérales de hauteur h niveaux
export function bakeColumn(gr, h, v, topOverride = null) {
  const hp = h * LH;
  const [c, g] = canvas(TW, TH + hp);
  const sc = sideColors(gr);
  for (let x = 0; x < 32; x++) {
    const y0 = lowEdge(x) + 1;
    const left = x < 16;
    for (let y = 0; y < hp; y++) {
      let col = left ? sc.L : sc.R;
      // strates : un trait par niveau, qui suit la pente
      if (y % LH === LH - 1 && y < hp - 1) col = sc.line;
      if ((gr === G.ROCK || gr === G.ASH || gr === G.SNOW || gr === G.MOSS || gr === G.LAVA) && hash2(x, y, h + v) < 0.07) col = shade(col, -0.15);
      if ((gr === G.SAND || gr === G.BSAND) && y >= hp - 2) col = shade(col, -0.18);
      if (x === 15 || x === 16) col = shade(col, x === 15 ? -0.06 : 0.08);
      g.fillStyle = col; g.fillRect(x, y0 + y, 1, 1);
    }
    // rebord d'herbe / neige qui déborde sur la face
    if (sc.lip && hp > 0) {
      const d = 1 + (hash2(x, v, gr) < 0.45 ? 1 : 0) + (hash2(x, v + 3, gr) < 0.15 ? 1 : 0);
      g.fillStyle = shade(sc.lip, -0.12); g.fillRect(x, y0, 1, d);
    }
  }
  if (gr === G.FRESH || gr === G.LAVA) {
    if (topOverride) diamond(g, 0, 0, topOverride);
  } else {
    diamond(g, 0, 0, topTexture(gr, v));
    tufts(g, gr, v);
  }
  return c;
}

// Eau : losange animé (mer, récif, mare, lave)
export function bakeWater(kind, frame) {
  const [c, g] = canvas(TW, TH);
  const base = { sea: PAL.sea, reef: PAL.reef, fresh: PAL.fresh, lava: PAL.lava }[kind];
  const light = { sea: PAL.seaL, reef: PAL.reefL, fresh: PAL.freshL, lava: '#ffd25a' }[kind];
  diamond(g, 0, 0, (x, y) => {
    if (kind === 'reef') {
      const r = hash2(x >> 1, y, 77);
      if (r < 0.05) return '#f08aa8';
      if (r > 0.96) return '#f6b860';
      if (r > 0.92) return '#9a7ad8';
      if (hash2(x >> 2, y >> 1, 78) < 0.18) return '#3ab8b0';
    }
    if (kind === 'lava') {
      const r = hash2(x >> 1, y >> 1, frame + 40);
      return r < 0.2 ? '#c8361e' : r > 0.85 ? light : base;
    }
    // reflets qui glissent
    const w = (x + frame * 4 + (y % 4) * 9) % 32;
    if ((y % 4 === 1) && w < 3 && hash2(y, frame, 5) > 0.25) return light;
    return base;
  });
  return c;
}

// Fond de haute mer en motif, à faire défiler
export function bakeDeep(frame) {
  const [c, g] = canvas(64, 32);
  g.fillStyle = PAL.deep; g.fillRect(0, 0, 64, 32);
  for (let k = 0; k < 6; k++) {
    const x = Math.floor(hash2(k, 1, 3) * 64), y = Math.floor(hash2(k, 2, 3) * 32);
    const len = 3 + Math.floor(hash2(k, 3, 3) * 4);
    const xx = (x + frame * 2) % 64;
    g.fillStyle = PAL.deepL;
    g.fillRect(xx, y, len, 1);
    if (xx + len > 64) g.fillRect(0, y, xx + len - 64, 1);
  }
  return c;
}

// Calques de bord : 0 = haut-gauche (voisin i-1), 1 = haut-droit (j-1), 2 = bas-droit (i+1), 3 = bas-gauche (j+1)
function edgePixels(e) {
  const pts = [];
  for (let x = 0; x < 32; x++) {
    if (e === 0 && x < 16) pts.push([x, highEdge(x)]);
    if (e === 1 && x >= 16) pts.push([x, highEdge(x)]);
    if (e === 2 && x >= 16) pts.push([x, lowEdge(x)]);
    if (e === 3 && x < 16) pts.push([x, lowEdge(x)]);
  }
  return pts;
}
export function bakeEdge(e, kind) {
  const [c, g] = canvas(TW, TH);
  for (const [x, y] of edgePixels(e)) {
    if (kind === 'rim') { g.fillStyle = 'rgba(255,250,230,0.35)'; g.fillRect(x, y, 1, 1); }
    if (kind === 'out') { g.fillStyle = 'rgba(42,34,56,0.3)'; g.fillRect(x, y, 1, 1); }
    if (kind === 'ao') {
      const dy = e === 0 || e === 1 ? 1 : -1;
      g.fillStyle = 'rgba(42,34,56,0.28)'; g.fillRect(x, y, 1, 1);
      g.fillStyle = 'rgba(42,34,56,0.14)'; g.fillRect(x, y + dy, 1, 1);
    }
  }
  return c;
}
export function bakeFoam(e, frame) {
  const [c, g] = canvas(TW, TH);
  const dy = e === 0 || e === 1 ? 1 : -1;
  for (const [x, y] of edgePixels(e)) {
    if (hash2(x >> 1, frame, e) < 0.8) { g.fillStyle = PAL.foam; g.fillRect(x, y, 1, 1); }
    if (hash2(x, frame + 7, e) < 0.35) { g.fillStyle = 'rgba(244,251,250,0.6)'; g.fillRect(x, y + dy * (1 + frame), 1, 1); }
  }
  return c;
}

export function bakeAll() {
  const T = { col: new Map(), water: {}, deep: [], edge: {}, foam: [] };
  for (const k of ['sea', 'reef', 'fresh', 'lava']) T.water[k] = [0, 1, 2, 3].map((f) => bakeWater(k, f));
  T.deep = [0, 1, 2, 3, 4, 5, 6, 7].map(bakeDeep);
  for (const kind of ['rim', 'out', 'ao']) T.edge[kind] = [0, 1, 2, 3].map((e) => bakeEdge(e, kind));
  T.foam = [0, 1].map((f) => [0, 1, 2, 3].map((e) => bakeFoam(e, f)));
  T.column = (gr, h, v) => {
    const key = gr * 1000 + h * 10 + v;
    let c = T.col.get(key);
    if (!c) { c = bakeColumn(gr, h, v); T.col.set(key, c); }
    return c;
  };
  return T;
}

export { mix };
