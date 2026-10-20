'use strict';
/* =====================================================================
   BRUMES — un donjon mystère au tour par tour
   ===================================================================== */

/* ---------- Utilitaires ---------- */
const $ = s => document.querySelector(s);
const rnd = Math.random;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sign = Math.sign;
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
function wpick(table) {
  let s = 0; for (const k in table) s += table[k];
  let r = rnd() * s;
  for (const k in table) { r -= table[k]; if (r <= 0) return k; }
  return Object.keys(table)[0];
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- Données ---------- */
const TYPES = {
  normal: { n: 'Normal', c: '#b3ad98' }, feu: { n: 'Feu', c: '#ee7438' }, eau: { n: 'Eau', c: '#4b97ee' },
  plante: { n: 'Plante', c: '#5cbf55' }, elec: { n: 'Électrik', c: '#f0c93a' }, roche: { n: 'Roche', c: '#b08a58' },
  spectre: { n: 'Spectre', c: '#9a7ce0' },
};
const EFF = {
  normal: { roche: .5, spectre: .5 },
  feu: { plante: 2, eau: .5, roche: .5, feu: .5 },
  eau: { feu: 2, roche: 2, plante: .5, eau: .5 },
  plante: { eau: 2, roche: 2, feu: .5, plante: .5 },
  elec: { eau: 2, plante: .5, elec: .5, roche: .5 },
  roche: { feu: 2, elec: 2, plante: .5, roche: .5 },
  spectre: { spectre: 2, normal: .5 },
};
const eff = (a, d) => (EFF[a] && EFF[a][d]) || 1;

// tg : front (devant), line (projectile), around (8 cases), room (toute la salle), self
const MOVES = {
  attaque: { n: 'Attaque', t: 'normal', p: 5, acc: .92, pp: 0, tg: 'front' },
  charge: { n: 'Charge', t: 'normal', p: 7, acc: .95, pp: 25, tg: 'front' },
  griffe: { n: 'Griffe', t: 'normal', p: 8, acc: .95, pp: 25, tg: 'front' },
  morsure: { n: 'Morsure', t: 'normal', p: 9, acc: .9, pp: 20, tg: 'front' },
  picpic: { n: 'Picpic', t: 'normal', p: 7, acc: .95, pp: 25, tg: 'front' },
  vivattaque: { n: 'Vive-Attaque', t: 'normal', p: 8, acc: 1, pp: 20, tg: 'front' },
  rugissement: { n: 'Rugissement', t: 'normal', p: 0, acc: 1, pp: 15, tg: 'room', fx: 'atk' },
  regard: { n: "Groz'Yeux", t: 'normal', p: 0, acc: 1, pp: 15, tg: 'room', fx: 'def' },
  recup: { n: 'Récupération', t: 'normal', p: 0, acc: 1, pp: 5, tg: 'self', fx: 'heal' },
  braise: { n: 'Braise', t: 'feu', p: 9, acc: .92, pp: 20, tg: 'line' },
  lanceflammes: { n: 'Lance-Flammes', t: 'feu', p: 13, acc: .88, pp: 10, tg: 'line' },
  pistolet: { n: 'Pistolet à O', t: 'eau', p: 9, acc: .92, pp: 20, tg: 'line' },
  deferlante: { n: 'Déferlante', t: 'eau', p: 10, acc: .9, pp: 8, tg: 'room' },
  fouet: { n: 'Fouet Lianes', t: 'plante', p: 10, acc: .92, pp: 20, tg: 'front' },
  poudre: { n: 'Poudre Dodo', t: 'plante', p: 0, acc: .72, pp: 12, tg: 'front', fx: 'sleep' },
  tranchherbe: { n: "Tranch'Herbe", t: 'plante', p: 11, acc: .9, pp: 12, tg: 'around' },
  eclair: { n: 'Éclair', t: 'elec', p: 9, acc: .92, pp: 20, tg: 'line' },
  tonnerre: { n: 'Tonnerre', t: 'elec', p: 10, acc: .85, pp: 8, tg: 'room' },
  jetpierre: { n: 'Jet-Pierres', t: 'roche', p: 9, acc: .85, pp: 15, tg: 'line' },
  eboulement: { n: 'Éboulement', t: 'roche', p: 9, acc: .85, pp: 10, tg: 'around' },
  lechouille: { n: 'Léchouille', t: 'spectre', p: 8, acc: .95, pp: 20, tg: 'front' },
  ombre: { n: "Ball'Ombre", t: 'spectre', p: 11, acc: .9, pp: 10, tg: 'line' },
  berceuse: { n: 'Berceuse', t: 'normal', p: 0, acc: .55, pp: 8, tg: 'room', fx: 'sleep' },
};
const TG_LABEL = { front: 'devant', line: 'à distance', around: 'autour', room: 'toute la salle', self: 'soi-même' };

const SPECIES = {
  flammeche: { n: 'Flammèche', t: 'feu', shape: 'fox', c1: '#f08a3c', c2: '#ffe3b0', hp: 24, atk: 10, def: 6,
    moves: ['griffe', 'braise', 'rugissement', 'recup'], learn: { 8: 'lanceflammes' }, starter: true,
    desc: 'Renardeau vif. Frappe fort, mais encaisse mal.' },
  goutton: { n: 'Goutton', t: 'eau', shape: 'tadpole', c1: '#4aa3ee', c2: '#dff2ff', hp: 27, atk: 8, def: 8,
    moves: ['charge', 'pistolet', 'regard', 'recup'], learn: { 8: 'deferlante' }, starter: true,
    desc: 'Têtard robuste et calme. Très bon contre la roche.' },
  feuillon: { n: 'Feuillon', t: 'plante', shape: 'sprout', c1: '#74c863', c2: '#f4f0c2', hp: 28, atk: 8, def: 7,
    moves: ['charge', 'fouet', 'poudre', 'recup'], learn: { 8: 'tranchherbe' }, starter: true,
    desc: 'Pousse joyeuse qui endort ses ennemis.' },
  voltine: { n: 'Voltine', t: 'elec', shape: 'mouse', c1: '#f4d03c', c2: '#fff4c8', hp: 22, atk: 11, def: 5,
    moves: ['vivattaque', 'eclair', 'regard', 'recup'], learn: { 8: 'tonnerre' }, starter: true,
    desc: 'Souris électrique : puissante mais fragile.' },
  rongeot: { n: 'Rongeot', t: 'normal', shape: 'rat', c1: '#9a7aa8', c2: '#e6d8e8', hp: 15, atk: 7, def: 5, moves: ['charge', 'morsure', 'rugissement'] },
  piafou: { n: 'Piafou', t: 'normal', shape: 'bird', c1: '#b08a5e', c2: '#f2e2c4', hp: 14, atk: 8, def: 4, moves: ['picpic', 'rugissement'] },
  mousseron: { n: 'Mousseron', t: 'plante', shape: 'mushroom', c1: '#d8443c', c2: '#f4e8cc', hp: 17, atk: 6, def: 6, moves: ['charge', 'poudre', 'fouet'] },
  bulleau: { n: 'Bulleau', t: 'eau', shape: 'slime', c1: '#56b0e8', c2: '#c8ecff', hp: 16, atk: 7, def: 6, moves: ['charge', 'pistolet'] },
  caillou: { n: 'Caillou', t: 'roche', shape: 'rock', c1: '#8f8a82', c2: '#c9c3b6', hp: 18, atk: 8, def: 9, moves: ['charge', 'jetpierre', 'eboulement'] },
  brasillon: { n: 'Brasillon', t: 'feu', shape: 'ember', c1: '#ee5a2c', c2: '#ffd25a', hp: 16, atk: 9, def: 5, moves: ['griffe', 'braise'] },
  etincelot: { n: 'Étincelot', t: 'elec', shape: 'wisp', c1: '#f6dc4a', c2: '#fff7c0', hp: 15, atk: 9, def: 5, moves: ['vivattaque', 'eclair'] },
  spectrelin: { n: 'Spectrelin', t: 'spectre', shape: 'ghost', c1: '#8a6cd2', c2: '#e8dcff', hp: 17, atk: 9, def: 6, moves: ['lechouille', 'berceuse', 'ombre'] },
  golemon: { n: 'Golemon', t: 'roche', shape: 'golem', c1: '#7a6a5c', c2: '#ff5a3a', hp: 44, atk: 11, def: 10,
    moves: ['eboulement', 'jetpierre', 'rugissement'], boss: true, big: 1.55 },
};
for (const s of Object.values(SPECIES)) { s.d1 = shade(s.c1, -.32); s.l1 = shade(s.c1, .35); }
const STARTERS = Object.keys(SPECIES).filter(k => SPECIES[k].starter);

const POOLS = [
  { upTo: 3, sp: { rongeot: 4, piafou: 3, mousseron: 2, bulleau: 2 } },
  { upTo: 6, sp: { piafou: 2, caillou: 3, brasillon: 3, bulleau: 2, mousseron: 2, rongeot: 1 } },
  { upTo: 9, sp: { caillou: 2, brasillon: 2, etincelot: 3, spectrelin: 3, bulleau: 1 } },
];
const BIOMES = [
  { upTo: 3, n: 'Bois Brumeux', fa: '#86a35c', fb: '#7f9c56', wt: '#2f5735', wf: '#203f27', wl: '#4d7e4a', void: '#0e1b12', deco: 'grass' },
  { upTo: 6, n: 'Grotte Ocre', fa: '#b8956a', fb: '#af8c61', wt: '#5c4130', wf: '#3f2c20', wl: '#7d5c44', void: '#1a120c', deco: 'pebble' },
  { upTo: 9, n: 'Caverne Cristal', fa: '#6a78a4', fb: '#63709c', wt: '#2b3566', wf: '#1c2348', wl: '#4b5aa0', void: '#0b0e20', deco: 'crystal' },
  { upTo: 10, n: 'Cœur du Volcan', fa: '#6e4a44', fb: '#67443e', wt: '#2e1a18', wf: '#1e100f', wl: '#5a2c22', void: '#0d0605', deco: 'ember' },
];

const ITEMS = {
  oran: { n: 'Baie Oran', d: 'Restaure 40 PV à un membre de l’équipe.', tgt: true },
  pomme: { n: 'Pomme', d: 'Remplit le Ventre de 50.' },
  gpomme: { n: 'Grosse Pomme', d: 'Remplit totalement le Ventre.' },
  elixir: { n: 'Élixir', d: 'Rend 10 PP à chaque capacité de toute l’équipe.' },
  gexplo: { n: 'Graine Explosive', d: 'Explose : 25 dégâts à chaque ennemi adjacent.' },
  epine: { n: 'Épine de Fer', d: 'Se lance droit devant : 12 dégâts au premier ennemi.', stack: true, thr: true },
  osommeil: { n: 'Orbe Sommeil', d: 'Endort tous les ennemis de la salle.' },
  otp: { n: 'Orbe Téléport', d: 'Téléporte le chef ailleurs dans l’étage.' },
  ocarte: { n: 'Orbe Lumière', d: 'Révèle le plan de l’étage et l’escalier.' },
  gvie: { n: 'Graine Vie', d: 'S’active seule : ranime le chef s’il tombe K.O.' },
  ecus: { n: 'Écus', d: 'De l’argent.' },
};
const ITEM_W = { oran: 24, pomme: 13, gpomme: 3, elixir: 7, gexplo: 8, epine: 9, osommeil: 5, otp: 4, ocarte: 5, gvie: 3, ecus: 18 };
const TRAPS = {
  pics: { n: 'Piège à Pics', c: '#d0d4dc' }, tp: { n: 'Piège Téléport', c: '#3ccfb0' },
  sommeil: { n: 'Piège Sommeil', c: '#a68cf0' }, faim: { n: 'Piège Glouton', c: '#e0a030' },
};

/* ---------- État ---------- */
const W = 56, H = 40, MAXF = 10, INV_MAX = 16;
const SAVE = 'brumes_run_v1', BEST = 'brumes_best_v1';
let G = null;          // l’expédition (équipe, sac, étage…)
let F = null;          // l’étage courant
let ents = [];         // créatures présentes à l’étage
let dying = [], projs = [], floats = [];
let uid = 0, state = 'title', lockUntil = 0, flashFx = null;
let muted = false, miniBig = false;
const distCache = new Map();
const leader = () => G.team[0];

/* ---------- Créatures ---------- */
function calcStats(e) {
  const s = SPECIES[e.sp], L = e.lvl - 1;
  e.maxHp = Math.round(s.hp * (1 + L * .14));
  e.atk = s.atk * (1 + L * .1);
  e.def = s.def * (1 + L * .1);
}
function makeCreature(sp, lvl, team) {
  const s = SPECIES[sp];
  const e = {
    id: ++uid, sp, name: s.n, lvl, xp: 0, team, x: 0, y: 0, rx: 0, ry: 0, dir: { x: 0, y: 1 },
    status: { sleep: 0, atk: 0, def: 0 }, lunge: 0, flash: 0, alpha: 1, boss: !!s.boss,
    moves: s.moves.map(id => ({ id, pp: MOVES[id].pp, max: MOVES[id].pp })),
  };
  if (s.learn) for (const l in s.learn) if (lvl >= +l) learnMove(e, s.learn[l], true);
  calcStats(e); e.hp = e.maxHp;
  return e;
}
function learnMove(e, id, silent) {
  if (e.moves.some(m => m.id === id)) return;
  const mv = { id, pp: MOVES[id].pp, max: MOVES[id].pp };
  if (e.moves.length < 4) { e.moves.push(mv); if (!silent) say(`${nm(e)} apprend ${MOVES[id].n} !`, 'good'); return; }
  let wi = 0, wp = 99;
  e.moves.forEach((m, i) => { const p = MOVES[m.id].p; if (p > 0 && p < wp) { wp = p; wi = i; } });
  const old = MOVES[e.moves[wi].id].n;
  e.moves[wi] = mv;
  if (!silent) say(`${nm(e)} oublie ${old} et apprend ${MOVES[id].n} !`, 'good');
}
const xpNeed = l => 10 + l * 7;
const xpYield = (t, a) => Math.max(1, Math.round((5 + t.lvl * 3) * clamp(1 + (t.lvl - a.lvl) * .12, .35, 2) * (t.boss ? 4 : 1)));
function gainXp(a, n) {
  a.xp += n;
  while (a.xp >= xpNeed(a.lvl)) {
    a.xp -= xpNeed(a.lvl);
    const oh = a.maxHp; a.lvl++; calcStats(a);
    a.hp = Math.min(a.maxHp, a.hp + (a.maxHp - oh));
    say(`${nm(a)} passe au niveau ${a.lvl} !`, 'good');
    floatT(a, 'Nv +1', '#9fe870'); sfx('lvl');
    const l = SPECIES[a.sp].learn;
    if (l && l[a.lvl]) learnMove(a, l[a.lvl]);
  }
}
const nm = e => `<span class="${e.team === 'ally' ? 'a' : 'w'}">${e.name}</span>`;
function poolFor(d) { return (POOLS.find(p => d <= p.upTo) || POOLS[POOLS.length - 1]).sp; }
function makeWild() { return makeCreature(wpick(poolFor(F.depth)), Math.max(1, F.depth + ri(0, 2)), 'wild'); }

/* ---------- Génération d’étage ---------- */
function genLayout(depth) {
  const tiles = new Uint8Array(W * H), roomOf = new Int16Array(W * H).fill(-1), rooms = [];
  const fillRoom = r => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { tiles[y * W + x] = 1; roomOf[y * W + x] = r.id; } };
  if (depth === MAXF) { const r = { x: 16, y: 10, w: 24, h: 17, id: 0 }; rooms.push(r); fillRoom(r); return { tiles, roomOf, rooms }; }

  const cols = 4, rows = 3, cw = Math.floor((W - 2) / cols), ch = Math.floor((H - 2) / rows);
  const cells = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x0 = 1 + i * cw, y0 = 1 + j * ch;
    if (rnd() < .75) {
      const w = ri(4, cw - 3), h = ri(4, ch - 3);
      const r = { x: x0 + ri(1, cw - w - 2), y: y0 + ri(1, ch - h - 2), w, h, id: rooms.length };
      rooms.push(r); cells.push(r);
    } else cells.push({ x: x0 + ri(2, cw - 3), y: y0 + ri(2, ch - 3), w: 1, h: 1, id: -1 });
  }
  if (rooms.length < 4) return genLayout(depth);
  rooms.forEach(fillRoom);

  // arbre couvrant aléatoire + quelques boucles
  const idx = (i, j) => j * cols + i, seen = new Set([0]), stack = [0], edges = [];
  while (stack.length) {
    const c = stack[stack.length - 1], i = c % cols, j = (c / cols) | 0;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b])
      .filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rows && !seen.has(idx(a, b)));
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = pick(nb), n = idx(a, b);
    seen.add(n); edges.push([c, n]); stack.push(n);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (i < cols - 1 && rnd() < .2) edges.push([idx(i, j), idx(i + 1, j)]);
    if (j < rows - 1 && rnd() < .2) edges.push([idx(i, j), idx(i, j + 1)]);
  }
  const carve = (x, y) => { tiles[y * W + x] = 1; };
  const hline = (xa, xb, y) => { for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) carve(x, y); };
  const vline = (ya, yb, x) => { for (let y = Math.min(ya, yb); y <= Math.max(ya, yb); y++) carve(x, y); };
  const ptIn = c => ({ x: c.w > 2 ? ri(c.x + 1, c.x + c.w - 2) : c.x, y: c.h > 2 ? ri(c.y + 1, c.y + c.h - 2) : c.y });
  for (const [a, b] of edges) {
    const p = ptIn(cells[a]), q = ptIn(cells[b]);
    if (rnd() < .5) { hline(p.x, q.x, p.y); vline(p.y, q.y, q.x); } else { vline(p.y, q.y, p.x); hline(p.x, q.x, q.y); }
  }
  return { tiles, roomOf, rooms };
}

