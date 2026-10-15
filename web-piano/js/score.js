// === Grand staff: what was played, chord by chord (VexFlow) ===
//
// Note lengths are written from the tempo setting: the time from one chord
// to the next is rounded to the nearest note value (16th to whole, dotted
// values included). A key let go well before the next chord leaves a rest.
// The chord being held grows on the staff while it is held.
// The whole performance can be opened in a dialog, line after line, and
// downloaded as an image (PNG or SVG) or a MIDI file.

import { subscribe } from "./piano.js?v=20261015b";
import { settings, onSettingChange } from "./settings.js?v=20261015b";
import { detectChord, scaleContext, spellPc, vexKey, pitchClass } from "./theory.js?v=20261015b";

const VEXFLOW_URL = "https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/esm/entry/vexflow.js";
// The music font as a data URL, embedded in exported images so they draw anywhere
const BRAVURA_URL = "https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/esm/src/fonts/bravura.js";
const CHORD_WINDOW_MS = 60; // notes struck closer together than this form one chord
const SPACING = 46;         // logical pixels per chord or rest
const LIVE_REFRESH_MS = 120; // redraw rate while the last chord is held
const REST_THRESHOLD = 0.5;  // beats of silence before a rest is written
const MAX_GROUPS = 3000;     // history kept for the whole score
const SYSTEM_HEIGHT = 190;   // logical height of one grand staff line

// Note values in beats (quarter note = 1): [beats, VexFlow duration, dots]
const VALUES = [
    [0.25, "16", 0], [0.5, "8", 0], [0.75, "8", 1], [1, "q", 0],
    [1.5, "q", 1], [2, "h", 0], [3, "h", 1], [4, "w", 0],
];
const SCREEN = { ink: "#e9dbc7", accent: "#44aca3", rest: "rgb(233 219 199 / 0.55)" };
const PAPER = { ink: "#141414", accent: "#141414", rest: "#6b6b6b", background: "#ffffff" };

let VF = null;
let container;
let groups = []; // { start, midis: Set, ends: Map midi -> release time | null }
let played = []; // every note and pedal move with its real timing, for the MIDI file
let drawQueued = false;
let liveTimer = null;
let fullView = null; // element showing the whole score while its dialog is open
const changeListeners = new Set();

// Nearest note value, compared on a log scale (a 3-beat note is closer to a
// dotted half than to a whole); anything longer than a whole stays a whole
function quantize(beats) {
    let best = VALUES[0];
    for (const value of VALUES) {
        if (Math.abs(Math.log2(beats / value[0])) < Math.abs(Math.log2(beats / best[0]))) best = value;
    }
    return best;
}

// Time when every note of a chord was let go, or null while one is still held
function releaseOf(group) {
    const ends = [...group.ends.values()];
    return ends.includes(null) ? null : Math.max(...ends);
}

// Turn the chords into a sequence of notes and rests with their values
function rhythm(now) {
    const beatMs = 60000 / settings.tempo;
    const items = [];
    groups.forEach((group, i) => {
        const next = groups[i + 1];
        const release = releaseOf(group) ?? now;
        if (!next) {
            items.push({ group, value: quantize((release - group.start) / beatMs) });
            return;
        }
        const silence = (next.start - release) / beatMs;
        if (silence >= REST_THRESHOLD) {
            items.push({ group, value: quantize((release - group.start) / beatMs) });
            items.push({ rest: true, value: quantize(silence) });
        } else {
            items.push({ group, value: quantize((next.start - group.start) / beatMs) });
        }
    });
    return items;
}

function spellGroup(midis) {
    const sorted = [...midis].sort((a, b) => a - b);
    const context = scaleContext(settings.scaleRoot, settings.scaleType);
    const chord = sorted.length >= 2 ? detectChord(sorted, context) : null;
    return sorted.map(midi => ({ midi, ...vexKey(midi, spellPc(pitchClass(midi), chord, context)) }));
}

