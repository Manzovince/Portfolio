'use strict';
/* ---------- paysage : 5 plans en parallaxe, tuiles mises en cache ---------- */
// zoom : 0 lointain, 1 moyen (défaut), 2 proche — change la taille des pixels, l'échelle du sentier et du coureur
const ZOOMS=[{n:'Lointain',mpx:.26,k:1},{n:'Moyen',mpx:.18,k:1.5},{n:'Proche',mpx:.12,k:2}];
let ZOOM=clamp(+(Q.get('zoom')??store.get('zoom',1)),0,2),MPX=ZOOMS[ZOOM].mpx,ZS=1;
const SPD=[.025,.06,.14,.3,.55];
const HAZE=[.5,.36,.22,.11,.03];
const TW=128,MARG=70;
let W=480,H=270,PX=4,RX=170,GY=216,HL=270;   // HL = hauteur du « bandeau » paysage (plus petite que H en portrait)
const P=o=>{const r={};for(const k in o)r[k]=Array.isArray(o[k])?o[k].map(hex):hex(o[k]);return r};
// palettes des plans
const PAL={
  pkFar:P({a:'#8f95b0',b:'#767c9a',c:'#b4b8cc',e:'#eceef5',f:'#c3c8dc'}),
  pkMid:P({a:'#717f90',b:'#5a6779',c:'#93a0ae',e:'#e3e7ee',f:'#aeb7c8',d:'#3f5a52'}),
  pkHigh:P({a:'#7b7f8c',b:'#5f636f',c:'#a3a6b0',e:'#eef1f6',f:'#bcc5d6'}),
  pkSnow:P({a:'#7f88a2',b:'#636c88',c:'#a8b0c6',e:'#f2f5fa',f:'#c8d1e2'}),
  forFar:P({a:'#3e5a4c',b:'#2f4a3e',c:'#557563',d:'#2a4036'}),
  forNear:P({a:'#2e4a3a',b:'#22392d',c:'#466a50',d:'#1c3026'}),
  meadow:P({a:'#7aa055',b:'#6a9049',c:'#9cc06a',d:'#557a3e'}),
  meadowN:P({a:'#6e9a4a',b:'#5e8840',c:'#92ba60',d:'#4a7036'}),
  alp:P({a:'#8eae5c',b:'#7a9c50',c:'#b0ca76',d:'#6b8a48'}),
  rock:P({a:'#8a8b90',b:'#6d6e74',c:'#aaabb0',d:'#57585e'}),
  rockN:P({a:'#7c7b7a',b:'#626160',c:'#9e9c98',d:'#4a4948'}),
  snow:P({a:'#e6ebf3',b:'#c4cfe0',c:'#ffffff',d:'#8a93a6'}),
  cloudS:P({a:'#f2f4fa',b:'#c6cee2',c:'#ffffff'}),
  medFar:P({a:'#9aa4b4',b:'#8892a4',c:'#b2bac6'}),
  lime:P({a:'#cfc8b8',b:'#aca594',c:'#e6e1d4',d:'#7f8458',f:'#96a066'}),
  limeN:P({a:'#d9d2c2',b:'#b4ac9a',c:'#efeadf',d:'#6f7a48',f:'#8a9658'}),
  olive:P({a:'#8a9460',b:'#7a8454',c:'#a6ae74',d:'#666e46'}),
  scrub:P({a:'#7f8a52',b:'#6c7646',c:'#9aa462',d:'#58603a'}),
  sea:P({a:'#3f86a8',b:'#2f6f94',c:'#a8d6e4',d:'#63a6c2'}),
  shore:P({a:'#a99a80',b:'#8c7e66',c:'#c8baa0',d:'#6e6250'}),
  beech:P({a:'#3c5a36',b:'#2e4a2c',c:'#567a46',d:'#263c24'}),
  lake:P({a:'#36708c',b:'#285a74',c:'#c4e2ec',d:'#5a98b2'}),
  river:P({a:'#3a9c9a',b:'#2a7c82',c:'#cdf2ea',d:'#5ec2b6'}),
  ice:P({a:'#d6e6f2',b:'#a6c2da',c:'#ffffff',d:'#58789a'}),
  moraine:P({a:'#8a8680',b:'#6e6a66',c:'#aaa69e',d:'#56524e'}),
  vines:P({a:'#a07c52',b:'#8a6a42',c:'#bc9a6a',d:'#4f7a3a',f:'#6f9a48'}),
  lavf:P({a:'#a08e6a',b:'#8a7a5a',c:'#bcac8a',d:'#6e52a0',f:'#9478c8'}),
  gorge:P({a:'#dcc6a2',b:'#b8a07c',c:'#f0e2c6',d:'#7f8458',f:'#96a066'}),
  cityFar:P({a:'#9aa2b4',b:'#848ca0',c:'#c4ccdc',d:'#e8e0b0'}),
  cityMid:P({a:'#7e8698',b:'#6a7184',c:'#a8b0c2',d:'#f0e4a0'}),
  park:P({a:'#6e9a4a',b:'#5e8840',c:'#8eb860',d:'#4a7036'}),
  dune:P({a:'#e2b878',b:'#c4925a',c:'#f2d4a0',d:'#a87448'}),
  duneFar:P({a:'#dcb888',b:'#c49c74',c:'#ecd2a8',d:'#b08a64'}),
  mesa:P({a:'#c4643a',b:'#a24a2c',c:'#e08a54',d:'#8a3a24',f:'#d8a070'}),
  redrock:P({a:'#b86a42',b:'#9a5434',c:'#d48a5a',d:'#7a3e28',f:'#8a9a5a'}),
  savGrass:P({a:'#c8a854',b:'#a88a40',c:'#e0c878',d:'#8a7a3a'}),
  savFar:P({a:'#9aa4a0',b:'#86908e',c:'#b4bcb4'}),
  jungleFar:P({a:'#5a8a6a',b:'#4a7a5c',c:'#78a482',d:'#3e6a50'}),
  jungle:P({a:'#22522e',b:'#1a4226',c:'#3a7a3a',d:'#123420'}),
  cone:P({a:'#6a5e5a',b:'#524844',c:'#8a7c76',e:'#6a5e5a',f:'#524844'}),
  fstone:P({a:'#e6dcc6',b:'#c8bca4',c:'#8a9aae',d:'#4a5668',e:'#6e7e94',f:'#b8483a'}),
  fstone2:P({a:'#dcd0b8',b:'#bcae94',c:'#7e8ea4',d:'#3e4a5c',e:'#66768c',f:'#3a6a4a'}),
  snowForest:P({a:'#e4ecf4',b:'#c4d2e2',c:'#ffffff',d:'#2a4636'}),
  tropSea:P({a:'#2ab4c4',b:'#1a8eb0',c:'#e0fffa',d:'#6adcd8'}),
  tropFar:P({a:'#7ab8c0',b:'#6aa4b0',c:'#9acdd0'}),
  streetM:P({a:'#c8a88a',b:'#a8886a',c:'#e0ccb4',d:'#3a4250',e:'#5a6a80',f:'#c84a3a'}),
  streetM2:P({a:'#b8bcc4',b:'#9aa0aa',c:'#dadee4',d:'#2e3644',e:'#4a5a70',f:'#2a8a6a'}),
  streetF:P({a:'#eadfc8',b:'#d2c4a8',c:'#7e8ea4',d:'#3a4658',e:'#66768c',f:'#a83a32'}),
  streetF2:P({a:'#e2d4b8',b:'#c8b898',c:'#74849a',d:'#344050',e:'#5e6e84',f:'#2e5e48'}),
  sand:P({a:'#f0e2c0',b:'#dcc89e',c:'#fff4dc',d:'#c8b088'}),
  lavaRock:P({a:'#3a3434',b:'#2a2626',c:'#5a5250',d:'#1e1a1a',f:'#f0702a'})
};
// essences d'arbres (sombre, moyen, clair, tronc)
const TREE={
  pine:P({d:'#2a4636',m:'#3a5c48',l:'#557a5c',t:'#4a3a30'}),
  larch:P({d:'#5f8446',m:'#7ea052',l:'#a0c06a',t:'#5a4434'}),
  larchA:P({d:'#a8681e',m:'#d0922c',l:'#f0c050',t:'#5a4434'}),
  leafy:P({d:'#45703a',m:'#5f9046',l:'#86b258',t:'#5a4434'}),
  leafyA:P({d:'#9a4424',m:'#c8682a',l:'#eaa03c',t:'#5a4434'}),
  olive:P({d:'#5f6e52',m:'#7f8e68',l:'#a6b284',t:'#6a5a48'}),
  cypress:P({d:'#26402e',m:'#34543a',l:'#4c7048',t:'#4a3a30'}),
  umbr:P({d:'#36553a',m:'#4c7244',l:'#6c9450',t:'#7a5a40'}),
  bush:P({d:'#56663e',m:'#6f8048',l:'#90a05a',t:'#5a4a38'}),
  rockT:P({d:'#5c5e64',m:'#7e8086',l:'#a2a4a8',t:'#45464a'}),
  chalet:P({d:'#5a3a26',m:'#8a5a36',l:'#b07c4c',t:'#54545c'}),
  palm:P({d:'#3a6a2a',m:'#5a8a34',l:'#86b04a',t:'#9a7a4a'}),
  acacia:P({d:'#4a5a2a',m:'#667a36',l:'#8a9a48',t:'#4a3a2a'}),
  saguaro:P({d:'#3a5a30',m:'#4f7a3e',l:'#6e9a52',t:'#3a5a30'}),
  jtree:P({d:'#1e4a2a',m:'#2e6a34',l:'#4a8e3e',t:'#5a4a36'}),
  spine:P({d:'#22402e',m:'#33573f',l:'#f4f8fc',t:'#4a3a30'})
};
const autumn=()=>{const s=store.get('saison',null)||season();return s==='automne'};
const L=(kind,amp,fr,pal,o={})=>Object.assign({kind,amp,fr,pal},o);
// pour chaque biome : 5 plans du plus loin au plus proche
const LAY={
  prairie:[L('peaks',.22,1.4,PAL.pkFar,{snow:.5}),L('peaks',.13,2.2,PAL.pkMid,{snow:.8,tl:.5}),L('forest',.06,3,PAL.forFar,{it:[['pine',.9,.5]]}),
    L('hills',.05,2.4,PAL.meadow,{tex:'fields',it:[['chalet',.06,.9],['pine',.35,.8],['leafy',.35,.8]],fill:[['leafy',.12,.55],['chalet',.03,.6]]}),L('hills',.03,3,PAL.meadowN,{tex:'fields',it:[['leafy',.35,1],['pine',.25,1.1],['chalet',.03,1]],fill:[['leafy',.1,.7],['pine',.06,.7]]})],
  foret:[L('peaks',.22,1.4,PAL.pkFar,{snow:.5}),L('peaks',.15,2.2,PAL.pkMid,{snow:.75,tl:.75}),L('forest',.08,3,PAL.forFar,{it:[['pine',1,.6]]}),
    L('forest',.07,3.4,PAL.forNear,{it:[['pine',1,.85],['larch',.12,.85]]}),L('forest',.05,3.8,PAL.forNear,{it:[['pine',.85,1.25],['larch',.1,1.2]]})],
  alpage:[L('peaks',.27,1.3,PAL.pkFar,{snow:.42}),L('peaks',.17,2,PAL.pkMid,{snow:.55,tl:.18}),L('hills',.07,2.2,PAL.alp,{tex:'alp',it:[['larch',.08,.6],['rockT',.08,.5]],fill:[['rockT',.08,.4],['larch',.05,.5]]}),
    L('hills',.05,2.6,PAL.alp,{tex:'alp',it:[['rockT',.12,.7],['chalet',.025,.8],['larch',.06,.8]],fill:[['rockT',.1,.5],['chalet',.015,.6]]}),L('hills',.035,3,PAL.meadowN,{tex:'alp',it:[['larch',.14,1.1],['rockT',.16,.9]],fill:[['rockT',.1,.7]]})],
  crete:[L('peaks',.2,1.5,PAL.pkFar,{snow:.32}),L('peaks',.16,2.4,PAL.pkHigh,{snow:.45}),L('rock',.09,3,PAL.rock),L('rock',.06,3.6,PAL.rock,{it:[['rockT',.2,.7]]}),L('rock',.035,4,PAL.rockN,{it:[['rockT',.25,.9]]})],
  sommet:[L('peaks',.17,1.6,PAL.pkSnow,{snow:.38,bs:-.03}),L('clouds',.035,2.2,PAL.cloudS,{bs:-.02}),L('snow',.045,2.4,PAL.snow,{bs:.06}),L('snow',.045,3,PAL.snow,{bs:.02,it:[['rockT',.1,.6]]}),L('snow',.025,3.6,PAL.snow,{it:[['rockT',.14,.8]]})],
  garrigue:[L('hills',.06,1.5,PAL.medFar),L('cliff',.1,2,PAL.lime),L('hills',.06,2.6,PAL.olive,{tex:'grove',it:[['olive',.35,.6],['cypress',.1,.7]]}),
    L('hills',.045,3,PAL.scrub,{tex:'scrub',it:[['bush',.5,.8],['olive',.15,.85],['cypress',.06,.9]],fill:[['olive',.08,.55],['cypress',.04,.6]]}),L('hills',.03,3.4,PAL.scrub,{tex:'scrub',it:[['umbr',.1,1.1],['bush',.35,1],['olive',.08,1.1]],fill:[['umbr',.04,.8],['olive',.06,.75]]})],
  falaise:[L('hills',.03,1.8,PAL.medFar,{bs:.03}),L('sea',0,1,PAL.sea,{bs:.01}),L('cliff',.12,2.2,PAL.lime,{bs:.02}),
    L('cliff',.07,2.8,PAL.limeN,{it:[['umbr',.08,.8],['bush',.3,.7]]}),L('hills',.03,3.4,PAL.scrub,{tex:'scrub',it:[['bush',.4,1],['umbr',.1,1.15]],fill:[['umbr',.05,.8]]})],
  cote:[L('hills',.028,1.8,PAL.medFar,{bs:.03}),L('sea',0,1,PAL.sea,{bs:0}),L('sea',0,1,PAL.sea,{bs:.06}),
    L('rock',.022,3.4,PAL.shore,{bs:.02,it:[['bush',.15,.7]]}),L('hills',.02,3.6,PAL.scrub,{tex:'scrub',bs:-.005,it:[['bush',.3,1],['umbr',.07,1.1],['cypress',.03,1]],fill:[['umbr',.04,.8]]})]
};
Object.assign(LAY,{
  hetraie:[L('peaks',.2,1.4,PAL.pkFar,{snow:.55}),L('peaks',.12,2.2,PAL.pkMid,{snow:.85,tl:.6}),L('forest',.06,3,PAL.forFar,{it:[['pine',.6,.55],['leafy',.5,.5]]}),
    L('forest',.06,3.2,PAL.beech,{it:[['leafy',1,.8]]}),L('forest',.045,3.6,PAL.beech,{it:[['leafy',.9,1.15]]})],
  lac:[L('peaks',.28,1.3,PAL.pkFar,{snow:.38}),L('peaks',.18,2,PAL.pkMid,{snow:.5,tl:.1}),L('sea',0,1,PAL.lake,{bs:.02}),
    L('hills',.03,2.8,PAL.alp,{tex:'alp',bs:.02,it:[['rockT',.15,.7],['larch',.05,.8]]}),L('hills',.02,3.4,PAL.meadowN,{tex:'alp',bs:.0,it:[['rockT',.2,.9]],fill:[['rockT',.08,.6]]})],
  glacier:[L('peaks',.22,1.4,PAL.pkSnow,{snow:.25,bs:-.02}),L('ice',.12,2.2,PAL.ice,{bs:-.01}),L('rock',.07,3,PAL.moraine),
    L('ice',.05,3.2,PAL.ice,{bs:.01,it:[['rockT',.08,.6]]}),L('rock',.03,4,PAL.moraine,{it:[['rockT',.3,.8]]})],
  vignes:[L('hills',.05,1.6,PAL.medFar),L('hills',.07,2,PAL.olive,{it:[['cypress',.12,.6],['chalet',.04,.6]]}),L('hills',.06,2.4,PAL.vines,{tex:'vines',it:[['cypress',.08,.7],['olive',.05,.6]]}),
    L('hills',.045,2.8,PAL.vines,{tex:'vines',it:[['chalet',.03,.8],['cypress',.06,.85]]}),L('hills',.03,3.2,PAL.vines,{tex:'vines',it:[['olive',.08,1],['cypress',.05,1]]})],
  lavande:[L('hills',.05,1.5,PAL.medFar),L('cliff',.06,1.8,PAL.lime),L('hills',.05,2.2,PAL.lavf,{tex:'lav',it:[['bush',.1,.5],['chalet',.03,.6]]}),
    L('hills',.04,2.6,PAL.lavf,{tex:'lav',it:[['olive',.06,.8],['chalet',.03,.8]]}),L('hills',.025,3,PAL.lavf,{tex:'lav',it:[['umbr',.05,1],['olive',.06,1]]})],
  gorges:[L('hills',.05,1.6,PAL.medFar),L('cliff',.17,2,PAL.gorge,{bs:-.02,it:[['umbr',.05,.5]]}),L('sea',0,1,PAL.river,{bs:.05}),
    L('cliff',.1,2.6,PAL.gorge,{bs:.03,it:[['bush',.3,.7],['umbr',.06,.8]]}),L('hills',.03,3.4,PAL.scrub,{tex:'scrub',it:[['bush',.35,1],['umbr',.06,1.1]]})]
});
Object.assign(LAY,{
  vieilleville:[L('hills',.05,1.6,PAL.medFar),L('fcity',.14,1,PAL.fstone,{bw:16}),L('fcity',.11,1,PAL.fstone2,{bw:20,bs:.02}),
    L('street',.2,1,PAL.streetF2,{bw:30,bs:.2,fixed:1}),L('street',.17,1,PAL.streetF,{bw:40,bs:.145,fixed:1})],
  foretneige:[L('peaks',.24,1.4,PAL.pkSnow,{snow:.15}),L('peaks',.15,2.2,PAL.pkSnow,{snow:.2}),L('forest',.07,3,PAL.snowForest,{it:[['spine',1,.55]]}),
    L('forest',.06,3.4,PAL.snowForest,{it:[['spine',1,.8]]}),L('forest',.045,3.8,PAL.snowForest,{it:[['spine',.85,1.2]]})],
  plage:[L('hills',.035,1.6,PAL.tropFar,{bs:.02,it:[['palm',.1,.4]]}),L('sea',0,1,PAL.tropSea,{bs:0}),L('sea',0,1,PAL.tropSea,{bs:.06}),
    L('hills',.018,3,PAL.sand,{bs:.03,it:[['palm',.25,.85]]}),L('hills',.015,3.4,PAL.sand,{bs:.005,it:[['palm',.3,1.15]]})],
  ville:[L('hills',.05,1.6,PAL.medFar),L('city',.16,1,PAL.cityFar,{bw:12}),L('city',.1,1,PAL.cityMid,{bw:18,bs:.02}),
    L('street',.26,1,PAL.streetM2,{bw:32,bs:.2,fixed:1}),L('street',.2,1,PAL.streetM,{bw:42,bs:.145,fixed:1})],
  desert:[L('mesa',.07,1.4,PAL.duneFar,{bs:-.02}),L('dunes',.08,1.6,PAL.duneFar),L('dunes',.07,2,PAL.dune),L('dunes',.05,2.5,PAL.dune,{it:[['palm',.02,.8]]}),L('dunes',.035,3,PAL.dune)],
  canyon:[L('mesa',.12,1.2,PAL.duneFar,{bs:-.02}),L('mesa',.16,1.6,PAL.mesa),L('mesa',.1,2,PAL.mesa,{bs:.02}),L('rock',.05,3,PAL.redrock,{it:[['saguaro',.12,.8],['bush',.1,.6]]}),L('hills',.03,3.4,PAL.redrock,{it:[['saguaro',.15,1.1],['bush',.2,.9]]})],
  savane:[L('hills',.04,1.2,PAL.savFar),L('hills',.035,1.6,PAL.savGrass,{it:[['acacia',.18,.6]]}),L('hills',.04,2,PAL.savGrass,{tex:'sav',it:[['acacia',.25,.8]]}),
    L('hills',.03,2.4,PAL.savGrass,{tex:'sav',it:[['acacia',.2,1],['bush',.12,.8]]}),L('hills',.02,2.8,PAL.savGrass,{tex:'sav',it:[['acacia',.12,1.2],['bush',.15,1]]})],
  jungle:[L('peaks',.2,2,PAL.jungleFar,{tl:1}),L('forest',.1,2.6,PAL.jungleFar,{it:[['jtree',.9,.6]]}),L('forest',.08,3,PAL.jungle,{it:[['jtree',1,.8],['palm',.15,.8]]}),
    L('forest',.06,3.4,PAL.jungle,{it:[['jtree',.9,1],['palm',.2,1]]}),L('forest',.04,3.8,PAL.jungle,{it:[['jtree',.8,1.3],['palm',.25,1.2]]})],
  volcan:[L('cone',.3,1,PAL.cone,{bs:-.02}),L('rock',.08,2.2,PAL.lavaRock,{lava:1}),L('rock',.07,2.8,PAL.lavaRock,{lava:1}),L('rock',.05,3.2,PAL.lavaRock,{lava:1,it:[['bush',.1,.6]]}),L('rock',.03,3.6,PAL.lavaRock,{it:[['bush',.15,.9]]})]
});
const BASE=[.47,.55,.62,.69,.755];
// plus on dézoome, plus les plans se resserrent vers l'horizon (et les plans proches rapetissent)
const ZSPREAD=[.6,.8,1];
const layerY=(li,bs=0)=>GY-(.9-BASE[li]-bs)*HL*ZSPREAD[ZOOM];
const layerAmp=li=>lerp(1,ZSPREAD[ZOOM],li/4);
const HZ={alpes:hex('#c5ccda'),med:hex('#dcd8cc'),exo:hex('#e2d6c4')};

