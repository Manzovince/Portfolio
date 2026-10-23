// Le monde : archipel procédural, terrain par morceaux, décor instancié, eau, Muséum et ponton.
import { THREE, scene, Builder, MAT, mesh, inject, U, textTex, curveGLSL } from './gfx.js?v=2';
import { mulberry32, fbm, vnoise, clamp, sstep, lerp, hash2, pick } from './util.js?v=2';

export const HALF = 720, SEA = -12, DEEP = -7;
export const TERRAIN = {
  prairie: { plateau: 1.4, hills: 3.2, sand: '#f0dcaa', g1: '#7cc35a', g2: '#97d266', cliff: '#a19b88' },
  foret: { plateau: 1.6, hills: 8, sand: '#d9c79a', g1: '#4a8447', g2: '#5d9a52', cliff: '#8a8a82', snow: 8.5 },
  desert: { plateau: .9, hills: 2.4, sand: '#efd9a2', g1: '#ebc47e', g2: '#e4b46c', cliff: '#c97a4a' },
  banquise: { plateau: 1.1, hills: 3, sand: '#c4dfeb', g1: '#e6eef4', g2: '#d6e3ec', cliff: '#7c8a96' },
  tropical: { plateau: 1.2, hills: 5, sand: '#f7ebc6', g1: '#5fc261', g2: '#7cd26a', cliff: '#8a8a72' },
};
const BIOME_IDX = { prairie: 1, foret: 2, desert: 3, banquise: 4, tropical: 5 };
const NAMES = {
  prairie: ['des Trèfles', 'du Moulin', 'aux Lièvres', 'des Coquelicots', 'Verte', 'du Pré', 'des Ruches', 'Bocagère', 'des Haies', 'du Vent'],
  foret: ['des Pins', 'des Brumes', 'du Lynx', 'Sombre', 'des Mousses', 'aux Cerfs', 'du Givre', 'des Sapins', 'du Hibou'],
  desert: ['des Dunes', 'du Mirage', 'Ocre', 'des Scorpions', 'du Soleil', 'Brûlée', 'des Sables', 'Fauve'],
  banquise: ['de Glace', 'des Aurores', 'Blanche', 'du Blizzard', 'des Phoques', 'Boréale', 'du Grand Froid', 'Polaire'],
  tropical: ['des Palmes', 'du Lagon', 'aux Aras', 'Corail', 'des Orchidées', 'Émeraude', 'des Lianes', 'Turquoise'],
};

export const islands = [];
const GC = 100, grid = new Map();
const gk = (cx, cz) => cx * 4096 + cz;
function islandH(isl, x, z) {
  const dx = x - isl.x, dz = z - isl.z, dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > isl.R + 48) return SEA;
  const warp = (fbm(x * .022 + isl.seed, z * .022 - isl.seed, 3) - .5) * Math.min(isl.R * .55, 24);
  const i = isl.R - (dist + warp);
  if (i < 0) return Math.max(SEA, -.4 + i * .35);
  const T = TERRAIN[isl.biome];
  let h = -.4 + 1.5 * sstep(0, 6, i) + T.plateau * sstep(4, 18, i) + T.hills * sstep(8, 30, i) * fbm(x * .04 + isl.seed, z * .04, 3);
  if (isl.biome === 'desert') h += (Math.sin(x * .22 + fbm(x * .03, z * .03, 2) * 6) * .5 + .5) * 1.3 * sstep(6, 16, i);
  if (isl.flat) { const f = isl.flat, dm = Math.hypot(x - f.x, z - f.z); h = lerp(h, f.h, sstep(f.r + 7, f.r, dm)); }
  return h;
}
export function H(x, z) {
  const l = grid.get(gk(Math.floor(x / GC), Math.floor(z / GC))); let h = SEA;
  if (l) for (let k = 0; k < l.length; k++) { const v = islandH(l[k], x, z); if (v > h) h = v; }
  return h;
}
export function islandAt(x, z, minH = -9) {
  const l = grid.get(gk(Math.floor(x / GC), Math.floor(z / GC))); let best = null, h = minH;
  if (l) for (const isl of l) { const v = islandH(isl, x, z); if (v > h) { h = v; best = isl; } }
  return best;
}
export const biomeAt = (x, z) => { const i = islandAt(x, z, DEEP); return i ? i.biome : 'ocean'; };

