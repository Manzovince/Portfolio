import { Renderer } from './gl.js?v=2';
import { AutoColor, PRESETS, LABELS, NEUTRAL, withStrength } from './color.js?v=2';
import { Motion } from './motion.js?v=2';
import { addPhoto, allPhotos, deletePhoto, getPhoto, addChunk, finalizeVideo, orphanRecordings } from './store.js?v=2';
import { createDemo } from './demo.js?v=2';

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad = n => String(n).padStart(2, '0');

// ---------- Réglages ----------
const DEFAULTS = {
  color: 'auto', strength: 80, videoQ: '1080', audio: false,
  grid: false, level: true, original: false, mode: 'photo', deviceId: null,
};
const S = (() => {
  try {
    const s = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('hublot') || '{}') };
    if (!['photo', 'video'].includes(s.mode)) s.mode = 'photo'; // anciens modes rafale / intervalle
    return s;
  } catch { return { ...DEFAULTS }; }
})();
const save = () => { try { localStorage.setItem('hublot', JSON.stringify(S)); } catch {} };

// ---------- État ----------
const video = $('video');
const preview = $('preview');
const renderer = new Renderer(preview);
const capCanvas = document.createElement('canvas');
const capRenderer = new Renderer(capCanvas, { preserve: true });
const recCanvas = document.createElement('canvas');
let recRenderer = null;
const thumbCanvas = document.createElement('canvas');
const auto = new AutoColor();
const motion = new Motion();

let stream = null, track = null, demo = null, mirror = false;
let lenses = [];
let compare = false;          // maintien sur le bouton couleurs : voir l'image brute
let quarter = 0;              // orientation physique, en quarts de tour antihoraires
let hasGravity = false;
let processing = Promise.resolve(), pending = 0;
let bursting = false;
let rec = null;               // enregistrement vidéo en cours
let frameDirty = true;

// ---------- Couleurs ----------
function colorParams() {
  if (compare || S.color === 'off') return NEUTRAL;
  const p = S.color === 'auto' ? auto.params() : PRESETS[S.color];
  return withStrength(p, S.strength / 100);
}

// ---------- Caméra ----------
function constraints() {
  const size = S.mode === 'video'
    ? (S.videoQ === '2160'
      ? { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 } }
      : { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } })
    : { width: { ideal: 4032 }, height: { ideal: 3024 }, frameRate: { ideal: 60 } };
  return { ...size, ...(S.deviceId ? { deviceId: { exact: S.deviceId } } : { facingMode: { ideal: 'environment' } }) };
}

async function openCamera() {
  if (demo) return;
  stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: constraints() });
  } catch (e) {
    if (S.deviceId && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError')) {
      S.deviceId = null; save();
      return openCamera();
    }
    throw e;
  }
  track = stream.getVideoTracks()[0];
  video.srcObject = stream;
  await video.play().catch(() => {});
  watchFrames();
  mirror = /front|avant|user/i.test(track.label) || track.getSettings?.().facingMode === 'user';
  const caps = track.getCapabilities?.() || {};
  if (caps.focusMode?.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  const set = track.getSettings?.() || {};
  $('camInfo').textContent = `${track.label || 'Caméra'} · ${set.width || video.videoWidth}×${set.height || video.videoHeight}` +
    (set.frameRate ? ` · ${Math.round(set.frameRate)} i/s` : '');
  await listLenses();
}

function stopCamera() {
  stream?.getTracks().forEach(t => t.stop());
  stream = track = null;
}

// Nom court de l'objectif, à partir du libellé donné par le système
function lensName(label) {
  if (/ultra/i.test(label)) return '0,5×';
  if (/t[ée]l[ée]/i.test(label)) return 'Télé';
  if (/triple|dual|double/i.test(label)) return 'Auto';
  if (/front|avant/i.test(label)) return 'Avant';
  return '1×';
}

async function listLenses() {
  lenses = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput' && d.label);
  $('lensBtn').hidden = lenses.length < 2;
  $('lensBtn').textContent = lensName(track?.label || '');
}

$('lensBtn').addEventListener('click', async () => {
  if (rec || !lenses.length) return;
  const cur = track?.getSettings?.().deviceId;
  const next = lenses[(lenses.findIndex(d => d.deviceId === cur) + 1) % lenses.length];
  S.deviceId = next.deviceId; save();
  try { await openCamera(); } catch { toast('Objectif indisponible'); }
});

function startDemo() {
  stopCamera();
  demo = createDemo();
  mirror = false;
  $('camInfo').textContent = 'Démo : scène de synthèse, aucune caméra utilisée.';
}

