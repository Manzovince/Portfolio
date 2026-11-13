// The app's IndexedDB: imported songs and recorded takes. Unlike localStorage
// it has room for long takes, and with navigator.storage.persist() the browser
// keeps it when space runs low.
const NAME = 'octave';
const VERSION = 2;           // 1: songs · 2: + takes
const STORES = ['songs', 'takes'];

let dbPromise = null;
export function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, VERSION);
    request.onupgradeneeded = () => {
      for (const s of STORES) if (!request.result.objectStoreNames.contains(s)) request.result.createObjectStore(s, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB blocked'));
  }).catch(err => { dbPromise = null; throw err; });
  return dbPromise;
}

export async function run(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
}

export const getAll = store => run(store, 'readonly', s => s.getAll());
export const put = (store, value) => run(store, 'readwrite', s => s.put(value));
export const remove = (store, id) => run(store, 'readwrite', s => s.delete(id));

// Ask the browser not to clear Octave's storage on its own (Safari otherwise
// wipes a site's data after 7 days without a visit). Returns true when granted.
export async function persistStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch { return false; }
}
export async function isPersisted() {
  try { return !!(await navigator.storage?.persisted?.()); } catch { return false; }
}
