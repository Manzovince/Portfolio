'use strict';
/* ---------- canvas & dimensions ---------- */
const cv=$('#scene'),ctx=cv.getContext('2d');
const[sceneCv,sg]=canvasOf(1,1);
function resize(){
  const base=Math.max(1,Math.round(Math.min(innerHeight/430,innerWidth/380)));PX=base+ZOOM;ZS=PX/base;MPX=ZOOMS[ZOOM].mpx;
  decoCache.clear();runCache.clear();if(typeof microCache!=='undefined')microCache.clear();
  W=Math.ceil(innerWidth/PX);H=Math.ceil(innerHeight/PX);
  // sur mobile, le sol passe juste au-dessus du tableau de bord et le paysage garde des proportions de paysage
  const mob=innerWidth<700||innerHeight<500,pad=mob?$('#hudw').offsetHeight+14:0;
  RX=Math.round(W*(mob?.3:.36));GY=mob?Math.floor((innerHeight-pad)/PX):Math.round(H*.9);
  HL=mob?Math.min(GY/.9,W*1.15,H):H;
  cv.width=W;cv.height=H;sceneCv.width=W;sceneCv.height=H;
  ctx.imageSmoothingEnabled=false;sg.imageSmoothingEnabled=false;
  clearTiles();skyKey='';tileBudget=999;
}
resize();addEventListener('resize',resize);
function setZoom(z){z=clamp(z,0,2);if(z===ZOOM)return;ZOOM=z;store.set('zoom',z);resize();cam=elev(G.d);$('#zLbl').textContent=ZOOMS[z].n}
let wheelT=0;cv.addEventListener('wheel',e=>{e.preventDefault();const t=performance.now();if(t-wheelT<350)return;wheelT=t;setZoom(ZOOM+(e.deltaY<0?1:-1))},{passive:false});

/* ---------- reprise après absence ---------- */
let away=null;
{const gap=(Date.now()-G.last)/1000*SPEED;if(gap>30&&!Q.has('km'))away=catchUp(gap);LIVE.ev.length=0}

/* ---------- animaux de passage ---------- */
let ANIM=[],nextSpawn=performance.now()+12000;
function spawnFauna(force){
  const L=leg(G.d),c=LIVE.c||condAt(now(),G.d);
  const pool=force?[[force,FAUNA[force]]]:Object.entries(FAUNA).filter(([,f])=>f.b.includes(L.b)&&!(f.sea&&LAY[L.b][2].kind!=='sea'));
  if(!pool.length)return;
  const rb=(G.comp&&COMP[G.comp].rare)||1,wt=f=>f.r<.3?f.r*rb:f.r;
  let tot=0;for(const[,f]of pool)tot+=wt(f);let r=Math.random()*tot,id=pool[0][0];
  for(const[k,f]of pool){r-=wt(f);if(r<=0){id=k;break}}
  const f=FAUNA[id],a={id,dm:force?G.d+(W-RX)*MPX*.45:G.d+(W-RX)*MPX+2+Math.random()*20,t0:performance.now(),ph:Math.random()*6};
  if(f.fly)a.alt=25+Math.random()*35;
  if(f.sea)a.lx=scrollPx()*SPD[2]+W+4;
  ANIM.push(a);
}
const scrollPx=()=>G.d/MPX;

/* ---------- boucle ---------- */
let cam=elev(G.d),camMacro=elevMacro(G.d),lastT=performance.now(),frame=0,phase=0,drops=[],flakes=[];
let SK=skyAt(sunElev(now()));
function loop(t){
  requestAnimationFrame(loop);
  let dt=(t-lastT)/1000;lastT=t;
  if(dt>2){const r=catchUp(dt*SPEED);if(r.km>.05)emit('Pendant ton absence',`${fmt(r.km,2)} km · ${fmt(r.dp)} m D+ · +${fmt(r.coins)} pièces`,'🏃');dt=0}
  dt=Math.min(dt,.25);
  const date=now();
  for(let k=0,sd=dt*SPEED;sd>0;k++){const d=Math.min(sd,1);step(d,date);sd-=d}
  phase+=dt*Math.min(SPEED,3)*(LIVE.cad||170)/120;   // cycles de foulée : cadence réelle (pas/min ÷ 2), indépendante de l'échelle
  if(t>nextSpawn){spawnFauna();nextSpawn=t+(35000+Math.random()*70000)/((G.comp&&COMP[G.comp].fauna)||1)/((GEAR[G.gear.style]||{}).fauna||1)/Math.max(1,SPEED/4)}
  // 30 i/s suffisent pour un paysage qui défile lentement
  if(++frame%2)return;
  tileBudget=frame<4?999:3;draw(date,t);
}

