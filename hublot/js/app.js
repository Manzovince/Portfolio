import { Renderer } from './gl.js?v=1';
import { AutoColor, PRESETS, LABELS, NEUTRAL, withStrength } from './color.js?v=1';
import { Motion } from './motion.js?v=1';
import { addPhoto, allPhotos, deletePhoto, getPhoto } from './store.js?v=1';
import { createDemo } from './demo.js?v=1';

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- Réglages ----------
const DEFAULTS = {
  color: 'auto', strength: 80, gesture: 'off', sens: 5, interval: 5, burst: 5,
  grid: false, level: true, vibrate: true, original: false, tapShoot: false,
  mode: 'single', deviceId: null,
};
const S = (() => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('hublot') || '{}') }; }
  catch { return { ...DEFAULTS }; }
})();
const save = () => { try { localStorage.setItem('hublot', JSON.stringify(S)); } catch {} };

// ---------- État ----------
const video = $('video');
const preview = $('preview');
const renderer = new Renderer(preview);
const capCanvas = document.createElement('canvas');
const capRenderer = new Renderer(capCanvas, { preserve: true });
const thumbCanvas = document.createElement('canvas');
const auto = new AutoColor();
const motion = new Motion();

let stream = null, track = null, demo = null, mirror = false;
let compare = false;          // maintien de la puce couleurs : voir l'original
let quarter = 0;              // orientation physique, en quarts de tour antihoraires
let sessionCount = 0;
let processing = Promise.resolve(), pending = 0;
let bursting = false;
let intervalTimer = null, intervalNext = 0;
let testUntil = 0;
let wakeLock = null;
let hasGravity = false;       // le niveau ne s'affiche qu'une fois les capteurs actifs

// ---------- Couleurs ----------
function colorParams() {
  if (compare || S.color === 'off') return NEUTRAL;
  const p = S.color === 'auto' ? auto.params() : PRESETS[S.color];
  return withStrength(p, S.strength / 100);
}

// ---------- Caméra ----------
async function openCamera() {
  stopCamera();
  const video_c = {
    width: { ideal: 4032 }, height: { ideal: 3024 }, frameRate: { ideal: 60 },
    ...(S.deviceId ? { deviceId: { exact: S.deviceId } } : { facingMode: { ideal: 'environment' } }),
  };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: video_c });
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
  demo = null;
  $('demoTag').hidden = true;
  mirror = /front|avant|user/i.test(track.label) || track.getSettings?.().facingMode === 'user';

  const caps = track.getCapabilities?.() || {};
  $('torchBtn').hidden = !caps.torch;
  $('torchBtn').classList.remove('on');
  if (caps.focusMode?.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});

  const set = track.getSettings?.() || {};
  $('camInfo').textContent = `${track.label || 'Caméra'} · ${set.width || video.videoWidth}×${set.height || video.videoHeight}` +
    (set.frameRate ? ` · ${Math.round(set.frameRate)} i/s` : '');
  listLenses();
}

function stopCamera() {
  stream?.getTracks().forEach(t => t.stop());
  stream = track = null;
}

async function listLenses() {
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput' && d.label);
  const box = $('setLens');
  box.innerHTML = '';
  $('lensBlock').hidden = devices.length < 2;
  const current = track?.getSettings?.().deviceId;
  for (const d of devices) {
    const b = document.createElement('button');
    b.textContent = d.label.replace(/\s*\(.*\)$/, '');
    b.setAttribute('aria-pressed', d.deviceId === current);
    b.onclick = async () => {
      S.deviceId = d.deviceId; save();
      try { await openCamera(); } catch (e) { toast('Objectif indisponible'); }
    };
    box.append(b);
  }
}

function startDemo() {
  stopCamera();
  demo = createDemo();
  mirror = false;
  $('demoTag').hidden = false;
  $('camInfo').textContent = 'Démo : scène de synthèse, aucune caméra utilisée.';
}

function source() {
  if (demo) return { el: demo.canvas, w: demo.width, h: demo.height };
  if (video.readyState >= 2 && video.videoWidth) return { el: video, w: video.videoWidth, h: video.videoHeight };
  return null;
}

