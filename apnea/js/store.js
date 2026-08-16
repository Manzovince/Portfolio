// Persistence. Everything lives in localStorage — no account, no network.
//
// Session shapes (all durations in seconds):
//   { id, type:'hold', date, prep, hold, recovery, contractions:[sec…], note }
//   { id, type:'co2'|'o2', date, config:{…}, rounds:[{hold,rest,holdActual,contractions:[]}],
//     completedRounds, totalHold, note }
//   { id, type:'relax', date, pattern:[…], patternName, cycles, duration, note }
//   { id, type:'walk', date, prep, hold, recovery, contractions:[sec…], distance, steps, note }
//   { id, type:'dyn', date, discipline:'DYN'|'DNF'|'DYNB', distance, time, poolLength, note }
//   { id, type:'freedive', date, dives:[{n,duration,maxDepth,avgDepth,surfaceInterval}],
//     diveCount, bestDive, totalDiveTime, maxDepth, avgHr, maxHr,
//     source:'fit'|'csv', device, importId, note }   ← imported from a dive watch

const SESSIONS_KEY = 'apnea.sessions.v1';
const SETTINGS_KEY = 'apnea.settings.v1';

const DEFAULT_SETTINGS = {
  prep: 120,          // relaxation before a max hold
  recovery: 120,      // recovery breathing after a max hold
  sound: true,
  voice: true,
  vibrate: true,
  keepAwake: true,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn('[apnea] could not read', key, err);
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('[apnea] could not write', key, err);
    return false;
  }
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

/** All sessions, newest first. */
export function listSessions() {
  const all = read(SESSIONS_KEY, []);
  return Array.isArray(all) ? all.slice().sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
}

export function saveSession(session) {
  const all = read(SESSIONS_KEY, []);
  const entry = { id: uid(), date: new Date().toISOString(), note: '', ...session };
  all.push(entry);
  write(SESSIONS_KEY, all);
  return entry;
}

export function getSession(id) {
  return read(SESSIONS_KEY, []).find((s) => s.id === id) || null;
}

/** Patch an existing session in place. Returns the updated entry, or null. */
export function updateSession(id, patch) {
  const all = read(SESSIONS_KEY, []);
  const i = all.findIndex((s) => s.id === id);
  if (i === -1) return null;
  all[i] = { ...all[i], ...patch, id };
  write(SESSIONS_KEY, all);
  return all[i];
}

export function deleteSession(id) {
  write(SESSIONS_KEY, read(SESSIONS_KEY, []).filter((s) => s.id !== id));
}

export function replaceAll(sessions) {
  write(SESSIONS_KEY, sessions);
}

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  write(SETTINGS_KEY, next);
  return next;
}

/** Longest completed max-hold ever, or null. */
export function personalBest(sessions = listSessions()) {
  let best = null;
  for (const s of sessions) {
    if (s.type !== 'hold' || !s.hold) continue;
    if (!best || s.hold > best.hold) best = { hold: s.hold, date: s.date, id: s.id };
  }
  return best;
}

// An imported dive longer than this is not a breath hold — it is a scuba dive
// that landed in the same export. Counting it would wreck every hold stat.
const MAX_APNEA_DIVE = 900;

/** Dives from an imported session that are plausibly breath holds. */
export function apneaDives(session) {
  return (session.dives || []).filter((d) => d.duration > 0 && d.duration <= MAX_APNEA_DIVE);
}

/** Longest hold of any kind (max attempt, walk, table round or dive) — headline stat. */
export function bestHoldAnywhere(sessions = listSessions()) {
  let best = 0;
  for (const s of sessions) {
    if (s.type === 'hold' || s.type === 'walk') best = Math.max(best, s.hold || 0);
    if (s.rounds) for (const r of s.rounds) best = Math.max(best, r.holdActual || 0);
    for (const d of apneaDives(s)) best = Math.max(best, d.duration);
  }
  return best;
}

export function totalHoldTime(session) {
  if (session.type === 'hold' || session.type === 'walk') return session.hold || 0;
  if (session.rounds) return session.rounds.reduce((sum, r) => sum + (r.holdActual || 0), 0);
  if (session.dives) return apneaDives(session).reduce((sum, d) => sum + d.duration, 0);
  return 0;
}

