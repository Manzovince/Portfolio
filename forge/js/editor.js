// Template ("séance") editor, exercise picker and custom-exercise form.
import { db, save, uid, exById, allExercises, invalidateEx, estimateTpl, fmtDur, fmtClock } from './store.js?v=5';
import { MUSCLES, CATS, EQUIP, MODES } from './library.js?v=5';
import { esc, icon, sheet, menu, confirmDialog, toast, COLORS, colorOf } from './ui.js?v=5';
import { fmtField, parseField, inputMode, placeholderFor, setLabels, nextKind, KIND_LABEL, REST_CHOICES } from './fields.js?v=5';

const clone = o => JSON.parse(JSON.stringify(o));

// Fields shown in the editor: run sets also get a target pace.
export const editorFields = ex => (ex.mode === 'run' ? ['dist', 'sec', 'pace'] : MODES[ex.mode].fields);

export function restLabel(sec) { return sec ? fmtClock(sec) : 'aucun'; }

export function pickRest(current, done) {
  sheet({
    title: 'Temps de repos',
    body: `<div class="chips wrap">${REST_CHOICES.map(r => `<button class="chip ${r === current ? 'on' : ''}" data-r="${r}">${r ? fmtClock(r) : 'Aucun'}</button>`).join('')}</div>`,
    onMount(el, close) { el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { close(); done(+b.dataset.r); }); },
  });
}

