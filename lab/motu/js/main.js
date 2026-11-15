// Motu — idle procedural sailing. Wiring: game loop, input, HUD, sheets, map, offline journal.

import { RES, RES_IDS, BOATS, boatById, BIOMES, ZONES, SPECIES, SPECIES_IDS, SITES, SITE_IDS, BIOME_IDS, PERKS, OFFLINE_CAP_H } from './data.js';
import { islandById, landAt, nearestIsland, dockPoint, zoneAt } from './world.js';
import * as G from './sim.js';
import { createRenderer } from './render.js';
import { createMap, STAYS } from './mapview.js';

const $ = id => document.getElementById(id);
{ const m = location.search.match(/hour=([\d.]+)/); if (m) window.MOTU_HOUR = +m[1]; }
const sea = $('sea');
const R = createRenderer(sea);
const M = createMap($('chart'), () => S);

let S = G.load();
let firstRun = false;
if (!S) { S = G.newGame(); firstRun = true; }

const view = { cx: S.boat.x, cy: S.boat.y, zoom: 0.8, shift: 0 };
const fx = { flotsam: [], seaFauna: [], floaters: [], rain: 0, target: null, moving: false };
let manual = null;          // { x, y, dock: islandId | null }
let boost = 0, lastDrum = 0;
let lastBlockedToast = 0;
let carnetSeen = G.carnetCount(S);

// ---------- formatting ----------
const fmt = n => Math.floor(n).toLocaleString('fr-FR');
function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return sec + ' s';
  const m = Math.round(sec / 60);
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), mm = m % 60;
  return h + ' h' + (mm ? ' ' + String(mm).padStart(2, '0') : '');
}
const fmtTime = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const resIco = id => id === 'perle'
  ? `<span class="ico" style="background:#ece4f0"><span class="pearl" style="width:14px;height:14px"></span></span>`
  : `<span class="ico" style="background:${RES[id].color}22"><i style="background:${RES[id].color}"></i></span>`;
const resName = id => id === 'perle' ? 'Huîtres perlières' : RES[id].name;

// ---------- toasts & floaters ----------
function toast(msg, kind = '', life = 3) {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.style.setProperty('--life', life + 's');
  el.textContent = msg;
  $('toasts').appendChild(el);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  setTimeout(() => el.remove(), life * 1000 + 500);
}
function floater(text, x, y, color) { fx.floaters.push({ text, x, y, t: 0, life: 1.3, color }); }
function floaterAtBoat(text, color) {
  const [x, y] = R.worldToScreen(S.boat.x, S.boat.y, 1.5);
  floater(text, x, y, color);
}

const TOAST_KINDS = new Set(['isle', 'carnet', 'perk', 'boat', 'wreck', 'storm']);
const live = {
  online: true, boost: 0, input: null,
  onLog: e => { if (TOAST_KINDS.has(e.k)) toast(e.m, e.k, e.k === 'perk' ? 4.5 : 3); },
  onEvent: ev => {
    if (ev.type === 'storm') fx.rain = 6;
    else if (ev.type === 'flotsam') spawnFlotsam(ev.zone);
    else if (ev.type === 'fauna') spawnFauna(ev.sp);
    else if (ev.type === 'wreck') { manual = null; fx.target = null; save(); }
    else if (ev.type === 'blocked') {
      if (performance.now() - lastBlockedToast > 4000) {
        lastBlockedToast = performance.now();
        toast(`La houle est trop forte pour ${boatById(S.boat.type).name.toLowerCase()} : impossible d'aller plus loin.`, 'storm');
      }
      manual = null; fx.target = null; S.boat.mode = 'idle';
    }
  },
};

function spawnFlotsam(zone) {
  const b = S.boat;
  for (let k = 0; k < 8; k++) {
    const a = b.hd + (Math.random() - 0.5) * 1.6, d = 4 + Math.random() * 4;
    const x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
    if (!landAt(x, y)) { fx.flotsam.push({ x, y, zone, life: 90, t: 0 }); return; }
  }
}
function spawnFauna(sp) {
  const b = S.boat;
  const a = Math.random() * Math.PI * 2, d = 3 + Math.random() * 3;
  const x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
  if (landAt(x, y)) return;
  fx.seaFauna.push({ sp, x, y, vx: Math.cos(b.hd) * 0.4, vy: Math.sin(b.hd) * 0.4, t: 0, life: 16, flip: Math.random() < 0.5 });
}

