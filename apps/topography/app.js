/* Topography — procedural contour map generator
   Pipeline: seeded simplex fbm -> shaping -> scalar field grid
             -> marching squares -> polylines -> canvas / svg          */

// ---------------------------------------------------------------- noise

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAD3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

// Classic simplex noise (2D + 3D), seeded permutation table.
// The 3D variant drives the "morph" animation: the map is a moving z-slice.
function makeNoise(seed) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  const rnd = mulberry32(seed);
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }

  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const F3 = 1 / 3, G3 = 1 / 6;

  function noise2(xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;

    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      const g = GRAD3[permMod12[ii + perm[jj]]];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      const g = GRAD3[permMod12[ii + i1 + perm[jj + j1]]];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      const g = GRAD3[permMod12[ii + 1 + perm[jj + 1]]];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }
    return 70 * (n0 + n1 + n2); // ~[-1, 1]
  }

  function noise3(xin, yin, zin) {
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);

    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;

    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) {
      t0 *= t0;
      const g = GRAD3[permMod12[ii + perm[jj + perm[kk]]]];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0 + g[2] * z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) {
      t1 *= t1;
      const g = GRAD3[permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]]];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1 + g[2] * z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) {
      t2 *= t2;
      const g = GRAD3[permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]]];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2 + g[2] * z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) {
      t3 *= t3;
      const g = GRAD3[permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]]];
      n3 = t3 * t3 * (g[0] * x3 + g[1] * y3 + g[2] * z3);
    }
    return 32 * (n0 + n1 + n2 + n3); // ~[-1, 1]
  }

  return { noise2, noise3 };
}

// ---------------------------------------------------------------- palettes

const PALETTES = {
  paper: {
    name: 'Papier', bg: '#f7f2e6', line: '#8a6b44', index: '#5a4225',
    ramp: ['#efe7d2', '#e6dabb', '#d9caa1', '#c9b78a', '#b6a175', '#9d8961'],
    water: ['#8fb2ba', '#c3d8d6']
  },
  blueprint: {
    name: 'Blueprint', bg: '#0c2540', line: '#9ed2ff', index: '#eaf6ff',
    ramp: ['#0f3358', '#154270', '#1b5289', '#2263a3', '#2b76bd', '#3a8ad6'],
    water: ['#061627', '#0b2a45']
  },
  mono: {
    name: 'Mono', bg: '#101114', line: '#f0f0f0', index: '#ffffff',
    ramp: ['#17181b', '#212327', '#2d2f34', '#3a3d43', '#494c54', '#5a5e67'],
    water: ['#0a0b0d', '#141518']
  },
  forest: {
    name: 'Forêt', bg: '#f1f3ea', line: '#3f5c46', index: '#263a2b',
    ramp: ['#dfe7d2', '#c9d8b6', '#b0c79a', '#c2c390', '#cbb583', '#c3a077'],
    water: ['#6d97a5', '#a9c6c9']
  },
  ocean: {
    name: 'Abysses', bg: '#03121e', line: '#54d3de', index: '#c9fbff',
    ramp: ['#062231', '#083247', '#0a445e', '#0c5876', '#0f6e8e', '#1486a6'],
    water: ['#010a12', '#04202f']
  },
  neon: {
    name: 'Néon', bg: '#0a0116', line: '#ff45c8', index: '#8affff',
    ramp: ['#150429', '#22073f', '#310a58', '#440f74', '#5a1793', '#7422b3'],
    water: ['#050010', '#100226']
  },
  ember: {
    name: 'Braise', bg: '#1a0f0a', line: '#ffb066', index: '#ffe6c2',
    ramp: ['#2a150c', '#3d1d0f', '#542512', '#6e2f14', '#8a3b16', '#a84c19'],
    water: ['#0d0705', '#1f100a']
  }
};

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rampColor(stops, t) {
  t = Math.max(0, Math.min(0.999999, t));
  const f = t * (stops.length - 1);
  const i = Math.floor(f);
  const k = f - i;
  const a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k
  ];
}

const ASCII_RAMP = ' .:-=+*#%@';

// ---------------------------------------------------------------- controls

