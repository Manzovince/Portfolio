// Learn › Course: the course map, and the lesson player that runs each step
// (see course.js for the step types). Progress lives in coach.js.
import { h, icon, seg, toast } from './ui.js?v=202611133';
import { S, save } from './store.js?v=202611133';
import { t, spelled, lang, scaleName } from './i18n.js?v=202611133';
import { subscribe, soundingNotes, setPedal } from './notes.js?v=202611133';
import { setOverride, setSide } from './keys.js?v=202611133';
import { drawLessonLine, drawSingleNote, mountStaff } from './score.js?v=202611133';
import { mountFall } from './fall.js?v=202611133';
import { spelledOctave } from './theory.js?v=202611133';
import { setPracticing, setPracticeConfig, practiceState, onPracticeChange, readingRange } from './practice.js?v=202611133';
import {
  openSongData, closeSong, playSong, pauseSong, isSongPlaying, seekSong, setSongPart, setSongSpeed, setSongFollow,
  onSongChange, onSongEnd, songTally, onSongTally, resetTally, songClock, currentSong, isWaitingForPlayer,
} from './song.js?v=202611133';
import * as E from './engine.js?v=202611133';
import {
  P, PASS, LESSONS, COURSE, TRACKS, lessonsOf, lessonById, starsOf, isOpen, nextLesson, recordLesson, saveCoach, resetCoach,
  parse, notesOf, lengthOf, pitch, setCoachGuide, demo, hear, clicks, latency, isPlayer, median, audioOf,
} from './coach.js?v=202611133';

import { startLab, endLab, labOn, labPatch, labState, setLabFx, setLabArp, setLabSeq, setLabPatch, labChanged, keepLab, playWith, labViews, controlEl, readKey, shown } from './lab.js?v=202611133';
import { envCanvas, mountArp, mountSeq } from './create.js?v=202611133';
import { createGraph } from './graph.js?v=202611133';
import { clonePatch } from './dx7.js?v=202611133';
import { applyPart } from './perform.js?v=202611133';
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

export function renderCoach(view, ctx, bar = null) {
  if (open) renderLesson(view, ctx, bar);
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
  open = { lesson, step: 0, results: lesson.steps.map(() => undefined), finished: false, labPatch: lesson.lab ? lesson.lab() : null };
  ctx.rerender();
}
function leaveLesson(ctx) { open = null; ctx.rerender(); }

// A sound lesson plays the workshop sound while it is on screen; leaving the
// screen (or the lesson) gives the player their own sound back.
function useLab(ctx) {
  if (!open?.lesson.lab) return;
  startLab(open.labPatch, open.labState);
  ctx.onLeave(() => { if (labOn()) { if (open) { open.labPatch = clonePatch(labPatch()); open.labState = labState(); } endLab(); } });
}

