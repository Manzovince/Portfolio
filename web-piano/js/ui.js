// === Interface: chord readout, top bar, settings drawer ===

import { subscribe, soundingNotes, isPedalDown } from "./piano.js";
import { settings, setSetting, onSettingChange } from "./settings.js";
import {
    t, chordQuality, inversionName, intervalName, scaleName, currentNotation,
    getLanguage, setLanguage, onLanguageChange, applyStaticText,
} from "./i18n.js";
import {
    detectChord, chordSymbol, noteName, spellPc, spelledOctave, pitchClass,
    intervalBetween, scaleContext, scaleNotes, SCALES,
} from "./theory.js";
import { midiStatus, onMidiStatus, connectMidi } from "./midi.js";
import { ledState, onLedState, connectLeds } from "./leds.js";
import { needsUnlock, onAudioStateChange } from "./audio.js";
import { keysHint, shiftView } from "./keyboard.js";
import { clearScore } from "./score.js";
import { resetUsage } from "./roll.js";

const $ = selector => document.querySelector(selector);
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const WHITE_LETTER = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 }; // pc -> letter index

// === Chord readout ===

let hasPlayed = false;
let readoutQueued = false;

function describe(notes) {
    const notation = currentNotation();
    const context = scaleContext(settings.scaleRoot, settings.scaleType);
    const pcs = [...new Set(notes.map(pitchClass))];
    let chord = null;
    let symbol = "";
    let name = "";

    if (pcs.length === 1) {
        const sp = spellPc(pcs[0], null, context);
        symbol = noteName(sp, notation) + (notes.length === 1 ? spelledOctave(notes[0], sp) : "");
        if (notes.length > 1) name = t("octave");
    } else {
        chord = detectChord(notes, context);
        if (pcs.length === 2) {
            const low = notes[0];
            const high = notes.find(m => pitchClass(m) !== pitchClass(low));
            const { semis, octaves } = intervalBetween(low, high);
            name = intervalName(semis) + (octaves ? ` ${t("plusOctave", { n: octaves })}` : "");
            symbol = chord
                ? chordSymbol(chord, notation)
                : [low, high].map(m => noteName(spellPc(pitchClass(m), null, context), notation)).join(" – ");
        } else if (chord) {
            symbol = chordSymbol(chord, notation);
            name = `${noteName(chord.root, notation)} ${chordQuality(chord.id)}`;
            if (chord.inversion !== "root") {
                name += ` · ${inversionName(chord.inversion, { bass: noteName(chord.bass, notation) })}`;
            }
        } else {
            name = t("noChord");
        }
    }

    const names = notes.map(m => noteName(spellPc(pitchClass(m), chord, context), notation));
    return { symbol, name, names };
}

// Notes struck since the keyboard was last silent: shown (dimmed) once
// everything is released, so even a very short tap gets named
let lastStrike = [];
let strikeOver = true;

function trackStrike(event) {
    if (event.type === "on") {
        if (strikeOver) lastStrike = [];
        strikeOver = false;
        if (!lastStrike.includes(event.midi)) lastStrike.push(event.midi);
    } else if (event.type === "off" && soundingNotes().length === 0) {
        strikeOver = true;
    }
}

function renderReadout() {
    readoutQueued = false;
    const sounding = soundingNotes();
    const notes = sounding.length ? sounding : [...lastStrike].sort((a, b) => a - b);
    $("#readout").classList.toggle("idle", sounding.length === 0);
    $("#pedal").hidden = !isPedalDown();
    $("#unlock").hidden = !needsUnlock();
    if (!notes.length) return;

    if (!hasPlayed) {
        hasPlayed = true;
        $("#hint").hidden = true;
    }
    const { symbol, name, names } = describe(notes);
    $("#chordSymbol").textContent = symbol;
    $("#chordName").textContent = name;
    $("#noteNames").replaceChildren(...names.map(n => {
        const chip = document.createElement("span");
        chip.textContent = n;
        return chip;
    }));
}

function queueReadout() {
    if (readoutQueued) return;
    readoutQueued = true;
    requestAnimationFrame(renderReadout);
}

function renderHint() {
    $("#hintMain").textContent = t("hint");
    $("#hintKeys").textContent = finePointer.matches ? t("hintKeys", { keys: keysHint() }) : t("hintTouch");
    $("#shortKeys").textContent = keysHint();
}

// === Top bar ===

function renderMidi() {
    const { state, names } = midiStatus();
    const pill = $("#midiStatus");
    pill.dataset.state = state;
    pill.disabled = state !== "prompt" && state !== "denied";
    const label = {
        idle: "", prompt: t("midiConnect"), denied: t("midiDenied"), unsupported: t("midiUnsupported"),
        none: t("midiNone"),
        connected: names.length === 1 ? names[0] : t("midiDevices", { n: names.length }),
    }[state];
    pill.querySelector("span").textContent = label;
    pill.hidden = state === "idle";
}

function renderSound() {
    const button = $("#soundBtn");
    button.setAttribute("aria-pressed", settings.sound);
    button.setAttribute("aria-label", settings.sound ? t("soundOn") : t("soundOff"));
    button.title = button.getAttribute("aria-label");
}

