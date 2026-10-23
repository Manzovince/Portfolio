// Parser : transcription → champs du formulaire.
// Le texte complet est re-parsé à chaque mise à jour (résultats intermédiaires compris),
// ce qui rend la saisie robuste aux corrections de la reconnaissance vocale.
// Les sections se remplissent dans l'ordre chronologique : un mot propre à une
// section suivante fait avancer le curseur.

export const SECTIONS = ['id', 'mission', 'effet'];

export const MISSION_TYPES = {
  emblee: 'Emblée',
  mettre_en_place: 'Mettre en place',
  mep_decentree: 'Mise en place décentrée',
  preparer: 'Préparer',
  renouveler: 'Renouveler',
  accrochage: 'Accrochage',
};
export const DEFAULT_TYPE = 'emblee';

export const EFFECTS = {
  neutralisation: 'Neutralisation',
  destruction: 'Destruction',
  arret: 'Arrêt',
  aveuglement: 'Aveuglement',
  eclairement: 'Éclairement',
};
export const DEFAULT_EFFECT = 'neutralisation';

// Lettres de mission : A à H uniquement.
export const NATO_WORDS = {
  A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel',
};

// Variantes entendues par la reconnaissance française (sans accents, en minuscules).
const NATO_ALIASES = {
  A: ['alpha', 'alfa', 'al fa', 'alphas'], B: ['bravo', 'bravos'],
  C: ['charlie', 'charly', 'charli', 'charlies'], D: ['delta', 'del ta', 'deltas'],
  E: ['echo', 'eco', 'ecco', 'eko', 'echos'], F: ['foxtrot', 'fox trot', 'fox trott', 'foxtrott', 'fox'],
  G: ['golf', 'golfe', 'golfs'], H: ['hotel', 'hotels', 'otel'],
};

const TYPE_ALIASES = {
  emblee: ['emblee', 'd emblee', 'en blee', 'amblee', 'emble', 'en ble', 'emblees'],
  mettre_en_place: ['mettre en place', 'mise en place', 'mis en place', 'met en place', 'mettre en plasse'],
  mep_decentree: ['mise en place decentree', 'mettre en place decentree', 'mis en place decentree',
    'mise en place des centrees', 'mise en place de centree', 'decentree', 'decentre'],
  preparer: ['preparer', 'prepare', 'preparez', 'preparation'],
  renouveler: ['renouveler', 'renouvele', 'renouvelle', 'renouvellement'],
  accrochage: ['accrochage', 'accroche', 'a crochage', 'accrochages'],
};

const EFFECT_ALIASES = {
  neutralisation: ['neutralisation', 'neutraliser', 'neutralise'],
  destruction: ['destruction', 'detruire'],
  arret: ['arret', 'arrete', 'arreter', 'arrets'],
  aveuglement: ['aveuglement', 'aveugler'],
  eclairement: ['eclairement', 'eclairage', 'eclairer'],
};

const LEXICON = [];
const add = (kind, value, phrases) => {
  for (const p of phrases) LEXICON.push({ kind, value, words: p.split(' ') });
};
for (const [l, a] of Object.entries(NATO_ALIASES)) add('letter', l, a);
for (const [t, a] of Object.entries(TYPE_ALIASES)) add('type', t, a);
for (const [e, a] of Object.entries(EFFECT_ALIASES)) add('effect', e, a);
add('panache', true, ['panache', 'panacher', 'panaches', 'panachee', 'pana che', 'panachez']);
add('goto', 0, ['identification', 'ident', 'indicatif']);
add('goto', 1, ['mission', 'type de mission']);
add('goto', 2, ['effet', 'effets']);
add('fix', true, ['correction', 'erreur', 'annule', 'annuler']);
add('stop', true, ['termine', 'terminer', 'fin', 'fin de message', 'fin du message']);
// Le plus long d'abord : « mise en place décentrée » l'emporte sur « mise en place ».
LEXICON.sort((a, b) => b.words.length - a.words.length);

const UNITS = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8,
  neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
};
const TENS = {
  vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  septante: 70, huitante: 80, octante: 80, nonante: 90,
};

export const norm = (s) => s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

