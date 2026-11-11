// Learn screen: Songs (library, then the song falling onto the keys with its
// staff above, waiting for the player's hand) and Exercises (chords, scales).
import { h, icon, seg, toggle, toast } from './ui.js?v=202611134';
import { S, save } from './store.js?v=202611134';
import { t, chordQuality, scaleName, spelled, notation } from './i18n.js?v=202611134';
import { chordSymbol } from './theory.js?v=202611134';
import { importedSongs, addSong, songFile, removeSong, onLibraryChange } from './library.js?v=202611134';
import { currentSong, openSongFile, closeSong, playSong, pauseSong, isSongPlaying, seekSong, songPosition, setSongPart, setSongSpeed, songPart, onSongChange, onSongPosition, isWaitingForPlayer } from './song.js?v=202611134';
import { mountFall } from './fall.js?v=202611134';
import { mountStaff, drawSingleNote } from './score.js?v=202611134';
import { setOverride, setSide } from './keys.js?v=202611134';
import { LEVELS, setPracticing, practiceState, onPracticeChange, skip, nextTarget, refreshPractice, readingRange } from './practice.js?v=202611134';
import { soundingNotes } from './notes.js?v=202611134';
import { pitchClass, defaultSpelling, spelledOctave } from './theory.js?v=202611134';
import { fullScoreSheet } from './play.js?v=202611134';
import { renderCoach } from './lesson.js?v=202611134';
import { understandSheet } from './understand.js?v=202611134';
import { songLoop, setSongLoop, onSongLoop } from './song.js?v=202611134';
import { COURSE_PIECES, pieceNotes, pitch } from './coach.js?v=202611134';
// course titles carry note names as [G]: written in the player's notation
const pieceTitle = p => (p.title[S.lang] ?? p.title.en).replace(/\[([A-G][#b]?)\]/g, (_, n) => spelled(pitch(n + '4').spelling));
import { openSongData } from './song.js?v=202611134';

export function renderLearn(view, ctx) {
  const nav = seg({ cls: 'subnav', options: [['coach', t('tabCoach')], ['songs', t('tabSongs')], ['drills', t('tabDrills')]], get: () => S.learnTab, set: v => { S.learnTab = v; save(); ctx.rerender(); } });
  const bar = h('div', { class: 'subbar' }, nav);
  view.append(bar);
  if (S.learnTab === 'drills') return renderDrills(view, ctx, bar);
  setPracticing(false);
  if (S.learnTab === 'coach') return renderCoach(view, ctx, bar);
  if (currentSong()) renderPlayer(view, ctx, bar);
  else renderLibrary(view, ctx);
}

// ── library ────────────────────────────────────────────────────
function renderLibrary(view, ctx) {
  const file = h('input', { type: 'file', accept: '.mid,.midi,audio/midi,audio/x-midi', hidden: true, onchange: e => { const f = e.target.files[0]; if (f) importAndOpen(f, ctx); } });
  const list = h('div', { class: 'song-grid' });
  const card = (s, removable) => h('div', { class: 'song-card' },
    h('button', { type: 'button', class: 'song-open', onclick: () => openFromLibrary(s, ctx) },
      h('span', { class: 'song-icon' }, icon('music')),
      h('span', { class: 'song-text' }, h('b', {}, s.title), h('small', {}, s.composer === 'trad' ? t('traditional') : s.composer || s.fileName || ''))),
    removable ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('delete'), onclick: async () => { await removeSong(s.id); toast(t('songRemoved')); } }, icon('trash')) : null);
  const fill = async () => {
    const mine = await importedSongs();
    list.textContent = '';
    list.append(h('h3', {}, t('fromCourse')), ...COURSE_PIECES.map(p => h('div', { class: 'song-card' },
      h('button', { type: 'button', class: 'song-open', onclick: () => { openSongData({ title: pieceTitle(p), bpm: p.bpm, timeSignature: [p.meter, 4], notes: pieceNotes(p), lesson: false }); afterOpen(ctx); } },
        h('span', { class: 'song-icon' }, icon('learn')),
        h('span', { class: 'song-text' }, h('b', {}, pieceTitle(p)), h('small', {}, t('courseUnit', { n: p.unit })))))));
    list.append(h('h3', {}, t('yourSongs')));
    if (mine.length) list.append(...mine.map(s => card(s, true)));
    else list.append(h('p', { class: 'muted' }, t('noSongs')));
  };
  const drop = h('button', { type: 'button', class: 'dropzone', onclick: () => file.click() }, icon('upload'), h('b', {}, t('importMidi')), h('span', {}, t('importMidiHint')));
  const wrap = h('div', { class: 'library' }, drop, list, file);
  wrap.addEventListener('dragover', e => { e.preventDefault(); wrap.classList.add('drag'); });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('drag'));
  wrap.addEventListener('drop', e => { e.preventDefault(); wrap.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f) importAndOpen(f, ctx); });
  view.append(wrap);
  onLibraryChange(() => { if (wrap.isConnected) fill(); });
  fill();
}

