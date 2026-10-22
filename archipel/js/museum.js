// Intérieur du Muséum, inspiré de la Grande Galerie de l'Évolution : nef sous verrière,
// caravane des animaux photographiés, vitrines d'insectes, aquariums et grands animaux marins suspendus.
import { THREE, scene, Builder, mesh, MAT, inject, modelFrom, textTex } from './gfx.js?v=1';
import { SPECIES, BY_ID, BIOMES, METHODS, speciesGeos } from './species.js?v=1';

export const ORIGIN = new THREE.Vector3(3000, 0, 3000);
const W = 30, L = 64, HT = 20;
export const museum = { group: null, colliders: { boxes: [], circles: [] }, anchors: [], anims: [], lights: [], exit: { x: 0, z: 31.5 }, spawn: { x: 0, z: 28 } };

const CARAVANE = SPECIES.filter(s => s.method === 'photo' && (s.hab === 'sol' || s.hab === 'plage')).map(s => s.id);
const OISEAUX = SPECIES.filter(s => s.hab === 'arbre' || s.id === 'rougegorge').map(s => s.id).filter(id => !CARAVANE.includes(id) || id === 'rougegorge');
const INSECTES = SPECIES.filter(s => s.method === 'filet').map(s => s.id);
const AQUARIUM = SPECIES.filter(s => s.method === 'peche' || s.method === 'plongee').map(s => s.id);
const SUSPENDUS = SPECIES.filter(s => s.hab === 'large').map(s => s.id);
const caravane = CARAVANE.filter(id => id !== 'rougegorge');

const ghostMat = inject(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .12, depthWrite: false }));
const qTex = textTex('?', 128, 128, '#2b2118', '#e9d6a6', 'bold 92px Georgia');
const qMat = inject(new THREE.MeshBasicMaterial({ map: qTex }));
const plaqueCache = {};
function plaque(txt) {
  if (!plaqueCache[txt]) plaqueCache[txt] = inject(new THREE.MeshBasicMaterial({ map: textTex(txt, 512, 128, '#2b2118', '#f0dfb8', 'bold 42px Georgia') }));
  return plaqueCache[txt];
}
const rCache = {};
function radius(id) { if (!(id in rCache)) { const b = new THREE.Box3(); for (const g of Object.values(speciesGeos(id))) { g.computeBoundingBox(); b.union(g.boundingBox); } rCache[id] = b.getSize(new THREE.Vector3()).length() / 2; } return rCache[id]; }
function specimen(id, scale, minR = 0) { const m = modelFrom(speciesGeos(id)); m.scale.setScalar(Math.max(scale, minR / radius(id))); return m; }
function ghost(id, scale) {
  const g = new THREE.Group(); for (const geo of Object.values(speciesGeos(id))) g.add(new THREE.Mesh(geo, ghostMat)); g.scale.setScalar(scale); return g;
}