// ---------- save ----------
function save() { G.save(S); }
setInterval(save, 4000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

// ---------- loop ----------
let lastFrame = performance.now();
function frame(now) {
  const dtF = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const wall = Date.now();
  const gap = (wall - S.t) / 1000;

  if (gap > 30) {
    const j = G.catchUp(S, wall);
    manual = null; fx.target = null; fx.flotsam.length = 0; fx.seaFauna.length = 0;
    view.cx = S.boat.x; view.cy = S.boat.y;
    if (j) showJournal(j);
    save();
  } else if (gap > 0) {
    boost = Math.max(0, boost - dtF * 0.3);
    live.boost = boost;
    live.input = S.boat.mode === 'manual' && manual ? manual : null;
    const bx = S.boat.x, by = S.boat.y;
    G.advance(S, gap, live);
    fx.moving = Math.hypot(S.boat.x - bx, S.boat.y - by) > 1e-4;
    manualArrival();
  }

  // ambient objects
  for (const f of fx.flotsam) {
    f.t += dtF;
    if (Math.hypot(f.x - S.boat.x, f.y - S.boat.y) < 1.2) { f.t = f.life; collectFlotsam(f); }
  }
  fx.flotsam = fx.flotsam.filter(f => f.t < f.life);
  for (const a of fx.seaFauna) { a.t += dtF; a.x += a.vx * dtF; a.y += a.vy * dtF; }
  fx.seaFauna = fx.seaFauna.filter(a => a.t < a.life);
  for (const t of fx.floaters) t.t += dtF;
  fx.floaters = fx.floaters.filter(t => t.t < t.life);
  fx.rain = Math.max(0, fx.rain - dtF);

  const k = Math.min(1, dtF * 3);
  view.cx += (S.boat.x - view.cx) * k;
  view.cy += (S.boat.y - view.cy) * k;
  view.shift += ((sheetKind ? 1 : 0) - view.shift) * k;
  fx.target = manual && S.boat.mode === 'manual' ? manual : null;
  R.draw(S, view, fx, now / 1000, dtF);
  hud();
  requestAnimationFrame(frame);
}

function manualArrival() {
  if (S.boat.mode !== 'manual' || !manual) return;
  if (Math.hypot(manual.x - S.boat.x, manual.y - S.boat.y) < 0.7) {
    if (manual.dock) {
      const isle = islandById(manual.dock);
      dock(isle, true);
    } else S.boat.mode = 'idle';
    manual = null;
  }
}

function dock(isle, openSheetToo) {
  G.dockAt(S, isle, live);
  if (S.route && S.boat.mode === 'manual') S.route = null;
  S.boat.mode = 'docked';
  manual = null;
  save();
  if (openSheetToo) openSheet('isle');
}

function collectFlotsam(f) {
  const loot = G.flotsamLoot(f.zone);
  const got = G.gain(S, loot.res, loot.n);
  if (got) floaterAtBoat(`+${got} ${RES[loot.res].name}`, '#fff');
  else floaterAtBoat('Cale pleine', '#ffd0c0');
}

// ---------- HUD ----------
let hudCache = '';
function hud() {
  const st = G.stats(S);
  const z = zoneAt(S.boat.x, S.boat.y);
  const hullK = Math.max(0, S.boat.hull / st.hull);
  const used = G.cargoUsed(S);
  const docked = S.docked ? islandById(S.docked) : null;
  const near = !docked ? G.nearIslandToDock(S) : null;
  const R_ = S.route;
  let status = '';
  if (R_ && S.boat.mode === 'route') {
    const wp = R_.wps[R_.i];
    if (R_.staying) {
      status = `Escale à ${islandById(wp.isle).name} · ${R_.untilFull ? 'jusqu\'à cale pleine' : 'encore ' + fmtDur(R_.stayLeft)}|leave|Repartir`;
    } else {
      const rest = R_.wps.slice(R_.i);
      const eta = G.routeLength(S, rest) / st.speed;
      const name = wp.isle ? islandById(wp.isle).name : 'point ' + (R_.i + 1);
      status = `Cap sur ${name} · étape ${R_.i + 1}/${R_.wps.length} · ~${fmtDur(eta)}|stop|Stop`;
    }
  } else if (R_ && S.boat.mode === 'manual') status = 'Route en pause|resume|Reprendre';

  const ctx = docked ? `isle:${docked.name}` : near ? `dock:${near.id}:${near.name}` : '';
  const moving = (S.boat.mode === 'manual' && manual) || (S.boat.mode === 'route' && R_ && !R_.staying);
  const key = [S.boat.type, Math.round(hullK * 100), z, Math.floor(S.pearls), used, st.cargo, status, ctx, moving, G.carnetCount(S) > carnetSeen].join('#');
  if (key === hudCache) return;
  hudCache = key;

  $('boatName').textContent = boatById(S.boat.type).name;
  $('hullBar').style.width = (hullK * 100).toFixed(0) + '%';
  $('hullBar').style.background = hullK < 0.3 ? 'var(--coral)' : hullK < 0.6 ? 'var(--gold)' : 'var(--teal)';
  $('zoneName').textContent = ZONES[z].name;
  $('zoneChip').classList.toggle('warn', z > st.sea);
  $('pearls').textContent = fmt(S.pearls);
  $('cargo').textContent = `${used}/${st.cargo}`;
  $('carnetDot').classList.toggle('hidden', !(G.carnetCount(S) > carnetSeen));

  const stEl = $('status');
  if (status) {
    const [txt, act, label] = status.split('|');
    stEl.innerHTML = `<span>${txt}</span><button data-act="${act}">${label}</button>`;
    stEl.classList.remove('hidden');
  } else stEl.classList.add('hidden');

  const c = $('ctx');
  if (docked) c.innerHTML = `<button class="btn cream" data-act="openIsle">${docked.home ? '⌂ ' : ''}${docked.name}</button>`;
  else if (near) c.innerHTML = `<button class="btn teal" data-act="dock" data-id="${near.id}">Accoster à ${near.name}</button>`;
  else c.innerHTML = '';
  $('drum').classList.toggle('hidden', !moving);
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  act(btn.dataset.act, btn.dataset);
});

