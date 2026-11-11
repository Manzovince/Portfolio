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
let recipeTag = ls.get('courses.recipeTag', 'all');
// Vue "À acheter" : tout est déplié par défaut, on replie ce qu'on veut (indépendamment).
let todoClosed = new Set(JSON.parse(ls.get('courses.todoClosed', '[]')));
// Onglet Recettes : groupes repliés (prêt / manque 1-2 / manque plus), tout déplié par défaut.
let recipeClosed = new Set(JSON.parse(ls.get('courses.recipeClosed', '[]')));
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
  elList.className = filter === 'todo' ? 'todo-view' : filter === 'recipes' ? 'recipes-view' : '';
  $('#searchWrap').hidden = filter !== 'all' || !state.cats.length;

  if (!loaded) { elList.innerHTML = '<div class="empty">Chargement…</div>'; return; }

  const newCat = '<button class="newcat" data-act="newcat">+ Nouvelle catégorie</button>';
  const demo = DEMO ? '<p class="note">Mode démo : la liste reste sur cet appareil tant que Supabase n’est pas configuré.</p>' : '';

  if (!state.cats.length) {
    elList.innerHTML = `<div class="empty"><strong>La liste est vide</strong>
      ${(window.COURSES_SEED || []).length ? 'Chargez la liste de départ, ou créez vos catégories.<br><button class="big" data-act="seed">Charger la liste de départ</button>' : 'Commencez par créer une catégorie.'}</div>${newCat}${demo}`;
    return;
  }

  if (filter === 'recipes') { elList.innerHTML = recipesHtml() + demo; return; }

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

/* ---------- Recettes ---------- */

// Les recettes vivent dans Supabase (table "recipes"), partagées entre les téléphones.
// recipes.js ne sert plus qu'à charger le carnet de départ.
const BUILTIN = (window.COURSES_RECIPES || []).map((r) => ({
  emoji: r.e, name: r.n, tags: r.t, minutes: r.min, ingredients: r.ing, steps: r.steps, batch: r.b || 1,
}));
const CARNET = Math.max(1, ...BUILTIN.map((r) => r.batch));   // dernière fournée du carnet
const toRow = ({ batch, ...r }) => ({ id: uid(), ...r, created_at: new Date().toISOString() });
// 'ok' : table présente ; 'missing' : pas encore créée (on montre le carnet de départ, en lecture seule).
let recipesDb = DEMO ? 'ok' : null;
const recipesList = () => (recipesDb === 'missing' ? BUILTIN.map((r, k) => ({ ...r, id: 'builtin-' + k })) : state.recipes || []);
const findRecipe = (id) => recipesList().find((r) => r.id === id);

const TAGS = {
  vege: 'Végétarien', healthy: 'Healthy', medit: 'Méditerranéen', asie: 'Asiatique', texmex: 'Tex-mex',
  reconfort: 'Réconfort', soupe: 'Soupes', petitdej: 'Petit-déj', apero: 'Apéro', dessert: 'Desserts',
};
const TAG_LABEL = { ...TAGS, varie: 'Varié' };   // ancien style, plus proposé
// Styles créés par l'utilisateur : le tag est le nom lui-même. Un style existe tant qu'une recette l'utilise.
const tagLabel = (t) => TAG_LABEL[t] || t;
function allStyles() {
  const custom = new Set();
  for (const r of recipesList()) for (const t of r.tags || []) if (!TAG_LABEL[t]) custom.add(t);
  return [...Object.entries(TAGS), ...[...custom].sort((a, b) => a.localeCompare(b, 'fr')).map((t) => [t, t])];
}
const QUICK = 20;   // filtre "Rapide" : prêt en 20 min ou moins

