'use strict';
/* ---------- le sentier : une suite infinie d'étapes (legs), déterministe ---------- */
// rough = amplitude des bosses de l'étape (m), fr = fréquence (par km), micro = bosses visibles à l'écran (m),
// tech = facteur technique (cailloux, neige), heat = surchauffe, reg = région
const BI={
  prairie:{n:'Prairie de la vallée',reg:'alpes',rough:10,fr:.9,micro:.35,tech:1,heat:0,coin:1},
  foret:{n:'Forêt de sapins',reg:'alpes',rough:22,fr:1.2,micro:.55,tech:.96,heat:-.1,coin:1.1},
  alpage:{n:'Alpage',reg:'alpes',rough:28,fr:1,micro:.45,tech:1,heat:0,coin:1.2},
  crete:{n:'Crête rocheuse',reg:'alpes',rough:26,fr:2.2,micro:.9,tech:.82,heat:-.1,coin:1.5},
  sommet:{n:'Sommet enneigé',reg:'alpes',rough:15,fr:1.5,micro:.5,tech:.8,heat:-.3,coin:1.8},
  garrigue:{n:'Garrigue',reg:'med',rough:30,fr:1.1,micro:.5,tech:.97,heat:.3,coin:1.1},
  falaise:{n:'Falaises calcaires',reg:'med',rough:36,fr:2,micro:.8,tech:.86,heat:.35,coin:1.4},
  cote:{n:'Sentier côtier',reg:'med',rough:14,fr:1.6,micro:.4,tech:1,heat:.25,coin:1.2},
  hetraie:{n:'Hêtraie',reg:'alpes',rough:18,fr:1.3,micro:.5,tech:.98,heat:-.1,coin:1.05},
  lac:{n:'Lac d’altitude',reg:'alpes',rough:6,fr:1.2,micro:.3,tech:1,heat:-.05,coin:1.3},
  glacier:{n:'Glacier',reg:'alpes',rough:20,fr:1.8,micro:.7,tech:.78,heat:-.35,coin:1.9},
  vignes:{n:'Vignobles',reg:'med',rough:20,fr:1.1,micro:.35,tech:1,heat:.15,coin:1.05},
  lavande:{n:'Plateau de lavande',reg:'med',rough:16,fr:.9,micro:.3,tech:1,heat:.3,coin:1.1},
  gorges:{n:'Gorges turquoise',reg:'med',rough:40,fr:2,micro:.8,tech:.88,heat:.2,coin:1.5},
  ville:{n:'Parcs de la ville',reg:'exo',rough:8,fr:1,micro:.2,tech:1,heat:.1,coin:1},
  desert:{n:'Désert de dunes',reg:'exo',rough:30,fr:1.6,micro:.6,tech:.85,heat:.6,coin:1.6},
  canyon:{n:'Canyon rouge',reg:'exo',rough:45,fr:1.8,micro:.8,tech:.88,heat:.45,coin:1.5},
  savane:{n:'Savane',reg:'exo',rough:12,fr:.9,micro:.35,tech:1,heat:.4,coin:1.3},
  jungle:{n:'Jungle',reg:'exo',rough:28,fr:1.6,micro:.7,tech:.86,heat:.35,coin:1.5},
  volcan:{n:'Volcan',reg:'exo',rough:20,fr:1.5,micro:.7,tech:.84,heat:.3,coin:1.8},
  vieilleville:{n:'Vieille ville',reg:'med',rough:12,fr:1.2,micro:.25,tech:1,heat:.05,coin:1.1},
  foretneige:{n:'Forêt enneigée',reg:'alpes',rough:22,fr:1.3,micro:.5,tech:.85,heat:-.3,coin:1.4},
  plage:{n:'Plages tropicales',reg:'exo',rough:10,fr:1.4,micro:.3,tech:.92,heat:.35,coin:1.3}
};
const NAMES={
  village:['Le Planay','Champ-Fleuri','Les Granges','Le Villard-Haut','La Combe-Noire','Les Chalps','Prabert','Le Mollard'],
  refuge:['Refuge de l’Aigle','Refuge des Marmottes','Refuge du Lac Noir','Refuge de la Balme','Refuge des Écrins de Pierre','Refuge du Gypaète'],
  sommet:['Pointe de la Fenêtre','Aiguille Rousse','Tête de la Sétive','Pic des Corneilles','Mont Gelé','Dôme des Neiges','Grand Rocher','Pointe Percée','Bec de l’Âne','Tête Blanche'],
  vmed:['Roquebelle','Les Oliviers','Sainte-Cigale','Bastide-Haute','Le Figuier','Villeclaire'],
  port:['Port-Soleil','Anse des Pêcheurs','Port-Figuier','Calanque d’Or','Anse de la Rascasse'],
  domaine:['Domaine des Cigales','Clos du Vieux Puits','Mas des Grenaches','Domaine de la Combe','Château Roquefraiche'],
  lac:['Lac Noir','Lac de la Fenêtre','Lac Bleu','Lac des Neuf Couleurs','Lac Glacé'],
  parc:['Kiosque du Grand Parc','Buvette des Platanes','Kiosque à musique'],
  oasis:['Oasis de Tamrit','Oasis des Trois Palmiers','Puits d’Erg Chebbi'],
  lodge:['Lodge des Baobabs','Camp des Acacias','Lodge du Point d’Eau'],
  pilotis:['Village sur pilotis','Carbet des Aras','Comptoir de la Rivière'],
  bourg:['Boulangerie de la place','Café du Marché','Halles du vieux quartier'],
  paillote:['Paillote du Lagon','Bar de la Plage Blanche','Cabane des Pêcheurs']
};
const LEGS=[],POIS=[];
let genLoop=0,endD=0,endE=820;
function pushLeg(b,lenKm,e1,o={}){
  // une étape s'allonge si elle devait monter ou descendre trop raide (raccords entre boucles)
  if(o.shape!=='peak'){const mg=b==='crete'||b==='glacier'?.13:b==='falaise'||b==='gorges'||b==='canyon'?.11:.09;lenKm=Math.max(lenKm,Math.abs(e1-endE)/1000/mg)}
  const L={b,d0:endD,len:lenKm*1000,e0:endE,e1,ep:o.ep,shape:o.shape||'lin',seed:LEGS.length*17+3};
  LEGS.push(L);endD+=L.len;endE=e1;return L;
}
function poi(d,k,n,x={}){POIS.push(Object.assign({d,k,n},x))}
function nameOf(list,i){return list[i%list.length]}
// graine propre à chaque joueur : l'ordre des boucles et leurs variantes changent d'une partie à l'autre
let WSEED=store.get('seed',null);if(WSEED==null){WSEED=Math.floor(Math.random()*1e9);store.set('seed',WSEED)}
const LOOPT=[],LOOPN={alp:0,sud:0,voy:0};
function loopType(k){
  if(LOOPT[k])return LOOPT[k];
  if(k===0)return LOOPT[0]='alp';                       // on part toujours de la vallée (arche de départ)
  const prev=loopType(k-1),opts=['alp','sud','voy'].filter(t=>t!==prev);   // jamais deux fois la même boucle de suite
  return LOOPT[k]=opts[Math.floor(rng(WSEED*977+k*31)()*opts.length)];
}
function genNext(){
  const k=genLoop++,T=loopType(k),r=rng(WSEED*131+9001+k*131),R=(a,b)=>a+(b-a)*r(),maybe=p=>r()<p,n3=LOOPN[T]++;
  if(T==='alp'){
    // boucle alpine : vallée → (hêtraie) → sapins → alpage → (lac) → crête → (glacier) → sommet → on redescend
    const pr=pushLeg('prairie',k===0?3.2:R(2.4,3.6),R(820,900));
    if(k===0)poi(12,'depart','Départ');
    poi(pr.d0+(k===0?420:260),'ravito',nameOf(NAMES.village,n3));
    poi(pr.d0+pr.len*.7,'fontaine','Fontaine');
    if(maybe(.8)){const h=pushLeg('hetraie',R(2.5,3.5),R(1150,1250));poi(h.d0+h.len*.6,'fontaine','Source')}
    const f=pushLeg('foret',R(4.5,6),R(1700,1800));
    poi(f.d0+f.len*R(.55,.75),'fontaine','Bachal');
    const a=pushLeg('alpage',R(3,4),R(2050,2150));
    poi(a.d0+a.len*.5,'ravito',nameOf(NAMES.refuge,n3),{refuge:1});
    poi(a.d0+a.len*.2,'fontaine','Abreuvoir');
    if(maybe(.75)){const lk=pushLeg('lac',R(1.8,2.6),R(2120,2180));poi(lk.d0+lk.len*.5,'fontaine',nameOf(NAMES.lac,n3))}
    pushLeg('crete',R(2,3),R(2400,2500));
    if(maybe(.7))pushLeg('glacier',R(1.8,2.6),R(2560,2620));
    const top=R(2780,2940),s=pushLeg('sommet',R(3.4,4.4),R(2480,2560),{shape:'peak',ep:top});
    poi(s.d0+s.len*.5,'sommet',nameOf(NAMES.sommet,n3),{alt:Math.round(top)});
    pushLeg('crete',R(1.5,2.2),R(2250,2300));
    if(maybe(.7)){const fn=pushLeg('foretneige',R(2.5,3.5),R(1950,2050));poi(fn.d0+fn.len*.5,'fontaine','Source gelée')}
    if(maybe(.75)){const a2=pushLeg('alpage',R(3,4),R(1750,1850));poi(a2.d0+a2.len*.5,'fontaine','Abreuvoir')}
    const lastH=maybe(.7),f2=pushLeg('foret',R(4,5.5),lastH?R(1150,1250):R(740,800));
    poi(f2.d0+f2.len*.55,'fontaine','Source');
    if(lastH)pushLeg('hetraie',R(2.5,3.5),R(720,780));
  }else if(T==='sud'){
    // boucle du Sud : (vieille ville) → vignes et lavande dans un ordre ou l'autre → (gorges) → garrigue → falaises → côte → on remonte
    if(maybe(.7)){const vv=pushLeg('vieilleville',R(2.2,3),R(560,620));poi(vv.d0+vv.len*.45,'ravito',nameOf(NAMES.bourg,n3));poi(vv.d0+vv.len*.8,'fontaine','Fontaine de la place')}
    const vin=()=>{const v=pushLeg('vignes',R(3,4),R(430,500));poi(v.d0+v.len*.5,'ravito',nameOf(NAMES.domaine,n3))};
    const lav=()=>{const lv=pushLeg('lavande',R(3,4),R(600,680));poi(lv.d0+lv.len*.55,'fontaine','Lavoir')};
    if(maybe(.5)){vin();lav()}else{lav();vin()}
    if(maybe(.75)){const gz=pushLeg('gorges',R(3,4),R(330,400));poi(gz.d0+gz.len*.6,'fontaine','Source')}
    const g=pushLeg('garrigue',R(2.5,3.5),R(330,420));
    poi(g.d0+g.len*.45,'ravito',nameOf(NAMES.vmed,n3));
    pushLeg('falaise',R(3,4),R(110,180));
    const c=pushLeg('cote',R(4.5,5.5),R(8,25));
    poi(c.d0+c.len*.5,'ravito',nameOf(NAMES.port,n3),{port:1});
    poi(c.d0+c.len*.18,'fontaine','Douche de plage');
    if(maybe(.7))pushLeg('falaise',R(2.5,3.2),R(180,240));
    const g2=pushLeg('garrigue',R(4,5),R(640,720));
    poi(g2.d0+g2.len*.5,'fontaine','Puits');
  }else{
    // grand voyage : (ville) → désert et canyon dans un ordre ou l'autre → (savane) → jungle → (plage) → (volcan)
    if(maybe(.75)){const v=pushLeg('ville',R(2.5,3.2),R(420,480));poi(v.d0+v.len*.4,'ravito',nameOf(NAMES.parc,n3));poi(v.d0+v.len*.8,'fontaine','Fontaine Wallace')}
    const des=()=>{const d=pushLeg('desert',R(3.5,4.5),R(300,340));poi(d.d0+d.len*.6,'ravito',nameOf(NAMES.oasis,n3),{oasis:1})};
    const can=()=>pushLeg('canyon',R(3,4),R(560,640));
    if(maybe(.6)){des();can()}else{can();des()}
    if(maybe(.8)){const sv=pushLeg('savane',R(3.5,4.5),R(520,580));poi(sv.d0+sv.len*.5,'ravito',nameOf(NAMES.lodge,n3))}
    const j=pushLeg('jungle',R(3.5,4.5),R(360,420));
    poi(j.d0+j.len*.4,'fontaine','Cascade');poi(j.d0+j.len*.8,'ravito',nameOf(NAMES.pilotis,n3));
    if(maybe(.8)){const pl=pushLeg('plage',R(3.5,4.5),R(5,20));poi(pl.d0+pl.len*.5,'ravito',nameOf(NAMES.paillote,n3));poi(pl.d0+pl.len*.2,'fontaine','Douche de plage')}
    if(maybe(.85)){const top=R(880,980),vo=pushLeg('volcan',R(8.5,9.5),R(700,760),{shape:'peak',ep:top});
      poi(vo.d0+vo.len*.5,'sommet','Cratère du '+nameOf(['Mont Brasier','Piton Rouge','Pic de Cendre'],n3),{alt:Math.round(top)})}
  }
  // panneaux d'entrée et bornes kilométriques
  for(const L of LEGS)if(!L.sign){L.sign=1;poi(L.d0+25,'panneau',BI[L.b].n,{leg:L})}
  POIS.sort((a,b)=>a.d-b.d);
}
function ensure(dm){while(endD<dm+40000)genNext()}
ensure(0);
let legI=0;
function legAt(dm){
  ensure(dm);
  if(LEGS[legI]&&dm>=LEGS[legI].d0&&dm<LEGS[legI].d0+LEGS[legI].len)return legI;
  let lo=0,hi=LEGS.length-1;
  while(lo<hi){const m=(lo+hi+1)>>1;if(LEGS[m].d0<=dm)lo=m;else hi=m-1}
  return legI=Math.max(0,lo);
}
const leg=dm=>LEGS[legAt(Math.max(0,dm))];
// altitude « macro » (celle du dénivelé), en mètres
function elevMacro(dm){
  if(dm<0)return LEGS[0].e0;
  const L=LEGS[legAt(dm)],u=(dm-L.d0)/L.len;
  let e;
  if(L.shape==='peak')e=u<.5?lerp(L.e0,L.ep,lerp(u*2,sstep(u*2),.35)):lerp(L.ep,L.e1,lerp((u-.5)*2,sstep((u-.5)*2),.35));
  else e=lerp(L.e0,L.e1,lerp(u,sstep(u),.5));
  const B=BI[L.b];
  return e+B.rough*fbm(dm/1000*B.fr,L.seed,3)*Math.sin(Math.PI*u);
}
// biomes de part et d'autre d'une frontière (fondu sur ±T mètres)
function biomeMix(dm,T=160){
  const i=legAt(Math.max(0,dm)),L=LEGS[i];
  const ds=dm-L.d0,de=L.d0+L.len-dm;
  if(de<T&&LEGS[i+1]&&LEGS[i+1].b!==L.b)return{a:L.b,b:LEGS[i+1].b,t:sstep((T-de)/(2*T))};
  if(ds<T&&i>0&&LEGS[i-1].b!==L.b)return{a:LEGS[i-1].b,b:L.b,t:sstep(.5+ds/(2*T))};
  return{a:L.b,b:L.b,t:0};
}
// petites bosses visibles (non comptées dans le D+)
function micro(dm){
  const m=biomeMix(dm,60),am=lerp(BI[m.a].micro,BI[m.b].micro,m.t);
  return am*(.62*vn(dm/11,1)+.38*vn(dm/4.3,2))+(dm<40?-(40-dm)/40*am*.5:0);
}
// relief intermédiaire (quelques mètres sur quelques dizaines de mètres), propre à chaque biome :
// a = amplitude (m), w = longueur d'onde (m), st = marches rocheuses
const MESO={prairie:[1,60],hetraie:[1.6,40],foret:[2,40],alpage:[1.8,65],lac:[.7,80],crete:[2.2,38,1],glacier:[2,38,1],sommet:[1.6,40],
  vignes:[1.3,70],lavande:[1,90],gorges:[2.2,38,1],garrigue:[2,45],falaise:[2.6,42,1],cote:[1.6,40],
  ville:[.5,80],vieilleville:[.6,70],foretneige:[1.8,40],plage:[1.2,60],desert:[3.5,60],canyon:[2.8,40,1],savane:[.9,90],jungle:[2.2,32],volcan:[1.8,42,1]};
