import { LEVELS, ENDING, buildTrack } from './tracks.js';
import { makeRace, stepRace, ranking, DT } from './race.js';
import { prepareTrack, drawFrame, drawThumb, fmt } from './render.js';
import { unlock, engine, beep, chord, setSound, sound } from './audio.js';

const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, dpr = 1;

// ---------- save ----------
const KEY = 'vecteur-v1';
let save = { levels: {}, sound: true };
try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch {} };
const loadGhost = id => { try { return JSON.parse(localStorage.getItem('vecteur-ghost-' + id) || 'null'); } catch { return null; } };
const saveGhost = (id, g) => { try { localStorage.setItem('vecteur-ghost-' + id, JSON.stringify(g)); } catch {} };
const Q = new URLSearchParams(location.search), ALL = Q.has('all');
const unlocked = i => ALL || i === 0 || (save.levels[LEVELS[i - 1].id]?.stars || 0) >= 1;

setSound(save.sound);
const sndBtn = $('snd');
const paintSnd = () => { sndBtn.textContent = 'SON : ' + (sound.on ? 'OUI' : 'NON'); };
paintSnd();
sndBtn.onclick = () => { save.sound = !sound.on; setSound(save.sound); persist(); paintSnd(); };

// ---------- tracks (built once) ----------
const TRACKS = LEVELS.map(d => prepareTrack(buildTrack(d)));

// ---------- screens ----------
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('show', s.id === id));
  $('pauseBtn').classList.toggle('show', id === null && !!game);
}
function setHue(h) { document.documentElement.style.setProperty('--hue', h); }
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (b.dataset.go === 'title') { game = null; show('title'); } });

$('play').onclick = () => { unlock(); openLevels(); };

const stars = n => '★'.repeat(n) + `<i>${'★'.repeat(3 - n)}</i>`;

function openLevels() {
  game = null;
  setHue(190);
  const grid = $('grid');
  grid.innerHTML = '';
  let tot = 0;
  LEVELS.forEach((d, i) => {
    const rec = save.levels[d.id] || {};
    tot += rec.stars || 0;
    const b = document.createElement('button');
    b.className = 'lv' + (unlocked(i) ? '' : ' locked');
    b.style.setProperty('--h', d.hue);
    b.innerHTML = `<canvas width="320" height="200"></canvas>
      <div class="num">${String(i + 1).padStart(2, '0')} · ${d.mode === 'race' ? `COURSE ×${d.rivals}` : 'CHRONO'}</div>
      <div class="nm">${d.name.toUpperCase()}</div>
      <div class="meta"><span class="st">${stars(rec.stars || 0)}</span><span>${rec.best ? fmt(rec.best) : ''}</span></div>`;
    drawThumb(b.querySelector('canvas'), TRACKS[i], d.hue);
    b.onclick = () => { unlock(); startStory(i); };
    grid.appendChild(b);
  });
  $('totStars').textContent = `★ ${tot}/${LEVELS.length * 3}`;
  show('levels');
}

// ---------- story ----------
let storyLines = [], storyK = 0, storyDone = null, typer = 0;
function startStory(i) {
  const d = LEVELS[i];
  setHue(d.hue);
  const seen = save.levels[d.id]?.seen;
  if (seen) { startLevel(i); return; }
  playStory(d.story, () => { save.levels[d.id] = { ...(save.levels[d.id] || {}), seen: true }; persist(); startLevel(i); });
}
function playStory(lines, done) {
  storyLines = lines; storyK = 0; storyDone = done;
  // show the first track behind the dialog
  show('story');
  typeLine();
}
function typeLine() {
  const el = $('storyText'), txt = storyLines[storyK];
  clearInterval(typer);
  let k = 0;
  el.textContent = '';
  typer = setInterval(() => {
    k++; el.textContent = txt.slice(0, k);
    if (k % 2 === 0) beep(1400 + Math.random() * 400, 0.025, 'square', 0.03);
    if (k >= txt.length) clearInterval(typer);
  }, 28);
}
$('story').onclick = () => {
  const el = $('storyText'), txt = storyLines[storyK];
  if (txt == null) return;
  if (el.textContent.length < txt.length) { clearInterval(typer); el.textContent = txt; return; }
  storyK++;
  if (storyK >= storyLines.length) storyDone();
  else typeLine();
};