async function importAndOpen(f, ctx) {
  try {
    const song = await openSongFile(f);
    const id = await addSong(f, song.title);
    song.id = id;
    afterOpen(ctx);
  } catch (err) {
    toast(t('songError'));
  }
}
async function openFromLibrary(s, ctx) {
  try {
    await openSongFile(await songFile(s.id), { id: s.id, title: s.title });
    afterOpen(ctx);
  } catch {
    toast(t('songError'));
  }
}
function afterOpen(ctx) {
  setSongPart(S.song.part);
  setSongSpeed(S.song.speed);
  ctx.rerender();
}

// ── player ─────────────────────────────────────────────────────
function fmtTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function renderPlayer(view, ctx, bar) {
  const song = currentSong();
  // the keyboard shows the song's range, the hands get their colours
  setOverride({ lo: Math.max(21, song.lo - 2), hi: Math.min(108, song.hi + 2) });
  const hands = new Map(song.notes.map(n => [n.midi, n.hand === 'left' ? 1 : 0]));
  setSide(m => hands.get(m) ?? (m < 60 ? 1 : 0));
  ctx.onLeave(() => { setOverride(null); setSide(null); pauseSong(); });

  const playBtn = h('button', { type: 'button', class: 'btn transport', onclick: () => (isSongPlaying() ? pauseSong() : playSong()) });
  const restart = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('restart'), onclick: () => seekSong(0) }, icon('restart'));
  const close = h('button', { type: 'button', class: 'btn ghost', onclick: () => { closeSong(); ctx.rerender(); } }, icon('back'), h('span', {}, t('library')));
  const title = h('div', { class: 'song-title' }, h('b', {}, song.title), h('small', {}, `${song.bpm} bpm · ${song.timeSignature.join('/')}`));
  const parts = seg({ options: [['listen', t('partListen')], ['right', t('partRight')], ['left', t('partLeft')], ['both', t('partBoth')]], get: () => songPart(), set: v => { S.song.part = v; save(); setSongPart(v); } });
  const speed = seg({ options: [[0.5, '50 %'], [0.75, '75 %'], [1, '100 %']], get: () => S.song.speed, set: v => { S.song.speed = v; save(); setSongSpeed(v); } });
  const staffTog = h('button', { type: 'button', class: 'icon-btn' + (S.song.staff ? ' on' : ''), 'aria-label': t('viewStaff'), 'aria-pressed': S.song.staff, onclick: () => { S.song.staff = !S.song.staff; save(); ctx.rerender(); } }, icon('score'));
  const full = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('fullScore'), onclick: () => ctx.openSheet(fullScoreSheet) }, icon('expand'));
  const understand = h('button', { type: 'button', class: 'btn ghost understand-btn', onclick: () => { pauseSong(); ctx.openSheet(understandSheet); } }, icon('bulb'), h('span', {}, t('uOpen')));
  const loopChip = h('button', { type: 'button', class: 'loop-chip', onclick: () => { setSongLoop(null); } });
  const paintLoop = () => {
    const l = songLoop();
    loopChip.hidden = !l;
    if (l) loopChip.replaceChildren(icon('restart'), h('span', {}, t('uLoopChip', { label: l.label, from: l.from, to: l.to })), icon('close'));
  };
  const unLoop = onSongLoop(paintLoop);
  ctx.onLeave(unLoop);
  bar.append(h('div', { class: 'spacer' }), close);

  const seek = h('input', { type: 'range', class: 'seek', min: 0, max: Math.round(song.durationMs), step: 10, value: 0, 'aria-label': t('position'), oninput: e => seekSong(+e.target.value) });
  const time = h('span', { class: 'time' });
  const wait = h('span', { class: 'wait-badge' }, t('waiting'));
  const controls = h('div', { class: 'song-bar' },
    h('div', { class: 'song-main' }, playBtn, restart, title, understand, staffTog, full),
    h('div', { class: 'song-opts' }, h('span', { class: 'lab' }, t('youPlay')), parts, h('span', { class: 'lab' }, t('speedL')), speed),
    h('div', { class: 'song-seek' }, loopChip, seek, time, wait));

  const stage = h('section', { class: 'stage learn-stage' });
  const canvas = h('canvas', { class: 'roll' });
  if (S.song.staff) {
    const staff = h('div', { class: 'staff-live song-staff' });
    stage.append(staff);
    requestAnimationFrame(() => mountStaff(staff, true));
    ctx.onLeave(() => mountStaff(null));
  }
  stage.append(h('div', { class: 'fall-wrap' }, canvas));
  view.append(controls, stage);
  requestAnimationFrame(() => mountFall(canvas));

  const sync = () => {
    playBtn.textContent = '';
    playBtn.append(icon(isSongPlaying() ? 'pause' : 'start'), isSongPlaying() ? t('pause') : t('playL'));
    playBtn.classList.toggle('on', isSongPlaying());
    wait.classList.toggle('on', isWaitingForPlayer());
  };
  const pos = () => {
    const p = songPosition();
    if (document.activeElement !== seek) seek.value = Math.round(p);
    time.textContent = fmtTime(p) + ' / ' + fmtTime(song.durationMs);
  };
  onSongChange(() => { if (playBtn.isConnected) sync(); });
  onSongPosition(() => { if (seek.isConnected) pos(); });
  sync(); pos(); paintLoop();
}