// ── map ────────────────────────────────────────────────────────
function renderMap(view, ctx) {
  const track = TRACKS[P.track] ? P.track : 'piano';
  const list = lessonsOf(track);
  const total = list.length;
  const passed = list.filter(l => starsOf(l.id) >= PASS).length;
  const stars = list.reduce((s, l) => s + starsOf(l.id), 0);
  const next = nextLesson(track);
  const trackSeg = seg({ cls: 'big-seg track-seg', options: [['piano', t('trackPiano')], ['sound', t('trackSound')]], get: () => track, set: v => { P.track = v; saveCoach(); ctx.rerender(); } });
  const hero = h('div', { class: 'card coach-hero' },
    h('div', { class: 'coach-hero-text' },
      h('h3', {}, passed ? t('cContinue') : t('cStart')),
      h('b', { class: 'coach-hero-title' }, resolve(next.title)),
      h('span', { class: 'muted' }, resolve(next.unit.title) + ' · ' + resolve(next.goal))),
    h('button', { type: 'button', class: 'btn', onclick: () => startLesson(next, ctx) }, icon('start'), t(starsOf(next.id) ? 'cRedo' : 'cGo')),
    h('div', { class: 'coach-progress' },
      h('div', { class: 'bar' }, h('i', { style: `width:${(passed / total) * 100}%` })),
      h('small', {}, t('cProgress', { done: passed, total, stars, max: total * 3 }))));

  const units = TRACKS[track].map((u, ui) => h('section', { class: 'coach-unit' },
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

  view.append(h('div', { class: 'coach-map' }, h('div', { class: 'coach-side' }, trackSeg, hero, foot), h('div', { class: 'coach-units' }, ...units)));
}

// ── lesson player ──────────────────────────────────────────────
function renderLesson(view, ctx, bar = null) {
  const { lesson } = open;
  useLab(ctx);
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
  // the lesson's title sits in the Learn tab bar, next to the tabs
  if (bar) bar.append(head);
  view.append(h('div', { class: 'lesson' + (bar ? ' head-in-bar' : '') }, bar ? null : head, body, footer));

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
  const list = lessonsOf(lesson.track);
  const next = list[list.indexOf(lesson) + 1];
  const passed = stars >= PASS;
  // a sound lesson ends with its sound, to keep or to open in Create
  const keepRow = lesson.lab ? h('div', { class: 'row end-actions' },
    h('button', { type: 'button', class: 'btn ghost', onclick: e => {
      const k = keepLab(open.keptName || lesson.keep || 'Atelier');
      if (!k) return toast(t('storageFull'));
      open.kept = k; e.currentTarget.disabled = true; toast(t('labKept', { name: k.patch.name }));
    } }, icon('download'), t('labKeep')),
    h('button', { type: 'button', class: 'btn ghost', onclick: () => openInCreate(ctx) }, icon('create'), t('labOpen'))) : null;
  view.append(h('div', { class: 'lesson lesson-end' },
    h('div', { class: 'card end-card' },
      starRow(stars, 3, 'stars big'),
      h('h2', {}, passed ? pick(t('cEndGood').split('|')) : t('cEndRetry')),
      h('p', { class: 'muted' }, passed ? (next ? t('cEndNext', { name: resolve(next.title) }) : t('cEndAll')) : t('cEndNeed', { n: PASS })),
      h('div', { class: 'row end-actions' },
        h('button', { type: 'button', class: 'btn ghost', onclick: () => leaveLesson(ctx) }, t('cBackMap')),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => startLesson(lesson, ctx) }, icon('restart'), t('cRedo')),
        passed && next ? h('button', { type: 'button', class: 'btn', onclick: () => startLesson(next, ctx) }, t('cNextLesson'), icon('next')) : null),
      keepRow)));
}

