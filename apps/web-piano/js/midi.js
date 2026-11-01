// === MIDI input (Web MIDI API) ===

import { press, lift, setPedal, allOff } from "./piano.js?v=20261101a";
import { settings } from "./settings.js?v=20261101a";

let status = { state: "idle", names: [] };
const listeners = new Set();
let access = null;
const accessListeners = new Set();

export const midiStatus = () => status;
export const onMidiStatus = fn => listeners.add(fn);
// The MIDIAccess object, shared with the LUMI module which sends to the outputs
export const midiAccess = () => access;
export const onMidiAccess = fn => accessListeners.add(fn);

function setStatus(next) {
    status = next;
    listeners.forEach(fn => fn(status));
}

export function handleMidiMessage(data) {
    const [statusByte, data1, data2 = 0] = data;
    switch (statusByte & 0xf0) {
        case 0x90: // note on (velocity 0 means note off)
            if (data2 > 0) press(data1, data2, "midi");
            else lift(data1);
            break;
        case 0x80: // note off
            lift(data1);
            break;
        case 0xb0: // control change
            if (data1 === 64) setPedal(data2 >= 64); // sustain pedal
            if (data1 === 120 || data1 === 123) allOff(); // all sound / all notes off
            break;
    }
}

function bind(next) {
    if (access && access !== next) {
        access.onstatechange = null;
        access.inputs.forEach(input => (input.onmidimessage = null));
    }
    access = next;
    const update = () => {
        const inputs = [...access.inputs.values()];
        inputs.forEach(input => (input.onmidimessage = e => handleMidiMessage(e.data)));
        setStatus({ state: inputs.length ? "connected" : "none", names: inputs.map(i => i.name) });
        accessListeners.forEach(fn => fn(access));
    };
    access.onstatechange = update;
    update();
}

// Ask for MIDI access (may show a permission prompt). Lighting a LUMI needs
// SysEx, a separate permission: if it is refused, plain MIDI input still works.
export function connectMidi(sysex = settings.lumiEnabled) {
    if (!navigator.requestMIDIAccess) {
        setStatus({ state: "unsupported", names: [] });
        return;
    }
    navigator.requestMIDIAccess({ sysex }).then(bind).catch(() => {
        if (sysex) return connectMidi(false);
        setStatus({ state: "denied", names: [] });
    });
}

// Connect straight away only if the visitor already granted access before,
// so that opening the page never starts with a permission prompt.
export async function initMidi() {
    if (!navigator.requestMIDIAccess) {
        setStatus({ state: "unsupported", names: [] });
        return;
    }
    try {
        if (settings.lumiEnabled) {
            const sysex = await navigator.permissions.query({ name: "midi", sysex: true });
            if (sysex.state === "granted") return connectMidi(true);
        }
        const permission = await navigator.permissions.query({ name: "midi" });
        if (permission.state === "granted") return connectMidi(false);
        setStatus({ state: permission.state === "denied" ? "denied" : "prompt", names: [] });
    } catch {
        setStatus({ state: "prompt", names: [] });
    }
}
