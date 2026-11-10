(() => {
'use strict';

const CFG = window.COURSES_CONFIG || {};
const DEMO = !CFG.url || !CFG.key;
const CACHE = DEMO ? 'courses.demo' : 'courses.cache';
const $ = (s) => document.querySelector(s);
const elList = $('#list'), elTop = $('#top'), elLogin = $('#login'), elSync = $('#sync');
const elSearch = $('#search'), sheet = $('#sheet');

const ls = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

let sb = null;
let state = { cats: [], items: [] };
let loaded = false;
// On ouvre toujours sur ce qu'il faut acheter.
let filter = 'todo';
// Une seule catégorie dépliée à la fois (accordéon).
let openCats = new Set(JSON.parse(ls.get('courses.open', '[]')).slice(0, 1));
let query = '';
// Vue "À acheter" : tout est déplié par défaut, on replie ce qu'on veut (indépendamment).
let todoClosed = new Set(JSON.parse(ls.get('courses.todoClosed', '[]')));
let ctx = null;   // ce que la fiche ouverte est en train de modifier
// Articles cochés pendant qu'on est sur "À acheter" : ils restent affichés
// (barrés) jusqu'au changement d'onglet, pour pouvoir annuler une erreur.
let justDone = new Set();
// Supprimés ici : on ignore les échos tardifs du serveur qui les feraient réapparaître.
const gone = new Set();

const uid = () => crypto.randomUUID();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const byPos = (a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr');
const byName = (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
const sortedCats = () => [...state.cats].sort(byPos);

function save() { ls.set(CACHE, JSON.stringify(state)); }
function readCache() {
  try {
    const s = JSON.parse(ls.get(CACHE, 'null'));
    if (s && Array.isArray(s.cats) && Array.isArray(s.items)) { state = s; return true; }
  } catch {}
  return false;
}
function setSync(cls, title) {
  elSync.className = 'sync ' + cls;
  elSync.title = title;
}

/* ---------- Emojis des catégories ---------- */

// Un emoji tapé en tête du nom gagne ; sinon on le devine d'après le nom.
const EMOJI_RE = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*/u;
const EMOJIS = [
  ['legume', '🥦'], ['fruit', '🍎'], ['viande', '🥩'], ['poisson', '🐟'], ['vege', '🌱'],
  ['cremerie', '🧀'], ['fromage', '🧀'], ['laitier', '🥛'], ['feculent', '🍝'], ['pain', '🥖'], ['pate', '🍝'],
  ['surgele', '🧊'], ['conserve', '🥫'], ['boisson', '🧃'], ['alcool', '🍷'], ['vin', '🍷'],
  ['sauce', '🫙'], ['condiment', '🫙'], ['apero', '🥜'], ['graine', '🥜'], ['huile', '🫒'], ['epice', '🌶️'],
  ['sucre', '🍫'], ['dessert', '🍰'], ['petit-dej', '☕'], ['cafe', '☕'], ['bebe', '🍼'],
  ['entretien', '🧽'], ['menage', '🧽'], ['hygiene', '🧴'], ['pharma', '💊'], ['divers', '📦'],
  ['plante', '🪴'], ['jardin', '🪴'], ['anima', '🐾'], ['chat', '🐈'], ['bricol', '🔨'],
];
function catLook(name) {
  const m = name.match(EMOJI_RE);
  if (m) return { emo: m[1], label: name.slice(m[0].length) || name };
  const n = norm(name);
  const hit = EMOJIS.find(([k]) => n.includes(k));
  return { emo: hit ? hit[1] : '🛒', label: name };
}
const catTitle = (cat) => { const l = catLook(cat.name); return `<span class="emo" aria-hidden="true">${l.emo}</span><span class="catname">${esc(l.label)}</span>`; };

/* ---------- Rendu ---------- */

const CHECK = '<svg viewBox="0 0 14 14" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.5l3 3 6-7"/></svg>';
const CHEV = '<svg class="chev" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l5 5 5-5"/></svg>';

function rowHtml(it) {
  return `<div class="row${it.have ? ' have' : ''}" data-id="${it.id}"><div class="slide">
    <button class="tick" data-act="toggle" data-id="${it.id}" role="checkbox" aria-checked="${it.have}"><span class="box">${CHECK}</span><span class="name">${esc(it.name)}</span></button></div></div>`;
}

// Hauteur de l'en-tête collant, pour coller les titres de catégorie juste dessous.
new ResizeObserver(() => document.documentElement.style.setProperty('--head-h', elTop.offsetHeight + 'px')).observe(elTop);

function render() {
  const todoCount = state.items.filter((i) => !i.have).length;
  $('#count').textContent = todoCount || '';
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.filter === filter));
  elList.className = filter === 'todo' ? 'todo-view' : '';
  $('#searchWrap').hidden = filter !== 'all' || !state.cats.length;

  if (!loaded) { elList.innerHTML = '<div class="empty">Chargement…</div>'; return; }

  const newCat = '<button class="newcat" data-act="newcat">+ Nouvelle catégorie</button>';
  const demo = DEMO ? '<p class="note">Mode démo : la liste reste sur cet appareil tant que Supabase n’est pas configuré.</p>' : '';

  if (!state.cats.length) {
    elList.innerHTML = `<div class="empty"><strong>La liste est vide</strong>
      ${(window.COURSES_SEED || []).length ? 'Chargez la liste de départ, ou créez vos catégories.<br><button class="big" data-act="seed">Charger la liste de départ</button>' : 'Commencez par créer une catégorie.'}</div>${newCat}${demo}`;
    return;
  }

  let html = '';
  if (filter === 'todo') {
    // Vue magasin : seulement ce qui manque, tout déplié.
    for (const cat of sortedCats()) {
      const items = state.items.filter((i) => i.category_id === cat.id && (!i.have || justDone.has(i.id))).sort(byName);
      if (!items.length) continue;
      const shut = todoClosed.has(cat.id);
      html += `<div class="group${shut ? ' shut' : ''}"><button class="label" data-act="todofold" data-id="${cat.id}" aria-expanded="${!shut}">${catTitle(cat)}${shut ? `<span class="pill">${items.length}</span>` : ''}${CHEV}</button>${shut ? '' : `<section class="card">${items.map(rowHtml).join('')}</section>`}</div>`;
    }
    if (!html) html = '<div class="empty"><strong>Rien à acheter</strong>Décochez un article dans « Toute la liste » quand il n’y en a plus.</div>';
  } else {
    // Vue d'ensemble : une ligne par catégorie, qu'on déplie.
    const q = norm(query.trim());
    for (const cat of sortedCats()) {
      const all = state.items.filter((i) => i.category_id === cat.id).sort(byName);
      const items = q ? all.filter((i) => norm(i.name).includes(q)) : all;
      if (q && !items.length) continue;
      const need = all.filter((i) => !i.have).length;
      const open = q ? true : openCats.has(cat.id);
      html += `<section class="card${open ? ' open' : ''}"><div class="cathead">
        <button class="catbtn" data-act="fold" data-id="${cat.id}" aria-expanded="${open}">${catTitle(cat)}${need ? `<span class="pill" title="À acheter">${need}</span>` : ''}</button>
        ${open ? `<button class="more" data-act="editcat" data-id="${cat.id}" aria-label="Modifier la catégorie ${esc(cat.name)}">⋯</button>` : ''}
        <button class="foldbtn" data-act="fold" data-id="${cat.id}" tabindex="-1" aria-hidden="true">${CHEV}</button></div>`;
      if (open) {
        html += items.map(rowHtml).join('');
        if (!q) html += `<form class="add" data-cat="${cat.id}"><input name="name" placeholder="Ajouter un article…" autocomplete="off" enterkeyhint="done" maxlength="80" aria-label="Ajouter dans ${esc(cat.name)}"><button type="submit" aria-label="Ajouter">+</button></form>`;
      }
      html += '</section>';
    }
    if (q && !html) html = `<div class="empty"><strong>Aucun article trouvé</strong>Rien ne correspond à « ${esc(query.trim())} ».</div>`;
    if (!q) html += newCat;
  }
  elList.innerHTML = html + demo;
}

/* ---------- Fiches d'édition ---------- */

function show(html) {
  sheet.innerHTML = html;
  if (!sheet.open) sheet.showModal();
}
const head = (title) => `<div class="sheet-head"><h2>${title}</h2><button type="button" class="icon" data-act="close" aria-label="Fermer" autofocus>✕</button></div>`;

function itemSheet(id) {
  const it = state.items.find((i) => i.id === id);
  if (!it) return;
  ctx = { type: 'item', id };
  show(`<form class="sheet-in">${head('Modifier l’article')}
    <label class="field">Nom<input name="name" value="${esc(it.name)}" maxlength="80" autocomplete="off" required></label>
    <label class="field">Catégorie<select name="cat">${sortedCats().map((c) => `<option value="${c.id}"${c.id === it.category_id ? ' selected' : ''}>${catLook(c.name).emo} ${esc(catLook(c.name).label)}</option>`).join('')}</select></label>
    <div class="actions"><button type="button" class="dangerbtn" data-act="delete">Supprimer</button><button type="submit" class="primary">Enregistrer</button></div></form>`);
}

function catSheet(id, keepName) {
  const cats = sortedCats(), idx = cats.findIndex((c) => c.id === id), cat = cats[idx];
  if (!cat) return;
  ctx = { type: 'cat', id };
  show(`<form class="sheet-in">${head('Modifier la catégorie')}
    <label class="field">Nom<input name="name" value="${esc(keepName ?? cat.name)}" maxlength="60" autocomplete="off" required></label>
    <p class="hint">Pour changer l’emoji ${catLook(cat.name).emo}, mettez-en un au début du nom.</p>
    <div class="field">Ordre dans la liste<div class="pair">
      <button type="button" class="soft" data-act="up"${idx === 0 ? ' disabled' : ''}>↑ Monter</button>
      <button type="button" class="soft" data-act="down"${idx === cats.length - 1 ? ' disabled' : ''}>↓ Descendre</button></div></div>
    <div class="actions"><button type="button" class="dangerbtn" data-act="delete">Supprimer</button><button type="submit" class="primary">Enregistrer</button></div></form>`);
}

function newCatSheet() {
  ctx = { type: 'newcat' };
  show(`<form class="sheet-in">${head('Nouvelle catégorie')}
    <label class="field">Nom<input name="name" maxlength="60" autocomplete="off" placeholder="Ex. Petit-déjeuner" required></label>
    <div class="actions"><button type="submit" class="primary">Créer</button></div></form>`);
  sheet.querySelector('input').focus();
}

function settingsSheet() {
  ctx = { type: 'settings' };
  show(`<div class="sheet-in">${head('Réglages')}
    <p class="hint">Appui long sur un article pour le modifier, glissez-le vers la gauche pour le supprimer.</p>
    ${DEMO ? '' : '<div class="actions"><button type="button" class="dangerbtn" data-act="logout">Se déconnecter</button></div>'}</div>`);
}

sheet.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = e.target.elements.name.value.trim();
  if (!name) return;
  if (ctx.type === 'item') updateItem(ctx.id, name, e.target.elements.cat.value);
  else if (ctx.type === 'cat') renameCat(ctx.id, name);
  else if (ctx.type === 'newcat') addCat(name);
  sheet.close();
});

