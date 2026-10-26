// Collectible figurines: low-poly toon models, their physics hulls and album thumbnails.
import { THREE, toon, inked, renderer } from './gfx.js?v=1';

const M = {};
const mat = c => (M[c] ||= toon(c));

function heartShape(s) {
  const h = new THREE.Shape();
  h.moveTo(0, -0.5 * s);
  h.bezierCurveTo(0.55 * s, -0.05 * s, 0.6 * s, 0.45 * s, 0.25 * s, 0.45 * s);
  h.bezierCurveTo(0.08 * s, 0.45 * s, 0, 0.3 * s, 0, 0.22 * s);
  h.bezierCurveTo(0, 0.3 * s, -0.08 * s, 0.45 * s, -0.25 * s, 0.45 * s);
  h.bezierCurveTo(-0.6 * s, 0.45 * s, -0.55 * s, -0.05 * s, 0, -0.5 * s);
  return h;
}
function starShape(ro, ri) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}
const extr = (shape, depth) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.center();
  return g;
};

function part(g, geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, ink = 0.045) {
  const m = inked(geo, mat(color), ink);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}

export const PRIZES = [
  { name: 'Canard', rarity: 0, build(g) {
    part(g, new THREE.SphereGeometry(0.42, 8, 6), '#ffd23f', 0, 0.36, 0).scale.set(1.15, 0.85, 1);
    part(g, new THREE.SphereGeometry(0.26, 8, 6), '#ffd23f', 0.3, 0.75, 0);
    part(g, new THREE.ConeGeometry(0.1, 0.24, 6), '#f29e1f', 0.58, 0.72, 0, 0, 0, -Math.PI / 2);
  } },
  { name: 'Dé', rarity: 0, build(g) {
    part(g, new THREE.BoxGeometry(0.75, 0.75, 0.75), '#ef3e5c', 0, 0.38, 0);
    for (const [x, z] of [[0, 0], [-0.2, -0.2], [0.2, 0.2], [-0.2, 0.2], [0.2, -0.2]])
      part(g, new THREE.BoxGeometry(0.12, 0.04, 0.12), '#ffffff', x, 0.77, z, 0, 0, 0, 0);
  } },
  { name: 'Champignon', rarity: 0, build(g) {
    part(g, new THREE.CylinderGeometry(0.2, 0.26, 0.45, 8), '#fff4e0', 0, 0.23, 0);
    part(g, new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#ef3e5c', 0, 0.42, 0);
    for (const [x, y, z] of [[0.25, 0.75, 0.15], [-0.2, 0.8, 0.2], [0, 0.7, -0.35], [-0.3, 0.6, -0.2]])
      part(g, new THREE.SphereGeometry(0.08, 6, 4), '#ffffff', x, y, z, 0, 0, 0, 0);
  } },
  { name: 'Poisson', rarity: 0, build(g) {
    part(g, new THREE.SphereGeometry(0.4, 8, 6), '#49b6ff', 0, 0.3, 0).scale.set(1.3, 0.75, 0.55);
    part(g, new THREE.ConeGeometry(0.28, 0.4, 4), '#2a5fd1', -0.62, 0.3, 0, 0, 0, Math.PI / 2);
    part(g, new THREE.SphereGeometry(0.06, 6, 4), '#1a1033', 0.32, 0.4, 0.16, 0, 0, 0, 0);
  } },
  { name: 'Cœur', rarity: 0, build(g) {
    part(g, extr(heartShape(1.05), 0.32), '#ff7ad9', 0, 0.46, 0, -0.25, 0, 0);
  } },
  { name: 'Fusée', rarity: 1, build(g) {
    part(g, new THREE.CylinderGeometry(0.22, 0.22, 0.7, 8), '#f4f4ff', 0, 0.55, 0);
    part(g, new THREE.ConeGeometry(0.22, 0.34, 8), '#ef3e5c', 0, 1.07, 0);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      part(g, new THREE.BoxGeometry(0.06, 0.32, 0.26), '#ef3e5c', Math.cos(a) * 0.25, 0.3, Math.sin(a) * 0.25, 0, -a, 0);
    }
    part(g, new THREE.CylinderGeometry(0.09, 0.09, 0.04, 8), '#49b6ff', 0, 0.65, 0.21, Math.PI / 2, 0, 0, 0);
  } },
  { name: 'Gemme', rarity: 1, build(g) {
    part(g, new THREE.OctahedronGeometry(0.5, 0), '#6ff5ff', 0, 0.5, 0).scale.set(1, 1.2, 1);
  } },
  { name: 'Chat', rarity: 1, build(g) {
    part(g, new THREE.BoxGeometry(0.62, 0.5, 0.52), '#f29e1f', 0, 0.3, 0);
    part(g, new THREE.ConeGeometry(0.12, 0.2, 4), '#f29e1f', -0.18, 0.64, 0, 0, Math.PI / 4, 0);
    part(g, new THREE.ConeGeometry(0.12, 0.2, 4), '#f29e1f', 0.18, 0.64, 0, 0, Math.PI / 4, 0);
    part(g, new THREE.BoxGeometry(0.08, 0.1, 0.02), '#1a1033', -0.13, 0.35, 0.27, 0, 0, 0, 0);
    part(g, new THREE.BoxGeometry(0.08, 0.1, 0.02), '#1a1033', 0.13, 0.35, 0.27, 0, 0, 0, 0);
    part(g, new THREE.BoxGeometry(0.06, 0.04, 0.02), '#ff7ad9', 0, 0.26, 0.27, 0, 0, 0, 0);
  } },
  { name: 'Couronne', rarity: 1, build(g) {
    part(g, new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), '#ffd23f', 0, 0.16, 0);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      part(g, new THREE.ConeGeometry(0.11, 0.3, 4), '#ffd23f', Math.cos(a) * 0.34, 0.46, Math.sin(a) * 0.34);
      part(g, new THREE.SphereGeometry(0.06, 4, 3), '#ef3e5c', Math.cos(a + 0.6) * 0.43, 0.16, Math.sin(a + 0.6) * 0.43, 0, 0, 0, 0);
    }
  } },
  { name: 'Planète', rarity: 2, build(g) {
    part(g, new THREE.IcosahedronGeometry(0.42, 1), '#b46cff', 0, 0.5, 0);
    part(g, new THREE.TorusGeometry(0.62, 0.06, 4, 18), '#ffd23f', 0, 0.5, 0, Math.PI / 2 - 0.4, 0, 0.2, 0.03);
  } },
  { name: 'Trophée', rarity: 2, build(g) {
    part(g, new THREE.BoxGeometry(0.5, 0.14, 0.5), '#8b4a2b', 0, 0.07, 0);
    part(g, new THREE.CylinderGeometry(0.06, 0.1, 0.3, 6), '#ffd23f', 0, 0.29, 0);
    part(g, new THREE.CylinderGeometry(0.36, 0.14, 0.45, 10), '#ffd23f', 0, 0.66, 0);
    part(g, new THREE.TorusGeometry(0.15, 0.04, 4, 8, Math.PI), '#ffd23f', -0.36, 0.7, 0, 0, 0, Math.PI / 2, 0.03);
    part(g, new THREE.TorusGeometry(0.15, 0.04, 4, 8, Math.PI), '#ffd23f', 0.36, 0.7, 0, 0, 0, -Math.PI / 2, 0.03);
  } },
  { name: 'Étoile d’or', rarity: 2, build(g) {
    part(g, extr(starShape(0.6, 0.27), 0.28), '#ffd23f', 0, 0.55, 0, -0.2, 0, 0);
  } },
];