function source() {
  if (demo) return { el: demo.canvas, w: demo.width, h: demo.height };
  if (video.readyState >= 2 && video.videoWidth) return { el: video, w: video.videoWidth, h: video.videoHeight };
  return null;
}

// Ne redessiner que quand la caméra livre une nouvelle image (économise la batterie)
function watchFrames() {
  if (!('requestVideoFrameCallback' in video) || video._watching) return;
  video._watching = true;
  const cb = () => { frameDirty = true; video.requestVideoFrameCallback(cb); };
  video.requestVideoFrameCallback(cb);
}

// ---------- Viseur : image entière, jamais recadrée ----------
let layoutKey = '';
function layout(w, h) {
  const W = innerWidth, H = innerHeight;
  const key = `${w}x${h}@${W}x${H}:${S.mode}`;
  if (key === layoutKey) return;
  layoutKey = key;
  const k = Math.min(W / w, H / h);
  const cw = Math.round(w * k), ch = Math.round(h * k);
  const left = Math.round((W - cw) / 2);
  let top = Math.round((H - ch) / 2);
  // en photo, l'image se cale sous la barre du haut et laisse la place aux commandes
  if (S.mode === 'photo') top = Math.min(top, document.querySelector('.top').offsetHeight);
  for (const el of [preview, $('frame')]) Object.assign(el.style, { left: left + 'px', top: top + 'px', width: cw + 'px', height: ch + 'px' });
  const dpr = Math.min(devicePixelRatio || 1, 2);
  preview.width = Math.round(cw * dpr);
  preview.height = Math.round(ch * dpr);
}
addEventListener('resize', () => { layoutKey = ''; });

let lastSample = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (demo) { demo.tick(t); frameDirty = true; }
  const src = source();
  if (!src) return;
  if (!video._watching) frameDirty = true;
  if (!frameDirty) return;
  frameDirty = false;
  layout(src.w, src.h);
  if (S.color === 'auto' && t - lastSample > 250) { auto.sample(src.el); lastSample = t; }
  const params = colorParams();
  renderer.draw(src.el, src.w, src.h, params, { cover: true, mirror });
  if (rec) recRenderer.draw(src.el, src.w, src.h, params, { quarter: rec.quarter, cover: false, mirror });
}

// ---------- Photo ----------
function flash() {
  const f = $('flash');
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
}

async function grab() {
  const src = source();
  if (!src) return null;
  let bmp;
  try { bmp = await createImageBitmap(src.el); }
  catch {
    bmp = document.createElement('canvas');
    bmp.width = src.w; bmp.height = src.h;
    bmp.getContext('2d').drawImage(src.el, 0, 0);
  }
  flash();
  return { bmp, w: src.w, h: src.h, params: colorParams(), quarter: photoQuarter(), mirror, t: Date.now() };
}

const toBlob = (c, type = 'image/jpeg', q = 0.92) => new Promise(r => c.toBlob(r, type, q));

function makeThumb(from) {
  const k = 360 / Math.max(from.width, from.height);
  thumbCanvas.width = Math.round(from.width * k); thumbCanvas.height = Math.round(from.height * k);
  thumbCanvas.getContext('2d').drawImage(from, 0, 0, thumbCanvas.width, thumbCanvas.height);
  return toBlob(thumbCanvas, 'image/jpeg', 0.8);
}

async function processShot(s) {
  const odd = s.quarter % 2;
  const ow = odd ? s.h : s.w, oh = odd ? s.w : s.h;
  const k = Math.min(1, capRenderer.maxSize / Math.max(ow, oh));
  capCanvas.width = Math.round(ow * k); capCanvas.height = Math.round(oh * k);

  const versions = [['corrigée', s.params]];
  if (S.original && s.params !== NEUTRAL) versions.push(['originale', NEUTRAL]);
  for (const [kind, params] of versions) {
    capRenderer.draw(s.bmp, s.w, s.h, params, { quarter: s.quarter, cover: false, mirror: s.mirror });
    const thumbP = makeThumb(capCanvas);
    const blob = await toBlob(capCanvas);
    const thumb = await thumbP;
    if (!blob) throw new Error('encodage impossible');
    await addPhoto({ type: 'photo', blob, thumb, t: s.t, w: capCanvas.width, h: capCanvas.height, kind });
    if (kind === 'corrigée') setLastThumb(thumb);
  }
  s.bmp.close?.();
}

async function shoot() {
  const s = await grab();
  if (!s) return;
  pending++;
  processing = processing.then(() => processShot(s)).catch(e => toast('Échec : ' + e.message)).finally(() => pending--);
  navigator.storage?.persist?.();
}