// pied d'un objet large : le point le plus bas du sol sous toute sa largeur (rien ne flotte)
function footY(x0,w,dm,s){let y=-1e9;const n=Math.max(1,Math.ceil(w/2));for(let i=0;i<=n;i++){const xx=x0+w*i/n,d=s+(xx-RX)*MPX;y=Math.max(y,groundY(d,s,cam))}return y}
function draw(date,t){
  const s=G.d,se=sunElev(date),wx=weatherAt(date),W0=WX[wx];if(draw.wx!==wx){drops.length=0;flakes.length=0;draw.wx=wx}const sp=scrollPx();
  SK=skyAt(se);
  const target=elev(s);cam=lerp(cam,target,.08);camMacro=lerp(camMacro,elevMacro(s),.05);
  const L=leg(s);
  // ciel
  ctx.drawImage(skyCanvas(SK,W0.cloud),0,0);
  // étoiles
  if(SK.dark>.3){ctx.fillStyle='#fff';for(const[x,y,b]of stars().a){const tw=.5+.5*Math.sin(t/700+b*40);ctx.globalAlpha=(SK.dark-.3)*(1-W0.cloud)*tw*b;ctx.fillRect(x,y,1,1)}ctx.globalAlpha=1}
  // soleil / lune
  const st=sunTimes(date);
  if(se>-6){const span=(st.set-st.rise)||432e5,u=clamp((date-st.rise)/span,-.05,1.05),x=lerp(W*.08,W*.92,u),y=H*.62-clamp(se,-6,60)/60*H*.5;
    ctx.globalAlpha=1-W0.cloud*.75;ctx.fillStyle=rgb(mix([255,246,220],[255,170,110],clamp(1-se/10,0,1)));
    ctx.beginPath();ctx.arc(Math.round(x),Math.round(y),5,0,7);ctx.fill();
    ctx.globalAlpha=(1-W0.cloud)*.18;ctx.beginPath();ctx.arc(Math.round(x),Math.round(y),10,0,7);ctx.fill();
    if(wx==='chaleur'){ctx.globalAlpha=.12;ctx.beginPath();ctx.arc(x,y,22,0,7);ctx.fill();ctx.globalAlpha=.06;ctx.beginPath();ctx.arc(x,y,40,0,7);ctx.fill()}
    if(wx==='voile'){ctx.globalAlpha=.22;ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,Math.round(H*.09),0,7);ctx.stroke();
      // cirrus : longues traînées pâles
      ctx.globalAlpha=.18;ctx.fillStyle='#fff';for(let i=0;i<9;i++){const cy=H*(.08+hs(i*4.1)*.3),cx=((hs(i*2.3)*W*1.4+date.getTime()/1000*.6)%(W*1.4))-W*.2,len=40+hs(i*9)*90;for(let k=0;k<len;k+=2)ctx.fillRect(Math.round(cx+k),Math.round(cy+Math.sin(k/18+i)*2),2,1)}}
    ctx.globalAlpha=1}
  else{const h=date.getHours()+date.getMinutes()/60,u=((h+12-20)%24)/10,x=lerp(W*.15,W*.85,clamp(u,0,1)),y=H*.18+Math.abs(u-.5)*H*.2;
    ctx.globalAlpha=1-W0.cloud*.8;ctx.fillStyle='#eef0e0';ctx.beginPath();ctx.arc(Math.round(x),Math.round(y),4,0,7);ctx.fill();ctx.fillStyle=rgb(SK.top);ctx.beginPath();ctx.arc(Math.round(x)+2,Math.round(y)-1,3.4,0,7);ctx.fill();ctx.globalAlpha=1}
  // nuages : trois profondeurs (les lointains plus petits, plus bas et plus lents), plafond gris si couvert
  const cpal=cloudPalette(SK,se,wx),wind=W0.wind?7:1.6,T=date.getTime()/1000;
  if(wx==='nuages'||W0.rain||W0.fog){const dk=cloudDeck(cpal,W0.rain?.42:wx==='nuages'?.26:.2),ox=((T*wind*1.2+s/MPX*.01)%(W*2));ctx.globalAlpha=W0.fog?.7:1;ctx.drawImage(dk,-Math.round(ox),0);ctx.drawImage(dk,W*2-Math.round(ox),0);ctx.globalAlpha=1}
  const nC=Math.round(3+W0.cloud*9);
  for(let i=0;i<nC;i++){
    const z=hs(i*5.3),kind=wx==='voile'&&i%2?'ac':W0.rain&&i%3===0?'cb':'cu',c=cloudSprite(i%7,cpal,kind);
    const sc=.55+z*.6,cw=Math.round(c.width*sc),ch=Math.round(c.height*sc),span=W+cw*2;
    const x=((hs(i*3.1)*span+T*wind*(.25+z*.9)+s/MPX*(.004+z*.02))%span)-cw,y=H*(.04+(1-z)*.3+hs(i*7.7)*.08)-(kind==='cb'?ch*.4:0);
    ctx.globalAlpha=lerp(.75,1,z);ctx.drawImage(c,Math.round(x),Math.round(y),cw,ch);
  }
  ctx.globalAlpha=1;
  // arc-en-ciel : certains jours de pluie, soleil assez haut, du côté opposé au soleil
  if(W0.rain&&se>4&&se<42&&hs(dayKey(date)*3+date.getHours())<.55){const st2=sunTimes(date),u=clamp((date-st2.rise)/((st2.set-st2.rise)||1),0,1),cx=W-lerp(W*.08,W*.92,u),cy=H*.95,R=H*.62;
    const cols=['255,70,70','255,160,60','255,230,80','90,200,90','70,130,240','140,90,210'];
    for(let k=0;k<cols.length;k++){ctx.strokeStyle=`rgba(${cols[k]},.2)`;ctx.lineWidth=Math.max(1,Math.round(H/220));ctx.beginPath();ctx.arc(cx,cy,R-k*ctx.lineWidth,Math.PI,2*Math.PI);ctx.stroke()}}

  // --- la scène (teintée selon l'heure) ---
  const g=sg;g.clearRect(0,0,W,H);
  const alt=camMacro;
  const K=[.004,.009,.016,.024,.032];
  for(let li=0;li<5;li++){
    drawLayer(g,li,sp,LAY[L.b][li].fixed?0:clamp((alt-1000)*K[li],-MARG+6,MARG-6));
    if(li===2)drawSeaFauna(g,sp,alt);
    // brouillard : un voile entre chaque plan, de plus en plus épais vers le loin
    if(W0.fog&&li<4){const fy=layerY(li+1)-HL*.06*ZSPREAD[ZOOM],fc=mix(SK.hor,[236,238,242],.35),gr=g.createLinearGradient(0,fy-HL*.08,0,fy+HL*.12);
      gr.addColorStop(0,rgba(fc,0));gr.addColorStop(.6,rgba(fc,.5-li*.06));gr.addColorStop(1,rgba(fc,.38-li*.05));g.fillStyle=gr;g.fillRect(0,fy-HL*.08,W,H)}
    if(wx==='chaleur'&&li===1){g.fillStyle='rgba(255,214,160,.16)';g.fillRect(0,0,W,H)}
    if(W0.rain&&li===1){const top=H*.18,bot=layerY(2);for(let k=0;k<4;k++){const x0=((hs(k*4.1)*W*1.5-date.getTime()/1000*(3+k))%(W*1.5)+W*1.5)%(W*1.5)-W*.25,ww=W*(.12+hs(k*2.7)*.15);
      for(let x=0;x<ww;x+=2)for(let y=Math.round(top);y<bot;y+=3){if(bay(Math.round(x0+x+y*.3),y)<.22*(1-Math.abs(x/ww-.5)*2))g.fillStyle='rgba(110,120,140,.5)',g.fillRect(Math.round(x0+x+(y-top)*.25),y,1,1)}}}
  }
  // décor au bord du sentier (derrière le chemin)
  const dm0=s-RX*MPX-12,dm1=s+(W-RX)*MPX+12;
  for(let cell=Math.floor(dm0/CELL);cell<=Math.ceil(dm1/CELL);cell++){
    const d=decoAt(cell);if(!d)continue;
    const dm=cell*CELL+hs(cell*9.1)*CELL*.6,sp2=decoSprite(d.k,d.v),x=RX+(dm-s)/MPX;
    const y=footY(x-sp2.ox,sp2.cv.width,dm,s)-1-d.back;
    g.drawImage(sp2.cv,Math.round(x-sp2.ox),Math.round(y-sp2.oy+1));
  }
  for(const p of poisIn(dm0,dm1)){const o=poiSprite(p),x=RX+(p.d-s)/MPX,y=footY(x-o.ox,o.cv.width,p.d,s);g.drawImage(o.cv,Math.round(x-o.ox),Math.round(y-o.oy+1))}
  // petits détails derrière le chemin
  const mic=[];
  if(ZOOM>=1)for(let cell=Math.floor(dm0/MCELL);cell<=Math.ceil(dm1/MCELL);cell++){const d=microAt(cell);if(!d)continue;const dm=cell*MCELL+hs(cell*4.4)*MCELL*.8,o=microSprite(d.k,d.bi,d.v),x=RX+(dm-s)/MPX;
    if(d.front)mic.push([o,x,dm]);else g.drawImage(o.cv,Math.round(x-o.ox),Math.round(footY(x-o.ox,o.cv.width,dm,s)-o.oy))}
  // supporters (derrière le chemin)
  SUPV=[];
  for(const gp of supportersIn(dm0,dm1)){const used=SUP_USED.has(gp.id),happy=used&&performance.now()-SUP_USED.get(gp.id)<4000;
    for(let i=0;i<gp.n;i++){const dm=gp.dm+(i-(gp.n-1)/2)*1.4+hs(i*3.7+gp.dm)*.6,x=RX+(dm-s)/MPX,v=Math.floor(hs(gp.dm*.37+i*13)*9999);
      const sp3=supSprite(v,Math.floor(t/(happy?160:420)+i*1.7)%2,happy),y=groundY(dm,s,cam)-1-(i%2);
      g.drawImage(sp3.cv,Math.round(x-sp3.ox),Math.round(y-sp3.oy+1));SUPV.push({gp,x,y,w:sp3.cv.width,h:sp3.cv.height,oy:sp3.oy})}
    // un petit « ! » au-dessus des groupes pas encore sollicités
    if(!used&&((t+gp.dm*90)%2400)<1200){const x=RX+(gp.dm-s)/MPX,y=groundY(gp.dm,s,cam)-Math.round(19*ZOOMS[ZOOM].k);g.fillStyle='#f0c030';g.fillRect(Math.round(x),Math.round(y),1,2);g.fillRect(Math.round(x),Math.round(y)+3,1,1)}
  }
  drawGround(g,s,cam);
  // …et sur le talus devant
  for(const[o,x,dm]of mic)g.drawImage(o.cv,Math.round(x-o.ox),Math.round(groundY(dm,s,cam)+2+ZOOM+Math.floor(hs(dm)*3)-o.oy));
  // le chien
  const fy=SY[RX]|0;
  if(G.comp&&COMP[G.comp]){const C=COMP[G.comp],K=ZOOMS[ZOOM].k;
    if(C.mv==='fly'){const fx=RX-Math.round(6*K)+Math.round(Math.sin(t/1700)*6*K),fy2=(SY[RX]|0)-Math.round(16*K)+Math.round(Math.sin(t/400)*2),cf=compFrame(G.comp,Math.floor(t/140)%4);g.drawImage(cf.cv,fx-cf.ox,fy2-cf.oy)}
    else{const dx=RX-Math.round(8*K)+Math.round(Math.sin(t/2300)*5),gy0=SY[clamp(dx,0,W-1)]|0;
      // la suricate s'arrête parfois pour faire le guet
      const stand=G.comp==='suricate'&&(t%9000)<1600,hop=C.mv==='hop'?Math.round(Math.abs(Math.sin(phase*Math.PI))*3):0;
      const cf=compFrame(G.comp,stand?3:Math.floor(phase*4)%3);g.drawImage(cf.cv,dx-cf.ox,gy0-cf.oy+1-hop)}}
  // le coureur
  const N=LIVE.mode==='run'?10:12,rf=runnerFrame(LIVE.mode,Math.floor(phase*N)%N,G.gear);
  g.drawImage(rf.cv,RX-rf.ox,fy-rf.oy+1);
  drawFauna(g,s,t);
  drawForeground(g,s);
  // teinte de l'heure
  if(SK.ta>0){g.globalCompositeOperation='source-atop';g.fillStyle=rgba(SK.tint,SK.ta);g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over'}
  if(W0.rain||wx==='nuages'||W0.fog){g.globalCompositeOperation='source-atop';g.fillStyle=W0.rain?'rgba(50,60,80,.26)':'rgba(70,80,100,.14)';g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over'}
  if(wx==='chaleur'&&SK.dark<.3){ctx.drawImage(sceneCv,0,0);
    // mirage : les lignes proches de l'horizon ondulent
    const y0=Math.max(0,Math.round(layerY(1))),y1=Math.min(H,GY+4);
    for(let y=y0;y<y1;y++){const o=Math.round(Math.sin(t/140+y*.55)*((y-y0)/(y1-y0))*1.4);if(o)ctx.drawImage(sceneCv,0,y,W,1,o,y,W,1)}}
  else ctx.drawImage(sceneCv,0,0);
  // lumières de nuit
  if(SK.dark>.2){
    ctx.globalCompositeOperation='lighter';const a=Math.min(1,(SK.dark-.2)*1.4);
    if(G.gear.lamp)drawHeadlamp(a);
    for(const p of poisIn(dm0,dm1))if(p.k==='ravito'){const x=RX+(p.d-s)/MPX,y=groundY(p.d,s,cam)-8;const gr=ctx.createRadialGradient(x,y,0,x,y,16);gr.addColorStop(0,`rgba(255,200,120,${.5*a})`);gr.addColorStop(1,'rgba(255,200,120,0)');ctx.fillStyle=gr;ctx.fillRect(x-16,y-16,32,32)}
    ctx.globalCompositeOperation='source-over';
  }
  // météo
  if(W0.fog){const fc=mix(SK.hor,[236,238,242],.35),gr=ctx.createLinearGradient(0,H*.4,0,H);gr.addColorStop(0,rgba(fc,0));gr.addColorStop(.55,rgba(fc,.32));gr.addColorStop(1,rgba(fc,.18));ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
    // nappes qui dérivent
    for(let i=0;i<5;i++){const w=W*.6,x=((hs(i*3.3)*W*1.6+t/1000*(3+i))%(W+w))-w,y=GY-HL*(.05+hs(i*7)*.2);const gg=ctx.createRadialGradient(x+w/2,y,2,x+w/2,y,w/2);gg.addColorStop(0,rgba(fc,.28));gg.addColorStop(1,rgba(fc,0));ctx.fillStyle=gg;ctx.fillRect(x,y-w/4,w,w/2)}}
  const snowy=(W0.rain&&(alt>2100||(LIVE.c&&LIVE.c.T<1)))||L.b==='foretneige';
  if(W0.rain&&!snowy){while(drops.length<W*.7)drops.push([Math.random()*W,Math.random()*H,.6+Math.random()*.7]);
    for(const d of drops){d[1]+=5*d[2];d[0]-=1.6*d[2];if(d[1]>H||(d[0]>=0&&d[0]<W&&d[1]>SY[d[0]|0])){
        // éclaboussure au sol
        if(d[0]>=0&&d[0]<W&&Math.random()<.5){ctx.fillStyle='rgba(220,232,245,.7)';ctx.fillRect((d[0]|0)-1,SY[d[0]|0]-1,1,1);ctx.fillRect((d[0]|0)+1,SY[d[0]|0]-1,1,1)}
        d[1]=-6;d[0]=Math.random()*W*1.25}
      ctx.fillStyle=`rgba(200,215,240,${.25+d[2]*.3})`;ctx.fillRect(d[0]|0,d[1]|0,1,2+Math.round(d[2]*2));ctx.fillRect((d[0]|0)-1,(d[1]|0)+2+Math.round(d[2]*2),1,1)}
    // reflets sur le chemin mouillé
    ctx.fillStyle='rgba(200,215,240,.18)';for(let x=0;x<W;x+=1)if(hs(Math.floor((x+sp)/3))<.25)ctx.fillRect(x,SY[x],1,1)}
  if(snowy){while(flakes.length<W*.5)flakes.push([Math.random()*W,Math.random()*H,Math.random()]);
    for(const f of flakes){f[1]+=.3+f[2]*.5;f[0]+=Math.sin(t/900+f[2]*9)*.35-.25;if(f[1]>H){f[1]=-2;f[0]=Math.random()*W}ctx.fillStyle=`rgba(255,255,255,${.5+f[2]*.45})`;ctx.fillRect(f[0]|0,f[1]|0,f[2]>.75?2:1,f[2]>.75?2:1)}}
  if(W0.wind){
    // feuilles, poussière ou sable qui filent
    const reg=BI[L.b].reg,cols=L.b==='desert'||L.b==='canyon'?['#e8c890','#d8b078']:reg==='alpes'?['#c8a040','#8aa850','#d87a3a']:['#a8a070','#d8c8a0','#7a9a50'];
    while(flakes.length<40)flakes.push([Math.random()*W,Math.random()*H,Math.random()]);
    for(const f of flakes){f[0]+=2.5+f[2]*3;f[1]+=Math.sin(t/200+f[2]*20)*.6+.15;if(f[0]>W||f[1]>H){f[0]=-4;f[1]=H*(.35+Math.random()*.6)}ctx.fillStyle=cols[Math.floor(f[2]*cols.length)];ctx.fillRect(f[0]|0,f[1]|0,f[2]>.5?2:1,1)}
    // traînées de vent
    ctx.fillStyle='rgba(255,255,255,.22)';for(let i=0;i<6;i++){const y=H*(.3+hs(i*5.1)*.55),x=((hs(i*1.7)*W*2+t/1000*180*(1+hs(i)))%(W*1.6))-W*.3;ctx.fillRect(Math.round(x),Math.round(y+Math.sin(t/300+i)*2),14+Math.round(hs(i*3)*20),1)}
  }
}
// faisceau de frontale en pixels : cône vers le sentier devant, flaque de lumière au sol, lampe qui brille
const BEAM_A=[0,.13,.23,.35,.5,.68];
function drawHeadlamp(a){
  const K=ZOOMS[ZOOM].k,pro=G.gear.lamp==='frontalePro',fy=SY[RX]|0;
  const hx=RX+Math.round(1.6*K),hy=fy-Math.round(8.3*K)-1;
  const L=Math.round((pro?62:40)*K*(ZOOM===0?1.2:1)),half=pro?.36:.27;
  const tx=Math.min(W-1,RX+Math.round(L*.75)),ty=SY[tx]||fy;
  const th=Math.atan2(ty-hy,tx-hx);
  const t=performance.now(),fl=1+Math.sin(t/90)*.02+Math.sin(t/37)*.015;
  const x1=Math.min(W-1,hx+Math.round(L*1.15)),y0=Math.max(0,hy-Math.round(L*.45)),y1=Math.min(H-1,fy+Math.round(L*.6));
  for(let x=hx+1;x<=x1;x++){
    const gy=SY[x]|0;
    for(let y=y0;y<=Math.min(y1,gy+3);y++){
      const dx=x-hx,dy=y-hy,d=Math.hypot(dx,dy);if(d>L*1.15)continue;
      const da=Math.abs(Math.atan2(dy,dx)-th);if(da>half)continue;
      let i=(1-d/(L*1.15))*Math.pow(1-da/half,.6);
      const onG=y>=gy;if(onG)i=i*1.9+.12;else i*=.75;            // la lumière qui touche le sol ressort
      if(y>gy+1)i*=.55;
      const lv=Math.min(5,Math.floor(i*5*fl+bay(x,y)*.9));if(lv<=0)continue;
      ctx.fillStyle=`rgba(255,236,${onG?170:200},${BEAM_A[lv]*a})`;ctx.fillRect(x,y,1,1);
    }
  }
  // la lampe elle-même
  ctx.fillStyle=`rgba(255,250,220,${a})`;ctx.fillRect(hx,hy,1,1);
  ctx.fillStyle=`rgba(255,240,190,${.35*a})`;ctx.fillRect(hx-1,hy,1,1);ctx.fillRect(hx+1,hy,1,1);ctx.fillRect(hx,hy-1,1,1);ctx.fillRect(hx,hy+1,1,1);
  ctx.fillStyle=`rgba(255,240,190,${.12*a})`;ctx.fillRect(hx-2,hy-2,5,5);
  // quelques insectes dans le faisceau
  for(let k=0;k<(pro?5:3);k++){const u=((t/1700+hs(k*3.1))%1),d=L*(.25+.6*hs(k*7.3)),ang=th+(hs(k*5.7)-.5)*half*1.4+Math.sin(t/300+k)*.08;
    const mx=Math.round(hx+Math.cos(ang)*d+Math.sin(t/200+k*2)*1.5),my=Math.round(hy+Math.sin(ang)*d+Math.cos(t/170+k)*1.5);
    if(u<.7){ctx.fillStyle=`rgba(255,250,230,${.7*a})`;ctx.fillRect(mx,my,1,1)}}
}
function faunaPos(a,s,t){
  const f=FAUNA[a.id];
  if(f.sea){const x=a.lx-scrollPx()*SPD[2];return{x,y:layerY(2,LAY[leg(G.d).b][2].bs||0)+2+clamp((camMacro-1000)*.016,-MARG+6,MARG-6)-3}}
  const x=RX+(a.dm-s)/MPX;
  const y=groundY(a.dm,s,cam)-(f.fly?a.alt+Math.sin(t/600+a.ph)*3:0);
  return{x,y};
}
function drawFauna(g,s,t){
  ANIM=ANIM.filter(a=>faunaPos(a,s,t).x>-20);
  for(const a of ANIM){
    const f=FAUNA[a.id];if(f.sea)continue;
    if(f.fly)a.dm+=.004*(Math.sin(t/3000+a.ph)>0?1:-.3);
    const c=faunaSprite(a.id),p=faunaPos(a,s,t);
    g.drawImage(c,Math.round(p.x-c.width/2),Math.round(p.y-c.height+1));
    // petit scintillement pour attirer l'œil
    if(!a.shot&&((t+a.ph*1000)%2600)<260){g.fillStyle='#fff';g.fillRect(Math.round(p.x),Math.round(p.y-c.height-3),1,1);g.fillRect(Math.round(p.x)-1,Math.round(p.y-c.height-2),3,1);g.fillRect(Math.round(p.x),Math.round(p.y-c.height-1),1,1)}
  }
}
function drawSeaFauna(g,sp,alt){
  const t=performance.now();
  for(const a of ANIM){if(!FAUNA[a.id].sea)continue;const p=faunaPos(a,G.d,t),c=faunaSprite(a.id),j=Math.max(0,Math.sin(t/700+a.ph))*4;
    if(j>.3)g.drawImage(c,Math.round(p.x-c.width/2),Math.round(p.y-c.height-j))}
}
// clic : photographier un animal
cv.addEventListener('pointermove',e=>{cv.classList.toggle('cible',!!hitFauna(e)||!!hitSup(e))});
cv.addEventListener('click',e=>{const a=hitFauna(e);if(a)return photo(a,e);const sgp=hitSup(e);if(sgp)cheer(sgp,e)});
// supporters cliquables : encouragements = petit coup de boost
let SUPV=[];const SUP_USED=new Map();
function hitSup(e){const x=e.clientX/PX,y=e.clientY/PX,m=(e.pointerType==='touch'?10:5)/PX*2;
  for(const p of SUPV){if(SUP_USED.has(p.gp.id))continue;if(Math.abs(p.x-x)<p.w/2+m&&y>p.y-p.oy-m&&y<p.y+m)return p.gp}return null}
function cheer(gp,e){
  SUP_USED.set(gp.id,performance.now());
  const k=gp.n>=5?1.2:gp.n>=3?1.15:1.1,sec=gp.n>=5?90:60,nowt=Date.now();
  // au hasard : un gobelet d'eau ou des encouragements
  if(Math.random()<.5&&G.water<capL()-.05){const l=gp.n>=3?.25:.15;G.water=Math.min(capL(),G.water+l);
    emit('Un gobelet tendu !',`+${fmt(l,2)} L d’eau`,'🥤');pop(e,'🥤 Tiens !');return}
  G.boost={k:Math.max(k,G.boost&&G.boost.t>nowt?G.boost.k:1),t:Math.min(nowt+180000,Math.max(nowt,G.boost&&G.boost.t||0)+sec*1000)};
  const msgs=['Allez, allez !','Lâche rien !','T’es une machine !','Plus que quelques kilomètres !','Bravo champion·ne !','Allez la frontale !','On est avec toi !'];
  emit(msgs[Math.floor(Math.random()*msgs.length)],`Encouragements : +${Math.round((k-1)*100)} % de vitesse pendant ${sec} s`,'📣');
  pop(e,gp.n>=3?'👏 Allez !':'👏');
}
function pop(e,t){
  const b=document.createElement('div');b.className='cheer';b.textContent=t;b.style.left=e.clientX+'px';b.style.top=e.clientY+'px';document.body.appendChild(b);
  b.animate([{transform:'translate(-50%,-50%) scale(.6)',opacity:0},{transform:'translate(-50%,-160%) scale(1.2)',opacity:1,offset:.3},{transform:'translate(-50%,-260%) scale(1)',opacity:0}],{duration:1300,easing:'ease-out'}).onfinish=()=>b.remove();
}
function hitFauna(e){
  const x=e.clientX/PX,y=e.clientY/PX,t=performance.now();
  for(const a of ANIM){if(a.shot)continue;const p=faunaPos(a,G.d,t),c=faunaSprite(a.id);const m=(e.pointerType==='touch'?22:12)/PX;if(Math.abs(p.x-x)<c.width/2+m&&Math.abs(p.y-c.height/2-y)<c.height/2+m)return a}
  return null;
}
function photo(a,e){
  a.shot=1;const f=FAUNA[a.id],first=!G.seen[a.id];G.seen[a.id]=(G.seen[a.id]||0)+1;if(first)G.newSp=1;G.st.photos++;
  const r=Math.round(f.c*(first?3:1)*(1+.1*lvl('sponsor'))*((G.gear.eyes&&GEAR[G.gear.eyes].photo)||1)*((G.comp&&COMP[G.comp].photo)||1));addCoins(r);
  const fl=$('#flash');fl.animate([{opacity:.7},{opacity:0}],{duration:350});
  emit((first?'Nouvelle espèce · ':'')+f.n,'Photo dans le carnet · +'+r+' pièces','📷');
  setTimeout(()=>{ANIM=ANIM.filter(x=>x!==a)},1200);
}

/* ---------- interface ---------- */
function tick(){
  const d=now();$('#clock').textContent=hm(d);
  const st=sunTimes(d),wx=weatherAt(d),T=tempAt(d,elevMacro(G.d),wx);
  $('#date').innerHTML=`<b>${d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</b><span>☀ ${hm(st.rise)} – ${hm(st.set)}</span><span>${WX[wx].ic} ${WX[wx].n} · ${T}°</span>`;
  document.documentElement.classList.toggle('nuit',SK.dark>.45);
  document.body.style.background=rgb(SK.hor);
}
tick();setInterval(tick,5000);

const pace=v=>{if(v<.3)return'—';const s=1000/v,m=Math.floor(s/60);return m+':'+String(Math.round(s%60)).padStart(2,'0')};
const dur=s=>{const h=Math.floor(s/3600),m=Math.floor(s/60)%60;return h+':'+String(m).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')};
function hud(){
  const L=leg(G.d);
  $('#bName').textContent=BI[L.b].n;
  {let i=legAt(G.d);while(LEGS[i+1]&&LEGS[i+1].b===L.b)i++;const nx=LEGS[i+1],rest=(LEGS[i].d0+LEGS[i].len-G.d)/1000;
   $('#bSub').textContent=nx?`encore ${fmt(rest,1)} km · puis ${BI[nx.b].n.toLowerCase()}`:''}
  const cn=Math.floor(G.coins);if(cn>(hud.c??cn)){const b=$('#bCoins');b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump')}hud.c=cn;
  $('#nCoin').textContent=fmt(cn);
  // pastilles : un équipement abordable, une nouvelle espèce, des défis réussis non vus
  $('#dShop').hidden=!(Object.entries(GEAR).some(([id,g])=>g.p>0&&!G.own.includes(id)&&g.p<=G.coins)||(Object.entries(COMP).some(([id,c])=>G.st.bio[c.b]&&!G.comps.includes(id)&&G.coins>=c.p)));
  $('#dCarnet').hidden=!G.newSp;
  const nd=G.q.length-(G.qSeen??G.q.length);$('#nDef').hidden=nd<=0;$('#nDef').textContent=nd;
  $('#wDist').innerHTML=fmt(G.d/1000,2)+'<small>km</small>';
  $('#wDp').innerHTML=fmt(G.dp)+'<small>m</small>';
  $('#wPace').innerHTML=pace(LIVE.v)+'<small>/km</small>';
  $('#wHr').textContent=Math.round(LIVE.hr);$('#hr .h').style.animationDuration=(60/LIVE.hr).toFixed(2)+'s';
  $('#wAlt').innerHTML=fmt(elevMacro(G.d))+'<small>m</small>';
  $('#wGr').innerHTML=(LIVE.grade>0?'+':'')+Math.round(LIVE.grade*100)+'<small>%</small>';
  $('#wTime').textContent=dur(G.t);
  // cadran de montre
  if(document.documentElement.classList.contains('wface')){
    const hr=LIVE.hr,pc=clamp((hr/190-.5)/.5,0,1),z=hr<114?1:hr<133?2:hr<152?3:hr<171?4:5,ZC=['#8a8f99','#3a8ae0','#3ab86a','#f0a030','#e8483a'];
    $('#fHr').textContent=Math.round(hr);
    const a=(150+pc*240)*Math.PI/180;$('#fMark').setAttribute('cx',(50+46.5*Math.cos(a)).toFixed(2));$('#fMark').setAttribute('cy',(50+46.5*Math.sin(a)).toFixed(2));
    $('.face .h').style.animationDuration=(60/hr).toFixed(2)+'s';
    $('#fDist').textContent=fmt(G.d/1000,2);$('#fPace').textContent=pace(LIVE.v);$('#fDp').textContent=fmt(G.dp);
    $('#fSub').textContent=`m · ${fmt(elevMacro(G.d))} m · ${(LIVE.grade>0?'+':'')+Math.round(LIVE.grade*100)} %`;
  }$('#wCad').textContent=LIVE.cad+' spm';$('#wMode').textContent=LIVE.mode==='run'?'course':'marche';
  const cap=capL(),sh=GEAR[G.gear.shoes];
  $('#bW').style.width=G.water/cap*100+'%';$('#tW').textContent=fmt(G.water,2)+' L';
  $('#bE').style.width=G.energy+'%';$('#tE').textContent=Math.round(G.energy)+' %';
  const life=Math.max(0,1-G.wear/sh.life);$('#bS').style.width=life*100+'%';$('#bS').style.background=life<.15?'#e85a4a':'#9ad06a';{const ns=G.spare[G.gear.shoes]||0;$('#tS').textContent=fmt(Math.max(0,sh.life-G.wear))+' km'+(ns?' +'+ns:'');$('#tS').title=ns?ns+' paire(s) de rechange':''}
  const box=$('#food'),items=Object.entries(G.stock).filter(([,n])=>n>0),sig=items.map(e=>e.join()).join()+'|'+slots()+'|'+G.flask;
  if(box.dataset.sig!==sig){box.dataset.sig=sig;box.innerHTML='';
    for(const[id,n]of items){const b=document.createElement('button');b.title=FOOD[id].n+' · +'+FOOD[id].e+' (clic pour manger)';b.textContent=FOOD[id].ic+'×'+n;b.onclick=()=>eat(id);box.appendChild(b)}
    if(G.flask){const b=document.createElement('button');b.title='Gourde de secours (bue quand les bidons sont vides)';b.textContent='🧴×'+G.flask;b.onclick=()=>{if(G.water<capL()-.05){G.flask--;G.water=Math.min(capL(),G.water+FLASK.l)}};box.appendChild(b)}
    const sp=document.createElement('span');sp.style.cssText='opacity:.55;font-size:10px;align-self:center;margin-left:auto';sp.textContent=stockN()+'/'+slots();box.appendChild(sp)}
  const nr=nextPoi(G.d,['ravito']),nf=nextPoi(G.d,G.own.includes('filtre')?['fontaine','ravito','buvette','cafe','ruisseau']:['fontaine','ravito','buvette','cafe']);
  $('#next').innerHTML=`<span>⛺ ${nr?fmt((nr.d-G.d)/1000,1)+' km':'—'}</span><span>💧 ${nf?fmt((nf.d-G.d)/1000,1)+' km':'—'}</span><span>${fmt(elevMacro(G.d))} m</span>`;
  const bs=G.boost&&G.boost.t>Date.now()?Math.ceil((G.boost.t-Date.now())/1000):0;
  $('#why').innerHTML=(bs?`<span style="color:#9ef09a">📣 encouragé +${Math.round((G.boost.k-1)*100)} % · ${bs} s</span> `:'')+(LIVE.why.length?'⚠ '+LIVE.why.join(' · '):'');
  drawProfile();
}
const pc=$('#prof'),pg=pc.getContext('2d');
const BCOL={prairie:'#8fbf5a',foret:'#3e6a4c',alpage:'#a8c86a',crete:'#8a8b90',sommet:'#e8eef6',garrigue:'#9aa060',falaise:'#d8d0be',cote:'#4a96c0',hetraie:'#6a8a3e',lac:'#5aa0c0',glacier:'#c8dcf0',vignes:'#a8885a',lavande:'#9a7ac8',gorges:'#4ab8b0',ville:'#9aa2b4',desert:'#e8c080',canyon:'#c8603a',savane:'#d0b060',jungle:'#2e7a3a',volcan:'#4a4040',vieilleville:'#c8b898',foretneige:'#e8f0f8',plage:'#40c8d0'};
function drawProfile(){
  const w=pc.clientWidth,h=pc.clientHeight;if(pc.width!==w){pc.width=w;pc.height=h}
  const a=G.d-1500,b=G.d+6000;let mn=1e9,mx=-1e9;const es=[];
  for(let i=0;i<=w;i++){const e=elevMacro(a+(b-a)*i/w);es.push(e);mn=Math.min(mn,e);mx=Math.max(mx,e)}
  const rg=Math.max(150,mx-mn),Y=e=>h-4-(e-mn)/rg*(h-12);
  pg.clearRect(0,0,w,h);
  for(let i=0;i<=w;i++){const dm=a+(b-a)*i/w;pg.fillStyle=BCOL[leg(dm).b];pg.globalAlpha=dm<G.d?.4:.85;pg.fillRect(i,Y(es[i]),1,h)}
  pg.globalAlpha=1;
  const rx=(G.d-a)/(b-a)*w;pg.fillStyle='#fff';pg.fillRect(Math.round(rx),0,1,h);pg.fillStyle='#e8603a';pg.fillRect(Math.round(rx)-2,Y(es[Math.round(rx)])-2,5,5);
  pg.font='10px JetBrains Mono';pg.textAlign='center';
  for(const p of poisIn(a,b)){if(!['ravito','fontaine','sommet','buvette','cafe'].includes(p.k))continue;const x=(p.d-a)/(b-a)*w;pg.fillText(p.k==='ravito'?'⛺':p.k==='sommet'?'▲':'·',x,Math.max(9,Y(elevMacro(p.d))-3))}
}
setInterval(hud,400);hud();if(innerWidth<700||innerHeight<500)resize();

// annonces
let toastQ=[],toastOn=false;
function pumpToast(){
  if(LIVE.ev.length){toastQ.push(...LIVE.ev);LIVE.ev.length=0}
  if(toastOn||!toastQ.length)return;
  const e=toastQ.shift(),el=$('#toast');toastOn=true;
  el.innerHTML=`<span class="ic">${e.ic||''}</span><div><div class="t1"></div><div class="t2"></div></div>`;el.querySelector('.t1').textContent=e.t1;el.querySelector('.t2').textContent=e.t2;
  el.classList.add('on');setTimeout(()=>{el.classList.remove('on');setTimeout(()=>toastOn=false,400)},4200);
}
setInterval(()=>{checkQuests();pumpToast()},1000);
if(away&&away.km>.05)emit(away.capped?'Pause bivouac':'Pendant ton absence',`${fmt(away.km,2)} km · ${fmt(away.dp)} m D+ · +${fmt(away.coins)} pièces${away.capped?' (plafond '+(4+lvl('bivouac'))+' h)':''}`,'🏃');
setInterval(save,5000);addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});

/* ---------- recherche ---------- */
const ENG={google:['Google','https://www.google.com/search?q='],ddg:['DuckDuckGo','https://duckduckgo.com/?q='],ecosia:['Ecosia','https://www.ecosia.org/search?q='],qwant:['Qwant','https://www.qwant.com/?q='],bing:['Bing','https://www.bing.com/search?q=']};
let eng=store.get('eng','google');if(!ENG[eng])eng='google';
const setEng=k=>{eng=k;store.set('eng',k);$('#eng').textContent=ENG[k][0]};setEng(eng);
$('#eng').onclick=()=>{const k=Object.keys(ENG);setEng(k[(k.indexOf(eng)+1)%k.length]);$('#q').focus()};
const focusQ=()=>{if(document.documentElement.classList.contains('nosearch'))return;if(document.activeElement===document.body||!document.activeElement)$('#q').focus({preventScroll:true})};
focusQ();addEventListener('load',focusQ);addEventListener('focus',focusQ);
addEventListener('keydown',e=>{if(e.key.length===1&&!document.documentElement.classList.contains('nosearch')&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)&&!$('#modal').classList.contains('on'))$('#q').focus()});
function go(url){try{window.top.location.href=url}catch(e){window.open(url,'_top')}}
$('#search').onsubmit=e=>{
  e.preventDefault();const q=$('#q').value.trim();if(!q)return;save();
  go(/^[a-z]+:\/\//i.test(q)?q:!/\s/.test(q)&&/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(q)?'https://'+q:ENG[eng][1]+encodeURIComponent(q));
};
const DEF_LINKS=[{n:'YouTube',u:'https://www.youtube.com'},{n:'Strava',u:'https://www.strava.com'},{n:'Claude',u:'https://claude.ai'}];
const ICO=['#e8603a','#5f9a8e','#d9a441','#7a8fc4','#a26cc4','#5f8f6a','#c4706a','#4f8fb8'];
let editLinks=false;
function linkForm(l,onSave){
  const f=document.createElement('form');f.id='addf';
  f.innerHTML='<input name="n" placeholder="Nom" required><input name="u" placeholder="adresse.com" required><button class="lk add">OK</button>';
  if(l){f.n.value=l.n;f.u.value=l.u.replace(/^https:\/\//,'')}
  f.onsubmit=e=>{e.preventDefault();let u=f.u.value.trim();if(!/^[a-z]+:\/\//i.test(u))u='https://'+u;onSave({n:f.n.value.trim(),u});renderLinks()};
  f.addEventListener('keydown',e=>{if(e.key==='Escape')renderLinks()});return f;
}
function renderLinks(){
  const box=$('#links');box.innerHTML='';box.classList.toggle('edit',editLinks);
  const links=store.get('links',DEF_LINKS);
  links.forEach((l,i)=>{
    const a=document.createElement('a');a.className='lk';a.href=l.u;a.target='_top';
    const h=[...l.n].reduce((s,c)=>s+c.charCodeAt(0),0);
    a.innerHTML=`<span class="ic" style="background:${ICO[h%ICO.length]}"></span><span></span><button class="x" title="Retirer">✕</button>`;
    a.querySelector('.ic').textContent=l.n[0].toUpperCase();a.children[1].textContent=l.n;
    a.querySelector('.x').onclick=e=>{e.preventDefault();e.stopPropagation();const L=store.get('links',DEF_LINKS);L.splice(i,1);store.set('links',L);renderLinks()};
    a.onclick=e=>{if(!editLinks)return;e.preventDefault();const f=linkForm(l,v=>{const L=store.get('links',DEF_LINKS);L[i]=v;store.set('links',L)});a.replaceWith(f);f.n.focus()};
    box.appendChild(a);
  });
  if(editLinks){const add=document.createElement('button');add.className='lk add';add.textContent='+ Ajouter';
    add.onclick=()=>{const f=linkForm(null,v=>{const L=store.get('links',DEF_LINKS);L.push(v);store.set('links',L)});add.replaceWith(f);f.n.focus()};box.appendChild(add)}
  const pen=document.createElement('button');pen.className='lk pen';pen.title=editLinks?'Terminer':'Modifier les raccourcis';pen.textContent=editLinks?'✓':'✎';
  pen.onclick=()=>{editLinks=!editLinks;renderLinks()};box.appendChild(pen);
}

if(store.get('zen',false))document.documentElement.classList.add('zen');
if(!store.get('search',true))document.documentElement.classList.add('nosearch');
if(store.get('watch','face')==='face')document.documentElement.classList.add('wface');

/* ---------- panneau : boutique, carnet, réglages ---------- */
let curTab='boutique';
function openModal(tab){$('#modal').classList.add('on');showTab(tab)}
const closeModal=()=>{$('#modal').classList.remove('on');document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'))};
$('#bCoins').onclick=()=>openModal('boutique');$('#bCarnet').onclick=$('#bBiome').onclick=()=>openModal('carnet');$('#bSet').onclick=()=>openModal('reglages');$('#bDefis').onclick=()=>openModal('defis');
$('#zIn').onclick=()=>setZoom(ZOOM+1);$('#zOut').onclick=()=>setZoom(ZOOM-1);$('#zLbl').textContent=ZOOMS[ZOOM].n;
$('#mClose').onclick=closeModal;$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
document.querySelectorAll('.ph .tab').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
function showTab(t){curTab=t;document.querySelectorAll('.ph .tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  document.querySelectorAll('.nb[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  if(t==='carnet')G.newSp=0;if(t==='defis')G.qSeen=G.q.length;hud();({boutique:renderShop,carnet:renderCarnet,defis:renderDefis,reglages:renderSet,admin:renderAdmin})[t]()}
const coinTxt=n=>fmt(n)+' ◉';
function item(title,desc,btn,cls,on,fn,dis){
  const d=document.createElement('div');d.className='it'+(on?' on':'');
  d.innerHTML='<b></b><button></button><div class="d"></div>';d.querySelector('b').textContent=title;d.querySelector('.d').textContent=desc;
  const b=d.querySelector('button');b.textContent=btn;if(cls)b.className=cls;b.disabled=!!dis;b.onclick=()=>{fn();save();renderShop();hud()};return d;
}
// boutique en rayons : une barre de catégories fixe, puis des grilles de cartes compactes
const SICO={style:'🏃',shoes:'👟',top:'👕',head:'🧢',eyes:'🕶️',bag:'🎒',poles:'🥢',lamp:'🔦'};
let shopCat=store.get('shopCat','ravito'),shopSlot=store.get('shopSlot','shoes');
const spareCost=id=>Math.max(20,Math.round(GEAR[id].p*.4));
function card(o){
  const d=document.createElement('div');d.className='scard'+(o.on?' on':'')+(o.lock?' lock':'');
  d.innerHTML=`<div class="si"></div><div class="sn"></div><div class="sd"></div><button></button>`;
  d.querySelector('.si').textContent=o.ic||'';if(o.sw)d.querySelector('.si').style.cssText=`background:${o.sw};`;
  d.querySelector('.sn').textContent=o.n;d.querySelector('.sd').textContent=o.d||'';d.title=o.d||'';
  if(o.badge){const bg=document.createElement('i');bg.className='sb';bg.textContent=o.badge;d.appendChild(bg)}
  const b=d.querySelector('button');b.textContent=o.btn;if(o.buy)b.className='buy';b.disabled=!!o.dis;
  b.onclick=()=>{o.fn();save();renderShop();hud()};return d;
}
function renderShop(){
  const pb=$('#pb'),keep=pb.scrollTop;pb.innerHTML='';requestAnimationFrame(()=>pb.scrollTop=keep);const reg=BI[leg(G.d).b].reg;
  // barre fixe : pièces, sac, catégories
  const top=document.createElement('div');top.className='shead';
  top.innerHTML=`<div class="sbal"><b>${coinTxt(Math.floor(G.coins))}</b><span>sac ${stockN()}/${slots()} · ${fmt(G.water,2)}/${fmt(capL(),2)} L</span></div><div class="scats"></div>`;
  const CATS=[['ravito','🍌 Ravito'],['equip','🎽 Équipement'],['style','🏃 Style'],['train','💪 Entraînement'],['comp','🐾 Compagnons']];
  for(const[k,n]of CATS){const b=document.createElement('button');b.textContent=n;b.className=shopCat===k?'on':'';b.onclick=()=>{shopCat=k;store.set('shopCat',k);pb.scrollTop=0;renderShop()};top.querySelector('.scats').appendChild(b)}
  pb.appendChild(top);
  const grid=(cls='')=>{const g=document.createElement('div');g.className='sgrid '+cls;pb.appendChild(g);return g};
  const note=t=>{const p=document.createElement('p');p.className='snote';p.textContent=t;pb.appendChild(p)};
  if(shopCat==='ravito'){
    note('Mangé tout seul quand l’énergie baisse. Réassort automatique réglable dans Réglages.');
    const g=grid();
    for(const[id,f]of Object.entries(FOOD)){if(f.reg&&f.reg!==reg)continue;const n=G.stock[id]||0;
      g.appendChild(card({ic:f.ic,n:f.n,d:`+${f.e} d’énergie`,badge:n?'×'+n:'',btn:coinTxt(f.p),buy:1,dis:G.coins<f.p||stockN()>=slots(),fn:()=>{G.coins-=f.p;G.stock[id]=n+1}}))}
    const g2=grid('two');
    g2.appendChild(card({ic:'🧴',n:'Gourde de secours',d:`+${fmt(FLASK.l,1)} L, bue toute seule quand les bidons sont vides. ${FLASK.max} max.`,badge:G.flask?'×'+G.flask:'',btn:'+1 · '+coinTxt(FLASK.p),buy:1,dis:G.coins<FLASK.p||G.flask>=FLASK.max,fn:()=>{G.coins-=FLASK.p;G.flask++}}));
    {const own=G.own.includes('filtre');g2.appendChild(card({ic:'🏞',n:'Filtre à eau',d:'Remplis tes bidons aux ruisseaux, torrents et rivières.',on:own,btn:own?'dans le sac':coinTxt(FILTRE.p),buy:!own,dis:own||G.coins<FILTRE.p,fn:()=>{G.coins-=FILTRE.p;G.own.push('filtre')}}))}
    if(stockN()>=slots())note('Sac plein : un portage plus grand (Équipement → Portage) emporte plus d’encas.');
  }else if(shopCat==='equip'){
    // sous-onglets par emplacement, avec l'objet porté
    const sl=document.createElement('div');sl.className='sslots';
    for(const[slot,name]of SLOTS){if(slot==='style')continue;const b=document.createElement('button');const cur=G.gear[slot]?GEAR[G.gear[slot]].n:'—';
      b.innerHTML=`<span>${SICO[slot]}</span><b></b><small></small>`;b.querySelector('b').textContent=name;b.querySelector('small').textContent=cur;b.className=shopSlot===slot?'on':'';
      b.onclick=()=>{shopSlot=slot;store.set('shopSlot',slot);renderShop()};sl.appendChild(b)}
    pb.appendChild(sl);
    const slot=shopSlot==='style'?'shoes':shopSlot,g=grid('two');
    const sh=GEAR[G.gear.shoes];
    if(slot==='shoes'){const pr=spareCost(G.gear.shoes),n=G.spare[G.gear.shoes]||0,life=Math.round(Math.max(0,1-G.wear/sh.life)*100);
      g.appendChild(card({ic:'📦',n:'Paire de rechange',d:`${sh.n} · semelle actuelle à ${life} %. Enfilée toute seule quand l’autre est usée.`,badge:n?'×'+n+' en réserve':'',btn:'+1 · '+coinTxt(pr),buy:1,dis:G.coins<pr||n>=5,fn:()=>{G.coins-=pr;G.spare[G.gear.shoes]=n+1}}));
      if(life<15&&n===0)g.appendChild(card({ic:'🔁',n:'Changer maintenant',d:'Racheter la même paire et la mettre tout de suite.',btn:coinTxt(pr),buy:1,dis:G.coins<pr,fn:()=>{G.coins-=pr;G.wear=0}}))}
    for(const[id,it]of Object.entries(GEAR)){if(it.s!==slot)continue;const own=G.own.includes(id),on=G.gear[slot]===id;
      g.appendChild(card({ic:SICO[slot],sw:it.col?`linear-gradient(135deg,${it.col}55,${it.col}22)`:'',n:it.n,d:it.d,on,btn:on?'porté':own?'Mettre':coinTxt(it.p),buy:!own,dis:on||(!own&&G.coins<it.p),
        fn:()=>{if(!own){G.coins-=it.p;G.own.push(id)}G.gear[slot]=id;if(slot==='shoes')G.wear=0;if(slot==='bag')G.water=Math.min(G.water,capL())}}))}
    if(['head','eyes','poles','lamp'].includes(slot)&&G.gear[slot])g.appendChild(card({ic:'✕',n:'Rien',d:'Ranger l’accessoire',btn:'Retirer',fn:()=>{G.gear[slot]=null}}));
  }else if(shopCat==='style'){
    note('Change la façon de courir du coureur, avec un petit bonus.');
    const g=grid('two');
    for(const[id,it]of Object.entries(GEAR)){if(it.s!=='style')continue;const own=G.own.includes(id),on=G.gear.style===id;
      g.appendChild(card({ic:'🏃',n:it.n,d:it.d,on,btn:on?'porté':own?'Mettre':coinTxt(it.p),buy:!own,dis:on||(!own&&G.coins<it.p),fn:()=>{if(!own){G.coins-=it.p;G.own.push(id)}G.gear.style=id}}))}
  }else if(shopCat==='train'){
    const g=grid('two');
    for(const[k,u]of Object.entries(UPG)){const l=lvl(k),c=upCost(k,l);
      g.appendChild(card({ic:'💪',n:u.n,d:u.d,badge:'niv. '+l,btn:coinTxt(c),buy:1,dis:G.coins<c,fn:()=>{G.coins-=c;G.up[k]=l+1}}))}
  }else{
    note('On les rencontre en traversant leur paysage, puis on les adopte ici. Un seul court avec toi.');
    const g=grid('two');
    for(const[id,C]of Object.entries(COMP)){const met=!!G.st.bio[C.b],own=G.comps.includes(id),on=G.comp===id;
      g.appendChild(card({ic:met?C.ic:'❔',n:met?C.n:'???',d:met?C.d:`${C.meet} (${BI[C.b].n.toLowerCase()})`,on,lock:!met,
        btn:on?'avec toi':own?'Emmener':met?coinTxt(C.p):'à rencontrer',buy:!own&&met,dis:on||!met||(!own&&G.coins<C.p),fn:()=>{if(!own){G.coins-=C.p;G.comps.push(id)}G.comp=id}}))}
    if(G.comp)grid('two').appendChild(card({ic:'🏃',n:'Courir seul',d:'Laisser ton compagnon se reposer',btn:'Seul',fn:()=>{G.comp=null}}));
  }
}
function renderCarnet(){
  const pb=$('#pb');pb.innerHTML='';const h=t=>{const e=document.createElement('h3');e.textContent=t;pb.appendChild(e)};
  h('Au compteur');
  const s=document.createElement('div');s.className='stats';
  const S=[['Distance',fmt(G.d/1000,1)+' km'],['D+',fmt(G.dp)+' m'],['D−',fmt(G.dn)+' m'],['Temps',dur(G.t)],['Alt. max',fmt(G.st.maxAlt)+' m'],['Sommets',G.st.tops],['Ravitos',G.st.rav],['Mangé',G.st.eaten],['Pièces gagnées',fmt(G.tot)]];
  s.innerHTML=S.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('');pb.appendChild(s);
  h(`Espèces photographiées · ${Object.keys(G.seen).length}/${Object.keys(FAUNA).length}`);
  const gr=document.createElement('div');gr.className='sp-g';
  for(const[id,f]of Object.entries(FAUNA)){const d=document.createElement('div'),n=G.seen[id];if(!n)d.className='no';
    const src=faunaIcon(id),[c,g]=canvasOf(src.width,src.height);if(n)g.drawImage(src,0,0);else{g.drawImage(src,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#2c3446';g.fillRect(0,0,c.width,c.height)}
    d.appendChild(c);d.appendChild(document.createTextNode(n?`${f.n} ×${n}`:'???'));d.title=n?f.n:'Se montre en '+f.b.map(b=>BI[b].n.toLowerCase()).join(', ');gr.appendChild(d)}
  pb.appendChild(gr);
  h('Sommets gravis');
  const tops=(G.tops||[]).slice(-12).reverse();
  if(!tops.length){const p=document.createElement('p');p.style.opacity=.6;p.textContent='Pas encore de sommet. Le premier est au bout de la crête.';pb.appendChild(p)}
  for(const t of tops){const r=document.createElement('div');r.className='qrow';r.innerHTML=`<span>⛰ ${t.n}</span><b>${fmt(t.alt)} m</b>`;pb.appendChild(r)}
}
function renderDefis(){
  const pb=$('#pb');pb.innerHTML='';
  const done=QUESTS.filter(q=>G.q.includes(q.id)).length;
  const top=document.createElement('div');top.className='qtop';
  top.innerHTML=`<b>${done} / ${QUESTS.length}</b> défis réussis<div class="qbar"><i style="width:${done/QUESTS.length*100}%"></i></div>`;pb.appendChild(top);
  for(const[cat,name,ic]of QCAT){
    const L=QUESTS.filter(q=>q.c===cat),dn=L.filter(q=>G.q.includes(q.id)).length;
    const h=document.createElement('h3');h.textContent=`${ic} ${name} · ${dn}/${L.length}`;pb.appendChild(h);
    // les défis en cours d'abord, réussis en bas
    for(const q of [...L.filter(q=>!G.q.includes(q.id)),...L.filter(q=>G.q.includes(q.id))]){
      const ok=G.q.includes(q.id),v=Math.min(q.goal,q.t(G)),dec=q.goal<50&&q.goal%1?1:0;
      const r=document.createElement('div');r.className='qc'+(ok?' ok':'');
      r.innerHTML=`<div class="qh"><span class="qn"></span><span class="qr">${q.r?(ok?'✓ ':'')+'+'+fmt(q.r)+' ◉':ok?'✓':''}</span></div>${q.txt?'<div class="qt"></div>':''}${ok?'':`<div class="qp"><div class="qbar"><i style="width:${v/q.goal*100}%"></i></div><span>${fmt(v,dec)} / ${fmt(q.goal,dec)}</span></div>`}`;
      r.querySelector('.qn').textContent=q.n;if(q.txt)r.querySelector('.qt').textContent=q.txt;pb.appendChild(r);
    }
  }
}
function renderSet(){
  const pb=$('#pb');pb.innerHTML='';const h=t=>{const e=document.createElement('h3');e.textContent=t;pb.appendChild(e)};
  const row=(label,el)=>{const d=document.createElement('div');d.className='set';const s=document.createElement('span');s.textContent=label;d.append(s,el);pb.appendChild(d)};
  const num=(v,fn,min=0,max=99)=>{const i=document.createElement('input');i.type='number';i.min=min;i.max=max;i.value=v;i.onchange=()=>{fn(clamp(+i.value||0,min,max));save()};return i};
  h('Ravitaillement automatique');
  row('Manger quand l’énergie passe sous (%)',num(G.auto.eat,v=>G.auto.eat=v,0,90));
  const p=document.createElement('p');p.style.cssText='font-size:11px;opacity:.65;margin:8px 0';p.textContent='À chaque ravito, le coureur rachète jusqu’à ces quantités si tu as les pièces :';pb.appendChild(p);
  for(const[id,f]of Object.entries(FOOD))row(`${f.ic} ${f.n}`,num(G.auto.restock[id]||0,v=>{if(v)G.auto.restock[id]=v;else delete G.auto.restock[id]},0,20));
  h('Affichage');
  const z=document.createElement('input');z.type='checkbox';z.checked=store.get('zen',false);z.onchange=()=>{store.set('zen',z.checked);document.documentElement.classList.toggle('zen',z.checked)};
  row('Mode contemplation (juste le paysage et l’heure)',z);
  const sb=document.createElement('input');sb.type='checkbox';sb.checked=store.get('search',true);
  sb.onchange=()=>{store.set('search',sb.checked);document.documentElement.classList.toggle('nosearch',!sb.checked)};row('Barre de recherche',sb);
  const ws=document.createElement('select');ws.innerHTML='<option value="face">Cadran de montre</option><option value="strip">Bandeau</option>';ws.value=store.get('watch','face');
  ws.onchange=()=>{store.set('watch',ws.value);document.documentElement.classList.toggle('wface',ws.value==='face');hud()};row('Style de la montre',ws);
  const sel=document.createElement('select');sel.innerHTML='<option value="">Auto (météo du jour)</option>'+Object.entries(WX).map(([k,w])=>`<option value="${k}">${w.ic} ${w.n}</option>`).join('');
  sel.value=store.get('meteoForce','')||'';sel.onchange=()=>setWeather(sel.value||null);row('Météo',sel);
  h('Partie');
  const r=document.createElement('button');r.className='btn';r.textContent='Tout recommencer';
  r.onclick=()=>{if(confirm('Effacer la course, les pièces et le carnet ?')){store.del('save');location.reload()}};row('Repartir du départ, km 0',r);
}
$('#modal').addEventListener('transitionend',()=>{});
setInterval(()=>{if($('#modal').classList.contains('on')&&curTab==='boutique')renderShop()},4000);

/* ---------- onglet Admin (debug) ---------- */
// un ?meteo= dans l'adresse l'emporterait sur le choix : on le retire
function stripParam(...ks){let ch=0;for(const k of ks)if(Q.has(k)){Q.delete(k);ch=1}if(ch)history.replaceState(null,'',location.pathname+(Q.toString()?'?'+Q:''))}
function setWeather(k){stripParam('meteo');store.set('meteoForce',k);skyKey='';drops.length=0;flakes.length=0;tick()}
$('#tAdmin').hidden=!ADMIN();
function jumpTo(dm){G.d=Math.max(0,dm);ensure(G.d);cam=elev(G.d);camMacro=elevMacro(G.d);ANIM=[];save();hud()}
function renderAdmin(){
  const pb=$('#pb');pb.innerHTML='';
  const h=t=>{const e=document.createElement('h3');e.textContent=t;pb.appendChild(e)};
  const btn=(t,fn,cur)=>{const b=document.createElement('button');b.className='btn'+(cur?' cur':'');b.textContent=t;b.onclick=()=>{fn();if(curTab==='admin')renderAdmin()};return b};
  const grid=(...bs)=>{const d=document.createElement('div');d.className='adg';d.append(...bs);pb.appendChild(d);return d};
  const L=leg(G.d);
  // infos en direct
  const info=document.createElement('div');info.id='adInfo';pb.appendChild(info);
  const upd=()=>{if(!info.isConnected)return clearInterval(iv);const m=biomeMix(G.d),Lg=leg(G.d);
    info.textContent=`km ${fmt(G.d/1000,3)} · étape ${LEGS.indexOf(Lg)} ${Lg.b} (${fmt(Lg.d0/1000,1)}→${fmt((Lg.d0+Lg.len)/1000,1)} km)\nmélange ${m.a}→${m.b} ${Math.round(m.t*100)} % · alt ${fmt(elevMacro(G.d))} m · pente ${Math.round(gradeAt(G.d)*100)} %\nvitesse ${fmt(LIVE.v*3.6,1)} km/h · ${LIVE.mode} · ${LIVE.c?LIVE.c.T+' °C':''} ${weatherAt(now())}\nheure ${now().toLocaleTimeString('fr-FR')} ×${SPEED} · zoom ${ZOOMS[ZOOM].n} · ${W}×${H} px ×${PX} · tuiles ${tileCache.size}`};
  upd();const iv=setInterval(upd,500);

  h('Aller dans un monde');
  grid(...Object.keys(BI).map(b=>btn(BI[b].n,()=>{let i=legAt(G.d)+1;ensure(G.d+120000);while(LEGS[i]&&LEGS[i].b!==b)i++;if(LEGS[i])jumpTo(LEGS[i].d0+80)},b===L.b)));
  h('Position');
  {const d=document.createElement('div');d.className='adr';const i=document.createElement('input');i.type='number';i.step='.1';i.value=(G.d/1000).toFixed(2);i.style.width='90px';
   d.append('km',i,btn('Aller',()=>jumpTo(parseFloat(i.value)*1000||0)));pb.appendChild(d)}
  grid(btn('−1 km',()=>jumpTo(G.d-1000)),btn('−100 m',()=>jumpTo(G.d-100)),btn('+100 m',()=>jumpTo(G.d+100)),btn('+1 km',()=>jumpTo(G.d+1000)),btn('+10 km',()=>jumpTo(G.d+10000)),btn('Départ',()=>jumpTo(0)));
  h('Points d’intérêt');
  const NM={ravito:'Ravito',fontaine:'Fontaine',ruisseau:'Ruisseau',buvette:'Buvette',cafe:'Café',sommet:'Sommet',panneau:'Entrée de paysage',depart:'Départ'};
  grid(btn('Prochain ravito',()=>{const p=nextPoi(G.d+30,['ravito']);if(p)jumpTo(p.d-35)}),btn('Prochain refuge',()=>{let p=G.d+30;for(const q of poisIn(G.d+30,G.d+120000))if(q.refuge){jumpTo(q.d-35);break}}),
    btn('Prochaine fontaine',()=>{const p=nextPoi(G.d+30,['fontaine']);if(p)jumpTo(p.d-35)}),btn('Prochain ruisseau',()=>{const p=nextPoi(G.d+30,['ruisseau']);if(p)jumpTo(p.d-35)}),btn('Prochaine buvette / café',()=>{const p=nextPoi(G.d+30,['buvette','cafe']);if(p)jumpTo(p.d-35)}),btn('Prochain sommet',()=>{const p=nextPoi(G.d+30,['sommet']);if(p)jumpTo(p.d-60)}));
  for(const p of poisIn(G.d,G.d+60000).filter(p=>p.k!=='panneau').slice(0,10)){
    const r=document.createElement('div');r.className='adl';
    const s=document.createElement('span');s.textContent=`${fmt((p.d-G.d)/1000,1)} km · ${NM[p.k]||p.k} · ${p.n}${p.alt?' '+p.alt+' m':''} (${BI[leg(p.d).b].n.toLowerCase()})`;
    r.append(s,btn('Aller',()=>jumpTo(p.d-35)));pb.appendChild(r)}
  h('Heure et vitesse');
  {const cur=now(),d=document.createElement('div');d.className='adr';const i=document.createElement('input');i.type='range';i.min=0;i.max=24;i.step=.25;i.value=cur.getHours()+cur.getMinutes()/60;
   const o=document.createElement('b');o.textContent=hm(cur);i.oninput=()=>{setClock(+i.value,null);o.textContent=hm(now());tick()};d.append(i,o);pb.appendChild(d)}
  grid(btn('Heure réelle',()=>{setClock(null,1);tick()},FH==null&&SPEED===1),...[1,10,60,600].map(v=>btn('×'+v,()=>setClock(undefined,v),SPEED===v)));
  h('Météo');
  const mf=store.get('meteoForce',null);
  grid(btn('Auto',()=>setWeather(null),!mf),...Object.entries(WX).map(([k,w])=>btn(w.ic+' '+w.n,()=>setWeather(k),mf===k)));
  h('Saison (couleurs des arbres)');
  const sf=store.get('saison',null);
  grid(btn('Auto',()=>{store.set('saison',null);clearTiles();decoCache.clear();tileBudget=999},!sf),...['printemps','ete','automne','hiver'].map(k=>btn(k,()=>{store.set('saison',k);clearTiles();decoCache.clear();tileBudget=999},sf===k)));
  h('Faune');
  {const d=document.createElement('div');d.className='adr';const sel=document.createElement('select');
   sel.innerHTML=Object.entries(FAUNA).map(([k,f])=>`<option value="${k}">${f.n} (${f.b.join(', ')})</option>`).join('');
   d.append(sel,btn('Faire apparaître',()=>spawnFauna(sel.value)));pb.appendChild(d)}
  h('Coureur');
  grid(btn('+1 000 pièces',()=>addCoins(1000)),btn('Eau pleine',()=>G.water=capL()),btn('Eau vide',()=>G.water=0),btn('Énergie pleine',()=>G.energy=100),btn('Énergie vide',()=>G.energy=0),
    btn('Chaussures usées',()=>G.wear=GEAR[G.gear.shoes].life+1),btn('Chaussures neuves',()=>G.wear=0),btn('Tous les compagnons',()=>{for(const id in COMP){if(!G.comps.includes(id))G.comps.push(id);G.st.bio[COMP[id].b]=1}G.comp=G.comp||'chien'}),
    btn('Tout l’équipement',()=>{for(const id in GEAR)if(!G.own.includes(id))G.own.push(id)}),btn('Valider les défis',()=>{for(const q of QUESTS)if(!G.q.includes(q.id))G.q.push(q.id)}),
    btn('Remettre les défis à zéro',()=>{G.q=[];G.qSeen=0}),btn('Toutes les espèces',()=>{for(const k in FAUNA)G.seen[k]=G.seen[k]||1}));
  h('Affichage');
  grid(...ZOOMS.map((z,i)=>btn(z.n,()=>setZoom(i),ZOOM===i)),btn('Masquer l’onglet Admin',()=>{store.del('admin');$('#tAdmin').hidden=true;showTab('reglages')}));
  save();
}
requestAnimationFrame(loop);
