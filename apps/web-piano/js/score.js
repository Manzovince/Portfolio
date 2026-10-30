// === Grand staff: what was played, chord by chord (VexFlow) ===
//
// Note lengths are written from the tempo setting: the time from one chord
// to the next is rounded to the nearest note value (16th to whole, dotted
// values included). A key let go well before the next chord leaves a rest.
// The result is cut into 4/4 measures, with ties over the bar lines.
// The chord being held grows on the staff while it is held.
// The whole performance can be opened in a dialog, line after line, and
// downloaded as an image (PNG or SVG) or a MIDI file.
// When a MIDI file is open, the staff shows that song instead, with its own
// rhythm and time signature, and turns its lines as the song plays.

import { subscribe } from "./piano.js?v=20261018a";
import { settings, onSettingChange } from "./settings.js?v=20261018a";
import { detectChord, scaleContext, spellPc, vexKey, pitchClass } from "./theory.js?v=20261018a";
import { currentSong, onSongChange, onSongPosition } from "./song.js?v=20261018a";

const VEXFLOW_URL = "https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/esm/entry/vexflow.js";
// The music font as a data URL, embedded in exported images so they draw anywhere
const BRAVURA_URL = "https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/esm/src/fonts/bravura.js";
const CHORD_WINDOW_MS = 60; // notes struck closer together than this form one chord
const SPACING = 46;         // logical pixels per chord or rest
const LIVE_REFRESH_MS = 120; // redraw rate while the last chord is held
const REST_THRESHOLD = 0.5;  // beats of silence before a rest is written
const MAX_GROUPS = 3000;     // history kept for the whole score
const SYSTEM_HEIGHT = 190;   // logical height of one grand staff line
const MIN_MEASURE = 90;      // logical pixels for the notes of a short measure

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
let fullStale = true; // the whole score needs drawing again (not just the song cursor)
let songCursor = null; // chord of the song being played
let songLayout = null; // the song cut into lines, for one staff width
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

// Time signature: the song's, or 4/4 for what is played
function meter() {
    const [count, unit] = currentSong()?.timeSignature ?? [4, 4];
    return { text: `${count}/${unit}`, beats: count * 4 / unit };
}

// A song's rhythm comes from the file: chord starts are on a sixteenth grid,
// lengths are kept exactly (the bar lines split them into tied values)
function songRhythm(songGroups) {
    const grid = beats => Math.round(beats * 4) / 4;
    const items = [];
    if (songGroups[0].start > 0) items.push({ rest: true, value: [songGroups[0].start] });
    songGroups.forEach((group, i) => {
        const next = songGroups[i + 1];
        const sounding = Math.max(0.25, grid(Math.max(...group.ends.values()) - group.start));
        if (!next) return items.push({ group, value: [sounding] });
        const gap = next.start - group.start;
        if (gap - sounding >= 0.25) {
            items.push({ group, value: [sounding] });
            items.push({ rest: true, value: [gap - sounding] });
        } else {
            items.push({ group, value: [gap] });
        }
    });
    return items;
}