// Maintenir le déclencheur = rafale
async function burst() {
  bursting = true;
  document.body.classList.add('bursting');
  let n = 1; // la première photo est partie à l'appui
  while (bursting) {
    await sleep(200);
    if (!bursting) break;
    if (pending >= 3) { await processing; continue; }
    await shoot(); n++;
  }
  document.body.classList.remove('bursting');
  toast(`${n} photos`);
}

// ---------- Vidéo ----------
// Le flux enregistré est celui du canvas corrigé, pas celui de la caméra :
// la vidéo a les mêmes couleurs que le viseur.
function pickMime() {
  const list = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return list.find(m => window.MediaRecorder?.isTypeSupported?.(m)) || '';
}

async function startRecording() {
  const src = source();
  if (!src || !window.MediaRecorder || !recCanvas.captureStream) { toast('Vidéo non prise en charge'); return; }
  const q = photoQuarter();
  const w = q % 2 ? src.h : src.w, h = q % 2 ? src.w : src.h;
  const k = Math.min(1, 3840 / Math.max(w, h));
  recCanvas.width = Math.round(w * k) & ~1; recCanvas.height = Math.round(h * k) & ~1; // encodeurs : dimensions paires
  recRenderer ??= new Renderer(recCanvas);
  recRenderer.draw(src.el, src.w, src.h, colorParams(), { quarter: q, cover: false, mirror });
  const thumb = await makeThumb(recCanvas);

  const fps = Math.round(track?.getSettings?.().frameRate || 30);
  const out = recCanvas.captureStream(fps);
  let mic = null;
  if (S.audio) {
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      mic.getAudioTracks().forEach(t => out.addTrack(t));
    } catch { toast('Micro refusé : vidéo sans son'); }
  }
  const mime = pickMime();
  const big = recCanvas.width * recCanvas.height > 3e6;
  let recorder;
  try {
    recorder = new MediaRecorder(out, { ...(mime && { mimeType: mime }), videoBitsPerSecond: big ? 40e6 : 16e6 });
  } catch (e) { toast('Vidéo impossible : ' + e.message); mic?.getTracks().forEach(t => t.stop()); return; }

  const id = Date.now();
  const meta = { thumb, t: id, w: recCanvas.width, h: recCanvas.height, mime: recorder.mimeType || mime || 'video/mp4' };
  let i = 0, writes = Promise.resolve();
  recorder.ondataavailable = e => {
    if (!e.data.size) return;
    const n = i++;
    writes = writes.then(() => addChunk(id, n, e.data, n === 0 ? meta : {})).catch(() => toast('Stockage plein ?'));
  };
  recorder.onstop = async () => {
    out.getTracks().forEach(t => t.stop());
    mic?.getTracks().forEach(t => t.stop());
    await writes;
    const r = await finalizeVideo(id, { duration: (Date.now() - id) / 1000 });
    if (r) { setLastThumb(r.thumb); toast('Vidéo enregistrée'); }
  };
  recorder.start(1000); // un morceau par seconde, écrit au fur et à mesure

  rec = { recorder, quarter: q, start: id };
  document.body.classList.add('recording');
  $('rec').hidden = false;
  tickRec();
  navigator.storage?.persist?.();
}

function stopRecording() {
  if (!rec) return;
  if (rec.recorder.state !== 'inactive') rec.recorder.stop();
  rec = null;
  document.body.classList.remove('recording');
  $('rec').hidden = true;
}

function tickRec() {
  if (!rec) return;
  const s = Math.floor((Date.now() - rec.start) / 1000);
  $('recTime').textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  setTimeout(tickRec, 250);
}

// ---------- Déclencheur ----------
let holdTimer = null;
$('shutter').addEventListener('pointerdown', e => {
  e.preventDefault();
  if (S.mode === 'video') { rec ? stopRecording() : startRecording(); return; }
  shoot(); // dès l'appui, sans attendre le relâchement
  holdTimer = setTimeout(burst, 450);
});
const release = () => { clearTimeout(holdTimer); bursting = false; };
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('shutter').addEventListener(ev, release);

addEventListener('keydown', e => {
  if (!$('start').hidden || !$('viewer').hidden || e.repeat) return;
  if (['Enter', ' ', 'AudioVolumeUp', 'VolumeUp', 'AudioVolumeDown', 'VolumeDown', 'Camera'].includes(e.key)) {
    e.preventDefault();
    if (S.mode === 'video') rec ? stopRecording() : startRecording(); else shoot();
  }
});

