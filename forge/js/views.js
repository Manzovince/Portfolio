// Home, templates/exercises tab and settings.
import { db, save, replaceDb, resetDb, exById, allExercises, dayKey, addDays, mondayOf, plannedOn, sessionsOn, isPlannedDone, isDeload, sessionStats, estimateTpl, fmtDur, fmtKm, fmtTonnage } from './store.js?v=5';
import { CATS, EQUIP } from './library.js?v=5';
import { esc, icon, sheet, menu, confirmDialog, toast, colorOf, FR_DAYS, fmtDay } from './ui.js?v=5';
import { openTemplateEditor, openExerciseForm, tplSummary, norm, exMeta } from './editor.js?v=5';
import { startWorkout, openActive } from './active.js?v=5';
import { pickTemplate } from './program.js?v=5';
import { sessRow, openSessionDetail } from './journal.js?v=5';
import { openExerciseDetail } from './stats.js?v=5';
import { loadDemo } from './demo.js?v=5';

const tplOf = id => db.templates.find(t => t.id === id);

// ---------- home ----------
export function renderHome(el, refresh, go) {
  const now = new Date(), today = dayKey(now);
  const h = now.getHours();
  const todayPlan = plannedOn(now);
  const pending = todayPlan.filter(e => !isPlannedDone(now, e));
  let next = null;
  if (!pending.length) for (let i = 1; i <= 14 && !next; i++) { const d = addDays(now, i); const p = plannedOn(d); if (p.length) next = { d, e: p[0] }; }
  const mon = mondayOf(now);
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const weekSess = db.sessions.filter(s => s.start >= +mon);
  const wst = weekSess.reduce((a, s) => { const st = sessionStats(s); a.d += st.duration; a.km += st.dist; a.t += st.tonnage; return a; }, { d: 0, km: 0, t: 0 });
  const streak = weekStreak();

  el.innerHTML = `
    <header class="page-head home">
      <div><small class="muted">${fmtDay(now)}</small><h1>${h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'} 👋</h1></div>
      <button class="icon-btn" data-settings aria-label="Réglages">${icon('gear')}</button>
    </header>

    ${db.active ? `<button class="resume" data-resume>${icon('play')}<span><b>Reprendre « ${esc(db.active.name)} »</b><small>Séance en cours</small></span>${icon('chev')}</button>` : ''}

    <section class="week-strip">${week.map((d, i) => {
      const k = dayKey(d), done = sessionsOn(d), plan = plannedOn(d);
      const st = done.length ? 'done' : plan.length ? (k < today ? 'missed' : 'plan') : '';
      const c = done[0]?.color || tplOf(plan[0]?.tplId)?.color;
      return `<div class="ws-day ${k === today ? 'today' : ''} ${st}" style="--c:${colorOf(c)}"><small>${FR_DAYS[i][0]}</small><b>${d.getDate()}</b><i></i></div>`;
    }).join('')}</section>

    <section class="today">
      <h2 class="section-title">${pending.length ? 'Au programme aujourd’hui' : todayPlan.length ? 'Aujourd’hui' : 'Prochaine séance'}</h2>
      ${pending.map((e, i) => todayCard(e, i)).join('')}
      ${!pending.length && todayPlan.length ? `<div class="note-card good">${icon('check')} Tout est fait pour aujourd’hui. Récupère bien !</div>` : ''}
      ${!pending.length && next ? `<div class="next-card" style="--c:${colorOf(tplOf(next.e.tplId).color)}"><small>${fmtDay(next.d)}</small><b>${esc(tplOf(next.e.tplId).name)}</b></div>` : ''}
      ${!todayPlan.length && !next ? `<div class="note-card">Aucun programme en cours. <button class="link" data-goprog>Planifier mes semaines →</button></div>` : ''}
    </section>

    <div class="quick">
      <button class="btn primary grow" data-pick>${icon('play')} Démarrer</button>
      <button class="btn ghost" data-empty>Séance libre</button>
    </div>

    <section class="card">
      <h2>Cette semaine ${streak > 1 ? `<span class="badge">${icon('flame')} ${streak} sem. d’affilée</span>` : ''}</h2>
      <div class="kpis">
        <div class="kpi"><b>${weekSess.length}</b><small>séances</small></div>
        <div class="kpi"><b>${fmtDur(wst.d)}</b><small>d’effort</small></div>
        ${wst.km ? `<div class="kpi"><b>${fmtKm(wst.km)}</b><small>courus</small></div>` : `<div class="kpi"><b>${fmtTonnage(wst.t)}</b><small>soulevés</small></div>`}
      </div>
    </section>

    ${db.sessions.length ? `<h2 class="section-title row-between">Dernières séances <button class="link" data-gojournal>Tout voir</button></h2>${db.sessions.slice(-3).reverse().map(sessRow).join('')}` : ''}
  `;
  el.querySelector('[data-settings]').onclick = () => openSettings(refresh);
  el.querySelector('[data-resume]')?.addEventListener('click', openActive);
  el.querySelector('[data-pick]').onclick = () => pickTemplate(id => startWorkout({ tplId: id }), 'Quelle séance ?');
  el.querySelector('[data-empty]').onclick = () => startWorkout({});
  el.querySelector('[data-goprog]')?.addEventListener('click', () => go('program'));
  el.querySelector('[data-gojournal]')?.addEventListener('click', () => go('journal'));
  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const e = pending[+b.dataset.go]; startWorkout({ tplId: e.tplId, programId: e.programId, week: e.week }); });
  el.querySelectorAll('[data-sess]').forEach(b => b.onclick = () => openSessionDetail(b.dataset.sess, refresh));
}

