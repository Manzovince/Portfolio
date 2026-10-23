// Galerie — boucle de jeu : exploration, outils (filet, canne, photo, plongée), bateau, Muséum, sauvegarde.
import { THREE, renderer, scene, camera, U, Builder, modelFrom, inject } from './gfx.js?v=2';
import * as W from './world.js?v=2';
import { updateSky, weatherFor, WEATHER_INFO, setOutdoor, hemi, sun, skyState } from './sky.js?v=2';
import { createPlayer, createBoat, stepWalk, stepBoat, animatePlayer, animateBoat, showTool } from './player.js?v=2';
import { active, updateFauna, removeEntity, prewarm, clearFauna, spawnFishNear } from './fauna.js?v=2';
import { SPECIES, BIOMES, METHODS } from './species.js?v=2';
import { buildMuseum, unloadMuseum, museum, ORIGIN, animateMuseum, nearestAnchor, roomAt, camInside, ROOMS, WINGS } from './museum.js?v=2';
import { timeOk } from './species.js?v=2';
import * as UI from './ui.js?v=2';
import { thumb } from './thumbs.js?v=2';
import { sfx, unlockAudio } from './audio.js?v=2';
import { clamp, lerp } from './util.js?v=2';

const SAVE = 'galerie.save.v1', PHOTOS = 'galerie.photos.v1', HOURS_PER_SEC = 24 / 1200, EN = 128;
const fresh = () => ({ seed: 20261022, day: 1, hour: 8, found: {}, tool: 'filet', p: null, boat: null, inBoat: false, explored: '', tips: {} });
let G = fresh(), photos = {}, hasSave = false;
try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && s.seed) { G = { ...fresh(), ...s }; hasSave = true; } photos = JSON.parse(localStorage.getItem(PHOTOS) || '{}'); } catch { }
const explored = new Uint8Array(EN * EN);
if (G.explored && G.explored.length === EN * EN) for (let i = 0; i < EN * EN; i++) explored[i] = G.explored.charCodeAt(i) === 49 ? 1 : 0;

// ---------- monde ----------
const $ = id => document.getElementById(id);
await new Promise(r => setTimeout(r, 30));
W.generate(G.seed);
const P = createPlayer(), boat = createBoat();
let curRoom = 'hall', talkIdx = 0, busy = false, mode = 'island', inBoat = false, photo = null, fishing = null, camYaw = Math.PI / 2, camPitch = .85, camZoom = 1, running = false, lastIsland = -1, lastBiome = 'prairie';
const spawnFront = () => ({ x: 0, z: W.door.z + 4.5 });
if (G.p && !G.p.indoor) { P.x = G.p.x; P.z = G.p.z; P.ry = G.p.ry; } else { const s = spawnFront(); P.x = s.x; P.z = s.z; P.ry = Math.PI / 2; }
P.y = W.groundAt(P.x, P.z);
if (G.boat) Object.assign(boat, { x: G.boat.x, z: G.boat.z, ry: G.boat.ry }); else Object.assign(boat, { x: W.dockInfo.boat.x, z: W.dockInfo.boat.z, ry: Math.PI / 2 });
if (G.inBoat) { inBoat = true; P.mode = 'boat'; }
W.updateChunks(P.x, P.z, 999, 140);
const camT = new THREE.Vector3(P.x, P.y + 1, P.z);

// lanterne du joueur, allumée la nuit
const lantern = new THREE.PointLight('#ffc77a', 0, 14, 1.5); scene.add(lantern);

// flotteur et ligne de pêche
const bobber = (() => { const b = new Builder(); b.ball('#e2483a', [0, .08, 0], [.16, .12, .16]); b.ball('#ffffff', [0, -.03, 0], [.16, .1, .16]); b.limb('#333', [0, .15, 0], [0, .3, 0], .015); return modelFrom(b.geometries(), { shadow: false }); })();
bobber.visible = false; scene.add(bobber);
const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
const line = new THREE.Line(lineGeo, inject(new THREE.LineBasicMaterial({ color: '#f4f4f4' }))); line.frustumCulled = false; line.visible = false; scene.add(line);

