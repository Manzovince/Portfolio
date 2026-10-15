// === Songs: open a MIDI file, play it on the keys and follow it on the staff ===
//
// The file is read here (format 0 or 1, every track merged, drums left out),
// with its tempo changes and time signature. Playback presses the keys like any
// other input, so the sound, the keys, the LED strip and the chord names follow.
//
// Play-along: the visitor plays both hands, or one while the song plays the
// other. The song then waits on each chord of their part until its notes are
// played, and marks them on the keys (and the LED strip) in the meantime.

import { subscribe, press, liftSource, setPedal } from "./piano.js?v=20261015g";

const SOURCE = "song";
const TICK_MS = 10;          // playback clock
const DRUM_CHANNEL = 9;      // General MIDI percussion: not notes on a piano

let song = null;
let playing = false;
let speed = 1;
let anchorPosition = 0;      // song time (ms) when playback last started
let anchorTime = 0;          // clock time at that moment
let positionMs = 0;
let noteIndex = 0;
let pedalIndex = 0;
let timer = null;
const holding = new Map();   // midi -> end time (ms) of the note being played
const changeListeners = new Set();
const positionListeners = new Set();
const guideListeners = new Set();

// Play-along: "listen" (the song plays everything), "both", "right" or "left"
let part = "listen";
let expected = 0;            // index of the chord awaited in the visitor's part
let waiting = false;         // the clock is stopped on that chord
const struck = new Set();    // notes played towards it

export const currentSong = () => song;
export const isSongPlaying = () => playing;
export const songPosition = () => positionMs;
export const songSpeed = () => speed;
export const onSongChange = fn => changeListeners.add(fn);
export const onSongPosition = fn => positionListeners.add(fn);
export const songPart = () => part;
export const isWaitingForPlayer = () => waiting;
export const onSongGuide = fn => guideListeners.add(fn);

const notifyGuide = () => guideListeners.forEach(fn => fn());

// Keys to mark: the chord the song waits for, while playing along
export function songGuide() {
    const chord = song && part !== "listen" ? song.parts[part][expected] : null;
    return chord ? { midis: chord.midis } : null;
}

const notifyChange = () => changeListeners.forEach(fn => fn());
const notifyPosition = () => positionListeners.forEach(fn => fn(positionMs));

// === Reading the file ===