const CONTROLS = [
  {
    section: 'Terrain', items: [
      { k: 'seed', label: 'Graine', type: 'seed', value: 1337 },
      { k: 'scale', label: 'Échelle', type: 'range', min: 0.5, max: 14, step: 0.1, value: 2.2 },
      { k: 'octaves', label: 'Octaves', type: 'range', min: 1, max: 8, step: 1, value: 1 },
      { k: 'persistence', label: 'Rugosité', type: 'range', min: 0.2, max: 0.85, step: 0.01, value: 0.5 },
      { k: 'lacunarity', label: 'Lacunarité', type: 'range', min: 1.4, max: 3.2, step: 0.05, value: 2 },
      { k: 'warp', label: 'Distorsion', type: 'range', min: 0, max: 2, step: 0.01, value: 0.28 },
      {
        k: 'style', label: 'Profil', type: 'select', value: 'smooth', options: [
          ['smooth', 'Collines'], ['ridged', 'Crêtes'], ['billow', 'Dômes'], ['terraced', 'Terrasses']
        ]
      },
      { k: 'terraces', label: 'Paliers', type: 'range', min: 3, max: 24, step: 1, value: 8, when: s => s.style === 'terraced' },
      { k: 'relief', label: 'Contraste', type: 'range', min: 0.4, max: 2.5, step: 0.05, value: 1 },
      { k: 'island', label: 'Insularité', type: 'range', min: 0, max: 1, step: 0.01, value: 0.09 },
      { k: 'seaLevel', label: 'Niveau de la mer', type: 'range', min: 0, max: 0.6, step: 0.01, value: 0 }
    ]
  },
  {
    section: 'Courbes de niveau', items: [
      { k: 'levels', label: 'Nombre de lignes', type: 'range', min: 3, max: 80, step: 1, value: 16 },
      { k: 'lineWidth', label: 'Épaisseur', type: 'range', min: 0.25, max: 4, step: 0.05, value: 0.5 },
      { k: 'indexEvery', label: 'Ligne maîtresse', type: 'range', min: 0, max: 12, step: 1, value: 6 },
      { k: 'smoothing', label: 'Lissage', type: 'range', min: 0, max: 4, step: 1, value: 1 },
      { k: 'jitter', label: 'Tremblement', type: 'range', min: 0, max: 2.5, step: 0.05, value: 0 },
      { k: 'detail', label: 'Finesse', type: 'range', min: 1, max: 5, step: 1, value: 4 }
    ]
  },
  {
    section: 'Animation', items: [
      { k: 'animate', label: 'Lecture', type: 'toggle', value: true },
      {
        k: 'animMode', label: 'Mouvement', type: 'select', value: 'morph', options: [
          ['morph', 'Évolution'], ['drift', 'Survol'], ['sweep', 'Marée']
        ]
      },
      { k: 'speed', label: 'Vitesse', type: 'range', min: 0.01, max: 3, step: 0.01, value: 0.02 }
    ]
  },
  {
    section: 'Rendu', items: [
      {
        k: 'renderStyle', label: 'Style', type: 'select', value: 'vector', options: [
          ['vector', 'Vecteur'], ['pixel', 'Pixélisé']
        ]
      },
      { k: 'pixelSize', label: 'Taille des pixels', type: 'range', min: 2, max: 32, step: 1, value: 6, when: s => s.renderStyle === 'pixel' },
      {
        k: 'palette', label: 'Palette', type: 'select', value: 'ocean',
        options: Object.keys(PALETTES).map(k => [k, PALETTES[k].name])
      },
      {
        k: 'fill', label: 'Remplissage', type: 'select', value: 'none', options: [
          ['none', 'Aucun'], ['bands', 'Étagé'], ['smooth', 'Dégradé']
        ]
      },
      { k: 'shading', label: 'Ombrage', type: 'range', min: 0, max: 1, step: 0.01, value: 0.35, when: s => s.fill !== 'none' },
      { k: 'lineAlpha', label: 'Opacité des lignes', type: 'range', min: 0, max: 1, step: 0.01, value: 0.5 },
      { k: 'shoreline', label: 'Trait de côte', type: 'toggle', value: true, when: s => s.seaLevel > 0 }
    ]
  }
];

const DEFAULTS = {};
const ITEMS = [];
CONTROLS.forEach(g => g.items.forEach(it => { DEFAULTS[it.k] = it.value; ITEMS.push(it); }));

const state = Object.assign({}, DEFAULTS);

// ---------------------------------------------------------------- ui build

const els = {};
const controlsEl = document.getElementById('controls');

function fmt(item, v) {
  if (item.step >= 1) return String(v);
  return Number(v).toFixed(item.step < 0.1 ? 2 : 1);
}

