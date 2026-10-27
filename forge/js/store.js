// Persistent state (localStorage) + domain helpers shared by every view.
import { LIBRARY, MODES } from './library.js?v=1';

const KEY = 'forge.v1';

export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

// ---------- dates (local day keys "YYYY-MM-DD") ----------
export const pad = n => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const mondayOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const daysBetween = (a, b) => Math.round((parseDay(dayKey(b)) - parseDay(dayKey(a))) / 864e5);

// ---------- seed ----------
const S = (n, f) => Array.from({ length: n }, () => ({ ...f }));
const item = (exId, sets, rest) => ({ id: uid(), exId, sets, rest, note: '' });

function seedTemplates() {
  return [
    { id: uid(), name: 'Full body A', color: 'ember', note: 'Base force, 3 grands mouvements.', items: [
      item('squat', [{ kind: 'w', kg: 40, reps: 8 }, ...S(4, { kg: 60, reps: 6 })], 180),
      item('bench', [{ kind: 'w', kg: 30, reps: 8 }, ...S(4, { kg: 50, reps: 6 })], 150),
      item('row-bb', S(3, { kg: 45, reps: 8 }), 120),
      item('rdl', S(3, { kg: 50, reps: 10 }), 120),
      item('plank', S(3, { sec: 45 }), 45),
    ] },
    { id: uid(), name: 'Haut du corps PDC', color: 'violet', note: 'Barre de traction + sol.', items: [
      item('pullup', S(4, { reps: 6 }), 120),
      item('pushup', S(4, { reps: 15 }), 90),
      item('dips', S(3, { reps: 10 }), 120),
      item('inv-row', S(3, { reps: 12 }), 90),
      item('pike', S(3, { reps: 10 }), 90),
      item('hollow', S(3, { sec: 30 }), 45),
    ] },
    { id: uid(), name: 'Jambes PDC', color: 'lime', note: '', items: [
      item('bw-squat', S(3, { reps: 20 }), 60),
      item('lunge', S(3, { reps: 12 }), 60),
      item('glute-bridge', S(3, { reps: 15 }), 60),
      item('nordic', S(3, { reps: 5 }), 120),
      item('calf-bw', S(3, { reps: 15 }), 45),
      item('side-plank', S(2, { sec: 30 }), 30),
    ] },
    { id: uid(), name: 'Fractionné 10 × 400 m', color: 'teal', note: 'Échauffement 2 km, 10 × 400 m récup 1’30, retour au calme.', items: [
      item('run-easy', [{ dist: 2000, pace: 345 }], 60),
      item('run-interval', S(10, { dist: 400, pace: 255 }), 90),
      item('run-easy', [{ dist: 1500, pace: 360 }], 0),
    ] },
    { id: uid(), name: 'Footing 45’', color: 'teal', note: 'Endurance fondamentale, aisance respiratoire.', items: [
      item('run-easy', [{ sec: 2700, pace: 350 }], 0),
    ] },
    { id: uid(), name: 'Sortie longue', color: 'sky', note: '', items: [
      item('run-long', [{ dist: 14000, pace: 360 }], 0),
    ] },
    { id: uid(), name: 'Gainage express', color: 'rose', note: '10 minutes, sans matériel.', items: [
      item('plank', S(3, { sec: 45 }), 30),
      item('side-plank', S(2, { sec: 30 }), 20),
      item('hollow', S(2, { sec: 30 }), 30),
      item('superman', S(2, { reps: 15 }), 30),
      item('mountain', S(2, { sec: 30 }), 30),
    ] },
  ];
}

