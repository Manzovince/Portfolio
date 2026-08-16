// Offline shell. Network-first with a cache fallback: online you always get the
// current code (no stale-version trap), offline the whole app still runs from
// cache. The app is a few tens of KB, so the latency cost is not worth trading
// for cache-first.

const VERSION = 'apnea-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/main.js',
  './js/store.js',
  './js/timer.js',
  './js/audio.js',
  './js/chart.js',
  './js/ui.js',
  './js/format.js',
  './js/fit.js',
  './js/dives.js',
  './js/views/home.js',
  './js/views/hold.js',
  './js/views/tables.js',
  './js/views/relax.js',
  './js/views/entry.js',
  './js/views/progress.js',
  './js/views/history.js',
  './js/views/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // addAll rejects the whole batch if one entry 404s; tolerate that
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // deep link with no cache entry: fall back to the shell, the hash router
        // resolves the route once it boots
        if (request.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
