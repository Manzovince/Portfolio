// Fake 12-week history to explore the app (Settings → Charger une démo).
import { db, save, resetDb, uid, exById, addDays, mondayOf, dayKey, plannedOn, progressSets, estimateTpl, roundKg } from './store.js?v=6';

export function loadDemo() {
  resetDb();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const T = name => db.templates.find(t => t.name.startsWith(name));
  const fb = T('Full body A'), haut = T('Haut du corps'), frac = T('Fractionné'), foot = T('Footing'), longue = T('Sortie longue'), gain = T('Gainage'), reveil = T('Réveil mobilité'), etir = T('Étirements après course');

  const start = addDays(mondayOf(new Date()), -7 * 9);
  const prog = {
    id: uid(), name: 'Force + prépa 10 km', color: 'ember', start: dayKey(start), weeks: 12,
    days: [[fb.id], [frac.id], [reveil.id], [haut.id, gain.id], [foot.id], [], [longue.id, etir.id]],
    rule: 'kg', value: 2.5, every: 1, deload: 4,
  };
  db.programs.push(prog);

  const today = dayKey();
  for (let d = new Date(start); dayKey(d) < today; d = addDays(d, 1)) {
    for (const e of plannedOn(d)) {
      if (rnd() < 0.13) continue; // missed
      const tpl = db.templates.find(t => t.id === e.tplId);
      const w = e.week;
      const t0 = new Date(d); t0.setHours(e.tplId === longue.id ? 9 : 18, Math.floor(rnd() * 50), 0, 0);
      const items = tpl.items.map(it => {
        const ex = exById(it.exId);
        let sets = progressSets(ex, it.sets, prog, w).map(s => ({ ...s, done: true }));
        sets = sets.map(s => {
          if (ex.mode === 'wr' && it.exId === 'bench' && s.kind !== 'w') s.kg = Math.min(s.kg, 57.5); // bench stalls
          if (ex.mode === 'wr' && s.kind !== 'w' && rnd() < 0.12 + w * 0.01) s.reps = Math.max(1, s.reps - 1);
          if (ex.mode === 'bw') s.reps = Math.max(1, Math.round(s.reps + Math.floor(w / 2) + (rnd() * 2 - 1)));
          if (ex.mode === 'time') s.sec = Math.round((s.sec + w * 3 + rnd() * 6) / 5) * 5;
          if (ex.mode === 'run') {
            if (it.exId === 'run-long') s.dist = 10000 + Math.min(w, 9) * 700 + (w === 8 ? 3000 : 0);
            const pace = (s.pace || 360) - w * 1.2 + (rnd() * 10 - 5);
            if (s.dist) s.sec = Math.round(s.dist / 1000 * pace);
            else if (s.sec) s.dist = Math.round(s.sec / pace * 1000 / 10) * 10;
          }
          if (s.kg) s.kg = roundKg(s.kg);
          return s;
        });
        return { exId: it.exId, note: '', group: it.group || null, sets };
      });
      const dur = estimateTpl({ items: items.map(i => ({ ...i, rest: tpl.items.find(x => x.exId === i.exId)?.rest || 60 })) });
      db.sessions.push({
        id: uid(), tplId: tpl.id, programId: prog.id, week: w, name: tpl.name, color: tpl.color,
        start: +t0, end: +t0 + dur * 1000 * (0.9 + rnd() * 0.25), note: '',
        feel: Math.min(5, Math.max(1, Math.round(2.4 + rnd() * 1.6 + (w > 6 ? 0.6 : 0)))), items,
      });
    }
  }
  db.sessions.sort((a, b) => a.start - b.start);
  save(true);
}
