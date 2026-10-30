// Ciel, lumière du jour et de la nuit, météo (pluie, neige), nuages et étoiles.
import { THREE, scene, Builder, modelFrom } from './gfx.js?v=2';
import { waterU } from './world.js?v=2';
import { clamp, lerp, sstep, hash2, mulberry32 } from './util.js?v=2';

const NIGHT = { top: '#0c1a40', bot: '#2c4180', sun: '#a8c0ff', sI: .9, hs: '#6a80c8', hg: '#2a2c48', hI: 1.15, sh: '#1f5f7a', dp: '#0f2c4c', light: .5 };
const DAWN = { top: '#6d74b8', bot: '#ffbe8f', sun: '#ffb47a', sI: 1.7, hs: '#d2b0c8', hg: '#6a5050', hI: .95, sh: '#57bfcc', dp: '#2a709a', light: .85 };
const DAY = { top: '#5fb8f0', bot: '#dff2f4', sun: '#fff3df', sI: 2.6, hs: '#d6ebff', hg: '#9c8762', hI: 1.3, sh: '#5fd8d4', dp: '#1f90b8', light: 1 };
const DUSK = { top: '#5d63a8', bot: '#f7a27c', sun: '#ff9a5b', sI: 1.8, hs: '#c6a3c8', hg: '#6a4f4f', hI: .9, sh: '#4fa0c0', dp: '#2a5f90', light: .82 };
const KEYS = [[0, NIGHT], [4.5, NIGHT], [6, DAWN], [8, DAY], [16.5, DAY], [18.6, DUSK], [20.2, NIGHT], [24, NIGHT]];
const GREY = { top: '#8796a6', bot: '#c2c9cf' };
const C = {}; const cc = h => C[h] || (C[h] = new THREE.Color(h));

export const WEATHER_INFO = { clair: { nom: 'Ensoleillé', emoji: '☀️', nuit: '🌙' }, nuageux: { nom: 'Nuageux', emoji: '⛅', nuit: '☁️' }, pluie: { nom: 'Pluie', emoji: '🌧️', nuit: '🌧️' } };
export function weatherFor(seed, day, hour) {
  const block = Math.floor(hour / 4), r = hash2(day, block, seed);
  return r < .58 ? 'clair' : r < .83 ? 'nuageux' : 'pluie';
}

const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } }, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-.02, .5, vP.y)), 1.);\n#include <colorspace_fragment>\n}' }));
dome.renderOrder = -10; scene.add(dome);
const starGeo = new THREE.BufferGeometry(); { const a = [], r = mulberry32(3); for (let i = 0; i < 700; i++) { const th = r() * 6.28, ph = Math.acos(r() * .96); a.push(Math.cos(th) * Math.sin(ph) * 800, Math.cos(ph) * 800, Math.sin(th) * Math.sin(ph) * 800); } starGeo.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); }
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#fff', size: 2, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
dome.add(stars);
const disc = new THREE.Mesh(new THREE.CircleGeometry(30, 24), new THREE.MeshBasicMaterial({ color: '#fff6d8', fog: false, transparent: true, depthWrite: false }));
dome.add(disc);

export const hemi = new THREE.HemisphereLight(); scene.add(hemi);
export const sun = new THREE.DirectionalLight(); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 220 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .04;
scene.add(sun, sun.target);
scene.fog = new THREE.Fog('#dff2f4', 80, 260);

// nuages
const clouds = new THREE.Group(); scene.add(clouds);
{ const r = mulberry32(9), b = new Builder(); for (let i = 0; i < 6; i++) b.ball('#ffffff', [(i - 2.5) * 5 + r() * 2, r() * 2.5, r() * 4 - 2], 4 + r() * 3);
  const geos = b.geometries();
  for (let i = 0; i < 14; i++) { const c = modelFrom(geos, { shadow: false }); c.position.set((r() - .5) * 700, 70 + r() * 30, (r() - .5) * 700); c.scale.setScalar(.7 + r() * .8); c.userData.v = 2 + r() * 3; clouds.add(c); } }

// pluie / neige
const DROPS = 700, rainGeo = new THREE.BufferGeometry(), rp = new Float32Array(DROPS * 6);
rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#d8e8f4', transparent: true, opacity: .55, fog: false }));
rain.frustumCulled = false; scene.add(rain);
const snowGeo = new THREE.BufferGeometry(), sp = new Float32Array(DROPS * 3); snowGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: '#ffffff', size: .25, transparent: true, opacity: .9 })); snow.frustumCulled = false; scene.add(snow);
const drops = []; { const r = mulberry32(5); for (let i = 0; i < DROPS; i++) drops.push({ x: (r() - .5) * 50, y: r() * 25, z: (r() - .5) * 50, v: 18 + r() * 8 }); }

