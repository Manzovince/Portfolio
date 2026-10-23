// L'explorateur et son bateau : modèles, marche, nage, navigation, collisions.
import { THREE, scene, Builder, mesh, MAT, modelFrom } from './gfx.js?v=2';
import { H, groundAt, onDeck, obstaclesNear, boxes, DEEP, HALF } from './world.js?v=2';
import { clamp, angDiff, lerp } from './util.js?v=2';

// ---------- modèle du joueur (regarde vers +x) ----------
function limbGroup(parent, pos, build) {
  const piv = new THREE.Group(); piv.position.set(...pos); parent.add(piv);
  const b = new Builder(); build(b); piv.add(mesh(b.merged())); return piv;
}
export function createPlayer() {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const SKIN = '#f8dcc4', SHIRT = '#e9d6a0', b = new Builder();
  // tenue d'exploratrice : short, chemise saharienne, ceinture, foulard, sac à dos
  b.cyl('#6f7d4c', [0, .4, 0], .25, .27, .16); b.cyl(SHIRT, [0, .63, 0], .22, .27, .36);
  b.torus('#7a5634', [0, .48, 0], .26, .025, Math.PI * 2, [Math.PI / 2, 0, 0]);
  for (const z of [-1, 1]) { b.box('#d9c48a', [.22, .66, z * .1], [.04, .1, .09]); b.box('#c9b47a', [.24, .71, z * .1], [.03, .025, .09]); }
  b.torus('#e2574a', [0, .82, 0], .17, .05, Math.PI * 2, [Math.PI / 2, 0, 0]); b.ball('#e2574a', [.17, .8, .05], [.06, .07, .06]); b.cone('#d84a3e', [.19, .72, .06], .05, .12, [0, 0, .3]);
  b.box('#c9714a', [-.3, .66, 0], [.2, .34, .34]); b.box('#b5603e', [-.27, .78, 0], [.2, .1, .36]); b.ball('#e9c46a', [-.41, .62, 0], .035);
  b.cyl('#6a8a5a', [-.3, .87, 0], .08, .08, .38, [Math.PI / 2, 0, 0]);
  // tête : grands yeux brillants, joues roses
  b.ball(SKIN, [0, 1.25, 0], [.47, .43, .46]);
  b.ball('#6a3e24', [-.08, 1.36, 0], [.45, .36, .47]);
  for (const z of [-.18, 0, .18]) b.ball('#6a3e24', [.3, 1.43, z], [.14, .09, .13]);
  for (const z of [-1, 1]) {
    b.ball('#6a3e24', [-.05, 1.12, z * .38], [.16, .26, .11]);
    b.ball('#1d1a1a', [.42, 1.24, z * .16], [.03, .1, .075]); b.ball('#ffffff', [.445, 1.28, z * .145], .024);
    b.ball('#f5a3a0', [.39, 1.12, z * .27], [.025, .045, .07]);
  }
  b.ball('#f0b89a', [.46, 1.17, 0], [.03, .03, .035]); b.ball('#9a4a40', [.44, 1.08, 0], [.015, .015, .04]);
  // casque colonial
  b.cyl('#e8d29a', [0, 1.6, 0], .62, .64, .05, null, 20); b.ball('#e8d29a', [-.02, 1.62, 0], [.37, .26, .37]); b.cyl('#7a5634', [-.02, 1.66, 0], .36, .37, .07, null, 20);
  inner.add(mesh(b.merged()));
  const legs = [-1, 1].map(z => limbGroup(inner, [0, .36, z * .12], b => { b.limb(SKIN, [0, 0, 0], [0, -.25, 0], .07, .065); b.cyl('#f6f1e4', [0, -.24, 0], .07, .07, .06); b.ball('#5a3a26', [.05, -.3, 0], [.13, .07, .09]); }));
  const arms = [-1, 1].map(z => limbGroup(inner, [0, .8, z * .29], b => { b.ball(SHIRT, [0, -.04, 0], .1); b.limb(SKIN, [0, -.05, 0], [0, -.3, 0], .055, .05); b.ball(SKIN, [0, -.34, 0], .07); }));
  // outils, tenus dans la main droite (bras z>0)
  const hand = new THREE.Group(); hand.position.set(0, -.34, 0); arms[1].add(hand);
  const tools = {};
  { const t = new Builder(); t.limb('#9a7044', [0, 0, 0], [1.1, .9, 0], .03); t.torus('#c9c9c9', [1.25, 1.05, 0], .28, .03, Math.PI * 2, [0, Math.PI / 2, -.7]);
    t.part('glass').cone('#ffffff', [1.42, .85, 0], .27, .5, [0, 0, -2.45]); tools.filet = modelFrom(t.geometries()); }
  { const t = new Builder(); t.limb('#7a5634', [0, 0, 0], [1.6, 1.25, 0], .035, .02); t.cyl('#555', [.25, .2, .06], .06, .06, .06, [Math.PI / 2, 0, 0]); tools.canne = modelFrom(t.geometries()); }
  { const t = new Builder(); t.box('#2b2b30', [.2, .1, 0], [.22, .18, .3]); t.cyl('#55565c', [.32, .1, 0], .07, .08, .1, [0, 0, Math.PI / 2]); t.box('#e8e8e8', [.2, .21, .08], [.06, .03, .08]); tools.photo = modelFrom(t.geometries()); }
  for (const [k, m] of Object.entries(tools)) { m.visible = false; hand.add(m); }
  scene.add(g);
  return { g, inner, legs, arms, hand, tools, x: 0, z: 0, y: 0, ry: Math.PI / 2, vx: 0, vz: 0, speed: 0, mode: 'walk', walkT: 0, swing: 0, dive: 0, bob: 0 };
}
export function showTool(p, name) { for (const [k, m] of Object.entries(p.tools)) m.visible = k === name; }

