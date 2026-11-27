import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ════════════════════════════════════════════════════════════════════
//  Bruit & aléatoire
// ════════════════════════════════════════════════════════════════════
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rnd = mulberry32(1);
const R = (a = 0, b = 1) => a + (b - a) * rnd();
let perm = new Uint8Array(512);
function seedNoise(seed) {
  const r = mulberry32(seed * 7 + 3), p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function g2(h, x, y) { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } }
function noise(x, y) {
  const fx = Math.floor(x), fy = Math.floor(y), X = fx & 255, Y = fy & 255; x -= fx; y -= fy;
  const u = fade(x), v = fade(y), a = perm[X] + Y, b = perm[X + 1] + Y;
  return lerp(lerp(g2(perm[a], x, y), g2(perm[b], x - 1, y), u), lerp(g2(perm[a + 1], x, y - 1), g2(perm[b + 1], x - 1, y - 1), u), v) * 0.75;
}
function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); f *= 2.03; a *= 0.5; } return s * 1.6; }

// ════════════════════════════════════════════════════════════════════
//  Monde : biomes (climat procédural), relief, eau, sentier
// ════════════════════════════════════════════════════════════════════
const SIZE = 340, HALF = SIZE / 2;
const AK = (SIZE / 260) ** 2;   // facteur de densité : les quantités d'objets suivent la surface
const WL = -3.6; // niveau de l'eau
let pathPh = [0, 0], clearing = new THREE.Vector2();
const pathX = z => 15 * Math.sin(z * 0.03 + pathPh[0]) + 7 * Math.sin(z * 0.083 + pathPh[1]);
// réseau : le grand sentier (pathX) + chemins de gravier + sentes étroites. Les deux derniers sont les lignes de niveau
// zéro d'un bruit auquel on ajoute le relief de fond : ils serpentent en suivant à peu près les courbes de niveau.
const trailF = (i, x, z) => i === 1 ? fbm(x * 0.0042 + 61, z * 0.0042 - 17, 2) + baseRelief(x, z) * 0.11
                                     : fbm(x * 0.0085 - 29, z * 0.0085 + 44, 2) * 0.8 + baseRelief(x, z) * 0.09 + 0.12;
const TRAIL_HW = [1.9, 1.25, 0.7];
function trailInfo(x, z) {
  let d0 = Math.abs(x - pathX(z)), best = { d: d0, hw: 1.9, s: 0 };
  if (ridgeMaskRaw(x, z) > 0.5) return best;
  for (let i = 1; i <= 2; i++) {
    const f = trailF(i, x, z); if (Math.abs(f) > 0.07) continue;
    const d = Math.abs(f) / (Math.hypot(trailF(i, x + 1, z) - f, trailF(i, x, z + 1) - f) + 1e-5), hw = TRAIL_HW[i];
    if (d - hw < best.d - best.hw) best = { d, hw, s: i };
  }
  return best;
}
const pathDist = (x, z) => { const t = trailInfo(x, z); return t.d + 1.9 - t.hw; };

// Chaque biome occupe une région du plan (température, humidité) ; deux champs de bruit
// à grande échelle donnent le climat en tout point, les poids sont un « soft-Voronoï ».
const BIOMES = [
  { id: 'foret',   name: 'Forêt',           t: 0.50, h: 0.52, trees: 1.0,  map: '#3f7a34', grass: 1.0, flowers: 1.0, tint: [1, 1, 1] },
  { id: 'pinede',  name: 'Pinède',          t: 0.12, h: 0.50, trees: 0.95, map: '#2a5546', grass: 0.45, flowers: 0.2, tint: [0.85, 0.95, 0.9] },
  { id: 'prairie', name: 'Prairie fleurie', t: 0.86, h: 0.36, trees: 0.08, map: '#a6c85c', grass: 2.0, flowers: 3.2, tint: [1.08, 1.08, 0.85] },
  { id: 'marais',  name: 'Marais',          t: 0.62, h: 0.92, trees: 0.3,  map: '#4f7a62', grass: 1.3, flowers: 0.5, tint: [0.85, 0.95, 0.85] },
  { id: 'savane', name: 'Savane',           t: 0.90, h: 0.24, trees: 0.22, map: '#c8b45a', grass: 2.2, flowers: 0.2, tint: [1.45, 1.15, 0.45] },
  { id: 'tropic', name: 'Forêt tropicale',  t: 0.88, h: 0.97, trees: 1.25, map: '#2f6a2c', grass: 0.4, flowers: 0.3, tint: [0.8, 1.0, 0.75] },
  { id: 'desert', name: 'Désert',           t: 0.95, h: 0.05, trees: 0.24, map: '#e2c286', grass: 0.12, flowers: 0.0, tint: [1.3, 1.1, 0.55] },
  { id: 'bambou', name: 'Bambouseraie',    t: 0.80, h: 0.72, trees: 0.55, map: '#8cbc4c', grass: 0.25, flowers: 0.1, tint: [1.05, 1.05, 0.85] },
  { id: 'automne', name: "Bois d'automne",  t: 0.30, h: 0.82, trees: 0.95, map: '#c8742e', grass: 0.7, flowers: 0.4, tint: [1.15, 1.0, 0.7] },
  { id: 'lande',   name: 'Lande rocheuse',  t: 0.24, h: 0.10, trees: 0.15, map: '#8a7a92', grass: 0.7, flowers: 0.5, tint: [1.1, 1.0, 0.75] },
  { id: 'montagne', name: 'Montagne',       special: true, t: 0.03, h: 0.74, trees: 0.95, map: '#8d949c', grass: 0.55, flowers: 0.3, tint: [0.92, 1.0, 0.95] },
  { id: 'littoral', name: 'Bord de mer',    special: true, t: 0.96, h: 0.14, trees: 0.4,  map: '#b9ae74', grass: 0.45, flowers: 0.35, tint: [1.15, 1.05, 0.7] },
];
const TREELINE = 13, SNOWLINE = 21;   // étages de montagne (altitude absolue)
// crêtes : bruit « ridged » (1 - |n|)², plusieurs octaves
function ridged(x, z) { let s = 0, a = 0.55, f = 0.011; for (let i = 0; i < 4; i++) { const n = 1 - Math.abs(noise(x * f + 31 * i, z * f - 17 * i) * 1.35); s += n * n * a; a *= 0.5; f *= 2.1; } return s / 1.03; }
const NB = BIOMES.length, BI = Object.fromEntries(BIOMES.map((b, i) => [b.id, i]));
let climOff = [0, 0, 0, 0];
// ── Géographie infinie : de très grands champs de bruit dessinent continents et mers, chaînes de
// montagnes (le long des lignes de niveau zéro d'un bruit), climat et rivières.
const gOff = { c: [0, 0], r: [0, 0], l: [0, 0] };
const continent = (x, z) => fbm(x * 0.0011 + gOff.c[0], z * 0.0011 + gOff.c[1], 3) * 1.5 + 0.16;   // < 0 : la mer
const seaDist = (x, z) => -continent(x, z) * 300;                                                    // ≈ mètres, > 0 en mer
function ridgeMaskRaw(x, z) {     // ≈ 1 sur l'arête d'une chaîne, 0 dans les plaines
  const n = fbm(x * 0.0017 + gOff.r[0], z * 0.0017 + gOff.r[1], 2), ridge = 1 - Math.abs(n) * 3.1;
  return smooth(0.3, 0.85, ridge + noise(x * 0.01 + 40, z * 0.01) * 0.08) * smooth(0.06, 0.32, continent(x, z)) * (0.65 + 0.35 * noise(x * 0.004 + 7, z * 0.004));
}
// multifractale à crêtes (Musgrave) sur des coordonnées déformées : arêtes, cols et vallons
function mountainH(x, z) {
  // relief alpin : arêtes vives (multifractale ridged), crêtes qui serpentent (déformation), sommets
  // plus hauts au cœur du massif, vallées en auge adoucies (pow), éboulis en pied de pente
  const wx = x + fbm(x * 0.006 + 5, z * 0.006, 3) * 42, wz = z + fbm(x * 0.006 - 9, z * 0.006 + 3, 3) * 42;
  let sum = 0, amp = 0.6, f = 0.0062, wgt = 1;
  for (let i = 0; i < 6; i++) {
    let n = 1 - Math.abs(noise(wx * f + i * 17.3, wz * f - i * 11.1) * 1.35); n = n * n * wgt;
    wgt = clamp(n * 1.9); sum += n * amp; amp *= 0.46; f *= 2.11;
  }
  const peak = 0.75 + 0.5 * clamp(0.5 + fbm(x * 0.0021 + 41, z * 0.0021 - 7, 2));   // massifs plus ou moins hauts
  return Math.pow(sum, 1.35) * peak * 1.25;
}
function climateWeights(x, z, out) {
  const c = continent(x, z), rm = ridgeMaskRaw(x, z), sd = -c * 300;
  // grandes nappes de température et d'humidité ; plus frais en montagne, plus doux près des côtes
  const t = clamp(0.5 + fbm(x * 0.0026 + climOff[0], z * 0.0026 + climOff[1], 2) * 1.7 - rm * 0.3 + smooth(0.25, 0, c) * 0.1);
  const h = clamp(0.5 + fbm(x * 0.0026 + climOff[2], z * 0.0026 + climOff[3], 2) * 2.0 + smooth(0.2, 0, c) * 0.08);
  let s = 0;
  for (let i = 0; i < NB; i++) {
    const b = BIOMES[i]; if (b.special) { out[i] = 0; continue; }
    const d2 = (t - b.t) ** 2 + (h - b.h) ** 2, w = Math.exp(-d2 / 0.012); out[i] = w; s += w;
  }
  for (let i = 0; i < NB; i++) out[i] = s > 0 ? out[i] / s : 0;
  const mL = smooth(-62, -22, sd), mM = smooth(0.22, 0.55, rm);
  const keep = 1 - Math.max(mL, mM);
  for (let i = 0; i < NB; i++) out[i] *= keep;
  out[BI.littoral] = mL * (1 - mM); out[BI.montagne] = mM;
  _mt = rm;
}
let _mt = 0;
// ── Caches par tronçon de 48 m : poids des biomes (1 m) et altitude (0,5 m), calculés à la demande
const CHK = 48, BGc = CHK + 1, HRc = 2, HGc = CHK * HRc + 1, BS = NB + 1;
const bCaches = new Map(), hCaches = new Map();
const ckey = (cx, cz) => cx + ',' + cz;
function biomeCache(cx, cz) {
  const k = ckey(cx, cz); let c = bCaches.get(k); if (c) return c;
  c = new Float32Array(BGc * BGc * BS); const tmp = new Float32Array(NB), x0 = cx * CHK, z0 = cz * CHK;
  for (let j = 0; j < BGc; j++) for (let i = 0; i < BGc; i++) { climateWeights(x0 + i, z0 + j, tmp); const o = (j * BGc + i) * BS; c.set(tmp, o); c[o + NB] = _mt; }
  bCaches.set(k, c); if (bCaches.size > 260) bCaches.delete(bCaches.keys().next().value);
  return c;
}
const _bw = new Float32Array(NB), _rw = new Float32Array(NB);
function biomeW(x, z, out = _bw) {
  const cx = Math.floor(x / CHK), cz = Math.floor(z / CHK), c = biomeCache(cx, cz);
  const fx = x - cx * CHK, fz = z - cz * CHK, i = Math.min(CHK - 1, fx | 0), j = Math.min(CHK - 1, fz | 0), u = fx - i, v = fz - j;
  const a = (j * BGc + i) * BS, b = a + BS, cc = a + BGc * BS, d = cc + BS;
  for (let k = 0; k < NB; k++) out[k] = (c[a + k] * (1 - u) + c[b + k] * u) * (1 - v) + (c[cc + k] * (1 - u) + c[d + k] * u) * v;
  return out;
}
function mountainK(x, z) {
  const cx = Math.floor(x / CHK), cz = Math.floor(z / CHK), c = biomeCache(cx, cz);
  const fx = x - cx * CHK, fz = z - cz * CHK, i = Math.min(CHK - 1, fx | 0), j = Math.min(CHK - 1, fz | 0), u = fx - i, v = fz - j;
  const a = (j * BGc + i) * BS + NB;
  return (c[a] * (1 - u) + c[a + BS] * u) * (1 - v) + (c[a + BGc * BS] * (1 - u) + c[a + BGc * BS + BS] * u) * v;
}
function biomeArgmax(x, z) { const w = biomeW(x, z); let m = 0; for (let k = 1; k < NB; k++) if (w[k] > w[m]) m = k; return m; }
function pickBiome(x, z) { const w = biomeW(x, z); let r = rnd(); for (let k = 0; k < NB; k++) { r -= w[k]; if (r <= 0) return k; } return NB - 1; }
const bMix = (x, z, key) => { const w = biomeW(x, z); let s = 0; for (let k = 0; k < NB; k++) s += w[k] * BIOMES[k][key]; return s; };
function* warmCaches(cx, cz) {   // pré-calcule biomes + altitude d'un tronçon par petits morceaux
  biomeCache(cx, cz);
  const k = ckey(cx, cz); if (hCaches.has(k)) return;
  const c = new Float32Array(HGc * HGc), x0 = cx * CHK, z0 = cz * CHK;
  for (let j = 0; j < HGc; j++) { for (let i = 0; i < HGc; i++) c[j * HGc + i] = heightRaw(x0 + i / HRc, z0 + j / HRc); if (j % 6 === 5) yield; }
  if (!hCaches.has(k)) { hCaches.set(k, c); if (hCaches.size > 200) hCaches.delete(hCaches.keys().next().value); }
}
function heightCache(cx, cz) {
  const k = ckey(cx, cz); let c = hCaches.get(k); if (c) return c;
  c = new Float32Array(HGc * HGc); const x0 = cx * CHK, z0 = cz * CHK;
  for (let j = 0; j < HGc; j++) for (let i = 0; i < HGc; i++) c[j * HGc + i] = heightRaw(x0 + i / HRc, z0 + j / HRc);
  hCaches.set(k, c); if (hCaches.size > 200) hCaches.delete(hCaches.keys().next().value);
  return c;
}
let hAssetsFn = null;   // la page « assets » remplace le relief par un sol plat
function height(x, z) {
  if (hAssetsFn) return hAssetsFn(x, z);
  const cx = Math.floor(x / CHK), cz = Math.floor(z / CHK), c = heightCache(cx, cz);
  const fx = (x - cx * CHK) * HRc, fz = (z - cz * CHK) * HRc, i = Math.min(HGc - 2, fx | 0), j = Math.min(HGc - 2, fz | 0), u = fx - i, v = fz - j, a = j * HGc + i;
  return (c[a] * (1 - u) + c[a + 1] * u) * (1 - v) + (c[a + HGc] * (1 - u) + c[a + HGc + 1] * u) * v;
}
// dunes : crêtes allongées perpendiculaires au vent, profil asymétrique (pente douce au vent, abrupte sous le vent)
function dunes(x, z) {
  const u = x * 0.87 + z * 0.49, v = -x * 0.49 + z * 0.87;
  const ph = u * 0.055 + noise(v * 0.018 + 3, u * 0.006) * 2.6 + noise(v * 0.05, 7) * 0.6;
  const f = ph / (Math.PI * 2) - Math.floor(ph / (Math.PI * 2));
  const prof = f < 0.72 ? smooth(0, 0.72, f) : smooth(1, 0.72, f);
  return prof * prof * (0.6 + 0.4 * noise(v * 0.03 + 9, 1.7));
}
// buttes de grès : plateaux à bords raides, en deux terrasses
function butte(x, z) {
  const n = fbm(x * 0.017 + 600, z * 0.017 - 200, 3);
  return smooth(0.3, 0.36, n) * 0.6 + smooth(0.42, 0.47, n) * 0.4;
}
function baseRelief(x, z) {
  const qx = x + fbm(x * 0.004 + 21, z * 0.004, 2) * 60, qz = z + fbm(x * 0.004, z * 0.004 - 33, 2) * 60;
  const hilly = smooth(-0.25, 0.35, fbm(x * 0.0017 + 90, z * 0.0017 - 40, 2));
  const roll = fbm(qx * 0.009, qz * 0.009, 4), vale = 1 - Math.abs(noise(qx * 0.0045 + 7, qz * 0.0045 + 3));
  return roll * (1.6 + hilly * 4.2) + (vale * vale - 0.5) * (1 + hilly * 2.5) + fbm(x * 0.04 + 13, z * 0.04, 2) * 0.45 + noise(x * 0.09 + 50, z * 0.09) * 0.25;
}
function heightRaw(x, z, raw = false) {
  const w = raw ? (climateWeights(x, z, _rw), _rw) : biomeW(x, z);
  // relief de fond : régions de plaines ou de collines, ondulations déformées, vallons évasés, petites bosses
  let h = baseRelief(x, z);
  const mk = raw ? _mt : mountainK(x, z);
  if (mk > 0.01) h += smooth(0, 1, mk) * 5 + Math.pow(mk, 1.4) * mountainH(x, z) * 46;   // contreforts puis massif à arêtes
  const wd = w[BI.desert];
  if (wd > 0.02) {
    const k = smooth(0.05, 0.55, wd), dn = dunes(x, z), bt = butte(x, z);
    let dh = h * 0.35 + dn * 4.6 + bt * 7;
    const oasis = smooth(-0.32, -0.46, fbm(x * 0.022 + 800, z * 0.022 - 300, 2));     // cuvette avec une source
    dh = lerp(dh, WL - 0.8 + fbm(x * 0.1, z * 0.1, 2) * 0.3, oasis * (1 - smooth(0.05, 0.3, bt)));
    h = lerp(h, dh, k);
  }
  const hills = w[BI.lande] * 1.9 + w[BI.pinede] * 1.1;                       // collines dans les biomes froids
  if (hills > 0.02) h += hills * (fbm(x * 0.035 + 5, z * 0.035, 3) * 2.4 + 0.6);
  const t = coastT(x, z);
  if (t > -0.75) {
    const bch = beachiness(x, z);
    // terre basse qui monte doucement, plage presque plate au fond des criques, plateau sous-marin en pente douce
    let ch = WL + 0.2 - clamp(t, -0.45, 0.6) * 4.2;
    if (t < 0.02 && t > -0.12) ch = lerp(ch, WL + 0.25 + (t + 0.12) * -1.5, smooth(0, 0.6, bch) * 0.8);   // replat de la plage
    if (bch < 0 && t > -0.15 && t < 0.08) ch += smooth(0, -0.5, bch) * 0.35 * smooth(0.08, -0.02, t);      // pointes rocheuses un peu plus hautes
    ch += noise(x * 0.3, z * 0.3) * 0.06;
    h = lerp(h, ch, smooth(-0.75, -0.35, t));
  }
  const m = smooth(0.2, 0.62, w[BI.marais]);                                   // marais : cuvette basse + étangs
  if (m > 0) {
    const pond = smooth(-0.08, 0.22, fbm(x * 0.05 + 300, z * 0.05, 3));
    h = lerp(h, WL + 0.3 - pond * 1.3 + noise(x * 0.2, z * 0.2) * 0.15, m);
  }
  // rivière : lit creusé sous le niveau de l'eau, berges en pente, gorge en montagne
  const rv = riverAt(x, z); let rk = 0;
  if (rv) {
    rk = smooth(rv.w + 7, rv.w, rv.d) * rv.fade;
    if (rk > 0) {
      const bank = 0.18 + 0.4 * clamp(0.5 + noise(x * 0.025 + rv.side * 50, z * 0.025) * 1.2);   // rive douce (grève) ou rive raide (berge)
      const ch = rv.d < rv.w ? WL - 0.3 - 0.95 * (1 - (rv.d / rv.w) ** 1.6) : WL + 0.1 + (rv.d - rv.w) * bank + noise(x * 0.3, z * 0.3) * 0.08;
      h = lerp(h, Math.min(h, ch), rk);
    }
  }
  // lacs : grandes cuvettes d'eau douce dans les plaines (de quoi naviguer)
  const lk = lakeK(x, z, mk);
  if (lk > 0) h = lerp(h, Math.min(h, WL + 0.9 - lk * 3.4 + noise(x * 0.08, z * 0.08) * 0.45 + fbm(x * 0.03 + 5, z * 0.03, 2) * 0.9), smooth(0, 0.35, lk));
  const sd = seaDist(x, z);
  const pd = pathDist(x, z), flat = smooth(0, 5, pd), pk = (1 - smooth(0.2, 0.6, rk)) * (1 - smooth(0.1, 0.4, lk)) * smooth(4, -14, sd);   // ni digue ni chaussée : le sentier s'arrête à l'eau
  return h - 0.08 * (1 - smooth(0.3, 2.2, pd)) * pk;   // le chemin épouse le relief, à peine tassé
}
// La rivière naît au pied de la chaîne et rejoint la mer : son axe suit u (montagne → mer) en méandres.
const river = { on: false, o: [0, 0] };
const lakeK = (x, z, mk) => smooth(-0.34, -0.5, fbm(x * 0.0042 + gOff.l[0], z * 0.0042 + gOff.l[1], 2)) * smooth(0.06, 0.22, continent(x, z)) * (1 - smooth(0.15, 0.45, mk));
// rivières : lignes de niveau zéro d'un bruit à grande échelle ; elles naissent au pied des montagnes et s'élargissent vers la mer
const riverN = (x, z) => { const wx = x + noise(x * 0.011 + 31, z * 0.011) * 22, wz = z + noise(x * 0.011, z * 0.011 - 47) * 22; return fbm(wx * 0.0021 + river.o[0], wz * 0.0021 + river.o[1], 2); };
function riverAt(x, z) {
  if (!river.on) return null;
  const n = riverN(x, z); if (Math.abs(n) > 0.05) return null;
  const gx = (riverN(x + 2, z) - n) / 2, gz = (riverN(x, z + 2) - n) / 2, g = Math.hypot(gx, gz) + 1e-5;
  const c = continent(x, z), fade = smooth(-0.02, 0.06, c) * (1 - smooth(0.32, 0.65, ridgeMaskRaw(x, z)));
  if (fade <= 0) return null;
  return { d: Math.max(0, Math.abs(n) / g + noise(x * 0.16, z * 0.16) * 0.55), w: (1.2 + 2.3 * smooth(0.45, 0.04, c)) * (0.7 + 0.6 * clamp(0.5 + noise(x * 0.018 + 9, z * 0.018 - 4))), fade, side: n > 0 ? 1 : -1 };
}
const nearRiver = (x, z, pad = 3) => { const r = riverAt(x, z); return !!r && r.fade > 0.3 && r.d < r.w + pad; };
let chalets = [];
// côte : champ dont le zéro est le trait de côte (t > 0 : la mer) ; le bruit à moyenne échelle découpe des criques
const coastT = (x, z) => seaDist(x, z) / 40 + fbm(x * 0.03 + 77, z * 0.03, 3) * 0.12 + noise(x * 0.09 + 3, z * 0.09 - 8) * 0.06;
const beachiness = (x, z) => noise(x * 0.045 + 140, z * 0.045 - 60) + 0.15;    // > 0 : crique sableuse, < 0 : pointe rocheuse
const onBeach = (x, z, h) => h < WL + 1.0 && biomeW(x, z)[BI.littoral] > 0.12;
function chaletsAround(x, z) { const cx = Math.floor(x / CHK), cz = Math.floor(z / CHK), out = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const c of chaletSites(cx + i, cz + j)) out.push(c); return out; }
function nearChalet(x, z, r = 3.9) { if (ASSETS) return false; for (const c of chaletsAround(x, z)) if ((x - c.x) ** 2 + (z - c.z) ** 2 < r * r) return true; return false; }
function chaletClear(x, z) { let k = 1; for (const c of chaletsAround(x, z)) k = Math.min(k, smooth(5.5, 10, Math.hypot(x - c.x, z - c.z))); return k; }
function forestDensity(x, z, h = height(x, z)) {
  let d = (0.62 + fbm(x * 0.028 + 11, z * 0.028 - 7, 3) * 0.75) * bMix(x, z, 'trees');
  d *= smooth(6, 12, Math.hypot(x - clearing.x, z - clearing.y));
  if (!ASSETS) d *= chaletClear(x, z);
  d *= smooth(1.6, 4.5, pathDist(x, z));
  d *= smooth(WL + 0.1, WL + 0.6, h) * Math.max(smooth(TREELINE + 1.2, TREELINE - 1.2, h), 0.14 * smooth(SNOWLINE - 1, SNOWLINE - 4, h));   // quelques arbres épars au-dessus   // limite des arbres en altitude
  return clamp(d);
}
const birchness = (x, z) => fbm(x * 0.035 - 30, z * 0.035 + 21, 2);
const litter = (x, z) => { const w = biomeW(x, z); return fbm(x * 0.045 + 40, z * 0.045 + 13, 3) + w[BI.automne] * 0.38 + w[BI.pinede] * 0.12 - w[BI.prairie] * 0.3 - w[BI.marais] * 0.2 - w[BI.littoral] * 0.5 + w[BI.bambou] * 0.42 - w[BI.desert] * 0.8; };

// ════════════════════════════════════════════════════════════════════
//  Rendu
// ════════════════════════════════════════════════════════════════════
const ASSETS = document.body.dataset.mode === 'assets';
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // mis à jour à la main (voir renderView)
let frameNo = 0, forceShadow = false; const _lastSun = new THREE.Vector3(), _lastTgt = new THREE.Vector3();

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x9fb7a6, 0);
const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 1, 260);

const hemi = new THREE.HemisphereLight(0x9ec8ff, 0x4a5a2a, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 3.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const SH = 30;
Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 2;
scene.add(sun, sun.target);

// uniforms partagés (vent, ombres de nuages)
const U = { uTime: { value: 0 }, uCloud: { value: 0.3 }, uWind: { value: 1 },
  uBump: { value: 0.9 }, uNear: { value: new THREE.Vector4(0, 0, -1, 0) },
  tWDepth: { value: null }, uWO: { value: new THREE.Vector3(-170, -170, 340) }, uSky: { value: new THREE.Color() }, uPW: { value: new THREE.Vector4(0, 0, 0, 0) },
  uPlayerS: { value: new THREE.Vector3(-999, -999, 0) }, uRevealR: { value: 30 }, uReveal: { value: 0.55 } };

const NOISE_GLSL = /* glsl */`
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float cloudMask(vec2 p){
  if (uCloud <= 0.) return 1.;
  vec2 q = p*0.03 + vec2(uTime*0.022, uTime*0.011);
  float n = vn(q)*0.55 + vn(q*2.07+3.1)*0.3 + vn(q*4.3+7.)*0.15;
  return 1. - uCloud * smoothstep(0.45, 0.66, n);
}`;
const windGLSL = (amp, flutter) => /* glsl */`
  vec3 ip = vec3(0.);
  #ifdef USE_INSTANCING
    ip = instanceMatrix[3].xyz;
  #endif
  float hh = max(transformed.y, 0.);
  float ph = ip.x*0.21 + ip.z*0.17;
  float gust = 0.55 + 0.45 * sin(dot(ip.xz, vec2(0.09, 0.05)) - uTime * 1.4);
  float sw = (sin(uTime*1.1 + ph)*0.6 + sin(uTime*2.3 + ph*1.7 + transformed.x*0.8)*0.4) * gust + gust * 0.5;
  transformed.x += sw * hh * ${amp.toFixed(4)} * uWind;
  transformed.z += cos(uTime*0.9 + ph*1.3) * 0.5 * hh * ${amp.toFixed(4)} * uWind;
  ${flutter === 'weep' ? `float dg = clamp(5.2 - transformed.y, 0., 5.);
  transformed.x += sin(uTime*1.25 + ph + transformed.y*0.6) * (0.6 + gust * 0.6) * dg * 0.05 * uWind;
  transformed.z += cos(uTime*1.05 + ph*1.4 + transformed.y*0.45) * dg * 0.035 * uWind;` : flutter ? 'transformed += normal * sin(uTime*3.7 + dot(transformed, vec3(3.1,2.3,1.7))) * 0.035 * uWind;' : ''}
`;
function patch(mat, { wind = 0, flutter = false, fakeNormal = false, reveal = false, ground = null, water = false, stone = false, proc = '', farHole = false } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uCloud = U.uCloud; sh.uniforms.uWind = U.uWind;
    if (ground) { sh.uniforms.tMask = { value: ground.mask }; sh.uniforms.tDetail = { value: ground.detail }; sh.uniforms.uBump = U.uBump; sh.uniforms.uMO = { value: ground.mo }; }
    if (water) { sh.uniforms.tWDepth = U.tWDepth; sh.uniforms.uSky = U.uSky; sh.uniforms.uPW = U.uPW; sh.uniforms.uWO = U.uWO; }
    if (farHole) sh.uniforms.uNear = U.uNear;
    sh.uniforms.uPlayerS = U.uPlayerS; sh.uniforms.uRevealR = U.uRevealR; sh.uniforms.uReveal = U.uReveal;
    sh.vertexShader = 'uniform float uTime;\nuniform float uWind;\nvarying vec3 vWP;\nvarying float vViewD;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (wind ? windGLSL(wind, flutter) : ''))
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wpp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpp = instanceMatrix * wpp;
        #endif
        vWP = (modelMatrix * wpp).xyz;
        vViewD = -mvPosition.z;`);
    let fs = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        float cm = cloudMask(vWP.xz);
        reflectedLight.directDiffuse *= cm;`);
    if (reveal) fs = fs.replace('void main() {', `void main() {
      // personnage caché : trame de transparence dans un disque autour de lui, seulement devant lui
      if (uReveal > 0.) {
        float dpx = length(gl_FragCoord.xy - uPlayerS.xy);
        if (dpx < uRevealR && vViewD < uPlayerS.z - 1.2) {
          float k = 1. - smoothstep(uRevealR * 0.45, uRevealR, dpx);
          // bruit à gradient entrelacé (pas de trame régulière → pas de moiré une fois flouté / agrandi)
          float b = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715))));
          if (b < smoothstep(0., 0.85, k * uReveal)) discard;
        }
      }`);
    if (ground) fs = fs
      .replace('reflectedLight.directDiffuse *= cm;', `reflectedLight.directDiffuse *= cm;
        if (vWP.y < ${WL.toFixed(2)}) { // caustiques : réseau lumineux mouvant sur le fond des étangs
          vec2 q = vWP.xz * 1.6; float ca = 0.;
          for (int i = 0; i < 3; i++) { q += vec2(sin(q.y * 1.3 + uTime * 0.7), cos(q.x * 1.1 - uTime * 0.6)); ca += 1. / (1. + 8. * abs(sin(q.x) * sin(q.y))); }
          ca = pow(ca / 3., 2.5);
          float k = smoothstep(${WL.toFixed(2)}, ${(WL - 0.25).toFixed(2)}, vWP.y) * smoothstep(${(WL - 1.8).toFixed(2)}, ${(WL - 0.6).toFixed(2)}, vWP.y);
          reflectedLight.directDiffuse *= 0.75 + ca * 2.2 * k;
        }`)
      .replace('void main() {', `uniform sampler2D tMask, tDetail; uniform float uBump; uniform vec3 uMO;
        vec4 gM;
        float gH(vec2 w){
          vec3 a = texture2D(tDetail, w * 0.28).rgb, b = texture2D(tDetail, w * 0.113 + vec2(0.37, 0.61)).rgb;
          float grass = a.r * 0.65 + b.r * 0.35, grav = a.g * 0.7 + b.g * 0.3, lit = a.b * 0.7 + b.b * 0.3;
          return mix(mix(grass, lit, gM.g), grav, gM.r);
        }
        vec3 gPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float fd){
          vec3 sx = normalize(dFdx(surf_pos)), sy = normalize(dFdy(surf_pos));
          vec3 R1 = cross(sy, surf_norm), R2 = cross(surf_norm, sx);
          float det = dot(sx, R1) * fd;
          return normalize(abs(det) * surf_norm - sign(det) * (dHdxy.x * R1 + dHdxy.y * R2));
        }
        void main() {
          gM = texture2D(tMask, (vWP.xz - uMO.xy) / uMO.z);`)
      .replace('#include <map_fragment>', `#include <map_fragment>
          float gh = gH(vWP.xz);
          float lumG = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
          diffuseColor.rgb *= mix(0.66 + gh * 0.68, 0.94 + gh * 0.1, smoothstep(0.55, 0.8, lumG));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 1.07, 0.82), smoothstep(0.55, 0.9, gh) * (1. - gM.r) * (1. - gM.g));
          diffuseColor.rgb *= mix(vec3(1.), vec3(0.8, 0.92, 1.02), gM.b);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { vec2 dx = dFdx(vWP.xz), dy = dFdy(vWP.xz);
            float h0 = gH(vWP.xz);
            vec2 dh = vec2(gH(vWP.xz + dx) - h0, gH(vWP.xz + dy) - h0) * uBump * (1. + gM.r * 0.8);
            normal = gPerturb(-vViewPosition, normal, dh, faceDirection); }`);
    if (water) fs = fs
      .replace('void main() {', `uniform sampler2D tWDepth; uniform vec3 uSky; uniform vec4 uPW; uniform vec3 uWO;
        float wDepth;
        // hauteur des petites vagues + ronds concentriques autour du personnage quand il patauge
        float WH(vec2 q) {
          float h = sin(q.x*1.4 + uTime*1.2)*0.35 + sin(q.y*1.9 - uTime*0.9 + q.x*0.4)*0.3 + vn(q*1.1 + uTime*0.25)*0.9 + vn(q*3.3 - uTime*0.4)*0.35;
          float d = length(q - uPW.xy);
          h += uPW.z * sin(d * 6. - uTime * 6.) * exp(-d * 0.9) * smoothstep(0., 0.6, d) * 2.5;
          return h;
        }
        void main() {
          wDepth = texture2D(tWDepth, (vWP.xz - uWO.xy) / uWO.z).r * 3. - 0.5;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { // couleur et transparence selon la profondeur, écume le long des rives
          float dd = smoothstep(0., 1.3, wDepth);
          float seaK = texture2D(tWDepth, (vWP.xz - uWO.xy) / uWO.z).g;
          diffuseColor.rgb = mix(mix(vec3(0.11, 0.25, 0.19), vec3(0.025, 0.08, 0.1), dd), mix(vec3(0.05, 0.56, 0.58), vec3(0.02, 0.17, 0.36), smoothstep(0.3, 2.4, wDepth)), seaK);
          diffuseColor.a = mix(0.22 + seaK * 0.2, 0.9 - seaK * 0.05, smoothstep(0., 0.9 + seaK * 1.6, wDepth));
          float fn = vn(vWP.xz * 2.2 + vec2(uTime * 0.25, -uTime * 0.2)) * 0.5 + vn(vWP.xz * 5.3 - uTime * 0.3) * 0.5;
          float foam = smoothstep(0.12, 0.0, wDepth + (fn - 0.5) * 0.14) * smoothstep(-0.05, 0.02, wDepth);
          foam *= smoothstep(0.5, 0.62, fn + (0.12 - wDepth) * 1.2);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.95, 0.9), foam * 0.85);
          diffuseColor.a = max(diffuseColor.a, foam * 0.9);
          if (wDepth < -0.02) discard;
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { // petites vagues : normale dérivée d'un champ de hauteur animé
        vec2 p = vWP.xz; float e = 0.12;
        float h0 = WH(p), hx = WH(p + vec2(e, 0.)), hz = WH(p + vec2(0., e));
        vec3 wn = normalize(vec3(-(hx - h0) / e * 0.09, 1., -(hz - h0) / e * 0.09));
        normal = normalize((viewMatrix * vec4(wn, 0.)).xyz);
        // reflet du ciel (Fresnel)
        float fres = pow(1. - clamp(dot(normal, normalize(vViewPosition)), 0., 1.), 3.);
        diffuseColor.rgb = mix(diffuseColor.rgb, uSky * 0.45, clamp(0.06 + fres * 0.5, 0., 0.6) * smoothstep(0., 0.5, wDepth));
      }`);
    if (proc) fs = fs
      .replace('void main() {', `vec2 h22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
        vec3 cellN(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.; vec2 id = vec2(0.);
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), r = g + h22(i + g) - f; float d = dot(r, r);
            if (d < d1) { d2 = d1; d1 = d; id = i + g; } else if (d < d2) d2 = d; }
          return vec3(sqrt(d2) - sqrt(d1), h21(id), 0.); }
        void main() {`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 wp = vWP; float al = wp.x + wp.z;
          ${proc === 'logs' ? `// rondins empilés : bandes arrondies, fentes sombres, fil du bois
            float r = fract(wp.y / 0.23), row = floor(wp.y / 0.23);
            float shade = 0.6 + 0.4 * sin(r * 3.1416);
            float grain = vn(vec2(al * 2.5 + row * 7.1, wp.y * 38.)) * 0.6 + vn(vec2(al * 9., wp.y * 90.)) * 0.4;
            diffuseColor.rgb *= shade * (0.82 + 0.3 * grain) * (0.9 + 0.2 * h21(vec2(row, floor(al * 0.4))));
            diffuseColor.rgb *= mix(0.35, 1., smoothstep(0.0, 0.07, r) * smoothstep(1.0, 0.93, r));` : ''}
          ${proc === 'shingles' ? `// bardeaux de bois en quinconce
            float row = floor(wp.y / 0.17), r = fract(wp.y / 0.17);
            float u = al / 0.28 + row * 0.5, cid = floor(u), cu = fract(u);
            float tone = 0.75 + 0.35 * h21(vec2(cid, row));
            diffuseColor.rgb *= tone * (0.7 + 0.3 * r) * mix(0.45, 1., smoothstep(0., 0.08, cu) * smoothstep(1., 0.92, cu)) * mix(0.5, 1., smoothstep(0., 0.12, r));` : ''}
          ${proc === 'stone' ? `// moellons : cellules de Voronoï, joints de mortier
            vec3 c = cellN(vec2(al, wp.y * 1.7) * 2.6);
            diffuseColor.rgb *= (0.75 + 0.4 * c.y) * (0.88 + 0.2 * vn(vec2(al, wp.y) * 14.));
            diffuseColor.rgb = mix(vec3(0.42, 0.4, 0.36), diffuseColor.rgb, smoothstep(0.04, 0.12, c.x));` : ''}
          ${proc === 'plank' ? `// planches verticales
            float u = al / 0.16, cid = floor(u), cu = fract(u);
            diffuseColor.rgb *= (0.8 + 0.3 * h21(vec2(cid, 3.))) * (0.85 + 0.25 * vn(vec2(cid * 3., wp.y * 30.))) * mix(0.45, 1., smoothstep(0., 0.07, cu));` : ''}
        }`);
    if (farHole) fs = fs.replace('void main() {', `uniform vec4 uNear;
      void main() {
        if (abs(vWP.x - uNear.x) < uNear.z && abs(vWP.z - uNear.y) < uNear.z) discard;   // là où le sol détaillé est chargé`);
    if (stone) fs = fs
      .replace('void main() {', `float sG(vec3 w){ return vn(w.xz * 9. + w.y * 4.3) * 0.55 + vn(w.zy * 17. - w.x * 3.1) * 0.3 + vn(w.xy * 31.) * 0.15; }
        void main() {`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.84 + sG(vWP) * 0.32;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 dx = dFdx(vWP), dy = dFdy(vWP); float h0 = sG(vWP);
          vec2 dh = vec2(sG(vWP + dx) - h0, sG(vWP + dy) - h0) * 0.9;
          vec3 sx = normalize(dFdx(-vViewPosition)), sy = normalize(dFdy(-vViewPosition));
          vec3 R1 = cross(sy, normal), R2 = cross(normal, sx); float det = dot(sx, R1) * faceDirection;
          normal = normalize(abs(det) * normal - sign(det) * (dh.x * R1 + dh.y * R2)); }`);
    if (fakeNormal) fs = fs.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
    sh.fragmentShader = 'uniform float uTime;\nuniform float uCloud;\nuniform vec3 uPlayerS;\nuniform float uRevealR, uReveal;\nvarying vec3 vWP;\nvarying float vViewD;\nconst float RB[16] = float[](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);\n' + NOISE_GLSL + '\n' + fs;
  };
  mat.customProgramCacheKey = () => `p${wind}${flutter}${fakeNormal}${reveal}${!!ground}${water}${stone}${proc}${farHole}`;
  return mat;
}
function depthMat(map, alphaTest, wind, flutter) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
    sh.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + windGLSL(wind, flutter));
  };
  m.customProgramCacheKey = () => `d${wind}${flutter}`;
  return m;
}

// ════════════════════════════════════════════════════════════════════
//  Textures procédurales
// ════════════════════════════════════════════════════════════════════
function canvasTex(w, h, draw, { srgb = true, mip = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mip; if (!mip) t.minFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  return t;
}
function leafShape(g, x, y, len, wid, ang) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(wid, len * 0.45, 0, len);
  g.quadraticCurveTo(-wid, len * 0.45, 0, 0);
  g.fill(); g.restore();
}
const leafTex = canvasTex(128, 128, (g, w) => {
  const r = mulberry32(99);
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 38;
    const v = 150 + r() * 105 | 0;
    g.fillStyle = `rgb(${v},${v},${v})`;
    leafShape(g, w / 2 + Math.cos(a) * d * 0.6, w / 2 + Math.sin(a) * d * 0.6, 16 + r() * 16, 6 + r() * 4, a - Math.PI / 2 + (r() - 0.5));
  }
});
const grassTex = canvasTex(128, 128, (g, w, h) => {
  const r = mulberry32(5);
  for (let i = 0; i < 52; i++) {
    const x = 6 + r() * 116, lean = (r() - 0.5) * 34 * (0.4 + r()), top = 4 + r() * r() * 70, wd = 1.1 + r() * 1.6;
    const grd = g.createLinearGradient(0, h, 0, top);
    const v0 = 196 + r() * 30 | 0, v1 = 238 + r() * 17 | 0;
    grd.addColorStop(0, `rgb(${v0},${v0},${v0})`); grd.addColorStop(1, `rgb(${v1},${v1},${v1 - 10})`);
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(x - wd, h); g.quadraticCurveTo(x + lean * 0.2, (h + top) * 0.55, x + lean, top);
    g.quadraticCurveTo(x + lean * 0.2 + wd * 0.5, (h + top) * 0.55, x + wd, h); g.fill();
  }
});
const fernTex = canvasTex(32, 128, (g, w, h) => {
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 4); g.stroke();
  for (let y = 10; y < h - 6; y += 7) {
    const s = 0.35 + 0.65 * Math.sin(Math.PI * (h - y) / h);
    leafShape(g, w / 2, y, 14 * s, 3, -1.25); leafShape(g, w / 2, y, 14 * s, 3, 1.25);
  }
});
const needleTex = canvasTex(128, 128, (g, w) => {
  const r = mulberry32(51);
  g.lineCap = 'round';
  for (let k = 0; k < 7; k++) {   // rameaux d'aiguilles en éventail
    const a = k / 7 * Math.PI * 2 + r() * 0.5, L = 34 + r() * 22, x0 = w / 2, y0 = w / 2;
    const v = 150 + r() * 100 | 0; g.strokeStyle = `rgb(${v},${v},${v})`;
    g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L); g.stroke();
    g.lineWidth = 1.6;
    for (let t = 6; t < L; t += 3) {
      const px = x0 + Math.cos(a) * t, py = y0 + Math.sin(a) * t, n = 9 * (1 - t / L * 0.5);
      for (const sd of [-1, 1]) { const b = a + sd * 0.9; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(b) * n, py + Math.sin(b) * n); g.stroke(); }
    }
  }
});
const willowTex = canvasTex(32, 256, (g, w, h) => {
  const r = mulberry32(61);
  g.strokeStyle = 'rgb(150,150,140)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(16, 0);
  for (let y = 0; y <= h; y += 16) g.lineTo(16 + Math.sin(y * 0.05) * 2, y); g.stroke();
  for (let y = 4; y < h - 4; y += 3.2) {
    for (const sd of [-1, 1]) {
      if (r() < 0.05) continue;
      const v = 165 + r() * 90 | 0, L = 10 + r() * 8;
      g.fillStyle = `rgb(${v},${v},${v - 8})`;
      leafShape(g, 16 + Math.sin(y * 0.05) * 2, y, L, 3.2, sd * (0.3 + r() * 0.45));   // pointe vers le bas, légèrement écartée
    }
  }
});
const palmTex = canvasTex(64, 256, (g, w, h) => {   // palme : nervure centrale, folioles qui retombent
  const r = mulberry32(91);
  g.strokeStyle = 'rgb(170,165,140)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(32, 0); g.lineTo(32, h); g.stroke();
  for (let y = 6; y < h - 4; y += 4.5) {
    const L = 30 * (0.35 + 0.65 * Math.sin(Math.PI * (1 - y / h) * 0.9 + 0.2));
    for (const sd of [-1, 1]) { const v = 150 + r() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v - 10})`; leafShape(g, 32, y, L, 2.2, sd * (1.2 + r() * 0.25)); }
  }
});
const bambooTex = canvasTex(128, 128, (g, w) => {   // éventails de feuilles lancéolées, longues et étroites
  const r = mulberry32(83);
  for (let k = 0; k < 5; k++) {
    const cx = 30 + r() * 68, cy = 30 + r() * 50, n = 4 + (r() * 3 | 0), a0 = Math.PI * 0.35 + r() * 0.3;
    for (let i = 0; i < n; i++) {
      const v = 150 + r() * 100 | 0; g.fillStyle = `rgb(${v},${v},${v - 6})`;
      leafShape(g, cx, cy, 34 + r() * 18, 4.2, a0 + (i - n / 2) * 0.32 + (r() - 0.5) * 0.2);
    }
  }
});
const birchTex = canvasTex(64, 256, (g, w, h) => {
  const r = mulberry32(17);
  g.fillStyle = '#ebe7dc'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) {
    g.fillStyle = r() < 0.75 ? '#2c2925' : '#8d867a';
    g.fillRect(r() * w, r() * h, 4 + r() * 14, 1.5 + r() * 3);
  }
});
birchTex.wrapS = birchTex.wrapT = THREE.RepeatWrapping;

