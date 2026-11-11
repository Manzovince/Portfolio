// Learn › Course: the course map, and the lesson player that runs each step
// (see course.js for the step types). Progress lives in coach.js.
import { h, icon, seg, toast } from './ui.js?v=202611123';
import { S, save } from './store.js?v=202611123';
import { t, spelled, lang, scaleName } from './i18n.js?v=202611123';
import { subscribe } from './notes.js?v=202611123';
import { setOverride, setSide } from './keys.js?v=202611123';
import { drawLessonLine, drawSingleNote, mountStaff } from './score.js?v=202611123';
import { mountFall } from './fall.js?v=202611123';
import { spelledOctave } from './theory.js?v=202611123';
import { setPracticing, setPracticeConfig, practiceState, onPracticeChange, readingRange } from './practice.js?v=202611123';
import {
  openSongData, closeSong, playSong, pauseSong, isSongPlaying, seekSong, setSongPart, setSongSpeed, setSongFollow,
  onSongChange, onSongEnd, songTally, onSongTally, resetTally, songClock, currentSong, isWaitingForPlayer,
} from './song.js?v=202611123';
import * as E from './engine.js?v=202611123';
import {
  P, PASS, LESSONS, COURSE, lessonById, starsOf, isOpen, nextLesson, recordLesson, saveCoach, resetCoach,
  parse, notesOf, lengthOf, pitch, setCoachGuide, demo, clicks, latency, isPlayer, median, audioOf,
} from './coach.js?v=202611123';