// ---------- Viseur ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  preview.width = Math.round(preview.clientWidth * dpr);
  preview.height = Math.round(preview.clientHeight * dpr);
}
addEventListener('resize', resize);

let lastSample = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (demo) demo.tick(t);
  const src = source();
  if (!src) return;
  if (S.color === 'auto' && t - lastSample > 250) { auto.sample(src.el); lastSample = t; }
  renderer.draw(src.el, src.w, src.h, colorParams(), { cover: true, mirror });
}

// ---------- Prise de vue ----------
function feedback() {
  const f = $('flash');
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  const c = $('counter');
  c.textContent = ++sessionCount;
  c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  if (S.vibrate) navigator.vibrate?.(35);
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
  feedback();
  return { bmp, w: src.w, h: src.h, params: colorParams(), quarter: photoQuarter(), mirror, t: Date.now() };
}

const toBlob = (c, q = 0.92) => new Promise(r => c.toBlob(r, 'image/jpeg', q));

async function processShot(s) {
  const odd = s.quarter % 2;
  let ow = odd ? s.h : s.w, oh = odd ? s.w : s.h;
  const k = Math.min(1, capRenderer.maxSize / Math.max(ow, oh));
  capCanvas.width = Math.round(ow * k); capCanvas.height = Math.round(oh * k);

  const versions = [['corrigée', s.params]];
  if (S.original && s.params !== NEUTRAL) versions.push(['originale', NEUTRAL]);
  for (const [kind, params] of versions) {
    capRenderer.draw(s.bmp, s.w, s.h, params, { quarter: s.quarter, cover: false, mirror: s.mirror });
    const tk = 360 / Math.max(capCanvas.width, capCanvas.height);
    thumbCanvas.width = Math.round(capCanvas.width * tk); thumbCanvas.height = Math.round(capCanvas.height * tk);
    thumbCanvas.getContext('2d').drawImage(capCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const blob = await toBlob(capCanvas);
    const thumb = await toBlob(thumbCanvas, 0.8);
    if (!blob) throw new Error('Encodage impossible');
    await addPhoto({ blob, thumb, t: s.t, w: capCanvas.width, h: capCanvas.height, kind });
    if (kind === 'corrigée') setLastThumb(thumb);
  }
  s.bmp.close?.();
}

async function shoot() {
  const s = await grab();
  if (!s) return;
  pending++;
  processing = processing.then(() => processShot(s)).catch(e => toast('Échec : ' + e.message)).finally(() => pending--);
  if (sessionCount === 1) navigator.storage?.persist?.();
}

async function burst() {
  bursting = true;
  document.body.classList.add('running');
  for (let i = 0; i < S.burst && bursting; i++) {
    if (pending >= 3) await processing;
    await shoot();
    await sleep(220);
  }
  bursting = false;
  document.body.classList.remove('running');
}

function startInterval() {
  document.body.classList.add('running');
  const tick = async () => {
    await shoot();
    intervalNext = Date.now() + S.interval * 1000;
    intervalTimer = setTimeout(tick, S.interval * 1000);
  };
  tick();
  updateHandsfree();
}
function stopInterval() {
  clearTimeout(intervalTimer); intervalTimer = null;
  document.body.classList.remove('running');
  updateHandsfree();
}

function trigger() {
  if (S.mode === 'single') shoot();
  else if (S.mode === 'burst') { if (bursting) bursting = false; else burst(); }
  else if (intervalTimer) stopInterval(); else startInterval();
}

// ---------- Orientation, niveau, gestes ----------
const screenAngle = () => (screen.orientation?.angle ?? window.orientation ?? 0);

motion.onGravity = (roll, flat) => {
  hasGravity = true;
  if (!flat) {
    // hystérésis : on ne bascule qu'au-delà de 55° du quart actuel
    const diff = ((roll - quarter * 90 + 540) % 360) - 180;
    if (Math.abs(diff) > 55) quarter = ((Math.round(roll / 90) % 4) + 4) % 4;
  }
  const extra = (((quarter * 90 - screenAngle()) % 360) + 360) % 360;
  document.body.dataset.rot = { 0: '0', 90: '90', 180: '180', 270: '-90' }[extra] ?? '0';
  if (S.level) {
    const lv = $('level');
    const tilt = roll - screenAngle();
    lv.hidden = flat;
    lv.style.transform = `translate(-50%, -50%) rotate(${tilt}deg)`;
    const off = Math.abs(((tilt + 45) % 90 + 90) % 90 - 45);
    lv.classList.toggle('ok', off < 1.5);
  }
};

motion.onTrigger = () => {
  if (Date.now() < testUntil) { toast('Geste reconnu ✓'); navigator.vibrate?.(80); return; }
  trigger();
};
motion.onMeter = r => {
  if ($('settings').hidden) return;
  $('gestureMeter').firstElementChild.style.width = Math.min(100, r * 50) + '%';
};

// Quart de tour à appliquer à la photo, relatif à l'image fournie par le navigateur
function photoQuarter() {
  return (((quarter * 90 - screenAngle()) / 90) % 4 + 4) % 4;
}

// ---------- Interface ----------
let toastTimer;
function toast(msg, ms = 1600) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

const GESTURE_TEXT = {
  knock: 'Toque deux fois sur la coque',
  twist: 'Tourne le poignet (aller-retour)',
};
const GESTURE_NOTE = {
  off: '',
  knock: 'Deux tocs secs avec le doigt sur le caisson, à moins d\'une demi-seconde d\'intervalle. La photo part une fois le téléphone immobile.',
  twist: 'Un aller-retour rapide du poignet, comme pour tourner une clé. La photo part quand le téléphone se stabilise.',

};

function updateHandsfree() {
  const box = $('handsfree');
  let text = '';
  if (intervalTimer) {
    const left = Math.max(0, Math.ceil((intervalNext - Date.now()) / 1000));
    text = `Intervalle ${S.interval} s · prochaine dans ${left} s`;
  } else if (S.gesture !== 'off') text = GESTURE_TEXT[S.gesture];
  box.hidden = !text;
  $('handsfreeLabel').textContent = text;
  box.classList.toggle('armed', !!intervalTimer);
}
setInterval(() => { if (intervalTimer) updateHandsfree(); }, 250);

function applySettings() {
  document.body.dataset.mode = S.mode;
  document.querySelectorAll('.mode').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === S.mode));
  $('shutterText').textContent = S.mode === 'burst' ? S.burst : S.mode === 'interval' ? S.interval + 's' : '';
  $('colorLabel').textContent = LABELS[S.color];
  $('colorChip').classList.toggle('off', S.color === 'off');
  $('grid').hidden = !S.grid;
  $('level').hidden = !S.level || !hasGravity;
  $('strengthOut').textContent = S.strength + ' %';
  $('sensOut').textContent = S.sens + ' / 10';
  $('gestureNote').textContent = GESTURE_NOTE[S.gesture];
  $('gestureMeter').hidden = $('gestureTest').hidden = S.gesture === 'off';
  $('setSens').closest('label').hidden = S.gesture === 'off';
  motion.mode = S.gesture;
  motion.sens = S.sens;
  $('gestureMeter').lastElementChild.style.left = '50%';
  for (const [id, key] of [['setColor', 'color'], ['setGesture', 'gesture'], ['setInterval', 'interval'], ['setBurst', 'burst']]) {
    $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v) === String(S[key])));
  }
  updateHandsfree();
}

