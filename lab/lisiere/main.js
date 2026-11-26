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
const SIZE = 260, HALF = SIZE / 2;
const WL = -3.6; // niveau de l'eau
let pathPh = [0, 0], clearing = new THREE.Vector2();
const pathX = z => 15 * Math.sin(z * 0.03 + pathPh[0]) + 7 * Math.sin(z * 0.083 + pathPh[1]);
const pathDist = (x, z) => Math.abs(x - pathX(z));

// Chaque biome occupe une région du plan (température, humidité) ; deux champs de bruit
// à grande échelle donnent le climat en tout point, les poids sont un « soft-Voronoï ».
const BIOMES = [
  { id: 'foret',   name: 'Forêt',           t: 0.50, h: 0.52, trees: 1.0,  map: '#3f7a34', grass: 1.0, flowers: 1.0, tint: [1, 1, 1] },
  { id: 'pinede',  name: 'Pinède',          t: 0.12, h: 0.50, trees: 0.95, map: '#2a5546', grass: 0.45, flowers: 0.2, tint: [0.85, 0.95, 0.9] },
  { id: 'prairie', name: 'Prairie fleurie', t: 0.86, h: 0.36, trees: 0.08, map: '#a6c85c', grass: 2.0, flowers: 3.2, tint: [1.08, 1.08, 0.85] },
  { id: 'marais',  name: 'Marais',          t: 0.62, h: 0.92, trees: 0.3,  map: '#4f7a62', grass: 1.3, flowers: 0.5, tint: [0.85, 0.95, 0.85] },
  { id: 'automne', name: "Bois d'automne",  t: 0.30, h: 0.82, trees: 0.95, map: '#c8742e', grass: 0.7, flowers: 0.4, tint: [1.15, 1.0, 0.7] },
  { id: 'lande',   name: 'Lande rocheuse',  t: 0.24, h: 0.10, trees: 0.15, map: '#8a7a92', grass: 0.7, flowers: 0.5, tint: [1.1, 1.0, 0.75] },
  { id: 'littoral', name: 'Bord de mer',    t: 0.96, h: 0.14, trees: 0.4,  map: '#e6d29c', grass: 0.45, flowers: 0.35, tint: [1.15, 1.05, 0.7] },
];
const NB = BIOMES.length, BI = Object.fromEntries(BIOMES.map((b, i) => [b.id, i]));
let climOff = [0, 0, 0, 0];
function climateWeights(x, z, out) {
  const t = clamp(0.5 + fbm(x * 0.0068 + climOff[0], z * 0.0068 + climOff[1], 2) * 1.6);
  const h = clamp(0.5 + fbm(x * 0.0068 + climOff[2], z * 0.0068 + climOff[3], 2) * 1.6);
  let s = 0;
  for (let i = 0; i < NB; i++) { const b = BIOMES[i], d2 = (t - b.t) ** 2 + (h - b.h) ** 2, w = Math.exp(-d2 / 0.01); out[i] = w; s += w; }
  for (let i = 0; i < NB; i++) out[i] = s > 0 ? out[i] / s : 1 / NB;
}
const BG = SIZE + 1;
const bCache = new Float32Array(BG * BG * NB);
function buildBiomeCache() {
  const tmp = new Float32Array(NB);
  for (let j = 0; j < BG; j++) for (let i = 0; i < BG; i++) { climateWeights(i - HALF, j - HALF, tmp); bCache.set(tmp, (j * BG + i) * NB); }
}
const _bw = new Float32Array(NB);
function biomeW(x, z, out = _bw) {
  const fx = clamp(x + HALF, 0, SIZE - 1e-3), fz = clamp(z + HALF, 0, SIZE - 1e-3);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const a = (j * BG + i) * NB, b = a + NB, c = a + BG * NB, d = c + NB;
  for (let k = 0; k < NB; k++) out[k] = (bCache[a + k] * (1 - u) + bCache[b + k] * u) * (1 - v) + (bCache[c + k] * (1 - u) + bCache[d + k] * u) * v;
  return out;
}
function biomeArgmax(x, z) { const w = biomeW(x, z); let m = 0; for (let k = 1; k < NB; k++) if (w[k] > w[m]) m = k; return m; }
function pickBiome(x, z) { const w = biomeW(x, z); let r = rnd(); for (let k = 0; k < NB; k++) { r -= w[k]; if (r <= 0) return k; } return NB - 1; }
const bMix = (x, z, key) => { const w = biomeW(x, z); let s = 0; for (let k = 0; k < NB; k++) s += w[k] * BIOMES[k][key]; return s; };

function height(x, z) {
  const w = biomeW(x, z);
  let h = fbm(x * 0.018, z * 0.018, 3) * 2.6 + noise(x * 0.09 + 50, z * 0.09) * 0.35;
  const hills = w[BI.lande] * 1.9 + w[BI.pinede] * 1.1;                       // collines dans les biomes froids
  if (hills > 0.02) h += hills * (fbm(x * 0.035 + 5, z * 0.035, 3) * 2.4 + 0.6);
  const ws = w[BI.littoral];
  if (ws > 0.05) {
    const coast = WL + 1.3 - smooth(0.4, 0.85, ws + noise(x * 0.05 + 77, z * 0.05) * 0.12) * 6.5;   // > WL : plage et garrigue ; < WL : la mer
    h = lerp(h, Math.min(h * 0.6 + WL + 1.6, coast), smooth(0.05, 0.4, ws));
  }
  const m = smooth(0.2, 0.62, w[BI.marais]);                                   // marais : cuvette basse + étangs
  if (m > 0) {
    const pond = smooth(-0.08, 0.22, fbm(x * 0.05 + 300, z * 0.05, 3));
    h = lerp(h, WL + 0.3 - pond * 1.3 + noise(x * 0.2, z * 0.2) * 0.15, m);
  }
  const pd = pathDist(x, z), flat = smooth(0, 5, pd);
  return h * (0.55 + 0.45 * flat) - 0.2 * (1 - smooth(0.6, 2.4, pd));     // le chemin forme une digue au-dessus de l'eau
}
let chalets = [];
const onBeach = (x, z, h) => h < WL + 1.5 && biomeW(x, z)[BI.littoral] > 0.12;
function nearChalet(x, z, r = 3.9) { for (const c of chalets) if ((x - c.x) ** 2 + (z - c.z) ** 2 < r * r) return true; return false; }
function chaletClear(x, z) { let k = 1; for (const c of chalets) k = Math.min(k, smooth(5.5, 10, Math.hypot(x - c.x, z - c.z))); return k; }
function forestDensity(x, z, h = height(x, z)) {
  let d = (0.62 + fbm(x * 0.028 + 11, z * 0.028 - 7, 3) * 0.75) * bMix(x, z, 'trees');
  d *= smooth(6, 12, Math.hypot(x - clearing.x, z - clearing.y));
  if (chalets.length) d *= chaletClear(x, z);
  d *= smooth(1.6, 4.5, pathDist(x, z));
  d *= smooth(WL + 0.1, WL + 0.6, h);
  return clamp(d);
}
const birchness = (x, z) => fbm(x * 0.035 - 30, z * 0.035 + 21, 2);
const litter = (x, z) => { const w = biomeW(x, z); return fbm(x * 0.045 + 40, z * 0.045 + 13, 3) + w[BI.automne] * 0.38 + w[BI.pinede] * 0.12 - w[BI.prairie] * 0.3 - w[BI.marais] * 0.2 - w[BI.littoral] * 0.5; };

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
  uBump: { value: 0.9 },
  tWDepth: { value: null }, uSky: { value: new THREE.Color() }, uPW: { value: new THREE.Vector4(0, 0, 0, 0) },
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
  ${flutter ? 'transformed += normal * sin(uTime*3.7 + dot(transformed, vec3(3.1,2.3,1.7))) * 0.035 * uWind;' : ''}
