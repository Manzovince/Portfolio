// Stockage des photos dans IndexedDB (elles restent sur le téléphone, hors ligne).

let dbp;
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('hublot', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const t = d.transaction('photos', mode);
    const r = fn(t.objectStore('photos'));
    t.oncomplete = () => resolve(r && r.result);
    t.onerror = () => reject(t.error);
  }));
}

export const addPhoto = p => tx('readwrite', s => s.add(p));
export const deletePhoto = id => tx('readwrite', s => s.delete(id));
export const getPhoto = id => tx('readonly', s => s.get(id));
export const allPhotos = () => tx('readonly', s => s.getAll()).then(list => list.reverse());