// Surfaces praticables hors terrain (ponton) et obstacles rectangulaires (bâtiments).
export const decks = [], boxes = [];
export function groundAt(x, z) {
  let h = H(x, z);
  for (const d of decks) if (x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1) h = Math.max(h, d.y);
  return h;
}
export const onDeck = (x, z) => decks.some(d => x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1);

// ---------- génération de l'archipel ----------
export const map = { N: 512 };
export let museumPos = null, dockInfo = null;
export function generate(seed) {
  const r = mulberry32(seed);
  islands.length = 0; grid.clear(); decks.length = 0; boxes.length = 0;
  islands.push({ id: 0, x: 0, z: 0, R: 74, biome: 'prairie', seed: r() * 900, start: true, flat: { x: 0, z: -12, r: 24, h: 2.4 }, name: 'Île du Muséum' });
  const sizes = [];
  for (let i = 0; i < 5; i++) sizes.push(42 + r() * 18);
  for (let i = 0; i < 17; i++) sizes.push(18 + r() * 14);
  for (let i = 0; i < 26; i++) sizes.push(6 + r() * 8);
  const band = z => { const zz = z + (r() - .5) * 160; return zz < -430 ? 'banquise' : zz < -170 ? 'foret' : zz < 190 ? 'prairie' : zz < 440 ? 'desert' : 'tropical'; };
  const all = Object.keys(TERRAIN);
  for (const R of sizes) for (let t = 0; t < 400; t++) {
    const x = (r() * 2 - 1) * (HALF - R - 40), z = (r() * 2 - 1) * (HALF - R - 40);
    if (islands.every(o => Math.hypot(o.x - x, o.z - z) > o.R + R + 38)) {
      islands.push({ id: islands.length, x, z, R, biome: r() < .14 ? pick(r, all) : band(z), seed: r() * 900 }); break;
    }
  }
  // chaque biome doit avoir au moins deux îles de bonne taille
  for (const b of all) {
    let n = islands.filter(i => i.biome === b && i.R >= 14).length;
    for (const i of islands) { if (n >= 2) break; if (!i.start && i.R >= 14 && islands.filter(o => o.biome === i.biome && o.R >= 14).length > 2) { i.biome = b; n++; } }
  }
  const used = new Set();
  for (const i of islands) if (!i.name) {
    const l = NAMES[i.biome].filter(n => !used.has((i.R >= 28 ? 'Île ' : 'Îlot ') + n));
    i.name = (i.R >= 28 ? 'Île ' : 'Îlot ') + (l.length ? pick(r, l) : pick(r, NAMES[i.biome]));
    used.add(i.name);
  }
  for (const isl of islands) {
    const rr = isl.R + 50;
    for (let cx = Math.floor((isl.x - rr) / GC); cx <= Math.floor((isl.x + rr) / GC); cx++)
      for (let cz = Math.floor((isl.z - rr) / GC); cz <= Math.floor((isl.z + rr) / GC); cz++) {
        const k = gk(cx, cz); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(isl);
      }
  }
  // carte d'altitude (eau, mini-carte)
  const N = map.N, ht = new Uint8Array(N * N), bm = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -HALF + (i + .5) / N * HALF * 2, z = -HALF + (j + .5) / N * HALF * 2, h = H(x, z);
    ht[j * N + i] = clamp(Math.round((h - SEA) / 16 * 255), 0, 255);
    const isl = h > DEEP ? islandAt(x, z, DEEP) : null; bm[j * N + i] = isl ? BIOME_IDX[isl.biome] : 0;
  }
  map.height = ht; map.biome = bm;
  heightTex.image = { data: ht, width: N, height: N }; heightTex.needsUpdate = true;
  buildMuseumExt();
  buildDock();
}
export const heightTex = new THREE.DataTexture(new Uint8Array(4), 2, 2, THREE.RedFormat);
heightTex.magFilter = heightTex.minFilter = THREE.LinearFilter;

