// Metronome on the shared tempo: clicks scheduled ahead on the audio clock,
// and the beat being heard, for the dots in the top bar.
import * as E from './engine.js?v=202611102';
import { S, save, emit, on } from './store.js?v=202611102';

const LOOK = 0.12;
const m = { next: 0, beat: 0, marks: [] };

export function setMetro(onOff = !S.metro.on) {
  S.metro.on = onOff;
  save();
  restart();
  emit('metro');
}

function restart() {
  const ctx = E.audio();
  m.beat = 0;
  m.marks = [];
  m.next = ctx ? ctx.currentTime + 0.06 : 0;
}

// Beat heard right now (0 = downbeat), -1 when stopped
export function metroBeat() {
  const ctx = E.audio();
  if (!ctx || !S.metro.on) return -1;
  const now = ctx.currentTime;
  while (m.marks.length > 1 && m.marks[1].t <= now) m.marks.shift();
  return m.marks.length && m.marks[0].t <= now ? m.marks[0].beat : -1;
}

function tick() {
  const ctx = E.audio();
  if (!ctx || !S.metro.on) return;
  const now = ctx.currentTime;
  if (!m.next || m.next < now - 0.2) { m.next = now + 0.05; m.beat = 0; }
  while (m.next < now + LOOK) {
    if (S.metro.sound) E.click(m.next, m.beat === 0 && S.metro.beats > 1, S.metro.volume);
    m.marks.push({ t: m.next, beat: m.beat });
    m.beat = (m.beat + 1) % S.metro.beats;
    m.next += 60 / S.tempo;
  }
}
setInterval(tick, 25);
on('metroBeats', restart);
