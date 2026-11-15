// Décor, personnage, bateau, musée vu de l'extérieur.
import { Pix } from './paint.js';
import { canvas, shade, hash2 } from './util.js';

const LEAF = { chene: '#4f9e4a', bouleau: '#8cc456', saule: '#7aa84e', kapok: '#2f8a46', palmier: '#4caa52', sapin: '#2f7a52' };
const BARK = '#8a5a3c';

function mk(w, h, f, ax, ay, outline = true) {
  const p = new Pix(w, h);
  f(p);
  if (outline) p.outline();
  return { c: p.canvas(), ax, ay, w, h };
}

function chene(v) {
  return mk(36, 42, (p) => {
    p.rect(15, 27, 6, 13, BARK).rect(19, 27, 2, 13, shade(BARK, -0.2)).rect(15, 27, 1, 13, shade(BARK, 0.15));
    p.px(14, 39, BARK).px(21, 39, BARK);
    const L = v === 2 ? '#5aa84a' : LEAF.chene;
    p.ell(10, 20, 8, 7, L).ell(26, 20, 8, 7, L).ell(18, 22, 10, 7, L).ell(18, 12, 11, 9, L).ell(11, 13, 6, 5, L).ell(25, 14, 6, 6, L);
    for (let k = 0; k < 9; k++) p.px(8 + hash2(k, v, 1) * 20, 7 + hash2(v, k, 2) * 18, shade(L, 0.3));
    if (v === 3) for (let k = 0; k < 5; k++) p.px(8 + hash2(k, 9, 3) * 20, 10 + hash2(9, k, 4) * 14, '#e8524a');
  }, 18, 40);
}
function bouleau(v) {
  return mk(26, 44, (p) => {
    p.rect(11, 22, 4, 20, '#f2efe6');
    for (let y = 23; y < 41; y += 3 + (y % 2)) p.rect(11 + (y % 3 === 0 ? 0 : 2), y, 2, 1, '#3a3440');
    p.ell(13, 14, 9, 10, LEAF.bouleau).ell(8, 20, 5, 5, LEAF.bouleau).ell(18, 20, 5, 5, LEAF.bouleau).ell(13, 7, 6, 5, LEAF.bouleau);
    for (let k = 0; k < 6; k++) p.px(6 + hash2(k, v, 5) * 14, 6 + hash2(v, k, 6) * 16, '#c4e07a');
  }, 13, 42);
}
function sapin(v, neige) {
  return mk(26, 44, (p) => {
    p.rect(11, 34, 4, 8, BARK);
    const G1 = LEAF.sapin;
    for (let k = 0; k < 4; k++) {
      const y = 6 + k * 8, hw = 4 + k * 2.6;
      p.poly([[13, y - 6], [13 + hw + 2, y + 6], [13 - hw - 2, y + 6]], G1);
      p.poly([[13, y - 6], [13 - hw - 2, y + 6], [11, y + 6]], shade(G1, 0.15));
      if (neige) p.poly([[13, y - 6], [13 + hw * 0.6, y], [13 - hw * 0.6, y]], '#f4f8fc');
    }
  }, 13, 42);
}
function palmier(v) {
  const flip = v % 2 === 1;
  return mk(36, 44, (p) => {
    for (let k = 0; k < 9; k++) {
      const x = 17 + Math.round(Math.sin(k * 0.3) * 3 * (flip ? -1 : 1)), y = 40 - k * 3.2;
      p.rect(x - 2, y - 3, 4, 4, k % 2 ? '#a07848' : '#8a6438');
    }
    const tx = 17 + Math.round(Math.sin(8 * 0.3) * 3 * (flip ? -1 : 1)), ty = 12;
    const fr = [[-15, 6], [15, 6], [-11, -4], [11, -5], [-4, 9], [5, 10], [0, -8]];
    fr.forEach(([dx, dy], k) => {
      for (let t = 0; t <= 1; t += 0.06) {
        const x = tx + dx * t, y = ty + dy * t + Math.sin(t * 3.14) * -3 + t * t * 4;
        p.ell(x, y, 2.2 - t, 1.6, k % 2 ? LEAF.palmier : shade(LEAF.palmier, -0.1), false);
      }
    });
    p.ell(tx - 2, ty + 2, 1.6, 1.6, '#7a5a2a', false).ell(tx + 2, ty + 3, 1.6, 1.6, '#6a4a22', false);
  }, 17, 42);
}
function saule(v) {
  return mk(34, 40, (p) => {
    p.rect(14, 24, 6, 14, BARK);
    const L = LEAF.saule;
    p.ell(17, 14, 14, 9, L).ell(17, 8, 9, 6, L);
    for (let x = 5; x < 30; x += 2) {
      const len = 10 + Math.floor(hash2(x, v, 7) * 10);
      p.rect(x, 16, 1, len, hash2(x, 1, v) < 0.5 ? L : shade(L, 0.12));
    }
  }, 17, 38);
}
function kapok(v) {
  return mk(44, 54, (p) => {
    p.poly([[18, 52], [26, 52], [24, 22], [20, 22]], '#9a8a6a');
    p.poly([[12, 52], [19, 40], [20, 52]], '#8a7a5a').poly([[32, 52], [25, 40], [24, 52]], '#8a7a5a');
    const L = LEAF.kapok;
    p.ell(22, 16, 19, 9, L).ell(12, 20, 9, 5, L).ell(32, 20, 9, 5, L).ell(22, 9, 12, 6, shade(L, 0.08));
    for (let k = 0; k < 10; k++) p.px(6 + hash2(k, v, 8) * 32, 8 + hash2(v, k, 9) * 14, '#5ab86a');
  }, 22, 52);
}
function buisson(v) {
  return mk(22, 16, (p) => {
    const L = '#4e9a48';
    p.ell(7, 9, 6, 5, L).ell(15, 9, 6, 5, L).ell(11, 6, 6, 5, L);
    if (v >= 2) for (let k = 0; k < 4; k++) p.px(5 + hash2(k, v, 1) * 12, 4 + hash2(v, k, 2) * 7, v === 2 ? '#e2465a' : '#7a6ad8');
  }, 11, 14);
}
function fougere(v) {
  return mk(24, 18, (p) => {
    const L = '#3fa45a';
    for (let k = 0; k < 6; k++) {
      const a = -2.6 + k * 0.42;
      for (let t = 0; t < 1; t += 0.08) p.ell(12 + Math.cos(a) * 11 * t, 16 + Math.sin(a) * 13 * t + t * t * 5, 1.6 - t, 1.2, k % 2 ? L : shade(L, 0.15), false);
    }
  }, 12, 16);
}
function rocher(v, neige) {
  return mk(20, 14, (p) => {
    const C = '#9a948e';
    p.ell(10, 8, 8, 5, C).ell(6, 9, 4, 3, shade(C, -0.06));
    if (neige) p.ell(10, 5, 6, 2.2, '#f4f8fc', false);
    if (v === 1 && !neige) p.px(12, 5, '#76945a').px(13, 5, '#76945a');
  }, 10, 12);
}
function cactus(v) {
  return mk(20, 26, (p) => {
    const C = '#5a9a5a';
    p.rect(9, 14, 3, 10, '#8a7a5a');
    p.ell(10, 13, 4, 5, C).ell(5, 8, 3, 4, C).ell(15, 9, 3, 4, C).ell(10, 5, 3, 4, C);
    p.px(10, 1, '#f6e27a').px(5, 4, '#f6e27a');
  }, 10, 24);
}
function arbreMort(v) {
  return mk(22, 28, (p) => {
    const C = '#7a6a5a';
    p.rect(10, 10, 3, 16, C);
    p.line(11, 14, 4, 6, C).line(11, 12, 18, 4, C).line(5, 8, 3, 3, C).line(16, 6, 19, 2, C).line(11, 10, 11, 2, C);
  }, 11, 26);
}
function grotte(v) {
  return mk(36, 28, (p) => {
    const C = '#8a8288';
    p.ell(18, 15, 16, 12, C).ell(9, 19, 8, 7, shade(C, -0.05)).ell(27, 19, 8, 7, shade(C, 0.05));
    p.ell(18, 21, 6, 7, '#1e1828', false).rect(12, 21, 13, 6, '#1e1828');
    p.px(16, 17, '#3a3046').px(20, 18, '#3a3046');
    p.px(8, 8, '#76945a').px(9, 8, '#76945a').px(26, 7, '#76945a');
  }, 18, 26);
}
function fleur(v) {
  const cols = [['#f6e27a', '#f49ab0'], ['#ffffff', '#f6e27a'], ['#b48ae8', '#f49ab0'], ['#ff8a5a', '#ffffff']][v];
  return mk(12, 8, (p) => {
    [[2, 4], [6, 2], [9, 5], [5, 6]].forEach(([x, y], k) => {
      p.px(x, y + 1, '#3f8a3a');
      p.px(x, y, cols[k % 2]).px(x - 1, y, cols[k % 2]).px(x + 1, y, cols[k % 2]).px(x, y - 1, cols[k % 2]);
      p.px(x, y, '#f6c04a');
    });
  }, 6, 7, false);
}
function fleurTropic(v) {
  return mk(12, 10, (p) => {
    p.rect(5, 5, 1, 4, '#2f7a3a');
    p.ell(6, 4, 3.5, 3, '#e8364a').px(6, 4, '#ffe066');
  }, 6, 9);
}
function herbe(v) {
  return mk(12, 9, (p) => {
    const C = '#5aa04c';
    [[2, 3], [4, 1], [6, 2], [8, 0], [10, 3]].forEach(([x, top], k) => p.line(x, 8, x + (k % 2 ? 1 : -1), top, k % 2 ? C : shade(C, 0.2)));
  }, 6, 8, false);
}
function champignon(v) {
  return mk(10, 9, (p) => {
    p.rect(3, 5, 2, 3, '#f2ead8').ell(4, 4, 3.4, 2.2, '#d8443a', false).px(3, 3, '#fff').px(5, 4, '#fff');
    p.rect(7, 6, 1, 2, '#f2ead8').ell(7.5, 5.5, 1.8, 1.2, '#c8803a', false);
  }, 5, 8);
}
function roseau(v) {
  return mk(12, 18, (p) => {
    const C = '#6a9a3a';
    p.line(3, 17, 2, 4, C).line(6, 17, 7, 2, shade(C, 0.15)).line(9, 17, 9, 6, C);
    p.rect(6, 3, 2, 4, '#7a4a2a').rect(1, 5, 2, 3, '#7a4a2a');
  }, 6, 17);
}
function coquillage(v) {
  return mk(8, 6, (p) => {
    p.ell(4, 3, 2.6, 2, v % 2 ? '#f6d6c8' : '#fff2dc').px(3, 2, '#e8a890').px(5, 2, '#e8a890');
  }, 4, 5);
}
function nenuphar(v) {
  return mk(14, 8, (p) => {
    p.ell(7, 4, 6, 2.6, '#4a9a4a', false).px(7, 4, '#2f7a3a').px(8, 3, '#2f7a3a');
    if (v % 2 === 0) p.ell(5, 3, 1.6, 1.2, '#f6b8d0', false).px(5, 3, '#ffe066');
  }, 7, 5);
}

