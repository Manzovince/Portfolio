import { DEFAULT_CONFIG, REEF_TYPES, CREATURE_TYPES, RELIC_TYPES, ARCHETYPES, clone } from '../config.js';
import { createGame } from '../core/game.js';
import { renderBoard } from '../render/board.js';
import { tileThumb } from '../render/tile.js';
import { cellKey } from '../core/board.js';
import { openParams } from './params.js';
import { rulesSheet, finalSheet, legendHTML, SCORE_LINES } from './sheets.js';

const STORE = 'benthos.config.v1';

/** Fill anything a saved config is missing from the defaults, key by key. */
function merge(base, saved) {
  if (saved === undefined || saved === null) return clone(base);
  if (Array.isArray(base) || typeof base !== 'object') return saved;
  const out = clone(base);
  for (const key of Object.keys(base)) out[key] = merge(base[key], saved[key]);
  return out;
}

/** A type list saved by an older build may be missing fields, or be empty. */
function healTypes(saved, defaults, numeric) {
  const list = (saved || []).map((t) => {
    const fallback = defaults.find((d) => d.key === t.key) || defaults[0];
    const out = { ...fallback, ...t };
    for (const k of numeric) out[k] = Number(out[k]) || (k === 'count' ? 0 : fallback[k]);
    return out;
  });
  return list.length ? list : clone(defaults);
}

function loadConfig() {
  let config = clone(DEFAULT_CONFIG);
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (saved) config = merge(DEFAULT_CONFIG, saved);
  } catch { /* corrupt or unavailable storage - fall back to defaults */ }
  config.reef.types = healTypes(config.reef.types, REEF_TYPES, ['value', 'count']);
  config.creatures.types = healTypes(config.creatures.types, CREATURE_TYPES, ['rank', 'count']);
  config.relics.types = healTypes(config.relics.types, RELIC_TYPES, ['value', 'count']);
  return config;
}
const saveConfig = (c) => { try { localStorage.setItem(STORE, JSON.stringify(c)); } catch { /* private mode */ } };

