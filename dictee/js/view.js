// Cases affichées pour le cadre déplié pendant la dictée, à partir d'un résultat de parse.
import { FIELD, OPT, DEFAULTS, ROW_KIND, ROW_KEYS, ROW_LABELS, rowsUsed, rowText, fmtTime } from './form.js?v=21';

const S = (label, text, state = text ? 'filled' : 'vacant', wide = false) => ({ label, text: text ?? '', state, wide });
const opt = (o, k) => OPT[o][k] ?? '';

export const HINTS = [
  '2 nombres · ex. « douze, trente-quatre »',
  'Lettre A–H, type, lettre · ex. « Alpha, mise en place, Alpha »',
  'Effet · « panaché » + 2 nombres · munition',
  'Ligne A–H puis valeurs · ex. « Alpha 1250 3400 moins 12 »',
  'Amis les plus proches : distance, gisement ou direction, posture',
  'À mon commandement, aussitôt prêt, HSO… · « terminé »',
];

// « _ _ » pour 2 chiffres attendus ; « 1 _ » quand le premier est dit.
const blanks = (have, n) => [...have.split(''), ...Array(Math.max(0, n - have.length)).fill('_')].join(' ');

export function cadreSlots(i, p) {
  const v = p.values;
  const part = (k) => p.partial.includes(k);
  const num = (label, k, wide) => {
    const n = FIELD[k]?.digits;
    if (n && (v[k] === undefined || part(k))) return S(label, blanks(v[k] ?? '', n), v[k] === undefined ? 'blank' : 'partial', wide);
    return S(label, v[k] !== undefined ? v[k] + (part(k) ? '_' : '') : '', v[k] === undefined ? 'vacant' : part(k) ? 'partial' : 'filled', wide);
  };
  const choice = (label, k, o, wide = true) => ({
    ...(v[k] !== undefined
      ? S(label, opt(o, v[k]), 'filled', wide)
      : DEFAULTS[k] ? S(label, opt(o, DEFAULTS[k]), 'default', wide) : S(label, '', 'vacant', wide)),
    word: true,
  });
  const pair = (label, vals, pending, k) => (vals[k] !== undefined
    ? S(label, vals[k])
    : vals.filter(Boolean).length === k && pending !== null ? S(label, blanks(pending, 2), 'partial') : S(label, '_ _', 'blank'));

  switch (i) {
    case 0: return [pair('', [v.id1, v.id2], p.pending.id, 0), pair('', [v.id1, v.id2], p.pending.id, 1)];
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
    case 4: return [num('Distance', 'amisDist'), num('Gisement', 'amisGis'), choice('Dir.', 'amisDir', 'dir4', false), choice('Posture', 'posture', 'posture')];
    case 5: {
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
