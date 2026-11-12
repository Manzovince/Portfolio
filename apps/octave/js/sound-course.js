// The "make sounds" track: the synth of the Create screen, taken apart. Pure
// data, like course.js. A lesson has `lab` (the workshop sound it starts
// from) and `keep` (the name the sound gets when kept).
//
// Step types (see lesson.js):
//   info   explanation; "listen" plays the workshop sound
//   synth  a few controls of the workshop sound, live views, goals to reach
//          ({ text, check(patch, played) }), or none (free play). `prepare`
//          changes the sound when the step opens, `patch` replaces it.
//   match  copy a target sound: the same controls, a target to listen to
//   quiz   with `sounds: [a, b]`, the question is heard (A then B)
import { initPatch, initOp } from './dx7.js?v=202611127';
import { S } from './store.js?v=202611127';
import { seq } from './perform.js?v=202611127';
const S_FX = () => S.fx; // the workshop's effects, during a lesson

const T = (fr, en) => ({ fr, en });

// ── sounds ─────────────────────────────────────────────────────
const ORGAN_ENV = { r: [99, 99, 99, 72], l: [99, 99, 99, 0] };
function sound(name, alg, ops, fb = 0) {
  const p = initPatch(name);
  p.alg = alg; p.fb = fb;
  p.ops = [0, 1, 2, 3, 4, 5].map(i => initOp({ ol: 0, ...ORGAN_ENV, ...(ops[i] || {}) }));
  return p;
}
const copyEnv = (from, to) => { to.r = [...from.r]; to.l = [...from.l]; };
// two operators: op1 heard, op2 shaping it (alg 2: the feedback is on op2)
const SINE = () => sound('Sinus', 2, [{ ol: 99 }, { ol: 0 }]);
const FM = (mod = 0, ratio = 1, fb = 0) => sound('FM', 2, [{ ol: 99 }, { ol: mod, coarse: ratio }], fb);
// six sine waves on harmonics 1 to 6 (alg 32: every operator is heard)
const DRAWBARS = (levels = [99, 0, 0, 0, 0, 0]) => sound('Harmoniques', 32, levels.map((ol, i) => ({ ol, coarse: i + 1 })));
const ENV = (r = [99, 99, 99, 72], l = [99, 99, 99, 0]) => { const p = FM(52); p.ops[0].r = r; p.ops[0].l = l; return p; };

// ── controls ───────────────────────────────────────────────────
const C = (key, label, x = {}) => ({ key, label, ...x });
const HARM = n => C(`op${n}.ol`, T('Harmonique ' + n, 'Harmonic ' + n));
const ATT = C('op1.r.0', T('Attaque', 'Attack'), { invert: true });
const DEC = C('op1.r.1&op1.r.2', T('Déclin', 'Decay'), { invert: true });
const SUS = C('op1.l.1&op1.l.2', T('Maintien', 'Sustain'));
const REL = C('op1.r.3', T('Relâchement', 'Release'), { invert: true });
const MOD = C('op2.ol', T('Modulation', 'Modulation'));
const RATIO = C('op2.coarse', T('Rapport', 'Ratio'), { min: 1, max: 8 });
const FB = C('fb', T('Feedback', 'Feedback'));
const MATT = C('op2.r.0', T('Attaque de la modulation', 'Modulation attack'), { invert: true });
const MDEC = C('op2.r.1&op2.r.2', T('Déclin de la modulation', 'Modulation decay'), { invert: true });
const MSUS = C('op2.l.1&op2.l.2', T('Maintien de la modulation', 'Modulation sustain'));
// read a control the way it is shown (durations for inverted ones)
const att = p => 99 - p.ops[0].r[0], dec = p => 99 - p.ops[0].r[1], sus = p => p.ops[0].l[2], rel = p => 99 - p.ops[0].r[3];

// units 4–6
const PLUCKY = () => { const p = FM(80); p.ops[0].r = [99, 55, 55, 66]; p.ops[0].l = [99, 0, 0, 0]; p.ops[1].r = [99, 60, 60, 70]; p.ops[1].l = [99, 40, 40, 0]; return p; };
const STACK = alg => sound('Algorithme', alg, [{ ol: 99 }, { ol: 82, coarse: 2 }, { ol: 78, coarse: 3 }]);
const ORGAN = () => sound('Mon orgue', 32, [{ ol: 0, coarse: 0 }, { ol: 99, coarse: 1 }, { ol: 0, coarse: 2 }, { ol: 0, coarse: 3 }, { ol: 0, coarse: 4 }, { ol: 0, coarse: 8 }]);
// three voices, each a carrier with its own modulator (alg 5: three pairs), so
// every voice has harmonics: detuned, they shimmer like a choir instead of
// two plain sines cancelling out in a slow wobble. Free phases (no key sync)
// keep the voices from starting together in one loud, clipped attack
const VOICE = { ol: 72, coarse: 1 };
const UNISON = () => { const p = sound('Unisson', 5, [{ ol: 92 }, VOICE, { ol: 0 }, VOICE, { ol: 0 }, VOICE], 0); p.oks = 0; return p; };
const VIBRATO = () => { const p = FM(60); Object.assign(p.lfo, { wave: 4, speed: 35, delay: 0, pmd: 0, amd: 0, pms: 3, sync: 0 }); return p; };
const BRIGHT = () => FM(94, 1, 3);
const PAD = () => { const p = sound('Ma nappe', 32, [{ ol: 95, r: [60, 99, 99, 50], l: [99, 99, 99, 0] }, { ol: 92, r: [60, 99, 99, 50], l: [99, 99, 99, 0] }]); Object.assign(p.lfo, { wave: 4, speed: 30, delay: 30, pmd: 0, amd: 0, pms: 3, sync: 0 }); return p; };
const vMax = (touch) => touch.max - touch.min;

// recipes 3–7
const BASS = () => { const p = sound('Ma basse', 2, [{ ol: 99, r: [99, 45, 40, 75], l: [99, 80, 70, 0] }, { ol: 55, r: [99, 99, 99, 75], l: [99, 99, 99, 0] }]); return p; };
const MARIMBA = () => sound('Mon marimba', 5, [{ ol: 99, r: [99, 99, 99, 72], l: [99, 99, 99, 0] }, { ol: 0, r: [99, 99, 99, 72], l: [99, 99, 99, 0] }]);
const BRASS = () => { const p = sound('Mes cuivres', 2, [{ ol: 99, r: [80, 60, 60, 60], l: [99, 92, 90, 0] }, { ol: 82, r: [99, 99, 99, 60], l: [99, 99, 99, 0] }], 4); Object.assign(p.lfo, { wave: 4, speed: 36, delay: 0, pmd: 0, amd: 0, pms: 3, sync: 0 }); return p; };
const ROCK = () => { const p = sound('Mon orgue rock', 32, [{ ol: 0, coarse: 0 }, { ol: 99, coarse: 1 }, { ol: 0, coarse: 2 }, { ol: 0, coarse: 3 }, { ol: 0, coarse: 4 }, { ol: 0, coarse: 3, r: [99, 99, 99, 72], l: [99, 99, 99, 0] }]); Object.assign(p.lfo, { wave: 4, speed: 30, delay: 0, pmd: 0, amd: 0, pms: 1, sync: 0 }); return p; };
const LEAD = () => { const p = sound('Mon lead', 2, [{ ol: 99 }, { ol: 40 }]); Object.assign(p.lfo, { wave: 4, speed: 38, delay: 0, pmd: 0, amd: 0, pms: 3, sync: 0 }); return p; };
// waveforms. Each step of operator level is about 0.75 dB, so a harmonic n
// times weaker sits 20·log10(n) / 0.75 steps lower. The operators all start
// at phase 0 (key sync), which lines the harmonics up as the shapes need.
const ADD = (name, ratios, levels) => sound(name, 32, ratios.map((coarse, i) => ({ coarse, ol: levels[i] })));
const ALL = [1, 2, 3, 4, 5, 6], ODD = [1, 3, 5, 7, 9, 11];
const SAW_L = [99, 91, 86, 83, 80, 78];           // 1/n
const SQUARE_L = [99, 86, 80, 76, 74, 71];        // 1/n, odd only
const TRIANGLE_L = [99, 74, 62, 54, 48, 44];      // 1/n², odd only
const WAVES = {
  sine: () => ADD('Sinus', ALL, [99, 0, 0, 0, 0, 0]),
  triangle: () => ADD('Triangle', ODD, TRIANGLE_L),
  square: () => ADD('Carré', ODD, SQUARE_L),
  saw: () => ADD('Scie', ALL, SAW_L),
};
const WAVE_NAMES = [['sine', T('Sinus', 'Sine')], ['triangle', T('Triangle', 'Triangle')], ['square', T('Carré', 'Square')], ['saw', T('Scie', 'Saw')]];
// the picker: rebuilds the workshop sound as the chosen wave
const PICK = C('name', T('Forme d’onde', 'Waveform'), {
  options: WAVE_NAMES.map(([k, l]) => [WAVES[k]().name, l]),
  apply: (p, name) => { const k = Object.keys(WAVES).find(w => WAVES[w]().name === name); Object.assign(p, WAVES[k]()); },
});
const ODD_H = n => C(`op${n}.ol`, T('Harmonique ' + ODD[n - 1], 'Harmonic ' + ODD[n - 1]));
const near = (p, levels, tol) => levels.every((l, i) => i === 0 || Math.abs(p.ops[i].ol - l) <= tol);
// a single operator feeding back on itself (alg 32: the loop is on op6, a carrier)
const FB_SAW = (fb = 0) => sound('Scie feedback', 32, [{}, {}, {}, {}, {}, { ol: 99 }], fb);
const copyOp = (p, from, to) => Object.assign(p.ops[to], JSON.parse(JSON.stringify(p.ops[from])));

// arpeggios and sequences
const filled = () => S.seq.steps.slice(0, S.seq.length).filter(st => st.on && st.notes.length).length;
const restsBetween = () => { const list = S.seq.steps.slice(0, S.seq.length); const last = list.map(st => st.notes.length > 0).lastIndexOf(true); return list.slice(0, last).filter(st => !st.notes.length).length; };
const BASS_LOOP = [36, 0, 48, 0, 43, 0, 36, 0, 36, 0, 48, 0, 45, 0, 43, 0].map(n => ({ notes: n ? [n] : [], vel: 100, on: true }));

