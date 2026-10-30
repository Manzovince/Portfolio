// Max hold — a personal-record attempt with an optional relaxation phase before
// the hold, a recovery phase after it, and contraction markers during it.
//
// #/hold?mode=walk runs the same machine for an apnea walk: identical timing and
// markers, but the summary collects distance and the session saves as 'walk'.

import { el, stepper, dial, toast, icons, confirmDialog, textField } from '../ui.js';
import { Ticker, secondGate, keepAwake, releaseAwake } from '../timer.js';
import { cue, say, buzz, silence, unlockAudio } from '../audio.js';
import { getSettings, saveSettings, saveSession, personalBest } from '../store.js';
import { fmtTime, fmtTimeMs, escapeHtml } from '../format.js';
import { holdTimeline } from '../chart.js';
import { setChrome, go } from '../main.js';

export function render(root) {
  const settings = getSettings();
  const pb = personalBest();
  const isWalk = new URLSearchParams(location.hash.split('?')[1] || '').get('mode') === 'walk';
  const title = isWalk ? 'Apnea walk' : 'Max hold';

  let cfg = {
    prep: isWalk ? (settings.walkPrep ?? 60) : settings.prep,
    recovery: isWalk ? (settings.walkRecovery ?? 60) : settings.recovery,
  };
  let distance = null;
  let steps = null;
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

    root.appendChild(el(`
      <div class="page-head">
        <div>
          <div class="eyebrow">Session</div>
          <h1>${title}</h1>
        </div>
        <a class="btn btn-sm btn-ghost" href="#/">${icons.back} Back</a>
      </div>`));

    const card = el('<div class="card stack"></div>');
    card.appendChild(el(`<p class="muted">${isWalk
      ? 'Breathe up, hold, then start walking. Tap the contraction button each time you feel a spasm; you enter the distance at the end.'
      : 'Relax, hold as long as you can, then recover. Tap the contraction button each time you feel a spasm — the markers land on your timeline.'}</p>`));
    card.appendChild(stepper({
      label: isWalk ? 'Breathe-up before hold' : 'Relaxation before hold',
      value: cfg.prep, min: 0, max: 900, step: 30,
      onChange: (v) => { cfg.prep = v; },
    }));
    card.appendChild(stepper({
      label: 'Recovery after hold',
      value: cfg.recovery, min: 0, max: 900, step: 30,
      onChange: (v) => { cfg.recovery = v; },
    }));
    root.appendChild(card);

    if (pb && !isWalk) {
      root.appendChild(el(`
        <div class="card">
          <div class="row-between">
            <div>
              <div class="eyebrow">Current best</div>
              <div class="stat-value num">${fmtTime(pb.hold)}</div>
            </div>
            <span class="chip">target ring scales to your best</span>
          </div>
        </div>`));
    }

    const start = el('<button class="btn btn-primary btn-lg btn-block" style="margin-top:16px">Start session</button>');
    start.addEventListener('click', () => {
      unlockAudio();
      saveSettings(isWalk
        ? { walkPrep: cfg.prep, walkRecovery: cfg.recovery }
        : { prep: cfg.prep, recovery: cfg.recovery });
      runScreen();
    });
    root.appendChild(start);

    root.appendChild(el(`
      <p class="safety" style="margin-top:18px">${isWalk
        ? 'Walk on flat, open ground away from traffic and water. A blackout while walking means falling — have someone with you.'
        : 'Dry static only, sitting or lying down, never in water without a buddy. Stop at the first sign of dizziness.'}
      </p>`));
  }

  // -------------------------------------------------------------------- run

  function runScreen() {
    root.innerHTML = '';
    setChrome(false);
    keepAwake(getSettings().keepAwake);

    const result = { prep: 0, hold: 0, recovery: 0, contractions: [] };
    let phase = cfg.prep > 0 ? 'prep' : 'hold';

    const shell = el(`
      <div class="runner">
        <div class="runner-head">
          <span class="phase-badge phase-prep">Relax</span>
          <button class="btn btn-sm btn-ghost" data-act="abort">Abort</button>
        </div>
      </div>`);

    const d = dial();
    shell.appendChild(d.node);

    const actions = el('<div class="stack"></div>');
    shell.appendChild(actions);
    root.appendChild(shell);

    const badge = shell.querySelector('.phase-badge');
    const gate = secondGate();

    shell.querySelector('[data-act="abort"]').addEventListener('click', async () => {
      if (result.hold > 0 || phase === 'recover') return finish();
      const ok = await confirmDialog({
        title: 'Abort this session?',
        message: 'Nothing will be saved.',
        confirmLabel: 'Abort',
        cancelLabel: 'Keep going',
        danger: true,
      });
      if (!ok || !alive) return;
      ticker && ticker.pause();
      releaseAwake();
      go('#/');
    });

    // --- phase: relaxation -------------------------------------------------

    function startPrep() {
      phase = 'prep';
      badge.className = 'phase-badge phase-prep';
      badge.textContent = 'Relax';
      actions.innerHTML = '';
      const skip = el('<button class="btn btn-block btn-lg">Start hold now</button>');
      skip.addEventListener('click', () => { result.prep = ticker.elapsed(); startHold(); });
      actions.appendChild(skip);
      actions.appendChild(el('<p class="tiny" style="text-align:center">Slow, low breathing. No hyperventilation.</p>'));

      say('Relax and breathe');
      ticker = new Ticker((e) => {
        const left = cfg.prep - e;
        d.setTime(fmtTime(Math.max(0, Math.ceil(left))));
        d.setArc(e / cfg.prep);
        d.setSub('until hold');
        gate(e, (s) => {
          const remaining = cfg.prep - s;
          if (remaining === 60 || remaining === 30) say(`${remaining} seconds`);
          if (remaining <= 3 && remaining > 0) cue.countdown();
        });
        if (left <= 0) { result.prep = cfg.prep; startHold(); }
      });
      ticker.start();
    }

    // --- phase: hold -------------------------------------------------------

    function startHold() {
      if (!alive) return;
      ticker.pause();
      phase = 'hold';
      badge.className = 'phase-badge phase-hold';
      badge.textContent = 'Hold';
      cue.go();
      buzz([60, 40, 60]);
      say('Hold');

      const reference = isWalk ? 120 : Math.max(60, pb ? pb.hold * 1.15 : 240);

      actions.innerHTML = '';
      const mark = el(`
        <button class="contraction-btn" type="button">
          Contraction
          <span class="cb-count">tap each spasm · 0 marked</span>
        </button>`);
      const count = mark.querySelector('.cb-count');
      mark.addEventListener('click', () => {
        const at = ticker.elapsed();
        result.contractions.push(Number(at.toFixed(1)));
        count.textContent = `tap each spasm · ${result.contractions.length} marked · first at ${fmtTime(result.contractions[0])}`;
        d.setMarkers(result.contractions, reference);
        cue.mark();
        buzz(25);
        mark.classList.add('flash');
        setTimeout(() => mark.classList.remove('flash'), 140);
      });

      const stop = el('<button class="btn btn-lg btn-block">End hold</button>');
      stop.addEventListener('click', () => { result.hold = ticker.stop(); startRecovery(); });

      actions.append(mark, stop);

      const holdGate = secondGate();
      ticker = new Ticker((e) => {
        d.setTime(fmtTimeMs(e));
        d.setArc(e / reference, 'hold');
        d.setSub(isWalk ? 'keep walking' : pb ? `${Math.round((e / pb.hold) * 100)}% of best · ${fmtTime(pb.hold)}` : 'first max hold');
        holdGate(e, (s) => { if (s > 0 && s % 60 === 0) cue.tick(); });
      });
      ticker.start();
      d.setMarkers([], reference);
    }

    // --- phase: recovery ---------------------------------------------------

    function startRecovery() {
      if (!alive) return;
      phase = 'recover';
      badge.className = 'phase-badge phase-recover';
      badge.textContent = 'Recover';
      cue.phase();
      buzz(80);
      say('Breathe. Recovery breathing.');

      if (cfg.recovery <= 0) return finish();

      actions.innerHTML = '';
      const done = el('<button class="btn btn-lg btn-block btn-primary">Finish &amp; review</button>');
      done.addEventListener('click', finish);
      actions.appendChild(el(`<div class="card"><div class="row-between"><span class="muted">Hold</span><strong class="num">${fmtTime(result.hold)}</strong></div><div class="row-between"><span class="muted">Contractions</span><strong class="num">${result.contractions.length}</strong></div></div>`));
      actions.appendChild(done);

      const recGate = secondGate();
      ticker = new Ticker((e) => {
        const left = cfg.recovery - e;
        d.setTime(fmtTime(Math.max(0, Math.ceil(left))));
        d.setArc(e / cfg.recovery, 'recover');
        d.setSub('hook breaths, then calm');
        recGate(e, (s) => {
          const remaining = cfg.recovery - s;
          if (remaining <= 3 && remaining > 0) cue.countdown();
        });
        if (left <= 0) { result.recovery = cfg.recovery; finish(); }
      });
      ticker.start();
      d.setMarkers([], 1);
    }

    function finish() {
      if (!alive) return;
      if (ticker) {
        if (phase === 'recover') result.recovery = Math.min(cfg.recovery, ticker.stop());
        else if (phase === 'hold') result.hold = ticker.stop();
        else ticker.stop();
      }
      releaseAwake();
      cue.done();
      summaryScreen(result);
    }

    if (cfg.prep > 0) startPrep();
    else { ticker = new Ticker(() => {}); ticker.start(); startHold(); }
  }

  // ---------------------------------------------------------------- summary

  function summaryScreen(result) {
    root.innerHTML = '';
    setChrome(true);

    const first = result.contractions[0];
    const fight = first != null ? result.hold - first : null;
    const isPB = !isWalk && (!pb || result.hold > pb.hold);

    root.appendChild(el(`
      <div class="page-head">
        <div>
          <div class="eyebrow">${isPB && result.hold > 0 ? 'New personal best' : 'Session complete'}</div>
          <h1>${title}</h1>
        </div>
      </div>`));

    root.appendChild(el(`
      <div class="card">
        <div class="eyebrow">Hold time</div>
        <div class="hero-number" style="color:var(--series-3)">${fmtTime(result.hold)}</div>
        ${pb && !isPB && !isWalk ? `<div class="muted">${Math.round((result.hold / pb.hold) * 100)}% of your best (${fmtTime(pb.hold)})</div>` : ''}
        <div class="stat-grid" style="margin-top:16px">
          <div class="stat">
            <div class="stat-value num">${result.contractions.length}</div>
            <div class="stat-label">Contractions</div>
          </div>
          <div class="stat">
            <div class="stat-value num">${first != null ? fmtTime(first) : '—'}</div>
            <div class="stat-label">First spasm</div>
          </div>
          <div class="stat">
            <div class="stat-value num">${fight != null ? fmtTime(fight) : '—'}</div>
            <div class="stat-label">Fight phase</div>
          </div>
        </div>
      </div>`));

    if (result.contractions.length) {
      const card = el(`
        <div class="card chart-card">
          <div class="eyebrow" style="margin-bottom:8px">Contraction timeline</div>
        </div>`);
      card.appendChild(holdTimeline({ hold: result.hold, contractions: result.contractions }));
      card.appendChild(el(`<p class="tiny" style="margin-top:6px">Shaded from the first contraction — ${Math.round((fight / result.hold) * 100)}% of this hold was fight phase.</p>`));
      root.appendChild(card);
    }

    if (isWalk) {
      const distCard = el('<div class="card stack"></div>');
      distCard.appendChild(textField({
        label: 'Distance walked',
        hint: 'Metres',
        placeholder: '60',
        inputmode: 'decimal',
        parse: (v) => {
          const n = Number(String(v).replace(',', '.').trim());
          return isFinite(n) && n >= 0 ? n : null;
        },
        onChange: (v) => { distance = v; },
      }));
      distCard.appendChild(textField({
        label: 'Steps',
        hint: 'Optional',
        placeholder: '80',
        inputmode: 'numeric',
        parse: (v) => {
          const n = Number(String(v).trim());
          return isFinite(n) && n >= 0 ? n : null;
        },
        onChange: (v) => { steps = v; },
      }));
      root.appendChild(distCard);
    }

    const noteCard = el(`
      <div class="card field">
        <label for="note">Note</label>
        <textarea id="note" rows="2" placeholder="How did it feel? Conditions, mood, technique…"></textarea>
      </div>`);
    root.appendChild(noteCard);

    const actions = el('<div class="stack" style="margin-top:16px"></div>');
    const save = el('<button class="btn btn-primary btn-lg btn-block">Save session</button>');
    save.addEventListener('click', () => {
      if (isWalk && !distance) return toast('Enter the distance you walked');
      saveSession({
        type: isWalk ? 'walk' : 'hold',
        prep: Math.round(result.prep),
        hold: Number(result.hold.toFixed(1)),
        recovery: Math.round(result.recovery),
        contractions: result.contractions,
        note: noteCard.querySelector('textarea').value.trim(),
        ...(isWalk ? { distance, steps } : {}),
      });
      toast('Session saved');
      go('#/progress');
    });
    const discard = el('<button class="btn btn-ghost btn-danger btn-block">Discard</button>');
    discard.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Discard this session?',
        message: `${fmtTime(result.hold)} hold and ${result.contractions.length} marker${result.contractions.length === 1 ? '' : 's'} will be lost.`,
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