// ── text ───────────────────────────────────────────────────────
const tx = v => (v && typeof v === 'object' ? v[lang()] ?? v.en : v ?? '');
function noteText(tok) {
  const { midi, spelling } = pitch(/\d$/.test(tok) ? tok : tok + '4');
  return spelled(spelling) + (/\d$/.test(tok) ? spelledOctave(midi, spelling) : '');
}
const resolve = s => tx(s).replace(/\[([A-G][#b]?-?\d?)\]/g, (_, n) => noteText(n));
// Paragraphs, **bold** and note names
function rich(text, tag = 'div', cls = 'rich') {
  const el = h(tag, { class: cls });
  for (const para of resolve(text).split('\n')) {
    const p = h('p');
    para.split(/\*\*(.+?)\*\*/).forEach((part, i) => p.append(i % 2 ? h('b', {}, part) : part));
    el.append(p);
  }
  return el;
}
const starRow = (n, max = 3, cls = 'stars') => h('span', { class: cls, 'aria-label': t('cStars', { n }) }, ...Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' })));
const midiName = m => { const sp = { letter: [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][m % 12], acc: [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0][m % 12] }; return spelled(sp) + spelledOctave(m, sp); };
const pcName = pc => midiName(60 + pc).replace(/-?\d+$/, '');
const pick = list => list[Math.floor(Math.random() * list.length)];

// ── state ──────────────────────────────────────────────────────
let open = null; // { lesson, step, results: [stars|null], done: bool }

export function renderCoach(view, ctx) {
  if (open) renderLesson(view, ctx);
  else renderMap(view, ctx);
}

// From elsewhere (a song's analysis): open a lesson on the Course tab
export function openLesson(id, ctx) {
  const lesson = lessonById(id);
  if (!lesson) return;
  open = { lesson, step: 0, results: lesson.steps.map(() => undefined), finished: false };
  ctx.go('learn', 'coach');
}

function startLesson(lesson, ctx) {
  open = { lesson, step: 0, results: lesson.steps.map(() => undefined), finished: false };
  ctx.rerender();
}
function leaveLesson(ctx) { open = null; ctx.rerender(); }

// ── map ────────────────────────────────────────────────────────
function renderMap(view, ctx) {
  const total = LESSONS.length;
  const passed = LESSONS.filter(l => starsOf(l.id) >= PASS).length;
  const stars = LESSONS.reduce((s, l) => s + starsOf(l.id), 0);
  const next = nextLesson();
  const hero = h('div', { class: 'card coach-hero' },
    h('div', { class: 'coach-hero-text' },
      h('h3', {}, passed ? t('cContinue') : t('cStart')),
      h('b', { class: 'coach-hero-title' }, resolve(next.title)),
      h('span', { class: 'muted' }, resolve(next.unit.title) + ' · ' + resolve(next.goal))),
    h('button', { type: 'button', class: 'btn', onclick: () => startLesson(next, ctx) }, icon('start'), t(starsOf(next.id) ? 'cRedo' : 'cGo')),
    h('div', { class: 'coach-progress' },
      h('div', { class: 'bar' }, h('i', { style: `width:${(passed / total) * 100}%` })),
      h('small', {}, t('cProgress', { done: passed, total, stars, max: total * 3 }))));

  const units = COURSE.map((u, ui) => h('section', { class: 'coach-unit' },
    h('div', { class: 'coach-unit-head' }, h('span', { class: 'unit-num' }, ui + 1), h('div', {}, h('b', {}, resolve(u.title)), h('small', {}, resolve(u.blurb)))),
    h('ol', { class: 'coach-lessons' }, ...u.lessons.map((l, li) => {
      const lesson = lessonById(l.id);
      const ok = isOpen(l.id);
      const st = starsOf(l.id);
      return h('li', {}, h('button', {
        type: 'button', class: 'coach-lesson' + (ok ? '' : ' locked') + (st >= PASS ? ' passed' : '') + (lesson === next ? ' next' : ''),
        disabled: !ok, onclick: () => startLesson(lesson, ctx),
      },
        h('span', { class: 'lesson-num' }, `${ui + 1}.${li + 1}`),
        h('span', { class: 'lesson-text' }, h('b', {}, resolve(l.title)), h('small', {}, resolve(l.goal))),
        ok ? starRow(st) : h('span', { class: 'lock' }, t('cLocked'))));
    }))));

  const calib = P.calib == null ? t('cCalibNone') : t('cCalibValue', { ms: Math.round(P.calib) });
  const foot = h('div', { class: 'card coach-foot' },
    h('h3', {}, t('cOptions')),
    h('div', { class: 'row' }, h('span', { class: 'lab' }, t('cLatency')), h('span', { class: 'muted' }, calib)),
    h('label', { class: 'row check' }, h('input', { type: 'checkbox', checked: P.unlockAll, onchange: e => { P.unlockAll = e.target.checked; saveCoach(); ctx.rerender(); } }), t('cUnlockAll')),
    h('button', { type: 'button', class: 'btn ghost danger', onclick: e => {
      if (e.currentTarget.dataset.armed) { resetCoach(); toast(t('cResetDone')); ctx.rerender(); }
      else { e.currentTarget.dataset.armed = '1'; e.currentTarget.textContent = t('confirm'); }
    } }, t('cReset')));

  view.append(h('div', { class: 'coach-map' }, h('div', { class: 'coach-side' }, hero, foot), h('div', { class: 'coach-units' }, ...units)));
}

// ── lesson player ──────────────────────────────────────────────
function renderLesson(view, ctx) {
  const { lesson } = open;
  if (open.finished) return renderEnd(view, ctx);
  const step = lesson.steps[open.step];
  const dots = h('div', { class: 'step-dots' }, ...lesson.steps.map((s, i) => h('i', { class: (i < open.step ? 'done' : i === open.step ? 'now' : '') + (open.results[i] === 0 ? ' skipped' : '') })));
  const head = h('div', { class: 'lesson-head' },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('cBackMap'), onclick: () => leaveLesson(ctx) }, icon('close')),
    h('div', { class: 'lesson-title' }, h('small', {}, resolve(lesson.unit.title)), h('b', {}, resolve(lesson.title))),
    dots);
  const body = h('div', { class: 'lesson-body step-' + step.type });
  const cont = h('button', { type: 'button', class: 'btn', disabled: true, onclick: () => advance(ctx) }, t(open.step === lesson.steps.length - 1 ? 'cFinish' : 'cContinueBtn'), icon('next'));
  const skipBtn = h('button', { type: 'button', class: 'btn ghost', onclick: () => { if (open.results[open.step] == null && !['info', 'calibrate'].includes(step.type)) open.results[open.step] = 0; advance(ctx); } }, t('cSkip'));
  const redo = h('button', { type: 'button', class: 'btn ghost', onclick: () => ctx.rerender() }, icon('restart'), h('span', {}, t('cRedoStep')));
  const earned = h('span', { class: 'step-earned' });
  // back to the previous step (its result is kept)
  const back = open.step > 0 ? h('button', { type: 'button', class: 'btn ghost', onclick: () => { open.step--; ctx.rerender(); } }, icon('prev'), h('span', {}, t('cPrevStep'))) : null;
  const footer = h('div', { class: 'lesson-foot' }, back, earned, h('div', { class: 'spacer' }), redo, skipBtn, cont);
  view.append(h('div', { class: 'lesson' }, head, body, footer));

  const cleanups = [];
  const api = {
    body,
    onCleanup: fn => cleanups.push(fn),
    // A step reports its result; the best one counts
    complete(stars = null) {
      const prev = open.results[open.step];
      open.results[open.step] = stars == null ? null : Math.max(prev ?? 0, stars);
      cont.disabled = false;
      skipBtn.hidden = true;
      earned.replaceChildren();
      if (open.results[open.step] != null) earned.append(starRow(open.results[open.step]));
    },
    keys(range) { setOverride(range ? { lo: range.lo, hi: range.hi } : null); },
    focusContinue() { cont.focus(); },
  };
  const prev = open.results[open.step];
  if (prev != null && prev !== undefined && prev > 0) api.complete(prev);
  redo.hidden = ['info', 'quiz'].includes(step.type);
  ctx.onLeave(() => { cleanups.forEach(fn => fn()); setCoachGuide(null); setOverride(null); setSide(null); });
  (RUNNERS[step.type] || runInfo)(step, api, ctx);
  if (step.type === 'info') api.complete(null);
}

function advance(ctx) {
  if (open.step < open.lesson.steps.length - 1) open.step++;
  else open.finished = true;
  ctx.rerender();
}

function renderEnd(view, ctx) {
  const { lesson, results } = open;
  const scored = results.filter(r => r != null);
  const stars = scored.length ? Math.max(scored.some(r => r === 0) ? 0 : 1, Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)) : 3;
  if (!open.recorded) { recordLesson(lesson.id, stars); open.recorded = true; }
  const i = LESSONS.indexOf(lesson);
  const next = LESSONS[i + 1];
  const passed = stars >= PASS;
  view.append(h('div', { class: 'lesson lesson-end' },
    h('div', { class: 'card end-card' },
      starRow(stars, 3, 'stars big'),
      h('h2', {}, passed ? pick(t('cEndGood').split('|')) : t('cEndRetry')),
      h('p', { class: 'muted' }, passed ? (next ? t('cEndNext', { name: resolve(next.title) }) : t('cEndAll')) : t('cEndNeed', { n: PASS })),
      h('div', { class: 'row end-actions' },
        h('button', { type: 'button', class: 'btn ghost', onclick: () => leaveLesson(ctx) }, t('cBackMap')),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => startLesson(lesson, ctx) }, icon('restart'), t('cRedo')),
        passed && next ? h('button', { type: 'button', class: 'btn', onclick: () => startLesson(next, ctx) }, t('cNextLesson'), icon('next')) : null))));
}

