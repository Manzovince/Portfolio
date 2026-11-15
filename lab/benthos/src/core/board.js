import { neighbourOf, inBounds } from './geometry.js';

export const cellKey = (x, y) => `${x},${y}`;
export const slotKey = (x, y, i) => `${x},${y}|${i}`;
export const parseSlot = (key) => {
  const [cell, i] = key.split('|');
  const [x, y] = cell.split(',').map(Number);
  return { x, y, i: Number(i), cell };
};

/** One tile per cell - the whole point of the bigger cards. */
export function makeBoard(cols, rows) {
  return {
    cols, rows,
    cells: new Map(),  // "x,y"  -> placed
    byId: new Map(),   // tileId -> placed
    order: [],         // placement order, for rendering
  };
}

export const tileAt = (board, x, y) => (inBounds(board, x, y) ? board.cells.get(cellKey(x, y)) || null : null);
export const neighbourTile = (board, x, y, e) => { const [nx, ny] = neighbourOf(x, y, e); return tileAt(board, nx, ny); };
export const isEmpty = (board, x, y) => inBounds(board, x, y) && !board.cells.has(cellKey(x, y));

/** `placed` carries board-space geometry: { ...tile, x, y, rot, flip, edges, corners, relic, creature }. */
export function addTile(board, placed) {
  board.cells.set(cellKey(placed.x, placed.y), placed);
  board.byId.set(placed.id, placed);
  board.order.push(placed.id);
  return placed;
}

export const placedTiles = (board) => board.order.map((id) => board.byId.get(id));

/** Every cell that has at least one placed orthogonal neighbour. */
export function frontier(board) {
  const out = [];
  for (let y = 0; y < board.rows; y++) {
    for (let x = 0; x < board.cols; x++) {
      if (!isEmpty(board, x, y)) continue;
      for (let e = 0; e < 4; e++) {
        if (neighbourTile(board, x, y, e)) { out.push({ x, y }); break; }
      }
    }
  }
  return out;
}

/** Lift a tile back off the board. Only used for what-if previews. */
export function removeTile(board, id) {
  const placed = board.byId.get(id);
  if (!placed) return null;
  board.cells.delete(cellKey(placed.x, placed.y));
  board.byId.delete(id);
  const i = board.order.lastIndexOf(id);
  if (i >= 0) board.order.splice(i, 1);
  return placed;
}
