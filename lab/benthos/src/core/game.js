import { PLAYER_PRESETS, clone } from '../config.js';
import { makeRng } from './rng.js';
import { buildDeck, makeHeadTile, resetTileIds } from './deck.js';
import { makeBoard, addTile, removeTile } from './board.js';
import { placeTile, distinctOrientations } from './tiles.js';
import { evaluatePlacement, legalCells, hasAnyPlacement } from './rules.js';
import { analyse, scoreGame } from './scoring.js';

/**
 * Head spots, mirrored about the centre so every octopus gets the same room.
 * Clamped one square inside the border: a head shows a tentacle on all four
 * sides, and a tentacle may not point off the reef.
 */
function headPositions(n, cols, rows) {
  const lo = (span, f) => Math.max(1, Math.min(span - 2, Math.round((span - 1) * f)));
  const hi = (span, f) => Math.max(1, Math.min(span - 2, span - 1 - lo(span, f)));
  const mid = (span) => Math.max(1, Math.min(span - 2, Math.round((span - 1) / 2)));
  if (n === 1) return [[mid(cols), mid(rows)]];
  if (n === 2) return [[lo(cols, 0.28), mid(rows)], [hi(cols, 0.28), mid(rows)]];
  if (n === 3) return [[mid(cols), lo(rows, 0.2)], [lo(cols, 0.22), hi(rows, 0.2)], [hi(cols, 0.22), hi(rows, 0.2)]];
  return [
    [lo(cols, 0.26), lo(rows, 0.26)], [hi(cols, 0.26), lo(rows, 0.26)],
    [lo(cols, 0.26), hi(rows, 0.26)], [hi(cols, 0.26), hi(rows, 0.26)],
  ];
}

export class Game {
  constructor(config) {
    this.config = clone(config);
    this.rng = makeRng(this.config.seed);
    resetTileIds();

    const { cols, rows } = this.config.grid;
    this.board = makeBoard(cols, rows);
    this.listeners = new Set();
    this.log = [];
    this.turnIndex = 0;
    this.round = 1;
    this.over = false;
    this.pendingEnd = false;
    this.endsAtIndex = null;
    this.discards = [];

    this.players = Array.from({ length: this.config.players }, (_, i) => {
      const preset = PLAYER_PRESETS[i % PLAYER_PRESETS.length];
      return { id: `p${i}`, index: i, name: preset.name, color: preset.color, hand: [] };
    });

    this.deck = buildDeck(this.config, this.rng);
    for (const p of this.players) this.draw(p);

    const spots = headPositions(this.players.length, cols, rows);
    this.heads = this.players.map((p, i) => {
      const tile = makeHeadTile(p);
      const [x, y] = spots[i];
      addTile(this.board, placeTile(tile, 0, false, x, y));
      return { playerId: p.id, tileId: tile.id, x, y };
    });

    this.say(`${this.current.name} opens the reef.`);
  }

