// Calendar of planned/done sessions + multi-week program editor.
import { db, save, uid, dayKey, parseDay, addDays, mondayOf, programWeek, isDeload, plannedOn, sessionsOn, isPlannedDone, progressSets, exById, estimateTpl, fmtDur, fmtNum, setSummary } from './store.js?v=8';
import { esc, icon, sheet, confirmDialog, toast, COLORS, colorOf, FR_DAYS, FR_DAYS_LONG, FR_MONTHS, fmtDay, fmtDayShort } from './ui.js?v=8';
import { startWorkout } from './active.js?v=8';
import { openSessionDetail } from './journal.js?v=8';
import { tplSummary } from './editor.js?v=8';

let cursor = new Date(); cursor.setDate(1);
const clone = o => JSON.parse(JSON.stringify(o));
const tplOf = id => db.templates.find(t => t.id === id);

export function renderProgram(el, refresh) {
  const today = dayKey();
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = mondayOf(first);
  const cells = [];
  for (let d = new Date(gridStart); cells.length < 42; d = addDays(d, 1)) {
    if (cells.length >= 35 && d.getMonth() !== first.getMonth()) break;
    cells.push(new Date(d));
  }
  el.innerHTML = `
    <header class="page-head"><h1>Programme</h1><button class="btn primary sm" data-newprog>${icon('plus')} Programme</button></header>
    <section class="card cal">
      <div class="cal-head">
        <button class="icon-btn" data-m="-1" aria-label="Mois précédent">${icon('back')}</button>
        <b>${FR_MONTHS[first.getMonth()]} ${first.getFullYear()}</b>
        <button class="icon-btn" data-m="1" aria-label="Mois suivant">${icon('chev')}</button>
      </div>
      <div class="cal-grid">
        ${FR_DAYS.map(d => `<span class="dow">${d[0]}</span>`).join('')}
        ${cells.map(d => {
          const k = dayKey(d), plan = plannedOn(d), done = sessionsOn(d);
          const doneTpl = new Set(done.map(s => s.tplId));
          const dots = [
            ...done.map(s => `<i class="dot done" style="--c:${colorOf(s.color)}"></i>`),
            ...plan.filter(p => !doneTpl.has(p.tplId)).map(p => `<i class="dot ${k < today ? 'missed' : 'plan'}" style="--c:${colorOf(tplOf(p.tplId)?.color)}"></i>`),
          ].slice(0, 4).join('');
          const deload = plan.some(p => p.programId && isDeload(db.programs.find(x => x.id === p.programId), p.week));
          return `<button class="cal-day ${d.getMonth() !== first.getMonth() ? 'out' : ''} ${k === today ? 'today' : ''} ${deload ? 'deload' : ''}" data-day="${k}">
            <span>${d.getDate()}</span><div class="dots">${dots}</div></button>`;
        }).join('')}
      </div>
      <div class="legend sm"><span><i class="dot done" style="--c:var(--muted)"></i>faite</span><span><i class="dot plan" style="--c:var(--muted)"></i>prévue</span><span><i class="dot missed" style="--c:var(--muted)"></i>manquée</span><span><i class="sq"></i>décharge</span></div>
    </section>
    <h2 class="section-title">Mes programmes</h2>
    ${db.programs.length ? db.programs.map(progCard).join('') : `<div class="empty-state sm">${icon('cal')}<p>Un programme répète une semaine type sur plusieurs semaines, avec une progression automatique (charge, reps, volume) et des semaines de décharge.</p><button class="btn primary" data-newprog2>${icon('plus')} Créer un programme</button></div>`}
  `;
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { cursor.setMonth(cursor.getMonth() + +b.dataset.m); renderProgram(el, refresh); });
  el.querySelectorAll('[data-day]').forEach(b => b.onclick = () => openDay(parseDay(b.dataset.day), refresh));
  el.querySelectorAll('[data-newprog],[data-newprog2]').forEach(b => b.onclick = () => openProgramEditor(null, refresh));
  el.querySelectorAll('[data-prog]').forEach(b => b.onclick = () => openProgramEditor(b.dataset.prog, refresh));
}

