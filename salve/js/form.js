// Schéma du formulaire « Message de tir appuis feux sol/sol » (11 cadres).
// Les cadres facultatifs (4, 5, 6, 8 et 9) ont été retirés : tous les cadres restants sont obligatoires.
// Toutes les valeurs vivent dans un objet plat ; les lignes du cadre 7 ont des clés « A.g », « D.x », « G.fu »…

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const NATO_WORDS = {
  A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel',
};

export const OPT = {
  type: {
    emblee: 'Emblée', mettre_en_place: 'Mettre en place', mep_decentree: 'Mise en place décentrée',
    preparer: 'Préparer', renouveler: 'Renouveler', accrochage: 'Accrochage',
  },
  effect: {
    neutralisation: 'Neutralisation', destruction: 'Destruction', arret: 'Arrêt', semonce: 'Semonce',
    aveuglement: 'Aveuglement', eclairement: 'Éclairement',
  },
  spectre: { visible: 'Visible', ir: 'IR' },
  munition: { explo: 'Explo', fumigene: 'Fumigène', aced: 'ACED', ecl: 'ECL', semonce: 'Semonce' },
  dir4: { N: 'N', O: 'O', E: 'E', S: 'S' },
  posture: { 1: 'À découvert', 2: 'Abrité', 3: 'Sous blindage' },
  tir: {
    amc: 'À mon commandement', ap: 'Aussitôt prêt', apl: 'Aussitôt prêt limité NLT', synchro: 'Synchro',
    hso: 'Heure sur objectif', hsol: 'HSO limité', hdt: 'Heure de tir', acd: 'Au commandement de',
  },
  eo: { E: 'Est', O: 'Ouest' }, ns: { N: 'Nord', S: 'Sud' },
  dg: { D: 'Droite', G: 'Gauche' }, pl: { P: 'Près', L: 'Loin' }, hb: { H: 'Haut', B: 'Bas' },
  tle: { 1: '1', 2: '2', 3: '3', 4: '4' },
};

export const DEFAULTS = { type: 'emblee', effect: 'neutralisation', tir: 'amc' };

// Lignes du cadre 7 : A–C polaires, D–F rectangulaires, G–H LRU.
export const ROW_KIND = { A: 'pol', B: 'pol', C: 'pol', D: 'rect', E: 'rect', F: 'rect', G: 'lru', H: 'lru' };
export const ROW_KEYS = { pol: ['g', 'd', 's'], rect: ['x', 'y', 'z'], lru: ['fu', 'ba', 'x', 'y', 'z'] };
export const ROW_LABELS = { g: 'G', d: 'D', s: 'S', x: 'X', y: 'Y', z: 'Z', fu: 'Fuseau', ba: 'Bande' };

// Types de champ : pair (exactement 2 chiffres), fixed (n chiffres), num, snum (signé), time (HHMM),
// choice, letter, bool, text.
const f = (key, label, type, more = {}) => ({ key, label, type, ...more });
const rowFields = LETTERS.flatMap((L) => ROW_KEYS[ROW_KIND[L]].map((k) => f(`${L}.${k}`, `${L} ${ROW_LABELS[k]}`,
  k === 'g' ? 'fixed' : (k === 's' || k === 'z') ? 'snum' : 'num', { digits: k === 'g' ? 4 : undefined, row: L })));

