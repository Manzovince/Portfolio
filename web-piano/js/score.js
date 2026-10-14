// === Grand staff: what was played, chord by chord (VexFlow) ===
//
// Rhythm is not quantised, so notes are drawn as stemless whole notes: the
// staff shows which notes were played together, in order, correctly spelled.

import { subscribe } from "./piano.js?v=20261014";
import { settings, onSettingChange } from "./settings.js?v=20261014";
import { detectChord, scaleContext, spellPc, vexKey, pitchClass } from "./theory.js?v=20261014";

const VEXFLOW_URL = "https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/esm/entry/vexflow.js";
const CHORD_WINDOW_MS = 60; // notes struck closer together than this form one chord
const SPACING = 46;         // logical pixels per chord
const INK = "#e9dbc7";
const ACCENT = "#44aca3";

let VF = null;
let container;
let groups = []; // { start, midis: Set }
let drawQueued = false;

function spellGroup(midis) {
    const sorted = [...midis].sort((a, b) => a - b);
    const context = scaleContext(settings.scaleRoot, settings.scaleType);
    const chord = sorted.length >= 2 ? detectChord(sorted, context) : null;
    return sorted.map(midi => ({ midi, ...vexKey(midi, spellPc(pitchClass(midi), chord, context)) }));
}

function makeNote(notes, clef, color) {
    if (!notes.length) return new VF.GhostNote("w");
    const note = new VF.StaveNote({ keys: notes.map(n => n.key), duration: "w", clef });
    notes.forEach((n, i) => n.accidental && note.addModifier(new VF.Accidental(n.accidental), i));
    note.setStyle({ fillStyle: color, strokeStyle: color });
    return note;
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
    if (groups.length > capacity) groups = groups.slice(-capacity);
    if (!groups.length) return;

    const trebleNotes = [];
    const bassNotes = [];
    groups.forEach((group, i) => {
        const spelled = spellGroup(group.midis);
        const color = i === groups.length - 1 ? ACCENT : INK;
        trebleNotes.push(makeNote(spelled.filter(n => n.midi >= 60), "treble", color));
        bassNotes.push(makeNote(spelled.filter(n => n.midi < 60), "bass", color));
    });

    const voice = notes => new VF.Voice({ numBeats: 4 * notes.length, beatValue: 4 })
        .setMode(VF.Voice.Mode.SOFT).addTickables(notes);
    const trebleVoice = voice(trebleNotes);
    const bassVoice = voice(bassNotes);
    new VF.Formatter()
        .joinVoices([trebleVoice])
        .joinVoices([bassVoice])
        .format([trebleVoice, bassVoice], Math.min(room, groups.length * SPACING));
    trebleVoice.draw(ctx, treble);
    bassVoice.draw(ctx, bass);
}

function queueDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(draw);
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
    if (event.type !== "on") return;
    const last = groups[groups.length - 1];
    if (last && event.time - last.start < CHORD_WINDOW_MS) last.midis.add(event.midi);
    else groups.push({ start: event.time, midis: new Set([event.midi]) });
    queueDraw();
});

onSettingChange(key => {
    if (key === "showStaff") applyVisibility();
    if (key === "scaleRoot" || key === "scaleType") queueDraw();
});
