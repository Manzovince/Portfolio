// Static game data: resources, boats, biomes, species, sacred sites, sea zones.

export const RES = {
  bois:       { name: 'Bois',        value: 1,   color: '#b9784a' },
  fibre:      { name: 'Fibre',       value: 1,   color: '#d8c27a' },
  coco:       { name: 'Coco',        value: 1.5, color: '#8a6a44' },
  pierre:     { name: 'Basalte',     value: 2,   color: '#7f8496' },
  obsidienne: { name: 'Obsidienne',  value: 5,   color: '#3b2f4a' },
  cacao:      { name: 'Cacao',       value: 4,   color: '#a0502f' },
  nacre:      { name: 'Nacre',       value: 6,   color: '#e9d9e6' },
  plume:      { name: 'Plume',       value: 12,  color: '#2fa58c' },
};
export const RES_IDS = Object.keys(RES);

// speed in tiles/second, sea = highest zone sailed safely, sight in tiles.
export const BOATS = [
  { id: 'radeau',   name: 'Radeau',              speed: 0.9,  cargo: 20,  hull: 30,  sea: 1, crew: 1, sight: 7,
    cost: null, desc: 'Des troncs liés au pandanus. Il flotte, c\'est déjà ça.' },
  { id: 'barque',   name: 'Barque',              speed: 1.2,  cargo: 32,  hull: 45,  sea: 2, crew: 1, sight: 8,
    cost: { bois: 25, fibre: 15 }, desc: 'Une coque creusée, deux rames. Assez sûre pour quitter le lagon.' },
  { id: 'balancier', name: 'Pirogue à balancier', speed: 1.5, cargo: 50,  hull: 70,  sea: 3, crew: 2, sight: 10,
    cost: { bois: 45, fibre: 30, coco: 12 }, pearls: 10, desc: 'Le flotteur latéral la rend presque inchavirable.' },
  { id: 'voilier',  name: 'Petit voilier',       speed: 1.9,  cargo: 80,  hull: 100, sea: 4, crew: 2, sight: 11,
    cost: { bois: 80, fibre: 60, obsidienne: 10 }, pearls: 40, desc: 'Voile en pince de crabe, tressée de pandanus.' },
  { id: 'catamaran', name: 'Va\'a tauati',       speed: 2.4,  cargo: 130, hull: 150, sea: 5, crew: 3, sight: 13,
    cost: { bois: 140, fibre: 90, pierre: 30, nacre: 20 }, pearls: 120, desc: 'Deux coques jumelles et un pont : la maison des grands voyageurs.' },
  { id: 'pahi',     name: 'Pahi des étoiles',    speed: 3.0,  cargo: 200, hull: 220, sea: 6, crew: 4, sight: 16,
    cost: { bois: 220, fibre: 150, obsidienne: 40, cacao: 30, plume: 15 }, pearls: 300, desc: 'Le navire des navigateurs qui lisent les étoiles et la houle.' },
];
export const boatById = id => BOATS.find(b => b.id === id);

export const ZONES = [
  null,
  { name: 'Lagon',           sea: '#5fd3c9', deep: '#3fb6b8' },
  { name: 'Eaux côtières',   sea: '#3eaeb9', deep: '#2d93a6' },
  { name: 'Haute mer',       sea: '#2c86a6', deep: '#246f93' },
  { name: 'Grand large',     sea: '#245f8f', deep: '#1f4d7b' },
  { name: 'Mers lointaines', sea: '#2a4a7c', deep: '#243a68' },
  { name: 'Mers des ancêtres', sea: '#33396d', deep: '#2a2c58' },
  { name: 'Mers légendaires', sea: '#3b2f62', deep: '#2c2350' },
];
export const MAX_ZONE = ZONES.length - 1;

