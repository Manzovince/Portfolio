// CO2 and O2 tables.
//
//   CO2 — hold length fixed, rest shrinks each round (contraction tolerance)
//   O2  — rest fixed, hold grows each round (hypoxic tolerance)
//
// A round is { rest, hold } and always runs rest first, so the opening rest
// doubles as the breathe-up.

import { el, stepper, segmented, dial, toast, icons, confirmDialog } from '../ui.js';
import { Ticker, secondGate, keepAwake, releaseAwake } from '../timer.js';
import { cue, say, buzz, silence, unlockAudio } from '../audio.js';
import { getSettings, saveSettings, saveSession, personalBest } from '../store.js';
import { fmtTime } from '../format.js';
import { setChrome, go } from '../main.js';

const DEFAULTS = {
  co2: { rounds: 8, hold: 60, restStart: 120, restStep: 15, restMin: 15 },
  o2: { rounds: 8, rest: 120, holdStart: 60, holdStep: 15 },
};

function buildRounds(kind, c) {
  const out = [];
  for (let i = 0; i < c.rounds; i++) {
    if (kind === 'co2') {
      out.push({ rest: Math.max(c.restMin, c.restStart - i * c.restStep), hold: c.hold });
    } else {
      out.push({ rest: c.rest, hold: c.holdStart + i * c.holdStep });
    }
  }
  return out;
}