function profile(sp,lx,seed){
  const u=lx/HL*sp.fr+seed*31.7;
  switch(sp.kind){
    case 'peaks':{let v=0,a=.62,n=0;for(let o=0;o<4;o++){const r=1-Math.abs(vn(u*(1<<o)*.9,seed+o));v+=a*r*r;n+=a;a*=.48}return v/n}
    case 'rock':{let v=0,a=.6,n=0;for(let o=0;o<4;o++){const r=1-Math.abs(vn(u*(1<<o),seed+o+5));v+=a*r;n+=a;a*=.5}return v/n*.9}
    case 'cliff':{const v=clamp(fbm(u,seed,3)*1.5+.55,0,1),s=v*3,q=Math.floor(s);return(q+sstep((s-q-.35)*3.2))/3}
    case 'sea':return 0;
    case 'street':{const bw=Math.max(8,Math.round(sp.bw*HL/450)),id=Math.floor(lx/bw)+seed*977;return .45+.55*hs(id)}
    case 'fcity':{const bw=Math.max(5,Math.round(sp.bw*HL/450)),id=Math.floor(lx/bw)+seed*991,ix=((lx%bw)+bw)%bw;
      if(hs(id*7.7)<.07){const c=Math.abs(ix-bw/2);if(c<2.5)return .62+.36*(1-c/2.5)}return .42+.12*hs(id)+(ix===2&&hs(id*3.3)<.6?.05:0)}
    case 'city':{const bw=Math.max(4,Math.round(sp.bw*HL/450)),id=Math.floor(lx/bw)+seed*997,h=hs(id);return h<.12?.95+hs(id*3)*.05:.2+h*.6}
    case 'dunes':{const r=1-Math.abs(vn(u*1.2,seed));return .25+.75*(r*r*.85+.15*(.5+.5*vn(u*3,seed+2)))}
    case 'mesa':{const v=clamp(fbm(u,seed,3)*1.7+.5,0,1),s=v*2,q=Math.floor(s);return(q+sstep((s-q-.4)*5))/2}
    case 'cone':{const P=1.15,cx=Math.round(u/P)*P+(hs(Math.round(u/P)+seed)-.5)*.6,d=Math.abs(u-cx)/(P*.5),sz=.45+.55*hs(Math.round(u/P)*3+seed);let v=Math.max(0,1-d*1.5)**1.3*sz;if(d<.05)v-=.03*sz;return Math.max(v,.05)}
    case 'clouds':return .5+.5*fbm(u*2,seed,3);
    default:return .5+.5*fbm(u,seed,3);
  }
}
const tileCache=new Map();
function clearTiles(){tileCache.clear()}
// pinceau sur un tampon 32 bits
function PB(w,h){const img=new ImageData(w,h);return{w,h,img,b:new Uint32Array(img.data.buffer),
  p(x,y,c){x|=0;y|=0;if(x>=0&&y>=0&&x<w&&y<h)this.b[y*w+x]=c},
  r(x,y,ww,hh,c){for(let j=0;j<hh;j++)for(let i=0;i<ww;i++)this.p(x+i,y+j,c)},
  g(x,y){x|=0;y|=0;return x>=0&&y>=0&&x<w&&y<h?this.b[y*w+x]:0}}}