// Nouvelles fournées du carnet, à proposer aux carnets déjà chargés (une fois par téléphone).
function carnetNews() {
  if (recipesDb !== 'ok' || !(state.recipes || []).length || +ls.get('courses.carnet', '1') >= CARNET) return [];
  const have = new Set(state.recipes.map((r) => ingKey(r.name)));
  return BUILTIN.filter((r) => r.batch > +ls.get('courses.carnet', '1') && !have.has(ingKey(r.name)));
}
function importCarnet() {
  const news = carnetNews();
  const rows = news.map(toRow);
  // Les recettes du carnet déjà présentes reçoivent les nouveaux styles (Asiatique, Soupes…).
  const byName = new Map(BUILTIN.map((r) => [ingKey(r.name), r]));
  const retag = [];
  for (const r of state.recipes) {
    const b = byName.get(ingKey(r.name));
    if (!b) continue;
    const tags = [...new Set([...(r.tags || []), ...b.tags])];
    const clean = tags.some((t) => t !== 'varie' && !['vege', 'healthy'].includes(t)) ? tags.filter((t) => t !== 'varie') : tags;
    if (clean.join() !== (r.tags || []).join()) { r.tags = clean; retag.push({ id: r.id, tags: clean }); }
  }
  state.recipes = [...state.recipes, ...rows];
  ls.set('courses.carnet', String(CARNET));
  push(async () => {
    if (rows.length) { const a = await sb.from('recipes').insert(rows); if (a.error) return a; }
    for (const t of retag) { const u = await sb.from('recipes').update({ tags: t.tags }).eq('id', t.id); if (u.error) return u; }
    return {};
  });
  toast(`${rows.length} recettes ajoutées`, null);
}
// Clé de comparaison souple : sans accents, ponctuation, parenthèses ni pluriels.
const ingKey = (s) => norm(s).replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
  .split(' ').map((w) => w.length > 3 ? w.replace(/[sx]$/, '') : w).join(' ');
// "?A|B" → facultatif, A ou B
const parseIng = (spec) => { const opt = spec.startsWith('?'); return { opt, alts: (opt ? spec.slice(1) : spec).split('|').map((a) => a.trim()).filter(Boolean) }; };

// Pour chaque ingrédient : on l'a (have), il est dans la liste mais pas en stock (buy), ou absent de la liste (none).
function recipeStatus(r) {
  const byKey = new Map();
  for (const it of state.items) {
    const k = ingKey(it.name);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(it);
  }
  const ings = (r.ingredients || []).map((spec) => {
    const { opt, alts } = parseIng(spec);
    const found = alts.flatMap((a) => byKey.get(ingKey(a)) || []);
    const owned = found.find((i) => i.have);
    const item = owned || found[0] || null;
    return { label: owned ? owned.name : alts[0], alts, opt, item, st: owned ? 'have' : item ? 'buy' : 'none' };
  });
  const missing = ings.filter((g) => !g.opt && g.st !== 'have');
  return { ings, missing };
}

