// Workout history list and session detail.
import { db, save, uid, exById, sessionStats, computePRs, fmtDur, fmtKm, fmtPace, fmtTonnage, setSummary } from './store.js?v=8';
import { esc, icon, sheet, confirmDialog, toast, colorOf, FR_MONTHS, fmtDay } from './ui.js?v=8';
import { startWorkout } from './active.js?v=8';

export function renderJournal(el, refresh) {
  const list = db.sessions.slice().reverse();
  const groups = [];
  for (const s of list) {
    const d = new Date(s.start), key = `${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, items: [] });
    groups[groups.length - 1].items.push(s);
  }
  el.innerHTML = `<header class="page-head"><h1>Journal</h1><small class="muted">${db.sessions.length} séance${db.sessions.length > 1 ? 's' : ''}</small></header>
    ${groups.length ? groups.map(g => `<h2 class="section-title">${g.key}</h2>${g.items.map(sessRow).join('')}`).join('') : `<div class="empty-state">${icon('book')}<p>Tes séances terminées apparaîtront ici.</p></div>`}`;
  el.querySelectorAll('[data-sess]').forEach(b => b.onclick = () => openSessionDetail(b.dataset.sess, refresh));
}

export function sessRow(s) {
  const st = sessionStats(s), d = new Date(s.start);
  const bits = [fmtDur(st.duration), `${st.sets} série${st.sets > 1 ? 's' : ''}`];
  if (st.tonnage) bits.push(fmtTonnage(st.tonnage));
  if (st.dist) bits.push(fmtKm(st.dist));
  return `<button class="sess-row" data-sess="${s.id}" style="--c:${colorOf(s.color)}">
    <span class="sess-date"><b>${d.getDate()}</b><small>${FR_MONTHS[d.getMonth()].slice(0, 3)}</small></span>
    <span class="sess-txt"><b>${esc(s.name)}</b><small>${bits.join(' · ')}</small></span>
    ${s.feel ? `<span class="feel-dot f${s.feel}" title="Ressenti ${s.feel}/5">${s.feel}</span>` : ''}
  </button>`;
}

export function openSessionDetail(id, refresh) {
  const s = db.sessions.find(x => x.id === id);
  if (!s) return;
  const st = sessionStats(s);
  const prs = computePRs(s);
  sheet({
    title: s.name, full: true,
    body: `<div class="detail">
      <p class="muted">${fmtDay(new Date(s.start))} · ${new Date(s.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${s.week ? ` · semaine ${s.week}` : ''}</p>
      <div class="kpis">
        <div class="kpi"><b>${fmtDur(st.duration)}</b><small>durée</small></div>
        <div class="kpi"><b>${st.sets}</b><small>séries</small></div>
        ${st.tonnage ? `<div class="kpi"><b>${fmtTonnage(st.tonnage)}</b><small>soulevés</small></div>` : ''}
        ${st.dist ? `<div class="kpi"><b>${fmtKm(st.dist)}</b><small>${st.runSec ? fmtPace(st.runSec / (st.dist / 1000)) : 'courus'}</small></div>` : ''}
      </div>
      ${prs.length ? `<div class="prs"><h3>${icon('trophy')} Records battus</h3>${prs.map(p => `<div class="pr"><span>${esc(exById(p.exId).name)}</span><b>${esc(p.label)}</b></div>`).join('')}</div>` : ''}
      ${s.items.map(it => { const ex = exById(it.exId); return `<section class="card tight"><h3>${esc(ex.name)}</h3>${it.note ? `<p class="muted sm">${esc(it.note)}</p>` : ''}
        <div class="pills">${it.sets.map((x, i) => `<span class="pill ${x.kind === 'w' ? 'dim' : ''}"><i>${x.kind === 'w' ? 'É' : i + 1}</i>${esc(setSummary(ex, x))}</span>`).join('')}</div></section>`; }).join('')}
      ${s.feel ? `<p class="muted">Ressenti : ${['', 'très facile', 'facile', 'correct', 'dur', 'épuisant'][s.feel]}</p>` : ''}
      <label class="field"><span>Notes</span><textarea data-note rows="3">${esc(s.note || '')}</textarea></label>
      <div class="row gap">
        <button class="btn ghost grow" data-repeat>${icon('play')} Refaire</button>
        <button class="btn danger-ghost grow" data-del>${icon('trash')} Supprimer</button>
      </div>
    </div>`,
    onMount(el, close) {
      el.querySelector('[data-note]').onchange = e => { s.note = e.target.value; save(); };
      el.querySelector('[data-repeat]').onclick = () => {
        // rebuild a one-off template from what was actually done
        const tpl = db.templates.find(t => t.id === s.tplId);
        close();
        if (tpl) startWorkout({ tplId: tpl.id });
        else {
          const tmp = { id: uid(), name: s.name, color: s.color, note: '', items: s.items.map(it => ({ id: uid(), exId: it.exId, rest: exById(it.exId).rest ?? db.settings.rest, group: it.group, sets: it.sets.map(({ done, ...x }) => x) })) };
          db.templates.push(tmp); save();
          toast('Séance ajoutée à tes séances');
          startWorkout({ tplId: tmp.id });
        }
      };
      el.querySelector('[data-del]').onclick = async () => {
        if (!(await confirmDialog('Supprimer définitivement cette séance du journal ?', 'Supprimer'))) return;
        db.sessions = db.sessions.filter(x => x.id !== s.id); save(); close(); refresh && refresh();
      };
    },
  });
}
