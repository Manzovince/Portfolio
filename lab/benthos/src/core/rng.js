// Deterministic RNG so a seed reproduces a whole game.

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  const s = String(str ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function makeRng(seed) {
  let a = seed === '' || seed == null ? (Math.random() * 4294967296) >>> 0 : hashSeed(seed);
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng, n) => Math.floor(rng() * n);

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Weighted pick over an array of [key, weight] pairs. */
export function pickWeighted(rng, pairs) {
  let total = 0;
  for (const [, w] of pairs) total += Math.max(0, w);
  if (total <= 0) return pairs.length ? pairs[0][0] : null;
  let r = rng() * total;
  for (const [k, w] of pairs) {
    r -= Math.max(0, w);
    if (r <= 0) return k;
  }
  return pairs[pairs.length - 1][0];
}