CONTROLS.forEach(group => {
  const sec = document.createElement('section');
  sec.className = 'section';
  sec.innerHTML = `<h2>${group.section}</h2>`;

  group.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'ctl';
    row.dataset.key = item.k;

    if (item.type === 'range') {
      row.innerHTML =
        `<div class="ctl-label"><span>${item.label}</span><b id="val-${item.k}"></b></div>
         <input type="range" id="ctl-${item.k}" min="${item.min}" max="${item.max}" step="${item.step}" value="${item.value}">`;
      sec.appendChild(row);
      const input = row.querySelector('input');
      const out = row.querySelector('b');
      out.textContent = fmt(item, item.value);
      input.addEventListener('input', () => {
        state[item.k] = parseFloat(input.value);
        out.textContent = fmt(item, state[item.k]);
        refreshVisibility();
        requestRender();
      });
      els[item.k] = { input, out, item };

    } else if (item.type === 'select') {
      row.innerHTML =
        `<div class="ctl-label"><span>${item.label}</span></div>
         <select id="ctl-${item.k}">${item.options.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`;
      sec.appendChild(row);
      const input = row.querySelector('select');
      input.value = item.value;
      input.addEventListener('change', () => {
        state[item.k] = input.value;
        refreshVisibility();
        requestRender();
      });
      els[item.k] = { input, item };

    } else if (item.type === 'toggle') {
      row.innerHTML =
        `<label class="toggle"><span>${item.label}</span>
           <input type="checkbox" id="ctl-${item.k}" ${item.value ? 'checked' : ''}><i class="sw"></i>
         </label>`;
      sec.appendChild(row);
      const input = row.querySelector('input');
      input.addEventListener('change', () => {
        state[item.k] = input.checked;
        if (item.k === 'animate') syncPlayback();
        else requestRender();
      });
      els[item.k] = { input, item };

    } else if (item.type === 'seed') {
      row.innerHTML =
        `<div class="ctl-label"><span>${item.label}</span></div>
         <div class="seed-row">
           <input type="number" id="ctl-${item.k}" value="${item.value}" step="1">
           <button class="btn" id="btn-dice" style="flex:0 0 38px" title="Graine aléatoire">🎲</button>
         </div>`;
      sec.appendChild(row);
      const input = row.querySelector('input');
      input.addEventListener('input', () => {
        const v = parseInt(input.value, 10);
        if (!Number.isNaN(v)) { state.seed = v; requestRender(); }
      });
      row.querySelector('#btn-dice').addEventListener('click', newSeed);
      els[item.k] = { input, item };
    }
  });

  controlsEl.appendChild(sec);
});

function refreshVisibility() {
  ITEMS.forEach(item => {
    if (!item.when) return;
    const row = controlsEl.querySelector(`.ctl[data-key="${item.k}"]`);
    row.classList.toggle('hidden', !item.when(state));
  });
}

function syncUI() {
  ITEMS.forEach(item => {
    const e = els[item.k];
    if (!e) return;
    if (item.type === 'toggle') e.input.checked = state[item.k];
    else e.input.value = state[item.k];
    if (e.out) e.out.textContent = fmt(item, state[item.k]);
  });
  refreshVisibility();
}

// ---------------------------------------------------------------- field

// Animated renders re-normalize with a rolling average, otherwise the whole
// map "breathes" as the per-frame min/max of the field drift.
const norm1 = { lo: null, hi: null };
const norm2 = { lo: null, hi: null };

function smoothRange(slot, lo, hi) {
  if (!state.animate) { slot.lo = null; return [lo, hi]; }
  if (slot.lo === null) { slot.lo = lo; slot.hi = hi; }
  else { slot.lo += (lo - slot.lo) * 0.06; slot.hi += (hi - slot.hi) * 0.06; }
  return [slot.lo, slot.hi];
}

