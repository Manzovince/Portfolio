// Small DOM helpers: escaping, icons, bottom sheets, toasts, confirms, sounds.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const COLORS = {
  ember: '#ff7a3d', amber: '#f5b638', lime: '#9bd64a', teal: '#2ec4b0', sky: '#4aa8f0', violet: '#9b7bf2', rose: '#f0648c', slate: '#8b95a3',
};
export const colorOf = c => COLORS[c] || COLORS.ember;

const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  dots: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  run: '<circle cx="15" cy="4.5" r="2"/><path d="M8 21l3-6 3 2v5M6 12l3-3.5 4 1 3 3 3 .5M11 15l2-5.5"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.5 3-5.5 3.5-9 2 1.5 3 3.2 3 5 1-1 1.5-2 1.7-3.3C16 9.6 18.5 12 18.5 15c0 3.4-2.5 6-6.5 6z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  warn: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  down2: '<path d="M12 4v12M6.5 11 12 16.5 17.5 11M5 20h14"/>',
  grip: '<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
  mob: '<circle cx="12" cy="4.5" r="2"/><path d="M4 9.5c3 1.2 5.5 1.5 8 1.5s5-.3 8-1.5M12 11v4.5M12 15.5 7.5 21M12 15.5l4.5 5.5"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
};
export const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

// ---------- toast ----------
let toastTimer;
export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

// ---------- bottom sheet ----------
// sheet({ title, body, full, onMount(el, close), onClose }) → close()
const stack = [];
export function sheet({ title = '', body = '', full = false, actions = '', onMount, onClose, cls = '' }) {
  const wrap = document.createElement('div');
  wrap.className = `sheet-wrap ${full ? 'full' : ''} ${cls}`;
  wrap.innerHTML = `
    <div class="sheet-bg"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      ${full ? '' : '<div class="grab"></div>'}
      <header class="sheet-head">
        <button class="icon-btn" data-close aria-label="Fermer">${icon(full ? 'back' : 'x')}</button>
        <h2>${esc(title)}</h2>
        <div class="sheet-actions">${actions}</div>
      </header>
      <div class="sheet-body">${body}</div>
    </section>`;
  document.body.append(wrap);
  requestAnimationFrame(() => wrap.classList.add('on'));
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    wrap.classList.remove('on');
    stack.splice(stack.indexOf(close), 1);
    setTimeout(() => wrap.remove(), 220);
    onClose && onClose();
  };
  stack.push(close);
  wrap.querySelector('.sheet-bg').onclick = close;
  wrap.querySelector('[data-close]').onclick = close;
  onMount && onMount(wrap.querySelector('.sheet'), close);
  return close;
}
export const closeTopSheet = () => { const c = stack[stack.length - 1]; if (c) { c(); return true; } return false; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTopSheet(); });

export function confirmDialog(msg, ok = 'Confirmer', danger = true) {
  return new Promise(res => {
    let answered = false;
    sheet({
      title: 'Confirmer',
      body: `<p class="confirm-msg">${esc(msg)}</p>
        <div class="row gap"><button class="btn ghost grow" data-no>Annuler</button><button class="btn ${danger ? 'danger' : 'primary'} grow" data-yes>${esc(ok)}</button></div>`,
      onMount(el, close) {
        el.querySelector('[data-no]').onclick = () => { answered = true; res(false); close(); };
        el.querySelector('[data-yes]').onclick = () => { answered = true; res(true); close(); };
      },
      onClose() { if (!answered) res(false); },
    });
  });
}

// Simple action menu: menu(title, [{label, icon, danger, run}])
export function menu(title, items) {
  sheet({
    title,
    body: `<div class="menu">${items.map((it, i) => `<button class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}">${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span></button>`).join('')}</div>`,
    onMount(el, close) {
      el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { close(); items[+b.dataset.i].run(); });
    },
  });
}

// ---------- sound & haptics ----------
let actx;
export function beep(pattern = [[880, 0.12]], gap = 0.08) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    let t = actx.currentTime + 0.02;
    for (const [f, d] of pattern) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(actx.destination);
      o.start(t); o.stop(t + d + 0.02);
      t += d + gap;
    }
  } catch { /* audio unavailable */ }
}
export const unlockAudio = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch { } };
export const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch { } };

