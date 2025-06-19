const keyboard = document.getElementById('keyboard');
const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteNamesFR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
let activeNotes = [];
let isMouseDown = false;
let useSolfège = true; // Default to solfège notation
let isWaitingForNextNote = false; // Flag to prevent multiple calls to playRandomNote

const notesDisplay = document.getElementById('notes');
const velocityDisplay = document.getElementById('velocity');
const intervalsDisplay = document.getElementById('intervals');
const chordDisplay = document.getElementById('chord'); // Added chord display element
const toggleNotationButton = document.getElementById('toggle-notation');
const keys = keyboard.getElementsByClassName('key');

// const chordPatterns = {
//     // Single Intervals
//     '0': '+ min Second',
//     '1': '+ Second',
//     '2': '+ min Third',
//     '3': '+ Third',
//     '4': '+ Fourth',
//     '5': '+ Augmented Fourth',
//     '6': '+ Fifth',
//     '7': '+ min Sixth',
//     '8': '+ Sixth',
//     '9': '+ min Seventh',
//     '10': '+ Seventh',
//     '11': '+ Octave',

//     // Triads
//     '3,2': 'Maj',
//     '2,3': 'min',
//     '2,2': 'Dim',
//     '3,3': 'Aug',
//     '1,4': 'sus2',
//     '4,1': 'sus4',

//     // Triad Inversions
//     '4,3': 'Maj (1st inv)',
//     '2,4': 'Maj (2nd inv)',
//     '4,2': 'min (1st inv)',
//     '3,4': 'min (2nd inv)',

//     // Sixth chords
//     '3,2,1': 'Maj 6th',
//     '2,3,1': 'min 6th',

//     // Seventh chords
//     '3,2,2': 'Dom 7th',
//     '3,2,3': 'Maj 7th',
//     '2,3,2': 'min 7th',
//     '2,2,2': 'Dim 7th',

//     // Add chords
//     '3,1,3': 'Maj Add 9',
//     '2,1,3': 'min Add 9',
//     '3,2,4': 'Maj Add 11',
//     '2,3,4': 'min Add 11',

//     // Ninth chords
//     '3,2,2,4': 'Dom 9th',
//     '3,2,3,3': 'Maj 9th',
//     '2,3,2,3': 'min 9th',
//     '2,2,2,3': 'Dim 9th',

//     // Eleventh chords
//     '3,2,2,4,3': 'Dom 11th',
//     '3,2,3,3,3': 'Maj 11th',
//     '2,3,2,3,3': 'min 11th',

//     // Thirteenth chords
//     '3,2,2,4,3,4': 'Dom 13th',
//     '3,2,3,3,3,4': 'Maj 13th',
//     '2,3,2,3,3,4': 'min 13th',

//     // Suspended chords with extensions
//     '1,4,2': 'sus2 7th',
//     '4,1,2': 'sus4 7th',
//     '1,4,3': 'sus2 9th',
//     '4,1,3': 'sus4 9th',

//     // Quartal and cluster voicings
//     '5,5': 'Quartal (Perfect 4ths)',
//     '1,1': 'Tone Cluster (2nds)',

//     // Open chords / wide voicings
//     '7,5': 'Open Fifth (Power chord)',
//     '3,5': 'Maj 10th',
//     '2,5': 'min 10th'
// };

const knownChords = {
    // Triades de base
    "0,4,7": "Major",
    "0,3,7": "minor",
    "0,3,6": "Diminished",
    "0,4,8": "Augmented",
    "0,5,7": "Sus4",
    "0,2,7": "Sus2",
    "0,7": "Power",

    // Accords à 7e
    "0,4,7,10": "7",
    "0,4,7,11": "Maj7",
    "0,3,7,10": "min7",
    "0,3,6,10": "m7♭5",
    "0,3,6,9": "dim7",
    "0,4,8,10": "Aug7",

    // Accords à 6e
    "0,4,7,9": "6",
    "0,3,7,9": "min6",

    // Accords add
    "0,4,7,2": "add9",
    "0,3,7,2": "min add9",
    "0,4,7,5": "add11",
    "0,3,7,5": "min add11",

    // Accords à 9e
    "0,4,7,10,2": "9",
    "0,3,7,10,2": "min9",
    "0,4,7,11,2": "Maj9",
    "0,3,6,10,2": "m7♭5 add9",

    // Accords à 11e
    "0,4,7,10,2,5": "11",
    "0,3,7,10,2,5": "min11",
    "0,4,7,11,2,5": "Maj11",

    // Accords à 13e
    "0,4,7,10,2,5,9": "13",
    "0,3,7,10,2,5,9": "min13",
    "0,4,7,11,2,5,9": "Maj13",

    // Suspended enrichis
    "0,5,7,10": "Sus4 7",
    "0,2,7,10": "Sus2 7",
    "0,5,7,2": "Sus4 9",
    "0,2,7,4": "Sus2 add11",

    // Extensions alternatives
    "0,4,6,10": "7♭5",
    "0,4,8,11": "Maj7♯5",
    "0,3,6,11": "minMaj7♭5",
    "0,3,7,11": "minMaj7",

    // Clusters & modernes
    "0,1,2": "Cluster (C C♯ D)",
    "0,2,4": "Quartal",
    "0,5,10": "Six/Nine",
    "0,2,5,9": "Sus2/6",
    "0,3,6,8": "Half-dim add♯9",

    // Ambigus & autres
    "0,2,4,7": "Lydian triad",
    "0,4,6": "Augmented ♭5",
    "0,3,8": "Minor ♯5",
    "0,3,7,11": "minMaj7",
    "0,4,7,1": "Maj add♯9"
};

