// Les 42 espèces : où et quand les trouver, comment les collecter, et leur modèle 3D.
import { Builder, modelFrom } from './gfx.js?v=2';

export const BIOMES = {
  prairie: { nom: 'Prairie', emoji: '🌼' },
  foret: { nom: 'Forêt boréale', emoji: '🌲' },
  desert: { nom: 'Désert', emoji: '🌵' },
  banquise: { nom: 'Banquise', emoji: '❄️' },
  tropical: { nom: 'Tropiques', emoji: '🌴' },
  ocean: { nom: 'Grand large', emoji: '🌊' },
};
export const METHODS = {
  photo: { nom: 'Photo', emoji: '📷', verbe: 'photographié' },
  filet: { nom: 'Filet', emoji: '🦋', verbe: 'attrapé' },
  peche: { nom: 'Pêche', emoji: '🎣', verbe: 'pêché' },
  plongee: { nom: 'Plongée', emoji: '🤿', verbe: 'trouvé en plongée' },
};
export const TIMES = {
  jour: { nom: 'Le jour', r: [[6, 18]] },
  nuit: { nom: 'La nuit', r: [[19, 24], [0, 5]] },
  soir: { nom: 'Du soir au matin', r: [[17, 24], [0, 6]] },
  crep: { nom: 'Aube et crépuscule', r: [[4.5, 8.5], [16.5, 20.5]] },
  tout: { nom: 'À toute heure', r: [[0, 24]] },
};
export const WEATHER = { pluie: 'Sous la pluie', clair: 'Par beau temps' };
export const timeOk = (sp, hour) => TIMES[sp.time].r.some(([a, b]) => hour >= a && hour < b);

