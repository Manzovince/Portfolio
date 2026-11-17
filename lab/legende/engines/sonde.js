// GÉNÉRÉ par tools/extract.mjs depuis ../sonde/index.html — ne pas éditer à la main.
window.SONDE=(()=>{
const S={"labels":false,"lop":100,"sond":true,"paper":"light","els":[],"lmf":0,"mix":{"ile":25,"archipel":25,"hautfond":25,"large":25},"ters":["ile","archipel","hautfond","large"]};
const W=63,H=88,TAU=Math.PI*2,CL=-1.125,BL=7,STEP=.25;
const PAL={
  light:{paper:'#FAEEDA',sand:'#F2DCAE',line:'#BA7517',idx:'#854F0B',s0:'#D6ECF3',s1:'#AED3E8',s2:'#77A9D1',s3:'#4277A8',s4:'#244B74',iso:'#185FA5',isoD:'#E6F1FB',coast:'#0C447C',sond:'#2C5F8A',sondD:'#E6F1FB',ftint:'#D3E8B4',tfill:'#97C459',cfill:'#6FA33A',tlight:'#C0DD97',tshade:'rgba(39,80,10,.3)',tstroke:'#3B6D11',rock:'#3d3c38',lab:'#633806',bld:'#4A3626',mag:'#B0307A',red:'#C0392B',green:'#2E8B57'},
  dark:{paper:'#2C2C2A',sand:'#463b28',line:'#854F0B',idx:'#BA7517',s0:'#1E5672',s1:'#17445F',s2:'#10324C',s3:'#0A2439',s4:'#051727',iso:'#5FA3DE',isoD:'#5FA3DE',coast:'#9CCBF2',sond:'#8DBBE0',sondD:'#8DBBE0',ftint:'#2A4A14',tfill:'#3B6D11',cfill:'#2B560C',tlight:'#4F8A1C',tshade:'rgba(0,0,0,.35)',tstroke:'#97C459',rock:'#D3D1C7',lab:'#FAC775',bld:'#EAD9BC',mag:'#E27AB8',red:'#E8705F',green:'#5CC08A'}};
const T={ile:'Grande île',archipel:'Archipel',hautfond:'Haut-fond',large:'Grand large'};
const SH={ile:'Îles',banc:'Bancs',fosse:'Fosses'};
const EL={phare:'Phare',village:'Village',mouillage:'Mouillage',epave:'Épave',recif:'Récif',bouee:'Bouée'};
const BIG={terre:'Grandes terres',fond:'Grands fonds'};
const LAB={...T,terre:'Grande terre',fond:'Grand fond'};
let shared=0,nel=0;
const TK=Object.keys(T);for(const k of TK)if(!(S.mix[k]>=0))S.mix[k]=25;
const syncTers=()=>{if(!TK.some(k=>S.mix[k]>0))TK.forEach(k=>S.mix[k]=25);S.ters=TK.filter(k=>S.mix[k]>0);};syncTers();

const R=(a,b)=>a+Math.random()*(b-a);
const ss=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const M=(x,y,m=13)=>ss(Math.min(x,W-x)/m)*ss(Math.min(y,H-y)/m);
function hsh(i,j,s){const v=Math.sin(i*127.1+j*311.7+s*74.7)*43758.5453;return(v-Math.floor(v))*2-1;}
function vn(x,y,s){const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy);
  const v00=hsh(i,j,s),v10=hsh(i+1,j,s),v01=hsh(i,j+1,s),v11=hsh(i+1,j+1,s);return v00+(v10-v00)*a+(v01-v00)*b+(v00-v10-v01+v11)*a*b;}
const fbm=(x,y,s)=>.6*vn(x/26,y/26,s)+.3*vn(x/12,y/12,s+1)+.12*vn(x/6,y/6,s+2);
const bump=(g,x,y)=>{let s=0;for(const[a,b,amp,sg,p]of g){const r=Math.hypot(x-a,y-b)/sg;s+=amp*Math.exp(-Math.pow(r,p||2)/2);}return s;};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);