function renderLed() {
    const state = settings.ledEnabled ? ledState() : "off";
    const pill = $("#ledPill");
    pill.hidden = !settings.ledEnabled;
    pill.dataset.state = state;
    const text = { off: t("ledOff"), connecting: t("ledConnecting"), connected: t("ledConnected"), failed: t("ledFailed") }[state];
    pill.querySelector("span").textContent = `LED · ${text}`;
    $("#ledStatus").textContent = text;
    $("#ledStatus").dataset.state = state;
    $("#ledRetry").hidden = state !== "failed" || !settings.ledEnabled;
    $("#ledHint").hidden = !(state === "failed" && location.protocol === "https:");
}

// === Settings drawer ===

function openDrawer(open) {
    const drawer = $("#settings");
    drawer.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", !open);
    drawer.inert = !open;
    $("#scrim").classList.toggle("visible", open);
    $("#settingsBtn").setAttribute("aria-expanded", open);
    if (open) drawer.querySelector("button, input, select")?.focus();
    else $("#settingsBtn").focus();
}

function fillScaleOptions() {
    const notation = currentNotation();
    const root = $("#scaleRoot");
    root.replaceChildren(...Array.from({ length: 12 }, (_, pc) => {
        // Black keys can be read both ways: offer "C♯ / D♭"
        const label = WHITE_LETTER[pc] !== undefined
            ? noteName({ letter: WHITE_LETTER[pc], acc: 0 }, notation)
            : `${noteName({ letter: WHITE_LETTER[pc - 1], acc: 1 }, notation)} / ${noteName({ letter: WHITE_LETTER[pc + 1], acc: -1 }, notation)}`;
        return new Option(label, pc);
    }));
    root.value = settings.scaleRoot;

    const type = $("#scaleType");
    type.replaceChildren(new Option(t("scaleNone"), ""), ...Object.keys(SCALES).map(k => new Option(scaleName(k), k)));
    type.value = settings.scaleType;
    renderScaleNotes();
}

function renderScaleNotes() {
    const notes = scaleNotes(settings.scaleRoot, settings.scaleType);
    $("#scaleRoot").disabled = !notes.length;
    $("#scaleNotes").textContent = notes.map(n => noteName(n.spelling, currentNotation())).join("  ");
    $("#scaleNotes").hidden = !notes.length;
}

function syncControls() {
    document.querySelectorAll("[data-setting]").forEach(el => {
        const value = settings[el.dataset.setting];
        if (el.type === "checkbox") el.checked = value;
        else if (el.matches(".segmented")) {
            const current = el.dataset.setting === "notation" ? currentNotation() : value;
            el.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.value === String(current)));
        } else el.value = value;
    });
    document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === getLanguage()));
    $("#volumeValue").textContent = `${Math.round(settings.volume * 100)}%`;
    $("#intensityValue").textContent = `${Math.round(settings.ledIntensity * 100)}%`;
    $("#ledOptions").hidden = !settings.ledEnabled;
    $("#instrument").disabled = !settings.sound;
}

function bindControls() {
    document.querySelectorAll("[data-setting]").forEach(el => {
        const key = el.dataset.setting;
        if (el.matches(".segmented")) {
            el.addEventListener("click", e => {
                const button = e.target.closest("button");
                if (button) setSetting(key, button.dataset.value);
            });
        } else if (el.type === "checkbox") {
            el.addEventListener("change", () => setSetting(key, el.checked));
        } else if (el.type === "range") {
            el.addEventListener("input", () => setSetting(key, Number(el.value)));
        } else if (el.type === "text") {
            el.addEventListener("change", () => setSetting(key, el.value.trim()));
        } else {
            el.addEventListener("change", () => setSetting(key, el.dataset.type === "number" ? Number(el.value) : el.value));
        }
    });
    document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => setLanguage(b.dataset.lang)));
}

// === Wiring ===

function renderAllText() {
    applyStaticText();
    renderHint();
    renderMidi();
    renderSound();
    renderLed();
    fillScaleOptions();
    syncControls();
    hasPlayed && renderReadout();
}

export function initUI() {
    bindControls();
    renderAllText();

    $("#soundBtn").addEventListener("click", () => setSetting("sound", !settings.sound));
    $("#settingsBtn").addEventListener("click", () => openDrawer(true));
    $("#closeSettings").addEventListener("click", () => openDrawer(false));
    $("#scrim").addEventListener("click", () => openDrawer(false));
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && $("#settings").classList.contains("open")) openDrawer(false);
    });
    $("#settings").inert = true;
    $("#midiStatus").addEventListener("click", connectMidi);
    $("#ledRetry").addEventListener("click", connectLeds);
    $("#clearStaff").addEventListener("click", clearScore);
    $("#resetUsage").addEventListener("click", resetUsage);
    $("#octDown").addEventListener("click", () => shiftView(-1));
    $("#octUp").addEventListener("click", () => shiftView(1));

    onMidiStatus(renderMidi);
    onLedState(renderLed);
    onAudioStateChange(queueReadout);
    finePointer.addEventListener("change", renderHint);
    document.addEventListener("keylabels", renderHint);
    onLanguageChange(renderAllText);
    onSettingChange(key => {
        syncControls();
        if (key === "sound") renderSound();
        if (key === "ledEnabled") renderLed();
        if (key === "notation") {
            fillScaleOptions();
            hasPlayed && renderReadout();
        }
        if (key === "scaleRoot" || key === "scaleType") {
            renderScaleNotes();
            hasPlayed && renderReadout();
        }
    });
    subscribe(event => {
        trackStrike(event);
        queueReadout();
    });
}

