// Intérieur du Muséum, en plusieurs salles comme dans Animal Crossing :
// un hall d'accueil (avec la conservatrice) qui dessert l'Insectarium (ouest), l'Aquarium (est)
// et la Grande Galerie (nord), inspirée de la Galerie de l'Évolution.
import { THREE, scene, Builder, mesh, MAT, inject, modelFrom, textTex } from './gfx.js?v=2';
import { SPECIES, BY_ID, speciesGeos } from './species.js?v=2';

export const ORIGIN = new THREE.Vector3(3000, 0, 3000);
export const ROOMS = {
  hall: { nom: 'Hall d’accueil', x0: -8, x1: 8, z0: -7, z1: 7.5 },
  insectes: { nom: 'Insectarium', x0: -30, x1: -8, z0: -10, z1: 10 },
  aquarium: { nom: 'Aquarium', x0: 8, x1: 32, z0: -10, z1: 10 },
  galerie: { nom: 'Grande Galerie', x0: -10, x1: 10, z0: -50, z1: -7 },
};
export const museum = { group: null, colliders: { boxes: [], circles: [] }, anchors: [], anims: [], spawn: { x: 0, z: 5 }, exitZ: 8.2, exit: { x: 0, z: 7 } };

const GALERIE = SPECIES.filter(s => s.method === 'photo' && (s.hab === 'sol' || s.hab === 'plage') && s.id !== 'rougegorge').map(s => s.id);
const OISEAUX = ['rougegorge', 'chouette', 'ara'];
const INSECTES = SPECIES.filter(s => s.method === 'filet').map(s => s.id);
const AQUARIUM = SPECIES.filter(s => s.method === 'peche' || s.method === 'plongee').map(s => s.id);
const SUSPENDUS = SPECIES.filter(s => s.hab === 'large').map(s => s.id);
export const WINGS = { galerie: [...GALERIE, ...OISEAUX, ...SUSPENDUS], insectes: INSECTES, aquarium: AQUARIUM };

const ghostMat = inject(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .13, depthWrite: false }));
const tankWater = inject(new THREE.MeshBasicMaterial({ color: '#5fd0e8', transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide }));
const qMat = inject(new THREE.MeshBasicMaterial({ map: textTex('?', 128, 128, '#2b2118', '#e9d6a6', 'bold 92px Georgia') }));
const texCache = {};
const signMat = (txt, w = 512, h = 128, bg = '#2b2118', fg = '#f0dfb8', font = 'bold 42px Georgia') => {
  const k = [txt, w, h, bg, fg, font].join('|');
  return texCache[k] || (texCache[k] = inject(new THREE.MeshBasicMaterial({ map: textTex(txt, w, h, bg, fg, font) })));
};
const rCache = {};
function radius(id) {
  if (!(id in rCache)) { const b = new THREE.Box3(); for (const g of Object.values(speciesGeos(id))) { g.computeBoundingBox(); b.union(g.boundingBox); } rCache[id] = b.getSize(new THREE.Vector3()).length() / 2; }
  return rCache[id];
}
function specimen(id, scale, minR = 0) { const m = modelFrom(speciesGeos(id)); m.scale.setScalar(Math.max(scale, minR / radius(id))); return m; }
function ghost(id, scale) { const g = new THREE.Group(); for (const geo of Object.values(speciesGeos(id))) g.add(new THREE.Mesh(geo, ghostMat)); g.scale.setScalar(scale); return g; }
function plane(g, mat, w, h, p, ry = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...p); m.rotation.y = ry; g.add(m); return m; }
function plaque(g, sp, found, p, ry) { plane(g, found ? signMat(sp.nom) : qMat, found ? 1.5 : .42, found ? .38 : .42, p, ry); }

