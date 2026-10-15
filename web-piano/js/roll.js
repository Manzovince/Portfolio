// === Piano roll (notes rising from the keys) and note-usage histogram ===

import { subscribe } from "./piano.js?v=20261015d";
import { settings, onSettingChange } from "./settings.js?v=20261015d";
import { keyGeometry, onKeyboardLayout } from "./keyboard.js?v=20261015d";
import { noteColor, rgbString } from "./colors.js?v=20261015d";

const SPEED = 0.09;     // CSS pixels per millisecond
const MAX_NOTES = 2000;

let rollCanvas, rollCtx, usageCanvas, usageCtx;
let geometry = new Map();
let timeline = [];      // { midi, velocity, start, end }
let usage = new Array(128).fill(0);
let running = false;

// Match the canvas backing store to its CSS size and the screen density
function fit(canvas, ctx) {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    ctx.fill();
}

// === Roll ===

let rollSize = { width: 0, height: 0 };
let rollLeft = 0;

function drawRoll() {
    const now = performance.now();
    const { width, height } = rollSize;
    rollCtx.clearRect(0, 0, width, height);

    // Faint guide line at every C, to read the octaves
    rollCtx.fillStyle = "rgb(233 219 199 / 0.04)";
    geometry.forEach((g, midi) => {
        if (midi % 12 === 0) rollCtx.fillRect(Math.round(g.x - rollLeft), 0, 1, height);
    });

    // Drop notes that scrolled off the top
    timeline = timeline.filter(n => n.end === null || height - (now - n.end) * SPEED > 0);

    for (const n of timeline) {
        const g = geometry.get(n.midi);
        if (!g) continue;
        const top = height - (now - n.start) * SPEED;
        const bottom = height - (n.end === null ? 0 : (now - n.end) * SPEED);
        const inset = g.black ? 1 : Math.max(1, g.w * 0.12);
        rollCtx.fillStyle = rgbString(noteColor(n.midi, settings.colorMode), 0.35 + 0.55 * n.velocity / 127);
        roundRect(rollCtx, g.x - rollLeft + inset, top, g.w - inset * 2, Math.max(2, bottom - top), 3);
    }
    return timeline.length > 0;
}

function loop() {
    const busy = settings.showRoll && drawRoll();
    if (busy) requestAnimationFrame(loop);
    else running = false;
}

function wake() {
    if (running || !settings.showRoll) return;
    running = true;
    requestAnimationFrame(loop);
}

// === Usage histogram ===

let usageSize = { width: 0, height: 0 };

function drawUsage() {
    if (!settings.showUsage) return;
    const { width, height } = usageSize;
    const left = usageCanvas.getBoundingClientRect().left;
    usageCtx.clearRect(0, 0, width, height);
    const max = Math.max(1, ...usage);
    geometry.forEach((g, midi) => {
        if (!usage[midi]) return;
        const h = Math.max(2, (usage[midi] / max) * (height - 4));
        const inset = g.black ? 1 : Math.max(1, g.w * 0.18);
        usageCtx.fillStyle = rgbString(noteColor(midi, settings.colorMode), g.black ? 0.55 : 0.8);
        roundRect(usageCtx, g.x - left + inset, height - h, g.w - inset * 2, h, 2);
    });
}

export function resetUsage() {
    usage.fill(0);
    drawUsage();
}

// === Layout ===

function relayout() {
    geometry = keyGeometry();
    rollSize = fit(rollCanvas, rollCtx);
    rollLeft = rollCanvas.getBoundingClientRect().left;
    usageSize = fit(usageCanvas, usageCtx);
    drawRoll();
    drawUsage();
    wake();
}

function applyVisibility() {
    rollCanvas.hidden = !settings.showRoll;
    usageCanvas.hidden = !settings.showUsage;
    relayout();
}

export function initRoll(roll, usageEl) {
    rollCanvas = roll;
    rollCtx = roll.getContext("2d");
    usageCanvas = usageEl;
    usageCtx = usageEl.getContext("2d");
    onKeyboardLayout(relayout);
    new ResizeObserver(relayout).observe(roll);
    applyVisibility();
}

export function clearRoll() {
    timeline = timeline.filter(n => n.end === null);
}

subscribe(event => {
    if (event.type === "on") {
        timeline.push({ midi: event.midi, velocity: event.velocity, start: event.time, end: null });
        if (timeline.length > MAX_NOTES) timeline.splice(0, timeline.length - MAX_NOTES);
        usage[event.midi]++;
        drawUsage();
        wake();
    } else if (event.type === "off") {
        for (let i = timeline.length - 1; i >= 0; i--) {
            if (timeline[i].midi === event.midi && timeline[i].end === null) {
                timeline[i].end = event.time;
                break;
            }
        }
    }
});

onSettingChange(key => {
    if (key === "showRoll" || key === "showUsage") applyVisibility();
    if (key === "colorMode") {
        drawUsage();
        wake();
    }
});