  // --- plumbing -----------------------------------------------------------
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this); }
  say(text) { this.log.unshift({ text, round: this.round }); this.log.length = Math.min(this.log.length, 60); }

  get current() { return this.players[this.turnIndex]; }
  playerById(id) { return this.players.find((p) => p.id === id); }

  draw(player) {
    while (player.hand.length < this.config.handSize && this.deck.length) player.hand.push(this.deck.pop());
  }

  // --- queries used by the UI --------------------------------------------
  evaluate(tile, rot, flip, x, y) {
    return evaluatePlacement(this.board, tile, rot, flip, x, y, this.config);
  }

  legalCellsFor(tile, rot, flip) {
    return legalCells(this.board, tile, rot, flip, this.config);
  }

  orientationsFor(tile) { return distinctOrientations(tile); }

  canAct(player = this.current) {
    return player.hand.some((t) => hasAnyPlacement(this.board, t, this.config));
  }

  analyse() { return analyse(this); }
  scores(analysis) { return scoreGame(this, analysis || analyse(this)); }

  /**
   * What a placement would be worth right now, to everyone. Laid down, read,
   * lifted back off - the board is small enough that this is cheap, and with
   * five scoring systems running at once it is the only honest way to show it.
   */
  previewScore(tile, rot, flip, x, y, player = this.current) {
    if (!this.evaluate(tile, rot, flip, x, y).ok) return null;
    const before = scoreGame(this);
    addTile(this.board, placeTile(tile, rot, flip, x, y, { ownerId: player.id, color: player.color }));
    const after = scoreGame(this);
    removeTile(this.board, tile.id);
    const deltas = new Map();
    after.forEach((row, i) => deltas.set(row.playerId, row.total - before[i].total));
    return { self: deltas.get(player.id) || 0, deltas };
  }

  // --- actions ------------------------------------------------------------
  playTile({ tileId, rot, flip, x, y }) {
    if (this.over) return { ok: false, reason: 'The tide is out' };
    const player = this.current;
    const idx = player.hand.findIndex((t) => t.id === tileId);
    if (idx < 0) return { ok: false, reason: 'Not in hand' };
    const tile = player.hand[idx];

    const verdict = this.evaluate(tile, rot, flip, x, y);
    if (!verdict.ok) return verdict;

    addTile(this.board, placeTile(tile, rot, flip, x, y, { ownerId: player.id, color: player.color }));
    player.hand.splice(idx, 1);
    this.draw(player);

    this.say(`${player.name} lays ${this.describe(tile)}.`);
    this.afterAction();
    return { ok: true };
  }

  describe(tile) {
    if (tile.relic) return `a ${tile.relic.label.toLowerCase()}`;
    if (tile.creature) return `a ${tile.creature.label.toLowerCase()}`;
    const reef = tile.corners.find(Boolean);
    if (reef) return `${reef}`;
    return 'a tile';
  }

  /** Drop a tile that fits nowhere and draw a replacement. */
  discard(tileId) {
    if (this.over) return { ok: false, reason: 'The tide is out' };
    const player = this.current;
    const i = player.hand.findIndex((t) => t.id === tileId);
    if (i < 0) return { ok: false, reason: 'Not in hand' };
    this.discards.push(player.hand.splice(i, 1)[0]);
    this.draw(player);
    this.say(`${player.name} lets a tile drift away.`);
    this.afterAction();
    return { ok: true };
  }

  skip() {
    if (this.over) return { ok: false, reason: 'The tide is out' };
    this.say(`${this.current.name} waits.`);
    this.afterAction();
    return { ok: true };
  }

  // --- turn flow ----------------------------------------------------------
  afterAction() {
    this.checkEnd();
    if (!this.over) this.advance();
    this.emit();
  }

  advance() {
    for (let hop = 0; hop < this.players.length + 1; hop++) {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      if (this.turnIndex === 0) this.round++;
      if (this.pendingEnd && this.turnIndex === this.endsAtIndex) { this.finish('Final turn played.'); return; }
      if (this.config.end.mode === 'fixedRounds' && this.round > this.config.end.roundsPerPlayer) {
        this.finish('Round limit reached.');
        return;
      }
      if (this.current.hand.length) return;
      this.say(`${this.current.name} has nothing left to lay.`);
    }
    this.finish('Every hand is empty.');
  }

  checkEnd() {
    if (this.over || this.pendingEnd) return;
    const mode = this.config.end.mode;
    if (mode === 'deckEmpty') {
      if (!this.deck.length && this.players.every((p) => !p.hand.length)) this.triggerEnd('The deck is spent.');
    } else if (mode === 'boardFull') {
      if (!this.players.some((p) => this.canAct(p))) this.triggerEnd('Nothing more will fit.');
    }
  }

  triggerEnd(reason) {
    this.say(reason);
    if (this.config.end.finalTurnForOthers && this.players.length > 1) {
      this.pendingEnd = true;
      this.endsAtIndex = this.turnIndex;
      this.say('Everyone else takes one last turn.');
    } else {
      this.finish(reason);
    }
  }

  finish(reason) {
    this.over = true;
    this.pendingEnd = false;
    this.say(`The tide is out - ${reason}`);
  }
}

export const createGame = (config) => new Game(config);