export const CADRES = [
  { n: 1, title: 'Identification', req: true, fields: [f('id1', 'Identification 1', 'pair'), f('id2', 'Identification 2', 'pair')] },
  { n: 2, title: 'Type de mission', req: true, fields: [
    f('letter', 'Lettre', 'letter'), f('type', 'Type', 'choice', { opt: 'type' }),
    f('mepBox', 'Case mise en place', 'num'), f('ren1', 'Renouveler 1', 'num'), f('ren2', 'Renouveler 2', 'num'),
  ] },
  { n: 3, title: 'Effet', req: true, fields: [
    f('effect', 'Effet', 'choice', { opt: 'effect' }), f('spectre', 'Visible / IR', 'choice', { opt: 'spectre' }),
    f('panache', 'Panaché', 'bool'), f('p1', 'Panaché 1', 'pair'), f('p2', 'Panaché 2', 'pair'),
    f('munition', 'Munition', 'choice', { opt: 'munition' }),
  ] },
  { n: 7, title: 'Localisation', req: true, fields: [
    ...rowFields,
    f('repEO', 'Repère est/ouest (m)', 'num'), f('repEOdir', 'Est / ouest', 'choice', { opt: 'eo' }),
    f('repNS', 'Repère nord/sud (m)', 'num'), f('repNSdir', 'Nord / sud', 'choice', { opt: 'ns' }),
    f('pmDG', 'Pour moi droite/gauche (m)', 'num'), f('pmDGdir', 'Droite / gauche', 'choice', { opt: 'dg' }),
    f('pmPL', 'Pour moi près/loin (m)', 'num'), f('pmPLdir', 'Près / loin', 'choice', { opt: 'pl' }),
    f('pmHB', 'Pour moi haut/bas (m)', 'num'), f('pmHBdir', 'Haut / bas', 'choice', { opt: 'hb' }),
    f('tle', 'TLE', 'choice', { opt: 'tle' }),
  ] },
  { n: 10, title: 'Amis les plus proches', req: true, fields: [
    f('amisDist', 'Distance (m)', 'num'), f('amisGis', 'Gisement (mils)', 'fixed', { digits: 4 }),
    f('amisDir', 'ou N/O/E/S', 'choice', { opt: 'dir4' }), f('posture', 'Posture', 'choice', { opt: 'posture' }),
  ] },
  { n: 11, title: 'Déclenchement', req: true, fields: [
    f('tir', 'Déclenchement', 'choice', { opt: 'tir' }), f('h1', 'Heure', 'time'), f('h2', 'Heure fin', 'time'),
    f('acd', 'Au commandement de', 'text'),
  ] },
];
export const FIELD = Object.fromEntries(CADRES.flatMap((c, i) => c.fields.map((x) => [x.key, { ...x, cadre: i }])));

export const fmtTime = (t) => (t && t.length >= 3 ? `${t.slice(0, -2).padStart(2, '0')}H${t.slice(-2)}` : t ? `${t}H__` : '');
const signed = (s) => (s && !s.startsWith('-') ? `+${s}` : s);
const label = (opt, k) => (k ? OPT[opt][k] ?? k : '');
const val = (v, k) => v[k] ?? '';

// Valeurs effectives : explicites + défauts.
export const withDefaults = (v) => ({ ...DEFAULTS, ...v });

export function rowsUsed(v) {
  return LETTERS.filter((L) => ROW_KEYS[ROW_KIND[L]].some((k) => v[`${L}.${k}`]));
}

export function rowText(v, L) {
  const k = ROW_KIND[L];
  const g = (x) => v[`${L}.${x}`] || '–';
  if (k === 'pol') return `${L} G${g('g')} D${g('d')} S${signed(v[`${L}.s`]) || '–'}`;
  if (k === 'rect') return `${L} X${g('x')} Y${g('y')} Z${signed(v[`${L}.z`]) || '–'}`;
  return `${L} FUSEAU ${g('fu')} BANDE ${g('ba')} X${g('x')} Y${g('y')} Z${signed(v[`${L}.z`]) || '–'}`;
}