function act(a, d) {
  const docked = S.docked ? islandById(S.docked) : null;
  switch (a) {
    case 'openIsle': openSheet('isle'); break;
    case 'dock': dock(islandById(d.id), true); break;
    case 'stop': G.setRoute(S, []); toast('Route abandonnée'); break;
    case 'resume': manual = null; S.boat.mode = 'route'; S.route.dock = null; S.route.best = 1e9; break;
    case 'leave': if (S.route) { S.route.stayLeft = 0; S.route.untilFull = false; } break;
    case 'tab': sheetTab = d.tab; renderSheet(); break;
    case 'harvest': doHarvest(docked, +d.i); break;
    case 'study': {
      const g = G.studySite(S, docked, live);
      if (g) { floaterAtBoat('Étudié !', '#ffe9a8'); }
      renderSheet(); break;
    }
    case 'sell': {
      const n = d.n === 'all' ? (S.cargo[d.res] || 0) : +d.n;
      const r = G.sell(S, docked, d.res, n);
      if (r.k) floaterAtBoat(`+${r.got.toFixed(1)} perles`, '#fff4d0');
      renderSheet(); break;
    }
    case 'buy': {
      const r = G.buy(S, docked, d.res, 1);
      if (!r.k) toast(G.cargoFree(S) <= 0 ? 'Cale pleine' : 'Pas assez de perles');
      renderSheet(); break;
    }
    case 'build': {
      if (G.buildBoat(S, docked)) { toast(`${boatById(S.boat.type).name} mis à l'eau !`, 'boat', 4); save(); }
      renderSheet(); break;
    }
    case 'repair': {
      const k = G.repair(S, docked && docked.home);
      if (k) floaterAtBoat(`Coque +${k * 5}`, '#d0ffe8'); else toast('Il faut du bois pour réparer');
      renderSheet(); break;
    }
    case 'deposit': { const n = G.deposit(S); if (n) toast(`${n} ressources mises en réserve`); renderSheet(); break; }
    case 'withdraw': { G.withdraw(S, d.res, 5); renderSheet(); break; }
    case 'reset':
      if (confirm('Recommencer une nouvelle mer ? Toute la progression sera perdue.')) { G.wipe(); location.reload(); }
      break;
    case 'closeModal': $('modal').classList.add('hidden'); break;
    case 'wish': {
      if (!d.res) S.wish = [];
      else { S.wish = S.wish || []; const i = S.wish.indexOf(d.res); if (i >= 0) S.wish.splice(i, 1); else S.wish.push(d.res); }
      renderSheet(); break;
    }
  }
  save();
}

let lastHarvest = 0;
function doHarvest(isle, i) {
  if (!isle) return;
  const now = performance.now();
  if (now - lastHarvest < 110) return;
  lastHarvest = now;
  const n = isle.nodes[i];
  const got = G.harvest(S, isle, i, 1);
  if (got) floaterAtBoat(`+${got} ${n.res === 'perle' ? 'perle' : RES[n.res].name}`, '#fff');
  else if (n.res !== 'perle' && G.cargoFree(S) <= 0) toast('Cale pleine');
  else toast('Épuisé : ça repousse doucement');
  if (sheetKind === 'isle') renderSheet();
}

// drum: tap in rhythm (~0.35–0.75 s apart) for extra push
$('drum').addEventListener('pointerdown', e => {
  e.stopPropagation();
  const now = performance.now();
  const iv = now - lastDrum;
  lastDrum = now;
  boost = Math.min(1, boost + (iv > 350 && iv < 750 ? 0.2 : 0.09));
  $('drumFill').style.height = (boost * 100) + '%';
  const d = $('drum'); d.classList.remove('hit'); void d.offsetWidth; d.classList.add('hit');
});
setInterval(() => { $('drumFill').style.height = (boost * 100) + '%'; }, 150);

