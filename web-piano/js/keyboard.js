// === On-screen keyboard, computer-keyboard and pointer input ===

import { press, lift, setPedal, liftSource, subscribe, soundingNotes, noteInfo, LOWEST, HIGHEST } from "./piano.js?v=20261015g";
import { settings, onSettingChange } from "./settings.js?v=20261015g";
import { noteColor, rgbString } from "./colors.js?v=20261015g";
import { noteName, defaultSpelling, scaleNotes, pitchClass } from "./theory.js?v=20261015g";
import { isPracticing, practiceGuide, onPracticeChange } from "./practice.js?v=20261015g";
import { songGuide, onSongGuide } from "./song.js?v=20261015g";
import { getLanguage, onLanguageChange, currentNotation } from "./i18n.js?v=20261015g";

const isBlack = midi => [1, 3, 6, 8, 10].includes(midi % 12);
// Black keys sit slightly off-centre on a real piano
const BLACK_OFFSET = { 1: -0.12, 3: 0.12, 6: -0.15, 8: 0, 10: 0.15 };

// Physical key positions (layout independent): A row = white keys, row above = black keys
const CODES = ["KeyA", "KeyW", "KeyS", "KeyE", "KeyD", "KeyF", "KeyT", "KeyG", "KeyY", "KeyH",
    "KeyU", "KeyJ", "KeyK", "KeyO", "KeyL", "KeyP", "Semicolon", "Quote"];
const FALLBACK_LABELS = {
    qwerty: ["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K", "O", "L", "P", ";", "'"],
    azerty: ["Q", "Z", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K", "O", "L", "P", "M", "Ù"],
};

const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const coarsePointer = matchMedia("(pointer: coarse)");

let el;           // #keyboard
let keys = new Map(); // midi -> element
let geometry = new Map(); // midi -> { x, w, black } relative to the keyboard
let range = { lo: LOWEST, hi: HIGHEST, partial: false };
let center = 60;  // octave kept in view when the whole keyboard does not fit
let baseC = 60;   // computer keys: KeyA plays this note
let layoutLabels = null; // Map code -> printed character, when the browser can tell
const layoutListeners = new Set();

export const onKeyboardLayout = fn => layoutListeners.add(fn);
export const keyboardRange = () => range;

// Key rectangles in viewport coordinates, for the canvases drawn above the keys
export function keyGeometry() {
    const left = el.getBoundingClientRect().left;
    const out = new Map();
    geometry.forEach((g, midi) => out.set(midi, { ...g, x: g.x + left }));
    return out;
}

const WHITES = [];
for (let m = LOWEST; m <= HIGHEST; m++) if (!isBlack(m)) WHITES.push(m);

function computeRange(width) {
    const minWhite = coarsePointer.matches ? 30 : 13;
    if (width / WHITES.length >= minWhite) return { lo: LOWEST, hi: HIGHEST, partial: false };
    const count = Math.max(8, Math.min(WHITES.length, Math.floor(width / (coarsePointer.matches ? 40 : 22))));
    const centerIndex = WHITES.indexOf(center);
    const start = Math.max(0, Math.min(WHITES.length - count, centerIndex - Math.floor((count - 7) / 2)));
    return { lo: WHITES[start], hi: WHITES[start + count - 1], partial: true };
}

function build() {
    const width = el.clientWidth;
    range = computeRange(width);
    const whiteCount = WHITES.filter(m => m >= range.lo && m <= range.hi).length;
    const whiteW = width / whiteCount;
    const blackW = whiteW * 0.58;

    el.replaceChildren();
    keys = new Map();
    geometry = new Map();
    let whiteIndex = 0;
    for (let midi = range.lo; midi <= range.hi; midi++) {
        const black = isBlack(midi);
        const key = document.createElement("div");
        key.className = `key ${black ? "black" : "white"}`;
        key.dataset.midi = midi;
        let x, w;
        if (black) {
            w = blackW;
            x = whiteIndex * whiteW - w / 2 + BLACK_OFFSET[midi % 12] * w;
        } else {
            w = whiteW;
            x = whiteIndex * whiteW;
            whiteIndex++;
        }
        key.style.left = `${x}px`;
        key.style.width = `${w}px`;
        key.innerHTML = `<i class="dot"></i><span class="label"></span><span class="name"></span>`;
        geometry.set(midi, { x, w, black });
        keys.set(midi, key);
        el.appendChild(key);
    }
    el.classList.toggle("partial", range.partial);
    document.body.classList.toggle("keyboard-partial", range.partial);
    refreshLabels();
    refreshScale();
    refreshActive();
    layoutListeners.forEach(fn => fn());
}

// === Decorations ===

function keyLabel(index) {
    return layoutLabels?.get(CODES[index])?.toUpperCase()
        || FALLBACK_LABELS[getLanguage() === "fr" ? "azerty" : "qwerty"][index];
}

export function keysHint() {
    return `${keyLabel(0)} ${keyLabel(2)} ${keyLabel(4)} … ${keyLabel(16)}`;
}

function refreshLabels() {
    const notation = currentNotation();
    const showKeys = settings.showLabels && finePointer.matches;
    keys.forEach((key, midi) => {
        const index = midi - baseC;
        key.querySelector(".label").textContent = showKeys && index >= 0 && index < CODES.length ? keyLabel(index) : "";
        const isC = midi % 12 === 0;
        key.querySelector(".name").textContent = settings.showLabels && isC
            ? noteName(defaultSpelling(0), notation) + (Math.floor(midi / 12) - 1) : "";
        key.classList.toggle("middle-c", midi === 60);
    });
}

function refreshScale() {
    // During an exercise or while playing along, the notes to play replace the scale guide
    const guide = isPracticing() ? practiceGuide() : songGuide();
    const notes = guide || isPracticing() ? [] : scaleNotes(settings.scaleRoot, settings.scaleType);
    const inScale = new Set(notes.map(n => n.pc));
    keys.forEach((key, midi) => {
        const pc = pitchClass(midi);
        key.classList.toggle("in-scale", inScale.has(pc) || !!guide?.soft?.has(pc));
        key.classList.toggle("scale-root", notes.length > 0 && pc === settings.scaleRoot);
        key.classList.toggle("guide", !!guide?.strong?.has(pc) || !!guide?.midis?.has(midi));
    });
}

function setActive(midi, on) {
    const key = keys.get(midi);
    if (!key) return;
    key.classList.toggle("active", on);
    if (on) {
        const velocity = noteInfo(midi)?.velocity ?? 100;
        key.style.setProperty("--hit", rgbString(noteColor(midi, settings.colorMode), 0.55 + 0.45 * velocity / 127));
    }
}

function refreshActive() {
    const active = new Set(soundingNotes());
    keys.forEach((_, midi) => setActive(midi, active.has(midi)));
}

// === Moving along the keyboard ===

export function shiftOctave(direction) {
    baseC = Math.max(24, Math.min(96, baseC + 12 * direction));
    liftSource("keys");
    held.clear();
    if (range.partial) {
        center = baseC;
        build();
    } else {
        refreshLabels();
    }
}

// Partial keyboards scroll by an octave without moving the computer keys
export function shiftView(direction) {
    center = Math.max(24, Math.min(96, center + 12 * direction));
    build();
}

// === Pointer input (mouse, touch, pen), with glissando ===

const pointers = new Map(); // pointerId -> midi

function keyAt(x, y) {
    const key = document.elementFromPoint(x, y)?.closest?.(".key");
    return key && el.contains(key) ? Number(key.dataset.midi) : null;
}

function pointerVelocity(e, midi) {
    const key = keys.get(midi);
    if (!key) return 90;
    const rect = key.getBoundingClientRect();
    const depth = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return Math.round(55 + 65 * depth); // nearer the front of the key = louder
}

function onPointerDown(e) {
    if (e.button !== 0) return;
    const midi = keyAt(e.clientX, e.clientY);
    if (midi === null) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, midi);
    press(midi, pointerVelocity(e, midi), "pointer");
}

