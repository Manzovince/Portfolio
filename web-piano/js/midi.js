// === MIDI SETUP AND NOTE TRACKING ===

import { updateUI } from './ui.js';
import { playNote, stopNote } from './sound.js';
import { applyLedMode } from './leds.js'

export { initMIDI, noteOn, noteOff };
export let activeNotes = new Map(); // {note: {startTime, velocity}}
export let timelineNotes = []; // Array of {note, startTime, endTime, velocity}

const MAX_TIMELINE_NOTES = 500;

let sustainPedal = false;

function initMIDI() {
    if (!navigator.requestMIDIAccess) {
        console.warn("Web MIDI API not supported.");
        // return;
    }
    navigator.requestMIDIAccess().then(midiAccess => {
        for (const input of midiAccess.inputs.values()) {
            input.onmidimessage = handleMIDIMessage;
        }
    }).catch(console.error);
}

function noteOn(note, velocity, time) {
    activeNotes.set(note, { startTime: time, velocity });

    timelineNotes.push({
        note,
        startTime: time,
        endTime: null, // will be updated later
        velocity
    });

    if (timelineNotes.length > MAX_TIMELINE_NOTES) {
        timelineNotes.splice(0, timelineNotes.length - MAX_TIMELINE_NOTES);
    }

    playNote(note);
    updateUI();
    applyLedMode(note, velocity, true);
}

function noteOff(note, time) {
    if (sustainPedal) return; // defer release until pedal up
    endNote(note, time);
    stopNote(note);
}

function handleMIDIMessage(event) {
    const [status, data1, data2] = event.data;
    const command = status & 0xf0;
    const channel = status & 0x0f;
    const now = performance.now();

    switch (command) {
        case 0x90: // Note on
            if (data2 > 0) {
                noteOn(data1, data2, now);
            } else {
                noteOff(data1, now);
            }
            break;
        case 0x80: // Note off
            noteOff(data1, now);
            break;
        case 0xB0: // Control change (e.g. sustain pedal)
            if (data1 === 64) { // sustain pedal
                handleSustain(data2 >= 64, now);
            }
            break;
    }
}

function endNote(note, time) {
    const entries = timelineNotes.filter(n => n.note === note && n.endTime === null);
    entries.forEach(entry => entry.endTime = time);

    activeNotes.delete(note);
    updateUI();
    applyLedMode(note, 0, false);
}

function handleSustain(isOn, time) {
    sustainPedal = isOn;
    if (!sustainPedal) {
        // release all sustained notes
        for (let note of [...activeNotes.keys()]) {
            endNote(note, time);
        }
    }
}