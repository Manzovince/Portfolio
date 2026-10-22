// Faune vivante : apparition autour du joueur selon le biome, l'heure et la météo, puis comportements.
import { THREE, scene, inject } from './gfx.js?v=1';
import { SPECIES, RARE_W, timeOk, speciesModel } from './species.js?v=1';
import { H, islandAt, treesNear, DEEP } from './world.js?v=1';
import { TAU, angDiff, weighted, clamp } from './util.js?v=1';

export const active = [];
const CAP = { body: 11, shadow: 7, bubbles: 3, large: 4 };
const SHADOW = { S: [.35, .17], M: [.6, .28], L: [.95, .42], XL: [1.5, .75] };
const shadowMat = inject(new THREE.MeshBasicMaterial({ color: '#0d2a3a', transparent: true, opacity: .4, depthWrite: false }));
const bubbleMat = inject(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .85, depthWrite: false }));
const circle = new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2), bubbleGeo = new THREE.SphereGeometry(.09, 8, 6);
const sizeCache = {};
function radiusOf(id, obj) {
  if (!(id in sizeCache)) { const b = new THREE.Box3().setFromObject(obj); const s = new THREE.Vector3(); b.getSize(s); sizeCache[id] = Math.max(s.x, s.y, s.z) / 2 / obj.scale.x; }
  return sizeCache[id] * obj.scale.x;
}
const kindOf = hab => hab === 'mer' ? 'shadow' : hab === 'fond' ? 'bubbles' : hab === 'large' ? 'large' : 'body';
const count = k => active.reduce((n, e) => n + (e.kind === k), 0);

function eligible(sp, biome, habs, hour, weather) {
  if (!sp.biomes.includes(biome) || !habs.includes(sp.hab) || !timeOk(sp, hour)) return false;
  if (sp.weather === 'pluie' && weather !== 'pluie') return false;
  if (sp.weather === 'clair' && weather === 'pluie') return false;
  return true;
}
function make(sp, x, z, extra = {}) {
  const kind = kindOf(sp.hab), e = { sp, kind, x, z, y: 0, home: { x, z }, ry: Math.random() * TAU, state: 'idle', t: Math.random() * 2, ph: Math.random() * 10, age: 0, ...extra };
  if (kind === 'shadow') { const [l, w] = SHADOW[sp.size]; e.obj = new THREE.Mesh(circle, shadowMat); e.obj.scale.set(l, 1, w); e.obj.renderOrder = 2; e.radius = l; }
  else if (kind === 'bubbles') { e.obj = new THREE.Group(); for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(bubbleGeo, bubbleMat); m.userData.ph = i / 4; e.obj.add(m); }
    const s = new THREE.Mesh(circle, shadowMat); s.scale.set(.5, 1, .5); s.position.y = .12; e.obj.add(s); e.radius = .6; }
  else {
    e.obj = speciesModel(sp.id); e.obj.scale.setScalar(sp.scale || 1);
    e.wings = e.obj.children.filter(c => c.name.startsWith('wing'));
    e.radius = radiusOf(sp.id, e.obj);
  }
  scene.add(e.obj); active.push(e); return e;
}
export function removeEntity(e) { e.dead = true; scene.remove(e.obj); const i = active.indexOf(e); if (i >= 0) active.splice(i, 1); }
export function clearFauna() { while (active.length) removeEntity(active[0]); }