sheet.addEventListener('click', (e) => {
  if (e.target === sheet) { sheet.close(); return; }   // clic sur le fond
  const b = e.target.closest('[data-act]');
  if (!b) return;
  switch (b.dataset.act) {
    case 'close': sheet.close(); break;
    case 'delete':
      if (ctx.type === 'item') { delItem(ctx.id); sheet.close(); }
      else if (delCat(ctx.id)) sheet.close();
      break;
    case 'up': case 'down':
      moveCat(ctx.id, b.dataset.act === 'up' ? -1 : 1);
      catSheet(ctx.id, sheet.querySelector('input').value);
      break;
    case 'logout': sheet.close(); ls.set(CACHE, ''); sb.auth.signOut(); break;
  }
});

function setOpen(ids) {
  openCats = new Set(ids);
  ls.set('courses.open', JSON.stringify([...openCats]));
  render();
}

/* ---------- Actions (optimistes : écran d'abord, serveur ensuite) ---------- */

// Les écritures partent une par une, dans l'ordre : sinon "créer une catégorie"
// puis "la déplacer" aussitôt peuvent arriver au serveur dans le désordre.
let queue = Promise.resolve();
async function push(run) {
  save();
  render();
  if (DEMO) return;
  const job = queue.then(run).catch((error) => ({ error }));
  queue = job;
  const { error } = await job;
  if (error) {
    console.error(error);
    setSync('off', 'Erreur de synchronisation');
    await load();   // on revient à la vérité du serveur
  }
}