// ---------- briques de modèles ----------
function quad(b, o) {
  const { L, H, W, leg, col } = o, hr = o.head || .25, by = leg + H * .42;
  b.ball(col, [0, by, 0], [L / 2, H / 2, W / 2]);
  if (o.belly) b.ball(o.belly, [0, by - H * .14, 0], [L * .4, H * .38, W * .44]);
  const lr = o.legR || W * .13;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.limb(o.legCol || col, [sx * L * .3, by, sz * W * .26], [sx * L * .3, 0, sz * W * .26], lr, lr * .8);
  let hp;
  if (o.neck) {
    const na = o.neckA ?? .9, n0 = [L * .38, by + H * .12, 0], ne = [n0[0] + Math.cos(na) * o.neck, n0[1] + Math.sin(na) * o.neck, 0];
    b.limb(col, n0, ne, o.neckR || W * .22, (o.neckR || W * .22) * .7); hp = [ne[0] + hr * .45, ne[1] + hr * .25, 0];
  } else hp = [L * .5 + hr * .5, by + H * .2 + (o.headUp || 0), 0];
  b.ball(o.headCol || col, hp, [hr * 1.1, hr, hr * .92]);
  if (o.snout) { const s = o.snout; b.ball(o.snoutCol || o.headCol || col, [hp[0] + hr * .85, hp[1] - hr * .22, 0], [s * 1.3, s * .85, s * .9]);
    b.ball('#2a2222', [hp[0] + hr * .85 + s * 1.2, hp[1] - hr * .12, 0], s * .3); }
  for (const z of [-1, 1]) b.ball('#161414', [hp[0] + hr * .6, hp[1] + hr * .28, z * hr * .55], hr * .15);
  const ec = o.earCol || o.headCol || col;
  for (const z of [-1, 1]) {
    if (o.ear === 'point') b.cone(ec, [hp[0] - hr * .2, hp[1] + hr * 1.05, z * hr * .5], hr * .3, hr * .7, [z * .25, 0, 0], [1, 1, .55]);
    if (o.ear === 'big') b.cone(ec, [hp[0] - hr * .25, hp[1] + hr * 1.3, z * hr * .7], hr * .45, hr * 1.5, [z * .45, 0, 0], [1, 1, .4]);
    if (o.ear === 'round') b.ball(ec, [hp[0] - hr * .25, hp[1] + hr * .85, z * hr * .62], [hr * .28, hr * .28, hr * .14]);
    if (o.ear === 'long') b.ball(ec, [hp[0] - hr * .35, hp[1] + hr * 1.5, z * hr * .35], [hr * .25, hr * .85, hr * .14], [z * .2, 0, .25]);
    if (o.ear === 'flap') b.ball(ec, [hp[0] - hr * .35, hp[1] - hr * .05, z * hr * .9], [hr * .5, hr * .8, hr * .1], [z * .35, .4 * z, 0]);
  }
  if (o.tail) b.limb(o.tailCol || col, [-L * .47, by + H * .15, 0], [-L * .5 - o.tail * .55, by - o.tail * .45, 0], o.tailR || .05, (o.tailR || .05) * .6);
  return { hp, hr, by, L, H, W };
}
function stripes(b, { by, L, H, W }, n, col, x0 = -.4, x1 = .4) {
  for (let i = 0; i < n; i++) {
    const x = (x0 + (x1 - x0) * i / (n - 1)) * L, k = Math.sqrt(Math.max(0, 1 - (x / (L / 2)) ** 2));
    b.ball(col, [x, by, 0], [.04 * L, H / 2 * k * 1.04, W / 2 * k * 1.04]);
  }
}
function bird(b, o) {
  const s = o.s || 1, c = o.col;
  b.ball(c, [0, .3 * s, 0], [.26 * s, .2 * s, .19 * s]);
  b.ball(o.belly || c, [.09 * s, .26 * s, 0], [.17 * s, .15 * s, .15 * s]);
  b.ball(o.head || c, [.2 * s, .46 * s, 0], .14 * s);
  b.cone(o.beak || '#e2a33c', [.37 * s, .44 * s, 0], .04 * s, .13 * s, [0, 0, -Math.PI / 2]);
  for (const z of [-1, 1]) { b.ball('#111', [.29 * s, .5 * s, z * .085 * s], .026 * s); b.limb('#d39a4a', [.03 * s, .14 * s, z * .06 * s], [.04 * s, 0, z * .07 * s], .018 * s); }
  b.part('wingL').ball(o.wing || c, [-.02 * s, .33 * s, .17 * s], [.21 * s, .1 * s, .045 * s], [0, 0, -.2]);
  b.part('wingR').ball(o.wing || c, [-.02 * s, .33 * s, -.17 * s], [.21 * s, .1 * s, .045 * s], [0, 0, -.2]);
  b.part('body').ball(o.tail || o.wing || c, [-.32 * s, .33 * s, 0], [(o.tailL || .2) * s, .04 * s, .08 * s], [0, 0, .35]);
}
function fish(b, o) {
  const L = o.L || .6, H = o.H || L * .34, W = o.W || L * .17, c = o.col;
  b.ball(c, [0, 0, 0], [L / 2, H / 2, W / 2]);
  if (o.back) b.ball(o.back, [-.02 * L, H * .14, 0], [L * .46, H * .38, W * .46]);
  if (o.belly) b.ball(o.belly, [0, -H * .16, 0], [L * .42, H * .32, W * .46]);
  b.cone(o.fin || c, [-L * .58, 0, 0], H * .5, L * .3, [0, 0, Math.PI / 2], [1, 1, .22]);
  b.cone(o.fin || c, [-.02 * L, H * .5, 0], L * (o.dorsal || .12), H * (o.dorsalH || .55), [0, 0, .5], [1, 1, .2]);
  for (const z of [-1, 1]) { b.ball('#f4f4f0', [L * .35, H * .12, z * W * .4], H * .11); b.ball('#111', [L * .38, H * .12, z * W * .46], H * .07);
    b.ball(o.fin || c, [L * .15, -H * .2, z * W * .5], [L * .1, H * .05, W * .25], [0, z * .5, -.3]); }
  if (o.stripes) for (let i = 0; i < o.stripes.length; i++) { const x = o.stripes[i] * L, k = Math.sqrt(Math.max(0, 1 - (x / (L / 2)) ** 2));
    b.ball(o.stripeCol, [x, 0, 0], [.04 * L, H / 2 * k * 1.04, W / 2 * k * 1.06]); }
  if (o.spots) for (let i = 0; i < o.spots; i++) { const a = i * 2.4, x = ((i * .37) % 1 - .5) * L * .7; for (const z of [-1, 1]) b.ball(o.spotCol, [x, H * .05 + Math.sin(a) * H * .15, z * W * .45], H * .07); }
}
function bug(b, o) {
  const s = o.s || 1, c = o.col;
  b.ball(c, [0, .14 * s, 0], [.3 * s, .15 * s, .23 * s]);
  b.ball(o.head || '#26222a', [.3 * s, .12 * s, 0], .11 * s);
  for (const z of [-1, 1]) for (let i = 0; i < 3; i++) b.limb('#26222a', [(-.1 + i * .12) * s, .1 * s, z * .14 * s], [(-.2 + i * .2) * s, 0, z * .32 * s], .02 * s, .015 * s);
  for (const z of [-1, 1]) { b.limb('#26222a', [.38 * s, .16 * s, z * .04 * s], [.55 * s, .3 * s, z * .14 * s], .012 * s); }
  b.limb(o.line || '#1d1a20', [-.3 * s, .29 * s, 0], [.22 * s, .29 * s, 0], .008 * s);
}
function butterfly(b, o) {
  const c = o.col, s = o.s || 1;
  b.ball('#2a2420', [0, 0, 0], [.13 * s, .03 * s, .03 * s]);
  for (const z of [-1, 1]) b.limb('#2a2420', [.1 * s, .01 * s, z * .01 * s], [.2 * s, .08 * s, z * .06 * s], .006 * s);
  for (const [n, z] of [['wingL', 1], ['wingR', -1]]) {
    b.part(n);
    b.ball(c, [.03 * s, 0, z * .15 * s], [.11 * s, .012 * s, .15 * s], [0, z * .3, 0]);
    b.ball(o.col2 || c, [-.08 * s, 0, z * .11 * s], [.07 * s, .012 * s, .1 * s], [0, -z * .4, 0]);
    if (o.edge) b.ball(o.edge, [.05 * s, 0, z * .25 * s], [.08 * s, .016 * s, .05 * s], [0, z * .3, 0]);
    if (o.spot) b.ball(o.spot, [-.1 * s, 0, z * .17 * s], [.025 * s, .02 * s, .025 * s]);
    b.part('body');
  }
}
function frog(b, col, belly, spot) {
  b.ball(col, [0, .12, 0], [.19, .11, .15]); b.ball(belly, [.04, .08, 0], [.14, .07, .12]);
  for (const z of [-1, 1]) { b.ball(col, [.1, .22, z * .07], .055); b.ball('#111', [.13, .23, z * .075], .03);
    b.ball(col, [-.1, .07, z * .14], [.11, .05, .05], [0, z * .3, 0]); b.limb(col, [.1, .08, z * .1], [.16, 0, z * .14], .02); }
  if (spot) for (let i = 0; i < 6; i++) b.ball(spot, [-.12 + (i % 3) * .1, .2, (i < 3 ? 1 : -1) * .06], .03);
}

