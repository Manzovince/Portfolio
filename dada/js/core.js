'use strict';
// ---------- helpers ----------
const rnd = n => Math.floor(Math.random() * n);
const d6 = () => 1 + rnd(6);
const pick = a => a[rnd(a.length)];
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const easeOut = k => 1 - (1 - k) * (1 - k);
const easeInOut = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const easeOutBack = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

// Every animation and pause goes through this list, so the whole game can be
// sped up (Tw.speed), slowed for hit-stop (Tw.slow) or frozen on quit (Tw.clear).
const Tw = {
  list: [], speed: 1, slow: 1,
  add(dur, fn = () => {}, ease) {
    return new Promise(res => this.list.push({ t: 0, dur: Math.max(1, dur), fn, res, ease }));
  },
  update(dt) {
    const l = this.list;
    for (let i = 0; i < l.length; i++) {
      const w = l[i];
      w.t += dt;
      const k = Math.min(1, w.t / w.dur);
      w.fn(w.ease ? w.ease(k) : k);
      if (k >= 1) { l.splice(i, 1); i--; w.res(); }
    }
  },
  clear() { this.list = []; },
};
const wait = ms => Tw.add(ms);

// ---------- board geometry (15x15 cells of 16px, 8px frame) ----------
const CELL = 16, M = 8, BW = CELL * 15 + M * 2; // 256
const OUT = '#1a1c2c';
const COLORS = [
  { nom: 'Rouge', ia: 'IA Rouge', d: '#7a1f33', b: '#d8394f', l: '#ff8f7f', t: '#fbd3cc', base: [0, 0] },
  { nom: 'Vert', ia: 'IA Verte', d: '#1c6a44', b: '#33b862', l: '#a7f070', t: '#d6f3c8', base: [9, 0] },
  { nom: 'Jaune', ia: 'IA Jaune', d: '#a8561a', b: '#f2b230', l: '#ffe58a', t: '#fdf0c4', base: [9, 9] },
  { nom: 'Bleu', ia: 'IA Bleue', d: '#1f2f7a', b: '#3b6fd9', l: '#7fd0ff', t: '#d2e2fa', base: [0, 9] },
];
const START = [0, 13, 26, 39];
const TRACK = (() => {
  const t = [], add = (c, r) => t.push([c, r]);
  for (let c = 1; c <= 5; c++) add(c, 6);
  for (let r = 5; r >= 0; r--) add(6, r);
  add(7, 0);
  for (let r = 0; r <= 5; r++) add(8, r);
  for (let c = 9; c <= 14; c++) add(c, 6);
  add(14, 7);
  for (let c = 14; c >= 9; c--) add(c, 8);
  for (let r = 9; r <= 14; r++) add(8, r);
  add(7, 14);
  for (let r = 14; r >= 9; r--) add(6, r);
  for (let c = 5; c >= 0; c--) add(c, 8);
  add(0, 7); add(0, 6);
  return t;
})();
const HOME = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const REFUGE = new Set([8, 21, 34, 47]); // star squares (not the coloured starts): coins for passing or stopping
const LAST = 50, FIN = 56; // rel 0..50 track, 51..55 home column, 56 arrived
const FINPT = [[M + 96 + 13, M + 120], [M + 120, M + 96 + 13], [M + 144 - 13, M + 120], [M + 120, M + 144 - 13]];
const SLOTS = [[30, 30], [66, 30], [30, 66], [66, 66]];

const absOf = (c, rel) => (START[c] + rel) % 52;
const cellPx = (c, r) => ({ x: M + c * CELL + 8, y: M + r * CELL + 8 });
// Pixel point where a pawn's feet stand.
function posOf(c, k, rel) {
  if (rel < 0) { const [bx, by] = COLORS[c].base; const s = SLOTS[k]; return { x: M + bx * CELL + s[0], y: M + by * CELL + s[1] + 2 }; }
  if (rel <= LAST) { const [cx, cy] = TRACK[absOf(c, rel)]; const p = cellPx(cx, cy); p.y += 3; return p; }
  if (rel < FIN) { const [cx, cy] = HOME[c][rel - 51]; const p = cellPx(cx, cy); p.y += 3; return p; }
  return { x: FINPT[c][0], y: FINPT[c][1] + 3 };
}

