import * as THREE from 'three';
import { U, clamp, lerp } from './util.js?v=1';
import { vnoise } from './noise.js?v=1';
import { PixelPipeline } from './pixel.js?v=1';
import { World, SPAWN, START, heightAt, islandsNear } from './world.js?v=1';
import { Water, waveState } from './water.js?v=1';
import { Boat, angleDiff } from './boat.js?v=1';
import { Sky } from './sky.js?v=1';
import { Wake, WindStreaks } from './fx.js?v=1';
import { Hud } from './hud.js?v=1';
import { Walker } from './walker.js?v=1';
import { Progress, Bottles, MESSAGES, SPECIES } from './progress.js?v=1';
import { MapView } from './mapview.js?v=1';
import { Weather } from './weather.js?v=1';
import { Gulls, Dolphins, Whale, Spray, ShootingStars } from './fauna.js?v=1';
import { Sound } from './audio.js?v=1';

const store = {
  get(k, d) { try { const v = localStorage.getItem('alize.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('alize.' + k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};
const $ = (id) => document.getElementById(id);

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffffff, 180, 520);

const pipe = new PixelPipeline(renderer);
const chase = new THREE.PerspectiveCamera(50, 1, 0.5, 2000);
const iso = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);

const ISO_AZ = 0.65, ISO_EL = 0.62, ISO_DIST = 600;
const isoOff = new THREE.Vector3(Math.sin(ISO_AZ) * Math.cos(ISO_EL), Math.sin(ISO_EL), Math.cos(ISO_AZ) * Math.cos(ISO_EL)).multiplyScalar(ISO_DIST);
iso.position.copy(isoOff);
iso.lookAt(0, 0, 0);
const isoRight = new THREE.Vector3(1, 0, 0).applyQuaternion(iso.quaternion);
const isoUp = new THREE.Vector3(0, 1, 0).applyQuaternion(iso.quaternion);
const isoYaw = Math.atan2(-isoOff.x, isoOff.z);

const progress = new Progress();
const world = new World(scene, (id) => progress.lit.has(id));
const water = new Water(scene);
const saved = progress.boat;
const boat = new Boat(scene, saved ? saved.x : SPAWN.x, saved ? saved.z : SPAWN.z, saved ? saved.heading : SPAWN.heading);
const sky = new Sky(scene, progress.phase ?? 0.3);
const weather = new Weather(scene);
const wake = new Wake(scene);
const spray = new Spray(scene);
const streaks = new WindStreaks(scene);
const walker = new Walker(scene);
const bottles = new Bottles(scene, progress);
const gulls = new Gulls(scene);
const dolphins = new Dolphins(scene, wake);
const whale = new Whale(scene, spray);
const stars = new ShootingStars(scene);
const sound = new Sound(store.get('muted', false));
const hud = new Hud();
const mapView = new MapView($('mapcv'));

const wind = { from: Math.PI / 2, strength: 0.7 };
let mode = store.get('cam', 'chase');
let state = 'sail';
let chaseDist = 22, isoZoom = 22;
let camYaw = boat.heading;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  pipe.resize();
  hud.setScale(pipe.px / renderer.getPixelRatio());
}
window.addEventListener('resize', resize);
resize();

// ——— Notifications ———
const toastEl = $('toast');
const toasts = [];
let toastTimer = 0;
function toast(title, sub = '') { toasts.push([title, sub]); }
function updateToasts(dt) {
  toastTimer -= dt;
  if (toastTimer > 0) return;
  if (toastEl.classList.contains('show')) { toastEl.classList.remove('show'); toastTimer = 0.6; return; }
  const next = toasts.shift();
  if (!next) return;
  toastEl.innerHTML = '';
  toastEl.append(next[0]);
  if (next[1]) { const s = document.createElement('small'); s.textContent = next[1]; toastEl.append(s); }
  toastEl.classList.add('show');
  toastTimer = 3.4;
}

const obsCooldown = {};
function observe(id) {
  if ((obsCooldown[id] || 0) > t) return;
  obsCooldown[id] = t + 90;
  const first = progress.observe(id);
  if (first) {
    toast('Noté dans le carnet', SPECIES.find((s) => s.id === id).name);
    sound.chime();
    progress.save();
  }
}

// ——— Entrées : barre ou joystick selon qu'on navigue ou qu'on marche ———
const pointers = new Map();
let steer = null, pinch = null, joy = null, rudderTouch = 0;
const joyVec = { x: 0, y: 0 };
const joyEl = $('joy'), joyKnob = joyEl.firstElementChild;
const keys = new Set();

function pinchDist() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function wake1() { dismissTitle(); sound.start(); }
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  wake1();
  if (pointers.size === 1) {
    if (state === 'walk') {
      joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
      joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px';
      joyEl.style.display = 'block';
      joyKnob.style.transform = '';
    } else {
      steer = { id: e.pointerId, x0: e.clientX };
    }
  } else if (pointers.size === 2) {
    steer = null; endJoy();
    pinch = { d0: pinchDist(), chase: chaseDist, iso: isoZoom };
  }
});
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if (pinch && pointers.size === 2) {
    const k = pinch.d0 / Math.max(10, pinchDist());
    chaseDist = clamp(pinch.chase * k, 12, 55);
    isoZoom = clamp(pinch.iso * k, 12, 80);
  } else if (steer && steer.id === e.pointerId) {
    rudderTouch = clamp((e.clientX - steer.x0) / 70, -1, 1);
  } else if (joy && joy.id === e.pointerId) {
    let dx = (e.clientX - joy.x0) / 44, dy = (e.clientY - joy.y0) / 44;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    joyVec.x = dx; joyVec.y = -dy;
    joyKnob.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
  }
});
function endJoy() {
  joy = null; joyVec.x = joyVec.y = 0;
  joyEl.style.display = 'none';
}
const release = (e) => {
  pointers.delete(e.pointerId);
  if (steer && steer.id === e.pointerId) { steer = null; rudderTouch = 0; }
  if (joy && joy.id === e.pointerId) endJoy();
  if (pointers.size < 2) pinch = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const k = Math.exp(e.deltaY * 0.001);
  chaseDist = clamp(chaseDist * k, 12, 55);
  isoZoom = clamp(isoZoom * k, 12, 80);
}, { passive: false });
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);
  wake1();
  if (k === 'c') toggleCam();
  if (k === 'm') openSheet('map');
  if (k === 'escape') closeSheets();
  if ((k === ' ' || k === 'e' || k === 'enter') && currentAction) { e.preventDefault(); currentAction.run(); }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); pointers.clear(); steer = null; pinch = null; rudderTouch = 0; endJoy(); });
