// Union-find over string keys, plus the majority rule every group score uses.

export function makeDSU() {
  const parent = new Map();

  const add = (a) => { if (!parent.has(a)) parent.set(a, a); return a; };

  function find(a) {
    add(a);
    let root = a;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(a) !== root) { const next = parent.get(a); parent.set(a, root); a = next; }
    return root;
  }

  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
    return ra;
  }

  function groups() {
    const out = new Map();
    for (const key of parent.keys()) {
      const root = find(key);
      const bucket = out.get(root);
      if (bucket) bucket.push(key);
      else out.set(root, [key]);
    }
    return out;
  }

  return { add, find, union, groups };
}

export const bump = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by);

/**
 * Carcassonne's rule: the group's whole score goes to whoever holds the most
 * slots in it, and a tie pays every tied player in full.
 */
export function majority(counts) {
  let best = 0;
  for (const n of counts.values()) if (n > best) best = n;
  if (best === 0) return [];
  const winners = [];
  for (const [id, n] of counts) if (n === best) winners.push(id);
  return winners;
}
