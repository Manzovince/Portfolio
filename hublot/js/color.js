// Correction de la dominante bleue/verte.
// L'eau absorbe d'abord le rouge, puis l'orange et le jaune : plus on descend,
// plus il faut remonter le rouge et retirer le voile bleu.

export const NEUTRAL = { gain: [1, 1, 1], offs: [0, 0, 0], sat: 1 };

export const PRESETS = {
  off: NEUTRAL,
  shallow: { gain: [1.35, 1.02, 0.92], offs: [0, 0, -0.02], sat: 1.1 },
  mid: { gain: [1.9, 1.0, 0.86], offs: [-0.01, -0.02, -0.04], sat: 1.18 },
  deep: { gain: [2.7, 1.05, 0.8], offs: [-0.02, -0.04, -0.06], sat: 1.25 },
};

export const LABELS = { off: 'Aucune', auto: 'Auto', shallow: '0–5 m', mid: '5–15 m', deep: '15 m +' };

// Mode auto : étirement des niveaux canal par canal (1er et 99e centile),
// ce qui rééquilibre le blanc et enlève le voile. Le rouge est borné pour ne
// pas faire exploser le bruit quand il n'en reste presque plus.
export class AutoColor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 96; this.canvas.height = 72;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.lo = [0, 0, 0];
    this.hi = [1, 1, 1];
    this.ready = false;
  }

  sample(source) {
    const { ctx, canvas } = this;
    try { ctx.drawImage(source, 0, 0, canvas.width, canvas.height); } catch { return; }
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      hist[0][d[i]]++; hist[1][d[i + 1]]++; hist[2][d[i + 2]]++; n++;
    }
    const pct = (h, q) => {
      let acc = 0; const target = q * n;
      for (let v = 0; v < 256; v++) { acc += h[v]; if (acc >= target) return v / 255; }
      return 1;
    };
    const k = this.ready ? 0.2 : 1; // lissage pour éviter le scintillement
    this.ready = true;
    for (let c = 0; c < 3; c++) {
      let lo = pct(hist[c], 0.01), hi = pct(hist[c], 0.99);
      lo = Math.min(lo, 0.35);
      hi = Math.max(hi, lo + (c === 0 ? 0.22 : 0.3)); // rouge : gain max ≈ 4.5
      this.lo[c] += (lo - this.lo[c]) * k;
      this.hi[c] += (hi - this.hi[c]) * k;
    }
  }

  params() {
    const gain = [], offs = [];
    for (let c = 0; c < 3; c++) {
      const g = 1 / (this.hi[c] - this.lo[c]);
      gain.push(g); offs.push(-this.lo[c] * g);
    }
    return { gain, offs, sat: 1.12 };
  }
}

// Applique une intensité (0..1) entre neutre et la correction pleine.
export function withStrength(p, s) {
  return {
    gain: p.gain.map(g => 1 + (g - 1) * s),
    offs: p.offs.map(o => o * s),
    sat: 1 + (p.sat - 1) * s,
  };
}
