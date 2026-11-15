import { OPPOSITE_EDGE, inBounds, neighbourOf, cornerVertex } from './geometry.js';
import { tileAt, cellKey, slotKey, parseSlot, placedTiles } from './board.js';
import { makeDSU, bump, majority } from './groups.js';

const byKey = (list) => new Map(list.map((t) => [t.key, t]));
const num = (v) => Math.max(0, Math.trunc(Number(v) || 0));

// ---------------------------------------------------------------------------
// Reefs: corner features meeting at grid vertices.
//
// Two slots join when they share a vertex and a type, and also when they sit on
// the same tile - which is what lets a reef walk diagonally across the board
// instead of stopping dead at every vertex.
// ---------------------------------------------------------------------------
export function reefGroups(board, config) {
  const values = byKey(config.reef.types);
  const dsu = makeDSU();
  const type = new Map();       // slot -> reef key
  const owner = new Map();      // slot -> playerId
  const vertices = new Map();   // "vx,vy" -> slot[]

  for (const t of placedTiles(board)) {
    const mine = [];
    for (let c = 0; c < 4; c++) {
      const key = t.corners[c];
      if (!key) continue;
      const slot = slotKey(t.x, t.y, c);
      dsu.add(slot);
      type.set(slot, key);
      owner.set(slot, t.ownerId);
      mine.push([slot, key]);
      const [vx, vy] = cornerVertex(t.x, t.y, c);
      const vk = cellKey(vx, vy);
      const bucket = vertices.get(vk);
      if (bucket) bucket.push(slot); else vertices.set(vk, [slot]);
    }
    for (let i = 1; i < mine.length; i++) {
      if (mine[i][1] === mine[0][1]) dsu.union(mine[0][0], mine[i][0]);
    }
  }

  for (const slots of vertices.values()) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (type.get(slots[i]) === type.get(slots[j])) dsu.union(slots[i], slots[j]);
      }
    }
  }

  const min = Math.max(2, num(config.scoring.reefMinGroup));
  const out = [];
  for (const members of dsu.groups().values()) {
    const key = type.get(members[0]);
    const def = values.get(key);
    const counts = new Map();
    for (const m of members) bump(counts, owner.get(m));
    const size = members.length;
    const points = size >= min ? num(def ? def.value : 0) * size : 0;
    out.push({
      kind: 'reef',
      type: key,
      label: def ? def.label : key,
      slots: members.map((m) => ({ ...parseSlot(m), c: parseSlot(m).i, owner: owner.get(m) })),
      size,
      points,
      winners: points ? majority(counts) : [],
      counts,
    });
  }
  return out.sort((a, b) => b.points - a.points);
}

// ---------------------------------------------------------------------------
// Link networks: fish schools and tentacle systems share one walker.
// ---------------------------------------------------------------------------
function linkNetworks(board, kind) {
  const dsu = makeDSU();
  for (const t of placedTiles(board)) {
    const mine = [0, 1, 2, 3].filter((e) => t.edges[e] === kind);
    if (!mine.length) continue;
    for (const e of mine) dsu.add(slotKey(t.x, t.y, e));
    // every link on one tile belongs to the same run - it passes through
    for (let i = 1; i < mine.length; i++) dsu.union(slotKey(t.x, t.y, mine[0]), slotKey(t.x, t.y, mine[i]));
    for (const e of mine) {
      const [nx, ny] = neighbourOf(t.x, t.y, e);
      const nb = tileAt(board, nx, ny);
      if (nb && nb.edges[OPPOSITE_EDGE[e]] === kind) {
        dsu.union(slotKey(t.x, t.y, e), slotKey(nx, ny, OPPOSITE_EDGE[e]));
      }
    }
  }

  const out = [];
  for (const members of dsu.groups().values()) {
    const cells = new Set();
    const counts = new Map();
    const openEnds = [];
    for (const m of members) {
      const { x, y, i } = parseSlot(m);
      const t = tileAt(board, x, y);
      if (!cells.has(cellKey(x, y))) {
        cells.add(cellKey(x, y));
        if (t.kind !== 'head') bump(counts, t.ownerId);
      }
      const [nx, ny] = neighbourOf(x, y, i);
      const nb = tileAt(board, nx, ny);
      if (!nb || nb.edges[OPPOSITE_EDGE[i]] !== kind) {
        openEnds.push({ x, y, e: i, offBoard: !inBounds(board, nx, ny) });
      }
    }
    out.push({
      slots: members.map((m) => parseSlot(m)),
      cells: [...cells],
      tiles: [...cells].map((c) => { const [x, y] = c.split(',').map(Number); return tileAt(board, x, y); }),
      closed: openEnds.length === 0,
      openEnds,
      counts,
    });
  }
  return out;
}

