// Hexabit — moteur de règles et IA. Pur JS, sans DOM : utilisé par l'UI, le worker et Node.
// Une carte est un entier 0..63 ; la bande du haut est le bit 32, celle du bas le bit 1.
// Jouée retournée (180°), une carte vaut le miroir binaire de sa valeur.

export const MIRROR = Array.from({ length: 64 }, (_, v) => {
  let r = 0;
  for (let i = 0; i < 6; i++) if ((v >> i) & 1) r |= 1 << (5 - i);
  return r;
});
export const POP = Array.from({ length: 64 }, (_, v) => {
  let c = 0;
  for (let i = 0; i < 6; i++) c += (v >> i) & 1;
  return c;
});
export const bin = v => v.toString(2).padStart(6, '0');

// ---------- RNG (mulberry32, état clonable) ----------
export const makeRng = seed => ({ s: (seed >>> 0) || 1 });
export function rnd(r) {
  let t = (r.s = (r.s + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rint = (r, n) => Math.floor(rnd(r) * n);
export function shuffle(a, r) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rint(r, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const deck64 = r => shuffle([...Array(64).keys()], r);
const pick = (a, r) => a[rint(r, a.length)];

// ---------- Configuration ----------
export const DEFAULTS = {
  mode: 'chevauche',
  players: 3,
  hand: 6,
  flip: false,
  chevauche: { refill: true, blocked: 'draw', points: 'cards', fullBonus: 2 },
  duel: { slots: 6, op: 'replace', win: 'line', tiebreak: 'majority', start: 'noir', setup: 'balanced', swap: false, handicap: 0, double: false },
  plis: { suitBits: 2, follow: true, trump: 'none', lowWins: false, scoring: 'tricks', rounds: 1 },
  registre: { op: 'xor', cond: 'palin' },
  rami: { nulSize: 3, nulPts: 2, family: true, famMin: 4, famPts: 1, run: true, runMin: 3, runPts: 1, outBonus: 5, handPenalty: 1 },
};

export const MODE_NAMES = {
  chevauche: 'Sans chevauchement',
  duel: 'Duel Noir / Blanc',
  plis: 'Plis',
  registre: 'Registre',
  rami: 'Rami binaire',
};

export function maxHand(cfg) {
  const n = cfg.mode === 'duel' ? 2 : cfg.players;
  const reserve = { chevauche: 0, duel: cfg.duel.slots, plis: 0, registre: 1, rami: 2 }[cfg.mode];
  return Math.max(1, Math.min(15, Math.floor((64 - reserve) / n)));
}
export function normalize(cfg) {
  const c = structuredClone(cfg);
  if (c.mode === 'duel') c.players = 2;
  c.players = Math.max(2, Math.min(6, c.players));
  c.hand = Math.max(1, Math.min(maxHand(c), c.hand));
  return c;
}

// ---------- Outils communs ----------
const orients = (card, cfg) => (cfg.flip && MIRROR[card] !== card ? [false, true] : [false]);
const valOf = (card, flip) => (flip ? MIRROR[card] : card);
const removeOne = (arr, x) => {
  const i = arr.indexOf(x);
  if (i >= 0) arr.splice(i, 1);
};
function cardMoves(st, filter) {
  const out = [];
  for (const card of st.hands[st.cur])
    for (const flip of orients(card, st.cfg)) {
      const val = valOf(card, flip);
      if (!filter || filter(val)) out.push({ card, flip, val });
    }
  return out;
}
// Cartes qu'un joueur ne peut pas voir : ni dans sa main, ni posées face visible.
export function unknownFor(st, o) {
  const seen = new Uint8Array(64);
  for (const c of st.hands[o]) seen[c] = 1;
  for (const c of st.pub) seen[c] = 1;
  const out = [];
  for (let c = 0; c < 64; c++) if (!seen[c]) out.push(c);
  return out;
}
// Valeurs atteignables (avec retournement) par les cartes inconnues.
function unknownVals(st, o) {
  const m = new Uint8Array(64);
  for (const c of unknownFor(st, o)) for (const f of orients(c, st.cfg)) m[valOf(c, f)]++;
  return m;
}
function draw(st, p) {
  if (st.deck.length) st.hands[p].push(st.deck.pop());
}
function dealHands(st, deck) {
  st.hands = [];
  for (let p = 0; p < st.n; p++) st.hands.push(deck.splice(0, st.cfg.hand).sort((a, b) => a - b));
}
const nextP = st => (st.cur + 1) % st.n;
const allEmpty = st => st.hands.every(h => h.length === 0);

// =====================================================================
// 1. SANS CHEVAUCHEMENT — idée du joueur
// On empile les cartes sur une colonne commune. Une carte n'est posable que si
// aucune de ses bandes noires ne tombe sur une bande déjà noire de la colonne.
// La colonne se ferme quand elle devient entièrement noire (63) — le joueur qui la
// complète la ramasse avec un bonus — ou quand tout le monde a passé : le dernier
// à avoir posé la ramasse.
// =====================================================================
const Chevauche = {
  init(st) {
    const deck = deck64(st.rng);
    dealHands(st, deck);
    Object.assign(st, { deck, pub: [], R: 0, pile: [], last: -1, passes: 0 });
    st.stats = { columns: 0, full: 0, passes: 0, pileSize: 0 };
  },
  legal(st) {
    const ms = cardMoves(st, v => (v & st.R) === 0);
    return ms.length ? ms : [{ pass: true }];
  },
  apply(st, m) {
    const c = st.cfg.chevauche;
    const p = st.cur;
    if (m.pass) {
      st.stats.passes++;
      if (c.blocked === 'draw') draw(st, p);
      st.passes++;
      if (st.passes >= st.n) closeColumn(st, st.last, false);
    } else {
      removeOne(st.hands[p], m.card);
      st.pub.push(m.card);
      st.pile.push({ card: m.card, flip: m.flip, p });
      st.R |= m.val;
      st.last = p;
      st.passes = 0;
      if (c.refill) draw(st, p);
      if (st.R === 63) closeColumn(st, p, true);
    }
    st.turns++;
    if (allEmpty(st) && !st.deck.length) {
      if (st.pile.length) closeColumn(st, st.last, false);
      st.over = true;
    } else st.cur = nextP(st);
  },
  greedy(st, rng) {
    const ms = Chevauche.legal(st);
    if (ms[0].pass) return ms[0];
    const full = ms.filter(m => (st.R | m.val) === 63);
    if (full.length) return full[0];
    const uv = unknownVals(st, st.cur);
    let best = null, bs = -Infinity;
    for (const m of ms) {
      const R2 = st.R | m.val;
      const need = 63 ^ R2; // la carte exacte qui fermerait la colonne
      const danger = uv[need];
      // Poser du noir vide la main des cartes difficiles ; garder le 0 (joker) pour la fin.
      const s = POP[m.val] * 1.2 - danger * 2.5 - (m.card === 0 ? 3 : 0) + rnd(rng) * 0.3;
      if (s > bs) (bs = s), (best = m);
    }
    return best;
  },
  describe(st, m) {
    return m.pass ? 'passe' : `pose ${m.val}${m.flip ? ' (retournée)' : ''} → colonne ${bin(st.R | m.val)}`;
  },
  summary(st) {
    const s = st.stats;
    return { columns: s.columns, full: s.full, passes: s.passes, pileAvg: s.columns ? s.pileSize / s.columns : 0 };
  },
};
function closeColumn(st, p, full) {
  const c = st.cfg.chevauche;
  if (p >= 0 && st.pile.length) {
    st.scores[p] += (c.points === 'cards' ? st.pile.length : 1) + (full ? c.fullBonus : 0);
    st.stats.columns++;
    st.stats.pileSize += st.pile.length;
    if (full) st.stats.full++;
    st.lastClose = { p, full, n: st.pile.length };
  }
  st.R = 0;
  st.pile = [];
  st.passes = 0;
}

// =====================================================================
// 2. DUEL NOIR / BLANC — idée du joueur
// Deux joueurs : Noir (siège 1) et Blanc (siège 2). Une combinaison de K cartes est
// posée sur la table. À son tour on joue une carte sur un emplacement (elle remplace
// la carte, ou l'inverse bande à bande en XOR). Noir gagne dès qu'une combinaison
// cible est entièrement noire, Blanc dès qu'elle est entièrement blanche.
// =====================================================================
// Siège 0 = Noir, siège 1 = Blanc — sauf si le second joueur a échangé les couleurs.
const colorOf = (st, p) => ((p === 0) !== !!st.swapped ? 1 : 0);
export const duelColorOf = colorOf;
// Une table « neutre » : aucune combinaison n'est à moins de `m` coups d'être unie.
function duelSetupOk(table, d) {
  if (d.setup === 'random') return !duelWins(table, 1, d.win) && !duelWins(table, 0, d.win);
  const K = table.length;
  if (d.win === 'line') {
    const lo = d.setup === 'balanced' ? Math.floor(K / 2) : 2;
    if (K < 2 * lo) return !duelWins(table, 1, d.win) && !duelWins(table, 0, d.win);
    for (let b = 0; b < 6; b++) {
      let black = 0;
      for (const v of table) black += (v >> b) & 1;
      if (black < lo || black > K - lo) return false;
    }
    return true;
  }
  if (d.win === 'card') {
    const lo = d.setup === 'balanced' ? 3 : 2;
    return table.every(v => POP[v] >= lo && POP[v] <= 6 - lo);
  }
  return !duelWins(table, 1, d.win) && !duelWins(table, 0, d.win);
}
function duelAndOr(t) {
  let a = 63, o = 0;
  for (const v of t) (a &= v), (o |= v);
  return [a, o];
}
export function duelWins(table, color, win) {
  const [a, o] = duelAndOr(table);
  if (win === 'line') return color ? a !== 0 : o !== 63;
  if (win === 'card') return table.some(v => v === (color ? 63 : 0));
  return color ? a === 63 : o === 0; // 'all'
}
function duelPlace(st, table, slot, val) {
  const t = table.slice();
  t[slot] = st.cfg.duel.op === 'xor' ? t[slot] ^ val : val;
  return t;
}
const Duel = {
  init(st) {
    const d = st.cfg.duel;
    let deck, table;
    do {
      deck = deck64(st.rng);
      table = deck.splice(0, d.slots);
    } while (!duelSetupOk(table, d));
    dealHands(st, deck);
    st.starter = d.start === 'blanc' ? 1 : 0;
    // Handicap : le premier joueur rend des cartes sous la pioche.
    const h = st.hands[st.starter];
    for (let i = 0; i < d.handicap && h.length > 1; i++) deck.unshift(h.pop());
    Object.assign(st, { deck, pub: table.slice(), table, face: table.map(card => ({ card, flip: false })) });
    st.cur = st.starter;
    st.swapped = false;
    st.extra = !!d.double; // le second joueur rejoue à son premier tour
    st.stats = { majority: 0, selfLoss: 0, swaps: 0, blackWin: 0, whiteWin: 0, firstWin: 0, opening: 0 };
  },
  legal(st) {
    const out = [];
    for (const m of cardMoves(st)) for (let slot = 0; slot < st.table.length; slot++) out.push({ ...m, slot });
    if (st.cfg.duel.swap && st.turns === 1 && !st.swapped) out.push({ swap: true });
    return out;
  },
  apply(st, m) {
    const d = st.cfg.duel;
    const p = st.cur;
    if (m.swap) {
      st.swapped = true;
      st.stats.swaps++;
      st.turns++;
      st.cur = nextP(st);
      return;
    }
    removeOne(st.hands[p], m.card);
    st.pub.push(m.card);
    st.table = duelPlace(st, st.table, m.slot, m.val);
    st.face = st.face.slice();
    st.face[m.slot] = d.op === 'xor' ? null : { card: m.card, flip: m.flip };
    draw(st, p);
    st.turns++;
    const me = colorOf(st, p);
    if (duelWins(st.table, me, d.win)) return duelEnd(st, p);
    if (duelWins(st.table, 1 - me, d.win)) {
      st.stats.selfLoss++;
      return duelEnd(st, 1 - p);
    }
    if (allEmpty(st)) {
      let black = 0;
      for (const v of st.table) black += POP[v];
      const white = st.table.length * 6 - black;
      if (d.tiebreak === 'majority' && black !== white) {
        st.stats.majority++;
        const blackSeat = colorOf(st, 0) ? 0 : 1;
        return duelEnd(st, black > white ? blackSeat : 1 - blackSeat);
      }
      st.over = true;
      return;
    }
    if (st.extra && p !== st.starter) st.extra = false;
    else if (st.hands[nextP(st)].length) st.cur = nextP(st); // main vide : on saute son tour
  },
  greedy(st, rng) {
    const ms = Duel.legal(st);
    if (ms[ms.length - 1].swap) return duelSwapDecision(st, rng);
    return duelGreedy(st, rng, ms);
  },
  describe(st, m) {
    if (m.swap) return 'échange les couleurs';
    const verb = st.cfg.duel.op === 'xor' ? 'inverse' : 'pose';
    return `${verb} ${m.val}${m.flip ? ' (retournée)' : ''} sur l'emplacement ${m.slot + 1}`;
  },
  summary(st) {
    const s = st.stats;
    return { majority: s.majority, selfLoss: s.selfLoss, blackWin: s.blackWin, whiteWin: s.whiteWin, firstWin: s.firstWin, opening: s.opening, swaps: s.swaps };
  },
};
// Règle du gâteau : le second joueur garde sa couleur ou prend celle du premier.
// Le Glouton tranche en jouant quelques parties rapides depuis chaque option.
function duelSwapDecision(st, rng) {
  const ms = Duel.legal(st).filter(m => !m.swap);
  let keep = 0, swap = 0;
  const p = st.cur;
  for (let i = 0; i < 12; i++) {
    const w = determinize(st, p, rng);
    const a = clone(w);
    applyMove(a, duelGreedy(a, rng, ms.filter(m => a.hands[p].includes(m.card))));
    const b = clone(w);
    applyMove(b, { swap: true });
    for (const s of [a, b]) {
      let g = 0;
      while (!s.over && g++ < 500) applyMove(s, MODES.duel.greedy(s, rng));
    }
    keep += outcome(a.scores, p);
    swap += outcome(b.scores, p);
  }
  return swap > keep ? { swap: true } : duelGreedy(st, rng, ms);
}
function duelGreedy(st, rng, ms) {
  const d = st.cfg.duel;
  const p = st.cur, me = colorOf(st, p), opp = 1 - me;
  const wins = ms.filter(m => duelWins(duelPlace(st, st.table, m.slot, m.val), me, d.win));
  if (wins.length) return wins[0];
  const uv = unknownVals(st, p);
  const unk = unknownFor(st, p).length || 1;
  const oppHand = st.hands[1 - p].length;
  let best = ms[0], bs = -Infinity;
  for (const m of ms) {
    const t = duelPlace(st, st.table, m.slot, m.val);
    if (duelWins(t, opp, d.win)) continue;
    // Combien de cartes inconnues offriraient la victoire à l'adversaire ?
    let danger = 0;
    for (let w = 0; w < 64; w++) {
      if (!uv[w]) continue;
      for (let k = 0; k < t.length; k++)
        if (duelWins(duelPlace(st, t, k, w), opp, d.win)) {
          danger += uv[w];
          break;
        }
    }
    const pOpp = Math.min(1, (danger * oppHand) / unk);
    const s = duelEval(t, me, d.win) - 40 * pOpp + rnd(rng) * 0.2;
    if (s > bs) (bs = s), (best = m);
  }
  return best;
}
function duelEval(t, color, win) {
  const cnt = v => (color ? POP[v] : 6 - POP[v]);
  if (win === 'line') {
    let s = 0;
    for (let b = 0; b < 6; b++) {
      let mine = 0;
      for (const v of t) if (((v >> b) & 1) === color) mine++;
      const theirs = t.length - mine;
      s += mine * mine - theirs * theirs;
    }
    return s / t.length;
  }
  if (win === 'card') return t.reduce((s, v) => s + cnt(v) ** 3 - (6 - cnt(v)) ** 3, 0) / 36;
  return t.reduce((s, v) => s + cnt(v) - (6 - cnt(v)), 0);
}
function duelEnd(st, winner) {
  st.scores[winner] = 1;
  st.over = true;
  st.stats[colorOf(st, winner) ? 'blackWin' : 'whiteWin'] = 1;
  if (winner === st.starter) st.stats.firstWin = 1;
  if (st.turns <= 2) st.stats.opening = 1;
}

// =====================================================================
// 3. PLIS — chacun joue une carte, la plus forte de la couleur demandée remporte le pli.
// La « couleur » d'une carte = ses n bandes du haut ; le rang = les bandes restantes.
// =====================================================================
const suitOf = (v, s) => (s ? v >> (6 - s) : 0);
function plisKey(v, led, c) {
  const s = c.suitBits;
  const su = suitOf(v, s);
  const T = c.trump === 'high' ? (1 << s) - 1 : 0;
  const trump = c.trump !== 'none' && s > 0 && su === T;
  return (trump ? 2 : su === led ? 1 : 0) * 64 + (c.lowWins ? 63 - v : v);
}
function plisWinner(trick, c) {
  const led = suitOf(trick[0].val, c.suitBits);
  let best = trick[0], bk = -1;
  for (const t of trick) {
    const k = plisKey(t.val, led, c);
    if (k > bk) (bk = k), (best = t);
  }
  return best;
}
function plisDeal(st, starter) {
  const deck = deck64(st.rng);
  dealHands(st, deck);
  Object.assign(st, { deck, pub: [], trick: [], cur: starter, leader: starter });
}
const Plis = {
  init(st) {
    st.round = 0;
    st.tricks = Array(st.n).fill(0);
    st.lastTrick = null;
    plisDeal(st, 0);
    st.stats = { tricks: 0, leaderWins: 0, trumpWins: 0 };
  },
  legal(st) {
    const c = st.cfg.plis;
    const all = cardMoves(st);
    if (!st.trick.length || !c.follow || !c.suitBits) return all;
    const led = suitOf(st.trick[0].val, c.suitBits);
    const f = all.filter(m => suitOf(m.val, c.suitBits) === led);
    return f.length ? f : all;
  },
  apply(st, m) {
    const c = st.cfg.plis;
    const p = st.cur;
    removeOne(st.hands[p], m.card);
    st.pub.push(m.card);
    st.trick = [...st.trick, { p, card: m.card, flip: m.flip, val: m.val }];
    st.turns++;
    if (st.trick.length < st.n) {
      st.cur = nextP(st);
      return;
    }
    const w = plisWinner(st.trick, c);
    const bands = st.trick.reduce((s, t) => s + POP[t.card], 0);
    st.scores[w.p] += { tricks: 1, bands, avoid: -1, avoidBands: -bands }[c.scoring];
    st.tricks[w.p]++;
    st.stats.tricks++;
    if (w.p === st.leader) st.stats.leaderWins++;
    const led = suitOf(st.trick[0].val, c.suitBits);
    if (plisKey(w.val, led, c) >= 128) st.stats.trumpWins++;
    st.lastTrick = { cards: st.trick, winner: w.p };
    st.trick = [];
    st.cur = st.leader = w.p;
    if (allEmpty(st)) {
      st.round++;
      if (st.round >= c.rounds) st.over = true;
      else plisDeal(st, st.round % st.n);
    }
  },
  greedy(st, rng) {
    const c = st.cfg.plis;
    const ms = Plis.legal(st);
    const avoid = c.scoring.startsWith('avoid');
    if (!st.trick.length) {
      const strength = m => plisKey(m.val, suitOf(m.val, c.suitBits), c);
      ms.sort((a, b) => strength(a) - strength(b));
      if (avoid) return ms[0];
      // Une carte « maîtresse » : aucune carte invisible ne peut la battre.
      const unk = unknownFor(st, st.cur);
      const master = ms.filter(m => {
        const led = suitOf(m.val, c.suitBits);
        const k = plisKey(m.val, led, c);
        return !unk.some(u => orients(u, st.cfg).some(f => plisKey(valOf(u, f), led, c) > k));
      });
      return master.length ? master[0] : ms[0];
    }
    const led = suitOf(st.trick[0].val, c.suitBits);
    const cur = plisWinner(st.trick, c);
    const ck = plisKey(cur.val, led, c);
    const key = m => plisKey(m.val, led, c);
    ms.sort((a, b) => key(a) - key(b));
    const winning = ms.filter(m => key(m) > ck);
    const losing = ms.filter(m => key(m) <= ck);
    if (avoid) return losing.length ? losing[losing.length - 1] : ms[ms.length - 1];
    return winning.length ? winning[0] : ms[0];
  },
  describe(st, m) {
    return `joue ${m.val}${m.flip ? ' (retournée)' : ''}`;
  },
  summary(st) {
    const s = st.stats;
    return { tricks: s.tricks, leaderRate: s.tricks ? s.leaderWins / s.tricks : 0, trumpRate: s.tricks ? s.trumpWins / s.tricks : 0 };
  },
};

// =====================================================================
// 4. REGISTRE — un nombre commun R, chaque carte jouée le transforme (XOR, +, …).
// Celui qui amène R dans l'état visé ramasse la pile.
// =====================================================================
export const OPS = {
  xor: (a, b) => a ^ b,
  add: (a, b) => (a + b) & 63,
  sub: (a, b) => (a - b) & 63,
  or: (a, b) => a | b,
  and: (a, b) => a & b,
};
export const CONDS = {
  zero: R => R === 0,
  uniform: R => R === 0 || R === 63,
  palin: R => MIRROR[R] === R,
  single: R => POP[R] === 1,
};
const Registre = {
  init(st) {
    const deck = deck64(st.rng);
    dealHands(st, deck);
    const first = deck.pop();
    Object.assign(st, { deck, pub: [first], R: first, pile: [first] });
    st.stats = { captures: 0, captured: 0 };
  },
  legal(st) {
    return cardMoves(st);
  },
  apply(st, m) {
    const c = st.cfg.registre;
    const p = st.cur;
    removeOne(st.hands[p], m.card);
    st.pub.push(m.card);
    st.pile.push(m.card);
    st.R = OPS[c.op](st.R, m.val);
    st.lastCapture = null;
    if (CONDS[c.cond](st.R)) {
      st.scores[p] += st.pile.length;
      st.stats.captures++;
      st.stats.captured += st.pile.length;
      st.lastCapture = { p, n: st.pile.length, R: st.R };
      st.pile = [];
      if (st.deck.length) {
        const nc = st.deck.pop();
        st.pub.push(nc);
        st.pile = [nc];
        st.R = nc;
      } else st.R = c.op === 'and' ? 63 : 0;
    }
    draw(st, p);
    st.turns++;
    if (allEmpty(st)) st.over = true;
    else st.cur = nextP(st);
  },
  greedy(st, rng) {
    const c = st.cfg.registre;
    const op = OPS[c.op], cond = CONDS[c.cond];
    const ms = cardMoves(st);
    const cap = ms.filter(m => cond(op(st.R, m.val)));
    if (cap.length) return cap[0];
    const uv = unknownVals(st, st.cur);
    let best = ms[0], bs = Infinity;
    for (const m of ms) {
      const R2 = op(st.R, m.val);
      let danger = 0;
      for (let w = 0; w < 64; w++) if (uv[w] && cond(op(R2, w))) danger += uv[w];
      const s = danger + rnd(rng) * 0.5;
      if (s < bs) (bs = s), (best = m);
    }
    return best;
  },
  describe(st, m) {
    const R2 = OPS[st.cfg.registre.op](st.R, m.val);
    return `joue ${m.val}${m.flip ? ' (retournée)' : ''} → R = ${R2} (${bin(R2)})`;
  },
  summary(st) {
    const s = st.stats;
    return { captures: s.captures, captureAvg: s.captures ? s.captured / s.captures : 0 };
  },
};

// =====================================================================
// 5. RAMI BINAIRE — piocher, poser des combinaisons, défausser.
// Combinaisons : « nul » (k cartes dont le XOR vaut 0), famille (même nombre de bandes
// noires), suite (valeurs consécutives).
// =====================================================================
function combos(arr, k, start = 0, acc = [], out = []) {
  if (acc.length === k) {
    out.push(acc.slice());
    return out;
  }
  for (let i = start; i <= arr.length - (k - acc.length); i++) {
    acc.push(arr[i]);
    combos(arr, k, i + 1, acc, out);
    acc.pop();
  }
  return out;
}
export function findMelds(hand, gcfg) {
  const c = gcfg.rami;
  const out = [];
  if (c.nulSize && hand.length >= c.nulSize) {
    for (const cs of combos(hand, c.nulSize)) {
      const opts = cs.map(x => orients(x, gcfg));
      const n = 1 << cs.length;
      for (let mask = 0; mask < n; mask++) {
        let ok = true, x = 0;
        const flips = cs.map((_, i) => {
          const f = !!((mask >> i) & 1);
          if (f && opts[i].length < 2) ok = false;
          return f;
        });
        if (!ok) continue;
        cs.forEach((card, i) => (x ^= valOf(card, flips[i])));
        if (x === 0) {
          out.push({ kind: 'nul', cards: cs, flips, pts: cs.length * c.nulPts });
          break;
        }
      }
    }
  }
  if (c.family) {
    const by = {};
    for (const x of hand) (by[POP[x]] ||= []).push(x);
    for (const k in by)
      if (by[k].length >= c.famMin)
        out.push({ kind: 'fam', cards: by[k], flips: by[k].map(() => false), pts: by[k].length * c.famPts });
  }
  if (c.run) {
    const seen = new Set();
    for (let s = 0; s < 64; s++) {
      const r = longestRun(hand, s, gcfg);
      if (r.cards.length >= c.runMin) {
        const key = r.cards.slice().sort((a, b) => a - b).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ kind: 'run', cards: r.cards, flips: r.flips, pts: r.cards.length * c.runPts });
      }
    }
  }
  return out;
}
function longestRun(hand, s, gcfg) {
  let best = { cards: [], flips: [] };
  const used = new Set();
  const cards = [], flips = [];
  (function dfs(v) {
    if (cards.length > best.cards.length) best = { cards: cards.slice(), flips: flips.slice() };
    if (v > 63) return;
    for (const x of hand) {
      if (used.has(x)) continue;
      for (const f of orients(x, gcfg))
        if (valOf(x, f) === v) {
          used.add(x), cards.push(x), flips.push(f);
          dfs(v + 1);
          used.delete(x), cards.pop(), flips.pop();
        }
    }
  })(s);
  return best;
}
const bestMeld = (hand, cfg) => findMelds(hand, cfg).reduce((b, m) => Math.max(b, m.pts), 0);
const Rami = {
  init(st) {
    const deck = deck64(st.rng);
    dealHands(st, deck);
    const top = deck.pop();
    Object.assign(st, { deck, pub: [top], discard: [top], melds: [], phase: 'draw', taken: -1 });
    st.stats = { nul: 0, fam: 0, run: 0, out: 0 };
  },
  legal(st) {
    const h = st.hands[st.cur];
    if (st.phase === 'draw') {
      const ms = [];
      if (st.deck.length) ms.push({ t: 'deck' });
      if (st.discard.length) ms.push({ t: 'take' });
      return ms;
    }
    if (st.phase === 'meld') return [...findMelds(h, st.cfg).map(meld => ({ t: 'meld', meld })), { t: 'end' }];
    const ds = h.filter(x => x !== st.taken || h.length === 1);
    return ds.map(card => ({ t: 'disc', card }));
  },
  apply(st, m) {
    const c = st.cfg.rami;
    const p = st.cur, h = st.hands[p];
    if (m.t === 'deck') {
      h.push(st.deck.pop());
      st.phase = 'meld';
      st.taken = -1;
    } else if (m.t === 'take') {
      const card = st.discard.pop();
      st.discard = st.discard.slice();
      removeOne(st.pub, card);
      h.push(card);
      st.taken = card;
      st.phase = 'meld';
    } else if (m.t === 'meld') {
      for (const x of m.meld.cards) removeOne(h, x), st.pub.push(x);
      st.melds = [...st.melds, { p, ...m.meld }];
      st.scores[p] += m.meld.pts;
      st.stats[m.meld.kind]++;
      if (!h.length) return ramiEnd(st, p);
    } else if (m.t === 'end') {
      st.phase = 'discard';
    } else {
      removeOne(h, m.card);
      st.discard = [...st.discard, m.card];
      st.pub.push(m.card);
      if (!h.length) return ramiEnd(st, p);
      st.turns++;
      st.phase = 'draw';
      st.cur = nextP(st);
      if (!st.deck.length || st.turns > 600) ramiEnd(st, -1);
    }
    h.sort((a, b) => a - b);
  },
  greedy(st, rng) {
    const ms = Rami.legal(st);
    const h = st.hands[st.cur];
    if (st.phase === 'draw') {
      const take = ms.find(m => m.t === 'take');
      if (take && bestMeld([...h, st.discard[st.discard.length - 1]], st.cfg) > bestMeld(h, st.cfg)) return take;
      return ms.find(m => m.t === 'deck') || take;
    }
    if (st.phase === 'meld') {
      let best = ms[ms.length - 1];
      for (const m of ms) if (m.t === 'meld' && (best.t === 'end' || m.meld.pts > best.meld.pts)) best = m;
      return best;
    }
    let best = ms[0], bs = Infinity;
    for (const m of ms) {
      const s = ramiPotential(st, m.card, h) + rnd(rng) * 0.1;
      if (s < bs) (bs = s), (best = m);
    }
    return best;
  },
  describe(st, m) {
    if (m.t === 'deck') return 'pioche';
    if (m.t === 'take') return `prend ${st.discard[st.discard.length - 1]} dans la défausse`;
    if (m.t === 'end') return null;
    if (m.t === 'disc') return `défausse ${m.card}`;
    return `pose ${MELD_NAMES[m.meld.kind]} ${meldLabel(m.meld)} (+${m.meld.pts})`;
  },
  summary(st) {
    const s = st.stats;
    return { nul: s.nul, fam: s.fam, run: s.run, out: s.out };
  },
};
export const MELD_NAMES = { nul: 'un nul', fam: 'une famille', run: 'une suite' };
export const meldLabel = meld => meld.cards.map((x, i) => valOf(x, meld.flips[i]) + (meld.flips[i] ? '↻' : '')).join(' · ');
function ramiPotential(st, card, hand) {
  const c = st.cfg.rami;
  const others = hand.filter(x => x !== card);
  const pubSet = new Set(st.pub);
  let s = 0;
  if (c.nulSize === 3)
    for (const b of others)
      for (const f of orients(card, st.cfg))
        for (const g of orients(b, st.cfg)) {
          const need = valOf(card, f) ^ valOf(b, g);
          if (need && !pubSet.has(need) && !pubSet.has(MIRROR[need])) s += 0.5 * c.nulPts;
        }
  if (c.family) s += others.filter(x => POP[x] === POP[card]).length * c.famPts;
  if (c.run)
    for (const b of others)
      for (const f of orients(card, st.cfg))
        for (const g of orients(b, st.cfg)) {
          const d = Math.abs(valOf(card, f) - valOf(b, g));
          if (d === 1) s += 1.2 * c.runPts;
          else if (d === 2) s += 0.5 * c.runPts;
        }
  return s;
}
function ramiEnd(st, outP) {
  const c = st.cfg.rami;
  if (outP >= 0) {
    st.scores[outP] += c.outBonus;
    st.stats.out = 1;
  }
  for (let p = 0; p < st.n; p++) st.scores[p] -= st.hands[p].length * c.handPenalty;
  st.over = true;
}

// =====================================================================
// Interface commune
// =====================================================================
export const MODES = { chevauche: Chevauche, duel: Duel, plis: Plis, registre: Registre, rami: Rami };

export function newGame(cfg, seed) {
  cfg = normalize(cfg);
  const st = { mode: cfg.mode, cfg, n: cfg.players, rng: makeRng(seed), cur: 0, turns: 0, over: false };
  st.scores = Array(st.n).fill(0);
  MODES[cfg.mode].init(st);
  return st;
}
export const legalMoves = st => MODES[st.mode].legal(st);
export const applyMove = (st, m) => MODES[st.mode].apply(st, m);
export const describeMove = (st, m) => MODES[st.mode].describe(st, m);

export function clone(st) {
  const c = {};
  for (const k in st) {
    const v = st[k];
    if (k === 'hands') c[k] = v.map(h => h.slice());
    else if (Array.isArray(v)) c[k] = v.slice();
    else if (v && typeof v === 'object' && k !== 'cfg') c[k] = { ...v };
    else c[k] = v;
  }
  return c;
}

// Redistribue au hasard tout ce que l'observateur ne voit pas (mains adverses, pioche).
export function determinize(st, o, rng) {
  const d = clone(st);
  const pool = shuffle(unknownFor(st, o), rng);
  for (let p = 0; p < st.n; p++) if (p !== o) d.hands[p] = pool.splice(0, st.hands[p].length);
  d.deck = pool.splice(0, st.deck.length);
  d.rng = makeRng(Math.floor(rnd(rng) * 2 ** 32));
  return d;
}

export const LEVELS = { random: 'Hasard', greedy: 'Glouton', expert: 'Expert' };

export function chooseMove(st, level, rng, rollouts = 16) {
  const ms = legalMoves(st);
  if (ms.length === 1) return ms[0];
  if (level === 'random') return pick(ms, rng);
  if (level === 'greedy') return MODES[st.mode].greedy(st, rng);
  return expertMove(st, ms, rng, rollouts);
}

// Monte-Carlo à information imparfaite : on tire des mondes possibles compatibles avec ce
// que voit le joueur, on y essaie chaque coup, puis on termine la partie en mode glouton.
function expertMove(st, ms, rng, rollouts) {
  const p = st.cur;
  const tot = new Float64Array(ms.length);
  const iters = Math.max(2, Math.round(rollouts));
  for (let i = 0; i < iters; i++) {
    const world = determinize(st, p, rng);
    for (let j = 0; j < ms.length; j++) {
      const s = clone(world);
      s.rng = { ...world.rng };
      applyMove(s, ms[j]);
      let guard = 0;
      while (!s.over && guard++ < 2000) applyMove(s, MODES[s.mode].greedy(s, rng));
      tot[j] += outcome(s.scores, p);
    }
  }
  let bj = 0;
  for (let j = 1; j < ms.length; j++) if (tot[j] > tot[bj]) bj = j;
  return ms[bj];
}
function outcome(scores, p) {
  let bo = -Infinity;
  scores.forEach((s, i) => i !== p && (bo = Math.max(bo, s)));
  const my = scores[p];
  return (my > bo ? 1 : my === bo ? 0.5 : 0) + 0.02 * (my - bo);
}

export function winners(st) {
  const m = Math.max(...st.scores);
  const w = [];
  st.scores.forEach((s, i) => s === m && w.push(i));
  if (st.mode === 'duel' && st.scores[0] === st.scores[1]) return [0, 1];
  return w;
}

// Joue une partie complète sans interface. seats = niveaux d'IA par siège.
export function playGame(cfg, seats, seed, rollouts = 16) {
  const st = newGame(cfg, seed);
  const ai = makeRng(seed ^ 0x9e3779b9);
  let guard = 0;
  while (!st.over && guard++ < 5000) applyMove(st, chooseMove(st, seats[st.cur], ai, rollouts));
  return { scores: st.scores.slice(), winners: winners(st), length: st.turns, extra: MODES[st.mode].summary(st) };
}

// Libellés des statistiques propres à chaque jeu (moyenne par partie, ou taux si rate).
export const EXTRA_LABELS = {
  chevauche: { columns: ['Colonnes fermées', 0], full: ['Colonnes complétées (63)', 0], passes: ['Passes', 0], pileAvg: ['Taille moyenne d’une colonne', 0] },
  duel: { blackWin: ['Victoires de la couleur Noir', 1], whiteWin: ['Victoires de la couleur Blanc', 1], firstWin: ['Victoires du premier joueur', 1], opening: ['Gagnées en 2 coups ou moins', 1], swaps: ['Couleurs échangées', 1], majority: ['Décidées à la majorité', 1], selfLoss: ['Perdues par coup suicidaire', 1] },
  plis: { tricks: ['Plis joués', 0], leaderRate: ['Plis gagnés par l’entameur', 1], trumpRate: ['Plis gagnés à l’atout', 1] },
  registre: { captures: ['Captures', 0], captureAvg: ['Cartes par capture', 0] },
  rami: { nul: ['Nuls posés', 0], fam: ['Familles posées', 0], run: ['Suites posées', 0], out: ['Parties finies par une main vide', 1] },
};

// ---------- Texte des règles, généré depuis la configuration ----------
export function rulesText(cfg) {
  cfg = normalize(cfg);
  const flip = cfg.flip
    ? 'Une carte peut être jouée retournée (180°) : ses bandes se lisent alors en miroir (ex. 1 → 32, 3 → 48).'
    : 'Les cartes se jouent toujours à l’endroit.';
  const deal = `${cfg.players} joueurs, ${cfg.hand} cartes en main.`;
  const T = {
    chevauche: () => {
      const c = cfg.chevauche;
      return [
        deal,
        'On empile les cartes sur une colonne commune. Une carte n’est posable que si aucune de ses bandes noires ne recouvre une bande déjà noire de la colonne (carte ET colonne = 0).',
        `La colonne se ferme quand ses 6 bandes sont noires : celui qui la complète la ramasse${c.fullBonus ? ` et marque ${c.fullBonus} points de bonus` : ''}. Si tout le monde passe à la suite, le dernier à avoir posé la ramasse.`,
        c.blocked === 'draw' ? 'Un joueur qui ne peut rien poser pioche une carte et passe.' : 'Un joueur qui ne peut rien poser passe.',
        c.refill ? 'Après avoir posé, on complète sa main d’une carte.' : 'On ne repioche pas après avoir posé.',
        `Une colonne ramassée vaut ${c.points === 'cards' ? 'un point par carte' : '1 point'}. La partie s’arrête quand la pioche et les mains sont vides.`,
        flip,
      ];
    },
    duel: () => {
      const c = cfg.duel;
      const goal = {
        line: 'une même bande sur toutes les cartes de la table (une ligne horizontale)',
        card: 'une carte entière de la table',
        all: 'toutes les cartes de la table',
      }[c.win];
      return [
        `2 joueurs : Noir contre Blanc, ${cfg.hand} cartes en main. ${c.slots} cartes sont posées sur la table.`,
        c.op === 'xor'
          ? 'À son tour, on joue une carte sur un emplacement : chaque bande noire de la carte inverse la bande correspondante (XOR). La carte jouée est défaussée.'
          : 'À son tour, on pose une carte de sa main sur un emplacement, qui remplace la carte qui s’y trouvait.',
        {
          random: 'Les cartes de départ sont tirées au hasard (sans victoire immédiate).',
          neutral: 'Table de départ neutre : chaque bande est noire sur au moins 2 cartes et blanche sur au moins 2 cartes.',
          balanced: 'Table de départ équilibrée : chaque bande est noire sur la moitié des cartes exactement.',
        }[c.setup],
        `Noir gagne quand ${goal} est entièrement noire, Blanc dès qu’elle est entièrement blanche. Si un coup réalise les deux, le joueur qui l’a joué gagne ; s’il ne réalise que l’objectif adverse, il perd.`,
        `${c.start === 'blanc' ? 'Blanc' : 'Noir'} commence${c.handicap ? ` avec ${c.handicap} carte${c.handicap > 1 ? 's' : ''} de moins en main` : ''}. On repioche après chaque coup.`,
        ...(c.swap ? ['Règle du gâteau : au lieu de jouer son premier coup, le second joueur peut échanger les couleurs.'] : []),
        ...(c.double ? ['Le second joueur joue deux cartes à son premier tour.'] : []),
        c.tiebreak === 'majority' ? 'Mains vides : la couleur majoritaire sur la table l’emporte (égalité = nulle).' : 'Mains vides : partie nulle.',
        flip,
      ];
    },
    plis: () => {
      const c = cfg.plis;
      const suit = c.suitBits
        ? `La « couleur » d’une carte est donnée par ses ${c.suitBits} bande${c.suitBits > 1 ? 's' : ''} du haut (${1 << c.suitBits} couleurs de ${64 >> c.suitBits} cartes).`
        : 'Il n’y a pas de couleurs : seule la valeur compte.';
      const sc = { tricks: '1 point par pli', bands: '1 point par bande noire dans le pli', avoid: '−1 point par pli', avoidBands: '−1 point par bande noire dans le pli' }[c.scoring];
      return [
        deal,
        suit,
        c.suitBits && c.follow ? 'On doit fournir la couleur demandée si on le peut.' : 'On joue la carte qu’on veut.',
        `Le pli est remporté par la ${c.lowWins ? 'plus faible' : 'plus forte'} carte de la couleur demandée${c.trump !== 'none' && c.suitBits ? `, ou par l’atout (${c.trump === 'high' ? 'la couleur aux bandes du haut toutes noires' : 'la couleur aux bandes du haut toutes blanches'})` : ''}. Le gagnant entame le pli suivant.`,
        `Score : ${sc}. ${c.rounds > 1 ? `${c.rounds} manches, une nouvelle donne à chaque fois.` : 'Une seule manche.'}`,
        flip,
      ];
    },
    registre: () => {
      const c = cfg.registre;
      const op = { xor: 'XOR (chaque bande noire inverse la bande de R)', add: 'addition modulo 64', sub: 'soustraction modulo 64', or: 'OU (les bandes noires s’ajoutent)', and: 'ET (seules les bandes noires communes restent)' }[c.op];
      const cond = { zero: 'vaut 0 (tout blanc)', uniform: 'est uniforme (0 ou 63)', palin: 'est un palindrome (identique à son miroir)', single: 'n’a qu’une seule bande noire' }[c.cond];
      return [
        deal,
        `Une carte est retournée au centre : c’est le registre R. Chaque carte jouée transforme R par ${op}.`,
        `Celui qui joue une carte après laquelle R ${cond} ramasse la pile (1 point par carte). Une nouvelle carte de la pioche relance le registre.`,
        'On repioche après chaque coup ; la partie s’arrête quand les mains sont vides.',
        flip,
      ];
    },
    rami: () => {
      const c = cfg.rami;
      const kinds = [];
      if (c.nulSize) kinds.push(`nul : ${c.nulSize} cartes dont le XOR vaut 0 (${c.nulPts} pt/carte)`);
      if (c.family) kinds.push(`famille : au moins ${c.famMin} cartes avec le même nombre de bandes noires (${c.famPts} pt/carte)`);
      if (c.run) kinds.push(`suite : au moins ${c.runMin} valeurs consécutives (${c.runPts} pt/carte)`);
      return [
        deal,
        'À son tour : piocher (pioche ou dessus de la défausse), poser autant de combinaisons qu’on veut, puis défausser une carte (pas celle qu’on vient de prendre dans la défausse).',
        'Combinaisons — ' + (kinds.join(' ; ') || 'aucune activée') + '.',
        `Vider sa main rapporte ${c.outBonus} points et termine la partie ; elle s’arrête aussi quand la pioche est vide. Chaque carte restant en main coûte ${c.handPenalty} point.`,
        flip,
      ];
    },
  };
  return T[cfg.mode]();
}
