import * as THREE from 'three';
import { hash, rng } from './noise.js?v=1';
import { CELL, heightAt, islandsNear, START } from './world.js?v=1';
import { toon, bake, merge, M, markerMat } from './util.js?v=1';
import { waveHeight } from './water.js?v=1';

const KEY = 'alize.progress.v1';
export const REVEAL_CELL = 50;
const REVEAL_RADIUS = 160;

// Ce qui peut figurer dans le carnet d'observations.
export const SPECIES = [
  { id: 'mouettes', name: 'Mouettes', hint: 'Elles tournent au-dessus des îles.' },
  { id: 'dauphins', name: 'Dauphins', hint: 'Ils accompagnent ceux qui filent au large.' },
  { id: 'baleine', name: 'Baleine', hint: 'Loin des côtes, en eaux profondes.' },
  { id: 'filante', name: 'Étoile filante', hint: 'Lever les yeux, la nuit.' },
  { id: 'brume', name: 'Brume', hint: 'Elle vient sans prévenir.' },
  { id: 'orage', name: 'Orage', hint: 'Le ciel gronde parfois.' },
  { id: 'arc', name: 'Arc-en-ciel', hint: 'Après la pluie, dos au soleil.' },
];

export const MESSAGES = [
  'Si tu lis ceci, la mer a tenu sa promesse. Moi, je n\'ai plus rien à demander.',
  'Les phares éteints ne sont pas morts : ils attendent qu\'on monte les marches.',
  'J\'ai compté quarante vagues avant de m\'endormir. La quarante et unième m\'a bercé.',
  'Les baleines aiment les eaux profondes, loin des côtes. Elles soufflent avant de plonger.',
  'Par temps de brume, écoute les mouettes : la terre n\'est jamais loin.',
  'On ne remonte pas le vent. On l\'apprivoise, de biais, en zigzag.',
  'Les dauphins accompagnent ceux qui vont vite. Hisse bien la voile.',
  'J\'ai laissé mon nom sur une plage. La marée l\'a pris, c\'est mieux ainsi.',
  'Au coucher du soleil, la mer change de couleur trois fois. Je n\'ai jamais su laquelle je préférais.',
  'Après la pluie, tourne le dos au soleil. Il y a parfois un pont au-dessus de l\'eau.',
  'Une île sans nom n\'est pas perdue : elle attend qu\'on passe.',
  'Ma bouteille précédente est partie vers l\'ouest. Celle-ci, je ne sais pas. Bonjour, toi.',
  'Les étoiles filantes passent vite. Fais un vœu avant d\'avoir fini de le penser.',
  'Le vent tourne toujours. Il suffit d\'attendre assez longtemps.',
  'Sur le banc des Sternes, le sable chante quand on marche dessus. Ou alors c\'était moi.',
  'Ici, rien ne presse. Le monde est grand et la mer est patiente.',
  'Si tu trouves le gardien de phare, dis-lui que j\'ai bien reçu sa lumière.',
  'J\'ai vu la mer tout entière devenir argent sous la lune. Je te souhaite la même nuit.',
  'Les orages d\'ici grondent fort mais ne mordent pas.',
  'Dernier message de la caisse. Merci d\'avoir lu jusqu\'ici. Bon vent.',
];

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export class Progress {
  constructor() {
    const d = load();
    this.islands = d.islands || {};
    this.lit = new Set(d.lit || []);
    this.bottles = d.bottles || {};
    this.seen = d.seen || {};
    this.revealed = new Set(d.revealed || []);
    this.dist = d.dist || 0;
    this.boat = d.boat || null;
    this.phase = d.phase ?? null;
    this.dirty = false;
    this.saveTimer = 0;
    this.lastReveal = null;
  }

  save() {
    if (this.cleared) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        islands: this.islands, lit: [...this.lit], bottles: this.bottles, seen: this.seen,
        revealed: [...this.revealed], dist: Math.round(this.dist), boat: this.boat, phase: this.phase,
      }));
    } catch { /* stockage indisponible */ }
    this.dirty = false;
  }

  clear() {
    this.cleared = true;
    try { localStorage.removeItem(KEY); } catch { /* stockage indisponible */ }
  }

  tick(dt) {
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) { this.saveTimer = 4; this.save(); }
  }

  reveal(x, z) {
    if (this.lastReveal && Math.hypot(x - this.lastReveal[0], z - this.lastReveal[1]) < 12) return;
    this.lastReveal = [x, z];
    const n = Math.ceil(REVEAL_RADIUS / REVEAL_CELL);
    const ci = Math.floor(x / REVEAL_CELL), cj = Math.floor(z / REVEAL_CELL);
    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const cx = (ci + i + 0.5) * REVEAL_CELL, cz = (cj + j + 0.5) * REVEAL_CELL;
        if (Math.hypot(cx - x, cz - z) < REVEAL_RADIUS) this.revealed.add((ci + i) + ',' + (cj + j));
      }
    }
  }

  isRevealed(x, z) {
    return this.revealed.has(Math.floor(x / REVEAL_CELL) + ',' + Math.floor(z / REVEAL_CELL));
  }

  // Renvoie l'île nouvellement découverte, s'il y en a une.
  discover(x, z) {
    for (const is of islandsNear(x, z, 40)) {
      if (this.islands[is.id]) continue;
      if (Math.hypot(is.x - x, is.z - z) > is.r * 1.3 + 40) continue;
      this.islands[is.id] = { name: is.name, x: Math.round(is.x), z: Math.round(is.z) };
      return is;
    }
    return null;
  }

  observe(id) {
    const first = !this.seen[id];
    this.seen[id] = (this.seen[id] || 0) + 1;
    return first;
  }

  nextMessage() {
    const n = Object.keys(this.bottles).length;
    return n < MESSAGES.length ? n : Math.floor(Math.random() * MESSAGES.length);
  }
}