// ---------- écran titre ----------
$('tLoad').classList.add('hidden'); $('tPlay').classList.remove('hidden');
if (hasSave) { $('tPlay').textContent = 'Continuer'; $('tNew').classList.remove('hidden'); }
$('tNew').onclick = () => { if (confirm('Effacer la partie et recommencer ?')) { localStorage.removeItem(SAVE); localStorage.removeItem(PHOTOS); location.reload(); } };
$('tPlay').onclick = () => {
  unlockAudio(); $('title').classList.add('hidden'); UI.showHUD(); running = true;
  UI.setCount(`${Object.keys(G.found).length}/${SPECIES.length}`); setTool(G.tool);
  if (G.p && G.p.indoor) enterMuseum(false);
  else prewarm(P.x, P.z, G.hour, weather());
  once('cam', 'Glisse un doigt pour tourner la caméra, pince pour zoomer.', 4500);
  if (!hasSave) { tip('Le Muséum est vide ! Photographie, pêche et attrape des animaux pour le remplir.', 4500); setTimeout(() => tip('Change d’outil avec 🦋 🎣 📷, puis appuie sur le gros bouton.', 4500), 4600); }
};

UI.setupUI({
  onA: () => handleA(), onTool: n => setTool(n), onShutter: () => shutter(), onPhotoExit: () => exitPhoto(),
  onBook: () => { if (running) UI.openCarnet({ found: G.found, photos, thumb, hour: G.hour, weather: weather() }); },
  onMap: () => { if (running) UI.openMap({ map: W.map, explored, exploredN: EN, half: W.HALF, islands: W.islands, museum: W.museumPos, boat, inBoat, player: mode === 'museum' ? { x: W.door.x, z: W.door.z, ry: 0 } : { x: P.x, z: P.z, ry: P.ry } }); },
  onCall: () => callBoat(),
});
function tip(msg, ms) { UI.toast(msg, ms); }
function once(k, msg, ms) { if (G.tips[k]) return; G.tips[k] = 1; tip(msg, ms); }
const weather = () => weatherFor(G.seed, G.day, G.hour);

function setTool(n) {
  if (photo) return; if (fishing) endFishing(true);
  G.tool = n; UI.setTool(n, P.mode === 'swim');
  if (mode === 'island' && !inBoat) { showTool(P, n); P.toolPose = n; } else if (inBoat && n !== 'filet') { showTool(P, n); P.toolPose = n; } else { showTool(P, null); P.toolPose = null; }
}

// ---------- collecte ----------
function collect(sp, photoUrl) {
  const isNew = !G.found[sp.id], m = METHODS[sp.method];
  if (photoUrl && (isNew || !photos[sp.id])) { photos[sp.id] = photoUrl; try { localStorage.setItem(PHOTOS, JSON.stringify(photos)); } catch { } }
  if (isNew) {
    G.found[sp.id] = { day: G.day, hour: Math.floor(G.hour) }; save(); sfx('new');
    UI.setCount(`${Object.keys(G.found).length}/${SPECIES.length}`);
    UI.showCard(`<span class="new">NOUVELLE ESPÈCE</span>${photoUrl ? `<img class="photo" src="${photoUrl}">` : `<img src="${thumb(sp.id)}">`}
      <h2>${sp.nom}</h2><p>${sp.desc}</p><div class="tag">🏛️ ${m.verbe[0].toUpperCase() + m.verbe.slice(1)} et ajouté au Muséum !</div>`);
    if (Object.keys(G.found).length === 1) setTimeout(() => tip('Va voir ta trouvaille au Muséum 🏛️', 4000), 4500);
    if (Object.keys(G.found).length === SPECIES.length) setTimeout(() => UI.showCard(`<h2>🎉 Collection complète !</h2><p>Les ${SPECIES.length} espèces sont exposées. Le Muséum est magnifique, bravo !</p>`, 8000), 4500);
  } else { sfx('catch'); UI.toast(`${m.emoji} ${sp.nom} — déjà exposé au Muséum.`); }
}

// ---------- filet ----------
let netChecked = true;
function swingNet() { P.swing = .45; netChecked = false; sfx('swing'); }
function checkNet() {
  const hx = P.x + Math.cos(P.ry) * 1.5, hz = P.z + Math.sin(P.ry) * 1.5; let hit = null, wrong = null;
  for (const e of active) {
    if (e.kind !== 'body') continue;
    const d = Math.hypot(e.x - hx, e.z - hz);
    if (d < 1.25 + e.radius * .4 && e.y - P.y < 2.6) { if (e.sp.method === 'filet') { hit = e; break; } else wrong = e; }
  }
  if (hit) { removeEntity(hit); collect(hit.sp); return; }
  if (wrong) { wrong.state = 'flee'; wrong.t = 3; wrong.ry = Math.atan2(wrong.z - P.z, wrong.x - P.x); once('netwrong', `Un ${wrong.sp.nom.toLowerCase()} ne s’attrape pas au filet : prends-le plutôt en photo 📷.`, 4000); }
  for (const e of active) if (e.kind === 'body' && e.sp.hab === 'air' && Math.hypot(e.x - P.x, e.z - P.z) < 4.5 && Math.random() < .6) { e.state = 'flee'; e.t = 2.5; e.ry = Math.atan2(e.z - P.z, e.x - P.x); }
}

