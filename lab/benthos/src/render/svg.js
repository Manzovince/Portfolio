export const n = (v) => Math.round(v * 100) / 100;

export function el(tag, attrs = {}, children = '') {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');
  return `<${tag}${a ? ' ' + a : ''}>${children}</${tag}>`;
}

/** Translucent version of a hex colour. */
export function alpha(hex, a) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},${a})`;
}

// --- cubic beziers, so glyphs can ride along a drawn path ------------------
export const cubic = (p0, c1, c2, p1) =>
  `M ${n(p0[0])} ${n(p0[1])} C ${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p1[0])} ${n(p1[1])}`;

export function cubicAt(p0, c1, c2, p1, t) {
  const u = 1 - t;
  const at = (i) => u * u * u * p0[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t * t * t * p1[i];
  return [at(0), at(1)];
}

export function cubicTangent(p0, c1, c2, p1, t) {
  const u = 1 - t;
  const at = (i) => 3 * u * u * (c1[i] - p0[i]) + 6 * u * t * (c2[i] - c1[i]) + 3 * t * t * (p1[i] - c2[i]);
  const d = [at(0), at(1)];
  const len = Math.hypot(d[0], d[1]) || 1;
  return [d[0] / len, d[1] / len];
}

export const degOf = (v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
