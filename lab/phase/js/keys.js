// On-screen keyboard (multi-touch, glissando) for playing without the LUMI,
// plus the computer keyboard for desktop testing.
import { h } from './ui.js?v=202611091438';
import { S, save } from './store.js?v=202611091438';
import { keyOn, keyOff, pressed } from './perform.js?v=202611091438';
import { noteName } from './ui.js?v=202611091438';

const BLACK = [1, 3, 6, 8, 10];

export function createKeys() {
  const wrap = h('div', { class: 'keys' });
  const down = h('button', { class: 'oct', type: 'button', 'aria-label': 'Octave plus basse' }, '‹');
  const up = h('button', { class: 'oct', type: 'button', 'aria-label': 'Octave plus haute' }, '›');
  const bed = h('div', { class: 'bed' });
  wrap.append(down, bed, up);
  let keys = [];
  const start = () => S.settings.keysStart ?? 48;

  function build() {
    bed.textContent = '';
    const whiteW = 40;
    const octs = Math.max(1, Math.min(4, Math.floor((bed.clientWidth || 600) / (whiteW * 7))));
    const n0 = start(), n1 = n0 + octs * 12;
    const whites = [];
    for (let n = n0; n <= n1; n++) if (!BLACK.includes(n % 12)) whites.push(n);
    const ww = 100 / whites.length;
    keys = [];
    let wi = 0;
    for (let n = n0; n <= n1; n++) {
      const black = BLACK.includes(n % 12);
      const k = h('div', { class: 'key ' + (black ? 'b' : 'w'), 'data-n': n });
      if (black) { k.style.left = (wi * ww - ww * 0.3) + '%'; k.style.width = ww * 0.6 + '%'; }
      else {
        k.style.left = wi * ww + '%'; k.style.width = ww + '%'; wi++;
        if (n % 12 === 0) k.append(h('small', {}, noteName(n)));
      }
      keys.push(k);
    }
    // whites first so blacks stack on top
    bed.append(...keys.filter(k => k.classList.contains('w')), ...keys.filter(k => k.classList.contains('b')));
    paint();
  }

  function paint() {
    for (const k of keys) {
      const n = +k.dataset.n;
      k.classList.toggle('on', pressed.has(n));
      k.classList.toggle('hi', S.split.on && n >= S.split.point);
    }
  }

  const touches = new Map();
  const noteAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const k = el && el.closest && el.closest('.key');
    return k && bed.contains(k) ? { n: +k.dataset.n, k } : null;
  };
  const velAt = (k, y) => {
    const r = k.getBoundingClientRect();
    return Math.round(45 + 82 * Math.min(1, Math.max(0, (y - r.top) / r.height)));
  };
  bed.addEventListener('pointerdown', e => {
    e.preventDefault();
    const hit = noteAt(e.clientX, e.clientY);
    if (!hit) return;
    bed.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, hit.n);
    keyOn(hit.n, velAt(hit.k, e.clientY));
  });
  bed.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return;
    const hit = noteAt(e.clientX, e.clientY);
    const cur = touches.get(e.pointerId);
    if (hit && hit.n !== cur) {
      keyOff(cur);
      touches.set(e.pointerId, hit.n);
      keyOn(hit.n, velAt(hit.k, e.clientY));
    }
  });
  const end = e => {
    if (!touches.has(e.pointerId)) return;
    keyOff(touches.get(e.pointerId));
    touches.delete(e.pointerId);
  };
  bed.addEventListener('pointerup', end);
  bed.addEventListener('pointercancel', end);
  const shift = d => {
    S.settings.keysStart = Math.max(12, Math.min(96, start() + d * 12));
    save(); build();
  };
  down.onclick = () => shift(-1);
  up.onclick = () => shift(1);

  new ResizeObserver(() => build()).observe(bed);
  return { el: wrap, paint, build };
}

// Computer keyboard by physical position (works on AZERTY and QWERTY):
// bottom row = white keys from the on-screen start, row above = black keys.
const CODES = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon', 'Quote'];
export function bindComputerKeys() {
  const downKeys = new Map();
  addEventListener('keydown', e => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const i = CODES.indexOf(e.code);
    if (i < 0) return;
    const n = (S.settings.keysStart ?? 48) + 12 + i;
    downKeys.set(e.code, n);
    keyOn(n, 100);
  });
  addEventListener('keyup', e => {
    const n = downKeys.get(e.code);
    if (n == null) return;
    downKeys.delete(e.code);
    keyOff(n);
  });
}
