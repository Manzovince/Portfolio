// Exercise catalogue, muscle groups and measurement modes.

export const MUSCLES = {
  pecs: 'Pectoraux', dos: 'Dos', trapezes: 'Trapèzes', lombaires: 'Lombaires',
  epaules: 'Épaules', biceps: 'Biceps', triceps: 'Triceps', avantbras: 'Avant-bras',
  abdos: 'Abdos', obliques: 'Obliques', fessiers: 'Fessiers', quadriceps: 'Quadriceps',
  ischios: 'Ischios', mollets: 'Mollets', adducteurs: 'Adducteurs',
};

// Regions drive the balance analysis (push/pull, upper/lower…).
export const REGIONS = {
  poussee: ['pecs', 'epaules', 'triceps'],
  tirage: ['dos', 'trapezes', 'biceps'],
  jambes: ['quadriceps', 'ischios', 'fessiers', 'mollets', 'adducteurs'],
  tronc: ['abdos', 'obliques', 'lombaires'],
};

export const CATS = {
  charges: 'Charges', pdc: 'Poids du corps', course: 'Course', cardio: 'Cardio', mobilite: 'Mobilité',
};

export const EQUIP = {
  barre: 'Barre', halteres: 'Haltères', machine: 'Machine', poulie: 'Poulie', kettlebell: 'Kettlebell',
  traction: 'Barre de traction', elastique: 'Élastique', aucun: 'Aucun', velo: 'Vélo', rameur: 'Rameur', rouleau: 'Rouleau de massage',
};

// Fields recorded per set for each mode. `opt` fields can stay empty.
export const MODES = {
  wr: { label: 'Charge × reps', fields: ['kg', 'reps'] },
  bw: { label: 'Reps (+ lest)', fields: ['reps', 'kg'], opt: ['kg'] },
  time: { label: 'Durée (+ lest)', fields: ['sec', 'kg'], opt: ['kg'] },
  run: { label: 'Distance / temps', fields: ['dist', 'sec'], opt: ['dist', 'sec'] },
};

const E = (id, name, cat, equip, mode, muscles, secondary = [], rest) => ({ id, name, cat, equip, mode, muscles, secondary, rest });

