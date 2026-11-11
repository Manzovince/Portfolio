// Learn screen: the song falls onto the keys. A note reaches the hit line on
// the keyboard when it is due; the notes of the player's hand are solid, the
// ones the song plays itself are outlined. The awaited chord glows.
import { geometry, onLayout } from './keys.js?v=202611132';
import { currentSong, songPosition, songPart, awaitedChord, isWaitingForPlayer } from './song.js?v=202611132';
import { noteColor, palette } from './colors.js?v=202611132';
import { S } from './store.js?v=202611132';

let canvas = null, g = null, raf = 0, size = { w: 0, h: 0, left: 0 };

function fit() {
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  size = { w: r.width, h: r.height, left: r.left };
}

let unLayout = null;
export function mountFall(el) {
  canvas = el;
  g = el.getContext('2d');
  new ResizeObserver(fit).observe(el);
  unLayout?.();
  unLayout = onLayout(fit);
  fit();
  if (!raf) raf = requestAnimationFrame(frame);
}

function frame() {
  raf = 0;
  if (!canvas || !canvas.isConnected) return;
  raf = requestAnimationFrame(frame);
  const song = currentSong();
  const { w, h, left } = size;
  g.clearRect(0, 0, w, h);
  if (!song) return;
  const P = palette();
  const geo = geometry();
  const pos = songPosition();
  const span = S.song.lookahead * 1000; // song milliseconds from the top to the hit line
  const y = ms => h - ((ms - pos) / span) * h;
  const part = songPart();
  const mine = n => part === 'both' || n.hand === part;
  const awaited = awaitedChord();
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);

  // octave lines
  g.fillStyle = P.line;
  for (const [m, k] of geo) if (m % 12 === 0) g.fillRect(Math.round(k.x - left), 0, 1, h);

  // beat lines from the song's first tempo, every bar slightly stronger
  const beatMs = 60000 / (song.bpm || 120);
  const perBar = song.timeSignature?.[0] || 4;
  const firstBeat = Math.floor(pos / beatMs);
  for (let b = firstBeat; b * beatMs < pos + span; b++) {
    const yy = Math.round(y(b * beatMs));
    g.fillStyle = P.line;
    g.globalAlpha = b % perBar === 0 ? 0.9 : 0.35;
    g.fillRect(0, yy, w, 1);
  }
  g.globalAlpha = 1;

  for (const n of song.notes) {
    if (n.startMs > pos + span) break;
    if (n.endMs < pos - 400) continue;
    const k = geo.get(n.midi);
    if (!k) continue;
    const top = y(n.endMs), bottom = y(n.startMs);
    const inset = k.black ? 1 : Math.max(1.5, k.w * 0.12);
    const x = k.x - left + inset, ww = k.w - inset * 2;
    const col = noteColor(n.midi, n.hand === 'left' ? 1 : 0);
    const isAwaited = awaited && Math.abs(n.startMs - awaited.time) < 160 && awaited.midis.has(n.midi) && mine(n);
    g.beginPath();
    g.roundRect(x, top, ww, Math.max(4, bottom - top), Math.min(6, ww / 2));
    if (part === 'listen' || mine(n)) {
      g.globalAlpha = bottom < h - 1 || n.endMs > pos ? 0.92 : 0.4;
      g.fillStyle = col;
      g.fill();
      if (isAwaited) {
        g.globalAlpha = 0.5 + 0.5 * pulse;
        g.lineWidth = 3;
        g.strokeStyle = P.text;
        g.stroke();
      }
    } else {
      g.globalAlpha = 0.55;
      g.lineWidth = 1.5;
      g.strokeStyle = col;
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  // hit line
  g.fillStyle = isWaitingForPlayer() ? P.accent : P.line2;
  g.globalAlpha = isWaitingForPlayer() ? 0.6 + 0.4 * pulse : 1;
  g.fillRect(0, h - 2, w, 2);
  g.globalAlpha = 1;
}
