// Phase — six-operator FM voice engine running in an AudioWorklet.
// Parameter semantics follow the DX7 voice format (rates/levels 0-99,
// coarse/fine ratios, keyboard scaling…) so imported .syx banks play as
// intended. Level maths: 256 units = one octave of gain (≈6 dB), as in the
// classic integer implementations; an operator at full level outputs ±2,
// which as a modulator shifts the carrier phase by up to two cycles.

const TWO_PI = Math.PI * 2;
const SUB = 16; // samples per control-rate step
const OL_TAB = [0, 5, 9, 13, 17, 20, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 45, 46];
const VEL_DATA = [0, 70, 86, 97, 106, 114, 121, 126, 132, 138, 142, 148, 152, 156, 160, 163, 166, 170, 173, 174, 178, 181, 184, 186, 189, 190, 194, 196, 198, 200, 202, 205, 206, 209, 211, 214, 216, 218, 220, 222, 224, 225, 227, 229, 230, 232, 233, 235, 237, 238, 240, 241, 242, 243, 244, 246, 246, 248, 249, 250, 251, 252, 253, 254];
const EXP_SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14, 16, 19, 23, 27, 33, 39, 47, 56, 66, 80, 94, 110, 126, 142, 158, 174, 190, 206, 222, 238, 250];
const AMS_DB = [0, 4, 10, 28];
const PMS_SEMI = [0, 0.08, 0.16, 0.3, 0.55, 1.0, 2.0, 7.0];
const UNITS_PER_DB = 256 / 6.0206;

const scaleOL = x => (x >= 20 ? 28 + x : OL_TAB[x | 0]);
function scaleCurve(group, depth, curve) {
  let s;
  if (curve === 0 || curve === 3) s = (group * depth * 329) >> 12;
  else s = (EXP_SCALE[Math.min(group, EXP_SCALE.length - 1)] * depth * 329) >> 15;
  return curve < 2 ? -s : s;
}
function scaleLevel(note, op) {
  const off = note - op.bp - 21;
  if (off >= 0) return scaleCurve(((off + 1) / 3) | 0, op.rd, op.rc);
  return scaleCurve(((1 - off) / 3) | 0, op.ld, op.lc);
}
const scaleRate = (note, s) => (s * Math.min(31, Math.max(0, ((note / 3) | 0) - 7))) >> 3;
const scaleVel = (vel, s) => ((s * (VEL_DATA[vel >> 1] - 239) + 7) >> 3) << 4;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

class Env {
  constructor() { this.level = 0; this.stage = 4; this.down = false; }
  init(rates, levels, ol, rs) {
    this.r = rates; this.l = levels; this.ol = ol; this.rs = rs;
    this.down = true;
    this.advance(0);
  }
  target(L) {
    const a = ((scaleOL(L) >> 1) << 6) + this.ol - 4256;
    return a < 16 ? 16 : a;
  }
  advance(i) {
    this.stage = i;
    if (i < 4) {
      this.tgt = this.target(this.l[i]);
      this.rising = this.tgt > this.level;
      let q = (this.r[i] * 41) >> 6;
      q = Math.min(63, q + this.rs);
      // units per second (calibrated at 44.1 kHz like the reference code)
      this.inc = ((4 + (q & 3)) * Math.pow(2, 2 + (q >> 2)) / 65536) * 44100;
    }
  }
  keyUp() { if (this.down) { this.down = false; this.advance(3); } }
  step(dt) {
    if (this.stage < 3 || (this.stage === 3 && !this.down)) {
      let lv = this.level;
      if (this.rising) {
        if (lv < 1716) lv = 1716;
        lv += this.inc * dt * Math.max(1, Math.floor((4352 - lv) / 256));
        if (lv >= this.tgt) { lv = this.tgt; this.level = lv; this.advance(this.stage + 1); return lv; }
      } else {
        lv -= this.inc * dt;
        if (lv <= this.tgt) { lv = this.tgt; this.level = lv; this.advance(this.stage + 1); return lv; }
      }
      this.level = lv;
    }
    return this.level;
  }
}

