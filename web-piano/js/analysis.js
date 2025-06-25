// === NOTES ANALYSIS ===

export { getChordName, getNoteNames };

const notationMap = {
    english: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
    english_flat: ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"],
    solfege: ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"],
    solfege_flat: ["Do", "Ré♭", "Ré", "Mi♭", "Mi", "Fa", "Sol♭", "Sol", "La♭", "La", "Si♭", "Si"],
};

const chordTypes = {
    // Triads
    "0,4,7": "Major",
    "0,3,7": "minor",
    "0,3,6": "Diminished",
    "0,4,8": "Augmented",
    "0,5,7": "Sus4",
    "0,2,7": "Sus2",
    "0,7": "Power",

    // Added triads
    "0,4,7,2": "add9",
    "0,3,7,2": "min add9",
    "0,4,7,5": "add11",
    "0,3,7,5": "min add11",
    "0,4,7,9": "6",
    "0,3,7,9": "min6",
    "0,4,7,1": "Maj♭9",
    "0,3,7,1": "min♭9",

    // 7th chords
    "0,4,7,10": "7",
    "0,4,7,11": "Maj7",
    "0,3,7,10": "min7",
    "0,3,7,11": "minMaj7",
    "0,3,6,10": "m7♭5",
    "0,3,6,9": "dim7",
    "0,4,8,10": "aug7",
    "0,4,8,11": "augMaj7",

    // Suspended 7 chords
    "0,5,7,10": "7sus4",
    "0,2,7,10": "7sus2",

    // 9th chords
    "0,4,7,10,2": "9",
    "0,3,7,10,2": "min9",
    "0,4,7,11,2": "Maj9",
    "0,3,7,11,2": "minMaj9",
    "0,3,6,10,2": "m7♭5(9)",
    "0,3,6,9,2": "dim9",

    // Extended chords (11th, 13th)
    "0,4,7,10,2,5": "11",
    "0,3,7,10,2,5": "min11",
    "0,4,7,10,2,5,9": "13",
    "0,3,7,10,2,5,9": "min13",

    // Altered 7th chords
    "0,4,7,10,1": "7♭9",
    "0,4,7,10,3": "7#9",
    "0,4,7,10,6": "7#11",
    "0,4,7,10,8": "7♯13",

    // Quartal and special voicings
    "0,5,10": "Quartal",
    "0,7,14": "Fifth Stack",
    "0,3,6,8": "French Augmented 6th",
    "0,3,6,10,2": "dim7 add9",

    // More 4-note chords
    "0,3,6,9": "Diminished Seventh",
    "0,4,8,10": "Augmented Seventh",
    "0,2,5,9": "Sixth/Ninth",
    "0,5,9": "Sus4(6)",
    "0,3,7,8": "min(maj6)",
    "0,4,7,8": "Maj6(add♭6)",
    "0,3,7,8,10": "min7(add6)",
};

function getNoteNames(notes, notation) {
    const names = notationMap[notation];
    // const toSuperscript = num => String(num).replace(/\d/g, d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);
    // const toSubscript = num => String(num).replace(/\d/g, d => "₀₁₂₃₄₅₆₇₈₉"[d]);

    return [...notes.keys()]
        .sort((a, b) => a - b)
        .map(n => {
            const name = names[n % 12];
            const octave = Math.floor(n / 12) - 1;
            return name;
        })
        .join(" ");
}

function getChordName(activeNotes, notation) {
    const noteNums = [...activeNotes.keys()].sort((a, b) => a - b);
    if (noteNums.length < 2) return null;

    const names = notationMap[notation];

    for (let i = 0; i < noteNums.length; i++) {
        // Rotate notes
        const rotated = noteNums.slice(i).concat(noteNums.slice(0, i));
        const root = rotated[0];
        // Calculate intervals from this root
        const intervals = rotated.map(n => (n - root + 12) % 12).sort((a, b) => a - b);
        const chordKey = intervals.join(",");
        const chordName = chordTypes[chordKey];
        if (chordName) {
            const rootName = names[root % 12];
            // Optionally, add inversion info:
            if (i > 0) return `${rootName} ${chordName} (inv)`;
            return `${rootName} ${chordName}`;
        }
    }
    return null;
}