// 16 fixed edge mouths (symmetric under a 180° turn), each continued inward by a random curved spur: submarine ridges and canyons
const MOUTHS=[];
for(const[t,a,sg]of[[9,.6,2.6],[24,-.8,3.4]])MOUTHS.push([t,0,0,1,a,sg],[W-t,0,0,1,a,sg],[W-t,H,0,-1,a,sg],[t,H,0,-1,a,sg]);
for(const[t,a,sg]of[[16,-.65,3],[35,.8,3.6]])MOUTHS.push([0,t,1,0,a,sg],[0,H-t,1,0,a,sg],[W,H-t,-1,0,a,sg],[W,t,-1,0,a,sg]);
function spurs(){return MOUTHS.map(([x,y,dx,dy,a,sg])=>{const L=R(10,24),pts=[[x-dx*2,y-dy*2],[x,y],[x+dx*3,y+dy*3]];
  let ang=Math.atan2(dy,dx),cx=x+dx*3,cy=y+dy*3,turn=R(-.12,.12);
  for(let s=3;s<L;s+=2){turn+=R(-.08,.08);ang+=turn;cx+=Math.cos(ang)*2;cy+=Math.sin(ang)*2;pts.push([cx,cy]);}
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const r=3*sg;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[px,py]of pts){x0=Math.min(x0,px-r);y0=Math.min(y0,py-r);x1=Math.max(x1,px+r);y1=Math.max(y1,py+r);}
  return{pts,cum,a,sg,dx,dy,L:cum[cum.length-1]-2,box:[x0,y0,x1,y1]};});}
function spurV(c,x,y){let s=0;for(const sp of c.sp){const b=sp.box;if(x<b[0]||x>b[2]||y<b[1]||y>b[3])continue;
  const{pts,cum,a,sg,L,dx:ux,dy:uy}=sp,oth=ux?Math.min(y,H-y,ux>0?W-x:x):Math.min(x,W-x,uy>0?H-y:y);if(oth<.01)continue;
  let bd=1e9,bs=0;for(let i=0;i+1<pts.length;i++){const[x1,y1]=pts[i],[x2,y2]=pts[i+1],dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy,
    t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/l2)),ex=x1+t*dx-x,ey=y1+t*dy-y,d=ex*ex+ey*ey;if(d<bd){bd=d;bs=cum[i]+t*Math.sqrt(l2)-2;}}
  const tn=ux?(ux>0?x:W-x):(uy>0?y:H-y),sm=ux?y-pts[1][1]:x-pts[1][0],bl=ss(tn/4);
  const free=bd<9*sg*sg?Math.exp(-bd/(2*sg*sg))*(1-ss(bs/L)):0;
  s+=a*ss(oth/6)*(bl*free+(1-bl)*Math.exp(-sm*sm/(2*sg*sg)));}return s;}

// Shared reliefs: an island, a shallow bank or a trench sits on an edge midpoint (or a corner) and is split between neighbours.
// On the edge itself the value is a fixed symmetric profile; inside, extent and ragged noise vary per card and fade at the edges.
const FP={ile:{a:2.3,s:9,t:9,c:10,n:.45},banc:{a:.95,s:11,t:10,c:12,n:.3},fosse:{a:-2.2,s:8,t:8,n:.35}};
function fx(c,x,y){let v=0;const em=ss(Math.min(x,W-x,y,H-y)/5);
  for(const f of c.feat){const P=FP[f.t];let val;
    if(f.kind==='e'){const side=f.side,vert=side==='L'||side==='R',half=vert?H/2:W/2,s=vert?y-H/2:x-W/2;
      const t=side==='L'?x:side==='R'?W-x:side==='T'?y:H-y;if(t>45)continue;
      const st=P.t*(1+.4*vn(s/7,.5,f.sd)),sfade=ss((half-Math.abs(s))/6);
      val=P.a*Math.exp(-s*s/(2*P.s*P.s))*Math.exp(-t*t/(2*st*st))*sfade;}
    else{const u=Math.abs(x-f.cx),w=Math.abs(y-f.cy),r=Math.hypot(u,w),th=Math.atan2(w,u);
      const sg=P.c*(1+.5*Math.sin(2*th)*vn(th*3,.5,f.sd));val=P.a*Math.exp(-r*r/(2*sg*sg));}
    const env=Math.min(1,Math.abs(val/P.a)*3);
    if(env>.01)val+=Math.sign(P.a)*P.n*(vn(x/5,y/5,f.sd+1)+.45*vn(x/2.3,y/2.3,f.sd+2))*env*em;
    v+=val;}
  return v;}
// height: <0 sea depth, >0 land. A fine noise only near sea level makes ragged coasts while deep isobaths stay smooth.
function hgt(c,x,y){const e=Math.min(x,W-x,y,H-y),w=ss(e/BL);
  const b=CL+spurV(c,x,y)+w*(c.na*fbm(x,y,c.seed)+M(x,y)*bump(c.g,x,y))+(c.feat.length?fx(c,x,y):0);
  return b+(.24*vn(x/3,y/3,c.seed+5)+.11*vn(x/1.4,y/1.4,c.seed+6))*Math.exp(-b*b/.4)*ss(e/5);}
