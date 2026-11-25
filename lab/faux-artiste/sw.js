// Faux Artiste moved to /faussaire/ (2026-11-25). Everything else under
// /faux-artiste/ 301s there; this worker only retires the old one on phones that
// installed it: drop its cache, unregister, send open pages to the new URL.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('faux-artiste-')) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate('/faussaire/');
})()));
