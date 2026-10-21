'use strict';
// Board renderer: everything is drawn into a 256x256 buffer and scaled up by CSS
// with integer device-pixel ratios, so pixels stay crisp.
const R = {
  cv: null, ctx: null, base: null, parts: [], shake: 0, flash: 0, flashCol: '#fff',
  dice: null, t: 0, vis: [], hidden: new Set(),

  init(cv) {
    this.cv = cv; cv.width = BW; cv.height = BW;
    this.ctx = cv.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.base = document.createElement('canvas'); this.base.width = BW; this.base.height = BW;
  },

  // ---------- static board ----------
  buildBase(specials, owners = {}) {
    const x = this.base.getContext('2d');
    x.imageSmoothingEnabled = false;
    // wooden frame
    x.fillStyle = OUT; x.fillRect(0, 0, BW, BW);
    x.fillStyle = '#8a5530'; x.fillRect(1, 1, BW - 2, BW - 2);
    x.fillStyle = '#b07440'; x.fillRect(2, 2, BW - 4, 2); x.fillRect(2, 2, 2, BW - 4);
    x.fillStyle = '#5e361c'; x.fillRect(2, BW - 4, BW - 4, 2); x.fillRect(BW - 4, 2, 2, BW - 4);
    for (let i = 12; i < BW - 8; i += 22) { x.fillStyle = '#7a4827'; x.fillRect(i, 5, 6, 1); x.fillRect(i + 9, BW - 6, 5, 1); x.fillRect(5, i + 4, 1, 6); x.fillRect(BW - 6, i + 11, 1, 5); }
    x.fillStyle = OUT; x.fillRect(M - 1, M - 1, 242, 242);

    COLORS.forEach((C, c) => this.drawStable(x, c));
    TRACK.forEach(([cx, cy], i) => {
      let fill = '#fbf3df';
      const owner = START.indexOf(i);
      if (owner >= 0) fill = COLORS[owner].b;
      else if (SAFE.has(i)) fill = '#cfd9e8';
      else if (specials[i]) fill = SPECIALS[specials[i]].fill;
      this.cell(x, cx, cy, fill);
      const px = M + cx * CELL, py = M + cy * CELL;
      if (owner >= 0) x.drawImage(PX.icons.starC, px + 3, py + 3);
      else if (SAFE.has(i)) x.drawImage(PX.icons.star, px + 3, py + 3);
      else if (specials[i]) this.drawSpecialIcon(x, specials[i], i, px, py);
      if (owners[i] != null && G && G.players[owners[i]]) {
        // owner's colour frame and a little pennant in the corner
        const C = COLORS[G.players[owners[i]].c];
        x.fillStyle = C.b;
        x.fillRect(px + 1, py + 1, 15, 1); x.fillRect(px + 1, py + 15, 15, 1); x.fillRect(px + 1, py + 1, 1, 15); x.fillRect(px + 15, py + 1, 1, 15);
        x.fillStyle = OUT; x.fillRect(px + 12, py + 1, 1, 6);
        x.fillStyle = C.b; x.fillRect(px + 13, py + 1, 3, 3); x.fillStyle = C.l; x.fillRect(px + 13, py + 1, 2, 1);
      }
    });
    HOME.forEach((col, c) => col.forEach(([cx, cy], j) => {
      this.cell(x, cx, cy, j === 4 ? COLORS[c].l : COLORS[c].b);
      const p = cellPx(cx, cy);
      x.fillStyle = shade(COLORS[c].b, .35); x.fillRect(p.x - 1, p.y - 1, 2, 2);
    }));
    // entry arrows into each home column
    [[0, 7, 'r'], [7, 0, 'd'], [14, 7, 'l'], [7, 14, 'u']].forEach(([cx, cy, d], c) => {
      this.cell(x, cx, cy, COLORS[c].t);
      x.drawImage(PX.arrows[d], M + cx * CELL + 3, M + cy * CELL + 3);
    });
    this.drawCenter(x);
  },
  cell(x, cx, cy, fill) {
    const px = M + cx * CELL, py = M + cy * CELL;
    x.fillStyle = OUT; x.fillRect(px, py, 17, 17);
    x.fillStyle = fill; x.fillRect(px + 1, py + 1, 15, 15);
    x.fillStyle = shade(fill, .35); x.fillRect(px + 1, py + 1, 15, 1); x.fillRect(px + 1, py + 1, 1, 15);
    x.fillStyle = shade(fill, -.18); x.fillRect(px + 1, py + 15, 15, 1); x.fillRect(px + 15, py + 1, 1, 15);
  },
  drawSpecialIcon(x, t, i, px, py) {
    if (t === 'coin') x.drawImage(PX.icons.coin, px + 3, py + 3);
    else if (t === 'coffre') x.drawImage(PX.icons.chest, px + 3, py + 3);
    else if (t === 'chance') x.drawImage(PX.icons.quest, px + 3, py + 3);
    else if (t === 'piege') x.drawImage(PX.icons.skull, px + 3, py + 3);
    else if (t === 'peage') x.drawImage(PX.icons.peage, px + 3, py + 3);
    else if (t === 'turbo') {
      const [ax, ay] = TRACK[i], [bx, by] = TRACK[(i + 1) % 52];
      const dx = bx - ax, dy = by - ay;
      const d = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
      x.drawImage(PX.arrows[d], px + 3, py + 3);
    }
  },
  drawStable(x, c) {
    const C = COLORS[c], ox = M + C.base[0] * CELL, oy = M + C.base[1] * CELL;
    x.fillStyle = OUT; x.fillRect(ox, oy, 97, 97);
    x.fillStyle = C.b; x.fillRect(ox + 1, oy + 1, 95, 95);
    x.fillStyle = C.l; x.fillRect(ox + 1, oy + 1, 95, 2); x.fillRect(ox + 1, oy + 1, 2, 95);
    x.fillStyle = C.d; x.fillRect(ox + 1, oy + 94, 95, 2); x.fillRect(ox + 94, oy + 1, 2, 95);
    // little stripes like a fairground tent
    x.fillStyle = shade(C.b, .12);
    for (let i = 6; i < 90; i += 12) x.fillRect(ox + i, oy + 4, 5, 6);
    // inner paddock
    x.fillStyle = OUT; x.fillRect(ox + 11, oy + 12, 74, 74);
    x.fillStyle = C.t; x.fillRect(ox + 12, oy + 13, 72, 72);
    x.fillStyle = shade(C.t, -.08); x.fillRect(ox + 12, oy + 82, 72, 3); x.fillRect(ox + 81, oy + 13, 3, 72);
    for (const [sx, sy] of SLOTS) {
      this.disc(x, ox + sx, oy + sy, 10, OUT);
      this.disc(x, ox + sx, oy + sy, 9, C.b);
      this.disc(x, ox + sx, oy + sy + 1, 7, shade(C.t, -.12));
      this.disc(x, ox + sx, oy + sy + 2, 5, shade(C.t, -.2));
    }
  },
  drawCenter(x) {
    const x0 = M + 96, y0 = M + 96;
    x.fillStyle = OUT; x.fillRect(x0, y0, 49, 49);
    for (let v = 1; v < 48; v++) for (let u = 1; u < 48; u++) {
      let c;
      if (u === v || u === 48 - v) { continue; }
      if (u < v && u < 48 - v) c = 0; else if (v < u && v < 48 - u) c = 1; else if (u > v && u > 48 - v) c = 2; else c = 3;
      const C = COLORS[c];
      const edge = Math.min(u, v, 48 - u, 48 - v);
      x.fillStyle = edge < 3 ? C.l : C.b;
      x.fillRect(x0 + u, y0 + v, 1, 1);
    }
    x.drawImage(PX.icons.crown, x0 + 19, y0 + 21);
  },
  disc(x, cx, cy, r, col) {
    x.fillStyle = col;
    for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * .6)); x.fillRect(cx - w, cy + y, w * 2 + 1, 1); }
  },

  // ---------- particles & effects ----------
  burst(x, y, n, cols, sp = 1.5, g = .06, life = 40, size = 2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = sp * (.4 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * .4, g, life: life * (.6 + Math.random() * .6), max: life, col: pick(cols), s: size });
    }
  },
  dust(x, y) {
    for (let i = 0; i < 5; i++) this.parts.push({ x: x + (Math.random() * 10 - 5), y: y + 2, vx: (Math.random() - .5) * 1.2, vy: -Math.random() * .5, g: -.01, life: 18, max: 18, col: '#ffffff', s: 1 + rnd(2) });
  },
  ring(x, y, col) { this.parts.push({ ring: true, x, y, r: 2, col, life: 22, max: 22 }); },
  confetti() {
    const cols = ['#ff5d6c', '#ffd84a', '#33b862', '#7fd0ff', '#b48cff', '#ffffff'];
    for (let i = 0; i < 160; i++) this.parts.push({ x: Math.random() * BW, y: -10 - Math.random() * 120, vx: (Math.random() - .5) * .8, vy: .6 + Math.random(), g: .01, life: 400, max: 400, col: pick(cols), s: 2, conf: Math.random() * 6 });
  },
  addShake(v) { this.shake = Math.max(this.shake, v); },

  // ---------- dice shown over the board centre ----------
  async roll(faces) {
    // faces: [{val, kind}]  — tumbles then lands on the given values
    const n = faces.length;
    const xs = n === 1 ? [120] : [109, 131];
    this.dice = faces.map((f, i) => ({ val: d6(), final: f.val, kind: f.kind, x: xs[i], y: 120, oy: -60, sq: 1, glow: 0 }));
    SFX.play('whoosh');
    let last = 0;
    await Tw.add(620, k => {
      for (const d of this.dice) {
        const b = Math.abs(Math.sin(k * Math.PI * 2.5)) * (1 - k) * 22;
        d.oy = -b - (1 - k) * 8;
        d.sq = 1 + Math.sin(k * 40) * .12 * (1 - k);
      }
      const step = Math.floor(k * 11);
      if (step !== last) { last = step; for (const d of this.dice) d.val = d6() * Math.sign(d.final || 1); SFX.play('tick'); }
    });
    for (const d of this.dice) { d.val = d.final; d.oy = 0; d.sq = 1; d.glow = Math.abs(d.final) === 6 ? 1 : 0; }
    SFX.play('dice'); this.addShake(2);
    for (const d of this.dice) this.burst(d.x + 8, d.y + 14, 6, ['#ffffff', '#ffe48a'], 1.2, .05, 20, 1);
    await Tw.add(160, k => { for (const d of this.dice) d.sq = 1 + Math.sin(k * Math.PI) * .25; });
  },
  hideDice() { this.dice = null; UI.rollFaces = null; if (G) UI.renderInv(G.players[G.cur]); },

  // ---------- per-frame ----------
  frame(dt) {
    this.t += dt;
    const x = this.ctx, t = this.t;
    x.drawImage(this.base, 0, 0);
    if (G) {
      // animated portals
      for (const k in G.specials) {
        if (G.specials[k] !== 'portal') continue;
        const [cx, cy] = TRACK[k], p = cellPx(cx, cy);
        const cols = ['#73eff7', '#41a6f6', '#b48cff', '#ff8ff2'];
        for (let r = 6; r >= 1; r -= 1) this.disc(x, p.x, p.y, r, cols[(Math.floor(t / 90) + r) % 4]);
        x.fillStyle = OUT; x.fillRect(p.x, p.y, 1, 1);
      }
      // twinkles on coin squares
      for (const k in G.specials) {
        const s = G.specials[k];
        if (s !== 'coin' && s !== 'coffre') continue;
        const ph = (t / 700 + k * .37) % 3;
        if (ph < .25) { const [cx, cy] = TRACK[k], p = cellPx(cx, cy); x.fillStyle = '#ffffff'; x.fillRect(p.x + 3, p.y - 5, 1, 3); x.fillRect(p.x + 2, p.y - 4, 3, 1); }
      }
      // destination markers for the pawns the player may move
      if (G.moves) {
        const P = G.players[G.cur];
        const blink = (Math.floor(t / 180) % 2) === 0;
        for (const m of G.moves) {
          const p = posOf(P.c, m.k, m.to);
          const col = blink ? '#ffffff' : COLORS[P.c].l;
          x.fillStyle = col;
          const bx = Math.round(p.x - 8), by = Math.round(p.y - 11);
          if (m.to === FIN) continue;
          x.globalAlpha = .3 + .2 * Math.sin(t / 110);
          x.fillStyle = '#ffffff'; x.fillRect(bx + 1, by + 1, 15, 15);
          x.globalAlpha = 1; x.fillStyle = col;
          x.fillRect(bx + 1, by + 1, 4, 2); x.fillRect(bx + 1, by + 1, 2, 4); x.fillRect(bx + 12, by + 1, 4, 2); x.fillRect(bx + 14, by + 1, 2, 4);
          x.fillRect(bx + 1, by + 14, 4, 2); x.fillRect(bx + 1, by + 12, 2, 4); x.fillRect(bx + 12, by + 14, 4, 2); x.fillRect(bx + 14, by + 12, 2, 4);
          continue;
          x.fillRect(bx, by, 4, 1); x.fillRect(bx, by, 1, 4); x.fillRect(bx + 13, by, 4, 1); x.fillRect(bx + 16, by, 1, 4);
          x.fillRect(bx, by + 16, 4, 1); x.fillRect(bx, by + 13, 1, 4); x.fillRect(bx + 13, by + 16, 4, 1); x.fillRect(bx + 16, by + 13, 1, 4);
        }
      }
      if (G.placing) {
        const blink = .25 + .25 * Math.sin(t / 120);
        for (const a of G.placing) {
          const [cx, cy] = TRACK[a], bx = M + cx * CELL, by = M + cy * CELL;
          x.globalAlpha = blink; x.fillStyle = '#ffffff'; x.fillRect(bx + 1, by + 1, 15, 15); x.globalAlpha = 1;
        }
      }
      this.drawPawns(x, dt);
    }
    // dice
    if (this.dice) {
      for (const d of this.dice) {
        x.fillStyle = 'rgba(26,28,44,.35)';
        const sw = Math.max(6, 14 + d.oy / 4);
        x.fillRect(Math.round(d.x + 8 - sw / 2), d.y + 15, Math.round(sw), 2);
        if (d.glow) {
          const g = Math.floor(t / 120) % 2 ? '#fff6a0' : '#ffd84a';
          x.fillStyle = g; x.fillRect(d.x - 2, d.y - 2 + d.oy, 20, 20);
        }
        x.save();
        const cx = d.x + 8, by = d.y + 16 + d.oy;
        x.translate(cx, by); x.scale(2 - d.sq, d.sq); x.translate(-cx, -by);
        drawDie(x, d.x, d.y + d.oy, d.val || 1, d.kind);
        x.restore();
      }
    }
    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt / 16.7;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      if (p.ring) {
        p.r += dt / 16.7 * 1.3;
        x.fillStyle = p.col;
        const r = Math.round(p.r);
        for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; x.fillRect(Math.round(p.x + Math.cos(an) * r), Math.round(p.y + Math.sin(an) * r), 2, 2); }
        continue;
      }
      const f = dt / 16.7;
      p.vy += p.g * f; p.x += p.vx * f; p.y += p.vy * f;
      if (p.conf !== undefined) { p.conf += .2 * f; p.x += Math.sin(p.conf) * .4; }
      x.fillStyle = p.col;
      const s = p.conf !== undefined ? (Math.sin(p.conf * 2) > 0 ? 2 : 1) : p.s;
      x.fillRect(Math.round(p.x), Math.round(p.y), s, p.s);
    }
    if (this.flash > 0) {
      x.globalAlpha = Math.min(1, this.flash); x.fillStyle = this.flashCol; x.fillRect(0, 0, BW, BW); x.globalAlpha = 1;
      this.flash -= dt / 120;
    }
    // shake (applied to the canvas element in whole board pixels)
    if (this.shake > .2) {
      const s = this.shake, dx = Math.round((Math.random() * 2 - 1) * s), dy = Math.round((Math.random() * 2 - 1) * s);
      this.cv.style.transform = `translate(${dx * UI.px}px,${dy * UI.px}px)`;
      this.shake *= Math.pow(.86, dt / 16.7);
    } else if (this.shake) { this.shake = 0; this.cv.style.transform = ''; }
  },

  drawPawns(x, dt) {
    // group resting pawns by spot so stacks spread out a little
    const groups = new Map();
    G.players.forEach((P, pi) => P.pawns.forEach((rel, k) => {
      const key = rel < 0 ? `b${pi}.${k}` : rel === FIN ? `f${P.c}` : (() => { const p = posOf(P.c, k, rel); return `${p.x},${p.y}`; })();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push([pi, k]);
    }));
    const OFF = { 1: [[0, 0]], 2: [[-3, -1], [3, 1]], 3: [[-4, 1], [4, 1], [0, -3]], 4: [[-4, -2], [4, -2], [-4, 3], [4, 3]] };
    const list = [];
    for (const g of groups.values()) {
      const offs = OFF[Math.min(4, g.length)];
      g.forEach(([pi, k], i) => {
        const P = G.players[pi], v = this.vis[pi][k];
        if (!v.anim) {
          const p = posOf(P.c, k, P.pawns[k]); const o = offs[i % offs.length];
          const tx = p.x + o[0], ty = p.y + o[1];
          const f = 1 - Math.pow(.75, dt / 16.7);
          v.x += (tx - v.x) * f; v.y += (ty - v.y) * f;
          if (Math.abs(tx - v.x) < .3) v.x = tx; if (Math.abs(ty - v.y) < .3) v.y = ty;
        }
        list.push([pi, k, v]);
      });
    }
    list.sort((a, b) => a[2].y - b[2].y);
    const movable = new Set((G.moves || []).map(m => m.k));
    const cur = G.cur, t = this.t;
    for (const [pi, k, v] of list) {
      if (v.hide) continue;
      const P = G.players[pi], spr = PX.horse[P.c];
      const isMov = pi === cur && movable.has(k);
      const bob = isMov ? Math.round(Math.abs(Math.sin(t / 160 + k)) * 3) : 0;
      const h = v.h + bob;
      // shadow
      const sw = Math.max(4, Math.round(10 - h / 3));
      x.fillStyle = 'rgba(26,28,44,.38)';
      x.fillRect(Math.round(v.x - sw / 2), Math.round(v.y + 3), sw, 2);
      x.fillRect(Math.round(v.x - sw / 2 + 1), Math.round(v.y + 2), sw - 2, 4);
      const w = spr.width * (v.sx || 1), hh = spr.height * (v.sy || 1) * (v.scale ?? 1);
      const ww = w * (v.scale ?? 1);
      const dx = Math.round(v.x - ww / 2), dy = Math.round(v.y + 5 - h - hh);
      if (v.spin) {
        x.save(); x.translate(v.x, v.y - h - hh / 2); x.rotate(v.spin); x.drawImage(spr, -ww / 2, -hh / 2, ww, hh); x.restore();
        continue;
      }
      if (isMov) {
        const ol = Math.floor(t / 200) % 2 ? PX.horseW : silhouette0(P.c);
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.drawImage(ol, dx + ox, dy + oy, Math.round(ww), Math.round(hh));
      }
      if (P.curse && P.pawns[k] >= 0 && P.pawns[k] < FIN && Math.floor(t / 300) % 2) {
        x.fillStyle = '#b48cff'; x.fillRect(dx + 2 + (k * 3) % 7, dy - 3, 1, 1);
      }
      x.drawImage(spr, dx, dy, Math.round(ww), Math.round(hh));
      if (isMov) {
        // bouncing arrow above
        const ay = dy - 7 - Math.round(Math.abs(Math.sin(t / 140)) * 3);
        x.fillStyle = OUT; x.fillRect(Math.round(v.x) - 3, ay - 1, 7, 2); x.fillRect(Math.round(v.x) - 2, ay + 1, 5, 2); x.fillRect(Math.round(v.x) - 1, ay + 3, 3, 1);
        x.fillStyle = '#ffffff'; x.fillRect(Math.round(v.x) - 2, ay, 5, 1); x.fillRect(Math.round(v.x) - 1, ay + 1, 3, 1); x.fillRect(Math.round(v.x), ay + 2, 1, 1);
      }
    }
  },
};
const _sil = {};
function silhouette0(c) { return _sil[c] || (_sil[c] = silhouette(PX.horse[c], COLORS[c].l)); }