// ---------- game ----------
let game = null;
const input = { keys: new Set(), touches: new Map(), L: false, R: false };
const touchUI = matchMedia('(pointer: coarse)').matches;

function startLevel(i) {
  const def = LEVELS[i], track = TRACKS[i];
  const race = makeRace(track, i);
  if (Q.has('bot')) race.ships[0].skill = { thrust: 1, look: 10, correct: 0.75, dead: 0.08 }; // debug autopilot
  const rec = save.levels[def.id] || {};
  const p = race.ships[0];
  game = {
    i, def, race, hue: def.hue, input,
    cam: { x: p.x, y: p.y, z: 1 },
    fx: { sparks: [], streaks: Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), l: 0.5 + Math.random() })) },
    bestLap: rec.bestLap || null,
    ghostData: def.mode === 'solo' ? loadGhost(def.id) : null,
    ghost: null, rec: [], recT: 0,
    toast: null, hint: null, paused: false, endT: 0, lastCount: 4,
  };
  if (i === 0) game.hint = { t: 7, lines: touchUI ? ['◀ toucher à gauche · à droite ▶ : pivoter', 'les deux côtés : pousser'] : ['← → : pivoter', '← + → ensemble (ou ↑) : pousser'] };
  if (def.id === 'frottement') game.hint = { t: 6, lines: ['longe les murs au plus près :', 'chaque frottement t\'accélère'] };
  if (def.gravity) game.hint = { t: 5, lines: ['la gravité tire vers le bas'] };
  setHue(def.hue);
  resize();
  game.cam.z = baseZoom();
  show(null);
}

const baseZoom = () => Math.min(W, H) / 560 * (W < H ? 1 : 1.15);

function readInput() {
  let L = false, R = false;
  for (const side of input.touches.values()) { if (side === 'L') L = true; else R = true; }
  const k = input.keys;
  if (k.has('ArrowLeft') || k.has('KeyA') || k.has('KeyQ')) L = true;
  if (k.has('ArrowRight') || k.has('KeyD')) R = true;
  if (k.has('ArrowUp') || k.has('KeyW') || k.has('KeyZ') || k.has('Space')) { L = true; R = true; }
  input.L = L; input.R = R;
  return [L, R];
}

cv.addEventListener('pointerdown', e => { unlock(); input.touches.set(e.pointerId, e.clientX < W / 2 ? 'L' : 'R'); cv.setPointerCapture?.(e.pointerId); e.preventDefault(); });
cv.addEventListener('pointermove', e => { if (input.touches.has(e.pointerId)) input.touches.set(e.pointerId, e.clientX < W / 2 ? 'L' : 'R'); });
const lift = e => input.touches.delete(e.pointerId);
cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift); cv.addEventListener('lostpointercapture', lift);
addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP') { if (game && !game.paused && game.race.state !== 'done') pause(); else if (game?.paused) resume(); return; }
  if (e.code === 'KeyR' && game) { startLevel(game.i); return; }
  input.keys.add(e.code); unlock();
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => input.keys.delete(e.code));
addEventListener('blur', () => { input.keys.clear(); input.touches.clear(); if (game && game.race.state !== 'done' && !game.paused) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game && game.race.state !== 'done' && !game.paused) pause(); });
addEventListener('contextmenu', e => e.preventDefault());

function pause() { game.paused = true; input.touches.clear(); show('pause'); }
function resume() { game.paused = false; show(null); last = performance.now(); }
$('pauseBtn').onclick = () => game && pause();
$('resume').onclick = resume;
$('restart').onclick = () => startLevel(game.i);
$('quit').onclick = openLevels;
$('again').onclick = () => startLevel(game.i);
$('menu').onclick = openLevels;
$('next').onclick = () => {
  const n = game.i + 1;
  if (n >= LEVELS.length) { playStory(ENDING, openLevels); return; }
  startStory(n);
};

