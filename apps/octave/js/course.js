// The course: units → lessons → steps. Pure data (plus a few round generators).
//
// Text is { fr, en }. In text, [C] [F#] [C4]… are note names, written in the
// player's notation (Do / C) at display time; **bold** is bold.
//
// Step types (see lesson.js):
//   info      explanation; may light keys, show a line of music, offer to listen
//   find      find keys: { all: [midi…] } every one, { pc } any octave, { midi } exact
//   quiz      multiple choice
//   phrase    play a line: listen first (echo) and/or read it on the staff
//   rhythm    tap a rhythm on any key, with clicks; timing scored
//   drill     the Exercises engine with lesson settings, N right answers
//   piece     a piece, falling onto the keys (step by step, then in time)
//   calibrate measure the keyboard's latency

const T = (fr, en) => ({ fr, en });
const pick = list => list[Math.floor(Math.random() * list.length)];
// n rounds of random pitch classes, never the same twice in a row
function randomPcs(pcs, n) {
  const out = [];
  while (out.length < n) {
    const pc = pick(pcs);
    if (out.length && out[out.length - 1].pc === pc) continue;
    out.push({ pc });
  }
  return out;
}
function randomMidis(midis, n) {
  const out = [];
  while (out.length < n) {
    const midi = pick(midis);
    if (out.length && out[out.length - 1].midi === midi) continue;
    out.push({ midi });
  }
  return out;
}
const range = (lo, hi, pcs) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter(m => pcs.includes(m % 12));
const WIDE = { lo: 48, hi: 83 };      // three octaves, C3 to B5
const POS_C = { lo: 57, hi: 72 };     // around the C position (A3 to C5)
const NATURALS = [0, 2, 4, 5, 7, 9, 11];

// ── pieces ─────────────────────────────────────────────────────
const MARY = 'E4q D4q C4q D4q | E4q E4q E4h | D4q D4q D4h | E4q G4q G4h | E4q D4q C4q D4q | E4q E4q E4q E4q | D4q D4q E4q D4q | C4w';
const LUNE = 'C4q C4q C4q D4q | E4h D4h | C4q E4q D4q D4q | C4w | C4q C4q C4q D4q | E4h D4h | C4q E4q D4q D4q | C4w';
const ODE = 'E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | E4q. D4e D4h | E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | D4q. C4e C4h';
const JACQUES = 'C4q D4q E4q C4q | C4q D4q E4q C4q | E4q F4q G4h | E4q F4q G4h | C4q D4q E4q C4q | C4q D4q E4q C4q | E4q F4q G4h | E4q F4q G4h';

