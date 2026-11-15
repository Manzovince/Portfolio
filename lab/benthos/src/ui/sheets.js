import { reefGlyph, creatureGlyph, relicGlyph, fishGlyph } from '../render/glyphs.js';
import { el } from '../render/svg.js';
import { LINK } from '../render/palette.js';

export const sheet = (title, body, footer) => `
  <div class="sheet">
    <header><h2>${title}</h2></header>
    <div class="body">${body}</div>
    <footer>${footer}</footer>
  </div>`;

const icon = (inner) => `<svg viewBox="0 0 24 24" class="ic" aria-hidden="true">${inner}</svg>`;

export const reefIcon = (key) => icon(reefGlyph(key, 12, 12, 24));
export const creatureIcon = (key) => icon(creatureGlyph(key, 12, 12, 24));
export const relicIcon = (key) => icon(relicGlyph(key, 12, 12, 24));
export const fishIcon = () => icon(fishGlyph(12, 12, 22, 0, LINK.fish));
export const armIcon = () => icon(el('path', {
  d: 'M2 12 C7 12 7 5 12 5 C17 5 17 19 22 19',
  fill: 'none', stroke: LINK.arm, 'stroke-width': 3, 'stroke-linecap': 'round',
}));

export const legendHTML = (config) => `
  <div class="legend">
    <div class="legrow"><span class="legicons">${config.reef.types.map((t) => reefIcon(t.key)).join('')}</span>
      <span><b>Reef</b> corners meeting at a grid point chain into one reef. Points &times; slots, to whoever holds the most.</span></div>
    <div class="legrow"><span class="legicons">${fishIcon()}</span>
      <span><b>Schools</b> run edge to edge. Close both ends and the school doubles.</span></div>
    <div class="legrow"><span class="legicons">${armIcon()}</span>
      <span><b>Tentacles</b> only pay the octopus they hang off. Two heads on one system split it.</span></div>
    <div class="legrow"><span class="legicons">${config.relics.types.map((t) => relicIcon(t.key)).join('')}</span>
      <span><b>Relics</b> are worthless alone. Heap them and the whole heap pays; all three kinds adds a bonus.</span></div>
    <div class="legrow"><span class="legicons">${config.creatures.types.map((t) => creatureIcon(t.key)).join('')}</span>
      <span><b>Creatures</b> settle it by rank: jellyfish &lt; turtle &lt; shark. Equals shoal and both gain.</span></div>
  </div>`;

export const rulesSheet = (config) => sheet('How Benthos works', `
  <div class="rules">
    <h4>The tile</h4>
    <p>Every tile is a square with three kinds of feature at once: <b>links on its four edges</b> (open water, a fish run, a tentacle), <b>reef features on its corners</b>, and sometimes a <b>relic or a creature</b> in the middle. One tile to a square &mdash; nothing is superposed.</p>
    <h4>Laying a tile</h4>
    <ul>
      <li>Rotate with <span class="kbd">R</span>, mirror with <span class="kbd">F</span>, then drop it against the reef.</li>
      <li>Edges must match: water meets water, a fish run meets a fish run, a tentacle meets a tentacle. Nothing may be left running off the grid.</li>
      <li>The number on the ghost tile is what the placement is worth <em>right now</em>, to you.</li>
      <li>If nothing in hand fits, let a tile drift away and draw again.</li>
    </ul>
    <h4>The five ways to score</h4>
    ${legendHTML(config)}
    <p>Reefs, schools and relic heaps are <b>contested</b>: the whole group pays whoever laid the most of it, and a tie pays everyone tied. Tentacles are the exception &mdash; they pay by head, not by hand.</p>
    <h4>The octopus</h4>
    <p>Your head sits on the seabed from the first turn with a tentacle out of all four sides. Tentacle tiles extend it; a system with no loose end doubles. Run your arms into a rival&rsquo;s and you both split what the tangle is worth.</p>
  </div>`, '<button class="ghostbtn primary" data-close>Close</button>');

const LINES = [
  ['reef', 'Reef'], ['fish', 'Schools'], ['arms', 'Tentacles'], ['relics', 'Relics'], ['creatures', 'Creatures'],
];

export function finalSheet(rows) {
  const best = Math.max(...rows.map((r) => r.total));
  const body = `<table class="final">
    <thead><tr><th>Diver</th>${LINES.map(([, l]) => `<th>${l}</th>`).join('')}<th>Total</th></tr></thead>
    <tbody>${rows.slice().sort((a, b) => b.total - a.total).map((r) => `
      <tr class="${r.total === best ? 'win' : ''}">
        <td class="name"><span class="dot" style="display:inline-block;background:${r.color};margin-right:7px"></span>${r.name}</td>
        ${LINES.map(([k]) => `<td class="${r[k] < 0 ? 'neg' : ''}">${r[k]}</td>`).join('')}
        <td><b>${r.total}</b></td>
      </tr>`).join('')}</tbody></table>
    <p class="empty" style="margin-top:14px">Reefs, schools and relic heaps pay whoever laid the most of them. Tentacles pay by head.</p>`;
  return sheet('The tide is out', body, '<button class="ghostbtn" data-close>Keep looking</button><button class="ghostbtn primary" data-newgame>New game</button>');
}

export const SCORE_LINES = LINES;