function buildField(w, h, cell, anim) {
  const gw = Math.ceil(w / cell) + 1;
  const gh = Math.ceil(h / cell) + 1;
  const field = new Float32Array(gw * gh);

  const nz = makeNoise(state.seed | 0);
  const noise = anim.z !== 0 ? (x, y) => nz.noise3(x, y, anim.z) : nz.noise2;
  const oct = state.octaves | 0;
  const per = state.persistence;
  const lac = state.lacunarity;

  function fbm(x, y) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      let n = noise(x * freq, y * freq);
      if (state.style === 'ridged') n = 1 - 2 * Math.abs(n);
      else if (state.style === 'billow') n = 2 * Math.abs(n) - 1;
      sum += amp * n;
      norm += amp;
      amp *= per;
      freq *= lac;
    }
    return sum / norm;
  }

  const minDim = Math.min(w, h);
  const k = state.scale / minDim;
  const warp = state.warp;

  let lo = Infinity, hi = -Infinity;

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let x = gx * cell * k + anim.ox;
      let y = gy * cell * k + anim.oy;

      if (warp > 0) {
        const wx = noise(x + 5.2, y + 1.3);
        const wy = noise(x + 9.7, y + 2.8);
        x += warp * wx;
        y += warp * wy;
      }

      let v = fbm(x, y) * 0.5 + 0.5; // -> [0,1]
      field[gy * gw + gx] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }

  // normalize, then shape
  [lo, hi] = smoothRange(norm1, lo, hi);
  const span = Math.max(1e-6, hi - lo);
  const gamma = state.relief;
  const island = state.island;
  const terr = state.terraces | 0;
  const cx = (gw - 1) / 2, cy = (gh - 1) / 2;
  const rx = cx || 1, ry = cy || 1;

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const i = gy * gw + gx;
      let v = (field[i] - lo) / span;

      if (gamma !== 1) v = Math.pow(v, gamma);

      if (state.style === 'terraced') {
        const t = v * terr;
        const f = Math.floor(t);
        const frac = t - f;
        // soft step: mostly flat, quick riser
        const eased = frac < 0.75 ? 0 : (frac - 0.75) / 0.25;
        v = (f + eased * 0.98) / terr;
      }

      if (island > 0) {
        const dx = (gx - cx) / rx, dy = (gy - cy) / ry;
        const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
        const s = d < 0.35 ? 1 : 1 - Math.pow((d - 0.35) / 0.65, 1.6);
        v = v * (1 - island) + v * s * island;
      }

      field[i] = v;
    }
  }

  // re-normalize after shaping so contour levels always span the terrain
  lo = Infinity; hi = -Infinity;
  for (let i = 0; i < field.length; i++) {
    if (field[i] < lo) lo = field[i];
    if (field[i] > hi) hi = field[i];
  }
  [lo, hi] = smoothRange(norm2, lo, hi);
  const span2 = Math.max(1e-6, hi - lo);
  for (let i = 0; i < field.length; i++) field[i] = (field[i] - lo) / span2;

  return { field, gw, gh, cell };
}

// ---------------------------------------------------------------- contours

function ip(a, b, level) {
  const d = b - a;
  if (Math.abs(d) < 1e-9) return 0.5;
  return Math.max(0, Math.min(1, (level - a) / d));
}

// A crossing point always sits on a grid edge, so each one gets an exact
// integer id — horizontal edges are even, vertical edges odd. Joining
// segments by id is both faster and safer than matching rounded coordinates.
// Returns a flat segment list: [pointA, pointB, idA, idB].
function marchingSquares(field, gw, gh, level) {
  const segs = [];

  for (let y = 0; y < gh - 1; y++) {
    const r0 = y * gw, r1 = (y + 1) * gw;
    for (let x = 0; x < gw - 1; x++) {
      const v0 = field[r0 + x], v1 = field[r0 + x + 1];
      const v2 = field[r1 + x + 1], v3 = field[r1 + x];

      let idx = 0;
      if (v0 > level) idx |= 8;
      if (v1 > level) idx |= 4;
      if (v2 > level) idx |= 2;
      if (v3 > level) idx |= 1;
      if (idx === 0 || idx === 15) continue;

      //          e0 (top)
      //      p0 ---------- p1
      //  e3  |              |  e1
      //      p3 ---------- p2
      //          e2 (bottom)
      const P = [
        [x + ip(v0, v1, level), y],
        [x + 1, y + ip(v1, v2, level)],
        [x + ip(v3, v2, level), y + 1],
        [x, y + ip(v0, v3, level)]
      ];
      const ID = [
        (r0 + x) * 2,
        (r0 + x + 1) * 2 + 1,
        (r1 + x) * 2,
        (r0 + x) * 2 + 1
      ];
      const seg = (a, b) => segs.push([P[a], P[b], ID[a], ID[b]]);

      switch (idx) {
        case 1: case 14: seg(2, 3); break;
        case 2: case 13: seg(1, 2); break;
        case 3: case 12: seg(1, 3); break;
        case 4: case 11: seg(0, 1); break;
        case 6: case 9: seg(0, 2); break;
        case 7: case 8: seg(0, 3); break;
        case 5: case 10: {
          const center = (v0 + v1 + v2 + v3) / 4;
          const flip = idx === 5 ? center <= level : center > level;
          if (flip) { seg(0, 1); seg(2, 3); }
          else { seg(0, 3); seg(1, 2); }
          break;
        }
      }
    }
  }
  return segs;
}

function joinSegments(segs) {
  const map = new Map();

  for (let i = 0; i < segs.length; i++) {
    const ka = segs[i][2], kb = segs[i][3];
    let a = map.get(ka); if (!a) { a = []; map.set(ka, a); } a.push(i);
    let b = map.get(kb); if (!b) { b = []; map.set(kb, b); } b.push(i);
  }

  const used = new Uint8Array(segs.length);
  const lines = [];

  const pick = k => {
    const list = map.get(k);
    if (!list) return -1;
    for (let n = 0; n < list.length; n++) if (!used[list[n]]) return list[n];
    return -1;
  };

  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const pts = [segs[i][0], segs[i][1]];

    let endKey = segs[i][3];
    for (;;) {
      const j = pick(endKey);
      if (j < 0) break;
      used[j] = 1;
      if (segs[j][2] === endKey) { pts.push(segs[j][1]); endKey = segs[j][3]; }
      else { pts.push(segs[j][0]); endKey = segs[j][2]; }
    }

    let startKey = segs[i][2];
    for (;;) {
      const j = pick(startKey);
      if (j < 0) break;
      used[j] = 1;
      if (segs[j][2] === startKey) { pts.unshift(segs[j][1]); startKey = segs[j][3]; }
      else { pts.unshift(segs[j][0]); startKey = segs[j][2]; }
    }

    if (pts.length > 2) lines.push(pts);
  }
  return lines;
}