// Pitch envelope: levels 0-99 with 50 = no shift, ±4 octaves at the extremes.
const pegSemi = L => { const x = (L - 50) / 50; return Math.sign(x) * 48 * Math.pow(Math.abs(x), 2.4); };
const pegSpeed = R => 0.6 * Math.pow(2, R / 8.5); // semitones per second

class Voice {
  constructor() {
    this.env = [0, 1, 2, 3, 4, 5].map(() => new Env());
    this.ph = new Float64Array(6);
    this.y = new Float64Array(6);
    this.gain = new Float64Array(6);
    this.base = new Float64Array(6); // static per-op units offset (macros)
    this.fb0 = 0; this.fb1 = 0;
    this.active = false;
    this.down = false;
    this.sustained = false;
    this.part = 0; this.note = 60; this.src = 'live';
    this.age = 0; this.time = 0;
    this.peg = 0; this.pegStage = 4;
  }
}

const LFO_HZ = s => 0.062 * Math.pow(49 / 0.062, s / 99);

class Part {
  constructor() {
    this.patch = null;
    this.macros = { bright: 0, attack: 0, release: 0, vibrato: 0 };
    this.volume = 0.8;
    this.lfoPh = 0; this.lfoVal = 0; this.sh = 0;
    this.vibPh = 0;
    this.meter = new Float64Array(6);
  }
}

