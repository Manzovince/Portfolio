// Ambiance sonore entièrement synthétisée : mer, vent, pluie, musique douce et bruitages.

const DAY = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83];   // ré majeur pentatonique
const NIGHT = [57, 60, 62, 64, 67, 69, 72, 74, 76];      // la mineur pentatonique
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Sound {
  constructor(muted = false) {
    this.ctx = null;
    this.muted = muted;
    this.noteTimer = 1;
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    // Réverbération : réponse impulsionnelle de bruit décroissant.
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverb.connect(wet).connect(this.master);

    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    let b = 0;
    for (let i = 0; i < nd.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; nd[i] = b * 3.5; }
    const wb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const wd = wb.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    this.whiteBuf = wb;

    const loop = (buf, ...nodes) => {
      const s = ctx.createBufferSource();
      s.buffer = buf; s.loop = true;
      let n = s;
      for (const node of nodes) { n.connect(node); n = node; }
      n.connect(this.master);
      s.start();
      return nodes[nodes.length - 1];
    };
    this.seaFilter = ctx.createBiquadFilter(); this.seaFilter.type = 'lowpass'; this.seaFilter.frequency.value = 420;
    this.sea = loop(nb, this.seaFilter, ctx.createGain());
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.Q.value = 0.9;
    this.wind = loop(wb, this.windFilter, ctx.createGain());
    const rh = ctx.createBiquadFilter(); rh.type = 'highpass'; rh.frequency.value = 1800;
    const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 7000;
    this.rain = loop(wb, rh, rl, ctx.createGain());
    for (const g of [this.sea, this.wind, this.rain]) g.gain.value = 0;
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.2);
  }

  update(dt, s) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const swell = 0.5 + 0.5 * Math.sin(now * 0.55) * Math.sin(now * 0.23 + 1);
    this.sea.gain.setTargetAtTime((0.1 + 0.16 * swell) * (0.6 + s.wind) * (s.walking ? 0.6 : 1), now, 0.3);
    this.seaFilter.frequency.setTargetAtTime(300 + 500 * swell + s.speed * 30, now, 0.3);
    this.wind.gain.setTargetAtTime(0.012 + 0.05 * s.wind * s.wind + s.speed * 0.002 + s.luff * 0.03, now, 0.5);
    this.windFilter.frequency.setTargetAtTime(380 + 900 * s.wind + s.speed * 25, now, 0.8);
    this.rain.gain.setTargetAtTime(s.rain * 0.09, now, 1);

    this.noteTimer -= dt;
    if (this.noteTimer <= 0) {
      const scale = s.night > 0.5 ? NIGHT : DAY;
      const busy = s.storm > 0.5 ? 0.3 : 1;
      this.noteTimer = (s.night > 0.5 ? 2.6 : 1.7) + Math.random() * 3 / busy;
      const m = scale[Math.floor(Math.random() * scale.length)];
      this.pluck(mtof(m), 0.07);
      if (Math.random() < 0.3) this.pluck(mtof(m - 12), 0.05, 0.02);
      if (Math.random() < 0.15) this.pad(mtof(scale[0] - 12), 5);
    }
  }

  pluck(f, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    o2.type = 'sine'; o2.frequency.value = f * 2.01;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 2.6);
    o.connect(g); o2.connect(g);
    g.connect(this.master); g.connect(this.reverb);
    o.start(t); o2.start(t); o.stop(t + 2.7); o2.stop(t + 2.7);
  }

  pad(f, dur) {
    const c = this.ctx, t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur);
    for (const k of [1, 1.5, 2.003]) {
      const o = c.createOscillator();
      o.type = 'sine'; o.frequency.value = f * k;
      o.connect(g); o.start(t); o.stop(t + dur);
    }
    g.connect(this.reverb);
  }

  noise(dur, freq, q, vol, type = 'bandpass', sweep = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.whiteBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random()); s.stop(t + dur);
  }

  step() { this.noise(0.09, 900 + Math.random() * 400, 1.2, 0.06); }
  splash() { this.noise(0.6, 1400, 0.7, 0.12, 'bandpass', 500); }
  thunder() { this.noise(3.5, 160, 0.5, 0.5, 'lowpass', 60); }

  chime() {
    if (!this.ctx) return;
    [74, 78, 81, 86].forEach((m, i) => this.pluck(mtof(m), 0.08, i * 0.12));
  }

  gull() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 2); k++) {
      const o = c.createOscillator(), g = c.createGain(), t0 = t + k * 0.28;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1500, t0);
      o.frequency.exponentialRampToValueAtTime(900, t0 + 0.22);
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 3;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.025, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.24);
      o.connect(f).connect(g); g.connect(this.master); g.connect(this.reverb);
      o.start(t0); o.stop(t0 + 0.26);
    }
  }

  whale() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.linearRampToValueAtTime(260, t + 1.6);
    o.frequency.linearRampToValueAtTime(110, t + 3.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.8);
    g.gain.linearRampToValueAtTime(0, t + 3.8);
    o.connect(g); g.connect(this.reverb); g.connect(this.master);
    o.start(t); o.stop(t + 4);
  }
}