export function boot() {
  const $ = (id) => document.getElementById(id);
  const dom = {
    board: $('board'), side: $('side'), tray: $('tray'), turnbar: $('turnbar'),
    modal: $('modal'), toast: $('toast'), curtain: $('curtain'),
  };

  let config = loadConfig();
  let game = null;
  let sel = null;                // selected tile id
  let hover = null;              // { x, y }
  let legal = new Set();
  let analysis = null;
  let curtainUp = false;
  let finalShown = false;
  const orient = new Map();      // tileId -> { rot, flip }
  let view = { x: 0, y: 0, w: 100, h: 100 };

  const S = () => config.ui.cardSize;
  const orientOf = (id) => orient.get(id) || { rot: 0, flip: false };
  const selTile = () => (sel ? game.current.hand.find((t) => t.id === sel) : null);

  // ---------- lifecycle ----------
  function newGame() {
    closeSheet();
    game = createGame(config);
    game.subscribe(onGameChange);
    sel = null; hover = null; curtainUp = false; finalShown = false;
    orient.clear();
    fit();
    renderAll();
  }

  function onGameChange() {
    sel = null;
    legal = new Set();
    if (!game.over && config.ui.curtain && game.players.length > 1) curtainUp = true;
    renderAll();
    if (game.over && !finalShown) { finalShown = true; showFinal(); }
  }

  // ---------- view ----------
  function fit() {
    const s = S();
    const pad = s * 0.3;
    const z = Math.max(0.6, (config.ui.fitZoom || 100) / 100);
    const bw = game.board.cols * s;
    const bh = game.board.rows * s;
    const w = (bw + pad * 2) / z;
    const h = (bh + pad * 2) / z;
    view = { x: (bw - w) / 2, y: (bh - h) / 2, w, h };
  }
  const applyViewBox = () => dom.board.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);

  function zoomBy(factor, cx, cy) {
    const s = S();
    const w = Math.max(s * 2.5, Math.min(game.board.cols * s * 3, view.w * factor));
    const k = w / view.w;
    view = { x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k, w, h: view.h * k };
    applyViewBox();
  }

  function toBoard(evt) {
    const m = dom.board.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    return new DOMPoint(evt.clientX, evt.clientY).matrixTransform(m.inverse());
  }
  function cellAt(evt) {
    const p = toBoard(evt);
    const s = S();
    return { x: Math.floor(p.x / s), y: Math.floor(p.y / s) };
  }

  // ---------- rendering ----------
  function recomputeLegal() {
    const tile = selTile();
    legal = new Set();
    if (!tile || !config.ui.showLegal || curtainUp || game.over) return;
    const { rot, flip } = orientOf(tile.id);
    for (const c of game.legalCellsFor(tile, rot, flip)) legal.add(cellKey(c.x, c.y));
  }

  function renderAll() {
    analysis = game.analyse();
    recomputeLegal();
    renderBoardSvg();
    renderTurnbar();
    renderSide();
    renderTray();
    renderCurtain();
  }

  function renderBoardSvg() {
    const tile = selTile();
    let ghost = null;
    if (tile && hover && !curtainUp && !game.over) {
      const { rot, flip } = orientOf(tile.id);
      const verdict = game.evaluate(tile, rot, flip, hover.x, hover.y);
      const preview = verdict.ok ? game.previewScore(tile, rot, flip, hover.x, hover.y) : null;
      ghost = { tile, rot, flip, ok: verdict.ok, delta: preview ? preview.self : null };
    }
    dom.board.innerHTML = renderBoard(game, {
      S: S(), legal, hover, ghost, analysis, showGroups: config.ui.showGroups,
    });
    applyViewBox();
  }

  function renderTurnbar() {
    if (game.over) { dom.turnbar.innerHTML = '<span class="muted">The tide is out</span>'; return; }
    const p = game.current;
    dom.turnbar.innerHTML = `<span class="dot" style="background:${p.color}"></span>
      <span>${p.name}</span>
      <span class="muted">&middot; round ${game.round} &middot; ${game.deck.length} in the deck${game.pendingEnd ? ' &middot; last turn' : ''}</span>`;
  }

  function renderSide() {
    const rows = game.scores(analysis);
    const scores = rows.slice().sort((a, b) => b.total - a.total).map((r) => {
      const active = !game.over && game.current.id === r.playerId;
      return `<div class="scorerow ${active ? 'active' : ''}">
        <span class="dot" style="background:${r.color}"></span>
        <span class="who">${r.name}
          <small>${SCORE_LINES.map(([k, l]) => `<i class="${r[k] < 0 ? 'neg' : ''}" title="${l}">${r[k]}</i>`).join('')}</small>
        </span>
        <span class="pts">${r.total}</span>
      </div>`;
    }).join('');

    const closedFish = analysis.fish.filter((s) => s.closed && s.points).length;
    const closedArms = analysis.arms.filter((a) => a.closed && a.points).length;
    const reefs = analysis.reef.filter((g) => g.points).length;
    const heaps = analysis.relics.filter((g) => g.points).length;

    dom.side.innerHTML = `
      <div class="panel"><h3>Divers</h3>${scores}
        <p class="tally">reef &middot; schools &middot; tentacles &middot; relics &middot; creatures</p>
      </div>
      <div class="panel"><h3>The reef so far</h3>
        <ul class="facts">
          <li><b>${reefs}</b> scoring reef${reefs === 1 ? '' : 's'}</li>
          <li><b>${closedFish}</b> closed school${closedFish === 1 ? '' : 's'} of ${analysis.fish.length}</li>
          <li><b>${closedArms}</b> closed tentacle system${closedArms === 1 ? '' : 's'}</li>
          <li><b>${heaps}</b> relic heap${heaps === 1 ? '' : 's'} &middot; <b>${analysis.encounters.length}</b> encounter${analysis.encounters.length === 1 ? '' : 's'}</li>
        </ul>
      </div>
      <div class="panel"><h3>Scoring</h3>${legendHTML(config)}</div>
      <div class="panel"><h3>Log</h3>
        <ul class="loglist">${game.log.slice(0, 20).map((l) => `<li>${l.text}</li>`).join('') || '<li class="empty">Nothing yet.</li>'}</ul>
      </div>`;
  }

  /** The tag under a thumbnail says how the tile connects - that is what the
   *  player is choosing on. What it carries is drawn on the tile itself, and
   *  spelled out in the tooltip. */
  const tileLabel = (tile) => (ARCHETYPES[tile.archetype] ? ARCHETYPES[tile.archetype].label : 'Tile');

  function tileTitle(tile) {
    const extra = [];
    if (tile.relic) extra.push(tile.relic.label);
    if (tile.creature) extra.push(`${tile.creature.label} (${tile.creature.at === 'c' ? 'centre' : 'edge'})`);
    const reef = tile.corners.filter(Boolean);
    if (reef.length) extra.push(`${reef.length} ${reef[0]}`);
    return extra.length ? `${tileLabel(tile)} - ${extra.join(', ')}` : tileLabel(tile);
  }

  function renderTray() {
    if (game.over) {
      dom.tray.innerHTML = `<div class="trayside"><div class="traymeta">The tide is out. Final count is in the side panel.</div>
        <div class="controls"><button class="ghostbtn primary" data-act="new">New game</button>
        <button class="ghostbtn" data-act="final">Show final count</button></div></div>`;
      return;
    }
    if (curtainUp) { dom.tray.innerHTML = '<div class="empty">Hand hidden &mdash; pass the table.</div>'; return; }

    const p = game.current;
    const tile = selTile();
    const hand = p.hand.map((t, i) => {
      const o = orientOf(t.id);
      return `<button class="handcard ${t.id === sel ? 'sel' : ''}" data-tile="${t.id}" title="${tileTitle(t)}">
        ${tileThumb(t, o.rot, o.flip, 96)}
        <span class="idx">${i + 1}</span>
        <span class="kindtag">${tileLabel(t)}</span>
      </button>`;
    }).join('') || '<span class="empty">Hand empty.</span>';

    const stuck = !game.canAct(p);
    const hint = stuck
      ? '<div class="traymeta" style="color:var(--warn)">Nothing in hand fits &mdash; let one drift away, or wait.</div>'
      : tile
        ? '<div class="traymeta">Hover the grid: the badge is what the tile is worth to you right now.</div>'
        : '<div class="traymeta">Pick a tile, turn it, and lay it against the reef.</div>';

    dom.tray.innerHTML = `
      <div class="hand">${hand}</div>
      <div class="trayside">
        ${hint}
        <div class="controls">
          <button class="ghostbtn" data-act="rot" ${tile ? '' : 'disabled'}>Rotate <span class="kbd">R</span></button>
          <button class="ghostbtn" data-act="flip" ${tile ? '' : 'disabled'}>Mirror <span class="kbd">F</span></button>
          <button class="ghostbtn" data-act="discard" ${tile ? '' : 'disabled'}>Let it drift</button>
          <button class="ghostbtn" data-act="pass">Wait</button>
        </div>
      </div>`;
  }

  function renderCurtain() {
    if (!curtainUp || game.over) { dom.curtain.hidden = true; return; }
    const p = game.current;
    dom.curtain.hidden = false;
    dom.curtain.innerHTML = `<span class="dot" style="background:${p.color};width:20px;height:20px"></span>
      <h2>Pass the table to ${p.name}</h2>
      <button class="ghostbtn primary" data-act="reveal">I&rsquo;m ready</button>`;
  }

  let toastTimer = null;
  function toast(text) {
    dom.toast.textContent = text;
    dom.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { dom.toast.hidden = true; }, 1900);
  }

  function showSheet(html, wire) {
    dom.modal.innerHTML = html;
    dom.modal.hidden = false;
    dom.modal.onclick = (e) => {
      if (e.target === dom.modal || e.target.closest('[data-close]')) closeSheet();
      else if (wire) wire(e);
    };
  }
  function closeSheet() { dom.modal.hidden = true; dom.modal.innerHTML = ''; dom.modal.onclick = null; }
  function showFinal() {
    showSheet(finalSheet(game.scores(analysis)), (e) => {
      if (e.target.closest('[data-newgame]')) { closeSheet(); newGame(); }
    });
  }

  // ---------- interaction ----------
  function selectTile(id) {
    sel = sel === id ? null : id;
    renderAll();
  }

  function reorient(fn) {
    const tile = selTile();
    if (!tile) return;
    orient.set(tile.id, fn(orientOf(tile.id)));
    renderAll();
  }

  function tryPlace(cell) {
    const tile = selTile();
    if (!tile) { toast('Pick a tile first.'); return; }
    const { rot, flip } = orientOf(tile.id);
    const verdict = game.evaluate(tile, rot, flip, cell.x, cell.y);
    if (!verdict.ok) { toast(verdict.reason); return; }
    game.playTile({ tileId: tile.id, rot, flip, x: cell.x, y: cell.y });
  }

  // board pointer: drag to pan, click to lay
  let down = null;
  let dragging = false;
  dom.board.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, board: toBoard(e) };
    dragging = false;
    dom.board.setPointerCapture(e.pointerId);
  });
  dom.board.addEventListener('pointermove', (e) => {
    if (down && (e.buttons & 1)) {
      if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) {
        dragging = true;
        dom.board.classList.add('dragging');
      }
      if (dragging) {
        const now = toBoard(e);
        view.x -= now.x - down.board.x;
        view.y -= now.y - down.board.y;
        applyViewBox();
      }
      return;
    }
    if (curtainUp || game.over) return;
    const cell = cellAt(e);
    if (!hover || hover.x !== cell.x || hover.y !== cell.y) {
      hover = cell;
      renderBoardSvg();
    }
  });
  dom.board.addEventListener('pointerup', (e) => {
    dom.board.classList.remove('dragging');
    const wasDrag = dragging;
    down = null; dragging = false;
    if (wasDrag || curtainUp || game.over) return;
    const cell = cellAt(e);
    if (cell.x < 0 || cell.y < 0 || cell.x >= game.board.cols || cell.y >= game.board.rows) return;
    tryPlace(cell);
  });
  dom.board.addEventListener('pointerleave', () => { hover = null; renderBoardSvg(); });
  dom.board.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = toBoard(e);
    zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12, p.x, p.y);
  }, { passive: false });

  dom.tray.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tile]');
    if (btn) { selectTile(btn.dataset.tile); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    switch (act.dataset.act) {
      case 'rot': reorient((o) => ({ rot: (o.rot + 1) % 4, flip: o.flip })); break;
      case 'flip': reorient((o) => ({ rot: o.rot, flip: !o.flip })); break;
      case 'discard': if (sel) game.discard(sel); break;
      case 'pass': game.skip(); break;
      case 'new': newGame(); break;
      case 'final': showFinal(); break;
      default: break;
    }
  });

  dom.curtain.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="reveal"]')) { curtainUp = false; renderAll(); }
  });

  document.querySelector('.zoom').addEventListener('click', (e) => {
    const b = e.target.closest('[data-zoom]');
    if (!b) return;
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;
    if (b.dataset.zoom === 'in') zoomBy(1 / 1.25, cx, cy);
    else if (b.dataset.zoom === 'out') zoomBy(1.25, cx, cy);
    else { fit(); applyViewBox(); }
  });

  $('btn-new').addEventListener('click', newGame);
  $('btn-help').addEventListener('click', () => showSheet(rulesSheet(config)));
  $('btn-params').addEventListener('click', () => openParams(dom.modal, config, {
    onApply: (next, restart) => {
      config = next;
      saveConfig(config);
      if (restart) newGame();
      else { fit(); renderAll(); }
    },
  }));

  window.addEventListener('keydown', (e) => {
    if (!dom.modal.hidden || curtainUp) return;
    if (e.target.matches('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'r') { reorient((o) => ({ rot: (o.rot + (e.shiftKey ? 3 : 1)) % 4, flip: o.flip })); e.preventDefault(); }
    else if (k === 'f') { reorient((o) => ({ rot: o.rot, flip: !o.flip })); e.preventDefault(); }
    else if (k === 'escape') { sel = null; renderAll(); }
    else if (k >= '1' && k <= '9') {
      const tile = game.current.hand[Number(k) - 1];
      if (tile) selectTile(tile.id);
    }
  });

  window.addEventListener('resize', () => applyViewBox());

  // Handle for tinkering from the console: benthos.game, benthos.config, ...
  window.benthos = {
    get game() { return game; },
    get config() { return config; },
    get analysis() { return analysis; },
    newGame, render: renderAll, fit,
  };

  newGame();
}