function toggle(id) {
  const it = state.items.find((i) => i.id === id);
  if (!it) return;
  it.have = !it.have;
  it.updated_at = new Date().toISOString();
  if (it.have && filter === 'todo') justDone.add(id); else justDone.delete(id);
  push(() => sb.from('items').update({ have: it.have, updated_at: it.updated_at }).eq('id', id));
}

function addItem(catId, name) {
  name = name.trim();
  if (!name) return;
  // Un article qu'on ajoute, c'est a priori qu'il en faut.
  const it = { id: uid(), category_id: catId, name, have: false, position: 0, updated_at: new Date().toISOString() };
  state.items.push(it);
  push(() => sb.from('items').insert(it));
}

function updateItem(id, name, catId) {
  const it = state.items.find((i) => i.id === id);
  if (!it || (it.name === name && it.category_id === catId)) return;
  it.name = name;
  it.category_id = catId;
  it.updated_at = new Date().toISOString();
  push(() => sb.from('items').update({ name, category_id: catId, updated_at: it.updated_at }).eq('id', id));
}

function delItem(id) {
  const it = state.items.find((i) => i.id === id);
  if (!it) return;
  gone.add(id);
  justDone.delete(id);
  state.items = state.items.filter((i) => i.id !== id);
  push(() => sb.from('items').delete().eq('id', id));
  toast(`« ${it.name} » supprimé`, () => {
    gone.delete(id);
    if (!state.cats.some((c) => c.id === it.category_id)) return;   // catégorie supprimée entre-temps
    state.items.push(it);
    push(() => sb.from('items').insert(it));
  });
}