// Keep the workshop sound (once) and edit it on the Create screen, on part A
function openInCreate(ctx) {
  const k = open.kept || keepLab(open.lesson.keep || 'Atelier');
  if (!k) return toast(t('storageFull'));
  endLab();
  S.parts[0] = { kind: 'fm', ref: { bank: 'mine', i: k.i }, patch: clonePatch(k.patch), dirty: false, macros: { bright: 0, attack: 0, release: 0, vibrato: 0 }, volume: 0.8, octave: 0 };
  applyPart(0);
  S.edit = 0;
  open = null;
  save();
  ctx.go('create', 'edit');
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
  const rounds = typeof step.rounds === 'function' ? step.rounds() : step.rounds;
  let d = null;
  api.onCleanup(() => d?.cancel());
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
    // a sound lesson's round: sound A, then sound B, played on the workshop part
    if (r.sounds) {
      let token = 0;
      const one = async (k, me) => {
        if (me !== token) return;
        abBtns.forEach((b, j) => b.classList.toggle('on', j === k));
        await playWith(r.sounds[k], () => demo(parse(r.plays?.[k] || r.play || 'C4h'), r.bpm || 90, { light: false }));
      };
      const both = async () => { const me = ++token; await one(0, me); await new Promise(res => setTimeout(res, 250)); await one(1, me); if (me === token) abBtns.forEach(b => b.classList.remove('on')); };
      const abBtns = ['A', 'B'].map((x, k) => h('button', { type: 'button', class: 'btn ghost ab', onclick: async () => { const me = ++token; await one(k, me); abBtns[k].classList.remove('on'); } }, icon('start'), x));
      card.append(h('div', { class: 'row center-row' }, h('button', { type: 'button', class: 'btn ghost listen', onclick: both }, icon('start'), t('labBoth')), ...abBtns));
      setTimeout(() => card.isConnected && rounds[i] === r && both(), 300);
    }
    // a round can be heard (r.play), never seen
    if (r.play && !r.sounds) {
      const play = () => { d?.cancel(); d = hear(parse(r.play), r.bpm || step.bpm || 80); };
      card.append(h('button', { type: 'button', class: 'btn ghost listen', onclick: play }, icon('start'), t('cListenAgain')));
      setTimeout(() => card.isConnected && rounds[i] === r && play(), 300);
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
  const rounds = (typeof step.rounds === 'function' ? step.rounds() : step.rounds).map(src => parse(src));
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
  const got = new Set(); // keys of the current chord already down
  rounds.forEach(r => (totalNotes += notesOf(r).length));
  const notes = () => notesOf(rounds[i]);
  const states = () => notes().map((_, k) => (k < pos ? 'good' : k === pos ? (missedHere ? 'bad' : 'now') : ''));
  const paint = () => {
    prog.textContent = t('cRound', { n: i + 1, total: rounds.length });
    if (step.staff) drawLessonLine(line, { items: rounds[i], clef: step.clef, keySignature: step.key, states: states() });
    else chips.replaceChildren(...notes().map((n, k) => h('span', { class: 'note-chip ' + (k < pos ? 'good' : k === pos ? 'next' + (missedHere ? ' shake' : '') : '') },
      step.hint === 'keys' || k < pos ? n.midis.map(m => midiName(m).replace(/-?\d+$/, '')).join(' ') : '•')));
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
    d = step.blind ? hear(rounds[i], step.bpm || 90) : demo(rounds[i], step.bpm || 90);
    const finished = await d;
    if (!card.isConnected || !finished) return;
    busy = false;
    fb.textContent = t('cYourTurn');
    paint();
  };
  const startRound = () => { pos = 0; missedHere = false; got.clear(); card.dataset.feedback = ''; fb.textContent = ''; paint(); if (step.listen) setTimeout(() => card.isConnected && play(), 350); };
  const un = subscribe(e => {
    if (e.type !== 'on' || !isPlayer(e) || busy || done) return;
    const target = notes()[pos];
    if (!target) return;
    if (target.midis.includes(e.midi)) {
      // a chord moves on once all its keys are down together
      got.add(e.midi);
      if (target.midis.length > 1 && !target.midis.every(m => got.has(m) && soundingNotes().includes(m))) { fb.textContent = ''; card.dataset.feedback = ''; return; }
      got.clear();
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
  const BAR = step.meter || 4;
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
  const draw = (states = []) => drawLessonLine(line, { items: rounds[i], rhythm: true, states, timeSignature: [BAR, 4] });
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

// ── touch: nuances, legato / staccato, the pedal ───────────────
// A round is { src, dyn } (dyn: 'p', 'f', 'cresc', 'dim', or one per note),
// { src, art } ('legato' | 'staccato') or { src, pedal: true } (change the
// pedal after each chord). The notes must be right; the touch is scored.
const DYN = { p: v => v <= 64, f: v => v >= 84, mf: v => v > 50 && v < 96 };
function runTouch(step, api) {
  const rounds = step.rounds.map(r => ({ ...r, items: parse(r.src) }));
  api.keys(step.range);
  const prompt = rich(step.prompt, 'div', 'rich step-prompt');
  const mark = h('div', { class: 'touch-mark' });
  const line = h('div', { class: 'step-line' });
  const meter = h('div', { class: 'touch-meter' });
  const fb = h('div', { class: 'step-feedback', 'aria-live': 'polite' });
  const prog = h('div', { class: 'step-progress' });
  const listenBtn = h('button', { type: 'button', class: 'btn ghost listen', onclick: () => listen() }, icon('start'), t('cListen'));
  const againBtn = h('button', { type: 'button', class: 'btn ghost', hidden: true, onclick: () => startRound() }, icon('restart'), t('cAgain'));
  const nextBtn = h('button', { type: 'button', class: 'btn', hidden: true, onclick: () => { i++; startRound(); } }, t('cNextRound'), icon('next'));
  const pedalHint = h('small', { class: 'muted', hidden: true }, t('cPedalSpace'));
  const card = h('div', { class: 'card step-card center' }, prog, prompt, mark, line, meter, fb, h('div', { class: 'row center-row' }, listenBtn, againBtn, nextBtn), pedalHint);
  api.body.append(card);
  const best = rounds.map(() => 0);
  let i = 0, pos = 0, played = [], pedals = [], got = new Set(), busy = false, d = null, finished = false;
  const R = () => rounds[i];
  const notes = () => notesOf(R().items);
  const dynOf = k => (Array.isArray(R().dyn) ? R().dyn[k] : R().dyn);
  const label = r => r.pedal ? t('cTouchPedal') : r.art ? t(r.art === 'legato' ? 'cTouchLegato' : 'cTouchStaccato')
    : Array.isArray(r.dyn) ? [...new Set(r.dyn)].join(' → ') : r.dyn === 'cresc' ? 'cresc. <' : r.dyn === 'dim' ? 'dim. >' : r.dyn;
  const paint = (states = []) => {
    prog.textContent = t('cRound', { n: i + 1, total: rounds.length });
    mark.textContent = label(R());
    drawLessonLine(line, { items: R().items, clef: step.clef, states: states.length ? states : notes().map((_, k) => (k < pos ? 'good' : k === pos ? 'now' : '')) });
    meter.replaceChildren(...notes().map((n, k) => {
      const p = played[k];
      return h('span', { class: 'touch-bar' + (p?.ok === false ? ' bad' : p?.ok ? ' good' : '') }, h('i', { style: `height:${p ? Math.round(p.vel / 127 * 100) : 0}%` }));
    }));
    const target = notes()[pos];
    setCoachGuide(!busy && target && step.hint !== false ? { midis: new Set(target.midis) } : null);
  };
  const velFor = k => {
    const r = R(), n = notes().length, x = n > 1 ? k / (n - 1) : 0;
    const dyn = dynOf(k);
    return dyn === 'p' ? 45 : dyn === 'f' ? 108 : dyn === 'cresc' ? Math.round(40 + 75 * x) : dyn === 'dim' ? Math.round(115 - 75 * x) : 80;
  };
  const listen = async () => {
    d?.cancel();
    busy = true; paint();
    d = demo(R().items, step.bpm || 84, { vel: velFor, gate: R().art === 'staccato' ? 0.35 : 1 });
    await d;
    busy = false;
    if (card.isConnected) paint();
  };
  const startRound = () => {
    pos = 0; played = []; pedals = []; got.clear();
    card.dataset.feedback = ''; fb.textContent = '';
    againBtn.hidden = true; nextBtn.hidden = true;
    pedalHint.hidden = !R().pedal;
    paint();
  };
  // a fallback pedal: the space bar, during pedal rounds
  const keyDown = e => { if (e.code === 'Space' && R()?.pedal && !e.repeat) { e.preventDefault(); setPedal(true); } };
  const keyUp = e => { if (e.code === 'Space' && R()?.pedal) { e.preventDefault(); setPedal(false); } };
  addEventListener('keydown', keyDown);
  addEventListener('keyup', keyUp);

  const evaluate = () => {
    const r = R(), n = notes().length;
    const ok = [];
    let msg = '';
    if (r.dyn === 'cresc' || r.dyn === 'dim') {
      const up = r.dyn === 'cresc' ? 1 : -1;
      const span = (played[n - 1].vel - played[0].vel) * up;
      for (let k = 0; k < n; k++) ok.push(k === 0 || (played[k].vel - played[k - 1].vel) * up >= -6);
      if (span < 25) ok.fill(false, 0, Math.ceil(n / 2));
      msg = t('cTouchSpan', { a: played[0].vel, b: played[n - 1].vel });
    } else if (r.dyn) {
      for (let k = 0; k < n; k++) ok.push(DYN[dynOf(k)](played[k].vel));
      const avg = Math.round(played.reduce((s, p) => s + p.vel, 0) / n);
      msg = Array.isArray(r.dyn) ? '' : t('cTouchAvg', { v: avg });
    } else if (r.art === 'legato') {
      for (let k = 0; k < n; k++) ok.push(k === n - 1 || (played[k].off ?? Infinity) >= played[k + 1].on - 60);
      const gaps = played.slice(0, -1).map((p, k) => played[k + 1].on - (p.off ?? played[k + 1].on));
      const worst = Math.max(0, ...gaps);
      msg = worst > 60 ? t('cTouchGap', { ms: Math.round(worst) }) : t('cTouchLinked');
    } else if (r.art === 'staccato') {
      for (let k = 0; k < n; k++) ok.push(played[k].off != null && played[k].off - played[k].on <= 220);
      const avg = played.filter(p => p.off != null).map(p => p.off - p.on);
      msg = avg.length ? t('cTouchHeld', { ms: Math.round(median(avg)) }) : '';
    } else if (r.pedal) {
      for (let k = 0; k < n; k++) {
        const on = played[k].on, nextOn = played[k + 1]?.on ?? on + 2500;
        const down = pedals.find(p => p.down && p.t > on - 30 && p.t < Math.min(nextOn, on + 900));
        const up = k === 0 ? true : pedals.some(p => !p.down && p.t > on - 400 && down && p.t <= down.t);
        ok.push(!!down && up);
      }
      msg = pedals.length ? '' : t('cTouchNoPedal');
    }
    played.forEach((p, k) => (p.ok = ok[k]));
    const score = ok.filter(Boolean).length / n;
    best[i] = Math.max(best[i], score);
    paint(ok.map(x => (x ? 'good' : 'bad')));
    card.dataset.feedback = score >= 0.7 ? 'success' : 'miss';
    fb.textContent = [t('cTouchScore', { pct: Math.round(score * 100) }), msg].filter(Boolean).join(' · ');
    againBtn.hidden = false;
    const last = i === rounds.length - 1;
    if (best[i] >= 0.5) {
      if (!last) nextBtn.hidden = false;
      else if (!finished && best.every(b => b >= 0.5)) {
        finished = true;
        const mean = best.reduce((a, b) => a + b, 0) / best.length;
        api.complete(mean >= 0.9 ? 3 : mean >= 0.7 ? 2 : 1);
      }
    }
  };
  let evalTimer = 0;
  const un = subscribe(e => {
    if (e.type === 'pedal') { pedals.push({ down: e.down, t: performance.now() }); return; }
    if (!isPlayer(e) || busy) return;
    if (e.type === 'off') {
      const p = played.find(x => x.midis.includes(e.midi) && x.off == null);
      if (p) p.off = e.time;
      return;
    }
    if (e.type !== 'on' || pos >= notes().length) return;
    const target = notes()[pos];
    if (!target.midis.includes(e.midi)) { card.dataset.feedback = 'miss'; fb.textContent = t('drillNotThisNote', { note: pcName(e.midi % 12) }); return; }
    got.add(e.midi);
    if (!played[pos]) played[pos] = { on: e.time, vel: e.velocity, midis: target.midis, n: 1 };
    else { played[pos].vel = Math.round((played[pos].vel * played[pos].n + e.velocity) / (played[pos].n + 1)); played[pos].n++; }
    if (!target.midis.every(m => got.has(m))) return;
    got.clear();
    pos++;
    card.dataset.feedback = ''; fb.textContent = '';
    paint();
    if (pos >= notes().length) {
      // wait for the last note to be released (or a moment, with the pedal)
      clearTimeout(evalTimer);
      evalTimer = setTimeout(() => card.isConnected && evaluate(), R().pedal ? 1600 : 900);
    }
  });
  api.onCleanup(() => { un(); d?.cancel(); clearTimeout(evalTimer); removeEventListener('keydown', keyDown); removeEventListener('keyup', keyUp); setPedal(false); });
  startRound();
}

// ── synth: a few controls of the workshop sound, and goals ─────
const labCtl = c => ({ ...c, label: tx(c.label), options: c.options?.map(([v, l]) => [v, tx(l)]) });
function labStep(step, api, ctx) {
  if (step.patch) setLabPatch(step.patch());
  if (step.prepare) { const p = clonePatch(labPatch()); step.prepare(p); setLabPatch(p); }
  if (step.fx) setLabFx(step.fx);
  if (step.arp) setLabArp(step.arp);
  if (step.seq) setLabSeq(step.seq);
  if (step.tempo) S.tempo = step.tempo;
  api.keys(step.range || { lo: 48, hi: 84 });
  const views = step.views ? labViews(step.views) : null;
  // the operators' wiring, as on the Create screen
  const graph = step.graph ? createGraph({ compact: true, outLabel: t('out'), onSelect: () => {} }) : null;
  if (graph) { graph.set(labPatch()); ctx.graphs.push(graph); }
  const env = step.env != null ? envCanvas(() => labPatch().ops[step.env]) : null;
  if (env) env.classList.add('lab-env');
  let d = null;
  const playBtn = h('button', { type: 'button', class: 'btn ghost listen', onclick: () => { d?.cancel(); d = demo(parse(step.play || 'C4w'), step.bpm || 90); } }, icon('start'), t('labPlay'));
  api.onCleanup(() => { d?.cancel(); views?.stop(); });
  // the Arp or Seq panel of the Create screen, as is
  const panel = step.panel ? h('div', { class: 'lab-panel create-body c-' + step.panel }) : null;
  if (panel) (step.panel === 'arp' ? mountArp : mountSeq)(panel, ctx);
  return { views: graph ? h('div', { class: 'lab-views' }, h('div', { class: 'graph-box lab-graph' }, graph.el), ...(views ? [views] : [])) : views, env, playBtn, graph, panel };
}

function runSynth(step, api, ctx) {
  const { views, env, playBtn, graph, panel } = labStep(step, api, ctx);
  const goals = step.goals || [];
  const played = new Set(), seen = new Set(), touch = { min: 127, max: 0 };
  let gi = 0, done = false;
  const list = h('ol', { class: 'lab-goals' });
  const fb = h('div', { class: 'step-feedback', 'aria-live': 'polite' });
  const paint = () => list.replaceChildren(...goals.map((g, k) => h('li', { class: k < gi ? 'done' : k === gi ? 'now' : '' }, rich(g.text, 'span', 'rich'))));
  const check = () => {
    if (done) return;
    const before = gi;
    while (goals[gi] && goals[gi].check(labPatch(), played, seen, touch)) gi++;
    if (gi !== before) {
      paint();
      card.dataset.feedback = 'success';
      fb.textContent = gi >= goals.length ? pick(t('drillWell').split('|')) : t('labGoalDone');
      setTimeout(() => { if (card.isConnected && !done) card.dataset.feedback = ''; }, 900);
    }
    if (gi >= goals.length) { done = true; api.complete(goals.length ? 3 : null); }
  };
  const controls = h('div', { class: 'lab-controls' }, ...(step.controls || []).map(c => controlEl(labCtl(c), labPatch, () => {
    seen.add(c.key + '=' + readKey(labPatch(), c.key));
    labChanged(); env?.draw(); if (c.key === 'alg') graph?.set(labPatch()); check();
  })));
  const card = h('div', { class: 'card step-card lab-card' }, step.title ? h('h2', {}, resolve(step.title)) : null, step.text ? rich(step.text) : null,
    views, env, controls, panel, goals.length ? list : null, fb, h('div', { class: 'row center-row' }, playBtn));
  api.body.append(card);
  const un = subscribe(e => { if (e.type === 'on' && isPlayer(e)) { played.add(e.midi); touch.min = Math.min(touch.min, e.velocity); touch.max = Math.max(touch.max, e.velocity); check(); } });
  api.onCleanup(un);
  // the panels change state outside our controls: look now and then
  if (panel) {
    const poll = setInterval(() => { seen.add('arp.mode=' + S.arp.mode); check(); }, 300);
    api.onCleanup(() => clearInterval(poll));
  }
  paint();
  if (!goals.length) api.complete(null);
}

// ── match: copy a target sound by ear ──────────────────────────
function runMatch(step, api, ctx) {
  const { views, env, playBtn, graph } = labStep(step, api, ctx);
  const target = clonePatch(labPatch());
  step.target(target);
  let d = null, checks = 0, done = false;
  const fb = h('div', { class: 'step-feedback', 'aria-live': 'polite' });
  const items = () => parse(step.play || 'C4w');
  const targetBtn = h('button', { type: 'button', class: 'btn ghost listen', onclick: () => { d?.cancel(); playWith(target, () => (d = demo(items(), step.bpm || 90, { light: false }))); } }, icon('target'), t('labTarget'));
  playBtn.replaceChildren(icon('start'), t('labMine'));
  const tolOf = c => (c.key.endsWith('.coarse') || c.key === 'fb' || c.key === 'alg' ? 0 : c.tol ?? step.tol ?? 10);
  const compare = () => {
    if (done) return;
    checks++;
    const off = step.controls.filter(c => Math.abs(shown(c, readKey(labPatch(), c.key)) - shown(c, readKey(target, c.key))) > tolOf(c));
    if (!off.length) {
      done = true;
      card.dataset.feedback = 'success';
      fb.textContent = t('labMatch');
      return api.complete(checks <= 1 ? 3 : checks <= 3 ? 2 : 1);
    }
    card.dataset.feedback = 'miss';
    // after a few tries, say which way the first wrong control should go
    const c = off[0];
    const up = shown(c, readKey(target, c.key)) > shown(c, readKey(labPatch(), c.key));
    fb.textContent = checks >= 3 ? t('labOffHint', { label: tx(c.label), dir: t(up ? 'labMore' : 'labLess') }) : t('labOff', { n: off.length });
  };
  const controls = h('div', { class: 'lab-controls' }, ...step.controls.map(c => controlEl(labCtl(c), labPatch, () => { labChanged(); env?.draw(); if (c.key === 'alg') graph?.set(labPatch()); card.dataset.feedback = ''; })));
  const card = h('div', { class: 'card step-card lab-card' }, step.text ? rich(step.text) : null, views, env, controls, fb,
    h('div', { class: 'row center-row' }, targetBtn, playBtn, h('button', { type: 'button', class: 'btn', onclick: compare }, t('labCompare'))));
  api.body.append(card);
  api.onCleanup(() => d?.cancel());
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
  const BAR = step.meter || 4;
  const song = openSongData({ title: tx(step.title), bpm: step.bpm, timeSignature: [BAR, 4], notes });
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

const RUNNERS = { synth: runSynth, match: runMatch, touch: runTouch, info: runInfo, find: runFind, quiz: runQuiz, phrase: runPhrase, rhythm: runRhythm, drill: runDrill, piece: runPiece, calibrate: runCalibrate };