// Stars from an error ratio (errors / attempts)
const starsFromErrors = ratio => (ratio <= 0.1 ? 3 : ratio <= 0.3 ? 2 : 1);

// ── info ───────────────────────────────────────────────────────
function runInfo(step, api) {
  const card = h('div', { class: 'card step-card' }, step.title ? h('h2', {}, resolve(step.title)) : null, rich(step.text));
  if (step.line) {
    const line = h('div', { class: 'step-line' + (step.line.rhythm ? ' rhythm' : '') });
    card.append(line);
    requestAnimationFrame(() => drawLessonLine(line, { items: parse(step.line.src), clef: step.line.clef, keySignature: step.line.key, rhythm: step.line.rhythm, timeSignature: step.line.timeSignature }));
  }
  if (step.listen) {
    let d = null;
    card.append(h('button', { type: 'button', class: 'btn ghost listen', onclick: () => { d?.cancel(); d = demo(parse(step.listen), step.bpm || 90); } }, icon('start'), t('cListen')));
    api.onCleanup(() => d?.cancel());
  }
  api.body.append(card);
  const k = step.keys;
  if (k) {
    api.keys(k);
    setCoachGuide(k.midis ? { midis: new Set(k.midis) } : { strong: new Set(k.pcs) });
  } else api.keys(step.range || null);
}

// ── find ───────────────────────────────────────────────────────
function runFind(step, api) {
  const rounds = typeof step.rounds === 'function' ? step.rounds() : step.rounds.map(r => ({ ...r }));
  api.keys(step.range);
  const prompt = rich(step.prompt, 'div', 'rich step-prompt');
  const big = h('div', { class: 'step-big' });
  const fb = h('div', { class: 'step-feedback', 'aria-live': 'polite' });
  const prog = h('div', { class: 'step-progress' });
  const card = h('div', { class: 'card step-card center' }, prompt, big, fb, prog);
  api.body.append(card);
  let i = 0, wrong = 0, missesHere = 0, attempts = 0, found = new Set(), done = false;
  const total = rounds.reduce((s, r) => s + (r.all ? r.all.length : 1), 0);
  const show = () => {
    const r = rounds[i];
    if (!r) return;
    big.textContent = r.all ? `${found.size} / ${r.all.length}` : r.label ? noteText(r.label) : r.pc != null ? pcName(r.pc) : midiName(r.midi);
    prog.textContent = rounds.length > 1 ? t('cRound', { n: i + 1, total: rounds.length }) : '';
    const help = step.hint || missesHere >= 2;
    if (!help) setCoachGuide(r.all ? { midis: found } : null);
    else setCoachGuide(r.all ? { midis: new Set(r.all.filter(m => !found.has(m))) } : r.pc != null ? { strong: new Set([r.pc]) } : { midis: new Set([r.midi]) });
  };
  const flash = (kind, text) => { card.dataset.feedback = kind; fb.textContent = text; };
  const nextRound = () => {
    i++; missesHere = 0; found = new Set();
    if (i >= rounds.length) {
      done = true;
      setCoachGuide(null);
      big.textContent = '✓';
      flash('success', pick(t('drillWell').split('|')));
      return api.complete(starsFromErrors(wrong / Math.max(1, total)));
    }
    setTimeout(() => { if (card.isConnected) { flash('', ''); show(); } }, 450);
  };
  const un = subscribe(e => {
    if (e.type !== 'on' || !isPlayer(e) || done) return;
    const r = rounds[i];
    if (!r) return;
    attempts++;
    if (r.all) {
      if (r.all.includes(e.midi)) {
        if (found.has(e.midi)) return;
        found.add(e.midi);
        flash('', '');
        if (found.size === r.all.length) return (flash('success', pick(t('drillWell').split('|'))), nextRound());
        return show();
      }
      wrong++; missesHere++;
      flash('miss', t('cNotThatOne'));
      return show();
    }
    const ok = r.pc != null ? e.midi % 12 === r.pc : e.midi === r.midi;
    if (ok) { flash('success', pick(t('drillWell').split('|'))); return nextRound(); }
    wrong++; missesHere++;
    if (r.midi != null && e.midi % 12 === r.midi % 12) flash('miss', t(e.midi < r.midi ? 'drillHigherOct' : 'drillLowerOct'));
    else flash('miss', t('drillNotThisNote', { note: pcName(e.midi % 12) }));
    show();
  });
  api.onCleanup(un);
  show();
}

