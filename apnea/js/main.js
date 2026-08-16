// Hash router + app shell.

import { icons } from './ui.js';
import { unlockAudio, silence } from './audio.js';
import { releaseAwake } from './timer.js';

import { requestPersistence } from './store.js';

import * as home from './views/home.js';
import * as hold from './views/hold.js';
import * as tables from './views/tables.js';
import * as relax from './views/relax.js';
import * as entry from './views/entry.js';
import * as progress from './views/progress.js';
import * as history from './views/history.js';
import * as settings from './views/settings.js';

const routes = {
  '': home,
  '/': home,
  '/hold': hold,
  '/tables': tables,
  '/relax': relax,
  '/entry': entry,
  '/progress': progress,
  '/history': history,
  '/settings': settings,
};

const TABS = [
  { href: '#/', label: 'Train', icon: icons.timer, match: ['', '/', '/hold', '/tables', '/relax', '/entry'] },
  { href: '#/progress', label: 'Progress', icon: icons.chart, match: ['/progress'] },
  { href: '#/history', label: 'History', icon: icons.list, match: ['/history'] },
  { href: '#/settings', label: 'Settings', icon: icons.gear, match: ['/settings'] },
];

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');

let cleanup = null;

function path() {
  return location.hash.replace(/^#/, '').split('?')[0] || '/';
}

function paintTabs(current) {
  tabbar.innerHTML = TABS.map((t) => {
    const active = t.match.includes(current);
    return `<a href="${t.href}"${active ? ' aria-current="page"' : ''}>${t.icon}<span>${t.label}</span></a>`;
  }).join('');
}

/** Views call this to hide the tab bar while a timer is running full-screen. */
export function setChrome(visible) {
  tabbar.hidden = !visible;
  app.classList.toggle('is-running', !visible);
  document.body.dataset.running = visible ? '0' : '1';
}

export function go(hash) {
  location.hash = hash;
}

function render() {
  const current = path();
  const view = routes[current] || home;

  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  silence();
  releaseAwake();
  setChrome(true);

  app.innerHTML = '';
  cleanup = view.render(app) || null;
  paintTabs(current);
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
window.addEventListener('beforeunload', () => { if (cleanup) cleanup(); });

// --- install & offline ------------------------------------------------------

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstall = event;
});

export const installPrompt = {
  available: () => Boolean(deferredInstall),
  async show() {
    if (!deferredInstall) return 'unavailable';
    deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    deferredInstall = null;
    return outcome;
  },
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[apnea] service worker not registered', err);
    });
  });
}

// A logbook is worth keeping: ask the browser to exempt it from eviction. Chrome
// decides on engagement, so this is a no-op until the app has been used a bit.
requestPersistence();

// Mobile browsers only allow audio after a gesture — take the first one we see.
['pointerdown', 'keydown'].forEach((evt) => {
  window.addEventListener(evt, unlockAudio, { once: true, passive: true });
});

render();