function defaults() {
  return {
    v: 1,
    settings: { rest: 90, sound: true, vibrate: true, theme: 'dark', bodyweight: 0 },
    customEx: [],
    templates: seedTemplates(),
    programs: [],
    planned: [],   // one-off planned sessions {id, date, tplId}
    sessions: [],  // finished workouts
    active: null,  // workout in progress (survives reloads)
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch { /* fall through */ }
  return defaults();
}

export let db = load();

let saveTimer = 0;
export function save(now = false) {
  clearTimeout(saveTimer);
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('save failed', e); } };
  if (now) write(); else saveTimer = setTimeout(write, 120);
}
window.addEventListener('pagehide', () => save(true));

export function replaceDb(next) { db = { ...defaults(), ...next }; save(true); }
export function resetDb() { db = defaults(); save(true); }

// ---------- exercises ----------
let exIndex = null;
export function allExercises() { return [...LIBRARY, ...db.customEx]; }
export function exById(id) {
  if (!exIndex || exIndex.size !== LIBRARY.length + db.customEx.length) exIndex = new Map(allExercises().map(e => [e.id, e]));
  return exIndex.get(id) || { id, name: 'Exercice inconnu', cat: 'charges', mode: 'wr', muscles: [], secondary: [] };
}
export function invalidateEx() { exIndex = null; }

// ---------- metrics ----------
export const e1rm = (kg, reps) => (kg > 0 && reps > 0 ? (reps === 1 ? kg : kg * (1 + Math.min(reps, 12) / 30)) : 0);
export const isWork = s => s.done && s.kind !== 'w';

// Best value of one exercise inside one session, by mode. Pace: lower is better.
export function bestOf(mode, sets) {
  const w = sets.filter(isWork);
  if (!w.length) return null;
  if (mode === 'wr') {
    let best = null;
    for (const s of w) { const v = e1rm(+s.kg, +s.reps); if (v && (!best || v > best.e1rm)) best = { e1rm: v, kg: +s.kg, reps: +s.reps }; }
    return best && { value: best.e1rm, label: `${fmtNum(best.kg)} kg × ${best.reps}`, ...best, maxKg: Math.max(...w.map(s => +s.kg || 0)) };
  }
  if (mode === 'bw') {
    const reps = Math.max(...w.map(s => +s.reps || 0));
    const kg = Math.max(...w.map(s => +s.kg || 0));
    return { value: reps, label: kg ? `${reps} reps (+${fmtNum(kg)} kg)` : `${reps} reps`, reps, kg, total: w.reduce((a, s) => a + (+s.reps || 0), 0) };
  }
  if (mode === 'time') { const sec = Math.max(...w.map(s => +s.sec || 0)); return { value: sec, label: fmtClock(sec), sec }; }
  const dist = w.reduce((a, s) => a + (+s.dist || 0), 0);
  const sec = w.reduce((a, s) => a + (+s.sec || 0), 0);
  const paced = w.filter(s => +s.dist > 0 && +s.sec > 0);
  const pace = paced.length ? Math.min(...paced.map(s => s.sec / (s.dist / 1000))) : 0;
  return { value: pace, dist, sec, pace, label: pace ? `${fmtPace(pace)} · ${fmtKm(dist)}` : fmtKm(dist) };
}

export function sessionStats(sess) {
  let tonnage = 0, sets = 0, dist = 0, runSec = 0, reps = 0;
  for (const it of sess.items) {
    const ex = exById(it.exId);
    for (const s of it.sets) {
      if (!isWork(s)) continue;
      sets++;
      if (ex.mode === 'wr') { tonnage += (+s.kg || 0) * (+s.reps || 0); reps += +s.reps || 0; }
      if (ex.mode === 'bw') { tonnage += (+s.kg || 0) * (+s.reps || 0); reps += +s.reps || 0; }
      if (ex.mode === 'run') { dist += +s.dist || 0; runSec += +s.sec || 0; }
    }
  }
  return { tonnage, sets, dist, runSec, reps, duration: sess.end && sess.start ? Math.round((sess.end - sess.start) / 1000) : 0 };
}

export const better = (mode, a, b) => (mode === 'run' ? a < b : a > b);

