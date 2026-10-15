// === Practice: chord and scale exercises ===
//
// Chords: play the chord shown, in any octave or inversion.
// Scales: play the scale shown note by note, one octave up then back down,
// starting anywhere on the keyboard.
// With hints on, the notes to play are marked on the keys (and the LED strip).

import { subscribe, soundingNotes } from "./piano.js?v=20261015f";
import { settings, setSetting, onSettingChange } from "./settings.js?v=20261015f";
import { buildChord, chordSymbol, noteName, defaultSpelling, scaleNotes, pitchClass, SCALES } from "./theory.js?v=20261015f";
import { t, chordQuality, scaleName, currentNotation, onLanguageChange } from "./i18n.js?v=20261015f";

const LEVELS = {
    chords: {
        triads: ["maj", "min"],
        allTriads: ["maj", "min", "dim", "aug", "sus2", "sus4"],
        sevenths: ["dom7", "maj7", "min7", "hdim7", "dim7"],
        allChords: ["maj", "min", "dim", "aug", "sus2", "sus4", "dom7", "maj7", "min7", "hdim7", "dim7", "six", "min6"],
    },
    scales: {
        majorScales: ["major"],
        minorScales: ["minor", "harmonicMinor"],
        majorMinor: ["major", "minor", "harmonicMinor"],
        allScales: Object.keys(SCALES),
    },
};
const ROOTS = { naturals: [0, 2, 4, 5, 7, 9, 11], all: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
const NEXT_DELAY_MS = 900; // time to enjoy the success before the next exercise

let active = false;
let target = null;
let locked = false;         // between a success and the next exercise
let attemptMissed = false;  // one miss per chord attempt is enough
let feedback = { kind: "", text: "" };
let missedStep = -1;        // scale chip to shake after a wrong note
const stats = { done: 0, streak: 0 };
const listeners = new Set();
let el = {};

export const isPracticing = () => active;
export const onPracticeChange = fn => listeners.add(fn);

// Notes to mark on the keys: strong = play these now, soft = the rest of the scale
export function practiceGuide() {
    if (!active || !target || !settings.practiceHints) return null;
    if (target.kind === "chords") return { strong: target.pcs, soft: new Set() };
    const next = target.steps[target.position];
    return {
        strong: new Set(next === undefined ? [] : [next.pc]),
        soft: new Set(target.notes.map(n => n.pc)),
    };
}

function changed() {
    render();
    listeners.forEach(fn => fn());
}

const pick = list => list[Math.floor(Math.random() * list.length)];

// A new exercise, never the same as the one just done
function nextTarget() {
    const kind = settings.practiceKind;
    const level = kind === "chords" ? settings.practiceChords : settings.practiceScales;
    const types = LEVELS[kind][level] ?? Object.values(LEVELS[kind])[0];
    const roots = ROOTS[settings.practiceRoots] ?? ROOTS.all;
    let root, type;
    do {
        root = pick(roots);
        type = pick(types);
    } while (target && target.kind === kind && target.root === root && target.type === type && roots.length * types.length > 1);

    if (kind === "chords") {
        const chord = buildChord(root, type);
        target = { kind, root, type, chord, notes: chord.notes, pcs: new Set(chord.notes.map(n => n.pc)) };
    } else {
        const notes = scaleNotes(root, type);
        // Up to the octave, then back down: C D E F G A B C B A G F E D C
        const up = [...notes, notes[0]];
        const steps = [...up, ...up.slice(0, -1).reverse()];
        target = { kind, root, type, notes, steps, position: 0, lastMidi: null };
    }
    locked = false;
    attemptMissed = false;
    missedStep = -1;
    feedback = { kind: "", text: "" };
    changed();
}

function succeed() {
    stats.done++;
    stats.streak++;
    locked = true;
    feedback = { kind: "success", text: pick(t("practiceWell").split("|")) };
    changed();
    setTimeout(() => active && locked && nextTarget(), NEXT_DELAY_MS);
}

function miss(text) {
    stats.streak = 0;
    feedback = { kind: "miss", text };
    changed();
}

const nameOf = sp => noteName(sp, currentNotation());

function checkChord(event) {
    const held = new Set(soundingNotes().map(pitchClass));
    if (!held.size) {
        attemptMissed = false;
        return changed();
    }
    if (held.size === target.pcs.size && [...held].every(pc => target.pcs.has(pc))) return succeed();
    if (event.type === "on" && !target.pcs.has(pitchClass(event.midi))) {
        const wrong = target.chord.spelling[pitchClass(event.midi)] ?? null;
        const label = wrong ? nameOf(wrong) : noteNameOfMidi(event.midi);
        if (!attemptMissed) {
            attemptMissed = true;
            return miss(t("practiceNotInChord", { note: label }));
        }
    }
    changed();
}

function noteNameOfMidi(midi) {
    return nameOf(defaultSpelling(pitchClass(midi)));
}

function checkScale(event) {
    if (event.type !== "on") return;
    const step = target.steps[target.position];
    const pc = pitchClass(event.midi);
    const goingUp = target.position <= target.notes.length;
    const rightDirection = target.lastMidi === null
        || (goingUp ? event.midi > target.lastMidi : event.midi < target.lastMidi);
    if (pc === step.pc && rightDirection) {
        target.position++;
        target.lastMidi = event.midi;
        missedStep = -1;
        feedback = { kind: "", text: "" };
        if (target.position === target.steps.length) return succeed();
        return changed();
    }
    // Playing the previous note again is not a mistake
    if (event.midi === target.lastMidi) return;
    missedStep = target.position;
    if (pc === step.pc) return miss(t(goingUp ? "practiceHigher" : "practiceLower"));
    const scaleSpelling = target.notes.find(n => n.pc === pc)?.spelling;
    miss(t("practiceNotNext", { note: scaleSpelling ? nameOf(scaleSpelling) : noteNameOfMidi(event.midi) }));
}

// === Panel ===

function chip(text, state) {
    const span = document.createElement("span");
    span.textContent = text;
    if (state) span.className = state;
    return span;
}

function renderChordNotes() {
    const held = new Set(soundingNotes().map(pitchClass));
    const chips = target.notes.map(n => {
        const on = held.has(n.pc);
        return chip(on || settings.practiceHints ? nameOf(n.spelling) : "?", on ? "good" : "");
    });
    // Notes held that are not in the chord
    for (const pc of held) {
        if (!target.pcs.has(pc)) chips.push(chip(nameOf(defaultSpelling(pc)), "bad"));
    }
    el.notes.replaceChildren(...chips);
}

function renderScaleNotes() {
    el.notes.replaceChildren(...target.steps.map((step, i) => {
        const done = i < target.position;
        const state = done ? "good" : i === target.position ? (i === missedStep ? "next shake" : "next") : "";
        return chip(done || settings.practiceHints ? nameOf(step.spelling) : "?", state);
    }));
}

function renderLevels() {
    const kind = settings.practiceKind;
    el.level.replaceChildren(...Object.keys(LEVELS[kind]).map(key => new Option(t(key), key)));
    el.level.value = kind === "chords" ? settings.practiceChords : settings.practiceScales;
}

function render() {
    document.body.classList.toggle("practicing", active);
    el.toggle.setAttribute("aria-pressed", active);
    el.panel.hidden = !active;
    if (!active || !target) return;
    const notation = currentNotation();
    el.stats.textContent = stats.done ? t("practiceStats", { done: stats.done, streak: stats.streak }) : "";
    el.panel.dataset.feedback = feedback.kind;
    el.feedback.textContent = feedback.text;

    if (target.kind === "chords") {
        el.prompt.textContent = t("practicePlayChord");
        el.symbol.textContent = chordSymbol(target.chord, notation);
        el.name.textContent = `${nameOf(target.chord.root)} ${chordQuality(target.type)}`;
        renderChordNotes();
    } else {
        el.prompt.textContent = t("practicePlayScale");
        el.symbol.textContent = nameOf(target.notes[0].spelling);
        el.name.textContent = t("practiceScaleOf", { name: scaleName(target.type).toLowerCase() });
        renderScaleNotes();
    }
}

export function setPracticing(on) {
    if (on === active) return;
    active = on;
    if (active) {
        renderLevels();
        nextTarget();
    } else {
        target = null;
        changed();
    }
}

export function initPractice() {
    const $ = id => document.getElementById(id);
    el = {
        toggle: $("practiceBtn"), panel: $("practice"), level: $("practiceLevel"), stats: $("practiceStats"),
        prompt: $("practicePrompt"), symbol: $("practiceSymbol"), name: $("practiceName"),
        notes: $("practiceNotes"), feedback: $("practiceFeedback"),
    };
    el.toggle.addEventListener("click", () => setPracticing(!active));
    $("practiceClose").addEventListener("click", () => setPracticing(false));
    $("practiceSkip").addEventListener("click", () => {
        stats.streak = 0;
        nextTarget();
    });
    el.level.addEventListener("change", () =>
        setSetting(settings.practiceKind === "chords" ? "practiceChords" : "practiceScales", el.level.value));
    onLanguageChange(() => {
        renderLevels();
        render();
    });
    render();
}

subscribe(event => {
    if (!active || !target || locked || (event.type !== "on" && event.type !== "off")) return;
    if (target.kind === "chords") checkChord(event);
    else checkScale(event);
});

onSettingChange(key => {
    if (!active) return;
    if (key === "practiceKind") renderLevels();
    if (["practiceKind", "practiceChords", "practiceScales", "practiceRoots"].includes(key)) nextTarget();
    if (key === "practiceHints" || key === "notation") changed();
});