function mesoOf(b,dm){const[a,w,st]=MESO[b]||[1,60];let n=fbm(dm/w,7,3)*a*2;
  if(st){const q=a*.7,f=n/q,i=Math.floor(f);n=(i+sstep((f-i-.25)*2))*q}return n}
function meso(dm){const m=biomeMix(dm,80);let v=mesoOf(m.a,dm);if(m.t>0&&m.b!==m.a)v=lerp(v,mesoOf(m.b,dm),m.t);return dm<60?v*dm/60:v}
const elev=dm=>elevMacro(dm)+meso(dm)+micro(dm);
// la pente ressentie par le coureur inclut ce relief ; le D+ compté reste celui du profil
const gradeAt=dm=>(elevMacro(dm+8)+meso(dm+8)-elevMacro(dm-8)-meso(dm-8))/16;
function poisIn(a,b){
  ensure(b);let lo=0,hi=POIS.length;
  while(lo<hi){const m=(lo+hi)>>1;if(POIS[m].d<a)lo=m+1;else hi=m}
  const out=[];for(let i=lo;i<POIS.length&&POIS[i].d<=b;i++)out.push(POIS[i]);return out;
}
const nextPoi=(dm,k)=>{for(const p of poisIn(dm,dm+60000))if(p.d>dm&&(!k||k.includes(p.k)))return p;return null};
