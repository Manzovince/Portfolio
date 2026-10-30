'use strict';
// ---------------------------------------------------------------------------
// Procedural boards. The world is an infinite grid of tables; edges between
// neighbouring cells are hashed so both sides agree on which exits exist:
//   hole (down, y+1)  <->  elevator (up, y-1)      doorL (x-1) <-> doorR (x+1)
// Column x=0 always has a vertical shaft so the world is endless.
// ---------------------------------------------------------------------------

const W = 180, BH = 336;
const ARCH_CY = 80, ARCH_RX = 82, ARCH_RY = 72;
const FLIP = {
  L: { px: 58, py: 288, len: 26, r0: 4.5, r1: 2.6, rest: 0.5, up: -0.45, side: 1 },
  R: { px: 122, py: 288, len: 26, r0: 4.5, r1: 2.6, rest: Math.PI - 0.5, up: Math.PI + 0.45, side: -1 },
};
const CANNON = { x: 90, y: 300 };

function vEdge(seed, x, y) { if (x === 0) return true; return hash3(x * 7 + 1, y * 13 + 5, seed ^ 0xa5a5) % 100 < 60; }
function hEdge(seed, x, y) {
  const h = hash3(x * 11 + 3, y * 17 + 9, seed ^ 0x5151);
  if (h % 100 >= 55) return 0;
  return 112 + (h >>> 9) % 76;
}
function boardExits(seed, gx, gy) {
  return { up: vEdge(seed, gx, gy - 1), down: vEdge(seed, gx, gy), left: hEdge(seed, gx - 1, gy), right: hEdge(seed, gx, gy) };
}

// ---- themes -----------------------------------------------------------------

const BANDS = [
  { name: 'SKY', h: 205, nouns: ['CLOUDS', 'SKYPORT', 'AERIE', 'ZEPPELIN', 'SUMMIT', 'KITE'], minor: false, tempo: 118 },
  { name: 'ARCADE', h: 262, nouns: ['ARCADE', 'DINER', 'MOTEL', 'ALLEY', 'CASINO', 'GARAGE'], minor: true, tempo: 128 },
  { name: 'NEON', h: 312, nouns: ['STRIP', 'BOULEVARD', 'DISCO', 'METRO', 'CLUB', 'MALL'], minor: true, tempo: 134 },
  { name: 'JUNGLE', h: 138, nouns: ['TEMPLE', 'GROVE', 'RUINS', 'CANOPY', 'IDOL', 'SWAMP'], minor: false, tempo: 124 },
  { name: 'DUNES', h: 36, nouns: ['PYRAMID', 'OASIS', 'BAZAAR', 'TOMB', 'MIRAGE', 'SPHINX'], minor: true, tempo: 120 },
  { name: 'MAGMA', h: 8, nouns: ['FORGE', 'CRATER', 'FURNACE', 'CORE', 'VENT', 'FOUNDRY'], minor: true, tempo: 140 },
  { name: 'FROST', h: 192, nouns: ['GLACIER', 'CAVERN', 'PALACE', 'TUNDRA', 'VAULT', 'FJORD'], minor: false, tempo: 116 },
  { name: 'VOID', h: 0, nouns: ['NEBULA', 'ABYSS', 'RIFT', 'ORBIT', 'QUASAR', 'ECLIPSE'], minor: true, tempo: 146 },
];
const ADJ = ['NEON', 'COSMIC', 'RUSTY', 'ROYAL', 'TURBO', 'LUCKY', 'HOLLOW', 'ELECTRIC', 'SUNKEN', 'CRYSTAL', 'STATIC', 'VELVET',
  'ATOMIC', 'PHANTOM', 'CANDY', 'IRON', 'GOLDEN', 'WILD', 'SILENT', 'HYPER', 'LOST', 'SPIRAL', 'MIDNIGHT', 'RADIANT', 'FERAL'];

function bandFor(gy) {
  if (gy < 0) return BANDS[0];
  if (gy === 0) return BANDS[1];
  if (gy <= 2) return BANDS[2];
  if (gy <= 4) return BANDS[3];
  if (gy <= 6) return BANDS[4];
  if (gy <= 8) return BANDS[5];
  if (gy <= 10) return BANDS[6];
  return BANDS[7];
}

function makeTheme(gx, gy, R) {
  const band = bandFor(gy);
  let h = band.h + (((gx * 29) % 50) + 50) % 50 - 25;
  if (band.name === 'VOID') h = (gy * 47 + gx * 83) % 360;
  const sky = band.name === 'SKY';
  const bl = sky ? 30 : 15;
  const ah = h + R.pick([150, 180, 200, 165]);
  const bh = h + R.pick([90, 110, -90, 60]);
  const ch = h + R.pick([45, -45, 30, 60]);
  return {
    h, band,
    frame: hsl(h + 20, 30, 20), frameLo: hsl(h + 20, 35, 11), frameHi: hsl(h + 20, 30, 34),
    bg0: hsl(h, 45, bl - 5), bg1: hsl(h, 42, bl), bg2: hsl(h, 46, bl + 7), bg3: hsl(h, 50, bl + 14),
    wall: hsl(h + 30, 28, 62), wallHi: hsl(h + 30, 40, 84), wallLo: hsl(h + 30, 30, 38),
    out: hsl(h, 60, 5),
    a1: hsl(ah, 88, 58), a1hi: hsl(ah, 95, 78), a1lo: hsl(ah, 70, 36),
    a2: hsl(bh, 85, 56), a2hi: hsl(bh, 95, 76), a2lo: hsl(bh, 70, 34),
    a3: hsl(ch, 92, 60), a3hi: hsl(ch, 95, 80), a3lo: hsl(ch, 70, 36),
    rubber: hsl(h, 15, 90), metal: hsl(h, 10, 66), metalHi: hsl(h, 15, 88), metalLo: hsl(h, 12, 36),
    ramp: hsl(bh + 20, 70, 50), rampHi: hsl(bh + 20, 85, 75), rampLo: hsl(bh + 20, 60, 28),
    shadow: 'rgba(0,0,0,.33)',
    pattern: R.pick(['grid', 'dots', 'checker', 'diag', 'stars', 'waves', 'hex', 'rays']),
    emblem: R.pick(['sun', 'star', 'rings', 'eye', 'diamond', 'spiral']),
  };
}