// ---------- sea input ----------
const pointers = new Map();
let gesture = null;
sea.addEventListener('pointerdown', e => {
  sea.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), z0: view.zoom };
  } else gesture = { x0: e.clientX, y0: e.clientY, drag: false };
});
sea.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!gesture) return;
  if (gesture.pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    view.zoom = Math.max(0.55, Math.min(1.8, gesture.z0 * Math.hypot(a.x - b.x, a.y - b.y) / gesture.d0));
  } else if (!gesture.pinch) {
    if (!gesture.drag && Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) > 12) gesture.drag = true;
    if (gesture.drag) steerTo(R.screenToWorld(e.clientX, e.clientY), null);
  }
});
const endPointer = e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (gesture && !gesture.pinch && !gesture.drag && pointers.size === 0) tapSea(e.clientX, e.clientY);
  if (pointers.size === 0) gesture = null;
};
sea.addEventListener('pointerup', endPointer);
sea.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); gesture = null; });
sea.addEventListener('wheel', e => { view.zoom = Math.max(0.55, Math.min(1.8, view.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); }, { passive: true });

function steerTo(p, dockId) {
  if (S.boat.mode === 'route' && S.route && S.route.staying) S.route.staying = false;
  if (S.docked) G.undock(S);
  S.boat.mode = 'manual';
  manual = { x: p.x, y: p.y, dock: dockId };
}

function tapSea(X, Y) {
  // creatures, nodes, flotsam first
  let best = null, bd = Infinity;
  for (const h of R.hits) {
    const d = Math.hypot(h.x - X, h.y - Y);
    if (d < h.r && d < bd) { bd = d; best = h; }
  }
  const b = S.boat;
  if (best) {
    if (best.kind === 'node' && S.docked === best.isle.id) { doHarvest(best.isle, best.i); return; }
    if (best.kind === 'creature') {
      const near = S.docked === best.isle.id || Math.hypot(best.isle.x - b.x, best.isle.y - b.y) < best.isle.r + 5;
      if (near) {
        if (G.observe(S, best.sp, live)) floater('Nouveau !', X, Y - 10, '#d0ffe8');
        else floater(SPECIES[best.sp].name, X, Y - 10, '#fff');
        save(); return;
      }
    }
    if (best.kind === 'seafauna' && Math.hypot(best.a.x - b.x, best.a.y - b.y) < 11) {
      if (!G.observe(S, best.a.sp, live)) floater(SPECIES[best.a.sp].name, X, Y - 10, '#fff');
      best.a.life = Math.min(best.a.life, best.a.t + 2);
      save(); return;
    }
    if (best.kind === 'flotsam') { steerTo(best.f, null); return; }
  }
  // land? test raised tiles from the top down
  const TZ = 44 * view.zoom * 0.3;
  for (let z = 10; z >= 1; z--) {
    const w = R.screenToWorld(X, Y + z * TZ);
    const h = landAt(w.x, w.y);
    if (h >= z) {
      const isle = nearestIsland(w.x, w.y, 2);
      if (!isle) break;
      if (S.docked === isle.id) { openSheet('isle'); return; }
      const dp = dockPoint(isle, b.x, b.y);
      steerTo(dp, isle.id);
      return;
    }
  }
  steerTo(R.screenToWorld(X, Y), null);
}

// ---------- sheets ----------
let sheetKind = null, sheetTab = 'harvest';
function openSheet(kind) {
  if (kind === 'map') { openMap(); return; }
  if (kind !== sheetKind) sheetTab = kind === 'isle' ? 'harvest' : 'all';
  sheetKind = kind;
  if (kind === 'carnet') carnetSeen = G.carnetCount(S);
  renderSheet();
  $('sheet').classList.add('open');
  $('sheet').setAttribute('aria-hidden', 'false');
}
function closeSheet() {
  sheetKind = null;
  $('sheet').classList.remove('open');
  $('sheet').setAttribute('aria-hidden', 'true');
}
$('sheetClose').addEventListener('click', closeSheet);
$('sheet').addEventListener('click', e => { if (e.target === $('sheet')) closeSheet(); });
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openSheet(b.dataset.open)));
$('boatChip').addEventListener('click', () => openSheet('hold'));
$('purseChip').addEventListener('click', () => openSheet('hold'));
let sheetTouched = 0;
$('sheet').addEventListener('pointerdown', () => { sheetTouched = performance.now(); }, true);
setInterval(() => {
  if ((sheetKind === 'isle' || sheetKind === 'hold') && performance.now() - sheetTouched > 1500) renderSheet();
}, 2000);

let lastSheetHtml = '';
// Minimal DOM morph so buttons under a finger survive re-renders.
function morph(a, b) {
  const ac = [...a.childNodes], bc = [...b.childNodes];
  for (let i = 0; i < bc.length; i++) {
    const x = ac[i], y = bc[i];
    if (!x) { a.appendChild(y); continue; }
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y, x); continue; }
    if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    if (x.nodeType !== 1) continue;
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
    morph(x, y);
  }
  for (let i = ac.length - 1; i >= bc.length; i--) a.removeChild(ac[i]);
}
function renderSheet() {
  const body = $('sheetBody');
  const top = body.scrollTop;
  const html = { isle: sheetIsle, hold: sheetHold, carnet: sheetCarnet, log: sheetLog }[sheetKind];
  if (!html) return;
  const out = html();
  if (out === lastSheetHtml) return;
  lastSheetHtml = out;
  const tpl = document.createElement('div');
  tpl.innerHTML = out;
  morph(body, tpl);
  body.scrollTop = top;
}

function boatSvg(id, w = 70) {
  const B = BOATS.findIndex(b => b.id === id);
  const sail = ['#efe2c4', null, '#e9d7b0', '#d98a5a', '#e6c38a', '#c95f4a'][B];
  const L = 34 + B * 5;
  const hull = id === 'radeau'
    ? `<rect x="${35 - L / 2}" y="40" width="${L}" height="7" rx="2" fill="#b98458"/>`
    : `<path d="M${35 - L / 2} 40 H${35 + L / 2} Q${35 + L / 2 - 6} 49 ${35 + L / 2 - 12} 49 H${35 - L / 2 + 6} Z" fill="#8d5a3a"/>` +
      (B >= 4 ? `<path d="M${35 - L / 2 + 4} 44 H${35 + L / 2 - 4}" stroke="#6a4028" stroke-width="2"/>` : '');
  const s = sail ? (id === 'radeau'
    ? `<path d="M35 39 V12" stroke="#6a4a32" stroke-width="2"/><path d="M35 14 L22 18 L23 34 L35 36 Z" fill="${sail}"/>`
    : `<path d="M${38} 39 L${42} ${8 - B * 1.5} Q${30} ${18} ${16 - B} ${26 - B}" fill="${sail}" stroke="#5a3a26" stroke-width="1.4"/>` +
      (id === 'pahi' ? `<path d="M24 39 L27 14 Q20 20 12 26 Z" fill="#e6c38a" stroke="#5a3a26" stroke-width="1.2"/>` : ''))
    : `<path d="M28 40 L18 50 M42 40 L52 50" stroke="#6a4a32" stroke-width="2"/>`;
  return `<svg class="pic" viewBox="0 0 70 56" width="${w}"><path d="M0 50 Q17 46 35 50 T70 50 V56 H0Z" fill="#8ee6dc"/>${hull}${s}</svg>`;
}