// ---------- bateau (regarde vers +x) ----------
export function createBoat() {
  const b = new Builder();
  b.ball('#c9714a', [0, 0, 0], [1.9, .6, .85]); b.ball('#e3a46a', [0, .05, 0], [1.88, .5, .83]); b.ball('#f2e4c4', [0, .28, 0], [1.6, .1, .62]);
  b.box('#8a5a36', [-.5, .38, 0], [.5, .12, 1.1]); b.box('#8a5a36', [.6, .38, 0], [.4, .12, 1]);
  b.limb('#7a5634', [.2, .2, 0], [.2, 3.6, 0], .07, .05); b.limb('#7a5634', [.2, 1, 0], [-1.4, 1, 0], .04);
  b.ball('#f2f2f2', [1.95, .2, 0], .12);
  b.part('glowSail').geo(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([.25, 1.05, 0, .25, 3.5, 0, -1.35, 1.05, 0], 3)).setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)), '#f6f1e4');
  b.part('glowSail').geo(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([.3, 1.05, 0, .3, 3.3, 0, 1.6, 1.05, 0], 3)).setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)), '#e2574a');
  const g = modelFrom(b.geometries()); scene.add(g);
  return { g, x: 0, z: 0, ry: 0, speed: 0, sail: g.children.find(c => c.name === 'ds') };
}

// ---------- déplacements ----------
const _obs = [];
export function resolveCollisions(p, extra) {
  for (const o of obstaclesNear(p.x, p.z, _obs)) {
    if (p.y > o.y + 2.5) continue;
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + .35;
    if (d < m && d > 1e-4) { p.x = o.x + dx / d * m; p.z = o.z + dz / d * m; }
  }
  const bx = extra ? extra.boxes : boxes;
  for (const b of bx) {
    const x0 = b.x0 - .35, x1 = b.x1 + .35, z0 = b.z0 - .35, z1 = b.z1 + .35;
    if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) {
      const l = p.x - x0, r = x1 - p.x, t = p.z - z0, bo = z1 - p.z, m = Math.min(l, r, t, bo);
      if (m === l) p.x = x0; else if (m === r) p.x = x1; else if (m === t) p.z = z0; else p.z = z1;
    }
  }
  if (extra) for (const o of extra.circles) {
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + .35;
    if (d < m && d > 1e-4) { p.x = o.x + dx / d * m; p.z = o.z + dz / d * m; }
  }
}

