import { edgePoint, edgeNormal, cornerAnchor, OPPOSITE_EDGE } from '../core/geometry.js';
import { resolveTile } from '../core/tiles.js';
import { el, n, alpha, cubic, cubicAt, cubicTangent, degOf } from './svg.js';
import { LINK, INK } from './palette.js';
import { reefGlyph, creatureGlyph, relicGlyph, fishGlyph } from './glyphs.js';

const SAND = '#f4ecdc';

/**
 * Where a run of one kind goes inside the tile. Two edges get a single smooth
 * curve; anything else meets at the centre, which is what makes a fork read as
 * a fork and a lone edge read as an end.
 */
function runs(edges, kind, S) {
  const es = [0, 1, 2, 3].filter((e) => edges[e] === kind);
  const C = [S / 2, S / 2];
  if (es.length === 2) {
    const [a, b] = es;
    const A = edgePoint(a, S);
    const B = edgePoint(b, S);
    const NA = edgeNormal(a);
    const NB = edgeNormal(b);
    const k = S * (OPPOSITE_EDGE[a] === b ? 0.34 : 0.46);
    return {
      edges: es,
      paths: [{ p0: A, c1: [A[0] + NA[0] * k, A[1] + NA[1] * k], c2: [B[0] + NB[0] * k, B[1] + NB[1] * k], p1: B }],
      centre: C,
    };
  }
  const k = S * 0.3;
  return {
    edges: es,
    paths: es.map((e) => {
      const A = edgePoint(e, S);
      const N = edgeNormal(e);
      return { p0: A, c1: [A[0] + N[0] * k, A[1] + N[1] * k], c2: [C[0] - N[0] * k * 0.45, C[1] - N[1] * k * 0.45], p1: C };
    }),
    centre: C,
  };
}

const d = (p) => cubic(p.p0, p.c1, p.c2, p.p1);
const at = (p, t) => cubicAt(p.p0, p.c1, p.c2, p.p1, t);
const tan = (p, t) => cubicTangent(p.p0, p.c1, p.c2, p.p1, t);

// --- fish -----------------------------------------------------------------
function fishRun(edges, S) {
  const r = runs(edges, 'fish', S);
  if (!r.edges.length) return '';
  const c = LINK.fish;
  let out = '';

  for (const p of r.paths) {
    out += el('path', {
      d: d(p), fill: 'none', stroke: alpha(c, 0.3), 'stroke-width': n(S * 0.09),
      'stroke-linecap': 'round', 'stroke-dasharray': `${n(S * 0.055)} ${n(S * 0.05)}`,
    });
  }

  if (r.edges.length === 1) {
    // a shoal head: the run stops here and the fish bunch up
    const p = r.paths[0];
    const hub = at(p, 0.72);
    const v = tan(p, 0.72);
    const perp = [-v[1], v[0]];
    const deg = degOf(v);
    for (const [du, dv, sc] of [[0, 0, 1], [-0.11, 0.13, 0.86], [-0.1, -0.14, 0.86]]) {
      out += fishGlyph(
        hub[0] + v[0] * du * S + perp[0] * dv * S,
        hub[1] + v[1] * du * S + perp[1] * dv * S,
        S * 0.2 * sc, deg, c,
      );
    }
    return out;
  }

  const stops = r.paths.length === 1 ? [0.24, 0.5, 0.76] : [0.46];
  for (const p of r.paths) {
    for (const t of stops) {
      const pt = at(p, t);
      out += fishGlyph(pt[0], pt[1], S * 0.2, degOf(tan(p, t)), c);
    }
  }
  return out;
}

// --- tentacles ------------------------------------------------------------
function tentacleRun(edges, S, color) {
  const r = runs(edges, 'arm', S);
  if (!r.edges.length) return '';
  let out = '';
  const stroke = {
    fill: 'none', stroke: color, 'stroke-width': n(S * 0.11),
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  };
  const suckers = {
    fill: 'none', stroke: 'rgba(255,255,255,.5)', 'stroke-width': n(S * 0.032),
    'stroke-linecap': 'round', 'stroke-dasharray': `0.01 ${n(S * 0.062)}`,
  };

  if (r.edges.length === 1) {
    // a tip: the arm curls in on itself and stops
    const e = r.edges[0];
    const A = edgePoint(e, S);
    const N = edgeNormal(e);
    const T = [-N[1], N[0]];
    const tip = [S / 2 + T[0] * S * 0.15 + N[0] * S * 0.05, S / 2 + T[1] * S * 0.15 + N[1] * S * 0.05];
    const path = {
      p0: A,
      c1: [A[0] + N[0] * S * 0.4, A[1] + N[1] * S * 0.4],
      c2: [tip[0] - N[0] * S * 0.05 - T[0] * S * 0.24, tip[1] - N[1] * S * 0.05 - T[1] * S * 0.24],
      p1: tip,
    };
    out += el('path', { d: d(path), ...stroke });
    out += el('path', { d: d(path), ...suckers });
    out += el('circle', { cx: n(tip[0]), cy: n(tip[1]), r: n(S * 0.05), fill: color });
    return out;
  }

  for (const p of r.paths) out += el('path', { d: d(p), ...stroke });
  for (const p of r.paths) out += el('path', { d: d(p), ...suckers });
  if (r.paths.length > 1) {
    out += el('circle', { cx: n(r.centre[0]), cy: n(r.centre[1]), r: n(S * 0.075), fill: color });
  }
  return out;
}