// ── quiz ───────────────────────────────────────────────────────
function runQuiz(step, api) {
  const rounds = step.rounds;
  let i = 0, wrong = 0;
  const card = h('div', { class: 'card step-card center quiz' });
  api.body.append(card);
  api.keys(null);
  const show = () => {
    const r = rounds[i];
    card.replaceChildren();
    card.dataset.feedback = '';
    card.append(h('div', { class: 'step-progress' }, rounds.length > 1 ? t('cRound', { n: i + 1, total: rounds.length }) : ''), rich(r.q, 'div', 'rich step-question'));
    if (r.line) {
      const line = h('div', { class: 'step-line' + (r.line.rhythm ? ' rhythm' : '') });
      card.append(line);
      requestAnimationFrame(() => drawLessonLine(line, { items: parse(r.line.src), clef: r.line.clef, keySignature: r.line.key, rhythm: r.line.rhythm }));
    }
    const fb = h('div', { class: 'step-feedback' });
    let answered = false;
    const opts = h('div', { class: 'quiz-options' }, ...r.options.map((o, k) => h('button', {
      type: 'button', class: 'quiz-option', onclick: e => {
        if (answered) return;
        const btn = e.currentTarget;
        if (k === r.answer) {
          answered = true;
          btn.classList.add('good');
          card.dataset.feedback = 'success';
          fb.replaceChildren(pick(t('drillWell').split('|')), r.explain ? h('span', { class: 'muted' }, ' ' + resolve(r.explain)) : '');
          const last = i === rounds.length - 1;
          if (last) api.complete(wrong === 0 ? 3 : wrong === 1 ? 2 : 1);
          else card.append(h('button', { type: 'button', class: 'btn', onclick: () => { i++; show(); } }, t('cNextQuestion'), icon('next')));
        } else if (!btn.classList.contains('bad')) {
          wrong++;
          btn.classList.add('bad');
          card.dataset.feedback = 'miss';
          fb.textContent = t('cTryAgain');
        }
      },
    }, resolve(o))));
    card.append(opts, fb);
  };
  show();
}

// ── phrase: listen and play back, or read and play ─────────────
function runPhrase(step, api) {
  const rounds = step.rounds.map(src => parse(src));
  api.keys(step.range);
  const prompt = rich(step.prompt, 'div', 'rich step-prompt');
  const line = h('div', { class: 'step-line' });
  const chips = h('div', { class: 'drill-chips' });
  const fb = h('div', { class: 'step-feedback', 'aria-live': 'polite' });
  const prog = h('div', { class: 'step-progress' });
  const listenBtn = step.listen ? h('button', { type: 'button', class: 'btn ghost listen', onclick: () => play() }, icon('start'), t('cListenAgain')) : null;
  const card = h('div', { class: 'card step-card center' }, prog, prompt, step.staff ? line : chips, fb, listenBtn);
  api.body.append(card);
  let i = 0, pos = 0, mistakes = 0, totalNotes = 0, missedHere = false, busy = false, d = null, done = false;
  rounds.forEach(r => (totalNotes += notesOf(r).length));
  const notes = () => notesOf(rounds[i]);
  const states = () => notes().map((_, k) => (k < pos ? 'good' : k === pos ? (missedHere ? 'bad' : 'now') : ''));
  const paint = () => {
    prog.textContent = t('cRound', { n: i + 1, total: rounds.length });
    if (step.staff) drawLessonLine(line, { items: rounds[i], clef: step.clef, keySignature: step.key, states: states() });
    else chips.replaceChildren(...notes().map((n, k) => h('span', { class: 'note-chip ' + (k < pos ? 'good' : k === pos ? 'next' + (missedHere ? ' shake' : '') : '') },
      step.hint === 'keys' || k < pos ? midiName(n.midis[0]).replace(/-?\d+$/, '') : '•')));
    const target = notes()[pos];
    const help = !busy && target && (step.hint === 'keys' || (step.hint === 'miss' && missedHere));
    if (!busy) setCoachGuide(help ? { midis: new Set(target.midis) } : null);
  };
  const play = async () => {
    if (!step.listen) return;
    d?.cancel();
    busy = true; pos = 0; missedHere = false;
    card.dataset.feedback = '';
    fb.textContent = t('cListening');
    paint();
    d = demo(rounds[i], step.bpm || 90);
    const finished = await d;
    if (!card.isConnected || !finished) return;
    busy = false;
    fb.textContent = t('cYourTurn');
    paint();
  };
  const startRound = () => { pos = 0; missedHere = false; card.dataset.feedback = ''; fb.textContent = ''; paint(); if (step.listen) setTimeout(() => card.isConnected && play(), 350); };
  const un = subscribe(e => {
    if (e.type !== 'on' || !isPlayer(e) || busy || done) return;
    const target = notes()[pos];
    if (!target) return;
    if (target.midis.includes(e.midi)) {
      pos++;
      missedHere = false;
      fb.textContent = '';
      card.dataset.feedback = '';
      if (pos >= notes().length) {
        card.dataset.feedback = 'success';
        fb.textContent = pick(t('drillWell').split('|'));
        paint();
        if (i === rounds.length - 1) {
          done = true;
          setCoachGuide(null);
          return api.complete(starsFromErrors(mistakes / Math.max(1, totalNotes)));
        }
        busy = true;
        return setTimeout(() => { if (!card.isConnected) return; busy = false; i++; startRound(); }, 900);
      }
      return paint();
    }
    // a wrong note: once per position counts
    if (!missedHere) mistakes++;
    missedHere = true;
    card.dataset.feedback = 'miss';
    fb.textContent = t('drillNotThisNote', { note: pcName(e.midi % 12) });
    paint();
  });
  api.onCleanup(() => { un(); d?.cancel(); });
  startRound();
}

