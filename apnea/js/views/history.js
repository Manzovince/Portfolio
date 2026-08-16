import { el, segmented, toast, icons, confirmDialog } from '../ui.js';
import { listSessions, deleteSession, totalHoldTime, personalBest } from '../store.js';
import { fmtTime, fmtShort, fmtDayHeading, fmtTimeOfDay, dayKey, fmtDistance, fmtDepth, escapeHtml } from '../format.js';
import { holdTimeline } from '../chart.js';

let uid = 0; // only to pair a header with its panel for aria-controls

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'hold', label: 'Holds' },
  { value: 'freedive', label: 'Dives' },
  { value: 'table', label: 'Tables' },
  { value: 'distance', label: 'Distance' },
  { value: 'relax', label: 'Breathing' },
];

function headline(s) {
  if (s.type === 'hold') return `Max hold · ${fmtTime(s.hold)}`;
  if (s.type === 'walk') return `Apnea walk · ${fmtDistance(s.distance || 0)}`;
  if (s.type === 'freedive') return `Freedive · ${s.diveCount} dive${s.diveCount === 1 ? '' : 's'}`;
  if (s.type === 'dyn') return `${s.discipline || 'DYN'} · ${fmtDistance(s.distance || 0)}`;
  if (s.type === 'co2') return `CO₂ table · ${s.completedRounds}/${s.config?.rounds ?? s.rounds.length} rounds`;
  if (s.type === 'o2') return `O₂ table · ${s.completedRounds}/${s.config?.rounds ?? s.rounds.length} rounds`;
  return `${s.patternName || 'Breathing'} · ${fmtShort(s.duration)}`;
}

function subline(s) {
  if (s.type === 'hold' || s.type === 'walk') {
    const n = s.contractions?.length || 0;
    const first = n ? ` · first at ${fmtTime(s.contractions[0])}` : '';
    const lead = s.type === 'walk' ? `${fmtTime(s.hold)} hold · ` : '';
    return `${lead}${n} contraction${n === 1 ? '' : 's'}${first}`;
  }
  if (s.type === 'freedive') {
    const bits = [`best ${fmtTime(s.bestDive)}`];
    if (s.maxDepth) bits.push(`max ${fmtDepth(s.maxDepth)}`);
    bits.push(`${fmtTime(s.totalDiveTime)} underwater`);
    return bits.join(' · ');
  }
  if (s.type === 'dyn') {
    const bits = [];
    if (s.time) bits.push(fmtTime(s.time));
    if (s.poolLength) bits.push(`${s.poolLength}m pool`);
    return bits.join(' · ') || 'dynamic apnea';
  }
  if (s.rounds) return `${fmtTime(totalHoldTime(s))} holding · ${s.rounds.reduce((a, r) => a + r.contractions.length, 0)} spasms`;
  return `${s.cycles} cycles · ${(s.pattern || []).join('-')}`;
}