export function render(root) {
  const query = new URLSearchParams(location.hash.split('?')[1] || '');
  const pb = personalBest();
  const settings = getSettings();

  let kind = query.get('kind') === 'o2' ? 'o2' : 'co2';
  const cfgs = {
    co2: { ...DEFAULTS.co2, ...(settings.co2 || {}) },
    o2: { ...DEFAULTS.o2, ...(settings.o2 || {}) },
  };

  let ticker = null;
  let alive = true;

  const cleanup = () => {
    alive = false;
    if (ticker) ticker.pause();
    silence();
    releaseAwake();
    setChrome(true);
  };

  // ------------------------------------------------------------------ setup

  function setupScreen() {
    root.innerHTML = '';
    setChrome(true);
    const cfg = cfgs[kind];

    root.appendChild(el(`
      <div class="page-head">
        <div>
          <div class="eyebrow">Session</div>
          <h1>Tables</h1>
        </div>
        <a class="btn btn-sm btn-ghost" href="#/">${icons.back} Back</a>
      </div>`));

    root.appendChild(segmented({
      label: 'Table type',
      value: kind,
      options: [{ value: 'co2', label: 'CO₂ table' }, { value: 'o2', label: 'O₂ table' }],
      onChange: (v) => { kind = v; setupScreen(); },
    }));

    // built first: the steppers below fire their onChange during construction
    const preview = el('<div class="card" style="margin-top:14px"></div>');

    const explain = kind === 'co2'
      ? 'Same hold every round, less and less recovery. Trains tolerance to the urge to breathe — expect contractions, that is the point.'
      : 'Same recovery every round, longer and longer holds. Trains tolerance to low oxygen — run it fresh, not after a CO₂ table.';

    const card = el('<div class="card stack" style="margin-top:14px"></div>');
    card.appendChild(el(`<p class="muted">${explain}</p>`));

    if (kind === 'co2') {
      card.appendChild(stepper({ label: 'Hold (every round)', value: cfg.hold, min: 15, max: 600, step: 15, onChange: (v) => { cfg.hold = v; refresh(); } }));
      card.appendChild(stepper({ label: 'First rest', value: cfg.restStart, min: 30, max: 600, step: 15, onChange: (v) => { cfg.restStart = v; refresh(); } }));
      card.appendChild(stepper({ label: 'Rest reduction per round', value: cfg.restStep, min: 5, max: 60, step: 5, onChange: (v) => { cfg.restStep = v; refresh(); } }));
    } else {
      card.appendChild(stepper({ label: 'First hold', value: cfg.holdStart, min: 15, max: 600, step: 15, onChange: (v) => { cfg.holdStart = v; refresh(); } }));
      card.appendChild(stepper({ label: 'Hold increase per round', value: cfg.holdStep, min: 5, max: 60, step: 5, onChange: (v) => { cfg.holdStep = v; refresh(); } }));
      card.appendChild(stepper({ label: 'Rest (every round)', value: cfg.rest, min: 30, max: 600, step: 15, onChange: (v) => { cfg.rest = v; refresh(); } }));
    }
    card.appendChild(stepper({
      label: 'Rounds', value: cfg.rounds, min: 3, max: 12, step: 1,
      format: (v) => `${v} rounds`, onChange: (v) => { cfg.rounds = v; refresh(); },
    }));

    if (pb) {
      const suggest = el('<button class="btn btn-sm btn-ghost">Suggest from my best hold</button>');
      suggest.addEventListener('click', () => {
        const round15 = (v) => Math.max(15, Math.round(v / 15) * 15);
        if (kind === 'co2') cfgs.co2.hold = round15(pb.hold * 0.5);
        else cfgs.o2.holdStart = round15(pb.hold * 0.4);
        setupScreen();
      });
      card.appendChild(suggest);
    }
    root.appendChild(card);
    root.appendChild(preview);

    function refresh() {
      const rounds = buildRounds(kind, cfg);
      const total = rounds.reduce((s, r) => s + r.rest + r.hold, 0);
      const holdTotal = rounds.reduce((s, r) => s + r.hold, 0);
      preview.innerHTML = `
        <div class="row-between" style="margin-bottom:10px">
          <span class="eyebrow">Plan</span>
          <span class="tiny num">${fmtTime(total)} total · ${fmtTime(holdTotal)} holding</span>
        </div>
        <table class="rounds">
          <thead><tr><th>#</th><th>Breathe</th><th>Hold</th></tr></thead>
          <tbody>
            ${rounds.map((r, i) => `<tr><td class="n">${i + 1}</td><td>${fmtTime(r.rest)}</td><td>${fmtTime(r.hold)}</td></tr>`).join('')}
          </tbody>
        </table>`;
    }
    refresh();

    const start = el('<button class="btn btn-primary btn-lg btn-block" style="margin-top:16px">Start table</button>');
    start.addEventListener('click', () => {
      unlockAudio();
      saveSettings({ [kind]: cfg });
      runScreen(buildRounds(kind, cfg), { ...cfg });
    });
    root.appendChild(start);
  }

  // -------------------------------------------------------------------- run

  function runScreen(plan, config) {
    root.innerHTML = '';
    setChrome(false);
    keepAwake(getSettings().keepAwake);

    const results = plan.map((r) => ({ ...r, holdActual: 0, restActual: 0, contractions: [] }));
    let index = 0;
    let phase = 'rest';

    const shell = el(`
      <div class="runner">
        <div class="runner-head">
          <span class="phase-badge phase-prep">Breathe</span>
          <span class="tiny num" data-el="round">Round 1 / ${plan.length}</span>
          <button class="btn btn-sm btn-ghost" data-act="stop">Stop</button>
        </div>
      </div>`);
    const d = dial();
    shell.appendChild(d.node);
    const actions = el('<div class="stack"></div>');
    shell.appendChild(actions);
    const strip = el('<div class="chips" style="justify-content:center"></div>');
    shell.appendChild(strip);
    root.appendChild(shell);

    const badge = shell.querySelector('.phase-badge');
    const roundLabel = shell.querySelector('[data-el="round"]');

    shell.querySelector('[data-act="stop"]').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'End the table here?',
        message: 'Rounds you already completed will be kept.',
        confirmLabel: 'End table',
        cancelLabel: 'Keep going',
      });
      if (ok && alive) endSession();
    });

    function paintStrip() {
      strip.innerHTML = results.map((r, i) => {
        const state = i < index ? 'chip' : i === index ? 'chip accent' : 'chip';
        const style = i > index ? ' style="opacity:.45"' : '';
        return `<span class="${state}"${style}>${i + 1}</span>`;
      }).join('');
    }

    function startRest() {
      if (!alive) return;
      phase = 'rest';
      const target = results[index].rest;
      badge.className = 'phase-badge phase-prep';
      badge.textContent = 'Breathe';
      roundLabel.textContent = `Round ${index + 1} / ${plan.length}`;
      paintStrip();
      say(index === 0 ? 'Breathe up' : 'Breathe');
      cue.phase();

      actions.innerHTML = '';
      const skip = el('<button class="btn btn-block">Start hold now</button>');
      skip.addEventListener('click', () => { results[index].restActual = ticker.elapsed(); startHold(); });
      actions.appendChild(skip);
      actions.appendChild(el(`<p class="tiny" style="text-align:center">Next hold ${fmtTime(results[index].hold)}</p>`));

      const gate = secondGate();
      ticker = new Ticker((e) => {
        const left = target - e;
        d.setTime(fmtTime(Math.max(0, Math.ceil(left))));
        d.setArc(e / target);
        d.setSub('breathe · relax');
        gate(e, (s) => {
          const remaining = target - s;
          if (remaining === 30 || remaining === 10) say(`${remaining} seconds`);
          if (remaining <= 3 && remaining > 0) cue.countdown();
        });
        if (left <= 0) { results[index].restActual = target; startHold(); }
      });
      ticker.start();
      d.setMarkers([], 1);
    }

    function startHold() {
      if (!alive) return;
      ticker.pause();
      phase = 'hold';
      const target = results[index].hold;
      badge.className = 'phase-badge phase-hold';
      badge.textContent = 'Hold';
      cue.go();
      buzz([60, 40, 60]);
      say('Hold');

      const marks = results[index].contractions;
      actions.innerHTML = '';
      const mark = el(`
        <button class="contraction-btn" type="button">
          Contraction
          <span class="cb-count">tap each spasm · 0 marked</span>
        </button>`);
      const count = mark.querySelector('.cb-count');
      mark.addEventListener('click', () => {
        marks.push(Number(ticker.elapsed().toFixed(1)));
        count.textContent = `tap each spasm · ${marks.length} marked · first at ${fmtTime(marks[0])}`;
        d.setMarkers(marks, target);
        cue.mark();
        buzz(25);
        mark.classList.add('flash');
        setTimeout(() => mark.classList.remove('flash'), 140);
      });
      const early = el('<button class="btn btn-block">End hold early</button>');
      early.addEventListener('click', () => { results[index].holdActual = ticker.stop(); nextRound(); });
      actions.append(mark, early);

      const gate = secondGate();
      ticker = new Ticker((e) => {
        const left = target - e;
        d.setTime(fmtTime(Math.max(0, Math.ceil(left))));
        d.setArc(e / target, 'hold');
        d.setSub(`hold ${fmtTime(target)}`);
        gate(e, (s) => {
          const remaining = target - s;
          if (remaining <= 3 && remaining > 0) cue.countdown();
        });
        if (left <= 0) { results[index].holdActual = target; nextRound(); }
      });
      ticker.start();
      d.setMarkers(marks, target);
    }

    function nextRound() {
      if (!alive) return;
      ticker.pause();
      buzz(80);
      index += 1;
      if (index >= results.length) return endSession();
      startRest();
    }

    function endSession() {
      if (!alive) return;
      if (ticker) ticker.pause();
      releaseAwake();
      cue.done();
      const completed = results.filter((r) => r.holdActual > 0).length;
      summaryScreen(results.slice(0, Math.max(completed, index)), completed, config);
    }

    startRest();
  }

  // ---------------------------------------------------------------- summary

  function summaryScreen(rounds, completed, config) {
    root.innerHTML = '';
    setChrome(true);

    const totalHold = rounds.reduce((s, r) => s + r.holdActual, 0);
    const contractions = rounds.reduce((s, r) => s + r.contractions.length, 0);
    const label = kind === 'co2' ? 'CO₂ table' : 'O₂ table';

    root.appendChild(el(`
      <div class="page-head">
        <div>
          <div class="eyebrow">Session complete</div>
          <h1>${label}</h1>
        </div>
      </div>`));

    root.appendChild(el(`
      <div class="card">
        <div class="stat-grid">
          <div class="stat"><div class="stat-value num">${completed}/${config.rounds}</div><div class="stat-label">Rounds</div></div>
          <div class="stat"><div class="stat-value num">${fmtTime(totalHold)}</div><div class="stat-label">Total hold</div></div>
          <div class="stat"><div class="stat-value num">${contractions}</div><div class="stat-label">Contractions</div></div>
        </div>
        <table class="rounds" style="margin-top:14px">
          <thead><tr><th>#</th><th>Breathe</th><th>Hold</th><th>Spasms</th></tr></thead>
          <tbody>
            ${rounds.map((r, i) => `
              <tr class="${r.holdActual >= r.hold ? 'done' : ''}">
                <td class="n">${i + 1}</td>
                <td>${fmtTime(r.rest)}</td>
                <td>${fmtTime(r.holdActual)}${r.holdActual < r.hold ? ` <span class="tiny">/ ${fmtTime(r.hold)}</span>` : ''}</td>
                <td>${r.contractions.length || '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`));

    const noteCard = el(`
      <div class="card field" style="margin-top:14px">
        <label for="note">Note</label>
        <textarea id="note" rows="2" placeholder="How hard was it? Where did contractions start?"></textarea>
      </div>`);
    root.appendChild(noteCard);

    const actions = el('<div class="stack" style="margin-top:16px"></div>');
    const save = el('<button class="btn btn-primary btn-lg btn-block">Save session</button>');
    save.addEventListener('click', () => {
      if (!rounds.length) { go('#/'); return; }
      saveSession({
        type: kind,
        config,
        rounds: rounds.map((r) => ({
          rest: r.rest,
          hold: r.hold,
          holdActual: Number(r.holdActual.toFixed(1)),
          contractions: r.contractions,
        })),
        completedRounds: completed,
        note: noteCard.querySelector('textarea').value.trim(),
      });
      toast('Session saved');
      go('#/progress');
    });
    const discard = el('<button class="btn btn-ghost btn-danger btn-block">Discard</button>');
    discard.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Discard this session?',
        message: `${completed} completed round${completed === 1 ? '' : 's'} will be lost.`,
        confirmLabel: 'Discard',
        cancelLabel: 'Keep',
        danger: true,
      });
      if (ok) go('#/');
    });
    actions.append(save, discard);
    root.appendChild(actions);
  }

  setupScreen();
  return cleanup;
}
