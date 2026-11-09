// Audio graph: FM worklet → global filter → chorus → delay + reverb sends →
// compressor → master. Everything here runs on the main thread; the voices
// themselves live in fm-worklet.js.
import { ALGORITHMS } from './algorithms.js?v=202611091446';

const V = '?v=202611091446';
let ctx, node, nodes = {};
let meterCb = () => {};
export const audio = () => ctx;
export const onMeter = fn => { meterCb = fn; };

const post = m => node && node.port.postMessage(m);

export async function startAudio() {
  if (ctx) { if (ctx.state !== 'running') await ctx.resume(); return ctx; }
  // iOS: play through the ring/silent switch when the browser supports it
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  // Unlock on iOS while still inside the tap: resume and play one silent buffer
  ctx.resume();
  const unlock = ctx.createBufferSource();
  unlock.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  unlock.connect(ctx.destination);
  unlock.start();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx.state !== 'running') ctx.resume(); });
  await ctx.audioWorklet.addModule('js/fm-worklet.js' + V);
  node = new AudioWorkletNode(ctx, 'phase-fm', {
    numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
    processorOptions: { algorithms: ALGORITHMS },
  });
  node.port.onmessage = e => { if (e.data.type === 'meter') meterCb(e.data); };
  buildFx();
  if (ctx.state !== 'running') await ctx.resume();
  return ctx;
}

function buildFx() {
  const c = ctx;
  const n = nodes;
  n.lp = new BiquadFilterNode(c, { type: 'lowpass', frequency: 20000, Q: 0.7 });
  n.hp = new BiquadFilterNode(c, { type: 'highpass', frequency: 10, Q: 0.7 });
  n.analyser = new AnalyserNode(c, { fftSize: 2048, smoothingTimeConstant: 0 });
  node.connect(n.lp).connect(n.hp);
  n.hp.connect(n.analyser);

  // Chorus: two modulated delay lines panned apart, mixed with the dry signal
  n.chIn = new GainNode(c);
  n.chDry = new GainNode(c, { gain: 1 });
  n.chWet = new GainNode(c, { gain: 0 });
  n.chOut = new GainNode(c);
  n.hp.connect(n.chIn);
  n.chIn.connect(n.chDry).connect(n.chOut);
  n.chLfo = [];
  [-0.8, 0.8].forEach((pan, i) => {
    const d = new DelayNode(c, { delayTime: 0.012 + i * 0.004, maxDelayTime: 0.05 });
    const lfo = new OscillatorNode(c, { frequency: 0.6, type: 'sine' });
    const depth = new GainNode(c, { gain: 0.002 });
    const p = new StereoPannerNode(c, { pan });
    lfo.connect(depth).connect(d.delayTime);
    lfo.start(c.currentTime + i * 0.37);
    n.chIn.connect(d).connect(p).connect(n.chWet);
    n.chLfo.push({ lfo, depth });
  });
  n.chWet.connect(n.chOut);

  // Bus feeding the compressor
  n.bus = new GainNode(c);
  n.chOut.connect(n.bus);

  // Ping-pong delay (send)
  n.dlSend = new GainNode(c, { gain: 0 });
  n.dlL = new DelayNode(c, { maxDelayTime: 2, delayTime: 0.3 });
  n.dlR = new DelayNode(c, { maxDelayTime: 2, delayTime: 0.3 });
  n.dlFb = new GainNode(c, { gain: 0.35 });
  n.dlTone = new BiquadFilterNode(c, { type: 'lowpass', frequency: 5000 });
  n.dlPanL = new StereoPannerNode(c, { pan: -0.7 });
  n.dlPanR = new StereoPannerNode(c, { pan: 0.7 });
  n.chOut.connect(n.dlSend).connect(n.dlTone).connect(n.dlL);
  n.dlL.connect(n.dlPanL).connect(n.bus);
  n.dlL.connect(n.dlR);
  n.dlR.connect(n.dlPanR).connect(n.bus);
  n.dlR.connect(n.dlFb).connect(n.dlTone);

  // Reverb (send) with a generated impulse response
  n.rvSend = new GainNode(c, { gain: 0 });
  n.rv = new ConvolverNode(c);
  n.rvTone = new BiquadFilterNode(c, { type: 'lowpass', frequency: 6000 });
  n.chOut.connect(n.rvSend).connect(n.rv).connect(n.rvTone).connect(n.bus);
  // the delay feeds the reverb a little too, so echoes sit in the same room
  n.dlPanL.connect(n.rvSend); n.dlPanR.connect(n.rvSend);

  n.comp = new DynamicsCompressorNode(c, { threshold: -12, knee: 8, ratio: 5, attack: 0.004, release: 0.2 });
  n.master = new GainNode(c, { gain: 0.8 });
  n.bus.connect(n.comp).connect(n.master).connect(c.destination);
}

