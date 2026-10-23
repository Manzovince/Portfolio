// Parser : transcription → valeurs des 11 cadres.
// Le texte complet est re-parsé à chaque mise à jour (résultats intermédiaires compris).
// Les cadres se remplissent dans l'ordre : un mot propre à un cadre suivant fait avancer,
// les nombres vont dans la case suivante du cadre en cours (ou sont aiguillés par un mot-clé).

import { CADRES, FIELD, ROW_KIND, ROW_KEYS, OPT, locationOk } from './form.js?v=5';

export const SECTION_NAMES = CADRES.map((c) => c.title);
export const redoMarker = (k) => `⟦r${k}⟧`;

export const norm = (s) => s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

export function tokenize(text) {
  const out = [];
  for (const m of text.matchAll(/⟦r\d+⟧|\p{L}+|\p{N}+/gu)) {
    out.push({ text: m[0], n: norm(m[0]), start: m.index, end: m.index + m[0].length, sec: null, kind: null });
  }
  return out;
}

/* ---------- Lexique ---------- */

const LEXICON = [];
// c : index du cadre (0–10), -1 commande, -2 lettre (aiguillée selon le contexte).
const add = (c, phrases, entry) => {
  for (const p of phrases) LEXICON.push({ c, words: p.split(' '), ...entry });
};
const setE = (c, key, map, extra = {}) => {
  for (const [value, phrases] of Object.entries(map)) add(c, phrases, { kind: 'set', set: { [key]: value }, ...extra[value] });
};

add(-1, ['termine', 'terminer', 'fin', 'fin de message', 'fin du message'], { kind: 'stop' });
add(-1, ['correction', 'erreur', 'annule', 'annuler'], { kind: 'fix' });

const LETTER_ALIASES = {
  A: ['alpha', 'alfa', 'al fa', 'alphas'], B: ['bravo', 'bravos'],
  C: ['charlie', 'charly', 'charli', 'charlies'], D: ['delta', 'del ta', 'deltas'],
  E: ['echo', 'eco', 'ecco', 'eko', 'echos'], F: ['foxtrot', 'fox trot', 'fox trott', 'foxtrott', 'fox'],
  G: ['golf', 'golfe', 'golfs'], H: ['hotel', 'hotels', 'otel'],
};
for (const [L, a] of Object.entries(LETTER_ALIASES)) add(-2, a, { kind: 'letter', value: L });