`;
function patch(mat, { wind = 0, flutter = false, fakeNormal = false, reveal = false, ground = null, water = false, stone = false, proc = '' } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uCloud = U.uCloud; sh.uniforms.uWind = U.uWind;
    if (ground) { sh.uniforms.tMask = { value: ground.mask }; sh.uniforms.tDetail = { value: ground.detail }; sh.uniforms.uBump = U.uBump; }
    if (water) { sh.uniforms.tWDepth = U.tWDepth; sh.uniforms.uSky = U.uSky; sh.uniforms.uPW = U.uPW; }
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
          ivec2 ip = ivec2(mod(gl_FragCoord.xy, 4.));
          float b = (RB[ip.x + ip.y * 4] + 0.5) / 16.;
          if (b < k * uReveal) discard;
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
      .replace('void main() {', `uniform sampler2D tMask, tDetail; uniform float uBump;
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
          gM = texture2D(tMask, (vWP.xz + ${HALF.toFixed(1)}) / ${SIZE.toFixed(1)});`)
      .replace('#include <map_fragment>', `#include <map_fragment>
          float gh = gH(vWP.xz);
          diffuseColor.rgb *= 0.66 + gh * 0.68;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 1.07, 0.82), smoothstep(0.55, 0.9, gh) * (1. - gM.r) * (1. - gM.g));
          diffuseColor.rgb *= mix(vec3(1.), vec3(0.8, 0.92, 1.02), gM.b);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { vec2 dx = dFdx(vWP.xz), dy = dFdy(vWP.xz);
            float h0 = gH(vWP.xz);
            vec2 dh = vec2(gH(vWP.xz + dx) - h0, gH(vWP.xz + dy) - h0) * uBump * (1. + gM.r * 0.8);
            normal = gPerturb(-vViewPosition, normal, dh, faceDirection); }`);
    if (water) fs = fs
      .replace('void main() {', `uniform sampler2D tWDepth; uniform vec3 uSky; uniform vec4 uPW;
        float wDepth;
        // hauteur des petites vagues + ronds concentriques autour du personnage quand il patauge
        float WH(vec2 q) {
          float h = sin(q.x*1.4 + uTime*1.2)*0.35 + sin(q.y*1.9 - uTime*0.9 + q.x*0.4)*0.3 + vn(q*1.1 + uTime*0.25)*0.9 + vn(q*3.3 - uTime*0.4)*0.35;
          float d = length(q - uPW.xy);
          h += uPW.z * sin(d * 6. - uTime * 6.) * exp(-d * 0.9) * smoothstep(0., 0.6, d) * 2.5;
          return h;
        }
        void main() {
          wDepth = texture2D(tWDepth, (vWP.xz + ${HALF.toFixed(1)}) / ${SIZE.toFixed(1)}).r * 3. - 0.5;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { // couleur et transparence selon la profondeur, écume le long des rives
          float dd = smoothstep(0., 1.3, wDepth);
          float seaK = texture2D(tWDepth, (vWP.xz + ${HALF.toFixed(1)}) / ${SIZE.toFixed(1)}).g;
          diffuseColor.rgb = mix(mix(vec3(0.11, 0.25, 0.19), vec3(0.025, 0.08, 0.1), dd), mix(vec3(0.16, 0.62, 0.6), vec3(0.02, 0.16, 0.32), smoothstep(0., 2.2, wDepth)), seaK);
          diffuseColor.a = mix(0.22, 0.9, smoothstep(0., 0.9 + seaK * 1.2, wDepth));
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
  mat.customProgramCacheKey = () => `p${wind}${flutter}${fakeNormal}${reveal}${!!ground}${water}${stone}${proc}`;
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
function makeWillow() {
  const gb = new GB(), parts = [], bark = col('#54402e');
  const H = R(2.3, 2.9), top = V(R(-.4, .4), H, R(-.4, .4));
  parts.push(cylBetween(V(0, -0.3, 0), top, 0.34, 0.2, bark, 7));
  const clumps = [{ c: top.clone().add(V(0, 1.3, 0)), r: 1.7 }];
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * 6.28 + R(-.3, .3), c = top.clone().add(V(Math.cos(a) * 1.6, 0.9, Math.sin(a) * 1.6));
    clumps.push({ c, r: R(1.1, 1.4) }); parts.push(cylBetween(top.clone().multiplyScalar(0.8), c.clone().multiplyScalar(0.85), 0.12, 0.05, bark, 5));
  }
  canopy(gb, clumps, PAL.willow, 0.85, 14);
  const lo = palCol(PAL.willow, 0.25), hi = palCol(PAL.willow, 0.85);
  for (let i = 0; i < 110; i++) {   // rideaux de branches pendantes
    const a = R(0, 6.28), d = R(1.3, 2.9), yTop = H + 1.9 - d * 0.45, L = R(0.8, 1.4);
    const out = V(Math.cos(a), 0, Math.sin(a)), tan = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(R(0.18, 0.3));
    const c = V(top.x + out.x * d, yTop - L, top.z + out.z * d);
    gb.quad(c, tan, V(out.x * 0.08, L, out.z * 0.08), V(out.x * 0.6, 0.55, out.z * 0.6).normalize(), [lo, lo, hi, hi]);
  }
  return { trunk: mergeGeometries(parts), leaves: gb.build(), birch: false, r: 0.42, ao: 3.2 };
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
function makeRock(shape, mossy, pale = false) {
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
  const grey = pale ? [col('#d9d2c0'), col('#cfc6b0'), col('#e2dccb')][rnd() * 3 | 0] : [col('#9a9384'), col('#8e8c84'), col('#a39682'), col('#8a8474'), col('#96907e')][rnd() * 5 | 0];
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
M.needles = patch(new THREE.MeshLambertMaterial({ map: needleTex, alphaTest: ALPHA, side: THREE.DoubleSide, vertexColors: true }), { wind: 0.008, flutter: true, fakeNormal: true, reveal: true });
M.water = patch(new THREE.MeshPhongMaterial({ color: 0x2a5a5c, specular: 0x5c5a52, shininess: 260, transparent: true, opacity: 1, depthWrite: false }), { water: true });
M.leaves.shadowSide = M.bush.shadowSide = M.needles.shadowSide = THREE.DoubleSide;
const DM = {
  leaves: depthMat(leafTex, ALPHA, 0.011, true),
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
  if (chalets.length) items = items.filter(it => !nearChalet(it.x, it.z)); if (!items.length) return;
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
  automne: { A: '#788a3a', B: '#a29a48', M: '#7a5430' },
  lande:   { A: '#74764a', B: '#8e8a58', M: '#6a5272' },
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
  automne: [['red', 0.5], ['gold', 0.32], ['oak', 0.08], ['birch', 0.1]],
  lande:   [['pine', 0.35], ['heather', 0.35], ['gorse', 0.3]],
  littoral: [['parasol', 0.38], ['olive', 0.34], ['cypress', 0.18], ['maquis', 0.1]],
};
const SHRUB = { foret: 'bush', pinede: 'bush', prairie: 'bush', marais: 'bush', automne: 'bush', lande: 'heather', littoral: 'lavender' };
const SOFT = new Set(['bush', 'heather', 'gorse', 'lavender', 'maquis']); // pas de collision
function rollKind(table) { let r = rnd(); for (const [k, p] of table) { r -= p; if (r <= 0) return k; } return table[0][0]; }

function generate(seed) {
  if (world) { world.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.geometry) o.geometry.dispose(); }); scene.remove(world); }
  world = new THREE.Group(); scene.add(world);
  rnd = mulberry32(seed); seedNoise(seed);
  pathPh = [R(0, 6.28), R(0, 6.28)];
  climOff = [R(-500, 500), R(-500, 500), R(-500, 500), R(-500, 500)];
  buildBiomeCache();
  // départ : sur le sentier, dans une forêt tempérée si possible, au plus près du centre
  let sz = 0, best = -1;
  for (let z = -HALF + 30; z < HALF - 30; z += 3) {
    const w = biomeW(pathX(z), z)[BI.foret] - Math.abs(z) / 400;
    if (w > best && height(pathX(z) + 6, z) > WL + 1) { best = w; sz = z; }
  }
  clearing.set(pathX(sz) + R(5, 8) * (rnd() < .5 ? -1 : 1), sz + R(-4, 4));
  trees = []; treeGrid.clear();
  // ── chalets : au bord du sentier, sur terrain plat et sec, tournés vers le chemin
  chalets = []; smokes.length = 0;
  for (let tries = 0; tries < 900 && chalets.length < 8; tries++) {
    const z = R(-HALF + 24, HALF - 24), side = rnd() < 0.5 ? -1 : 1, x = pathX(z) + side * R(7, 10);
    if (Math.abs(x) > HALF - 24) continue;
    const w = biomeW(x, z); if (w[BI.marais] > 0.25) continue;
    const hs = [[0, 0], [3, 3], [-3, 3], [3, -3], [-3, -3]].map(([a, b]) => height(x + a, z + b));
    if (Math.min(...hs) < WL + 1 || Math.max(...hs) - Math.min(...hs) > 0.9) continue;
    if (chalets.some(c => Math.hypot(c.x - x, c.z - z) < 38) || Math.hypot(x - clearing.x, z - clearing.y) < 14) continue;
    chalets.push({ x, z, y: hs.reduce((a, b) => a + b) / 5, ry: side * Math.PI / 2, side, vi: rnd() * 3 | 0 });
  }
  for (const c of chalets) {
    const k = key(c.x, c.z);
    for (const [a, b] of [[0, 0], [1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]]) {
      const kk = key(c.x + a, c.z + b); if (!treeGrid.has(kk)) treeGrid.set(kk, []); treeGrid.get(kk).push({ x: c.x + a, z: c.z + b, r: 1.7 });
    }
  }

  // ── arbres
  const protos = { oak: [], red: [], gold: [], birch: [], bush: [], pine: [], willow: [], heather: [], gorse: [], parasol: [], olive: [], cypress: [], lavender: [], maquis: [] };
  for (let i = 0; i < 4; i++) protos.oak.push(makeOak(false));
  for (let i = 0; i < 3; i++) protos.red.push(makeOak(true));
  for (let i = 0; i < 3; i++) protos.gold.push(makeOak(false, PAL.gold));
  for (let i = 0; i < 3; i++) protos.birch.push(makeBirch());
  for (let i = 0; i < 3; i++) protos.bush.push(makeBush());
  for (let i = 0; i < 4; i++) protos.pine.push(makePine());
  for (let i = 0; i < 2; i++) protos.willow.push(makeWillow());
  for (let i = 0; i < 3; i++) protos.heather.push(makeBush(PAL.heather, 0.42, 0.55));
  for (let i = 0; i < 2; i++) protos.gorse.push(makeBush(PAL.gorse, 0.45, 0.75));
  for (let i = 0; i < 3; i++) protos.parasol.push(makeParasol());
  for (let i = 0; i < 3; i++) protos.olive.push(makeOlive());
  for (let i = 0; i < 2; i++) protos.cypress.push(makeCypress());
  for (let i = 0; i < 2; i++) protos.lavender.push(makeBush(PAL.lavender, 0.32, 0.5));
  for (let i = 0; i < 2; i++) protos.maquis.push(makeBush(PAL.maquis, 0.4, 0.8));
  const place = Object.fromEntries(Object.entries(protos).map(([k, v]) => [k, v.map(() => [])]));
  const tint = () => new THREE.Color(R(0.85, 1.12), R(0.9, 1.1), R(0.8, 1.05));
  const addTree = (kind, x, z, h, sMin, sMax) => {
    const vi = rnd() * protos[kind].length | 0, pr = protos[kind][vi], s = R(sMin, sMax);
    const t = { x, z, y: h, s, ry: R(0, 6.28), c: tint(), r: pr.r * s, ao: pr.ao * s, kind };
    place[kind][vi].push(t); trees.push(t);
    if (!SOFT.has(kind)) { const k = key(x, z); if (!treeGrid.has(k)) treeGrid.set(k, []); treeGrid.get(k).push(t); }
  };
  const cell = 3.1;
  for (let gx = -HALF + 2; gx < HALF - 2; gx += cell) for (let gz = -HALF + 2; gz < HALF - 2; gz += cell) {
    const x = gx + R(0, cell), z = gz + R(0, cell), h = height(x, z), d = forestDensity(x, z, h);
    if (rnd() > d * 0.95) continue;
    const bi = pickBiome(x, z), bid = BIOMES[bi].id;
    let kind = rollKind(TREE_TABLE[bid]);
    if (bid === 'foret') kind = birchness(x, z) > 0.22 && rnd() < 0.8 ? 'birch' : kind === 'birch' ? 'oak' : kind;
    if (d < 0.45 && rnd() < 0.35 && !SOFT.has(kind)) kind = SHRUB[bid];
    addTree(kind, x, z, h, SOFT.has(kind) ? 0.8 : 0.8, SOFT.has(kind) ? 1.3 : 1.25);
  }
  // arbustes de lisière + bruyère et ajoncs de la lande
  for (let i = 0; i < 2800; i++) {
    const x = R(-HALF + 2, HALF - 2), z = R(-HALF + 2, HALF - 2), h = height(x, z), d = forestDensity(x, z, h);
    if (h < WL + 0.2 || d < 0.12 || d > 0.75 || rnd() > 0.55) continue;
    addTree(SHRUB[BIOMES[pickBiome(x, z)].id], x, z, h, 0.6, 1.2);
  }
  for (let i = 0; i < 9000; i++) {
    const x = R(-HALF + 2, HALF - 2), z = R(-HALF + 2, HALF - 2), wl = biomeW(x, z)[BI.lande];
    if (wl < 0.15 || rnd() > wl * 0.7 || pathDist(x, z) < 2) continue;
    if (fbm(x * 0.09 + 700, z * 0.09, 2) < -0.05) continue;
    const h = height(x, z); if (h < WL + 0.2) continue;
    addTree(rnd() < 0.72 ? 'heather' : 'gorse', x, z, h, 0.7, 1.5);
  }
  for (let i = 0; i < 6000; i++) {
    const x = R(-HALF + 2, HALF - 2), z = R(-HALF + 2, HALF - 2), ws = biomeW(x, z)[BI.littoral];
    if (ws < 0.15 || rnd() > ws * 0.8 || pathDist(x, z) < 2) continue;
    if (fbm(x * 0.07 + 611, z * 0.07, 2) < 0.05) continue;
    const h = height(x, z); if (h < WL + 1.0) continue;
    addTree(rnd() < 0.7 ? 'lavender' : 'maquis', x, z, h, 0.7, 1.4);
  }
  for (const kind in protos) protos[kind].forEach((pr, i) => {
    const items = place[kind][i]; if (!items.length) return;
    if (pr.trunk) instanced(pr.trunk, pr.birch ? M.birch : M.bark, items, { chunk: 18 });
    const soft = SOFT.has(kind);
    instanced(pr.leaves, pr.needles ? M.needles : soft ? M.bush : M.leaves, items, { depth: pr.needles ? DM.needles : soft ? DM.bush : DM.leaves, cast: !['heather', 'gorse', 'lavender'].includes(kind), chunk: 18 });
  });

  // ── sol (texture peinte + AO des arbres) et eau
  ground = buildGround();
  world.add(ground);
  for (const c of chalets) { const g = makeChalet(c.vi); g.position.set(c.x, c.y, c.z); g.rotation.y = c.ry; world.add(g); addSmoke(g); }
  { // profondeur d'eau (WL - relief) encodée sur 8 bits : 0 → -0,5 m, 1 → 2,5 m
    const WR = 512, data = new Uint8Array(WR * WR * 4);
    for (let j = 0; j < WR; j++) for (let i = 0; i < WR; i++) {
      const d = WL - height((i + 0.5) / WR * SIZE - HALF, (j + 0.5) / WR * SIZE - HALF), k = (j * WR + i) * 4;
      data[k] = clamp((d + 0.5) / 3) * 255; data[k + 1] = smooth(0.15, 0.4, biomeW((i + 0.5) / WR * SIZE - HALF, (j + 0.5) / WR * SIZE - HALF)[BI.littoral]) * 255; data[k + 3] = 255;
    }
    if (U.tWDepth.value) U.tWDepth.value.dispose();
    const t = new THREE.DataTexture(data, WR, WR); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
    U.tWDepth.value = t;
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2), M.water);
  water.position.y = WL; water.receiveShadow = true; world.add(water);

  // ── végétation basse
  const RX = () => R(-HALF + 1, HALF - 1);
  const grass = [], ferns = [], puffs = [], rocks = [], logs = [];
  const gcol = [col('#6aa23a'), col('#8cbc48'), col('#5a9236'), col('#aacb58')];
  for (let i = 0; i < 120000; i++) {
    const x = RX(), z = RX(), w = biomeW(x, z);
    let gm = 0;
    for (let k = 0; k < NB; k++) gm += w[k] * BIOMES[k].grass;
    if (rnd() * 2 > gm) continue;
    const h = height(x, z); if (h < WL + 0.05 || onBeach(x, z, h)) continue;
    const pd = pathDist(x, z), d = forestDensity(x, z, h), cl = fbm(x * 0.12, z * 0.12, 2);
    if (pd < 1.8 || litter(x, z) > 0.38) continue;
    if (cl < -0.2 + d * 0.25 - w[BI.prairie] * 0.4) continue;
    const tall = 1 + w[BI.prairie] * 0.9 + w[BI.marais] * 0.5;
    grass.push({ x, z, y: h - 0.03, s: R(0.8, 1.5), sy: R(0.7, 1.5) * tall, ry: R(0, 3.14), c: grassColorAt(x, z, d) });
  }
  for (let i = 0; i < 9000; i++) {
    const x = RX(), z = RX(), h = height(x, z), d = forestDensity(x, z, h), w = biomeW(x, z);
    if (d < 0.5 || rnd() > d - 0.2 - w[BI.lande] - w[BI.automne] * 0.5 || pathDist(x, z) < 2.2) continue;
    ferns.push({ x, z, y: h, s: R(0.8, 1.5), ry: R(0, 6.28), c: col('#4f8a2c').lerp(col('#86b043'), rnd()) });
  }
  // fleurs en massifs : chaque espèce suit son propre champ de bruit
  const FL = [
    { k: 0, off: 0, open: true }, { k: 1, off: 37, open: true }, { k: 2, off: 71, open: false },
    { k: 3, off: 113, open: true }, { k: 4, off: 157, open: true },
  ];
  const flowerSets = FL.map(() => []);
  for (let i = 0; i < 90000; i++) {
    const x = RX(), z = RX(), fm = bMix(x, z, 'flowers');
    if (rnd() * 3.2 > fm) continue;
    const h = height(x, z); if (h < WL + 0.1 || onBeach(x, z, h)) continue;
    const d = forestDensity(x, z, h);
    if (pathDist(x, z) < 1.7 || litter(x, z) > 0.34) continue;
    let best = -1, bf = 0.08;
    for (const f of FL) {
      if (f.open ? d > 0.5 : (d < 0.25 || d > 0.85)) continue;
      const v = fbm(x * 0.07 + f.off, z * 0.07 - f.off, 2); if (v > bf) { bf = v; best = f.k; }
    }
    if (best < 0 || rnd() > (bf - 0.04) * 3.5) continue;
    const wv = R(0.9, 1.1);
    flowerSets[best].push({ x, z, y: h - 0.02, s: R(1.1, 1.8), ry: R(0, 6.28), c: new THREE.Color(wv, wv, wv) });
  }
  const rosettes = [], rc = [col('#5f9b3a'), col('#7cab42'), col('#4b8034'), col('#93ba4c'), col('#6a8f3a')];
  for (let i = 0; i < 18000; i++) {
    const x = RX(), z = RX(), h = height(x, z);
    if (h < WL + 0.05 || onBeach(x, z, h) || pathDist(x, z) < 1.5 || rnd() > 0.35 + fbm(x * 0.1 + 200, z * 0.1, 2)) continue;
    const d = forestDensity(x, z, h);
    rosettes.push({ x, z, y: h, s: R(0.7, 1.5), ry: R(0, 6.28), c: rc[rnd() * 5 | 0].clone().multiplyScalar(R(0.85, 1.1) * (1 - d * 0.15)) });
  }
  const mushR = [], mushB = [];
  for (const t of trees) {
    if (SOFT.has(t.kind) || rnd() > (t.kind === 'pine' ? 0.32 : 0.15)) continue;
    const n = 2 + (rnd() * 5 | 0), a0 = R(0, 6.28), red = rnd() < 0.35;
    for (let k = 0; k < n; k++) {
      const a = a0 + R(-0.6, 0.6), dd = t.r + R(0.25, 0.9), x = t.x + Math.cos(a) * dd, z = t.z + Math.sin(a) * dd;
      (red ? mushR : mushB).push({ x, z, y: height(x, z) - 0.02, s: R(0.7, 1.4), ry: R(0, 6.28), rx: R(-0.15, 0.15), c: new THREE.Color().setScalar(R(0.85, 1.1)) });
    }
  }
  for (let i = 0; i < 1600; i++) {
    const x = RX(), z = RX(), wp = biomeW(x, z)[BI.prairie];
    if (rnd() > 0.12 + wp * 0.5) continue;
    const h = height(x, z);
    if (h < WL + 0.1 || forestDensity(x, z, h) > 0.5 || pathDist(x, z) < 2) continue;
    puffs.push({ x, z, y: h - 0.02, s: R(0.85, 1.25), ry: R(0, 6.28), bloom: rnd() < 0.45, c: new THREE.Color(1, 1, 1) });
  }
  // rochers : variantes moussues (forêts, marais) et nues à lichen (lande), amas dans la lande
  const RSH = ['boulder', 'slab', 'spire', 'round'];
  const rockProtos = [];
  for (let i = 0; i < 12; i++) rockProtos.push(makeRock(RSH[i % 4], i < 6));
  const rockSets = rockProtos.map(() => []);
  const addRock = (x, z, s, mossy, shape) => {
    const cand = rockProtos.map((r, i) => i).filter(i => (i < 6) === mossy && (!shape || RSH[i % 4] === shape));
    const vi = cand[rnd() * cand.length | 0], pr = rockProtos[vi], h = height(x, z);
    if (h < WL - 0.6) return;
    rockSets[vi].push({ x, z, y: h + pr.base * s - 0.06 * s, s, ry: R(0, 6.28), rx: R(-0.08, 0.08), rz: R(-0.08, 0.08), c: new THREE.Color(R(.9, 1.06), R(.92, 1.05), R(.9, 1.04)) });
    if (s > 1.1) { const k = key(x, z); if (!treeGrid.has(k)) treeGrid.set(k, []); treeGrid.get(k).push({ x, z, r: s * pr.foot * 0.75 }); }
  };
  for (let i = 0; i < 2600; i++) {
    const x = RX(), z = RX(), w = biomeW(x, z), wl = w[BI.lande] + w[BI.pinede] * 0.3;
    if (rnd() > 0.12 + wl * 0.9 || pathDist(x, z) < 1.6) continue;
    const mossy = w[BI.lande] < 0.45 && rnd() < 0.9;
    const big = rnd() < 0.08 + wl * 0.25, s = R(0.25, 0.85) * (big ? R(2, 3.2) : 1);
    addRock(x, z, s, mossy);
    // petits éboulis autour des gros blocs
    if (big) for (let k = 0, n = 2 + (rnd() * 4 | 0); k < n; k++) { const a = R(0, 6.28), d = s * R(0.9, 1.6); addRock(x + Math.cos(a) * d, z + Math.sin(a) * d, R(0.2, 0.5), mossy); }
  }
  // calcaire blanc du littoral : rochers au bord de l'eau et dans la garrigue
  const paleP = RSH.map(sh => makeRock(sh, false, true)), paleSets = paleP.map(() => []);
  for (let i = 0; i < 5000; i++) {
    const x = RX(), z = RX(), ws = biomeW(x, z)[BI.littoral]; if (ws < 0.2) continue;
    const h = height(x, z), shore = smooth(WL + 2.5, WL + 0.2, h) * smooth(WL - 1.2, WL - 0.2, h);
    if (rnd() > 0.04 + shore * 0.35 || pathDist(x, z) < 2) continue;
    const vi = rnd() * 4 | 0, pr = paleP[vi], sc = R(0.3, 1.1) * (rnd() < 0.15 + shore * 0.3 ? R(1.8, 3) : 1);
    paleSets[vi].push({ x, z, y: h + pr.base * sc - 0.1 * sc, s: sc, ry: R(0, 6.28), rx: R(-0.1, 0.1), rz: R(-0.1, 0.1), c: new THREE.Color().setScalar(R(0.92, 1.05)) });
    if (sc > 1.1 && h > WL - 0.3) { const k = key(x, z); if (!treeGrid.has(k)) treeGrid.set(k, []); treeGrid.get(k).push({ x, z, r: sc * pr.foot * 0.75 }); }
  }
  paleP.forEach((r, i) => paleSets[i].length && instanced(r.geo, M.stone, paleSets[i]));
  // chaos rocheux (tors) de la lande : un gros bloc, des dalles empilées autour
  for (let i = 0; i < 900; i++) {
    const x = RX(), z = RX(), wl = biomeW(x, z)[BI.lande];
    if (wl < 0.4 || rnd() > 0.09 || pathDist(x, z) < 4) continue;
    const s = R(2.2, 3.6); addRock(x, z, s, false, rnd() < 0.5 ? 'spire' : 'boulder');
    for (let k = 0, n = 2 + (rnd() * 3 | 0); k < n; k++) { const a = R(0, 6.28), d = s * R(0.8, 1.3); addRock(x + Math.cos(a) * d, z + Math.sin(a) * d, s * R(0.4, 0.75), false, rnd() < 0.6 ? 'slab' : 'boulder'); }
  }
  for (let i = 0; i < 200; i++) {
    const x = R(-HALF + 3, HALF - 3), z = R(-HALF + 3, HALF - 3), h = height(x, z);
    if (forestDensity(x, z, h) < 0.4 || pathDist(x, z) < 3) continue;
    logs.push({ x, z, y: h + 0.16, s: R(0.9, 1.2), sy: R(2.5, 4.5), rz: Math.PI / 2, ry: R(0, 6.28), rx: 0, c: new THREE.Color().setScalar(R(0.85, 1.1)) });
  }
  // marais et rives : roseaux, nénuphars
  const reeds = [], lilies = [];
  for (let i = 0; i < 40000; i++) {
    const x = RX(), z = RX(), h = height(x, z);
    if (h > WL + 0.45 || h < WL - 0.4 || biomeW(x, z)[BI.littoral] > 0.12) continue;
    if (rnd() > 0.55 || fbm(x * 0.12 + 900, z * 0.12, 2) < -0.1) continue;
    reeds.push({ x, z, y: h - 0.05, s: R(0.8, 1.3), sy: R(0.8, 1.5), ry: R(0, 3.14), c: new THREE.Color().setScalar(R(0.8, 1.1)) });
  }
  for (let i = 0; i < 30000; i++) {
    const x = RX(), z = RX(), h = height(x, z);
    if (h > WL - 0.3 || rnd() > 0.5 || fbm(x * 0.1 + 950, z * 0.1, 2) < 0 || biomeW(x, z)[BI.littoral] > 0.12) continue;
    lilies.push({ x, z, y: WL + 0.015, s: R(0.6, 1.3), ry: R(0, 6.28), c: new THREE.Color(R(0.85, 1.1), R(0.9, 1.1), R(0.8, 1)) });
  }
  instanced(makeGrass(), M.grass, grass, { cast: false });
  instanced(makeFern(), M.fern, ferns, { cast: false });
  FL.forEach(f => instanced(makeFlowerTuft(f.k), M.flora, flowerSets[f.k], { cast: false }));
  instanced(makeRosette(), M.flora, rosettes, { cast: false });
  instanced(makeReeds(), M.flora, reeds, { cast: false });
  instanced(makeLily(), M.flora, lilies, { cast: false });
  // feuilles mortes à plat et cailloux du chemin
  const deadLeaves = [], pebbles = [];
  const lc = [col('#c8752e'), col('#9c4d22'), col('#e0a040'), col('#6a3c22'), col('#b8862f'), col('#8a9a3a')];
  const needleC = [col('#7a5a36'), col('#8a6a40'), col('#5e4630')];
  for (let i = 0; i < 60000; i++) {
    const x = RX(), z = RX(), lt = litter(x, z), d = forestDensity(x, z);
    const pr = lt > 0.3 ? 0.9 : d > 0.55 ? 0.12 : pathDist(x, z) < 2 ? 0.05 : 0.015;
    if (rnd() > pr) continue;
    const h = height(x, z); if (h < WL + 0.05) continue;
    const pine = biomeW(x, z)[BI.pinede] > 0.5;
    deadLeaves.push({ x, z, y: h + 0.01, s: R(0.8, 1.4), ry: R(0, 6.28), rx: R(-0.25, 0.25), c: (pine ? needleC[rnd() * 3 | 0] : lc[rnd() * 6 | 0]).clone().multiplyScalar(R(0.8, 1.15)) });
  }
  for (let i = 0; i < 1900; i++) {
    const z = RX(), x = pathX(z) + R(-1.9, 1.9) * Math.sqrt(rnd());
    const s = R(0.04, 0.1) * (rnd() < 0.06 ? 2 : 1);
    pebbles.push({ x, z, y: height(x, z) + s * 0.1, s, sy: s * R(0.4, 0.7), ry: R(0, 6.28), c: new THREE.Color(R(0.75, 1.0), R(0.68, 0.9), R(0.55, 0.72)) });
  }
  instanced(makeDeadLeaf(), M.flora, deadLeaves, { cast: false });
  instanced(new THREE.DodecahedronGeometry(1, 0), M.rock, pebbles, { cast: false });
  instanced(makeMushroom('amanite'), M.mush, mushR, { cast: false });
  instanced(makeMushroom('cepe'), M.mush, mushB.filter((m, i) => i % 2), { cast: false });
  instanced(makeMushroom('mycene'), M.mush, mushB.filter((m, i) => !(i % 2)), { cast: false });
  for (const bl of [false, true]) {
    const set = puffs.filter(p => p.bloom === bl);
    instanced(makeDandelionStem(bl), M.mush, set, { cast: false });
    instanced(makeDandelionHead(bl), M.dand, set, { cast: false });
    instanced(makeRosette(), M.flora, set.map(p => ({ ...p, s: p.s * 0.55, c: col('#5f9b3a') })), { cast: false });
  }
  rockProtos.forEach((r, i) => {
    const big = rockSets[i].filter(it => it.s > 0.6), small = rockSets[i].filter(it => it.s <= 0.6);
    if (big.length) instanced(r.geo, M.stone, big);
    if (small.length) instanced(r.geo, M.stone, small, { cast: false });
  });
  instanced(makeLog(), M.log, logs);

  player.position.set(clearing.x, height(clearing.x, clearing.y), clearing.y);
  camTarget.copy(player.position); camFree = false; showFollow();
  buildMinimap();
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