// ---------- pêche ----------
const _v = new THREE.Vector3();
function rodTip() { P.tools.canne.updateWorldMatrix(true, false); return P.tools.canne.localToWorld(_v.set(1.6, 1.25, 0)).clone(); }
function cast() {
  const d = inBoat ? 7 : 5.5, x = P.x + Math.cos(P.ry) * d, z = P.z + Math.sin(P.ry) * d;
  if (W.H(x, z) > -.9) { UI.toast('Vise l’eau pour lancer ta ligne 🎣'); return; }
  fishing = { state: 'fly', t: 0, s: rodTip(), x, z, wait: 1.2 + Math.random(), dip: 0 }; P.casting = true; P.busy = true;
  bobber.visible = true; line.visible = true; sfx('swing');
}
function endFishing(scare) {
  if (!fishing) return;
  if (fishing.target && !fishing.target.dead) { fishing.target.lock = false; if (scare) { fishing.target.state = 'flee'; fishing.target.t = 2; fishing.target.ry = Math.atan2(fishing.target.z - fishing.z, fishing.target.x - fishing.x); } }
  fishing = null; bobber.visible = false; line.visible = false; P.casting = false; P.busy = false; UI.bite(null);
}
function updateFishing(dt, t) {
  const f = fishing; if (!f) return;
  if (UI.input.mag > .4 && !inBoat) { endFishing(true); return; }
  f.dip = Math.max(0, f.dip - dt * 3);
  if (f.state === 'fly') {
    f.t += dt / .55; const k = Math.min(1, f.t);
    bobber.position.set(lerp(f.s.x, f.x, k), lerp(f.s.y, .05, k) + Math.sin(k * Math.PI) * 2.5, lerp(f.s.z, f.z, k));
    if (k >= 1) { f.state = 'wait'; sfx('splash'); }
  } else {
    bobber.position.set(f.x, Math.sin(t * 2 + f.x) * .06 - f.dip * .35, f.z);
    if (f.state === 'wait') {
      f.wait -= dt;
      if (f.wait < 0) {
        let best = null, bd = 16;
        for (const e of active) if (e.kind === 'shadow' && !e.lock && e.state !== 'flee') { const d = Math.hypot(e.x - f.x, e.z - f.z); if (d < bd) { bd = d; best = e; } }
        if (best) { best.lock = true; f.target = best; f.state = 'approach'; }
        else { f.wait = 1.2; if ((f.tries = (f.tries || 0) + 1) >= 2 && !spawnFishNear(f.x, f.z, G.hour, weather())) { f.wait = 1e9; UI.toast('Aucun poisson par ici… essaie ailleurs.'); } }
      }
    } else if (f.state === 'approach') {
      const e = f.target; if (e.dead) { f.state = 'wait'; f.target = null; return; }
      const a = Math.atan2(f.z - e.z, f.x - e.x), dd = Math.hypot(f.x - e.x, f.z - e.z); e.ry = a;
      const reach = .3 + e.obj.scale.x * .7;
      if (dd > reach) { e.x += Math.cos(a) * Math.min(dd - reach, 2.2 * dt); e.z += Math.sin(a) * Math.min(dd - reach, 2.2 * dt); }
      else { f.state = 'nibble'; f.nib = 1 + Math.floor(Math.random() * 3); f.t = .8 + Math.random(); }
    } else if (f.state === 'nibble') {
      f.t -= dt;
      if (f.t < 0) { if (f.nib-- > 0) { f.dip = .35; sfx('nibble'); f.t = .7 + Math.random() * 1.2; }
        else { f.state = 'bite'; f.t = { S: .95, M: .9, L: .75, XL: .62 }[f.target.sp.size]; f.dip = 1.2; sfx('bite'); navigator.vibrate?.(120); } }
    } else if (f.state === 'bite') {
      f.dip = 1; f.t -= dt;
      if (f.t < 0) { endFishingMiss(); return; }
    }
  }
  const tip = rodTip(), a = lineGeo.attributes.position.array; tip.toArray(a, 0); bobber.position.toArray(a, 3); a[4] += .2; lineGeo.attributes.position.needsUpdate = true;
  if (f.state === 'bite') { _v.copy(bobber.position); _v.y += 1; _v.project(camera); UI.bite((_v.x * .5 + .5) * innerWidth, (-_v.y * .5 + .5) * innerHeight); } else UI.bite(null);
}
function endFishingMiss() { sfx('miss'); UI.toast('Il s’est échappé… Appuie dès que le flotteur plonge !'); const f = fishing; endFishing(true); }
function hook() {
  const f = fishing;
  if (f.state === 'bite') { const e = f.target; endFishing(false); removeEntity(e); sfx('splash'); collect(e.sp); }
  else { if (f.state === 'nibble') UI.toast('Trop tôt ! Attends que le flotteur coule.'); endFishing(f.state === 'nibble' || f.state === 'approach'); }
}