// ════════════════════════════════════════════════════════════════════
//  Géométries
// ════════════════════════════════════════════════════════════════════
const col = (hex) => new THREE.Color(hex);
class GB { // constructeur de quads
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; }
  quad(ctr, r, u, nrm, c, nrm2) {
    const b = this.p.length / 3, pts = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
    pts.forEach(([a, bb, s, t], k) => {
      this.p.push(ctr.x + r.x * a + u.x * bb, ctr.y + r.y * a + u.y * bb, ctr.z + r.z * a + u.z * bb);
      const nn = (nrm2 && k >= 2) ? nrm2 : nrm;
      this.n.push(nn.x, nn.y, nn.z); this.uv.push(s, t);
      const cc = Array.isArray(c) ? c[k] : c; this.c.push(cc.r, cc.g, cc.b);
    });
    this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i); return g;
  }
}
function colorize(g, c) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
function cylBetween(a, b, r0, r1, c, seg = 6) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, true);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q); g.translate(a.x, a.y, a.z);
  return colorize(g, c);
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function randUnit() { const z = R(-1, 1), a = R(0, Math.PI * 2), s = Math.sqrt(1 - z * z); return V(s * Math.cos(a), z, s * Math.sin(a)); }

function canopy(gb, clumps, pal, cardSize, density) {
  const cc = V(0, 0, 0); clumps.forEach(k => cc.add(k.c)); cc.divideScalar(clumps.length);
  let minY = Infinity, maxY = -Infinity;
  clumps.forEach(k => { minY = Math.min(minY, k.c.y - k.r); maxY = Math.max(maxY, k.c.y + k.r); });
  const [dk, md, lt] = pal.map(col);
  for (const k of clumps) {
    const n = Math.round(density * k.r * k.r);
    for (let i = 0; i < n; i++) {
      const d = randUnit(); if (d.y < -0.2 && rnd() < 0.6) d.y = -d.y; // plus de cartes au-dessus
      const depth = 0.5 + 0.5 * Math.sqrt(rnd());
      const p = k.c.clone().addScaledVector(d, k.r * depth);
      const nrm = d.clone().multiplyScalar(0.55).add(p.clone().sub(cc).normalize().multiplyScalar(0.45)).add(V(0, 0.25, 0)).normalize();
      const cn = d.clone().add(randUnit().multiplyScalar(0.6)).normalize();
      let rt = V(0, 1, 0).cross(cn); if (rt.lengthSq() < 1e-3) rt = V(1, 0, 0); rt.normalize();
      rt.applyAxisAngle(cn, R(0, Math.PI * 2));
      const up = cn.clone().cross(rt).normalize();
      const s = cardSize * R(0.75, 1.2);
      let t = 0.12 + 0.5 * (nrm.y * 0.5 + 0.5) + 0.3 * (p.y - minY) / (maxY - minY) + R(-0.12, 0.12) - (1 - depth) * 0.5;
      t = clamp(t);
      const c = t < 0.5 ? dk.clone().lerp(md, t * 2) : md.clone().lerp(lt, (t - 0.5) * 2);
      gb.quad(p, rt.multiplyScalar(s), up.multiplyScalar(s), nrm, c);
    }
  }
}

const PAL = {
  acacia: ['#3a5226', '#6a8240', '#a8b462'],
  baobab: ['#3a5a26', '#6a8a3a', '#a8b85a'],
  tropic: ['#0f3018', '#2a6228', '#6aa83a'],
  poplar: ['#2e5a26', '#6a9a3e', '#c8d68a'],
  sage: ['#5a6450', '#8c9478', '#c2c6a8'],
  bamboo: ['#2e4e1e', '#5f8e2e', '#b8d064'],
  gold: ['#5a4214', '#c2902a', '#f6d662'],
  pine: ['#16302a', '#28503e', '#6a9458'],
  willow: ['#3c5a26', '#7f9e44', '#cddc84'],
  heather: ['#3a2442', '#7a4a8c', '#cf96d2'],
  gorse: ['#3c4a1c', '#b8a426', '#f6e05a'],
  lavender: ['#3e3460', '#8468b8', '#c9acec'],
  olive: ['#3a4630', '#7d8c62', '#c2cca4'],
  cypress: ['#14281a', '#27442a', '#557548'],
  parasol: ['#1e3a26', '#3f6a3a', '#8cae62'],
  maquis: ['#22381c', '#46622e', '#8aa250'],
  oak: ['#2a5022', '#5a8a30', '#c8d85e'],
  birch: ['#3e6026', '#86a63e', '#e2e67c'],
  bush: ['#24461f', '#4a7a2e', '#9cbc4a'],
  red: ['#4a2a16', '#9c5a24', '#e0a24a'],
};
function makeOak(red, pal) {
  const gb = new GB(), clumps = [], parts = [];
  const H = R(2.8, 3.6), bark = col('#4b3627');
  parts.push(cylBetween(V(0, -0.3, 0), V(R(-.2, .2), H, R(-.2, .2)), 0.26, 0.15, bark, 7));
  const top = V(R(-.2, .2), H + 1.6, R(-.2, .2));
  clumps.push({ c: top, r: R(1.7, 2.1) });
  const k = 4 + (rnd() * 2 | 0);
  for (let i = 0; i < k; i++) {
    const a = i / k * Math.PI * 2 + R(-.3, .3), d = R(1.3, 1.9);
    const c = V(Math.cos(a) * d, H + R(0.6, 1.6), Math.sin(a) * d);
    clumps.push({ c, r: R(1.1, 1.5) });
    parts.push(cylBetween(V(0, H * 0.75, 0), c.clone().multiplyScalar(0.7), 0.11, 0.05, bark, 5));
  }
  clumps.push({ c: top.clone().add(V(R(-.5, .5), 1.1, R(-.5, .5))), r: R(1.0, 1.3) });
  canopy(gb, clumps, pal || (red ? PAL.red : PAL.oak), 0.95, 17);
  return { trunk: mergeGeometries(parts), leaves: gb.build(), birch: false, r: 0.35, ao: 2.8 };
}
function makeBirch() {
  const gb = new GB(), clumps = [];
  const H = R(5, 6.5), lean = V(R(-.4, .4), H, R(-.4, .4));
  const t = cylBetween(V(0, -0.3, 0), lean, 0.15, 0.08, col('#ffffff'), 7);
  const uv = t.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * H / 3);
  for (let i = 0; i < 6; i++) {
    const y = H * R(0.5, 1.05), a = R(0, Math.PI * 2), d = R(0.3, 0.9);
    clumps.push({ c: V(lean.x * y / H + Math.cos(a) * d, y + 0.5, lean.z * y / H + Math.sin(a) * d), r: R(0.75, 1.05) });
  }
  canopy(gb, clumps, PAL.birch, 0.72, 22);
  return { trunk: t, leaves: gb.build(), birch: true, r: 0.22, ao: 1.8 };
}
function makeBush(pal = PAL.bush, card = 0.6, sc = 1) {
  const gb = new GB(), clumps = [];
  const k = 2 + (rnd() * 2 | 0);
  for (let i = 0; i < k; i++) clumps.push({ c: V(R(-.6, .6) * sc, R(0.45, 0.8) * sc, R(-.6, .6) * sc), r: R(0.7, 1.0) * sc });
  canopy(gb, clumps, pal, card, 22);
  return { trunk: null, leaves: gb.build(), birch: false, r: 0.5, ao: 1.4 };
}
function card(gb, p, cn, nrm, s, c) {
  let rt = V(0, 1, 0).cross(cn); if (rt.lengthSq() < 1e-3) rt = V(1, 0, 0); rt.normalize();
  rt.applyAxisAngle(cn, R(0, Math.PI * 2));
  const up = cn.clone().cross(rt).normalize();
  gb.quad(p, rt.multiplyScalar(s), up.multiplyScalar(s), nrm, c);
}
function palCol(pal, t) { const [a, b, c] = pal.map(col); t = clamp(t); return t < 0.5 ? a.lerp(b, t * 2) : b.lerp(c, (t - 0.5) * 2); }
// sapin : flèche étroite et sombre, étages serrés aux branches tombantes ; version enneigée = dessus des cartes blanchis
// Touffe de bambou : une douzaine de chaumes fins et droits, segmentés par des nœuds, qui s'évasent
// légèrement ; le feuillage en éventails ne garnit que le haut, où les tiges ploient un peu.
// Cactus : colonne cannelée (côtes) avec bras coudés, ou petit cactus-tonneau
function makeCactus(vi) {
  const parts = [], green = col('#557a42'), dark = col('#3c5a32'), tip = col('#7a9a5a');
  const fluted = (h, r, ribs = 10) => {   // cylindre à côtes : les sommets alternent rayon plein / creux
    const g = new THREE.CylinderGeometry(r, r * 1.05, h, ribs * 2, 6), p = g.attributes.position, cols = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), rib = 0.5 + 0.5 * Math.cos(a * ribs);
      const k = 0.88 + rib * 0.12, top = y > h / 2 - 0.01 ? 0.55 : 1;
      p.setX(i, x * k * top); p.setZ(i, z * k * top);
      const c = dark.clone().lerp(green, rib).lerp(tip, smooth(h * 0.3, h * 0.5, y) * 0.4);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals(); return g;
  };
  const cap = (r, y, x = 0, z = 0) => colorize(new THREE.SphereGeometry(r, 12, 6, 0, 6.29, 0, Math.PI / 2).translate(x, y, z), tip);
  if (vi % 3 === 2) {   // tonneau
    const r = R(0.35, 0.5), g = fluted(r * 1.3, r, 14); g.translate(0, r * 0.6, 0); g.scale(1, 1, 1);
    parts.push(g, cap(r * 0.62, r * 1.25));
    return { trunk: mergeGeometries(parts.map(q => q.index ? q.toNonIndexed() : q)), leaves: null, r: r, ao: 1, trunkMat: M.cactus };
  }
  const H = R(2.4, 4.2), r = R(0.18, 0.26);
  const main = fluted(H, r); main.translate(0, H / 2 - 0.2, 0); parts.push(main, cap(r, H - 0.2));
  const arms = vi % 3 === 0 ? 2 : 1 + (rnd() * 2 | 0);
  for (let k = 0; k < arms; k++) {
    const a = k * Math.PI + R(-0.5, 0.5), y0 = H * R(0.35, 0.6), reach = R(0.45, 0.7), up = R(0.7, 1.4), ar = r * 0.72;
    const out = V(Math.cos(a), 0, Math.sin(a));
    const elbow = fluted(reach, ar, 8); elbow.rotateZ(Math.PI / 2); elbow.rotateY(-a); elbow.translate(out.x * (r + reach / 2), y0, out.z * (r + reach / 2));
    const fore = fluted(up, ar, 8); fore.translate(out.x * (r + reach), y0 + up / 2, out.z * (r + reach));
    parts.push(elbow, fore, cap(ar, y0 + up, out.x * (r + reach), out.z * (r + reach)));
  }
  return { trunk: mergeGeometries(parts.map(q => q.index ? q.toNonIndexed() : q)), leaves: null, r: r + 0.15, ao: 1.4, trunkMat: M.cactus };
}
// arbre mort : branches nues, grises, tordues
function makeMound() {   // termitière : cône irrégulier de terre rouge, aux cheminées multiples
  const g = lathe([[0, 0], [0.55, 0], [0.5, 0.3], [0.34, 0.7], [0.22, 1.0], [0.1, 1.2], [0, 1.25]], 9);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + noise(p.getX(i) * 4, p.getY(i) * 3 + p.getZ(i) * 4) * 0.25; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  g.computeVertexNormals();
  return prep(g, '#a8643e');
}
function makeDeadTree() {
  const parts = [], wood = col('#8a7e70');
  const grow = (a, dir, len, r, depth) => {
    const b = a.clone().addScaledVector(dir, len); parts.push(cylBetween(a, b, r, r * 0.65, wood, 5));
    if (depth <= 0) return;
    for (let k = 0; k < 2 + (rnd() < 0.4 ? 1 : 0); k++) {
      const nd = dir.clone().add(randUnit().multiplyScalar(0.8)).add(V(0, 0.25, 0)).normalize();
      grow(b, nd, len * R(0.55, 0.75), r * 0.62, depth - 1);
    }
  };
  grow(V(0, -0.2, 0), V(R(-.2, .2), 1, R(-.2, .2)).normalize(), R(1.6, 2.4), R(0.14, 0.2), 3);
  return { trunk: mergeGeometries(parts), leaves: null, r: 0.25, ao: 1.2 };
}
// palmier d'oasis : stipe arqué à anneaux, couronne de palmes qui retombent
function makePalm() {
  const gb = new GB(), parts = [], H = R(4.5, 6.5), bend = V(R(-1, 1), 0, R(-1, 1)).normalize().multiplyScalar(R(0.8, 1.6));
  const ring = [col('#8a7258'), col('#6e5a44')];
  let prev = V(0, -0.2, 0);
  for (let i = 1; i <= 12; i++) {
    const f = i / 12, p = V(bend.x * f * f, H * f, bend.z * f * f);
    parts.push(cylBetween(prev, p, 0.2 - f * 0.06, 0.2 - f * 0.07, ring[i % 2], 7)); prev = p;
  }
  const top = prev, dk = col('#3f6a2a'), lt = col('#8cb04a');
  for (let k = 0; k < 11; k++) {
    const a = k / 11 * 6.28 + R(-.2, .2), out = V(Math.cos(a), 0, Math.sin(a)), L = R(2.2, 3), lift = R(0.4, 0.9), pts = [];
    for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push(top.clone().addScaledVector(out, L * t).add(V(0, lift * Math.sin(t * 2.2) - t * t * 1.6, 0))); }
    ribbon(gb, pts, R(0.7, 0.9), dk.clone().lerp(lt, 0.3), lt.clone());
  }
  return { trunk: mergeGeometries(parts), leaves: gb.build(), r: 0.3, ao: 2.4, leafMat: M.palm, leafDepth: DM.palm };
}
// Acacia : tronc fin qui se divise en fourche, couronne large et plate comme un parasol
function makeAcacia() {
  const gb = new GB(), parts = [], bark = col('#5a4632'), H = R(2.6, 3.6);
  const fork = V(R(-.3, .3), H * 0.55, R(-.3, .3));
  parts.push(cylBetween(V(0, -0.3, 0), fork, 0.2, 0.15, bark, 6));
  const tops = [];
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + R(-.4, .4), end = V(Math.cos(a) * R(1.4, 2.2), H + R(0, 0.5), Math.sin(a) * R(1.4, 2.2));
    parts.push(cylBetween(fork, end, 0.12, 0.05, bark, 5)); tops.push(end);
  }
  const clumps = tops.map(t => ({ c: t.clone().add(V(0, 0.3, 0)), r: R(1.5, 2.0) }));
  clumps.push({ c: V(0, H + 0.5, 0), r: 1.8 });
  const before = gb.p.length; canopy(gb, clumps, PAL.acacia, 0.5, 22);
  const cy = H + 0.45; for (let j = before; j < gb.p.length; j += 3) gb.p[j + 1] = cy + (gb.p[j + 1] - cy) * 0.18;   // aplatie
  return { trunk: mergeGeometries(parts), leaves: gb.build(), r: 0.3, ao: 3.4 };
}
// Baobab : tronc-bouteille énorme, branches courtes et noueuses, feuillage clairsemé
function makeBaobab() {
  const gb = new GB(), parts = [], bark = col('#8a7a68'), H = R(4.2, 5.4), R0 = R(0.9, 1.2);
  const trunk = lathe([[0, -0.4], [R0, -0.4], [R0 * 1.02, H * 0.25], [R0 * 0.9, H * 0.6], [R0 * 0.62, H * 0.9], [R0 * 0.5, H], [0, H]], 14);
  parts.push(prep(trunk, '#8a7a68'));
  const clumps = [];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * 6.28 + R(-.3, .3), s0 = V(Math.cos(a) * R0 * 0.4, H - 0.1, Math.sin(a) * R0 * 0.4), e = V(Math.cos(a) * R(1.6, 2.4), H + R(0.6, 1.4), Math.sin(a) * R(1.6, 2.4));
    parts.push(prep(cylBetween(s0, e, 0.22, 0.08, bark, 6), '#8a7a68'));
    if (rnd() < 0.7) clumps.push({ c: e.clone().add(V(0, 0.2, 0)), r: R(0.6, 0.9) });
  }
  canopy(gb, clumps, PAL.baobab, 0.45, 18);
  return { trunk: mergeGeometries(parts), leaves: gb.build(), r: R0 + 0.2, ao: 3.2 };
}
// Géant tropical : fût droit, contreforts en lames à la base, branches hautes, canopée dense, lianes pendantes
function makeJungleTree() {
  const gb = new GB(), parts = [], bark = col('#7a6a56'), liana = col('#3e5a2a'), H = R(9, 13);
  parts.push(cylBetween(V(0, -0.3, 0), V(R(-.3, .3), H, R(-.3, .3)), 0.5, 0.32, bark, 8));
  for (let k = 0; k < 5; k++) {   // contreforts : lames triangulaires rayonnantes
    const a = k / 5 * 6.28 + R(-.2, .2), sh = new THREE.Shape(); sh.moveTo(0.3, 0); sh.quadraticCurveTo(R(0.5, 0.7), 0.25, R(0.9, 1.3), 0); sh.lineTo(0.3, R(1.1, 1.6)); sh.closePath();
    const fin = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }); fin.translate(0, -0.25, -0.05); fin.rotateY(-a);
    parts.push(colorize(fin.index ? fin : fin, bark));
  }
  const top = V(0, H, 0), clumps = [{ c: V(0, H + 1.6, 0), r: R(2.4, 2.9) }], ends = [];
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * 6.28 + R(-.3, .3), e = V(Math.cos(a) * R(2.2, 3.2), H + R(0.4, 1.4), Math.sin(a) * R(2.2, 3.2));
    parts.push(cylBetween(V(0, H * 0.82, 0), e, 0.22, 0.08, bark, 6)); clumps.push({ c: e.clone().add(V(0, 0.5, 0)), r: R(1.8, 2.3) }); ends.push(e);
  }
  for (const e of ends) for (let k = 0; k < 2; k++) {   // lianes : tombent en légère courbe jusqu'au sol
    const s0 = e.clone().add(V(R(-.6, .6), 0, R(-.6, .6))), g0 = V(s0.x * R(0.6, 1.1), -0.2, s0.z * R(0.6, 1.1));
    let prev = s0;
    for (let j = 1; j <= 5; j++) { const t = j / 5, p = s0.clone().lerp(g0, t).add(V(Math.sin(t * Math.PI) * R(0.2, 0.5), 0, 0)); parts.push(cylBetween(prev, p, 0.035, 0.03, liana, 4)); prev = p; }
  }
  canopy(gb, clumps, PAL.tropic, 1.25, 13);
  return { trunk: mergeGeometries(parts.map(q => q.index ? q.toNonIndexed() : q)), leaves: gb.build(), r: 0.8, ao: 4 };
}
// Fougère arborescente : stipe fibreux et une couronne de grandes frondes arquées
function makeTreeFern() {
  const gb = new GB(), H = R(2.4, 4.2), c = col('#ffffff');
  const trunk = cylBetween(V(0, -0.3, 0), V(R(-.3, .3), H, R(-.3, .3)), 0.16, 0.12, col('#4a3a2c'), 6);
  const top = V(0, H, 0), k = 12;
  for (let i = 0; i < k; i++) {
    const a = i / k * 6.28 + R(-.2, .2), L = R(1.4, 2.0), out = V(Math.cos(a), 0, Math.sin(a)), side = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.32);
    const mid = top.clone().addScaledVector(out, L * 0.5).add(V(0, R(0.1, 0.35), 0)), dir = out.clone().multiplyScalar(L * 0.5).add(V(0, -0.15, 0));
    gb.quad(mid, side, dir, V(Math.cos(a) * 0.4, 0.9, Math.sin(a) * 0.4).normalize(), [c.clone().multiplyScalar(0.6), c.clone().multiplyScalar(0.6), c, c]);
  }
  return { trunk, leaves: gb.build(), r: 0.25, ao: 1.8, leafMat: M.fernTree, leafDepth: DM.fern };
}
// Peuplier des berges : colonne étroite et haute, feuillage clair qui frémit
function makePoplar() {
  const gb = new GB(), H = R(8, 11);
  const trunk = cylBetween(V(0, -0.3, 0), V(0, H * 0.85, 0), 0.22, 0.08, col('#8a8070'), 6);
  const clumps = [];
  for (let y = 1.6; y < H; y += 0.7) { const f = y / H; clumps.push({ c: V(R(-.1, .1), y, R(-.1, .1)), r: 0.95 * Math.sin(Math.PI * Math.pow(f, 0.7)) + 0.25 }); }
  canopy(gb, clumps, PAL.poplar, 0.6, 26);
  return { trunk, leaves: gb.build(), r: 0.25, ao: 1.6 };
}
function makeBamboo() {
  const gb = new GB(), parts = [];
  const n = 5 + (rnd() * 6 | 0), green = col('#6f9a34'), yel = col('#a8b44a'), node = col('#4e6a24');
  for (let k = 0; k < n; k++) {
    const a = R(0, 6.28), d = Math.sqrt(rnd()) * 0.75, H = R(6.5, 10.5), r0 = R(0.05, 0.085);
    const base = V(Math.cos(a) * d, -0.2, Math.sin(a) * d), lean = V(Math.cos(a), 0, Math.sin(a)).multiplyScalar(R(0.04, 0.12) + d * 0.08);
    const segs = Math.round(H / R(0.55, 0.75)), tone = green.clone().lerp(yel, R(0, 0.6));
    let prev = base.clone();
    for (let i = 1; i <= segs; i++) {
      const f = i / segs, p = base.clone().add(V(lean.x * H * f * f * 1.3, H * f, lean.z * H * f * f * 1.3));
      const r = r0 * (1 - f * 0.55);
      parts.push(cylBetween(prev, p, r * 1.02, r, tone.clone().multiplyScalar(R(0.9, 1.05)), 5));
      if (i < segs) parts.push(cylBetween(p.clone().add(V(0, -0.025, 0)), p.clone().add(V(0, 0.025, 0)), r * 1.25, r * 1.25, node, 5));   // nœud
      if (f > 0.55) {   // un éventail de feuilles à chaque nœud du haut
        const m = 2 + (rnd() * 2 | 0);
        for (let j = 0; j < m; j++) {
          const b = R(0, 6.28), out = V(Math.cos(b), 0, Math.sin(b)), L = R(0.5, 0.9) * (1.2 - f * 0.4);
          const c = p.clone().addScaledVector(out, L * 0.6).add(V(0, -L * 0.15, 0));
          const nrm = out.clone().multiplyScalar(0.55).add(V(0, 0.8, 0)).normalize();
          const cn = out.clone().multiplyScalar(0.6).add(V(R(-.3, .3), 0.8, R(-.3, .3))).normalize();
          card(gb, c, cn, nrm, L, palCol(PAL.bamboo, 0.25 + 0.55 * f + R(-0.15, 0.15)));
        }
      }
      prev = p;
    }
  }
  return { trunk: mergeGeometries(parts), leaves: gb.build(), birch: false, r: 0.95, ao: 2.6, culm: true };
}
function makeFir(snowy) {
  const gb = new GB(), H = R(6.5, 9.5);
  const trunk = cylBetween(V(0, -0.3, 0), V(0, H + 0.5, 0), 0.22, 0.04, col('#3e2e22'), 6);
  const tiers = 11 + (rnd() * 4 | 0), dk = col('#10241c'), md = col('#1e3e2e'), lt = col('#4a7050'), snow = col('#eef2f6');
  for (let k = 0; k < tiers; k++) {
    const f = k / (tiers - 1), y = 0.9 + f * (H - 0.6), rad = 1.55 * Math.pow(1 - f, 0.95) * R(0.9, 1.08) + 0.12;
    const n = Math.round(7 + rad * 12);
    for (let i = 0; i < n; i++) {
      const a = R(0, 6.28), rr = rad * Math.sqrt(R(0.15, 1));
      const p = V(Math.cos(a) * rr, y + R(-0.15, 0.1) - rr * 0.38, Math.sin(a) * rr);
      const nrm = V(Math.cos(a) * 0.6, 0.8, Math.sin(a) * 0.6).normalize();
      const cn = V(Math.cos(a) * 0.45 + R(-.25, .25), 1, Math.sin(a) * 0.45 + R(-.25, .25)).normalize();
      const t = 0.12 + 0.45 * (rr / rad) + 0.2 * f + R(-0.1, 0.1);
      let c = t < 0.5 ? dk.clone().lerp(md, t * 2) : md.clone().lerp(lt, (t - 0.5) * 2);
      if (snowy && rr / rad > 0.45 && nrm.y > 0.6 && rnd() < 0.45) c = c.lerp(snow, R(0.35, 0.65));
      card(gb, p, cn, nrm, 0.55 * R(0.8, 1.2), c);
    }
  }
  return { trunk, leaves: gb.build(), birch: false, r: 0.3, ao: 2.2, needles: true };
}
function makePine() {
  const gb = new GB(), H = R(5.5, 7.8);
  const trunk = cylBetween(V(0, -0.3, 0), V(R(-.15, .15), H + 0.6, R(-.15, .15)), 0.24, 0.05, col('#4a3426'), 6);
  const tiers = 7 + (rnd() * 3 | 0);
  for (let k = 0; k < tiers; k++) {
    const f = k / (tiers - 1), y = 1.3 + f * (H - 0.9), rad = 2.1 * Math.pow(1 - f, 1.1) * R(0.85, 1.1) + 0.3;
    const n = Math.round(8 + rad * 13);
    for (let i = 0; i < n; i++) {
      const a = R(0, 6.28), rr = rad * Math.sqrt(R(0.12, 1));
      const p = V(Math.cos(a) * rr, y + R(-0.2, 0.15) - rr * 0.28, Math.sin(a) * rr);
      const nrm = V(Math.cos(a) * 0.65, 0.75, Math.sin(a) * 0.65).normalize();
      const cn = V(Math.cos(a) * 0.55 + R(-.3, .3), 1, Math.sin(a) * 0.55 + R(-.3, .3)).normalize();
      card(gb, p, cn, nrm, 0.62 * R(0.8, 1.2), palCol(PAL.pine, 0.15 + 0.4 * (rr / rad) + 0.3 * f + R(-0.12, 0.12)));
    }
  }
  return { trunk, leaves: gb.build(), birch: false, r: 0.3, ao: 2.4, needles: true };
}
function makeParasol() {   // pin parasol : long fût incliné, couronne large et plate
  const gb = new GB(), parts = [], bark = col('#6a4a34');
  const lean = V(R(-1.2, 1.2), 0, R(-1.2, 1.2)), H = R(5.2, 6.4), top = V(lean.x, H, lean.z);
  const mid = V(lean.x * 0.35 + R(-.3, .3), H * 0.55, lean.z * 0.35 + R(-.3, .3));
  parts.push(cylBetween(V(0, -0.3, 0), mid, 0.26, 0.2, bark, 7), cylBetween(mid, top, 0.2, 0.14, bark, 7));
  const k = 9 + (rnd() * 3 | 0);
  for (let i = 0; i < k; i++) {
    const a = i / k * 6.28 + R(-.25, .25), d = R(1.6, 3.0), c = V(top.x + Math.cos(a) * d, H + R(0.2, 0.6), top.z + Math.sin(a) * d);
    parts.push(cylBetween(top.clone().add(V(0, -0.4, 0)), c.clone().add(V(0, -0.3, 0)), 0.1, 0.05, bark, 5));
    // touffes aplaties : on écrase les cartes verticalement
    const before = gb.p.length; canopy(gb, [{ c, r: R(1.0, 1.35) }], PAL.parasol, 0.62, 20);
    for (let j = before; j < gb.p.length; j += 3) gb.p[j + 1] = c.y + (gb.p[j + 1] - c.y) * 0.28;
  }
  const before = gb.p.length; canopy(gb, [{ c: V(top.x, H + 0.6, top.z), r: 1.9 }], PAL.parasol, 0.62, 18);
  for (let j = before; j < gb.p.length; j += 3) gb.p[j + 1] = H + 0.6 + (gb.p[j + 1] - H - 0.6) * 0.28;
  return { trunk: mergeGeometries(parts), leaves: gb.build(), birch: false, r: 0.3, ao: 3.2, needles: true };
}
function makeOlive() {   // olivier : tronc tors et creusé, plusieurs branches, feuillage gris-vert léger
  const gb = new GB(), parts = [], bark = col('#7a6a58');
  const base = V(0, -0.3, 0), H = R(1.3, 1.8), crotch = V(R(-.3, .3), H, R(-.3, .3));
  parts.push(cylBetween(base, crotch.clone().multiplyScalar(0.5).add(V(R(-.2, .2), 0, R(-.2, .2))), 0.36, 0.28, bark, 7));
  parts.push(cylBetween(crotch.clone().multiplyScalar(0.5), crotch, 0.28, 0.22, bark, 7));
  const clumps = [];
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + R(-.4, .4), end = crotch.clone().add(V(Math.cos(a) * R(0.9, 1.5), R(0.9, 1.6), Math.sin(a) * R(0.9, 1.5)));
    parts.push(cylBetween(crotch, end, 0.14, 0.07, bark, 5));
    clumps.push({ c: end.clone().add(V(0, 0.35, 0)), r: R(0.8, 1.1) });
  }
  clumps.push({ c: crotch.clone().add(V(0, 1.9, 0)), r: 1.0 });
  canopy(gb, clumps, PAL.olive, 0.5, 26);
  return { trunk: mergeGeometries(parts), leaves: gb.build(), birch: false, r: 0.4, ao: 2.6 };
}
function makeCypress() {   // cyprès : colonne sombre et effilée
  const gb = new GB(), H = R(6, 8.5), clumps = [];
  const trunk = cylBetween(V(0, -0.3, 0), V(0, 1.2, 0), 0.16, 0.12, col('#4a3828'), 6);
  for (let y = 0.9; y < H; y += 0.55) { const f = y / H, r = 0.75 * Math.sin(Math.PI * Math.pow(f, 0.8)) * (1 - f * 0.35) + 0.18; clumps.push({ c: V(R(-.05, .05), y, R(-.05, .05)), r }); }
  canopy(gb, clumps, PAL.cypress, 0.42, 30);
  return { trunk, leaves: gb.build(), birch: false, r: 0.25, ao: 1.6 };
}
// Saule pleureur : tronc court et noueux, grosses charpentières, puis des centaines de rameaux souples
// qui montent en arche au-dessus de la couronne et retombent en rideau presque jusqu'au sol.
function ribbon(gb, pts, w, c0, c1) {
  const b = gb.p.length / 3, n = pts.length;
  for (let k = 0; k < n; k++) {
    const p = pts[k], q = pts[Math.min(n - 1, k + 1)], o = pts[Math.max(0, k - 1)];
    const dir = q.clone().sub(o).normalize();
    let side = V(0, 1, 0).cross(dir); if (side.lengthSq() < 1e-4) side = V(1, 0, 0); side.normalize();
    const nrm = dir.clone().cross(side).normalize(); if (nrm.y < 0) nrm.negate();
    const f = k / (n - 1), c = c0.clone().lerp(c1, f), ww = w * (1 - f * 0.35);
    for (const sg of [-1, 1]) {
      const v = p.clone().addScaledVector(side, sg * ww / 2);
      gb.p.push(v.x, v.y, v.z);
      const nn = nrm.clone().multiplyScalar(0.6).add(V(dir.z, 0.5, -dir.x).multiplyScalar(0.0)).add(V(0, 0.45, 0)).normalize();
      gb.n.push(nn.x, nn.y, nn.z); gb.uv.push(sg < 0 ? 0 : 1, 1 - f); gb.c.push(c.r, c.g, c.b);
    }
  }
  for (let k = 0; k < n - 1; k++) { const a = b + k * 2; gb.i.push(a, a + 1, a + 3, a, a + 3, a + 2); }
}
function makeWillow() {
  const gb = new GB(), parts = [], bark = col('#5a4a3a');
  const H = R(1.7, 2.3), top = V(R(-.3, .3), H, R(-.3, .3));
  parts.push(cylBetween(V(0, -0.4, 0), V(top.x * 0.5, H * 0.5, top.z * 0.5), 0.52, 0.4, bark, 9));
  parts.push(cylBetween(V(top.x * 0.5, H * 0.5, top.z * 0.5), top, 0.4, 0.34, bark, 9));
  const crownY = H + R(1.6, 2.1), anchors = [];
  const nl = 3 + (rnd() * 2 | 0);
  for (let i = 0; i < nl; i++) {             // charpentières qui montent en éventail
    const a = i / nl * 6.28 + R(-.35, .35), rr = R(0.9, 1.5);
    const mid = top.clone().add(V(Math.cos(a) * rr * 0.45, R(0.7, 1.0), Math.sin(a) * rr * 0.45));
    const end = top.clone().add(V(Math.cos(a) * rr, crownY - H - R(0.35, 0.6), Math.sin(a) * rr));
    parts.push(cylBetween(top, mid, 0.24, 0.16, bark, 7), cylBetween(mid, end, 0.16, 0.07, bark, 6));
    anchors.push(end, mid.clone().lerp(end, 0.5));
  }
  const dark = col('#4f6e2a'), light = col('#c3d27a'), mid = col('#86a444');
  const N = 300;
  for (let s = 0; s < N; s++) {
    const fromTop = s < 70;   // une partie part du cœur de la couronne pour la couvrir
    const an = fromTop ? top.clone().add(V(R(-.5, .5), crownY - H - 0.2, R(-.5, .5))) : anchors[rnd() * anchors.length | 0].clone().add(V(R(-.35, .35), R(-.15, .2), R(-.35, .35)));
    const a = Math.atan2(an.z - top.z, an.x - top.x) + R(-0.9, 0.9);
    const out = V(Math.cos(a), 0, Math.sin(a)), tan = V(-out.z, 0, out.x);
    const r0 = Math.hypot(an.x - top.x, an.z - top.z), R1 = R(2.3, 3.3), rise = R(0.5, 0.95), curl = R(-0.3, 0.3);
    const groundY = R(0.25, 0.9) + (rnd() < 0.25 ? R(0.6, 1.4) : 0);   // certains rideaux s'arrêtent plus haut
    const pts = [];
    for (let k = 0; k <= 5; k++) {           // arche au-dessus de la couronne
      const t = k / 5, rad = r0 + (R1 - r0) * Math.sin(t * Math.PI / 2);
      pts.push(V(top.x + out.x * rad + tan.x * curl * t, an.y + rise * Math.sin(t * Math.PI) - t * 0.5, top.z + out.z * rad + tan.z * curl * t));
    }
    const last = pts[pts.length - 1], drop = last.y - groundY;
    for (let k = 1; k <= 7; k++) {           // chute verticale, un peu évasée
      const t = k / 7;
      pts.push(V(last.x + out.x * 0.25 * t + tan.x * curl * 0.3 * t, last.y - drop * t, last.z + out.z * 0.25 * t + tan.z * curl * 0.3 * t));
    }
    const shade = R(0, 1), c0 = dark.clone().lerp(mid, shade * 0.6), c1 = mid.clone().lerp(light, 0.4 + shade * 0.6);
    ribbon(gb, pts, R(0.36, 0.5), c0, c1);
  }
  return { trunk: mergeGeometries(parts), leaves: gb.build(), birch: false, r: 0.55, ao: 3.4, willow: true };
}
function makeReeds() {
  const gb = new GB(), lo = col('#ffffff').multiplyScalar(0.7), hi = col('#ffffff'), up = V(0, 1, 0);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI + 0.3; gb.quad(V(0, 0.6, 0), V(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32), V(0, 0.6, 0), up, [lo, lo, hi, hi]); }
  return setTile(gb.build(), 6);
}
function makeLily() {
  const gb = new GB(); gb.quad(V(0, 0, 0), V(0.3, 0, 0), V(0, 0, 0.3), V(0, 1, 0), col('#ffffff'));
  return setTile(gb.build(), 7);
}
// Rochers : icosaèdre déformé par du bruit puis « taillé » par des plans aléatoires (facettes nettes),
// base aplatie et enterrée ; couleurs par facette : mousse sur le dessus, lichen, pied plus sombre.
function makeRock(shape, mossy, pale = false, snowy = false, red = false) {
  let g = new THREE.IcosahedronGeometry(1, 4);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position, idx = g.index.array, o = R(0, 100);
  const S = { boulder: [1.15, 0.8, 1], slab: [1.6, 0.45, 1.2], spire: [0.75, 1.45, 0.7], round: [1, 0.75, 1] }[shape];
  // silhouette : union de 2 à 3 lobes (rayon exact le long de chaque direction)
  const lobes = [{ c: V(0, 0, 0), r: 1 }];
  for (let k = 0, n = 1 + (rnd() * 2 | 0); k < n; k++) { const d = randUnit(); d.y = Math.abs(d.y) * 0.4; lobes.push({ c: d.normalize().multiplyScalar(R(0.35, 0.6)), r: R(0.55, 0.8) }); }
  const cuts = [];
  for (let k = 0; k < 10; k++) { const n = randUnit(); if (n.y < -0.2) n.y = -n.y * 0.4; cuts.push([n.normalize(), R(0.55, 0.82)]); }
  const p = V(0, 0, 0), plane = new Int8Array(pos.count).fill(-1), crack = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const d = p.fromBufferAttribute(pos, i).normalize().clone();
    let rr = 0.3;
    for (const L of lobes) { const b = d.dot(L.c), disc = b * b - L.c.lengthSq() + L.r * L.r; if (disc > 0) rr = Math.max(rr, b + Math.sqrt(disc)); }
    const nz = 0.2 * noise(d.x * 1.5 + o, d.y * 1.5 + d.z) + 0.13 * noise(d.y * 2.6 - d.x, d.z * 2.6 + o) + 0.06 * noise(d.z * 6 + d.y, d.x * 6 - o);
    const cr = noise(d.x * 3.1 + d.z * 1.7 + o, d.y * 3.4 - o);        // fissures : creux étroits le long d'une ligne de niveau du bruit
    crack[i] = 1 - smooth(0, 0.05, Math.abs(cr));
    p.copy(d).multiplyScalar(rr * (1 + nz) - crack[i] * 0.05);
    let be = 0.04; cuts.forEach(([n, c], k) => { const e = p.dot(n) - c; if (e > 0) { p.addScaledVector(n, -e); if (e > be) { be = e; plane[i] = k; } } });
    p.set(p.x * S[0], p.y * S[1], p.z * S[2]);
    if (p.y < -0.25 * S[1]) p.y = -0.25 * S[1] - (p.y + 0.25 * S[1]) * 0.15;
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  const sn = V(0, 0, 0);
  for (let i = 0; i < pos.count; i++) if (plane[i] >= 0) {
    const n = cuts[plane[i]][0]; sn.set(n.x / S[0], n.y / S[1], n.z / S[2]).normalize();
    const cur = V(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).lerp(sn, 0.97).normalize(); nrm.setXYZ(i, cur.x, cur.y, cur.z);
  }
  // occlusion de cavité : un sommet en creux par rapport à ses voisins est assombri
  const acc = new Float32Array(pos.count * 3), cnt = new Uint16Array(pos.count), edge = new Uint8Array(pos.count);
  for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) {
    const va = idx[t + a], vb = idx[t + b]; if (plane[va] !== plane[vb]) edge[va] = 1; acc[va * 3] += pos.getX(vb); acc[va * 3 + 1] += pos.getY(vb); acc[va * 3 + 2] += pos.getZ(vb); cnt[va]++;
  }
  const cols = new Float32Array(pos.count * 3);
  const grey = red ? [col('#b8724a'), col('#c88a5a'), col('#a8643e')][rnd() * 3 | 0] : pale ? [col('#d9d2c0'), col('#cfc6b0'), col('#e2dccb')][rnd() * 3 | 0] : [col('#9a9384'), col('#8e8c84'), col('#a39682'), col('#8a8474'), col('#96907e')][rnd() * 5 | 0];
  const cool = grey.clone().lerp(col('#6e7680'), 0.35);
  const moss = col('#3e5a26'), mossL = col('#5c7a30'), mossD = col('#2a401c'), lich = [col('#d2cfa2'), col('#c2a84c'), col('#aab49a')], dark = col('#3a3832');
  const top = S[1];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nrm.getY(i);
    const ax = acc[i * 3] / cnt[i] - x, ay = acc[i * 3 + 1] / cnt[i] - y, az = acc[i * 3 + 2] / cnt[i] - z;
    const concave = clamp((ax * nrm.getX(i) + ay * ny + az * nrm.getZ(i)) * 30);
    const c = cool.clone().lerp(grey, clamp(ny * 0.8 + 0.4));                                   // flancs plus froids, dessus chauds
    c.multiplyScalar(0.88 + 0.22 * noise(x * 1.3 + o, z * 1.3 + y));
    c.lerp(dark, clamp(0.5 - (y + 0.25 * top) / (1.2 * top)) * 0.85);
    c.multiplyScalar(1 - concave * 0.45 - crack[i] * 0.35);
    if (noise(y * 7 + o, x * 0.3) > 0.3) c.multiplyScalar(0.9);                                    // strates
    if (edge[i] && plane[i] >= 0 && concave < 0.2) c.multiplyScalar(1.13);                        // arêtes usées, plus claires
    if (mossy) {                                                                                  // mousse : plaques nettes sur le dessus, qui coulent un peu sur les flancs
      const mz = ny * 1.2 + noise(x * 2.1 + o, z * 2.1 - y) * 0.8 + noise(x * 9 - o, z * 9) * 0.25 + concave * 0.6 - 0.7;
      const k = smooth(0, 0.08, mz);
      if (k > 0) { const t2 = noise(x * 7, z * 7 + o); c.lerp(t2 > 0.2 ? mossL : t2 < -0.2 ? mossD : moss, k * 0.92); }
    }
    if (snowy) { const sk = smooth(0.25, 0.5, ny + noise(x * 3 + o, z * 3) * 0.25); if (sk > 0) c.lerp(col('#f2f5f9'), sk * 0.95); }
    const li = noise(x * 4.3 - o, z * 4.3 + y * 2), lt = mossy ? 0.36 : 0.18;
    if (li > lt && concave < 0.4) c.lerp(lich[(Math.abs(Math.floor(li * 9)) % 3)], smooth(lt, lt + 0.08, li) * 0.75);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return { geo: g, base: 0.25 * S[1], foot: Math.max(S[0], S[2]) };
}
function makeGrass() {
  const gb = new GB(), lo = col('#ffffff').multiplyScalar(0.72), hi = col('#ffffff').multiplyScalar(1.08);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI + R(-0.25, 0.25), lean = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(R(-0.12, 0.12));
    const r = V(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36), u = V(0, 0.27, 0).add(lean);
    const n1 = V(0, 1, 0), n2 = V(0, 1, 0).add(lean.clone().multiplyScalar(0.8)).normalize();
    gb.quad(V(0, 0.27, 0).add(lean), r, u, n1, [lo, lo, hi, hi], n2);
  }
  return gb.build();
}
function makeFern() {
  const gb = new GB(), c = col('#ffffff'), k = 7;
  for (let i = 0; i < k; i++) {
    const a = i / k * Math.PI * 2 + R(-.2, .2), el = R(0.3, 0.7), L = R(0.55, 0.75);
    const dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const side = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.16);
    gb.quad(dir.clone().multiplyScalar(L), side, dir.clone().multiplyScalar(L), V(0, 1, 0), [c.clone().multiplyScalar(.5), c.clone().multiplyScalar(.5), c, c]);
  }
  return gb.build();
}

