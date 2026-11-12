// Learn › Songs › Understand: the song taken apart (key, hands, melody,
// rhythms, sections and harmony) with a work plan; each section can be put on
// repeat, for one hand or both.
import { h, icon, toast } from './ui.js?v=202611129';
import { S, save, emit } from './store.js?v=202611129';
import { t, spelled, intervalName, noteLabel, notation } from './i18n.js?v=202611129';
import { chordSymbol, scaleNotes, defaultSpelling } from './theory.js?v=202611129';
import { currentSong, setSongPart, setSongLoop, seekSong, playSong, pauseSong } from './song.js?v=202611129';
import { drawLessonLine } from './score.js?v=202611129';
import { parse, demo } from './coach.js?v=202611129';
import { analyzeSong } from './analysis.js?v=202611129';
import { openLesson } from './lesson.js?v=202611129';

const pct = x => Math.round(x * 100) + ' %';
const mmss = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const keyName = (root, mode, scale) => spelled(scale[0].spelling) + ' ' + t(mode === 'major' ? 'uMajor' : 'uMinor');

// Lessons that teach a key (major keys of unit 5)
const KEY_LESSON = { 0: 'g2', 7: 'g3', 5: 'g4' };

export function understandSheet(box, ctx) {
  box.classList.add('wide');
  box.dataset.kind = 'understand';
  const song = currentSong();
  if (!song) return;
  const A = analyzeSong(song);
  const K = A.key;
  const hasLeft = !!A.hands.left, hasRight = !!A.hands.right;

  box.append(h('div', { class: 'sheet-head' },
    h('h2', {}, t('uTitle'), h('em', {}, song.title)),
    h('button', { type: 'button', class: 'btn', onclick: () => ctx.closeSheet() }, t('close'))));

  // ── identity ──
  const sig = K.signature;
  const sigNotes = sig > 0 ? ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'].slice(0, sig) : ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].slice(0, -sig);
  const sigText = !sig ? t('uNoSig') : t(sig > 0 ? 'uSharps' : 'uFlats', { n: Math.abs(sig) }) + ' (' + sigNotes.map(n => spelled({ letter: 'CDEFGAB'.indexOf(n[0]), acc: n[1] === '#' ? 1 : n[1] === 'b' ? -1 : 0 })).join(', ') + ')';
  const used = new Set(K.used);
  const scaleChips = h('div', { class: 'drill-chips left' }, ...K.scale.map(s => h('span', { class: 'note-chip ' + (used.has(s.pc) ? 'good' : '') }, spelled(s.spelling))));
  const showScale = () => S.scale.type === K.type && S.scale.root === K.root;
  const scaleBtn = h('button', { type: 'button', class: 'btn ghost' + (showScale() ? ' on' : ''), onclick: e => {
    if (showScale()) S.scale = { root: 0, type: '' }; else S.scale = { root: K.root, type: K.type };
    save(); emit('scale');
    e.currentTarget.classList.toggle('on', showScale());
    toast(showScale() ? t('uScaleShown') : t('uScaleHidden'));
  } }, icon('keys'), t('uShowScale'));
  const lessonId = K.mode === 'major' ? KEY_LESSON[K.root] : null;
  const identity = h('div', { class: 'card' },
    h('h3', {}, t('uIdentity')),
    h('div', { class: 'u-big' }, keyName(K.root, K.mode, K.scale)),
    h('p', { class: 'muted' }, K.sure ? t('uKeySure') : t('uKeyUnsure', { other: keyName(K.runnerUp.root, K.runnerUp.mode, scaleFor(K.runnerUp)) })),
    row(t('uSignature'), sigText),
    row(t('uScale'), scaleChips),
    K.outside.length ? row(t('uOutside'), K.outside.map(o => spelled(scaleSpelling(o.pc)) + ' ×' + o.count).join(', ')) : null,
    row(t('uRelative'), keyName(K.relative.root, K.relative.mode, scaleFor(K.relative))),
    row(t('uMeter'), `${A.timeSignature.join('/')} · ${A.bpm} bpm · ${t('uBars', { n: A.bars })} · ${mmss(A.durationMs)}`),
    h('div', { class: 'row' }, scaleBtn, lessonId ? h('button', { type: 'button', class: 'btn ghost', onclick: () => { ctx.closeSheet(); openLesson(lessonId, ctx); } }, icon('learn'), t('uLesson')) : null));

  // ── hands ──
  const handLine = (info, hand) => {
    if (!info) return h('p', { class: 'muted' }, t(hand === 'right' ? 'uNoRight' : 'uNoLeft'));
    const range = noteLabel(info.lo) + ' – ' + noteLabel(info.hi);
    const tip = info.fixed
      ? t(hand === 'right' ? 'uFixedRight' : 'uFixedLeft', { note: noteLabel(info.lo) })
      : t('uMoves', { n: info.span });
    return h('div', { class: 'u-hand' }, h('b', {}, t(hand === 'right' ? 'partRight' : 'partLeft')), h('span', {}, range + ' · ' + t('uNotes', { n: info.count })), h('small', { class: 'muted' }, tip));
  };
  const hands = h('div', { class: 'card' }, h('h3', {}, t('uHands')), handLine(A.hands.right, 'right'), handLine(A.hands.left, 'left'));

  // ── melody ──
  const M = A.melody;
  const bar = (label, share, cls) => h('div', { class: 'u-bar' }, h('span', {}, label), h('i', {}, h('b', { class: cls, style: `width:${Math.round(share * 100)}%` })), h('small', {}, pct(share)));
  const big = M.biggest && M.biggest.semis > 0 ? t('uBiggest', { name: intervalName(M.biggest.semis % 12) + (M.biggest.semis >= 12 ? ' + ' + t('uOctave') : ''), from: noteLabel(M.biggest.from), to: noteLabel(M.biggest.to), bar: Math.floor(M.biggest.beat / A.barLen) + 1 }) : '';
  const conjoint = M.repeat + M.step;
  const melody = h('div', { class: 'card' }, h('h3', {}, t('uMelody')),
    bar(t('uRepeat'), M.repeat), bar(t('uStep'), M.step), bar(t('uThird'), M.third), bar(t('uLeap'), M.leap, 'warn'),
    big ? h('p', {}, big) : null,
    h('p', { class: 'muted' }, conjoint >= 0.7 ? t('uMelodyEasy') : M.leap >= 0.25 ? t('uMelodyLeaps') : t('uMelodyMixed')));

  // ── rhythm ──
  const valueRows = A.values.map(v => bar(t('val_' + v.v), v.share));
  const patterns = A.rhythms.slice(0, 5).map(p => {
    const line = h('div', { class: 'step-line rhythm u-rhythm' });
    requestAnimationFrame(() => drawLessonLine(line, { items: parse(p.src), rhythm: true }));
    let d = null;
    const listen = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('cListen'), onclick: () => {
      d?.cancel();
      d = demo(parse(p.src.split(' ').map(tok => (tok.startsWith('r') ? tok : 'C5' + tok)).join(' ')), A.bpm);
    } }, icon('start'));
    return h('div', { class: 'u-pattern' }, line, h('div', { class: 'row' }, listen, h('small', { class: 'muted' }, t('uPatternBars', { n: p.bars.length, bars: p.bars.slice(0, 8).join(', ') + (p.bars.length > 8 ? '…' : '') }))));
  });
  const rhythm = h('div', { class: 'card' }, h('h3', {}, t('uRhythm')), ...valueRows,
    h('h3', {}, t('uPatterns', { n: A.rhythms.length })), ...patterns);

  // ── sections ──
  const loopSection = (sec, part) => {
    ctx.closeSheet();
    pauseSong();
    setSongPart(part);
    S.song.part = part; save();
    setSongLoop({ startMs: sec.startMs, endMs: sec.endMs, label: sec.label, from: sec.from, to: sec.to });
    ctx.rerender();
    toast(t('uLooping', { label: sec.label, from: sec.from, to: sec.to }));
  };
  const form = h('div', { class: 'u-form' }, ...A.sections.map(sec => h('span', { class: 'u-letter l' + sec.label.charCodeAt(0) % 6 }, sec.label)));
  const secRows = A.sections.map(sec => {
    const chords = h('div', { class: 'u-chords' }, ...sec.chords.map((c, i) => h('span', { class: 'u-chord' },
      h('small', {}, sec.from + i), h('b', {}, c ? chordSymbol(c, notation()) : '—'), h('em', {}, c ? c.roman : ''))));
    const note = sec.same ? t('uSame', { label: sec.same.label }) : sec.like ? t('uLike', { label: sec.like.label }) : t('uNew');
    const btn = (part, label) => h('button', { type: 'button', class: 'btn ghost', onclick: () => loopSection(sec, part) }, icon('restart'), label);
    return h('div', { class: 'u-section' + (sec.same ? ' same' : '') },
      h('div', { class: 'u-sec-head' }, h('span', { class: 'u-letter l' + sec.label.charCodeAt(0) % 6 }, sec.label), h('b', {}, t('uBarsRange', { from: sec.from, to: sec.to })), h('small', { class: 'muted' }, note)),
      chords,
      h('div', { class: 'row' }, hasRight ? btn('right', t('partRight')) : null, hasLeft ? btn('left', t('partLeft')) : null, hasRight && hasLeft ? btn('both', t('partBoth')) : null));
  });
  const structure = h('div', { class: 'card u-wide' }, h('h3', {}, t('uStructure')), form,
    h('p', { class: 'muted' }, t('uStructureText', { n: A.sections.length, u: A.uniqueSections })), ...secRows);

  // ── plan ──
  const unique = A.sections.filter(s => !s.same);
  const steps = [
    [t('uPlanListen'), h('button', { type: 'button', class: 'btn ghost', onclick: () => { ctx.closeSheet(); setSongLoop(null); setSongPart('listen'); S.song.part = 'listen'; save(); seekSong(0); ctx.rerender(); playSong(); } }, icon('start'), t('cListen'))],
    [t('uPlanScale', { key: keyName(K.root, K.mode, K.scale) }), null],
    ...unique.map(sec => [t(hasLeft && hasRight ? 'uPlanSectionHands' : 'uPlanSection', { label: sec.label, from: sec.from, to: sec.to }), null]),
    hasLeft && hasRight ? [t('uPlanTogether'), null] : null,
    [t('uPlanAll'), null],
  ].filter(Boolean);
  const plan = h('div', { class: 'card u-wide' }, h('h3', {}, t('uPlan')),
    h('ol', { class: 'u-plan' }, ...steps.map(([text, action]) => h('li', {}, h('span', {}, text), action))));

  box.append(h('div', { class: 'sheet-cols' }, identity, hands, melody, rhythm, structure, plan));
}

function row(label, value) {
  return h('div', { class: 'u-row' }, h('span', { class: 'lab' }, label), typeof value === 'string' ? h('span', {}, value) : value);
}
const scaleFor = k => scaleNotes(k.root, k.mode === 'major' ? 'major' : 'minor');
const scaleSpelling = pc => defaultSpelling(pc);
