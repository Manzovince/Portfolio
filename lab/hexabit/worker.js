// Worker de simulation de masse : joue une tranche de parties et renvoie des agrégats partiels.
import { runRange } from './stats.js';

self.onmessage = e => {
  const { id, cfg, levels, from, to, seed, rollouts, permute } = e.data;
  const last = runRange(cfg, levels, from, to, seed, rollouts, permute, agg => self.postMessage({ id, agg }));
  self.postMessage({ id, agg: last, done: true });
};
