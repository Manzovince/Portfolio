// Offline cache.
// - The app (pages, scripts, styles): network first so updates land, the cache
//   when offline or when the network hangs (TIMEOUT). The whole app is cached
//   at install, so it opens offline even on screens never visited.
// - Piano samples and bundled songs never change: cache first, in their own
//   cache that survives new versions (no re-download after each deploy).
// Caches are shared by every app of the site: only Octave's own are touched.
const V = '?v=202611141';                 // ?v= of this version (stamped by tools/deploy.sh)
const CACHE = 'octave-202611141';    // the app, one per version (stamped by tools/deploy.sh)
const MEDIA = 'octave-media-v1';
const FILES = ['js/algorithms.js?v=202611141', 'js/analysis.js?v=202611141', 'js/backup.js?v=202611141', 'js/bass.js?v=202611141', 'js/coach-guide.js?v=202611141', 'js/coach.js?v=202611141', 'js/colors.js?v=202611141', 'js/course.js?v=202611141', 'js/create.js?v=202611141', 'js/db.js?v=202611141', 'js/dx7.js?v=202611141', 'js/engine.js?v=202611141', 'js/fall.js?v=202611141', 'js/fm-worklet.js?v=202611141', 'js/graph.js?v=202611141', 'js/guide.js?v=202611141', 'js/i18n.js?v=202611141', 'js/keys.js?v=202611141', 'js/lab.js?v=202611141', 'js/learn.js?v=202611141', 'js/lesson.js?v=202611141', 'js/library.js?v=202611141', 'js/lumi.js?v=202611141', 'js/main.js?v=202611141', 'js/metronome.js?v=202611141', 'js/midi.js?v=202611141', 'js/notes.js?v=202611141', 'js/perform.js?v=202611141', 'js/play.js?v=202611141', 'js/practice.js?v=202611141', 'js/presets.js?v=202611141', 'js/recorder.js?v=202611141', 'js/roll.js?v=202611141', 'js/score.js?v=202611141', 'js/settings.js?v=202611141', 'js/song.js?v=202611141', 'js/sound-course.js?v=202611141', 'js/store.js?v=202611141', 'js/strings.js?v=202611141', 'js/suggest.js?v=202611141', 'js/theory.js?v=202611141', 'js/ui.js?v=202611141', 'js/understand.js?v=202611141', ];             // js/*.js of this version (filled in by tools/deploy.sh)
const SHELL = ['./', 'index.html', 'style.css' + V, 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const TIMEOUT = 4000;

const isMedia = url => /\/(sound|songs)\//.test(url.pathname);
// only whole, successful, same-origin answers are kept (no 404, no partial 206)
const keepable = r => r && r.ok && r.status === 200 && r.type === 'basic';

self.addEventListener('install', e => {
  self.skipWaiting();
  // one missing file must not stop the install: each is fetched on its own
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled([...SHELL, ...FILES].map(u =>
    fetch(u, { cache: 'reload' }).then(r => keepable(r) && c.put(u, r))))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('octave-') && k !== CACHE && k !== MEDIA).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return;
  e.respondWith(isMedia(url) ? cacheFirst(req) : networkFirst(req, e));
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (keepable(r)) { const copy = r.clone(); caches.open(MEDIA).then(c => c.put(req, copy)); }
  return r;
}

function networkFirst(req, e) {
  const net = fetch(req).then(r => {
    if (keepable(r)) { const copy = r.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy))); }
    return r;
  });
  e.waitUntil(net.catch(() => {}));
  const fallback = async () => (await caches.match(req)) || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
  return new Promise(resolve => {
    let done = false;
    const settle = r => { if (!done && r) { done = true; resolve(r); } };
    // the network hangs: answer from the cache, if it has the file
    const timer = setTimeout(() => fallback().then(settle), TIMEOUT);
    net.then(r => { clearTimeout(timer); settle(r); })
      .catch(async () => {
        clearTimeout(timer);
        settle((await fallback()) || Response.error());
      });
    // nothing cached either: wait for the network after all
    net.then(settle, () => {});
  });
}