document.addEventListener('gesturestart', (e) => e.preventDefault());

function toggleCam() {
  mode = mode === 'chase' ? 'iso' : 'chase';
  store.set('cam', mode);
}
$('cam').addEventListener('click', toggleCam);
const sndBtn = $('snd');
sndBtn.classList.toggle('off', sound.muted);
sndBtn.addEventListener('click', () => {
  sound.start();
  sound.setMuted(!sound.muted);
  store.set('muted', sound.muted);
  sndBtn.classList.toggle('off', sound.muted);
});

const title = $('title');
let titleShown = true;
function dismissTitle() {
  if (!titleShown) return;
  titleShown = false;
  title.classList.add('gone');
}
setTimeout(dismissTitle, 7000);

// ——— Carte, carnet, lettres ———
function closeSheets() { for (const s of document.querySelectorAll('.sheet')) s.hidden = true; }
for (const s of document.querySelectorAll('.sheet')) {
  s.addEventListener('click', (e) => { if (e.target === s || e.target.classList.contains('close') || s.id === 'letter') s.hidden = true; });
}
function drawMap() {
  const f = focus();
  mapView.draw(progress, f.x, f.z, {
    boat, walker: state === 'walk' ? walker : null,
    lighthouses: [...world.lighthouses].map((lh) => ({ x: lh.pos.x, z: lh.pos.z, lit: lh.lit })),
  });
}
function openSheet(which) {
  wake1();
  closeSheets();
  if (which === 'map') { drawMap(); $('mapsheet').hidden = false; }
  if (which === 'book') { fillBook(); $('booksheet').hidden = false; }
}
$('mapbtn').addEventListener('click', () => openSheet('map'));
$('bookbtn').addEventListener('click', () => openSheet('book'));