function trySpawn(px, pz, hour, weather) {
  const a = Math.random() * TAU, d = 18 + Math.random() * 42, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d, h = H(x, z);
  let habs, biome;
  if (h > 1.1) { const i = islandAt(x, z); if (!i) return; biome = i.biome; habs = ['sol', 'air', 'arbre']; }
  else if (h > .1) { const i = islandAt(x, z); if (!i) return; biome = i.biome; habs = ['plage']; }
  else if (h > -5.5 && h < -1.4) { const i = islandAt(x, z, DEEP - 2); if (!i) return; biome = i.biome; habs = ['mer', 'fond']; }
  else if (h <= DEEP - 1) { biome = 'ocean'; habs = ['mer', 'large']; }
  else return;
  let list = SPECIES.filter(s => eligible(s, biome, habs, hour, weather));
  let tree = null;
  if (list.some(s => s.hab === 'arbre')) { const t = treesNear(x, z, 10); tree = t.length ? t[Math.floor(Math.random() * t.length)] : null; if (!tree) list = list.filter(s => s.hab !== 'arbre'); }
  list = list.filter(s => count(kindOf(s.hab)) < CAP[kindOf(s.hab)]);
  if (!list.length) return;
  const sp = weighted(Math.random, list, s => RARE_W[s.rare] * (s.hab === 'air' ? 1.4 : 1));
  if (sp.hab === 'arbre') { const e = make(sp, tree.x, tree.z, { perchY: tree.top - .2 }); e.y = e.perchY; return; }
  const n = sp.group ? 2 + Math.floor(Math.random() * (sp.group - 1)) : 1;
  for (let i = 0; i < n; i++) make(sp, x + (Math.random() - .5) * 3 * i, z + (Math.random() - .5) * 3 * i, { lead: i === 0, idx: i });
}
// Fait venir une ombre de poisson près du flotteur si l'eau en abrite une espèce.
export function spawnFishNear(x, z, hour, weather) {
  const h = H(x, z), deep = h <= DEEP - 1, i = deep ? null : islandAt(x, z, DEEP - 2), biome = deep ? 'ocean' : i?.biome;
  if (!biome) return false;
  const list = SPECIES.filter(s => eligible(s, biome, ['mer'], hour, weather)); if (!list.length) return false;
  const sp = weighted(Math.random, list, s => RARE_W[s.rare]);
  for (let k = 0; k < 12; k++) { const a = Math.random() * TAU, d = 6 + Math.random() * 5, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, ph = H(px, pz);
    if (deep ? ph < DEEP + 1 : ph < -1.2) { make(sp, px, pz); return true; } }
  return false;
}
let spawnT = 0;
export function prewarm(px, pz, hour, weather) { for (let i = 0; i < 60; i++) trySpawn(px, pz, hour, weather); }

