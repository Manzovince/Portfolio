// Statistics, weak-point analysis, records and per-exercise progression.
import { db, exById, bestOf, better, isWork, sessionStats, sessionKind, mondayOf, addDays, dayKey, plannedOn, isPlannedDone, fmtNum, fmtClock, fmtDur, fmtKm, fmtPace, fmtTonnage, setSummary } from './store.js?v=4';
import { MUSCLES, REGIONS, MODES } from './library.js?v=4';
import { esc, icon, sheet, fmtDayShort, fmtDay } from './ui.js?v=4';
import { bars, line, attachTips } from './charts.js?v=4';

const C_FORCE = 'var(--c1)', C_RUN = 'var(--c2)', C_MOB = 'var(--c3)';
const RANGES = [[28, '4 sem.'], [91, '3 mois'], [182, '6 mois'], [365, '1 an'], [0, 'Tout']];
let range = 91;

export function renderStats(el) {
  const now = new Date();
  const from = range ? addDays(now, -range + 1) : new Date(db.sessions[0]?.start || now);
  from.setHours(0, 0, 0, 0);
  if (db.sessions.length && from < mondayOf(new Date(db.sessions[0].start))) from.setTime(+mondayOf(new Date(db.sessions[0].start)));
  const sess = db.sessions.filter(s => s.start >= +from);

  if (!db.sessions.length) {
    el.innerHTML = `<header class="page-head"><h1>Statistiques</h1></header>
      <div class="empty-state">${icon('chart')}<p>Termine ta première séance pour voir tes progrès ici.</p><p class="muted sm">Astuce : Réglages → « Charger une démo » pour explorer avec 12 semaines de données fictives.</p></div>`;
    return;
  }

  const tot = sess.reduce((a, s) => { const st = sessionStats(s); a.dur += st.duration; a.ton += st.tonnage; a.km += st.dist; a.sets += st.sets; return a; }, { dur: 0, ton: 0, km: 0, sets: 0 });
  const weeks = weekBuckets(sess, from, now);
  const nW = weeks.length;
  const insights = analyse(sess, from, now);

  el.innerHTML = `
    <header class="page-head"><h1>Statistiques</h1></header>
    <div class="seg" role="tablist">${RANGES.map(([d, l]) => `<button class="${d === range ? 'on' : ''}" data-range="${d}">${l}</button>`).join('')}</div>
    <div class="kpis four">
      <div class="kpi"><b>${sess.length}</b><small>séances</small></div>
      <div class="kpi"><b>${fmtDur(tot.dur)}</b><small>d’effort</small></div>
      <div class="kpi"><b>${fmtTonnage(tot.ton)}</b><small>soulevés</small></div>
      <div class="kpi"><b>${fmtKm(tot.km)}</b><small>courus</small></div>
    </div>

    <section class="card">
      <h2>Temps d’entraînement par semaine</h2>
      <div class="legend"><span><i style="background:${C_FORCE}"></i>Renforcement</span><span><i style="background:${C_RUN}"></i>Course</span><span><i style="background:${C_MOB}"></i>Mobilité</span></div>
      ${bars({ data: weeks.map(w => ({ label: w.label, values: [w.force / 60, w.run / 60, w.mob / 60], tip: `<b>Semaine du ${esc(w.label)}</b><br>Renfo ${fmtDur(w.force)} · Course ${fmtDur(w.run)}<br>Mobilité ${fmtDur(w.mob)} · ${w.n} séance${w.n > 1 ? 's' : ''}` })), series: [{ color: C_FORCE }, { color: C_RUN }, { color: C_MOB }], fmt: v => `${Math.round(v)}′`, labelEvery: Math.ceil(nW / 7) })}
    </section>

    <section class="card">
      <h2>${icon('warn')} Points faibles &amp; alertes</h2>
      ${insights.length ? `<ul class="insights">${insights.map(x => `<li class="ins ${x.level}"><b>${esc(x.title)}</b><span>${esc(x.text)}</span></li>`).join('')}</ul>` : '<p class="muted">Rien à signaler sur cette période : entraînement équilibré et en progression. 👌</p>'}
    </section>

    ${muscleSection(sess, from, now)}
    ${runSection(sess, weeks, nW)}
    ${recordsSection()}
  `;
  el.querySelectorAll('[data-range]').forEach(b => b.onclick = () => { range = +b.dataset.range; renderStats(el); });
  el.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => openExerciseDetail(b.dataset.ex));
  attachTips(el);
}