export const SOUND_COURSE = [
  // ═══ Unit 1 ═══════════════════════════════════════════════════
  {
    id: 'su1',
    title: T('Le son', 'Sound'),
    blurb: T('Hauteur, volume, timbre, et les harmoniques qui font le timbre.', 'Pitch, volume, tone, and the harmonics that make the tone.'),
    lessons: [
      {
        id: 'y1',
        title: T('Hauteur, volume, timbre', 'Pitch, volume, tone'),
        goal: T('Voir et entendre les trois qualités d’un son.', 'See and hear the three qualities of a sound.'),
        lab: SINE, keep: 'Sinus',
        steps: [
          { type: 'info', title: T('Une vibration', 'A vibration'),
            text: T('Un son, c’est de l’air qui vibre. Trois choses le décrivent :\n**La hauteur** : la vitesse de la vibration. Plus elle est rapide, plus c’est aigu.\n**Le volume** : la force de la vibration.\n**Le timbre** : la **forme** de la vibration. C’est lui qui fait qu’un piano et une flûte jouant la même note ne sonnent pas pareil.\nDans ces leçons, ton clavier joue un son « atelier » : tes propres sons ne sont pas touchés.',
              'A sound is air vibrating. Three things describe it:\n**Pitch**: how fast it vibrates. The faster, the higher.\n**Volume**: how strongly it vibrates.\n**Tone**: the **shape** of the vibration. It is why a piano and a flute playing the same note don’t sound alike.\nIn these lessons your keyboard plays a “workshop” sound: your own sounds are left alone.'),
            listen: 'C4h G4h | C5w', bpm: 80 },
          { type: 'synth', views: ['scope'], controls: [C('op1.ol', T('Volume', 'Volume'))], play: 'C4w',
            text: T('Voici le son le plus simple qui existe : la **sinusoïde**. L’oscilloscope dessine sa forme, une vague parfaitement lisse.', 'Here is the simplest sound there is: the **sine wave**. The oscilloscope draws its shape, a perfectly smooth wave.'),
            goals: [
              { text: T('Joue une note grave puis une note aiguë, à deux octaves d’écart : la vague se resserre.', 'Play a low note then a high one, two octaves apart: the wave tightens.'),
                check: (p, played) => played.size > 1 && Math.max(...played) - Math.min(...played) >= 24 },
              { text: T('Baisse le volume sous 70. L’écran s’ajuste tout seul : la **forme** ne change pas, seul le niveau baisse.', 'Lower the volume below 70. The screen rescales itself: the **shape** stays, only the level drops.'),
                check: p => p.ops[0].ol < 70 },
            ] },
          { type: 'quiz', rounds: [
            { q: T('Même note, même force. Qu’est-ce qui change entre A et B ?', 'Same note, same force. What changes between A and B?'), sounds: [SINE(), FM(82)], options: [T('la hauteur', 'the pitch'), T('le volume', 'the volume'), T('le timbre', 'the tone')], answer: 2 },
            { q: T('Et ici ?', 'And here?'), sounds: [SINE(), SINE()], plays: ['C4h', 'C5h'], options: [T('la hauteur', 'the pitch'), T('le volume', 'the volume'), T('le timbre', 'the tone')], answer: 0 },
          ] },
        ],
      },
      {
        id: 'y2',
        title: T('Les harmoniques', 'Harmonics'),
        goal: T('Construire un timbre en empilant des sinusoïdes.', 'Build a tone by stacking sine waves.'),
        lab: DRAWBARS, keep: 'Harmoniques',
        steps: [
          { type: 'info', title: T('Une pile de sinusoïdes', 'A stack of sine waves'),
            text: T('Un son riche est une **pile de sinusoïdes** : la note elle-même (la fondamentale), puis 2 fois, 3 fois, 4 fois sa fréquence… Ce sont les **harmoniques**. Leur dosage fait le timbre.\nLe **spectre** les montre : chaque bosse est une harmonique, numérotée en haut.\nIci, chacun des six opérateurs du synthé joue une harmonique. On fabrique le timbre à la main, comme avec les tirettes d’un orgue.',
              'A rich sound is a **stack of sine waves**: the note itself (the fundamental), then 2, 3, 4 times its frequency… Those are the **harmonics**. Their mix makes the tone.\nThe **spectrum** shows them: each bump is a harmonic, numbered at the top.\nHere, each of the synth’s six operators plays one harmonic. You build the tone by hand, like an organ’s drawbars.') },
          { type: 'synth', views: ['spectrum', 'scope'], controls: [HARM(2), HARM(3), HARM(4), HARM(5), HARM(6)], play: 'C4w',
            text: T('Tiens une note et ajoute les harmoniques une à une.', 'Hold a note and add the harmonics one by one.'),
            goals: [
              { text: T('Monte l’harmonique 2 : l’octave au-dessus se mêle au son.', 'Raise harmonic 2: the octave above blends in.'), check: p => p.ops[1].ol >= 80 },
              { text: T('Ajoute la 3 et la 4.', 'Add 3 and 4.'), check: p => p.ops[2].ol >= 80 && p.ops[3].ol >= 80 },
              { text: T('Monte-les toutes : l’onde prend des dents, on approche de la « scie », le son le plus brillant.', 'Raise them all: the wave grows teeth, close to a “saw”, the brightest sound.'), check: p => p.ops.slice(1).every(o => o.ol >= 85) },
            ] },
          { type: 'synth', views: ['spectrum', 'scope'], controls: [HARM(2), HARM(3), HARM(4), HARM(5), HARM(6)], play: 'C4w',
            patch: () => DRAWBARS([99, 0, 0, 0, 0, 0]),
            text: T('Maintenant, seulement les harmoniques **impaires**.', 'Now only the **odd** harmonics.'),
            goals: [
              { text: T('Monte la 3 et la 5, laisse la 2, la 4 et la 6 à zéro : un son creux, comme une clarinette. L’onde ressemble à un créneau, le « carré ».', 'Raise 3 and 5, keep 2, 4 and 6 at zero: a hollow sound, like a clarinet. The wave looks like a battlement, the “square”.'),
                check: p => p.ops[2].ol >= 80 && p.ops[4].ol >= 75 && [1, 3, 5].every(i => p.ops[i].ol <= 20) },
            ] },
        ],
      },
      {
        id: 'y3',
        title: T('Copier un son', 'Copying a sound'),
        goal: T('Retrouver à l’oreille le dosage des harmoniques.', 'Find the harmonic mix by ear.'),
        lab: DRAWBARS, keep: 'Copie',
        steps: [
          { type: 'quiz', rounds: [
            { q: T('Lequel a le plus d’harmoniques ?', 'Which has more harmonics?'), sounds: [DRAWBARS([99, 90, 85, 80, 75, 70]), DRAWBARS([99, 0, 0, 0, 0, 0])], options: ['A', 'B'], answer: 0 },
            { q: T('Lequel est le son « impair », le plus creux ?', 'Which is the “odd”, hollower sound?'), sounds: [DRAWBARS([99, 85, 0, 0, 0, 0]), DRAWBARS([99, 0, 88, 0, 82, 0])], options: ['A', 'B'], answer: 1 },
          ] },
          { type: 'match', views: ['spectrum'], controls: [HARM(2), HARM(3), HARM(4)], tol: 10, play: 'C4w',
            text: T('Écoute la cible, puis règle les harmoniques 2 à 4 pour obtenir le même son. Le spectre de la cible s’affiche pendant qu’elle joue.', 'Listen to the target, then set harmonics 2 to 4 to get the same sound. The target’s spectrum shows while it plays.'),
            target: p => { p.ops[1].ol = 88; p.ops[2].ol = 0; p.ops[3].ol = 82; } },
          { type: 'match', views: ['spectrum'], controls: [HARM(2), HARM(3), HARM(4), HARM(5)], tol: 10, play: 'C4w', patch: () => DRAWBARS(),
            text: T('Un peu plus dur : quatre harmoniques.', 'A bit harder: four harmonics.'),
            target: p => { p.ops[1].ol = 0; p.ops[2].ol = 90; p.ops[3].ol = 0; p.ops[4].ol = 84; } },
        ],
      },
    ],
  },

  // ═══ Unit 2 ═══════════════════════════════════════════════════
  {
    id: 'su2',
    title: T('L’enveloppe', 'The envelope'),
    blurb: T('Comment un son naît, vit et s’éteint.', 'How a sound starts, lives and fades.'),
    lessons: [
      {
        id: 'v1',
        title: T('Attaque et relâchement', 'Attack and release'),
        goal: T('Régler le début et la fin d’un son.', 'Shape the start and end of a sound.'),
        lab: ENV, keep: 'Enveloppe',
        steps: [
          { type: 'info', title: T('Naître, vivre, s’éteindre', 'Start, live, fade'),
            text: T('L’**enveloppe** décrit le volume d’un son dans le temps, en quatre moments :\n**Attaque** : le temps pour monter.\n**Déclin** : le temps pour redescendre vers…\n**Maintien** : le niveau tenu tant que la touche est enfoncée.\n**Relâchement** : le temps pour s’éteindre une fois la touche lâchée.\nDans Créer, chaque opérateur a 4 vitesses et 4 niveaux : c’est la même chose, en plus détaillé.',
              'The **envelope** describes a sound’s volume over time, in four moments:\n**Attack**: the time to rise.\n**Decay**: the time to fall towards…\n**Sustain**: the level held while the key is down.\n**Release**: the time to fade once the key is let go.\nIn Create, each operator has 4 rates and 4 levels: the same thing, in more detail.') },
          { type: 'synth', views: ['scope'], env: 0, controls: [ATT, REL], play: 'C4w',
            goals: [
              { text: T('Attaque lente : le son arrive doucement, comme un archet.', 'Slow attack: the sound fades in, like a bow.'), check: p => att(p) >= 50 },
              { text: T('Relâchement long : lâche la touche, le son traîne.', 'Long release: let go of the key, the sound lingers.'), check: p => rel(p) >= 50 },
              { text: T('Retour au son sec : attaque instantanée, relâchement court.', 'Back to a dry sound: instant attack, short release.'), check: p => att(p) <= 4 && rel(p) <= 20 },
            ] },
        ],
      },
      {
        id: 'v2',
        title: T('Déclin et maintien', 'Decay and sustain'),
        goal: T('Faire tenir un son, ou le laisser s’éteindre.', 'Make a sound hold, or let it die away.'),
        lab: ENV, keep: 'Enveloppe',
        steps: [
          { type: 'synth', views: ['scope'], env: 0, controls: [DEC, SUS], play: 'C4w',
            text: T('Garde la touche enfoncée pendant ces essais.', 'Keep the key down while you try these.'),
            goals: [
              { text: T('Maintien à 0 : le son s’éteint tout seul, même touche enfoncée.', 'Sustain at 0: the sound dies away by itself, key still down.'), check: p => sus(p) <= 5 },
              { text: T('Allonge le déclin : un son de piano, qui s’éteint lentement.', 'Lengthen the decay: a piano-like sound, fading slowly.'), check: p => sus(p) <= 5 && dec(p) >= 55 },
              { text: T('Maintien au maximum : le son tient tant que tu appuies, comme un orgue.', 'Sustain at maximum: the sound holds as long as you press, like an organ.'), check: p => sus(p) >= 95 },
            ] },
        ],
      },
      {
        id: 'v3',
        title: T('Écouter les enveloppes', 'Hearing envelopes'),
        goal: T('Reconnaître une enveloppe à l’oreille, puis la recopier.', 'Recognise an envelope by ear, then copy it.'),
        lab: ENV, keep: 'Enveloppe',
        steps: [
          { type: 'quiz', rounds: [
            { q: T('Lequel a l’attaque la plus lente ?', 'Which has the slower attack?'), sounds: [ENV([99, 99, 99, 72]), ENV([45, 99, 99, 72])], options: ['A', 'B'], answer: 1 },
            { q: T('Lequel s’éteint tout seul, touche enfoncée ?', 'Which dies away by itself, key down?'), sounds: [ENV([99, 45, 45, 70], [99, 0, 0, 0]), ENV()], options: ['A', 'B'], answer: 0 },
            { q: T('Lequel a le relâchement le plus long ?', 'Which has the longer release?'), sounds: [ENV([99, 99, 99, 80]), ENV([99, 99, 99, 38])], plays: ['C4q rh.', 'C4q rh.'], options: ['A', 'B'], answer: 1 },
          ] },
          { type: 'match', views: ['scope'], env: 0, controls: [ATT, REL], tol: 12, play: 'C4h rh',
            text: T('Recopie l’enveloppe de la cible : écoute bien le début et la fin.', 'Copy the target’s envelope: listen closely to the start and the end.'),
            target: p => { p.ops[0].r[0] = 99 - 55; p.ops[0].r[3] = 99 - 55; } },
        ],
      },
      {
        id: 'v4',
        title: T('Défis : pincé et nappe', 'Challenges: pluck and pad'),
        goal: T('Deux sons opposés, avec les quatre réglages.', 'Two opposite sounds, with all four controls.'),
        lab: ENV, keep: 'Nappe',
        steps: [
          { type: 'synth', views: ['scope'], env: 0, controls: [ATT, DEC, SUS, REL], play: 'C4q E4q G4q C5q',
            text: T('Un son **pincé**, comme une harpe ou une guitare : il démarre net, puis s’éteint tout seul.', 'A **plucked** sound, like a harp or a guitar: a sharp start, then it dies away by itself.'),
            goals: [{ text: T('Attaque instantanée, maintien à zéro, déclin moyen.', 'Instant attack, zero sustain, medium decay.'), check: p => att(p) <= 4 && sus(p) <= 10 && dec(p) >= 35 && dec(p) <= 75 }] },
          { type: 'synth', views: ['scope'], env: 0, controls: [ATT, DEC, SUS, REL], play: 'C4+E4+G4w', patch: () => ENV(),
            text: T('Une **nappe**, comme un tapis de cordes : elle entre doucement, tient, puis s’efface lentement.', 'A **pad**, like a bed of strings: it fades in, holds, then fades out slowly.'),
            goals: [{ text: T('Attaque lente, maintien haut, relâchement long.', 'Slow attack, high sustain, long release.'), check: p => att(p) >= 45 && sus(p) >= 80 && rel(p) >= 45 }] },
        ],
      },
    ],
  },

  // ═══ Unit 3 ═══════════════════════════════════════════════════
  {
    id: 'su3',
    title: T('La FM : porteuse et modulateur', 'FM: carrier and modulator'),
    blurb: T('Deux opérateurs suffisent pour fabriquer des timbres riches.', 'Two operators are enough to make rich tones.'),
    lessons: [
      {
        id: 'w1',
        title: T('Porteuse et modulateur', 'Carrier and modulator'),
        goal: T('Faire apparaître des harmoniques avec un seul réglage.', 'Make harmonics appear with a single control.'),
        lab: () => FM(0), keep: 'FM',
        steps: [
          { type: 'info', title: T('Un opérateur en secoue un autre', 'One operator shakes another'),
            text: T('Empiler six sinusoïdes, c’est lourd. La **FM** fait plus malin : un opérateur, le **modulateur**, fait trembler très vite la hauteur d’un autre, la **porteuse**.\nOn n’entend que la porteuse, mais ce tremblement très rapide fait **apparaître des harmoniques**. Plus le modulateur est fort, plus il y en a.\nDans Créer, sur le schéma, les porteuses sont en bas, les modulateurs au-dessus.',
              'Stacking six sine waves is heavy. **FM** is smarter: one operator, the **modulator**, makes another one’s pitch wobble very fast, the **carrier**.\nYou only hear the carrier, but that very fast wobble **makes harmonics appear**. The stronger the modulator, the more of them.\nIn Create, on the diagram, carriers sit at the bottom, modulators above.') },
          { type: 'synth', views: ['spectrum', 'scope'], controls: [MOD], play: 'C4w',
            goals: [
              { text: T('Monte la modulation : des harmoniques poussent dans le spectre.', 'Raise the modulation: harmonics grow in the spectrum.'), check: p => p.ops[1].ol >= 65 },
              { text: T('Encore : le son devient brillant, presque nasillard.', 'More: the sound gets bright, almost nasal.'), check: p => p.ops[1].ol >= 88 },
              { text: T('Redescends à zéro : retour à la sinusoïde.', 'Back down to zero: the sine wave again.'), check: p => p.ops[1].ol <= 15 },
            ] },
        ],
      },
      {
        id: 'w2',
        title: T('Le rapport', 'The ratio'),
        goal: T('Changer la couleur du son avec le rapport du modulateur.', 'Change the colour of the sound with the modulator’s ratio.'),
        lab: () => FM(80), keep: 'FM rapport',
        steps: [
          { type: 'info', title: T('La vitesse du modulateur', 'How fast the modulator goes'),
            text: T('Le **rapport** dit à quelle vitesse le modulateur tremble, par rapport à la note jouée.\n**Rapport 1** : toutes les harmoniques apparaissent. C’est un son proche de la **scie**.\n**Rapport 2** : seulement les harmoniques **impaires**. C’est un son creux, proche du **carré**.\nLes autres rapports entiers donnent d’autres couleurs. Voilà comment la FM remplace le choix d’une forme d’onde.',
              'The **ratio** says how fast the modulator wobbles, compared to the note played.\n**Ratio 1**: every harmonic appears. A sound close to the **saw**.\n**Ratio 2**: only the **odd** harmonics. A hollow sound, close to the **square**.\nOther whole ratios give other colours. That is how FM replaces picking a waveform.') },
          { type: 'synth', views: ['spectrum', 'scope'], controls: [RATIO, MOD], play: 'C4w',
            goals: [
              { text: T('Passe au rapport 2 : une harmonique sur deux disparaît du spectre.', 'Switch to ratio 2: every other harmonic leaves the spectrum.'), check: p => p.ops[1].coarse === 2 },
              { text: T('Essaie le rapport 3, puis 4 : écoute la couleur changer.', 'Try ratio 3, then 4: hear the colour change.'), check: (p, played, seen) => seen.has('op2.coarse=3') && p.ops[1].coarse === 4 },
              { text: T('Reviens au rapport 1.', 'Back to ratio 1.'), check: p => p.ops[1].coarse === 1 },
            ] },
        ],
      },
      {
        id: 'w3',
        title: T('Le feedback', 'Feedback'),
        goal: T('Rendre un son plus mordant, jusqu’au bruit.', 'Make a sound bite harder, all the way to noise.'),
        lab: () => FM(70), keep: 'FM feedback',
        steps: [
          { type: 'synth', views: ['spectrum', 'scope'], controls: [FB, MOD], play: 'C4w',
            text: T('Le **feedback** renvoie le modulateur sur lui-même : il se module tout seul. Son onde se tord en dents de scie, et le son prend du mordant.', '**Feedback** sends the modulator back into itself: it modulates itself. Its wave bends into a saw, and the sound gets bite.'),
            goals: [
              { text: T('Monte le feedback à 4 ou plus : écoute les dents arriver.', 'Raise feedback to 4 or more: hear the teeth come in.'), check: p => p.fb >= 4 },
              { text: T('Tout au maximum, feedback et modulation : on approche du bruit.', 'Everything to the max, feedback and modulation: close to noise.'), check: p => p.fb === 7 && p.ops[1].ol >= 95 },
            ] },
        ],
      },
      {
        id: 'w4',
        title: T('Une brillance qui bouge', 'Brightness that moves'),
        goal: T('Donner une enveloppe au modulateur.', 'Give the modulator an envelope.'),
        lab: () => FM(85), keep: 'FM cuivre',
        steps: [
          { type: 'info', title: T('Le secret de la FM', 'The secret of FM'),
            text: T('Le modulateur a lui aussi une enveloppe. Comme son niveau règle la brillance, **son enveloppe fait bouger le timbre** dans le temps.\nUn modulateur qui retombe vite : un **claquement** au début, puis un son doux, comme une corde frappée. Un modulateur qui arrive lentement : le son **s’ouvre**, comme un cuivre.',
              'The modulator has an envelope too. Since its level sets the brightness, **its envelope moves the tone** over time.\nA modulator that drops fast: a **click** at the start, then a soft sound, like a struck string. A modulator that comes in slowly: the sound **opens up**, like brass.') },
          { type: 'synth', views: ['spectrum', 'scope'], env: 1, controls: [MOD, MDEC, MSUS], play: 'C4q E4q G4q C5q',
            text: T('Un claquement : la brillance juste au début.', 'A click: brightness only at the start.'),
            goals: [{ text: T('Maintien de la modulation bas, déclin court ou moyen.', 'Low modulation sustain, short or medium decay.'), check: p => p.ops[1].l[2] <= 20 && 99 - p.ops[1].r[1] <= 60 && p.ops[1].ol >= 80 }] },
          { type: 'synth', views: ['spectrum', 'scope'], env: 1, controls: [MOD, MATT, MSUS], play: 'C4w', patch: () => FM(85),
            text: T('Un cuivre : la brillance arrive un peu après la note.', 'Brass: the brightness comes in just after the note.'),
            goals: [{ text: T('Attaque de la modulation un peu lente, maintien haut.', 'Slightly slow modulation attack, high sustain.'), check: p => 99 - p.ops[1].r[0] >= 30 && p.ops[1].l[2] >= 80 }] },
        ],
      },
      {
        id: 'w5',
        title: T('Bilan FM', 'FM check-point'),
        goal: T('Entendre le rapport et la modulation, puis recopier un son.', 'Hear the ratio and the modulation, then copy a sound.'),
        lab: () => FM(40), keep: 'FM copie',
        steps: [
          { type: 'quiz', rounds: [
            { q: T('Lequel sonne le plus creux ?', 'Which sounds hollower?'), sounds: [FM(85, 1), FM(85, 2)], options: ['A', 'B'], answer: 1 },
            { q: T('Lequel est le plus modulé ?', 'Which is more modulated?'), sounds: [FM(92), FM(55)], options: ['A', 'B'], answer: 0 },
            { q: T('Lequel a du feedback ?', 'Which has feedback?'), sounds: [FM(75, 1, 0), FM(75, 1, 7)], options: ['A', 'B'], answer: 1 },
          ] },
          { type: 'match', views: ['spectrum', 'scope'], controls: [RATIO, MOD], tol: 12, play: 'C4w',
            text: T('Retrouve le rapport et la modulation de la cible.', 'Find the target’s ratio and modulation.'),
            target: p => { p.ops[1].coarse = 2; p.ops[1].ol = 84; } },
        ],
      },
    ],
  },

  // ═══ Unit: waveforms ══════════════════════════════════════════
  {
    id: 'suf',
    title: T('Les formes d’onde', 'Waveforms'),
    blurb: T('Sinus, triangle, carré, scie : les fabriquer avec des harmoniques, puis avec la FM.', 'Sine, triangle, square, saw: build them from harmonics, then with FM.'),
    lessons: [
      {
        id: 'f1',
        title: T('Les quatre formes', 'The four shapes'),
        goal: T('Voir et entendre les formes d’onde classiques.', 'See and hear the classic waveforms.'),
        lab: WAVES.sine, keep: 'Forme',
        steps: [
          { type: 'info', title: T('Pas de bouton « forme d’onde »', 'No “waveform” button'),
            text: T('Sur un synthé analogique, on choisit une **forme d’onde** : sinus, triangle, carré ou scie. Ici, chaque opérateur ne joue qu’une sinusoïde, c’est tout.\nMais chaque forme n’est qu’une **recette d’harmoniques** : lesquelles, et à quel niveau. Avec les opérateurs et l’**algorithme**, on peut donc les fabriquer toutes.\nTrois façons de faire :\n**En empilant** : un opérateur par harmonique, tous entendus (côte à côte).\n**En FM** : un modulateur crée les harmoniques d’un coup.\n**Avec le feedback** : un opérateur qui se module lui-même.',
              'On an analogue synth you pick a **waveform**: sine, triangle, square or saw. Here, each operator plays only a sine wave, that’s all.\nBut each shape is just a **recipe of harmonics**: which ones, and how loud. With the operators and the **algorithm**, you can build them all.\nThree ways to do it:\n**By stacking**: one operator per harmonic, all heard (side by side).\n**With FM**: a modulator makes the harmonics in one go.\n**With feedback**: an operator modulating itself.') },
          { type: 'synth', views: ['scope', 'spectrum'], controls: [PICK], play: 'C3w',
            text: T('Ces quatre sons sont fabriqués en empilant six sinusoïdes. Tiens une note grave et passe d’une forme à l’autre : regarde la forme **et** le spectre.', 'These four sounds are made by stacking six sine waves. Hold a low note and switch shapes: watch the shape **and** the spectrum.'),
            goals: [
              { text: T('**Triangle** : seulement les harmoniques impaires (1, 3, 5…), très faibles. Doux, presque une flûte.', '**Triangle**: odd harmonics only (1, 3, 5…), very faint. Soft, almost a flute.'), check: (p, played, seen) => seen.has('name=Triangle') && played.size > 0 },
              { text: T('**Carré** : les mêmes harmoniques impaires, mais bien plus fortes. Creux, comme une clarinette.', '**Square**: the same odd harmonics, but much louder. Hollow, like a clarinet.'), check: (p, played, seen) => seen.has('name=Carré') },
              { text: T('**Scie** : **toutes** les harmoniques. Le plus brillant, la base des cordes et des cuivres de synthé.', '**Saw**: **every** harmonic. The brightest, the root of synth strings and brass.'), check: (p, played, seen) => seen.has('name=Scie') },
            ] },
          { type: 'quiz', rounds: [
            { q: T('Lequel est la scie ?', 'Which is the saw?'), sounds: [WAVES.square(), WAVES.saw()], play: 'C3h', options: ['A', 'B'], answer: 1, explain: T('Le carré n’a pas les harmoniques paires : il sonne plus creux.', 'The square lacks the even harmonics: it sounds hollower.') },
            { q: T('Lequel est le triangle ?', 'Which is the triangle?'), sounds: [WAVES.triangle(), WAVES.square()], play: 'C4h', options: ['A', 'B'], answer: 0, explain: T('Mêmes harmoniques, mais celles du triangle sont bien plus faibles.', 'Same harmonics, but the triangle’s are much fainter.') },
          ] },
        ],
      },
      {
        id: 'f2',
        title: T('Fabriquer la scie', 'Building the saw'),
        goal: T('Doser les harmoniques une à une pour obtenir une scie.', 'Set the harmonics one by one to get a saw.'),
        lab: WAVES.sine, keep: 'Ma scie',
        steps: [
          { type: 'info', title: T('La recette de la scie', 'The saw recipe'),
            text: T('La scie contient **toutes** les harmoniques, et l’harmonique n est **n fois plus faible** que la note : la 2 deux fois, la 3 trois fois…\nL’algorithme **côte à côte** (32) fait entendre les six opérateurs. On règle chacun sur une harmonique (rapport 1, 2, 3… 6), puis on dose son niveau.\nLe niveau d’un opérateur se compte en crans d’environ 0,75 dB : **deux fois plus faible, c’est 8 crans de moins**.',
              'The saw holds **every** harmonic, and harmonic n is **n times weaker** than the note: 2 twice, 3 three times…\nThe **side by side** algorithm (32) lets all six operators be heard. Each is set on one harmonic (ratio 1, 2, 3… 6), then its level is set.\nAn operator’s level counts in steps of about 0.75 dB: **twice as weak is 8 steps less**.') },
          { type: 'synth', graph: true, views: ['spectrum', 'scope'], controls: [HARM(2), HARM(3), HARM(4), HARM(5), HARM(6)], play: 'C3w',
            text: T('Tiens une note grave et monte les harmoniques à leur niveau.', 'Hold a low note and bring the harmonics to their level.'),
            goals: [
              { text: T('L’harmonique 2 deux fois plus faible : vers **91**.', 'Harmonic 2 twice as weak: about **91**.'), check: p => Math.abs(p.ops[1].ol - 91) <= 4 },
              { text: T('Les suivantes un peu plus bas à chaque fois : 3 vers **86**, 4 vers **83**, 5 vers **80**, 6 vers **78**.', 'The next ones a little lower each time: 3 about **86**, 4 about **83**, 5 about **80**, 6 about **78**.'), check: p => near(p, SAW_L, 4) },
            ] },
          { type: 'info', title: T('Presque une scie', 'Almost a saw'),
            text: T('Sur l’oscilloscope, une rampe qui monte puis retombe d’un coup, avec de petites vagues : il manque les harmoniques 7, 8, 9… qu’il faudrait d’autres opérateurs pour ajouter.\nC’est la limite de l’empilement : **un opérateur par harmonique**. La FM, plus loin, fait mieux avec deux.',
              'On the oscilloscope, a ramp that rises then drops at once, with little ripples: harmonics 7, 8, 9… are missing, and they would need more operators.\nThat is the limit of stacking: **one operator per harmonic**. FM, later on, does better with two.') },
        ],
      },
      {
        id: 'f3',
        title: T('Le carré et le triangle', 'Square and triangle'),
        goal: T('Les harmoniques impaires, fortes ou faibles.', 'The odd harmonics, loud or faint.'),
        lab: () => ADD('Impaires', ODD, [99, 0, 0, 0, 0, 0]), keep: 'Mon carré',
        steps: [
          { type: 'synth', graph: true, views: ['spectrum', 'scope'], controls: [ODD_H(2), ODD_H(3), ODD_H(4), ODD_H(5), ODD_H(6)], play: 'C3w',
            text: T('Les opérateurs sont réglés sur les harmoniques **impaires** : 1, 3, 5, 7, 9, 11. Le **carré**, c’est elles seules, chacune n fois plus faible, comme pour la scie.', 'The operators are set on the **odd** harmonics: 1, 3, 5, 7, 9, 11. The **square** is them alone, each n times weaker, as for the saw.'),
            goals: [
              { text: T('Harmonique 3 vers **86** (trois fois plus faible), 5 vers **80**.', 'Harmonic 3 about **86** (three times weaker), 5 about **80**.'), check: p => Math.abs(p.ops[1].ol - 86) <= 4 && Math.abs(p.ops[2].ol - 80) <= 4 },
              { text: T('Puis 7 vers **76**, 9 vers **74**, 11 vers **71** : l’onde prend la forme d’un créneau.', 'Then 7 about **76**, 9 about **74**, 11 about **71**: the wave turns into a battlement.'), check: p => near(p, SQUARE_L, 4) },
            ] },
          { type: 'synth', graph: true, views: ['spectrum', 'scope'], controls: [ODD_H(2), ODD_H(3), ODD_H(4), ODD_H(5), ODD_H(6)], play: 'C3w', patch: () => ADD('Mon triangle', ODD, SQUARE_L),
            text: T('Le **triangle** a les mêmes harmoniques, mais elles chutent bien plus vite : la n-ième est **n × n** fois plus faible (9 fois pour la 3, 25 fois pour la 5). Pars du carré et baisse-les.', 'The **triangle** has the same harmonics, but they fall much faster: the nth is **n × n** times weaker (9 times for 3, 25 times for 5). Start from the square and lower them.'),
            goals: [
              { text: T('Harmonique 3 vers **74**, 5 vers **62**.', 'Harmonic 3 about **74**, 5 about **62**.'), check: p => Math.abs(p.ops[1].ol - 74) <= 5 && Math.abs(p.ops[2].ol - 62) <= 5 },
              { text: T('7 vers **54**, 9 vers **48**, 11 vers **44**. Le son devient doux, presque une sinusoïde.', '7 about **54**, 9 about **48**, 11 about **44**. The sound turns soft, almost a sine.'), check: p => near(p, TRIANGLE_L, 5) },
            ] },
          { type: 'info', title: T('Un triangle un peu bossu', 'A slightly humped triangle'),
            text: T('À l’écran, ton triangle ressemble plutôt à une vague bossue. Un vrai triangle demande de **retourner** une harmonique sur deux (la 3, la 7, la 11…), ce que les opérateurs ne savent pas faire : ils démarrent tous dans le même sens.\nL’oreille, elle, n’entend pas ce retournement : seul compte le niveau de chaque harmonique. **Ça sonne comme un triangle.**',
              'On screen, your triangle looks more like a humped wave. A true triangle needs every other harmonic **flipped** (3, 7, 11…), which operators can’t do: they all start the same way.\nThe ear can’t hear that flip: only each harmonic’s level counts. **It sounds like a triangle.**') },
        ],
      },
      {
        id: 'f4',
        title: T('Les formes en FM', 'Shapes with FM'),
        goal: T('Une scie ou un carré avec deux opérateurs, ou un seul.', 'A saw or a square with two operators, or just one.'),
        lab: () => FM(0), keep: 'Forme FM',
        steps: [
          { type: 'info', title: T('Deux opérateurs au lieu de six', 'Two operators instead of six'),
            text: T('L’algorithme change tout : au lieu de mettre les opérateurs **côte à côte**, on en branche un **sur** l’autre.\n**Rapport 1** : le modulateur crée toutes les harmoniques, comme une **scie**.\n**Rapport 2** : seulement les impaires, comme un **carré**.\nLa **modulation** décide jusqu’où montent les harmoniques. Ce n’est pas exactement la recette « n fois plus faible », mais à l’oreille on s’en approche, avec deux opérateurs seulement.',
              'The algorithm changes everything: instead of putting operators **side by side**, you plug one **into** the other.\n**Ratio 1**: the modulator makes every harmonic, like a **saw**.\n**Ratio 2**: odd ones only, like a **square**.\nThe **modulation** decides how high the harmonics reach. It isn’t exactly the “n times weaker” recipe, but to the ear it comes close, with only two operators.') },
          { type: 'synth', graph: true, views: ['spectrum', 'scope'], controls: [RATIO, MOD], play: 'C3w',
            goals: [
              { text: T('Une **scie** : rapport 1, modulation entre 70 et 85.', 'A **saw**: ratio 1, modulation between 70 and 85.'), check: (p, played) => p.ops[1].coarse === 1 && p.ops[1].ol >= 70 && p.ops[1].ol <= 85 && played.size > 0 },
              { text: T('Un **carré** : rapport 2, modulation entre 70 et 85. Les harmoniques paires disparaissent.', 'A **square**: ratio 2, modulation between 70 and 85. The even harmonics go.'), check: p => p.ops[1].coarse === 2 && p.ops[1].ol >= 70 && p.ops[1].ol <= 85 },
            ] },
          { type: 'synth', graph: true, views: ['spectrum', 'scope'], controls: [FB], play: 'C3w', patch: () => FB_SAW(0),
            text: T('Encore plus économe : **un seul opérateur**, avec la boucle de **feedback** du schéma. Il se module lui-même et son onde penche en dents de scie.', 'Even thriftier: **one operator**, with the diagram’s **feedback** loop. It modulates itself and its wave leans into a saw.'),
            goals: [
              { text: T('Monte le feedback à 6 : une scie, avec un seul opérateur. À 7, elle se déforme déjà vers le bruit.', 'Raise feedback to 6: a saw, from one operator. At 7 it already bends towards noise.'), check: p => p.fb === 6 },
            ] },
        ],
      },
      {
        id: 'f5',
        title: T('Bilan formes d’onde', 'Waveforms check-point'),
        goal: T('Reconnaître une forme à l’oreille, puis la refaire en FM.', 'Recognise a shape by ear, then rebuild it with FM.'),
        lab: () => FM(0), keep: 'Carré FM',
        steps: [
          { type: 'quiz', rounds: () => ['saw', 'square', 'triangle'].sort(() => Math.random() - 0.5).map(k => (
            { q: T('Quelle forme d’onde ?', 'Which waveform?'), sounds: [WAVES[k]()], play: 'C3h', options: WAVE_NAMES.slice(1).map(([, l]) => l), answer: ['triangle', 'square', 'saw'].indexOf(k) })) },
          { type: 'match', graph: true, views: ['spectrum', 'scope'], controls: [RATIO, MOD], tol: 10, play: 'C3w',
            text: T('Écoute la cible, une forme faite en FM, et retrouve-la.', 'Listen to the target, a shape made with FM, and find it.'),
            target: p => { p.ops[1].coarse = 2; p.ops[1].ol = 78; } },
        ],
      },
    ],
  },

  // ═══ Unit 4 ═══════════════════════════════════════════════════
  {
    id: 'su4',
    title: T('Le son qui évolue', 'A sound that changes'),
    blurb: T('Le toucher, les graves et les aigus, la hauteur qui glisse.', 'Touch, low and high notes, sliding pitch.'),
    lessons: [
      {
        id: 'q1',
        title: T('La vélocité', 'Velocity'),
        goal: T('Faire réagir le son à la force du jeu.', 'Make the sound respond to how hard you play.'),
        lab: () => FM(85), keep: 'Toucher',
        steps: [
          { type: 'info', title: T('Jouer fort, c’est plus brillant', 'Playing hard is brighter'),
            text: T('Sur un vrai piano, une note jouée fort n’est pas seulement plus forte : elle est aussi **plus brillante**.\nChaque opérateur a une **sensibilité au toucher**, de 0 à 7. Sur la porteuse, elle règle le volume selon ta force. Sur le modulateur, elle règle la **brillance**.\nSur le clavier à l’écran, appuie plus bas sur la touche pour jouer fort.',
              'On a real piano, a note played hard isn’t only louder: it is also **brighter**.\nEach operator has a **velocity sensitivity**, from 0 to 7. On the carrier it sets the volume from your force. On the modulator it sets the **brightness**.\nOn the on-screen keyboard, press lower on the key to play hard.') },
          { type: 'synth', views: ['spectrum'], controls: [C('op2.vel', T('Toucher de la brillance', 'Brightness touch')), C('op1.vel', T('Toucher du volume', 'Volume touch'))], play: 'C4q E4q G4h',
            goals: [
              { text: T('Monte le toucher de la brillance à 5 ou plus, puis joue très doucement et très fort : le spectre s’allume quand tu tapes.', 'Raise brightness touch to 5 or more, then play very softly and very hard: the spectrum lights up when you hit hard.'), check: (p, played, seen, touch) => p.ops[1].vel >= 5 && vMax(touch) >= 40 },
              { text: T('Ajoute le toucher du volume à 3 ou plus : les nuances reviennent.', 'Add volume touch at 3 or more: dynamics come back.'), check: p => p.ops[0].vel >= 3 },
            ] },
        ],
      },
      {
        id: 'q2',
        title: T('Graves et aigus', 'Low and high notes'),
        goal: T('Adapter le son à la hauteur jouée.', 'Fit the sound to the pitch played.'),
        lab: PLUCKY, keep: 'Clavier',
        steps: [
          { type: 'info', title: T('Comme un vrai instrument', 'Like a real instrument'),
            text: T('Sur un piano, les notes aiguës sont **plus courtes** et **moins brillantes** que les graves. Sans ça, un son de synthé devient vite criard en haut du clavier.\nDeux réglages s’en chargent : l’**échelle de vitesse** raccourcit l’enveloppe dans les aigus, et l’**échelle de niveau** baisse un opérateur d’un côté du clavier.',
              'On a piano, high notes are **shorter** and **less bright** than low ones. Without that, a synth sound soon gets shrill at the top of the keyboard.\nTwo controls handle it: **rate scaling** shortens the envelope in the high notes, and **level scaling** lowers an operator on one side of the keyboard.') },
          { type: 'synth', views: ['spectrum'], range: { lo: 36, hi: 96 }, controls: [C('op2.rd', T('Moins de brillance dans les aigus', 'Less brightness up high')), C('op1.rs', T('Aigus plus courts', 'Shorter high notes'))], play: 'C2q C3q C4q C5q C6h',
            goals: [
              { text: T('Joue une note tout en bas puis une tout en haut : écoute comme l’aigu crie.', 'Play a note at the very bottom then one at the very top: hear how shrill the top is.'), check: (p, played) => played.size > 1 && Math.min(...played) <= 48 && Math.max(...played) >= 84 },
              { text: T('Monte « moins de brillance dans les aigus » à 50 ou plus et rejoue en haut.', 'Raise “less brightness up high” to 50 or more and play up high again.'), check: p => p.ops[1].rd >= 50 },
              { text: T('Monte « aigus plus courts » à 4 ou plus : les notes hautes s’éteignent plus vite.', 'Raise “shorter high notes” to 4 or more: high notes die away faster.'), check: p => p.ops[0].rs >= 4 },
            ] },
        ],
      },
      {
        id: 'q3',
        title: T('La hauteur qui glisse', 'Sliding pitch'),
        goal: T('Faire partir la note d’ailleurs : percussions et effets.', 'Start the note from elsewhere: drums and effects.'),
        lab: () => { const p = PLUCKY(); p.ops[1].ol = 60; return p; }, keep: 'Glissé',
        steps: [
          { type: 'synth', views: ['scope'], controls: [C('pitchEnv.l.3', T('Hauteur au départ', 'Starting pitch'), { offset: 50, bipolar: true, min: -40, max: 40 }), C('pitchEnv.r.0', T('Durée du glissé', 'Slide length'), { invert: true })], play: 'C3q C3q G2h',
            text: T('L’**enveloppe de hauteur** fait partir la note plus haut ou plus bas, puis la ramène à sa vraie hauteur. Rapide, ça donne le « tchac » d’un tom ; lente, une sirène.', 'The **pitch envelope** starts the note higher or lower, then brings it back to its real pitch. Fast, it gives a tom’s “thump”; slow, a siren.'),
            goals: [
              { text: T('Fais partir la note bien plus haut, avec un glissé court : un tom électronique.', 'Start the note well above, with a short slide: an electronic tom.'), check: p => p.pitchEnv.l[3] - 50 >= 15 && 99 - p.pitchEnv.r[0] <= 30 },
              { text: T('Allonge le glissé : la note descend lentement, comme un laser.', 'Lengthen the slide: the note sweeps down slowly, like a laser.'), check: p => p.pitchEnv.l[3] - 50 >= 15 && 99 - p.pitchEnv.r[0] >= 50 },
            ] },
        ],
      },
      {
        id: 'q4',
        title: T('Défi : un cuivre expressif', 'Challenge: expressive brass'),
        goal: T('Une brillance qui s’ouvre, et qui suit ta force.', 'Brightness that opens up, and follows your force.'),
        lab: () => FM(80), keep: 'Mon cuivre',
        steps: [
          { type: 'synth', views: ['spectrum'], env: 1, controls: [MOD, MATT, MSUS, C('op2.vel', T('Toucher de la brillance', 'Brightness touch'))], play: 'C4h G4h',
            text: T('Un cuivre s’ouvre au début de la note, et sonne plus fort et plus brillant quand on souffle fort.', 'Brass opens up at the start of the note, and sounds louder and brighter when you blow hard.'),
            goals: [{ text: T('Modulation forte, attaque de la modulation un peu lente, maintien haut, toucher à 4 ou plus.', 'Strong modulation, slightly slow modulation attack, high sustain, touch at 4 or more.'), check: p => p.ops[1].ol >= 75 && 99 - p.ops[1].r[0] >= 30 && p.ops[1].l[2] >= 75 && p.ops[1].vel >= 4 }] },
        ],
      },
    ],
  },

  // ═══ Unit 5 ═══════════════════════════════════════════════════
  {
    id: 'su5',
    title: T('Les algorithmes', 'Algorithms'),
    blurb: T('Comment brancher les six opérateurs : empiler, additionner, désaccorder.', 'How the six operators are wired: stacking, adding, detuning.'),
    lessons: [
      {
        id: 'n1',
        title: T('Empiler ou côte à côte', 'Stacked or side by side'),
        goal: T('Entendre ce que change le branchement.', 'Hear what the wiring changes.'),
        lab: () => STACK(32), keep: 'Algorithme',
        steps: [
          { type: 'info', title: T('Le schéma', 'The diagram'),
            text: T('Un **algorithme**, c’est la façon dont les six opérateurs sont branchés. Le synthé en connaît 32 : c’est le schéma en haut de l’écran Éditer.\n**Côte à côte**, les opérateurs sont tous des porteuses : leurs sinusoïdes s’additionnent, comme les tirettes d’un orgue.\n**Empilés**, chacun module le suivant : le son devient très riche, très vite.',
              'An **algorithm** is the way the six operators are wired. The synth knows 32 of them: the diagram at the top of the Edit screen.\n**Side by side**, every operator is a carrier: their sine waves add up, like an organ’s drawbars.\n**Stacked**, each one modulates the next: the sound gets very rich, very fast.') },
          { type: 'synth', graph: true, views: ['spectrum'], controls: [C('alg', T('Branchement', 'Wiring'), { options: [[32, T('Côte à côte', 'Side by side')], [5, T('Une paire', 'One pair')], [3, T('Empilés', 'Stacked')]] })], play: 'C4w',
            text: T('Les trois mêmes opérateurs (rapports 1, 2 et 3), trois branchements.', 'The same three operators (ratios 1, 2 and 3), three wirings.'),
            goals: [
              { text: T('« Empilés » : 3 module 2, qui module 1. Écoute la richesse.', '“Stacked”: 3 modulates 2, which modulates 1. Hear the richness.'), check: p => p.alg === 3 },
              { text: T('« Une paire » : 2 module 1, et 3 s’ajoute à côté.', '“One pair”: 2 modulates 1, and 3 is added alongside.'), check: p => p.alg === 5 },
              { text: T('Retour à « Côte à côte » : trois sinusoïdes, un son d’orgue.', 'Back to “Side by side”: three sine waves, an organ sound.'), check: p => p.alg === 32 },
            ] },
        ],
      },
      {
        id: 'n2',
        title: T('L’orgue à tirettes', 'The drawbar organ'),
        goal: T('Six porteuses côte à côte, réglées comme un orgue.', 'Six carriers side by side, set like an organ.'),
        lab: ORGAN, keep: 'Mon orgue',
        steps: [
          { type: 'synth', graph: true, views: ['spectrum'], controls: [C('op1.ol', T('16′ (octave en dessous)', '16′ (octave below)')), C('op2.ol', T('8′ (la note)', '8′ (the note)')), C('op3.ol', T('4′ (octave)', '4′ (octave)')), C('op4.ol', T('2⅔′ (quinte)', '2⅔′ (fifth)')), C('op5.ol', T('2′ (2 octaves)', '2′ (2 octaves)')), C('op6.ol', T('1′ (3 octaves)', '1′ (3 octaves)'))], play: 'C4+E4+G4w',
            text: T('Un orgue à tirettes mélange des tuyaux accordés sur la note, ses octaves et sa quinte. Les noms (16′, 8′…) sont la longueur des tuyaux, en pieds.', 'A drawbar organ mixes pipes tuned to the note, its octaves and its fifth. The names (16′, 8′…) are the pipe lengths, in feet.'),
            goals: [
              { text: T('Le son « jazz » : 16′, 8′ et 2⅔′ à fond, le reste à zéro.', 'The “jazz” sound: 16′, 8′ and 2⅔′ full, the rest at zero.'), check: p => [0, 1, 3].every(i => p.ops[i].ol >= 90) && [2, 4, 5].every(i => p.ops[i].ol <= 10) },
              { text: T('Le « plein jeu » : toutes les tirettes à 85 ou plus.', 'The “full organ”: every drawbar at 85 or more.'), check: p => p.ops.every(o => o.ol >= 85) },
            ] },
        ],
      },
      {
        id: 'n3',
        title: T('Désaccorder pour épaissir', 'Detuning to thicken'),
        goal: T('Deux ou trois voix presque pareilles : un son large.', 'Two or three almost identical voices: a wide sound.'),
        lab: UNISON, keep: 'Unisson',
        steps: [
          { type: 'synth', views: ['scope'], controls: [C('op3.ol', T('Deuxième voix', 'Second voice')), C('op3.det&op4.det', T('Désaccord 2', 'Detune 2')), C('op5.ol', T('Troisième voix', 'Third voice')), C('op5.det&op6.det', T('Désaccord 3', 'Detune 3'))], play: 'C3+G3+C4w',
            text: T('Deux voix à la même hauteur s’additionnent. Désaccorde-en une d’un rien : chaque harmonique se met à **battre** à sa propre vitesse, et le son s’élargit, comme un chœur.', 'Two voices at the same pitch add up. Detune one a hair: each harmonic starts to **beat** at its own speed, and the sound widens, like a choir.'),
            goals: [
              { text: T('Ajoute la deuxième voix et désaccorde-la : écoute le battement.', 'Add the second voice and detune it: hear the beating.'), check: p => p.ops[2].ol >= 80 && p.ops[2].det !== 7 },
              { text: T('Ajoute la troisième, désaccordée **de l’autre côté**.', 'Add the third, detuned **the other way**.'), check: p => p.ops[4].ol >= 80 && (p.ops[4].det - 7) * (p.ops[2].det - 7) < 0 },
            ] },
        ],
      },
      {
        id: 'n4',
        title: T('Bilan algorithmes', 'Algorithms check-point'),
        goal: T('Reconnaître un branchement à l’oreille.', 'Recognise a wiring by ear.'),
        lab: () => STACK(32), keep: 'Algorithme',
        steps: [
          { type: 'quiz', rounds: [
            { q: T('Lequel est empilé ?', 'Which is stacked?'), sounds: [STACK(32), STACK(3)], options: ['A', 'B'], answer: 1 },
            { q: T('Lequel est désaccordé ?', 'Which is detuned?'), sounds: [(() => { const p = UNISON(); p.ops[2].ol = 92; p.ops[2].det = p.ops[3].det = 10; return p; })(), (() => { const p = UNISON(); p.ops[2].ol = 92; return p; })()], plays: ['C3+G3w', 'C3+G3w'], options: ['A', 'B'], answer: 0 },
          ] },
          { type: 'match', graph: true, views: ['spectrum'], controls: [C('alg', T('Branchement', 'Wiring'), { options: [[32, T('Côte à côte', 'Side by side')], [5, T('Une paire', 'One pair')], [3, T('Empilés', 'Stacked')]] }), C('op3.ol', T('Niveau de l’opérateur 3', 'Operator 3 level'))], tol: 12, play: 'C4w',
            text: T('Retrouve le branchement de la cible, et le niveau de l’opérateur 3.', 'Find the target’s wiring, and operator 3’s level.'),
            target: p => { p.alg = 5; p.ops[2].ol = 60; } },
        ],
      },
    ],
  },

  // ═══ Unit 6 ═══════════════════════════════════════════════════
  {
    id: 'su6',
    title: T('Mouvement et espace', 'Movement and space'),
    blurb: T('Vibrato, trémolo, filtre, réverbération et écho.', 'Vibrato, tremolo, filter, reverb and echo.'),
    lessons: [
      {
        id: 'x1',
        title: T('Le vibrato', 'Vibrato'),
        goal: T('Faire onduler la hauteur avec le LFO.', 'Make the pitch waver with the LFO.'),
        lab: VIBRATO, keep: 'Vibrato',
        steps: [
          { type: 'info', title: T('Un oscillateur trop lent pour être entendu', 'An oscillator too slow to hear'),
            text: T('Le **LFO** est un oscillateur très lent, quelques battements par seconde. On ne l’entend pas : il **fait bouger** un réglage.\nBranché sur la hauteur, il fait le **vibrato**, comme la main d’un violoniste ou la voix d’un chanteur.',
              'The **LFO** is a very slow oscillator, a few beats per second. You don’t hear it: it **moves** a setting.\nRouted to pitch, it makes **vibrato**, like a violinist’s hand or a singer’s voice.') },
          { type: 'synth', views: ['scope'], controls: [C('lfo.pmd', T('Profondeur', 'Depth')), C('lfo.speed', T('Vitesse', 'Speed')), C('lfo.delay', T('Retard', 'Delay'))], play: 'C4w',
            goals: [
              { text: T('Monte la profondeur : la note ondule.', 'Raise the depth: the note wavers.'), check: p => p.lfo.pmd >= 25 },
              { text: T('Un vibrato naturel : vitesse entre 30 et 50, profondeur entre 5 et 20.', 'A natural vibrato: speed between 30 and 50, depth between 5 and 20.'), check: p => p.lfo.speed >= 30 && p.lfo.speed <= 50 && p.lfo.pmd >= 5 && p.lfo.pmd <= 20 },
              { text: T('Ajoute du retard : le vibrato n’arrive qu’après un moment, comme un chanteur.', 'Add delay: the vibrato only comes in after a moment, like a singer.'), check: p => p.lfo.delay >= 40 && p.lfo.pmd >= 5 },
            ] },
        ],
      },
      {
        id: 'x2',
        title: T('Le trémolo', 'Tremolo'),
        goal: T('Faire pulser le volume, et changer la forme du LFO.', 'Make the volume pulse, and change the LFO’s shape.'),
        lab: () => { const p = VIBRATO(); p.ops[0].ams = 3; return p; }, keep: 'Trémolo',
        steps: [
          { type: 'synth', views: ['scope'], controls: [C('lfo.amd', T('Profondeur du trémolo', 'Tremolo depth')), C('lfo.speed', T('Vitesse', 'Speed')), C('lfo.wave', T('Forme', 'Shape'), { options: [[4, '∿'], [0, '△'], [3, '⊓'], [5, 'S/H']] })], play: 'C4w',
            text: T('Branché sur le volume, le LFO fait le **trémolo** : le son pulse. Sa **forme** change le mouvement : douce (sinus, triangle), hachée (carré), au hasard (S/H, « sample and hold »).', 'Routed to volume, the LFO makes **tremolo**: the sound pulses. Its **shape** changes the motion: smooth (sine, triangle), chopped (square), random (S/H, “sample and hold”).'),
            goals: [
              { text: T('Monte la profondeur du trémolo : le volume pulse.', 'Raise the tremolo depth: the volume pulses.'), check: p => p.lfo.amd >= 45 },
              { text: T('Forme carrée : le son est haché.', 'Square shape: the sound is chopped.'), check: p => p.lfo.wave === 3 && p.lfo.amd >= 45 },
              { text: T('Forme S/H : des pas au hasard, un son de robot.', 'S/H shape: random steps, a robot sound.'), check: p => p.lfo.wave === 5 && p.lfo.amd >= 45 },
            ] },
        ],
      },
      {
        id: 'x3',
        title: T('Le filtre', 'The filter'),
        goal: T('Couper les aigus ou les graves d’un son.', 'Cut the highs or the lows of a sound.'),
        lab: BRIGHT, keep: 'Filtré',
        steps: [
          { type: 'synth', views: ['spectrum'], controls: [C('fx.filter.pos', T('Filtre (passe-bas ← → passe-haut)', 'Filter (low-pass ← → high-pass)'), { scale: 100, bipolar: true, min: -100, max: 100 }), C('fx.filter.res', T('Résonance', 'Resonance'), { scale: 100, max: 100 })], play: 'C3w',
            text: T('Le **filtre** enlève une partie du spectre. Le **passe-bas** laisse passer les graves et coupe les aigus : le son s’assombrit. Le **passe-haut** fait l’inverse. La **résonance** ajoute une bosse au point de coupure. Dans Créer, il est dans Effets.', 'The **filter** removes part of the spectrum. **Low-pass** lets the lows through and cuts the highs: the sound darkens. **High-pass** does the opposite. **Resonance** adds a bump at the cutoff. In Create, it is under Effects.'),
            goals: [
              { text: T('Passe-bas à −40 ou moins : regarde les harmoniques hautes disparaître.', 'Low-pass at −40 or lower: watch the high harmonics vanish.'), check: () => S_FX().filter.pos <= -0.4 },
              { text: T('Ajoute de la résonance (60 ou plus) : un son « wah ».', 'Add resonance (60 or more): a “wah” sound.'), check: () => S_FX().filter.pos <= -0.3 && S_FX().filter.res >= 0.6 },
              { text: T('Passe-haut à +30 ou plus : il ne reste que les aigus, un son de téléphone.', 'High-pass at +30 or more: only the highs remain, a telephone sound.'), check: () => S_FX().filter.pos >= 0.3 },
            ] },
        ],
      },
      {
        id: 'x4',
        title: T('Réverbération et écho', 'Reverb and echo'),
        goal: T('Placer le son dans une salle.', 'Put the sound in a room.'),
        lab: PLUCKY, keep: 'Espace',
        steps: [
          { type: 'synth', fx: { delay: { on: true, mix: 0 }, reverb: { on: true } }, controls: [C('fx.reverb.mix', T('Réverbération', 'Reverb'), { scale: 100, max: 100 }), C('fx.reverb.size', T('Taille de la salle', 'Room size'), { scale: 100, max: 100 }), C('fx.delay.mix', T('Écho', 'Echo'), { scale: 100, max: 100 }), C('fx.delay.fb', T('Répétitions', 'Repeats'), { scale: 100, max: 90 })], play: 'C4q E4q G4q rq',
            text: T('La **réverbération** imite les murs d’une salle qui renvoient le son. L’**écho** (délai) le répète, en rythme avec le tempo.', '**Reverb** imitates a room’s walls bouncing the sound back. **Echo** (delay) repeats it, in time with the tempo.'),
            goals: [
              { text: T('Une cathédrale : beaucoup de réverbération, une grande salle.', 'A cathedral: lots of reverb, a big room.'), check: () => S_FX().reverb.mix >= 0.45 && S_FX().reverb.size >= 0.65 },
              { text: T('Ajoute un écho qui se répète.', 'Add an echo that repeats.'), check: () => S_FX().delay.mix >= 0.3 && S_FX().delay.fb >= 0.4 },
              { text: T('Reviens à une petite salle, sans écho.', 'Back to a small room, no echo.'), check: () => S_FX().reverb.mix <= 0.2 && S_FX().delay.mix <= 0.05 },
            ] },
        ],
      },
      {
        id: 'x5',
        title: T('Défi : une nappe vivante', 'Challenge: a living pad'),
        goal: T('Tout ensemble : enveloppe, désaccord, vibrato, espace.', 'All together: envelope, detune, vibrato, space.'),
        lab: PAD, keep: 'Ma nappe',
        steps: [
          { type: 'synth', views: ['scope'], controls: [C('op1.r.0&op2.r.0', T('Attaque', 'Attack'), { invert: true }), C('op1.r.3&op2.r.3', T('Relâchement', 'Release'), { invert: true }), C('op2.det', T('Désaccord', 'Detune')), C('lfo.pmd', T('Vibrato', 'Vibrato')), C('fx.reverb.mix', T('Réverbération', 'Reverb'), { scale: 100, max: 100 })], play: 'C3+G3+E4w',
            text: T('Une nappe qui vit : elle entre doucement, s’élargit, ondule un peu, et flotte dans une grande salle.', 'A living pad: it fades in, widens, wavers a little, and floats in a big room.'),
            goals: [{ text: T('Attaque et relâchement lents, un désaccord, un léger vibrato, de la réverbération.', 'Slow attack and release, some detune, a light vibrato, reverb.'), check: p => 99 - p.ops[0].r[0] >= 45 && 99 - p.ops[0].r[3] >= 45 && p.ops[1].det !== 7 && p.lfo.pmd >= 3 && p.lfo.pmd <= 25 && S_FX().reverb.mix >= 0.3 }] },
        ],
      },
    ],
  },

  // ═══ Unit 7 ═══════════════════════════════════════════════════
  {
    id: 'su7',
    title: T('Arpèges et séquences', 'Arpeggios and sequences'),
    blurb: T('L’arpégiateur et le séquenceur de Créer, pas à pas.', 'Create’s arpeggiator and sequencer, step by step.'),
    lessons: [
      {
        id: 'p1',
        title: T('L’arpégiateur', 'The arpeggiator'),
        goal: T('Tenir un accord et le laisser s’égrener.', 'Hold a chord and let it ripple.'),
        lab: PLUCKY, keep: 'Arpège',
        steps: [
          { type: 'info', title: T('Un accord, une note à la fois', 'One chord, one note at a time'),
            text: T('L’**arpégiateur** prend les notes que tu tiens et les rejoue **une par une**, en boucle, au tempo. Tu poses un accord, il en fait un motif.\nTu le trouves dans Créer › Arp. Les réglages sont les mêmes ici : ce que tu apprends marchera là-bas.',
              'The **arpeggiator** takes the notes you hold and replays them **one by one**, in a loop, at the tempo. You put down a chord, it turns it into a pattern.\nYou’ll find it in Create › Arp. The controls here are the same: what you learn works there.') },
          { type: 'synth', panel: 'arp', arp: { on: true, mode: 'up', rate: 0.25, octaves: 1, gate: 0.6, latch: false }, tempo: 110, play: 'C4+E4+G4w',
            goals: [
              { text: T('Tiens un accord de trois notes : écoute-le s’égrener.', 'Hold a three-note chord: hear it ripple.'), check: (p, played) => played.size >= 3 },
              { text: T('Change le sens : essaie « descendant », puis « aller-retour ».', 'Change the direction: try “down”, then “up-down”.'), check: (p, played, seen) => seen.has('arp.mode=down') && S.arp.mode === 'updown' },
              { text: T('Étends le motif sur 2 octaves ou plus.', 'Spread the pattern over 2 octaves or more.'), check: () => S.arp.octaves >= 2 },
            ] },
        ],
      },
      {
        id: 'p2',
        title: T('Latch, vitesse et longueur', 'Latch, speed and length'),
        goal: T('Faire tourner l’arpège seul et régler son allure.', 'Keep the arpeggio going by itself and set its pace.'),
        lab: PLUCKY, keep: 'Arpège',
        steps: [
          { type: 'synth', panel: 'arp', arp: { on: true, mode: 'up', rate: 0.25, octaves: 2, gate: 0.6, latch: false }, tempo: 110, play: 'C4+E4+G4w',
            text: T('Le **latch** garde l’arpège après que tu as lâché les touches : tes mains sont libres. La **division** règle combien de notes par temps, le **gate** leur longueur.', '**Latch** keeps the arpeggio going after you let go of the keys: your hands are free. The **rate** sets how many notes per beat, the **gate** how long they last.'),
            goals: [
              { text: T('Active le latch, joue un accord et lâche : l’arpège continue.', 'Turn latch on, play a chord and let go: the arpeggio goes on.'), check: (p, played) => S.arp.latch && played.size >= 2 },
              { text: T('Passe en croches (1/8) : deux fois moins vite.', 'Switch to eighths (1/8): half as fast.'), check: () => S.arp.rate === 0.5 },
              { text: T('Notes piquées : gate à 30 % ou moins.', 'Short notes: gate at 30 % or less.'), check: () => S.arp.gate <= 0.3 },
              { text: T('Accélère le tempo à 140 ou plus.', 'Speed the tempo up to 140 or more.'), check: () => S.tempo >= 140 },
            ] },
        ],
      },
      {
        id: 'p3',
        title: T('Arpège et son', 'Arpeggio and sound'),
        goal: T('Le même motif, deux mondes : l’écho, puis la nappe.', 'The same pattern, two worlds: echo, then pad.'),
        lab: PLUCKY, keep: 'Arpège',
        steps: [
          { type: 'synth', panel: 'arp', arp: { on: true, mode: 'up', rate: 0.5, octaves: 2, gate: 0.4, latch: true }, tempo: 100, fx: { delay: { on: true, beats: 0.75, mix: 0, fb: 0.35 } },
            controls: [C('fx.delay.mix', T('Écho', 'Echo'), { scale: 100, max: 100 }), C('fx.delay.fb', T('Répétitions', 'Repeats'), { scale: 100, max: 90 })], play: 'C4+E4+G4+B4w',
            text: T('Un classique : un arpège pincé et un écho calé sur le tempo (ici en croche pointée). Les répétitions tombent entre les notes et remplissent le motif.', 'A classic: a plucked arpeggio and an echo locked to the tempo (a dotted eighth here). The repeats fall between the notes and fill out the pattern.'),
            goals: [{ text: T('Écho à 30 ou plus, répétitions à 40 ou plus.', 'Echo at 30 or more, repeats at 40 or more.'), check: () => S.fx.delay.mix >= 0.3 && S.fx.delay.fb >= 0.4 }] },
          { type: 'synth', panel: 'arp', patch: PAD, arp: { on: true, mode: 'updown', rate: 0.25, octaves: 2, gate: 0.6, latch: true }, play: 'C3+G3+E4w',
            text: T('Le même principe avec une nappe : les notes se chevauchent et deviennent un tapis qui bouge.', 'The same idea with a pad: the notes overlap and turn into a moving carpet.'),
            goals: [{ text: T('Gate à 80 % ou plus : les notes se fondent les unes dans les autres.', 'Gate at 80 % or more: the notes melt into each other.'), check: () => S.arp.gate >= 0.8 }] },
        ],
      },
      {
        id: 'p4',
        title: T('Le séquenceur pas à pas', 'The step sequencer'),
        goal: T('Écrire une boucle, note par note.', 'Write a loop, note by note.'),
        lab: () => { const p = PLUCKY(); p.ops[1].ol = 70; return p; }, keep: 'Séquence',
        steps: [
          { type: 'info', title: T('Seize cases', 'Sixteen boxes'),
            text: T('Le **séquenceur** est une boucle de 16 cases : une case = une double croche, 4 cases = un temps. Chaque case contient une note, un accord, ou rien.\nAvec **REC** activé et la lecture arrêtée, chaque note jouée remplit la case suivante. Le bouton **Silence** saute une case.\nTu le trouves dans Créer › Séq.',
              'The **sequencer** is a loop of 16 boxes: one box = a sixteenth note, 4 boxes = a beat. Each box holds a note, a chord, or nothing.\nWith **REC** on and playback stopped, each note you play fills the next box. The **Rest** button skips a box.\nYou’ll find it in Create › Seq.') },
          { type: 'synth', panel: 'seq', seq: {}, tempo: 110, range: { lo: 36, hi: 72 },
            goals: [
              { text: T('Active REC et joue 4 notes : chacune remplit une case.', 'Turn REC on and play 4 notes: each fills a box.'), check: () => filled() >= 4 },
              { text: T('Ajoute au moins 2 silences entre tes notes avec le bouton Silence.', 'Add at least 2 rests between your notes with the Rest button.'), check: () => filled() >= 4 && restsBetween() >= 2 },
              { text: T('Lance la lecture : ta boucle tourne.', 'Press play: your loop goes round.'), check: () => seq.playing && filled() >= 4 },
              { text: T('Raccourcis la boucle à 8 cases.', 'Shorten the loop to 8 boxes.'), check: () => S.seq.length === 8 },
            ] },
        ],
      },
      {
        id: 'p5',
        title: T('Faire vivre une séquence', 'Bringing a sequence to life'),
        goal: T('Swing, longueur des notes, transposition au clavier.', 'Swing, note length, transposing from the keyboard.'),
        lab: () => { const p = BASS(); p.ops[0].coarse = 1; return p; }, keep: 'Séquence',
        steps: [
          { type: 'synth', panel: 'seq', seq: { steps: BASS_LOOP, length: 16, gate: 0.6 }, tempo: 104, range: { lo: 36, hi: 72 },
            text: T('Une ligne de basse est déjà écrite. Lance-la, puis transforme-la sans toucher aux notes.', 'A bass line is already written. Start it, then transform it without touching the notes.'),
            goals: [
              { text: T('Lance la lecture.', 'Press play.'), check: () => seq.playing },
              { text: T('Ajoute du swing (30 % ou plus) : la boucle se met à balancer.', 'Add swing (30 % or more): the loop starts to groove.'), check: () => S.seq.swing >= 0.3 },
              { text: T('Notes courtes : gate à 30 % ou moins.', 'Short notes: gate at 30 % or less.'), check: () => S.seq.gate <= 0.3 },
              { text: T('Active « Transposer au clavier » et joue une autre note que [C4] : toute la boucle suit.', 'Turn on “Transpose from keys” and play a note other than [C4]: the whole loop follows.'), check: () => S.seq.transpose && seq.transpose !== 0 },
            ] },
        ],
      },
      {
        id: 'p6',
        title: T('Défi : boucle et arpège', 'Challenge: loop and arpeggio'),
        goal: T('Une basse au séquenceur, un arpège par-dessus.', 'A bass on the sequencer, an arpeggio on top.'),
        lab: PLUCKY, keep: 'Ma boucle',
        steps: [
          { type: 'synth', panel: 'seq', seq: { steps: BASS_LOOP, length: 16, gate: 0.4, swing: 0.2 }, tempo: 104, range: { lo: 36, hi: 84 },
            text: T('Lance la basse, puis passe à l’arpège ci-dessous.', 'Start the bass, then go to the arpeggio below.'),
            goals: [{ text: T('Lance la boucle de basse.', 'Start the bass loop.'), check: () => seq.playing }] },
          { type: 'synth', panel: 'arp', arp: { on: true, mode: 'up', rate: 0.25, octaves: 1, gate: 0.4, latch: true }, range: { lo: 48, hi: 84 }, play: 'C4+E4+G4w',
            text: T('La basse continue (elle ne s’arrête qu’en quittant la leçon). Joue un accord par-dessus : l’arpège se cale sur le même tempo.', 'The bass keeps going (it only stops when you leave the lesson). Play a chord over it: the arpeggio locks to the same tempo.'),
            goals: [
              { text: T('Un accord arpégé sur la basse.', 'An arpeggiated chord over the bass.'), check: (p, played) => played.size >= 3 },
              { text: T('Change d’accord : essaie [A3] [C4] [E4], puis [F3] [A3] [C4].', 'Change chord: try [A3] [C4] [E4], then [F3] [A3] [C4].'), check: (p, played) => played.has(57) && played.has(53) },
            ] },
        ],
      },
    ],
  },

  // ═══ Recipes ══════════════════════════════════════════════════
  {
    id: 'sur',
    title: T('Recettes', 'Recipes'),
    blurb: T('Des sons complets, construits pas à pas, à garder dans Mes sons.', 'Complete sounds, built step by step, to keep in My sounds.'),
    lessons: [
      {
        id: 'z1',
        title: T('Piano électrique', 'Electric piano'),
        goal: T('Un corps doux, un tintement, et le toucher.', 'A soft body, a chime, and touch.'),
        lab: () => { const p = sound('Mon EP', 5, [{ ol: 99 }, { ol: 0 }]); p.ops[0].r = [96, 60, 60, 66]; p.ops[0].l = [99, 99, 99, 0]; return p; },
        keep: 'Mon EP',
        steps: [
          { type: 'synth', views: ['scope'], env: 0, controls: [DEC, SUS, MOD], play: 'C4q E4q G4h',
            text: T('Le **corps** : une corde frappée, qui s’éteint lentement, avec un peu de chaleur.', 'The **body**: a struck string, fading slowly, with a little warmth.'),
            goals: [
              { text: T('Maintien bas, déclin long : le son s’éteint doucement.', 'Low sustain, long decay: the sound fades gently.'), check: p => sus(p) <= 15 && dec(p) >= 50 },
              { text: T('Un peu de modulation pour la chaleur, sans excès.', 'A little modulation for warmth, not too much.'), check: p => p.ops[1].ol >= 40 && p.ops[1].ol <= 75 },
            ] },
          { type: 'synth', views: ['spectrum'], controls: [C('op4.ol', T('Tintement', 'Chime')), C('op4.r.1', T('Durée du tintement', 'Chime length'), { invert: true })], play: 'C4q E4q G4h',
            prepare: p => { copyEnv(p.ops[0], p.ops[2]); p.ops[2].ol = 88; Object.assign(p.ops[3], { coarse: 14, ol: 0, r: [99, 80, 60, 70], l: [99, 0, 0, 0] }); },
            text: T('Le **tintement** : un modulateur très aigu (rapport 14) sur une deuxième porteuse, qui ne dure qu’un instant. C’est le « ding » métallique du piano électrique.', 'The **chime**: a very high modulator (ratio 14) on a second carrier, lasting only an instant. It is the electric piano’s metallic “ding”.'),
            goals: [{ text: T('Un tintement présent mais court.', 'A chime you can hear, but short.'), check: p => p.ops[3].ol >= 45 && p.ops[3].ol <= 85 && 99 - p.ops[3].r[1] <= 45 }] },
          { type: 'synth', views: ['spectrum'], controls: [C('op2.vel', T('Toucher du corps', 'Body touch')), C('op4.vel', T('Toucher du tintement', 'Chime touch'))], play: 'C4q E4q G4h',
            text: T('Le **toucher** : la sensibilité à la vélocité. Plus elle est haute, plus jouer fort rend le son brillant. Sur le clavier à l’écran, appuie plus bas sur la touche pour jouer fort.', '**Touch**: velocity sensitivity. The higher it is, the brighter the sound when you play hard. On the on-screen keyboard, press lower on the key to play hard.'),
            goals: [{ text: T('Monte les deux à 4 ou plus, puis joue doucement et fort : le tintement ne sort que si tu tapes.', 'Raise both to 4 or more, then play soft and hard: the chime only comes out when you hit hard.'), check: p => p.ops[1].vel >= 4 && p.ops[3].vel >= 4 }] },
        ],
      },
      {
        id: 'z2',
        title: T('Cloche', 'Bell'),
        goal: T('Un rapport non entier, une longue résonance, un battement.', 'A non-whole ratio, a long ring, a beat.'),
        lab: () => { const p = sound('Ma cloche', 5, [{ ol: 99 }, { ol: 70, coarse: 3 }]); return p; },
        keep: 'Ma cloche',
        steps: [
          { type: 'synth', views: ['spectrum'], controls: [RATIO, C('op2.fine', T('Rapport fin', 'Fine ratio')), MOD], play: 'C5w',
            text: T('Avec un rapport entier, les harmoniques tombent juste. Avec un rapport **décalé**, elles tombent entre deux : c’est le son du métal.', 'With a whole ratio, the harmonics line up. With an **offset** ratio, they fall in between: the sound of metal.'),
            goals: [{ text: T('Décale le rapport avec le réglage fin (20 ou plus) et garde de la modulation.', 'Offset the ratio with the fine control (20 or more) and keep some modulation.'), check: p => p.ops[1].fine >= 20 && p.ops[1].ol >= 60 }] },
          { type: 'synth', views: ['scope'], env: 0, controls: [DEC, SUS, REL], play: 'C5q rh.',
            prepare: p => { p.ops[0].r = [99, 99, 99, 72]; p.ops[0].l = [99, 99, 99, 0]; },
            text: T('Une cloche ne tient pas : on la frappe, et elle **résonne longtemps**.', 'A bell doesn’t hold: you strike it, and it **rings for a long time**.'),
            goals: [{ text: T('Maintien à zéro, déclin très long, relâchement long.', 'Zero sustain, very long decay, long release.'), check: p => sus(p) <= 5 && dec(p) >= 65 && rel(p) >= 50 }] },
          { type: 'synth', views: ['scope'], controls: [C('op3.ol', T('Deuxième cloche', 'Second bell')), C('op3.det', T('Désaccord', 'Detune'))], play: 'C5q rh.',
            prepare: p => { Object.assign(p.ops[2], JSON.parse(JSON.stringify(p.ops[0])), { ol: 0, det: 7 }); Object.assign(p.ops[3], JSON.parse(JSON.stringify(p.ops[1]))); copyEnv(p.ops[0], p.ops[1]); copyEnv(p.ops[0], p.ops[3]); },
            text: T('Deux cloches presque pareilles, légèrement désaccordées, se mettent à **battre** : le son ondule.', 'Two nearly identical bells, slightly detuned, start to **beat**: the sound wavers.'),
            goals: [{ text: T('Ajoute la deuxième cloche et désaccorde-la un peu.', 'Add the second bell and detune it a little.'), check: p => p.ops[2].ol >= 70 && p.ops[2].det !== 7 }] },
        ],
      },
      {
        id: 'z3',
        title: T('Basse FM', 'FM bass'),
        goal: T('Un grave rond, une attaque qui claque, du grain.', 'A round low end, a snappy attack, some grit.'),
        lab: BASS, keep: 'Ma basse',
        steps: [
          { type: 'synth', views: ['scope', 'spectrum'], range: { lo: 28, hi: 60 }, controls: [C('op1.coarse', T('Registre', 'Register'), { options: [[1, T('Normal', 'Normal')], [0, T('Une octave plus bas', 'One octave down')]] }), MOD], play: 'C2q C2q G2q C3q',
            text: T('Une basse vit tout en bas. Le rapport ×0,5 de la porteuse la descend d’une octave sans changer de touche.', 'A bass lives at the very bottom. A ×0.5 carrier ratio drops it an octave without changing key.'),
            goals: [{ text: T('Une octave plus bas, avec de la modulation (60 ou plus) pour qu’on l’entende même sur de petits haut-parleurs.', 'One octave down, with modulation (60 or more) so it carries even on small speakers.'), check: p => p.ops[0].coarse === 0 && p.ops[1].ol >= 60 }] },
          { type: 'synth', views: ['spectrum'], env: 1, range: { lo: 28, hi: 60 }, controls: [MDEC, MSUS], play: 'C2e C2e rq G2e C3e rq',
            text: T('Le « pop » d’une basse : une brillance très courte au début de chaque note, puis un son plus rond.', 'A bass “pop”: a very short burst of brightness at the start of each note, then a rounder sound.'),
            goals: [{ text: T('Déclin de la modulation court, maintien bas.', 'Short modulation decay, low sustain.'), check: p => 99 - p.ops[1].r[1] <= 45 && p.ops[1].l[2] <= 40 }] },
          { type: 'synth', views: ['scope'], range: { lo: 28, hi: 60 }, controls: [FB, C('op2.vel', T('Toucher', 'Touch'))], play: 'C2q C2q G2q C3q',
            text: T('Le **grain** : un peu de feedback pour la rugosité, et du toucher pour que la basse claque quand tu tapes.', '**Grit**: a little feedback for roughness, and touch so the bass snaps when you hit hard.'),
            goals: [{ text: T('Feedback à 4 ou plus, toucher à 3 ou plus.', 'Feedback at 4 or more, touch at 3 or more.'), check: p => p.fb >= 4 && p.ops[1].vel >= 3 }] },
        ],
      },
      {
        id: 'z4',
        title: T('Marimba', 'Marimba'),
        goal: T('Une lame de bois frappée, courte et boisée.', 'A struck wooden bar, short and woody.'),
        lab: MARIMBA, keep: 'Mon marimba',
        steps: [
          { type: 'synth', views: ['scope'], env: 0, controls: [DEC, SUS], play: 'C4e E4e G4e C5e G4e E4e C4q',
            text: T('Une lame frappée ne tient pas : le son meurt en une fraction de seconde.', 'A struck bar doesn’t hold: the sound dies in a fraction of a second.'),
            goals: [{ text: T('Maintien à zéro, déclin court (entre 15 et 45).', 'Zero sustain, short decay (between 15 and 45).'), check: p => sus(p) <= 5 && dec(p) >= 15 && dec(p) <= 45 }] },
          { type: 'synth', views: ['spectrum'], controls: [MOD, C('op2.r.1&op2.r.2', T('Durée du choc', 'Strike length'), { invert: true })], play: 'C4e E4e G4e C5e G4e E4e C4q',
            prepare: p => { Object.assign(p.ops[1], { coarse: 4, ol: 70, r: [99, 75, 75, 72], l: [99, 0, 0, 0] }); },
            text: T('Le **bois** : un modulateur au rapport 4 qui ne dure qu’un instant, le choc de la mailloche.', 'The **wood**: a ratio-4 modulator lasting only an instant, the mallet’s strike.'),
            goals: [{ text: T('Modulation entre 50 et 85, choc court (30 ou moins).', 'Modulation between 50 and 85, short strike (30 or less).'), check: p => p.ops[1].ol >= 50 && p.ops[1].ol <= 85 && 99 - p.ops[1].r[1] <= 30 }] },
          { type: 'synth', views: ['spectrum'], controls: [C('op3.ol', T('Harmonique de la lame', 'Bar overtone')), C('fx.reverb.mix', T('Réverbération', 'Reverb'), { scale: 100, max: 100 })], play: 'C4e E4e G4e C5e G4e E4e C4q',
            prepare: p => { Object.assign(p.ops[2], { coarse: 4, ol: 0, r: [99, 85, 85, 72], l: [99, 0, 0, 0] }); },
            text: T('Une lame de marimba est taillée pour que sa première harmonique soit 4 fois la note. Ajoute-la, courte, et un peu de salle.', 'A marimba bar is cut so its first overtone is 4 times the note. Add it, short, and a bit of room.'),
            goals: [{ text: T('Harmonique de la lame entre 40 et 80, réverbération à 25 ou plus.', 'Bar overtone between 40 and 80, reverb at 25 or more.'), check: p => p.ops[2].ol >= 40 && p.ops[2].ol <= 80 && S_FX().reverb.mix >= 0.25 }] },
        ],
      },
      {
        id: 'z5',
        title: T('Section de cuivres', 'Brass section'),
        goal: T('Un souffle qui s’ouvre, plusieurs instruments, un vibrato tardif.', 'Breath that opens up, several players, a late vibrato.'),
        lab: BRASS, keep: 'Mes cuivres',
        steps: [
          { type: 'synth', views: ['spectrum'], env: 1, controls: [MOD, MATT, MSUS], play: 'C4h G4h | E4+G4+C5w',
            text: T('Le **souffle** : la brillance arrive un peu après le début de la note, puis tient.', '**Breath**: the brightness arrives just after the note starts, then holds.'),
            goals: [{ text: T('Attaque de la modulation entre 25 et 60, maintien haut.', 'Modulation attack between 25 and 60, high sustain.'), check: p => 99 - p.ops[1].r[0] >= 25 && 99 - p.ops[1].r[0] <= 60 && p.ops[1].l[2] >= 80 }] },
          { type: 'synth', views: ['scope'], controls: [C('op3.ol', T('Deuxième instrument', 'Second player')), C('op3.det', T('Son désaccord', 'Its detune'))], play: 'E4+G4+C5w',
            prepare: p => { copyOp(p, 0, 2); copyOp(p, 1, 3); p.ops[2].ol = 0; },
            text: T('Une **section**, c’est plusieurs musiciens jamais tout à fait accordés. Une deuxième paire, désaccordée d’un rien, suffit à l’imiter.', 'A **section** is several players never quite in tune. A second pair, detuned a hair, is enough to fake it.'),
            goals: [{ text: T('Deuxième instrument à 85 ou plus, désaccordé.', 'Second player at 85 or more, detuned.'), check: p => p.ops[2].ol >= 85 && p.ops[2].det !== 7 }] },
          { type: 'synth', views: ['scope'], controls: [C('lfo.pmd', T('Vibrato', 'Vibrato')), C('lfo.delay', T('Retard du vibrato', 'Vibrato delay'))], play: 'C4w',
            text: T('Les cuivres attaquent droit, puis le vibrato arrive sur les notes tenues.', 'Brass attacks straight, then vibrato comes in on held notes.'),
            goals: [{ text: T('Un vibrato léger (4 à 15) qui arrive tard (retard 40 ou plus).', 'A light vibrato (4 to 15) that comes in late (delay 40 or more).'), check: p => p.lfo.pmd >= 4 && p.lfo.pmd <= 15 && p.lfo.delay >= 40 }] },
        ],
      },
      {
        id: 'z6',
        title: T('Orgue rock', 'Rock organ'),
        goal: T('Les tirettes, le clic de percussion, la cabine tournante.', 'Drawbars, the percussion click, the rotating speaker.'),
        lab: ROCK, keep: 'Mon orgue rock',
        steps: [
          { type: 'synth', graph: true, views: ['spectrum'], controls: [C('op1.ol', T('16′', '16′')), C('op2.ol', T('8′', '8′')), C('op3.ol', T('4′', '4′')), C('op4.ol', T('2⅔′', '2⅔′')), C('op5.ol', T('2′', '2′'))], play: 'C3+G3+C4+E4w',
            text: T('Cinq tirettes pour le corps, la sixième servira à la percussion.', 'Five drawbars for the body, the sixth will be the percussion.'),
            goals: [{ text: T('Le son rock : 16′, 8′ et 4′ à fond.', 'The rock sound: 16′, 8′ and 4′ full.'), check: p => [0, 1, 2].every(i => p.ops[i].ol >= 90) }] },
          { type: 'synth', views: ['scope'], controls: [C('op6.ol', T('Percussion', 'Percussion')), C('op6.r.1&op6.r.2', T('Durée de la percussion', 'Percussion length'), { invert: true })], play: 'C4q E4q G4q C5q',
            prepare: p => { Object.assign(p.ops[5], { coarse: 3, r: [99, 70, 70, 72], l: [99, 0, 0, 0] }); },
            text: T('La **percussion** : un « tic » très court sur la quinte (2⅔′) au début de chaque note. C’est elle qui fait claquer l’orgue rock.', 'The **percussion**: a very short “tick” on the fifth (2⅔′) at the start of each note. It is what makes the rock organ bite.'),
            goals: [{ text: T('Percussion à 80 ou plus, très courte (35 ou moins).', 'Percussion at 80 or more, very short (35 or less).'), check: p => p.ops[5].ol >= 80 && 99 - p.ops[5].r[1] <= 35 }] },
          { type: 'synth', views: ['scope'], fx: { chorus: { on: true, mix: 0 } }, controls: [C('lfo.speed', T('Vitesse de rotation', 'Rotation speed')), C('lfo.amd', T('Profondeur', 'Depth')), C('fx.chorus.mix', T('Chorus', 'Chorus'), { scale: 100, max: 100 })], play: 'C3+G3+C4+E4w',
            prepare: p => { p.ops.forEach(o => (o.ams = 1)); },
            text: T('La **cabine tournante** (un haut-parleur qui tourne) fait onduler le volume et le timbre. Un trémolo rapide et un peu de chorus l’imitent.', 'The **rotating speaker** makes the volume and tone swirl. A fast tremolo and a little chorus imitate it.'),
            goals: [{ text: T('Rotation rapide (55 ou plus), profondeur 20 ou plus, chorus 40 ou plus.', 'Fast rotation (55 or more), depth 20 or more, chorus 40 or more.'), check: p => p.lfo.speed >= 55 && p.lfo.amd >= 20 && S_FX().chorus.mix >= 0.4 }] },
        ],
      },
      {
        id: 'z7',
        title: T('Lead synthé', 'Synth lead'),
        goal: T('Une scie épaisse et expressive pour jouer des solos.', 'A thick, expressive saw for playing solos.'),
        lab: LEAD, keep: 'Mon lead',
        steps: [
          { type: 'synth', views: ['scope', 'spectrum'], controls: [MOD, FB], play: 'C4q E4q G4q C5q',
            text: T('Le lead classique est une **dent de scie**. En FM : rapport 1, beaucoup de modulation, et du feedback.', 'The classic lead is a **sawtooth**. In FM: ratio 1, lots of modulation, and feedback.'),
            goals: [{ text: T('Modulation 85 ou plus, feedback 5 ou plus : regarde l’onde prendre des dents.', 'Modulation 85 or more, feedback 5 or more: watch the wave grow teeth.'), check: p => p.ops[1].ol >= 85 && p.fb >= 5 }] },
          { type: 'synth', views: ['scope'], controls: [C('op3.ol', T('Deuxième scie', 'Second saw')), C('op3.det', T('Désaccord', 'Detune'))], play: 'C4w',
            prepare: p => { copyOp(p, 0, 2); copyOp(p, 1, 3); p.ops[2].ol = 0; },
            text: T('Deux scies désaccordées : le son s’épaissit et bouge.', 'Two detuned saws: the sound thickens and moves.'),
            goals: [{ text: T('Deuxième scie à 85 ou plus, désaccordée.', 'Second saw at 85 or more, detuned.'), check: p => p.ops[2].ol >= 85 && p.ops[2].det !== 7 }] },
          { type: 'synth', views: ['spectrum'], controls: [C('lfo.pmd', T('Vibrato', 'Vibrato')), C('lfo.delay', T('Retard du vibrato', 'Vibrato delay')), C('fx.filter.pos', T('Filtre', 'Filter'), { scale: 100, bipolar: true, min: -100, max: 100 }), C('fx.filter.res', T('Résonance', 'Resonance'), { scale: 100, max: 100 })], play: 'C4q E4q G4w',
            text: T('Pour chanter : un vibrato qui arrive sur les notes tenues, et un filtre qui adoucit les aigus.', 'To make it sing: a vibrato that comes in on held notes, and a filter to soften the highs.'),
            goals: [{ text: T('Vibrato 4 à 20 avec un retard de 30 ou plus, filtre passe-bas (−20 ou moins).', 'Vibrato 4 to 20 with a delay of 30 or more, low-pass filter (−20 or lower).'), check: p => p.lfo.pmd >= 4 && p.lfo.pmd <= 20 && p.lfo.delay >= 30 && S_FX().filter.pos <= -0.2 }] },
        ],
      },
    ],
  },
];
