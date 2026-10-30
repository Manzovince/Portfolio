// === Waveform: a faint oscilloscope of what is sounding, behind the roll ===

import { subscribe } from "./piano.js?v=20261018a";
import { settings, onSettingChange } from "./settings.js?v=20261018a";
import { getAnalyser, hasVoices } from "./audio.js?v=20261018a";

const WINDOW = 1024;     // samples drawn across the width (~21 ms at 48 kHz)
const SILENCE = 0.0015;  // peak below which a frame counts as quiet
const QUIET_FRAMES = 20; // quiet frames before the loop goes to sleep

let canvas, ctx2d;
let size = { width: 0, height: 0 };
let data = null;
let gain = 1;            // smoothed auto-gain, so soft notes still show
let quiet = 0;
let running = false;

function fit() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    size = { width, height };
}

// Start at a rising zero crossing so periodic sounds stand still
function trigger(samples) {
    const limit = samples.length - WINDOW;
    for (let i = 1; i < limit; i++) {
        if (samples[i - 1] < 0 && samples[i] >= 0) return i;
    }
    return 0;
}

function draw(analyser) {
    if (!data || data.length !== analyser.fftSize) data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    let peak = 0;
    for (const v of data) peak = Math.max(peak, Math.abs(v));

    const { width, height } = size;
    ctx2d.clearRect(0, 0, width, height);
    if (peak < SILENCE) return false;

    gain += (Math.min(6, 0.7 / peak) - gain) * 0.08;
    const start = trigger(data);
    const mid = height * 0.45;
    const amp = height * 0.3 * gain;

    // Fade in and out at the edges so the line has no hard ends
    const fade = ctx2d.createLinearGradient(0, 0, width, 0);
    fade.addColorStop(0, "rgb(68 172 163 / 0)");
    fade.addColorStop(0.2, "rgb(68 172 163 / 0.28)");
    fade.addColorStop(0.8, "rgb(68 172 163 / 0.28)");
    fade.addColorStop(1, "rgb(68 172 163 / 0)");
    ctx2d.strokeStyle = fade;
    ctx2d.lineWidth = 1.5;
    ctx2d.lineJoin = "round";
    ctx2d.beginPath();
    for (let i = 0; i < WINDOW; i++) {
        const x = (i / (WINDOW - 1)) * width;
        const y = mid - data[start + i] * amp;
        if (i) ctx2d.lineTo(x, y);
        else ctx2d.moveTo(x, y);
    }
    ctx2d.stroke();
    return true;
}

function loop() {
    const analyser = settings.showWave && getAnalyser();
    if (!analyser) {
        ctx2d.clearRect(0, 0, size.width, size.height);
        running = false;
        return;
    }
    quiet = draw(analyser) || hasVoices() ? 0 : quiet + 1;
    if (quiet > QUIET_FRAMES) {
        running = false;
        return;
    }
    requestAnimationFrame(loop);
}

function wake() {
    if (running || !settings.showWave) return;
    running = true;
    quiet = 0;
    requestAnimationFrame(loop);
}

export function initWave(el) {
    canvas = el;
    ctx2d = el.getContext("2d");
    canvas.hidden = !settings.showWave;
    new ResizeObserver(fit).observe(canvas);
    fit();
}

subscribe(event => {
    if (event.type === "on") wake();
});

onSettingChange(key => {
    if (key !== "showWave") return;
    canvas.hidden = !settings.showWave;
    if (settings.showWave) fit();
});
