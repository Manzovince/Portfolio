import * as THREE from 'three';
import { toon, bake, merge, M, markerMat } from './util.js?v=1';
import { waveHeight } from './water.js?v=1';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

// Gerbes d'eau (souffle de baleine, éclaboussures).
export class Spray {
  constructor(scene) {
    this.N = 160;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), markerMat('#ffffff'), this.N);
    this.mesh.frustumCulled = false;
    this.parts = Array.from({ length: this.N }, () => ({ x: 0, y: -50, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }));
    this.i = 0;
    this.m4 = new THREE.Matrix4();
    this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
    scene.add(this.mesh);
  }

  burst(x, y, z, n, up, spread) {
    for (let k = 0; k < n; k++) {
      const p = this.parts[this.i];
      this.i = (this.i + 1) % this.N;
      Object.assign(p, { x, y, z, vx: rand(-spread, spread), vy: up * rand(0.6, 1), vz: rand(-spread, spread), life: 2.5 });
    }
  }

  update(dt, color) {
    this.mesh.material.uniforms.uColor.value.copy(color);
    for (let k = 0; k < this.N; k++) {
      const p = this.parts[k];
      if (p.life <= 0) { this.mesh.setMatrixAt(k, this.zero); continue; }
      p.life -= dt;
      p.vy -= 14 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < -0.3) p.life = 0;
      const s = Math.min(1, p.life) * 1.1;
      this.m4.makeScale(s, s, s).setPosition(p.x, p.y, p.z);
      this.mesh.setMatrixAt(k, p.life > 0 ? this.m4 : this.zero);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Mouettes qui tournent au-dessus de l'île la plus proche.
export class Gulls {
  constructor(scene) {
    this.birds = [];
    const bodyMat = toon(0xffffff, { vertexColors: true });
    const bodyGeo = merge([
      bake(new THREE.BoxGeometry(0.32, 0.28, 1.0), '#f4f4f0', M()),
      bake(new THREE.BoxGeometry(0.12, 0.1, 0.3), '#f0b030', M([0, -0.02, -0.62])),
    ]);
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.3, 1.5, 0, 0.1, 0, 0, 0.35, 1.5, 0, 0.1, 1.5, 0, -0.1, 0, 0, -0.3], 3));
    wingGeo.setAttribute('color', new THREE.Float32BufferAttribute(Array(18).fill(0).map((_, i) => (i % 3 === 2 ? 0.92 : 0.95)), 3));
    wingGeo.computeVertexNormals();
    const wingMat = toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(bodyGeo, bodyMat));
      const l = new THREE.Group(), r = new THREE.Group();
      const wl = new THREE.Mesh(wingGeo, wingMat), wr = new THREE.Mesh(wingGeo, wingMat);
      wl.scale.x = -1;
      l.add(wl); r.add(wr);
      g.add(l, r);
      g.visible = false;
      scene.add(g);
      this.birds.push({ g, l, r, a: rand(0, TAU), rad: rand(0.6, 1.2), h: rand(12, 22), sp: rand(0.25, 0.4) * (Math.random() < 0.5 ? 1 : -1), ph: rand(0, TAU) });
    }
    this.anchor = null;
    this.target = null;
  }

  // Renvoie la distance entre le joueur et la volée (Infinity si absente).
  update(dt, t, fx, fz, islands) {
    let best = null, bd = 280;
    for (const is of islands) {
      const d = Math.hypot(is.x - fx, is.z - fz) - is.r;
      if (d < bd) { bd = d; best = is; }
    }
    if (best) this.target = { x: best.x + best.r * 0.3, z: best.z, r: Math.min(best.r * 0.55, 45) };
    if (!this.target) return Infinity;
    if (!this.anchor) this.anchor = { ...this.target };
    for (const k of ['x', 'z', 'r']) this.anchor[k] += (this.target[k] - this.anchor[k]) * Math.min(1, dt * 0.15);
    const A = this.anchor;
    for (const b of this.birds) {
      b.a += (b.sp * dt * 30) / (A.r * b.rad);
      const x = A.x + Math.cos(b.a) * A.r * b.rad, z = A.z + Math.sin(b.a) * A.r * b.rad;
      const y = b.h + Math.sin(t * 0.6 + b.ph) * 2;
      b.g.position.set(x, y, z);
      // Tangente au cercle.
      const tx = -Math.sin(b.a) * Math.sign(b.sp), tz = Math.cos(b.a) * Math.sign(b.sp);
      b.g.rotation.set(0, Math.atan2(-tx, -tz), Math.sign(b.sp) * 0.35);
      const flapping = Math.sin(t * 0.5 + b.ph) > 0.2;
      const w = flapping ? Math.sin(t * 9 + b.ph) * 0.65 : 0.12;
      b.l.rotation.z = w; b.r.rotation.z = -w;
      b.g.visible = true;
    }
    return Math.hypot(A.x - fx, A.z - fz);
  }
}

