// === Music theory: note spelling, chords, intervals and scales ===
//
// Notes are spelled as { letter, acc } (letter 0-6 = C..B, acc in semitones)
// so that a chord's tones get the right letter names: E♭ in C minor, D♯ in
// B major, and so on - rather than one fixed sharp-or-flat table.

const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const LETTERS = {
    english: ["C", "D", "E", "F", "G", "A", "B"],
    solfege: ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"],
};
const ACCIDENTALS = { "-2": "𝄫", "-1": "♭", "0": "", "1": "♯", "2": "𝄪" };

// Spelling used when nothing (chord, scale) suggests a better one
const DEFAULT_SPELLING = [
    [0, 0], [0, 1], [1, 0], [2, -1], [2, 0], [3, 0],
    [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0],
].map(([letter, acc]) => ({ letter, acc }));

// Degree token -> [semitones above the root, letter steps above the root]
const DEGREES = {
    "1": [0, 0], "b2": [1, 1], "2": [2, 1], "b9": [1, 1], "9": [2, 1], "#9": [3, 1],
    "b3": [3, 2], "3": [4, 2], "4": [5, 3], "11": [5, 3], "#4": [6, 3], "#11": [6, 3],
    "b5": [6, 4], "5": [7, 4], "#5": [8, 4], "b6": [8, 5], "b13": [8, 5],
    "6": [9, 5], "13": [9, 5], "bb7": [9, 6], "b7": [10, 6], "7": [11, 6],
};

export const pitchClass = midi => ((midi % 12) + 12) % 12;
const pcOf = sp => (((LETTER_PC[sp.letter] + sp.acc) % 12) + 12) % 12;

// Spell the note `semis` above `root`, using `steps` letters above it
function spellFrom(root, semis, steps) {
    const letter = (root.letter + steps) % 7;
    const target = (pcOf(root) + semis) % 12;
    const acc = ((target - LETTER_PC[letter] + 18) % 12) - 6;
    return { letter, acc };
}

export function defaultSpelling(pc) {
    return DEFAULT_SPELLING[pc];
}

export function noteName(sp, notation = "english") {
    return LETTERS[notation][sp.letter] + ACCIDENTALS[sp.acc];
}

// Octave number of a spelled note (B♯3 and C4 share a key but not an octave)
export function spelledOctave(midi, sp) {
    return Math.floor((midi - sp.acc) / 12) - 1;
}

// VexFlow key ("eb/4") and accidental ("b") for a spelled MIDI note
export function vexKey(midi, sp) {
    const acc = { "-2": "bb", "-1": "b", "0": "", "1": "#", "2": "##" }[sp.acc];
    return {
        key: `${"cdefgab"[sp.letter]}${acc}/${spelledOctave(midi, sp)}`,
        accidental: acc,
    };
}

// === Chords ===
// Order matters: earlier entries win when the same notes can be read two ways.
// Several entries share an id (shell voicings without a fifth, etc.).
const CHORD_DEFS = [
    ["maj", "", "1 3 5"],
    ["min", "m", "1 b3 5"],
    ["dom7", "7", "1 3 5 b7"],
    ["maj7", "maj7", "1 3 5 7"],
    ["min7", "m7", "1 b3 5 b7"],
    ["dim", "°", "1 b3 b5"],
    ["aug", "+", "1 3 #5"],
    ["sus4", "sus4", "1 4 5"],
    ["sus2", "sus2", "1 2 5"],
    ["hdim7", "ø7", "1 b3 b5 b7"],
    ["dim7", "°7", "1 b3 b5 bb7"],
    ["six", "6", "1 3 5 6"],
    ["min6", "m6", "1 b3 5 6"],
    ["sus4_7", "7sus4", "1 4 5 b7"],
    ["add9", "add9", "1 3 5 9"],
    ["madd9", "m(add9)", "1 b3 5 9"],
    ["dom9", "9", "1 3 5 b7 9"],
    ["maj9", "maj9", "1 3 5 7 9"],
    ["min9", "m9", "1 b3 5 b7 9"],
    ["minmaj7", "m(maj7)", "1 b3 5 7"],
    ["aug7", "+7", "1 3 #5 b7"],
    ["augmaj7", "+maj7", "1 3 #5 7"],
    ["sixnine", "6/9", "1 3 5 6 9"],
    ["dom7b9", "7♭9", "1 3 5 b7 b9"],
    ["dom7s9", "7♯9", "1 3 5 b7 #9"],
    ["dom7s11", "7♯11", "1 3 5 b7 #11"],
    ["dom11", "11", "1 5 b7 9 11"],
    ["dom11", "11", "1 3 5 b7 9 11"],
    ["min11", "m11", "1 b3 5 b7 9 11"],
    ["dom13", "13", "1 3 5 b7 9 13"],
    // Shell voicings: the fifth is often left out of 7th and extended chords
    ["dom7", "7", "1 3 b7"],
    ["maj7", "maj7", "1 3 7"],
    ["min7", "m7", "1 b3 b7"],
    ["dom9", "9", "1 3 b7 9"],
    ["maj9", "maj9", "1 3 7 9"],
    ["min9", "m9", "1 b3 b7 9"],
    ["dom7s9", "7♯9", "1 3 b7 #9"],
    ["dom13", "13", "1 3 b7 13"],
    ["dom13", "13", "1 3 b7 9 13"],
    ["power", "5", "1 5"],
];

