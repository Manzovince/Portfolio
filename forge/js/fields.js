// Parsing/formatting of set fields typed by the user.
import { fmtNum, pad } from './store.js?v=7';

export const FIELD_LABEL = { kg: 'kg', reps: 'reps', sec: 'durée', dist: 'km', pace: 'allure' };

// "1:30" → 90 · "1:02:00" → 3720 · plain number in seconds or minutes.
export function parseClock(str, plain = 's') {
  str = String(str ?? '').trim().replace(',', '.');
  if (!str) return 0;
  if (/[:'’]/.test(str)) return str.split(/[:'’"]/).filter(x => x !== '').map(Number).reduce((a, b) => a * 60 + (b || 0), 0);
  const n = parseFloat(str);
  if (!isFinite(n)) return 0;
  return Math.round(plain === 'min' ? n * 60 : n);
}
const clock = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60; return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`; };

export function fmtField(field, v) {
  if (v === '' || v == null || (+v === 0 && field !== 'reps')) return '';
  if (field === 'kg') return fmtNum(+v).replace(/\s/g, '');
  if (field === 'reps') return String(+v || '');
  if (field === 'sec' || field === 'pace') return clock(+v);
  if (field === 'dist') return fmtNum(+v / 1000).replace(/\s/g, '');
  return String(v);
}

// mode matters for durations: a bare "45" is seconds for a plank, minutes for a run.
export function parseField(field, str, mode) {
  str = String(str ?? '').trim().replace(',', '.');
  if (!str) return '';
  if (field === 'kg') { const n = parseFloat(str); return isFinite(n) ? n : ''; }
  if (field === 'reps') { const n = parseInt(str, 10); return isFinite(n) ? n : ''; }
  if (field === 'sec') return parseClock(str, mode === 'run' ? 'min' : 's') || '';
  if (field === 'pace') return parseClock(str, 'min') || '';
  if (field === 'dist') { const n = parseFloat(str); return isFinite(n) ? Math.round(n * 1000) : ''; }
  return str;
}

export const inputMode = f => (f === 'reps' ? 'numeric' : (f === 'sec' || f === 'pace') ? 'text' : 'decimal');
export const placeholderFor = (f, mode) => ({ kg: 'kg', reps: 'reps', sec: mode === 'run' ? 'mm:ss' : 's', dist: 'km', pace: 'm:ss' }[f]);

export const KIND = { n: '', w: 'É', d: 'D', f: 'X' };
export const KIND_LABEL = { n: 'Normale', w: 'Échauffement', d: 'Dégressive', f: 'Jusqu’à l’échec' };
export const nextKind = k => ({ n: 'w', w: 'd', d: 'f', f: 'n' }[k || 'n']);

// Label shown in the "#" column: warm-ups get É, work sets are numbered.
export function setLabels(sets) {
  let n = 0;
  return sets.map(s => (s.kind && s.kind !== 'n' && KIND[s.kind]) ? (s.kind === 'w' ? 'É' : (++n, KIND[s.kind])) : String(++n));
}

export const REST_CHOICES = [0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
