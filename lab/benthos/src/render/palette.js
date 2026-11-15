// Every colour the board uses, in one place.

export const INK = '#2c4746';
export const INK_SOFT = '#5d7573';

export const LINK = {
  water: '#9db4b0',
  fish: '#3f7fa8',
  arm: '#7d5c8d',
};

export const REEF_COLOR = {
  rock: '#7f8a85',
  posidonia: '#4e7a45',
  coral: '#c2635f',
  sponge: '#b0873a',
};

export const CREATURE_COLOR = {
  jellyfish: '#8d6fae',
  turtle: '#3f7a5e',
  shark: '#4a6a80',
};

export const RELIC_COLOR = '#a87b28';

export const reefColor = (key) => REEF_COLOR[key] || INK_SOFT;
export const creatureColor = (key) => CREATURE_COLOR[key] || INK;
