/* Palettes carried over from the topography generator, plus the few extra
   entity colours the game needs on top of a map. */

export const PALETTES = [
  {
    key: 'paper', name: 'Papier', bg: '#f7f2e6', line: '#8a6b44', index: '#5a4225',
    ramp: ['#efe7d2', '#e6dabb', '#d9caa1', '#c9b78a', '#b6a175', '#9d8961'],
    water: ['#3f6d80', '#8fb6c0'], wind: '#655a4a', shadow: '#3a3228',
    craft: '#1d1a14', craftEdge: '#fbf7ee', gate: '#c0392b', gateOk: '#2f8f4e', thermal: '#d4622a'
  },
  {
    key: 'blueprint', name: 'Blueprint', bg: '#0c2540', line: '#9ed2ff', index: '#eaf6ff',
    ramp: ['#0f3358', '#154270', '#1b5289', '#2263a3', '#2b76bd', '#3a8ad6'],
    water: ['#03101d', '#0b2a45'], wind: '#bfe4ff', shadow: '#02090f',
    craft: '#ffffff', craftEdge: '#06182b', gate: '#ff7a5c', gateOk: '#7dffb0', thermal: '#ffd98a'
  },
  {
    key: 'mono', name: 'Mono', bg: '#101114', line: '#f0f0f0', index: '#ffffff',
    ramp: ['#17181b', '#212327', '#2d2f34', '#3a3d43', '#494c54', '#5a5e67'],
    water: ['#050506', '#141518'], wind: '#ffffff', shadow: '#000000',
    craft: '#ffffff', craftEdge: '#0a0b0d', gate: '#ff5470', gateOk: '#5cff9d', thermal: '#ffd166'
  },
  {
    key: 'forest', name: 'Forêt', bg: '#f1f3ea', line: '#3f5c46', index: '#263a2b',
    ramp: ['#dfe7d2', '#c9d8b6', '#b0c79a', '#c2c390', '#cbb583', '#c3a077'],
    water: ['#456f7f', '#8fb2b8'], wind: '#54604f', shadow: '#26302a',
    craft: '#1b2a1f', craftEdge: '#f3f6ec', gate: '#b5342b', gateOk: '#1f7a44', thermal: '#c2621f'
  },
  {
    key: 'ocean', name: 'Abysses', bg: '#03121e', line: '#54d3de', index: '#c9fbff',
    ramp: ['#062231', '#083247', '#0a445e', '#0c5876', '#0f6e8e', '#1486a6'],
    water: ['#010a12', '#04202f'], wind: '#9be9f2', shadow: '#000508',
    craft: '#e8ffff', craftEdge: '#02101a', gate: '#ff6b8a', gateOk: '#7dffc4', thermal: '#ffd166'
  },
  {
    key: 'neon', name: 'Néon', bg: '#0a0116', line: '#ff45c8', index: '#8affff',
    ramp: ['#150429', '#22073f', '#310a58', '#440f74', '#5a1793', '#7422b3'],
    water: ['#050010', '#100226'], wind: '#ff9de0', shadow: '#02000a',
    craft: '#8affff', craftEdge: '#0a0116', gate: '#ff2d55', gateOk: '#6bff9e', thermal: '#ffe066'
  },
  {
    key: 'ember', name: 'Braise', bg: '#1a0f0a', line: '#ffb066', index: '#ffe6c2',
    ramp: ['#2a150c', '#3d1d0f', '#542512', '#6e2f14', '#8a3b16', '#a84c19'],
    water: ['#0d0705', '#1f100a'], wind: '#ffd0a0', shadow: '#080402',
    craft: '#ffe6c2', craftEdge: '#180d07', gate: '#ff5a3c', gateOk: '#8be27a', thermal: '#ffd166'
  }
];

export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rampColor(stops, t) {
  t = t < 0 ? 0 : t > 0.999999 ? 0.999999 : t;
  const f = t * (stops.length - 1);
  const i = Math.floor(f);
  const k = f - i;
  const a = stops[i], b = stops[Math.min(i + 1, stops.length - 1)];
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k
  ];
}
