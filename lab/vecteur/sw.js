// Offline cache: network-first so updates land, cache fallback when offline.
const CACHE = 'vecteur-v1';
const ASSETS = ['./', 'index.html', 'style.css?v=1', 'js/main.js?v=1', 'js/tracks.js', 'js/race.js', 'js/physics.js', 'js/ai.js', 'js/render.js', 'js/audio.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