export function bakeDecor() {
  const D = {};
  const set = (name, f, nv = 4) => (D[name] = Array.from({ length: nv }, (_, v) => f(v)));
  set('chene', chene); set('bouleau', bouleau); set('sapin', (v) => sapin(v, false)); set('sapinNeige', (v) => sapin(v, true));
  set('palmier', palmier); set('saule', saule); set('kapok', kapok); set('buisson', buisson); set('fougere', fougere);
  set('rocher', (v) => rocher(v, false)); set('rocherNeige', (v) => rocher(v, true)); set('cactus', cactus); set('arbreMort', arbreMort);
  set('grotte', grotte, 1); set('fleur', fleur); set('fleurTropic', fleurTropic); set('herbe', herbe); set('champignon', champignon);
  set('roseau', roseau); set('coquillage', coquillage); set('nenuphar', nenuphar);
  return D;
}

// Ombre portée au sol
export function bakeShadow(rx, ry) {
  const [c, g] = canvas(rx * 2 + 2, ry * 2 + 2);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const nx = (x + 0.5 - rx - 1) / rx, ny = (y + 0.5 - ry - 1) / ry;
    if (nx * nx + ny * ny <= 1) { g.fillStyle = 'rgba(42,34,56,0.25)'; g.fillRect(x, y, 1, 1); }
  }
  return c;
}