// Cadre 1
add(0, ['identification', 'ident', 'indicatif'], { kind: 'goto' });
// Cadre 2
add(1, ['type de mission', 'mission'], { kind: 'goto' });
setE(1, 'type', {
  emblee: ['emblee', 'd emblee', 'en blee', 'amblee', 'emble', 'en ble', 'emblees'],
  mettre_en_place: ['mettre en place', 'mise en place', 'mis en place', 'met en place'],
  mep_decentree: ['mise en place decentree', 'mettre en place decentree', 'mis en place decentree',
    'mise en place des centrees', 'mise en place de centree', 'decentree', 'decentre'],
  preparer: ['preparer', 'prepare', 'preparez', 'preparation'],
  renouveler: ['renouveler', 'renouvele', 'renouvelle', 'renouvellement'],
  accrochage: ['accrochage', 'accroche', 'a crochage', 'accrochages'],
}, { mettre_en_place: { cursor: 'mepBox' }, mep_decentree: { cursor: 'mepBox' }, renouveler: { cursor: 'ren1' } });
// Cadre 3
add(2, ['effet', 'effets'], { kind: 'goto' });
setE(2, 'effect', {
  neutralisation: ['neutralisation', 'neutraliser', 'neutralise'],
  destruction: ['destruction', 'detruire'],
  arret: ['arret', 'arrete', 'arreter', 'arrets'],
  aveuglement: ['aveuglement', 'aveugler'],
  eclairement: ['eclairement', 'eclairer'],
});
add(2, ['semonce', 'semonces'], { kind: 'semonce' });
setE(2, 'spectre', { visible: ['visible', 'visibles', 'visib'], ir: ['ir', 'i r', 'infrarouge', 'infra rouge'] });
add(2, ['panache', 'panacher', 'panaches', 'panachee', 'pana che', 'panachez'], { kind: 'panache' });
setE(2, 'munition', {
  explo: ['explo', 'explosif', 'explosive', 'explosifs'],
  fumigene: ['fumigene', 'fumigenes', 'fumi', 'fumee'],
  aced: ['aced', 'a c e d', 'a ced'],
  ecl: ['ecl', 'eclairant', 'eclairante', 'eclairants', 'eclairage'],
});
// Cadre 4
add(3, ['nombre de coups', 'nb de coups', 'nombre coups'], { kind: 'cursor', cursor: 'coups' });
add(3, ['duree'], { kind: 'cursor', cursor: 'duree' });
add(3, ['intervalle', 'intervalle entre les coups', 'intervalles'], { kind: 'cursor', cursor: 'interv' });
add(3, ['coups', 'coup', 'cps'], { kind: 'unit', key: 'coups' });
add(3, ['minutes', 'minute', 'min', 'mn'], { kind: 'unit', key: 'duree' });
add(3, ['secondes', 'seconde', 'sec'], { kind: 'unit', key: 'interv' });
// Cadre 5
add(4, ['lanceurs', 'lanceur'], { kind: 'unit', key: 'lanceurs' });
setE(4, 'arme', {
  mo81: ['mo 81', 'mortier 81', 'mortier de 81', 'mortiers de 81', '81 mm', '81 millimetres'],
  mo120: ['mo 120', 'mortier 120', 'mortier de 120', 'mortiers de 120', '120 mm', '120 millimetres'],
  c155: ['155 mm', '155 millimetres', 'canon', 'canons', 'caesar', 'cesar', 'canon de 155'],
  lru: ['lru', 'l r u', 'elle r u', 'lance roquettes', 'lance roquette'],
});
add(4, ['mortier', 'mortiers', 'mo'], { kind: 'cursor', cursor: '_calibre' });
add(4, ['trajectoire', 'trajectoires'], { kind: 'cursor', cursor: '_traj' });
add(4, ['plongeante', 'plongeant'], { kind: 'traj', value: 'plongeante' });
add(4, ['verticale', 'vertical'], { kind: 'traj', value: 'verticale' });
add(4, ['nominale', 'nominal'], { kind: 'traj', value: 'nominale' });
add(4, ['mode', 'modes'], { kind: 'cursor', cursor: '_mode' });
add(4, ['percutant instantane', 'instantane', 'percutant', 'percutante'], { kind: 'mode', value: 'pi' });
add(4, ['percutant court retard', 'court retard', 'courte retard'], { kind: 'mode', value: 'pcr', cursor: 'crMs' });
add(4, ['fusant', 'fusants', 'fusante'], { kind: 'mode', value: 'fusant', cursor: 'fusM' });
add(4, ['retard'], { kind: 'mode', value: 'retard', cursor: 'retMs' });
// Cadre 6
add(5, ['objectif'], { kind: 'goto' });
setE(5, 'cible', {
  chars: ['chars', 'char'], blindes: ['blindes legers', 'blindes', 'blinde leger', 'blinde'],
  pickup: ['pick up', 'pickup', 'pick', 'pickups', 'pic up'], personnel: ['personnel', 'personnels', 'personnes'],
  artillerie: ['artillerie'], batiment: ['batiment', 'batiments'],
});
setE(5, 'etat', {
  mouvement: ['en mouvement', 'mouvement'], arret: ['a l arret', 'arret', 'arrete', 'a l arrete'],
  decouvert: ['a decouvert', 'decouvert'], abrite: ['abrite', 'abrites', 'abri'],
  observateur: ['observateur', 'observateurs'], pieces: ['pieces', 'piece'],
});
// Cadre 7
add(6, ['localisation', 'polaires', 'polaire', 'rectangulaires', 'rectangulaire', 'pour moi'], { kind: 'goto' });
for (const [k, ph] of Object.entries({
  g: ['gisement'], d: ['distance'], s: ['site'], x: ['x', 'ixe', 'iks'], y: ['y', 'igrec', 'i grec'],
  z: ['z', 'zed', 'zede'], fu: ['fuseau', 'fuseaux'], ba: ['bande', 'bandes'],
})) add(6, ph, { kind: 'rowlabel', key: k });
add(6, ['repere', 'repere tir', 'reperes'], { kind: 'goto' });
const dir = (c, phrases, key, value, guard) => add(c, phrases, { kind: 'set', set: { [key + 'dir']: value }, cursor: key, guard });
dir(6, ['plus a l est', 'a l est', 'l est'], 'repEO', 'E');
dir(6, ['est'], 'repEO', 'E', 'num');
dir(6, ['plus a l ouest', 'a l ouest', 'ouest'], 'repEO', 'O');
dir(6, ['plus au nord', 'au nord', 'nord'], 'repNS', 'N');
dir(6, ['plus au sud', 'au sud', 'sud'], 'repNS', 'S');
dir(6, ['plus a droite', 'a droite', 'droite'], 'pmDG', 'D');
dir(6, ['plus a gauche', 'a gauche', 'gauche'], 'pmDG', 'G');
dir(6, ['plus pres', 'pres'], 'pmPL', 'P');
dir(6, ['plus loin', 'loin'], 'pmPL', 'L');
dir(6, ['plus haut', 'haut'], 'pmHB', 'H');
dir(6, ['plus bas', 'bas'], 'pmHB', 'B');
add(6, ['tle', 't l e', 'precision', 'precision de localisation'], { kind: 'cursor', cursor: 'tle' });
// Cadre 8
add(7, ['gerbe'], { kind: 'goto' });
setE(7, 'geom', {
  convergent: ['convergent', 'convergente', 'convergence'], lineaire: ['lineaire', 'lineaires'],
  surfacique: ['surfacique', 'surfaciques'], circulaire: ['circulaire', 'circulaires'],
});
add(7, ['point central'], { kind: 'cursor', cursor: 'pc' });
add(7, ['centre'], { kind: 'cursor', cursor: 'centre' });
add(7, ['gisement'], { kind: 'cursor', cursor: 'gis8' });
add(7, ['front'], { kind: 'cursor', cursor: 'front' });
add(7, ['profondeur'], { kind: 'cursor', cursor: 'prof' });
add(7, ['rayon'], { kind: 'cursor', cursor: 'rayon' });
setE(7, 'ouvert', { ouvert: ['ouvert', 'ouverte'], ferme: ['ferme', 'fermee'] });
// Cadre 9
add(8, ['mise en place'], { kind: 'goto' });
setE(8, 'mep9', {
  grille: ['grille'],
  dpm: ['deplacement du point moyen', 'deplacement point moyen', 'deplacement', 'point moyen', 'dpm', 'd p m'],
});
add(8, ['gisement d observation', 'gisement observation', 'gisement d observ', 'gisement de l observateur', 'gisement'], { kind: 'cursor', cursor: 'gisObs' });
add(8, ['observateur'], { kind: 'cursor', cursor: 'obsX' });
add(8, ['x', 'ixe', 'iks'], { kind: 'cursor', cursor: 'obsX' });
add(8, ['y', 'igrec', 'i grec'], { kind: 'cursor', cursor: 'obsY' });
add(8, ['z', 'zed', 'zede'], { kind: 'cursor', cursor: 'obsZ' });
// Cadre 10
add(9, ['amis', 'amis les plus proches', 'amis plus proches', 'ami', 'amis proches'], { kind: 'cursor', cursor: 'amisDist' });
add(9, ['distance'], { kind: 'cursor', cursor: 'amisDist' });
add(9, ['gisement'], { kind: 'cursor', cursor: 'amisGis' });
setE(9, 'amisDir', { N: ['nord'], S: ['sud'], E: ['est'], O: ['ouest'] });
add(9, ['posture', 'posture de protection'], { kind: 'cursor', cursor: 'posture' });
setE(9, 'posture', { 1: ['a decouvert', 'decouvert'], 2: ['abrite', 'abrites', 'abri'], 3: ['sous blindage', 'blindage', 'blinde'] });
// Cadre 11
setE(10, 'tir', {
  amc: ['a mon commandement', 'mon commandement'],
  ap: ['aussitot pret', 'aussi tot pret'],
  apl: ['aussitot pret limite', 'aussi tot pret limite', 'pret limite', 'nlt'],
  synchro: ['synchro', 'synchronisation', 'synchronise'],
  hso: ['heure sur objectif', 'hso', 'h s o'],
  hsol: ['hso limite', 'h s o limite', 'heure sur objectif limite'],
  hdt: ['heure de tir'],
}, Object.fromEntries(['apl', 'synchro', 'hso', 'hsol', 'hdt'].map((k) => [k, { cursor: 'h1' }])));
add(10, ['au commandement de', 'au commandement du', 'au commandement d'], { kind: 'acd' });
add(10, ['debut'], { kind: 'cursor', cursor: 'h1' });