// ---- generation ---------------------------------------------------------------

function genBoard(seed, gx, gy) {
  const R = RNG(hash3(gx * 3 + 17, gy * 5 + 29, seed));
  const depth = Math.abs(gy) + Math.abs(gx) * .5;
  const ex = boardExits(seed, gx, gy);
  const B = {
    gx, gy, depth, seed: hash3(gx, gy, seed),
    segs: [], circles: [], occ: [],
    walls: [], slings: [], posts: [],
    bumpers: [], banks: [], splitters: [], lanes: [], spinners: [], ramps: [], saucers: [], coins: [], pickups: [],
    exits: [], movers: [], windmills: [], deco: [],
    stats: { bump: 0, bank: 0, lanes: 0, ramp: 0, spin: 0, saucer: 0, coin: 0 },
    visited: false, laneDone: 0,
  };
  B.theme = makeTheme(gx, gy, R);
  let nm;
  for (let k = 0; k < 6; k++) { nm = R.pick(ADJ) + ' ' + R.pick(B.theme.band.nouns); if (textWidth(nm) <= 104) break; }
  B.name = nm;

  const seg = (x1, y1, x2, y2, r = 2, e = .45, kind = 'wall', ref = null) => {
    const s = { x1, y1, x2, y2, r, e, kind, ref, on: true }; B.segs.push(s); return s;
  };
  const chain = (pts, r, e, kind) => { for (let i = 0; i + 1 < pts.length; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r, e, kind); };
  const circ = (x, y, r, e, kind, ref) => { const c = { x, y, r, e, kind, ref, vx: 0, vy: 0 }; B.circles.push(c); return c; };
  const occ = (x, y, r) => B.occ.push({ x, y, r });
  const inField = (x, y, r) => {
    if (x - r < 11 || x + r > 169 || y - r < 10 || y + r > 214) return false;
    if (y < ARCH_CY) { const a = (x - 90) / (ARCH_RX - 4 - r), b = (y - ARCH_CY) / (ARCH_RY - 4 - r); if (a * a + b * b > 1) return false; }
    return true;
  };
  const isFree = (x, y, r) => { if (!inField(x, y, r)) return false; for (const o of B.occ) if (dist(x, y, o.x, o.y) < r + o.r) return false; return true; };
  const place = (r, x0, x1, y0, y1, tries = 80) => {
    for (let i = 0; i < tries; i++) { const x = R.range(x0, x1), y = R.range(y0, y1); if (isFree(x, y, r)) return { x, y }; }
    return null;
  };
  const toward = (x, y, tx = 90, ty = 290) => { const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };

  // ---- frame ----
  const fp = [[8, BH]];
  if (ex.left) fp.push([8, ex.left + 9], [1, ex.left + 9], [1, ex.left - 9], [8, ex.left - 9]);
  fp.push([8, ARCH_CY]);
  const AN = 28;
  for (let i = 1; i < AN; i++) { const a = Math.PI + Math.PI * i / AN; fp.push([90 + ARCH_RX * Math.cos(a), ARCH_CY + ARCH_RY * Math.sin(a)]); }
  fp.push([172, ARCH_CY]);
  if (ex.right) fp.push([172, ex.right - 9], [179, ex.right - 9], [179, ex.right + 9], [172, ex.right + 9]);
  fp.push([172, BH]);
  B.framePts = fp;
  chain(fp, 2, .4, 'wall');

  // ---- lower playfield (mirrored) ----
  for (const s of [1, -1]) {
    const X = x => s > 0 ? x : 180 - x;
    const divider = [[X(22), 232], [X(22), BH]];
    const floor = [[X(22), 254], [X(55), 283]];
    seg(divider[0][0], divider[0][1], divider[1][0], divider[1][1], 2, .4);
    seg(floor[0][0], floor[0][1], floor[1][0], floor[1][1], 2, .3);
    B.walls.push({ pts: [[X(22), 232], [X(22), 256]] }, { pts: floor });
    B.posts.push({ x: X(22), y: 231, r: 2.6 });
    circ(X(22), 231, 2.6, .7, 'post');
    const T = [X(36), 224], Bo = [X(36), 250], Ri = [X(52), 262];
    seg(T[0], T[1], Bo[0], Bo[1], 2, .4);
    seg(Bo[0], Bo[1], Ri[0], Ri[1], 2, .4);
    const sl = { pts: [T, Bo, Ri], kick: [T, Ri], flash: 0, side: s };
    seg(T[0], T[1], Ri[0], Ri[1], 2.2, .6, 'sling', sl);
    B.slings.push(sl);
    B.deco.push({ kind: 'apron', pts: [[X(23), 256], [X(55), 285], [X(60), 294], [X(69), BH], [X(23), BH]] });
  }

  // ---- top: elevator / lanes ----
  const laneSet = xs => {
    for (const x of xs) { B.lanes.push({ x, y: 33, lit: false, flash: 0 }); occ(x, 33, 12); }
  };
  const guide = (x) => { seg(x, 26, x, 41, 1.6, .5); B.walls.push({ pts: [[x, 26], [x, 41]], thin: true }); B.posts.push({ x, y: 26, r: 2 }); circ(x, 26, 2, .6, 'post'); };
  if (ex.up) {
    const e = { type: 'elev', x: 90, y: 22, to: [gx, gy - 1] };
    seg(82, 40, 82, 6, 2, .4); seg(98, 40, 98, 6, 2, .4);
    B.walls.push({ pts: [[82, 40], [82, 9]] }, { pts: [[98, 40], [98, 9]] });
    e.bar = seg(82, 40, 98, 40, 2, .5, 'bar', e);
    B.exits.push(e);
    occ(90, 30, 16);
    if (R.chance(.6)) { [47, 73, 107, 133].forEach(guide); laneSet([60, 120]); }
  } else if (R.chance(.8)) {
    [51, 77, 103, 129].forEach(guide); laneSet([64, 90, 116]);
  }
  if (ex.left) { const e = { type: 'doorL', x: 4, y: ex.left, to: [gx - 1, gy] }; e.bar = seg(8, ex.left - 9, 8, ex.left + 9, 2, .5, 'bar', e); B.exits.push(e); occ(16, ex.left, 18); }
  if (ex.right) { const e = { type: 'doorR', x: 176, y: ex.right, to: [gx + 1, gy] }; e.bar = seg(172, ex.right - 9, 172, ex.right + 9, 2, .5, 'bar', e); B.exits.push(e); occ(164, ex.right, 18); }
  occ(29, 204, 10); occ(151, 204, 10);   // ramp landing pads above the inlanes

  // ---- hole ----
  if (ex.down) {
    const p = place(19, 30, 150, 128, 200) || place(17, 24, 156, 100, 205) || { x: 90, y: 196 };
    B.exits.push({ type: 'hole', x: p.x, y: p.y, to: [gx, gy + 1] });
    occ(p.x, p.y, 19);
  }

  // ---- ramps ----
  const nRamps = R.chance(.75) ? (R.chance(.35) ? 2 : 1) : 0;
  const sides = R.shuffle(['L', 'R']);
  for (let i = 0; i < nRamps; i++) {
    const m = place(16, 30, 150, 96, 186);
    if (!m) break;
    let [fx, fy] = toward(m.x, m.y, 90, 300); fx = -fx; fy = -fy;          // faces away from flippers
    const tx = -fy, ty = fx, hw = 7;
    const g1 = [m.x + tx * hw, m.y + ty * hw], g2 = [m.x - tx * hw, m.y - ty * hw];
    const b1 = [g1[0] + fx * 12, g1[1] + fy * 12], b2 = [g2[0] + fx * 12, g2[1] + fy * 12];
    seg(g1[0], g1[1], b1[0], b1[1], 1.8, .4, 'lip'); seg(g2[0], g2[1], b2[0], b2[1], 1.8, .4, 'lip'); seg(b1[0], b1[1], b2[0], b2[1], 1.8, .3, 'lip');
    const side = nRamps === 2 ? sides[i] : (m.x > 90 ? 'L' : 'R');
    const sx = side === 'L' ? 21 : 159, exx = side === 'L' ? 29 : 151;
    const p1 = [clamp(m.x + fx * 34, 22, 158), Math.max(34, m.y + fy * 34)];
    const ctrl = [[m.x + fx * 3, m.y + fy * 3], p1, [lerp(p1[0], sx, .6), 30], [sx, 64], [sx, 150], [exx, 194], [exx, 214]];
    const pts = catmull(ctrl, 1.5);
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dist(pts[k][0], pts[k][1], pts[k - 1][0], pts[k - 1][1]));
    const ramp = { x: m.x, y: m.y, fx, fy, tx, ty, hw, g1, g2, b1, b2, pts, cum, L: cum[cum.length - 1], side, flash: 0, count: 0 };
    B.ramps.push(ramp);
    occ(m.x + fx * 6, m.y + fy * 6, 17);
  }

  // ---- loops: overhead ring, the ball circles and comes back out of the mouth ----
  if (R.chance(.5)) {
    const LR = 14;
    for (let tries = 0; tries < 40; tries++) {
      const m = place(15, 30, 150, 110, 196, 1);
      if (!m) continue;
      let [fx, fy] = toward(m.x, m.y, 90, 300); fx = -fx; fy = -fy;
      const cx = m.x + fx * (13 + LR), cy = m.y + fy * (13 + LR);
      if (!inField(cx, cy, LR + 5) || cy < 40) continue;
      const tx = -fy, ty = fx, hw = 7;
      const g1 = [m.x + tx * hw, m.y + ty * hw], g2 = [m.x - tx * hw, m.y - ty * hw];
      const b1 = [g1[0] + fx * 12, g1[1] + fy * 12], b2 = [g2[0] + fx * 12, g2[1] + fy * 12];
      seg(g1[0], g1[1], b1[0], b1[1], 1.8, .4, 'lip'); seg(g2[0], g2[1], b2[0], b2[1], 1.8, .4, 'lip'); seg(b1[0], b1[1], b2[0], b2[1], 1.8, .3, 'lip');
      const dir = R.pick([1, -1]);
      const pts = [];
      for (let d = 3; d <= 13; d += 1.5) pts.push([m.x + fx * d, m.y + fy * d]);
      const a0 = Math.atan2(-fy, -fx);
      const N = 48;
      for (let k = 1; k <= N; k++) { const a = a0 + dir * Math.PI * 2 * k / N; pts.push([cx + Math.cos(a) * LR, cy + Math.sin(a) * LR]); }
      for (let d = 11.5; d >= -1; d -= 1.5) pts.push([m.x + fx * d, m.y + fy * d]);
      const cum = [0];
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dist(pts[k][0], pts[k][1], pts[k - 1][0], pts[k - 1][1]));
      const lead = 10, circ = Math.PI * 2 * LR;
      B.ramps.push({ kind: 'loop', x: m.x, y: m.y, fx, fy, tx, ty, hw, g1, g2, b1, b2, pts, cum, L: cum[cum.length - 1],
        cStart: lead, cEnd: lead + circ, circ, cx, cy, lr: LR, side: m.x < 90 ? 'L' : 'R', flash: 0, count: 0 });
      occ(m.x + fx * 6, m.y + fy * 6, 16);
      occ(cx, cy, LR + 3);
      break;
    }
  }

  // ---- split pads: duplicate the ball ----
  if (R.chance(.55)) {
    const c = place(9, 26, 154, 70, 206);
    if (c) { B.splitters.push({ x: c.x, y: c.y, cool: 0, flash: 0 }); occ(c.x, c.y, 9); }
  }

  // ---- bumpers ----
  const cluster = (n, y0, y1) => {
    const br = R.pick([7, 8, 8, 9]);
    const cr = [0, 0, 14, 16, 19, 23][n];
    const c = place(cr + br + 7, 30, 150, y0, y1);
    if (!c) return false;
    const rot = R.range(0, Math.PI * 2);
    for (let i = 0; i < n; i++) {
      const a = rot + Math.PI * 2 * i / n;
      const x = c.x + Math.cos(a) * cr, y = c.y + Math.sin(a) * cr;
      const b = { x, y, r: br, flash: 0, squash: 0, cool: 0 };
      B.bumpers.push(b);
      circ(x, y, br, .5, 'bumper', b);
    }
    occ(c.x, c.y, cr + br + 7);
    return true;
  };
  if (!cluster(R.pick([3, 3, 3, 4, 5]), 56, 150)) cluster(2, 50, 200);
  if (R.chance(.4)) cluster(R.pick([1, 2]), 50, 200);

  // ---- target banks ----
  const nBanks = R.chance(.85) ? (R.chance(.3) ? 2 : 1) : 0;
  for (let i = 0; i < nBanks; i++) {
    const n = R.int(3, 5), span = n * 10;
    const c = place(span / 2 + 8, 24, 156, 60, 202);
    if (!c) break;
    const [fx, fy] = toward(c.x, c.y);
    const tx = -fy, ty = fx;
    const kind = R.chance(.62) ? 'drop' : 'stand';
    const bank = { kind, targets: [], clears: 0, resetT: 0, x: c.x, y: c.y, fx, fy };
    for (let k = 0; k < n; k++) {
      const o = (k - (n - 1) / 2) * 10;
      const x = c.x + tx * o, y = c.y + ty * o;
      const t = { x, y, tx, ty, fx, fy, down: false, lit: false, flash: 0, bank, anim: 0 };
      t.seg = seg(x - tx * 4, y - ty * 4, x + tx * 4, y + ty * 4, 2.2, .35, kind, t);
      bank.targets.push(t);
    }
    B.banks.push(bank);
    occ(c.x, c.y, span / 2 + 8);
  }

  // ---- spinner ----
  if (R.chance(.55)) {
    const c = place(13, 26, 154, 44, 196);
    if (c) {
      const [fx, fy] = toward(c.x, c.y);
      const tx = -fy, ty = fx;
      for (const s of [1, -1]) { const x = c.x + tx * 8 * s, y = c.y + ty * 8 * s; B.posts.push({ x, y, r: 2, metal: true }); circ(x, y, 2, .5, 'post'); }
      B.spinners.push({ x: c.x, y: c.y, tx, ty, fx, fy, ang: 0, spin: 0, acc: 0 });
      occ(c.x, c.y, 13);
    }
  }

  // ---- saucer ----
  if (R.chance(.5)) {
    const c = place(12, 24, 156, 50, 204);
    if (c) { B.saucers.push({ x: c.x, y: c.y, hold: 0, ball: null, flash: 0, cool: 0 }); occ(c.x, c.y, 12); }
  }

  // ---- movers & windmills (deeper boards) ----
  if (depth >= 2 && R.chance(Math.min(.8, .3 + depth * .06))) {
    const c = place(26, 30, 150, 50, 196);
    if (c) {
      const horiz = R.chance(.6);
      const m = { cx: c.x, cy: c.y, ax: horiz ? 16 : 0, ay: horiz ? 0 : 14, ph: R.range(0, 6), spd: R.range(1.2, 2.2), r: 6, flash: 0 };
      m.circle = circ(c.x, c.y, 6, .5, 'mover', m);
      B.movers.push(m); occ(c.x, c.y, 26);
    }
  }
  if (depth >= 4 && R.chance(Math.min(.7, .2 + depth * .04))) {
    const c = place(20, 30, 150, 50, 196);
    if (c) { B.windmills.push({ x: c.x, y: c.y, len: 12, ang: R.range(0, 3), w: R.pick([-1, 1]) * R.range(2, 3.4), prev: 0 }); occ(c.x, c.y, 20); }
  }

  // ---- deflectors / rubber posts ----
  const nDef = R.int(0, 3);
  for (let i = 0; i < nDef; i++) {
    if (R.chance(.5)) {
      const c = place(8, 20, 160, 40, 206);
      if (c) { B.posts.push({ x: c.x, y: c.y, r: 3 }); circ(c.x, c.y, 3, .75, 'post'); occ(c.x, c.y, 9); }
    } else {
      const c = place(13, 20, 160, 40, 206);
      if (c) {
        const a = R.range(0, Math.PI), l = R.range(7, 10);
        const p = [[c.x - Math.cos(a) * l, c.y - Math.sin(a) * l], [c.x + Math.cos(a) * l, c.y + Math.sin(a) * l]];
        seg(p[0][0], p[0][1], p[1][0], p[1][1], 2, .65, 'rubber');
        B.walls.push({ pts: p, rubber: true });
        occ(c.x, c.y, 13);
      }
    }
  }

  // ---- item capsule ----
  if (R.chance(.38)) {
    const c = place(7, 20, 160, 24, 190);
    if (c) { B.pickups.push({ kind: 'item', x: c.x, y: c.y, item: R.pick(ITEM_KEYS), t: R.range(0, 6), taken: false, static: true }); occ(c.x, c.y, 7); }
  }

  // ---- coins ----
  const groups = R.int(2, 4);
  for (let gI = 0; gI < groups; gI++) {
    const c = place(5, 20, 160, 26, 206);
    if (!c) continue;
    const n = R.int(3, 5), a = R.range(0, Math.PI * 2), arc = R.chance(.4) ? R.range(-.5, .5) : 0;
    let x = c.x, y = c.y, ang = a;
    for (let k = 0; k < n; k++) {
      if (isFree(x, y, 4)) { B.coins.push({ x, y, val: 1, taken: false, respawn: 0, ph: R.range(0, 6) }); occ(x, y, 4); }
      x += Math.cos(ang) * 9; y += Math.sin(ang) * 9; ang += arc;
    }
  }
  if (R.chance(.55)) {
    const c = place(6, 30, 150, 20, 70);
    if (c) { B.coins.push({ x: c.x, y: c.y, val: 5, taken: false, respawn: 0, ph: 0 }); occ(c.x, c.y, 6); }
  }
  for (const rp of B.ramps) {
    const fr = rp.kind === 'loop' ? [(rp.cStart + rp.circ * .5) / rp.L] : [.32, .44, .56];
    for (const f of fr) {
      const s = rp.L * f;
      const p = pathAt(rp, s);
      B.coins.push({ x: p[0], y: p[1], val: 1, taken: false, respawn: 0, ph: f * 10, ramp: rp, s });
    }
  }

  // ---- exit requirements ----
  const opts = [];
  if (B.bumpers.length) opts.push({ k: 'bump', n: R.int(6, 12), label: 'BUMPS' });
  if (B.banks.length) opts.push({ k: 'bank', n: 1, label: B.banks[0].kind === 'drop' ? 'DROPS' : 'TARGETS' });
  if (B.lanes.length) opts.push({ k: 'lanes', n: 1, label: 'LANES' });
  if (B.ramps.length) opts.push({ k: 'ramp', n: R.int(1, 2), label: B.ramps.every(r => r.kind === 'loop') ? 'LOOPS' : 'RAMPS' });
  if (B.spinners.length) opts.push({ k: 'spin', n: R.int(12, 24), label: 'SPINS' });
  if (B.saucers.length) opts.push({ k: 'saucer', n: 1, label: 'SAUCER' });
  if (B.coins.filter(c => !c.ramp).length >= 8) opts.push({ k: 'coin', n: R.int(4, 6), label: 'COINS' });
  R.shuffle(opts);
  B.exits.forEach((e, i) => {
    e.open = false; e.anim = 0; e.flash = 0;
    if (!opts.length || R.chance(.28)) e.req = null;
    else e.req = opts[i % opts.length];
    if (!e.req) e.open = true;
  });
  if (gx === 0 && gy === 0) {
    for (const e of B.exits) { if (e.type === 'hole' && B.bumpers.length) { e.req = { k: 'bump', n: 5, label: 'BUMPS' }; e.open = false; } }
  }
  for (const e of B.exits) if (e.bar) e.bar.on = !e.open;

  B.music = { seed: B.seed, tempo: B.theme.band.tempo + Math.min(20, depth * 1.5), minor: B.theme.band.minor };
  renderStatic(B);
  return B;
}

