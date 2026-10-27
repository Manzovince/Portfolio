// Live workout: big touch targets, auto rest timer, guided timers for holds and runs.
import { db, save, uid, exById, lastSetsFor, progressSets, isDeload, sessionStats, computePRs, fmtClock, fmtDur, fmtKm, fmtPace, fmtTonnage, setSummary } from './store.js?v=2';
import { MODES } from './library.js?v=2';
import { esc, icon, sheet, menu, confirmDialog, toast, beep, buzz, unlockAudio, $ } from './ui.js?v=2';
import { fmtField, parseField, inputMode, placeholderFor, setLabels, nextKind, KIND_LABEL } from './fields.js?v=2';
import { openPicker, pickRest, restLabel } from './editor.js?v=2';

const clone = o => JSON.parse(JSON.stringify(o));
let root = null, ticker = 0, wakeLock = null, onExit = () => {};
export function setActiveExitHandler(fn) { onExit = fn; }

// Fields shown while training: holds have no lest column, runs log distance + time.
const liveFields = ex => (ex.mode === 'time' ? ['sec'] : MODES[ex.mode].fields);

// ---------- start ----------
export async function startWorkout({ tplId = null, programId = null, week = 0 } = {}) {
  if (db.active) {
    if (!(await confirmDialog('Une séance est déjà en cours. L’abandonner pour en démarrer une autre ?', 'Abandonner et démarrer'))) { openActive(); return; }
  }
  const tpl = db.templates.find(t => t.id === tplId);
  const prog = db.programs.find(p => p.id === programId);
  db.active = {
    id: uid(), tplId, programId, week,
    name: tpl ? tpl.name : 'Séance libre',
    color: tpl?.color || 'ember',
    note: '',
    start: Date.now(),
    deload: prog ? isDeload(prog, week) : false,
    items: tpl ? tpl.items.map(it => {
      const ex = exById(it.exId);
      return { id: uid(), exId: it.exId, rest: it.rest, group: it.group || null, note: it.note || '',
        sets: progressSets(ex, it.sets, prog, week).map(s => ({ kind: s.kind || 'n', rest: s.rest, target: { ...s }, done: false })) };
    }) : [],
    rest: null,   // { end, total }
    clock: null,  // running work timer { item, set, start, down }
  };
  save(true);
  unlockAudio();
  openActive();
}

// ---------- screen ----------
export function openActive() {
  if (!db.active) return;
  if (!root) {
    root = document.createElement('div');
    root.id = 'active';
    document.body.append(root);
  }
  root.classList.add('on');
  document.body.classList.add('active-open');
  render();
  startTicker();
  requestWake();
}

export function minimizeActive() {
  if (!root) return;
  root.classList.remove('on');
  document.body.classList.remove('active-open');
  onExit();
}

function render(keepScroll = true) {
  const a = db.active;
  if (!a || !root) return;
  const list = root.querySelector('.act-list');
  const y = keepScroll && list ? list.scrollTop : 0;
  const total = a.items.reduce((n, i) => n + i.sets.length, 0);
  const done = a.items.reduce((n, i) => n + i.sets.filter(s => s.done).length, 0);
  root.innerHTML = `
    <header class="act-head">
      <button class="icon-btn" data-min aria-label="Réduire">${icon('down')}</button>
      <div class="act-title"><b>${esc(a.name)}</b><small><span data-elapsed>${fmtClock((Date.now() - a.start) / 1000)}</span>${a.week ? ` · semaine ${a.week}` : ''}${a.deload ? ' · <em>décharge</em>' : ''}</small></div>
      <button class="btn primary sm" data-finish>Terminer</button>
    </header>
    <div class="act-progress"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
    <div class="act-list">
      ${a.items.map((it, i) => itemHtml(it, i)).join('')}
      <div class="act-foot">
        <button class="btn ghost block" data-add>${icon('plus')} Ajouter un exercice</button>
        <label class="field"><span>Notes de séance</span><textarea data-note rows="2" placeholder="Sensations, douleurs, météo…">${esc(a.note)}</textarea></label>
        <button class="btn danger-ghost block" data-discard>${icon('trash')} Abandonner la séance</button>
      </div>
    </div>
    <div class="dock"></div>`;
  root.querySelector('.act-list').scrollTop = y;
  bind();
  renderDock();
}

