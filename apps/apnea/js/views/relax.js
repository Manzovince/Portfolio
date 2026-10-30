// Guided breathing. A pattern is four phase lengths in seconds:
// inhale · hold-in · exhale · hold-out. Zero-length phases are skipped.

import { el, stepper, toast, icons, confirmDialog } from '../ui.js';
import { Ticker, keepAwake, releaseAwake } from '../timer.js';
import { cue, say, buzz, silence, unlockAudio } from '../audio.js';
import { getSettings, saveSettings, saveSession } from '../store.js';
import { fmtTime, fmtShort } from '../format.js';
import { setChrome, go } from '../main.js';

// Coherence is the one preset whose numbers are a dial rather than a recipe:
// the resonant pace is personal, somewhere around 4.5–6.5s a side, and finding
// it is the practice. So it carries a breath length instead of a fixed pattern.
const BREATH_MIN = 3;
const BREATH_MAX = 8;
const BREATH_DEFAULT = 5;

const PRESETS = [
  { id: 'box', name: 'Box breathing', pattern: [4, 4, 4, 4], icon: icons.boxBreath, blurb: 'Equal four counts. Steadies the nervous system before a hold.' },
  { id: '478', name: '4-7-8', pattern: [4, 7, 8, 0], icon: icons.hold478, blurb: 'Long exhale with a held inhale. Strong down-regulation, good before sleep.' },
  { id: 'coherence', name: 'Coherence', paced: true, icon: icons.coherence, blurb: 'Even in, even out, no holds. Tune the pace until your heart rate follows it.' },
  { id: 'exhale', name: 'Long exhale', pattern: [4, 0, 8, 0], icon: icons.longExhale, blurb: 'Exhale twice the inhale. Lowers heart rate fast — the freediver default.' },
];

const PHASES = ['Inhale', 'Hold', 'Exhale', 'Hold'];

/** 5 → "5", 5.5 → "5.5" — a breath length can land on a half second. */
const secs = (n) => String(Number(n.toFixed(1)));

/** Trailing zero phases say nothing: [4,7,8,0] is just 4-7-8. Interior zeros
 *  stay, because "4-0-8" and "4-8-0" are different breaths. */
const patternLabel = (pattern) => {
  const end = pattern.reduce((last, v, i) => (v > 0 ? i : last), 0);
  return pattern.slice(0, end + 1).map(secs).join('-');
};

/** Coherence has no holds, so it is named by its two sides: 5-5, 5.5-5.5. */
const pacedLabel = (breath) => `${secs(breath)}-${secs(breath)}`;

