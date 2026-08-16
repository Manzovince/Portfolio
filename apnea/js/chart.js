// Minimal SVG charts: time-series lines and bars, both with a hover layer and a
// text-table fallback. Palette slots come from CSS custom properties so the
// charts stay in step with the rest of the app.

import { fmtTime, escapeHtml } from './format.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

const TIME_STEPS = [5, 10, 15, 20, 30, 60, 120, 180, 300, 600, 900, 1800, 3600];
export const LINEAR_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
export const PERCENT_STEPS = [5, 10, 20, 25, 50];

function niceTicks(min, max, target = 4, steps = TIME_STEPS) {
  if (!isFinite(min) || !isFinite(max)) return { lo: 0, hi: 1, ticks: [0, 1] };
  if (max === min) { max = min + 1; }
  const raw = (max - min) / target;
  const step = steps.find((s) => s >= raw) ?? Math.ceil(raw / 3600) * 3600;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-6; v += step) ticks.push(v);
  return { lo, hi, ticks };
}

function svgEl(name, attrs = {}, style = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  // paint goes through inline style: presentation attributes don't take var()
  for (const [k, v] of Object.entries(style)) node.style.setProperty(k, v);
  return node;
}

function dataTable(headers, rows) {
  const details = document.createElement('details');
  details.className = 'data-table';
  details.innerHTML = `
    <summary>Show data table</summary>
    <table class="rounds">
      <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
  return details;
}

function legend(series) {
  const box = document.createElement('div');
  box.className = 'chart-legend';
  box.innerHTML = series
    .map((s) => `<span><i style="background:${s.color}"></i>${escapeHtml(s.name)}</span>`)
    .join('');
  return box;
}

function mountResponsive(host, draw) {
  let frame = null;
  const run = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => draw(host.clientWidth || 320));
  };
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(run);
    ro.observe(host);
  } else {
    window.addEventListener('resize', run);
  }
  run();
}

/**
 * Time-series line chart.
 * series: [{ name, color, points: [{ x: epoch ms, y: number }] }]
 */
export function lineChart({ series, height = 190, yFormat = fmtTime, yMinZero = true, ySteps = TIME_STEPS }) {
  const host = document.createElement('div');
  host.style.position = 'relative';

  const visible = series.filter((s) => s.points.length);
  if (!visible.length) {
    host.innerHTML = '<div class="empty">Not enough data yet.</div>';
    return host;
  }

  if (visible.length > 1) host.appendChild(legend(visible));

  const plot = document.createElement('div');
  plot.style.position = 'relative';
  host.appendChild(plot);

  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  plot.appendChild(tip);

  const xs = [...new Set(visible.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  const ys = visible.flatMap((s) => s.points.map((p) => p.y));
  const yScaleInfo = niceTicks(yMinZero ? 0 : Math.min(...ys), Math.max(...ys), 4, ySteps);

  const draw = (width) => {
    plot.querySelector('svg')?.remove();
    const w = Math.max(240, width);
    const innerW = w - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const x0 = xs[0];
    const x1 = xs[xs.length - 1];
    const sx = (x) => PAD.left + (x1 === x0 ? innerW / 2 : ((x - x0) / (x1 - x0)) * innerW);
    const sy = (y) => PAD.top + innerH - ((y - yScaleInfo.lo) / (yScaleInfo.hi - yScaleInfo.lo)) * innerH;

    const svg = svgEl('svg', { class: 'chart-svg', viewBox: `0 0 ${w} ${height}`, height, role: 'img' });

    const grid = svgEl('g', { class: 'chart-grid' });
    const axis = svgEl('g', { class: 'chart-axis' });
    for (const t of yScaleInfo.ticks) {
      const y = sy(t);
      grid.appendChild(svgEl('line', { x1: PAD.left, x2: w - PAD.right, y1: y, y2: y }));
      const label = svgEl('text', { x: PAD.left - 8, y: y + 3.5, 'text-anchor': 'end' });
      label.textContent = yFormat(t);
      axis.appendChild(label);
    }
    // x labels: first and last only, so they never collide
    for (const [x, anchor] of [[x0, 'start'], [x1, 'end']]) {
      if (xs.length < 2 && anchor === 'end') break;
      const label = svgEl('text', { x: sx(x), y: height - 6, 'text-anchor': anchor });
      label.textContent = new Date(x).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      axis.appendChild(label);
    }
    svg.append(grid, axis);

    const dotLayer = svgEl('g');
    for (const s of visible) {
      const pts = s.points.slice().sort((a, b) => a.x - b.x);
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
      svg.appendChild(svgEl('path', { class: 'chart-line', d }, { stroke: s.color }));
      if (pts.length <= 40) {
        for (const p of pts) {
          dotLayer.appendChild(svgEl('circle', {
            class: 'chart-dot', cx: sx(p.x).toFixed(1), cy: sy(p.y).toFixed(1), r: 4,
          }, { fill: s.color }));
        }
      }
    }
    svg.appendChild(dotLayer);

    // hover layer
    const cross = svgEl('line', { class: 'chart-crosshair', y1: PAD.top, y2: PAD.top + innerH, opacity: 0 });
    const focus = svgEl('g', { opacity: 0 });
    svg.append(cross, focus);

    const hit = svgEl('rect', {
      class: 'chart-hit', x: PAD.left - 6, y: PAD.top, width: innerW + 12, height: innerH,
    });
    svg.appendChild(hit);

    const move = (evt) => {
      const box = svg.getBoundingClientRect();
      const px = ((evt.clientX - box.left) / box.width) * w;
      let best = xs[0];
      for (const x of xs) if (Math.abs(sx(x) - px) < Math.abs(sx(best) - px)) best = x;

      cross.setAttribute('x1', sx(best));
      cross.setAttribute('x2', sx(best));
      cross.setAttribute('opacity', 1);

      focus.innerHTML = '';
      const rows = [];
      for (const s of visible) {
        const p = s.points.find((q) => q.x === best);
        if (!p) continue;
        focus.appendChild(svgEl('circle', {
          cx: sx(p.x), cy: sy(p.y), r: 5.5, 'stroke-width': 2,
        }, { fill: s.color, stroke: 'var(--surface-1)' }));
        rows.push(`<div class="tip-row"><i style="background:${s.color}"></i>${escapeHtml(s.name)} <b>${yFormat(p.y)}</b></div>`);
      }
      focus.setAttribute('opacity', 1);

      tip.innerHTML = `<div>${new Date(best).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>${rows.join('')}`;
      const left = (sx(best) / w) * plot.clientWidth;
      tip.style.left = `${Math.min(Math.max(left, 60), plot.clientWidth - 60)}px`;
      tip.style.top = `${PAD.top - 6}px`;
      tip.classList.add('on');
    };

    const leave = () => {
      cross.setAttribute('opacity', 0);
      focus.setAttribute('opacity', 0);
      tip.classList.remove('on');
    };

    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', leave);

    plot.appendChild(svg);
  };

  mountResponsive(host, draw);

  host.appendChild(dataTable(
    ['Date', ...visible.map((s) => s.name)],
    xs.map((x) => [
      new Date(x).toLocaleDateString(),
      ...visible.map((s) => {
        const p = s.points.find((q) => q.x === x);
        return p ? yFormat(p.y) : '—';
      }),
    ]),
  ));

  return host;
}

/**
 * One hold drawn as a horizontal track: the easy phase, then the fight phase
 * shaded from the first contraction to the end, with a tick per marker.
 */
export function holdTimeline({ hold, contractions = [], height = 62 }) {
  const host = document.createElement('div');
  host.style.position = 'relative';
  if (!hold) {
    host.innerHTML = '<div class="empty">No hold recorded.</div>';
    return host;
  }

  const marks = contractions.filter((c) => c >= 0 && c <= hold).sort((a, b) => a - b);
  const first = marks[0];

  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  host.appendChild(tip);

  const draw = (width) => {
    host.querySelector('svg')?.remove();
    const w = Math.max(200, width);
    const L = 2;
    const R = w - 2;
    const trackY = 14;
    const trackH = 22;
    const sx = (t) => L + (t / hold) * (R - L);

    const svg = svgEl('svg', { class: 'chart-svg', viewBox: `0 0 ${w} ${height}`, height, role: 'img' });
    svg.setAttribute('aria-label', `Hold of ${fmtTime(hold)} with ${marks.length} contractions`);

    svg.appendChild(svgEl('rect', { x: L, y: trackY, width: R - L, height: trackH, rx: 5 }, { fill: 'var(--surface-2)' }));

    if (first != null) {
      svg.appendChild(svgEl('rect', {
        x: sx(first), y: trackY, width: Math.max(2, R - sx(first)), height: trackH, rx: 5,
      }, { fill: 'rgba(217, 89, 38, .28)' }));
    }

    for (const m of marks) {
      svg.appendChild(svgEl('rect', {
        x: Math.min(sx(m), R - 2.5), y: trackY - 3, width: 2.5, height: trackH + 6, rx: 1.25,
      }, { fill: 'var(--series-2)' }));
    }

    const label = (x, y, text, anchor) => {
      const t = svgEl('text', { x, y, 'text-anchor': anchor });
      t.textContent = text;
      return t;
    };
    const axis = svgEl('g', { class: 'chart-axis' });
    axis.appendChild(label(L, 10, '0:00', 'start'));
    axis.appendChild(label(R, 10, fmtTime(hold), 'end'));
    if (first != null) {
      const x = sx(first);
      // keep the label off the two ends
      const anchor = x < w * 0.25 ? 'start' : x > w * 0.75 ? 'end' : 'middle';
      axis.appendChild(label(clampNum(x, L, R), height - 4, `first ${fmtTime(first)}`, anchor));
    }
    svg.appendChild(axis);

    marks.forEach((m, i) => {
      const hit = svgEl('rect', {
        class: 'chart-hit',
        x: Math.max(L, sx(m) - 9), y: trackY - 6, width: 18, height: trackH + 12,
      });
      hit.addEventListener('pointerenter', () => {
        tip.innerHTML = `<div>Contraction #${i + 1}</div><div class="tip-row"><b>${fmtTime(m)}</b> · ${Math.round((m / hold) * 100)}% in</div>`;
        tip.style.left = `${Math.min(Math.max((sx(m) / w) * host.clientWidth, 60), host.clientWidth - 60)}px`;
        tip.style.top = `${trackY - 2}px`;
        tip.classList.add('on');
      });
      hit.addEventListener('pointerleave', () => tip.classList.remove('on'));
      svg.appendChild(hit);
    });

    host.appendChild(svg);
  };

  mountResponsive(host, draw);
  return host;
}

