// A tile is a unit square carrying features in three places at once:
//
//     corner 0 ------- edge 0 (N) ------- corner 1
//        |                                   |
//     edge 3 (W)         centre          edge 1 (E)
//        |                                   |
//     corner 3 ------- edge 2 (S) ------- corner 2
//
// Edges carry links (fish runs, tentacles) and meet the neighbouring tile's
// opposite edge. Corners carry reef features and meet at grid *vertices*, so a
// corner touches up to three other tiles - including the diagonal one. The
// centre carries a relic, a creature, or an octopus head.

export const OPPOSITE_EDGE = [2, 3, 0, 1];
export const EDGE_DELTA = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Mirror across the vertical axis: north and south stay, east and west swap. */
export const MIRROR_EDGE = [0, 3, 2, 1];
export const MIRROR_CORNER = [1, 0, 3, 2];

/** Grid vertex a corner sits on, relative to the tile's own cell. */
export const CORNER_OFFSET = [[0, 0], [1, 0], [1, 1], [0, 1]];

export const rotateEdge = (e, rot) => (e + (rot & 3)) & 3;
export const rotateCorner = (c, rot) => (c + (rot & 3)) & 3;

/** Mirror first, then rotate - the order the UI applies them. */
export const transformEdge = (e, rot, flip) => rotateEdge(flip ? MIRROR_EDGE[e] : e, rot);
export const transformCorner = (c, rot, flip) => rotateCorner(flip ? MIRROR_CORNER[c] : c, rot);

export const inBounds = (b, x, y) => x >= 0 && y >= 0 && x < b.cols && y < b.rows;
export const neighbourOf = (x, y, e) => [x + EDGE_DELTA[e][0], y + EDGE_DELTA[e][1]];
export const cornerVertex = (x, y, c) => [x + CORNER_OFFSET[c][0], y + CORNER_OFFSET[c][1]];

/** Midpoint of an edge, in tile-local coordinates. */
export function edgePoint(e, S) {
  switch (e) {
    case 0: return [S / 2, 0];
    case 1: return [S, S / 2];
    case 2: return [S / 2, S];
    default: return [0, S / 2];
  }
}

/** Unit vector pointing from an edge into the tile. */
export function edgeNormal(e) {
  switch (e) {
    case 0: return [0, 1];
    case 1: return [-1, 0];
    case 2: return [0, -1];
    default: return [1, 0];
  }
}

/** Corner anchor pulled `inset` of the tile toward the centre, for glyphs. */
export function cornerAnchor(c, S, inset = 0.2) {
  const [ox, oy] = CORNER_OFFSET[c];
  const k = inset * S;
  return [ox === 0 ? k : S - k, oy === 0 ? k : S - k];
}