let ledIntensity = 0.5;

document.getElementById('settingsToggle').addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.toggle('open');
});

document.getElementById('intensitySlider').addEventListener('input', function (e) {
    ledIntensity = parseFloat(e.target.value);
});

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

ws.onopen = () => console.log("[WS] Connected to ESP32");
ws.onerror = (e) => console.error("[WS ERROR]", e);
ws.onmessage = (msg) => console.log("[WS RECEIVED]", msg.data);
ws.onclose = () => console.warn("[WS] Disconnected");

function hsvToRGB(h, s = 1.0, v = 1.0) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function sendToESP(message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        console.log("[WS SEND]", message);
    } else {
        console.warn("WebSocket not ready:", message);
    }
}

var midiAccess = null;
var midiInputs = null;
var midiOutputs = null;

function setup() {
    if (window.navigator.requestMIDIAccess) {
        window.navigator.requestMIDIAccess().then(success, function () { console.log("requestMIDIAccess() failed."); });
    } else {
        console.log("Web MIDI API is not available on your browser.");
    }

    function setupEventHandler() {
        var inputs = null;
        if (typeof midiAccess.inputs === "function") {
            inputs = midiAccess.inputs();
        } else {
            var iter = midiAccess.inputs.values();
            inputs = [];
            for (var o = iter.next(); !o.done; o = iter.next()) {
                inputs.push(o.value);
            }
        }
        for (var port = 0; port < inputs.length; port++) {

            (function () {
                var _port = port;
                inputs[_port].onmidimessage = function (event) {
                    console.log(event.data);
                    let command = event.data[0];
                    let note = event.data[1];
                    let velocity = (event.data.length > 2) ? event.data[2] : 0;

                    switch (command) {
                        case 144: // noteOn
                            if (velocity > 0) {
                                noteOn(note, velocity);
                            } else {
                                noteOff(note);
                            }
                            break;
                        case 128: // noteOff
                            noteOff(note);
                            break;
                    }
                };

                inputs[_port].ondisconnect = function (event) {
                    var str = "input port:" + _port + ", disconnected.";
                    console.log(str);
                };
            }());
        }

        var outputs = null;
        if (typeof midiAccess.outputs === "function") {
            outputs = midiAccess.outputs();
        } else {
            var iter = midiAccess.outputs.values();
            outputs = [];
            for (var o = iter.next(); !o.done; o = iter.next()) {
                outputs.push(o.value);
            }
        }
        for (var port = 0; port < outputs.length; port++) {
            (function () {
                var _port = port;
                outputs[_port].ondisconnect = function (event) {
                    var str = "output port:" + _port + ", disconnected.";
                    console.log(str);
                };
            }());
        }

        midiInputs = inputs;
        midiOutputs = outputs;
    }

    function success(access) {
        midiAccess = access;

        midiAccess.onconnect = function (event) {
            var str = "port: " + event.port.name + ", connected.";
            console.log(str);

            setupEventHandler();
        }

        setupEventHandler();
    }
}

window.onload = function () {
    setup();
}

// Play sound for a given MIDI note
function playSound(midiNote, forcePlay = false) {
    const enableSound = document.getElementById('enable-sound').checked;
    if (!enableSound && !forcePlay) return; // Do not play sound if the toggle is off and not forced

    const noteName = noteNames[midiNote % 12] + Math.floor(midiNote / 12 - 1);
    const audio = new Audio(`./keys/${noteName}.mp3`);
    audio.play();
}

