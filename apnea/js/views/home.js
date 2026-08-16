import { el, icons } from '../ui.js';
import { listSessions, personalBest, totalHoldTime, backupOverdue, daysSinceExport } from '../store.js';
import { fmtTime, fmtDayHeading, fmtShort, fmtDistance, escapeHtml } from '../format.js';

const TILES = [
  {
    href: '#/hold',
    tone: 'green',
    icon: icons.timer,
    title: 'Max hold',
    sub: 'Personal record attempt with contraction markers',
  },
  {
    href: '#/tables?kind=co2',
    tone: 'orange',
    icon: icons.co2,
    title: 'CO₂ table',
    sub: 'Fixed hold, shrinking rest — contraction tolerance',
  },
  {
    href: '#/tables?kind=o2',
    tone: '',
    icon: icons.o2,
    title: 'O₂ table',
    sub: 'Fixed rest, growing hold — hypoxic tolerance',
  },
  {
    href: '#/hold?mode=walk',
    tone: 'green',
    icon: icons.steps,
    title: 'Apnea walk',
    sub: 'Timed hold on the move, with distance and markers',
  },
  {
    href: '#/relax',
    tone: 'purple',
    icon: icons.meditate,
    title: 'Relaxation',
    sub: 'Box breathing, 4-7-8, coherence, long exhale',
  },
];

function typeLabel(s) {
  if (s.type === 'hold') return `Max hold — ${fmtTime(s.hold)}`;
  if (s.type === 'walk') return `Apnea walk — ${fmtDistance(s.distance || 0)}`;
  if (s.type === 'dyn') return `${s.discipline || 'DYN'} — ${fmtDistance(s.distance || 0)}`;
  if (s.type === 'co2') return `CO₂ table — ${s.completedRounds}/${s.rounds.length} rounds`;
  if (s.type === 'o2') return `O₂ table — ${s.completedRounds}/${s.rounds.length} rounds`;
  if (s.type === 'freedive') return `Freedive — ${s.diveCount} dive${s.diveCount === 1 ? '' : 's'}`;
  if (s.type === 'relax') return `${s.patternName || 'Breathing'} — ${fmtShort(s.duration)}`;
  return s.type; // no silent fallthrough: a new type should look wrong, not wrong-but-plausible
}

export function render(root) {
  const sessions = listSessions();
  const pb = personalBest(sessions);
  const recent = sessions.slice(0, 3);

  const week = sessions.filter((s) => Date.now() - new Date(s.date) < 7 * 864e5);
  const weekHold = week.reduce((sum, s) => sum + totalHoldTime(s), 0);

  root.appendChild(el(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Static apnea</div>
        <h1>Train</h1>
      </div>
    </div>`));

  root.appendChild(el(`
    <div class="card">
      <div class="row-between" style="align-items:flex-start">
        <div>
          <div class="eyebrow">Personal best</div>
          <div class="hero-number">${pb ? fmtTime(pb.hold) : '—'}</div>
          <div class="muted">${pb ? `set ${fmtDayHeading(pb.date).toLowerCase()}` : 'No max hold recorded yet'}</div>
        </div>
        <a class="btn btn-sm btn-ghost" href="#/progress">Progress</a>
      </div>
      <div class="stat-grid" style="margin-top:16px">
        <div class="stat">
          <div class="stat-value num">${week.length}</div>
          <div class="stat-label">Sessions 7d</div>
        </div>
        <div class="stat">
          <div class="stat-value num">${fmtTime(weekHold)}</div>
          <div class="stat-label">Hold 7d</div>
        </div>
        <div class="stat">
          <div class="stat-value num">${sessions.length}</div>
          <div class="stat-label">Total</div>
        </div>
      </div>
    </div>`));

  const list = el('<div class="stack" style="margin-top:14px"></div>');
  for (const t of TILES) {
    list.appendChild(el(`
      <a class="tile" href="${t.href}">
        <span class="tile-icon ${t.tone}">${t.icon}</span>
        <span class="grow">
          <span class="tile-title" style="display:block">${t.title}</span>
          <span class="tile-sub">${t.sub}</span>
        </span>
        <span class="tile-chev">${icons.chevron}</span>
      </a>`));
  }
  list.appendChild(el(`
    <a class="tile" href="#/entry">
      <span class="tile-icon">${icons.list}</span>
      <span class="grow">
        <span class="tile-title" style="display:block">Log a session</span>
        <span class="tile-sub">Dynamic, or anything you did away from the app</span>
      </span>
      <span class="tile-chev">${icons.chevron}</span>
    </a>`));
  root.appendChild(list);

  if (backupOverdue(sessions)) {
    const days = daysSinceExport();
    root.appendChild(el(`
      <div class="card" style="margin-top:14px;border-color:rgba(201,133,0,.45)">
        <div class="row-between wrap" style="gap:10px">
          <div class="grow">
            <div class="tile-title">Back up your logbook</div>
            <div class="tiny">${days === null ? 'You have never exported.' : `Last export was ${days} days ago.`} Browsers can evict local storage.</div>
          </div>
          <a class="btn btn-sm" href="#/settings">Export</a>
        </div>
      </div>`));
  }

  if (recent.length) {
    root.appendChild(el(`<div class="day-head">Recent</div>`));
    const card = el('<div class="card stack" style="gap:12px"></div>');
    for (const s of recent) {
      card.appendChild(el(`
        <div class="entry type-${s.type}">
          <div class="tile-title">${escapeHtml(typeLabel(s))}</div>
          <div class="tiny">${fmtDayHeading(s.date)}</div>
        </div>`));
    }
    card.appendChild(el('<a class="btn btn-sm btn-ghost" href="#/history">See all sessions</a>'));
    root.appendChild(card);
  }

  root.appendChild(el(`
    <p class="safety" style="margin-top:20px">
      Never breath-hold in or near water alone — always with a trained buddy watching, hands on.
      Do not hyperventilate before a hold. Dry static only when you feel well.
    </p>`));
}
