// Small DOM helpers (from Phase) and touch controls (pill sliders, knobs, segmented
// choices, toggles). Every control reads through get() and writes through
// set(v), and exposes el.refresh() so panels can resync after outside changes.

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Horizontal drag slider shaped like a pill: label left, value right, fill bar.
export function param({ label, min = 0, max = 99, step = 1, get, set, fmt = v => v, def, bipolar = false, sens = 1 }) {
  const fill = h('i', { class: 'fill' });
  const val = h('b');
  const el = h('div', { class: 'param' + (bipolar ? ' bi' : ''), role: 'slider', 'aria-label': label, tabindex: 0 }, fill, h('span', {}, label), val);
  const refresh = () => {
    const v = get();
    const f = (v - min) / (max - min);
    if (bipolar) {
      const z = (0 - min) / (max - min);
      fill.style.left = Math.min(f, z) * 100 + '%';
      fill.style.width = Math.abs(f - z) * 100 + '%';
    } else fill.style.width = f * 100 + '%';
    val.textContent = fmt(v);
    el.setAttribute('aria-valuenow', v);
  };
  let start = null, lastTap = 0;
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    start = { x: e.clientX, v: get(), w: el.clientWidth, moved: false };
    el.classList.add('drag');
  });
  el.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 3) start.moved = true;
    // full range over ~1.3 widths; fine control near the start of a drag
    const range = max - min;
    let v = start.v + (dx / (start.w * 1.3)) * range * sens;
    v = clamp(Math.round(v / step) * step, min, max);
    if (v !== get()) { set(+v.toFixed(4)); refresh(); }
  });
  const end = () => {
    if (start && !start.moved) {
      const now = performance.now();
      if (now - lastTap < 320 && def != null) { set(def); refresh(); }
      lastTap = now;
    }
    start = null; el.classList.remove('drag');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', e => {
    const d = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step }[e.key];
    if (d) { e.preventDefault(); set(clamp(+(get() + d).toFixed(4), min, max)); refresh(); }
  });
  el.refresh = refresh;
  refresh();
  return el;
}

// Rotary knob, vertical drag. Big, for the Play screen and FX.
export function knob({ label, min = 0, max = 1, get, set, fmt = v => Math.round(v * 100), def, bipolar = false, size = 'm' }) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  const arc = (a0, a1) => {
    const r = 26, cx = 32, cy = 32;
    const p = a => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    const sweep = a1 > a0 ? 1 : 0;
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A26 26 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const A0 = -Math.PI * 0.75, A1 = Math.PI * 0.75;
  const track = document.createElementNS(NS, 'path');
  track.setAttribute('d', arc(A0, A1)); track.setAttribute('class', 'k-track');
  const prog = document.createElementNS(NS, 'path'); prog.setAttribute('class', 'k-val');
  const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', 3.2); dot.setAttribute('class', 'k-dot');
  svg.append(track, prog, dot);
  const val = h('b');
  const el = h('div', { class: 'knob knob-' + size, role: 'slider', 'aria-label': label, tabindex: 0 }, svg, h('span', {}, label), val);
  const refresh = () => {
    const v = get();
    const f = (v - min) / (max - min);
    const a = A0 + f * (A1 - A0);
    const from = bipolar ? 0 : A0;
    prog.setAttribute('d', Math.abs(a - from) < 0.01 ? '' : arc(Math.min(from, a), Math.max(from, a)));
    dot.setAttribute('cx', 32 + 18 * Math.sin(a));
    dot.setAttribute('cy', 32 - 18 * Math.cos(a));
    val.textContent = fmt(v);
  };
  let start = null, lastTap = 0;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); start = { y: e.clientY, x: e.clientX, v: get(), moved: false }; el.classList.add('drag'); });
  el.addEventListener('pointermove', e => {
    if (!start) return;
    const d = (start.y - e.clientY) + (e.clientX - start.x) * 0.5;
    if (Math.abs(d) > 3) start.moved = true;
    const v = clamp(start.v + (d / 160) * (max - min), min, max);
    set(v); refresh();
  });
  const end = () => {
    if (start && !start.moved) { const now = performance.now(); if (now - lastTap < 320 && def != null) { set(def); refresh(); } lastTap = now; }
    start = null; el.classList.remove('drag');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (d) { e.preventDefault(); set(clamp(get() + d * (max - min) / 50, min, max)); refresh(); }
  });
  el.refresh = refresh;
  refresh();
  return el;
}

