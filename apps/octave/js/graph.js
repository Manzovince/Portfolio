// Animated operator graph: who modulates whom in the current algorithm.
// Carriers sit on the bottom row and feed the output bus; edge brightness and
// the flowing dashes follow each modulator's live level from the worklet.
import { ALGORITHMS, layout } from './algorithms.js?v=202611126';

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

export function ratioText(op) {
  if (op.fixed) {
    const hz = Math.pow(10, (op.coarse & 3) + op.fine / 100);
    return hz >= 1000 ? (hz / 1000).toFixed(hz >= 10000 ? 1 : 2) + 'k' : hz < 10 ? hz.toFixed(2) + 'Hz' : Math.round(hz) + 'Hz';
  }
  const r = (op.coarse === 0 ? 0.5 : op.coarse) * (1 + op.fine / 100);
  return '×' + (r < 10 ? r.toFixed(2) : r.toFixed(1));
}

export function createGraph({ onSelect, compact = false, outLabel = 'out' } = {}) {
  const svg = mk('svg', { class: 'graph' + (compact ? ' compact' : ''), preserveAspectRatio: 'xMidYMid meet' });
  const gEdges = mk('g'), gNodes = mk('g');
  svg.append(gEdges, gNodes);
  let nodes = [], edges = [], fbEdge = null, alg = -1, sel = null, patch = null;
  const level = new Float64Array(6);
  const target = new Float64Array(6);
  let dash = 0;

  function build() {
    gEdges.textContent = ''; gNodes.textContent = '';
    const a = ALGORITHMS[alg];
    const L = layout(alg);
    const CW = 92, RH = 84, R = compact ? 24 : 25, padX = 50, padTop = 44;
    const W = Math.max(L.cols * CW + padX * 2, 300);
    const offX = (W - L.cols * CW) / 2;
    const H = padTop + (L.rows - 1) * RH + R + 62;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const P = L.pos.map(p => ({ x: offX + p.x * CW, y: padTop + (L.rows - 1 - p.y) * RH }));
    const busY = padTop + (L.rows - 1) * RH + R + 30;

    // output bus
    const cx = a.carriers.map(c => P[c].x);
    const x0 = Math.min(...cx), x1 = Math.max(...cx);
    gEdges.append(mk('path', { d: `M${x0 - 14} ${busY} H${x1 + 14}`, class: 'bus' }));
    gEdges.append(mk('path', { d: `M${(x0 + x1) / 2} ${busY} v18`, class: 'bus' }));
    const out = mk('text', { x: (x0 + x1) / 2 + 8, y: busY + 16, class: 'bus-label' });
    out.textContent = outLabel;
    gEdges.append(out);

    edges = [];
    for (let src = 0; src < 6; src++) {
      for (const dst of a.targets[src]) {
        const s = P[src], d = P[dst];
        const path = mk('path', { d: `M${s.x} ${s.y + R} C${s.x} ${s.y + R + 30} ${d.x} ${d.y - R - 30} ${d.x} ${d.y - R}`, class: 'edge' });
        const flow = mk('path', { d: path.getAttribute('d'), class: 'flow' });
        gEdges.append(path, flow);
        edges.push({ src, path, flow });
      }
    }
    for (const c of a.carriers) {
      const p = P[c];
      const path = mk('path', { d: `M${p.x} ${p.y + R} V${busY}`, class: 'edge carrier-out' });
      const flow = mk('path', { d: path.getAttribute('d'), class: 'flow out' });
      gEdges.append(path, flow);
      edges.push({ src: c, path, flow, out: true });
    }

    // feedback path
    const fs = P[a.fbSrc], fd = P[a.fbDst];
    let d;
    if (a.fbSrc === a.fbDst) {
      d = `M${fs.x + R * 0.7} ${fs.y - R * 0.7} C${fs.x + R + 26} ${fs.y - R - 26} ${fs.x + R + 34} ${fs.y + 10} ${fs.x + R} ${fs.y + 4}`;
    } else {
      d = `M${fs.x + R} ${fs.y} C${fs.x + R + 60} ${fs.y} ${fd.x + R + 60} ${fd.y} ${fd.x + R} ${fd.y}`;
    }
    const fbPath = mk('path', { d, class: 'edge fb' });
    const fbFlow = mk('path', { d, class: 'flow fb' });
    gEdges.append(fbPath, fbFlow);
    fbEdge = { path: fbPath, flow: fbFlow, src: a.fbSrc };

    nodes = P.map((p, i) => {
      const g = mk('g', { class: 'node ' + (a.carriers.includes(i) ? 'carrier' : 'mod'), transform: `translate(${p.x} ${p.y})`, 'data-op': i });
      const halo = mk('circle', { r: R + 7, class: 'halo' });
      const ring = mk('circle', { r: R, class: 'ring' });
      const core = mk('circle', { r: R - 5, class: 'core' });
      const num = mk('text', { y: compact ? 5 : 1, class: 'num' });
      num.textContent = i + 1;
      const ratio = mk('text', { y: 15, class: 'ratio' });
      g.append(halo, ring, core, num, ratio);
      if (onSelect) g.addEventListener('pointerdown', e => { e.stopPropagation(); onSelect(i); });
      gNodes.append(g);
      return { g, core, ratio, R };
    });
    if (onSelect) svg.onpointerdown = () => onSelect(null);
    refreshText();
    select(sel);
  }

  function refreshText() {
    if (!patch) return;
    nodes.forEach((n, i) => {
      const op = patch.ops[i];
      n.ratio.textContent = compact ? '' : ratioText(op);
      n.g.classList.toggle('muted', op.ol === 0);
    });
    if (fbEdge) fbEdge.path.classList.toggle('off', !patch.fb);
  }

  function set(p) {
    patch = p;
    if (p.alg - 1 !== alg) { alg = p.alg - 1; build(); }
    else refreshText();
  }

  function select(op) {
    sel = op;
    nodes.forEach((n, i) => n.g.classList.toggle('sel', i === op));
  }

  function meter(arr) { for (let i = 0; i < 6; i++) target[i] = arr[i]; }

  let raf = 0, last = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (!svg.isConnected || !patch) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    for (let i = 0; i < 6; i++) {
      const tg = Math.min(1, Math.sqrt(target[i]));
      level[i] += (tg - level[i]) * (tg > level[i] ? 0.6 : 0.12);
    }
    dash -= dt * 60;
    for (const e of edges) {
      const l = level[e.src];
      e.flow.style.opacity = (l * 0.95).toFixed(3);
      e.flow.style.strokeDashoffset = (dash * (0.4 + l * 1.6)).toFixed(1);
      e.path.style.opacity = (0.35 + l * 0.4).toFixed(3);
    }
    if (fbEdge) {
      const l = patch.fb ? level[fbEdge.src] * (patch.fb / 7) : 0;
      fbEdge.flow.style.opacity = (l * 0.95).toFixed(3);
      fbEdge.flow.style.strokeDashoffset = (dash * 1.2).toFixed(1);
    }
    nodes.forEach((n, i) => {
      const l = level[i];
      n.core.setAttribute('r', ((n.R - 6) * (0.18 + 0.82 * l)).toFixed(2));
      n.core.style.opacity = (0.25 + l * 0.75).toFixed(3);
    });
  }
  raf = requestAnimationFrame(frame);

  return { el: svg, set, select, meter, refreshText };
}