// ---------- template editor ----------
export function openTemplateEditor(tplId, onDone) {
  const isNew = !tplId;
  const orig = db.templates.find(t => t.id === tplId);
  const tpl = orig ? clone(orig) : { id: uid(), name: '', color: 'ember', note: '', items: [] };
  let dirty = false;

  const close = sheet({
    title: isNew ? 'Nouvelle séance' : 'Modifier la séance',
    full: true,
    actions: `<button class="btn primary sm" data-save>Enregistrer</button>`,
    body: `<div class="editor"></div>`,
    onMount(el, closeFn) {
      const root = el.querySelector('.editor');
      el.querySelector('[data-save]').onclick = () => {
        if (!tpl.name.trim()) tpl.name = tpl.items.length ? exById(tpl.items[0].exId).name : 'Séance sans nom';
        const i = db.templates.findIndex(t => t.id === tpl.id);
        if (i >= 0) db.templates[i] = tpl; else db.templates.push(tpl);
        save(); dirty = false; closeFn(); toast('Séance enregistrée'); onDone && onDone(tpl);
      };
      render(root);
    },
  });

  function render(root) {
    const est = estimateTpl(tpl);
    root.innerHTML = `
      <label class="field"><span>Nom</span><input class="big-input" data-k="name" value="${esc(tpl.name)}" placeholder="Ex. Push A, Fractionné court…" autocomplete="off"></label>
      <div class="field"><span>Couleur</span><div class="swatches">${Object.keys(COLORS).map(c => `<button class="swatch ${c === tpl.color ? 'on' : ''}" data-color="${c}" style="--c:${COLORS[c]}" aria-label="${c}"></button>`).join('')}</div></div>
      <label class="field"><span>Notes</span><textarea data-k="note" rows="2" placeholder="Consignes, objectif…">${esc(tpl.note)}</textarea></label>
      <div class="editor-meta">${tpl.items.length} exercice${tpl.items.length > 1 ? 's' : ''} · ${(n => `${n} série${n > 1 ? 's' : ''}`)(tpl.items.reduce((a, i) => a + i.sets.length, 0))} · ~${fmtDur(est)}</div>
      <div class="ed-items">${tpl.items.map((it, i) => itemCard(it, i)).join('')}</div>
      <button class="btn ghost block" data-add>${icon('plus')} Ajouter des exercices</button>
      ${isNew ? '' : `<button class="btn danger-ghost block" data-del>${icon('trash')} Supprimer la séance</button>`}`;

    root.querySelectorAll('[data-k]').forEach(inp => inp.oninput = () => { tpl[inp.dataset.k] = inp.value; dirty = true; });
    root.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { tpl.color = b.dataset.color; render(root); });
    root.querySelector('[data-add]').onclick = () => openPicker(ids => {
      for (const id of ids) {
        const ex = exById(id);
        const base = ex.mode === 'run' ? { dist: 1000 } : ex.mode === 'time' ? { sec: ex.cat === 'mobilite' ? 45 : 30 } : ex.mode === 'bw' ? { reps: 10 } : { kg: '', reps: 8 };
        tpl.items.push({ id: uid(), exId: id, rest: ex.rest ?? db.settings.rest, note: '', sets: ex.mode === 'run' || ex.cat === 'mobilite' ? [{ ...base }] : [{ ...base }, { ...base }, { ...base }] });
      }
      render(root);
    });
    const del = root.querySelector('[data-del]');
    if (del) del.onclick = async () => {
      if (!(await confirmDialog(`Supprimer « ${tpl.name} » ? L’historique des séances faites est conservé.`, 'Supprimer'))) return;
      db.templates = db.templates.filter(t => t.id !== tpl.id);
      for (const p of db.programs) p.days = p.days.map(d => d.filter(x => x !== tpl.id));
      db.planned = db.planned.filter(x => x.tplId !== tpl.id);
      save(); close(); onDone && onDone(null);
    };

    tpl.items.forEach((it, i) => bindItem(root, it, i));
  }

  function itemCard(it, i) {
    const ex = exById(it.exId);
    const fields = editorFields(ex);
    const labels = setLabels(it.sets);
    const linked = it.group && tpl.items[i + 1]?.group === it.group;
    return `<article class="ex-card ${it.group ? 'grouped' : ''}" data-i="${i}">
      <header class="ex-head">
        <div class="ex-title"><b>${esc(ex.name)}</b><small>${esc(MODES[ex.mode].label)}${ex.side ? ' · par côté' : ''}${it.group ? ' · superset' : ''}</small>${it.note ? `<small class="note">${esc(it.note)}</small>` : ''}</div>
        <button class="chip sm" data-rest>${icon('timer')} ${restLabel(it.rest)}</button>
        <button class="icon-btn" data-menu aria-label="Options">${icon('dots')}</button>
      </header>
      <div class="set-grid ed cols-${fields.length}">
        <span class="h">Série</span>${fields.map(f => `<span class="h">${{ kg: ex.mode === 'wr' ? 'kg' : '+kg', reps: 'reps', sec: ex.mode === 'run' ? 'temps' : ex.side ? 'durée/côté' : 'durée', dist: 'km', pace: 'allure' }[f]}</span>`).join('')}<span class="h"></span>
        ${it.sets.map((s, j) => `
          <button class="set-no kind-${s.kind || 'n'}" data-kind="${j}" title="${KIND_LABEL[s.kind || 'n']}">${labels[j]}</button>
          ${fields.map(f => `<input class="cell" data-set="${j}" data-f="${f}" inputmode="${inputMode(f)}" placeholder="${placeholderFor(f, ex.mode)}" value="${esc(fmtField(f, s[f]))}">`).join('')}
          <button class="icon-btn sm" data-rm="${j}" aria-label="Supprimer la série">${icon('x')}</button>`).join('')}
      </div>
      <button class="btn text sm" data-addset>${icon('plus')} Série</button>
      ${linked ? `<div class="ss-link">${icon('link')} enchaîné avec le suivant</div>` : ''}
    </article>`;
  }

  function bindItem(root, it, i) {
    const card = root.querySelector(`.ex-card[data-i="${i}"]`);
    const ex = exById(it.exId);
    card.querySelectorAll('input[data-f]').forEach(inp => {
      inp.onchange = () => { it.sets[+inp.dataset.set][inp.dataset.f] = parseField(inp.dataset.f, inp.value, ex.mode); dirty = true; inp.value = fmtField(inp.dataset.f, it.sets[+inp.dataset.set][inp.dataset.f]); };
      inp.onfocus = () => inp.select();
    });
    card.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { const s = it.sets[+b.dataset.kind]; s.kind = nextKind(s.kind); render(root); });
    card.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { it.sets.splice(+b.dataset.rm, 1); if (!it.sets.length) tpl.items.splice(i, 1); render(root); });
    card.querySelector('[data-addset]').onclick = () => { const last = it.sets[it.sets.length - 1] || {}; it.sets.push({ ...last, kind: last.kind === 'w' ? 'n' : last.kind }); render(root); };
    card.querySelector('[data-rest]').onclick = () => pickRest(it.rest, r => { it.rest = r; render(root); });
    card.querySelector('[data-menu]').onclick = () => menu(ex.name, [
      i > 0 && { label: 'Monter', icon: 'up', run: () => { tpl.items.splice(i - 1, 0, tpl.items.splice(i, 1)[0]); render(root); } },
      i < tpl.items.length - 1 && { label: 'Descendre', icon: 'down', run: () => { tpl.items.splice(i + 1, 0, tpl.items.splice(i, 1)[0]); render(root); } },
      i < tpl.items.length - 1 && { label: it.group && tpl.items[i + 1].group === it.group ? 'Délier du suivant' : 'Superset avec le suivant', icon: 'link', run: () => {
        const nxt = tpl.items[i + 1];
        if (it.group && nxt.group === it.group) nxt.group = null;
        else { const g = it.group || uid(); it.group = g; nxt.group = g; }
        render(root);
      } },
      { label: it.note ? 'Modifier la note' : 'Ajouter une note', icon: 'edit', run: () => sheet({
        title: 'Note', body: `<textarea class="note-area" rows="4" placeholder="Consigne, niveau, réglage…">${esc(it.note || '')}</textarea><button class="btn primary block" data-ok>OK</button>`,
        onMount(el, close) { const t = el.querySelector('textarea'); t.focus(); el.querySelector('[data-ok]').onclick = () => { it.note = t.value.trim(); close(); render(root); }; },
      }) },
      { label: 'Remplacer l’exercice', icon: 'edit', run: () => openPicker(ids => { if (ids[0]) { it.exId = ids[0]; render(root); } }, { single: true }) },
      { label: 'Dupliquer', icon: 'copy', run: () => { tpl.items.splice(i + 1, 0, { ...clone(it), id: uid(), group: null }); render(root); } },
      { label: 'Supprimer', icon: 'trash', danger: true, run: () => { tpl.items.splice(i, 1); render(root); } },
    ].filter(Boolean));
  }
  return close;
}