function recipesHtml() {
  const all = recipesList();
  const newBtn = recipesDb === 'ok' ? '<button class="newcat" data-act="newrecipe">+ Nouvelle recette</button>' : '';
  const note = recipesDb === 'missing' ? '<p class="note">Pour créer ou supprimer des recettes, la table « recipes » doit être ajoutée dans Supabase.</p>' : '';
  if (!all.length) {
    return `<div class="empty"><strong>Aucune recette</strong>Chargez le carnet de départ (${BUILTIN.length} recettes) ou créez les vôtres.
      <br><button class="big" data-act="rseed">Charger le carnet de départ</button></div>${newBtn}`;
  }
  const styles = allStyles();
  if (recipeTag !== 'all' && recipeTag !== 'quick' && !styles.some(([v]) => v === recipeTag)) recipeTag = 'all';   // style disparu
  const chip = (v, label) => `<button class="chip${recipeTag === v ? ' on' : ''}" data-act="rtag" data-v="${esc(v)}">${esc(label)}</button>`;
  let html = newBtn.replace('class="newcat"', 'class="newcat top"') + `<div class="chips">${chip('all', 'Toutes')}${chip('quick', 'Rapide')}${styles.map(([v, l]) => chip(v, l)).join('')}</div>`;
  const news = carnetNews();
  if (news.length) html += `<div class="news"><span><b>${news.length} nouvelles recettes</b> et de nouveaux styles : Asiatique, Soupes, Desserts…</span>
    <span class="news-btns"><button class="soft" data-act="carnetskip">Ignorer</button><button class="primary" data-act="carnetadd">Ajouter</button></span></div>`;
  const list = all.map((r) => ({ r, ...recipeStatus(r) }))
    .filter((x) => recipeTag === 'all' || (recipeTag === 'quick' ? x.r.minutes && x.r.minutes <= QUICK : (x.r.tags || []).includes(recipeTag)))
    .sort((a, b) => a.missing.length - b.missing.length
      || b.ings.filter((g) => g.st === 'have').length - a.ings.filter((g) => g.st === 'have').length
      || a.r.name.localeCompare(b.r.name, 'fr'));
  const groups = [
    ['ready', 'Prêt à cuisiner', list.filter((x) => !x.missing.length)],
    ['few', 'Il manque 1 ou 2 ingrédients', list.filter((x) => x.missing.length && x.missing.length <= 2)],
    ['more', 'Il manque plus de 2 ingrédients', list.filter((x) => x.missing.length > 2)],
  ];
  for (const [g, title, xs] of groups) {
    if (!xs.length) continue;
    const shut = recipeClosed.has(g);
    html += `<div class="group${shut ? ' shut' : ''}"><button class="label rlabel" data-act="rfold" data-g="${g}" aria-expanded="${!shut}">${title}<span class="rcount">${xs.length}</span>${CHEV}</button>`;
    if (shut) { html += '</div>'; continue; }
    html += `<section class="card">${xs.map((x) => `
      <button class="recipe" data-act="recipe" data-id="${x.r.id}"><span class="remo" aria-hidden="true">${esc(x.r.emoji || '🍽️')}</span>
        <span class="rtext"><span class="rname">${esc(x.r.name)}</span>
        <span class="rsub">${x.r.minutes ? `${x.r.minutes} min · ` : ''}${x.missing.length ? `Manque : ${x.missing.map((g) => esc(g.label)).join(', ')}` : '<b>Tout est là</b>'}</span></span></button>`).join('')}</section></div>`;
  }
  if (!list.length) html += '<div class="empty"><strong>Aucune recette dans ce style</strong>Créez-en une, ou choisissez un autre filtre.</div>';
  return html + note;
}

function recipeSheet(id) {
  const r = findRecipe(id);
  if (!r) { if (ctx?.type === 'recipe') sheet.close(); return; }
  ctx = { type: 'recipe', id };
  const { ings } = recipeStatus(r);
  const row = (g) => {
    const note = g.opt ? 'facultatif' : g.st === 'buy' ? 'dans les courses' : g.st === 'none' ? 'pas dans la liste' : '';
    return g.item
      ? `<button type="button" class="ing${g.st === 'have' ? ' have' : ''}" data-act="ring" data-id="${g.item.id}" role="checkbox" aria-checked="${g.st === 'have'}"><span class="box">${CHECK}</span><span class="iname">${esc(g.label)}</span>${note ? `<small>${note}</small>` : ''}</button>`
      : `<div class="ing none"><span class="box"></span><span class="iname">${esc(g.label)}</span><small>${note}</small></div>`;
  };
  const meta = [r.minutes ? `${r.minutes} min` : '', ...(r.tags || []).map((t) => esc(tagLabel(t)))].filter(Boolean).join(' · ');
  const scrollTop = sheet.scrollTop;
  show(`<div class="sheet-in">${head(`${esc(r.emoji || '🍽️')} ${esc(r.name)}`)}
    ${meta ? `<p class="rmeta">${meta}</p>` : ''}
    ${ings.length ? `<div class="field">Ingrédients<div class="ings">${ings.map(row).join('')}</div>
      <p class="hint left">Coché = on en a. Décochez ce que la recette a épuisé : ça repasse dans les courses.</p></div>` : ''}
    ${(r.steps || []).length ? `<div class="field">Préparation<ol class="steps">${r.steps.map((st) => `<li>${esc(st)}</li>`).join('')}</ol></div>` : ''}
    ${recipesDb === 'ok' ? '<div class="actions"><button type="button" class="dangerbtn" data-act="rdel">Supprimer</button><button type="button" class="primary" data-act="redit">Modifier</button></div>' : ''}</div>`);
  sheet.scrollTop = scrollTop;
}

