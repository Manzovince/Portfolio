// Persistent state (localStorage) + domain helpers shared by every view.
import { LIBRARY, MODES } from './library.js?v=4';

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
    ...mobilityTemplates(),
  ];
}

// Mobility sessions, also added to existing saves by the v2 migration.
function mobilityTemplates() {
  return [
    { id: uid(), name: 'Réveil mobilité 10’', color: 'lime', note: 'Le matin ou avant une séance. Mouvements lents, respiration ample.', items: [
      item('cat-cow', [{ sec: 60 }], 10),
      item('worlds-greatest', S(2, { sec: 30 }), 10),
      item('thoracic-rot', [{ reps: 8 }], 10),
      item('hip-circles', [{ reps: 10 }], 10),
      item('deep-squat', [{ sec: 45 }], 10),
      item('dog-down', [{ sec: 45 }], 0),
    ] },
    { id: uid(), name: 'Échauffement dynamique', color: 'amber', note: 'Avant la course ou le renfo jambes.', items: [
      item('leg-swings', S(2, { reps: 10 }), 0),
      item('hip-circles', [{ reps: 10 }], 0),
      item('ankle-knee-wall', [{ reps: 10 }], 0),
      item('worlds-greatest', [{ sec: 20 }], 0),
      item('thoracic-rot', [{ reps: 6 }], 0),
    ] },
    { id: uid(), name: 'Étirements après course', color: 'sky', note: 'Tenir sans à-coups, 30 s par côté.', items: [
      item('calf-stretch', [{ sec: 30 }], 5),
      item('quad-stretch', [{ sec: 30 }], 5),
      item('hamstring-stretch', [{ sec: 30 }], 5),
      item('hip-flexor', [{ sec: 30 }], 5),
      item('pigeon', [{ sec: 45 }], 5),
      item('child-pose', [{ sec: 60 }], 0),
    ] },
    { id: uid(), name: 'Souplesse hanches & ischios', color: 'violet', note: 'Séance de souplesse ~25 min. Allonge les maintiens au fil des semaines.', items: [
      item('hip-9090', S(2, { reps: 10 }), 15),
      item('butterfly', S(2, { sec: 60 }), 15),
      item('frog', [{ sec: 60 }], 15),
      item('pigeon', S(2, { sec: 60 }), 15),
      item('pancake', S(2, { sec: 60 }), 15),
      item('front-split', [{ sec: 60 }], 15),
      item('happy-baby', [{ sec: 60 }], 0),
    ] },
    { id: uid(), name: 'Épaules & haut du dos', color: 'rose', note: 'Idéal après une séance de poussée ou une journée assis.', items: [
      item('band-dislocate', S(2, { reps: 12 }), 15),
      item('wall-slides', S(2, { reps: 10 }), 15),
      item('doorway-pec', [{ sec: 45 }], 10),
      item('thread-needle', [{ sec: 30 }], 10),
      item('shoulder-cross', [{ sec: 30 }], 10),
      item('triceps-stretch', [{ sec: 30 }], 10),
      item('neck-mob', [{ sec: 60 }], 10),
      item('wrist-mob', [{ sec: 60 }], 0),
    ] },
  ];
}