function shell(g) {
  const b = new Builder();
  b.box('#6e4b32', [0, -.2, 0], [W, .4, L]);
  for (let i = -15; i <= 15; i++) b.box('#5d3f2a', [0, .005, i * 2], [W, .02, .07]);
  b.box('#d9c8a3', [0, .3, -1], [7.6, .6, 46]); b.box('#3e2c1e', [0, .05, -1], [8, .15, 46.4]);
  for (const s of [-1, 1]) {
    b.box('#eee2c9', [s * W / 2, HT / 2, 0], [.6, HT, L]);
    b.box('#d8c8a8', [s * (W / 2 - .35), .5, 0], [.15, 1, L]);
    for (let z = -26; z <= 26; z += 6.5) { b.limb('#465a54', [s * 8, 0, z], [s * 8, HT, z], .3, .25); b.box('#465a54', [s * 8, .15, z], [.85, .3, .85]); b.box('#465a54', [s * 8, 8.6, z], [.7, .3, .7]); }
    for (const y of [9, 13.5]) {
      b.box('#8a6844', [s * 11.5, y, 0], [7, .45, L]);
      b.box('#3f2c1d', [s * 8.05, y + 1.1, 0], [.16, .14, L]); b.box('#465a54', [s * 8.05, y + .55, 0], [.1, .08, L]);
      for (let z = -31; z <= 31; z += 1.2) b.limb('#465a54', [s * 8.05, y + .2, z], [s * 8.05, y + 1.05, z], .03);
      for (let z = -26; z <= 26; z += 6.5) { b.box('#cfe7ee', [s * 14, y + 1.2, z], [1.3, 1.8, 2]); b.box('#5b4129', [s * 14, y + .35, z], [1.35, .2, 2.05]); b.ball(['#c9a46a', '#8fb3a4', '#d98a6a', '#efe6cf'][(z + 30 + y | 0) % 4], [s * 14, y + .8, z], .35); }
    }
  }
  b.box('#eee2c9', [0, HT / 2, -L / 2], [W, HT, .6]);
  b.box('#a83a32', [0, .02, L / 2 - 2], [3, .04, 4]); b.box('#e9c46a', [0, .025, L / 2 - 2], [2.6, .04, 3.6]); b.box('#a83a32', [0, .03, L / 2 - 2], [2.2, .04, 3.2]);
  const R = W / 2 - .3;
  for (let z = -32; z <= 32; z += 4) b.torus('#3e4f4a', [0, HT, z], R, .12, Math.PI, [0, 0, 0], [1, .55, 1]);
  const geos = b.geometries(); g.add(mesh(geos.body, MAT.toon, false));
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 32, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), inject(new THREE.MeshBasicMaterial({ color: '#dff1f7', transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false })));
  glass.position.y = HT; glass.scale.y = .55; g.add(glass);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(7, 9), inject(new THREE.MeshBasicMaterial({ color: '#fff1d2' }))); win.position.set(0, 7.5, -L / 2 + .35); g.add(win);
  const arc = new THREE.Mesh(new THREE.CircleGeometry(3.5, 24, 0, Math.PI), win.material); arc.position.set(0, 12, -L / 2 + .35); g.add(arc);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.4), inject(new THREE.MeshBasicMaterial({ map: textTex('GALERIE DES ESPÈCES', 1024, 144, '#3a2a1e', '#f0dfb8', 'bold 76px Georgia') })));
  sign.position.set(0, 16.5, -L / 2 + .35); g.add(sign);
  const C = museum.colliders;
  C.boxes.push({ x0: -3.8, x1: 3.8, z0: -24, z1: 22 });
  C.boxes.push({ x0: -W / 2, x1: -W / 2 + .4, z0: -L / 2, z1: L / 2 }, { x0: W / 2 - .4, x1: W / 2, z0: -L / 2, z1: L / 2 }, { x0: -W / 2, x1: W / 2, z0: -L / 2, z1: -L / 2 + .4 });
  C.boxes.push({ x0: -W / 2, x1: -1.7, z0: L / 2 - .4, z1: L / 2 + 2 }, { x0: 1.7, x1: W / 2, z0: L / 2 - .4, z1: L / 2 + 2 });
  for (const s of [-1, 1]) for (let z = -26; z <= 26; z += 6.5) C.circles.push({ x: s * 8, z, r: .45 });
}

