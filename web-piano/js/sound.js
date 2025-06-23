export { playNote, stopNote, setInstrument, toggleSound, audioContext };

// === AUDIO CONTEXT ===
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// === ADSR ENVELOPE (in seconds) ===
const ADSR = {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.2,
    release: 0.8
};

let currentInstrument = 'piano';
let soundEnabled = false;
const audioCache = new Map();
const activeOscillators = new Map();

function noteNameFromMidi(midiNote) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const name = names[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return name.replace("#", "♯").replace("b", "♭").replace("♯", "#").replace("♭", "b") + octave;
}

function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function toggleSound(enabled) {
    soundEnabled = enabled;
}

function setInstrument(name) {
    currentInstrument = name;
    audioCache.clear();
}

function playNote(midiNote) {
    if (!soundEnabled) return;

    if (["sine", "square", "sawtooth", "triangle"].includes(currentInstrument)) {
        const context = audioContext;
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = currentInstrument;
        osc.frequency.setValueAtTime(midiToFreq(midiNote), context.currentTime);

        const now = context.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + ADSR.attack);
        gain.gain.linearRampToValueAtTime(ADSR.sustain, now + ADSR.attack + ADSR.decay);

        osc.connect(gain).connect(context.destination);
        osc.start();

        activeOscillators.set(midiNote, { osc, gain, context });
        return;
    }

    const noteName = noteNameFromMidi(midiNote);
    const path = `sound/${currentInstrument}/${noteName}.mp3`;

    if (!audioCache.has(path)) {
        const audio = new Audio(path);
        audioCache.set(path, audio);
    }

    const audio = audioCache.get(path).cloneNode();
    audio.currentTime = 0;
    audio.play();
}

function stopNote(midiNote) {
    if (!soundEnabled) return;

    if (activeOscillators.has(midiNote)) {
        const { osc, gain, context } = activeOscillators.get(midiNote);
        const now = context.currentTime;

        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + ADSR.release);

        osc.stop(now + ADSR.release);
        activeOscillators.delete(midiNote);
    }
}
