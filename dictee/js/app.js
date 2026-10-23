import { parse, SECTION_NAMES, redoMarker } from './parser.js?v=3';
import {
  CADRES, OPT, NATO_WORDS, LETTERS, DEFAULTS, ROW_KIND, ROW_KEYS, ROW_LABELS,
  cadreText, cadreStarted, messageLines, draftErrors, fmtTime as fmtHHMM,
} from './form.js?v=3';
import { cadreSlots, HINTS } from './view.js?v=3';
import { createDictation, speechSupported } from './speech.js?v=3';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Stockage ---------- */
const KEY = 'dictee.history.v1';
const loadHistory = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const saveHistory = (h) => { try { localStorage.setItem(KEY, JSON.stringify(h)); } catch { toast('Historique non enregistré (stockage indisponible)'); } };

/* ---------- Navigation ---------- */
let screen = 'home';
function show(id) {
  screen = id;
  for (const s of $$('.screen')) s.classList.toggle('active', s.id === id);
  if (id === 'dictate') keepAwake(true); else keepAwake(false);
}

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* refusé : pas grave */ }
}

let toastTimer;
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

function ask(text, yesLabel = 'Confirmer') {
  const d = $('#confirm');
  $('#confirm-text').textContent = text;
  $('#confirm-yes').textContent = yesLabel;
  d.showModal();
  return new Promise((res) => {
    const done = (v) => { d.close(); $('#confirm-yes').onclick = $('#confirm-no').onclick = null; res(v); };
    $('#confirm-yes').onclick = () => done(true);
    $('#confirm-no').onclick = () => done(false);
  });
}

