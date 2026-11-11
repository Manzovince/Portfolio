// Play screen stage: notes rise from the keys they were played on, over a
// faint oscilloscope of the sound. Columns come from the keyboard dock.
import { subscribe } from './notes.js?v=202611133';
import { geometry, onLayout } from './keys.js?v=202611133';
import { partOf } from './perform.js?v=202611133';
import { noteColor, palette } from './colors.js?v=202611133';
import { analyser, busy } from './engine.js?v=202611133';
import { S } from './store.js?v=202611133';

const SPEED = 0.085; // px per ms
const MAX = 1500;
let timeline = []; // { midi, velocity, start, end, side }
let canvas = null, g = null, raf = 0, size = { w: 0, h: 0, left: 0 };
let wave = null, gain = 1, quiet = 0;

subscribe(e => {
  if (e.type === 'on') {
    timeline.push({ midi: e.midi, velocity: e.velocity, start: e.time, end: null, side: partOf(e.midi) });
    if (timeline.length > MAX) timeline.splice(0, timeline.length - MAX);
    wake();
  } else if (e.type === 'off') {
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].midi === e.midi && timeline[i].end === null) { timeline[i].end = e.time; break; }
    }
  }
});

export function clearRoll() { timeline = timeline.filter(n => n.end === null); }

function fit() {
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  size = { w: r.width, h: r.height, left: r.left };
  wake();
}

let unLayout = null;
export function mountRoll(el) {
  canvas = el;
  g = el.getContext('2d');
  new ResizeObserver(fit).observe(el);
  unLayout?.();
  unLayout = onLayout(fit);
  fit();
}

function drawScope(now) {
  const an = S.view.scope && analyser();
  if (!an) return false;
  if (!wave || wave.length !== an.fftSize) wave = new Float32Array(an.fftSize);
  an.getFloatTimeDomainData(wave);
  let peak = 0;
  for (let i = 0; i < wave.length; i += 4) peak = Math.max(peak, Math.abs(wave[i]));
  if (peak < 0.0015) return false;
  gain += (Math.min(6, 0.7 / peak) - gain) * 0.08;
  let s0 = 0;
  for (let i = 1; i < wave.length - 1024; i++) if (wave[i - 1] < 0 && wave[i] >= 0) { s0 = i; break; }
  const { w, h } = size, mid = h * 0.42, amp = h * 0.26 * gain;
  const col = palette().accent;
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.2, col);
  grad.addColorStop(0.8, col);
  grad.addColorStop(1, 'transparent');
  g.save();
  g.globalAlpha = 0.28;
  g.strokeStyle = grad;
  g.lineWidth = 1.5;
  g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * w, y = mid - wave[s0 + i] * amp;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  g.restore();
  return true;
}

function frame() {
  raf = 0;
  if (!canvas || !canvas.isConnected) return;
  const now = performance.now();
  const { w, h, left } = size;
  g.clearRect(0, 0, w, h);
  const geo = geometry();
  const P = palette();
  // a faint line at every C, to read the octaves
  g.fillStyle = P.line;
  for (const [m, k] of geo) if (m % 12 === 0) g.fillRect(Math.round(k.x - left), 0, 1, h);
  if (S.split.on && geo.get(S.split.point)) {
    g.fillStyle = P.b; g.globalAlpha = 0.35;
    g.fillRect(Math.round(geo.get(S.split.point).x - left) - 1, 0, 2, h);
    g.globalAlpha = 1;
  }
  const sound = drawScope(now);
  timeline = timeline.filter(n => n.end === null || h - (now - n.end) * SPEED > 0);
  for (const n of timeline) {
    const k = geo.get(n.midi);
    if (!k) continue;
    const top = h - (now - n.start) * SPEED;
    const bottom = h - (n.end === null ? 0 : (now - n.end) * SPEED);
    const inset = k.black ? 1 : Math.max(1, k.w * 0.14);
    g.globalAlpha = 0.35 + 0.6 * n.velocity / 127;
    g.fillStyle = noteColor(n.midi, n.side);
    g.beginPath();
    g.roundRect(k.x - left + inset, top, k.w - inset * 2, Math.max(3, bottom - top), Math.min(5, (k.w - inset * 2) / 2));
    g.fill();
    if (n.end === null) {
      // glow where the note leaves the key
      g.globalAlpha = 0.25;
      g.fillRect(k.x - left + inset - 2, h - 3, k.w - inset * 2 + 4, 3);
    }
  }
  g.globalAlpha = 1;
  quiet = sound || timeline.length || busy() ? 0 : quiet + 1;
  if (quiet < 30) raf = requestAnimationFrame(frame);
}

export function wake() {
  if (!raf && canvas && canvas.isConnected) { quiet = 0; raf = requestAnimationFrame(frame); }
}