// ---------- great expanses: one island or deep spread over a w×h block of cards (2 to 9) ----------
// The block has a single height field in block coordinates, so its inner seams are continuous by construction;
// it fades to the usual edge profile (CL + mouths + shared reliefs) only on the block's outer border.
const SHAPES=[[1,2],[2,1],[2,2],[1,3],[3,1],[2,3],[3,2],[3,3]];
function mkRegion(c0,r0,w,h,t){const g=[],blobs=[],BW=w*W,BH=h*H,n=w*h;
  // one soft blob per card, pulled toward the block centre, plus a few smaller lobes: an organic outline, never the block's rectangle
  for(let a=0;a<w;a++)for(let b=0;b<h;b++){const cx=(a+.5)*W+R(-9,9),cy=(b+.5)*H+R(-12,12);
    blobs.push([cx+(BW/2-cx)*.22,cy+(BH/2-cy)*.22,1,R(23,30)]);}
  for(let i=0;i<Math.ceil(n/2)+1;i++)blobs.push([R(20,BW-20),R(22,BH-22),R(.5,.9),R(9,15)]);
  if(t==='terre')for(let i=0;i<n;i++)g.push([R(18,BW-18),R(20,BH-20),R(.8,1.9),R(4,9),1.4]);
  else{for(let i=0,k=Math.ceil(n*.6);i<k;i++)if(Math.random()<.7)g.push([R(18,BW-18),R(20,BH-20),R(1.4,2.4),R(3,6),1.4]);
    for(let i=0;i<Math.ceil(n/2);i++)g.push([R(15,BW-15),R(15,BH-15),-R(.6,1.2),R(8,16)]);}
  return{c0,r0,w,h,t,g,blobs,seed:R(0,1000),A:t==='terre'?R(2.7,3.2):-R(2.2,2.7)};}
function regField(r,X,Y,eo){
  const bl=bump(r.blobs,X,Y)+.32*vn(X/13,Y/13,r.seed+3)+.18*vn(X/5.5,Y/5.5,r.seed+4)-.4,
    env=Math.max(0,Math.tanh(2.2*bl))*ss((eo-3)/16);
  return r.A*env+(r.t==='terre'?.9:.7)*fbm(X,Y,r.seed)+env*bump(r.g,X,Y);}
function hgtR(c,x,y){const r=c.reg,X=x+c.ox,Y=y+c.oy,eo=Math.min(X,r.w*W-X,Y,r.h*H-Y);
  const b=CL+spurV(c,x,y)+ss(eo/BL)*regField(r,X,Y,eo)+(c.feat.length?fx(c,x,y):0);
  return b+(.24*vn(X/3,Y/3,r.seed+5)+.11*vn(X/1.4,Y/1.4,r.seed+6))*Math.exp(-b*b/.4)*ss(eo/5);}
function mkR(r,ci,ri){const out={T:ri===0,B:ri===r.h-1,L:ci===0,R:ci===r.w-1};
  const c={k:r.t,reg:r,ox:ci*W,oy:ri*H,ms:r.seed,seed:R(0,1000),feat:[],fsig:'',lu:Math.random(),lp:Math.random(),lp2:Math.random(),els:[],esig:null,flip:false,img:null,
    sp:spurs().filter(s=>s.dy===1&&out.T||s.dy===-1&&out.B||s.dx===1&&out.L||s.dx===-1&&out.R)};
  c.h=(x,y)=>hgtR(c,x,y);deco(c);return c;}
let regions=[],regKey=null;
function makeRegions(){regions=[];const C=S.cols,Rw=S.rows,occ=new Uint8Array(C*Rw);if(S.deck||!S.big.length)return;
  const sh=SHAPES.filter(([w,h])=>w*h<=S.bmax&&w<=C&&h<=Rw);if(!sh.length)return;
  const goal=Math.round(C*Rw*S.bfreq/100);let cov=0;
  for(let t=0;t<300&&cov<goal;t++){const[w,h]=sh[Math.floor(Math.random()*sh.length)],c0=Math.floor(Math.random()*(C-w+1)),r0=Math.floor(Math.random()*(Rw-h+1));
    let free=true;for(let a=0;a<w&&free;a++)for(let b=0;b<h;b++)if(occ[(r0+b)*C+c0+a]){free=false;break;}
    if(!free||cov+w*h>goal+2)continue;
    for(let a=0;a<w;a++)for(let b=0;b<h;b++)occ[(r0+b)*C+c0+a]=1;
    regions.push(mkRegion(c0,r0,w,h,S.big[Math.floor(Math.random()*S.big.length)]));cov+=w*h;}}