// Row of mutually exclusive buttons.
export function seg({ options, get, set, cls = '' }) {
  const el = h('div', { class: 'seg ' + cls, role: 'radiogroup' });
  const btns = options.map(([v, label]) => {
    const b = h('button', { type: 'button', role: 'radio', onclick: () => { set(v); refresh(); } }, label);
    b._v = v;
    return b;
  });
  el.append(...btns);
  const refresh = () => btns.forEach(b => { const on = b._v === get(); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  el.refresh = refresh;
  refresh();
  return el;
}

export function toggle({ label, get, set, cls = '' }) {
  const el = h('button', { type: 'button', class: 'tog ' + cls, role: 'switch', onclick: () => { set(!get()); refresh(); } }, h('i'), label);
  const refresh = () => { el.classList.toggle('on', !!get()); el.setAttribute('aria-checked', !!get()); };
  el.refresh = refresh;
  refresh();
  return el;
}

export function toast(msg) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}

export function icon(name) {
  const P = {
    play: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8.5" fill="none"/>',
    edit: '<circle cx="7" cy="6" r="2.4"/><circle cx="17" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M8.5 7.8 11 16M15.5 7.8 13 16" fill="none"/>',
    sounds: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    arp: '<path d="M4 18h3v-4h3v-4h3V6h3v4h3v4" fill="none"/>',
    seq: '<rect x="3.5" y="9" width="3" height="6" rx="1"/><rect x="8.5" y="9" width="3" height="6" rx="1"/><rect x="13.5" y="9" width="3" height="6" rx="1"/><rect x="18.5" y="9" width="2.5" height="6" rx="1"/>',
    fx: '<path d="M3 12c2.5-6 4.5-6 6 0s3.5 6 6 0 4-6 6 0" fill="none"/>',
    gear: '<g fill="none"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></g>',
    start: '<path d="M8 5l11 7-11 7z"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    rec: '<circle cx="12" cy="12" r="6"/>',
    prev: '<path d="M15 5l-7 7 7 7" fill="none"/>',
    next: '<path d="M9 5l7 7-7 7" fill="none"/>',
    learn: '<path d="M4 6.5C6.5 5 9.5 5 12 6.5V19c-2.5-1.5-5.5-1.5-8 0z" fill="none"/><path d="M20 6.5C17.5 5 14.5 5 12 6.5V19c2.5-1.5 5.5-1.5 8 0z" fill="none"/>',
    create: '<path d="M4 7h10M18 7h2M4 17h3M11 17h9" fill="none"/><circle cx="16" cy="7" r="2.2" fill="none"/><circle cx="9" cy="17" r="2.2" fill="none"/>',
    piano: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none"/><path d="M7.5 5v8M12 5v8M16.5 5v8M7.5 13v6M12 13v6M16.5 13v6" fill="none"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14" fill="none"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14" fill="none"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" fill="none"/>',
    close: '<path d="M6 6l12 12M18 6 6 18" fill="none"/>',
    back: '<path d="M14 6l-6 6 6 6" fill="none"/>',
    restart: '<path d="M5 12a7 7 0 1 0 2-5" fill="none"/><path d="M5 4v4h4" fill="none"/>',
    pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>',
    score: '<path d="M3 7h18M3 11h18M3 15h18" fill="none" opacity=".55"/><path d="M14 17V6l5-1.5" fill="none"/><circle cx="12" cy="17" r="2.3"/>',
    roll: '<rect x="5" y="4" width="3" height="9" rx="1.2"/><rect x="10.5" y="8" width="3" height="6" rx="1.2"/><rect x="16" y="3" width="3" height="12" rx="1.2"/><path d="M3 19h18" fill="none"/>',
    split: '<path d="M12 4v16" fill="none"/><rect x="3" y="7" width="6" height="10" rx="2" fill="none"/><rect x="15" y="7" width="6" height="10" rx="2" fill="none"/>',
    panel: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none"/><path d="M15 5v14" fill="none"/>',
    target: '<circle cx="12" cy="12" r="8" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/><circle cx="12" cy="12" r="1.2"/>',
    music: '<path d="M9 18V6l10-2v12" fill="none"/><circle cx="7" cy="18" r="2.3"/><circle cx="17" cy="16" r="2.3"/>',
    plus: '<path d="M12 5v14M5 12h14" fill="none"/>',
    skip: '<path d="M6 5l9 7-9 7z"/><rect x="16" y="5" width="2.6" height="14" rx="1"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none"/>',
    keys: '<rect x="3" y="6" width="18" height="12" rx="1.5" fill="none"/><path d="M8 6v12M13 6v12M18 6v12" fill="none"/>',
  }[name];
  const s = document.createElement('span');
  s.className = 'ic';
  s.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${P}</svg>`;
  return s;
}
