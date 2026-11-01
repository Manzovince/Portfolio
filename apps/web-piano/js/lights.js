// === Light frames, shared by the LED strip and the LUMI keys ===
//
// Rather than lighting note by note (which let one note's "off" wipe a
// neighbour still lit by a ripple), every frame computes the colour each key
// should have; each output then sends only what changed since its last frame.

import { subscribe, soundingNotes, noteInfo, LOWEST, HIGHEST } from "./piano.js?v=20261101n";
import { settings, onSettingChange } from "./settings.js?v=20261101n";
import { noteColor, hsvToRgb, scaleColor } from "./colors.js?v=20261101n";
import { scaleNotes, pitchClass } from "./theory.js?v=20261101n";
import { isPracticing, practiceGuide, onPracticeChange } from "./practice.js?v=20261101n";
import { songGuide, onSongGuide } from "./song.js?v=20261101n";

const RIPPLE = { reach: 10, msPerKey: 30, decay: 0.6, life: 700 };
const SCALE_GLOW = 0.12; // share of the brightness used for the scale guide
const GUIDE_GLOW = 0.4;  // notes to play now, during an exercise

let ripples = []; // { midi, start, velocity }
const listeners = new Set();

// Called whenever a frame may have changed
export const onLightsChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn());

export const lightsAnimating = now => ripples.some(r => now - r.start < RIPPLE.life);

// Notes to play right now, from an exercise (with hints) or a song being learnt
export const currentGuide = () => (isPracticing() ? practiceGuide() : songGuide());
export const guideActive = () => !!currentGuide();

const maxChannel = (a, b) => ({ r: Math.max(a.r, b.r), g: Math.max(a.g, b.g), b: Math.max(a.b, b.b) });

// midi -> {r,g,b}. `scale: false` leaves out the soft scale guide (the LUMI draws its own),
// `hello` replaces everything with a dim rainbow sweep.
export function computeFrame(now, { intensity = 1, scale = true, hello = false } = {}) {
    const frame = new Map();
    const add = (midi, color) => {
        if (midi < LOWEST || midi > HIGHEST) return;
        frame.set(midi, frame.has(midi) ? maxChannel(frame.get(midi), color) : color);
    };

    if (hello) {
        for (let m = LOWEST; m <= HIGHEST; m++) add(m, hsvToRgb((m - LOWEST) / 88, 1, 0.1));
        return frame;
    }

    // Scale guide: every note of the scale glows softly. During an exercise,
    // its hints take over: the notes to play now glow brighter.
    const guide = currentGuide();
    const soft = guide ? guide.soft ?? new Set()
        : scale ? new Set(scaleNotes(settings.scaleRoot, settings.scaleType).map(n => n.pc)) : new Set();
    for (let m = LOWEST; m <= HIGHEST; m++) {
        const pc = pitchClass(m);
        const glow = guide?.strong?.has(pc) || guide?.midis?.has(m) ? GUIDE_GLOW : soft.has(pc) ? SCALE_GLOW : 0;
        if (glow) add(m, scaleColor(noteColor(m, settings.colorMode), intensity * glow));
    }

    for (const midi of soundingNotes()) {
        const velocity = noteInfo(midi)?.velocity ?? 100;
        add(midi, scaleColor(noteColor(midi, settings.colorMode), intensity * velocity / 127));
    }

    // Ripples spread a key at a time and fade out
    ripples = ripples.filter(r => now - r.start < RIPPLE.life);
    for (const r of ripples) {
        const age = now - r.start;
        const radius = Math.min(RIPPLE.reach, Math.floor(age / RIPPLE.msPerKey));
        const fade = 1 - age / RIPPLE.life;
        for (let d = 1; d <= radius; d++) {
            const level = intensity * (r.velocity / 127) * Math.pow(RIPPLE.decay, d) * fade;
            for (const m of [r.midi - d, r.midi + d]) add(m, scaleColor(noteColor(m, settings.colorMode), level));
        }
    }
    return frame;
}

subscribe(event => {
    if (event.type === "on" && settings.ledEffect === "ripple") {
        ripples.push({ midi: event.midi, start: performance.now(), velocity: event.velocity });
    }
    changed();
});

onSettingChange(key => {
    if (["colorMode", "scaleRoot", "scaleType", "ledEffect"].includes(key)) changed();
});

onPracticeChange(changed);
onSongGuide(changed);