// ---------- special squares, dice, shop ----------
const SPECIALS = {
  coin: { nom: 'Pièces', fill: '#ffe48a', desc: '+3 pièces' },
  coffre: { nom: 'Coffre', fill: '#dca26a', desc: 'Un dé spécial' },
  chance: { nom: 'Chance', fill: '#b48cff', desc: 'Bonne ou mauvaise surprise' },
  piege: { nom: 'Piège', fill: '#4e4160', desc: 'Recule de 3' },
  turbo: { nom: 'Turbo', fill: '#ff9d57', desc: 'Avance de 4' },
  portal: { nom: 'Portail', fill: '#272a5c', desc: 'Saute au portail suivant' },
  peage: { nom: 'Péage', fill: '#ffb3a7', desc: 'Paie le propriétaire' },
};
const ENTRY = new Set([11, 24, 37, 50]); // squares that turn into a home column stay plain
const DICE = {
  dore: { nom: 'Dé Doré', desc: 'Choisis ton nombre, de 1 à 6.', prix: 7 },
  turbo: { nom: 'Dé Turbo', desc: 'Lance 2 dés et additionne-les. Un 1 ou un 6 permet de sortir.', prix: 4 },
  bis: { nom: 'Dé Bis', desc: 'Lance 2 dés : deux déplacements séparés.', prix: 5 },
  maudit: { nom: 'Dé Maudit', desc: 'À offrir : le prochain lancer de la cible la fait reculer.', prix: 5, give: true },
  escargot: { nom: 'Dé Escargot', desc: 'À offrir : la cible ne fera que 1 à 3 et ne pourra pas sortir.', prix: 3, give: true },
};
// Tiles: a player places them on an empty square; they carry the owner's colour.
const TILES = {
  tpiege: { nom: 'Tuile Piège', desc: "Pose-la sur une case libre : l'adversaire qui s'y arrête recule de 3.", prix: 3, tile: 'piege' },
  tpeage: { nom: 'Tuile Péage', desc: "Pose-la sur une case libre : l'adversaire qui s'y arrête te paie 4 pièces.", prix: 4, tile: 'peage' },
  tturbo: { nom: 'Tuile Turbo', desc: "Pose-la devant tes chevaux : celui qui s'y arrête avance de 4.", prix: 3, tile: 'turbo' },
};
const ITEM = k => DICE[k] || TILES[k];
const SHOP = Object.assign({}, DICE, TILES, {
  sortie: { nom: 'Sortie Express', desc: 'Un cheval de ton écurie part tout de suite sur sa case de départ.', prix: 4 },
});
const MAXDICE = 4;
const DIE_SCHEMES = {
  normal: { body: '#f4f4f4', shade: '#9fb3c8', pip: OUT },
  dore: { body: '#ffd56b', shade: '#e0892e', pip: '#6b3010' },
  turbo: { body: '#ff9a4d', shade: '#c4502a', pip: OUT },
  bis: { body: '#a7e8ff', shade: '#4f9ccf', pip: OUT },
  maudit: { body: '#6b2f7a', shade: '#3d1748', pip: '#ff6d7c' },
  escargot: { body: '#b7f27e', shade: '#38a85c', pip: OUT },
};