function catmull(P, step) {
  const out = [];
  const p = [P[0], ...P, P[P.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
    const segLen = dist(p1[0], p1[1], p2[0], p2[1]);
    const n = Math.max(2, Math.ceil(segLen / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
}

function pathAt(rp, s) {
  const { pts, cum } = rp;
  s = clamp(s, 0, rp.L);
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m; else hi = m; }
  const t = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  const a = pts[lo], b = pts[hi];
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
  return [a[0] + dx * t, a[1] + dy * t, dx / d, dy / d];
}

// ---- static art -----------------------------------------------------------------

function dither(c, a, b) {
  const cv = document.createElement('canvas'); cv.width = 2; cv.height = 2;
  const x = cv.getContext('2d');
  x.fillStyle = a; x.fillRect(0, 0, 2, 2);
  x.fillStyle = b; x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1);
  return c.createPattern(cv, 'repeat');
}

function drawWallLine(c, pts, T, thin, rubber) {
  const ro = thin ? 2.4 : 2.8, rm = thin ? 1.4 : 1.8;
  c.fillStyle = T.out;
  for (let i = 0; i + 1 < pts.length; i++) pxCapsule(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], ro);
  c.fillStyle = rubber ? T.a2 : T.wall;
  for (let i = 0; i + 1 < pts.length; i++) pxCapsule(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], rm);
  c.fillStyle = rubber ? T.a2hi : T.wallHi;
  for (let i = 0; i + 1 < pts.length; i++) pxLine(c, pts[i][0] - .5, pts[i][1] - .5, pts[i + 1][0] - .5, pts[i + 1][1] - .5);
}