function statGrid(B, cmp) {
  const cell = (label, v, c) => `<div class="${cmp && c > 0 ? 'up' : ''}"><b>${v}</b>${label}</div>`;
  return `<div class="statgrid">
    ${cell('vitesse', B.speed.toFixed(2).replace('.', ','), cmp && B.speed - cmp.speed)}
    ${cell('cale', B.cargo, cmp && B.cargo - cmp.cargo)}
    ${cell('coque', B.hull, cmp && B.hull - cmp.hull)}
    ${cell('mer max', ZONES[B.sea].name.split(' ')[0], cmp && B.sea - cmp.sea)}
    ${cell('équipage', B.crew, cmp && B.crew - cmp.crew)}
    ${cell('vue', B.sight, cmp && B.sight - cmp.sight)}
  </div>`;
}

function costChips(cost, pearls, atHome) {
  let h = '<div class="costs">';
  for (const [k, n] of Object.entries(cost || {})) {
    const have = (S.cargo[k] || 0) + (atHome ? S.store[k] || 0 : 0);
    h += `<span class="cost ${have >= n ? 'ok' : 'miss'}"><i style="background:${RES[k].color}"></i>${Math.min(have, n)}/${n} ${RES[k].name}</span>`;
  }
  if (pearls) h += `<span class="cost ${S.pearls >= pearls ? 'ok' : 'miss'}"><span class="pearl"></span>${fmt(Math.min(S.pearls, pearls))}/${pearls} perles</span>`;
  return h + '</div>';
}

function sheetIsle() {
  const isle = S.docked ? islandById(S.docked) : null;
  if (!isle) { closeSheet(); return ''; }
  const st = G.islandState(S, isle);
  const B = BIOMES[isle.biome];
  const tabs = [['harvest', 'Récolte'], ['fauna', 'Faune & site']];
  if (isle.village) tabs.push(['trade', 'Commerce']);
  if (isle.village && isle.village.chantier) tabs.push(['yard', 'Chantier']);
  if (isle.home) tabs.push(['store', 'Réserve']);
  if (!tabs.some(t => t[0] === sheetTab)) sheetTab = 'harvest';
  let h = `<h2>${isle.name}</h2><p class="sub">${B.name} · ${ZONES[isle.zone].name}${isle.village ? ' · ' + isle.village.name : ''}</p>`;
  h += `<div class="tabs">${tabs.map(([id, l]) => `<button data-act="tab" data-tab="${id}" class="${id === sheetTab ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const stt = G.stats(S);

  if (sheetTab === 'harvest') {
    h += '<div class="rows">';
    isle.nodes.forEach((n, i) => {
      const k = Math.floor(st.stock[i]) / n.max;
      h += `<div class="r">${resIco(n.res)}<div class="grow"><div class="name">${resName(n.res)}</div>
        <div class="meta">${Math.floor(st.stock[i])} / ${n.max} · repousse 1 / 12 min</div><div class="meter"><i style="width:${k * 100}%"></i></div></div>
        <div class="actions"><button class="btn small teal" data-act="harvest" data-i="${i}" ${st.stock[i] < 1 ? 'disabled' : ''}>Récolter</button></div></div>`;
    });
    h += '</div>';
    const rate = Math.round(14 * stt.crew * stt.gather);
    h += `<p class="note">Amarré ici, votre équipage (${stt.crew}) récolte seul environ <b>${rate} ressources / h</b>, même hors ligne, jusqu'à remplir la cale. Touchez aussi les ressources sur l'île.</p>`;
    const hullMissing = stt.hull - Math.floor(S.boat.hull);
    if (hullMissing > 0) {
      const need = G.repairCost(S);
      h += `<div class="r"><span class="ico" style="background:#2fa58c22"><i style="background:#2fa58c"></i></span><div class="grow"><div class="name">Coque ${Math.floor(S.boat.hull)} / ${stt.hull}</div>
        <div class="meta">${need} bois pour tout réparer · se répare aussi lentement à quai</div></div>
        <button class="btn small cream" data-act="repair">Réparer</button></div>`;
    }
  } else if (sheetTab === 'fauna') {
    h += '<div class="rows">';
    for (const sp of isle.fauna) {
      const known = S.carnet.sp[sp];
      h += `<div class="r"><span class="ico" style="background:${SPECIES[sp].color}33"><i style="background:${known ? SPECIES[sp].color : '#c9c2b4'};border-radius:50%"></i></span>
        <div class="grow"><div class="name">${known ? SPECIES[sp].name : 'Espèce inconnue'}</div>
        <div class="meta">${known ? 'Au carnet · vu ' + known + ' fois' : 'Touchez l\'animal marqué « ? » sur l\'île'}</div></div></div>`;
    }
    if (isle.site) {
      const S2 = SITES[isle.site.type];
      h += `<div class="r"><span class="ico" style="background:#e2b34a33"><i style="background:#e2b34a"></i></span>
        <div class="grow"><div class="name">${S2.name}</div><div class="meta">${st.studied ? 'Étudié' : 'Un lieu des anciens. L\'étudier révèle un présent.'}</div></div>
        ${st.studied ? '' : '<button class="btn small" data-act="study">Étudier</button>'}</div>`;
    }
    h += '</div>';
  } else if (sheetTab === 'trade') {
    h += `<p class="note">Les prix baissent quand vous vendez beaucoup et remontent en une heure environ. Chaque village paie mieux ce que son île ne produit pas.</p><div class="rows">`;
    for (const id of RES_IDS) {
      const have = S.cargo[id] || 0;
      const sp = G.sellPrice(S, isle, id), bp = G.buyPrice(S, isle, id);
      h += `<div class="r">${resIco(id)}<div class="grow"><div class="name">${RES[id].name} <span class="meta">× ${have}</span></div>
        <div class="meta">vente ${sp.toFixed(1)} · achat ${bp.toFixed(1)}</div></div>
        <div class="actions">
          <button class="btn small teal" data-act="sell" data-res="${id}" data-n="1" ${have ? '' : 'disabled'}>Vendre</button>
          <button class="btn small cream" data-act="sell" data-res="${id}" data-n="all" ${have > 1 ? '' : 'disabled'}>Tout</button>
          <button class="btn small cream" data-act="buy" data-res="${id}" ${S.pearls >= bp ? '' : 'disabled'}>Acheter</button>
        </div></div>`;
    }
    h += '</div>';
  } else if (sheetTab === 'yard') {
    const nb = G.nextBoat(S);
    const cur = boatById(S.boat.type);
    if (!nb) h += `<p class="note">Vous possédez déjà le plus grand navire connu. Les mers légendaires vous attendent.</p>`;
    else {
      const ok = G.canPay(S, nb.cost, nb.pearls, isle.home);
      h += `<div class="boatcard">${boatSvg(nb.id)}<div class="grow"><div class="name" style="font-weight:800;font-size:16px">${nb.name}</div><div class="meta">${nb.desc}</div></div></div>
        ${statGrid(nb, cur)}${costChips(nb.cost, nb.pearls, isle.home)}
        ${isle.home ? '<p class="note">Au chantier de Motu Iti, la réserve compte aussi.</p>' : ''}
        <button class="btn" style="width:100%" data-act="build" ${ok ? '' : 'disabled'}>Construire</button>`;
    }
  } else if (sheetTab === 'store') {
    h += `<button class="btn teal" style="width:100%" data-act="deposit" ${G.cargoUsed(S) ? '' : 'disabled'}>Tout déposer dans la réserve</button><div class="rows" style="margin-top:10px">`;
    const ids = RES_IDS.filter(id => S.store[id]);
    if (!ids.length) h += '<p class="note">La réserve est vide. Elle n\'a pas de limite et sert au chantier de Motu Iti.</p>';
    for (const id of ids) {
      h += `<div class="r">${resIco(id)}<div class="grow"><div class="name">${RES[id].name}</div><div class="meta">${S.store[id]} en réserve</div></div>
        <button class="btn small cream" data-act="withdraw" data-res="${id}">Prendre 5</button></div>`;
    }
    h += '</div>';
  }
  return h;
}

