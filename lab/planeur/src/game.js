/* Planeur — the rules.

   No engine: altitude is the only resource. You sink all the time; the terrain
   gives it back. Windward slopes push air up (ridge lift, strongest close to
   the ground), and thermals rise over sun-baked land. The contour lines are
   the instrument panel: tight lines facing the wind arrow mean lift. */

import { makeTerrain } from './terrain.js';
import { mulberry32 } from './noise.js';
import { PALETTES } from './palettes.js';
import { createRenderer } from './render.js';

const TAU = Math.PI * 2;

const V_MIN = 130, V_MAX = 320;       // world units per second
const V_ACCEL = 210;                  // how fast the airspeed follows input
const SINK_MIN = 1.0, SINK_SPAN = 3.2; // metres per second, min .. max speed
const TURN_SLOW = 118, TURN_FAST = 62; // degrees per second

const RIDGE_GAIN = 4.2;               // (metres/unit of upwind slope) -> m/s
const RIDGE_MAX = 6.5;
const RIDGE_AGL = 200;                // lift dies out this high above ground
const WIND_DRIFT = 24;                // units/s the air pushes you downwind

const THERMAL_TOP = 620, THERMAL_FADE = 380;
const ALT_CEIL = 700;

const GATE_COUNT = 8;
const GATE_RADIUS = 175;              // world units
const GATE_BAND = 85;                 // metres of altitude tolerance

const BEST_KEY = 'planeur.best';