const okGround = (sp, h) => sp.hab === 'plage' ? h > -.4 && h < 1.8 : h > .5;
export function updateFauna(dt, c) {
  spawnT -= dt; if (spawnT < 0) { spawnT = .3; trySpawn(c.px, c.pz, c.hour, c.weather); }
  for (let k = active.length - 1; k >= 0; k--) {
    const e = active[k], sp = e.sp, dx = e.x - c.px, dz = e.z - c.pz, dist = Math.hypot(dx, dz);
    e.age += dt; e.t -= dt;
    if (dist > (e.kind === 'large' ? 130 : 85) && !e.lock) { removeEntity(e); continue; }
    // une espèce hors de son horaire finit par s'en aller (quand le joueur est loin)
    if (!timeOk(sp, c.hour) && dist > 30 && !e.lock) { removeEntity(e); continue; }
    if (e.kind === 'body') body(e, sp, dt, c, dx, dz, dist);
    else if (e.kind === 'shadow') shadow(e, dt, c);
    else if (e.kind === 'bubbles') bubbles(e, c);
    else large(e, sp, dt, c);
    if (e.dead) continue;
    e.obj.position.set(e.x, e.y, e.z);
    if (e.kind !== 'bubbles') e.obj.rotation.y = -e.ry;
  }
}
function scare(e, sp, c, dist) {
  if (!sp.shy || e.state === 'flee') return false;
  return (dist < sp.shy && c.pspeed > 3.4) || (dist < sp.shy * .32 && c.pspeed > .6);
}
function body(e, sp, dt, c, dx, dz, dist) {
  const flap = s => e.wings.forEach(w => w.rotation.x = (w.name === 'wingL' ? 1 : -1) * Math.sin(c.t * s + e.ph) * .9);
  if (sp.hab === 'air') {
    if (e.state !== 'flee' && dist < 3.6 && c.pspeed > 3.6) { e.state = 'flee'; e.t = 2.5; e.ry = Math.atan2(dz, dx); }
    if (e.state === 'flee') { e.x += Math.cos(e.ry) * 5 * dt; e.z += Math.sin(e.ry) * 5 * dt; e.y += 2.5 * dt; if (e.t < 0) removeEntity(e); flap(30); return; }
    e.home.x += Math.sin(c.t * .2 + e.ph) * dt * .6; e.home.z += Math.cos(c.t * .17 + e.ph) * dt * .6;
    const a = c.t * .7 + e.ph, r = 1.6, nx = e.home.x + Math.cos(a) * r, nz = e.home.z + Math.sin(a) * r;
    e.ry = Math.atan2(nz - e.z, nx - e.x); e.x = nx; e.z = nz;
    const g = Math.max(H(e.x, e.z), 0); e.y = g + (sp.low ? .45 : 1.1) + Math.sin(c.t * 2.3 + e.ph) * .3;
    flap(sp.id === 'coccinelle' || sp.id === 'luciole' ? 40 : 16);
    if (sp.id === 'luciole') { const gl = e.obj.children.find(m => m.name === 'glow'); if (gl) gl.visible = Math.sin(c.t * 3 + e.ph) > -.3; }
    return;
  }
  if (sp.hab === 'arbre') {
    if (e.state !== 'flee' && ((dist < 5 && c.pspeed > 3.4) || dist < 1.6)) { e.state = 'flee'; e.t = 3; e.ry = Math.atan2(dz, dx); }
    if (e.state === 'flee') { e.x += Math.cos(e.ry) * 6 * dt; e.z += Math.sin(e.ry) * 6 * dt; e.y += 3 * dt; flap(18); if (e.t < 0) removeEntity(e); return; }
    if (e.t < 0) { e.t = 1.5 + Math.random() * 3; e.look = Math.random() * TAU; }
    if (e.look !== undefined) e.ry += angDiff(e.ry, e.look) * dt * 3;
    e.y = e.perchY; return;
  }
  // au sol ou sur la plage
  if (scare(e, sp, c, dist)) { e.state = 'flee'; e.t = 3; e.ry = Math.atan2(dz, dx); }
  let v = 0;
  if (e.state === 'idle') { if (e.t < 0) { const a = Math.random() * TAU, r = Math.random() * 6; e.tx = e.home.x + Math.cos(a) * r; e.tz = e.home.z + Math.sin(a) * r; e.state = 'walk'; e.t = 6; } }
  else if (e.state === 'walk') {
    const want = Math.atan2(e.tz - e.z, e.tx - e.x); e.ry += angDiff(e.ry, want) * Math.min(1, dt * 5); v = (sp.speed || 1) * .7;
    if (Math.hypot(e.tx - e.x, e.tz - e.z) < .4 || e.t < 0) { e.state = 'idle'; e.t = 1 + Math.random() * 3.5; }
  } else if (e.state === 'flee') {
    v = (sp.speed || 1) * 3.4; e.ry += angDiff(e.ry, Math.atan2(dz, dx)) * Math.min(1, dt * 2);
    if (e.t < 0) { if (dist > 20 || sp.id === 'rougegorge') { removeEntity(e); return; } e.state = 'idle'; e.t = 2; e.home = { x: e.x, z: e.z }; }
  }
  if (sp.id === 'rougegorge' && e.state === 'flee') { e.x += Math.cos(e.ry) * 6 * dt; e.z += Math.sin(e.ry) * 6 * dt; e.y += 3 * dt; flap(22); return; }
  if (v > 0) {
    const nx = e.x + Math.cos(e.ry) * v * dt, nz = e.z + Math.sin(e.ry) * v * dt, h = H(nx, nz);
    if (okGround(sp, h)) { e.x = nx; e.z = nz; } else { e.ry += Math.PI * (.5 + Math.random()); if (e.state === 'walk') e.state = 'idle'; }
  }
  e.y = Math.max(H(e.x, e.z), sp.hab === 'plage' ? -.3 : 0);
  if (sp.anim === 'hop' && v > 0) e.y += Math.abs(Math.sin(c.t * 9 + e.ph)) * .22;
  e.obj.rotation.z = sp.anim === 'waddle' && v > 0 ? Math.sin(c.t * 7 + e.ph) * .1 : 0;
  if (sp.anim !== 'hop' && v === 0) e.obj.scale.y = (sp.scale || 1) * (1 + Math.sin(c.t * 2 + e.ph) * .015);
}
function shadow(e, dt, c) {
  const deep = e.sp.biomes.includes('ocean');
  const ok = h => deep ? h < DEEP + 1 : h < -1.2 && h > DEEP - 3;
  if (e.lock) { e.y = .15; return; }
  if (e.state === 'flee') { e.x += Math.cos(e.ry) * 5 * dt; e.z += Math.sin(e.ry) * 5 * dt; e.obj.material = shadowMat; if (e.t < 0) removeEntity(e); e.y = .15; return; }
  if (e.t < 0 || e.state === 'idle') { const a = Math.random() * TAU, r = Math.random() * 6; e.tx = e.home.x + Math.cos(a) * r; e.tz = e.home.z + Math.sin(a) * r; e.state = 'swim'; e.t = 3 + Math.random() * 4; }
  const want = Math.atan2(e.tz - e.z, e.tx - e.x); e.ry += angDiff(e.ry, want) * Math.min(1, dt * 3);
  const v = Math.hypot(e.tx - e.z * 0 - e.x, e.tz - e.z) > .3 ? .9 : 0;
  const nx = e.x + Math.cos(e.ry) * v * dt, nz = e.z + Math.sin(e.ry) * v * dt;
  if (ok(H(nx, nz))) { e.x = nx; e.z = nz; } else e.t = -1;
  e.y = .15;
}
function bubbles(e, c) {
  e.y = 0;
  for (const m of e.obj.children) if (m.geometry === bubbleGeo) { const p = (c.t * .7 + m.userData.ph + e.ph) % 1; m.position.set(Math.sin(p * 9 + m.userData.ph * 6) * .15, -.3 + p * .55, Math.cos(m.userData.ph * 6) * .15); m.scale.setScalar(.4 + p); }
}
function large(e, sp, dt, c) {
  const sp2 = sp.id === 'baleine' ? 2.6 : sp.id === 'dauphin' ? 7 : .4;
  if (!e.dir) e.dir = e.ry;
  const nx = e.x + Math.cos(e.dir) * sp2 * dt, nz = e.z + Math.sin(e.dir) * sp2 * dt;
  if (H(nx + Math.cos(e.dir) * 8, nz + Math.sin(e.dir) * 8) > DEEP + .5) e.dir += dt * 1.5; else { e.x = nx; e.z = nz; }
  e.ry = e.dir; let pitch = 0;
  if (sp.id === 'baleine') {
    const p = ((e.age + e.ph) % 14) / 14;
    if (p < .45) { const k = Math.sin(p / .45 * Math.PI); e.y = -1.6 + k * 1.3; pitch = Math.cos(p / .45 * Math.PI) * .12; } else e.y = -6;
    if (p < .05) e.spout = 1;
  } else if (sp.id === 'dauphin') {
    const p = ((e.age * .45 + e.idx * .23 + e.ph) % 1);
    if (p < .3) { const k = p / .3; e.y = -.4 + Math.sin(k * Math.PI) * 1.8; pitch = (.5 - k) * 1.6; } else { e.y = -.55; pitch = 0; }
  } else { e.y = -.25 + Math.sin(c.t * 1.5 + e.ph) * .12; e.dir += Math.sin(c.t * .3 + e.ph) * dt * .3; }
  e.obj.visible = e.y > -3;
  e.obj.rotation.z = pitch;
  if (e.spout !== undefined) e.spout = Math.max(0, e.spout - dt);
}