function renderStatic(B) {
  const T = B.theme;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = BH;
  const c = cv.getContext('2d');
  const R = RNG(B.seed ^ 0x77);

  // cabinet frame
  c.fillStyle = T.frame; c.fillRect(0, 0, W, BH);
  c.fillStyle = dither(c, T.frame, T.frameLo);
  for (let y = 0; y < BH; y += 6) c.fillRect(0, y, W, 2);

  // playfield with pattern, masked by the frame polygon
  const pf = document.createElement('canvas'); pf.width = W; pf.height = BH;
  const p = pf.getContext('2d');
  p.fillStyle = T.bg1; p.fillRect(0, 0, W, BH);
  drawPattern(p, T, R);
  drawEmblem(p, T, R);
  p.globalCompositeOperation = 'destination-in';
  p.fillStyle = '#000';
  pxPoly(p, [...B.framePts, [172, BH], [8, BH]]);
  p.globalCompositeOperation = 'source-over';
  c.drawImage(pf, 0, 0);

  // edge occlusion (dither band along the frame)
  c.fillStyle = dither(c, 'rgba(0,0,0,0)', 'rgba(0,0,0,.35)');
  for (let i = 0; i + 1 < B.framePts.length; i++) { const a = B.framePts[i], b = B.framePts[i + 1]; pxCapsule(c, a[0], a[1], b[0], b[1], 6); }

  // ramp shadows
  c.fillStyle = T.shadow;
  for (const rp of B.ramps) for (let k = 0; k < rp.pts.length; k += 3) pxCircle(c, rp.pts[k][0] + 4, rp.pts[k][1] + 5, 5);

  // shadows of static solids
  c.fillStyle = T.shadow;
  for (const w of B.walls) for (let i = 0; i + 1 < w.pts.length; i++) pxCapsule(c, w.pts[i][0] + 2, w.pts[i][1] + 3, w.pts[i + 1][0] + 2, w.pts[i + 1][1] + 3, 2.4);
  for (const s of B.slings) pxPoly(c, s.pts.map(q => [q[0] + 2, q[1] + 3]));
  for (const q of B.posts) pxCircle(c, q.x + 2, q.y + 3, q.r + 1);
  for (const b of B.bumpers) pxCircle(c, b.x + 2, b.y + 3, b.r + 1);
  for (const bk of B.banks) for (const t of bk.targets) pxCapsule(c, t.x - t.tx * 4 + 2, t.y - t.ty * 4 + 3, t.x + t.tx * 4 + 2, t.y + t.ty * 4 + 3, 2.4);

  // lane rollover inserts
  for (const l of B.lanes) {
    c.fillStyle = T.out; pxPoly(c, [[l.x, l.y - 5], [l.x + 4, l.y], [l.x, l.y + 5], [l.x - 4, l.y]]);
    c.fillStyle = T.a3lo; pxPoly(c, [[l.x, l.y - 4], [l.x + 3, l.y], [l.x, l.y + 4], [l.x - 3, l.y]]);
  }

  // saucers
  for (const s of B.saucers) {
    c.fillStyle = T.out; pxCircle(c, s.x, s.y, 7);
    c.fillStyle = T.metalLo; pxCircle(c, s.x, s.y, 6);
    c.fillStyle = '#000'; pxCircle(c, s.x + .5, s.y + .5, 4.5);
    c.fillStyle = T.metalHi; pxRing(c, s.x, s.y, 6, 1);
  }

  // holes (well)
  for (const e of B.exits) if (e.type === 'hole') {
    c.fillStyle = T.out; pxCircle(c, e.x, e.y, 11);
    c.fillStyle = T.metal; pxCircle(c, e.x, e.y, 10);
    c.fillStyle = T.metalHi; pxRing(c, e.x - .5, e.y - .5, 10, 1);
    c.fillStyle = '#05020a'; pxCircle(c, e.x, e.y, 7.5);
  }

  // door alcoves and elevator shaft interiors
  for (const e of B.exits) {
    if (e.type === 'doorL' || e.type === 'doorR') {
      const x0 = e.type === 'doorL' ? 0 : 172;
      c.fillStyle = '#05020a'; c.fillRect(x0, e.y - 9, 8, 18);
      c.fillStyle = T.a3lo; for (let k = 0; k < 3; k++) c.fillRect(x0 + 2, e.y - 6 + k * 5, 4, 2);
    }
    if (e.type === 'elev') {
      c.fillStyle = '#05020a'; c.fillRect(83, 8, 14, 32);
      c.fillStyle = T.a3lo;
      for (let k = 0; k < 3; k++) { const y = 14 + k * 8; pxPoly(c, [[90, y], [94, y + 4], [86, y + 4]]); }
    }
  }

  // inner walls
  for (const w of B.walls) drawWallLine(c, w.pts, T, w.thin, w.rubber);

  // slingshots
  for (const s of B.slings) {
    const [a, b, d] = s.pts;
    c.fillStyle = T.out;
    for (const [u, v] of [[a, b], [b, d], [d, a]]) pxCapsule(c, u[0], u[1], v[0], v[1], 3);
    pxPoly(c, s.pts);
    c.fillStyle = T.wallLo;
    pxPoly(c, s.pts);
    const cx = (a[0] + b[0] + d[0]) / 3, cy = (a[1] + b[1] + d[1]) / 3;
    c.fillStyle = T.a1lo; pxPoly(c, s.pts.map(q => [lerp(q[0], cx, .35), lerp(q[1], cy, .35)]));
    c.fillStyle = T.a1; pxPoly(c, s.pts.map(q => [lerp(q[0], cx, .55) - .6, lerp(q[1], cy, .55) - .6]));
    c.fillStyle = T.wall; pxCapsule(c, a[0], a[1], b[0], b[1], 1.6); pxCapsule(c, b[0], b[1], d[0], d[1], 1.6);
  }

  // posts
  for (const q of B.posts) {
    if (q.metal) celBall(c, q.x, q.y, q.r, T.metal, T.metalLo, T.metalHi, T.out);
    else celBall(c, q.x, q.y, q.r, T.rubber, T.a2, '#fff', T.out);
  }

  // drop-target slots
  for (const bk of B.banks) for (const t of bk.targets) {
    c.fillStyle = '#05020a';
    pxCapsule(c, t.x - t.tx * 4 + t.fx * 2, t.y - t.ty * 4 + t.fy * 2, t.x + t.tx * 4 + t.fx * 2, t.y + t.ty * 4 + t.fy * 2, 1);
  }

  // frame rim
  c.fillStyle = T.out;
  for (let i = 0; i + 1 < B.framePts.length; i++) { const a = B.framePts[i], b = B.framePts[i + 1]; pxCapsule(c, a[0], a[1], b[0], b[1], 3); }
  c.fillStyle = T.frameHi;
  for (let i = 0; i + 1 < B.framePts.length; i++) { const a = B.framePts[i], b = B.framePts[i + 1]; pxCapsule(c, a[0], a[1], b[0], b[1], 1.8); }
  c.fillStyle = T.wallHi;
  for (let i = 0; i + 1 < B.framePts.length; i++) { const a = B.framePts[i], b = B.framePts[i + 1]; pxLine(c, a[0], a[1], b[0], b[1]); }

  // apron
  for (const d of B.deco) if (d.kind === 'apron') {
    c.fillStyle = T.out; pxPoly(c, d.pts.map(q => [q[0], q[1] - 1]));
    c.fillStyle = T.frame; pxPoly(c, d.pts.map(q => [q[0] + (q[0] < 90 ? 0 : 0), q[1] + 1]));
    c.fillStyle = dither(c, T.frame, T.frameLo);
    pxPoly(c, d.pts.map(q => [q[0], q[1] + 4]));
  }
  // cannon pit
  c.fillStyle = T.out; c.fillRect(74, 306, 32, BH - 306);
  c.fillStyle = T.frameLo; c.fillRect(75, 307, 30, BH - 307);
  c.fillStyle = dither(c, T.frameLo, T.out); c.fillRect(75, 318, 30, BH - 318);
  drawText(c, B.name.split(' ')[0], 40, 316, T.frameHi, 1, 'c', T.out);
  drawText(c, B.name.split(' ').slice(1).join(' '), 140, 316, T.frameHi, 1, 'c', T.out);
  drawText(c, `${B.gx},${B.gy}`, 90, 326, T.a3, 1, 'c', T.out);

  B.cv = cv;

  // ---- overlay (ramps sit above the balls) ----
  const ov = document.createElement('canvas'); ov.width = W; ov.height = BH;
  const o = ov.getContext('2d');
  if (B.ramps.length) {
    const fl = document.createElement('canvas'); fl.width = W; fl.height = BH;
    const f = fl.getContext('2d');
    for (const rp of B.ramps) {
      f.fillStyle = T.rampLo;
      for (let k = 0; k < rp.pts.length; k += 2) pxCircle(f, rp.pts[k][0], rp.pts[k][1], 6);
      f.fillStyle = T.ramp;
      for (let k = 0; k < rp.pts.length; k += 2) pxCircle(f, rp.pts[k][0], rp.pts[k][1], 4.5);
      f.fillStyle = dither(f, T.ramp, T.rampLo);
      for (let k = 0; k < rp.pts.length; k += 2) pxCircle(f, rp.pts[k][0] + 1, rp.pts[k][1] + 1, 2.5);
    }
    o.globalAlpha = .62; o.drawImage(fl, 0, 0); o.globalAlpha = 1;
    for (const rp of B.ramps) {
      const L = [], Rr = [];
      for (let k = 0; k < rp.pts.length; k += 2) {
        const q = pathAt(rp, rp.cum[k]);
        L.push([q[0] - q[3] * 6, q[1] + q[2] * 6]); Rr.push([q[0] + q[3] * 6, q[1] - q[2] * 6]);
      }
      for (const rail of [L, Rr]) {
        o.fillStyle = T.out; for (let k = 0; k + 1 < rail.length; k++) pxCapsule(o, rail[k][0], rail[k][1], rail[k + 1][0], rail[k + 1][1], 1.3);
        o.fillStyle = T.rampHi; for (let k = 0; k + 1 < rail.length; k++) pxLine(o, rail[k][0], rail[k][1], rail[k + 1][0], rail[k + 1][1]);
      }
      // entrance flap
      o.fillStyle = T.out; pxCapsule(o, rp.b1[0], rp.b1[1], rp.b2[0], rp.b2[1], 2.4);
      drawWallLine(o, [rp.g1, rp.b1], T, true); drawWallLine(o, [rp.g2, rp.b2], T, true);
      o.fillStyle = T.rampHi; pxCapsule(o, rp.b1[0], rp.b1[1], rp.b2[0], rp.b2[1], 1.2);
    }
  }
  B.over = ov;
}

