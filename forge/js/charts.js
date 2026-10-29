// Tiny SVG charts (bars, lines) with a shared tap/hover tooltip.
import { esc } from './ui.js?v=7';

const W = 340;

// Rounded-top bar path anchored on the baseline.
function barPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  if (h <= 0) return '';
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };

// data: [{label, values:[...], tip}] · series: [{name, color}]
export function bars({ data, series, h = 150, fmt = v => v, labelEvery = 1 }) {
  const padL = 30, padB = 20, padT = 8;
  const max = niceMax(Math.max(0, ...data.map(d => d.values.reduce((a, b) => a + b, 0))));
  const iw = W - padL - 4, ih = h - padB - padT;
  const slot = iw / Math.max(1, data.length), bw = Math.max(3, Math.min(22, slot * 0.62));
  const ticks = [0, max / 2, max];
  let out = `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">`;
  for (const t of ticks) {
    const y = padT + ih - (t / max) * ih;
    out += `<line class="grid" x1="${padL}" x2="${W - 4}" y1="${y}" y2="${y}"/><text class="ax" x="${padL - 6}" y="${y + 3}" text-anchor="end">${esc(fmt(t))}</text>`;
  }
  data.forEach((d, i) => {
    const x = padL + i * slot + (slot - bw) / 2;
    let acc = 0;
    const segs = d.values.map((v, k) => ({ v, k })).filter(s => s.v > 0);
    segs.forEach((s, n) => {
      const hh = (s.v / max) * ih;
      const y = padT + ih - (acc + s.v) / max * ih;
      const gap = n > 0 ? 2 : 0;
      const top = n === segs.length - 1;
      out += top ? `<path d="${barPath(x, y, bw, hh - gap, 3)}" fill="${series[s.k].color}"/>` : `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(0, hh - gap)}" fill="${series[s.k].color}"/>`;
      acc += s.v;
    });
    if (i % labelEvery === 0) out += `<text class="ax" x="${x + bw / 2}" y="${h - 5}" text-anchor="middle">${esc(d.label)}</text>`;
    out += `<rect class="hit" x="${padL + i * slot}" y="${padT}" width="${slot}" height="${ih}" data-tip="${esc(d.tip || '')}"/>`;
  });
  out += `<line class="base" x1="${padL}" x2="${W - 4}" y1="${padT + ih}" y2="${padT + ih}"/></svg>`;
  return out;
}

// pts: [{x (ms), y, tip}] · invert: lower is better (pace) → drawn upside down
export function line({ pts, color = 'var(--c1)', h = 160, fmtY = v => v, invert = false, area = true }) {
  if (pts.length < 2) return `<p class="empty sm">Pas encore assez de données pour une courbe.</p>`;
  const padL = 38, padB = 20, padT = 12;
  const iw = W - padL - 10, ih = h - padB - padT;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const padY = (y1 - y0) * 0.15 || Math.abs(y1) * 0.1 || 1;
  y0 -= padY; y1 += padY;
  if (!invert && y0 < 0 && Math.min(...ys) >= 0) y0 = 0;
  const X = x => padL + (x1 === x0 ? iw / 2 : ((x - x0) / (x1 - x0)) * iw);
  const Y = y => { const t = (y - y0) / (y1 - y0); return padT + (invert ? t : 1 - t) * ih; };
  let out = `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">`;
  for (let k = 0; k <= 2; k++) {
    const v = y0 + ((y1 - y0) * k) / 2, y = Y(v);
    out += `<line class="grid" x1="${padL}" x2="${W - 10}" y1="${y}" y2="${y}"/><text class="ax" x="${padL - 6}" y="${y + 3}" text-anchor="end">${esc(fmtY(v))}</text>`;
  }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  if (area) out += `<path class="area" d="${d}L${X(x1)},${padT + ih}L${X(x0)},${padT + ih}Z" fill="${color}"/>`;
  out += `<path class="ln" d="${d}" stroke="${color}"/>`;
  const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
  const dl = x => { const t = new Date(x); return `${t.getDate()} ${months[t.getMonth()]}`; };
  out += `<text class="ax" x="${padL}" y="${h - 5}">${dl(x0)}</text><text class="ax" x="${W - 10}" y="${h - 5}" text-anchor="end">${dl(x1)}</text>`;
  const best = invert ? Math.min(...ys) : Math.max(...ys);
  pts.forEach(p => {
    const isBest = p.y === best;
    out += `<circle class="dot ${isBest ? 'best' : ''}" cx="${X(p.x)}" cy="${Y(p.y)}" r="${isBest ? 4.5 : 3}" fill="${isBest ? color : 'var(--surface)'}" stroke="${color}"/>`;
    out += `<circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="14" data-tip="${esc(p.tip || '')}"/>`;
  });
  return out + '</svg>';
}

// One tooltip element for all charts; follows pointer, tap on mobile.
export function attachTips(container) {
  let tip = document.getElementById('chart-tip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'chart-tip'; document.body.append(tip); }
  const show = e => {
    const t = e.target.closest('[data-tip]');
    container.querySelectorAll('.hit.on').forEach(x => x.classList.remove('on'));
    if (!t || !t.dataset.tip) { tip.classList.remove('on'); return; }
    t.classList.add('on');
    tip.innerHTML = t.dataset.tip;
    const r = t.getBoundingClientRect();
    tip.classList.add('on');
    const tw = tip.offsetWidth;
    tip.style.left = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2)) + 'px';
    tip.style.top = Math.max(8, r.top - tip.offsetHeight - 8) + 'px';
  };
  container.addEventListener('pointerover', show);
  container.addEventListener('click', show);
  container.addEventListener('pointerleave', () => { tip.classList.remove('on'); container.querySelectorAll('.hit.on').forEach(x => x.classList.remove('on')); });
}
export const hideTip = () => document.getElementById('chart-tip')?.classList.remove('on');
