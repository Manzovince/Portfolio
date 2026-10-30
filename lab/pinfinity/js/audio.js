'use strict';
// Synthesized chiptune SFX + a tiny procedural music loop. No audio files.

const Sfx = (() => {
  let ac = null, master, sfxBus, musBus, noiseBuf;
  let sfxOn = true, musOn = true;
  const last = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = .7; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? .55 : 0; sfxBus.connect(comp);
    musBus = ac.createGain(); musBus.gain.value = musOn ? .22 : 0; musBus.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // rate-limit identical sounds (physics can fire many per frame)
  function gate(name, ms) {
    const t = performance.now();
    if (last[name] && t - last[name] < ms) return false;
    last[name] = t; return true;
  }

  function tone(f, dur, type = 'square', vol = .2, slide = 0, delay = 0, bus) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t); o.stop(t + dur + .02);
  }

  function noise(dur, vol = .2, freq = 2000, q = 1, sweep = 0, delay = 0, type = 'bandpass', bus) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }

  const semi = (base, n) => base * Math.pow(2, n / 12);
  const MAJ = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];

  const S = {
    init,
    get sfx() { return sfxOn; }, get music() { return musOn; },
    setSfx(v) { sfxOn = v; if (sfxBus) sfxBus.gain.value = v ? .55 : 0; },
    setMusic(v) { musOn = v; if (musBus) musBus.gain.value = v ? .22 : 0; },
    flip() { if (!gate('flip', 30)) return; noise(.05, .25, 900, 2, .4); tone(90, .05, 'square', .08, .5); },
    flipDown() { if (!gate('flipd', 40)) return; noise(.03, .08, 600, 2, .5); },
    bumper(combo = 0) {
      if (!gate('bump', 35)) return;
      const f = semi(330, MAJ[Math.min(MAJ.length - 1, combo % 14)]);
      tone(f, .12, 'square', .16, .55); tone(f * 2, .06, 'triangle', .1, .7); noise(.04, .15, 3000, 1.5);
    },
    sling() { if (!gate('sling', 40)) return; tone(220, .08, 'square', .14, .5); noise(.05, .14, 1800, 1); },
    wall(v) { if (!gate('wall', 50)) return; noise(.04, clamp(v / 2600, .02, .14), 500, 1.2, .6); },
    post() { if (!gate('post', 40)) return; tone(700, .04, 'triangle', .1, .7); },
    drop() { if (!gate('drop', 30)) return; tone(520, .05, 'square', .14, .5); noise(.08, .18, 1200, 1, .4); },
    stand() { if (!gate('stand', 40)) return; tone(880, .07, 'square', .12, .9); },
    bank() { [0, 4, 7, 12, 16].forEach((n, i) => tone(semi(440, n), .12, 'square', .12, 1, i * .05)); },
    lane() { if (!gate('lane', 60)) return; tone(660, .06, 'triangle', .14); tone(990, .08, 'triangle', .12, 1, .05); },
    spinner() { if (!gate('spin', 45)) return; tone(1200 + Math.random() * 200, .025, 'square', .06); },
    coin(n = 0) {
      if (!gate('coin', 25)) return;
      const f = semi(988, Math.min(12, n));
      tone(f, .06, 'square', .1); tone(f * 1.335, .14, 'square', .1, 1, .06);
    },
    rampIn() { noise(.45, .18, 400, 1, 6); tone(200, .35, 'sawtooth', .05, 3); },
    rampOut() { [0, 7, 12].forEach((n, i) => tone(semi(523, n), .1, 'square', .1, 1, i * .06)); },
    rampFail() { tone(300, .3, 'triangle', .12, .5); },
    saucer() { tone(150, .2, 'square', .14, 2.5); noise(.2, .1, 300, 2, 4); },
    kick() { noise(.12, .3, 400, 1, .3, 0, 'lowpass'); tone(80, .15, 'square', .14, .4); },
    launch(p) { noise(.3, .35, 300, .7, .2, 0, 'lowpass'); tone(110 + p * 60, .25, 'square', .16, .3); tone(55, .3, 'sine', .3, .5); },
    charge(p) { if (!gate('chg', 70)) return; tone(200 + p * 500, .05, 'square', .05); },
    portal() { tone(200, .6, 'sine', .25, 6); tone(400, .6, 'triangle', .12, 4, .05); noise(.6, .12, 800, 2, 6); },
    arrive() { tone(1200, .5, 'sine', .2, .25); noise(.3, .1, 3000, 2, .3); },
    unlock() { [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => tone(semi(392, n), .1, 'square', .1, 1, i * .055)); },
    locked() { if (!gate('locked', 400)) return; tone(160, .1, 'square', .12); tone(120, .14, 'square', .12, 1, .09); },
    item() { [0, 7, 12, 16, 19, 24].forEach((n, i) => tone(semi(523, n), .09, 'square', .1, 1, i * .045)); },
    pickup() { tone(660, .08, 'square', .12, 2); tone(1320, .12, 'triangle', .1, 1, .07); },
    trick() { [0, 5, 9, 12].forEach((n, i) => tone(semi(587, n), .08, 'square', .11, 1, i * .04)); noise(.2, .08, 5000, 1, .5); },
    combo(n) { if (!gate('combo', 60)) return; tone(semi(440, Math.min(24, n)), .06, 'triangle', .1); },
    comboEnd(n) { [0, 4, 7, 12].forEach((k, i) => tone(semi(330 + n * 6, k), .1, 'square', .1, 1, i * .05)); },
    drain() { [12, 7, 4, 0, -5].forEach((n, i) => tone(semi(330, n), .18, 'square', .12, .97, i * .11)); },
    saved() { [0, 12, 7, 19].forEach((n, i) => tone(semi(440, n), .1, 'triangle', .14, 1, i * .07)); },
    nudge() { noise(.15, .3, 200, .7, .5, 0, 'lowpass'); },
    tilt() { tone(110, .6, 'sawtooth', .2, .9); tone(116, .6, 'sawtooth', .2, .9); },
    discover() { [0, 4, 7, 11, 14].forEach((n, i) => tone(semi(523, n), .2, 'triangle', .1, 1, i * .08)); },
    ui() { tone(880, .04, 'square', .08); },
    buy() { tone(988, .06, 'square', .1); tone(1318, .2, 'square', .1, 1, .07); },
    gameover() { [0, -2, -4, -5, -7, -12].forEach((n, i) => tone(semi(392, n), .3, 'square', .1, .98, i * .18)); },
    smash() { if (!gate('smash', 50)) return; noise(.2, .3, 900, .8, .3); tone(140, .15, 'square', .12, .4); },
  };

  // ---- music: 16-step loop, progression + bass + arp per theme seed --------
  let mus = null;
  const PROGS = [[0, 5, 3, 4], [0, 3, 5, 4], [0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 2, 4]];
  const SCALE_MIN = [0, 2, 3, 5, 7, 8, 10];
  const SCALE_MAJ = [0, 2, 4, 5, 7, 9, 11];
  function deg(scale, d) { return scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7); }

  S.startMusic = function (seed, tempo = 128, minor = true) {
    if (!ac) return;
    const r = RNG(seed);
    const prog = r.pick(PROGS);
    const scale = minor ? SCALE_MIN : SCALE_MAJ;
    const root = 110 * Math.pow(2, r.int(0, 6) / 12);
    const arpPat = [0, 2, 4, 2, 0, 4, 7, 4].map(v => r.chance(.2) ? v + 2 : v);
    const leadPat = Array.from({ length: 16 }, () => r.chance(.35) ? r.int(0, 9) : -1);
    const step = 60 / tempo / 4;
    if (mus) mus.stop = true;
    const m = mus = { stop: false, next: ac.currentTime + .1, i: 0 };
    (function sched() {
      if (m.stop || !ac) return;
      while (m.next < ac.currentTime + .25) {
        const bar = Math.floor(m.i / 16) % 4, st = m.i % 16;
        const ch = prog[bar];
        const t = m.next - ac.currentTime;
        if (st % 4 === 0) tone(root * Math.pow(2, deg(scale, ch) / 12) / 2, step * 3.2, 'triangle', .5, 1, t, musBus);
        if (st % 2 === 0) {
          const a = arpPat[(st / 2) % 8];
          tone(root * 2 * Math.pow(2, deg(scale, ch + a) / 12), step * 1.4, 'square', .07, 1, t, musBus);
        }
        if (bar % 2 === 1 && leadPat[st] >= 0) tone(root * 4 * Math.pow(2, deg(scale, ch + leadPat[st]) / 12), step * 2, 'square', .045, 1, t, musBus);
        if (st % 8 === 4) noise(.06, .25, 5000, 1, 1, t, 'highpass', musBus);
        if (st % 2 === 1) noise(.02, .08, 8000, 1, 1, t, 'highpass', musBus);
        if (st % 8 === 0) tone(120, .12, 'sine', .6, .3, t, musBus);
        m.next += step; m.i++;
      }
      setTimeout(sched, 60);
    })();
  };
  S.stopMusic = function () { if (mus) mus.stop = true; mus = null; };
  return S;
})();