// Formulaire de création / modification. Styles et ingrédients se gèrent directement dans le DOM.
function ingRowHtml(spec) {
  const { opt, alts } = parseIng(spec);
  return `<div class="fing${opt ? ' opt' : ''}" data-alts="${esc(alts.join('|'))}"><span class="iname">${esc(alts.join(' ou '))}</span>
    <button type="button" class="optbtn" data-act="fingopt">facultatif</button>
    <button type="button" class="xbtn" data-act="fingdel" aria-label="Retirer ${esc(alts[0])}">✕</button></div>`;
}

const styleChip = (v, l, on) => `<button type="button" class="chip${on ? ' on' : ''}" data-act="ftag" data-v="${esc(v)}">${esc(l)}</button>`;

// "+ Nouveau style" : on l'ajoute (coché) aux styles du formulaire ; il sera partagé une fois la recette enregistrée.
function addFormStyle() {
  const input = sheet.querySelector('input[name="newstyle"]');
  const name = input.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  const chips = [...sheet.querySelectorAll('[data-act="ftag"]')];
  const same = chips.find((c) => norm(tagLabel(c.dataset.v)) === norm(name));
  if (same) same.classList.add('on');
  else sheet.querySelector('.newstyle').insertAdjacentHTML('beforebegin', styleChip(name, name, true));
  input.value = '';
  input.closest('.addrow').hidden = true;
}

function recipeForm(id) {
  const r = id ? findRecipe(id) : { emoji: '', name: '', tags: [], minutes: '', ingredients: [], steps: [] };
  if (!r) return;
  ctx = { type: 'recipeform', id: id || null };
  show(`<form class="sheet-in">${head(id ? 'Modifier la recette' : 'Nouvelle recette')}
    <div class="frow"><label class="field emo-field">Emoji<input name="emoji" value="${esc(r.emoji || '')}" placeholder="🍽️" maxlength="8" autocomplete="off"></label>
      <label class="field grow">Nom<input name="name" value="${esc(r.name)}" maxlength="80" autocomplete="off" placeholder="Ex. Gratin de courgettes" required></label></div>
    <label class="field">Temps (minutes)<input name="minutes" type="number" inputmode="numeric" min="1" max="600" value="${r.minutes || ''}"></label>
    <div class="field">Style<div class="chips wrap">${allStyles().map(([v, l]) => styleChip(v, l, (r.tags || []).includes(v))).join('')}<button type="button" class="chip newstyle" data-act="fstylenew">+ Nouveau style</button></div>
      <div class="addrow" hidden><input name="newstyle" placeholder="Ex. Barbecue" autocomplete="off" enterkeyhint="done" maxlength="30"><button type="button" class="soft" data-act="fstyleadd">Ajouter</button></div></div>
    <div class="field">Ingrédients
      <div class="fings">${(r.ingredients || []).map(ingRowHtml).join('')}</div>
      <div class="addrow"><input name="ing" placeholder="Chercher un ingrédient…" autocomplete="off" autocorrect="off" enterkeyhint="done" maxlength="80"></div>
      <div class="isugg" hidden></div>
      <p class="hint left">Choisissez parmi les articles de votre liste, ou créez-en un nouveau.</p></div>
    <label class="field">Préparation (une étape par ligne)<textarea name="steps" rows="5">${esc((r.steps || []).join('\n'))}</textarea></label>
    <div class="actions"><button type="submit" class="primary">${id ? 'Enregistrer' : 'Créer'}</button></div></form>`);
  if (!id) sheet.querySelector('input[name="name"]').focus();
}