function makeNote(notes, clef, color, [, duration, dots]) {
    if (!notes.length) return new VF.GhostNote({ duration, dots });
    const note = new VF.StaveNote({ keys: notes.map(n => n.key), duration, dots, clef, autoStem: true });
    notes.forEach((n, i) => n.accidental && note.addModifier(new VF.Accidental(n.accidental), i));
    if (dots) VF.Dot.buildAndAttach([note], { all: true });
    note.setStyle({ fillStyle: color, strokeStyle: color });
    // VexFlow draws ledger lines in dark grey by default: invisible on this background
    note.setLedgerLineStyle({ fillStyle: color, strokeStyle: color });
    return note;
}

function makeRest(clef, color, [, duration, dots]) {
    const rest = new VF.StaveNote({ keys: [clef === "treble" ? "b/4" : "d/3"], duration: `${duration}r`, dots, clef });
    if (dots) VF.Dot.buildAndAttach([rest], { all: true });
    rest.setStyle({ fillStyle: color, strokeStyle: color });
    return rest;
}

// One grand staff line (clefs, brace) with its notes and rests
function drawSystem(ctx, x, y, width, items, colors, highlight) {
    ctx.setFillStyle(colors.ink);
    ctx.setStrokeStyle(colors.ink);
    const treble = new VF.Stave(x, y, width).addClef("treble");
    const bass = new VF.Stave(x, y + 85, width).addClef("bass");
    treble.setContext(ctx).draw();
    bass.setContext(ctx).draw();
    new VF.StaveConnector(treble, bass).setType("brace").setContext(ctx).draw();
    new VF.StaveConnector(treble, bass).setType("singleLeft").setContext(ctx).draw();
    if (!items.length) return;

    const trebleNotes = [];
    const bassNotes = [];
    for (const item of items) {
        if (item.rest) {
            trebleNotes.push(makeRest("treble", colors.rest, item.value));
            bassNotes.push(makeRest("bass", colors.rest, item.value));
            continue;
        }
        const spelled = spellGroup(item.group.midis);
        const color = item.group === highlight ? colors.accent : colors.ink;
        trebleNotes.push(makeNote(spelled.filter(n => n.midi >= 60), "treble", color, item.value));
        bassNotes.push(makeNote(spelled.filter(n => n.midi < 60), "bass", color, item.value));
    }

    const room = treble.getNoteEndX() - treble.getNoteStartX() - 20;
    const voice = notes => new VF.Voice({ numBeats: 4 * items.length, beatValue: 4 })
        .setMode(VF.Voice.Mode.SOFT).addTickables(notes);
    const trebleVoice = voice(trebleNotes);
    const bassVoice = voice(bassNotes);
    new VF.Formatter()
        .joinVoices([trebleVoice])
        .joinVoices([bassVoice])
        .format([trebleVoice, bassVoice], Math.min(room, items.length * SPACING));
    trebleVoice.draw(ctx, treble);
    bassVoice.draw(ctx, bass);
}

// How many notes or rests fit on a line of this logical width
function lineCapacity(width) {
    const probe = new VF.Stave(0, 0, width).addClef("treble");
    return Math.max(1, Math.floor((probe.getNoteEndX() - probe.getNoteStartX() - 20) / SPACING));
}

// Every line of the score, filled from the first chord
function splitLines(items, perLine) {
    const lines = [];
    for (let i = 0; i < items.length; i += perLine) lines.push(items.slice(i, i + perLine));
    return lines.length ? lines : [[]];
}

function draw() {
    drawQueued = false;
    if (!VF) return;
    const items = rhythm(performance.now());
    scheduleLiveRefresh();
    if (fullView) drawFull(items);
    if (!settings.showStaff) return;
    const width = container.clientWidth;
    if (!width) return;
    const scale = width < 600 ? 0.72 : 0.85;
    const logicalWidth = width / scale;

    container.replaceChildren();
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(width, Math.round(SYSTEM_HEIGHT * scale));
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);
    // Only the latest chords fit: older ones scroll off to the left
    const visible = items.slice(-lineCapacity(logicalWidth - 32));
    drawSystem(ctx, 16, 0, logicalWidth - 32, visible, SCREEN, groups[groups.length - 1]);
}

