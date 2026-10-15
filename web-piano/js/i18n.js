// === Interface language (shared with the rest of manzovince.com) ===

import { settings } from "./settings.js?v=20261015f";

const STORAGE_KEY = "selectedLanguage"; // same key as the portfolio's toggle

const STRINGS = {
    en: {
        title: "Web piano",
        back: "Back to the project page",
        sound: "Sound",
        soundOn: "Mute",
        soundOff: "Turn sound on",
        settings: "Settings",
        close: "Close",
        hint: "Play with a MIDI keyboard, your computer keys or the mouse",
        hintKeys: "{keys} to play · ← → octave · Space sustain",
        hintTouch: "Touch the keys to play · ‹ › to move along the keyboard",
        unlock: "Tap anywhere to turn the sound on",
        noChord: "No known chord",
        octave: "Octave",
        plusOctave: "+ {n} oct.",
        midiNone: "No MIDI device",
        midiConnect: "Connect a MIDI keyboard",
        midiDenied: "MIDI access refused",
        midiUnsupported: "No MIDI in this browser",
        midiDevices: "{n} MIDI devices",
        pedal: "Sustain",
        clearStaff: "Clear the staff",
        practice: "Practice",
        practiceChords: "Chords",
        practiceScales: "Scales",
        triads: "Major & minor",
        allTriads: "All triads",
        sevenths: "Seventh chords",
        allChords: "All chords",
        majorScales: "Major scales",
        minorScales: "Minor scales",
        majorMinor: "Major & minor",
        allScales: "All scales",
        rootsNaturals: "White keys",
        rootsAll: "All keys",
        practiceHints: "Show the notes",
        practiceSkip: "Skip",
        practiceLevel: "Level",
        practiceRootsLabel: "Roots",
        practicePlayChord: "Play this chord, in any octave or order",
        practicePlayScale: "Play this scale, one octave up then back down",
        practiceScaleOf: "{name} scale",
        practiceWell: "Well done!|Nice!|Perfect!|That's it!",
        practiceNotInChord: "{note} is not in this chord",
        practiceNotNext: "{note} is not the next note",
        practiceHigher: "Right note, but go up",
        practiceLower: "Right note, but go down",
        practiceStats: "Done: {done} · Streak: {streak}",
        openSong: "Open a MIDI file",
        songPlay: "Play",
        songPause: "Pause",
        songPosition: "Position in the song",
        songSpeed: "Speed",
        songClose: "Close the song",
        songError: "This file could not be read as a MIDI song",
        openScore: "Show the whole score",
        scoreTitle: "Your score",
        scoreEmpty: "Nothing played yet: the notes you play will be written here.",
        download: "Download",
        exportPngHelp: "Download the score as an image",
        exportSvgHelp: "Download the score as a vector image",
        exportMidiHelp: "Download what you played as a MIDI file",
        octaveDown: "Lower octave",
        octaveUp: "Higher octave",
        keyboardLabel: "Piano keyboard",
        // Settings
        language: "Language",
        sectionSound: "Sound",
        instrument: "Instrument",
        instPiano: "Piano",
        instSine: "Sine wave",
        instTriangle: "Triangle wave",
        instSquare: "Square wave",
        instSawtooth: "Sawtooth wave",
        volume: "Volume",
        sectionDisplay: "Display",
        notation: "Notation",
        colors: "Colours",
        colorRainbow: "Rainbow",
        colorOctave: "By note",
        colorMono: "Single colour",
        staff: "Staff",
        tempo: "Tempo",
        tempoHelp: "Sets how long a beat lasts, so that the staff can write the length of each note.",
        roll: "Piano roll",
        usage: "Note usage",
        reset: "Reset",
        labels: "Key labels",
        sectionLearn: "Scale guide",
        scaleKey: "Key",
        scaleType: "Scale",
        scaleNone: "None",
        scaleHelp: "Notes of the scale are marked on the keys and lit softly on the LED strip.",
        sectionLed: "LED strip",
        ledEnabled: "Connect",
        ledHost: "ESP32 address",
        ledIntensity: "Brightness",
        ledEffect: "Effect",
        effectKey: "Key only",
        effectRipple: "Ripple",
        ledOff: "Not connected",
        ledConnecting: "Connecting…",
        ledConnected: "Connected",
        ledFailed: "Could not reach the strip",
        ledHttpsHint: "This page is served over HTTPS, so the ESP32 must accept secure WebSockets (wss://). Otherwise open the piano from a local copy over http.",
        retry: "Retry",
        sectionShortcuts: "Shortcuts",
        shortPlay: "Play notes",
        shortOctave: "Change octave",
        shortSustain: "Sustain pedal",
        spaceKey: "Space",
        about: "About this project",
    },
    fr: {
        title: "Web piano",
        back: "Retour à la page du projet",
        sound: "Son",
        soundOn: "Couper le son",
        soundOff: "Activer le son",
        settings: "Réglages",
        close: "Fermer",
        hint: "Jouez avec un clavier MIDI, les touches de votre ordinateur ou la souris",
        hintKeys: "{keys} pour jouer · ← → octave · Espace pour la pédale",
        hintTouch: "Touchez les touches pour jouer · ‹ › pour vous déplacer",
        unlock: "Touchez l'écran pour activer le son",
        noChord: "Accord non reconnu",
        octave: "Octave",
        plusOctave: "+ {n} oct.",
        midiNone: "Aucun appareil MIDI",
        midiConnect: "Connecter un clavier MIDI",
        midiDenied: "Accès MIDI refusé",
        midiUnsupported: "MIDI indisponible ici",
        midiDevices: "{n} appareils MIDI",
        pedal: "Pédale",
        clearStaff: "Effacer la portée",
        practice: "S'exercer",
        practiceChords: "Accords",
        practiceScales: "Gammes",
        triads: "Majeurs et mineurs",
        allTriads: "Tous les accords de 3 sons",
        sevenths: "Accords de septième",
        allChords: "Tous les accords",
        majorScales: "Gammes majeures",
        minorScales: "Gammes mineures",
        majorMinor: "Majeures et mineures",
        allScales: "Toutes les gammes",
        rootsNaturals: "Touches blanches",
        rootsAll: "Toutes les touches",
        practiceHints: "Montrer les notes",
        practiceSkip: "Passer",
        practiceLevel: "Niveau",
        practiceRootsLabel: "Toniques",
        practicePlayChord: "Jouez cet accord, dans n'importe quel ordre ou octave",
        practicePlayScale: "Jouez cette gamme sur une octave, en montant puis en descendant",
        practiceScaleOf: "Gamme {name}",
        practiceWell: "Bravo !|Parfait !|Bien joué !|C'est ça !",
        practiceNotInChord: "{note} ne fait pas partie de l'accord",
        practiceNotNext: "{note} n'est pas la note suivante",
        practiceHigher: "Bonne note, mais plus haut",
        practiceLower: "Bonne note, mais plus bas",
        practiceStats: "Réussis : {done} · Série : {streak}",
        openSong: "Ouvrir un fichier MIDI",
        songPlay: "Lecture",
        songPause: "Pause",
        songPosition: "Position dans le morceau",
        songSpeed: "Vitesse",
        songClose: "Fermer le morceau",
        songError: "Ce fichier n'a pas pu être lu comme un morceau MIDI",
        openScore: "Voir toute la partition",
        scoreTitle: "Votre partition",
        scoreEmpty: "Rien de joué pour l'instant : les notes jouées s'écriront ici.",
        download: "Télécharger",
        exportPngHelp: "Télécharger la partition en image",
        exportSvgHelp: "Télécharger la partition en image vectorielle",
        exportMidiHelp: "Télécharger ce que vous avez joué en fichier MIDI",
        octaveDown: "Octave inférieure",
        octaveUp: "Octave supérieure",
        keyboardLabel: "Clavier de piano",
        language: "Langue",
        sectionSound: "Son",
        instrument: "Instrument",
        instPiano: "Piano",
        instSine: "Onde sinusoïdale",
        instTriangle: "Onde triangulaire",
        instSquare: "Onde carrée",
        instSawtooth: "Onde en dents de scie",
        volume: "Volume",
        sectionDisplay: "Affichage",
        notation: "Notation",
        colors: "Couleurs",
        colorRainbow: "Arc-en-ciel",
        colorOctave: "Par note",
        colorMono: "Une seule couleur",
        staff: "Portée",
        tempo: "Tempo",
        tempoHelp: "Fixe la durée d'un temps, pour que la portée écrive la durée de chaque note.",
        roll: "Défilement des notes",
        usage: "Notes jouées",
        reset: "Remettre à zéro",
        labels: "Repères sur les touches",
        sectionLearn: "Guide de gamme",
        scaleKey: "Tonalité",
        scaleType: "Gamme",
        scaleNone: "Aucune",
        scaleHelp: "Les notes de la gamme sont marquées sur les touches et éclairées doucement sur le ruban LED.",
        sectionLed: "Ruban LED",
        ledEnabled: "Connecter",
        ledHost: "Adresse de l'ESP32",
        ledIntensity: "Luminosité",
        ledEffect: "Effet",
        effectKey: "Touche seule",
        effectRipple: "Onde",
        ledOff: "Non connecté",
        ledConnecting: "Connexion…",
        ledConnected: "Connecté",
        ledFailed: "Ruban injoignable",
        ledHttpsHint: "Cette page est servie en HTTPS : l'ESP32 doit accepter les WebSockets sécurisés (wss://). Sinon, ouvrez le piano depuis une copie locale en http.",
        retry: "Réessayer",
        sectionShortcuts: "Raccourcis",
        shortPlay: "Jouer des notes",
        shortOctave: "Changer d'octave",
        shortSustain: "Pédale de sustain",
        spaceKey: "Espace",
        about: "À propos du projet",
    },
};

