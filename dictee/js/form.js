// Schéma du formulaire « Message de tir appuis feux sol/sol » (11 cadres).
// Les cadres en fond rose sont obligatoires, ceux en fond blanc (4, 5, 6, 8, 10) facultatifs.
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
  arme: { mo81: 'Mo 81 mm', mo120: 'Mo 120', c155: '155 mm', lru: 'LRU' },
  traj: { plongeante: 'Plongeante', verticale: 'Verticale', nominale: 'Nominale' },
  mode: { pi: 'Percutant instantané', pcr: 'Percutant court retard', fusant: 'Fusant', retard: 'Retard' },
  cible: {
    chars: 'Chars', blindes: 'Blindés légers', pickup: 'Pick-up', personnel: 'Personnel',
    artillerie: 'Artillerie', batiment: 'Bâtiment',
  },
  etat: {
    mouvement: 'En mouvement', arret: 'À l\'arrêt', decouvert: 'À découvert', abrite: 'Abrité',
    observateur: 'Observateur', pieces: 'Pièces',
  },
  geom: { convergent: 'Convergent', lineaire: 'Linéaire', surfacique: 'Surfacique', circulaire: 'Circulaire' },
  ouvert: { ouvert: 'Ouvert', ferme: 'Fermé' },
  mep9: { grille: 'Grille', dpm: 'Déplacement du point moyen' },
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