function weekBuckets(sess, from, now) {
  const out = [];
  for (let w = mondayOf(from); w <= now; w = addDays(w, 7)) out.push({ start: +w, end: +addDays(w, 7), label: fmtDayShort(w), force: 0, run: 0, mob: 0, km: 0, n: 0 });
  for (const s of sess) {
    const b = out.find(w => s.start >= w.start && s.start < w.end);
    if (!b) continue;
    const st = sessionStats(s);
    b.n++; b.km += st.dist;
    const k = sessionKind(s);
    k === 'course' ? (b.run += st.duration) : k === 'mobilite' ? (b.mob += st.duration) : (b.force += st.duration);
  }
  return out;
}

// Effective sets per muscle (primary 1, secondary 0.5), warm-ups and runs excluded.
function muscleSets(sess) {
  const m = Object.fromEntries(Object.keys(MUSCLES).map(k => [k, 0]));
  for (const s of sess) for (const it of s.items) {
    const ex = exById(it.exId);
    if (ex.mode === 'run' || ex.cat === 'mobilite') continue;
    const n = it.sets.filter(isWork).length;
    for (const k of ex.muscles) m[k] += n;
    for (const k of ex.secondary || []) m[k] += n * 0.5;
  }
  return m;
}
const weeksIn = (from, now) => Math.max(1, (now - from) / (7 * 864e5));
const regionSum = (m, r) => REGIONS[r].reduce((a, k) => a + m[k], 0);

function muscleSection(sess, from, now) {
  const m = muscleSets(sess);
  const wk = weeksIn(from, now);
  const rows = Object.entries(m).map(([k, v]) => [k, v / wk]).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(r => r[1]));
  if (rows.every(r => r[1] === 0)) return '';
  const push = regionSum(m, 'poussee'), pull = regionSum(m, 'tirage');
  const upper = push + pull, lower = regionSum(m, 'jambes');
  const ratio = (a, b) => (b ? fmtNum(Math.round((a / b) * 10) / 10) : '—');
  return `<section class="card">
    <h2>Équilibre musculaire</h2>
    <p class="muted sm">Séries effectives par semaine (muscle secondaire = ½ série). Zone utile ≈ 10–20.</p>
    <div class="ratios">
      <div><small>Poussée / Tirage</small><b>${ratio(push, pull)}</b></div>
      <div><small>Haut / Bas</small><b>${ratio(upper, lower)}</b></div>
      <div><small>Quadris / Ischios</small><b>${ratio(m.quadriceps, m.ischios)}</b></div>
    </div>
    <div class="hbars">${rows.map(([k, v]) => `<div class="hbar ${v < 4 ? 'low' : ''}" data-tip="<b>${esc(MUSCLES[k])}</b><br>${fmtNum(Math.round(v * 10) / 10)} séries/sem.">
      <span>${esc(MUSCLES[k])}</span><div class="track"><i style="width:${(v / max) * 100}%"></i><em class="zone" style="left:${Math.min(100, (10 / max) * 100)}%;width:${Math.max(0, Math.min(100, (20 / max) * 100) - Math.min(100, (10 / max) * 100))}%"></em></div><b>${fmtNum(Math.round(v * 10) / 10)}</b></div>`).join('')}</div>
  </section>`;
}

function runSection(sess, weeks, nW) {
  const runs = sess.filter(s => sessionStats(s).dist > 0);
  if (!runs.length) return '';
  const pts = runs.map(s => { const st = sessionStats(s); return st.runSec && st.dist ? { x: s.start, y: st.runSec / (st.dist / 1000), tip: `<b>${esc(s.name)}</b><br>${fmtDayShort(new Date(s.start))} · ${fmtKm(st.dist)} · ${fmtPace(st.runSec / (st.dist / 1000))}` } : null; }).filter(Boolean);
  const longest = Math.max(...runs.map(s => sessionStats(s).dist));
  return `<section class="card">
    <h2>Course à pied</h2>
    <div class="kpis three">
      <div class="kpi"><b>${fmtKm(weeks.reduce((a, w) => a + w.km, 0) / Math.max(1, nW))}</b><small>par semaine</small></div>
      <div class="kpi"><b>${fmtKm(longest)}</b><small>plus longue</small></div>
      <div class="kpi"><b>${runs.length}</b><small>sorties</small></div>
    </div>
    <h3>Kilomètres par semaine</h3>
    ${bars({ data: weeks.map(w => ({ label: w.label, values: [w.km / 1000], tip: `<b>Semaine du ${esc(w.label)}</b><br>${fmtKm(w.km)}` })), series: [{ color: C_RUN }], fmt: v => fmtNum(Math.round(v)), labelEvery: Math.ceil(nW / 7), h: 130 })}
    <h3>Allure moyenne par sortie</h3>
    ${line({ pts, color: C_RUN, invert: true, fmtY: v => fmtPace(v).replace('/km', '') })}
  </section>`;
}