const depthM=h=>Math.max(1,Math.round(8*h*h-6*h));

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function targets(n,have){const tot=TK.reduce((a,k)=>a+S.mix[k],0)||1,t={},fr=[];let s=0;
  for(const k of TK){const q=n*S.mix[k]/tot;t[k]=Math.floor(q);s+=t[k];if(S.mix[k]>0)fr.push([k,Math.round((q-t[k])*1e6)]);}
  fr.sort((a,b)=>b[1]-a[1]||(have[b[0]]||0)-(have[a[0]]||0));for(let i=0;s<n;i++,s++)t[fr[i%fr.length][0]]++;return t;}
function wkind(){const tot=TK.reduce((a,k)=>a+S.mix[k],0);let u=Math.random()*tot;for(const k of TK){u-=S.mix[k];if(u<0&&S.mix[k]>0)return k;}return S.ters[0]||'large';}
function mk(kf){const k=kf||wkind(),g=[],seed=R(0,1000);
  const far=(p,list,d)=>list.every(q=>Math.hypot(q[0]-p[0],q[1]-p[1])>d);
  if(k==='ile'){const cx=R(25,38),cy=R(34,54);g.push([cx,cy,R(2.6,3.3),R(8,10.5)],[cx,cy,.55,R(16,20)]);
    {const a=R(0,TAU),r=R(2,5);g.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r,R(.9,1.5),R(2.5,4),1.4]);}
    for(let i=0,n=Math.floor(R(1,3.6));i<n;i++){const a=R(0,TAU),r=R(15,21);g.push([Math.max(15,Math.min(48,cx+Math.cos(a)*r*.75)),Math.max(17,Math.min(71,cy+Math.sin(a)*r)),R(1.3,2),R(1.6,3)]);}}
  if(k==='archipel'){g.push([R(26,37),R(36,52),.7,R(15,19)]);const isl=[];
    for(let t=0,n=3+Math.floor(R(0,3.5));t<300&&isl.length<n;t++){const p=[R(15,48),R(17,71),R(1.2,2.1),R(1.8,4.3)];if(far(p,isl,p[3]*2.2+8))isl.push(p);}g.push(...isl);}
  if(k==='hautfond'){const cx=R(24,39),cy=R(32,56);g.push([cx,cy,R(.65,.82),R(13,17)]);
    for(let i=0;i<2;i++)g.push([R(18,45),R(20,68),R(.15,.3),R(4,7)]);
    if(Math.random()<.45)g.push([cx+R(-6,6),cy+R(-8,8),R(1,1.3),R(1.5,2.4)]);}
  if(k==='large'){g.push([R(24,39),R(32,56),-R(1.6,2.2),R(15,21)]);
    if(Math.random()<.6)g.push([R(20,43),R(24,64),R(1.8,2.5),R(3,5),1.4]);}
  const c={k,g,seed,ox:0,oy:0,ms:seed,feat:[],fsig:'',lu:Math.random(),lp:Math.random(),lp2:Math.random(),els:[],esig:null,sp:spurs(),na:{ile:.9,archipel:.75,hautfond:.45,large:.9}[k],flip:Math.random()<.5,img:null};
  c.h=(x,y)=>hgt(c,x,y);deco(c);return c;}

const fmask=(c,x,y)=>{x+=c.ox;y+=c.oy;return vn(x/7,y/7,c.ms+9)+.45*vn(x/3,y/3,c.ms+10);};
function deco(c){const{k,seed}=c,trees=[],reef=[],sonde=[],X0=c.feat.length||c.reg?1:4,X1=W-X0,Y1=H-X0;
  const land=k==='ile'||k==='archipel'||k==='hautfond'||k==='terre'||c.feat.some(f=>f.t==='ile');
  if(land)for(let t=0,n=k==='terre'?4200:k==='ile'?2600:1100;t<n;t++){const x=R(X0,X1),y=R(X0,Y1),h=c.h(x,y);if(h<.14)continue;const v=fmask(c,x,y);if(v<.05)continue;
    if(Math.random()>.25+.75*ss((v-.05)/.4))continue;
    const con=h>1.7||vn(x/9,y/9,seed+11)>.3,r=con?R(.6,.95):R(.7,1.3);
    if(trees.every(q=>Math.hypot(q[0]-x,q[1]-y)>(q[2]+r)*.75))trees.push([x,y,r,con,R(0,TAU),5+Math.floor(R(0,3))]);}
  trees.sort((a,b)=>a[1]-b[1]);
  const nr={hautfond:70,archipel:34,ile:18,large:4,terre:14,fond:0}[k]+(c.feat.some(f=>f.t==='banc')?24:0);
  for(let t=0;t<3500&&reef.length<nr;t++){const x=R(X0,X1),y=R(X0,Y1),h=c.h(x,y);if(h>-.03||h<-.34)continue;if(vn(x/4,y/4,seed+12)<-.1)continue;
    if(reef.every(q=>Math.hypot(q[0]-x,q[1]-y)>1.25))reef.push([x,y,R(.28,.42)]);}
  for(let t=0;t<600&&sonde.length<18;t++){const x=R(5,W-5),y=R(5,H-5);if(y<14&&x<40)continue;const h=c.h(x,y);if(h>-.4)continue;
    if(sonde.every(q=>Math.hypot(q[0]-x,q[1]-y)>7.5))sonde.push([x,y,depthM(h)]);}
  Object.assign(c,{trees,reef,sonde});c.raw={trees,reef,sonde};c.esig=null;}

