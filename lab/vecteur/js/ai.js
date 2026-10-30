// Rival pilots: they press the same two "buttons" a player does — pivot or push, never both.
import { wrap } from './physics.js';

export function aiInput(s, track, skill) {
  const { n, lx, ly } = track;
  const sp = Math.hypot(s.vx, s.vy);
  const look = Math.round(skill.look + sp * 0.034);
  const i = (s.idx + look) % n;
  const tx = lx[i] - s.x, ty = ly[i] - s.y;
  const want = Math.atan2(ty, tx);
  // aim past the target to cancel sideways drift
  const va = sp > 60 ? Math.atan2(s.vy, s.vx) : s.a;
  const drift = Math.max(-0.7, Math.min(0.7, wrap(want - va)));
  const aim = want + drift * skill.correct;
  const err = wrap(aim - s.a);
  if (err > skill.dead) return [false, true];
  if (err < -skill.dead) return [true, false];
  return [true, true];
}

export const RIVALS = [
  { name: 'ÉCHO', hue: 20 },
  { name: 'NULL', hue: 300 },
  { name: 'BYTE', hue: 90 },
  { name: 'PING', hue: 50 },
];

// Skill per level index: later levels get sharper and stronger rivals.
export function rivalSkill(levelIdx, k) {
  const base = 0.74 + levelIdx * 0.02 - k * 0.02;
  return { thrust: Math.min(1.02, base), look: 9 + (k % 2) * 3, correct: 0.75, dead: 0.1 + k * 0.015 };
}
