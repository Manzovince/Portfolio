// Race state: ships, laps, ranking. No DOM here so the headless sim can drive it.
import { makeShip, stepShip, collideShips, updateProgress } from './physics.js';
import { aiInput, RIVALS, rivalSkill } from './ai.js';

export const DT = 1 / 240;
const AUTO = { thrust: 0.8, look: 10, correct: 0.75, dead: 0.1 };

export function makeRace(track, levelIdx, opts = {}) {
  const def = track.def;
  const nRivals = opts.noRivals ? 0 : def.rivals || 0;
  const ships = [];
  const { n, cx, cy, nx, ny, tx, ty } = track;
  for (let k = 0; k <= nRivals; k++) {
    // grid behind the start line, two columns, player at the back
    const row = Math.floor((nRivals - k) / 2), col = ((nRivals - k) % 2 ? 1 : -1) * (nRivals ? 1 : 0);
    const i = (n - 4 - row * 5) % n;
    const lat = col * Math.min(48, track.hw[i] * 0.4);
    const s = makeShip(cx[i] + nx[i] * lat, cy[i] + ny[i] * lat, Math.atan2(ty[i], tx[i]));
    s.idx = i;
    s.id = k;
    s.name = k === 0 ? 'V-7' : RIVALS[k - 1].name;
    s.hue = k === 0 ? null : RIVALS[k - 1].hue;
    s.skill = k === 0 ? (opts.botSkill || null) : rivalSkill(levelIdx, k - 1);
    s.lap = 0; s.prog = -((n - i) % n); s.lapStart = 0; s.lapTimes = []; s.done = null; s.half = false;
    s.wrong = 0;
    ships.push(s);
  }
  return { track, ships, t: 0, count: opts.countdown ?? 3, laps: def.laps, state: 'count', events: [], ghostRec: [], finishOrder: [] };
}

// Advance by one fixed step. input = [L, R] for the player.
export function stepRace(r, input) {
  const { track, ships } = r;
  if (r.state === 'count') {
    r.count -= DT;
    if (r.count <= 0) { r.state = 'run'; r.events.push({ type: 'go' }); }
    return;
  }
  r.t += DT;
  for (const s of ships) {
    let L, R;
    if (s.done != null) [L, R] = aiInput(s, track, s.skill || AUTO);
    else if (s.skill) [L, R] = aiInput(s, track, s.skill);
    else [L, R] = input;
    stepShip(s, L, R, DT, track, s.skill ? s.skill.thrust : 1);
  }
  for (let a = 0; a < ships.length; a++) for (let b = a + 1; b < ships.length; b++) collideShips(ships[a], ships[b]);
  const n = track.n;
  for (const s of ships) {
    const d = updateProgress(s, track);
    s.prog += d;
    s.wrong = d < 0 ? Math.min(1.5, s.wrong + DT * 2) : Math.max(0, s.wrong - DT);
    if (s.prog >= n * 0.5 + s.lap * n) s.half = true;
    if (s.half && s.prog >= (s.lap + 1) * n) {
      s.lap++; s.half = false;
      const lt = r.t - s.lapStart;
      s.lapTimes.push(lt); s.lapStart = r.t;
      if (s.id === 0) r.events.push({ type: 'lap', lap: s.lap, time: lt });
      if (s.lap >= r.laps && s.done == null) {
        s.done = r.t; r.finishOrder.push(s.id);
        if (s.id === 0) { r.state = 'done'; r.events.push({ type: 'finish' }); }
      }
    }
  }
}

export function ranking(r) {
  return r.ships.slice().sort((a, b) => {
    if (a.done != null || b.done != null) {
      if (a.done != null && b.done != null) return a.done - b.done;
      return a.done != null ? -1 : 1;
    }
    return b.prog - a.prog;
  });
}