export function fishSchools(board, config) {
  const per = num(config.scoring.fishPerTile);
  const mul = Math.max(1, num(config.scoring.fishClosedMul));
  return linkNetworks(board, 'fish').map((net) => {
    const points = net.tiles.length * per * (net.closed ? mul : 1);
    return {
      kind: 'fish', ...net,
      length: net.tiles.length,
      points,
      winners: points ? majority(net.counts) : [],
    };
  }).sort((a, b) => b.points - a.points);
}

/**
 * A tentacle system scores only for the octopuses whose head hangs off it, and
 * two heads on one system split it - the reef's arms tangle together.
 */
export function armNetworks(board, config) {
  const per = num(config.scoring.armPerTile);
  const mul = Math.max(1, num(config.scoring.armClosedMul));
  return linkNetworks(board, 'arm').map((net) => {
    const heads = net.tiles.filter((t) => t.kind === 'head');
    const body = net.tiles.filter((t) => t.kind !== 'head');
    const pot = heads.length ? body.length * per * (net.closed ? mul : 1) : 0;
    const share = heads.length ? Math.floor(pot / heads.length) : 0;
    return {
      kind: 'arm', ...net,
      length: body.length,
      heads: heads.map((h) => h.ownerId),
      points: pot,
      share,
      winners: heads.map((h) => h.ownerId),
    };
  }).sort((a, b) => b.points - a.points);
}

// ---------------------------------------------------------------------------
// Relics: worthless alone, valuable in a heap.
// ---------------------------------------------------------------------------
export function relicGroups(board, config) {
  const dsu = makeDSU();
  const relics = placedTiles(board).filter((t) => t.relic);
  for (const t of relics) {
    dsu.add(cellKey(t.x, t.y));
    for (let e = 0; e < 4; e++) {
      const [nx, ny] = neighbourOf(t.x, t.y, e);
      const nb = tileAt(board, nx, ny);
      if (nb && nb.relic) dsu.union(cellKey(t.x, t.y), cellKey(nx, ny));
    }
  }

  const min = Math.max(2, num(config.scoring.relicMinGroup));
  const bonus = num(config.scoring.relicSetBonus);
  const kinds = config.relics.types.length;
  const out = [];
  for (const members of dsu.groups().values()) {
    const tiles = members.map((m) => { const [x, y] = m.split(',').map(Number); return tileAt(board, x, y); });
    const counts = new Map();
    let value = 0;
    const present = new Set();
    for (const t of tiles) { bump(counts, t.ownerId); value += num(t.relic.value); present.add(t.relic.key); }
    const complete = present.size >= kinds && kinds > 0;
    const points = tiles.length >= min ? value + (complete ? bonus : 0) : 0;
    out.push({
      kind: 'relic',
      cells: members,
      tiles,
      size: tiles.length,
      complete,
      points,
      winners: points ? majority(counts) : [],
      counts,
    });
  }
  return out.sort((a, b) => b.points - a.points);
}

