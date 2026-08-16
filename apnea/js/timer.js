// Drift-free stopwatch. rAF only drives repaints; elapsed time always comes from
// the wall clock, so a throttled/backgrounded tab self-corrects on return.

export class Ticker {
  constructor(onTick) {
    this.onTick = onTick;
    this.t0 = 0;
    this.offset = 0;      // accumulated time from previous runs (pause support)
    this.raf = null;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.t0 = performance.now();
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.onTick(this.elapsed());
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  elapsed() {
    return this.offset + (this.running ? (performance.now() - this.t0) / 1000 : 0);
  }

  pause() {
    if (!this.running) return;
    this.offset = this.elapsed();
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  reset() {
    this.pause();
    this.offset = 0;
  }

  stop() {
    const total = this.elapsed();
    this.pause();
    return total;
  }
}

/** Fires `fn` once each time the whole-second boundary is crossed. */
export function secondGate() {
  let last = -1;
  return (elapsed, fn) => {
    const s = Math.floor(elapsed);
    if (s !== last) {
      last = s;
      fn(s);
    }
  };
}

// --- screen wake lock -------------------------------------------------------

let lock = null;

export async function keepAwake(enabled) {
  if (!enabled) return releaseAwake();
  if (!('wakeLock' in navigator) || lock) return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch {
    lock = null; // denied or unsupported — not worth surfacing
  }
}

export function releaseAwake() {
  if (lock) {
    lock.release().catch(() => {});
    lock = null;
  }
}

// Browsers drop the lock when the tab is hidden; re-take it on return.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.body.dataset.running === '1') {
    keepAwake(true);
  }
});
