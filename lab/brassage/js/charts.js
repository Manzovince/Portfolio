// Colour ramps, a small line chart, tooltip helpers.

export const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function ramp(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const f = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(f));
  const a = hex(stops[i]), b = hex(stops[i + 1]), u = f - i;
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * u)).join(',')})`;
}

// perceptual multi-hue ramp, used for card identity (starting position)
const VIRIDIS = ['#440154', '#482777', '#3f4a8a', '#31678e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'];
export const identity = (t) => ramp(VIRIDIS, t);
export const identityStops = () => VIRIDIS;

const SEQ_L = ['#ebeae5', '#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'];
const SEQ_D = ['#2c2c2a', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#b7d3f6'];
export const seq = (t) => ramp(isDark() ? SEQ_D : SEQ_L, t);
export const seqStops = () => (isDark() ? SEQ_D : SEQ_L);

// t in [-1, 1]: -1 = moved toward the top (blue), +1 = toward the bottom (red)
const DIV_L = ['#1c5cab', '#86b6ef', '#f0efec', '#ef9a92', '#b9302f'];
const DIV_D = ['#86b6ef', '#2f6fbf', '#383835', '#b84040', '#f19b98'];
export const div = (t) => ramp(isDark() ? DIV_D : DIV_L, (t + 1) / 2);
export const divStops = () => (isDark() ? DIV_D : DIV_L);

export const series = (i) => css(`--s${(i % 8) + 1}`);

export function gradientCss(stops) {
  return `linear-gradient(90deg, ${stops.join(',')})`;
}

export function fitCanvas(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

const tip = () => document.getElementById('tip');
export function showTip(html, x, y) {
  const el = tip();
  el.innerHTML = html;
  el.hidden = false;
  const r = el.getBoundingClientRect();
  let left = x + 14, top = y + 14;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > innerHeight - 8) top = y - r.height - 14;
  el.style.left = Math.max(8, left) + 'px';
  el.style.top = Math.max(8, top) + 'px';
}
export function hideTip() { tip().hidden = true; }

function niceTicks(min, max, count = 5) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

// opts: { series:[{name,color,points:[[x,y]],dash,width}], refs:[{y,label}], yMin, yMax,
//         xLabel, yFmt, xFmt, highlightX, integerX }
export function lineChart(canvas, opts) {
  canvas._opts = opts;
  drawLine(canvas, null);
  if (!canvas._wired) {
    canvas._wired = true;
    canvas.addEventListener('mousemove', (e) => {
      const g = canvas._geom;
      if (!g) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const xv = g.ix(mx);
      let best = null;
      for (const s of canvas._opts.series) for (const p of s.points) if (best === null || Math.abs(p[0] - xv) < Math.abs(best - xv)) best = p[0];
      if (best === null) return;
      drawLine(canvas, best);
      const o = canvas._opts;
      const rows = o.series
        .map((s) => [s, s.points.find((p) => p[0] === best)])
        .filter(([, p]) => p)
        .map(([s, p]) => `<div><span class="sw" style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${s.color};margin-right:5px"></span><span class="k">${s.name}</span> <b>${(o.yFmt || String)(p[1])}</b></div>`);
      (o.refs || []).forEach((r) => rows.push(`<div class="k">${r.label}: ${(o.yFmt || String)(r.y)}</div>`));
      showTip(`<div><b>${(o.xFmt || ((x) => x))(best)}</b></div>${rows.join('')}`, e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseleave', () => { drawLine(canvas, null); hideTip(); });
  }
}

function drawLine(canvas, hoverX) {
  const o = canvas._opts;
  const w = canvas.parentElement.clientWidth;
  const h = parseFloat(getComputedStyle(canvas).height) || 200;
  const ctx = fitCanvas(canvas, w, h);
  const all = o.series.flatMap((s) => s.points);
  if (!all.length) { canvas._geom = null; return; }
  let xMin = Math.min(...all.map((p) => p[0])), xMax = Math.max(...all.map((p) => p[0]));
  if (xMax === xMin) xMax = xMin + 1;
  const ys = all.map((p) => p[1]).concat((o.refs || []).map((r) => r.y));
  let yMin = o.yMin ?? Math.min(...ys), yMax = o.yMax ?? Math.max(...ys);
  if (yMax === yMin) { yMax += 1; yMin -= 1; }
  const yt = niceTicks(yMin, yMax, 4);
  yMin = Math.min(yMin, yt[0]); yMax = Math.max(yMax, yt[yt.length - 1]);
  const labelW = o.series.length > 1 && o.series.length <= 4 ? 110 : 16;
  const pad = { l: 44, r: labelW, t: 10, b: 28 };
  const X = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * (w - pad.l - pad.r);
  const Y = (y) => h - pad.b - ((y - yMin) / (yMax - yMin)) * (h - pad.t - pad.b);
  canvas._geom = { ix: (px) => xMin + ((px - pad.l) / (w - pad.l - pad.r)) * (xMax - xMin) };

  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = css('--muted');
  ctx.strokeStyle = css('--grid');
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const t of yt) {
    const y = Math.round(Y(t)) + 0.5;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillText((o.yFmt || String)(t), pad.l - 6, y);
  }
  let xt = niceTicks(xMin, xMax, Math.max(2, Math.floor((w - pad.l - pad.r) / 70)));
  if (o.integerX) xt = xt.filter((v) => Number.isInteger(v));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of xt) ctx.fillText(String(t), X(t), h - pad.b + 7);
  ctx.strokeStyle = css('--axis');
  ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b + 0.5); ctx.lineTo(w - pad.r, h - pad.b + 0.5); ctx.stroke();

  for (const r of o.refs || []) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = css('--ink-2');
    ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.moveTo(pad.l, Y(r.y)); ctx.lineTo(w - pad.r, Y(r.y)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = css('--ink-2');
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(r.label, pad.l + 4, Y(r.y) - 3);
  }

  if (o.highlightX != null) {
    ctx.fillStyle = css('--wash');
    ctx.fillRect(X(o.highlightX) - 4, pad.t, 8, h - pad.t - pad.b);
  }

  for (const s of o.series) {
    if (!s.points.length) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width || 2;
    ctx.lineJoin = 'round';
    ctx.setLineDash(s.dash || []);
    ctx.beginPath();
    s.points.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
    ctx.stroke();
    ctx.setLineDash([]);
    if (s.points.length === 1) {
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(X(s.points[0][0]), Y(s.points[0][1]), 4, 0, 7); ctx.fill();
    }
  }
  // direct labels at line ends
  if (o.series.length > 1 && o.series.length <= 4) {
    const ends = o.series.filter((s) => s.points.length).map((s) => ({ s, y: Y(s.points[s.points.length - 1][1]) }));
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = css('--ink-2');
    for (const e of ends) ctx.fillText(e.s.name.length > 16 ? e.s.name.slice(0, 15) + '…' : e.s.name, w - pad.r + 6, e.y);
  }

  if (hoverX != null) {
    ctx.strokeStyle = css('--axis');
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(hoverX) + 0.5, pad.t); ctx.lineTo(X(hoverX) + 0.5, h - pad.b); ctx.stroke();
    for (const s of o.series) {
      const p = s.points.find((q) => q[0] === hoverX);
      if (!p) continue;
      ctx.fillStyle = s.color;
      ctx.strokeStyle = css('--surface');
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 4.5, 0, 7); ctx.fill(); ctx.stroke();
    }
  }
}

export function redrawChart(canvas) {
  if (canvas._opts) drawLine(canvas, null);
}
