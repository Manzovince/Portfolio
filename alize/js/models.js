import * as THREE from 'three';
import { toon, bake, merge, M } from './util.js?v=1';
import { rng } from './noise.js?v=1';

const PI = Math.PI;

export function treeGeometry(kind) {
  const parts = [];
  if (kind === 'round') {
    parts.push(bake(new THREE.CylinderGeometry(0.25, 0.38, 2.4, 5), '#8a5a36', M([0, 1.2, 0])));
    parts.push(bake(new THREE.IcosahedronGeometry(1.9, 0), '#4f9e3a', M([0, 3.3, 0], [0.3, 0.5, 0], [1, 1.05, 1])));
    parts.push(bake(new THREE.IcosahedronGeometry(1.2, 0), '#66b347', M([0.5, 4.5, 0.3], [0.7, 0.2, 0.4])));
  } else if (kind === 'pine') {
    parts.push(bake(new THREE.CylinderGeometry(0.2, 0.3, 2, 5), '#7a4e30', M([0, 1, 0])));
    parts.push(bake(new THREE.ConeGeometry(1.8, 2.6, 6), '#2f7a4a', M([0, 2.6, 0])));
    parts.push(bake(new THREE.ConeGeometry(1.35, 2.2, 6), '#348552', M([0, 3.9, 0], [0, 0.5, 0])));
    parts.push(bake(new THREE.ConeGeometry(0.85, 1.8, 6), '#3a9058', M([0, 5.0, 0])));
  } else {
    // palmier
    parts.push(bake(new THREE.CylinderGeometry(0.17, 0.26, 2.6, 5), '#9a7448', M([0.12, 1.3, 0], [0, 0, -0.1])));
    parts.push(bake(new THREE.CylinderGeometry(0.13, 0.18, 2.6, 5), '#a47e50', M([0.5, 3.75, 0], [0, 0, -0.22])));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const g = new THREE.BoxGeometry(0.55, 0.08, 2.6);
      g.translate(0, 0, 1.3);
      parts.push(bake(g, i % 2 ? '#5aa83e' : '#6cbd48', M([0.8, 5.0, 0], [0.45, a, 0])));
    }
  }
  const g = merge(parts);
  g.userData.shared = true;
  return g;
}

export function rockGeometry() {
  const g = bake(new THREE.DodecahedronGeometry(1, 0), '#ffffff', M([0, 0, 0], [0, 0, 0], [1, 0.7, 1]));
  g.userData.shared = true;
  return g;
}

// Phare à bandes. Renvoie le groupe, le matériau de la lanterne et le faisceau tournant.
export function makeLighthouse() {
  const parts = [];
  parts.push(bake(new THREE.CylinderGeometry(2.4, 2.8, 2, 8), '#a59e94', M([0, 0, 0])));
  const bands = ['#f4efe6', '#d0463a', '#f4efe6', '#d0463a'];
  for (let i = 0; i < 4; i++) {
    const r0 = 1.9 - i * 0.15, r1 = 1.9 - (i + 1) * 0.15;
    parts.push(bake(new THREE.CylinderGeometry(r1, r0, 2.5, 8), bands[i], M([0, 1 + i * 2.5 + 1.25, 0])));
  }
  parts.push(bake(new THREE.CylinderGeometry(2.1, 2.1, 0.35, 8), '#3a3a44', M([0, 11.2, 0])));
  parts.push(bake(new THREE.ConeGeometry(1.45, 1.4, 8), '#d0463a', M([0, 13.85, 0])));
  const group = new THREE.Group();
  const body = new THREE.Mesh(merge(parts), toon(0xffffff, { vertexColors: true }));
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  const lampMat = new THREE.MeshBasicMaterial({ color: '#cfe4ea' });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 8), lampMat);
  lamp.position.y = 12.2;
  group.add(lamp);

  const beam = new THREE.Group();
  beam.position.y = 12.2;
  const beamMat = new THREE.MeshBasicMaterial({
    color: '#fff1b0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  for (const s of [0, PI]) {
    const g = new THREE.ConeGeometry(5, 70, 10, 1, true);
    g.translate(0, -35, 0);
    g.rotateZ(PI / 2);
    const m = new THREE.Mesh(g, beamMat);
    m.rotation.y = s;
    beam.add(m);
  }
  beam.visible = false;
  group.add(beam);
  return { group, lampMat, beam, beamMat };
}

function houseParts(R, solid, wins, base) {
  const w = 3.6 + R() * 2.2, d = 3.6 + R() * 1.8, h = 2.6 + R() * 1.2;
  const walls = ['#f4ecd8', '#ebdfc4', '#f7f3ea', '#e2e8ea', '#f0e2c8'];
  const roofs = ['#c6503a', '#d97a3a', '#3f70b2', '#2f8a7a', '#b84a5a'];
  const wall = walls[Math.floor(R() * walls.length)], roof = roofs[Math.floor(R() * roofs.length)];
  const sink = 2;
  const add = (geo, color, m) => solid.push(bake(geo, color, base.clone().multiply(m)));
  add(new THREE.BoxGeometry(w, h + sink, d), wall, M([0, (h - sink) / 2, 0]));
  const big = Math.max(w, d) * 0.76;
  add(new THREE.ConeGeometry(big, 2.2, 4), roof, M([0, h + 1.1, 0], [0, PI / 4, 0], [w / Math.max(w, d) * 1.05, 1, d / Math.max(w, d) * 1.05]));
  add(new THREE.BoxGeometry(0.9, 1.6, 0.12), '#6a4630', M([w * 0.18, 0.8, d / 2 + 0.03]));
  if (R() < 0.6) add(new THREE.BoxGeometry(0.6, 1.4, 0.6), wall, M([-w * 0.25, h + 1.2, -d * 0.15]));
  const win = (m) => wins.push(bake(new THREE.BoxGeometry(0.7, 0.7, 0.1), '#ffffff', base.clone().multiply(m)));
  win(M([-w * 0.22, h * 0.6, d / 2 + 0.04]));
  win(M([w / 2 + 0.04, h * 0.6, 0], [0, PI / 2, 0]));
  if (R() < 0.5) win(M([-w / 2 - 0.04, h * 0.6, 0], [0, PI / 2, 0]));
}

// Village et ponton dans l'anse de l'île de départ, phare sur la pointe.
export function buildVillage(is, heightAt) {
  const R = rng(4242);
  const c = is.cove;
  const group = new THREE.Group();
  const solid = [], wins = [];

  // Ponton : depuis le rivage nord de l'anse, vers le large.
  let sz = c.z - c.r;
  for (let z = c.z; z > c.z - c.r * 2; z -= 0.5) if (heightAt(c.x, z) > 0.3) { sz = z; break; }
  const L = 24, z0 = sz - 4;
  solid.push(bake(new THREE.BoxGeometry(3.2, 0.35, L), '#b4855a', M([c.x, 1.25, z0 + L / 2])));
  for (let k = 0; k <= L; k += 4) {
    for (const s of [-1.5, 1.5]) solid.push(bake(new THREE.CylinderGeometry(0.22, 0.22, 5, 5), '#6e4a30', M([c.x + s, -1.2, z0 + k])));
  }
  solid.push(bake(new THREE.BoxGeometry(1, 1, 1), '#9a6a40', M([c.x - 0.6, 1.9, z0 + 3], [0, 0.3, 0])));
  solid.push(bake(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 7), '#7a5232', M([c.x + 0.7, 1.95, z0 + 4.2])));

  // Maisons sur le pourtour de l'anse, face à l'eau.
  const placed = [];
  const tryHouse = (x, z, face) => {
    for (const p of placed) if (Math.hypot(p[0] - x, p[1] - z) < 8) return;
    if (Math.abs(x - c.x) < 6 && z < c.z && z > sz - 10) return; // entrée du ponton
    const hs = [heightAt(x, z), heightAt(x + 2.5, z + 2.5), heightAt(x - 2.5, z + 2.5), heightAt(x + 2.5, z - 2.5), heightAt(x - 2.5, z - 2.5)];
    const lo = Math.min(...hs), hi = Math.max(...hs);
    if (lo < 1.0 || hi > 16 || hi - lo > 3.2) return;
    placed.push([x, z]);
    houseParts(R, solid, wins, M([x, lo + 0.1, z], [0, face, 0]));
  };
  for (let a = -2.0; a <= 2.0; a += 0.26) {
    const ang = a + (R() - 0.5) * 0.12;
    const dx = Math.sin(ang), dz = -Math.cos(ang);
    let shore = -1;
    for (let r = c.r * 0.6; r < c.r * 2.4; r += 1) {
      if (heightAt(c.x + dx * r, c.z + dz * r) > 1.3) { shore = r; break; }
    }
    if (shore < 0) continue;
    const face = Math.atan2(-dx, -dz);
    for (const extra of [5 + R() * 3, 16 + R() * 4]) {
      if (extra > 10 && R() < 0.45) continue;
      tryHouse(c.x + dx * (shore + extra), c.z + dz * (shore + extra), face + (R() - 0.5) * 0.3);
    }
  }

  const solidMesh = new THREE.Mesh(merge(solid), toon(0xffffff, { vertexColors: true }));
  solidMesh.castShadow = solidMesh.receiveShadow = true;
  group.add(solidMesh);
  const windowMat = new THREE.MeshBasicMaterial({ color: '#3a3f52' });
  if (wins.length) group.add(new THREE.Mesh(merge(wins), windowMat));

  // Phare sur la pointe est de l'anse.
  const tx = c.x + c.r * 1.05, tz = c.z + c.r * 0.6;
  let best = null, bd = Infinity;
  for (let x = tx - 45; x <= tx + 45; x += 3) {
    for (let z = tz - 45; z <= tz + 45; z += 3) {
      const h = heightAt(x, z);
      if (h < 1.8 || h > 9) continue;
      const dd = Math.hypot(x - tx, z - tz);
      if (dd < bd) { bd = dd; best = [x, h, z]; }
    }
  }
  let lighthouse = null;
  if (best) {
    lighthouse = makeLighthouse();
    lighthouse.group.position.set(best[0], best[1] - 0.6, best[2]);
    group.add(lighthouse.group);
  }
  const pier = { x0: c.x - 1.6, x1: c.x + 1.6, z0: z0, z1: z0 + L, y: 1.42 };
  return { group, windowMat, lighthouse, houses: placed, pier };
}