// atlas de fleurs : 0 marguerite · 1 bouton d'or · 2 campanule · 3 coquelicot · 4 trèfle · 5 feuille (rosette)
const FT = 8;
const floraTex = canvasTex(64 * FT, 64, (g) => {
  const r = mulberry32(31);
  const stem = (x0, x1, y1, w = 1.6) => { g.strokeStyle = '#3f7a2a'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, 64); g.quadraticCurveTo(x0, (64 + y1) / 2, x1, y1); g.stroke(); };
  const leafs = (ox, n) => { g.fillStyle = '#4e8a30'; for (let i = 0; i < n; i++) leafShape(g, ox + 10 + r() * 44, 64, 14 + r() * 10, 4, (r() - 0.5) * 1.6 + Math.PI); };
  const petals = (x, y, n, rad, w, colr) => { g.fillStyle = colr; for (let i = 0; i < n; i++) leafShape(g, x, y, rad, w, i / n * Math.PI * 2); };
  // 0 marguerites
  leafs(0, 4);
  for (let i = 0; i < 4; i++) { const x = 12 + r() * 40, y = 12 + r() * 22; stem(x + (r() - .5) * 8, x, y); petals(x, y, 10, 8, 2.6, '#fbfaf2'); g.fillStyle = '#f1c232'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
  // 1 boutons d'or
  leafs(64, 5);
  for (let i = 0; i < 6; i++) { const x = 64 + 10 + r() * 44, y = 10 + r() * 30; stem(x + (r() - .5) * 10, x, y, 1.2); petals(x, y, 5, 5.5, 3.2, '#ffd83a'); g.fillStyle = '#d99a10'; g.beginPath(); g.arc(x, y, 1.4, 0, 7); g.fill(); }
  // 2 campanules
  leafs(128, 4);
  for (let i = 0; i < 3; i++) {
    const x = 128 + 14 + r() * 36; stem(x, x + 4, 6, 1.4);
    for (let k = 0; k < 4; k++) { const by = 10 + k * 9, bx = x + 4 - k + (k % 2 ? 4 : -3); g.fillStyle = k % 2 ? '#8c6fe0' : '#7258cc'; g.beginPath(); g.moveTo(bx - 3.5, by + 5); g.quadraticCurveTo(bx, by - 4, bx + 3.5, by + 5); g.closePath(); g.fill(); }
  }
  // 3 coquelicots
  leafs(192, 3);
  for (let i = 0; i < 3; i++) { const x = 192 + 12 + r() * 40, y = 8 + r() * 16; stem(x + (r() - .5) * 12, x, y, 1.3); g.fillStyle = '#e0392b'; g.beginPath(); g.arc(x, y, 6.5, 0, 7); g.fill(); g.fillStyle = '#ff6a4a'; g.beginPath(); g.arc(x - 1.5, y - 1.5, 3.5, 0, 7); g.fill(); g.fillStyle = '#2a1a1a'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  // 4 trèfle
  for (let i = 0; i < 9; i++) { const x = 256 + 6 + r() * 52, y = 30 + r() * 28; g.fillStyle = i % 2 ? '#5a9a38' : '#4b8a32'; for (let k = 0; k < 3; k++) { const a = k * 2.1 + r(); g.beginPath(); g.arc(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 3.6, 0, 7); g.fill(); } }
  for (let i = 0; i < 4; i++) { const x = 256 + 10 + r() * 44, y = 14 + r() * 18; stem(x, x, y, 1.1); g.fillStyle = '#f4efe6'; g.beginPath(); g.arc(x, y, 4.2, 0, 7); g.fill(); g.fillStyle = '#e7b8c8'; g.beginPath(); g.arc(x + 1, y + 1.5, 2.2, 0, 7); g.fill(); }
  // 5 feuille large (teintée par instance)
  g.fillStyle = '#e8e8e8'; leafShape(g, 320 + 32, 64, 60, 22, Math.PI);
  g.strokeStyle = '#a8a8a8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(352, 64); g.lineTo(352, 10); g.stroke();
  // 6 roseaux / massettes
  for (let i = 0; i < 9; i++) {
    const x = 384 + 6 + r() * 52, top = 4 + r() * 18, lean = (r() - 0.5) * 10;
    g.fillStyle = i % 3 ? '#6f9a3e' : '#557f32';
    g.beginPath(); g.moveTo(x - 1.8, 64); g.quadraticCurveTo(x, 40, x + lean, top); g.quadraticCurveTo(x + 0.6, 40, x + 1.8, 64); g.fill();
  }
  for (let i = 0; i < 3; i++) {
    const x = 384 + 16 + r() * 32, y = 8 + r() * 10;
    g.strokeStyle = '#6a7a3a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, 64); g.lineTo(x, y - 6); g.stroke();
    g.fillStyle = '#6b3f22'; g.beginPath(); g.ellipse(x, y + 5, 2.6, 7, 0, 0, 7); g.fill();
  }
  // 7 nénuphar (vu de dessus)
  g.fillStyle = '#4f8a3a'; g.beginPath(); g.moveTo(448 + 32, 32); g.arc(448 + 32, 32, 28, 0.35, Math.PI * 2 - 0.05); g.closePath(); g.fill();
  g.strokeStyle = '#3c6e2e'; g.lineWidth = 1.2;
  for (let k = 0; k < 9; k++) { const a = 0.5 + k * 0.62; g.beginPath(); g.moveTo(480, 32); g.lineTo(480 + Math.cos(a) * 25, 32 + Math.sin(a) * 25); g.stroke(); }
  g.fillStyle = '#6aa04a'; g.beginPath(); g.arc(472, 26, 9, 0, 7); g.fill();
});
function setTile(geo, k) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i) * 0.98 + 0.01) / FT); return geo; }
function makeFlowerTuft(k) {
  const gb = new GB(), lo = col('#ffffff').multiplyScalar(0.7), hi = col('#ffffff'), up = V(0, 1, 0);
  for (let i = 0; i < 2; i++) { const a = i * Math.PI / 2 + 0.4; gb.quad(V(0, 0.24, 0), V(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3), V(0, 0.24, 0), up, [lo, lo, hi, hi]); }
  return setTile(gb.build(), k);
}
function makeRosette() {
  const gb = new GB(), n = 7, c0 = col('#ffffff').multiplyScalar(0.75), c1 = col('#ffffff');
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + R(-.25, .25), el = R(0.15, 0.45), L = R(0.32, 0.5);
    const dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const side = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(L * 0.42);
    gb.quad(dir.clone().multiplyScalar(L / 2).add(V(0, 0.02, 0)), side, dir.clone().multiplyScalar(L / 2), V(0, 1, 0), [c0, c0, c1, c1]);
  }
  return setTile(gb.build(), 5);
}
function makeDeadLeaf() {
  const gb = new GB(), c = col('#ffffff');
  gb.quad(V(0, 0.012, 0), V(0.09, 0, 0), V(0, 0, 0.14), V(0, 1, 0), c);
  return setTile(gb.build(), 5);
}
// ── champignons : amanite (chapeau rouge à points blancs, anneau, bulbe), cèpe (pied ventru, chapeau brun), mycènes en touffe
const prep = (g, hex) => { colorize(g, col(hex)); if (g.index) g = g.toNonIndexed(); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };
function makeMushroom(type) {
  const parts = [];
  if (type === 'amanite' || type === '#c23b2a') {
    parts.push(prep(lathe([[0, 0], [0.07, 0], [0.075, 0.03], [0.05, 0.065], [0.04, 0.2], [0.045, 0.24], [0, 0.245]], 10), '#f1ebdc'));
    parts.push(prep(lathe([[0.042, 0.19], [0.075, 0.16], [0.07, 0.15], [0.04, 0.17]], 10), '#e9e1cc'));               // anneau
    parts.push(prep(lathe([[0, 0.205], [0.14, 0.205], [0.16, 0.215], [0.15, 0.25], [0.11, 0.29], [0.06, 0.31], [0, 0.315]], 14), '#c8321f'));
    parts.push(prep(new THREE.CircleGeometry(0.14, 14).rotateX(Math.PI / 2).translate(0, 0.207, 0), '#efe2c4'));      // lamelles
    for (let k = 0; k < 9; k++) { const a = R(0, 6.28), d = R(0.02, 0.12), y = 0.315 - d * d * 4.5; parts.push(prep(new THREE.SphereGeometry(0.024, 5, 3).scale(1, 0.45, 1).translate(Math.cos(a) * d, y, Math.sin(a) * d), '#fbf7ee')); }
  } else if (type === 'cepe' || type === '#8a5c38') {
    parts.push(prep(lathe([[0, 0], [0.07, 0], [0.095, 0.05], [0.09, 0.11], [0.065, 0.18], [0.06, 0.2], [0, 0.205]], 10), '#e6d6b4'));
    parts.push(prep(new THREE.CircleGeometry(0.15, 14).rotateX(Math.PI / 2).translate(0, 0.19, 0), '#c9b25e'));      // tubes jaune-olive
    parts.push(prep(lathe([[0, 0.185], [0.15, 0.185], [0.17, 0.205], [0.16, 0.25], [0.11, 0.29], [0, 0.3]], 14), '#7a4524'));
    parts.push(prep(lathe([[0.14, 0.2], [0.168, 0.205], [0.16, 0.23]], 14), '#a8723e'));                             // bord plus clair
  } else {   // mycènes : touffe de petits chapeaux coniques sur pieds fins
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + R(-0.3, 0.3), d = R(0.02, 0.09), x = Math.cos(a) * d, z = Math.sin(a) * d, h = R(0.12, 0.24), lean = R(-0.25, 0.25);
      const st = new THREE.CylinderGeometry(0.008, 0.011, h, 5).translate(0, h / 2, 0).rotateZ(lean).translate(x, 0, z);
      parts.push(prep(st, '#d9c9a8'));
      parts.push(prep(new THREE.ConeGeometry(0.035, 0.045, 10).translate(0, h + 0.012, 0).rotateZ(lean).translate(x, 0, z), k % 2 ? '#b98a56' : '#c99a62'));
    }
  }
  return mergeGeometries(parts);
}
// ── pissenlits : tige fine + tête en cartes croisées (aigrette blanche ou fleur jaune), dont une horizontale visible du dessus
const dandTex = canvasTex(128, 64, (g) => {
  const r = mulberry32(13);
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.fillStyle = '#fff';
  for (let k = 0; k < 70; k++) { const a = r() * 6.28, L = 24 + r() * 5; g.lineWidth = 0.8; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * L, 32 + Math.sin(a) * L); g.stroke(); g.beginPath(); g.arc(32 + Math.cos(a) * L, 32 + Math.sin(a) * L, 1.6, 0, 7); g.fill(); }
  g.fillStyle = '#8a7a5a'; g.beginPath(); g.arc(32, 32, 3.5, 0, 7); g.fill();
  for (let layer = 0; layer < 3; layer++) for (let k = 0; k < 34; k++) {
    const a = k / 34 * 6.28 + layer * 0.09, L = 26 - layer * 7;
    g.fillStyle = ['#f2b51c', '#f8cc2c', '#ffe066'][layer]; leafShape(g, 96, 32, L, 2.4, a - Math.PI / 2);
  }
  g.fillStyle = '#e09a10'; g.beginPath(); g.arc(96, 32, 4, 0, 7); g.fill();
});
function makeDandelionHead(bloom) {
  const gb = new GB(), c = col('#ffffff'), sz = bloom ? 0.1 : 0.15, H = bloom ? 0.3 : 0.42;
  for (let i = 0; i < 2; i++) { const a = i * Math.PI / 2 + 0.3; gb.quad(V(0, H, 0), V(Math.cos(a) * sz, 0, Math.sin(a) * sz), V(0, sz, 0), V(0, 1, 0), c); }
  gb.quad(V(0, H + 0.01, 0), V(sz, 0, 0), V(0, 0, sz), V(0, 1, 0), c);
  const g = gb.build(), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (bloom ? 0.5 : 0) + uv.getX(i) * 0.5);
  return g;
}
function makeDandelionStem(bloom) {
  const H = bloom ? 0.3 : 0.42;
  const st = new THREE.CylinderGeometry(0.008, 0.013, H, 5, 3); st.translate(0, H / 2, 0);
  const p = st.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y / H * 1.6) * 0.03); }
  st.computeVertexNormals();
  return colorize(st, col('#6f9a3a'));
}
// ── tronc couché : écorce à sillons + mousse sur le dessus, cernes aux extrémités
const barkTex = canvasTex(64, 128, (g, w, h) => {
  const r = mulberry32(21);
  g.fillStyle = '#6b5038'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 40; k++) { const x = r() * w, v = ['#4a3626', '#80644a', '#5a4430', '#927456'][r() * 4 | 0]; g.strokeStyle = v; g.lineWidth = 0.8 + r() * 2; g.beginPath(); let xx = x; g.moveTo(xx, 0); for (let y = 0; y <= h; y += 6) { xx += (r() - 0.5) * 1.6; g.lineTo(xx, y); } g.stroke(); }
  for (let k = 0; k < 14; k++) { g.fillStyle = '#3c2c20'; g.fillRect(r() * w, r() * h, 2 + r() * 6, 1 + r() * 2); }
});
barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping; barkTex.repeat.set(3, 2);
const ringTex = canvasTex(64, 64, (g) => {
  g.fillStyle = '#c9a678'; g.fillRect(0, 0, 64, 64);
  for (let k = 3; k < 30; k += 2.6) { g.strokeStyle = k % 5.2 < 2.6 ? '#a8845a' : '#b8946a'; g.lineWidth = 1.2; g.beginPath(); g.arc(32 + Math.sin(k) * 0.8, 32, k, 0, 7); g.stroke(); }
  g.strokeStyle = '#5a4030'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.stroke();
  g.strokeStyle = '#7a5a3e'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 32); g.lineTo(52, 18); g.stroke();
});
function makeLog() {
  const g = new THREE.CylinderGeometry(0.21, 0.27, 1, 12, 8);
  const p = g.attributes.position, o = R(0, 50), cols = new Float32Array(p.count * 3), moss = new THREE.Color(0.95, 1.7, 0.6), base = col('#ffffff');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + noise(a * 1.5 + o, y * 3) * 0.12;
    p.setXYZ(i, x * k + Math.sin(y * 2.4) * 0.03, y, z * k);
    // le tronc est couché par une rotation de 90° autour de z : le dessus du monde est le côté +x local
    const top = smooth(0.1, 0.35, (x / 0.25) * 1.2 - 0.3 + noise(a * 3 + o, y * 6) * 0.7);
    const c = base.clone().lerp(moss, top * 0.85);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}
