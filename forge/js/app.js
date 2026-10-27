// Boot + tab routing.
import { db } from './store.js?v=1';
import { icon, $, closeTopSheet } from './ui.js?v=1';
import { renderHome, renderWorkouts, applyTheme } from './views.js?v=1';
import { renderProgram } from './program.js?v=1';
import { renderJournal } from './journal.js?v=1';
import { renderStats } from './stats.js?v=1';
import { openActive, ensureTicker, setActiveExitHandler } from './active.js?v=1';
import { hideTip } from './charts.js?v=1';

const TABS = [
  ['home', 'Accueil', 'home'],
  ['workouts', 'Séances', 'list'],
  ['program', 'Programme', 'cal'],
  ['journal', 'Journal', 'book'],
  ['stats', 'Stats', 'chart'],
];
let current = (location.hash.slice(1) in { home: 1, workouts: 1, program: 1, journal: 1, stats: 1 }) ? location.hash.slice(1) : 'home';
const view = $('#view');

function render() {
  hideTip();
  const y = view.scrollTop;
  if (current === 'home') renderHome(view, refresh, go);
  if (current === 'workouts') renderWorkouts(view, refresh);
  if (current === 'program') renderProgram(view, refresh);
  if (current === 'journal') renderJournal(view, refresh);
  if (current === 'stats') renderStats(view);
  view.scrollTop = y;
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === current));
}
function refresh() { render(); }
function go(tab) {
  current = tab;
  history.replaceState(null, '', '#' + tab);
  render();
  view.scrollTop = 0;
}

$('.tabbar').innerHTML = TABS.map(([id, label, ic]) => `<button data-tab="${id}">${icon(ic)}<span>${label}</span></button>`).join('');
$('.tabbar').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { while (closeTopSheet()); go(b.dataset.tab); } };
$('#mini-active').onclick = openActive;
setActiveExitHandler(() => { render(); ensureTicker(); });

applyTheme();
render();
if (db.active) { ensureTicker(); }

if ('serviceWorker' in navigator && location.hostname !== 'localhost') navigator.serviceWorker.register('sw.js').catch(() => {});
