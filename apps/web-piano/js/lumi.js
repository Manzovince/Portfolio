// === ROLI LUMI Keys: lighting settings over MIDI SysEx ===
//
// The LUMI lights the keys being played by itself. From the computer we can
// only change its global settings: colour mode, brightness, key and root
// colours, scale, key and octave. No known message colours a single key.
// The protocol is the reverse-engineered one from github.com/benob/LUMI-lights.

import { settings, onSettingChange } from "./settings.js?v=20261101a";
import { midiAccess, onMidiAccess, connectMidi } from "./midi.js?v=20261101a";

const ROLI = [0x00, 0x21, 0x10];
const LUMI_ID = 0x37;
const KEYS_PER_BLOCK = 24;

// LUMI scale numbers for the app's scales; no scale chosen = chromatic
const LUMI_SCALES = { major: 0, minor: 1, harmonicMinor: 2, majorPentatonic: 4, minorPentatonic: 5, blues: 6, dorian: 7, mixolydian: 10 };
const CHROMATIC = 18;
export const LUMI_MODES = ["rainbow", "single", "piano", "night"];

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
        case "mode": return COMMANDS.mode(Math.max(0, LUMI_MODES.indexOf(settings.lumiMode)));
        case "color": return COMMANDS.color(0, hexToRgb(settings.lumiColor));
        case "rootColor": return COMMANDS.color(1, hexToRgb(settings.lumiRootColor));
        case "scale": return COMMANDS.scale(LUMI_SCALES[settings.scaleType] ?? CHROMATIC);
        case "key": return COMMANDS.key(settings.scaleRoot);
        case "octave": return COMMANDS.octave(settings.lumiOctave);
    }
}

// === Sending ===

function send(bytes) {
    const message = [0xf0, ...ROLI, 0x77, LUMI_ID, ...bytes, checksum(bytes), 0xf7];
    for (const output of outputs) {
        try {
            output.send(message);
        } catch (err) {
            console.warn("LUMI: could not send", err);
        }
    }
}

// Sliders fire often: gather changes and send them together
function queue(...names) {
    if (state !== "connected") return;
    names.forEach(name => {
        if ((name === "scale" || name === "key") && !settings.lumiScaleSync) return;
        dirty.add(name);
    });
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
        dirty.forEach(name => send(commandFor(name)));
        dirty.clear();
    }, 40);
}

const pushAll = () => queue("mode", "brightness", "color", "rootColor", "octave", "scale", "key");

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
    if (changed && outputs.length) pushAll();
}

// Ask again, e.g. after the SysEx prompt was dismissed
export const retryLumi = () => connectMidi(true);

export function initLumi() {
    onMidiAccess(refresh);
    refresh();
}

onSettingChange(key => {
    const map = {
        lumiBrightness: ["brightness"], lumiMode: ["mode"], lumiColor: ["color"], lumiRootColor: ["rootColor"],
        lumiOctave: ["octave"], scaleType: ["scale", "key"], scaleRoot: ["key"], lumiScaleSync: ["scale", "key"],
    };
    if (key === "lumiEnabled") {
        outputs = [];
        // Switching it on is a click: a good moment to ask for the SysEx permission
        if (settings.lumiEnabled && navigator.requestMIDIAccess && !midiAccess()?.sysexEnabled) connectMidi(true);
        return refresh();
    }
    if (key === "lumiBlocks") return setState(state);
    if (map[key]) queue(...map[key]);
});
