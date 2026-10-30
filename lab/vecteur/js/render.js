// Neon vector renderer: everything is strokes on a dark field.
import { ranking } from './race.js';

export function prepareTrack(tr) {
  const loop = poly => { const p = new Path2D(); poly.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; };
  const walls = new Path2D();
  walls.addPath(loop(tr.left)); walls.addPath(loop(tr.right));
  const floor = new Path2D();
  floor.addPath(loop(tr.left)); floor.addPath(loop(tr.right.slice().reverse()));
  const pillars = new Path2D();
  tr.pillars.forEach(p => pillars.addPath(loop(p.poly)));
  const arrows = new Path2D();
  for (let i = 15; i < tr.n; i += 34) {
    const x = tr.cx[i], y = tr.cy[i], tx = tr.tx[i], ty = tr.ty[i], nx = tr.nx[i], ny = tr.ny[i];
    const s = Math.min(34, tr.hw[i] * 0.3);
    arrows.moveTo(x - tx * s * 0.6 + nx * s, y - ty * s * 0.6 + ny * s);
    arrows.lineTo(x + tx * s * 0.4, y + ty * s * 0.4);
    arrows.lineTo(x - tx * s * 0.6 - nx * s, y - ty * s * 0.6 - ny * s);
  }
  const start = new Path2D();
  start.moveTo(tr.left[0][0], tr.left[0][1]); start.lineTo(tr.right[0][0], tr.right[0][1]);
  const mini = loop(Array.from({ length: Math.ceil(tr.n / 4) }, (_, k) => [tr.cx[k * 4], tr.cy[k * 4]]));
  tr.gfx = { walls, floor, pillars, arrows, start, mini };
  return tr;
}

const shipColor = (s, hue) => s.hue == null ? '#f4fbff' : `hsl(${s.hue} 95% 62%)`;
const trailColor = (s, hue) => s.hue == null ? `hsl(${hue} 100% 65%)` : `hsl(${s.hue} 95% 55%)`;

