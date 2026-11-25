/* Petite librairie SVG : lignes / points, colonnes, barres empilées horizontales.
   Couleurs par rôle (variables CSS), survol = point le plus proche + infobulle. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const tip = () => document.getElementById('tip');
  const el = (n, a = {}, p) => {
    const e = document.createElementNS(NS, n);
    for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]);
    if (p) p.appendChild(e);
    return e;
  };
  const txt = (p, x, y, s, a = {}) => { const t = el('text', Object.assign({ x, y, fill: 'var(--text-muted)', 'font-size': 11 }, a), p); t.textContent = s; return t; };

  function showTip(html, ev) {
    const t = tip(); t.innerHTML = html; t.classList.add('on');
    const r = t.getBoundingClientRect();
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
    t.style.left = Math.max(8, x) + 'px'; t.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tip().classList.remove('on'); }

  const TSTEPS = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200];
  function niceTicks(min, max, n = 5, isTime) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min, step0 = span / n;
    if (isTime) {
      const step = TSTEPS.find(x => x >= step0) || 7200, out = [];
      for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
      return { ticks: out, step };
    }
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const f = step0 / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
    return { ticks: out, step };
  }
  function timeTicks(min, max, w) {
    const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const d = new Date(min); d.setDate(1); d.setHours(0, 0, 0, 0);
    const out = [];
    const spanM = (max - min) / 2.6e9;
    const every = Math.max(1, Math.ceil(spanM / Math.max(2, Math.floor(w / 70))));
    while (d.getTime() <= max) {
      if (d.getTime() >= min && d.getMonth() % every === 0) out.push({ v: d.getTime(), s: months[d.getMonth()] + (d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : '') });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }

  function mount(host, draw) {
    const h = typeof host === 'string' ? document.getElementById(host) : host;
    const run = () => { h.innerHTML = ''; const w = h.clientWidth || 600; draw(h, w); };
    run();
    if (h._ro) h._ro.disconnect();
    let last = h.clientWidth;
    h._ro = new ResizeObserver(() => { if (Math.abs(h.clientWidth - last) > 4) { last = h.clientWidth; run(); } });
    h._ro.observe(h);
  }

  /* ---------------------------------------------------------- lignes / points
     opts: series [{name, color, points:[{x,y,...}], line:true, dots:false, step:false, dash, area}]
           time:true (x = ms), yFmt, xFmt, invert, height, yMin, yMax, tip(p, s), refs:[{y,label}] */
  function line(host, o) {
    mount(host, (h, W) => {
      const all = o.series.flatMap(s => s.points.filter(p => p.y != null));
      if (!all.length) { h.innerHTML = '<div class="empty">Pas encore de données</div>'; return; }
      const H = o.height || 220, ml = o.ml || 46, mr = o.mr || 14, mt = 10, mb = 24;
      const iw = W - ml - mr, ih = H - mt - mb;
      let x0 = Math.min(...all.map(p => p.x)), x1 = Math.max(...all.map(p => p.x));
      if (x0 === x1) { x0 -= o.time ? 864e5 * 7 : 1; x1 += o.time ? 864e5 * 7 : 1; }
      const padX = (x1 - x0) * 0.02; x0 -= padX; x1 += padX;
      const ys = all.map(p => p.y).concat((o.refs || []).map(r => r.y));
      let y0 = o.yMin != null ? o.yMin : Math.min(...ys), y1 = o.yMax != null ? o.yMax : Math.max(...ys);
      const padY = (y1 - y0) * 0.08 || 1;
      if (o.yMin == null) y0 -= padY; if (o.yMax == null) y1 += padY;
      const { ticks } = niceTicks(y0, y1, Math.max(3, Math.floor(ih / 45)), o.yTime);
      const X = v => ml + (v - x0) / (x1 - x0) * iw;
      const Y = v => o.invert ? mt + (v - y0) / (y1 - y0) * ih : mt + ih - (v - y0) / (y1 - y0) * ih;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.label || '' }, h);
      const g = el('g', {}, svg);
      ticks.forEach(t => {
        if (t < y0 || t > y1) return;
        el('line', { x1: ml, x2: W - mr, y1: Y(t), y2: Y(t), stroke: 'var(--grid)', 'stroke-width': 1 }, g);
        txt(g, ml - 6, Y(t) + 4, (o.yFmt || String)(t), { 'text-anchor': 'end' });
      });
      const xt = o.time ? timeTicks(x0, x1, iw) : niceTicks(x0, x1, Math.floor(iw / 70)).ticks.map(v => ({ v, s: (o.xFmt || String)(v) }));
      xt.forEach(t => txt(g, X(t.v), H - 6, t.s, { 'text-anchor': 'middle' }));
      (o.refs || []).forEach(r => {
        el('line', { x1: ml, x2: W - mr, y1: Y(r.y), y2: Y(r.y), stroke: 'var(--text-muted)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }, g);
        if (r.label) txt(g, W - mr, Y(r.y) - 5, r.label, { 'text-anchor': 'end', fill: 'var(--text-secondary)' });
      });
      const pts = [];
      o.series.forEach(s => {
        const P = s.points.filter(p => p.y != null).sort((a, b) => a.x - b.x);
        if (s.line !== false && P.length > 1) {
          let d = '';
          P.forEach((p, i) => {
            if (i === 0) d += `M${X(p.x)},${Y(p.y)}`;
            else if (s.step) d += `H${X(p.x)}V${Y(p.y)}`;
            else d += `L${X(p.x)},${Y(p.y)}`;
          });
          if (s.step && s.extend !== false) d += `H${X(x1 - padX)}`;
          if (s.area) {
            const base = o.invert ? mt : mt + ih;
            el('path', { d: d + `V${base}H${X(P[0].x)}Z`, fill: s.color, opacity: 0.1 }, g);
          }
          el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.width || 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': s.dash }, g);
        }
        P.forEach(p => {
          const cx = X(p.x), cy = Y(p.y);
          if (s.dots) el('circle', { cx, cy, r: p.r || s.r || 4, fill: p.color || s.color, stroke: 'var(--surface-1)', 'stroke-width': 2, opacity: p.fade ? 0.45 : 1 }, g);
          pts.push({ cx, cy, p, s });
        });
        if (s.endLabel && P.length) {
          const p = P[P.length - 1];
          txt(g, X(p.x) + 6, Y(p.y) + 4, s.endLabel, { fill: 'var(--text-secondary)' });
        }
      });
      (o.marks || []).forEach(m => { // étiquette sur un point précis
        const cx = X(m.x), cy = Y(m.y);
        el('circle', { cx, cy, r: 5, fill: m.color || 'var(--s1)', stroke: 'var(--surface-1)', 'stroke-width': 2 }, g);
        txt(g, cx + (m.anchor === 'end' ? -8 : 8), cy - 8, m.label, { 'text-anchor': m.anchor || 'start', fill: 'var(--text-primary)', 'font-weight': 600 });
      });
      // survol
      const cross = el('line', { y1: mt, y2: mt + ih, stroke: 'var(--text-muted)', 'stroke-width': 1, opacity: 0 }, svg);
      const ring = el('circle', { r: 6, fill: 'none', stroke: 'var(--text-primary)', 'stroke-width': 2, opacity: 0 }, svg);
      const hit = el('rect', { x: ml, y: 0, width: iw, height: H, fill: 'transparent' }, svg);
      const move = ev => {
        const r = svg.getBoundingClientRect(), k = W / r.width;
        const mx = (ev.clientX - r.left) * k, my = (ev.clientY - r.top) * k;
        let best = null, bd = 1e9;
        pts.forEach(q => { const d = Math.hypot((q.cx - mx), (q.cy - my) * 0.35); if (d < bd) { bd = d; best = q; } });
        if (!best || bd > 80) { hideTip(); cross.setAttribute('opacity', 0); ring.setAttribute('opacity', 0); return; }
        cross.setAttribute('x1', best.cx); cross.setAttribute('x2', best.cx); cross.setAttribute('opacity', .5);
        ring.setAttribute('cx', best.cx); ring.setAttribute('cy', best.cy); ring.setAttribute('opacity', 1);
        showTip(o.tip ? o.tip(best.p, best.s) : `${best.s.name}: ${(o.yFmt || String)(best.p.y)}`, ev);
      };
      hit.addEventListener('pointermove', move);
      hit.addEventListener('pointerleave', () => { hideTip(); cross.setAttribute('opacity', 0); ring.setAttribute('opacity', 0); });
      if (o.onClick) { hit.style.cursor = 'pointer'; hit.addEventListener('click', ev => { move(ev); const q = pts.find(q => +ring.getAttribute('cx') === q.cx && +ring.getAttribute('cy') === q.cy); if (q) o.onClick(q.p, q.s); }); }
    });
  }

  /* ---------------------------------------------------------- colonnes
     opts: items [{label, y, color, tip}], yFmt, height, labelEvery, valueLabels */
  function columns(host, o) {
    mount(host, (h, W) => {
      const it = o.items;
      if (!it.length) { h.innerHTML = '<div class="empty">Pas encore de données</div>'; return; }
      const H = o.height || 200, ml = 40, mr = 8, mt = 14, mb = 24;
      const iw = W - ml - mr, ih = H - mt - mb;
      const y1 = Math.max(1, ...it.map(d => d.y)) * 1.08;
      const { ticks } = niceTicks(0, y1, 4, o.yTime);
      const Y = v => mt + ih - v / y1 * ih;
      const band = iw / it.length, bw = Math.max(2, Math.min(24, band - 2));
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, h);
      ticks.forEach(t => {
        el('line', { x1: ml, x2: W - mr, y1: Y(t), y2: Y(t), stroke: 'var(--grid)' }, svg);
        txt(svg, ml - 6, Y(t) + 4, (o.yFmt || String)(t), { 'text-anchor': 'end' });
      });
      const every = o.every || Math.max(1, Math.ceil(it.length / Math.floor(iw / 46)));
      it.forEach((d, i) => {
        const cx = ml + band * i + band / 2, x = cx - bw / 2, y = Y(d.y), hh = mt + ih - y;
        if (d.y > 0) {
          const r = Math.min(4, bw / 2, hh);
          el('path', { d: `M${x},${mt + ih}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${mt + ih}Z`, fill: d.color || 'var(--s1)' }, svg);
        }
        if (i % every === 0 && d.label) txt(svg, cx, H - 6, d.label, { 'text-anchor': 'middle' });
        if (o.valueLabels && d.y > 0) txt(svg, cx, y - 4, (o.yFmt || String)(d.y), { 'text-anchor': 'middle', fill: 'var(--text-secondary)' });
        const hr = el('rect', { x: ml + band * i, y: mt, width: band, height: ih, fill: 'transparent' }, svg);
        hr.addEventListener('pointermove', ev => showTip(d.tip || `${d.label}: ${(o.yFmt || String)(d.y)}`, ev));
        hr.addEventListener('pointerleave', hideTip);
      });
      el('line', { x1: ml, x2: W - mr, y1: mt + ih, y2: mt + ih, stroke: 'var(--line)' }, svg);
    });
  }

  /* ---------------------------------------------------------- barres empilées horizontales
     opts: rows [{label, parts:[{v, color, name}]}], fmt */
  function stack(host, o) {
    mount(host, (h, W) => {
      const rowH = 26, gapR = 22, ml = Math.min(130, W * 0.3), mr = 8;
      const H = o.rows.length * (rowH + gapR) + 4;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}` }, h);
      o.rows.forEach((row, ri) => {
        const tot = row.parts.reduce((a, p) => a + p.v, 0) || 1;
        const y = ri * (rowH + gapR) + 16;
        txt(svg, 0, y + rowH / 2 + 4, row.label, { fill: 'var(--text-secondary)', 'font-size': 12 });
        let x = ml; const iw = W - ml - mr;
        row.parts.forEach((p, pi) => {
          const w = p.v / tot * iw;
          if (w <= 0) return;
          const ww = Math.max(0, w - (pi < row.parts.length - 1 ? 2 : 0));
          const r = el('rect', { x, y, width: ww, height: rowH, rx: 3, fill: p.color }, svg);
          const pct = Math.round(p.v / tot * 100);
          if (ww > 34) txt(svg, x + ww / 2, y + rowH / 2 + 4, pct + ' %', { 'text-anchor': 'middle', fill: p.ink || '#fff', 'font-size': 11, 'font-weight': 600 });
          r.addEventListener('pointermove', ev => showTip(`<b>${p.name}</b><br>${row.label} : ${pct} % · ${(o.fmt || String)(p.v)}`, ev));
          r.addEventListener('pointerleave', hideTip);
          x += w;
        });
      });
    });
  }

  window.Charts = { line, columns, stack, hideTip };
})();