// Records beaten by this session (first-ever attempts don't count).
export function computePRs(sess) {
  const out = new Map();
  for (const it of sess.items) {
    const ex = exById(it.exId);
    const cur = bestOf(ex.mode, it.sets);
    if (!cur || !cur.value) continue;
    let prev = null;
    for (const s of db.sessions) {
      if (s.id === sess.id || s.start >= sess.start) continue;
      for (const x of s.items) if (x.exId === it.exId) { const b = bestOf(ex.mode, x.sets); if (b && b.value && (prev == null || better(ex.mode, b.value, prev))) prev = b.value; }
    }
    if (prev == null || !better(ex.mode, cur.value, prev)) continue;
    const had = out.get(it.exId);
    if (!had || better(ex.mode, cur.value, had.value)) out.set(it.exId, { exId: it.exId, label: cur.label, value: cur.value });
  }
  return [...out.values()];
}

// What kind of session is this: 'course' if running dominates, else 'force'.
export function sessionKind(sess) {
  let run = 0, other = 0;
  for (const it of sess.items) (exById(it.exId).mode === 'run' ? run++ : other++);
  return run > other ? 'course' : 'force';
}

// Estimated duration of a template, seconds.
export function estimateTpl(tpl) {
  let t = 0;
  for (const it of tpl.items) {
    const ex = exById(it.exId);
    it.sets.forEach((s, i) => {
      if (ex.mode === 'run') t += +s.sec || ((+s.dist || 0) / 1000) * (+s.pace || 360);
      else if (ex.mode === 'time') t += +s.sec || 30;
      else t += 40;
      if (i < it.sets.length - 1 || it.rest) t += s.rest ?? it.rest ?? 0;
    });
  }
  return t;
}

// Last finished session containing this exercise (for the "précédent" column).
export function lastSetsFor(exId, beforeTs = Infinity) {
  for (let i = db.sessions.length - 1; i >= 0; i--) {
    const s = db.sessions[i];
    if (s.start >= beforeTs) continue;
    const it = s.items.find(x => x.exId === exId && x.sets.some(isWork));
    if (it) return it.sets.filter(x => x.done);
  }
  return null;
}

// ---------- programs ----------
// A program = weekly pattern repeated over N weeks + progression rule.
export function programWeek(p, date) {
  const d = daysBetween(mondayOf(parseDay(p.start)), date);
  if (d < 0) return 0;
  const w = Math.floor(d / 7) + 1;
  return w <= p.weeks ? w : 0;
}
export const isDeload = (p, week) => p.deload > 0 && week > 0 && week % p.deload === 0;

// All planned entries for one day: [{tplId, programId?, week?, plannedId?}]
export function plannedOn(date) {
  const key = dayKey(date), dow = (date.getDay() + 6) % 7, out = [];
  for (const p of db.programs) {
    if (key < p.start) continue;
    const week = programWeek(p, date);
    if (!week) continue;
    for (const slot of p.days[dow] || []) out.push({ tplId: slot, programId: p.id, week });
  }
  for (const x of db.planned) if (x.date === key) out.push({ tplId: x.tplId, plannedId: x.id });
  return out.filter(o => db.templates.some(t => t.id === o.tplId));
}

export function sessionsOn(date) {
  const key = dayKey(date);
  return db.sessions.filter(s => dayKey(new Date(s.start)) === key);
}

// Was this planned entry done? Matches a finished session of the same template that day.
export function isPlannedDone(date, entry) {
  return sessionsOn(date).some(s => s.tplId === entry.tplId);
}

