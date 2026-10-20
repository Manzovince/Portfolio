import * as THREE from 'three';
import { U, toon, bake, merge, M, smooth } from './util.js?v=1';
import { rng } from './noise.js?v=1';

// Palette par moment de la journée (phase 0 = minuit, 0.5 = midi).
const KEYS = [
  { p: 0.00, top: '#0a0f2c', hor: '#1b2752', sun: '#7d8fd6', si: 0.35, hs: '#2c3a78', hg: '#0e1430', hi: 0.8, deep: '#0f2150', shal: '#1d4a78', foam: '#9fb0e0' },
  { p: 0.19, top: '#121a44', hor: '#2c3266', sun: '#8a90d8', si: 0.35, hs: '#353f80', hg: '#141830', hi: 0.8, deep: '#122656', shal: '#22507e', foam: '#a8b4e0' },
  { p: 0.25, top: '#4a5ea0', hor: '#f4a27c', sun: '#ffb27e', si: 0.8, hs: '#8a86c0', hg: '#5a4a60', hi: 0.9, deep: '#2c4f92', shal: '#46a6b4', foam: '#fde2d6' },
  { p: 0.32, top: '#5aaaf0', hor: '#d2ecf6', sun: '#fff0d8', si: 1.0, hs: '#b4d4f4', hg: '#7a8a60', hi: 1.0, deep: '#2077c8', shal: '#3ccfcc', foam: '#ffffff' },
  { p: 0.50, top: '#3d9cf2', hor: '#c4e8ff', sun: '#ffffff', si: 1.1, hs: '#c0dcf6', hg: '#80905a', hi: 1.0, deep: '#1a7ad4', shal: '#40dcd2', foam: '#ffffff' },
  { p: 0.68, top: '#4aa0ec', hor: '#e4eef0', sun: '#fff0d0', si: 1.0, hs: '#b8d2ee', hg: '#7c8858', hi: 1.0, deep: '#1f74c4', shal: '#3ccaca', foam: '#ffffff' },
  { p: 0.75, top: '#4d5aa4', hor: '#ff985a', sun: '#ff9a5a', si: 0.8, hs: '#a08ac0', hg: '#604858', hi: 0.9, deep: '#2c5aa0', shal: '#50a6ac', foam: '#ffe4cc' },
  { p: 0.81, top: '#1e2660', hor: '#7a4c84', sun: '#8a8ad8', si: 0.35, hs: '#3e3e80', hg: '#1a1830', hi: 0.8, deep: '#173170', shal: '#2a5a88', foam: '#b8b4e0' },
  { p: 1.00, top: '#0a0f2c', hor: '#1b2752', sun: '#7d8fd6', si: 0.35, hs: '#2c3a78', hg: '#0e1430', hi: 0.8, deep: '#0f2150', shal: '#1d4a78', foam: '#9fb0e0' },
];
const COLOR_KEYS = ['top', 'hor', 'sun', 'hs', 'hg', 'deep', 'shal', 'foam'];
const GRAY = new THREE.Color(), FLASH = new THREE.Color('#e8eeff');
for (const k of KEYS) for (const c of COLOR_KEYS) k[c] = new THREE.Color(k[c]);

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FRAG = /* glsl */`
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunColor;
uniform vec3 uSunDir; uniform vec3 uMoonDir; uniform float uNight;
uniform float uRainbow; uniform float uCloud;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.42, d.y));
  float sd = dot(d, uSunDir);
  col = mix(col, uSunColor, smoothstep(0.8, 1.0, sd) * 0.35);
  if (sd > 0.9993) col = mix(uSunColor, vec3(1.0), 0.65);
  else if (sd > 0.9978) col = mix(col, uSunColor, 0.75);
  // Arc-en-ciel : anneau de 42° autour du point antisolaire.
  if (uRainbow > 0.0 && d.y > 0.0) {
    float a = degrees(acos(clamp(dot(d, -uSunDir), -1.0, 1.0)));
    float k = (a - 39.5) / 3.5;
    if (k > 0.0 && k < 1.0) {
      vec3 rb = k < 0.17 ? vec3(0.55, 0.35, 0.9) : k < 0.34 ? vec3(0.3, 0.45, 1.0) : k < 0.5 ? vec3(0.3, 0.85, 0.5)
              : k < 0.67 ? vec3(1.0, 0.92, 0.35) : k < 0.84 ? vec3(1.0, 0.6, 0.25) : vec3(1.0, 0.3, 0.3);
      col = mix(col, rb, 0.4 * uRainbow * smoothstep(0.0, 0.2, d.y));
    }
  }
  float md = dot(d, uMoonDir);
  if (md > 0.9994) col = mix(col, vec3(0.93, 0.95, 1.0), uNight);
  else if (md > 0.998) col = mix(col, vec3(0.5, 0.56, 0.8), uNight * 0.5);
  gl_FragColor = vec4(col, 0.0);
}`;