// ════════════════════════════════════════════════════════════════════
//  Matériaux
// ════════════════════════════════════════════════════════════════════
const ALPHA = 0.42;
const M = {
  leaves: patch(new THREE.MeshLambertMaterial({ map: leafTex, alphaTest: ALPHA, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.011, flutter: true, fakeNormal: true, reveal: true }),
  bush: patch(new THREE.MeshLambertMaterial({ map: leafTex, alphaTest: ALPHA, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.03, flutter: true, fakeNormal: true, reveal: true }),
  bark: patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { wind: 0.011, reveal: true }),
  culm: patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { wind: 0.02, reveal: true }),
  cactus: patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { reveal: true }),
  far: patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { farHole: true }),
  birch: patch(new THREE.MeshLambertMaterial({ map: birchTex, vertexColors: true }), { wind: 0.011, reveal: true }),
  grass: patch(new THREE.MeshLambertMaterial({ map: grassTex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.12, fakeNormal: true }),
  fern: patch(new THREE.MeshLambertMaterial({ map: fernTex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.06, fakeNormal: true, reveal: true }),
  rock: patch(new THREE.MeshLambertMaterial({ color: 0x8c8c76, flatShading: true }), { reveal: true }),
  stone: patch(new THREE.MeshLambertMaterial({ vertexColors: true }), { reveal: true, stone: true }),
  log: [patch(new THREE.MeshLambertMaterial({ map: barkTex, vertexColors: true }), { reveal: true }), patch(new THREE.MeshLambertMaterial({ map: ringTex }), { reveal: true }), patch(new THREE.MeshLambertMaterial({ map: ringTex }), { reveal: true })],
  dand: patch(new THREE.MeshLambertMaterial({ map: dandTex, alphaTest: 0.35, side: THREE.DoubleSide, emissive: 0x222218 }), { wind: 0.25, fakeNormal: true }),
  puff: patch(new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x555550 })),
  flora: patch(new THREE.MeshLambertMaterial({ map: floraTex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.1, fakeNormal: true }),
  mush: patch(new THREE.MeshLambertMaterial({ vertexColors: true })),
};
M.willow = patch(new THREE.MeshLambertMaterial({ map: willowTex, alphaTest: 0.4, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.006, flutter: 'weep', fakeNormal: true, reveal: true });
M.bambooLeaf = patch(new THREE.MeshLambertMaterial({ map: bambooTex, alphaTest: ALPHA, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.02, flutter: true, fakeNormal: true, reveal: true });
M.bambooLeaf.shadowSide = THREE.DoubleSide;
M.palm = patch(new THREE.MeshLambertMaterial({ map: palmTex, alphaTest: ALPHA, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.012, flutter: true, fakeNormal: true, reveal: true });
M.palm.shadowSide = THREE.DoubleSide;
M.fernTree = patch(new THREE.MeshLambertMaterial({ map: fernTex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, color: 0x4f8a2c }), { wind: 0.03, flutter: true, fakeNormal: true, reveal: true });
M.fernTree.shadowSide = THREE.DoubleSide;
M.needles = patch(new THREE.MeshLambertMaterial({ map: needleTex, alphaTest: ALPHA, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.008, flutter: true, fakeNormal: true, reveal: true });
M.water = patch(new THREE.MeshPhongMaterial({ color: 0x2a5a5c, specular: 0x5c5a52, shininess: 260, transparent: true, opacity: 1, depthWrite: false }), { water: true });
M.leaves.shadowSide = M.bush.shadowSide = M.needles.shadowSide = M.willow.shadowSide = THREE.DoubleSide;
const DM = {
  leaves: depthMat(leafTex, ALPHA, 0.011, true),
  bamboo: depthMat(bambooTex, ALPHA, 0.02, true),
  palm: depthMat(palmTex, ALPHA, 0.012, true),
  willow: depthMat(willowTex, 0.4, 0.006, 'weep'),
  needles: depthMat(needleTex, ALPHA, 0.008, true),
  bush: depthMat(leafTex, ALPHA, 0.03, true),
  fern: depthMat(fernTex, 0.5, 0.06, false),
};

// ════════════════════════════════════════════════════════════════════
//  Génération du monde
// ════════════════════════════════════════════════════════════════════
let world = null, trees = [], treeGrid = new Map(), ground = null;
const CH = 32; // taille des chunks (culling)
const key = (x, z) => `${Math.floor(x / 4)},${Math.floor(z / 4)}`;

function instanced(geo, mat, items, { cast = true, receive = true, depth = null, chunk = CH } = {}) {
  if (!items.length) return;
  if (!ASSETS) { const cs = chaletsAround(items[0].x, items[0].z); if (cs.length) items = items.filter(it => !cs.some(c => (it.x - c.x) ** 2 + (it.z - c.z) ** 2 < 15.2)); if (!items.length) return; }
  // regroupe par chunk pour profiter du frustum culling
  const byChunk = new Map();
  for (const it of items) {
    const k = `${Math.floor((it.x + HALF) / chunk)},${Math.floor((it.z + HALF) / chunk)}`;
    if (!byChunk.has(k)) byChunk.set(k, []); byChunk.get(k).push(it);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  for (const list of byChunk.values()) {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      e.set(it.rx || 0, it.ry || 0, it.rz || 0); q.setFromEuler(e);
      s.set(it.s, it.sy ?? it.s, it.s); p.set(it.x, it.y, it.z);
      im.setMatrixAt(i, m4.compose(p, q, s));
      if (it.c) im.setColorAt(i, it.c);
    });
    im.castShadow = cast; im.receiveShadow = receive;
    if (depth) im.customDepthMaterial = depth;
    im.computeBoundingSphere();
    world.add(im);
  }
}

const GROUND_PAL = {
  foret:   { A: '#4a7d30', B: '#6c9a3c', M: '#2f5a35' },
  pinede:  { A: '#4a6434', B: '#64763e', M: '#5c4a32' },
  prairie: { A: '#6a9c3a', B: '#9ebe52', M: '#4a7a34' },
  marais:  { A: '#3c6836', B: '#567e3e', M: '#3a4430' },
  savane:  { A: '#b8a24e', B: '#d4ba62', M: '#a0763e' },
  tropic:  { A: '#3a6428', B: '#4c7a2e', M: '#2e3a1e' },
  desert:  { A: '#d8b47a', B: '#e6c890', M: '#c49a62' },
  bambou:  { A: '#6e8a3a', B: '#8e9c48', M: '#a08a48' },
  automne: { A: '#788a3a', B: '#a29a48', M: '#7a5430' },
  lande:   { A: '#74764a', B: '#8e8a58', M: '#6a5272' },
  montagne: { A: '#5a7448', B: '#748a52', M: '#3a4e32' },
  littoral: { A: '#a89c62', B: '#c4b47a', M: '#8a7e52' },
};
const _ga = new THREE.Color(), _gb = new THREE.Color();
function grassColorAt(x, z, d = 0, only = -1) {   // la couleur des touffes prolonge celle du sol, un peu plus claire
  const w = only >= 0 ? BIOMES.map((b, k) => +(k === only)) : biomeW(x, z), c = new THREE.Color(0, 0, 0);
  const t = clamp(0.5 + fbm(x * 0.06, z * 0.06, 2) * 0.8 + R(-0.25, 0.25));
  for (let k = 0; k < NB; k++) { const g = GROUND_PAL[BIOMES[k].id]; _ga.set(g.A).lerp(_gb.set(g.B), t); c.r += w[k] * _ga.r; c.g += w[k] * _ga.g; c.b += w[k] * _ga.b; }
  return c.multiplyScalar(R(1.05, 1.3) * (1 - d * 0.25));
}
const TREE_TABLE = {
  foret:   [['oak', 0.62], ['birch', 0.3], ['bush', 0.08]],
  pinede:  [['pine', 0.86], ['birch', 0.09], ['bush', 0.05]],
  prairie: [['oak', 0.7], ['bush', 0.3]],
  marais:  [['willow', 0.6], ['birch', 0.2], ['bush', 0.2]],
  bambou:  [['bamboo', 0.92], ['bush', 0.08]],
  savane:  [['acacia', 0.76], ['baobab', 0.12], ['bush', 0.12]],
  tropic:  [['jungle', 0.45], ['palm', 0.17], ['treefern', 0.25], ['bush', 0.13]],
  desert:  [['cactus', 0.5], ['sage', 0.35], ['deadtree', 0.15]],
  automne: [['red', 0.5], ['gold', 0.32], ['oak', 0.08], ['birch', 0.1]],
  lande:   [['pine', 0.35], ['heather', 0.35], ['gorse', 0.3]],
  montagne: [['fir', 0.86], ['pine', 0.08], ['birch', 0.06]],
  littoral: [['parasol', 0.32], ['olive', 0.28], ['palm', 0.14], ['cypress', 0.16], ['maquis', 0.1]],
};
const SHRUB = { foret: 'bush', pinede: 'bush', prairie: 'bush', marais: 'bush', automne: 'bush', lande: 'heather', littoral: 'lavender', montagne: 'bush', bambou: 'bush', desert: 'sage', savane: 'bush', tropic: 'bush' };
const SOFT = new Set(['bush', 'heather', 'gorse', 'lavender', 'maquis', 'sage']); // pas de collision
function rollKind(table) { let r = rnd(); for (const [k, p] of table) { r -= p; if (r <= 0) return k; } return table[0][0]; }

// ════════════════════════════════════════════════════════════════════
//  Monde infini : tronçons de 48 m générés autour du joueur, avec un hasard déterministe par tronçon
// ════════════════════════════════════════════════════════════════════
const LOAD_R = 2, DETAIL_R = 1, KEEP_R = 3;
const chunks = new Map();
let worldSeed = 1, P = null, worldRoot = null, worldReady = false;
const groundMeshes = [], bridges = [];
function hash3(a, b, c) { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
const crng = (cx, cz, salt) => mulberry32(hash3(cx, cz, salt * 7919 + worldSeed));
const AKc = CHK * CHK / (260 * 260);   // les anciennes quantités étaient données pour 260 × 260 m

function buildPrototypes() {
  rnd = mulberry32(worldSeed + 99);
  const protos = { acacia: [], baobab: [], jungle: [], treefern: [], poplar: [], cactus: [], sage: [], deadtree: [], palm: [], bamboo: [], fir: [], firSnow: [], oak: [], red: [], gold: [], birch: [], bush: [], pine: [], willow: [], heather: [], gorse: [], parasol: [], olive: [], cypress: [], lavender: [], maquis: [] };
  const mk = (k, n, f) => { for (let i = 0; i < n; i++) protos[k].push(f(i)); };
  mk('oak', 4, () => makeOak(false)); mk('red', 3, () => makeOak(true)); mk('gold', 3, () => makeOak(false, PAL.gold));
  mk('birch', 3, makeBirch); mk('bush', 3, () => makeBush()); mk('pine', 4, makePine); mk('willow', 2, makeWillow);
  mk('heather', 3, () => makeBush(PAL.heather, 0.42, 0.55)); mk('gorse', 2, () => makeBush(PAL.gorse, 0.45, 0.75));
  mk('parasol', 3, makeParasol); mk('olive', 3, makeOlive); mk('cypress', 2, makeCypress);
  mk('lavender', 2, () => makeBush(PAL.lavender, 0.32, 0.5)); mk('maquis', 2, () => makeBush(PAL.maquis, 0.4, 0.8));
  mk('fir', 4, () => makeFir(false)); mk('firSnow', 3, () => makeFir(true)); mk('bamboo', 5, makeBamboo);
  mk('cactus', 6, i => makeCactus(i)); mk('sage', 3, () => makeBush(PAL.sage, 0.34, 0.55)); mk('deadtree', 3, makeDeadTree); mk('palm', 3, makePalm);
  mk('acacia', 4, makeAcacia); mk('baobab', 2, makeBaobab); mk('jungle', 4, makeJungleTree); mk('treefern', 3, makeTreeFern); mk('poplar', 3, makePoplar);
  const RSH = ['boulder', 'slab', 'spire', 'round'];
  const rocks = [];
  for (let i = 0; i < 12; i++) rocks.push(makeRock(RSH[i % 4], i < 6));
  P = {
    protos, RSH, rocks,
    red: RSH.map(sh => makeRock(sh, false, false, false, true)), pale: RSH.map(sh => makeRock(sh, false, true)),
    mt: RSH.map(sh => makeRock(sh, false)), mtSnow: RSH.map(sh => makeRock(sh, false, false, true)),
    grass: makeGrass(), fern: makeFern(), flowers: [0, 1, 2, 3, 4].map(k => makeFlowerTuft(k)), rosette: makeRosette(), reeds: makeReeds(), lily: makeLily(),
    deadLeaf: makeDeadLeaf(), pebble: new THREE.DodecahedronGeometry(1, 0), mush: ['amanite', 'cepe', 'mycene'].map(t => makeMushroom(t)),
    dandStem: [makeDandelionStem(false), makeDandelionStem(true)], dandHead: [makeDandelionHead(false), makeDandelionHead(true)],
    log: makeLog(), mound: makeMound(),
  };
}
// ── sites déterministes, connus avant la génération du tronçon (et de ses voisins)
const siteCache = new Map();
function cachedSites(kind, cx, cz, f) { const k = kind + ckey(cx, cz); let v = siteCache.get(k); if (!v) { v = f(cx, cz); siteCache.set(k, v); if (siteCache.size > 900) siteCache.delete(siteCache.keys().next().value); } return v; }
function chaletSites(cx, cz) {
  return cachedSites('c', cx, cz, (cx, cz) => {
    const out = [], r = crng(cx, cz, 3), z0 = cz * CHK, x0 = cx * CHK;
    if (r() > 0.32) return out;
    for (let t = 0; t < 6 && !out.length; t++) {
      const z = z0 + 6 + r() * (CHK - 12), side = r() < 0.5 ? -1 : 1, x = pathX(z) + side * (7 + r() * 3);
      if (x < x0 + 5 || x > x0 + CHK - 5) continue;
      const w = biomeW(x, z); if (nearRiver(x, z, 12) || w[BI.marais] > 0.25 || w[BI.desert] > 0.2 || w[BI.littoral] > 0.25 || w[BI.bambou] > 0.4 || w[BI.tropic] > 0.4) continue;
      const hs = [[0, 0], [3, 3], [-3, 3], [3, -3], [-3, -3]].map(([a, b]) => height(x + a, z + b));
      if (Math.min(...hs) < WL + 1 || Math.max(...hs) - Math.min(...hs) > 0.9 || Math.max(...hs) > TREELINE) continue;
      if (Math.hypot(x - clearing.x, z - clearing.y) < 14) continue;
      out.push({ x, z, y: hs.reduce((a, b) => a + b) / 5, ry: side * Math.PI / 2, side, vi: (r() * 3) | 0 });
    }
    return out;
  });
}
// arbres principaux d'un tronçon (servent aussi à l'ombre portée au sol des tronçons voisins)
function treeSites(cx, cz) {
  return cachedSites('t', cx, cz, (cx, cz) => {
    const out = [], r = crng(cx, cz, 1), cell = 3, x0 = cx * CHK, z0 = cz * CHK;
    const save = rnd; rnd = r;
    for (let gx = 0; gx < CHK; gx += cell) for (let gz = 0; gz < CHK; gz += cell) {
      const x = x0 + gx + r() * cell, z = z0 + gz + r() * cell, h = height(x, z), d = forestDensity(x, z, h);
      if (r() > d * 0.95) continue;
      const bi = pickBiome(x, z), bid = BIOMES[bi].id;
      let kind = rollKind(TREE_TABLE[bid]);
      if (kind === 'fir' && h > TREELINE - 0.9 + noise(x * 0.1, z * 0.1) * 0.6) kind = 'firSnow';
      if (bid === 'foret') kind = birchness(x, z) > 0.22 && r() < 0.8 ? 'birch' : kind === 'birch' ? 'oak' : kind;
      if (d < 0.45 && r() < 0.35 && !SOFT.has(kind)) kind = SHRUB[bid];
      out.push({ kind, x, z, h, s: R(0.8, SOFT.has(kind) ? 1.3 : 1.25), vi: r(), ry: R(0, 6.28) });
    }
    rnd = save; return out;
  });
}
function addCollider(ch, x, z, r) { const k = key(x, z); if (!treeGrid.has(k)) treeGrid.set(k, []); treeGrid.get(k).push({ x, z, r, ck: ch.key }); ch.colKeys.add(k); }

// population d'un tronçon, découpée en étapes (générateur) pour ne jamais bloquer une image
function* populateChunk(ch) {
  const { cx, cz } = ch, x0 = cx * CHK, z0 = cz * CHK;
  const RX = () => x0 + rnd() * CHK, RZ = () => z0 + rnd() * CHK, Nn = n => Math.round(n * AKc);
  const stage = salt => { rnd = crng(cx, cz, salt); world = ch.group; };
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) yield* warmCaches(cx + i, cz + j);
  yield;
  // ── arbres et arbustes
  stage(2);
  const protos = P.protos, place = Object.fromEntries(Object.keys(protos).map(k => [k, protos[k].map(() => [])]));
  const tint = () => new THREE.Color(R(0.85, 1.12), R(0.9, 1.1), R(0.8, 1.05));
  const trees = [];
  const addTree = (kind, x, z, h, sMin, sMax, viF, ryF) => {
    const vi = Math.min(protos[kind].length - 1, ((viF ?? rnd()) * protos[kind].length) | 0), pr = protos[kind][vi], s = R(sMin, sMax);
    const t = { x, z, y: h, s, ry: ryF ?? R(0, 6.28), c: tint(), r: pr.r * s, ao: pr.ao * s, kind };
    place[kind][vi].push(t); trees.push(t);
    if (!SOFT.has(kind)) addCollider(ch, x, z, t.r);
  };
  const ts = treeSites(cx, cz); yield; stage(2);
  for (const t of ts) addTree(t.kind, t.x, t.z, t.h, t.s, t.s, t.vi, t.ry);
  for (let i = 0; i < Nn(2800); i++) {
    const x = RX(), z = RZ(), h = height(x, z), d = forestDensity(x, z, h);
    if (h < WL + 0.2 || d < 0.12 || d > 0.75 || rnd() > 0.55) continue;
    addTree(SHRUB[BIOMES[pickBiome(x, z)].id], x, z, h, 0.6, 1.2);
  }
  for (let i = 0; i < Nn(9000); i++) {
    const x = RX(), z = RZ(), wl = biomeW(x, z)[BI.lande];
    if (wl < 0.15 || rnd() > wl * 0.7 || pathDist(x, z) < 2) continue;
    if (fbm(x * 0.09 + 700, z * 0.09, 2) < -0.05) continue;
    const h = height(x, z); if (h < WL + 0.2) continue;
    addTree(rnd() < 0.72 ? 'heather' : 'gorse', x, z, h, 0.7, 1.5);
  }
  for (let i = 0; i < Nn(3000); i++) {   // pins penchés au-dessus des criques
    const x = RX(), z = RZ(), ws = biomeW(x, z)[BI.littoral]; if (ws < 0.2) continue;
    const t = coastT(x, z); if (t < -0.32 || t > -0.1 || rnd() > 0.12 || pathDist(x, z) < 3) continue;
    const h = height(x, z); if (h < WL + 0.4) continue;
    addTree('parasol', x, z, h, 0.8, 1.15);
  }
  for (let i = 0; i < Nn(6000); i++) {
    const x = RX(), z = RZ(), ws = biomeW(x, z)[BI.littoral];
    if (ws < 0.15 || rnd() > ws * 0.8 || pathDist(x, z) < 2) continue;
    if (fbm(x * 0.07 + 611, z * 0.07, 2) < 0.05) continue;
    const h = height(x, z); if (h < WL + 1.0) continue;
    addTree(rnd() < 0.7 ? 'lavender' : 'maquis', x, z, h, 0.7, 1.4);
  }
  for (let i = 0; i < Nn(9000); i++) {   // peupliers en cordon sur les berges
    const x = RX(), z = RZ(), r = riverAt(x, z);
    if (!r || r.fade < 0.6 || r.d < r.w + 1.2 || r.d > r.w + 5 || rnd() > 0.35 || pathDist(x, z) < 3) continue;
    const h = height(x, z); if (h < WL + 0.3 || h > TREELINE) continue;
    if (biomeW(x, z)[BI.desert] > 0.4) addTree('palm', x, z, h, 0.8, 1.1); else addTree('poplar', x, z, h, 0.85, 1.2);
  }
  for (let i = 0; i < Nn(6000); i++) {   // palmiers autour des points d'eau du désert
    const x = RX(), z = RZ(); if (biomeW(x, z)[BI.desert] < 0.3) continue;
    const h = height(x, z); if (h < WL + 0.15 || h > WL + 1.6 || rnd() > 0.5) continue;
    addTree('palm', x, z, h, 0.85, 1.2);
  }
  yield; world = ch.group;
  let nk = 0;
  for (const kind in protos) { if (++nk % 6 === 0) { yield; world = ch.group; } protos[kind].forEach((pr, i) => {
    const items = place[kind][i]; if (!items.length) return;
    if (pr.trunk) instanced(pr.trunk, pr.trunkMat || (pr.culm ? M.culm : pr.birch ? M.birch : M.bark), items, { chunk: 24 });
    if (!pr.leaves) return;
    const soft = SOFT.has(kind);
    instanced(pr.leaves, pr.leafMat || (pr.culm ? M.bambooLeaf : pr.willow ? M.willow : pr.needles ? M.needles : soft ? M.bush : M.leaves), items, { depth: pr.leafDepth || (pr.culm ? DM.bamboo : pr.willow ? DM.willow : pr.needles ? DM.needles : soft ? DM.bush : DM.leaves), cast: !['heather', 'gorse', 'lavender', 'sage'].includes(kind), chunk: 24 });
  }); }
  ch.trees = trees;
  yield;
  // ── sol peint (et ombre au pied des arbres, y compris ceux des voisins)
  const gm = yield* buildGroundChunk(cx, cz);
  ch.group.add(gm); groundMeshes.push(gm); ch.ground = gm;
  yield;
  // ── rochers, troncs, termitières, chalets, pont, barques
  stage(4);
  const addRockTo = (sets, protosR, x, z, s, vi, sink = 0.08) => {
    const pr = protosR[vi], h = height(x, z); if (h < WL - 0.6) return;
    sets[vi].push({ x, z, y: h + pr.base * s - sink * s, s, ry: R(0, 6.28), rx: R(-0.08, 0.08), rz: R(-0.08, 0.08), c: new THREE.Color(R(.9, 1.06), R(.92, 1.05), R(.9, 1.04)) });
    if (s > 1.1 && h > WL - 0.3) addCollider(ch, x, z, s * pr.foot * 0.75);
  };
  const rockSets = P.rocks.map(() => []), redSets = P.red.map(() => []), paleSets = P.pale.map(() => []), mtSets = P.mt.map(() => []), mtSnowSets = P.mtSnow.map(() => []);
  const pickRock = (mossy, shape) => { const cand = P.rocks.map((r, i) => i).filter(i => (i < 6) === mossy && (!shape || P.RSH[i % 4] === shape)); return cand[(rnd() * cand.length) | 0]; };
  for (let i = 0; i < Nn(2600); i++) {
    const x = RX(), z = RZ(), w = biomeW(x, z), wl = w[BI.lande] + w[BI.pinede] * 0.3;
    if (rnd() > 0.12 + wl * 0.9 || pathDist(x, z) < 1.6) continue;
    const mossy = w[BI.lande] < 0.45 && rnd() < 0.9, big = rnd() < 0.08 + wl * 0.25, sc = R(0.25, 0.85) * (big ? R(2, 3.2) : 1);
    addRockTo(rockSets, P.rocks, x, z, sc, pickRock(mossy), 0.06);
    if (big) for (let k = 0, n = 2 + (rnd() * 4 | 0); k < n; k++) { const a = R(0, 6.28), d = sc * R(0.9, 1.6); addRockTo(rockSets, P.rocks, x + Math.cos(a) * d, z + Math.sin(a) * d, R(0.2, 0.5), pickRock(mossy), 0.06); }
  }
  for (let i = 0; i < Nn(900); i++) {   // chaos rocheux de la lande
    const x = RX(), z = RZ(); if (biomeW(x, z)[BI.lande] < 0.4 || rnd() > 0.09 || pathDist(x, z) < 4) continue;
    const sc = R(2.2, 3.6); addRockTo(rockSets, P.rocks, x, z, sc, pickRock(false, rnd() < 0.5 ? 'spire' : 'boulder'), 0.06);
    for (let k = 0, n = 2 + (rnd() * 3 | 0); k < n; k++) { const a = R(0, 6.28), d = sc * R(0.8, 1.3); addRockTo(rockSets, P.rocks, x + Math.cos(a) * d, z + Math.sin(a) * d, sc * R(0.4, 0.75), pickRock(false, rnd() < 0.6 ? 'slab' : 'boulder'), 0.06); }
  }
  for (let i = 0; i < Nn(4000); i++) {   // grès rouge du désert
    const x = RX(), z = RZ(); if (biomeW(x, z)[BI.desert] < 0.3 || rnd() > 0.25 || pathDist(x, z) < 2) continue;
    const bt = butte(x, z); addRockTo(redSets, P.red, x, z, R(0.3, 1.0) * (rnd() < 0.1 + (bt > 0.05 && bt < 0.95 ? 0.4 : 0) ? R(1.6, 3) : 1), rnd() * 4 | 0, 0.12);
  }
  for (let i = 0; i < Nn(9000); i++) {   // calcaire blanc des pointes rocheuses
    const x = RX(), z = RZ(); if (biomeW(x, z)[BI.littoral] < 0.15) continue;
    const t = coastT(x, z), bc = beachiness(x, z), point = smooth(0.05, -0.25, bc) * smooth(-0.3, -0.12, t) * smooth(0.14, 0.02, t);
    if (rnd() > 0.01 + point * 0.5 || pathDist(x, z) < 2) continue;
    addRockTo(paleSets, P.pale, x, z, R(0.4, 1.2) * (rnd() < point * 0.3 ? R(1.6, 2.6) : 1), point > 0.3 && rnd() < 0.65 ? 1 : rnd() * 4 | 0, 0.18);
  }
  for (let i = 0; i < Nn(14000); i++) {   // éboulis et blocs enneigés
    const x = RX(), z = RZ(); if (biomeW(x, z)[BI.montagne] < 0.2) continue;
    const h = height(x, z); if (h < TREELINE - 1.5 || rnd() > 0.11 || pathDist(x, z) < 2) continue;
    const snowy = h > SNOWLINE - 0.5 + noise(x * 0.2, z * 0.2);
    addRockTo(snowy ? mtSnowSets : mtSets, snowy ? P.mtSnow : P.mt, x, z, R(0.3, 1.0) * (rnd() < 0.12 ? R(1.8, 3.2) : 1), rnd() * 4 | 0, 0.12);
  }
  const putRocks = (protosR, sets) => protosR.forEach((r, i) => {
    const big = sets[i].filter(it => it.s > 0.6), small = sets[i].filter(it => it.s <= 0.6);
    if (big.length) instanced(r.geo, M.stone, big); if (small.length) instanced(r.geo, M.stone, small, { cast: false });
  });
  yield; world = ch.group;
  putRocks(P.rocks, rockSets); putRocks(P.red, redSets); yield; world = ch.group; putRocks(P.pale, paleSets); putRocks(P.mt, mtSets); putRocks(P.mtSnow, mtSnowSets);
  yield; stage(4.5);
  const logs = [], mounds = [];
  for (let i = 0; i < Nn(200); i++) {
    const x = RX(), z = RZ(), h = height(x, z);
    if (forestDensity(x, z, h) < 0.4 || pathDist(x, z) < 3) continue;
    logs.push({ x, z, y: h + 0.16, s: R(0.9, 1.2), sy: R(2.5, 4.5), rz: Math.PI / 2, ry: R(0, 6.28), rx: 0, c: new THREE.Color().setScalar(R(0.85, 1.1)) });
  }
  for (let i = 0; i < Nn(2500); i++) {
    const x = RX(), z = RZ(); if (biomeW(x, z)[BI.savane] < 0.4 || rnd() > 0.06 || pathDist(x, z) < 3) continue;
    const sc = R(0.6, 1.3); mounds.push({ x, z, y: height(x, z) - 0.1, s: sc, sy: sc * R(1.2, 2.2), ry: R(0, 6.28), c: new THREE.Color().setScalar(R(0.85, 1.05)) });
    addCollider(ch, x, z, sc * 0.5);
  }
  instanced(P.log, M.log, logs); instanced(P.mound, M.mush, mounds);
  ch.chalets = chaletSites(cx, cz);
  for (const c of ch.chalets) {
    const g = makeChalet(c.vi); g.position.set(c.x, c.y, c.z); g.rotation.y = c.ry; ch.group.add(g); addSmoke(g); ch.smoke = (ch.smoke || []).concat([smokes[smokes.length - 1]]);
    for (const [a, b] of [[0, 0], [1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]]) addCollider(ch, c.x + a, c.z + b, 1.7);
    yield; world = ch.group;
  }
  buildBridgeIn(ch); yield;
  stage(5);
  ch.signs = [];
  for (let gx = x0 + 2; gx < x0 + CHK && ch.signs.length < 2; gx += 2.5) for (let gz = z0 + 2; gz < z0 + CHK && ch.signs.length < 2; gz += 2.5) {
    let n = 0; const t0 = Math.abs(gx - pathX(gz)) < 1.4 ? 1 : 0; n += t0;
    if (ridgeMaskRaw(gx, gz) > 0.5) continue;
    for (let i = 1; i <= 2; i++) { const f = trailF(i, gx, gz); if (Math.abs(f) < 0.012) n++; }
    if (n < 2 || height(gx, gz) < WL + 0.3 || ch.signs.some(s => Math.hypot(s[0] - gx, s[1] - gz) < 14)) continue;
    const a = rnd() * 6.28, sx = gx + Math.cos(a) * 2.6, sz = gz + Math.sin(a) * 2.6;
    const sg = makeSignpost(); sg.position.set(sx, height(sx, sz), sz); sg.rotation.y = R(0, 6.28); ch.group.add(sg); addCollider(ch, sx, sz, 0.3);
    ch.signs.push([gx, gz]);
  }
  ch.boats = [];
  if (rnd() < 0.85) for (let t = 0; t < 200 && !ch.boats.length; t++) {
    const x = RX(), z = RZ(), d = WL - height(x, z);
    if (d < 0.4 || d > 2.6 || nearRiver(x, z, 3)) continue;
    // une rive à moins de 4 m : l'avant regarde vers le large
    let sx = 0, sz = 0, nLand = 0;
    for (let a = 0; a < 6.28; a += 0.785) for (const rr of [4, 8]) { const hx = x + Math.cos(a) * rr, hz = z + Math.sin(a) * rr; if (height(hx, hz) > WL + 0.1) { sx += Math.cos(a); sz += Math.sin(a); nLand++; break; } }
    if (!nLand || nLand > 6) continue;
    const b = makeSailboat((cx * 7 + cz) & 7); b.position.set(x, WL, z); b.rotation.y = Math.atan2(sx, sz) + R(-0.3, 0.3);   // -z (avant) opposé à la rive
    ch.group.add(b); boats.push(b); ch.boats.push(b);
  }
  ch.state = 'ready';
}
// petite végétation : seulement pour les tronçons proches du joueur, retirée quand on s'éloigne
function* populateDetail(ch) {
  const { cx, cz } = ch, x0 = cx * CHK, z0 = cz * CHK, g = new THREE.Group();
  const RX = () => x0 + rnd() * CHK, RZ = () => z0 + rnd() * CHK, Nn = n => Math.round(n * AKc);
  const crngD = crng(cx, cz, 6); rnd = crngD; world = g;
  const grass = [], ferns = [];
  for (let i = 0; i < Nn(120000); i++) {
    const x = RX(), z = RZ(), w = biomeW(x, z);
    let gmx = 0; for (let k = 0; k < NB; k++) gmx += w[k] * BIOMES[k].grass;
    if (rnd() * 2 > gmx) continue;
    const h = height(x, z); if (h < WL + 0.05 || onBeach(x, z, h) || h > SNOWLINE - 0.5 || (h > TREELINE + 1 && rnd() < 0.6)) continue;
    const pd = pathDist(x, z), d = forestDensity(x, z, h), cl = fbm(x * 0.12, z * 0.12, 2);
    if (pd < 1.8 || litter(x, z) > 0.38) continue;
    if (cl < -0.2 + d * 0.25 - w[BI.prairie] * 0.4) continue;
    const tall = 1 + w[BI.prairie] * 0.9 + w[BI.marais] * 0.5 + w[BI.savane] * 1.6;
    grass.push({ x, z, y: h - 0.03, s: R(0.8, 1.5), sy: R(0.7, 1.5) * tall, ry: R(0, 3.14), c: grassColorAt(x, z, d) });
    if (i % 900 === 899) { yield; rnd = crngD; world = g; }
  }
  for (let i = 0; i < Nn(9000); i++) {
    const x = RX(), z = RZ(), h = height(x, z), d = forestDensity(x, z, h), w = biomeW(x, z);
    if (d < 0.5 || rnd() > d - 0.2 - w[BI.lande] - w[BI.automne] * 0.5 || pathDist(x, z) < 2.2 || h > TREELINE + 0.5) continue;
    ferns.push({ x, z, y: h, s: R(0.8, 1.5), ry: R(0, 6.28), c: col('#4f8a2c').lerp(col('#86b043'), rnd()) });
  }
  instanced(P.grass, M.grass, grass, { cast: false }); instanced(P.fern, M.fern, ferns, { cast: false });
  yield;
  const crngF = crng(cx, cz, 7); rnd = crngF; world = g;
  const FL = [{ k: 0, off: 0, open: true }, { k: 1, off: 37, open: true }, { k: 2, off: 71, open: false }, { k: 3, off: 113, open: true }, { k: 4, off: 157, open: true }];
  const flowerSets = FL.map(() => []);
  for (let i = 0; i < Nn(90000); i++) {
    const x = RX(), z = RZ(), fm = bMix(x, z, 'flowers');
    if (rnd() * 3.2 > fm) continue;
    const h = height(x, z); if (h < WL + 0.1 || onBeach(x, z, h) || h > SNOWLINE - 1 || (h > TREELINE + 2 && rnd() < 0.6)) continue;
    const d = forestDensity(x, z, h);
    if (pathDist(x, z) < 1.7 || litter(x, z) > 0.34) continue;
    let best = -1, bf = 0.08;
    for (const f of FL) { if (f.open ? d > 0.5 : (d < 0.25 || d > 0.85)) continue; const v = fbm(x * 0.07 + f.off, z * 0.07 - f.off, 2); if (v > bf) { bf = v; best = f.k; } }
    if (best < 0 || rnd() > (bf - 0.04) * 3.5) continue;
    const wv = R(0.9, 1.1); flowerSets[best].push({ x, z, y: h - 0.02, s: R(1.1, 1.8), ry: R(0, 6.28), c: new THREE.Color(wv, wv, wv) });
    if (i % 900 === 899) { yield; rnd = crngF; world = g; }
  }
  FL.forEach(f => instanced(P.flowers[f.k], M.flora, flowerSets[f.k], { cast: false }));
  const rosettes = [], ears = [], rc = [col('#5f9b3a'), col('#7cab42'), col('#4b8034'), col('#93ba4c'), col('#6a8f3a')];
  for (let i = 0; i < Nn(18000); i++) {
    const x = RX(), z = RZ(), h = height(x, z);
    if (h < WL + 0.05 || onBeach(x, z, h) || h > SNOWLINE - 1 || biomeW(x, z)[BI.desert] > 0.3 || pathDist(x, z) < 1.5 || rnd() > 0.35 + fbm(x * 0.1 + 200, z * 0.1, 2)) continue;
    rosettes.push({ x, z, y: h, s: R(0.7, 1.5), ry: R(0, 6.28), c: rc[rnd() * 5 | 0].clone().multiplyScalar(R(0.85, 1.1) * (1 - forestDensity(x, z, h) * 0.15)) });
  }
  for (let i = 0; i < Nn(9000); i++) {
    const x = RX(), z = RZ(); if (biomeW(x, z)[BI.tropic] < 0.35 || rnd() > 0.5 || pathDist(x, z) < 2) continue;
    const h = height(x, z); if (h < WL + 0.1) continue;
    ears.push({ x, z, y: h, s: R(2.2, 3.6), ry: R(0, 6.28), c: col(['#2e6a2a', '#3e7e30', '#4e8a34'][rnd() * 3 | 0]) });
  }
  instanced(P.rosette, M.flora, rosettes, { cast: false }); instanced(P.rosette, M.flora, ears);
  yield;
  const crngL = crng(cx, cz, 8); rnd = crngL; world = g;
  const reeds = [], lilies = [], deadLeaves = [], pebbles = [], puffs = [], mush = [[], [], []];
  for (let i = 0; i < Nn(40000); i++) {
    const x = RX(), z = RZ(), h = height(x, z);
    if (h > WL + 0.45 || h < WL - 0.4 || biomeW(x, z)[BI.littoral] > 0.12) continue;
    if (rnd() > 0.55 || fbm(x * 0.12 + 900, z * 0.12, 2) < -0.1) continue;
    reeds.push({ x, z, y: h - 0.05, s: R(0.8, 1.3), sy: R(0.8, 1.5), ry: R(0, 3.14), c: new THREE.Color().setScalar(R(0.8, 1.1)) });
  }
  for (let i = 0; i < Nn(30000); i++) {
    const x = RX(), z = RZ(), h = height(x, z);
    if (h > WL - 0.3 || h < WL - 2.2 || rnd() > 0.5 || fbm(x * 0.1 + 950, z * 0.1, 2) < 0 || biomeW(x, z)[BI.littoral] > 0.12 || nearRiver(x, z, 2)) continue;
    lilies.push({ x, z, y: WL + 0.015, s: R(0.6, 1.3), ry: R(0, 6.28), c: new THREE.Color(R(0.85, 1.1), R(0.9, 1.1), R(0.8, 1)) });
  }
  const lc = [col('#c8752e'), col('#9c4d22'), col('#e0a040'), col('#6a3c22'), col('#b8862f'), col('#8a9a3a')], needleC = [col('#7a5a36'), col('#8a6a40'), col('#5e4630')];
  for (let i = 0; i < Nn(60000); i++) {
    const x = RX(), z = RZ(), lt = litter(x, z), d = forestDensity(x, z);
    const pr = lt > 0.3 ? 0.9 : d > 0.55 ? 0.12 : pathDist(x, z) < 2 ? 0.05 : 0.015;
    if (rnd() > pr) continue;
    const h = height(x, z); if (h < WL + 0.05) continue;
    const pine = biomeW(x, z)[BI.pinede] > 0.5;
    deadLeaves.push({ x, z, y: h + 0.01, s: R(0.8, 1.4), ry: R(0, 6.28), rx: R(-0.25, 0.25), c: (pine ? needleC[rnd() * 3 | 0] : lc[rnd() * 6 | 0]).clone().multiplyScalar(R(0.8, 1.15)) });
    if (i % 700 === 699) { yield; rnd = crngL; world = g; }
  }
  for (let i = 0; i < Nn(1900); i++) {
    const z = RZ(), x = pathX(z) + R(-1.9, 1.9) * Math.sqrt(rnd()); if (x < x0 || x > x0 + CHK) continue;
    const sc = R(0.04, 0.1) * (rnd() < 0.06 ? 2 : 1);
    pebbles.push({ x, z, y: height(x, z) + sc * 0.1, s: sc, sy: sc * R(0.4, 0.7), ry: R(0, 6.28), c: new THREE.Color(R(0.75, 1.0), R(0.68, 0.9), R(0.55, 0.72)) });
  }
  for (let i = 0; i < Nn(1600); i++) {
    const x = RX(), z = RZ(), wp = biomeW(x, z)[BI.prairie];
    if (rnd() > 0.12 + wp * 0.5) continue;
    const h = height(x, z); if (h < WL + 0.1 || forestDensity(x, z, h) > 0.5 || pathDist(x, z) < 2) continue;
    puffs.push({ x, z, y: h - 0.02, s: R(0.85, 1.25), ry: R(0, 6.28), bloom: rnd() < 0.45, c: new THREE.Color(1, 1, 1) });
  }
  for (const t of ch.trees || []) {
    if (SOFT.has(t.kind) || rnd() > (t.kind === 'pine' || t.kind === 'fir' ? 0.32 : 0.15)) continue;
    const n = 2 + (rnd() * 5 | 0), a0 = R(0, 6.28), sp = rnd() < 0.35 ? 0 : rnd() < 0.5 ? 1 : 2;
    for (let k = 0; k < n; k++) { const a = a0 + R(-0.6, 0.6), dd = t.r + R(0.25, 0.9), x = t.x + Math.cos(a) * dd, z = t.z + Math.sin(a) * dd; mush[sp].push({ x, z, y: height(x, z) - 0.02, s: R(0.7, 1.4), ry: R(0, 6.28), rx: R(-0.15, 0.15), c: new THREE.Color().setScalar(R(0.85, 1.1)) }); }
  }
  instanced(P.reeds, M.flora, reeds, { cast: false }); instanced(P.lily, M.flora, lilies, { cast: false });
  instanced(P.deadLeaf, M.flora, deadLeaves, { cast: false }); instanced(P.pebble, M.rock, pebbles, { cast: false });
  mush.forEach((m, i) => instanced(P.mush[i], M.mush, m, { cast: false }));
  for (const bl of [0, 1]) {
    const set = puffs.filter(p => +p.bloom === bl);
    instanced(P.dandStem[bl], M.mush, set, { cast: false }); instanced(P.dandHead[bl], M.dand, set, { cast: false });
    instanced(P.rosette, M.flora, set.map(p => ({ ...p, s: p.s * 0.55, c: col('#5f9b3a') })), { cast: false });
  }
  ch.detail = g; ch.group.add(g);
}
function disposeGroup(g) { g.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.isMesh && !o.isInstancedMesh && o.geometry && !o.userData.shared) o.geometry.dispose(); if (o.material && o.material.map && o.userData.ownTex) { o.material.map.dispose(); } }); }
function unloadChunk(ch) {
  if (ch.group.parent) worldRoot.remove(ch.group);
  disposeGroup(ch.group);
  if (ch.ground) { const i = groundMeshes.indexOf(ch.ground); if (i >= 0) groundMeshes.splice(i, 1); ch.ground.material.map.dispose(); ch.ground.material.userData.mask?.dispose(); ch.ground.material.dispose(); }
  for (const k of ch.colKeys) { const l = treeGrid.get(k); if (!l) continue; const f = l.filter(e => e.ck !== ch.key); if (f.length) treeGrid.set(k, f); else treeGrid.delete(k); }
  for (const b of ch.boats || []) { const i = boats.indexOf(b); if (i >= 0) boats.splice(i, 1); }
  for (const s of ch.smoke || []) { const i = smokes.indexOf(s); if (i >= 0) smokes.splice(i, 1); }
  for (let i = bridges.length - 1; i >= 0; i--) if (bridges[i].ck === ch.key) bridges.splice(i, 1);
  chunks.delete(ch.key);
}
// file de travail : un générateur à la fois, avec un budget de temps par image
let job = null, jobCh = null, playerChunk = '';
function streamWorld(budgetMs) {
  if (!worldRoot) return;
  const t0 = performance.now(), pcx = Math.floor(camTarget.x / CHK), pcz = Math.floor(camTarget.z / CHK);
  playerChunk = ckey(pcx, pcz);
  // décharge les tronçons trop lointains, retire la petite végétation de ceux qui s'éloignent
  let unloaded = 0;
  for (const ch of [...chunks.values()]) {
    const d = Math.max(Math.abs(ch.cx - pcx), Math.abs(ch.cz - pcz));
    if (d > KEEP_R && ch !== jobCh) { if (unloaded++ < 1 || budgetMs > 50) unloadChunk(ch); }
    else if (ch.detail && d > DETAIL_R + 1) { ch.group.remove(ch.detail); disposeGroup(ch.detail); ch.detail = null; }
  }
  while (performance.now() - t0 < budgetMs) {
    if (!job) {   // prochaine tâche : le tronçon manquant (ou sans détails) le plus proche
      let best = null, bd = 1e9, kind = '';
      for (let i = -LOAD_R; i <= LOAD_R; i++) for (let j = -LOAD_R; j <= LOAD_R; j++) {
        const cx = pcx + i, cz = pcz + j, d = Math.hypot(i, j), ch = chunks.get(ckey(cx, cz));
        if (!ch && d < bd) { bd = d; best = { cx, cz }; kind = 'base'; }
        else if (ch && ch.state === 'ready' && !ch.detail && Math.max(Math.abs(i), Math.abs(j)) <= DETAIL_R && d + 0.5 < bd) { bd = d + 0.5; best = ch; kind = 'detail'; }
      }
      if (!best) break;
      if (kind === 'base') {
        const ch = { key: ckey(best.cx, best.cz), cx: best.cx, cz: best.cz, group: new THREE.Group(), state: 'loading', colKeys: new Set() };
        chunks.set(ch.key, ch); worldRoot.add(ch.group); jobCh = ch; job = populateChunk(ch);
      } else { jobCh = best; job = populateDetail(best); }
    }
    if (job.next().done) { job = null; jobCh = null; }
  }
}
function updateFarHole() {   // plus grand carré centré sur le joueur dont tous les tronçons sont prêts
  const pcx = Math.floor(camTarget.x / CHK), pcz = Math.floor(camTarget.z / CHK);
  let r = -1;
  for (let k = 0; k <= LOAD_R; k++) {
    let ok = true; for (let i = -k; i <= k && ok; i++) for (let j = -k; j <= k; j++) { const ch = chunks.get(ckey(pcx + i, pcz + j)); if (!ch || ch.state !== 'ready') { ok = false; break; } }
    if (ok) r = k; else break;
  }
  U.uNear.value.set((pcx + 0.5) * CHK, (pcz + 0.5) * CHK, r < 0 ? -1 : (r + 0.5) * CHK - 0.5, 0);
}
function chunkReadyAt(x, z) { const ch = chunks.get(ckey(Math.floor(x / CHK), Math.floor(z / CHK))); return ch && ch.state === 'ready'; }