function sheetHold() {
  const st = G.stats(S);
  const B = boatById(S.boat.type);
  const nb = G.nextBoat(S);
  let h = `<h2>${B.name}</h2><p class="sub">${B.desc}</p>
    <div class="boatcard">${boatSvg(B.id)}<div class="grow">
      <div class="meta">Coque</div><div class="meter"><i style="width:${Math.floor(S.boat.hull / st.hull * 100)}%"></i></div>
      <div class="meta" style="margin-top:6px">Cale ${G.cargoUsed(S)} / ${st.cargo}</div><div class="meter"><i style="width:${G.cargoUsed(S) / st.cargo * 100}%;background:var(--gold)"></i></div>
    </div></div>${statGrid(st)}`;
  const wish = S.wish || [];
  h += `<h3>Consignes de l'équipage</h3><p class="note" style="margin-top:0">Ce que l'équipage récolte en priorité quand il est à quai sans vous. En auto, il vise ce qui manque au prochain bateau, puis le plus précieux.</p>
    <div class="tabs" style="flex-wrap:wrap;margin:0;padding:0"><button data-act="wish" data-res="" class="${wish.length ? '' : 'on'}">Auto</button>${RES_IDS.map(id => `<button data-act="wish" data-res="${id}" class="${wish.includes(id) ? 'on' : ''}">${RES[id].name}</button>`).join('')}</div>`;
  h += `<h3>Cale</h3><div class="rows">`;
  const ids = RES_IDS.filter(id => S.cargo[id]);
  if (!ids.length) h += '<p class="note">La cale est vide. Récoltez sur les îles, repêchez les épaves.</p>';
  for (const id of ids) h += `<div class="r">${resIco(id)}<div class="grow"><div class="name">${RES[id].name}</div><div class="meta">valeur de base ${RES[id].value}</div></div><b>${S.cargo[id]}</b></div>`;
  h += `</div><div class="r" style="margin-top:8px"><span class="ico" style="background:#ece4f0"><span class="pearl" style="width:14px;height:14px"></span></span><div class="grow"><div class="name">Perles</div><div class="meta">la monnaie des lagons</div></div><b>${fmt(S.pearls)}</b></div>`;
  if (nb) {
    h += `<h3>Prochain bateau</h3><div class="boatcard">${boatSvg(nb.id, 56)}<div class="grow"><div class="name" style="font-weight:800">${nb.name}</div><div class="meta">${nb.desc}</div></div></div>
      ${costChips(nb.cost, nb.pearls, true)}<p class="note">À construire dans un chantier : Motu Iti ou un village marqué ⚒ (« Chantier »). La réserve de Motu Iti compte.</p>`;
  }
  return h;
}

