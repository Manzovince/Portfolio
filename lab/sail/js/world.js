const CHUNK_SIZE = 900;
const ISLAND_NOISE_SCALE = 2600;
const ISLAND_THRESHOLD = 0.58;
const ISLAND_POLY_POINTS = 28;

function chunkKey(cx, cy) {
  return `${cx},${cy}`;
}

// Builds an irregular blob polygon (world-space points, relative to island center)
// so islands read as organic coastlines instead of perfect circles.
function generateIslandShape(rand, baseRadius, seedOffset) {
  const points = [];
  const wobbleSeed = seedOffset;
  for (let i = 0; i < ISLAND_POLY_POINTS; i++) {
    const angle = (i / ISLAND_POLY_POINTS) * Math.PI * 2;
    const nx = Math.cos(angle) * 1.7 + 10.5;
    const ny = Math.sin(angle) * 1.7 + 10.5;
    const n = fbm(nx, ny, wobbleSeed, 3, 2.1, 0.5);
    const radius = baseRadius * (0.62 + 0.5 * n);
    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return points;
}

function generateDecorations(rand, radius) {
  const trees = [];
  const treeCount = 5 + Math.floor(rand() * 7);
  for (let i = 0; i < treeCount; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * radius * 0.55;
    trees.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      size: 6 + rand() * 7,
    });
  }
  const rocks = [];
  const rockCount = Math.floor(rand() * 3);
  for (let i = 0; i < rockCount; i++) {
    const a = rand() * Math.PI * 2;
    const r = radius * (0.85 + rand() * 0.35);
    rocks.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      size: 4 + rand() * 5,
    });
  }
  return { trees, rocks };
}

class World {
  constructor(seed) {
    this.seed = seed;
    this.chunkCache = new Map();
  }

  getChunk(cx, cy) {
    const key = chunkKey(cx, cy);
    let chunk = this.chunkCache.get(key);
    if (chunk) return chunk;

    const centerX = (cx + 0.5) * CHUNK_SIZE;
    const centerY = (cy + 0.5) * CHUNK_SIZE;
    const n = fbm(
      centerX / ISLAND_NOISE_SCALE,
      centerY / ISLAND_NOISE_SCALE,
      this.seed,
      4,
      2.0,
      0.5
    );

    chunk = { islands: [] };

    if (n > ISLAND_THRESHOLD) {
      const islandSeed = hashToSeed(cx, cy, this.seed);
      const rand = mulberry32(islandSeed);

      const jitterRange = CHUNK_SIZE * 0.28;
      const ix = centerX + (rand() - 0.5) * 2 * jitterRange;
      const iy = centerY + (rand() - 0.5) * 2 * jitterRange;

      const strength = (n - ISLAND_THRESHOLD) / (1 - ISLAND_THRESHOLD);
      const baseRadius = 70 + strength * 160 + rand() * 40;

      const shape = generateIslandShape(rand, baseRadius, islandSeed * 0.001);
      const { trees, rocks } = generateDecorations(rand, baseRadius);

      chunk.islands.push({
        x: ix,
        y: iy,
        radius: baseRadius,
        shape,
        trees,
        rocks,
      });
    }

    this.chunkCache.set(key, chunk);
    return chunk;
  }

  getVisibleIslands(viewMinX, viewMinY, viewMaxX, viewMaxY) {
    const margin = 400;
    const cxMin = Math.floor((viewMinX - margin) / CHUNK_SIZE);
    const cxMax = Math.floor((viewMaxX + margin) / CHUNK_SIZE);
    const cyMin = Math.floor((viewMinY - margin) / CHUNK_SIZE);
    const cyMax = Math.floor((viewMaxY + margin) / CHUNK_SIZE);

    const islands = [];
    for (let cy = cyMin; cy <= cyMax; cy++) {
      for (let cx = cxMin; cx <= cxMax; cx++) {
        const chunk = this.getChunk(cx, cy);
        for (const island of chunk.islands) {
          islands.push(island);
        }
      }
    }
    return islands;
  }
}

