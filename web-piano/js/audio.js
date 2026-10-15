// === Sound: piano samples and simple synth voices, through Web Audio ===

import { subscribe, soundingNotes } from "./piano.js?v=20261015c";
import { settings, onSettingChange } from "./settings.js?v=20261015c";

const SAMPLE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const WAVE_LEVEL = { sine: 0.5, triangle: 0.5, square: 0.16, sawtooth: 0.2 };
const SYNTH = { attack: 0.008, decay: 0.25, sustain: 0.55, release: 0.35 };
const PIANO_RELEASE = 0.25; // seconds for the damper to stop a sample

let ctx = null;
let master = null;
const samples = new Map(); // midi -> Promise<AudioBuffer>
const voices = new Map();  // midi -> voice
const stateListeners = new Set();

function ensureContext() {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = settings.volume;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 8;
    master.connect(limiter).connect(ctx.destination);
    ctx.addEventListener("statechange", () => stateListeners.forEach(fn => fn()));
    return ctx;
}

// Browsers only start audio after a user gesture: call this from one
export function unlockAudio() {
    if (!ensureContext()) return;
    if (ctx.state !== "running") ctx.resume().then(preloadSamples).catch(() => {});
}

export const audioIsRunning = () => ctx?.state === "running";
export const onAudioStateChange = fn => stateListeners.add(fn);

function loadSample(midi) {
    if (!samples.has(midi)) {
        const name = SAMPLE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
        const promise = fetch(`sound/piano/${name}.mp3`)
            .then(res => {
                if (!res.ok) throw new Error(`${name}: ${res.status}`);
                return res.arrayBuffer();
            })
            .then(data => ctx.decodeAudioData(data))
            .catch(err => {
                samples.delete(midi); // allow a later retry
                throw err;
            });
        samples.set(midi, promise);
    }
    return samples.get(midi);
}

// Decode the middle of the keyboard ahead of time, a few notes per idle slot
let preloaded = false;
function preloadSamples() {
    if (preloaded || settings.instrument !== "piano" || !settings.sound) return;
    preloaded = true;
    const queue = [];
    for (let d = 0; d <= 24; d++) queue.push(60 + d, 60 - d - 1);
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 50));
    const step = () => {
        const batch = queue.splice(0, 4);
        if (!batch.length) return;
        Promise.allSettled(batch.map(loadSample)).then(() => idle(step));
    };
    idle(step);
}

const velocityGain = velocity => 0.06 + 0.94 * Math.pow(velocity / 127, 1.6);

function startPiano(midi, velocity) {
    const voice = { released: false, nodes: null };
    loadSample(midi).then(buffer => {
        // Too late: the key was already let go while the sample loaded
        if (voice.released || voices.get(midi) !== voice) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = velocityGain(velocity);
        src.connect(gain).connect(master);
        src.start();
        src.onended = () => {
            gain.disconnect();
            if (voices.get(midi) === voice) voices.delete(midi);
        };
        voice.nodes = { src, gain, release: PIANO_RELEASE };
    }).catch(() => {});
    return voice;
}

function startSynth(midi, velocity, type) {
    const now = ctx.currentTime;
    const peak = velocityGain(velocity) * WAVE_LEVEL[type];
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + SYNTH.attack);
    gain.gain.setTargetAtTime(peak * SYNTH.sustain, now + SYNTH.attack, SYNTH.decay / 3);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.onended = () => gain.disconnect();
    return { released: false, nodes: { src: osc, gain, release: SYNTH.release } };
}

function release(voice) {
    voice.released = true;
    if (!voice.nodes) return;
    const { src, gain, release } = voice.nodes;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.setTargetAtTime(0, now, release / 4);
    try {
        src.stop(now + release);
    } catch { /* already stopped */ }
}

function stopVoice(midi) {
    const voice = voices.get(midi);
    if (!voice) return;
    voices.delete(midi);
    release(voice);
}

function stopAll() {
    for (const midi of [...voices.keys()]) stopVoice(midi);
}

subscribe(event => {
    if (event.type === "on") {
        stopVoice(event.midi);
        if (!settings.sound || !ensureContext() || ctx.state !== "running") return;
        const voice = settings.instrument === "piano"
            ? startPiano(event.midi, event.velocity)
            : startSynth(event.midi, event.velocity, settings.instrument);
        voices.set(event.midi, voice);
    } else if (event.type === "off") {
        stopVoice(event.midi);
    }
});

onSettingChange((key, value) => {
    if (key === "volume" && master) master.gain.setTargetAtTime(value, ctx.currentTime, 0.02);
    if (key === "sound" || key === "instrument") {
        stopAll();
        if (value && audioIsRunning()) preloadSamples();
    }
});

// Exposed for the UI: are notes being played that we cannot hear yet?
export const needsUnlock = () => settings.sound && !audioIsRunning() && soundingNotes().length > 0;
