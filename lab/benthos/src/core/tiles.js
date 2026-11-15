import { transformEdge, transformCorner } from './geometry.js';

/**
 * A tile in canonical (unrotated) form:
 *
 *   { id, kind: 'tile' | 'head', archetype,
 *     edges:    ['water','fish','arm','water'],      // N E S W
 *     corners:  [null, 'coral', null, 'coral'],      // NW NE SE SW
 *     relic:    null | { key, label, value },        // sits in the centre
 *     creature: null | { key, rank, at: 'c' | 0..3 } // centre or an edge
 *   }
 *
 * `resolveTile` is the only place rotation and mirroring happen: everything
 * downstream - rules, scoring, rendering - reads board-space arrays.
 */
export const ORIENTATIONS = (() => {
  const out = [];
  for (let rot = 0; rot < 4; rot++) for (const flip of [false, true]) out.push({ rot, flip });
  return out;
})();

export function resolveTile(tile, rot, flip) {
  const edges = [null, null, null, null];
  const corners = [null, null, null, null];
  for (let e = 0; e < 4; e++) edges[transformEdge(e, rot, flip)] = tile.edges[e];
  for (let c = 0; c < 4; c++) corners[transformCorner(c, rot, flip)] = tile.corners[c];
  const creature = tile.creature
    ? { ...tile.creature, at: tile.creature.at === 'c' ? 'c' : transformEdge(tile.creature.at, rot, flip) }
    : null;
  return { edges, corners, relic: tile.relic || null, creature };
}

/**
 * Rotations that give a distinct edge/corner/creature layout. Symmetric tiles
 * (open sand, a plain crossing) collapse to fewer, which keeps the hand from
 * offering four identical previews.
 */
export function distinctOrientations(tile) {
  const seen = new Set();
  const out = [];
  for (const o of ORIENTATIONS) {
    const g = resolveTile(tile, o.rot, o.flip);
    const key = `${g.edges}|${g.corners}|${g.creature ? g.creature.at : '-'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

/**
 * Board-space form of a tile. `base` keeps the canonical arrays so the tile can
 * be re-resolved (and audited) later - `edges`/`corners`/`creature` on the
 * placed object are already rotated.
 */
export function placeTile(tile, rot, flip, x, y, extra = {}) {
  const geo = resolveTile(tile, rot, flip);
  return {
    ...tile, ...geo,
    base: { edges: tile.edges, corners: tile.corners, creature: tile.creature },
    x, y, rot, flip, ...extra,
  };
}