function dolphinGeo() {
  return merge([
    bake(new THREE.IcosahedronGeometry(1, 1), '#6f8db2', M([0, 0, 0], [0, 0, 0], [0.55, 0.5, 1.7])),
    bake(new THREE.ConeGeometry(0.22, 0.7, 4), '#5d7aa0', M([0, 0.5, 0.15], [-0.5, 0, 0])),
    bake(new THREE.BoxGeometry(1.1, 0.1, 0.4), '#5d7aa0', M([0, 0, 1.75])),
    bake(new THREE.ConeGeometry(0.16, 0.6, 4), '#7f9cc0', M([0, -0.05, -1.85], [-Math.PI / 2, 0, 0])),
  ]);
}

// Petit groupe de dauphins qui escorte le bateau au large.
export class Dolphins {
  constructor(scene, wake) {
    this.wake = wake;
    this.timer = rand(30, 60);
    this.life = 0;
    this.pod = [];
    const geo = dolphinGeo(), mat = toon(0xffffff, { vertexColors: true });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.visible = false;
      scene.add(m);
      this.pod.push({ m, side: 0, lead: 0, period: 0, off: 0, air: false });
    }
  }

  // Renvoie true au moment où le groupe apparaît.
  update(dt, t, boat, heightAt) {
    const [fx, fz] = boat.forward;
    const rx = Math.cos(boat.heading), rz = Math.sin(boat.heading);
    if (this.life <= 0) {
      this.timer -= dt;
      if (this.timer > 0 || boat.speed < 4.5 || boat.anchored) return false;
      if (heightAt(boat.x, boat.z) > -15 || heightAt(boat.x + fx * 60, boat.z + fz * 60) > -15) { this.timer = 10; return false; }
      this.life = rand(25, 40);
      this.timer = rand(70, 150);
      const n = 2 + Math.floor(Math.random() * 3);
      this.pod.forEach((d, i) => {
        d.active = i < n;
        d.side = (i % 2 ? 1 : -1) * rand(4.5, 9);
        d.lead = rand(-3, 9);
        d.period = rand(2.2, 3.2);
        d.off = rand(0, 3);
      });
      return true;
    }
    if (boat.speed < 2.5) this.life = Math.min(this.life, 2);
    this.life -= dt;
    for (const d of this.pod) {
      if (!d.active || this.life <= 0) { d.m.visible = false; continue; }
      const lead = d.lead + Math.sin(t * 0.3 + d.off) * 3;
      const x = boat.x + rx * d.side + fx * lead, z = boat.z + rz * d.side + fz * lead;
      const ph = (t + d.off) % d.period, air = 1.15;
      const water = waveHeight(x, z, t);
      if (ph < air) {
        const u = ph / air;
        d.m.visible = true;
        d.m.position.set(x, water - 0.7 + Math.sin(u * Math.PI) * 2.3, z);
        d.m.rotation.set(Math.cos(u * Math.PI) * 0.8, -boat.heading, 0, 'YXZ');
        if (!d.air) this.wake.spawn(x, z, 0, 0, 1.2, 1.2);
        d.air = true;
      } else {
        if (d.air) this.wake.spawn(x, z, 0, 0, 1.4, 1.4);
        d.air = false;
        d.m.visible = false;
      }
    }
    return false;
  }
}

function whaleGeo() {
  return merge([
    bake(new THREE.IcosahedronGeometry(1, 1), '#4a5d7e', M([0, 0, 0], [0, 0, 0], [2.3, 1.8, 7.5])),
    bake(new THREE.IcosahedronGeometry(1, 1), '#c9d2dc', M([0, -0.9, -2], [0, 0, 0], [1.6, 0.9, 4.5])),
    bake(new THREE.BoxGeometry(2.6, 0.2, 0.9), '#3f5170', M([2.2, -0.6, -2.5], [0, -0.4, -0.4])),
    bake(new THREE.BoxGeometry(2.6, 0.2, 0.9), '#3f5170', M([-2.2, -0.6, -2.5], [0, 0.4, 0.4])),
    bake(new THREE.CylinderGeometry(0.5, 1.3, 4, 6), '#4a5d7e', M([0, 0.2, 8.5], [Math.PI / 2, 0, 0])),
    bake(new THREE.BoxGeometry(5, 0.25, 1.8), '#3f5170', M([0, 0.2, 10.8])),
  ]);
}