function readFile(buffer) {
    const data = new DataView(buffer);
    let at = 0;
    const text = length => {
        const bytes = new Uint8Array(buffer, at, length);
        at += length;
        return new TextDecoder("latin1").decode(bytes);
    };
    const varLen = () => {
        let value = 0;
        let byte;
        do {
            byte = data.getUint8(at++);
            value = (value << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        return value;
    };

    if (text(4) !== "MThd") throw new Error("Not a MIDI file");
    const headerLength = data.getUint32(at);
    const trackCount = data.getUint16(at + 6);
    const division = data.getUint16(at + 8);
    at += 4 + headerLength;
    if (division & 0x8000) throw new Error("SMPTE timing is not supported");

    const notes = [];
    const pedals = [];
    const tempos = [];
    let timeSignature = null;
    let title = "";

    for (let track = 0; track < trackCount && at < buffer.byteLength; track++) {
        const id = text(4);
        const length = data.getUint32(at);
        at += 4;
        const end = at + length;
        if (id !== "MTrk") {
            at = end;
            continue;
        }
        let tick = 0;
        let status = 0;
        const open = new Map(); // "channel:midi" -> started notes, oldest first
        while (at < end) {
            tick += varLen();
            let byte = data.getUint8(at);
            if (byte & 0x80) {
                status = byte;
                at++;
            }
            if (status === 0xff) {
                const type = data.getUint8(at++);
                const size = varLen();
                if (type === 0x51 && size === 3) {
                    tempos.push({ tick, usPerBeat: (data.getUint8(at) << 16) | (data.getUint8(at + 1) << 8) | data.getUint8(at + 2) });
                } else if (type === 0x58 && size >= 2 && !timeSignature) {
                    timeSignature = [data.getUint8(at), 2 ** data.getUint8(at + 1)];
                } else if (type === 0x03 && !title) {
                    title = new TextDecoder().decode(new Uint8Array(buffer, at, size)).trim();
                }
                at += size;
                continue;
            }
            if (status === 0xf0 || status === 0xf7) {
                at += varLen();
                continue;
            }
            const kind = status & 0xf0;
            const channel = status & 0x0f;
            const a = data.getUint8(at++);
            const b = kind === 0xc0 || kind === 0xd0 ? 0 : data.getUint8(at++);
            if (channel === DRUM_CHANNEL) continue;
            const key = `${channel}:${a}`;
            if (kind === 0x90 && b > 0) {
                const note = { midi: a, velocity: b, startTick: tick, endTick: null, track };
                notes.push(note);
                if (!open.has(key)) open.set(key, []);
                open.get(key).push(note);
            } else if (kind === 0x80 || (kind === 0x90 && b === 0)) {
                const note = open.get(key)?.shift();
                if (note) note.endTick = tick;
            } else if (kind === 0xb0 && a === 64) {
                pedals.push({ tick, down: b >= 64 });
            }
        }
        // Notes never released end with their track
        for (const list of open.values()) list.forEach(note => (note.endTick = tick));
        at = end;
    }
    return { ppq: division, notes, pedals, tempos, timeSignature, title };
}

// Song time in milliseconds of every tick, following the tempo changes
function tickClock(ppq, tempos) {
    const changes = [{ tick: 0, usPerBeat: 500000 }, ...tempos.sort((a, b) => a.tick - b.tick)];
    const segments = [];
    let ms = 0;
    changes.forEach((change, i) => {
        const previous = segments[segments.length - 1];
        if (previous) ms += (change.tick - previous.tick) * previous.usPerBeat / 1000 / ppq;
        if (previous && previous.tick === change.tick) segments.pop();
        segments.push({ tick: change.tick, ms, usPerBeat: change.usPerBeat });
    });
    return tick => {
        let segment = segments[0];
        for (const s of segments) if (s.tick <= tick) segment = s;
        return segment.ms + (tick - segment.tick) * segment.usPerBeat / 1000 / ppq;
    };
}

// Chords for the staff: notes starting on the same sixteenth form one chord
function staffGroups(notes) {
    const groups = [];
    for (const note of notes) {
        const start = Math.round(note.startBeat * 4) / 4;
        const last = groups[groups.length - 1];
        if (last && last.start === start) {
            last.midis.add(note.midi);
            last.ends.set(note.midi, Math.max(last.ends.get(note.midi) ?? 0, note.endBeat));
        } else {
            groups.push({ start, time: note.startMs, midis: new Set([note.midi]), ends: new Map([[note.midi, note.endBeat]]) });
        }
    }
    return groups;
}

function buildSong(file, fileName) {
    const { ppq, tempos } = file;
    const toMs = tickClock(ppq, tempos);
    const notes = file.notes
        .filter(n => n.midi >= 21 && n.midi <= 108)
        .map(n => ({
            track: n.track,
            midi: n.midi,
            velocity: n.velocity,
            startMs: toMs(n.startTick),
            endMs: Math.max(toMs(n.endTick), toMs(n.startTick) + 30),
            startBeat: n.startTick / ppq,
            endBeat: n.endTick / ppq,
        }))
        .sort((a, b) => a.startMs - b.startMs || a.midi - b.midi);
    if (!notes.length) throw new Error("No notes");
    assignHands(notes);
    const firstTempo = tempos.find(t => t.tick === 0) ?? tempos[0];
    return {
        title: file.title || fileName.replace(/\.midi?$/i, ""),
        notes,
        pedals: file.pedals.map(p => ({ ms: toMs(p.tick), down: p.down })).sort((a, b) => a.ms - b.ms),
        durationMs: Math.max(...notes.map(n => n.endMs)),
        timeSignature: file.timeSignature ?? [4, 4],
        bpm: Math.round(60000000 / (firstTempo?.usPerBeat ?? 500000)),
        groups: staffGroups(notes),
        // Chords of each part, for playing along
        parts: {
            both: staffGroups(notes),
            right: staffGroups(notes.filter(n => n.hand === "right")),
            left: staffGroups(notes.filter(n => n.hand === "left")),
        },
    };
}

// Piano files usually keep one hand per track: with two tracks, the higher
// one is the right hand. Otherwise the notes are split at middle C.
function assignHands(notes) {
    const tracks = new Map();
    notes.forEach(n => tracks.set(n.track, [...(tracks.get(n.track) ?? []), n.midi]));
    const average = list => list.reduce((sum, m) => sum + m, 0) / list.length;
    if (tracks.size === 2) {
        const [a, b] = [...tracks.entries()].sort((x, y) => average(y[1]) - average(x[1]));
        notes.forEach(n => (n.hand = n.track === a[0] ? "right" : "left"));
    } else {
        notes.forEach(n => (n.hand = n.midi >= 60 ? "right" : "left"));
    }
}

export async function openSongFile(file) {
    const next = buildSong(readFile(await file.arrayBuffer()), file.name);
    closeSong();
    song = next;
    resetExpected();
    notifyChange();
    notifyPosition();
    return song;
}

export function closeSong() {
    if (!song) return;
    pauseSong();
    song = null;
    positionMs = 0;
    waiting = false;
    notifyChange();
    notifyGuide();
}

// === Playback ===

// Mine to play, while playing along?
const isPlayersNote = note => part === "both" || note.hand === part;

function step() {
    const now = performance.now();
    positionMs = Math.min(song.durationMs, anchorPosition + (now - anchorTime) * speed);
    const { notes, pedals } = song;

    // Stop the clock on the chord the visitor has to play
    const awaited = part === "listen" ? null : song.parts[part][expected];
    if (awaited && positionMs >= awaited.time) {
        positionMs = awaited.time;
        anchorPosition = positionMs;
        anchorTime = now;
        if (!waiting) {
            waiting = true;
            notifyChange();
        }
    }

    for (const [midi, end] of holding) {
        if (end <= positionMs) {
            holding.delete(midi);
            liftSource(SOURCE + midi);
        }
    }
    while (pedalIndex < pedals.length && pedals[pedalIndex].ms <= positionMs) {
        const { down } = pedals[pedalIndex++];
        // While playing along, the pedal is the visitor's
        if (part === "listen") setPedal(down);
    }
    while (noteIndex < notes.length && notes[noteIndex].startMs <= positionMs) {
        const note = notes[noteIndex++];
        if (note.endMs <= positionMs) continue; // too short to catch at this clock
        if (part !== "listen" && isPlayersNote(note)) continue;
        // One source per key, so that releasing one note leaves the others alone
        press(note.midi, note.velocity, SOURCE + note.midi);
        holding.set(note.midi, note.endMs);
    }

    notifyPosition();
    if (positionMs >= song.durationMs) {
        pauseSong();
        positionMs = 0;
        noteIndex = 0;
        pedalIndex = 0;
        resetExpected();
        notifyPosition();
    }
}

// The first chord of the visitor's part from the current position
function resetExpected() {
    struck.clear();
    waiting = false;
    const chords = song?.parts[part === "listen" ? "both" : part] ?? [];
    expected = chords.findIndex(chord => chord.time >= positionMs - 1);
    if (expected < 0) expected = chords.length;
    notifyGuide();
}

export function setSongPart(value) {
    part = value;
    if (part !== "listen") setPedal(false);
    resetExpected();
    notifyChange();
}

// The visitor's notes: once the awaited chord is complete, the song moves on.
// Notes played a little early count, so a chord can be played on the beat.
subscribe(event => {
    if (event.type !== "on" || event.source?.startsWith(SOURCE)) return;
    if (!song || !playing || part === "listen") return;
    const awaited = song.parts[part][expected];
    if (!awaited || !awaited.midis.has(event.midi)) return;
    struck.add(event.midi);
    if (![...awaited.midis].every(midi => struck.has(midi))) return notifyGuide();
    struck.clear();
    expected++;
    if (waiting) {
        waiting = false;
        anchorPosition = positionMs;
        anchorTime = performance.now();
        notifyChange();
    }
    notifyGuide();
});

export function playSong() {
    if (!song || playing) return;
    playing = true;
    anchorPosition = positionMs;
    anchorTime = performance.now();
    timer = setInterval(step, TICK_MS);
    notifyChange();
}

export function pauseSong() {
    if (!playing) return;
    playing = false;
    waiting = false;
    clearInterval(timer);
    releaseAllSongKeys();
    notifyChange();
}

function releaseAllSongKeys() {
    for (const midi of holding.keys()) liftSource(SOURCE + midi);
    holding.clear();
    setPedal(false);
}

export function seekSong(ms) {
    if (!song) return;
    positionMs = Math.max(0, Math.min(song.durationMs, ms));
    releaseAllSongKeys();
    noteIndex = song.notes.findIndex(n => n.startMs >= positionMs);
    if (noteIndex < 0) noteIndex = song.notes.length;
    pedalIndex = song.pedals.findIndex(p => p.ms > positionMs);
    if (pedalIndex < 0) pedalIndex = song.pedals.length;
    if (pedalIndex > 0 && song.pedals[pedalIndex - 1].down) setPedal(true);
    anchorPosition = positionMs;
    anchorTime = performance.now();
    resetExpected();
    notifyPosition();
}

export function setSongSpeed(value) {
    if (playing) {
        anchorPosition = positionMs;
        anchorTime = performance.now();
    }
    speed = value;
    notifyChange();
}
