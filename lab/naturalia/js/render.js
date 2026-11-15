// Rendu isométrique du monde : tuiles par diagonales, décor, entités, musée découpé en tranches.
import { bakeAll, LH } from './tiles.js';
import { G, MW, MH } from './world.js';
import { bakeDecor, bakeMuseum, bakePier, bakeShadow } from './sprites.js';
import { hash2 } from './util.js';

const MAXLV = 11;

export class WorldView {
  constructor(W) {
    this.W = W;
    this.T = bakeAll();
    this.D = bakeDecor();
    this.pier = bakePier();
    this.shadowTree = bakeShadow(11, 4);
    this.shadowSmall = bakeShadow(6, 2);
    const m = W.museum;
    this.mus = bakeMuseum(m.w, m.d);
    this.patterns = new Map();
    this.var = new Uint8Array(MW * MH);
    for (let k = 0; k < MW * MH; k++) this.var[k] = Math.floor(hash2(k % MW, (k / MW) | 0, W.seed + 1) * 4);
    // tranches du musée : [x0 local, largeur, diagonale]
    const sl = [];
    for (let a = 0; a < m.w; a++) sl.push([(a - m.d) * 16 + this.mus.offX, 16, m.i + a + m.j + m.d - 1]);
    for (let b = 0; b < m.d; b++) sl.push([(m.w - b - 1) * 16 + this.mus.offX, 16, m.i + m.w - 1 + m.j + b]);
    sl.sort((p, q) => p[0] - q[0]);
    sl[0][1] += sl[0][0]; sl[0][0] = 0;
    const last = sl[sl.length - 1];
    last[1] = this.mus.c.width - last[0];
    this.musSlices = sl;
  }

  heightAt(i, j) {
    const W = this.W;
    if (!W.inb(i, j)) return 0;
    const k = W.idx(i, j);
    return W.height[k];
  }

  draw(g, vw, vh, cam, t, ents, night) {
    const W = this.W, T = this.T;
    const ox = Math.round(vw / 2 - cam.x), oy = Math.round(vh / 2 - cam.y);
    // haute mer en fond
    const df = Math.floor(t * 2) % 8;
    let pat = this.patterns.get(df);
    if (!pat) { pat = g.createPattern(T.deep[df], 'repeat'); this.patterns.set(df, pat); }
    g.save();
    g.translate(((ox % 64) + 64) % 64 - 64, ((oy % 32) + 32) % 32 - 32);
    g.fillStyle = pat; g.fillRect(0, 0, vw + 128, vh + 64);
    g.restore();

    const wf = Math.floor(t * 3) % 4, ff = Math.floor(t * 1.6) % 2;
    // entités groupées par diagonale
    const buckets = new Map();
    for (const e of ents) {
      const s = Math.floor(e.i) + Math.floor(e.j);
      if (!buckets.has(s)) buckets.set(s, []);
      buckets.get(s).push(e);
    }
    const m = W.museum;
    const musX = (m.i - m.j) * 16 + ox - this.mus.offX, musY = (m.i + m.j) * 8 - m.h * LH + oy - this.mus.offY;

    const sMin = Math.floor((cam.y - vh / 2) / 8) - 3, sMax = Math.ceil((cam.y + vh / 2) / 8) + MAXLV + 3;
    const H = (i, j) => (i < 0 || j < 0 || i >= MW || j >= MH ? 0 : W.height[j * MW + i]);
    for (let s = Math.max(0, sMin); s <= Math.min(MW + MH - 2, sMax); s++) {
      const iMin = Math.max(0, Math.floor((s + (cam.x - vw / 2) / 16) / 2) - 2);
      const iMax = Math.min(MW - 1, Math.ceil((s + (cam.x + vw / 2) / 16) / 2) + 2);
      for (let i = iMin; i <= iMax; i++) {
        const j = s - i;
        if (j < 0 || j >= MH) continue;
        const k = j * MW + i, gr = W.ground[k], h = W.height[k];
        const X = (i - j) * 16 + ox - 16, Y = (i + j) * 8 + oy;
        if (gr <= G.REEF) {
          if (gr !== G.DEEP) g.drawImage(T.water[gr === G.REEF ? 'reef' : 'sea'][(wf + ((i * 3 + j) & 3)) & 3], X, Y);
          if (W.dist[k] === 1) {
            if (H(i - 1, j) > 0) g.drawImage(T.foam[ff][0], X, Y);
            if (H(i, j - 1) > 0) g.drawImage(T.foam[ff][1], X, Y);
            if (H(i + 1, j) > 0) g.drawImage(T.foam[ff][2], X, Y);
            if (H(i, j + 1) > 0) g.drawImage(T.foam[ff][3], X, Y);
          }
          if (W.pier.has(k)) g.drawImage(this.pier, X, Y - LH);
          continue;
        }
        const top = Y - h * LH;
        g.drawImage(T.column(gr, h, this.var[k]), X, top);
        if (gr === G.FRESH) g.drawImage(T.water.fresh[(wf + (i & 1)) & 3], X, top);
        if (gr === G.LAVA) g.drawImage(T.water.lava[(wf + (j & 1)) & 3], X, top);
        const h0 = H(i - 1, j), h1 = H(i, j - 1), h2 = H(i + 1, j), h3 = H(i, j + 1);
        if (h2 < h) g.drawImage(T.edge.rim[2], X, top);
        if (h3 < h) g.drawImage(T.edge.rim[3], X, top);
        if (h0 < h) g.drawImage(T.edge.out[0], X, top); else if (h0 > h) g.drawImage(T.edge.ao[0], X, top);
        if (h1 < h) g.drawImage(T.edge.out[1], X, top); else if (h1 > h) g.drawImage(T.edge.ao[1], X, top);
      }
      // décor de la diagonale
      for (let i = iMin; i <= iMax; i++) {
        const j = s - i;
        if (j < 0 || j >= MH) continue;
        const k = j * MW + i, o = W.obj[k];
        if (!o) continue;
        const spr = this.D[o.t][(o.v || 0) % this.D[o.t].length];
        const cx = (i - j) * 16 + ox, cy = (i + j) * 8 + 8 + oy - W.height[k] * LH;
        if (o.t === 'chene' || o.t === 'kapok' || o.t === 'saule' || o.t === 'palmier' || o.t === 'bouleau' || o.t === 'sapin' || o.t === 'sapinNeige') g.drawImage(this.shadowTree, cx - 12, cy - 3);
        g.drawImage(spr.c, cx - spr.ax, cy - spr.ay);
      }
      // tranches du musée
      for (const [x0, wd, diag] of this.musSlices) if (diag === s) g.drawImage(this.mus.c, x0, 0, wd, this.mus.c.height, musX + x0, musY, wd, this.mus.c.height);
      const b = buckets.get(s);
      if (b) {
        b.sort((p, q) => p.i + p.j - (q.i + q.j));
        for (const e of b) e.draw(g, (e.i - e.j) * 16 + ox, (e.i + e.j) * 8 + oy - e.z * LH);
      }
    }
    this.lastOrigin = { ox, oy, musX, musY };
  }

  drawNightLights(g) {
    const { musX, musY } = this.lastOrigin;
    g.drawImage(this.mus.light, musX, musY);
  }
}
