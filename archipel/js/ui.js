// Interface tactile : joystick, bouton d'action, outils, messages, carnet et carte.
import { SPECIES, BY_ID, BIOMES, METHODS, TIMES, WEATHER, timeOk } from './species.js?v=2';

const $ = id => document.getElementById(id);
export const input = { jx: 0, jy: 0, mag: 0, dragX: 0, dragY: 0, zoom: 1, keys: {}, joyActive: false };
let handlers = {};

export function setupUI(h) {
  handlers = h;
  // joystick fixe en bas à gauche : seul un appui dessus déplace le personnage
  const joy = $('joy'), knob = $('joyKnob'); let jid = null, ox = 0, oy = 0;
  joy.addEventListener('pointerdown', e => {
    if (jid !== null) return; jid = e.pointerId; joy.setPointerCapture(jid);
    const r = joy.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2;
    joy.classList.add('on'); input.joyActive = true; e.preventDefault(); move(e);
  });
  const move = e => {
    if (e.pointerId !== jid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy), m = 48;
    if (d > m) { dx = dx / d * m; dy = dy / d * m; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; input.jx = dx / m; input.jy = -dy / m; input.mag = Math.min(1, d / m);
  };
  joy.addEventListener('pointermove', move);
  const end = e => { if (e.pointerId !== jid) return; jid = null; input.jx = input.jy = input.mag = 0; knob.style.transform = ''; joy.classList.remove('on'); input.joyActive = false; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  // un doigt : tourner la caméra ; deux doigts : zoomer
  const dragOn = el => { const pts = new Map(); let pd = 0;
    const spread = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    el.addEventListener('pointerdown', e => { if (e.target !== el) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) pd = spread(); });
    el.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 1) { input.dragX += e.clientX - p.x; input.dragY += e.clientY - p.y; }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) { const d = spread(); if (pd) input.zoom *= pd / d; pd = d; } });
    const up = e => { pts.delete(e.pointerId); pd = pts.size === 2 ? spread() : 0; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => { input.zoom *= Math.exp(e.deltaY * .001); e.preventDefault(); }, { passive: false }); };
  dragOn($('c')); dragOn($('photoUI'));
  const A = $('bA');
  A.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); A.classList.add('press'); handlers.onA?.(); });
  A.addEventListener('pointerup', () => A.classList.remove('press')); A.addEventListener('pointerleave', () => A.classList.remove('press'));
  for (const b of document.querySelectorAll('#tools button')) b.addEventListener('pointerdown', e => { e.stopPropagation(); handlers.onTool?.(b.dataset.tool); });
  $('bBook').onclick = () => handlers.onBook?.(); $('bMap').onclick = () => handlers.onMap?.();
  $('bCall').onclick = () => handlers.onCall?.();
  $('shutter').addEventListener('pointerdown', e => { e.stopPropagation(); handlers.onShutter?.(); });
  $('phExit').addEventListener('pointerdown', e => { e.stopPropagation(); handlers.onPhotoExit?.(); });
  $('zoom').addEventListener('pointerdown', e => e.stopPropagation());
  $('mClose').onclick = closeModal; $('modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });
  $('card').onclick = hideCard;
  addEventListener('keydown', e => {
    input.keys[e.code] = true;
    if (e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); handlers.onA?.(); }
    if (e.code === 'Digit1') handlers.onTool?.('filet'); if (e.code === 'Digit2') handlers.onTool?.('canne'); if (e.code === 'Digit3') handlers.onTool?.('photo');
    if (e.code === 'KeyB') handlers.onBook?.(); if (e.code === 'KeyM') handlers.onMap?.(); if (e.code === 'Escape') { closeModal(); handlers.onPhotoExit?.(); }
  });
  addEventListener('keyup', e => { input.keys[e.code] = false; });
}
export function readKeys() {
  const k = input.keys; if (input.joyActive) return;
  const x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), y = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
  const d = Math.hypot(x, y); input.jx = d ? x / d : 0; input.jy = d ? y / d : 0; input.mag = d ? (k.ShiftLeft || k.ShiftRight ? .4 : 1) : 0;
}