function itemHtml(it, i) {
  const a = db.active;
  const ex = exById(it.exId);
  const fields = liveFields(ex);
  const prev = lastSetsFor(it.exId, a.start) || [];
  const labels = setLabels(it.sets);
  const timed = ex.mode === 'time' || ex.mode === 'run';
  const grouped = it.group && (a.items[i - 1]?.group === it.group || a.items[i + 1]?.group === it.group);
  const allDone = it.sets.length && it.sets.every(s => s.done);
  const head = { kg: ex.mode === 'wr' ? 'kg' : '+kg', reps: 'reps', sec: ex.mode === 'run' ? 'temps' : ex.side ? '/côté' : 'durée', dist: 'km' };
  return `<article class="ex-card live ${grouped ? 'grouped' : ''} ${allDone ? 'complete' : ''}" data-i="${i}">
    <header class="ex-head">
      <div class="ex-title"><b>${esc(ex.name)}</b>${it.note ? `<small class="note">${esc(it.note)}</small>` : grouped ? '<small>superset</small>' : ''}</div>
      <button class="chip sm" data-rest>${icon('timer')} ${restLabel(it.rest)}</button>
      <button class="icon-btn" data-menu aria-label="Options">${icon('dots')}</button>
    </header>
    <div class="set-grid live cols-${fields.length}${timed ? ' timed' : ''}">
      <span class="h">#</span><span class="h">${ex.mode === 'run' ? 'Cible' : 'Préc.'}</span>${fields.map(f => `<span class="h">${head[f]}</span>`).join('')}${timed ? '<span class="h"></span>' : ''}<span class="h">${icon('check')}</span>
      ${it.sets.map((s, j) => {
        const p = prev[j];
        const ref = ex.mode === 'run' ? targetLabel(s.target || {}) : p ? setSummary(ex, p) : '—';
        const running = a.clock && a.clock.item === i && a.clock.set === j;
        return `<div class="set-row ${s.done ? 'done' : ''} ${running ? 'running' : ''}" data-j="${j}">
          <button class="set-no kind-${s.kind || 'n'}" data-kind title="${KIND_LABEL[s.kind || 'n']}">${labels[j]}</button>
          <button class="prev ${ex.mode === 'run' ? 'tgt' : ''}" data-prev ${p || ex.mode === 'run' ? '' : 'disabled'}>${esc(ref).replace('\n', '<br>')}</button>
          ${fields.map(f => `<input class="cell" data-f="${f}" inputmode="${inputMode(f)}" enterkeyhint="done" placeholder="${esc(fmtField(f, (s.target || {})[f]) || (p ? fmtField(f, p[f]) : '') || placeholderFor(f, ex.mode))}" value="${esc(fmtField(f, s[f]))}">`).join('')}
          ${timed ? `<button class="icon-btn sm play" data-clock aria-label="Chrono">${icon(running ? 'stop' : 'play')}</button>` : ''}
          <button class="tick" data-tick aria-label="Valider la série">${icon('check')}</button>
        </div>`;
      }).join('')}
    </div>
    <button class="btn text sm" data-addset>${icon('plus')} Ajouter une série</button>
  </article>`;
}

function targetLabel(t) {
  const parts = [];
  if (+t.dist) parts.push(fmtKm(+t.dist));
  if (+t.sec) parts.push(fmtClock(+t.sec));
  const main = parts.join(' ') || 'libre';
  return +t.pace ? `${main}\n@${fmtPace(+t.pace).replace('/km', '')}` : main;
}

// Value of a field: typed value, else the planned target, else the previous session.
function effective(it, j, f) {
  const s = it.sets[j];
  if (s[f] !== '' && s[f] != null && s[f] !== undefined) return s[f];
  if (s.target && s.target[f] != null && s.target[f] !== '') return s.target[f];
  const p = (lastSetsFor(it.exId, db.active.start) || [])[j];
  return p ? p[f] : '';
}