export const RARITY = [
  { name: 'Commun', color: '#d9d9ec', w: 10 },
  { name: 'Rare', color: '#49b6ff', w: 4 },
  { name: 'Légendaire', color: '#ffd23f', w: 1.2 },
];

export function buildPrize(id) {
  const g = new THREE.Group();
  PRIZES[id].build(g);
  g.updateMatrixWorld(true);
  // the physics body is centred on the group origin, so recentre the model on its bounds
  const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
  for (const ch of g.children) ch.position.sub(c);
  g.updateMatrixWorld(true);
  return g;
}

const hulls = {};
export function hullPoints(id, g) {
  if (hulls[id]) return hulls[id];
  const pts = [], v = new THREE.Vector3();
  for (const m of g.children) {
    const pos = m.geometry.attributes.position;
    const stepN = Math.max(1, Math.floor(pos.count / 40));
    for (let i = 0; i < pos.count; i += stepN) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrix);
      pts.push(v.x, v.y, v.z);
    }
  }
  return (hulls[id] = new Float32Array(pts));
}

export function pickPrize(album) {
  const w = PRIZES.map((p, i) => RARITY[p.rarity].w * (album[i] ? 1 : 2.5));
  let r = Math.random() * w.reduce((a, b) => a + b);
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return i;
  return 0;
}

// Album thumbnails rendered once through the same toon pipeline, at pixel size.
const thumbs = {};
let tScene, tCam, tTarget;
export function thumb(id) {
  if (thumbs[id]) return thumbs[id];
  const N = 40;
  if (!tScene) {
    tScene = new THREE.Scene();
    tScene.add(new THREE.HemisphereLight(0xfff2ff, 0x4a2a7a, 1.4));
    const d = new THREE.DirectionalLight(0xffffff, 2.2);
    d.position.set(2, 4, 3);
    tScene.add(d);
    tCam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    tCam.position.set(1.6, 1.5, 2.6);
    tCam.lookAt(0, 0, 0);
    tTarget = new THREE.WebGLRenderTarget(N, N);
  }
  const g = buildPrize(id);
  g.rotation.y = -0.5;
  tScene.add(g);
  renderer.setRenderTarget(tTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(tScene, tCam);
  const px = new Uint8Array(N * N * 4);
  renderer.readRenderTargetPixels(tTarget, 0, 0, N, N, px);
  renderer.setRenderTarget(null);
  tScene.remove(g);
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N);
  // render targets hold linear colour: flip rows and encode to sRGB
  const lut = Array.from({ length: 256 }, (_, i) => {
    const c = i / 255;
    return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
  });
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const s = ((N - 1 - y) * N + x) * 4, d = (y * N + x) * 4;
    img.data[d] = lut[px[s]]; img.data[d + 1] = lut[px[s + 1]]; img.data[d + 2] = lut[px[s + 2]];
    img.data[d + 3] = px[s + 3] > 0 ? 255 : 0;
  }
  ctx.putImageData(img, 0, 0);
  return (thumbs[id] = cv.toDataURL());
}
