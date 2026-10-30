// Manual entry and editing. Reached as:
//   #/entry              new session, type picker shown
//   #/entry?type=dyn     new session of a given type
//   #/entry?id=…         edit an existing session

import { el, segmented, textField, toast, icons } from '../ui.js';
import { getSession, saveSession, updateSession } from '../store.js';
import { fmtTime, parseTime, parseTimeList, toLocalInput, fromLocalInput, escapeHtml } from '../format.js';
import { go } from '../main.js';

const TYPES = [
  { value: 'hold', label: 'Max hold' },
  { value: 'co2', label: 'CO₂' },
  { value: 'o2', label: 'O₂' },
  { value: 'relax', label: 'Breathing' },
  { value: 'walk', label: 'Apnea walk' },
  { value: 'dyn', label: 'Dynamic' },
];

const DISCIPLINES = [
  { value: 'DYN', label: 'DYN (fins)' },
  { value: 'DNF', label: 'DNF (no fins)' },
  { value: 'DYNB', label: 'DYNB (bi-fins)' },
];

const num = (v) => {
  const n = Number(String(v).replace(',', '.').trim());
  return isFinite(n) && n >= 0 ? n : null;
};

export function render(root) {
  const query = new URLSearchParams(location.hash.split('?')[1] || '');
  const editId = query.get('id');
  const existing = editId ? getSession(editId) : null;

  if (editId && !existing) {
    root.appendChild(el('<div class="empty">That session no longer exists.</div>'));
    root.appendChild(el('<a class="btn btn-block" href="#/history" style="margin-top:14px">Back to history</a>'));
    return;
  }

  let type = existing?.type || query.get('type') || 'hold';

  // draft holds only what the form edits; unedited fields survive via `existing`
  let draft = {};
  const seed = () => {
    const s = existing || {};
    draft = {
      date: s.date || new Date().toISOString(),
      note: s.note || '',
      hold: s.hold ?? null,
      prep: s.prep ?? 0,
      recovery: s.recovery ?? 0,
      contractions: s.contractions ? s.contractions.slice() : [],
      // tables
      rounds: s.config?.rounds ?? s.rounds?.length ?? 8,
      roundHold: s.config?.hold ?? s.rounds?.[0]?.hold ?? 60,
      restStart: s.config?.restStart ?? s.rounds?.[0]?.rest ?? 120,
      restStep: s.config?.restStep ?? 15,
      o2Rest: s.config?.rest ?? s.rounds?.[0]?.rest ?? 120,
      holdStart: s.config?.holdStart ?? s.rounds?.[0]?.hold ?? 60,
      holdStep: s.config?.holdStep ?? 15,
      completedRounds: s.completedRounds ?? (s.rounds?.length || 8),
      // relax
      pattern: s.pattern ? s.pattern.slice() : [4, 4, 4, 4],
      duration: s.duration ?? 300,
      // distance work
      distance: s.distance ?? null,
      steps: s.steps ?? null,
      discipline: s.discipline || 'DYN',
      time: s.time ?? null,
      poolLength: s.poolLength ?? 25,
    };
  };
  seed();

  function paint() {
    root.innerHTML = '';

    root.appendChild(el(`
      <div class="page-head">
        <div>
          <div class="eyebrow">${existing ? 'Edit' : 'Log manually'}</div>
          <h1>${existing ? 'Edit session' : 'Add session'}</h1>
        </div>
        <a class="btn btn-sm btn-ghost" href="${existing ? '#/history' : '#/'}">${icons.back} Back</a>
      </div>`));

    if (!existing) {
      root.appendChild(segmented({
        label: 'Session type',
        value: type,
        options: TYPES.slice(0, 3),
        onChange: (v) => { type = v; paint(); },
      }));
      const second = segmented({
        label: 'Session type',
        value: type,
        options: TYPES.slice(3),
        onChange: (v) => { type = v; paint(); },
      });
      second.style.marginTop = '6px';
      root.appendChild(second);
    }

    const card = el('<div class="card stack" style="margin-top:14px"></div>');

    // --- when ---------------------------------------------------------------
    const when = el(`
      <div class="field">
        <label for="when">Date &amp; time</label>
        <input id="when" type="datetime-local" value="${toLocalInput(draft.date)}">
      </div>`);
    when.querySelector('input').addEventListener('change', (e) => {
      draft.date = fromLocalInput(e.target.value);
    });
    card.appendChild(when);

    // --- per-type fields ----------------------------------------------------
    if (type === 'hold' || type === 'walk') {
      card.appendChild(textField({
        label: 'Hold time',
        hint: 'Minutes and seconds, e.g. 3:20',
        placeholder: '3:20',
        value: draft.hold != null ? fmtTime(draft.hold) : '',
        parse: parseTime,
        onChange: (v) => { draft.hold = v; },
      }));
      card.appendChild(textField({
        label: 'Contraction times',
        hint: 'Optional, comma separated from the start of the hold — e.g. 2:10, 2:35, 3:02',
        placeholder: '2:10, 2:35',
        value: draft.contractions.map((c) => fmtTime(c)).join(', '),
        parse: (t) => (t.trim() === '' ? [] : parseTimeList(t)),
        onChange: (v) => { draft.contractions = v || []; },
      }));
      card.appendChild(textField({
        label: 'Relaxation before',
        placeholder: '2:00',
        value: draft.prep ? fmtTime(draft.prep) : '',
        parse: (t) => (t.trim() === '' ? 0 : parseTime(t)),
        onChange: (v) => { draft.prep = v ?? 0; },
      }));
      card.appendChild(textField({
        label: 'Recovery after',
        placeholder: '2:00',
        value: draft.recovery ? fmtTime(draft.recovery) : '',
        parse: (t) => (t.trim() === '' ? 0 : parseTime(t)),
        onChange: (v) => { draft.recovery = v ?? 0; },
      }));
    }

    if (type === 'walk') {
      card.appendChild(textField({
        label: 'Distance walked',
        hint: 'Metres',
        placeholder: '60',
        inputmode: 'decimal',
        value: draft.distance ?? '',
        parse: num,
        onChange: (v) => { draft.distance = v; },
      }));
      card.appendChild(textField({
        label: 'Steps',
        hint: 'Optional',
        placeholder: '80',
        inputmode: 'numeric',
        value: draft.steps ?? '',
        parse: num,
        onChange: (v) => { draft.steps = v; },
      }));
    }

    if (type === 'dyn') {
      card.appendChild(segmented({
        label: 'Discipline',
        value: draft.discipline,
        options: DISCIPLINES,
        onChange: (v) => { draft.discipline = v; },
      }));
      card.appendChild(textField({
        label: 'Distance',
        hint: 'Metres',
        placeholder: '75',
        inputmode: 'decimal',
        value: draft.distance ?? '',
        parse: num,
        onChange: (v) => { draft.distance = v; },
      }));
      card.appendChild(textField({
        label: 'Time underwater',
        hint: 'Optional, e.g. 1:12',
        placeholder: '1:12',
        value: draft.time != null ? fmtTime(draft.time) : '',
        parse: (t) => (t.trim() === '' ? null : parseTime(t)),
        onChange: (v) => { draft.time = v; },
      }));
      card.appendChild(textField({
        label: 'Pool length',
        hint: 'Metres',
        placeholder: '25',
        inputmode: 'decimal',
        value: draft.poolLength ?? '',
        parse: num,
        onChange: (v) => { draft.poolLength = v; },
      }));
    }

    if (type === 'co2' || type === 'o2') {
      card.appendChild(el('<p class="tiny">Rounds are rebuilt from these settings, assuming every logged round was completed in full.</p>'));
      const fields = type === 'co2'
        ? [
          ['Hold (every round)', 'roundHold', '1:00'],
          ['First rest', 'restStart', '2:00'],
          ['Rest reduction per round', 'restStep', '0:15'],
        ]
        : [
          ['First hold', 'holdStart', '1:00'],
          ['Hold increase per round', 'holdStep', '0:15'],
          ['Rest (every round)', 'o2Rest', '2:00'],
        ];
      for (const [label, key, placeholder] of fields) {
        card.appendChild(textField({
          label, placeholder,
          value: fmtTime(draft[key]),
          parse: parseTime,
          onChange: (v) => { draft[key] = v; },
        }));
      }
      card.appendChild(textField({
        label: 'Rounds completed',
        placeholder: '8',
        inputmode: 'numeric',
        value: draft.completedRounds,
        parse: num,
        onChange: (v) => { draft.completedRounds = v; draft.rounds = Math.max(draft.rounds, v || 0); },
      }));
    }

    if (type === 'relax') {
      card.appendChild(textField({
        label: 'Pattern',
        hint: 'Inhale-hold-exhale-hold in seconds, e.g. 4-4-4-4',
        placeholder: '4-4-4-4',
        value: draft.pattern.join('-'),
        parse: (t) => {
          const parts = t.split('-').map((p) => Number(p.trim()));
          return parts.length === 4 && parts.every((p) => isFinite(p) && p >= 0) ? parts : null;
        },
        onChange: (v) => { if (v) draft.pattern = v; },
      }));
      card.appendChild(textField({
        label: 'Duration',
        placeholder: '5:00',
        value: fmtTime(draft.duration),
        parse: parseTime,
        onChange: (v) => { draft.duration = v; },
      }));
    }

    if (type === 'freedive') {
      card.appendChild(el(`
        <p class="tiny">
          Imported from your dive watch — ${existing.diveCount} dive${existing.diveCount === 1 ? '' : 's'},
          longest ${fmtTime(existing.bestDive)}. The dives come from the file itself; correct the date
          or add a note here. To change the dives, delete this session and re-import.
        </p>`));
    }

    // --- note ---------------------------------------------------------------
    const noteField = el(`
      <div class="field">
        <label for="note">Note</label>
        <textarea id="note" rows="2" placeholder="Conditions, how it felt…">${escapeHtml(draft.note)}</textarea>
      </div>`);
    noteField.querySelector('textarea').addEventListener('input', (e) => { draft.note = e.target.value; });
    card.appendChild(noteField);

    root.appendChild(card);

    // --- save ---------------------------------------------------------------
    const save = el(`<button class="btn btn-primary btn-lg btn-block" style="margin-top:16px">${existing ? 'Save changes' : 'Add session'}</button>`);
    save.addEventListener('click', () => {
      const payload = build();
      if (!payload) return;
      if (existing) {
        updateSession(existing.id, payload);
        toast('Session updated');
        go('#/history');
      } else {
        saveSession(payload);
        toast('Session added');
        go('#/history');
      }
    });
    root.appendChild(save);
  }

  /** Validate and shape the draft into a stored session, or null with a toast. */
  function build() {
    const base = { type, date: draft.date, note: draft.note.trim() };

    // an imported session's dives are the watch's record, not ours to rewrite
    if (type === 'freedive') {
      if (!existing) { toast('Dive sessions come in from a watch export'); return null; }
      return base;
    }

    if (type === 'hold' || type === 'walk') {
      if (!draft.hold) { toast('Enter a hold time, e.g. 3:20'); return null; }
      const over = draft.contractions.filter((c) => c > draft.hold);
      if (over.length) { toast('A contraction is later than the hold itself'); return null; }
      const out = {
        ...base,
        hold: draft.hold,
        prep: draft.prep || 0,
        recovery: draft.recovery || 0,
        contractions: draft.contractions,
      };
      if (type === 'walk') {
        if (!draft.distance) { toast('Enter the distance walked'); return null; }
        out.distance = draft.distance;
        out.steps = draft.steps || null;
      }
      return out;
    }

    if (type === 'dyn') {
      if (!draft.distance) { toast('Enter a distance'); return null; }
      return {
        ...base,
        discipline: draft.discipline,
        distance: draft.distance,
        time: draft.time,
        poolLength: draft.poolLength || null,
      };
    }

    if (type === 'co2' || type === 'o2') {
      const count = Math.round(draft.completedRounds || 0);
      if (!count) { toast('Enter how many rounds you completed'); return null; }
      const rounds = [];
      for (let i = 0; i < count; i++) {
        const rest = type === 'co2'
          ? Math.max(15, draft.restStart - i * draft.restStep)
          : draft.o2Rest;
        const hold = type === 'co2' ? draft.roundHold : draft.holdStart + i * draft.holdStep;
        rounds.push({ rest, hold, holdActual: hold, contractions: [] });
      }
      const config = type === 'co2'
        ? { rounds: count, hold: draft.roundHold, restStart: draft.restStart, restStep: draft.restStep, restMin: 15 }
        : { rounds: count, rest: draft.o2Rest, holdStart: draft.holdStart, holdStep: draft.holdStep };
      return { ...base, config, rounds, completedRounds: count };
    }

    // relax
    if (!draft.duration) { toast('Enter a duration'); return null; }
    const cycleLen = draft.pattern.reduce((a, b) => a + b, 0) || 1;
    return {
      ...base,
      patternName: 'Breathing',
      pattern: draft.pattern,
      duration: draft.duration,
      cycles: Math.floor(draft.duration / cycleLen),
    };
  }

  paint();
}