const isFloor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && F.tiles[y * W + x] === 1;
function canStep(x, y, dx, dy) {
  if (!isFloor(x + dx, y + dy)) return false;
  if (dx && dy && (!isFloor(x + dx, y) || !isFloor(x, y + dy))) return false;
  return true;
}
const canHit = (e, dx, dy) => (dx || dy) && canStep(e.x, e.y, dx, dy);
const entAt = (x, y) => ents.find(e => e.x === x && e.y === y);
const itemAt = (x, y) => F.items.find(i => i.x === x && i.y === y);
const onStairs = () => F.stairs && leader().x === F.stairs.x && leader().y === F.stairs.y;

function freeTileIn(r, avoidItems) {
  for (let k = 0; k < 60; k++) {
    const x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1);
    if (entAt(x, y)) continue;
    if (F.stairs && F.stairs.x === x && F.stairs.y === y) continue;
    if (avoidItems && (itemAt(x, y) || F.traps.some(t => t.x === x && t.y === y))) continue;
    return { x, y };
  }
  return null;
}
function findFreeNear(x, y) {
  const seen = new Set([y * W + x]), q = [[x, y]];
  while (q.length) {
    const [cx, cy] = q.shift();
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy, k = ny * W + nx;
      if (seen.has(k) || !isFloor(nx, ny)) continue;
      seen.add(k);
      if (!entAt(nx, ny) && !(F.stairs && F.stairs.x === nx && F.stairs.y === ny)) return { x: nx, y: ny };
      q.push([nx, ny]);
    }
  }
  return { x, y };
}
function place(e, p) { e.x = e.rx = p.x; e.y = e.ry = p.y; }
function randItemKind() { return wpick(ITEM_W); }
function newItem(x, y, k = randItemKind()) {
  const n = k === 'ecus' ? ri(8, 20) * F.depth : k === 'epine' ? ri(3, 7) : 1;
  return { x, y, k, n };
}

function buildFloor(depth) {
  const lay = genLayout(depth);
  F = {
    depth, ...lay, items: [], traps: [], stairs: null, turn: 0, spawnT: 0, mh: -1, mhDone: false,
    explored: new Uint8Array(W * H), vis: new Uint8Array(W * H),
    biome: BIOMES.find(b => depth <= b.upTo) || BIOMES[BIOMES.length - 1],
  };
  ents = []; dying = []; projs = []; floats = []; distCache.clear();
  for (const a of G.team) { a.status = { sleep: 0, atk: 0, def: 0 }; a.lunge = 0; a.flash = 0; a.alpha = 1; a.mem = null; }
  const L = leader();

  if (depth === MAXF) {
    const r = F.rooms[0], cx = r.x + (r.w >> 1);
    place(L, { x: cx, y: r.y + r.h - 2 }); L.dir = { x: 0, y: -1 }; ents.push(L);
    for (const a of G.team.slice(1)) { place(a, findFreeNear(L.x, L.y)); a.dir = { x: 0, y: -1 }; ents.push(a); }
    const boss = makeCreature('golemon', 15, 'wild'); place(boss, { x: cx, y: r.y + 2 }); ents.push(boss);
    for (const dx of [-3, 3]) { const m = makeCreature('caillou', 11, 'wild'); place(m, { x: cx + dx, y: r.y + 3 }); ents.push(m); }
    for (let i = 0; i < 3; i++) { const p = freeTileIn(r, true); if (p) F.items.push(newItem(p.x, p.y, pick(['oran', 'oran', 'elixir']))); }
  } else {
    const rs = shuffle([...F.rooms]);
    const start = rs[0];
    place(L, freeTileIn(start)); ents.push(L);
    for (const a of G.team.slice(1)) { place(a, findFreeNear(L.x, L.y)); ents.push(a); }
    F.stairs = freeTileIn(rs[1]);
    const nI = ri(4, 7);
    for (let i = 0; i < nI; i++) { const p = freeTileIn(pick(F.rooms), true); if (p) F.items.push(newItem(p.x, p.y)); }
    const nT = ri(1, 3) + Math.floor(depth / 3);
    for (let i = 0; i < nT; i++) {
      const p = freeTileIn(pick(rs.slice(1)), true);
      if (p) F.traps.push({ x: p.x, y: p.y, k: pick(Object.keys(TRAPS)), seen: false });
    }
    const nE = 3 + Math.floor(depth / 2);
    for (let i = 0; i < nE; i++) { const p = freeTileIn(pick(rs.slice(1))); if (p) { const e = makeWild(); place(e, p); ents.push(e); } }
    if (depth >= 3 && rs.length > 3 && rnd() < .2) {
      const r = rs[2]; F.mh = r.id;
      for (let i = 0; i < 4; i++) { const p = freeTileIn(r, true); if (p) F.items.push(newItem(p.x, p.y)); }
    }
  }
  computeVis();
}

/* ---------- Vision ---------- */
function areaRooms(e) {
  const k = F.roomOf[e.y * W + e.x];
  if (k >= 0) return [k];
  const out = [];
  for (const [dx, dy] of DIRS) { const r = F.roomOf[(e.y + dy) * W + e.x + dx]; if (r >= 0 && !out.includes(r)) out.push(r); }
  return out;
}
function inSameArea(a, b) {
  if (cheb(a, b) <= 2) return true;
  const ra = areaRooms(a); if (!ra.length) return false;
  return areaRooms(b).some(r => ra.includes(r));
}
function los(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
  for (;;) {
    if (x0 === x1 && y0 === y1) return true;
    if (!F.tiles[y0 * W + x0]) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function computeVis() {
  const v = F.vis; v.fill(0);
  const L = leader();
  for (const id of areaRooms(L)) {
    const r = F.rooms[id];
    for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) v[y * W + x] = 1;
  }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x = L.x + dx, y = L.y + dy;
    if (x >= 0 && y >= 0 && x < W && y < H) v[y * W + x] = 1;
  }
  for (let i = 0; i < v.length; i++) if (v[i]) F.explored[i] = 1;
}
const seen = e => e.team === 'ally' || F.vis[e.y * W + e.x];