const CHORDS = {
    en: {
        maj: "major", min: "minor", dom7: "dominant seventh", maj7: "major seventh",
        min7: "minor seventh", dim: "diminished", aug: "augmented", sus4: "suspended fourth",
        sus2: "suspended second", hdim7: "half-diminished seventh", dim7: "diminished seventh",
        six: "sixth", min6: "minor sixth", sus4_7: "seventh, suspended fourth", add9: "added ninth",
        madd9: "minor, added ninth", dom9: "dominant ninth", maj9: "major ninth", min9: "minor ninth",
        minmaj7: "minor major seventh", aug7: "augmented seventh", augmaj7: "augmented major seventh",
        sixnine: "six-nine", dom7b9: "seventh, flat ninth", dom7s9: "seventh, sharp ninth",
        dom7s11: "seventh, sharp eleventh", dom11: "eleventh", min11: "minor eleventh",
        dom13: "thirteenth", power: "power chord",
    },
    fr: {
        maj: "majeur", min: "mineur", dom7: "septième de dominante", maj7: "septième majeure",
        min7: "mineur septième", dim: "diminué", aug: "augmenté", sus4: "quarte suspendue",
        sus2: "seconde suspendue", hdim7: "demi-diminué", dim7: "septième diminuée",
        six: "sixte", min6: "mineur sixte", sus4_7: "septième, quarte suspendue", add9: "neuvième ajoutée",
        madd9: "mineur, neuvième ajoutée", dom9: "neuvième de dominante", maj9: "neuvième majeure",
        min9: "mineur neuvième", minmaj7: "mineur septième majeure", aug7: "septième augmentée",
        augmaj7: "septième majeure augmentée", sixnine: "sixte et neuvième", dom7b9: "septième, neuvième bémol",
        dom7s9: "septième, neuvième dièse", dom7s11: "septième, onzième dièse", dom11: "onzième",
        min11: "mineur onzième", dom13: "treizième", power: "accord de quinte",
    },
};

