'use strict';
/* ---------- utilitaires ---------- */
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=t=>(t=clamp(t,0,1),t*t*(3-2*t));
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mix=(a,b,t)=>[0,1,2].map(i=>Math.round(a[i]+(b[i]-a[i])*t));
const rgb=c=>`rgb(${c[0]},${c[1]},${c[2]})`;
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
// entier 32 bits ABGR pour Uint32Array (little-endian)
const u32=c=>(255<<24|c[2]<<16|c[1]<<8|c[0])>>>0;
function hs(n){const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)}
function hs2(x,y){const v=Math.sin(x*127.1+y*311.7+17.3)*43758.5453;return v-Math.floor(v)}
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// bruit de valeur 1D lissé, ~[-1,1]
function vn(x,s=0){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return lerp(hs(i+s*57.3),hs(i+1+s*57.3),u)*2-1}
function vn2(x,y,s=0){const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),o=s*91.7;
  return lerp(lerp(hs2(i+o,j),hs2(i+1+o,j),u),lerp(hs2(i+o,j+1),hs2(i+1+o,j+1),u),v)*2-1}
function fbm(x,s=0,o=4){let v=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){v+=vn(x*f,s+i*13)*a;n+=a;a*=.5;f*=2.03}return v/n}
const B4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const bay=(x,y)=>(B4[y&3][x&3]+.5)/16;
function canvasOf(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);const g=c.getContext('2d');g.imageSmoothingEnabled=false;return[c,g]}
const fmt=(n,d=0)=>n.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});

