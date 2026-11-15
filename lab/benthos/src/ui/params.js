import { PARAM_SCHEMA, DEFAULT_CONFIG, clone, getPath, setPath } from '../config.js';
import { deckSize } from '../core/deck.js';
import { sheet } from './sheets.js';

const fieldHTML = (f, value) => {
  const id = `f_${f.path.replace(/\./g, '_')}`;
  let input;
  if (f.type === 'bool') input = `<input type="checkbox" id="${id}" data-path="${f.path}" data-type="bool" ${value ? 'checked' : ''}>`;
  else if (f.type === 'select') input = `<select id="${id}" data-path="${f.path}" data-type="select">${f.options.map((o) => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
  else if (f.type === 'text') input = `<input type="text" id="${id}" data-path="${f.path}" data-type="text" value="${value ?? ''}">`;
  else input = `<input type="number" id="${id}" data-path="${f.path}" data-type="int" min="${f.min}" max="${f.max}" value="${value}">`;
  return `<div class="field"><label for="${id}">${f.label}</label>${input}</div>`;
};

/** One table per family of feature types - reefs, creatures, relics. */
const typeTableHTML = (spec, rows) => `
  <table class="types">
    <thead><tr><th>Kind</th>${spec.cols.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((t, i) => `<tr>
      <td>${t.label}</td>
      ${spec.cols.map((c) => `<td><input type="number" min="${c.min}" max="${c.max}" value="${t[c.key]}"
        data-table="${spec.path}" data-row="${i}" data-key="${c.key}"></td>`).join('')}
    </tr>`).join('')}</tbody>
  </table>`;

const totalLine = (c) => {
  const n = deckSize(c);
  const need = c.handSize * c.players;
  const short = n < need;
  return `<p class="total ${short ? 'short' : ''}" data-decktotal>${n} tiles in the deck${
    short ? ` &mdash; fewer than the ${need} the opening hands need` : ''}</p>`;
};

const bodyHTML = (c) => PARAM_SCHEMA.map((g) => `
  <fieldset>
    <legend>${g.group}</legend>
    ${g.typeTable ? typeTableHTML(g.typeTable, getPath(c, g.typeTable.path)) : ''}
    ${g.fields.length ? `<div class="fields">${g.fields.map((f) => fieldHTML(f, getPath(c, f.path))).join('')}</div>` : ''}
    ${g.deckTotal ? totalLine(c) : ''}
  </fieldset>`).join('');

/** Everything outside `ui` needs a fresh game; `ui` can be applied live. */
const needsRestart = (a, b) => {
  const strip = (c) => { const d = clone(c); delete d.ui; return JSON.stringify(d); };
  return strip(a) !== strip(b);
};

export function openParams(modal, config, { onApply }) {
  let draft = clone(config);

  const paint = () => {
    modal.innerHTML = sheet('Parameters', bodyHTML(draft),
      `<button class="ghostbtn" data-reset>Reset to defaults</button>
       <div style="flex:1"></div>
       <button class="ghostbtn" data-close>Cancel</button>
       <button class="ghostbtn primary" data-apply>Apply</button>`);
    modal.hidden = false;
  };
  paint();

  const read = () => {
    modal.querySelectorAll('[data-path]').forEach((input) => {
      const { path, type } = input.dataset;
      if (type === 'bool') setPath(draft, path, input.checked);
      else if (type === 'int') {
        const lo = Number(input.min ?? -Infinity);
        const hi = Number(input.max ?? Infinity);
        setPath(draft, path, Math.max(lo, Math.min(hi, Number(input.value) || 0)));
      } else setPath(draft, path, input.value);
    });
    modal.querySelectorAll('[data-table]').forEach((input) => {
      const rows = getPath(draft, input.dataset.table);
      const row = rows && rows[Number(input.dataset.row)];
      if (!row) return;
      const lo = Number(input.min || 0);
      row[input.dataset.key] = Math.max(lo, Number(input.value) || 0);
    });
  };

  // keep the deck total honest while the counts are being edited
  modal.oninput = () => {
    read();
    const line = modal.querySelector('[data-decktotal]');
    if (line) line.outerHTML = totalLine(draft);
  };

  modal.onclick = (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) { close(); return; }
    if (e.target.closest('[data-reset]')) { draft = clone(DEFAULT_CONFIG); paint(); return; }
    if (e.target.closest('[data-apply]')) {
      read();
      const restart = needsRestart(config, draft);
      close();
      onApply(clone(draft), restart);
    }
  };

  function close() { modal.hidden = true; modal.innerHTML = ''; modal.onclick = null; modal.oninput = null; }
}