export function render(root) {
  const settings = getSettings();
  let presetId = settings.relaxPreset || 'box';
  let custom = settings.relaxCustom || [4, 4, 4, 4];
  let minutes = settings.relaxMinutes || 5;
  let breath = settings.relaxBreath || BREATH_DEFAULT;

  let ticker = null;
  let alive = true;

  const cleanup = () => {
    alive = false;
    if (ticker) ticker.pause();
    silence();
    releaseAwake();
    setChrome(true);
  };

  const patternOf = (p) => (p.paced ? [breath, 0, breath, 0] : p.pattern.slice());
  const nameOf = (p) => (p.paced ? `${p.name} ${pacedLabel(breath)}` : p.name);

  const activePattern = () => (presetId === 'custom' ? custom.slice() : patternOf(PRESETS.find((p) => p.id === presetId)));
  const activeName = () => (presetId === 'custom' ? 'Custom breathing' : nameOf(PRESETS.find((p) => p.id === presetId)));

  // ------------------------------------------------------------------ setup

  function setupScreen() {
    root.innerHTML = '';
    setChrome(true);

    root.appendChild(el(`
      <div class="page-head">
        <div>
          <div class="eyebrow">Session</div>
          <h1>Relaxation</h1>
        </div>
        <a class="btn btn-sm btn-ghost" href="#/">${icons.back} Back</a>
      </div>`));

    const list = el('<div class="stack"></div>');
    let pacedNumbers = null; // the coherence tile's own numbers, retuned by the stepper below
    for (const p of PRESETS.concat([{ id: 'custom', name: 'Custom', pattern: custom, icon: icons.sliders, blurb: 'Set each phase yourself.' }])) {
      const pattern = p.id === 'custom' ? custom : patternOf(p);
      const active = p.id === presetId;
      const tile = el(`
        <button class="tile" style="${active ? 'border-color:var(--accent)' : ''}">
          <span class="tile-icon ${active ? '' : 'purple'}">${p.icon}</span>
          <span class="grow">
            <span class="tile-title" style="display:block">${p.name} · <span class="num">${p.paced ? pacedLabel(breath) : patternLabel(pattern)}</span></span>
            <span class="tile-sub">${p.blurb}</span>
          </span>
        </button>`);
      tile.addEventListener('click', () => { presetId = p.id; setupScreen(); });
      if (p.paced) pacedNumbers = tile.querySelector('.num');
      list.appendChild(tile);
    }
    root.appendChild(list);

    if (presetId === 'coherence') {
      const card = el('<div class="card stack" style="margin-top:14px"></div>');
      const rate = el('<p class="tiny"></p>');
      const showRate = () => {
        const bpm = 60 / (breath * 2);
        rate.textContent = `${secs(bpm)} breaths a minute. Around 6 is the classic coherence pace, but the one that settles you is the right one — try a range and keep what feels least effortful.`;
        if (pacedNumbers) pacedNumbers.textContent = pacedLabel(breath);
      };
      card.appendChild(stepper({
        label: 'Breath length', value: breath, min: BREATH_MIN, max: BREATH_MAX, step: 0.5,
        format: (v) => `${secs(v)}s in · ${secs(v)}s out`,
        onChange: (v) => { breath = v; showRate(); },
      }));
      card.appendChild(rate);
      root.appendChild(card);
    }

    if (presetId === 'custom') {
      const card = el('<div class="card stack" style="margin-top:14px"></div>');
      ['Inhale', 'Hold after inhale', 'Exhale', 'Hold after exhale'].forEach((label, i) => {
        card.appendChild(stepper({
          label, value: custom[i], min: 0, max: 30, step: 1,
          format: (v) => `${v}s`,
          onChange: (v) => { custom[i] = v; },
        }));
      });
      root.appendChild(card);
    }

    const durCard = el('<div class="card stack" style="margin-top:14px"></div>');
    durCard.appendChild(stepper({
      label: 'Duration', value: minutes, min: 1, max: 30, step: 1,
      format: (v) => `${v} min`,
      onChange: (v) => { minutes = v; },
    }));
    root.appendChild(durCard);

    const start = el('<button class="btn btn-primary btn-lg btn-block" style="margin-top:16px">Start breathing</button>');
    start.addEventListener('click', () => {
      const pattern = activePattern();
      if (pattern.reduce((a, b) => a + b, 0) <= 0) return toast('Set at least one phase above zero.');
      unlockAudio();
      saveSettings({ relaxPreset: presetId, relaxCustom: custom, relaxMinutes: minutes, relaxBreath: breath });
      runScreen(pattern);
    });
    root.appendChild(start);
  }

  // -------------------------------------------------------------------- run

  function runScreen(pattern) {
    root.innerHTML = '';
    setChrome(false);
    keepAwake(getSettings().keepAwake);

    const cycleLen = pattern.reduce((a, b) => a + b, 0);
    const totalTarget = minutes * 60;

    const shell = el(`
      <div class="runner">
        <div class="runner-head">
          <span class="phase-badge phase-prep" data-el="phase">Inhale</span>
          <span class="tiny num" data-el="left">${fmtTime(totalTarget)}</span>
          <button class="btn btn-sm btn-ghost" data-act="stop">Finish</button>
        </div>
        <div class="dial-wrap">
          <div class="breath-stage">
            <div class="breath-orb"></div>
            <div class="breath-readout">
              <div class="orb-count num" data-el="count">0</div>
              <div class="orb-label" data-el="label">Inhale</div>
            </div>
          </div>
        </div>
        <div class="stack">
          <p class="tiny" style="text-align:center" data-el="cycles">Cycle 1 · ${patternLabel(pattern)}</p>
        </div>
      </div>`);
    root.appendChild(shell);

    const orb = shell.querySelector('.breath-orb');
    const phaseBadge = shell.querySelector('[data-el="phase"]');
    const label = shell.querySelector('[data-el="label"]');
    const countEl = shell.querySelector('[data-el="count"]');
    const leftEl = shell.querySelector('[data-el="left"]');
    const cyclesEl = shell.querySelector('[data-el="cycles"]');

    let lastPhase = -1;
    let cycles = 0;

    const finish = () => {
      if (!alive) return;
      const elapsed = ticker ? ticker.stop() : 0;
      releaseAwake();
      cue.done();
      summaryScreen(pattern, Math.round(elapsed), Math.floor(elapsed / cycleLen));
    };

    shell.querySelector('[data-act="stop"]').addEventListener('click', finish);

    say('Breathe with the circle');

    ticker = new Ticker((e) => {
      if (e >= totalTarget) return finish();

      const into = e % cycleLen;
      cycles = Math.floor(e / cycleLen);

      // locate the phase
      let acc = 0;
      let idx = 0;
      for (let i = 0; i < 4; i++) {
        if (pattern[i] <= 0) continue;
        if (into < acc + pattern[i]) { idx = i; break; }
        acc += pattern[i];
        idx = i;
      }
      const within = into - acc;
      const dur = pattern[idx] || 1;
      const t = Math.min(1, within / dur);

      // 0.55 (empty) → 1 (full)
      let scale;
      if (idx === 0) scale = 0.55 + 0.45 * t;
      else if (idx === 1) scale = 1;
      else if (idx === 2) scale = 1 - 0.45 * t;
      else scale = 0.55;
      orb.style.setProperty('--orb-scale', scale.toFixed(3));

      // a 5.5s phase counts 5-4-3-2-1, holding the 5 an extra beat, rather than
      // opening on a 6 that is only ever on screen for half a second
      countEl.textContent = String(Math.min(Math.floor(dur) || 1, Math.ceil(dur - within)));
      leftEl.textContent = fmtTime(totalTarget - e);

      if (idx !== lastPhase) {
        lastPhase = idx;
        const name = PHASES[idx];
        label.textContent = name;
        phaseBadge.textContent = name;
        phaseBadge.className = `phase-badge ${idx === 2 ? 'phase-recover' : idx === 0 ? 'phase-prep' : 'phase-hold'}`;
        cyclesEl.textContent = `Cycle ${cycles + 1} · ${patternLabel(pattern)}`;
        say(name);
        cue.tick();
        buzz(20);
      }
    });
    ticker.start();
  }

  // ---------------------------------------------------------------- summary

  function summaryScreen(pattern, duration, cycles) {
    root.innerHTML = '';
    setChrome(true);

    root.appendChild(el(`
      <div class="page-head">
        <div>
          <div class="eyebrow">Session complete</div>
          <h1>${activeName()}</h1>
        </div>
      </div>`));

    root.appendChild(el(`
      <div class="card">
        <div class="stat-grid">
          <div class="stat"><div class="stat-value num">${fmtShort(duration)}</div><div class="stat-label">Duration</div></div>
          <div class="stat"><div class="stat-value num">${cycles}</div><div class="stat-label">Cycles</div></div>
          <div class="stat"><div class="stat-value num">${presetId === 'coherence' ? pacedLabel(breath) : patternLabel(pattern)}</div><div class="stat-label">Pattern</div></div>
        </div>
      </div>`));

    const actions = el('<div class="stack" style="margin-top:16px"></div>');
    const save = el('<button class="btn btn-primary btn-lg btn-block">Save session</button>');
    save.addEventListener('click', () => {
      saveSession({ type: 'relax', patternName: activeName(), pattern, cycles, duration });
      toast('Session saved');
      go('#/history');
    });
    const discard = el('<button class="btn btn-ghost btn-danger btn-block">Discard</button>');
    discard.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Discard this session?',
        message: `${fmtShort(duration)} of breathing will not be logged.`,
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