// ---------- exercise picker ----------
export function openPicker(done, { single = false } = {}) {
  const picked = [];
  let q = '', cat = '', mine = !!db.settings.equip;
  const owned = e => !db.settings.equip || db.settings.equip.includes(e.equip || 'aucun');
  sheet({
    title: single ? 'Choisir un exercice' : 'Ajouter des exercices',
    full: true,
    actions: single ? '' : `<button class="btn primary sm" data-ok disabled>Ajouter</button>`,
    body: `<div class="picker">
      <div class="search">${icon('search')}<input type="search" placeholder="Rechercher…" data-q autocomplete="off"></div>
      <div class="chips scroll" data-cats>${db.settings.equip ? `<button class="chip ${mine ? 'on' : ''}" data-mine>Mon matériel</button>` : ''}<button class="chip on" data-cat="">Tout</button>${Object.entries(CATS).map(([k, v]) => `<button class="chip" data-cat="${k}">${v}</button>`).join('')}</div>
      <div class="pick-list"></div>
      <button class="btn ghost block" data-new>${icon('plus')} Créer un exercice</button>
    </div>`,
    onMount(el, close) {
      const list = el.querySelector('.pick-list');
      const ok = el.querySelector('[data-ok]');
      const draw = () => {
        const nq = norm(q);
        const items = allExercises().filter(e => (!mine || owned(e)) && (!cat || e.cat === cat) && (!nq || norm(e.name).includes(nq) || e.muscles.some(m => norm(MUSCLES[m]).includes(nq))))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        list.innerHTML = (mine ? `<p class="muted sm">Filtré sur ton matériel (Réglages → Mon matériel).</p>` : '') + items.map(e => `<button class="pick ${picked.includes(e.id) ? 'on' : ''}" data-id="${e.id}">
            <span class="pick-ic cat-${e.cat}">${icon(e.mode === 'run' ? 'run' : e.cat === 'charges' ? 'dumbbell' : e.cat === 'mobilite' ? 'mob' : e.mode === 'time' ? 'timer' : 'bolt')}</span>
            <span class="pick-txt"><b>${esc(e.name)}</b><small>${esc(exMeta(e))}</small></span>
            <span class="pick-check">${picked.includes(e.id) ? picked.indexOf(e.id) + 1 : ''}</span></button>`).join('') || '<p class="empty">Aucun exercice. Crée-le !</p>';
        list.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
          const id = b.dataset.id;
          if (single) { close(); done([id]); return; }
          const k = picked.indexOf(id); k >= 0 ? picked.splice(k, 1) : picked.push(id);
          ok.disabled = !picked.length; ok.textContent = picked.length ? `Ajouter (${picked.length})` : 'Ajouter';
          draw();
        });
      };
      el.querySelector('[data-q]').oninput = e => { q = e.target.value; draw(); };
      el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; el.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
      el.querySelector('[data-mine]')?.addEventListener('click', e => { mine = !mine; e.currentTarget.classList.toggle('on', mine); draw(); });
      if (ok) ok.onclick = () => { close(); done(picked); };
      el.querySelector('[data-new]').onclick = () => openExerciseForm(null, e => { if (single) { close(); done([e.id]); } else { picked.push(e.id); ok.disabled = false; ok.textContent = `Ajouter (${picked.length})`; draw(); } });
      draw();
    },
  });
}