// ---------- décor ----------
function tree(b, c1, c2, fruit) {
  b.limb('#8a5a36', [0, -.3, 0], [0, 2.2, 0], .32, .22); b.ball(c1, [0, 3.1, 0], [1.6, 1.4, 1.6]); b.ball(c1, [.85, 2.6, .3], .9); b.ball(c2, [-.7, 2.75, -.45], .85);
  if (fruit) for (let i = 0; i < 7; i++) { const a = i * 2.4; b.ball(fruit, [Math.cos(a) * 1.35, 2.7 + (i % 3) * .4, Math.sin(a) * 1.35], .17); }
}
function pine(b, c, snow) {
  b.limb('#6d4a30', [0, -.3, 0], [0, 1.1, 0], .24, .18);
  for (let i = 0; i < 3; i++) { b.cone(c, [0, 1.6 + i * .95, 0], 1.35 - i * .33, 1.7); if (snow) b.cone('#f4f8fb', [0, 2.05 + i * .95, 0], (1.35 - i * .33) * .55, .8); }
}
const PROPS = {
  arbre: { r: .7, top: 3.9, b: b => tree(b, '#4fae4f', '#5cbd57') },
  pommier: { r: .7, top: 3.9, b: b => tree(b, '#6cc45a', '#79cc62', '#e2483a') },
  buisson: { r: .6, b: b => { b.ball('#4f9c48', [-.4, .4, 0], .55); b.ball('#57a74e', [.35, .45, .1], .6); b.ball('#4f9c48', [0, .55, -.3], .5); } },
  fleursA: { r: 0, shadow: false, b: b => flowers(b, '#f6f0f0') },
  fleursB: { r: 0, shadow: false, b: b => flowers(b, '#f48fb1') },
  fleursC: { r: 0, shadow: false, b: b => flowers(b, '#ffd54f') },
  herbe: { r: 0, shadow: false, outline: false, b: b => { for (let i = 0; i < 4; i++) b.cone('#5aa844', [Math.cos(i * 1.7) * .15, .2, Math.sin(i * 1.7) * .15], .06, .45, [Math.cos(i) * .2, 0, Math.sin(i) * .2]); } },
  rocher: { r: .9, b: b => b.rock('#9a978c', [0, .15, 0], [1.1, .7, .95], [.3, .5, .1]) },
  rocherNoir: { r: .9, b: b => b.rock('#6f7a85', [0, .15, 0], [1.1, .8, .95], [.3, .5, .1]) },
  rocherRouge: { r: 1, b: b => { b.rock('#c98a5a', [0, .3, 0], [1.2, 1, 1.1], [.3, .5, .1]); b.rock('#d99a62', [.6, .2, .4], .55, [1, .2, .3]); } },
  sapin: { r: .55, top: 4.6, b: b => pine(b, '#2f6d4a') },
  sapin2: { r: .6, top: 5, b: b => { b.push; pine(b, '#3d7f50'); } },
  sapinNeige: { r: .55, top: 4.6, b: b => pine(b, '#2f6d4a', true) },
  champignon: { r: 0, shadow: false, b: b => { b.limb('#f2e8d4', [0, 0, 0], [0, .35, 0], .07, .06); b.ball('#d94a3a', [0, .38, 0], [.22, .12, .22]); b.ball('#ffffff', [.1, .47, .05], .035); b.ball('#ffffff', [-.08, .46, -.06], .03); } },
  cactus: { r: .45, b: b => { const c = '#4f9a5a'; b.limb(c, [0, -.2, 0], [0, 2.4, 0], .3, .28); b.ball(c, [0, 2.4, 0], .28); b.limb(c, [0, 1.1, 0], [.65, 1.1, 0], .17); b.limb(c, [.65, 1.1, 0], [.65, 1.8, 0], .17, .15); b.ball(c, [.65, 1.8, 0], .15);
    b.limb(c, [0, 1.5, 0], [-.55, 1.5, 0], .14); b.limb(c, [-.55, 1.5, 0], [-.55, 2, 0], .14, .12); b.ball('#e85a8a', [-.55, 2.06, 0], .12); } },
  herbeSeche: { r: 0, shadow: false, outline: false, b: b => { for (let i = 0; i < 5; i++) b.cone('#c9b06a', [Math.cos(i * 1.3) * .2, .2, Math.sin(i * 1.3) * .2], .05, .45, [Math.cos(i) * .35, 0, Math.sin(i) * .35]); } },
  palmier: { r: .4, top: 4.3, b: b => { let p = [0, -.2, 0];
    for (let i = 0; i < 5; i++) { const q = [p[0] + .18 + i * .03, p[1] + .9, 0]; b.limb(i % 2 ? '#a07a50' : '#8f6a44', p, q, .2 - i * .02, .18 - i * .02); p = q; }
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); b.ball('#3f9a4a', [p[0] + c * 1.05, p[1] - .25, s * 1.05], [1.2, .07, .32], [0, -a, -.35]); }
    b.ball('#6a4a2a', [p[0] + .1, p[1] - .2, .15], .16); b.ball('#6a4a2a', [p[0] - .1, p[1] - .22, -.12], .15); } },
  hibiscus: { r: .6, b: b => { b.ball('#3f9a4a', [-.3, .45, 0], .55); b.ball('#46a650', [.3, .5, .1], .6); for (let i = 0; i < 5; i++) b.ball('#ff5a7a', [Math.cos(i * 1.3) * .55, .75 + (i % 2) * .2, Math.sin(i * 1.3) * .45], .13); } },
  glace: { r: 1.1, b: b => { b.rock('#dff1f8', [0, .5, 0], [1.2, 1.5, 1.1], [.1, .6, .2]); b.rock('#c8e6f2', [.7, .3, .4], .6, [.6, .2, .1]); } },
  coquillage: { r: 0, shadow: false, b: b => { b.ball('#f6d8c8', [0, .05, 0], [.18, .06, .16]); b.ball('#f0bfa8', [0, .08, 0], [.1, .05, .1]); } },
};
function flowers(b, c) {
  for (let i = 0; i < 3; i++) { const x = Math.cos(i * 2.1) * .25, z = Math.sin(i * 2.1) * .25;
    b.limb('#4f8a3a', [x, 0, z], [x, .4 + i * .05, z], .025); b.ball(c, [x, .45 + i * .05, z], .11); b.ball('#ffe27a', [x + .06, .47 + i * .05, z], .05); }
}
const propGeo = {};
for (const [k, d] of Object.entries(PROPS)) { const b = new Builder(); d.b(b); propGeo[k] = b.merged(); }
const TABLES = {
  prairie: [['arbre', .045], ['pommier', .014], ['buisson', .03], ['fleursA', .04], ['fleursB', .04], ['fleursC', .03], ['herbe', .12], ['rocher', .008]],
  foret: [['sapin', .13], ['sapin2', .07], ['arbre', .01], ['champignon', .03], ['herbe', .06], ['rocher', .015], ['buisson', .02]],
  desert: [['cactus', .025], ['rocherRouge', .015], ['herbeSeche', .05], ['palmier', .004]],
  banquise: [['glace', .018], ['rocherNoir', .012], ['sapinNeige', .025]],
  tropical: [['palmier', .06], ['hibiscus', .04], ['herbe', .08], ['fleursB', .03], ['rocher', .006], ['buisson', .02]],
};
const BEACH = {
  prairie: [['coquillage', .012], ['rocher', .005]], foret: [['rocher', .01]], desert: [['coquillage', .01], ['rocherRouge', .005]],
  banquise: [['glace', .01], ['rocherNoir', .006]], tropical: [['palmier', .025], ['coquillage', .025]],
};
function roll(r, table) { let x = r(); for (const [n, p] of table) { x -= p; if (x < 0) return n; } return null; }