const tmp = {}; for (const k of Object.keys(DAY)) tmp[k] = typeof DAY[k] === 'number' ? 0 : new THREE.Color();
function sample(hour) {
  let i = 0; while (i < KEYS.length - 2 && hour >= KEYS[i + 1][0]) i++;
  const [h0, a] = KEYS[i], [h1, b] = KEYS[i + 1], t = sstep(0, 1, (hour - h0) / (h1 - h0));
  for (const k of Object.keys(DAY)) { if (typeof a[k] === 'number') tmp[k] = lerp(a[k], b[k], t); else tmp[k].copy(cc(a[k])).lerp(cc(b[k]), t); }
  return tmp;
}
let cloudy = 0;
export const skyState = { night: 0, rain: 0 };
export function updateSky(dt, hour, weather, center, camPos, indoor, snowy) {
  const target = weather === 'pluie' ? 1 : weather === 'nuageux' ? .55 : 0;
  cloudy += (target - cloudy) * Math.min(1, dt * .3);
  const k = sample(hour), night = 1 - sstep(.5, 1, k.light);
  skyState.night = clamp((1 - k.light) / .5, 0, 1); skyState.rain = weather === 'pluie' ? 1 : 0;
  const grey = cloudy * .75;
  dome.material.uniforms.top.value.copy(k.top).lerp(cc(GREY.top).clone().multiplyScalar(k.light), grey);
  dome.material.uniforms.bot.value.copy(k.bot).lerp(cc(GREY.bot).clone().multiplyScalar(k.light), grey);
  dome.position.copy(camPos);
  stars.material.opacity = clamp(1 - k.light * 1.6, 0, 1) * (1 - cloudy); stars.visible = stars.material.opacity > .01;
  // soleil / lune
  const a = (hour - 6) / 12 * Math.PI, isDay = hour >= 5.5 && hour < 18.5, ang = isDay ? a : a - Math.PI;
  const dir = new THREE.Vector3(Math.cos(ang) * -.8, Math.max(.25, Math.sin(ang)), -.45).normalize();
  disc.position.copy(dir).multiplyScalar(780); disc.lookAt(0, 0, 0);
  disc.material.color.set(isDay ? '#fff3c8' : '#e8eeff'); disc.material.opacity = (1 - cloudy) * (isDay ? 1 : .9); disc.scale.setScalar(isDay ? 1 : .6);
  sun.position.copy(center).addScaledVector(dir, 120); sun.target.position.copy(center);
  sun.color.copy(k.sun); sun.intensity = k.sI * (1 - cloudy * .6);
  hemi.color.copy(k.hs); hemi.groundColor.copy(k.hg); hemi.intensity = k.hI * (1 - cloudy * .12);
  scene.fog.color.copy(dome.material.uniforms.bot.value); scene.fog.near = 70 - cloudy * 20; scene.fog.far = 250 - cloudy * 60;
  waterU.uShallow.value.copy(k.sh); waterU.uDeep.value.copy(k.dp); waterU.uLight.value = 1 - cloudy * .18;
  waterU.uFogColor.value.copy(scene.fog.color); waterU.uFogNear.value = scene.fog.near; waterU.uFogFar.value = scene.fog.far;
  // nuages
  clouds.visible = !indoor;
  for (const c of clouds.children) { c.position.x += c.userData.v * dt; if (c.position.x - center.x > 380) c.position.x -= 760; if (c.position.x - center.x < -380) c.position.x += 760;
    if (c.position.z - center.z > 380) c.position.z -= 760; if (c.position.z - center.z < -380) c.position.z += 760; }
  // précipitations
  const raining = weather === 'pluie' && !indoor;
  rain.visible = raining && !snowy; snow.visible = raining && snowy;
  if (raining) {
    for (let i = 0; i < DROPS; i++) { const d = drops[i];
      d.y -= (snowy ? 3 : d.v) * dt; if (snowy) d.x += Math.sin(d.y * .5 + i) * dt * .5;
      if (d.y < -2) { d.y += 26; d.x = (Math.random() - .5) * 50; d.z = (Math.random() - .5) * 50; }
      const x = center.x + d.x, y = center.y + d.y, z = center.z + d.z;
      if (snowy) { sp[i * 3] = x; sp[i * 3 + 1] = y; sp[i * 3 + 2] = z; }
      else { rp[i * 6] = x; rp[i * 6 + 1] = y; rp[i * 6 + 2] = z; rp[i * 6 + 3] = x - .05; rp[i * 6 + 4] = y + .7; rp[i * 6 + 5] = z; } }
    (snowy ? snowGeo : rainGeo).attributes.position.needsUpdate = true;
  }
  return k;
}
export function setOutdoor(v) { dome.visible = v; }
