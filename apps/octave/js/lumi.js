// === ROLI LUMI Keys: lighting over MIDI ===
//
// Two channels into the LUMI's stock program:
// - SysEx sets its global settings (colour mode, brightness, key and root
//   colours, scale, key, octave). Bytes from the reverse-engineered protocol
//   at github.com/benob/LUMI-lights.
// - Plain MIDI lights single keys: a note-on picks a colour from the program's
//   128-colour table by velocity, polyphonic aftertouch sets that key's
//   brightness, a note-off gives the key back to the LUMI. Used only to show
//   the notes to play during an exercise or while learning a song.

import { S, on } from "./store.js?v=202611114";
import { midiAccess, onMidiAccess, connectMidi } from "./midi.js?v=202611114";
import { onGuideChange, guideActive, learnGuide as currentGuide } from "./guide.js?v=202611114";
import { pitchClass } from "./theory.js?v=202611114";
import { setLumiRange } from "./keys.js?v=202611114";

// The LUMI is left alone: its own mode stays on, except while a guide is shown
// (an exercise or a song being learnt), when the notes to play are lit. Then
// the "restore" settings below are sent to bring back the chosen look.
const settings = {
    get lumiEnabled() { return S.lumi.enabled; },
    get lumiBlocks() { return S.lumi.blocks; },
    get lumiOctave() { return S.lumi.octave; },
    get lumiBrightness() { return S.lumi.brightness; },
    get lumiMode() { return S.lumi.restore; },
    get lumiColor() { return S.lumi.restoreColor; },
    get lumiRootColor() { return S.lumi.restoreRoot; },
    get lumiKeyLights() { return S.lumi.guide; },
    get lumiGuideColor() { return S.lumi.color; },
    get lumiScaleSync() { return false; },
    get scaleType() { return ""; },
    get scaleRoot() { return 0; },
};

const ROLI = [0x00, 0x21, 0x10];
const LUMI_ID = 0x37;
const KEYS_PER_BLOCK = 24;

// LUMI scale numbers for the app's scales; no scale chosen = chromatic
const LUMI_SCALES = { major: 0, minor: 1, harmonicMinor: 2, majorPentatonic: 4, minorPentatonic: 5, blues: 6, dorian: 7, mixolydian: 10 };
const CHROMATIC = 18;
export const LUMI_MODES = ["rainbow", "single", "piano", "night"];

// colourLookup[] of the LUMI default program (0xRRGGBB): black, a hue sweep, white
const PALETTE = [
    0x000000, 0xff506f, 0xff546c, 0xff5869, 0xff5c66, 0xff6063, 0xff6460, 0xff695c, 0xff6d59, 0xff7156, 0xff7553, 0xff7950,
    0xff7d4d, 0xff814a, 0xff8547, 0xff8944, 0xff8d41, 0xff923d, 0xff963a, 0xff9a37, 0xff9e34, 0xffa231, 0xffa62e, 0xffaa2e,
    0xffae2d, 0xffb12d, 0xffb52c, 0xffb92c, 0xffbd2b, 0xffc12b, 0xffc42b, 0xffc82a, 0xffcc2a, 0xffd029, 0xffd429, 0xffd828,
    0xffdb28, 0xffdf28, 0xffe327, 0xffe727, 0xffeb26, 0xffee26, 0xfff225, 0xfff625, 0xf7f62a, 0xf0f72e, 0xe8f733, 0xe1f837,
    0xd9f83c, 0xd1f841, 0xcaf945, 0xc2f94a, 0xbaf94f, 0xb3fa53, 0xabfa58, 0xa4fb5c, 0x9cfb61, 0x94fb66, 0x8dfc6a, 0x85fc6f,
    0x7dfc74, 0x76fd78, 0x6efd7d, 0x67fe81, 0x5ffe86, 0x5cfc8b, 0x59fa8f, 0x56f894, 0x53f698, 0x50f49d, 0x4df2a2, 0x4af0a6,
    0x47eeab, 0x44ecb0, 0x41eab4, 0x3ee9b9, 0x3be7bd, 0x38e5c2, 0x35e3c7, 0x32e1cb, 0x2fdfd0, 0x2cddd5, 0x29dbd9, 0x26d9de,
    0x23d7e2, 0x20d5e7, 0x23d0e8, 0x26cbe9, 0x29c6ea, 0x2cc1ec, 0x2fbced, 0x32b7ee, 0x35b2ef, 0x38adf0, 0x3ba8f1, 0x3ea3f2,
    0x409ff4, 0x439af5, 0x4695f6, 0x4990f7, 0x4c8bf8, 0x4f86f9, 0x5281fa, 0x557cfc, 0x5877fd, 0x5b72fe, 0x5e6dff, 0x616bfe,
    0x6469fd, 0x6767fc, 0x6b64fb, 0x6e62fa, 0x7160f9, 0x745ef8, 0x775cf7, 0x7a5af6, 0x7e58f5, 0x8155f3, 0x8453f2, 0x8751f1,
    0x8a4ff0, 0x8d4def, 0x904bee, 0x9448ed, 0x9746ec, 0x9a44eb, 0x9d42ea, 0xffffff,
].map(n => ({ r: n >> 16, g: (n >> 8) & 255, b: n & 255 }));

