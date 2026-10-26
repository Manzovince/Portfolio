// Three-reel slot on the back screen. The outcome is drawn first, the reels are made to land on it.
import { screenTex } from './machine.js?v=1';
import { drawSprite, PAL } from './sprites.js?v=1';
import { S } from './state.js?v=1';
import * as A from './audio.js?v=1';

export const SYM = ['seven', 'coin', 'bell', 'brick', 'bolt', 'gift', 'turbo', 'cherry'];
const TRIPLE = { jackpot: 'seven', pluie: 'coin', mega: 'bell', murs: 'brick', seisme: 'bolt', prix: 'gift', turbo: 'turbo', cerises: 'cherry' };
const W = { none: 34, pair: 18, cerises: 10, pluie: 9, turbo: 7, murs: 7, mega: 5, seisme: 4, prix: 3.5, jackpot: 1.5 };
export const MAX_SPINS = 5;

const N = SYM.length;
const reels = [0, 1, 2].map(() => ({ pos: Math.random() * N, from: 0, to: 0, t0: -1, state: 'idle' }));
export const RL = { spinning: false, onResult: null, onReach: null, t: 0, flash: 0, reach: false, result: null, out: null };

function choose() {
  const L = S.up.chance, w = { ...W };
  w.none -= 6 * L; w.pluie += L; w.mega += L; w.prix += 0.8 * L; w.jackpot += 0.5 * L;
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b);
  for (const k in w) if ((r -= w[k]) < 0) return k;
  return 'none';
}

function faces(out) {
  const ch = SYM.indexOf('cherry'), rnd = () => Math.floor(Math.random() * N);
  if (TRIPLE[out]) { const s = SYM.indexOf(TRIPLE[out]); return [s, s, s]; }
  if (out === 'pair') {
    let x; do x = rnd(); while (x === ch);
    return Math.random() < 0.5 ? [ch, ch, x] : [x, ch, ch];
  }
  // a loss, often teasing a near miss on the first two reels
  for (;;) {
    let f = [rnd(), rnd(), rnd()];
    if (Math.random() < 0.4) { const s = rnd(); f = [s, s, rnd()]; }
    const cherries = f.filter(v => v === ch).length;
    if (f[0] === f[1] && f[1] === f[2]) continue;
    if (cherries >= 2 && !(f[0] !== ch && f[1] !== ch)) continue;
    if (f[1] === ch && f[2] === ch) continue;
    return f;
  }
}

function start() {
  RL.spinning = true;
  RL.out = choose();
  RL.result = faces(RL.out);
  RL.reach = RL.result[0] === RL.result[1];
  RL.t = 0;
  const stops = [0.75, 1.1, RL.reach ? 2.6 : 1.45];
  reels.forEach((r, i) => { r.state = 'spin'; r.stopAt = stops[i]; });
  S.spins--;
  A.whoosh();
}

const easeOutBack = x => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2;

export function update(dt) {
  RL.flash = Math.max(0, RL.flash - dt);
  if (!RL.spinning) {
    if (S.spins > 0) start();
    draw();
    return;
  }
  RL.t += dt;
  let done = true;
  reels.forEach((r, i) => {
    if (r.state === 'spin') {
      const slow = i === 2 && RL.reach && RL.t > 1.45;
      const prev = Math.floor(r.pos);
      r.pos += dt * (slow ? 9 : 22);
      if (Math.floor(r.pos) !== prev) A.tick(slow ? 1.4 : 1);
      if (RL.t >= r.stopAt) {
        r.state = 'stop'; r.from = r.pos; r.t0 = RL.t;
        let to = Math.ceil(r.pos) + 2;
        while (((to % N) + N) % N !== RL.result[i]) to++;
        r.to = to;
        if (i === 1 && RL.reach) RL.onReach?.();
      }
      done = false;
    } else if (r.state === 'stop') {
      const k = Math.min(1, (RL.t - r.t0) / 0.32);
      r.pos = r.from + (r.to - r.from) * easeOutBack(k);
      if (k >= 1) { r.state = 'idle'; r.pos = r.to; A.clack(); }
      else done = false;
    }
  });
  if (done) {
    RL.spinning = false;
    RL.flash = RL.out === 'none' ? 0 : 1.2;
    RL.onResult?.(RL.out, RL.result);
  }
  draw();
}

const X = [7, 35, 63], Y = 10, RW = 26, RH = 32, SH = 26;
let lastDraw = 0;
function draw() {
  const now = performance.now();
  if (!RL.spinning && !RL.flash && now - lastDraw < 120) return;
  lastDraw = now;
  const g = screenTex.userData.ctx, t = now / 1000;
  const flash = RL.flash > 0 && Math.floor(t * 12) % 2;
  g.fillStyle = flash ? '#ffd23f' : '#1a1033';
  g.fillRect(0, 0, 96, 56);
  // chasing dots along the top and bottom
  for (let i = 0; i < 24; i++) {
    const on = (i + Math.floor(t * (RL.spinning ? 20 : 6))) % 3 === 0;
    g.fillStyle = on ? '#ffffff' : flash ? '#f29e1f' : '#6b34c9';
    g.fillRect(2 + i * 4, 3, 2, 2);
  }
  reels.forEach((r, i) => {
    const frame = RL.reach && RL.spinning && i === 2 ? (Math.floor(t * 10) % 2 ? '#ffd23f' : '#ef3e5c') : '#8a8aa8';
    g.fillStyle = frame;
    g.fillRect(X[i] - 2, Y - 2, RW + 4, RH + 4);
    g.fillStyle = '#ffffff';
    g.fillRect(X[i], Y, RW, RH);
    g.fillStyle = '#e4e0f4';
    g.fillRect(X[i], Y, RW, 5); g.fillRect(X[i], Y + RH - 5, RW, 5);
    g.save();
    g.beginPath(); g.rect(X[i], Y, RW, RH); g.clip();
    const base = Math.floor(r.pos), frac = r.pos - base;
    for (let k = -1; k <= 1; k++) {
      const idx = (((base + k) % N) + N) % N;
      const y = Math.round(Y + RH / 2 - 12 + (k - frac) * SH);
      drawSprite(g, SYM[idx], X[i] + 1, y, 2);
    }
    g.restore();
  });
  // payline
  g.fillStyle = RL.flash ? '#ef3e5c' : 'rgba(239,62,92,0.5)';
  g.fillRect(3, Y + RH / 2, 2, 1); g.fillRect(91, Y + RH / 2, 2, 1);
  // stored spins
  for (let i = 0; i < MAX_SPINS; i++) {
    const on = i < S.spins;
    g.fillStyle = on ? (Math.floor(t * 4) % 2 ? '#4ad66d' : '#9cf5b0') : '#3a2a5a';
    g.fillRect(31 + i * 7, 48, 5, 4);
  }
  screenTex.needsUpdate = true;
}

export { PAL };