// Ingrédients déjà dans le formulaire (clés souples), pour ne pas les proposer deux fois.
const formIngKeys = () => new Set([...sheet.querySelectorAll('.fing')].flatMap((d) => d.dataset.alts.split('|').map(ingKey)));

function addFormIng(name) {
  const input = sheet.querySelector('input[name="ing"]');
  const v = (name ?? input.value).trim().replace(/^\?/, '');
  if (!v) return;
  if (!formIngKeys().has(ingKey(v))) sheet.querySelector('.fings').insertAdjacentHTML('beforeend', ingRowHtml(v));
  input.value = '';
  renderIngSugg();
  input.focus();
}

// Articles de la liste qui correspondent à la saisie (début du nom d'abord).
function ingMatches(q) {
  const k = norm(q.trim());
  if (!k) return [];
  const seen = new Set(), out = [];
  for (const it of [...state.items].sort(byName)) {
    const n = norm(it.name), key = ingKey(it.name);
    if (seen.has(key) || !n.includes(k)) continue;
    seen.add(key);
    out.push({ name: it.name, starts: n.startsWith(k) || n.includes(' ' + k) });
  }
  return out.sort((a, b) => b.starts - a.starts).slice(0, 8);
}

let ingCreate = false;   // le panneau "Créer l'article" est ouvert
function renderIngSugg() {
  const box = sheet.querySelector('.isugg');
  if (!box) return;
  const q = sheet.querySelector('input[name="ing"]').value.trim();
  if (!q) { box.hidden = true; box.innerHTML = ''; ingCreate = false; return; }
  const used = formIngKeys();
  const ms = ingMatches(q);
  const exact = ms.some((m) => ingKey(m.name) === ingKey(q));
  let html = ms.map((m) => used.has(ingKey(m.name))
    ? `<div class="sug used"><span>${esc(m.name)}</span><small>déjà ajouté</small></div>`
    : `<button type="button" class="sug" data-act="fingpick" data-name="${esc(m.name)}"><span>${esc(m.name)}</span><small>dans la liste</small></button>`).join('');
  if (!ms.length) html += '<div class="sug none">Aucun article de ce nom dans la liste</div>';
  if (!exact) {
    const cats = sortedCats();
    const last = ls.get('courses.ingCat', '');
    html += ingCreate && cats.length
      ? `<div class="sugnew"><span>Créer « <b>${esc(q)}</b> » dans</span>
          <select name="ingcat">${cats.map((c) => `<option value="${c.id}"${c.id === last ? ' selected' : ''}>${catLook(c.name).emo} ${esc(catLook(c.name).label)}</option>`).join('')}</select>
          <div class="pair"><button type="button" class="soft" data-act="fingonly">Juste dans la recette</button><button type="button" class="primary" data-act="fingcreate">Créer l’article</button></div></div>`
      : `<button type="button" class="sug add" data-act="${cats.length ? 'fingnew' : 'fingonly'}"><span>+ Créer « ${esc(q)} »</span></button>`;
  }
  box.innerHTML = html;
  box.hidden = false;
}

// Crée l'article dans la liste (à acheter), puis l'ajoute à la recette.
function createFormIng() {
  const q = sheet.querySelector('input[name="ing"]').value.trim();
  const cat = sheet.querySelector('select[name="ingcat"]')?.value;
  if (!q || !cat) return;
  ls.set('courses.ingCat', cat);
  addItem(cat, q);
  ingCreate = false;
  addFormIng(q);
  toast(`« ${q} » ajouté à la liste`, null);
}

