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
// Unit 6: chords (left hand in the C position: C = C E G, F = C F A, G = B D G)
const LH_C = 'C3+E3+G3', LH_F = 'C3+F3+A3', LH_G = 'B2+D3+G3';
const ODE_CHORDS = `${LH_C}w | ${LH_G}w | ${LH_C}w | ${LH_G}w | ${LH_C}w | ${LH_G}w | ${LH_C}w | ${LH_G}h ${LH_C}h`;
const TWINKLE_C = 'C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h | G4q G4q F4q F4q | E4q E4q D4h | G4q G4q F4q F4q | E4q E4q D4h | C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h';
const TWINKLE_C_L = `${LH_C}w | ${LH_F}h ${LH_C}h | ${LH_F}h ${LH_C}h | ${LH_G}h ${LH_C}h | ${LH_C}h ${LH_F}h | ${LH_C}h ${LH_G}h | ${LH_C}h ${LH_F}h | ${LH_C}h ${LH_G}h | ${LH_C}w | ${LH_F}h ${LH_C}h | ${LH_F}h ${LH_C}h | ${LH_G}h ${LH_C}h`;
// Unit 7: rhythm 2
const JACQUES_FULL = JACQUES + ' | G4e A4e G4e F4e E4q C4q | G4e A4e G4e F4e E4q C4q | C4q G3q C4h | C4q G3q C4h';
const VALSE = 'E4h G4q | F4h D4q | E4q F4q G4q | C4h. | E4h G4q | A4h F4q | G4q F4q D4q | C4h.';
const VALSE_L = 'C3h. | G3h. | C3h. | C3h. | C3h. | F3h. | G3h. | C3h.';
const BIRTHDAY = 'rq rq G3e G3e | A3q G3q C4q | B3h G3e G3e | A3q G3q D4q | C4h G3e G3e | G4q E4q C4q | B3q A3q F4e F4e | E4q C4q D4q | C4h.';
// Unit 8: both hands
const MARY_L = 'C3w | C3w | G3w | C3w | C3w | C3w | G3w | C3w';
const LUNE_HALF = 'C3h E3h | C3h G2h | C3h G2h | C3w | C3h E3h | C3h G2h | C3h G2h | C3w';
const CANON_R = JACQUES + ' | rw | rw';
const CANON_L = 'rw | rw | ' + JACQUES.replace(/4/g, '3');
// Unit 10: sight-reading
const SIGHT = 'E4q F4q G4q E4q | D4h C4h | D4q E4q F4q D4q | E4w | E4q F4q G4q A4q | G4q F4q E4q D4q | C4q E4q D4q B3q | C4w';
const SIGHT_L = 'C3w | G2h C3h | G2w | C3w | C3w | G2w | C3h G2h | C3w';
// Unit 11: ear training, rounds drawn at random each time
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = midi => NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
const shuffle = list => list.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const HIGHER = T('plus aiguë', 'higher'), LOWER = T('plus grave', 'lower');
function higherLower(n) {
  return Array.from({ length: n }, (_, k) => {
    const a = rand(55, 74), gap = k < n / 2 ? rand(3, 9) : rand(1, 3), up = Math.random() < 0.5;
    const b = up ? a + gap : a - gap;
    return { q: T('La deuxième note est…', 'The second note is…'), play: `${nm(a)}h ${nm(b)}h`, bpm: 90, options: [HIGHER, LOWER], answer: up ? 0 : 1 };
  });
}
function upDown(n) {
  return Array.from({ length: n }, () => {
    const up = Math.random() < 0.5, a = rand(57, 69);
    const steps = [0, rand(1, 2), rand(3, 4), rand(5, 8)];
    const notes = steps.map(x => nm(up ? a + x : a + 8 - x));
    return { q: T('Cette mélodie…', 'This tune…'), play: notes.map(x => x + 'q').join(' '), bpm: 100, options: [T('monte', 'goes up'), T('descend', 'goes down')], answer: up ? 0 : 1 };
  });
}
function majorMinor(n, block = false) {
  return Array.from({ length: n }, () => {
    const root = rand(53, 65), minor = Math.random() < 0.5;
    const ch = [root, root + (minor ? 3 : 4), root + 7].map(nm);
    const play = block ? ch.join('+') + 'w' : ch.map(x => x + 'q').join(' ') + ' ' + ch.join('+') + 'h';
    return { q: T('Cet accord est…', 'This chord is…'), play, bpm: 80, options: [T('majeur', 'major'), T('mineur', 'minor')], answer: minor ? 1 : 0 };
  });
}
const IV = [[2, T('une seconde', 'a second')], [4, T('une tierce', 'a third')], [7, T('une quinte', 'a fifth')], [12, T('une octave', 'an octave')]];
function intervals(n) {
  return Array.from({ length: n }, () => {
    const k = rand(0, IV.length - 1), a = rand(55, 65);
    return { q: T('Cet intervalle est…', 'This interval is…'), play: `${nm(a)}h ${nm(a + IV[k][0])}h | ${nm(a)}+${nm(a + IV[k][0])}w`, bpm: 90, options: IV.map(x => x[1]), answer: k };
  });
}
// a note to find after the reference C4, then short tunes around the C position
const findNote = n => shuffle([62, 64, 65, 67, 69, 60, 64, 67]).slice(0, n).map(m => `C4h ${nm(m)}h`);
function tunes(n, len) {
  return Array.from({ length: n }, () => {
    const out = [60];
    while (out.length < len) {
      const last = out[out.length - 1], step = [-2, -1, 1, 2][rand(0, 3)];
      const next = [60, 62, 64, 65, 67][Math.max(0, Math.min(4, [60, 62, 64, 65, 67].indexOf(last) + step))];
      if (next !== last) out.push(next);
    }
    return out.map((m, k) => nm(m) + (k === len - 1 ? 'h' : 'q')).join(' ');
  });
}
// Unit 12: improvisation (backings: bass + offbeat chords, one loop)
const JC = 'C3+E3+G3', JAm = 'C3+E3+A3', JF = 'C3+F3+A3', JG = 'B2+D3+G3';
const comp = chs => chs.map(c => `rq ${c}q rq ${c}q`).join(' | ');
const POP_BASS = 'C2w | A1w | F1w | G1w';
const POP_COMP = comp([JC, JAm, JF, JG]);
const PENTA_BASS = 'Gb2w | Eb2w';
const PENTA_COMP = comp(['Gb3+Bb3+Db4', 'Eb3+Gb3+Bb3']);
const CADENCE_BASS = 'C2w | F1w | G1w | C2w';
const CADENCE_COMP = comp([JC, JF, JG, JC]);
const AXIS_BASS = 'C2w | G1w | A1w | F1w';
const AXIS_COMP = comp([JC, JG, JAm, JF]);
const BLUES = 'C7 C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7'.split(' ');
const BOOGIE = { C7: 'C2q E2q G2q A2q', F7: 'F1q A1q C2q D2q', G7: 'G1q B1q D2q E2q' };
const SHELL = { C7: 'E3+Bb3', F7: 'Eb3+A3', G7: 'F3+B3' };
const BLUES_BASS = BLUES.map(c => BOOGIE[c]).join(' | ');
const BLUES_COMP = comp(BLUES.map(c => SHELL[c]));
const PENTA_C = [0, 2, 4, 7, 9], BLUES_C = [0, 3, 5, 6, 7, 10], BLACK = [1, 3, 6, 8, 10];
const JAM_R = { lo: 55, hi: 79 };

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
          { type: 'piece', song: 'mary', title: T('Marie avait un petit agneau', 'Mary had a little lamb'), bpm: 100, right: MARY, staff: false, range: POS_C,
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
          { type: 'piece', song: 'lune', title: T('Au clair de la lune', 'Au clair de la lune'), bpm: 90, right: LUNE, staff: false, range: POS_C, mode: 'tempo',
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
          { type: 'piece', song: 'lune', title: T('Au clair de la lune', 'Au clair de la lune'), bpm: 92, right: LUNE, staff: true, range: POS_C,
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
          { type: 'piece', song: 'ode', title: T('Ode à la joie', 'Ode to Joy'), bpm: 100, right: ODE, staff: true, range: POS_C },
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
          { type: 'piece', song: 'jacques', title: T('Frère Jacques', 'Frère Jacques'), bpm: 100, right: JACQUES, staff: true, range: POS_C, mode: 'tempo',
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
          { type: 'piece', song: 'lune', title: T('Au clair de la lune, main gauche', 'Au clair de la lune, left hand'), bpm: 90, left: LUNE_LH, staff: true, range: POS_LH,
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
          { type: 'piece', song: 'lune', title: T('Au clair de la lune, deux mains', 'Au clair de la lune, both hands'), bpm: 88, right: LUNE, left: LUNE_BASS, staff: true, range: TWO_HANDS },
        ],
      },
      {
        id: 'b5',
        title: T('Bilan : l’Ode à deux mains', 'Check-point: the Ode with both hands'),
        goal: T('Un morceau entier, lu, à deux mains.', 'A whole piece, read, with both hands.'),
        steps: [
          { type: 'drill', count: 10, prompt: T('Échauffement : les deux clés mélangées.', 'Warm-up: both clefs mixed.'),
            config: { kind: 'reading', reading: { lo: 48, hi: 67, clefs: ['treble', 'bass'] }, hints: false } },
          { type: 'piece', song: 'ode', title: T('Ode à la joie, deux mains', 'Ode to Joy, both hands'), bpm: 96, right: ODE, left: ODE_BASS, staff: true, range: TWO_HANDS,
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
  // ═══ Unit 6 ═══════════════════════════════════════════════════
  {
    id: 'u6',
    title: T('Les accords', 'Chords'),
    blurb: T('Majeur, mineur, les lire, accompagner une mélodie.', 'Major, minor, reading them, accompanying a tune.'),
    lessons: [
      {
        id: 'a1',
        title: T('La triade majeure', 'The major triad'),
        goal: T('Construire et jouer un accord majeur sur n’importe quelle note.', 'Build and play a major chord on any note.'),
        steps: [
          { type: 'info', title: T('Une touche sur deux', 'Every other key'),
            text: T('Un **accord**, ce sont plusieurs notes jouées ensemble. Le plus courant a 3 notes : la **triade**.\nPose le pouce sur [C], saute une touche blanche, puis une autre : [C] [E] [G]. C’est l’accord de **[C] majeur**, joué avec les doigts 1, 3 et 5.\nDe [C] à [E] il y a 4 demi-tons (une **tierce majeure**), de [E] à [G] 3 demi-tons (une **tierce mineure**). Majeur = 4 + 3.',
              'A **chord** is several notes played together. The most common has 3 notes: the **triad**.\nPut your thumb on [C], skip a white key, then another: [C] [E] [G]. That is the **C major** chord, played with fingers 1, 3 and 5.\nFrom [C] to [E] there are 4 semitones (a **major third**), from [E] to [G] 3 semitones (a **minor third**). Major = 4 + 3.'),
            line: { src: 'C4+E4+G4w' }, listen: 'C4q E4q G4q C4+E4+G4w', bpm: 80, keys: { lo: 55, hi: 72, midis: [60, 64, 67] } },
          { type: 'phrase', range: { lo: 55, hi: 79 }, listen: true, hint: 'keys', bpm: 60,
            prompt: T('Écoute, puis joue l’accord : les trois touches **en même temps**.', 'Listen, then play the chord: all three keys **at once**.'),
            rounds: ['C4+E4+G4w', 'F4+A4+C5w', 'G4+B4+D5w'] },
          { type: 'quiz', rounds: [
            { q: T('L’accord de [F] majeur, c’est…', 'The F major chord is…'), options: ['[F] [A] [C]', '[F] [G] [A]', '[F] [Ab] [C]'], answer: 0 },
            { q: T('Une triade majeure, c’est une tierce majeure puis…', 'A major triad is a major third then…'), options: [T('une tierce mineure', 'a minor third'), T('une autre tierce majeure', 'another major third')], answer: 0,
              explain: T('4 demi-tons, puis 3.', '4 semitones, then 3.') },
            { q: T('Sur [D], la tierce majeure tombe sur…', 'On [D], the major third lands on…'), options: ['[F]', '[F#]', '[E]'], answer: 1,
              explain: T('[D] → [F#] : 4 demi-tons. D’où l’accord [D] [F#] [A].', '[D] → [F#]: 4 semitones. Hence the chord [D] [F#] [A].') },
          ] },
          { type: 'drill', count: 5, range: { lo: 55, hi: 79 }, prompt: T('Joue l’accord majeur affiché, à la hauteur que tu veux.', 'Play the major chord shown, at any height.'),
            config: { kind: 'chords', chords: ['maj'], roots: [0, 5, 7, 2, 9], hints: true } },
        ],
      },
      {
        id: 'a2',
        title: T('La triade mineure', 'The minor triad'),
        goal: T('Entendre et jouer la différence majeur / mineur.', 'Hear and play the major / minor difference.'),
        steps: [
          { type: 'info', title: T('Un demi-ton qui change tout', 'One semitone changes everything'),
            text: T('Garde [C] et [G], mais descends la note du milieu d’un demi-ton : [C] [Eb] [G]. C’est **[C] mineur**.\nMineur = 3 + 4 : la tierce mineure d’abord, la majeure ensuite. Le son devient plus sombre, plus triste.\nSur les touches blanches, trois accords sont déjà mineurs : [D] [F] [A], [E] [G] [B] et [A] [C] [E].',
              'Keep [C] and [G], but lower the middle note by a semitone: [C] [Eb] [G]. That is **C minor**.\nMinor = 3 + 4: the minor third first, the major one after. The sound gets darker, sadder.\nOn the white keys, three chords are already minor: [D] [F] [A], [E] [G] [B] and [A] [C] [E].'),
            line: { src: 'C4+E4+G4h C4+Eb4+G4h' }, listen: 'C4+E4+G4h C4+Eb4+G4h | C4+E4+G4h C4+Eb4+G4h', bpm: 60, keys: { lo: 55, hi: 72, midis: [60, 63, 64, 67] } },
          { type: 'phrase', range: { lo: 55, hi: 79 }, listen: true, hint: 'keys', bpm: 60,
            prompt: T('Majeur puis mineur : seule la note du milieu bouge.', 'Major then minor: only the middle note moves.'),
            rounds: ['C4+E4+G4h C4+Eb4+G4h', 'A4+C#5+E5h A4+C5+E5h', 'D4+F#4+A4h D4+F4+A4h'] },
          { type: 'quiz', rounds: [
            { q: T('[A] mineur, c’est…', 'A minor is…'), options: ['[A] [C#] [E]', '[A] [C] [E]', '[A] [B] [E]'], answer: 1 },
            { q: T('Pour passer de [G] majeur à [G] mineur, on…', 'To go from G major to G minor, you…'), options: [T('descend [B] en [Bb]', 'lower [B] to [Bb]'), T('monte [G] en [G#]', 'raise [G] to [G#]'), T('descend [D] en [Db]', 'lower [D] to [Db]')], answer: 0 },
          ] },
          { type: 'drill', count: 6, range: { lo: 55, hi: 79 }, prompt: T('Majeur ou mineur, regarde bien le symbole : « m » veut dire mineur.', 'Major or minor, read the symbol carefully: “m” means minor.'),
            config: { kind: 'chords', chords: ['maj', 'min'], roots: 'naturals', hints: true } },
          { type: 'drill', count: 6, range: { lo: 55, hi: 79 }, prompt: T('Les mêmes, sans les notes affichées.', 'The same, without the notes shown.'),
            config: { kind: 'chords', chords: ['maj', 'min'], roots: 'naturals', hints: false } },
        ],
      },
      {
        id: 'a3',
        title: T('Lire un accord', 'Reading a chord'),
        goal: T('Reconnaître une triade sur la portée et la jouer à la bonne hauteur.', 'Recognise a triad on the staff and play it at the right pitch.'),
        steps: [
          { type: 'info', title: T('Le bonhomme de neige', 'The snowman'),
            text: T('Sur la portée, une triade se lit d’un coup d’œil : trois notes empilées, **toutes sur des lignes** ou **toutes dans des interlignes**. On l’appelle parfois le « bonhomme de neige ».\nLis seulement la note du bas : les deux autres sont une tierce, puis une autre tierce au-dessus.',
              'On the staff, a triad reads at a glance: three stacked notes, **all on lines** or **all in spaces**. It is sometimes called the “snowman”.\nRead only the bottom note: the other two are a third, then another third above.'),
            line: { src: 'C4+E4+G4h D4+F4+A4h | E4+G4+B4h F4+A4+C5h' }, listen: 'C4+E4+G4h D4+F4+A4h | E4+G4+B4h F4+A4+C5h', bpm: 70 },
          { type: 'phrase', range: { lo: 57, hi: 79 }, listen: false, staff: true, hint: 'miss', bpm: 70,
            prompt: T('Lis la note du bas, puis empile deux tierces.', 'Read the bottom note, then stack two thirds.'),
            rounds: ['C4+E4+G4w', 'F4+A4+C5w', 'G4+B4+D5w', 'D4+F4+A4w', 'A4+C5+E5w'] },
          { type: 'drill', count: 8, prompt: T('Des accords au hasard en clé de sol, à la bonne hauteur.', 'Random chords in the treble clef, at the right pitch.'),
            config: { kind: 'reading', readMode: 'chord', reading: { lo: 60, hi: 79, clefs: ['treble'] }, hints: false } },
        ],
      },
      {
        id: 'a4',
        title: T('[C], [F], [G] : accompagner', 'C, F, G: accompanying'),
        goal: T('Enchaîner les trois accords principaux sans lever la main.', 'Move between the three main chords without lifting the hand.'),
        steps: [
          { type: 'info', title: T('Trois accords suffisent', 'Three chords are enough'),
            text: T('Dans la gamme de [C], trois accords portent presque toutes les chansons simples : **[C]** (le I, la maison), **[F]** (le IV) et **[G]** (le V, qui appelle le retour à [C]).\nPour passer de l’un à l’autre sans sauter, on change l’ordre des notes : c’est un **renversement**. [F] devient [C] [F] [A], [G] devient [B] [D] [G]. La main ne bouge presque plus : un ou deux doigts seulement.',
              'In the C scale, three chords carry nearly every simple song: **C** (the I, home), **F** (the IV) and **G** (the V, which wants to go back to C).\nTo move between them without jumping, you change the order of the notes: an **inversion**. F becomes [C] [F] [A], G becomes [B] [D] [G]. The hand barely moves: one or two fingers only.'),
            line: { src: 'C3+E3+G3w | C3+F3+A3w | B2+D3+G3w | C3+E3+G3w', clef: 'bass' }, listen: 'C3+E3+G3h C3+F3+A3h | B2+D3+G3h C3+E3+G3h', bpm: 60,
            keys: { lo: 43, hi: 60, midis: [47, 48, 50, 52, 53, 55, 57] } },
          { type: 'phrase', range: { lo: 43, hi: 64 }, listen: true, hint: 'keys', bpm: 60,
            prompt: T('Main gauche. Garde le pouce sur [G] ou le 5e doigt sur [C] : seuls les doigts du milieu bougent.', 'Left hand. Keep the thumb on [G] or the 5th finger on [C]: only the middle fingers move.'),
            rounds: ['C3+E3+G3h C3+F3+A3h', 'C3+E3+G3h B2+D3+G3h', 'C3+E3+G3q C3+F3+A3q B2+D3+G3q C3+E3+G3q'] },
          { type: 'quiz', rounds: [
            { q: T('En [C] majeur, l’accord du V, c’est…', 'In C major, the V chord is…'), options: ['[F]', '[G]', '[A] mineur'], answer: 1 },
            { q: T('Un renversement, c’est…', 'An inversion is…'), options: [T('les mêmes notes dans un autre ordre', 'the same notes in another order'), T('un accord mineur', 'a minor chord'), T('l’accord joué à l’envers dans le temps', 'the chord played backwards in time')], answer: 0 },
          ] },
          { type: 'piece', title: T('Ode à la joie, accords', 'Ode to Joy, chords'), bpm: 84, right: ODE, left: ODE_CHORDS, staff: true, range: { lo: 45, hi: 72 },
            text: T('La main gauche tient [C] ou [G] toute la mesure. Travaille-la seule d’abord.', 'The left hand holds C or G for the whole bar. Practise it alone first.') },
        ],
      },
      {
        id: 'a5',
        title: T('Bilan : Ah ! vous dirai-je, maman accompagné', 'Check-point: Twinkle, Twinkle with chords'),
        goal: T('Une mélodie et ses trois accords, deux mains.', 'A tune and its three chords, both hands.'),
        steps: [
          { type: 'drill', count: 6, range: { lo: 48, hi: 72 }, prompt: T('Échauffement : [C], [F] ou [G], au hasard.', 'Warm-up: C, F or G, at random.'),
            config: { kind: 'chords', chords: ['maj'], roots: [0, 5, 7], hints: false } },
          { type: 'piece', title: T('Ah ! vous dirai-je, maman (accords)', 'Twinkle, Twinkle (chords)'), bpm: 84, right: TWINKLE_C, left: TWINKLE_C_L, staff: true, range: { lo: 45, hi: 72 },
            text: T('Le même air qu’en [G], cette fois en [C]. Deux accords par mesure : [C] [F] [C] [G]…', 'The same tune as in G, this time in C. Two chords per bar: C F C G…') },
        ],
      },
    ],
  },

  // ═══ Unit 7 ═══════════════════════════════════════════════════
  {
    id: 'u7',
    title: T('Rythme 2', 'Rhythm 2'),
    blurb: T('Croches, notes pointées, valse et levée.', 'Eighth notes, dotted notes, waltz and pickup.'),
    lessons: [
      {
        id: 't1',
        title: T('Les croches', 'Eighth notes'),
        goal: T('Jouer deux notes par temps, bien régulières.', 'Play two even notes per beat.'),
        steps: [
          { type: 'info', title: T('Couper le temps en deux', 'Splitting the beat in two'),
            text: T('La **croche** dure un demi-temps : deux croches remplissent une noire. Seule, elle a un petit crochet ; à plusieurs, elles sont reliées par une **barre**.\nPour les compter, on ajoute « et » entre les temps : **1 et 2 et 3 et 4 et**. Les croches tombent sur les chiffres **et** sur les « et ».',
              'An **eighth note** lasts half a beat: two eighths fill a quarter. On its own it has a small flag; in groups they are joined by a **beam**.\nTo count them, add “and” between the beats: **1 and 2 and 3 and 4 and**. Eighths land on the numbers **and** on the “ands”.'),
            line: { src: 'q q e e e e | e e q h', rhythm: true }, listen: 'C5q C5q C5e C5e C5e C5e | C5e C5e C5q C5h', bpm: 72 },
          { type: 'quiz', rounds: [
            { q: T('Deux croches durent autant qu’…', 'Two eighth notes last as long as…'), options: [T('une noire', 'a quarter note'), T('une blanche', 'a half note'), T('une croche', 'an eighth note')], answer: 0, line: { src: 'e e', rhythm: true } },
            { q: T('Combien de croches dans une mesure à 4/4 ?', 'How many eighth notes in a 4/4 bar?'), options: ['4', '6', '8'], answer: 2 },
          ] },
          { type: 'rhythm', bpm: 72, prompt: T('Compte « 1 et 2 et » dans ta tête. Les croches, bien égales.', 'Count “1 and 2 and” in your head. Keep the eighths even.'),
            rounds: ['q q e e q | q q h', 'e e e e q q | e e q h', 'q e e q e e | e e e e h'] },
          { type: 'piece', song: 'jacques', title: T('Frère Jacques', 'Frère Jacques'), bpm: 84, right: JACQUES_FULL, staff: true, range: { lo: 55, hi: 72 },
            text: T('La chanson entière : les croches arrivent sur « Sonnez les matines ».', 'The whole song: the eighths come on “Sonnez les matines”.') },
        ],
      },
      {
        id: 't2',
        title: T('Noire pointée, croche', 'Dotted quarter, eighth'),
        goal: T('Sentir le rythme long-court.', 'Feel the long-short rhythm.'),
        steps: [
          { type: 'info', title: T('Un temps et demi', 'A beat and a half'),
            text: T('Le point ajoute la moitié de la valeur : la **noire pointée** dure 1 temps **et demi**. La croche qui suit complète le 2e temps.\nCompte : **1 (et) 2-et** : on tient pendant le « et » du 1, la croche tombe sur le « et » du 2.\nTu l’as déjà joué : c’est la fin de chaque phrase de l’*Ode à la joie*.',
              'A dot adds half the value: the **dotted quarter** lasts 1 **and a half** beats. The eighth after it completes beat 2.\nCount: **1 (and) 2-and**: hold through the “and” of 1, the eighth lands on the “and” of 2.\nYou have played it already: it ends each phrase of the *Ode to Joy*.'),
            line: { src: 'q. e q q | q. e h', rhythm: true }, listen: 'C5q. C5e C5q C5q | C5q. C5e C5h', bpm: 72 },
          { type: 'rhythm', bpm: 72, prompt: T('Tiens bien la noire pointée, la croche arrive tard.', 'Hold the dotted quarter, the eighth comes late.'),
            rounds: ['q. e q q | q. e h', 'q q q. e | h h', 'q. e q. e | w'] },
          { type: 'info', title: T('Le demi-soupir', 'The eighth rest'),
            text: T('Le **demi-soupir** est un silence d’un demi-temps, comme une croche muette. Placé sur le temps, il fait tomber la note suivante sur le « et » : c’est un **contretemps**.',
              'The **eighth rest** is half a beat of silence, like a silent eighth note. Placed on the beat, it pushes the next note onto the “and”: an **offbeat**.'),
            line: { src: 'q re e q re e | h h', rhythm: true }, listen: 'C5q re C5e C5q re C5e | C5h C5h', bpm: 72 },
          { type: 'rhythm', bpm: 66, prompt: T('Sur les demi-soupirs, compte « 1 » sans jouer, et joue sur le « et ».', 'On the eighth rests, count “1” without playing, and play on the “and”.'),
            rounds: ['q re e q re e | h h', 'q q re e q | w'] },
        ],
      },
      {
        id: 't3',
        title: T('La mesure à 3/4', 'Three-four time'),
        goal: T('Compter et jouer à trois temps.', 'Count and play in three.'),
        steps: [
          { type: 'info', title: T('Un, deux, trois', 'One, two, three'),
            text: T('En **3/4**, chaque mesure a 3 temps : **1 2 3, 1 2 3**. Le 1 est fort, les deux autres légers : c’est le balancement de la **valse**.\nUne mesure entière dure une **blanche pointée** (3 temps).',
              'In **3/4**, each bar has 3 beats: **1 2 3, 1 2 3**. The 1 is strong, the other two light: the sway of the **waltz**.\nA full bar lasts a **dotted half note** (3 beats).'),
            line: { src: 'q q q | h q | h.', rhythm: true }, listen: 'C3q G4q G4q | C3h G4q | C3h.', bpm: 96 },
          { type: 'quiz', rounds: [
            { q: T('En 3/4, une blanche pointée dure…', 'In 3/4, a dotted half note lasts…'), options: [T('une demi-mesure', 'half a bar'), T('une mesure entière', 'a whole bar'), T('deux mesures', 'two bars')], answer: 1, line: { src: 'h.', rhythm: true } },
            { q: T('Dans une valse, le temps fort est…', 'In a waltz, the strong beat is…'), options: [T('le 1', 'the 1'), T('le 2', 'the 2'), T('le 3', 'the 3')], answer: 0 },
          ] },
          { type: 'rhythm', bpm: 96, meter: 3, prompt: T('Le décompte est à 3 temps. Appuie un peu plus sur le 1.', 'The count-in is in three. Lean a little on the 1.'),
            rounds: ['q q q | h q | q h | h.', 'h q | h q | q q q | h.'] },
          { type: 'piece', title: T('Petite valse', 'Little waltz'), bpm: 104, meter: 3, right: VALSE, left: VALSE_L, staff: true, range: { lo: 45, hi: 72 },
            text: T('La main gauche joue une note par mesure, sur le 1, et la tient trois temps.', 'The left hand plays one note per bar, on the 1, and holds it three beats.') },
        ],
      },
      {
        id: 't4',
        title: T('La levée', 'The pickup'),
        goal: T('Commencer un morceau avant le premier temps.', 'Start a piece before the first beat.'),
        steps: [
          { type: 'info', title: T('Avant le 1', 'Before the 1'),
            text: T('Beaucoup de chansons ne commencent pas sur le 1 : les premières notes arrivent juste avant, comme un élan. C’est la **levée** (ou anacrouse).\n*Joyeux anniversaire* est à 3/4 et commence par deux croches sur le **3** : on compte « 1, 2 » en silence, et on chante « Joy-eux » sur le 3. Le « an- » d’« anniversaire » tombe sur le 1 suivant.',
              'Many songs don’t start on the 1: the first notes come just before, like a run-up. That is the **pickup** (or anacrusis).\n*Happy Birthday* is in 3/4 and starts with two eighths on beat **3**: count “1, 2” silently, and sing “Hap-py” on 3. “Birth-” lands on the next 1.'),
            line: { src: 'rq rq e e | q q q | h', rhythm: true }, listen: BIRTHDAY.split(' | ').slice(0, 3).join(' | '), bpm: 100 },
          { type: 'rhythm', bpm: 100, meter: 3, prompt: T('Les deux croches sur le 3, puis le 1 bien marqué.', 'The two eighths on 3, then a clear 1.'),
            rounds: ['rq rq e e | q q q | h e e | q q q | h.'] },
          { type: 'piece', title: T('Joyeux anniversaire', 'Happy Birthday'), bpm: 100, meter: 3, right: BIRTHDAY, staff: true, range: { lo: 53, hi: 72 },
            text: T('Main droite. Le grand saut [G3] → [G4] arrive au milieu : prépare la main pendant la blanche.', 'Right hand. The big leap [G3] → [G4] comes in the middle: get the hand ready during the half note.') },
        ],
      },
    ],
  },
  // ═══ Unit 8 ═══════════════════════════════════════════════════
  {
    id: 'u8',
    title: T('Les deux mains ensemble', 'Both hands together'),
    blurb: T('Tenir d’une main, bouger de l’autre, puis jouer en miroir et en canon.', 'Hold with one hand, move the other, then mirror and canon.'),
    lessons: [
      {
        id: 'm1',
        title: T('Une main tient, l’autre bouge', 'One hand holds, the other moves'),
        goal: T('Garder une note de basse pendant que la mélodie avance.', 'Keep a bass note down while the tune moves on.'),
        steps: [
          { type: 'info', title: T('Deux cerveaux', 'Two brains'),
            text: T('Jouer à deux mains, c’est surtout **ne pas faire bouger la main qui attend**. Commence par le plus simple : la main gauche pose une note et la **tient** toute la mesure, la main droite joue sa mélodie au-dessus.\nLes deux mains attaquent **ensemble** au début de la mesure, puis seule la droite continue.',
              'Playing with both hands is mostly about **keeping the waiting hand still**. Start with the easiest: the left hand puts down a note and **holds** it for the whole bar, the right hand plays its tune above.\nBoth hands strike **together** at the start of the bar, then only the right goes on.'),
            listen: 'C3+E4q D4q C4q D4q | C3+E4w', bpm: 80, keys: { lo: 45, hi: 67, midis: [48, 64] } },
          { type: 'phrase', range: { lo: 43, hi: 67 }, listen: true, hint: 'keys', bpm: 76,
            prompt: T('Les deux notes du début **ensemble**, puis la main droite seule. Garde la gauche enfoncée.', 'The first two notes **together**, then the right hand alone. Keep the left one down.'),
            rounds: ['C3+E4q D4q C4q D4q | C3+E4w', 'G2+D4q E4q F4q D4q | C3+C4w', 'C3+G4q F4q E4q D4q | C3+C4w'] },
          { type: 'piece', song: 'mary', title: T('Marie avait un petit agneau, deux mains', 'Mary had a little lamb, both hands'), bpm: 92, right: MARY, left: MARY_L, staff: true, range: { lo: 45, hi: 72 },
            text: T('La main gauche ne joue qu’une note par mesure : [C3], ou [G3] quand la mélodie est sur [D].', 'The left hand plays one note per bar: [C3], or [G3] when the tune is on [D].') },
        ],
      },
      {
        id: 'm2',
        title: T('La basse en blanches', 'Half-note bass'),
        goal: T('Changer de note à gauche au milieu de la mesure.', 'Change the left-hand note mid-bar.'),
        steps: [
          { type: 'info', title: T('Deux basses par mesure', 'Two bass notes per bar'),
            text: T('Un cran de plus : la main gauche joue maintenant **deux blanches** par mesure. Elle change de note sur le **temps 3**, en même temps qu’une note de la mélodie.\nRegarde où les deux mains tombent ensemble : ce sont tes points d’appui. Entre eux, la droite est seule.',
              'One step further: the left hand now plays **two half notes** per bar. It changes note on **beat 3**, together with a note of the tune.\nLook where both hands land together: those are your anchor points. Between them, the right hand is alone.'),
            listen: 'C3+C4q C4q E3+C4q D4q | C3+E4h G2+D4h', bpm: 80 },
          { type: 'phrase', range: { lo: 43, hi: 67 }, listen: true, hint: 'keys', bpm: 76,
            prompt: T('Les accords à deux mains, puis la droite seule.', 'The two-hand chords, then the right hand alone.'),
            rounds: ['C3+C4q C4q E3+C4q D4q', 'C3+E4h G2+D4h', 'C3+C4q E4q G2+D4q D4q | C3+C4w'] },
          { type: 'piece', song: 'lune', title: T('Au clair de la lune, basse en blanches', 'Au clair de la lune, half-note bass'), bpm: 88, right: LUNE, left: LUNE_HALF, staff: true, range: { lo: 43, hi: 67 },
            text: T('Travaille d’abord la main gauche seule : [C3] [E3], [C3] [G2]…', 'Practise the left hand alone first: [C3] [E3], [C3] [G2]…') },
        ],
      },
      {
        id: 'm3',
        title: T('En miroir, en octaves', 'Mirror and octaves'),
        goal: T('Faire bouger les deux mains à chaque note.', 'Move both hands on every note.'),
        steps: [
          { type: 'info', title: T('Mouvement parallèle, mouvement contraire', 'Parallel and contrary motion'),
            text: T('Quand les deux mains jouent la même mélodie à une octave d’écart, elles vont **dans le même sens** : c’est le mouvement parallèle. Les doigts, eux, sont inversés : le pouce droit et le 5e gauche jouent ensemble.\nEn **mouvement contraire**, les mains s’écartent en miroir : même doigt des deux côtés. C’est souvent plus facile !',
              'When both hands play the same tune an octave apart, they move **the same way**: parallel motion. The fingers are mirrored though: the right thumb plays with the left 5th finger.\nIn **contrary motion**, the hands spread out like a mirror: the same finger on both sides. It is often easier!'),
            listen: 'C3+C4q D3+D4q E3+E4q F3+F4q | G3+G4h | C4+C3q D4+B2q E4+A2q F4+G2q | G4+F2h', bpm: 80 },
          { type: 'phrase', range: { lo: 40, hi: 69 }, listen: true, hint: 'keys', bpm: 72,
            prompt: T('Les deux mains à chaque note, bien ensemble.', 'Both hands on every note, right together.'),
            rounds: ['C4+C3q D4+B2q E4+A2q F4+G2q | G4+F2w', 'C3+C4q D3+D4q E3+E4q F3+F4q | G3+G4w', 'G3+G4q F3+F4q E3+E4q D3+D4q | C3+C4w'] },
          { type: 'piece', title: T('Au clair de la lune, en octaves', 'Au clair de la lune, in octaves'), bpm: 84, right: LUNE, left: LUNE_LH, staff: true, range: { lo: 45, hi: 67 },
            text: T('La même mélodie aux deux mains. Pouce droit sur [C4], 5e doigt gauche sur [C3].', 'The same tune in both hands. Right thumb on [C4], left 5th finger on [C3].') },
        ],
      },
      {
        id: 'm4',
        title: T('Bilan : Frère Jacques en canon', 'Check-point: Frère Jacques as a round'),
        goal: T('Deux mains indépendantes : la même chanson, décalée.', 'Two independent hands: the same song, offset.'),
        steps: [
          { type: 'info', title: T('Le canon', 'The round'),
            text: T('Dans un **canon**, une deuxième voix chante la même mélodie, mais commence plus tard. Ici, la main droite démarre seule, et la main gauche entre **deux mesures après**, une octave plus bas.\nC’est le vrai test de l’indépendance : les deux mains font la même chose, mais jamais au même moment.',
              'In a **round**, a second voice sings the same tune but starts later. Here the right hand starts alone, and the left hand comes in **two bars later**, an octave lower.\nIt is the real test of independence: both hands do the same thing, never at the same time.'),
            listen: 'C4q D4q E4q C4q | C4q D4q E4q C4q | C3+E4q D3+F4q E3+G4h | C3+E4q D3+F4q E3+G4h', bpm: 90 },
          { type: 'piece', title: T('Frère Jacques en canon', 'Frère Jacques as a round'), bpm: 80, right: CANON_R, left: CANON_L, staff: true, range: { lo: 45, hi: 72 },
            text: T('Commence pas à pas, main par main, puis les deux.', 'Start step by step, one hand at a time, then both.') },
        ],
      },
    ],
  },

  // ═══ Unit 9 ═══════════════════════════════════════════════════
  {
    id: 'u9',
    title: T('Expression', 'Expression'),
    blurb: T('Jouer doux ou fort, lié ou piqué, et la pédale.', 'Soft or loud, joined or detached, and the pedal.'),
    lessons: [
      {
        id: 'e1',
        title: T('Piano, forte', 'Piano, forte'),
        goal: T('Choisir la force de chaque note.', 'Choose how loud each note is.'),
        steps: [
          { type: 'info', title: T('Les nuances', 'Dynamics'),
            text: T('Le piano s’appelle d’abord « piano-forte » : il sait jouer **doux** et **fort**. Ce n’est pas la profondeur de la touche qui compte, mais la **vitesse** à laquelle tu l’enfonces.\nSur la partition : ***p*** (piano) = doux, ***mf*** (mezzo forte) = moyen, ***f*** (forte) = fort.\nOctave mesure la force de chaque note de 0 à 127. Sur le clavier à l’écran, appuie **plus bas sur la touche** pour jouer plus fort.',
              'The piano was first called the “piano-forte”: it can play **soft** and **loud**. What counts is not how deep the key goes but how **fast** you press it.\nOn the score: ***p*** (piano) = soft, ***mf*** (mezzo forte) = medium, ***f*** (forte) = loud.\nOctave measures each note’s force from 0 to 127. On the on-screen keyboard, press **lower on the key** to play louder.'),
            listen: 'C4q D4q E4q F4q G4h | C4q D4q E4q F4q G4h', bpm: 84 },
          { type: 'touch', range: POS_C, bpm: 84,
            prompt: T('Joue la phrase avec la nuance indiquée. Les barres montrent ta force.', 'Play the phrase at the marked dynamic. The bars show your force.'),
            rounds: [{ src: 'C4q D4q E4q F4q G4h', dyn: 'p' }, { src: 'C4q D4q E4q F4q G4h', dyn: 'f' }, { src: 'G4q F4q E4q D4q C4h', dyn: 'p' }] },
          { type: 'touch', range: POS_C, bpm: 84,
            prompt: T('L’écho : la phrase fort, puis la même tout doux.', 'The echo: the phrase loud, then the same very soft.'),
            rounds: [{ src: 'C4q E4q G4h | C4q E4q G4h', dyn: ['f', 'f', 'f', 'p', 'p', 'p'] }, { src: 'G4q F4q E4q D4q | G4q F4q E4q D4q', dyn: ['f', 'f', 'f', 'f', 'p', 'p', 'p', 'p'] }] },
        ],
      },
      {
        id: 'e2',
        title: T('Crescendo, decrescendo', 'Crescendo, decrescendo'),
        goal: T('Faire grandir et diminuer le son, peu à peu.', 'Make the sound grow and fade, little by little.'),
        steps: [
          { type: 'info', title: T('Peu à peu', 'Little by little'),
            text: T('Le **crescendo** (« cresc. » ou le signe <) : chaque note un peu plus forte que la précédente. Le **decrescendo** (« dim. » ou >) : l’inverse.\nLe secret, c’est la régularité : pas de marche brusque, une pente douce. Garde de la marge : commence vraiment doux pour avoir où monter.',
              'A **crescendo** (“cresc.” or the < sign): each note a little louder than the one before. A **decrescendo** (“dim.” or >): the other way.\nThe secret is evenness: no sudden step, a gentle slope. Leave yourself room: start really soft so you have somewhere to go.'),
            listen: 'C4q D4q E4q F4q G4q A4q B4q C5q', bpm: 84 },
          { type: 'touch', range: { lo: 57, hi: 74 }, bpm: 84,
            prompt: T('Monte la gamme en crescendo, puis redescends en decrescendo.', 'Go up the scale getting louder, then down getting softer.'),
            rounds: [{ src: 'C4q D4q E4q F4q G4q A4q B4q C5q', dyn: 'cresc' }, { src: 'C5q B4q A4q G4q F4q E4q D4q C4q', dyn: 'dim' }, { src: 'C4q E4q G4q C5q E5q', dyn: 'cresc' }] },
        ],
      },
      {
        id: 'e3',
        title: T('Legato, staccato', 'Legato, staccato'),
        goal: T('Lier les notes, ou les détacher.', 'Join the notes, or detach them.'),
        steps: [
          { type: 'info', title: T('Lié ou piqué', 'Joined or detached'),
            text: T('**Legato** (une courbe sur les notes) : les notes se suivent sans trou. Lève un doigt **au moment exact** où le suivant s’enfonce, comme si tu marchais.\n**Staccato** (un point sur la note) : la note est courte et rebondit. La main reste légère, le doigt quitte la touche aussitôt.\nPour cet exercice, **pas de pédale** : elle lierait tout.',
              '**Legato** (a curve over the notes): the notes follow without a gap. Lift one finger **exactly as** the next goes down, as if you were walking.\n**Staccato** (a dot on the note): the note is short and bounces. The hand stays light, the finger leaves the key at once.\nFor this exercise, **no pedal**: it would join everything up.'),
            listen: 'C4q D4q E4q F4q G4h' },
          { type: 'touch', range: POS_C, bpm: 84,
            prompt: T('Joue avec l’articulation indiquée.', 'Play with the marked articulation.'),
            rounds: [{ src: 'C4q D4q E4q F4q G4h', art: 'legato' }, { src: 'G4q F4q E4q D4q C4q', art: 'staccato' }, { src: 'C4q E4q G4q E4q C4q', art: 'staccato' }, { src: 'E4q D4q C4q D4q E4h', art: 'legato' }] },
        ],
      },
      {
        id: 'e4',
        title: T('La pédale', 'The pedal'),
        goal: T('Lier des accords avec la pédale, sans les mélanger.', 'Join chords with the pedal without blurring them.'),
        steps: [
          { type: 'info', title: T('Le pied droit', 'The right foot'),
            text: T('La **pédale de droite** (la sourdine) laisse sonner les notes même quand tu lèves les doigts. Le talon reste au sol, seul l’avant du pied bouge.\nSi tu la gardes enfoncée, les accords se mélangent. L’astuce, c’est la **pédale de retard** : joue l’accord, **puis** lève la pédale et renfonce-la juste après. Les doigts d’abord, le pied ensuite.\nPas de pédale branchée ? Ici, la **barre d’espace** fait office de pédale.',
              'The **right pedal** (the sustain) lets notes ring even after you lift your fingers. The heel stays down, only the front of the foot moves.\nIf you keep it down, the chords blur together. The trick is the **legato pedal**: play the chord, **then** lift the pedal and press it again just after. Fingers first, foot second.\nNo pedal plugged in? Here, the **space bar** works as a pedal.'),
            line: { src: 'C4+E4+G4h F4+A4+C5h | G4+B4+D5h C4+E4+G4h' }, listen: 'C4+E4+G4h F4+A4+C5h | G4+B4+D5h C4+E4+G4h', bpm: 60 },
          { type: 'touch', range: { lo: 57, hi: 76 }, bpm: 60,
            prompt: T('Accord, puis pédale. À chaque nouvel accord : lève et renfonce la pédale juste après.', 'Chord, then pedal. On each new chord: lift and press the pedal again just after.'),
            rounds: [{ src: 'C4+E4+G4h F4+A4+C5h | G4+B4+D5h C4+E4+G4h', pedal: true }, { src: 'C4+E4+G4h A3+C4+E4h | F3+A3+C4h G3+B3+D4h', pedal: true }] },
        ],
      },
    ],
  },

  // ═══ Unit 10 ══════════════════════════════════════════════════
  {
    id: 'u10',
    title: T('Lire plus vite', 'Reading faster'),
    blurb: T('Les grands intervalles, les lignes supplémentaires, le grand système, lire à vue.', 'Wide intervals, ledger lines, the grand staff, sight-reading.'),
    lessons: [
      {
        id: 'l1',
        title: T('Quarte, quinte, octave', 'Fourths, fifths, octaves'),
        goal: T('Lire les grands écarts d’un coup d’œil.', 'Read wide gaps at a glance.'),
        steps: [
          { type: 'info', title: T('Compter les marches', 'Counting the steps'),
            text: T('On compte un intervalle en comptant les notes, **la première comprise** : de [C] à [F], C-D-E-F, ça fait 4 : une **quarte**.\nSur la portée : la **quinte** va d’une ligne à la ligne d’après la suivante (ou interligne à interligne) ; la **quarte** d’une ligne à un interligne. L’**octave** saute de 7 notes : une ligne et un interligne, bien éloignés.\nSous les doigts, en position fixe : quinte = pouce et 5e doigt.',
              'You count an interval by counting the notes, **including the first**: from [C] to [F], C-D-E-F, that is 4: a **fourth**.\nOn the staff: a **fifth** goes from a line to the line after next (or space to space); a **fourth** from a line to a space. An **octave** jumps 7 notes: a line and a space, far apart.\nUnder the fingers, in a fixed position: fifth = thumb and 5th finger.'),
            line: { src: 'C4h F4h | C4h G4h | C4h A4h | C4h C5h' }, listen: 'C4h F4h | C4h G4h | C4h A4h | C4h C5h', bpm: 84 },
          { type: 'quiz', rounds: [
            { q: T('Cet intervalle est…', 'This interval is…'), line: { src: 'E4h A4h' }, options: [T('une tierce', 'a third'), T('une quarte', 'a fourth'), T('une quinte', 'a fifth')], answer: 1 },
            { q: T('Et celui-ci ?', 'And this one?'), line: { src: 'D4h A4h' }, options: [T('une quarte', 'a fourth'), T('une quinte', 'a fifth'), T('une sixte', 'a sixth')], answer: 1 },
            { q: T('Et celui-ci ?', 'And this one?'), line: { src: 'F4h F5h' }, options: [T('une sixte', 'a sixth'), T('une septième', 'a seventh'), T('une octave', 'an octave')], answer: 2 },
            { q: T('Et celui-ci ?', 'And this one?'), line: { src: 'G4h E5h' }, options: [T('une quinte', 'a fifth'), T('une sixte', 'a sixth'), T('une octave', 'an octave')], answer: 1 },
          ] },
          { type: 'phrase', range: { lo: 57, hi: 79 }, listen: false, staff: true, hint: 'miss', bpm: 84,
            prompt: T('Lis l’écart, pas le nom : « une quinte plus haut », « une quarte plus bas »…', 'Read the gap, not the name: “a fifth up”, “a fourth down”…'),
            rounds: ['C4q G4q E4q C5q', 'G4q D4q G4q C5q', 'F4q C5q A4q F4q', 'E4q A4q D5q G4q', 'C5q G4q E4q C4h'] },
        ],
      },
      {
        id: 'l2',
        title: T('Les lignes supplémentaires', 'Ledger lines'),
        goal: T('Lire au-dessus et en dessous des portées.', 'Read above and below the staves.'),
        steps: [
          { type: 'info', title: T('Au-delà des cinq lignes', 'Beyond the five lines'),
            text: T('Quand une note sort de la portée, on lui ajoute de petites **lignes supplémentaires**. Ne les compte pas une à une : retiens deux repères.\nEn clé de sol, **deux lignes au-dessus** : [C6]. En clé de fa, **deux lignes en dessous** : [C2]. Et la ligne du milieu, entre les deux clés, c’est toujours [C4].',
              'When a note leaves the staff, it gets short extra **ledger lines**. Don’t count them one by one: remember two landmarks.\nIn the treble clef, **two lines above**: [C6]. In the bass clef, **two lines below**: [C2]. And the line in the middle, between the two clefs, is always [C4].'),
            line: { src: 'G5q A5q B5q C6q' }, listen: 'G5q A5q B5q C6q', bpm: 84 },
          { type: 'drill', count: 10, prompt: T('Les notes aiguës, au-dessus de la clé de sol.', 'The high notes, above the treble clef.'),
            config: { kind: 'reading', reading: { lo: 76, hi: 86, clefs: ['treble'] }, hints: false } },
          { type: 'drill', count: 10, prompt: T('Les notes graves, sous la clé de fa.', 'The low notes, below the bass clef.'),
            config: { kind: 'reading', reading: { lo: 36, hi: 47, clefs: ['bass'] }, hints: false } },
        ],
      },
      {
        id: 'l3',
        title: T('Le grand système', 'The grand staff'),
        goal: T('Lire les deux portées en même temps.', 'Read both staves at once.'),
        steps: [
          { type: 'info', title: T('Deux portées, un piano', 'Two staves, one piano'),
            text: T('Le piano se lit sur **deux portées** reliées par une accolade : la clé de sol en haut (souvent la main droite), la clé de fa en bas (souvent la gauche).\nEntre les deux, [C4] sert de pont : une ligne sous la clé de sol, une ligne au-dessus de la clé de fa. C’est la même touche.\nLis de bas en haut, comme un accord : la basse d’abord, puis ce qui est au-dessus.',
              'Piano music is read on **two staves** joined by a brace: the treble clef on top (usually the right hand), the bass clef below (usually the left).\nBetween them, [C4] is the bridge: one line below the treble clef, one line above the bass clef. It is the same key.\nRead bottom to top, like a chord: the bass first, then what is above.') },
          { type: 'drill', count: 12, prompt: T('Les deux clés mélangées, sur tout le clavier du milieu.', 'Both clefs mixed, across the middle of the keyboard.'),
            config: { kind: 'reading', reading: { lo: 41, hi: 81, clefs: ['treble', 'bass'] }, hints: false } },
          { type: 'drill', count: 6, prompt: T('Des accords, en clé de sol ou en clé de fa.', 'Chords, in the treble or bass clef.'),
            config: { kind: 'reading', readMode: 'chord', reading: { lo: 41, hi: 79, clefs: ['treble', 'bass'] }, hints: false } },
        ],
      },
      {
        id: 'l4',
        title: T('Lire à vue', 'Sight-reading'),
        goal: T('Jouer du premier coup un passage jamais vu.', 'Play a passage you have never seen, first time.'),
        steps: [
          { type: 'info', title: T('Avant de jouer, regarde', 'Look before you play'),
            text: T('Le déchiffrage, ça se prépare en 20 secondes :\n1. L’**armure** et la **mesure**.\n2. La **première note** de chaque main : place les mains.\n3. Le **rythme** : y a-t-il des croches, des notes pointées ?\n4. Le **chemin** : ça monte, ça descend, des sauts ?\nPuis joue **lentement et sans t’arrêter**. Une fausse note n’est pas grave ; s’arrêter, si.',
              'Sight-reading takes 20 seconds of preparation:\n1. The **key signature** and the **time signature**.\n2. The **first note** of each hand: place your hands.\n3. The **rhythm**: any eighths, any dotted notes?\n4. The **path**: going up, down, any leaps?\nThen play **slowly and without stopping**. A wrong note doesn’t matter; stopping does.') },
          { type: 'phrase', range: { lo: 57, hi: 76 }, listen: false, staff: true, hint: 'none', bpm: 84,
            prompt: T('Sans aide cette fois. Regarde d’abord, joue ensuite.', 'No help this time. Look first, then play.'),
            rounds: ['C4q E4q D4q F4q | E4q G4q C5h', 'G4q F4q E4q D4q | E4q C4q D4h', 'E4q E4q F4q D4q | C4q B3q C4h', 'A4q G4q F4q E4q | D4q G4q C4h'] },
          { type: 'piece', title: T('À vue', 'At sight'), bpm: 72, right: SIGHT, left: SIGHT_L, staff: true, range: { lo: 43, hi: 72 }, mode: 'tempo',
            text: T('Un morceau nouveau, directement en rythme. Baisse la vitesse à 75 % s’il le faut, mais ne t’arrête pas.', 'A new piece, straight in time. Drop the speed to 75 % if needed, but don’t stop.') },
        ],
      },
    ],
  },
  // ═══ Unit 11 ══════════════════════════════════════════════════
  {
    id: 'u11',
    title: T('L’oreille', 'Ear training'),
    blurb: T('Aigu ou grave, majeur ou mineur, retrouver ce qu’on entend.', 'High or low, major or minor, finding what you hear.'),
    lessons: [
      {
        id: 'o1',
        title: T('Aigu, grave', 'High, low'),
        goal: T('Entendre si une note monte ou descend.', 'Hear whether a note goes up or down.'),
        steps: [
          { type: 'info', title: T('Écouter sans regarder', 'Listening without looking'),
            text: T('Dans cette unité, Octave joue **sans allumer les touches** : tu n’as que tes oreilles.\nOn commence par le plus simple : une note est-elle plus **aiguë** (vers la droite du clavier) ou plus **grave** (vers la gauche) que la précédente ? Les grands écarts d’abord, puis de plus en plus serrés.\nTu peux réécouter autant que tu veux.',
              'In this unit, Octave plays **without lighting the keys**: you only have your ears.\nWe start with the easiest: is a note **higher** (towards the right of the keyboard) or **lower** (towards the left) than the one before? Wide gaps first, then closer and closer.\nYou can listen again as often as you like.') },
          { type: 'quiz', rounds: () => higherLower(8) },
          { type: 'quiz', rounds: () => upDown(5) },
        ],
      },
      {
        id: 'o2',
        title: T('Majeur ou mineur', 'Major or minor'),
        goal: T('Reconnaître la couleur d’un accord.', 'Recognise the colour of a chord.'),
        steps: [
          { type: 'info', title: T('Clair ou sombre', 'Bright or dark'),
            text: T('Tu as appris à les jouer ; maintenant, à les **entendre**. L’accord majeur sonne **clair, stable**. Le mineur sonne **plus sombre**, plus mélancolique.\nÉcoute-les côte à côte plusieurs fois avant de commencer : c’est une seule note qui change, celle du milieu.',
              'You learnt to play them; now, to **hear** them. A major chord sounds **bright, settled**. A minor one sounds **darker**, more wistful.\nListen to them side by side a few times before you start: only one note changes, the middle one.'),
            listen: 'C4q E4q G4q C4+E4+G4h | C4q Eb4q G4q C4+Eb4+G4h | A3q C#4q E4q A3+C#4+E4h | A3q C4q E4q A3+C4+E4h', bpm: 80 },
          { type: 'quiz', rounds: () => majorMinor(8) },
          { type: 'quiz', rounds: () => majorMinor(6, true) },
        ],
      },
      {
        id: 'o3',
        title: T('Retrouver une note', 'Finding a note'),
        goal: T('Jouer la note entendue, à partir d’un repère.', 'Play the note you heard, from a reference.'),
        steps: [
          { type: 'info', title: T('Partir d’un repère', 'Starting from a landmark'),
            text: T('Octave joue d’abord [C4], ton repère, puis une note mystère entre [C4] et [A4]. Rejoue les deux.\nNe cherche pas au hasard : demande-toi si ça monte peu ou beaucoup. Chante la note à voix basse, puis cherche-la. Après une erreur, la bonne touche s’allume.',
              'Octave first plays [C4], your landmark, then a mystery note between [C4] and [A4]. Play both back.\nDon’t search at random: ask yourself whether it goes up a little or a lot. Hum the note, then look for it. After a mistake, the right key lights up.') },
          { type: 'phrase', range: POS_C, listen: true, blind: true, hint: 'miss', bpm: 80,
            prompt: T('Écoute, puis rejoue le repère et la note mystère.', 'Listen, then play the landmark and the mystery note.'),
            rounds: () => findNote(6) },
        ],
      },
      {
        id: 'o4',
        title: T('Rejouer une mélodie', 'Playing a tune back'),
        goal: T('Retenir et rejouer quelques notes entendues.', 'Remember and play back a few notes you heard.'),
        steps: [
          { type: 'info', title: T('Par petits bouts', 'Bit by bit'),
            text: T('Octave joue une courte mélodie en position de [C], qui commence toujours sur [C4]. Rejoue-la.\nAstuce : retiens le **chemin** plutôt que les notes. « Ça monte, ça monte, ça redescend » : c’est plus facile à garder en tête.',
              'Octave plays a short tune in the C position, always starting on [C4]. Play it back.\nTip: remember the **path** rather than the notes. “Up, up, back down” is easier to keep in mind.') },
          { type: 'phrase', range: POS_C, listen: true, blind: true, hint: 'miss', bpm: 90,
            prompt: T('Trois notes.', 'Three notes.'), rounds: () => tunes(4, 3) },
          { type: 'phrase', range: POS_C, listen: true, blind: true, hint: 'miss', bpm: 90,
            prompt: T('Cinq notes.', 'Five notes.'), rounds: () => tunes(4, 5) },
        ],
      },
      {
        id: 'o5',
        title: T('Les intervalles à l’oreille', 'Intervals by ear'),
        goal: T('Reconnaître seconde, tierce, quinte et octave.', 'Recognise a second, a third, a fifth and an octave.'),
        steps: [
          { type: 'info', title: T('Des chansons comme repères', 'Songs as landmarks'),
            text: T('Pour reconnaître un intervalle, accroche-le à un début de chanson que tu connais :\n**Seconde** : « Frè-re » de *Frère Jacques* ([C] [D]).\n**Tierce** : le bas d’un accord majeur ([C] [E]).\n**Quinte** : « Ah ! vous di- » de *Ah ! vous dirai-je, maman* ([C] [G]).\n**Octave** : la même note, mais bien plus haut.',
              'To recognise an interval, hook it to the start of a song you know:\n**Second**: “Frè-re” in *Frère Jacques* ([C] [D]).\n**Third**: the bottom of a major chord ([C] [E]).\n**Fifth**: “Twin-kle twin-kle” ([C] [G]).\n**Octave**: the same note, much higher.'),
            listen: 'C4h D4h | C4h E4h | C4q C4q G4q G4q | C4h C5h', bpm: 90 },
          { type: 'quiz', rounds: () => intervals(8) },
        ],
      },
    ],
  },

  // ═══ Unit 12 ══════════════════════════════════════════════════
  {
    id: 'u12',
    title: T('Improviser', 'Improvising'),
    blurb: T('Jouer ses propres notes sur un accompagnement : gammes, phrases, accords, blues.', 'Play your own notes over a backing: scales, phrases, chords, blues.'),
    lessons: [
      {
        id: 'j1',
        title: T('Les touches noires', 'The black keys'),
        goal: T('Improviser sans aucune fausse note possible.', 'Improvise with no wrong note possible.'),
        steps: [
          { type: 'info', title: T('Inventer, pas réciter', 'Making it up, not reciting'),
            text: T('**Improviser**, c’est inventer la musique en la jouant. Pas besoin de génie : il suffit de **choisir peu de notes** qui sonnent bien ensemble, et de jouer avec.\nLe meilleur point de départ : les **5 touches noires**. Elles forment une **gamme pentatonique** (« penta » = cinq) : elles s’accordent toutes entre elles, dans n’importe quel ordre. Impossible de faire une fausse note !',
              '**Improvising** means making the music up as you play. No genius needed: just **pick a few notes** that sound good together, and play with them.\nThe best place to start: the **5 black keys**. They make a **pentatonic scale** (“penta” = five): they all fit together, in any order. You can’t play a wrong note!'),
            keys: { ...JAM_R, pcs: BLACK } },
          { type: 'quiz', rounds: [
            { q: T('Une gamme pentatonique a…', 'A pentatonic scale has…'), options: [T('5 notes', '5 notes'), T('7 notes', '7 notes'), T('12 notes', '12 notes')], answer: 0 },
            { q: T('En improvisation, une « fausse note »…', 'When improvising, a “wrong note”…'), options: [T('n’existe pas vraiment : c’est une note de passage, on continue', 'doesn’t really exist: it is a passing note, carry on'), T('oblige à tout recommencer', 'means starting over')], answer: 0,
              explain: T('Une note qui frotte, suivie d’une note de la gamme, sonne voulue. Ne t’arrête jamais.', 'A note that clashes, followed by a scale note, sounds intended. Never stop.') },
          ] },
          { type: 'jam', range: JAM_R, bpm: 84, loops: 4, backing: [PENTA_BASS, PENTA_COMP], chords: 'Gb Ebm', scale: BLACK,
            prompt: T('Huit mesures sur les touches noires (allumées). Monte, descends, répète une note : tout marche.', 'Eight bars on the black keys (lit). Go up, go down, repeat a note: it all works.'),
            example: 'Gb4q Ab4q Bb4h | Db5q Bb4q Ab4h | Bb4q Db5q Eb5q Db5q | Bb4w | Gb4q Ab4q Bb4q Db5q | Eb5h Db5h | Bb4q Ab4q Gb4q Eb4q | Gb4w',
            goals: [
              { kind: 'notes', n: 16, text: T('Joue au moins 16 notes.', 'Play at least 16 notes.') },
              { kind: 'scale', x: 0.9, text: T('Reste sur les touches noires.', 'Stay on the black keys.') },
              { kind: 'variety', n: 4, text: T('Utilise au moins 4 des 5 notes.', 'Use at least 4 of the 5 notes.') },
            ] },
        ],
      },
      {
        id: 'j2',
        title: T('Question, réponse', 'Call and response'),
        goal: T('Répondre à une phrase par une phrase à soi.', 'Answer a phrase with one of your own.'),
        steps: [
          { type: 'info', title: T('Une conversation', 'A conversation'),
            text: T('La musique se parle comme une langue : une phrase **pose une question**, une autre **répond**.\nOctave joue une mesure, tu réponds dans la suivante, et ainsi de suite. Tu n’as pas à l’imiter : invente ta réponse, mais garde **le même caractère** (même longueur, même énergie).\nCinq notes en position de [C] : [C] [D] [E] [G] [A], la **pentatonique de [C]**. Sans [F] ni [B], rien ne frotte.',
              'Music speaks like a language: one phrase **asks a question**, another **answers**.\nOctave plays a bar, you answer in the next one, and so on. You don’t have to copy it: make your answer up, but keep **the same character** (same length, same energy).\nFive notes in C position: [C] [D] [E] [G] [A], the **C pentatonic**. Without [F] and [B], nothing clashes.'),
            keys: { lo: 55, hi: 74, pcs: PENTA_C } },
          { type: 'jam', range: { lo: 55, hi: 76 }, bpm: 80, loops: 2, backing: [POP_BASS, POP_COMP], chords: 'C Am F G', scale: PENTA_C,
            prompt: T('Octave pose la question, tu réponds dans la mesure d’après. Écoute l’exemple d’abord.', 'Octave asks, you answer in the next bar. Hear the example first.'),
            call: 'C4q D4q E4h | rw | E4q G4q A4h | rw | A4q G4q E4q D4q | rw | C4q D4q E4q G4q | rw',
            example: 'C4q D4q E4h | E4q D4q C4h | E4q G4q A4h | G4q E4q D4h | A4q G4q E4q D4q | E4q C4q A3h | C4q D4q E4q G4q | E4q D4q C4h',
            goals: [
              { kind: 'answer', text: T('Réponds à chaque question, et laisse parler Octave.', 'Answer each question, and let Octave speak.') },
              { kind: 'scale', x: 0.85, text: T('Reste dans la pentatonique de [C].', 'Stay in the C pentatonic.') },
              { kind: 'notes', n: 8, text: T('Au moins 8 notes en tout.', 'At least 8 notes in all.') },
            ] },
        ],
      },
      {
        id: 'j3',
        title: T('Respirer', 'Breathing'),
        goal: T('Faire des phrases, avec des silences entre elles.', 'Make phrases, with silences between them.'),
        steps: [
          { type: 'info', title: T('Le silence fait partie de la musique', 'Silence is part of the music'),
            text: T('Le piège du débutant : jouer **sans arrêt**. Ça devient vite un mur de notes.\nPense comme un chanteur : il doit **respirer**. Joue une phrase de deux mesures environ, puis **laisse un trou** d’au moins deux temps. L’accompagnement continue : il remplit le silence pour toi.\nTu as maintenant les 7 notes blanches. [F] et [B] frottent un peu sur certains accords : passe dessus, ne t’y arrête pas.',
              'The beginner’s trap: playing **non-stop**. It soon turns into a wall of notes.\nThink like a singer: they have to **breathe**. Play a phrase of about two bars, then **leave a gap** of at least two beats. The backing goes on: it fills the silence for you.\nYou now have all 7 white keys. [F] and [B] clash a little on some chords: move through them, don’t stop on them.'),
            line: { src: 'E4q G4q A4q G4q | E4h rh | D4q E4q G4q A4q | G4h rh' }, listen: 'E4q G4q A4q G4q | E4h rh | D4q E4q G4q A4q | G4h rh', bpm: 84 },
          { type: 'jam', range: JAM_R, bpm: 84, loops: 2, backing: [POP_BASS, POP_COMP], chords: 'C Am F G', scale: NATURALS,
            prompt: T('Des phrases courtes, et entre elles, rien. Compte les temps de silence.', 'Short phrases, and nothing in between. Count the beats of silence.'),
            example: 'E4q G4q A4q G4q | E4h rh | D4q E4q G4q A4q | G4h rh | C5q A4q G4q E4q | D4h rh | E4q D4q C4q D4q | C4w',
            goals: [
              { kind: 'rests', n: 3, text: T('Au moins 3 silences d’un temps et demi ou plus.', 'At least 3 silences of a beat and a half or more.') },
              { kind: 'notes', n: 12, text: T('Au moins 12 notes quand même.', 'Still at least 12 notes.') },
              { kind: 'scale', x: 0.85, text: T('Touches blanches seulement.', 'White keys only.') },
            ] },
        ],
      },
      {
        id: 'j4',
        title: T('Atterrir sur l’accord', 'Landing on the chord'),
        goal: T('Viser les notes de l’accord sur le premier temps.', 'Aim for the chord’s notes on beat one.'),
        steps: [
          { type: 'info', title: T('Les notes fortes', 'The strong notes'),
            text: T('Toutes les notes de la gamme ne se valent pas : à chaque instant, les **3 notes de l’accord** sonnent le plus stable. Les autres sont des **notes de passage**, qui mènent vers elles.\nLe truc : sur le **temps 1** de chaque mesure, quand l’accord change, pose une note de l’accord. Entre deux, promène-toi.\nIci, les notes de l’accord en cours s’allument fort, les autres de la gamme en léger. Et pour finir, reviens à la maison : [C].',
              'Not every note of the scale is equal: at any moment, the **3 notes of the chord** sound the most settled. The others are **passing notes**, leading to them.\nThe trick: on **beat 1** of each bar, when the chord changes, land on a chord note. In between, wander.\nHere, the current chord’s notes light up strongly, the rest of the scale softly. And to finish, come home: [C].'),
            listen: 'C2+E4q D4q C4q D4q | F1+F4q E4q D4q C4q | G1+D4q E4q F4q A4q | C2+G4w', bpm: 76 },
          { type: 'jam', range: JAM_R, bpm: 76, loops: 2, backing: [CADENCE_BASS, CADENCE_COMP], chords: 'C F G C', scale: NATURALS, showChord: true,
            prompt: T('Sur chaque temps 1, une touche bien allumée. Finis sur un [C].', 'On every beat 1, a brightly lit key. End on a [C].'),
            example: 'E4q D4q C4q D4q | F4q E4q D4q C4q | D4q E4q F4q A4q | G4w | C5q B4q A4q G4q | A4q G4q F4q E4q | D4q F4q E4q D4q | C4w',
            goals: [
              { kind: 'downbeat', x: 0.7, text: T('Sur le temps 1, une note de l’accord (7 fois sur 10).', 'On beat 1, a chord note (7 times out of 10).') },
              { kind: 'end', pcs: [0], text: T('Termine sur [C].', 'End on [C].') },
              { kind: 'notes', n: 10, text: T('Au moins 10 notes.', 'At least 10 notes.') },
            ] },
        ],
      },
      {
        id: 'j5',
        title: T('Un motif et ses variations', 'A motif and its variations'),
        goal: T('Garder un rythme, changer les notes.', 'Keep a rhythm, change the notes.'),
        steps: [
          { type: 'info', title: T('Se répéter, c’est bien', 'Repeating yourself is good'),
            text: T('Ce qui rend une improvisation **mémorable**, c’est la répétition. Choisis un petit **motif rythmique**, par exemple « long, court, noire, noire », et garde-le plusieurs mesures en changeant seulement les notes pour suivre les accords.\nL’oreille reconnaît le motif et suit l’histoire. Change-le à la fin, pour conclure.',
              'What makes an improvisation **memorable** is repetition. Pick a small **rhythmic motif**, say “long, short, quarter, quarter”, and keep it for several bars, changing only the notes to follow the chords.\nThe ear recognises the motif and follows the story. Change it at the end, to wrap up.'),
            line: { src: 'q. e q q | q. e q q', rhythm: true } },
          { type: 'rhythm', bpm: 88, prompt: T('Le motif seul, sur une touche, pour l’avoir dans les doigts.', 'The motif alone, on one key, to get it into your fingers.'), rounds: ['q. e q q | q. e q q'] },
          { type: 'jam', range: { lo: 53, hi: 79 }, bpm: 88, loops: 2, backing: [AXIS_BASS, AXIS_COMP], chords: 'C G Am F', scale: NATURALS, showChord: true,
            prompt: T('Le même rythme dans au moins 3 mesures. Les notes, elles, suivent les accords.', 'The same rhythm in at least 3 bars. The notes follow the chords.'),
            example: 'E4q. D4e C4q D4q | D4q. E4e D4q B3q | C4q. D4e E4q A4q | A4q. G4e F4q C4q | E4q. F4e G4q E4q | D4q. E4e F4q D4q | C4q. B3e A3q C4q | A3q. B3e C4h',
            goals: [
              { kind: 'motif', n: 3, text: T('Au moins 3 mesures avec le même rythme.', 'At least 3 bars with the same rhythm.') },
              { kind: 'notes', n: 12, text: T('Au moins 12 notes.', 'At least 12 notes.') },
              { kind: 'scale', x: 0.85, text: T('Touches blanches seulement.', 'White keys only.') },
            ] },
        ],
      },
      {
        id: 'j6',
        title: T('Le blues', 'The blues'),
        goal: T('Improviser sur une grille de blues de 12 mesures.', 'Improvise over a 12-bar blues.'),
        steps: [
          { type: 'info', title: T('Douze mesures, trois accords', 'Twelve bars, three chords'),
            text: T('Le **blues** tient sur une grille de **12 mesures** et 3 accords : 4 mesures de [C], 2 de [F], 2 de [C], puis [G], [F], [C], [G]… et on recommence.\nSa gamme, la **gamme blues** : [C] [Eb] [F] [Gb] [G] [Bb]. La note qui fait tout, c’est [Gb], la **blue note** : glisse dessus vers [G] ou [F], ne t’y arrête pas.\nÉcoute la gamme, puis la grille.',
              'The **blues** fits in a **12-bar** chart with 3 chords: 4 bars of C, 2 of F, 2 of C, then G, F, C, G… and round again.\nIts scale, the **blues scale**: [C] [Eb] [F] [Gb] [G] [Bb]. The note that does it all is [Gb], the **blue note**: slide through it to [G] or [F], don’t stop on it.\nListen to the scale, then the chart.'),
            line: { src: 'C4q Eb4q F4q Gb4q | G4q Bb4q C5h' }, listen: 'C4q Eb4q F4q Gb4q | G4q Bb4q C5h | C5q Bb4q G4q Gb4q | F4q Eb4q C4h', bpm: 90, keys: { ...JAM_R, pcs: BLUES_C } },
          { type: 'quiz', rounds: [
            { q: T('Une grille de blues compte…', 'A blues chart has…'), options: [T('8 mesures', '8 bars'), T('12 mesures', '12 bars'), T('16 mesures', '16 bars')], answer: 1 },
            { q: T('La « blue note » de la gamme blues de [C], c’est…', 'The “blue note” of the C blues scale is…'), options: ['[Eb]', '[Gb]', '[Bb]'], answer: 1 },
          ] },
          { type: 'jam', range: JAM_R, bpm: 96, loops: 1, backing: [BLUES_BASS, BLUES_COMP], chords: BLUES.join(' '), scale: BLUES_C,
            prompt: T('Un tour de blues. Des petites phrases, la blue note de temps en temps, et la fin sur [C].', 'One time round the blues. Short phrases, the blue note now and then, and end on [C].'),
            example: 'C4q Eb4q F4q Gb4q | G4h Eb4q C4q | C4q Eb4q F4q Gb4q | G4w | F4q Gb4q F4q Eb4q | C4h rh | C4q Eb4q F4q Gb4q | G4h rh | Bb4q G4q Gb4q F4q | Eb4q F4q Eb4q C4q | C4h rh | G3q Bb3q C4h',
            goals: [
              { kind: 'scale', x: 0.85, text: T('Reste dans la gamme blues.', 'Stay in the blues scale.') },
              { kind: 'use', pcs: [6], n: 2, text: T('Fais entendre la blue note [Gb] au moins 2 fois.', 'Play the blue note [Gb] at least twice.') },
              { kind: 'end', pcs: [0], text: T('Termine sur [C].', 'End on [C].') },
            ] },
        ],
      },
      {
        id: 'j7',
        title: T('Bilan : à deux mains', 'Check-point: both hands'),
        goal: T('La basse à gauche, l’improvisation à droite.', 'The bass on the left, improvising on the right.'),
        steps: [
          { type: 'info', title: T('Ton propre accompagnement', 'Your own backing'),
            text: T('Cette fois, l’accompagnement n’a plus de basse : c’est **ta main gauche** qui la joue. Sur le **temps 1** de chaque mesure, la fondamentale de l’accord, tenue : [C3], [A2], [F2], [G2].\nLa main droite improvise par-dessus, sur les touches blanches, avec tout ce que tu as appris : des phrases, des silences, des notes de l’accord sur le 1.\nTravaille d’abord la main gauche seule un tour, sans rien à droite.',
              'This time the backing has no bass: **your left hand** plays it. On **beat 1** of each bar, the chord’s root, held: [C3], [A2], [F2], [G2].\nThe right hand improvises on top, on the white keys, with everything you have learnt: phrases, silences, chord notes on the 1.\nFirst practise the left hand alone for one round, nothing on the right.'),
            keys: { lo: 43, hi: 76, midis: [48, 45, 41, 43] }, listen: 'C3w | A2w | F2w | G2w', bpm: 84 },
          { type: 'jam', range: { lo: 41, hi: 76 }, bpm: 80, loops: 2, backing: [POP_COMP], backVel: 50, chords: 'C Am F G', scale: NATURALS, showChord: true,
            prompt: T('Main gauche : la basse sur chaque 1. Main droite : à toi.', 'Left hand: the bass on every 1. Right hand: over to you.'),
            example: 'C3+E4q G4q A4q G4q | A2+E4h C4h | F2+F4q A4q G4q F4q | G2+D4w | C3+G4q E4q D4q C4q | A2+E4h A4h | F2+A4q G4q F4q E4q | G2+D4w',
            goals: [
              { kind: 'bass', x: 0.75, text: T('La bonne basse sur le temps 1 (6 mesures sur 8).', 'The right bass note on beat 1 (6 bars out of 8).') },
              { kind: 'notes', n: 10, above: 60, text: T('Au moins 10 notes à droite (au-dessus de [C4]).', 'At least 10 notes on the right (from [C4] up).') },
              { kind: 'scale', x: 0.85, above: 60, text: T('À droite, touches blanches seulement.', 'On the right, white keys only.') },
            ] },
        ],
      },
    ],
  },
];
