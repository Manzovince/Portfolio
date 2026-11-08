// Rendu HTML des cartes (face et dos), partagé par le simulateur et la page des designs.
import { CARDS, TNOM } from './engine.js?v=3';

export const GLYPH = {
  P: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="7"/><g stroke-width="3" stroke-linecap="round"><path d="M20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M8.7 31.3l3.5-3.5M27.8 12.2l3.5-3.5"/></g></svg>',
  F: '<svg viewBox="0 0 40 40"><path d="M20 3 9 18h5L7 28h11v8h4v-8h11l-7-10h5z"/></svg>',
  M: '<svg viewBox="0 0 40 40"><path d="M2 34 15 10l6 10 4-6 13 20z"/><path class="snow" d="M15 10l-4 7 3-1 2 2 2-3z"/></svg>',
  A: '<svg viewBox="0 0 40 40" fill="none" stroke-width="3.2" stroke-linecap="round"><path d="M4 14q4-4 8 0t8 0 8 0 8 0M4 22q4-4 8 0t8 0 8 0 8 0M4 30q4-4 8 0t8 0 8 0 8 0"/></svg>',
  B: '<svg viewBox="0 0 40 40"><path d="M6 13l7 6 7-11 7 11 7-6-3 17H9z"/><rect x="9" y="32" width="22" height="4" rx="1"/></svg>',
};
export const ARROW = {
  nw: '<svg viewBox="0 0 20 20"><path d="M4 4h10l-3.5 3.5L17 14l-3 3-6.5-6.5L4 14z"/></svg>',
  n: '<svg viewBox="0 0 20 20"><path d="M10 2l7 7h-5v9H8V9H3z"/></svg>',
  ne: '<svg viewBox="0 0 20 20"><path d="M16 4H6l3.5 3.5L3 14l3 3 6.5-6.5L16 14z"/></svg>',
};
export const THEMES = { signal: 'Signalétique', carto: 'Carte d’état-major', deco: 'Art déco nocturne' };

export function faceHTML(id, extra = '') {
  const c = CARDS[id];
  const bl = c.kind === 'souv' || c.kind === 'ombre';
  const ar = ['nw', 'n', 'ne'].map(d => `<i class="${c[d] ? 'on' : ''}">${ARROW[d]}</i>`).join('');
  const name = c.kind === 'unit' ? TNOM[c.t] : c.name;
  return `<div class="card tc face t-${c.t} ${bl ? 'blason ' + c.kind : c.kind} ${extra}" title="${c.text || ''}">
    <i class="tc-frame"></i>
    ${bl ? `<div class="tc-crown">${GLYPH.B}</div>` : `<div class="tc-arrows">${ar}</div>
    <i class="tc-sup l${c.l ? ' on' : ''}"></i><i class="tc-sup r${c.r ? ' on' : ''}"></i>
    <div class="tc-num">${c.f}</div>`}
    <div class="tc-name">${name}</div>
    ${c.text ? `<div class="tc-text">${c.text}</div>` : ''}
    <div class="tc-home">${GLYPH[c.t]}</div></div>`;
}

export function backHTML(t, extra = '') {
  return `<div class="card tc back t-${t} ${extra}"><i class="tc-frame"></i><div class="tc-glyph">${GLYPH[t]}</div><div class="tc-label">${TNOM[t]}</div></div>`;
}