// ---------- Personnage (chapeau d'explorateur)
const PC = {
  Y: '#ecca6c', y: '#c9a24a', R: '#c4544a', H: '#6a3e2a', h: '#8a5a3a', S: '#f6c9a0', s: '#e2a882', E: '#2a2238', p: '#f49ab0',
  C: '#e46a5a', c: '#c04a44', W: '#fff6ea', B: '#3c5a8a', b: '#2c4470', K: '#5a3a2a', G: '#7aa04a', g: '#5a8038',
};
const HEAD_F = [
  '.....YYYY.....',
  '....YyYYYY....',
  '....YYYYYY....',
  '....RRRRRR....',
  '.YYYYYYYYYYYY.',
  '..yHHHHHHHHy..',
  '..HSSSSSSSSH..',
  '..HSESSSESSH..',
  '..HSESSSESSH..',
  '..SpSSSSSpSS..',
  '...SSSssSSS...',
];
const HEAD_B = [
  '.....YYYY.....',
  '....YYYYyY....',
  '....YYYYYY....',
  '....RRRRRR....',
  '.YYYYYYYYYYYY.',
  '..yHHHHHHHHy..',
  '..HHHHHHHHHH..',
  '..HHHHhHHHHH..',
  '..HHHHHHHHHH..',
  '..sHHHHHHHHs..',
  '...HHHHHHHH...',
];
const BODY_F = [
  '....CWCCWC....',
  '..CCCCCCCCCC..',
  '.SCCCCCCCCCCS.',
  '.SCCCCCCCCCCS.',
  '.ScCCCCCCCCcS.',
  '..BBBBBBBBBB..',
  '..BBBBbbBBBB..',
];
const BODY_B = [
  '....CCCCCC....',
  '..CCGGGGGGCC..',
  '.SCGGGgGGGGCS.',
  '.SCGGGGGGGGCS.',
  '.ScGGGGGGGGcS.',
  '..BBBBBBBBBB..',
  '..BBBBbbBBBB..',
];
const LEGS = [
  ['..SSS....SSS..', '..SSS....SSS..', '..KKK....KKK..', '.KKKK....KKKK.'],
  ['..SSS....SSS..', '..KKK....SSS..', '.KKKK....KKK..', '.........KKKK.'],
  ['..SSS....SSS..', '..SSS....KKK..', '..KKK....KKKK.', '.KKKK.........'],
];
function charFrame(back, f, swim) {
  const rows = [...(back ? HEAD_B : HEAD_F), ...(back ? BODY_B : BODY_F), ...LEGS[f]];
  const bob = f === 0 ? 0 : 1;
  const p = new Pix(16, 25);
  rows.forEach((r, y) => {
    if (swim && y > 12) return;
    [...r].forEach((ch, x) => { if (PC[ch]) p.px(x + 1, y + 1 + (y < 18 ? bob : 0), PC[ch]); });
  });
  p.outline();
  return p.canvas();
}
export function bakePlayer() {
  const P = { front: [], back: [], swimF: null, swimB: null };
  for (let f = 0; f < 3; f++) { P.front.push(charFrame(false, f)); P.back.push(charFrame(true, f)); }
  P.swimF = charFrame(false, 0, true); P.swimB = charFrame(true, 0, true);
  return P;
}