function addPlaque(g, x, y, z, ry, found, sp) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(found ? 1.5 : .45, found ? .38 : .45), found ? plaque(sp.nom) : qMat);
  p.position.set(x, y, z); p.rotation.y = ry; g.add(p);
}
export function buildMuseum(found) {
  if (museum.group) { scene.remove(museum.group); }
  museum.colliders = { boxes: [], circles: [] }; museum.anchors = []; museum.anims = []; museum.lights = [];
  const g = new THREE.Group(); museum.group = g; g.position.copy(ORIGIN);
  shell(g);
  const C = museum.colliders, A = museum.anchors, has = id => !!found[id];
  // la caravane
  caravane.forEach((id, i) => {
    const sp = BY_ID[id], row = Math.floor(i / 2), x = (i % 2 ? 1.75 : -1.75), z = 18 - row * 6.2 - (i % 2) * 1.6;
    const b = new Builder(); b.cyl('#3e2c1e', [0, .25, 0], 1.05, 1.15, .5, null, 20); b.cyl('#5a4130', [0, .53, 0], 1, 1, .06, null, 20);
    const ped = mesh(b.merged()); ped.position.set(x, .6, z); g.add(ped);
    if (has(id)) { const m = specimen(id, Math.min((sp.scale || 1) * 1.15, 1.25), .75); m.position.set(x, 1.17, z); m.rotation.y = -Math.PI / 2 + (i % 2 ? -.35 : .35); g.add(m); }
    addPlaque(g, x, .95, z + 1.18, 0, has(id), sp);
    A.push({ id, x, z: z + 1.6, r: 2.4 });
  });
  // les oiseaux, au fond sous la grande fenêtre
  OISEAUX.forEach((id, i) => {
    const sp = BY_ID[id], x = (i - 1) * 3.4, z = -27;
    const b = new Builder(); b.cyl('#3e2c1e', [0, .15, 0], .55, .6, .3); b.limb('#6a4a30', [0, .3, 0], [0, 1.9, 0], .07); b.limb('#6a4a30', [-.6, 1.9, 0], [.6, 1.9, 0], .06);
    const st = mesh(b.merged()); st.position.set(x, 0, z); g.add(st);
    if (has(id)) { const m = specimen(id, (sp.scale || 1) * 1.4); m.position.set(x, 1.9, z); m.rotation.y = -Math.PI / 2; g.add(m); }
    else { const q = new THREE.Mesh(new THREE.PlaneGeometry(.45, .45), qMat); q.position.set(x, 2.2, z); g.add(q); }
    addPlaque(g, x, .6, z + .65, 0, has(id), sp);
    C.circles.push({ x, z, r: .6 }); A.push({ id, x, z: z + 1.4, r: 2 });
  });
  // vitrines d'insectes
  INSECTES.forEach((id, i) => {
    const sp = BY_ID[id], s = i % 2 ? 1 : -1, z = 15 - Math.floor(i / 2) * 7, x = s * 5.6;
    const b = new Builder(); for (const k of [-1, 1]) for (const q of [-1, 1]) b.limb('#8a6a48', [k * .4, 0, q * .62], [k * .4, .75, q * .62], .05);
    b.box('#b08a5e', [0, .8, 0], [1.08, .1, 1.58]); b.box('#efe2c6', [0, .86, 0], [.96, .02, 1.46]);
    b.part('glass').box('#cfe9ef', [0, 1.3, 0], [1, .85, 1.5]);
    { const mm = modelFrom(b.geometries()); mm.position.set(x, 0, z); g.add(mm); }
    if (has(id)) { const m = specimen(id, (sp.scale || 1) * 2.2, .42); m.position.set(x, .88, z); m.rotation.y = -Math.PI / 2 + s * .5; g.add(m); }
    addPlaque(g, x + s * .52, .7, z, s * Math.PI / 2, has(id), sp);
    C.boxes.push({ x0: x - .5, x1: x + .5, z0: z - .75, z1: z + .75 }); A.push({ id, x: x + s * 1.2, z, r: 1.8 });
  });
  // aquariums
  AQUARIUM.forEach((id, i) => {
    const sp = BY_ID[id], s = i % 2 ? 1 : -1, z = 19.5 - Math.floor(i / 2) * 7.2, x = s * 12.9;
    const b = new Builder(); b.box('#3e2c1e', [0, .35, 0], [3.8, .7, 5.6]); b.box('#e8d9b0', [0, .78, 0], [3.5, .16, 5.3]);
    for (let k = 0; k < 5; k++) b.rock(['#8a8a82', '#a0624a', '#6f9a5a'][k % 3], [((k * 37) % 5 - 2) * .5, .9, ((k * 23) % 7 - 3) * .6], .2 + (k % 3) * .1);
    for (const k of [-1, 1]) { b.box('#3e4f4a', [k * 1.85, 3.05, 0], [.12, .14, 5.6]); b.box('#3e4f4a', [0, 3.05, k * 2.75], [3.8, .14, .12]); }
    b.part('glass').box('#bfe6f0', [0, 1.95, 0], [3.6, 2.2, 5.4]);
    { const mm = modelFrom(b.geometries()); mm.position.set(x, 0, z); g.add(mm); }
    const wat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.95, 5.2), MAT.water); wat.position.set(x, 1.83, z); g.add(wat);
    if (has(id)) {
      const scale = { requin: .85, poissonlune: .9, thon: .95 }[id] || (sp.scale || 1) * 1.6, m = specimen(id, scale); g.add(m);
      if (sp.method === 'plongee') { m.position.set(x, .87, z); m.rotation.y = s * Math.PI / 2; }
      else museum.anims.push({ m, t: 'swim', x, z, y: 1.85, rx: .9, rz: sp.size === 'XL' || sp.size === 'L' ? 1.4 : 1.8, sp: sp.size === 'XL' ? .25 : .5, ph: i });
    } else { const q = new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), qMat); q.position.set(x - s * 1.82, 2.2, z); q.rotation.y = -s * Math.PI / 2; g.add(q); }
    addPlaque(g, x - s * 1.92, .55, z, -s * Math.PI / 2, has(id), sp);
    C.boxes.push({ x0: x - 1.9, x1: x + 1.9, z0: z - 2.8, z1: z + 2.8 }); A.push({ id, x: x - s * 2.8, z, r: 2.6 });
  });
  // grands animaux marins suspendus au-dessus de la caravane
  SUSPENDUS.forEach((id, i) => {
    const sp = BY_ID[id], z = [-12, 6, 15][i], y = [7.2, 6.4, 6.2][i], scale = [.9, 1.3, 2.2][i];
    const m = has(id) ? specimen(id, scale) : ghost(id, scale); m.position.set(0, y, z); m.rotation.y = -Math.PI / 2 + .3; g.add(m);
    for (const k of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, HT - y), inject(new THREE.MeshBasicMaterial({ color: '#333' }))); w.position.set(0, y + (HT - y) / 2, z + k * (id === 'baleine' ? 3 : .5)); g.add(w); }
    museum.anims.push({ m, t: 'hang', y, ph: i });
    A.push({ id, x: 0, z: z + 6, r: 0, hang: true });
  });
  // panneau de collection
  const n = Object.keys(found).length;
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), inject(new THREE.MeshBasicMaterial({ map: textTex(`Collection\n${n} / ${SPECIES.length}`, 512, 192, '#2b2118', '#f3e6c8', 'bold 64px Georgia') })));
  sg.position.set(0, 1.6, 23.2); g.add(sg);
  const b = new Builder(); b.box('#3e2c1e', [0, .55, 23], [3.4, 1.1, .3]); g.add(mesh(b.merged()));
  C.boxes.push({ x0: -1.7, x1: 1.7, z0: 22.8, z1: 23.3 });
  // lumières chaudes
  for (const [x, y, z] of [[0, 7, -18], [0, 7, 0], [0, 7, 16], [-11, 4, -4], [11, 4, 6], [-11, 4, 14], [11, 4, -14]]) {
    const l = new THREE.PointLight('#ffd9a0', 30, 26, 1.6); l.position.set(x, y, z); g.add(l); museum.lights.push(l);
  }
  for (const c of C.boxes) { c.x0 += ORIGIN.x; c.x1 += ORIGIN.x; c.z0 += ORIGIN.z; c.z1 += ORIGIN.z; }
  for (const c of C.circles) { c.x += ORIGIN.x; c.z += ORIGIN.z; }
  for (const a of A) { a.x += ORIGIN.x; a.z += ORIGIN.z; }
  scene.add(g);
  return g;
}
export function unloadMuseum() { if (museum.group) { scene.remove(museum.group); museum.group = null; } }
export function animateMuseum(t) {
  for (const a of museum.anims) {
    if (a.t === 'swim') { const k = t * a.sp + a.ph; a.m.position.set(a.x + Math.cos(k) * a.rx, a.y + Math.sin(k * 2) * .15, a.z + Math.sin(k) * a.rz); a.m.rotation.y = -Math.atan2(Math.cos(k) * a.rz, -Math.sin(k) * a.rx); }
    if (a.t === 'hang') { a.m.position.y = a.y + Math.sin(t * .4 + a.ph) * .08; }
  }
}
export function nearestAnchor(x, z) {
  let best = null, bd = 1e9;
  for (const a of museum.anchors) { const d = Math.hypot(a.x - x, a.z - z); const lim = a.hang ? 4.5 : a.r; if (d < lim && d < bd) { bd = d; best = a; } }
  return best;
}
export const MUSEUM_SECTIONS = { caravane, OISEAUX, INSECTES, AQUARIUM, SUSPENDUS };