const UNITS = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8,
  neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
};
const TENS = {
  vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  septante: 70, huitante: 80, octante: 80, nonante: 90,
};
// Mots ignorés entre deux nombres sans casser leur enchaînement.
const SKIP_UNITS = new Set(['m', 'metre', 'metres', 'ms', 'millisecondes', 'milliseconde', 'mils', 'mil',
  'millieme', 'milliemes', 'h', 'heure', 'heures']);
// Mots courants trop proches d'un mot-clé : pas de tolérance aux fautes.
const EXACT = new Set(['centre', 'rayon', 'front', 'retard', 'canon', 'canons', 'bande', 'fusant', 'debut', 'grille']);

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

// Tolérance : mots courts exacts, 1 faute dès 5 lettres, 2 fautes dès 8 ; jamais pour les nombres.
function close(word, target) {
  if (word === target) return true;
  if (target.length <= 4 || /\d/.test(target) || EXACT.has(target)) return false;
  return lev(word, target) <= (target.length >= 8 ? 2 : 1);
}

// Toutes les entrées qui correspondent en i, les plus longues d'abord.
function matchesAt(toks, i) {
  const out = [];
  for (const e of LEXICON) {
    if (i + e.words.length > toks.length) continue;
    if (e.words.every((w, k) => close(toks[i + k].n, w))) out.push({ ...e, len: e.words.length });
  }
  return out.sort((a, b) => b.len - a.len);
}