/* ---------- Déplacements IA ---------- */
function distMap(tx, ty) {
  const key = ty * W + tx;
  if (distCache.has(key)) return distCache.get(key);
  const d = new Int16Array(W * H).fill(-1); d[key] = 0;
  const q = [key]; let h = 0;
  while (h < q.length) {
    const k = q[h++], x = k % W, y = (k / W) | 0, dv = d[k];
    for (const [dx, dy] of DIRS) {
      if (!canStep(x, y, dx, dy)) continue;
      const n = (y + dy) * W + x + dx;
      if (d[n] < 0) { d[n] = dv + 1; q.push(n); }
    }
  }
  distCache.set(key, d);
  return d;
}
function stepToward(e, tx, ty) {
  const d = distMap(tx, ty), cur = d[e.y * W + e.x];
  if (cur <= 0) return false;
  let best = [], bv = cur;
  for (const [dx, dy] of DIRS) {
    if (!canStep(e.x, e.y, dx, dy)) continue;
    const nx = e.x + dx, ny = e.y + dy;
    if (entAt(nx, ny)) continue;
    const v = d[ny * W + nx];
    if (v < 0 || v >= cur) continue;
    if (v < bv) { bv = v; best = [[dx, dy]]; } else if (v === bv) best.push([dx, dy]);
  }
  if (!best.length) return false;
  const [dx, dy] = pick(best);
  e.x += dx; e.y += dy; e.dir = { x: dx, y: dy };
  return true;
}

/* ---------- Combat ---------- */
const hostile = (a, b) => a.team !== b.team;
const stg = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);

function getTargets(e, M) {
  const out = { list: [], end: { x: e.x, y: e.y }, dist: 0 };
  const { x: dx, y: dy } = e.dir;
  switch (M.tg) {
    case 'self': out.list = [e]; break;
    case 'front':
      if (canHit(e, dx, dy)) { const o = entAt(e.x + dx, e.y + dy); if (o && hostile(e, o)) out.list = [o]; }
      break;
    case 'line': {
      if (!canHit(e, dx, dy)) break;
      let x = e.x, y = e.y, n = 0;
      while (n < 10) {
        if (!isFloor(x + dx, y + dy)) break;
        x += dx; y += dy; n++;
        const o = entAt(x, y);
        if (o && hostile(e, o)) { out.list = [o]; break; }
      }
      out.end = { x, y }; out.dist = n; break;
    }
    case 'around':
      for (const [ax, ay] of DIRS) { if (!canHit(e, ax, ay)) continue; const o = entAt(e.x + ax, e.y + ay); if (o && hostile(e, o)) out.list.push(o); }
      break;
    case 'room': out.list = ents.filter(o => hostile(e, o) && inSameArea(e, o)); break;
  }
  return out;
}

function useMove(e, i) {
  const M = i < 0 ? MOVES.attaque : MOVES[e.moves[i].id];
  if (i >= 0) { if (e.moves[i].pp <= 0) return false; e.moves[i].pp--; }
  const vis = seen(e);
  if (i >= 0 && vis) say(`${nm(e)} utilise ${M.n} !`);
  e.lunge = 1;
  lockUntil = performance.now() + (vis ? 200 : 0);
  if (vis) sfx(i < 0 ? 'atk' : 'move');
  const tg = getTargets(e, M);
  if (M.tg === 'line' && vis) projs.push({ x0: e.x, y0: e.y, x1: tg.end.x, y1: tg.end.y, t0: performance.now(), dur: 60 + tg.dist * 40, col: TYPES[M.t].c });
  if ((M.tg === 'room' || M.tg === 'around') && M.p > 0 && vis) flashFx = { col: TYPES[M.t].c, t0: performance.now() };
  if (!tg.list.length && i >= 0 && vis && M.tg !== 'self') say('Mais ça ne touche personne.');
  for (const t of tg.list) { if (ents.includes(t)) hitWith(e, t, M); if (G.over) break; }
  return true;
}

function hitWith(u, t, M) {
  const vis = seen(t) || seen(u);
  if (M.fx === 'heal') { heal(t, Math.round(t.maxHp * .4)); return; }
  if (rnd() > M.acc) { floatT(t, 'Raté', '#ccc'); if (vis) { say(`${nm(u)} rate ${nm(t)}.`); sfx('miss'); } return; }
  if (M.p > 0) {
    const ef = eff(M.t, SPECIES[t.sp].t), stab = M.t === SPECIES[u.sp].t ? 1.25 : 1;
    const a = u.atk * stg(u.status.atk), d = t.def * stg(t.status.def);
    const crit = rnd() < 1 / 16;
    const dmg = Math.max(1, Math.round(((a * M.p) / (d + 8) * .95 + 1) * ef * stab * (crit ? 1.5 : 1) * (.85 + rnd() * .15)));
    t.hp -= dmg; t.flash = .35;
    floatT(t, String(dmg), ef > 1 ? '#ffd23a' : ef < 1 ? '#c8c8c8' : '#fff');
    if (vis) {
      let msg = `${nm(t)} perd ${dmg} PV`;
      if (crit) msg = 'Coup critique ! ' + msg;
      msg += ef > 1 ? '. C’est super efficace !' : ef < 1 ? '. Ce n’est pas très efficace…' : '.';
      say(msg, t.team === 'ally' ? 'bad' : ''); sfx('hit');
    }
    if (t.hp <= 0) { faint(t, u); return; }
  }
  if (M.fx === 'atk' || M.fx === 'def') {
    if (t.status[M.fx] > -3) { t.status[M.fx]--; if (vis) say(`${M.fx === 'atk' ? 'L’Attaque' : 'La Défense'} de ${nm(t)} baisse !`); }
  }
  if (M.fx === 'sleep' && !t.status.sleep) { t.status.sleep = ri(3, 5); if (vis) say(`${nm(t)} s’endort !`); }
}
function fixedDamage(t, d, src) {
  t.hp -= d; t.flash = .35; floatT(t, String(d), '#fff');
  say(`${nm(t)} perd ${d} PV.`, t.team === 'ally' ? 'bad' : ''); sfx('hit');
  if (t.hp <= 0) faint(t, src);
}
function heal(a, n) {
  const h = Math.min(n, a.maxHp - a.hp);
  a.hp += h; floatT(a, '+' + h, '#7dff8a'); sfx('heal');
  say(`${nm(a)} récupère ${h} PV.`, 'good');
}

function faint(t, src) {
  if (t.hp > 0) return;
  t.hp = 0;
  if (t === leader()) {
    const gi = G.inv.findIndex(s => s.k === 'gvie');
    if (gi >= 0) {
      G.inv.splice(gi, 1); t.hp = t.maxHp; t.status.sleep = 0;
      say(`La Graine Vie ranime ${nm(t)} !`, 'good'); floatT(t, 'Ranimé', '#ffe066'); sfx('lvl');
      return;
    }
    say(`${nm(t)} est K.O. !`, 'bad'); sfx('faint'); G.over = true;
    return;
  }
  ents.splice(ents.indexOf(t), 1); dying.push(t); sfx('faint');
  if (t.team === 'ally') {
    G.team.splice(G.team.indexOf(t), 1);
    say(`${nm(t)} est K.O. et doit quitter l’expédition…`, 'bad');
    return;
  }
  say(`${nm(t)} est K.O. !`);
  G.kills++;
  if (src && src.team === 'ally') {
    const gain = xpYield(t, leader());
    say(`L’équipe gagne ${gain} points d’Exp.`);
    for (const a of G.team) gainXp(a, xpYield(t, a));
  }
  if (t.boss) G.won = true;
  else if (src && src.team === 'ally' && G.team.length < 3 && rnd() < clamp(.1 + (leader().lvl - t.lvl) * .015, .06, .22)) G.recruit = t;
}

/* ---------- IA ---------- */
function clearShot(e, dx, dy) {
  if (!canHit(e, dx, dy)) return false;
  let x = e.x, y = e.y;
  for (let n = 0; n < 10; n++) {
    if (!isFloor(x + dx, y + dy)) return false;
    x += dx; y += dy;
    const o = entAt(x, y);
    if (o && hostile(e, o)) return true;
  }
  return false;
}
function aiAttack(e, foe, ally) {
  const ddx = foe.x - e.x, ddy = foe.y - e.y, dx = sign(ddx), dy = sign(ddy), dist = cheb(e, foe);
  const adj = dist === 1 && canHit(e, dx, dy);
  const aligned = (ddx === 0 || ddy === 0 || Math.abs(ddx) === Math.abs(ddy)) && dist <= 8 && clearShot(e, dx, dy);
  const area = inSameArea(e, foe);
  const tF = SPECIES[foe.sp].t, tU = SPECIES[e.sp].t;
  const val = M => M.p * eff(M.t, tF) * (M.t === tU ? 1.25 : 1) * M.acc;
  const saved = e.dir; e.dir = { x: dx, y: dy };
  const count = tg => getTargets(e, { tg }).list.length;
  const opts = [];
  if (adj) opts.push({ i: -1, s: val(MOVES.attaque) });
  e.moves.forEach((m, i) => {
    if (m.pp <= 0) return;
    const M = MOVES[m.id]; let s = 0;
    if (M.fx === 'heal') { if (e.hp < e.maxHp * .4) s = ally ? 30 : 12; }
    else if (M.tg === 'front' && adj) s = M.p ? val(M) : (M.fx === 'sleep' && !foe.status.sleep ? 6 : 0);
    else if (M.tg === 'line' && aligned) s = val(M);
    else if (M.tg === 'around' && adj) s = val(M) * count('around');
    else if (M.tg === 'room' && area) {
      if (M.p) s = val(M) * Math.min(3, count('room'));
      else if (M.fx === 'sleep') s = foe.status.sleep ? 0 : 3;
      else s = foe.status[M.fx] > -2 ? 2.5 : 0;
    }
    if (s > 0) opts.push({ i, s: s * (ally && m.pp < m.max * .3 ? .5 : 1) });
  });
  if (!opts.length || (!ally && !adj && rnd() < .3)) { e.dir = saved; return false; }
  let ch;
  if (ally) { for (const o of opts) o.r = o.s * (.75 + rnd() * .5); ch = opts.reduce((a, b) => b.r > a.r ? b : a); }
  else { let s = 0; for (const o of opts) s += o.s; let r = rnd() * s; ch = opts.find(o => (r -= o.s) <= 0) || opts[0]; }
  useMove(e, ch.i);
  return true;
}
function allyAI(a) {
  if (a.status.sleep > 0) { a.status.sleep--; return; }
  const L = leader();
  let foe = null, bd = 99;
  for (const e of ents) {
    if (e.team !== 'wild') continue;
    const d = cheb(a, e);
    if (d < bd && d <= 6 && cheb(L, e) <= 8 && (inSameArea(a, e) || (d <= 3 && los(a.x, a.y, e.x, e.y)))) { bd = d; foe = e; }
  }
  if (foe) { if (aiAttack(a, foe, true)) return; if (stepToward(a, foe.x, foe.y)) return; }
  if (cheb(a, L) > 1) stepToward(a, L.x, L.y);
}
function wildAI(e) {
  if (e.status.sleep > 0) { e.status.sleep--; return; }
  let tgt = null, bd = 99;
  for (const a of G.team) {
    if (a.hp <= 0) continue;
    const d = cheb(e, a);
    if (d < bd && (inSameArea(e, a) || (d <= 4 && los(e.x, e.y, a.x, a.y)))) { bd = d; tgt = a; }
  }
  if (tgt) { e.mem = { x: tgt.x, y: tgt.y, t: 8 }; if (aiAttack(e, tgt, false)) return; stepToward(e, tgt.x, tgt.y); return; }
  if (e.mem && e.mem.t-- > 0) {
    if (e.x === e.mem.x && e.y === e.mem.y) e.mem = null;
    else if (stepToward(e, e.mem.x, e.mem.y)) return;
  }
  if (!e.goal || (e.goal.x === e.x && e.goal.y === e.y) || e.stuck > 4) {
    const r = pick(F.rooms); e.goal = { x: ri(r.x, r.x + r.w - 1), y: ri(r.y, r.y + r.h - 1) }; e.stuck = 0;
  }
  if (!stepToward(e, e.goal.x, e.goal.y)) e.stuck = (e.stuck || 0) + 1;
}