export const DEFAULTS = { type: 'emblee', effect: 'neutralisation', mode1: 'pi', geom: 'convergent', mep9: 'dpm', tir: 'amc' };

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
  { n: 4, title: 'Coups', fields: [
    f('coups', 'Nb de coups', 'num'), f('coups2', '/ coups', 'num'), f('duree', 'Durée (min)', 'num'),
    f('duree2', '/ min', 'num'), f('interv', 'Intervalle (s)', 'num'), f('interv2', '/ s', 'num'),
  ] },
  { n: 5, title: 'Lanceurs', fields: [
    f('lanceurs', 'Lanceurs', 'num'), f('arme', 'Arme', 'choice', { opt: 'arme' }),
    f('traj1', 'Trajectoire', 'choice', { opt: 'traj' }), f('traj2', 'Trajectoire 2', 'choice', { opt: 'traj' }),
    f('mode1', 'Mode', 'choice', { opt: 'mode' }), f('mode2', 'Mode 2', 'choice', { opt: 'mode' }),
    f('crMs', 'Court retard (ms)', 'num'), f('fusM', 'Fusant (m)', 'num'), f('retMs', 'Retard (ms)', 'num'),
  ] },
  { n: 6, title: 'Objectif', fields: [f('cible', 'Objectif', 'choice', { opt: 'cible' }), f('etat', 'État', 'choice', { opt: 'etat' })] },
  { n: 7, title: 'Localisation', req: true, fields: [
    ...rowFields,
    f('repEO', 'Repère est/ouest (m)', 'num'), f('repEOdir', 'Est / ouest', 'choice', { opt: 'eo' }),
    f('repNS', 'Repère nord/sud (m)', 'num'), f('repNSdir', 'Nord / sud', 'choice', { opt: 'ns' }),
    f('pmDG', 'Pour moi droite/gauche (m)', 'num'), f('pmDGdir', 'Droite / gauche', 'choice', { opt: 'dg' }),
    f('pmPL', 'Pour moi près/loin (m)', 'num'), f('pmPLdir', 'Près / loin', 'choice', { opt: 'pl' }),
    f('pmHB', 'Pour moi haut/bas (m)', 'num'), f('pmHBdir', 'Haut / bas', 'choice', { opt: 'hb' }),
    f('tle', 'TLE', 'choice', { opt: 'tle' }),
  ] },
  { n: 8, title: 'Gerbe', fields: [
    f('geom', 'Forme', 'choice', { opt: 'geom' }), f('pc', 'Point central', 'letter'),
    f('gis8', 'Gisement (mils)', 'fixed', { digits: 4 }), f('front', 'Front (m)', 'num'), f('prof', 'Profondeur (m)', 'num'),
    f('ouvert', 'Ouvert / fermé', 'choice', { opt: 'ouvert' }), f('centre', 'Centre', 'letter'), f('rayon', 'Rayon (m)', 'num'),
  ] },
  { n: 9, title: 'Mise en place', req: true, fields: [
    f('mep9', 'Mise en place', 'choice', { opt: 'mep9' }), f('gisObs', 'Gisement d\'observ. (mils)', 'fixed', { digits: 4 }),
    f('obsX', 'Observateur X', 'num'), f('obsY', 'Observateur Y', 'num'), f('obsZ', 'Observateur Z', 'snum'),
  ] },
  { n: 10, title: 'Amis', fields: [
    f('amisDist', 'Distance (m)', 'num'), f('amisGis', 'Gisement (mils)', 'fixed', { digits: 4 }),
    f('amisDir', 'ou N/O/E/S', 'choice', { opt: 'dir4' }), f('posture', 'Posture', 'choice', { opt: 'posture' }),
  ] },
  { n: 11, title: 'Déclenchement', req: true, fields: [
    f('tir', 'Déclenchement', 'choice', { opt: 'tir' }), f('h1', 'Heure', 'time'), f('h2', 'Heure fin', 'time'),
    f('acd', 'Au commandement de', 'text'),
  ] },
];
export const FIELD = Object.fromEntries(CADRES.flatMap((c, i) => c.fields.map((x) => [x.key, { ...x, cadre: i }])));
export const OPTIONAL = new Set(CADRES.map((c, i) => (c.req ? -1 : i)).filter((i) => i >= 0));

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
      const pair = (a, b, u) => (v[a] ? `${v[a]}${v[b] ? '/' + v[b] : ''} ${u}` : '');
      return [pair('coups', 'coups2', 'CPS'), pair('duree', 'duree2', 'MIN'), pair('interv', 'interv2', 'S')].filter(Boolean).join(' · ');
    }
    case 4: {
      const p = [];
      if (v.lanceurs) p.push(`${v.lanceurs} LANCEURS`);
      if (v.arme) p.push(label('arme', v.arme).toUpperCase());
      const tr = [v.traj1, v.traj2].filter(Boolean).map((x) => label('traj', x).toUpperCase());
      if (tr.length) p.push(tr.join('/'));
      const modeTxt = (m) => {
        let s = label('mode', m).toUpperCase();
        if (m === 'pcr' && v.crMs) s += ` ${v.crMs} MS`;
        if (m === 'fusant' && v.fusM) s += ` ${v.fusM} M`;
        if (m === 'retard' && v.retMs) s += ` ${v.retMs} MS`;
        return s;
      };
      p.push([v.mode1, v.mode2].filter(Boolean).map(modeTxt).join(' ET '));
      return p.join(' · ');
    }
    case 5: return [label('cible', v.cible), label('etat', v.etat)].filter(Boolean).join(' ').toUpperCase();
    case 6: {
      const p = rowsUsed(v).map((L) => rowText(v, L));
      const d = (n, dirKey, opt) => (v[n] ? `${label(opt, v[dirKey]).toUpperCase() || '?'} ${v[n]}` : '');
      const rep = [d('repEO', 'repEOdir', 'eo'), d('repNS', 'repNSdir', 'ns')].filter(Boolean);
      if (rep.length) p.push(`REPÈRE ${rep.join(' ')}`);
      const pm = [d('pmDG', 'pmDGdir', 'dg'), d('pmPL', 'pmPLdir', 'pl'), d('pmHB', 'pmHBdir', 'hb')].filter(Boolean);
      if (pm.length) p.push(`POUR MOI ${pm.join(' ')}`);
      if (v.tle) p.push(`TLE ${v.tle}`);
      return p.join(' · ');
    }
    case 7: {
      let t = label('geom', v.geom).toUpperCase();
      if (v.geom === 'lineaire' || v.geom === 'surfacique') {
        if (v.pc) t += ` PC ${v.pc}`;
        if (v.gis8) t += ` G${v.gis8}`;
        if (v.front) t += ` FRONT ${v.front}`;
        if (v.prof) t += ` PROF ${v.prof}`;
        if (v.ouvert) t += ` ${label('ouvert', v.ouvert).toUpperCase()}`;
      }
      if (v.geom === 'circulaire') {
        if (v.centre) t += ` CENTRE ${v.centre}`;
        if (v.rayon) t += ` RAYON ${v.rayon}`;
      }
      return t;
    }
    case 8: {
      let t = label('mep9', v.mep9).toUpperCase();
      if (v.gisObs) t += ` · GIS. OBS ${v.gisObs}`;
      if (v.obsX || v.obsY || v.obsZ) t += ` · OBS X${v.obsX || '–'} Y${v.obsY || '–'} Z${signed(v.obsZ) || '–'}`;
      return t;
    }
    case 9: {
      const p = [];
      if (v.amisDist) p.push(`${v.amisDist} M`);
      if (v.amisGis) p.push(`G${v.amisGis}`);
      if (v.amisDir) p.push(v.amisDir);
      if (v.posture) p.push(label('posture', v.posture).toUpperCase());
      return p.join(' · ');
    }
    case 10: {
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
  if (!locationOk(v)) e[6] = 'localisation';
  if (['apl', 'synchro', 'hso', 'hdt'].includes(v.tir) && !v.h1) e[10] = 'heure';
  if (v.tir === 'hsol' && (!v.h1 || !v.h2)) e[10] = 'heures début/fin';
  return e;
}
