// Voice data model (DX7 semantics) and .syx import.
// A patch: { name, alg 1-32, fb 0-7, oks 0/1, transpose 0-48 (24 = none),
//   lfo: { speed, delay, pmd, amd, sync, wave 0-5, pms 0-7 },
//   pitchEnv: { r: [4], l: [4] },
//   ops: [op1 … op6] each { r: [4], l: [4], bp, ld, rd, lc, rc, rs, ams, vel,
//          ol, fixed 0/1, coarse 0-31, fine 0-99, det 0-14 (7 = none) } }

export function initOp(over = {}) {
  return {
    r: [99, 99, 99, 99], l: [99, 99, 99, 0],
    bp: 39, ld: 0, rd: 0, lc: 0, rc: 0, rs: 0, ams: 0, vel: 0,
    ol: 0, fixed: 0, coarse: 1, fine: 0, det: 7,
    ...over,
  };
}

export function initPatch(name = 'INIT') {
  const ops = [0, 1, 2, 3, 4, 5].map(() => initOp());
  ops[0].ol = 99;
  return {
    name, alg: 1, fb: 0, oks: 1, transpose: 24,
    lfo: { speed: 35, delay: 0, pmd: 0, amd: 0, sync: 1, wave: 0, pms: 3 },
    pitchEnv: { r: [99, 99, 99, 99], l: [50, 50, 50, 50] },
    ops,
  };
}

export const clonePatch = p => JSON.parse(JSON.stringify(p));

const clampv = (v, max) => Math.max(0, Math.min(max, v | 0));
const nameOf = bytes => String.fromCharCode(...bytes.map(b => (b >= 32 && b < 127 ? b : 32))).replace(/\s+$/, '') || 'SANS NOM';

// One voice in the packed 128-byte bulk format.
function unpackVoice(d) {
  const ops = [];
  for (let k = 0; k < 6; k++) {
    const o = d.subarray(k * 17, k * 17 + 17); // op6 first
    ops[5 - k] = {
      r: [o[0], o[1], o[2], o[3]].map(v => clampv(v, 99)),
      l: [o[4], o[5], o[6], o[7]].map(v => clampv(v, 99)),
      bp: clampv(o[8], 99), ld: clampv(o[9], 99), rd: clampv(o[10], 99),
      lc: o[11] & 3, rc: (o[11] >> 2) & 3,
      rs: o[12] & 7, det: clampv((o[12] >> 3) & 15, 14),
      ams: o[13] & 3, vel: (o[13] >> 2) & 7,
      ol: clampv(o[14], 99),
      fixed: o[15] & 1, coarse: (o[15] >> 1) & 31,
      fine: clampv(o[16], 99),
    };
  }
  return {
    name: nameOf([...d.subarray(118, 128)]),
    alg: (d[110] & 31) + 1,
    fb: d[111] & 7,
    oks: (d[111] >> 3) & 1,
    transpose: clampv(d[117], 48),
    lfo: {
      speed: clampv(d[112], 99), delay: clampv(d[113], 99),
      pmd: clampv(d[114], 99), amd: clampv(d[115], 99),
      sync: d[116] & 1, wave: Math.min(5, (d[116] >> 1) & 7), pms: (d[116] >> 4) & 7,
    },
    pitchEnv: {
      r: [d[102], d[103], d[104], d[105]].map(v => clampv(v, 99)),
      l: [d[106], d[107], d[108], d[109]].map(v => clampv(v, 99)),
    },
    ops,
  };
}

