// Small DOM helpers shared by the views.

import { fmtTime } from './format.js';

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let toastTimer = null;
export function toast(message) {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('on'), 2200);
}

export const icons = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  waves: '<svg viewBox="0 0 24 24"><path d="M2 7c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M2 13c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/></svg>',
  lungs: '<svg viewBox="0 0 24 24"><path d="M12 3v9"/><path d="M9.5 7c0 3-1 3.5-2.6 5C4.8 13.8 4 15.6 4 18a3 3 0 0 0 4.6 2.5c.9-.6 1.4-1.6 1.4-2.7V9"/><path d="M14.5 7c0 3 1 3.5 2.6 5 2.1 1.8 2.9 3.6 2.9 6a3 3 0 0 1-4.6 2.5c-.9-.6-1.4-1.6-1.4-2.7V9"/></svg>',
  // seated lotus: head, arms draping to the knees, crossed shins on the base
  meditate: '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.2" r="2.2"/><path d="M12 9c-3 .6-5.2 2.8-6.1 5.8"/><path d="M12 9c3 .6 5.2 2.8 6.1 5.8"/><path d="M5.9 14.8c-.6 2 .4 3.4 2.3 3.4h7.6c1.9 0 2.9-1.4 2.3-3.4"/><path d="M8.4 18.2c.8-1.6 2-2.4 3.6-2.4s2.8.8 3.6 2.4"/></svg>',
  // O–C–O and O–O: single bonds, carbon filled so it reads as the odd atom out
  co2: '<svg viewBox="0 0 24 24"><path d="M6.5 12h3M14.5 12h3"/><circle cx="4" cy="12" r="2.5"/><circle cx="20" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>',
  o2: '<svg viewBox="0 0 24 24"><path d="M10.6 12h2.8"/><circle cx="7.4" cy="12" r="3.2"/><circle cx="16.6" cy="12" r="3.2"/></svg>',
  // A walking trail: three prints advancing down the icon, alternating right,
  // left, right across the line of travel — not marching down a diagonal. One
  // closed outline per foot, waisted at the arch, each splayed slightly toe-out.
  steps: (() => {
    // sole tapered rather than waisted — an arch notch turns into a comma hook
    // once the whole print is only ~7px tall
    const foot = 'M0-4.5C1.8-4.5 2.3-3.6 2.3-2.4 2.3-1 2.9.6 2.9 2.2 2.9 3.7 1.8 4.7.1 4.7-1.6 4.7-2.7 3.7-2.7 2.2-2.7.6-2.1-1-2.1-2.4-2.1-3.6-1.6-4.5 0-4.5Z';
    const prints = [
      [14.8, 4.9, -8, 1],    // right
      [9.2, 12, 8, -1],      // left
      [14.8, 19.1, -8, 1],   // right
    ];
    return `<svg viewBox="0 0 24 24">${prints
      .map(([x, y, angle, flip]) => `<path transform="translate(${x} ${y}) rotate(${angle}) scale(${flip * 0.82} .82)" d="${foot}"/>`)
      .join('')}</svg>`;
  })(),
  // Breathing presets: each icon is the silhouette of one cycle of its own
  // pattern, so the five read as a family and still separate at 22px.
  // equal four counts, traced round a square from the bottom-left
  boxBreath: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="3"/><circle cx="4.5" cy="19.5" r="1.9" fill="currentColor" stroke="none"/></svg>',
  // short rise, long plateau, fall — the 7-count hold is the wide flat top
  hold478: '<svg viewBox="0 0 24 24"><path d="M2.5 19 5.5 7h11l5 12"/></svg>',
  // even in, even out, no holds anywhere
  coherence: '<svg viewBox="0 0 24 24"><path d="M2 12c1.5-7 4.5-7 6 0s4.5 7 6 0 4.5-7 4 0"/></svg>',
  // the arrowhead is what keeps this from reading as another peak
  longExhale: '<svg viewBox="0 0 24 24"><path d="M2.5 18.5 7 5.5c3.5 2.5 10 8 13.8 12.8"/><path d="M15.7 17.6 21 19l-1.4-5.3"/></svg>',
  sliders: '<svg viewBox="0 0 24 24"><path d="M3 7h5M13.5 7H21M3 12h11.5M19.5 12H21M3 17h3M11 17h10"/><circle cx="10.5" cy="7" r="2.2"/><circle cx="17" cy="12" r="2.2"/><circle cx="8.5" cy="17" r="2.2"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15l4-5 3.5 3L21 6"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.5 1.5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
};

/**
 * +/- stepper over a fixed set of seconds values.
 * onChange receives the new value in seconds.
 */
export function stepper({ label, value, min = 0, max = 3600, step = 15, format = fmtTime, onChange }) {
  const node = el(`
    <div class="field">
      <span class="field-label">${label}</span>
      <div class="stepper">
        <button type="button" aria-label="Decrease ${label}">&minus;</button>
        <span class="stepper-value">${format(value)}</span>
        <button type="button" aria-label="Increase ${label}">+</button>
      </div>
    </div>`);
  const [minus, plus] = node.querySelectorAll('button');
  const out = node.querySelector('.stepper-value');
  let v = value;
  const sync = () => {
    out.textContent = format(v);
    minus.disabled = v <= min;
    plus.disabled = v >= max;
    onChange(v);
  };
  const bump = (dir) => {
    // snap to the step grid so odd imported values tidy up
    const next = dir > 0 ? Math.floor(v / step) * step + step : Math.ceil(v / step) * step - step;
    v = Math.min(max, Math.max(min, next));
    sync();
  };
  minus.addEventListener('click', () => bump(-1));
  plus.addEventListener('click', () => bump(1));
  sync();
  return node;
}