// ---------- remarkable elements ----------
const AL={terre:['village','phare','mouillage'],fond:['epave','bouee'],ile:['phare','village','mouillage','epave'],archipel:['phare','mouillage','recif','bouee','village'],hautfond:['recif','epave','bouee'],large:['epave','bouee']};
const WT={phare:2,village:2,mouillage:1.5,epave:1.5,recif:1.5,bouee:1};
function wpick(list,u){const tot=list.reduce((a,e)=>a+WT[e],0);let acc=0;for(const e of list){acc+=WT[e]/tot;if(u<acc)return e;}return list[list.length-1];}
// count of 12 directions at radius r matching test, and the mean angle of those
function around(c,x,y,r,test){let n=0,ax=0,ay=0;for(let i=0;i<12;i++){const a=i/12*TAU;if(test(c.h(x+Math.cos(a)*r,y+Math.sin(a)*r))){n++;ax+=Math.cos(a);ay+=Math.sin(a);}}return[n,Math.atan2(ay,ax)];}
function spot(c,type){let best=null,bs=-1e9;
  for(let t=0;t<140;t++){const x=R(8,W-8),y=R(8,H-8);if(y<15&&x<38)continue;const h=c.h(x,y);let sc,a=0;
    if(c.els.some(e=>Math.hypot(e.x-x,e.y-y)<e.r+6))continue;
    if(type==='phare'){if(h<.03||h>.5)continue;const[n,an]=around(c,x,y,4,v=>v<-.2);if(n<3)continue;sc=n+R(0,2);a=an;}
    else if(type==='village'){if(h<.06||h>.9)continue;const[sea,an]=around(c,x,y,6,v=>v<0),[dry]=around(c,x,y,2.2,v=>v>.04);if(sea<2||dry<11)continue;
      const sl=Math.abs(c.h(x+1,y)-c.h(x-1,y))+Math.abs(c.h(x,y+1)-c.h(x,y-1));sc=-sl*3+R(0,.5);a=an;}
    else if(type==='mouillage'){if(h>-.15||h<-.9)continue;const[n]=around(c,x,y,7,v=>v>0);if(!n)continue;sc=n+R(0,2);}
    else if(type==='epave'){if(h>-.6)continue;sc=R(0,1);}
    else if(type==='bouee'){if(h>-.15||h<-1.6)continue;sc=R(0,1)-Math.abs(h+.5);}
    else if(type==='recif'){if(h>-.08||h<-.6)continue;const[n]=around(c,x,y,3.5,v=>v>-.08);if(n>4)continue;sc=-Math.abs(h+.25)+R(0,.3);}
    if(sc>bs){bs=sc;best=[x,y,a];}}
  return best;}
function build(c,type){const p=spot(c,type);if(!p)return null;const[x,y,a]=p,e={t:type,x,y,a,r:3};
  if(type==='village'){e.r=6;e.houses=[];for(let k=0;k<70&&e.houses.length<14;k++){const b=R(0,TAU),o=R(.6,3.6),hx=x+Math.cos(b)*o,hy=y+Math.sin(b)*o;
      if(c.h(hx,hy)>.05&&e.houses.every(q=>Math.hypot(q[0]-hx,q[1]-hy)>1.15))e.houses.push([hx,hy,R(.8,1.3),R(.6,.9),R(0,TAU)]);}
    let s=0;while(s<12&&c.h(x+Math.cos(a)*s,y+Math.sin(a)*s)>0)s+=.4;e.jetty=[[x+Math.cos(a)*(s-1.2),y+Math.sin(a)*(s-1.2)],[x+Math.cos(a)*(s+2),y+Math.sin(a)*(s+2)]];}
  if(type==='recif'){e.r=4.5;e.rr=R(3,4);e.marks=[];for(let k=0;k<60&&e.marks.length<11;k++){const b=R(0,TAU),o=Math.sqrt(Math.random())*e.rr*.8,mx=x+Math.cos(b)*o,my=y+Math.sin(b)*o;
      if(e.marks.every(q=>Math.hypot(q[0]-mx,q[1]-my)>1))e.marks.push([mx,my]);}}
  if(type==='epave')e.a=R(-.6,.6);
  if(type==='bouee')e.col=Math.random()<.5?'red':'green';
  if(type==='phare')e.r=3.5;
  return e;}
