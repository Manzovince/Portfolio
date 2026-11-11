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

// Unit 4: left hand
const LUNE_LH = LUNE.replace(/4/g, '3');
const ECHO_R = 'C4q D4q E4q F4q | G4w | rw | rw | E4q F4q G4q E4q | C4w | rw | rw';
const ECHO_L = 'rw | rw | G3q F3q E3q D3q | C3w | rw | rw | G3q E3q F3q D3q | C3w';
const LUNE_BASS = 'C3w | G3w | C3h G3h | C3w | C3w | G3w | C3h G3h | C3w';
const ODE_BASS = 'C3w | G3w | C3w | C3h G3h | C3w | G3w | C3w | G3h C3h';
// Unit 5: scales
const SOL_AIR = 'G4q A4q B4q C5q | D5h B4h | C5q A4q F#4q A4q | G4w | B4q C5q D5q B4q | C5q A4q F#4h | G4q A4q B4q F#4q | G4w';
const SOL_AIR_L = 'G3w | G3w | D3w | G3w | G3w | D3w | G3h D3h | G3w';
const FA_AIR = 'F4q G4q A4q Bb4q | C5h A4h | Bb4q G4q E4q G4q | F4w | A4q Bb4q C5q A4q | Bb4q G4q E4h | F4q G4q A4q E4q | F4w';
const FA_AIR_L = 'F3w | F3w | C3w | F3w | F3w | C3w | F3h C3h | F3w';
const TWINKLE = 'G4q G4q D5q D5q | E5q E5q D5h | C5q C5q B4q B4q | A4q A4q G4h | D5q D5q C5q C5q | B4q B4q A4h | D5q D5q C5q C5q | B4q B4q A4h | G4q G4q D5q D5q | E5q E5q D5h | C5q C5q B4q B4q | A4q A4q G4h';
const TWINKLE_L = 'G3w | C3h G3h | C3h D3h | D3h G3h | G3h C3h | G3h D3h | G3h C3h | G3h D3h | G3w | C3h G3h | C3h D3h | D3h G3h';
const POS_LH = { lo: 45, hi: 60 };    // left hand around C3 (A2 to C4)
const TWO_HANDS = { lo: 45, hi: 72 };
const POS_G = { lo: 53, hi: 79 };

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

  // ═══ Unit 4 ═══════════════════════════════════════════════════
  {
    id: 'u4',
    title: T('Main gauche et clé de fa', 'Left hand and bass clef'),
    blurb: T('Lire en bas du clavier, puis jouer à deux mains.', 'Read the low notes, then play with both hands.'),
    lessons: [
      {
        id: 'b1',
        title: T('La clé de fa', 'The bass clef'),
        goal: T('Lire [C3] à [G3] sur la portée du bas.', 'Read [C3] to [G3] on the lower staff.'),
        steps: [
          { type: 'info', title: T('La portée de la main gauche', 'The left hand’s staff'),
            text: T('Les notes graves s’écrivent sur une deuxième portée, en **clé de fa**. Ses deux points encadrent la 4e ligne en partant du bas : c’est là qu’habite [F3].\n[C3] est dans le 2e interligne. Et [C4], le Do central, est sur une petite ligne **au-dessus** de cette portée : c’est le même que sous la clé de sol, il fait le lien entre les deux.',
              'Low notes are written on a second staff, in **bass clef**. Its two dots frame the 4th line from the bottom: that is where [F3] lives.\n[C3] is in the 2nd space. And [C4], middle C, sits on a short line **above** this staff: the same note as below the treble staff, joining the two.'),
            line: { src: 'C3q D3q E3q F3q | G3h C4h', clef: 'bass' }, listen: 'C3q D3q E3q F3q | G3h C4h', bpm: 90, keys: { lo: 45, hi: 62, midis: [48, 53, 60] } },
          { type: 'quiz', rounds: [
            { q: T('En clé de fa, la ligne entre les deux points est…', 'In bass clef, the line between the two dots is…'), options: ['[C3]', '[F3]', '[G3]'], answer: 1 },
            { q: T('Quelle note est-ce ?', 'Which note is this?'), line: { src: 'C3w', clef: 'bass' }, options: ['[A2]', '[C3]', '[E3]'], answer: 1 },
          ] },
          { type: 'drill', count: 6, prompt: T('Trois repères : [C3], [F3] et [G3].', 'Three landmarks: [C3], [F3] and [G3].'),
            config: { kind: 'reading', reading: { lo: 48, hi: 55, clefs: ['bass'], pool: [48, 53, 55] }, hints: false } },
          { type: 'drill', count: 10, prompt: T('Toutes les notes de [C3] à [G3].', 'Every note from [C3] to [G3].'),
            config: { kind: 'reading', reading: { lo: 48, hi: 55, clefs: ['bass'] }, hints: false } },
        ],
      },
      {
        id: 'b2',
        title: T('Position de [C], main gauche', 'C position, left hand'),
        goal: T('Jouer cinq notes de la main gauche, puis un air.', 'Play five notes with the left hand, then a tune.'),
        steps: [
          { type: 'info', title: T('Les doigts à l’envers', 'Fingers the other way round'),
            text: T('La main gauche se numérote aussi de 1 (pouce) à 5 (petit doigt). Mais en position de [C], c’est le **5 qui est sur [C3]** et le **pouce sur [G3]** : en montant, on va du petit doigt vers le pouce.\nGarde la même main ronde et souple qu’à droite.',
              'The left hand is also numbered 1 (thumb) to 5 (little finger). But in C position, **5 is on [C3]** and the **thumb on [G3]**: going up, you move from little finger to thumb.\nKeep the same round, relaxed hand as on the right.'),
            keys: { ...POS_LH, midis: [48, 50, 52, 53, 55] } },
          { type: 'phrase', range: POS_LH, listen: true, hint: 'keys', bpm: 90,
            prompt: T('Écoute puis rejoue, main gauche.', 'Listen, then play it back with the left hand.'),
            rounds: ['C3q D3q E3q F3q G3q', 'G3q F3q E3q D3q C3q', 'C3q E3q G3q E3q C3q'] },
          { type: 'phrase', range: POS_LH, listen: false, staff: true, clef: 'bass', hint: 'miss', bpm: 90,
            prompt: T('Lis en clé de fa et joue.', 'Read in bass clef and play.'),
            rounds: ['G3q F3q E3q D3q', 'C3q E3q D3q F3q', 'E3q G3q F3q D3q C3h'] },
          { type: 'piece', title: T('Au clair de la lune, main gauche', 'Au clair de la lune, left hand'), bpm: 90, left: LUNE_LH, staff: true, range: POS_LH,
            text: T('L’air que tu connais, une octave plus bas.', 'The tune you know, an octave lower.') },
        ],
      },
      {
        id: 'b3',
        title: T('Chacune son tour', 'Taking turns'),
        goal: T('Faire passer la mélodie d’une main à l’autre.', 'Pass the melody from one hand to the other.'),
        steps: [
          { type: 'info', title: T('Question, réponse', 'Question, answer'),
            text: T('Pose les deux mains en position de [C] : la droite à partir de [C4], la gauche à partir de [C3]. Les mains ne bougent plus.\nDans ce morceau, la main droite pose une question, la gauche répond. Pendant que l’une joue, l’autre attend, prête.',
              'Put both hands in C position: right from [C4], left from [C3]. The hands stay put.\nIn this piece, the right hand asks a question and the left one answers. While one plays, the other waits, ready.'),
            keys: { ...TWO_HANDS, midis: [48, 50, 52, 53, 55, 60, 62, 64, 65, 67] } },
          { type: 'piece', title: T('Question-réponse', 'Question and answer'), bpm: 92, right: ECHO_R, left: ECHO_L, staff: true, range: TWO_HANDS,
            text: T('Pour t’entraîner, choisis une main seule. Les étoiles se gagnent à deux mains.', 'To practise, pick one hand. Stars are earned with both hands.') },
        ],
      },
      {
        id: 'b4',
        title: T('Mélodie et basse', 'Melody and bass'),
        goal: T('Tenir une note à gauche pendant que la droite chante.', 'Hold a note on the left while the right hand sings.'),
        steps: [
          { type: 'info', title: T('Jouer ensemble', 'Playing together'),
            text: T('La main gauche joue maintenant **en même temps** : une note longue au début de chaque mesure, qu’elle tient pendant que la droite continue.\nLe piège : la droite veut s’arrêter quand la gauche joue. Commence très lentement, à 50 %, en pas à pas.',
              'Now the left hand plays **at the same time**: one long note at the start of each bar, held while the right hand carries on.\nThe trap: the right hand wants to stop when the left one plays. Start very slowly, at 50 %, step by step.') },
          { type: 'rhythm', bpm: 80, prompt: T('Échauffement : une blanche à gauche, deux noires à droite… ici sur une seule touche, juste pour sentir le rythme.', 'Warm-up: a half note on the left, two quarters on the right… on one key here, just to feel the rhythm.'),
            rounds: ['q q q q | h h | q q q q | w'] },
          { type: 'piece', title: T('Au clair de la lune, deux mains', 'Au clair de la lune, both hands'), bpm: 88, right: LUNE, left: LUNE_BASS, staff: true, range: TWO_HANDS },
        ],
      },
      {
        id: 'b5',
        title: T('Bilan : l’Ode à deux mains', 'Check-point: the Ode with both hands'),
        goal: T('Un morceau entier, lu, à deux mains.', 'A whole piece, read, with both hands.'),
        steps: [
          { type: 'drill', count: 10, prompt: T('Échauffement : les deux clés mélangées.', 'Warm-up: both clefs mixed.'),
            config: { kind: 'reading', reading: { lo: 48, hi: 67, clefs: ['treble', 'bass'] }, hints: false } },
          { type: 'piece', title: T('Ode à la joie, deux mains', 'Ode to Joy, both hands'), bpm: 96, right: ODE, left: ODE_BASS, staff: true, range: TWO_HANDS,
            text: T('La basse change avec l’harmonie : [C] quand la mélodie se pose, [G] quand elle attend la suite.', 'The bass follows the harmony: [C] when the tune rests, [G] when it waits for more.') },
        ],
      },
    ],
  },

  // ═══ Unit 5 ═══════════════════════════════════════════════════
  {
    id: 'u5',
    title: T('Gammes et tonalités', 'Scales and keys'),
    blurb: T('Dièses, bémols, passage du pouce, trois gammes.', 'Sharps, flats, the thumb-under, three scales.'),
    lessons: [
      {
        id: 'g1',
        title: T('Tons, demi-tons, dièses et bémols', 'Tones, semitones, sharps and flats'),
        goal: T('Comprendre les touches noires et leurs noms.', 'Understand the black keys and their names.'),
        steps: [
          { type: 'info', title: T('Le plus petit pas', 'The smallest step'),
            text: T('Le **demi-ton** est l’écart entre deux touches voisines, noire ou blanche. Le **ton** vaut deux demi-tons.\nEntre [E] et [F], et entre [B] et [C], pas de touche noire : ce sont des demi-tons.\nLe **dièse ♯** monte une note d’un demi-ton, le **bémol ♭** la descend. La touche noire entre [C] et [D] s’appelle donc [C#]… ou [Db].',
              'A **semitone** is the gap between two neighbouring keys, black or white. A **tone** is two semitones.\nBetween [E] and [F], and between [B] and [C], there is no black key: those are semitones.\nA **sharp ♯** raises a note by a semitone, a **flat ♭** lowers it. So the black key between [C] and [D] is [C#]… or [Db].'),
            keys: { lo: 57, hi: 72, midis: [61, 64, 65, 71, 72] } },
          { type: 'quiz', rounds: [
            { q: T('De [E] à [F], il y a…', 'From [E] to [F] there is…'), options: [T('un demi-ton', 'a semitone'), T('un ton', 'a tone')], answer: 0 },
            { q: T('De [C] à [D], il y a…', 'From [C] to [D] there is…'), options: [T('un demi-ton', 'a semitone'), T('un ton', 'a tone')], answer: 1 },
            { q: T('[F#] est…', '[F#] is…'), options: [T('la touche noire juste à droite de [F]', 'the black key just right of [F]'), T('la touche noire juste à gauche de [F]', 'the black key just left of [F]'), T('[G]', '[G]')], answer: 0 },
            { q: T('[Bb] et [A#] sont…', '[Bb] and [A#] are…'), options: [T('la même touche', 'the same key'), T('deux touches différentes', 'two different keys')], answer: 0 },
          ] },
          { type: 'find', range: WIDE, hint: false, prompt: T('Trouve la touche noire demandée, à n’importe quelle hauteur.', 'Find the black key asked for, at any height.'),
            rounds: () => [{ pc: 6, label: 'F#' }, { pc: 10, label: 'Bb' }, { pc: 1, label: 'C#' }, { pc: 3, label: 'Eb' }, { pc: 8, label: 'G#' }, { pc: 10, label: 'A#' }, { pc: 1, label: 'Db' }, { pc: 6, label: 'Gb' }].sort(() => Math.random() - 0.5) },
        ],
      },
      {
        id: 'g2',
        title: T('La gamme de [C] et le passage du pouce', 'C major and the thumb-under'),
        goal: T('Jouer une octave d’une seule main, sans s’arrêter.', 'Play an octave with one hand, without stopping.'),
        steps: [
          { type: 'info', title: T('Huit notes, cinq doigts', 'Eight notes, five fingers'),
            text: T('Une **gamme majeure** suit toujours le même chemin : ton, ton, **demi-ton**, ton, ton, ton, **demi-ton**. Sur [C], ça tombe pile sur les touches blanches.\nCinq doigts ne suffisent pas pour huit notes : en montant, joue [C] [D] [E] avec 1 2 3, puis **passe le pouce sous la main** pour jouer [F], et finis avec 1 2 3 4 5.\nEn descendant, c’est l’inverse : après le pouce sur [F], le **3 passe par-dessus** pour jouer [E].',
              'A **major scale** always follows the same path: tone, tone, **semitone**, tone, tone, tone, **semitone**. On [C], it lands exactly on the white keys.\nFive fingers are not enough for eight notes: going up, play [C] [D] [E] with 1 2 3, then **pass the thumb under the hand** to play [F], and finish with 1 2 3 4 5.\nComing down, the other way: after the thumb on [F], finger **3 crosses over** to play [E].'),
            line: { src: 'C4q D4q E4q F4q G4q A4q B4q C5q' }, listen: 'C4q D4q E4q F4q G4q A4q B4q C5q C5q B4q A4q G4q F4q E4q D4q C4h', bpm: 90 },
          { type: 'phrase', range: { lo: 57, hi: 74 }, listen: true, hint: 'keys', bpm: 72,
            prompt: T('Juste le passage : 1 2 3, pouce dessous, et retour.', 'Just the crossing: 1 2 3, thumb under, and back.'),
            rounds: ['C4q D4q E4q F4q', 'F4q E4q D4q C4q', 'C4q D4q E4q F4q G4q F4q E4q D4q C4q'] },
          { type: 'drill', count: 2, range: { lo: 57, hi: 74 }, prompt: T('La gamme de [C] en montant puis en descendant, avec les notes affichées.', 'The C scale up then down, with the notes shown.'),
            config: { kind: 'scales', scales: ['major'], roots: [0], hints: true } },
          { type: 'drill', count: 2, range: { lo: 57, hi: 74 }, prompt: T('La même, de mémoire.', 'The same, from memory.'),
            config: { kind: 'scales', scales: ['major'], roots: [0], hints: false } },
        ],
      },
      {
        id: 'g3',
        title: T('La gamme de [G] : un dièse', 'G major: one sharp'),
        goal: T('Jouer et lire en [G] majeur.', 'Play and read in G major.'),
        steps: [
          { type: 'info', title: T('Le même chemin, depuis [G]', 'The same path, from [G]'),
            text: T('Pour garder « ton, ton, demi-ton, ton, ton, ton, demi-ton » en partant de [G], il faut une touche noire : [F#] au lieu de [F].\nPlutôt que d’écrire ♯ devant chaque [F], on le met une fois au début de la portée : c’est l’**armure**. Tous les [F] du morceau deviennent [F#].\nDoigté : 1 2 3, pouce dessous sur [C], puis 1 2 3 4 5.',
              'To keep “tone, tone, semitone, tone, tone, tone, semitone” starting from [G], you need a black key: [F#] instead of [F].\nRather than writing ♯ before every [F], it goes once at the start of the staff: the **key signature**. Every [F] in the piece becomes [F#].\nFingering: 1 2 3, thumb under on [C], then 1 2 3 4 5.'),
            line: { src: 'G4q A4q B4q C5q D5q E5q F#5q G5q', key: 'G' }, listen: 'G4q A4q B4q C5q D5q E5q F#5q G5q', bpm: 90, keys: { ...POS_G, pcs: [7, 9, 11, 0, 2, 4, 6] } },
          { type: 'quiz', rounds: [
            { q: T('Avec cette armure, comment se joue cette note ?', 'With this key signature, how is this note played?'), line: { src: 'F#5w', key: 'G' }, options: ['[F5]', '[F#5]', '[G5]'], answer: 1 },
            { q: T('Dans la gamme de [G] majeur, la note altérée est…', 'In G major, the altered note is…'), options: ['[C#]', '[F#]', '[Bb]'], answer: 1 },
          ] },
          { type: 'drill', count: 2, range: POS_G, prompt: T('La gamme de [G], avec les notes affichées.', 'The G scale, with the notes shown.'),
            config: { kind: 'scales', scales: ['major'], roots: [7], hints: true } },
          { type: 'phrase', range: POS_G, listen: false, staff: true, key: 'G', hint: 'miss', bpm: 90,
            prompt: T('Lis avec l’armure : chaque [F] est un [F#].', 'Read with the key signature: every [F] is an [F#].'),
            rounds: ['G4q A4q B4q A4q', 'D5q C5q B4q A4q G4h', 'E5q F#5q G5q D5q', 'A4q F#4q G4h'] },
          { type: 'piece', title: T('Petit air en [G]', 'Little tune in G'), bpm: 92, right: SOL_AIR, left: SOL_AIR_L, staff: true, range: { lo: 50, hi: 76 },
            text: T('Main droite en position de [G] (pouce sur [G4]), main gauche sur [G3] et [D3]. Attention aux [F#] !', 'Right hand in G position (thumb on [G4]), left hand on [G3] and [D3]. Watch the [F#]s!') },
        ],
      },
      {
        id: 'g4',
        title: T('La gamme de [F] : un bémol', 'F major: one flat'),
        goal: T('Jouer et lire en [F] majeur.', 'Play and read in F major.'),
        steps: [
          { type: 'info', title: T('Un bémol cette fois', 'A flat this time'),
            text: T('Depuis [F], le demi-ton tombe entre [A] et la note suivante : il faut [Bb] au lieu de [B]. L’armure de [F] majeur a donc un **bémol**, sur la ligne de [B].\nDoigté différent : 1 2 3 4 jusqu’à [Bb], **pouce dessous** sur [C], puis 1 2 3 4. Le pouce ne joue jamais une touche noire.',
              'From [F], the semitone falls between [A] and the next note: you need [Bb] instead of [B]. So the F major key signature has one **flat**, on the [B] line.\nDifferent fingering: 1 2 3 4 up to [Bb], **thumb under** on [C], then 1 2 3 4. The thumb never plays a black key.'),
            line: { src: 'F4q G4q A4q Bb4q C5q D5q E5q F5q', key: 'F' }, listen: 'F4q G4q A4q Bb4q C5q D5q E5q F5q', bpm: 90, keys: { lo: 53, hi: 77, pcs: [5, 7, 9, 10, 0, 2, 4] } },
          { type: 'quiz', rounds: [
            { q: T('Dans la gamme de [F] majeur, la note altérée est…', 'In F major, the altered note is…'), options: ['[F#]', '[Eb]', '[Bb]'], answer: 2 },
            { q: T('Pourquoi ne pas jouer [Bb] avec le pouce ?', 'Why not play [Bb] with the thumb?'), options: [T('Le pouce est court : sur une touche noire, la main se tord', 'The thumb is short: on a black key the hand twists'), T('C’est interdit par le solfège', 'Music theory forbids it')], answer: 0 },
          ] },
          { type: 'drill', count: 2, range: { lo: 53, hi: 77 }, prompt: T('La gamme de [F], notes affichées.', 'The F scale, notes shown.'),
            config: { kind: 'scales', scales: ['major'], roots: [5], hints: true } },
          { type: 'phrase', range: { lo: 53, hi: 77 }, listen: false, staff: true, key: 'F', hint: 'miss', bpm: 90,
            prompt: T('Lis avec l’armure : chaque [B] est un [Bb].', 'Read with the key signature: every [B] is a [Bb].'),
            rounds: ['F4q G4q A4q Bb4q', 'C5q Bb4q A4q G4q F4h', 'A4q Bb4q C5q A4q', 'G4q Bb4q A4q F4q'] },
          { type: 'piece', title: T('Petit air en [F]', 'Little tune in F'), bpm: 92, right: FA_AIR, left: FA_AIR_L, staff: true, range: { lo: 45, hi: 74 } },
        ],
      },
      {
        id: 'g5',
        title: T('Bilan : Ah ! vous dirai-je, maman', 'Check-point: Twinkle, Twinkle'),
        goal: T('Trois gammes, puis un morceau à deux mains en [G].', 'Three scales, then a two-handed piece in G.'),
        steps: [
          { type: 'drill', count: 3, range: { lo: 53, hi: 79 }, prompt: T('[C], [G] ou [F] majeur, au hasard, de mémoire.', 'C, G or F major, at random, from memory.'),
            config: { kind: 'scales', scales: ['major'], roots: [0, 7, 5], hints: false } },
          { type: 'piece', title: T('Ah ! vous dirai-je, maman', 'Twinkle, Twinkle, Little Star'), bpm: 96, right: TWINKLE, left: TWINKLE_L, staff: true, range: { lo: 45, hi: 77 },
            text: T('Main droite sur [G4]. Elle monte jusqu’à [E5] : allonge un peu le 5e doigt.', 'Right hand on [G4]. It reaches up to [E5]: stretch the 5th finger a little.') },
        ],
      },
    ],
  },
];