function bindSeg(id, key, cast = String) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    S[key] = cast(b.dataset.v); save(); applySettings();
    if (key === 'gesture' && S.gesture !== 'off') motion.enable().then(ok => {
      if (!ok) toast('Capteurs de mouvement refusés : autorise-les dans Réglages > Safari', 3500);
    });
  });
}
bindSeg('setColor', 'color');
bindSeg('setGesture', 'gesture');
bindSeg('setInterval', 'interval', Number);
bindSeg('setBurst', 'burst', Number);

for (const [id, key] of [['setStrength', 'strength'], ['setSens', 'sens']]) {
  $(id).value = S[key];
  $(id).addEventListener('input', e => { S[key] = Number(e.target.value); save(); applySettings(); });
}
for (const [id, key] of [['setGrid', 'grid'], ['setLevel', 'level'], ['setVibrate', 'vibrate'], ['setOriginal', 'original'], ['setTapShoot', 'tapShoot']]) {
  $(id).checked = S[key];
  $(id).addEventListener('change', e => { S[key] = e.target.checked; save(); applySettings(); });
}

document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => {
  if (intervalTimer) stopInterval();
  bursting = false;
  S.mode = b.dataset.mode; save(); applySettings();
}));

// Déclencheur : dès l'appui (doigts mouillés, pas d'attente du relâchement)
$('shutter').addEventListener('pointerdown', e => { e.preventDefault(); trigger(); });
$('viewfinder').addEventListener('pointerdown', () => { if (S.tapShoot) trigger(); });

