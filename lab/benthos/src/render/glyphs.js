import { el, n, alpha } from './svg.js';
import { reefColor, creatureColor, RELIC_COLOR } from './palette.js';

// All artwork is drawn inside a 24x24 box and scaled into place, so a glyph
// reads the same on a hand thumbnail as it does on a 150px tile.

const REEF = {
  rock: (c) =>
    `<path d="M1.5 20.5 C2 14.5 5.5 10 9.5 10 C13.5 10 17 14.5 17.5 20.5 Z" fill="${alpha(c, .16)}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>
     <path d="M13 20.5 C13.4 16.6 15.8 13.8 18.2 13.8 C20.6 13.8 22.3 16.8 22.5 20.5 Z" fill="${alpha(c, .1)}" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/>
     <path d="M5 18 C5.6 14.6 7.4 12.4 9.4 12.2" fill="none" stroke="${c}" stroke-width="1" opacity=".55"/>`,
  posidonia: (c) =>
    `<path d="M12 21.5 C10.4 16 9.4 11.5 8.2 6.6 M12 21.5 C13.6 16 14.6 11.8 15.8 7.2 M12 21.5 C12 15.5 12 10.5 12 4.8
              M12 21.5 C9.4 17.6 6.6 15 4.6 13.4 M12 21.5 C14.8 17.6 17.4 15.2 19.4 13.8"
           fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
     <path d="M7.5 21.5 H16.5" stroke="${alpha(c, .5)}" stroke-width="1.4" stroke-linecap="round"/>`,
  coral: (c) =>
    `<path d="M12 21.5 V12 M12 15 L7 9 M12 14 L17 8 M7 9 V5.4 M17 8 V4.8 M12 12 V6.2"
           fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round"/>
     <circle cx="7" cy="4.4" r="1.5" fill="${c}"/><circle cx="17" cy="3.9" r="1.5" fill="${c}"/><circle cx="12" cy="5.3" r="1.5" fill="${c}"/>`,
  sponge: (c) =>
    `<path d="M7.6 21 C6.5 15 7 9.5 8.6 7.4 L15.4 7.4 C17 9.5 17.5 15 16.4 21 Z" fill="${alpha(c, .14)}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>
     <ellipse cx="12" cy="7.4" rx="3.4" ry="1.6" fill="${alpha(c, .3)}" stroke="${c}" stroke-width="1.3"/>
     <circle cx="10.2" cy="13" r="1" fill="${c}" opacity=".6"/><circle cx="13.8" cy="16.4" r="1" fill="${c}" opacity=".6"/>`,
};

const CREATURE = {
  jellyfish: (c) =>
    `<path d="M4.4 12.6 C4.4 6.6 7.8 3.4 12 3.4 C16.2 3.4 19.6 6.6 19.6 12.6 Z" fill="${alpha(c, .2)}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>
     <path d="M4.4 12.6 Q6.3 15.2 8.2 12.6 Q10.1 15.2 12 12.6 Q13.9 15.2 15.8 12.6 Q17.7 15.2 19.6 12.6" fill="none" stroke="${c}" stroke-width="1.3"/>
     <path d="M8 14 C7.4 17 8.6 18.4 8 21.4 M12 14 C11.4 17.4 12.6 18.6 12 22 M16 14 C16.6 17 15.4 18.4 16 21.4"
           fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`,
  turtle: (c) =>
    `<circle cx="20" cy="11" r="2.2" fill="${alpha(c, .3)}" stroke="${c}" stroke-width="1.3"/>
     <path d="M6.5 6.5 L4 4 M6.5 17 L4 19.6 M16 6.8 L18 4.4 M16 17 L18 19.4" stroke="${c}" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>
     <ellipse cx="11.5" cy="12" rx="7" ry="5.6" fill="${alpha(c, .18)}" stroke="${c}" stroke-width="1.6"/>
     <path d="M8.4 9 L11.5 8 L14.6 9 L15.4 12 L14.6 15 L11.5 16 L8.4 15 L7.6 12 Z" fill="none" stroke="${c}" stroke-width="1.1" opacity=".8"/>`,
  shark: (c) =>
    `<path d="M21.5 12 C17.5 8 12.5 7.4 7.5 9 L3 5.4 L4.6 12 L3 18.6 L7.5 15 C12.5 16.6 17.5 16 21.5 12 Z"
           fill="${alpha(c, .18)}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>
     <path d="M12.4 8.1 L13.8 3.6 L16.6 8.8" fill="${alpha(c, .3)}" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"/>
     <path d="M12 15 L10.4 19 L14.8 16" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>
     <circle cx="18.4" cy="11.1" r="0.95" fill="${c}"/>`,
};

