/* Bootstrap: canvas sizing, input, the frame loop, and the DOM HUD. */

import { createGame, clamp, GATE_COUNT, GATE_BAND } from './game.js';

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const game = createGame(canvas);
const S = game.state;

const el = id => document.getElementById(id);
const hud = {
  alt: el('alt'), agl: el('agl'), aglFill: el('agl-fill'),
  vario: el('vario'), varioFill: el('vario-fill'),
  speed: el('speed'), gates: el('gates'), time: el('time'),
  gateDist: el('gate-dist'), gateAlt: el('gate-alt'),
  best: el('best'), seed: el('seed'),
  palette: el('palette'), fps: el('fps')
};
const overlay = el('overlay');
const ovTitle = el('ov-title');
const ovBody = el('ov-body');
const ovHint = el('ov-hint');

/* ------------------------------------------------------------- sizing */

function fit() {
  const w = stage.clientWidth, h = stage.clientHeight;
  game.resize(w, h);
}
window.addEventListener('resize', fit);

/* -------------------------------------------------------------- input */

const HELD = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space']);

window.addEventListener('keydown', e => {
  if (HELD.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  game.keys.add(e.code);

  switch (e.code) {
    case 'Space':
      if (S.phase === 'ready') game.start();
      else if (S.phase === 'crashed' || S.phase === 'won') restart(true);
      else game.togglePause();
      break;
    case 'KeyR': restart(false); break;
    case 'KeyN': restart(true); break;
    case 'KeyP': game.cyclePalette(e.shiftKey ? -1 : 1); break;
    case 'Escape': game.togglePause(); break;
  }
});
window.addEventListener('keyup', e => game.keys.delete(e.code));

// clicking anywhere does what Space does, so a mouse alone can start a run
stage.addEventListener('pointerdown', () => {
  if (S.phase === 'ready') game.start();
  else if (S.phase === 'crashed' || S.phase === 'won') restart(true);
  else if (S.phase === 'paused') game.togglePause();
});
window.addEventListener('blur', () => game.keys.clear());

function restart(newSeed) {
  game.reset(newSeed ? (Math.random() * 1e6) | 0 : undefined);
  game.start();
}

/* --------------------------------------------------------------- HUD */

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

const TITLES = {
  ready: 'Planeur',
  paused: 'Pause',
  crashed: 'Posé sans élégance',
  won: 'Parcours bouclé'
};

let lastPhase = null;

function updateOverlay() {
  const phase = S.phase;
  if (phase === lastPhase) return;
  lastPhase = phase;

  if (phase === 'flying') { overlay.hidden = true; return; }
  overlay.hidden = false;
  ovTitle.textContent = TITLES[phase];

  if (phase === 'ready') {
    ovBody.innerHTML = `
      <p>Vous êtes un goéland. Pas de moteur : vous descendez en permanence, et
         c'est le relief qui vous rend l'altitude. Les <b>versants au vent</b>
         portent (d'autant plus que vous êtes près du sol) et les
         <b>ascendances</b> tournent au-dessus des terres — jamais au-dessus de l'eau.</p>
      <p>Les paliers de couleur sont l'instrument : serrés et face au vent — que
         montrent les traînées qui filent sur la carte — il y a de la pente porteuse.
         Passez les ${GATE_COUNT} portes : il faut être dans l'anneau <i>et</i> à
         la bonne altitude.</p>
      <p class="keys">← → virer · ↑ ↓ vitesse (vite = ça descend) ·
         <kbd>P</kbd> palette · <kbd>R</kbd> même terrain · <kbd>N</kbd> nouveau ·
         <kbd>Échap</kbd> pause</p>`;
    ovHint.textContent = 'Espace ou clic pour décoller';
  } else if (phase === 'paused') {
    ovBody.innerHTML = '';
    ovHint.textContent = 'Espace ou clic pour reprendre';
  } else {
    const done = S.gateIndex;
    const bestLine = S.best
      ? `<p>Meilleur temps : <b>${fmtTime(S.best.time)}</b></p>` : '';
    ovBody.innerHTML = phase === 'won'
      ? `<p>${GATE_COUNT} portes en <b>${fmtTime(S.time)}</b>.</p>${bestLine}`
      : `<p>${done} / ${GATE_COUNT} portes · ${fmtTime(S.time)} en l'air.</p>${bestLine}`;
    ovHint.textContent = 'Espace : nouveau terrain · R : retenter celui-ci';
  }
}

let fpsAvg = 60;

function updateHud(dt) {
  const c = S.craft;
  const agl = game.agl();
  hud.alt.textContent = Math.round(c.alt) + ' m';
  hud.agl.textContent = Math.round(agl) + ' m';
  const aglPct = clamp(agl / 250, 0, 1) * 100;
  hud.aglFill.style.width = aglPct + '%';
  hud.aglFill.classList.toggle('danger', agl < 35);

  const v = S.varioSmooth;
  hud.vario.textContent = (v >= 0 ? '+' : '') + v.toFixed(1);
  hud.vario.classList.toggle('up', v > 0.2);
  hud.vario.classList.toggle('down', v < -0.2);
  const half = clamp(Math.abs(v) / 6, 0, 1) * 50;
  hud.varioFill.style.width = half + '%';
  hud.varioFill.style.left = v >= 0 ? '50%' : (50 - half) + '%';
  hud.varioFill.classList.toggle('down', v < 0);

  hud.speed.textContent = Math.round(c.speed * 0.55) + ' km/h';
  hud.gates.textContent = `${S.gateIndex} / ${GATE_COUNT}`;
  hud.time.textContent = fmtTime(S.time);

  const gate = S.gates[S.gateIndex];
  if (gate) {
    const d = Math.hypot(gate.x - c.x, gate.y - c.y);
    const dAlt = gate.alt - c.alt;
    hud.gateDist.textContent = Math.round(d) + ' m';
    hud.gateAlt.textContent = (dAlt >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(dAlt)) + ' m';
    hud.gateAlt.classList.toggle('ok', Math.abs(dAlt) < GATE_BAND);
  } else {
    hud.gateDist.textContent = '—';
    hud.gateAlt.textContent = '';
  }
  hud.best.textContent = S.best ? fmtTime(S.best.time) : '—';
  hud.seed.textContent = S.seed;
  hud.palette.textContent = game.palette.name;

  if (dt > 0) fpsAvg += (1 / dt - fpsAvg) * 0.05;
  hud.fps.textContent = Math.round(fpsAvg) + ' fps';
}

/* -------------------------------------------------------------- loop */

let last = 0;

function frame(ts) {
  const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
  last = ts;

  game.update(dt);
  if (S.phase === 'flying' || S.phase === 'ready') game.updateCamera(dt);
  game.draw(dt);
  updateOverlay();
  updateHud(dt);

  requestAnimationFrame(frame);
}

window.planeur = game;   // handy from the console
fit();
game.reset();
requestAnimationFrame(frame);