function onEvents(g) {
  const r = g.race;
  for (const ev of r.events) {
    if (ev.type === 'go') { beep(1320, 0.3, 'square', 0.2); g.toast = { big: 'GO', t: 0.8 }; }
    if (ev.type === 'lap') {
      const p = r.ships[0];
      const best = !g.bestLap || ev.time < g.bestLap;
      if (best) {
        g.bestLap = ev.time;
        if (!g.ghostData || ev.time < g.ghostData.t) { g.ghostData = { t: ev.time, f: g.rec }; if (g.def.mode === 'solo') saveGhost(g.def.id, g.ghostData); }
      }
      g.rec = []; g.recT = 0;
      if (p.lap < r.laps) {
        g.toast = { big: p.lap === r.laps - 1 ? 'DERNIER TOUR' : `TOUR ${p.lap + 1}`, small: fmt(ev.time) + (best ? '  ▲ record' : ''), t: 1.8 };
        chord(p.lap === r.laps - 1 ? [660, 880, 1320] : [880, 1320]);
      }
    }
    if (ev.type === 'finish') { chord([523, 659, 784, 1046], 0.1); g.toast = { big: 'ARRIVÉE', t: 2 }; g.endT = 1.6; }
  }
  r.events.length = 0;
}

function finish(g) {
  const r = g.race, p = r.ships[0], def = g.def;
  const rec = save.levels[def.id] || {};
  let st = 0, body = '';
  const newBest = !rec.best || p.done < rec.best;
  if (def.mode === 'race') {
    const pos = r.finishOrder.indexOf(0) + 1;
    st = pos === 1 ? 3 : pos === 2 ? 2 : pos === 3 ? 1 : 0;
    $('resTitle').textContent = pos === 1 ? '1er · VICTOIRE' : `${pos}e PLACE`;
    const rk = ranking(r);
    body = '<table>' + rk.map((s, k) => `<tr class="${s.id ? '' : 'me'}"><td>${k + 1}.</td><td>${s.name}</td><td>${s.done != null ? fmt(s.done) : '…'}</td></tr>`).join('') + '</table>';
    body += `<div>meilleur tour <b>${fmt(Math.min(...p.lapTimes))}</b></div>`;
  } else {
    const [g3, g2, g1] = def.medals;
    st = p.done <= g3 ? 3 : p.done <= g2 ? 2 : p.done <= g1 ? 1 : 0;
    $('resTitle').textContent = st ? 'TRANSMIS' : 'TROP LENT';
    body = `<div>temps <b>${fmt(p.done)}</b>${newBest ? ' <span class="new">record</span>' : ''}</div>
      <div>meilleur tour <b>${fmt(Math.min(...p.lapTimes))}</b></div>
      <div>★ ${fmt(g1)} · ★★ ${fmt(g2)} · ★★★ ${fmt(g3)}</div>`;
  }
  if (!st) body += `<div>${def.mode === 'race' ? 'termine sur le podium' : 'passe sous ' + fmt(def.medals[2])} pour débloquer la suite</div>`;
  save.levels[def.id] = {
    ...rec, seen: true,
    stars: Math.max(rec.stars || 0, st),
    best: newBest ? p.done : rec.best,
    bestLap: Math.min(rec.bestLap || Infinity, ...p.lapTimes),
  };
  persist();
  $('resStars').innerHTML = stars(st);
  $('resBody').innerHTML = body;
  const canNext = (save.levels[def.id].stars || 0) >= 1 || ALL;
  $('next').style.display = canNext ? '' : 'none';
  $('next').textContent = g.i === LEVELS.length - 1 ? 'FIN' : 'SUIVANT';
  show('results');
  $('pauseBtn').classList.remove('show');
}