// ---------- photo ----------
let shot = false;
function enterPhoto() {
  photo = { yaw: P.ry, pitch: -.16 }; UI.photoUI(true); UI.resetZoom(); P.g.visible = false; UI.input.dragX = UI.input.dragY = 0;
  once('photo', 'Cadre bien l’animal entre les coins, assez gros, puis déclenche !', 4000);
}
function exitPhoto() { if (!photo) return; photo = null; UI.photoUI(false); P.g.visible = true; camera.fov = 50; camera.updateProjectionMatrix(); }
function shutter() { if (!photo || shot) return; shot = true; sfx('shutter'); }
function evaluatePhoto() {
  const cw = renderer.domElement.width, ch = renderer.domElement.height, sw = cw * .76, sh = ch * .52;
  const cap = document.createElement('canvas'); cap.width = 360; cap.height = Math.round(360 * sh / sw);
  cap.getContext('2d').drawImage(renderer.domElement, (cw - sw) / 2, ch * .22, sw, sh, 0, 0, cap.width, cap.height);
  UI.flash();
  let best = null, bs = 0, other = null, os = 0; const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  for (const e of active) {
    if (e.dead || !e.obj.visible) continue;
    _v.set(e.x, e.y + (e.kind === 'body' || e.kind === 'large' ? e.radius * .5 : 0), e.z); const dist = camera.position.distanceTo(_v); _v.project(camera);
    if (_v.z > 1 || Math.abs(_v.x) > .82 || Math.abs(_v.y) > .62) continue;
    const size = (e.radius || .3) / (dist * tanH), score = size * (1 - .4 * Math.hypot(_v.x, _v.y));
    if (size < .045) continue;
    if (e.sp.method === 'photo') { if (score > bs) { bs = score; best = e; } } else if (score > os) { os = score; other = e; }
  }
  if (best) { collect(best.sp, cap.toDataURL('image/jpeg', .72)); return; }
  if (other) { const k = other.sp.method; UI.toast(k === 'filet' ? 'Jolie photo ! Mais pour le Muséum, il faut l’attraper au filet 🦋' : k === 'peche' ? 'On ne voit qu’une ombre… essaie la canne à pêche 🎣' : 'Des bulles… plonge pour voir ce qui se cache dessous 🤿', 3500); return; }
  UI.toast('Rien de nouveau sur cette photo… approche-toi ou zoome.');
}

// ---------- plongée ----------
let diveChecked = true;
function dive() { P.dive = 1.4; diveChecked = false; sfx('splash'); }
function checkDive() {
  let best = null, bd = 2.8, near = false;
  for (const e of active) if (e.kind === 'bubbles') { const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } else if (d < 7) near = true; }
  if (best) { removeEntity(best); collect(best.sp); }
  else if (near) UI.toast('Plonge juste au-dessus des bulles !');
}