const hz=(c,h,t)=>u32(mix(c,h,t));

/* --- arbres et objets dessinés pixel par pixel --- */
function drawItem(pb,k,x,yb,s,seed,hzc,ht){
  const r=rng(seed),T=TREE[k==='larch'&&autumn()?'larchA':k==='leafy'&&autumn()?'leafyA':k];
  const C=n=>hz(T[n],hzc,ht);
  const d=C('d'),m=C('m'),l=C('l'),t=C('t');
  if(k==='pine'||k==='larch'){
    const h=Math.max(4,Math.round((14+r()*12)*s)),wmax=h*.3;
    for(let j=0;j<h;j++){const f=j/h,k2=(h-j)%Math.max(2,Math.round(4*s)),hw=Math.max(0,Math.round(wmax*f*(.7+.3*k2/(4*s))));
      for(let i=-hw;i<=hw;i++){if(k==='larch'&&hs2(x+i,yb-h+j)<.18)continue;pb.p(x+i,yb-h+j,i<-hw*.3?l:i>hw*.35?d:m)}}
    pb.p(x,yb-h-1,m);for(let j=0;j<Math.max(1,2*s);j++)pb.p(x,yb+j,t);
  }else if(k==='leafy'||k==='olive'||k==='bush'||k==='umbr'){
    const big=k==='bush'?.45:k==='umbr'?1.2:k==='olive'?.75:1;
    const R=Math.max(2,(5+r()*3)*s*big),th=k==='bush'?0:Math.round(R*(k==='umbr'?1.9:1.1));
    if(th){const lean=k==='umbr'?(r()-.5)*R*.8:0;for(let j=0;j<th;j++){const xx=x+Math.round(lean*j/th);pb.p(xx,yb-j,t);if(R>4)pb.p(xx+1,yb-j,t)}}
    const cx=x+(k==='umbr'?Math.round((r()-.5)*R*.6):0),cy=yb-th-(k==='umbr'?R*.35:R*.6);
    const n=k==='umbr'?7:5;
    for(let q=0;q<n;q++){const ox=(r()-.5)*R*(k==='umbr'?2.4:1.5),oy=(r()-.5)*R*(k==='umbr'?.5:1),rr=R*(.5+r()*.4)*(k==='umbr'?.85:1);
      for(let yy=-rr;yy<=rr;yy++)for(let xx=-rr;xx<=rr;xx++){const dd=(xx*xx)/(k==='umbr'?1.6:1)+yy*yy*(k==='umbr'?2.2:1);if(dd>rr*rr)continue;
        const sh=(xx+yy)/rr+(hs2(cx+ox+xx,cy+oy+yy)-.5)*.8;pb.p(cx+ox+xx,cy+oy+yy,sh<-.55?l:sh>.35?d:m)}}
  }else if(k==='cypress'){
    const h=Math.round((16+r()*10)*s),w=Math.max(1,2.6*s);
    for(let j=0;j<h;j++){const f=j/h,hw=Math.round(w*Math.sin(Math.min(1,f*1.3)*Math.PI*.55)+(f>.3?.4:0));for(let i=-hw;i<=hw;i++)pb.p(x+i,yb-h+j,i<0?(hs2(x+i,j)<.5?l:m):(i>0?d:m))}
  }else if(k==='spine'){
    const h=Math.max(4,Math.round((14+r()*12)*s)),wmax=h*.3;
    for(let j=0;j<h;j++){const f=j/h,k2=(h-j)%Math.max(2,Math.round(4*s)),hw=Math.max(0,Math.round(wmax*f*(.7+.3*k2/(4*s))));
      for(let i=-hw;i<=hw;i++){const top=k2===0||j===0;pb.p(x+i,yb-h+j,top&&i<=hw-1?l:i<-hw*.3?(hs2(x+i,j)<.55?l:m):i>hw*.35?d:m)}}
    pb.p(x,yb-h-1,l);for(let j=0;j<Math.max(1,2*s);j++)pb.p(x,yb+j,t);
  }else if(k==='palm'){
    const h=Math.max(5,Math.round((14+r()*8)*s)),bend=(r()<.5?1:-1)*(2+r()*3)*s;
    let tx=x,ty=yb;
    for(let j=0;j<h;j++){tx=x+bend*Math.pow(j/h,2);ty=yb-j;pb.p(tx,ty,j%3?t:hz(mix(T.t,[0,0,0],.25),hzc,ht));if(s>1.2)pb.p(tx+1,ty,t)}
    const fl=Math.round((6+r()*3)*s);
    for(let f=0;f<7;f++){const a=-Math.PI*(.1+f*.135)+ (r()-.5)*.2;for(let q=0;q<fl;q++){const u=q/fl,fx=tx+Math.cos(a)*q,fy=ty+Math.sin(a)*q*.6+u*u*fl*.55;pb.p(fx,fy,q<2?d:u<.5?m:l);if(s>1)pb.p(fx,fy+1,d)}}
  }else if(k==='acacia'){
    const h=Math.max(4,Math.round((9+r()*5)*s)),cw=Math.round((10+r()*6)*s),ch=Math.max(2,Math.round(2.5*s));
    for(let j=0;j<h;j++){pb.p(x+Math.round(Math.sin(j*.4)*.6),yb-j,t);if(j>h*.55){pb.p(x-Math.round((j-h*.55)*.9),yb-j,t);pb.p(x+Math.round((j-h*.55)*.9),yb-j,t)}}
    for(let j=0;j<ch;j++){const hw=Math.round(cw/2*(j===0?.8:1));for(let i=-hw;i<=hw;i++)if(hs2(x+i,j+seed)>.12)pb.p(x+i,yb-h-ch+j+1,j===0?l:hs2(i,x)<.3?d:m)}
  }else if(k==='saguaro'){
    const h=Math.max(5,Math.round((10+r()*8)*s)),w=Math.max(1,Math.round(1.6*s));
    const col=(cx,y0,y1)=>{for(let j=y0;j<=y1;j++)for(let i=0;i<=w;i++)pb.p(cx+i,yb-j,i===0?l:i===w?d:m)};
    col(x,0,h);pb.p(x,yb-h-1,m);
    if(r()<.8){const ay=Math.round(h*(.35+r()*.2)),al=Math.round(h*(.3+r()*.2));for(let i=1;i<=Math.round(3*s);i++)pb.p(x-i,yb-ay,m);col(x-Math.round(3*s)-w,ay,ay+al)}
    if(r()<.6){const ay=Math.round(h*(.45+r()*.2)),al=Math.round(h*(.2+r()*.2));for(let i=1;i<=Math.round(3*s);i++)pb.p(x+w+i,yb-ay,m);col(x+w+Math.round(3*s),ay,ay+al)}
  }else if(k==='jtree'){
    const h=Math.round((8+r()*8)*s),R=Math.max(3,(6+r()*4)*s);
    for(let j=0;j<h;j++){pb.p(x,yb-j,t);if(R>5)pb.p(x+1,yb-j,t)}
    const cy=yb-h-R*.4;
    for(let q=0;q<7;q++){const ox=(r()-.5)*R*2.2,oy=(r()-.5)*R*.7,rr=R*(.45+r()*.35);
      for(let yy=-rr;yy<=rr;yy++)for(let xx=-rr;xx<=rr;xx++){if(xx*xx+yy*yy*1.6>rr*rr)continue;const sh=(xx+yy*1.5)/rr+(hs2(x+ox+xx,cy+oy+yy)-.5)*.9;pb.p(x+ox+xx,cy+oy+yy,sh<-.6?l:sh>.3?d:m)}}
    // lianes
    for(let v=0;v<3;v++){const lx2=x+Math.round((r()-.5)*R*1.6),ll=Math.round(R*(.6+r()));for(let j=0;j<ll;j++)if(hs2(lx2,j)<.8)pb.p(lx2+Math.round(Math.sin(j*.5)*.6),cy+R*.3+j,d)}
  }else if(k==='rockT'){
    const w=Math.max(2,Math.round((4+r()*5)*s)),h=Math.max(1,Math.round(w*(.5+r()*.3)));
    for(let j=0;j<h;j++){const hw=Math.round(w*Math.sqrt(1-(1-j/h)**2)*.6+.5);for(let i=-hw;i<=hw;i++)pb.p(x+i,yb-h+j,i+j<-hw*.2?l:i>hw*.4?d:m)}
  }else if(k==='chalet'){
    const w=Math.round((10+r()*5)*s),h=Math.round(w*.55),rh=Math.round(w*.42);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++)pb.p(x-w/2+i,yb-h+j,j<2?d:(i%3===0?d:m));
    if(w>8){pb.p(x-w/4,yb-h*.6,u32(hex('#e8c060')));pb.p(x+w/5,yb-h*.6,u32(hex('#e8c060')))}
    for(let j=0;j<rh;j++){const hw=Math.round((w/2+1)*(j+1)/rh);for(let i=-hw;i<=hw;i++)pb.p(x+i,yb-h-rh+j+1,i<0?t:hz(mix(T.t,[0,0,0],.25),hzc,ht))}
  }
}

