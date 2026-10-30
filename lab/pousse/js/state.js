// Persistent progress: coin stock, recharge clock, upgrades, album and the board itself.
const KEY = 'pousse.v1';

export const UPG = {
  reserve:  { name: 'Réservoir', desc: '+15 pièces de stock max', icon: 'stack', costs: [60, 130, 240, 400, 650] },
  recharge: { name: 'Recharge', desc: 'Les pièces reviennent 20 % plus vite', icon: 'clock', costs: [50, 110, 210, 360, 560] },
  cadence:  { name: 'Cadence', desc: 'Rafales plus rapides en maintenant', icon: 'turbo', costs: [40, 90, 170, 300] },
  chance:   { name: 'Chance', desc: 'Anneau plus large, roulette plus généreuse', icon: 'clover', costs: [80, 170, 320, 520] },
  etoile:   { name: 'Étoiles', desc: 'Plus de pièces étoile (gagnées = 1 tour)', icon: 'star', costs: [70, 150, 280] },
  rubis:    { name: 'Rubis', desc: 'Chance de lâcher une pièce rubis (vaut 5)', icon: 'gem', costs: [100, 210, 380] },
  bords:    { name: 'Rebords', desc: 'Rallonge les murs : moins de pertes', icon: 'brick', costs: [90, 190, 340, 540] },
  course:   { name: 'Course', desc: 'Le pousseur va plus loin', icon: 'arrows', costs: [120, 260, 460] },
};

export const S = load();

function fresh() {
  return {
    stock: 40, last: Date.now(), regen: 0, xp: 0, lvl: 1,
    up: Object.fromEntries(Object.keys(UPG).map(k => [k, 0])),
    album: {}, spins: 0, sound: true, board: null,
    stats: { dropped: 0, won: 0, jackpots: 0 },
  };
}

function load() {
  const s = fresh();
  if (new URLSearchParams(location.search).has('reset')) { localStorage.removeItem(KEY); history.replaceState(null, '', location.pathname); }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw) Object.assign(s, raw, { up: { ...s.up, ...raw.up }, stats: { ...s.stats, ...raw.stats } });
  } catch {}
  return s;
}

export function save(board) {
  if (board) S.board = board;
  S.last = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

export const maxStock = () => 50 + 15 * S.up.reserve;
export const regenEvery = () => 20 * 0.8 ** S.up.recharge;
export const dropCooldown = () => 0.3 * 0.75 ** S.up.cadence;
export const xpNeed = () => 30 + 15 * S.lvl;

// Coins earned while the app was closed; returns how many were added.
export function offlineRegen() {
  const gone = Math.max(0, (Date.now() - S.last) / 1000);
  if (S.stock >= maxStock()) return 0;
  const total = S.regen + gone;
  const n = Math.min(maxStock() - S.stock, Math.floor(total / regenEvery()));
  S.stock += n;
  S.regen = n > 0 && S.stock >= maxStock() ? 0 : total - n * regenEvery();
  return n;
}