// Obstacles circulaires (arbres, rochers), rangés par cases de 8 m.
const OC = 8, obs = new Map();
function addObs(o) { const k = gk(Math.floor(o.x / OC), Math.floor(o.z / OC)); if (!obs.has(k)) obs.set(k, []); obs.get(k).push(o); }
export function obstaclesNear(x, z, out = []) {
  out.length = 0; const cx = Math.floor(x / OC), cz = Math.floor(z / OC);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = obs.get(gk(cx + i, cz + j)); if (l) for (const o of l) out.push(o); }
  return out;
}
export function treesNear(x, z, r) {
  const res = [], n = Math.ceil(r / OC);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const l = obs.get(gk(Math.floor(x / OC) + i, Math.floor(z / OC) + j)); if (l) for (const o of l) if (o.top && Math.hypot(o.x - x, o.z - z) < r) res.push(o); }
  return res;
}
const exclusions = [];

// ---------- morceaux de terrain ----------
const CH = 64, SEG = 32, chunks = new Map(), _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const colorCache = {};
const col = h => colorCache[h] || (colorCache[h] = new THREE.Color(h));
function buildChunk(cx, cz) {
  const x0 = cx * CH, z0 = cz * CH, key = gk(cx, cz);
  const near = islands.filter(i => { const nx = clamp(i.x, x0, x0 + CH), nz = clamp(i.z, z0, z0 + CH); return Math.hypot(i.x - nx, i.z - nz) < i.R + 48; });
  if (!near.length) { chunks.set(key, { empty: true }); return; }
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(CH, CH, SEG, SEG); geo.rotateX(-Math.PI / 2); geo.translate(x0 + CH / 2, 0, z0 + CH / 2);
  const P = geo.attributes.position; let maxH = SEA;
  for (let i = 0; i < P.count; i++) { const h = H(P.getX(i), P.getZ(i)); P.setY(i, h); if (h > maxH) maxH = h; }
  if (maxH < -9.5) { chunks.set(key, { empty: true }); geo.dispose(); return; }
  geo.computeVertexNormals();
  const N = geo.attributes.normal, cols = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), h = P.getY(i), isl = islandAt(x, z, -20), T = TERRAIN[isl ? isl.biome : 'prairie'];
    let c;
    if (h < .85 + vnoise(x * .3, z * .3) * .35) c = T.sand;
    else if (N.getY(i) < .74) c = T.cliff;
    else if (T.snow && h > T.snow) c = '#eef3f5';
    else c = fbm(x * .07, z * .07, 2) > .55 ? T.g2 : T.g1;
    col(c).toArray(cols, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const t = new THREE.Mesh(geo, MAT.toon); t.receiveShadow = true; g.add(t);
  // décor
  const r = mulberry32(key * 7919 + 13), inst = {};
  for (let gx = 0; gx < CH; gx += 2.5) for (let gz = 0; gz < CH; gz += 2.5) {
    const x = x0 + gx + r() * 2.5, z = z0 + gz + r() * 2.5, h = H(x, z), rv = r();
    if (h < .2) continue;
    if (exclusions.some(e => Math.hypot(x - e[0], z - e[1]) < e[2])) continue;
    const isl = islandAt(x, z); if (!isl) continue;
    const slope = Math.abs(H(x + 1, z) - h) + Math.abs(H(x, z + 1) - h); if (slope > 1.1) continue;
    const beach = h < 1.1;
    const type = roll(() => rv, beach ? BEACH[isl.biome] : TABLES[isl.biome]); if (!type) continue;
    const d = PROPS[type], s = .8 + r() * .5, ry = r() * Math.PI * 2;
    (inst[type] || (inst[type] = [])).push(new THREE.Matrix4().compose(_v.set(x, h - .05, z), _q.setFromAxisAngle(_up, ry), _s.set(s, s, s)));
    if (d.r) addObs({ x, z, r: d.r * s, top: d.top ? d.top * s + h : 0, y: h, type });
  }
  for (const [type, list] of Object.entries(inst)) {
    const d = PROPS[type], m = new THREE.InstancedMesh(propGeo[type], MAT.toon, list.length);
    list.forEach((mx, i) => m.setMatrixAt(i, mx)); m.castShadow = d.shadow !== false; m.receiveShadow = true; m.computeBoundingSphere(); g.add(m);
    if (d.outline !== false) { const o = new THREE.InstancedMesh(propGeo[type], MAT.outline, list.length); o.instanceMatrix = m.instanceMatrix; o.boundingSphere = m.boundingSphere; g.add(o); }
  }
  scene.add(g);
  chunks.set(key, { g, cx: x0 + CH / 2, cz: z0 + CH / 2 });
}
export function updateChunks(px, pz, budget = 1, radius = 230) {
  const R = Math.ceil(radius / CH), pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH), todo = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
    const cx = pcx + i, cz = pcz + j; if (Math.abs(cx * CH) > HALF + CH || Math.abs(cz * CH) > HALF + CH) continue;
    const d = Math.hypot((cx + .5) * CH - px, (cz + .5) * CH - pz);
    if (d < radius && !chunks.has(gk(cx, cz))) todo.push([d, cx, cz]);
  }
  todo.sort((a, b) => a[0] - b[0]);
  for (let k = 0; k < Math.min(budget, todo.length); k++) buildChunk(todo[k][1], todo[k][2]);
  for (const c of chunks.values()) if (c.g) c.g.visible = Math.hypot(c.cx - px, c.cz - pz) < radius + 30;
  return todo.length;
}
export function setChunksVisible(v) { for (const c of chunks.values()) if (c.g) c.g.visible = v; }

