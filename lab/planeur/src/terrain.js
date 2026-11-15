/* Terrain — an endless, globally stable elevation field.

   The topography generator renormalizes its field per frame, which is fine for
   a picture but fatal for a game: the ground under a fixed point would move.
   Here the noise is calibrated ONCE per seed (percentiles over a wide sample),
   so heightAt(x, y) is a pure function of (seed, x, y) forever after. */

import { makeNoise, mulberry32 } from './noise.js';

export const SEA = 0.46;          // height below which it is water
export const ELEV_MAX = 280;      // metres at height 1
export const UNITS_PER_PX = 14;   // world units per game pixel

const FREQ = 1 / 1500;
const OCTAVES = 4;
const PERSISTENCE = 0.44;
const LACUNARITY = 2.03;
const WARP = 0.4;

const THERMAL_CELL = 640;         // world units between thermal candidates

export function makeTerrain(seed) {
  const n2 = makeNoise(seed | 0);

  // ridged fbm + domain warp: sharp crests to soar along, eroded valleys
  function raw(x, y) {
    let px = x * FREQ, py = y * FREQ;
    const wx = n2(px + 5.2, py + 1.3);
    const wy = n2(px + 9.7, py + 2.8);
    px += WARP * wx; py += WARP * wy;

    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < OCTAVES; i++) {
      const n = 1 - 2 * Math.abs(n2(px * freq, py * freq));
      sum += amp * n;
      norm += amp;
      amp *= PERSISTENCE;
      freq *= LACUNARITY;
    }
    return sum / norm;
  }

  // fixed normalization: 2nd/98th percentile of a wide deterministic sample
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const probe = new Float64Array(2048);
  for (let i = 0; i < probe.length; i++) {
    probe[i] = raw((rnd() - 0.5) * 60000, (rnd() - 0.5) * 60000);
  }
  probe.sort();
  const lo = probe[Math.floor(probe.length * 0.02)];
  const hi = probe[Math.floor(probe.length * 0.98)];
  const span = Math.max(1e-6, hi - lo);

  function heightAt(x, y) {
    const v = (raw(x, y) - lo) / span;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  const elevAt = (x, y) => heightAt(x, y) * ELEV_MAX;

  // ground the glider can hit: water counts as a hard floor at sea level
  const seaM = SEA * ELEV_MAX;
  const groundAt = (x, y) => Math.max(elevAt(x, y), seaM);
  const isWater = (x, y) => heightAt(x, y) < SEA;

  // slope in metres per world unit, central differences
  const D = 22;
  function slopeAt(x, y, out) {
    out[0] = (elevAt(x + D, y) - elevAt(x - D, y)) / (2 * D);
    out[1] = (elevAt(x, y + D) - elevAt(x, y - D)) / (2 * D);
    return out;
  }

  /* Sample the field onto a coarse grid in world space (used by the renderer
     for both the colour fill and the contour extraction). */
  function sampleField(ox, oy, step, gw, gh, out) {
    const field = out && out.length === gw * gh ? out : new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      const wy = oy + gy * step;
      for (let gx = 0; gx < gw; gx++) {
        field[gy * gw + gx] = heightAt(ox + gx * step, wy);
      }
    }
    return field;
  }

  /* Thermals live on a jittered lattice — deterministic, no field to store,
     and cheap to query (9 cells) or enumerate for drawing. */
  function cellThermal(ci, cj) {
    const r = mulberry32((ci * 73856093) ^ (cj * 19349663) ^ (seed * 83492791));
    if (r() > 0.6) return null;                       // not every cell has one
    const x = (ci + 0.15 + r() * 0.7) * THERMAL_CELL;
    const y = (cj + 0.15 + r() * 0.7) * THERMAL_CELL;
    if (isWater(x, y)) return null;                    // no thermals over water
    return { x, y, radius: 190 + r() * 130, strength: 3.0 + r() * 2.4 };
  }

  function thermalsNear(x, y, pad) {
    const i0 = Math.floor((x - pad) / THERMAL_CELL), i1 = Math.floor((x + pad) / THERMAL_CELL);
    const j0 = Math.floor((y - pad) / THERMAL_CELL), j1 = Math.floor((y + pad) / THERMAL_CELL);
    const list = [];
    for (let cj = j0; cj <= j1; cj++) {
      for (let ci = i0; ci <= i1; ci++) {
        const t = cellThermal(ci, cj);
        if (t) list.push(t);
      }
    }
    return list;
  }

  // metres/second of lift from thermals at this spot
  function thermalLift(x, y) {
    let best = 0;
    const list = thermalsNear(x, y, THERMAL_CELL);
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const dx = x - t.x, dy = y - t.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= t.radius) continue;
      const f = Math.pow(1 - d / t.radius, 0.7);
      const l = t.strength * f;
      if (l > best) best = l;
    }
    return best;
  }

  return {
    seed, heightAt, elevAt, groundAt, isWater, slopeAt,
    sampleField, thermalsNear, thermalLift, seaM
  };
}