// The whole score, line after line, in the dialog
function drawFull(items) {
    const width = fullView.clientWidth;
    if (!width) return;
    const scale = width < 600 ? 0.72 : 0.85;
    const logicalWidth = width / scale;
    const lines = splitLines(items, lineCapacity(logicalWidth - 32));
    const atBottom = fullView.scrollHeight - fullView.scrollTop - fullView.clientHeight < 40;

    const page = document.createElement("div");
    const renderer = new VF.Renderer(page, VF.Renderer.Backends.SVG);
    renderer.resize(width, Math.round((lines.length * SYSTEM_HEIGHT + 10) * scale));
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);
    lines.forEach((line, i) => drawSystem(ctx, 16, i * SYSTEM_HEIGHT, logicalWidth - 32, line, SCREEN, groups[groups.length - 1]));
    fullView.replaceChildren(page);
    // Follow the playing when the reader is already at the end
    if (atBottom) fullView.scrollTop = fullView.scrollHeight;
}

// Keep redrawing while the last chord is held, so it grows on the staff
function scheduleLiveRefresh() {
    clearTimeout(liveTimer);
    const last = groups[groups.length - 1];
    if (last && releaseOf(last) === null) liveTimer = setTimeout(queueDraw, LIVE_REFRESH_MS);
}

function queueDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(draw);
}

// What the staff currently shows, as text (handy to check it from the console)
export function staffSnapshot() {
    return rhythm(performance.now()).map(item => item.rest
        ? `rest:${item.value[1]}${"d".repeat(item.value[2])}`
        : `${spellGroup(item.group.midis).map(n => n.key).join("+")}:${item.value[1]}${"d".repeat(item.value[2])}`);
}

export function clearScore() {
    groups = [];
    played = [];
    queueDraw();
    notifyChange();
}

// === Whole score and downloads ===

export function hasScore() {
    return groups.length > 0;
}

// Called when the score goes from empty to played (and back)
export function onScoreChange(fn) {
    changeListeners.add(fn);
}

function notifyChange() {
    changeListeners.forEach(fn => fn(hasScore()));
}

const fullObserver = new ResizeObserver(() => queueDraw());

export function showFullScore(element) {
    fullView = element;
    fullObserver.observe(element);
    queueDraw();
}

export function hideFullScore() {
    if (fullView) fullObserver.unobserve(fullView);
    fullView = null;
}

function fileName(extension) {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `web-piano-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.${extension}`;
}