function bind() {
  const a = db.active;
  root.querySelector('[data-min]').onclick = minimizeActive;
  root.querySelector('[data-finish]').onclick = finish;
  root.querySelector('[data-add]').onclick = () => openPicker(ids => {
    for (const id of ids) {
      const ex = exById(id);
      const n = ex.mode === 'run' ? 1 : 3;
      a.items.push({ id: uid(), exId: id, rest: ex.rest ?? db.settings.rest, group: null, note: '', sets: Array.from({ length: n }, () => ({ done: false, target: {} })) });
    }
    save(); render();
    const list = root.querySelector('.act-list'); list.scrollTop = list.scrollHeight;
  });
  root.querySelector('[data-note]').oninput = e => { a.note = e.target.value; save(); };
  root.querySelector('[data-discard]').onclick = async () => {
    if (!(await confirmDialog('Abandonner cette séance ? Rien ne sera enregistré.', 'Abandonner'))) return;
    db.active = null; save(true); close();
  };

  root.querySelectorAll('.ex-card').forEach(card => {
    const i = +card.dataset.i, it = a.items[i], ex = exById(it.exId);
    card.querySelector('[data-rest]').onclick = () => pickRest(it.rest, r => { it.rest = r; save(); render(); });
    card.querySelector('[data-addset]').onclick = () => {
      const last = it.sets[it.sets.length - 1];
      const nx = { done: false, kind: last?.kind === 'w' ? 'n' : (last?.kind || 'n'), target: last ? { ...(last.target || {}) } : {} };
      if (last) for (const f of liveFields(ex)) if (last[f] !== '' && last[f] != null) nx.target[f] = last[f];
      it.sets.push(nx); save(); render();
    };
    card.querySelector('[data-menu]').onclick = () => menu(ex.name, [
      { label: 'Note sur l’exercice', icon: 'edit', run: () => noteSheet(it) },
      i > 0 && { label: 'Monter', icon: 'up', run: () => { a.items.splice(i - 1, 0, a.items.splice(i, 1)[0]); save(); render(); } },
      i < a.items.length - 1 && { label: 'Descendre', icon: 'down', run: () => { a.items.splice(i + 1, 0, a.items.splice(i, 1)[0]); save(); render(); } },
      { label: 'Remplacer l’exercice', icon: 'edit', run: () => openPicker(ids => { if (!ids[0]) return; it.exId = ids[0]; it.sets.forEach(s => { s.target = {}; s.done = false; }); save(); render(); }, { single: true }) },
      { label: 'Supprimer la dernière série', icon: 'x', run: () => { it.sets.pop(); if (!it.sets.length) a.items.splice(i, 1); save(); render(); } },
      { label: 'Supprimer l’exercice', icon: 'trash', danger: true, run: () => { a.items.splice(i, 1); save(); render(); } },
    ].filter(Boolean));

    card.querySelectorAll('.set-row').forEach(row => {
      const j = +row.dataset.j, s = it.sets[j];
      row.querySelectorAll('input[data-f]').forEach(inp => {
        inp.onfocus = () => inp.select();
        inp.onchange = () => { s[inp.dataset.f] = parseField(inp.dataset.f, inp.value, ex.mode); save(); updatePace(row, it, j, ex); };
        inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const nxt = row.querySelectorAll('input')[[...row.querySelectorAll('input')].indexOf(inp) + 1]; nxt ? nxt.focus() : (inp.blur(), toggleSet(i, j)); } };
      });
      row.querySelector('[data-kind]').onclick = () => { s.kind = nextKind(s.kind); save(); render(); };
      row.querySelector('[data-prev]').onclick = () => {
        const p = (lastSetsFor(it.exId, a.start) || [])[j];
        const src = ex.mode === 'run' ? s.target : p;
        if (!src) return;
        for (const f of liveFields(ex)) if (src[f] !== undefined && src[f] !== '') s[f] = src[f];
        save(); render();
      };
      row.querySelector('[data-tick]').onclick = () => toggleSet(i, j);
      const clk = row.querySelector('[data-clock]');
      if (clk) clk.onclick = () => toggleClock(i, j);
    });
  });
}

function updatePace(row, it, j, ex) {
  if (ex.mode !== 'run') return;
  const d = +effective(it, j, 'dist'), t = +effective(it, j, 'sec');
  row.querySelector('[data-prev]').title = d && t ? fmtPace(t / (d / 1000)) : '';
}

function noteSheet(it) {
  sheet({
    title: 'Note', body: `<textarea class="note-area" rows="4" placeholder="Réglage machine, sensation…">${esc(it.note)}</textarea><button class="btn primary block" data-ok>OK</button>`,
    onMount(el, close) { const t = el.querySelector('textarea'); t.focus(); el.querySelector('[data-ok]').onclick = () => { it.note = t.value; save(); close(); render(); }; },
  });
}

