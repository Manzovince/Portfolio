import { SHUFFLES, GROUPS, BY_ID, PRESETS, mulberry32, defaultParams, isDeterministic, cycleOrder, applyShuffle } from './shuffles.js';
import { DECK_TYPES, ORDERS, makeSpec, startOrder } from './deck.js';
import { METRICS, METRIC_BY_ID, metricValue, randomness, positionsOf, risingIndex, bayerDiaconis } from './stats.js';
import { css, identity, identityStops, seq, seqStops, div, divStops, series, gradientCss, fitCanvas, showTip, hideTip, lineChart, redrawChart } from './charts.js';
import { lang, setLang, L, t, translatePage } from './i18n.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// decimal comma in French
const nf = (s) => (lang === 'fr' ? String(s).replace(/(\d)\.(\d)/g, '$1,$2') : String(s));
const fmtM = (m, v) => nf(m.fmt(v));
const colon = () => (lang === 'fr' ? '\u00a0:' : ':');

const S = {
  deckType: '52', customN: 40, order: 'suit', seed: 1 + Math.floor(Math.random() * 99999),
  spec: null, history: [], view: 0, rng: null,
  compare: '1', colorMode: 'identity', animate: true,
  selected: 'riffle', params: {}, repeat: 1,
  sequence: [], running: false, follow: null, metric: 'rising', players: 4,
  anim: null, version: 0, lastPrev: null,
  tab: (() => { try { return localStorage.getItem('brassage-tab') || 'profile'; } catch (e) { return 'profile'; } })(),
};
const VIEWS = ['profile', 'd3', 'stats', 'wall', 'hands', 'lab'];
if (!VIEWS.includes(S.tab)) S.tab = 'profile';
let labTab = 'heat';
SHUFFLES.forEach((s) => (S.params[s.id] = defaultParams(s)));

/* ---------- deck & history ---------- */

const buildSpec = () => makeSpec(S.deckType, S.customN, lang);

function reset() {
  S.spec = buildSpec();
  S.history = [{ deck: startOrder(S.spec, S.order, S.seed), op: null }];
  S.view = 0;
  S.rng = mulberry32(S.seed);
  S.follow = null;
  S.anim = null;
  S.lastPrev = null;
  renderAll();
}

function summary(s, p) {
  return s.params
    .filter((d) => !d.showIf || d.showIf(p))
    .map((d) => {
      const v = p[d.key];
      if (d.type === 'select') return L(d.options.find((o) => o[0] === v)?.[1] ?? v).split(' (')[0];
      if (d.pct) return `${L(d.label).toLowerCase()} ${Math.round(v * 100)} %`.replace(' %', lang === 'fr' ? ' %' : '%');
      return `${L(d.label).toLowerCase()} ${nf(v)}`;
    })
    .join(', ');
}

function histLabel(i) {
  const op = S.history[i].op;
  if (!op) return t('start');
  return L(BY_ID[op.id].name) + (op.times > 1 ? ` ×${op.times}` : '');
}

function apply(id, params, times) {
  S.history = S.history.slice(0, S.view + 1); // shuffling from an earlier step drops the later ones
  const prev = S.history[S.view].deck;
  const deck = applyShuffle(prev, id, params, times, S.rng);
  S.history.push({ deck, op: { id, params: { ...params }, times } });
  S.view = S.history.length - 1;
  S.lastPrev = prev;
  S.version++;
  startAnim(prev);
  renderAll();
}

function undo() {
  if (S.history.length <= 1) return;
  S.history.pop();
  S.view = Math.min(S.view, S.history.length - 1);
  S.anim = null;
  S.lastPrev = null;
  renderAll();
}

function setView(v) {
  S.view = Math.max(0, Math.min(S.history.length - 1, v));
  S.anim = null;
  S.lastPrev = null;
  renderAll();
}

function refIndex(view = S.view) {
  return S.compare === 'start' ? 0 : Math.max(0, view - Number(S.compare));
}

/* ---------- animation ---------- */