function chaikin(pts, passes) {
  const closed = pts.length > 3 &&
    Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 1e-6 &&
    Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 1e-6;

  let cur = pts;
  for (let p = 0; p < passes; p++) {
    if (cur.length < 3) break;
    const out = [];
    if (!closed) out.push(cur[0]);
    for (let i = 0; i < cur.length - 1; i++) {
      const a = cur[i], b = cur[i + 1];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(cur[cur.length - 1]);
    else out.push(out[0]);
    cur = out;
  }
  return cur;
}

function hash01(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) - 0.5;
}

// Build all contour polylines, in canvas pixel space.
// `phase` (0..1) slides every level up by a fraction of the interval: the
// contours march uphill and the set loops seamlessly when it wraps.
function buildContours(fieldData, phase, wraps) {
  const { field, gw, gh, cell } = fieldData;
  const n = Math.max(2, state.levels | 0);
  const every = state.indexEvery | 0;
  const out = [];

  for (let i = 1 - (phase > 0 ? 1 : 0); i < n; i++) {
    const level = (i + phase) / n;
    if (level <= 0 || level >= 1) continue;
    const segs = marchingSquares(field, gw, gh, level);
    if (!segs.length) continue;

    let lines = joinSegments(segs);
    const smooth = state.smoothing | 0;
    const jit = state.jitter;

    lines = lines.map(pts => {
      let p = smooth > 0 ? chaikin(pts, smooth) : pts;
      const res = new Array(p.length);
      for (let q = 0; q < p.length; q++) {
        let px = p[q][0] * cell, py = p[q][1] * cell;
        if (jit > 0) {
          px += hash01(px * 7, py * 13, i) * jit * 2;
          py += hash01(py * 11, px * 3, i + 91) * jit * 2;
        }
        res[q] = [px, py];
      }
      return res;
    });

    const isIndex = every > 0 && (((i - wraps) % every) + every) % every === 0;
    out.push({ level, index: isIndex, lines });
  }
  return out;
}

// ---------------------------------------------------------------- render

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');
const statEl = document.getElementById('stat');

let dpr = 1, W = 0, H = 0;
let lastContours = null, lastPalette = null;

function resize() {
  const r = stage.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(64, Math.floor(r.width));
  H = Math.max(64, Math.floor(r.height));
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}

const CELL_FOR_DETAIL = [8, 6, 4, 3, 2];

