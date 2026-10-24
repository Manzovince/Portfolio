// Level data + track geometry. A track is a closed Catmull-Rom centerline with a width;
// its two edges (plus optional pillars) are the walls.

export const LEVELS = [
  {
    id: 'amorce', medals: [22, 25, 30.5], name: 'Amorce', mode: 'solo', laps: 3, hue: 190, w: 280,
    pts: [[0, 0], [800, 0], [1300, 150], [1450, 600], [1300, 1050], [800, 1200], [0, 1200], [-500, 1050], [-650, 600], [-500, 150]],
    story: ['Réveil. Tu es V-7, un vecteur.', 'Ton rôle : porter les données là où le réseau ne sait plus aller.', 'Gauche ou droite : tu pivotes. Les deux en même temps : tu pousses.'],
  },
  {
    id: 'frottement', medals: [32, 36.5, 45], name: 'Frottement', mode: 'solo', laps: 3, hue: 160, w: 220,
    pts: [[0, 0], [700, 0], [1400, 0], [2100, 0], [2600, 150], [2800, 550], [2600, 950], [2100, 1100], [1600, 950], [1300, 700], [900, 700], [500, 1000], [0, 1100], [-450, 900], [-550, 450], [-400, 100]],
    story: ['Les murs ne te détruisent pas.', 'Ils t\'accélèrent. Colle-toi à eux, frotte-les.'],
  },
  {
    id: 'faisceau', name: 'Faisceau', mode: 'race', laps: 3, hue: 280, w: 240, rivals: 3,
    pts: [[0, 0], [900, -100], [1500, -500], [2200, -450], [2500, 0], [2300, 500], [1800, 650], [1500, 1100], [1700, 1600], [1300, 2000], [600, 1900], [200, 1500], [-300, 1300], [-700, 900], [-600, 350]],
    story: ['D\'autres vecteurs circulent sur ce faisceau.', 'Ils ne t\'attendront pas. Arrive le premier.'],
  },
  {
    id: 'chicane', medals: [32.5, 37, 45], name: 'Chicane', mode: 'solo', laps: 3, hue: 40, w: 180,
    pts: [[0, 0], [500, -150], [900, 0], [1300, -150], [1700, 0], [2100, -150], [2600, 50], [2850, 500], [2600, 950], [2100, 1100], [1600, 900], [1200, 1150], [700, 1150], [300, 900], [-200, 900], [-500, 600], [-450, 200]],
    story: ['Le passage se resserre.', 'Ne lutte pas contre l\'inertie : sers-t\'en.'],
  },
  {
    id: 'pylones', name: 'Pylônes', mode: 'race', laps: 3, hue: 330, w: 320, rivals: 3,
    pts: [[0, 0], [1000, 0], [1800, 300], [2200, 900], [2000, 1600], [1400, 1900], [700, 1700], [300, 2100], [-400, 2000], [-800, 1400], [-700, 700], [-500, 200]],
    pillars: [{ at: 0.1, off: 50, r: 46 }, { at: 0.36, off: -60, r: 50 }, { at: 0.6, off: 40, r: 44 }, { at: 0.85, off: -40, r: 48 }],
    story: ['Des nœuds morts encombrent la voie.', 'Contourne-les. Les autres aussi devront le faire.'],
  },
  {
    id: 'chute', medals: [25, 28.5, 35], name: 'Chute', mode: 'solo', laps: 3, hue: 210, w: 270, gravity: [0, 320],
    pts: [[0, 0], [800, 0], [1300, -300], [1500, -900], [1300, -1500], [800, -1700], [200, -1600], [-200, -1200], [-100, -700], [-200, -250]],
    story: ['Ici la mémoire est lourde.', 'Quelque chose t\'attire vers le bas. Garde ton élan pour remonter.'],
  },
  {
    id: 'spirale', name: 'Spirale', mode: 'race', laps: 3, hue: 100, w: 230, rivals: 4,
    pts: [[0, 0], [600, -300], [1200, -200], [1500, 300], [1200, 700], [1500, 1100], [2100, 1100], [2500, 1500], [2300, 2100], [1600, 2200], [1100, 1800], [500, 2000], [-100, 1800], [-400, 1300], [-80, 900], [-200, 500]],
    story: ['Ils ont appris de toi.', 'ÉCHO ne fait plus d\'erreurs. Fais-en encore moins.'],
  },
  {
    id: 'noyau', name: 'Noyau', mode: 'race', laps: 4, hue: 0, w: 240, rivals: 4,
    pts: [[0, 0], [1000, -200], [1800, -100], [2300, 400], [2100, 1000], [1500, 1100], [1200, 1500], [1600, 2000], [2300, 2100], [2700, 2600], [2400, 3200], [1600, 3300], [900, 2900], [500, 2300], [-200, 2200], [-700, 1700], [-600, 1000], [-200, 600]],
    pillars: [{ at: 0.45, off: 0, r: 40 }],
    story: ['Dernière transmission.', 'Après celle-ci, je pourrai me souvenir de tout.', 'Va.'],
  },
];

export const ENDING = ['Transmission complète.', 'Je me souviens, maintenant. De tout.', 'Merci, V-7.'];

