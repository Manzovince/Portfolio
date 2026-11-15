// Isometric renderer: flat-shaded stacked tiles, geometric decor, boats with tapa sails.

import { BIOMES, ZONES, SPECIES } from './data.js';
import { islandsInRect, zoneF } from './world.js';
import { hashf } from './rng.js';

// ---------- colour helpers ----------
const ccache = new Map();
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = typeof a === 'string' ? hexRgb(a) : a, B = typeof b === 'string' ? hexRgb(b) : b;
  return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
}
const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
function shade(hex, amt) {
  const k = hex + amt;
  let v = ccache.get(k);
  if (!v) {
    const c = hexRgb(hex);
    const t = amt < 0 ? [28, 22, 60] : [255, 248, 235];
    v = rgb(mix(c, t, Math.abs(amt)));
    ccache.set(k, v);
  }
  return v;
}

// Real-clock light: returns sky tint and darkness.
export function daylight(date = new Date()) {
  const forced = typeof window !== 'undefined' && window.MOTU_HOUR;
  const h = forced != null && forced !== undefined && forced !== false ? +forced : date.getHours() + date.getMinutes() / 60;
  const keys = [
    [0, [70, 80, 170], 0.42], [5, [90, 90, 180], 0.36], [6.5, [255, 170, 150], 0.22], [8, [255, 235, 210], 0.0],
    [17, [255, 225, 190], 0.0], [19, [255, 150, 120], 0.24], [20.5, [130, 100, 190], 0.34], [22, [70, 80, 170], 0.42], [24, [70, 80, 170], 0.42],
  ];
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] <= h) i++;
  const [h0, c0, a0] = keys[i], [h1, c1, a1] = keys[i + 1];
  const t = (h - h0) / (h1 - h0);
  return { tint: mix(c0, c1, t), alpha: a0 + (a1 - a0) * t, night: a0 + (a1 - a0) * t > 0.3, hour: h };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  let TW = 44, TH = 22, TZ = 13;
  let cx = 0, cy = 0, CY = 0.5;
  const hits = [];
  const wake = [];
  const creatures = new Map(); // island id -> ambient creatures

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  }

  const P = (x, y, z = 0) => [
    (x - y - (cx - cy)) * TW / 2 + W / 2,
    (x + y - (cx + cy)) * TH / 2 - z * TZ + H * CY,
  ];
  function screenToWorld(X, Y) {
    const u = (X - W / 2) / (TW / 2), v = (Y - H * CY) / (TH / 2);
    const a = u + (cx - cy), b = v + (cx + cy);
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  function poly(pts, fill) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function diamond(tx, ty, z, fill, inset = 0) {
    poly([P(tx + inset, ty + inset, z), P(tx + 1 - inset, ty + inset, z), P(tx + 1 - inset, ty + 1 - inset, z), P(tx + inset, ty + 1 - inset, z)], fill);
  }
  // Axis-aligned iso box from (x,y,z) of size (w,d,h), top colour c.
  function box(x, y, z, w, d, h, c, sideL = -0.2, sideR = -0.36) {
    poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], shade(c, sideL));
    poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], shade(c, sideR));
    poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], c);
  }

  // ---------- island tiles ----------
  function tileColor(isle, t) {
    const B = BIOMES[isle.biome];
    if (B.volcano && t.h >= isle.peak.h - 1) return B.rock;
    if (t.h === 1 && isle.biome !== 'mangrove') return B.sand;
    const k = Math.min(1, (t.h - 1) / Math.max(1, B.maxH - 1));
    return rgbHex(mix(B.low, B.high, k));
  }
  function rgbHex(c) { return '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); }

  function drawColumn(isle, t, time) {
    const B = BIOMES[isle.biome];
    const top = tileColor(isle, t);
    const side = B.terraced || B.cliffs || B.volcano ? B.rock : (t.h === 1 ? B.sand : B.rock);
    const hl = isle.tiles.get(t.tx + ',' + (t.ty + 1)) || 0;
    const hr = isle.tiles.get((t.tx + 1) + ',' + t.ty) || 0;
    // strata: one band per level, alternating, Monument-Valley style
    const face = (nh, left) => {
      for (let L = nh; L < t.h; L++) {
        const z0 = L === 0 ? -0.35 : L, z1 = L + 1;
        const odd = (L + (B.terraced ? 0 : 1)) & 1;
        const band = left ? (odd ? -0.14 : -0.2) : (odd ? -0.3 : -0.36);
        const c = L === t.h - 1 && t.h > 1 && !B.terraced ? top : side;
        const pts = left
          ? [P(t.tx, t.ty + 1, z0), P(t.tx + 1, t.ty + 1, z0), P(t.tx + 1, t.ty + 1, z1), P(t.tx, t.ty + 1, z1)]
          : [P(t.tx + 1, t.ty, z0), P(t.tx + 1, t.ty + 1, z0), P(t.tx + 1, t.ty + 1, z1), P(t.tx + 1, t.ty, z1)];
        poly(pts, shade(c, band));
      }
    };
    face(hl, true);
    face(hr, false);
    diamond(t.tx, t.ty, t.h, top);
    // lava in volcano craters
    if (B.volcano && isle.r > 4 && t.h < isle.peak.h - 1 && Math.hypot(t.tx + 0.5 - isle.x, t.ty + 0.5 - isle.y) < isle.r * 0.3) {
      const g = 0.5 + 0.5 * Math.sin(time * 2 + t.tx);
      diamond(t.tx, t.ty, t.h + 0.01, `rgba(255,${120 + g * 60},60,0.85)`, 0.12);
    }
  }

  // ---------- decor ----------
  function palm(x, y, z, s, time) {
    const sway = Math.sin(time * 1.3 + s * 10) * 0.06;
    const [bx, by] = P(x, y, z);
    const [tx, ty] = P(x + 0.12 + sway, y - 0.1, z + 2.2 + s * 0.4);
    ctx.strokeStyle = '#8a6440'; ctx.lineWidth = Math.max(1.5, TW * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + TW * 0.12, (by + ty) / 2, tx, ty); ctx.stroke();
    const L = TW * 0.42;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + s * 3 + sway;
      const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.45 + L * 0.18;
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo((tx + ex) / 2 + Math.sin(a) * 4, (ty + ey) / 2 - L * 0.25, ex, ey);
      ctx.quadraticCurveTo((tx + ex) / 2, (ty + ey) / 2 - L * 0.05, tx, ty);
      ctx.fillStyle = i % 2 ? '#4f9a5a' : '#62b06a'; ctx.fill();
    }
    ctx.fillStyle = '#6b4a2a';
    ctx.beginPath(); ctx.arc(tx, ty + 2, TW * 0.05, 0, 7); ctx.fill();
  }
  function tree(x, y, z, s, c1 = '#3f9a64', c2 = '#2c7a55') {
    const [bx, by] = P(x, y, z);
    ctx.fillStyle = '#6a4a32'; ctx.fillRect(bx - TW * 0.03, by - TZ * 1.0, TW * 0.06, TZ * 1.0);
    const r = TW * (0.3 + s * 0.12);
    const cyy = by - TZ * 1.0 - r * 0.6;
    // low-poly blob: two half hexagons
    const hex = (ox, oy, rr, col) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; ctx.lineTo(ox + Math.cos(a) * rr, oy + Math.sin(a) * rr * 0.9); }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };
    hex(bx, cyy, r, c2);
    ctx.save(); ctx.beginPath(); ctx.rect(bx - r, cyy - r, r, r * 2); ctx.clip();
    hex(bx, cyy, r, c1); ctx.restore();
    hex(bx + r * 0.25, cyy - r * 0.75, r * 0.6, c1);
  }
  function fern(x, y, z, s) {
    const [bx, by] = P(x, y, z);
    ctx.fillStyle = s > 0.5 ? '#5aa86a' : '#4c9460';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.lineTo(bx + i * TW * 0.08 - TW * 0.03, by - TZ * (0.9 - Math.abs(i) * 0.2));
      ctx.lineTo(bx + i * TW * 0.08 + TW * 0.03, by - TZ * (0.9 - Math.abs(i) * 0.2));
      ctx.closePath(); ctx.fill();
    }
  }
  function mangrove(x, y, z, s) {
    const [bx, by] = P(x, y, z);
    ctx.strokeStyle = '#6a5a3e'; ctx.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(bx + i * TW * 0.12, by + 2);
      ctx.quadraticCurveTo(bx + i * TW * 0.06, by - TZ * 0.9, bx, by - TZ * 1.0); ctx.stroke();
    }
    tree(x, y, z + 0.6, s * 0.6, '#5e9a62', '#467e52');
  }
  function cactus(x, y, z, s) {
    box(x - 0.06, y - 0.06, z, 0.12, 0.12, 1.4 + s, '#5f9e6a');
    box(x + 0.06, y - 0.04, z + 0.6, 0.18, 0.08, 0.1, '#5f9e6a');
    box(x + 0.18, y - 0.04, z + 0.6, 0.08, 0.08, 0.6, '#5f9e6a');
  }
  function agave(x, y, z) {
    const [bx, by] = P(x, y, z);
    ctx.fillStyle = '#7fb59a';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.38;
      ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.lineTo(bx + Math.cos(a) * TW * 0.3, by + Math.sin(a) * TZ * 1.1); ctx.lineTo(bx + 3, by); ctx.fill();
    }
  }
  function rock(x, y, z, s, c = '#8a8f9e') { box(x - 0.2, y - 0.15, z, 0.36 + s * 0.1, 0.3, 0.35 + s * 0.3, c); }
  function tikiSmall(x, y, z) { box(x - 0.12, y - 0.12, z, 0.24, 0.24, 1.3, '#9a7458'); face(x, y, z + 0.8, 0.24); }
  function face(x, y, z, w) {
    const [ax, ay] = P(x - w / 2, y + w / 2, z), [bx, by] = P(x + w / 2, y + w / 2, z);
    ctx.strokeStyle = 'rgba(30,20,30,0.7)'; ctx.lineWidth = Math.max(1, TW * 0.025);
    ctx.beginPath(); ctx.moveTo(ax + (bx - ax) * 0.25, ay + (by - ay) * 0.25); ctx.lineTo(ax + (bx - ax) * 0.42, ay + (by - ay) * 0.42);
    ctx.moveTo(ax + (bx - ax) * 0.58, ay + (by - ay) * 0.58); ctx.lineTo(ax + (bx - ax) * 0.75, ay + (by - ay) * 0.75); ctx.stroke();
    const [mx, my] = P(x, y + w / 2, z - 0.35);
    ctx.beginPath(); ctx.moveTo(mx - TW * 0.05, my); ctx.lineTo(mx + TW * 0.05, my); ctx.stroke();
  }

  function hut(x, y, z, night, chantier) {
    if (night) {
      const [lx, ly] = P(x, y + 0.45, z);
      const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, TW * 0.75);
      g.addColorStop(0, 'rgba(255,200,110,0.85)'); g.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = g; ctx.fillRect(lx - TW, ly - TW, TW * 2, TW * 2);
    }
    box(x - 0.3, y - 0.25, z, 0.6, 0.5, 0.75, '#e6d2a8', -0.15, -0.3);
    // thatch: a ridge along x
    const a = P(x - 0.38, y + 0.33, z + 0.7), b = P(x + 0.38, y + 0.33, z + 0.7), c = P(x + 0.38, y - 0.33, z + 0.7), d = P(x - 0.38, y - 0.33, z + 0.7);
    const r1 = P(x - 0.38, y, z + 1.6), r2 = P(x + 0.38, y, z + 1.6);
    poly([a, b, r2, r1], '#c99a52');
    poly([b, c, r2], '#a87a3c');
    poly([d, a, r1], '#d8ad66');
    if (chantier) {
      ctx.strokeStyle = '#7a5434'; ctx.lineWidth = Math.max(1, TW * 0.03);
      for (let i = 0; i < 4; i++) {
        const [px, py] = P(x + 0.5 + i * 0.12, y + 0.4, z);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - TZ * 0.7); ctx.stroke();
      }
    }
  }

  function site(type, x, y, z, time) {
    if (type === 'marae') {
      box(x - 0.45, y - 0.45, z, 0.9, 0.9, 0.2, '#b9b2a6');
      box(x - 0.32, y - 0.32, z + 0.2, 0.64, 0.64, 0.2, '#a7a093');
      box(x - 0.18, y - 0.18, z + 0.4, 0.36, 0.36, 0.2, '#958e82');
      box(x - 0.04, y - 0.04, z + 0.6, 0.08, 0.08, 1.0, '#7c6a58');
    } else if (type === 'tiki') {
      box(x - 0.18, y - 0.18, z, 0.36, 0.36, 1.8, '#8a6a50'); face(x, y, z + 1.3, 0.36);
      box(x - 0.24, y - 0.24, z + 1.8, 0.48, 0.48, 0.15, '#7a5a42');
    } else if (type === 'moai') {
      box(x - 0.2, y - 0.14, z, 0.4, 0.28, 2.2, '#5d5d68'); face(x, y, z + 1.6, 0.4);
      box(x - 0.16, y - 0.12, z + 2.2, 0.32, 0.24, 0.3, '#b0543a');
    } else if (type === 'pyramide') {
      const c = ['#d9b07a', '#d2a46e', '#c99862', '#bf8c58'];
      for (let i = 0; i < 4; i++) box(x - 0.55 + i * 0.12, y - 0.55 + i * 0.12, z + i * 0.45, 1.1 - i * 0.24, 1.1 - i * 0.24, 0.45, c[i]);
      box(x - 0.14, y - 0.14, z + 1.8, 0.28, 0.28, 0.45, '#e6c493');
      // stairway
      poly([P(x - 0.1, y + 0.55, z), P(x + 0.1, y + 0.55, z), P(x + 0.1, y + 0.19, z + 1.8), P(x - 0.1, y + 0.19, z + 1.8)], '#efd5a8');
    } else if (type === 'soleil') {
      box(x - 0.3, y - 0.1, z, 0.6, 0.2, 0.2, '#9a8a78');
      const [sx, sy] = P(x, y, z + 1.0);
      const r = TW * 0.36;
      ctx.fillStyle = '#e2b34a'; ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.75, r, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b77f2a'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2 + time * 0.1;
        ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r * 0.35, sy + Math.sin(a) * r * 0.5); ctx.lineTo(sx + Math.cos(a) * r * 0.7, sy + Math.sin(a) * r * 0.95); ctx.stroke();
      }
      ctx.fillStyle = '#b77f2a'; ctx.beginPath(); ctx.arc(sx, sy, r * 0.22, 0, 7); ctx.fill();
    } else if (type === 'petroglyphe') {
      box(x - 0.35, y - 0.3, z, 0.7, 0.6, 0.25, '#6f6a72');
      const [sx, sy] = P(x, y, z + 0.25);
      ctx.strokeStyle = '#e9dfcf'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(sx, sy, TW * 0.08, 0, 7); ctx.moveTo(sx - TW * 0.18, sy + 2); ctx.lineTo(sx + TW * 0.18, sy + 2); ctx.stroke();
    } else if (type === 'tlachtli') {
      box(x - 0.5, y - 0.5, z, 1.0, 0.18, 0.5, '#d2a46e');
      box(x - 0.5, y + 0.32, z, 1.0, 0.18, 0.5, '#d2a46e');
      const [sx, sy] = P(x, y - 0.32, z + 0.35);
      ctx.strokeStyle = '#7a5434'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy, 3, 4, 0, 0, 7); ctx.stroke();
    }
  }

  function nodeIcon(res, x, y, z, time, stock, max, docked) {
    const bob = res === 'perle' ? Math.sin(time * 2 + x) * 0.05 : 0;
    switch (res) {
      case 'bois': box(x - 0.3, y - 0.1, z, 0.6, 0.12, 0.12, '#a86c40'); box(x - 0.3, y + 0.05, z, 0.6, 0.12, 0.12, '#b9784a'); box(x - 0.25, y - 0.03, z + 0.12, 0.5, 0.12, 0.12, '#c98a5a'); break;
      case 'fibre': fern(x, y, z, 0.2); fern(x + 0.15, y + 0.1, z, 0.8); break;
      case 'coco': palm(x, y, z, 0.3, time); break;
      case 'pierre': for (let i = 0; i < 3; i++) box(x - 0.3 + i * 0.2, y - 0.1, z, 0.18, 0.18, 0.5 + (i % 2) * 0.35, '#7f8496'); break;
      case 'obsidienne': {
        const [sx, sy] = P(x, y, z);
        poly([[sx - TW * 0.12, sy], [sx - TW * 0.03, sy - TZ * 1.3], [sx + TW * 0.04, sy - TZ * 0.4], [sx + TW * 0.14, sy - TZ * 0.9], [sx + TW * 0.12, sy]], '#3b2f4a');
        poly([[sx - TW * 0.03, sy - TZ * 1.3], [sx + TW * 0.01, sy], [sx - TW * 0.12, sy]], '#5b4a72');
        break;
      }
      case 'cacao': tree(x, y, z, 0.1, '#7a9a4a', '#5f7d3a'); {
        const [sx, sy] = P(x, y, z + 0.9);
        ctx.fillStyle = '#c0603a'; ctx.beginPath(); ctx.ellipse(sx + 4, sy, 2.5, 4, 0, 0, 7); ctx.ellipse(sx - 4, sy + 2, 2.5, 4, 0, 0, 7); ctx.fill();
      } break;
      case 'nacre': {
        const [sx, sy] = P(x, y, z + 0.05);
        ctx.fillStyle = '#f2e6ee'; ctx.beginPath(); ctx.ellipse(sx, sy, TW * 0.14, TW * 0.08, 0, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#c9a9c0'; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + i * TW * 0.05, sy - TW * 0.07); ctx.stroke(); }
      } break;
      case 'plume': {
        const [sx, sy] = P(x, y, z + 0.6 + Math.sin(time * 1.5 + y) * 0.1);
        ctx.fillStyle = '#2fa58c'; ctx.beginPath(); ctx.ellipse(sx, sy, 3, TW * 0.16, 0.5, 0, 7); ctx.fill();
        ctx.strokeStyle = '#e0b84a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx - 4, sy + 7); ctx.lineTo(sx + 4, sy - 7); ctx.stroke();
      } break;
      case 'perle': {
        const [sx, sy] = P(x + 0.5, y + 0.5, bob);
        ctx.fillStyle = '#3a4a5a'; ctx.beginPath(); ctx.ellipse(sx, sy, TW * 0.13, TW * 0.06, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff8f0'; ctx.beginPath(); ctx.arc(sx, sy - 2, TW * 0.04, 0, 7); ctx.fill();
      } break;
    }
    if (docked) {
      const [sx, sy] = P(res === 'perle' ? x + 0.5 : x, res === 'perle' ? y + 0.5 : y, z + 2.4);
      const n = Math.floor(stock);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.roundRect(sx - 16, sy - 9, 32, 16, 8); ctx.fill();
      ctx.fillStyle = n > 0 ? '#2b3a55' : '#a0a0aa';
      ctx.font = `600 11px ui-rounded, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n + '', sx, sy - 1);
      return [sx, sy];
    }
    return null;
  }

  // ---------- creatures ----------
  function creatureShape(sp, sx, sy, time, flip, scale = 1) {
    const S = SPECIES[sp], c = S.color, k = TW / 44 * scale;
    ctx.fillStyle = c;
    switch (S.shape) {
      case 'bird': {
        const f = Math.sin(time * 9) * 5 * k;
        ctx.beginPath(); ctx.moveTo(sx - 9 * k, sy - f); ctx.quadraticCurveTo(sx - 3 * k, sy - 2 * k, sx, sy + 1 * k);
        ctx.quadraticCurveTo(sx + 3 * k, sy - 2 * k, sx + 9 * k, sy - f); ctx.quadraticCurveTo(sx + 3 * k, sy + 2 * k, sx, sy + 3 * k);
        ctx.quadraticCurveTo(sx - 3 * k, sy + 2 * k, sx - 9 * k, sy - f); ctx.fill();
        break;
      }
      case 'turtle':
        ctx.beginPath(); ctx.ellipse(sx, sy, 7 * k, 4.5 * k, 0, 0, 7); ctx.fill();
        ctx.fillStyle = shade(c, 0.3); ctx.beginPath(); ctx.ellipse(sx + (flip ? -7 : 7) * k, sy, 2.5 * k, 2 * k, 0, 0, 7); ctx.fill();
        break;
      case 'crab':
        ctx.beginPath(); ctx.ellipse(sx, sy, 5 * k, 3.5 * k, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = c; ctx.lineWidth = 1.5 * k;
        for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx + sg * 4 * k, sy); ctx.lineTo(sx + sg * 8 * k, sy - 3 * k + Math.sin(time * 6) * k); ctx.stroke(); }
        break;
      case 'small':
        ctx.beginPath(); ctx.ellipse(sx, sy, 4 * k, 3 * k, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + (flip ? -4 : 4) * k, sy - 2 * k, 2.5 * k, 0, 7); ctx.fill();
        break;
      case 'long':
        ctx.lineWidth = 3.5 * k; ctx.strokeStyle = c; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) { const px = sx + (i - 3) * 2.6 * k * (flip ? -1 : 1), py = sy + Math.sin(time * 4 + i) * 1.5 * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
        break;
      case 'cat':
        ctx.beginPath(); ctx.roundRect(sx - 7 * k, sy - 4 * k, 14 * k, 6 * k, 3 * k); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + (flip ? -7 : 7) * k, sy - 5 * k, 3.4 * k, 0, 7); ctx.fill();
        ctx.fillRect(sx - 6 * k, sy, 2 * k, 5 * k); ctx.fillRect(sx + 4 * k, sy, 2 * k, 5 * k);
        break;
      case 'dolphin': {
        ctx.beginPath(); ctx.moveTo(sx - 12 * k, sy); ctx.quadraticCurveTo(sx, sy - 9 * k, sx + 12 * k, sy);
        ctx.quadraticCurveTo(sx, sy - 3 * k, sx - 12 * k, sy); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx - 1 * k, sy - 6 * k); ctx.lineTo(sx - 4 * k, sy - 11 * k); ctx.lineTo(sx + 3 * k, sy - 6 * k); ctx.fill();
        break;
      }
      case 'manta': {
        const f = Math.sin(time * 3) * 3 * k;
        ctx.globalAlpha *= 0.85;
        ctx.beginPath(); ctx.moveTo(sx, sy - 6 * k); ctx.quadraticCurveTo(sx + 14 * k, sy - 2 * k + f, sx + 16 * k, sy + 3 * k + f);
        ctx.quadraticCurveTo(sx + 4 * k, sy + 4 * k, sx, sy + 8 * k); ctx.quadraticCurveTo(sx - 4 * k, sy + 4 * k, sx - 16 * k, sy + 3 * k + f);
        ctx.quadraticCurveTo(sx - 14 * k, sy - 2 * k + f, sx, sy - 6 * k); ctx.fill();
        ctx.globalAlpha /= 0.85;
        break;
      }
      case 'whale': {
        ctx.beginPath(); ctx.ellipse(sx, sy, 22 * k, 6 * k, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx + 20 * k, sy); ctx.lineTo(sx + 30 * k, sy - 9 * k); ctx.lineTo(sx + 26 * k, sy); ctx.lineTo(sx + 32 * k, sy + 1 * k); ctx.fill();
        // spout
        const sp = (Math.sin(time * 1.5) + 1) / 2;
        ctx.fillStyle = `rgba(255,255,255,${0.7 * sp})`;
        ctx.beginPath(); ctx.ellipse(sx - 10 * k, sy - 10 * k - sp * 8 * k, 3 * k, 6 * k * sp + 1, 0, 0, 7); ctx.fill();
        break;
      }
    }
  }

  function ambientFor(isle) {
    let list = creatures.get(isle.id);
    if (list) return list;
    list = [];
    const low = isle.land.filter(t => t.h <= 3);
    isle.fauna.forEach((sp, i) => {
      const t = (low.length ? low : isle.land)[Math.floor(hashf(i, 7, isle.cx * 131 + isle.cy) * (low.length || isle.land.length))];
      list.push({ sp, x: t.tx + 0.5, y: t.ty + 0.5, tx: t.tx + 0.5, ty: t.ty + 0.5, wait: Math.random() * 3, phase: Math.random() * 6, flip: false });
    });
    creatures.set(isle.id, list);
    if (creatures.size > 40) creatures.delete(creatures.keys().next().value);
    return list;
  }

  function updateCreature(isle, c, dt) {
    if (SPECIES[c.sp].shape === 'bird') return;
    c.wait -= dt;
    const d = Math.hypot(c.tx - c.x, c.ty - c.y);
    if (d > 0.02) {
      const v = Math.min(d, dt * 0.5);
      c.flip = c.tx - c.x - (c.ty - c.y) < 0;
      c.x += (c.tx - c.x) / d * v; c.y += (c.ty - c.y) / d * v;
    } else if (c.wait <= 0) {
      c.wait = 1.5 + Math.random() * 4;
      const nx = Math.floor(c.x) + Math.round(Math.random() * 2 - 1), ny = Math.floor(c.y) + Math.round(Math.random() * 2 - 1);
      const h = isle.tiles.get(nx + ',' + ny), h0 = isle.tiles.get(Math.floor(c.x) + ',' + Math.floor(c.y)) || 1;
      if (h && Math.abs(h - h0) <= 1) { c.tx = nx + 0.5; c.ty = ny + 0.5; }
    }
  }

  // ---------- boats ----------
  const SAIL = { radeau: '#efe2c4', barque: null, balancier: '#e9d7b0', voilier: '#d98a5a', catamaran: '#e6c38a', pahi: '#c95f4a' };

  function drawBoat(boat, time, moving) {
    const { x, y, hd, type } = boat;
    const bob = Math.sin(time * 2.1) * 0.06 + (moving ? 0 : Math.sin(time * 0.9) * 0.03);
    const c = Math.cos(hd), s = Math.sin(hd);
    const L = (lx, ly, z = 0) => P(x + lx * c - ly * s, y + lx * s + ly * c, z + bob);
    const hullShape = (len, wid, ox = 0, oy = 0, col = '#8d5a3a', deck = '#b98058', hh = 0.28) => {
      const pts = [[len / 2, 0], [len * 0.25, wid / 2], [-len * 0.42, wid / 2], [-len / 2, wid * 0.25], [-len / 2, -wid * 0.25], [-len * 0.42, -wid / 2], [len * 0.25, -wid / 2]];
      poly(pts.map(p => L(p[0] + ox, p[1] + oy, -0.05)), col);
      poly(pts.map(p => L(p[0] * 0.92 + ox, p[1] * 0.8 + oy, hh)), deck);
    };
    const sail = (mx, my, hgt, w, col) => {
      // crab-claw sail: a tall curved triangle leaning back
      const base = L(mx, my, 0.3), top = L(mx + 0.15, my, hgt), tip = L(mx - w, my, hgt * 0.75);
      ctx.strokeStyle = '#5a3a26'; ctx.lineWidth = Math.max(1, TW * 0.03);
      ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(top[0], top[1]);
      ctx.quadraticCurveTo((top[0] + tip[0]) / 2, (top[1] + tip[1]) / 2 + TZ * 0.8, tip[0], tip[1]);
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      // tapa motif: zig-zag band
      ctx.strokeStyle = shade(col, -0.35); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const t = 0.25 + i / 6 * 0.55;
        const p = [base[0] + (tip[0] - base[0]) * t, base[1] + (tip[1] - base[1]) * t - (i % 2 ? 3 : -1)];
        const q = [base[0] + (top[0] - base[0]) * t * 0.9, base[1] + (top[1] - base[1]) * t * 0.9];
        if (!i) ctx.moveTo((p[0] + q[0]) / 2, (p[1] + q[1]) / 2); else ctx.lineTo((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - (i % 2 ? 2 : 0));
      }
      ctx.stroke();
    };
    // soft shadow on water
    const sh = L(0, 0, -0.1);
    ctx.fillStyle = 'rgba(10,40,70,0.18)';
    ctx.beginPath(); ctx.ellipse(sh[0], sh[1] + 2, TW * 0.6, TH * 0.6, 0, 0, 7); ctx.fill();

    if (type === 'radeau') {
      for (let i = -2; i <= 1; i++) {
        const yy = i * 0.18 + 0.09;
        poly([L(0.45, yy - 0.08, 0.02), L(0.45, yy + 0.08, 0.02), L(-0.45, yy + 0.08, 0.02), L(-0.45, yy - 0.08, 0.02)], i % 2 ? '#a87448' : '#b98458');
        poly([L(0.45, yy - 0.08, 0.16), L(0.45, yy + 0.08, 0.16), L(-0.45, yy + 0.08, 0.16), L(-0.45, yy - 0.08, 0.16)], i % 2 ? '#c08e60' : '#cf9e6e');
      }
      const m = L(0, 0, 0.16), t = L(0, 0, 1.9);
      ctx.strokeStyle = '#6a4a32'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(t[0], t[1]); ctx.stroke();
      const flutter = Math.sin(time * 3) * 0.05;
      poly([L(0, 0, 1.85), L(-0.05, 0.02, 0.6), L(-0.45 + flutter, 0.04, 0.8), L(-0.42 + flutter, 0.04, 1.75)], SAIL.radeau);
    } else if (type === 'barque') {
      hullShape(1.15, 0.45);
      const row = Math.sin(time * (moving ? 4 : 0.5));
      ctx.strokeStyle = '#6a4a32'; ctx.lineWidth = 1.5;
      for (const sg of [-1, 1]) {
        const a = L(-0.05, sg * 0.18, 0.28), b = L(-0.05 - row * 0.2, sg * 0.7, -0.02);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      // rower
      const r = L(-0.05, 0, 0.3);
      ctx.fillStyle = '#7a4a32'; ctx.beginPath(); ctx.arc(r[0], r[1] - TZ * 0.5, TW * 0.06, 0, 7); ctx.fill();
    } else if (type === 'balancier') {
      ctx.strokeStyle = '#6a4a32'; ctx.lineWidth = 1.6;
      for (const lx of [0.25, -0.25]) { const a = L(lx, 0, 0.25), b = L(lx, 0.75, 0.12); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      hullShape(0.9, 0.16, 0, 0.75, '#7a4e32', '#9a6a46', 0.12);
      hullShape(1.35, 0.32);
      sail(0.1, 0, 2.1, 0.75, SAIL.balancier);
    } else if (type === 'voilier') {
      hullShape(1.55, 0.5);
      sail(0.15, 0, 2.7, 1.0, SAIL.voilier);
    } else if (type === 'catamaran' || type === 'pahi') {
      const big = type === 'pahi';
      const len = big ? 2.3 : 1.85, off = big ? 0.5 : 0.4;
      hullShape(len, 0.34, 0, -off);
      hullShape(len, 0.34, 0, off);
      poly([L(len * 0.3, -off, 0.3), L(len * 0.3, off, 0.3), L(-len * 0.3, off, 0.3), L(-len * 0.3, -off, 0.3)], '#c99a68');
      // deck hut
      const hx = -len * 0.12;
      poly([L(hx + 0.2, -0.2, 0.3), L(hx + 0.2, 0.2, 0.3), L(hx, 0.2, 0.75), L(hx, -0.2, 0.75)], '#d8ad66');
      poly([L(hx - 0.2, -0.2, 0.3), L(hx - 0.2, 0.2, 0.3), L(hx, 0.2, 0.75), L(hx, -0.2, 0.75)], '#a87a3c');
      sail(len * 0.18, 0, big ? 3.4 : 3.0, big ? 1.3 : 1.1, SAIL[type]);
      if (big) sail(-len * 0.38, 0, 2.6, 0.9, '#e6c38a');
    }
  }

  // ---------- frame ----------
  function draw(state, view, fx, time, dt) {
    cx = view.cx; cy = view.cy; CY = 0.5 - 0.27 * (view.shift || 0);
    TW = 44 * view.zoom; TH = TW / 2; TZ = TW * 0.3;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    hits.length = 0;
    const light = daylight();

    // ocean
    const zf = zoneF(cx, cy), z0 = Math.floor(zf), zt = zf - z0;
    const Z0 = ZONES[Math.min(z0, ZONES.length - 1)], Z1 = ZONES[Math.min(z0 + 1, ZONES.length - 1)];
    const top = mix(Z0.sea, Z1.sea, zt), bot = mix(Z0.deep, Z1.deep, zt);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(mix(top, [255, 255, 255], 0.08))); g.addColorStop(1, rgb(bot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // visible world bounds
    const c1 = screenToWorld(0, -TZ * 10), c2 = screenToWorld(W, -TZ * 10), c3 = screenToWorld(0, H + TH * 2), c4 = screenToWorld(W, H + TH * 2);
    const x0 = Math.floor(Math.min(c1.x, c2.x, c3.x, c4.x)) - 1, x1 = Math.ceil(Math.max(c1.x, c2.x, c3.x, c4.x)) + 1;
    const y0 = Math.floor(Math.min(c1.y, c2.y, c3.y, c4.y)) - 1, y1 = Math.ceil(Math.max(c1.y, c2.y, c3.y, c4.y)) + 1;

    // sparkles on open water
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const hv = hashf(tx, ty, 99);
      if (hv > 0.07) continue;
      const a = Math.max(0, Math.sin(time * (0.6 + hv * 8) + hv * 80));
      if (a < 0.05) continue;
      const [sx, sy] = P(tx + 0.5, ty + 0.5);
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.22 * a})`;
      ctx.beginPath(); ctx.moveTo(sx - TW * 0.18, sy); ctx.lineTo(sx, sy - TH * 0.1); ctx.lineTo(sx + TW * 0.18, sy); ctx.lineTo(sx, sy + TH * 0.1); ctx.fill();
    }

    const isles = islandsInRect(x0, y0, x1, y1);
    const items = [];
    const docked = state.docked;

    for (const isle of isles) {
      if (isle.x + isle.r * 1.5 < x0 - 2 || isle.x - isle.r * 1.5 > x1 + 2 || isle.y + isle.r * 1.5 < y0 - 2 || isle.y - isle.r * 1.5 > y1 + 2) continue;
      const B = BIOMES[isle.biome];
      // shallows and foam (flat, drawn first)
      for (const [k, d] of isle.shallow) {
        const i = k.indexOf(','), tx = +k.slice(0, i), ty = +k.slice(i + 1);
        if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
        diamond(tx, ty, 0, d === 1 ? hexA(B.shallow, 0.75) : hexA(B.shallow, 0.35));
      }
      for (const c of isle.coast) {
        if (c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
        const a = 0.25 + 0.25 * Math.sin(time * 1.6 + c.x * 0.7 + c.y * 0.9);
        diamond(c.x - 0.5, c.y - 0.5, 0.01, `rgba(255,255,255,${a})`, 0.3);
      }
      for (const t of isle.land) {
        if (t.tx < x0 || t.tx > x1 || t.ty < y0 - 10 || t.ty > y1) continue;
        items.push({ d: t.tx + t.ty + 1, f: () => drawColumn(isle, t, time) });
      }
      for (const dc of isle.deco) {
        if (dc.tx < x0 || dc.tx > x1 || dc.ty < y0 - 10 || dc.ty > y1) continue;
        const X = dc.tx + 0.5, Y = dc.ty + 0.5, Zz = dc.h;
        const fn = { palm: () => palm(X, Y, Zz, dc.s, time), tree: () => tree(X, Y, Zz, dc.s), fern: () => fern(X, Y, Zz, dc.s),
          mangrove: () => mangrove(X, Y, Zz, dc.s), rock: () => rock(X, Y, Zz, dc.s, B.rock), cactus: () => cactus(X, Y, Zz, dc.s),
          agave: () => agave(X, Y, Zz), tiki: () => tikiSmall(X, Y, Zz) }[dc.kind];
        if (fn) items.push({ d: dc.tx + dc.ty + 1.05, f: fn });
      }
      if (isle.village) {
        isle.village.huts.forEach((t, i) => items.push({ d: t.tx + t.ty + 1.05, f: () => hut(t.tx + 0.5, t.ty + 0.5, t.h, light.night, isle.village.chantier && i === 0) }));
      }
      if (isle.site) {
        const st = isle.site;
        items.push({ d: st.tx + st.ty + 1.05, f: () => site(st.type, st.tx + 0.5, st.ty + 0.5, st.h, time) });
      }
      const ist = state.isl[isle.id];
      isle.nodes.forEach((n, i) => {
        const here = docked === isle.id;
        const stock = ist ? ist.stock[i] : n.max;
        items.push({ d: n.tx + n.ty + (n.res === 'perle' ? 0.5 : 1.06), f: () => {
          const p = nodeIcon(n.res, n.tx + 0.5 * (n.res !== 'perle'), n.ty + 0.5 * (n.res !== 'perle'), n.h, time, stock, n.max, here);
          if (p) hits.push({ x: p[0], y: p[1] + 10, r: 26, kind: 'node', isle, i });
        } });
      });
      for (const c of ambientFor(isle)) {
        updateCreature(isle, c, dt);
        const S = SPECIES[c.sp];
        const known = !!state.carnet.sp[c.sp];
        if (S.shape === 'bird') {
          const a = time * 0.4 + c.phase;
          const bx = isle.x + Math.cos(a) * isle.r * 0.7, by = isle.y + Math.sin(a) * isle.r * 0.7;
          items.push({ d: bx + by + 30, f: () => {
            const [sx, sy] = P(bx, by, (isle.peak.h || 2) + 3 + Math.sin(time + c.phase) * 0.5);
            creatureShape(c.sp, sx, sy, time + c.phase, false);
            if (!known) marker(sx, sy - 14);
            hits.push({ x: sx, y: sy, r: 26, kind: 'creature', isle, sp: c.sp });
          } });
        } else {
          const h = isle.tiles.get(Math.floor(c.x) + ',' + Math.floor(c.y)) || 1;
          items.push({ d: c.x + c.y + 0.6, f: () => {
            const [sx, sy] = P(c.x, c.y, h);
            creatureShape(c.sp, sx, sy - 3, time + c.phase, c.flip);
            if (!known) marker(sx, sy - 16);
            hits.push({ x: sx, y: sy - 3, r: 24, kind: 'creature', isle, sp: c.sp });
          } });
        }
      }
    }

    // wake
    const b = state.boat;
    const moving = !!fx.moving;
    if (moving && (!wake.length || Math.hypot(wake[wake.length - 1].x - b.x, wake[wake.length - 1].y - b.y) > 0.25)) wake.push({ x: b.x, y: b.y, hd: b.hd, t: time });
    while (wake.length && (time - wake[0].t > 3.5 || wake.length > 40)) wake.shift();
    for (const w of wake) {
      const age = (time - w.t) / 3.5;
      const spread = 0.2 + age * 0.9;
      const nx = -Math.sin(w.hd), ny = Math.cos(w.hd);
      for (const sg of [-1, 1]) {
        const [sx, sy] = P(w.x + nx * spread * sg - Math.cos(w.hd) * 0.5, w.y + ny * spread * sg - Math.sin(w.hd) * 0.5);
        ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - age)})`;
        ctx.beginPath(); ctx.ellipse(sx, sy, TW * 0.08 * (1 + age), TH * 0.08 * (1 + age), 0, 0, 7); ctx.fill();
      }
    }

    // flotsam & sea fauna
    for (const f of fx.flotsam) {
      items.push({ d: f.x + f.y, f: () => {
        const bob = Math.sin(time * 2 + f.x) * 0.08;
        box(f.x - 0.18, f.y - 0.18, bob - 0.05, 0.36, 0.36, 0.28, '#c8955c');
        const [sx, sy] = P(f.x, f.y, 0.9 + Math.sin(time * 3) * 0.1);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 7); ctx.fill();
        hits.push({ x: sx, y: sy + 10, r: 26, kind: 'flotsam', f });
      } });
    }
    for (const a of fx.seaFauna) {
      items.push({ d: a.x + a.y, f: () => {
        const life = a.t / a.life;
        const fade = Math.min(1, a.t / 1, (a.life - a.t) / 1.5);
        ctx.globalAlpha = Math.max(0, fade);
        const arc = SPECIES[a.sp].shape === 'dolphin' ? Math.max(0, Math.sin(a.t * 2.2)) * 0.9 : 0;
        const [sx, sy] = P(a.x, a.y, arc);
        creatureShape(a.sp, sx, sy, time, a.flip, 1.3);
        if (!state.carnet.sp[a.sp]) marker(sx, sy - 20);
        ctx.globalAlpha = 1;
        hits.push({ x: sx, y: sy, r: 34, kind: 'seafauna', a });
        void life;
      } });
    }

    items.push({ d: b.x + b.y + 0.3, f: () => drawBoat(b, time, moving) });

    items.sort((p, q) => p.d - q.d);
    for (const it of items) it.f();

    // target marker
    if (fx.target) {
      const [sx, sy] = P(fx.target.x, fx.target.y);
      const pr = (time * 1.2) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - pr)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx, sy, TW * (0.2 + pr * 0.4), TH * (0.2 + pr * 0.4), 0, 0, 7); ctx.stroke();
    }

    // floating texts
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of fx.floaters) {
      const k = t.t / t.life;
      ctx.globalAlpha = 1 - k;
      ctx.font = `700 ${14}px ui-rounded, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(30,30,50,0.35)'; ctx.fillText(t.text, t.x + 1, t.y - k * 40 + 1);
      ctx.fillStyle = t.color || '#fff'; ctx.fillText(t.text, t.x, t.y - k * 40);
    }
    ctx.globalAlpha = 1;

    // rain squall
    if (fx.rain > 0) {
      ctx.fillStyle = `rgba(40,50,80,${0.25 * Math.min(1, fx.rain)})`; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(220,230,255,${0.35 * Math.min(1, fx.rain)})`; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 90; i++) {
        const rx = (hashf(i, 1, 3) * W + time * 60) % W, ry = (hashf(i, 2, 3) * H + time * 700) % H;
        ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 14);
      }
      ctx.stroke();
    }

    // daylight tint + vignette
    if (light.alpha > 0.01) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(${light.tint.map(v => v | 0).join(',')},${light.alpha * 1.5})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(20,20,60,0)'); vg.addColorStop(1, 'rgba(20,20,60,0.28)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  function marker(sx, sy) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(sx, sy, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#e0634a'; ctx.font = '800 10px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', sx, sy + 0.5);
  }

  function hexA(hex, a) { const c = hexRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  return { resize, draw, screenToWorld, worldToScreen: (x, y, z) => P(x, y, z), hits, get size() { return { W, H }; } };
}
