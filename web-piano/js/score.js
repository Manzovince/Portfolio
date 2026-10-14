// === Grand staff: what was played, chord by chord (VexFlow) ===
//
// Note lengths are written from the tempo setting: the time from one chord
// to the next is rounded to the nearest note value (16th to whole, dotted
// values included). A key let go well before the next chord leaves a rest.
// The chord being held grows on the staff while it is held.

import { subscribe } from "./piano.js?v=20261014b";
import { settings, onSettingChange } from "./settings.js?v=20261014b";
import { detectChord, scaleContext, spellPc, vexKey, pitchClass } from "./theory.js?v=20261014b";

const VEXFLOW_URL = "https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/esm/entry/vexflow.js";
const CHORD_WINDOW_MS = 60; // notes struck closer together than this form one chord
const SPACING = 46;         // logical pixels per chord or rest
const LIVE_REFRESH_MS = 120; // redraw rate while the last chord is held
const REST_THRESHOLD = 0.5;  // beats of silence before a rest is written

// Note values in beats (quarter note = 1): [beats, VexFlow duration, dots]
const VALUES = [
    [0.25, "16", 0], [0.5, "8", 0], [0.75, "8", 1], [1, "q", 0],
    [1.5, "q", 1], [2, "h", 0], [3, "h", 1], [4, "w", 0],
];
const INK = "#e9dbc7";
const ACCENT = "#44aca3";

let VF = null;
let container;
let groups = []; // { start, midis: Set, ends: Map midi -> release time | null }
let drawQueued = false;
let liveTimer = null;

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

function makeRest(clef, [, duration, dots]) {
    const rest = new VF.StaveNote({ keys: [clef === "treble" ? "b/4" : "d/3"], duration: `${duration}r`, dots, clef });
    if (dots) VF.Dot.buildAndAttach([rest], { all: true });
    rest.setStyle({ fillStyle: "rgb(233 219 199 / 0.55)", strokeStyle: "rgb(233 219 199 / 0.55)" });
    return rest;
}

function draw() {
    drawQueued = false;
    if (!VF || !settings.showStaff) return;
    const width = container.clientWidth;
    if (!width) return;
    const scale = width < 600 ? 0.72 : 0.85;
    const logicalWidth = width / scale;
    const height = Math.round(190 * scale);

    container.replaceChildren();
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(width, height);
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);
    ctx.setFillStyle(INK);
    ctx.setStrokeStyle(INK);

    const treble = new VF.Stave(16, 0, logicalWidth - 32).addClef("treble");
    const bass = new VF.Stave(16, 85, logicalWidth - 32).addClef("bass");
    treble.setContext(ctx).draw();
    bass.setContext(ctx).draw();
    new VF.StaveConnector(treble, bass).setType("brace").setContext(ctx).draw();
    new VF.StaveConnector(treble, bass).setType("singleLeft").setContext(ctx).draw();

    const room = treble.getNoteEndX() - treble.getNoteStartX() - 20;
    const capacity = Math.max(1, Math.floor(room / SPACING));
    let items = rhythm(performance.now());
    if (items.length > capacity) {
        // Forget the chords that scrolled off the left of the staff
        items = items.slice(-capacity);
        groups = groups.filter(g => items.some(item => item.group === g));
    }
    scheduleLiveRefresh();
    if (!items.length) return;

    const last = groups[groups.length - 1];
    const trebleNotes = [];
    const bassNotes = [];
    for (const item of items) {
        if (item.rest) {
            trebleNotes.push(makeRest("treble", item.value));
            bassNotes.push(makeRest("bass", item.value));
            continue;
        }
        const spelled = spellGroup(item.group.midis);
        const color = item.group === last ? ACCENT : INK;
        trebleNotes.push(makeNote(spelled.filter(n => n.midi >= 60), "treble", color, item.value));
        bassNotes.push(makeNote(spelled.filter(n => n.midi < 60), "bass", color, item.value));
    }

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
    queueDraw();
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
        const last = groups[groups.length - 1];
        if (last && event.time - last.start < CHORD_WINDOW_MS) {
            last.midis.add(event.midi);
            last.ends.set(event.midi, null);
        } else {
            groups.push({ start: event.time, midis: new Set([event.midi]), ends: new Map([[event.midi, null]]) });
        }
        queueDraw();
    } else if (event.type === "off") {
        // The most recent chord still holding this note
        for (let i = groups.length - 1; i >= 0; i--) {
            if (groups[i].ends.get(event.midi) === null) {
                groups[i].ends.set(event.midi, event.time);
                break;
            }
        }
        queueDraw();
    }
});

onSettingChange(key => {
    if (key === "showStaff") applyVisibility();
    if (key === "scaleRoot" || key === "scaleType" || key === "tempo") queueDraw();
});