export function toast(msg, ms = 2600) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg; $('toasts').appendChild(t);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  setTimeout(() => t.remove(), ms);
}
let aKey = '';
export function setA(icon, label, cls = '') {
  const k = icon + label + cls; if (k === aKey) return; aKey = k;
  $('bAicon').textContent = icon; $('bAlbl').textContent = label; $('bA').className = cls;
}
export function setTool(name, dim) {
  for (const b of document.querySelectorAll('#tools button')) b.classList.toggle('on', b.dataset.tool === name);
  $('tools').classList.toggle('dim', !!dim);
}
export function showTools(v) { $('tools').classList.toggle('hidden', !v); }
let clk = '';
export function setClock(txt) { if (txt !== clk) { clk = txt; $('clkTime').textContent = txt; } }
export function setWeatherIcon(e) { if ($('clkWx').textContent !== e) $('clkWx').textContent = e; }
export function setCount(n) { $('cnt').textContent = n; }
let infoKey = null;
export function info(html) {
  if (html === infoKey) return; infoKey = html;
  if (html) { $('info').innerHTML = html; $('info').classList.add('show'); } else $('info').classList.remove('show');
}
let placeT = 0;
export function showPlace(name, sub) { $('place').innerHTML = `<b>${name}</b><span>${sub}</span>`; $('place').classList.add('show'); clearTimeout(placeT); placeT = setTimeout(() => $('place').classList.remove('show'), 3200); }
let cardT = 0;
export function showCard(html, ms = 4200) { $('card').innerHTML = html; $('card').classList.remove('hidden'); clearTimeout(cardT); cardT = setTimeout(hideCard, ms); }
export function hideCard() { $('card').classList.add('hidden'); }
export const cardOpen = () => !$('card').classList.contains('hidden');
export function flash() { const f = $('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); }
export function fade(on) { $('fade').classList.toggle('on', on); }
export function bite(x, y) { const b = $('bite'); if (x === null) { b.style.display = 'none'; return; } b.style.display = 'block'; b.style.left = x + 'px'; b.style.top = y + 'px'; }
export function callBtn(v) { $('bCall').classList.toggle('hidden', !v); }
export function photoUI(on) { $('photoUI').classList.toggle('hidden', !on); $('hud').classList.toggle('hidden', on); }
export const zoomValue = () => +$('zoom').value;
export function resetZoom() { $('zoom').value = 0; }
export function showHUD() { $('hud').classList.remove('hidden'); }

// ---------- fenêtres ----------
export const modalOpen = () => !$('modal').classList.contains('hidden');
export function closeModal() { if (!modalOpen()) return; $('modal').classList.add('hidden'); handlers.onModalClose?.(); }
function openModal(title) { $('mTitle').textContent = title; $('mTabs').innerHTML = ''; $('mBody').innerHTML = ''; $('modal').classList.remove('hidden'); $('mBody').scrollTop = 0; }

const fmtTime = sp => TIMES[sp.time].nom + (sp.weather ? ' · ' + WEATHER[sp.weather].toLowerCase() : '');
export function openCarnet(ctx, tab = 'tout') {
  openModal('Carnet de terrain');
  const tabs = [['tout', 'Tout'], ...Object.entries(BIOMES).map(([k, v]) => [k, v.emoji + ' ' + v.nom])];
  for (const [k, l] of tabs) { const b = document.createElement('button'); b.textContent = l; b.className = k === tab ? 'on' : ''; b.onclick = () => openCarnet(ctx, k); $('mTabs').appendChild(b); }
  const list = SPECIES.filter(s => tab === 'tout' || s.biomes.includes(tab)), n = list.filter(s => ctx.found[s.id]).length;
  const body = $('mBody');
  body.innerHTML = `<div class="prog">${n} / ${list.length} espèces exposées au Muséum · le point vert indique ce qui est visible en ce moment</div><div class="grid"></div>`;
  const grid = body.querySelector('.grid');
  for (const sp of list) {
    const f = ctx.found[sp.id], d = document.createElement('div'); d.className = 'sp' + (f ? '' : ' unk');
    const now = timeOk(sp, ctx.hour) && (!sp.weather || (sp.weather === 'pluie') === (ctx.weather === 'pluie'));
    d.innerHTML = `<img src="${ctx.thumb(sp.id)}"><div class="n">${f ? sp.nom : '???'}</div><span class="m">${METHODS[sp.method].emoji}</span>${now ? '<span class="now"></span>' : ''}`;
    d.onclick = () => detail(ctx, sp, tab); grid.appendChild(d);
  }
}
function detail(ctx, sp, tab) {
  const f = ctx.found[sp.id], photo = ctx.photos[sp.id], body = $('mBody');
  const biomes = sp.biomes.map(b => BIOMES[b].emoji + ' ' + BIOMES[b].nom).join(', ');
  body.innerHTML = `<button class="back">← Retour</button><div class="det">
    ${photo ? `<img class="photo" src="${photo}">` : `<img src="${ctx.thumb(sp.id)}" style="${f ? '' : 'filter:brightness(0) opacity(.22)'}">`}
    <h2>${f ? sp.nom : 'Espèce inconnue'}</h2>
    <div class="facts"><span>${METHODS[sp.method].emoji} ${METHODS[sp.method].nom}</span><span>${biomes}</span>${f ? `<span>🕒 ${fmtTime(sp)}</span>` : ''}</div>
    <p>${f ? sp.desc + `<br><br><small>${METHODS[sp.method].verbe[0].toUpperCase() + METHODS[sp.method].verbe.slice(1)} le jour ${f.day}.</small>` : 'Explore ce biome pour la trouver. Certaines espèces ne sortent qu’à certaines heures, ou par certains temps.'}</p></div>`;
  body.querySelector('.back').onclick = () => openCarnet(ctx, tab); body.scrollTop = 0;
}

const BCOL = ['#3a8fbf', '#8fd06a', '#3f8050', '#e8c27a', '#eef4f8', '#5fcf7a'];
export function openMap(ctx) {
  openModal('Carte de l’archipel');
  const body = $('mBody'); body.innerHTML = '<canvas id="mapC" width="512" height="512"></canvas><div class="legend"></div>';
  const cv = $('mapC'), g = cv.getContext('2d'), { N, height, biome } = ctx.map, img = g.createImageData(N, N), E = ctx.explored, EN = ctx.exploredN;
  const deep = [31, 110, 160], shallow = [96, 200, 210];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, h = height[k] / 255 * 16 - 12, b = biome[k]; let c;
    if (h < 0) { const t = Math.min(1, -h / 7); c = shallow.map((v, q) => v + (deep[q] - v) * t); }
    else { const hex = BCOL[b] || BCOL[1]; c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; if (h < 1) c = [240, 222, 172]; }
    const ex = E[Math.floor(j / N * EN) * EN + Math.floor(i / N * EN)];
    if (!ex) c = c.map(v => v * .35 + 205 * .65);
    img.data.set([c[0], c[1], c[2], 255], k * 4);
  }
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = N; tmp.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(tmp, 0, 0, 512, 512);
  const P = (x, z) => [(x / ctx.half / 2 + .5) * 512, (z / ctx.half / 2 + .5) * 512];
  g.font = 'bold 13px ui-rounded, system-ui'; g.textAlign = 'center';
  for (const isl of ctx.islands) { const [x, y] = P(isl.x, isl.z), ex = E[Math.floor(y / 512 * EN) * EN + Math.floor(x / 512 * EN)];
    if (ex && isl.R > 14) { g.fillStyle = 'rgba(90,70,50,.85)'; g.fillText(isl.name, x, y - isl.R / ctx.half * 256 - 4); } }
  const emo = (e, x, z, s = 20) => { const [px, py] = P(x, z); g.font = s + 'px system-ui'; g.fillText(e, px, py + s * .35); };
  emo('🏛️', ctx.museum.x, ctx.museum.z, 18); if (!ctx.inBoat) emo('⛵', ctx.boat.x, ctx.boat.z, 18);
  const [px, py] = P(ctx.player.x, ctx.player.z);
  g.save(); g.translate(px, py); g.rotate(ctx.player.ry); g.fillStyle = '#e2574a'; g.strokeStyle = '#fff'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(11, 0); g.lineTo(-7, 7); g.lineTo(-3, 0); g.lineTo(-7, -7); g.closePath(); g.stroke(); g.fill(); g.restore();
  body.querySelector('.legend').innerHTML = 'Nord en haut. 🌲 Le nord est froid (forêts, banquise), le sud chaud (déserts, tropiques). Les zones claires restent à explorer.<br>Le grand large (bleu foncé) ne se traverse qu’en bateau.';
}