// Puce couleurs : appui = mode suivant, maintien = comparer avec l'original
{
  const order = ['off', 'auto', 'shallow', 'mid', 'deep'];
  let holdTimer = null;
  const chip = $('colorChip');
  chip.addEventListener('pointerdown', () => {
    holdTimer = setTimeout(() => { holdTimer = null; compare = true; toast('Original', 99999); }, 350);
  });
  const end = cycle => {
    if (holdTimer) {
      clearTimeout(holdTimer); holdTimer = null;
      if (cycle) {
        S.color = order[(order.indexOf(S.color) + 1) % order.length]; save(); applySettings();
        toast('Couleurs : ' + LABELS[S.color]);
      }
    } else if (compare) { compare = false; $('toast').classList.remove('on'); }
  };
  chip.addEventListener('pointerup', () => end(true));
  chip.addEventListener('pointercancel', () => end(false));
  chip.addEventListener('pointerleave', () => end(false));
}

$('torchBtn').addEventListener('click', async () => {
  const on = !$('torchBtn').classList.contains('on');
  try { await track.applyConstraints({ advanced: [{ torch: on }] }); $('torchBtn').classList.toggle('on', on); }
  catch { toast('Lampe indisponible'); }
});

// Verrou anti-gouttes : toute la surface est inerte, sauf le cadenas tenu 2 s
$('lockBtn').addEventListener('click', () => {
  document.body.classList.add('locked');
  $('lock').hidden = false;
  toast('Écran verrouillé');
});
{
  const btn = $('unlockBtn');
  let t = null;
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    btn.classList.add('holding');
    t = setTimeout(() => {
      document.body.classList.remove('locked');
      $('lock').hidden = true;
      btn.classList.remove('holding');
      toast('Déverrouillé');
    }, 2000);
  });
  const cancel = () => { clearTimeout(t); btn.classList.remove('holding'); };
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointercancel', cancel);
  btn.addEventListener('pointerleave', cancel);
  $('lock').addEventListener('pointerdown', e => e.preventDefault());
}

// Télécommandes Bluetooth / clavier
addEventListener('keydown', e => {
  if (!$('start').hidden || !$('viewer').hidden) return;
  if (['Enter', ' ', 'AudioVolumeUp', 'VolumeUp', 'AudioVolumeDown', 'VolumeDown', 'Camera'].includes(e.key)) {
    e.preventDefault();
    if (!e.repeat) trigger();
  }
});

// Feuilles
const openSheet = id => { $(id).hidden = false; };
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => {
  $(b.dataset.close).hidden = true;
  if (b.dataset.close === 'gallery') clearGallery();
}));
$('settingsBtn').addEventListener('click', () => openSheet('settings'));
$('gestureTest').addEventListener('click', async () => {
  if (!await motion.enable()) return toast('Capteurs de mouvement refusés', 2500);
  testUntil = Date.now() + 15000;
  toast('Fais le geste… (15 s)');
});

// ---------- Galerie ----------
let urls = [];
const track_url = b => { const u = URL.createObjectURL(b); urls.push(u); return u; };
function clearGallery() { urls.forEach(URL.revokeObjectURL); urls = []; $('galleryGrid').innerHTML = ''; }

