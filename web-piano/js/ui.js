// === Interface: chord readout, top bar, settings drawer ===

import { subscribe, soundingNotes, isPedalDown } from "./piano.js?v=20261015g";
import { settings, setSetting, onSettingChange } from "./settings.js?v=20261015g";
import {
    t, chordQuality, inversionName, intervalName, scaleName, currentNotation,
    getLanguage, setLanguage, onLanguageChange, applyStaticText,
} from "./i18n.js?v=20261015g";
import {
    detectChord, chordSymbol, noteName, spellPc, spelledOctave, pitchClass,
    intervalBetween, scaleContext, scaleNotes, SCALES,
} from "./theory.js?v=20261015g";
import { midiStatus, onMidiStatus, connectMidi } from "./midi.js?v=20261015g";
import { ledState, onLedState, connectLeds } from "./leds.js?v=20261015g";
import { needsUnlock, onAudioStateChange } from "./audio.js?v=20261015g";
import { keysHint, shiftView } from "./keyboard.js?v=20261015g";
import {
    clearScore, hasScore, onScoreChange, showFullScore, hideFullScore, exportPng, exportSvg, exportMidi,
} from "./score.js?v=20261015g";
import { resetUsage } from "./roll.js?v=20261015g";
import {
    currentSong, openSongFile, closeSong, playSong, pauseSong, seekSong, setSongSpeed,
    isSongPlaying, songPosition, songSpeed, onSongChange, onSongPosition,
    songPart, setSongPart, isWaitingForPlayer,
} from "./song.js?v=20261015g";
import { setPracticing, isPracticing, onPracticeChange } from "./practice.js?v=20261015g";

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
    // A song overlaps its notes: name what sounds together, not everything since the last silence
    if (event.type === "on" && event.source?.startsWith("song")) {
        lastStrike = soundingNotes();
        strikeOver = true;
        return;
    }
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
    $("#tempoValue").textContent = `${settings.tempo} BPM`;
    $("#tempoRow").hidden = !settings.showStaff;
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

// === Songs (MIDI files) ===

const formatTime = ms => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function renderSong() {
    const song = currentSong();
    document.body.classList.toggle("song-open", Boolean(song));
    $("#songBar").hidden = !song;
    if (!song) return;
    const playing = isSongPlaying();
    const play = $("#songPlay");
    play.querySelector("use").setAttribute("href", playing ? "#i-pause" : "#i-play");
    play.setAttribute("aria-label", t(playing ? "songPause" : "songPlay"));
    play.title = play.getAttribute("aria-label");
    $("#songTitle").textContent = song.title;
    $("#songPart").value = songPart();
    $("#songWait").hidden = !isWaitingForPlayer();
    $("#songSpeed").querySelectorAll("button").forEach(b =>
        b.setAttribute("aria-pressed", Number(b.dataset.speed) === songSpeed()));
    renderSongPosition();
}

let seeking = false;
function renderSongPosition() {
    const song = currentSong();
    if (!song) return;
    const position = songPosition();
    $("#songTime").textContent = `${formatTime(position)} / ${formatTime(song.durationMs)}`;
    if (!seeking) $("#songSeek").value = Math.round(position / song.durationMs * 1000);
}

let errorTimer = null;
async function openSong(file) {
    try {
        await openSongFile(file);
        setPracticing(false);
        // The song is meant to be read: bring the staff back if it was hidden
        setSetting("showStaff", true);
        hasPlayed = true;
        $("#hint").hidden = true;
    } catch (err) {
        console.warn("MIDI file:", err);
        $("#songError").textContent = t("songError");
        $("#songError").hidden = false;
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => ($("#songError").hidden = true), 4000);
    }
}

function bindSong() {
    const input = $("#songFile");
    $("#openSong").addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
        if (input.files[0]) openSong(input.files[0]);
        input.value = "";
    });
    // A MIDI file dropped anywhere on the page opens too
    window.addEventListener("dragover", e => e.preventDefault());
    window.addEventListener("drop", e => {
        e.preventDefault();
        const file = [...(e.dataTransfer?.files ?? [])].find(f => /\.midi?$/i.test(f.name) || f.type.includes("midi"));
        if (file) openSong(file);
    });

    $("#songPlay").addEventListener("click", () => (isSongPlaying() ? pauseSong() : playSong()));
    $("#songClose").addEventListener("click", closeSong);
    $("#songPart").addEventListener("change", e => setSongPart(e.target.value));
    $("#songSpeed").addEventListener("click", e => {
        const button = e.target.closest("button");
        if (button) setSongSpeed(Number(button.dataset.speed));
    });
    const seek = $("#songSeek");
    seek.addEventListener("input", () => {
        seeking = true;
        seekSong(Number(seek.value) / 1000 * currentSong().durationMs);
    });
    seek.addEventListener("change", () => (seeking = false));

    onSongChange(renderSong);
    onSongPosition(renderSongPosition);
    // An exercise and a song do not mix: starting one closes the other
    onPracticeChange(() => isPracticing() && closeSong());
}

// === Whole score dialog ===

function renderScoreState(played = hasScore()) {
    $("#scoreEmpty").hidden = played;
    $("#fullScore").hidden = !played;
    ["#exportPng", "#exportSvg", "#exportMidi"].forEach(id => ($(id).disabled = !played));
    // A song came from a MIDI file already: only its images can be downloaded
    $("#exportMidi").hidden = Boolean(currentSong());
    $("#scoreTitle").textContent = currentSong()?.title ?? t("scoreTitle");
}

function bindScoreDialog() {
    const dialog = $("#scoreDialog");
    $("#openScore").addEventListener("click", () => {
        renderScoreState();
        dialog.showModal();
        showFullScore($("#fullScore"));
    });
    $("#closeScore").addEventListener("click", () => dialog.close());
    // A click on the backdrop closes it too
    dialog.addEventListener("click", e => e.target === dialog && dialog.close());
    // "close" fires a little later: ignore it if the dialog was opened again since
    dialog.addEventListener("close", () => !dialog.open && hideFullScore());
    // Building an image takes a moment: keep the button busy meanwhile
    [["#exportPng", exportPng], ["#exportSvg", exportSvg], ["#exportMidi", exportMidi]].forEach(([id, run]) => {
        const button = $(id);
        button.addEventListener("click", async () => {
            button.disabled = true;
            try {
                await run();
            } catch (err) {
                console.warn("Export failed:", err);
            } finally {
                renderScoreState();
            }
        });
    });
    onScoreChange(renderScoreState);
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
    bindScoreDialog();
    bindSong();
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