// Note On-Off
function noteOn(midiNote, velocity) {
    const noteName = noteNames[midiNote % 12] + Math.floor(midiNote / 12 - 1);
    activeNotes.push({ name: noteName, midiNote: midiNote, velocity: (velocity / 127).toFixed(1) });
    playSound(midiNote);
    updateOutput();
    updateKeyboard();

    if (exerciseActive) {
        if (midiNote === currentNote && !isWaitingForNextNote) {
            isWaitingForNextNote = true; // Set the flag
            const key = keyboard.querySelector(`[data-note="${midiNote}"]`);
            if (key) key.classList.add('correct'); // Highlight the correct key
            setTimeout(() => {
                if (key) key.classList.remove('correct');
                playRandomNote();
                isWaitingForNextNote = false; // Reset the flag
            }, 3000);
        } else if (midiNote !== currentNote) {
            const key = keyboard.querySelector(`[data-note="${midiNote}"]`);
            if (key) key.classList.add('incorrect');
        }
    }

    const led = noteToLed[midiNote - 21];
    const hue = (midiNote - 21) / 87;
    const { r, g, b } = hsvToRGB(hue, 1.0, (velocity / 127) * ledIntensity);
    sendToESP(`SET ${led} ${r} ${g} ${b}`);
}

function noteOff(midiNote) {
    activeNotes = activeNotes.filter(n => n.midiNote !== midiNote);
    updateOutput();
    updateKeyboard();

    const led = noteToLed[midiNote - 21];
    sendToESP(`OFF ${led}`);
}

function NotesToChordName(notes) {
    if (notes.length === 0) return "";
    if (notes.length === 1) {
        const noteName = useSolfège ? noteNamesFR[notes[0].midiNote % 12] : noteNames[notes[0].midiNote % 12];
        return noteName;
    }
    const intervals = calculateIntervals(notes);
    const pattern = intervals.join(',');
    var rootNote = "";
    if (pattern && chordPatterns[pattern]) {
        if (chordPatterns[pattern].includes('1st inv')) {
            rootNote = useSolfège ? noteNamesFR[notes[1].midiNote % 12] : noteNames[notes[1].midiNote % 12];
        } else if (chordPatterns[pattern].includes('2nd inv')) {
            rootNote = useSolfège ? noteNamesFR[notes[2].midiNote % 12] : noteNames[notes[2].midiNote % 12];
        }
        else {
            rootNote = useSolfège ? noteNamesFR[notes[0].midiNote % 12] : noteNames[notes[0].midiNote % 12];
        }
    } else {
        rootNote = useSolfège ? noteNamesFR[notes[0].midiNote % 12] : noteNames[notes[0].midiNote % 12];
    }
    return `${rootNote} ${chordPatterns[pattern] || '?!'}`;
}

function detectChord(noteSet, useSolfège = true) {
    if (noteSet.length < 2) return null;

    // Extraire les pitch classes et trier
    const pitches = noteSet.map(n => n.midiNote % 12).sort((a, b) => a - b);

    // Pour chaque note comme fondamentale potentielle
    for (let i = 0; i < pitches.length; i++) {
        const root = pitches[i];
        const intervals = pitches.map(p => (p - root + 12) % 12).sort((a, b) => a - b);
        const key = "0," + intervals.slice(1).join(",");
        if (knownChords[key]) {
            const noteName = useSolfège ? noteNamesFR[root] : noteNames[root];
            return `${noteName} ${knownChords[key]}`;
        }
    }

    return null;
}

function updateOutput() {
    activeNotes.sort((a, b) => a.midiNote - b.midiNote);

    //chordDisplay.textContent = NotesToChordName(activeNotes) || '♪';
    chordDisplay.textContent = detectChord(activeNotes, useSolfège) || '♪';
    notesDisplay.textContent = activeNotes
        .map(note => useSolfège ? noteNamesFR[note.midiNote % 12] : note.name)
        .join(" ") || ' ';
    velocityDisplay.textContent = activeNotes.map(note => note.velocity).join(" ");
    intervalsDisplay.textContent = calculateIntervals(activeNotes).join('\t') || ' ';
}

const calculateIntervals = notes => notes.slice(0, -1).map((note, i) => notes[i + 1].midiNote - note.midiNote - 1);

// Piano keyboard generation
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
    keyboard.innerHTML = '';
    const startNote = 21; // MIDI note for A0
    const endNote = 101; // MIDI note for C8

    for (let midiNote = startNote; midiNote <= endNote; midiNote++) {
        const key = document.createElement('div');
        const isBlack = [1, 3, 6, 8, 10].includes(midiNote % 12); // Black keys based on MIDI note modulo 12
        key.className = `key ${isBlack ? 'black' : 'white'}`;
        key.dataset.note = midiNote;

        // Add corresponding keyboard letter if it exists in keyLabels
        if (keyLabels[midiNote]) {
            key.textContent = keyLabels[midiNote];
        }

        keyboard.appendChild(key);
    }
}