// ---------- records ----------
export function records() {
  const best = new Map();
  for (const s of db.sessions) for (const it of s.items) {
    const ex = exById(it.exId);
    if (ex.cat === 'mobilite') continue;
    const b = bestOf(ex.mode, it.sets);
    if (!b || !b.value) continue;
    const cur = best.get(it.exId);
    if (!cur || better(ex.mode, b.value, cur.value)) best.set(it.exId, { ...b, date: s.start, n: (cur?.n || 0) + 1 });
    else cur.n++;
  }
  return [...best.entries()].map(([exId, b]) => ({ exId, ...b })).sort((a, b) => b.n - a.n);
}

function recordsSection() {
  const rec = records();
  if (!rec.length) return '';
  return `<section class="card">
    <h2>${icon('trophy')} Records &amp; progression</h2>
    <p class="muted sm">Touche un exercice pour voir sa courbe.</p>
    <div class="rec-list">${rec.map(r => { const ex = exById(r.exId); return `<button class="rec" data-ex="${esc(r.exId)}">
      <span><b>${esc(ex.name)}</b><small>${r.n} séance${r.n > 1 ? 's' : ''} · ${fmtDayShort(new Date(r.date))}</small></span>
      <em>${esc(ex.mode === 'wr' ? `${fmtNum(Math.round(r.value))} kg (1RM est.)` : r.label)}</em>${icon('chev')}</button>`; }).join('')}</div>
  </section>`;
}