let irSize = -1;
function makeIR(size) {
  const c = ctx;
  const secs = 0.6 + size * 5.4;
  const len = Math.round(secs * c.sampleRate);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += 0.5 * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - t, 2.2) * (i < 200 ? i / 200 : 1);
    }
  }
  nodes.rv.buffer = ir;
}

const ramp = (param, v, t = 0.04) => param.setTargetAtTime(v, ctx.currentTime, t);

// fx: { filter: {pos -1…1, res 0…1}, chorus: {on, rate, depth, mix},
//       delay: {on, beats, fb, mix, tone}, reverb: {on, size, tone, mix}, master }
export function setFx(fx, tempo) {
  if (!ctx) return;
  const n = nodes;
  const pos = fx.filter.pos;
  const q = 0.7 + fx.filter.res * 12;
  ramp(n.lp.frequency, pos < 0 ? 20000 * Math.pow(2, pos * 9.5) : 20000);
  ramp(n.hp.frequency, pos > 0 ? 10 * Math.pow(2, pos * 10.5) : 10);
  n.lp.Q.value = pos < -0.02 ? q : 0.7;
  n.hp.Q.value = pos > 0.02 ? q : 0.7;

  const ch = fx.chorus;
  ramp(n.chWet.gain, ch.on ? ch.mix * 1.2 : 0);
  ramp(n.chDry.gain, ch.on ? 1 - ch.mix * 0.35 : 1);
  n.chLfo.forEach(({ lfo, depth }, i) => {
    ramp(lfo.frequency, ch.rate * (i ? 1.13 : 1));
    ramp(depth.gain, 0.0005 + ch.depth * 0.0045);
  });

  const dl = fx.delay;
  const secs = Math.min(2, (60 / tempo) * dl.beats);
  ramp(n.dlL.delayTime, secs, 0.08);
  ramp(n.dlR.delayTime, secs, 0.08);
  ramp(n.dlSend.gain, dl.on ? dl.mix : 0);
  ramp(n.dlFb.gain, Math.min(0.92, dl.fb));
  ramp(n.dlTone.frequency, 800 * Math.pow(2, dl.tone * 4.5));

  const rv = fx.reverb;
  if (Math.abs(rv.size - irSize) > 0.02) { irSize = rv.size; makeIR(rv.size); }
  ramp(n.rvSend.gain, rv.on ? rv.mix * 0.9 : 0);
  ramp(n.rvTone.frequency, 1200 * Math.pow(2, rv.tone * 4));

  ramp(n.master.gain, fx.master);
}

export const analyser = () => nodes.analyser;

export const setPatch = (part, patch) => post({ type: 'patch', part, patch });
export const setMacros = (part, macros) => post({ type: 'macros', part, macros });
export const setVolume = (part, value) => post({ type: 'volume', part, value });
export const noteOn = (part, note, vel, src = 'live', t = 0) => post({ type: 'on', part, note, vel, src, t });
export const noteOff = (part, note, src = 'live', t = 0) => post({ type: 'off', part, note, src, t });
export const sustain = on => post({ type: 'sustain', on });
export const bend = semis => post({ type: 'bend', semis });
export const modWheel = value => post({ type: 'mod', value });
export const setPoly = n => post({ type: 'poly', n });
export const stopSource = src => post({ type: 'stop', src });
export const panic = () => post({ type: 'panic' });