// ---------------------------------------------------------------------------
// Creatures: jellyfish < turtle < shark.
//
// A creature "faces" a direction if it sits in the centre (all four) or on that
// very edge. Two creatures meet when each faces the other, so a shark on a west
// edge only ever troubles the tile to its west.
// ---------------------------------------------------------------------------
const faces = (t, d) => !!t.creature && (t.creature.at === 'c' || t.creature.at === d);

export function creatureEncounters(board, config) {
  const gain = num(config.scoring.predationGain);
  const loss = num(config.scoring.predationLoss);
  const shoal = num(config.scoring.shoalBonus);
  const scaled = config.scoring.rankScaled !== false;
  const out = [];

  for (const t of placedTiles(board)) {
    if (!t.creature) continue;
    // east and south only, so every neighbouring pair is judged exactly once
    for (const d of [1, 2]) {
      const [nx, ny] = neighbourOf(t.x, t.y, d);
      const nb = tileAt(board, nx, ny);
      if (!nb || !nb.creature) continue;
      if (!faces(t, d) || !faces(nb, OPPOSITE_EDGE[d])) continue;

      const deltas = new Map();
      const diff = Math.abs(t.creature.rank - nb.creature.rank);
      let type;
      if (diff === 0) {
        type = 'shoal';
        bump(deltas, t.ownerId, shoal);
        bump(deltas, nb.ownerId, shoal);
      } else {
        type = 'predation';
        const k = scaled ? diff : 1;
        const strong = t.creature.rank > nb.creature.rank ? t : nb;
        const weak = strong === t ? nb : t;
        bump(deltas, strong.ownerId, gain * k);
        bump(deltas, weak.ownerId, -loss * k);
      }
      out.push({
        kind: 'creature', type, diff, deltas,
        a: { x: t.x, y: t.y, at: t.creature.at, key: t.creature.key, rank: t.creature.rank, owner: t.ownerId },
        b: { x: nb.x, y: nb.y, at: nb.creature.at, key: nb.creature.key, rank: nb.creature.rank, owner: nb.ownerId },
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
export function analyse(game) {
  const { board, config } = game;
  return {
    reef: reefGroups(board, config),
    fish: fishSchools(board, config),
    arms: armNetworks(board, config),
    relics: relicGroups(board, config),
    encounters: creatureEncounters(board, config),
  };
}

const LINES = ['reef', 'fish', 'arms', 'relics', 'creatures'];

export function scoreGame(game, analysis = analyse(game)) {
  const rows = new Map();
  for (const p of game.players) {
    const row = { playerId: p.id, name: p.name, color: p.color, total: 0, detail: { reef: [], fish: [], arms: [], relics: [], creatures: [] } };
    for (const line of LINES) row[line] = 0;
    rows.set(p.id, row);
  }
  const add = (id, line, n, entry) => {
    const row = rows.get(id);
    if (!row || !n) return;
    row[line] += n;
    row.total += n;
    if (entry) row.detail[line].push(entry);
  };

  for (const g of analysis.reef) {
    for (const id of g.winners) add(id, 'reef', g.points, { label: g.label, size: g.size, points: g.points });
  }
  for (const s of analysis.fish) {
    for (const id of s.winners) add(id, 'fish', s.points, { size: s.length, closed: s.closed, points: s.points });
  }
  for (const a of analysis.arms) {
    for (const id of a.winners) add(id, 'arms', a.share, { size: a.length, closed: a.closed, shared: a.winners.length, points: a.share });
  }
  for (const r of analysis.relics) {
    for (const id of r.winners) add(id, 'relics', r.points, { size: r.size, complete: r.complete, points: r.points });
  }
  for (const e of analysis.encounters) {
    for (const [id, n] of e.deltas) {
      add(id, 'creatures', n, { type: e.type, a: e.a.key, b: e.b.key, points: n });
    }
  }

  return game.players.map((p) => rows.get(p.id));
}