// ── rhythm ─────────────────────────────────────────────────────
const BAR = 4;
function runRhythm(step, api) {
  const rounds = step.rounds.map(src => parse(src));
  api.keys({ lo: 57, hi: 72 });
  const prompt = rich(step.prompt, 'div', 'rich step-prompt');
  const line = h('div', { class: 'step-line rhythm' });
  const count = h('div', { class: 'count-in' });
  const fb = h('div', { class: 'step-feedback', 'aria-live': 'polite' });
  const prog = h('div', { class: 'step-progress' });
  const go = h('button', { type: 'button', class: 'btn', onclick: () => run() }, icon('start'), t('cStartRhythm'));
  const nextBtn = h('button', { type: 'button', class: 'btn ghost', hidden: true, onclick: () => { i++; show(); } }, t('cNextRhythm'), icon('next'));
  const card = h('div', { class: 'card step-card center' }, prog, prompt, line, count, fb, h('div', { class: 'row center-row' }, go, nextBtn), h('small', { class: 'muted' }, t('cBpm', { bpm: step.bpm })));
  api.body.append(card);
  const best = rounds.map(() => 0);
  let i = 0, running = false, timers = [], taps = [];
  const draw = (states = []) => drawLessonLine(line, { items: rounds[i], rhythm: true, states, timeSignature: [4, 4] });
  const show = () => {
    prog.textContent = t('cRound', { n: i + 1, total: rounds.length });
    fb.textContent = ''; card.dataset.feedback = ''; count.textContent = '';
    nextBtn.hidden = true;
    go.replaceChildren(icon('start'), t('cStartRhythm'));
    draw();
  };
  const stop = () => { timers.forEach(clearTimeout); timers = []; running = false; };
  const run = () => {
    if (running || !E.audio()) return;
    stop();
    running = true;
    taps = [];
    fb.textContent = ''; card.dataset.feedback = '';
    nextBtn.hidden = true;
    const items = rounds[i].filter(x => !x.bar);
    const beats = Math.ceil(lengthOf(items) / BAR) * BAR;
    const { times, beatMs } = clicks({ bpm: step.bpm, count: BAR + beats, beatsPerBar: BAR, startIn: 400 });
    const t0 = times[BAR];
    times.slice(0, BAR).forEach((tp, k) => timers.push(setTimeout(() => (count.textContent = String(k + 1)), tp - performance.now())));
    timers.push(setTimeout(() => (count.textContent = ''), t0 - performance.now()));
    const expected = items.map((it, k) => ({ k, it, at: t0 + it.start * beatMs + latency(), len: it.beats * beatMs })).filter(x => !x.it.rest);
    const end = t0 + beats * beatMs + beatMs * 0.6;
    timers.push(setTimeout(() => { running = false; evaluate(expected, items, beatMs, t0); }, end - performance.now()));
  };
  const evaluate = (expected, items, beatMs, t0) => {
    const window = Math.min(260, beatMs * 0.45);
    const used = new Set();
    let sum = 0, early = [];
    const states = items.map(() => '');
    for (const ex of expected) {
      let bestTap = null;
      taps.forEach((tp, k) => { if (!used.has(k) && Math.abs(tp.t - ex.at) <= window && (!bestTap || Math.abs(tp.t - ex.at) < Math.abs(bestTap.tp.t - ex.at))) bestTap = { tp, k }; });
      if (!bestTap) { states[ex.k] = 'bad'; continue; }
      used.add(bestTap.k);
      const dt = bestTap.tp.t - ex.at;
      early.push(dt);
      // long notes must be held (most of their length)
      const held = ex.it.beats < 2 || (bestTap.tp.off ?? performance.now()) - bestTap.tp.t >= ex.len * 0.6;
      const score = (Math.abs(dt) <= 90 ? 1 : Math.abs(dt) <= 170 ? 0.6 : 0.3) * (held ? 1 : 0.5);
      states[ex.k] = score >= 0.6 ? 'good' : 'bad';
      sum += score;
      if (!held) ex.short = true;
    }
    const extra = taps.filter((tp, k) => !used.has(k) && tp.t > t0 - beatMs / 2).length;
    const pct = Math.max(0, (sum - extra * 0.5) / Math.max(1, expected.length));
    best[i] = Math.max(best[i], pct);
    draw(states.filter((_, k) => !items[k].bar));
    const avg = early.length ? median(early) : 0;
    const msg = [t('cRhythmScore', { pct: Math.round(pct * 100) })];
    if (expected.some(x => x.short)) msg.push(t('cHoldLonger'));
    else if (avg < -45) msg.push(t('cEarly', { ms: Math.round(-avg) }));
    else if (avg > 45) msg.push(t('cLate', { ms: Math.round(avg) }));
    if (extra) msg.push(t('cExtra', { n: extra }));
    fb.textContent = msg.join(' · ');
    card.dataset.feedback = pct >= 0.7 ? 'success' : 'miss';
    go.replaceChildren(icon('restart'), t('cAgain'));
    const last = i === rounds.length - 1;
    if (best[i] >= 0.45) {
      if (!last) nextBtn.hidden = false;
      else if (best.every(b => b >= 0.45)) {
        const mean = best.reduce((a, b) => a + b, 0) / best.length;
        api.complete(mean >= 0.9 ? 3 : mean >= 0.7 ? 2 : 1);
      }
    }
  };
  const un = subscribe(e => {
    if (!running || !isPlayer(e)) return;
    if (e.type === 'on') taps.push({ t: e.time, midi: e.midi, off: null });
    else if (e.type === 'off') { const tp = [...taps].reverse().find(x => x.midi === e.midi && x.off == null); if (tp) tp.off = e.time; }
  });
  api.onCleanup(() => { un(); stop(); });
  show();
}

