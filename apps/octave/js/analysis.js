// Song analysis for Learn › Songs › Understand: key and scale, note values and
// rhythm patterns, melody shape, hand positions, sections (with repeats) and
// the harmony of each bar. Pure computation on the song from song.js.
import { pitchClass, scaleNotes, buildChord } from './theory.js?v=202611127';

// ── key ────────────────────────────────────────────────────────
// Krumhansl-Kessler key profiles
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function correlate(hist, profile, root) {
  const n = 12;
  const x = hist, y = i => profile[(i - root + 12) % 12];
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = profile.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y(i) - my; num += a * b; dx += a * a; dy += b * b; }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

function findKey(notes) {
  const hist = new Array(12).fill(0);
  for (const n of notes) hist[pitchClass(n.midi)] += Math.max(0.25, n.endBeat - n.startBeat);
  // the last note and the lowest first note weigh in: pieces start and end home
  const last = [...notes].sort((a, b) => b.startBeat - a.startBeat || a.midi - b.midi)[0];
  const firstBeat = notes[0].startBeat;
  const firstBass = notes.filter(n => n.startBeat === firstBeat).sort((a, b) => a.midi - b.midi)[0];
  const tonicHint = new Array(12).fill(0);
  // (a bare melody says little else, so the last note counts a lot)
  if (last) tonicHint[pitchClass(last.midi)] += 0.2;
  if (firstBass) tonicHint[pitchClass(firstBass.midi)] += 0.05;
  const keys = [];
  for (let r = 0; r < 12; r++) {
    keys.push({ root: r, mode: 'major', score: correlate(hist, MAJOR, r) + tonicHint[r] });
    keys.push({ root: r, mode: 'minor', score: correlate(hist, MINOR, r) + tonicHint[r] });
  }
  keys.sort((a, b) => b.score - a.score);
  const best = keys[0];
  const type = best.mode === 'major' ? 'major' : 'minor';
  const scale = scaleNotes(best.root, type);
  const inScale = new Set(scale.map(s => s.pc));
  const outside = [];
  hist.forEach((w, pc) => { if (w > 0 && !inScale.has(pc)) outside.push({ pc, count: notes.filter(n => pitchClass(n.midi) === pc).length }); });
  // key signature: sharps (+) or flats (-) of the major key (or the relative major)
  const majorRoot = best.mode === 'major' ? best.root : (best.root + 3) % 12;
  const SIG = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5 };
  return {
    root: best.root, mode: best.mode, type, scale, outside,
    signature: SIG[majorRoot],
    relative: best.mode === 'major' ? { root: (best.root + 9) % 12, mode: 'minor' } : { root: majorRoot, mode: 'major' },
    sure: best.score - keys[1].score > 0.05,
    runnerUp: keys[1],
    used: hist.map((w, pc) => (w > 0 ? pc : -1)).filter(pc => pc >= 0),
  };
}

// ── note values and rhythm patterns ───────────────────────────
const VALUES = [[4, 'w'], [3, 'h.'], [2, 'h'], [1.5, 'q.'], [1, 'q'], [0.75, 'e.'], [0.5, 'e'], [0.25, 's']];
export const VALUE_NAMES = ['w', 'h.', 'h', 'q.', 'q', 'e.', 'e', 's'];
const q = b => Math.round(b * 4) / 4;
// A length in beats as note values, longest first (2.5 = h + e)
function split(beats) {
  const out = [];
  let left = q(beats);
  while (left >= 0.25 - 1e-9) {
    const v = VALUES.find(([b]) => b <= left + 1e-9);
    out.push(v[1]);
    left = q(left - v[0]);
  }
  return out;
}

function rhythmOfBar(onsets, barStart, barLen) {
  // onsets: [{ beat, end }] sorted, inside the bar
  const tokens = [];
  const values = [];
  if (!onsets.length) return { src: split(barLen).map(v => 'r' + v).join(' '), values };
  if (onsets[0].beat > barStart + 0.2) split(onsets[0].beat - barStart).forEach(v => tokens.push('r' + v));
  onsets.forEach((o, i) => {
    const next = i + 1 < onsets.length ? onsets[i + 1].beat : barStart + barLen;
    const end = Math.min(next, Math.max(q(o.end), o.beat + 0.25));
    // a note followed by a real silence is the note then a rest
    const silent = next - end >= 0.5;
    const notes = split((silent ? end : next) - o.beat);
    tokens.push(...notes); // a tied remainder shows as its own value
    values.push(notes[0]);
    if (silent) split(next - end).forEach(v => tokens.push('r' + v));
  });
  return { src: tokens.join(' '), values };
}