/* ---------- Bandeau "Annuler" ---------- */

const elToast = $('#toast');
let toastTimer = 0, toastUndo = null;
function toast(text, undo) {
  elToast.querySelector('span').textContent = text;
  toastUndo = undo;
  elToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}
function hideToast() { elToast.hidden = true; toastUndo = null; }
elToast.querySelector('button').addEventListener('click', () => { const u = toastUndo; hideToast(); u?.(); });

/* ---------- Glisser pour supprimer, appui long pour modifier ---------- */

const LONG_PRESS = 450;
function cancelPress() {
  if (!sw?.timer) return;
  clearTimeout(sw.timer);
  sw.timer = 0;
  sw.row.classList.remove('pressing');
}

let sw = null;            // glissement en cours
let swallowClick = false; // le "clic" qui suit un glissement ne doit pas cocher l'article
elList.addEventListener('pointerdown', (e) => {
  const row = e.target.closest('.row');
  if (!row || e.button || sw?.on) return;
  sw = { row, id: row.dataset.id, pid: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, on: false, timer: 0 };
  row.classList.add('pressing');
  const s = sw;
  s.timer = setTimeout(() => {
    s.timer = 0;
    row.classList.remove('pressing');
    if (sw !== s || s.on) return;
    sw = null;
    swallowClick = true;   // le relâcher ne doit pas cocher l'article
    setTimeout(() => { swallowClick = false; }, 600);
    if (navigator.vibrate) navigator.vibrate(10);
    itemSheet(s.id);
  }, LONG_PRESS);
});
// Clic droit (ordinateur) ou appui long natif : même fiche, sans le menu du navigateur.
elList.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('.row');
  if (!row) return;
  e.preventDefault();
  if (sw && !sw.timer) return;   // l'appui long a déjà ouvert la fiche
  cancelPress();
  sw = null;
  itemSheet(row.dataset.id);
});
elList.addEventListener('pointermove', (e) => {
  if (!sw || e.pointerId !== sw.pid) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) cancelPress();
  if (!sw.on) {
    if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) { sw = null; return; }   // on fait défiler
    if (dx > -8 || Math.abs(dx) < Math.abs(dy)) return;
    sw.on = true;
    sw.row.classList.add('swiping');
    try { sw.row.setPointerCapture(e.pointerId); } catch {}
  }
  sw.dx = Math.min(0, dx + 8);
  sw.row.style.setProperty('--dx', sw.dx + 'px');
  sw.row.classList.toggle('armed', -sw.dx > sw.row.offsetWidth * 0.35);
});
function endSwipe(e) {
  if (!sw || e.pointerId !== sw.pid) return;
  cancelPress();
  const { row, id, on } = sw;
  sw = null;
  if (!on) return;
  swallowClick = true;
  setTimeout(() => { swallowClick = false; }, 50);
  const armed = row.classList.contains('armed') && e.type === 'pointerup';
  row.classList.remove('swiping');
  if (!armed) { row.classList.remove('armed'); row.style.removeProperty('--dx'); return; }
  row.classList.add('leaving');
  if (navigator.vibrate) navigator.vibrate(10);
  setTimeout(() => delItem(id), 180);
}
elList.addEventListener('pointerup', endSwipe);
elList.addEventListener('pointercancel', endSwipe);
elList.addEventListener('click', (e) => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); } }, true);