function genTile(li,ti){
  const pb=PB(TW,H+2*MARG),sp=SPD[li],x0=ti*TW,heights=new Float32Array(TW+12),cols=[];
  for(let i=-6;i<TW+6;i++){
    const lx=x0+i,dm=(lx-RX)*MPX/sp,m=biomeMix(dm,Math.max(140,90/Math.sqrt(sp)));
    const A=LAY[m.a][li],B=LAY[m.b][li],t=m.t;
    const base=layerY(li,lerp(A.bs||0,B.bs||0,t))+MARG;
    const h=lerp(A.amp*profile(A,lx,li*7+1),B.amp*profile(B,lx,li*7+1),t)*HL*layerAmp(li);
    heights[i+6]=base-h;cols[i+6]={m,A,B,t,base,h};
  }
  const top=i=>heights[i+6];
  for(let i=0;i<TW;i++){
    const c=cols[i+6],{A,B,t}=c,S=t<.5?A:B,lx=x0+i;
    const hzc=mix(HZ[BI[c.m.a].reg],HZ[BI[c.m.b].reg],t),ht=HAZE[li];
    const pal=k=>{const a=A.pal[k]||A.pal.a,b=B.pal[k]||B.pal.a;return t?mix(a,b,t):a};
    const pa=pal('a'),pbb=pal('b'),pc=pal('c'),pd=pal('d'),pe=pal('e'),pf=pal('f');
    const ty=Math.round(top(i)),sl=top(i-1)-top(i+1),slw=(top(i-5)-top(i+5))/4;
    const cA=hz(pa,hzc,ht),cB=hz(pbb,hzc,ht),cC=hz(pc,hzc,ht),cD=hz(pd,hzc,ht),cE=hz(pe,hzc,ht),cF=hz(pf,hzc,ht);
    const fogY=c.base-6;
    for(let y=Math.max(0,ty);y<pb.h;y++){
      const dy=y-ty,hh=c.base-y;let col;
      switch(S.kind){
        case 'peaks':{
          const gul=slw*1.1+sl*.3+.75*vn(lx/11+hh/16,li)+.3*vn(lx/3.5+hh/5,li+3)+.12*vn(lx/1.2+hh/2,li+5);
          const sn=S.snow!=null&&hh>(S.snow*S.amp*HL)+5*vn(lx/4.5,9)-Math.max(0,-gul)*4;
          if(S.tl&&hh<S.tl*S.amp*HL+2*vn(lx/3,4))col=dy<1?cC:(hs2(lx,y)<.3?cD:hz(mix(pd,[0,0,0],.15),hzc,ht));
          else if(sn)col=gul<-.15?cF:cE;
          else col=dy===0&&sl>0?cC:gul<-.1?cB:(gul>.9?cC:cA);
          break}
        case 'rock':{const gul=sl*1.2+.8*vn(lx/2.4+hh/6,li+2);const strat=Math.sin((hh+7*vn(lx/16,li))*.42)>.94&&vn(lx/5+hh/4,li+8)>-.2;
          col=dy===0?cC:strat?cD:gul<-.1?cB:(hs2(lx,y)<.06?cC:cA);
          if(S.lava&&dy>2&&Math.abs(vn2(lx/8,hh/5,li+3))<.045)col=hz(pf,hzc,ht*.5);break}
        case 'cliff':{const crev=vn(lx/2.1,li+4)>.55||vn(lx/5.3+hh/14,li+6)>.7;
          col=dy<2?(hs2(lx,y)<.5?cD:cF):dy<4&&hs2(lx,y)<.45?cF:crev?cB:sl<-.3?cB:(hs2(lx>>1,y>>2)<.08?cC:cA);
          if(dy>3&&hs2(lx,y*3)<.025)col=cF;break}
        case 'sea':{const gl=hs2(lx>>3,y)<.09&&dy>1;col=dy===0?cC:dy<3?cD:gl?(hs2(lx,y)<.5?cD:cC):(dy>HL*.08?cB:cA);break}
        case 'snow':{const n=vn2(lx/20,hh/7,li),rk=vn2(lx/9,hh/5,li+9);
          col=dy===0?cC:(rk>.62&&dy>2)?(rk>.76?cD:hz(mix(pd,pa,.45),hzc,ht)):(sl<-.6&&dy<6)?cB:n>.4?cB:(n<-.45||dy<2)?cC:cA;break}
        case 'clouds':{const n=vn2(lx/9,dy/2.6,li)+.35*vn2(lx/3,dy/1.5,li+4),nu=vn2(lx/9,(dy-2)/2.6,li)+.35*vn2(lx/3,(dy-2)/1.5,li+4);
          col=dy<1?cC:(n>.05&&nu<=.05)?cC:n>.05?cA:n>-.35?(bay(lx,y)<.5?cA:cB):cB;break}
        case 'forest':col=dy<1?cC:hs2(lx,y)<.25?cD:cA;break;
        case 'street':{
          // façades au bord du trottoir : toit, étages, enseigne, store, vitrine, porte
          const sc=HL/450,bw=Math.max(8,Math.round(S.bw*HL/450)),id=Math.floor(lx/bw),ix=((lx%bw)+bw)%bw,fr=S.pal===PAL.streetF||S.pal===PAL.streetF2;
          const tones=fr?[pa,pbb,mix(pa,[255,250,240],.3)]:[pa,pbb,hex('#b86a52'),hex('#d8c8a8'),hex('#8a96a8'),mix(pa,[255,255,255],.25)];
          const wall=hz(tones[Math.floor(hs(id*3.7)*tones.length)],hzc,ht),wallD=hz(mix(tones[Math.floor(hs(id*3.7)*tones.length)],[0,0,0],.18),hzc,ht);
          const shopH=Math.round(11*sc),awn=Math.round(3*sc),fl=Math.max(5,Math.round(8*sc)),roofH=fr?Math.round(7*sc):Math.round(2*sc);
          const awnC=[hex('#c8402e'),hex('#2a7a5a'),hex('#2a5aa8'),hex('#e0a02a'),hex('#7a3a6a')][Math.floor(hs(id*5.3)*5)];
          if(ix===0||ix===bw-1)col=wallD;
          else if(dy<roofH){col=fr?(dy===0?cC:(dy===Math.floor(roofH/2)&&ix%6===3)?hz(hex('#f4f0e6'),hzc,ht):cE):(dy===0?cC:wallD)}
          else if(hh<shopH){
            const door=ix>=Math.round(bw*.7)&&ix<Math.round(bw*.7)+Math.max(2,Math.round(3*sc));
            if(hh>shopH-awn)col=hz(((ix>>1)%2)?awnC:hex('#f4f0e6'),hzc,ht);
            else if(hh===shopH-awn&&ix%2)col=hz(awnC,hzc,ht);
            else if(hh>shopH-awn-Math.round(2*sc))col=wallD;
            else if(door)col=hz(hex('#3a2a22'),hzc,ht);
            else if(ix>1&&ix<bw-2){const ref=((ix+hh)%9)<2;col=hz(ref?hex('#cfe6ee'):hex('#4a6a7a'),hzc,ht);if(hh<2)col=wallD}
            else col=wall}
          else{const fy=dy-roofH,row=fy%fl,per=5+Math.floor(hs(id*9.1)*3),cx=(ix-1)%per,ww=hs(id*4.4)<.4?1:2;
            const win=cx>=2&&cx<2+ww&&row>=1&&row<fl-2&&ix<bw-2;
            col=win?(hs2(Math.floor(lx/6),Math.floor(fy/fl))<.15?hz(hex('#f2d890'),hzc,ht):cD):(fr&&row===fl-2&&cx>=1&&cx<=4)?hz(hex('#2a2a30'),hzc,ht):(row===fl-1&&fr?wallD:wall);
            if(fy<1)col=wallD}
          break}
        case 'fcity':{const bw=Math.max(5,Math.round(S.bw*HL/450)),id=Math.floor(lx/bw),ix=((lx%bw)+bw)%bw,sc=HL/450;
          const spire=hs((id+(li*7+1)*991)*7.7)<.07&&Math.abs(ix-bw/2)<2.5;
          const roofH=Math.max(3,Math.round(6*sc)),fl=Math.max(4,Math.round(6*sc));
          if(spire)col=dy<1?cC:(ix<bw/2?hz(mix(pd,pa,.4),hzc,ht):cD);
          else if(dy<roofH){col=dy===0?cC:(ix===2&&dy<2)?cB:(dy===Math.floor(roofH/2)&&ix%4===2)?hz(mix(pa,[255,255,255],.3),hzc,ht):(ix===0?cD:cE)}
          else{const fy=dy-roofH,row=fy%fl,col4=ix%4;
            col=ix===0?cB:(row===fl-1&&fy<fl*3)?cD:(col4===2&&row>0&&row<fl-2)?(hs2(lx,Math.floor(fy/fl))<.18?hz(hex('#f2d890'),hzc,ht):cD):(fy>fl*3&&row<2&&hs(id*5)<.5)?cF:(hs(id*2.2)<.5?cA:cB)}
          break}
        case 'city':{const bw=Math.max(4,Math.round(S.bw*HL/450)),id=Math.floor(lx/bw),ix=((lx%bw)+bw)%bw,tone=hs(id*5.1);
          const base=tone<.33?cA:tone<.66?cB:hz(mix(pa,pc,.35),hzc,ht);
          col=dy<1?cC:ix===0?cB:(ix%3===1&&dy%4===2&&dy>2&&ix<bw-1)?(hs2(lx,y)<.4?cD:cC):base;break}
        case 'dunes':{const lit=sl>-.1,sd=lit?0:3+Math.min(14,-sl*9);const rip=Math.sin(lx*.7+hh*1.6+vn(lx/10,li)*3)>.86;
          col=dy===0?(lit?cC:cB):(!lit&&dy<sd)?(rip?cD:cB):(dy<2&&lit)?cC:rip?(bay(lx,y)<.5?cB:cA):cA;break}
        case 'mesa':{const band=Math.floor((hh+2*vn(lx/22,li))/Math.max(3,5*HL/450));const pal4=[cA,cB,cC,cA,cD];
          col=dy===0?cC:dy<2&&S.pal.f?cF:sl<-.35?hz(mix(pd,pbb,.4),hzc,ht):pal4[((band%5)+5)%5];if(hs2(lx,y)<.03)col=cD;break}
        case 'cone':{const g=sl*1.4+.5*vn(lx/4+hh/6,li);col=dy===0?cC:g<-.1?cB:(vn2(lx/5,hh/3,li)>.55?cC:cA);break}
        case 'ice':{
          // crevasses courtes et rares depuis le bord, bandes de strates bleutées, séracs éclairés
          const cx=Math.floor(lx/2),cr=hs(cx*7.3+li*11),clen=4+hs(cx*3.1)*12;
          const crev=cr<.09&&dy>1&&dy<clen;
          const band=Math.sin(hh*.55+vn(lx/14,li)*4)>.9;
          const ser=vn2(lx/6,hh/5,li)>.5;
          col=dy===0?cC:crev?(dy<clen*.5?cD:cB):sl<-.5&&dy<5?cB:band?cB:ser?(dy<3?cC:cA):(hs2(lx,y)<.02?cC:cA);break}
        default:{
          const sc=HL/450;
          if(dy===0){col=cC;break}
          if(S.tex==='fields'){
            const w=Math.round(30*sc*(li<4?.8:1)),fx=lx+6*vn(y/11,li),fy=dy+3*vn(lx/17,li),bh=Math.round(9*sc);
            const fid=Math.floor(fx/w)*7+Math.floor(fy/bh)*131,v=hs(fid);
            col=v<.3?cA:v<.55?cB:v<.75?hz(mix(pa,pc,.45),hzc,ht):v<.9?hz(mix(pa,[214,196,110],.3),hzc,ht):hz(mix(pa,pd,.4),hzc,ht);
            if(((fx%w)+w)%w<1&&hs(fid*3.3)>.35)col=cD;
            else if(((fy%bh)+bh)%bh<1&&hs(fid*1.7)>.45)col=hz(mix(pd,pa,.3),hzc,ht);
            else if(hs2(lx,y)<.03)col=cC;
          }else if(S.tex==='scrub'){
            const n=vn2(lx/2.4,y/2,li),up=vn2(lx/2.4,(y-1)/2,li);
            col=n>.28?(up<=.28?cC:(n>.6?hz(mix(pd,[0,0,0],.15),hzc,ht):cD)):(hs2(lx,y)<.07?hz(mix(pa,[236,228,206],.5),hzc,ht):(vn2(lx/9,y/5,li+2)>.3?cB:cA));
          }else if(S.tex==='alp'){
            const n=vn2(lx/7,y/3.5,li);col=n>.35?cB:(n<-.45?hz(mix(pa,pc,.4),hzc,ht):cA);
            const r=hs2(lx,y);if(r<.012)col=hz(hex('#9a9890'),hzc,ht);else if(r<.016)col=hz(hex('#f2f0e8'),hzc,ht);
          }else if(S.tex==='vines'){
            const rh=Math.max(3,Math.round(5*sc)),ty2=dy+1.5*vn(lx/20,li),row=((ty2%rh)+rh)%rh,sea=store.get('saison',null)||season();
            const leaf=sea==='automne'?(hs2(lx,y)<.5?hex('#e0aa34'):(hs2(lx,y*3)<.5?hex('#c8602c'):hex('#9a7a2a'))):sea==='hiver'?hex('#6a5038'):(hs2(lx,y)<.35?pf:pd);
            const grass=hz(mix(pa,[118,142,72],.45),hzc,ht);
            col=row<rh*.6?(row<1?hz(mix(leaf,[255,255,255],.15),hzc,ht):hs2(lx,y)<.8?hz(leaf,hzc,ht):cB):(row>=rh-1?cB:(hs2(lx,y)<.3?grass:cA));
          }else if(S.tex==='lav'){
            const rh=Math.max(3,Math.round(5*sc)),ty2=dy+1.2*vn(lx/24,li),row=((ty2%rh)+rh)%rh,sea=store.get('saison',null)||season();
            const grey=sea==='hiver'?.5:sea==='automne'?.3:sea==='printemps'?.2:0;
            col=row<rh*.55?hz(mix(row<1?pf:(hs2(lx,y)<.4?pf:pd),[140,150,120],grey),hzc,ht):(hs2(lx,y)<.07?cC:cA);
          }else if(S.tex==='sav'){
            const st=hs2(lx,y>>1)<.18;col=st?(hs2(lx,y)<.5?cB:hz(pd,hzc,ht)):(vn2(lx/10,y/5,li)>.35?hz(mix(pa,pc,.4),hzc,ht):cA);
          }else if(S.tex==='grove'){
            const ty2=dy+2*vn(lx/15,li),row=((ty2%7)+7)%7;
            col=row<1?hz(mix(pa,[226,216,192],.55),hzc,ht):(row>2&&row<5&&((lx+Math.floor(ty2/7)*3)%5)<2?(row===3?cC:cD):(hs2(lx,y)<.06?cB:cA));
          }else{const st=vn2(lx/8,y/4,li)>.3;col=st?cB:(hs2(lx,y)<.05?cD:cA)}
        }
      }
      // brume au pied de chaque plan
      if(li<3&&S.kind!=='street'&&y>fogY&&y<fogY+16){const f=Math.sin((y-fogY)/16*Math.PI)*.38;if(bay(lx,y)<f)col=hz(mix(hzc,pa,.45),hzc,0)}
      pb.b[y*TW+i]=col;
    }
  }
  // arbres, rochers, chalets
  const SC=[.4,.55,.75,1,1.2][li]*HL/450*Math.pow(ZS,li/4);
  for(let i=-2;i<TW+2;i+=1){
    const c=cols[i+6],lx=x0+i,S=hs(lx*.73+li)<c.t?c.B:c.A;
    if(!S.it)continue;
    for(const[k,dens,sz]of S.it){
      const step=(k==='pine'||k==='leafy'||k==='jtree'||k==='spine')&&S.kind==='forest'?Math.max(2,Math.round(5*SC*sz)):Math.max(3,Math.round(14*SC*sz));
      if(((lx%step)+step)%step)continue;
      const hsd=hs(lx*1.31+li*7+k.length);if(hsd>dens)continue;
      const hzc=HZ[BI[c.m.a].reg];
      const ox=Math.round((hs(lx*2.7)-.5)*step*.8);
      let yb=Math.round(top(i))+1+(S.kind==='forest'?Math.round(hs(lx*3.1)*3):0);
      if(k==='rockT'||k==='bush'||k==='chalet'){const hw=Math.round(7*SC*sz);for(let j=-hw;j<=hw;j++)yb=Math.max(yb,Math.round(top(clamp(i+ox+j,-6,TW+5)))+1)}
      drawItem(pb,k,i+ox,yb,SC*sz*(.8+hs(lx*5.3)*.4),Math.floor(lx*13+li),hzc,HAZE[li]);
      if(S.kind==='forest'&&(k==='pine'||k==='leafy'||k==='jtree'||k==='spine')){
        // forêt dense : deux rangées de plus en dessous
        for(let rw=1;rw<3;rw++)drawItem(pb,k,i+ox+Math.round((hs(lx+rw)-.5)*step),yb+rw*Math.round(6*SC*sz),SC*sz*(.7+hs(lx*rw)*.4),Math.floor(lx*7+rw),hzc,HAZE[li]);
      }
    }
  }
  for(let i=-8;i<TW+8;i++){
    const c=cols[clamp(i+6,0,cols.length-1)],lx=x0+i,S=hs(lx*.71+li)<c.t?c.B:c.A;
    if(!S.fill)continue;
    for(const[k,dens,sz]of S.fill){
      const step=Math.max(3,Math.round(9*SC*sz));if(((lx%step)+step)%step)continue;
      for(let band=1;band<5;band++){
        if(hs(lx*1.7+band*31+k.length)>dens)continue;
        const yb=Math.round(top(clamp(i,-6,TW+5))+band*Math.round(11*SC)+hs(lx+band)*6*SC);
        drawItem(pb,k,i,yb,SC*sz*(.75+band*.08),Math.floor(lx*11+band*5),HZ[BI[c.m.a].reg],HAZE[li]);
      }
    }
  }
  const[cv,g]=canvasOf(TW,H+2*MARG);g.putImageData(pb.img,0,0);
  return cv;
}
function tile(li,ti){
  const k=li*1e7+ti;let c=tileCache.get(k);
  if(!c){c=genTile(li,ti);tileCache.set(k,c);if(tileCache.size>220){const it=tileCache.keys();for(let n=0;n<60;n++)tileCache.delete(it.next().value)}}
  return c;
}
let tileBudget=0;
function drawLayer(g,li,scrollPx,yShift){
  const sp=SPD[li],off=scrollPx*sp,t0=Math.floor(off/TW),t1=Math.floor((off+W)/TW);
  for(let ti=t0;ti<=t1;ti++){
    const k=li*1e7+ti;
    if(!tileCache.has(k)){if(tileBudget<=0&&tileCache.size>0)continue;tileBudget--}
    g.drawImage(tile(li,ti),Math.round(ti*TW-off),Math.round(-MARG+yShift));
  }
}

