// Pixel particles (square points), camera shake and time effects.
import { THREE, scene, camera, view } from './gfx.js?v=1';

const MAX = 900;
const pos = new Float32Array(MAX * 3), colr = new Float32Array(MAX * 3);
const vel = new Float32Array(MAX * 3), life = new Float32Array(MAX), grav = new Float32Array(MAX);
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('color', new THREE.BufferAttribute(colr, 3).setUsage(THREE.DynamicDrawUsage));
const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.2, vertexColors: true, sizeAttenuation: true }));
pts.frustumCulled = false;
scene.add(pts);
for (let i = 0; i < MAX; i++) pos[i * 3 + 1] = -999;

let next = 0;
const c = new THREE.Color();
export function burst(x, y, z, { n = 12, colors = ['#ffd23f', '#ffffff'], speed = 4, up = 3, g = 14, life: L = 0.7, spread = 1 } = {}) {
  for (let k = 0; k < n; k++) {
    const i = next; next = (next + 1) % MAX;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
    vel[i * 3] = Math.cos(a) * s * spread;
    vel[i * 3 + 1] = up * (0.5 + Math.random());
    vel[i * 3 + 2] = Math.sin(a) * s * spread;
    life[i] = L * (0.6 + Math.random() * 0.6);
    grav[i] = g;
    c.set(colors[Math.floor(Math.random() * colors.length)]);
    colr[i * 3] = c.r; colr[i * 3 + 1] = c.g; colr[i * 3 + 2] = c.b;
  }
}

export const CONFETTI = ['#ef3e5c', '#ffd23f', '#49b6ff', '#4ad66d', '#ff7ad9', '#b46cff', '#ffffff'];

export function updateParticles(dt) {
  for (let i = 0; i < MAX; i++) {
    if (life[i] <= 0) continue;
    life[i] -= dt;
    if (life[i] <= 0) { pos[i * 3 + 1] = -999; continue; }
    vel[i * 3 + 1] -= grav[i] * dt;
    pos[i * 3] += vel[i * 3] * dt;
    pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
    pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
}

// Trauma-based shake: shake(0.3) for a bump, shake(1) for an earthquake.
let trauma = 0, punch = 0;
export function shake(a) { trauma = Math.min(1.2, trauma + a); }
export function zoomPunch(a) { punch = Math.max(punch, a); }
export const time = { scale: 1, slowT: 0 };
export function slowmo(dur, scale = 0.25) { time.slowT = dur; time.scale = scale; }

export function updateCamera(dt, t) {
  trauma = Math.max(0, trauma - dt * 1.3);
  punch = Math.max(0, punch - dt * 2.5);
  if (time.slowT > 0) { time.slowT -= dt; if (time.slowT <= 0) time.scale = 1; }
  const s = trauma * trauma;
  camera.position.copy(view.base);
  camera.position.x += (Math.random() - 0.5) * s * 0.9;
  camera.position.y += (Math.random() - 0.5) * s * 0.7;
  camera.position.lerp(view.look, punch * 0.08);
  camera.lookAt(view.look.x + Math.sin(t * 0.4) * 0.05, view.look.y, view.look.z);
  camera.rotation.z += (Math.random() - 0.5) * s * 0.03;
}

const flashEl = document.getElementById('flash');
export function flash(color = '#fff', a = 0.6) {
  flashEl.style.transition = 'none';
  flashEl.style.background = color;
  flashEl.style.opacity = a;
  requestAnimationFrame(() => {
    flashEl.style.transition = 'opacity .35s';
    flashEl.style.opacity = 0;
  });
}