function addCat(name) {
  const cat = { id: uid(), name, position: Math.max(-1, ...state.cats.map((c) => c.position)) + 1 };
  state.cats.push(cat);
  openCats = new Set([cat.id]);   // dépliée d'office, prête à recevoir des articles
  ls.set('courses.open', JSON.stringify([...openCats]));
  push(() => sb.from('categories').insert(cat));
  elList.querySelector(`form[data-cat="${cat.id}"] input`)?.scrollIntoView({ block: 'center' });
}

function renameCat(id, name) {
  const cat = state.cats.find((c) => c.id === id);
  if (!cat || cat.name === name) return;
  cat.name = name;
  push(() => sb.from('categories').update({ name }).eq('id', id));
}

function moveCat(id, dir) {
  const cats = sortedCats(), i = cats.findIndex((c) => c.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= cats.length) return;
  [cats[i], cats[j]] = [cats[j], cats[i]];
  const changed = [];
  cats.forEach((c, k) => { if (c.position !== k) { c.position = k; changed.push({ id: c.id, name: c.name, position: k }); } });
  push(() => sb.from('categories').upsert(changed));
}

function delCat(id) {
  const cat = state.cats.find((c) => c.id === id);
  const n = state.items.filter((i) => i.category_id === id).length;
  if (!cat || !confirm(`Supprimer « ${cat.name} »${n ? ` et ses ${n} article${n > 1 ? 's' : ''}` : ''} ?`)) return false;
  gone.add(id);
  state.items.forEach((i) => { if (i.category_id === id) gone.add(i.id); });
  state.cats = state.cats.filter((c) => c.id !== id);
  state.items = state.items.filter((i) => i.category_id !== id);
  push(() => sb.from('categories').delete().eq('id', id));   // cascade côté base
  return true;
}

async function seed() {
  if (state.cats.length) return;
  const cats = [], items = [];
  (window.COURSES_SEED || []).forEach(([name, names], ci) => {
    const cat = { id: uid(), name, position: ci };
    cats.push(cat);
    names.forEach((n) => items.push({ id: uid(), category_id: cat.id, name: n, have: true, position: 0, updated_at: new Date().toISOString() }));
  });
  state = { cats, items };
  await push(async () => {
    const a = await sb.from('categories').insert(cats);
    return a.error ? a : sb.from('items').insert(items);
  });
}

/* ---------- Événements ---------- */