function sheetCarnet() {
  const n = G.carnetCount(S);
  const next = PERKS.find(p => p.at > n);
  const prev = [...PERKS].reverse().find(p => p.at <= n);
  const k = next ? (n - (prev ? prev.at : 0)) / (next.at - (prev ? prev.at : 0)) : 1;
  let h = `<h2>Carnet de découvertes</h2><p class="sub">${n} entrées · ${next ? `prochain savoir à ${next.at}` : 'tous les savoirs acquis'}</p>
    <div class="progress"><i style="width:${k * 100}%"></i></div>`;
  h += '<h3>Savoirs des anciens</h3><div class="rows">';
  for (const p of PERKS) h += `<div class="perk ${n >= p.at ? 'on' : ''}"><span class="n">${p.at}</span><div><div>${p.name}</div><div class="d">${p.desc}</div></div></div>`;
  h += '</div><h3>Biomes</h3><div class="grid">';
  for (const id of BIOME_IDS) {
    const B = BIOMES[id], known = S.carnet.biome[id];
    h += `<div class="card ${known ? '' : 'unknown'}"><span style="width:30px;height:30px;transform:rotate(45deg);border-radius:6px;background:${known ? B.high : '#ddd3c0'};box-shadow:inset -5px -5px 0 ${known ? B.low : '#cfc4ae'}"></span>${known ? B.name : '???'}<span class="where">dès ${ZONES[B.minZone].name.toLowerCase()}</span></div>`;
  }
  h += '</div><h3>Faune</h3><div class="grid">';
  for (const id of SPECIES_IDS) {
    const sp = SPECIES[id], known = S.carnet.sp[id];
    const where = sp.where === 'mer' ? ZONES[sp.zone].name : (known || S.carnet.biome[sp.where] ? BIOMES[sp.where].name : '?');
    h += `<div class="card ${known ? '' : 'unknown'}"><span style="width:26px;height:26px;border-radius:50%;background:${known ? sp.color : '#ddd3c0'};box-shadow:0 0 0 3px ${known ? sp.color + '33' : 'transparent'}"></span>${known ? sp.name : '???'}<span class="where">${where}${'★'.repeat(sp.rare - 1)}</span></div>`;
  }
  h += '</div><h3>Sites anciens</h3><div class="grid">';
  for (const id of SITE_IDS) {
    const known = S.carnet.site[id];
    h += `<div class="card ${known ? '' : 'unknown'}"><span style="width:26px;height:26px;background:${known ? '#e2b34a' : '#ddd3c0'};clip-path:polygon(50% 0,100% 100%,0 100%)"></span>${known ? SITES[id].name : '???'}</div>`;
  }
  return h + '</div>';
}

function sheetLog() {
  let h = `<h2>Journal de bord</h2><p class="sub">${fmt(S.stats.dist)} milles parcourus · ${Object.keys(S.known).length} îles connues · ${S.stats.storms} grains · ${S.stats.wrecks} naufrages</p><div class="log">`;
  for (const e of [...S.log].reverse()) h += `<div class="k-${e.k}"><time>${fmtTime(e.t)}</time><span>${e.m}</span></div>`;
  h += `</div><p class="note" style="margin-top:18px">Graine du monde : ${S.seed}</p><button class="btn ghost" data-act="reset">Recommencer une nouvelle mer</button>`;
  return h;
}

// ---------- map ----------
function openMap() {
  closeSheet();
  $('mapScreen').classList.remove('hidden');
  M.open();
  mapSummary(M.summary());
}
$('mapClose').addEventListener('click', () => $('mapScreen').classList.add('hidden'));
$('mapUndo').addEventListener('click', () => M.undo());
$('mapClear').addEventListener('click', () => M.clear());
$('mapGo').addEventListener('click', () => {
  const plan = M.plan;
  if (!plan.length) { G.setRoute(S, []); $('mapScreen').classList.add('hidden'); return; }
  manual = null;
  G.setRoute(S, plan.map(w => ({ ...w })));
  save();
  $('mapScreen').classList.add('hidden');
  toast('Route lancée : le bateau la suivra même appli fermée', '', 3.5);
});
M.onChange(mapSummary);

function mapSummary(sm) {
  let h = '';
  if (!sm.n) h = S.route ? 'Route en cours effacée : touchez « Lancer » pour l\'annuler.' : 'Aucune étape.';
  else {
    h = `${sm.n} étape${sm.n > 1 ? 's' : ''} · ${fmt(sm.dist)} milles · ~${fmtDur(sm.secs)}${sm.untilFull ? ' + escales' : ''}`;
    const stops = sm.plan.map((w, i) => {
      if (!w.isle) return null;
      const last = i === sm.plan.length - 1;
      return `${i + 1}. ${islandById(w.isle).name} : ${last ? 'amarrage final' : STAYS.find(o => o.s === w.stay).label.toLowerCase()}`;
    }).filter(Boolean);
    if (stops.length) h += `<br><span style="font-weight:600;color:var(--ink-soft)">${stops.join(' · ')}</span>`;
    if (sm.zone > sm.sea + 1) h += `<br><span class="warn">⚠ Elle mène vers ${ZONES[sm.zone].name.toLowerCase()} : trop fort, le bateau s'arrêtera à la frontière.</span>`;
    else if (sm.zone > sm.sea) h += `<br><span class="warn">⚠ Passe par ${ZONES[sm.zone].name.toLowerCase()} : grains fréquents, coque en danger.</span>`;
    if (sm.secs > OFFLINE_CAP_H * 3600) h += `<br><span style="color:var(--ink-soft)">Hors ligne, le journal couvre ${OFFLINE_CAP_H} h au plus.</span>`;
  }
  $('mapSum').innerHTML = h;
  $('mapGo').textContent = sm.n ? 'Lancer la route' : (S.route ? 'Annuler la route' : 'Lancer la route');
  $('mapGo').disabled = !sm.n && !S.route;
  $('mapUndo').disabled = !sm.n; $('mapClear').disabled = !sm.n;
}

