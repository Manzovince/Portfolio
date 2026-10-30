'use strict';
// ---------------------------------------------------------------------------
// Shared helpers: hashing / RNG, colour, crisp pixel primitives, pixel font.
// Everything is drawn with fillRect spans so edges stay hard-pixel at any scale.
// ---------------------------------------------------------------------------

function hash3(a, b, c) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function RNG(seed) {
  const f = mulberry(seed);
  return {
    f,
    range: (a, b) => a + (b - a) * f(),
    int: (a, b) => a + Math.floor(f() * (b - a + 1)),
    pick: arr => arr[Math.floor(f() * arr.length)],
    chance: p => f() < p,
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  };
}

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function hsl(h, s, l, a) {
  h = ((h % 360) + 360) % 360;
  return a == null ? `hsl(${h | 0},${s | 0}%,${l | 0}%)` : `hsla(${h | 0},${s | 0}%,${l | 0}%,${a})`;
}

// ---- pixel primitives ------------------------------------------------------

function pxRect(c, x, y, w, h) { c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

function pxCircle(c, cx, cy, r) {
  if (r <= 0.5) { c.fillRect(Math.round(cx - .5), Math.round(cy - .5), 1, 1); return; }
  const r2 = r * r;
  const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
  for (let y = y0; y < y1; y++) {
    const dy = y + .5 - cy;
    const q = r2 - dy * dy;
    if (q <= 0) continue;
    const hw = Math.sqrt(q);
    const xa = Math.round(cx - hw), xb = Math.round(cx + hw);
    if (xb > xa) c.fillRect(xa, y, xb - xa, 1);
  }
}

function pxRing(c, cx, cy, r, w) {
  const r2 = r * r, ri = Math.max(0, r - w), ri2 = ri * ri;
  const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
  for (let y = y0; y < y1; y++) {
    const dy = y + .5 - cy;
    const q = r2 - dy * dy;
    if (q <= 0) continue;
    const hw = Math.sqrt(q);
    const xa = Math.round(cx - hw), xb = Math.round(cx + hw);
    const qi = ri2 - dy * dy;
    if (qi <= 0) { if (xb > xa) c.fillRect(xa, y, xb - xa, 1); continue; }
    const hi = Math.sqrt(qi);
    const ia = Math.round(cx - hi), ib = Math.round(cx + hi);
    if (ia > xa) c.fillRect(xa, y, ia - xa, 1);
    if (xb > ib) c.fillRect(ib, y, xb - ib, 1);
  }
}

const _xs = [];
function pxPoly(c, P) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of P) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  const ys = Math.floor(y0), ye = Math.ceil(y1);
  for (let y = ys; y < ye; y++) {
    const sy = y + .5;
    _xs.length = 0;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const a = P[i], b = P[j];
      if ((a[1] > sy) !== (b[1] > sy)) _xs.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    _xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < _xs.length; k += 2) {
      const xa = Math.round(_xs[k]), xb = Math.round(_xs[k + 1]);
      if (xb > xa) c.fillRect(xa, y, xb - xa, 1);
    }
  }
}

// capsule (rounded segment) with radius r0 at (x0,y0) and r1 at (x1,y1)
function capsulePts(x0, y0, x1, y1, r0, r1, n = 8) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + Math.PI * i / n; pts.push([x0 + Math.cos(t) * r0, y0 + Math.sin(t) * r0]); }
  for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + Math.PI * i / n; pts.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1]); }
  return pts;
}
function pxCapsule(c, x0, y0, x1, y1, r0, r1 = r0) {
  if (r0 < .7 && r1 < .7) { pxLine(c, x0, y0, x1, y1); return; }
  pxPoly(c, capsulePts(x0, y0, x1, y1, r0, r1, r0 > 3 ? 10 : 6));
}