// murs alignés sur les axes, avec ouvertures ; chaque mur est aussi un obstacle
function wall(b, C, axis, at, from, to, h, col, gaps = [], hidden = false) {
  if (hidden) b = { box() { } }; // mur invisible côté caméra, mais toujours solide
  let segs = [[from, to]];
  for (const [a, z] of gaps) segs = segs.flatMap(([s, e]) => a >= e || z <= s ? [[s, e]] : [[s, a], [z, e]].filter(([u, v]) => v - u > .01));
  for (const [s, e] of segs) {
    const c = (s + e) / 2, L = e - s;
    if (axis === 'x') { b.box(col, [c, h / 2, at], [L, h, .5]); C.boxes.push({ x0: s, x1: e, z0: at - .3, z1: at + .3 }); }
    else { b.box(col, [at, h / 2, c], [.5, h, L]); C.boxes.push({ x0: at - .3, x1: at + .3, z0: s, z1: e }); }
  }
  for (const [a, z] of gaps) { const c = (a + z) / 2, w = z - a; // encadrement de porte
    if (axis === 'x') { b.box('#8a6a48', [c, 3.3, at], [w + .5, .5, .6]); for (const q of [a, z]) b.box('#8a6a48', [q, 1.6, at], [.3, 3.2, .6]); }
    else { b.box('#8a6a48', [at, 3.3, c], [.6, .5, w + .5]); for (const q of [a, z]) b.box('#8a6a48', [at, 1.6, q], [.6, 3.2, .3]); } }
}
function floorTiles(b, R, c1, c2, s = 2) {
  for (let x = R.x0; x < R.x1 - .01; x += s) for (let z = R.z0; z < R.z1 - .01; z += s) {
    const w = Math.min(s, R.x1 - x), d = Math.min(s, R.z1 - z);
    b.box(((Math.round(x / s) + Math.round(z / s)) & 1) ? c1 : c2, [x + w / 2, -.1, z + d / 2], [w, .2, d]);
  }
}

// ---------- hall d'accueil ----------
function buildHall(g, b, C, A, found) {
  const R = ROOMS.hall;
  floorTiles(b, R, '#efe6d2', '#d9cdb4', 2);
  b.cyl('#b8463e', [0, .02, 1.5], 4.2, 4.2, .04, null, 32); b.cyl('#e9c46a', [0, .03, 1.5], 3.8, 3.8, .04, null, 32); b.cyl('#b8463e', [0, .04, 1.5], 3.4, 3.4, .04, null, 32);
  wall(b, C, 'x', R.z1, R.x0, R.x1, 7, '#efe2c6', [[-1.8, 1.8]], true);
  b.box('#c9b48e', [0, .03, R.z1 - .2], [16, .06, .4]);
  for (const [x, z] of [[-7, -6], [7, -6]]) { b.limb('#d9c7a4', [x, 0, z], [x, 7, z], .45, .4); b.box('#c9b48e', [x, .2, z], [1.1, .4, 1.1]); C.circles.push({ x, z, r: .5 }); }
  // comptoir de la conservatrice
  b.cyl('#8a5a36', [0, .55, -1.6], 2, 2.1, 1.1, null, 28); b.cyl('#c9a46a', [0, 1.12, -1.6], 2.15, 2.15, .08, null, 28);
  b.box('#e9e2d0', [.6, 1.2, -.2], [.5, .04, .35]); b.cyl('#c9a46a', [-.9, 1.25, -.5], .1, .12, .2); b.ball('#e2574a', [-.9, 1.42, -.5], .12);
  C.circles.push({ x: 0, z: -1.6, r: 2.15 });
  // la conservatrice (blouse, lunettes, chignon)
  const k = new Builder(), SK = '#f3d0b4';
  k.cyl('#f4f1e8', [0, .75, 0], .26, .34, .9); k.box('#7fb8a4', [.27, .9, 0], [.04, .4, .16]);
  k.ball(SK, [0, 1.48, 0], [.42, .4, .42]); k.ball('#9a9aa8', [-.06, 1.6, 0], [.42, .3, .44]); k.ball('#9a9aa8', [-.32, 1.75, 0], .2);
  for (const z of [-1, 1]) { k.torus('#3a2a22', [.4, 1.48, z * .14], .09, .018, Math.PI * 2, [0, Math.PI / 2, 0]); k.ball('#1d1a1a', [.42, 1.48, z * .14], [.02, .06, .045]); k.ball('#f5a3a0', [.37, 1.35, z * .24], [.02, .04, .06]);
    k.limb('#f4f1e8', [0, 1.1, z * .3], [.25, .85, z * .32], .07); k.ball(SK, [.28, .82, z * .32], .07); }
  k.ball('#e0a080', [.43, 1.4, 0], .035);
  const cur = modelFrom(k.geometries()); cur.position.set(0, 0, -1.9); cur.rotation.y = -Math.PI / 2; g.add(cur);
  museum.anims.push({ t: 'curator', m: cur });
  // panneaux au-dessus des portes
  plane(g, signMat('← INSECTARIUM', 640, 120), 4.2, .8, [-7.6, 4.3, 0], Math.PI / 2);
  plane(g, signMat('AQUARIUM →', 640, 120), 4.2, .8, [7.6, 4.3, 0], -Math.PI / 2);
  plane(g, signMat('GRANDE GALERIE', 640, 120), 4.2, .8, [0, 4.3, -6.6], 0);
  // tableau de la collection
  const n = w => WINGS[w].filter(s => found[s]).length, tot = Object.keys(found).length;
  b.box('#5a4130', [-4.4, 1.3, -6.6], [3.4, 2.4, .2]);
  plane(g, signMat(`Collection ${tot} / ${SPECIES.length}\nGalerie ${n('galerie')}/${WINGS.galerie.length} · Insectes ${n('insectes')}/${WINGS.insectes.length}\nAquarium ${n('aquarium')}/${WINGS.aquarium.length}`, 640, 300, '#2b2118', '#f3e6c8', 'bold 46px Georgia'), 3.1, 1.6, [-4.4, 1.45, -6.48], 0);
  // plantes et bancs
  for (const [x, z] of [[-6.4, 5.8], [6.4, 5.8], [6, -4.6]]) { b.cyl('#c9714a', [x, .45, z], .5, .38, .9); b.ball('#4fae4f', [x, 1.5, z], .85); b.ball('#5cbd57', [x + .3, 2.1, z], .55); C.circles.push({ x, z, r: .6 }); }
  for (const s of [-1, 1]) { b.box('#7a5636', [s * 5.4, .5, 1.5], [.7, .12, 2.6]); for (const dz of [-1, 1]) b.box('#3e2c1e', [s * 5.4, .25, 1.5 + dz * 1.1], [.5, .5, .15]); C.boxes.push({ x0: s * 5.4 - .4, x1: s * 5.4 + .4, z0: .2, z1: 2.8 }); }
  b.torus('#c9a46a', [0, 6.6, 1.5], 1.6, .06, Math.PI * 2, [Math.PI / 2, 0, 0]);
  b.part('glow'); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.ball('#fff1c8', [Math.cos(a) * 1.6, 6.75, 1.5 + Math.sin(a) * 1.6], .15); } b.part('body');
  A.push({ id: '__curator', x: 0, z: .9, r: 2.3 });
}