function drawPattern(p, T, R) {
  switch (T.pattern) {
    case 'grid':
      p.fillStyle = T.bg2;
      for (let x = 2; x < W; x += 12) p.fillRect(x, 0, 1, BH);
      for (let y = 4; y < BH; y += 12) p.fillRect(0, y, W, 1);
      break;
    case 'dots':
      p.fillStyle = T.bg2;
      for (let y = 2; y < BH; y += 6) for (let x = (y / 6 % 2) * 3; x < W; x += 6) p.fillRect(x, y, 1, 1);
      break;
    case 'checker':
      p.fillStyle = T.bg0;
      for (let y = 0; y < BH; y += 10) for (let x = (y / 10 % 2) * 10; x < W; x += 20) p.fillRect(x, y, 10, 10);
      break;
    case 'diag':
      p.fillStyle = T.bg2;
      for (let k = -BH; k < W; k += 9) for (let y = 0; y < BH; y++) p.fillRect(k + y * .6 | 0, y, 3, 1);
      break;
    case 'stars':
      for (let i = 0; i < 220; i++) { p.fillStyle = R.chance(.2) ? T.bg3 : T.bg2; p.fillRect(R.int(0, W), R.int(0, BH), 1, 1); }
      p.fillStyle = T.bg3;
      for (let i = 0; i < 14; i++) { const x = R.int(4, W - 4), y = R.int(4, BH - 4); p.fillRect(x - 1, y, 3, 1); p.fillRect(x, y - 1, 1, 3); }
      break;
    case 'waves':
      p.fillStyle = T.bg2;
      for (let y = 4; y < BH; y += 8) for (let x = 0; x < W; x++) p.fillRect(x, y + Math.round(Math.sin(x / 6 + y) * 2), 1, 1);
      break;
    case 'hex':
      p.fillStyle = T.bg2;
      for (let y = 0; y < BH; y += 10) for (let x = ((y / 10) % 2) * 9; x < W; x += 18) { p.fillRect(x, y, 6, 1); p.fillRect(x - 2, y + 5, 1, 1); }
      break;
    case 'rays': {
      p.fillStyle = T.bg2;
      const cx = 90, cy = 160;
      for (let a = 0; a < 24; a += 2) {
        const a0 = a / 24 * Math.PI * 2, a1 = (a + 1) / 24 * Math.PI * 2;
        pxPoly(p, [[cx, cy], [cx + Math.cos(a0) * 400, cy + Math.sin(a0) * 400], [cx + Math.cos(a1) * 400, cy + Math.sin(a1) * 400]]);
      }
      break;
    }
  }
  // faint bottom glow toward flippers
  p.fillStyle = dither(p, 'rgba(0,0,0,0)', T.bg2);
  p.fillRect(0, 250, W, 3); p.fillRect(0, 262, W, 2); p.fillRect(0, 272, W, 1);
}