function saveRecipeForm(f) {
  const name = f.elements.name.value.trim();
  if (!name) return false;
  if (f.elements.newstyle.value.trim()) addFormStyle();
  const pending = f.elements.ing.value.trim();
  if (pending) addFormIng(ingMatches(pending).find((m) => ingKey(m.name) === ingKey(pending))?.name ?? pending);   // tapé mais pas encore ajouté
  const row = {
    emoji: f.elements.emoji.value.trim() || '🍽️',
    name,
    minutes: parseInt(f.elements.minutes.value, 10) || null,
    tags: [...sheet.querySelectorAll('[data-act="ftag"].on')].map((b) => b.dataset.v),
    ingredients: [...sheet.querySelectorAll('.fing')].map((d) => (d.classList.contains('opt') ? '?' : '') + d.dataset.alts),
    steps: f.elements.steps.value.split('\n').map((s) => s.trim()).filter(Boolean),
  };
  if (ctx.id) {
    const r = state.recipes.find((x) => x.id === ctx.id);
    if (!r) return true;
    Object.assign(r, row);
    push(() => sb.from('recipes').update(row).eq('id', r.id));
    recipeSheet(r.id);
    return false;   // on revient sur la fiche de la recette
  }
  const r = { id: uid(), ...row, created_at: new Date().toISOString() };
  state.recipes = [...(state.recipes || []), r];
  push(() => sb.from('recipes').insert(r));
  recipeSheet(r.id);
  return false;
}

function delRecipe(id) {
  const r = (state.recipes || []).find((x) => x.id === id);
  if (!r) return;
  gone.add(id);
  state.recipes = state.recipes.filter((x) => x.id !== id);
  push(() => sb.from('recipes').delete().eq('id', id));
  toast(`« ${r.name} » supprimée`, () => {
    gone.delete(id);
    state.recipes = [...state.recipes, r];
    push(() => sb.from('recipes').insert(r));
  });
}

async function seedRecipes() {
  if ((state.recipes || []).length) return;
  const rows = BUILTIN.map(toRow);
  state.recipes = rows;
  ls.set('courses.carnet', String(CARNET));
  await push(() => sb.from('recipes').insert(rows));
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

/* ---------- Thème (Auto = suit le système) ---------- */
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = ls.get('courses.theme', 'auto');
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && darkMQ.matches);
  $('meta[name="theme-color"]').content = dark ? '#141816' : '#f4f2ec';
}
darkMQ.addEventListener('change', applyTheme);
applyTheme();

function settingsSheet() {
  ctx = { type: 'settings' };
  const t = ls.get('courses.theme', 'auto');
  const opt = (v, l) => `<button type="button" data-act="theme" data-theme="${v}" class="${t === v ? 'on' : ''}" aria-pressed="${t === v}">${l}</button>`;
  show(`<div class="sheet-in">${head('Réglages')}
    <div class="theme">Apparence<div class="seg">${opt('auto', 'Auto')}${opt('light', 'Clair')}${opt('dark', 'Sombre')}</div></div>
    <p class="hint">Appui long sur un article pour le modifier, glissez-le vers la gauche pour le supprimer.</p>
    ${DEMO ? '' : '<div class="actions"><button type="button" class="dangerbtn" data-act="logout">Se déconnecter</button></div>'}</div>`);
}

sheet.addEventListener('submit', (e) => {
  e.preventDefault();
  if (ctx.type === 'recipeform') { if (saveRecipeForm(e.target)) sheet.close(); return; }
  const name = e.target.elements.name.value.trim();
  if (!name) return;
  if (ctx.type === 'item') updateItem(ctx.id, name, e.target.elements.cat.value);
  else if (ctx.type === 'cat') renameCat(ctx.id, name);
  else if (ctx.type === 'newcat') addCat(name);
  sheet.close();
});

// Entrée dans le champ ingrédient : on l'ajoute au lieu d'envoyer le formulaire.
sheet.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.name === 'newstyle') { e.preventDefault(); addFormStyle(); return; }
  if (e.key !== 'Enter' || e.target.name !== 'ing') return;
  e.preventDefault();
  // Entrée : l'article correspondant (exact, sinon le premier proposé), sinon on propose de le créer.
  const q = e.target.value.trim();
  if (!q) return;
  const used = formIngKeys();
  const ms = ingMatches(q).filter((m) => !used.has(ingKey(m.name)));
  const pick = ms.find((m) => ingKey(m.name) === ingKey(q)) || ms[0];
  if (pick) addFormIng(pick.name);
  else if (!used.has(ingKey(q))) { ingCreate = true; renderIngSugg(); }
});
sheet.addEventListener('input', (e) => { if (e.target.name === 'ing') { ingCreate = false; renderIngSugg(); } });