function startAnim(prevDeck) {
  if (!S.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { S.anim = null; return; }
  S.anim = { from: positionsOf(prevDeck), t0: performance.now(), dur: 750 };
  const tick = () => {
    if (!S.anim) return;
    if (S.tab !== 'profile') { S.anim = null; return; }
    drawDeck();
    if (performance.now() - S.anim.t0 < S.anim.dur) requestAnimationFrame(tick);
    else { S.anim = null; drawDeck(); }
  };
  requestAnimationFrame(tick);
}
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/* ---------- colours ---------- */

function colorer(deck, ref) {
  const n = deck.length;
  const startPos = positionsOf(S.history[0].deck);
  const refPos = positionsOf(ref);
  const curPos = positionsOf(deck);
  switch (S.colorMode) {
    case 'suit': return { fn: (c) => series(S.spec.suit[c]) };
    case 'disp': return { fn: (c) => seq(Math.abs(curPos[c] - refPos[c]) / (n / 2)) };
    case 'signed': return { fn: (c) => div((curPos[c] - refPos[c]) / (n / 2)) };
    case 'neighbors': {
      const block = new Int32Array(n).fill(-1);
      let b = -1, blocks = 0, kept = 0;
      for (let i = 0; i + 1 < n; i++) {
        if (refPos[deck[i + 1]] === refPos[deck[i]] + 1) {
          if (block[deck[i]] < 0) { b++; blocks++; block[deck[i]] = b; }
          block[deck[i + 1]] = b;
          kept++;
        }
      }
      const a = series(0), c2 = series(1), none = css('--axis');
      return { fn: (c) => (block[c] < 0 ? none : block[c] % 2 ? c2 : a), blocks, kept };
    }
    case 'rising': {
      const { idx, count } = risingIndex(deck, ref);
      return { fn: (c) => (count <= 8 ? series(idx[c]) : identity(idx[c] / (count - 1))), count };
    }
    default: return { fn: (c) => identity(startPos[c] / Math.max(1, n - 1)) };
  }
}

function renderLegend(col, el = $('legend')) {
  const n = S.spec.n;
  const sw = (c, txt) => `<span><span class="sw" style="background:${c}"></span>${txt}</span>`;
  const ramp = (stops, a, b, mid) => `<span>${a}</span><span class="ramp" style="background:${gradientCss(stops)}"></span><span>${b}</span>${mid ? `<span class="muted">· ${mid}</span>` : ''}`;
  switch (S.colorMode) {
    case 'identity': el.innerHTML = ramp(identityStops(), t('lg.idA'), t('lg.idB'), t('lg.idMid')); break;
    case 'suit': el.innerHTML = S.spec.suitNames.map((s, i) => sw(series(i), esc(s))).join(''); break;
    case 'disp': el.innerHTML = ramp(seqStops(), t('lg.dispA'), t('lg.dispB', { n: Math.round(n / 2) })); break;
    case 'signed': el.innerHTML = ramp(divStops(), t('lg.sA'), t('lg.sB'), t('lg.sMid')); break;
    case 'neighbors': el.innerHTML = sw(series(0), t('lg.nbBlocks')) + sw(series(1), t('lg.nbAlt')) + sw(css('--axis'), t('lg.nbSep')) + `<span class="muted">· ${t('lg.nbCount', { k: col.kept, b: col.blocks })}</span>`; break;
    case 'rising': el.innerHTML = `<span>${el.id === 'legend3d' ? t('lg.rising3d', { c: col.count, r: refIndex() }) : t('lg.rising', { c: col.count })}</span><span class="muted">· ${t('lg.risingRandom', { e: nf(((n + 1) / 2).toFixed(1)) })}</span>`; break;
  }
}

/* ---------- side view ---------- */

let deckGeom = null;

function drawDeck() {
  const canvas = $('deckCanvas');
  const n = S.spec.n;
  const w = canvas.parentElement.clientWidth;
  const h = Math.max(2.5, Math.min(11, 560 / n));
  const top = 36;
  const ctx = fitCanvas(canvas, w, top + n * h + 4);
  const showLabels = h >= 8 && w > 380;
  const labelW = showLabels ? 36 : 0;
  const colW = Math.max(36, Math.min(120, w * 0.17));
  const x0 = labelW, x1 = w - labelW - colW;
  const ri = refIndex();
  const ref = S.history[ri].deck, deck = S.history[S.view].deck;
  const refPos = positionsOf(ref), curPos = positionsOf(deck);
  const col = colorer(deck, ref);
  const gap = h >= 5 ? 1 : 0;

  let k = 1;
  if (S.anim) k = ease(Math.min(1, (performance.now() - S.anim.t0) / S.anim.dur));
  const from = S.anim ? S.anim.from : null;
  const yCur = (c) => (from ? from[c] + (curPos[c] - from[c]) * k : curPos[c]);
  const lift = (c) => (from ? Math.sin(Math.PI * k) * Math.min(colW * 0.9, Math.abs(curPos[c] - from[c]) * h * 0.35) : 0);

  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = css('--ink');
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const refTitle = ri === S.view ? t('sameStep') : `${t('step', { n: ri })} · ${histLabel(ri)}`;
  ctx.fillText(clip(ctx, refTitle, colW + 70), x0, 14);
  ctx.textAlign = 'right';
  ctx.fillText(clip(ctx, `${t('step', { n: S.view })} · ${histLabel(S.view)}`, colW + 70), x1 + colW, 14);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = css('--muted');
  ctx.textAlign = 'left';
  ctx.fillText(t('topArrow'), x0, 29);
  ctx.textAlign = 'right';
  ctx.fillText(t('topArrow'), x1 + colW, 29);

  const f = S.follow;
  const midA = x0 + colW, midB = x1;
  const curve = (c) => {
    const ya = top + refPos[c] * h + h / 2, yb = top + yCur(c) * h + h / 2;
    ctx.beginPath();
    ctx.moveTo(midA, ya);
    ctx.bezierCurveTo((midA + midB) / 2, ya, (midA + midB) / 2, yb, midB - lift(c), yb);
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, h * 0.32);
  for (let c = 0; c < n; c++) {
    if (c === f) continue;
    ctx.strokeStyle = col.fn(c);
    ctx.globalAlpha = f != null ? 0.12 : 0.55;
    curve(c);
  }
  ctx.globalAlpha = 1;

  const drawStack = (x, posFn, isCur) => {
    for (let c = 0; c < n; c++) {
      ctx.globalAlpha = f != null && c !== f ? 0.3 : 1;
      ctx.fillStyle = col.fn(c);
      ctx.fillRect(x - (isCur ? lift(c) : 0), top + posFn(c) * h + gap / 2, colW, h - gap);
    }
    ctx.globalAlpha = 1;
  };
  drawStack(x0, (c) => refPos[c], false);
  drawStack(x1, yCur, true);

  if (f != null && f < n) {
    ctx.strokeStyle = css('--ink');
    ctx.lineWidth = 2.5;
    curve(f);
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 - 1, top + refPos[f] * h - 1, colW + 2, h + 2);
    ctx.strokeRect(x1 - lift(f) - 1, top + yCur(f) * h - 1, colW + 2, h + 2);
  }

  if (showLabels) {
    ctx.font = `${Math.min(11, h)}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    for (let c = 0; c < n; c++) {
      ctx.globalAlpha = f != null && c !== f ? 0.45 : 1;
      ctx.fillStyle = S.spec.red[c] ? css('--red-card') : css('--ink-2');
      ctx.textAlign = 'right';
      ctx.fillText(S.spec.label[c], x0 - 5, top + refPos[c] * h + h / 2);
      ctx.textAlign = 'left';
      ctx.fillText(S.spec.label[c], x1 + colW + 5, top + curPos[c] * h + h / 2);
    }
    ctx.globalAlpha = 1;
  }
  deckGeom = { top, h, x0, x1, colW, ref, deck, ri, refPos, curPos };
  if (!S.anim) renderLegend(col);
}

function clip(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  while (text.length > 3 && ctx.measureText(text + '…').width > max) text = text.slice(0, -1);
  return text + '…';
}

function deckHit(e) {
  const g = deckGeom;
  if (!g) return null;
  const r = $('deckCanvas').getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const pos = Math.floor((y - g.top) / g.h);
  if (pos < 0 || pos >= S.spec.n) return null;
  if (x <= g.x0 + g.colW + 6) return { card: g.ref[pos] };
  if (x >= g.x1 - 6) return { card: g.deck[pos] };
  return null;
}

function cardTip(c) {
  const g = deckGeom;
  const d = g.curPos[c] - g.refPos[c];
  const start = positionsOf(S.history[0].deck)[c];
  const moved = d === 0 ? t('tip.nowhere') : t(d < 0 ? 'tip.up' : 'tip.down', { d: Math.abs(d) });
  return `<b>${esc(S.spec.label[c])}</b><br><span class="k">${t('stepLower', { n: g.ri })}${colon()}</span> ${t('tip.pos', { p: g.refPos[c] + 1 })}` +
    `<br><span class="k">${t('stepLower', { n: S.view })}${colon()}</span> ${t('tip.pos', { p: g.curPos[c] + 1 })}` +
    `<br><span class="k">${t('tip.moved')}</span> ${moved}<br><span class="k">${t('tip.start')}</span> ${start + 1}`;
}

/* ---------- follow ---------- */

function renderFollow() {
  const el = $('follow');
  if (S.follow == null || S.follow >= S.spec.n) { el.innerHTML = ''; return; }
  const c = S.follow;
  const path = S.history.map((h, i) => {
    const p = positionsOf(h.deck)[c] + 1;
    return i === S.view ? `<b>${p}</b>` : p;
  });
  el.innerHTML = `${t('following', { c: esc(S.spec.label[c]) })} ${path.join(' → ')} <button class="ghost" id="unfollow">${t('stop')}</button>`;
  $('unfollow').onclick = () => { S.follow = null; renderFollow(); renderActive(); };
}

/* ---------- stats ---------- */

function renderStats() {
  const ri = refIndex();
  const ref = S.history[ri].deck, deck = S.history[S.view].deck;
  const n = S.spec.n;
  $('statsRef').textContent = t('statsRef', { v: S.view, r: ri }) + (ri === 0 ? t('startParen') : '');
  $('tiles').innerHTML = METRICS.map((m) => {
    const v = metricValue(m, deck, ref, S.spec);
    const e = m.random(n, S.spec);
    const r = randomness(m, deck, ref, S.spec);
    return `<button class="tile ${m.id === S.metric ? 'on' : ''}" data-m="${m.id}" title="${esc(L(m.help))}">
      <div class="t">${L(m.name)}</div><div class="v">${fmtM(m, v)}</div><div class="e">${t('randomDeckApprox', { v: fmtM(m, e) })}</div>
      <div class="meter"><span style="width:${(r * 100).toFixed(0)}%"></span></div><div class="meter-lab"><span>${t('ordered')}</span><span>${t('random')}</span></div></button>`;
  }).join('');
  $('tiles').querySelectorAll('.tile').forEach((b) => (b.onclick = () => { S.metric = b.dataset.m; renderStats(); }));

  const m = METRIC_BY_ID[S.metric];
  $('chartTitle').textContent = t('overHistory', { m: L(m.name) });
  const start = S.history[0].deck;
  const pts = S.history.map((h, i) => [i, metricValue(m, h.deck, start, S.spec)]);
  lineChart($('historyChart'), {
    series: [{ name: L(m.name), color: series(0), points: pts }],
    refs: [{ y: m.random(n, S.spec), label: t('random') }],
    yFmt: (v) => fmtM(m, v), xFmt: (x) => `${t('step', { n: x })}${S.history[x] ? ' · ' + histLabel(x) : ''}`,
    integerX: true, highlightX: S.view,
  });
}

/* ---------- history wall ---------- */

let wallGeom = null;

function drawWall() {
  const canvas = $('wallCanvas');
  const n = S.spec.n;
  const steps = S.history.length;
  const h = Math.max(1.5, Math.min(5, 300 / n));
  const avail = canvas.parentElement.clientWidth;
  const pitch = Math.max(46, Math.min(84, (avail - 16) / Math.max(1, steps))); // column + gap
  const colW = Math.round(pitch * 0.36), gapW = pitch - colW, top = 22, padL = 8;
  const w = Math.max(avail, padL * 2 + steps * colW + (steps - 1) * gapW);
  const H = top + n * h + 6;
  const ctx = fitCanvas(canvas, w, H);
  const startPos = positionsOf(S.history[0].deck);
  const color = (c) => identity(startPos[c] / Math.max(1, n - 1));
  const pos = S.history.map((x) => positionsOf(x.deck));
  const X = (i) => padL + i * (colW + gapW);
  const f = S.follow;

  ctx.lineWidth = Math.max(0.75, h * 0.4);
  for (let i = 0; i + 1 < steps; i++) {
    const a = X(i) + colW, b = X(i + 1);
    for (let c = 0; c < n; c++) {
      if (c === f) continue;
      ctx.strokeStyle = color(c);
      ctx.globalAlpha = f != null ? 0.1 : 0.45;
      const ya = top + pos[i][c] * h + h / 2, yb = top + pos[i + 1][c] * h + h / 2;
      ctx.beginPath(); ctx.moveTo(a, ya); ctx.bezierCurveTo((a + b) / 2, ya, (a + b) / 2, yb, b, yb); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < steps; i++) {
    if (i === S.view) { ctx.fillStyle = css('--wash'); ctx.fillRect(X(i) - 6, 2, colW + 12, H - 4); }
    ctx.fillStyle = i === S.view ? css('--ink') : css('--muted');
    ctx.fillText(String(i), X(i) + colW / 2, 14);
    const deck = S.history[i].deck;
    for (let p = 0; p < n; p++) {
      ctx.globalAlpha = f != null && deck[p] !== f ? 0.3 : 1;
      ctx.fillStyle = color(deck[p]);
      ctx.fillRect(X(i), top + p * h, colW, Math.max(1, h - (h >= 4 ? 0.75 : 0)));
    }
  }
  ctx.globalAlpha = 1;
  if (f != null && f < n) {
    ctx.strokeStyle = css('--ink');
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const y = top + pos[i][f] * h + h / 2;
      if (i === 0) ctx.moveTo(X(i) + colW, y);
      else {
        const a = X(i - 1) + colW, b = X(i), y0 = top + pos[i - 1][f] * h + h / 2;
        ctx.bezierCurveTo((a + b) / 2, y0, (a + b) / 2, y, b, y);
        ctx.moveTo(b + colW, y);
      }
    }
    ctx.stroke();
  }
  wallGeom = { padL, colW, gapW, top, h, steps };
  if (S.view === steps - 1) canvas.parentElement.scrollLeft = canvas.parentElement.scrollWidth;
}

function wallHit(e) {
  const g = wallGeom;
  if (!g) return null;
  const r = $('wallCanvas').getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const i = Math.floor((x - g.padL + g.gapW / 2) / (g.colW + g.gapW));
  if (i < 0 || i >= g.steps) return null;
  const p = Math.floor((y - g.top) / g.h);
  return { step: i, pos: p >= 0 && p < S.spec.n ? p : null };
}

/* ---------- hands ---------- */

function renderHands() {
  const deck = S.history[S.view].deck;
  const P = S.players;
  const per = Math.floor(deck.length / P);
  const hands = Array.from({ length: P }, () => []);
  for (let i = 0; i < per * P; i++) hands[i % P].push(deck[i]);
  const is52 = S.spec.type === '52';
  const hcp = (c) => (S.spec.rank[c] === 0 ? 4 : S.spec.rank[c] >= 10 ? S.spec.rank[c] - 9 : 0);
  const html = hands.map((hand, k) => {
    const counts = {};
    hand.forEach((c) => (counts[S.spec.suit[c]] = (counts[S.spec.suit[c]] || 0) + 1));
    const shape = Object.keys(S.spec.suitCounts).map((s) => counts[s] || 0).sort((a, b) => b - a).join('-');
    const extra = is52 ? ` · ${t('hcp', { p: hand.reduce((s, c) => s + hcp(c), 0) })}` : '';
    return `<div class="hand"><div class="h"><b>${t('player', { k: k + 1 })}</b><span>${t('shape', { s: shape })}${extra}</span></div><div class="cards">${hand
      .map((c) => `<span class="card ${S.spec.red[c] ? 'red' : ''} ${c === S.follow ? 'fol' : ''}">${esc(S.spec.label[c])}</span>`)
      .join('')}</div></div>`;
  });
  const rest = deck.length - per * P;
  let note = t('dealt', { v: S.view }) + (rest ? t('leftover', { r: rest }) : '');
  if (is52 && P === 4) note += t('bridgeNote');
  $('hands').innerHTML = html.join('') + `<p class="hands-note">${note}</p>`;
}

/* ---------- palette, detail, quick picker ---------- */

function select(id) {
  S.selected = id;
  renderPalette();
  renderDetail();
  renderQuick();
}

function renderPalette() {
  $('palette').innerHTML = GROUPS.map((g) => `<div class="group-name">${L(g.name)}</div><div class="chips">${SHUFFLES.filter((s) => s.group === g.id)
    .map((s) => `<button class="chip ${s.id === S.selected ? 'on' : ''}" data-id="${s.id}">${L(s.name)}</button>`).join('')}</div>`).join('');
  $('palette').querySelectorAll('.chip').forEach((b) => (b.onclick = () => select(b.dataset.id)));
}

function renderQuick() {
  $('quick').innerHTML = GROUPS.map((g) => `<optgroup label="${esc(L(g.name))}">${SHUFFLES.filter((s) => s.group === g.id)
    .map((s) => `<option value="${s.id}" ${s.id === S.selected ? 'selected' : ''}>${esc(L(s.name))}</option>`).join('')}</optgroup>`).join('');
  $('quick').title = summary(BY_ID[S.selected], S.params[S.selected]);
}

function renderDetail() {
  const s = BY_ID[S.selected];
  const p = S.params[s.id];
  const n = S.spec.n;
  let badge = t('badgeRandom');
  if (isDeterministic(s, p)) {
    const o = cycleOrder(s, p, n);
    badge = o === 1n ? t('badgeNothing') : t('badgeCycle', { o, n });
  }
  const params = s.params.filter((d) => !d.showIf || d.showIf(p)).map((d) => {
    if (d.type === 'select') {
      return `<label class="param"><div class="lab">${L(d.label)}</div><select data-k="${d.key}">${d.options.map((o) => `<option value="${o[0]}" ${o[0] === p[d.key] ? 'selected' : ''}>${esc(L(o[1]))}</option>`).join('')}</select></label>`;
    }
    const shown = d.pct ? Math.round(p[d.key] * 100) + ' %' : nf(p[d.key]);
    const unit = L(d.unit);
    return `<label class="param"><div class="lab"><span>${L(d.label)}${unit ? ` <span class="muted">(${unit})</span>` : ''}</span><span class="val">${shown}</span></div>
      <input type="range" data-k="${d.key}" min="${d.min}" max="${d.max}" step="${d.step}" value="${p[d.key]}"></label>`;
  }).join('');
  $('detail').innerHTML = `<h3>${L(s.name)}</h3><div class="alt">${L(s.alt)}</div><p class="desc">${L(s.desc)}</p>${params}
    <div class="badge">${badge}</div>
    <button id="addSeq" class="ghost wide">+ ${t('addSeq')}</button>`;
  $('detail').querySelectorAll('[data-k]').forEach((el) => {
    el.oninput = () => {
      const d = s.params.find((x) => x.key === el.dataset.k);
      p[d.key] = d.type === 'select' ? el.value : Number(el.value);
      if (d.type === 'select') renderDetail(); // may show / hide other sliders
      else {
        el.closest('.param').querySelector('.val').textContent = d.pct ? Math.round(p[d.key] * 100) + ' %' : nf(p[d.key]);
        const det = isDeterministic(s, p);
        $('detail').querySelector('.badge').textContent = det ? (cycleOrder(s, p, n) === 1n ? t('badgeNothing') : t('badgeCycle', { o: cycleOrder(s, p, n), n })) : t('badgeRandom');
      }
      $('quick').title = summary(s, p);
    };
  });
  $('addSeq').onclick = () => { S.sequence.push({ id: s.id, params: { ...p }, times: S.repeat }); renderSequence(); };
}

/* ---------- sequence ---------- */

function renderPresets() {
  $('preset').innerHTML = `<option value="">${t('choosePreset')}</option>` + PRESETS.map((p, i) => `<option value="${i}">${esc(L(p.name))}</option>`).join('');
}

function renderSequence() {
  const list = $('sequence');
  $('seqEmpty').hidden = S.sequence.length > 0;
  $('runSeq').disabled = !S.sequence.length || S.running !== false;
  $('clearSeq').disabled = !S.sequence.length || S.running !== false;
  list.innerHTML = S.sequence.map((st, i) => {
    const s = BY_ID[st.id];
    const sum = summary(s, st.params);
    return `<li data-i="${i}" class="${S.running === i ? 'running' : ''}"><span class="n">${i + 1}</span><span class="name" title="${esc(sum)}">${L(s.name)}${sum ? ` <small>${esc(sum)}</small>` : ''}</span>
      <span class="muted small">×</span><input type="number" min="1" max="1000" value="${st.times}" data-act="times">
      <button class="ghost" data-act="up" title="${t('moveUp')}" ${i === 0 ? 'disabled' : ''}>↑</button><button class="ghost" data-act="del" title="${t('remove')}">✕</button></li>`;
  }).join('');
  list.querySelectorAll('li').forEach((li) => {
    const i = Number(li.dataset.i);
    li.querySelector('[data-act=times]').onchange = (e) => (S.sequence[i].times = Math.max(1, Math.min(1000, Number(e.target.value) || 1)));
    li.querySelector('[data-act=up]').onclick = () => { if (i > 0) { [S.sequence[i - 1], S.sequence[i]] = [S.sequence[i], S.sequence[i - 1]]; renderSequence(); } };
    li.querySelector('[data-act=del]').onclick = () => { S.sequence.splice(i, 1); renderSequence(); };
  });
}

async function runSequence() {
  if (S.running !== false || !S.sequence.length) return;
  for (let i = 0; i < S.sequence.length; i++) {
    S.running = i;
    renderSequence();
    const st = S.sequence[i];
    apply(st.id, st.params, st.times);
    if (S.animate) await new Promise((r) => setTimeout(r, 820));
  }
  S.running = false;
  renderSequence();
}

/* ---------- lab: heatmap ---------- */

const pause = () => new Promise((r) => setTimeout(r, 0));
let heat = null;

function routineSteps() {
  if ($('heatSource').value === 'sequence') return S.sequence.map((st) => [st.id, st.params, st.times]);
  return [[S.selected, S.params[S.selected], Math.max(1, Number($('heatRep').value) || 1)]];
}

async function runHeat() {
  const steps = routineSteps();
  if (!steps.length) { heat = { empty: true }; drawHeat(); return; }
  const n = S.spec.n, runs = Number($('heatRuns').value);
  const counts = new Float64Array(n * n);
  const rng = mulberry32(S.seed * 31 + 7);
  const id = Array.from({ length: n }, (_, i) => i);
  const prog = $('heatProg'), bar = prog.firstElementChild;
  prog.hidden = false;
  $('heatGo').disabled = true;
  let tm = performance.now();
  for (let m = 0; m < runs; m++) {
    let d = id;
    for (const [sid, p, times] of steps) d = applyShuffle(d, sid, p, times, rng);
    for (let pos = 0; pos < n; pos++) counts[d[pos] * n + pos]++;
    if (performance.now() - tm > 30) { bar.style.width = ((m / runs) * 100).toFixed(1) + '%'; await pause(); tm = performance.now(); }
  }
  prog.hidden = true;
  $('heatGo').disabled = false;
  for (let i = 0; i < counts.length; i++) counts[i] /= runs;
  const src = $('heatSource').value === 'sequence' ? { seq: true } : { id: S.selected, times: steps[0][2] };
  heat = { n, runs, p: counts, src };
  drawHeat();
}

function drawHeat() {
  const canvas = $('heatCanvas');
  const size = Math.max(200, Math.min(canvas.parentElement.clientWidth, 560));
  const padL = 18, padT = 18;
  const ctx = fitCanvas(canvas, size, size);
  if (!heat || heat.empty || heat.n !== S.spec.n) {
    ctx.strokeStyle = css('--border-strong');
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(padL + 0.5, padT + 0.5, size - padL - 1, size - padT - 1);
    ctx.setLineDash([]);
    ctx.fillStyle = css('--muted');
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(heat?.empty ? t('seqIsEmpty') : t('pressRun'), padL + (size - padL) / 2, padT + (size - padT) / 2);
    $('heatInfo').innerHTML = '';
    if (heat && heat.n !== S.spec.n) heat = null;
    return;
  }
  const { n, p } = heat;
  const cell = (size - padL) / n;
  const dev = $('heatMode').value === 'dev';
  const u = 1 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = p[i * n + j];
    ctx.fillStyle = dev ? div(Math.max(-1, Math.min(1, (v - u) / (2 * u)))) : seq(Math.min(1, v / (3 * u)));
    ctx.fillRect(padL + j * cell, padT + i * cell, Math.ceil(cell), Math.ceil(cell));
  }
  ctx.fillStyle = css('--muted');
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('finalPos'), padL, 9);
  ctx.save();
  ctx.translate(9, padT);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(t('startPos'), 0, 0);
  ctx.restore();
  heat.geom = { padL, padT, cell };

  let tv = 0, maxP = 0, maxAt = [0, 0];
  for (let i = 0; i < n; i++) {
    let row = 0;
    for (let j = 0; j < n; j++) {
      const v = p[i * n + j];
      row += Math.abs(v - u);
      if (v > maxP) { maxP = v; maxAt = [i, j]; }
    }
    tv += row / 2;
  }
  tv /= n;
  const floor = 0.5 * n * Math.sqrt(2 / Math.PI) * Math.sqrt((u * (1 - u)) / heat.runs);
  const verdict = tv < floor * 1.5 ? t('v1') : tv < 0.15 ? t('v2') : tv < 0.5 ? t('v3') : t('v4');
  const runsTxt = heat.runs.toLocaleString(lang);
  const label = heat.src.seq ? t('theSequenceLower') : `${L(BY_ID[heat.src.id].name)} ×${heat.src.times}`;
  const legend = dev
    ? `<div class="legend"><span>${t('lessLikely')}</span><span class="ramp" style="background:${gradientCss(divStops())}"></span><span>${t('moreLikely', { n })}</span></div>`
    : `<div class="legend"><span>0</span><span class="ramp" style="background:${gradientCss(seqStops())}"></span><span>≥ ${nf((300 / n).toFixed(1))} %</span></div><p class="muted small">${t('uniformNote', { n, u: nf((100 / n).toFixed(1)) })}</p>`;
  $('heatInfo').innerHTML = `<p class="muted">${esc(label)} · ${t('nRuns', { n: runsTxt })}</p>
    <p><span class="big">${nf(tv.toFixed(3))}</span><br>${t('tvDesc')}</p>
    <p class="muted small">${t('floorNote', { n: runsTxt, f: nf(floor.toFixed(3)) })}</p>
    <p><b>${verdict}</b></p>
    <p>${t('mostPred', { i: maxAt[0] + 1, j: maxAt[1] + 1, p: nf((maxP * 100).toFixed(1)), u: nf((100 / n).toFixed(1)) })}</p>${legend}`;
}

/* ---------- lab: convergence ---------- */

const convSlots = new Map(); // shuffle id -> colour slot, so a shuffle keeps its colour
['riffle', 'overhand', 'salad'].forEach((id, i) => convSlots.set(id, i));
let conv = null;

function renderConvMetrics() {
  const sel = $('convMetric');
  const cur = sel.value || 'tv';
  sel.innerHTML = `<option value="tv">${t('cv.tv')}</option>` + ['rising', 'pairs', 'spearman', 'fixed'].map((id) => `<option value="${id}">${L(METRIC_BY_ID[id].name)}</option>`).join('');
  sel.value = cur;
}

function renderConvPick() {
  $('convPick').innerHTML = SHUFFLES.filter((s) => s.id !== 'zarrow').map((s) => {
    const on = convSlots.has(s.id);
    const full = convSlots.size >= 4 && !on;
    return `<label title="${full ? t('upTo4') : ''}" style="${full ? 'opacity:.4' : ''}"><input type="checkbox" data-id="${s.id}" ${on ? 'checked' : ''} ${full ? 'disabled' : ''}>
      ${on ? `<span class="sw" style="background:${series(convSlots.get(s.id))};margin-right:0"></span>` : ''}${L(s.name)}</label>`;
  }).join('');
  $('convPick').querySelectorAll('input').forEach((el) => (el.onchange = () => {
    const id = el.dataset.id;
    if (el.checked) { const used = new Set(convSlots.values()); let k = 0; while (used.has(k)) k++; convSlots.set(id, k); }
    else convSlots.delete(id);
    renderConvPick();
  }));
}

async function runConv() {
  const ids = [...convSlots.keys()];
  if (!ids.length) return;
  const n = S.spec.n;
  const K = Math.max(2, Math.min(1000, Number($('convK').value) || 15));
  const M = Number($('convRuns').value);
  const metric = $('convMetric').value;
  const rng = mulberry32(S.seed * 17 + 3);
  const idDeck = Array.from({ length: n }, (_, i) => i);
  const u = 1 / n;
  const prog = $('convProg'), bar = prog.firstElementChild;
  prog.hidden = false;
  $('convGo').disabled = true;
  const out = [];
  let tm = performance.now();
  const total = ids.length * K;
  let done = 0;
  for (const sid of ids) {
    const s = BY_ID[sid], p = S.params[sid];
    const decks = Array.from({ length: M }, () => idDeck);
    const pts = [];
    const counts = new Float64Array(n * n);
    for (let k = 1; k <= K; k++) {
      counts.fill(0);
      let acc = 0;
      for (let m = 0; m < M; m++) {
        const d = (decks[m] = s.run(decks[m], p, rng));
        if (metric === 'tv') for (let pos = 0; pos < n; pos++) counts[d[pos] * n + pos]++;
        else acc += metricValue(METRIC_BY_ID[metric], d, idDeck, S.spec);
        if (performance.now() - tm > 30) { bar.style.width = (((done + m / M) / total) * 100).toFixed(1) + '%'; await pause(); tm = performance.now(); }
      }
      if (metric === 'tv') {
        let tv = 0;
        for (let i = 0; i < n * n; i++) tv += Math.abs(counts[i] / M - u);
        acc = tv / 2 / n;
      } else acc /= M;
      pts.push([k, acc]);
      done++;
    }
    out.push({ id: sid, slot: convSlots.get(sid), points: pts });
  }
  prog.hidden = true;
  $('convGo').disabled = false;
  conv = { out, metric, n, M, K, bd: metric === 'tv' && convSlots.has('riffle') && S.params.riffle.model === 'gsr' ? bayerDiaconis(n, Math.min(K, 30)) : null };
  renderConv();
}

function renderConv() {
  const canvas = $('convChart');
  if (!conv) {
    const w = canvas.parentElement.clientWidth, h = parseFloat(getComputedStyle(canvas).height) || 320;
    const ctx = fitCanvas(canvas, w, h);
    ctx.strokeStyle = css('--border-strong');
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.fillStyle = css('--muted');
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('pressRun'), w / 2, h / 2);
    return;
  }
  const { out, metric, n, M } = conv;
  const sers = out.map((o) => ({ name: L(BY_ID[o.id].name), color: series(o.slot), points: o.points }));
  const refs = [];
  let note;
  const m = METRIC_BY_ID[metric];
  if (metric === 'tv') {
    const u = 1 / n;
    refs.push({ y: 0.5 * n * Math.sqrt(2 / Math.PI) * Math.sqrt((u * (1 - u)) / M), label: t('noiseFloor', { n: M }) });
    note = t('tvNote');
    if (conv.bd) {
      sers.push({ name: t('bdName'), color: series(out.find((o) => o.id === 'riffle').slot), dash: [5, 4], points: conv.bd });
      note += t('bdNote');
    }
  } else {
    refs.push({ y: m.random(n, S.spec), label: t('randomDeck') });
    note = L(m.help);
  }
  lineChart(canvas, {
    series: sers, refs, integerX: true,
    yMin: metric === 'tv' ? 0 : undefined,
    yFmt: metric === 'tv' ? (v) => nf(v.toFixed(2)) : (v) => fmtM(m, v),
    xFmt: (x) => t('nRepeats', { n: x }),
  });
  $('convLegend').innerHTML = sers.map((s) => `<span><span class="sw" style="background:${s.color};${s.dash ? 'opacity:.55' : ''}"></span>${esc(s.name)}${s.dash ? t('dashed') : ''}</span>`).join('');
  $('convNote').textContent = note;
}

/* ---------- render all, language, wiring ---------- */

function renderScrub() {
  const sc = $('scrub');
  sc.max = S.history.length - 1;
  sc.value = S.view;
  sc.disabled = S.history.length <= 1;
  $('scrubLabel').textContent = t('scrub', { v: S.view, n: S.history.length - 1 });
  $('undo').disabled = S.history.length <= 1;
  $('undo').title = t('undoTitle');
}

function renderAll() {
  renderScrub();
  renderDetail();
  renderFollow();
  renderActive();
}

// only the visible tab is drawn (hidden canvases have no size)
function renderActive() {
  switch (S.tab) {
    case 'profile': drawDeck(); break;
    case 'd3': update3d(); break;
    case 'stats': renderStats(); break;
    case 'wall': drawWall(); break;
    case 'hands': renderHands(); break;
    case 'lab': labTab === 'conv' ? renderConv() : drawHeat(); break;
  }
}

function showTab(v) {
  S.tab = v;
  try { localStorage.setItem('brassage-tab', v); } catch (e) { /* ignore */ }
  document.querySelectorAll('#viewTabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.view === v);
    b.setAttribute('aria-selected', b.dataset.view === v);
  });
  document.querySelectorAll('.view').forEach((p) => (p.hidden = p.dataset.view !== v));
  deck3d?.setActive(v === 'd3');
  hideTip();
  renderActive();
}

/* ---------- 3D ---------- */

let deck3d = null, deck3dLoading = false, shown3dVersion = -1;

async function update3d() {
  if (!deck3d) {
    if (deck3dLoading) return;
    deck3dLoading = true;
    $('d3status').textContent = t('loading3d');
    try {
      const mod = await import('./three-view.js');
      deck3d = mod.createDeck3D($('d3wrap'), {
        onPick: (c) => { S.follow = c == null || c === S.follow ? null : c; renderFollow(); update3d(); },
      });
    } catch (e) {
      console.error(e);
      $('d3status').textContent = t('no3d');
      deck3dLoading = false;
      return;
    }
    $('d3status').textContent = '';
    deck3d.setActive(S.tab === 'd3');
  }
  const deck = S.history[S.view].deck;
  const col = colorer(deck, S.history[refIndex()].deck);
  const animate = S.animate && S.lastPrev && S.version !== shown3dVersion && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let groups = () => [0, 1];
  if (animate) {
    const { idx, count } = risingIndex(deck, S.lastPrev);
    groups = (c) => [idx[c], count];
  }
  deck3d.set({ deck, prev: animate ? S.lastPrev : null, color: col.fn, groups, follow: S.follow });
  shown3dVersion = S.version;
  renderLegend(col, $('legend3d'));
}

function renderLangSeg() {
  document.querySelectorAll('#langSeg button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
}

function fillDeckSelects() {
  $('deckType').innerHTML = DECK_TYPES.map(([v, l]) => `<option value="${v}" ${v === S.deckType ? 'selected' : ''}>${L(l)}</option>`).join('');
  $('startOrder').innerHTML = ORDERS.map(([v, l]) => `<option value="${v}" ${v === S.order ? 'selected' : ''}>${L(l)}</option>`).join('');
}

function applyLanguage() {
  translatePage();
  $('colorMode3d').innerHTML = $('colorMode').innerHTML;
  $('colorMode3d').value = S.colorMode;
  $('colorMode').value = S.colorMode;
  renderLangSeg();
  fillDeckSelects();
  renderPresets();
  renderPalette();
  renderQuick();
  renderSequence();
  renderConvMetrics();
  renderConvPick();
}

function switchLang(l) {
  if (l === lang) return;
  setLang(l);
  S.spec = buildSpec(); // same card ids, new labels (V/D/R in French)
  applyLanguage();
  renderAll();
}

const typing = (e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range' && e.target.type !== 'checkbox';

function init() {
  setLang(lang);
  $('seed').value = S.seed;

  document.querySelectorAll('#langSeg button').forEach((b) => (b.onclick = () => switchLang(b.dataset.lang)));
  $('quick').onchange = (e) => select(e.target.value);
  $('repeat').oninput = () => (S.repeat = Math.max(1, Math.min(1000, Number($('repeat').value) || 1)));
  $('applyBtn').onclick = () => apply(S.selected, S.params[S.selected], S.repeat);
  $('undo').onclick = undo;
  $('scrub').oninput = (e) => setView(Number(e.target.value));

  $('deckType').onchange = (e) => { S.deckType = e.target.value; $('customNField').hidden = S.deckType !== 'num'; reset(); drawHeat(); };
  $('customN').onchange = (e) => { S.customN = Number(e.target.value) || 40; reset(); drawHeat(); };
  $('startOrder').onchange = (e) => { S.order = e.target.value; reset(); };
  $('seed').onchange = (e) => { S.seed = Number(e.target.value) || 1; reset(); };
  $('reseed').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 99999); $('seed').value = S.seed; reset(); };
  $('reset').onclick = reset;
  const setColorMode = (v) => { S.colorMode = v; $('colorMode').value = v; $('colorMode3d').value = v; renderActive(); };
  $('colorMode').onchange = (e) => setColorMode(e.target.value);
  $('colorMode3d').onchange = (e) => setColorMode(e.target.value);
  $('d3reset').onclick = () => deck3d?.resetView();
  document.querySelectorAll('#viewTabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.view)));
  $('compare').onchange = (e) => { S.compare = e.target.value; renderAll(); };
  $('animate').onchange = (e) => (S.animate = e.target.checked);
  $('players').onchange = (e) => { S.players = Number(e.target.value); renderHands(); };
  $('preset').onchange = (e) => {
    const p = PRESETS[e.target.value];
    if (!p) return;
    S.sequence = p.steps.map(([id, params, times]) => ({ id, params: { ...defaultParams(BY_ID[id]), ...params }, times }));
    e.target.value = '';
    renderSequence();
  };
  $('runSeq').onclick = runSequence;
  $('clearSeq').onclick = () => { S.sequence = []; renderSequence(); };

  // keyboard: space = shuffle, backspace = undo, arrows = move through the history
  addEventListener('keydown', (e) => {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ') { e.preventDefault(); $('applyBtn').click(); }
    else if (e.key === 'Backspace') { e.preventDefault(); undo(); }
    else if (e.key === 'ArrowLeft' && e.target.type !== 'range') { e.preventDefault(); setView(S.view - 1); }
    else if (e.key === 'ArrowRight' && e.target.type !== 'range') { e.preventDefault(); setView(S.view + 1); }
    else if (/^[1-6]$/.test(e.key)) showTab(VIEWS[Number(e.key) - 1]);
  });

  const dc = $('deckCanvas');
  dc.addEventListener('mousemove', (e) => { const hit = deckHit(e); hit ? showTip(cardTip(hit.card), e.clientX, e.clientY) : hideTip(); });
  dc.addEventListener('mouseleave', hideTip);
  dc.addEventListener('click', (e) => { const hit = deckHit(e); S.follow = hit && hit.card !== S.follow ? hit.card : null; renderFollow(); drawDeck(); });

  const wc = $('wallCanvas');
  wc.addEventListener('mousemove', (e) => {
    const hit = wallHit(e);
    if (!hit) return hideTip();
    const hs = S.history[hit.step];
    const card = hit.pos != null ? hs.deck[hit.pos] : null;
    const detail = hs.op ? summary(BY_ID[hs.op.id], hs.op.params) : '';
    showTip(`<b>${t('step', { n: hit.step })}</b> · ${esc(histLabel(hit.step))}${detail ? `<br><span class="k">${esc(detail)}</span>` : ''}${card != null ? `<br>${t('tip.pos', { p: hit.pos + 1 })}${colon()} <b>${esc(S.spec.label[card])}</b>` : ''}<br><span class="k">${t('wallTip')}</span>`, e.clientX, e.clientY);
  });
  wc.addEventListener('mouseleave', hideTip);
  wc.addEventListener('click', (e) => {
    const hit = wallHit(e);
    if (!hit) return;
    if (e.shiftKey && hit.pos != null) { S.follow = S.history[hit.step].deck[hit.pos]; renderFollow(); drawWall(); }
    else setView(hit.step);
  });

  const hc = $('heatCanvas');
  hc.addEventListener('mousemove', (e) => {
    if (!heat || !heat.geom) return;
    const r = hc.getBoundingClientRect();
    const { padL, padT, cell } = heat.geom;
    const j = Math.floor((e.clientX - r.left - padL) / cell), i = Math.floor((e.clientY - r.top - padT) / cell);
    if (i < 0 || j < 0 || i >= heat.n || j >= heat.n) return hideTip();
    showTip(t('heatTip', { i: i + 1, j: j + 1, p: nf((heat.p[i * heat.n + j] * 100).toFixed(2)), u: nf((100 / heat.n).toFixed(2)) }), e.clientX, e.clientY);
  });
  hc.addEventListener('mouseleave', hideTip);
  $('heatGo').onclick = runHeat;
  $('heatMode').onchange = drawHeat;
  $('heatSource').onchange = () => ($('heatRepWrap').hidden = $('heatSource').value === 'sequence');
  $('convGo').onclick = runConv;

  document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === b));
    $('tab-heat').hidden = b.dataset.tab !== 'heat';
    $('tab-conv').hidden = b.dataset.tab !== 'conv';
    labTab = b.dataset.tab;
    renderActive();
  }));

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderActive, 120); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { renderConvPick(); renderActive(); });

  S.spec = buildSpec();
  applyLanguage();
  reset();
  showTab(S.tab);
}

init();
