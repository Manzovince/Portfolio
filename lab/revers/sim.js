// Simulation de masse bot contre bot (partagée par worker.js et tools/sim.mjs).
import { newGame, mulberry32, forceOnBoard } from './engine.js?v=3';
import { playTurn } from './ai.js?v=3';

export function emptyAgg() {
  return { n: 0, win: [0, 0], nul: 0, firstWins: 0, bySouv: 0, byForce: 0, turns: 0, traps: 0, checks: 0,
    caps: 0, strikes: 0, fails: 0, swaps: 0, brumes: 0, peeks: 0, hist: {} };
}

// levels[seat] : niveau du joueur 0 / 1. Le premier joueur alterne une partie sur deux.
export function playOne(cfg, levels, seed) {
  const rng = mulberry32(seed);
  const first = seed % 2;
  const s = newGame(cfg, rng, null, first);
  s.log = null;
  while (s.winner === null) playTurn(s, levels[s.cur], rng);
  return { s, first };
}

export function runRange(cfg, levels, from, to, seed, onPartial) {
  const agg = emptyAgg();
  for (let i = from; i < to; i++) {
    const { s, first } = playOne(cfg, levels, seed + i * 7919);
    agg.n++;
    if (s.winner === 'nul') agg.nul++; else { agg.win[s.winner]++; if (s.winner === first) agg.firstWins++; }
    if (s.why === 'souverain') agg.bySouv++; else agg.byForce++;
    agg.turns += s.turn;
    const b = Math.min(60, Math.floor(s.turn / 5) * 5); agg.hist[b] = (agg.hist[b] || 0) + 1;
    for (const k of ['traps', 'checks', 'strikes', 'fails', 'swaps', 'brumes', 'peeks']) agg[k] += s.stats[k];
    agg.caps += s.stats.caps[0] + s.stats.caps[1];
    if (onPartial && agg.n % 10 === 0) { onPartial({ ...agg, hist: { ...agg.hist } }); }
  }
  return agg;
}

export function mergeAgg(a, b) {
  const o = emptyAgg();
  for (const k of Object.keys(o)) {
    if (k === 'win') o.win = [a.win[0] + b.win[0], a.win[1] + b.win[1]];
    else if (k === 'hist') { o.hist = { ...a.hist }; for (const h in b.hist) o.hist[h] = (o.hist[h] || 0) + b.hist[h]; }
    else o[k] = a[k] + b[k];
  }
  return o;
}
