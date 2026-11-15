export const PLAYER_PRESETS = [
  { name: 'Coral',  color: '#c9705c' },
  { name: 'Lagoon', color: '#2f807b' },
  { name: 'Amber',  color: '#b98c30' },
  { name: 'Urchin', color: '#7d5c8d' },
];

/** The three things an edge can carry. Only equal kinds may meet. */
export const EDGE_KINDS = {
  water: { label: 'Open water', color: '#8ea7a4' },
  fish:  { label: 'Fish run',   color: '#3f7fa8' },
  arm:   { label: 'Tentacle',   color: '#7d5c8d' },
};

/**
 * Tile skeletons. `edges` is indexed north, east, south, west; the deck holds
 * `deckCounts[key]` of each and every one is dropped in at a random rotation.
 */
export const ARCHETYPES = {
  open:        { label: 'Open sand',     edges: ['water', 'water', 'water', 'water'] },
  fishThrough: { label: 'Fish run',      edges: ['fish',  'water', 'fish',  'water'] },
  fishBend:    { label: 'Fish bend',     edges: ['fish',  'fish',  'water', 'water'] },
  fishEnd:     { label: 'Shoal head',    edges: ['fish',  'water', 'water', 'water'] },
  armThrough:  { label: 'Tentacle run',  edges: ['arm',   'water', 'arm',   'water'] },
  armBend:     { label: 'Tentacle bend', edges: ['arm',   'arm',   'water', 'water'] },
  armTip:      { label: 'Tentacle tip',  edges: ['arm',   'water', 'water', 'water'] },
  armFork:     { label: 'Tentacle fork', edges: ['arm',   'arm',   'arm',   'water'] },
  crossing:    { label: 'Crossing',      edges: ['fish',  'arm',   'fish',  'arm'] },
  mixed:       { label: 'Reef corner',   edges: ['fish',  'arm',   'water', 'water'] },
};

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

// --- corner features: they meet at grid vertices and chain into reefs -------
export const REEF_TYPES = [
  { key: 'rock',      label: 'Rock',      value: 1, count: 8 },
  { key: 'posidonia', label: 'Posidonia', value: 2, count: 7 },
  { key: 'coral',     label: 'Coral',     value: 3, count: 6 },
  { key: 'sponge',    label: 'Sponge',    value: 2, count: 5 },
];

// --- creatures: rank decides who eats whom ---------------------------------
export const CREATURE_TYPES = [
  { key: 'jellyfish', label: 'Jellyfish', rank: 1, count: 6 },
  { key: 'turtle',    label: 'Turtle',    rank: 2, count: 5 },
  { key: 'shark',     label: 'Shark',     rank: 3, count: 4 },
];

// --- relics: worthless alone, valuable in a heap ---------------------------
export const RELIC_TYPES = [
  { key: 'amphora', label: 'Amphora',  value: 3, count: 2 },
  { key: 'chest',   label: 'Treasure', value: 4, count: 2 },
  { key: 'wreck',   label: 'Wreck',    value: 5, count: 2 },
];

export const DEFAULT_CONFIG = {
  seed: '',
  players: 2,
  grid: { cols: 8, rows: 8 },
  handSize: 4,

  // One shared deck for the whole table - the five scoring systems are all
  // contested, so everyone draws from the same water.
  deckCounts: {
    open: 6, fishThrough: 5, fishBend: 5, fishEnd: 6,
    armThrough: 6, armBend: 5, armTip: 6, armFork: 2,
    crossing: 3, mixed: 4,
  },

  reef:      { types: REEF_TYPES, twoCornerPct: 40 },
  creatures: { types: CREATURE_TYPES, centrePct: 65 },
  relics:    { types: RELIC_TYPES },

  scoring: {
    reefMinGroup: 2,      // slots before a reef is worth anything
    fishPerTile: 2,
    fishClosedMul: 2,     // a school with no loose end doubles
    armPerTile: 3,
    armClosedMul: 2,
    predationGain: 4,     // per rank of difference
    predationLoss: 3,
    shoalBonus: 2,        // two equals side by side
    rankScaled: true,     // scale predation by the gap in rank
    relicMinGroup: 2,
    relicSetBonus: 8,     // a heap holding all three kinds
  },

  rules: {
    requireAdjacency: true,      // must touch the reef already on the table
    strictEdges: true,           // water meets water, fish meets fish, arm meets arm
    allowOffBoardLinks: false,   // a run may not be left pointing off the grid
    relicsNeedNeighbour: false,  // force relics to be laid against another relic
  },

  end: {
    mode: 'deckEmpty',           // 'deckEmpty' | 'fixedRounds' | 'boardFull'
    roundsPerPlayer: 14,
    finalTurnForOthers: true,
  },

  // fitZoom is a percentage: 100 frames the whole grid, more zooms in.
  ui: { curtain: false, cardSize: 152, showLegal: true, fitZoom: 100, showGroups: true },
};