function setLastThumb(blob) {
  const img = $('lastThumb');
  if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
  img.dataset.url = URL.createObjectURL(blob);
  img.src = img.dataset.url;
}

async function openGallery() {
  clearGallery();
  const list = await allPhotos();
  $('galleryCount').textContent = list.length ? `(${list.length})` : '';
  $('galleryEmpty').hidden = list.length > 0;
  $('shareAll').hidden = !list.length;
  const grid = $('galleryGrid');
  for (const p of list) {
    const b = document.createElement('button');
    b.innerHTML = `<img alt="">${p.kind === 'originale' ? '<span class="tag">original</span>' : ''}`;
    b.firstChild.src = track_url(p.thumb);
    b.onclick = () => openViewer(p.id);
    grid.append(b);
  }
  openSheet('gallery');
}
$('galleryBtn').addEventListener('click', openGallery);

const pad = n => String(n).padStart(2, '0');
function fileName(p) {
  const d = new Date(p.t);
  return `hublot-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${p.id}${p.kind === 'originale' ? '-original' : ''}.jpg`;
}
const toFile = p => new File([p.blob], fileName(p), { type: 'image/jpeg', lastModified: p.t });

async function exportPhotos(list) {
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
$('shareAll').addEventListener('click', async () => exportPhotos(await allPhotos()));

let viewing = null;
async function openViewer(id) {
  viewing = await getPhoto(id);
  $('viewerImg').src = track_url(viewing.blob);
  const d = new Date(viewing.t);
  $('viewerInfo').textContent = `${d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })} · ${viewing.w}×${viewing.h} · ${viewing.kind}`;
  $('viewer').hidden = false;
}
$('viewerClose').addEventListener('click', () => { $('viewer').hidden = true; });
$('viewerShare').addEventListener('click', () => exportPhotos([viewing]));
$('viewerDelete').addEventListener('click', async () => {
  if (!confirm('Supprimer cette photo ?')) return;
  await deletePhoto(viewing.id);
  $('viewer').hidden = true;
  const list = await allPhotos();
  if (list[0]) setLastThumb(list[0].thumb); else { $('lastThumb').removeAttribute('src'); }
  openGallery();
});

// ---------- Divers ----------
function clock() {
  const d = new Date();
  $('clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
setInterval(clock, 5000); clock();

async function keepAwake() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !$('start').hidden) return;
  keepAwake();
  // iOS coupe la caméra en arrière-plan : on la relance au retour
  if (!demo && (!track || track.readyState === 'ended')) openCamera().catch(() => {});
});

// Les icônes suivent l'orientation physique
document.querySelectorAll('.thumb, .icon-btn svg, .counter, .shutter-text, .chip').forEach(el => el.classList.add('rot'));

const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (/iP(hone|ad|od)/.test(navigator.userAgent) && !standalone) $('installHint').hidden = false;

async function begin(useDemo) {
  const btn = $('startBtn');
  btn.disabled = true;
  await motion.enable();
  keepAwake();
  try {
    if (useDemo) startDemo();
    else {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('Caméra non disponible ici'), { name: 'NoCamera' });
      await openCamera();
    }
    $('start').hidden = true;
    resize();
  } catch (e) {
    const msg = {
      NotAllowedError: 'Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, puis réessaie.',
      NotFoundError: 'Aucune caméra trouvée sur cet appareil.',
      NotReadableError: 'La caméra est utilisée par une autre app.',
      NoCamera: 'Caméra inaccessible (il faut une connexion https).',
    }[e.name] || `Impossible d'ouvrir la caméra (${e.message}).`;
    $('startError').textContent = msg;
    $('startError').hidden = false;
    $('demoBtn').hidden = false;
    btn.textContent = 'Réessayer';
  }
  btn.disabled = false;
}
$('startBtn').addEventListener('click', () => begin(false));
$('demoBtn').addEventListener('click', () => begin(true));

applySettings();
allPhotos().then(list => { if (list[0]) setLastThumb(list[0].thumb); });
requestAnimationFrame(loop);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
