// Offline: network-first for the game's own files, cache-first for the versioned CDN libraries and fonts.
const CACHE = 'pousse-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const local = new URL(req.url).origin === location.origin;
  e.respondWith(local
    ? fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r; }).catch(() => caches.match(req))
    : caches.match(req).then(hit => hit || fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r; })));
});