// Biome palettes: sand (beach tier), low, high, rock. Sides are derived by shading.
export const BIOMES = {
  atoll: {
    name: 'Atoll', minZone: 1, weight: 3,
    sand: '#f6e3b4', low: '#9fd88a', high: '#7cc47a', rock: '#e8d29c',
    shallow: '#8ee6dc', maxH: 2,
    res: [['coco', 4], ['fibre', 3], ['nacre', 2]], pearls: 0.5,
    fauna: ['tortue', 'crabe', 'sterne', 'bernard'],
    deco: [['palm', 6], ['rock', 1]],
  },
  jungle: {
    name: 'Jungle', minZone: 1, weight: 3,
    sand: '#f1d9a6', low: '#5bb174', high: '#2f8a63', rock: '#6f9a6a',
    shallow: '#7fd9cf', maxH: 5,
    res: [['bois', 5], ['fibre', 3], ['cacao', 1]], pearls: 0,
    fauna: ['perroquet', 'grenouille', 'gecko', 'roussette'],
    deco: [['tree', 6], ['palm', 2], ['fern', 2]],
  },
  mangrove: {
    name: 'Mangrove', minZone: 2, weight: 2,
    sand: '#cfc08a', low: '#7fae6e', high: '#5c9564', rock: '#8a8a62',
    shallow: '#86c9a8', maxH: 2,
    res: [['bois', 4], ['fibre', 4], ['nacre', 1]], pearls: 0,
    fauna: ['heron', 'crocodile', 'periophtalme', 'martin'],
    deco: [['mangrove', 7], ['fern', 1]],
  },
  volcan: {
    name: 'Volcan', minZone: 2, weight: 2,
    sand: '#5d5a66', low: '#7a8a6a', high: '#4a4553', rock: '#39343f',
    shallow: '#5fb0b8', maxH: 9, volcano: true,
    res: [['pierre', 5], ['obsidienne', 3], ['bois', 1]], pearls: 0,
    fauna: ['iguane', 'fregate', 'scolopendre', 'petrel'],
    deco: [['rock', 4], ['palm', 1], ['fern', 2]],
  },
  mesa: {
    name: 'Terrasses', minZone: 3, weight: 2,
    sand: '#efcf98', low: '#e0a06a', high: '#c9774f', rock: '#b5674a',
    shallow: '#7fd0c4', maxH: 6, terraced: true,
    res: [['pierre', 3], ['cacao', 4], ['plume', 1]], pearls: 0,
    fauna: ['quetzal', 'ocelot', 'colibri', 'axolotl'],
    deco: [['cactus', 3], ['agave', 3], ['tree', 1]],
  },
  falaise: {
    name: 'Falaises', minZone: 3, weight: 2,
    sand: '#d9cfb8', low: '#8fbf86', high: '#6aa37a', rock: '#7c8595',
    shallow: '#6cc0c4', maxH: 8, cliffs: true,
    res: [['pierre', 4], ['bois', 3], ['plume', 1]], pearls: 0.2,
    fauna: ['albatros', 'phaeton', 'chevre', 'lezard'],
    deco: [['tree', 3], ['rock', 3], ['fern', 2]],
  },
  sacre: {
    name: 'Île sacrée', minZone: 4, weight: 1,
    sand: '#f7ead0', low: '#b6d99a', high: '#8fc2a0', rock: '#d6c2a8',
    shallow: '#a2e8df', maxH: 5,
    res: [['plume', 2], ['nacre', 3], ['coco', 2]], pearls: 1,
    fauna: ['manu', 'tortue_luth', 'serpent_plume', 'aigle'],
    deco: [['palm', 3], ['tree', 2], ['tiki', 2]],
  },
};
export const BIOME_IDS = Object.keys(BIOMES);