function paintFill(fieldData, pal) {
  const { field, gw, gh, cell } = fieldData;
  const n = Math.max(2, state.levels | 0);
  const sea = state.seaLevel;
  const bands = state.fill === 'bands';
  const shadeAmt = state.shading;

  const landRamp = pal.ramp.map(hexToRgb);
  const waterRamp = pal.water.map(hexToRgb);

  // hillshade at grid resolution
  let shade = null;
  if (shadeAmt > 0) {
    shade = new Float32Array(gw * gh);
    const ex = 22;
    const lx = -0.55, ly = -0.55, lz = 0.63;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const xm = Math.max(0, x - 1), xp = Math.min(gw - 1, x + 1);
        const ym = Math.max(0, y - 1), yp = Math.min(gh - 1, y + 1);
        const dzx = (field[y * gw + xp] - field[y * gw + xm]) * ex;
        const dzy = (field[yp * gw + x] - field[ym * gw + x]) * ex;
        const len = Math.sqrt(dzx * dzx + dzy * dzy + 1);
        shade[y * gw + x] = (-dzx * lx - dzy * ly + lz) / len;
      }
    }
  }

  const cw = canvas.width, ch = canvas.height;
  const img = ctx.createImageData(cw, ch);
  const data = img.data;
  const inv = 1 / (dpr * cell);

  for (let py = 0; py < ch; py++) {
    const fy = py * inv;
    const y0 = Math.min(gh - 1, fy | 0);
    const y1 = Math.min(gh - 1, y0 + 1);
    const ty = fy - y0;

    for (let px = 0; px < cw; px++) {
      const fx = px * inv;
      const x0 = Math.min(gw - 1, fx | 0);
      const x1 = Math.min(gw - 1, x0 + 1);
      const tx = fx - x0;

      const a = field[y0 * gw + x0], b = field[y0 * gw + x1];
      const c = field[y1 * gw + x0], d = field[y1 * gw + x1];
      let h = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;

      let col;
      if (sea > 0 && h < sea) {
        let t = h / sea;
        if (state.fill === 'bands') {
          const band = Math.floor(h * n);
          t = Math.min(1, ((band + 0.5) / n) / sea);
        }
        col = rampColor(waterRamp, t);
      } else {
        let t = sea > 0 ? (h - sea) / (1 - sea) : h;
        if (state.fill === 'bands') {
          const band = Math.floor(h * n);
          const hb = (band + 0.5) / n;
          t = sea > 0 ? (hb - sea) / (1 - sea) : hb;
        }
        col = rampColor(landRamp, t);
      }

      let r = col[0], g = col[1], bl = col[2];

      if (shade) {
        const sa = shade[y0 * gw + x0], sb = shade[y0 * gw + x1];
        const sc = shade[y1 * gw + x0], sd = shade[y1 * gw + x1];
        const s = (sa + (sb - sa) * tx) * (1 - ty) + (sc + (sd - sc) * tx) * ty;
        const f = shadeFactor(s, bands);
        r *= f; g *= f; bl *= f;
      }

      const o = (py * cw + px) << 2;
      data[o] = r < 0 ? 0 : r > 255 ? 255 : r;
      data[o + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[o + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function strokeLines(lines) {
  ctx.beginPath();
  for (let i = 0; i < lines.length; i++) {
    const p = lines[i];
    ctx.moveTo(p[0][0], p[0][1]);
    if (p.length === 2) { ctx.lineTo(p[1][0], p[1][1]); continue; }
    for (let q = 1; q < p.length - 1; q++) {
      const mx = (p[q][0] + p[q + 1][0]) / 2;
      const my = (p[q][1] + p[q + 1][1]) / 2;
      ctx.quadraticCurveTo(p[q][0], p[q][1], mx, my);
    }
    ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
  }
  ctx.stroke();
}

// Mosaic post-process. The finished frame is averaged down (smoothing on, so
// hairline contours survive as dimmer blocks instead of dropping out) and blown
// back up with nearest-neighbour. `size` is a block edge in CSS px.
let mosaicCanvas = null, mosaicCtx = null;

function pixelate(size) {
  const block = Math.max(2, size | 0) * dpr;
  const w = Math.max(1, Math.ceil(canvas.width / block));
  const h = Math.max(1, Math.ceil(canvas.height / block));

  if (!mosaicCanvas) {
    mosaicCanvas = document.createElement('canvas');
    mosaicCtx = mosaicCanvas.getContext('2d');
  }
  if (mosaicCanvas.width !== w || mosaicCanvas.height !== h) {
    mosaicCanvas.width = w;
    mosaicCanvas.height = h;
  }

  mosaicCtx.clearRect(0, 0, w, h);
  mosaicCtx.imageSmoothingEnabled = true;
  mosaicCtx.drawImage(canvas, 0, 0, w, h);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(mosaicCanvas, 0, 0, w, h, 0, 0, w * block, h * block);
  ctx.imageSmoothingEnabled = true;
}

// ---------------------------------------------------------------- fill helpers

// Lambert term -> brightness multiplier. In `bands` mode the term is posterized
// first, so the hillshade keeps the colour layers flat instead of smearing a
// continuous gradient back over them.
const BAND_SHADE_STEPS = 5;

function shadeFactor(s, bands) {
  if (bands) s = (Math.floor(s * BAND_SHADE_STEPS) + 0.5) / BAND_SHADE_STEPS;
  const f = 1 + state.shading * (s - 0.62) * 2.2;
  return f < 0.25 ? 0.25 : f > 1.75 ? 1.75 : f;
}

// height (+ optional bands quantization) -> [0,1] land/water-normalized t
function heightToT(h, sea, bands, n) {
  let hb = h;
  if (bands) { const band = Math.floor(h * n); hb = (band + 0.5) / n; }
  if (sea > 0 && hb < sea) return hb / sea;
  return sea > 0 ? (hb - sea) / (1 - sea) : hb;
}

// Plain character grid of the current terrain, for the TXT export.
function buildAsciiText(fieldData, cols) {
  const { field, gw, gh } = fieldData;
  const sea = state.seaLevel;
  const n = Math.max(2, state.levels | 0);
  const bands = state.fill === 'bands';
  const rows = Math.max(1, Math.round(cols * (H / W) * 0.5));
  let out = '';
  for (let ry = 0; ry < rows; ry++) {
    const fy = ((ry + 0.5) / rows) * (gh - 1);
    const y0 = Math.min(gh - 1, fy | 0), y1 = Math.min(gh - 1, y0 + 1), ty = fy - y0;
    for (let rx = 0; rx < cols; rx++) {
      const fx = ((rx + 0.5) / cols) * (gw - 1);
      const x0 = Math.min(gw - 1, fx | 0), x1 = Math.min(gw - 1, x0 + 1), tx = fx - x0;
      const a = field[y0 * gw + x0], b = field[y0 * gw + x1];
      const c = field[y1 * gw + x0], d = field[y1 * gw + x1];
      const h = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
      const t = Math.max(0, Math.min(0.999999, heightToT(h, sea, bands, n)));
      out += ASCII_RAMP[Math.floor(t * ASCII_RAMP.length)];
    }
    out += '\n';
  }
  return out;
}

// ---------------------------------------------------------------- animation

let animZ = 0, driftX = 0, driftY = 0, phase = 0, wraps = 0;
let rafId = 0, lastT = 0, fps = 0;
let fieldCache = { key: null, data: null };

function animOffsets() {
  if (state.animMode === 'morph') return { z: animZ, ox: 0, oy: 0 };
  if (state.animMode === 'drift') return { z: 0, ox: driftX, oy: driftY };
  return { z: 0, ox: 0, oy: 0 };
}

function fieldKey(cell, anim) {
  return [
    W, H, cell, state.seed, state.scale, state.octaves, state.persistence,
    state.lacunarity, state.warp, state.style, state.terraces, state.relief,
    state.island, state.animate, anim.z, anim.ox, anim.oy
  ].join('|');
}

function advance(dt) {
  const sp = state.speed;
  if (state.animMode === 'morph') {
    animZ += 0.12 * sp * dt;
  } else if (state.animMode === 'drift') {
    driftX += 0.085 * sp * state.scale * dt;
    driftY += 0.048 * sp * state.scale * dt;
  } else {
    phase += 0.16 * sp * dt;
    while (phase >= 1) { phase -= 1; wraps++; }
  }
}

function loop(ts) {
  if (!state.animate || document.hidden) { rafId = 0; return; }
  const dt = Math.min(0.05, Math.max(0, (ts - lastT) / 1000));
  lastT = ts;
  fps = fps ? fps * 0.9 + (1 / Math.max(dt, 1e-3)) * 0.1 : 1 / Math.max(dt, 1e-3);
  advance(dt);
  render();
  rafId = requestAnimationFrame(loop);
}

function syncPlayback() {
  const should = state.animate && !document.hidden;
  if (should && !rafId) {
    lastT = performance.now();
    fps = 0;
    rafId = requestAnimationFrame(loop);
  } else if (!should && rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    requestRender(); // one clean frame with exact (unsmoothed) normalization
  }
}

document.addEventListener('visibilitychange', syncPlayback);

// ---------------------------------------------------------------- draw

function render() {
  const t0 = performance.now();
  const pal = PALETTES[state.palette];
  const cell = CELL_FOR_DETAIL[(state.detail | 0) - 1];
  const anim = animOffsets();

  const key = fieldKey(cell, anim);
  let fieldData;
  if (fieldCache.key === key) {
    fieldData = fieldCache.data;
  } else {
    fieldData = buildField(W, H, cell, anim);
    fieldCache = { key, data: fieldData };
  }

  const sweeping = state.animate && state.animMode === 'sweep';
  const contours = buildContours(fieldData, sweeping ? phase : 0, sweeping ? wraps : 0);
  lastContours = contours;
  lastPalette = pal;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let count = 0;
  contours.forEach(c => { count += c.lines.length; });

  if (state.fill !== 'none') paintFill(fieldData, pal);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = state.lineAlpha;

  contours.forEach(c => {
    const isShore = state.shoreline && state.seaLevel > 0 &&
      Math.abs(c.level - state.seaLevel) <= 0.5 / Math.max(2, state.levels | 0);
    ctx.strokeStyle = (c.index || isShore) ? pal.index : pal.line;
    ctx.lineWidth = state.lineWidth * (isShore ? 2.6 : c.index ? 2 : 1);
    strokeLines(c.lines);
  });

  ctx.globalAlpha = 1;

  if (state.renderStyle === 'pixel') pixelate(state.pixelSize);

  statEl.textContent = `${contours.length} niveaux · ${count} courbes · ` +
    (rafId ? `${fps.toFixed(0)} fps` : `${(performance.now() - t0).toFixed(0)} ms`);
}

let pending = false;
function requestRender() {
  if (pending || rafId) return; // the animation loop already redraws every frame
  pending = true;
  requestAnimationFrame(() => { pending = false; render(); });
}

// ---------------------------------------------------------------- actions

function newSeed() {
  state.seed = Math.floor(Math.random() * 1e6);
  els.seed.input.value = state.seed;
  requestRender();
}

function randomizeAll() {
  const rr = (a, b) => a + Math.random() * (b - a);
  state.seed = Math.floor(Math.random() * 1e6);
  state.scale = rr(1.5, 8);
  state.octaves = Math.floor(rr(3, 8));
  state.persistence = rr(0.35, 0.7);
  state.lacunarity = rr(1.7, 2.6);
  state.warp = rr(0, 1.1);
  state.style = ['smooth', 'smooth', 'ridged', 'billow', 'terraced'][Math.floor(Math.random() * 5)];
  state.terraces = Math.floor(rr(4, 16));
  state.relief = rr(0.6, 1.8);
  state.island = Math.random() < 0.4 ? rr(0.4, 1) : 0;
  state.seaLevel = Math.random() < 0.45 ? rr(0.1, 0.45) : 0;
  state.levels = Math.floor(rr(10, 45));
  state.smoothing = Math.floor(rr(0, 3));
  state.palette = Object.keys(PALETTES)[Math.floor(Math.random() * Object.keys(PALETTES).length)];
  state.fill = ['none', 'bands', 'bands', 'smooth'][Math.floor(Math.random() * 4)];
  syncUI();
  requestRender();
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportPNG() {
  canvas.toBlob(b => download(b, `topography-${state.seed}.png`), 'image/png');
}

function exportTXT() {
  if (!fieldCache.data) return;
  const txt = buildAsciiText(fieldCache.data, 120);
  download(new Blob([txt], { type: 'text/plain' }), `topography-${state.seed}.txt`);
}

function exportSVG() {
  if (!lastContours) return;
  const pal = lastPalette;
  const n = Math.max(2, state.levels | 0);
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="${W}" height="${H}" fill="${pal.bg}"/>`
  ];

  parts.push(`<g fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${state.lineAlpha}">`);
  lastContours.forEach(c => {
    const isShore = state.shoreline && state.seaLevel > 0 &&
      Math.abs(c.level - state.seaLevel) <= 0.5 / n;
    const stroke = (c.index || isShore) ? pal.index : pal.line;
    const w = state.lineWidth * (isShore ? 2.6 : c.index ? 2 : 1);
    const d = c.lines.map(p =>
      'M' + p.map(pt => `${pt[0].toFixed(2)} ${pt[1].toFixed(2)}`).join('L')
    ).join('');
    parts.push(`<path d="${d}" stroke="${stroke}" stroke-width="${w.toFixed(2)}"/>`);
  });
  parts.push('</g>');

  parts.push('</svg>');
  download(new Blob([parts.join('\n')], { type: 'image/svg+xml' }), `topography-${state.seed}.svg`);
}

// Records the live canvas: starts playback if paused, click again to save.
let recorder = null, chunks = [];

function toggleRecord() {
  const btn = document.getElementById('btn-webm');
  if (recorder) { recorder.stop(); return; }

  if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
    alert("L'enregistrement vidéo n'est pas supporté par ce navigateur.");
    return;
  }
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m));
  if (!mime) {
    alert("Aucun encodeur WebM disponible.");
    return;
  }

  if (!state.animate) {
    state.animate = true;
    els.animate.input.checked = true;
    syncPlayback();
  }

  chunks = [];
  recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 12e6 });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    download(new Blob(chunks, { type: 'video/webm' }), `topography-${state.seed}.webm`);
    recorder = null;
    btn.textContent = 'WebM';
    btn.classList.remove('rec');
  };
  recorder.start();
  btn.textContent = '■ Stop';
  btn.classList.add('rec');
}

document.getElementById('btn-webm').addEventListener('click', toggleRecord);
document.getElementById('btn-seed').addEventListener('click', newSeed);
document.getElementById('btn-random').addEventListener('click', randomizeAll);
document.getElementById('btn-png').addEventListener('click', exportPNG);
document.getElementById('btn-svg').addEventListener('click', exportSVG);
document.getElementById('btn-txt').addEventListener('click', exportTXT);
document.getElementById('btn-reset').addEventListener('click', () => {
  Object.assign(state, DEFAULTS);
  syncUI();
  syncPlayback();
  requestRender();
});

window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'r' || e.key === 'R') newSeed();
  if (e.key === 's' || e.key === 'S') exportPNG();
  if (e.code === 'Space') {
    e.preventDefault();
    state.animate = !state.animate;
    els.animate.input.checked = state.animate;
    syncPlayback();
  }
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { resize(); render(); }, 120);
});

syncUI();
resize();
render();
syncPlayback();