// Single voice in the unpacked 155-byte format.
function unpackSingle(d) {
  const ops = [];
  for (let k = 0; k < 6; k++) {
    const o = d.subarray(k * 21, k * 21 + 21);
    ops[5 - k] = {
      r: [o[0], o[1], o[2], o[3]].map(v => clampv(v, 99)),
      l: [o[4], o[5], o[6], o[7]].map(v => clampv(v, 99)),
      bp: clampv(o[8], 99), ld: clampv(o[9], 99), rd: clampv(o[10], 99),
      lc: o[11] & 3, rc: o[12] & 3, rs: o[13] & 7, ams: o[14] & 3, vel: o[15] & 7,
      ol: clampv(o[16], 99), fixed: o[17] & 1, coarse: o[18] & 31, fine: clampv(o[19], 99),
      det: clampv(o[20], 14),
    };
  }
  const g = d.subarray(126);
  return {
    name: nameOf([...g.subarray(19, 29)]),
    alg: (g[8] & 31) + 1, fb: g[9] & 7, oks: g[10] & 1,
    lfo: { speed: clampv(g[11], 99), delay: clampv(g[12], 99), pmd: clampv(g[13], 99), amd: clampv(g[14], 99), sync: g[15] & 1, wave: Math.min(5, g[16]), pms: g[17] & 7 },
    transpose: clampv(g[18], 48),
    pitchEnv: { r: [g[0], g[1], g[2], g[3]].map(v => clampv(v, 99)), l: [g[4], g[5], g[6], g[7]].map(v => clampv(v, 99)) },
    ops,
  };
}

// Parse any .syx file: one or more 32-voice bulk dumps, single-voice dumps,
// or a bare 4096-byte bank without the SysEx wrapper.
export function parseSyx(buffer) {
  const b = new Uint8Array(buffer);
  const voices = [];
  for (let i = 0; i < b.length - 5; i++) {
    if (b[i] !== 0xf0 || b[i + 1] !== 0x43) continue;
    const fmt = b[i + 3];
    if (fmt === 0x09 && i + 6 + 4096 <= b.length) {
      const data = b.subarray(i + 6, i + 6 + 4096);
      for (let v = 0; v < 32; v++) voices.push(unpackVoice(data.subarray(v * 128, v * 128 + 128)));
      i += 4100;
    } else if (fmt === 0x00 && i + 6 + 155 <= b.length) {
      voices.push(unpackSingle(b.subarray(i + 6, i + 6 + 155)));
      i += 160;
    }
  }
  if (!voices.length && (b.length === 4096 || b.length === 4104)) {
    const data = b.length === 4096 ? b : b.subarray(6, 4102);
    for (let v = 0; v < 32; v++) voices.push(unpackVoice(data.subarray(v * 128, v * 128 + 128)));
  }
  return voices;
}

// Pack a patch back into the 128-byte bulk format (for exporting a bank).
function packVoice(p, out) {
  for (let k = 0; k < 6; k++) {
    const o = p.ops[5 - k], j = k * 17;
    out.set([...o.r, ...o.l, o.bp, o.ld, o.rd, (o.rc << 2) | o.lc, (o.det << 3) | o.rs, (o.vel << 2) | o.ams, o.ol, (o.coarse << 1) | o.fixed, o.fine], j);
  }
  out.set([...p.pitchEnv.r, ...p.pitchEnv.l, p.alg - 1, (p.oks << 3) | p.fb, p.lfo.speed, p.lfo.delay, p.lfo.pmd, p.lfo.amd,
    (p.lfo.pms << 4) | (p.lfo.wave << 1) | p.lfo.sync, p.transpose], 102);
  const name = (p.name || '').toUpperCase().padEnd(10).slice(0, 10);
  for (let i = 0; i < 10; i++) out[118 + i] = name.charCodeAt(i) & 127;
}

export function buildSyx(patches) {
  const b = new Uint8Array(4104);
  b.set([0xf0, 0x43, 0x00, 0x09, 0x20, 0x00]);
  for (let v = 0; v < 32; v++) packVoice(patches[v] || patches[patches.length - 1] || initPatch(), b.subarray(6 + v * 128, 6 + v * 128 + 128));
  let sum = 0;
  for (let i = 6; i < 4102; i++) sum += b[i];
  b[4102] = (128 - (sum & 127)) & 127;
  b[4103] = 0xf7;
  return b;
}
