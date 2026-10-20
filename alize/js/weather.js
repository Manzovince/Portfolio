import * as THREE from 'three';
import { markerMat } from './util.js?v=1';

const TYPES = {
  clair:   { cloud: 0.0, fog: 0, rain: 0, storm: 0, w: 4 },
  nuageux: { cloud: 0.6, fog: 0, rain: 0, storm: 0, w: 3 },
  brume:   { cloud: 0.35, fog: 1, rain: 0, storm: 0, w: 1.4 },
  pluie:   { cloud: 0.85, fog: 0.3, rain: 1, storm: 0, w: 1.4 },
  orage:   { cloud: 1.0, fog: 0.2, rain: 1, storm: 1, w: 0.6 },
};
const DROPS = 520;

// Météo qui change lentement : nuages, brume, pluie, orage, arc-en-ciel.
export class Weather {
  constructor(scene, initial = 'clair') {
    this.name = initial;
    this.p = { cloud: 0, fog: 0, rain: 0, storm: 0 };
    Object.assign(this.p, TYPES[initial]);
    this.timer = 150 + Math.random() * 90;
    this.flash = 0;
    this.rainbow = 0;
    this.thunderAt = -1;
    this.onThunder = null;

    const pos = new Float32Array(DROPS * 6);
    this.drops = Array.from({ length: DROPS }, () => ({ x: 0, y: -100, z: 0 }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainMat = markerMat('#c4d2ea');
    this.rain = new THREE.LineSegments(geo, this.rainMat);
    this.rain.frustumCulled = false;
    scene.add(this.rain);
  }

  set(name) {
    this.name = name;
    this.timer = 150 + Math.random() * 120;
  }

  pick() {
    const entries = Object.entries(TYPES).filter(([k]) => k !== this.name);
    let r = Math.random() * entries.reduce((s, [, v]) => s + v.w, 0);
    for (const [k, v] of entries) { r -= v.w; if (r <= 0) return k; }
    return 'clair';
  }

  update(dt, focus, wind, sunY) {
    this.timer -= dt;
    if (this.timer <= 0) this.set(this.pick());
    const target = TYPES[this.name];
    const wasRaining = this.p.rain;
    for (const k of ['cloud', 'fog', 'rain', 'storm']) {
      const d = target[k] - this.p[k];
      this.p[k] += Math.sign(d) * Math.min(Math.abs(d), dt / 30);
    }
    // Arc-en-ciel quand la pluie se retire en plein jour.
    if (wasRaining > 0.25 && this.p.rain <= 0.25 && sunY > 0.05 && sunY < 0.75) this.rainbow = 1;
    this.rainbow = Math.max(0, this.rainbow - dt / 70);

    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.p.storm > 0.5 && Math.random() < dt * 0.07 * this.p.storm) {
      this.flash = 1;
      this.thunderAt = 0.6 + Math.random() * 2;
    }
    if (this.thunderAt > 0) {
      this.thunderAt -= dt;
      if (this.thunderAt <= 0 && this.onThunder) this.onThunder();
    }

    // Pluie : segments qui tombent en biais autour de la caméra.
    const n = Math.floor(DROPS * this.p.rain);
    this.rain.visible = n > 0;
    if (!n) return;
    const arr = this.rain.geometry.attributes.position.array;
    const sx = -Math.sin(wind.from) * wind.strength * 9, sz = Math.cos(wind.from) * wind.strength * 9;
    for (let i = 0; i < n; i++) {
      const d = this.drops[i];
      d.y -= 38 * dt; d.x += sx * dt; d.z += sz * dt;
      if (d.y < -1 || Math.abs(d.x - focus.x) > 40 || Math.abs(d.z - focus.z) > 40) {
        d.x = focus.x + (Math.random() - 0.5) * 80;
        d.z = focus.z + (Math.random() - 0.5) * 80;
        d.y = focus.y + 4 + Math.random() * 30;
      }
      const k = i * 6;
      arr[k] = d.x; arr[k + 1] = d.y; arr[k + 2] = d.z;
      arr[k + 3] = d.x + sx * 0.05; arr[k + 4] = d.y + 1.4; arr[k + 5] = d.z + sz * 0.05;
    }
    this.rain.geometry.setDrawRange(0, n * 2);
    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}
