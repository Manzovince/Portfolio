// Methodology illustration, "Démêler": a tangled scribble (a complex problem)
// pulls tight into a staircase of four simple steps as the section scrolls
// through the viewport. Scrolling back up tangles it again.

(() => {
  const NS = "http://www.w3.org/2000/svg";
  const N = 260;                       // points along the thread
  const START = [30, 290];
  const END = [330, 80];
  const TREAD = 75, RISER = 70;        // staircase geometry (viewBox units)

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ----- Shapes -----

  // Clean state: four treads joined by three risers, sampled by arc length
  const corners = [START];
  for (let k = 0; k < 4; k++) {
    const [x, y] = corners[corners.length - 1];
    corners.push([x + TREAD, y]);
    if (k < 3) corners.push([x + TREAD, y - RISER]);
  }
  const segLengths = corners.slice(1).map((c, i) => Math.hypot(c[0] - corners[i][0], c[1] - corners[i][1]));
  const total = segLengths.reduce((a, b) => a + b, 0);

  function stairAt(t) {
    let d = t * total;
    for (let i = 0; i < segLengths.length; i++) {
      if (d <= segLengths[i] || i === segLengths.length - 1) {
        const k = segLengths[i] ? Math.min(1, d / segLengths[i]) : 0;
        const a = corners[i], b = corners[i + 1];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      }
      d -= segLengths[i];
    }
    return END;
  }

  // Tangled state: same endpoints, a looping scribble in between that
  // breathes slightly over time (phase)
  function tangleAt(t, phase) {
    const env = Math.pow(Math.sin(Math.PI * t), 0.7);
    const a = t * Math.PI * 2 * 5.3;
    const cx = 180, cy = 185;
    const bx = START[0] + (END[0] - START[0]) * t;
    const by = START[1] + (END[1] - START[1]) * t;
    const nx = 105 * Math.sin(a + 0.6 + phase * 0.7) * Math.cos(a * 0.37 - phase * 0.4)
             + 28 * Math.sin(a * 2.9 + 1.3 + phase);
    const ny = 95 * Math.cos(a * 1.13 + phase * 0.5) * Math.sin(a * 0.51 + 0.8)
             + 24 * Math.cos(a * 3.7 - phase * 0.8);
    return [
      bx + (cx - bx + nx) * env,
      by + (cy - by + ny) * env,
    ];
  }

  const ease = k => k * k * (3 - 2 * k);
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // ----- Build the SVG -----

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function init() {
    const svg = document.querySelector(".untangle svg");
    if (!svg) return;
    const section = svg.closest("section") || svg;

    // Teal hatching under the stairs, like the old padding layer
    const defs = el("defs", {}, svg);
    const pattern = el("pattern", {
      id: "untangle-hatch", width: 8, height: 8,
      patternUnits: "userSpaceOnUse", patternTransform: "rotate(-45)",
    }, defs);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 8 }, pattern);
    pattern.classList.add("hatch");
    const under = corners.map(c => c.join(",")).join(" ") + ` ${END[0]},${START[1]}`;
    const hatch = el("polygon", { points: under, fill: "url(#untangle-hatch)", opacity: 0 }, svg);

    const thread = el("path", { class: "thread" }, svg);

    // A numbered node in the middle of each tread
    const nodes = [];
    for (let k = 0; k < 4; k++) {
      const x = START[0] + TREAD * (k + 0.5);
      const y = START[1] - RISER * k;
      const g = el("g", { class: "node", opacity: 0 }, svg);
      el("circle", { cx: x, cy: y, r: 4.5 }, g);
      const label = el("text", { x, y: y - 14 }, g);
      label.textContent = String(k + 1).padStart(2, "0");
      // the thread reaches this node at this fraction of its length
      nodes.push({ g, at: ((TREAD + RISER) * k + TREAD / 2) / total });
    }

    let progress = reduceMotion.matches ? 1 : 0;
    let frameId = null, visible = false;
    const t0 = performance.now();

    function readProgress() {
      if (reduceMotion.matches) return 1;
      const r = svg.getBoundingClientRect();
      const vh = window.innerHeight;
      const centre = r.top + r.height / 2;
      // still tangled until the drawing's centre reaches 70% of the screen
      // height, tidy once it reaches 30%
      return clamp01((vh * 0.7 - centre) / (vh * 0.4));
    }

    function draw(now) {
      const p = progress;
      const phase = reduceMotion.matches ? 0 : (now - t0) / 1000 * 0.35;
      let d = "";
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        // the line pulls tight from its start towards its end
        const k = ease(clamp01(p * 1.6 - t * 0.6));
        const a = tangleAt(t, phase);
        const b = stairAt(t);
        const x = a[0] + (b[0] - a[0]) * k;
        const y = a[1] + (b[1] - a[1]) * k;
        d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      }
      thread.setAttribute("d", d);

      for (const n of nodes) {
        const local = clamp01(p * 1.6 - n.at * 0.6);
        n.g.setAttribute("opacity", ease(clamp01((local - 0.85) / 0.15)).toFixed(3));
      }
      hatch.setAttribute("opacity", (ease(clamp01((p - 0.8) / 0.2)) * 0.55).toFixed(3));
    }

    function loop(now) {
      progress = readProgress();
      draw(now);
      frameId = requestAnimationFrame(loop);
    }

    // Only animate while the drawing is on screen
    function sync() {
      const run = visible && !document.hidden && !reduceMotion.matches;
      if (run && frameId === null) frameId = requestAnimationFrame(loop);
      else if (!run && frameId !== null) { cancelAnimationFrame(frameId); frameId = null; }
    }

    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); })
      .observe(section);
    document.addEventListener("visibilitychange", sync);
    reduceMotion.addEventListener?.("change", () => { progress = readProgress(); draw(performance.now()); sync(); });

    progress = readProgress();
    draw(performance.now());
  }

  window.addEventListener("DOMContentLoaded", init);
})();