export const PARAM_SCHEMA = [
  {
    group: 'Table',
    fields: [
      { path: 'players', label: 'Players', type: 'int', min: 2, max: 4 },
      { path: 'grid.cols', label: 'Grid columns', type: 'int', min: 5, max: 16 },
      { path: 'grid.rows', label: 'Grid rows', type: 'int', min: 5, max: 16 },
      { path: 'handSize', label: 'Tiles in hand', type: 'int', min: 1, max: 8 },
      { path: 'seed', label: 'Seed (blank = random)', type: 'text' },
    ],
  },
  {
    group: 'Deck contents (shared)',
    deckTotal: true,
    fields: ARCHETYPE_KEYS.map((k) => ({
      path: `deckCounts.${k}`, label: ARCHETYPES[k].label, type: 'int', min: 0, max: 99,
    })),
  },
  {
    group: 'Reef features on corners',
    typeTable: { path: 'reef.types', cols: [
      { key: 'value', label: 'Points per slot', min: 0, max: 20 },
      { key: 'count', label: 'Tiles carrying it', min: 0, max: 60 },
    ] },
    fields: [
      { path: 'reef.twoCornerPct', label: 'Chance of two corners (%)', type: 'int', min: 0, max: 100 },
      { path: 'scoring.reefMinGroup', label: 'Slots before a reef scores', type: 'int', min: 2, max: 6 },
    ],
  },
  {
    group: 'Creatures',
    typeTable: { path: 'creatures.types', cols: [
      { key: 'rank', label: 'Rank (higher eats lower)', min: 1, max: 9 },
      { key: 'count', label: 'Tiles carrying it', min: 0, max: 40 },
    ] },
    fields: [
      { path: 'creatures.centrePct', label: 'Chance of sitting centre (%)', type: 'int', min: 0, max: 100 },
      { path: 'scoring.predationGain', label: 'Predator gains', type: 'int', min: 0, max: 20 },
      { path: 'scoring.predationLoss', label: 'Prey loses', type: 'int', min: 0, max: 20 },
      { path: 'scoring.shoalBonus', label: 'Two equals shoal for', type: 'int', min: 0, max: 20 },
      { path: 'scoring.rankScaled', label: 'Scale by the gap in rank', type: 'bool' },
    ],
  },
  {
    group: 'Relics',
    typeTable: { path: 'relics.types', cols: [
      { key: 'value', label: 'Points', min: 0, max: 30 },
      { key: 'count', label: 'Tiles carrying it', min: 0, max: 30 },
    ] },
    fields: [
      { path: 'scoring.relicMinGroup', label: 'Relics before a heap scores', type: 'int', min: 2, max: 6 },
      { path: 'scoring.relicSetBonus', label: 'Bonus for all three kinds', type: 'int', min: 0, max: 40 },
      { path: 'rules.relicsNeedNeighbour', label: 'Relics must be laid touching a relic', type: 'bool' },
    ],
  },
  {
    group: 'Fish schools and tentacles',
    fields: [
      { path: 'scoring.fishPerTile', label: 'Points per tile of school', type: 'int', min: 0, max: 20 },
      { path: 'scoring.fishClosedMul', label: 'Closed school multiplier', type: 'int', min: 1, max: 6 },
      { path: 'scoring.armPerTile', label: 'Points per tile of tentacle', type: 'int', min: 0, max: 20 },
      { path: 'scoring.armClosedMul', label: 'Closed tentacle multiplier', type: 'int', min: 1, max: 6 },
    ],
  },
  {
    group: 'Placement rules',
    fields: [
      { path: 'rules.requireAdjacency', label: 'Must touch the reef', type: 'bool' },
      { path: 'rules.strictEdges', label: 'Edges must match exactly', type: 'bool' },
      { path: 'rules.allowOffBoardLinks', label: 'Runs may point off the grid', type: 'bool' },
    ],
  },
  {
    group: 'End of game',
    fields: [
      { path: 'end.mode', label: 'Ends when', type: 'select', options: [
        { value: 'deckEmpty', label: 'The deck runs out' },
        { value: 'boardFull', label: 'Nobody can place' },
        { value: 'fixedRounds', label: 'Fixed rounds' },
      ] },
      { path: 'end.roundsPerPlayer', label: 'Rounds per player', type: 'int', min: 1, max: 60 },
      { path: 'end.finalTurnForOthers', label: 'Others get one last turn', type: 'bool' },
    ],
  },
  {
    group: 'Interface',
    fields: [
      { path: 'ui.curtain', label: 'Pass-the-device curtain', type: 'bool' },
      { path: 'ui.showLegal', label: 'Highlight legal squares', type: 'bool' },
      { path: 'ui.showGroups', label: 'Draw reef and relic links', type: 'bool' },
      { path: 'ui.cardSize', label: 'Tile size (px)', type: 'int', min: 90, max: 260 },
      { path: 'ui.fitZoom', label: 'Default zoom (%)', type: 'int', min: 60, max: 260 },
    ],
  },
];

export const clone = (v) => JSON.parse(JSON.stringify(v));

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
  return obj;
}