const MINOR_IDS = new Set(["min", "min7", "min6", "madd9", "min9", "minmaj7", "min11", "dim", "hdim7", "dim7"]);

// Index every chord by its sorted interval set, e.g. "0,4,7"
const CHORD_INDEX = new Map();
CHORD_DEFS.forEach(([id, suffix, formula], rank) => {
    const tokens = formula.split(" ");
    const semis = tokens.map(t => DEGREES[t][0]);
    const key = [...semis].sort((a, b) => a - b).join(",");
    if (!CHORD_INDEX.has(key)) CHORD_INDEX.set(key, []);
    CHORD_INDEX.get(key).push({ id, suffix, tokens, rank });
});

// Pick a conventional spelling for a chord root
function spellRoot(pc, isMinor, context) {
    if (context?.[pc]) return context[pc];
    if (isMinor && pc === 1) return { letter: 0, acc: 1 };  // C♯m, not D♭m
    if (isMinor && pc === 8) return { letter: 4, acc: 1 };  // G♯m, not A♭m
    return DEFAULT_SPELLING[pc];
}

// Name the chord made by a set of MIDI notes, or return null.
// `context` is an optional pc -> spelling map (from the selected scale).
export function detectChord(midiNotes, context = null) {
    const sorted = [...midiNotes].sort((a, b) => a - b);
    const pcs = [...new Set(sorted.map(pitchClass))];
    if (pcs.length < 2) return null;
    const bassPc = pitchClass(sorted[0]);

    let best = null;
    for (const root of pcs) {
        const key = pcs.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b).join(",");
        for (const def of CHORD_INDEX.get(key) || []) {
            // A two-note "power chord" only reads as one from its root
            if (def.id === "power" && root !== bassPc) continue;
            // Prefer the reading whose root is in the bass, then the commonest
            const score = def.rank + (root === bassPc ? 0 : 1000);
            if (!best || score < best.score) best = { root, def, score };
        }
    }
    if (!best) return null;

    const { root, def } = best;
    const rootSp = spellRoot(root, MINOR_IDS.has(def.id), context);
    const spelling = {}; // pc -> spelled note, for every chord tone
    const tokenOf = {};
    for (const token of def.tokens) {
        const [semis, steps] = DEGREES[token];
        const pc = (root + semis) % 12;
        spelling[pc] = spellFrom(rootSp, semis, steps);
        tokenOf[pc] = token;
    }

    const bassToken = tokenOf[bassPc];
    let inversion = "root";
    if (bassPc !== root) {
        inversion = { "3": 1, "b3": 1, "5": 2, "b5": 2, "#5": 2, "7": 3, "b7": 3, "bb7": 3 }[bassToken] || "slash";
    }

    return {
        id: def.id,
        suffix: def.suffix,
        root: rootSp,
        bass: bassPc === root ? null : spelling[bassPc],
        inversion,
        spelling,
    };
}

// Chord symbol such as "Cmaj7/E", or "Do maj7/Mi" (a thin space keeps
// solfège roots readable: "Do m" rather than "Dom")
export function chordSymbol(chord, notation) {
    const gap = notation === "solfege" && chord.suffix ? "\u2009" : "";
    const base = noteName(chord.root, notation) + gap + chord.suffix;
    return chord.bass ? `${base}/${noteName(chord.bass, notation)}` : base;
}

// Semitone distance between two notes -> interval index 0-11 plus octaves
export function intervalBetween(low, high) {
    const diff = Math.abs(high - low);
    return { semis: diff % 12, octaves: Math.floor(diff / 12) };
}

// === Scales ===
export const SCALES = {
    major: "1 2 3 4 5 6 7",
    minor: "1 2 b3 4 5 b6 b7",
    harmonicMinor: "1 2 b3 4 5 b6 7",
    dorian: "1 2 b3 4 5 6 b7",
    mixolydian: "1 2 3 4 5 6 b7",
    majorPentatonic: "1 2 3 5 6",
    minorPentatonic: "1 b3 4 5 b7",
    blues: "1 b3 4 b5 5 b7",
};

const MINOR_SCALES = new Set(["minor", "harmonicMinor", "dorian", "minorPentatonic", "blues"]);

// Conventional key-signature spelling of each possible tonic
const MAJOR_TONICS = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
const MINOR_TONICS = [[0, 0], [0, 1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [6, -1], [6, 0]];

// Notes of a scale: [{ pc, spelling, degree }], or [] when no scale is chosen
export function scaleNotes(rootPc, type) {
    if (!SCALES[type]) return [];
    const [letter, acc] = (MINOR_SCALES.has(type) ? MINOR_TONICS : MAJOR_TONICS)[rootPc];
    const tonic = { letter, acc };
    return SCALES[type].split(" ").map(token => {
        const [semis, steps] = DEGREES[token];
        return { pc: (rootPc + semis) % 12, spelling: spellFrom(tonic, semis, steps), degree: token };
    });
}

// pc -> spelling map of a scale, used as context to spell everything else
export function scaleContext(rootPc, type) {
    const notes = scaleNotes(rootPc, type);
    if (!notes.length) return null;
    const map = {};
    notes.forEach(n => (map[n.pc] = n.spelling));
    return map;
}

// Best spelling of a single pitch class, given an optional chord and scale
export function spellPc(pc, chord, context) {
    return chord?.spelling[pc] || context?.[pc] || DEFAULT_SPELLING[pc];
}
