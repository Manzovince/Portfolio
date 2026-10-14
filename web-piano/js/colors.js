// === Note colours, shared by the keys, the piano roll and the LED strip ===

import { LOWEST, HIGHEST } from "./piano.js?v=20261014";

const ACCENT = { r: 68, g: 172, b: 163 }; // the site's teal, hsl(175 43% 47%)

export function hsvToRgb(h, s = 1, v = 1) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6];
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// Full-brightness colour of a note in a given mode
export function noteColor(midi, mode) {
    switch (mode) {
        case "octave":
            return hsvToRgb((midi % 12) / 12, 0.75);
        case "mono":
            return ACCENT;
        case "rainbow":
        default:
            // Stop short of red at the top so both ends stay distinguishable
            return hsvToRgb(((midi - LOWEST) / (HIGHEST - LOWEST)) * 0.85, 0.75);
    }
}

export const rgbString = ({ r, g, b }, alpha = 1) => `rgb(${r} ${g} ${b} / ${alpha})`;

export function scaleColor({ r, g, b }, factor) {
    return { r: Math.round(r * factor), g: Math.round(g * factor), b: Math.round(b * factor) };
}
