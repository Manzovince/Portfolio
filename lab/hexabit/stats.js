// Agrégats de simulation : additifs, donc fusionnables entre plusieurs workers.
import { playGame, normalize } from './engine.js';

export function newAgg(n) {
  return {
    games: 0, n, ties: 0, lenSum: 0, lenHist: {}, marginHist: {}, extra: {},
    seats: Array.from({ length: n }, () => ({ wins: 0, sum: 0, sq: 0, min: Infinity, max: -Infinity })),
    levels: {},
  };
}
const bump = (h, k, v = 1) => (h[k] = (h[k] || 0) + v);

export function addResult(agg, res, seatLevels) {
  agg.games++;
  agg.lenSum += res.length;
  bump(agg.lenHist, res.length);
  const sorted = res.scores.slice().sort((a, b) => b - a);
  bump(agg.marginHist, Math.round((sorted[0] - sorted[1]) * 10) / 10);
  if (res.winners.length > 1) agg.ties++;
  res.scores.forEach((s, i) => {
    const S = agg.seats[i];
    const w = res.winners.includes(i) ? 1 / res.winners.length : 0;
    S.wins += w;
    S.sum += s;
    S.sq += s * s;
    S.min = Math.min(S.min, s);
    S.max = Math.max(S.max, s);
    const L = (agg.levels[seatLevels[i]] ||= { plays: 0, wins: 0, sum: 0 });
    L.plays++;
    L.wins += w;
    L.sum += s;
  });
  for (const k in res.extra) bump(agg.extra, k, res.extra[k]);
}

export function mergeAgg(a, b) {
  const m = structuredClone(a);
  m.games += b.games;
  m.ties += b.ties;
  m.lenSum += b.lenSum;
  for (const k in b.lenHist) bump(m.lenHist, k, b.lenHist[k]);
  for (const k in b.marginHist) bump(m.marginHist, k, b.marginHist[k]);
  for (const k in b.extra) bump(m.extra, k, b.extra[k]);
  b.seats.forEach((s, i) => {
    const t = m.seats[i];
    t.wins += s.wins, t.sum += s.sum, t.sq += s.sq;
    t.min = Math.min(t.min, s.min), t.max = Math.max(t.max, s.max);
  });
  for (const k in b.levels) {
    const L = (m.levels[k] ||= { plays: 0, wins: 0, sum: 0 });
    L.plays += b.levels[k].plays, L.wins += b.levels[k].wins, L.sum += b.levels[k].sum;
  }
  return m;
}

// Niveaux d'IA du siège i pour la partie g (rotation éventuelle pour comparer les IA à égalité).
export function seatLevels(levels, n, g, permute) {
  return Array.from({ length: n }, (_, i) => levels[(permute ? i + g : i) % levels.length]);
}

// Joue les parties d'indices [from, to) — la graine d'une partie ne dépend que de son indice.
export function runRange(cfg, levels, from, to, seed, rollouts, permute, onBatch) {
  cfg = normalize(cfg);
  const n = cfg.players;
  let agg = newAgg(n);
  let t = Date.now();
  for (let g = from; g < to; g++) {
    const lv = seatLevels(levels, n, g, permute);
    addResult(agg, playGame(cfg, lv, (seed * 1000003 + g * 7919 + 1) >>> 0, rollouts), lv);
    if (onBatch && Date.now() - t > 200) {
      onBatch(agg);
      agg = newAgg(n);
      t = Date.now();
    }
  }
  return agg;
}
