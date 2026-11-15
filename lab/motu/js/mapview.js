// Top-down chart for route planning: fog of war, known islands, waypoints with stopovers.

import { BIOMES, ZONES } from './data.js';
import { islandById, zoneAt, dockPoint } from './world.js';
import { FOG, stats, routeLength, routeMaxZone } from './sim.js';

export const STAYS = [
  { s: 600, label: 'Escale 10 min' },
  { s: 3600, label: 'Escale 1 h' },
  { s: -1, label: 'Jusqu\'à cale pleine' },
  { s: 0, label: 'Passage' },
];

export function createMap(canvas, getState) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  const view = { x: 0, y: 0, scale: 3 };
  let plan = [];
  let onChange = () => {};

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  }
  const toS = (x, y) => [(x - view.x) * view.scale + W / 2, (y - view.y) * view.scale + H / 2];
  const toW = (X, Y) => ({ x: (X - W / 2) / view.scale + view.x, y: (Y - H / 2) / view.scale + view.y });

  function open() {
    const s = getState();
    resize();
    view.x = s.boat.x; view.y = s.boat.y;
    plan = s.route ? s.route.wps.slice(s.route.i).map(w => ({ ...w })) : [];
    draw();
  }

  const fogPattern = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const g = c.getContext('2d');
    g.fillStyle = '#efe3c8'; g.fillRect(0, 0, 24, 24);
    g.strokeStyle = 'rgba(150,110,70,0.25)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, 12); g.lineTo(6, 6); g.lineTo(12, 12); g.lineTo(18, 6); g.lineTo(24, 12);
    g.moveTo(0, 24); g.lineTo(6, 18); g.lineTo(12, 24); g.lineTo(18, 18); g.lineTo(24, 24); g.stroke();
    return c;
  })();

  function draw() {
    const s = getState();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = ctx.createPattern(fogPattern, 'repeat');
    ctx.fillRect(0, 0, W, H);

    const a = toW(0, 0), b = toW(W, H);
    const c0x = Math.floor(a.x / FOG), c1x = Math.floor(b.x / FOG), c0y = Math.floor(a.y / FOG), c1y = Math.floor(b.y / FOG);
    const cs = FOG * view.scale;
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      if (!s.fog[cx + ',' + cy]) continue;
      const z = zoneAt((cx + 0.5) * FOG, (cy + 0.5) * FOG);
      const [X, Y] = toS(cx * FOG, cy * FOG);
      ctx.fillStyle = ZONES[z].sea;
      ctx.fillRect(X - 0.5, Y - 0.5, cs + 1, cs + 1);
    }
    // zone frontier hint: darker edge where zone exceeds what the boat can sail
    const S = stats(s);
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      if (!s.fog[cx + ',' + cy]) continue;
      const z = zoneAt((cx + 0.5) * FOG, (cy + 0.5) * FOG);
      if (z <= S.sea) continue;
      const [X, Y] = toS(cx * FOG, cy * FOG);
      ctx.fillStyle = z > S.sea + 1 ? 'rgba(60,20,50,0.45)' : 'rgba(120,40,60,0.18)';
      ctx.fillRect(X - 0.5, Y - 0.5, cs + 1, cs + 1);
      if (z > S.sea + 1 && cs > 10) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X, Y + cs); ctx.lineTo(X + cs, Y); ctx.stroke();
      }
    }

    // islands
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const id in s.known) {
      const isle = islandById(id);
      const [X, Y] = toS(isle.x, isle.y);
      if (X < -60 || X > W + 60 || Y < -60 || Y > H + 60) continue;
      const B = BIOMES[isle.biome];
      for (const t of isle.land) {
        const [tx, ty] = toS(t.tx, t.ty);
        ctx.fillStyle = t.h === 1 && isle.biome !== 'mangrove' ? B.sand : (t.h > B.maxH * 0.6 ? B.high : B.low);
        ctx.fillRect(tx, ty, view.scale + 0.5, view.scale + 0.5);
      }
      if (view.scale >= 1.6 || isle.home) {
        const visited = s.visited[id];
        ctx.font = `${visited ? 700 : 500} ${Math.max(10, Math.min(13, view.scale * 3.5))}px ui-rounded, system-ui, sans-serif`;
        const label = isle.name + (isle.village ? ' ⌂' : '') + (isle.site && !(s.isl[id] && s.isl[id].studied) ? ' ✦' : '');
        const ly = Y + isle.r * 1.3 * view.scale + 3;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,250,240,0.8)'; ctx.strokeText(label, X, ly);
        ctx.fillStyle = visited ? '#2b2f4a' : '#5a5f78'; ctx.fillText(label, X, ly);
      }
    }

    // plan
    const pts = [[s.boat.x, s.boat.y], ...plan.map(w => [w.x, w.y])];
    if (pts.length > 1) {
      ctx.setLineDash([6, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff8ee';
      ctx.beginPath();
      pts.forEach((p, i) => { const [X, Y] = toS(p[0], p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.setLineDash([]);
      plan.forEach((w, i) => {
        const [X, Y] = toS(w.x, w.y);
        ctx.fillStyle = w.isle ? '#e0634a' : '#2b2f4a';
        ctx.beginPath(); ctx.arc(X, Y, 9, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 11px ui-rounded, system-ui, sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillText(i + 1 + '', X, Y + 0.5); ctx.textBaseline = 'top';
      });
    }

    // boat
    const [BX, BY] = toS(s.boat.x, s.boat.y);
    ctx.save(); ctx.translate(BX, BY); ctx.rotate(s.boat.hd);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2b2f4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, 6); ctx.lineTo(-3, 0); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // sight ring
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(BX, BY, S.sight * view.scale, 0, 7); ctx.stroke();
  }

  function tap(X, Y) {
    const s = getState();
    const p = toW(X, Y);
    // tapping an existing waypoint: cycle its stopover, or remove a plain one
    for (let i = plan.length - 1; i >= 0; i--) {
      const [wx, wy] = toS(plan[i].x, plan[i].y);
      if (Math.hypot(wx - X, wy - Y) < 16) {
        if (plan[i].isle) {
          const k = STAYS.findIndex(o => o.s === plan[i].stay);
          if (k === STAYS.length - 1) plan.splice(i, 1);
          else plan[i].stay = STAYS[k + 1].s;
        } else plan.splice(i, 1);
        changed(); return;
      }
    }
    // snap to a known island
    let best = null, bd = 18 / view.scale + 1;
    for (const id in s.known) {
      const isle = islandById(id);
      const d = Math.hypot(isle.x - p.x, isle.y - p.y) - isle.r;
      if (d < bd) { bd = d; best = isle; }
    }
    if (best) {
      const prev = plan.length ? plan[plan.length - 1] : s.boat;
      const dp = dockPoint(best, prev.x, prev.y);
      plan.push({ x: dp.x, y: dp.y, isle: best.id, stay: STAYS[0].s });
    } else plan.push({ x: p.x, y: p.y });
    changed();
  }

  function changed() { draw(); onChange(summary()); }

  function summary() {
    const s = getState();
    const S = stats(s);
    const L = routeLength(s, plan);
    const z = plan.length ? routeMaxZone(s, plan) : zoneAt(s.boat.x, s.boat.y);
    const stays = plan.reduce((a, w) => a + (w.isle && w.stay > 0 ? w.stay : 0), 0);
    return { n: plan.length, dist: L, secs: L / S.speed + stays, zone: z, sea: S.sea, untilFull: plan.some(w => w.stay === -1), plan };
  }

  return {
    open, draw, resize, tap, summary, view, toW,
    get plan() { return plan; },
    set plan(p) { plan = p; changed(); },
    undo() { plan.pop(); changed(); },
    clear() { plan = []; changed(); },
    onChange(fn) { onChange = fn; },
  };
}