// ---------- Outils
export function bakeTools() {
  const net = new Pix(18, 18);
  net.line(2, 16, 10, 8, '#a07848');
  net.ell(13, 5, 4.5, 4.5, '#f4f0e6', false).ell(13, 5, 3.2, 3.2, null, false);
  for (let y = 1; y < 10; y++) for (let x = 9; x < 18; x++) {
    const nx = (x + 0.5 - 13) / 3.6, ny = (y + 0.5 - 5) / 3.6;
    if (nx * nx + ny * ny < 1) net.px(x, y, (x + y) % 2 ? '#ffffff80' : null);
  }
  net.outline('#2a2238');
  const rod = new Pix(20, 20);
  rod.line(2, 18, 17, 2, '#8a5a3a').px(4, 16, '#3a3440').px(5, 15, '#3a3440');
  rod.outline('#2a2238');
  const cam = new Pix(10, 8);
  cam.rect(1, 2, 8, 5, '#3a3440').rect(2, 1, 3, 1, '#3a3440').ell(5, 4.5, 1.8, 1.8, '#86b8e8', false).px(7, 3, '#e46a5a');
  cam.outline('#1a1424');
  const bob = new Pix(6, 7);
  bob.ell(3, 3.5, 2.2, 2.6, '#ffffff', false).rect(1, 3, 5, 1, '#e8364a').rect(1, 4, 5, 2, '#e8364a');
  bob.outline('#2a2238');
  return { net: net.canvas(), netL: net.flipX().canvas(), rod: rod.canvas(), rodL: rod.flipX().canvas(), cam: cam.canvas(), bob: bob.canvas() };
}

