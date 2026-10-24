// Tiny synth: engine hum, wall scrape hiss, beeps. Starts on first user gesture.
let ac = null, eng, engGain, engFilt, scrGain, master;
export const sound = { on: true };

export function unlock() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = sound.on ? 0.5 : 0; master.connect(ac.destination);

  eng = ac.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 50;
  const sub = ac.createOscillator(); sub.type = 'square'; sub.frequency.value = 25;
  engFilt = ac.createBiquadFilter(); engFilt.type = 'lowpass'; engFilt.frequency.value = 300; engFilt.Q.value = 6;
  engGain = ac.createGain(); engGain.gain.value = 0;
  const subG = ac.createGain(); subG.gain.value = 0.3;
  eng.connect(engFilt); sub.connect(subG).connect(engFilt); engFilt.connect(engGain).connect(master);
  eng.start(); sub.start();
  eng._sub = sub;

  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.2;
  scrGain = ac.createGain(); scrGain.gain.value = 0;
  noise.connect(bp).connect(scrGain).connect(master); noise.start();
}

export function setSound(on) {
  sound.on = on;
  if (master) master.gain.setTargetAtTime(on ? 0.5 : 0, ac.currentTime, 0.05);
}

export function engine(speed, thrust, scrape, active) {
  if (!ac) return;
  const t = ac.currentTime;
  const f = 45 + speed * 0.09;
  eng.frequency.setTargetAtTime(f, t, 0.05);
  eng._sub.frequency.setTargetAtTime(f / 2, t, 0.05);
  engFilt.frequency.setTargetAtTime(250 + speed * 0.9 + (thrust ? 500 : 0), t, 0.05);
  engGain.gain.setTargetAtTime(active ? (thrust ? 0.16 : 0.08) : 0, t, 0.08);
  scrGain.gain.setTargetAtTime(active ? scrape * 0.22 : 0, t, 0.03);
}

export function beep(freq = 880, dur = 0.12, type = 'square', vol = 0.18) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

export function chord(freqs, gap = 0.08) { freqs.forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.15), i * gap * 1000)); }