// ---------- eau ----------
export const waterU = {
  uHeight: { value: heightTex }, uHM: { value: new THREE.Vector3(-HALF, -HALF, HALF * 2) },
  uShallow: { value: new THREE.Color('#5fd6d6') }, uDeep: { value: new THREE.Color('#1f8fb8') }, uFoam: { value: new THREE.Color('#ffffff') },
  uFogColor: { value: new THREE.Color() }, uFogNear: { value: 80 }, uFogFar: { value: 260 }, uLight: { value: 1 },
  uCurve: U.uCurve, uFocus: U.uFocus, uTime: U.uTime,
};
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterU, transparent: true, depthWrite: false,
  vertexShader: `uniform float uCurve, uFocus, uTime; varying vec2 vW; varying float vFog;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.); w.y += sin(w.x * .15 + uTime * 1.1) * .06 + cos(w.z * .18 + uTime * 1.3) * .06;
      vW = w.xz; vec4 mv = viewMatrix * w; ${curveGLSL} vFog = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform sampler2D uHeight; uniform vec3 uHM, uShallow, uDeep, uFoam, uFogColor; uniform float uFogNear, uFogFar, uTime, uLight; varying vec2 vW; varying float vFog;
    void main(){ vec2 uv = (vW - uHM.xy) / uHM.z; float h = texture2D(uHeight, uv).r * 16. - 12.; float d = -h;
      vec3 col = mix(uShallow, uDeep, smoothstep(.6, 7.5, d));
      float n = sin(vW.x * .9 + uTime * 1.5) * sin(vW.y * .8 - uTime * 1.2);
      float foam = step(d + n * .12, .3) * step(-.5, d);
      float band = step(.985, sin(vW.x * .8 + vW.y * .45 + uTime * .9 + sin(vW.y * .5 + uTime * .4) * 2.)) * .3 * smoothstep(2., 6., d);
      col = mix(col, uFoam, max(foam * .85, band));
      float a = mix(.5, .93, smoothstep(.2, 5., d)); a = max(a, foam * .9);
      col *= uLight; col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vFog));
      gl_FragColor = vec4(col, a);
      #include <colorspace_fragment>
    }`,
});
const wgeo = new THREE.PlaneGeometry(760, 760, 76, 76); wgeo.rotateX(-Math.PI / 2);
export const water = new THREE.Mesh(wgeo, waterMat); water.renderOrder = 1; water.frustumCulled = false; scene.add(water);
const floorMat = inject(new THREE.MeshToonMaterial({ color: '#2a6a80' }));
export const seaFloor = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), floorMat); seaFloor.position.y = SEA - .1; scene.add(seaFloor);
export function updateWater(px, pz) { water.position.set(Math.round(px / 10) * 10, 0, Math.round(pz / 10) * 10); seaFloor.position.x = px; seaFloor.position.z = pz; }