/* ---------- Tour ---------- */
function endTurn() {
  const L = leader();
  G.turns++; F.turn++;
  distCache.clear();
  if (++G.bellyT >= 8) {
    G.bellyT = 0;
    if (G.belly > 0) {
      G.belly--;
      if (G.belly === 20) say('Votre ventre gargouille…', 'warn');
      else if (G.belly === 10) say('Vous avez très faim !', 'warn');
      else if (G.belly === 0) say('Le Ventre est vide ! Vos PV baissent…', 'bad');
    }
  }
  if (G.belly <= 0) { L.hp -= 1; if (L.hp <= 0) { say('Épuisé par la faim…', 'bad'); faint(L, null); } }
  if (!G.over) for (const a of G.team.slice(1)) { if (ents.includes(a)) allyAI(a); if (G.over) break; }
  if (!G.over) for (const e of ents.filter(e => e.team === 'wild')) { if (ents.includes(e)) wildAI(e); if (G.over) break; }
  if (G.belly > 0) for (const a of G.team) {
    if (a.hp <= 0) continue;
    a.reg = (a.reg || 0) + a.maxHp / 110;
    if (a.reg >= 1) { const n = Math.floor(a.reg); a.reg -= n; a.hp = Math.min(a.maxHp, a.hp + n); }
  }
  if (F.depth < MAXF && ++F.spawnT >= 40) {
    F.spawnT = 0;
    if (ents.filter(e => e.team === 'wild').length < 6 + F.depth / 2) spawnWild();
  }
  checkMonsterHouse();
  computeVis(); updHUD();
  afterTurn();
}
function spawnWild() {
  const L = leader();
  for (let k = 0; k < 20; k++) {
    const p = freeTileIn(pick(F.rooms));
    if (!p || F.vis[p.y * W + p.x] || cheb(p, L) < 7) continue;
    const e = makeWild(); place(e, p); ents.push(e); return;
  }
}
function checkMonsterHouse() {
  if (F.mh < 0 || F.mhDone) return;
  const L = leader();
  if (F.roomOf[L.y * W + L.x] !== F.mh) return;
  F.mhDone = true;
  const r = F.rooms[F.mh];
  say('C’est un repaire de monstres !', 'bad');
  flashFx = { col: '#ff3030', t0: performance.now() }; sfx('alarm');
  const n = 5 + Math.floor(F.depth / 2);
  for (let i = 0; i < n; i++) {
    const p = freeTileIn(r); if (!p) break;
    const e = makeWild(); place(e, p); e.ry -= 3; e.alpha = 0; ents.push(e);
  }
}
async function afterTurn() {
  if (G.over) return gameOver();
  if (G.won) return victory();
  if (G.recruit) {
    const t = G.recruit; G.recruit = null;
    const ok = await dialog(`<h2>Recrutement</h2><p>${t.name} (Nv ${t.lvl}) se relève…<br>Il semble vouloir rejoindre l’équipe !</p>`,
      [{ t: 'L’accueillir', v: true }, { t: 'Refuser', v: false, cls: 'sec' }]);
    if (ok) {
      const n = makeCreature(t.sp, t.lvl, 'ally');
      place(n, findFreeNear(t.x, t.y)); n.dir = { x: 0, y: 1 };
      G.team.push(n); ents.push(n);
      say(`${nm(n)} rejoint l’équipe !`, 'good'); sfx('lvl');
      updHUD();
    }
  }
  if (G.stairsPrompt) { G.stairsPrompt = false; askStairs(); }
}

/* ---------- Actions du chef ---------- */
let turnMode = false;
function leaderStep(dx, dy, faceOnly) {
  const L = leader();
  L.dir = { x: dx, y: dy };
  if (faceOnly || !canStep(L.x, L.y, dx, dy)) return;
  const o = entAt(L.x + dx, L.y + dy);
  if (o && o.team !== 'ally') return;
  if (o) { o.x = L.x; o.y = L.y; o.dir = { x: -dx, y: -dy }; }
  L.x += dx; L.y += dy;
  onLeaderEnter();
  endTurn();
}
function onLeaderEnter() {
  const L = leader();
  const ii = F.items.findIndex(it => it.x === L.x && it.y === L.y);
  if (ii >= 0) {
    const it = F.items[ii];
    if (addItem(it.k, it.n)) {
      F.items.splice(ii, 1);
      say(it.k === 'ecus' ? `Vous ramassez ${it.n} écus.` : `Vous ramassez : ${itemLabel(it)}.`, 'good'); sfx('pick');
    } else say(`Le sac est plein… (${ITEMS[it.k].n})`, 'warn');
  }
  const tr = F.traps.find(t => t.x === L.x && t.y === L.y);
  if (tr) triggerTrap(tr, L);
  if (onStairs()) G.stairsPrompt = true;
}
function triggerTrap(tr, a) {
  tr.seen = true;
  say(`${nm(a)} déclenche un ${TRAPS[tr.k].n} !`, 'bad'); sfx('alarm');
  switch (tr.k) {
    case 'pics': fixedDamage(a, 6 + F.depth * 2, null); break;
    case 'tp': teleport(a); break;
    case 'sommeil': a.status.sleep = ri(3, 4); say(`${nm(a)} s’endort…`); break;
    case 'faim': G.belly = Math.max(0, G.belly - 20); say('Le Ventre se vide d’un coup !', 'warn'); break;
  }
}
function teleport(a) {
  for (let k = 0; k < 30; k++) {
    const p = freeTileIn(pick(F.rooms));
    if (p && cheb(p, a) > 6) { place(a, p); say(`${nm(a)} est téléporté !`); return; }
  }
}
function leaderMove(i) {
  const L = leader();
  if (i >= 0) {
    const m = L.moves[i]; if (!m) return;
    if (m.pp <= 0) { say('Plus de PP pour cette capacité.', 'warn'); return; }
  }
  useMove(L, i);
  endTurn();
}

/* ---------- Sac ---------- */
function addItem(k, n) {
  if (k === 'ecus') { G.ecus += n; return true; }
  if (ITEMS[k].stack) { const s = G.inv.find(s => s.k === k); if (s) { s.n += n; return true; } }
  if (G.inv.length >= INV_MAX) return false;
  G.inv.push({ k, n }); return true;
}
const itemLabel = it => ITEMS[it.k].stack ? `${ITEMS[it.k].n} ×${it.n}` : ITEMS[it.k].n;
function consume(i) { const s = G.inv[i]; if (--s.n <= 0) G.inv.splice(i, 1); }

function useItem(i, target) {
  const s = G.inv[i], L = leader();
  switch (s.k) {
    case 'oran': heal(target || L, 40); break;
    case 'pomme': G.belly = Math.min(100, G.belly + 50); say(`${nm(L)} mange une Pomme. Miam !`, 'good'); break;
    case 'gpomme': G.belly = 100; say(`${nm(L)} dévore une Grosse Pomme. Le Ventre est plein !`, 'good'); break;
    case 'elixir':
      for (const a of G.team) for (const m of a.moves) m.pp = Math.min(m.max, m.pp + 10);
      say('Les PP de l’équipe sont restaurés.', 'good'); sfx('heal'); break;
    case 'gexplo': {
      say(`${nm(L)} fait exploser une graine !`);
      flashFx = { col: '#ff8a3a', t0: performance.now() };
      const tg = getTargets(L, { tg: 'around' }).list;
      if (!tg.length) say('L’explosion ne touche personne.');
      for (const t of tg) fixedDamage(t, 25, L);
      break;
    }
    case 'epine': {
      const tg = getTargets(L, { tg: 'line' });
      L.lunge = 1;
      projs.push({ x0: L.x, y0: L.y, x1: tg.end.x, y1: tg.end.y, t0: performance.now(), dur: 60 + tg.dist * 35, col: '#e8ecf4' });
      if (tg.list.length) fixedDamage(tg.list[0], 12, L); else say('L’épine se perd au sol.');
      break;
    }
    case 'osommeil': {
      const tg = getTargets(L, { tg: 'room' }).list;
      for (const t of tg) t.status.sleep = ri(4, 7);
      say(tg.length ? 'Les ennemis de la salle s’endorment !' : 'Aucun ennemi à endormir…', tg.length ? 'good' : '');
      break;
    }
    case 'otp': teleport(L); computeVis(); break;
    case 'ocarte':
      for (let k = 0; k < W * H; k++) if (F.tiles[k]) for (const [dx, dy] of [[0, 0], ...DIRS]) { const n = k + dy * W + dx; if (n >= 0 && n < W * H) F.explored[n] = 1; }
      say('Le plan de l’étage se dévoile !', 'good'); break;
    case 'gvie': say('La Graine Vie agira seule si le chef tombe K.O.'); return false;
  }
  consume(i);
  return true;
}

/* ---------- Escaliers / transitions ---------- */
async function askStairs() {
  const go = await dialog(`<h2>Escalier</h2><p>Descendre au B${F.depth + 1}F ?</p>`, [{ t: 'Descendre', v: true }, { t: 'Rester', v: false, cls: 'sec' }]);
  if (go) descend();
}
function fade(on, html = '') {
  $('#fadeText').innerHTML = html;
  $('#fade').classList.toggle('on', on);
  return new Promise(r => setTimeout(r, 480));
}
async function descend() {
  state = 'trans'; sfx('stairs');
  await fade(true);
  G.floor++;
  buildFloor(G.floor);
  saveRun(); updHUD();
  await fade(true, floorTitle());
  await new Promise(r => setTimeout(r, 900));
  await fade(false, floorTitle());
  state = 'play';
  floorIntro();
}
const floorTitle = () => `B${F.depth}F<small>${F.biome.n}</small>`;
function floorIntro() {
  if (F.depth === MAXF) { say('Le sol tremble… Golemon garde le cœur du volcan !', 'bad'); sfx('alarm'); }
  else say(`${F.biome.n} — B${F.depth}F`);
}

/* ---------- Sauvegarde ---------- */
function saveRun() {
  try {
    localStorage.setItem(SAVE, JSON.stringify({
      floor: G.floor, belly: G.belly, ecus: G.ecus, kills: G.kills, turns: G.turns, inv: G.inv,
      team: G.team.map(a => ({ sp: a.sp, lvl: a.lvl, xp: a.xp, hp: a.hp, moves: a.moves })),
    }));
  } catch (e) { /* stockage indisponible */ }
}
function loadRun() { try { return JSON.parse(localStorage.getItem(SAVE)); } catch (e) { return null; } }
function clearRun() { try { localStorage.removeItem(SAVE); } catch (e) { /* rien */ } }
function getBest() { try { return JSON.parse(localStorage.getItem(BEST)) || { floor: 0, wins: 0 }; } catch (e) { return { floor: 0, wins: 0 }; } }
function recordBest(won) {
  const b = getBest(); b.floor = Math.max(b.floor, G.floor); if (won) b.wins++;
  try { localStorage.setItem(BEST, JSON.stringify(b)); } catch (e) { /* rien */ }
}
function restoreRun(s) {
  G = { floor: s.floor, belly: s.belly, bellyT: 0, ecus: s.ecus, kills: s.kills, turns: s.turns, inv: s.inv, team: [] };
  for (const t of s.team) {
    const a = makeCreature(t.sp, t.lvl, 'ally');
    a.xp = t.xp; a.hp = Math.min(t.hp, a.maxHp); a.moves = t.moves;
    G.team.push(a);
  }
}

/* ---------- Fin de partie ---------- */
const statsHtml = () => `<div class="stats">Étage atteint : B${G.floor}F<br>Ennemis vaincus : ${G.kills}<br>Tours : ${G.turns}<br>Écus : ${G.ecus}<br>Équipe : ${G.team.map(a => `${a.name} Nv${a.lvl}`).join(', ')}</div>`;
async function gameOver() {
  state = 'over'; clearRun(); recordBest(false);
  await new Promise(r => setTimeout(r, 700));
  await dialog(`<h2>Expédition échouée…</h2><p>L’équipe a dû abandonner au B${F.depth}F.</p>${statsHtml()}`, [{ t: 'Retour au titre', v: 1 }]);
  showTitle();
}
async function victory() {
  state = 'over'; clearRun(); recordBest(true);
  await new Promise(r => setTimeout(r, 900));
  await dialog(`<h2>Expédition réussie !</h2><p>Golemon est vaincu et la brume se dissipe sur le volcan. Bravo !</p>${statsHtml()}`, [{ t: 'Retour au titre', v: 1 }]);
  showTitle();
}

