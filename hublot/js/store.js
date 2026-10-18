// Stockage dans IndexedDB (les fichiers restent sur le téléphone, hors ligne).
// Les vidéos sont écrites morceau par morceau pendant l'enregistrement : si
// l'app est tuée en pleine plongée, ce qui a été filmé est récupéré au lancement.

let dbp;
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('hublot', 2);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      if (!d.objectStoreNames.contains('chunks')) d.createObjectStore('chunks', { keyPath: ['rec', 'i'] });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve(r && r.result);
    t.onerror = () => reject(t.error);
  }));
}

export const addPhoto = p => tx('photos', 'readwrite', s => s.add(p));
export const deletePhoto = id => tx('photos', 'readwrite', s => s.delete(id));
export const getPhoto = id => tx('photos', 'readonly', s => s.get(id));
export const allPhotos = () => tx('photos', 'readonly', s => s.getAll()).then(list => list.reverse());

// ----- morceaux de vidéo -----
const range = rec => IDBKeyRange.bound([rec, 0], [rec, Infinity]);
export const addChunk = (rec, i, blob, meta) => tx('chunks', 'readwrite', s => s.put({ rec, i, blob, ...meta }));
const chunksOf = rec => tx('chunks', 'readonly', s => s.getAll(range(rec)));
const dropChunks = rec => tx('chunks', 'readwrite', s => s.delete(range(rec)));

// Assemble les morceaux en un seul fichier dans la galerie
export async function finalizeVideo(rec, extra = {}) {
  const chunks = await chunksOf(rec);
  if (!chunks.length) return null;
  const first = chunks[0];
  const blob = new Blob(chunks.map(c => c.blob), { type: first.mime });
  const id = await addPhoto({
    type: 'video', blob, thumb: first.thumb, t: first.t, w: first.w, h: first.h, mime: first.mime,
    duration: extra.duration ?? chunks.length, kind: extra.kind ?? 'vidéo',
  });
  await dropChunks(rec);
  return { id, thumb: first.thumb };
}

// Enregistrements interrompus (app fermée ou tuée pendant le tournage)
export async function orphanRecordings() {
  const keys = await tx('chunks', 'readonly', s => s.getAllKeys());
  return [...new Set(keys.map(k => k[0]))];
}