// ---------- bateau ----------
function landSpot() {
  for (const a of [0, .5, -.5, 1, -1, 1.57, -1.57, 2.3, -2.3, Math.PI]) for (const d of [2.8, 4, 5.5]) {
    const x = boat.x + Math.cos(boat.ry + a) * d, z = boat.z + Math.sin(boat.ry + a) * d, h = W.H(x, z);
    if (h > .15 && h < 4) return { x, z };
  }
  return null;
}
function board() { inBoat = true; P.mode = 'boat'; setTool(G.tool); once('boat', 'Joystick pour naviguer. Approche une côte pour accoster.', 5000); }
function land(s) { inBoat = false; boat.speed = 0; P.x = s.x; P.z = s.z; P.y = W.groundAt(s.x, s.z); P.mode = 'walk'; setTool(G.tool); }
let callSpot = null;
function findCallSpot() {
  if (inBoat || mode !== 'island' || Math.hypot(boat.x - P.x, boat.z - P.z) < 30) return null;
  for (const r of [5, 8, 11]) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if (W.H(x, z) < -2.6) return { x, z }; }
  return null;
}
function callBoat() { if (!callSpot) return; boat.x = callSpot.x; boat.z = callSpot.z; boat.ry = Math.atan2(callSpot.z - P.z, callSpot.x - P.x); boat.speed = 0; sfx('pop'); UI.toast('⛵ Ton bateau t’attend tout près !'); }

// ---------- Muséum ----------
function enterMuseum(withFade = true) {
  const go = () => {
    mode = 'museum'; lantern.intensity = 0; endFishing(); exitPhoto(); inBoat = false; buildMuseum(G.found);
    W.setChunksVisible(false); W.water.visible = false; W.seaFloor.visible = false; setOutdoor(false); clearFauna(); boat.g.visible = false; bobber.visible = false;
    P.x = ORIGIN.x + museum.spawn.x; P.z = ORIGIN.z + museum.spawn.z; P.y = 0; P.ry = -Math.PI / 2; P.mode = 'walk'; showTool(P, null); P.toolPose = null; UI.showTools(false); UI.callBtn(false);
    scene.fog.color.set('#efe2c8'); scene.background = scene.fog.color.clone(); scene.fog.near = 45; scene.fog.far = 130;
    hemi.color.set('#fff1da'); hemi.groundColor.set('#6a4a30'); hemi.intensity = 1.5; sun.color.set('#fff3df'); sun.intensity = 1.4;
    camT.set(P.x, 1.2, P.z); camYaw = Math.PI / 2; camPitch = .6; curRoom = 'hall'; talkIdx = 0;
    sfx('door'); once('museum', 'Bienvenue au Muséum ! Va saluer la conservatrice au comptoir.', 4500);
    setTimeout(() => UI.fade(false), 60);
  };
  if (busy) return; busy = true;
  const run = () => { try { go(); } finally { busy = false; } };
  if (withFade) { UI.fade(true); setTimeout(run, 380); } else run();
}
function exitMuseum() {
  if (busy) return; busy = true;
  UI.fade(true);
  setTimeout(() => {
    mode = 'island'; unloadMuseum(); W.setChunksVisible(true); W.water.visible = true; W.seaFloor.visible = true; setOutdoor(true); boat.g.visible = true; UI.showTools(true);
    const s = spawnFront(); P.x = s.x; P.z = s.z - 1.5; P.ry = Math.PI / 2; P.y = W.groundAt(P.x, P.z); setTool(G.tool); camT.set(P.x, P.y + 1, P.z);
    prewarm(P.x, P.z, G.hour, weather()); sfx('door'); info(null);
    scene.background = null; busy = false;
    setTimeout(() => UI.fade(false), 60);
  }, 380);
}

// ---------- la conservatrice ----------
function curatorLine(i) {
  const n = Object.keys(G.found).length, wx = weather();
  const missing = SPECIES.filter(s => !G.found[s.id]);
  const now = missing.filter(s => timeOk(s, G.hour) && (!s.weather || (s.weather === 'pluie') === (wx === 'pluie')));
  const lines = [
    n === 0 ? 'Bienvenue ! Nos salles sont encore vides… Rapportez-moi des photos et des spécimens de tout l’archipel !' : `Merci pour votre aide ! ${n} espèce${n > 1 ? 's' : ''} sur ${SPECIES.length} sont déjà exposées.`,
    now.length ? (sp => `Un tuyau : en ce moment, on peut croiser ${sp.nom.toLowerCase().startsWith('é') || 'aeiouh'.includes(sp.nom[0].toLowerCase()) ? 'l’' : 'un·e '}${sp.nom.toLowerCase()} du côté ${BIOMES[sp.biomes[0]].nom === 'Grand large' ? 'du grand large' : 'des îles « ' + BIOMES[sp.biomes[0]].nom.toLowerCase() + ' »'}. ${METHODS[sp.method].emoji}`)(now[(G.day * 7 + talkIdx) % now.length])
      : 'Certaines espèces ne sortent qu’à certaines heures, ou sous la pluie. Revenez plus tard !',
    'Le nord de l’archipel est glacial, le sud brûlant. Chaque climat abrite ses propres espèces.',
    'À gauche l’Insectarium, à droite l’Aquarium, et tout droit la Grande Galerie. Bonne visite !',
  ];
  return '<br>' + lines[i % lines.length];
}
function talk() { talkIdx++; sfx('pop'); info(`<b>Céleste, la conservatrice</b>${curatorLine(talkIdx)}`); }

