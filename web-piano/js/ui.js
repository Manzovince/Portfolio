import { activeNotes, timelineNotes } from './midi.js';
import { createKeyboard, updateKeyboard } from './keyboard.js';
import { getNoteNames, getChordName } from './analysis.js';
import { setInstrument, toggleSound, audioContext } from './sound.js';
import { drawPianoRoll } from './pianoroll.js';
import { ledMode, ledIntensity } from './leds.js';
import { hsvToRGB } from './utils.js';

export { setupUI, updateUI, drawPianoRoll, drawNoteStats };

// === SETUP UI ===

function getCurrentNotation() {
    return document.getElementById("notation").value;
}

function setupUI() {
    document.getElementById("settingsIcon").addEventListener("click", () => {
        document.getElementById("settingsPanel").classList.toggle("visible");
    });

    document.getElementById("soundToggle");
    soundToggle.addEventListener("change", (e) => {
        toggleSound(e.target.checked);
    });

    document.getElementById("instrument").addEventListener("change", (e) => {
        setInstrument(e.target.value);
    });

    window.addEventListener("click", () => {
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }
    }, { once: true });
    
    ["keydown", "touchstart"].forEach(event =>
        window.addEventListener(event, () => {
            if (audioContext.state === "suspended") {
                audioContext.resume();
            }
        }, { once: true })
    );    

    // Show/hide note statistics canvas on checkbox change
    const noteStatsCheckbox = document.getElementById("noteStatistics");
    const noteStatsCanvas = document.getElementById("noteStats");
    noteStatsCheckbox.addEventListener("change", () => {
        noteStatsCanvas.style.display = noteStatsCheckbox.checked ? "block" : "none";
        updateUI();
    });

    createKeyboard();
    updateUI();
}

// === UPDATE UI ===

function updateUI() {
    document.getElementById("activeNotes").innerText = getNoteNames(activeNotes, getCurrentNotation()) || "Play something!";
    document.getElementById("chordName").innerText = getChordName(activeNotes, getCurrentNotation()) || "";
    updateKeyboard();

    // Draw note statistics if enabled
    const noteStatsCheckbox = document.getElementById("noteStatistics");
    const noteStatsCanvas = document.getElementById("noteStats");
    if (noteStatsCheckbox.checked) {
        noteStatsCanvas.style.display = "block";
        drawNoteStats();
    } else {
        noteStatsCanvas.style.display = "none";
    }
}

// === NOTE STATISTICS CHART ===

function drawNoteStats() {
    const canvas = document.getElementById("noteStats");
    const ctx = canvas.getContext("2d");

    // Set canvas size to match style (fixed width like piano roll)
    canvas.width = 1286;
    canvas.height = canvas.offsetHeight;

    // Count frequency of each MIDI note in timelineNotes
    const noteCounts = new Array(128).fill(0);
    timelineNotes.forEach(n => {
        if (n.note >= 0 && n.note < 128) noteCounts[n.note]++;
    });

    // Find max count for scaling
    const maxCount = Math.max(...noteCounts);

    // Piano key range (A0=21 to C8=108)
    const firstNote = 21, lastNote = 108;
    const keyCount = lastNote - firstNote + 1;
    const barWidth = canvas.width / keyCount;

    // Draw bars
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < keyCount; i++) {
        const midi = firstNote + i;
        const x = i * barWidth;
        const count = noteCounts[midi];
        const barHeight = maxCount > 0 ? (count / maxCount) * (canvas.height - 10) : 0;

        // Color: black keys darker
        const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
        ctx.fillStyle = isBlack ? "rgba(80,80,80,0.8)" : "rgba(180,220,255,0.8)";
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
    }
}