/** Deepest imported dive, or null. */
export function bestDepth(sessions = listSessions()) {
  let best = null;
  for (const s of sessions) {
    for (const d of s.dives || []) {
      if (d.maxDepth && (!best || d.maxDepth > best.depth)) best = { depth: d.maxDepth, date: s.date, id: s.id };
    }
  }
  return best;
}

/** Best distance for a given discipline: 'DYN' | 'DNF' | 'DYNB' | 'walk'. */
export function bestDistance(discipline, sessions = listSessions()) {
  let best = null;
  for (const s of sessions) {
    const match = discipline === 'walk' ? s.type === 'walk' : s.type === 'dyn' && s.discipline === discipline;
    if (!match || !s.distance) continue;
    if (!best || s.distance > best.distance) best = { distance: s.distance, date: s.date, id: s.id };
  }
  return best;
}

export function sessionDuration(session) {
  if (session.type === 'hold' || session.type === 'walk') return (session.prep || 0) + (session.hold || 0) + (session.recovery || 0);
  if (session.type === 'relax') return session.duration || 0;
  if (session.rounds) return session.rounds.reduce((sum, r) => sum + (r.holdActual || 0) + (r.restActual ?? r.rest ?? 0), 0);
  if (session.dives) return session.dives.reduce((sum, d) => sum + (d.duration || 0) + (d.surfaceInterval || 0), 0);
  return 0;
}

// --- storage durability ------------------------------------------------------
//
// Browsers evict "best effort" script-writable storage: WebKit caps it at about
// seven days without interaction. Asking for persistent storage exempts the
// origin — Chrome grants it on engagement, Safari on home-screen install.

export async function requestPersistence() {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageStatus() {
  const out = { persisted: false, supported: Boolean(navigator.storage?.persisted), usage: null, quota: null };
  try {
    if (out.supported) out.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      out.usage = est.usage ?? null;
      out.quota = est.quota ?? null;
    }
  } catch { /* leave defaults */ }
  return out;
}

/** Days since the last export, or null if never exported. */
export function daysSinceExport() {
  const last = getSettings().lastExport;
  if (!last) return null;
  return Math.floor((Date.now() - new Date(last).getTime()) / 864e5);
}

/** True when there is history worth losing and no recent backup of it. */
export function backupOverdue(sessions = listSessions()) {
  if (sessions.length < 3) return false;
  const days = daysSinceExport();
  return days === null || days >= 30;
}

export function markExported() {
  saveSettings({ lastExport: new Date().toISOString() });
}

export function exportJSON() {
  return JSON.stringify({ app: 'apnea', version: 1, exported: new Date().toISOString(), sessions: listSessions() }, null, 2);
}

/**
 * Merge sessions in, skipping anything we already hold. `importId` is what
 * makes re-importing the same watch file harmless: the same activity always
 * derives the same key, so a second import adds nothing.
 * Returns { added, skipped }.
 */
export function mergeSessions(incoming) {
  if (!Array.isArray(incoming)) throw new Error('No sessions found in that file.');
  const all = read(SESSIONS_KEY, []);
  const ids = new Set(all.map((s) => s.id));
  const imported = new Set(all.map((s) => s.importId).filter(Boolean));
  let added = 0;
  let skipped = 0;

  for (const s of incoming) {
    if (!s || !s.type) continue;
    if ((s.id && ids.has(s.id)) || (s.importId && imported.has(s.importId))) { skipped++; continue; }
    const entry = { note: '', ...s, id: s.id || uid() };
    all.push(entry);
    ids.add(entry.id);
    if (entry.importId) imported.add(entry.importId);
    added++;
  }

  write(SESSIONS_KEY, all);
  return { added, skipped };
}

/** Merge a JSON export back in. Returns count added. */
export function importJSON(text) {
  const parsed = JSON.parse(text);
  const incoming = Array.isArray(parsed) ? parsed : parsed.sessions;
  if (!Array.isArray(incoming)) throw new Error('No sessions array found in that file.');
  return mergeSessions(incoming).added;
}