// ---------- sprites ----------
function sprite(rows, pal) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, i) => { const col = pal[ch]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } }));
  return c;
}
function silhouette(spr, color) {
  const c = document.createElement('canvas'); c.width = spr.width; c.height = spr.height;
  const x = c.getContext('2d'); x.drawImage(spr, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
const flipH = rows => rows.map(r => [...r].reverse().join(''));
const transpose = rows => rows[0].split('').map((_, i) => rows.map(r => r[i]).join(''));

const HORSE = [
  '....oo......',
  '...omoo.....',
  '..ommbbo....',
  '.ommbbbkbo..',
  '.omlbbbbbbo.',
  'omllbbbbbbbo',
  'omlbbbdooooo',
  'omlbbbo.....',
  'oolbbbbo....',
  '.olbbbbo....',
  '.oddddddo...',
  'olllbbbbdo..',
  'oddddddddddo',
  '.oooooooooo.',
];
const ICONS = {
  coin: ['..oooooo..', '.oyyyyyyo.', 'oyllyyyyYo', 'oylyYYyyYo', 'oylyYyyyYo', 'oyyyYyyyYo', 'oyyyYYyYYo', 'oyyyyyyYYo', '.oYYYYYYo.', '..oooooo..'],
  chest: ['..........', '.oooooooo.', 'obbbbbbbbo', 'obBBBBBBbo', 'oooooooooo', 'obbbggbbbo', 'obbbgobbbo', 'obbbbbbbbo', 'oBBBBBBBBo', '.oooooooo.'],
  quest: ['..oooooo..', '.owwwwwwo.', 'owwoooowwo', '.oo...owwo', '....oowwo.', '...owwoo..', '...owwo...', '....oo....', '...owwo...', '....oo....'],
  skull: ['..oooooo..', '.owwwwwwo.', 'owwwwwwwwo', 'owoowwoowo', 'owoowwoowo', 'owwwwwwwwo', '.owwwowwo.', '..owowowo.', '..oooooo..', '..........'],
  arrow: ['..........', 'oo...oo...', 'owo..owo..', '.owo..owo.', '..owo..owo', '..owo..owo', '.owo..owo.', 'owo..owo..', 'oo...oo...', '..........'],
  star: ['....oo....', '...owwo...', 'oooowwoooo', 'owwwwwwwwo', '.owwwwwwo.', '..owwwwo..', '.owwoowwo.', '.owo..owo.', '.oo....oo.', '..........'],
  peage: ['..........', '.oooooooo.', 'orrwwrrwwo', 'orrwwrrwwo', '.oooooooo.', '..o....o..', '..o....o..', '..o....o..', '.ooo..ooo.', '..........'],
  crown: ['o..o..o..o', 'ooowooowoo', 'oyoyoyoyyo', 'oyyyyyyyyo', 'oyrryyrryo', 'oyyyyyyyyo', 'oooooooooo'],
};
const ICON_PAL = { o: OUT, y: '#ffcd75', Y: '#e08a2e', l: '#fff6c2', w: '#f4f4f4', b: '#b0703c', B: '#6e3d1c', g: '#ffd84a', r: '#d8394f', k: OUT };
const SYMBOLS = {
  plus: ['..##..', '..##..', '######', '######', '..##..', '..##..'],
  minus: ['......', '......', '######', '######', '......', '......'],
  star: ['..##..', '..##..', '######', '.####.', '.#..#.', '##..##'],
  snail: ['.####.', '#....#', '#.##.#', '#.#..#', '#..###', '.#....'],
};

const PX = { horse: [], horseW: null, icons: {}, arrows: {}, diceIcon: {}, iconURL: {} };
function buildSprites() {
  COLORS.forEach((C, i) => {
    PX.horse[i] = sprite(HORSE, { o: OUT, k: OUT, b: C.b, l: C.l, d: C.d, m: C.d });
  });
  PX.horseW = silhouette(PX.horse[0], '#ffffff');
  PX.horseK = silhouette(PX.horse[0], OUT);
  for (const k in ICONS) PX.icons[k] = sprite(ICONS[k], ICON_PAL);
  PX.icons.starC = sprite(ICONS.star, { o: OUT, w: '#ffffff' });
  const right = ICONS.arrow, down = transpose(right);
  PX.arrows = {
    r: sprite(right, ICON_PAL), l: sprite(flipH(right), ICON_PAL),
    d: sprite(down, ICON_PAL), u: sprite(down.slice().reverse(), ICON_PAL),
  };
  for (const k of [...Object.keys(DIE_SCHEMES), 'sortie']) {
    const c = document.createElement('canvas'); c.width = 18; c.height = 18;
    drawDieIcon(c.getContext('2d'), k);
    PX.diceIcon[k] = c; PX.iconURL[k] = c.toDataURL();
  }
  PX.iconURL.coin = PX.icons.coin.toDataURL();
  PX.iconURL.horse = PX.horse.map(h => h.toDataURL());
}

// Pixel die: 16x16 with rounded corners, bottom shade, 2x2 pips.
const PIPS = { 1: [[7, 7]], 2: [[4, 4], [10, 10]], 3: [[4, 4], [7, 7], [10, 10]], 4: [[4, 4], [10, 4], [4, 10], [10, 10]], 5: [[4, 4], [10, 4], [4, 10], [10, 10], [7, 7]], 6: [[4, 4], [10, 4], [4, 7], [10, 7], [4, 10], [10, 10]] };
function drawDieBody(ctx, x, y, s, sch) {
  ctx.fillStyle = OUT;
  ctx.fillRect(x + 1, y, s - 2, s); ctx.fillRect(x, y + 1, s, s - 2);
  ctx.fillStyle = sch.shade;
  ctx.fillRect(x + 2, y + 1, s - 4, s - 2); ctx.fillRect(x + 1, y + 2, s - 2, s - 4);
  ctx.fillStyle = sch.body;
  ctx.fillRect(x + 2, y + 1, s - 4, s - 4); ctx.fillRect(x + 1, y + 2, s - 2, s - 5);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillRect(x + 2, y + 2, s > 16 ? 3 : 2, 1);
}
// size 16 (icons) or 23 (the big die on the board): 3x3 pips on a 5/10/15 grid
const BIG = { 4: 5, 7: 10, 10: 15 };
function drawDie(ctx, x, y, val, kind = 'normal', size = 16) {
  const sch = DIE_SCHEMES[kind] || DIE_SCHEMES.normal;
  x = Math.round(x); y = Math.round(y);
  drawDieBody(ctx, x, y, size, sch);
  ctx.fillStyle = sch.pip;
  for (const [px, py] of PIPS[Math.abs(val)] || []) {
    if (size === 16) ctx.fillRect(x + px, y + py - 1, 2, 2);
    else ctx.fillRect(x + BIG[px], y + BIG[py] - 2, 3, 3);
  }
  if (val < 0) { ctx.fillStyle = sch.pip; ctx.fillRect(x - 5, y + 6, 4, 2); }
}
function drawSymbol(ctx, rows, x, y, col) {
  ctx.fillStyle = col;
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') ctx.fillRect(x + i, y + j, 1, 1); }));
}
function drawDieIcon(ctx, kind) {
  ctx.clearRect(0, 0, 18, 18);
  if (kind === 'sortie') {
    drawDieBody(ctx, 1, 1, 16, { body: '#a7f070', shade: '#38b764' });
    ctx.drawImage(PX.horse[1] || sprite(HORSE, { o: OUT, k: OUT, b: '#33b862', l: '#a7f070', d: '#1c6a44', m: '#1c6a44' }), 3, 2);
    return;
  }
  if (kind === 'bis') {
    drawDieBody(ctx, 0, 0, 12, DIE_SCHEMES.bis);
    drawDieBody(ctx, 6, 6, 12, DIE_SCHEMES.bis);
    ctx.fillStyle = OUT; ctx.fillRect(5, 4, 2, 2); ctx.fillRect(11, 10, 2, 2);
    return;
  }
  const sch = DIE_SCHEMES[kind];
  drawDieBody(ctx, 1, 1, 16, sch);
  const sym = { dore: 'star', turbo: 'plus', maudit: 'minus', escargot: 'snail' }[kind];
  if (sym) drawSymbol(ctx, SYMBOLS[sym], 6, 5, sch.pip);
  else { ctx.fillStyle = sch.pip; for (const [px, py] of PIPS[5]) ctx.fillRect(1 + px, py, 2, 2); }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, a = Math.abs(amt);
  r = Math.round(r + (f - r) * a); g = Math.round(g + (f - g) * a); b = Math.round(b + (f - b) * a);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ---------- chiptune sound ----------
const SFX = {
  ctx: null, on: true, master: null, noiseBuf: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = .45; this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * .5; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  tone(f, d, { type = 'square', v = .1, slide = 0, at = 0 } = {}) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + at, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + d + .02);
  },
  noise(d, { v = .2, f = 1200, at = 0 } = {}) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + at, s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; fl.type = 'lowpass'; fl.frequency.value = f;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(fl).connect(g).connect(this.master); s.start(t); s.stop(t + d + .02);
  },
  seq(notes, step = .08, opts = {}) { notes.forEach((f, i) => f && this.tone(f, step * 1.6, Object.assign({}, opts, { at: i * step }))); },
  play(n, x = 0) {
    switch (n) {
      case 'tick': this.tone(500 + Math.random() * 500, .03, { v: .05 }); break;
      case 'dice': this.noise(.08, { v: .3, f: 900 }); this.tone(110, .12, { type: 'triangle', v: .25 }); break;
      case 'hop': this.tone(260 + x * 25, .06, { slide: 180, v: .06 }); break;
      case 'land': this.tone(150, .09, { type: 'triangle', slide: -60, v: .2 }); break;
      case 'exit': this.seq([392, 523, 659, 784], .06, { v: .08 }); break;
      case 'capture': this.noise(.35, { v: .45, f: 700 }); this.tone(420, .4, { type: 'sawtooth', slide: -360, v: .12 }); break;
      case 'coin': this.tone(988, .06, { v: .08 }); this.tone(1319, .18, { v: .08, at: .06 }); break;
      case 'chest': this.seq([523, 659, 784, 1047, 1319], .05, { type: 'triangle', v: .14 }); break;
      case 'bad': this.tone(330, .3, { type: 'sawtooth', slide: -220, v: .1 }); this.tone(247, .35, { type: 'square', slide: -150, v: .06, at: .12 }); break;
      case 'good': this.seq([523, 659, 784], .07, { v: .08 }); break;
      case 'portal': this.tone(180, .5, { type: 'sine', slide: 1200, v: .18 }); this.tone(360, .5, { type: 'triangle', slide: 900, v: .06, at: .05 }); break;
      case 'turbo': this.tone(180, .35, { slide: 900, v: .08 }); this.noise(.25, { v: .12, f: 3000 }); break;
      case 'finish': this.seq([523, 659, 784, 1047, 0, 784, 1047], .07, { v: .09 }); break;
      case 'win': this.seq([523, 523, 523, 659, 0, 587, 659, 0, 784, 0, 1047, 1047], .1, { v: .1 }); this.seq([131, 0, 0, 165, 0, 147, 165, 0, 196, 0, 262], .1, { type: 'triangle', v: .18 }); break;
      case 'market': this.seq([784, 659, 784, 1047, 0, 988, 1047], .08, { type: 'triangle', v: .14 }); break;
      case 'select': this.tone(880, .04, { v: .06 }); break;
      case 'curse': this.tone(110, .5, { type: 'sawtooth', slide: -50, v: .1 }); this.tone(116, .5, { type: 'sawtooth', slide: -50, v: .08 }); break;
      case 'roulette': this.tone(700 + x * 30, .03, { v: .05 }); break;
      case 'whoosh': this.noise(.2, { v: .15, f: 2500 }); break;
      case 'chase': this.tone(700 + x * 500, .035, { v: .05, type: 'square' }); break;
      case 'ding': this.seq([1319, 1568, 2093], .06, { type: 'triangle', v: .12 }); break;
      case 'spawn': this.seq([392, 523, 784, 659, 1047], .05, { type: 'triangle', v: .1 }); break;
      case 'place': this.noise(.1, { v: .25, f: 600 }); this.tone(180, .15, { type: 'triangle', v: .25 }); this.tone(660, .1, { v: .06, at: .08 }); break;
      case 'buy': this.seq([659, 988, 1319], .05, { v: .08 }); break;
    }
  },
};
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } };
