// Everything visible about the cabinet: decks, pusher, walls, marquee bulbs,
// the ring gate, the dropper, and instanced coins drawn from the physics bodies.
import { THREE, scene, toon, inked, hullGeo, INK, pixTex } from './gfx.js?v=1';
import { C, KINDS, bodies, pusher, gate, gutterZ, pusherMax } from './world.js?v=1';
import { PAL, drawSprite } from './sprites.js?v=1';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const add = (m, x, y, z) => { m.position.set(x, y, z); scene.add(m); return m; };

// ---------- arcade room: patterned wall and carpet ----------
const wallTex = pixTex(16, 16, g => {
  g.fillStyle = '#24124a'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#2f1960';
  for (let i = 0; i < 16; i++) { g.fillRect(i, i, 1, 1); g.fillRect(15 - i, i, 1, 1); }
  g.fillStyle = '#3d2278'; g.fillRect(7, 7, 2, 2);
});
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
wallTex.repeat.set(6, 4);
add(new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ map: wallTex })), 0, 6, -9);
const carpet = pixTex(16, 16, g => {
  g.fillStyle = '#160b30'; g.fillRect(0, 0, 16, 16);
  const dots = [[2, 3, '#ef3e5c'], [10, 1, '#49b6ff'], [6, 9, '#ffd23f'], [13, 12, '#4ad66d'], [1, 13, '#ff7ad9']];
  for (const [x, y, c] of dots) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
});
carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping;
carpet.repeat.set(10, 8);
const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ map: carpet })), 0, -4.3, 8);
floor.rotation.x = -Math.PI / 2;

// ---------- playfield ----------
const tableTex = pixTex(32, 40, (g, w, h) => {
  g.fillStyle = '#2b8fd6'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#3aa3ea';
  for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
  g.fillStyle = '#ffd23f';
  for (let i = 0; i < 3; i++) {
    const y = h - 12 + i * 3;
    for (let x = 0; x < w; x++) if (Math.abs((x % 8) - 4) === (i + 1) % 4) g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = '#ffd23f'; g.fillRect(0, h - 2, w, 2);
  g.fillStyle = '#1f5bbf'; g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
});
const tableLen = C.front - C.wallZ;
const table = inked(box(C.halfW * 2, 1, tableLen), [
  toon('#1f5bbf'), toon('#1f5bbf'), toon('#ffffff', { map: tableTex }), toon('#1f5bbf'), toon('#ffd23f'), toon('#1f5bbf'),
], 0.06);
add(table, 0, -0.5, (C.front + C.wallZ) / 2);

// front: the win chute glowing under the edge, and the cabinet below
const chute = add(new THREE.Mesh(box(C.halfW * 2, 3, 0.2), new THREE.MeshBasicMaterial({ color: '#ffd23f' })), 0, -2.1, C.front + 0.9);
add(inked(box(C.halfW * 2 + 2.4, 3.4, 1.6), toon('#d6336c'), 0.06), 0, -2.6, C.front + 1.9);
add(inked(box(C.halfW * 2 + 2.4, 0.3, 0.4), toon('#ffd23f'), 0.04), 0, -0.85, C.front + 2.6);

// ---------- pusher ----------
const pushTex = pixTex(32, 8, (g, w, h) => {
  g.fillStyle = '#e8e4ff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ff7ad9';
  for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 2, h);
  g.fillStyle = '#b46cff'; g.fillRect(0, h - 1, w, 1);
});
const pushTop = pixTex(16, 16, (g, w, h) => {
  g.fillStyle = '#c9c4ec'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d9d5f6';
  for (let i = 0; i < w; i += 4) g.fillRect(i, 0, 2, h);
});
pushTop.wrapS = pushTop.wrapT = THREE.RepeatWrapping;
pushTop.repeat.set(2, 1.5);
const pusherMesh = inked(box(C.halfW * 2 - 0.04, C.pTop, C.pDepth), [
  toon('#b46cff'), toon('#b46cff'), toon('#ffffff', { map: pushTop }), toon('#6b34c9'),
  toon('#ffffff', { map: pushTex }), toon('#6b34c9'),
], 0.05);
scene.add(pusherMesh);

// ---------- back housing, display, marquee ----------
const housing = inked(box(C.halfW * 2 + 0.8, 6.8 - C.pTop, 2.4), toon('#6b34c9'), 0.06);
add(housing, 0, (6.8 + C.pTop) / 2 + 0.06, C.wallZ - 1.2);

export const screenTex = pixTex(96, 56, () => {});
const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.62), new THREE.MeshBasicMaterial({ map: screenTex }));
add(screen, 0, 4.25, C.wallZ + 0.02);
add(inked(box(6.7, 4.1, 0.2), toon('#1a1033'), 0.04), 0, 4.25, C.wallZ - 0.1);

let marqTex;
export function drawMarquee() {
  marqTex ||= pixTex(128, 24, () => {});
  const g = marqTex.userData.ctx;
  g.fillStyle = '#ef3e5c'; g.fillRect(0, 0, 128, 24);
  g.fillStyle = '#9c1f3f'; g.fillRect(0, 20, 128, 4);
  let fs = 16;
  do g.font = `${fs}px "Pixelify Sans", monospace`; while (g.measureText('POUSSE-PIÈCES').width > 100 && --fs > 8);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#1a1033'; g.fillText('POUSSE-PIÈCES', 65, 12);
  g.fillStyle = '#ffd23f'; g.fillText('POUSSE-PIÈCES', 64, 11);
  // keep the pixels hard: snap the antialiased text to the palette
  const img = g.getImageData(0, 0, 128, 24), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = d[i + 1] > 150, k = d[i] < 70;
    if (y) { d[i] = 255; d[i + 1] = 210; d[i + 2] = 63; }
    else if (k) { d[i] = 26; d[i + 1] = 16; d[i + 2] = 51; }
    else if (d[i + 1] > 40 && d[i + 1] < 150 && i / 4 % 128 < 128) { d[i] = 239; d[i + 1] = 62; d[i + 2] = 92; }
  }
  g.putImageData(img, 0, 0);
  marqTex.needsUpdate = true;
  return marqTex;
}
const marquee = inked(box(C.halfW * 2 + 2.4, 2, 1.4), [
  toon('#d6336c'), toon('#d6336c'), toon('#ffd23f'), toon('#d6336c'),
  new THREE.MeshBasicMaterial({ map: drawMarquee() }), toon('#d6336c'),
], 0.06);
add(marquee, 0, 7.95, C.wallZ - 0.2);
for (const s of [-1, 1]) {
  add(inked(box(1.2, 10, 3.2), toon('#d6336c'), 0.06), s * (C.halfW + 0.6), 3.2, C.wallZ - 1.0);
}

// ---------- side rails (physical walls) and bonus walls ----------
const railMat = toon('#d6336c');
const rails = [-1, 1].map(s => {
  const m = inked(box(0.5, 2.2, 1), railMat, 0.05);
  m.userData.s = s;
  return add(m, s * (C.halfW + 0.25), 1.1, 0);
});
export function layoutRails() {
  const z0 = C.wallZ - 0.2, z1 = gutterZ();
  for (const m of rails) {
    m.scale.z = z1 - z0;
    m.position.z = (z0 + z1) / 2;
  }
}
const bonusMat = new THREE.MeshBasicMaterial({ color: '#6ff5ff', transparent: true, opacity: 0.55 });
const bonusWalls = [-1, 1].map(s => {
  const m = add(new THREE.Mesh(box(0.4, 1.4, 1), bonusMat), s * (C.halfW + 0.25), 0.7, 0);
  m.visible = false;
  return m;
});
export function showBonusWalls(on, t = 0) {
  const z0 = gutterZ() - 0.1, z1 = C.front + 0.1;
  for (const m of bonusWalls) {
    m.visible = on;
    m.scale.z = z1 - z0;
    m.position.z = (z0 + z1) / 2;
  }
  bonusMat.opacity = 0.35 + 0.25 * Math.abs(Math.sin(t * 6));
}

