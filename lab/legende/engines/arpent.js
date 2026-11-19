// GÉNÉRÉ par tools/extract.mjs depuis ../arpent/index.html — ne pas éditer à la main.
window.ARPENT=(()=>{
const S={"labels":false,"lop":100,"paper":"light","els":[],"lmf":0,"mix":{"montagne":25,"foret":25,"plaine":25,"eau":25},"ters":["montagne","foret","plaine","eau"]};
const W=63,H=88,TAU=Math.PI*2,THR=-.9,CL=.125,BL=7;
const PAL={
  light:{paper:'#FAEEDA',line:'#BA7517',idx:'#854F0B',water:'#B5D4F4',deep:'#85B7EB',shore:'#185FA5',ftint:'#D3E8B4',ftint2:'#B3D68A',tfill:'#97C459',cfill:'#6FA33A',tlight:'#C0DD97',tshade:'rgba(39,80,10,.3)',tstroke:'#3B6D11',rock:'#5F5E5A',grass:'#639922',lab:'#633806',edge:'#BA7517',bld:'#4A3626',road:'#A8743A',roadIn:'#FFF8EC',field:'#7FA046'},
  dark:{paper:'#2C2C2A',line:'#854F0B',idx:'#BA7517',water:'#0C447C',deep:'#042C53',shore:'#378ADD',ftint:'#2A4A14',ftint2:'#1F3D0B',tfill:'#3B6D11',cfill:'#2B560C',tlight:'#4F8A1C',tshade:'rgba(0,0,0,.35)',tstroke:'#97C459',rock:'#B4B2A9',grass:'#639922',lab:'#FAC775',edge:'#854F0B',bld:'#EAD9BC',road:'#C28A47',roadIn:'#3A3936',field:'#6E9A3A'}};
const T={montagne:'Montagne',foret:'Forêt',plaine:'Plaine',eau:'Eau'};
let shared=0,nel=0;
// storage key kept from the old name (dos-topo) so saved settings survive the rename
const TK=Object.keys(T);for(const k of TK)if(!(S.mix[k]>=0))S.mix[k]=25;
const syncTers=()=>{if(!TK.some(k=>S.mix[k]>0))TK.forEach(k=>S.mix[k]=25);S.ters=TK.filter(k=>S.mix[k]>0);};syncTers();

const R=(a,b)=>a+Math.random()*(b-a);
const ss=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const M=(x,y,m=13)=>ss(Math.min(x,W-x)/m)*ss(Math.min(y,H-y)/m);
function hsh(i,j,s){const v=Math.sin(i*127.1+j*311.7+s*74.7)*43758.5453;return(v-Math.floor(v))*2-1;}
function vn(x,y,s){const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy);
  const v00=hsh(i,j,s),v10=hsh(i+1,j,s),v01=hsh(i,j+1,s),v11=hsh(i+1,j+1,s);return v00+(v10-v00)*a+(v01-v00)*b+(v00-v10-v01+v11)*a*b;}
const fbm=(x,y,s)=>.6*vn(x/26,y/26,s)+.3*vn(x/12,y/12,s+1)+.12*vn(x/6,y/6,s+2);

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
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function crown(g,[x,y,r,con,rot,n],ox,oy){x+=ox;y+=oy;g.beginPath();
  if(con){const k=7;for(let i=0;i<2*k;i++){const a=rot+i*Math.PI/k,q=i%2?r*.52:r;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}}
  else{const m=n*6;for(let i=0;i<m;i++){const a=rot+i/m*TAU,q=r*(.78+.22*Math.abs(Math.sin(n*(a-rot)/2))+.05*Math.sin(3*a+rot*2));g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}}
  g.closePath();}
const bump=(g,x,y)=>{let s=0;for(const[a,b,amp,sg,p]of g){const r=Math.hypot(x-a,y-b)/sg;s+=amp*Math.exp(-Math.pow(r,p||2)/2);}return s;};
function H0(c,x,y,m){const w=ss(Math.min(x,W-x,y,H-y)/BL);return CL+spurV(c,x,y)+w*(c.na*fbm(x,y,c.seed)+m)+(c.feat.length?fx(c,'montagne',x,y):0);}

// Shared terrains: a feature sits on an edge midpoint or a corner and is split between neighbouring cards.
// On the edge itself its value is a fixed, symmetric profile (so any two cards with the same feature match);
// inside the card, its extent and a ragged noise vary per card and fade to nothing at the edges.
const FP={eau:{a:-2.6,s:9,t:9,c:10},foret:{a:1.25,s:12,t:10,c:13},montagne:{a:2.3,s:8,t:7.5}};
function fx(c,type,x,y){let v=0;const em=ss(Math.min(x,W-x,y,H-y)/5);
  for(const f of c.feat){if(f.t!==type)continue;const P=FP[type];let val,t;
    if(f.kind==='e'){const side=f.side,vert=side==='L'||side==='R',half=vert?H/2:W/2,s=vert?y-H/2:x-W/2;
      t=side==='L'?x:side==='R'?W-x:side==='T'?y:H-y;if(t>45)continue;
      const st=P.t*(1+.4*vn(s/7,.5,f.sd)),sfade=ss((half-Math.abs(s))/6);
      if(type==='montagne')val=P.a*Math.exp(-Math.pow(s*s/(P.s*P.s)+t*t/(st*st),.7)/2)*sfade;
      else val=P.a*Math.exp(-s*s/(2*P.s*P.s))*Math.exp(-t*t/(2*st*st))*sfade;}
    else{const u=Math.abs(x-f.cx),w=Math.abs(y-f.cy),r=Math.hypot(u,w),th=Math.atan2(w,u);t=Math.min(u,w);
      const sg=P.c*(1+.5*Math.sin(2*th)*vn(th*3,.5,f.sd));val=P.a*Math.exp(-r*r/(2*sg*sg));}
    const env=Math.min(1,Math.abs(val/P.a)*3);
    if(env>.01)val+=Math.sign(P.a)*(type==='eau'?.5:type==='foret'?.55:.35)*(vn(x/5,y/5,f.sd+1)+.45*vn(x/2.3,y/2.3,f.sd+2)+(type==='eau'?.15*vn(x/1.2,y/1.2,f.sd+3):0))*env*em;
    v+=val;}
  return v;}


function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// exact card counts per terrain for n cards (largest remainder); ties go to terrains already on the table so redraws don't churn
function targets(n,have){const tot=TK.reduce((a,k)=>a+S.mix[k],0)||1,t={},fr=[];let s=0;
  for(const k of TK){const q=n*S.mix[k]/tot;t[k]=Math.floor(q);s+=t[k];if(S.mix[k]>0)fr.push([k,Math.round((q-t[k])*1e6)]);}
  fr.sort((a,b)=>b[1]-a[1]||(have[b[0]]||0)-(have[a[0]]||0));for(let i=0;s<n;i++,s++)t[fr[i%fr.length][0]]++;return t;}
function wkind(){const tot=TK.reduce((a,k)=>a+S.mix[k],0);let u=Math.random()*tot;for(const k of TK){u-=S.mix[k];if(u<0&&S.mix[k]>0)return k;}return S.ters[0]||'plaine';}
function mk(kf){const k=kf||wkind(),g=[],f=[],peaks=[],isl=[],seed=R(0,1000);
  if(k==='montagne'){const n=Math.random()<.6?1:2;for(let i=0;i<n;i++){const p=[R(22,41),R(28,60),R(3.2,4.2),R(5,6.5),1.4];g.push(p);peaks.push(p);}g.push([R(22,41),R(28,60),R(.6,1),R(9,11)]);f.push([R(16,47),R(64,74),1,R(4,5)]);}
  if(k==='foret'){for(let i=0;i<5;i++)g.push([R(16,47),R(16,72),R(.4,.7),R(4,6)]);{const cx=R(26,37),cy=R(36,52),a0=R(0,TAU);for(const dir of[0,Math.PI,R(1.2,2)])for(let x=cx,y=cy,a=a0+dir,i=0;i<6;i++){f.push([x,y,R(.85,1.1),R(5,8.5)]);a+=R(-.9,.9);x=Math.max(17,Math.min(46,x+Math.cos(a)*6.5));y=Math.max(17,Math.min(71,y+Math.sin(a)*8));}}
    for(let i=0,n=1+(Math.random()<.5);i<n;i++)f.push([R(22,41),R(28,60),-R(1.2,1.6),R(2.5,4.5)]);}
  if(k==='plaine'){for(let i=0;i<3;i++)g.push([R(18,45),R(20,68),R(.3,.6),R(12,18)]);const n=1+Math.floor(Math.random()*2);for(let i=0;i<n;i++)f.push([R(18,45),R(18,70),1,R(3.5,5.5)]);}
  if(k==='eau'){const lx=R(26,37),ly=R(34,54);g.push([lx,ly,-R(2.2,2.7),R(10,12)]);
    for(let i=0;i<2;i++){const a=R(0,TAU),r=R(7,11);g.push([lx+Math.cos(a)*r,ly+Math.sin(a)*r*1.3,-R(.8,1.3),R(4.5,7)]);}
    g.push([R(18,45),R(18,70),R(.3,.5),R(10,14)]);
    if(Math.random()<.5){const ix=lx+R(-3,3),iy=ly+R(-4,4);isl.push([ix,iy,R(2.4,2.9),R(2.6,3.4)]);f.push([ix,iy,.8,R(1.6,2.2)]);}
    f.push([R(16,47),Math.random()<.5?R(14,20):R(68,74),.9,R(4,6)]);}
  // relief with ragged lake shores: noise only where the ground dips
  const I=(x,y)=>isl.length?bump(isl,x,y):0;
  const D0=(x,y)=>{const m=M(x,y)*bump(g,x,y);return (m<0?m+(.45*vn(x/6,y/6,seed+5)+.22*vn(x/2.8,y/2.8,seed+6)+.08*vn(x/1.3,y/1.3,seed+4))*M(x,y)*ss(-m/.8):m)+I(x,y);};
  // forest mask with ragged, lobed edges
  const Fb=(x,y)=>M(x,y,14)*bump(f,x,y);
  const F0=(x,y)=>{const v=Fb(x,y);return v<=0?v:v+.5*(vn(x/5,y/5,seed+7)+.45*vn(x/2.2,y/2.2,seed+8))*Math.min(1,v*2.5);};
  const c={k,g,peaks,seed,feat:[],fsig:'',lu:Math.random(),lp:Math.random(),lp2:Math.random(),els:[],esig:null,sp:spurs(),I,na:{montagne:1.1,foret:1,plaine:.8,eau:.7}[k],flip:Math.random()<.5,img:null};
  c.D=(x,y)=>D0(x,y)+(c.feat.length?fx(c,'eau',x,y):0);c.F=(x,y)=>F0(x,y)+(c.feat.length?fx(c,'foret',x,y):0);
  deco(c);return c;}

function deco(c){const{k,seed,peaks,D,F}=c,sh=c.feat.length>0,X0=sh?0:7,X1=W-X0,Y0=X0,Y1=H-X0;

  const trees=[],tries=(k==='foret'?5200:1100)+(c.feat.some(f=>f.t==='foret')?2600:0);
  for(let t=0;t<tries;t++){const x=R(X0,X1),y=R(Y0,Y1),v=F(x,y);if(v<.3)continue;
    const core=ss((v-.42)/.45),p=v>.42?.2+.8*core:.035;if(Math.random()>p)continue;if(D(x,y)<THR+.08)continue;
    const con=vn(x/9,y/9,seed+9)+R(-.3,.3)>.18,r=con?R(.75,1.25):R(.9,1.85)*(.75+.25*core);
    if(trees.every(t=>Math.hypot(t[0]-x,t[1]-y)>(t[2]+r)*.72))trees.push([x,y,r,con,R(0,TAU),5+Math.floor(R(0,3))]);}
  trees.sort((a,b)=>a[1]-b[1]);
  const under=[];if(trees.length)for(let t=0;t<900&&under.length<(k==='foret'?420:sh?220:90);t++){const x=R(X0,X1),y=R(Y0,Y1);if(F(x,y)>.45)under.push([x,y,R(.1,.22)]);}
  const tufts=[];if(k==='plaine'||k==='eau')for(let t=0;t<260&&tufts.length<(k==='plaine'?26:8);t++){const x=R(9,54),y=R(9,79);if(F(x,y)<.2&&D(x,y)>THR+.3)tufts.push([x,y]);}
  const reeds=[],wet=k==='eau'||c.feat.some(f=>f.t==='eau');if(wet)for(let t=0;t<2000&&reeds.length<(k==='eau'?16:8)+(sh?8:0);t++){const x=R(X0+2,X1-2),y=R(Y0+2,Y1-2),v=D(x,y);if(v>THR-.06&&v<THR+.22&&reeds.every(([a,b])=>Math.hypot(a-x,b-y)>2.6))reeds.push([x,y,R(1.1,1.8)]);}
  const rocks=[];for(const p of peaks)for(let t=0;t<14;t++){const a=R(0,TAU),r=R(2,p[3]*1.6);rocks.push([p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r,R(.35,.7)]);}
  if(c.feat.some(f=>f.t==='montagne'))for(let t=0;t<400&&rocks.length<40;t++){const x=R(1,62),y=R(1,87);if(fx(c,'montagne',x,y)>1.3&&Math.random()<.5)rocks.push([x,y,R(.35,.65)]);}
  Object.assign(c,{trees,under,tufts,reeds,rocks});c.raw={trees,under,tufts,reeds};c.esig=null;}

// ---------- remarkable elements ----------
const EL={village:'Village',ferme:'Ferme',moulin:'Moulin',chapelle:'Chapelle',tour:'Tour de guet',menhirs:'Menhirs',mine:'Mine',ponton:'Ponton',cabane:'Cabane'};
const AL={montagne:['mine','tour','chapelle'],foret:['cabane','tour','menhirs','chapelle'],plaine:['village','ferme','moulin','menhirs','chapelle'],eau:['village','ponton','moulin','chapelle']};
const WT={village:3,ferme:2.5,moulin:1.5,chapelle:1,tour:1.2,menhirs:1,mine:1.5,ponton:2.5,cabane:2};
const SMALL=['chapelle','moulin','tour','menhirs'];
function wpick(list,u){const tot=list.reduce((a,e)=>a+WT[e],0);let acc=0;for(const e of list){acc+=WT[e]/tot;if(u<acc)return e;}return list[list.length-1];}
const rot=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
function inRect(x,y,[cx,cy,w,h,a]){const[u,v]=rot(x-cx,y-cy,-a);return Math.abs(u)<w/2&&Math.abs(v)<h/2;}
function hv(c,x,y){return H0(c,x,y,c.D(x,y)-c.I(x,y));}
function road(c,x,y,a,L,step=1.2,wig=.15){const pts=[[x,y]];for(let s=0;s<L;s+=step){a+=R(-wig,wig);x+=Math.cos(a)*step;y+=Math.sin(a)*step;
  if(x<3||x>W-3||y<3||y>H-3||c.D(x,y)<THR+.15)break;pts.push([x,y]);}return pts;}

function spot(c,type){const mg={village:15,ferme:16}[type]||9;let best=null,bs=-1e9;
  for(let t=0;t<90;t++){const x=R(mg,W-mg),y=R(mg,H-mg),d=c.D(x,y),f=c.F(x,y);
    if(type==='ponton'){if(d<THR+.04||d>THR+.3)continue;}else if(d<THR+.45)continue;
    if(type==='cabane'){if(f<.55)continue;}else if(f>.3)continue;
    if(c.els.some(e=>Math.hypot(e.x-x,e.y-y)<e.r+5))continue;
    if(type!=='tour'&&c.peaks.some(p=>Math.hypot(p[0]-x,p[1]-y)<4))continue;
    const h=hv(c,x,y),sl=Math.abs(hv(c,x+1,y)-hv(c,x-1,y))+Math.abs(hv(c,x,y+1)-hv(c,x,y-1));let sc;
    if(type==='tour'||type==='mine')sc=h-(type==='mine'?sl*.5:0);
    else if(type==='moulin')sc=h*.6-sl+R(0,.3);
    else if(type==='village'){sc=-sl*2+R(0,.3);for(let k=0;k<8;k++){const a=k/8*TAU;if(c.D(x+Math.cos(a)*9,y+Math.sin(a)*9)<THR){sc+=.8;break;}}}
    else if(type==='ferme')sc=-sl*3+R(0,.2);else sc=R(0,1);
    if(sc>bs){bs=sc;best=[x,y];}}
  return best;}

function build(c,type){const p=spot(c,type);if(!p)return null;const[x,y]=p,e={t:type,x,y,r:4,circ:[[x,y,3]],rects:[]};
  if(type==='village'){const big=Math.random()<.35;e.big=big;e.r=big?22:16;e.roads=[];e.houses=[];const n=(big?3:2)+Math.floor(R(0,big?2.5:2.3)),a0=R(0,TAU);e.a=a0;
    for(let i=0;i<n;i++)e.roads.push(road(c,x,y,a0+i*TAU/n+R(-.4,.4),big?R(13,22):R(8,15)));
    if(big){const mains=e.roads.slice();for(const r of mains)for(let k=4;k<r.length-2;k+=Math.floor(R(4,7))){if(Math.random()<.35)continue;const[ax,ay]=r[k-1],[bx,by]=r[k],a=Math.atan2(by-ay,bx-ax)+(Math.random()<.5?1:-1)*Math.PI/2+R(-.3,.3);
      const lane=road(c,bx,by,a,R(4,9),1.1,.12);if(lane.length>2)e.roads.push(lane);}}
    const ok=(hx,hy)=>c.D(hx,hy)>THR+.25&&hx>2&&hx<W-2&&hy>2&&hy<H-2&&e.houses.every(q=>Math.hypot(q[0]-hx,q[1]-hy)>1.3)&&e.roads.every(r=>r.every(([u,v])=>Math.hypot(u-hx,v-hy)>.95));
    for(const r of e.roads)for(let k=1;k<r.length;k++){const[ax,ay]=r[k-1],[bx,by]=r[k],a=Math.atan2(by-ay,bx-ax);
      for(const sd of[-1,1]){if(Math.random()>(big?.95:.85)*(1-(big?.45:.65)*k/r.length))continue;const o=R(1.2,1.6),hx=bx-Math.sin(a)*o*sd,hy=by+Math.cos(a)*o*sd;
        if(ok(hx,hy))e.houses.push([hx,hy,R(.9,1.5),R(.65,1),a+R(-.1,.1)]);
        if(big&&k<r.length*.5&&Math.random()<.45){const o2=o+R(1.3,1.7),gx=bx-Math.sin(a)*o2*sd,gy=by+Math.cos(a)*o2*sd;if(ok(gx,gy))e.houses.push([gx,gy,R(.8,1.3),R(.6,.9),a+R(-.15,.15)]);}}}
    for(let k=0;k<(big?40:14)&&e.houses.length<(big?70:26);k++){const a=R(0,TAU),o=R(1.8,big?5:3.4),hx=x+Math.cos(a)*o,hy=y+Math.sin(a)*o;if(ok(hx,hy))e.houses.push([hx,hy,R(.9,1.4),R(.7,1),a0+Math.round(R(0,3))*Math.PI/2]);}
    const[cx,cy]=[x+Math.cos(a0+Math.PI/4)*2.2,y+Math.sin(a0+Math.PI/4)*2.2];e.church=big?[cx,cy,3,1.4,a0]:[cx,cy,2.4,1.15,a0];
    e.houses=e.houses.filter(q=>Math.hypot(q[0]-cx,q[1]-cy)>1.8);
    for(const r of e.roads)for(const[u,v]of r)e.circ.push([u,v,1.2]);for(const q of e.houses)e.circ.push([q[0],q[1],1.3]);}
  if(type==='ferme'){e.r=17;const a=R(0,TAU);e.a=a;
    e.blds=[[0,0,2.4,1.1],[1.7,1.5,1.1,1.9],[-1.5,1.6,1.6,1]].map(([u,v,w,h])=>{const[px,py]=rot(u,v,a);return[x+px,y+py,w,h,a];});
    e.parcels=[];for(let gx=-2;gx<=2;gx++)for(let gy=-2;gy<=2;gy++){if(Math.abs(gx)+Math.abs(gy)<1||Math.random()<.42)continue;
      const w=R(4.2,5.3),h=R(3.2,4.1),[px,py]=rot(gx*5.6+R(-.3,.3),gy*4.4+R(-.3,.3),a),q=[x+px,y+py,w,h,a];let good=true;
      for(const[du,dv]of[[0,0],[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){const[ox,oy]=rot(du*w,dv*h,a),qx=q[0]+ox,qy=q[1]+oy;if(qx<3||qx>W-3||qy<3||qy>H-3||c.D(qx,qy)<THR+.3||c.F(qx,qy)>.35){good=false;break;}}
      if(good)e.parcels.push([...q,Math.random()<.5?0:Math.PI/2,R(.45,.7)]);}
    e.track=road(c,x,y,a+Math.PI/2*(Math.random()<.5?1:-1),R(6,10),1,.1);e.rects=e.parcels;for(const[u,v]of e.track)e.circ.push([u,v,1]);}
  if(type==='ponton'){let bx=0,by=0;for(let k=0;k<16;k++){const a=k/16*TAU,v=c.D(x+Math.cos(a)*4,y+Math.sin(a)*4);if(v<THR){bx+=Math.cos(a)*(THR-v);by+=Math.sin(a)*(THR-v);}}e.a=Math.atan2(by,bx);e.r=5;e.len=2.4;while(e.len<7&&c.D(x+Math.cos(e.a)*e.len,y+Math.sin(e.a)*e.len)>THR-.25)e.len+=.4;e.len+=.8;}
  if(type==='cabane'){e.a=R(0,TAU);e.circ=[[x,y,3.6]];e.track=road(c,x,y,R(0,TAU),R(4,7),1,.25);for(const[u,v]of e.track)e.circ.push([u,v,.9]);}
  if(type==='menhirs'){e.n=8+Math.floor(R(0,4));e.rr=R(1.6,2.1);e.ph=R(0,TAU);}
  if(type==='moulin'||type==='tour'||type==='chapelle'||type==='mine')e.a=R(0,TAU);
  return e;}

function placeEls(c,want){c.els=[];
  if(want){const[list,two]=want.split('+'),al=list.split(',');const first=wpick(al,c.lp),e=build(c,first);if(e)c.els.push(e);
    if(two==='2'){const sm=al.filter(t=>SMALL.includes(t)&&t!==first);if(sm.length){const e2=build(c,wpick(sm,c.lp2));if(e2)c.els.push(e2);}}}
  const bl=(x,y,m=0)=>c.els.some(e=>e.circ.some(([u,v,r])=>Math.hypot(u-x,v-y)<r+m)||e.rects.some(q=>inRect(x,y,q)));
  c.trees=c.raw.trees.filter(t=>!bl(t[0],t[1],t[2]*.6));c.under=c.raw.under.filter(t=>!bl(t[0],t[1]));
  c.tufts=c.raw.tufts.filter(t=>!bl(t[0],t[1]));c.reeds=c.raw.reeds.filter(t=>!c.els.some(e=>e.t==='ponton'&&Math.hypot(e.x-t[0],e.y-t[1])<5)&&!bl(t[0],t[1]));}
function wantEls(c){if(!(c.lu<S.lmf/100))return '';const al=AL[c.k].filter(e=>S.els.includes(e));if(!al.length)return '';return al.join(',')+(c.lu<S.lmf/100*.3?'+2':'+1');}

function drawRoad(g,C,pts,w){if(pts.length<2)return;g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);
  g.strokeStyle=C.road;g.lineWidth=w;g.stroke();g.strokeStyle=C.roadIn;g.lineWidth=w*.45;g.stroke();}
function box(g,[x,y,w,h,a]){g.save();g.translate(x,y);g.rotate(a);g.fillRect(-w/2,-h/2,w,h);g.restore();}
function cross(g,x,y,s){g.beginPath();g.moveTo(x,y-s);g.lineTo(x,y+s);g.moveTo(x-s*.6,y-s*.35);g.lineTo(x+s*.6,y-s*.35);g.stroke();}
function drawEls(g,c,C){g.lineCap='round';g.lineJoin='round';
  for(const e of c.els){const{x,y}=e;
    if(e.t==='village'){g.lineCap='butt';for(const r of e.roads){g.beginPath();g.moveTo(...r[0]);for(const p of r.slice(1))g.lineTo(...p);g.strokeStyle=C.road;g.lineWidth=.95;g.stroke();}
      for(const r of e.roads){g.beginPath();g.moveTo(...r[0]);for(const p of r.slice(1))g.lineTo(...p);g.strokeStyle=C.roadIn;g.lineWidth=.45;g.stroke();}g.lineCap='round';
      g.fillStyle=C.bld;for(const q of e.houses)box(g,q);box(g,e.church);
      g.strokeStyle=C.bld;g.lineWidth=.22;const[px,py]=rot(0,-1.6,e.church[4]);cross(g,e.church[0]+px,e.church[1]+py,.55);}
    if(e.t==='ferme'){for(const q of e.parcels){const[px,py,w,h,a,ha,sp]=q;g.save();g.translate(px,py);g.rotate(a);
        g.fillStyle=C.field;g.globalAlpha=.2;g.fillRect(-w/2,-h/2,w,h);g.globalAlpha=1;g.beginPath();g.rect(-w/2,-h/2,w,h);g.save();g.clip();
        g.rotate(ha);g.strokeStyle=C.field;g.lineWidth=.13;g.beginPath();for(let o=-6;o<6;o+=sp){g.moveTo(-6,o);g.lineTo(6,o);}g.stroke();g.restore();
        g.strokeStyle=C.field;g.lineWidth=.22;g.strokeRect(-w/2,-h/2,w,h);g.restore();}
      drawRoad(g,C,e.track,.7);g.fillStyle=C.bld;for(const q of e.blds)box(g,q);}
    if(e.t==='moulin'){g.fillStyle=C.bld;g.beginPath();g.arc(x,y,.65,0,TAU);g.fill();g.strokeStyle=C.bld;g.lineWidth=.22;g.beginPath();
      for(let i=0;i<4;i++){const a=e.a+i*Math.PI/2+Math.PI/4,[ux,uy]=[Math.cos(a),Math.sin(a)];g.moveTo(x,y);g.lineTo(x+ux*2,y+uy*2);
        g.moveTo(x+ux*1+(-uy)*.45,y+uy*1+ux*.45);g.lineTo(x+ux*2+(-uy)*.45,y+uy*2+ux*.45);g.lineTo(x+ux*2,y+uy*2);}g.stroke();}
    if(e.t==='chapelle'){g.fillStyle=C.bld;box(g,[x,y,1.7,.95,e.a]);g.strokeStyle=C.bld;g.lineWidth=.22;cross(g,x,y-1.5,.55);}
    if(e.t==='tour'){g.fillStyle=C.paper;g.beginPath();g.arc(x,y,1,0,TAU);g.fill();g.strokeStyle=C.bld;g.lineWidth=.3;g.stroke();
      g.fillStyle=C.bld;g.beginPath();g.arc(x,y,.48,0,TAU);g.fill();g.lineWidth=.18;g.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU;g.moveTo(x+Math.cos(a)*1.15,y+Math.sin(a)*1.15);g.lineTo(x+Math.cos(a)*1.55,y+Math.sin(a)*1.55);}g.stroke();}
    if(e.t==='menhirs'){g.fillStyle=C.rock;for(let i=0;i<e.n;i++){const a=e.ph+i/e.n*TAU;g.beginPath();g.ellipse(x+Math.cos(a)*e.rr,y+Math.sin(a)*e.rr,.3,.48,a,0,TAU);g.fill();}
      g.beginPath();g.ellipse(x,y,.35,.6,e.ph,0,TAU);g.fill();}
    if(e.t==='mine'){g.strokeStyle=C.bld;g.lineWidth=.3;g.save();g.translate(x,y);g.rotate(e.a*.1);g.beginPath();
      for(const sd of[1,-1]){g.moveTo(-1.1*sd,1.1);g.lineTo(1*sd,-1);g.moveTo(.4*sd,-1.35);g.quadraticCurveTo(1.1*sd,-1.15,1.35*sd,-.4);}g.stroke();
      g.fillStyle=C.rock;for(let i=0;i<9;i++){const a=i/9*TAU+.3;g.beginPath();g.arc(Math.cos(a)*2.1,Math.sin(a)*2.1+.3,.18,0,TAU);g.fill();}g.restore();}
    if(e.t==='ponton'){g.save();g.translate(x,y);g.rotate(e.a);const L=e.len;g.fillStyle=C.paper;g.fillRect(-.3,-.3,L,.6);g.strokeStyle=C.bld;g.lineWidth=.2;g.strokeRect(-.3,-.3,L,.6);
      g.beginPath();for(let k=0;k<L-.4;k+=.6){g.moveTo(k,-.3);g.lineTo(k,.3);}g.stroke();
      g.fillStyle=C.bld;g.beginPath();g.ellipse(L-1.2,1,.9,.32,0,0,TAU);g.fill();g.fillRect(-1.9,-.6,1.3,1.2);g.restore();}
    if(e.t==='cabane'){g.fillStyle=C.ftint;g.globalAlpha=.6;g.beginPath();g.arc(x,y,3,0,TAU);g.fill();g.globalAlpha=1;
      g.strokeStyle=C.road;g.lineWidth=.25;g.setLineDash([.6,.5]);g.beginPath();e.track.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();g.setLineDash([]);
      g.fillStyle=C.bld;box(g,[x,y,1.4,1,e.a]);g.fillStyle=C.rock;g.beginPath();g.arc(x+1.6,y+.8,.4,0,TAU);g.fill();}}
  g.lineCap='butt';}

function theme(){if(S.paper!=='auto')return S.paper;const t=document.documentElement.dataset.theme;return t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}

function render(c,k){
  const C=PAL[theme()],dpr=devicePixelRatio||1,px=k*dpr;
  const NX=Math.max(42,Math.min(160,Math.round(W*px/3))),NY=Math.round(NX*H/W),dx=W/NX,dy=H/NY;
  const oc=document.createElement('canvas');oc.width=Math.round(W*px);oc.height=Math.round(H*px);
  const g=oc.getContext('2d');g.scale(oc.width/W,oc.height/H);
  const h=[],d=[],fo=[],isl=[];let lo=1e9,hi=-1e9;
  for(let j=0;j<=NY;j++){h[j]=new Float32Array(NX+1);d[j]=new Float32Array(NX+1);fo[j]=new Float32Array(NX+1);isl[j]=new Float32Array(NX+1);
    for(let i=0;i<=NX;i++){const x=i*dx,y=j*dy,m=c.D(x,y),is=c.I(x,y);d[j][i]=m;isl[j][i]=is;const v=H0(c,x,y,m-is);h[j][i]=v;fo[j][i]=c.F(x,y);if(v<lo)lo=v;if(v>hi)hi=v;}}
  const wet=[];for(let j=0;j<NY;j++){wet[j]=new Uint8Array(NX);for(let i=0;i<NX;i++)wet[j][i]=Math.min(d[j][i],d[j][i+1],d[j+1][i],d[j+1][i+1])<THR||Math.max(isl[j][i],isl[j][i+1],isl[j+1][i],isl[j+1][i+1])>.2;}
  const march=(f,lv,skip)=>{for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){if(skip&&skip[j][i])continue;
    const p=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],pts=[];
    for(let e=0;e<4;e++){const[a1,b1]=p[e],[a2,b2]=p[(e+1)%4],v1=f[b1][a1]-lv,v2=f[b2][a2]-lv;if((v1<0)!==(v2<0)){const t=v1/(v1-v2);pts.push([(a1+(a2-a1)*t)*dx,(b1+(b2-b1)*t)*dy]);}}
    for(let q=0;q+1<pts.length;q+=2){g.moveTo(pts[q][0],pts[q][1]);g.lineTo(pts[q+1][0],pts[q+1][1]);}}};
  g.fillStyle=C.paper;g.fillRect(0,0,W,H);
  {const tc=document.createElement('canvas');tc.width=NX+1;tc.height=NY+1;const tg=tc.getContext('2d'),im=tg.createImageData(NX+1,NY+1),P=im.data;
    const fa=rgb(C.ftint),fb=rgb(C.ftint2),wa=rgb(C.water),wb=rgb(C.deep);
    for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const o=(j*(NX+1)+i)*4,w=d[j][i],v=fo[j][i];let col=null,al=0;
      if(w<THR+.04){const t=ss((THR-w)/1.5);col=mix(wa,wb,t);al=ss((THR+.04-w)/.08);}
      else if(v>.38){col=mix(fa,fb,ss((v-.6)/.6));al=ss((v-.38)/.08);}
      if(col){P[o]=col[0];P[o+1]=col[1];P[o+2]=col[2];P[o+3]=al*255;}}
    tg.putImageData(im,0,0);g.imageSmoothingEnabled=true;g.drawImage(tc,-dx/2,-dy/2,W+dx,H+dy);}
  for(let L=Math.ceil(lo/.25);L<=Math.floor(hi/.25);L++){g.strokeStyle=C.line;g.lineWidth=.25;g.globalAlpha=S.lop/100;g.beginPath();march(h,L*.25,wet);g.stroke();}g.globalAlpha=1;
  g.strokeStyle=C.shore;for(const[o,a,lw]of[[.08,.9,.24],[.19,.7,.22],[.34,.55,.2],[.54,.42,.18],[.8,.3,.16]]){g.globalAlpha=a;g.lineWidth=lw;g.beginPath();march(d,THR-o,null);g.stroke();}
  g.globalAlpha=.35;g.lineWidth=.2;g.setLineDash([1.2,.8]);g.beginPath();march(d,THR-1.25,null);g.stroke();g.setLineDash([]);g.globalAlpha=1;
  g.lineWidth=.45;g.beginPath();march(d,THR,null);g.stroke();
  g.lineWidth=.2;g.globalAlpha=.85;g.beginPath();for(const[x,y,l]of c.reeds){g.moveTo(x-l*.6,y);g.lineTo(x+l*.6,y);for(const o of[-.45,0,.45]){g.moveTo(x+o*l,y-.15);g.lineTo(x+o*l*1.25,y-.9-(o?0:.25));}g.moveTo(x-l*.3,y+.6);g.lineTo(x+l*.3,y+.6);}g.stroke();g.globalAlpha=1;
  g.strokeStyle=C.tstroke;g.lineWidth=.35;g.setLineDash([.5,.7]);g.beginPath();march(fo,.42,null);g.stroke();g.setLineDash([]);
  g.fillStyle=C.tstroke;g.globalAlpha=.45;for(const[x,y,r]of c.under){g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}g.globalAlpha=1;
  g.strokeStyle=C.grass;g.lineWidth=.25;g.beginPath();for(const[x,y]of c.tufts)for(const o of[-.7,0,.7]){g.moveTo(x+o*.5,y);g.lineTo(x+o,y-1);}g.stroke();
  g.fillStyle=C.rock;for(const[x,y,r]of c.rocks){g.beginPath();g.moveTo(x,y-r);g.lineTo(x+r,y+r*.6);g.lineTo(x-r,y+r*.6);g.closePath();g.fill();}
  for(const t of c.trees){g.fillStyle=C.tshade;crown(g,t,.38,.45);g.fill();}
  g.lineWidth=.24;g.strokeStyle=C.tstroke;
  for(const t of c.trees){const[x,y,r,con]=t;crown(g,t,0,0);g.fillStyle=con?C.cfill:C.tfill;g.fill();g.stroke();
    if(con){g.fillStyle=C.tstroke;g.beginPath();g.arc(x,y,.16,0,TAU);g.fill();}
    else{g.fillStyle=C.tlight;g.beginPath();g.arc(x-r*.3,y-r*.32,r*.32,0,TAU);g.fill();g.beginPath();g.arc(x+r*.1,y+r*.05,r*.42,3.6,5.1);g.stroke();}}
  drawEls(g,c,C);
  g.fillStyle=C.idx;for(const[x,y]of c.peaks){g.beginPath();g.moveTo(x,y-1.1);g.lineTo(x+1,y+.7);g.lineTo(x-1,y+.7);g.closePath();g.fill();}
  if(S.labels){g.fillStyle=C.lab;g.font='600 4px system-ui,sans-serif';g.fillText(T[c.k],4,7);if(c.no){g.textAlign='right';g.fillText(c.no,W-4,7);g.textAlign='left';}if(c.els.length){g.font='500 2.8px system-ui,sans-serif';g.fillText(c.els.map(e=>e.big?'Bourg':EL[e.t]).join(' · '),4,10.6);}}
  c.img=oc;c.imgKey=key();}
const key=()=>"";
// Légende: domain-warp a model's relief and forest (faded to nothing at the card edges) so lakes and woods are not round blobs, then redo the decoration
function warpC(c,seed){const D=c.D,F=c.F,s=(seed%997)+31,a=4+3*Math.random(),
  wp=(x,y)=>{const f=ss((Math.min(x,W-x,y,H-y)-2)/10);return f<=0?[x,y]:[x+f*a*(vn(x/13,y/13,s)+.4*vn(x/5,y/5,s+1)),y+f*a*(vn(x/13,y/13,s+2)+.4*vn(x/5,y/5,s+3))];};
  c.D=(x,y)=>D(...wp(x,y));if(F)c.F=(x,y)=>F(...wp(x,y));deco(c);}
function prng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
return{T:typeof LAB!=='undefined'?LAB:T,KINDS:Object.keys(T),AL,EL,PAL,
  make(kind,seed,el,warp){const old=Math.random;Math.random=prng(seed);try{const c=mk(kind);if(warp)warpC(c,seed);placeEls(c,el?el+'+1':'');return c;}finally{Math.random=old;}},
  render(c,k,paper,labels){S.paper=paper;S.labels=labels;c.img=null;render(c,k);return c.img;}};
})();