/** Returns { html, node } — node is appended after the html block if present. */
function detail(s) {
  if (s.type === 'hold' || s.type === 'walk') {
    const parts = [];
    parts.push(`<div class="row wrap" style="gap:6px;margin-bottom:8px">
      <span class="chip">${s.type === 'walk' ? 'breathe-up' : 'relax'} ${fmtTime(s.prep)}</span>
      <span class="chip">hold ${fmtTime(s.hold)}</span>
      <span class="chip">recovery ${fmtTime(s.recovery)}</span>
      ${s.distance ? `<span class="chip">${fmtDistance(s.distance)}</span>` : ''}
      ${s.steps ? `<span class="chip">${s.steps} steps</span>` : ''}
    </div>`);
    if (s.contractions?.length) {
      parts.push(`<div class="eyebrow" style="margin:12px 0 4px">Contraction timeline</div>`);
    }
    return {
      html: parts.join(''),
      node: s.contractions?.length ? timelineBlock(s) : null,
    };
  }
  if (s.type === 'dyn') {
    return {
      html: `<div class="chips">
        <span class="chip">${escapeHtml(s.discipline || 'DYN')}</span>
        <span class="chip">${fmtDistance(s.distance || 0)}</span>
        ${s.time ? `<span class="chip">${fmtTime(s.time)}</span>` : ''}
        ${s.poolLength ? `<span class="chip">${s.poolLength}m pool</span>` : ''}
        ${s.time && s.distance ? `<span class="chip">${(s.distance / s.time * 60).toFixed(0)} m/min</span>` : ''}
      </div>`,
      node: null,
    };
  }
  if (s.type === 'freedive') {
    const chips = [
      `<span class="chip">best ${fmtTime(s.bestDive)}</span>`,
      s.maxDepth ? `<span class="chip">max ${fmtDepth(s.maxDepth)}</span>` : '',
      `<span class="chip">${fmtTime(s.totalDiveTime)} underwater</span>`,
      s.maxHr ? `<span class="chip">HR ${s.avgHr ? `${s.avgHr}/` : ''}${s.maxHr}</span>` : '',
      s.device ? `<span class="chip">${escapeHtml(s.device)}</span>` : '',
      `<span class="chip">${s.source === 'fit' ? '.fit' : '.csv'} import</span>`,
    ].filter(Boolean).join('');
    return { html: `<div class="chips">${chips}</div>${divesTable(s)}`, node: null };
  }
  if (s.rounds) {
    return { html: roundsTable(s), node: null };
  }
  return {
    html: `<div class="chips">
      <span class="chip">pattern ${(s.pattern || []).join('-')}</span>
      <span class="chip">${s.cycles} cycles</span>
      <span class="chip">${fmtShort(s.duration)}</span>
    </div>`,
    node: null,
  };
}

function timelineBlock(s) {
  const wrap = el('<div class="chart-card"></div>');
  wrap.appendChild(holdTimeline({ hold: s.hold, contractions: s.contractions }));
  const fight = s.hold - s.contractions[0];
  wrap.appendChild(el(`<p class="tiny" style="margin-top:4px">Fight phase ${fmtTime(fight)} · ${Math.round((fight / s.hold) * 100)}% of the hold · ${s.contractions.length} spasms</p>`));
  return wrap;
}

function divesTable(s) {
  // depth and surface interval are both optional depending on the export
  const depth = s.dives.some((d) => d.maxDepth != null);
  const surface = s.dives.some((d) => d.surfaceInterval != null);
  const cell = (value, format) => (value != null ? format(value) : '—');
  return `<table class="rounds" style="margin-top:10px">
    <thead><tr><th>#</th><th>Hold</th>${depth ? '<th>Depth</th>' : ''}${surface ? '<th>Surface</th>' : ''}</tr></thead>
    <tbody>${s.dives.map((d) => `
      <tr>
        <td class="n">${d.n}</td>
        <td>${fmtTime(d.duration)}</td>
        ${depth ? `<td>${cell(d.maxDepth, fmtDepth)}</td>` : ''}
        ${surface ? `<td>${cell(d.surfaceInterval, fmtTime)}</td>` : ''}
      </tr>`).join('')}
    </tbody></table>`;
}

function roundsTable(s) {
  return `<table class="rounds">
    <thead><tr><th>#</th><th>Breathe</th><th>Hold</th><th>Spasms</th></tr></thead>
    <tbody>${s.rounds.map((r, i) => `
      <tr><td class="n">${i + 1}</td><td>${fmtTime(r.rest)}</td><td>${fmtTime(r.holdActual)}</td><td>${r.contractions.length || '—'}</td></tr>`).join('')}
    </tbody></table>`;
}