// ---------- Bateau (barque) et ponton
export function bakeBoat() {
  const mkb = (flip) => {
    const p = new Pix(40, 24);
    p.poly([[2, 10], [37, 10], [32, 19], [7, 19]], '#8a5a3c');
    p.poly([[2, 10], [37, 10], [35, 13], [4, 13]], '#a8744a');
    p.rect(5, 9, 30, 1, '#c49a6c');
    p.rect(9, 11, 22, 2, '#6a4430');
    p.rect(18, 10, 4, 2, '#c49a6c');
    p.line(17, 9, 22, 2, '#5a3a2a').line(18, 9, 23, 2, '#5a3a2a');
    p.rect(4, 15, 31, 1, '#e8e2d4');
    p.outline();
    return (flip ? p.flipX() : p).canvas();
  };
  return { R: mkb(false), L: mkb(true), ax: 20, ay: 16 };
}

export function bakePier() {
  const [c, g] = canvas(32, 28);
  for (let y = 0; y < 16; y++) {
    const hw = y < 8 ? 2 * y + 2 : 2 * (15 - y) + 2;
    for (let x = 16 - hw; x < 16 + hw; x++) {
      const across = (x - 16) / 2 + y; // traverse les planches
      const stripe = Math.floor((x / 2 + y) / 3) % 2;
      g.fillStyle = Math.floor(across) % 6 === 0 ? '#8a5a3c' : stripe ? '#c49a6c' : '#b88c5e';
      g.fillRect(x, y, 1, 1);
    }
  }
  g.fillStyle = '#6a4430';
  for (const [x, y] of [[4, 9], [27, 9], [15, 15]]) g.fillRect(x, y, 2, 12);
  g.fillStyle = '#8a5a3c';
  for (let x = 0; x < 32; x++) g.fillRect(x, (x < 16 ? 8 + (x >> 1) : 15 - ((x - 16) >> 1)) + 1, 1, 2);
  return c;
}

