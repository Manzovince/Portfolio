import { runRange } from './sim.js?v=1';
self.onmessage = e => {
  const { id, cfg, levels, from, to, seed } = e.data;
  let last = 0;
  const agg = runRange(cfg, levels, from, to, seed, a => { const d = a.n - last; last = a.n; self.postMessage({ id, progress: d }); });
  self.postMessage({ id, agg, progress: agg.n - last, done: true });
};
