import { ARCHETYPES, ARCHETYPE_KEYS } from '../config.js';
import { shuffle, randInt } from './rng.js';

let nextId = 1;
export const resetTileIds = () => { nextId = 1; };
const newId = () => `t${nextId++}`;

const count = (v) => Math.max(0, Math.trunc(Number(v) || 0));
const linkCount = (t) => t.edges.filter((e) => e !== 'water').length;

function blankTile(archetype) {
  return {
    id: newId(),
    kind: 'tile',
    archetype,
    edges: ARCHETYPES[archetype].edges.slice(),
    corners: [null, null, null, null],
    relic: null,
    creature: null,
  };
}

/** How many tiles `buildDeck` will produce. */
export function deckSize(config) {
  let n = 0;
  for (const key of ARCHETYPE_KEYS) n += count(config.deckCounts[key]);
  return n;
}

/**
 * Take `n` tiles from `pool` (a mutable array of indices), preferring the ones
 * `rank` scores lowest. Relics want quiet tiles so a heap can actually form.
 */
function take(pool, n, rank) {
  if (rank) pool.sort((a, b) => rank(a) - rank(b));
  return pool.splice(0, Math.min(n, pool.length));
}

/**
 * The deck is a single shared pile: every scoring system on the table is
 * contested, so everyone draws from the same water.
 *
 * Decoration runs in three passes over a shuffled pool - relics first (they
 * own the centre), then creatures on tiles the relics left alone, then reef
 * corners, which coexist with anything.
 */
export function buildDeck(config, rng) {
  const tiles = [];
  for (const key of ARCHETYPE_KEYS) {
    for (let i = 0; i < count(config.deckCounts[key]); i++) tiles.push(blankTile(key));
  }

  const free = shuffle(rng, tiles.map((_, i) => i));

  // --- relics: centre pieces, worthless until they are heaped together -----
  const relicSlots = [];
  for (const type of config.relics.types) {
    for (let i = 0; i < count(type.count); i++) relicSlots.push(type);
  }
  const relicPicks = take(free, relicSlots.length, (i) => linkCount(tiles[i]));
  shuffle(rng, relicSlots).forEach((type, k) => {
    const idx = relicPicks[k];
    if (idx == null) return;
    tiles[idx].relic = { key: type.key, label: type.label, value: count(type.value) };
  });

  // --- creatures: centre or an open-water edge, never sharing with a relic -
  const creatureSlots = [];
  for (const type of config.creatures.types) {
    for (let i = 0; i < count(type.count); i++) creatureSlots.push(type);
  }
  const creaturePicks = take(free, creatureSlots.length);
  shuffle(rng, creatureSlots).forEach((type, k) => {
    const idx = creaturePicks[k];
    if (idx == null) return;
    const tile = tiles[idx];
    const water = [0, 1, 2, 3].filter((e) => tile.edges[e] === 'water');
    const centre = !water.length || rng() * 100 < count(config.creatures.centrePct);
    tile.creature = {
      key: type.key, label: type.label, rank: Math.max(1, count(type.rank)),
      at: centre ? 'c' : water[randInt(rng, water.length)],
    };
  });

  // --- reef corners: one type per tile, so a tile always bridges its own two
  const reefWeights = config.reef.types.map((t) => [t, count(t.count)]);
  const reefTotal = reefWeights.reduce((s, [, w]) => s + w, 0);
  const reefPicks = shuffle(rng, tiles.map((_, i) => i)).slice(0, reefTotal);
  const bag = [];
  for (const [type, n] of reefWeights) for (let i = 0; i < n; i++) bag.push(type);
  shuffle(rng, bag).forEach((type, k) => {
    const idx = reefPicks[k];
    if (idx == null) return;
    const tile = tiles[idx];
    const first = randInt(rng, 4);
    tile.corners[first] = type.key;
    if (rng() * 100 < count(config.reef.twoCornerPct)) {
      // an adjacent corner, so the two slots sit on neighbouring vertices
      tile.corners[(first + (rng() < 0.5 ? 1 : 3)) & 3] = type.key;
    }
  });

  return shuffle(rng, tiles);
}

/** The octopus head: four tentacles, one out of every side. */
export function makeHeadTile(owner) {
  return {
    id: newId(),
    kind: 'head',
    archetype: 'head',
    ownerId: owner.id,
    color: owner.color,
    edges: ['arm', 'arm', 'arm', 'arm'],
    corners: [null, null, null, null],
    relic: null,
    creature: null,
  };
}