/* =====================================================================
   RENDU
   ===================================================================== */
// Le monde est dessiné dans un petit tampon (tuiles de 16 px), puis agrandi
// d’un facteur entier sans lissage : vrai rendu pixel art.
const cv = $('#c'), sctx = cv.getContext('2d');
const buf = document.createElement('canvas'), ctx = buf.getContext('2d');
const TS = 16, SPR = 24;
let VW = 0, VH = 0, DPR = 1, Z = 2, BW = 0, BH = 0;
function resize() {
  DPR = window.devicePixelRatio || 1;
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  Z = Math.max(2, Math.round(clamp(Math.min(VW / 11.5, VH / 12.5), 30, 72) / TS));
  BW = Math.ceil(VW / Z); BH = Math.ceil(VH / Z);
  buf.width = BW; buf.height = BH;
  if (F) updHUD();
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function E(c, x, y, rx, ry, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function P(c, pts, col) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
function hsh(x, y) {
  let h = (x * 374761393 + y * 668265263 + (F ? F.depth : 0) * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/* ---------- Créatures dessinées ---------- */
function eyes(c, x, y, dir, gap = 3.6, sz = 1, col = '#1b1720') {
  if (dir.y < 0 && dir.x === 0) return;
  const ox = dir.x * 2.2, oy = dir.y > 0 ? 1 : dir.y < 0 ? -1 : 0;
  for (const s of [-1, 1]) {
    const far = dir.x !== 0 && s === -dir.x, k = far ? sz * .78 : sz;
    const ex = x + s * gap * (dir.x ? .8 : 1) + ox, ey = y + oy;
    E(c, ex, ey, 1.5 * k, 2.2 * k, col);
    if (col === '#1b1720') E(c, ex + .5 * k, ey - .8 * k, .6 * k, .7 * k, '#fff');
  }
}
function flame(c, x, y, sz, t, c1, c2) {
  const fl = Math.sin(t * 16 + x) * 1.2;
  const one = (s, col, oy) => {
    c.fillStyle = col; c.beginPath();
    c.moveTo(x + fl * .5, y + oy - 9 * s - fl);
    c.quadraticCurveTo(x + 6 * s, y + oy - 2 * s, x + 4 * s, y + oy + 2 * s);
    c.arc(x, y + oy + 1.5 * s, 4 * s, .12, Math.PI - .12);
    c.quadraticCurveTo(x - 6 * s, y + oy - 2 * s, x + fl * .5, y + oy - 9 * s - fl);
    c.fill();
  };
  one(sz, c1, 0); one(sz * .55, c2, 1.6 * sz);
}
const ROCK = [0, -9.5, 6, -7.5, 9.5, -2, 9, 5, 5, 9, -4, 9.5, -9, 5.5, -9.8, -2, -6, -8];
function drawCreature(c, sp, cx, cy, S, dir, t, o = {}) {
  const s = SPECIES[sp], k = S / 32 * (s.big || 1);
  c.save(); c.translate(cx, cy); c.scale(k, k);
  if (s.big) c.translate(0, -5);
  const f = dir.x < 0 ? -1 : 1, back = dir.y < 0 && dir.x === 0;
  const C1 = s.c1, C2 = s.c2, D1 = s.d1, L1 = s.l1;
  switch (s.shape) {
    case 'fox': {
      if (!back) flame(c, -f * 9, -1, .9, t, '#ff6a2a', '#ffd84a');
      for (const m of [-1, 1]) { P(c, [m * 8, -3, m * 6.5, -13, m * 2, -6], C1); P(c, [m * 6.6, -5, m * 6.2, -10.5, m * 3.8, -6.4], D1); }
      E(c, 0, 2, 9, 7.5, C1);
      if (!back) { E(c, 0, 5.5, 5.5, 3.6, C2); if (dir.x) E(c, f * 5.5, 2.5, 3, 2.2, C2); }
      eyes(c, 0, 0, dir);
      if (back) flame(c, 0, 4, .9, t, '#ff6a2a', '#ffd84a');
      break;
    }
    case 'tadpole': {
      c.save(); c.translate(-f * 9, 5); c.rotate(Math.sin(t * 7) * .3); E(c, -f * 2, 0, 6, 2.6, L1); c.restore();
      E(c, 0, -6, 2.5, 3.5, L1);
      E(c, 0, 2, 10, 8, C1);
      if (!back) {
        E(c, 0, 5, 6, 4, C2);
        c.strokeStyle = D1; c.lineWidth = 1; c.beginPath(); c.arc(0, 5, 2.4, 0, Math.PI * 1.6); c.stroke();
      }
      eyes(c, 0, -1, dir, 4, 1.15);
      break;
    }
    case 'sprout': {
      const sw = Math.sin(t * 3) * .15;
      c.strokeStyle = '#3c7a34'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -3); c.lineTo(0, -8); c.stroke();
      c.save(); c.translate(-3.5, -9); c.rotate(-.6 + sw); E(c, 0, 0, 4.8, 2.1, '#3e9a3a'); c.restore();
      c.save(); c.translate(3.5, -10); c.rotate(.6 + sw); E(c, 0, 0, 4.8, 2.1, '#56b84e'); c.restore();
      E(c, 0, 3, 9, 7, C1);
      if (!back) { E(c, 0, 6, 5, 3, C2); E(c, -5.5, 3.5, 1.6, 1, '#f29a9a'); E(c, 5.5, 3.5, 1.6, 1, '#f29a9a'); }
      eyes(c, 0, 1, dir);
      break;
    }
    case 'mouse': {
      c.strokeStyle = C1; c.lineWidth = 2.4; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-f * 7, 5); c.lineTo(-f * 11, 1); c.lineTo(-f * 9, -1); c.lineTo(-f * 13, -6); c.stroke();
      for (const m of [-1, 1]) { E(c, m * 6, -6.5, 3.4, 4.6, C1); E(c, m * 6.4, -9.6, 2.4, 1.6, '#3a2a18'); }
      E(c, 0, 2, 9, 7.5, C1);
      if (!back) { E(c, -6, 3.5, 2, 1.6, '#e8503c'); E(c, 6, 3.5, 2, 1.6, '#e8503c'); }
      eyes(c, 0, 0, dir);
      break;
    }
    case 'rat': {
      c.strokeStyle = '#c58ab0'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-f * 7, 6); c.quadraticCurveTo(-f * 15, 6, -f * 13, -2); c.stroke();
      for (const m of [-1, 1]) { E(c, m * 5, -4, 3, 3, L1); E(c, m * 5, -4, 1.6, 1.6, '#f0b0c8'); }
      E(c, 0, 3, 9, 6.5, C1);
      if (!back) { E(c, 0, 6, 5, 2.6, C2); if (dir.y >= 0) { c.fillStyle = '#fff'; c.fillRect(-1 + dir.x * 3, 5, 2, 2.2); } }
      eyes(c, 0, 1, dir, 3.4, .9);
      break;
    }
    case 'bird': {
      const fl = Math.sin(t * 10) * .4;
      for (const m of [-1, 1]) { c.save(); c.translate(m * 8, 3); c.rotate(m * (.3 + fl)); E(c, 0, 0, 3, 5, D1); c.restore(); }
      P(c, [-1, -5, -3, -11, 1, -6], D1); P(c, [1, -5, 2.5, -12, 3, -5], D1);
      E(c, 0, 2, 8, 8, C1);
      if (!back) E(c, 0, 5, 5, 4, C2);
      eyes(c, 0, 0, dir, 3.2);
      if (!back) { if (dir.x) P(c, [f * 6, 0, f * 11, 1.5, f * 6, 3], '#f0a830'); else P(c, [-1.8, 2, 1.8, 2, 0, 5], '#f0a830'); }
      break;
    }
    case 'rock': {
      E(c, -10, 4, 3, 2.6, D1); E(c, 10, 4, 3, 2.6, D1);
      c.save(); c.translate(0, 2); P(c, ROCK, C1); c.scale(.6, .55); c.translate(-3, -4); P(c, ROCK, C2); c.restore();
      E(c, 0, 4, 7, 5, C1);
      eyes(c, 0, 1, dir, 3.4, .9);
      if (!back) { c.strokeStyle = '#3a3530'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -3); c.lineTo(-2, -2); c.moveTo(6, -3); c.lineTo(2, -2); c.stroke(); }
      break;
    }
    case 'mushroom': {
      E(c, 0, 5, 6.5, 5, C2);
      c.fillStyle = C1; c.beginPath(); c.ellipse(0, 0, 12, 9, 0, Math.PI, 0); c.closePath(); c.fill();
      E(c, 0, 0, 12, 2.2, D1);
      E(c, -5, -4.5, 2, 1.6, '#fff'); E(c, 3, -6.5, 2.2, 1.8, '#fff'); E(c, 7.5, -2.5, 1.5, 1.2, '#fff');
      eyes(c, 0, 5, dir, 2.6, .8);
      break;
    }
    case 'slime': {
      c.fillStyle = C1; c.beginPath(); c.moveTo(-7, 1); c.quadraticCurveTo(-1, -4, 0, -9); c.quadraticCurveTo(1, -4, 7, 1); c.fill();
      E(c, 0, 4, 10, 6.5, C1);
      E(c, -4, 0, 2, 3, 'rgba(255,255,255,.55)');
      eyes(c, 0, 3, dir);
      break;
    }
    case 'ember': {
      flame(c, 0, 3, 1.5, t, C1, C2);
      eyes(c, 0, 2, dir, 3, .9);
      break;
    }
    case 'wisp': {
      c.save(); c.translate(0, 1); c.rotate((o.frame || 0) * Math.PI / 16);
      const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 5 : 10.5; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
      P(c, pts, C1); c.restore();
      E(c, 0, 1, 6, 6, C2);
      if (Math.sin(t * 9) > .3) { c.strokeStyle = '#fff6a0'; c.lineWidth = 1; c.beginPath(); c.moveTo(8, -8); c.lineTo(11, -11); c.moveTo(-9, 7); c.lineTo(-12, 9); c.stroke(); }
      eyes(c, 0, 1, dir, 2.6, .85);
      break;
    }
    case 'ghost': {
      c.translate(0, -2);
      c.fillStyle = C1; c.beginPath(); c.moveTo(-9, 8); c.lineTo(-9, -1); c.arc(0, -1, 9, Math.PI, 0); c.lineTo(9, 8);
      for (let i = 0; i < 4; i++) { const x0 = 9 - i * 4.5; c.quadraticCurveTo(x0 - 2.25, 4 + Math.sin(t * 6 + i) * 1.5, x0 - 4.5, 8); }
      c.fill();
      if (!back) { eyes(c, 0, -1, dir, 3.4, 1.1, '#fff'); eyes(c, dir.x * .6, -.6, dir, 3.4, .55, '#2a1650'); }
      break;
    }
    case 'golem': {
      E(c, -12, 5, 4.5, 4, D1); E(c, 12, 5, 4.5, 4, D1);
      c.save(); c.translate(0, 2); c.scale(1.15, 1.05); P(c, ROCK, C1); c.restore();
      P(c, [-6, -8, -4, -15, -2, -9], C2); P(c, [-1, -9, 1, -18, 3, -9], C2); P(c, [3, -8, 6, -14, 7, -7], C2);
      E(c, 0, 5, 7, 4, D1);
      if (!back) { const g = .7 + Math.sin(t * 4) * .3; c.globalAlpha *= g; E(c, -3.5, 0, 2, 1.3, C2); E(c, 3.5, 0, 2, 1.3, C2); }
      break;
    }
  }
  c.restore();
}

