/* Renderer — everything is drawn into a small offscreen buffer (one game pixel
   per block) and blown back up with nearest-neighbour, so the map, the glider
   and the gates all share the same chunky grid. This is the generator's
   "pixelated" mode turned into the game's native resolution rather than a
   post-process: the colour fill is computed at block resolution directly.

   No contour lines: the map is read purely as quantized elevation, so the
   steps between colour bands ARE the contours. */

import { UNITS_PER_PX, SEA } from './terrain.js';
import { hexToRgb, rampColor } from './palettes.js';

export const BLOCK = 7;        // CSS pixels per game pixel
const CELL = 2;                // game pixels between field samples
const BANDS = 15;              // elevation steps over the full height range
const SHADE_STEPS = 5;
const SHADING = 0.34;
const ALT_PX = 0.03;           // screen pixels of lift per metre above ground

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const low = document.createElement('canvas');
  const lctx = low.getContext('2d');

  let gameW = 0, gameH = 0, dpr = 1;
  let gw = 0, gh = 0, field = null, shade = null, img = null;
  let offX = 0, offY = 0, originX = 0, originY = 0;
  let camX = 0, camY = 0;
  let table = null, tablePal = null;

  const cellWorld = CELL * UNITS_PER_PX;

  function resize(cssW, cssH) {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    gameW = Math.max(80, Math.ceil(cssW / BLOCK));
    gameH = Math.max(60, Math.ceil(cssH / BLOCK));

    low.width = gameW; low.height = gameH;
    canvas.width = Math.floor(gameW * BLOCK * dpr);
    canvas.height = Math.floor(gameH * BLOCK * dpr);
    canvas.style.width = gameW * BLOCK + 'px';
    canvas.style.height = gameH * BLOCK + 'px';

    gw = Math.ceil(gameW / CELL) + 3;
    gh = Math.ceil(gameH / CELL) + 3;
    field = new Float32Array(gw * gh);
    shade = new Float32Array(gw * gh);
    img = lctx.createImageData(gameW, gameH);
    lctx.imageSmoothingEnabled = false;
  }

  /* band × hillshade-step colour cube, rebuilt only when the palette changes */
  function buildTable(pal) {
    if (tablePal === pal) return;
    tablePal = pal;
    table = new Uint8Array(BANDS * SHADE_STEPS * 3);
    const land = pal.ramp.map(hexToRgb);
    const water = pal.water.map(hexToRgb);

    for (let b = 0; b < BANDS; b++) {
      const h = (b + 0.5) / BANDS;
      const col = h < SEA
        ? rampColor(water, h / SEA)
        : rampColor(land, (h - SEA) / (1 - SEA));

      // brighten the first band above water into a beach, so the coastline
      // reads at a glance without drawing a contour for it
      if (h >= SEA && (b - 1 + 0.5) / BANDS < SEA) {
        const sand = hexToRgb(pal.index);
        for (let c = 0; c < 3; c++) col[c] += (sand[c] - col[c]) * 0.34;
      }
      for (let s = 0; s < SHADE_STEPS; s++) {
        const lam = (s + 0.5) / SHADE_STEPS;
        let f = 1 + SHADING * (lam - 0.62) * 2.2;
        if (f < 0.3) f = 0.3; else if (f > 1.7) f = 1.7;
        const o = (b * SHADE_STEPS + s) * 3;
        for (let c = 0; c < 3; c++) {
          const v = col[c] * f;
          table[o + c] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
      }
    }
  }

  // world -> game-pixel screen coordinates (camera is snapped to whole pixels)
  const sx = wx => (wx - camX) / UNITS_PER_PX + gameW / 2;
  const sy = wy => (wy - camY) / UNITS_PER_PX + gameH / 2;

  function drawTerrain(terrain, cx, cy, pal) {
    // snap the camera to a whole game pixel, and the sample grid to a whole
    // cell: the terrain then scrolls in clean blocks instead of shimmering
    camX = Math.round(cx / UNITS_PER_PX) * UNITS_PER_PX;
    camY = Math.round(cy / UNITS_PER_PX) * UNITS_PER_PX;
    const leftW = camX - (gameW / 2) * UNITS_PER_PX;
    const topW = camY - (gameH / 2) * UNITS_PER_PX;
    originX = Math.floor(leftW / cellWorld) * cellWorld;
    originY = Math.floor(topW / cellWorld) * cellWorld;
    offX = (originX - leftW) / UNITS_PER_PX;   // integer, in [-CELL, 0]
    offY = (originY - topW) / UNITS_PER_PX;

    terrain.sampleField(originX, originY, cellWorld, gw, gh, field);
    buildTable(pal);

    // hillshade on the coarse grid
    const ex = 15, lx = -0.55, ly = -0.55, lz = 0.63;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const xm = x > 0 ? x - 1 : 0, xp = x < gw - 1 ? x + 1 : gw - 1;
        const ym = y > 0 ? y - 1 : 0, yp = y < gh - 1 ? y + 1 : gh - 1;
        const dzx = (field[y * gw + xp] - field[y * gw + xm]) * ex;
        const dzy = (field[yp * gw + x] - field[ym * gw + x]) * ex;
        const len = Math.sqrt(dzx * dzx + dzy * dzy + 1);
        shade[y * gw + x] = (-dzx * lx - dzy * ly + lz) / len;
      }
    }

    // colour fill: bilinear height & shade, then quantize both
    const data = img.data;
    const inv = 1 / CELL;
    for (let py = 0; py < gameH; py++) {
      const fy = (py - offY) * inv;
      const y0 = fy < 0 ? 0 : Math.min(gh - 2, fy | 0);
      const ty = fy - y0;
      const r0 = y0 * gw, r1 = (y0 + 1) * gw;

      for (let px = 0; px < gameW; px++) {
        const fx = (px - offX) * inv;
        const x0 = fx < 0 ? 0 : Math.min(gw - 2, fx | 0);
        const tx = fx - x0;

        const a = field[r0 + x0], b = field[r0 + x0 + 1];
        const c = field[r1 + x0], d = field[r1 + x0 + 1];
        const h = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;

        const sa = shade[r0 + x0], sb = shade[r0 + x0 + 1];
        const sc = shade[r1 + x0], sd = shade[r1 + x0 + 1];
        const s = (sa + (sb - sa) * tx) * (1 - ty) + (sc + (sd - sc) * tx) * ty;

        let band = (h * BANDS) | 0; if (band > BANDS - 1) band = BANDS - 1;
        let step = (s * SHADE_STEPS) | 0;
        if (step < 0) step = 0; else if (step > SHADE_STEPS - 1) step = SHADE_STEPS - 1;

        const o = (band * SHADE_STEPS + step) * 3;
        const q = (py * gameW + px) << 2;
        data[q] = table[o];
        data[q + 1] = table[o + 1];
        data[q + 2] = table[o + 2];
        data[q + 3] = 255;
      }
    }
    lctx.putImageData(img, 0, 0);
    lctx.lineJoin = 'round';
  }

  /* ---------------------------------------------------------- entities */

  function drawThermals(terrain, pal, t) {
    const list = terrain.thermalsNear(camX, camY,
      Math.max(gameW, gameH) * UNITS_PER_PX * 0.7 + 400);
    lctx.strokeStyle = pal.thermal;
    lctx.lineWidth = 1;
    for (let i = 0; i < list.length; i++) {
      const th = list[i];
      const x = sx(th.x), y = sy(th.y);
      const r = th.radius / UNITS_PER_PX;
      if (x < -r || y < -r || x > gameW + r || y > gameH + r) continue;
      lctx.globalAlpha = 0.4;
      lctx.beginPath();
      lctx.arc(x, y, r, 0, Math.PI * 2);
      lctx.stroke();
      for (let k = 0; k < 2; k++) {
        const phase = (t * 0.35 + k / 2) % 1;
        lctx.globalAlpha = 0.65 * (1 - phase);
        lctx.beginPath();
        lctx.arc(x, y, r * (0.15 + phase * 0.85), 0, Math.PI * 2);
        lctx.stroke();
      }
    }
    lctx.globalAlpha = 1;
  }

  /* Wind is shown in the world itself: faint streaks drifting downwind across
     the whole view, so the direction is readable without looking at a gauge. */
  const STREAKS = 38;
  let streaks = null;

  function drawWind(wind, pal, dt) {
    if (!streaks) {
      streaks = [];
      for (let i = 0; i < STREAKS; i++) {
        streaks.push({
          x: Math.random() * gameW, y: Math.random() * gameH,
          len: 7 + Math.random() * 11, sp: 16 + Math.random() * 16,
          a: 0.34 + Math.random() * 0.28
        });
      }
    }
    lctx.strokeStyle = pal.wind;
    lctx.lineWidth = 1;
    for (let i = 0; i < streaks.length; i++) {
      const s = streaks[i];
      s.x += wind.x * s.sp * dt;
      s.y += wind.y * s.sp * dt;
      if (s.x < -12) s.x += gameW + 24; else if (s.x > gameW + 12) s.x -= gameW + 24;
      if (s.y < -12) s.y += gameH + 24; else if (s.y > gameH + 12) s.y -= gameH + 24;
      // snap to the pixel grid: a 1px line on a fractional row draws at half
      // strength across two rows, which made the streaks vanish
      const hx = Math.round(s.x) + 0.5, hy = Math.round(s.y) + 0.5;
      lctx.globalAlpha = s.a;
      lctx.beginPath();
      lctx.moveTo(hx, hy);
      lctx.lineTo(Math.round(hx - wind.x * s.len) + 0.5,
                  Math.round(hy - wind.y * s.len) + 0.5);
      lctx.stroke();
    }
    lctx.globalAlpha = 1;
  }

  function altOffset(altM, groundM) {
    return (altM - groundM) * ALT_PX;
  }

  function drawGate(terrain, g, pal, active, done, craft) {
    const x = sx(g.x), y = sy(g.y);
    const r = g.radius / UNITS_PER_PX;
    if (x < -r - 8 || y < -r - 8 || x > gameW + r + 8 || y > gameH + r + 8) return;

    const lift = altOffset(g.alt, g.groundM);
    const aligned = active && Math.abs(craft.alt - g.alt) < g.band;

    // ground marker
    lctx.globalAlpha = done ? 0.15 : 0.35;
    lctx.strokeStyle = pal.shadow;
    lctx.beginPath();
    lctx.ellipse(x, y, r * 0.5, r * 0.25, 0, 0, Math.PI * 2);
    lctx.stroke();

    // mast + ring at the gate's altitude
    lctx.globalAlpha = done ? 0.25 : 1;
    lctx.strokeStyle = done ? pal.craft : aligned ? pal.gateOk : pal.gate;
    lctx.beginPath();
    lctx.moveTo(x, y);
    lctx.lineTo(x, y - lift);
    lctx.stroke();

    lctx.lineWidth = active ? 2 : 1;
    lctx.beginPath();
    lctx.ellipse(x, y - lift, r, r * 0.55, 0, 0, Math.PI * 2);
    lctx.stroke();
    lctx.lineWidth = 1;
    lctx.globalAlpha = 1;
  }

  /* A gull seen from above: two swept wings that flap gently. Drawn nose-along
     +x, then rotated to the heading. */
  function gullPath(c, flap) {
    const f = 0.82 + 0.18 * Math.sin(flap);
    c.beginPath();
    c.moveTo(3.7, 0);
    c.quadraticCurveTo(0.7, -1.3 * f, -2.8, -4.9 * f);
    c.quadraticCurveTo(-1.3, -1.5 * f, -3.4, 0);
    c.quadraticCurveTo(-1.3, 1.5 * f, -2.8, 4.9 * f);
    c.quadraticCurveTo(0.7, 1.3 * f, 3.7, 0);
    c.closePath();
  }

  function drawCraft(craft, pal, groundM, t) {
    const x = sx(craft.x), y = sy(craft.y);
    const lift = altOffset(craft.alt, groundM);

    lctx.globalAlpha = 0.32;
    lctx.fillStyle = pal.shadow;
    lctx.save();
    lctx.translate(x, y);
    lctx.rotate(craft.heading);
    lctx.scale(0.75, 0.75);
    gullPath(lctx, t * 2.2);
    lctx.fill();
    lctx.restore();

    lctx.globalAlpha = 0.28;
    lctx.strokeStyle = pal.shadow;
    lctx.beginPath();
    lctx.moveTo(x, y);
    lctx.lineTo(x, y - lift);
    lctx.stroke();
    lctx.globalAlpha = 1;

    lctx.save();
    lctx.translate(x, y - lift);
    lctx.rotate(craft.heading);
    gullPath(lctx, t * 2.2);
    lctx.lineWidth = 1.8;
    lctx.lineJoin = 'round';
    lctx.strokeStyle = pal.craftEdge;
    lctx.stroke();
    lctx.fillStyle = pal.craft;
    lctx.fill();
    lctx.lineWidth = 1;
    lctx.restore();
  }

  /* Arrow at the screen edge pointing at the next gate when it is off-map. */
  function drawPointer(g, pal) {
    const x = sx(g.x), y = sy(g.y);
    const m = 10;
    if (x > m && x < gameW - m && y > m && y < gameH - m) return;
    const cx = gameW / 2, cy = gameH / 2;
    const a = Math.atan2(y - cy, x - cx);
    const px = cx + Math.cos(a) * (cx - m);
    const py = cy + Math.sin(a) * (cy - m);

    lctx.save();
    lctx.translate(px, py);
    lctx.rotate(a);
    lctx.fillStyle = pal.gate;
    lctx.beginPath();
    lctx.moveTo(4.5, 0); lctx.lineTo(-3, -3); lctx.lineTo(-3, 3);
    lctx.closePath();
    lctx.fill();
    lctx.restore();
  }

  function flash(color, alpha) {
    lctx.globalAlpha = alpha;
    lctx.fillStyle = color;
    lctx.fillRect(0, 0, gameW, gameH);
    lctx.globalAlpha = 1;
  }

  function present() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(low, 0, 0, gameW, gameH, 0, 0, canvas.width, canvas.height);
  }

  return {
    resize, drawTerrain, drawThermals, drawWind, drawGate, drawCraft, drawPointer,
    flash, present,
    get width() { return gameW; },
    get height() { return gameH; },
    get viewWorldW() { return gameW * UNITS_PER_PX; },
    get viewWorldH() { return gameH * UNITS_PER_PX; }
  };
}
