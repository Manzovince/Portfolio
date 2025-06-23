// === Virtual keyboard ===

import { activeNotes, noteOn, noteOff } from "./midi.js";
import { ledMode, ledIntensity } from "./leds.js";
import { hsvToRGB } from "./utils.js";

export { createKeyboard, updateKeyboard }

const keyboardMap = {
    81: 60, 90: 61, 83: 62, 69: 63, 68: 64, 70: 65, 84: 66,
    71: 67, 89: 68, 72: 69, 85: 70, 74: 71, 75: 72, 79: 73,
    76: 74, 80: 75, 77: 76
};

const keyLabels = {
    60: 'Q', 61: 'Z', 62: 'S', 63: 'E', 64: 'D', 65: 'F', 66: 'T',
    67: 'G', 68: 'Y', 69: 'H', 70: 'U', 71: 'J', 72: 'K', 73: 'O',
    74: 'L', 75: 'P', 76: 'M'
};

function createKeyboard() {
    const keyboard = document.getElementById("virtualKeyboard");
    keyboard.innerHTML = '';

    const startNote = 21; // A0
    const endNote = 108;  // C8

    for (let midiNote = startNote; midiNote <= endNote; midiNote++) {
        const key = document.createElement('div');
        const isBlack = [1, 3, 6, 8, 10].includes(midiNote % 12);
        key.className = `key ${isBlack ? 'black' : 'white'}`;
        key.dataset.note = midiNote;

        if (keyLabels[midiNote]) {
            key.textContent = keyLabels[midiNote];
        }

        keyboard.appendChild(key);
    }
}

createKeyboard();

function updateKeyboard() {
    const keyboard = document.getElementById("virtualKeyboard");

    // 1. Reset all keys
    for (let key of keyboard.querySelectorAll('.key')) {
        key.classList.remove('active');
        key.style.backgroundColor = '';
    }

    // 2. Apply LED style to active notes
    for (let [midiNote, data] of activeNotes.entries()) {
        const key = keyboard.querySelector(`[data-note="${midiNote}"]`);
        if (!key) continue;

        key.classList.add('active');

        const intensity = 1;
        let color;

        switch (ledMode) {
            case "rainbow":
                const hueRainbow = (midiNote - 21) / 87;
                color = hsvToRGB(hueRainbow, 1.0, intensity);
                break;

            case "octave-rainbow":
                const hueOctave = (midiNote % 12) / 12;
                color = hsvToRGB(hueOctave, 1.0, intensity);
                break;

            case "default":
            default:
                color = { r: 255, g: 255, b: 255 };
                break;
        }

        if (color) {
            key.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
        }
    }
}

// === INTERACTIVE KEYBOARD ===

// Computer keyboard
const pressedKeys = new Set();

window.addEventListener("keydown", (e) => {
    if (pressedKeys.has(e.code)) return; // ignore if already pressed
    pressedKeys.add(e.code);

    const midiNote = keyboardMap[e.keyCode || e.which];
    if (midiNote !== undefined) {
        noteOn(midiNote, 100, performance.now()); // velocity fixed to 100
    }
});

window.addEventListener("keyup", (e) => {
    pressedKeys.delete(e.code);

    const midiNote = keyboardMap[e.keyCode || e.which];
    if (midiNote !== undefined) {
        noteOff(midiNote, performance.now());
    }
});

// Mouse
let mouseIsDown = false;

const keyboardElement = document.getElementById("virtualKeyboard");

keyboardElement.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("key")) {
        mouseIsDown = true;
        const midiNote = parseInt(e.target.dataset.note);
        noteOn(midiNote, 100, performance.now());
        e.target.classList.add("hovered");
    }
});

keyboardElement.addEventListener("mouseup", () => {
    mouseIsDown = false;
    // Arrêter toutes les notes encore marquées comme hovered
    for (const key of keyboardElement.querySelectorAll(".key.hovered")) {
        const midiNote = parseInt(key.dataset.note);
        noteOff(midiNote, performance.now());
        key.classList.remove("hovered");
    }
});

keyboardElement.addEventListener("mousemove", (e) => {
    if (!mouseIsDown) return;

    for (const key of keyboardElement.querySelectorAll(".key")) {
        const midiNote = parseInt(key.dataset.note);
        const isHovered = key === e.target;
        const isActive = key.classList.contains("hovered");

        if (isHovered && !isActive) {
            noteOn(midiNote, 100, performance.now());
            key.classList.add("hovered");
        } else if (!isHovered && isActive) {
            noteOff(midiNote, performance.now());
            key.classList.remove("hovered");
        }
    }
});

keyboardElement.addEventListener("mouseleave", () => {
    if (!mouseIsDown) return;
    for (const key of keyboardElement.querySelectorAll(".key.hovered")) {
        const midiNote = parseInt(key.dataset.note);
        noteOff(midiNote, performance.now());
        key.classList.remove("hovered");
    }
});

//  Touch (later for mobile version)