let state = "off"; // off | unsupported | denied | none | connected
let outputs = [];
const listeners = new Set();
const dirty = new Set();
let flushTimer = 0;

export const lumiState = () => state;
export const lumiCount = () => outputs.length;
export const onLumiState = fn => listeners.add(fn);

// Keys the LUMI blocks offer together: 24 per block, two blocks snapped together = 48
export function lumiKeyCount() {
    const blocks = settings.lumiBlocks === "auto" ? Math.max(1, outputs.length) : Number(settings.lumiBlocks);
    return blocks * KEYS_PER_BLOCK;
}

// Lowest note of the LUMI at its current octave (octave 0 starts on C3)
export const lumiLowest = () => 48 + 12 * settings.lumiOctave;

function setState(next) {
    state = next;
    listeners.forEach(fn => fn(state));
}

// === Encoding ===

// Fields [value, bits] are written least significant bit first into 7-bit bytes, padded to 8 bytes
export function pack(fields) {
    const bytes = [];
    let bit = 0;
    for (const [value, size] of fields) {
        for (let i = 0; i < size; i++, bit++) {
            if (bit % 7 === 0) bytes.push(0);
            if ((value >> i) & 1) bytes[bytes.length - 1] |= 1 << (bit % 7);
        }
    }
    while (bytes.length < 8) bytes.push(0);
    return bytes;
}

export function checksum(bytes) {
    let sum = bytes.length;
    for (const b of bytes) sum = (sum * 3 + b) & 0xff;
    return sum & 0x7f;
}

const hexToRgb = hex => {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

export const COMMANDS = {
    brightness: percent => pack([[0x10, 7], [0x40, 7], [0b00100, 5], [percent, 7]]),
    mode: index => pack([[0x10, 7], [0x40, 7], [0b00010, 5], [index, 2]]),
    // id 0 = colour of the keys, id 1 = colour of the root notes
    color: (id, { r, g, b }) => pack([[0x10, 7], [0x20 + 0x10 * id, 7], [0b00100, 5], [b, 8], [g, 8], [r, 8], [0xff, 8]]),
    scale: code => pack([[0x10, 7], [0x60, 7], [0b00010, 5], [code, 7]]),
    key: pc => pack([[0x10, 7], [0x30, 7], [0b00011, 5], [pc, 7]]),
    octave: octave => pack([[0x10, 7], [0x40, 7], [0b00000, 5], [octave, 32]]),
};

function commandFor(name) {
    switch (name) {
        case "brightness": return COMMANDS.brightness(Math.round(settings.lumiBrightness * 100));
        // While a guide is on, the settings below give the piano look (see keysActive)
        case "mode": return COMMANDS.mode(guideLook ? SINGLE_MODE : Math.max(0, LUMI_MODES.indexOf(settings.lumiMode)));
        case "color": return COMMANDS.color(0, guideLook ? PIANO_WHITE : hexToRgb(settings.lumiColor));
        case "rootColor": return COMMANDS.color(1, guideLook ? PIANO_WHITE : hexToRgb(settings.lumiRootColor));
        case "scale": return COMMANDS.scale(guideLook ? LUMI_SCALES.major : LUMI_SCALES[settings.scaleType] ?? CHROMATIC);
        case "key": return COMMANDS.key(guideLook ? 0 : settings.scaleRoot);
        case "octave": return COMMANDS.octave(settings.lumiOctave);
    }
}

// === Sending ===

function send(bytes) {
    sendRaw([0xf0, ...ROLI, 0x77, LUMI_ID, ...bytes, checksum(bytes), 0xf7]);
}

// Sliders fire often: gather changes and send them together
function queue(...names) {
    if (state !== "connected") return;
    names.forEach(name => {
        if ((name === "scale" || name === "key") && !settings.lumiScaleSync && !guideLook && !leavingGuide) return;
        dirty.add(name);
    });
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
        if (dirty.has("mode")) modeSettlesAt = performance.now() + 120;
        dirty.forEach(name => send(commandFor(name)));
        dirty.clear();
        leavingGuide = false;
    }, 40);
}