// Turn the chords into a sequence of notes and rests with their values
function rhythm(now) {
    if (currentSong()) return songRhythm(currentSong().groups);
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

// === Measures ===

// A length in beats written as note values that exist (2.5 beats = half + eighth)
function splitValue(beats) {
    const out = [];
    let left = beats;
    while (left > 0.001) {
        const value = VALUES.findLast(v => v[0] <= left + 0.001) ?? VALUES[0];
        out.push(value);
        left -= value[0];
    }
    return out;
}

// Cut the sequence into 4/4 measures. A note that crosses a bar line is split
// and tied over it; a rest is simply split.
function measures(items) {
    const BEATS_PER_MEASURE = meter().beats;
    const bars = [[]];
    let position = 0;
    let previous = null;
    for (const item of items) {
        let left = item.value[0];
        let first = true;
        while (left > 0.001) {
            const chunk = Math.min(left, BEATS_PER_MEASURE - position);
            for (const value of splitValue(chunk)) {
                const piece = { group: item.group, rest: item.rest, value, tied: !first && !item.rest, tieNext: false };
                if (piece.tied) previous.tieNext = true;
                bars[bars.length - 1].push(piece);
                previous = piece;
                first = false;
            }
            left -= chunk;
            position += chunk;
            if (position > BEATS_PER_MEASURE - 0.001) {
                position = 0;
                bars.push([]);
            }
        }
    }
    if (bars.length > 1 && !bars[bars.length - 1].length) bars.pop();
    return bars;
}

// Room taken by the clef and time signature at the start of a measure
const headerCache = new Map();
function headerWidth(clef, time) {
    const key = `${clef}${time}${meter().text}`;
    if (!headerCache.has(key)) {
        const probe = new VF.Stave(0, 0, 500);
        if (clef) probe.addClef("treble");
        if (time) probe.addTimeSignature(meter().text);
        headerCache.set(key, probe.getNoteStartX());
    }
    return headerCache.get(key);
}

function notesWidth(bar) {
    return Math.max(MIN_MEASURE, bar.length * SPACING + 10);
}

// Measures of the score grouped in lines no wider than `width`
function layoutLines(bars, width) {
    const lines = [];
    let line = [];
    let used = 0;
    bars.forEach((bar, index) => {
        let entry = { bar, index, width: headerWidth(!line.length, index === 0) + notesWidth(bar) };
        if (line.length && used + entry.width > width) {
            lines.push(line);
            line = [];
            used = 0;
            entry = { bar, index, width: headerWidth(true, index === 0) + notesWidth(bar) };
        }
        entry.width = Math.min(entry.width, width);
        line.push(entry);
        used += entry.width;
    });
    lines.push(line);
    return lines;
}

// Stretch a full line to the given width
function justify(line, width) {
    const total = line.reduce((sum, entry) => sum + entry.width, 0);
    line.forEach(entry => (entry.width *= width / total));
}

// The last measures that fit in one line, for the staff above the keyboard
function lastMeasures(bars, width) {
    const line = [];
    let used = 0;
    for (let index = bars.length - 1; index >= 0; index--) {
        const w = notesWidth(bars[index]) + 10;
        if (line.length && used + w + headerWidth(true, index === 0) > width) break;
        line.unshift({ bar: bars[index], index, width: w });
        used += w;
    }
    line[0].width = Math.min(width, line[0].width + headerWidth(true, line[0].index === 0));
    return line;
}

// === Drawing ===

// Accidentals hold until the bar line: only write the ones that change
function makeNote(notes, clef, color, [, duration, dots], accidentals, tied) {
    if (!notes.length) return new VF.GhostNote({ duration, dots });
    const note = new VF.StaveNote({ keys: notes.map(n => n.key), duration, dots, clef, autoStem: true });
    notes.forEach((n, i) => {
        const place = n.key.replace(/[#bn]+/, "");
        if (tied || (accidentals.get(place) ?? "") === n.accidental) return;
        accidentals.set(place, n.accidental);
        note.addModifier(new VF.Accidental(n.accidental || "n"), i);
    });
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

function tie(ctx, first, last, color) {
    const note = first ?? last;
    if (!(note instanceof VF.StaveNote)) return;
    const indexes = note.getKeys().map((_, i) => i);
    new VF.StaveTie({ firstNote: first, lastNote: last, firstIndexes: indexes, lastIndexes: indexes })
        .setStyle({ fillStyle: color, strokeStyle: color })
        .setContext(ctx).draw();
}

// One line of grand staff: clefs and brace, then its measures.
// `ending` is the bar line after the last measure: "open" (still being
// played, the staff runs on to the edge), "end" (final double bar) or "bar".
function drawLine(ctx, x, y, width, line, { colors, highlight, ending }) {
    ctx.setFillStyle(colors.ink);
    ctx.setStrokeStyle(colors.ink);
    const placed = []; // { piece, treble, bass } in playing order
    let left = x;

    line.forEach((entry, i) => {
        const isFirst = i === 0;
        const isLast = i === line.length - 1;
        const w = isLast && ending === "open" ? x + width - left : entry.width;
        const treble = new VF.Stave(left, y, w);
        const bass = new VF.Stave(left, y + 85, w);
        for (const [stave, clef] of [[treble, "treble"], [bass, "bass"]]) {
            if (isFirst) stave.addClef(clef);
            if (entry.index === 0) stave.addTimeSignature(meter().text);
            if (!isFirst) stave.setBegBarType(VF.BarlineType.NONE);
            if (isLast && ending === "open") stave.setEndBarType(VF.BarlineType.NONE);
            if (isLast && ending === "end") stave.setEndBarType(VF.BarlineType.END);
            stave.setContext(ctx).draw();
        }
        if (isFirst) {
            new VF.StaveConnector(treble, bass).setType("brace").setContext(ctx).draw();
            new VF.StaveConnector(treble, bass).setType("singleLeft").setContext(ctx).draw();
        }
        if (!(isLast && ending === "open")) {
            new VF.StaveConnector(treble, bass).setType(isLast && ending === "end" ? "boldDoubleRight" : "singleRight")
                .setContext(ctx).draw();
        }
        left += w;
        if (!entry.bar.length) return;

        const accidentals = new Map();
        const trebleNotes = [];
        const bassNotes = [];
        for (const piece of entry.bar) {
            if (piece.rest) {
                trebleNotes.push(makeRest("treble", colors.rest, piece.value));
                bassNotes.push(makeRest("bass", colors.rest, piece.value));
            } else {
                const spelled = spellGroup(piece.group.midis);
                const color = piece.group === highlight ? colors.accent : colors.ink;
                trebleNotes.push(makeNote(spelled.filter(n => n.midi >= 60), "treble", color, piece.value, accidentals, piece.tied));
                bassNotes.push(makeNote(spelled.filter(n => n.midi < 60), "bass", color, piece.value, accidentals, piece.tied));
            }
            placed.push({ piece, treble: trebleNotes.at(-1), bass: bassNotes.at(-1) });
        }

        const voice = notes => new VF.Voice({ numBeats: meter().beats, beatValue: 4 })
            .setMode(VF.Voice.Mode.SOFT).addTickables(notes);
        const trebleVoice = voice(trebleNotes);
        const bassVoice = voice(bassNotes);
        const room = treble.getNoteEndX() - treble.getNoteStartX() - 10;
        new VF.Formatter()
            .joinVoices([trebleVoice])
            .joinVoices([bassVoice])
            // Spread the notes over the measure, except in the open one still being played
            .format([trebleVoice, bassVoice], isLast && ending === "open" ? Math.min(room, notesWidth(entry.bar) - 10) : room);
        trebleVoice.draw(ctx, treble);
        bassVoice.draw(ctx, bass);
    });

    // Ties, including the halves that continue on the next or previous line
    placed.forEach(({ piece, treble, bass }, i) => {
        const next = placed[i + 1];
        const color = piece.group === highlight ? colors.accent : colors.ink;
        if (piece.tieNext) {
            tie(ctx, treble, next?.treble, color);
            tie(ctx, bass, next?.bass, color);
        }
        if (piece.tied && i === 0) {
            tie(ctx, undefined, treble, color);
            tie(ctx, undefined, bass, color);
        }
    });
}

function draw() {
    drawQueued = false;
    if (!VF) return;
    const song = currentSong();
    const bars = song ? null : measures(rhythm(performance.now()));
    scheduleLiveRefresh();
    if (fullView && fullStale) drawFull(bars ?? measures(rhythm()));
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
    if (song) {
        // The line of the song being played, turned like a page
        const { lines, lineOf } = layoutSong(logicalWidth - 32);
        const index = lineOf.get(songCursor) ?? 0;
        drawLine(ctx, 16, 0, logicalWidth - 32, lines[index], {
            colors: SCREEN, highlight: songCursor, ending: index === lines.length - 1 ? "end" : "bar",
        });
        return;
    }
    // Only the latest measures fit: older ones scroll off to the left
    const line = lastMeasures(bars, logicalWidth - 32);
    drawLine(ctx, 16, 0, logicalWidth - 32, line, { colors: SCREEN, highlight: groups.at(-1), ending: "open" });
}

// The song cut into justified lines for a staff width, kept until it changes
function layoutSong(width) {
    if (songLayout?.width === width && songLayout.song === currentSong()) return songLayout;
    const lines = layoutLines(measures(rhythm()), width);
    lines.slice(0, -1).forEach(line => justify(line, width));
    const lineOf = new Map();
    lines.forEach((line, i) => line.forEach(entry => entry.bar.forEach(piece => {
        if (piece.group && !lineOf.has(piece.group)) lineOf.set(piece.group, i);
    })));
    songLayout = { width, song: currentSong(), lines, lineOf };
    return songLayout;
}

// The whole score, line after line, in the dialog
function drawFull(bars) {
    const width = fullView.clientWidth;
    if (!width) return;
    fullStale = false;
    const song = currentSong();
    const scale = width < 600 ? 0.72 : 0.85;
    const logicalWidth = width / scale;
    const lines = layoutLines(bars, logicalWidth - 32);
    lines.slice(0, -1).forEach(line => justify(line, logicalWidth - 32));
    const atBottom = fullView.scrollHeight - fullView.scrollTop - fullView.clientHeight < 40;

    const page = document.createElement("div");
    const renderer = new VF.Renderer(page, VF.Renderer.Backends.SVG);
    renderer.resize(width, Math.round((lines.length * SYSTEM_HEIGHT + 10) * scale));
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);
    lines.forEach((line, i) => drawLine(ctx, 16, i * SYSTEM_HEIGHT, logicalWidth - 32, line, {
        colors: SCREEN,
        highlight: song ? null : groups.at(-1),
        ending: i < lines.length - 1 ? "bar" : song ? "end" : "open",
    }));
    fullView.replaceChildren(page);
    // Follow the playing when the reader is already at the end
    if (atBottom && !song) fullView.scrollTop = fullView.scrollHeight;
}

// Keep redrawing while the last chord is held, so it grows on the staff
function scheduleLiveRefresh() {
    clearTimeout(liveTimer);
    const last = groups[groups.length - 1];
    if (last && releaseOf(last) === null) liveTimer = setTimeout(queueDraw, LIVE_REFRESH_MS);
}

// `content` is false when only the song cursor moved: the whole score in the
// dialog (slow to draw for a long song) is then left as it is
function queueDraw(content = true) {
    if (content !== false) fullStale = true;
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(draw);
}

// What the staff currently shows, as text: measures split by "|", ties as "~"
// (handy to check it from the console)
export function staffSnapshot() {
    const label = ([, duration, dots]) => duration + "d".repeat(dots);
    return measures(rhythm(performance.now())).map(bar => bar.map(piece => piece.rest
        ? `rest:${label(piece.value)}`
        : `${piece.tied ? "~" : ""}${spellGroup(piece.group.midis).map(n => n.key).join("+")}:${label(piece.value)}`
    ).join(" ")).join(" | ");
}

export function clearScore() {
    groups = [];
    played = [];
    queueDraw();
    notifyChange();
}

// === Whole score and downloads ===

export function hasScore() {
    return Boolean(currentSong()) || groups.length > 0;
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
    const margin = 30;
    const lines = layoutLines(measures(rhythm(performance.now())), 1000 - margin * 2);
    // Full lines are stretched to the margins; the last one keeps its natural
    // width, and a score of a single line is cropped to it
    lines.slice(0, -1).forEach(line => justify(line, 1000 - margin * 2));
    const logicalWidth = lines.length > 1 ? 1000 : Math.ceil(lines[0].reduce((sum, e) => sum + e.width, 0)) + margin * 2;
    const height = margin * 2 + lines.length * SYSTEM_HEIGHT;

    const page = document.createElement("div");
    const renderer = new VF.Renderer(page, VF.Renderer.Backends.SVG);
    renderer.resize(logicalWidth, height);
    const ctx = renderer.getContext();
    lines.forEach((line, i) => drawLine(ctx, margin, margin + i * SYSTEM_HEIGHT, logicalWidth - margin * 2, line, {
        colors: PAPER, highlight: null, ending: i === lines.length - 1 ? "end" : "bar",
    }));

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
    if (!groups.length || currentSong()) return;
    download(new Blob([midiFile()], { type: "audio/midi" }), fileName("mid"));
}

function applyVisibility() {
    document.body.classList.toggle("staff-hidden", !settings.showStaff);
    queueDraw();
}

export async function initScore(element) {
    container = element;
    applyVisibility();
    new ResizeObserver(() => queueDraw(false)).observe(container);
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
    // While a song is open, the staff shows the song, not what is played
    if (currentSong()) return;
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

onSongChange(() => {
    songCursor = null;
    queueDraw();
    notifyChange();
});

// Move the cursor to the chord being played; redraw when it changes
onSongPosition(ms => {
    const song = currentSong();
    if (!song) return;
    let cursor = null;
    for (const group of song.groups) {
        if (group.time > ms + 1) break;
        cursor = group;
    }
    if (cursor === songCursor) return;
    songCursor = cursor;
    queueDraw(false);
});

onSettingChange(key => {
    if (key === "showStaff") applyVisibility();
    if (key === "scaleRoot" || key === "scaleType" || key === "tempo") queueDraw();
});