// ── drill (the Exercises engine) ───────────────────────────────
function runDrill(step, api) {
  setPracticeConfig({ roots: 'naturals', hints: false, ...step.config });
  const prompt = rich(step.prompt, 'div', 'rich step-prompt');
  const symbol = h('div', { class: 'drill-symbol staff-note' });
  const name = h('div', { class: 'drill-name' });
  const fb = h('div', { class: 'step-feedback', 'aria-live': 'polite' });
  const prog = h('div', { class: 'step-progress' });
  const chips = h('div', { class: 'drill-chips' });
  const card = h('div', { class: 'card step-card center' }, prompt, symbol, name, chips, fb, prog);
  api.body.append(card);
  let misses = 0, lastFb = null, done = false;
  const perTarget = step.config.kind === 'scales' ? 15 : 1; // a scale is 15 notes
  const paint = () => {
    const { target, feedback, stats } = practiceState();
    if (!target || !card.isConnected || done) return;
    if (feedback !== lastFb && feedback.kind === 'miss') misses++;
    lastFb = feedback;
    card.dataset.feedback = feedback.kind;
    fb.textContent = feedback.text;
    prog.textContent = `${Math.min(stats.done, step.count)} / ${step.count}`;
    if (target.kind === 'scales') {
      symbol.classList.remove('staff-note');
      symbol.textContent = spelled(target.notes[0].spelling);
      name.textContent = t('drillScaleOf', { name: scaleName(target.type).toLowerCase() });
      const { missedStep } = practiceState();
      chips.replaceChildren(...target.steps.map((st, k) => h('span', { class: 'note-chip ' + (k < target.position ? 'good' : k === target.position ? 'next' + (k === missedStep ? ' shake' : '') : '') },
        k < target.position || step.config.hints ? spelled(st.spelling) : '?')));
    }
    if (target.kind === 'reading') {
      const good = feedback.kind === 'success' ? [0] : [];
      const sig = target.midi + ':' + target.spelling.acc + ':' + target.clef + ':' + stats.done + ':' + good.length;
      if (symbol.dataset.sig !== sig) { symbol.dataset.sig = sig; drawSingleNote(symbol, target, good); }
      name.textContent = feedback.kind === 'success' ? spelled(target.spelling) + spelledOctave(target.midi, target.spelling) : '';
    }
    if (stats.done >= step.count) {
      done = true;
      setPracticing(false);
      fb.textContent = pick(t('drillWell').split('|'));
      card.dataset.feedback = 'success';
      api.complete(starsFromErrors(misses / (step.count * perTarget)));
    }
  };
  const un = onPracticeChange(paint);
  api.onCleanup(() => { un(); setPracticing(false); setPracticeConfig(null); });
  setPracticing(true);
  api.keys(step.config.kind === 'reading' ? readingRange() : step.range || null);
  if (step.config.kind === 'reading' && step.config.reading.clefs?.[0] === 'bass') setSide(() => 1);
  paint();
}

