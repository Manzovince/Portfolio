// Rapier physics: the machine's static colliders, the kinematic pusher, coins and prizes.
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.12.0/rapier.es.js';
import { S } from './state.js?v=1';

// Lower table top is y=0, the player stands at +z. The pusher's front face slides between pMin and pMax.
export const C = {
  halfW: 4, pTop: 1.2, pDepth: 6, pMin: 0.9, pMax: 3.2, wallZ: -1.2, front: 8.6,
  gutter: 4.4, dropY: 6.3, dropZ: -0.45, gateY: 3.1, gateZ: -0.45,
};

export const KINDS = [
  { name: 'gold', r: 0.5, h: 0.22, value: 1, density: 1 },
  { name: 'star', r: 0.5, h: 0.22, value: 1, density: 1 },
  { name: 'rubis', r: 0.5, h: 0.22, value: 5, density: 1 },
  { name: 'mega', r: 1.0, h: 0.36, value: 15, density: 1.6 },
];

export let R, world;
export const bodies = [];
export const pusher = { phase: 0, z: C.pMin, turbo: 0 };
export const gate = { x: 0, r: 0.7 };
let pusherBody, sideCols = [], bonusCols = [];

export async function initPhysics() {
  await RAPIER.init();
  R = RAPIER;
  world = new R.World({ x: 0, y: -30, z: 0 });
  world.timestep = 1 / 60;

  const fixed = (hx, hy, hz, x, y, z, fr = 0.3) =>
    world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(fr));
  // lower table, running far back under the pusher
  fixed(C.halfW, 0.5, (C.front + 8) / 2, 0, -0.5, (C.front - 8) / 2, 0.35);
  // back wall above the pusher: scrapes coins off its top when it retracts
  const wb = C.pTop + 0.06, wt = 8;
  fixed(C.halfW + 0.5, (wt - wb) / 2, (C.wallZ + 6) / 2, 0, (wt + wb) / 2, (C.wallZ - 6) / 2);

  pusherBody = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(0, C.pTop / 2 + 0.005, C.pMin - C.pDepth / 2));
  world.createCollider(R.ColliderDesc.cuboid(C.halfW - 0.02, C.pTop / 2, C.pDepth / 2).setFriction(0.5), pusherBody);
  setGutter();
}

export const gutterZ = () => C.gutter + 0.55 * S.up.bords;
export const pusherMax = () => C.pMax + 0.35 * S.up.course;

// Side walls stop at the gutter; beyond it coins can slide off the sides and are lost.
export function setGutter() {
  for (const c of sideCols) world.removeCollider(c, false);
  const z0 = -8, z1 = gutterZ();
  sideCols = [-1, 1].map(s => world.createCollider(R.ColliderDesc.cuboid(0.25, 4, (z1 - z0) / 2)
    .setTranslation(s * (C.halfW + 0.25), 4, (z0 + z1) / 2).setFriction(0.2)));
}

export function setBonusWalls(on) {
  for (const c of bonusCols) world.removeCollider(c, false);
  bonusCols = [];
  if (!on) return;
  const z0 = gutterZ() - 0.1, z1 = C.front + 0.1;
  bonusCols = [-1, 1].map(s => world.createCollider(R.ColliderDesc.cuboid(0.25, 1.5, (z1 - z0) / 2)
    .setTranslation(s * (C.halfW + 0.25), 1.5, (z0 + z1) / 2).setFriction(0.2)));
}

function addBody(o, x, y, z, q, ccd) {
  const bd = R.RigidBodyDesc.dynamic().setTranslation(x, y, z)
    .setLinearDamping(0.05).setAngularDamping(0.5).setCcdEnabled(ccd);
  if (q) bd.setRotation(q);
  o.body = world.createRigidBody(bd);
  o.ccd = ccd; o.prevVy = 0; o.prevY = y;
  bodies.push(o);
  return o;
}

// Rapier's true cylinders are ~4× slower to collide than a 12-sided prism hull.
const prisms = [];
function prism(k) {
  if (prisms[k]) return prisms[k];
  const { r, h } = KINDS[k], p = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    p.push(x, h / 2, z, x, -h / 2, z);
  }
  return (prisms[k] = new Float32Array(p));
}

export function spawnCoin(k, x, y, z, q, ccd = true) {
  const K = KINDS[k];
  const o = addBody({ type: 'coin', k }, x, y, z, q, ccd);
  world.createCollider(R.ColliderDesc.convexHull(prism(k))
    .setFriction(0.42).setRestitution(0.12).setDensity(K.density), o.body);
  return o;
}

