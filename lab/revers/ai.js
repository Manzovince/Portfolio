// Bot de REVERS : choix de pioche heuristique, puis action gloutonne sur une évaluation.
// Le bot ne triche pas sur les Blasons : une frappe sur un Blason caché inconnu est évaluée
// comme une moyenne 50/50 (Souverain ou Ombre). Les cartes cachées inconnues valent une moyenne.
import {
  CARDS, REMPART, clone, apply, legalActions, flipOptions, drawOptions, climat,
  canStrikeFrom, strikeTarget, doDraw, attackValue, defenseValue, DIRS, isBlason, souvId, ombreId, blasonCells,
} from './engine.js?v=1';

export const LEVELS = { facile: { noise: 2.5, greedyDraw: false }, normal: { noise: 0.05, greedyDraw: true }, fort: { noise: 0.05, greedyDraw: true, look: 10 } };

export function cardValue(id) {
  const c = CARDS[id];
  if (c.kind === 'spec') return { eclaireur: 2.4, brume: 1.9, bastion: 4.4, cavalier: 3.8 }[c.spec];
  if (c.kind !== 'unit') return 0;
  return c.f + 0.35 * (c.nw + c.n + c.ne) + 0.2 * (c.l + c.r);
}
const AVG = (() => { let t = 0; for (let i = 0; i < 48; i++) t += cardValue(i); return t / 48; })();

// Frappes réussies possibles du joueur x (selon le climat courant).
function threats(s, x) {
  const out = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    if (!canStrikeFrom(s, x, r, c)) continue;
    for (const d of DIRS) {
      const tg = strikeTarget(s, x, r, c, d);
      if (tg && attackValue(s, x, r, c) >= defenseValue(s, 1 - x, tg.r, tg.c)) out.push(tg);
    }
  }
  return out;
}

export function evaluate(s, p) {
  if (s.winner !== null) return s.winner === p ? 1e6 : s.winner === 'nul' ? 0 : -1e6;
  const q = 1 - p;
  let score = 0;
  for (const x of [p, q]) {
    const sign = x === p ? 1 : -1;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
      const cell = s.P[x].b[r][c];
      if (!cell || isBlason(cell.id)) continue;
      const known = x === p || !cell.h || s.know[p][cell.id];
      let v = known ? cardValue(cell.id) : AVG;
      if (cell.h) v = v * 0.85 + REMPART[CARDS[cell.id].t] * 0.2;
      score += sign * (v + (r === 0 ? 0.15 : 0));
    }
    if (x === p) for (const id of s.P[p].hand) score += 0.7 * cardValue(id);
    else score -= 0.7 * AVG * s.P[q].hand.length;
  }

  // Ce que l'adversaire pourra faire (il joue après nous).
  const tq = threats(s, q);
  let worst = 0, sum = 0;
  for (const tg of tq) {
    const cell = s.P[p].b[tg.r][tg.c], c = CARDS[cell.id];
    let v;
    if (c.kind === 'souv') v = cell.h ? 4 : 50000;
    else if (c.kind === 'ombre') v = -1.5; // bon appât
    else v = cardValue(cell.id) * 1.4;
    worst = Math.max(worst, v); sum += Math.max(0, v);
  }
  score -= worst + 0.15 * sum;

  // Ce que nous pourrons faire au prochain tour.
  const tp = threats(s, p);
  let best = 0;
  for (const tg of tp) {
    const cell = s.P[q].b[tg.r][tg.c], c = CARDS[cell.id];
    let v;
    if (isBlason(cell.id)) {
      const known = !cell.h || s.know[p][cell.id];
      if (!known) v = 2.5;
      else v = c.kind === 'souv' ? (cell.h ? 6 : 25) : -1;
    } else v = cardValue(cell.id) * 0.35;
    best = Math.max(best, v);
  }
  score += best;

  // Sécurité des Souverains.
  for (const x of [p, q]) {
    const sign = x === p ? 1 : -1;
    const sc = blasonCells(s, x).find(b => b.cell.id === souvId(x));
    if (!sc) continue;
    const knownToEnemy = x === p ? (!sc.cell.h || s.know[q][souvId(p)]) : (!sc.cell.h || s.know[p][souvId(q)]);
    if (!sc.cell.h) score -= sign * 5;
    else if (knownToEnemy) score -= sign * 1.5;
    if (!s.P[x].b[0][sc.c] && sc.r === 1) score -= sign * (x === p ? 1.2 : 0.6);
  }
  return score;
}