// ---------- Orientation et niveau ----------
const screenAngle = () => (screen.orientation?.angle ?? window.orientation ?? 0);
// Quart de tour à appliquer à l'image, relatif à celle fournie par le navigateur
const photoQuarter = () => (((quarter * 90 - screenAngle()) / 90) % 4 + 4) % 4;

motion.onGravity = (roll, flat) => {
  if (!hasGravity) { hasGravity = true; applySettings(); }
  if (!flat) {
    // hystérésis : on ne bascule qu'au-delà de 55° du quart actuel
    const diff = ((roll - quarter * 90 + 540) % 360) - 180;
    if (Math.abs(diff) > 55) quarter = ((Math.round(roll / 90) % 4) + 4) % 4;
  }
  document.body.dataset.rot = { 0: '0', 1: '90', 2: '180', 3: '-90' }[photoQuarter()];
  if (S.level) {
    const lv = $('level');
    const tilt = roll - screenAngle();
    lv.hidden = flat;
    lv.style.transform = `rotate(${tilt}deg)`;
    const off = Math.abs(((tilt + 45) % 90 + 90) % 90 - 45);
    lv.classList.toggle('ok', off < 1.5);
  }
};

// ---------- Interface ----------
let toastTimer;
function toast(msg, ms = 1500) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

function applySettings() {
  document.body.dataset.mode = S.mode;
  document.querySelectorAll('.mode').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === S.mode));
  $('colorLabel').textContent = LABELS[S.color];
  $('colorBtn').classList.toggle('on', S.color !== 'off');
  $('grid').hidden = !S.grid;
  $('level').hidden = !S.level || !hasGravity;
  $('strengthOut').textContent = S.strength + ' %';
  for (const [id, key] of [['setColor', 'color'], ['setVideoQ', 'videoQ']]) {
    $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S[key]));
  }
  layoutKey = '';
}

function bindSeg(id, key, after) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b || S[key] === b.dataset.v) return;
    S[key] = b.dataset.v; save(); applySettings(); after?.();
  });
}
bindSeg('setColor', 'color');
bindSeg('setVideoQ', 'videoQ', () => { if (S.mode === 'video' && !rec) openCamera().catch(() => toast('Qualité indisponible')); });

$('setStrength').value = S.strength;
$('setStrength').addEventListener('input', e => { S.strength = Number(e.target.value); save(); applySettings(); });
for (const [id, key] of [['setGrid', 'grid'], ['setLevel', 'level'], ['setOriginal', 'original'], ['setAudio', 'audio']]) {
  $(id).checked = S[key];
  $(id).addEventListener('change', e => { S[key] = e.target.checked; save(); applySettings(); });
}

document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => {
  if (rec || S.mode === b.dataset.mode) return;
  S.mode = b.dataset.mode; save(); applySettings();
  openCamera().catch(() => toast('Caméra indisponible'));
}));

// Bouton couleurs : appui = mode suivant, maintien = image brute pour comparer
{
  const order = ['off', 'auto', 'shallow', 'mid', 'deep'];
  const btn = $('colorBtn');
  let t = null;
  btn.addEventListener('pointerdown', () => {
    t = setTimeout(() => { t = null; compare = true; toast('Brut', 99999); }, 350);
  });
  const end = cycle => {
    if (t) {
      clearTimeout(t); t = null;
      if (cycle) { S.color = order[(order.indexOf(S.color) + 1) % order.length]; save(); applySettings(); }
    } else if (compare) { compare = false; $('toast').classList.remove('on'); }
  };
  btn.addEventListener('pointerup', () => end(true));
  btn.addEventListener('pointercancel', () => end(false));
  btn.addEventListener('pointerleave', () => end(false));
}

document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => {
  $(b.dataset.close).hidden = true;
  if (b.dataset.close === 'gallery') clearGallery();
}));
$('settingsBtn').addEventListener('click', () => { $('settings').hidden = false; });

// ---------- Galerie ----------
let urls = [];
const objUrl = b => { const u = URL.createObjectURL(b); urls.push(u); return u; };
function clearGallery() { urls.forEach(URL.revokeObjectURL); urls = []; $('galleryGrid').innerHTML = ''; }

function setLastThumb(blob) {
  const img = $('lastThumb');
  if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
  img.dataset.url = URL.createObjectURL(blob);
  img.src = img.dataset.url;
}

const duration = s => `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`;