function drawEmblem(p, T, R) {
  const cx = 90, cy = 168, r = R.int(28, 38);
  p.fillStyle = T.bg0; pxCircle(p, cx, cy, r + 3);
  p.fillStyle = T.bg2; pxRing(p, cx, cy, r, 2);
  p.fillStyle = T.bg3;
  switch (T.emblem) {
    case 'sun': for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pxCapsule(p, cx + Math.cos(a) * r * .45, cy + Math.sin(a) * r * .45, cx + Math.cos(a) * r * .8, cy + Math.sin(a) * r * .8, 1.2); } pxCircle(p, cx, cy, r * .32); break;
    case 'star': { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI * 2, rr = i % 2 ? r * .35 : r * .8; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } pxPoly(p, pts); break; }
    case 'rings': pxRing(p, cx, cy, r * .7, 2); pxRing(p, cx, cy, r * .42, 2); pxCircle(p, cx, cy, r * .15); break;
    case 'eye': pxPoly(p, [[cx - r * .8, cy], [cx, cy - r * .45], [cx + r * .8, cy], [cx, cy + r * .45]]); p.fillStyle = T.bg0; pxCircle(p, cx, cy, r * .28); p.fillStyle = T.bg3; pxCircle(p, cx - 2, cy - 2, 2); break;
    case 'diamond': pxPoly(p, [[cx, cy - r * .8], [cx + r * .55, cy], [cx, cy + r * .8], [cx - r * .55, cy]]); p.fillStyle = T.bg1; pxPoly(p, [[cx, cy - r * .45], [cx + r * .3, cy], [cx, cy + r * .45], [cx - r * .3, cy]]); break;
    case 'spiral': for (let i = 0; i < 80; i++) { const a = i * .25, rr = i / 80 * r * .85; pxCircle(p, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.3); } break;
  }
}