// Baleine : trois respirations puis une plongée, loin des côtes.
export class Whale {
  constructor(scene, spray) {
    this.spray = spray;
    this.timer = rand(90, 160);
    this.t = -1;
    this.mesh = new THREE.Mesh(whaleGeo(), toon(0xffffff, { vertexColors: true }));
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.blown = new Set();
  }

  update(dt, t, boat, heightAt, sfx) {
    if (this.t < 0) {
      this.timer -= dt;
      if (this.timer > 0) return false;
      this.timer = rand(140, 260);
      const side = Math.random() < 0.5 ? -1 : 1;
      const [fx, fz] = boat.forward;
      const rx = Math.cos(boat.heading), rz = Math.sin(boat.heading);
      const x = boat.x + rx * side * rand(35, 55) + fx * rand(20, 50), z = boat.z + rz * side * rand(35, 55) + fz * rand(20, 50);
      if (heightAt(x, z) > -18 || heightAt(x + fx * 80, z + fz * 80) > -18) { this.timer = 25; return false; }
      Object.assign(this, { x, z, heading: boat.heading + side * 0.25 + rand(-0.2, 0.2), t: 0 });
      this.blown.clear();
      if (sfx) sfx();
      return true;
    }
    this.t += dt;
    const cycle = 8, k = Math.floor(this.t / cycle), tau = this.t % cycle;
    if (k >= 3) { this.t = -1; this.mesh.visible = false; return false; }
    this.x += Math.sin(this.heading) * 2.4 * dt;
    this.z += -Math.cos(this.heading) * 2.4 * dt;
    const water = waveHeight(this.x, this.z, t);
    let y, pitch;
    if (tau < 2) { const u = tau / 2; y = -7 + u * 6.4; pitch = 0.12; }
    else if (tau < 5) { y = -0.6; pitch = 0.02; }
    else { const u = (tau - 5) / 3; y = -0.6 - u * u * 8; pitch = -0.35 * u * (k === 2 ? 1.6 : 1); }
    if (tau > 2.1 && !this.blown.has(k)) {
      this.blown.add(k);
      const fx = Math.sin(this.heading), fz = -Math.cos(this.heading);
      this.spray.burst(this.x + fx * 4, water + 1.8, this.z + fz * 4, 34, 11, 1.1);
    }
    this.mesh.visible = true;
    this.mesh.position.set(this.x, water + y, this.z);
    this.mesh.rotation.set(pitch, -this.heading, 0, 'YXZ');
    return false;
  }
}

// Étoile filante : un trait bref dans le ciel nocturne.
export class ShootingStars {
  constructor(scene) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.line = new THREE.Line(geo, markerMat('#fff6d8', false));
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);
    this.timer = rand(15, 40);
    this.life = 0;
    this.v = new THREE.Vector3();
  }

  // Renvoie true si une étoile filante apparaît dans le champ de la caméra.
  update(dt, camera, night, cloud) {
    if (this.life > 0) {
      this.life -= dt;
      const u = 1 - this.life / this.dur;
      const head = this.p0.clone().addScaledVector(this.dir, u * 220);
      const tail = this.p0.clone().addScaledVector(this.dir, Math.max(0, u - 0.25) * 220);
      const a = this.line.geometry.attributes.position.array;
      a.set([tail.x, tail.y, tail.z, head.x, head.y, head.z]);
      this.line.geometry.attributes.position.needsUpdate = true;
      if (this.life <= 0) this.line.visible = false;
      return false;
    }
    if (night < 0.6 || cloud > 0.55) return false;
    this.timer -= dt;
    if (this.timer > 0) return false;
    this.timer = rand(25, 70);
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const az = Math.atan2(fwd.x, fwd.z) + rand(-0.6, 0.6), el = rand(0.35, 0.8);
    this.p0 = camera.position.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(600));
    this.dir = new THREE.Vector3(rand(-1, 1), -rand(0.3, 0.6), rand(-1, 1)).normalize();
    this.dur = rand(0.6, 1.0);
    this.life = this.dur;
    this.line.visible = true;
    const ndc = this.p0.clone().project(camera);
    return Math.abs(ndc.x) < 0.95 && Math.abs(ndc.y) < 0.95 && ndc.z < 1;
  }
}
