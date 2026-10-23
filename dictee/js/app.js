import {
  parse, toDraft, draftErrors, formatMessage,
  MISSION_TYPES, EFFECTS, NATO_WORDS, DEFAULT_TYPE, DEFAULT_EFFECT, SECTION_NAMES, redoMarker,
} from './parser.js?v=2';
import { createDictation, speechSupported } from './speech.js?v=2';

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
const oneLine = (d) => formatMessage(d).map(([, v]) => v).join(' / ');

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
    : on ? 'Touchez une section pour la refaire · « terminé » pour valider' : 'Appuyez pour reprendre l\'écoute';
}

const fmtDur = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function tick() { $('#timer').textContent = fmtDur(elapsed + (timing ? Date.now() - startedAt : 0)); }

function startDictation() {
  dictation.clear();
  ignoreStops = 0; lastSlots = {}; elapsed = 0; timing = false;
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

function setSlot(f, { text = '', cls = [] } = {}) {
  const el = $(`#form [data-f="${f}"]`);
  const key = text + cls.join();
  if (f !== 'panache') el.textContent = text;
  el.className = el.className.split(' ').filter((c) => ['slot', 'num', 'letter', 'word', 'grow', 'tag'].includes(c)).join(' ');
  el.classList.add(...(text || f === 'panache' ? cls : ['vacant', ...cls]));
  if (text && lastSlots[f] !== undefined && lastSlots[f] !== key && !cls.includes('default')) {
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
  lastSlots[f] = key;
}

const HINTS = {
  id: ['Identification', '2 nombres · ex. « douze, trente-quatre »'],
  letter: ['Type de mission', 'Lettre A à H (Alpha… Hotel) · ex. « Alpha »'],
  type: ['Type de mission', 'Type puis la lettre répétée · ex. « mise en place, Alpha »'],
  effet: ['Effet', 'Effet, puis « panaché » + 2 nombres (facultatif)'],
  panache: ['Effet', '2 nombres du panaché'],
  done: ['Message complet', 'Dites « terminé » ou appuyez sur Valider'],
};

function renderDictation() {
  const { text, interimAt } = dictation.snapshot();
  const p = parse(text, { ignoreStops });
  lastParse = p;

  // Champs
  const { id, mission: ms, effet: ef } = p;
  const numSlot = (vals, pending, k) => vals[k] !== undefined
    ? { text: vals[k], cls: ['filled'] }
    : (vals.length === k && pending !== null ? { text: pending + '_', cls: ['partial', 'on'] } : {});
  setSlot('id1', numSlot(id.vals, id.pending, 0));
  setSlot('id2', numSlot(id.vals, id.pending, 1));
  setSlot('letter', ms.letter ? { text: ms.letter, cls: ['filled'] } : {});
  setSlot('type', ms.type ? { text: MISSION_TYPES[ms.type], cls: ['filled'] } : { text: MISSION_TYPES[DEFAULT_TYPE], cls: ['filled', 'default'] });
  setSlot('confirm', ms.confirm ? { text: ms.confirm, cls: ['filled', ms.mismatch ? 'bad' : 'good'] } : {});
  setSlot('effect', ef.effect ? { text: EFFECTS[ef.effect], cls: ['filled'] } : { text: EFFECTS[DEFAULT_EFFECT], cls: ['filled', 'default'] });
  setSlot('panache', { cls: ef.panache ? ['on', 'filled'] : [] });
  $('#form [data-f="panache"]').textContent = ef.implicit ? 'Panaché ?' : 'Panaché';
  setSlot('p1', numSlot(ef.nums, ef.pending, 0));
  setSlot('p2', numSlot(ef.nums, ef.pending, 1));
  for (const f of ['p1', 'p2']) $(`#form [data-f="${f}"]`).style.opacity = ef.panache ? '' : '.45';

  // États des sections
  for (let k = 0; k < 3; k++) {
    let st, mark = '';
    if (k === 1 && ms.mismatch) { st = 'warn'; mark = `${ms.letter} ≠ ${ms.confirm}`; }
    else if (k < p.focus) { st = p.done[k] ? 'done' : 'warn'; mark = p.done[k] ? '✓' : 'incomplet'; }
    else if (k === p.focus) {
      if (k === 2 && p.done[2] && p.started[2]) { st = 'done'; mark = '✓'; }
      else { st = 'active'; mark = 'en cours'; }
    } else st = p.started[k] ? (p.done[k] ? 'done' : 'active') : 'idle';
    const sec = $(`#form [data-sec="${k}"]`);
    sec.dataset.state = st;
    $('.sec-mark', sec).textContent = mark;
  }

  // Consigne
  let h;
  if (p.focus === 0) h = HINTS.id;
  else if (p.focus === 1) h = ms.letter ? HINTS.type : HINTS.letter;
  else if (ef.panache && ef.nums.length < 2) h = HINTS.panache;
  else if (p.started[2]) h = HINTS.done;
  else h = HINTS.effet;
  $('#hint').innerHTML = `<b>${h[0]}</b><span>${h[1]}</span>`;

  // Transcription surlignée
  const tr = $('#transcript');
  if (!text) tr.innerHTML = '<span class="ph">Parlez, le formulaire se remplit tout seul…</span>';
  else {
    let html = '', pos = 0;
    for (const t of p.tokens) {
      html += esc(text.slice(pos, t.start));
      if (t.kind === 'redo') {
        html += `<span class="redo-chip">↺ ${SECTION_NAMES[t.redo]}</span>`;
        pos = t.end;
        continue;
      }
      const c = ['w'];
      if (t.sec === 'cmd') c.push('cmd');
      else if (t.sec !== null) c.push('s' + t.sec);
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
  draft = toDraft(p);
  const said = p.stopAt !== null ? text.slice(0, p.stopAt).trim() : text;
  reviewMeta = { transcript: said.replace(/⟦r(\d)⟧/g, (_, k) => `[${SECTION_NAMES[k]} refait]`), mismatch: p.mission.mismatch ? [p.mission.letter, p.mission.confirm] : null, implicit: p.effet.implicit };
  fillReview();
  show('review');
}

function fillReview() {
  for (const el of $$('#review [data-d]')) el.value = draft[el.dataset.d];
  const pan = $('#rv-panache');
  pan.setAttribute('aria-pressed', String(draft.panache));
  const mm = $('#rv-mismatch');
  mm.hidden = !reviewMeta.mismatch;
  if (reviewMeta.mismatch) { mm.className = 'rv-note bad'; mm.textContent = `Lettre répétée différente (${reviewMeta.mismatch[0]} puis ${reviewMeta.mismatch[1]}) : vérifiez la lettre.`; }
  $('#rv-implicit').hidden = !(reviewMeta.implicit && draft.panache);
  updateReview();
}

function previewHTML(d) {
  return formatMessage(d).map(([k, v]) => `<span class="k">${k}</span><span>${esc(v)}</span>`).join('');
}

function updateReview() {
  const errs = draftErrors(draft);
  for (const el of $$('#review [data-d]')) el.classList.toggle('err', !!errs[el.dataset.d]);
  $('#review [data-d="p1"]').disabled = $('#review [data-d="p2"]').disabled = !draft.panache;
  $('#msg-preview').innerHTML = previewHTML(draft);
  const n = Object.keys(errs).length;
  const e = $('#rv-errors');
  e.hidden = n === 0;
  if (n) {
    const what = [];
    if (errs.id1 || errs.id2) what.push('identification');
    if (errs.letter) what.push('lettre de mission');
    if (errs.p1 || errs.p2) what.push('nombres du panaché');
    e.textContent = `À compléter : ${what.join(', ')}`;
  }
  $('#btn-send').disabled = n > 0;
}

function setupReview() {
  const letter = $('#review [data-d="letter"]');
  letter.innerHTML = '<option value="">–</option>' + Object.entries(NATO_WORDS).map(([l, w]) => `<option value="${l}">${l} · ${w}</option>`).join('');
  $('#review [data-d="type"]').innerHTML = Object.entries(MISSION_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('#review [data-d="effect"]').innerHTML = Object.entries(EFFECTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  const order = ['id1', 'id2', 'p1', 'p2'];
  for (const el of $$('#review [data-d]')) {
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (el.classList.contains('num')) {
        el.value = el.value.replace(/\D/g, '').slice(0, 2);
        const next = order[order.indexOf(el.dataset.d) + 1];
        if (el.value.length === 2 && (next === 'id2' || next === 'p2')) $(`#review [data-d="${next}"]`).focus();
      }
      draft[el.dataset.d] = el.value;
      if (el.dataset.d === 'letter') $('#rv-mismatch').hidden = true;
      updateReview();
    });
    // Zéro devant ajouté en quittant le champ : « 5 » → « 05 ».
    if (el.classList.contains('num')) el.addEventListener('blur', () => {
      if (/^\d$/.test(el.value)) { el.value = '0' + el.value; draft[el.dataset.d] = el.value; updateReview(); }
    });
  }
  $('#rv-panache').addEventListener('click', () => {
    draft.panache = !draft.panache;
    $('#rv-panache').setAttribute('aria-pressed', String(draft.panache));
    $('#rv-implicit').hidden = true;
    updateReview();
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
  // Toucher une section la vide et la réenregistre.
  for (const sec of $$('#form .sec')) {
    sec.addEventListener('click', () => {
      const k = Number(sec.dataset.sec);
      dictation.addText(redoMarker(k));
      sec.classList.remove('redo'); void sec.offsetWidth; sec.classList.add('redo');
      toast(`${SECTION_NAMES[k]} : réannoncez la section`, 1800);
      if (speechSupported && !dictation.listening) resumeDictation();
    });
  }
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
setupReview();
bind();
renderAll();
setListening(false);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