function buildGround() {
  const RES = 2048, MR = 1024, c = document.createElement('canvas'); c.width = c.height = RES;
  const g = c.getContext('2d'), img = g.createImageData(RES, RES), D = img.data;
  // AO des arbres
  const AR = 512, ao = new Float32Array(AR * AR);
  for (const t of trees) {
    const cx = (t.x + HALF) / SIZE * AR, cz = (t.z + HALF) / SIZE * AR, rr = t.ao / SIZE * AR;
    for (let y = Math.max(0, cz - rr | 0); y < Math.min(AR, cz + rr + 1); y++)
      for (let x = Math.max(0, cx - rr | 0); x < Math.min(AR, cx + rr + 1); x++) {
        const d = Math.hypot(x - cx, y - cz) / rr; if (d < 1) ao[y * AR + x] += (1 - d) * (1 - d) * 0.55;
      }
  }
  const C = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
  const GP = GROUND_PAL;
  const PA = BIOMES.map(b => C(GP[b.id].A)), PB = BIOMES.map(b => C(GP[b.id].B)), PM = BIOMES.map(b => C(GP[b.id].M));
  // champs lents en demi-résolution
  const N = MR * MR, cA = new Uint8ClampedArray(N * 3), cB = new Uint8ClampedArray(N * 3), cM = new Uint8ClampedArray(N * 3);
  const dens = new Float32Array(N), dry = new Float32Array(N), hgt = new Float32Array(N), lit = new Float32Array(N), rock = new Float32Array(N), n1a = new Float32Array(N), wpin = new Float32Array(N), wsea = new Float32Array(N);
  const w = new Float32Array(NB);
  for (let j = 0; j < MR; j++) for (let i = 0; i < MR; i++) {
    const x = i / MR * SIZE - HALF, z = j / MR * SIZE - HALF, q = j * MR + i;
    biomeW(x, z, w);
    let a0 = 0, a1 = 0, a2 = 0, b0 = 0, b1 = 0, b2 = 0, m0 = 0, m1 = 0, m2 = 0;
    for (let k = 0; k < NB; k++) { a0 += w[k] * PA[k][0]; a1 += w[k] * PA[k][1]; a2 += w[k] * PA[k][2]; b0 += w[k] * PB[k][0]; b1 += w[k] * PB[k][1]; b2 += w[k] * PB[k][2]; m0 += w[k] * PM[k][0]; m1 += w[k] * PM[k][1]; m2 += w[k] * PM[k][2]; }
    cA[q * 3] = a0; cA[q * 3 + 1] = a1; cA[q * 3 + 2] = a2; cB[q * 3] = b0; cB[q * 3 + 1] = b1; cB[q * 3 + 2] = b2; cM[q * 3] = m0; cM[q * 3 + 1] = m1; cM[q * 3 + 2] = m2;
    const wl = w[BI.lande]; wpin[q] = w[BI.pinede];
    const h = height(x, z); hgt[q] = h;
    dens[q] = forestDensity(x, z, h); dry[q] = fbm(x * 0.04 + 70, z * 0.04 - 33, 3) + w[BI.prairie] * 0.2;
    lit[q] = litter(x, z); n1a[q] = fbm(x * 0.06, z * 0.06, 3);
    const wsl = w[BI.littoral]; wsea[q] = wsl;
    rock[q] = (wl > 0.05 ? wl * smooth(0.0, 0.3, fbm(x * 0.08 + 500, z * 0.08, 3)) : 0) + (wsl > 0.05 ? wsl * 0.6 * smooth(0.1, 0.4, fbm(x * 0.09 + 520, z * 0.09, 3)) : 0);
  }
  const mc = document.createElement('canvas'); mc.width = mc.height = MR;
  const mg = mc.getContext('2d'), mimg = mg.createImageData(MR, MR), MD = mimg.data;

  const sr = mulberry32(7);
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const gDry = C('#93a94c'), dA = C('#8a5a34'), dB = C('#6a4128'), pa = C('#a8835a'), pb = C('#7a573a'), pRut = C('#5c4330'), pEdge = C('#5f5a32');
  const sandA = C('#ecdcb0'), sandB = C('#dcc796'), sandW = C('#b59f72'), sandBed = C('#d8cfa2'), needleG = C('#7a5c3a'), rockC = C('#8c8a7e'), wet = C('#33402c'), bed = C('#3c4a3a');
  const leafs = [C('#c8752e'), C('#9c4d22'), C('#e0a040'), C('#5a3420'), C('#b8862f')];
  for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
    const x = i / RES * SIZE - HALF, z = j / RES * SIZE - HALF;
    const q = (j >> 1) * MR + (i >> 1), d = dens[q], h = hgt[q];
    const n1 = n1a[q], n2 = noise(x * 0.35, z * 0.35), fine = sr();
    const A = [cA[q * 3], cA[q * 3 + 1], cA[q * 3 + 2]], B = [cB[q * 3], cB[q * 3 + 1], cB[q * 3 + 2]], Mo = [cM[q * 3], cM[q * 3 + 1], cM[q * 3 + 2]];
    // herbe : base marbrée + zones sèches au soleil + mousse / aiguilles sous les arbres
    let col3 = mix3(A, B, clamp(0.5 + n1 * 0.8 + n2 * 0.25));
    col3 = mix3(col3, mix3(A, [0, 0, 0], 0.25), clamp(-n1 * 2 - 0.2) * 0.6);
    col3 = mix3(col3, gDry, smooth(0.1, 0.45, dry[q]) * (1 - d) * 0.75);
    col3 = mix3(col3, Mo, smooth(0.35, 0.9, d) * 0.6);
    // affleurements rocheux (lande)
    const Rk = smooth(0.25, 0.55, rock[q] + n2 * 0.1);
    if (Rk > 0) col3 = mix3(col3, rockC, Rk * (0.85 + (fine - 0.5) * 0.2));
    // litière de feuilles
    const L = smooth(0.26, 0.36, lit[q] + n2 * 0.08);
    if (L > 0) {
      const lt = clamp(0.5 + n2); let lc = fine < 0.35 ? leafs[(sr() * 5) | 0] : mix3(dA, dB, lt);
      if (wpin[q] > 0.05) lc = mix3(lc, mix3(needleG, dB, fine), smooth(0.1, 0.6, wpin[q]));
      col3 = mix3(col3, lc, L);
    }
    // rives humides et fond des étangs
    const Wt = smooth(WL + 0.5, WL + 0.02, h + n2 * 0.06);
    const sea = smooth(0.12, 0.35, wsea[q]);
    if (sea > 0) {   // plage : sable clair au-dessus de l'eau, sable mouillé au bord, fond sableux turquoise
      const beach = smooth(WL + 1.6, WL + 0.9, h + n2 * 0.25) * sea;
      col3 = mix3(col3, mix3(sandA, sandB, clamp(0.5 + n2 * 0.8 + (fine - 0.5) * 0.3)), beach);
    }
    if (Wt > 0) { col3 = mix3(col3, mix3(wet, sandW, sea), Wt * 0.7); col3 = mix3(col3, mix3(bed, sandBed, sea), smooth(WL, WL - 0.4, h)); }
    // sentier : bord sombre et humide, centre clair, deux ornières, bande d'herbe au milieu
    const sx = x - pathX(z), pd = Math.abs(sx) + n2 * 0.7;
    const P = 1 - smooth(0.9, 2.3, pd);
    if (P > 0) {
      const pt = clamp(0.5 + n2 * 0.9 + (fine - 0.5) * 0.4);
      let pc = mix3(pa, pb, pt);
      const rut = Math.exp(-(((Math.abs(sx) - 0.62) / 0.2) ** 2)) * (0.6 + 0.4 * noise(z * 0.5, 3));
      pc = mix3(pc, pRut, rut * 0.55);
      pc = mix3(pc, B, Math.exp(-((sx / 0.22) ** 2)) * clamp(0.3 + noise(z * 0.3, 9) * 0.8) * 0.7);
      col3 = mix3(col3, pc, P);
      col3 = mix3(col3, pEdge, Math.exp(-(((pd - 1.9) / 0.35) ** 2)) * 0.35);
    }
    for (const c of chalets) {
      const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz > 400) continue;
      const door = c.x - c.side * 3.2, pz = c.z;                       // porte → sentier principal
      const tx = clamp((x - door) / (pathX(pz) - door)), sd = Math.hypot(x - lerp(door, pathX(pz), tx), z - pz);
      const yard = smooth(5.5, 3.2, Math.hypot(dx, dz) + n2 * 0.6), trail = smooth(0.9, 0.5, sd + n2 * 0.25);
      const k = Math.max(yard * 0.75, trail);
      if (k > 0) col3 = mix3(col3, mix3(pa, pb, clamp(0.5 + n2)), k);
    }
    const gr = 1 + (fine - 0.5) * 0.12;
    if (fine > 0.9985 && P < 0.3 && Wt < 0.3) col3 = [235, 240, 215];
    const a = 1 - Math.min(0.62, ao[(j * AR / RES | 0) * AR + (i * AR / RES | 0)]);
    const k = (j * RES + i) * 4;
    D[k] = col3[0] * gr * a; D[k + 1] = col3[1] * gr * a; D[k + 2] = col3[2] * gr * (a * 0.9 + 0.1); D[k + 3] = 255;
    // masque (quart de résolution) : R gravier (chemin, rochers), G litière, B mousse
    if (!(i & 1) && !(j & 1)) { const m = q * 4; MD[m] = Math.max(P, Rk) * 255; MD[m + 1] = L * 255; MD[m + 2] = smooth(0.35, 0.9, d) * 255; MD[m + 3] = 255; }
  }
  g.putImageData(img, 0, 0); mg.putImageData(mimg, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mask = new THREE.CanvasTexture(mc); mask.flipY = false;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, 360, 360); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const mat = patch(new THREE.MeshLambertMaterial({ map: tex }), { ground: { mask, detail: groundDetail } });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