function placeEls(c,want){c.els=[];
  if(want){const[list,two]=want.split('+'),al=list.split(','),first=wpick(al,c.lp),e=build(c,first);if(e)c.els.push(e);
    if(two==='2'){const rest=al.filter(t=>t!==first);if(rest.length){const e2=build(c,wpick(rest,c.lp2));if(e2)c.els.push(e2);}}}
  const bl=(x,y,m=0)=>c.els.some(e=>Math.hypot(e.x-x,e.y-y)<e.r+m);
  c.trees=c.raw.trees.filter(t=>!bl(t[0],t[1],t[2]*.5));c.reef=c.raw.reef.filter(t=>!bl(t[0],t[1]));c.sonde=c.raw.sonde.filter(t=>!bl(t[0],t[1],2.5));}
function wantEls(c){if(!(c.lu<S.lmf/100))return '';const al=AL[c.k].filter(e=>S.els.includes(e));if(!al.length)return '';return al.join(',')+(c.lu<S.lmf/100*.3?'+2':'+1');}

function box(g,[x,y,w,h,a]){g.save();g.translate(x,y);g.rotate(a);g.fillRect(-w/2,-h/2,w,h);g.restore();}
function crown(g,[x,y,r,con,rot,n],ox,oy){x+=ox;y+=oy;g.beginPath();
  if(con){const k=7;for(let i=0;i<2*k;i++){const a=rot+i*Math.PI/k,q=i%2?r*.52:r;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}}
  else{const m=n*6;for(let i=0;i<m;i++){const a=rot+i/m*TAU,q=r*(.78+.22*Math.abs(Math.sin(n*(a-rot)/2))+.05*Math.sin(3*a+rot*2));g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}}
  g.closePath();}
function plus(g,x,y,s){g.moveTo(x-s,y);g.lineTo(x+s,y);g.moveTo(x,y-s);g.lineTo(x,y+s);}
function drawEls(g,c,C){g.lineCap='round';g.lineJoin='round';
  for(const e of c.els){const{x,y}=e;
    if(e.t==='phare'){g.save();g.translate(x,y);g.rotate(e.a);g.fillStyle=C.mag;g.globalAlpha=.8;g.beginPath();g.moveTo(.4,0);g.quadraticCurveTo(2,-1.2,3.8,0);g.quadraticCurveTo(2,1.2,.4,0);g.fill();g.restore();g.globalAlpha=1;
      g.fillStyle=C.bld;g.beginPath();g.arc(x,y,.5,0,TAU);g.fill();g.strokeStyle=C.bld;g.lineWidth=.2;g.beginPath();g.arc(x,y,.95,0,TAU);g.stroke();}
    if(e.t==='village'){g.strokeStyle=C.bld;g.lineWidth=.45;g.beginPath();g.moveTo(...e.jetty[0]);g.lineTo(...e.jetty[1]);g.stroke();
      g.fillStyle=C.bld;for(const q of e.houses)box(g,q);}
    if(e.t==='mouillage'){g.save();g.translate(x,y);g.strokeStyle=C.mag;g.lineWidth=.24;g.beginPath();g.arc(0,-1.25,.32,0,TAU);g.moveTo(0,-.93);g.lineTo(0,1.15);g.moveTo(-.6,-.5);g.lineTo(.6,-.5);
      g.moveTo(-1.05,.35);g.quadraticCurveTo(-.9,1.2,0,1.2);g.quadraticCurveTo(.9,1.2,1.05,.35);g.moveTo(-1.05,.35);g.lineTo(-1.25,.7);g.moveTo(1.05,.35);g.lineTo(1.25,.7);g.stroke();g.restore();}
    if(e.t==='epave'){g.save();g.translate(x,y);g.rotate(e.a);g.strokeStyle=C.coast;g.lineWidth=.22;g.beginPath();g.moveTo(-1.4,0);g.lineTo(1.4,0);for(const o of[-.75,0,.75]){g.moveTo(o,-.5);g.lineTo(o,.5);}g.stroke();
      g.lineWidth=.14;g.setLineDash([.35,.35]);g.beginPath();g.ellipse(0,0,2.1,1.25,0,0,TAU);g.stroke();g.setLineDash([]);g.restore();}
    if(e.t==='bouee'){const col=C[e.col];g.strokeStyle=C.bld;g.lineWidth=.14;g.beginPath();g.ellipse(x,y+.15,.7,.22,0,0,TAU);g.stroke();
      g.beginPath();g.moveTo(x,y);g.lineTo(x,y-1.1);g.stroke();g.fillStyle=col;g.beginPath();
      if(e.col==='green')g.rect(x-.42,y-1.9,.84,.84);else{g.moveTo(x,y-2.1);g.lineTo(x+.5,y-1.05);g.lineTo(x-.5,y-1.05);g.closePath();}g.fill();}
    if(e.t==='recif'){g.strokeStyle=C.coast;g.globalAlpha=.75;g.lineWidth=.13;g.setLineDash([.3,.4]);g.beginPath();g.ellipse(x,y,e.rr,e.rr*.8,0,0,TAU);g.stroke();g.setLineDash([]);g.globalAlpha=1;
      g.strokeStyle=C.rock;g.lineWidth=.17;g.beginPath();for(const[mx,my]of e.marks)plus(g,mx,my,.42);g.stroke();}}
  g.lineCap='butt';}