// ---------- action contextuelle ----------
let action = { k: 'none' };
function computeAction() {
  if (mode === 'museum') {
    if (Math.hypot(P.x - (ORIGIN.x + museum.exit.x), P.z - (ORIGIN.z + museum.exit.z)) < 2.6) return { k: 'exit', i: '🚪', l: 'Sortir' };
    if (Math.hypot(P.x - ORIGIN.x, P.z - (ORIGIN.z + .9)) < 2.4) return { k: 'talk', i: '💬', l: 'Parler' };
    return { k: 'none', i: '🏛️', l: '', c: 'off' };
  }
  if (fishing) return fishing.state === 'bite' ? { k: 'hook', i: '❗', l: 'Ferrer !', c: 'alert' } : { k: 'reel', i: '🎣', l: 'Relever' };
  if (P.dive > 0 || P.swing > 0) return { k: 'none', i: '…', l: '', c: 'off' };
  if (inBoat) {
    const s = boat.speed < 3 ? landSpot() : null;
    if (s) return { k: 'land', i: '🏝️', l: 'Accoster', s };
    if (G.tool === 'canne') return { k: 'cast', i: '🎣', l: 'Pêcher' };
    if (G.tool === 'photo') return { k: 'photo', i: '📷', l: 'Viser' };
    return { k: 'none', i: '⛵', l: 'Navigue', c: 'off' };
  }
  if (Math.hypot(P.x - W.door.x, P.z - (W.door.z + .8)) < 2.6) return { k: 'enter', i: '🏛️', l: 'Entrer' };
  if (Math.hypot(P.x - boat.x, P.z - boat.z) < 3.4) return { k: 'board', i: '⛵', l: 'Monter' };
  if (P.mode === 'swim') return { k: 'dive', i: '🤿', l: 'Plonger' };
  if (G.tool === 'filet') return { k: 'net', i: '🦋', l: 'Filet' };
  if (G.tool === 'canne') return { k: 'cast', i: '🎣', l: 'Pêcher' };
  return { k: 'photo', i: '📷', l: 'Viser' };
}
function handleA() {
  if (!running || UI.modalOpen() || photo) return;
  if (UI.cardOpen()) { UI.hideCard(); return; }
  const a = action;
  if (a.k === 'enter') enterMuseum(); else if (a.k === 'exit') exitMuseum();
  else if (a.k === 'board') board(); else if (a.k === 'land') land(a.s);
  else if (a.k === 'dive') dive(); else if (a.k === 'net') swingNet();
  else if (a.k === 'cast') cast(); else if (a.k === 'hook' || a.k === 'reel') hook();
  else if (a.k === 'photo') enterPhoto(); else if (a.k === 'talk') talk();
}

// ---------- sauvegarde ----------
function save() {
  try {
    G.p = { x: P.x, z: P.z, ry: P.ry, indoor: mode === 'museum' }; G.boat = { x: boat.x, z: boat.z, ry: boat.ry }; G.inBoat = inBoat;
    let s = ''; for (let i = 0; i < explored.length; i++) s += explored[i] ? '1' : '0'; G.explored = s;
    localStorage.setItem(SAVE, JSON.stringify(G));
  } catch { }
}
addEventListener('visibilitychange', () => { if (document.hidden && running) save(); });
function markExplored(x, z) {
  const cs = W.HALF * 2 / EN, ci = Math.floor((x + W.HALF) / cs), cj = Math.floor((z + W.HALF) / cs), r = 4;
  for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) if (i >= 0 && j >= 0 && i < EN && j < EN && (i - ci) ** 2 + (j - cj) ** 2 <= r * r) explored[j * EN + i] = 1;
}
function info(html) { UI.info(html); }