// ---------- catalogue ----------
export const SPECIES = [
  // Prairie
  { id: 'lapin', nom: 'Lapin de garenne', biomes: ['prairie'], method: 'photo', hab: 'sol', time: 'jour', rare: 1, speed: 1.4, shy: 7, anim: 'hop',
    desc: 'Il vit en colonies dans des terriers reliés par des galeries : les garennes.',
    model: b => { const d = quad(b, { L: .55, H: .45, W: .4, leg: .08, col: '#d8c2a2', head: .2, ear: 'long', snout: .07, snoutCol: '#efe2cc' }); b.ball('#ffffff', [-d.L * .5, d.by + .05, 0], .1); } },
  { id: 'renard', nom: 'Renard roux', biomes: ['prairie', 'foret'], method: 'photo', hab: 'sol', time: 'soir', rare: 2, speed: 1.6, shy: 9,
    desc: 'Opportuniste, il chasse surtout au crépuscule et à la nuit tombée.',
    model: b => { const d = quad(b, { L: .9, H: .4, W: .32, leg: .3, col: '#e2742c', legCol: '#3a2a22', head: .2, snout: .12, snoutCol: '#f6efe4', ear: 'point', earCol: '#3a2a22' });
      b.ball('#e2742c', [-d.L * .65, d.by - .05, 0], [.32, .13, .13], [0, 0, .5]); b.ball('#ffffff', [-d.L * .88, d.by - .2, 0], .09); } },
  { id: 'herisson', nom: 'Hérisson', biomes: ['prairie'], method: 'photo', hab: 'sol', time: 'nuit', rare: 1, speed: .6, shy: 3,
    desc: 'Ses quelque 6 000 piquants sont des poils modifiés. Il sort la nuit chercher des insectes.',
    model: b => { b.ball('#6e5236', [0, .22, 0], [.36, .24, .3]);
      for (let i = 0; i < 26; i++) { const th = i * 2.399, ph = .25 + (i % 7) / 7 * 1.15, x = Math.cos(ph) * .34 - .04, y = .22 + Math.sin(ph) * .2 * (.8 + .2 * Math.abs(Math.sin(th))), z = Math.sin(th) * Math.sin(ph) * .28;
        b.cone('#4a3524', [x * .9, y + .02, z], .05, .16, [z * 2, 0, .9 - ph * .6]); }
      b.ball('#d9c2a0', [.32, .16, 0], [.15, .12, .13]); b.cone('#d9c2a0', [.47, .14, 0], .06, .12, [0, 0, -Math.PI / 2]); b.ball('#1a1414', [.54, .14, 0], .03);
      for (const z of [-1, 1]) b.ball('#111', [.4, .21, z * .07], .022); } },
  { id: 'rougegorge', nom: 'Rouge-gorge', biomes: ['prairie', 'foret'], method: 'photo', hab: 'sol', time: 'jour', rare: 1, speed: 1, shy: 5, anim: 'hop', scale: 1.1,
    desc: 'Très territorial, il chante même en hiver pour défendre son coin de jardin.',
    model: b => bird(b, { col: '#8a6a4a', belly: '#ea6a38', head: '#8a6a4a', wing: '#7a5c3e', s: .8 }) },
  { id: 'machaon', nom: 'Machaon', biomes: ['prairie'], method: 'filet', hab: 'air', time: 'jour', weather: 'clair', rare: 1, scale: 1.5,
    desc: "Un des plus grands papillons d'Europe ; sa chenille adore la carotte sauvage.",
    model: b => butterfly(b, { col: '#f4d64a', col2: '#f0c93a', edge: '#2a2420', spot: '#e0503a' }) },
  { id: 'coccinelle', nom: 'Coccinelle', biomes: ['prairie', 'foret'], method: 'filet', hab: 'air', time: 'jour', rare: 1, scale: 1.2, low: true,
    desc: 'Une seule coccinelle peut dévorer des dizaines de pucerons par jour.',
    model: b => { bug(b, { col: '#e02a1e', s: .5 }); for (const [x, z] of [[.05, .07], [-.06, .06], [.05, -.07], [-.06, -.06], [-.12, 0]]) b.ball('#151215', [x, .21, z], .03); } },
  { id: 'luciole', nom: 'Luciole', biomes: ['prairie', 'foret', 'tropical'], method: 'filet', hab: 'air', time: 'nuit', rare: 1, scale: 1.4,
    desc: 'Sa lumière naît d’une réaction chimique qui ne produit presque pas de chaleur.',
    model: b => { bug(b, { col: '#5a4632', head: '#e6b04a', s: .4 }); b.part('glow').ball('#f8ff8a', [-.14, .07, 0], [.12, .08, .09]); } },
  { id: 'grenouille', nom: 'Grenouille verte', biomes: ['prairie', 'foret'], method: 'filet', hab: 'sol', time: 'tout', weather: 'pluie', rare: 1, speed: .8, shy: 3, anim: 'hop', scale: 1.4,
    desc: 'Elle respire aussi par la peau, qui doit rester humide : elle adore la pluie.',
    model: b => frog(b, '#6fae3c', '#e3e6a0', '#3f7a2a') },
  { id: 'bar', nom: 'Bar', biomes: ['prairie', 'desert'], method: 'peche', hab: 'mer', time: 'tout', rare: 1, size: 'M',
    desc: 'Chasseur des côtes rocheuses, il aime les eaux agitées.',
    model: b => fish(b, { L: .7, col: '#c7d0d5', back: '#7d8a95', belly: '#eef2f2', fin: '#8a96a0' }) },
  { id: 'maquereau', nom: 'Maquereau', biomes: ['prairie', 'foret'], method: 'peche', hab: 'mer', time: 'jour', rare: 1, size: 'S',
    desc: 'Il nage en bancs immenses et ne s’arrête presque jamais.',
    model: b => fish(b, { L: .5, H: .13, col: '#d6e6e2', back: '#2f7a7c', belly: '#f2f6f4', fin: '#4a6f70', stripes: [-.3, -.2, -.1, 0, .1, .2], stripeCol: '#1f3f44' }) },
  // Forêt boréale
  { id: 'cerf', nom: 'Cerf élaphe', biomes: ['foret'], method: 'photo', hab: 'sol', time: 'crep', rare: 2, speed: 1.2, shy: 12, scale: 1.3,
    desc: 'Ses bois tombent chaque hiver et repoussent plus grands au printemps.',
    model: b => { const { hp, hr } = quad(b, { L: 1.2, H: .6, W: .45, leg: .8, col: '#a86f3e', belly: '#e9d6b6', neck: .5, neckA: 1.15, head: .2, snout: .1, ear: 'point', tail: .15 });
      for (const z of [-1, 1]) { const b0 = [hp[0] - hr * .2, hp[1] + hr * .8, z * hr * .4], t = [b0[0] - .15, b0[1] + .65, z * .4];
        b.limb('#6b4a2c', b0, t, .035, .02); b.limb('#6b4a2c', [b0[0] - .06, b0[1] + .3, z * .26], [b0[0] + .18, b0[1] + .55, z * .32], .025, .015);
        b.limb('#6b4a2c', [b0[0] - .1, b0[1] + .5, z * .33], [b0[0] + .05, b0[1] + .78, z * .42], .02, .012); } } },
  { id: 'ours', nom: 'Ours brun', biomes: ['foret'], method: 'photo', hab: 'sol', time: 'jour', rare: 2, speed: 1, shy: 8, scale: 1.3,
    desc: 'Malgré sa masse, il peut courir à plus de 50 km/h.',
    model: b => quad(b, { L: 1.5, H: 1, W: .9, leg: .45, col: '#6b4a33', head: .38, snout: .17, snoutCol: '#9a7454', ear: 'round', headUp: .1 }) },
  { id: 'chouette', nom: 'Chouette lapone', biomes: ['foret'], method: 'photo', hab: 'arbre', time: 'nuit', rare: 2, shy: 6, scale: 1.2,
    desc: 'Son disque facial concentre les sons : elle repère un campagnol sous la neige.',
    model: b => { b.ball('#8f9294', [0, .42, 0], [.27, .4, .27]); b.ball('#c9cbcc', [.12, .38, 0], [.16, .27, .2]); b.ball('#8f9294', [0, .86, 0], .26);
      b.ball('#d7d8d8', [.14, .86, 0], [.14, .22, .24]);
      for (const z of [-1, 1]) { b.ball('#f3d65a', [.25, .9, z * .08], .055); b.ball('#141414', [.29, .9, z * .08], .03);
        b.ball('#7d8082', [-.02, .45, z * .26], [.22, .3, .06]); }
      b.cone('#e2a33c', [.28, .82, 0], .03, .09, [0, 0, -2.6]); } },
  { id: 'ecureuil', nom: 'Écureuil roux', biomes: ['foret'], method: 'photo', hab: 'sol', time: 'jour', rare: 1, speed: 1.6, shy: 6, anim: 'hop', scale: 1.1,
    desc: 'Il enterre des graines… et en oublie beaucoup, plantant ainsi des arbres.',
    model: b => { const d = quad(b, { L: .45, H: .3, W: .22, leg: .1, col: '#c45f28', belly: '#f1dfc4', head: .15, snout: .06, ear: 'point' });
      for (let i = 0; i < 5; i++) { const a = i / 4 * 2.4; b.ball('#c9652c', [-.28 - Math.sin(a) * .14, d.by + .05 + (1 - Math.cos(a)) * .22, 0], .1 + i * .015); } } },
  { id: 'lucane', nom: 'Lucane cerf-volant', biomes: ['foret'], method: 'filet', hab: 'sol', time: 'soir', rare: 2, speed: .4, shy: 2.5, scale: 1.4,
    desc: "Le plus grand coléoptère d'Europe. Les mâles s'affrontent avec leurs mandibules.",
    model: b => { bug(b, { col: '#4a2a1a', head: '#3a2216', s: .6 }); for (const z of [-1, 1]) { b.limb('#7a3e22', [.25, .08, z * .04], [.45, .12, z * .1], .025, .02); b.limb('#7a3e22', [.45, .12, z * .1], [.52, .12, z * .02], .02, .012); b.limb('#7a3e22', [.38, .1, z * .08], [.4, .17, z * .1], .012); } } },
  { id: 'saumon', nom: 'Saumon atlantique', biomes: ['foret'], method: 'peche', hab: 'mer', time: 'tout', rare: 2, size: 'M',
    desc: 'Né en rivière, il part en mer puis revient pondre là où il est né.',
    model: b => fish(b, { L: .85, col: '#d4d8d8', back: '#5f7f8c', belly: '#f2c4b0', fin: '#6f8a96', spots: 6, spotCol: '#2f3f48' }) },
  // Désert
  { id: 'fennec', nom: 'Fennec', biomes: ['desert'], method: 'photo', hab: 'sol', time: 'soir', rare: 2, speed: 1.6, shy: 9,
    desc: 'Ses immenses oreilles l’aident à entendre ses proies et à évacuer la chaleur.',
    model: b => quad(b, { L: .6, H: .35, W: .28, leg: .25, col: '#ead09e', head: .17, snout: .08, snoutCol: '#f7ebd6', ear: 'big', earCol: '#f0cfa0', tail: .35, tailR: .07 }) },
  { id: 'dromadaire', nom: 'Dromadaire', biomes: ['desert'], method: 'photo', hab: 'sol', time: 'jour', rare: 1, speed: .8, shy: 4, scale: 1.4,
    desc: 'Sa bosse est une réserve de graisse, pas d’eau.',
    model: b => { const d = quad(b, { L: 1.6, H: .8, W: .6, leg: 1.1, col: '#c99a5e', neck: .9, neckA: .75, head: .22, snout: .14, ear: 'round', tail: .3 }); b.ball('#c4945a', [0, d.by + d.H * .45, 0], [.42, .38, .3]); } },
  { id: 'lezard', nom: 'Lézard des sables', biomes: ['desert'], method: 'photo', hab: 'sol', time: 'jour', weather: 'clair', rare: 1, speed: 2, shy: 5, scale: 1.4,
    desc: 'Il se réchauffe au soleil le matin avant de partir chasser.',
    model: b => { b.ball('#c9a46a', [0, .12, 0], [.3, .08, .11]); b.ball('#c9a46a', [.33, .13, 0], [.12, .07, .08]); b.limb('#b8935a', [-.28, .1, 0], [-.75, .04, .15], .07, .015);
      for (const sx of [-1, 1]) for (const z of [-1, 1]) b.limb('#b8935a', [sx * .16, .1, z * .08], [sx * .2, 0, z * .2], .025, .02);
      for (let i = 0; i < 4; i++) b.ball('#8a6a3a', [-.2 + i * .12, .19, 0], .035); for (const z of [-1, 1]) b.ball('#111', [.4, .18, z * .05], .02); } },
  { id: 'scorpion', nom: 'Scorpion', biomes: ['desert'], method: 'filet', hab: 'sol', time: 'nuit', rare: 2, speed: .5, shy: 2.5, scale: 1.5,
    desc: 'Sous une lampe UV, sa carapace devient fluorescente.',
    model: b => { const c = '#3a3028'; b.ball(c, [0, .08, 0], [.2, .06, .12]); b.ball(c, [.18, .07, 0], [.1, .05, .1]);
      let p = [-.18, .08, 0]; for (let i = 0; i < 5; i++) { const a = i / 4 * 2.6, q = [-.2 - Math.sin(a) * .2, .08 + (1 - Math.cos(a)) * .16, 0]; b.ball(c, q, .045 - i * .004); p = q; }
      b.cone('#c8a040', [-.1, .38, 0], .025, .09, [0, 0, -2.2]);
      for (const z of [-1, 1]) { b.limb(c, [.22, .07, z * .08], [.34, .06, z * .2], .02); b.ball(c, [.4, .06, z * .22], [.08, .035, .05], [0, z * .5, 0]);
        for (let i = 0; i < 4; i++) b.limb(c, [.1 - i * .07, .07, z * .1], [.06 - i * .1, 0, z * .26], .012); } } },
  { id: 'scarabee', nom: 'Scarabée sacré', biomes: ['desert'], method: 'filet', hab: 'sol', time: 'jour', rare: 1, speed: .4, shy: 2.5, scale: 1.4,
    desc: 'Il roule des boules de crottin et s’oriente grâce à la Voie lactée.',
    model: b => { bug(b, { col: '#24262c', head: '#1c1d22', s: .55 }); b.ball('#7a5a3a', [.42, .14, 0], .14); } },
  // Banquise
  { id: 'manchot', nom: 'Manchot empereur', biomes: ['banquise'], method: 'photo', hab: 'sol', time: 'tout', rare: 1, speed: .5, shy: 4, anim: 'waddle', group: 4,
    desc: 'Le mâle couve l’œuf sur ses pattes pendant tout l’hiver polaire.',
    model: b => { b.ball('#26282e', [0, .55, 0], [.33, .52, .3]); b.ball('#f6f4ee', [.12, .5, 0], [.24, .42, .24]); b.ball('#f3c54a', [.14, .92, 0], [.12, .1, .2]);
      b.ball('#26282e', [.02, 1.1, 0], .22); b.cone('#f0a43a', [.27, 1.07, 0], .06, .2, [0, 0, -Math.PI / 2]);
      for (const z of [-1, 1]) { b.ball('#161414', [.17, 1.16, z * .1], .03); b.ball('#26282e', [0, .6, z * .3], [.08, .3, .05], [z * .25, 0, 0]); b.ball('#3a3a40', [.1, .03, z * .12], [.13, .04, .08]); } } },
  { id: 'phoque', nom: 'Phoque veau-marin', biomes: ['banquise'], method: 'photo', hab: 'plage', time: 'jour', rare: 1, speed: .4, shy: 6,
    desc: 'Il peut rester plus de 20 minutes sous l’eau sans respirer.',
    model: b => { b.ball('#8e98a3', [0, .32, 0], [.9, .32, .38]); for (let i = 0; i < 8; i++) b.ball('#6e7883', [-.5 + i * .14, .55 + Math.sin(i) * .04, ((i * 37) % 7 - 3) * .05], .04);
      b.ball('#8e98a3', [.85, .48, 0], .27); b.ball('#c8ced3', [1.08, .44, 0], [.12, .1, .14]);
      for (const z of [-1, 1]) { b.ball('#161414', [1.02, .58, z * .12], .045); b.ball('#7b858f', [.3, .1, z * .38], [.25, .05, .12]); }
      b.ball('#7b858f', [-.95, .2, 0], [.25, .06, .3]); } },
  { id: 'ourspolaire', nom: 'Ours polaire', biomes: ['banquise'], method: 'photo', hab: 'sol', time: 'tout', rare: 2, speed: 1, shy: 11, scale: 1.5,
    desc: 'Sous sa fourrure blanche, sa peau est noire pour mieux absorber la chaleur.',
    model: b => quad(b, { L: 1.6, H: .95, W: .85, leg: .5, col: '#f1ede3', head: .34, snout: .17, ear: 'round', headUp: -.05 }) },
  { id: 'renardpolaire', nom: 'Renard polaire', biomes: ['banquise'], method: 'photo', hab: 'sol', time: 'tout', rare: 2, speed: 1.6, shy: 9,
    desc: 'Son pelage passe du brun en été au blanc immaculé en hiver.',
    model: b => { const d = quad(b, { L: .8, H: .4, W: .32, leg: .25, col: '#f4f4f2', head: .2, snout: .1, ear: 'point' }); b.ball('#f4f4f2', [-d.L * .65, d.by - .05, 0], [.3, .15, .15], [0, 0, .5]); } },
  { id: 'morue', nom: 'Cabillaud', biomes: ['banquise', 'foret'], method: 'peche', hab: 'mer', time: 'tout', rare: 1, size: 'L',
    desc: 'Une seule femelle peut pondre plusieurs millions d’œufs.',
    model: b => { fish(b, { L: .9, col: '#b9a878', back: '#8a7a50', belly: '#ece6d0', fin: '#8a7a50', spots: 8, spotCol: '#6a5a38' }); b.limb('#8a7a50', [.4, -.1, 0], [.42, -.2, 0], .01); } },
  { id: 'crabeRoyal', nom: 'Crabe royal', biomes: ['banquise'], method: 'plongee', hab: 'fond', time: 'tout', rare: 2,
    desc: 'Ses longues pattes peuvent dépasser 1,5 m d’envergure.',
    model: b => { b.ball('#c8402a', [0, .25, 0], [.3, .14, .28]); for (const z of [-1, 1]) { for (let i = 0; i < 3; i++) { const x = -.12 + i * .12;
        b.limb('#b8382a', [x, .24, z * .22], [x - .05, .4, z * .55], .035, .03); b.limb('#b8382a', [x - .05, .4, z * .55], [x - .1, 0, z * .8], .03, .015); }
      b.limb('#c8402a', [.2, .22, z * .15], [.42, .3, z * .25], .04); b.ball('#d8503a', [.48, .3, z * .26], [.1, .06, .07]); b.ball('#111', [.28, .34, z * .06], .025); } } },
  // Tropiques
  { id: 'ara', nom: 'Ara rouge', biomes: ['tropical'], method: 'photo', hab: 'arbre', time: 'jour', rare: 1, shy: 6, scale: 1.3,
    desc: 'Il vit en couple fidèle et peut dépasser 50 ans.',
    model: b => bird(b, { col: '#d8302a', belly: '#e0403a', head: '#e0403a', wing: '#2f6fd8', tail: '#d8302a', tailL: .45, beak: '#e8e2d0', s: 1.1 }) },
  { id: 'tortue', nom: 'Tortue verte', biomes: ['tropical'], method: 'photo', hab: 'plage', time: 'nuit', rare: 2, speed: .3, shy: 5, scale: 1.4,
    desc: 'Les femelles reviennent pondre la nuit sur la plage où elles sont nées.',
    model: b => { b.ball('#5e7a3a', [0, .18, 0], [.55, .22, .45]); for (let i = 0; i < 5; i++) b.ball('#4a6430', [-.3 + i * .15, .36, 0], [.07, .04, .12]); b.ball('#a9b36a', [0, .08, 0], [.5, .08, .42]); b.ball('#9bb07a', [.6, .16, 0], [.17, .13, .13]);
      for (const z of [-1, 1]) { b.ball('#9bb07a', [.3, .07, z * .48], [.3, .04, .12], [0, z * -.5, 0]); b.ball('#9bb07a', [-.35, .07, z * .38], [.15, .04, .08]); b.ball('#111', [.72, .21, z * .07], .025); } } },
  { id: 'dendrobate', nom: 'Dendrobate azuré', biomes: ['tropical'], method: 'filet', hab: 'sol', time: 'tout', weather: 'pluie', rare: 2, speed: .7, shy: 3, anim: 'hop', scale: 1.1,
    desc: 'Ses couleurs vives avertissent les prédateurs : sa peau est toxique.',
    model: b => frog(b, '#2f6fe0', '#1f4fb0', '#111418') },
  { id: 'morpho', nom: 'Morpho bleu', biomes: ['tropical'], method: 'filet', hab: 'air', time: 'jour', rare: 2, scale: 1.7,
    desc: 'Le bleu de ses ailes n’est pas un pigment, mais un jeu de lumière.',
    model: b => butterfly(b, { col: '#3aa8ff', col2: '#2f8ae8', edge: '#1a1a24' }) },
  { id: 'crabe', nom: 'Crabe violoniste', biomes: ['tropical', 'desert'], method: 'filet', hab: 'plage', time: 'tout', rare: 1, speed: 1.4, shy: 3.5, scale: 1.3,
    desc: 'Le mâle agite sa grande pince pour séduire et impressionner.',
    model: b => { b.ball('#e2753a', [0, .14, 0], [.22, .09, .17]); b.ball('#f0d24a', [.05, .17, 0], [.14, .06, .12]);
      b.limb('#e2753a', [.15, .14, .14], [.3, .2, .24], .035); b.ball('#f4e6c8', [.38, .24, .27], [.13, .08, .07], [0, .3, .3]);
      b.limb('#e2753a', [.15, .14, -.14], [.25, .15, -.2], .02); b.ball('#e2753a', [.28, .15, -.21], .035);
      for (const z of [-1, 1]) { b.limb('#d0602a', [.1, .2, z * .05], [.12, .32, z * .06], .012); b.ball('#111', [.12, .33, z * .06], .025);
        for (let i = 0; i < 3; i++) b.limb('#c94a32', [-.1 + i * .08, .12, z * .14], [-.15 + i * .08, 0, z * .3], .015); } } },
  { id: 'clown', nom: 'Poisson-clown', biomes: ['tropical'], method: 'peche', hab: 'mer', time: 'jour', rare: 1, size: 'S',
    desc: 'Il vit à l’abri des tentacules urticants des anémones.',
    model: b => fish(b, { L: .32, H: .14, col: '#ff8a1e', fin: '#ff8a1e', stripes: [.18, -.02, -.22], stripeCol: '#ffffff', dorsalH: .7 }) },
  { id: 'hippocampe', nom: 'Hippocampe', biomes: ['tropical'], method: 'plongee', hab: 'fond', time: 'tout', rare: 2, scale: 1.5,
    desc: 'C’est le mâle qui porte les œufs dans une poche ventrale.',
    model: b => { const c = '#f2b43a'; b.ball(c, [0, .55, 0], [.08, .1, .07]); b.limb(c, [.05, .55, 0], [.17, .52, 0], .03, .02);
      for (let i = 0; i < 5; i++) b.ball(c, [-.02 + Math.sin(i * .5) * .04, .45 - i * .07, 0], [.075 - i * .006, .05, .065]);
      b.torus(c, [-.02, .06, 0], .06, .02, 4.5, [0, 0, 1.2]); b.cone('#f6c85a', [-.02, .66, 0], .03, .08); b.ball('#111', [.05, .57, .06], .015); b.ball('#111', [.05, .57, -.06], .015);
      b.ball('#f6c85a', [-.08, .4, 0], [.02, .06, .05]); } },
  { id: 'etoile', nom: 'Étoile de mer', biomes: ['tropical', 'prairie'], method: 'plongee', hab: 'fond', time: 'tout', rare: 1, scale: 1.5,
    desc: 'Elle peut faire repousser un bras perdu.',
    model: b => { b.ball('#f07a3a', [0, .04, 0], [.1, .05, .1]); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2;
      b.cone('#f07a3a', [Math.cos(a) * .14, .03, Math.sin(a) * .14], .07, .26, [0, -a, -Math.PI / 2], [1, 1, .45]); b.ball('#ffd08a', [Math.cos(a) * .12, .07, Math.sin(a) * .12], .02); } } },
  { id: 'pieuvre', nom: 'Pieuvre', biomes: ['tropical', 'desert', 'prairie'], method: 'plongee', hab: 'fond', time: 'nuit', rare: 2, scale: 1.3,
    desc: 'Trois cœurs, un sang bleu et une intelligence remarquable.',
    model: b => { const c = '#b0508a'; b.ball(c, [-.08, .42, 0], [.26, .3, .24], [0, 0, .4]); b.ball(c, [.08, .2, 0], [.16, .13, .16]);
      for (const z of [-1, 1]) { b.ball('#f4e4b0', [.2, .25, z * .1], .045); b.ball('#111', [.23, .25, z * .1], .02); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
        b.limb(c, [x * .1 + .05, .14, z * .1], [x * .35 + .05, .04, z * .35], .045, .03); b.limb(c, [x * .35 + .05, .04, z * .35], [x * .5 + .05, .08, z * .45], .03, .012); } } },
  // Grand large
  { id: 'baleine', nom: 'Baleine à bosse', biomes: ['ocean'], method: 'photo', hab: 'large', time: 'jour', rare: 2,
    desc: 'Les mâles chantent des chants complexes qui évoluent d’année en année.',
    model: b => { b.ball('#3f4a58', [0, 0, 0], [4, 1.05, 1.15]); b.ball('#d8dcd8', [.6, -.45, 0], [2.9, .55, .85]); b.ball('#3f4a58', [3.2, .1, 0], [1.2, .7, .85]);
      for (let i = 0; i < 5; i++) b.ball('#5a6470', [3.4 - i * .4, .7, 0], .1);
      b.cone('#3f4a58', [-1.6, .95, 0], .3, .6, [0, 0, .5], [1, 1, .4]);
      for (const z of [-1, 1]) { b.ball('#c9cfd4', [1.6, -.55, z * 1.5], [.9, .1, .3], [0, z * .7, -.3]); b.ball('#111', [3.1, -.15, z * .78], .08);
        b.ball('#3f4a58', [-4.6, .15, z * .7], [.6, .08, .75], [0, z * -.5, 0]); }
      b.limb('#3f4a58', [-3.5, 0, 0], [-4.4, .15, 0], .5, .25); } },
  { id: 'dauphin', nom: 'Grand dauphin', biomes: ['ocean'], method: 'photo', hab: 'large', time: 'jour', rare: 1, group: 3,
    desc: 'Chaque dauphin possède un sifflement signature, comme un prénom.',
    model: b => { b.ball('#7d8ea0', [0, 0, 0], [1.1, .33, .32]); b.ball('#d8dde2', [.1, -.12, 0], [.85, .2, .25]); b.limb('#7d8ea0', [1, -.02, 0], [1.35, -.06, 0], .12, .07);
      b.cone('#6d7e90', [-.1, .38, 0], .16, .4, [0, 0, .5], [1, 1, .3]); b.limb('#7d8ea0', [-.95, 0, 0], [-1.4, .05, 0], .16, .08);
      for (const z of [-1, 1]) { b.ball('#6d7e90', [-1.5, .05, z * .25], [.22, .04, .22], [0, z * -.6, 0]); b.ball('#6d7e90', [.4, -.2, z * .32], [.22, .04, .1], [0, z * .6, -.4]); b.ball('#111', [.85, .06, z * .24], .035); } } },
  { id: 'meduse', nom: 'Méduse lune', biomes: ['ocean'], method: 'photo', hab: 'large', time: 'nuit', rare: 1, group: 4, scale: 1.4,
    desc: 'Composée à 95 % d’eau, elle n’a ni cerveau ni cœur.',
    model: b => { b.part('glow').ball('#f2b8ff', [0, .3, 0], [.4, .28, .4]); b.ball('#ffd8ff', [0, .32, 0], [.18, .1, .18]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.limb('#e0a0f0', [Math.cos(a) * .3, .1, Math.sin(a) * .3], [Math.cos(a) * .25, -.5 - (i % 2) * .2, Math.sin(a) * .25], .015); } b.part('body'); } },
  { id: 'thon', nom: 'Thon rouge', biomes: ['ocean'], method: 'peche', hab: 'mer', time: 'tout', rare: 2, size: 'L',
    desc: 'Il peut garder son corps plus chaud que l’eau qui l’entoure.',
    model: b => { fish(b, { L: 1.6, H: .45, col: '#c8d0d8', back: '#24406a', belly: '#eef2f4', fin: '#2a4a70', dorsal: .1, dorsalH: .6 }); for (let i = 0; i < 5; i++) b.cone('#f2c83a', [-.35 - i * .1, .2, 0], .025, .06); } },
  { id: 'requin', nom: 'Requin bleu', biomes: ['ocean'], method: 'peche', hab: 'mer', time: 'soir', rare: 3, size: 'XL',
    desc: 'Grand voyageur, il traverse des océans entiers.',
    model: b => { b.ball('#4a6f9a', [0, 0, 0], [1.25, .3, .32]); b.ball('#eef0f2', [.1, -.12, 0], [1, .18, .26]); b.cone('#4a6f9a', [1.3, -.02, 0], .2, .4, [0, 0, -Math.PI / 2], [1, 1, .8]);
      b.cone('#3f6290', [-.05, .48, 0], .22, .55, [0, 0, .45], [1, 1, .2]); b.cone('#3f6290', [-1.5, .25, 0], .14, .7, [0, 0, .9], [1, 1, .2]); b.cone('#3f6290', [-1.4, -.15, 0], .1, .4, [0, 0, 2.3], [1, 1, .2]);
      for (const z of [-1, 1]) { b.ball('#3f6290', [.35, -.22, z * .4], [.4, .04, .15], [0, z * .7, -.4]); b.ball('#111', [1, .08, z * .2], .04); } } },
  { id: 'poissonlune', nom: 'Poisson-lune', biomes: ['ocean'], method: 'peche', hab: 'mer', time: 'jour', weather: 'clair', rare: 3, size: 'XL',
    desc: 'Le plus lourd des poissons osseux ; il se chauffe au soleil en surface.',
    model: b => { b.ball('#a3acb2', [0, 0, 0], [.85, .8, .2]); b.ball('#c9d0d4', [.1, -.2, 0], [.6, .5, .21]); b.cone('#8f989e', [-.4, .95, 0], .22, .8, [0, 0, .25], [1, 1, .25]);
      b.cone('#8f989e', [-.4, -.95, 0], .22, .8, [0, 0, Math.PI - .25], [1, 1, .25]); b.ball('#8f989e', [-.85, 0, 0], [.12, .55, .12]);
      for (const z of [-1, 1]) { b.ball('#f0f0ea', [.55, .25, z * .17], .08); b.ball('#111', [.58, .25, z * .2], .045); } b.ball('#6a7278', [.85, .05, 0], .05); } },
];
export const BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));
export const RARE_W = { 1: 1, 2: .42, 3: .16 };

const geoCache = new Map();
export function speciesGeos(id) {
  if (!geoCache.has(id)) { const b = new Builder(); BY_ID[id].model(b); geoCache.set(id, b.geometries()); }
  return geoCache.get(id);
}
export function speciesModel(id, opts) { return modelFrom(speciesGeos(id), opts); }