function initWorld(seed) {
  worldSeed = seed | 0; worldReady = false;
  for (const ch of [...chunks.values()]) unloadChunk(ch);
  job = null; jobCh = null;
  if (worldRoot) scene.remove(worldRoot);
  worldRoot = new THREE.Group(); scene.add(worldRoot); world = worldRoot;
  rnd = mulberry32(worldSeed); seedNoise(worldSeed);
  pathPh = [R(0, 6.28), R(0, 6.28)];
  climOff = [R(-500, 500), R(-500, 500), R(-500, 500), R(-500, 500)];
  gOff.c = [R(-900, 900), R(-900, 900)]; gOff.r = [R(-900, 900), R(-900, 900)]; gOff.l = [R(-900, 900), R(-900, 900)];
  river.on = !ASSETS; river.o = [R(-900, 900), R(-900, 900)];
  bCaches.clear(); hCaches.clear(); siteCache.clear(); treeGrid.clear(); groundMeshes.length = 0; bridges.length = 0; boats.length = 0; smokes.length = 0;
  buildPrototypes();
  // départ : sur le sentier, à terre, dans une forêt tempérée si possible, près de l'origine
  let sz = 0, best = -1e9;
  for (let z = 0; z <= 4000 && best < 0.55; z += 8) for (const sg of [1, -1]) {
    const zz = z * sg, x = pathX(zz) + 6; climateWeights(x, zz, _rw);
    const sc = _rw[BI.foret] + _rw[BI.prairie] * 0.6 - z / 8000;
    if (sc > best && _mt < 0.15 && heightRaw(x, zz, true) > WL + 1.2 && seaDist(x, zz) < -40) { best = sc; sz = zz; }
  }
  clearing.set(pathX(sz) + 6.5 * (rnd() < .5 ? -1 : 1), sz);
  player.position.set(clearing.x, 0, clearing.y); camTarget.copy(player.position);
  player.position.y = height(clearing.x, clearing.y); camTarget.y = player.position.y;
  camFree = false; showFollow();
  buildWaterPlane();
  farGround.origin = null;
}
// ── texture de détail tuilable (256 px ≈ 3,6 m) : R = brins d'herbe, G = gravier, B = feuilles mortes
const groundDetail = (() => {
  const N = 256, r = mulberry32(77), H = [new Float32Array(N * N), new Float32Array(N * N), new Float32Array(N * N)];
  const W = (x, y) => ((y % N + N) % N) * N + ((x % N + N) % N);
  // brins : traits courts, souvent inclinés dans le même sens (herbe couchée)
  for (let i = 0; i < 2600; i++) {
    const cx = r() * N, cy = r() * N, len = 8 + r() * 16, ang = -1.9 + (r() - 0.5) * 1.6, amp = 0.35 + r() * 0.65;
    for (let t = 0; t < len; t += 0.6) {
      const x = Math.round(cx + Math.cos(ang) * t), y = Math.round(cy + Math.sin(ang) * t), v = amp * (0.4 + 0.6 * t / len);
      for (let k = -1; k <= 1; k++) { const id = W(x + k, y); H[0][id] = Math.max(H[0][id], v * (k ? 0.6 : 1)); }
    }
  }
  // touffes plus sombres (creux) pour casser la régularité
  for (let i = 0; i < 40; i++) {
    const cx = r() * N, cy = r() * N, rad = 6 + r() * 14;
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) { const d = Math.hypot(x, y) / rad; if (d < 1) H[0][W(cx + x | 0, cy + y | 0)] *= 0.55 + 0.45 * d; }
  }
  // gravier : cailloux arrondis
  for (let i = 0; i < 420; i++) {
    const cx = r() * N, cy = r() * N, rad = 2.5 + r() * r() * 9, amp = 0.5 + r() * 0.5, sq = 0.6 + r() * 0.4, rot = r() * 3.14;
    const cr = Math.cos(rot), sn = Math.sin(rot);
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
      const u = (x * cr + y * sn), v = (-x * sn + y * cr) / sq, d = Math.hypot(u, v) / rad;
      if (d < 1) { const id = W(cx + x | 0, cy + y | 0); H[1][id] = Math.max(H[1][id], amp * Math.sqrt(1 - d * d)); }
    }
  }
  // feuilles mortes : ellipses pointues empilées
  for (let i = 0; i < 520; i++) {
    const cx = r() * N, cy = r() * N, L = 6 + r() * 10, Wd = L * (0.3 + r() * 0.2), rot = r() * 6.28, base = r();
    const cr = Math.cos(rot), sn = Math.sin(rot);
    for (let y = -L; y <= L; y++) for (let x = -L; x <= L; x++) {
      const u = (x * cr + y * sn) / L, v = (-x * sn + y * cr) / Wd;
      const e = u * u + v * v * (1 + Math.abs(u)); if (e < 1) { const id = W(cx + x | 0, cy + y | 0); H[2][id] = base * 0.6 + 0.4 * (1 - e) + (Math.abs(v) < 0.12 ? -0.15 : 0); }
    }
  }
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    img.data[i * 4] = clamp(H[0][i]) * 255; img.data[i * 4 + 1] = clamp(H[1][i]) * 255; img.data[i * 4 + 2] = clamp(H[2][i]) * 255; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
})();

function* buildGroundChunk(cx, cz) {
  const RES = 256, MR = 128, x0 = cx * CHK, z0 = cz * CHK, c = document.createElement('canvas'); c.width = c.height = RES;
  const g = c.getContext('2d'), img = g.createImageData(RES, RES), D = img.data;
  // ombre au pied des arbres : ce tronçon et ses voisins
  const AR = 96, ao = new Float32Array(AR * AR), sc = AR / CHK;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const t of treeSites(cx + i, cz + j)) {
    const pr = P.protos[t.kind][Math.min(P.protos[t.kind].length - 1, (t.vi * P.protos[t.kind].length) | 0)], aoR = pr.ao * t.s;
    const px = (t.x - x0) * sc, pz = (t.z - z0) * sc, rr = aoR * sc;
    if (px < -rr || pz < -rr || px > AR + rr || pz > AR + rr) continue;
    for (let y = Math.max(0, pz - rr | 0); y < Math.min(AR, pz + rr + 1); y++)
      for (let x = Math.max(0, px - rr | 0); x < Math.min(AR, px + rr + 1); x++) {
        const d = Math.hypot(x - px, y - pz) / rr; if (d < 1) ao[y * AR + x] += (1 - d) * (1 - d) * 0.55;
      }
  }
  const C = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
  const GP = GROUND_PAL;
  const PA = BIOMES.map(b => C(GP[b.id].A)), PB = BIOMES.map(b => C(GP[b.id].B)), PM = BIOMES.map(b => C(GP[b.id].M));
  const N = MR * MR, cA = new Uint8ClampedArray(N * 3), cB = new Uint8ClampedArray(N * 3), cM = new Uint8ClampedArray(N * 3);
  const dens = new Float32Array(N), dry = new Float32Array(N), hgt = new Float32Array(N), lit = new Float32Array(N), rock = new Float32Array(N), n1a = new Float32Array(N), wpin = new Float32Array(N), wbam = new Float32Array(N), wdes = new Float32Array(N), wsea = new Float32Array(N), wmt = new Float32Array(N), slope = new Float32Array(N), cT = new Float32Array(N), bchA = new Float32Array(N), posi = new Float32Array(N);
  const w = new Float32Array(NB);
  for (let j = 0; j < MR; j++) for (let i = 0; i < MR; i++) {
    const x = x0 + (i + 0.5) / MR * CHK, z = z0 + (j + 0.5) / MR * CHK, q = j * MR + i;
    biomeW(x, z, w);
    let a0 = 0, a1 = 0, a2 = 0, b0 = 0, b1 = 0, b2 = 0, m0 = 0, m1 = 0, m2 = 0;
    for (let k = 0; k < NB; k++) { a0 += w[k] * PA[k][0]; a1 += w[k] * PA[k][1]; a2 += w[k] * PA[k][2]; b0 += w[k] * PB[k][0]; b1 += w[k] * PB[k][1]; b2 += w[k] * PB[k][2]; m0 += w[k] * PM[k][0]; m1 += w[k] * PM[k][1]; m2 += w[k] * PM[k][2]; }
    cA[q * 3] = a0; cA[q * 3 + 1] = a1; cA[q * 3 + 2] = a2; cB[q * 3] = b0; cB[q * 3 + 1] = b1; cB[q * 3 + 2] = b2; cM[q * 3] = m0; cM[q * 3 + 1] = m1; cM[q * 3 + 2] = m2;
    const wl = w[BI.lande]; wpin[q] = w[BI.pinede]; wbam[q] = w[BI.bambou]; wdes[q] = w[BI.desert] > 0.03 ? w[BI.desert] : 0;
    const h = height(x, z); hgt[q] = h;
    dens[q] = forestDensity(x, z, h); dry[q] = fbm(x * 0.04 + 70, z * 0.04 - 33, 3) + w[BI.prairie] * 0.2;
    lit[q] = litter(x, z); n1a[q] = fbm(x * 0.06, z * 0.06, 3);
    wmt[q] = w[BI.montagne]; if (wmt[q] > 0.05) slope[q] = Math.min(1, Math.hypot(height(x + 0.6, z) - h, height(x, z + 0.6) - h) / 0.6 * 0.5);
    const wsl = w[BI.littoral]; wsea[q] = wsl; cT[q] = wsl > 0.03 ? coastT(x, z) : -1; bchA[q] = beachiness(x, z); posi[q] = fbm(x * 0.07 + 300, z * 0.07 - 90, 3);
    rock[q] = (wl > 0.05 ? wl * smooth(0.0, 0.3, fbm(x * 0.08 + 500, z * 0.08, 3)) : 0) + (wsl > 0.05 ? smooth(0.0, -0.25, bchA[q]) * smooth(-0.3, -0.1, cT[q]) * smooth(0.0, -0.02, cT[q] - 0.02) * 0.9 : 0);
    if (i === MR - 1 && j % 16 === 15) yield;
  }
  const mc = document.createElement('canvas'); mc.width = mc.height = MR;
  const mg = mc.getContext('2d'), mimg = mg.createImageData(MR, MR), MD = mimg.data;
  const sr = mulberry32(hash3(cx, cz, 13));
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const gDry = C('#93a94c'), dA = C('#8a5a34'), dB = C('#6a4128'), pa = C('#a8835a'), pb = C('#7a573a'), pRut = C('#5c4330'), pEdge = C('#5f5a32'), gravel = C('#b9ab92');
  const sandD1 = C('#e4c790'), sandD2 = C('#d2a86a'), grA = C('#b86e46'), grB = C('#d49a66');
  const strawA = C('#c8b46a'), strawB = C('#9a8648');
  const scrA = C('#8e8c86'), scrB = C('#6c6b68'), snowA = C('#f4f6f8'), snowB = C('#dde4ee');
  const pebA = C('#b8b0a0'), pebB = C('#8c8578'), limA = C('#ddd6c4'), limB = C('#bdb5a2'), wrackC = C('#5a4632'), posA = C('#24413a'), posB = C('#2f5244');
  const sandA = C('#ecdcb0'), sandB = C('#dcc796'), sandW = C('#b59f72'), sandBed = C('#b8b48a'), needleG = C('#7a5c3a'), rockC = C('#8c8a7e'), wet = C('#33402c'), bed = C('#3c4a3a');
  const leafs = [C('#c8752e'), C('#9c4d22'), C('#e0a040'), C('#5a3420'), C('#b8862f')];
  const chs = chaletsAround(x0 + CHK / 2, z0 + CHK / 2);
  for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
    const x = x0 + (i + 0.5) / RES * CHK, z = z0 + (j + 0.5) / RES * CHK;
    const q = (j >> 1) * MR + (i >> 1), d = dens[q], h = hgt[q];
    const n1 = n1a[q], n2 = noise(x * 0.35, z * 0.35), fine = sr();
    const A = [cA[q * 3], cA[q * 3 + 1], cA[q * 3 + 2]], B = [cB[q * 3], cB[q * 3 + 1], cB[q * 3 + 2]], Mo = [cM[q * 3], cM[q * 3 + 1], cM[q * 3 + 2]];
    let col3 = mix3(A, B, clamp(0.5 + n1 * 0.8 + n2 * 0.25));
    col3 = mix3(col3, mix3(A, [0, 0, 0], 0.25), clamp(-n1 * 2 - 0.2) * 0.6);
    col3 = mix3(col3, gDry, smooth(0.1, 0.45, dry[q]) * (1 - d) * 0.75);
    col3 = mix3(col3, Mo, smooth(0.35, 0.9, d) * 0.6);
    if (wdes[q] > 0.03) {
      const k = smooth(0.05, 0.5, wdes[q]), bt = butte(x, z);
      const rip = 0.5 + 0.5 * Math.sin((x * 0.87 + z * 0.49) * 4.2 + n2 * 3);
      col3 = mix3(col3, mix3(sandD1, sandD2, clamp(0.4 + n1 * 0.6 + rip * 0.25)), k * (1 - bt));
      if (bt > 0.02) { const st = 0.5 + 0.5 * Math.sin(h * 3.4 + n2 * 0.8); col3 = mix3(col3, mix3(grA, grB, st), k * smooth(0, 0.3, bt)); }
    }
    const wmq = wmt[q];
    if (wmq > 0.05) {
      const scree = smooth(TREELINE - 0.8, TREELINE + 1.6, h + n2 * 0.8) * smooth(0.05, 0.3, wmq);
      if (scree > 0) col3 = mix3(col3, mix3(scrA, scrB, clamp(0.5 + n2 + (fine - 0.5) * 0.6)), scree * clamp(0.35 + slope[q] * 1.6 + n1 * 0.4));
      const sn = smooth(SNOWLINE - 0.6, SNOWLINE + 0.8, h + n2 * 1.1 + n1 * 1.5) * (1 - smooth(0.45, 0.8, slope[q]) * 0.8);
      if (sn > 0) col3 = mix3(col3, mix3(snowA, snowB, clamp(0.5 + n2 * 0.6)), sn);
    }
    const Rk = smooth(0.25, 0.55, rock[q] + n2 * 0.1);
    if (Rk > 0) col3 = mix3(col3, rockC, Rk * (0.85 + (fine - 0.5) * 0.2));
    const L = smooth(0.26, 0.36, lit[q] + n2 * 0.08);
    if (L > 0) {
      const lt = clamp(0.5 + n2); let lc = fine < 0.35 ? leafs[(sr() * 5) | 0] : mix3(dA, dB, lt);
      if (wpin[q] > 0.05) lc = mix3(lc, mix3(needleG, dB, fine), smooth(0.1, 0.6, wpin[q]));
      if (wbam[q] > 0.05) lc = mix3(lc, mix3(strawA, strawB, fine), smooth(0.1, 0.6, wbam[q]));
      col3 = mix3(col3, lc, L);
    }
    const Wt = smooth(WL + 0.5, WL + 0.02, h + n2 * 0.06);
    const sea = smooth(0.12, 0.35, wsea[q]);
    if (sea > 0) {
      const t = cT[q], bc = bchA[q];
      const sandK = smooth(-0.16, -0.06, t + n2 * 0.02) * smooth(-0.05, 0.12, bc) * sea;
      col3 = mix3(col3, mix3(sandA, sandB, clamp(0.5 + n2 * 0.8 + (fine - 0.5) * 0.3)), sandK);
      const pebK = smooth(-0.2, -0.1, t) * smooth(0.12, -0.02, Math.abs(bc)) * sea;
      if (pebK > 0) col3 = mix3(col3, mix3(pebA, pebB, fine), pebK * 0.8);
      const rockK = smooth(-0.22, -0.05, t) * smooth(0.0, -0.2, bc) * sea;
      if (rockK > 0) col3 = mix3(col3, mix3(limA, limB, clamp(0.5 + n2)), rockK);
      const wrack = Math.exp(-(((h - WL - 0.22) / 0.06) ** 2)) * sandK * smooth(0.1, 0.4, noise(x * 0.4, z * 0.4) + 0.3);
      if (wrack > 0) col3 = mix3(col3, wrackC, wrack * 0.8);
    }
    if (Wt > 0) { col3 = mix3(col3, mix3(wet, sandW, sea), Wt * 0.7); col3 = mix3(col3, mix3(bed, sandBed, sea), smooth(WL, WL - 0.4, h)); }
    if (sea > 0 && h < WL - 0.4) {
      const pk = smooth(0.05, 0.2, posi[q] + n2 * 0.05) * smooth(WL - 0.4, WL - 1.0, h) * sea;
      col3 = mix3(col3, mix3(posA, posB, fine), pk);
    }
    const ti = trailInfo(x, z), sx = ti.d * 1.9 / ti.hw, pd = sx + n2 * (ti.s === 2 ? 0.35 : 0.7);
    const P0 = (1 - smooth(0.9, 2.3, pd)) * smooth(WL + 0.1, WL + 0.5, h);
    if (P0 > 0) {
      const pt = clamp(0.5 + n2 * 0.9 + (fine - 0.5) * 0.4);
      let pc = mix3(pa, pb, pt);
      const rut = Math.exp(-(((Math.abs(sx) - 0.62) / 0.2) ** 2)) * (0.6 + 0.4 * noise(z * 0.5, 3));
      pc = mix3(pc, pRut, rut * 0.55 * (ti.s ? 0.3 : 1));
      if (ti.s === 1) pc = mix3(pc, gravel, 0.6 * clamp(0.6 + fine * 0.5));   // gravier clair
      else if (ti.s === 2) pc = mix3(pc, col3, 0.3 + 0.3 * clamp(0.5 + n2));   // sente : herbe qui reprend
      pc = mix3(pc, B, Math.exp(-((sx / 0.22) ** 2)) * clamp(0.3 + noise(z * 0.3, 9) * 0.8) * 0.7);
      col3 = mix3(col3, pc, P0);
      col3 = mix3(col3, pEdge, Math.exp(-(((pd - 1.9) / 0.35) ** 2)) * 0.35 * smooth(WL + 0.1, WL + 0.5, h));
    }
    for (const c of chs) {
      const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz > 400) continue;
      const door = c.x - c.side * 3.2, pz = c.z;
      const tx = clamp((x - door) / (pathX(pz) - door)), sd = Math.hypot(x - lerp(door, pathX(pz), tx), z - pz);
      const yard = smooth(5.5, 3.2, Math.hypot(dx, dz) + n2 * 0.6), trail = smooth(0.9, 0.5, sd + n2 * 0.25);
      const k = Math.max(yard * 0.75, trail);
      if (k > 0) col3 = mix3(col3, mix3(pa, pb, clamp(0.5 + n2)), k);
    }
    const gr = 1 + (fine - 0.5) * 0.12;
    if (fine > 0.9985 && P0 < 0.3 && Wt < 0.3) col3 = [235, 240, 215];
    const a = 1 - Math.min(0.62, ao[(j * AR / RES | 0) * AR + (i * AR / RES | 0)]);
    const k = (j * RES + i) * 4;
    D[k] = col3[0] * gr * a; D[k + 1] = col3[1] * gr * a; D[k + 2] = col3[2] * gr * (a * 0.9 + 0.1); D[k + 3] = 255;
    if (!(i & 1) && !(j & 1)) { const m = q * 4; MD[m] = Math.max(P0, Rk) * 255; MD[m + 1] = L * 255; MD[m + 2] = smooth(0.35, 0.9, d) * 255; MD[m + 3] = 255; }
    if (i === RES - 1 && j % 20 === 19) yield;
  }
  g.putImageData(img, 0, 0); mg.putImageData(mimg, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const mask = new THREE.CanvasTexture(mc); mask.flipY = false;
  // maillage 0,5 m ; normales calculées depuis le relief pour éviter toute couture entre tronçons
  const SEG = 96, geo = new THREE.PlaneGeometry(CHK, CHK, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, nrm = geo.attributes.normal, e = 0.5;
  for (let i = 0; i < pos.count; i++) {
    const x = x0 + CHK / 2 + pos.getX(i), z = z0 + CHK / 2 + pos.getZ(i), h = height(x, z);
    pos.setY(i, h);
    const nx = height(x - e, z) - height(x + e, z), nz = height(x, z - e) - height(x, z + e), l = Math.hypot(nx, 2 * e, nz);
    nrm.setXYZ(i, nx / l, 2 * e / l, nz / l);
    if (i % 3000 === 2999) yield;
  }
  geo.computeBoundingSphere();
  const mat = patch(new THREE.MeshLambertMaterial({ map: tex }), { ground: { mask, detail: groundDetail, mo: new THREE.Vector3(x0, z0, CHK) } });
  mat.userData.mask = mask;
  const m = new THREE.Mesh(geo, mat); m.position.set(x0 + CHK / 2, 0, z0 + CHK / 2); m.receiveShadow = true;
  return m;
}

// ── eau : un grand plan qui suit le joueur, et une fenêtre de profondeur recalculée quand on s'éloigne
const WWIN = 192;
let waterMesh = null, wOrigin = null;
function buildWaterPlane() {
  if (!waterMesh) { waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(720, 720).rotateX(-Math.PI / 2), M.water); waterMesh.receiveShadow = true; scene.add(waterMesh); }
  waterMesh.position.y = WL; wOrigin = null;
}
function updateWater() {
  if (!waterMesh || ASSETS) return;
  const ox = Math.floor(camTarget.x / CHK) * CHK - WWIN / 2 + CHK / 2, oz = Math.floor(camTarget.z / CHK) * CHK - WWIN / 2 + CHK / 2;
  waterMesh.position.x = ox + WWIN / 2; waterMesh.position.z = oz + WWIN / 2;
  if (!waterJob && !(wOrigin && wOrigin[0] === ox && wOrigin[1] === oz)) { wOrigin = [ox, oz]; waterJob = buildWaterDepth(ox, oz); }
  if (waterJob) { const t0 = performance.now(); while (performance.now() - t0 < 3) if (waterJob.next().done) { waterJob = null; break; } }
}
let waterJob = null;
function* buildWaterDepth(ox, oz) {
  const data = new Uint8Array(WWIN * WWIN * 4);
  for (let j = 0; j < WWIN; j++) {
    for (let i = 0; i < WWIN; i++) {
      const x = ox + i + 0.5, z = oz + j + 0.5, d = WL - height(x, z), k = (j * WWIN + i) * 4;
      data[k] = clamp((d + 0.5) / 3) * 255; data[k + 1] = smooth(0.15, 0.4, biomeW(x, z)[BI.littoral]) * 255; data[k + 3] = 255;
    }
    if (j % 12 === 11) yield;
  }
  if (U.tWDepth.value) U.tWDepth.value.dispose();
  const t = new THREE.DataTexture(data, WWIN, WWIN); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  U.tWDepth.value = t; U.uWO.value.set(ox, oz, WWIN);
}

// ── terrain lointain : une grande nappe grossière (8 m) aux couleurs des biomes, pour l'horizon
const farGround = { mesh: null, origin: null, job: null };
function* buildFarGround(ox, oz) {
  const SZ = 640, SEG = 80, geo = new THREE.PlaneGeometry(SZ, SZ, SEG, SEG); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), w = new Float32Array(NB), mc = BIOMES.map(b => new THREE.Color(b.map).multiplyScalar(0.78));
  for (let i = 0; i < pos.count; i++) {
    const x = ox + pos.getX(i), z = oz + pos.getZ(i), h = heightRaw(x, z, true);
    pos.setY(i, h - 0.6);
    climateWeights(x, z, w);
    let r = 0, g = 0, b = 0; for (let k = 0; k < NB; k++) { r += w[k] * mc[k].r; g += w[k] * mc[k].g; b += w[k] * mc[k].b; }
    if (h > SNOWLINE + 0.5) { r = 0.9; g = 0.92; b = 0.95; } else if (h < WL) { r = 0.12; g = 0.2; b = 0.2; }
    cols[i * 3] = r; cols[i * 3 + 1] = g; cols[i * 3 + 2] = b;
    if (i % 400 === 399) yield;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  if (farGround.mesh) { scene.remove(farGround.mesh); farGround.mesh.geometry.dispose(); }
  farGround.mesh = new THREE.Mesh(geo, M.far); farGround.mesh.position.set(ox, 0, oz); farGround.mesh.receiveShadow = true; scene.add(farGround.mesh);
}
function updateFarGround() {
  if (ASSETS || !worldRoot) return;
  const ox = Math.round(camTarget.x / 96) * 96, oz = Math.round(camTarget.z / 96) * 96;
  if (!farGround.job && (!farGround.origin || farGround.origin[0] !== ox || farGround.origin[1] !== oz)) { farGround.origin = [ox, oz]; farGround.job = buildFarGround(ox, oz); }
  if (farGround.job) { const t0 = performance.now(); while (performance.now() - t0 < 2) if (farGround.job.next().done) { farGround.job = null; break; } }
}

// ── carte topographique : papier, courbes de niveau (2 m, maîtresses à 10 m), estompage, eau, forêts, sentier
const mini = document.getElementById('minimap'), miniCtx = mini.getContext('2d');
const TOPO = { S: 200, span: 300, G: 101, img: null, cx: 0, cz: 0, job: null };
let lastBiome = -1, miniT = 0;
function* buildTopo(cx, cz, out = TOPO) {
  const { S, span, G } = out, step = span / (G - 1), hs = new Float32Array(G * G), fo = new Float32Array(G * G), sand = new Float32Array(G * G), rv = new Uint8Array(G * G), w = new Float32Array(NB);
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const x = cx - span / 2 + i * step, z = cz - span / 2 + j * step, q = j * G + i;
      hs[q] = heightRaw(x, z, true); climateWeights(x, z, w);
      let tr = 0; for (let k = 0; k < NB; k++) tr += w[k] * BIOMES[k].trees;
      fo[q] = clamp(tr * (0.62 + fbm(x * 0.028 + 11, z * 0.028 - 7, 3) * 0.75)) * smooth(TREELINE + 1, TREELINE - 1, hs[q]);
      sand[q] = Math.max(w[BI.desert], w[BI.littoral] * smooth(WL + 1.6, WL + 0.6, hs[q]));
      const r = riverAt(x, z); rv[q] = r && r.fade > 0.4 && r.d < r.w + 1 ? 1 : 0;
    }
    if (j % 6 === 5) yield;
  }
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), im = g.createImageData(S, S), Dd = im.data;
  const sample = (a, fx, fz) => { const i = Math.min(G - 2, fx | 0), j = Math.min(G - 2, fz | 0), u = fx - i, v = fz - j, q = j * G + i; return (a[q] * (1 - u) + a[q + 1] * u) * (1 - v) + (a[q + G] * (1 - u) + a[q + G + 1] * u) * v; };
  const k = (G - 1) / S, HS = new Float32Array(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) HS[j * S + i] = sample(hs, i * k, j * k);
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const q = j * S + i, h = HS[q], fx = i * k, fz = j * k;
      let r = 238, gg = 230, b = 208;                                                   // papier
      const f = sample(fo, fx, fz), sd = sample(sand, fx, fz);
      r = lerp(r, 196, f * 0.8); gg = lerp(gg, 216, f * 0.8); b = lerp(b, 168, f * 0.8);   // forêts en vert tendre
      r = lerp(r, 236, sd * 0.7); gg = lerp(gg, 220, sd * 0.7); b = lerp(b, 176, sd * 0.7); // sable
      if (h > SNOWLINE) { r = 250; gg = 251; b = 252; }
      // estompage : lumière venant du nord-ouest
      const hx = HS[q + (i < S - 1 ? 1 : 0)] - HS[q - (i > 0 ? 1 : 0)], hz = HS[q + (j < S - 1 ? S : 0)] - HS[q - (j > 0 ? S : 0)];
      const shade = clamp(1 + (hx + hz) * 0.18, 0.72, 1.1); r *= shade; gg *= shade; b *= shade;
      if (h < WL) { const dpt = clamp((WL - h) / 3); r = lerp(176, 120, dpt); gg = lerp(212, 172, dpt); b = lerp(226, 206, dpt); }
      else if (sample(rv, fx, fz) > 0.45) { r = 126; gg = 178; b = 210; }
      // courbes de niveau : changement d'intervalle entre ce pixel et ses voisins droite / bas
      if (h >= WL) {
        const hr = i < S - 1 ? HS[q + 1] : h, hd = j < S - 1 ? HS[q + S] : h;
        const c2 = Math.floor(h / 2), mj = Math.floor(h / 10);
        if (Math.floor(hr / 10) !== mj || Math.floor(hd / 10) !== mj) { r *= 0.74; gg *= 0.64; b *= 0.54; }
        else if (Math.floor(hr / 2) !== c2 || Math.floor(hd / 2) !== c2) { r *= 0.86; gg *= 0.8; b *= 0.72; }
      } else {
        const hr = i < S - 1 ? HS[q + 1] : h, hd = j < S - 1 ? HS[q + S] : h;
        if ((hr >= WL) !== (h >= WL) || (hd >= WL) !== (h >= WL)) { r = 70; gg = 120; b = 160; }   // trait de côte
      }
      const o = q * 4; Dd[o] = r; Dd[o + 1] = gg; Dd[o + 2] = b; Dd[o + 3] = 255;
    }
    if (j % 40 === 39) yield;
  }
  g.putImageData(im, 0, 0);
  // sentier en tirets rouges
  g.strokeStyle = '#b8402c'; g.lineWidth = 1.6; g.setLineDash([4, 3]); g.beginPath();
  let pen = false;
  for (let z = cz - span / 2; z <= cz + span / 2; z += 2) {
    const x = pathX(z), px = (x - cx + span / 2) / span * S, pz = (z - cz + span / 2) / span * S;
    const wet = px < 0 || px >= S || sample(hs, px * k, pz * k) < WL + 0.2;   // le sentier s'arrête au bord de l'eau
    if (wet) { pen = false; continue; }
    if (!pen) { g.moveTo(px, pz); pen = true; } else g.lineTo(px, pz);
  }
  g.stroke(); g.setLineDash([]);
  // chemins secondaires : points le long des lignes zéro (gravier brun, sentes plus fines)
  { const st = S > 300 ? 2 : 1, m = span / S;
    for (let py = 0; py < S; py += st) {
      for (let px = 0; px < S; px += st) {
        const x = cx - span / 2 + px * m, z = cz - span / 2 + py * m;
        if (sample(hs, px * k, py * k) < WL + 0.2 || ridgeMaskRaw(x, z) > 0.5) continue;
        for (let i = 1; i <= 2; i++) {
          const f = trailF(i, x, z), e = m * st * (i === 1 ? 0.0042 : 0.0075);
          if (Math.abs(f) < e) { g.fillStyle = i === 1 ? '#9a5a36' : '#b07a52'; g.fillRect(px, py, i === 1 ? 1.4 : 1, i === 1 ? 1.4 : 1); }
        }
      }
      if (py % 32 === 0) yield;
    }
  }
  // chalets et ponts connus
  g.fillStyle = '#3a2a1e';
  const nc = Math.ceil(span / CHK / 2) + 1;
  for (let i = -nc; i <= nc; i++) for (let j = -nc; j <= nc; j++) for (const c of chaletSites(Math.floor(cx / CHK) + i, Math.floor(cz / CHK) + j)) {
    const px = (c.x - cx + span / 2) / span * S, pz = (c.z - cz + span / 2) / span * S; if (px > 0 && pz > 0 && px < S && pz < S) g.fillRect(px - 2, pz - 2, 4, 4);
  }
  // cadre et échelle
  g.strokeStyle = 'rgba(90,70,40,.5)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, S - 1, S - 1);
  const sm = span > 400 ? 100 : 50; g.fillStyle = 'rgba(70,50,30,.75)'; g.fillRect(8, S - 12, sm / span * S, 2); g.font = (S > 300 ? 12 : 9) + 'px ui-rounded, system-ui'; g.fillText(sm + ' m', 8, S - 15);
  out.img = cv; out.cx = cx; out.cz = cz;
}
function updateTopo() {
  const px = player.position.x, pz = player.position.z;
  if (!TOPO.job && (!TOPO.img || Math.hypot(px - TOPO.cx, pz - TOPO.cz) > 45)) TOPO.job = buildTopo(Math.round(px / 8) * 8, Math.round(pz / 8) * 8);
  if (TOPO.job) { const t0 = performance.now(); while (performance.now() - t0 < 3) if (TOPO.job.next().done) { TOPO.job = null; break; } }
}
// clic sur la carte : téléportation (sur la terre ferme la plus proche)
function teleport(x, z) {
  for (let r = 0; r < 40; r += 1.5) for (let a = 0; a < 6.28; a += 0.7) {
    const tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r;
    if (heightRaw(tx, tz, true) > WL + 0.15) {
      player.position.set(tx, heightRaw(tx, tz, true), tz); camTarget.copy(player.position); moveTo = null; worldReady = false; return;
    }
    if (r === 0) break;
  }
}
// cherche le biome demandé de plus en plus loin autour du joueur
function goToBiome(bi) {
  const w = new Float32Array(NB), px = player.position.x, pz = player.position.z;
  let best = -1e9, bx = px, bz = pz;
  for (let r = 0; r <= 1800; r += 30) {
    const n = Math.max(1, Math.round(2 * Math.PI * r / 30));
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.28, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      climateWeights(x, z, w); if (w[bi] < 0.55) continue;
      const sc = w[bi] - r / 4000; if (sc <= best) continue;
      if (heightRaw(x, z, true) > WL + 0.4) { best = sc; bx = x; bz = z; }
    }
    if (best > 0.5) break;
  }
  teleport(bx, bz);
}
window.canopee = { get camera() { return camera; }, get sail() { return sail; }, goToBiome, height: (x, z) => height(x, z), heightRaw: (x, z) => heightRaw(x, z, true), riverAt: (x, z) => riverAt(x, z), get bridges() { return bridges; }, renderer, scene, U, sun, get player() { return player; }, pathX: z => pathX(z), get PRESETS() { return PRESETS; }, setPlanche: on => setPlanche(on), get cur() { return cur; }, get chunks() { return chunks; },
  stats() { let n = 0, inst = 0; scene.traverse(o => { if (o.isMesh) { n++; if (o.isInstancedMesh) { inst += o.count; } } }); return { meshes: n, instances: inst, chunks: chunks.size }; } };