export function chooseDraw(s, level = 'normal', rng = Math.random) {
  const opts = drawOptions(s);
  if (!opts.length) return null;
  const L = LEVELS[level];
  let best = null, bv = -Infinity;
  for (const o of opts) {
    const v = o.t === 'take' ? cardValue(s.market[o.i]) : AVG + 0.15;
    const n = v + (L.greedyDraw ? rng() * 0.1 : rng() * L.noise);
    if (n > bv) { bv = n; best = o; }
  }
  return best;
}

// Évaluation d'un plan [flip?, action] du point de vue du joueur courant, sans tricher sur les Blasons.
function scorePlan(s, plan, p) {
  const main = plan[plan.length - 1];
  const run = st => { const t = clone(st); for (const a of plan) { if (t.winner !== null) break; apply(t, a); } return evaluate(t, p); };
  if (main.t === 'strike') {
    const q = 1 - p, cell = s.P[q].b[main.tr][main.tc];
    if (cell && cell.h && isBlason(cell.id) && !s.know[p][cell.id]) {
      const bl = blasonCells(s, q);
      const v1 = run(s);
      if (bl.length === 2 && bl.every(b => b.cell.h)) {
        const alt = clone(s);
        const A = alt.P[q].b[bl[0].r][bl[0].c], B = alt.P[q].b[bl[1].r][bl[1].c];
        const t = A.id; A.id = B.id; B.id = t;
        return 0.5 * v1 + 0.5 * run(alt);
      }
      return v1;
    }
  }
  return run(s);
}

export function chooseAction(s, level = 'normal', rng = Math.random) {
  const p = s.cur, L = LEVELS[level];
  const plans = legalActions(s).map(a => [a]);
  for (const f of flipOptions(s)) {
    plans.push([f, { t: 'pass' }]);
    const t = clone(s); apply(t, f);
    for (const a of legalActions(t)) if (a.t === 'strike' && a.r === f.r && a.c === f.c) plans.push([f, a]);
  }
  let best = plans[plans.length - 1], bv = -Infinity;
  const scored = [];
  for (const plan of plans) {
    const v = scorePlan(s, plan, p) + rng() * L.noise;
    scored.push([v, plan]);
    if (v > bv) { bv = v; best = plan; }
  }
  if (!L.look) return best;
  // Niveau fort : on rejoue les meilleurs plans en supposant la pire riposte adverse
  // composée uniquement d'informations publiques (frappes de ses unités visibles, Élan compris).
  scored.sort((a, b) => b[0] - a[0]);
  bv = -Infinity;
  for (const [v0, plan] of scored.slice(0, L.look)) {
    const t = clone(s);
    for (const a of plan) { if (t.winner !== null) break; apply(t, a); }
    let v = v0;
    if (t.winner === null && t.cur !== p) v = Math.min(v0, worstReply(t, p, 2));
    if (v > bv) { bv = v; best = plan; }
  }
  return best;
}

function worstReply(t, p, depth) {
  const u = clone(t); u.phase = 'act';
  let worst = Infinity;
  for (const a of legalActions(u)) {
    if (a.t !== 'strike' && a.t !== 'stop') continue;
    const w = clone(u); apply(w, a);
    let v;
    if (w.winner !== null) v = evaluate(w, p);
    else if (w.cur === u.cur && w.elan && depth > 1) v = worstReply2(w, p);
    else v = evaluate(w, p);
    if (v < worst) worst = v;
  }
  return worst === Infinity ? evaluate(t, p) : Math.min(worst, evaluate(t, p) + 0);
}
function worstReply2(w, p) {
  let worst = evaluate(w, p);
  for (const a of legalActions(w)) {
    if (a.t !== 'strike') continue;
    const x = clone(w); apply(x, a);
    worst = Math.min(worst, evaluate(x, p));
  }
  return worst;
}

// Joue un tour complet (pioche + actions) — utilisé par la simulation de masse.
export function playTurn(s, level, rng) {
  if (s.phase === 'draw') { const o = chooseDraw(s, level, rng); if (o) doDraw(s, o); else s.phase = 'act'; }
  const p = s.cur, turn = s.turn;
  while (s.winner === null && s.cur === p && s.turn === turn) {
    const plan = chooseAction(s, level, rng);
    for (const a of plan) { if (s.winner !== null || s.cur !== p || s.turn !== turn) break; apply(s, a); }
  }
}
