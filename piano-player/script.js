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

// Update informations
const chordPatterns = {
    // Single Intervals
    '0': '+ min Second',
    '1': '+ Second',
    '2': '+ min Third',
    '3': '+ Third',
    '4': '+ Fourth',
    '5': '+ Augmented Fourth',
    '6': '+ Fifth',
    '7': '+ min Sixth',
    '8': '+ Sixth',
    '9': '+ min Seventh',
    '10': '+ Seventh',
    '11': '+ Octave',

    // Triads
    '3,2': 'Maj',
    '2,3': 'min',
    '2,2': 'Dim',
    '3,3': 'Aug',
    '1,4': 'sus2',
    '4,1': 'sus4',

    // Triad Inversions
    '2,7': 'Maj 1st Inv',
    '7,3': 'Maj 2nd Inv',
    '3,7': 'min 1st Inv',
    '7,2': 'min 2nd Inv',

    // Sixth chords
    '3,2,1': 'Maj 6th',
    '2,3,1': 'min 6th',

    // Seventh chords
    '3,2,2': 'Dom 7th',
    '3,2,3': 'Maj 7th',
    '2,3,2': 'min 7th',
    '2,2,2': 'Dim 7th',

    // Seventh chord inversions
    '2,2,3': 'Dom 7th (1st Inv)',
    '2,3,2': 'Dom 7th (2nd Inv)',
    '3,2,2': 'Dom 7th (3rd Inv)',

    // Add chords
    '3,1,3': 'Maj Add 9',
    '2,1,3': 'min Add 9',
    '3,2,4': 'Maj Add 11',
    '2,3,4': 'min Add 11',

    // Ninth chords
    '3,2,2,4': 'Dom 9th',
    '3,2,3,3': 'Maj 9th',
    '2,3,2,3': 'min 9th',
    '2,2,2,3': 'Dim 9th',

    // Eleventh chords
    '3,2,2,4,3': 'Dom 11th',
    '3,2,3,3,3': 'Maj 11th',
    '2,3,2,3,3': 'min 11th',

    // Thirteenth chords
    '3,2,2,4,3,4': 'Dom 13th',
    '3,2,3,3,3,4': 'Maj 13th',
    '2,3,2,3,3,4': 'min 13th',

    // Suspended chords with extensions
    '1,4,2': 'sus2 7th',
    '4,1,2': 'sus4 7th',
    '1,4,3': 'sus2 9th',
    '4,1,3': 'sus4 9th',

    // Quartal and cluster voicings
    '5,5': 'Quartal (Perfect 4ths)',
    '1,1': 'Tone Cluster (2nds)',

    // Open chords / wide voicings
    '7,5': 'Open Fifth (Power chord)',
    '3,5': 'Maj 10th',
    '2,5': 'min 10th'
};

// MIDI input
document.addEventListener('DOMContentLoaded', () => {
    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
});

function onMIDISuccess(midiAccess) {
    console.log("MIDI access granted. Waiting for MIDI input...");
    for (let input of midiAccess.inputs.values()) {
        input.onmidimessage = getMIDIMessage;
    }
}

function onMIDIFailure(error) {
    console.log("Failed to get MIDI access - ", error);
}

function getMIDIMessage(message) {
    // console.log(message.data);
    let command = message.data[0];
    let note = message.data[1];
    let velocity = (message.data.length > 2) ? message.data[2] : 0;

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
}

// WebMIDI JS
function enableWebMIDIJS() {

    WebMidi
    .enable({ sysex: true })
    .then(() => console.log("WebMidi with sysex enabled!"))
    .catch(err => alert(err));

    // Inputs
    WebMidi.inputs.forEach(input => console.log(input.manufacturer, ' - ', input.name));

    // Outputs
    WebMidi.outputs.forEach(output => console.log(output.manufacturer, ' - ', output.name));

    const myInput = WebMidi.getInputByName("Digital Piano");
    console.log(myInput);

    myInput.addListener("noteon", e => {
        console.log(e.note.identifier, e.note.number, e.note.attack);
        noteOn(e.note.number, e.note.attack);
    })
}

// Play sound for a given MIDI note
function playSound(midiNote) {
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
    }

function noteOff(midiNote) {
        activeNotes = activeNotes.filter(n => n.midiNote !== midiNote);
        updateOutput();
        updateKeyboard();
    }

function NotesToChordName(notes) {
        if (notes.length === 0) return "";
        if (notes.length === 1) {
            const noteName = useSolfège ? noteNamesFR[notes[0].midiNote % 12] : noteNames[notes[0].midiNote % 12];
            return noteName;
        }
        const intervals = calculateIntervals(notes);
        const pattern = intervals.join(',');
        const rootNote = useSolfège ? noteNamesFR[notes[0].midiNote % 12] : noteNames[notes[0].midiNote % 12];
        return `${rootNote} ${chordPatterns[pattern] || ''}`;
    }

function updateOutput() {
        activeNotes.sort((a, b) => a.midiNote - b.midiNote);

        notesDisplay.textContent = activeNotes
            .map(note => useSolfège ? noteNamesFR[note.midiNote % 12] : note.name)
            .join(" ");
        velocityDisplay.textContent = activeNotes.map(note => note.velocity).join(" ");
        intervalsDisplay.textContent = calculateIntervals(activeNotes).join('\t');
        chordDisplay.textContent = NotesToChordName(activeNotes); // Display chord name
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
    const screenWidth = window.innerWidth;
    const octaves = Math.max(1, Math.min(7, Math.floor(screenWidth / 210))); // 7 white keys per octave, ~30px each

    for (let octave = 0; octave < octaves; octave++) {
        for (let i = 0; i < 12; i++) {
            const key = document.createElement('div');
            const isBlack = [1, 3, 6, 8, 10].includes(i);
            key.className = `key ${isBlack ? 'black' : 'white'}`;
            const midiNote = octave * 12 + i + 24; // Start from A0 (MIDI note 21)
            key.dataset.note = midiNote;

            // Add corresponding keyboard letter if it exists in keyLabels
            if (keyLabels[midiNote]) {
                key.textContent = keyLabels[midiNote];
            }

            keyboard.appendChild(key);
        }
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
    const randomMidiNote = Math.floor(Math.random() * (108 - 21 + 1)) + 21; // Random MIDI note between A0 (21) and C8 (108)
    currentNote = randomMidiNote;
    playSound(randomMidiNote);
    clearKeyboardHighlights();
}

function replayNote() {
    if (currentNote !== null) {
        playSound(currentNote);
    }
}

function revealNote() {
    if (currentNote !== null) {
        const key = keyboard.querySelector(`[data-note="${currentNote}"]`);
        if (key) key.classList.add('correct');
        const noteName = useSolfège ? noteNamesFR[currentNote % 12] : noteNames[currentNote % 12];
        chordDisplay.textContent = noteName; // Display the chord name
        playSound(currentNote);
    }
}

function clearKeyboardHighlights() {
    Array.from(keys).forEach(key => key.classList.remove('correct', 'incorrect'));
}