/* ---------- Objets & décor ---------- */
function drawItem(c, k, x, y, S) {
  c.save(); c.translate(x, y); c.scale(S / 32, S / 32);
  switch (k) {
    case 'oran': E(c, 0, 1, 5.5, 5, '#3c74d8'); E(c, -1.8, -.8, 1.6, 1.4, '#9cc4ff'); P(c, [0, -4, 3, -8, 1, -4], '#3d9a3a'); break;
    case 'pomme': case 'gpomme': {
      const r = k === 'gpomme' ? 7.5 : 5.5;
      E(c, 0, 1, r, r * .92, '#e0392f'); E(c, -r * .35, -r * .3, r * .25, r * .2, '#ff9d8f');
      c.fillStyle = '#5a3a1a'; c.fillRect(-.6, -r - 1, 1.2, 3); P(c, [.5, -r, 4, -r - 2, 1.5, -r + 1.5], '#4caf3a'); break;
    }
    case 'elixir': c.fillStyle = '#d8ecff'; c.fillRect(-2, -7, 4, 3); E(c, 0, 1, 5, 5.5, '#7a5cff'); E(c, -1.5, -1, 1.2, 2, '#c8b8ff'); break;
    case 'gexplo': E(c, 0, 1, 4.5, 5.5, '#d0532c'); E(c, -1.4, -1, 1, 1.6, '#ffb07a'); break;
    case 'gvie': E(c, 0, 1, 4.5, 5.5, '#f0d04a'); E(c, -1.4, -1, 1, 1.6, '#fff6b0'); break;
    case 'epine': c.rotate(-.6); c.fillStyle = '#b8bcc6'; c.fillRect(-7, -1, 12, 2); P(c, [5, -2.5, 9, 0, 5, 2.5], '#e8ecf4'); break;
    case 'osommeil': case 'otp': case 'ocarte': {
      const col = { osommeil: '#9a7cf0', otp: '#3ccfb0', ocarte: '#f0c040' }[k];
      E(c, 0, 1, 5.5, 5.5, col); E(c, -2, -1.5, 1.8, 1.4, 'rgba(255,255,255,.7)'); break;
    }
    case 'ecus': for (const [ox, oy] of [[-2, 3], [2, 2], [0, 0]]) { E(c, ox, oy, 3.5, 2.2, '#a87a20'); E(c, ox, oy - .7, 3.5, 2.2, '#f2c94c'); } break;
  }
  c.restore();
}
/* ---------- Pixelisation & sprites en cache ---------- */
const OUTLINE = [22, 16, 30];
// Dessine fn dans un petit canevas, seuille l’alpha (bords nets) et ajoute un contour sombre.
function pixelize(w, h, fn, outline = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); fn(x);
  const im = x.getImageData(0, 0, w, h), d = im.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
  if (outline) {
    const o = [];
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
      const i = (y * w + X) * 4; if (d[i + 3]) continue;
      if ((X > 0 && d[i - 1]) || (X < w - 1 && d[i + 7]) || (y > 0 && d[i - w * 4 + 3]) || (y < h - 1 && d[i + w * 4 + 3])) o.push(i);
    }
    for (const i of o) { d[i] = OUTLINE[0]; d[i + 1] = OUTLINE[1]; d[i + 2] = OUTLINE[2]; d[i + 3] = 255; }
  }
  x.putImageData(im, 0, 0);
  return c;
}
const cache = new Map();
const cached = (key, make) => { let c = cache.get(key); if (!c) { c = make(); cache.set(key, c); } return c; };
function sprite(sp, dir, frame) {
  return cached(`${sp}|${dir.x},${dir.y}|${frame}`, () => {
    const big = SPECIES[sp].big || 1, n = big > 1 ? Math.round(SPR * big) + 12 : SPR;
    return pixelize(n, n, x => drawCreature(x, sp, n / 2, n / 2, 20, dir, frame / 6, { frame }));
  });
}
const shadowSpr = () => cached('shadow', () => pixelize(14, 6, x => E(x, 7, 3, 6.5, 2.4, '#000'), false));
const ringSpr = col => cached('ring' + col, () => pixelize(18, 8, x => {
  E(x, 9, 4, 8.4, 3.6, col); x.globalCompositeOperation = 'destination-out'; E(x, 9, 4, 6.4, 2.2, '#000');
}, false));
const itemSpr = k => cached('it' + k, () => pixelize(16, 16, x => drawItem(x, k, 8, 8, 22)));
const trapSpr = k => cached('tr' + k, () => pixelize(16, 16, x => {
  const col = TRAPS[k].c;
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(2, 2, 12, 12);
  if (k === 'pics') { for (const ox of [4, 8, 12]) P(x, [ox - 2, 12, ox, 4, ox + 2, 12], col); }
  else { E(x, 8, 8, 5, 5, col); x.globalCompositeOperation = 'destination-out'; E(x, 8, 8, 3, 3, '#000'); }
}, false));

/* ---------- Décor (en pixels, tuiles de 16) ---------- */
function drawFloor(x, y, px, py, B, t) {
  ctx.fillStyle = B.fa; ctx.fillRect(px, py, 16, 16);
  const h = hsh(x, y);
  ctx.fillStyle = B.fb;
  ctx.fillRect(px + (h & 15), py + ((h >> 4) & 15), 2, 1);
  ctx.fillRect(px + ((h >> 8) & 15), py + ((h >> 12) & 15), 1, 1);
  ctx.fillRect(px + ((h >> 16) & 15), py + ((h >> 20) & 15), 1, 2);
  const ox = px + 2 + (h >> 5) % 11, oy = py + 3 + (h >> 9) % 10;
  switch (B.deco) {
    case 'grass':
      if (h % 5 === 0) { ctx.fillStyle = '#5f8240'; ctx.fillRect(ox, oy, 1, 3); ctx.fillRect(ox + 2, oy - 1, 1, 4); ctx.fillRect(ox + 4, oy + 1, 1, 2); }
      else if (h % 29 === 1) { ctx.fillStyle = '#f4e27a'; ctx.fillRect(ox, oy, 2, 2); ctx.fillStyle = '#fffbe0'; ctx.fillRect(ox, oy, 1, 1); }
      break;
    case 'pebble':
      if (h % 6 === 0) { ctx.fillStyle = '#8a6a46'; ctx.fillRect(ox, oy, 3, 2); ctx.fillStyle = '#d6b48a'; ctx.fillRect(ox, oy, 2, 1); }
      break;
    case 'crystal':
      if (h % 7 === 0 && Math.sin(t * 2 + h) > -.2) { ctx.fillStyle = '#c4d2ff'; ctx.fillRect(ox, oy, 1, 1); }
      break;
    case 'ember':
      if (h % 7 === 0) { ctx.fillStyle = '#4e2a24'; ctx.fillRect(ox, oy, 3, 1); ctx.fillRect(ox + 2, oy + 1, 1, 2); ctx.fillRect(ox + 3, oy + 3, 2, 1); }
      if (h % 19 === 0) { ctx.fillStyle = Math.sin(t * 3 + h) > 0 ? '#ff9a3a' : '#c84a20'; ctx.fillRect(ox + 1, oy - 2, 1, 1); }
      break;
  }
}
function drawWall(x, y, px, py, B) {
  ctx.fillStyle = B.wt; ctx.fillRect(px, py, 16, 16);
  const h = hsh(x, y);
  ctx.fillStyle = B.wf; ctx.fillRect(px + (h >> 3) % 13, py + (h >> 7) % 9, 2, 1);
  if (B.deco === 'grass' && h % 3 === 0) {
    ctx.fillStyle = '#3b6c40'; ctx.fillRect(px + 3, py + 4, 6, 4); ctx.fillRect(px + 4, py + 3, 4, 6);
    ctx.fillStyle = '#558f55'; ctx.fillRect(px + 4, py + 4, 2, 1);
  }
  if (B.deco === 'crystal' && h % 5 === 0) {
    ctx.fillStyle = '#7fd6ff'; ctx.fillRect(px + 7, py + 2, 2, 6); ctx.fillRect(px + 6, py + 4, 4, 2);
    ctx.fillStyle = '#e8faff'; ctx.fillRect(px + 7, py + 3, 1, 2);
  }
  if (B.deco === 'ember' && h % 6 === 0) { ctx.fillStyle = '#7a2a14'; ctx.fillRect(px + 6, py + 5, 3, 2); }
  if (isFloor(x, y + 1)) {
    ctx.fillStyle = B.wf; ctx.fillRect(px, py + 9, 16, 7);
    ctx.fillStyle = B.wl; ctx.fillRect(px, py + 9, 16, 1);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(px, py + 15, 16, 1);
    ctx.fillStyle = B.wt; ctx.fillRect(px + (h % 12) + 1, py + 11, 1, 3);
  }
  ctx.fillStyle = B.wl;
  if (isFloor(x, y - 1)) ctx.fillRect(px, py, 16, 1);
  if (isFloor(x - 1, y)) ctx.fillRect(px, py, 1, 16);
  if (isFloor(x + 1, y)) ctx.fillRect(px + 15, py, 1, 16);
}
function drawStairs(px, py) {
  ctx.fillStyle = '#10142e'; ctx.fillRect(px + 1, py + 1, 14, 14);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#8ea2e0' : '#d4defc';
    ctx.fillRect(px + 2 + i, py + 2 + i * 3, 12 - i * 2, 2);
  }
}