const clampNum = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Vertical bars over discrete labels.
 * bars: [{ label, value, sublabel }]
 */
export function barChart({ bars, height = 150, color = 'var(--series-1)', yFormat = fmtTime, name = 'Value' }) {
  const host = document.createElement('div');
  host.style.position = 'relative';

  if (!bars.length) {
    host.innerHTML = '<div class="empty">Not enough data yet.</div>';
    return host;
  }

  const plot = document.createElement('div');
  plot.style.position = 'relative';
  host.appendChild(plot);

  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  plot.appendChild(tip);

  const scale = niceTicks(0, Math.max(...bars.map((b) => b.value), 1), 3);

  const draw = (width) => {
    plot.querySelector('svg')?.remove();
    const w = Math.max(240, width);
    const innerW = w - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const slot = innerW / bars.length;
    const barW = Math.max(6, Math.min(34, slot - 6)); // ≥2px of surface between bars
    const sy = (v) => PAD.top + innerH - (v / scale.hi) * innerH;

    const svg = svgEl('svg', { class: 'chart-svg', viewBox: `0 0 ${w} ${height}`, height, role: 'img' });
    const grid = svgEl('g', { class: 'chart-grid' });
    const axis = svgEl('g', { class: 'chart-axis' });

    for (const t of scale.ticks) {
      const y = sy(t);
      grid.appendChild(svgEl('line', { x1: PAD.left, x2: w - PAD.right, y1: y, y2: y }));
      const label = svgEl('text', { x: PAD.left - 8, y: y + 3.5, 'text-anchor': 'end' });
      label.textContent = yFormat(t);
      axis.appendChild(label);
    }
    svg.append(grid, axis);

    bars.forEach((b, i) => {
      const cx = PAD.left + slot * i + slot / 2;
      const y = sy(b.value);
      const h = Math.max(b.value > 0 ? 3 : 0, PAD.top + innerH - y);
      const r = Math.min(4, barW / 2, h);
      const x = cx - barW / 2;
      const top = PAD.top + innerH - h;
      const d = `M${x} ${PAD.top + innerH} V${top + r} a${r} ${r} 0 0 1 ${r} ${-r} h${barW - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} V${PAD.top + innerH} Z`;
      const bar = svgEl('path', { d }, { fill: color });
      svg.appendChild(bar);

      const hit = svgEl('rect', { class: 'chart-hit', x: cx - slot / 2, y: PAD.top, width: slot, height: innerH });
      hit.addEventListener('pointerenter', () => {
        tip.innerHTML = `<div>${escapeHtml(b.label)}</div><div class="tip-row"><i style="background:${color}"></i>${escapeHtml(name)} <b>${yFormat(b.value)}</b></div>${b.sublabel ? `<div class="tip-row">${escapeHtml(b.sublabel)}</div>` : ''}`;
        const left = (cx / w) * plot.clientWidth;
        tip.style.left = `${Math.min(Math.max(left, 60), plot.clientWidth - 60)}px`;
        tip.style.top = `${Math.max(PAD.top - 6, y - 10)}px`;
        tip.classList.add('on');
      });
      hit.addEventListener('pointerleave', () => tip.classList.remove('on'));
      svg.appendChild(hit);

      // label every bar only when they fit; otherwise first and last
      if (bars.length <= 8 || i === 0 || i === bars.length - 1) {
        const label = svgEl('text', { x: cx, y: height - 6, 'text-anchor': 'middle' });
        label.textContent = b.label;
        axis.appendChild(label);
      }
    });

    plot.appendChild(svg);
  };

  mountResponsive(host, draw);

  host.appendChild(dataTable(['Period', name], bars.map((b) => [b.label, yFormat(b.value)])));
  return host;
}