/**
 * Free-text field. `parse` turns the raw string into a stored value; onChange
 * gets null when the text is unparseable, so callers can block save.
 */
export function textField({ label, hint, value = '', placeholder = '', inputmode, parse, onChange }) {
  const node = el(`
    <div class="field">
      <label>${label}</label>
      <input type="text" value="${String(value).replace(/"/g, '&quot;')}" placeholder="${placeholder}"${inputmode ? ` inputmode="${inputmode}"` : ''}>
      ${hint ? `<span class="tiny">${hint}</span>` : ''}
    </div>`);
  const input = node.querySelector('input');
  const say = () => {
    const parsed = parse ? parse(input.value) : input.value;
    const bad = input.value.trim() !== '' && parsed == null;
    input.style.borderColor = bad ? 'var(--danger)' : '';
    onChange(parsed);
  };
  input.addEventListener('input', say);
  return node;
}

/** Segmented control. options: [{value,label}] */
export function segmented({ options, value, onChange, label }) {
  const node = el(`<div class="seg" role="group"${label ? ` aria-label="${label}"` : ''}></div>`);
  options.forEach((opt) => {
    const b = el(`<button type="button" aria-pressed="${opt.value === value}">${opt.label}</button>`);
    b.addEventListener('click', () => {
      node.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      onChange(opt.value);
    });
    node.appendChild(b);
  });
  return node;
}

/** Progress dial. Returns { node, set(fraction, className), markers(list, total) } */
export function dial() {
  // viewBox is padded well beyond the ring so the stroke and the contraction
  // ticks (which sit outside it) never clip against the edges.
  const R = 50;
  const CX = 60;
  const C = 2 * Math.PI * R;
  const node = el(`
    <div class="dial-wrap">
      <svg class="dial" viewBox="0 0 120 120" aria-hidden="true">
        <circle class="dial-track" cx="${CX}" cy="${CX}" r="${R}"/>
        <circle class="dial-arc" cx="${CX}" cy="${CX}" r="${R}"
                stroke-dasharray="${C}" stroke-dashoffset="${C}"
                transform="rotate(-90 ${CX} ${CX})"/>
        <g class="dial-marks"></g>
      </svg>
      <div class="dial-center">
        <div class="time-big num">0:00</div>
        <div class="time-sub"></div>
      </div>
    </div>`);

  const arc = node.querySelector('.dial-arc');
  const marks = node.querySelector('.dial-marks');
  const big = node.querySelector('.time-big');
  const sub = node.querySelector('.time-sub');

  return {
    node,
    setArc(fraction, variant) {
      const f = Math.max(0, Math.min(1, fraction || 0));
      arc.style.strokeDashoffset = String(C * (1 - f));
      arc.setAttribute('class', `dial-arc${variant ? ' ' + variant : ''}`);
    },
    setTime(text) { big.textContent = text; },
    setSub(text) { sub.textContent = text; },
    setMarkers(points, total) {
      marks.innerHTML = '';
      if (!total) return;
      for (const p of points) {
        const a = (Math.min(p / total, 1) * 360 - 90) * (Math.PI / 180);
        const x1 = CX + Math.cos(a) * (R - 6);
        const y1 = CX + Math.sin(a) * (R - 6);
        const x2 = CX + Math.cos(a) * (R + 6);
        const y2 = CX + Math.sin(a) * (R + 6);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'dial-tick');
        line.setAttribute('x1', x1.toFixed(2));
        line.setAttribute('y1', y1.toFixed(2));
        line.setAttribute('x2', x2.toFixed(2));
        line.setAttribute('y2', y2.toFixed(2));
        marks.appendChild(line);
      }
    },
  };
}

/**
 * In-app confirmation. Native window.confirm() is unreliable — browsers suppress
 * it in standalone/PWA contexts and once the user ticks "prevent additional
 * dialogs", where it silently returns false and the button looks dead.
 * Resolves true only when the confirm button is pressed.
 */
export function confirmDialog({ title, message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const dlg = el(`
      <dialog class="modal">
        <form method="dialog">
          <h3>${title}</h3>
          ${message ? `<p>${message}</p>` : ''}
          <div class="modal-actions">
            <button type="submit" class="btn" value="cancel">${cancelLabel}</button>
            <button type="submit" class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" value="ok">${confirmLabel}</button>
          </div>
        </form>
      </dialog>`);

    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => {
      const ok = dlg.returnValue === 'ok';
      dlg.remove();
      resolve(ok);
    }, { once: true });

    if (typeof dlg.showModal === 'function') {
      dlg.showModal();
    } else {
      // very old browser: fall back rather than trap the user
      dlg.remove();
      resolve(window.confirm(`${title}\n\n${message}`));
    }
  });
}
