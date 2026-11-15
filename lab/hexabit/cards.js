// Rendu SVG des cartes Hexabit, à l'échelle réelle en millimètres (63 × 88, coins de 3 mm).
const W = 63, H = 88, BAND = H / 6, R = 3;
const INK = '#111', PAPER = '#fbfbf8', RULE = '#8a8a8a';

const bit = (v, i) => (v >> (5 - i)) & 1; // i = 0 : bande du haut

// v : valeur imprimée. flip : carte tournée de 180° (ses bandes se lisent alors en miroir).
export function cardSVG(v, { flip = false, cls = '' } = {}) {
  let bands = '';
  for (let i = 0; i < 6; i++) if (bit(v, i)) bands += `<rect x="0" y="${i * BAND}" width="${W}" height="${BAND + 0.05}" fill="${INK}"/>`;
  let rules = '';
  for (let i = 1; i < 6; i++) rules += `<line x1="0" x2="${W}" y1="${i * BAND}" y2="${i * BAND}"/>`;
  // Chaque index prend la couleur inverse de la bande qu'il recouvre.
  const top = bit(v, 0) ? PAPER : INK, bot = bit(v, 5) ? PAPER : INK;
  const face = `
    <g clip-path="url(#hb-clip)">
      <rect width="${W}" height="${H}" fill="${PAPER}"/>${bands}
      <g stroke="${RULE}" stroke-width="0.3" vector-effect="non-scaling-stroke">${rules}</g>
    </g>
    <text x="4" y="10.4" fill="${top}" class="hb-idx">${v}</text>
    <text x="${W - 4}" y="${H - 4.6}" fill="${bot}" class="hb-idx" text-anchor="end">${v}</text>`;
  return `<svg class="card ${cls}" viewBox="0 0 ${W} ${H}" aria-label="carte ${v}${flip ? ' retournée' : ''}">
    <g${flip ? ` transform="rotate(180 ${W / 2} ${H / 2})"` : ''}>${face}</g>
    <rect class="hb-edge" x="0.25" y="0.25" width="${W - 0.5}" height="${H - 0.5}" rx="${R}" fill="none"/>
  </svg>`;
}

// Verso commun : cadre blanc, croisillon de hachures — identique une fois tourné de 180°.
export function backSVG(cls = '') {
  return `<svg class="card back ${cls}" viewBox="0 0 ${W} ${H}" aria-label="dos de carte">
    <g clip-path="url(#hb-clip)"><rect width="${W}" height="${H}" fill="${PAPER}"/>
    <rect x="5" y="5" width="${W - 10}" height="${H - 10}" fill="url(#hb-hatch)"/></g>
    <rect class="hb-edge" x="0.25" y="0.25" width="${W - 0.5}" height="${H - 0.5}" rx="${R}" fill="none"/>
  </svg>`;
}

// Un « registre » : 6 bandes sans index, pour visualiser une valeur qui n'est pas une carte.
export function bandsSVG(v, cls = '') {
  let s = '';
  for (let i = 0; i < 6; i++)
    s += `<rect x="0" y="${i * 10}" width="40" height="10" fill="${bit(v, i) ? INK : PAPER}" stroke="${RULE}" stroke-width="0.4"/>`;
  return `<svg class="bands ${cls}" viewBox="0 0 40 60">${s}</svg>`;
}

// Définitions partagées (masque à coins arrondis, motif de hachures), à insérer une fois.
export const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <clipPath id="hb-clip"><rect width="${W}" height="${H}" rx="${R}"/></clipPath>
  <pattern id="hb-hatch" width="3" height="3" patternUnits="userSpaceOnUse" x="${W / 2 - 1.5}" y="${H / 2 - 1.5}">
    <rect width="3" height="3" fill="${PAPER}"/>
    <path d="M0 0L3 3M3 0L0 3" stroke="${INK}" stroke-width="0.55"/>
  </pattern>
</defs></svg>`;