const store={
  get(k,d){try{const v=localStorage.getItem('sentier.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem('sentier.'+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem('sentier.'+k)}catch(e){}}
};

/* ---------- temps & soleil (debug : ?h=21.5 fige l'heure, ?speed=60 accélère tout) ---------- */
const Q=new URLSearchParams(location.search);
let T0=Date.now(),FH=Q.has('h')?parseFloat(Q.get('h')):store.get('adm.h',null),SPEED=parseFloat(Q.get('speed')||store.get('adm.speed',1));
// onglet Admin : ?admin l'affiche (mémorisé)
if(Q.has('admin'))store.set('admin',1);
const ADMIN=()=>!!store.get('admin',0);
// change l'heure simulée (h = null : heure réelle) et/ou la vitesse du temps, sans saut
function setClock(h,speed){
  const cur=now();if(speed!=null)SPEED=speed;
  if(h===null&&SPEED===1){FH=null}else{const hh=h??(cur.getHours()+cur.getMinutes()/60+cur.getSeconds()/3600);FH=hh}
  T0=Date.now();
  if(ADMIN()){store.set('adm.h',h===null?null:FH);store.set('adm.speed',SPEED)}
}
function now(){
  if(FH==null&&SPEED===1)return new Date();
  const b=new Date(T0);if(FH!=null){b.setHours(0,0,0,0);b.setTime(b.getTime()+FH*36e5)}
  return new Date(b.getTime()+(Date.now()-T0)*SPEED);
}
const GEO=(()=>{
  const tz=(Intl.DateTimeFormat().resolvedOptions().timeZone)||'';
  if(/Paris|Brussels|Luxembourg|Monaco|Andorra|Zurich|Geneva/.test(tz))return{lat:45.9,lon:6.5};
  const j=new Date(2026,0,1).getTimezoneOffset(),u=new Date(2026,6,1).getTimezoneOffset();
  return{lat:j<u?-34:46,lon:-Math.max(j,u)/4};
})();
function sunElev(d){
  const doy=(d-Date.UTC(d.getUTCFullYear(),0,0))/864e5;
  const dec=23.44*Math.sin(2*Math.PI*(284+doy)/365)*Math.PI/180;
  const B=2*Math.PI*(doy-81)/364,eot=9.87*Math.sin(2*B)-7.53*Math.cos(B)-1.5*Math.sin(B);
  const h=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600+GEO.lon/15+eot/60;
  const Hh=(h-12)*15*Math.PI/180,la=GEO.lat*Math.PI/180;
  return Math.asin(Math.sin(la)*Math.sin(dec)+Math.cos(la)*Math.cos(dec)*Math.cos(Hh))*180/Math.PI;
}
let sunCache={k:''};
function sunTimes(d){
  const k=d.toDateString();if(sunCache.k===k)return sunCache;
  const day=new Date(d);day.setHours(0,0,0,0);
  let prev=sunElev(day),rise=null,set=null,noon=null,best=-99;
  for(let m=10;m<=1440;m+=10){
    const t=new Date(day.getTime()+m*6e4),e=sunElev(t),f=(e+.83)/(e-prev||1e-6);
    if(prev<-.83&&e>=-.83&&!rise)rise=new Date(t-6e5*f);
    if(prev>=-.83&&e<-.83&&!set)set=new Date(t-6e5*f);
    if(e>best){best=e;noon=t}
    prev=e;
  }
  return sunCache={k,rise,set,noon,max:best};
}
const hm=d=>d?d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'--';
const dayKey=d=>d.getFullYear()*1000+Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);
function season(d=now()){const m=d.getMonth();return m<2||m===11?'hiver':m<5?'printemps':m<8?'ete':'automne'}

/* ---------- ciel : palettes selon l'élévation du soleil ---------- */
// haut, milieu, horizon, teinte du paysage, force de la teinte, obscurité
const SKY=[
  [-18,'#070b1e','#0f1734','#1b2548','#0d1430',.62,1],
  [-10,'#121a40','#28305e','#4a4778','#1f2250',.5,.88],
  [-4,'#2c3c74','#7a6a9c','#e0908a','#4a3a6a',.32,.55],
  [1,'#4e6fa6','#c99ab0','#f6b98e','#e8906a',.18,.18],
  [7,'#5c84bc','#a6bcd8','#f4d6b6','#f6c8a0',.07,0],
  [20,'#4f7fbf','#8fb2d8','#dce6ea','#ffffff',0,0],
  [50,'#477bc0','#86acd8','#d3e2ee','#ffffff',0,0]
].map(r=>({e:r[0],top:hex(r[1]),mid:hex(r[2]),hor:hex(r[3]),tint:hex(r[4]),ta:r[5],dark:r[6]}));
function skyAt(e){
  if(e<=SKY[0].e)return SKY[0];if(e>=SKY[SKY.length-1].e)return SKY[SKY.length-1];
  let i=0;while(SKY[i+1].e<e)i++;
  const a=SKY[i],b=SKY[i+1],t=(e-a.e)/(b.e-a.e);
  return{top:mix(a.top,b.top,t),mid:mix(a.mid,b.mid,t),hor:mix(a.hor,b.hor,t),tint:mix(a.tint,b.tint,t),ta:lerp(a.ta,b.ta,t),dark:lerp(a.dark,b.dark,t)};
}

/* ---------- météo : un tirage par tranche de 3 h, graine = date ---------- */
const WX={
  clair:{n:'Grand beau',ic:'☀',cloud:.1},
  voile:{n:'Voilé',ic:'🌤',cloud:.35},
  nuages:{n:'Nuageux',ic:'⛅',cloud:.65},
  chaleur:{n:'Canicule',ic:'🔥',cloud:.05,heat:1},
  pluie:{n:'Pluie',ic:'🌧',cloud:.95,rain:1},
  brume:{n:'Brouillard',ic:'🌫',cloud:.5,fog:1},
  vent:{n:'Vent fort',ic:'💨',cloud:.45,wind:1}
};
function weatherAt(d=now()){
  const f=Q.get('meteo')||store.get('meteoForce',null);if(f&&WX[f])return f;
  const blk=dayKey(d)*8+Math.floor(d.getHours()/3),r=rng(blk*7919)(),s=season(d);
  const T=s==='ete'?[['clair',.34],['chaleur',.2],['voile',.16],['nuages',.14],['pluie',.08],['vent',.05],['brume',.03]]
    :s==='hiver'?[['clair',.26],['voile',.16],['nuages',.24],['pluie',.14],['brume',.12],['vent',.08]]
    :[['clair',.28],['voile',.2],['nuages',.22],['pluie',.14],['brume',.08],['vent',.08]];
  let a=0;for(const[k,p]of T){a+=p;if(r<a)return k}return 'clair';
}
// température (°C) selon saison, heure, altitude et météo
function tempAt(d,alt,wx){
  const base={hiver:6,printemps:15,ete:25,automne:14}[season(d)];
  const h=d.getHours()+d.getMinutes()/60,diurne=-Math.cos((h-3)/24*2*Math.PI)*5;
  return Math.round(base+diurne-alt*.0065+(wx==='chaleur'?7:0)-(wx==='pluie'?3:0)-(wx==='vent'?2:0));
}