{
  const chart = $('chart');
  const pts = new Map();
  let g = null;
  chart.addEventListener('pointerdown', e => {
    chart.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      g = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), s0: M.view.scale };
    } else g = { x0: e.clientX, y0: e.clientY, vx: M.view.x, vy: M.view.y, moved: false };
  });
  chart.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !g) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      M.view.scale = Math.max(0.5, Math.min(9, g.s0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0));
      M.draw();
    } else if (!g.pinch) {
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (Math.hypot(dx, dy) > 8) g.moved = true;
      if (g.moved) { M.view.x = g.vx - dx / M.view.scale; M.view.y = g.vy - dy / M.view.scale; M.draw(); }
    }
  });
  chart.addEventListener('pointerup', e => {
    pts.delete(e.pointerId);
    if (g && !g.pinch && !g.moved && pts.size === 0) M.tap(e.clientX, e.clientY);
    if (!pts.size) g = null;
  });
  chart.addEventListener('pointercancel', e => { pts.delete(e.pointerId); g = null; });
  chart.addEventListener('wheel', e => { M.view.scale = Math.max(0.5, Math.min(9, M.view.scale * (e.deltaY > 0 ? 0.9 : 1.1))); M.draw(); }, { passive: true });
}

// ---------- journal modal ----------
function showJournal(j) {
  const gathered = Object.entries(j.sum.res).filter(([, n]) => n > 0);
  const notable = j.journal.filter(e => e.k !== 'route' || /Arrivé|interrompue|Fin/.test(e.m));
  if (j.away < 300 && !notable.length && !gathered.length) { toast(`De retour après ${fmtDur(j.away)}`); return; }
  let h = `<div class="tapa"></div><div class="inner"><h2>Pendant votre absence</h2>
    <p class="sub">${fmtDur(j.away)} au large${j.capped ? ` · l'équipage s'est reposé au-delà de ${OFFLINE_CAP_H} h` : ''}</p>
    <div class="sumgrid"><div><b>${fmt(j.sum.dist)}</b>milles</div><div><b>${j.sum.found}</b>îles aperçues</div><div><b>${gathered.reduce((a, e) => a + e[1], 0)}</b>récoltés</div></div>`;
  if (gathered.length) h += `<div class="costs">${gathered.map(([k, n]) => `<span class="cost"><i style="background:${RES[k].color}"></i>+${n} ${RES[k].name}</span>`).join('')}</div>`;
  const hullNow = Math.floor(S.boat.hull), hullD = hullNow - Math.floor(j.start.hull);
  if (hullD < 0) h += `<p class="note">Coque : ${hullD} (${hullNow} / ${G.stats(S).hull})</p>`;
  h += '<div class="log">';
  for (const e of notable.slice(-30)) h += `<div class="k-${e.k}"><time>${fmtTime(e.t)}</time><span>${e.m}</span></div>`;
  h += `</div><button class="btn" data-act="closeModal">Reprendre la barre</button></div>`;
  $('modalCard').innerHTML = h;
  $('modal').classList.remove('hidden');
}

function showIntro() {
  $('modalCard').innerHTML = `<div class="tapa"></div><div class="inner title-screen">
    <h1>MOTU</h1>
    <p>Un radeau de troncs, un lagon, et l'océan tout autour.</p>
    <p class="note" style="text-align:left">
      <b>Touchez la mer</b> pour naviguer, <b>touchez une île</b> pour y accoster. Faites glisser le doigt pour barrer.<br>
      <b>À quai</b>, récoltez : votre équipage continue seul quand l'appli est fermée.<br>
      <b>Sur la carte</b>, tracez une route avec des escales : le bateau la suit même hors ligne, et le journal raconte le voyage à votre retour.<br>
      <b>Battez le pahu</b> (le tambour) en rythme pour ramer plus vite.<br>
      Construisez de meilleurs bateaux pour affronter la haute mer.
    </p>
    <button class="btn" data-act="closeModal">Embarquer</button></div>`;
  $('modal').classList.remove('hidden');
}

// ---------- boot ----------
function resize() { R.resize(); if (!$('mapScreen').classList.contains('hidden')) { M.resize(); M.draw(); } }
window.addEventListener('resize', resize);
resize();
if (firstRun) { showIntro(); save(); }
else {
  const j = G.catchUp(S, Date.now());
  view.cx = S.boat.x; view.cy = S.boat.y;
  if (j) showJournal(j);
  save();
}
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// debug hook for testing in the console
window.motu = { get state() { return S; }, G, save, showJournal };
