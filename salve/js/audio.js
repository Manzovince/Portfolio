// Enregistrement audio de la dictée (MediaRecorder) et stockage local des fichiers (IndexedDB).
// L'enregistrement suit l'écoute : en pause quand la dictée est en pause, arrêté à l'envoi.

export const audioSupported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

let stream = null;
let rec = null;
let chunks = [];

// Safari enregistre en AAC (mp4), Chrome et Firefox en Opus (webm).
const pickType = () => ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
  .find((t) => MediaRecorder.isTypeSupported?.(t)) || '';

function cleanup() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null; rec = null; chunks = [];
}

export async function startAudio() {
  if (!audioSupported) return false;
  cleanup();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const type = pickType();
    rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.start(1000);
    return true;
  } catch {
    cleanup();
    return false;
  }
}

export function pauseAudio() { if (rec?.state === 'recording') rec.pause(); }
export function resumeAudio() { if (rec?.state === 'paused') rec.resume(); }

// Arrête et renvoie le fichier (ou null s'il n'y a rien).
export function stopAudio() {
  return new Promise((resolve) => {
    if (!rec) { resolve(null); return; }
    const r = rec;
    r.onstop = () => {
      const blob = chunks.length ? new Blob(chunks, { type: r.mimeType || 'audio/mp4' }) : null;
      cleanup();
      resolve(blob);
    };
    try { r.stop(); } catch { cleanup(); resolve(null); }
  });
}

export function discardAudio() {
  try { rec?.stop(); } catch { /* déjà arrêté */ }
  cleanup();
}

/* ---------- Stockage ---------- */
let dbp = null;
const db = () => (dbp ??= new Promise((res, rej) => {
  const r = indexedDB.open('salve-audio', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('audio');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
}));
const run = async (mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction('audio', mode);
    const req = fn(tx.objectStore('audio'));
    tx.oncomplete = () => res(req?.result);
    tx.onerror = () => rej(tx.error);
  });
};
export const saveAudio = (id, blob) => run('readwrite', (s) => s.put(blob, id));
export const loadAudio = (id) => run('readonly', (s) => s.get(id));
export const deleteAudio = (id) => run('readwrite', (s) => s.delete(id)).catch(() => {});