// ---------- bulbs ----------
const bulbPos = [];
for (let i = 0; i <= 16; i++) bulbPos.push([-5.1 + i * 10.2 / 16, 9.1, C.wallZ + 0.5]);
for (let i = 0; i < 8; i++) for (const s of [-1, 1]) bulbPos.push([s * (C.halfW + 0.6), 0.6 + i * 0.85, C.wallZ + 0.62]);
for (let i = 0; i <= 12; i++) bulbPos.push([-5.4 + i * 10.8 / 12, -0.55, C.front + 2.65]);
const bulbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial(), bulbPos.length);
const tmp = new THREE.Object3D(), col = new THREE.Color();
bulbPos.forEach(([x, y, z], i) => {
  tmp.position.set(x, y, z); tmp.updateMatrix();
  bulbs.setMatrixAt(i, tmp.matrix);
  bulbs.setColorAt(i, col.set('#fff'));
});
scene.add(bulbs);
export const lights = { mode: 'idle', until: 0 };
const BULB = ['#ffd23f', '#ef3e5c', '#49b6ff', '#4ad66d', '#ff7ad9', '#ffffff'];
export function updateBulbs(t) {
  const m = t < lights.until ? lights.mode : 'idle';
  for (let i = 0; i < bulbPos.length; i++) {
    let c;
    if (m === 'jackpot') c = BULB[(i + Math.floor(t * 18)) % BULB.length];
    else if (m === 'win') c = (Math.floor(t * 14) + i) % 2 ? '#ffffff' : '#ffd23f';
    else if (m === 'spin') c = (i + Math.floor(t * 24)) % 4 === 0 ? '#ffffff' : '#ef3e5c';
    else c = (i + Math.floor(t * 5)) % 5 === 0 ? '#fff2a8' : '#8a5a2a';
    bulbs.setColorAt(i, col.set(c));
  }
  bulbs.instanceColor.needsUpdate = true;
  chute.material.color.set(m === 'idle' ? (Math.sin(t * 3) > 0 ? '#ffd23f' : '#f29e1f') : '#ffffff');
}

// ---------- gate ring ----------
const ringGeo = new THREE.TorusGeometry(1, 0.12, 4, 16);
export const ring = new THREE.Group();
const ringMat = toon('#ffd23f');
const ringMesh = new THREE.Mesh(ringGeo, ringMat);
ringMesh.rotation.x = Math.PI / 2;
const ringInk = new THREE.Mesh(new THREE.TorusGeometry(1, 0.17, 4, 16), INK);
ringInk.rotation.x = Math.PI / 2;
ring.add(ringMesh, ringInk);
for (let i = 0; i < 4; i++) {
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  b.position.set(Math.cos(i * Math.PI / 2), 0.08, Math.sin(i * Math.PI / 2));
  ring.add(b);
}
add(ring, 0, C.gateY, C.gateZ);
let ringFlash = 0;
export function flashRing() { ringFlash = 1; }

// ---------- dropper ----------
export const dropper = new THREE.Group();
dropper.add(inked(box(1.3, 0.5, 0.9), toon('#ffd23f'), 0.05));
const slot = new THREE.Mesh(box(1.05, 0.06, 0.3), new THREE.MeshBasicMaterial({ color: '#1a1033' }));
slot.position.y = -0.26;
dropper.add(slot);
add(dropper, 0, C.dropY + 0.35, C.dropZ);
add(inked(box(C.halfW * 2 + 0.6, 0.14, 0.14), toon('#8a8aa8'), 0.03), 0, C.dropY + 0.65, C.dropZ);
const beam = add(new THREE.Mesh(box(1, 1, 0.06), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false })), 0, 0, C.dropZ);
export const aim = { x: 0, on: false, kick: 0 };

