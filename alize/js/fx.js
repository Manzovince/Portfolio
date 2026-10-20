import * as THREE from 'three';
import { markerMat } from './util.js?v=1';
import { waveHeight } from './water.js?v=1';

// Sillage : petites plaques d'écume laissées en V derrière la poupe.
export class Wake {
  constructor(scene) {
    this.N = 220;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.mat = markerMat('#ffffff');
    this.mesh = new THREE.InstancedMesh(geo, this.mat, this.N);
    this.mesh.frustumCulled = false;
    this.parts = Array.from({ length: this.N }, () => ({ x: 0, z: 0, vx: 0, vz: 0, age: 1, life: 1, size: 0, rot: 0 }));
    this.i = 0;
    this.acc = 0;
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.p = new THREE.Vector3();
    this.s = new THREE.Vector3();
    scene.add(this.mesh);
  }

  spawn(x, z, vx, vz, size, life) {
    const p = this.parts[this.i];
    this.i = (this.i + 1) % this.N;
    Object.assign(p, { x, z, vx, vz, age: 0, life, size, rot: Math.random() * Math.PI });
  }

  update(dt, t, boat, foam) {
    this.mat.uniforms.uColor.value.copy(foam);
    const [fx, fz] = boat.forward;
    const rx = Math.cos(boat.heading), rz = Math.sin(boat.heading);
    this.acc += dt;
    if (boat.speed > 1.2 && this.acc > 0.075) {
      this.acc = 0;
      const sx = boat.x - fx * 2.8, sz = boat.z - fz * 2.8;
      const v = 0.6 + boat.speed * 0.14, size = 0.32 + boat.speed * 0.03;
      for (const side of [-1, 1]) {
        const j = (Math.random() - 0.5) * 0.5;
        this.spawn(sx + rx * side * (0.9 + j), sz + rz * side * (0.9 + j), rx * side * v, rz * side * v, size * (0.7 + Math.random() * 0.6), 2.2);
      }
      if (boat.speed > 5 && Math.random() < 0.5) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.spawn(boat.x + fx * 2.4 + rx * side * 0.9, boat.z + fz * 2.4 + rz * side * 0.9, rx * side * v * 2, rz * side * v * 2, size * 0.8, 0.9);
      }
    }
    const up = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < this.N; k++) {
      const p = this.parts[k];
      p.age += dt;
      let sc = 0;
      if (p.age < p.life) {
        p.x += p.vx * dt; p.z += p.vz * dt;
        const u = p.age / p.life;
        sc = p.size * (0.6 + u * 0.8) * (1 - u * u);
      }
      this.p.set(p.x, waveHeight(p.x, p.z, t) + 0.3, p.z);
      this.q.setFromAxisAngle(up, p.rot);
      this.s.set(sc, 1, sc);
      this.m4.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(k, this.m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Traînées de vent façon Wind Waker : un trait qui se dessine puis s'enroule.
const PTS = 40;
export class WindStreaks {
  constructor(scene) {
    this.mat = markerMat('#ffffff');
    this.list = [];
    for (let i = 0; i < 9; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PTS * 3), 3));
      const line = new THREE.Line(geo, this.mat);
      line.frustumCulled = false;
      line.visible = false;
      scene.add(line);
      this.list.push({ line, life: 0, dur: 2.6, delay: Math.random() * 3, active: false });
    }
  }

  spawn(s, cx, cz, wind) {
    const tx = -Math.sin(wind.from), tz = Math.cos(wind.from);
    const px = -tz, pz = tx;
    const a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 50;
    const sx = cx + Math.cos(a) * d - tx * 10, sz = cz + Math.sin(a) * d - tz * 10;
    const sy = 2 + Math.random() * 8;
    const len = 16 + Math.random() * 10, R = 1.2 + Math.random() * 0.6, ph = Math.random() * 6;
    const curlSide = Math.random() < 0.5 ? -1 : 1;
    const arr = s.line.geometry.attributes.position.array;
    let ex = 0, ez = 0;
    for (let i = 0; i < PTS; i++) {
      const u = i / (PTS - 1);
      let x, z, y = sy + u * 0.8;
      if (u <= 0.68) {
        const dd = (u / 0.68) * len, wob = Math.sin(u * 7 + ph) * 0.7;
        x = sx + tx * dd + px * wob; z = sz + tz * dd + pz * wob;
        ex = x; ez = z;
      } else {
        const c = ((u - 0.68) / 0.32) * Math.PI * 1.8;
        const ox = ex + px * R * curlSide, oz = ez + pz * R * curlSide;
        x = ox - px * R * curlSide * Math.cos(c) + tx * R * Math.sin(c);
        z = oz - pz * R * curlSide * Math.cos(c) + tz * R * Math.sin(c);
      }
      arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
    }
    s.line.geometry.attributes.position.needsUpdate = true;
    s.life = 0;
    s.dur = 2.2 + Math.random() * 1.2;
    s.active = true;
    s.line.visible = true;
  }

  update(dt, cx, cz, wind, color) {
    this.mat.uniforms.uColor.value.copy(color);
    for (const s of this.list) {
      if (!s.active) {
        s.delay -= dt * (0.4 + wind.strength);
        if (s.delay < 0) this.spawn(s, cx, cz, wind);
        continue;
      }
      s.life += dt;
      const k = s.life / s.dur;
      const head = Math.min(1, k * 1.5), tail = Math.max(0, Math.min(1, (k - 0.35) * 1.55));
      const a = Math.floor(tail * PTS), b = Math.ceil(head * PTS);
      s.line.geometry.setDrawRange(a, Math.max(0, b - a));
      if (k >= 1) {
        s.active = false;
        s.line.visible = false;
        s.delay = 0.5 + Math.random() * 3;
      }
    }
  }
}