// ── piece ──────────────────────────────────────────────────────
function runPiece(step, api, ctx) {
  const voice = (src, hand) => (src ? notesOf(parse(src)).flatMap(it => it.midis.map(midi => ({ midi, start: it.start, end: it.start + it.beats - 0.06, hand }))) : []);
  const notes = [...voice(step.right, 'right'), ...voice(step.left, 'left')];
  const song = openSongData({ title: tx(step.title), bpm: step.bpm, notes });
  // the hands the step asks for; with two, each hand can be practised alone (no stars)
  const goal = step.part || (step.right && step.left ? 'both' : step.left ? 'left' : 'right');
  let part = goal;
  setSongPart(part);
  const handSeg = goal === 'both' ? seg({ options: [['right', t('partRight')], ['left', t('partLeft')], ['both', t('partBoth')]], get: () => part, set: v => { stopRun(); part = v; setSongPart(v); seekSong(0); hint(); } }) : null;
  let mode = step.mode === 'tempo' ? 'tempo' : 'follow';
  let speed = 1;
  setSongFollow(mode === 'follow');
  setSongSpeed(speed);
  api.keys({ lo: Math.min(song.lo - 2, step.range?.lo ?? 127), hi: Math.max(song.hi + 2, step.range?.hi ?? 0) });
  const hands = new Map(song.notes.map(n => [n.midi, n.hand === 'left' ? 1 : 0]));
  setSide(m => hands.get(m) ?? (m < 60 ? 1 : 0));

  const playBtn = h('button', { type: 'button', class: 'btn transport', onclick: () => (isSongPlaying() || counting ? stopRun() : startRun()) });
  const restart = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('restart'), onclick: () => { stopRun(); seekSong(0); } }, icon('restart'));
  const modeSeg = seg({ options: [['follow', t('cStepByStep')], ['tempo', t('cInTime')]], get: () => mode, set: v => { stopRun(); mode = v; setSongFollow(v === 'follow'); seekSong(0); hint(); } });
  const speedSeg = seg({ options: [[0.5, '50 %'], [0.75, '75 %'], [1, '100 %']], get: () => speed, set: v => { stopRun(); speed = v; setSongSpeed(v); seekSong(0); } });
  const live = h('span', { class: 'piece-live' });
  const result = h('div', { class: 'piece-result', 'aria-live': 'polite' });
  const info = h('div', { class: 'piece-info' }, h('b', {}, tx(step.title)), step.text ? rich(step.text, 'div', 'rich muted') : null);
  const controls = h('div', { class: 'song-bar piece-bar' },
    h('div', { class: 'song-main' }, playBtn, restart, info),
    h('div', { class: 'song-opts' }, handSeg, modeSeg, speedSeg, live),
    result);
  const stage = h('section', { class: 'stage learn-stage' });
  const canvas = h('canvas', { class: 'roll' });
  if (step.staff) {
    const staff = h('div', { class: 'staff-live song-staff' });
    stage.append(staff);
    requestAnimationFrame(() => mountStaff(staff, true));
    api.onCleanup(() => mountStaff(null));
  }
  const countEl = h('div', { class: 'count-in big' });
  stage.append(h('div', { class: 'fall-wrap' }, canvas, countEl));
  api.body.append(controls, stage);
  requestAnimationFrame(() => mountFall(canvas));

  let counting = false, timers = [], clickTimer = 0, run = null;
  const hint = () => { result.textContent = (part !== goal ? t('cHandAlone') + ' ' : '') + (mode === 'follow' ? t('cFollowHint') : t('cTempoHint')); result.dataset.kind = ''; };
  const stopClicks = () => { clearInterval(clickTimer); clickTimer = 0; };
  function stopRun() {
    timers.forEach(clearTimeout); timers = [];
    counting = false; countEl.textContent = '';
    stopClicks();
    run = null;
    pauseSong();
    sync();
  }
  function startRun() {
    if (!E.audio()) return;
    stopRun();
    seekSong(0);
    resetTally();
    if (mode === 'follow') { run = { mode }; playSong(); return sync(); }
    // in time: one bar of count-in, then the clock runs with clicks
    counting = true;
    const bpm = song.bpm * speed;
    const { times, beatMs } = clicks({ bpm, count: BAR, beatsPerBar: BAR, startIn: 350 });
    times.forEach((tp, k) => timers.push(setTimeout(() => (countEl.textContent = String(k + 1)), tp - performance.now())));
    timers.push(setTimeout(() => {
      counting = false; countEl.textContent = '';
      run = { mode, speed, taps: [] };
      playSong();
      const { anchorTime, anchorPosition } = songClock();
      run.expected = song.notes.filter(n => part === 'both' || n.hand === part).map(n => ({ midi: n.midi, at: anchorTime + (n.startMs - anchorPosition) / speed }));
      let k = 0;
      const total = Math.ceil(song.durationMs / (60000 / song.bpm));
      clickTimer = setInterval(() => {
        const now = performance.now();
        while (k <= total && anchorTime + k * beatMs < now + 150) {
          const at = anchorTime + k * beatMs;
          if (at > now - 10) E.click(audioOf(at), k % BAR === 0, 0.55);
          k++;
        }
      }, 40);
      sync();
    }, times[BAR - 1] + beatMs - performance.now()));
    sync();
  }
  function sync() {
    const on = isSongPlaying() || counting;
    playBtn.replaceChildren(icon(on ? 'stop' : 'start'), on ? t('stop') : t('playL'));
    playBtn.classList.toggle('on', on);
  }
  const paintLive = () => {
    const tl = songTally();
    live.textContent = mode === 'follow' && run ? t('cLiveFollow', { hits: tl.hits, wrong: tl.wrong }) : '';
  };
  function finish() {
    if (!run) return;
    const r = run;
    run = null;
    stopClicks();
    let stars, text;
    if (part !== goal) {
      // one hand alone: practice, no stars
      result.textContent = t('cHandDone');
      result.dataset.kind = '';
      return paintLive();
    }
    if (r.mode === 'follow') {
      const tl = songTally();
      const acc = tl.hits / Math.max(1, tl.hits + tl.wrong);
      stars = acc >= 0.9 ? 2 : 1;
      text = t('cFollowDone', { pct: Math.round(acc * 100) }) + (stars === 2 ? ' ' + t('cFollowNext') : ' ' + t('cFollowMore'));
    } else {
      const window = 200;
      const used = new Set();
      let matched = 0;
      const offs = [];
      for (const ex of r.expected) {
        const at = ex.at + latency();
        let best = -1;
        r.taps.forEach((tp, k) => { if (!used.has(k) && tp.midi === ex.midi && Math.abs(tp.t - at) <= window && (best < 0 || Math.abs(tp.t - at) < Math.abs(r.taps[best].t - at))) best = k; });
        if (best >= 0) { used.add(best); matched++; offs.push(r.taps[best].t - at); }
      }
      const extra = r.taps.length - used.size;
      const pct = Math.max(0, (matched - extra * 0.5) / Math.max(1, r.expected.length));
      stars = pct >= 0.9 && r.speed === 1 ? 3 : pct >= 0.75 ? 2 : pct >= 0.4 ? 1 : 0;
      const avg = offs.length ? median(offs) : 0;
      text = t('cTempoDone', { pct: Math.round(pct * 100) });
      if (avg < -45) text += ' · ' + t('cEarly', { ms: Math.round(-avg) });
      else if (avg > 45) text += ' · ' + t('cLate', { ms: Math.round(avg) });
      if (pct >= 0.9 && r.speed < 1) text += ' ' + t('cTempoFaster');
      else if (!stars) text += ' ' + t('cTempoMore');
    }
    result.textContent = text;
    result.dataset.kind = stars >= 2 ? 'success' : 'miss';
    if (stars) api.complete(stars);
    paintLive();
  }
  const unEnd = onSongEnd(() => setTimeout(finish, 0));
  const unTally = onSongTally(paintLive);
  const unNotes = subscribe(e => { if (run?.taps && e.type === 'on' && isPlayer(e)) run.taps.push({ t: e.time, midi: e.midi }); });
  const unChange = onSongChange(() => { if (playBtn.isConnected) sync(); });
  api.onCleanup(() => { unEnd(); unTally(); unNotes(); stopRun(); closeSong(); setSongFollow(true); setSongSpeed(S.song.speed); setSongPart(S.song.part); });
  hint();
  sync();
}