function pxLine(c, x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, guard = 0;
  for (;;) {
    c.fillRect(x0, y0, 1, 1);
    if ((x0 === x1 && y0 === y1) || ++guard > 2000) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}

// cel-shaded disc: outline, base, lower-right shade, highlight
function celBall(c, x, y, r, base, shade, hi, out) {
  c.fillStyle = out; pxCircle(c, x, y, r + 1);
  c.fillStyle = shade; pxCircle(c, x, y, r);
  c.fillStyle = base; pxCircle(c, x - r * .18, y - r * .18, r * .82);
  c.fillStyle = hi; pxCircle(c, x - r * .38, y - r * .4, Math.max(.8, r * .3));
}

// ---- pixel font ------------------------------------------------------------

const GLYPHS = {
  A: ['.##.', '#..#', '####', '#..#', '#..#'], B: ['###.', '#..#', '###.', '#..#', '###.'],
  C: ['.###', '#...', '#...', '#...', '.###'], D: ['###.', '#..#', '#..#', '#..#', '###.'],
  E: ['####', '#...', '###.', '#...', '####'], F: ['####', '#...', '###.', '#...', '#...'],
  G: ['.###', '#...', '#.##', '#..#', '.###'], H: ['#..#', '#..#', '####', '#..#', '#..#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..##', '...#', '...#', '#..#', '.##.'],
  K: ['#..#', '#.#.', '##..', '#.#.', '#..#'], L: ['#...', '#...', '#...', '#...', '####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.##.', '#..#', '#..#', '#..#', '.##.'], P: ['###.', '#..#', '###.', '#...', '#...'],
  Q: ['.##.', '#..#', '#..#', '#.#.', '.#.#'], R: ['###.', '#..#', '###.', '#.#.', '#..#'],
  S: ['.###', '#...', '.##.', '...#', '###.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#..#', '#..#', '#..#', '#..#', '.##.'], V: ['#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#..#', '#..#', '.##.', '#..#', '#..#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['####', '...#', '.##.', '#...', '####'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '.##', '..#', '###'],
  4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'],
  '!': ['#', '#', '#', '.', '#'], '.': ['.', '.', '.', '.', '#'], ',': ['.', '.', '.', '#', '#'],
  ':': ['.', '#', '.', '#', '.'], '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'],
  '?': ['###', '..#', '.##', '...', '.#.'], '/': ['..#', '..#', '.#.', '#..', '#..'],
  "'": ['#', '#', '.', '.', '.'], '(': ['.#', '#.', '#.', '#.', '.#'], ')': ['#.', '.#', '.#', '.#', '#.'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'], '*': ['...', '#.#', '.#.', '#.#', '...'],
  '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '^': ['.#.', '#.#', '...', '...', '...'], '=': ['...', '###', '...', '###', '...'],
  '#': ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'],
  ' ': ['..', '..', '..', '..', '..'],
  '&': ['.##.', '#...', '.#.#', '#.#.', '.#.#'],
  '$': ['.###.', '##.##', '#.#.#', '##.##', '.###.'],     // coin
  '@': ['.#.#.', '#####', '#####', '.###.', '..#..'],     // heart
  '~': ['.###.', '#..##', '#.###', '#####', '.###.'],     // ball
};

function textWidth(s, sc = 1) {
  let w = 0;
  for (const ch of s) { const g = GLYPHS[ch] || GLYPHS['?']; w += (g[0].length + 1) * sc; }
  return Math.max(0, w - sc);
}

const _txtCache = new Map();
function textCanvas(s, col, sc, out) {
  const key = s + '|' + col + '|' + sc + '|' + out;
  let cv = _txtCache.get(key);
  if (cv) return cv;
  if (_txtCache.size > 400) _txtCache.clear();
  const pad = out ? 1 : 0;
  const w = textWidth(s, sc) + pad * 2, h = 5 * sc + pad * 2;
  cv = document.createElement('canvas');
  cv.width = Math.max(1, w); cv.height = h;
  const c = cv.getContext('2d');
  const draw = (ox, oy, colr) => {
    c.fillStyle = colr;
    let x = ox;
    for (const ch of s) {
      const g = GLYPHS[ch] || GLYPHS['?'];
      for (let r = 0; r < 5; r++) for (let k = 0; k < g[r].length; k++) if (g[r][k] === '#') c.fillRect(x + k * sc, oy + r * sc, sc, sc);
      x += (g[0].length + 1) * sc;
    }
  };
  if (out) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) draw(pad + dx, pad + dy, out);
    if (sc > 1) draw(pad + 1, pad + 2, out);
  }
  draw(pad, pad, col);
  _txtCache.set(key, cv);
  return cv;
}