// ---------- validating a set ----------
function toggleSet(i, j) {
  const a = db.active, it = a.items[i], s = it.sets[j], ex = exById(it.exId);
  if (s.done) { s.done = false; save(); render(); return; }
  for (const f of liveFields(ex)) { const v = effective(it, j, f); if (v !== '' && v != null) s[f] = v; }
  if (ex.mode === 'wr' && !(+s.reps)) { toast('Indique le nombre de reps'); return; }
  if (ex.mode === 'bw' && !(+s.reps)) { toast('Indique le nombre de reps'); return; }
  s.done = true;
  s.at = Date.now();
  if (a.clock && a.clock.item === i && a.clock.set === j) a.clock = null;
  buzz(30);
  // superset: no rest until the last exercise of the group has done this round
  const nextInGroup = it.group && a.items[i + 1]?.group === it.group && a.items[i + 1].sets[j] && !a.items[i + 1].sets[j].done;
  const rest = s.rest ?? it.rest ?? db.settings.rest;
  const moreToDo = a.items.some(x => x.sets.some(y => !y.done));
  if (!nextInGroup && rest > 0 && moreToDo) startRest(rest);
  save(); render();
  scrollToNext();
}

function scrollToNext() {
  if (!root) return;
  const row = root.querySelector('.set-row:not(.done)');
  if (!row) return;
  const list = root.querySelector('.act-list');
  const r = row.getBoundingClientRect(), lr = list.getBoundingClientRect();
  if (r.top < lr.top + 60 || r.bottom > lr.bottom - 140) list.scrollTo({ top: list.scrollTop + r.top - lr.top - lr.height * 0.35, behavior: 'smooth' });
}

// ---------- rest & work timers ----------
function startRest(sec) {
  db.active.rest = { end: Date.now() + sec * 1000, total: sec, beeped: 4 };
}

function toggleClock(i, j) {
  const a = db.active, it = a.items[i], ex = exById(it.exId);
  if (a.clock && a.clock.item === i && a.clock.set === j) { stopClock(true); return; }
  unlockAudio();
  const target = it.sets[j].target || {};
  // countdown for holds and time-based runs, stopwatch for distance runs
  const down = ex.mode === 'time' ? (+effective(it, j, 'sec') || 30) : (!(+target.dist) && +target.sec ? +target.sec : 0);
  a.rest = null;
  const sides = ex.mode === 'time' && ex.side ? 2 : 1; // per-side holds: left, then right
  a.clock = { item: i, set: j, start: Date.now(), down: down * sides, sides, phase: 0, beeped: 4 };
  beep([[660, 0.08]]);
  save(); render();
}

function stopClock(validate) {
  const a = db.active, c = a.clock;
  if (!c) return;
  const it = a.items[c.item], s = it.sets[c.set];
  const el = (Date.now() - c.start) / 1000;
  s.sec = Math.round((c.down ? Math.min(el, c.down) : el) / (c.sides || 1));
  a.clock = null;
  if (validate) { s.done = false; toggleSet(c.item, c.set); } else { save(); render(); }
}

function renderDock() {
  const a = db.active, dock = q('.dock');
  if (!dock) return;
  if (a.clock) {
    const it = a.items[a.clock.item], ex = exById(it.exId);
    dock.className = 'dock on work';
    dock.innerHTML = `<div class="dock-txt"><small>${esc(ex.name)} · série ${a.clock.set + 1}</small><b data-clockv>0:00</b><small data-clocksub></small></div>
      <button class="btn primary" data-stop>${icon('check')} ${a.clock.down ? 'Terminer' : 'Stop'}</button>`;
    dock.querySelector('[data-stop]').onclick = () => stopClock(true);
  } else if (a.rest) {
    dock.className = 'dock on rest';
    dock.innerHTML = `<div class="ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19"/><circle class="arc" cx="22" cy="22" r="19" pathLength="100"/></svg></div>
      <div class="dock-txt"><small>Repos</small><b data-restv>0:00</b></div>
      <button class="btn ghost sm" data-r="-15">−15</button><button class="btn ghost sm" data-r="15">+15</button>
      <button class="btn primary sm" data-skip>Passer</button>`;
    dock.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { a.rest.end += +b.dataset.r * 1000; a.rest.total = Math.max(1, a.rest.total + +b.dataset.r); save(); tick(); });
    dock.querySelector('[data-skip]').onclick = () => { a.rest = null; save(); renderDock(); };
  } else {
    dock.className = 'dock';
    dock.innerHTML = '';
  }
  tick();
}