// === Single keys ===

let lit = new Map();      // midi -> palette index last sent
let frameRequested = false;
const nearest = new Map(); // "r,g,b" -> palette index

// Closest palette colour once both are brought to full brightness
export function paletteIndex({ r, g, b }) {
    const peak = Math.max(r, g, b);
    if (!peak) return 0;
    const key = `${Math.round(r * 15 / peak)},${Math.round(g * 15 / peak)},${Math.round(b * 15 / peak)}`;
    if (!nearest.has(key)) {
        const [nr, ng, nb] = [r, g, b].map(c => c * 255 / peak);
        let best = 1, bestDistance = Infinity;
        PALETTE.forEach((p, i) => {
            if (i === 0) return;
            const distance = (p.r - nr) ** 2 + (p.g - ng) ** 2 + (p.b - nb) ** 2;
            if (distance < bestDistance) [best, bestDistance] = [i, distance];
        });
        nearest.set(key, best);
    }
    return nearest.get(key);
}

// While a guide is on, the notes to play are lit in their own colour. The LUMI
// only shows lights sent from here in its single colour mode (its other modes
// paint over them), so meanwhile it is set to look like its piano mode: single
// colour, C major (the white keys) in a soft white. Its own settings come back after.
const SINGLE_MODE = 1;
const PIANO_WHITE = { r: 150, g: 150, b: 150 };
const LOOK = ["mode", "color", "rootColor", "scale", "key"];
const keysActive = () => state === "connected" && settings.lumiKeyLights && guideActive();
let guideLook = false;   // the piano look is what the LUMI was last told
let leavingGuide = false;
let modeSettlesAt = 0;   // a mode change repaints the keys: light them only after it
let lastStep = null;

function onLights() {
    if (state !== "connected") return;
    const active = keysActive();
    if (active !== guideLook) {
        guideLook = active;
        leavingGuide = !active;
        queue(...LOOK);
    }
    if (active) requestKeys();
    else if (lit.size) releaseKeys();
}

// Notes to play now that fall on the LUMI's keys
function notesToPlay() {
    const guide = currentGuide();
    const lo = lumiLowest(), hi = lo + lumiKeyCount() - 1;
    const notes = new Set();
    for (let midi = lo; midi <= hi; midi++) {
        if (guide?.midis?.has(midi) || guide?.strong?.has(pitchClass(midi))) notes.add(midi);
    }
    return notes;
}

const lightKey = (midi, colour) => {
    sendRaw([0x90, midi, colour]);
    sendRaw([0xa0, midi, 127]); // full brightness
};