// align: 'l' | 'c' | 'r'
function drawText(c, s, x, y, col = '#fff', sc = 1, align = 'l', out = '#000') {
  s = String(s).toUpperCase();
  const cv = textCanvas(s, col, sc, out);
  const pad = out ? 1 : 0;
  let dx = x - pad;
  if (align === 'c') dx = x - Math.round((cv.width - pad * 2) / 2) - pad;
  else if (align === 'r') dx = x - (cv.width - pad * 2) - pad;
  c.drawImage(cv, Math.round(dx), Math.round(y - pad));
  return cv.width;
}

function fmtScore(n) {
  n = Math.floor(n);
  const s = String(n);
  let o = '';
  for (let i = 0; i < s.length; i++) { if (i && (s.length - i) % 3 === 0) o += ','; o += s[i]; }
  return o;
}
function fmtShort(n) {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

// ---- 8x8 item icons -------------------------------------------------------

const ICON_COLS = { k: '#120a1c', w: '#ffffff', s: '#a8b4c8', d: '#5a6478', r: '#ff3b5c', o: '#ff8a1f', y: '#ffd93b', g: '#4cff7a', b: '#3bb0ff', c: '#7af2ff', p: '#c45bff', m: '#ff5bd1' };
const ICONS = {
  multi: ['.kkk....', 'kwsdk...', 'kssdkkk.', '.kkkwsdk', 'kkk.kssk', 'kwsdkkk.', 'kssdk...', '.kkk....'],
  magnet: ['kkk..kkk', 'kwk..kwk', 'krk..krk', 'krk..krk', 'krkkkkrk', 'krrrrrrk', '.krrrrk.', '..kkkk..'],
  giant: ['..kkkk..', '.kwwssk.', 'kwwsssdk', 'kwsssddk', 'kssssddk', 'ksssdddk', '.kddddk.', '..kkkk..'],
  slow: ['kkkkkkkk', '.kcccck.', '..kcck..', '...kk...', '...kk...', '..kcck..', '.kcccck.', 'kkkkkkkk'],
  shield: ['kkkkkkkk', 'kbbwbbbk', 'kbwbbbbk', 'kbbbbbbk', '.kbbbbk.', '.kbbbbk.', '..kbbk..', '...kk...'],
  fire: ['...k....', '..kok...', '..kook..', '.kooyok.', '.koyyok.', 'kooyyook', 'koyyyyok', '.kkkkkk.'],
  coinrain: ['..kkkk..', '.kyyyyk.', 'kyywwyyk', 'kyywyyyk', 'kyyyyyok', 'kyyyyook', '.kyoook.', '..kkkk..'],
  saver: ['.kk..kk.', 'krrkkrrk', 'krwrrrrk', 'krrrrrrk', '.krrrrk.', '..krrk..', '...kk...', '........'],
};
const ITEM_INFO = {
  multi: { name: 'MULTIBALL', desc: '+2 BALLS', col: '#a8b4c8' },
  magnet: { name: 'COIN MAGNET', desc: 'PULLS COINS', col: '#ff3b5c' },
  giant: { name: 'GIANT BALL', desc: 'X2 POINTS', col: '#c8d4e8' },
  slow: { name: 'BULLET TIME', desc: 'SLOW MOTION', col: '#7af2ff' },
  shield: { name: 'DRAIN SHIELD', desc: 'NO DRAINS', col: '#3bb0ff' },
  fire: { name: 'FIREBALL', desc: 'X3 + SMASH', col: '#ff8a1f' },
  coinrain: { name: 'COIN RAIN', desc: 'MAKE IT RAIN', col: '#ffd93b' },
  saver: { name: 'GUARDIAN', desc: 'BALL SAVE 20S', col: '#ff5bd1' },
};
const ITEM_KEYS = Object.keys(ITEM_INFO);

const _iconCache = {};
function iconCanvas(key, sc = 1) {
  const k = key + sc;
  if (_iconCache[k]) return _iconCache[k];
  const rows = ICONS[key];
  const cv = document.createElement('canvas');
  cv.width = 8 * sc; cv.height = 8 * sc;
  const c = cv.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const ch = rows[y][x];
    if (ch === '.' || !ICON_COLS[ch]) continue;
    c.fillStyle = ICON_COLS[ch];
    c.fillRect(x * sc, y * sc, sc, sc);
  }
  return (_iconCache[k] = cv);
}