function showLetter(i) {
  $('lettertext').textContent = MESSAGES[i];
  closeSheets();
  $('letter').hidden = false;
}

function fillBook() {
  const el = $('bookbody');
  el.innerHTML = '';
  const add = (tag, text, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; el.append(n); return n; };
  const islands = Object.values(progress.islands);
  const lit = [...progress.lit].length;
  const found = Object.entries(progress.bottles);
  const stats = add('div', '', 'stats');
  for (const [n, label] of [[islands.length, 'îles'], [lit, 'phares rallumés'], [found.length, 'bouteilles']]) {
    const d = document.createElement('div');
    const b = document.createElement('b'); b.textContent = n;
    const s = document.createElement('span'); s.textContent = label;
    d.append(b, s); stats.append(d);
  }
  add('p', `${(progress.dist / 1852).toFixed(1)} milles parcourus`, 'list');

  add('h3', 'Observations');
  const grid = add('div', '', 'species');
  for (const sp of SPECIES) {
    const d = document.createElement('div');
    const n = progress.seen[sp.id] || 0;
    if (!n) d.className = 'no';
    d.textContent = n ? sp.name : '? ? ?';
    const s = document.createElement('small');
    s.textContent = n ? `vu ${n} fois` : sp.hint;
    d.append(s); grid.append(d);
  }

  add('h3', 'Îles');
  add('div', islands.length ? islands.map((i) => i.name).join(' · ') : 'Aucune pour l\'instant.', 'list');

  add('h3', 'Bouteilles à la mer');
  const list = add('div', '', 'list');
  if (!found.length) list.textContent = 'Elles dérivent au large. Approche-toi des reflets.';
  found.forEach(([, msg], i) => {
    const b = document.createElement('button');
    b.textContent = `Lettre ${i + 1}`;
    b.addEventListener('click', () => showLetter(msg));
    list.append(b);
    if (i < found.length - 1) list.append(' · ');
  });

  const reset = add('p', '', 'list');
  const rb = document.createElement('button');
  rb.textContent = 'Effacer le carnet et repartir du port';
  rb.style.opacity = '0.6';
  rb.addEventListener('click', () => {
    if (!confirm('Tout effacer : îles, phares, bouteilles et observations ?')) return;
    progress.clear();
    location.reload();
  });
  reset.append(rb);
}

// ——— Actions contextuelles ———
const actionBtn = $('action');
let currentAction = null;
actionBtn.addEventListener('click', () => currentAction && currentAction.run());
function setAction(a) {
  if ((a && a.label) === (currentAction && currentAction.label)) { currentAction = a; return; }
  currentAction = a;
  actionBtn.hidden = !a;
  if (a) actionBtn.textContent = a.label;
}

function findLanding() {
  const [fx, fz] = boat.forward;
  let best = null;
  for (let r = 3; r <= 14 && !best; r += 1.5) {
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const x = boat.x + Math.sin(a) * r, z = boat.z - Math.cos(a) * r;
      const g = world.groundAt(x, z);
      if (g > 0.4 && g < 6 && (!best || Math.sin(a) * fx - Math.cos(a) * fz > best.dot)) {
        best = { x, z, y: g, dot: Math.sin(a) * fx - Math.cos(a) * fz };
      }
    }
  }
  return best;
}

function disembark(p) {
  state = 'walk';
  document.body.classList.add('walking');
  boat.setAnchored(true);
  walker.place(p.x, p.z, p.y, Math.atan2(p.x - boat.x, -(p.z - boat.z)));
  steer = null; rudderTouch = 0;
  sound.splash();
}
function embark() {
  state = 'sail';
  document.body.classList.remove('walking');
  walker.hide();
  boat.setAnchored(false);
  endJoy();
  camYaw = boat.heading;
}

let actionTimer = 0;
function updateAction(dt) {
  actionTimer -= dt;
  if (actionTimer > 0) return;
  actionTimer = 0.2;
  if (state === 'sail') {
    const p = boat.speed < 4.5 ? findLanding() : null;
    setAction(p ? { label: 'Accoster', run: () => disembark(findLanding() || p) } : null);
    return;
  }
  const lh = world.lighthouseNear(walker.x, walker.z);
  if (lh) {
    setAction({
      label: 'Allumer le phare',
      run: () => {
        lh.lit = true; lh.flash = 1;
        progress.lit.add(lh.id);
        progress.save();
        const is = islandsNear(lh.pos.x, lh.pos.z).find((i) => i.id === lh.id);
        toast('Phare rallumé', is ? is.name : '');
        sound.chime();
        setAction(null);
      },
    });
    return;
  }
  const near = Math.hypot(walker.x - boat.x, walker.z - boat.z) < 8;
  setAction(near ? { label: 'Embarquer', run: embark } : null);
}

