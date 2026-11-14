// Backup of everything Octave keeps on this device, in one file: course
// progress, settings, sound banks, takes and imported songs. Restoring it on
// another device (or after the browser cleared its data) brings it all back.
import { getAll, put } from './db.js?v=202611141';
import { takesReady } from './recorder.js?v=202611141';
import { stopSaving } from './store.js?v=202611141';

const LOCAL = ['octave.state.v1', 'octave.banks.v1', 'octave.coach.v1', 'selectedLanguage'];
const FORMAT = 'octave-backup';

const toB64 = buf => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;

export async function exportBackup() {
  await takesReady;
  const local = {};
  for (const k of LOCAL) { try { const v = localStorage.getItem(k); if (v != null) local[k] = v; } catch {} }
  let takes = [], songs = [];
  try { takes = await getAll('takes'); } catch {}
  try { songs = (await getAll('songs')).map(s => ({ ...s, data: toB64(s.data) })); } catch {}
  const data = { format: FORMAT, version: 1, date: new Date().toISOString(), local, takes, songs };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `octave-sauvegarde-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { takes: takes.length, songs: songs.length };
}

// Throws on a file that is not an Octave backup; reloads the app when done
export async function importBackup(file) {
  const data = JSON.parse(await file.text());
  if (data?.format !== FORMAT || typeof data.local !== 'object') throw new Error('not a backup');
  // the app must not write its in-memory state over the restored one
  stopSaving();
  for (const k of LOCAL) {
    if (typeof data.local[k] === 'string') localStorage.setItem(k, data.local[k]);
  }
  for (const t of Array.isArray(data.takes) ? data.takes : []) if (t?.id && Array.isArray(t.events)) await put('takes', t);
  for (const s of Array.isArray(data.songs) ? data.songs : []) if (s?.id && typeof s.data === 'string') await put('songs', { ...s, data: fromB64(s.data) });
  location.reload();
}