function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    const current = pointers.get(e.pointerId);
    const midi = keyAt(e.clientX, e.clientY);
    if (midi === current) return;
    if (current !== null) lift(current);
    pointers.set(e.pointerId, midi);
    if (midi !== null) press(midi, pointerVelocity(e, midi), "pointer");
}

function onPointerUp(e) {
    if (!pointers.has(e.pointerId)) return;
    const midi = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (midi !== null) lift(midi);
}

// === Computer keyboard ===

const held = new Map(); // code -> midi, so an octave change mid-note lifts the right key
let spacePedal = false;

function isTyping(target) {
    return target.closest?.("input, select, textarea, [contenteditable]");
}

function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    if (e.code === "Space") {
        if (e.target.closest?.("button, a")) return;
        e.preventDefault();
        if (!spacePedal) {
            spacePedal = true;
            setPedal(true);
        }
        return;
    }
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        if (e.target.closest?.("input")) return;
        e.preventDefault();
        if (!e.repeat) shiftOctave(e.code === "ArrowLeft" ? -1 : 1);
        return;
    }
    const index = CODES.indexOf(e.code);
    if (index < 0) return;
    e.preventDefault();
    if (e.repeat || held.has(e.code)) return;
    const midi = baseC + index;
    held.set(e.code, midi);
    press(midi, 90, "keys");
}

function onKeyUp(e) {
    if (e.code === "Space" && spacePedal) {
        spacePedal = false;
        setPedal(false);
        return;
    }
    if (!held.has(e.code)) return;
    lift(held.get(e.code));
    held.delete(e.code);
}

// Never leave notes stuck when the page loses focus mid-chord
function releaseEverything() {
    liftSource("keys");
    liftSource("pointer");
    held.clear();
    pointers.clear();
    if (spacePedal) {
        spacePedal = false;
        setPedal(false);
    }
}

export function initKeyboard(element) {
    el = element;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("lostpointercapture", onPointerUp);
    el.addEventListener("contextmenu", e => e.preventDefault());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseEverything);
    document.addEventListener("visibilitychange", () => document.hidden && releaseEverything());

    let lastWidth = 0;
    new ResizeObserver(() => {
        if (el.clientWidth === lastWidth) return;
        lastWidth = el.clientWidth;
        build();
    }).observe(el);
    coarsePointer.addEventListener("change", build);
    finePointer.addEventListener("change", refreshLabels);

    navigator.keyboard?.getLayoutMap?.().then(map => {
        layoutLabels = map;
        refreshLabels();
        document.dispatchEvent(new Event("keylabels"));
    }).catch(() => {});

    build();
}

subscribe(event => {
    if (event.type === "on") setActive(event.midi, true);
    if (event.type === "off") setActive(event.midi, false);
});

onSettingChange(key => {
    if (key === "showLabels" || key === "notation") refreshLabels();
    if (key === "scaleRoot" || key === "scaleType") refreshScale();
    if (key === "colorMode") refreshActive();
});
onLanguageChange(refreshLabels);

onPracticeChange(refreshScale);
onSongGuide(refreshScale);