// ——— Boucle ———
let t = 0, last = performance.now(), rudder = 0;
const center = new THREE.Vector3();
let slowTimer = 0, gullTimer = 5;
const focus = () => (state === 'walk' ? walker : boat);

function updateWind() {
  const base = 0.5 + 0.45 * vnoise(t * 0.012, 7.7);
  wind.from = Math.PI * 0.5 + (vnoise(t * 0.004, 3.1) - 0.5) * 1.6 + Math.sin(t * 0.0009) * 0.5;
  wind.strength = Math.min(1, base + 0.22 * weather.p.rain + 0.18 * weather.p.storm);
  waveState.scale = 0.55 + 0.65 * wind.strength;
}

function updateCamera(dt) {
  const f = focus();
  const fog = weather.p.fog;
  if (mode === 'chase') {
    let dist = chaseDist, lookY = 2.2, lead = 6;
    if (state === 'walk') {
      camYaw += angleDiff(walker.heading, camYaw) * Math.min(1, dt * 0.9 * walker.moving);
      dist = clamp(chaseDist * 0.55, 7, 30); lookY = 1.6; lead = 2;
    } else {
      camYaw += angleDiff(boat.heading, camYaw) * Math.min(1, dt * 1.4);
    }
    const fx = Math.sin(camYaw), fz = -Math.cos(camYaw);
    chase.aspect = pipe.aspect;
    chase.updateProjectionMatrix();
    chase.position.set(f.x - fx * dist, f.y + 2 + dist * 0.36, f.z - fz * dist);
    chase.lookAt(f.x + fx * lead, f.y + lookY, f.z + fz * lead);
    pipe.offset.set(0, 0);
    scene.fog.near = U.fogNear.value = lerp(180, 22, fog);
    scene.fog.far = U.fogFar.value = lerp(520, 140, fog);
    return chase;
  }
  const a = pipe.aspect, zoom = state === 'walk' ? isoZoom * 0.6 : isoZoom;
  Object.assign(iso, { top: zoom, bottom: -zoom, left: -zoom * a, right: zoom * a });
  iso.updateProjectionMatrix();
  // Caméra calée sur la grille de pixels, reste sous-pixel rattrapé à l'affichage : pas de scintillement.
  const ps = (2 * zoom) / pipe.rtH;
  const p = new THREE.Vector3(f.x, state === 'walk' ? f.y : 0, f.z).add(isoOff);
  const pr = p.dot(isoRight), pu = p.dot(isoUp);
  const sr = Math.round(pr / ps) * ps, su = Math.round(pu / ps) * ps;
  p.addScaledVector(isoRight, sr - pr).addScaledVector(isoUp, su - pu);
  iso.position.copy(p);
  pipe.offset.set((pr - sr) / ps, (pu - su) / ps);
  scene.fog.near = U.fogNear.value = ISO_DIST + lerp(160, 15, fog);
  scene.fog.far = U.fogFar.value = ISO_DIST + lerp(520, 150, fog);
  return iso;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  U.uTime.value = t;

  const viewYaw = mode === 'chase' ? camYaw : isoYaw;
  let kx = 0, ky = 0;
  if (keys.has('arrowleft') || keys.has('a') || keys.has('q')) kx -= 1;
  if (keys.has('arrowright') || keys.has('d')) kx += 1;
  if (keys.has('arrowup') || keys.has('w') || keys.has('z')) ky += 1;
  if (keys.has('arrowdown') || keys.has('s')) ky -= 1;

  updateWind();
  if (state === 'sail') {
    const want = kx || rudderTouch;
    rudder += (want - rudder) * Math.min(1, dt * (want ? 10 : 4));
  } else {
    rudder += (0 - rudder) * Math.min(1, dt * 4);
  }
  boat.update(dt, t, wind, rudder, heightAt);
  if (state === 'walk') {
    const jx = kx || joyVec.x, jy = ky || joyVec.y;
    const fx = Math.sin(viewYaw), fz = -Math.cos(viewYaw), rx = Math.cos(viewYaw), rz = Math.sin(viewYaw);
    const stepped = walker.update(dt, t, rx * jx + fx * jy, rz * jx + fz * jy, world);
    if (stepped) sound.step();
    progress.dist += walker.moving * 5 * dt;
  } else {
    progress.dist += boat.speed * dt;
  }
  const f = focus();
  center.set(f.x, 0, f.z);
  world.update(boat.x, boat.z);
  water.follow(boat.x, boat.z, heightAt);

  const cam = updateCamera(dt);
  weather.update(dt, mode === 'chase' ? cam.position : f, wind, sky.sunDir.y);
  sky.update(dt, center, cam, wind, mode === 'chase', weather);
  water.setColors(sky.pal, sky.sunDir, sky.sunDir.y > 0 ? 1 - weather.p.cloud * 0.8 : 0);
  world.setNight(Math.max(sky.night, weather.p.cloud * 0.35), t);
  boat.setNight(Math.max(sky.night, weather.p.cloud * 0.3));
  wake.update(dt, t, boat, sky.pal.foam);
  spray.update(dt, sky.pal.foam);
  streaks.update(dt, boat.x, boat.z, wind, sky.pal.foam);
  bottles.update(dt, t, boat.x, boat.z);

  // Faune et phénomènes.
  slowTimer -= dt;
  let nearIslands = null;
  if (slowTimer <= 0) {
    slowTimer = 0.5;
    nearIslands = islandsNear(f.x, f.z, 260);
    gulls.islands = nearIslands;
    progress.reveal(f.x, f.z);
    const is = progress.discover(f.x, f.z);
    if (is) { toast(is === START ? 'Port d\'attache' : 'Nouvelle île', is.name); sound.chime(); }
    if (weather.p.fog > 0.6) observe('brume');
    if (weather.flash > 0.9) observe('orage');
    if (weather.rainbow > 0.5 && -sky.sunDir.y > -0.6) observe('arc');
    progress.boat = { x: boat.x, z: boat.z, heading: boat.heading };
    progress.phase = sky.phase;
  }
  const gd = gulls.update(dt, t, f.x, f.z, gulls.islands || []);
  if (gd < 90) observe('mouettes');
  gullTimer -= dt;
  if (gd < 70 && gullTimer <= 0) { gullTimer = 6 + Math.random() * 10; sound.gull(); }
  if (dolphins.update(dt, t, boat, heightAt)) observe('dauphins');
  if (whale.update(dt, t, boat, heightAt, () => sound.whale())) observe('baleine');
  if (stars.update(dt, cam, sky.night, weather.p.cloud)) observe('filante');

  if (state === 'sail') {
    const msg = bottles.pickup(boat.x, boat.z);
    if (msg >= 0) { sound.splash(); sound.chime(); showLetter(msg); }
  }
  updateAction(dt);
  updateToasts(dt);
  progress.tick(dt);

  sound.update(dt, {
    wind: wind.strength, speed: boat.speed, luff: boat.luff, walking: state === 'walk',
    rain: weather.p.rain, storm: weather.p.storm, night: sky.night,
  });

  pipe.render(scene, cam);
  const label = state === 'walk' ? (islandsNear(walker.x, walker.z).find((i) => Math.hypot(i.x - walker.x, i.z - walker.z) < i.r * 1.2)?.name || 'À terre') : null;
  hud.draw(dt, viewYaw, state === 'walk' ? walker : boat, boat, wind, !!steer || (state === 'sail' && !!kx), label);
}
weather.onThunder = () => sound.thunder();
requestAnimationFrame(frame);
window.addEventListener('pagehide', () => progress.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) progress.save(); });

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Accès debug depuis la console.
window.alize = {
  boat, walker, wind, sky, world, water, weather, progress, heightAt, pipe, scene, dolphins, whale,
  setPhase: (p) => { sky.phase = p; },
  input: () => ({ keys: [...keys], pointers: pointers.size, steer, rudderTouch, state }),
  land: () => { const p = findLanding(); if (p) disembark(p); return p; },
  embark,
};