// ---------- Insectarium (serre) ----------
function buildInsectarium(g, b, C, A, found) {
  const R = ROOMS.insectes;
  b.box('#79bf5a', [(R.x0 + R.x1) / 2, -.1, 0], [R.x1 - R.x0, .2, R.z1 - R.z0]);
  b.box('#dcc89a', [(R.x0 + R.x1) / 2, .01, 0], [R.x1 - R.x0, .04, 2.6]); b.box('#dcc89a', [-19, .012, 0], [2.6, .04, R.z1 - R.z0]);
  wall(b, C, 'x', R.z0, R.x0, R.x1, 6, '#e6eee0'); wall(b, C, 'x', R.z1, R.x0, R.x1, 6, '#e6eee0');
  wall(b, C, 'z', R.x0, R.z0, R.z1, 6, '#e6eee0'); wall(b, C, 'z', R.x1, R.z0, R.z1, 7, '#efe2c6', [[-1.8, 1.8]]);
  for (let x = R.x0 + 2; x < R.x1; x += 4) for (const z of [R.z0, R.z1]) b.box('#ffffff', [x, 3.2, z], [.15, 6.4, .6]);
  // mare, dunes, rondin, verdure
  b.cyl('#e8d9a8', [-25, .02, -5.5], 3.5, 3.5, .04, null, 28); b.cyl('#4fb8d8', [-25, .04, -5.5], 3, 3, .06, null, 28);
  for (const [x, z] of [[-26, -6.4], [-23.8, -4.6], [-25.6, -4]]) b.cyl('#5fae4a', [x, .09, z], .45, .45, .04, null, 12);
  C.circles.push({ x: -25, z: -5.5, r: 2.6 });
  b.cyl('#efd9a2', [-12.5, .02, -6], 3.2, 3.6, .08, null, 24); b.rock('#c98a5a', [-11, .3, -8], [.8, .6, .7]); b.ball('#4f9a5a', [-14.5, .8, -8.2], [.28, .8, .28]);
  b.cyl('#efd9a2', [-25, .02, 6], 3, 3.3, .08, null, 24);
  b.limb('#8a5a36', [-13.5, .3, 5.8], [-11, .3, 6.6], .35, .3); b.ball('#a0784a', [-13.5, .3, 5.8], [.1, .33, .33]);
  for (const [x, z, s] of [[-28, -8.3, 1], [-28.2, 8.4, .9], [-10, -8.6, .8], [-17, 8.4, .8], [-21.5, -8.6, .9]]) {
    b.limb('#8a5a36', [x, 0, z], [x, 2.2 * s, z], .25 * s, .18 * s); b.ball('#4fae4f', [x, 3 * s, z], 1.3 * s); b.ball('#5cbd57', [x + .6 * s, 2.6 * s, z + .3], .8 * s); C.circles.push({ x, z, r: .5 * s });
  }
  for (let i = 0; i < 40; i++) { const x = R.x0 + 1.5 + (i * 7.3) % (R.x1 - R.x0 - 3), z = ((i * 4.1) % 17) - 8.5; if (Math.abs(z) < 1.8 || Math.abs(x + 19) < 1.8) continue;
    b.ball(['#ff8fb0', '#ffd54f', '#f6f0f0', '#b39ddb'][i % 4], [x, .35, z], .14); b.limb('#4f8a3a', [x, 0, z], [x, .3, z], .025); }
  // emplacements : [x, z, hauteur, en vol ?]
  const SPOTS = {
    machaon: [-15.5, -3.4, 1.4, 1], coccinelle: [-16.4, 3.6, .5, 0], luciole: [-27.2, 2.8, 1.2, 1], grenouille: [-22.2, -4.6, 0, 0], lucane: [-12.2, 6.4, .55, 0],
    scorpion: [-13.6, -5, 0, 0], scarabee: [-11.4, -5.6, 0, 0], dendrobate: [-26.8, -2.8, 0, 0], morpho: [-22.5, 3.8, 1.6, 1], crabe: [-24, 5.6, 0, 0],
  };
  for (const id of INSECTES) {
    const sp = BY_ID[id], [x, z, h, fly] = SPOTS[id], f = !!found[id], pz = z + (z < 0 ? 1.2 : -1.2);
    b.limb('#7a5636', [x + .9, 0, pz], [x + .9, .5, pz], .04); b.box('#7a5636', [x + .9, .62, pz], [.05, .32, .95]);
    plaque(g, sp, f, [x + .93, .62, pz], Math.PI / 2);
    C.circles.push({ x: x + .9, z: pz, r: .2 });
    if (f) { const m = specimen(id, (sp.scale || 1) * 2, .38); m.position.set(x, h, z); m.rotation.y = (x * 7 + z) % 6; g.add(m);
      museum.anims.push({ t: fly ? 'fly' : 'bug', m, x, z, y: h, ph: (x + z) % 6, wings: m.children.filter(c => c.name.startsWith('wing')) }); }
    A.push({ id, x: x + 1.9, z: pz, r: 2 });
  }
}