/* ---------- Boucle de rendu ---------- */
function render(now) {
  const t = now / 1000;
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!F || !G) { sctx.fillStyle = '#0d1310'; sctx.fillRect(0, 0, cv.width, cv.height); return; }
  const B = F.biome, L = leader();
  const camX = Math.round((L.rx + .5) * TS - BW / 2), camY = Math.round((L.ry + .5) * TS - BH * .42);
  ctx.globalAlpha = 1;
  ctx.fillStyle = B.void; ctx.fillRect(0, 0, BW, BH);
  const x0 = Math.max(0, Math.floor(camX / TS)), y0 = Math.max(0, Math.floor(camY / TS));
  const x1 = Math.min(W - 1, Math.ceil((camX + BW) / TS)), y1 = Math.min(H - 1, Math.ceil((camY + BH) / TS));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = y * W + x; if (!F.explored[k]) continue;
    const px = x * TS - camX, py = y * TS - camY;
    if (F.tiles[k]) drawFloor(x, y, px, py, B, t); else drawWall(x, y, px, py, B);
  }
  if (F.stairs && F.explored[F.stairs.y * W + F.stairs.x]) drawStairs(F.stairs.x * TS - camX, F.stairs.y * TS - camY);
  for (const tr of F.traps) if (tr.seen) ctx.drawImage(trapSpr(tr.k), tr.x * TS - camX, tr.y * TS - camY);
  for (const it of F.items) if (F.explored[it.y * W + it.x]) {
    const px = it.x * TS - camX, py = it.y * TS - camY;
    ctx.globalAlpha = .3; ctx.drawImage(shadowSpr(), px + 1, py + 10); ctx.globalAlpha = 1;
    ctx.drawImage(itemSpr(it.k), px, py);
  }
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = y * W + x; if (F.explored[k] && !F.vis[k]) ctx.fillRect(x * TS - camX, y * TS - camY, TS, TS);
  }
  const texts = [];
  const list = ents.filter(e => seen(e)).concat(dying).sort((a, b) => a.ry - b.ry);
  for (const e of list) {
    let px = (e.rx + .5) * TS - camX, py = (e.ry + .5) * TS - camY;
    if (e.lunge > 0) { const k = Math.sin(Math.PI * e.lunge) * .3 * TS; px += e.dir.x * k; py += e.dir.y * k; }
    px = Math.round(px); py = Math.round(py);
    const asleep = e.status.sleep > 0, big = SPECIES[e.sp].big || 1;
    let alpha = clamp(e.alpha, 0, 1);
    if (e.flash > 0 && Math.floor(e.flash * 22) % 2) alpha *= .25;
    ctx.globalAlpha = .3 * alpha;
    if (big > 1) ctx.drawImage(shadowSpr(), px - 11, py + 2, 22, 9); else ctx.drawImage(shadowSpr(), px - 7, py + 3);
    if (e.team === 'ally') { ctx.globalAlpha = alpha; ctx.drawImage(ringSpr(e === L ? '#ffe066' : '#7ee0ff'), px - 9, py + 2); }
    const frame = asleep ? 0 : Math.floor(t * 6 + e.id) % 4;
    const bob = asleep ? 0 : Math.sin(t * 5 + e.id) > .2 ? -1 : 0;
    const s = sprite(e.sp, e.dir, frame);
    ctx.globalAlpha = alpha * (SPECIES[e.sp].shape === 'ghost' ? .82 : 1);
    ctx.drawImage(s, px - (s.width >> 1), py - (s.height >> 1) + bob);
    ctx.globalAlpha = 1;
    if (asleep) texts.push({ x: px + 5, y: py - 9 - (t * 6 % 4), txt: 'z', col: '#d8ccff', sz: 9 });
    if (e.team === 'wild' && e.hp < e.maxHp && e.hp > 0) {
      const w = big > 1 ? 18 : 12, bx = px - w / 2, by = py - (big > 1 ? 22 : 12);
      ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, by - 1, w + 2, 4);
      const r = e.hp / e.maxHp;
      ctx.fillStyle = r > .5 ? '#5ad45a' : r > .2 ? '#e8c23a' : '#e84a3a';
      ctx.fillRect(bx, by, Math.max(1, Math.round(w * r)), 2);
    }
  }
  for (const p of projs) {
    const k = clamp((now - p.t0) / p.dur, 0, 1);
    const x = Math.round((p.x0 + (p.x1 - p.x0) * k + .5) * TS - camX), y = Math.round((p.y0 + (p.y1 - p.y0) * k + .5) * TS - camY);
    ctx.fillStyle = p.col; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillRect(x - 3, y - 1, 6, 2); ctx.fillRect(x - 1, y - 3, 2, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  if (flashFx) {
    const k = (now - flashFx.t0) / 350;
    if (k >= 1) flashFx = null;
    else { ctx.globalAlpha = .35 * (1 - k); ctx.fillStyle = flashFx.col; ctx.fillRect(0, 0, BW, BH); ctx.globalAlpha = 1; }
  }
  const cx = (L.rx + .5) * TS - camX, cy = (L.ry + .5) * TS - camY, inRoom = F.roomOf[L.y * W + L.x] >= 0;
  const g = ctx.createRadialGradient(cx, cy, TS * (inRoom ? 5 : 2.2), cx, cy, Math.max(BW, BH) * .75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${inRoom ? .45 : .75})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, BW, BH);

  // agrandissement net
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(buf, 0, 0, BW * Z * DPR, BH * Z * DPR);

  // textes à pleine résolution par-dessus
  sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  sctx.textAlign = 'center';
  sctx.lineJoin = 'round';
  for (const f of floats) {
    const k = (now - f.t0) / 900;
    texts.push({ x: (f.x + .5) * TS - camX, y: (f.y + .5) * TS - camY - 10 - k * 10, txt: f.txt, col: f.col, sz: 11, a: clamp(1.4 - k * 1.4, 0, 1) });
  }
  for (const s of texts) {
    sctx.globalAlpha = s.a == null ? 1 : s.a;
    sctx.font = `${s.sz * Z}px VT323, monospace`;
    const x = Math.round(s.x * Z), y = Math.round(s.y * Z);
    sctx.lineWidth = Z * 1.2; sctx.strokeStyle = '#100c18'; sctx.strokeText(s.txt, x, y);
    sctx.fillStyle = s.col; sctx.fillText(s.txt, x, y);
  }
  sctx.globalAlpha = 1; sctx.textAlign = 'start';
}
function floatT(e, txt, col) { floats.push({ x: e.x, y: e.y, txt, col, t0: performance.now() }); }

function drawMini() {
  const mc = $('#mini'), s = (miniBig ? 4.5 : VW < 520 ? 2 : 3);
  const w = Math.round(W * s), h = Math.round(H * s);
  if (mc.width !== w * DPR) { mc.width = w * DPR; mc.height = h * DPR; mc.style.width = w + 'px'; mc.style.height = h + 'px'; }
  const c = mc.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(200,220,255,.42)';
  for (let k = 0; k < W * H; k++) if (F.tiles[k] && F.explored[k]) c.fillRect((k % W) * s, ((k / W) | 0) * s, s, s);
  const dot = (x, y, col, r = 1) => { c.fillStyle = col; c.fillRect(x * s - s * (r - 1) / 2, y * s - s * (r - 1) / 2, s * r, s * r); };
  if (F.stairs && F.explored[F.stairs.y * W + F.stairs.x]) dot(F.stairs.x, F.stairs.y, '#4fa8ff', 1.6);
  for (const it of F.items) if (F.explored[it.y * W + it.x]) dot(it.x, it.y, '#ffd23a');
  for (const e of ents) if (seen(e)) dot(e.x, e.y, e.team === 'wild' ? '#ff4d4d' : e === leader() ? '#ffffff' : '#7ee0ff', e === leader() ? 1.6 : 1.3);
}

/* =====================================================================
   INTERFACE
   ===================================================================== */
function hpCol(a) { const r = a.hp / a.maxHp; return r > .5 ? '#5ad45a' : r > .2 ? '#e8c23a' : '#e84a3a'; }
function updHUD() {
  if (!F || !G) return;
  $('#floor').innerHTML = `<b>B${F.depth}F</b> ${F.biome.n} · <span class="${G.belly <= 20 ? 'low' : ''}">Ventre ${G.belly}</span> · ${G.ecus} écus`;
  $('#team').innerHTML = G.team.map((a, i) => `<div class="mem${i ? '' : ' lead'}"><div>${a.name} <small>Nv ${a.lvl}</small>${a.status.sleep ? ' <span class="z">z</span>' : ''}</div>
    <div class="bar"><i style="width:${100 * a.hp / a.maxHp}%;background:${hpCol(a)}"></i></div><div class="hp">PV ${a.hp}/${a.maxHp}</div></div>`).join('');
  const L = leader();
  $('#moves').innerHTML = L.moves.map((m, i) => {
    const M = MOVES[m.id];
    return `<button data-m="${i}" ${m.pp ? '' : 'disabled'} style="--tc:${TYPES[M.t].c}" title="${TYPES[M.t].n} · ${TG_LABEL[M.tg]}${M.p ? ' · puissance ' + M.p : ''}"><span class="k">${i + 1}</span>${M.n}<small>PP ${m.pp}/${m.max}</small></button>`;
  }).join('');
  $('#bStairs').classList.toggle('hidden', !onStairs());
  document.documentElement.style.setProperty('--logb', ($('#controls').offsetHeight + 6) + 'px');
  drawMini();
}
let logEls = [];
function say(html, cls = '') {
  const el = document.createElement('div');
  el.innerHTML = html; if (cls) el.className = cls;
  const log = $('#log'); log.appendChild(el); logEls.push(el);
  while (logEls.length > 4) logEls.shift().remove();
  setTimeout(() => el.classList.add('old'), 5500);
  setTimeout(() => { el.remove(); logEls = logEls.filter(x => x !== el); }, 6200);
}

/* ---------- Fenêtres ---------- */
const ov = $('#overlay');
let prevState = 'play';
function openOv(html) {
  if (state !== 'menu') prevState = state;
  state = 'menu'; held.clear(); padDir = null; queued = null;
  ov.dataset.cancel = '';
  ov.innerHTML = html; ov.classList.remove('hidden');
  const f = ov.querySelector('button:not([disabled])'); if (f) f.focus({ preventScroll: true });
}
function closeOv(next = 'play') { ov.classList.add('hidden'); ov.innerHTML = ''; state = next; }
function dialog(html, btns, next = 'play') {
  return new Promise(res => {
    openOv(`<div class="box">${html}<div class="btns">${btns.map((b, i) => `<button data-i="${i}" class="${b.cls || ''}">${b.t}</button>`).join('')}</div></div>`);
    ov.querySelectorAll('[data-i]').forEach(el => el.onclick = () => { closeOv(next); res(btns[+el.dataset.i].v); });
    ov.dataset.cancel = btns.length - 1;
  });
}
function spriteCanvas(sp, size = 72) { return `<canvas width="${size * 2}" height="${size * 2}" data-sp="${sp}"></canvas>`; }
function itemCanvas(k) { return `<canvas width="48" height="48" data-it="${k}"></canvas>`; }
function paintPreviews(now) {
  for (const c of ov.querySelectorAll('canvas[data-sp]')) {
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    x.imageSmoothingEnabled = false;
    const s = sprite(c.dataset.sp, { x: 0, y: 1 }, Math.floor(now / 166) % 4);
    const k = Math.max(1, Math.floor(c.width / s.width));
    x.drawImage(s, (c.width - s.width * k) >> 1, (c.height - s.height * k) >> 1, s.width * k, s.height * k);
  }
  for (const c of ov.querySelectorAll('canvas[data-it]:not(.done)')) {
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(itemSpr(c.dataset.it), 0, 0, 48, 48); c.classList.add('done');
  }
}

/* ---------- Écran titre & choix ---------- */
function showTitle() {
  G = null; F = null; ents = [];
  $('#log').innerHTML = ''; logEls = [];
  document.body.classList.add('title');
  const s = loadRun(), b = getBest();
  openOv(`<div class="box">
    <h1>BRUMES</h1><p class="sub">Une expédition dans un donjon mystère</p>
    <div style="display:flex;justify-content:center;gap:4px">${STARTERS.map(k => spriteCanvas(k, 52)).join('')}</div>
    <div class="btns">
      <button id="tNew">Nouvelle expédition</button>
      ${s ? `<button id="tCont" class="sec">Continuer (B${s.floor}F)</button>` : ''}
      <button id="tHelp" class="sec">Comment jouer</button>
    </div>
    ${b.floor ? `<p class="best">Record : B${b.floor}F${b.wins ? ` · ${b.wins} victoire${b.wins > 1 ? 's' : ''}` : ''}</p>` : ''}
  </div>`);
  ov.querySelectorAll('canvas[data-sp]').forEach(c => { c.style.width = c.style.height = '52px'; });
  $('#tNew').onclick = () => { if (!s || confirm('Abandonner l’expédition en cours ?')) chooseStarters(); };
  if (s) $('#tCont').onclick = () => { restoreRun(s); startFloor(); };
  $('#tHelp').onclick = showHelp;
}
function showHelp() {
  openOv(`<div class="box"><h2>Comment jouer</h2>
    <p>Descends les <b>10 étages</b> de la Brume et bats le gardien du volcan. Chaque pas est un tour : quand tu bouges, les ennemis bougent.</p>
    <p><b>Clavier</b> : flèches / ZQSD / WASD pour marcher (deux flèches = diagonale, ou pavé numérique). <b>Maj</b> + direction : se tourner sans bouger. <b>Espace</b> : attaque. <b>1-4</b> : capacités. <b>X</b> ou <b>5</b> : attendre. <b>I</b> : sac. <b>Entrée</b> sur l’escalier : descendre. <b>M</b> : grande carte.</p>
    <p><b>Mobile</b> : joystick à gauche (glisse le doigt), boutons à droite. ⟲ verrouille la rotation sur place.</p>
    <p>Les <b>types</b> comptent : Eau &gt; Feu &gt; Plante &gt; Eau, Électrik &gt; Eau, Roche &gt; Feu &amp; Électrik.</p>
    <p>Surveille le <b>Ventre</b> : il baisse en marchant. Vide, tu perds des PV. Les ennemis vaincus peuvent parfois <b>rejoindre l’équipe</b> (3 membres max).</p>
    <div class="btns"><button id="hB">Retour</button></div></div>`);
  $('#hB').onclick = showTitle;
}
function chooseStarters() {
  let lead = null;
  const draw = () => {
    openOv(`<div class="box"><h2>${lead ? 'Choisis ton partenaire' : 'Choisis ton héros'}</h2>
      <div class="pick">${STARTERS.map(k => {
        const s = SPECIES[k], dis = k === lead;
        return `<button class="card${dis ? ' dis sel' : ''}" data-k="${k}" ${dis ? 'disabled' : ''}>${spriteCanvas(k)}<b>${s.n}</b>
          <span class="ty" style="background:${TYPES[s.t].c}">${TYPES[s.t].n}</span><small>${s.desc}</small></button>`;
      }).join('')}</div>
      <div class="btns"><button class="sec" id="cBack">Retour</button></div></div>`);
    ov.querySelectorAll('.card').forEach(el => el.onclick = () => {
      if (!lead) { lead = el.dataset.k; draw(); } else newRun(lead, el.dataset.k);
    });
    $('#cBack').onclick = () => { if (lead) { lead = null; draw(); } else showTitle(); };
  };
  draw();
}
function newRun(a, b) {
  G = { floor: 1, belly: 100, bellyT: 0, ecus: 0, kills: 0, turns: 0, inv: [{ k: 'oran', n: 1 }, { k: 'oran', n: 1 }, { k: 'pomme', n: 1 }], team: [] };
  G.team.push(makeCreature(a, 5, 'ally'), makeCreature(b, 5, 'ally'));
  startFloor(true);
}
async function startFloor(fresh) {
  closeOv('trans');
  document.body.classList.remove('title');
  await fade(true);
  buildFloor(G.floor);
  if (fresh) saveRun();
  updHUD();
  await fade(true, floorTitle());
  await new Promise(r => setTimeout(r, 800));
  await fade(false, floorTitle());
  state = 'play';
  floorIntro();
}