// grande carte : un clic sur la mini-carte l'ouvre ; double-clic sur un endroit pour s'y rendre ; Échap ou clic à côté pour fermer
const BIG = { S: 640, span: 720, G: 181, img: null, cx: 0, cz: 0, job: null, open: false };
const bigEl = document.getElementById('bigmap'), bigCv = document.getElementById('bigcv'), bigCtx = bigCv.getContext('2d');
function openBigMap() {
  BIG.open = true; bigEl.classList.add('on');
  BIG.job = buildTopo(Math.round(player.position.x / 8) * 8, Math.round(player.position.z / 8) * 8, BIG); BIG.img = null;
}
function closeBigMap() { BIG.open = false; bigEl.classList.remove('on'); BIG.job = null; }
mini.addEventListener('click', openBigMap);
bigEl.addEventListener('click', e => { if (e.target === bigEl) closeBigMap(); });
addEventListener('keydown', e => { if (e.code === 'Escape' && BIG.open) closeBigMap(); });
bigCv.addEventListener('dblclick', e => {
  if (!BIG.img) return;
  const b = bigCv.getBoundingClientRect();
  teleport(BIG.cx + ((e.clientX - b.left) / b.width - 0.5) * BIG.span, BIG.cz + ((e.clientY - b.top) / b.height - 0.5) * BIG.span);
  closeBigMap();
});
function drawBigMap() {
  if (!BIG.open) return;
  if (BIG.job) { const t0 = performance.now(); while (performance.now() - t0 < 12) if (BIG.job.next().done) { BIG.job = null; break; } }
  const S = bigCv.width;
  bigCtx.fillStyle = '#eee6d0'; bigCtx.fillRect(0, 0, S, S);
  if (!BIG.img) { bigCtx.fillStyle = 'rgba(70,50,30,.6)'; bigCtx.font = '16px ui-rounded, system-ui'; bigCtx.textAlign = 'center'; bigCtx.fillText('Cartographie…', S / 2, S / 2); bigCtx.textAlign = 'left'; return; }
  bigCtx.drawImage(BIG.img, 0, 0, S, S);
  const k = S / BIG.span, px = S / 2 + (player.position.x - BIG.cx) * k, pz = S / 2 + (player.position.z - BIG.cz) * k;
  bigCtx.save(); bigCtx.translate(px, pz); bigCtx.rotate(-camYaw);
  bigCtx.fillStyle = 'rgba(184,64,44,.22)'; bigCtx.beginPath(); bigCtx.moveTo(0, 0); bigCtx.lineTo(-22, -44); bigCtx.lineTo(22, -44); bigCtx.closePath(); bigCtx.fill(); bigCtx.restore();
  bigCtx.fillStyle = '#b8402c'; bigCtx.strokeStyle = '#fff8ec'; bigCtx.lineWidth = 2.5; bigCtx.beginPath(); bigCtx.arc(px, pz, 6, 0, 7); bigCtx.fill(); bigCtx.stroke();
  bigCtx.fillStyle = 'rgba(70,50,30,.85)'; bigCtx.font = 'bold 14px ui-rounded, system-ui'; bigCtx.fillText('N', S - 22, 22);
}
function drawMinimap(now) {
  drawBigMap();
  updateTopo();
  if (!TOPO.img || now - miniT < 80) return; miniT = now;
  const S = mini.width, VIEW = 160, k = S / VIEW, D = TOPO.span * k;   // on ne montre que 160 m autour du joueur (zoom ×1,9)
  miniCtx.fillStyle = '#eee6d0'; miniCtx.fillRect(0, 0, S, S);
  // la carte défile : le joueur reste au centre
  miniCtx.drawImage(TOPO.img, S / 2 + (TOPO.cx - TOPO.span / 2 - player.position.x) * k, S / 2 + (TOPO.cz - TOPO.span / 2 - player.position.z) * k, D, D);
  miniCtx.save(); miniCtx.translate(S / 2, S / 2); miniCtx.rotate(-camYaw);
  miniCtx.fillStyle = 'rgba(184,64,44,.18)'; miniCtx.beginPath(); miniCtx.moveTo(0, 0); miniCtx.lineTo(-16, -30); miniCtx.lineTo(16, -30); miniCtx.closePath(); miniCtx.fill();
  miniCtx.restore();
  miniCtx.fillStyle = '#b8402c'; miniCtx.strokeStyle = '#fff8ec'; miniCtx.lineWidth = 2;
  miniCtx.beginPath(); miniCtx.arc(S / 2, S / 2, 4, 0, 7); miniCtx.fill(); miniCtx.stroke();
  // rose des vents
  miniCtx.fillStyle = 'rgba(70,50,30,.8)'; miniCtx.font = 'bold 10px ui-rounded, system-ui'; miniCtx.fillText('N', S - 14, 14);
  const b = nearRiver(player.position.x, player.position.z, 4) ? -2 : biomeArgmax(player.position.x, player.position.z);
  if (b !== lastBiome) {
    lastBiome = b; const el = document.getElementById('biome');
    el.textContent = b === -2 ? 'Rivière' : BIOMES[b].name; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
}

// ════════════════════════════════════════════════════════════════════
//  Personnage, lanterne, particules
// ════════════════════════════════════════════════════════════════════
// ── Personnages : silhouettes géométriques douces, couleurs pastel (inspiration « Monument Valley »)
const CHARS = [
  { id: 'lapin', name: 'Petit lapin' },
  { id: 'corbeau', name: 'Corbeau' },
  { id: 'pelerin', name: 'Pèlerin au chapeau' },
  { id: 'explorateur', name: 'Explorateur' },
];
const charMat = (hex, glow = 0) => patch(new THREE.MeshLambertMaterial({ color: hex, emissive: hex, emissiveIntensity: glow }), { reveal: false });
const lathe = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
function makeCharacter(id) {
  const group = new THREE.Group(), anims = []; let gait = null;
  const add = (geo, m, x = 0, y = 0, z = 0, parent = group) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; parent.add(me); return me; };
  // l'avant du personnage regarde vers -z
  if (id === 'corbeau') {
    const ink = charMat('#2e333b'), rim = charMat('#eef0ea'), pupil = charMat('#1e3a36');
    const body = new THREE.Group(); body.position.y = 0.3; group.add(body);
    // corps en cloche, cou fin
    add(lathe([[0, 0], [0.19, 0], [0.21, 0.05], [0.18, 0.16], [0.11, 0.4], [0.07, 0.6], [0, 0.61]]), ink, 0, 0, 0, body);
    const tail = add(new THREE.ConeGeometry(0.05, 0.16, 4).rotateX(Math.PI / 2 + 0.5), ink, 0, 0.06, 0.2, body);
    // tête : dôme arrondi + grand bec en coin
    const head = new THREE.Group(); head.position.set(0, 0.66, 0.02); body.add(head);
    add(new THREE.SphereGeometry(0.16, 20, 14), ink, 0, 0.01, 0.02, head).scale.set(0.86, 1.05, 1.15);
    // bec : pyramide à 4 faces, face plate dessous, pointe vers l'avant et un peu vers le bas
    const beak = new THREE.ConeGeometry(0.14, 0.58, 4, 1); beak.rotateY(Math.PI / 4); beak.rotateX(-Math.PI / 2 - 0.12); beak.scale(0.95, 0.85, 1);
    add(beak, ink, 0, -0.04, -0.28, head);
    for (const sx of [-1, 1]) {                    // yeux ronds cerclés de clair, sur les côtés
      const eye = new THREE.Group(); eye.position.set(sx * 0.137, 0.035, 0.02); eye.rotation.y = sx * Math.PI / 2; head.add(eye);
      add(new THREE.CircleGeometry(0.068, 24), rim, 0, 0, 0.004, eye).scale.set(0.82, 1, 1);
      add(new THREE.CircleGeometry(0.05, 24), pupil, 0.012 * sx, 0, 0.008, eye).scale.set(0.78, 1, 1);
    }
    add(new THREE.ConeGeometry(0.025, 0.1, 4).rotateX(0.6), ink, 0, 0.17, 0.06, head);   // petite plume en crête
    // pattes fines articulées à la hanche, pieds pointus vers l'avant
    const legs = [];
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(sx * 0.055, 0.3, 0.01); group.add(hip);
      add(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6), ink, 0, -0.15, 0, hip);
      add(new THREE.ConeGeometry(0.035, 0.14, 4).rotateX(-Math.PI / 2).scale(1, 0.35, 1), ink, 0, -0.29, -0.05, hip);
      legs.push([hip, sx]);
    }
    // marche d'oiseau : pattes alternées, petit rebond, la tête avance et recule
    gait = (w, mv) => {
      legs.forEach(([h, sx]) => { h.rotation.x = Math.sin(w + (sx > 0 ? Math.PI : 0)) * 0.55 * mv; });
      body.position.y = 0.3 + Math.abs(Math.cos(w)) * 0.035 * mv;
      body.rotation.z = Math.sin(w) * 0.05 * mv;
      head.position.z = 0.02 - (Math.sin(w * 2) * 0.5 + 0.5) * 0.06 * mv;
      tail.rotation.x = Math.sin(w * 2) * 0.15 * mv;
    };
    anims.push((t, w) => { head.rotation.y = Math.sin(t * 0.55) * 0.35 * (Math.sin(t * 0.21) > 0.3 ? 1 : 0.15); head.rotation.x = Math.sin(t * 1.3) * 0.04; });
  } else if (id === 'lapin') {
    const fur = charMat('#f3ece2'), pink = charMat('#f2a7a0'), dark = charMat('#2b2522');
    const body = new THREE.Group(); group.add(body);
    add(new THREE.SphereGeometry(0.2, 18, 14), fur, 0, 0.21, 0.03, body).scale.set(1, 0.95, 1.15);        // corps en œuf
    add(new THREE.SphereGeometry(0.09, 12, 10), fur, 0, 0.2, 0.25, body);                                    // queue pompon
    for (const sx of [-1, 1]) {
      add(new THREE.SphereGeometry(0.075, 12, 8), fur, sx * 0.12, 0.06, 0.12, body).scale.set(1, 0.6, 1.7);  // pattes arrière
      add(new THREE.SphereGeometry(0.04, 10, 8), fur, sx * 0.07, 0.05, -0.13, body).scale.set(1, 0.8, 1.3);  // pattes avant
    }
    const head = new THREE.Group(); head.position.set(0, 0.42, -0.1); body.add(head);
    add(new THREE.SphereGeometry(0.14, 18, 14), fur, 0, 0, 0, head).scale.set(1.05, 0.95, 1);
    for (const sx of [-1, 1]) {
      add(new THREE.SphereGeometry(0.05, 10, 8), fur, sx * 0.055, -0.05, -0.1, head);                          // joues
      add(new THREE.SphereGeometry(0.022, 8, 6), dark, sx * 0.075, 0.025, -0.115, head);                       // yeux
      add(new THREE.SphereGeometry(0.02, 8, 6), pink, sx * 0.1, -0.035, -0.105, head).scale.set(1.4, 0.7, 0.5); // pommettes
    }
    add(new THREE.SphereGeometry(0.02, 8, 6), pink, 0, -0.02, -0.145, head);                                   // nez
    const ears = [];
    for (const sx of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(sx * 0.06, 0.1, 0.01); ear.rotation.z = -sx * 0.18; head.add(ear);
      add(new THREE.SphereGeometry(0.05, 12, 10), fur, 0, 0.17, 0, ear).scale.set(0.9, 3.6, 0.55);
      add(new THREE.SphereGeometry(0.03, 10, 8), pink, 0, 0.17, -0.022, ear).scale.set(0.9, 4.2, 0.4);
      ears.push([ear, sx]);
    }
    // démarche sautillée : grands bonds, étirement en l'air, tassement à l'atterrissage, oreilles qui suivent
    gait = (w, mv) => {
      const ph = (w * 0.55) % Math.PI, up = Math.sin(ph);
      group.position.y = up * 0.26 * mv;
      body.rotation.x = -Math.cos(ph) * 0.35 * mv;
      body.scale.set(1 + (1 - up) * 0.08 * mv, 1 + (up - 0.5) * 0.14 * mv, 1);
      ears.forEach(([e, sx]) => { e.rotation.x = 0.15 + Math.cos(ph) * 0.45 * mv; e.rotation.z = -sx * (0.18 + (1 - up) * 0.15 * mv); });
    };
    anims.push((t, w) => { head.rotation.z = Math.sin(t * 0.9) * 0.06; ears[0][0].rotation.y = Math.sin(t * 3.1) * 0.08; });
  } else if (id === 'pelerin') {
    add(lathe([[0, 0], [0.33, 0], [0.31, 0.12], [0.21, 0.6], [0.11, 0.84], [0, 0.86]]), charMat('#f1e6d2'));
    add(new THREE.TorusGeometry(0.12, 0.045, 8, 20).rotateX(Math.PI / 2), charMat('#e07a5f'), 0, 0.8, 0);
    const tail = add(new THREE.BoxGeometry(0.08, 0.34, 0.03), charMat('#e07a5f'), 0.05, 0.64, 0.14); tail.rotation.z = 0.15;
    add(new THREE.SphereGeometry(0.13, 16, 12), charMat('#f7e4d4'), 0, 0.97, 0);
    add(new THREE.CylinderGeometry(0.29, 0.29, 0.025, 24), charMat('#d8b46e'), 0, 1.07, 0);
    add(new THREE.ConeGeometry(0.13, 0.2, 24), charMat('#d8b46e'), 0, 1.18, 0);
    add(new THREE.TorusGeometry(0.12, 0.018, 6, 20).rotateX(Math.PI / 2), charMat('#7a9e9f'), 0, 1.1, 0);
    anims.push((t, w) => { tail.rotation.x = 0.25 + Math.sin(w * 0.5) * 0.15; });
  } else if (id === 'explorateur') {
    // petit bonhomme aventurier : grosse tête, chapeau à large bord, besace, jambes et bras qui balancent
    const limb = (g, m, x, y, z) => { const piv = new THREE.Group(); piv.position.set(x, y, z); group.add(piv); const o = new THREE.Mesh(g, m); o.position.y = -g.parameters.height / 2; o.castShadow = true; o.userData.char = true; piv.add(o); return piv; };
    const pants = charMat('#5b4a3a'), shirt = charMat('#c9b27c'), skin = charMat('#f1cdb0'), boot = charMat('#3e2c20'), hat = charMat('#8a6240');
    const legL = limb(new THREE.CylinderGeometry(0.065, 0.06, 0.3, 10), pants, -0.08, 0.32, 0), legR = limb(new THREE.CylinderGeometry(0.065, 0.06, 0.3, 10), pants, 0.08, 0.32, 0);
    for (const l of [legL, legR]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.17), boot); b.position.set(0, -0.31, -0.02); b.castShadow = true; l.add(b); }
    add(lathe([[0, 0.28], [0.17, 0.3], [0.19, 0.42], [0.16, 0.6], [0, 0.63]]), shirt);
    add(new THREE.CylinderGeometry(0.175, 0.185, 0.045, 18), charMat('#4a3526'), 0, 0.36, 0);   // ceinture
    const armL = limb(new THREE.CylinderGeometry(0.05, 0.045, 0.26, 8), shirt, -0.2, 0.58, 0), armR = limb(new THREE.CylinderGeometry(0.05, 0.045, 0.26, 8), shirt, 0.2, 0.58, 0);
    for (const a of [armL, armR]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), skin); h.position.y = -0.28; a.add(h); }
    add(new THREE.TorusGeometry(0.09, 0.035, 8, 16).rotateX(Math.PI / 2), charMat('#c8553d'), 0, 0.63, 0);   // foulard
    add(new THREE.SphereGeometry(0.2, 18, 14), skin, 0, 0.83, 0);   // grosse tête
    for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.025, 8, 6), charMat('#2a211c'), sx * 0.07, 0.85, -0.18);   // yeux
    add(new THREE.CylinderGeometry(0.33, 0.33, 0.025, 26), hat, 0, 0.98, 0);                 // bord du chapeau
    add(new THREE.CylinderGeometry(0.15, 0.19, 0.17, 20), hat, 0, 1.07, 0);                  // calotte
    add(new THREE.CylinderGeometry(0.192, 0.192, 0.04, 20), charMat('#3a2a1e'), 0, 1.01, 0); // ruban
    const bag = add(new THREE.BoxGeometry(0.17, 0.15, 0.07), charMat('#7a5a3a'), 0.17, 0.4, 0.06);
    add(new THREE.TorusGeometry(0.24, 0.014, 4, 24).rotateY(Math.PI / 2).rotateX(0.7), charMat('#4a3526'), 0.02, 0.52, 0);   // bandoulière
    anims.push((t, w) => { const k = Math.sin(w) * 0.55; legL.rotation.x = k; legR.rotation.x = -k; armL.rotation.x = -k * 0.8; armR.rotation.x = k * 0.8; bag.rotation.x = Math.sin(w) * 0.1; });
  }
  group.traverse(o => { if (o.isMesh) o.userData.char = true; });
  return { group, gait, anim: (t, w) => anims.forEach(f => f(t, w)) };
}
const player = new THREE.Group();
let charId = 'corbeau';
try { charId = localStorage.getItem('canopee.char3') || charId; } catch (e) {}
function setCharacter(id) {
  if (!CHARS.some(c => c.id === id)) id = CHARS[0].id;
  charId = id;
  if (player.userData.char) player.remove(player.userData.char.group);
  player.userData.char = makeCharacter(id);
  player.add(player.userData.char.group);
  try { localStorage.setItem('canopee.char3', id); } catch (e) {}
}
setCharacter(charId);
// ════════════════════════════════════════════════════════════════════
//  Chalets : rondins, toit de bardeaux à deux pans, balcon, volets, cheminée qui fume
// ════════════════════════════════════════════════════════════════════
const chaletMats = new Map();
function cMat(key, hex, opts = {}, mopts = {}) {
  const k = key + hex; if (chaletMats.has(k)) return chaletMats.get(k);
  const m = patch(new THREE.MeshLambertMaterial({ color: hex, ...mopts }), { reveal: true, ...opts }); chaletMats.set(k, m); return m;
}
const winMat = patch(new THREE.MeshLambertMaterial({ color: 0x2b3b48, emissive: 0xffc46a, emissiveIntensity: 0 }), { reveal: true });
const smokeMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d2, transparent: true, opacity: 0.5, depthWrite: false });
const CHALET_V = [
  { wall: '#c48a4e', roof: '#5a4434', shutter: '#3f7a4a' },
  { wall: '#8f5c36', roof: '#6e6a66', shutter: '#b3423a' },
  { wall: '#d9a464', roof: '#6a4a36', shutter: '#3b6a8e' },
];
function makeChalet(vi) {
  const v = CHALET_V[vi % CHALET_V.length], g = new THREE.Group();
  const logs = cMat('logs', v.wall, { proc: 'logs' }), roofM = cMat('shingles', v.roof, { proc: 'shingles' }), stoneM = cMat('stone', '#a49c8c', { proc: 'stone' });
  const dark = cMat('plank', '#5e4128', { proc: 'plank' }), white = cMat('white', '#efe8da'), shut = cMat('plank', v.shutter, { proc: 'plank' }), red = cMat('flower', '#d8443a');
  const add = (geo, m, x, y, z, ry = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.y = ry; me.castShadow = me.receiveShadow = true; g.add(me); return me; };
  const W = R(4.0, 4.8), D = R(4.8, 5.6), B = 0.55, WH = R(2.1, 2.5), RISE = W * 0.26, T = B + WH;
  add(new THREE.BoxGeometry(W + 0.3, 1.6, D + 0.3), stoneM, 0, B - 0.8, 0);                       // soubassement en pierre
  add(new THREE.BoxGeometry(W, WH, D), logs, 0, B + WH / 2, 0);                                   // murs en rondins
  const tri = new THREE.Shape(); tri.moveTo(-W / 2, 0); tri.lineTo(W / 2, 0); tri.lineTo(0, RISE); tri.closePath();
  const gable = new THREE.ExtrudeGeometry(tri, { depth: D, bevelEnabled: false }); gable.translate(0, 0, -D / 2);
  add(gable, logs, 0, T, 0);                                                                       // pignons
  // toit à deux pans avec débord
  const a = Math.atan2(RISE, W / 2), hw = W / 2 + 0.95, L = hw / Math.cos(a), th = 0.18, len = D + 2.1;
  for (const sx of [-1, 1]) {
    const slab = add(new THREE.BoxGeometry(L, th, len), roofM, sx * (L / 2) * Math.cos(a), T + RISE - (L / 2) * Math.sin(a) + th * 0.6, 0);
    slab.rotation.z = -sx * a;
    const fascia = add(new THREE.BoxGeometry(L, 0.12, 0.08), dark, sx * (L / 2) * Math.cos(a), T + RISE - (L / 2) * Math.sin(a) + 0.02, -len / 2);
    fascia.rotation.z = -sx * a;
  }
  add(new THREE.BoxGeometry(0.22, 0.2, len + 0.05), dark, 0, T + RISE + 0.14, 0);                 // faîtage
  // grosses pierres posées sur le toit (lestage traditionnel)
  const rockG = new THREE.DodecahedronGeometry(0.16, 0), rockM = cMat('roofstone', '#8e8a80', {}, { flatShading: true });
  for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) {
    const f = R(0.25, 0.8), zz = R(-len / 2 + 0.5, len / 2 - 0.5), d = f * L;
    const st = add(rockG, rockM, sx * d * Math.cos(a), T + RISE - d * Math.sin(a) + th + 0.08, zz); st.scale.set(R(0.8, 1.4), R(0.6, 0.9), R(0.8, 1.3)); st.rotation.set(R(0, 3), R(0, 3), R(0, 3));
  }
  // balcon sur le pignon avant
  const bw = W * 0.72, bz = -D / 2 - 0.45;
  add(new THREE.BoxGeometry(bw, 0.1, 0.9), dark, 0, T + 0.05, bz);
  add(new THREE.BoxGeometry(bw, 0.07, 0.07), dark, 0, T + 0.78, bz - 0.42);
  for (let k = 0; k <= 10; k++) add(new THREE.BoxGeometry(0.06, 0.7, 0.04), dark, -bw / 2 + k * bw / 10, T + 0.45, bz - 0.42);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.12, T - B, 0.12), dark, sx * (bw / 2 - 0.05), B + (T - B) / 2, bz - 0.38);
  // porte
  add(new THREE.BoxGeometry(0.95, 1.75, 0.1), dark, W * 0.22, B + 0.88, -D / 2 - 0.02);
  add(new THREE.BoxGeometry(1.1, 0.1, 0.14), white, W * 0.22, B + 1.8, -D / 2 - 0.03);
  add(new THREE.BoxGeometry(1.2, 0.18, 0.6), stoneM, W * 0.22, B - 0.06, -D / 2 - 0.35);             // marche
  // fenêtres : vitre (s'allume la nuit), cadre blanc, volets, jardinière fleurie
  const win = (x, y, z, ry, w = 0.7, h = 0.8, box = true) => {
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; g.add(grp);
    const part = (geo, m, px, py, pz) => { const me = new THREE.Mesh(geo, m); me.position.set(px, py, pz); me.castShadow = me.receiveShadow = true; grp.add(me); };
    part(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.06), white, 0, 0, -0.02);
    part(new THREE.BoxGeometry(w, h, 0.06), winMat, 0, 0, -0.05);
    part(new THREE.BoxGeometry(0.05, h, 0.07), white, 0, 0, -0.07); part(new THREE.BoxGeometry(w, 0.05, 0.07), white, 0, 0, -0.07);
    for (const sx of [-1, 1]) part(new THREE.BoxGeometry(w * 0.5, h + 0.1, 0.05), shut, sx * (w * 0.75 + 0.08), 0, -0.04);
    if (box) { part(new THREE.BoxGeometry(w + 0.1, 0.16, 0.2), dark, 0, -h / 2 - 0.12, -0.12); for (let k = 0; k < 6; k++) part(new THREE.SphereGeometry(0.05, 6, 4), red, -w / 2 + 0.05 + k * (w - 0.1) / 5, -h / 2 - 0.02, -0.14); }
  };
  win(-W * 0.24, B + 1.25, -D / 2, 0);
  win(0, T + 0.55, -D / 2, 0, 0.6, 0.95, false);
  for (const sx of [-1, 1]) for (const zz of [-D * 0.22, D * 0.22]) win(sx * W / 2, B + 1.25, zz, -sx * Math.PI / 2);
  // cheminée
  const cx = W * 0.22, cz = D * 0.2, ch = T + RISE + 0.7;
  add(new THREE.BoxGeometry(0.55, ch - T, 0.55), stoneM, cx, T + (ch - T) / 2, cz);
  add(new THREE.BoxGeometry(0.7, 0.1, 0.7), dark, cx, ch + 0.05, cz);
  // tas de bois le long du mur
  const logG = new THREE.CylinderGeometry(0.11, 0.11, 0.9, 7).rotateX(Math.PI / 2), logC = cMat('woodpile', '#8a6240');
  for (let r = 0; r < 3; r++) for (let k = 0; k < 5 - r; k++) add(logG, logC, W / 2 + 0.25, B - 0.3 + 0.13 + r * 0.2, D * 0.05 + (k - (4 - r) / 2) * 0.23);
  g.userData.chimney = new THREE.Vector3(cx, ch + 0.15, cz);
  g.userData.size = [W, D];
  return g;
}
// ── pont de bois là où le sentier franchit la rivière
// ── ponts de bois là où le sentier franchit une rivière (un par tronçon traversé)
function buildBridgeIn(ch) {
  if (!river.on) return;
  const x0 = ch.cx * CHK, z0 = ch.cz * CHK;
  let best = 1e9, bz = 0;
  for (let z = z0; z < z0 + CHK; z += 0.5) {
    const px = pathX(z); if (px < x0 || px >= x0 + CHK) continue;
    const r = riverAt(px, z); if (r && r.fade > 0.7 && r.d < best) { best = r.d; bz = z; }
  }
  if (best > 1) return;
  const w = riverAt(pathX(bz), bz).w, half = w + 4.5;
  const dir = V(pathX(bz + 0.5) - pathX(bz - 0.5), 0, 1).normalize(), side = V(dir.z, 0, -dir.x);
  const c = V(pathX(bz), 0, bz), a = c.clone().addScaledVector(dir, -half), b = c.clone().addScaledVector(dir, half);
  const ya = height(a.x, a.z), yb = height(b.x, b.z), top = Math.max(ya, yb, WL + 1.1) + 0.35;
  const deckY = t => lerp(ya, yb, t) * (1 - Math.sin(Math.PI * t)) + top * Math.sin(Math.PI * t) + 0.08;
  const g = new THREE.Group(), plank = cMat('plank', '#9a7048', { proc: 'plank' }), beam = cMat('beam', '#6a4a30');
  const n = Math.round(half * 2 / 0.32), plankG = new THREE.BoxGeometry(2.2, 0.08, 0.28), postG = new THREE.BoxGeometry(0.1, 0.9, 0.1);
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = a.clone().lerp(b, t), y = deckY(t), m = new THREE.Mesh(plankG, plank);
    m.position.set(p.x, y, p.z); m.rotation.y = Math.atan2(side.x, side.z) + Math.PI / 2; m.castShadow = m.receiveShadow = true; g.add(m);
    if (i % 5 === 0) for (const sg of [-1, 1]) {
      const q = p.clone().addScaledVector(side, sg * 1.05), post = new THREE.Mesh(postG, beam);
      post.position.set(q.x, y + 0.45, q.z); post.castShadow = true; g.add(post);
    }
  }
  for (const sg of [-1, 1]) for (let i = 0; i < n; i += 5) {
    const t0 = i / n, t1 = Math.min(1, (i + 5) / n), p0 = a.clone().lerp(b, t0).addScaledVector(side, sg * 1.05), p1 = a.clone().lerp(b, t1).addScaledVector(side, sg * 1.05);
    p0.y = deckY(t0) + 0.85; p1.y = deckY(t1) + 0.85;
    const rail = new THREE.Mesh(cylBetween(p0, p1, 0.04, 0.04, col('#6a4a30'), 5), M.bark); rail.castShadow = true; g.add(rail);
  }
  for (const t of [0.3, 0.7]) {
    const p = a.clone().lerp(b, t);
    for (const sg of [-1, 1]) { const q = p.clone().addScaledVector(side, sg * 0.8); const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, deckY(t) - WL + 1.5, 7), beam); pile.position.set(q.x, (deckY(t) + WL - 1.5) / 2, q.z); g.add(pile); }
  }
  ch.group.add(g);
  bridges.push({ a, b, dir, side, half, deckY, ck: ch.key });
}
function onBridge(x, z) {   // hauteur du tablier si (x, z) est sur un pont
  for (const br of bridges) {
    const rel = V(x - br.a.x, 0, z - br.a.z), along = rel.dot(br.dir), across = rel.dot(br.side);
    if (along < -0.3 || along > br.half * 2 + 0.3 || Math.abs(across) > 1.0) continue;
    return br.deckY(clamp(along / (br.half * 2)));
  }
  return null;
}
// ── barques (pointus) amarrées dans les criques
const boats = [];
function makeBoat(vi) {
  const g = new THREE.BoxGeometry(2.4, 0.46, 0.92, 16, 3, 4), p = g.attributes.position, cols = new Float32Array(p.count * 3);
  const band = [col('#2f6db0'), col('#c8442e'), col('#2f8a6a')][vi % 3], white = col('#f2efe6'), red = col('#a83a2a'), wood = col('#9a6a42');
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const e = Math.abs(x) / 1.2, k = 1 - Math.pow(e, 2.2);
    const keel = y < 0 ? 0.35 + 0.65 * (y + 0.23) / 0.23 : 1;
    z *= Math.max(0.02, k) * keel;
    if (y > 0) y += Math.pow(e, 3) * 0.28;          // tonture : la proue et la poupe se relèvent
    p.setXYZ(i, x, y, z);
    const c = y > 0.13 ? band : y < -0.12 ? red : white;
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const grp = new THREE.Group(), m = cMat('boat', '#ffffff', {}, { vertexColors: true });
  const hull = new THREE.Mesh(g, m); hull.castShadow = hull.receiveShadow = true; grp.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 0.6), cMat('plank', '#9a6a42', { proc: 'plank' })); deck.position.y = 0.2; deck.castShadow = deck.receiveShadow = true; grp.add(deck);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.7), cMat('plank', '#7a5234', { proc: 'plank' })); bench.position.set(0.2, 0.26, 0); grp.add(bench);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.2, 6), cMat('mast', '#6a4a30')); mast.position.set(0.55, 0.75, 0); mast.castShadow = true; grp.add(mast);
  return grp;
}
// Voilier : coque bleu nuit à bande bordeaux, pont en planches, mât, bôme, voile triangulaire, fanion jaune à la poupe.
// L'avant regarde vers -z, comme le personnage.
function makeSignpost() {   // poteau et flèches de bois aux croisements
  const g = new THREE.Group(), wood = cMat('beam', '#6a4a30'), board = cMat('plank', '#b08658', { proc: 'plank' }), tip = cMat('tip', '#e8e0cc');
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.7, 7), wood); post.position.y = 0.85; post.castShadow = true; g.add(post);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.1, 7), wood); cap.position.y = 1.74; g.add(cap);
  const n = 2 + (Math.random() * 2 | 0);
  for (let i = 0; i < n; i++) {
    const arm = new THREE.Group(); arm.position.y = 1.5 - i * 0.22; arm.rotation.y = i * 2.1 + Math.random() * 0.8; g.add(arm);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.15, 0.035), board); b.position.x = 0.33; b.castShadow = true; arm.add(b);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.105, 0.14, 3).rotateZ(-Math.PI / 2).rotateX(Math.PI / 6), board); p.position.x = 0.71; arm.add(p);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.04), tip); stripe.position.set(0.3, 0, 0); arm.add(stripe);
  }
  return g;
}
function makeSailboat(vi = 0) {
  const grp = new THREE.Group(), L = 3.4, B = 1.2;
  const g = new THREE.BoxGeometry(B, 0.62, L, 6, 3, 18), p = g.attributes.position, cols = new Float32Array(p.count * 3);
  const navy = col(['#23314a', '#2c3a2e', '#3a2430'][vi % 3]), band = col('#7a2c2c'), rail = col('#9a7048');
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = z / (L / 2), bow = t < 0 ? 1 - Math.pow(-t, 1.7) : 1 - 0.32 * t * t;     // proue effilée, poupe à tableau
    const keel = y < 0 ? 0.3 + 0.7 * (y + 0.31) / 0.31 : 1;
    x *= Math.max(0.03, bow) * keel;
    if (y > 0) y += Math.pow(Math.max(0, -t), 2) * 0.22 + Math.max(0, t) * 0.04;            // tonture
    p.setXYZ(i, x, y, z);
    const c = y > 0.24 ? rail : y < -0.1 ? band : navy;
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const add = (geo, m, x = 0, y = 0, z = 0, parent = grp) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; parent.add(me); return me; };
  add(g, cMat('boat', '#ffffff', {}, { vertexColors: true }));
  // pont : planches épousant la forme de la coque
  const dg = new THREE.BoxGeometry(B * 0.86, 0.05, L * 0.9, 4, 1, 16), dp = dg.attributes.position;
  for (let i = 0; i < dp.count; i++) { const t = dp.getZ(i) / (L / 2), bow = t < 0 ? 1 - Math.pow(-t, 1.7) : 1 - 0.32 * t * t; dp.setX(i, dp.getX(i) * Math.max(0.05, bow)); }
  dg.computeVertexNormals();
  add(dg, cMat('plank', '#a87c50', { proc: 'plank' }), 0, 0.26, 0);
  add(new THREE.BoxGeometry(B * 0.7, 0.12, 0.22), cMat('plank', '#8a6040', { proc: 'plank' }), 0, 0.36, 0.55);   // banc
  const dark = cMat('mast', '#2a2622');
  add(new THREE.CylinderGeometry(0.045, 0.06, 3.4, 7), dark, 0, 1.95, -0.55);                                     // mât
  const pivot = new THREE.Group(); pivot.position.set(0, 0, -0.55); grp.add(pivot);                                // la voile et la bôme pivotent autour du mât
  add(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6).rotateX(Math.PI / 2), dark, 0, 0.62, 0.95, pivot);       // bôme
  // voile : triangle légèrement gonflé
  const sg = new THREE.BufferGeometry(), verts = [], idx = [], N = 6;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N - i; j++) {
    const a = i / N, b = j / N, y = 0.65 + a * 2.95, z = 0.02 + b * 1.85 * (1 - a * 0.05), bulge = Math.sin(Math.PI * b) * (1 - a) * 0.22;
    verts.push(bulge, y, z);
  }
  let o = 0; const row = []; for (let i = 0; i <= N; i++) { row.push(o); o += N - i + 1; }
  for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
    const a = row[i] + j, b = row[i] + j + 1, c = row[i + 1] + j; idx.push(a, b, c);
    if (j < N - i - 1) idx.push(b, row[i + 1] + j + 1, c);
  }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); sg.setIndex(idx); sg.computeVertexNormals();
  const sail = add(sg, cMat('sail', '#e8e4d8', {}, { side: THREE.DoubleSide }), 0, 0, 0, pivot);
  // fanion jaune sur un petit mât de poupe, safran et barre
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), dark, 0.35, 0.75, 1.5);
  const flag = add(new THREE.PlaneGeometry(0.24, 0.16).translate(0.12, 0, 0), cMat('flag', '#e8b830', {}, { side: THREE.DoubleSide }), 0.35, 1.12, 1.5);
  add(new THREE.BoxGeometry(0.05, 0.5, 0.35), dark, 0, -0.1, 1.78);
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 5).rotateX(Math.PI / 2 - 0.2), cMat('plank', '#8a6040', { proc: 'plank' }), 0, 0.42, 1.45);
  grp.userData = { pivot, flag, sail, ph: R(0, 6.28), sailing: false };
  return grp;
}
function updateBoats(t) {
  for (const b of boats) { if (b.userData.sailing) continue; const ph = b.userData.ph; if (b.userData.flag) b.userData.flag.rotation.y = Math.sin(t * 3 + ph) * 0.4; b.rotation.z = Math.sin(t * 0.9 + ph) * 0.04; b.rotation.x = Math.sin(t * 0.7 + ph * 2) * 0.05; b.position.y = WL - 0.02 + Math.sin(t * 1.1 + ph) * 0.03; }
}
const smokes = [];
function addSmoke(g) {
  const puffs = [];
  for (let k = 0; k < 7; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), smokeMat.clone()); m.castShadow = false; m.userData.ph = k / 7; g.add(m); puffs.push(m); }
  smokes.push({ g, puffs });
}
function updateSmoke(t, night) {
  for (const s of smokes) for (const m of s.puffs) {
    const f = (t * 0.12 + m.userData.ph) % 1, c = s.g.userData.chimney;
    m.position.set(c.x + f * 1.4 + Math.sin(t + m.userData.ph * 9) * 0.15, c.y + f * 3.2, c.z + f * 0.5);
    m.scale.setScalar(0.5 + f * 2.2);
    m.material.opacity = (1 - f) * smooth(0, 0.12, f) * 0.55;
    m.material.color.setScalar(night ? 0.55 : 0.88);
  }
}
const lantern = new THREE.PointLight(0xffa64a, 0, 12, 1.6);
lantern.position.set(0.35, 0.75, -0.25);
const lanternGlow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd08a }));
lanternGlow.position.copy(lantern.position);
player.add(lantern, lanternGlow);
scene.add(player);