// ---------- Aquarium ----------
function buildAquarium(g, b, C, A, found) {
  const R = ROOMS.aquarium;
  floorTiles(b, R, '#22385a', '#1c3050', 2);
  wall(b, C, 'x', R.z0, R.x0, R.x1, 6, '#1f3352'); wall(b, C, 'x', R.z1, R.x0, R.x1, 6, '#1f3352');
  wall(b, C, 'z', R.x1, R.z0, R.z1, 6, '#1f3352'); wall(b, C, 'z', R.x0, R.z0, R.z1, 7, '#efe2c6', [[-1.8, 1.8]]);
  b.part('glow'); for (let x = R.x0 + 1; x < R.x1; x += 2) for (const z of [-1.4, 1.4]) b.ball('#4fd0ff', [x, .03, z], [.08, .02, .08]); b.part('body');
  const tank = (x, z, w, d, h) => {
    b.box('#14243c', [x, .35, z], [w + .3, .7, d + .3]); b.box('#e8d9b0', [x, .76, z], [w, .12, d]);
    for (let k = 0; k < 4; k++) b.rock(['#8a8a82', '#a0624a', '#6f9a5a', '#c47a9a'][k], [x + ((k * 37) % 5 - 2) * w / 6, .9, z + ((k * 23) % 3 - 1) * d / 4], .18 + (k % 3) * .08);
    for (let k = 0; k < 3; k++) b.limb('#4fae6a', [x - w / 3 + k * w / 3, .8, z - d / 4], [x - w / 3 + k * w / 3 + .1, 1.6 + (k % 2) * .5, z - d / 4], .05, .03);
    for (const s of [-1, 1]) { b.box('#14243c', [x + s * w / 2, (h + .8) / 2, z], [.12, h + .1, d + .3]); b.box('#14243c', [x, h + .85, z + s * d / 2], [w + .3, .12, .12]); }
    const wat = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tankWater); wat.position.set(x, .8 + h / 2, z); g.add(wat);
    C.boxes.push({ x0: x - w / 2 - .15, x1: x + w / 2 + .15, z0: z - d / 2 - .15, z1: z + d / 2 + .15 });
  };
  const wallIds = AQUARIUM.filter(id => !['thon', 'requin', 'poissonlune'].includes(id));
  wallIds.forEach((id, i) => {
    const sp = BY_ID[id], north = i < 5, x = 11.5 + (north ? i : i - 5) * 4.4 + (north ? 0 : 2.2), z = north ? -8.3 : 8.3, f = !!found[id];
    tank(x, z, 3.6, 2.6, 2.4);
    if (f) { const m = specimen(id, (sp.scale || 1) * 1.6, .35); g.add(m);
      if (sp.method === 'plongee') { m.position.set(x, .86, z); m.rotation.y = north ? -Math.PI / 2 : Math.PI / 2; }
      else museum.anims.push({ t: 'swim', m, x, z, y: 1.9, rx: 1.15, rz: .55, sp: .6, ph: i }); }
    plaque(g, sp, f, [x, .5, z + (north ? 1.47 : -1.47)], north ? 0 : Math.PI);
    A.push({ id, x, z: z + (north ? 2.6 : -2.6), r: 2.2 });
  });
  // grand bassin central pour les géants
  const cx = 21, cz = 0, rr = 3.2;
  b.cyl('#14243c', [cx, .4, cz], rr + .3, rr + .3, .8, null, 32); b.cyl('#e8d9b0', [cx, .82, cz], rr, rr, .1, null, 32); b.torus('#14243c', [cx, 4.3, cz], rr + .1, .12, Math.PI * 2, [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 6; k++) b.rock(['#8a8a82', '#a0624a', '#c47a9a'][k % 3], [cx + Math.cos(k) * 2, .95, cz + Math.sin(k) * 2], .3);
  const big = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 3.4, 32, 1, true), tankWater); big.position.set(cx, 2.6, cz); g.add(big);
  C.circles.push({ x: cx, z: cz, r: rr + .3 });
  ['thon', 'requin', 'poissonlune'].forEach((id, i) => {
    const sp = BY_ID[id], f = !!found[id], a = Math.PI / 2 + (i - 1) * 1.1, px = cx + Math.cos(a) * (rr + .55), pz = cz + Math.sin(a) * (rr + .55);
    if (f) { const m = specimen(id, { thon: .9, requin: .8, poissonlune: .85 }[id]); g.add(m); museum.anims.push({ t: 'swim', m, x: cx, z: cz, y: 1.9 + i * .7, rx: 1.9, rz: 1.9, sp: .35 + i * .08, ph: i * 2 }); }
    b.limb('#3e2c1e', [px, 0, pz], [px, .45, pz], .05);
    plaque(g, sp, f, [px, .65, pz], Math.PI / 2 - a);
    A.push({ id, x: cx + Math.cos(a) * (rr + 1.6), z: cz + Math.sin(a) * (rr + 1.6), r: 1.6 });
  });
  for (const s of [-1, 1]) { b.box('#3e5a7a', [cx + s * 6.6, .45, 0], [.7, .12, 2.6]); C.boxes.push({ x0: cx + s * 6.6 - .4, x1: cx + s * 6.6 + .4, z0: -1.3, z1: 1.3 }); }
  for (const [x, z] of [[12, 0], [21, -5], [21, 5], [29, 0]]) { const l = new THREE.PointLight('#5fd8ff', 22, 14, 1.6); l.position.set(x, 3, z); g.add(l); }
}

