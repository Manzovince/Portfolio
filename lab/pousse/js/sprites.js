// 12×12 pixel sprites shared by the roulette screen and the HTML interface.
export const PAL = {
  k: '#1a1033', w: '#ffffff', y: '#ffd23f', o: '#f29e1f', O: '#b8650f',
  r: '#ef3e5c', R: '#9c1f3f', g: '#4ad66d', G: '#1f8a4c', b: '#49b6ff',
  B: '#2a5fd1', p: '#b46cff', P: '#6b34c9', s: '#d9d9ec', S: '#8a8aa8',
  n: '#8b4a2b', c: '#6ff5ff', m: '#ff7ad9',
};

export const SPR = {
  coin: [
    '....kkkk....', '..kkyyyykk..', '.kywwyyyyok.', '.kwyyyyyyok.',
    'kywyyOOyyyok', 'kyyyOyyOyyok', 'kyyyOyyOyyok', 'kyyyyOOyyyok',
    '.kyyyyyyyok.', '.koyyyyyook.', '..kkooookk..', '....kkkk....',
  ],
  star: [
    '.....kk.....', '....kyyk....', '....kyyk....', 'kkkkkywykkkk',
    'kyyyyywyyyyk', '.kyyyyyyyyk.', '..kyyyyyyk..', '..kyyyyyyk..',
    '.kyyyokyyyk.', '.kyyok.kyyk.', 'kyok....kook', 'kkk......kkk',
  ],
  gem: [
    '............', '...kkkkkk...', '..kwrrrrRk..', '.kwrrrrrrRk.',
    'kkkkkkkkkkkk', 'kwrrrrrrrrRk', '.krrrrrrrRk.', '..krrrrrRk..',
    '...krrrRk...', '....krRk....', '.....kk.....', '............',
  ],
  seven: [
    '............', '.kkkkkkkkkk.', '.krrwrrrrrk.', '.kRRRRRRrrk.',
    '.kkkkkkkrRk.', '......krrk..', '.....krRk...', '....krrk....',
    '....krRk....', '...krrk.....', '...krRk.....', '...kkkk.....',
  ],
  cherry: [
    '......kk....', '.....kGk....', '....kGkGk...', '...kGk.kGk..',
    '..kkk...kkk.', '.krrrk.krrrk', 'krwrrrkkwrrk', 'krrrrRkrrrRk',
    'krrrRRkrrRRk', '.kRRRk.kRRk.', '..kkk...kk..', '............',
  ],
  bell: [
    '.....kk.....', '....kyyk....', '...kywyyk...', '..kywyyyok..',
    '..kwyyyyok..', '..kyyyyyok..', '.kyyyyyyyok.', '.kyyyyyyyok.',
    'kooooooooook', 'kkkkkkkkkkkk', '.....kOk....', '......k.....',
  ],
  brick: [
    'kkkkkkkkkkkk', 'kooookoooook', 'kOOOOkOOOOOk', 'kkkkkkkkkkkk',
    'kookoooookok', 'kOOkOOOOOkOk', 'kkkkkkkkkkkk', 'kooookoooook',
    'kOOOOkOOOOOk', 'kkkkkkkkkkkk', 'kookoooookok', 'kkkkkkkkkkkk',
  ],
  bolt: [
    '......kkkk..', '.....kyyyk..', '....kyyyk...', '...kyyyk....',
    '..kyyyykkk..', '.kyyyyyyyk..', '.kkkkyyyk...', '....kyyk....',
    '...kyyk.....', '..kyyk......', '..kyk.......', '..kk........',
  ],
  gift: [
    '...kk..kk...', '..kmmkkmmk..', '...kkmmkk...', 'kkkkkmmkkkkk',
    'kbbbbmmbbbbk', 'kBBBBmmBBBBk', 'kkkkkmmkkkkk', '.kbbbmmbbbk.',
    '.kbbbmmbbbk.', '.kBBBmmBBBk.', '.kBBBmmBBBk.', '.kkkkkkkkkk.',
  ],
  turbo: [
    '............', 'kk....kk....', 'kbk...kbk...', 'kbbk..kbbk..',
    'kbbbk.kbbbk.', 'kbbbbkkbbbbk', 'kBBBBkkBBBBk', 'kBBBk.kBBBk.',
    'kBBk..kBBk..', 'kBk...kBk...', 'kk....kk....', '............',
  ],
  cart: [
    'kk..........', 'kyk.........', '.kkkkkkkkkkk', '.kwyyyyyyyyk',
    '.kyyyyyyyyk.', '..kyyyyyyyk.', '..kooooooook', '...kkkkkkkk.',
    '...k.....k..', '..kkk...kkk.', '..kSk...kSk.', '..kkk...kkk.',
  ],
  book: [
    '.kkkkkkkkk..', 'kpppppppppk.', 'kpPPPPPPPpk.', 'kpPyyyyPPpk.',
    'kpPykkyPPpk.', 'kpPyyyyPPpk.', 'kpPPPPPPPpk.', 'kpppppppppkk',
    'kkkkkkkkkkwk', '.kwwwwwwwwwk', '..kkkkkkkkk.', '............',
  ],
  sound: [
    '............', '.....kk..k..', '....ksk...k.', 'kkkksSk.k.k.',
    'kssssSk..k.k', 'kssssSk..k.k', 'kssssSk..k.k', 'kkkksSk.k.k.',
    '....ksk...k.', '.....kk..k..', '............', '............',
  ],
  mute: [
    '............', '.....kk.....', '....ksk.....', 'kkkksSk.r..r',
    'kssssSk..rr.', 'kssssSk..rr.', 'kssssSk.r..r', 'kkkksSk.....',
    '....ksk.....', '.....kk.....', '............', '............',
  ],
  clock: [
    '...kkkkkk...', '..kwwwwwwk..', '.kwwwkwwwwk.', 'kwwwwkwwwwsk',
    'kwwwwkwwwwsk', 'kwwwwkkkwwsk', 'kwwwwwwwwwsk', 'kwwwwwwwwwsk',
    '.kwwwwwwwsk.', '..kssssssk..', '...kkkkkk...', '............',
  ],
  clover: [
    '..kkk..kkk..', '.kgwgkkgggk.', '.kgggggggGk.', '..kgggggGk..',
    '.kkgggggGkk.', 'kgwgggggggGk', 'kggggGgggGGk', '.kkGGkkGGkk.',
    '....kGk.....', '....kGk.....', '.....kGk....', '......kk....',
  ],
  stack: [
    '..kkkkkkkk..', '.kyywyyyyyk.', '.koooooooOk.', '.kkkkkkkkkk.',
    '.kyywyyyyyk.', '.koooooooOk.', '.kkkkkkkkkk.', '.kyywyyyyyk.',
    '.koooooooOk.', '.kkkkkkkkkk.', '............', '............',
  ],
  arrows: [
    '............', '............', '...k....k...', '..kk....kk..',
    '.kbkkkkkkbk.', 'kbbbbbbbbbbk', '.kbkkkkkkbk.', '..kk....kk..',
    '...k....k...', '............', '............', '............',
  ],
};

export function drawSprite(ctx, name, x, y, s = 1) {
  const rows = SPR[name];
  for (let j = 0; j < 12; j++) {
    const row = rows[j] || '';
    for (let i = 0; i < 12; i++) {
      const c = PAL[row[i]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + i * s, y + j * s, s, s);
    }
  }
}

const cache = new Map();
export function spriteURL(name, s = 4) {
  const key = name + s;
  if (!cache.has(key)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 12 * s;
    drawSprite(cv.getContext('2d'), name, 0, 0, s);
    cache.set(key, cv.toDataURL());
  }
  return cache.get(key);
}