// ── mini-carte des biomes
const mini = document.getElementById('minimap'), miniCtx = mini.getContext('2d');
let miniBase = null, lastBiome = -1, miniT = 0;
function buildMinimap() {
  const S = 200, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), im = g.createImageData(S, S), w = new Float32Array(NB);
  const mc = BIOMES.map(b => new THREE.Color(b.map));
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = (i + 0.5) / S * SIZE - HALF, z = (j + 0.5) / S * SIZE - HALF, h = height(x, z);
    biomeW(x, z, w);
    let r = 0, gg = 0, b = 0; for (let k = 0; k < NB; k++) { r += w[k] * mc[k].r; gg += w[k] * mc[k].g; b += w[k] * mc[k].b; }
    const sh = 1 - forestDensity(x, z, h) * 0.35 + (h - WL) * 0.015;
    let c3 = [r * sh, gg * sh, b * sh];
    if (h < WL) c3 = [0.24, 0.48, 0.56];
    if (pathDist(x, z) < 1.3) c3 = [0.75, 0.6, 0.42];
    const k = (j * S + i) * 4;
    im.data[k] = clamp(c3[0]) * 255; im.data[k + 1] = clamp(c3[1]) * 255; im.data[k + 2] = clamp(c3[2]) * 255; im.data[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  g.fillStyle = '#6a3a22'; g.strokeStyle = '#f4e6c8'; g.lineWidth = 1;
  for (const c of chalets) { const px = (c.x + HALF) / SIZE * S, pz = (c.z + HALF) / SIZE * S; g.fillRect(px - 2.5, pz - 2.5, 5, 5); g.strokeRect(px - 2.5, pz - 2.5, 5, 5); }
  miniBase = cv; lastBiome = -1;
}
// clic sur la mini-carte : téléportation (sur la terre ferme la plus proche)
function teleport(x, z) {
  for (let r = 0; r < 30; r += 1.5) for (let a = 0; a < 6.28; a += 0.7) {
    const tx = clamp(x + Math.cos(a) * r, -HALF + 19, HALF - 19), tz = clamp(z + Math.sin(a) * r, -HALF + 15, HALF - 15);
    if (!blocked(tx, tz) && height(tx, tz) > WL + 0.1) {
      player.position.set(tx, height(tx, tz), tz); camTarget.copy(player.position); moveTo = null; return;
    }
    if (r === 0) break;
  }
}
function goToBiome(bi) {
  let best = -1, bx = 0, bz = 0;
  for (let z = -HALF + 20; z < HALF - 20; z += 4) for (let x = -HALF + 22; x < HALF - 22; x += 4) {
    const w = biomeW(x, z)[bi] - Math.hypot(x - player.position.x, z - player.position.z) / 2000;
    if (w > best && height(x, z) > WL + 0.4) { best = w; bx = x; bz = z; }
  }
  teleport(bx, bz);
}
window.canopee = { goToBiome, renderer, scene, U, sun, get PRESETS() { return PRESETS; }, setPlanche: on => setPlanche(on), get cur() { return cur; },
  stats() { let n = 0, inst = 0, tris = 0; scene.traverse(o => { if (o.isMesh) { n++; if (o.isInstancedMesh) { inst += o.count; } } }); return { meshes: n, instances: inst, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; } };
mini.addEventListener('click', e => {
  const b = mini.getBoundingClientRect();
  teleport((e.clientX - b.left) / b.width * SIZE - HALF, (e.clientY - b.top) / b.height * SIZE - HALF);
});
function drawMinimap(now) {
  if (!miniBase || now - miniT < 100) return; miniT = now;
  const S = mini.width, k = S / SIZE;
  miniCtx.drawImage(miniBase, 0, 0, S, S);
  const px = (player.position.x + HALF) * k, pz = (player.position.z + HALF) * k;
  miniCtx.save(); miniCtx.translate(px, pz);
  // cône de vue
  miniCtx.rotate(-camYaw);
  miniCtx.fillStyle = 'rgba(255,255,240,.22)';
  miniCtx.beginPath(); miniCtx.moveTo(0, 0); miniCtx.lineTo(-14, -26); miniCtx.lineTo(14, -26); miniCtx.closePath(); miniCtx.fill();
  miniCtx.restore();
  miniCtx.fillStyle = '#fff'; miniCtx.strokeStyle = '#2a1a10'; miniCtx.lineWidth = 2;
  miniCtx.beginPath(); miniCtx.arc(px, pz, 4, 0, 7); miniCtx.fill(); miniCtx.stroke();
  const b = biomeArgmax(player.position.x, player.position.z);
  if (b !== lastBiome) {
    lastBiome = b; const el = document.getElementById('biome');
    el.textContent = BIOMES[b].name; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
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
  { id: 'lanterniere', name: 'Lanternière' },
  { id: 'totem', name: 'Totem' },
  { id: 'masque', name: "Masque d'oiseau" },
  { id: 'moine', name: 'Moine au halo' },
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
  } else if (id === 'lanterniere') {
    add(lathe([[0, 0], [0.31, 0], [0.33, 0.08], [0.25, 0.4], [0.16, 0.7], [0, 0.76]]), charMat('#5eaaa0'));
    add(lathe([[0, 0], [0.34, 0], [0.32, 0.04], [0, 0.05]]), charMat('#3f8079'), 0, 0.02, 0);
    add(new THREE.SphereGeometry(0.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), charMat('#3f8079'), 0, 0.82, 0.01);
    add(new THREE.SphereGeometry(0.115, 14, 10), charMat('#f5e2cf'), 0, 0.83, -0.115);
    const stick = new THREE.Group(); stick.position.set(0.22, 0.45, -0.12); group.add(stick);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), charMat('#6b4e3a'), 0, 0.42, 0, stick).rotation.z = -0.2;
    const lamp = new THREE.Group(); lamp.position.set(0.1, 0.86, 0); stick.add(lamp);
    add(new THREE.OctahedronGeometry(0.1, 0), charMat('#ffd27a', 1.4), 0, -0.12, 0, lamp);
    add(new THREE.ConeGeometry(0.06, 0.05, 4), charMat('#3f8079'), 0, -0.02, 0, lamp);
    anims.push((t, w) => { lamp.rotation.z = Math.sin(t * 2 + w * 0.5) * 0.25; });
  } else if (id === 'totem') {
    add(new THREE.CylinderGeometry(0.18, 0.24, 0.62, 6), charMat('#e9c46a'), 0, 0.31, 0);
    add(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 6), charMat('#2a9d8f'), 0, 0.5, 0);
    const head = add(new THREE.BoxGeometry(0.28, 0.28, 0.28), charMat('#f4a261'), 0, 0.82, 0);
    head.rotation.set(0.62, Math.PI / 4, 0);
    add(new THREE.ConeGeometry(0.17, 0.34, 4), charMat('#264653'), 0, 1.15, 0).rotation.y = Math.PI / 4;
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.05, 0.02), charMat('#264653'), sx * 0.07, 0.84, -0.2);
    anims.push((t, w) => { head.rotation.y = Math.PI / 4 + Math.sin(t * 0.7) * 0.2; });
  } else if (id === 'masque') {
    add(lathe([[0, 0], [0.27, 0], [0.25, 0.1], [0.14, 0.62], [0.09, 0.8], [0, 0.82]]), charMat('#3d405b'));
    const cape = add(lathe([[0.3, 0.3], [0.22, 0.55], [0.12, 0.75], [0, 0.78]], 24), charMat('#81b29a'));
    add(new THREE.SphereGeometry(0.15, 16, 12), charMat('#3d405b'), 0, 0.93, 0);
    add(new THREE.ConeGeometry(0.075, 0.3, 16).rotateX(-Math.PI / 2), charMat('#f4f1de'), 0, 0.91, -0.24);
    add(new THREE.SphereGeometry(0.09, 12, 8), charMat('#f4f1de'), 0, 0.93, -0.09).scale.set(1.3, 1, 0.6);
    for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.022, 8, 6), charMat('#1d1d2b'), sx * 0.06, 0.96, -0.14);
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), charMat('#81b29a'), 0, 1.07, 0);
    anims.push((t, w) => { cape.rotation.y = Math.sin(w * 0.5) * 0.12; });
  } else { // moine
    add(lathe([[0, 0], [0.36, 0], [0.34, 0.1], [0.26, 0.55], [0.17, 0.78], [0, 0.8]], 8), charMat('#c9a27e'));
    add(new THREE.TorusGeometry(0.2, 0.035, 6, 8).rotateX(Math.PI / 2), charMat('#8c5e3c'), 0, 0.45, 0);
    add(new THREE.SphereGeometry(0.14, 16, 12), charMat('#f2d0b5'), 0, 0.92, 0);
    const halo = add(new THREE.TorusGeometry(0.17, 0.02, 6, 28), charMat('#ffe39a', 0.9), 0, 1.16, 0.02);
    halo.rotation.x = Math.PI / 2 - 0.25; halo.castShadow = false;
    anims.push((t, w) => { halo.position.y = 1.16 + Math.sin(t * 1.8) * 0.025; halo.rotation.z = t * 0.6; });
  }
  group.traverse(o => { if (o.isMesh) o.userData.char = true; });
  return { group, gait, anim: (t, w) => anims.forEach(f => f(t, w)) };
}
const player = new THREE.Group();
let charId = 'lapin';
try { charId = localStorage.getItem('canopee.char2') || charId; } catch (e) {}
function setCharacter(id) {
  if (!CHARS.some(c => c.id === id)) id = CHARS[0].id;
  charId = id;
  if (player.userData.char) player.remove(player.userData.char.group);
  player.userData.char = makeCharacter(id);
  player.add(player.userData.char.group);
  try { localStorage.setItem('canopee.char2', id); } catch (e) {}
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
  const n = Math.round(MOTES * p.motes.amount); moteGeo.setDrawRange(0, n);
  moteMat.size = p.motes.size * Math.max(1, Math.round(3 / p.pixel)); moteMat.color.set(p.motes.color);
  const fire = p.motes.kind === 'fireflies';
  for (let i = 0; i < n; i++) {
    const s = moteSeed.subarray(i * 4, i * 4 + 4);
    const bx = (s[0] - 0.5) * 44, bz = (s[1] - 0.5) * 34;
    let x = camTarget.x + ((bx + Math.sin(t * 0.13 + s[2] * 20) * 2 - camTarget.x % 44 + 66) % 44 - 22);
    let z = camTarget.z + ((bz + Math.cos(t * 0.11 + s[3] * 20) * 2 - camTarget.z % 34 + 51) % 34 - 17);
    const y = height(x, z) + (fire ? 0.4 + s[2] * 2.2 : 0.6 + s[3] * 6) + Math.sin(t * 0.5 + s[0] * 30) * 0.4;
    moteP[i * 3] = x; moteP[i * 3 + 1] = y; moteP[i * 3 + 2] = z;
    const b = fire ? Math.pow(Math.max(0, Math.sin(t * (0.6 + s[3]) + s[1] * 40)), 6) : 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * (0.8 + s[2] * 1.5) + s[0] * 50)), 3);
    moteC[i * 3] = moteC[i * 3 + 1] = moteC[i * 3 + 2] = b;
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
    pixel: 1, levels: 0, dither: 0, outline: 0.55, tilt: 1, cloud: 0.3, wind: 1, bloom: 0, vig: 0.25,
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
PRESETS.forEach(p => { p.reveal = 0.55; p.bump = 1.3; });
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
  lantern.intensity = p.lantern; lanternGlow.visible = p.lantern > 0 && charId !== 'lanterniere';
  if (charId === 'lanterniere') lantern.position.set(0.38, 1.25, -0.12); else lantern.position.set(0.35, 0.75, -0.25);
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
  camera.position.copy(camTarget).add(off); camera.lookAt(camTarget); camera.updateMatrixWorld();
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
let moveTo = null, walkT = 0;
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
    camYawT -= dx * 0.004; camPitchT = clamp(camPitchT + dy * 0.003, 0.6, 1.45);
    return;
  }
  pp.x = e.clientX; pp.y = e.clientY;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
  drag.moved = true; canvas.style.cursor = 'grabbing';
  camYawT -= dx * 0.006; camPitchT = clamp(camPitchT + dy * 0.004, 0.6, 1.45);
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (ptrs.size === 0) {
    if (drag && !drag.moved && e.button === 0) {
      ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(ground, false)[0];
      if (hit) { moveTo = hit.point.clone(); follow(); }
    }
    drag = null; canvas.style.cursor = '';
  }
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
function follow() { camFree = false; showFollow(); }
function showFollow() { const b = document.getElementById('follow'); if (b) b.style.display = camFree ? '' : 'none'; }
addEventListener('keydown', e => { if (e.code === 'Space' && e.target.tagName !== 'INPUT') { follow(); e.preventDefault(); } });
function blocked(x, z) {
  if (Math.abs(x) > HALF - 18 || Math.abs(z) > HALF - 14) return true;
  if (height(x, z) < WL - 0.35) return true; // eau trop profonde
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const l = treeGrid.get(`${Math.floor(x / 4) + i},${Math.floor(z / 4) + j}`); if (!l) continue;
    for (const t of l) if (Math.hypot(t.x - x, t.z - z) < t.r + 0.3) return true;
  }
  return false;
}
function updatePlayer(dt) {
  if (keys.has('KeyQ')) camYawT += dt * 1.6;
  if (keys.has('KeyE')) camYawT -= dt * 1.6;
  if (keys.has('KeyR')) camPitchT = clamp(camPitchT + dt * 0.8, 0.6, 1.45);
  if (keys.has('KeyF')) camPitchT = clamp(camPitchT - dt * 0.8, 0.6, 1.45);
  camYaw += (camYawT - camYaw) * Math.min(1, dt * 8);
  camPitch += (camPitchT - camPitch) * Math.min(1, dt * 8);
  camDist += (camDistT - camDist) * Math.min(1, dt * 8);
  let mx = 0, mz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) mz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) mz += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  let dx = 0, dz = 0;
  if (mx || mz) {
    moveTo = null; if (camFree) follow();
    const c = Math.cos(camYaw), s = Math.sin(camYaw);
    dx = mx * c + mz * s; dz = -mx * s + mz * c;
  } else if (moveTo) {
    dx = moveTo.x - player.position.x; dz = moveTo.z - player.position.z;
    if (Math.hypot(dx, dz) < 0.2) { moveTo = null; dx = dz = 0; }
  }
  const L = Math.hypot(dx, dz);
  if (L > 0) {
    dx /= L; dz /= L;
    const sp = 4.2 * dt, nx = player.position.x + dx * sp, nz = player.position.z + dz * sp;
    if (!blocked(nx, nz)) { player.position.x = nx; player.position.z = nz; }
    else if (!blocked(nx, player.position.z)) player.position.x = nx;
    else if (!blocked(player.position.x, nz)) player.position.z = nz;
    else moveTo = null;
    const ang = Math.atan2(-dx, -dz);
    let da = ang - player.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    player.rotation.y += da * Math.min(1, dt * 12);
    walkT += dt * 10;
  } else walkT *= 0.9;
  player.position.y = height(player.position.x, player.position.z);
  { const wade = smooth(WL + 0.05, WL - 0.15, player.position.y), mv = L > 0 ? 1 : 0.35;
    U.uPW.value.set(player.position.x, player.position.z, lerp(U.uPW.value.z, wade * mv, Math.min(1, dt * 4)), 0); }
  { const ch = player.userData.char, mv = L > 0 ? 1 : 0;
    if (ch.gait) { ch.gait(walkT, Math.min(1, walkT > 0.01 ? mv || 0.0 : 0)); ch.anim(performance.now() / 1000, walkT); } else {
    ch.group.position.y = Math.abs(Math.sin(walkT)) * 0.07;
    ch.group.rotation.z = Math.sin(walkT) * 0.07 * mv;
    ch.group.rotation.x = -0.06 * mv;
    ch.group.scale.y = 1 - Math.abs(Math.cos(walkT)) * 0.04 * mv;
    ch.anim(performance.now() / 1000, walkT); } }
  if (!camFree) camTarget.lerp(player.position, Math.min(1, dt * 4));
}