// ── calibrate ──────────────────────────────────────────────────
function runCalibrate(step, api) {
  api.keys({ lo: 57, hi: 72 });
  const text = rich(T('Tape une touche **pile sur chaque clic**, une douzaine de fois. Écoute bien et ne regarde pas l’écran.', 'Tap a key **right on each click**, a dozen times. Listen, and don’t watch the screen.'), 'div', 'rich step-prompt');
  const pulse = h('div', { class: 'pulse-dot' });
  const fb = h('div', { class: 'step-feedback', 'aria-live': 'polite' });
  const go = h('button', { type: 'button', class: 'btn', onclick: () => run() }, icon('start'), t('cStartRhythm'));
  const card = h('div', { class: 'card step-card center' }, h('h2', {}, t('cCalibTitle')), text, pulse, fb, go);
  api.body.append(card);
  let running = false, taps = [], timers = [];
  const run = () => {
    if (running || !E.audio()) return;
    running = true; taps = [];
    fb.textContent = '';
    const { times, beatMs } = clicks({ bpm: 80, count: 14, beatsPerBar: 1, startIn: 400 });
    times.forEach(tp => timers.push(setTimeout(() => { pulse.classList.remove('beat'); void pulse.offsetWidth; pulse.classList.add('beat'); }, tp - performance.now())));
    timers.push(setTimeout(() => {
      running = false;
      const deltas = [];
      for (const tp of taps) {
        const near = times.reduce((b, c) => (Math.abs(c - tp) < Math.abs(b - tp) ? c : b), Infinity);
        if (Math.abs(near - tp) < beatMs * 0.4) deltas.push(tp - near);
      }
      if (deltas.length < 6) { fb.textContent = t('cCalibFew'); card.dataset.feedback = 'miss'; return; }
      const ms = Math.max(-150, Math.min(300, median(deltas.slice(2))));
      P.calib = ms;
      saveCoach();
      card.dataset.feedback = 'success';
      fb.textContent = t('cCalibDone', { ms: Math.round(ms) });
      go.replaceChildren(icon('restart'), t('cAgain'));
      api.complete(null);
    }, times[times.length - 1] + beatMs - performance.now()));
  };
  const un = subscribe(e => { if (running && e.type === 'on' && isPlayer(e)) taps.push(e.time); });
  api.onCleanup(() => { un(); timers.forEach(clearTimeout); });
}
function T(fr, en) { return { fr, en }; }

const RUNNERS = { info: runInfo, find: runFind, quiz: runQuiz, phrase: runPhrase, rhythm: runRhythm, drill: runDrill, piece: runPiece, calibrate: runCalibrate };