// ---------- coins ----------
function faceTex(base, ring, dark, emblem) {
  return pixTex(16, 16, g => {
    const c = 7.5;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - c, y - c);
      g.fillStyle = d > 6.6 ? dark : d > 5.4 ? ring : base;
      g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = '#ffffff'; g.fillRect(4, 4, 2, 1); g.fillRect(4, 5, 1, 1);
    emblem(g);
  });
}
const em = (rows, color) => g => {
  g.fillStyle = color;
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && g.fillRect(5 + x, 5 + y, 1, 1)));
};
const COIN_LOOK = [
  { side: '#e8a317', face: faceTex('#ffd23f', '#f29e1f', '#b8650f', em(['..#..', '.###.', '#####', '.###.', '..#..', '.....'], '#f29e1f')) },
  { side: '#e0d8ff', face: faceTex('#ff7ad9', '#ffd23f', '#b46cff', em(['..#..', '..#..', '#####', '.###.', '.#.#.', '#...#'], '#ffffff')) },
  { side: '#9c1f3f', face: faceTex('#ef3e5c', '#ff8aa0', '#9c1f3f', em(['.....', '#####', '.###.', '..#..', '.....', '.....'], '#ffffff')) },
  { side: '#e8a317', face: faceTex('#ffd23f', '#ef3e5c', '#b8650f', em(['#####', '...#.', '..#..', '.#...', '.#...', '.....'], '#ef3e5c')) },
];
const CAP = [800, 80, 80, 30];
const inst = KINDS.map((K, k) => {
  const geo = new THREE.CylinderGeometry(K.r, K.r, K.h, 14);
  const L = COIN_LOOK[k];
  const side = toon(L.side), face = toon('#ffffff', { map: L.face });
  const m = new THREE.InstancedMesh(geo, [side, face, face], CAP[k]);
  const o = new THREE.InstancedMesh(hullGeo(geo, 0.045), INK, CAP[k]);
  o.instanceMatrix = m.instanceMatrix;
  m.castShadow = m.receiveShadow = true;
  m.frustumCulled = o.frustumCulled = false;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(m, o);
  return { m, o };
});

const q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), mat4 = new THREE.Matrix4();
export function syncBodies(t) {
  const n = [0, 0, 0, 0];
  for (const o of bodies) {
    const tr = o.body.translation(), r = o.body.rotation();
    if (o.type === 'coin') {
      const I = inst[o.k];
      if (n[o.k] >= CAP[o.k]) continue;
      mat4.compose(p.set(tr.x, tr.y, tr.z), q.set(r.x, r.y, r.z, r.w), one);
      I.m.setMatrixAt(n[o.k]++, mat4);
    } else if (o.mesh) {
      o.mesh.position.set(tr.x, tr.y, tr.z);
      o.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
  inst.forEach((I, k) => {
    I.m.count = I.o.count = n[k];
    I.m.instanceMatrix.needsUpdate = true;
  });

  pusherMesh.position.set(0, C.pTop / 2 + 0.005, pusher.z - C.pDepth / 2);

  ring.position.x = gate.x;
  ring.scale.setScalar(gate.r);
  ring.rotation.y = t * 1.5;
  ringFlash = Math.max(0, ringFlash - 0.04);
  ringMat.color.set(ringFlash > 0 ? (Math.floor(t * 20) % 2 ? '#ffffff' : '#4ad66d') : '#ffd23f');
  ring.children.slice(2).forEach((b, i) => b.material.color.set((Math.floor(t * 4) + i) % 2 ? '#ffffff' : '#ef3e5c'));

  dropper.position.x += (aim.x - dropper.position.x) * 0.45;
  aim.kick *= 0.8;
  dropper.position.y = C.dropY + 0.35 + aim.kick * 0.25;
  dropper.scale.set(1 + aim.kick * 0.25, 1 - aim.kick * 0.2, 1);
  beam.visible = aim.on;
  const top = C.dropY, bot = C.pTop + 0.02;
  beam.scale.set(0.9, top - bot, 1);
  beam.position.set(dropper.position.x, (top + bot) / 2, C.dropZ);
}

export function setupMachine() {
  layoutRails();
  if (document.fonts) document.fonts.ready.then(drawMarquee);
}
export { pusherMax };