/* ---------- Nombres ---------- */

// 0–99 en lettres ("trente-quatre", "quatre-vingt-dix-sept", "soixante et onze").
function below100(toks, i) {
  const at = (k) => toks[i + k]?.n;
  const t = at(0);
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
    return { v: base + (x ? x.v : 0), len: used + (x ? x.len : 0) };
  }
  if (t === 'dix' && ['sept', 'huit', 'neuf'].includes(at(1))) return { v: 10 + UNITS[at(1)], len: 2 };
  if (UNITS[t] !== undefined) return { v: UNITS[t], len: 1 };
  return null;
}
function below1000(toks, i) {
  const isCent = (k) => ['cent', 'cents'].includes(toks[k]?.n);
  if (isCent(i)) {
    const b = below100(toks, i + 1);
    return { v: 100 + (b ? b.v : 0), len: 1 + (b ? b.len : 0) };
  }
  const a = below100(toks, i);
  if (!a) return null;
  if (a.v >= 1 && a.v <= 19 && isCent(i + a.len)) {
    const b = below100(toks, i + a.len + 1);
    return { v: a.v * 100 + (b ? b.v : 0), len: a.len + 1 + (b ? b.len : 0) };
  }
  return a;
}
function wordsNumber(toks, i) {
  if (toks[i]?.n === 'mille') {
    const b = below1000(toks, i + 1);
    return { v: 1000 + (b ? b.v : 0), len: 1 + (b ? b.len : 0) };
  }
  const a = below1000(toks, i);
  if (!a) return null;
  if (toks[i + a.len]?.n === 'mille') {
    const b = below1000(toks, i + a.len + 1);
    return { v: a.v * 1000 + (b ? b.v : 0), len: a.len + 1 + (b ? b.len : 0) };
  }
  return a;
}
// Nombre en i : { digits, len, single } ; single = un seul chiffre annoncé (« 4 », « quatre »).
function matchNumber(toks, i) {
  const t = toks[i]?.n;
  if (t === undefined) return null;
  if (/^\d+$/.test(t)) return { digits: t, len: 1, single: t.length === 1 };
  const w = wordsNumber(toks, i);
  if (!w) return null;
  return { digits: String(w.v), len: w.len, single: w.v < 10 };
}

