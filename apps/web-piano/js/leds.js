// === ESP32 LED strip, driven over a WebSocket ===
//
// Protocol understood by the ESP32 firmware: "SET <led> <r> <g> <b>" and "OFF <led>".
// Frames come from lights.js; only the LEDs that changed are sent.

import { settings, onSettingChange } from "./settings.js?v=20261101b";
import { computeFrame, lightsAnimating, onLightsChange } from "./lights.js?v=20261101b";
import { LOWEST, HIGHEST } from "./piano.js?v=20261101b";

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

let socket = null;
let state = "off"; // off | connecting | connected | failed
const stateListeners = new Set();
let sent = new Map();    // led -> "r g b" last sent
let flashUntil = 0;      // hello sweep when the strip connects
let frameRequested = false;

export const ledState = () => state;
export const onLedState = fn => stateListeners.add(fn);

function setState(next) {
    state = next;
    stateListeners.forEach(fn => fn(state));
}

function render() {
    frameRequested = false;
    if (state !== "connected") return;
    const now = performance.now();
    const frame = computeFrame(now, { intensity: settings.ledIntensity, hello: now < flashUntil });
    for (let midi = LOWEST; midi <= HIGHEST; midi++) {
        const led = NOTE_TO_LED[midi - LOWEST];
        const c = frame.get(midi);
        const value = c && (c.r || c.g || c.b) ? `${c.r} ${c.g} ${c.b}` : null;
        if ((sent.get(led) ?? null) === value) continue;
        socket.send(value ? `SET ${led} ${value}` : `OFF ${led}`);
        if (value) sent.set(led, value);
        else sent.delete(led);
    }
    if (lightsAnimating(now) || now < flashUntil + 50) requestFrame();
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

onLightsChange(requestFrame);

onSettingChange((key, value) => {
    if (key === "ledEnabled") value ? connectLeds() : disconnectLeds();
    if (key === "ledHost" && settings.ledEnabled) connectLeds();
    if (key === "ledIntensity") requestFrame();
});
