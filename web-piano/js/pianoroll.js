// === PIANO ROLL ===

import { timelineNotes } from "./midi.js";
import { hsvToRGB } from "./utils.js";

export { drawPianoRoll, resizeCanvas };

const canvas = document.getElementById("pianoRoll");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 130;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const pixelsPerMs = 0.05; // vitesse de scroll

function drawPianoRoll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = performance.now();

    timelineNotes.forEach(n => {
        const duration = (n.endTime ?? now) - n.startTime; // durée soit connue, soit en cours
        const y = canvas.height - (now - n.startTime) * pixelsPerMs;
        const height = duration * pixelsPerMs;
        const totalWidth = 1286;
        const noteRange = 88;
        const noteWidth = totalWidth / noteRange;
        const offsetX = (canvas.width - totalWidth) / 2;
        const x = (n.note - 21) * noteWidth + offsetX;

        let color;
        const hue = (n.note - 21) / 87;
        const intensity = 1;

        switch (ledMode) {
            case "rainbow":
                color = hsvToRGB(hue, 1.0, intensity);
                break;

            case "octave-rainbow": {
                const octaveHue = (n.note % 12) / 12;
                color = hsvToRGB(octaveHue, 1.0, intensity);
                break;
            }

            default:
                color = hsvToRGB(hue, 1.0, intensity);
                break;
        }

        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.fillRect(x, y, noteWidth, height);
    });

    requestAnimationFrame(drawPianoRoll);
}