// --- the octopus itself ---------------------------------------------------
function headBody(S, color) {
  const c = S / 2;
  const rx = S * 0.2;
  const ry = S * 0.185;
  let stubs = '';
  for (let e = 0; e < 4; e++) {
    const A = edgePoint(e, S);
    const N = edgeNormal(e);
    const T = [-N[1], N[0]];
    const bend = S * 0.06;
    const end = [c - N[0] * rx * 0.9, c - N[1] * ry * 0.9];
    stubs += el('path', {
      d: cubic(A,
        [A[0] + N[0] * S * 0.2 + T[0] * bend, A[1] + N[1] * S * 0.2 + T[1] * bend],
        [end[0] - N[0] * S * 0.1 + T[0] * bend * 0.6, end[1] - N[1] * S * 0.1 + T[1] * bend * 0.6],
        end),
      fill: 'none', stroke: color, 'stroke-width': n(S * 0.11), 'stroke-linecap': 'round',
    });
  }
  const eye = (dx) =>
    el('circle', { cx: n(c + dx), cy: n(c - S * 0.025), r: n(S * 0.032), fill: 'rgba(255,255,255,.92)' })
    + el('circle', { cx: n(c + dx), cy: n(c - S * 0.025), r: n(S * 0.016), fill: 'rgba(28,46,44,.92)' });
  return stubs
    + el('ellipse', { cx: n(c), cy: n(c), rx: n(rx), ry: n(ry), fill: color })
    + eye(-S * 0.07) + eye(S * 0.07);
}

// --- the frame ------------------------------------------------------------
function frame(S, ownerColor, opts) {
  const inset = S * 0.022;
  return el('rect', {
    x: n(inset), y: n(inset), width: n(S - inset * 2), height: n(S - inset * 2), rx: n(S * 0.075),
    fill: opts.fill || SAND,
    stroke: ownerColor ? alpha(ownerColor, 0.62) : 'rgba(58,86,84,.24)',
    'stroke-width': n(S * (ownerColor ? 0.024 : 0.014)),
  })
  + (ownerColor ? el('rect', {
    x: n(inset), y: n(inset), width: n(S - inset * 2), height: n(S - inset * 2), rx: n(S * 0.075),
    fill: alpha(ownerColor, 0.055),
  }) : '');
}

/**
 * One tile in tile-local coordinates.
 * `opts.armColor` tints the tentacles with the octopus that owns that network.
 */
export function tileBody(tile, S, opts = {}) {
  const owner = opts.ownerColor ?? tile.color ?? null;
  let out = opts.noFrame ? '' : frame(S, owner, opts);

  if (tile.kind === 'head') return out + headBody(S, tile.color || INK);

  out += fishRun(tile.edges, S);
  out += tentacleRun(tile.edges, S, opts.armColor || LINK.arm);

  for (let c = 0; c < 4; c++) {
    if (!tile.corners[c]) continue;
    const [cx, cy] = cornerAnchor(c, S, 0.185);
    out += reefGlyph(tile.corners[c], cx, cy, S * 0.29);
  }

  if (tile.relic) {
    out += el('circle', { cx: n(S / 2), cy: n(S / 2), r: n(S * 0.245), fill: 'rgba(255,248,232,.82)', stroke: 'rgba(168,123,40,.35)', 'stroke-width': n(S * 0.014) });
    out += relicGlyph(tile.relic.key, S / 2, S / 2, S * 0.4);
  }

  if (tile.creature) {
    if (tile.creature.at === 'c') {
      out += creatureGlyph(tile.creature.key, S / 2, S / 2, S * 0.46);
    } else {
      const e = tile.creature.at;
      const A = edgePoint(e, S);
      const N = edgeNormal(e);
      const cx = A[0] + N[0] * S * 0.21;
      const cy = A[1] + N[1] * S * 0.21;
      out += el('circle', { cx: n(cx), cy: n(cy), r: n(S * 0.165), fill: 'rgba(255,253,246,.7)' });
      out += creatureGlyph(tile.creature.key, cx, cy, S * 0.3);
    }
  }
  return out;
}

/** Standalone thumbnail for the hand tray. */
export function tileThumb(tile, rot, flip, S, opts = {}) {
  const shown = { ...tile, ...resolveTile(tile, rot, flip) };
  return el('svg', {
    viewBox: `0 0 ${S} ${S}`, width: S, height: S, class: opts.class || 'thumb',
    xmlns: 'http://www.w3.org/2000/svg',
  }, tileBody(shown, S, { ...opts, ownerColor: null }));
}