function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// The score in black on white, as standalone SVG markup with its font inside
async function paperSvg() {
    const { Bravura } = await import(BRAVURA_URL);
    const logicalWidth = 1000;
    const margin = 30;
    const lines = splitLines(rhythm(performance.now()), lineCapacity(logicalWidth - margin * 2));
    const height = margin * 2 + lines.length * SYSTEM_HEIGHT;

    const page = document.createElement("div");
    const renderer = new VF.Renderer(page, VF.Renderer.Backends.SVG);
    renderer.resize(logicalWidth, height);
    const ctx = renderer.getContext();
    lines.forEach((line, i) => drawSystem(ctx, margin, margin + i * SYSTEM_HEIGHT, logicalWidth - margin * 2, line, PAPER, null));

    const svg = page.querySelector("svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("viewBox", `0 0 ${logicalWidth} ${height}`);
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `@font-face { font-family: "Bravura"; src: url("${Bravura}") format("woff2"); }`;
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    Object.entries({ width: "100%", height: "100%", fill: PAPER.background }).forEach(([k, v]) => background.setAttribute(k, v));
    svg.prepend(style, background);
    return { markup: new XMLSerializer().serializeToString(svg), width: logicalWidth, height };
}

export async function exportSvg() {
    if (!VF || !hasScore()) return;
    const { markup } = await paperSvg();
    download(new Blob([markup], { type: "image/svg+xml" }), fileName("svg"));
}

export async function exportPng() {
    if (!VF || !hasScore()) return;
    const { markup, width, height } = await paperSvg();
    const image = new Image();
    image.src = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
    await image.decode();
    // Give the embedded font a moment to apply inside the image
    await new Promise(resolve => setTimeout(resolve, 50));
    const ratio = 2;
    const canvas = Object.assign(document.createElement("canvas"), { width: width * ratio, height: height * ratio });
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(image.src);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    download(blob, fileName("png"));
}

// Standard MIDI file (format 0) of what was played, with its real timing
function midiFile() {
    const PPQ = 480;
    const beatMs = 60000 / settings.tempo;
    const origin = played.length ? played[0].time : 0;
    const now = performance.now();
    const events = [];
    for (const e of played) {
        const tick = time => Math.round(((time ?? now) - origin) / beatMs * PPQ);
        if (e.type === "note") {
            events.push({ tick: tick(e.time), order: 1, bytes: [0x90, e.midi, Math.max(1, e.velocity)] });
            events.push({ tick: tick(e.end), order: 0, bytes: [0x80, e.midi, 0] });
        } else {
            events.push({ tick: tick(e.time), order: 0, bytes: [0xb0, 64, e.down ? 127 : 0] });
        }
    }
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);

    const varLen = n => {
        const out = [n & 0x7f];
        while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
        return out;
    };
    const tempo = Math.round(beatMs * 1000);
    const track = [0, 0xff, 0x51, 3, (tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff];
    let last = 0;
    for (const e of events) {
        track.push(...varLen(e.tick - last), ...e.bytes);
        last = e.tick;
    }
    track.push(0, 0xff, 0x2f, 0);

    const u32 = n => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
    const header = [0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, PPQ >> 8, PPQ & 0xff];
    return new Uint8Array([...header, 0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), ...track]);
}

export function exportMidi() {
    if (!hasScore()) return;
    download(new Blob([midiFile()], { type: "audio/midi" }), fileName("mid"));
}

function applyVisibility() {
    document.body.classList.toggle("staff-hidden", !settings.showStaff);
    queueDraw();
}

export async function initScore(element) {
    container = element;
    applyVisibility();
    new ResizeObserver(queueDraw).observe(container);
    try {
        VF = await import(VEXFLOW_URL);
        await document.fonts.load("30px Bravura").catch(() => {});
        queueDraw();
    } catch (err) {
        // Offline or CDN down: the piano works without the staff
        console.warn("Staff unavailable:", err);
        document.body.classList.add("staff-unavailable");
    }
}

subscribe(event => {
    if (event.type === "on") {
        const wasEmpty = !hasScore();
        played.push({ type: "note", midi: event.midi, velocity: event.velocity, time: event.time, end: null });
        const last = groups[groups.length - 1];
        if (last && event.time - last.start < CHORD_WINDOW_MS) {
            last.midis.add(event.midi);
            last.ends.set(event.midi, null);
        } else {
            groups.push({ start: event.time, midis: new Set([event.midi]), ends: new Map([[event.midi, null]]) });
            if (groups.length > MAX_GROUPS) {
                groups.shift();
                played = played.filter(e => e.time >= groups[0].start);
            }
        }
        queueDraw();
        if (wasEmpty) notifyChange();
    } else if (event.type === "off") {
        // The most recent chord still holding this note
        for (let i = groups.length - 1; i >= 0; i--) {
            if (groups[i].ends.get(event.midi) === null) {
                groups[i].ends.set(event.midi, event.time);
                break;
            }
        }
        for (let i = played.length - 1; i >= 0; i--) {
            if (played[i].midi === event.midi && played[i].end === null) {
                played[i].end = event.time;
                break;
            }
        }
        queueDraw();
    } else if (event.type === "pedal" && hasScore()) {
        played.push({ type: "pedal", down: event.down, time: performance.now() });
    }
});

onSettingChange(key => {
    if (key === "showStaff") applyVisibility();
    if (key === "scaleRoot" || key === "scaleType" || key === "tempo") queueDraw();
});