/* ---------- Accumulateur « 2 chiffres » (identification, panaché) ---------- */
// "1 2" → 12 ; "zéro cinq" → 05 ; "5" puis "12" → 05 12 ; "1234" → 12 34.
const numAcc = () => ({ vals: [], pending: null });
function accPush(acc, digits, resetWhenFull) {
  if (acc.vals.length >= 2 && acc.pending === null) {
    if (!resetWhenFull) return false;
    acc.vals = [];
  }
  if (digits.length === 1) {
    if (acc.pending !== null) { acc.vals.push(acc.pending + digits); acc.pending = null; }
    else acc.pending = digits;
    return true;
  }
  if (acc.pending !== null) { acc.vals.push('0' + acc.pending); acc.pending = null; }
  let d = digits;
  while (d.length >= 2 && acc.vals.length < 2) { acc.vals.push(d.slice(0, 2)); d = d.slice(2); }
  if (d && acc.vals.length < 2) acc.pending = d;
  return true;
}
function accFlush(acc) {
  if (acc.pending !== null) { acc.vals.push('0' + acc.pending); acc.pending = null; }
}

/* ---------- Parse ---------- */

const CODES = { _traj: ['plongeante', 'verticale', 'nominale'], _mode: ['pi', 'pcr', 'fusant', 'retard'] };
const ARMES = { 81: 'mo81', 120: 'mo120', 155: 'c155' };
// Cadre où vont les nombres quand le cadre en cours n'a plus de case libre.
const OVERFLOW = { 1: 3, 2: 3, 3: 4, 6: 8, 7: 8, 8: 9 };
const COMPANION = { coups: 'coups2', duree: 'duree2', interv: 'interv2' };
// Cases où des chiffres annoncés un par un se mettent bout à bout (coordonnées, distances).
const CONCAT = /\.(x|y|z|d)$|^obs[XYZ]$|^amisDist$|^front$|^prof$|^rayon$/;