// Bodyweight + 12 kg dumbbells program (dips bars, pull-up bar), level 1 to start.
// Item notes carry levels 2-3: switch with "Remplacer l'exercice" when ready.
const ABC_NOTE = '3–4 séries · repos 90 s sur les exercices de base, 60 s sur les autres. Semaines 1–2 : niveau 1, arrête-toi à 2 reps de l’échec. Passe au niveau suivant d’un exercice quand toutes les séries sont en haut de fourchette deux séances de suite (⋯ → Remplacer l’exercice).';
const it2 = (exId, sets, rest, note) => ({ ...item(exId, sets, rest), note });
function abcTemplates() {
  const A = { id: uid(), name: 'A · Poussée et jambes', color: 'ember', note: ABC_NOTE, items: [
    it2('dips', S(3, { reps: 8 }), 90, '3×8–10 · Niv. 2 : 4×10–12, descente 3 s · Niv. 3 : lestés 12 kg entre les pieds, 4×6–8'),
    it2('pushup', S(3, { reps: 15 }), 90, '3×15 · Niv. 2 : pieds surélevés 3×12 · Niv. 3 : archer, ou aux barres de dips en amplitude, 3×8'),
    it2('goblet', S(3, { kg: 12, reps: 15 }), 90, 'Goblet 12 kg 3×15 · Niv. 2 : split squat bulgare 2×12 kg, 3×10/jambe · Niv. 3 : pistol avec l’haltère en contrepoids, 3×5/jambe'),
    it2('reverse-lunge', S(3, { kg: 24, reps: 10 }), 60, '2 × 12 kg, 3×10/jambe · Niv. 2 : descente en 3 s · Niv. 3 : fentes sautées alternées 3×8/jambe'),
    it2('step-calf', S(3, { reps: 12 }), 60, '1 pied, 3×12 · Niv. 2 : 1 pied + 12 kg · Niv. 3 : 1 pied + 12 kg, descente 4 s, 3×15'),
  ] };
  const B = { id: uid(), name: 'B · Tirage et chaîne postérieure', color: 'sky', note: ABC_NOTE, items: [
    it2('pullup', S(4, {}), 90, '4 × (max − 2) · Niv. 2 : 5×5, descente 4 s · Niv. 3 : lestées 12 kg, 4×4–6. Sans barre : remplace par « Rowing haltère unilatéral » 12 kg 4×12 (niv. 2 : pause 2 s en haut · niv. 3 : rowing inversé sous les barres de dips, 4×10)'),
    it2('sl-rdl', S(3, { kg: 12, reps: 10 }), 90, '12 kg, 3×10/jambe · Niv. 2 : 2 × 12 kg · Niv. 3 : 2 × 12 kg, descente 4 s'),
    it2('sl-hip-thrust', S(3, { reps: 12 }), 60, 'Au sol, 3×12/jambe · Niv. 2 : épaules sur un banc · Niv. 3 : 12 kg sur la hanche'),
    it2('pullover-db', S(3, { kg: 12, reps: 12 }), 60, '12 kg, allongé sur un banc ou au sol, lent. Étire la cage thoracique : utile pour l’apnée.'),
    it2('ytw', S(3, { reps: 10 }), 60, 'Sans charge 3×10 · Niv. 2 : penché · Niv. 3 : tenue 2 s en haut, 3×12'),
  ] };
  const C = { id: uid(), name: 'C · Gainage, chevilles, cage thoracique', color: 'amber', note: ABC_NOTE, items: [
    it2('dip-knee-raise', S(3, { reps: 12 }), 60, 'Genoux 3×12 · Niv. 2 : jambes tendues 3×10 · Niv. 3 : L-sit 3×15 s'),
    it2('side-plank', S(3, { sec: 40 }), 60, '3×40 s/côté · Niv. 2 : Copenhague genou en appui 3×20 s · Niv. 3 : Copenhague pied en appui 3×20 s'),
    it2('hollow', S(3, { sec: 30 }), 60, '3×30 s · Niv. 2 : hollow rocks 3×15 · Niv. 3 : tenue avec 12 kg bras tendus 3×20 s'),
    it2('farmer', S(3, { sec: 30, kg: 24 }), 60, '2 × 12 kg, 40 m (≈ 30 s) · Niv. 2 : sur la pointe des pieds, 30 m · Niv. 3 : un seul côté (suitcase), 30 m/côté'),
    it2('balance', S(3, { sec: 30 }), 15, '3×30 s/pied · Niv. 2 : yeux fermés · Niv. 3 : sur un coussin, 3×45 s'),
    it2('thoracic-roll', [{ sec: 180 }], 10, 'Mobilité apnée (10 min à sec) : ouverture thoracique sur rouleau'),
    it2('rib-stretch', [{ sec: 60 }], 10, 'Étirement latéral des côtes'),
    it2('breathing', [{ sec: 300 }], 0, 'Respiration diaphragmatique lente, à sec'),
  ] };
  const T = { id: uid(), name: 'Tests (toutes les 6 semaines)', color: 'slate', note: 'Maximum strict, repos complet entre les tests. Statique : à sec, allongé, jamais seul — quelqu’un près de toi. C’est ta valeur de référence pour les tables.', items: [
    it2('dips', [{}], 180, 'Dips stricts au maximum'),
    it2('pullup', [{}], 180, 'Tractions au maximum (si accès à la barre)'),
    it2('pushup', [{}], 180, 'Pompes strictes au maximum'),
    it2('bulgarian-db', [{ kg: 24 }], 180, '2 × 12 kg : répétitions max par jambe (note la plus faible)'),
    it2('static-dry', [{}], 0, 'À sec, allongé, avec quelqu’un près de toi'),
  ] };
  return { A, B, C, T };
}

function defaults() {
  return {
    v: 2,
    settings: { rest: 90, sound: true, vibrate: true, theme: 'dark', bodyweight: 0 },
    customEx: [],
    templates: seedTemplates(),
    programs: [],
    planned: [],   // one-off planned sessions {id, date, tplId}
    sessions: [],  // finished workouts
    active: null,  // workout in progress (survives reloads)
  };
}

