// === Song library: the bundled examples plus every MIDI file the visitor imported ===
//
// Imported files are kept in this browser (IndexedDB), so they can be opened
// again later without looking for the file. Nothing leaves the device.

import { run as runStore } from "./db.js?v=202611131";

// `fitsLumi`: every note within C3–B4, the 24 keys of one LUMI at its default octave
export const EXAMPLES = [
    { id: "example:clair", title: "Au clair de la lune", composer: "trad", url: "songs/au-clair-de-la-lune.mid", fileName: "au-clair-de-la-lune.mid", fitsLumi: true },
    { id: "example:ode", title: "Ode à la joie", composer: "Beethoven", url: "songs/ode-a-la-joie.mid", fileName: "ode-a-la-joie.mid" },
];

const listeners = new Set();

export const onLibraryChange = fn => listeners.add(fn);
const changed = () => listeners.forEach(fn => fn());

const run = (mode, fn) => runStore("songs", mode, fn);

// Imported songs, most recently opened first. [] when storage is unavailable (private mode…)
export async function importedSongs() {
    try {
        const all = await run("readonly", store => store.getAll());
        return all.map(({ data, ...meta }) => meta).sort((a, b) => b.openedAt - a.openedAt);
    } catch {
        return [];
    }
}

// Keep a file in the library; importing the same file again only refreshes it
export async function addSong(file, title) {
    const data = await file.arrayBuffer();
    const id = `file:${file.name}:${data.byteLength}`;
    const now = Date.now();
    try {
        const existing = await run("readonly", store => store.get(id));
        await run("readwrite", store => store.put({
            id, title, fileName: file.name, size: data.byteLength, data,
            addedAt: existing?.addedAt ?? now, openedAt: now,
        }));
        changed();
    } catch (err) {
        console.warn("Library: could not keep the song", err);
    }
    return id;
}

// A File ready for openSongFile(), for an example or an imported song
export async function songFile(id) {
    const example = EXAMPLES.find(e => e.id === id);
    if (example) {
        const response = await fetch(example.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return new File([await response.arrayBuffer()], example.fileName);
    }
    const song = await run("readonly", store => store.get(id));
    if (!song) throw new Error("Song not found");
    song.openedAt = Date.now();
    run("readwrite", store => store.put(song)).then(changed).catch(() => {});
    return new File([song.data], song.fileName);
}

export async function removeSong(id) {
    await run("readwrite", store => store.delete(id));
    changed();
}
