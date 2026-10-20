import { pointOfSail } from './boat.js?v=1';

const S = 33, C = 16;
const N_GLYPH = ['1001', '1101', '1011', '1001', '1001'];

// Boussole dessinée pixel par pixel, à la même échelle que la scène.
export class Hud {
  constructor() {
    this.cv = document.getElementById('compass');
    this.ctx = this.cv.getContext('2d');
    this.img = this.ctx.createImageData(S, S);
    this.posEl = document.getElementById('pos');
    this.spdEl = document.getElementById('spd');
    this.knob = document.getElementById('helm-knob');
    this.helm = document.getElementById('helm');
    this.lastText = '';
    this.timer = 0;
  }

  setScale(cssPx) {
    document.documentElement.style.setProperty('--px', cssPx + 'px');
  }

  put(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const d = this.img.data, k = (y * S + x) * 4;
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = c[3] ?? 255;
  }

  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.put(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // Angle cap (0 = haut de l'écran, sens horaire) → coordonnées.
  at(a, r) { return [C + Math.sin(a) * r, C - Math.cos(a) * r]; }

  draw(dt, viewYaw, me, boat, wind, steering, label) {
    this.img.data.fill(0);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const d = Math.hypot(x - C, y - C);
        if (d < 14) this.put(x, y, [16, 28, 60, 110]);
        else if (d < 15) this.put(x, y, [236, 244, 255, 230]);
        else if (d < 16.2) this.put(x, y, [16, 28, 60, 160]);
      }
    }
    // Nord.
    const [nx, ny] = this.at(-viewYaw, 10);
    N_GLYPH.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') this.put(nx - 1.5 + i, ny - 2 + j, [255, 112, 96]); }));
    // Vent : flèche dans le sens où il souffle.
    const wa = wind.from + Math.PI - viewYaw;
    const [ax, ay] = this.at(wa + Math.PI, 11), [bx, by] = this.at(wa, 11);
    const wc = [190, 244, 255];
    this.line(ax, ay, bx, by, wc);
    for (const s of [-0.5, 0.5]) {
      const ex = bx + Math.sin(wa + Math.PI + s) * 4, ey = by - Math.cos(wa + Math.PI + s) * 4;
      this.line(bx, by, ex, ey, wc);
    }
    // Bateau.
    const ba = me.heading - viewYaw;
    const tip = this.at(ba, 5), l = this.at(ba + 2.5, 4), r = this.at(ba - 2.5, 4);
    const bc = [255, 186, 80];
    this.line(...tip, ...l, bc); this.line(...tip, ...r, bc); this.line(...l, ...r, bc);
    this.put(C, C, bc);
    this.ctx.putImageData(this.img, 0, 0);

    this.knob.style.left = (50 + boat.rudder * 44) + '%';
    this.helm.classList.toggle('on', steering);

    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.2;
      const txt = label ? label + '|' : pointOfSail(boat.relWind) + '|' + (boat.speed * 0.8).toFixed(1);
      if (txt !== this.lastText) {
        this.lastText = txt;
        const [p, s] = txt.split('|');
        this.posEl.textContent = !label && boat.grounded && boat.speed < 0.5 ? 'Échoué' : p;
        this.spdEl.textContent = s;
        this.posEl.parentElement.classList.toggle('land', !!label);
      }
    }
  }
}