export function render(root) {
  let filter = 'all';
  const pbId = personalBest()?.id;

  root.appendChild(el(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Logbook</div>
        <h1>History</h1>
      </div>
      <a class="btn btn-sm btn-ghost" href="#/settings">Export</a>
    </div>`));

  const filterRow = el('<div style="margin-bottom:16px"></div>');
  filterRow.appendChild(segmented({
    label: 'Session type', value: filter,
    options: FILTERS,
    onChange: (v) => { filter = v; paint(); },
  }));
  root.appendChild(filterRow);

  const listNode = el('<div></div>');
  root.appendChild(listNode);

  function paint() {
    const sessions = listSessions().filter((s) => {
      if (filter === 'all') return true;
      if (filter === 'table') return s.type === 'co2' || s.type === 'o2';
      if (filter === 'hold') return s.type === 'hold' || s.type === 'walk';
      if (filter === 'distance') return s.type === 'dyn' || s.type === 'walk';
      return s.type === filter;
    });

    listNode.innerHTML = '';
    if (!sessions.length) {
      listNode.appendChild(el('<div class="empty">Nothing logged here yet.</div>'));
      return;
    }

    let lastDay = null;
    for (const s of sessions) {
      const key = dayKey(s.date);
      if (key !== lastDay) {
        lastDay = key;
        listNode.appendChild(el(`<div class="day-head">${fmtDayHeading(s.date)}</div>`));
      }

      // the whole header is the hit target, not just the chevron — so it is a
      // div with a button role rather than a <button>, which cannot legally
      // wrap the PB chip's markup and would swallow the text selection
      const detailId = `entry-detail-${++uid}`;
      const card = el(`
        <div class="card" style="margin-bottom:10px">
          <div class="entry type-${s.type}">
            <div class="row-between entry-head" data-act="toggle" role="button" tabindex="0"
                 aria-expanded="false" aria-controls="${detailId}">
              <div class="grow">
                <div class="tile-title">${escapeHtml(headline(s))}${s.id === pbId ? ' <span class="chip" style="border-color:var(--series-3);color:#4fc79b">PB</span>' : ''}</div>
                <div class="tiny">${fmtTimeOfDay(s.date)} · ${escapeHtml(subline(s))}</div>
              </div>
              <span class="entry-chevron">${icons.chevron}</span>
            </div>
            <div id="${detailId}" data-el="detail" hidden style="margin-top:12px"></div>
          </div>
        </div>`);

      const body = card.querySelector('[data-el="detail"]');
      const toggle = card.querySelector('[data-act="toggle"]');
      const chevron = card.querySelector('.entry-chevron');
      const flip = () => {
        const open = body.hasAttribute('hidden');
        if (open && !body.dataset.filled) {
          const built = detail(s);
          body.innerHTML = built.html;
          if (built.node) body.appendChild(built.node);
          if (s.note) body.appendChild(el(`<p class="muted" style="margin-top:10px">${escapeHtml(s.note)}</p>`));

          const actions = el('<div class="row wrap" style="gap:8px;margin-top:12px"></div>');
          actions.appendChild(el(`<a class="btn btn-sm btn-ghost" href="#/entry?id=${encodeURIComponent(s.id)}">Edit</a>`));
          const del = el('<button class="btn btn-sm btn-ghost btn-danger">Delete session</button>');
          del.addEventListener('click', async () => {
            const ok = await confirmDialog({
              title: 'Delete this session?',
              message: `${headline(s)} — this cannot be undone.`,
              confirmLabel: 'Delete',
              danger: true,
            });
            if (!ok) return;
            deleteSession(s.id);
            toast('Session deleted');
            paint();
          });
          actions.appendChild(del);
          body.appendChild(actions);
          body.dataset.filled = '1';
        }
        body.toggleAttribute('hidden', !open);
        toggle.setAttribute('aria-expanded', String(open));
        chevron.classList.toggle('open', open);
      };

      toggle.addEventListener('click', flip);
      toggle.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault(); // space would scroll the page
        flip();
      });

      listNode.appendChild(card);
    }
  }

  paint();
}
