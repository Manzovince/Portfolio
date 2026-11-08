'use strict';
/* ---------- écran d'accueil : la rue du village, vue en perspective ----------
   Un petit moteur 3D en pixels : chaque face plane est remplie pixel par pixel
   (rayon caméra → plan → point du monde → texture), la scène fixe est mise en cache
   en deux calques (derrière / devant le coureur assis sur la véranda). Mètres : X vers la droite
   (la route), Y vers le haut, Z vers le fond. */
const HV={key:'',back:null,front:null,lit:[],sit:null};
function homeCam(){
  const port=W<H*1.1;
  return{F:port?W*.62:W*.55,cx:W*(port?1:.8),hy:Math.round(H*(port?.36:.56)),cy:1.6};
}
function homeScene(g,t,night){
  const key=W+'x'+H+(night?'n':'d')+(typeof saison==='function'?saison():'');
  if(HV.key!==key){HV.key=key;buildHome(night)}
  g.drawImage(HV.back,0,0);
  drawSitter(g,t);
  g.drawImage(HV.front,0,0);
}
// fenêtres éclairées : halo après la teinte de nuit
function homeLights(a){
  ctx.globalCompositeOperation='lighter';
  for(const[x,y,w,h]of HV.lit){ctx.fillStyle=`rgba(255,190,110,${.28*a})`;ctx.fillRect(x-1,y-1,w+2,h+2);ctx.fillStyle=`rgba(255,220,150,${.5*a})`;ctx.fillRect(x,y,w,h)}
  ctx.globalCompositeOperation='source-over';
}