/* ---------- Accueil & historique ---------- */
const fmtTime = (iso) => {
  const d = new Date(iso), now = new Date();
  const hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return hm;
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${hm}`;
};
const oneLine = (d) => [0, 1, 2, 6].map((i) => cadreText(i, d)).filter(Boolean).join(' / ');

function renderList(ul, empty, items) {
  ul.innerHTML = items.map((m) => `
    <li><button data-id="${m.id}">
      <span class="h-msg">${esc(oneLine(m.fields))}</span>
      <span class="h-time">${fmtTime(m.at)}<br><span class="h-ok">✓ ENVOYÉ</span></span>
    </button></li>`).join('');
  empty.hidden = items.length > 0;
}

let micDenied = false;
function renderStatus() {
  const micOk = speechSupported && !micDenied;
  for (const el of $$('[data-st="mic"]')) {
    el.className = 'st ' + (micOk ? 'ok' : 'bad');
    el.setAttribute('aria-label', micOk ? 'Micro disponible' : 'Micro indisponible');
  }
  for (const el of $$('[data-st="net"]')) {
    el.className = 'st ' + (navigator.onLine ? 'ok' : 'bad');
    el.setAttribute('aria-label', navigator.onLine ? 'Réseau disponible' : 'Hors réseau');
  }
}

/* ---------- Thème ---------- */
const THEME_KEY = 'dictee.theme';
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const color = { light: '#eef1ec', dark: '#0e1311' };
  for (const m of $$('meta[name="theme-color"]')) {
    m.content = t === 'light' || t === 'dark' ? color[t] : (m.media.includes('light') ? color.light : color.dark);
  }
  for (const b of $$('[data-theme-opt]')) b.setAttribute('aria-pressed', String(b.dataset.themeOpt === t));
}
function setTheme(t) {
  try { localStorage.setItem(THEME_KEY, t); } catch { /* préférence non retenue */ }
  applyTheme(t);
}
const savedTheme = () => { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; } };

function renderHome() {
  const h = loadHistory();
  renderList($('#recent'), $('#recent-empty'), h.slice(0, 5));
  $('#btn-all').hidden = h.length === 0;
  renderStatus();
  const w = $('#home-warn');
  if (!speechSupported) { w.hidden = false; w.textContent = 'Reconnaissance vocale indisponible ici : saisie clavier uniquement.'; }
  else if (!navigator.onLine) { w.hidden = false; w.textContent = 'Hors réseau : la reconnaissance vocale peut ne pas fonctionner.'; }
  else w.hidden = true;
}

function openDetail(id) {
  const m = loadHistory().find((x) => x.id === id);
  if (!m) return;
  $('#detail-msg').innerHTML = previewHTML(m.fields);
  const d = new Date(m.at);
  $('#detail-title').textContent = m.ref;
  $('#detail-meta').textContent = `Envoyé le ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · durée de dictée ${fmtDur(m.duration || 0)}`;
  $('#detail-tr').textContent = m.transcript ? `« ${m.transcript} »` : '(saisie manuelle)';
  $('#btn-detail-del').onclick = async () => {
    if (!(await ask('Supprimer ce message de l\'historique ?', 'Supprimer'))) return;
    saveHistory(loadHistory().filter((x) => x.id !== id));
    renderAll(); show('history');
  };
  show('detail');
}

function renderAll() {
  renderHome();
  renderList($('#all'), $('#all-empty'), loadHistory());
}

/* ---------- Dictée ---------- */
let ignoreStops = 0;
let lastParse = null;
let lastSlots = {};
let startedAt = 0, timerId = 0, elapsed = 0, timing = false;

const dictation = createDictation({
  onChange: () => renderDictation(),
  onListening: (on) => setListening(on),
  onError: (code) => {
    if (code === 'micro') { micDenied = true; renderStatus(); }
    if (code === 'micro') toast('Micro refusé : autorisez-le dans Réglages › Safari › Micro', 4000);
    else if (code === 'reseau') toast('Reconnaissance vocale indisponible (réseau)', 3500);
    else toast(`Erreur de reconnaissance : ${code}`);
  },
});

function setListening(on) {
  const el = $('#dictate');
  el.classList.toggle('listening', on);
  el.classList.toggle('paused', !on && speechSupported);
  $('#rec-label').textContent = on ? 'Écoute' : (speechSupported ? 'En pause' : 'Clavier');
  $('#btn-mic').setAttribute('aria-label', on ? 'Mettre en pause' : 'Reprendre l\'écoute');
  $('#mic-caption').textContent = !speechSupported
    ? 'Reconnaissance vocale indisponible sur ce navigateur'
    : on ? 'Touchez un cadre pour le refaire · « terminé » pour valider' : 'Appuyez pour reprendre l\'écoute';
}

const fmtDur = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function tick() { $('#timer').textContent = fmtDur(elapsed + (timing ? Date.now() - startedAt : 0)); }

function startDictation() {
  dictation.clear();
  ignoreStops = 0; lastSlots = {}; activeCadre = -1; elapsed = 0; timing = false;
  $('#kbd').hidden = speechSupported;
  $('#dictate').classList.toggle('nospeech', !speechSupported);
  show('dictate');
  resumeDictation();
}

function resumeDictation() {
  if (!timing) { startedAt = Date.now(); timing = true; }
  clearInterval(timerId); timerId = setInterval(tick, 500); tick();
  setListening(false);
  if (speechSupported) dictation.listen();
  renderDictation();
}

function pauseTimer() {
  clearInterval(timerId);
  if (timing) { elapsed += Date.now() - startedAt; timing = false; }
  tick();
}

function buildCadres() {
  $('#form').innerHTML = CADRES.map((c, i) => `
    <div class="cad${c.req ? '' : ' opt'}" data-c="${i}" data-state="idle">
      <div class="cad-head">
        <span class="sec-num">${c.n}</span>
        <span class="cad-name">${c.title}</span>
        <span class="cad-sum"></span>
        <span class="sec-mark"></span>
      </div>
      <div class="cad-body"></div>
    </div>`).join('');
}

const slotHTML = (s) => `<span class="fs ${s.state}${s.wide ? ' wide' : ''}${s.word ? ' word' : ''}"><small>${esc(s.label)}</small><b>${esc(s.text || '')}</b></span>`;

function renderDictation() {
  const { text, interimAt } = dictation.snapshot();
  const p = parse(text, { ignoreStops });
  lastParse = p;

  // Cadres : celui en cours est déplié, les autres montrent une ligne de résumé.
  for (const el of $$('#form .cad')) {
    const i = Number(el.dataset.c);
    let st, mark = '';
    if (i === 1 && p.mismatch) { st = 'warn'; mark = `${p.values.letter} ≠ ${p.confirm}`; }
    else if (i === p.focus && !p.stop) { st = 'active'; }
    else if (p.done[i] && (p.started[i] || i < p.focus)) { st = 'done'; mark = '✓'; }
    else if (i < p.focus && CADRES[i].req) { st = 'warn'; mark = 'incomplet'; }
    else st = p.started[i] ? 'partial' : (i < p.focus ? 'skipped' : 'idle');
    if (st === 'active' && p.done[i]) mark = '✓';
    el.dataset.state = st;
    $('.sec-mark', el).textContent = mark;
    $('.cad-sum', el).textContent = p.started[i] ? cadreText(i, p.values) : (CADRES[i].req ? '' : 'facultatif');
    const body = $('.cad-body', el);
    if (st === 'active' || (st === 'warn' && i === p.cur)) {
      const slots = cadreSlots(i, p);
      body.innerHTML = `<div class="fslots">${slots.map(slotHTML).join('')}</div><p class="cad-hint">${HINTS[i]}</p>`;
      // Petite animation sur les cases qui viennent de changer.
      $$('.fs', body).forEach((node, k) => {
        const key = `${i}:${slots[k].label}:${k}`;
        const val = slots[k].text + slots[k].state;
        if (lastSlots[key] !== undefined && lastSlots[key] !== val && slots[k].state !== 'default') node.classList.add('pop');
        lastSlots[key] = val;
      });
      if (activeCadre !== i) { activeCadre = i; el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    } else body.innerHTML = '';
  }

  // Transcription surlignée
  const tr = $('#transcript');
  if (!text) tr.innerHTML = '<span class="ph">Parlez, le formulaire se remplit tout seul…</span>';
  else {
    let html = '', pos = 0;
    for (const t of p.tokens) {
      html += esc(text.slice(pos, t.start));
      if (t.kind === 'redo') {
        html += `<span class="redo-chip">↺ ${CADRES[t.redo].n}. ${SECTION_NAMES[t.redo]}</span>`;
        pos = t.end;
        continue;
      }
      const c = ['w'];
      if (t.sec === 'cmd') c.push('cmd');
      else if (t.sec !== null) c.push('s' + (t.sec % 4));
      if (t.kind === 'erased') c.push('erased');
      if (t.kind === 'label') c.push('label');
      if (t.start >= interimAt) c.push('interim');
      if (p.stopAt !== null && t.start > p.stopAt) c.push('after-stop');
      html += `<span class="${c.join(' ')}">${esc(t.text)}</span>`;
      pos = t.end;
    }
    html += esc(text.slice(pos));
    tr.innerHTML = html;
    tr.scrollTop = tr.scrollHeight;
  }
  $('#btn-undo').disabled = !text;

  if (p.stop && screen === 'dictate') goReview(true);
}
let activeCadre = -1;

/* ---------- Vérification ---------- */
let draft = null;
let stoppedByVoice = false;
let reviewMeta = {};

function goReview(byVoice = false) {
  dictation.stop();
  pauseTimer();
  stoppedByVoice = byVoice;
  const { text } = dictation.snapshot();
  const p = parse(text, { final: true, ignoreStops });
  draft = { ...p.values };
  const said = p.stopAt !== null ? text.slice(0, p.stopAt).trim() : text;
  reviewMeta = {
    transcript: said.replace(/⟦r(\d+)⟧/g, (_, k) => `[cadre ${CADRES[k].n} refait]`),
    mismatch: p.mismatch ? [p.values.letter, p.confirm] : null,
  };
  renderReview();
  show('review');
}

function previewHTML(d) {
  return messageLines(d).map(([n, , t]) => `<span class="k">${n}</span><span>${esc(t || '—')}</span>`).join('');
}

function renderReview() {
  const errs = draftErrors(draft);
  $('#rv-list').innerHTML = CADRES.map((c, i) => {
    const used = c.req || cadreStarted(i, draft);
    const note = i === 1 && reviewMeta.mismatch ? `Lettre répétée différente (${reviewMeta.mismatch[0]} puis ${reviewMeta.mismatch[1]})` : errs[i] ? `À compléter : ${errs[i]}` : '';
    return `<button class="rv-cad${used ? '' : ' unused'}${errs[i] ? ' err' : ''}${note && !errs[i] ? ' warn' : ''}" data-c="${i}">
      <span class="sec-num">${c.n}</span>
      <span class="rv-main"><span class="rv-name">${c.title}${c.req ? '' : ' <em>facultatif</em>'}</span>
      <span class="rv-val">${esc(used ? cadreText(i, draft) || '—' : 'Non renseigné')}</span>
      ${note ? `<span class="rv-note">${esc(note)}</span>` : ''}</span>
      <span class="rv-edit">›</span>
    </button>`;
  }).join('');
  const n = Object.keys(errs).length;
  const e = $('#rv-errors');
  e.hidden = n === 0;
  if (n) e.textContent = `À compléter : ${Object.values(errs).join(', ')}`;
  $('#btn-send').disabled = n > 0;
}

/* Éditeur d'un cadre : un champ par valeur du schéma. */
function fieldHTML(fd) {
  const v = draft[fd.key];
  const id = `ed-${fd.key.replace('.', '-')}`;
  let input;
  if (fd.type === 'choice' || fd.type === 'letter') {
    const opts = fd.type === 'letter' ? Object.fromEntries(LETTERS.map((L) => [L, `${L} · ${NATO_WORDS[L]}`])) : OPT[fd.opt];
    const def = DEFAULTS[fd.key];
    input = `<select id="${id}" data-k="${fd.key}">
      <option value="">${def ? `${OPT[fd.opt][def]} (défaut)` : '—'}</option>
      ${Object.entries(opts).map(([k, l]) => `<option value="${k}"${v === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}
    </select>`;
  } else if (fd.type === 'bool') {
    input = `<button type="button" class="toggle" data-k="${fd.key}" aria-pressed="${!!v}">${fd.label}</button>`;
  } else {
    const mode = fd.type === 'text' ? 'text' : 'numeric';
    const shown = fd.type === 'time' && v ? fmtHHMM(v) : v ?? '';
    input = `<span class="ed-num">${fd.type === 'snum' ? `<button type="button" class="pm" data-pm="${fd.key}">±</button>` : ''}
      <input id="${id}" data-k="${fd.key}" data-t="${fd.type}" inputmode="${mode}" value="${esc(shown)}" autocomplete="off"${fd.type === 'time' ? ' placeholder="HHhMM"' : ''}></span>`;
  }
  if (fd.type === 'bool') return `<div class="ed-f wide">${input}</div>`;
  return `<label class="ed-f${fd.type === 'choice' || fd.type === 'text' ? ' wide' : ''}" for="${id}"><span>${fd.label}</span>${input}</label>`;
}

function openEditor(i) {
  const c = CADRES[i];
  $('#ed-title').textContent = `${c.n}. ${c.title}`;
  let html;
  if (i === 6) {
    const rowsHTML = LETTERS.map((L) => `<div class="ed-row"><b>${L}</b><div class="ed-cells">${ROW_KEYS[ROW_KIND[L]].map((k) => {
      const fd = c.fields.find((x) => x.key === `${L}.${k}`);
      return fieldHTML({ ...fd, label: ROW_LABELS[k] });
    }).join('')}</div></div>`).join('');
    html = `<p class="ed-sub">Polaires A–C · Rectangulaires D–F · LRU G–H</p>${rowsHTML}
      <div class="ed-grid">${c.fields.filter((x) => !x.row).map(fieldHTML).join('')}</div>`;
  } else html = `<div class="ed-grid">${c.fields.map(fieldHTML).join('')}</div>`;
  $('#ed-body').innerHTML = html;
  $('#editor').showModal();
}

function setDraft(key, value) {
  if (value === '' || value === undefined) delete draft[key]; else draft[key] = value;
  if (key === 'letter') reviewMeta.mismatch = null;
  renderReview();
}

function setupReview() {
  $('#rv-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (b) openEditor(Number(b.dataset.c));
  });
  const body = $('#ed-body');
  body.addEventListener('change', (e) => { if (e.target.matches('select[data-k]')) setDraft(e.target.dataset.k, e.target.value); });
  body.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.matches('input[data-k]')) return;
    const t = el.dataset.t;
    if (t === 'text') return setDraft(el.dataset.k, el.value.trim());
    let d = el.value.replace(t === 'snum' ? /[^\d-]/g : /\D/g, '');
    if (t === 'pair') d = d.slice(0, 2);
    if (t === 'time') d = d.slice(0, 4);
    if (t !== 'time') el.value = d;
    setDraft(el.dataset.k, d);
  });
  body.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el.matches('input[data-k]')) return;
    const t = el.dataset.t, k = el.dataset.k, val = draft[k];
    if (!val) return;
    // Complète à la sortie du champ : « 5 » → « 05 », « 800 » → « 0800 », heure « 14 » → 14H00.
    if (t === 'pair' && val.length === 1) setDraft(k, '0' + val);
    if (t === 'fixed') setDraft(k, val.padStart(4, '0'));
    if (t === 'time') setDraft(k, val.length <= 2 ? val.padStart(2, '0') + '00' : val.padStart(4, '0'));
    el.value = t === 'time' ? fmtHHMM(draft[k]) : draft[k];
  });
  body.addEventListener('click', (e) => {
    const tg = e.target.closest('.toggle[data-k]');
    if (tg) {
      const on = tg.getAttribute('aria-pressed') !== 'true';
      tg.setAttribute('aria-pressed', String(on));
      setDraft(tg.dataset.k, on || undefined);
    }
    const pm = e.target.closest('[data-pm]');
    if (pm) {
      const k = pm.dataset.pm, cur = draft[k] || '';
      const next = cur.startsWith('-') ? cur.slice(1) : '-' + cur;
      setDraft(k, next === '-' ? undefined : next);
      body.querySelector(`input[data-k="${k}"]`).value = draft[k] ?? (next === '-' ? '' : next);
    }
  });
}