// ---------- Grande Galerie ----------
function buildGalerie(g, b, C, A, found) {
  const R = ROOMS.galerie;
  b.box('#6e4b32', [0, -.1, (R.z0 + R.z1) / 2], [R.x1 - R.x0, .2, R.z1 - R.z0]);
  for (let z = R.z0 + 1; z < R.z1; z += 2) b.box('#5d3f2a', [0, .005, z], [R.x1 - R.x0, .02, .07]);
  wall(b, C, 'z', R.x0, R.z0, R.z1, 8, '#eee2c9'); wall(b, C, 'z', R.x1, R.z0, R.z1, 8, '#eee2c9');
  wall(b, C, 'x', R.z0, R.x0, R.x1, 10, '#eee2c9'); wall(b, C, 'x', R.z1, R.x0, R.x1, 9, '#efe2c6', [[-1.8, 1.8]]);
  plane(g, inject(new THREE.MeshBasicMaterial({ color: '#fff1d2' })), 6, 7.5, [0, 5, R.z0 + .3]);
  plane(g, signMat('GALERIE DES ESPÈCES', 1024, 144, '#3a2a1e', '#f0dfb8', 'bold 76px Georgia'), 8, 1.1, [0, 9.6, R.z0 + .3]);
  b.box('#d9c8a3', [0, .3, -28], [7.4, .6, 31]); b.box('#3e2c1e', [0, .05, -28], [7.8, .15, 31.4]);
  C.boxes.push({ x0: -3.8, x1: 3.8, z0: -43.6, z1: -12.4 });
  for (const s of [-1, 1]) {
    for (let z = -46; z <= -10; z += 6) { b.limb('#465a54', [s * 6.6, 0, z], [s * 6.6, 7.5, z], .28, .23); b.box('#465a54', [s * 6.6, 7.5, z], [.7, .3, .7]); b.box('#465a54', [s * 6.6, .15, z], [.8, .3, .8]); C.circles.push({ x: s * 6.6, z, r: .42 }); }
  }
  GALERIE.forEach((id, i) => {
    const sp = BY_ID[id], row = Math.floor(i / 2), x = i % 2 ? 1.75 : -1.75, z = -15 - row * 4.2 - (i % 2) * 1.4, f = !!found[id];
    b.cyl('#3e2c1e', [x, .85, z], 1.05, 1.15, .5, null, 20); b.cyl('#5a4130', [x, 1.13, z], 1, 1, .06, null, 20);
    if (f) { const m = specimen(id, Math.min((sp.scale || 1) * 1.15, 1.25), .75); m.position.set(x, 1.17, z); m.rotation.y = -Math.PI / 2 + (i % 2 ? -.4 : .4); g.add(m); }
    plaque(g, sp, f, [x + (i % 2 ? 1.95 : -1.95), .7, z], i % 2 ? Math.PI / 2 : -Math.PI / 2);
    A.push({ id, x: x + (i % 2 ? 2.8 : -2.8), z, r: 2.2 });
  });
  OISEAUX.forEach((id, i) => {
    const sp = BY_ID[id], s = i % 2 ? 1 : -1, x = s * 8.6, z = -17 - i * 11, f = !!found[id];
    b.cyl('#3e2c1e', [x, .15, z], .55, .6, .3); b.limb('#6a4a30', [x, .3, z], [x, 2, z], .07); b.limb('#6a4a30', [x, 2, z - .6], [x, 2, z + .6], .06);
    if (f) { const m = specimen(id, (sp.scale || 1) * 1.4); m.position.set(x, 2, z); m.rotation.y = s > 0 ? Math.PI : 0; g.add(m); }
    else plane(g, qMat, .45, .45, [x - s * .1, 2.4, z], s > 0 ? -Math.PI / 2 : Math.PI / 2);
    plaque(g, sp, f, [x - s * .62, .6, z], s > 0 ? -Math.PI / 2 : Math.PI / 2);
    C.circles.push({ x, z, r: .6 }); A.push({ id, x: x - s * 1.6, z, r: 2 });
  });
  SUSPENDUS.forEach((id, i) => {
    const z = [-31, -18, -43][i], y = [5.6, 4.8, 4.6][i], scale = [.85, 1.3, 2.2][i];
    const m = found[id] ? specimen(id, scale) : ghost(id, scale); m.position.set(0, y, z); m.rotation.y = -Math.PI / 2 + .3; g.add(m);
    for (const k of [-1, 1]) b.limb('#333', [0, y + .4, z + k * (id === 'baleine' ? 3 : .4)], [0, 10, z + k * (id === 'baleine' ? 3 : .4)], .015);
    museum.anims.push({ t: 'hang', m, y, ph: i });
    A.push({ id, x: 4.9, z, r: 3, hang: true });
  });
}

