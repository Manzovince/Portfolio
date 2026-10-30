import * as THREE from 'three';
import { toon, bake, merge, M } from './util.js?v=1';
import { angleDiff } from './boat.js?v=1';

const WALK_SPEED = 5.2;

function limb(w, h, d, color) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(bake(new THREE.BoxGeometry(w, h, d), color, M([0, -h / 2, 0])), toon(0xffffff, { vertexColors: true }));
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

// Le petit marin, à terre.
export class Walker {
  constructor(scene) {
    this.x = 0; this.z = 0; this.y = 0;
    this.heading = 0;
    this.moving = 0;
    this.phase = 0;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.body = new THREE.Group();
    this.group.add(this.body);
    const torso = [];
    torso.push(bake(new THREE.CylinderGeometry(0.3, 0.4, 0.9, 6), '#3e9a4a', M([0, 1.25, 0])));
    torso.push(bake(new THREE.BoxGeometry(0.72, 0.12, 0.5), '#7a5232', M([0, 0.88, 0])));
    torso.push(bake(new THREE.IcosahedronGeometry(0.32, 0), '#f1c9a2', M([0, 1.95, 0])));
    torso.push(bake(new THREE.BoxGeometry(0.64, 0.14, 0.52), '#e8d48a', M([0, 2.2, 0.02])));
    torso.push(bake(new THREE.ConeGeometry(0.3, 0.95, 6), '#3e9a4a', M([0, 2.42, 0.28], [0.75, 0, 0])));
    const t = new THREE.Mesh(merge(torso), toon(0xffffff, { vertexColors: true }));
    t.castShadow = true;
    this.body.add(t);

    this.legL = limb(0.2, 0.85, 0.22, '#e9e2cc'); this.legL.position.set(-0.15, 0.88, 0);
    this.legR = limb(0.2, 0.85, 0.22, '#e9e2cc'); this.legR.position.set(0.15, 0.88, 0);
    this.armL = limb(0.16, 0.7, 0.16, '#3e9a4a'); this.armL.position.set(-0.42, 1.6, 0);
    this.armR = limb(0.16, 0.7, 0.16, '#3e9a4a'); this.armR.position.set(0.42, 1.6, 0);
    this.body.add(this.legL, this.legR, this.armL, this.armR);
  }

  place(x, z, y, heading) {
    Object.assign(this, { x, z, y, heading });
    this.group.visible = true;
    this.sync();
  }

  hide() { this.group.visible = false; }

  // dir : direction voulue dans le plan (longueur 0..1).
  update(dt, t, dirX, dirZ, world) {
    const mag = Math.min(1, Math.hypot(dirX, dirZ));
    this.moving += ((mag > 0.05 ? mag : 0) - this.moving) * Math.min(1, dt * 8);
    let nx = this.x, nz = this.z;
    if (mag > 0.05) {
      const want = Math.atan2(dirX, -dirZ);
      this.heading += angleDiff(want, this.heading) * Math.min(1, dt * 10);
      const sp = WALK_SPEED * mag;
      nx += (dirX / mag) * sp * mag * dt;
      nz += (dirZ / mag) * sp * mag * dt;

      // On peut avoir de l'eau jusqu'aux genoux, pas plus.
      const g = world.groundAt(nx, nz);
      if (g < -0.7 || g - this.y > 2.2) {
        const gx = world.groundAt(nx, this.z), gz = world.groundAt(this.x, nz);
        if (gx >= -0.7 && gx - this.y <= 2.2) nz = this.z;
        else if (gz >= -0.7 && gz - this.y <= 2.2) nx = this.x;
        else { nx = this.x; nz = this.z; }
      }
      for (const c of world.colliders) {
        const dx = nx - c.x, dz = nz - c.z, rr = c.r + 0.45;
        if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue;
        const d = Math.hypot(dx, dz);
        if (d < rr && d > 1e-4) { nx = c.x + (dx / d) * rr; nz = c.z + (dz / d) * rr; }
      }
    }
    this.x = nx; this.z = nz;
    const ground = Math.max(world.groundAt(this.x, this.z), -0.75);
    this.y += (ground - this.y) * Math.min(1, dt * 14);

    this.phase += dt * (3 + 8 * this.moving);
    const sw = Math.sin(this.phase) * 0.75 * this.moving;
    this.legL.rotation.x = sw; this.legR.rotation.x = -sw;
    this.armL.rotation.x = -sw * 0.8; this.armR.rotation.x = sw * 0.8;
    this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.12 * this.moving + Math.sin(t * 2) * 0.02 * (1 - this.moving);
    this.sync();
    return this.moving > 0.3 && Math.sin(this.phase) * Math.sin(this.phase - dt * 11) < 0;
  }

  sync() {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = -this.heading;
  }
}
