// Renderer, camera and the toon look: 3-step shading, inverted-hull outlines,
// and a low internal resolution upscaled with nearest-neighbour for chunky pixels.
import * as THREE from 'three';
export { THREE };

export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

export const scene = new THREE.Scene();
scene.background = new THREE.Color('#1c0f3a');
export const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 120);

const grad = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1);
grad.minFilter = grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;

export const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...o });
export const INK = new THREE.MeshBasicMaterial({ color: 0x140a26, side: THREE.BackSide });

// Convex shapes only: grow the geometry by `t` on every side around its own centre.
export function hullGeo(geo, t = 0.05) {
  const g = geo.clone();
  g.computeBoundingBox();
  const b = g.boundingBox, c = new THREE.Vector3(), s = new THREE.Vector3();
  b.getCenter(c); b.getSize(s);
  g.translate(-c.x, -c.y, -c.z);
  g.scale((s.x + 2 * t) / (s.x || 1), (s.y + 2 * t) / (s.y || 1), (s.z + 2 * t) / (s.z || 1));
  g.translate(c.x, c.y, c.z);
  return g;
}

export function inked(geo, mat, t = 0.05) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  if (t > 0) m.add(new THREE.Mesh(hullGeo(geo, t), INK));
  return m;
}

export function pixTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.ctx = ctx;
  return t;
}

scene.add(new THREE.HemisphereLight(0xfff2ff, 0x4a2a7a, 1.4));
export const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(4, 16, 9);
sun.target.position.set(0, 0, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 9, bottom: -9, near: 2, far: 40 });
sun.shadow.bias = -0.002;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

// Framing: the machine must fit horizontally, then the view is centred on it.
export const view = { w: 1, h: 1, scale: 1, base: new THREE.Vector3(), look: new THREE.Vector3(0, 2.6, 2.6) };
const PITCH = 0.92; // radians below horizontal

export function resize() {
  const w = innerWidth, h = innerHeight;
  view.w = w; view.h = h;
  view.scale = Math.min(1, 360 / Math.min(h, w * 1.9));
  renderer.setPixelRatio(view.scale);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const halfW = 5.2, halfH = 8.6;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(halfW / (t * camera.aspect), halfH / t);
  view.base.set(0, Math.sin(PITCH) * dist, Math.cos(PITCH) * dist).add(view.look);
  camera.updateProjectionMatrix();
}

const v3 = new THREE.Vector3();
export function toScreen(x, y, z) {
  v3.set(x, y, z).project(camera);
  return [(v3.x + 1) / 2 * view.w, (1 - v3.y) / 2 * view.h, v3.z < 1];
}

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const plane = new THREE.Plane();
export function screenToPlaneY(px, py, y) {
  ndc.set(px / view.w * 2 - 1, -(py / view.h) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  plane.set(new THREE.Vector3(0, 1, 0), -y);
  return ray.ray.intersectPlane(plane, v3) ? v3.clone() : null;
}
