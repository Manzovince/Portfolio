import { heightAt } from './world.js?v=1';

const N = 160;          // pixels de carte
const UNIT = 12;        // unités du monde par pixel
const SCALE = 3;        // agrandissement avant les noms

const C = {
  fog: [222, 205, 168], fog2: [212, 194, 156], deep: [120, 168, 196], mid: [146, 192, 208],
  shallow: [176, 216, 214], sand: [236, 218, 160], grass: [150, 184, 104], grass2: [128, 166, 92],
  rock: [160, 150, 140], peak: [236, 236, 240], ink: [70, 56, 40],
};

// Carte pliée en pixels : le brouillard se lève là où l'on est passé.
export class MapView {
  constructor(canvas) {
    this.cv = canvas;
    this.cv.width = this.cv.height = N * SCALE;
    this.ctx = canvas.getContext('2d');
    this.small = document.createElement('canvas');
    this.small.width = this.small.height = N;
    this.sctx = this.small.getContext('2d');
    this.img = this.sctx.createImageData(N, N);
    this.tiles = new Map();
  }

  tileColor(x, z) {
    const h = heightAt(x, z);
    if (h < -9) return C.deep;
    if (h < -4) return C.mid;
    if (h < 0) return C.shallow;
    if (h < 1.6) return C.sand;
    if (h > 34) return C.peak;
    if (h > 18) return C.rock;
    return (Math.floor(x / UNIT) + Math.floor(z / UNIT)) & 1 ? C.grass : C.grass2;
  }

  draw(progress, cx, cz, marks) {
    const d = this.img.data;
    const x0 = Math.round(cx / UNIT) * UNIT - (N / 2) * UNIT, z0 = Math.round(cz / UNIT) * UNIT - (N / 2) * UNIT;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = x0 + i * UNIT + UNIT / 2, z = z0 + j * UNIT + UNIT / 2;
        let c;
        if (progress.isRevealed(x, z)) {
          const key = Math.floor(x / UNIT) + ',' + Math.floor(z / UNIT);
          c = this.tiles.get(key);
          if (!c) { c = this.tileColor(x, z); this.tiles.set(key, c); }
        } else {
          c = (i + j) % 2 ? C.fog : C.fog2;
        }
        const k = (j * N + i) * 4;
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
    }
    this.sctx.putImageData(this.img, 0, 0);
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.small, 0, 0, N * SCALE, N * SCALE);

    const toPx = (x, z) => [((x - x0) / UNIT) * SCALE, ((z - z0) / UNIT) * SCALE];
    const inside = ([px, py]) => px > 4 && py > 4 && px < N * SCALE - 4 && py < N * SCALE - 4;
    const dot = (p, color, s = 6) => {
      ctx.fillStyle = 'rgb(70,56,40)';
      ctx.fillRect(Math.round(p[0] - s / 2) - 3, Math.round(p[1] - s / 2) - 3, s + 6, s + 6);
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(p[0] - s / 2), Math.round(p[1] - s / 2), s, s);
    };

    for (const lh of marks.lighthouses) {
      const p = toPx(lh.x, lh.z);
      if (inside(p) && progress.isRevealed(lh.x, lh.z)) dot(p, lh.lit ? '#ffd24a' : '#8a8a90', 6);
    }
    ctx.font = '600 15px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    for (const is of Object.values(progress.islands)) {
      const p = toPx(is.x, is.z);
      if (!inside(p)) continue;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(240,228,200,0.9)';
      ctx.strokeText(is.name, p[0], p[1] - 4);
      ctx.fillStyle = 'rgb(70,56,40)';
      ctx.fillText(is.name, p[0], p[1] - 4);
    }
    const b = toPx(marks.boat.x, marks.boat.z);
    dot(b, '#e8543c', 9);
    if (marks.walker) dot(toPx(marks.walker.x, marks.walker.z), '#3e9a4a', 6);

    // Rose des vents.
    ctx.fillStyle = 'rgb(70,56,40)';
    ctx.font = '600 18px "Pixelify Sans", monospace';
    ctx.fillText('N', N * SCALE - 26, 30);
    ctx.fillRect(N * SCALE - 28, 36, 4, 18);
  }
}