// ── harmony of a bar ───────────────────────────────────────────
const TRIADS = [['maj', [0, 4, 7]], ['min', [0, 3, 7]], ['dom7', [0, 4, 7, 10]], ['dim', [0, 3, 6]]];
function barChord(notes, key) {
  if (!notes.length) return null;
  const w = new Array(12).fill(0);
  let total = 0;
  const lowest = notes.reduce((a, b) => (b.midi < a.midi ? b : a));
  const hasBass = notes.some(n => n.hand === 'left');
  for (const n of notes) { const d = Math.max(0.25, n.endBeat - n.startBeat); w[pitchClass(n.midi)] += d; total += d; }
  const diatonic = new Set(key.scale.map(s => s.pc));
  let best = null;
  for (let root = 0; root < 12; root++) {
    for (const [id, shape] of TRIADS) {
      const pcs = shape.map(s => (root + s) % 12);
      const hit = pcs.reduce((s, pc) => s + w[pc], 0);
      const missing = pcs.filter(pc => !w[pc]).length;
      if (missing > 1) continue; // a chord needs all its tones but one
      let score = hit / total - missing * 0.12 - (id === 'dom7' ? 0.06 : 0) - (id === 'dim' ? 0.08 : 0);
      if (pcs.every(pc => diatonic.has(pc))) score += 0.05;
      // the bass only tells the root when there is one (a left hand)
      if (hasBass && pitchClass(lowest.midi) === root) score += 0.1;
      // the main chords come first: I, IV, V
      if ([0, 5, 7].includes((root - key.root + 12) % 12) && id !== 'dim') score += 0.06;
      if (!best || score > best.score) best = { root, id, score, hit: hit / total, missing };
    }
  }
  // too few notes to tell (a bare melody): better no chord than a wrong one
  if (!best || best.hit < (best.missing ? 0.75 : 0.5)) return null;
  const chord = buildChord(best.root, best.id);
  return { ...chord, roman: roman(best.root, best.id, key) };
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
function roman(root, id, key) {
  const deg = key.scale.findIndex(s => s.pc === root);
  let base;
  if (deg >= 0) base = ROMAN[deg];
  else {
    // a borrowed chord: name it from the nearest degree, with ♭ or ♯
    const up = key.scale.findIndex(s => s.pc === (root + 1) % 12);
    base = up >= 0 ? '♭' + ROMAN[up] : '♯' + ROMAN[key.scale.findIndex(s => s.pc === (root + 11) % 12)];
  }
  const minorish = id === 'min' || id === 'dim';
  return (minorish ? base.toLowerCase() : base) + (id === 'dim' ? '°' : id === 'dom7' ? '7' : '');
}

// ── hands ──────────────────────────────────────────────────────
function handInfo(notes) {
  if (!notes.length) return null;
  const midis = notes.map(n => n.midi);
  const lo = Math.min(...midis), hi = Math.max(...midis);
  const pcs = new Set(midis.map(pitchClass));
  // five fingers cover five neighbouring white keys (a little more with a black key)
  const fixed = hi - lo <= 8 && new Set(midis).size <= 6;
  return { lo, hi, span: hi - lo, fixed, count: notes.length, pcs: pcs.size };
}

// ── melody (top line of the right hand) ───────────────────────
function melodyInfo(notes) {
  const tops = [];
  for (const n of notes) {
    const last = tops[tops.length - 1];
    if (last && Math.abs(last.startBeat - n.startBeat) < 0.01) { if (n.midi > last.midi) tops[tops.length - 1] = n; }
    else tops.push(n);
  }
  let repeat = 0, step = 0, third = 0, leap = 0, biggest = null;
  for (let i = 1; i < tops.length; i++) {
    const d = Math.abs(tops[i].midi - tops[i - 1].midi);
    if (d === 0) repeat++; else if (d <= 2) step++; else if (d <= 4) third++; else leap++;
    if (!biggest || d > biggest.semis) biggest = { semis: d, from: tops[i - 1].midi, to: tops[i].midi, beat: tops[i].startBeat };
  }
  const moves = Math.max(1, tops.length - 1);
  return { repeat: repeat / moves, step: step / moves, third: third / moves, leap: leap / moves, biggest, count: tops.length };
}

// ── sections ───────────────────────────────────────────────────
function similarity(a, b) {
  if (!a.size && !b.size) return 1;
  let common = 0;
  for (const x of a) if (b.has(x)) common++;
  return common / Math.max(a.size, b.size);
}

export function analyzeSong(song) {
  const notes = [...song.notes].sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
  const [num, den] = song.timeSignature || [4, 4];
  const barLen = num * (4 / den);
  const lastBeat = Math.max(...notes.map(n => n.endBeat));
  const bars = Math.max(1, Math.ceil((lastBeat - 1e-6) / barLen));
  const barOf = beat => Math.floor(beat / barLen + 1e-6);
  const key = findKey(notes);
  const right = notes.filter(n => n.hand === 'right');
  const left = notes.filter(n => n.hand === 'left');
  const melodyNotes = right.length ? right : notes;

  // rhythm of the melody, bar by bar
  const perBar = Array.from({ length: bars }, () => []);
  {
    const seen = new Map();
    for (const n of melodyNotes) {
      const beat = q(n.startBeat);
      const k = beat;
      const prev = seen.get(k);
      if (prev) { prev.end = Math.max(prev.end, n.endBeat); continue; }
      const o = { beat, end: n.endBeat };
      seen.set(k, o);
      const b = barOf(beat);
      if (perBar[b]) perBar[b].push(o);
    }
  }
  const valueCount = {};
  const patterns = new Map();
  perBar.forEach((ons, b) => {
    const { src, values } = rhythmOfBar(ons, b * barLen, barLen);
    values.forEach(v => (valueCount[v] = (valueCount[v] || 0) + 1));
    if (!ons.length) return;
    if (!patterns.has(src)) patterns.set(src, { src, bars: [] });
    patterns.get(src).bars.push(b + 1);
  });
  const totalValues = Object.values(valueCount).reduce((a, b) => a + b, 0) || 1;
  const values = VALUE_NAMES.filter(v => valueCount[v]).map(v => ({ v, count: valueCount[v], share: valueCount[v] / totalValues }));
  const rhythms = [...patterns.values()].sort((a, b) => b.bars.length - a.bars.length);

  // sections: phrases of 4 bars (2 in short pieces), compared note by note
  const size = bars >= 8 ? 4 : 2;
  const sections = [];
  for (let from = 0; from < bars; from += size) {
    const to = Math.min(bars, from + size);
    const inside = notes.filter(n => barOf(n.startBeat) >= from && barOf(n.startBeat) < to);
    const sig = new Set(inside.map(n => n.midi + '@' + q(n.startBeat - from * barLen)));
    const sec = { from: from + 1, to, notes: inside, sig, startMs: song.beatToMs(from * barLen), endMs: song.beatToMs(to * barLen) };
    sec.chords = [];
    for (let b = from; b < to; b++) sec.chords.push(barChord(notes.filter(n => barOf(n.startBeat) === b), key));
    sec.right = handInfo(inside.filter(n => n.hand === 'right'));
    sec.left = handInfo(inside.filter(n => n.hand === 'left'));
    sections.push(sec);
  }
  // letters: the same music again gets the same letter, a variation gets a ′
  const letters = [];
  for (const sec of sections) {
    let match = null;
    for (const prev of letters) {
      const sim = similarity(sec.sig, prev.sig);
      if (!match || sim > match.sim) match = { sim, prev };
    }
    if (match && match.sim >= 0.95) { sec.label = match.prev.label; sec.same = match.prev; }
    else if (match && match.sim >= 0.6) { sec.label = match.prev.label + '′'; sec.like = match.prev; }
    else { sec.label = String.fromCharCode(65 + letters.length); letters.push(sec); }
  }

  return {
    key, barLen, bars, bpm: song.bpm, timeSignature: [num, den], durationMs: song.durationMs,
    hands: { right: handInfo(right), left: handInfo(left) },
    melody: melodyInfo(melodyNotes),
    values, rhythms, sections,
    uniqueSections: letters.length,
  };
}
