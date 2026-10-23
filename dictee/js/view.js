// Cases affichées pour le cadre déplié pendant la dictée, à partir d'un résultat de parse.
import { OPT, DEFAULTS, ROW_KIND, ROW_KEYS, ROW_LABELS, rowsUsed, rowText, fmtTime } from './form.js?v=3';

const S = (label, text, state = text ? 'filled' : 'vacant', wide = false) => ({ label, text: text ?? '', state, wide });
const opt = (o, k) => OPT[o][k] ?? '';

export const HINTS = [
  '2 nombres · ex. « douze, trente-quatre »',
  'Lettre A–H, type, lettre · ex. « Alpha, mise en place, Alpha »',
  'Effet · « panaché » + 2 nombres · munition',
  'Facultatif · coups, durée (min), intervalle (s)',
  'Facultatif · lanceurs, arme, trajectoire, mode',
  'Facultatif · chars, blindés, pick-up, personnel…',
  'Ligne A–H puis valeurs · ex. « Alpha 1250 3400 moins 12 »',
  'Facultatif · linéaire, surfacique ou circulaire',
  'Grille ou déplacement · gisement d\'observ., X Y Z',
  'Facultatif · amis : distance, gisement, posture',
  'À mon commandement, aussitôt prêt, HSO… · « terminé »',
];

export function cadreSlots(i, p) {
  const v = p.values;
  const part = (k) => p.partial.includes(k);
  const num = (label, k, wide) => S(label, v[k] !== undefined ? v[k] + (part(k) ? '_' : '') : '', v[k] === undefined ? 'vacant' : part(k) ? 'partial' : 'filled', wide);
  const choice = (label, k, o, wide = true) => ({
    ...(v[k] !== undefined
      ? S(label, opt(o, v[k]), 'filled', wide)
      : DEFAULTS[k] ? S(label, opt(o, DEFAULTS[k]), 'default', wide) : S(label, '', 'vacant', wide)),
    word: true,
  });
  const pair = (label, vals, pending, k) => (vals[k] !== undefined
    ? S(label, vals[k])
    : vals.filter(Boolean).length === k && pending !== null ? S(label, pending + '_', 'partial') : S(label, ''));

  switch (i) {
    case 0: return [pair('N° 1', [v.id1, v.id2], p.pending.id, 0), pair('N° 2', [v.id1, v.id2], p.pending.id, 1)];
    case 1: {
      const out = [S('Lettre', v.letter), choice('Type', 'type', 'type')];
      if (v.type === 'mettre_en_place' || v.type === 'mep_decentree') out.push(num('Case', 'mepBox'));
      if (v.type === 'renouveler') out.push(num('Ren. 1', 'ren1'), num('Ren. 2', 'ren2'));
      out.push(S('Lettre', p.confirm, p.confirm ? (p.mismatch ? 'bad' : 'good') : 'vacant'));
      return out;
    }
    case 2: {
      const out = [choice('Effet', 'effect', 'effect')];
      if (v.effect === 'eclairement' || v.munition === 'ecl') out.push(choice('Spectre', 'spectre', 'spectre', false));
      out.push({ ...S('Panaché', v.panache ? 'Oui' : 'Non', v.panache ? 'filled' : 'off'), word: true });
      if (v.panache) out.push(pair('P1', [v.p1, v.p2], p.pending.pan, 0), pair('P2', [v.p1, v.p2], p.pending.pan, 1));
      out.push(choice('Munition', 'munition', 'munition', false));
      return out;
    }
    case 3: {
      const both = (label, a, b) => S(label, v[a] ? v[a] + (v[b] ? '/' + v[b] : '') : '');
      return [both('Coups', 'coups', 'coups2'), both('Durée min', 'duree', 'duree2'), both('Interv. s', 'interv', 'interv2')];
    }
    case 4: {
      const out = [num('Lanceurs', 'lanceurs'), choice('Arme', 'arme', 'arme', false), choice('Trajectoire', 'traj1', 'traj')];
      if (v.traj2) out.push(choice('Traj. 2', 'traj2', 'traj'));
      out.push(choice('Mode', 'mode1', 'mode'));
      if (v.mode2) out.push(choice('Mode 2', 'mode2', 'mode'));
      const m = [v.mode1, v.mode2];
      if (m.includes('pcr')) out.push(num('ms', 'crMs'));
      if (m.includes('fusant')) out.push(num('m', 'fusM'));
      if (m.includes('retard')) out.push(num('ms', 'retMs'));
      return out;
    }
    case 5: return [choice('Objectif', 'cible', 'cible'), choice('État', 'etat', 'etat')];
    case 6: {
      const out = [];
      const row = p.row;
      if (row) {
        out.push(S('Ligne', row));
        for (const k of ROW_KEYS[ROW_KIND[row]]) out.push(num(ROW_LABELS[k], `${row}.${k}`, k === 'x' || k === 'y'));
      } else out.push(S('Ligne', '', 'vacant'));
      for (const L of rowsUsed(v)) if (L !== row) out.push(S('Ligne ' + L, rowText(v, L).slice(2), 'filled', true));
      const d = (label, n, dk, o) => { if (v[n] || v[dk]) out.push({ ...S(label, `${opt(o, v[dk])} ${v[n] ?? '…'}`.trim(), v[n] ? 'filled' : 'partial', true), word: true }); };
      d('Repère', 'repEO', 'repEOdir', 'eo'); d('Repère', 'repNS', 'repNSdir', 'ns');
      d('Pour moi', 'pmDG', 'pmDGdir', 'dg'); d('Pour moi', 'pmPL', 'pmPLdir', 'pl'); d('Pour moi', 'pmHB', 'pmHBdir', 'hb');
      if (v.tle || p.cursor === 'tle') out.push(S('TLE', v.tle));
      return out;
    }
    case 7: {
      const out = [choice('Forme', 'geom', 'geom')];
      if (v.geom === 'lineaire' || v.geom === 'surfacique') {
        out.push(S('Pt central', v.pc), num('Gisement', 'gis8'), num('Front', 'front'), num('Prof.', 'prof'), choice('Ouv./ferm.', 'ouvert', 'ouvert', false));
      }
      if (v.geom === 'circulaire') out.push(S('Centre', v.centre), num('Rayon', 'rayon'));
      return out;
    }
    case 8: return [choice('Mise en place', 'mep9', 'mep9'), num('Gis. obs.', 'gisObs'), num('X', 'obsX', true), num('Y', 'obsY', true), num('Z', 'obsZ')];
    case 9: return [num('Distance', 'amisDist'), num('Gisement', 'amisGis'), choice('Dir.', 'amisDir', 'dir4', false), choice('Posture', 'posture', 'posture')];
    case 10: {
      const out = [choice('Déclenchement', 'tir', 'tir')];
      const t = (label, k) => S(label, v[k] ? fmtTime(v[k]) : '', v[k] === undefined ? 'vacant' : part(k) ? 'partial' : 'filled');
      if (['apl', 'synchro', 'hso', 'hdt'].includes(v.tir)) out.push(t('Heure', 'h1'));
      if (v.tir === 'hsol') out.push(t('Début', 'h1'), t('Fin', 'h2'));
      if (v.tir === 'acd') out.push(S('De', v.acd, v.acd ? 'filled' : 'vacant', true));
      return out;
    }
    default: return [];
  }
}