export const FR_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const FR_DAYS_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const fmtDay = d => `${FR_DAYS_LONG[(d.getDay() + 6) % 7]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;
const FR_MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const fmtDayShort = d => `${d.getDate()} ${FR_MONTHS_SHORT[d.getMonth()]}`;

// ---------- gestures ----------
// Drag a card by its handle to reorder. While dragging, cards collapse to their header
// so long lists stay manageable; the scroller auto-scrolls near its edges.
export function dragReorder({ list, items, handle, scroller, onDrop }) {
  list.querySelectorAll(handle).forEach(h => h.addEventListener('pointerdown', e => start(e, h)));
  function start(e, h) {
    if (e.button) return;
    e.preventDefault();
    document.activeElement?.blur?.();
    const els = [...list.querySelectorAll(items)];
    const el = h.closest(items), from = els.indexOf(el);
    if (from < 0) return;
    list.classList.add('reordering');
    buzz(15);
    // keep the grabbed card under the finger once everything collapsed
    const r = el.getBoundingClientRect();
    scroller.scrollTop += r.top + r.height / 2 - e.clientY;
    const sTop = () => scroller.scrollTop;
    const rects = els.map(x => { const b = x.getBoundingClientRect(); return { top: b.top + sTop(), h: b.height }; });
    const gap = rects.length > 1 ? rects[1].top - rects[0].top - rects[0].h : 10;
    const shift = rects[from].h + gap;
    const startY = e.clientY, startScroll = sTop();
    let y = e.clientY, to = from, raf = 0;
    el.classList.add('dragging');
    try { h.setPointerCapture(e.pointerId); } catch { }
    const update = () => {
      const dy = y - startY + (sTop() - startScroll);
      el.style.transform = `translateY(${dy}px)`;
      const center = rects[from].top + rects[from].h / 2 + dy;
      let t = 0;
      rects.forEach((rc, k) => { if (k !== from && center > rc.top + rc.h / 2) t++; });
      if (t !== to) { to = t; buzz(8); }
      els.forEach((x, k) => {
        if (k === from) return;
        const s = from < to && k > from && k <= to ? -shift : from > to && k >= to && k < from ? shift : 0;
        x.style.transform = s ? `translateY(${s}px)` : '';
      });
    };
    const loop = () => {
      const b = scroller.getBoundingClientRect(), edge = 70;
      const v = y < b.top + edge ? -(b.top + edge - y) / 4 : y > b.bottom - edge ? (y - b.bottom + edge) / 4 : 0;
      if (v) { scroller.scrollTop += v; update(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const move = ev => { y = ev.clientY; update(); };
    const up = () => {
      cancelAnimationFrame(raf);
      h.removeEventListener('pointermove', move);
      h.removeEventListener('pointerup', up);
      h.removeEventListener('pointercancel', up);
      els.forEach(x => { x.style.transform = ''; });
      el.classList.remove('dragging');
      list.classList.remove('reordering');
      if (to !== from) onDrop(from, to);
    };
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerup', up);
    h.addEventListener('pointercancel', up);
  }
}

// Swipe a row left to delete it. `row` sits inside a .swipe wrapper that shows the red background.
export function swipeToDelete(row, onDelete) {
  const wrap = row.parentElement;
  let x0 = null, y0 = 0, dx = 0, id = 0, decided = false, active = false;
  row.addEventListener('pointerdown', e => {
    if (e.button || e.pointerType === 'mouse' && e.target.closest('input')) return;
    x0 = e.clientX; y0 = e.clientY; dx = 0; id = e.pointerId; decided = false; active = false;
  });
  row.addEventListener('pointermove', e => {
    if (x0 == null || e.pointerId !== id) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!decided) {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      decided = true;
      active = mx < 0 && Math.abs(mx) > Math.abs(my) * 1.3;
      if (!active) { x0 = null; return; }
      try { row.setPointerCapture(id); } catch { }
      document.activeElement?.blur?.();
      wrap.classList.add('swiping');
    }
    dx = Math.min(0, mx);
    row.style.transform = `translateX(${dx}px)`;
    const armed = -dx > wrap.offsetWidth * 0.35;
    if (armed !== wrap.classList.contains('armed')) { wrap.classList.toggle('armed', armed); if (armed) buzz(10); }
    e.preventDefault();
  });
  const end = () => {
    if (x0 == null) return;
    x0 = null;
    if (!active) return;
    active = false;
    const w = wrap.offsetWidth;
    if (-dx > w * 0.35) {
      row.style.transform = `translateX(${-w}px)`;
      wrap.style.height = wrap.offsetHeight + 'px';
      requestAnimationFrame(() => wrap.classList.add('gone'));
      setTimeout(onDelete, 230);
    } else {
      row.style.transform = '';
      setTimeout(() => wrap.classList.remove('swiping', 'armed'), 200);
    }
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', end);
  // a swipe must not also trigger the button under the finger
  row.addEventListener('click', e => { if (dx < -10) { e.stopPropagation(); e.preventDefault(); dx = 0; } }, true);
}