function migrate(d) {
  if ((d.v || 1) < 2) {
    for (const t of mobilityTemplates()) if (!d.templates.some(x => x.name === t.name)) d.templates.push(t);
    d.v = 2;
    d._migrated = true;
  }
  if (d.v < 3) {
    if (!d.templates.some(t => t.name.startsWith('A · Poussée'))) {
      const { A, B, C, T } = abcTemplates();
      d.templates.push(A, B, C, T);
      const start = '2026-11-02', weeks = 30;
      d.programs.push({ id: uid(), name: 'Renfo reprise A · B · C', color: 'ember', start, weeks,
        days: [[], [A.id], [], [B.id], [], [C.id], []], rule: 'none', value: 0, every: 1, deload: 0 });
      for (const w of [1, 6, 12, 18, 24, 30]) d.planned.push({ id: uid(), date: dayKey(addDays(parseDay(start), (w - 1) * 7 + 6)), tplId: T.id });
    }
    d.v = 3;
    d._migrated = true;
  }
  if (d.v < 4) {
    // Monday is running: move A/B/C to Tue/Thu/Sat and tests to Sunday, unless already edited.
    const p = d.programs.find(x => x.name === 'Renfo reprise A · B · C');
    const flat = p && p.days.map(x => x.length).join('');
    if (p && flat === '1010100') {
      const [A, , B, , C] = p.days.map(x => x[0]);
      p.days = [[], [A], [], [B], [], [C], []];
      const T = d.templates.find(t => t.name === 'Tests (toutes les 6 semaines)');
      for (const x of d.planned) if (T && x.tplId === T.id && parseDay(x.date).getDay() === 6) x.date = dayKey(addDays(parseDay(x.date), 1));
    }
    d.v = 4;
    d._migrated = true;
  }
  return d;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate({ ...defaults(), ...JSON.parse(raw) });
  } catch { /* fall through */ }
  return migrate(defaults());
}

export let db = load();

let saveTimer = 0;
export function save(now = false) {
  clearTimeout(saveTimer);
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.warn('save failed', e); } };
  if (now) write(); else saveTimer = setTimeout(write, 120);
}
window.addEventListener('pagehide', () => save(true));
if (db._migrated) { delete db._migrated; save(true); }

export function replaceDb(next) { db = migrate({ ...defaults(), v: 1, ...next }); delete db._migrated; save(true); }
export function resetDb() { db = migrate(defaults()); delete db._migrated; save(true); }

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
  let tonnage = 0, sets = 0, dist = 0, runSec = 0, reps = 0, mobSec = 0;
  for (const it of sess.items) {
    const ex = exById(it.exId);
    for (const s of it.sets) {
      if (!isWork(s)) continue;
      sets++;
      if (ex.mode === 'wr') { tonnage += (+s.kg || 0) * (+s.reps || 0); reps += +s.reps || 0; }
      if (ex.mode === 'bw') { tonnage += (+s.kg || 0) * (+s.reps || 0); reps += +s.reps || 0; }
      if (ex.mode === 'run') { dist += +s.dist || 0; runSec += +s.sec || 0; }
      if (ex.cat === 'mobilite') mobSec += ex.mode === 'time' ? (+s.sec || 0) * (ex.side ? 2 : 1) : 30;
    }
  }
  return { tonnage, sets, dist, runSec, reps, mobSec, duration: sess.end && sess.start ? Math.round((sess.end - sess.start) / 1000) : 0 };
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
  const n = { course: 0, mobilite: 0, force: 0 };
  for (const it of sess.items) { const ex = exById(it.exId); n[ex.mode === 'run' ? 'course' : ex.cat === 'mobilite' ? 'mobilite' : 'force']++; }
  return n.course > n.force && n.course >= n.mobilite ? 'course' : n.mobilite > n.force ? 'mobilite' : 'force';
}

// Estimated duration of a template, seconds.
export function estimateTpl(tpl) {
  let t = 0;
  for (const it of tpl.items) {
    const ex = exById(it.exId);
    it.sets.forEach((s, i) => {
      if (ex.mode === 'run') t += +s.sec || ((+s.dist || 0) / 1000) * (+s.pace || 360);
      else if (ex.mode === 'time') t += (+s.sec || 30) * (ex.side ? 2 : 1) + (ex.side ? 5 : 0);
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
  if (m === 'wr') return `${s.kg ? fmtNum(+s.kg) + ' kg × ' : ''}${s.reps || '–'}${ex.side ? ' /côté' : ''}`;
  if (m === 'bw') return `${s.reps || '–'}${ex.side ? ' /côté' : ''}${+s.kg ? ` (+${fmtNum(+s.kg)} kg)` : ''}`;
  if (m === 'time') return `${fmtClock(s.sec)}${ex.side ? ' /côté' : ''}${+s.kg ? ` (+${fmtNum(+s.kg)} kg)` : ''}`;
  const parts = [];
  if (+s.dist) parts.push(fmtKm(+s.dist));
  if (+s.sec) parts.push(fmtClock(+s.sec));
  if (+s.pace && !(+s.dist && +s.sec)) parts.push('@ ' + fmtPace(+s.pace));
  if (+s.dist && +s.sec) parts.push(fmtPace(s.sec / (s.dist / 1000)));
  return parts.join(' · ') || '–';
}

export const MODE_FIELDS = m => MODES[m].fields;
