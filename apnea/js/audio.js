// Cues. Soft sine beeps (WebAudio) plus optional spoken phase changes.
// The AudioContext is created on the first user gesture so mobile allows it.

import { getSettings } from './store.js';

let ctx = null;

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
}

function tone({ freq = 660, dur = 0.14, gain = 0.14, type = 'sine', delay = 0 }) {
  if (!ctx || !getSettings().sound) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(gain, t + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const cue = {
  tick: () => tone({ freq: 620, dur: 0.07, gain: 0.07 }),
  countdown: () => tone({ freq: 760, dur: 0.1, gain: 0.11 }),
  go: () => { tone({ freq: 520, dur: 0.16, gain: 0.16 }); tone({ freq: 780, dur: 0.22, gain: 0.14, delay: 0.13 }); },
  phase: () => { tone({ freq: 880, dur: 0.18, gain: 0.14 }); },
  mark: () => tone({ freq: 380, dur: 0.09, gain: 0.1, type: 'triangle' }),
  done: () => {
    tone({ freq: 660, dur: 0.2, gain: 0.15 });
    tone({ freq: 880, dur: 0.2, gain: 0.15, delay: 0.18 });
    tone({ freq: 1170, dur: 0.35, gain: 0.13, delay: 0.36 });
  },
};

export function say(text) {
  const s = getSettings();
  if (!s.voice || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1;
    u.volume = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* nothing to do */ }
}

export function buzz(pattern = 30) {
  if (!getSettings().vibrate) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

export function silence() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