// ---------- Musée vu de dehors : pierre claire, portique, grande verrière
const PX = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
const FONT = {
  M: ['1...1', '11.11', '1.1.1', '1...1', '1...1'], U: ['1...1', '1...1', '1...1', '1...1', '.111.'],
  S: ['.1111', '1....', '.111.', '....1', '1111.'], E: ['11111', '1....', '1111.', '1....', '11111'],
  É: ['.111.', '1....', '111..', '1....', '.111.'],
};
export function bakeMuseum(w, d) {
  const offX = d * 16 + 8, offY = 74;
  const CW = (w + d) * 16 + 16, CH = (w + d) * 8 + offY + 24;
  const [c, g] = canvas(CW, CH);
  const [lc, lg] = canvas(CW, CH); // calque des fenêtres éclairées (nuit)
  const X = (i, j) => Math.round((i - j) * 16 + offX);
  const Yb = (i, j) => Math.round((i + j) * 8 + offY);
  function prism(i0, j0, wi, wj, z0, z1, top, left, right) {
    const XL = X(i0, j0 + wj), XB = X(i0 + wi, j0 + wj), XR = X(i0 + wi, j0), XT = X(i0, j0);
    const yL = Yb(i0, j0 + wj), yB = Yb(i0 + wi, j0 + wj), yT = Yb(i0, j0);
    for (let x = XL; x < XB; x++) {
      const base = Math.floor(yL + (x - XL) / 2);
      for (let v = z0; v < z1; v++) { const col = left(x - XL, v, XB - XL); if (col) PX(g, x, base - v, col); }
    }
    for (let x = XB; x < XR; x++) {
      const base = Math.floor(yB - (x - XB) / 2);
      for (let v = z0; v < z1; v++) { const col = right(x - XB, v, XR - XB); if (col) PX(g, x, base - v, col); }
    }
    if (top) for (let x = XL; x < XR; x++) {
      const yt = Math.floor(x < XT ? yL - (x - XL) / 2 : yT + (x - XT) / 2) - z1;
      const yb = Math.floor(x < XB ? yL + (x - XL) / 2 : yB - (x - XB) / 2) - z1;
      for (let y = yt; y < yb; y++) PX(g, x, y, typeof top === 'function' ? top(x, y) : top);
    }
    return { XL, XB, XR, XT, yL, yB };
  }
  const stone = '#efe2c8', stoneR = '#f8eedb', joint = '#dccbac', dark = '#5a4a5a', glass = '#7fb8d0', glassL = '#c4e8f2', iron = '#4a5a6a';
  // socle
  prism(-0.2, -0.2, w + 0.4, d + 0.4, 0, 6, '#d8c8aa', (u, v) => (v === 5 ? '#c8b494' : '#b8a486'), (u, v) => (v === 5 ? '#d8c8aa' : '#c8b494'));
  // murs
  const wallZ0 = 6, wallZ1 = 46;
  const winL = (u, v, len, lit) => {
    // fenêtres hautes en arc, espacées de 16 px
    const m = u % 16, cx = 8;
    const inWin = m >= 5 && m <= 10 && v >= 16 && v <= 36 - (m === 5 || m === 10 ? 2 : 0);
    if (inWin) return v > 33 ? glassL : (m === 6 && v > 22 ? glassL : glass);
    if ((m === 4 || m === 11) && v >= 15 && v <= 35) return joint;
    return null;
  };
  const P = prism(0, 0, w, d, wallZ0, wallZ1, null,
    (u, v, len) => {
      // façade principale (+j) : portique au centre
      const center = Math.abs(u - len / 2) < 26;
      if (!center) { const wv = winL(u, v, len); if (wv) return wv; }
      if (v % 8 === 0) return joint;
      if (center && Math.abs(u - len / 2) < 6 && v < 30) return v > 26 ? '#3a2a30' : (u - len / 2 + 6) % 4 === 0 ? '#5a3a2a' : '#7a4a32';
      return stone;
    },
    (u, v, len) => { const wv = winL(u, v, len); if (wv) return wv; if (v % 8 === 0) return joint; return stoneR; });
  // fenêtres éclairées la nuit
  const img = g.getImageData(0, 0, CW, CH).data;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const q = (y * CW + x) * 4;
    if (img[q] === 0x7f && img[q + 1] === 0xb8 && img[q + 2] === 0xd0) PX(lg, x, y, '#ffd88a');
  }
  // corniche + frise
  prism(-0.15, -0.15, w + 0.3, d + 0.3, wallZ1, wallZ1 + 5, '#fbf4e6', (u, v) => (v === wallZ1 + 1 && u % 3 === 0 ? '#c8b494' : v === wallZ1 + 4 ? '#fffaf0' : '#e8dcc2'), (u, v) => (v === wallZ1 + 1 && u % 3 === 0 ? '#d8c8aa' : v === wallZ1 + 4 ? '#fffaf0' : '#f4ead8'));
  // toit plat + grande verrière
  const roofZ = wallZ1 + 5;
  const rib = (u, v) => (u % 8 === 0 || v % 6 === 0 ? iron : (u + v) % 11 === 0 ? glassL : glass);
  prism(0.7, 0.6, w - 1.4, d - 1.2, roofZ, roofZ + 14, (x, y) => ((x + y * 2) % 10 === 0 || (x - y * 2 + 400) % 10 === 0 ? iron : (x + y) % 7 === 0 ? glassL : '#9cd0e0'), rib, rib);
  // lanterneau
  prism(w / 2 - 0.8, d / 2 - 0.8, 1.6, 1.6, roofZ + 14, roofZ + 22, '#9cd0e0', rib, rib);
  for (let k = 0; k < 4; k++) PX(g, X(w / 2, d / 2), Yb(w / 2, d / 2) - roofZ - 23 - k, iron);
  // portique : colonnes devant la façade
  const jF = d + 0.35;
  for (const ci of [w / 2 - 1.5, w / 2 - 0.5, w / 2 + 0.5, w / 2 + 1.5]) {
    const x0 = X(ci, jF), yb = Yb(ci, jF);
    for (let v = 6; v < wallZ1; v++) for (let dx = -2; dx <= 2; dx++) PX(g, x0 + dx, yb - v, dx === -2 ? '#c8b494' : dx === 2 ? '#e8dcc2' : dx === -1 ? '#fffaf0' : '#f4ead8');
    for (let dx = -3; dx <= 3; dx++) { PX(g, x0 + dx, yb - wallZ1, '#fbf4e6'); PX(g, x0 + dx, yb - wallZ1 + 1, '#d8c8aa'); PX(g, x0 + dx, yb - 6, '#d8c8aa'); }
  }
  // fronton triangulaire
  const a0 = w / 2 - 2.1, a1 = w / 2 + 2.1;
  const xa = X(a0, jF), xb = X(a1, jF), ya = Yb(a0, jF) - wallZ1 - 5, yb2 = Yb(a1, jF) - wallZ1 - 5;
  const xm = (xa + xb) / 2, ym = (ya + yb2) / 2 - 16;
  for (let x = xa; x <= xb; x++) {
    const ybase = ya + ((x - xa) / (xb - xa)) * (yb2 - ya);
    const ytop = x < xm ? ya + ((x - xa) / (xm - xa)) * (ym - ya) : ym + ((x - xm) / (xb - xm)) * (yb2 - ym);
    for (let y = Math.round(ytop); y <= Math.round(ybase); y++) {
      const edge = y <= Math.round(ytop) + 1;
      PX(g, x, y, edge ? '#fffaf0' : y >= Math.round(ybase) - 1 ? '#d8c8aa' : '#efe2c8');
    }
  }
  // médaillon doré : une silhouette de baleine stylisée
  for (let dx = -4; dx <= 4; dx++) for (let dy = -3; dy <= 3; dy++) if (dx * dx / 16 + dy * dy / 9 <= 1) PX(g, Math.round(xm) + dx, Math.round(ym) + 10 + dy + Math.round(dx / 2), dx * dx / 16 + dy * dy / 9 > 0.55 ? '#c9a24a' : '#e8c86a');
  // inscription MUSÉUM sur la frise (cisaillée selon la façade)
  const word = 'MUSÉUM';
  let lx = X(w / 2 - 1.6, d) + 0, ly0 = Yb(w / 2 - 1.6, d) - wallZ1 - 4;
  [...word].forEach((ch) => {
    const gl = FONT[ch];
    gl.forEach((row, ry) => [...row].forEach((b, rx) => { if (b === '1') PX(g, lx + rx, ly0 + ry + Math.floor((lx + rx - X(w / 2 - 1.6, d)) / 2) - 1, '#7a5a3a'); }));
    lx += 6;
  });
  // marches
  for (let s = 0; s < 3; s++) prism(w / 2 - 1.9 + s * 0.1, d, 3.8 - s * 0.2, 0.75 - s * 0.22, 0, 2 + s * 2, '#f4ead8', () => '#d8c8aa', () => '#e8dcc2');
  // bannières sur la façade latérale
  for (const [bj, col] of [[d - 1.2, '#c4544a'], [1.2, '#4f8a82']]) {
    const x0 = X(w, bj), yb = Yb(w, bj);
    for (let v = 18; v < 40; v++) for (let dx = 0; dx < 5; dx++) PX(g, x0 + dx, yb - v - Math.floor(dx / 2), v === 18 ? shade(col, -0.3) : (v === 30 && dx === 2) ? '#f6e27a' : col);
  }
  return { c, light: lc, offX, offY };
}