// input : {x, z, mag} déjà dans le repère du monde. Retourne un événement éventuel ('deep').
export function stepWalk(p, dt, inp, indoor) {
  let ev = null;
  const swim = p.mode === 'swim';
  const sp = inp.mag < .05 ? 0 : swim ? 3.2 : inp.mag < .6 ? 2.3 : 6.2;
  const tx = inp.x * sp, tz = inp.z * sp;
  p.vx = lerp(p.vx, tx, Math.min(1, dt * 10)); p.vz = lerp(p.vz, tz, Math.min(1, dt * 10));
  if (p.dive > 0 || p.swing > 0 || p.busy) { p.vx *= .2; p.vz *= .2; }
  const ox = p.x, oz = p.z;
  p.x += p.vx * dt; p.z += p.vz * dt;
  if (indoor) { resolveCollisions(p, indoor); p.y = 0; p.mode = 'walk'; }
  else {
    p.x = clamp(p.x, -HALF + 8, HALF - 8); p.z = clamp(p.z, -HALF + 8, HALF - 8);
    if (H(p.x, p.z) < DEEP) { p.x = ox; p.z = oz; p.vx = p.vz = 0; ev = 'deep'; }
    resolveCollisions(p);
    const gnd = groundAt(p.x, p.z);
    if (gnd < -1.05 && !onDeck(p.x, p.z)) { p.mode = 'swim'; p.y = lerp(p.y, -.62, Math.min(1, dt * 6)); }
    else { p.mode = 'walk'; p.y = lerp(p.y, Math.max(gnd, -1.05), Math.min(1, dt * 14)); if (Math.abs(p.y - gnd) > 1.5) p.y = gnd; }
  }
  p.speed = Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-4);
  if (Math.hypot(p.vx, p.vz) > .3) { const want = Math.atan2(p.vz, p.vx); p.ry += angDiff(p.ry, want) * Math.min(1, dt * 12); }
  return ev;
}
export function stepBoat(bt, dt, inp) {
  if (inp.mag > .05) {
    const want = Math.atan2(inp.z, inp.x); bt.ry += clamp(angDiff(bt.ry, want), -1, 1) * dt * 2.2;
    const align = Math.max(0, Math.cos(angDiff(bt.ry, want)));
    bt.speed = lerp(bt.speed, 17 * inp.mag * (.35 + .65 * align), Math.min(1, dt * 1.2));
  } else bt.speed = lerp(bt.speed, 0, Math.min(1, dt * 1.5));
  const nx = bt.x + Math.cos(bt.ry) * bt.speed * dt, nz = bt.z + Math.sin(bt.ry) * bt.speed * dt;
  const ahead = H(nx + Math.cos(bt.ry) * 1.8, nz + Math.sin(bt.ry) * 1.8);
  if (ahead > -1.3 || Math.abs(nx) > HALF - 12 || Math.abs(nz) > HALF - 12) bt.speed = 0;
  else { bt.x = nx; bt.z = nz; }
}

// ---------- animation ----------
export function animatePlayer(p, dt, t) {
  const moving = p.speed > .5 && p.mode !== 'boat';
  p.walkT += dt * (p.speed > 4 ? 11 : 7) * (moving ? 1 : 0);
  const sw = moving ? Math.sin(p.walkT) * (p.speed > 4 ? .8 : .5) : 0;
  p.legs[0].rotation.z = lerp(p.legs[0].rotation.z, sw, .3); p.legs[1].rotation.z = lerp(p.legs[1].rotation.z, -sw, .3);
  let aR = -sw * .8, aL = sw * .8;
  if (p.toolPose === 'filet') aR = p.swing > 0 ? -2.4 + (1 - p.swing / .45) * 3.4 : .5;
  else if (p.toolPose === 'canne') aR = p.casting ? .9 : 1.15;
  else if (p.toolPose === 'photo') { aR = 1.3; aL = 1.3; }
  else if (p.toolPose) aR = .4;
  p.arms[1].rotation.z = lerp(p.arms[1].rotation.z, aR, .35); p.arms[0].rotation.z = lerp(p.arms[0].rotation.z, aL, .35);
  const bounce = moving ? Math.abs(Math.sin(p.walkT)) * .07 : 0;
  let y = p.y + bounce, tilt = 0;
  if (p.mode === 'swim') { y = p.y - .55 + Math.sin(t * 2.2) * .05; tilt = moving ? .5 : .15; p.legs.forEach((l, i) => l.rotation.z = Math.sin(t * 6 + i * 3) * .5); }
  if (p.dive > 0) { const k = Math.sin(clamp(1 - p.dive / 1.4, 0, 1) * Math.PI); y -= k * 1.6; tilt = k * 1.4; }
  if (p.mode === 'boat') { p.legs.forEach(l => l.rotation.z = -1.4); }
  p.g.position.set(p.x, y, p.z); p.g.rotation.y = -p.ry; p.inner.rotation.z = -tilt;
}
export function animateBoat(bt, t, inBoat) {
  bt.g.position.set(bt.x, Math.sin(t * 1.3 + bt.x) * .08 - .05, bt.z);
  bt.g.rotation.set(Math.sin(t * 1.1) * .04, -bt.ry, Math.sin(t * .9) * .03 + (inBoat ? Math.min(.08, bt.speed * .006) : 0));
}