function progCard(p) {
  const start = parseDay(p.start), end = addDays(mondayOf(start), p.weeks * 7 - 1);
  const wk = programWeek(p, new Date());
  const past = new Date() > end;
  let planned = 0, done = 0;
  for (let d = new Date(start); d <= end && dayKey(d) < dayKey(); d = addDays(d, 1)) for (const e of plannedOn(d).filter(e => e.programId === p.id)) { planned++; if (isPlannedDone(d, e)) done++; }
  const perWeek = p.days.reduce((a, d) => a + d.length, 0);
  return `<button class="prog-card" data-prog="${p.id}" style="--c:${colorOf(p.color)}">
    <div class="prog-top"><b>${esc(p.name)}</b><small>${wk ? `Semaine ${wk}/${p.weeks}` : past ? 'Terminé' : 'À venir'}</small></div>
    <small class="muted">${fmtDayShort(start)} → ${fmtDayShort(end)} · ${perWeek} séance${perWeek > 1 ? 's' : ''}/sem. · ${ruleLabel(p)}</small>
    <div class="weeks">${Array.from({ length: p.weeks }, (_, i) => `<i class="${i + 1 < wk || past ? 'past' : i + 1 === wk ? 'cur' : ''} ${isDeload(p, i + 1) ? 'dl' : ''}"></i>`).join('')}</div>
    ${planned ? `<small class="muted">${done}/${planned} séances faites (${Math.round(done / planned * 100)} %)</small>` : ''}
  </button>`;
}

const RULES = { none: 'Aucune', kg: '+ kg / palier', reps: '+ reps / palier', pct: '+ % de volume / palier', time: '+ secondes (gainage)' };
function ruleLabel(p) {
  if (!p.rule || p.rule === 'none') return 'sans progression auto';
  const every = p.every > 1 ? ` toutes les ${p.every} sem.` : '/sem.';
  return { kg: `+${fmtNum(p.value)} kg${every}`, reps: `+${p.value} rep${every}`, pct: `+${p.value} %${every}`, time: `+${p.value} s${every}` }[p.rule];
}

// ---------- day ----------
function openDay(date, refresh) {
  sheet({
    title: fmtDay(date),
    body: '<div class="day"></div>',
    onMount(el, close) {
      const root = el.querySelector('.day');
      const draw = () => {
        const k = dayKey(date), isPast = k < dayKey();
        const plan = plannedOn(date), done = sessionsOn(date);
        root.innerHTML = `
          ${plan.map((e, i) => {
            const t = tplOf(e.tplId), p = db.programs.find(x => x.id === e.programId);
            const ok = isPlannedDone(date, e);
            return `<div class="plan-row" style="--c:${colorOf(t.color)}">
              <div><b>${esc(t.name)}</b><small>${p ? `${esc(p.name)} · semaine ${e.week}${isDeload(p, e.week) ? ' · décharge' : ''}` : 'Séance ponctuelle'} · ~${fmtDur(estimateTpl(t))}</small></div>
              ${ok ? `<span class="badge good">${icon('check')} Faite</span>` : isPast ? '<span class="badge bad">Manquée</span>' : ''}
              ${!ok ? `<button class="btn primary sm" data-go="${i}">${icon('play')} Go</button>` : ''}
              ${e.plannedId ? `<button class="icon-btn sm" data-unplan="${e.plannedId}" aria-label="Retirer">${icon('x')}</button>` : ''}
            </div>`;
          }).join('')}
          ${done.map(s => `<button class="plan-row done" data-sess="${s.id}" style="--c:${colorOf(s.color)}"><div><b>${esc(s.name)}</b><small>Réalisée · ${fmtDur((s.end - s.start) / 1000)}</small></div>${icon('chev')}</button>`).join('')}
          ${!plan.length && !done.length ? '<p class="muted">Repos ! Rien de prévu ce jour-là.</p>' : ''}
          <button class="btn ghost block" data-plan>${icon('plus')} Planifier une séance ce jour</button>`;
        root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const e = plan[+b.dataset.go]; close(); startWorkout({ tplId: e.tplId, programId: e.programId, week: e.week }); });
        root.querySelectorAll('[data-unplan]').forEach(b => b.onclick = () => { db.planned = db.planned.filter(x => x.id !== b.dataset.unplan); save(); draw(); refresh(); });
        root.querySelectorAll('[data-sess]').forEach(b => b.onclick = () => openSessionDetail(b.dataset.sess, refresh));
        root.querySelector('[data-plan]').onclick = () => pickTemplate(id => { db.planned.push({ id: uid(), date: k, tplId: id }); save(); draw(); refresh(); });
      };
      draw();
    },
  });
}

