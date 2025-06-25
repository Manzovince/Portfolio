// score.js – static staff notation (VexFlow ESM)
// -----------------------------------------------------------------------------
// Streams finished timelineNotes onto a static SVG staff.
// -----------------------------------------------------------------------------

import {
    Renderer,
    Stave,
    StaveNote,
    Voice,
    Accidental,
    TickContext
} from "https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/esm/entry/vexflow.js";

import { timelineNotes } from "./midi.js";

export { initScore };

// ─────────────────────────────────────────────────── constants ──
const STAFF_HEIGHT = 100;
const QUARTER_MS = 500;
const NOTE_SPACING = 40; // px between chords
const CHORD_THRESHOLD_MS = 1000;

// ─────────────────────────────────────────────── module state ──
let renderer, ctx, stave;
let chords = []; // each item is { notes: [StaveNote, ...], tickContext }
let processedIndex = 0;

// ──────────────────────────────────────────────────── public ──
function initScore() {
    const container = document.getElementById("scoreView");

    const width = window.innerWidth;
    renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, STAFF_HEIGHT);
    ctx = renderer.getContext();

    stave = new Stave(10, 0, width - 20);
    stave.addClef("treble").addTimeSignature("4/4");
    stave.setContext(ctx).draw();

    requestAnimationFrame(loop);
}

// ────────────────────────────────────────────────── helpers ──
function midiToKey(m) {
    const names = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
    return `${names[m % 12]}/${Math.floor(m / 12) - 1}`;
}

function msToDuration(ms) {
    if (ms < QUARTER_MS / 2) return "16";
    if (ms < QUARTER_MS) return "8";
    if (ms < QUARTER_MS * 2) return "q";
    if (ms < QUARTER_MS * 4) return "h";
    return "w";
}

function groupSimultaneousNotes(startIndex) {
    const start = timelineNotes[startIndex];
    const group = [start];
    let i = startIndex + 1;
    while (
        i < timelineNotes.length &&
        Math.abs(timelineNotes[i].startTime - start.startTime) < CHORD_THRESHOLD_MS &&
        timelineNotes[i].endTime !== null
    ) {
        group.push(timelineNotes[i]);
        i++;
    }
    return [group, i];
}

function harvestFinishedNotes() {
    let updated = false;

    while (processedIndex < timelineNotes.length && timelineNotes[processedIndex].endTime !== null) {
        const [group, nextIndex] = groupSimultaneousNotes(processedIndex);
        processedIndex = nextIndex;

        const keys = group.map(n => midiToKey(n.note));
        const dur = msToDuration(group[0].endTime - group[0].startTime);

        const note = new StaveNote({ keys, duration: dur });
        keys.forEach((k, i) => {
            if (k.includes("#")) note.addModifier(new Accidental("#"), i);
        });

        const tickContext = new TickContext();
        tickContext.addTickable(note).preFormat();
        note.setTickContext(tickContext);

        chords.push({ note, tickContext });

        // Limit to last 30 notes/chords
        const MAX_CHORDS = 30;
        if (chords.length > MAX_CHORDS) {
            chords.shift();
        }

        updated = true;
    }

    return updated;
}

function redraw() {
    ctx.clear();
    stave.setContext(ctx).draw();

    let x = stave.getNoteStartX();
    for (const { note, tickContext } of chords) {
        note.setStave(stave);
        tickContext.setX(x);
        note.setContext(ctx).draw();
        x += NOTE_SPACING;
    }
}

function loop() {
    const updated = harvestFinishedNotes();
    if (updated) redraw();
    requestAnimationFrame(loop);
}