const RELIC = {
  amphora: (c) =>
    `<path d="M9 4 H15 M10 4 C10 8 6 9 6 13 C6 18 8.5 21 12 21 C15.5 21 18 18 18 13 C18 9 14 8 14 4"
           fill="${alpha(c, .16)}" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/>
     <path d="M10 5.5 C6.5 6.5 5 9 6.5 11 M14 5.5 C17.5 6.5 19 9 17.5 11" fill="none" stroke="${c}" stroke-width="1.2" opacity=".8"/>`,
  chest: (c) =>
    `<path d="M4 11 H20 V20 H4 Z" fill="${alpha(c, .16)}" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/>
     <path d="M4 11 C4 6.5 7.5 4.5 12 4.5 C16.5 4.5 20 6.5 20 11" fill="${alpha(c, .1)}" stroke="${c}" stroke-width="1.6"/>
     <path d="M4 14.5 H20" stroke="${c}" stroke-width="1.2" opacity=".75"/>
     <rect x="10.5" y="13" width="3" height="4" rx="1" fill="none" stroke="${c}" stroke-width="1.3"/>`,
  wreck: (c) =>
    `<path d="M2.5 13.5 H21.5 C20.4 19 17 21.5 12 21.5 C7 21.5 3.6 19 2.5 13.5 Z" fill="${alpha(c, .16)}" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/>
     <path d="M12.5 13.5 L10.6 3.5 M10.9 6.4 L17 4.4 M10.2 9.6 L15.2 8.4" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
     <path d="M6 15.6 L7 19.4 M12 16 L12 20 M17.8 15.6 L16.8 19.4" stroke="${c}" stroke-width="1" opacity=".55"/>`,
};

function draw(set, key, color, cx, cy, size, fallback) {
  const make = set[key] || set[fallback];
  return el('g', {
    transform: `translate(${n(cx - size / 2)} ${n(cy - size / 2)}) scale(${n(size / 24)})`,
  }, make(color));
}

export const reefGlyph = (key, cx, cy, size, color) =>
  draw(REEF, key, color || reefColor(key), cx, cy, size, 'rock');

export const creatureGlyph = (key, cx, cy, size, color) =>
  draw(CREATURE, key, color || creatureColor(key), cx, cy, size, 'jellyfish');

export const relicGlyph = (key, cx, cy, size, color) =>
  draw(RELIC, key, color || RELIC_COLOR, cx, cy, size, 'chest');

/** One small fish, nose pointing along `deg`. Used to dress a fish run. */
export function fishGlyph(cx, cy, size, deg, color) {
  const s = size / 12;
  const body = `<path d="M11.6 4 C9 1.4 5 1.4 2.6 4 C5 6.6 9 6.6 11.6 4 Z" fill="${alpha(color, .25)}" stroke="${color}" stroke-width="1"/>
    <path d="M2.6 4 L0.4 2 L1 4 L0.4 6 Z" fill="${color}" opacity=".8"/>
    <circle cx="9.4" cy="3.5" r="0.6" fill="${color}"/>`;
  return el('g', {
    transform: `translate(${n(cx)} ${n(cy)}) rotate(${n(deg)}) scale(${n(s)}) translate(-6 -4)`,
  }, body);
}