function updateKeyboard() {
    for (let key of keys) {
        key.classList.remove('active');
    }
    for (let note of activeNotes) {
        const key = keyboard.querySelector(`[data-note="${note.midiNote}"]`);
        if (key) key.classList.add('active');
    }
}

createKeyboard();
window.addEventListener('resize', createKeyboard);

// Interactive keyboard
document.addEventListener('keydown', (event) => {
    if (event.repeat) return;

    if (exerciseActive && event.code === 'Space') {
        replayNote(); // Replay the sound when spacebar is pressed
        event.preventDefault(); // Prevent default spacebar behavior (e.g., scrolling)
    } if (exerciseActive && event.key.toLowerCase() === 'n') {
        playRandomNote(); // Replay the sound when spacebar is pressed
        event.preventDefault(); // Prevent default spacebar behavior (e.g., scrolling)
    } else if (keyboardMap[event.keyCode]) {
        noteOn(keyboardMap[event.keyCode], 50);
    }
});

document.addEventListener('keyup', handleKeyUp);

function handleKeyUp(event) { noteOff(keyboardMap[event.keyCode]); }

// Click on keys
keyboard.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    if (e.target.classList.contains('key')) {
        const midiNote = parseInt(e.target.getAttribute('data-note'));
        noteOn(midiNote, 50);
    }
});

keyboard.addEventListener('mouseup', () => {
    isMouseDown = false;
    Array.from(keys).forEach(key => {
        if (key.classList.contains('active')) {
            const midiNote = parseInt(key.getAttribute('data-note'));
            noteOff(midiNote);
        }
    });
});

keyboard.addEventListener('mousemove', (e) => {
    if (isMouseDown) {
        Array.from(keys).forEach(key => {
            const midiNote = parseInt(key.getAttribute('data-note'));
            if (e.target === key && !activeNotes.some(note => note.midiNote === midiNote)) {
                noteOn(midiNote, 50); // Play the note if hovered
            } else if (e.target !== key && activeNotes.some(note => note.midiNote === midiNote)) {
                noteOff(midiNote); // Release the note if not hovered
            }
        });
    }
});

// Toggle notation
toggleNotationButton.addEventListener('click', () => {
    useSolfège = !useSolfège;
    toggleNotationButton.textContent = useSolfège ? "Switch to English Notation" : "Switch to Solfège Notation";
    updateOutput(); // Update the displayed notes
});

// Note exercise mode
let exerciseActive = false;
let currentNote = null;

const startExerciseButton = document.getElementById('start-exercise');
const stopExerciseButton = document.getElementById('stop-exercise');
const replayNoteButton = document.getElementById('replay-note');
const revealNoteButton = document.getElementById('reveal-note');
const newNoteButton = document.getElementById('new-note');

startExerciseButton.addEventListener('click', startExercise);
stopExerciseButton.addEventListener('click', stopExercise);
replayNoteButton.addEventListener('click', replayNote);
revealNoteButton.addEventListener('click', revealNote);
newNoteButton.addEventListener('click', playRandomNote);

function startExercise() {
    exerciseActive = true;
    startExerciseButton.style.display = 'none';
    stopExerciseButton.style.display = 'flex';
    replayNoteButton.style.display = 'flex';
    revealNoteButton.style.display = 'flex';
    newNoteButton.style.display = 'flex';
    playRandomNote();
}

function stopExercise() {
    exerciseActive = false;
    startExerciseButton.style.display = 'flex';
    stopExerciseButton.style.display = 'none';
    replayNoteButton.style.display = 'none';
    revealNoteButton.style.display = 'none';
    newNoteButton.style.display = 'none';
    clearKeyboardHighlights();
}

function playRandomNote() {
    const randomMidiNote = Math.floor(Math.random() * (101 - 21 + 1)) + 21; // Random MIDI note between A0 (21) and C8 (108)
    document.getElementById('chord').textContent = '?';
    document.getElementById('notes').textContent = ' ';
    currentNote = randomMidiNote;
    playSound(randomMidiNote, true); // Force sound to play
    clearKeyboardHighlights();
}

function replayNote() {
    if (currentNote !== null) {
        document.getElementById('chord').textContent = '?';
        playSound(currentNote, true); // Force sound to play
    }
}

function revealNote() {
    if (currentNote !== null) {
        const key = keyboard.querySelector(`[data-note="${currentNote}"]`);
        if (key) key.classList.add('correct');
        const noteName = useSolfège ? noteNamesFR[currentNote % 12] : noteNames[currentNote % 12];
        chordDisplay.textContent = noteName; // Display the chord name
        playSound(currentNote, true); // Force sound to play
    }
}

function clearKeyboardHighlights() {
    Array.from(keys).forEach(key => key.classList.remove('correct', 'incorrect'));
}
