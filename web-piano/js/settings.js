// === Settings: persisted per browser, observable ===

const STORAGE_KEY = "webPiano.settings";

const DEFAULTS = {
    sound: true,
    instrument: "piano",
    volume: 0.8,
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

export function onSettingChange(fn) {
    listeners.add(fn);
}
