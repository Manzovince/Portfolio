import { el, n, alpha } from './svg.js';
import { tileBody } from './tile.js';
import { resolveTile } from '../core/tiles.js';
import { edgePoint, edgeNormal, cornerAnchor, cornerVertex } from '../core/geometry.js';
import { cellKey } from '../core/board.js';
import { LINK, RELIC_COLOR, reefColor } from './palette.js';

const cellCentre = (t, S) => [t.x * S + S / 2, t.y * S + S / 2];

function creatureAnchor(t, S) {
  const [cx, cy] = cellCentre(t, S);
  if (!t.creature || t.creature.at === 'c') return [cx, cy];
  const e = t.creature.at;
  const A = edgePoint(e, S);
  const N = edgeNormal(e);
  return [t.x * S + A[0] + N[0] * S * 0.21, t.y * S + A[1] + N[1] * S * 0.21];
}

const cornerPointOf = (slot, S) => {
  const [ax, ay] = cornerAnchor(slot.c, S, 0.185);
  return [slot.x * S + ax, slot.y * S + ay];
};

function defs(S) {
  return el('defs', {},
    el('radialGradient', { id: 'seabed', cx: '50%', cy: '36%', r: '80%' },
      el('stop', { offset: '0%', 'stop-color': '#eee6d4' })
      + el('stop', { offset: '60%', 'stop-color': '#e2d7c0' })
      + el('stop', { offset: '100%', 'stop-color': '#d2c3a6' }))
    + el('filter', { id: 'lift', x: '-30%', y: '-30%', width: '160%', height: '160%' },
      el('feDropShadow', { dx: 0, dy: n(S * 0.02), stdDeviation: n(S * 0.028), 'flood-color': '#3d564e', 'flood-opacity': '.2' })));
}

function backdrop(cols, rows, S) {
  const w = cols * S;
  const h = rows * S;
  let grid = '';
  for (let x = 0; x <= cols; x++) grid += el('line', { x1: n(x * S), y1: 0, x2: n(x * S), y2: n(h) });
  for (let y = 0; y <= rows; y++) grid += el('line', { x1: 0, y1: n(y * S), x2: n(w), y2: n(y * S) });
  return el('g', { class: 'backdrop' },
    el('rect', { x: 0, y: 0, width: n(w), height: n(h), rx: n(S * 0.06), fill: 'url(#seabed)' })
    + el('g', { class: 'grid' }, grid));
}

/**
 * A tentacle system takes the colour of the octopus hanging off it - and stays
 * neutral when two heads share one, which is exactly when it is being split.
 */
export function armTints(game, analysis) {
  const tint = new Map();
  for (const net of analysis.arms) {
    if (net.heads.length !== 1) continue;
    const owner = game.playerById(net.heads[0]);
    if (!owner) continue;
    for (const cell of net.cells) tint.set(cell, owner.color);
  }
  return tint;
}

/** Faint wash behind a finished school or tentacle system - it doubled. */
function closedHalo(nets, color, S) {
  let out = '';
  for (const net of nets) {
    if (!net.closed || !net.points) continue;
    for (const cell of net.cells) {
      const [x, y] = cell.split(',').map(Number);
      out += el('rect', {
        x: n(x * S + S * 0.04), y: n(y * S + S * 0.04), width: n(S * 0.92), height: n(S * 0.92),
        rx: n(S * 0.09), fill: alpha(color, 0.075),
      });
    }
  }
  return out;
}

/** Lines along the unions that actually made each reef: same vertex, or same tile. */
function reefLinks(groups, S) {
  let out = '';
  for (const g of groups) {
    if (!g.points) continue;
    const color = reefColor(g.type);
    const pts = g.slots.map((s) => ({ ...s, p: cornerPointOf(s, S), v: cornerVertex(s.x, s.y, s.c).join(',') }));
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const sameVertex = pts[i].v === pts[j].v;
        const sameTile = pts[i].cell === pts[j].cell;
        if (!sameVertex && !sameTile) continue;
        out += el('line', {
          x1: n(pts[i].p[0]), y1: n(pts[i].p[1]), x2: n(pts[j].p[0]), y2: n(pts[j].p[1]),
          stroke: alpha(color, 0.55), 'stroke-width': n(S * 0.022), 'stroke-linecap': 'round',
        });
      }
    }
    for (const p of pts) {
      out += el('circle', {
        cx: n(p.p[0]), cy: n(p.p[1]), r: n(S * 0.185),
        fill: 'none', stroke: alpha(color, 0.4), 'stroke-width': n(S * 0.016),
      });
    }
  }
  return out;
}

function relicLinks(groups, S) {
  let out = '';
  for (const g of groups) {
    if (!g.points) continue;
    for (let i = 0; i < g.tiles.length; i++) {
      for (let j = i + 1; j < g.tiles.length; j++) {
        const a = g.tiles[i];
        const b = g.tiles[j];
        if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) continue;
        const A = cellCentre(a, S);
        const B = cellCentre(b, S);
        out += el('line', {
          x1: n(A[0]), y1: n(A[1]), x2: n(B[0]), y2: n(B[1]),
          stroke: alpha(RELIC_COLOR, 0.6), 'stroke-width': n(S * 0.03),
          'stroke-linecap': 'round', 'stroke-dasharray': `${n(S * 0.06)} ${n(S * 0.05)}`,
        });
      }
    }
  }
  return out;
}