// Une ligne de texte par cadre (résumé replié et message final).
export function cadreText(i, raw) {
  const v = withDefaults(raw);
  switch (i) {
    case 0: return `${val(v, 'id1') || '--'} ${val(v, 'id2') || '--'}`;
    case 1: {
      let t = `${v.letter || '-'} ${label('type', v.type).toUpperCase()}`;
      if (v.mepBox) t += ` ${v.mepBox}`;
      if (v.type === 'renouveler' && (v.ren1 || v.ren2)) t += ` ${v.ren1 || '..'} ${v.ren2 || '..'}`;
      return `${t} ${v.letter || '-'}`;
    }
    case 2: {
      let t = label('effect', v.effect).toUpperCase();
      if (v.spectre) t += ` ${label('spectre', v.spectre).toUpperCase()}`;
      if (v.panache) t += ` PANACHÉ ${v.p1 || '--'} ET ${v.p2 || '--'}`;
      if (v.munition) t += ` ${label('munition', v.munition).toUpperCase()}`;
      return t;
    }
    case 3: {
      const p = rowsUsed(v).map((L) => rowText(v, L));
      const d = (n, dirKey, opt) => (v[n] ? `${label(opt, v[dirKey]).toUpperCase() || '?'} ${v[n]}` : '');
      const rep = [d('repEO', 'repEOdir', 'eo'), d('repNS', 'repNSdir', 'ns')].filter(Boolean);
      if (rep.length) p.push(`REPÈRE ${rep.join(' ')}`);
      const pm = [d('pmDG', 'pmDGdir', 'dg'), d('pmPL', 'pmPLdir', 'pl'), d('pmHB', 'pmHBdir', 'hb')].filter(Boolean);
      if (pm.length) p.push(`POUR MOI ${pm.join(' ')}`);
      if (v.tle) p.push(`TLE ${v.tle}`);
      return p.join(' · ');
    }
    case 4: {
      const p = [];
      if (v.amisDist) p.push(`${v.amisDist} M`);
      if (v.amisGis) p.push(`G${v.amisGis}`);
      if (v.amisDir) p.push(v.amisDir);
      if (v.posture) p.push(label('posture', v.posture).toUpperCase());
      return p.join(' · ');
    }
    case 5: {
      let t = label('tir', v.tir).toUpperCase();
      if (v.h1) t += ` ${v.tir === 'hsol' ? 'DÉBUT ' : ''}${fmtTime(v.h1)}`;
      if (v.h2) t += ` FIN ${fmtTime(v.h2)}`;
      if (v.acd) t += ` ${v.acd.toUpperCase()}`;
      return t;
    }
    default: return '';
  }
}

// Un cadre est commencé dès qu'une valeur autre que sa valeur par défaut est renseignée.
export const cadreStarted = (i, v) => CADRES[i].fields.some((x) => {
  const val = v[x.key];
  return val !== undefined && val !== '' && val !== false && val !== DEFAULTS[x.key];
});

// Lignes du message final : cadres obligatoires + cadres facultatifs renseignés.
export function messageLines(v) {
  return CADRES.map((c, i) => [i, c]).filter(([i, c]) => c.req || cadreStarted(i, v))
    .map(([i, c]) => [String(c.n), c.title.toUpperCase(), cadreText(i, v)]);
}

export function locationOk(v) {
  if (LETTERS.some((L) => {
    const k = ROW_KIND[L];
    const has = (x) => !!v[`${L}.${x}`];
    return k === 'pol' ? has('g') && has('d') : has('x') && has('y');
  })) return true;
  return !!(v.repEO || v.repNS || v.pmDG || v.pmPL || v.pmHB);
}

// Erreurs bloquantes pour l'envoi : clé → message.
export function draftErrors(raw) {
  const v = withDefaults(raw);
  const e = {};
  const two = (x) => /^\d{2}$/.test(x || '');
  if (!two(v.id1) || !two(v.id2)) e[0] = 'identification';
  if (!LETTERS.includes(v.letter)) e[1] = 'lettre de mission';
  if (v.panache && (!two(v.p1) || !two(v.p2))) e[2] = 'nombres du panaché';
  if (!locationOk(v)) e[3] = 'localisation';
  if (!v.amisDist || !(v.amisGis || v.amisDir)) e[4] = 'amis (distance et gisement ou direction)';
  if (['apl', 'synchro', 'hso', 'hdt'].includes(v.tir) && !v.h1) e[5] = 'heure';
  if (v.tir === 'hsol' && (!v.h1 || !v.h2)) e[5] = 'heures début/fin';
  return e;
}
