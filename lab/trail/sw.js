// Hors ligne : réseau d’abord, copie en cache sinon (indispensable le jour de la course).
const C = 'thp40-v6';
const SHELL = ['./', 'index.html', 'style.css?v=6', 'data.js?v=6', 'app.js?v=6', 'icon.svg?v=6', 'icon-192.png?v=6', 'manifest.webmanifest?v=6'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  const same = u.origin === location.origin, fonts = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!same && !fonts) return;               // Strava (activities.json) : jamais mis en cache ici
  e.respondWith(fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match(r, { ignoreSearch: true }))));
});