export function tokenize(text) {
  const out = [];
  for (const m of text.matchAll(/\p{L}+|\p{N}+/gu)) {
    out.push({ text: m[0], n: norm(m[0]), start: m.index, end: m.index + m[0].length, sec: null, kind: null });
  }
  return out;
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

// Tolérance : mots courts exacts, 1 faute dès 5 lettres, 2 fautes dès 8.
function close(word, target) {
  if (word === target) return true;
  if (target.length <= 4) return false;
  return lev(word, target) <= (target.length >= 8 ? 2 : 1);
}

function matchLexicon(toks, i) {
  for (const e of LEXICON) {
    if (i + e.words.length > toks.length) continue;
    if (e.words.every((w, k) => close(toks[i + k].n, w))) return { ...e, len: e.words.length };
  }
  return null;
}

// Nombre à la position i : chiffres ("12", "1234") ou mots ("trente-quatre", "quatre-vingt-dix-sept").
// Renvoie une chaîne de chiffres (1 chiffre si < 10) et le nombre de jetons consommés.
function matchNumber(toks, i) {
  const t = toks[i].n;
  if (/^\d+$/.test(t)) return { digits: t, len: 1 };
  const at = (k) => toks[i + k]?.n;
  // Compléments 1..19 après une dizaine ("vingt et un", "soixante-dix-sept").
  const tail = (k, allowTeens) => {
    let j = k;
    if (at(j) === 'et') j++;
    const u = UNITS[at(j)];
    if (u === undefined || u === 0) return null;
    if (u === 10 && allowTeens && ['sept', 'huit', 'neuf'].includes(at(j + 1))) return { v: 10 + UNITS[at(j + 1)], len: j + 2 - k };
    if (u >= 10 && !allowTeens) return null;
    return { v: u, len: j + 1 - k };
  };
  let base = null, used = 0, teens = false;
  if (t === 'quatre' && (at(1) === 'vingt' || at(1) === 'vingts')) { base = 80; used = 2; teens = true; }
  else if (TENS[t] !== undefined) { base = TENS[t]; used = 1; teens = t === 'soixante'; }
  if (base !== null) {
    const x = tail(used, teens);
    return { digits: String(base + (x ? x.v : 0)), len: used + (x ? x.len : 0) };
  }
  if (t === 'dix' && ['sept', 'huit', 'neuf'].includes(at(1))) return { digits: String(10 + UNITS[at(1)]), len: 2 };
  if (UNITS[t] !== undefined) return { digits: String(UNITS[t]), len: 1 };
  return null;
}

// Regroupe les chiffres annoncés en nombres à 2 chiffres :
// "1 2" → 12 ; "zéro cinq" → 05 ; "5" puis "12" → 05 12 ; "1234" → 12 34.
function numAcc() {
  return { vals: [], pending: null };
}
function accPush(acc, digits) {
  // Deux nombres déjà complets : on considère qu'ils sont ré-annoncés.
  if (acc.vals.length >= 2 && acc.pending === null) acc.vals = [];
  if (digits.length === 1) {
    if (acc.pending !== null) { acc.vals.push(acc.pending + digits); acc.pending = null; }
    else acc.pending = digits;
    return;
  }
  if (acc.pending !== null) { acc.vals.push('0' + acc.pending); acc.pending = null; }
  let d = digits;
  while (d.length >= 2) { acc.vals.push(d.slice(0, 2)); d = d.slice(2); }
  if (d) acc.pending = d;
}
function accFlush(acc) {
  if (acc.pending !== null) { acc.vals.push('0' + acc.pending); acc.pending = null; }
}

const idDone = (s) => s.id.vals.length >= 2;
const missionDone = (s) => !!s.mission.letter && s.mission.confirm === s.mission.letter;
const effetDone = (s) => !s.effet.panache || s.effet.nums.vals.length >= 2;
const started = [
  (s) => s.id.vals.length > 0 || s.id.pending !== null,
  (s) => !!(s.mission.letter || s.mission.type),
  (s) => !!(s.effet.effect || s.effet.panache || s.effet.nums.vals.length || s.effet.nums.pending !== null),
];
const resetSection = (s, k) => {
  if (k === 0) s.id = numAcc();
  if (k === 1) s.mission = { letter: null, type: null, confirm: null };
  if (k === 2) s.effet = { effect: null, panache: false, implicit: false, nums: numAcc() };
};

// ignoreStops : nombre de « terminé » déjà traités (dictée reprise après la vérification).
export function parse(text, { final = false, ignoreStops = 0 } = {}) {
  const toks = tokenize(text);
  const s = { cur: 0, stop: false };
  let stops = 0;
  resetSection(s, 0); resetSection(s, 1); resetSection(s, 2);

  const moveTo = (k) => {
    if (s.cur === 0 && k !== 0) accFlush(s.id);
    if (s.cur === 2 && k !== 2) accFlush(s.effet.nums);
    s.cur = k;
  };
  const mark = (i, len, sec, kind) => {
    for (let k = i; k < i + len; k++) { toks[k].sec = sec; toks[k].kind = kind; }
  };

  let i = 0;
  while (i < toks.length) {
    const m = matchLexicon(toks, i);
    if (m) {
      if (m.kind === 'stop') {
        mark(i, m.len, 'cmd', 'stop');
        if (++stops > ignoreStops) { s.stop = true; s.stopAt = toks[i].start; break; }
        i += m.len;
        continue;
      }
      if (m.kind === 'fix') {
        // Efface la section en cours ; si elle est vide, revient à la précédente.
        let k = s.cur;
        if (!started[k](s) && k > 0) k--;
        resetSection(s, k);
        s.cur = k;
        for (const t of toks.slice(0, i)) if (t.sec === k) t.kind = 'erased';
        mark(i, m.len, 'cmd', 'fix');
      } else if (m.kind === 'goto') {
        moveTo(m.value);
        mark(i, m.len, m.value, 'label');
      } else if (m.kind === 'letter') {
        if (s.cur <= 1) {
          moveTo(1);
          const ms = s.mission;
          if (!ms.letter) ms.letter = m.value;
          else if (!ms.confirm) ms.confirm = m.value;
          else s.mission = { letter: m.value, type: null, confirm: null }; // mission ré-annoncée
          mark(i, m.len, 1, 'letter');
        }
      } else if (m.kind === 'type') {
        if (s.cur <= 1) { moveTo(1); s.mission.type = m.value; mark(i, m.len, 1, 'type'); }
      } else if (m.kind === 'effect') {
        moveTo(2); s.effet.effect = m.value; mark(i, m.len, 2, 'effect');
      } else if (m.kind === 'panache') {
        moveTo(2);
        if (s.effet.nums.vals.length >= 2) s.effet.nums = numAcc();
        s.effet.panache = true; s.effet.implicit = false;
        mark(i, m.len, 2, 'panache');
      }
      i += m.len;
      continue;
    }
    const n = matchNumber(toks, i);
    if (n) {
      if (s.cur === 0) { accPush(s.id, n.digits); mark(i, n.len, 0, 'num'); }
      else if (s.cur === 2) {
        // Nombres sans le mot « panaché » : on suppose qu'il a été mal entendu.
        if (!s.effet.panache) { s.effet.panache = true; s.effet.implicit = true; }
        accPush(s.effet.nums, n.digits); mark(i, n.len, 2, 'num');
      }
      i += n.len;
      continue;
    }
    i++;
  }
  if (final || s.stop) { accFlush(s.id); accFlush(s.effet.nums); }

  const done = [idDone(s), missionDone(s), effetDone(s)];
  let focus = s.cur;
  if (focus < 2 && done[focus]) focus++;

  return {
    tokens: toks,
    cur: s.cur,
    focus,
    stop: s.stop,
    stopAt: s.stopAt ?? null,
    done,
    started: started.map((f) => f(s)),
    id: { vals: s.id.vals.slice(0, 2), pending: s.id.pending },
    mission: {
      letter: s.mission.letter,
      type: s.mission.type,
      confirm: s.mission.confirm,
      mismatch: !!(s.mission.confirm && s.mission.confirm !== s.mission.letter),
    },
    effet: {
      effect: s.effet.effect,
      panache: s.effet.panache,
      implicit: s.effet.implicit,
      nums: s.effet.nums.vals.slice(0, 2),
      pending: s.effet.nums.pending,
    },
  };
}

// Champs éditables (écran de validation) à partir d'un résultat de parse.
export function toDraft(p) {
  return {
    id1: p.id.vals[0] ?? '',
    id2: p.id.vals[1] ?? '',
    letter: p.mission.letter ?? '',
    type: p.mission.type ?? DEFAULT_TYPE,
    effect: p.effet.effect ?? DEFAULT_EFFECT,
    panache: p.effet.panache,
    p1: p.effet.nums[0] ?? '',
    p2: p.effet.nums[1] ?? '',
  };
}

export function draftErrors(d) {
  const e = {};
  const two = (v) => /^\d{2}$/.test(v);
  if (!two(d.id1)) e.id1 = true;
  if (!two(d.id2)) e.id2 = true;
  if (!/^[A-H]$/.test(d.letter)) e.letter = true;
  if (d.panache && !two(d.p1)) e.p1 = true;
  if (d.panache && !two(d.p2)) e.p2 = true;
  return e;
}

export function formatMessage(d) {
  const lines = [
    ['IDENT', `${d.id1 || '--'} ${d.id2 || '--'}`],
    ['MISSION', `${d.letter || '-'} ${MISSION_TYPES[d.type].toUpperCase()} ${d.letter || '-'}`],
    ['EFFET', EFFECTS[d.effect].toUpperCase() + (d.panache ? ` PANACHÉ ${d.p1 || '--'} ${d.p2 || '--'}` : '')],
  ];
  return lines;
}