export function buildMuseum(found) {
  if (museum.group) scene.remove(museum.group);
  museum.colliders = { boxes: [], circles: [] }; museum.anchors = []; museum.anims = [];
  const g = new THREE.Group(); museum.group = g; g.position.copy(ORIGIN);
  const b = new Builder(), C = museum.colliders, A = museum.anchors;
  buildHall(g, b, C, A, found); buildInsectarium(g, b, C, A, found); buildAquarium(g, b, C, A, found); buildGalerie(g, b, C, A, found);
  const geos = b.geometries(); g.add(mesh(geos.body, MAT.toon, false)); if (geos.glow) g.add(new THREE.Mesh(geos.glow, MAT.glow));
  for (const [x, y, z, c, i] of [[0, 6, 1, '#ffe2b0', 40], [-19, 5, 0, '#fff4d0', 45], [-26, 4, 5, '#fff4d0', 20], [0, 8, -20, '#ffd9a0', 45], [0, 8, -38, '#ffd9a0', 45]]) {
    const l = new THREE.PointLight(c, i, 26, 1.5); l.position.set(x, y, z); g.add(l);
  }
  for (const c of C.boxes) { c.x0 += ORIGIN.x; c.x1 += ORIGIN.x; c.z0 += ORIGIN.z; c.z1 += ORIGIN.z; }
  for (const c of C.circles) { c.x += ORIGIN.x; c.z += ORIGIN.z; }
  for (const a of A) { a.x += ORIGIN.x; a.z += ORIGIN.z; }
  scene.add(g);
  return g;
}
export function unloadMuseum() { if (museum.group) { scene.remove(museum.group); museum.group = null; } }

