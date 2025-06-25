// === LEDs controls ===

import { hsvToRGB, getScaleNotes } from "./utils.js";

export { applyLedMode,  ledMode, ledIntensity }

let ledsAreOn = false;

const noteToLed = [
    176, 174, 172, 170, 168, 166, 164, 162, 160, 158, 156, 154,
    152, 150, 148, 146, 144, 142, 140, 138, 136, 134, 132, 130,
    128, 126, 124, 122, 120, 118, 116, 114, 112, 110, 108, 106,
    104, 102, 100, 98, 96, 94, 92, 90, 88, 86, 84, 82,
    80, 78, 76, 74, 72, 71, 69, 67, 65, 63, 61, 59,
    57, 55, 53, 51, 49, 47, 45, 43, 41, 39, 37, 35,
    33, 31, 29, 27, 25, 23, 21, 19, 17, 15, 13, 11,
    9, 7, 5, 3
];

const ws = new WebSocket("ws://192.168.1.17:81");

ws.onopen = () => {
    console.log("[WS] Connected to ESP32");

    // Flash all LEDs at low intensity (e.g. 0.1) once
    toggleAllLeds(0.1); // ON
    setTimeout(() => toggleAllLeds(0.1), 500); // OFF after 300ms
};

ws.onerror = (e) => console.error("[WS ERROR]", e);
// ws.onmessage = (msg) => console.log("[WS RECEIVED]", msg.data);
ws.onclose = () => console.warn("[WS] Disconnected");

function sendToESP(message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        //console.log("[WS SEND]", message);
    } else {
        console.warn("WebSocket not ready:", message);
    }
}

// LED modes

let ledIntensity = parseFloat(document.getElementById('ledIntensity').value);
let ledMode = document.getElementById('ledMode').value;

const intensitySlider = document.getElementById('ledIntensity');
const intensityDisplay = document.getElementById('intensityValue');

intensitySlider.addEventListener('input', (e) => {
    ledIntensity = parseFloat(e.target.value);
    intensityDisplay.innerText = ledIntensity.toFixed(2);
});

document.getElementById('ledMode').addEventListener('change', (e) => { ledMode = e.target.value; });

function applyLedMode(midiNote, velocity = 127, isNoteOn = true) {
    const led = noteToLed[midiNote - 21];
    const hue = (midiNote - 21) / 87;
    const velocityFactor = velocity / 127;
    const baseIntensity = velocityFactor * ledIntensity;

    switch (ledMode) {
        case "scale-highlight":
            if (selectedScaleNotes.includes(midiNote)) {
                const { r, g, b } = hsvToRGB(hue, 1.0, isNoteOn ? baseIntensity : 0.1);
                sendToESP(`SET ${led} ${r} ${g} ${b}`);
            } else {
                sendToESP(`OFF ${led}`);
            }
            break;
        
        case "rainbow":
            if (isNoteOn) {
                const { r, g, b } = hsvToRGB(hue, 1.0, baseIntensity);
                sendToESP(`SET ${led} ${r} ${g} ${b}`);
            } else {
                sendToESP(`OFF ${led}`);
            }
            break;

        case "rainbow-invert":
            if (isNoteOn) {
                // Opposite hue
                const { r, g, b } = hsvToRGB((hue + 0.5) % 1.0, 1.0, baseIntensity);
                sendToESP(`SET ${led} ${r} ${g} ${b}`);
            } else {
                sendToESP(`OFF ${led}`);
            }
            break;

        case "always-on":
            // Always visible, pulse brighter when played
            const intensity = isNoteOn ? baseIntensity : 0.1 * ledIntensity;
            const { r, g, b } = hsvToRGB(hue, 1.0, intensity);
            sendToESP(`SET ${led} ${r} ${g} ${b}`);
            break;

        case "wave-pulse":
            if (isNoteOn) {
                const waveSize = 5; // nombre de notes autour
                const decay = 0.5;  // diminution d’intensité par note

                for (let offset = -waveSize; offset <= waveSize; offset++) {
                    const noteIndex = midiNote + offset;
                    if (noteIndex < 21 || noteIndex > 108) continue;

                    const led = noteToLed[noteIndex - 21];
                    const distance = Math.abs(offset);
                    const localIntensity = baseIntensity * Math.pow(decay, distance);
                    const localHue = (noteIndex - 21) / 87;
                    const { r, g, b } = hsvToRGB(localHue, 1.0, localIntensity);
                    sendToESP(`SET ${led} ${r} ${g} ${b}`);
                }
            } else {
                const waveSize = 5;
                for (let offset = -waveSize; offset <= waveSize; offset++) {
                    const noteIndex = midiNote + offset;
                    if (noteIndex < 21 || noteIndex > 108) continue;
                    const led = noteToLed[noteIndex - 21];
                    sendToESP(`OFF ${led}`);
                }
            }
            break;

        case "ripple":
            if (isNoteOn) {
                const waveSize = 10;      // How far the ripple spreads (in notes)
                const delayPerNote = 30;  // Delay in ms between each ring
                const decay = 0.6;        // Light intensity decay factor

                for (let offset = 0; offset <= waveSize; offset++) {
                    // Spread both directions
                    [offset, -offset].forEach(dir => {
                        const noteIndex = midiNote + dir;
                        if (noteIndex < 21 || noteIndex > 108) return;

                        const led = noteToLed[noteIndex - 21];
                        const hue = (noteIndex - 21) / 87;
                        const intensity = baseIntensity * Math.pow(decay, offset);
                        const { r, g, b } = hsvToRGB(hue, 1.0, intensity);

                        setTimeout(() => {
                            sendToESP(`SET ${led} ${r} ${g} ${b}`);
                        }, offset * delayPerNote);
                    });
                }
            } else {
                // Optional: fade out all LEDs in the ripple range
                const waveSize = 10;
                for (let offset = -waveSize; offset <= waveSize; offset++) {
                    const noteIndex = midiNote + offset;
                    if (noteIndex < 21 || noteIndex > 108) continue;
                    const led = noteToLed[noteIndex - 21];
                    sendToESP(`OFF ${led}`);
                }
            }
            break;
            
        case "white":
        default:
            if (isNoteOn) {
                sendToESP(`SET ${led} 8 8 8`); // blanc par défaut
            } else {
                sendToESP(`OFF ${led}`);
            }
            break;

        case "off":
            sendToESP(`OFF ${led}`);
            break;
    }
}

// Scales

let selectedScaleNotes = [];



// LED Utilities

function toggleAllLeds(intensity = 0.1) {
    ledsAreOn = !ledsAreOn;

    if (ledsAreOn) {
        noteToLed.forEach((led, i) => {
            const hue = i / noteToLed.length;
            const { r, g, b } = hsvToRGB(hue, 1.0, intensity);
            sendToESP(`SET ${led} ${r} ${g} ${b}`);
        });
    } else {
        noteToLed.forEach(led => {
            sendToESP(`OFF ${led}`);
        });
    }
}