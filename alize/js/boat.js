import * as THREE from 'three';
import { toon, bake, merge, M, clamp } from './util.js?v=1';
import { waveHeight } from './water.js?v=1';

const DEG = Math.PI / 180;
export const MAX_SPEED = 14;

export function angleDiff(a, b) {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// Polaire simplifiée : vitesse relative selon l'angle au vent réel (rad, 0 = face au vent).
export function polar(th) {
  const d = th / DEG;
  if (d < 32) return 0;
  if (d < 55) return ((d - 32) / 23) * 0.72;
  if (d < 100) return 0.72 + ((d - 55) / 45) * 0.28;
  return 1 - ((d - 100) / 80) * 0.22;
}

export function pointOfSail(th) {
  const d = th / DEG;
  if (d < 35) return 'Face au vent';
  if (d < 60) return 'Près';
  if (d < 80) return 'Bon plein';
  if (d < 110) return 'Travers';
  if (d < 150) return 'Largue';
  if (d < 168) return 'Grand largue';
  return 'Vent arrière';
}

function hullGeometry() {
  const S = 10, pos = [], col = [];
  const red = new THREE.Color('#c8402f'), white = new THREE.Color('#f2ecdc'), deck = new THREE.Color('#c99a62');
  const rings = [];
  for (let i = 0; i <= S; i++) {
    const t = i / S, z = 3.0 - t * 6.4;
    const w = Math.max(0.05, 1.25 * (t < 0.55 ? 0.82 + 0.18 * (t / 0.55) : 1 - Math.pow((t - 0.55) / 0.45, 1.7)));
    const top = 0.6 + 0.45 * Math.pow(t, 2.4);
    const keel = -0.6 + 0.5 * t * t;
    const chine = (top + keel) * 0.5 - 0.15;
    rings.push([[-w, top, z], [-w * 0.9, chine, z], [0, keel, z], [w * 0.9, chine, z], [w, top, z]]);
  }
  const tri = (a, b, c, k) => {
    pos.push(...a, ...b, ...c);
    for (let n = 0; n < 3; n++) col.push(k.r, k.g, k.b);
  };
  for (let i = 0; i < S; i++) {
    for (let k = 0; k < 4; k++) {
      const a = rings[i][k], b = rings[i][k + 1], c = rings[i + 1][k + 1], d = rings[i + 1][k];
      const color = k === 0 || k === 3 ? red : white;
      tri(a, b, c, color); tri(a, c, d, color);
    }
    const lo = (p) => [p[0] * 0.94, p[1] - 0.12, p[2]];
    const a = lo(rings[i][0]), b = lo(rings[i][4]), c = lo(rings[i + 1][4]), d = lo(rings[i + 1][0]);
    tri(a, b, c, deck); tri(a, c, d, deck);
  }
  const r = rings[0];
  tri(r[0], r[1], r[2], red); tri(r[0], r[2], r[3], red); tri(r[0], r[3], r[4], red);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// Voile triangulaire subdivisée, dans le repère de la bôme (z vers l'arrière).
function makeSail() {
  const N = 6;
  const tack = [0, 0.15, 0.15], head = [0, 5.3, 0.1], clew = [0, 0.15, 3.5];
  const P = (a, b) => [0, 0, 0].map((_, k) => tack[k] + a * (clew[k] - tack[k]) * (1 - b) + b * (head[k] - tack[k]));
  const tris = [];
  const node = (i, j) => [j === N ? 0 : i / (N - j), j / N];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N - j; i++) {
      tris.push([node(i, j), node(i + 1, j), node(i, j + 1)]);
      if (i < N - j - 1) tris.push([node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)]);
    }
  }
  const n = tris.length * 3;
  const params = new Float32Array(n * 2), base = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const cloth = new THREE.Color('#f6f0e2'), band = new THREE.Color('#d8483a');
  let v = 0;
  for (const t of tris) {
    const mb = (t[0][1] + t[1][1] + t[2][1]) / 3;
    const k = mb > 0.3 && mb < 0.46 ? band : cloth;
    for (const [a, b] of t) {
      const p = P(a, b);
      base.set(p, v * 3); params.set([a, b], v * 2);
      col.set([k.r, k.g, k.b], v * 3);
      v++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return { geo: g, base, params };
}

export class Boat {
  constructor(scene, x, z, heading) {
    this.x = x; this.z = z; this.y = 0;
    this.heading = heading;
    this.speed = 0;
    this.rudder = 0;
    this.relWind = 0;
    this.grounded = false;
    this.vel = new THREE.Vector2();

    this.group = new THREE.Group();
    this.body = new THREE.Group();
    this.group.add(this.body);
    scene.add(this.group);

    const shadowy = (m) => { m.castShadow = m.receiveShadow = true; return m; };
    this.body.add(shadowy(new THREE.Mesh(hullGeometry(), toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }))));

    const wood = [];
    wood.push(bake(new THREE.CylinderGeometry(0.11, 0.16, 6.6, 6), '#8a5a36', M([0, 3.8, -0.9])));
    wood.push(bake(new THREE.BoxGeometry(2.3, 0.12, 0.35), '#a0703e', M([0, 0.62, 1.6])));
    wood.push(bake(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 4), '#6e4a30', M([0.85, 1.2, 2.75])));
    this.body.add(shadowy(new THREE.Mesh(merge(wood), toon(0xffffff, { vertexColors: true }))));

    this.boom = new THREE.Group();
    this.boom.position.set(0, 1.25, -0.9);
    this.body.add(this.boom);
    const boomMesh = new THREE.Mesh(
      bake(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 5), '#8a5a36', M([0, 0.1, 1.8], [Math.PI / 2, 0, 0])),
      toon(0xffffff, { vertexColors: true }),
    );
    this.boom.add(shadowy(boomMesh));
    this.sail = makeSail();
    this.sailMesh = shadowy(new THREE.Mesh(this.sail.geo, toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide })));
    this.boom.add(this.sailMesh);

    // Flamme en tête de mât : montre le vent apparent.
    this.pennant = new THREE.Group();
    this.pennant.position.set(0, 7.0, -0.9);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.4, 0, 0, -0.2, 1.3], 3));
    pg.computeVertexNormals();
    this.pennant.add(new THREE.Mesh(pg, toon('#e2463a', { side: THREE.DoubleSide })));
    this.body.add(this.pennant);

    // Petit marin, bonnet vert.
    const sailor = [];
    sailor.push(bake(new THREE.CylinderGeometry(0.28, 0.36, 0.85, 6), '#3e9a4a', M([0, 0.95, 2.2])));
    sailor.push(bake(new THREE.IcosahedronGeometry(0.3, 0), '#f1c9a2', M([0, 1.62, 2.2])));
    sailor.push(bake(new THREE.ConeGeometry(0.3, 0.9, 6), '#3e9a4a', M([0, 2.05, 2.45], [0.7, 0, 0])));
    sailor.push(bake(new THREE.BoxGeometry(0.62, 0.14, 0.5), '#e8d48a', M([0, 1.86, 2.2])));
    this.sailor = shadowy(new THREE.Mesh(merge(sailor), toon(0xffffff, { vertexColors: true })));
    this.body.add(this.sailor);

    this.tiller = new THREE.Group();
    this.tiller.position.set(0, 0.9, 3.0);
    this.tiller.add(new THREE.Mesh(bake(new THREE.BoxGeometry(0.1, 0.1, 1.3), '#7a5232', M([0, 0, -0.6])), toon(0xffffff, { vertexColors: true })));
    this.body.add(this.tiller);

    this.lanternMat = new THREE.MeshBasicMaterial({ color: '#5a5040' });
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.3), this.lanternMat);
    lantern.position.set(0.85, 2.0, 2.75);
    this.body.add(lantern);
    this.light = new THREE.PointLight('#ffc070', 0, 28, 1.6);
    this.light.position.set(0.85, 2.4, 2.4);
    this.body.add(this.light);

    this.boomAngle = 0;
    this.heel = 0;
    this.luff = 0;
    this.anchored = false;
    this.furl = 0;
  }

  setAnchored(on) {
    this.anchored = on;
    this.sailor.visible = !on;
  }

  get forward() { return [Math.sin(this.heading), -Math.cos(this.heading)]; }

  update(dt, t, wind, rudder, heightAt) {
    this.rudder = rudder;
    const turn = 0.62 * rudder * (0.35 + 0.65 * Math.min(1, this.speed / 5));
    this.heading += turn * dt;

    const rel = angleDiff(wind.from, this.heading); // > 0 : vent de tribord
    const th = Math.abs(rel);
    this.relWind = th;
    const target = this.anchored ? 0 : MAX_SPEED * wind.strength * polar(th);
    const k = target > this.speed ? 0.32 : 0.55;
    this.speed += (target - this.speed) * Math.min(1, k * dt);

    const [fx, fz] = this.forward;
    const nx = this.x + fx * this.speed * dt, nz = this.z + fz * this.speed * dt;
    const bow = heightAt(nx + fx * 3.2, nz + fz * 3.2), mid = heightAt(nx, nz);
    this.grounded = bow > -0.8 || mid > -0.9;
    if (this.grounded) {
      this.speed *= Math.pow(0.03, dt);
      if (mid <= -0.9 && bow < heightAt(this.x + fx * 3.2, this.z + fz * 3.2)) { this.x = nx; this.z = nz; }
    } else {
      this.x = nx; this.z = nz;
    }
    this.vel.set(fx * this.speed, fz * this.speed);

    // Bôme réglée automatiquement : choquée à mesure qu'on abat ; empannage en douceur.
    const side = rel >= 0 ? 1 : -1;
    const want = this.anchored ? 0 : -side * clamp((th - 20 * DEG) * 0.6, 4 * DEG, 82 * DEG);
    this.furl += ((this.anchored ? 1 : 0) - this.furl) * Math.min(1, dt * 2);
    this.sailMesh.scale.y = 1 - this.furl * 0.82;
    this.boomAngle += angleDiff(want, this.boomAngle) * Math.min(1, dt * 2.2);
    this.boom.rotation.y = this.boomAngle;
    this.luff += ((th < 38 * DEG && !this.anchored ? 1 : 0) - this.luff) * Math.min(1, dt * 3);

    const power = th > 38 * DEG ? Math.sin(th) * wind.strength * Math.min(1, this.speed / 6) : 0;
    this.heel += (side * 0.2 * power - this.heel) * Math.min(1, dt * 1.5);

    // Voile : creux sous le vent, faseyement face au vent.
    const pos = this.sail.geo.attributes.position.array, { base, params } = this.sail;
    const belly = Math.sign(this.boomAngle || -1) * 0.55 * (1 - this.luff) * Math.min(1, 0.3 + wind.strength);
    for (let i = 0, n = params.length / 2; i < n; i++) {
      const a = params[i * 2], b = params[i * 2 + 1];
      const shape = Math.sin(Math.PI * Math.min(1, a)) * (1 - b * 0.7);
      const flap = this.luff * Math.sin(t * 21 + b * 7 + a * 5) * 0.28 * a;
      pos[i * 3] = base[i * 3] + belly * shape + flap;
    }
    this.sail.geo.attributes.position.needsUpdate = true;
    this.sail.geo.computeVertexNormals();

    // Flamme dans le vent apparent (repère du bateau).
    const ws = wind.strength * 10;
    const awx = -Math.sin(wind.from) * ws - this.vel.x, awz = Math.cos(wind.from) * ws - this.vel.y;
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    const lx = awx * c + awz * s, lz = -awx * s + awz * c;
    this.pennant.rotation.y = Math.atan2(lx, lz) + Math.sin(t * 9) * 0.08;

    this.tiller.rotation.y = -rudder * 0.5;

    // Flottaison sur la houle.
    const rx = c, rz = s;
    const hb = waveHeight(this.x + fx * 2.6, this.z + fz * 2.6, t), hs = waveHeight(this.x - fx * 2.6, this.z - fz * 2.6, t);
    const hp = waveHeight(this.x - rx * 1.2, this.z - rz * 1.2, t), hr = waveHeight(this.x + rx * 1.2, this.z + rz * 1.2, t);
    this.y += ((hb + hs + hp + hr) / 4 - this.y) * Math.min(1, dt * 6);
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = -this.heading;
    this.body.rotation.x = Math.atan2(hb - hs, 5.2) * 0.8;
    this.body.rotation.z = this.heel + Math.atan2(hp - hr, 2.4) * 0.5 + rudder * this.speed * 0.004;
  }

  setNight(night) {
    this.lanternMat.color.set('#5a5040').lerp(new THREE.Color('#ffd27a'), night);
    this.light.intensity = night * 14;
  }
}
