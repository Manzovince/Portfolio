// Note colours shared by the keys, the roll, the waterfall and the staff.
// "parts" follows the two sounds (A / B, or right / left hand in a song).
import { S, on } from './store.js?v=202611093';
import { LOWEST, HIGHEST } from './notes.js?v=202611093';

export function hsv(h, s = 1, v = 1) {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6];
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

let cache = null;
export function palette() {
  if (cache) return cache;
  const css = getComputedStyle(document.documentElement);
  const v = k => css.getPropertyValue(k).trim();
  cache = { a: v('--a'), b: v('--b'), text: v('--text'), dim: v('--dim'), faint: v('--faint'), line: v('--line'), line2: v('--line2'), panel: v('--panel'), bg: v('--bg'), accent: v('--accent'), danger: v('--danger') };
  return cache;
}
on('theme', () => { cache = null; });

// `side` 0/1 = part A/B (or right/left hand)
export function noteColor(midi, side = 0) {
  switch (S.view.colors) {
    case 'rainbow': return hsv(((midi - LOWEST) / (HIGHEST - LOWEST)) * 0.85, 0.62, 0.95);
    case 'octave': return hsv((midi % 12) / 12, 0.6, 0.95);
    default: return side ? palette().b : palette().a;
  }
}