// ── exercises ──────────────────────────────────────────────────
function renderDrills(view, ctx) {
  const P = S.practice;
  const levels = () => Object.keys(LEVELS[P.kind]).map(k => [k, t(k)]);
  const levelKey = { chords: 'chords', scales: 'scales', reading: 'reading' }[P.kind] || 'chords';
  if (!LEVELS[P.kind]) P.kind = 'chords';
  const reading = P.kind === 'reading';
  // reading asks for exact pitches: the keyboard shows the whole range of the level
  const fitKeys = () => setOverride(reading ? readingRange() : null);
  fitKeys();
  ctx.onLeave(() => setOverride(null));
  const levelSeg = seg({ cls: 'wrap', options: levels(), get: () => P[levelKey], set: v => { P[levelKey] = v; save(); fitKeys(); nextTarget(); } });
  const config = h('div', { class: 'card drill-config' },
    seg({ cls: 'big-seg', options: [['chords', t('drillChords')], ['scales', t('drillScales')], ['reading', t('drillReading')]], get: () => P.kind, set: v => { P.kind = v; save(); ctx.rerender(); } }),
    h('h3', {}, t('level')), levelSeg,
    reading ? h('h3', {}, t('readWhat')) : null,
    reading ? seg({ options: [['note', t('readOneNote')], ['chord', t('readChord')]], get: () => P.readMode || 'note', set: v => { P.readMode = v; save(); nextTarget(); } }) : null,
    reading ? null : h('h3', {}, t('roots')),
    reading ? null : seg({ options: [['naturals', t('rootsNaturals')], ['all', t('rootsAll')]], get: () => P.roots, set: v => { P.roots = v; save(); nextTarget(); } }),
    toggle({ label: reading ? t('showKey') : t('showNotes'), get: () => P.hints, set: v => { P.hints = v; save(); refreshPractice(); } }));

  const prompt = h('p', { class: 'drill-prompt' });
  const symbol = h('div', { class: 'drill-symbol' });
  const name = h('div', { class: 'drill-name' });
  const chips = h('div', { class: 'drill-chips' });
  const feedback = h('div', { class: 'drill-feedback', 'aria-live': 'polite' });
  const stats = h('div', { class: 'drill-stats' });
  const skipBtn = h('button', { type: 'button', class: 'btn ghost', onclick: () => skip() }, icon('skip'), t('skip'));
  const card = h('div', { class: 'card drill-card' }, prompt, symbol, name, chips, feedback, h('div', { class: 'row drill-foot' }, stats, h('div', { class: 'spacer' }), skipBtn));
  view.append(h('div', { class: 'drills' }, card, config));

  const chip = (text, state) => h('span', { class: 'note-chip ' + (state || '') }, text);
  function paint() {
    const { target, feedback: fb, stats: st, missedStep } = practiceState();
    if (!target || !card.isConnected) return;
    card.dataset.feedback = fb.kind;
    feedback.textContent = fb.text;
    stats.textContent = st.done ? t('drillStats', { done: st.done, streak: st.streak }) : t('drillStart');
    if (target.kind === 'reading') {
      prompt.textContent = t(target.chord ? 'drillReadChord' : 'drillReadNote');
      symbol.classList.add('staff-note');
      // in ink until played: each right key turns to the accent colour
      const down = new Set(soundingNotes());
      const good = target.midis.map((m, i) => (fb.kind === 'success' || down.has(m) ? i : -1)).filter(i => i >= 0);
      const sig = target.midis.join(',') + ':' + target.spellings.map(s => s.acc).join(',') + ':' + target.clef + ':' + good.join(',');
      if (symbol.dataset.sig !== sig) { symbol.dataset.sig = sig; drawSingleNote(symbol, target, good); }
      const show = fb.kind === 'success' || P.hints;
      const label = (m, i) => spelled(target.spellings[i]) + spelledOctave(m, target.spellings[i]);
      if (!target.chord) { name.textContent = show ? label(target.midi, 0) : ''; chips.replaceChildren(); }
      else {
        name.textContent = '';
        const held = new Set(soundingNotes());
        chips.replaceChildren(...target.midis.map((m, i) => chip(held.has(m) || show ? label(m, i) : '?', held.has(m) ? 'good' : '')),
          ...[...held].filter(m => !target.midis.includes(m)).map(m => chip(spelled(defaultSpelling(m % 12)) + spelledOctave(m, defaultSpelling(m % 12)), 'bad')));
      }
    } else if (target.kind === 'chords') {
      symbol.classList.remove('staff-note'); delete symbol.dataset.sig;
      prompt.textContent = t('drillPlayChord');
      symbol.textContent = chordSymbol(target.chord, notation());
      name.textContent = spelled(target.chord.root) + ' ' + chordQuality(target.type);
      const held = new Set(soundingNotes().map(pitchClass));
      chips.replaceChildren(...target.notes.map(n => chip(held.has(n.pc) || P.hints ? spelled(n.spelling) : '?', held.has(n.pc) ? 'good' : '')),
        ...[...held].filter(pc => !target.pcs.has(pc)).map(pc => chip(spelled(defaultSpelling(pc)), 'bad')));
    } else {
      symbol.classList.remove('staff-note'); delete symbol.dataset.sig;
      prompt.textContent = t('drillPlayScale');
      symbol.textContent = spelled(target.notes[0].spelling);
      name.textContent = t('drillScaleOf', { name: scaleName(target.type).toLowerCase() });
      chips.replaceChildren(...target.steps.map((s, i) => {
        const done = i < target.position;
        const state = done ? 'good' : i === target.position ? (i === missedStep ? 'next shake' : 'next') : '';
        return chip(done || P.hints ? spelled(s.spelling) : '?', state);
      }));
    }
  }
  const un = onPracticeChange(paint);
  ctx.onLeave(() => { un(); setPracticing(false); });
  setPracticing(true);
  paint();
}