// ---------- loop ----------
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const g = game;
  if (!g) { engine(0, false, 0, false); idleBackdrop(now / 1000); return; }
  const r = g.race, p = r.ships[0];
  const inp = readInput();
  if (!g.paused) {
    acc += dt;
    while (acc >= DT) {
      stepRace(r, inp);
      acc -= DT;
    }
    onEvents(g);
    // countdown beeps
    if (r.state === 'count') { const c = Math.ceil(r.count); if (c < g.lastCount) { g.lastCount = c; beep(660, 0.15); } }
    // ghost record / playback (30 fps samples)
    if (r.state === 'run' && p.done == null) {
      const lt = r.t - p.lapStart;
      while (g.recT <= lt) { g.rec.push([Math.round(p.x), Math.round(p.y), Math.round(p.a * 100) / 100]); g.recT += 1 / 30; }
      if (g.ghostData && g.def.mode === 'solo') {
        const f = g.ghostData.f, k = Math.min(f.length - 1, Math.floor(lt * 30));
        g.ghost = k >= 0 && lt < g.ghostData.t ? { x: f[k][0], y: f[k][1], a: f[k][2] } : null;
      }
    } else g.ghost = null;
    // fx
    for (const s of r.ships) {
      (s.trail ||= []).push([s.x, s.y]);
      if (s.trail.length > 28) s.trail.shift();
      if (s.scrape > 0.9) for (let k = 0; k < 3; k++) {
        const sp = Math.hypot(s.vx, s.vy), j = (Math.random() - 0.5) * 0.9;
        g.fx.sparks.push({ x: s.cx, y: s.cy, vx: -s.vx * 0.4 + s.nx * (80 + Math.random() * 200) + j * sp * 0.3, vy: -s.vy * 0.4 + s.ny * (80 + Math.random() * 200) + j * sp * 0.3, life: 1, h: s.hue ?? g.hue });
      }
    }
    for (const sp of g.fx.sparks) { sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vx *= 0.92; sp.vy *= 0.92; sp.life -= dt * 2.6; }
    g.fx.sparks = g.fx.sparks.filter(s => s.life > 0).slice(-300);
    for (const st of g.fx.streaks) if (Math.random() < 0.15) { st.x = Math.random(); st.y = Math.random(); }
    if (g.toast) g.toast.t -= dt;
    if (g.hint && r.state === 'run') g.hint.t -= dt;
    // camera: lead in the direction of travel, zoom out with speed
    const sp = Math.hypot(p.vx, p.vy);
    const kp = 1 - Math.exp(-7 * dt), kz = 1 - Math.exp(-1.8 * dt);
    g.cam.x += (p.x + p.vx * 0.3 - g.cam.x) * kp;
    g.cam.y += (p.y + p.vy * 0.3 - g.cam.y) * kp;
    g.cam.z += (baseZoom() * (1 - Math.min(0.38, sp / 2600)) - g.cam.z) * kz;
    engine(sp, p.thrust && r.state === 'run', p.scrape, true);
    if (g.endT > 0) { g.endT -= dt; if (g.endT <= 0) finish(g); }
  } else engine(0, false, 0, false);
  drawFrame(ctx, W, H, dpr, g);
}

// title/menu backdrop: slow drift over the first track
function idleBackdrop(t) {
  const tr = TRACKS[0];
  const fake = { race: { track: tr, ships: [], state: 'idle', t: 0, laps: 0 }, cam: { x: 400 + Math.cos(t * 0.1) * 500, y: 600 + Math.sin(t * 0.13) * 400, z: baseZoom() * 0.7 }, fx: { sparks: [], streaks: [] }, hue: 190, input };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackdrop(fake);
}
function drawBackdrop(fake) {
  // reuse drawFrame without HUD: render with an empty ship list
  const { cam } = fake, tr = fake.race.track;
  ctx.fillStyle = '#04050b'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  ctx.fillStyle = 'hsla(190,60%,14%,0.5)'; ctx.fill(tr.gfx.floor, 'evenodd');
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, a, l] of [[16, 0.05, 55], [7, 0.14, 60], [2.2, 0.7, 75]]) { ctx.strokeStyle = `hsla(190,100%,${l}%,${a})`; ctx.lineWidth = w; ctx.stroke(tr.gfx.walls); }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}

function resize() {
  dpr = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const sf = $('safe').getBoundingClientRect();
  if (game) { game.safeTop = sf.top; game.safeBottom = H - sf.bottom; }
}
addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