function renderKeys() {
    frameRequested = false;
    if (!keysActive()) return;
    const wait = dirty.has("mode") ? 200 : modeSettlesAt - performance.now();
    if (wait > 0) {
        setTimeout(requestKeys, wait);
        return;
    }
    const colour = paletteIndex(hexToRgb(settings.lumiGuideColor));
    const wanted = notesToPlay();
    // A song moving on to the same note again: blink it so the step shows
    const step = currentGuide()?.midis ?? null;
    if (step && lastStep && step !== lastStep) {
        wanted.forEach(midi => {
            if (!lit.has(midi)) return;
            sendRaw([0x80, midi, 0]);
            lit.delete(midi);
        });
        lastStep = step;
        setTimeout(requestKeys, 90);
        return;
    }
    lastStep = step;
    // Switch off first, so a key that moves is never lit twice
    lit.forEach((_, midi) => {
        if (wanted.has(midi)) return;
        sendRaw([0x80, midi, 0]);
        lit.delete(midi);
    });
    wanted.forEach(midi => {
        if (lit.get(midi) === colour) return;
        lightKey(midi, colour);
        lit.set(midi, colour);
    });
}

// MIDI messages can get lost (Bluetooth especially): light the keys again now and then
setInterval(() => {
    if (keysActive()) lit.forEach((colour, midi) => lightKey(midi, colour));
}, 2000);

function requestKeys() {
    if (frameRequested || !keysActive()) return;
    frameRequested = true;
    requestAnimationFrame(renderKeys);
}

// Hand every key we lit back to the LUMI
function releaseKeys() {
    lit.forEach((_, midi) => sendRaw([0x80, midi, 0]));
    lit = new Map();
}

function sendRaw(message) {
    for (const output of outputs) {
        try {
            output.send(message);
        } catch (err) {
            console.warn("LUMI: could not send", err);
        }
    }
}

// === Ports ===

function refresh() {
    if (!settings.lumiEnabled) {
        outputs = [];
        return setState("off");
    }
    if (!navigator.requestMIDIAccess) return setState("unsupported");
    const access = midiAccess();
    if (!access) return setState("off");
    if (!access.sysexEnabled) return setState("denied");
    const before = outputs.map(o => o.id).join();
    outputs = [...access.outputs.values()].filter(o => /lumi/i.test(o.name) && o.state !== "disconnected");
    const changed = outputs.map(o => o.id).join() !== before;
    setState(outputs.length ? "connected" : "none");
    if (changed && outputs.length) {
        lit = new Map();
        guideLook = false;
        sendRaw([0xd0, 127]); // channel pressure: full brightness for the keys lit from here
        requestKeys();
    }
}

// Ask again, e.g. after the SysEx prompt was dismissed
export const retryLumi = () => connectMidi(true);

export function initLumi() {
    onMidiAccess(refresh);
    onGuideChange(onLights);
    setLumiRange(() => (state === "connected" || settings.lumiEnabled ? { lo: lumiLowest(), hi: lumiLowest() + lumiKeyCount() - 1 } : null));
    refresh();
}

// The settings sheet calls this after changing S.lumi.<key>
export function lumiSettingChanged(key) {
    onSettingChange({ enabled: "lumiEnabled", blocks: "lumiBlocks", octave: "lumiOctave", brightness: "lumiBrightness",
        restore: "lumiMode", restoreColor: "lumiColor", restoreRoot: "lumiRootColor", guide: "lumiKeyLights", color: "lumiGuideColor" }[key] ?? key);
}

function onSettingChange(key) {
    const map = {
        lumiBrightness: ["brightness"], lumiMode: ["mode"], lumiColor: ["color"], lumiRootColor: ["rootColor"],
        lumiOctave: ["octave"], scaleType: ["scale", "key"], scaleRoot: ["key"], lumiScaleSync: ["scale", "key"],
    };
    if (key === "lumiEnabled") {
        if (!settings.lumiEnabled) releaseKeys();
        outputs = [];
        // Switching it on is a click: a good moment to ask for the SysEx permission
        if (settings.lumiEnabled && navigator.requestMIDIAccess && !midiAccess()?.sysexEnabled) connectMidi(true);
        return refresh();
    }
    if (key === "lumiBlocks") return setState(state);
    if (key === "lumiKeyLights") onLights();
    if (key === "lumiGuideColor") requestKeys();
    if (key === "lumiOctave") {
        releaseKeys();
        requestKeys();
    }
    if (map[key]) queue(...map[key]);
}