/* ---------- Sac & équipe ---------- */
function openBag(tab = 'bag', sel = -1) {
  const L = leader();
  let body = '';
  if (tab === 'bag') {
    body = G.inv.length ? `<div class="list">${G.inv.map((s, i) => `<button data-s="${i}" class="${i === sel ? 'sel' : ''}">${itemCanvas(s.k)}${itemLabel(s)}</button>`).join('')}</div>`
      : '<p class="empty">Le sac est vide.</p>';
    if (sel >= 0 && G.inv[sel]) {
      const s = G.inv[sel], I = ITEMS[s.k];
      const useBtns = I.tgt ? G.team.map((a, j) => `<button data-use="${j}">Donner à ${a.name}</button>`).join('')
        : s.k === 'gvie' ? '' : `<button data-use="0">${I.thr ? 'Lancer' : 'Utiliser'}</button>`;
      body += `<div class="det"><b>${I.n}</b><p>${I.d}</p><div class="btns">${useBtns}<button class="sec" data-drop>Poser</button></div></div>`;
    }
    body += `<p class="help">${G.inv.length}/${INV_MAX} objets · ${G.ecus} écus</p>`;
  } else if (tab === 'team') {
    body = G.team.map(a => `<div class="tm">${spriteCanvas(a.sp, 56)}<div style="flex:1">
      <b>${a.name}</b> <small>Nv ${a.lvl} · ${TYPES[SPECIES[a.sp].t].n}</small>
      <div class="st">PV ${a.hp}/${a.maxHp} · Att ${Math.round(a.atk)} · Déf ${Math.round(a.def)} · Exp ${a.xp}/${xpNeed(a.lvl)}</div>
      <div class="mv">${a.moves.map(m => `<span style="--tc:${TYPES[MOVES[m.id].t].c}">${MOVES[m.id].n} <small>${m.pp}/${m.max}</small></span>`).join('')}</div></div></div>`).join('');
  } else {
    body = `<div class="btns" style="justify-content:flex-start">
      <button data-opt="mute">Son : ${muted ? 'coupé' : 'activé'}</button>
      <button data-opt="title" class="sec">Sauver et quitter</button></div>
      <p class="help">La partie est sauvegardée au début de chaque étage.</p>`;
  }
  openOv(`<div class="box"><div class="tabs">
    <button data-tab="bag" class="${tab === 'bag' ? 'on' : ''}">Sac</button>
    <button data-tab="team" class="${tab === 'team' ? 'on' : ''}">Équipe</button>
    <button data-tab="opt" class="${tab === 'opt' ? 'on' : ''}">Options</button>
    <button class="x" data-close>✕</button></div>${body}</div>`);
  ov.dataset.cancel = 'close';
  ov.querySelectorAll('[data-tab]').forEach(el => el.onclick = () => openBag(el.dataset.tab));
  ov.querySelector('[data-close]').onclick = () => closeOv();
  ov.querySelectorAll('[data-s]').forEach(el => el.onclick = () => openBag('bag', +el.dataset.s));
  ov.querySelectorAll('[data-use]').forEach(el => el.onclick = () => {
    closeOv();
    if (useItem(sel, G.team[+el.dataset.use])) endTurn(); else updHUD();
  });
  const dr = ov.querySelector('[data-drop]');
  if (dr) dr.onclick = () => {
    closeOv();
    if (itemAt(L.x, L.y) || onStairs()) { say('Impossible de poser un objet ici.', 'warn'); return; }
    const s = G.inv[sel]; F.items.push({ x: L.x, y: L.y, k: s.k, n: s.n }); G.inv.splice(sel, 1);
    say(`Vous posez : ${itemLabel(s)}.`); endTurn();
  };
  ov.querySelectorAll('[data-opt]').forEach(el => el.onclick = () => {
    if (el.dataset.opt === 'mute') { muted = !muted; openBag('opt'); }
    else { closeOv('title'); showTitle(); }
  });
  if (sel >= 0) { const f = ov.querySelector('[data-use],[data-drop]'); if (f) f.focus({ preventScroll: true }); }
}

/* ---------- Son ---------- */
let AC = null;
function tone(f0, f1, dur, type = 'square', vol = .05, delay = 0) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + .02);
  } catch (e) { /* audio indisponible */ }
}
function sfx(k) {
  if (muted) return;
  switch (k) {
    case 'hit': tone(220, 80, .1, 'square', .045); break;
    case 'atk': tone(500, 300, .05, 'triangle', .04); break;
    case 'move': tone(300, 700, .12, 'sawtooth', .025); break;
    case 'miss': tone(600, 520, .06, 'sine', .03); break;
    case 'pick': tone(880, 1320, .08, 'square', .03); break;
    case 'heal': tone(500, 1000, .2, 'sine', .05); break;
    case 'lvl': [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .12, 'square', .035, i * .09)); break;
    case 'faint': tone(400, 60, .4, 'triangle', .06); break;
    case 'stairs': tone(700, 120, .5, 'triangle', .06); break;
    case 'alarm': [0, .18, .36].forEach(d => tone(880, 440, .14, 'square', .04, d)); break;
  }
}

/* =====================================================================
   ENTRÉES
   ===================================================================== */
const KEYDIR = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0],
  Numpad8: [0, -1], Numpad2: [0, 1], Numpad4: [-1, 0], Numpad6: [1, 0],
  Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1],
};
const held = new Set();
let padDir = null, dirAt = 0, queued = null, autoT = 0;
function heldDir() {
  let dx = 0, dy = 0;
  for (const k of held) { const d = KEYDIR[k]; if (d) { dx += d[0]; dy += d[1]; } }
  if (padDir) { dx += padDir[0]; dy += padDir[1]; }
  return [sign(dx), sign(dy)];
}
function queue(fn) { if (state === 'play') queued = fn; }
addEventListener('keydown', e => {
  if (state === 'menu') {
    const btns = [...ov.querySelectorAll('button:not([disabled])')];
    if (e.key === 'Escape') {
      e.preventDefault();
      if (ov.dataset.cancel === 'close') closeOv();
      else { const b = ov.querySelector(`[data-i="${ov.dataset.cancel}"]`); if (b) b.click(); }
    } else if (/^Arrow/.test(e.key) && btns.length) {
      e.preventDefault();
      const i = btns.indexOf(document.activeElement), d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
      btns[(i + d + btns.length) % btns.length].focus();
    } else if ((e.code === 'KeyI' || e.code === 'Tab') && ov.dataset.cancel === 'close') { e.preventDefault(); closeOv(); }
    return;
  }
  if (state !== 'play') return;
  if (KEYDIR[e.code]) { e.preventDefault(); if (!held.has(e.code)) { held.add(e.code); dirAt = performance.now(); } return; }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { held.add('Shift'); return; }
  if (e.repeat) return;
  const L = leader();
  switch (e.code) {
    case 'Space': e.preventDefault(); queue(() => leaderMove(-1)); break;
    case 'Enter': case 'NumpadEnter': e.preventDefault(); queue(() => onStairs() ? askStairs() : leaderMove(-1)); break;
    case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': { const i = +e.code.slice(5) - 1; if (L.moves[i]) queue(() => leaderMove(i)); break; }
    case 'KeyX': case 'Numpad5': case 'Period': queue(() => endTurn()); break;
    case 'KeyI': case 'Tab': case 'KeyB': e.preventDefault(); openBag(); break;
    case 'KeyM': miniBig = !miniBig; drawMini(); break;
    case 'KeyN': muted = !muted; break;
  }
});
addEventListener('keyup', e => { held.delete(e.code); if (e.key === 'Shift') held.delete('Shift'); });
addEventListener('blur', () => { held.clear(); padDir = null; });

// Joystick tactile
const pad = $('#pad'), knob = $('#padKnob');
function padFrom(e) {
  const r = pad.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
  const d = Math.hypot(x, y), m = r.width / 2 - 23, k = Math.min(1, m / (d || 1));
  knob.style.transform = `translate(${x * k}px,${y * k}px)`;
  if (d < r.width * .17) { padDir = null; return; }
  const a = Math.round(Math.atan2(y, x) / (Math.PI / 4));
  const nd = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]][(a + 8) % 8];
  if (!padDir || padDir[0] !== nd[0] || padDir[1] !== nd[1]) { padDir = nd; dirAt = performance.now() - 30; }
}
pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); padFrom(e); });
pad.addEventListener('pointermove', e => { if (pad.hasPointerCapture(e.pointerId)) padFrom(e); });
const padEnd = () => { padDir = null; knob.style.transform = ''; };
pad.addEventListener('pointerup', padEnd); pad.addEventListener('pointercancel', padEnd);

$('#moves').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) queue(() => leaderMove(+b.dataset.m)); });
$('#bAtk').onclick = () => queue(() => leaderMove(-1));
$('#bWait').onclick = () => queue(() => endTurn());
$('#bTurn').onclick = () => { turnMode = !turnMode; $('#bTurn').classList.toggle('on', turnMode); };
$('#bStairs').onclick = () => queue(() => askStairs());
$('#bBag').onclick = () => { if (state === 'play') openBag(); };
$('#mini').onclick = () => { miniBig = !miniBig; drawMini(); };
for (const b of document.querySelectorAll('#controls button')) b.addEventListener('pointerdown', e => e.preventDefault());

/* ---------- Boucle principale ---------- */
function busy(now) {
  return now < lockUntil || projs.length > 0 ||
    ents.some(e => Math.abs(e.rx - e.x) > .001 || Math.abs(e.ry - e.y) > .001 || e.lunge > 0);
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const sp = dt * 9;
  for (const e of ents) {
    e.rx += clamp(e.x - e.rx, -sp, sp); e.ry += clamp(e.y - e.ry, -sp, sp);
    if (e.lunge > 0) e.lunge = Math.max(0, e.lunge - dt * 5);
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
    if (e.alpha < 1 && !dying.includes(e)) e.alpha = Math.min(1, e.alpha + dt * 3);
  }
  for (const e of dying) e.alpha -= dt * 2.5;
  dying = dying.filter(e => e.alpha > 0);
  projs = projs.filter(p => now - p.t0 < p.dur);
  floats = floats.filter(f => now - f.t0 < 900);

  if (state === 'play' && G && !busy(now)) {
    const L = leader();
    if (L.status.sleep > 0) {
      if (now > autoT) { autoT = now + 380; L.status.sleep--; say(`${nm(L)} dort profondément…`); endTurn(); }
    } else if (queued) { const a = queued; queued = null; a(); }
    else {
      const [dx, dy] = heldDir();
      if ((dx || dy) && now - dirAt > 45) leaderStep(dx, dy, held.has('Shift') || turnMode);
    }
  }
  render(now);
  if (state === 'menu') paintPreviews(now);
  requestAnimationFrame(frame);
}

addEventListener('resize', resize);
resize();
showTitle();
requestAnimationFrame(frame);