const MOTES = 500;
const moteGeo = new THREE.BufferGeometry();
const moteP = new Float32Array(MOTES * 3), moteC = new Float32Array(MOTES * 3), moteSeed = new Float32Array(MOTES * 4);
for (let i = 0; i < MOTES; i++) { for (let k = 0; k < 4; k++) moteSeed[i * 4 + k] = Math.random(); }
moteGeo.setAttribute('position', new THREE.BufferAttribute(moteP, 3));
moteGeo.setAttribute('color', new THREE.BufferAttribute(moteC, 3));
const moteMat = new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const motes = new THREE.Points(moteGeo, moteMat); motes.frustumCulled = false;
scene.add(motes);
function updateMotes(t, p) {
  const n = Math.round(MOTES * p.motes.amount * 0.45); moteGeo.setDrawRange(0, n);
  moteMat.size = p.motes.size * Math.max(1, Math.round(1.6 / p.pixel)); moteMat.color.set(p.motes.color);
  const fire = p.motes.kind === 'fireflies';
  for (let i = 0; i < n; i++) {
    const s = moteSeed.subarray(i * 4, i * 4 + 4);
    const bx = (s[0] - 0.5) * 44, bz = (s[1] - 0.5) * 34;
    let x = camTarget.x + ((bx + Math.sin(t * 0.13 + s[2] * 20) * 2 - camTarget.x % 44 + 66) % 44 - 22);
    let z = camTarget.z + ((bz + Math.cos(t * 0.11 + s[3] * 20) * 2 - camTarget.z % 34 + 51) % 34 - 17);
    const y = height(x, z) + (fire ? 0.4 + s[2] * 2.2 : 0.6 + s[3] * 6) + Math.sin(t * 0.5 + s[0] * 30) * 0.4;
    moteP[i * 3] = x; moteP[i * 3 + 1] = y; moteP[i * 3 + 2] = z;
    const b = fire ? Math.pow(Math.max(0, Math.sin(t * (0.6 + s[3]) + s[1] * 40)), 6) : 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * (0.8 + s[2] * 1.5) + s[0] * 50)), 3);
    moteC[i * 3] = moteC[i * 3 + 1] = moteC[i * 3 + 2] = b * 0.6;
  }
  moteGeo.attributes.position.needsUpdate = true; moteGeo.attributes.color.needsUpdate = true;
}

