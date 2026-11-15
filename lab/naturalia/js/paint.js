// Petit « pinceau » pixel : on dessine des formes dans une grille de couleurs,
// puis on ajoute ombrage et contour sélectif (contour = version sombre de la couleur voisine).
import { shade, canvas } from './util.js';

export const INK = '#2a2238';

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Array(w * h).fill(null);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.d[y * this.w + x];
  }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
    return this;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }
  // Ellipse pleine ; si `lit` vaut true, ombrage doux (lumière en haut à gauche).
  ell(cx, cy, rx, ry, c, lit = true) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        let col = c;
        if (lit) {
          const l = -0.45 * nx - 0.75 * ny;
          if (l > 0.5 && d < 0.75) col = shade(c, 0.28);
          else if (l < -0.38 && d > 0.3) col = shade(c, -0.2);
        }
        this.px(x, y, col);
      }
    }
    return this;
  }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) this.px(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, c);
    return this;
  }
  // Polygone plein (règle pair-impair), points [[x,y],...]
  poly(pts, c) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const xs = [];
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        const yy = y + 0.5;
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
    }
    return this;
  }
  // Contour sélectif autour de la silhouette.
  outline(col = null, diag = false) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      const nb = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
      if (diag) nb.push(this.get(x - 1, y - 1), this.get(x + 1, y - 1), this.get(x - 1, y + 1), this.get(x + 1, y + 1));
      const n = nb.find(Boolean);
      if (n) add.push([x, y, col || shade(n, -0.62)]);
    }
    for (const [x, y, c] of add) this.d[y * this.w + x] = c;
    return this;
  }
  flipX() {
    const p = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) p.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x];
    return p;
  }
  canvas() {
    const [c, g] = canvas(this.w, this.h);
    const img = g.createImageData(this.w, this.h);
    for (let k = 0; k < this.d.length; k++) {
      const col = this.d[k];
      if (!col) continue;
      const n = parseInt(col.slice(1, 7), 16);
      img.data[k * 4] = (n >> 16) & 255; img.data[k * 4 + 1] = (n >> 8) & 255; img.data[k * 4 + 2] = n & 255;
      img.data[k * 4 + 3] = col.length > 7 ? parseInt(col.slice(7, 9), 16) : 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
}

// Silhouette sombre (pour les espèces pas encore trouvées).
export function silhouette(src, col = '#3b3350') {
  const [c, g] = canvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return c;
}

export function flipCanvas(src) {
  const [c, g] = canvas(src.width, src.height);
  g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
}
