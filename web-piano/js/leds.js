// === ESP32 LED strip, driven over a WebSocket ===
//
// Protocol understood by the ESP32 firmware: "SET <led> <r> <g> <b>" and "OFF <led>".
// Instead of sending commands note by note (which let one note's "OFF" wipe a
// neighbour still lit by a ripple), every frame computes the colour each LED
// should have and only sends the LEDs that changed.

import { subscribe, soundingNotes, noteInfo, LOWEST, HIGHEST } from "./piano.js?v=20261014b";
import { settings, onSettingChange } from "./settings.js?v=20261014b";
import { noteColor, hsvToRgb, scaleColor } from "./colors.js?v=20261014b";
import { scaleNotes, pitchClass } from "./theory.js?v=20261014b";

// LED index under each key, A0 to C8, measured on the strip (two LEDs per key)
const NOTE_TO_LED = [
    176, 174, 172, 170, 168, 166, 164, 162, 160, 158, 156, 154,
    152, 150, 148, 146, 144, 142, 140, 138, 136, 134, 132, 130,
    128, 126, 124, 122, 120, 118, 116, 114, 112, 110, 108, 106,
    104, 102, 100, 98, 96, 94, 92, 90, 88, 86, 84, 82,
    80, 78, 76, 74, 72, 71, 69, 67, 65, 63, 61, 59,
    57, 55, 53, 51, 49, 47, 45, 43, 41, 39, 37, 35,
    33, 31, 29, 27, 25, 23, 21, 19, 17, 15, 13, 11,
    9, 7, 5, 3,
];

const RIPPLE = { reach: 10, msPerKey: 30, decay: 0.6, life: 700 };
const SCALE_GLOW = 0.12; // share of the brightness used for the scale guide

let socket = null;
let state = "off"; // off | connecting | connected | failed
const stateListeners = new Set();
let sent = new Map();    // led -> "r g b" last sent
let ripples = [];        // { midi, start, velocity }
let flashUntil = 0;      // hello sweep when the strip connects
let frameRequested = false;

export const ledState = () => state;
export const onLedState = fn => stateListeners.add(fn);

function setState(next) {
    state = next;
    stateListeners.forEach(fn => fn(state));
}

const maxChannel = (a, b) => ({ r: Math.max(a.r, b.r), g: Math.max(a.g, b.g), b: Math.max(a.b, b.b) });

function computeFrame(now) {
    const frame = new Map(); // midi -> {r,g,b}
    const add = (midi, color) => {
        if (midi < LOWEST || midi > HIGHEST) return;
        frame.set(midi, frame.has(midi) ? maxChannel(frame.get(midi), color) : color);
    };
    const intensity = settings.ledIntensity;

    if (now < flashUntil) {
        for (let m = LOWEST; m <= HIGHEST; m++) add(m, hsvToRgb((m - LOWEST) / 88, 1, 0.1));
        return frame;
    }

    // Scale guide: every note of the scale glows softly
    const scale = new Set(scaleNotes(settings.scaleRoot, settings.scaleType).map(n => n.pc));
    if (scale.size) {
        for (let m = LOWEST; m <= HIGHEST; m++) {
            if (scale.has(pitchClass(m))) add(m, scaleColor(noteColor(m, settings.colorMode), intensity * SCALE_GLOW));
        }
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

function render() {
    frameRequested = false;
    if (state !== "connected") return;
    const now = performance.now();
    const frame = computeFrame(now);
    for (let midi = LOWEST; midi <= HIGHEST; midi++) {
        const led = NOTE_TO_LED[midi - LOWEST];
        const c = frame.get(midi);
        const value = c && (c.r || c.g || c.b) ? `${c.r} ${c.g} ${c.b}` : null;
        if ((sent.get(led) ?? null) === value) continue;
        socket.send(value ? `SET ${led} ${value}` : `OFF ${led}`);
        if (value) sent.set(led, value);
        else sent.delete(led);
    }
    if (ripples.length || now < flashUntil + 50) requestFrame();
}

function requestFrame() {
    if (frameRequested || state !== "connected") return;
    frameRequested = true;
    requestAnimationFrame(render);
}

// === Connection ===

function url() {
    const host = settings.ledHost.trim().replace(/^wss?:\/\//, "");
    return `${location.protocol === "https:" ? "wss" : "ws"}://${host}`;
}

export function connectLeds() {
    disconnectLeds(false);
    if (!settings.ledHost.trim()) return setState("failed");
    setState("connecting");
    try {
        socket = new WebSocket(url());
    } catch {
        socket = null;
        return setState("failed");
    }
    const ws = socket;
    ws.onopen = () => {
        if (ws !== socket) return;
        sent = new Map();
        // Start from a known state: everything off, then a short hello sweep
        NOTE_TO_LED.forEach(led => ws.send(`OFF ${led}`));
        flashUntil = performance.now() + 500;
        setState("connected");
        requestFrame();
    };
    ws.onclose = () => {
        if (ws !== socket) return;
        socket = null;
        setState(state === "connected" ? "off" : "failed");
    };
    ws.onerror = () => {}; // onclose follows and carries the outcome
}

export function disconnectLeds(update = true) {
    if (socket) {
        const ws = socket;
        socket = null;
        if (ws.readyState === WebSocket.OPEN) NOTE_TO_LED.forEach(led => ws.send(`OFF ${led}`));
        ws.close();
    }
    sent = new Map();
    if (update) setState("off");
}

export function initLeds() {
    if (settings.ledEnabled) connectLeds();
}

subscribe(event => {
    if (state !== "connected") return;
    if (event.type === "on" && settings.ledEffect === "ripple") {
        ripples.push({ midi: event.midi, start: performance.now(), velocity: event.velocity });
    }
    requestFrame();
});

onSettingChange((key, value) => {
    if (key === "ledEnabled") value ? connectLeds() : disconnectLeds();
    if (key === "ledHost" && settings.ledEnabled) connectLeds();
    if (["ledIntensity", "colorMode", "scaleRoot", "scaleType"].includes(key)) requestFrame();
});