function buildHome(night){
  const C=homeCam(),{F,cx,hy,cy}=C;
  const back=PB(W,H),front=PB(W,H);let pb=back;
  const P=(X,Y,Z)=>[cx+X*F/Z,hy-(Y-cy)*F/Z];
  const col=(h,f=1)=>{const c=hex(h);return u32([clamp(c[0]*f,0,255),clamp(c[1]*f,0,255),clamp(c[2]*f,0,255)])};
  const mixc=(a,b,t)=>u32(mix(hex(a),hex(b),clamp(t,0,1)));
  const haze=(h,Z,f=1)=>{const c=hex(h),k=clamp((Z-12)/110,0,.6),hz=[150,184,200];return u32(mix([c[0]*f,c[1]*f,c[2]*f],hz,k))};
  HV.lit=[];

  // --- remplissage d'un polygone plan : tex(X,Y,Z,x,y) → couleur ou null (transparent)
  function face(pts,tex){
    const S=pts.map(p=>P(...p));let y0=Infinity,y1=-Infinity;for(const s of S){y0=Math.min(y0,s[1]);y1=Math.max(y1,s[1])}
    const A=pts[0],B=pts[1],Cc=pts[2],u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],v=[Cc[0]-A[0],Cc[1]-A[1],Cc[2]-A[2]];
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],nd=n[0]*A[0]+n[1]*(A[1]-cy)+n[2]*A[2];
    for(let y=Math.max(0,Math.ceil(y0-.5));y<=Math.min(H-1,Math.floor(y1-.5));y++){
      const yc=y+.5,xs=[];
      for(let i=0;i<S.length;i++){const a=S[i],b=S[(i+1)%S.length];if((a[1]<=yc)!==(b[1]<=yc))xs.push(a[0]+(yc-a[1])/(b[1]-a[1])*(b[0]-a[0]))}
      xs.sort((p,q)=>p-q);
      for(let k=0;k+1<xs.length;k+=2)for(let x=Math.max(0,Math.ceil(xs[k]-.5));x<=Math.min(W-1,Math.floor(xs[k+1]-.5));x++){
        const dx=(x+.5-cx)/F,dy=-(yc-hy)/F,den=n[0]*dx+n[1]*dy+n[2];if(Math.abs(den)<1e-9)continue;
        const tt=nd/den,c=tex(dx*tt,cy+dy*tt,tt,x,y);if(c!=null)pb.p(x,y,c)}
    }
  }
  const quad=(x0,y0,z0,x1,y1,z1,tex)=>{ // rectangle aligné : X constant (x0===x1) ou Z constant (z0===z1) ou Y constant
    if(x0===x1)face([[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],tex);
    else if(z0===z1)face([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]],tex);
    else face([[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],tex)};
  const solid=c=>()=>c;
  const dith=(a,b,p)=>(X,Y,Z,x,y)=>bay(x,y)<p?b:a;

  // --- collines au fond
  const ridge=(x,base,amp,s)=>hy-H*base-H*amp*(.55+.45*fbm(x/W*2.2+s,s*7,4));
  for(let x=0;x<W;x++){
    const u=x/W,far=ridge(x,.12+.18*(1-u)*(1-u),.14,3),mid=ridge(x,.05+.16*Math.pow(1-u,1.6),.1,9),nr=ridge(x,.02+.05*(1-u),.05,17);
    for(let y=Math.max(0,Math.floor(far));y<hy;y++){
      let c;
      if(y>=nr){const n=vn2(x/2.2,y/2.2,5);c=n>.15?col('#3e7a3a'):n>-.2?col('#4a8a42'):col('#33683a')}
      else if(y>=mid){const n=vn2(x/3,y/2.4,3);c=n>.2?col('#6aa65a'):n>-.25?col('#5a984e'):col('#4c8846');if(y<mid+1)c=col('#82b86a')}
      else{const n=vn2(x/4,y/3,1);c=n>.1?col('#88b49a'):col('#7aa892');if(y<far+1)c=col('#a0c4ae')}
      pb.p(x,y,c)}
  }
  // --- le sol : route, bas-côté, trottoir, pelouses
  for(let y=hy;y<H;y++){const Z=cy*F/(y+.5-hy);
    for(let x=0;x<W;x++){const X=(x+.5-cx)*Z/F;let c;
      const gr=(a,b,s)=>{const n=vn2(X*1.3,Z*1.3,s);return haze(n>.1?a:b,Z,1+.08*hs2(x,y))};
      if(X>-1.25&&X<6.4){const lane=Math.abs(X-2.55);
        c=lane>.06&&lane<.2?haze('#e8b42a',Z):(Math.abs(X+1)<.09||Math.abs(X-6.15)<.09)?haze('#e8e6dc',Z):haze(hs2(x,y)<.12?'#55565c':hs2(x+3,y)<.1?'#3e3f44':'#4a4b50',Z)}
      else if(X<=-1.25&&X>-1.75)c=gr('#8ab84e','#6e9e3e',2);
      else if(X<=-1.75&&X>-3.5){const j=(Z%1.6+1.6)%1.6;c=j<.06||Math.abs(X+2.62)<.03&&hs2(Math.floor(Z/1.6),3)<.3?haze('#a8a494',Z):haze(hs2(Math.floor(Z/1.6),Math.floor(X*3))<.08&&hs2(x,y)<.4?'#8aa858':'#d6d2c2',Z,1-.04*hs2(Math.floor(Z/1.6),1))}
      else if(X<=-3.5)c=gr('#78aa48','#64983c',4);
      else c=gr('#7aaa4a','#5e8e3a',6);
      pb.p(x,y,c)}}

  // --- arbres (sprites en pixels à la bonne échelle)
  function tree(X,Z,kind,hgt){
    const [sx,sy]=P(X,0,Z),s=F/Z,hpx=hgt*s;if(sx<-hpx||sx>W+hpx)return;
    if(kind==='pin'){const w=hpx*.32;for(let k=0;k<hpx;k++){const yy=Math.round(sy-k),f=k/hpx,half=w*(1-f)*(1-.25*((k%Math.max(3,Math.round(hpx/7)))/Math.max(3,Math.round(hpx/7))));
      for(let i=-Math.round(half);i<=Math.round(half);i++){if(f<.08&&Math.abs(i)<half*.25){pb.p(sx+i,yy,haze('#5a3a24',Z));continue}if(f<.08)continue;
        const n=vn2((sx+i)/1.6,yy/1.6,X);pb.p(sx+i,yy,haze(i<-half*.2?(n>0?'#3a6a3e':'#2e5a34'):n>.2?'#24482a':'#2a5230',Z))}}}
    else{const r=hpx*.36,cyy=sy-hpx*.62;const tr=Math.max(1,Math.round(s*.35));for(let k=0;k<hpx*.45;k++)for(let i=0;i<tr;i++)pb.p(sx-tr/2+i,sy-k,haze('#5a4030',Z));
      for(let j=-r*1.1;j<=r;j++)for(let i=-r*1.2;i<=r*1.2;i++){const d=Math.hypot(i/1.15,j)/r+.22*vn2((sx+i)/(r*.5+1),(cyy+j)/(r*.5+1),Z)+.12*vn2((sx+i)/2,(cyy+j)/2,X);
        if(d>1)continue;const lit=-i*.5-j>r*.2;const n=vn2((sx+i)/2.4,(cyy+j)/2.4,Z*3);pb.p(sx+i,cyy+j,haze(lit?(n>0?'#7ab04e':'#68a044'):n>.25?'#3e7234':d>.85?'#355f2e':'#4c863c',Z))}}
  }
  // forêt du fond, à droite de la route et au bout de la rue
  const trees=[];
  for(let i=0;i<70;i++){const Z=14+i*2.4+hs(i*3.1)*2,X=8+hs(i*7.7)*9;trees.push([X,Z,hs(i*1.9)<.4?'pin':'feuillu',8+hs(i*5.3)*7])}
  for(let i=0;i<34;i++){const Z=48+i*3+hs(i*2.3)*2,X=-4.5-hs(i*9.1)*10;trees.push([X,Z,hs(i*4.1)<.5?'pin':'feuillu',9+hs(i*6.7)*6])}
  trees.push([-15.5,30,'pin',15],[-14,19.5,'pin',13],[-5.2,34.5,'feuillu',8],[-16,44,'pin',14],[-14.8,9.5,'feuillu',12]);
  trees.sort((a,b)=>b[1]-a[1]);
  // --- maisons : corps + toit à deux pans (faîtage dans l'axe Z), pignon face à la caméra
  function house(o){
    const{x0,x1,z0,z1,wall,ridge,ov=.3,wallTex,sideTex,roof,roofD,trim}=o,xm=(x0+x1)/2;
    // pan de toit côté route (visible), puis mur côté route, puis la façade-pignon
    face([[x1+ov,wall-.15,z0-ov],[xm,ridge,z0-ov],[xm,ridge,z1+ov],[x1+ov,wall-.15,z1+ov]],(X,Y,Z,x,y)=>{const r=Math.floor((ridge-Y)/.32);return haze(r%2?roof:roofD,Z,1-.05*(hs2(Math.floor(Z/.5),r)<.2))});
    quad(x1,o.base||0,z0,x1,wall,z1,sideTex);
    face([[x0,o.base||0,z0],[x1,o.base||0,z0],[x1,wall,z0],[xm,ridge-.1,z0],[x0,wall,z0]],wallTex);
    // rives blanches du pignon
    for(let k=0;k<=40;k++){const f=k/40;for(const[a,b]of[[[x0-ov,wall-.15],[xm,ridge]],[[x1+ov,wall-.15],[xm,ridge]]]){const X=lerp(a[0],b[0],f),Y=lerp(a[1],b[1],f);const[sx,sy]=P(X,Y,z0-ov*.5);const th=Math.max(1,Math.round(.2*F/z0));for(let q=0;q<th;q++)pb.p(sx,sy+q,col(trim))}}
  }
  const win=(X,Y,Z,w,h,o={})=>{ // fenêtre sur une face Z constant (o.side : face X constant)
    const fr=o.frame||'#f6f2ea',gl=night?'#f6cc78':'#5e86a6',gl2=night?'#ffe6a8':'#9cc0d8',sh=o.shut;
    const R=(a0,b0,a1,b1,tex)=>o.side?quad(X,b0,a0,X,b1,a1,tex):quad(a0,b0,Z,a1,b1,Z,tex);
    const a=o.side?Z:X,t=.09;
    if(sh)for(const s of[-1,1])R(a+s*(w/2+.05)-(s<0?.32:0),Y,a+s*(w/2+.05)+(s>0?.32:0),Y+h,(X1,Y1,Z1,x,y)=>haze(Math.floor((Y1-Y)/.16)%2?sh:'#185852',Z1));
    R(a-w/2-t,Y-t,a+w/2+t,Y+h+t,()=>haze(fr,o.side?X+30:Z));
    R(a-w/2,Y,a+w/2,Y+h,(X1,Y1,Z1,x,y)=>{const top=Y1>Y+h*.82,mul=Math.abs((o.side?Z1:X1)-a)<.04||Math.abs(Y1-Y-h/2)<.04;return mul?haze(fr,Z1):haze(top?gl2:gl,Z1,1-.12*((o.side?Z1:X1)>a))});
    if(night){const T=o.side?P(X,Y+h*.85,a):P(a,Y+h*.85,Z),Bm=o.side?P(X,Y+h*.15,a):P(a,Y+h*.15,Z),l=o.side?P(X,Y,a-w*.35)[0]:P(a-w*.35,Y,Z)[0],r=o.side?P(X,Y,a+w*.35)[0]:P(a+w*.35,Y,Z)[0];HV.lit.push([Math.round(Math.min(l,r)),Math.round(T[1]),Math.max(1,Math.round(Math.abs(r-l))),Math.max(1,Math.round(Bm[1]-T[1]))])}
  };
  const clap=(base,line,f=1)=>(X,Y,Z,x,y)=>haze((Y*100|0)%22<3?line:base,Z,f);
  const brick=(X,Y,Z,x,y)=>{const r=Math.floor(Y/.09),c=Math.floor(((X+Z)+(r%2)*.12)/.24);return haze(Y%.09<.02?'#a8483c':hs2(c,r)<.2?'#b04e3a':hs2(c,r)>.85?'#d07458':'#c05a42',Z,1)};

  // arbres derrière les maisons (Z plus grand que les façades)
  const drawTrees=zmin=>{while(trees.length&&trees[0][1]>zmin){const t0=trees.shift();tree(...t0)}};
  drawTrees(44);
  // la ferme blanche au bout
  house({x0:-11.5,x1:-7,z0:37,z1:44,wall:4.4,ridge:7,wallTex:clap('#eceae2','#c8c4b8'),sideTex:clap('#d8d4ca','#b4b0a4'),roof:'#5a5c66',roofD:'#4a4c56',trim:'#f6f2ea'});
  win(-9.25,2.6,37,.8,1.2,{});win(-7,2.6,40.5,.8,1.2,{side:1});win(-7,.9,39,.8,1.2,{side:1});
  drawTrees(33);
  // la maison de brique
  house({x0:-12.4,x1:-7,z0:25,z1:32,wall:5,ridge:7.6,wallTex:brick,sideTex:(X,Y,Z,x,y)=>brick(X,Y,Z,x,y),roof:'#4e505c',roofD:'#40424c',trim:'#f6f2ea'});
  for(const X of[-11.1,-8.4])win(X,3.3,25,.85,1.25,{frame:'#f6f2ea'});win(-11.1,1.1,25,.85,1.35,{frame:'#f6f2ea'});win(-9.7,5.6,25,.5,.7,{frame:'#f6f2ea'});
  for(const Z of[27,30])for(const Y of[1.1,3.3])win(-7,Y,Z,.8,1.25,{side:1});
  // porche de la maison de brique : plancher, colonnes, toit
  quad(-10.2,0,23.6,-7.6,.45,23.6,solid(haze('#b8584a',23.6)));quad(-10.2,.45,23.6,-7.6,.45,25,solid(haze('#9a7a5a',24)));
  quad(-9.4,.45,25,-8.6,2.4,25,solid(haze('#3a4a5a',25)));
  quad(-10.4,2.55,23.5,-7.4,2.85,23.5,solid(haze('#f6f2ea',23.5)));quad(-10.4,2.55,23.5,-7.4,2.55,25,solid(haze('#e8e4da',24)));
  for(const X of[-10.2,-7.7])quad(X,.45,23.65,X+.18,2.55,23.65,solid(haze('#f6f2ea',23.6)));
  drawTrees(21);

  // --- la maison : bardage blanc, toit vert d'eau, véranda
  const A={x0:-11.8,x1:-5.6,z0:11,z1:19};
  house({x0:A.x0,x1:A.x1,z0:A.z0,z1:A.z1,wall:5.3,ridge:8.3,wallTex:clap('#f0ece2','#cfc9bb'),sideTex:clap('#d6d0c4','#b6b0a2'),roof:'#2a8a84',roofD:'#207470',trim:'#fbf9f2'});
  // cheminée en brique sur le pan côté route
  quad(-7.4,6.2,14.5,-6.7,8.2,14.5,brick);quad(-6.7,6.2,14.5,-6.7,8.2,15.1,(X,Y,Z,x,y)=>brick(X,Y,Z,x,y));
  // étage : deux fenêtres à volets + lucarne ; côté route : fenêtres aux deux niveaux
  for(const X of[-10.3,-7.1])win(X,3.3,A.z0,.9,1.35,{shut:'#1f6e6a'});
  win(-8.7,6,A.z0,.55,.8,{});
  for(const Z of[13,16.6])for(const Y of[1.2,3.3])win(A.x1,Y,Z,.85,1.3,{side:1,shut:'#1f6e6a'});
  // rez-de-chaussée sous la véranda : porte à vitrail ovale, fenêtres
  const PZ=9,PF=.62;
  quad(-9.25,PF,A.z0,-8.15,PF+2.15,A.z0,(X,Y,Z)=>{const u=(X+8.7)/.38,v=(Y-PF-1.25)/.72;return u*u+v*v<1?haze(night?'#f2d08a':(Math.floor(X*14+Y*14)%2?'#cfe4ea':'#a8c8d4'),Z):haze('#1f6e6a',Z,Math.abs(X+8.7)>.5?.85:1)});
  win(-10.9,1.35,A.z0,.8,1.25,{shut:'#1f6e6a'});win(-6.8,1.35,A.z0,.9,1.3,{shut:'#1f6e6a'});
  // applique murale
  quad(-7.95,2.1,A.z0-.01,-7.82,2.4,A.z0-.01,solid(col('#2a2a30')));
  // plancher de la véranda : dessus en planches, nez et soubassement à croisillons
  quad(A.x0,PF,PZ,A.x1,PF,A.z0,(X,Y,Z)=>haze(Math.floor(X/.14)%2?'#7a5a3e':'#6a4c34',Z));
  quad(A.x0,0,PZ,A.x1,PF,PZ,(X,Y,Z,x,y)=>Y>PF-.1?col('#f4f0e6'):((x+y)%4===0||(x-y+400)%4===0)?col('#e8ece6'):col('#2a6a66'));
  quad(A.x1,0,PZ,A.x1,PF,A.z0,(X,Y,Z,x,y)=>Y>PF-.1?col('#dcd8ce'):((x+y)%4===0||(x-y+400)%4===0)?col('#d0d4ce'):col('#225a56'));
  // dessous du toit de véranda (visible d'en bas), lambris clair
  quad(A.x0-.2,2.95,PZ-.15,A.x1+.2,2.95,A.z0,(X,Y,Z)=>haze(Math.floor(Z/.18)%2?'#e8e2d4':'#d8d2c4',Z));
  // banc contre le mur
  quad(-11.25,PF+.42,10.55,-9.75,PF+.47,10.55,solid(col('#3e424c')));quad(-11.25,PF+.47,10.4,-9.75,PF+.47,10.9,solid(col('#555a66')));
  quad(-11.25,PF+.6,10.92,-9.75,PF+1.0,10.92,(X,Y)=>Math.floor(Y/.1)%2?col('#555a66'):col('#3e424c'));
  for(const X of[-11.15,-9.9])quad(X,PF,10.5,X+.06,PF+.42,10.5,solid(col('#2e3038')));
  HV.sit=P(-10.5,PF+.47,10.7).concat([F/10.7]);
  // ---- calque de devant : garde-corps, poteaux, marches, toit de véranda, poteaux électriques
  pb=front;
  const rail=(xa,xb)=>quad(xa,PF,PZ,xb,PF+.95,PZ,(X,Y,Z,x,y)=>{const top=Y>PF+.86,bot=Y<PF+.12;if(top||bot)return col('#f6f2ea');const b=((X-xa)%.2+.2)%.2;return b<.07?col(Math.floor((X-xa)/.2)%2?'#f6f2ea':'#1f6e6a'):null});
  rail(A.x0+.1,-9.35);rail(-8.05,A.x1-.1);
  quad(A.x1,PF,PZ+.1,A.x1,PF+.95,A.z0-.1,(X,Y,Z,x,y)=>{const top=Y>PF+.86,bot=Y<PF+.12;if(top||bot)return col('#e2ded4');return((Z%.2)+.2)%.2<.07?col('#e2ded4'):null});
  for(const X of[A.x0+.05,-9.4,-8.15,A.x1-.25]){quad(X,PF,PZ-.05,X+.2,2.95,PZ-.05,(X1,Y)=>Y>2.6||Y<PF+.2?col('#f6f2ea'):Math.floor(Y/.5)%4===0?col('#1f6e6a'):col('#f6f2ea'))}
  // fronton de la véranda (bandeau vert d'eau + liseré blanc)
  quad(A.x0-.25,2.95,PZ-.15,A.x1+.25,3.35,PZ-.15,(X,Y)=>Y<3.05?col('#f6f2ea'):col(Y>3.25?'#2a8a84':'#207470'));
  quad(A.x1+.25,2.95,PZ-.15,A.x1+.25,3.35,A.z0,(X,Y)=>Y<3.05?col('#dcd8ce'):col('#1a605c'));
  // marches
  for(let k=0;k<3;k++){const h=PF*(3-k)/3,z=PZ-.32*(k+1);quad(-9.3,0,z,-8.1,h,z,(X,Y)=>Y>h-.06?col('#f4f0e6'):col('#7a5a3e'));quad(-9.3,h,z,-8.1,h,z+.32,solid(col(k%2?'#8a6a4a':'#6a4c34')))}
  // boîte aux lettres
  {const X=-4,Z=7.2;quad(X-.05,0,Z,X+.05,1.05,Z,solid(col('#6a4a2e')));quad(X-.22,1.05,Z-.25,X+.22,1.3,Z-.25,solid(col('#8aaecc')));quad(X-.22,1.3,Z-.25,X+.22,1.3,Z+.25,solid(col('#b8d0e2')));quad(X+.22,1.05,Z-.25,X+.22,1.3,Z+.25,solid(col('#6a8eac')));quad(X+.24,1.15,Z-.05,X+.26,1.5,Z-.05,solid(col('#d83a2e')))}
  // poteaux électriques et fils
  const poles=[[-2.2,7.5],[-2.2,30],[-2.2,58],[7,20],[7,48],[7,80]],ptop=9;
  for(const[X,Z]of poles){quad(X-.13,0,Z,X+.13,ptop,Z,(X1,Y,Z1,x,y)=>haze(hs2(x,Math.floor(y/3))<.3?'#6a4a32':'#7a5a3e',Z1));quad(X-1.1,ptop-.6,Z,X+1.1,ptop-.45,Z,solid(haze('#5a4030',Z)));
    for(const s of[-1,1]){const[px,py]=P(X+s*.95,ptop-.4,Z);pb.p(px,py,haze('#d8dce0',Z))}}
  const wire=(a,b,dx,sag)=>{for(let k=0;k<=400;k++){const f=k/400,X=lerp(a[0],b[0],f)+dx,Z=lerp(a[1],b[1],f),Y=ptop-.45-sag*4*f*(1-f);const[sx,sy]=P(X,Y,Z);pb.p(sx,sy,col('#1c1e22'))}};
  for(const side of[[0,1,2],[3,4,5]])for(let i=0;i+1<side.length;i++)for(const dx of[-.9,.9])wire(poles[side[i]],poles[side[i+1]],dx,.9);
  // fils qui partent vers la caméra et traversent la rue
  for(const dx of[-.9,.9]){wire([-2.2,2.2],poles[0],dx,.3)}wire(poles[1],poles[3],0,1.2);
  // panneau de limitation au bord droit
  {const X=7.2,Z=26;quad(X-.04,0,Z,X+.04,2.2,Z,solid(haze('#8a8f99',Z)));quad(X-.3,1.6,Z,X+.3,2.3,Z,(X1,Y)=>Y>2.2||Y<1.7||Math.abs(X1-X)>.26?haze('#1c1e22',Z):haze('#f6f4ee',Z))}
  // le grand arbre au premier plan à gauche
  

  const mk=src=>{const[c,g2]=canvasOf(W,H);g2.putImageData(src.img,0,0);return c};
  HV.back=mk(back);HV.front=mk(front);
}
// le coureur assis sur le banc, à l'échelle de la perspective
function drawSitter(g,t){
  if(!HV.sit)return;const[x0,y0,s]=HV.sit,R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))};
  const sh=GEAR[G.gear.top].col,shoe=GEAR[G.gear.shoes].col,skin='#e8b48c',pa='#2c3a52',hair='#4a3424',br=Math.sin(t/900)*.012*s;
  // vue de trois quarts face : cuisses vers nous (raccourcies), tibias verticaux, pieds au plancher
  const seat=y0,fl=y0+.47*s;
  R(x0-.2*s,seat-.06*s,.4*s,.14*s,pa);                                   // cuisses
  for(const dx of[-.17,.05]){R(x0+dx*s,seat+.06*s,.12*s,fl-seat-.12*s,pa);R(x0+dx*s-.02*s,fl-.09*s,.17*s,.09*s,shoe)}
  R(x0-.21*s,seat-.62*s+br,.42*s,.58*s-br,sh);R(x0-.21*s,seat-.62*s+br,.42*s,.05*s,'rgba(255,255,255,.18)');  // buste
  R(x0-.3*s,seat-.55*s+br,.1*s,.36*s,sh);R(x0+.2*s,seat-.55*s+br,.1*s,.36*s,sh);  // épaules/bras
  R(x0-.31*s,seat-.2*s,.1*s,.16*s,skin);R(x0+.21*s,seat-.2*s,.1*s,.16*s,skin);   // mains sur les genoux
  R(x0-.06*s,seat-.68*s+br,.12*s,.08*s,skin);                              // cou
  const hx=x0-.12*s,hyy=seat-.92*s+br;R(hx,hyy,.24*s,.26*s,skin);R(hx,hyy-.02*s,.24*s,.08*s,hair);R(hx-.01*s,hyy,.05*s,.12*s,hair);
  R(hx+.05*s,hyy+.12*s,.03*s,.03*s,'#2a2a30');R(hx+.15*s,hyy+.12*s,.03*s,.03*s,'#2a2a30');
  if(G.comp&&COMP[G.comp]){const cf=compFrame(G.comp,0);const k=s*.9/ (pxPerM()) ;g.drawImage(cf.cv,Math.round(x0+.7*s),Math.round(fl-cf.cv.height*k),Math.round(cf.cv.width*k),Math.round(cf.cv.height*k))}
}
