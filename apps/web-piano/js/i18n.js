// Language (FR / EN, shared with manzovince.com) and music names.
// Note names follow the language (solfège in French) unless a notation is chosen.
import { S, saveLang, save, emit } from './store.js?v=202611104';
import { STRINGS } from './strings.js?v=202611104';
import { noteName, defaultSpelling, pitchClass, spelledOctave } from './theory.js?v=202611104';

const CHORDS = {
  en: {
    maj: 'major', min: 'minor', dom7: 'dominant seventh', maj7: 'major seventh',
    min7: 'minor seventh', dim: 'diminished', aug: 'augmented', sus4: 'suspended fourth',
    sus2: 'suspended second', hdim7: 'half-diminished seventh', dim7: 'diminished seventh',
    six: 'sixth', min6: 'minor sixth', sus4_7: 'seventh, suspended fourth', add9: 'added ninth',
    madd9: 'minor, added ninth', dom9: 'dominant ninth', maj9: 'major ninth', min9: 'minor ninth',
    minmaj7: 'minor major seventh', aug7: 'augmented seventh', augmaj7: 'augmented major seventh',
    sixnine: 'six-nine', dom7b9: 'seventh, flat ninth', dom7s9: 'seventh, sharp ninth',
    dom7s11: 'seventh, sharp eleventh', dom11: 'eleventh', min11: 'minor eleventh',
    dom13: 'thirteenth', power: 'power chord',
  },
  fr: {
    maj: 'majeur', min: 'mineur', dom7: 'septième de dominante', maj7: 'septième majeure',
    min7: 'mineur septième', dim: 'diminué', aug: 'augmenté', sus4: 'quarte suspendue',
    sus2: 'seconde suspendue', hdim7: 'demi-diminué', dim7: 'septième diminuée',
    six: 'sixte', min6: 'mineur sixte', sus4_7: 'septième, quarte suspendue', add9: 'neuvième ajoutée',
    madd9: 'mineur, neuvième ajoutée', dom9: 'neuvième de dominante', maj9: 'neuvième majeure',
    min9: 'mineur neuvième', minmaj7: 'mineur septième majeure', aug7: 'septième augmentée',
    augmaj7: 'septième majeure augmentée', sixnine: 'sixte et neuvième', dom7b9: 'septième, neuvième bémol',
    dom7s9: 'septième, neuvième dièse', dom7s11: 'septième, onzième dièse', dom11: 'onzième',
    min11: 'mineur onzième', dom13: 'treizième', power: 'accord de quinte',
  },
};

const INVERSIONS = {
  en: { 1: 'first inversion', 2: 'second inversion', 3: 'third inversion', slash: 'over {bass}' },
  fr: { 1: 'premier renversement', 2: 'deuxième renversement', 3: 'troisième renversement', slash: 'basse {bass}' },
};

const INTERVALS = {
  en: ['unison', 'minor second', 'major second', 'minor third', 'major third', 'perfect fourth',
    'tritone', 'perfect fifth', 'minor sixth', 'major sixth', 'minor seventh', 'major seventh'],
  fr: ['unisson', 'seconde mineure', 'seconde majeure', 'tierce mineure', 'tierce majeure', 'quarte juste',
    'triton', 'quinte juste', 'sixte mineure', 'sixte majeure', 'septième mineure', 'septième majeure'],
};

const SCALE_NAMES = {
  en: {
    major: 'Major', minor: 'Natural minor', harmonicMinor: 'Harmonic minor', dorian: 'Dorian',
    mixolydian: 'Mixolydian', majorPentatonic: 'Major pentatonic', minorPentatonic: 'Minor pentatonic', blues: 'Blues',
  },
  fr: {
    major: 'Majeure', minor: 'Mineure naturelle', harmonicMinor: 'Mineure harmonique', dorian: 'Dorienne',
    mixolydian: 'Mixolydienne', majorPentatonic: 'Pentatonique majeure', minorPentatonic: 'Pentatonique mineure', blues: 'Blues',
  },
};

const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? '');

export const lang = () => S.lang;
export const t = (key, vars) => fill(STRINGS[S.lang][key] ?? STRINGS.en[key] ?? key, vars);
export const chordQuality = id => CHORDS[S.lang][id] ?? '';
export const inversionName = (inv, vars) => fill(INVERSIONS[S.lang][inv] ?? '', vars);
export const intervalName = semis => INTERVALS[S.lang][semis];
export const scaleName = type => SCALE_NAMES[S.lang][type] ?? '';
export const notation = () => (S.notation === 'auto' ? (S.lang === 'fr' ? 'solfege' : 'english') : S.notation);

// A MIDI note with its octave, scientific pitch (middle C = C4 / Do4)
export function noteLabel(midi, withOctave = true) {
  const sp = defaultSpelling(pitchClass(midi));
  return noteName(sp, notation()) + (withOctave ? spelledOctave(midi, sp) : '');
}
export const spelled = sp => noteName(sp, notation());

export function setLang(next) {
  if (next === S.lang || !STRINGS[next]) return;
  S.lang = next;
  saveLang(); save();
  document.documentElement.lang = next;
  emit('lang');
}