// ════════════════════════════════════════════════════════════════════
//  Post-traitement : étalonnage → dithering/palette → tilt-shift → upscale
// ════════════════════════════════════════════════════════════════════
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; postScene.add(quad);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const gradeMat = new THREE.ShaderMaterial({
  uniforms: {
    tCol: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2() }, near: { value: 1 }, far: { value: 260 },
    exposure: { value: 1 }, contrast: { value: 1 }, saturation: { value: 1 }, shadowTint: { value: new THREE.Vector3() }, highTint: { value: new THREE.Vector3() },
    levels: { value: 0 }, dither: { value: 0 }, outline: { value: 0 }, pal: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) }, palN: { value: 0 },
    bloom: { value: 0 },
    tRays: { value: null }, pS: U.uPlayerS, rR: U.uRevealR, rays: { value: 0 }, rayCol: { value: new THREE.Color() },
  },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tCol, tDepth; uniform vec2 res; uniform float near, far;
    uniform float exposure, contrast, saturation, levels, dither, outline, bloom;
    uniform vec3 shadowTint, highTint; uniform vec3 pal[16]; uniform int palN;
    uniform sampler2D tRays; uniform vec3 rayCol; uniform float rays; uniform vec3 pS; uniform float rR;
    varying vec2 vUv;
    float lin(float d){ float z = d*2.-1.; return 2.*near*far/(far+near-z*(far-near)); }
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4))-0.055, step(0.0031308, c)); }
    const float B[16] = float[](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    void main(){
      vec2 px = 1./res;
      vec3 c = texture2D(tCol, vUv).rgb;
      // contours : on assombrit le pixel s'il est devant un voisin nettement plus loin
      if (outline > 0.) {
        float d = lin(texture2D(tDepth, vUv).r);
        float e = 0.;
        e = max(e, lin(texture2D(tDepth, vUv+vec2(px.x,0)).r) - d);
        e = max(e, lin(texture2D(tDepth, vUv-vec2(px.x,0)).r) - d);
        e = max(e, lin(texture2D(tDepth, vUv+vec2(0,px.y)).r) - d);
        e = max(e, lin(texture2D(tDepth, vUv-vec2(0,px.y)).r) - d);
        float edge = smoothstep(0.02, 0.06, e / d) * smoothstep(rR * 0.7, rR * 1.1, length(gl_FragCoord.xy - pS.xy));
        c *= 1. - outline * edge * 0.5;
      }
      ivec2 ip = ivec2(mod(gl_FragCoord.xy, 4.));
      float bay = (B[ip.x + ip.y*4] + 0.5) / 16. - 0.5;
      // rayons de lumière (calculés en quart de résolution dans raysMat)
      if (rays > 0.) c += rayCol * texture2D(tRays, vUv).r * rays * 0.007;
      // halo doux sur les hautes lumières
      if (bloom > 0.) {
        vec3 s = vec3(0.);
        for (int i=0;i<8;i++){ float a = float(i)*0.785; s += max(texture2D(tCol, vUv + vec2(cos(a),sin(a))*px*3.).rgb - 0.9, 0.); }
        c += s/8. * bloom;
      }
      c = aces(c * exposure);
      c = toSRGB(c);
      float l = dot(c, vec3(.299,.587,.114));
      c += shadowTint * (1.-l)*(1.-l) + highTint * l*l;
      c = (c - 0.5) * contrast + 0.5;
      l = dot(c, vec3(.299,.587,.114));
      c = mix(vec3(l), c, saturation);
      if (palN > 0) {
        c += bay * dither * 0.16;
        float best = 1e9; vec3 bc = c;
        for (int i=0;i<16;i++){ if (i>=palN) break; vec3 d = (pal[i]-c)*vec3(.9,1.2,.7); float dd = dot(d,d); if (dd<best){best=dd;bc=pal[i];} }
        c = bc;
      } else if (levels > 0.) {
        c += bay * dither / levels;
        c = floor(c * levels + 0.5) / levels;
      }
      gl_FragColor = vec4(clamp(c,0.,1.), 1.);
    }`,
  depthTest: false, depthWrite: false,
});
// Rayons volumétriques : marche dans l'air sous la canopée en testant la shadow map (quart de résolution)
const raysMat = new THREE.ShaderMaterial({
  uniforms: {
    tDepth: { value: null }, tShadow: { value: null }, shadowMat: { value: new THREE.Matrix4() }, invPV: { value: new THREE.Matrix4() },
    camPos: { value: new THREE.Vector3() }, groundY: { value: 0 }, uTime: { value: 0 },
  },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tDepth, tShadow; uniform mat4 shadowMat, invPV; uniform vec3 camPos; uniform float groundY, uTime;
    varying vec2 vUv;
    #include <packing>
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
    float litAt(vec3 p){
      vec4 sc = shadowMat * vec4(p, 1.); sc.xyz /= sc.w;
      if (sc.x < 0. || sc.x > 1. || sc.y < 0. || sc.y > 1. || sc.z > 1.) return 1.;
      return step(sc.z - 0.003, unpackRGBAToDepth(texture2D(tShadow, sc.xy)));
    }
    const float B[16] = float[](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    void main(){
      ivec2 ip = ivec2(mod(gl_FragCoord.xy, 4.));
      float bay = (B[ip.x + ip.y*4] + 0.5) / 16. - 0.5;
      float dz = texture2D(tDepth, vUv).r;
      vec4 wp4 = invPV * vec4(vUv*2.-1., dz*2.-1., 1.); vec3 wp = wp4.xyz / wp4.w;
      vec3 rd = wp - camPos; float L = length(rd); rd /= L;
      float yHi = groundY + 10., yLo = groundY - 3.;
      float t0 = rd.y < 0. ? max(0., (camPos.y - yHi) / -rd.y) : 0.;
      float t1 = rd.y < 0. ? min(L, (camPos.y - yLo) / -rd.y) : L;
      float acc = 0.;
      if (t1 > t0) {
        const int N = 18; float st = (t1 - t0) / float(N);
        for (int i = 0; i < N; i++) {
          vec3 q = camPos + rd * (t0 + (float(i) + bay + 0.5) * st);
          float dens = 0.04 + pow(vn(q.xz*0.22 + vec2(q.y*0.3, uTime*0.08)), 2.) * vn(q.xz*0.05 - uTime*0.02) * 2.8;
          acc += litAt(q) * dens * smoothstep(yHi, yHi - 4., q.y);
        }
        acc *= st;
      }
      gl_FragColor = vec4(acc, 0., 0., 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const blurMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() }, res: { value: new THREE.Vector2() }, focus: { value: 0.45 }, band: { value: 0.22 }, maxR: { value: 4 } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D t; uniform vec2 dir, res; uniform float focus, band, maxR; varying vec2 vUv;
    void main(){
      float k = smoothstep(band, band + 0.32, abs(vUv.y - focus));
      float r = k * k * maxR;
      if (r < 0.15) { gl_FragColor = texture2D(t, vUv); return; }
      vec3 s = vec3(0.); float w = 0.;
      for (int i=-6;i<=6;i++){ float f = float(i)/6.; float g = exp(-f*f*2.); s += texture2D(t, vUv + dir*f*r/res).rgb*g; w += g; }
      gl_FragColor = vec4(s/w, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const finalMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: null }, res: { value: new THREE.Vector2() }, off: { value: new THREE.Vector2() }, vig: { value: 0.3 } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D t; uniform vec2 res, off; uniform float vig; varying vec2 vUv;
    void main(){
      vec2 uv = vUv + off/res;
      uv = (floor(uv*res) + 0.5) / res;
      vec3 c = texture2D(t, uv).rgb;
      vec2 q = vUv - 0.5; c *= 1. - vig * dot(q,q) * 1.8;
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false, depthWrite: false,
});

const RTS = new Map();
function targets(w, h) {
  const k = w + 'x' + h; if (RTS.has(k)) return RTS.get(k);
  const opt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const sceneRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(w, h) });
  const T = { scene: sceneRT, a: new THREE.WebGLRenderTarget(w, h, opt), b: new THREE.WebGLRenderTarget(w, h, opt), c: new THREE.WebGLRenderTarget(w, h, opt),
    r: new THREE.WebGLRenderTarget(Math.max(16, w >> 2), Math.max(16, h >> 2), { ...opt, type: THREE.HalfFloatType }) };
  if (RTS.size > 12) { for (const v of RTS.values()) Object.values(v).forEach(r => r.dispose()); RTS.clear(); }
  RTS.set(k, T); return T;
}

// ════════════════════════════════════════════════════════════════════
//  Styles (presets)
// ════════════════════════════════════════════════════════════════════
const v3 = (a, b, c) => new THREE.Vector3(a, b, c);
const hexPal = (arr) => arr.map(h => { const c = new THREE.Color(h); c.convertLinearToSRGB(); return v3(c.r, c.g, c.b); });
const PRESETS = [
  { id: 'clairiere', name: 'Clairière', sunAz: 140, sunEl: 52, sunCol: '#fff0cf', sunInt: 3.4, sky: '#a4cdf5', gnd: '#6f8040', hemiInt: 1.7,
    fog: '#a9c3b0', fogD: 0, exposure: 0.92, contrast: 1.05, saturation: 0.95, shadowTint: v3(-0.03, 0.015, 0.045), highTint: v3(0.05, 0.035, -0.02),
    pixel: 1, levels: 0, dither: 0, outline: 0.8, tilt: 1, cloud: 0.3, wind: 1, bloom: 0, vig: 0.25,
    motes: { amount: 0.35, color: '#fff2b8', size: 1, kind: 'dust' }, lantern: 0, rays: 0.6 },
  { id: 'doree', name: 'Heure dorée', sunAz: 245, sunEl: 24, sunCol: '#ffb465', sunInt: 5.2, sky: '#8a9ee0', gnd: '#6a5034', hemiInt: 1.25,
    fog: '#e6b88a', fogD: 0.003, exposure: 1.05, contrast: 1.08, saturation: 1.2, shadowTint: v3(0.0, -0.01, 0.05), highTint: v3(0.08, 0.03, -0.05),
    pixel: 1, levels: 0, dither: 0, outline: 0.5, tilt: 1, cloud: 0, wind: 0.7, bloom: 0.6, vig: 0.35,
    motes: { amount: 0.4, color: '#ffd27a', size: 1, kind: 'dust' }, lantern: 0, rays: 1.5 },
  { id: 'brume', name: 'Brume du matin', sunAz: 100, sunEl: 28, sunCol: '#fff6e6', sunInt: 1.9, sky: '#d2e2ec', gnd: '#6f7d5a', hemiInt: 1.7,
    fog: '#cbdbd6', fogD: 0.0085, exposure: 1.05, contrast: 0.9, saturation: 0.82, shadowTint: v3(0.0, 0.02, 0.05), highTint: v3(0.03, 0.03, 0.02),
    pixel: 1, levels: 20, dither: 0.7, outline: 0.25, tilt: 1.25, cloud: 0, wind: 0.4, bloom: 0.3, vig: 0.2,
    motes: { amount: 0.25, color: '#ffffff', size: 1, kind: 'dust' }, lantern: 0, rays: 1.4 },
  { id: 'palette', name: 'Palette 16', sunAz: 140, sunEl: 48, sunCol: '#fff0cf', sunInt: 3.6, sky: '#9cc6ff', gnd: '#5a6a30', hemiInt: 1.2,
    fog: '#a9c3b0', fogD: 0, exposure: 1.05, contrast: 1.05, saturation: 1.1, shadowTint: v3(-0.02, 0.0, 0.05), highTint: v3(0.04, 0.03, -0.02),
    pixel: 1, levels: 0, dither: 1, outline: 0.7, tilt: 0.8, cloud: 0.3, wind: 1, bloom: 0, vig: 0.15,
    palette: hexPal(['#14181a', '#1f3328', '#2b4a2c', '#3c6a32', '#5a8c38', '#86b246', '#bcd862', '#eef2b0', '#f6efd8', '#c9ad7c', '#9a6c42', '#64432a', '#3c2a22', '#4f6f8a', '#8fb4c8', '#d8873c']),
    motes: { amount: 0.3, color: '#fff2b8', size: 1, kind: 'dust' }, lantern: 0, rays: 0.5 },
  { id: 'gouache', name: 'Gouache', sunAz: 160, sunEl: 60, sunCol: '#fff4dc', sunInt: 3.9, sky: '#8ed0ff', gnd: '#4c6a2a', hemiInt: 1.1,
    fog: '#a9c3b0', fogD: 0, exposure: 1.0, contrast: 1.18, saturation: 1.35, shadowTint: v3(-0.04, 0.02, 0.08), highTint: v3(0.06, 0.05, -0.04),
    pixel: 1, levels: 10, dither: 0.25, outline: 1, tilt: 0.7, cloud: 0.45, wind: 1, bloom: 0, vig: 0.3,
    motes: { amount: 0.1, color: '#ffffff', size: 1, kind: 'dust' }, lantern: 0, rays: 0.4 },
  { id: 'lanterne', name: 'Lanterne', sunAz: 300, sunEl: 35, sunCol: '#8fa8ff', sunInt: 1.1, sky: '#3a4f96', gnd: '#1c2028', hemiInt: 0.9,
    fog: '#17203a', fogD: 0.006, exposure: 1.3, contrast: 1.05, saturation: 0.95, shadowTint: v3(0.0, 0.01, 0.07), highTint: v3(0.07, 0.03, -0.03),
    pixel: 1, levels: 0, dither: 0, outline: 0.4, tilt: 1, cloud: 0, wind: 0.5, bloom: 1.0, vig: 0.5,
    motes: { amount: 0.6, color: '#d6ff6a', size: 1, kind: 'fireflies' }, lantern: 9, rays: 0.8 },
];
PRESETS.forEach(p => { p.reveal = 1; p.bump = 1.3; });
const BASE = PRESETS.map(p => structuredClone({ ...p, palette: undefined }));
let cur = PRESETS[0], planche = false;

// ── Cycle jour/nuit : images-clés d'éclairage interpolées selon l'heure
const DAY = [
  { h: 0,    sunCol: '#8fa8ff', sunInt: 1.0, sky: '#33468a', gnd: '#1a1e26', hemiInt: 0.85, fog: '#17203a', fogD: 0.006, exposure: 1.3,  shadowTint: [0, 0.01, 0.07],  highTint: [0.05, 0.03, -0.02], lantern: 9, bloom: 1.0, rays: 0.8, moteAmt: 0.6 },
  { h: 5.2,  sunCol: '#8fa8ff', sunInt: 0.5, sky: '#3a4a8a', gnd: '#20222a', hemiInt: 0.8,  fog: '#262c4a', fogD: 0.007, exposure: 1.3,  shadowTint: [0, 0.01, 0.07],  highTint: [0.05, 0.03, -0.02], lantern: 9, bloom: 0.8, rays: 0.6, moteAmt: 0.4 },
  { h: 6.0,  sunCol: '#ff9466', sunInt: 0.5, sky: '#8f8fca', gnd: '#4a4038', hemiInt: 0.95, fog: '#d6b8bc', fogD: 0.012, exposure: 1.2,  shadowTint: [0.02, -0.01, 0.07], highTint: [0.08, 0.02, -0.03], lantern: 5, bloom: 0.6, rays: 1.6, moteAmt: 0.3 },
  { h: 7.5,  sunCol: '#ffd8a6', sunInt: 2.8, sky: '#b4d0ec', gnd: '#5e6a46', hemiInt: 1.45, fog: '#cbdbd6', fogD: 0.006, exposure: 1.0,  shadowTint: [-0.01, 0.015, 0.05], highTint: [0.05, 0.03, -0.02], lantern: 0, bloom: 0.3, rays: 1.5, moteAmt: 0.4 },
  { h: 12,   sunCol: '#fff2d6', sunInt: 3.5, sky: '#a4cdf5', gnd: '#6f8040', hemiInt: 1.7,  fog: '#a9c3b0', fogD: 0.0,   exposure: 0.92, shadowTint: [-0.03, 0.015, 0.045], highTint: [0.05, 0.035, -0.02], lantern: 0, bloom: 0, rays: 0.6, moteAmt: 0.35 },
  { h: 16.5, sunCol: '#ffe6bc', sunInt: 3.6, sky: '#9cc2f0', gnd: '#6f7a40', hemiInt: 1.6,  fog: '#b8c6ae', fogD: 0.0,   exposure: 0.95, shadowTint: [-0.02, 0.01, 0.05], highTint: [0.06, 0.035, -0.03], lantern: 0, bloom: 0.1, rays: 0.8, moteAmt: 0.35 },
  { h: 18.6, sunCol: '#ffb062', sunInt: 5.0, sky: '#8a9ee0', gnd: '#6a5034', hemiInt: 1.25, fog: '#e6b88a', fogD: 0.003, exposure: 1.05, shadowTint: [0, -0.01, 0.05],  highTint: [0.08, 0.03, -0.05], lantern: 0, bloom: 0.6, rays: 1.3, moteAmt: 0.45 },
  { h: 19.8, sunCol: '#ff6a48', sunInt: 0.6, sky: '#5a5aa0', gnd: '#302830', hemiInt: 0.95, fog: '#4a3858', fogD: 0.005, exposure: 1.2,  shadowTint: [0.02, -0.01, 0.08], highTint: [0.08, 0.02, -0.03], lantern: 6, bloom: 0.8, rays: 0.5, moteAmt: 0.4 },
  { h: 20.6, sunCol: '#8fa8ff', sunInt: 0.5, sky: '#34447e', gnd: '#1c1f28', hemiInt: 0.8,  fog: '#1b2240', fogD: 0.006, exposure: 1.3,  shadowTint: [0, 0.01, 0.07],  highTint: [0.05, 0.03, -0.02], lantern: 9, bloom: 1.0, rays: 0.6, moteAmt: 0.5 },
  { h: 24,   sunCol: '#8fa8ff', sunInt: 1.0, sky: '#33468a', gnd: '#1a1e26', hemiInt: 0.85, fog: '#17203a', fogD: 0.006, exposure: 1.3,  shadowTint: [0, 0.01, 0.07],  highTint: [0.05, 0.03, -0.02], lantern: 9, bloom: 1.0, rays: 0.8, moteAmt: 0.6 },
];
const cycle = { on: false, run: true, hour: 9, minutes: 4 };
const _ca = new THREE.Color(), _cb = new THREE.Color();
function dayLight(h) {
  h = ((h % 24) + 24) % 24;
  let i = 0; while (DAY[i + 1].h < h) i++;
  const A = DAY[i], B = DAY[i + 1], t = smooth(0, 1, (h - A.h) / (B.h - A.h));
  const n = k => lerp(A[k], B[k], t);
  const c = k => '#' + _ca.set(A[k]).lerp(_cb.set(B[k]), t).getHexString();
  const v = k => v3(...A[k].map((x, j) => lerp(x, B[k][j], t)));
  const out = { sunCol: c('sunCol'), sunInt: n('sunInt'), sky: c('sky'), gnd: c('gnd'), hemiInt: n('hemiInt'), fog: c('fog'), fogD: n('fogD'),
    exposure: n('exposure'), shadowTint: v('shadowTint'), highTint: v('highTint'), lantern: n('lantern'), bloom: n('bloom'), rays: n('rays') };
  const night = h < 5.6 || h > 20.2;
  out.motes = night ? { amount: n('moteAmt'), color: '#d6ff6a', size: 1, kind: 'fireflies' } : { amount: n('moteAmt'), color: h < 9 || h > 17.5 ? '#ffd27a' : '#fff2b8', size: 1, kind: 'dust' };
  if (!night) { // soleil : lever à l'est 6h, coucher à l'ouest 20h
    const s = (h - 6) / 14; out.sunAz = 80 + s * 200; out.sunEl = Math.max(5, Math.sin(Math.PI * clamp(s)) * 62);
  } else {     // lune
    const m = ((h - 20.2 + 24) % 24) / 9.4; out.sunAz = 100 + m * 160; out.sunEl = Math.max(12, Math.sin(Math.PI * clamp(m)) * 52);
  }
  return out;
}
const withDay = p => cycle.on ? { ...p, ...dayLight(cycle.hour), fogD: Math.max(dayLight(cycle.hour).fogD, p.fogD * 0.35), rays: dayLight(cycle.hour).rays * ((p.rays ?? 1) / 0.6) * 0.6 } : p;

const sunDir = new THREE.Vector3();
function applyPreset(p) {
  const az = THREE.MathUtils.degToRad(p.sunAz), el = THREE.MathUtils.degToRad(p.sunEl);
  sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
  sun.color.set(p.sunCol); sun.intensity = p.sunInt;
  hemi.color.set(p.sky); hemi.groundColor.set(p.gnd); hemi.intensity = p.hemiInt;
  U.uSky.value.set(p.sky);
  scene.fog.color.set(p.fog); scene.fog.density = p.fogD;
  scene.background = scene.fog.color;
  U.uCloud.value = p.cloud; U.uWind.value = p.wind;
  winMat.emissiveIntensity = clamp((2.2 - p.sunInt) / 1.6) * 1.8;
  lantern.intensity = p.lantern; lanternGlow.visible = p.lantern > 0;
  const G = gradeMat.uniforms;
  G.exposure.value = p.exposure; G.contrast.value = p.contrast; G.saturation.value = p.saturation;
  G.shadowTint.value.copy(p.shadowTint); G.highTint.value.copy(p.highTint);
  G.levels.value = p.levels; G.dither.value = p.dither; G.outline.value = p.outline; G.bloom.value = p.bloom;
  G.palN.value = p.palette ? p.palette.length : 0;
  if (p.palette) p.palette.forEach((c, i) => G.pal.value[i].copy(c));
  finalMat.uniforms.vig.value = p.vig;
  G.rays.value = p.rays || 0;
  U.uReveal.value = p.reveal ?? 0.55;
  U.uBump.value = p.bump ?? 0.9;
  G.rayCol.value.set(p.sunCol).multiplyScalar(p.sunInt);
}

// ════════════════════════════════════════════════════════════════════
//  Caméra (snapping pixel-perfect) & ombres stables
// ════════════════════════════════════════════════════════════════════
let camYaw = 0.35, camYawT = 0.35, camDist = 34, camDistT = 34, camPitch = 0.98, camPitchT = 0.98;
let camFree = false;
const camTarget = new THREE.Vector3(), camFocus = new THREE.Vector3();
const _r = new THREE.Vector3(), _u = new THREE.Vector3();
function placeCamera(lh) {
  const off = V(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch)).multiplyScalar(camDist);
  camera.position.copy(camTarget).add(off); if (!ASSETS) camera.position.y = Math.max(camera.position.y, height(camera.position.x, camera.position.z) + 1.2); camera.lookAt(camTarget); camera.updateMatrixWorld();
  _r.setFromMatrixColumn(camera.matrixWorld, 0); _u.setFromMatrixColumn(camera.matrixWorld, 1);
  const wpp = 2 * camDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / lh;
  const pr = camera.position.dot(_r), pu = camera.position.dot(_u);
  const sr = Math.round(pr / wpp) * wpp, su = Math.round(pu / wpp) * wpp;
  camera.position.addScaledVector(_r, sr - pr).addScaledVector(_u, su - pu); camera.updateMatrixWorld();
  // ombres : on cale la cible du soleil sur la grille de texels de la shadow map
  const fwd = V(Math.sin(camYaw), 0, Math.cos(camYaw)).multiplyScalar(-4);
  const tgt = camTarget.clone().add(fwd);
  const texel = 2 * SH / sun.shadow.mapSize.x;
  const lr = V(0, 1, 0).cross(sunDir).normalize(), lu = sunDir.clone().cross(lr).normalize();
  const a = tgt.dot(lr), b = tgt.dot(lu), c = tgt.dot(sunDir);
  tgt.copy(lr).multiplyScalar(Math.round(a / texel) * texel).addScaledVector(lu, Math.round(b / texel) * texel).addScaledVector(sunDir, c);
  sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(sunDir, 70);
  sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
  return [(pr - sr) / wpp, (pu - su) / wpp];
}

const _pp = new THREE.Vector3(), _pv = new THREE.Vector3();
function renderView(p, x, y, w, h, t) {
  applyPreset(p);
  updateMotes(t, p);
  const lw = Math.max(32, Math.round(w / p.pixel)), lh = Math.max(32, Math.round(h / p.pixel));
  const T = targets(lw, lh);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const [ox, oy] = placeCamera(lh);
  { // position écran du personnage (pixels de la cible basse résolution) pour la transparence
    const pp = _pp.copy(player.position); pp.y += 0.7;
    const vz = _pv.copy(pp).applyMatrix4(camera.matrixWorldInverse).z;
    pp.project(camera);
    U.uPlayerS.value.set((pp.x * 0.5 + 0.5) * lw, (pp.y * 0.5 + 0.5) * lh, -vz);
    U.uRevealR.value = 2.1 / (2 * camDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / lh);
  }
  // la shadow map coûte cher : on la recalcule une image sur deux, sauf si le soleil ou le cadrage ont bougé
  const moved = _lastSun.distanceToSquared(sunDir) > 1e-7 || _lastTgt.distanceToSquared(sun.target.position) > 1e-6;
  renderer.shadowMap.needsUpdate = planche || forceShadow || moved || (frameNo & 1) === 0;
  _lastSun.copy(sunDir); _lastTgt.copy(sun.target.position);
  renderer.setRenderTarget(T.scene); renderer.render(scene, camera);
  const G = gradeMat.uniforms;
  G.tCol.value = T.scene.texture; G.tDepth.value = T.scene.depthTexture; G.res.value.set(lw, lh);
  G.near.value = camera.near; G.far.value = camera.far;
  if (!sun.shadow.map) G.rays.value = 0;
  if (G.rays.value > 0) {
    const RU = raysMat.uniforms;
    RU.tDepth.value = T.scene.depthTexture; RU.tShadow.value = sun.shadow.map.texture; RU.shadowMat.value.copy(sun.shadow.matrix);
    RU.invPV.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
    RU.camPos.value.copy(camera.position); RU.groundY.value = camTarget.y; RU.uTime.value = t;
    quad.material = raysMat; renderer.setRenderTarget(T.r); renderer.render(postScene, postCam);
    G.tRays.value = T.r.texture;
  }
  quad.material = gradeMat; renderer.setRenderTarget(T.a); renderer.render(postScene, postCam);
  let src = T.a;
  if (p.tilt > 0) {
    const B = blurMat.uniforms; B.res.value.set(lw, lh); B.maxR.value = 4.5 * p.tilt * 3 / p.pixel; B.band.value = 0.2 / Math.max(0.6, p.tilt);
    quad.material = blurMat;
    B.t.value = T.a.texture; B.dir.value.set(1, 0); renderer.setRenderTarget(T.b); renderer.render(postScene, postCam);
    B.t.value = T.b.texture; B.dir.value.set(0, 1); renderer.setRenderTarget(T.c); renderer.render(postScene, postCam);
    src = T.c;
  }
  const F = finalMat.uniforms; F.t.value = src.texture; F.res.value.set(lw, lh); F.off.value.set(ox, oy);
  quad.material = finalMat;
  renderer.setRenderTarget(null);
  renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true);
  renderer.render(postScene, postCam);
}

// ════════════════════════════════════════════════════════════════════
//  Déplacements
// ════════════════════════════════════════════════════════════════════
const keys = new Set();
let moveTo = null, walkT = 0, stroll = false, strollDir = -1, avoidSide = 1, avoidT = 0, steerX = 0, steerZ = 0;
addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup', e => keys.delete(e.code));
canvas.addEventListener('wheel', e => { camDistT = clamp(camDistT * (1 + e.deltaY * 0.001), 18, 75); e.preventDefault(); }, { passive: false });
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
// ── caméra : glisser = tourner autour du personnage (gauche/droite) et l'incliner (haut/bas) · pincer = zoom
const ptrs = new Map();
let drag = null, pinch0 = 0;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (planche) return;
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) drag = { x0: e.clientX, y0: e.clientY, moved: false, orbit: e.button === 2 || e.shiftKey || e.altKey };
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); if (drag) drag.moved = true; }
});
canvas.addEventListener('pointermove', e => {
  const pp = ptrs.get(e.pointerId); if (!pp || !drag) return;
  const dx = e.clientX - pp.x, dy = e.clientY - pp.y;
  if (ptrs.size === 2) {
    // deux doigts : pincer pour zoomer, glisser pour orbiter
    pp.x = e.clientX; pp.y = e.clientY;
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0 > 0) camDistT = clamp(camDistT * pinch0 / d, 14, 80); pinch0 = d;
    camYawT -= dx * 0.004; camPitchT = clamp(camPitchT + dy * 0.003, 0.18, 1.45);
    return;
  }
  pp.x = e.clientX; pp.y = e.clientY;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
  drag.moved = true; canvas.style.cursor = 'grabbing';
  camYawT -= dx * 0.006; camPitchT = clamp(camPitchT + dy * 0.004, 0.18, 1.45);
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (ptrs.size === 0) {
    if (drag && !drag.moved && e.button === 0) {
      ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(groundMeshes, false)[0];
      if (hit && !sail.boat) { moveTo = hit.point.clone(); follow(); if (stroll) setStroll(false); }
    }
    drag = null; canvas.style.cursor = '';
  }
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
function follow() { camFree = false; showFollow(); }
function showFollow() { const b = document.getElementById('follow'); if (b) b.style.display = camFree ? '' : 'none'; }
const jump = { y: 0, v: 0 };
function doJump() { if (jump.y === 0 && !sail.boat) jump.v = 5.2; }
addEventListener('keydown', e => { if (e.code === 'Space' && e.target.tagName !== 'INPUT') { follow(); doJump(); e.preventDefault(); } });
{ const jb = document.getElementById('jumpBtn'); if (jb) { if (matchMedia('(pointer:coarse)').matches) jb.style.display = ''; jb.onpointerdown = e => { e.preventDefault(); doJump(); }; } }
function blocked(x, z) {
  if (onBridge(x, z) !== null) return false;
  if (height(x, z) < WL - 0.35) return true; // eau trop profonde
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const l = treeGrid.get(`${Math.floor(x / 4) + i},${Math.floor(z / 4) + j}`); if (!l) continue;
    for (const t of l) if (Math.hypot(t.x - x, t.z - z) < t.r + 0.3) return true;
  }
  return false;
}
// ── navigation : monter à bord, barrer, débarquer
const sail = { boat: null, speed: 0, turn: 0, wakeT: 0 };
const wakeRings = [];
const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false, fog: false });
const boatBtn = document.getElementById('boatBtn');
function nearestBoat(r = 3.2) { let best = null, bd = r; for (const b of boats) { const d = Math.hypot(b.position.x - player.position.x, b.position.z - player.position.z); if (d < bd) { bd = d; best = b; } } return best; }
function landNear(x, z, rMax = 9) {
  for (let r = 1.5; r <= rMax; r += 0.75) for (let a = 0; a < 6.28; a += 0.4) { const tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r; if (height(tx, tz) > WL + 0.12 && !blocked(tx, tz)) return [tx, tz]; }
  return null;
}
function toggleBoat() {
  if (sail.boat) {   // débarquer
    const b = sail.boat, land = landNear(b.position.x, b.position.z); if (!land) return;
    b.userData.sailing = false; sail.boat = null; sail.speed = 0;
    player.position.set(land[0], height(land[0], land[1]), land[1]); player.rotation.x = player.rotation.z = 0;
    return;
  }
  const b = nearestBoat(); if (!b) return;
  // le bateau quitte son tronçon : il ne sera plus déchargé, on peut l'emmener partout
  if (b.parent !== scene) { const wp = new THREE.Vector3(); b.getWorldPosition(wp); b.parent.remove(b); scene.add(b); b.position.copy(wp); }
  for (const ch of chunks.values()) if (ch.boats) { const i = ch.boats.indexOf(b); if (i >= 0) ch.boats.splice(i, 1); }
  b.userData.sailing = true; sail.boat = b; sail.speed = 0; moveTo = null; if (stroll) setStroll(false);
}
boatBtn.onclick = toggleBoat;
addEventListener('keydown', e => { if ((e.code === 'Enter' || e.code === 'NumpadEnter') && e.target.tagName !== 'INPUT') toggleBoat(); });
function updateSailing(dt, ix, iz) {
  const b = sail.boat, ud = b.userData;
  let heading = b.rotation.y;
  // cap voulu : la direction pressée, relative à la caméra ; vitesse avec inertie
  if (ix || iz) {
    const want = Math.atan2(-ix, -iz);   // rotation.y telle que -z (l'avant) pointe vers (ix, iz)
    let da = want - heading; da = Math.atan2(Math.sin(da), Math.cos(da));
    // le bateau se tourne franchement vers la flèche pressée, puis accélère une fois aligné
    sail.turn += (clamp(da * 3, -2.4, 2.4) - sail.turn) * Math.min(1, dt * 6);
    sail.speed = Math.min(5.5, sail.speed + dt * 3 * Math.max(0, Math.cos(da)));
    sail.push = true;
  } else { sail.turn *= Math.pow(0.02, dt); sail.push = false; }
  sail.speed *= Math.pow(0.55, dt);
  heading += sail.turn * dt;
  const fx = -Math.sin(heading), fz = -Math.cos(heading);
  const nx = b.position.x + fx * sail.speed * dt, nz = b.position.z + fz * sail.speed * dt;
  // échouage : on s'arrête si l'avant touche le fond
  if (height(nx + fx * 1.7, nz + fz * 1.7) > WL - 0.28) {
    // on touche le rivage en poussant vers la terre : on débarque tout seul
    if (sail.push && (sail.land || landNear(b.position.x, b.position.z))) { sail.speed = 0; toggleBoat(); return; }
    sail.speed *= -0.25;
  }
  else { b.position.x = nx; b.position.z = nz; }
  const t = performance.now() / 1000;
  b.rotation.set(Math.sin(t * 1.1 + ud.ph) * 0.03 - sail.speed * 0.008, heading, -sail.turn * 0.12 + Math.sin(t * 0.8 + ud.ph) * 0.03, 'YXZ');
  b.position.y = WL - 0.03 + Math.sin(t * 1.3 + ud.ph) * 0.04;
  ud.pivot.rotation.y = clamp(-sail.turn * 0.6, -0.9, 0.9) + Math.sin(t * 0.7) * 0.05;
  ud.flag.rotation.y = 0.6 + Math.sin(t * 6) * 0.25;
  // le personnage est assis à la barre
  const sx = Math.sin(heading), sz = Math.cos(heading);
  player.position.set(b.position.x + sx * 0.95, b.position.y + 0.34, b.position.z + sz * 0.95);
  player.rotation.set(0, heading, b.rotation.z * 0.8, 'YXZ');
  // sillage : des ronds qui s'élargissent derrière la poupe
  sail.wakeT -= dt;
  if (sail.speed > 0.8 && sail.wakeT <= 0) {
    sail.wakeT = 0.18;
    let r = wakeRings.find(w => w.life <= 0);
    if (!r) { if (wakeRings.length < 40) { const m = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 28).rotateX(-Math.PI / 2), wakeMat.clone()); scene.add(m); r = { m, life: 0 }; wakeRings.push(r); } else r = wakeRings[0]; }
    r.life = 1; r.m.position.set(b.position.x + sx * 1.8, WL + 0.03, b.position.z + sz * 1.8); r.m.visible = true;
  }
  U.uPW.value.set(b.position.x, b.position.z, Math.min(1, sail.speed / 3), 0);
}
function updateWake(dt) {
  for (const r of wakeRings) {
    if (r.life <= 0) continue;
    r.life -= dt / 2.6; const k = 1 - Math.max(0, r.life);
    r.m.scale.setScalar(1 + k * 4.5); r.m.material.opacity = Math.max(0, r.life) * 0.55;
    if (r.life <= 0) r.m.visible = false;
  }
}
function updatePlayer(dt) {
  if (keys.has('KeyQ')) camYawT += dt * 1.6;
  if (keys.has('KeyE')) camYawT -= dt * 1.6;
  if (keys.has('KeyR')) camPitchT = clamp(camPitchT + dt * 0.8, 0.18, 1.45);
  if (keys.has('KeyF')) camPitchT = clamp(camPitchT - dt * 0.8, 0.18, 1.45);
  camYaw += (camYawT - camYaw) * Math.min(1, dt * 8);
  camPitch += (camPitchT - camPitch) * Math.min(1, dt * 8);
  camDist += (camDistT - camDist) * Math.min(1, dt * 8);
  let mx = 0, mz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) mz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) mz += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  updateWake(dt);
  if (sail.boat) {   // à bord : les touches barrent le bateau
    const c = Math.cos(camYaw), s = Math.sin(camYaw);
    updateSailing(dt, mx * c + mz * s, -mx * s + mz * c);
  }
  if (sail.boat) {
    sail.landT = (sail.landT || 0) - dt;
    if (sail.landT <= 0) { sail.landT = 0.25; sail.land = landNear(sail.boat.position.x, sail.boat.position.z); }
    const land = sail.land;
    boatBtn.style.display = ''; boatBtn.style.opacity = land ? 1 : 0.6;
    boatBtn.textContent = land ? '⚓ Débarquer (Entrée)' : '⚓ Approche-toi du rivage pour débarquer';
    player.userData.char.anim(performance.now() / 1000, 0);
    if (!camFree) camTarget.lerp(player.position, Math.min(1, dt * 4));
    return;
  }
  { const nb = nearestBoat(); boatBtn.style.display = nb ? '' : 'none'; boatBtn.style.opacity = 1; boatBtn.textContent = '⛵ Monter à bord (Entrée)'; }
  let dx = 0, dz = 0;
  if (mx || mz) {
    moveTo = null; if (camFree) follow(); if (stroll) setStroll(false);
    const c = Math.cos(camYaw), s = Math.sin(camYaw);
    dx = mx * c + mz * s; dz = -mx * s + mz * c;
  } else if (stroll) {
    // balade : on vise un point du sentier un peu plus loin ; demi-tour au bout du monde
    const pz = player.position.z;
    const tz = pz + strollDir * 2.5, tx = pathX(tz) + Math.sin(tz * 0.37) * 0.35;   // léger zigzag naturel
    dx = tx - player.position.x; dz = tz - pz;
  } else if (moveTo) {
    dx = moveTo.x - player.position.x; dz = moveTo.z - player.position.z;
    if (Math.hypot(dx, dz) < 0.2) { moveTo = null; dx = dz = 0; }
  }
  const L = Math.hypot(dx, dz);
  if (L > 0) {
    dx /= L; dz /= L;
    // évitement : on regarde un peu devant ; si un tronc ou un rocher barre la route, on essaie des directions
    // de plus en plus écartées, en gardant de préférence le même côté pour ne pas osciller
    const run = !stroll && (keys.has('ShiftLeft') || keys.has('ShiftRight')), sp = (stroll ? 3.2 : run ? 7.8 : 4.2) * dt, px = player.position.x, pz = player.position.z;
    const free = (ax, az) => !blocked(px + ax * sp, pz + az * sp) && !blocked(px + ax * 0.9, pz + az * 0.9);
    let sx = dx, sz = dz, ok = free(dx, dz);
    if (!ok) {
      for (const a of [0.35, 0.7, 1.05, 1.4, 1.75]) {
        for (const sg of [avoidSide, -avoidSide]) {
          const c = Math.cos(a * sg), sn = Math.sin(a * sg), rx = dx * c - dz * sn, rz = dx * sn + dz * c;
          if (free(rx, rz)) { sx = rx; sz = rz; ok = true; avoidSide = sg; break; }
        }
        if (ok) break;
      }
    }
    avoidT = ok && (sx !== dx) ? 0.6 : Math.max(0, avoidT - dt);
    if (!avoidT) avoidSide = 1;
    // lissage du cap pour une déviation douce
    steerX += (sx - steerX) * Math.min(1, dt * 10); steerZ += (sz - steerZ) * Math.min(1, dt * 10);
    const sl = Math.hypot(steerX, steerZ) || 1, mx2 = steerX / sl, mz2 = steerZ / sl;
    const nx = px + mx2 * sp, nz = pz + mz2 * sp;
    if (!blocked(nx, nz)) { player.position.x = nx; player.position.z = nz; }
    else if (!blocked(nx, pz)) player.position.x = nx;
    else if (!blocked(px, nz)) player.position.z = nz;
    else if (!ok) moveTo = null;
    dx = mx2; dz = mz2;
    const ang = Math.atan2(-dx, -dz);
    let da = ang - player.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    player.rotation.y += da * Math.min(1, dt * 12);
    walkT += dt * (sp > 6 * dt ? 16 : 10);
  } else walkT *= 0.9;
  { const by = onBridge(player.position.x, player.position.z); player.position.y = by !== null ? Math.max(by, height(player.position.x, player.position.z)) : height(player.position.x, player.position.z);
    if (jump.v || jump.y) { jump.v -= 16 * dt; jump.y = Math.max(0, jump.y + jump.v * dt); if (!jump.y) jump.v = 0; player.position.y += jump.y; } }
  { const wade = smooth(WL + 0.05, WL - 0.15, player.position.y), mv = L > 0 ? 1 : 0.35;
    U.uPW.value.set(player.position.x, player.position.z, lerp(U.uPW.value.z, wade * mv, Math.min(1, dt * 4)), 0); }
  { const ch = player.userData.char, mv = L > 0 ? 1 : 0;
    if (ch.gait) { ch.gait(walkT, Math.min(1, walkT > 0.01 ? mv || 0.0 : 0)); ch.anim(performance.now() / 1000, walkT); } else {
    ch.group.position.y = Math.abs(Math.sin(walkT)) * 0.07;
    ch.group.rotation.z = Math.sin(walkT) * 0.07 * mv;
    ch.group.rotation.x = -0.06 * mv;
    ch.group.scale.y = 1 - Math.abs(Math.cos(walkT)) * 0.04 * mv;
    ch.anim(performance.now() / 1000, walkT); } }
  if (stroll && !drag) camYawT += dt * 0.025;   // balade : la caméra tourne très lentement autour du perso
  if (!camFree) camTarget.lerp(player.position, Math.min(1, dt * 4));
}

// ════════════════════════════════════════════════════════════════════
//  Interface
// ════════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const SLIDERS = [   // [clé, libellé, min, max, pas, section]
  ['sunAz', 'Soleil ↻', 0, 360, 1, 'light'], ['sunEl', 'Soleil ↑', 4, 85, 1, 'light'], ['sunInt', 'Soleil', 0, 8, 0.1, 'light'], ['hemiInt', 'Ciel', 0, 3, 0.05, 'light'],
  ['exposure', 'Exposition', 0.4, 2, 0.01, 'light'], ['cloud', 'Nuages', 0, 0.8, 0.05, 'light'], ['rays', 'Rayons', 0, 3, 0.05, 'light'], ['bloom', 'Halo', 0, 2, 0.05, 'light'],
  ['pixel', 'Pixel', 1, 6, 1, 'render'], ['tilt', 'Tilt-shift', 0, 2, 0.05, 'render'], ['outline', 'Contours', 0, 1, 0.05, 'render'], ['dither', 'Dithering', 0, 1.5, 0.05, 'render'],
  ['levels', 'Niveaux', 0, 32, 1, 'render'], ['reveal', 'Transparence', 0, 1, 0.05, 'render'], ['bump', 'Relief sol', 0, 3, 0.05, 'render'],
];
function buildUI() {
  $('presets').innerHTML = ''; $('labels').innerHTML = '';
  PRESETS.forEach((p, i) => {
    const b = document.createElement('button'); b.textContent = p.name; b.className = p === cur && !planche ? 'on' : '';
    b.onclick = () => { cur = p; setPlanche(false); syncSliders(); buildUI(); };
    $('presets').appendChild(b);
    const d = document.createElement('div'); d.innerHTML = `<b>${p.name}</b>`;
    d.onclick = () => { cur = p; setPlanche(false); syncSliders(); buildUI(); };
    $('labels').appendChild(d);
  });
  $('planche').classList.toggle('on', planche);
  $('sumStyle').textContent = planche ? 'planche' : cur.name;
}
function syncSliders() {
  $('sl-light').innerHTML = ''; $('sl-render').innerHTML = '';
  for (const [k, label, mn, mx, st, grp] of SLIDERS) {
    const row = document.createElement('label'); row.className = 'row';
    row.innerHTML = `<span>${label}</span><input type="range" min="${mn}" max="${mx}" step="${st}" value="${cur[k]}"><span>${+(+cur[k]).toFixed(2)}</span>`;
    const inp = row.querySelector('input'), out = row.lastChild;
    inp.oninput = () => { cur[k] = +inp.value; out.textContent = +(+inp.value).toFixed(2); };
    $('sl-' + grp).appendChild(row);
  }
}
function setPlanche(on) { planche = on; $('labels').classList.toggle('on', on); buildUI(); }
$('planche').onclick = () => setPlanche(!planche);
$('title').onclick = $('fold').onclick = () => { const c = $('ui').classList.toggle('closed'); try { localStorage.setItem('lisiere.ui.closed', c ? '1' : '0'); } catch (e) {} };
// sections pliables : leur état est mémorisé ; tout est replié par défaut (et le panneau entier sur téléphone)
try {
  const st = JSON.parse(localStorage.getItem('lisiere.ui.open') || '{}'), cl = localStorage.getItem('lisiere.ui.closed');
  document.querySelectorAll('#ui details').forEach(d => { d.open = !!st[d.dataset.k]; });
  if (cl === '1' || (cl === null && innerWidth < 700)) $('ui').classList.add('closed');
} catch (e) { if (innerWidth < 700) $('ui').classList.add('closed'); }
document.querySelectorAll('#ui details').forEach(d => d.addEventListener('toggle', () => {
  const st = {}; document.querySelectorAll('#ui details').forEach(x => { st[x.dataset.k] = x.open; });
  try { localStorage.setItem('lisiere.ui.open', JSON.stringify(st)); } catch (e) {}
}));
$('reset').onclick = () => { const i = PRESETS.indexOf(cur); Object.assign(cur, structuredClone(BASE[i]), { palette: cur.palette }); syncSliders(); };
let seed = (Math.random() * 1e6) | 0;
$('follow').onclick = () => follow();
function setStroll(on) {
  stroll = on; $('stroll').classList.toggle('on', on);
  if (on) { moveTo = null; strollDir = Math.cos(camYaw) > 0 ? -1 : 1; }   // part dans la direction où regarde la caméra
}
$('stroll').onclick = () => setStroll(!stroll);
addEventListener('keydown', e => { if (e.code === 'KeyB' && e.target.tagName !== 'INPUT') setStroll(!stroll); });
BIOMES.forEach((b, i) => { const o = document.createElement('option'); o.value = i; o.textContent = b.name; $('goBiome').appendChild(o); });
CHARS.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; $('charSel').appendChild(o); });
$('charSel').value = charId;
$('charSel').onchange = () => setCharacter($('charSel').value);
{ const o = document.createElement('option'); o.value = 'pont'; o.textContent = 'Le pont le plus proche'; $('goBiome').appendChild(o); }
function goToBridge() {
  const pz = player.position.z;
  for (let d = 0; d < 2500; d += 1) for (const sg of [1, -1]) {
    const z = pz + d * sg, r = riverAt(pathX(z), z);
    if (r && r.fade > 0.7 && r.d < 0.8) { teleport(pathX(z), z - sg * (r.w + 7)); return; }
  }
}
$('goBiome').onchange = () => { if ($('goBiome').value === 'pont') goToBridge(); else if ($('goBiome').value !== '') goToBiome(+$('goBiome').value); $('goBiome').value = ''; };
// cycle jour/nuit
const fmtH = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor(h % 1 * 60)).padStart(2, '0')}`;
let dayLabelT = 0;
function syncDay(force) {
  const now = performance.now(); if (!force && now - dayLabelT < 200) return; dayLabelT = now;
  $('dayOn').classList.toggle('on', cycle.on); $('dayRun').textContent = cycle.run ? '⏸' : '▶';
  $('sumTime').textContent = cycle.on ? fmtH(cycle.hour) + (cycle.run ? ' ▸' : '') : 'style';
  $('dayH').value = cycle.hour; $('dayHv').textContent = fmtH(cycle.hour);
  $('ui').classList.toggle('cycling', cycle.on);
}
$('dayOn').onclick = () => { cycle.on = !cycle.on; syncDay(true); };
$('dayRun').onclick = () => { cycle.run = !cycle.run; cycle.on = true; syncDay(true); };
$('dayH').oninput = () => { cycle.hour = +$('dayH').value; cycle.on = true; syncDay(true); };
$('dayM').oninput = () => { cycle.minutes = +$('dayM').value; $('dayMv').textContent = cycle.minutes + ' min'; };
if (!ASSETS) $('world').onclick = () => { $('loading').style.display = 'grid'; setTimeout(() => { seed = (Math.random() * 1e6) | 0; initWorld(seed); }, 30); };
addEventListener('resize', () => { if (!ASSETS) renderer.setSize(innerWidth, innerHeight, false); });
// ?style=doree&planche
const qs = new URLSearchParams(location.search);
if (qs.get('heure')) { cycle.on = true; cycle.hour = +qs.get('heure'); cycle.run = qs.has('defile'); }
syncDay(true);
if (qs.get('style')) cur = PRESETS.find(p => p.id === qs.get('style')) || cur;
if (qs.get('seed')) seed = +qs.get('seed');
buildUI(); syncSliders();
if (qs.has('planche')) setPlanche(true);

// ════════════════════════════════════════════════════════════════════
//  Boucle
// ════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════
//  Page « assets » : chaque élément de la carte rendu seul, avec le même pipeline
// ════════════════════════════════════════════════════════════════════
const CW = 360, CHh = 270;
let cells = [], dirty = [], hovered = -1;
function hAssets(x, z) {   // sol plat, avec une mare dans la case « Étang »
  const pc = cells.find(c => c.pond); if (!pc) return 0;
  const d = Math.hypot(x - pc.x, z - pc.z);
  return lerp(0, WL + 0.35 - 1.5 * smooth(6.5, 1.5, d), smooth(10, 7, d));
}
function buildAssets(sd) {
  hAssetsFn = hAssets;
  if (world) { world.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.geometry) o.geometry.dispose(); }); scene.remove(world); }
  world = new THREE.Group(); scene.add(world);
  rnd = mulberry32(sd); seedNoise(sd); pathPh = [0, 0]; climOff = [0, 0, 0, 0]; bCaches.clear(); hCaches.clear();
  chalets = []; smokes.length = 0;
  trees = [];
  const W1 = () => new THREE.Color(1, 1, 1);
  const one = (pr, x, z, s = 1) => {
    const it = [{ x, z, y: 0, s, ry: R(0, 6.28), c: W1() }];
    if (pr.trunk) instanced(pr.trunk, pr.trunkMat || (pr.culm ? M.culm : pr.birch ? M.birch : M.bark), it);
    if (pr.leaves) instanced(pr.leaves, pr.leafMat || (pr.culm ? M.bambooLeaf : pr.willow ? M.willow : pr.needles ? M.needles : pr.soft ? M.bush : M.leaves), it, { depth: pr.leafDepth || (pr.culm ? DM.bamboo : pr.willow ? DM.willow : pr.needles ? DM.needles : pr.soft ? DM.bush : DM.leaves) });
  };
  const scatter = (n, r, f) => { const a = []; for (let i = 0; i < n; i++) { const ang = R(0, 6.28), d = r * Math.sqrt(rnd()); a.push(f(Math.cos(ang) * d, Math.sin(ang) * d, i)); } return a; };
  const soft = pr => (pr.soft = true, pr);
  const RSH = ['boulder', 'slab', 'spire', 'round'];
  const rockRow = (x, z, mossy) => RSH.forEach((sh, i) => { const r = makeRock(sh, mossy); instanced(r.geo, M.stone, [{ x: x - 3.3 + i * 2.2, z: z + (i % 2) * 0.8, y: r.base * 0.9 - 0.05, s: 0.9, ry: R(0, 6.28), c: W1() }]); });
  const flowers = k => (x, z) => instanced(makeFlowerTuft(k), M.flora, scatter(26, 2.2, (a, b) => ({ x: x + a, z: z + b, y: 0, s: R(1.1, 1.7), ry: R(0, 6.28), c: W1() })), { cast: false });
  const L = [
    ['Arbres', 'Chêne', 22, 3, (x, z) => one(makeOak(false), x, z)],
    ['Arbres', 'Érable rouge', 22, 3, (x, z) => one(makeOak(true), x, z)],
    ['Arbres', 'Érable doré', 22, 3, (x, z) => one(makeOak(false, PAL.gold), x, z)],
    ['Arbres', 'Bouleau', 24, 3.5, (x, z) => one(makeBirch(), x, z)],
    ['Arbres', 'Pin', 24, 3.5, (x, z) => one(makePine(), x, z)],
    ['Arbres', 'Saule pleureur', 22, 2.5, (x, z) => one(makeWillow(), x, z)],
    ['Savane', 'Acacia', 20, 3, (x, z) => one(makeAcacia(), x, z)],
    ['Savane', 'Baobab', 20, 3, (x, z) => one(makeBaobab(), x, z)],
    ['Savane', 'Termitières', 7, 0.6, (x, z) => instanced(makeMound(), M.mush, [0, 1, 2].map(k => ({ x: x + (k - 1) * 1.8, z, y: -0.1, s: 0.9, sy: 1.4 + k * 0.4, ry: k, c: new THREE.Color(1, 1, 1) })))],
    ['Forêt tropicale', 'Arbre géant', 30, 5, (x, z) => one(makeJungleTree(), x, z)],
    ['Forêt tropicale', 'Fougère arborescente', 12, 2.5, (x, z) => one(makeTreeFern(), x, z)],
    ['Forêt tropicale', "Oreilles d'éléphant", 7, 0.4, (x, z) => instanced(makeRosette(), M.flora, scatter(5, 1.6, (a, b) => ({ x: x + a, z: z + b, y: 0, s: R(2.4, 3.4), ry: R(0, 6.28), c: col('#3e7e30') })))],
    ['Rivière', 'Peuplier', 24, 4, (x, z) => one(makePoplar(), x, z)],
    ['Désert', 'Cactus', 12, 1.5, (x, z) => [0, 1, 2].forEach(k => one(makeCactus(k), x + (k - 1) * 2.4, z + (k % 2) * 0.8))],
    ['Désert', 'Palmier', 20, 3, (x, z) => one(makePalm(), x, z)],
    ['Désert', 'Arbre mort & armoise', 10, 1, (x, z) => { one(makeDeadTree(), x - 1, z); const sg = soft(makeBush(PAL.sage, 0.34, 0.55)); scatter(3, 1.5, (a, b) => one(sg, x + 1.2 + a, z + b, R(0.8, 1.2))); }],
    ['Désert', 'Grès rouge', 10, 0.5, (x, z) => ['boulder', 'slab', 'spire', 'round'].forEach((sh, i) => { const r = makeRock(sh, false, false, false, true); instanced(r.geo, M.stone, [{ x: x - 3.3 + i * 2.2, z: z + (i % 2) * 0.8, y: r.base * 0.9 - 0.05, s: 0.9, ry: R(0, 6.28), c: new THREE.Color(1, 1, 1) }]); })],
    ['Bambouseraie', 'Bambou', 22, 4, (x, z) => one(makeBamboo(), x, z)],
    ['Montagne', 'Sapin', 26, 4, (x, z) => one(makeFir(false), x, z)],
    ['Montagne', 'Sapin enneigé', 26, 4, (x, z) => one(makeFir(true), x, z)],
    ['Montagne', 'Blocs enneigés', 10, 0.5, (x, z) => ['boulder', 'slab', 'spire', 'round'].forEach((sh, i) => { const r = makeRock(sh, false, false, true); instanced(r.geo, M.stone, [{ x: x - 3.3 + i * 2.2, z: z + (i % 2) * 0.8, y: r.base * 0.9 - 0.05, s: 0.9, ry: R(0, 6.28), c: new THREE.Color(1, 1, 1) }]); })],
    ['Méditerranée', 'Pin parasol', 26, 3.5, (x, z) => one(makeParasol(), x, z)],
    ['Méditerranée', 'Olivier', 16, 1.8, (x, z) => one(makeOlive(), x, z)],
    ['Méditerranée', 'Cyprès', 24, 3.5, (x, z) => one(makeCypress(), x, z)],
    ['Méditerranée', 'Lavande & maquis', 8, 0.4, (x, z) => { const lv = soft(makeBush(PAL.lavender, 0.32, 0.5)), mq = soft(makeBush(PAL.maquis, 0.4, 0.8)); scatter(5, 1.8, (a, b, i) => one(i < 3 ? lv : mq, x + a, z + b, R(0.8, 1.3))); }],
    ['Eau', 'Voilier', 9, 1.2, (x, z) => { const b = makeSailboat(0); b.position.set(x, 0.05, z); b.rotation.y = 0.9; world.add(b); }],
    ['Méditerranée', 'Calcaire', 10, 0.5, (x, z) => ['boulder', 'slab', 'spire', 'round'].forEach((sh, i) => { const r = makeRock(sh, false, true); instanced(r.geo, M.stone, [{ x: x - 3.3 + i * 2.2, z: z + (i % 2) * 0.8, y: r.base * 0.9 - 0.05, s: 0.9, ry: R(0, 6.28), c: new THREE.Color(1, 1, 1) }]); })],
    ['Arbustes', 'Buisson', 9, 0.6, (x, z) => one(soft(makeBush()), x, z)],
    ['Arbustes', 'Bruyère', 8, 0.4, (x, z) => { const pr = soft(makeBush(PAL.heather, 0.42, 0.55)); scatter(4, 1.6, (a, b) => one(pr, x + a, z + b, R(0.8, 1.3))); }],
    ['Arbustes', 'Ajonc', 8, 0.5, (x, z) => { const pr = soft(makeBush(PAL.gorse, 0.45, 0.75)); scatter(3, 1.3, (a, b) => one(pr, x + a, z + b, R(0.8, 1.2))); }],
    ['Plantes', 'Herbe', 7, 0.2, (x, z) => instanced(makeGrass(), M.grass, scatter(110, 2.6, (a, b) => ({ x: x + a, z: z + b, y: -0.03, s: R(0.9, 1.6), ry: R(0, 3.14), c: grassColorAt(x + a, z + b, 0, BI.foret) })), { cast: false })],
    ['Plantes', 'Herbes hautes', 7, 0.3, (x, z) => instanced(makeGrass(), M.grass, scatter(70, 2.6, (a, b) => ({ x: x + a, z: z + b, y: -0.03, s: R(0.9, 1.6), sy: R(1.6, 2.6), ry: R(0, 3.14), c: grassColorAt(x + a, z + b, 0, BI.prairie) })), { cast: false })],
    ['Plantes', 'Fougères', 7, 0.3, (x, z) => instanced(makeFern(), M.fern, scatter(6, 2, (a, b) => ({ x: x + a, z: z + b, y: 0, s: R(0.9, 1.5), ry: R(0, 6.28), c: col('#4f8a2c').lerp(col('#86b043'), rnd()) })), { cast: false })],
    ['Plantes', 'Rosettes', 6, 0.1, (x, z) => instanced(makeRosette(), M.flora, scatter(16, 2.2, (a, b) => ({ x: x + a, z: z + b, y: 0, s: R(0.8, 1.5), ry: R(0, 6.28), c: col(['#5f9b3a', '#7cab42', '#93ba4c'][rnd() * 3 | 0]) })), { cast: false })],
    ['Plantes', 'Roseaux', 7, 0.5, (x, z) => instanced(makeReeds(), M.flora, scatter(30, 2, (a, b) => ({ x: x + a, z: z + b, y: -0.05, s: R(0.8, 1.3), sy: R(0.8, 1.5), ry: R(0, 3.14), c: W1() })), { cast: false })],
    ['Fleurs', 'Marguerites', 6, 0.2, flowers(0)],
    ['Fleurs', "Boutons d'or", 6, 0.2, flowers(1)],
    ['Fleurs', 'Campanules', 6, 0.2, flowers(2)],
    ['Fleurs', 'Coquelicots', 6, 0.2, flowers(3)],
    ['Fleurs', 'Trèfle', 6, 0.2, flowers(4)],
    ['Fleurs', 'Pissenlits', 4.5, 0.25, (x, z) => { for (const bl of [false, true]) { const set = scatter(6, 1.4, (a, b) => ({ x: x + a + (bl ? 0.6 : -0.6), z: z + b, y: 0, s: R(0.9, 1.2), ry: R(0, 6.28), c: W1() })); instanced(makeDandelionStem(bl), M.mush, set, { cast: false }); instanced(makeDandelionHead(bl), M.dand, set, { cast: false }); instanced(makeRosette(), M.flora, set.map(p => ({ ...p, s: 0.55, c: col('#5f9b3a') })), { cast: false }); } }],
    ['Sol', 'Champignons', 3.2, 0.1, (x, z) => { ['amanite', 'cepe', 'mycene'].forEach((t, k) => instanced(makeMushroom(t), M.mush, scatter(4, 0.4, (a, b) => ({ x: x + a + (k - 1) * 0.75, z: z + b, y: -0.02, s: R(0.9, 1.3), ry: R(0, 6.28), c: W1() })), { cast: false })); }],
    ['Sol', 'Feuilles mortes', 5, 0, (x, z) => { const lc = ['#c8752e', '#9c4d22', '#e0a040', '#6a3c22', '#b8862f'].map(col); instanced(makeDeadLeaf(), M.flora, scatter(140, 2.4, (a, b) => ({ x: x + a, z: z + b, y: 0.01, s: R(0.8, 1.4), ry: R(0, 6.28), rx: R(-0.25, 0.25), c: lc[rnd() * 5 | 0].clone() })), { cast: false }); }],
    ['Sol', 'Cailloux & tronc', 7, 0.2, (x, z) => { instanced(new THREE.DodecahedronGeometry(1, 0), M.rock, scatter(40, 2, (a, b) => { const s = R(0.04, 0.12); return { x: x + a, z: z + b + 1, y: s * 0.1, s, sy: s * 0.6, ry: R(0, 6.28), c: new THREE.Color(R(0.75, 1), R(0.68, 0.9), R(0.55, 0.72)) }; }), { cast: false }); instanced(makeLog(), M.log, [{ x, z: z - 1, y: 0.16, s: 1.1, sy: 3.5, rz: Math.PI / 2, ry: 0.4, rx: 0, c: W1() }]); }],
    ['Minéral', 'Rochers moussus', 10, 0.5, (x, z) => rockRow(x, z, true)],
    ['Minéral', 'Rochers à lichen', 10, 0.5, (x, z) => rockRow(x, z, false)],
    ['Minéral', 'Chaos rocheux (lande)', 16, 1.2, (x, z) => { const big = makeRock('spire', false); instanced(big.geo, M.stone, [{ x, z, y: big.base * 3 - 0.2, s: 3, ry: 0.3, c: W1() }]); for (let k = 0; k < 4; k++) { const r = makeRock(k % 2 ? 'slab' : 'boulder', false), a = k * 1.6 + 0.4, s = R(1.2, 1.9); instanced(r.geo, M.stone, [{ x: x + Math.cos(a) * 3.4, z: z + Math.sin(a) * 3.4, y: r.base * s - 0.1, s, ry: R(0, 6.28), c: W1() }]); } }],
    ['Eau', 'Étang & nénuphars', 15, -2, (x, z) => {
      instanced(makeLily(), M.flora, scatter(22, 4.5, (a, b) => ({ x: x + a, z: z + b, y: WL + 0.015, s: R(0.7, 1.3), ry: R(0, 6.28), c: W1() })), { cast: false });
      instanced(makeReeds(), M.flora, scatter(40, 1, (a, b, i) => { const ang = i / 40 * 6.28 + a, d = 6.2 + b; return { x: x + Math.cos(ang) * d, z: z + Math.sin(ang) * d, y: hAssets(x + Math.cos(ang) * d, z + Math.sin(ang) * d) - 0.05, s: R(0.8, 1.2), sy: R(0.8, 1.4), ry: R(0, 3), c: W1() }; }), { cast: false });
    }, true],
    ...[0, 1, 2].map(vi => ['Constructions', 'Chalet ' + (vi + 1), 17, 1.8, (x, z) => { const g = makeChalet(vi); g.position.set(x, 0, z); g.rotation.y = Math.PI + 0.75; world.add(g); addSmoke(g); }]),
    ...CHARS.map(ch => ['Personnages', ch.name, 4.2, 0.62, (x, z, cell) => { const c = makeCharacter(ch.id); c.group.position.set(x, 0, z); c.group.rotation.y = Math.PI + 0.35; world.add(c.group); cell.char = c; }]),
  ];
  // grille de cases dans le monde (espacées pour que les ombres ne se mélangent pas)
  cells = L.map(([cat, name, dist, lookY, build, pond, isPlayer], i) => ({ cat, name, dist, lookY, build, pond: !!pond, player: !!isPlayer, x: -100 + (i % 8) * 28, z: -70 + Math.floor(i / 8) * 34, yaw: 0.35 + R(-0.3, 0.3) }));
  // sol
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, 260, 260); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, hAssets(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const gc = document.createElement('canvas'); gc.width = gc.height = 512; const gg = gc.getContext('2d'), im = gg.createImageData(512, 512);
  for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) {
    const x = i / 512 * SIZE - HALF, z = j / 512 * SIZE - HALF, n = fbm(x * 0.08, z * 0.08, 3), k = (j * 512 + i) * 4;
    const wet = smooth(WL + 0.5, WL + 0.02, hAssets(x, z));
    im.data[k] = lerp(lerp(78, 112, clamp(0.5 + n)), 50, wet); im.data[k + 1] = lerp(lerp(126, 158, clamp(0.5 + n)), 62, wet); im.data[k + 2] = lerp(lerp(48, 62, clamp(0.5 + n)), 46, wet); im.data[k + 3] = 255;
  }
  gg.putImageData(im, 0, 0);
  const tex = new THREE.CanvasTexture(gc); tex.colorSpace = THREE.SRGBColorSpace;
  const mk = document.createElement('canvas'); mk.width = mk.height = 4; mk.getContext('2d').fillRect(0, 0, 4, 4);
  const mask = new THREE.CanvasTexture(mk); mask.flipY = false;
  ground = new THREE.Mesh(geo, patch(new THREE.MeshLambertMaterial({ map: tex }), { ground: { mask, detail: groundDetail, mo: new THREE.Vector3(-HALF, -HALF, SIZE) } }));
  ground.receiveShadow = true; world.add(ground);
  // eau
  const WR = 512, data = new Uint8Array(WR * WR * 4);
  for (let j = 0; j < WR; j++) for (let i = 0; i < WR; i++) { const d = WL - hAssets((i + 0.5) / WR * SIZE - HALF, (j + 0.5) / WR * SIZE - HALF), k = (j * WR + i) * 4; data[k] = clamp((d + 0.5) / 3) * 255; data[k + 3] = 255; }
  if (U.tWDepth.value) U.tWDepth.value.dispose();
  const wt = new THREE.DataTexture(data, WR, WR); wt.magFilter = wt.minFilter = THREE.LinearFilter; wt.needsUpdate = true; U.tWDepth.value = wt;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2), M.water); water.position.y = WL; water.receiveShadow = true; world.add(water);
  cells.forEach(c => c.build(c.x, c.z, c));
  player.position.set(9999, 0, 9999);
  motes.visible = false;
  // cartes HTML
  const gal = document.getElementById('gallery'); gal.innerHTML = '';
  let lastCat = '';
  cells.forEach((c, i) => {
    if (c.cat !== lastCat) { lastCat = c.cat; const h = document.createElement('h2'); h.textContent = c.cat; gal.appendChild(h); }
    const card = document.createElement('figure'); card.className = 'card';
    const cv = document.createElement('canvas'); cv.width = CW; cv.height = CHh; c.ctx = cv.getContext('2d');
    const cap = document.createElement('figcaption'); cap.textContent = c.name;
    card.append(cv, cap); gal.appendChild(card);
    card.onmouseenter = () => { hovered = i; }; card.onmouseleave = () => { if (hovered === i) hovered = -1; };
  });
  dirty = cells.map((c, i) => i);
}
function renderCell(i, t) {
  const c = cells[i];
  camTarget.set(c.x, c.lookY, c.z); camDist = c.dist; camYaw = c.yaw; camPitch = c.cat === 'Constructions' ? 0.55 : 0.85;
  player.visible = false;
  if (c.char) { c.char.anim(t, t * 3); if (c.char.gait) c.char.gait(t * 9, hovered === i ? 1 : 0); }
  const p = withDay(cur);
  forceShadow = true;
  renderView({ ...p, reveal: 0, tilt: p.tilt * 0.4, rays: (p.rays || 0) * 0.25, motes: { ...p.motes, amount: 0 } }, 0, 0, CW, CHh, t);
  forceShadow = false;
  c.ctx.drawImage(renderer.domElement, 0, 0, CW, CHh);
}
function assetsFrame(dt, t) {
  if (hovered >= 0) { cells[hovered].yaw += dt * 0.5; renderCell(hovered, t); }
  for (let k = 0; k < 3 && dirty.length; k++) renderCell(dirty.shift(), t);
  if (!dirty.length && (cycle.on && cycle.run)) dirty = cells.map((c, i) => i);
}
if (ASSETS) {
  renderer.setPixelRatio(1); renderer.setSize(CW, CHh, false);
  canvas.style.display = 'none';
  setTimeout(() => { buildAssets(seed); $('loading').style.display = 'none'; }, 30);
  // toute modification du style redessine la galerie
  ['input', 'click', 'change'].forEach(ev => $('ui').addEventListener(ev, () => { dirty = cells.map((c, i) => i); }));
  $('world').onclick = () => { seed = (Math.random() * 1e6) | 0; buildAssets(seed); };
} else setTimeout(() => { initWorld(seed); }, 30);
let last = performance.now(), fpsAcc = 0, fpsN = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000; frameNo++;
  if (cycle.on && cycle.run) { cycle.hour = (cycle.hour + dt * 24 / (cycle.minutes * 60)) % 24; syncDay(); }
  U.uTime.value = t;
  if (!ASSETS && !worldRoot) { requestAnimationFrame(frame); return; }
  if (!ASSETS) {
    if (!worldReady) {   // arrivée (départ, téléportation) : on génère d'abord les tronçons autour du joueur
      $('loading').style.display = 'grid';
      streamWorld(120);
      const px = player.position.x, pz = player.position.z;
      let ok = true; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (!chunkReadyAt(px + i * CHK, pz + j * CHK)) ok = false;
      if (ok) { worldReady = true; $('loading').style.display = 'none'; player.position.y = height(px, pz); camTarget.copy(player.position); }
      requestAnimationFrame(frame); return;
    }
    streamWorld(6); updateFarHole(); updateWater(); updateFarGround();
  }
  updateSmoke(t, winMat.emissiveIntensity > 0.6); updateBoats(t);
  if (ASSETS) { assetsFrame(dt, t); requestAnimationFrame(frame); return; }
  updatePlayer(dt);
  drawMinimap(now);
  const W = innerWidth, H = innerHeight;
  if (planche) {
    const cw = W / 3, ch = H / 2;
    PRESETS.forEach((p, i) => renderView(withDay(p), (i % 3) * cw, H - (Math.floor(i / 3) + 1) * ch, cw, ch, t));
  } else renderView(withDay(cur), 0, 0, W, H, t);
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 0.5) { $('fps').textContent = `${Math.round(fpsN / fpsAcc)} fps · graine ${seed}`; fpsAcc = fpsN = 0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