// ---------- weak points ----------
export function analyse(sess, from, now) {
  const out = [];
  const wk = weeksIn(from, now);
  const m = muscleSets(sess);
  const strengthSets = Object.values(m).reduce((a, b) => a + b, 0);

  if (strengthSets / wk >= 8) {
    const per = k => m[k] / wk;
    const main = ['pecs', 'dos', 'epaules', 'quadriceps', 'ischios', 'fessiers', 'abdos', 'biceps', 'triceps'];
    const avg = main.reduce((a, k) => a + per(k), 0) / main.length;
    const weak = main.filter(k => per(k) < Math.max(3, avg * 0.35));
    if (weak.length) out.push({ level: 'warn', title: 'Muscles négligés', text: `${weak.map(k => MUSCLES[k]).join(', ')} : moins de ${Math.max(3, Math.round(avg * 0.35))} séries/semaine. Ajoute 1–2 exercices ciblés.` });
    const push = regionSum(m, 'poussee'), pull = regionSum(m, 'tirage');
    if (pull && push / pull > 1.4) out.push({ level: 'warn', title: 'Trop de poussée', text: `Ratio poussée/tirage de ${fmtNum(Math.round(push / pull * 10) / 10)} : renforce le dos (tractions, rowing, face pull) pour protéger les épaules.` });
    if (push && pull / push > 1.6) out.push({ level: 'info', title: 'Peu de poussée', text: `Le tirage domine (×${fmtNum(Math.round(pull / push * 10) / 10)}). Pompes, dips ou développés équilibreraient le haut du corps.` });
    if (m.ischios && m.quadriceps / m.ischios > 2) out.push({ level: 'warn', title: 'Ischios en retrait', text: `Quadriceps ×${fmtNum(Math.round(m.quadriceps / m.ischios * 10) / 10)} plus sollicités que les ischios : facteur de blessure fréquent chez les coureurs (nordic curl, soulevé roumain).` });
    else if (!m.ischios && m.quadriceps > 0) out.push({ level: 'warn', title: 'Ischios absents', text: 'Aucune série pour les ischios-jambiers : ajoute nordic curl ou soulevé de terre roumain.' });
    if (regionSum(m, 'tronc') / wk < 3) out.push({ level: 'info', title: 'Gainage léger', text: 'Moins de 3 séries de tronc par semaine. Le gainage améliore la posture en course et la stabilité sous charge.' });
    const lower = regionSum(m, 'jambes'), upper = push + pull;
    if (lower && upper / lower > 2.5) out.push({ level: 'info', title: 'Haut du corps dominant', text: 'Le bas du corps reçoit peu de volume en renforcement (la course ne remplace pas la force).' });
  } else if (sess.length) {
    out.push({ level: 'info', title: 'Peu de renforcement', text: 'Moins de 8 séries de renfo par semaine en moyenne sur la période : l’analyse musculaire reste approximative.' });
  }

  // stagnation: no record over the last 3 sessions of an exercise done ≥ 5 times in ≥ 3 weeks
  const byEx = new Map();
  for (const s of sess) for (const it of s.items) {
    const ex = exById(it.exId);
    if (ex.mode === 'run' || ex.cat === 'mobilite') continue;
    const b = bestOf(ex.mode, it.sets);
    if (!b || !b.value) continue;
    if (!byEx.has(it.exId)) byEx.set(it.exId, []);
    const arr = byEx.get(it.exId);
    if (arr.length && arr[arr.length - 1].t === s.start) { if (better(ex.mode, b.value, arr[arr.length - 1].v)) arr[arr.length - 1].v = b.value; }
    else arr.push({ t: s.start, v: b.value });
  }
  const stalled = [], rising = [];
  for (const [exId, arr] of byEx) {
    if (arr.length < 5 || arr[arr.length - 1].t - arr[0].t < 21 * 864e5) continue;
    const mode = exById(exId).mode;
    const head = arr.slice(0, -3), tail = arr.slice(-3);
    const bestHead = head.reduce((a, x) => (better(mode, x.v, a) ? x.v : a), head[0].v);
    const bestTail = tail.reduce((a, x) => (better(mode, x.v, a) ? x.v : a), tail[0].v);
    if (!better(mode, bestTail, bestHead)) stalled.push(exId);
    else if ((bestTail - arr[0].v) / arr[0].v > 0.08) rising.push(exId);
  }
  if (stalled.length) out.push({ level: 'warn', title: 'Stagnation', text: `${stalled.map(id => exById(id).name).join(', ')} : pas de record sur les 3 dernières séances. Varie les reps, ajoute une semaine de décharge ou change de variante.` });
  if (rising.length) out.push({ level: 'good', title: 'En progression', text: `${rising.slice(0, 4).map(id => exById(id).name).join(', ')} : +8 % ou plus depuis le début de la période.` });

  // running load spikes (10 % rule, loosely)
  const weekKm = [];
  for (let w = mondayOf(addDays(now, -42)); w <= now; w = addDays(w, 7)) {
    const end = +addDays(w, 7);
    weekKm.push(db.sessions.filter(s => s.start >= +w && s.start < end).reduce((a, s) => a + sessionStats(s).dist, 0));
  }
  const lastFull = weekKm.slice(-2, -1)[0] ?? 0;
  const prev = weekKm.slice(-5, -2);
  const prevAvg = prev.reduce((a, b) => a + b, 0) / Math.max(1, prev.length);
  if (prevAvg > 5000 && lastFull > prevAvg * 1.3) out.push({ level: 'warn', title: 'Pic de charge en course', text: `${fmtKm(lastFull)} la semaine dernière contre ${fmtKm(prevAvg)} en moyenne avant (+${Math.round((lastFull / prevAvg - 1) * 100)} %). Au-delà de +10–20 %/semaine, le risque de blessure grimpe.` });
  const runs = sess.filter(s => sessionStats(s).dist > 0);
  if (runs.length >= 6) {
    const fast = runs.filter(s => s.items.some(it => ['run-interval', 'run-tempo', 'run-hill'].includes(it.exId))).length;
    if (fast / runs.length > 0.5) out.push({ level: 'info', title: 'Beaucoup d’intensité', text: `${Math.round(fast / runs.length * 100)} % de tes sorties sont du fractionné/seuil. Vise ~80 % d’endurance fondamentale.` });
    if (!fast) out.push({ level: 'info', title: 'Que de l’endurance', text: 'Aucune séance de fractionné ou de seuil : une séance de qualité par semaine ferait progresser l’allure.' });
  }

  // mobility: minutes per week vs training load
  const mobMin = sess.reduce((a, s) => a + sessionStats(s).mobSec, 0) / 60 / wk;
  if (sess.length / wk >= 2.5 && mobMin < 10) out.push({ level: 'info', title: 'Peu de mobilité', text: `${Math.round(mobMin)} min d’étirements/mobilité par semaine. 2 × 10 min (ex. « Étirements après course », « Réveil mobilité ») aident à récupérer et à garder l’amplitude.` });
  else if (mobMin >= 30) out.push({ level: 'good', title: 'Mobilité régulière', text: `${Math.round(mobMin)} min de mobilité par semaine en moyenne. Continue !` });

  // adherence to planned sessions over the last 4 weeks
  let planned = 0, done = 0;
  for (let d = addDays(now, -28); d < now; d = addDays(d, 1)) {
    if (dayKey(d) === dayKey(now)) break;
    for (const e of plannedOn(d)) { planned++; if (isPlannedDone(d, e)) done++; }
  }
  if (planned >= 4) {
    const r = done / planned;
    if (r < 0.7) out.push({ level: 'warn', title: 'Régularité', text: `${done}/${planned} séances prévues réalisées sur 4 semaines (${Math.round(r * 100)} %). Allège le programme ou déplace les jours difficiles.` });
    else if (r >= 0.9) out.push({ level: 'good', title: 'Régularité', text: `${done}/${planned} séances prévues réalisées sur 4 semaines. Solide !` });
  }

  // fatigue: rising perceived effort
  const felt = sess.filter(s => s.feel).slice(-6);
  if (felt.length >= 6) {
    const a = (felt[0].feel + felt[1].feel + felt[2].feel) / 3, b = (felt[3].feel + felt[4].feel + felt[5].feel) / 3;
    if (b - a >= 1 && b >= 3.7) out.push({ level: 'warn', title: 'Fatigue qui monte', text: 'Ton ressenti s’alourdit sur les dernières séances. Une semaine de décharge pourrait relancer la progression.' });
  }
  const order = { warn: 0, info: 1, good: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

// ---------- exercise detail ----------
export function openExerciseDetail(exId) {
  const ex = exById(exId);
  const hist = [];
  for (const s of db.sessions) for (const it of s.items) if (it.exId === exId && it.sets.some(isWork)) hist.push({ s, it, b: bestOf(ex.mode, it.sets) });
  const metric = { wr: '1RM estimé (kg)', bw: 'Meilleure série (reps)', time: 'Meilleur maintien', run: 'Allure (min/km)' }[ex.mode];
  const fmtY = { wr: v => fmtNum(Math.round(v)), bw: v => String(Math.round(v)), time: v => fmtClock(v), run: v => fmtPace(v).replace('/km', '') }[ex.mode];
  const pts = hist.filter(h => h.b && h.b.value).map(h => ({ x: h.s.start, y: h.b.value, tip: `<b>${fmtDayShort(new Date(h.s.start))}</b><br>${esc(h.b.label)}` }));
  const recs = records().find(r => r.exId === exId);
  const volPts = ex.mode === 'wr' ? hist.map(h => ({ x: h.s.start, y: h.it.sets.filter(isWork).reduce((a, x) => a + (+x.kg || 0) * (+x.reps || 0), 0), tip: `<b>${fmtDayShort(new Date(h.s.start))}</b><br>${fmtTonnage(h.it.sets.filter(isWork).reduce((a, x) => a + (+x.kg || 0) * (+x.reps || 0), 0))}` })) : null;
  sheet({
    title: ex.name, full: true,
    body: `<div class="detail">
      <p class="muted sm">${esc(MODES[ex.mode].label)}${ex.muscles.length ? ' · ' + ex.muscles.map(k => MUSCLES[k]).join(', ') : ''}</p>
      ${recs ? `<div class="kpis three"><div class="kpi"><b>${esc(ex.mode === 'wr' ? fmtNum(Math.round(recs.value)) + ' kg' : recs.label)}</b><small>record</small></div><div class="kpi"><b>${hist.length}</b><small>séances</small></div><div class="kpi"><b>${esc(hist.length ? hist[hist.length - 1].b?.label || '—' : '—')}</b><small>dernière</small></div></div>` : '<p class="empty">Pas encore fait.</p>'}
      ${pts.length ? `<section class="card"><h2>${metric}</h2>${line({ pts, color: ex.mode === 'run' ? C_RUN : C_FORCE, invert: ex.mode === 'run', fmtY })}</section>` : ''}
      ${volPts && volPts.length > 1 ? `<section class="card"><h2>Volume par séance</h2>${line({ pts: volPts, color: C_FORCE, fmtY: v => fmtTonnage(v), h: 130 })}</section>` : ''}
      ${hist.length ? `<section class="card"><h2>Historique</h2><div class="hist">${hist.slice().reverse().map(h => `<div class="hist-row"><small>${fmtDay(new Date(h.s.start))}</small><div>${h.it.sets.filter(x => x.done).map(x => `<span class="pill ${x.kind === 'w' ? 'dim' : ''}">${esc(setSummary(ex, x))}</span>`).join('')}</div></div>`).join('')}</div></section>` : ''}
    </div>`,
    onMount(el) { attachTips(el); },
  });
}