// ignoreStops : nombre de « terminé » déjà traités (dictée reprise après la vérification).
export function parse(text, { final = false, ignoreStops = 0 } = {}) {
  const toks = tokenize(text);
  const v = {};
  const st = {
    cur: 0, stop: false, stopAt: null, row: null, cursor: null, confirm: null, last: null,
    id: numAcc(), pan: numAcc(), partial: new Set(),
  };
  let stops = 0;

  const mark = (i, len, sec, kind) => {
    for (let k = i; k < i + len; k++) { toks[k].sec = sec; toks[k].kind = kind; }
  };
  const syncAcc = () => {
    const set = (k, x) => { if (x === undefined) delete v[k]; else v[k] = x; };
    set('id1', st.id.vals[0]); set('id2', st.id.vals[1]);
    set('p1', st.pan.vals[0]); set('p2', st.pan.vals[1]);
  };
  const moveTo = (c) => {
    if (c === st.cur) return;
    if (st.cur === 0) accFlush(st.id);
    if (st.cur === 2) accFlush(st.pan);
    syncAcc();
    st.cur = c; st.cursor = null; st.last = null;
  };
  const resetCadre = (c) => {
    for (const fd of CADRES[c].fields) { delete v[fd.key]; st.partial.delete(fd.key); }
    if (c === 0) st.id = numAcc();
    if (c === 1) st.confirm = null;
    if (c === 2) st.pan = numAcc();
    if (c === 6) st.row = null;
    st.cursor = null; st.last = null;
    syncAcc();
  };
  const started = (c) => CADRES[c].fields.some((fd) => v[fd.key] !== undefined) || (c === 0 && st.id.pending !== null) || (c === 2 && st.pan.pending !== null);

  // Cases numériques du cadre c, dans l'ordre d'annonce.
  const order = (c) => {
    switch (c) {
      case 1: return v.type === 'mettre_en_place' || v.type === 'mep_decentree' ? ['mepBox'] : v.type === 'renouveler' ? ['ren1', 'ren2'] : [];
      case 2: return v.panache ? ['p1', 'p2'] : [];
      case 3: return ['coups', 'duree', 'interv'];
      case 4: return ['lanceurs'];
      case 6: return st.row ? ROW_KEYS[ROW_KIND[st.row]].map((k) => `${st.row}.${k}`) : [];
      case 7: return v.geom === 'lineaire' || v.geom === 'surfacique' ? ['gis8', 'front', 'prof'] : v.geom === 'circulaire' ? ['rayon'] : [];
      case 8: return ['gisObs', 'obsX', 'obsY', 'obsZ'];
      case 9: return ['amisDist', 'amisGis'];
      case 10: return v.tir === 'hsol' ? ['h1', 'h2'] : ['apl', 'synchro', 'hso', 'hdt'].includes(v.tir) ? ['h1'] : [];
      default: return [];
    }
  };
  const isEmpty = (k) => (k === 'p1' || k === 'p2'
    ? st.pan.vals.length < (k === 'p1' ? 1 : 2)
    : v[k] === undefined || st.partial.has(k));
  const nextKey = (c, after) => {
    const o = order(c);
    const from = after ? o.indexOf(after) + 1 : 0;
    return o.slice(from).find(isEmpty) ?? null;
  };
  const advanceCursor = (key) => {
    if (st.partial.has(key)) { st.cursor = key; return; }
    st.cursor = order(st.cur).includes(key) ? nextKey(st.cur, key) : null;
  };

  // Écrit un nombre dans la case `key`.
  const write = (key, num, neg) => {
    const fd = FIELD[key];
    const d = num.digits;
    if (key === 'p1' || key === 'p2') {
      accPush(st.pan, d, false); syncAcc();
      st.cursor = st.pan.vals.length < 2 ? 'p1' : null;
      return;
    }
    if (fd.type === 'fixed') {
      v[key] = (st.partial.has(key) ? v[key] : '') + d;
      if (v[key].length >= fd.digits) st.partial.delete(key); else st.partial.add(key);
    } else if (fd.type === 'time') {
      if (st.partial.has(key)) { v[key] += d.padStart(2, '0').slice(-2); st.partial.delete(key); }
      else if (d.length >= 3) v[key] = d.padStart(4, '0').slice(-4);
      else { v[key] = d; st.partial.add(key); }
    } else if (fd.type === 'choice') {
      // Choix annoncé par son numéro (« posture 2 », « TLE 3 »).
      if (OPT[fd.opt][d] !== undefined) v[key] = d;
    } else {
      v[key] = (neg ? '-' : '') + d;
    }
    advanceCursor(key);
  };

  const placeNumber = (num, neg, i) => {
    // Chiffres annoncés un par un : on les met bout à bout.
    if (num.single && st.last?.single && st.last.end === i && CONCAT.test(st.last.key)) {
      v[st.last.key] += num.digits;
      return st.last.key;
    }
    if (st.cursor === '_calibre' && ARMES[num.digits]) { v.arme = ARMES[num.digits]; st.cursor = null; return 'arme'; }
    if (st.cursor === '_traj' || st.cursor === '_mode') {
      const val = CODES[st.cursor][Number(num.digits) - 1];
      if (val) {
        const [a, b] = st.cursor === '_traj' ? ['traj1', 'traj2'] : ['mode1', 'mode2'];
        if (v[a] === undefined) v[a] = val; else v[b] = val;
        return a;
      }
    }
    if (st.cur === 4 && ARMES[num.digits] && !v.arme) { v.arme = ARMES[num.digits]; return 'arme'; }
    if (st.cur === 0) { accPush(st.id, num.digits, true); syncAcc(); return 'id'; }
    let key = st.cursor && !st.cursor.startsWith('_') ? st.cursor : null;
    if (!key) key = nextKey(st.cur);
    if (!key) {
      for (let c = OVERFLOW[st.cur]; c !== undefined; c = OVERFLOW[c]) {
        const k = nextKey(c);
        if (k) { moveTo(c); key = k; break; }
      }
    }
    if (!key) return null;
    write(key, num, neg);
    return key;
  };

  let i = 0;
  while (i < toks.length) {
    const t = toks[i];
    // Marqueur ⟦rK⟧ inséré quand on touche un cadre : on le vide et on le réenregistre.
    const redo = /^⟦r(\d+)⟧$/.exec(t.text);
    if (redo) {
      const k = Number(redo[1]);
      moveTo(k); resetCadre(k);
      for (const x of toks.slice(0, i)) if (x.sec === k) x.kind = 'erased';
      mark(i, 1, 'cmd', 'redo'); t.redo = k;
      i++; continue;
    }
    // « fin » après « HSO limité … début » est l'heure de fin, pas la fin du message.
    if (t.n === 'fin' && st.cur === 10 && v.tir === 'hsol' && v.h1 && !v.h2) {
      st.cursor = 'h2'; mark(i, 1, 10, 'label'); i++; continue;
    }

    const ms = matchesAt(toks, i);
    // Une expression qui commence par un nombre (« 120 mm ») prime sur le nombre seul.
    const numPhrase = ms.some((c) => /\d/.test(c.words[0]) && c.len > 1 && c.c >= st.cur);

    // Nombre (éventuellement précédé de « moins »).
    let neg = false, ni = i;
    if (t.n === 'moins' && matchNumber(toks, i + 1)) { neg = true; ni = i + 1; }
    const num = numPhrase ? null : matchNumber(toks, ni);
    const article = num && num.len === 1 && (toks[ni].n === 'un' || toks[ni].n === 'une')
      && !st.cursor && !matchNumber(toks, ni + 1) && !(st.last && st.last.end === ni);
    if (num && !article) {
      const after = ni + num.len;
      // Unité qui suit (« 6 coups », « 2 minutes », « 4 lanceurs ») : elle choisit la case.
      const unit = toks[after] ? matchesAt(toks, after).find((m) => m.kind === 'unit') : null;
      const gap = text.slice(toks[i - 1]?.end ?? 0, t.start);
      const slash = st.last && COMPANION[st.last.key]
        && (gap.includes('/') || ['sur', 'barre', 'slash'].includes(toks[i - 1]?.n));
      let key = null, used = after;
      if (unit && unit.c >= st.cur) {
        moveTo(unit.c);
        key = slash && st.last?.key === unit.key ? COMPANION[unit.key] : unit.key;
        v[key] = num.digits; st.cursor = null;
        used = after + unit.len;
      } else if (slash && st.cur === 3) {
        key = COMPANION[st.last.key];
        v[key] = num.digits;
      } else {
        key = placeNumber(num, neg, ni);
      }
      if (key) {
        mark(i, used - i, st.cur, 'num');
        st.last = { key, single: num.single, end: used };
      }
      i = used;
      continue;
    }

    // Choix du sens : l'expression la plus longue, puis le premier cadre ≥ au cadre en cours.
    let m = null;
    for (const cand of ms) {
      if (m && cand.len < m.len) break;
      if (cand.guard === 'num' && !matchNumber(toks, i + cand.len)) continue;
      if (cand.c < 0) { m = cand; break; }
      if (cand.c >= st.cur && (!m || cand.c < m.c)) m = cand;
    }
    if (!m) {
      if (st.last) st.last.end = SKIP_UNITS.has(t.n) && st.last.end === i ? i + 1 : -1;
      i++; continue;
    }
    st.last = null;
    const len = m.len;

    if (m.kind === 'stop') {
      mark(i, len, 'cmd', 'stop');
      if (++stops > ignoreStops) { st.stop = true; st.stopAt = t.start; break; }
    } else if (m.kind === 'fix') {
      let k = st.cur;
      if (!started(k) && k > 0) k--;
      for (const x of toks.slice(0, i)) if (x.sec === k) x.kind = 'erased';
      moveTo(k); resetCadre(k);
      mark(i, len, 'cmd', 'fix');
    } else if (m.kind === 'letter') {
      const L = m.value;
      if (st.cur <= 1 && !(v.letter && st.confirm)) {
        moveTo(1);
        if (!v.letter) v.letter = L; else st.confirm = L;
        mark(i, len, 1, 'letter');
      } else if (st.cur === 7 && v.geom && v.geom !== 'convergent') {
        const key = v.geom === 'circulaire' ? 'centre' : 'pc';
        v[key] = L; st.cursor = nextKey(7);
        mark(i, len, 7, 'letter');
      } else if (st.cur <= 6) {
        moveTo(6); st.row = L; st.cursor = null;
        mark(i, len, 6, 'letter');
      }
    } else {
      moveTo(m.c);
      mark(i, len, m.c, ['goto', 'cursor', 'rowlabel', 'unit'].includes(m.kind) ? 'label' : 'word');
      switch (m.kind) {
        case 'cursor': st.cursor = m.cursor; break;
        case 'unit': st.cursor = m.key; break;
        case 'set': Object.assign(v, m.set); st.cursor = m.cursor ?? null; break;
        case 'semonce':
          if (v.effect === undefined) v.effect = 'semonce'; else v.munition = 'semonce';
          break;
        case 'panache':
          if (st.pan.vals.length >= 2) st.pan = numAcc();
          v.panache = true; syncAcc(); st.cursor = 'p1';
          break;
        case 'traj':
          if (v.traj1 === undefined) v.traj1 = m.value; else if (v.traj1 !== m.value) v.traj2 = m.value;
          break;
        case 'mode':
          if (v.mode1 === undefined) v.mode1 = m.value; else if (v.mode1 !== m.value) v.mode2 = m.value;
          st.cursor = m.cursor ?? null;
          break;
        case 'rowlabel': {
          const want = { g: 'pol', d: 'pol', s: 'pol', fu: 'lru', ba: 'lru' }[m.key];
          if (!st.row || !ROW_KEYS[ROW_KIND[st.row]].includes(m.key)) {
            st.row = want === 'pol' ? 'A' : want === 'lru' ? 'G' : 'D';
          }
          st.cursor = `${st.row}.${m.key}`;
          break;
        }
        case 'acd': {
          // « Au commandement de » + texte libre jusqu'à « terminé » ou la fin.
          v.tir = 'acd';
          let j = i + len;
          while (j < toks.length && !['termine', 'terminer', 'fin'].includes(toks[j].n)) j++;
          if (j > i + len) {
            v.acd = text.slice(toks[i + len].start, toks[j - 1].end);
            mark(i + len, j - i - len, 10, 'word');
          }
          i = j;
          continue;
        }
        default: break;
      }
    }
    i += len;
  }

  if (final || st.stop) {
    accFlush(st.id); accFlush(st.pan);
    for (const k of st.partial) {
      const fd = FIELD[k];
      if (fd.type === 'fixed') v[k] = v[k].padStart(fd.digits, '0');
      if (fd.type === 'time') v[k] = v[k].padStart(2, '0') + '00';
    }
    st.partial.clear();
  }
  syncAcc();

  const done = CADRES.map((_, c) => {
    if (c === 0) return !!(v.id1 && v.id2);
    if (c === 1) return !!v.letter && st.confirm === v.letter;
    if (c === 2) return !v.panache || !!(v.p1 && v.p2);
    if (c === 6) return locationOk(v);
    if (c === 7) {
      if (v.geom === 'lineaire' || v.geom === 'surfacique') return !!(v.gis8 && v.front);
      return v.geom === 'circulaire' ? !!v.rayon : started(c);
    }
    if (c === 8) return !!v.gisObs && !st.partial.has('gisObs');
    if (c === 10) return order(10).every((k) => v[k] && !st.partial.has(k));
    return started(c) && !CADRES[c].fields.some((fd) => st.partial.has(fd.key));
  });
  // Le cadre suivant prend la main quand celui en cours est complet et n'attend plus de nombre.
  let focus = st.cur;
  if (done[focus] && !nextKey(focus) && focus < CADRES.length - 1 && !st.stop) focus++;

  return {
    tokens: toks,
    values: v,
    cur: st.cur,
    focus,
    row: st.row,
    cursor: st.cursor,
    stop: st.stop,
    stopAt: st.stopAt,
    done,
    started: CADRES.map((_, c) => started(c)),
    pending: { id: st.id.pending, pan: st.pan.pending },
    partial: [...st.partial],
    confirm: st.confirm,
    mismatch: !!(st.confirm && st.confirm !== v.letter),
  };
}