const q = sel => root?.querySelector(sel);

function tick() {
  const a = db.active;
  updateMiniBar();
  if (!a) return;
  const now = Date.now();
  const el = q('[data-elapsed]');
  if (el) el.textContent = fmtClock((now - a.start) / 1000);
  if (a.rest) {
    const left = (a.rest.end - now) / 1000;
    const v = q('[data-restv]');
    if (v) v.textContent = fmtClock(Math.ceil(Math.max(0, left)));
    const arc = q('.ring .arc');
    if (arc) arc.style.strokeDashoffset = String(100 - Math.max(0, left / a.rest.total) * 100);
    const secLeft = Math.ceil(left);
    if (secLeft <= 3 && secLeft >= 1 && secLeft < a.rest.beeped) { a.rest.beeped = secLeft; if (db.settings.sound) beep([[740, 0.07]]); }
    if (left <= 0) {
      a.rest = null; save();
      if (db.settings.sound) beep([[988, 0.18], [1318, 0.32]]);
      if (db.settings.vibrate) buzz([180, 90, 180]);
      renderDock();
    }
  }
  if (a.clock) {
    const t = (now - a.clock.start) / 1000;
    const v = q('[data-clockv]'), sub = q('[data-clocksub]');
    const it = a.items[a.clock.item], ex = exById(it.exId), tg = it.sets[a.clock.set].target || {};
    if (a.clock.down) {
      const c = a.clock, sides = c.sides || 1, half = c.down / sides;
      const left = c.down - t;
      const phase = Math.min(sides - 1, Math.floor(t / half));
      if (phase !== c.phase) { // switch side
        c.phase = phase; c.beeped = 4;
        if (db.settings.sound) beep([[880, 0.12], [880, 0.12]]);
        if (db.settings.vibrate) buzz([120, 60, 120]);
      }
      const leftHere = (phase + 1) * half - t;
      if (v) v.textContent = fmtClock(Math.ceil(Math.max(0, leftHere)));
      if (sub) sub.textContent = sides > 1 ? `${phase ? 'côté droit' : 'côté gauche'} · ${fmtClock(half)} par côté` : `objectif ${fmtClock(c.down)}`;
      const sl = Math.ceil(leftHere);
      if (sl <= 3 && sl >= 1 && sl < a.clock.beeped) { a.clock.beeped = sl; if (db.settings.sound) beep([[740, 0.07]]); }
      if (left <= 0) {
        if (db.settings.sound) beep([[988, 0.18], [1318, 0.32]]);
        if (db.settings.vibrate) buzz([180, 90, 180]);
        stopClock(true);
      }
    } else {
      if (v) v.textContent = fmtClock(t);
      if (sub && ex.mode === 'run') {
        const d = +tg.dist, p = +tg.pace;
        sub.textContent = d && p ? `objectif ${fmtClock(d / 1000 * p)} pour ${fmtKm(d)}` : d ? `${fmtKm(d)} à parcourir` : '';
      }
    }
  }
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(() => { if (db.active) tick(); else clearInterval(ticker); }, 250);
}

// Floating "séance en cours" bar shown above the tab bar when minimised.
function updateMiniBar() {
  const bar = $('#mini-active');
  if (!bar) return;
  const a = db.active;
  if (!a || document.body.classList.contains('active-open')) { bar.hidden = true; return; }
  bar.hidden = false;
  const extra = a.rest ? ` · ⏱ ${fmtClock(Math.ceil(Math.max(0, (a.rest.end - Date.now()) / 1000)))}` : a.clock ? ' · ▶︎ chrono' : '';
  bar.querySelector('[data-mini]').textContent = `${a.name} · ${fmtClock((Date.now() - a.start) / 1000)}${extra}`;
}
export function ensureTicker() { if (db.active) { startTicker(); tick(); } }

async function requestWake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch { /* denied */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && db.active && root?.classList.contains('on')) requestWake(); });