function theme(){if(S.paper!=='auto')return S.paper;const t=document.documentElement.dataset.theme;return t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}

function render(c,k){
  const C=PAL[theme()],dpr=devicePixelRatio||1,px=k*dpr;
  const NX=Math.max(42,Math.min(160,Math.round(W*px/3))),NY=Math.round(NX*H/W),dx=W/NX,dy=H/NY;
  const oc=document.createElement('canvas');oc.width=Math.round(W*px);oc.height=Math.round(H*px);
  const g=oc.getContext('2d'),ow=oc.width,oh=oc.height;
  const h=[],fo=[];let lo=1e9,hi=-1e9;
  for(let j=0;j<=NY;j++){h[j]=new Float32Array(NX+1);fo[j]=new Float32Array(NX+1);
    for(let i=0;i<=NX;i++){const x=i*dx,y=j*dy,v=c.h(x,y);h[j][i]=v;fo[j][i]=v>.1?fmask(c,x,y):-1;if(v<lo)lo=v;if(v>hi)hi=v;}}
  // stepped bathymetric tints, sampled per output pixel from the height grid
  {const stops=[[0,rgb(C.s0)],[-.75,rgb(C.s1)],[-1.75,rgb(C.s2)],[-3,rgb(C.s3)],[-4.5,rgb(C.s4)]];
    const ramp=v=>{for(let i=1;i<stops.length;i++)if(v>=stops[i][0]){const[a,ca]=stops[i-1],[b,cb]=stops[i];return mix(ca,cb,(a-v)/(a-b));}return stops[stops.length-1][1];};
    const band=[];for(let b=0;b<28;b++)band.push(ramp(-(b+.5)*STEP).map(Math.round));
    const pa=rgb(C.paper),sa=rgb(C.sand),fa=rgb(C.ftint),im=g.createImageData(ow,oh),P=im.data;
    for(let py=0;py<oh;py++){const gy=(py+.5)/oh*NY,j=Math.min(NY-1,gy|0),fy=gy-j,r0=h[j],r1=h[j+1],f0=fo[j],f1=fo[j+1];
      for(let q=0;q<ow;q++){const gx=(q+.5)/ow*NX,i=Math.min(NX-1,gx|0),fxx=gx-i,
        v=(r0[i]*(1-fxx)+r0[i+1]*fxx)*(1-fy)+(r1[i]*(1-fxx)+r1[i+1]*fxx)*fy,o=(py*ow+q)*4;let col;
        if(v<0)col=band[Math.min(27,(-v/STEP)|0)];
        else if(v<.07)col=sa;
        else{const fm=(f0[i]*(1-fxx)+f0[i+1]*fxx)*(1-fy)+(f1[i]*(1-fxx)+f1[i+1]*fxx)*fy;col=fm>.05?mix(pa,fa,ss((fm-.05)/.12)*.85):pa;}
        P[o]=col[0];P[o+1]=col[1];P[o+2]=col[2];P[o+3]=255;}}
    g.putImageData(im,0,0);}
  g.scale(ow/W,oh/H);
  const march=(f,lv)=>{for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){
    const p=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],pts=[];
    for(let e=0;e<4;e++){const[a1,b1]=p[e],[a2,b2]=p[(e+1)%4],v1=f[b1][a1]-lv,v2=f[b2][a2]-lv;if((v1<0)!==(v2<0)){const t=v1/(v1-v2);pts.push([(a1+(a2-a1)*t)*dx,(b1+(b2-b1)*t)*dy]);}}
    for(let q=0;q+1<pts.length;q+=2){g.moveTo(pts[q][0],pts[q][1]);g.lineTo(pts[q+1][0],pts[q+1][1]);}}};
  const op=S.lop/100;
  // isobaths (index line every metre of model depth = 4 steps), lighter on dark deep water
  for(const idx of[false,true]){g.beginPath();for(let L=Math.ceil(lo/STEP);L<0;L++)if((L%4===0)===idx)march(h,L*STEP);
    g.strokeStyle=C.iso;g.lineWidth=idx?.26:.15;g.globalAlpha=(idx?.7:.42)*op;g.stroke();}
  g.beginPath();for(let L=Math.ceil(lo/STEP);L<0;L++)if(L*STEP<-2.4)march(h,L*STEP);g.strokeStyle=C.isoD;g.lineWidth=.13;g.globalAlpha=.28*op;g.stroke();
  g.beginPath();for(let L=1;L<=Math.floor(hi/STEP);L++)march(h,L*STEP);g.strokeStyle=C.line;g.lineWidth=.24;g.globalAlpha=op;g.stroke();g.globalAlpha=1;
  // coastline with water lines just offshore
  g.strokeStyle=C.coast;for(const[o,a,lw]of[[.05,.6,.17],[.11,.42,.15],[.18,.26,.13]]){g.globalAlpha=a;g.lineWidth=lw;g.beginPath();march(h,-o);g.stroke();}
  g.globalAlpha=1;g.lineWidth=.42;g.beginPath();march(h,0);g.stroke();
  g.strokeStyle=C.rock;g.lineWidth=.14;g.globalAlpha=.75;g.beginPath();for(const[x,y,r]of c.reef)plus(g,x,y,r);g.stroke();g.globalAlpha=1;
  for(const t of c.trees){g.fillStyle=C.tshade;crown(g,t,.32,.38);g.fill();}
  g.lineWidth=.2;g.strokeStyle=C.tstroke;
  for(const t of c.trees){const[x,y,r,con]=t;crown(g,t,0,0);g.fillStyle=con?C.cfill:C.tfill;g.fill();g.stroke();
    if(con){g.fillStyle=C.tstroke;g.beginPath();g.arc(x,y,.14,0,TAU);g.fill();}
    else{g.fillStyle=C.tlight;g.beginPath();g.arc(x-r*.3,y-r*.32,r*.32,0,TAU);g.fill();}}
  drawEls(g,c,C);
  // summits: grid local maxima above 0.7, with altitude
  {const pk=[];for(let j=2;j<NY-1;j++)for(let i=2;i<NX-1;i++){const v=h[j][i];if(v<.7)continue;let top=true;
      for(let b=-2;b<=2&&top;b++)for(let a=-2;a<=2;a++)if((a||b)&&h[j+b][i+a]>v){top=false;break;}
      if(top)pk.push([i*dx,j*dy,v]);}
    pk.sort((a,b)=>b[2]-a[2]);const kept=[];for(const p of pk)if(kept.every(q=>Math.hypot(q[0]-p[0],q[1]-p[1])>9))kept.push(p);
    g.fillStyle=C.idx;g.font='italic 500 1.7px system-ui,sans-serif';g.textAlign='center';
    for(const[x,y,v]of kept.slice(0,4)){g.beginPath();g.moveTo(x,y-.85);g.lineTo(x+.8,y+.55);g.lineTo(x-.8,y+.55);g.closePath();g.fill();g.fillText(Math.round(v*70),x,y+2.4);}}
  if(S.sond){g.font='italic 500 1.75px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
    for(const[x,y,m]of c.sonde){g.fillStyle=c.h(x,y)<-2.3?C.sondD:C.sond;g.globalAlpha=.9;g.fillText(m,x,y);}g.globalAlpha=1;g.textBaseline='alphabetic';}
  g.textAlign='left';
  if(S.labels){g.fillStyle=C.lab;g.strokeStyle=C.paper;g.lineJoin='round';g.lineWidth=.9;const tx=(s,x,y)=>{g.strokeText(s,x,y);g.fillText(s,x,y);};
    g.font='600 4px system-ui,sans-serif';tx(LAB[c.k],4,7);if(c.no){g.textAlign='right';tx(c.no,W-4,7);g.textAlign='left';}if(c.els.length){g.font='500 2.8px system-ui,sans-serif';g.lineWidth=.7;tx(c.els.map(e=>EL[e.t]).join(' · '),4,10.6);}}
  c.img=oc;c.imgKey=key();}
const key=()=>"";
function prng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
return{T:typeof LAB!=='undefined'?LAB:T,KINDS:Object.keys(T),AL,EL,PAL,
  make(kind,seed,el){const old=Math.random;Math.random=prng(seed);try{const c=mk(kind);placeEls(c,el?el+'+1':'');return c;}finally{Math.random=old;}},
  render(c,k,paper,labels){S.paper=paper;S.labels=labels;c.img=null;render(c,k);return c.img;}};
})();
