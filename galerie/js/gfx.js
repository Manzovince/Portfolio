// Rendu : moteur Three.js, matériaux toon + contours encrés, horizon courbé, et assembleur de modèles.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export { THREE };

export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1500);

// Uniformes partagés par tous les matériaux du monde.
export const U = { uCurve: { value: .0026 }, uFocus: { value: 20 }, uOW: { value: .03 }, uTime: { value: 0 } };

export function inject(m, outline = false) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'uniform float uCurve; uniform float uFocus; uniform float uOW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      ${outline ? 'mvPosition.xyz += normalize(normalMatrix * normal) * uOW * (1.0 + max(0.0, -mvPosition.z - 12.0) * 0.03);' : ''}
      { float cz = max(0.0, -mvPosition.z - uFocus); mvPosition.y -= cz * cz * uCurve; }
      gl_Position = projectionMatrix * mvPosition;`);
  };
  m.customProgramCacheKey = () => outline ? 'curveO' : 'curve';
  return m;
}
export const curveGLSL = `{ float cz = max(0.0, -mv.z - uFocus); mv.y -= cz * cz * uCurve; }`;

const grad = new THREE.DataTexture(new Uint8Array([85, 170, 255]), 3, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
export const GRAD = grad;

export const MAT = {
  toon: inject(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad })),
  ds: inject(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad, side: THREE.DoubleSide })),
  outline: inject(new THREE.MeshBasicMaterial({ color: '#2b2433', side: THREE.BackSide }), true),
  glow: inject(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })),
  glass: inject(new THREE.MeshToonMaterial({ color: '#d4eef5', transparent: true, opacity: .3, gradientMap: grad, depthWrite: false })),
  water: inject(new THREE.MeshToonMaterial({ color: '#4fc3dc', transparent: true, opacity: .45, gradientMap: grad, depthWrite: false })),
};
export function toonColor(col, o = {}) {
  return inject(new THREE.MeshToonMaterial({ color: col, gradientMap: grad, ...o }));
}

export function mesh(geo, mat = MAT.toon, outline = true, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true;
  if (outline) { const o = new THREE.Mesh(geo, MAT.outline); o.castShadow = false; m.add(o); }
  return m;
}

// ---------- assembleur de modèles (fusion de primitives à couleurs de sommets) ----------
const SPH = new THREE.SphereGeometry(1, 12, 9), BOX = new THREE.BoxGeometry(1, 1, 1), DOD = new THREE.DodecahedronGeometry(1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
function m4(p = [0, 0, 0], r, s = [1, 1, 1]) {
  r = r || [0, 0, 0]; if (typeof s === 'number') s = [s, s, s];
  return new THREE.Matrix4().compose(new THREE.Vector3(...p), _q.setFromEuler(_e.set(...r)).clone(), new THREE.Vector3(...s));
}
export class Builder {
  constructor() { this.parts = new Map(); this.cur = 'body'; }
  part(n) { this.cur = n; return this; }
  push(geo, col, m) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (m) g.applyMatrix4(m);
    const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.toArray(a, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    if (!this.parts.has(this.cur)) this.parts.set(this.cur, []);
    this.parts.get(this.cur).push(g); return this;
  }
  ball(col, p, s, r) { return this.push(SPH, col, m4(p, r, s)); }
  box(col, p, s, r) { return this.push(BOX, col, m4(p, r, s)); }
  rock(col, p, s, r) { return this.push(DOD, col, m4(p, r, s)); }
  cyl(col, p, rt, rb, h, r, seg = 9) { return this.push(new THREE.CylinderGeometry(rt, rb, h, seg), col, m4(p, r)); }
  cone(col, p, rad, h, r, s = 1, seg = 9) { return this.push(new THREE.ConeGeometry(rad, h, seg), col, m4(p, r, s)); }
  torus(col, p, R, t, arc, r, s = 1) { return this.push(new THREE.TorusGeometry(R, t, 6, 18, arc), col, m4(p, r, s)); }
  geo(g, col, p, r, s) { return this.push(g, col, m4(p, r, s)); }
  limb(col, a, b, r0, r1 = r0) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
    return this.push(new THREE.CylinderGeometry(r1, r0, len, 8), col, new THREE.Matrix4().compose(A.add(B).multiplyScalar(.5), q, new THREE.Vector3(1, 1, 1)));
  }
  merged(name = 'body') { const l = this.parts.get(name); return l ? mergeGeometries(l) : null; }
  geometries() { const o = {}; for (const [n, l] of this.parts) o[n] = mergeGeometries(l); return o; }
}
export function matFor(name) {
  return name.startsWith('glass') ? MAT.glass : name.startsWith('glow') ? MAT.glow : name.startsWith('ds') || name.startsWith('wing') ? MAT.ds : MAT.toon;
}
// Instancie un modèle à partir de géométries déjà fusionnées (partagées).
export function modelFrom(geos, { outline = true, shadow = true } = {}) {
  const g = new THREE.Group();
  for (const [n, geo] of Object.entries(geos)) {
    const plain = n.startsWith('glass') || n.startsWith('glow');
    const m = mesh(geo, matFor(n), outline && !plain, shadow && !plain); m.name = n; g.add(m);
  }
  return g;
}

export function textTex(txt, w = 256, h = 128, bg = '#2b2118', fg = '#f3e6c8', font = 'bold 64px Georgia') {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = String(txt).split('\n'), lh = parseInt(font.match(/(\d+)px/)[1]) * 1.15;
  lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh + 2));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
