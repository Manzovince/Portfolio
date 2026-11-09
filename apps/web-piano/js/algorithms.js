// The 32 six-operator algorithms (DX7 numbering). Operators are numbered 1-6
// in the strings, 0-5 in the parsed arrays. Every modulation edge goes from a
// higher-numbered operator to a lower one, so rendering ops 6 → 1 in order
// always has the modulators ready. `fb` is the feedback path: "6>6" is a
// self-loop, "4>6" (alg 4) and "5>6" (alg 6) feed a lower op back up.
const RAW = [
  ['2>1 6>5 5>4 4>3', '1 3', '6>6'],
  ['2>1 6>5 5>4 4>3', '1 3', '2>2'],
  ['3>2 2>1 6>5 5>4', '1 4', '6>6'],
  ['3>2 2>1 6>5 5>4', '1 4', '4>6'],
  ['2>1 4>3 6>5', '1 3 5', '6>6'],
  ['2>1 4>3 6>5', '1 3 5', '5>6'],
  ['2>1 4>3 5>3 6>5', '1 3', '6>6'],
  ['2>1 4>3 5>3 6>5', '1 3', '4>4'],
  ['2>1 4>3 5>3 6>5', '1 3', '2>2'],
  ['3>2 2>1 5>4 6>4', '1 4', '3>3'],
  ['3>2 2>1 5>4 6>4', '1 4', '6>6'],
  ['2>1 4>3 5>3 6>3', '1 3', '2>2'],
  ['2>1 4>3 5>3 6>3', '1 3', '6>6'],
  ['2>1 4>3 5>4 6>4', '1 3', '6>6'],
  ['2>1 4>3 5>4 6>4', '1 3', '2>2'],
  ['2>1 3>1 5>1 4>3 6>5', '1', '6>6'],
  ['2>1 3>1 5>1 4>3 6>5', '1', '2>2'],
  ['2>1 3>1 4>1 5>4 6>5', '1', '3>3'],
  ['2>1 3>2 6>4 6>5', '1 4 5', '6>6'],
  ['3>1 3>2 5>4 6>4', '1 2 4', '3>3'],
  ['3>1 3>2 6>4 6>5', '1 2 4 5', '3>3'],
  ['2>1 6>3 6>4 6>5', '1 3 4 5', '6>6'],
  ['3>2 6>4 6>5', '1 2 4 5', '6>6'],
  ['6>3 6>4 6>5', '1 2 3 4 5', '6>6'],
  ['6>4 6>5', '1 2 3 4 5', '6>6'],
  ['3>2 5>4 6>4', '1 2 4', '6>6'],
  ['3>2 5>4 6>4', '1 2 4', '3>3'],
  ['2>1 5>4 4>3', '1 3 6', '5>5'],
  ['4>3 6>5', '1 2 3 5', '6>6'],
  ['5>4 4>3', '1 2 3 6', '5>5'],
  ['6>5', '1 2 3 4 5', '6>6'],
  ['', '1 2 3 4 5 6', '6>6'],
];

const pair = s => s.split('>').map(n => +n - 1);

export const ALGORITHMS = RAW.map(([edges, carriers, fb]) => {
  const mods = [[], [], [], [], [], []];
  const targets = [[], [], [], [], [], []];
  for (const e of edges.split(' ').filter(Boolean)) {
    const [src, dst] = pair(e);
    mods[dst].push(src);
    targets[src].push(dst);
  }
  const [fbSrc, fbDst] = pair(fb);
  return {
    mods,
    targets,
    carriers: carriers.split(' ').map(n => +n - 1),
    fbSrc,
    fbDst,
  };
});

// Graph layout: carriers on the bottom row, each modulator one row above its
// highest target; columns follow the modulation trees. Ops that modulate
// several targets sit centred over them. Returns {x, y} in grid units.
export function layout(alg) {
  const a = ALGORITHMS[alg];
  const isCarrier = op => a.carriers.includes(op);
  const depth = new Array(6).fill(0);
  for (let op = 0; op < 6; op++) {
    if (isCarrier(op)) continue;
    depth[op] = 1 + Math.max(...a.targets[op].map(t => depth[t]));
  }
  // Recompute in descending order dependency: targets are always lower ops,
  // so a single forward pass already resolved them.
  const children = op => a.mods[op].filter(m => a.targets[m].length === 1);
  const width = op => Math.max(1, children(op).reduce((s, c) => s + width(c), 0));
  const x = new Array(6).fill(0);
  const place = (op, left) => {
    const w = width(op);
    x[op] = left + w / 2;
    let l = left;
    for (const c of children(op).sort((p, q) => p - q)) { place(c, l); l += width(c); }
  };
  let left = 0;
  for (const c of [...a.carriers].sort((p, q) => p - q)) { place(c, left); left += width(c); }
  for (let op = 0; op < 6; op++) {
    if (a.targets[op].length > 1) x[op] = a.targets[op].reduce((s, t) => s + x[t], 0) / a.targets[op].length;
  }
  const rows = Math.max(...depth) + 1;
  return { pos: x.map((v, i) => ({ x: v, y: depth[i] })), cols: left, rows };
}
