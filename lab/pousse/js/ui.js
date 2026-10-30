// HTML layer: HUD counters, floating texts, coins flying to the counter, banners, shop and album.
import { S, UPG, maxStock, regenEvery, xpNeed } from './state.js?v=1';
import { spriteURL } from './sprites.js?v=1';
import { PRIZES, RARITY, thumb } from './prizes.js?v=1';
import * as A from './audio.js?v=1';

const $ = id => document.getElementById(id);
const fxLayer = $('fx');
export const hooks = { bought: null };

export function initUI() {
  $('stockIco').src = spriteURL('coin', 3);
  $('bShop').querySelector('img').src = spriteURL('cart', 3);
  $('bAlbum').querySelector('img').src = spriteURL('book', 3);
  soundIcon();
  $('bShop').onclick = () => { A.unlock(); A.ui(); openShop(); };
  $('bAlbum').onclick = () => { A.unlock(); A.ui(); openAlbum(); };
  $('bSound').onclick = () => { S.sound = !S.sound; A.unlock(); A.ui(); soundIcon(); };
  $('modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal' || e.target.closest('.close')) closeModal(); });
}
function soundIcon() { $('bSound').querySelector('img').src = spriteURL(S.sound ? 'sound' : 'mute', 3); }

// ---------- counters ----------
let inFlight = 0, shownStock = -1, shownLvl = -1;
export function renderHUD() {
  const v = S.stock - inFlight;
  if (v !== shownStock) { $('stock').textContent = v; shownStock = v; }
  $('max').textContent = '/' + maxStock();
  const full = S.stock >= maxStock();
  $('regen').firstElementChild.style.width = full ? '100%' : (S.regen / regenEvery() * 100) + '%';
  $('regenTxt').textContent = full ? 'PLEIN' : '+1 dans ' + Math.ceil(regenEvery() - S.regen) + 's';
  if (S.lvl !== shownLvl) { $('lvl').textContent = S.lvl; shownLvl = S.lvl; }
  $('xp').firstElementChild.style.width = (S.xp / xpNeed() * 100) + '%';
}

export function bump(id, cls = 'bump') {
  const el = $(id);
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// ---------- floating text ----------
export function pop(x, y, text, cls = '') {
  const el = document.createElement('div');
  el.className = 'pop ' + cls;
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  fxLayer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ---------- coins flying into the counter ----------
const flies = [];
export function flyCoin(x, y, value, sprite = 'coin') {
  if (flies.length > 40) { inFlightArrive(value); return; }
  const el = document.createElement('img');
  el.className = 'fly';
  el.src = spriteURL(sprite, 2);
  fxLayer.appendChild(el);
  inFlight += value;
  const r = $('stockIco').getBoundingClientRect();
  flies.push({ el, x0: x, y0: y, x1: r.left + r.width / 2, y1: r.top + r.height / 2, t: 0, d: 0.55 + Math.random() * 0.25, v: value, side: (Math.random() - 0.5) * 160 });
}
function inFlightArrive(v) {
  bump('stockBox');
  A.tick(1.6);
}
export function updateFlies(dt) {
  for (let i = flies.length - 1; i >= 0; i--) {
    const f = flies[i];
    f.t += dt / f.d;
    const k = Math.min(1, f.t), e = k * k * (3 - 2 * k);
    const mx = (f.x0 + f.x1) / 2 + f.side, my = Math.min(f.y0, f.y1) - 120;
    const x = (1 - e) ** 2 * f.x0 + 2 * (1 - e) * e * mx + e * e * f.x1;
    const y = (1 - e) ** 2 * f.y0 + 2 * (1 - e) * e * my + e * e * f.y1;
    const s = 1.6 - 0.8 * e;
    f.el.style.transform = `translate(${x - 12}px,${y - 12}px) scale(${s})`;
    if (k >= 1) {
      f.el.remove();
      flies.splice(i, 1);
      inFlight -= f.v;
      inFlightArrive(f.v);
    }
  }
}

// ---------- banners, combo, chips, toast ----------
let bannerT = 0;
export function banner(title, sub = '', color = '#ffd23f', ms = 1600, img = null) {
  const el = $('banner');
  el.innerHTML = (img ? `<img src="${img}">` : '') + `<b style="color:${color}">${title}</b>` + (sub ? `<small>${sub}</small>` : '');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(bannerT);
  bannerT = setTimeout(() => el.classList.remove('show'), ms);
}

export function combo(n) {
  const el = $('combo');
  if (n < 3) { el.classList.remove('show'); return; }
  el.innerHTML = `COMBO <b>×${n}</b>`;
  el.classList.add('show');
  bump('combo', 'kick');
}

export function chips(list) {
  const el = $('chips');
  const html = list.map(c => `<span class="chip"><img src="${spriteURL(c.icon, 2)}">${Math.ceil(c.t)}s</span>`).join('');
  if (el.innerHTML !== html) el.innerHTML = html;
}

export function toast(text, ms = 2600) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

export function hint(show) { $('hint').classList.toggle('gone', !show); }

// ---------- modal: shop and album ----------
export const modalOpen = () => !$('modal').hidden;
function openModal(title, html) {
  $('modal').hidden = false;
  $('mTitle').textContent = title;
  $('mBody').innerHTML = html;
}
export function closeModal() { $('modal').hidden = true; A.ui(); }

function openShop() {
  const rows = Object.entries(UPG).map(([k, u]) => {
    const lvl = S.up[k], max = lvl >= u.costs.length, cost = u.costs[lvl];
    const pips = u.costs.map((_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
    return `<div class="up" data-k="${k}">
      <img src="${spriteURL(u.icon, 3)}">
      <div class="txt"><b>${u.name}</b><small>${u.desc}</small><span class="pips">${pips}</span></div>
      <button ${max ? 'disabled' : ''} class="${!max && S.stock >= cost ? 'can' : ''}">${max ? 'MAX' : `<img src="${spriteURL('coin', 2)}">${cost}`}</button>
    </div>`;
  }).join('');
  openModal('Boutique', `<p class="sub">Tu as <b>${S.stock}</b> pièces</p>${rows}`);
  $('mBody').querySelectorAll('.up button').forEach(b => b.onclick = () => {
    const k = b.closest('.up').dataset.k, u = UPG[k], cost = u.costs[S.up[k]];
    if (cost == null) return;
    if (S.stock < cost) { A.nope(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
    S.stock -= cost;
    S.up[k]++;
    A.buy(); A.buzz(20);
    hooks.bought?.(k);
    openShop();
    const row = $('mBody').querySelector(`.up[data-k="${k}"]`);
    row.classList.add('bought');
  });
}

function openAlbum() {
  const got = PRIZES.filter((_, i) => S.album[i]).length;
  const cells = PRIZES.map((p, i) => {
    const n = S.album[i] || 0, R = RARITY[p.rarity];
    return `<div class="card ${n ? '' : 'locked'}" style="--rc:${R.color}">
      <img src="${thumb(i)}"><b>${n ? p.name : '???'}</b><small>${R.name}${n > 1 ? ' ×' + n : ''}</small></div>`;
  }).join('');
  openModal('Album', `<p class="sub">${got} / ${PRIZES.length} figurines · ${S.stats.won} pièces gagnées · ${S.stats.jackpots} jackpot${S.stats.jackpots > 1 ? 's' : ''}</p><div class="grid">${cells}</div>`);
}