export function animateMuseum(t, px, pz) {
  for (const a of museum.anims) {
    if (a.t === 'swim') { const k = t * a.sp + a.ph; a.m.position.set(a.x + Math.cos(k) * a.rx, a.y + Math.sin(k * 2) * .12, a.z + Math.sin(k) * a.rz); a.m.rotation.y = -Math.atan2(Math.cos(k) * a.rz, -Math.sin(k) * a.rx); }
    else if (a.t === 'hang') a.m.position.y = a.y + Math.sin(t * .4 + a.ph) * .08;
    else if (a.t === 'fly') { const k = t * .6 + a.ph; a.m.position.set(a.x + Math.cos(k) * .9, a.y + Math.sin(t * 2 + a.ph) * .25, a.z + Math.sin(k) * .9); a.m.rotation.y = -k - Math.PI / 2;
      for (const w of a.wings) w.rotation.x = (w.name === 'wingL' ? 1 : -1) * Math.sin(t * 16 + a.ph) * .9;
      const gl = a.m.children.find(c => c.name === 'glow'); if (gl) gl.visible = Math.sin(t * 3 + a.ph) > -.3; }
    else if (a.t === 'bug') a.m.rotation.y += Math.sin(t * .7 + a.ph) * .006;
    else if (a.t === 'curator' && px !== undefined) {
      const want = -Math.atan2(pz - ORIGIN.z - a.m.position.z, px - ORIGIN.x - a.m.position.x);
      let d = want - a.m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); a.m.rotation.y += d * .05; a.m.position.y = Math.abs(Math.sin(t * 1.5)) * .03;
    }
  }
}
export function nearestAnchor(x, z) {
  let best = null, bd = 1e9;
  for (const a of museum.anchors) { const d = Math.hypot(a.x - x, a.z - z); if (d < a.r && d < bd) { bd = d; best = a; } }
  return best;
}
export function roomAt(x, z) {
  const lx = x - ORIGIN.x, lz = z - ORIGIN.z;
  for (const [k, r] of Object.entries(ROOMS)) if (lx > r.x0 && lx < r.x1 && lz > r.z0 && lz < r.z1) return k;
  return null;
}
// la caméra doit rester dans la salle du joueur (le hall s'ouvre vers l'entrée)
export function camInside(room, x, z, m = .6) {
  const r = ROOMS[room]; if (!r) return true;
  const lx = x - ORIGIN.x, lz = z - ORIGIN.z;
  return lx > r.x0 + m && lx < r.x1 - m && lz > r.z0 + m && lz < (room === 'hall' ? r.z1 + 14 : r.z1 - m);
}