sheet.addEventListener('click', (e) => {
  if (e.target === sheet) { sheet.close(); return; }   // clic sur le fond
  const b = e.target.closest('[data-act]');
  if (!b) return;
  switch (b.dataset.act) {
    case 'close': sheet.close(); break;
    case 'ring': toggle(b.dataset.id); recipeSheet(ctx.id); break;
    case 'rdel': delRecipe(ctx.id); sheet.close(); break;
    case 'redit': recipeForm(ctx.id); break;
    case 'ftag': case 'fingopt': (b.dataset.act === 'ftag' ? b : b.closest('.fing')).classList.toggle(b.dataset.act === 'ftag' ? 'on' : 'opt'); break;
    case 'fingdel': b.closest('.fing').remove(); break;
    case 'fstylenew': { const row = sheet.querySelector('input[name="newstyle"]').closest('.addrow'); row.hidden = false; row.querySelector('input').focus(); break; }
    case 'fstyleadd': addFormStyle(); break;
    case 'fingpick': addFormIng(b.dataset.name); break;
    case 'fingnew': ingCreate = true; renderIngSugg(); break;
    case 'fingonly': addFormIng(); break;
    case 'fingcreate': createFormIng(); break;
    case 'delete':
      if (ctx.type === 'item') { delItem(ctx.id); sheet.close(); }
      else if (delCat(ctx.id)) sheet.close();
      break;
    case 'up': case 'down':
      moveCat(ctx.id, b.dataset.act === 'up' ? -1 : 1);
      catSheet(ctx.id, sheet.querySelector('input').value);
      break;
    case 'theme': ls.set('courses.theme', b.dataset.theme); applyTheme(); settingsSheet(); break;
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
  elToast.querySelector('button').hidden = !undo;
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
  state = { ...state, cats, items };
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
    case 'rtag': recipeTag = b.dataset.v; ls.set('courses.recipeTag', recipeTag); render(); break;
    case 'recipe': recipeSheet(b.dataset.id); break;
    case 'newrecipe': recipeForm(null); break;
    case 'rseed': seedRecipes(); break;
    case 'carnetadd': importCarnet(); break;
    case 'carnetskip': ls.set('courses.carnet', String(CARNET)); render(); break;
    case 'rfold': {
      const g = b.dataset.g;
      if (recipeClosed.has(g)) recipeClosed.delete(g); else recipeClosed.add(g);
      ls.set('courses.recipeClosed', JSON.stringify([...recipeClosed]));
      render();
      break;
    }
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
  // Table des recettes : absente tant que le SQL n'a pas été lancé, sans bloquer le reste.
  const r = await sb.from('recipes').select('*');
  recipesDb = r.error ? 'missing' : 'ok';
  if (r.error) console.warn('recipes:', r.error.message);
  state = { cats: c.data, items: i.data, recipes: r.error ? (state.recipes || []) : r.data };
  loaded = true;
  setSync('ok', 'Synchronisé');
  save();
  render();
}

function applyChange(key, p) {
  const list = state[key] || (state[key] = []);
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
  if (sheet.open && ctx?.type === 'recipe') recipeSheet(ctx.id);
}

let channel = null;
function subscribe() {
  if (channel) sb.removeChannel(channel);
  channel = sb.channel('courses')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (p) => applyChange('items', p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (p) => applyChange('cats', p));
  if (recipesDb === 'ok') channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, (p) => applyChange('recipes', p));
  channel = channel
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
  load().then(subscribe);
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
    if (!document.hidden && !elTop.hidden) load().then(subscribe);
  });
  addEventListener('online', () => { if (!elTop.hidden) load().then(subscribe); });
}

start();
})();