export function pickTemplate(done, title = 'Choisir une séance') {
  sheet({
    title,
    body: db.templates.length ? `<div class="menu">${db.templates.map(t => `<button class="menu-item tpl" data-t="${t.id}" style="--c:${colorOf(t.color)}"><i class="bar"></i><span><b>${esc(t.name)}</b><small>${esc(tplSummary(t))}</small></span></button>`).join('')}</div>` : '<p class="muted">Crée d’abord une séance dans l’onglet Séances.</p>',
    onMount(el, close) { el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { close(); done(b.dataset.t); }); },
  });
}

// ---------- program editor ----------
export function openProgramEditor(progId, refresh) {
  const orig = db.programs.find(p => p.id === progId);
  const nextMonday = dayKey(addDays(mondayOf(new Date()), 7));
  const p = orig ? clone(orig) : { id: uid(), name: '', color: 'ember', start: nextMonday, weeks: 8, days: [[], [], [], [], [], [], []], rule: 'kg', value: 2.5, every: 1, deload: 4 };
  sheet({
    title: orig ? 'Modifier le programme' : 'Nouveau programme',
    full: true,
    actions: `<button class="btn primary sm" data-save>Enregistrer</button>`,
    body: '<div class="form"></div>',
    onMount(el, close) {
      const root = el.querySelector('.form');
      const draw = () => {
        const deloads = Array.from({ length: p.weeks }, (_, i) => isDeload(p, i + 1));
        root.innerHTML = `
          <label class="field"><span>Nom</span><input class="big-input" data-k="name" value="${esc(p.name)}" placeholder="Ex. Prépa 10 km, Force 3 j/sem." autocomplete="off"></label>
          <div class="field"><span>Couleur</span><div class="swatches">${Object.keys(COLORS).map(c => `<button class="swatch ${c === p.color ? 'on' : ''}" data-color="${c}" style="--c:${COLORS[c]}"></button>`).join('')}</div></div>
          <div class="row gap">
            <label class="field grow"><span>Début (lundi de la semaine)</span><input type="date" data-k="start" value="${p.start}"></label>
            <div class="field"><span>Durée</span><div class="stepper"><button data-w="-1">−</button><b>${p.weeks} sem.</b><button data-w="1">+</button></div></div>
          </div>

          <div class="field"><span>Semaine type</span>
            <div class="week-plan">${FR_DAYS_LONG.map((d, i) => `<div class="wp-row"><b>${d}</b><div class="wp-slots">${p.days[i].map((id, j) => { const t = tplOf(id); return t ? `<button class="slot" data-rm="${i}:${j}" style="--c:${colorOf(t.color)}">${esc(t.name)} ${icon('x')}</button>` : ''; }).join('') || '<small class="muted">repos</small>'}</div><button class="icon-btn sm" data-addday="${i}" aria-label="Ajouter">${icon('plus')}</button></div>`).join('')}</div>
          </div>

          <div class="field"><span>Progression automatique</span>
            <div class="chips wrap">${Object.entries(RULES).map(([k, v]) => `<button class="chip ${p.rule === k ? 'on' : ''}" data-rule="${k}">${v}</button>`).join('')}</div>
          </div>
          ${p.rule !== 'none' ? `<div class="row gap">
            <label class="field grow"><span>Valeur (${{ kg: 'kg', reps: 'reps', pct: '%', time: 's' }[p.rule]})</span><input data-n="value" inputmode="decimal" value="${p.value}"></label>
            <label class="field grow"><span>Toutes les … semaines</span><input data-n="every" inputmode="numeric" value="${p.every}"></label>
          </div>` : ''}
          <label class="field"><span>Semaine de décharge toutes les … semaines (0 = jamais)</span><input data-n="deload" inputmode="numeric" value="${p.deload}"></label>
          <p class="muted sm">Décharge : ~60 % des séries, charges −15 %, course −30 %. Elle ne compte pas comme palier de progression.</p>

          <section class="card"><h2>Aperçu de l’évolution</h2>${preview(p)}
            <div class="weeks big">${deloads.map((dl, i) => `<i class="${dl ? 'dl' : ''}" title="S${i + 1}"></i>`).join('')}</div>
          </section>
          ${orig ? `<button class="btn danger-ghost block" data-del>${icon('trash')} Supprimer le programme</button>` : ''}`;

        root.querySelectorAll('[data-k]').forEach(i => i.onchange = i.oninput = () => { p[i.dataset.k] = i.value; });
        root.querySelectorAll('[data-n]').forEach(i => i.onchange = () => { p[i.dataset.n] = Math.max(0, parseFloat(i.value.replace(',', '.')) || 0); if (i.dataset.n === 'every') p.every = Math.max(1, Math.round(p.every)); draw(); });
        root.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { p.color = b.dataset.color; draw(); });
        root.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { p.weeks = Math.min(52, Math.max(1, p.weeks + +b.dataset.w)); draw(); });
        root.querySelectorAll('[data-rule]').forEach(b => b.onclick = () => { p.rule = b.dataset.rule; p.value = { none: 0, kg: 2.5, reps: 1, pct: 5, time: 5 }[p.rule]; draw(); });
        root.querySelectorAll('[data-addday]').forEach(b => b.onclick = () => pickTemplate(id => { p.days[+b.dataset.addday].push(id); draw(); }, `Ajouter un ${FR_DAYS_LONG[+b.dataset.addday]}`));
        root.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const [i, j] = b.dataset.rm.split(':').map(Number); p.days[i].splice(j, 1); draw(); });
        const del = root.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          if (!(await confirmDialog(`Supprimer « ${p.name} » ? Les séances déjà faites restent dans le journal.`, 'Supprimer'))) return;
          db.programs = db.programs.filter(x => x.id !== p.id); save(); close(); refresh();
        };
      };
      el.querySelector('[data-save]').onclick = () => {
        if (!p.days.some(d => d.length)) { toast('Ajoute au moins une séance dans la semaine type'); return; }
        p.start = dayKey(mondayOf(parseDay(p.start || nextMonday)));
        if (!p.name.trim()) p.name = 'Mon programme';
        const i = db.programs.findIndex(x => x.id === p.id);
        if (i >= 0) db.programs[i] = p; else db.programs.push(p);
        save(); close(); refresh(); toast('Programme enregistré');
        cursor = parseDay(p.start); cursor.setDate(1);
      };
      draw();
    },
  });
}