function close() {
  clearInterval(ticker);
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  root?.classList.remove('on');
  document.body.classList.remove('active-open');
  onExit();
}

// ---------- finishing ----------
async function finish() {
  const a = db.active;
  const doneCount = a.items.reduce((n, i) => n + i.sets.filter(s => s.done).length, 0);
  if (!doneCount) { toast('Valide au moins une série (✓) avant de terminer'); return; }
  const left = a.items.reduce((n, i) => n + i.sets.filter(s => !s.done).length, 0);
  if (left && !(await confirmDialog(`${left} série${left > 1 ? 's' : ''} non validée${left > 1 ? 's' : ''} ser${left > 1 ? 'ont' : 'a'} ignorée${left > 1 ? 's' : ''}.`, 'Terminer quand même', false))) return;

  const sess = {
    id: a.id, tplId: a.tplId, programId: a.programId, week: a.week, name: a.name, color: a.color,
    start: a.start, end: Date.now(), note: a.note, feel: 0,
    items: a.items.map(it => ({ exId: it.exId, note: it.note, group: it.group, sets: it.sets.filter(s => s.done).map(({ target, at, ...s }) => s) })).filter(it => it.sets.length),
  };
  const st = sessionStats(sess);
  const prs = computePRs(sess);
  const tpl = db.templates.find(t => t.id === a.tplId);
  let feel = 0;

  sheet({
    title: 'Séance terminée',
    cls: 'finish-sheet',
    body: `
      <div class="finish-hero">${icon('flame')}<b>${esc(sess.name)}</b><small>${fmtDur(st.duration)}</small></div>
      <div class="kpis">
        <div class="kpi"><b>${st.sets}</b><small>séries</small></div>
        ${st.tonnage ? `<div class="kpi"><b>${fmtTonnage(st.tonnage)}</b><small>soulevés</small></div>` : st.reps ? `<div class="kpi"><b>${st.reps}</b><small>reps</small></div>` : ''}
        ${st.dist ? `<div class="kpi"><b>${fmtKm(st.dist)}</b><small>${st.runSec ? fmtPace(st.runSec / (st.dist / 1000)) : 'courus'}</small></div>` : ''}
      </div>
      ${prs.length ? `<div class="prs"><h3>${icon('trophy')} Records</h3>${prs.map(p => `<div class="pr"><span>${esc(exById(p.exId).name)}</span><b>${esc(p.label)}</b></div>`).join('')}</div>` : ''}
      <div class="field"><span>Ressenti</span><div class="feel">${['Très facile', 'Facile', 'Correct', 'Dur', 'Épuisant'].map((l, k) => `<button class="feel-b" data-feel="${k + 1}"><i>${k + 1}</i><small>${l}</small></button>`).join('')}</div></div>
      ${tpl && !a.programId ? `<label class="check"><input type="checkbox" data-upd> Mettre à jour « ${esc(tpl.name)} » avec ces valeurs</label>` : ''}
      <button class="btn primary block" data-save>Enregistrer</button>`,
    onMount(el, closeSheet) {
      el.querySelectorAll('[data-feel]').forEach(b => b.onclick = () => { feel = +b.dataset.feel; el.querySelectorAll('[data-feel]').forEach(x => x.classList.toggle('on', x === b)); });
      el.querySelector('[data-save]').onclick = () => {
        sess.feel = feel;
        if (el.querySelector('[data-upd]')?.checked) updateTemplate(tpl, sess);
        db.sessions.push(sess);
        db.sessions.sort((x, y) => x.start - y.start);
        db.active = null;
        save(true);
        closeSheet();
        close();
        toast(prs.length ? `Bravo ! ${prs.length} record${prs.length > 1 ? 's' : ''} 🏆` : 'Séance enregistrée 💪');
      };
    },
  });
}

function updateTemplate(tpl, sess) {
  tpl.items = sess.items.map(it => {
    const old = tpl.items.find(x => x.exId === it.exId);
    const ex = exById(it.exId);
    return { id: old?.id || uid(), exId: it.exId, rest: old?.rest ?? ex.rest ?? db.settings.rest, group: it.group, note: it.note,
      sets: it.sets.map(s => { const o = { kind: s.kind || 'n' }; for (const f of MODES[ex.mode].fields) if (s[f] !== undefined) o[f] = s[f]; if (s.pace) o.pace = s.pace; return o; }) };
  });
}