// ════════════════════════════════════════════════════════════════════
//  Interface
// ════════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const SLIDERS = [
  ['pixel', 'Pixel', 1, 6, 1], ['tilt', 'Tilt-shift', 0, 2, 0.05], ['sunAz', 'Soleil ↻', 0, 360, 1], ['sunEl', 'Soleil ↑', 4, 85, 1],
  ['sunInt', 'Soleil', 0, 8, 0.1], ['hemiInt', 'Ciel', 0, 3, 0.05], ['exposure', 'Exposition', 0.4, 2, 0.01],
  ['outline', 'Contours', 0, 1, 0.05], ['dither', 'Dithering', 0, 1.5, 0.05], ['levels', 'Niveaux', 0, 32, 1], ['cloud', 'Nuages', 0, 0.8, 0.05], ['bloom', 'Halo', 0, 2, 0.05], ['rays', 'Rayons', 0, 3, 0.05], ['reveal', 'Transparence', 0, 1, 0.05], ['bump', 'Relief sol', 0, 3, 0.05],
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
  $('planche').className = planche ? 'on' : '';
}
function syncSliders() {
  $('sliders').innerHTML = '';
  for (const [k, label, mn, mx, st] of SLIDERS) {
    const row = document.createElement('label'); row.className = 'row';
    row.innerHTML = `<span>${label}</span><input type="range" min="${mn}" max="${mx}" step="${st}" value="${cur[k]}"><span>${+(+cur[k]).toFixed(2)}</span>`;
    const inp = row.querySelector('input'), out = row.lastChild;
    inp.oninput = () => { cur[k] = +inp.value; out.textContent = +(+inp.value).toFixed(2); };
    $('sliders').appendChild(row);
  }
}
function setPlanche(on) { planche = on; $('labels').classList.toggle('on', on); buildUI(); }
$('planche').onclick = () => setPlanche(!planche);
$('title').onclick = () => $('ui').classList.toggle('closed');
$('reset').onclick = () => { const i = PRESETS.indexOf(cur); Object.assign(cur, structuredClone(BASE[i]), { palette: cur.palette }); syncSliders(); };
let seed = (Math.random() * 1e6) | 0;
$('follow').onclick = () => follow();
BIOMES.forEach((b, i) => { const o = document.createElement('option'); o.value = i; o.textContent = b.name; $('goBiome').appendChild(o); });
CHARS.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; $('charSel').appendChild(o); });
$('charSel').value = charId;
$('charSel').onchange = () => setCharacter($('charSel').value);
$('goBiome').onchange = () => { if ($('goBiome').value !== '') goToBiome(+$('goBiome').value); $('goBiome').value = ''; };
// cycle jour/nuit
const fmtH = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor(h % 1 * 60)).padStart(2, '0')}`;
let dayLabelT = 0;
function syncDay(force) {
  const now = performance.now(); if (!force && now - dayLabelT < 200) return; dayLabelT = now;
  $('dayOn').className = cycle.on ? 'on' : ''; $('dayRun').textContent = cycle.run ? '⏸' : '▶';
  $('dayH').value = cycle.hour; $('dayHv').textContent = fmtH(cycle.hour);
  $('ui').classList.toggle('cycling', cycle.on);
}
$('dayOn').onclick = () => { cycle.on = !cycle.on; syncDay(true); };
$('dayRun').onclick = () => { cycle.run = !cycle.run; cycle.on = true; syncDay(true); };
$('dayH').oninput = () => { cycle.hour = +$('dayH').value; cycle.on = true; syncDay(true); };
$('dayM').oninput = () => { cycle.minutes = +$('dayM').value; $('dayMv').textContent = cycle.minutes + ' min'; };
if (!ASSETS) $('world').onclick = () => { $('loading').style.display = 'grid'; setTimeout(() => { seed = (Math.random() * 1e6) | 0; generate(seed); $('loading').style.display = 'none'; }, 30); };
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
  if (world) { world.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.geometry) o.geometry.dispose(); }); scene.remove(world); }
  world = new THREE.Group(); scene.add(world);
  rnd = mulberry32(sd); seedNoise(sd); pathPh = [0, 0]; climOff = [0, 0, 0, 0]; buildBiomeCache();
  chalets = []; smokes.length = 0;
  trees = [];
  const W1 = () => new THREE.Color(1, 1, 1);
  const one = (pr, x, z, s = 1) => {
    const it = [{ x, z, y: 0, s, ry: R(0, 6.28), c: W1() }];
    if (pr.trunk) instanced(pr.trunk, pr.birch ? M.birch : M.bark, it);
    instanced(pr.leaves, pr.needles ? M.needles : pr.soft ? M.bush : M.leaves, it, { depth: pr.needles ? DM.needles : pr.soft ? DM.bush : DM.leaves });
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
    ['Méditerranée', 'Pin parasol', 26, 3.5, (x, z) => one(makeParasol(), x, z)],
    ['Méditerranée', 'Olivier', 16, 1.8, (x, z) => one(makeOlive(), x, z)],
    ['Méditerranée', 'Cyprès', 24, 3.5, (x, z) => one(makeCypress(), x, z)],
    ['Méditerranée', 'Lavande & maquis', 8, 0.4, (x, z) => { const lv = soft(makeBush(PAL.lavender, 0.32, 0.5)), mq = soft(makeBush(PAL.maquis, 0.4, 0.8)); scatter(5, 1.8, (a, b, i) => one(i < 3 ? lv : mq, x + a, z + b, R(0.8, 1.3))); }],
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
  ground = new THREE.Mesh(geo, patch(new THREE.MeshLambertMaterial({ map: tex }), { ground: { mask, detail: groundDetail } }));
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
} else setTimeout(() => { generate(seed); $('loading').style.display = 'none'; }, 30);
let last = performance.now(), fpsAcc = 0, fpsN = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000; frameNo++;
  if (cycle.on && cycle.run) { cycle.hour = (cycle.hour + dt * 24 / (cycle.minutes * 60)) % 24; syncDay(); }
  U.uTime.value = t;
  if (!world) { requestAnimationFrame(frame); return; }
  updateSmoke(t, winMat.emissiveIntensity > 0.6);
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