async function openGallery() {
  if (rec) return;
  clearGallery();
  const list = await allPhotos();
  $('galleryCount').textContent = list.length || '';
  $('galleryEmpty').hidden = list.length > 0;
  $('shareAll').hidden = !list.length;
  for (const p of list) {
    const b = document.createElement('button');
    const tag = p.type === 'video' ? duration(p.duration || 0) : p.kind === 'originale' ? 'brut' : '';
    b.innerHTML = `<img alt="">${tag ? `<span class="tag">${tag}</span>` : ''}`;
    b.firstChild.src = objUrl(p.thumb);
    b.onclick = () => openViewer(p.id);
    $('galleryGrid').append(b);
  }
  $('gallery').hidden = false;
}
$('galleryBtn').addEventListener('click', openGallery);

function fileName(p) {
  const d = new Date(p.t);
  const ext = p.type === 'video' ? (/webm/.test(p.mime) ? 'webm' : 'mp4') : 'jpg';
  return `hublot-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${p.id}${p.kind === 'originale' ? '-brut' : ''}.${ext}`;
}
const toFile = p => new File([p.blob], fileName(p), { type: p.type === 'video' ? (p.mime || 'video/mp4').split(';')[0] : 'image/jpeg', lastModified: p.t });

async function exportFiles(list) {
  const files = list.map(toFile);
  if (navigator.canShare?.({ files })) {
    try { await navigator.share({ files }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f); a.download = f.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    await sleep(300);
  }
}
$('shareAll').addEventListener('click', async () => exportFiles(await allPhotos()));

let viewing = null;
async function openViewer(id) {
  viewing = await getPhoto(id);
  const isVideo = viewing.type === 'video';
  $('viewerImg').hidden = isVideo;
  $('viewerVideo').hidden = !isVideo;
  (isVideo ? $('viewerVideo') : $('viewerImg')).src = objUrl(viewing.blob);
  const d = new Date(viewing.t);
  $('viewerInfo').textContent = `${d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${viewing.w}×${viewing.h}`;
  $('viewer').hidden = false;
}
function closeViewer() {
  $('viewerVideo').pause();
  $('viewerVideo').removeAttribute('src');
  $('viewer').hidden = true;
}
$('viewerClose').addEventListener('click', closeViewer);
$('viewerShare').addEventListener('click', () => exportFiles([viewing]));
$('viewerDelete').addEventListener('click', async () => {
  if (!confirm(viewing.type === 'video' ? 'Supprimer cette vidéo ?' : 'Supprimer cette photo ?')) return;
  await deletePhoto(viewing.id);
  closeViewer();
  const list = await allPhotos();
  if (list[0]) setLastThumb(list[0].thumb); else $('lastThumb').removeAttribute('src');
  openGallery();
});

// ---------- Cycle de vie ----------
async function keepAwake() {
  try { await navigator.wakeLock?.request('screen'); } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { stopRecording(); return; }
  if (!$('start').hidden) return;
  keepAwake();
  // iOS coupe la caméra en arrière-plan : on la relance au retour
  if (!demo && (!track || track.readyState === 'ended')) openCamera().catch(() => {});
});

const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (/iP(hone|ad|od)/.test(navigator.userAgent) && !standalone) $('installHint').hidden = false;

async function begin(useDemo) {
  const btn = $('startBtn');
  btn.disabled = true;
  motion.enable();
  keepAwake();
  try {
    if (useDemo) startDemo();
    else {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: 'NoCamera' });
      await openCamera();
    }
    $('start').hidden = true;
  } catch (e) {
    $('startError').textContent = {
      NotAllowedError: 'Accès à la caméra refusé. Autorise-le dans les réglages de Safari, puis réessaie.',
      NotFoundError: 'Aucune caméra trouvée.',
      NotReadableError: 'La caméra est utilisée par une autre app.',
      NoCamera: 'Caméra inaccessible (connexion https nécessaire).',
    }[e.name] || `Impossible d'ouvrir la caméra (${e.message}).`;
    $('startError').hidden = false;
    $('demoBtn').hidden = false;
    btn.textContent = 'Réessayer';
  }
  btn.disabled = false;
}
$('startBtn').addEventListener('click', () => begin(false));
$('demoBtn').addEventListener('click', () => begin(true));

// Vidéos interrompues (app fermée pendant le tournage) : on les reconstitue
orphanRecordings().then(async ids => {
  for (const id of ids) await finalizeVideo(id, { kind: 'vidéo récupérée' }).catch(() => {});
  if (ids.length) toast(ids.length > 1 ? `${ids.length} vidéos récupérées` : 'Vidéo récupérée', 2500);
}).catch(() => {}).finally(async () => {
  const list = await allPhotos();
  if (list[0]) setLastThumb(list[0].thumb);
});

applySettings();
requestAnimationFrame(loop);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