const INVERSIONS = {
    en: { 1: "first inversion", 2: "second inversion", 3: "third inversion", slash: "over {bass}" },
    fr: { 1: "premier renversement", 2: "deuxième renversement", 3: "troisième renversement", slash: "basse {bass}" },
};

const INTERVALS = {
    en: ["unison", "minor second", "major second", "minor third", "major third", "perfect fourth",
        "tritone", "perfect fifth", "minor sixth", "major sixth", "minor seventh", "major seventh"],
    fr: ["unisson", "seconde mineure", "seconde majeure", "tierce mineure", "tierce majeure", "quarte juste",
        "triton", "quinte juste", "sixte mineure", "sixte majeure", "septième mineure", "septième majeure"],
};

const SCALE_NAMES = {
    en: {
        major: "Major", minor: "Natural minor", harmonicMinor: "Harmonic minor", dorian: "Dorian",
        mixolydian: "Mixolydian", majorPentatonic: "Major pentatonic", minorPentatonic: "Minor pentatonic", blues: "Blues",
    },
    fr: {
        major: "Majeure", minor: "Mineure naturelle", harmonicMinor: "Mineure harmonique", dorian: "Dorienne",
        mixolydian: "Mixolydienne", majorPentatonic: "Pentatonique majeure", minorPentatonic: "Pentatonique mineure", blues: "Blues",
    },
};

function initialLanguage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "en" || saved === "fr") return saved;
    } catch { /* storage blocked */ }
    return (navigator.language || "").startsWith("fr") ? "fr" : "en";
}

let lang = initialLanguage();
const listeners = new Set();

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? "");

export const getLanguage = () => lang;
// Note names follow the language unless the visitor picked a notation
export const currentNotation = () => settings.notation || (lang === "fr" ? "solfege" : "english");
export const t = (key, vars) => fill(STRINGS[lang][key] ?? key, vars);
export const chordQuality = id => CHORDS[lang][id] ?? "";
export const inversionName = (inv, vars) => fill(INVERSIONS[lang][inv] ?? "", vars);
export const intervalName = semis => INTERVALS[lang][semis];
export const scaleName = type => SCALE_NAMES[lang][type] ?? "";

export function onLanguageChange(fn) {
    listeners.add(fn);
}

export function setLanguage(next) {
    if (next === lang || !STRINGS[next]) return;
    lang = next;
    try {
        localStorage.setItem(STORAGE_KEY, lang);
    } catch { /* storage blocked */ }
    applyStaticText();
    listeners.forEach(fn => fn(lang));
}

// Fill every element tagged with data-t / data-t-label / data-t-title
export function applyStaticText(root = document) {
    document.documentElement.lang = lang;
    root.querySelectorAll("[data-t]").forEach(el => (el.textContent = t(el.dataset.t)));
    root.querySelectorAll("[data-t-label]").forEach(el => el.setAttribute("aria-label", t(el.dataset.tLabel)));
    root.querySelectorAll("[data-t-title]").forEach(el => (el.title = t(el.dataset.tTitle)));
}