// Apply a program's week-N progression to template sets.
export function progressSets(ex, sets, p, week) {
  if (!p || !week) return sets.map(s => ({ ...s }));
  const n = week - 1 - (p.deload ? Math.floor((week - 1) / p.deload) : 0); // deload weeks don't count
  const step = Math.floor(n / (p.every || 1));
  const deload = isDeload(p, week);
  let out = sets.map(s => {
    const x = { ...s };
    if (x.kind === 'w') return x;
    const v = +p.value || 0;
    if (p.rule === 'kg' && ex.mode === 'wr' && x.kg) x.kg = +x.kg + v * step;
    if (p.rule === 'reps' && (ex.mode === 'wr' || ex.mode === 'bw') && x.reps) x.reps = +x.reps + Math.round(v * step);
    if (p.rule === 'pct') {
      const f = Math.pow(1 + v / 100, step);
      if (ex.mode === 'wr' && x.kg) x.kg = roundKg(x.kg * f);
      if (ex.mode === 'bw' && x.reps) x.reps = Math.round(x.reps * f);
      if (ex.mode === 'time' && x.sec) x.sec = Math.round(x.sec * f / 5) * 5;
      if (ex.mode === 'run') { if (x.dist) x.dist = Math.round(x.dist * f / 50) * 50; else if (x.sec) x.sec = Math.round(x.sec * f / 30) * 30; }
    }
    if (p.rule === 'time' && ex.mode === 'time' && x.sec) x.sec = +x.sec + v * step;
    if (deload) {
      if (x.kg && ex.mode === 'wr') x.kg = roundKg(x.kg * 0.85);
      if (ex.mode === 'run' && x.dist) x.dist = Math.round(x.dist * 0.7 / 50) * 50;
      if (ex.mode === 'run' && !x.dist && x.sec) x.sec = Math.round(x.sec * 0.7 / 30) * 30;
    }
    return x;
  });
  if (deload && ex.mode !== 'run') {
    const work = out.filter(s => s.kind !== 'w');
    const keep = Math.max(1, Math.round(work.length * 0.6));
    let seen = 0;
    out = out.filter(s => s.kind === 'w' || ++seen <= keep);
  } else if (deload && ex.mode === 'run' && out.length > 2) {
    out = out.slice(0, Math.max(1, Math.round(out.length * 0.6)));
  }
  return out;
}
export const roundKg = kg => Math.round(kg / 1.25) * 1.25;

// ---------- formatting (here so domain helpers can label values) ----------
export const fmtNum = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR');
export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
export function fmtDur(sec) {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? `${h} h ${pad(m)}` : `${m} min`;
}
export const fmtPace = p => (p ? `${Math.floor(p / 60)}’${pad(Math.round(p % 60))}/km` : '—');
export const fmtKm = m => (m >= 100000 ? `${fmtNum(Math.round(m / 1000))} km` : m >= 10000 ? `${fmtNum(Math.round(m / 100) / 10)} km` : m >= 1000 ? `${fmtNum(Math.round(m / 10) / 100)} km` : `${Math.round(m || 0)} m`);
export const fmtTonnage = kg => (kg >= 1000 ? `${fmtNum(Math.round(kg / 100) / 10)} t` : `${Math.round(kg)} kg`);

export function setSummary(ex, s) {
  const m = ex.mode;
  if (m === 'wr') return `${s.kg ? fmtNum(+s.kg) + ' kg × ' : ''}${s.reps || '–'}`;
  if (m === 'bw') return `${s.reps || '–'}${+s.kg ? ` (+${fmtNum(+s.kg)} kg)` : ''}`;
  if (m === 'time') return `${fmtClock(s.sec)}${+s.kg ? ` (+${fmtNum(+s.kg)} kg)` : ''}`;
  const parts = [];
  if (+s.dist) parts.push(fmtKm(+s.dist));
  if (+s.sec) parts.push(fmtClock(+s.sec));
  if (+s.pace && !(+s.dist && +s.sec)) parts.push('@ ' + fmtPace(+s.pace));
  if (+s.dist && +s.sec) parts.push(fmtPace(s.sec / (s.dist / 1000)));
  return parts.join(' · ') || '–';
}

export const MODE_FIELDS = m => MODES[m].fields;