/* ---------- Envoi (simulé) ---------- */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function send() {
  if (Object.keys(draftErrors(draft)).length) return;
  const anim = $('#sending');
  anim.classList.remove('sent');
  $('#send-title').textContent = 'Transmission…';
  $('#sent-info').hidden = true;
  $('#btn-done').hidden = true;
  const steps = $$('#steps li');
  steps.forEach((li) => { li.className = ''; });
  const prog = $('#sa-prog');
  prog.style.strokeDashoffset = 327;
  show('sending');

  const durations = [650, 800, 1100, 700];
  for (let k = 0; k < steps.length; k++) {
    steps[k].className = 'run';
    await wait(durations[k]);
    steps[k].className = 'ok';
    prog.style.strokeDashoffset = 327 * (1 - (k + 1) / steps.length);
  }
  const ref = 'MSG-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    at: new Date().toISOString(), ref,
    fields: { ...draft }, transcript: reviewMeta.transcript, duration: elapsed,
  };
  saveHistory([entry, ...loadHistory()].slice(0, 200));
  dictation.clear();

  anim.classList.add('sent');
  $('#send-title').textContent = 'Message transmis';
  $('#sent-msg').innerHTML = previewHTML(entry.fields);
  $('#sent-ref').textContent = `${ref} · ${new Date(entry.at).toLocaleTimeString('fr-FR')}`;
  $('#sent-info').hidden = false;
  $('#btn-done').hidden = false;
  renderAll();
}