export const COURSE = [
  // ═══ Unit 1 ═══════════════════════════════════════════════════
  {
    id: 'u1',
    title: T('Le clavier', 'The keyboard'),
    blurb: T('Se repérer, nommer les notes, placer la main.', 'Find your way, name the notes, place your hand.'),
    lessons: [
      {
        id: 'k1',
        title: T('Touches noires, touches blanches', 'Black keys, white keys'),
        goal: T('Repérer les groupes de 2 et de 3 touches noires.', 'Spot the groups of 2 and 3 black keys.'),
        steps: [
          { type: 'info', title: T('Le motif du clavier', 'The keyboard’s pattern'),
            text: T('Le clavier répète le même motif d’un bout à l’autre : **2 touches noires**, puis **3 touches noires**, et ainsi de suite.\nC’est ton seul repère : on ne compte jamais les touches blanches, on cherche les groupes de noires.',
              'The keyboard repeats one pattern from end to end: **2 black keys**, then **3 black keys**, and again.\nThat is your landmark: you never count white keys, you look for the groups of black ones.'),
            keys: { ...WIDE, pcs: [1, 3, 6, 8, 10] } },
          { type: 'find', range: WIDE, hint: false,
            prompt: T('Joue toutes les touches des **groupes de 2** noires, dans l’ordre que tu veux.', 'Play every key of the **groups of 2** black keys, in any order.'),
            rounds: [{ all: range(48, 83, [1, 3]) }] },
          { type: 'find', range: WIDE, hint: false,
            prompt: T('Maintenant toutes les touches des **groupes de 3**.', 'Now every key of the **groups of 3**.'),
            rounds: [{ all: range(48, 83, [6, 8, 10]) }] },
          { type: 'quiz', rounds: [
            { q: T('Combien de touches noires dans le grand groupe ?', 'How many black keys in the larger group?'), options: ['2', '3', '5'], answer: 1 },
            { q: T('Un piano complet a 88 touches. Le motif 2 + 3 s’y répète environ…', 'A full piano has 88 keys. The 2 + 3 pattern repeats about…'), options: [T('3 fois', '3 times'), T('7 fois', '7 times'), T('12 fois', '12 times')], answer: 1,
              explain: T('7 fois et un peu : 7 octaves, plus quelques touches.', 'Just over 7 times: 7 octaves and a few keys.') },
          ] },
        ],
      },
      {
        id: 'k2',
        title: T('[C], [D], [E]', '[C], [D], [E]'),
        goal: T('Trouver [C], [D] et [E] partout sur le clavier.', 'Find [C], [D] and [E] anywhere on the keyboard.'),
        steps: [
          { type: 'info', title: T('Où est [C] ?', 'Where is [C]?'),
            text: T('[C] est la touche blanche **juste à gauche du groupe de 2 noires**. Comme le motif se répète, il y a un [C] à chaque motif.',
              '[C] is the white key **just left of the group of 2 black keys**. The pattern repeats, so there is a [C] in every one.'),
            keys: { ...WIDE, pcs: [0] } },
          { type: 'find', range: WIDE, hint: false, prompt: T('Joue tous les [C] du clavier.', 'Play every [C] on the keyboard.'), rounds: [{ all: range(48, 83, [0]) }] },
          { type: 'info', title: T('Ses voisins', 'Its neighbours'),
            text: T('[D] se glisse **entre les deux noires**. [E] est **juste à droite** du groupe.\nDo, Ré, Mi : la première chanson de tout le monde.',
              '[D] sits **between the two black keys**. [E] is **just right** of the group.\nC, D, E: everyone’s first tune.'),
            keys: { ...WIDE, pcs: [0, 2, 4] } },
          { type: 'find', range: WIDE, hint: false, prompt: T('Joue la note demandée, à n’importe quelle hauteur.', 'Play the note asked for, at any height.'), rounds: () => randomPcs([0, 2, 4], 9) },
          { type: 'phrase', range: POS_C, listen: true, hint: 'keys', bpm: 80,
            prompt: T('Écoute, puis rejoue la même chose.', 'Listen, then play it back.'),
            rounds: ['C4q D4q E4h', 'E4q D4q C4h', 'C4q E4q D4q C4q', 'C4q C4q D4q E4q'] },
        ],
      },
      {
        id: 'k3',
        title: T('Les sept notes', 'The seven notes'),
        goal: T('Nommer toutes les touches blanches.', 'Name every white key.'),
        steps: [
          { type: 'info', title: T('[F], [G], [A], [B]', '[F], [G], [A], [B]'),
            text: T('[F] est la touche blanche **juste à gauche du groupe de 3 noires**. Ensuite viennent [G], [A], [B]… et on retombe sur [C].\nSept noms en tout, qui se répètent : [C] [D] [E] [F] [G] [A] [B].',
              '[F] is the white key **just left of the group of 3 black keys**. Then come [G], [A], [B]… and you are back on [C].\nSeven names in all, repeating: [C] [D] [E] [F] [G] [A] [B].'),
            keys: { ...WIDE, pcs: [5, 7, 9, 11] } },
          { type: 'find', range: WIDE, hint: false, prompt: T('Joue tous les [F].', 'Play every [F].'), rounds: [{ all: range(48, 83, [5]) }] },
          { type: 'find', range: WIDE, hint: false, prompt: T('Joue la note demandée, à n’importe quelle hauteur.', 'Play the note asked for, at any height.'), rounds: () => randomPcs(NATURALS, 12) },
          { type: 'phrase', range: { lo: 57, hi: 74 }, listen: false, hint: 'keys', bpm: 90,
            prompt: T('Joue les sept notes en montant, puis en descendant, de [C4] à [C5].', 'Play the seven notes going up, then down, from [C4] to [C5].'),
            rounds: ['C4q D4q E4q F4q G4q A4q B4q C5q', 'C5q B4q A4q G4q F4q E4q D4q C4q'] },
        ],
      },
      {
        id: 'k4',
        title: T('Octaves et [C] central', 'Octaves and middle C'),
        goal: T('Jouer une note à la bonne hauteur.', 'Play a note at the right height.'),
        steps: [
          { type: 'info', title: T('Une octave', 'One octave'),
            text: T('D’un [C] au [C] suivant, il y a une **octave** : 12 touches, 7 blanches et 5 noires. Chaque note porte un numéro d’octave.\nLe [C] du milieu du piano, c’est [C4], le **[C] central**. (Certaines méthodes françaises l’appellent Do3 : c’est la même touche.)',
              'From one [C] to the next is an **octave**: 12 keys, 7 white and 5 black. Each note has an octave number.\nThe [C] in the middle of the piano is [C4], **middle C**.'),
            keys: { ...WIDE, midis: [60] } },
          { type: 'quiz', rounds: [
            { q: T('Combien de touches, blanches et noires, dans une octave ?', 'How many keys, white and black, in an octave?'), options: ['7', '8', '12'], answer: 2 },
            { q: T('[C5] est…', '[C5] is…'), options: [T('une octave au-dessus de [C4]', 'an octave above [C4]'), T('la note juste après [C4]', 'the note right after [C4]'), T('plus grave que [C4]', 'lower than [C4]')], answer: 0 },
          ] },
          { type: 'find', range: WIDE, hint: false, prompt: T('Joue exactement cette note.', 'Play exactly this note.'), rounds: () => [{ midi: 60 }, ...randomMidis(range(48, 83, NATURALS), 8)] },
        ],
      },
      {
        id: 'k5',
        title: T('Les doigts et la position de [C]', 'Fingers and the C position'),
        goal: T('Jouer cinq notes avec cinq doigts, puis un premier air.', 'Play five notes with five fingers, then a first tune.'),
        steps: [
          { type: 'info', title: T('Un doigt par touche', 'One finger per key'),
            text: T('Les doigts sont numérotés de **1** (le pouce) à **5** (le petit doigt), pour les deux mains.\n**Position de [C]** : pouce droit sur [C4], puis un doigt par touche jusqu’à [G4]. Arrondis les doigts comme si tu tenais une balle, poignet souple.',
              'Fingers are numbered **1** (thumb) to **5** (little finger), on both hands.\n**C position**: right thumb on [C4], then one finger per key up to [G4]. Curve your fingers as if holding a ball, wrist relaxed.'),
            keys: { ...POS_C, midis: [60, 62, 64, 65, 67] } },
          { type: 'phrase', range: POS_C, listen: true, hint: 'keys', bpm: 90,
            prompt: T('Écoute puis rejoue, sans bouger la main.', 'Listen, then play it back without moving your hand.'),
            rounds: ['C4q D4q E4q F4q G4q', 'G4q F4q E4q D4q C4q', 'C4q E4q G4q E4q C4q', 'C4q D4q C4q E4q D4q F4q E4q G4q'] },
          { type: 'phrase', range: POS_C, listen: true, hint: 'miss', bpm: 80,
            prompt: T('Même chose, mais à l’oreille : les touches ne s’allument que si tu te trompes.', 'Same again, by ear: keys only light up if you slip.'),
            rounds: ['C4q D4q E4h', 'E4q D4q C4h', 'C4q E4q D4h', 'G4q F4q E4h', 'E4q F4q G4h'] },
          { type: 'piece', title: T('Marie avait un petit agneau', 'Mary had a little lamb'), bpm: 100, right: MARY, staff: false, range: POS_C,
            text: T('Ton premier morceau. Les notes tombent sur les touches : joue-les quand elles arrivent, le morceau t’attend.', 'Your first piece. Notes fall onto the keys: play each one as it lands, the piece waits for you.') },
        ],
      },
    ],
  },

  // ═══ Unit 2 ═══════════════════════════════════════════════════
  {
    id: 'u2',
    title: T('Pulsation et rythme', 'Pulse and rhythm'),
    blurb: T('Garder le tempo, compter, tenir les notes.', 'Keep time, count, hold the notes.'),
    lessons: [
      {
        id: 'r1',
        title: T('La pulsation', 'The pulse'),
        goal: T('Jouer pile sur le clic.', 'Play right on the click.'),
        steps: [
          { type: 'info', title: T('Le battement', 'The beat'),
            text: T('La **pulsation**, c’est le battement régulier de la musique, celui sur lequel on tape du pied. On le compte : **1, 2, 3, 4**.\nD’abord, réglons ton clavier : chaque appareil a un petit retard, Octave va le mesurer pour noter ton rythme équitablement.',
              'The **pulse** is the steady beat of music, the one you tap your foot to. You count it: **1, 2, 3, 4**.\nFirst, let’s set up your keyboard: every device has a small delay, and Octave will measure it to judge your timing fairly.') },
          { type: 'calibrate' },
          { type: 'rhythm', bpm: 80, prompt: T('Une note par clic, n’importe quelle touche. Une mesure de décompte d’abord.', 'One note per click, any key. One bar of count-in first.'),
            rounds: ['q q q q | q q q q'] },
          { type: 'rhythm', bpm: 104, prompt: T('Un peu plus vite.', 'A little faster.'), rounds: ['q q q q | q q q q'] },
        ],
      },
      {
        id: 'r2',
        title: T('Noire, blanche, ronde', 'Quarter, half, whole'),
        goal: T('Tenir chaque note le bon nombre de temps.', 'Hold each note for the right number of beats.'),
        steps: [
          { type: 'info', title: T('Les durées', 'Note values'),
            text: T('La **noire** dure 1 temps. La **blanche** (tête vide) dure 2 temps. La **ronde** dure 4 temps : toute une mesure.\nCompte à voix haute et **garde la touche enfoncée** jusqu’au bout de la note.',
              'A **quarter note** lasts 1 beat. A **half note** (hollow head) lasts 2 beats. A **whole note** lasts 4 beats: a whole bar.\nCount out loud and **keep the key down** to the end of the note.'),
            line: { src: 'q | h | w', rhythm: true }, listen: 'C4q | C4h | C4w', bpm: 80 },
          { type: 'quiz', rounds: [
            { q: T('Une blanche dure…', 'A half note lasts…'), options: [T('1 temps', '1 beat'), T('2 temps', '2 beats'), T('4 temps', '4 beats')], answer: 1, line: { src: 'h', rhythm: true } },
            { q: T('Une ronde vaut combien de noires ?', 'A whole note equals how many quarter notes?'), options: ['2', '3', '4'], answer: 2, line: { src: 'w', rhythm: true } },
            { q: T('Deux noires durent autant qu’…', 'Two quarter notes last as long as…'), options: [T('une blanche', 'a half note'), T('une ronde', 'a whole note'), T('une noire', 'a quarter note')], answer: 0, line: { src: 'q q', rhythm: true } },
          ] },
          { type: 'rhythm', bpm: 80, prompt: T('Joue ce rythme. Tiens bien les blanches et les rondes.', 'Play this rhythm. Hold the half and whole notes.'),
            rounds: ['h h | h h', 'q q h | q q h', 'w | h h', 'q q q q | w'] },
        ],
      },
      {
        id: 'r3',
        title: T('La mesure et le silence', 'Bars and rests'),
        goal: T('Compter les silences, sentir le premier temps.', 'Count the rests, feel the downbeat.'),
        steps: [
          { type: 'info', title: T('Mesures et silences', 'Bars and rests'),
            text: T('La musique se range en **mesures**, séparées par une barre. En **4/4**, chaque mesure compte 4 temps ; le premier est un peu plus fort.\nLe **soupir** est un silence d’un temps : on ne joue pas, mais on continue de compter.\nUn **point** ajoute la moitié de la valeur : une blanche pointée dure 3 temps.',
              'Music is grouped in **bars**, split by bar lines. In **4/4**, each bar has 4 beats; the first is a little stronger.\nA **quarter rest** is one beat of silence: you don’t play, but you keep counting.\nA **dot** adds half the value: a dotted half note lasts 3 beats.'),
            line: { src: 'q rq q rq | h. q', rhythm: true, timeSignature: [4, 4] } },
          { type: 'quiz', rounds: [
            { q: T('Combien de temps dans une mesure à 4/4 ?', 'How many beats in a 4/4 bar?'), options: ['2', '3', '4'], answer: 2 },
            { q: T('Une blanche pointée dure…', 'A dotted half note lasts…'), options: [T('2 temps', '2 beats'), T('3 temps', '3 beats'), T('4 temps', '4 beats')], answer: 1, line: { src: 'h.', rhythm: true } },
          ] },
          { type: 'rhythm', bpm: 80, prompt: T('Ne joue rien sur les silences, mais compte-les.', 'Play nothing on the rests, but count them.'),
            rounds: ['q rq q rq | q q h', 'q q q rq | h h', 'rq q rq q | w', 'h. q | q q h'] },
        ],
      },
      {
        id: 'r4',
        title: T('Rythme et mélodie', 'Rhythm and melody'),
        goal: T('La bonne note, au bon moment.', 'The right note, at the right time.'),
        steps: [
          { type: 'info', title: T('Les deux ensemble', 'Both together'),
            text: T('Maintenant, la bonne note **et** le bon moment. En mode **En rythme**, le morceau ne t’attend plus : il avance au tempo, avec le clic.\nCommence en pas à pas pour apprendre les notes, puis passe en rythme.',
              'Now the right note **and** the right moment. In **In time** mode, the piece no longer waits: it moves on at tempo, with the click.\nStart step by step to learn the notes, then switch to in time.') },
          { type: 'rhythm', bpm: 90, prompt: T('Le rythme du morceau, sur une seule touche.', 'The piece’s rhythm, on a single key.'), rounds: ['q q q q | h h | q q q q | w'] },
          { type: 'piece', title: T('Au clair de la lune', 'Au clair de la lune'), bpm: 90, right: LUNE, staff: false, range: POS_C, mode: 'tempo',
            text: T('Pour 3 étoiles : en rythme, à 100 %.', 'For 3 stars: in time, at 100 %.') },
        ],
      },
    ],
  },

  // ═══ Unit 3 ═══════════════════════════════════════════════════
  {
    id: 'u3',
    title: T('Lire la clé de sol', 'Reading the treble clef'),
    blurb: T('La portée, les intervalles, trois morceaux lus.', 'The staff, intervals, three pieces read from the page.'),
    lessons: [
      {
        id: 's1',
        title: T('La portée et la clé de sol', 'The staff and the treble clef'),
        goal: T('Lire [C4] à [G4] sur la portée.', 'Read [C4] to [G4] on the staff.'),
        steps: [
          { type: 'info', title: T('Cinq lignes', 'Five lines'),
            text: T('La **portée** a 5 lignes. Les notes s’écrivent **sur** les lignes ou **entre** elles : plus la note est haute sur la portée, plus elle est aiguë.\nLa **clé de sol** s’enroule autour de la 2e ligne en partant du bas : c’est là qu’habite [G4]. [C4] est sur une petite ligne ajoutée **sous** la portée.',
              'The **staff** has 5 lines. Notes sit **on** the lines or **between** them: the higher on the staff, the higher the sound.\nThe **treble clef** curls around the 2nd line from the bottom: that is where [G4] lives. [C4] sits on a short extra line **below** the staff.'),
            line: { src: 'C4q D4q E4q F4q G4q' }, listen: 'C4q D4q E4q F4q G4q', bpm: 90 },
          { type: 'drill', count: 6, prompt: T('Trois repères d’abord : [C4], [E4] et [G4].', 'Three landmarks first: [C4], [E4] and [G4].'),
            config: { kind: 'reading', reading: { lo: 60, hi: 67, clefs: ['treble'], pool: [60, 64, 67] }, hints: false } },
          { type: 'drill', count: 10, prompt: T('Toutes les notes de [C4] à [G4].', 'Every note from [C4] to [G4].'),
            config: { kind: 'reading', reading: { lo: 60, hi: 67, clefs: ['treble'] }, hints: false } },
        ],
      },
      {
        id: 's2',
        title: T('Lire par intervalles', 'Reading by intervals'),
        goal: T('Lire l’écart entre deux notes plutôt que chaque nom.', 'Read the gap between notes rather than each name.'),
        steps: [
          { type: 'info', title: T('Seconde et tierce', 'Seconds and thirds'),
            text: T('Plutôt que de nommer chaque note, regarde **l’écart** avec la précédente.\nD’une ligne à l’interligne voisin : une **seconde**, la touche d’à côté.\nD’une ligne à la ligne suivante (ou d’un interligne au suivant) : une **tierce**, on saute une touche.',
              'Rather than naming every note, look at the **gap** from the one before.\nFrom a line to the next space: a **second**, the next key.\nFrom a line to the next line (or space to space): a **third**, skip one key.'),
            line: { src: 'C4h D4h | C4h E4h' }, listen: 'C4h D4h | C4h E4h', bpm: 90 },
          { type: 'quiz', rounds: [
            { q: T('Ces deux notes forment…', 'These two notes make…'), line: { src: 'E4h G4h' }, options: [T('une seconde', 'a second'), T('une tierce', 'a third')], answer: 1 },
            { q: T('Et celles-ci ?', 'And these?'), line: { src: 'F4h G4h' }, options: [T('une seconde', 'a second'), T('une tierce', 'a third')], answer: 0 },
            { q: T('Et celles-ci ?', 'And these?'), line: { src: 'D4h F4h' }, options: [T('une seconde', 'a second'), T('une tierce', 'a third')], answer: 1 },
          ] },
          { type: 'phrase', range: POS_C, listen: false, staff: true, hint: 'miss', bpm: 90,
            prompt: T('Lis et joue, note après note. Pense « à côté » ou « on saute ».', 'Read and play, note by note. Think “next key” or “skip one”.'),
            rounds: ['C4q D4q E4q D4q', 'E4q G4q E4q C4q', 'C4q E4q G4q F4q', 'G4q F4q E4q D4q C4h', 'D4q F4q E4q G4q'] },
        ],
      },
      {
        id: 's3',
        title: T('Au clair de la lune, sur la portée', 'Au clair de la lune, from the staff'),
        goal: T('Lire un morceau entier.', 'Read a whole piece.'),
        steps: [
          { type: 'phrase', range: POS_C, listen: false, staff: true, hint: 'miss', bpm: 90,
            prompt: T('Les deux phrases du morceau, une à une.', 'The piece’s two phrases, one at a time.'),
            rounds: ['C4q C4q C4q D4q | E4h D4h', 'C4q E4q D4q D4q | C4w'] },
          { type: 'piece', title: T('Au clair de la lune', 'Au clair de la lune'), bpm: 92, right: LUNE, staff: true, range: POS_C,
            text: T('Avec la portée cette fois. Pas à pas, puis en rythme pour la 3e étoile.', 'With the staff this time. Step by step, then in time for the 3rd star.') },
        ],
      },
      {
        id: 's4',
        title: T('L’Ode à la joie', 'Ode to Joy'),
        goal: T('Un morceau plus long, en lisant.', 'A longer piece, reading.'),
        steps: [
          { type: 'info', title: T('Beethoven', 'Beethoven'),
            text: T('Toujours en position de [C]. Repère les motifs : la première et la troisième ligne sont presque pareilles.\nÀ la fin de chaque phrase, une **noire pointée** suivie d’une **croche** : laisse-toi guider par la chute des notes, on les étudiera plus tard.',
              'Still in the C position. Spot the patterns: the first and third lines are nearly the same.\nAt the end of each phrase, a **dotted quarter** then an **eighth note**: follow the falling notes, we will study them later.'),
            line: { src: 'E4q E4q F4q G4q | G4q F4q E4q D4q' }, listen: 'E4q E4q F4q G4q | G4q F4q E4q D4q', bpm: 100 },
          { type: 'phrase', range: POS_C, listen: false, staff: true, hint: 'miss', bpm: 100,
            prompt: T('Les morceaux du puzzle.', 'The pieces of the puzzle.'),
            rounds: ['E4q E4q F4q G4q', 'G4q F4q E4q D4q', 'C4q C4q D4q E4q', 'E4q. D4e D4h', 'D4q. C4e C4h'] },
          { type: 'piece', title: T('Ode à la joie', 'Ode to Joy'), bpm: 100, right: ODE, staff: true, range: POS_C },
        ],
      },
      {
        id: 's5',
        title: T('Bilan : Frère Jacques', 'Check-point: Frère Jacques'),
        goal: T('Tout ce qu’on a vu, dans un dernier morceau.', 'Everything so far, in one last piece.'),
        steps: [
          { type: 'drill', count: 12, prompt: T('Échauffement de lecture.', 'Reading warm-up.'),
            config: { kind: 'reading', reading: { lo: 60, hi: 67, clefs: ['treble'] }, hints: false } },
          { type: 'rhythm', bpm: 96, prompt: T('Le rythme de la troisième phrase.', 'The rhythm of the third phrase.'), rounds: ['q q h | q q h'] },
          { type: 'piece', title: T('Frère Jacques', 'Frère Jacques'), bpm: 100, right: JACQUES, staff: true, range: POS_C, mode: 'tempo',
            text: T('Directement en rythme. Bravo pour le chemin parcouru !', 'Straight in time. Well done for coming this far!') },
        ],
      },
    ],
  },
];
