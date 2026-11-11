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
import { initPatch, initOp } from './dx7.js?v=202611129';

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
    ],
  },
];
