// Petits bruitages synthétisés (aucun fichier son).
let ac = null;
export function unlockAudio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch { } }
function tone(f, t0, d, type = 'sine', v = .15, f2) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, ac.currentTime + t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + t0 + d);
  g.gain.setValueAtTime(0, ac.currentTime + t0); g.gain.linearRampToValueAtTime(v, ac.currentTime + t0 + .01); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + t0 + d);
  o.connect(g).connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + d + .05);
}
function noise(t0, d, v = .2, hp = 800) {
  const n = ac.sampleRate * d, b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = v;
  s.connect(f).connect(g).connect(ac.destination); s.start(ac.currentTime + t0);
}
export function sfx(k) {
  if (!ac) return;
  if (k === 'new') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .35, 'triangle', .13));
  else if (k === 'catch') [659, 880].forEach((f, i) => tone(f, i * .08, .25, 'triangle', .12));
  else if (k === 'shutter') { noise(0, .06, .3, 2000); noise(.07, .05, .2, 3000); }
  else if (k === 'swing') noise(0, .18, .12, 1200);
  else if (k === 'splash') noise(0, .35, .18, 400);
  else if (k === 'nibble') tone(320, 0, .08, 'sine', .1);
  else if (k === 'bite') { noise(0, .25, .25, 300); tone(220, 0, .2, 'square', .05, 110); }
  else if (k === 'miss') tone(300, 0, .3, 'sine', .1, 150);
  else if (k === 'step') tone(180, 0, .05, 'sine', .03);
  else if (k === 'door') { tone(392, 0, .2, 'triangle', .1); tone(523, .12, .3, 'triangle', .1); }
  else if (k === 'pop') tone(600, 0, .08, 'sine', .08, 900);
}