// ---------- Muséum (extérieur) ----------
export const door = { x: 0, z: 1.8 };
function buildMuseumExt() {
  const y = islands[0].flat.h, mz = -9;
  museumPos = { x: 0, y, z: mz };
  door.z = mz + 9.2; door.y = y;
  const b = new Builder(), STONE = '#efe2c6', TRIM = '#d9c7a4', DARK = '#4a3424';
  // rotonde d'accueil, coiffée d'un dôme vert-de-gris
  b.cyl(TRIM, [0, .25, 0], 7.4, 7.6, .5, null, 28); b.cyl(STONE, [0, 3.3, 0], 6.6, 6.6, 5.6, null, 28); b.cyl(TRIM, [0, 6.25, 0], 7, 7, .5, null, 28);
  b.ball('#7fb8a4', [0, 6.4, 0], [6.4, 4.6, 6.4]); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; b.box('#5f9a86', [Math.cos(a) * 3.4, 9.6, Math.sin(a) * 3.4], [.25, .25, .25]); }
  b.cyl(STONE, [0, 11.2, 0], .9, 1.1, 1.4, null, 14); b.ball('#7fb8a4', [0, 12.1, 0], [1.05, .8, 1.05]); b.limb('#e9c46a', [0, 12.7, 0], [0, 13.8, 0], .06); b.ball('#e9c46a', [0, 13.9, 0], .14);
  for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + (k - 4.5) / 10 * Math.PI * 1.6; if (Math.abs(Math.cos(a)) < .3 && Math.sin(a) > 0) continue; b.box('#bfe0ea', [Math.cos(a) * 6.62, 3.6, Math.sin(a) * 6.62], [.12, 2.4, 1.1], [0, -a, 0]); }
  // portique d'entrée
  for (let i = 0; i < 4; i++) { const x = -3.3 + i * 2.2; b.limb('#f6ecd6', [x, .5, 8.1], [x, 5.4, 8.1], .3, .26); b.box(TRIM, [x, 5.4, 8.1], [.75, .2, .75]); b.box(TRIM, [x, .55, 8.1], [.75, .15, .75]); }
  b.box(TRIM, [0, 5.7, 7.7], [8.6, .45, 2.2]); b.geo(new THREE.CylinderGeometry(1, 1, 8.6, 3), '#e9dcc0', [0, 6.45, 7.7], [Math.PI / 2, 0, Math.PI / 2], [1.25, 1, .9]);
  for (let i = 0; i < 3; i++) b.box('#d9cfba', [0, .2 + (2 - i) * .25, 8.9 + i * .7], [8 + i * 1.3, .5, 1.6]);
  b.box(DARK, [0, 2, 6.75], [2.4, 3.4, .3]); b.box('#f3c66a', [0, 3.85, 6.8], [2.6, .3, .2]);
  // aile ouest : la serre des insectes
  b.box(STONE, [-12.5, 1.2, -1], [11, 2.4, 11]); b.box(TRIM, [-12.5, 2.5, -1], [11.4, .3, 11.4]);
  for (let k = 0; k < 5; k++) b.torus('#ffffff', [-12.5, 2.6, -5.5 + k * 2.25], 5.5, .1, Math.PI, null, [1, .75, 1]);
  b.part('glassG').geo(new THREE.CylinderGeometry(5.5, 5.5, 11, 20, 1, true, -Math.PI / 2, Math.PI), '#bfe8c8', [-12.5, 2.6, -1], [-Math.PI / 2, 0, 0], [1, 1, .75]);
  b.part('body');
  for (let k = 0; k < 4; k++) b.ball(['#5fb85a', '#4fae4f', '#ff8fb0', '#5fb85a'][k], [-15 + k * 1.7, 3.2 + (k % 2) * .5, -1 + (k % 2 ? 2 : -2)], .9);
  // aile est : l'aquarium (bleu, hublots)
  b.box('#cfe3ea', [12.5, 2.2, -1], [11, 4.4, 11]); b.box('#3f7f9a', [12.5, 4.6, -1], [11.6, .5, 11.6]); b.box('#4f9ab8', [12.5, 5.2, -1], [9, .8, 9]);
  for (const z of [-4, -1, 2]) { b.torus('#3f7f9a', [18.05, 2.4, z], .7, .14, Math.PI * 2, [0, Math.PI / 2, 0]); b.box('#7fd0e8', [18.03, 2.4, z], [.05, 1.2, 1.2]); }
  for (const x of [9.5, 12.5, 15.5]) { b.torus('#3f7f9a', [x, 2.4, 4.55], .7, .14, Math.PI * 2); b.box('#7fd0e8', [x, 2.4, 4.53], [1.2, 1.2, .05]); }
  b.ball('#ff8a1e', [12.5, 5.9, -1], [.9, .45, .25]); b.cone('#ff8a1e', [11.4, 5.9, -1], .4, .6, [0, 0, Math.PI / 2], [1, 1, .3]);
  // aile nord : la Grande Galerie, longue nef sous verrière
  b.box(STONE, [0, 2.8, -16], [12, 5.6, 18]); b.box(TRIM, [0, 5.7, -16], [12.6, .4, 18.6]);
  for (let k = 0; k < 7; k++) b.torus('#4a5a55', [0, 5.8, -24 + k * 2.7], 5.8, .12, Math.PI, null, [1, .6, 1]);
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) b.box('#bfe0ea', [sx * 6.03, 3.2, -22 + k * 3.2], [.1, 2.4, 1.4]);
  b.part('glass').geo(new THREE.CylinderGeometry(5.8, 5.8, 18, 20, 1, true, -Math.PI / 2, Math.PI), '#bfe3ef', [0, 5.8, -16], [-Math.PI / 2, 0, 0], [1, 1, .6]);
  const geos = b.geometries(), g = new THREE.Group(); g.position.set(0, y, mz);
  g.add(mesh(geos.body));
  const glassMat = c => inject(new THREE.MeshToonMaterial({ color: c, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
  g.add(new THREE.Mesh(geos.glass, glassMat('#cfeaf4'))); g.add(new THREE.Mesh(geos.glassG, glassMat('#d4f2da')));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, .95), inject(new THREE.MeshBasicMaterial({ map: textTex('MUSÉUM', 512, 116, '#2b2118', '#f3e6c8', 'bold 70px Georgia') })));
  sign.position.set(0, 5.72, 8.82); g.add(sign);
  scene.add(g);
  boxes.push({ x0: -6.8, x1: 6.8, z0: mz - 6.8, z1: mz + 6.9 }, { x0: -4.2, x1: 4.2, z0: mz + 6.9, z1: mz + 8.5 },
    { x0: -18.2, x1: -6.8, z0: mz - 6.7, z1: mz + 4.7 }, { x0: 6.8, x1: 18.2, z0: mz - 6.7, z1: mz + 4.7 }, { x0: -6.2, x1: 6.2, z0: mz - 25.3, z1: mz - 6.5 });
  exclusions.push([0, mz - 6, 24], [0, mz + 16, 10]);
}
function buildDock() {
  let z = 10, shore = null;
  while (z < 160) { const h = H(0, z); if (shore === null && h < .5) shore = z; if (h < -2.2) break; z += .5; }
  const z0 = shore - 3, z1 = z + 6, y = .75;
  dockInfo = { x: 0, z0, z1, y, boat: { x: 3.2, z: z1 - 2 } };
  const b = new Builder();
  for (let k = z0; k < z1; k += .7) b.box(((k * 10) | 0) % 2 ? '#a07a52' : '#94704a', [0, y - .1, k + .35], [2.6, .18, .62]);
  for (let k = z0 + 1; k < z1; k += 3) for (const s of [-1, 1]) b.limb('#6a4a30', [s * 1.35, y + .5, k], [s * 1.35, -4, k], .14);
  for (const s of [-1, 1]) b.limb('#6a4a30', [s * 1.35, y + .5, z1 - .3], [s * 1.35, y + .9, z1 - .3], .14);
  const m = mesh(b.merged()); scene.add(m);
  decks.push({ x0: -1.4, x1: 1.4, z0, z1, y });
  exclusions.push([0, (z0 + z1) / 2, 4], [0, z0 - 2, 4]);
}