export function spawnPrize(id, points, x, y, z, q, ccd = true) {
  const o = addBody({ type: 'prize', id }, x, y, z, q, ccd);
  world.createCollider(R.ColliderDesc.convexHull(points)
    .setFriction(0.5).setRestitution(0.1).setDensity(0.7), o.body);
  return o;
}

export function removeAt(i) {
  world.removeRigidBody(bodies[i].body);
  bodies.splice(i, 1);
}

export function step(ev) {
  const dt = world.timestep;
  if (pusher.turbo > 0) pusher.turbo -= dt;
  pusher.phase += dt * Math.PI * 2 / (pusher.turbo > 0 ? 1.4 : 3.2);
  pusher.z = C.pMin + (pusherMax() - C.pMin) * (0.5 - 0.5 * Math.cos(pusher.phase));
  pusherBody.setNextKinematicTranslation({ x: 0, y: C.pTop / 2 + 0.005, z: pusher.z - C.pDepth / 2 });
  world.step();

  for (let i = bodies.length - 1; i >= 0; i--) {
    const o = bodies[i], b = o.body;
    if (b.isSleeping()) continue;
    const p = b.translation(), v = b.linvel();
    if (!o.gated && o.prevY > C.gateY && p.y <= C.gateY && p.z < C.gateZ + 1.2 &&
        Math.hypot(p.x - gate.x, p.z - C.gateZ) < gate.r) {
      o.gated = true;
      ev.gate(o, p);
    }
    if (o.prevVy < -4 && v.y > o.prevVy * 0.4 && p.y > -0.4) {
      ev.land(o, -o.prevVy, p);
      if (o.ccd) { b.enableCcd(false); o.ccd = false; }
    }
    o.prevVy = v.y; o.prevY = p.y;
    // decided as soon as it is clearly over an edge; the body keeps falling out of view
    if (!o.done && p.y < -0.3) {
      if (p.z > C.front - 0.2 && Math.abs(p.x) < C.halfW + 0.8) { o.done = 1; ev.win(o, p); }
      else if (Math.abs(p.x) > C.halfW + 0.05) { o.done = 1; ev.lose(o, p); }
    }
    if (p.y < -2.4) {
      if (!o.done) ev.lose(o, p);
      ev.gone?.(o);
      removeAt(i);
    }
  }
}

// Séisme: everything hops up and forward.
export function quake(power = 1) {
  for (const o of bodies) {
    const b = o.body, m = b.mass();
    b.wakeUp();
    b.applyImpulse({ x: (Math.random() - 0.5) * 2 * m, y: m * (5 + Math.random() * 5) * power, z: m * (2 + Math.random() * 2.5) * power }, true);
    b.applyTorqueImpulse({ x: (Math.random() - 0.5) * m * 0.3, y: 0, z: (Math.random() - 0.5) * m * 0.3 }, true);
  }
}

export function snapshot() {
  const r = n => Math.round(n * 1000) / 1000;
  return {
    phase: r(pusher.phase),
    b: bodies.map(o => {
      const p = o.body.translation(), q = o.body.rotation();
      return [o.type === 'coin' ? o.k : 100 + o.id, r(p.x), r(p.y), r(p.z), r(q.x), r(q.y), r(q.z), r(q.w)];
    }),
  };
}

const flat = () => {
  const a = (Math.random() - 0.5) * 0.15, h = Math.random() * Math.PI;
  return { x: Math.sin(a / 2), y: 0, z: 0, w: Math.cos(a / 2), h };
};

// A fresh machine: one or two layers of coins on both decks.
export function fillBoard(spawnPrizeAt) {
  const lay = (z0, z1, y0, extra) => {
    for (let z = z0, row = 0; z < z1; z += 0.92, row++) {
      for (let x = -C.halfW + 0.55 + (row % 2) * 0.46; x < C.halfW - 0.5; x += 0.96) {
        const j = () => (Math.random() - 0.5) * 0.08;
        spawnCoin(0, x + j(), y0 + 0.13, z + j(), flat(), false);
        if (Math.random() < extra) spawnCoin(0, x + j() + 0.2, y0 + 0.4, z + j(), flat(), false);
      }
    }
  };
  lay(C.pMin + 0.65, C.front - 0.4, 0, 0.55);
  lay(C.wallZ + 0.55, C.pMin - 0.4, C.pTop, 0.3);
  spawnPrizeAt(0, 4.6);
}