const SPACING = 12;

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function buildTrack(def) {
  const pts = def.pts, m = pts.length;
  // dense spline
  const dx = [], dy = [], dw = [];
  for (let i = 0; i < m; i++) {
    const a = pts[(i - 1 + m) % m], b = pts[i], c = pts[(i + 1) % m], d = pts[(i + 2) % m];
    const wb = b[2] || def.w, wc = c[2] || def.w;
    for (let k = 0; k < 60; k++) {
      const t = k / 60;
      dx.push(catmull(a[0], b[0], c[0], d[0], t)); dy.push(catmull(a[1], b[1], c[1], d[1], t));
      dw.push(wb + (wc - wb) * (3 * t * t - 2 * t * t * t));
    }
  }
  // resample at constant arc length
  const cum = [0];
  for (let i = 1; i <= dx.length; i++) {
    const j = i % dx.length;
    cum.push(cum[i - 1] + Math.hypot(dx[j] - dx[i - 1], dy[j] - dy[i - 1]));
  }
  const len = cum[cum.length - 1], n = Math.round(len / SPACING);
  const cx = new Float32Array(n), cy = new Float32Array(n), hw = new Float32Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / n) * len;
    while (cum[j + 1] < s) j++;
    const t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1), k = (j + 1) % dx.length;
    cx[i] = dx[j] + (dx[k] - dx[j]) * t; cy[i] = dy[j] + (dy[k] - dy[j]) * t;
    hw[i] = (dw[j] + (dw[k] - dw[j]) * t) / 2;
  }
  // tangents / normals
  const tx = new Float32Array(n), ty = new Float32Array(n), nx = new Float32Array(n), ny = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n, b = (i + 1) % n;
    let x = cx[b] - cx[a], y = cy[b] - cy[a];
    const l = Math.hypot(x, y) || 1; x /= l; y /= l;
    tx[i] = x; ty[i] = y; nx[i] = -y; ny[i] = x;
  }
  // signed curvature (1/px), positive = turning toward +normal
  const curv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 2 + n) % n, b = (i + 2) % n;
    const cross = tx[a] * ty[b] - ty[a] * tx[b];
    curv[i] = cross / (SPACING * 4);
  }
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    left.push([cx[i] + nx[i] * hw[i], cy[i] + ny[i] * hw[i]]);
    right.push([cx[i] - nx[i] * hw[i], cy[i] - ny[i] * hw[i]]);
  }
  const pillars = (def.pillars || []).map(p => {
    const i = Math.round(p.at * n) % n;
    const x = cx[i] + nx[i] * p.off, y = cy[i] + ny[i] * p.off, poly = [];
    for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; poly.push([x + Math.cos(a) * p.r, y + Math.sin(a) * p.r]); }
    return { i, x, y, r: p.r, off: p.off, poly };
  });

  // wall segments
  const segs = [];
  const addLoop = poly => { for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; segs.push(a[0], a[1], b[0], b[1]); } };
  addLoop(left); addLoop(right); pillars.forEach(p => addLoop(p.poly));
  const seg = new Float32Array(segs);
  const grid = buildGrid(seg, 64);

  // AI line: cut toward the inside of curves, swerve around pillars, then smooth
  let off = new Float32Array(n);
  for (let i = 0; i < n; i++) off[i] = Math.max(-1, Math.min(1, curv[i] * 260)) * (hw[i] - 34);
  off = smooth(off, 22); off = smooth(off, 22);
  for (const p of pillars) {
    const side = p.off >= 0 ? -1 : 1;
    const want = p.off + side * (p.r + 46);
    const span = 34;
    for (let k = -span; k <= span; k++) {
      const i = (p.i + k + n) % n, w = 0.5 + 0.5 * Math.cos((k / span) * Math.PI);
      off[i] = off[i] * (1 - w) + want * w;
    }
  }
  for (let i = 0; i < n; i++) off[i] = Math.max(-(hw[i] - 26), Math.min(hw[i] - 26, off[i]));
  const lx = new Float32Array(n), ly = new Float32Array(n);
  for (let i = 0; i < n; i++) { lx[i] = cx[i] + nx[i] * off[i]; ly[i] = cy[i] + ny[i] * off[i]; }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of left.concat(right)) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }

  return { def, n, len, cx, cy, hw, tx, ty, nx, ny, curv, left, right, pillars, seg, grid, lx, ly, gravity: def.gravity || null, bounds: [minX, minY, maxX, maxY] };
}

function smooth(a, r) {
  const n = a.length, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += a[(i + k + n) % n];
    out[i] = s / (2 * r + 1);
  }
  return out;
}

function buildGrid(seg, cell) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < seg.length; i += 2) { x0 = Math.min(x0, seg[i]); y0 = Math.min(y0, seg[i + 1]); x1 = Math.max(x1, seg[i]); y1 = Math.max(y1, seg[i + 1]); }
  x0 -= cell * 2; y0 -= cell * 2;
  const w = Math.ceil((x1 - x0) / cell) + 4, h = Math.ceil((y1 - y0) / cell) + 4;
  const cells = new Array(w * h);
  const ns = seg.length / 4;
  for (let s = 0; s < ns; s++) {
    const o = s * 4;
    const i0 = Math.floor((Math.min(seg[o], seg[o + 2]) - x0) / cell), i1 = Math.floor((Math.max(seg[o], seg[o + 2]) - x0) / cell);
    const j0 = Math.floor((Math.min(seg[o + 1], seg[o + 3]) - y0) / cell), j1 = Math.floor((Math.max(seg[o + 1], seg[o + 3]) - y0) / cell);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (cells[j * w + i] ||= []).push(s);
  }
  return { x0, y0, cell, w, h, cells };
}