export function drawFrame(ctx, W, H, dpr, game) {
  const { race, cam, fx, hue } = game;
  const tr = race.track, g = tr.gfx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#04050b';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
  const vw = W / cam.z / 2 + 120, vh = H / cam.z / 2 + 120;

  // background grid
  ctx.strokeStyle = `hsla(${hue}, 70%, 55%, 0.07)`;
  ctx.lineWidth = 1 / cam.z;
  ctx.beginPath();
  const G = 100;
  for (let x = Math.floor((cam.x - vw) / G) * G; x < cam.x + vw; x += G) { ctx.moveTo(x, cam.y - vh); ctx.lineTo(x, cam.y + vh); }
  for (let y = Math.floor((cam.y - vh) / G) * G; y < cam.y + vh; y += G) { ctx.moveTo(cam.x - vw, y); ctx.lineTo(cam.x + vw, y); }
  ctx.stroke();

  // floor + direction chevrons
  ctx.fillStyle = `hsla(${hue}, 60%, 14%, 0.55)`;
  ctx.fill(g.floor, 'evenodd');
  ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.10)`;
  ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke(g.arrows);

  // start line
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 18; ctx.stroke(g.start);
  ctx.setLineDash([12, 12]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.stroke(g.start); ctx.setLineDash([]);

  // walls: three passes = cheap glow
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `hsla(${hue}, 60%, 10%, 1)`; ctx.fill(g.pillars);
  for (const [w, a, l] of [[16, 0.06, 55], [7, 0.18, 60], [2.2, 1, 75]]) {
    ctx.strokeStyle = `hsla(${hue}, 100%, ${l}%, ${a})`;
    ctx.lineWidth = w;
    ctx.stroke(g.walls); ctx.stroke(g.pillars);
  }

  // scrape glow on the wall
  for (const s of race.ships) {
    if (s.scrape > 0.05) {
      const r = 70 * s.scrape;
      const grd = ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, r);
      grd.addColorStop(0, `hsla(${s.hue ?? hue}, 100%, 75%, ${0.55 * s.scrape})`); grd.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = grd; ctx.fillRect(s.cx - r, s.cy - r, r * 2, r * 2);
    }
  }

  // ghost
  if (game.ghost) {
    const gh = game.ghost;
    ctx.globalAlpha = 0.35;
    drawShip(ctx, gh.x, gh.y, gh.a, '#ffffff', false);
    ctx.globalAlpha = 1;
  }

  // trails
  ctx.lineCap = 'round';
  for (const s of race.ships) {
    const t = s.trail; if (!t || t.length < 2) continue;
    ctx.strokeStyle = trailColor(s, hue);
    for (let i = 1; i < t.length; i++) {
      const k = i / t.length;
      ctx.globalAlpha = k * 0.8;
      ctx.lineWidth = 1 + k * 5;
      ctx.beginPath(); ctx.moveTo(t[i - 1][0], t[i - 1][1]); ctx.lineTo(t[i][0], t[i][1]); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // sparks
  for (const p of fx.sparks) {
    ctx.strokeStyle = `hsla(${p.h}, 100%, ${60 + p.life * 30}%, ${p.life})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  // ships (player last)
  for (let i = race.ships.length - 1; i >= 0; i--) {
    const s = race.ships[i];
    drawShip(ctx, s.x, s.y, s.a, shipColor(s, hue), s.thrust, s.hue ?? hue);
  }
  // rival name tags
  ctx.font = `600 ${11 / cam.z * 1.1}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = 'center';
  for (const s of race.ships) if (s.id) { ctx.fillStyle = `hsla(${s.hue}, 90%, 70%, 0.8)`; ctx.fillText(s.name, s.x, s.y - 20); }
  ctx.restore();

  // speed streaks (screen space)
  const p = race.ships[0], sp = Math.hypot(p.vx, p.vy);
  if (sp > 650) {
    const a = Math.min(0.35, (sp - 650) / 1200), dx = -p.vx / sp, dy = -p.vy / sp;
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const st of fx.streaks) {
      const x = st.x * W, y = st.y * H, L = st.l * (sp / 900) * 60;
      ctx.moveTo(x, y); ctx.lineTo(x + dx * L, y + dy * L);
    }
    ctx.stroke();
  }
  if (p.hit > 0) { ctx.fillStyle = `hsla(${hue},100%,70%,${p.hit * 0.12})`; ctx.fillRect(0, 0, W, H); }
  drawHud(ctx, W, H, game);
}

function drawShip(ctx, x, y, a, col, thrust, hue) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  if (thrust) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `hsla(${hue}, 100%, 65%, 0.8)`;
    const f = 10 + Math.random() * 8;
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-8 - f, 0); ctx.lineTo(-8, 4); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = col;
  ctx.shadowColor = col; ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(-9, -10); ctx.lineTo(-5, 0); ctx.lineTo(-9, 10); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const fmt = t => {
  if (t == null) return '--:--.--';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};
export { fmt };

function drawHud(ctx, W, H, game) {
  const { race, hue } = game;
  const p = race.ships[0];
  const pad = 14, top = Math.max(pad, game.safeTop || 0) + 4;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 11px ui-monospace, Menlo, monospace';
  ctx.fillText('TOUR', pad, top);
  ctx.fillStyle = '#fff';
  ctx.font = '700 22px ui-monospace, Menlo, monospace';
  ctx.fillText(`${Math.min(p.lap + 1, race.laps)}/${race.laps}`, pad, top + 13);
  ctx.font = '600 15px ui-monospace, Menlo, monospace';
  ctx.fillStyle = `hsl(${hue} 100% 75%)`;
  ctx.fillText(fmt(p.done ?? race.t), pad, top + 40);
  if (game.bestLap) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '500 11px ui-monospace, Menlo, monospace'; ctx.fillText('MEILLEUR ' + fmt(game.bestLap), pad, top + 60); }

  // position (races)
  if (race.ships.length > 1) {
    const rk = ranking(race), pos = rk.indexOf(p) + 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = '800 30px ui-monospace, Menlo, monospace';
    ctx.fillText(`${pos}`, W / 2 - 8, top + 2);
    ctx.font = '600 13px ui-monospace, Menlo, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`/${race.ships.length}`, W / 2 + 16, top + 14);
  }

  // minimap
  const tr = race.track, [x0, y0, x1, y1] = tr.bounds;
  const box = Math.min(110, W * 0.26), sc = box / Math.max(x1 - x0, y1 - y0);
  const mx = W - pad - (x1 - x0) * sc, my = top + 40;
  ctx.save();
  ctx.translate(mx, my); ctx.scale(sc, sc); ctx.translate(-x0, -y0);
  ctx.strokeStyle = `hsla(${hue}, 90%, 65%, 0.45)`; ctx.lineWidth = 3 / sc; ctx.stroke(tr.gfx.mini);
  for (let i = race.ships.length - 1; i >= 0; i--) {
    const s = race.ships[i];
    ctx.fillStyle = shipColor(s, hue);
    ctx.beginPath(); ctx.arc(s.x, s.y, (s.id ? 3.2 : 4.5) / sc, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // speed bar
  const sp = Math.hypot(p.vx, p.vy), bw = Math.min(160, W * 0.4);
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(W / 2 - bw / 2, H - 22 - (game.safeBottom || 0), bw, 3);
  ctx.fillStyle = p.scrape > 0.3 ? '#fff' : `hsl(${hue} 100% 65%)`;
  ctx.fillRect(W / 2 - bw / 2, H - 22 - (game.safeBottom || 0), bw * Math.min(1, sp / 1200), 3);

  // touch halves
  const tL = game.input.L, tR = game.input.R;
  if (tL || tR) {
    const grd = (x0, x1) => { const g = ctx.createLinearGradient(0, H - 120, 0, H); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `hsla(${hue},100%,70%,0.12)`); ctx.fillStyle = g; ctx.fillRect(x0, H - 120, x1 - x0, 120); };
    if (tL) grd(0, W / 2); if (tR) grd(W / 2, W);
  }

  // countdown / center text
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (race.state === 'count') {
    const c = Math.ceil(race.count);
    const f = race.count - Math.floor(race.count);
    ctx.font = `800 ${70 + f * 30}px ui-monospace, Menlo, monospace`;
    ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${0.4 + f * 0.6})`;
    ctx.fillText(String(c), W / 2, H * 0.38);
  }
  if (game.toast && game.toast.t > 0) {
    const a = Math.min(1, game.toast.t);
    ctx.globalAlpha = a;
    ctx.font = '800 26px ui-monospace, Menlo, monospace'; ctx.fillStyle = '#fff';
    ctx.fillText(game.toast.big, W / 2, H * 0.3);
    if (game.toast.small) { ctx.font = '600 14px ui-monospace, Menlo, monospace'; ctx.fillStyle = `hsl(${hue} 100% 75%)`; ctx.fillText(game.toast.small, W / 2, H * 0.3 + 28); }
    ctx.globalAlpha = 1;
  }
  if (p.wrong > 1 && race.state === 'run') {
    ctx.font = '800 20px ui-monospace, Menlo, monospace'; ctx.fillStyle = '#ff4d6d';
    ctx.fillText('⟲ SENS INVERSE', W / 2, H * 0.45);
  }
  if (game.hint && game.hint.t > 0) {
    ctx.globalAlpha = Math.min(1, game.hint.t);
    ctx.font = '600 14px ui-monospace, Menlo, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    game.hint.lines.forEach((l, i) => ctx.fillText(l, W / 2, H * 0.62 + i * 22));
    ctx.globalAlpha = 1;
  }
}

// small static preview for the level picker
export function drawThumb(canvas, tr, hue) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const [x0, y0, x1, y1] = tr.bounds, sc = Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.86;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  ctx.fillStyle = `hsla(${hue}, 60%, 30%, 0.35)`; ctx.fill(tr.gfx.floor, 'evenodd');
  ctx.strokeStyle = `hsl(${hue} 100% 65%)`; ctx.lineWidth = 2 / sc * (W / 160);
  ctx.stroke(tr.gfx.walls); ctx.stroke(tr.gfx.pillars);
  ctx.restore();
}