// ---------- caméra ----------
function updateCamera(dt) {
  const portrait = innerWidth < innerHeight;
  if (photo) {
    photo.yaw += UI.input.dragX * .005; photo.pitch = clamp(photo.pitch - UI.input.dragY * .004, -.7, .9);
    if (!UI.input.joyActive) { photo.yaw += UI.input.jx * dt * 1.2; photo.pitch = clamp(photo.pitch + UI.input.jy * dt, -.7, .9); }
    P.ry = photo.yaw; if (inBoat) boat.ry = boat.ry;
    const eye = _v.set(P.x, (inBoat ? .4 : P.y) + 1.5, P.z);
    camera.position.copy(eye);
    camera.lookAt(eye.x + Math.cos(photo.pitch) * Math.cos(photo.yaw), eye.y + Math.sin(photo.pitch), eye.z + Math.cos(photo.pitch) * Math.sin(photo.yaw));
    camera.fov = lerp(portrait ? 60 : 50, 12, UI.zoomValue()); camera.updateProjectionMatrix();
    U.uCurve.value = 0; U.uFocus.value = 50; return;
  }
  let target, dist;
  camYaw += UI.input.dragX * .006; camPitch = clamp(camPitch + UI.input.dragY * .004, .25, 1.25);
  camZoom = clamp(camZoom * UI.input.zoom, .5, 1.8); UI.input.zoom = 1;
  if (mode === 'museum') { target = [P.x, 1.2, P.z]; dist = (portrait ? 16 : 13) * camZoom; U.uCurve.value = 0; }
  else if (inBoat) { target = [boat.x, 1.4, boat.z]; dist = (portrait ? 25 : 22) * camZoom; U.uCurve.value = .0024; }
  else { target = [P.x, P.y + 1, P.z]; dist = (portrait ? 21 : 16) * camZoom; U.uCurve.value = .0026; }
  const pitch = mode === 'museum' ? Math.max(camPitch, .8) : camPitch, yaw = camYaw; // au Muséum, vue plongeante façon maison de poupée
  camT.x = lerp(camT.x, target[0], Math.min(1, dt * 7)); camT.y = lerp(camT.y, target[1], Math.min(1, dt * 4)); camT.z = lerp(camT.z, target[2], Math.min(1, dt * 7));
  camera.position.set(camT.x + Math.cos(yaw) * Math.cos(pitch) * dist, camT.y + Math.sin(pitch) * dist, camT.z + Math.sin(yaw) * Math.cos(pitch) * dist);
  if (mode === 'museum') { const r = ROOMS[roomAt(P.x, P.z) || curRoom], m = .8; // la caméra glisse le long des murs de la salle
    camera.position.x = clamp(camera.position.x, ORIGIN.x + r.x0 + m, ORIGIN.x + r.x1 - m);
    camera.position.z = clamp(camera.position.z, ORIGIN.z + r.z0 + m, ORIGIN.z + (r === ROOMS.hall ? r.z1 + 14 : r.z1 - m)); }
  camera.lookAt(camT);
  const fov = portrait ? 52 : 42; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  U.uFocus.value = dist;
}
function worldInput() {
  UI.readKeys(); const { jx, jy, mag } = UI.input;
  let fx = camT.x - camera.position.x, fz = camT.z - camera.position.z; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
  let x = -fz * jx + fx * jy, z = fx * jx + fz * jy; const l = Math.hypot(x, z); if (l > 0) { x /= l; z /= l; }
  return { x, z, mag };
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------- boucle ----------
const clock = new THREE.Clock(); let t = 0, slowT = 0, saveT = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), .05); t += dt; U.uTime.value = t;
  const paused = !running || UI.modalOpen();
  if (!paused) { G.hour += dt * HOURS_PER_SEC; if (G.hour >= 24) { G.hour -= 24; G.day++; } }
  const wx = weather();
  const inp = paused || photo ? { x: 0, z: 0, mag: 0 } : worldInput();
  if (!paused) {
    if (mode === 'island') {
      if (inBoat) { stepBoat(boat, dt, inp); P.x = boat.x - Math.cos(boat.ry) * .5; P.z = boat.z - Math.sin(boat.ry) * .5; P.y = .45 + Math.sin(t * 1.3 + boat.x) * .08; P.ry = photo ? P.ry : boat.ry; P.speed = 0; }
      else if (!photo) { const ev = stepWalk(P, dt, inp, null); if (ev === 'deep') once('deep', 'L’océan devient trop profond pour nager : prends ton bateau ⛵', 4000); }
      if (P.swing > 0) { P.swing -= dt; if (!netChecked && P.swing < .22) { netChecked = true; checkNet(); } }
      if (P.dive > 0) { P.dive -= dt; if (!diveChecked && P.dive < .75) { diveChecked = true; checkDive(); } }
      updateFishing(dt, t);
      updateFauna(dt, { px: P.x, pz: P.z, pspeed: inBoat ? 0 : P.speed, hour: G.hour, weather: wx, t });
    } else {
      stepWalk(P, dt, inp, museum.colliders);
      if (P.z > ORIGIN.z + museum.exitZ) exitMuseum();
      animateMuseum(t, P.x, P.z);
    }
  }
  animatePlayer(P, dt, t); animateBoat(boat, t, inBoat);
  updateCamera(dt); UI.input.dragX = UI.input.dragY = 0;
  if (mode === 'island') {
    updateSky(dt, G.hour, wx, _v.set(P.x, Math.max(P.y, 0), P.z).clone(), camera.position, false, lastBiome === 'banquise');
    lantern.position.set(P.x, P.y + 2.2, P.z); lantern.intensity = skyState.night * 18;
    W.updateWater(camT.x, camT.z); W.updateChunks(P.x, P.z, inBoat ? 2 : 1);
  } else sun.position.set(P.x + 10, 60, P.z + 20), sun.target.position.set(P.x, 0, P.z);
  if (running && !paused) { action = computeAction(); UI.setA(action.i, action.l, action.c); }
  // tâches lentes
  slowT -= dt;
  if (slowT < 0 && running) {
    slowT = .4;
    UI.setTool(G.tool, P.mode === 'swim' || (inBoat && G.tool === 'filet'));
    const h = Math.floor(G.hour), m = Math.floor((G.hour - h) * 60 / 10) * 10, night = G.hour < 6 || G.hour >= 19.5;
    UI.setClock(`Jour ${G.day} · ${h}:${String(m).padStart(2, '0')}`); UI.setWeatherIcon(night ? WEATHER_INFO[wx].nuit : WEATHER_INFO[wx].emoji);
    if (mode === 'island') {
      markExplored(P.x, P.z);
      const isl = !inBoat && P.mode === 'walk' ? W.islandAt(P.x, P.z, .2) : null;
      if (isl && isl.id !== lastIsland) { lastIsland = isl.id; lastBiome = isl.biome; UI.showPlace(isl.name, BIOMES[isl.biome].emoji + ' ' + BIOMES[isl.biome].nom); }
      if (inBoat) { const b = W.biomeAt(P.x, P.z); if (b !== 'ocean') lastBiome = b; }
      callSpot = findCallSpot(); UI.callBtn(!!callSpot);
      info(null);
    } else {
      const r = roomAt(P.x, P.z);
      if (r && r !== curRoom) { curRoom = r; const w = WINGS[r]; UI.showPlace(ROOMS[r].nom, w ? `${w.filter(id => G.found[id]).length} / ${w.length} espèces exposées` : 'Muséum'); }
      const a = nearestAnchor(P.x, P.z);
      if (!a) info(null);
      else if (a.id === '__curator') info(`<b>Céleste, la conservatrice</b>${curatorLine(talkIdx)}`);
      else { const sp = SPECIES.find(s => s.id === a.id), f = G.found[a.id];
        info(f ? `<b>${sp.nom}</b><small>${sp.biomes.map(b => BIOMES[b].emoji + ' ' + BIOMES[b].nom).join(' · ')} — ${METHODS[sp.method].verbe} le jour ${f.day}</small><br>${sp.desc}`
          : `<b>Emplacement vide</b><small>${sp.biomes.map(b => BIOMES[b].emoji + ' ' + BIOMES[b].nom).join(' · ')} · ${METHODS[sp.method].emoji} ${METHODS[sp.method].nom}</small><br>Une espèce manque encore ici…`); }
    }
  }
  saveT -= dt; if (saveT < 0 && running) { saveT = 6; save(); }
  renderer.render(scene, camera);
  if (shot) { shot = false; evaluatePhoto(); }
});
window.__galerie = { get fishing() { return fishing; }, P, boat, G, W, active, input: UI.input, enterMuseum, exitMuseum, collect: id => collect(SPECIES.find(s => s.id === id)), setHour: h => G.hour = h, tp: (x, z) => { P.x = x; P.z = z; } };