export const LIBRARY = [
  // Charges
  E('bench', 'Développé couché (barre)', 'charges', 'barre', 'wr', ['pecs'], ['triceps', 'epaules'], 150),
  E('bench-db', 'Développé couché haltères', 'charges', 'halteres', 'wr', ['pecs'], ['triceps', 'epaules'], 120),
  E('incline-db', 'Développé incliné haltères', 'charges', 'halteres', 'wr', ['pecs', 'epaules'], ['triceps'], 120),
  E('ohp', 'Développé militaire (barre)', 'charges', 'barre', 'wr', ['epaules'], ['triceps', 'trapezes'], 150),
  E('db-press', 'Développé épaules haltères', 'charges', 'halteres', 'wr', ['epaules'], ['triceps'], 120),
  E('lat-raise', 'Élévations latérales', 'charges', 'halteres', 'wr', ['epaules'], [], 60),
  E('squat', 'Squat (barre)', 'charges', 'barre', 'wr', ['quadriceps', 'fessiers'], ['lombaires', 'adducteurs'], 180),
  E('front-squat', 'Squat avant', 'charges', 'barre', 'wr', ['quadriceps'], ['fessiers', 'abdos'], 180),
  E('goblet', 'Goblet squat', 'charges', 'kettlebell', 'wr', ['quadriceps'], ['fessiers', 'abdos'], 90),
  E('deadlift', 'Soulevé de terre', 'charges', 'barre', 'wr', ['ischios', 'fessiers', 'lombaires'], ['dos', 'trapezes', 'avantbras'], 180),
  E('rdl', 'Soulevé de terre roumain', 'charges', 'barre', 'wr', ['ischios'], ['fessiers', 'lombaires'], 120),
  E('hip-thrust', 'Hip thrust', 'charges', 'barre', 'wr', ['fessiers'], ['ischios'], 120),
  E('lunge-db', 'Fentes haltères', 'charges', 'halteres', 'wr', ['quadriceps', 'fessiers'], ['adducteurs'], 90),
  E('bulgarian', 'Squat bulgare', 'charges', 'halteres', 'wr', ['quadriceps', 'fessiers'], ['adducteurs'], 90),
  E('leg-press', 'Presse à cuisses', 'charges', 'machine', 'wr', ['quadriceps'], ['fessiers'], 120),
  E('leg-curl', 'Leg curl', 'charges', 'machine', 'wr', ['ischios'], [], 90),
  E('leg-ext', 'Leg extension', 'charges', 'machine', 'wr', ['quadriceps'], [], 90),
  E('calf-raise', 'Mollets debout', 'charges', 'machine', 'wr', ['mollets'], [], 60),
  E('row-bb', 'Rowing barre', 'charges', 'barre', 'wr', ['dos'], ['biceps', 'trapezes', 'lombaires'], 120),
  E('row-db', 'Rowing haltère unilatéral', 'charges', 'halteres', 'wr', ['dos'], ['biceps'], 90),
  E('lat-pulldown', 'Tirage vertical', 'charges', 'poulie', 'wr', ['dos'], ['biceps'], 90),
  E('cable-row', 'Tirage horizontal', 'charges', 'poulie', 'wr', ['dos'], ['biceps', 'trapezes'], 90),
  E('face-pull', 'Face pull', 'charges', 'poulie', 'wr', ['epaules', 'trapezes'], [], 60),
  E('curl-bb', 'Curl barre', 'charges', 'barre', 'wr', ['biceps'], ['avantbras'], 75),
  E('curl-db', 'Curl haltères', 'charges', 'halteres', 'wr', ['biceps'], ['avantbras'], 75),
  E('hammer', 'Curl marteau', 'charges', 'halteres', 'wr', ['biceps', 'avantbras'], [], 75),
  E('pushdown', 'Extension triceps poulie', 'charges', 'poulie', 'wr', ['triceps'], [], 75),
  E('skull', 'Barre au front', 'charges', 'barre', 'wr', ['triceps'], [], 90),
  E('shrug', 'Haussements d’épaules', 'charges', 'halteres', 'wr', ['trapezes'], ['avantbras'], 75),
  E('kb-swing', 'Kettlebell swing', 'charges', 'kettlebell', 'wr', ['fessiers', 'ischios'], ['lombaires'], 90),
  E('farmer', 'Marche du fermier', 'charges', 'halteres', 'time', ['avantbras', 'trapezes'], ['abdos'], 90),
  // Poids du corps
  E('pushup', 'Pompes', 'pdc', 'aucun', 'bw', ['pecs'], ['triceps', 'epaules', 'abdos'], 90),
  E('pushup-diamond', 'Pompes diamant', 'pdc', 'aucun', 'bw', ['triceps'], ['pecs'], 90),
  E('pike', 'Pompes piquées', 'pdc', 'aucun', 'bw', ['epaules'], ['triceps'], 90),
  E('hspu', 'Pompes en équilibre', 'pdc', 'aucun', 'bw', ['epaules'], ['triceps', 'trapezes'], 120),
  E('dips', 'Dips', 'pdc', 'aucun', 'bw', ['pecs', 'triceps'], ['epaules'], 120),
  E('pullup', 'Tractions pronation', 'pdc', 'traction', 'bw', ['dos'], ['biceps', 'avantbras'], 120),
  E('chinup', 'Tractions supination', 'pdc', 'traction', 'bw', ['dos', 'biceps'], ['avantbras'], 120),
  E('inv-row', 'Rowing inversé', 'pdc', 'aucun', 'bw', ['dos'], ['biceps', 'trapezes'], 90),
  E('bw-squat', 'Squat poids du corps', 'pdc', 'aucun', 'bw', ['quadriceps'], ['fessiers'], 60),
  E('jump-squat', 'Squats sautés', 'pdc', 'aucun', 'bw', ['quadriceps'], ['fessiers', 'mollets'], 75),
  E('pistol', 'Pistol squat', 'pdc', 'aucun', 'bw', ['quadriceps', 'fessiers'], ['abdos'], 90),
  E('lunge', 'Fentes', 'pdc', 'aucun', 'bw', ['quadriceps', 'fessiers'], ['adducteurs'], 60),
  E('glute-bridge', 'Pont fessier', 'pdc', 'aucun', 'bw', ['fessiers'], ['ischios'], 60),
  E('nordic', 'Nordic curl', 'pdc', 'aucun', 'bw', ['ischios'], [], 120),
  E('calf-bw', 'Mollets unilatéral', 'pdc', 'aucun', 'bw', ['mollets'], [], 45),
  E('crunch', 'Crunch', 'pdc', 'aucun', 'bw', ['abdos'], [], 45),
  E('leg-raise', 'Relevés de jambes suspendu', 'pdc', 'traction', 'bw', ['abdos'], ['obliques', 'avantbras'], 75),
  E('russian-twist', 'Russian twist', 'pdc', 'aucun', 'bw', ['obliques'], ['abdos'], 45),
  E('superman', 'Superman', 'pdc', 'aucun', 'bw', ['lombaires'], ['fessiers'], 45),
  E('burpee', 'Burpees', 'pdc', 'aucun', 'bw', ['quadriceps', 'pecs'], ['epaules', 'abdos'], 60),
  E('plank', 'Gainage planche', 'pdc', 'aucun', 'time', ['abdos'], ['lombaires', 'epaules'], 45),
  { ...E('side-plank', 'Gainage latéral', 'pdc', 'aucun', 'time', ['obliques'], ['abdos'], 30), side: true },
  E('hollow', 'Hollow hold', 'pdc', 'aucun', 'time', ['abdos'], [], 45),
  E('mountain', 'Mountain climbers', 'pdc', 'aucun', 'time', ['abdos'], ['epaules', 'quadriceps'], 45),
  E('wall-sit', 'Chaise murale', 'pdc', 'aucun', 'time', ['quadriceps'], ['fessiers'], 60),
  E('dead-hang', 'Suspension à la barre', 'pdc', 'traction', 'time', ['avantbras'], ['dos'], 60),
  E('l-sit', 'L-sit', 'pdc', 'aucun', 'time', ['abdos'], ['triceps'], 60),
  // Progression variants (dips bars, 12 kg dumbbells, pull-up bar). `side`: reps/time are per leg or side.
  E('dips-tempo', 'Dips descente lente (3 s)', 'pdc', 'aucun', 'bw', ['pecs', 'triceps'], ['epaules'], 90),
  E('pushup-decline', 'Pompes pieds surélevés', 'pdc', 'aucun', 'bw', ['pecs', 'epaules'], ['triceps', 'abdos'], 90),
  E('pushup-archer', 'Pompes archer', 'pdc', 'aucun', 'bw', ['pecs'], ['triceps', 'epaules', 'abdos'], 90),
  E('pushup-bars', 'Pompes aux barres de dips (amplitude)', 'pdc', 'aucun', 'bw', ['pecs'], ['triceps', 'epaules'], 90),
  { ...E('pistol-cw', 'Pistol squat avec contrepoids', 'charges', 'halteres', 'wr', ['quadriceps', 'fessiers'], ['abdos'], 90), side: true },
  { ...E('bulgarian-db', 'Split squat bulgare haltères', 'charges', 'halteres', 'wr', ['quadriceps', 'fessiers'], ['adducteurs'], 90), side: true },
  { ...E('reverse-lunge', 'Fente arrière haltères', 'charges', 'halteres', 'wr', ['quadriceps', 'fessiers'], ['ischios', 'adducteurs'], 60), side: true },
  { ...E('jump-lunge', 'Fentes sautées alternées', 'pdc', 'aucun', 'bw', ['quadriceps', 'fessiers'], ['mollets'], 60), side: true },
  { ...E('step-calf', 'Mollets sur marche (1 pied)', 'pdc', 'aucun', 'bw', ['mollets'], [], 60), side: true },
  E('pullup-tempo', 'Tractions descente lente (4 s)', 'pdc', 'traction', 'bw', ['dos'], ['biceps', 'avantbras'], 90),
  E('row-db-pause', 'Rowing haltère pause 2 s', 'charges', 'halteres', 'wr', ['dos'], ['biceps', 'trapezes'], 90),
  { ...E('sl-rdl', 'Soulevé de terre roumain 1 jambe', 'charges', 'halteres', 'wr', ['ischios', 'fessiers'], ['lombaires'], 90), side: true },
  { ...E('sl-hip-thrust', 'Hip thrust 1 jambe', 'pdc', 'aucun', 'bw', ['fessiers'], ['ischios'], 60), side: true },
  E('pullover-db', 'Pullover haltère', 'charges', 'halteres', 'wr', ['dos', 'pecs'], ['triceps'], 60),
  E('ytw', 'Y-T-W', 'pdc', 'aucun', 'bw', ['epaules', 'trapezes'], [], 60),
  E('dip-knee-raise', 'Relevés de genoux aux barres de dips', 'pdc', 'aucun', 'bw', ['abdos'], ['obliques'], 60),
  E('dip-leg-raise', 'Relevés jambes tendues aux barres', 'pdc', 'aucun', 'bw', ['abdos'], ['obliques'], 60),
  { ...E('copenhagen', 'Gainage Copenhague', 'pdc', 'aucun', 'time', ['adducteurs', 'obliques'], ['abdos'], 60), side: true },
  E('hollow-rocks', 'Hollow rocks', 'pdc', 'aucun', 'bw', ['abdos'], [], 60),
  { ...E('suitcase', 'Suitcase carry (1 côté)', 'charges', 'halteres', 'time', ['obliques', 'avantbras'], ['trapezes'], 60), side: true },
  // Course & cardio
  E('run-easy', 'Footing', 'course', 'aucun', 'run', [], [], 60),
  E('run-interval', 'Fractionné', 'course', 'aucun', 'run', [], [], 90),
  E('run-tempo', 'Allure seuil (tempo)', 'course', 'aucun', 'run', [], [], 120),
  E('run-long', 'Sortie longue', 'course', 'aucun', 'run', [], [], 0),
  E('run-hill', 'Côtes', 'course', 'aucun', 'run', [], ['mollets', 'fessiers'], 90),
  E('run-trail', 'Trail', 'course', 'aucun', 'run', [], [], 0),
  E('bike', 'Vélo', 'cardio', 'velo', 'run', [], [], 0),
  E('rower', 'Rameur', 'cardio', 'rameur', 'run', [], ['dos'], 60),
  E('jump-rope', 'Corde à sauter', 'cardio', 'aucun', 'time', ['mollets'], [], 45),
  E('stretch', 'Mobilité / étirements', 'mobilite', 'aucun', 'time', [], [], 15),
  // Mobilité, étirements, souplesse. `side`: timed per side, the chrono runs left then right.
  M('cat-cow', 'Chat-vache', 'time', ['lombaires', 'dos']),
  M('child-pose', 'Posture de l’enfant', 'time', ['dos', 'lombaires']),
  M('dog-down', 'Chien tête en bas', 'time', ['ischios', 'mollets', 'epaules']),
  M('cobra', 'Cobra', 'time', ['abdos', 'lombaires']),
  M('worlds-greatest', 'World’s greatest stretch', 'time', ['quadriceps', 'fessiers', 'dos'], { side: true }),
  M('hip-flexor', 'Fente basse (fléchisseurs de hanche)', 'time', ['quadriceps'], { side: true }),
  M('couch', 'Couch stretch', 'time', ['quadriceps'], { side: true }),
  M('pigeon', 'Pigeon', 'time', ['fessiers'], { side: true }),
  M('hip-9090', 'Rotations de hanche 90/90', 'bw', ['fessiers', 'adducteurs']),
  M('butterfly', 'Papillon', 'time', ['adducteurs']),
  M('frog', 'Grenouille', 'time', ['adducteurs']),
  M('happy-baby', 'Happy baby', 'time', ['fessiers', 'adducteurs']),
  M('hamstring-stretch', 'Étirement ischios (jambe tendue)', 'time', ['ischios'], { side: true }),
  M('forward-fold', 'Flexion avant debout', 'time', ['ischios', 'lombaires']),
  M('pancake', 'Pancake (écart, buste en avant)', 'time', ['ischios', 'adducteurs']),
  M('front-split', 'Grand écart facial', 'time', ['ischios', 'quadriceps'], { side: true }),
  M('side-split', 'Grand écart latéral', 'time', ['adducteurs']),
  M('deep-squat', 'Squat profond tenu', 'time', ['quadriceps', 'adducteurs', 'mollets']),
  M('quad-stretch', 'Étirement quadriceps debout', 'time', ['quadriceps'], { side: true }),
  M('calf-stretch', 'Étirement mollets au mur', 'time', ['mollets'], { side: true }),
  M('ankle-knee-wall', 'Mobilité cheville genou-mur', 'bw', ['mollets'], { side: true }),
  M('spinal-twist', 'Torsion allongée', 'time', ['lombaires', 'obliques'], { side: true }),
  M('thoracic-rot', 'Rotations thoraciques', 'bw', ['dos'], { side: true }),
  M('thread-needle', 'Thread the needle', 'time', ['dos', 'epaules'], { side: true }),
  M('doorway-pec', 'Étirement pectoraux (cadre de porte)', 'time', ['pecs', 'epaules'], { side: true }),
  M('shoulder-cross', 'Étirement épaule bras croisé', 'time', ['epaules'], { side: true }),
  M('triceps-stretch', 'Étirement triceps', 'time', ['triceps'], { side: true }),
  M('band-dislocate', 'Dislocations à l’élastique', 'bw', ['epaules'], { equip: 'elastique' }),
  M('wall-slides', 'Wall slides', 'bw', ['epaules', 'trapezes']),
  M('bridge-pose', 'Pont (ouverture d’épaules)', 'time', ['pecs', 'epaules', 'abdos']),
  M('neck-mob', 'Mobilité cervicale', 'time', ['trapezes']),
  M('wrist-mob', 'Mobilité poignets', 'time', ['avantbras']),
  M('leg-swings', 'Balancés de jambe', 'bw', ['ischios', 'adducteurs'], { side: true }),
  M('hip-circles', 'Cercles de hanches', 'bw', ['fessiers']),
  M('foam-roll', 'Auto-massage au rouleau', 'time', [], { equip: 'rouleau', rest: 10 }),
  M('breathing', 'Respiration diaphragmatique', 'time', ['abdos']),
  M('balance', 'Équilibre sur 1 pied', 'time', ['mollets'], { side: true }),
  M('thoracic-roll', 'Ouverture thoracique sur rouleau', 'time', ['dos', 'pecs'], { equip: 'rouleau' }),
  M('rib-stretch', 'Étirement latéral des côtes', 'time', ['obliques', 'dos'], { side: true }),
  // Apnea test: dry static, lying down, never alone. Not mobility, so it gets records.
  E('static-dry', 'Apnée statique à sec (allongé)', 'cardio', 'aucun', 'time', [], [], 120),
];

function M(id, name, mode, muscles, { side = false, equip = 'aucun', rest = 10 } = {}) {
  return { ...E(id, name, 'mobilite', equip, mode, muscles, [], rest), side };
}

export const isRunLike = e => e.mode === 'run';