export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const exMeta = e => [CATS[e.cat] + (e.side ? ' · par côté' : ''), e.muscles.map(m => MUSCLES[m]).join(', ') || null, e.equip && e.equip !== 'aucun' ? EQUIP[e.equip] : null].filter(Boolean).join(' · ');

// ---------- custom exercise form ----------
export function openExerciseForm(exId, done) {
  const orig = db.customEx.find(e => e.id === exId);
  const e = orig ? clone(orig) : { id: 'c-' + uid(), name: '', cat: 'charges', equip: 'halteres', mode: 'wr', muscles: [], secondary: [], rest: 90, custom: true };
  sheet({
    title: orig ? 'Modifier l’exercice' : 'Nouvel exercice',
    full: true,
    actions: `<button class="btn primary sm" data-save>Enregistrer</button>`,
    body: `<div class="form"></div>`,
    onMount(el, close) {
      const root = el.querySelector('.form');
      const draw = () => {
        root.innerHTML = `
          <label class="field"><span>Nom</span><input class="big-input" data-k="name" value="${esc(e.name)}" placeholder="Ex. Muscle-up" autocomplete="off"></label>
          ${chipField('Catégorie', 'cat', CATS)}
          ${chipField('Mesure', 'mode', Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, v.label])))}
          ${chipField('Matériel', 'equip', EQUIP)}
          <div class="field"><span>Muscles principaux</span><div class="chips wrap">${Object.entries(MUSCLES).map(([k, v]) => `<button class="chip ${e.muscles.includes(k) ? 'on' : ''}" data-m="muscles" data-v="${k}">${v}</button>`).join('')}</div></div>
          <div class="field"><span>Muscles secondaires</span><div class="chips wrap">${Object.entries(MUSCLES).map(([k, v]) => `<button class="chip ${e.secondary.includes(k) ? 'on alt' : ''}" data-m="secondary" data-v="${k}">${v}</button>`).join('')}</div></div>
          ${orig ? `<button class="btn danger-ghost block" data-del>${icon('trash')} Supprimer l’exercice</button>` : ''}`;
        root.querySelector('[data-k]').oninput = ev => { e.name = ev.target.value; };
        root.querySelectorAll('[data-single]').forEach(b => b.onclick = () => { e[b.dataset.single] = b.dataset.v; if (b.dataset.single === 'cat' && e.cat === 'course') e.mode = 'run'; draw(); });
        root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
          const arr = e[b.dataset.m], other = e[b.dataset.m === 'muscles' ? 'secondary' : 'muscles'], v = b.dataset.v;
          const k = arr.indexOf(v); k >= 0 ? arr.splice(k, 1) : (arr.push(v), other.includes(v) && other.splice(other.indexOf(v), 1));
          draw();
        });
        const del = root.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          const used = db.sessions.some(s => s.items.some(i => i.exId === e.id)) || db.templates.some(t => t.items.some(i => i.exId === e.id));
          if (used) { toast('Exercice utilisé dans des séances : suppression impossible'); return; }
          if (!(await confirmDialog(`Supprimer « ${e.name} » ?`, 'Supprimer'))) return;
          db.customEx = db.customEx.filter(x => x.id !== e.id); invalidateEx(); save(); close(); done && done(null);
        };
      };
      const chipField = (label, key, opts) => `<div class="field"><span>${label}</span><div class="chips wrap">${Object.entries(opts).map(([k, v]) => `<button class="chip ${e[key] === k ? 'on' : ''}" data-single="${key}" data-v="${k}">${esc(v)}</button>`).join('')}</div></div>`;
      el.querySelector('[data-save]').onclick = () => {
        if (!e.name.trim()) { toast('Donne un nom à l’exercice'); return; }
        const i = db.customEx.findIndex(x => x.id === e.id);
        if (i >= 0) db.customEx[i] = e; else db.customEx.push(e);
        invalidateEx(); save(); close(); done && done(e);
      };
      draw();
    },
  });
}

export function tplSummary(tpl) {
  const names = tpl.items.map(i => exById(i.exId).name);
  const uniq = [...new Set(names)];
  return uniq.slice(0, 4).join(' · ') + (uniq.length > 4 ? ` +${uniq.length - 4}` : '');
}
export const tplColor = tpl => colorOf(tpl?.color);