// Fauna. `where`: a biome id, or 'mer' with a minimum zone. `rare` lowers the encounter weight.
export const SPECIES = {
  tortue:        { name: 'Tortue verte',        where: 'atoll',   rare: 1, color: '#5f9e6e', shape: 'turtle' },
  crabe:         { name: 'Crabe de cocotier',   where: 'atoll',   rare: 1, color: '#c3563c', shape: 'crab' },
  sterne:        { name: 'Sterne blanche',      where: 'atoll',   rare: 1, color: '#ffffff', shape: 'bird' },
  bernard:       { name: 'Bernard-l\'ermite',   where: 'atoll',   rare: 1, color: '#e3a060', shape: 'crab' },
  perroquet:     { name: 'Lori de Kuhl',        where: 'jungle',  rare: 1, color: '#e0423a', shape: 'bird' },
  grenouille:    { name: 'Rainette émeraude',   where: 'jungle',  rare: 1, color: '#46c46a', shape: 'small' },
  gecko:         { name: 'Gecko diurne',        where: 'jungle',  rare: 1, color: '#7ad94a', shape: 'small' },
  roussette:     { name: 'Roussette',           where: 'jungle',  rare: 2, color: '#5a3d32', shape: 'bird' },
  heron:         { name: 'Héron strié',         where: 'mangrove', rare: 1, color: '#8aa0b0', shape: 'bird' },
  crocodile:     { name: 'Crocodile marin',     where: 'mangrove', rare: 2, color: '#556b3e', shape: 'long' },
  periophtalme:  { name: 'Périophtalme',        where: 'mangrove', rare: 1, color: '#9a8a5a', shape: 'small' },
  martin:        { name: 'Martin-chasseur',     where: 'mangrove', rare: 1, color: '#2f86c9', shape: 'bird' },
  iguane:        { name: 'Iguane marin',        where: 'volcan',  rare: 1, color: '#3a3a40', shape: 'long' },
  fregate:       { name: 'Frégate du Pacifique', where: 'volcan', rare: 1, color: '#2a2a33', shape: 'bird' },
  scolopendre:   { name: 'Scolopendre géante',  where: 'volcan',  rare: 2, color: '#a3402a', shape: 'long' },
  petrel:        { name: 'Pétrel de Tahiti',    where: 'volcan',  rare: 2, color: '#4a4a55', shape: 'bird' },
  quetzal:       { name: 'Quetzal resplendissant', where: 'mesa', rare: 2, color: '#1fa07a', shape: 'bird' },
  ocelot:        { name: 'Ocelot',              where: 'mesa',    rare: 2, color: '#d9a04a', shape: 'cat' },
  colibri:       { name: 'Colibri',             where: 'mesa',    rare: 1, color: '#3ac0c0', shape: 'bird' },
  axolotl:       { name: 'Axolotl',             where: 'mesa',    rare: 2, color: '#f2a0b0', shape: 'small' },
  albatros:      { name: 'Albatros hurleur',    where: 'falaise', rare: 1, color: '#f4f4ee', shape: 'bird' },
  phaeton:       { name: 'Phaéton à brins rouges', where: 'falaise', rare: 1, color: '#fbe9e4', shape: 'bird' },
  chevre:        { name: 'Chèvre sauvage',      where: 'falaise', rare: 1, color: '#c9b9a0', shape: 'cat' },
  lezard:        { name: 'Scinque à queue bleue', where: 'falaise', rare: 1, color: '#3a6ad9', shape: 'small' },
  manu:          { name: 'Manu, l\'oiseau-esprit', where: 'sacre', rare: 3, color: '#f0c040', shape: 'bird' },
  tortue_luth:   { name: 'Tortue luth ancestrale', where: 'sacre', rare: 2, color: '#2f3a44', shape: 'turtle' },
  serpent_plume: { name: 'Serpent à plumes',    where: 'sacre',   rare: 3, color: '#2fbf9a', shape: 'long' },
  aigle:         { name: 'Aigle d\'or',          where: 'sacre',   rare: 2, color: '#c8902a', shape: 'bird' },
  dauphin:       { name: 'Dauphin à long bec',  where: 'mer', zone: 1, rare: 1, color: '#7f93a8', shape: 'dolphin' },
  raie:          { name: 'Raie manta',          where: 'mer', zone: 2, rare: 1, color: '#2e3d55', shape: 'manta' },
  requin:        { name: 'Requin-baleine',      where: 'mer', zone: 3, rare: 2, color: '#4a6a8a', shape: 'manta' },
  baleine:       { name: 'Baleine à bosse',     where: 'mer', zone: 3, rare: 2, color: '#334455', shape: 'whale' },
  espadon:       { name: 'Espadon voilier',     where: 'mer', zone: 4, rare: 2, color: '#3a6a9a', shape: 'dolphin' },
  orque:         { name: 'Orque',               where: 'mer', zone: 5, rare: 2, color: '#1c1c22', shape: 'whale' },
  calmar:        { name: 'Calmar colossal',     where: 'mer', zone: 6, rare: 3, color: '#a33a4a', shape: 'whale' },
};
export const SPECIES_IDS = Object.keys(SPECIES);
export const seaSpecies = zone => SPECIES_IDS.filter(id => SPECIES[id].where === 'mer' && SPECIES[id].zone <= zone);

// Ancient sites (one per island at most). Studying one gives a one-time gift.
export const SITES = {
  marae:      { name: 'Marae',               biomes: ['atoll', 'jungle', 'falaise', 'sacre'], gift: { pearls: 8 } },
  tiki:       { name: 'Tiki de pierre',      biomes: ['jungle', 'volcan', 'falaise', 'sacre'], gift: { pierre: 6 } },
  moai:       { name: 'Moai du rivage',      biomes: ['volcan', 'falaise', 'sacre'], gift: { obsidienne: 4 } },
  pyramide:   { name: 'Pyramide à degrés',   biomes: ['mesa', 'jungle'], gift: { cacao: 6, pearls: 10 } },
  soleil:     { name: 'Pierre du soleil',    biomes: ['mesa', 'sacre'], gift: { plume: 2, pearls: 12 } },
  petroglyphe:{ name: 'Pétroglyphes',        biomes: ['volcan', 'mangrove', 'atoll'], gift: { pearls: 6 } },
  tlachtli:   { name: 'Terrain de pelote',   biomes: ['mesa'], gift: { pearls: 15 } },
};
export const SITE_IDS = Object.keys(SITES);

// Carnet milestones: number of entries (species + sites + biomes) unlocks a lasting perk.
export const PERKS = [
  { at: 4,  id: 'speed1', name: 'Chant des pagayeurs', desc: '+10 % de vitesse' },
  { at: 8,  id: 'gather1', name: 'Mains habiles',      desc: '+25 % de récolte à quai' },
  { at: 12, id: 'sight1', name: 'Œil de frégate',      desc: '+3 cases de vue' },
  { at: 18, id: 'cargo1', name: 'Arrimage serré',      desc: '+20 % de cale' },
  { at: 24, id: 'hull1',  name: 'Bénédiction du marae', desc: '−40 % de dégâts de tempête' },
  { at: 30, id: 'speed2', name: 'Lecture de la houle', desc: '+15 % de vitesse' },
  { at: 38, id: 'gather2', name: 'Paniers tressés',    desc: '+40 % de récolte à quai' },
  { at: 46, id: 'sight2', name: 'Étoile polaire',      desc: '+4 cases de vue' },
];

export const OFFLINE_CAP_H = 12;