/* ---------- Événements ---------- */
function bind() {
  $('#btn-new').addEventListener('click', startDictation);
  $('#btn-settings').addEventListener('click', () => $('#settings').showModal());
  $('#btn-help').addEventListener('click', () => { $('#settings').close(); $('#help').showModal(); });
  for (const b of $$('[data-theme-opt]')) b.addEventListener('click', () => setTheme(b.dataset.themeOpt));
  $('#btn-all').addEventListener('click', () => show('history'));
  $('#btn-hist-back').addEventListener('click', () => show('home'));
  $('#btn-detail-back').addEventListener('click', () => show('history'));
  for (const ul of [$('#recent'), $('#all')]) {
    ul.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) openDetail(b.dataset.id); });
  }

  $('#btn-mic').addEventListener('click', () => {
    if (!speechSupported) { $('#kbd').hidden = false; $('#kbd-input').focus(); return; }
    if (dictation.listening) { dictation.stop(); pauseTimer(); }
    else resumeDictation();
  });
  $('#btn-undo').addEventListener('click', () => { if (!dictation.undo()) toast('Rien à annuler'); });
  $('#btn-review').addEventListener('click', () => goReview(false));
  // Toucher un cadre le vide et le réenregistre (ou y saute s'il est vide).
  $('#form').addEventListener('click', (e) => {
    const el = e.target.closest('.cad');
    if (!el) return;
    const k = Number(el.dataset.c);
    const wasStarted = lastParse?.started[k];
    dictation.addText(redoMarker(k));
    el.classList.remove('redo'); void el.offsetWidth; el.classList.add('redo');
    toast(`${CADRES[k].n}. ${SECTION_NAMES[k]} : ${wasStarted ? 'réannoncez le cadre' : 'annoncez le cadre'}`, 1800);
    if (speechSupported && !dictation.listening) resumeDictation();
  });
  $('#kbd').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#kbd-input').value.trim();
    if (v) dictation.addText(v);
    $('#kbd-input').value = '';
  });
  $('#btn-discard').addEventListener('click', async () => {
    if (dictation.snapshot().text && !(await ask('Abandonner ce message ?', 'Abandonner'))) return;
    dictation.abort(); dictation.clear(); pauseTimer();
    show('home');
  });

  $('#btn-review-back').addEventListener('click', () => {
    if (stoppedByVoice) ignoreStops++;
    show('dictate');
    resumeDictation();
  });
  $('#btn-send').addEventListener('click', send);
  $('#btn-done').addEventListener('click', () => show('home'));

  addEventListener('online', renderHome);
  addEventListener('offline', renderHome);
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme(savedTheme()));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'dictate' && dictation.listening) { dictation.stop(); pauseTimer(); }
    if (!document.hidden && screen === 'dictate') keepAwake(true);
  });
}

applyTheme(savedTheme());
buildCadres();
setupReview();
bind();
renderAll();
setListening(false);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
