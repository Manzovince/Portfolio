// === MIDI input (Web MIDI API) ===

import { press, lift, setPedal, allOff } from "./piano.js?v=20261015g";

let status = { state: "idle", names: [] };
const listeners = new Set();

export const midiStatus = () => status;
export const onMidiStatus = fn => listeners.add(fn);

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

function bind(access) {
    const update = () => {
        const inputs = [...access.inputs.values()];
        inputs.forEach(input => (input.onmidimessage = e => handleMidiMessage(e.data)));
        setStatus({ state: inputs.length ? "connected" : "none", names: inputs.map(i => i.name) });
    };
    access.onstatechange = update;
    update();
}

// Ask for MIDI access (may show a permission prompt)
export function connectMidi() {
    if (!navigator.requestMIDIAccess) {
        setStatus({ state: "unsupported", names: [] });
        return;
    }
    navigator.requestMIDIAccess().then(bind).catch(() => setStatus({ state: "denied", names: [] }));
}

// Connect straight away only if the visitor already granted access before,
// so that opening the page never starts with a permission prompt.
export async function initMidi() {
    if (!navigator.requestMIDIAccess) {
        setStatus({ state: "unsupported", names: [] });
        return;
    }
    try {
        const permission = await navigator.permissions.query({ name: "midi" });
        if (permission.state === "granted") return connectMidi();
        setStatus({ state: permission.state === "denied" ? "denied" : "prompt", names: [] });
    } catch {
        setStatus({ state: "prompt", names: [] });
    }
}
