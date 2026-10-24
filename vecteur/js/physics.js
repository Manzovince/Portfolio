// Ship physics — shared by the game, the AI and the headless sim.
// Controls (Data Wing style): left alone = rotate left, right alone = rotate right,
// both at once = thrust straight ahead. Walls never kill: they slide you and scraping them accelerates.

export const P = {
  TURN: 4.6,        // rad/s while one side is held
  THRUST: 560,      // px/s² while both sides are held
  DRAG0: 0.42,      // linear drag
  DRAG1: 0.00055,   // speed-dependent drag (caps top speed)
  GRIP: 2.6,        // how fast sideways velocity is absorbed
  REDIRECT: 0.7,    // share of the absorbed sideways speed turned into forward speed (wing feel)
  SCRAPE: 820,      // px/s² gained along a wall while sliding on it
  R: 9,             // ship radius
  BOUNCE: 0.12,
};

export function makeShip(x, y, a) {
  return { x, y, a, vx: 0, vy: 0, scrape: 0, cx: 0, cy: 0, nx: 0, ny: 0, thrust: false, turn: 0, idx: 0, hit: 0 };
}

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export { wrap };

// One fixed step. thrustMul lets the AI be slightly weaker or stronger.
export function stepShip(s, L, R, dt, track, thrustMul = 1) {
  s.thrust = L && R;
  s.turn = L && !R ? -1 : R && !L ? 1 : 0;
  s.a = wrap(s.a + s.turn * P.TURN * dt);
  const fx = Math.cos(s.a), fy = Math.sin(s.a);

  if (s.thrust) { s.vx += fx * P.THRUST * thrustMul * dt; s.vy += fy * P.THRUST * thrustMul * dt; }
  if (track.gravity) { s.vx += track.gravity[0] * dt; s.vy += track.gravity[1] * dt; }

  // wing grip: bleed sideways speed, give part of it back forward
  let vf = s.vx * fx + s.vy * fy, vs = -s.vx * fy + s.vy * fx;
  const k = 1 - Math.exp(-P.GRIP * dt);
  const lost = vs * k;
  vs -= lost;
  if (vf > 0) vf += Math.abs(lost) * P.REDIRECT;
  s.vx = vf * fx - vs * fy; s.vy = vf * fy + vs * fx;

  const sp = Math.hypot(s.vx, s.vy);
  const drag = Math.exp(-(P.DRAG0 + P.DRAG1 * sp) * dt);
  s.vx *= drag; s.vy *= drag;

  s.x += s.vx * dt; s.y += s.vy * dt;
  collide(s, track, dt);
  s.scrape = Math.max(0, s.scrape - dt * 6);
  s.hit = Math.max(0, s.hit - dt * 3);
}

const seen = new Uint32Array(1 << 16);
let stamp = 1;

function collide(s, track, dt) {
  const { grid, seg } = track;
  let boosted = false;
  for (let iter = 0; iter < 2; iter++) {
    stamp++;
    const gx = Math.floor((s.x - grid.x0) / grid.cell), gy = Math.floor((s.y - grid.y0) / grid.cell);
    let touched = false;
    for (let j = gy - 1; j <= gy + 1; j++) {
      if (j < 0 || j >= grid.h) continue;
      for (let i = gx - 1; i <= gx + 1; i++) {
        if (i < 0 || i >= grid.w) continue;
        const list = grid.cells[j * grid.w + i];
        if (!list) continue;
        for (const si of list) {
          if (seen[si & 0xffff] === stamp) continue;
          seen[si & 0xffff] = stamp;
          const o = si * 4;
          const ax = seg[o], ay = seg[o + 1], bx = seg[o + 2], by = seg[o + 3];
          const ex = bx - ax, ey = by - ay;
          const l2 = ex * ex + ey * ey;
          let t = l2 ? ((s.x - ax) * ex + (s.y - ay) * ey) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = ax + ex * t, py = ay + ey * t;
          let dx = s.x - px, dy = s.y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 >= P.R * P.R) continue;
          const d = Math.sqrt(d2) || 1e-6;
          let nx = dx / d, ny = dy / d;
          if (d2 === 0) { nx = -ey / Math.sqrt(l2); ny = ex / Math.sqrt(l2); }
          s.x = px + nx * P.R; s.y = py + ny * P.R;
          const vn = s.vx * nx + s.vy * ny;
          if (vn < 0) {
            s.vx -= (1 + P.BOUNCE) * vn * nx; s.vy -= (1 + P.BOUNCE) * vn * ny;
            if (vn < -220) s.hit = 1;
          }
          if (!boosted) {
            const tx = -ny, ty = nx;
            const vt = s.vx * tx + s.vy * ty;
            if (Math.abs(vt) > 40) {
              const sg = Math.sign(vt);
              s.vx += sg * tx * P.SCRAPE * dt; s.vy += sg * ty * P.SCRAPE * dt;
              s.scrape = 1; s.cx = px; s.cy = py; s.nx = nx; s.ny = ny;
              boosted = true;
            }
          }
          touched = true;
        }
      }
    }
    if (!touched) break;
  }
}

// Ship vs ship: soft push so packs jostle without sticking.
export function collideShips(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, m = P.R * 2;
  if (d2 >= m * m || d2 === 0) return false;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, push = (m - d) / 2;
  a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv < 0) {
    const j = -rv * 0.6;
    a.vx -= nx * j; a.vy -= ny * j; b.vx += nx * j; b.vy += ny * j;
  }
  return true;
}

// Track progress: nearest centerline sample near the last known one.
export function updateProgress(s, track) {
  const { cx, cy, n } = track;
  let best = s.idx, bd = Infinity;
  for (let k = -30; k <= 60; k++) {
    const i = (s.idx + k + n) % n;
    const dx = s.x - cx[i], dy = s.y - cy[i], d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = i; }
  }
  // lost (shouldn't happen): full search
  if (bd > (track.hw[best] + 200) ** 2) {
    for (let i = 0; i < n; i++) {
      const dx = s.x - cx[i], dy = s.y - cy[i], d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
  }
  const h = n >> 1, delta = ((best - s.idx + n + h) % n) - h; // signed step, wraps
  s.idx = best;
  // safety net: tunnelled out of the track → put back on the centerline
  if (Math.sqrt(bd) > track.hw[best] + P.R + 40) {
    s.x = cx[best]; s.y = cy[best]; s.vx *= 0.3; s.vy *= 0.3;
  }
  return delta;
}