function todayCard(e, i) {
  const t = tplOf(e.tplId), p = db.programs.find(x => x.id === e.programId);
  return `<article class="today-card" style="--c:${colorOf(t.color)}">
    <div><b>${esc(t.name)}</b><small>${p ? `${esc(p.name)} · S${e.week}${isDeload(p, e.week) ? ' · décharge' : ''}` : 'Planifiée'} · ~${fmtDur(estimateTpl(t))}</small><p>${esc(tplSummary(t))}</p></div>
    <button class="btn primary round" data-go="${i}" aria-label="Démarrer">${icon('play')}</button>
  </article>`;
}

function weekStreak() {
  let n = 0;
  for (let w = mondayOf(new Date()); ; w = addDays(w, -7)) {
    const end = +addDays(w, 7);
    const has = db.sessions.some(s => s.start >= +w && s.start < end);
    if (has) n++;
    else if (+w !== +mondayOf(new Date())) break; // current week may still be empty
    if (n > 520) break;
  }
  return n;
}

// ---------- séances tab ----------
let wtab = 'tpl', exQ = '', exCat = '';
export function renderWorkouts(el, refresh) {
  el.innerHTML = `
    <header class="page-head"><h1>Séances</h1><button class="btn primary sm" data-new>${icon('plus')} ${wtab === 'tpl' ? 'Séance' : 'Exercice'}</button></header>
    <div class="seg"><button class="${wtab === 'tpl' ? 'on' : ''}" data-tab="tpl">Mes séances</button><button class="${wtab === 'ex' ? 'on' : ''}" data-tab="ex">Exercices</button></div>
    <div class="wt-body"></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { wtab = b.dataset.tab; renderWorkouts(el, refresh); });
  el.querySelector('[data-new]').onclick = () => (wtab === 'tpl' ? openTemplateEditor(null, refresh) : openExerciseForm(null, refresh));
  const body = el.querySelector('.wt-body');
  if (wtab === 'tpl') {
    body.innerHTML = db.templates.length ? db.templates.map(t => {
      const runs = t.items.some(i => exById(i.exId).mode === 'run');
      const mob = t.items.length && t.items.every(i => exById(i.exId).cat === 'mobilite');
      const done = db.sessions.filter(s => s.tplId === t.id);
      return `<article class="tpl-card" style="--c:${colorOf(t.color)}">
        <button class="tpl-main" data-edit="${t.id}">
          <b>${esc(t.name)}</b>
          <small>${t.items.length} exercice${t.items.length > 1 ? 's' : ''} · ~${fmtDur(estimateTpl(t))}${done.length ? ` · faite ${done.length}×` : ''}</small>
          <p>${esc(tplSummary(t))}</p>
        </button>
        <div class="tpl-side">
          <button class="btn primary round" data-start="${t.id}" aria-label="Démarrer">${icon(runs ? 'run' : mob ? 'mob' : 'play')}</button>
          <button class="icon-btn sm" data-more="${t.id}" aria-label="Options">${icon('dots')}</button>
        </div>
      </article>`;
    }).join('') : `<div class="empty-state">${icon('list')}<p>Crée ta première séance : renfo, course, mixte…</p></div>`;
    body.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openTemplateEditor(b.dataset.edit, refresh));
    body.querySelectorAll('[data-start]').forEach(b => b.onclick = () => startWorkout({ tplId: b.dataset.start }));
    body.querySelectorAll('[data-more]').forEach(b => b.onclick = () => {
      const t = tplOf(b.dataset.more);
      menu(t.name, [
        { label: 'Modifier', icon: 'edit', run: () => openTemplateEditor(t.id, refresh) },
        { label: 'Dupliquer', icon: 'copy', run: () => { const c = JSON.parse(JSON.stringify(t)); c.id = Math.random().toString(36).slice(2, 10); c.name += ' (copie)'; db.templates.push(c); save(); refresh(); } },
        { label: 'Monter dans la liste', icon: 'up', run: () => { const i = db.templates.indexOf(t); if (i > 0) { db.templates.splice(i - 1, 0, db.templates.splice(i, 1)[0]); save(); refresh(); } } },
        { label: 'Supprimer', icon: 'trash', danger: true, run: async () => {
          if (!(await confirmDialog(`Supprimer « ${t.name} » ?`, 'Supprimer'))) return;
          db.templates = db.templates.filter(x => x.id !== t.id);
          for (const p of db.programs) p.days = p.days.map(d => d.filter(x => x !== t.id));
          db.planned = db.planned.filter(x => x.tplId !== t.id);
          save(); refresh();
        } },
      ]);
    });
  } else {
    body.innerHTML = `<div class="search">${icon('search')}<input type="search" placeholder="Rechercher un exercice, un muscle…" value="${esc(exQ)}" data-q></div>
      <div class="chips scroll"><button class="chip ${!exCat ? 'on' : ''}" data-cat="">Tout</button>${Object.entries(CATS).map(([k, v]) => `<button class="chip ${exCat === k ? 'on' : ''}" data-cat="${k}">${v}</button>`).join('')}</div>
      <div class="ex-lib"></div>`;
    const lib = body.querySelector('.ex-lib');
    const draw = () => {
      const q = norm(exQ);
      const counts = new Map();
      for (const s of db.sessions) for (const it of s.items) counts.set(it.exId, (counts.get(it.exId) || 0) + 1);
      lib.innerHTML = allExercises().filter(e => (!exCat || e.cat === exCat) && (!q || norm(e.name + ' ' + exMeta(e)).includes(q)))
        .sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0) || a.name.localeCompare(b.name, 'fr'))
        .map(e => `<button class="pick" data-ex="${e.id}"><span class="pick-ic cat-${e.cat}">${icon(e.mode === 'run' ? 'run' : e.cat === 'charges' ? 'dumbbell' : e.cat === 'mobilite' ? 'mob' : e.mode === 'time' ? 'timer' : 'bolt')}</span>
          <span class="pick-txt"><b>${esc(e.name)}${e.custom ? ' <em class="tag">perso</em>' : ''}</b><small>${esc(exMeta(e))}</small></span>
          <span class="muted sm">${counts.get(e.id) ? counts.get(e.id) + '×' : ''}</span></button>`).join('') || '<p class="empty">Aucun résultat.</p>';
      lib.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => {
        const e = exById(b.dataset.ex);
        if (e.custom) menu(e.name, [{ label: 'Voir la progression', icon: 'chart', run: () => openExerciseDetail(e.id) }, { label: 'Modifier', icon: 'edit', run: () => openExerciseForm(e.id, refresh) }]);
        else openExerciseDetail(e.id);
      });
    };
    body.querySelector('[data-q]').oninput = e => { exQ = e.target.value; draw(); };
    body.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { exCat = b.dataset.cat; body.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    draw();
  }
}

// ---------- settings ----------
export function openSettings(refresh) {
  const s = db.settings;
  sheet({
    title: 'Réglages', full: true,
    body: `<div class="form">
      <div class="field"><span>Thème</span><div class="seg"><button data-theme="dark" class="${s.theme !== 'light' ? 'on' : ''}">Sombre</button><button data-theme="light" class="${s.theme === 'light' ? 'on' : ''}">Clair</button></div></div>
      <label class="field"><span>Repos par défaut (s) pour un nouvel exercice</span><input data-n="rest" inputmode="numeric" value="${s.rest}"></label>
      <div class="field"><span>Mon matériel</span><div class="chips wrap">${Object.entries(EQUIP).map(([k, v]) => `<button class="chip ${(s.equip || Object.keys(EQUIP)).includes(k) ? 'on' : ''}" data-eq="${k}">${esc(v)}</button>`).join('')}</div><small class="muted">Utilisé par le filtre « Mon matériel » quand tu choisis un exercice.</small></div>
      <label class="check"><input type="checkbox" data-b="sound" ${s.sound ? 'checked' : ''}> Bips de fin de repos et de chrono</label>
      <label class="check"><input type="checkbox" data-b="vibrate" ${s.vibrate ? 'checked' : ''}> Vibration (Android)</label>
      <h3>Données</h3>
      <p class="muted sm">Tout est stocké sur cet appareil. Exporte régulièrement pour garder une sauvegarde ou changer de téléphone.</p>
      <div class="row gap"><button class="btn ghost grow" data-export>${icon('down2')} Exporter</button><label class="btn ghost grow">Importer<input type="file" accept="application/json,.json" data-import hidden></label></div>
      <button class="btn ghost block" data-demo>${icon('bolt')} Charger une démo (12 semaines)</button>
      <button class="btn danger-ghost block" data-reset>${icon('trash')} Tout effacer</button>
      <p class="muted sm center">Forge · ${db.sessions.length} séances · ${db.templates.length} modèles</p>
    </div>`,
    onMount(el, close) {
      el.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { s.theme = b.dataset.theme; save(); applyTheme(); el.querySelectorAll('[data-theme]').forEach(x => x.classList.toggle('on', x === b)); });
      el.querySelector('[data-n]').onchange = e => { s.rest = Math.max(0, parseInt(e.target.value, 10) || 0); save(); };
      el.querySelectorAll('[data-b]').forEach(c => c.onchange = () => { s[c.dataset.b] = c.checked; save(); });
      el.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => {
        const eq = s.equip || Object.keys(EQUIP), k = b.dataset.eq;
        s.equip = eq.includes(k) ? eq.filter(x => x !== k) : [...eq, k];
        b.classList.toggle('on', s.equip.includes(k)); save();
      });
      el.querySelector('[data-export]').onclick = () => {
        const blob = new Blob([JSON.stringify({ ...db, active: null }, null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `forge-${dayKey()}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      };
      el.querySelector('[data-import]').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        try {
          const data = JSON.parse(await f.text());
          if (!Array.isArray(data.sessions) || !Array.isArray(data.templates)) throw new Error('format');
          if (!(await confirmDialog(`Remplacer les données actuelles par ce fichier (${data.sessions.length} séances) ?`, 'Importer'))) return;
          replaceDb(data); applyTheme(); close(); refresh(); toast('Données importées');
        } catch { toast('Fichier invalide'); }
      };
      el.querySelector('[data-demo]').onclick = async () => {
        if (db.sessions.length && !(await confirmDialog('La démo remplace tes séances, programmes et journal actuels.', 'Charger la démo'))) return;
        loadDemo(); close(); refresh(); toast('Démo chargée : explore les Stats !');
      };
      el.querySelector('[data-reset]').onclick = async () => {
        if (!(await confirmDialog('Effacer toutes les données (séances, programmes, journal) ? Exporte avant si besoin.', 'Tout effacer'))) return;
        resetDb(); applyTheme(); close(); refresh(); toast('Données effacées');
      };
    },
  });
}

export function applyTheme() {
  document.documentElement.dataset.theme = db.settings.theme === 'light' ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', db.settings.theme === 'light' ? '#f4f5f7' : '#0e0f11');
}