/* ---------- ciel ---------- */
let skyCv=null,skyKey='';
function skyCanvas(sk,cloud){
  const key=W+'x'+H+':'+sk.top+sk.mid+sk.hor+':'+cloud.toFixed(1);
  if(key===skyKey)return skyCv;skyKey=key;
  const pb=PB(W,H),grey=cloud>.9?hex('#7c838e'):hex('#9aa0ac'),k=cloud>.9?1:.75;
  const top=mix(sk.top,mix(grey,sk.top,.3),cloud*k),mid=mix(sk.mid,mix(grey,sk.mid,.3),cloud*k*.9),hor=mix(sk.hor,mix(grey,sk.hor,.3),cloud*k*.7);
  const steps=14,pal=[];for(let i=0;i<=steps;i++){const f=i/steps;pal.push(u32(f<.55?mix(top,mid,f/.55):mix(mid,hor,(f-.55)/.45)))}
  for(let y=0;y<H;y++){const f=Math.min(1,y/(H*.62))*steps,i=Math.floor(f),fr=f-i;
    for(let x=0;x<W;x++)pb.b[y*W+x]=pal[Math.min(steps,i+(fr>bay(x,y)?1:0))]}
  const[cv,g]=canvasOf(W,H);g.putImageData(pb.img,0,0);return skyCv=cv;
}
// étoiles fixes
let STARS=null;
function stars(){if(STARS&&STARS.w===W)return STARS;const r=rng(77),a=[];for(let i=0;i<W*H/260;i++)a.push([r()*W|0,r()*H*.6|0,r()]);return STARS={w:W,a}}
// nuages en pixels : cumulus empilés
const cloudSprites=[];
function cloudSprite(i,dark=0){
  const ck=i+'_'+dark;if(cloudSprites[ck])return cloudSprites[ck];
  const r=rng(500+i),w=40+r()*70|0,h=Math.round(w*.42),pb=PB(w+4,h+4);
  const dk=c=>u32(mix(hex(c),[90,96,108],dark*.55)),cW=dk('#ffffff'),cL=dk('#eef1f7'),cS=dk('#cdd3e2'),cD=dk('#aeb6ca');
  const blobs=[];for(let k=0;k<6+r()*5;k++)blobs.push([w*.15+r()*w*.7,h*.45+r()*h*.35,h*.22+r()*h*.3]);
  for(let y=0;y<h+4;y++)for(let x=0;x<w+4;x++){
    let best=-1,ly=0;
    for(const[bx,by,br]of blobs){const d=((x-bx)**2+(y-by)**2*1.4)/(br*br);if(d<1){const v=1-d;if(v>best){best=v;ly=(y-by)/br+(x-bx)/br*.3}}}
    if(best<0||y>h*.86)continue;
    pb.b[y*(w+4)+x]=ly<-.45?cW:ly<.05?cL:ly<.5?(bay(x,y)<.5?cL:cS):(y>h*.78?cD:cS);
  }
  const[cv,g]=canvasOf(w+4,h+4);g.putImageData(pb.img,0,0);return cloudSprites[ck]=cv;
}