// Two-line cell: main value on top, sets × reps below.
function compact(ex, sets) {
  if (!sets.length) return '—';
  const s = sets[0], n = sets.length;
  const two = (a, b) => `<b>${esc(a)}</b><small>${esc(b)}</small>`;
  if (ex.mode === 'wr') return two(s.kg ? `${fmtNum(+s.kg)} kg` : '—', `${n}×${s.reps || '–'}`);
  if (ex.mode === 'bw') return two(`${s.reps || '–'} reps`, `${n} séries`);
  if (ex.mode === 'time') return two(setSummary(ex, s), `${n} séries`);
  const tot = sets.reduce((a, x) => a + (+x.dist || 0), 0);
  return two(tot ? setSummary(ex, { dist: tot }) : setSummary(ex, s), n > 1 ? `${n}×${setSummary(ex, { dist: s.dist, sec: s.sec })}` : '');
}

// Week-by-week targets of the first few exercises, so the user sees the ramp.
function preview(p) {
  const ids = [...new Set(p.days.flat())];
  const rows = [];
  for (const id of ids) {
    const t = tplOf(id);
    if (!t) continue;
    for (const it of t.items) {
      if (rows.length >= 4) break;
      const ex = exById(it.exId);
      if (rows.some(r => r.exId === it.exId)) continue;
      const weeks = [];
      for (let w = 1; w <= p.weeks; w++) {
        const sets = progressSets(ex, it.sets, p, w).filter(s => s.kind !== 'w');
        weeks.push({ w, dl: isDeload(p, w), txt: compact(ex, sets) });
      }
      rows.push({ exId: it.exId, name: ex.name, weeks });
    }
  }
  if (!rows.length) return '<p class="muted sm">Ajoute des séances à la semaine type pour voir la progression.</p>';
  const show = p.weeks <= 6 ? rows[0].weeks.map((_, i) => i) : [0, 1, 2, Math.floor(p.weeks / 2) - 1, p.weeks - 2, p.weeks - 1].filter((v, i, a) => a.indexOf(v) === i && v >= 0);
  return `<div class="prev-table"><table><thead><tr><th></th>${show.map(i => `<th class="${rows[0].weeks[i].dl ? 'dl' : ''}">S${i + 1}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr><th>${esc(r.name)}</th>${show.map(i => `<td class="${r.weeks[i].dl ? 'dl' : ''}">${r.weeks[i].txt}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="muted sm">Semaines (barres) : orange = progression, gris = décharge.</p>`;
}