elList.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.act) {
    case 'toggle': toggle(id); break;
    case 'edit': itemSheet(id); break;
    case 'editcat': catSheet(id); break;
    case 'newcat': newCatSheet(); break;
    case 'seed': seed(); break;
    case 'todofold':
      if (todoClosed.has(id)) todoClosed.delete(id); else todoClosed.add(id);
      ls.set('courses.todoClosed', JSON.stringify([...todoClosed]));
      render();
      break;
    case 'fold':
      if (query.trim()) break;   // pendant une recherche tout est déplié
      if (openCats.has(id)) { setOpen([]); break; }
      setOpen([id]);
      // La catégorie qui se replie au-dessus fait remonter celle qu'on ouvre : on la ramène en vue.
      { const card = elList.querySelector(`[data-act="fold"][data-id="${id}"]`)?.closest('.card');
        const headH = elTop.offsetHeight;
        if (card && card.getBoundingClientRect().top < headH) scrollBy(0, card.getBoundingClientRect().top - headH - 8); }
      break;
  }
});

elList.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  addItem(f.dataset.cat, f.elements.name.value);
  // on garde le clavier ouvert sur la même catégorie pour enchaîner
  elList.querySelector(`form[data-cat="${f.dataset.cat}"] input`)?.focus();
});

elSearch.addEventListener('input', () => { query = elSearch.value; render(); });

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (!b) return;
  filter = b.dataset.filter;
  justDone.clear();
  render();
  scrollTo(0, 0);
});

$('#settings').addEventListener('click', settingsSheet);

/* ---------- Supabase ---------- */

async function load() {
  const [c, i] = await Promise.all([
    sb.from('categories').select('*'),
    sb.from('items').select('*'),
  ]);
  if (c.error || i.error) {
    console.error(c.error || i.error);
    setSync('off', 'Hors ligne');
    loaded = loaded || readCache();
    render();
    return;
  }
  state = { cats: c.data, items: i.data };
  loaded = true;
  setSync('ok', 'Synchronisé');
  save();
  render();
}

function applyChange(key, p) {
  const list = state[key];
  if (p.eventType === 'DELETE') {
    state[key] = list.filter((r) => r.id !== p.old.id);
    if (key === 'cats') state.items = state.items.filter((i) => i.category_id !== p.old.id);
  } else {
    if (gone.has(p.new.id)) return;
    const idx = list.findIndex((r) => r.id === p.new.id);
    if (idx >= 0) list[idx] = p.new; else list.push(p.new);
  }
  save();
  // Ne pas écraser ce qu'on est en train de taper dans un champ "Ajouter".
  const a = document.activeElement;
  if (!(a && a.value && elList.contains(a)) && !sw?.on) render();
}

let channel = null;
function subscribe() {
  if (channel) sb.removeChannel(channel);
  channel = sb.channel('courses')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (p) => applyChange('items', p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (p) => applyChange('cats', p))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setSync('ok', 'Synchronisé');
      else if (status !== 'CLOSED') setSync('off', 'Reconnexion…');
    });
}

function showApp() {
  elLogin.hidden = true;
  elTop.hidden = false;
  elList.hidden = false;
  if (readCache()) loaded = true;
  render();
  load();
  subscribe();
}

function showLogin() {
  elTop.hidden = true;
  elList.hidden = true;
  elLogin.hidden = false;
}

elLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#loginError').textContent = '';
  const { error } = await sb.auth.signInWithPassword({
    email: elLogin.elements.email.value.trim(),
    password: elLogin.elements.password.value,
  });
  if (error) $('#loginError').textContent = 'Connexion refusée : vérifiez l’e-mail et le mot de passe.';
  else { elLogin.reset(); showApp(); }
});

async function start() {
  if (DEMO) {
    elTop.hidden = false;
    readCache();
    loaded = true;
    setSync('', 'Mode démo');
    render();
    return;
  }
  sb = window.supabase.createClient(CFG.url, CFG.key);
  const { data } = await sb.auth.getSession();
  if (data.session) showApp(); else showLogin();
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') showLogin(); });
  // Au retour sur l'app (téléphone déverrouillé), on se remet à jour.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !elTop.hidden) { load(); subscribe(); }
  });
  addEventListener('online', () => { if (!elTop.hidden) { load(); subscribe(); } });
}

start();
})();