/** Who ate whom, written between the two creatures. */
function encounterMarks(game, encounters, S) {
  let out = '';
  for (const e of encounters) {
    const ta = game.board.cells.get(cellKey(e.a.x, e.a.y));
    const tb = game.board.cells.get(cellKey(e.b.x, e.b.y));
    if (!ta || !tb) continue;
    const A = creatureAnchor(ta, S);
    const B = creatureAnchor(tb, S);
    const good = e.type === 'shoal';
    const color = good ? '#3f7a5e' : '#b25a4b';
    out += el('line', {
      x1: n(A[0]), y1: n(A[1]), x2: n(B[0]), y2: n(B[1]),
      stroke: alpha(color, 0.5), 'stroke-width': n(S * 0.022),
      'stroke-dasharray': `${n(S * 0.03)} ${n(S * 0.035)}`, 'stroke-linecap': 'round',
    });
    const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const best = Math.max(...[...e.deltas.values()]);
    out += el('circle', { cx: n(mid[0]), cy: n(mid[1]), r: n(S * 0.095), fill: 'rgba(255,253,246,.94)', stroke: alpha(color, 0.7), 'stroke-width': n(S * 0.016) });
    out += el('text', {
      x: n(mid[0]), y: n(mid[1] + S * 0.037), 'text-anchor': 'middle',
      class: 'mark', fill: color, 'font-size': n(S * 0.105),
    }, good ? '~' : `+${best}`);
  }
  return out;
}

/**
 * @param {object} view
 *   { S, legal:Set, hover, ghost:{tile,rot,flip,ok,delta}, analysis, showGroups }
 */
export function renderBoard(game, view) {
  const S = view.S;
  const { cols, rows } = game.board;
  const analysis = view.analysis;
  const tints = analysis ? armTints(game, analysis) : new Map();

  let tiles = '';
  for (const id of game.board.order) {
    const t = game.board.byId.get(id);
    tiles += el('g', { transform: `translate(${n(t.x * S)} ${n(t.y * S)})`, class: 'tile', filter: 'url(#lift)' },
      tileBody(t, S, { armColor: tints.get(cellKey(t.x, t.y)) }));
  }

  let hints = '';
  if (view.legal) {
    for (const key of view.legal) {
      const [x, y] = key.split(',').map(Number);
      hints += el('rect', {
        x: n(x * S + S * 0.09), y: n(y * S + S * 0.09), width: n(S * 0.82), height: n(S * 0.82),
        rx: n(S * 0.07), fill: 'rgba(70,140,124,.08)', stroke: 'rgba(58,124,110,.4)',
        'stroke-width': n(S * 0.016), 'stroke-dasharray': `${n(S * 0.06)} ${n(S * 0.05)}`,
      });
    }
  }

  let overlay = '';
  if (view.showGroups && analysis) {
    overlay = el('g', { class: 'groups' },
      closedHalo(analysis.fish, LINK.fish, S)
      + closedHalo(analysis.arms, LINK.arm, S)
      + reefLinks(analysis.reef, S)
      + relicLinks(analysis.relics, S)
      + encounterMarks(game, analysis.encounters, S));
  }

  let ghost = '';
  if (view.ghost && view.hover) {
    const { tile, rot, flip, ok, delta } = view.ghost;
    const shown = { ...tile, ...resolveTile(tile, rot, flip) };
    const gx = view.hover.x * S;
    const gy = view.hover.y * S;
    ghost = el('g', { transform: `translate(${n(gx)} ${n(gy)})`, class: `ghost ${ok ? 'ok' : 'no'}`, opacity: ok ? 0.88 : 0.42 },
      tileBody(shown, S, { fill: ok ? 'rgba(246,240,226,.92)' : 'rgba(240,222,216,.9)' })
      + el('rect', {
        x: n(S * 0.022), y: n(S * 0.022), width: n(S * 0.956), height: n(S * 0.956), rx: n(S * 0.075),
        fill: 'none', stroke: ok ? 'rgba(47,128,123,.85)' : 'rgba(178,90,75,.8)', 'stroke-width': n(S * 0.026),
      }));
    if (ok && delta != null) {
      ghost += el('g', { transform: `translate(${n(gx + S * 0.5)} ${n(gy - S * 0.16)})`, class: 'delta' },
        el('rect', { x: n(-S * 0.17), y: n(-S * 0.12), width: n(S * 0.34), height: n(S * 0.24), rx: n(S * 0.12), fill: delta >= 0 ? '#2f807b' : '#b25a4b' })
        + el('text', { x: 0, y: n(S * 0.055), 'text-anchor': 'middle', class: 'mark', fill: '#fdfaf2', 'font-size': n(S * 0.145) },
          `${delta >= 0 ? '+' : ''}${delta}`));
    }
  }

  return defs(S)
    + backdrop(cols, rows, S)
    + el('g', { class: 'hints' }, hints)
    + el('g', { class: 'tiles' }, tiles)
    + overlay
    + ghost;
}
