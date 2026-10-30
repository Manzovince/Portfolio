import { el, segmented } from '../ui.js';
import { listSessions, personalBest, totalHoldTime, bestHoldAnywhere, bestDepth } from '../store.js';
import { fmtTime, fmtDate, fmtDistance, fmtDepth, weekStart } from '../format.js';
import { lineChart, barChart, LINEAR_STEPS, PERCENT_STEPS } from '../chart.js';

const RANGES = [
  { value: 30, label: '30 d' },
  { value: 90, label: '3 mo' },
  { value: 365, label: '1 y' },
  { value: 0, label: 'All' },
];

export function render(root) {
  const all = listSessions();
  let range = 90;

  root.appendChild(el(`
    <div class="page-head">
      <div>
        <div class="eyebrow">Evolution</div>
        <h1>Progress</h1>
      </div>
    </div>`));

  if (!all.length) {
    root.appendChild(el(`
      <div class="empty">
        No sessions yet.<br>Run a max hold or a table and your curve starts here.
        <div style="margin-top:14px"><a class="btn btn-primary btn-sm" href="#/">Start training</a></div>
      </div>`));
    return;
  }

  const pb = personalBest(all);
  const best = bestHoldAnywhere(all);
  const depth = bestDepth(all);
  const holds = all.filter((s) => s.type === 'hold');
  const avgContractions = holds.length
    ? holds.reduce((sum, s) => sum + (s.contractions?.length || 0), 0) / holds.length
    : 0;

  root.appendChild(el(`
    <div class="card">
      <div class="eyebrow">Personal best (max hold)</div>
      <div class="hero-number" style="color:var(--series-3)">${pb ? fmtTime(pb.hold) : '—'}</div>
      <div class="muted">${pb ? fmtDate(pb.date) : 'no max hold recorded yet'}</div>
      <div class="stat-grid" style="margin-top:16px">
        <div class="stat"><div class="stat-value num">${fmtTime(best)}</div><div class="stat-label">Best any type</div></div>
        <div class="stat"><div class="stat-value num">${holds.length}</div><div class="stat-label">Attempts</div></div>
        <div class="stat"><div class="stat-value num">${avgContractions ? avgContractions.toFixed(1) : '—'}</div><div class="stat-label">Avg spasms</div></div>
        ${depth ? `<div class="stat"><div class="stat-value num">${fmtDepth(depth.depth)}</div><div class="stat-label">Deepest</div></div>` : ''}
      </div>
    </div>`));

  const filterRow = el('<div style="margin:16px 0 14px"></div>');
  filterRow.appendChild(segmented({
    label: 'Time range',
    value: range,
    options: RANGES.map((r) => ({ value: r.value, label: r.label })),
    onChange: (v) => { range = v; paint(); },
  }));
  root.appendChild(filterRow);

  const charts = el('<div class="stack"></div>');
  root.appendChild(charts);

  function inRange(s) {
    if (!range) return true;
    return Date.now() - new Date(s.date).getTime() <= range * 864e5;
  }

  function paint() {
    charts.innerHTML = '';
    const scoped = all.filter(inRange).slice().reverse(); // oldest first

    // --- 1. max hold progression, with first-contraction onset --------------
    const holdSessions = scoped.filter((s) => s.type === 'hold');
    const card1 = el(`
      <div class="card chart-card">
        <div class="chart-head">
          <h2>Max hold over time</h2>
          <span class="tiny">${holdSessions.length} attempt${holdSessions.length === 1 ? '' : 's'}</span>
        </div>
      </div>`);
    card1.appendChild(lineChart({
      series: [
        {
          name: 'Hold',
          color: 'var(--series-3)',
          points: holdSessions.map((s) => ({ x: new Date(s.date).getTime(), y: s.hold })),
        },
        {
          name: 'First contraction',
          color: 'var(--series-2)',
          points: holdSessions
            .filter((s) => s.contractions?.length)
            .map((s) => ({ x: new Date(s.date).getTime(), y: s.contractions[0] })),
        },
      ],
      height: 200,
    }));
    charts.appendChild(card1);

    // --- 1b. how late the contractions start ------------------------------
    // Raw hold time hides *why* it improved. Onset as a share of the hold
    // separates "contractions started later" from "held on longer once they did".
    // max attempts only — a walk's onset is not comparable to a full static
    const onsetPoints = scoped
      .filter((s) => s.type === 'hold' && s.contractions?.length && s.hold)
      .map((s) => ({ x: new Date(s.date).getTime(), y: (s.contractions[0] / s.hold) * 100 }));

    if (onsetPoints.length > 1) {
      const card = el(`
        <div class="card chart-card">
          <div class="chart-head">
            <h2>Contraction onset</h2>
            <span class="tiny">how far into the hold the first spasm arrives</span>
          </div>
        </div>`);
      card.appendChild(lineChart({
        series: [{ name: 'First contraction', color: 'var(--series-2)', points: onsetPoints }],
        height: 170,
        yFormat: (v) => `${Math.round(v)}%`,
        ySteps: PERCENT_STEPS,
      }));
      card.appendChild(el('<p class="tiny" style="margin-top:6px">Rising means contractions start relatively later — CO₂ tolerance. The remainder is your fight phase.</p>'));
      charts.appendChild(card);
    }

    // --- 2. weekly hold volume --------------------------------------------
    const buckets = new Map();
    for (const s of scoped) {
      const key = weekStart(s.date).getTime();
      buckets.set(key, (buckets.get(key) || 0) + totalHoldTime(s));
    }
    const weeks = [...buckets.entries()].sort((a, b) => a[0] - b[0]).slice(-12);
    const card2 = el(`
      <div class="card chart-card">
        <div class="chart-head">
          <h2>Hold volume per week</h2>
          <span class="tiny">time actually spent apneic</span>
        </div>
      </div>`);
    card2.appendChild(barChart({
      bars: weeks.map(([ts, total]) => ({
        label: new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        value: total,
      })),
      name: 'Hold time',
      color: 'var(--series-1)',
      height: 165,
    }));
    charts.appendChild(card2);

    // --- 3. best hold per table session -----------------------------------
    const tableSessions = scoped.filter((s) => s.rounds?.length);
    if (tableSessions.length) {
      const card3 = el(`
        <div class="card chart-card">
          <div class="chart-head">
            <h2>Table sessions</h2>
            <span class="tiny">longest round in each table</span>
          </div>
        </div>`);
      card3.appendChild(lineChart({
        series: [
          {
            name: 'CO₂ table',
            color: 'var(--series-2)',
            points: tableSessions.filter((s) => s.type === 'co2').map((s) => ({
              x: new Date(s.date).getTime(),
              y: Math.max(...s.rounds.map((r) => r.holdActual || 0)),
            })),
          },
          {
            name: 'O₂ table',
            color: 'var(--series-1)',
            points: tableSessions.filter((s) => s.type === 'o2').map((s) => ({
              x: new Date(s.date).getTime(),
              y: Math.max(...s.rounds.map((r) => r.holdActual || 0)),
            })),
          },
        ],
        height: 180,
      }));
      charts.appendChild(card3);
    }

    // --- 3b. freediving, imported from the watch ---------------------------
    // Kept apart from the max-hold curve on purpose: a wet dive with a depth
    // profile is a different exercise from a dry static, and averaging them
    // together would flatter one and flatten the other.
    const diveSessions = scoped.filter((s) => s.type === 'freedive' && s.dives?.length);
    if (diveSessions.length) {
      const totalDives = diveSessions.reduce((sum, s) => sum + s.dives.length, 0);
      const card = el(`
        <div class="card chart-card">
          <div class="chart-head">
            <h2>Freedive sessions</h2>
            <span class="tiny">${totalDives} dive${totalDives === 1 ? '' : 's'} across ${diveSessions.length} session${diveSessions.length === 1 ? '' : 's'}</span>
          </div>
        </div>`);
      card.appendChild(lineChart({
        series: [
          {
            name: 'Longest dive',
            color: 'var(--series-3)',
            points: diveSessions.map((s) => ({ x: new Date(s.date).getTime(), y: s.bestDive })),
          },
          {
            name: 'Average dive',
            color: 'var(--series-1)',
            points: diveSessions.map((s) => ({
              x: new Date(s.date).getTime(),
              y: s.totalDiveTime / s.dives.length,
            })),
          },
        ],
        height: 190,
      }));
      charts.appendChild(card);

      const depthPoints = diveSessions
        .map((s) => ({ x: new Date(s.date).getTime(), y: s.maxDepth }))
        .filter((p) => p.y);
      if (depthPoints.length) {
        const depthCard = el(`
          <div class="card chart-card">
            <div class="chart-head">
              <h2>Max depth</h2>
              <span class="tiny">deepest dive of each session</span>
            </div>
          </div>`);
        depthCard.appendChild(lineChart({
          series: [{ name: 'Max depth', color: 'var(--series-4)', points: depthPoints }],
          height: 175,
          yFormat: fmtDepth,
          ySteps: LINEAR_STEPS,
        }));
        charts.appendChild(depthCard);
      }
    }

    // --- 3c. distance work -------------------------------------------------
    const distanceOf = (pred) => scoped.filter(pred).map((s) => ({ x: new Date(s.date).getTime(), y: s.distance }));
    const distanceSeries = [
      { name: 'DYN', color: 'var(--series-1)', points: distanceOf((s) => s.type === 'dyn' && s.discipline === 'DYN' && s.distance) },
      { name: 'DNF', color: 'var(--series-2)', points: distanceOf((s) => s.type === 'dyn' && s.discipline === 'DNF' && s.distance) },
      { name: 'DYNB', color: 'var(--series-3)', points: distanceOf((s) => s.type === 'dyn' && s.discipline === 'DYNB' && s.distance) },
      { name: 'Apnea walk', color: 'var(--series-4)', points: distanceOf((s) => s.type === 'walk' && s.distance) },
    ];

    if (distanceSeries.some((s) => s.points.length)) {
      const card = el(`
        <div class="card chart-card">
          <div class="chart-head">
            <h2>Distance</h2>
            <span class="tiny">dynamic apnea and apnea walks</span>
          </div>
        </div>`);
      card.appendChild(lineChart({
        series: distanceSeries,
        height: 190,
        yFormat: fmtDistance,
        ySteps: LINEAR_STEPS,
      }));
      charts.appendChild(card);
    }

    // --- 4. relaxation practice -------------------------------------------
    const relaxSessions = scoped.filter((s) => s.type === 'relax');
    if (relaxSessions.length) {
      const relaxBuckets = new Map();
      for (const s of relaxSessions) {
        const key = weekStart(s.date).getTime();
        relaxBuckets.set(key, (relaxBuckets.get(key) || 0) + (s.duration || 0));
      }
      const rows = [...relaxBuckets.entries()].sort((a, b) => a[0] - b[0]).slice(-12);
      const card4 = el(`
        <div class="card chart-card">
          <div class="chart-head">
            <h2>Breathing practice per week</h2>
            <span class="tiny">${relaxSessions.length} session${relaxSessions.length === 1 ? '' : 's'}</span>
          </div>
        </div>`);
      card4.appendChild(barChart({
        bars: rows.map(([ts, total]) => ({
          label: new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
          value: total,
        })),
        name: 'Breathing time',
        color: 'var(--relax)',
        height: 150,
      }));
      charts.appendChild(card4);
    }
  }

  paint();
}
