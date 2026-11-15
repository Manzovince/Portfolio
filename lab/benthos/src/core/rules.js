import { resolveTile } from './tiles.js';
import { OPPOSITE_EDGE, inBounds, neighbourOf } from './geometry.js';
import { tileAt, isEmpty, frontier } from './board.js';
import { EDGE_KINDS } from '../config.js';

/**
 * Strict: only equal kinds meet, so a fish run never dead-ends into sand and a
 * closed school really is closed. Loose: open water tolerates anything, which
 * makes for a looser reef and much weaker "closed" bonuses.
 */
export const edgesCompatible = (a, b, strict) =>
  a === b || (!strict && (a === 'water' || b === 'water'));

const kindLabel = (k) => (EDGE_KINDS[k] ? EDGE_KINDS[k].label.toLowerCase() : k);

export function boardHasRelic(board) {
  for (const id of board.order) if (board.byId.get(id).relic) return true;
  return false;
}

/**
 * @returns {{ok:boolean, reason?:string, touches?:number, links?:number}}
 */
export function evaluatePlacement(board, tile, rot, flip, x, y, config) {
  if (!inBounds(board, x, y)) return { ok: false, reason: 'Off the reef' };
  if (!isEmpty(board, x, y)) return { ok: false, reason: 'That square is taken' };

  const geo = resolveTile(tile, rot, flip);
  const strict = config.rules.strictEdges !== false;
  let touches = 0;
  let links = 0;

  for (let e = 0; e < 4; e++) {
    const kind = geo.edges[e];
    const [nx, ny] = neighbourOf(x, y, e);
    if (!inBounds(board, nx, ny)) {
      if (kind !== 'water' && !config.rules.allowOffBoardLinks) {
        return { ok: false, reason: `A ${kindLabel(kind)} would run off the reef` };
      }
      continue;
    }
    const nb = tileAt(board, nx, ny);
    if (!nb) continue;
    touches++;
    const other = nb.edges[OPPOSITE_EDGE[e]];
    if (!edgesCompatible(kind, other, strict)) {
      return { ok: false, reason: `${EDGE_KINDS[kind].label} cannot meet ${kindLabel(other)}` };
    }
    if (kind !== 'water') links++;
  }

  if (config.rules.requireAdjacency && board.order.length && !touches) {
    return { ok: false, reason: 'Must be laid against the reef' };
  }

  if (config.rules.relicsNeedNeighbour && geo.relic && boardHasRelic(board)) {
    const beside = [0, 1, 2, 3].some((e) => {
      const [nx, ny] = neighbourOf(x, y, e);
      const nb = tileAt(board, nx, ny);
      return nb && nb.relic;
    });
    if (!beside) return { ok: false, reason: 'Relics must be laid touching another relic' };
  }

  return { ok: true, touches, links };
}

/** Legal cells for one orientation - cheap enough to run on every hover. */
export function legalCells(board, tile, rot, flip, config) {
  const out = [];
  const scan = config.rules.requireAdjacency && board.order.length
    ? frontier(board)
    : allCells(board);
  for (const { x, y } of scan) {
    if (evaluatePlacement(board, tile, rot, flip, x, y, config).ok) out.push({ x, y });
  }
  return out;
}

function allCells(board) {
  const out = [];
  for (let y = 0; y < board.rows; y++) for (let x = 0; x < board.cols; x++) out.push({ x, y });
  return out;
}

/** Does this tile fit anywhere at all, in any orientation? */
export function hasAnyPlacement(board, tile, config) {
  for (let rot = 0; rot < 4; rot++) {
    for (const flip of [false, true]) {
      if (legalCells(board, tile, rot, flip, config).length) return true;
    }
  }
  return false;
}