export function createGame(canvas) {
  const r = createRenderer(canvas);

  const keys = new Set();
  const state = {
    phase: 'ready',                   // ready | flying | crashed | won | paused
    seed: (Math.random() * 1e6) | 0,
    palette: 0,
    terrain: null,
    wind: { x: 1, y: 0, angle: 0 },
    craft: null,
    gates: [],
    gateIndex: 0,
    time: 0,
    vario: 0, varioSmooth: 0, ridge: 0, thermal: 0,
    cam: { x: 0, y: 0 },
    flash: null,
    clock: 0,
    best: readBest()
  };

  function readBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || null; }
    catch { return null; }
  }
  function writeBest(v) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch { /* private mode */ }
  }

  /* ------------------------------------------------------------ course */

  function buildCourse(terrain, seed, wind) {
    const rnd = mulberry32(seed ^ 0x5f3a7c1);
    const g = [0, 0];
    const upwind = (x, y) => {
      if (terrain.isWater(x, y)) return -1;
      terrain.slopeAt(x, y, g);
      return -(g[0] * wind.x + g[1] * wind.y);
    };

    // start over gentle land: a launch straight into a wall is not a game
    let sx = 0, sy = 0, bestFlat = Infinity;
    for (let i = 0; i < 60; i++) {
      const cx = (rnd() - 0.5) * 9000, cy = (rnd() - 0.5) * 9000;
      if (terrain.isWater(cx, cy)) continue;
      terrain.slopeAt(cx, cy, g);
      const steep = Math.abs(g[0]) + Math.abs(g[1]);
      if (steep < bestFlat) { bestFlat = steep; sx = cx; sy = cy; }
      if (bestFlat < 0.25) break;
    }

    const gates = [];
    let x = sx, y = sy;
    let heading = rnd() * TAU;

    for (let i = 0; i < GATE_COUNT; i++) {
      heading += (rnd() - 0.5) * 1.2;
      const dist = 1700 + rnd() * 900;
      const nx = x + Math.cos(heading) * dist;
      const ny = y + Math.sin(heading) * dist;

      // nudge each gate towards a slope that actually works in this wind,
      // so every leg has a way back up if you arrive low
      let bx = nx, by = ny, bs = -Infinity;
      for (let k = 0; k < 8; k++) {
        const cx = nx + (rnd() - 0.5) * 700;
        const cy = ny + (rnd() - 0.5) * 700;
        let s = upwind(cx, cy);
        s = Math.max(s, upwind(cx + 140, cy), upwind(cx - 140, cy),
                        upwind(cx, cy + 140), upwind(cx, cy - 140));
        if (s > bs) { bs = s; bx = cx; by = cy; }
      }

      const groundM = terrain.groundAt(bx, by);
      const alt = Math.max(terrain.seaM + 70, groundM + 55 + rnd() * 120);
      gates.push({ x: bx, y: by, alt, groundM, radius: GATE_RADIUS, band: GATE_BAND });
      x = bx; y = by;
    }

    return { start: { x: sx, y: sy }, gates };
  }

  /* ------------------------------------------------------------- setup */

  function reset(newSeed) {
    if (newSeed !== undefined) state.seed = newSeed;
    state.terrain = makeTerrain(state.seed);

    const rnd = mulberry32(state.seed ^ 0x1234abc);
    const a = rnd() * TAU;
    state.wind = { x: Math.cos(a), y: Math.sin(a), angle: a };

    const course = buildCourse(state.terrain, state.seed, state.wind);
    state.gates = course.gates;
    state.gateIndex = 0;

    const g0 = state.gates[0];
    const heading = Math.atan2(g0.y - course.start.y, g0.x - course.start.x);
    state.craft = {
      x: course.start.x, y: course.start.y,
      alt: state.terrain.groundAt(course.start.x, course.start.y) + 210,
      heading, speed: 190, speedTarget: 190
    };

    state.cam.x = state.craft.x;
    state.cam.y = state.craft.y;
    state.time = 0;
    state.vario = state.varioSmooth = state.ridge = state.thermal = 0;
    state.flash = null;
    state.phase = 'ready';
  }

  /* ------------------------------------------------------------ physics */

  const grad = [0, 0];

  function update(dt) {
    state.clock += dt;
    if (state.flash) {
      state.flash.t -= dt;
      if (state.flash.t <= 0) state.flash = null;
    }
    if (state.phase !== 'flying') return;

    const c = state.craft;
    const t = state.terrain;

    // ---- controls
    const left = keys.has('ArrowLeft') || keys.has('KeyA');
    const right = keys.has('ArrowRight') || keys.has('KeyD');
    const fast = keys.has('ArrowUp') || keys.has('KeyW');
    const slow = keys.has('ArrowDown') || keys.has('KeyS');

    const vt = (c.speed - V_MIN) / (V_MAX - V_MIN);
    const turn = (TURN_SLOW + (TURN_FAST - TURN_SLOW) * vt) * Math.PI / 180;
    if (left) c.heading -= turn * dt;
    if (right) c.heading += turn * dt;

    if (fast) c.speedTarget += V_ACCEL * dt;
    if (slow) c.speedTarget -= V_ACCEL * dt;
    c.speedTarget = clamp(c.speedTarget, V_MIN, V_MAX);
    c.speed += clamp(c.speedTarget - c.speed, -V_ACCEL * dt, V_ACCEL * dt);

    // ---- move through the air mass, which itself drifts downwind
    c.x += (Math.cos(c.heading) * c.speed + state.wind.x * WIND_DRIFT) * dt;
    c.y += (Math.sin(c.heading) * c.speed + state.wind.y * WIND_DRIFT) * dt;

    // ---- vertical budget
    const groundM = t.groundAt(c.x, c.y);
    const agl = c.alt - groundM;
    const overWater = t.isWater(c.x, c.y);

    let ridge = 0;
    if (!overWater && agl < RIDGE_AGL) {
      t.slopeAt(c.x, c.y, grad);
      const up = -(grad[0] * state.wind.x + grad[1] * state.wind.y);
      const fall = Math.pow(clamp(1 - agl / RIDGE_AGL, 0, 1), 1.1);
      ridge = clamp(up * RIDGE_GAIN, 0, RIDGE_MAX) * fall;
    }

    let thermal = t.thermalLift(c.x, c.y);
    if (c.alt > THERMAL_FADE) {
      thermal *= clamp(1 - (c.alt - THERMAL_FADE) / (THERMAL_TOP - THERMAL_FADE), 0, 1);
    }

    const sink = SINK_MIN + SINK_SPAN * vt * vt;
    state.ridge = ridge;
    state.thermal = thermal;
    state.vario = ridge + thermal - sink;
    state.varioSmooth += (state.vario - state.varioSmooth) * Math.min(1, dt * 6);

    c.alt = Math.min(ALT_CEIL, c.alt + state.vario * dt);
    state.time += dt;

    // ---- terrain contact
    if (c.alt <= groundM) {
      c.alt = groundM;
      state.phase = 'crashed';
      state.flash = { color: '#ff3b30', t: 0.45, max: 0.45 };
      return;
    }

    // ---- gates
    const gate = state.gates[state.gateIndex];
    if (gate) {
      const dx = c.x - gate.x, dy = c.y - gate.y;
      if (dx * dx + dy * dy < gate.radius * gate.radius &&
          Math.abs(c.alt - gate.alt) < gate.band) {
        state.gateIndex++;
        state.flash = { color: PALETTES[state.palette].gateOk, t: 0.25, max: 0.25 };
        if (state.gateIndex >= state.gates.length) {
          state.phase = 'won';
          if (!state.best || state.time < state.best.time) {
            state.best = { time: state.time, seed: state.seed };
            writeBest(state.best);
          }
        }
      }
    }
  }

  /* ------------------------------------------------------------- camera */

  function updateCamera(dt) {
    const c = state.craft;
    const tx = c.x + Math.cos(c.heading) * 150;
    const ty = c.y + Math.sin(c.heading) * 150;
    const k = Math.min(1, dt * 3.5);
    state.cam.x += (tx - state.cam.x) * k;
    state.cam.y += (ty - state.cam.y) * k;
  }

  /* -------------------------------------------------------------- draw */

  function draw(dt) {
    const pal = PALETTES[state.palette];
    const c = state.craft;
    r.drawTerrain(state.terrain, state.cam.x, state.cam.y, pal);
    r.drawWind(state.wind, pal, dt);
    r.drawThermals(state.terrain, pal, state.clock);

    for (let i = 0; i < state.gates.length; i++) {
      r.drawGate(state.terrain, state.gates[i], pal, i === state.gateIndex,
                 i < state.gateIndex, c);
    }
    const next = state.gates[state.gateIndex];
    if (next) r.drawPointer(next, pal);

    r.drawCraft(c, pal, state.terrain.groundAt(c.x, c.y), state.clock);

    if (state.flash) {
      r.flash(state.flash.color, 0.5 * (state.flash.t / state.flash.max));
    }
    r.present();
  }

  /* --------------------------------------------------------------- api */

  function start() {
    if (state.phase === 'ready') state.phase = 'flying';
  }

  function togglePause() {
    if (state.phase === 'flying') state.phase = 'paused';
    else if (state.phase === 'paused') state.phase = 'flying';
  }

  function cyclePalette(dir = 1) {
    state.palette = (state.palette + dir + PALETTES.length) % PALETTES.length;
  }

  function agl() {
    const c = state.craft;
    return c.alt - state.terrain.groundAt(c.x, c.y);
  }

  return {
    state, keys, reset, update, updateCamera, draw, start, togglePause,
    cyclePalette, agl,
    resize: (w, h) => r.resize(w, h),
    get palette() { return PALETTES[state.palette]; }
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export { GATE_COUNT, GATE_BAND };
