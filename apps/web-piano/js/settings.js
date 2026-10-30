// === Settings: persisted per browser, observable ===

const STORAGE_KEY = "webPiano.settings";

const DEFAULTS = {
    sound: true,
    instrument: "piano",
    volume: 0.8,
    // Envelope and echo of the synth voices (the piano keeps its own sound)
    synthAttack: 0.01,
    synthDecay: 0.25,
    synthSustain: 0.55,
    synthRelease: 0.35,
    delayMix: 0,
    delayTime: 0.3,
    delayFeedback: 0.35,
    showWave: true,
    notation: null, // null = follow the language (solfège in French)
    colorMode: "rainbow",
    showStaff: true,
    tempo: 80, // beats per minute, used to write note lengths on the staff
    showRoll: true,
    showUsage: false,
    showLabels: true,
    scaleRoot: 0,
    scaleType: "",
    ledEnabled: false,
    ledHost: "192.168.1.17:81",
    ledIntensity: 0.2,
    ledEffect: "key",
    practiceKind: "chords",
    practiceChords: "triads",
    practiceScales: "majorScales",
    practiceRoots: "naturals",
    practiceHints: true,
};

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved || typeof saved !== "object") return {};
        // Keep only known keys with the expected type
        return Object.fromEntries(Object.entries(saved).filter(([key, value]) =>
            key in DEFAULTS && (DEFAULTS[key] === null || typeof value === typeof DEFAULTS[key])));
    } catch {
        return {};
    }
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Storage blocked (private mode): settings still apply for this visit
    }
}

export const settings = { ...DEFAULTS, ...load() };

const listeners = new Set();

export function setSetting(key, value) {
    if (settings[key] === value) return;
    settings[key] = value;
    save();
    listeners.forEach(fn => fn(key, value));
}

export const SYNTH_KEYS = ["synthAttack", "synthDecay", "synthSustain", "synthRelease", "delayMix", "delayTime", "delayFeedback"];

export function resetSynth() {
    SYNTH_KEYS.forEach(key => setSetting(key, DEFAULTS[key]));
}

export function onSettingChange(fn) {
    listeners.add(fn);
}