class PhaseProcessor extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    this.algs = opts.processorOptions.algorithms;
    this.voices = Array.from({ length: 24 }, () => new Voice());
    this.poly = 16;
    this.parts = [new Part(), new Part()];
    this.queue = [];
    this.sustain = false;
    this.bend = 0;
    this.modWheel = 0;
    this.clock = 0;
    this.meterCount = 0;
    this.port.onmessage = e => this.onMessage(e.data);
  }

  onMessage(m) {
    if (m.t && m.t > currentTime) { this.queue.push(m); this.queue.sort((a, b) => a.t - b.t); return; }
    this.apply(m);
  }

  apply(m) {
    switch (m.type) {
      case 'patch': this.parts[m.part].patch = m.patch; this.refreshStatic(m.part); break;
      case 'macros': Object.assign(this.parts[m.part].macros, m.macros); this.refreshStatic(m.part); break;
      case 'volume': this.parts[m.part].volume = m.value; break;
      case 'on': this.noteOn(m.part, m.note, m.vel, m.src || 'live'); break;
      case 'off': this.noteOff(m.part, m.note, m.src || 'live'); break;
      case 'sustain':
        this.sustain = m.on;
        if (!m.on) for (const v of this.voices) if (v.sustained) { v.sustained = false; this.release(v); }
        break;
      case 'bend': this.bend = m.semis; break;
      case 'mod': this.modWheel = m.value; break;
      case 'poly': this.poly = clamp(m.n | 0, 1, this.voices.length); break;
      case 'stop': // stop scheduled notes from one source (arp/seq)
        this.queue = this.queue.filter(q => q.src !== m.src || q.type === 'off');
        for (const v of this.voices) if (v.src === m.src && v.down) { v.down = false; this.release(v); }
        break;
      case 'panic':
        this.queue = [];
        for (const v of this.voices) { v.active = false; v.down = false; v.sustained = false; }
        break;
    }
  }

  refreshStatic(pi) {
    for (const v of this.voices) if (v.active && v.part === pi) this.computeStatic(v);
  }

  computeStatic(v) {
    const part = this.parts[v.part];
    const alg = this.algs[part.patch.alg - 1];
    const bright = part.macros.bright * 2.2 * 256; // ±2.2 octaves of modulator gain
    for (let i = 0; i < 6; i++) v.base[i] = alg.carriers.includes(i) ? 0 : bright;
  }

  allocate(pi, note, src) {
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < this.poly; i++) {
      const v = this.voices[i];
      if (v.active && v.part === pi && v.note === note && v.src === src) return v; // retrigger
      let score;
      if (!v.active) score = 1e12;
      else if (!v.down && !v.sustained) score = 1e9 + v.age;
      else score = v.age;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return best;
  }

  noteOn(pi, note, vel, src) {
    const part = this.parts[pi];
    const p = part.patch;
    if (!p) return;
    const v = this.allocate(pi, note, src);
    const fresh = !v.active || v.part !== pi;
    v.active = true; v.down = true; v.sustained = false;
    v.part = pi; v.note = note; v.src = src; v.vel = vel; v.age = 0; v.time = 0;
    const mac = part.macros;
    for (let i = 0; i < 6; i++) {
      const op = p.ops[i];
      let ol = scaleOL(op.ol) + scaleLevel(note, op);
      ol = Math.min(127, ol) << 5;
      ol = Math.max(0, ol + scaleVel(vel, op.vel));
      const r = op.r.slice();
      r[0] = clamp(Math.round(r[0] - mac.attack * 45), 0, 99);
      r[3] = clamp(Math.round(r[3] - mac.release * 45), 0, 99);
      if (fresh) v.env[i].level = 0;
      v.env[i].init(r, op.l, ol, scaleRate(note, op.rs));
      if (fresh || p.oks) v.ph[i] = p.oks ? 0 : Math.random() * TWO_PI;
      if (fresh) { v.y[i] = 0; v.gain[i] = 0; }
    }
    if (fresh) { v.fb0 = 0; v.fb1 = 0; }
    v.peg = pegSemi(p.pitchEnv.l[3]);
    v.pegStage = 0;
    if (p.lfo.sync) part.lfoPh = 0;
    this.computeStatic(v);
  }

  release(v) {
    for (const e of v.env) e.keyUp();
    v.pegStage = 3;
  }

  noteOff(pi, note, src) {
    for (const v of this.voices) {
      if (v.active && v.down && v.part === pi && v.note === note && v.src === src) {
        v.down = false;
        if (this.sustain && src === 'live') v.sustained = true;
        else this.release(v);
      }
    }
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    const L = out[0], R = out[1] || out[0];
    const n = L.length;
    const dt = SUB / sampleRate;
    L.fill(0);
    for (const part of this.parts) part.meter.fill(0);

    for (let s0 = 0; s0 < n; s0 += SUB) {
      const tNow = currentTime + s0 / sampleRate;
      while (this.queue.length && this.queue[0].t <= tNow) this.apply(this.queue.shift());

      // Per-part LFOs (shared by all voices of that part, like the original)
      for (const part of this.parts) {
        const p = part.patch;
        if (!p) continue;
        const prev = part.lfoPh;
        part.lfoPh = (part.lfoPh + LFO_HZ(p.lfo.speed) * dt) % 1;
        const ph = part.lfoPh;
        let x;
        switch (p.lfo.wave) {
          case 0: x = ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph; break;
          case 1: x = 1 - 2 * ph; break;
          case 2: x = 2 * ph - 1; break;
          case 3: x = ph < 0.5 ? 1 : -1; break;
          case 4: x = Math.sin(TWO_PI * ph); break;
          default: if (ph < prev) part.sh = Math.random() * 2 - 1; x = part.sh;
        }
        part.lfoVal = x;
        part.vibPh = (part.vibPh + 5.6 * dt) % 1;
      }

      for (const v of this.voices) {
        if (!v.active) continue;
        const part = this.parts[v.part];
        const p = part.patch;
        const alg = this.algs[p.alg - 1];
        v.time += dt;
        v.age += 1;

        // pitch envelope
        // (stage 3 = release towards L4: it waits for the key to come up, so
        // reaching L3 at the end of stage 2 is the sustain point)
        if (v.pegStage < 4 && !(v.pegStage === 3 && v.down)) {
          const tgt = pegSemi(p.pitchEnv.l[v.pegStage]);
          const sp = pegSpeed(p.pitchEnv.r[v.pegStage]) * dt;
          if (Math.abs(tgt - v.peg) <= sp) { v.peg = tgt; v.pegStage++; }
          else v.peg += Math.sign(tgt - v.peg) * sp;
        }
        const delay = p.lfo.delay ? Math.pow(p.lfo.delay / 99, 2) * 5 : 0;
        const lfoAmt = delay ? Math.min(1, v.time / delay) : 1;
        const pmd = (p.lfo.pmd / 99) * PMS_SEMI[p.lfo.pms] * lfoAmt;
        const vib = (part.macros.vibrato + this.modWheel) * 0.45 * Math.sin(TWO_PI * part.vibPh) * Math.min(1, v.time / 0.35);
        const semis = v.note - 69 + (p.transpose - 24) + this.bend + v.peg + pmd * part.lfoVal + vib;
        const baseHz = 440 * Math.pow(2, semis / 12);
        const amUni = (1 - part.lfoVal) * 0.5 * (p.lfo.amd / 99) * lfoAmt;

        const inc = this._inc || (this._inc = new Float64Array(6));
        const g1 = this._g1 || (this._g1 = new Float64Array(6));
        let alive = false;
        for (let i = 0; i < 6; i++) {
          const op = p.ops[i];
          let hz = op.fixed
            ? Math.pow(10, (op.coarse & 3) + op.fine / 100)
            : baseHz * (op.coarse === 0 ? 0.5 : op.coarse) * (1 + op.fine / 100);
          const det = op.det - 7;
          if (det) hz *= Math.pow(2, (det * (1.2 + 12 / Math.sqrt(Math.max(hz, 20)))) / 1200);
          inc[i] = (TWO_PI * hz) / sampleRate;
          const lv = v.env[i].step(dt);
          const units = lv + v.base[i] - amUni * AMS_DB[op.ams] * UNITS_PER_DB;
          g1[i] = op.ol === 0 && op.vel === 0 ? 0 : Math.pow(2, units / 256 - 14);
          if (alg.carriers.includes(i) && v.env[i].stage < 4 && lv > 600) alive = true;
          const m = g1[i] * 0.5;
          if (m > part.meter[i]) part.meter[i] = m;
        }
        if (!v.down && !v.sustained && !alive) { v.active = false; continue; }

        const fbScale = p.fb ? Math.pow(2, p.fb - 9) : 0;
        const fbSrc = alg.fbSrc, fbDst = alg.fbDst;
        const mods = alg.mods, car = alg.carriers;
        const vol = part.volume * 0.18;
        const ph = v.ph, y = v.y, g0 = v.gain;
        for (let k = 0; k < SUB; k++) {
          const f = (k + 1) / SUB;
          for (let i = 5; i >= 0; i--) {
            let mod = 0;
            const mi = mods[i];
            for (let j = 0; j < mi.length; j++) mod += y[mi[j]];
            if (i === fbDst) mod += (v.fb0 + v.fb1) * fbScale;
            let a = ph[i] + inc[i];
            if (a > TWO_PI) a -= TWO_PI;
            ph[i] = a;
            y[i] = Math.sin(a + TWO_PI * mod) * (g0[i] + (g1[i] - g0[i]) * f);
            if (i === fbSrc) { v.fb1 = v.fb0; v.fb0 = y[i]; }
          }
          let sum = 0;
          for (let c = 0; c < car.length; c++) sum += y[car[c]];
          L[s0 + k] += sum * vol;
        }
        for (let i = 0; i < 6; i++) g0[i] = g1[i];
      }
    }
    if (R !== L) R.set(L);

    this.meterCount += n;
    if (this.meterCount >= 1536) {
      this.meterCount = 0;
      let busy = [0, 0];
      for (const v of this.voices) if (v.active) busy[v.part]++;
      this.port.postMessage({ type: 'meter', a: Array.from(this.parts[0].meter), b: Array.from(this.parts[1].meter), voices: busy });
    }
    return true;
  }
}

registerProcessor('phase-fm', PhaseProcessor);