export class Sky {
  constructor(scene, phase = 0.32) {
    this.scene = scene;
    this.phase = phase;
    this.dayLength = 480;
    this.night = 0;
    this.sunDir = new THREE.Vector3();
    this.lightDir = new THREE.Vector3();
    this.pal = Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color()]));

    this.hemi = new THREE.HemisphereLight();
    this.sun = new THREE.DirectionalLight();
    this.sun.castShadow = true;
    const sc = this.sun.shadow;
    sc.mapSize.set(2048, 2048);
    Object.assign(sc.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 500 });
    sc.bias = -0.0006;
    sc.normalBias = 0.25;
    scene.add(this.hemi, this.sun, this.sun.target);

    this.skyU = {
      uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunColor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() }, uMoonDir: { value: new THREE.Vector3() }, uNight: { value: 0 },
      uRainbow: { value: 0 }, uCloud: { value: 0 },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({ uniforms: this.skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // Étoiles : un pixel chacune.
    const R = rng(99);
    const sp = [], sb = [];
    for (let i = 0; i < 700; i++) {
      const y = 0.04 + R() * 0.96, a = R() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      sp.push(Math.cos(a) * r * 850, y * 850, Math.sin(a) * r * 850);
      sb.push(0.35 + Math.pow(R(), 3) * 0.65);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sg.setAttribute('aB', new THREE.Float32BufferAttribute(sb, 1));
    this.starU = { uNight: { value: 0 }, uTime: U.uTime };
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.starU,
      vertexShader: `attribute float aB; varying float vB; void main(){ vB = aB; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_PointSize = 1.0; }`,
      fragmentShader: `uniform float uNight; uniform float uTime; varying float vB; void main(){ float tw = 0.75 + 0.25 * sin(uTime * 2.3 + vB * 91.0); gl_FragColor = vec4(vec3(0.9, 0.93, 1.0) * vB * tw * uNight, 0.0); }`,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      depthWrite: false, transparent: true,
    }));
    this.stars.renderOrder = -9;
    this.stars.frustumCulled = false;
    scene.add(this.stars);

    // Nuages bas-poly qui dérivent avec le vent.
    const cloudMat = toon('#ffffff', { vertexColors: true });
    this.cloudMat = cloudMat;
    const variants = [];
    for (let v = 0; v < 4; v++) {
      const parts = [];
      const n = 4 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        const r = 6 + R() * 7;
        parts.push(bake(new THREE.IcosahedronGeometry(r, 0), '#ffffff',
          M([(i - n / 2) * 7 + R() * 4, R() * 3, R() * 8 - 4], [R() * 3, R() * 3, 0], [1, 0.55, 0.85])));
      }
      variants.push(merge(parts));
    }
    this.clouds = [];
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(variants[i % 4], cloudMat);
      const a = R() * Math.PI * 2, d = 100 + R() * 600;
      m.position.set(Math.cos(a) * d, 85 + R() * 50, Math.sin(a) * d);
      m.rotation.y = R() * Math.PI;
      m.scale.setScalar(0.8 + R() * 0.9);
      this.clouds.push(m);
      scene.add(m);
    }
    this.R = R;
  }

  update(dt, center, camera, wind, showClouds, weather) {
    this.phase = (this.phase + dt / this.dayLength) % 1;
    let i = 0;
    while (KEYS[i + 1].p <= this.phase) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const f = smooth(0, 1, (this.phase - a.p) / (b.p - a.p));
    for (const k of COLOR_KEYS) this.pal[k].copy(a[k]).lerp(b[k], f);
    let si = a.si + (b.si - a.si) * f, hi = a.hi + (b.hi - a.hi) * f;

    // Ciel couvert : couleurs ternies vers le gris, soleil voilé ; éclairs.
    const wp = weather.p, cover = wp.cloud;
    for (const k of COLOR_KEYS) {
      const c = this.pal[k], l = c.r * 0.3 + c.g * 0.55 + c.b * 0.15;
      const amt = k === 'deep' || k === 'shal' ? 0.35 : 0.6;
      c.lerp(GRAY.setRGB(l * 0.95, l, l * 1.08), cover * amt);
    }
    si *= 1 - 0.6 * cover;
    hi *= 1 - 0.1 * cover;
    if (weather.flash > 0) {
      for (const k of ['top', 'hor', 'hs']) this.pal[k].lerp(FLASH, weather.flash * 0.7);
      hi += weather.flash * 2.5;
    }

    const ang = (this.phase - 0.25) * Math.PI * 2;
    this.sunDir.set(Math.cos(ang), Math.sin(ang) * 0.85, 0.35).normalize();
    const moon = this.sunDir.clone().negate();
    this.night = smooth(0.03, -0.14, this.sunDir.y);
    this.lightDir.copy(this.sunDir.y > 0 ? this.sunDir : moon);
    this.lightDir.y = Math.max(this.lightDir.y, 0.2);
    this.lightDir.normalize();

    this.hemi.color.copy(this.pal.hs);
    this.hemi.groundColor.copy(this.pal.hg);
    this.hemi.intensity = hi * Math.PI * 0.55;
    this.sun.color.copy(this.pal.sun);
    this.sun.intensity = si * Math.PI * 0.85;
    this.sun.position.copy(center).addScaledVector(this.lightDir, 200);
    this.sun.target.position.copy(center);

    const s = this.skyU;
    s.uTop.value.copy(this.pal.top);
    s.uHorizon.value.copy(this.pal.hor);
    s.uSunColor.value.copy(this.pal.sun);
    s.uSunDir.value.copy(this.sunDir);
    s.uMoonDir.value.copy(moon);
    s.uNight.value = this.night * (1 - cover * 0.8);
    s.uRainbow.value = weather.rainbow;
    s.uCloud.value = cover;
    this.starU.uNight.value = this.night * (1 - cover * 0.9);
    this.cloudMat.color.setRGB(1, 1, 1).lerp(GRAY.setRGB(0.5, 0.52, 0.58), cover * 0.7 + wp.storm * 0.2);
    this.stars.visible = this.night > 0.01;
    U.fogColor.value.copy(this.pal.hor);
    this.scene.fog.color.copy(this.pal.hor);

    this.dome.position.copy(camera.position);
    this.stars.position.copy(camera.position);

    const tx = -Math.sin(wind.from) * wind.strength * 4, tz = Math.cos(wind.from) * wind.strength * 4;
    const shown = 9 + Math.round(13 * cover);
    for (const [i, c] of this.clouds.entries()) {
      c.visible = showClouds && i < shown;
      c.position.x += tx * dt; c.position.z += tz * dt;
      const dx = c.position.x - center.x, dz = c.position.z - center.z;
      if (dx * dx + dz * dz > 720 * 720) {
        // Réapparaît au vent, de l'autre côté.
        const w = Math.hypot(tx, tz) || 1, side = (this.R() - 0.5) * 900;
        c.position.x = center.x - (tx / w) * 650 + (-tz / w) * side;
        c.position.z = center.z - (tz / w) * 650 + (tx / w) * side;
      }
    }
  }
}