// Bouteilles à la mer : au plus une par cellule, posée en eau profonde.
function bottleInCell(ci, cj) {
  if (hash(ci, cj, 777) > 0.42) return null;
  const R = rng(Math.floor(hash(ci, cj, 778) * 4294967296));
  for (let k = 0; k < 12; k++) {
    const x = (ci + 0.1 + R() * 0.8) * CELL, z = (cj + 0.1 + R() * 0.8) * CELL;
    if (Math.hypot(x - START.x, z - START.z) < 120) continue;
    if (heightAt(x, z) < -12) return { id: 'b' + ci + ',' + cj, x, z };
  }
  return null;
}

export class Bottles {
  constructor(scene, progress) {
    this.scene = scene;
    this.progress = progress;
    this.active = new Map();
    const parts = [
      bake(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 6), '#7fc8a8', M([0, 0, 0], [0, 0, Math.PI / 2])),
      bake(new THREE.CylinderGeometry(0.14, 0.24, 0.35, 6), '#7fc8a8', M([0.6, 0, 0], [0, 0, -Math.PI / 2])),
      bake(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 5), '#a87a4e', M([0.85, 0, 0], [0, 0, Math.PI / 2])),
      bake(new THREE.BoxGeometry(0.5, 0.36, 0.2), '#f2e6c4', M([-0.05, 0, 0])),
    ];
    this.geo = merge(parts);
    this.mat = toon(0xffffff, { vertexColors: true });
    this.glintMat = markerMat('#ffffff');
    this.glintGeo = new THREE.OctahedronGeometry(0.32);
    this.lastCell = null;
  }

  update(dt, t, x, z) {
    const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
    const key = ci + ',' + cj;
    if (key !== this.lastCell) {
      this.lastCell = key;
      const keep = new Set();
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const b = bottleInCell(ci + di, cj + dj);
          if (!b || this.progress.bottles[b.id]) continue;
          keep.add(b.id);
          if (this.active.has(b.id)) continue;
          const g = new THREE.Group();
          const m = new THREE.Mesh(this.geo, this.mat);
          m.scale.setScalar(1.8);
          m.castShadow = true;
          g.add(m);
          const glint = new THREE.Mesh(this.glintGeo, this.glintMat);
          glint.position.y = 1.5;
          g.add(glint);
          g.userData = { ...b, glint, spin: hash(ci + di, cj + dj, 5) * 6 };
          this.scene.add(g);
          this.active.set(b.id, g);
        }
      }
      for (const [id, g] of this.active) if (!keep.has(id)) { this.scene.remove(g); this.active.delete(id); }
    }
    for (const g of this.active.values()) {
      const u = g.userData;
      g.position.set(u.x, waveHeight(u.x, u.z, t) + 0.05, u.z);
      g.rotation.set(Math.sin(t * 1.3 + u.spin) * 0.25, t * 0.2 + u.spin, Math.sin(t * 1.7 + u.spin) * 0.2);
      u.glint.visible = Math.sin(t * 2.2 + u.spin) > 0.86;
    }
  }

  // Bouteille repêchée à proximité, retirée de la scène.
  pickup(x, z, d = 5.5) {
    for (const [id, g] of this.active) {
      if (Math.hypot(g.userData.x - x, g.userData.z - z) > d) continue;
      this.scene.remove(g);
      this.active.delete(id);
      const msg = this.progress.nextMessage();
      this.progress.bottles[id] = msg;
      this.progress.save();
      return msg;
    }
    return -1;
  }
}

export { islandsNear };
