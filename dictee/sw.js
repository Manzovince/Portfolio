// Cache de l'app pour un démarrage sans réseau (la reconnaissance vocale, elle, en a souvent besoin).
const CACHE = 'dictee-v21';
const FILES = ['./', 'index.html', 'style.css?v=19', 'js/app.js?v=18', 'js/parser.js?v=10', 'js/speech.js?v=10', 'js/form.js?v=10', 'js/view.js?v=10', 'js/audio.js?v=16',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Réseau d'abord, cache en secours.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).pathname.endsWith('/ping.txt')) return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request)));
});
