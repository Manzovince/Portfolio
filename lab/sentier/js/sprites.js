'use strict';
/* ---------- sol du sentier (rendu par colonne chaque image) ---------- */
const GP={
  prairie:{p:['#c2a77c','#a88b62','#8a7050'],g:['#86a852','#6a8e44','#4f733a'],s:['#6b5440','#56432f','#8a8070'],fl:['#f4f0e0','#f2d04a','#d86a8a'],tu:'#9cc060'},
  foret:{p:['#9a7f5c','#7c6444','#5e4b34'],g:['#58783f','#425f34','#30482a'],s:['#4a3a2c','#3a2d22','#6e6a60'],fl:['#c84a3a','#e8dcc0'],tu:'#6f9048'},
  alpage:{p:['#b49c76','#98815e','#7a6648'],g:['#94b65c','#759a4a','#5a7e3e'],s:['#5e4c3a','#4a3b2d','#8f8a80'],fl:['#f6f2ea','#e6c43a','#7a5ad0','#e86a6a','#4a6ae0'],tu:'#aecb6c'},
  crete:{p:['#a09d95','#84817a','#66645f'],g:['#8d8a82','#716e68','#57554f'],s:['#5a5853','#47453f','#a9a69e'],fl:['#dcd8ce'],tu:'#7c8a5c'},
  sommet:{p:['#e2e9f3','#cdd7e7','#aebcd4'],g:['#f6f8fc','#dde5f1','#c3cfe2'],s:['#9aa6bc','#7f8aa2','#c8d2e4'],fl:[],tu:null},
  garrigue:{p:['#d8c69c','#c0ab7e','#a28e64'],g:['#8f9558','#737c47','#5b633b'],s:['#b8a888','#9e8e70','#e4ddcc'],fl:['#9a7ac8','#f2e6b0','#e8d040'],tu:'#a6aa66'},
  falaise:{p:['#e2d8c2','#cabea4','#aca088'],g:['#848e52','#6a7442','#555d36'],s:['#d4cdbd','#b8b09e','#eeeae0'],fl:['#e8d040','#f4f0e0'],tu:'#9aa262'},
  cote:{p:['#dcc89e','#c4ae82','#a89166'],g:['#7e8a52','#667044','#525a38'],s:['#bcab8c','#9e8e72','#e6dcc6'],fl:['#e86ab0','#f2d04a'],tu:'#98a060'},
  hetraie:{p:['#9a7650','#7e5e3e','#604630'],g:['#6a7a3e','#a8682e','#4a5a2c'],s:['#4a3a2c','#3a2d22','#6e6a60'],fl:['#d8902a','#c84a2a','#e8dcc0'],tu:'#7a9048'},
  lac:{p:['#b0a080','#948468','#76684e'],g:['#88b05a','#6a9446','#527a3c'],s:['#5e5448','#4a4238','#9a968e'],fl:['#f6f2ea','#4a6ae0','#e86a6a'],tu:'#a6c86a'},
  glacier:{p:['#a4a29c','#88857f','#6a6862'],g:['#c8d8e8','#a8bcd4','#8a9cb8'],s:['#6a6e78','#565a64','#b4bcc8'],fl:[],tu:null},
  vignes:{p:['#c49a6a','#a87e52','#8a6440'],g:['#7a9a48','#5e7e3a','#4a6630'],s:['#8a5a3a','#74482c','#c8a880'],fl:['#e8d040','#c84a3a'],tu:'#98b05a'},
  lavande:{p:['#d8c6a0','#c0ac82','#a28e66'],g:['#8a7ab0','#6e5e98','#9aa07a'],s:['#b8a888','#9e8e70','#e2dccb'],fl:['#9a78c8','#f2e6b0'],tu:'#9aa47a'},
  gorges:{p:['#e2d2b2','#cab896','#ac9a7a'],g:['#848e52','#6a7442','#555d36'],s:['#d8c4a2','#bca686','#f0e4cc'],fl:['#e8d040','#f4f0e0'],tu:'#98a262'},
  ville:{urban:'road',p:['#c8c4bc','#aeaaa2','#8a867e'],g:['#78a84e','#5e8e40','#4a7434'],s:['#6a5a4a','#5a4a3c','#a8a49c'],fl:['#e86a6a','#f2d04a','#f4f0e0','#9a7ac8'],tu:'#8ab85a'},
  desert:{p:['#ecc890','#d8ae74','#bc9058'],g:['#e2b878','#d0a266','#bc8c54'],s:['#c8965e','#b0804c','#f2d8a8'],fl:[],tu:'#b8a060'},
  canyon:{p:['#d48a5a','#b8704a','#9a5a3a'],g:['#a8603a','#8a4c30','#c87a4a'],s:['#8a3a24','#74301e','#e0a070'],fl:['#e8d040'],tu:'#9a9a5a'},
  savane:{p:['#c8946a','#ae7a54','#946444'],g:['#c8aa58','#ae9046','#8e7638'],s:['#9a5a3a','#84482e','#c8a070'],fl:['#e8d040'],tu:'#d8c070'},
  jungle:{p:['#7a5a3a','#624830','#4a3624'],g:['#3a7a34','#2a6228','#1e4a20'],s:['#3a2a1e','#2e2218','#5a5040'],fl:['#e8402a','#f2a030','#e86ab0'],tu:'#4a9a3a'},
  vieilleville:{urban:'cobble',p:['#b8b0a2','#9a9284','#7a7468'],g:['#78a84e','#5e8e40','#4a7434'],s:['#6a5a4a','#5a4a3c','#b0aca4'],fl:['#e86a6a','#f2d04a','#f4f0e0'],tu:'#8ab85a'},
  foretneige:{p:['#e8eef6','#d0dcea','#b4c4d8'],g:['#f6f9fc','#dde6f1','#c2cfe2'],s:['#9aa6bc','#7f8aa2','#c8d2e4'],fl:[],tu:null},
  plage:{p:['#f4e8cc','#e6d4ae','#d4c094'],g:['#f0e0bc','#e2cea4','#d0b88a'],s:['#c8b088','#b49c74','#f8f0dc'],fl:['#f0a0b0','#f4f0e0'],tu:'#8aaa5a'},
  volcan:{p:['#5a5250','#4a4240','#3a3432'],g:['#4a4442','#3a3432','#2a2624'],s:['#2a2424','#1e1a1a','#6a5e5a'],fl:['#f07028'],tu:'#6a7a4a'}
};
for(const k in GP){const o=GP[k];o.p=o.p.map(hex);o.g=o.g.map(hex);o.s=o.s.map(hex);o.fl=o.fl.map(hex);o.tu=o.tu&&hex(o.tu)}
let groundPB=null,groundCv=null,groundG=null;
// sy[x] = hauteur du sol à l'écran (rempli par drawGround)
let SY=new Float32Array(1);
function groundY(dmScreen,s,cam){return GY-(elev(dmScreen)-cam)/MPX}
function drawGround(g,s,cam){
  if(!groundPB||groundPB.w!==W||groundPB.h!==H){groundPB=PB(W,H);[groundCv,groundG]=canvasOf(W,H);SY=new Float32Array(W)}
  const b=groundPB.b;b.fill(0);
  let lastM=null,pal=null;
  for(let x=0;x<W;x++){
    const dm=s+(x-RX)*MPX,wx=Math.floor(dm/MPX),m=biomeMix(dm,70);
    if(!lastM||m.a!==lastM.a||m.b!==lastM.b||Math.abs(m.t-lastM.t)>.02){
      const A=GP[m.a],B=GP[m.b],t=m.t,mx=(a,b)=>u32(mix(a,b,t));
      pal={p:A.p.map((c,i)=>mx(c,B.p[i])),g:A.g.map((c,i)=>mx(c,B.g[i])),s:A.s.map((c,i)=>mx(c,B.s[i])),fl:(t<.5?A:B).fl.map(u32),tu:(t<.5?A:B).tu,tuR:(t<.5?A:B).tu};
      lastM=m;
    }
    const ys=Math.round(groundY(dm,s,cam));SY[x]=ys;
    const verge=Math.round((4+Math.round(2+2*vn(wx/9,3)))*(1+ZOOM*.45)),PT=2+ZOOM;
    const UB=(m.t<.5?GP[m.a]:GP[m.b]).urban;
    if(UB){const P2=pal,j=6+ZOOM*2;for(let y=Math.max(0,ys);y<H;y++){const r=y-ys;let c;
        if(UB==='road'){c=r===0?P2.p[0]:r<PT+1?(wx%j===0?P2.p[2]:P2.p[1]):r<PT+2?u32(hex('#e8e4dc')):r<PT+3?u32(hex('#6a6a70')):
          (r===PT+3+Math.round(5+ZOOM*2)&&(wx%14)<7)?u32(hex('#f0f0ea')):(hs2(wx,y)<.06?u32(hex('#5a5a62')):u32(hex('#46464e')))}
        else{const row=Math.floor(r/2),off=(row%2)*2;c=r===0?P2.p[0]:((wx+off)%4===0||r%2===0&&hs2(wx>>2,row)<.5)?P2.p[2]:(hs2((wx+off)>>2,row)<.5?P2.p[1]:P2.p[0]);if(r>PT+10)c=hs2(wx,y)<.5?P2.p[2]:P2.p[1]}
        b[y*W+x]=c}
      continue}
    for(let y=Math.max(0,ys);y<H;y++){
      const r=y-ys;let c;
      if(r===0)c=pal.p[0];
      else if(r<PT){const h=hs2(wx,y);c=h<.16?pal.p[2]:(ZOOM&&h>.93)?pal.s[2]:(ZOOM&&h>.86)?pal.p[0]:pal.p[1]}
      else if(r<PT+verge){const q=r-PT;c=q===0?pal.g[0]:(hs2(wx,r)<.3?pal.g[2]:pal.g[1]);
        if(pal.fl.length&&hs2(wx*3,r)<.05)c=pal.fl[Math.floor(hs2(wx,r*7)*pal.fl.length)]}
      else{const q=r-PT-verge;c=q<1?pal.g[2]:(hs2(wx>>1,y>>1)<.035?pal.s[2]:(q>5&&bay(wx,y)<Math.min(.85,(q-5)/14)?pal.s[1]:pal.s[0]))}
      b[y*W+x]=c;
    }
    // touffes d'herbe au bord du chemin
    if(pal.tuR&&hs(wx*1.7)<.16){const th=1+Math.floor(hs(wx*3.3)*2.2),tc=u32(pal.tuR);for(let j=1;j<=th;j++)if(ys-j>=0)b[(ys-j)*W+x]=tc}
  }
  groundG.putImageData(groundPB.img,0,0);g.drawImage(groundCv,0,0);
}

/* ---------- petites aides de dessin sur canvas ---------- */
function spr(w,h,fn){const pb=PB(w,h);fn(pb);const[c,g]=canvasOf(w,h);g.putImageData(pb.img,0,0);return c}
const C32={};const c32=h=>C32[h]||(C32[h]=u32(hex(h)));
// carte de caractères -> sprite
function mapSpr(rows,pal){const h=rows.length,w=Math.max(...rows.map(r=>r.length));
  return spr(w,h,pb=>{for(let y=0;y<h;y++)for(let x=0;x<rows[y].length;x++){const ch=rows[y][x];if(ch!=='.'&&pal[ch])pb.p(x,y,c32(pal[ch]))}})}
function outlineCv(cv,col,a=1){
  const w=cv.width+2,h=cv.height+2,[c,g]=canvasOf(w,h),src=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
  const full=(x,y)=>x>=0&&y>=0&&x<cv.width&&y<cv.height&&src[(y*cv.width+x)*4+3]>0;
  g.fillStyle=rgba(hex(col),a);
  for(let y=-1;y<=cv.height;y++)for(let x=-1;x<=cv.width;x++)if(!full(x,y)&&(full(x+1,y)||full(x-1,y)||full(x,y+1)||full(x,y-1)))g.fillRect(x+1,y+1,1,1);
  g.drawImage(cv,1,1);return c;
}

/* ---------- décor au bord du sentier ---------- */
const DECOR={
  prairie:{p:.32,t:[['leafy',3],['pine',2],['fence',2],['cow',1],['rockT',1],['bench',.3]]},
  foret:{p:.7,t:[['pine',7],['larch',1],['stump',1],['rockT',1]]},
  alpage:{p:.3,t:[['rockT',3],['larch',2],['cow',2],['cairn',.6],['chalet',.3]]},
  crete:{p:.38,t:[['rockT',6],['cairn',1]]},
  sommet:{p:.14,t:[['rockT',3],['cairn',.5]]},
  garrigue:{p:.48,t:[['bush',5],['olive',3],['cypress',1],['wall',1.5],['umbr',1],['hive',.4]]},
  falaise:{p:.38,t:[['bush',5],['umbr',2],['rockT',3]]},
  cote:{p:.34,t:[['bush',4],['umbr',2],['agave',2],['rockT',2]]},
  hetraie:{p:.62,t:[['leafy',7],['stump',1],['rockT',1],['pine',.6]]},
  lac:{p:.3,t:[['rockT',4],['larch',1],['cairn',.6]]},
  glacier:{p:.3,t:[['rockT',5],['cairn',1]]},
  vignes:{p:.6,t:[['vine',8],['cypress',.8],['olive',.6],['wall',1]]},
  lavande:{p:.62,t:[['lavrow',8],['olive',.7],['hive',.6],['umbr',.4]]},
  gorges:{p:.4,t:[['bush',4],['rockT',3],['umbr',1.2]]},
  ville:{p:.6,t:[['lamp',3],['leafy',1.5],['bench',1.2],['bin',1],['bike',1],['cafe',1],['bus',.5]]},
  desert:{p:.18,t:[['rockT',3],['skull',.6],['palm',.4]]},
  canyon:{p:.4,t:[['saguaro',4],['rockT',3],['bush',1.5]]},
  savane:{p:.38,t:[['acacia',3],['bush',2],['termite',1.2],['rockT',1]]},
  jungle:{p:.75,t:[['jtree',5],['palm',3],['rockT',.6]]},
  volcan:{p:.3,t:[['rockT',5],['bush',1]]},
  vieilleville:{p:.6,t:[['lamp',3],['cafe',2],['bench',1],['bike',.8],['leafy',1]]},
  foretneige:{p:.65,t:[['spine',7],['stump',.6],['rockT',.6]]},
  plage:{p:.4,t:[['palm',4],['parasol',1.5],['rockT',.8]]}
};
const CELL=7;
const decoCache=new Map();
function decoSprite(k,v){
  const key=k+v+'z'+ZOOM;let c=decoCache.get(key);if(c)return c;
  const r=rng(v*977+k.length*31);
  if(TREE[k]||k==='larch'||k==='leafy'){
    const s=(k==='rockT'?.8:1.2)*Math.pow(.26/MPX,.8);
    const pb=PB(110,130);drawItem(pb,k,55,122,s*(.8+r()*.4),v*13+7,[0,0,0],0);
    const[cv,g]=canvasOf(110,130);g.putImageData(pb.img,0,0);c={cv,ox:55,oy:123};
  }else c=PROPS[k](r);
  decoCache.set(key,c);return c;
}
// petits objets dessinés à la main (origine = pied de l'objet)
const PROPS={
  fence:r=>({cv:spr(16,5,p=>{const d=c32('#6a5038'),l=c32('#94744e');for(let x=0;x<16;x+=5){p.p(x,0,l);p.r(x,1,1,4,d)}p.r(0,1,16,1,l);p.r(0,3,16,1,d)}),ox:8,oy:5}),
  cow:r=>{const brown=r()<.5;return{cv:outlineCv(mapSpr(['.....hh','bbbbbHH','bbwbbbb','b.b..b.'],{b:brown?'#9a6038':'#e8dccc',w:brown?'#e8dccc':'#5a4636',h:'#d8d0c0',H:brown?'#7a4a2a':'#c8bca8'}),'#2a2420',.55),ox:4,oy:6}},
  cairn:r=>({cv:mapSpr(['.l.','lmd','.m.','lmd','mmdd'],{l:'#b8b6b0',m:'#908e88',d:'#6a6864'}),ox:2,oy:5}),
  bench:r=>({cv:mapSpr(['llllll','dddddd','d....d'],{l:'#a07a50',d:'#6a5038'}),ox:3,oy:3}),
  stump:r=>({cv:mapSpr(['lll','mdm','mdm'],{l:'#c8a878',m:'#6a5038',d:'#4a3828'}),ox:1,oy:3}),
  wall:r=>({cv:spr(20,4,p=>{for(let y=0;y<4;y++)for(let x=0;x<20;x++)p.p(x,y,c32(hs2(x>>1,y)<.4?'#c8bea8':hs2(x,y)<.5?'#a89e88':'#e0d8c6'))}),ox:10,oy:4}),
  hive:r=>({cv:mapSpr(['.www.','yyyyy','wwwww','yyyyy','.d.d.'],{w:'#e8e0c8',y:'#e0b84a',d:'#6a5038'}),ox:2,oy:5}),
  agave:r=>({cv:mapSpr(['l...l..','.l.l.l.','..lmll.','.mmmmm.'],{l:'#8ab0a0',m:'#5f8a78'}),ox:3,oy:4}),
  vine:r=>{const sea=store.get('saison',null)||season();const lv=sea==='automne'?['#d8a030','#b8502a']:sea==='hiver'?['#6a5038','#5a4430']:['#5e8a3e','#7aa64a'];
    return{cv:spr(20,8,p=>{for(let x=1;x<20;x+=5){p.r(x,1,1,7,c32('#7a5a3a'));for(let k=0;k<7;k++)p.p(x-2+Math.floor(r()*5),1+Math.floor(r()*4),c32(lv[k%2]))}p.r(0,2,20,1,c32('#9a8a7a'));if(sea==='automne')for(let k=0;k<3;k++)p.p(Math.floor(r()*20),4,c32('#4a2a5a'))}),ox:10,oy:8}},
  lavrow:r=>{const sea=store.get('saison',null)||season(),g=sea==='hiver'||sea==='automne';
    return{cv:spr(18,5,p=>{for(let x=0;x<18;x++){const h=Math.round(3+Math.sin(x/18*Math.PI)*1.5-(x%3===0?1:0));for(let y=5-h;y<5;y++)p.p(x,y,c32(y<5-h+2?(g?'#9a9a88':(x+y)%3?'#8a68c0':'#6e52a0'):'#7a8a6a'))}}),ox:9,oy:5}},
  parasol:r=>{const c=[['#e84a3a','#f4f0e8'],['#2a8ad8','#f4f0e8'],['#f0c030','#e86a2a']][Math.floor(r()*3)];
    return{cv:spr(13,10,p=>{for(let x=0;x<13;x++){const h=Math.round(2.5-Math.abs(x-6)*.35);for(let y=0;y<=Math.max(0,h);y++)p.p(x,3-y+1,c32(((x>>1)%2)?c[0]:c[1]))}p.r(6,4,1,6,c32('#8a6a4a'));p.r(1,9,5,1,c32('#e8e0d0'))}),ox:6,oy:10}},
  bike:r=>({cv:mapSpr(['..k..k.','.kkkkk.','k.k.k.k','.k...k.'],{k:['#2a2a30','#c8402e','#2a5aa8'][Math.floor(r()*3)]}),ox:3,oy:4}),
  cafe:r=>{const c=['#c8402e','#2a7a5a','#e0a02a'][Math.floor(r()*3)];return{cv:mapSpr(['...uuuuu...','..uuuuuuu..','.....p.....','.c...p...c.','.cc.ttt.cc.','.c.c.t.c.c.'],{u:c,p:'#6a5a4a',t:'#e8e4dc',c:'#3a3a40'}),ox:5,oy:6}},
  bus:r=>({cv:mapSpr(['bbbbbbbbbb','b........b','bgggggggyb','bg......gb','bg..ssss.b','b.......kb'],{b:'#4a5a6a',g:'#a8c8d8',y:'#e8c040',s:'#7a6a5a',k:'#3a3a40'}),ox:5,oy:6}),
  lamp:r=>({cv:mapSpr(['.yy.','.dd.','..d.','..d.','..d.','..d.','..d.','..d.','..d.','.ddd'],{y:'#f6e8a0',d:'#3a3e46'}),ox:2,oy:10,lamp:1}),
  bin:r=>({cv:mapSpr(['ggg','gdg','ggg','ggg'],{g:'#4a7a4a',d:'#2a4a2a'}),ox:1,oy:4}),
  skull:r=>({cv:mapSpr(['.www..','wkwww.','wwwwwww','.w.w..'],{w:'#f0e8d8',k:'#5a4a3a'}),ox:3,oy:4}),
  termite:r=>({cv:mapSpr(['..d..','.ddb.','.dbb.','ddbbb','dbbbb'],{d:'#b07a4a',b:'#8a5a34'}),ox:2,oy:5}),
  chalet:r=>{const pb=PB(30,26);drawItem(pb,'chalet',15,24,1.6,9,[0,0,0],0);const[c,g]=canvasOf(30,26);g.putImageData(pb.img,0,0);return{cv:c,ox:15,oy:25}}
};
function decoAt(cell){
  const dm=cell*CELL,b=biomeMix(dm,40),bi=hs(cell*.37)<b.t?b.b:b.a,D=DECOR[bi];
  if(hs(cell*1.913)>D.p)return null;
  // pas de décor sur les points d'intérêt
  for(const p of poisIn(dm-14,dm+14))if(p.k!=='borne')return null;
  let tot=0;for(const[,w]of D.t)tot+=w;let r=hs(cell*2.71)*tot;
  for(const[k,w]of D.t){r-=w;if(r<=0)return{k,v:Math.floor(hs(cell*5.1)*6),back:hs(cell*3.7)*3|0}}
  return null;
}

/* ---------- structures des points d'intérêt ---------- */
const POIS_SPR={};
function poiSprite(p){
  const key=p.k+(p.refuge?'r':'')+(p.port?'p':'')+(p.k==='fontaine'?BI[leg(p.d).b].reg:'')+'z'+ZOOM;
  if(POIS_SPR[key])return POIS_SPR[key];
  let o;
  if(p.k==='depart')return POIS_SPR[key]=bigArch();
  if(p.k==='ravito'&&p.refuge)return POIS_SPR[key]=bigRefuge();
  switch(p.k){
    case 'depart':o={cv:spr(34,22,pb=>{const R=c32('#d84a3a'),Wt=c32('#f4efe6'),D=c32('#9a2e24');
      for(let a=0;a<=180;a+=2){const t=a*Math.PI/180;for(let rr=13;rr<16;rr++){const x=17+Math.cos(t)*rr,y=19-Math.sin(t)*rr*1.05;pb.p(x,y,rr===15?D:(a>60&&a<120?Wt:R))}}
      pb.r(1,19,4,3,D);pb.r(29,19,4,3,D);for(let x=12;x<23;x+=2)pb.p(x,4,D)}),ox:17,oy:22};break;
    case 'ravito':{
      if(p.refuge){o={cv:outlineCv(spr(26,18,pb=>{const st=c32('#9a948a'),sd=c32('#787268'),rf=c32('#5a3e2c'),rl=c32('#7a5638'),win=c32('#f2c860'),fl=c32('#3a62c8');
        for(let y=8;y<18;y++)for(let x=3;x<23;x++)pb.p(x,y,hs2(x>>1,y)<.4?sd:st);
        for(let y=0;y<9;y++){const hw=Math.round(y*1.35)+1;for(let x=13-hw;x<=13+hw;x++)pb.p(x,y+1,x<13?rl:rf)}
        pb.r(7,11,2,2,win);pb.r(17,11,2,2,win);pb.r(12,13,2,5,rf);pb.r(23,0,1,10,sd);pb.r(19,0,4,2,fl);pb.r(19,2,4,1,c32('#e8e8e8'))}),'#2a2420',.5),ox:14,oy:19};}
      else{o={cv:outlineCv(spr(24,14,pb=>{const R=c32('#d84a3a'),Wt=c32('#f4efe6'),T=c32('#c8b08a'),bl=c32('#4a8ad8'),D=c32('#5a5a5a');
        for(let x=0;x<24;x++){pb.p(x,0,(x>>2)%2?R:Wt);pb.p(x,1,(x>>2)%2?R:Wt);pb.p(x,2,(x>>2)%2?Wt:R)}
        pb.r(1,3,1,11,D);pb.r(22,3,1,11,D);pb.r(4,9,16,1,T);pb.r(5,10,1,4,D);pb.r(18,10,1,4,D);
        pb.r(6,7,2,2,bl);pb.r(9,7,2,2,bl);pb.p(13,8,c32('#f2d04a'));pb.p(15,8,c32('#e86a3a'));pb.p(14,8,c32('#f2d04a'));
        pb.r(10,4,1,1,c32('#f0c39c'));pb.r(10,5,1,3,c32('#3a8a5a'));pb.r(16,4,1,1,c32('#c08a6a'));pb.r(16,5,1,3,c32('#d86a2a'))}),'#2a2420',.5),ox:12,oy:15};}
      break}
    case 'fontaine':{
      const med=!key.endsWith('alpes');
      o=med?{cv:outlineCv(mapSpr(['..ddd..','..d.d..','sssssss','sLsssLs','sssssss'],{d:'#6a5038',s:'#c8bca4',L:'#a89c84'}),'#2a2420',.5),ox:4,oy:6}
        :{cv:outlineCv(mapSpr(['dd.....','.d.....','.db....','.d.b...','.dwwwwd','.dddddd','.d...d.'],{d:'#6a4a30',w:'#5aa0d0',b:'#9ad0f0'}),'#2a2420',.5),ox:3,oy:8};break}
    case 'sommet':o={cv:outlineCv(mapSpr(['...m...','...m...','.mmmmm.','...m...','...m...','..lmd..','.lmmmd.','lmmmmdd'],{m:'#4a4a52',l:'#b8b6b0',d:'#7a7872'}),'#1a1a20',.5),ox:4,oy:9};break;
    case 'panneau':o={cv:mapSpr(['yyyyy.','yyyyyy','yyyyy.','..d...','.yyyy.','yyyyy.','.yyyy.','..d...','..d...','..d...'],{y:'#f2c84a',d:'#7a5a3a'}),ox:2,oy:10};break;
    default:o={cv:mapSpr(['w','d'],{w:'#fff',d:'#888'}),ox:0,oy:2};
  }
  return POIS_SPR[key]=o;
}

/* ---------- le coureur, tout petit (≈11 px) ---------- */
const runCache=new Map();
function runnerFrame(mode,f,gear){
  const key=mode+f+gearKey(gear)+'z'+ZOOM;let c=runCache.get(key);if(c)return c;
  const K=ZOOMS[ZOOM].k,SZ=Math.ceil(14*K)+4,ST=gear.style||'classique';
  const N=mode==='run'?10:12,q0=f/N,TAU=2*Math.PI;
  const sk=ST==='zombie'?hex('#8fb07a'):hex('#e8b48c'),skD=mix(sk,[0,0,0],.25);
  let shirt=hex(GEAR[gear.top].col),shorts=hex('#2c3a52'),shoe=hex(GEAR[gear.shoes].col);
  // tenues imposées par certains styles
  if(ST==='robot'){shirt=hex('#b8c2cc');shorts=hex('#8a949e')}
  if(ST==='pingouin'){shirt=hex('#1e2228');shorts=hex('#1e2228');shoe=hex('#f0a030')}
  if(ST==='genoux')shorts=hex('#e8c040');
  if(ST==='gambade')shirt=hex('#f08ab8');
  if(ST==='zombie'){shirt=mix(shirt,[70,60,50],.55);shorts=hex('#4a4038')}
  const pb=PB(SZ,SZ),ox=Math.round(6*K),oy=SZ-1;
  const P=(x,y,c)=>pb.p(ox+Math.round(x),oy+Math.round(y),u32(c));
  const line=(x0,y0,x1,y1,c)=>{const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++)P(lerp(x0,x1,i/n),lerp(y0,y1,i/n),c)};
  const run=mode==='run';
  const legPos=q=>{q=((q%1)+1)%1;let th,kn;
    if(run){if(q<.42){th=24-50*(q/.42);kn=8}else{const u=(q-.42)/.58;
      if(ST==='genoux'){th=-26+95*(1-Math.cos(Math.PI*u))/2*Math.sin(Math.PI*Math.min(1,u*1.1))+6*u;kn=10+110*Math.sin(Math.PI*Math.min(1,u*1.2))}
      else{th=-26+50*(1-Math.cos(Math.PI*u))/2+8*Math.sin(Math.PI*u);kn=10+95*Math.sin(Math.PI*Math.min(1,u*1.25))}}}
    else{if(q<.55){th=20-36*(q/.55);kn=6}else{const u=(q-.55)/.45;th=-16+36*(1-Math.cos(Math.PI*u))/2;kn=8+45*Math.sin(Math.PI*u)}}
    if(ST==='robot'){th*=.7;kn=4}
    if(ST==='pingouin'){th*=.4;kn*=.35}
    if(ST==='zombie'){th*=.5;kn*=.3}
    const a=th*Math.PI/180,k=(th-kn)*Math.PI/180;
    const l=2*K;return{kx:Math.sin(a)*l,ky:Math.cos(a)*l,ax:Math.sin(a)*l+Math.sin(k)*l,ay:Math.cos(a)*l+Math.cos(k)*l};
  };
  const L1=legPos(q0),L2=legPos(q0+.5);
  let bob=run&&Math.abs(Math.sin(q0*4*Math.PI))>.8?-.6:0;
  if(ST==='gambade')bob=-1.4*K*Math.abs(Math.sin(q0*TAU));
  if(ST==='robot')bob=0;
  const hipY=-Math.max(L1.ay,L2.ay)-1+bob;
  const lean=ST==='zombie'?1.6:ST==='ninja'?2.8:ST==='robot'||ST==='pingouin'?0:ST==='heros'?1.3:run?1:2;
  const sway=ST==='pingouin'?Math.sin(q0*TAU)*.7*K:0;
  const hip=[sway,hipY],sh=[sway+lean*.6*K,hipY-Math.round(3*K)];
  const leg=(Lg,c,cs)=>{line(hip[0],hip[1],hip[0]+Lg.kx,hip[1]+Lg.ky,c);line(hip[0]+Lg.kx,hip[1]+Lg.ky,hip[0]+Lg.ax,hip[1]+Lg.ay,c);P(hip[0]+Lg.ax+1,hip[1]+Lg.ay,cs);P(hip[0]+Lg.ax,hip[1]+Lg.ay,cs)};
  // les bras selon le style ; front = bras côté spectateur
  const arm=(q,c,front)=>{
    const S=sh[0],Y=sh[1];
    if(ST==='zombie'){const w=Math.sin(q*TAU)*.35*K;const e=[S+3.2*K,Y+.4*K+w];line(S,Y,e[0],e[1],c);if(K>1.4)P(e[0]+1,e[1]+1,c);return e}
    if(ST==='ninja'){const w=Math.sin(q*TAU)*.25*K;const e=[S-3.2*K,Y+1.1*K+w];line(S,Y,e[0],e[1],c);return e}
    if(ST==='heros'&&front){const e=[S+2.6*K,Y-1.8*K];line(S,Y,e[0],e[1],c);P(e[0],e[1],c);return e}
    if(ST==='moulin'){const t=q*TAU,e=[S+Math.sin(t)*2.6*K,Y-Math.cos(t)*2.6*K];line(S,Y,e[0],e[1],c);return e}
    if(ST==='pingouin'){const fl=Math.abs(Math.sin(q*TAU))*.6*K;const e=[S-.4*K-fl,Y+2.3*K];line(S,Y,e[0],e[1],c);return e}
    if(ST==='gambade'){const a=(-150+25*Math.sin(q*TAU))*Math.PI/180,ex=S+Math.sin(a)*1.5*K,ey=Y+Math.cos(a)*1.5*K;line(S,Y,ex,ey,c);const e=[ex+.4*K,ey-1.1*K];line(ex,ey,e[0],e[1],c);return e}
    const amp=ST==='genoux'?62:ST==='robot'?22:run?40:30;
    const a=-amp*Math.sin(q*TAU)*Math.PI/180,ex=S+Math.sin(a)*1.5*K,ey=Y+Math.cos(a)*1.5*K;
    const fx=ST==='robot'?1.4*K:(run?1:.6)*K*(ST==='genoux'?1.1:1),fy=ST==='robot'?0:(run?.6:-.4)*K*(ST==='genoux'?1.6:1);
    line(S,Y,ex,ey,c);line(ex,ey,ex+fx,ey-fy,c);return[ex+fx,ey-fy]};
  // cape de super-héros, derrière tout
  if(ST==='heros'){const cape=hex('#d8302a'),capeD=hex('#a82020');for(let i=0;i<=Math.round(4*K);i++){const w=Math.sin(q0*TAU*2+i*.8)*.6*K;for(let j=0;j<=Math.round(1.2*K);j++)P(sh[0]-.6-i,sh[1]+1+i*.55+w+j,j?capeD:cape)}}
  arm(q0+.5,skD,false);leg(L2,skD,mix(shoe,[0,0,0],.3));
  line(hip[0],hip[1],sh[0],sh[1]+1,shirt);if(K>1.2){line(hip[0]-1,hip[1]-1,sh[0]-1,sh[1]+1,shirt);P(hip[0]-1,hip[1],shorts);if(K>1.7)P(hip[0],hip[1]-1,shorts)}P(hip[0],hip[1],shorts);
  if(ST==='pingouin')line(hip[0]+1,hip[1]-1,sh[0]+1,sh[1]+2,hex('#f4f4f0'));
  if(ST==='zombie'){P(sh[0],sh[1]+2,sk);if(K>1.2){P(hip[0]-1,hip[1]-1,sk);P(hip[0]+1,hip[1]+1,hex('#7a2a24'))}}
  if(gear.bag&&GEAR[gear.bag].vest&&ST!=='heros')P(sh[0]-1,sh[1]+1,hex('#3a3a44'));
  const hx0=Math.round(sh[0]),hy0=Math.round(sh[1]),hh=K>1.2?2:1;
  let hc=gear.head?hex(GEAR[gear.head].col):hex('#3a2a22');
  if(ST==='robot')hc=hex('#9aa4b0');if(ST==='pingouin')hc=hex('#1e2228');
  const face=ST==='robot'?hex('#c8d0d8'):ST==='pingouin'?hex('#f4f4f0'):sk;
  for(let j=1;j<=hh;j++){P(hx0,hy0-j,j===hh&&K>1.2?hc:face);P(hx0+1,hy0-j,face)}if(K>1.7)P(hx0+2,hy0-1,ST==='pingouin'?hex('#f0a030'):face);
  P(hx0,hy0-hh-1,hc);P(hx0+1,hy0-hh-1,gear.lamp?hex('#f8f0b0'):hc);if(K>1.7)P(hx0-1,hy0-hh,hc);if(gear.head==='casquette'&&ST!=='robot'&&ST!=='pingouin')P(hx0+2,hy0-hh-1,hc);
  // lunettes
  if(gear.eyes&&ST!=='robot'){const gc=hex(GEAR[gear.eyes].col);P(hx0+1,hy0-hh+(K>1.2?1:0),gc);if(K>1.7){P(hx0+2,hy0-hh+1,gc);if(gear.eyes==='masque')P(hx0,hy0-hh+1,gc)}}
  // bandeaux
  if(ST==='ninja'||ST==='moulin'){const bc=ST==='ninja'?hex('#d82a2a'):hex('#2ac0b0'),by=hy0-hh;P(hx0,by,bc);P(hx0+1,by,bc);
    if(ST==='ninja')for(let i=1;i<=Math.round(2.5*K);i++)P(hx0-i,by+Math.round(Math.sin(q0*TAU*2+i)*.6+i*.2),bc)}
  if(ST==='robot'&&K>1.2)P(hx0+1,hy0-hh-2,hex('#e84a3a'));
  leg(L1,sk,shoe);
  if(ST==='genoux'&&K>1.2){P(hip[0]+L1.ax,hip[1]+L1.ay-1,hex('#f4f4f0'))}
  const hand=arm(q0,sk,true);
  if(ST==='moulin'&&K>1.2)P(hand[0],hand[1],hex('#2ac0b0'));
  if(gear.poles&&!run&&ST==='classique'){const pc=hex('#9aa0aa'),f=.65,ex=hand[0]+(1.2-2.4*Math.sin(TAU*q0))*K*f,ey=hand[1]+(0-hand[1])*f;line(hand[0],hand[1],ex,ey,pc)}
  const[cv,g]=canvasOf(SZ,SZ);g.putImageData(pb.img,0,0);
  c={cv:outlineCv(cv,'#1c1820',.4+.15*(K>1.2)),ox:ox+1,oy:oy+1};runCache.set(key,c);return c;
}
const gearKey=g=>[g.shoes,g.top,g.head,g.eyes,g.bag,g.poles,g.lamp,g.style].join(',');

/* ---------- le chien (border collie) ---------- */
const compCache={};
const COMPSPR={
  chien:{h:0.6,p:{b:'#2a2626',w:'#f0ece4'},f:[['....b','bbbbw','b...b'],['....b','bbbbw','.b.b.'],['....b','bbbbw','..b..'],['....b','bbbbw','.b.b.']]},
  chat:{h:0.3,p:{k:'#e8903a',d:'#b8682a'},f:[['k...kk','.kkkkk','.k..k.'],['k...kk','.kkkkk','..kk..'],['.k..kk','.kkkkk','.k..k.'],['k...kk','.kkkkk','..kk..']]},
  marmotte:{h:0.45,p:{m:'#9a7448',l:'#c8a478'},f:[['..mm','mmlm','m..m'],['..mm','mmlm','.mm.'],['..mm','mmlm','m..m'],['..mm','mmlm','.mm.']]},
  chevre:{h:0.8,p:{m:'#7a4a2a',d:'#3a2a1a'},f:[['....dd','....mm','mmmmm.','m.m.m.'],['....dd','....mm','mmmmm.','.m.m..'],['....dd','....mm','mmmmm.','..m.m.'],['....dd','....mm','mmmmm.','.m.m..']]},
  fennec:{h:0.3,p:{s:'#e8c890'},f:[['...s.s','sssss.','s...s.'],['...s.s','sssss.','.s.s..'],['...s.s','sssss.','..s...'],['...s.s','sssss.','.s.s..']]},
  suricate:{h:0.3,p:{s:'#b89a6a',k:'#4a3a2a'},f:[['....k','sssss','s...s'],['....k','sssss','.s.s.'],['....k','sssss','..s..'],['.k','.s','.s','ss']]},
  ara:{h:0.7,p:{r:'#d8302a',b:'#3a6ad0',y:'#f0c030'},f:[['b...b','.rrry','..r..'],['.....','brrry','b.r..'],['.....','.rrry','bbr..'],['.....','brrry','b.r..']]}
};
function compFrame(id,f){
  const k=id+f+'z'+ZOOM;if(compCache[k])return compCache[k];const S=COMPSPR[id],m=S.f[f%S.f.length];
  if(COMPQ[id]){const cv=outlineCv(quad(COMPQ[id],S.h*pxPerM(),f*Math.PI/2),'#141214',.4);return compCache[k]={cv,ox:Math.floor(cv.width/2),oy:cv.height}}
  const cv0=mapSpr(m,S.p);return compCache[k]={cv:outlineCv(cv0,'#141214',.4),ox:Math.floor(cv0.width/2),oy:cv0.height+1};
}

/* ---------- animaux à photographier ---------- */
const FAUNA={
  marmotte:{h:0.45,n:'Marmotte',b:['alpage','crete','lac'],r:1,c:8,m:['.d.','mmm','mlm','m.m'],p:{m:'#9a7448',l:'#c8a478',d:'#6a4a30'}},
  chamois:{h:0.9,n:'Chamois',b:['crete','alpage','sommet','glacier'],r:.6,c:15,m:['....dd','.....m','mmmmmm','mllmm.','m.m.m.'],p:{m:'#6a4a32',l:'#c8b498',d:'#2a2018'}},
  bouquetin:{h:1.0,n:'Bouquetin',b:['crete','sommet','glacier','lac'],r:.4,c:25,m:['....dd.','.....dd','.....mm','mmmmmmm','mmmmmm.','m.m..m.'],p:{m:'#8a7a62',d:'#4a3e30'}},
  aigle:{h:0.8,n:'Aigle royal',b:['crete','sommet','alpage'],r:.25,c:40,fly:1,m:['dd.....dd','.ddmmmdd.','...mlm...'],p:{m:'#5a3e28',l:'#c89a48',d:'#3a281a'}},
  gypaete:{h:0.9,n:'Gypaète barbu',b:['sommet','crete'],r:.08,c:120,fly:1,m:['ddd....ddd','..ddmmdd..','....ml....'],p:{m:'#c88a48',l:'#f0d8b0',d:'#3a3434'}},
  edelweiss:{h:0.15,n:'Edelweiss',b:['crete','alpage'],r:.3,c:35,m:['.w.','wyw','.w.','.g.'],p:{w:'#f4f4ec',y:'#e8d050',g:'#7a9a5a'}},
  chevreuil:{h:0.9,n:'Chevreuil',b:['foret','prairie','hetraie','vignes'],r:.6,c:14,m:['....d.','....mm','mmmmm.','mmmmm.','m...m.'],p:{m:'#a86a3a',d:'#5a3a22'}},
  ecureuil:{h:0.25,n:'Écureuil roux',b:['foret','hetraie'],r:.8,c:9,m:['m.m','mmm','.mm'],p:{m:'#c8582a'}},
  pic:{h:0.35,n:'Pic noir',b:['foret','hetraie'],r:.35,c:20,m:['r.','dd','dd','d.'],p:{d:'#1e1e22',r:'#d83a2a'}},
  vache:{h:1.4,n:'Vache tarine',b:['alpage','prairie'],r:1,c:5,m:['....mh','mmmmmm','mwmmm.','m.m.m.'],p:{m:'#a86a3a',w:'#e8dcc8',h:'#e8e0d0'}},
  heron:{h:1.0,n:'Héron cendré',b:['prairie'],r:.3,c:18,m:['.dd','..m','..m','.mm','mm.','.d.','.d.'],p:{m:'#9aa0aa',d:'#4a4e56'}},
  cigale:{h:0.05,n:'Cigale',b:['garrigue','falaise','lavande','vignes','gorges'],r:.9,c:6,m:['ll','mm'],p:{m:'#5a5a3a',l:'#c8d0c0'}},
  lezard:{h:0.12,n:'Lézard ocellé',b:['garrigue','falaise','cote','gorges'],r:.5,c:16,m:['.mmmmm','mm.m.m.'],p:{m:'#4a9a3a'}},
  sanglier:{h:0.9,n:'Sanglier',b:['garrigue'],r:.35,c:22,m:['.ddddd.','dddddddw','ddddddd.','d.d..d.'],p:{d:'#4a3a2e',w:'#e8e0d0'}},
  chevre:{h:0.8,n:'Chèvre du Rove',b:['garrigue','falaise','gorges'],r:.5,c:14,m:['.....dd','.....mm','mmmmmm.','mmmmm..','m.m.m..'],p:{m:'#7a4a2a',d:'#3a2a1a'}},
  tortue:{h:0.15,n:'Tortue d’Hermann',b:['garrigue'],r:.2,c:45,m:['.ymy.','mymymg'],p:{m:'#6a5a2a',y:'#d8b84a',g:'#9a9a5a'}},
  goeland:{h:0.45,n:'Goéland leucophée',b:['cote','falaise'],r:.9,c:7,fly:1,m:['d.....d','.wwwww.','...w...'],p:{w:'#f4f4f4',d:'#5a5e66'}},
  dauphin:{n:'Grand dauphin',b:['cote','plage'],r:.12,c:60,sea:1,m:['..m...','.mmmm.','mm..mm'],p:{m:'#5a6a7a'}},
  cerf:{h:1.4,n:'Cerf élaphe',b:['hetraie','foret'],r:.35,c:24,m:['d...d.','.d.d..','..dd..','...mm.','mmmmm.','mmmmm.','m...m.'],p:{m:'#8a5a32',d:'#5a3e26'}},
  blaireau:{h:0.35,n:'Blaireau',b:['hetraie'],r:.5,c:16,m:['.....ww','ddddddd','gggggg.','g.g..g.'],p:{d:'#3a3a3a',g:'#8a8a8a',w:'#f0f0ec'}},
  geai:{h:0.3,n:'Geai des chênes',b:['hetraie'],r:.6,c:10,fly:1,m:['b.....b','.ppppp.','...pw..'],p:{p:'#c8a08a',b:'#3a6ad0',w:'#f4f4f4'}},
  salamandre:{h:0.06,n:'Salamandre tachetée',b:['hetraie','foret'],r:.25,c:30,m:['.kykky','kyk.k.k'],p:{k:'#1e1e22',y:'#f0c020'}},
  colvert:{h:0.35,n:'Canard colvert',b:['lac'],r:.9,c:8,m:['..gy','mmmm.','mmmm.'],p:{g:'#2a7a3a',y:'#e8c040',m:'#9a8a78'}},
  truite:{n:'Truite fario',b:['lac','gorges'],r:.6,c:18,sea:1,m:['.mmm..','mmrmmm','.mmm..'],p:{m:'#8a8a5a',r:'#d84a3a'}},
  grenouille:{h:0.06,n:'Grenouille rousse',b:['lac'],r:.6,c:12,m:['.w.w','mmmm','m..m'],p:{m:'#a8703a',w:'#f0e0c0'}},
  lagopede:{h:0.35,n:'Lagopède alpin',b:['glacier','sommet'],r:.5,c:28,m:['.ww','www','wwr','.k.'],p:{w:'#f6f6f2',r:'#d83a2a',k:'#3a3a3a'}},
  chocard:{h:0.3,n:'Chocard à bec jaune',b:['glacier','crete','sommet'],r:.8,c:12,fly:1,m:['kk...kk','.kkkkky','..k.k..'],p:{k:'#1c1c22',y:'#e8c840'}},
  huppe:{h:0.3,n:'Huppe fasciée',b:['vignes','lavande'],r:.4,c:22,m:['oko.','.ooo','.wkw','..k.'],p:{o:'#d8904a',k:'#2a2a2a',w:'#f0ece0'}},
  faisan:{h:0.55,n:'Faisan de Colchide',b:['vignes'],r:.5,c:14,m:['....gr','.oooo.','ooooo.','tt.o.o'],p:{o:'#c8702a',g:'#2a6a4a',r:'#d83a2a',t:'#8a5a2a'}},
  escargot:{h:0.05,n:'Escargot de Bourgogne',b:['vignes','hetraie'],r:.7,c:6,m:['.bb.','bdbd','gggg'],p:{b:'#b08a5a',d:'#7a5a3a',g:'#c8b8a0'}},
  machaon:{h:0.08,n:'Machaon',b:['lavande','alpage'],r:.6,c:15,fly:1,m:['yky','kyk','yky'],p:{y:'#f2d84a',k:'#2a2a2a'}},
  abeille:{h:0.03,n:'Abeille',b:['lavande'],r:1,c:5,fly:1,m:['ww','yk'],p:{w:'#e8f0f8',y:'#e8b830',k:'#2a2a2a'}},
  perdrix:{h:0.3,n:'Perdrix rouge',b:['lavande','garrigue'],r:.45,c:18,m:['..rg','gggg.','gbgg.','.r.r'],p:{g:'#9a8a78',r:'#d84a3a',b:'#5a6a8a'}},
  vautour:{h:1.0,n:'Vautour fauve',b:['gorges'],r:.5,c:30,fly:1,m:['ddd.....ddd','..ddmmmdd..','....mwm....'],p:{d:'#4a3a2a',m:'#b08a5a',w:'#f0e8d8'}},
  martin:{h:0.2,n:'Martin-pêcheur',b:['gorges','lac'],r:.3,c:35,fly:1,m:['.bbo','bbbo','..o.'],p:{b:'#2a9ad0',o:'#e8803a'}},
  castor:{h:0.4,n:'Castor d’Europe',b:['gorges'],r:.25,c:40,m:['....mm','mmmmmm','mmmmm.','tt.m.m'],p:{m:'#7a5032',t:'#4a3426'}},
  pigeon:{h:0.3,n:'Pigeon biset',b:['ville'],r:1,c:4,m:['.gk','ggg.','.g.'],p:{g:'#8a8e98',k:'#3a6a5a'}},
  renard:{h:0.45,n:'Renard des villes',b:['ville','prairie','hetraie'],r:.5,c:16,m:['.....oo','oooooow','ooooo..','o.o..o.'],p:{o:'#d8702a',w:'#f0ece4'}},
  chat:{h:0.3,n:'Chat de gouttière',b:['ville'],r:.6,c:8,m:['k...kk','.kkkkk','.k..k.'],p:{k:'#3a3a3e'}},
  herisson:{h:0.2,n:'Hérisson',b:['ville','prairie'],r:.4,c:14,m:['.bbbb.','bbbbbbf','..k.k.'],p:{b:'#7a6a5a',f:'#c8a888',k:'#3a2a20'}},
  fennec:{h:0.3,n:'Fennec',b:['desert'],r:.5,c:24,m:['s...s.','ss.ss.','.sssss','..sss.','..s.s.'],p:{s:'#e8c890'}},
  dromadaire:{h:2.1,n:'Dromadaire',b:['desert'],r:.6,c:18,m:['..cc...','.cccc.c','cccccccc','.c..c..','.c..c..'],p:{c:'#c89a62'}},
  scarabee:{h:0.03,n:'Scarabée sacré',b:['desert'],r:.7,c:10,m:['.kk.','kkkk','k..k'],p:{k:'#2a2a30'}},
  scorpion:{h:0.05,n:'Scorpion',b:['desert','canyon'],r:.35,c:26,m:['y.....','.y.yy.','yyyyyy'],p:{y:'#d8b050'}},
  coyote:{h:0.6,n:'Coyote',b:['canyon'],r:.5,c:18,m:['.....gg','ggggggg','ggggg..','g.g..g.'],p:{g:'#a89070'}},
  serpent:{h:0.1,n:'Crotale',b:['canyon','desert'],r:.3,c:28,m:['.bb...b','b..bbb.'],p:{b:'#a8885a'}},
  geocoucou:{h:0.5,n:'Géocoucou',b:['canyon'],r:.35,c:30,m:['b.bb','.bbbb','bb.b.','.b.b.'],p:{b:'#6a5a4a'}},
  girafe:{h:5,n:'Girafe',b:['savane'],r:.5,c:28,m:['...yy','...y.','...y.','...y.','yyyyy','yyyy.','y..y.','y..y.'],p:{y:'#d8a048'}},
  zebre:{h:1.4,n:'Zèbre',b:['savane'],r:.6,c:20,m:['.....wk','wkwkwkw','kwkwkw.','w.k..w.'],p:{w:'#f0f0ec',k:'#2a2a2a'}},
  elephant:{h:3.2,n:'Éléphant',b:['savane'],r:.35,c:35,m:['.gggg..','ggggggg','gggggg.g','gggggg.g','g.g.g...'],p:{g:'#8a8a90'}},
  lion:{h:1.2,n:'Lion',b:['savane'],r:.2,c:50,m:['.....mm','.....mm','yyyyyym','yyyyyy.','y.y..y.'],p:{y:'#d8a858',m:'#8a5a2a'}},
  toucan:{h:0.45,n:'Toucan',b:['jungle'],r:.6,c:20,m:['.kooo','kkwy.','kk...','.k...'],p:{k:'#1e1e22',o:'#f08a2a',w:'#f4f4f0',y:'#e8d040'}},
  singe:{h:0.6,n:'Singe hurleur',b:['jungle'],r:.7,c:14,m:['.bb.','bbbb','.bb.','b..b'],p:{b:'#6a4a32'}},
  jaguar:{h:0.75,n:'Jaguar',b:['jungle'],r:.18,c:55,m:['.....yy','yyykyyy','ykyyky.','y.y..y.'],p:{y:'#e0a848',k:'#4a3020'}},
  ara:{h:0.8,n:'Ara rouge',b:['jungle'],r:.5,c:22,fly:1,m:['rr...rr','.rrbrr.','...y...'],p:{r:'#d8302a',b:'#3a6ad0',y:'#f0c030'}},
  paresseux:{h:0.6,n:'Paresseux',b:['jungle'],r:.3,c:32,fly:1,m:['k.....k','.bbbbb.','..bbb..'],p:{b:'#9a8a6a',k:'#4a3a2a'}},
  iguane:{h:0.35,n:'Iguane',b:['volcan','jungle'],r:.5,c:16,m:['....gg','ggggggg','g.g.g..'],p:{g:'#5a8a4a'}},
  fregate:{h:0.9,n:'Frégate superbe',b:['volcan'],r:.4,c:26,fly:1,m:['kk.......kk','..kkkrkkk..','....kkk....'],p:{k:'#1e1e24',r:'#d83a2a'}},
  moineau:{h:0.15,n:'Moineau domestique',b:['vieilleville','ville'],r:1,c:4,m:['.bb','bbbk','.y.'],p:{b:'#9a7a5a',k:'#3a2a1a',y:'#e8b040'}},
  pie:{h:0.45,n:'Pie bavarde',b:['vieilleville','prairie'],r:.6,c:10,fly:1,m:['k.....k','.kwwkkk','...k...'],p:{k:'#1e2028',w:'#f4f4f0'}},
  lynx:{h:0.7,n:'Lynx boréal',b:['foretneige','foret'],r:.15,c:60,m:['k...k.','.yyyy.','yyyyyy','y.y.y.'],p:{y:'#c8a070',k:'#2a2420'}},
  lievre:{h:0.45,n:'Lièvre variable',b:['foretneige','glacier'],r:.6,c:14,m:['.w.w','.www','wwww.','w..w.'],p:{w:'#f6f6f2'}},
  harfang:{h:0.6,n:'Harfang des neiges',b:['foretneige'],r:.25,c:45,fly:1,m:['ww...ww','.wwkww.','..www..'],p:{w:'#f8f8f4',k:'#3a3a3a'}},
  crabe:{h:0.08,n:'Crabe fantôme',b:['plage'],r:1,c:6,m:['k...k','.ooo.','o.o.o'],p:{o:'#f0d8a8',k:'#3a2a1a'}},
  tortuemer:{n:'Tortue verte',b:['plage'],r:.3,c:40,sea:1,m:['..gg..','gbbbbg','.g..g.'],p:{g:'#5a8a5a',b:'#8a6a3a'}},
  pelican:{h:0.9,n:'Pélican brun',b:['plage'],r:.5,c:18,fly:1,m:['bb.....','.bbbbyy','..bb...'],p:{b:'#8a7a6a',y:'#e8c040'}},
  flamant:{h:1.3,n:'Flamant rose',b:['cote'],r:.15,c:50,m:['.pp','..p','..p','.pp','pp.','.d.','.d.'],p:{p:'#f0a0b4',d:'#c86a80'}}
};
const faunaCache={};
// taille réelle : chaque espèce a une hauteur en mètres (h), dessinée à l'échelle du coureur (~1,8 m)
const pxPerM=()=>(7*ZOOMS[ZOOM].k+3)/1.8;
function scaleCv(src,tw,th){const[c,g]=canvasOf(tw,th);g.imageSmoothingEnabled=false;g.drawImage(src,0,0,tw,th);return c}
function scaledMap(rows,pal,hm,minPx=3){
  const base=mapSpr(rows,pal);if(!hm)return base;
  const th=Math.max(minPx,Math.round(hm*pxPerM())),f=th/base.height;
  if(f>.85&&f<1.2)return base;
  return scaleCv(base,Math.max(2,Math.round(base.width*f)),th);
}
function faunaIcon(id){return faunaCache['i'+id]||(faunaCache['i'+id]=outlineCv(mapSpr(FAUNA[id].m,FAUNA[id].p),'#18161a',.5))}
function faunaSprite(id){const k=id+'z'+ZOOM,F=FAUNA[id];if(faunaCache[k])return faunaCache[k];
  const Hp=(F.h||0)*pxPerM();let cv;
  if(id==='elephant')cv=elephant(Hp);
  else if(BIGQ[id])cv=quad(BIGQ[id],Hp);
  else if(BIGB[id])cv=bigBird(BIGB[id],Hp);
  else cv=mapSpr(F.m,F.p);           // petits animaux : leur sprite d'origine, déjà à bonne échelle
  return faunaCache[k]=outlineCv(cv,'#18161a',.5)}

/* ---------- petits détails au bord du chemin (zoom moyen et proche) ---------- */
const MICRO={
  prairie:{p:.55,t:[['tuft',4],['flowers',3],['pebble',1],['daisy',2]]},
  foret:{p:.6,t:[['fern',4],['mush',1.2],['tuft',1],['pebble',1],['moss',2]]},
  alpage:{p:.65,t:[['flowers',4],['tuft',3],['pebble',1.5],['daisy',2]]},
  crete:{p:.5,t:[['pebble',5],['tuft',1],['flowers',.6]]},
  sommet:{p:.35,t:[['snowlump',3],['pebble',2]]},
  garrigue:{p:.6,t:[['lav',3],['thyme',3],['pebble',2],['tuft',1]]},
  falaise:{p:.5,t:[['thyme',3],['pebble',3],['flowers',1]]},
  hetraie:{p:.65,t:[['fern',3],['mush',2],['moss',2],['leaves',3],['pebble',1]]},
  lac:{p:.6,t:[['flowers',3],['tuft',3],['pebble',2],['daisy',1]]},
  glacier:{p:.4,t:[['pebble',4],['snowlump',2]]},
  vignes:{p:.5,t:[['tuft',2],['pebble',2],['flowers',1]]},
  lavande:{p:.65,t:[['lav',5],['thyme',2],['pebble',1]]},
  gorges:{p:.5,t:[['thyme',3],['pebble',3],['flowers',1]]},
  ville:{p:.55,t:[['flowers',3],['tuft',3],['daisy',2],['pebble',1]]},
  desert:{p:.3,t:[['pebble',3],['tuft',1]]},
  canyon:{p:.45,t:[['pebble',4],['tuft',1.5]]},
  savane:{p:.6,t:[['tuft',6],['pebble',1]]},
  jungle:{p:.75,t:[['fern',5],['flowers',2],['mush',1],['moss',2]]},
  volcan:{p:.45,t:[['pebble',4],['ember',1.5],['fern',.5]]},
  vieilleville:{p:.4,t:[['flowers',2],['tuft',2],['pebble',1]]},
  foretneige:{p:.5,t:[['snowlump',5],['pebble',1]]},
  plage:{p:.5,t:[['shell',3],['pebble',1],['tuft',1]]},
  cote:{p:.5,t:[['thyme',2],['pebble',3],['flowers',2],['tuft',1]]}
};
const MCELL=1.6;
function microAt(cell){
  const dm=cell*MCELL,b=biomeMix(dm,40),bi=hs(cell*.53)<b.t?b.b:b.a,D=MICRO[bi];
  if(hs(cell*3.917)>D.p)return null;
  let tot=0;for(const[,w]of D.t)tot+=w;let r=hs(cell*1.77)*tot;
  for(const[k,w]of D.t){r-=w;if(r<=0)return{k,bi,v:Math.floor(hs(cell*6.3)*5),front:hs(cell*8.1)<.45}}
  return null;
}
const microCache=new Map();
function microSprite(k,bi,v){
  const key=k+bi+v+'z'+ZOOM;let c=microCache.get(key);if(c)return c;
  const K=ZOOMS[ZOOM].k,r=rng(v*313+k.length*7+bi.length),P=GP[bi];
  const tu=P.tu||hex('#8a9a6a'),g0=P.g[0],g2=P.g[2],fl=P.fl.length?P.fl:[hex('#f4f0e0')];
  const w=Math.ceil(10*K),h=Math.ceil(10*K),ox=w>>1;
  c={cv:spr(w,h,pb=>{
    const p=(x,y,col)=>pb.p(ox+x,h-1+y,u32(col));
    const blade=(x,len,lean,col)=>{for(let j=0;j<len;j++)p(Math.round(x+lean*j/len),-j,col)};
    if(k==='tuft'||k==='flowers'||k==='daisy'){
      const n=2+Math.floor(r()*3*K);for(let i=0;i<n;i++)blade(Math.round((r()-.5)*4*K),Math.round((2+r()*3)*K),(r()-.5)*2*K,r()<.5?tu:mix(tu,g2,.35));
      if(k!=='tuft'){const m=1+Math.floor(r()*2*K);for(let i=0;i<m;i++){const x=Math.round((r()-.5)*4*K),y=-Math.round((2+r()*3)*K),col=k==='daisy'?hex('#f6f4ec'):fl[Math.floor(r()*fl.length)];p(x,y,col);if(K>1.4){p(x+1,y,col);if(k==='daisy')p(x,y-1,col),p(x+1,y-1,hex('#e8c040'))}}}
    }else if(k==='fern'){
      const n=2+Math.floor(r()*2);for(let i=0;i<n;i++){const L=Math.round((3+r()*3)*K),dir=i%2?1:-1;for(let j=0;j<L;j++){const x=Math.round(dir*j*.8),y=-Math.round(j*.7+Math.sin(j/L*3)*.5);p(x,y,j<L*.5?tu:mix(tu,g0,.3));if(j%2&&K>1)p(x,y-1,mix(tu,g2,.3))}}
    }else if(k==='mush'){
      const red=r()<.5,cap=red?hex('#c8402a'):hex('#9a6a3a'),st=hex('#eee4cc'),cw=Math.max(1,Math.round(1.4*K)),sh=Math.max(1,Math.round(1.5*K));
      for(let j=0;j<sh;j++)p(0,-j,st);for(let x=-cw;x<=cw;x++)p(x,-sh,cap);for(let x=-cw+1;x<cw;x++)p(x,-sh-1,cap);if(red&&K>1.2){p(-1,-sh-1,st);p(1,-sh,st)}
    }else if(k==='leaves'){
      const cols=[hex('#c8702a'),hex('#a84a24'),hex('#d8a03a'),hex('#7a5a30')];for(let i=0;i<5*K;i++)p(Math.round((r()-.5)*7*K),-Math.floor(r()*1.3),cols[Math.floor(r()*4)]);
    }else if(k==='shell'){
      const n=1+Math.floor(r()*2);for(let i=0;i<n;i++){const x=Math.round((r()-.5)*5*K),c=[hex('#f4c8c0'),hex('#fff4e8'),hex('#e8a890')][Math.floor(r()*3)];p(x,0,c);if(K>1.4){p(x+1,0,c);p(x,-1,c)}}
    }else if(k==='ember'){
      const n=1+Math.floor(r()*2);for(let i=0;i<n;i++){const x=Math.round((r()-.5)*4*K);p(x,0,hex('#3a2a28'));p(x,-1,r()<.5?hex('#f07028'):hex('#ffb040'));if(K>1.4)p(x+1,0,hex('#c84a20'))}
    }else if(k==='moss'){
      for(let i=0;i<4*K;i++)p(Math.round((r()-.5)*5*K),-Math.floor(r()*1.5),r()<.5?mix(tu,g0,.4):tu);
    }else if(k==='pebble'){
      const n=1+Math.floor(r()*2.5);for(let i=0;i<n;i++){const x=Math.round((r()-.5)*5*K),s=Math.max(1,Math.round((.6+r())*K));
        for(let yy=0;yy<s;yy++)for(let xx=0;xx<s+1;xx++)p(x+xx,-yy,yy===s-1&&xx<s?P.s[2]:mix(P.s[2],P.s[0],.45))}
    }else if(k==='lav'){
      const n=3+Math.floor(r()*3);for(let i=0;i<n;i++){const x=Math.round((i-n/2)*1.2*K*.8),L=Math.round((3+r()*2)*K);for(let j=0;j<L;j++)p(x+(j>L*.6?(i%2?1:0):0),-j,j<L*.55?hex('#8a9a78'):(j%2?hex('#9a78c8'):hex('#7a5aa8')))}
    }else if(k==='thyme'){
      const R=Math.max(1.5,1.8*K);for(let y=0;y<=R;y++)for(let x=-R*1.4;x<=R*1.4;x++){if(x*x/1.9+y*y>R*R)continue;p(Math.round(x),-Math.round(y),hs2(x*3+v,y)<.15?hex('#d8c8e8'):(y>R*.5?hex('#9aa47a'):hex('#7a8660')))}
    }else if(k==='snowlump'){
      const R=Math.max(1.5,2*K);for(let y=0;y<=R*.7;y++)for(let x=-R;x<=R;x++){if(x*x+y*y*2>R*R)continue;p(Math.round(x),-Math.round(y),x+y<-R*.3?hex('#ffffff'):hex('#d6e0ee'))}
    }
  }),ox,oy:h-1};
  microCache.set(key,c);return c;
}
// avant-plan flou : herbes hautes qui passent devant (zoom proche)
function drawForeground(g,s){
  if(ZOOM<1||GP[leg(s).b].urban)return;
  const k=ZOOM===2?1:.6,fx=s/MPX*1.35,step=6,m=biomeMix(s,80),P=GP[m.t<.5?m.a:m.b];if(!P.tu&&m.b!=='sommet'&&m.a!=='sommet'){}
  const dark=u32(mix(P.g[2],[10,14,20],.45)),mid=u32(mix(P.g[2],[10,14,20],.25));
  for(let wx=Math.floor(fx/step)-2;wx<=Math.floor((fx+W)/step)+2;wx++){
    if(hs(wx*.91)>.22*k)continue;
    const x0=Math.round(wx*step-fx),n=4+Math.floor(hs(wx*1.3)*6),hh=(10+hs(wx*2.1)*16)*k*(H/300);
    g.fillStyle=rgb(mix(P.g[2],[10,14,20],.4));
    for(let i=0;i<n;i++){const bx=x0+Math.round((hs(wx*7+i)-.5)*10),L=Math.round(hh*(.5+hs(wx*3+i)*.6)),lean=(hs(wx*5+i)-.5)*6;
      for(let j=0;j<L;j++)g.fillRect(Math.round(bx+lean*j/L),H-1-j,j<L*.3?2:1,1)}
  }
}

/* ---------- supporters au bord du sentier ---------- */
const supCache=new Map();
const SUP_SHIRT=['#e8483a','#3a8ae0','#f0c030','#3ab86a','#e86ab0','#f08a2a','#8a5ad0','#f4f4f0','#2ab4c4'];
const SUP_SKIN=['#f0c8a0','#e0a880','#b87850','#8a5a3a','#f4d4b8'];
function supSprite(v,f,happy){
  const key=v+'_'+f+'_'+(happy?1:0)+'z'+ZOOM;let c=supCache.get(key);if(c)return c;
  const K=ZOOMS[ZOOM].k,r=rng(v*7919+3),SZ=Math.ceil(16*K)+4,pb=PB(SZ,SZ),ox=Math.round(SZ/2),oy=SZ-1;
  const P=(x,y,col)=>pb.p(ox+Math.round(x),oy+Math.round(y),u32(col));
  const line=(x0,y0,x1,y1,col)=>{const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++)P(lerp(x0,x1,i/n),lerp(y0,y1,i/n),col)};
  const shirt=hex(SUP_SHIRT[Math.floor(r()*SUP_SHIRT.length)]),skin=hex(SUP_SKIN[Math.floor(r()*SUP_SKIN.length)]),pants=hex(['#2c3a52','#4a4a52','#6a5a4a','#2a2a30'][Math.floor(r()*4)]);
  const hair=hex(['#3a2a22','#6a4a2a','#d8b060','#1e1e22','#a85a2a','#c8c8c8'][Math.floor(r()*6)]);
  const prop=r(),jump=happy&&f%2?-Math.round(1.5*K):0,face=r()<.5?1:-1;
  const hip=[0,-Math.round(4*K)+jump],sh=[0,hip[1]-Math.round(3*K)];
  line(hip[0],hip[1],-1*K*.5,jump,pants);line(hip[0],hip[1],1*K*.5,jump,pants);
  line(hip[0],hip[1],sh[0],sh[1],shirt);if(K>1.2)line(hip[0]+1,hip[1],sh[0]+1,sh[1],shirt);
  // bras : levés et qui s'agitent
  const up=f%2,aL=up?[-2*K,sh[1]-2.5*K]:[-2.2*K,sh[1]-1.2*K],aR=up?[2*K,sh[1]-1.4*K]:[2.2*K,sh[1]-2.6*K];
  line(sh[0],sh[1],aL[0],aL[1],skin);line(sh[0]+(K>1.2?1:0),sh[1],aR[0],aR[1],skin);
  for(let j=1;j<=(K>1.2?2:1);j++){P(0,sh[1]-j,skin);P(face>0?1:-1+1,sh[1]-j,skin)}
  P(0,sh[1]-(K>1.2?3:2),hair);P(1,sh[1]-(K>1.2?3:2),hair);
  // accessoire : pancarte, drapeau ou cloche
  if(prop<.3&&K>=1.5){const G3=['011','100','101','101','011'],O3=['111','101','101','101','111'],X1=['1','1','1','0','1'],w=15,h=9,bx=Math.round(aR[0]-w/2),by=Math.round(aR[1]-h-1),ink=hex(['#e8483a','#2a6ad0','#1e1e22'][v%3]);
    line(aR[0],aR[1],aR[0],by+h,hex('#6a5a4a'));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)P(bx+x,by+y,hex('#f8f6f0'));
    [[G3,2],[O3,6],[X1,11]].forEach(([g,gx])=>{for(let r=0;r<5;r++)for(let c=0;c<g[r].length;c++)if(g[r][c]==='1')P(bx+gx+c,by+2+r,ink)})}
  else if(prop<.5){const fc=hex(['#3a6ad0','#e8483a','#f0c030','#3ab86a'][v%4]);line(aR[0],aR[1],aR[0],aR[1]-3*K,hex('#6a5a4a'));for(let y=0;y<Math.round(2*K);y++)for(let x=0;x<=Math.round(2.5*K)-y;x++)P(aR[0]+1+x,aR[1]-3*K+y,fc)}
  else if(prop<.6)P(aL[0],aL[1]+1,hex('#e8c040'));
  const[cv,g]=canvasOf(SZ,SZ);g.putImageData(pb.img,0,0);
  c={cv:outlineCv(cv,'#1c1820',.45),ox:ox+1,oy:oy+1};supCache.set(key,c);return c;
}
// groupes de supporters : au départ, autour des ravitos, et quelques-uns semés en route
function supportersIn(a,b){
  const out=[];
  for(const p of poisIn(a-60,b+60)){
    if(p.k==='depart')out.push({id:'p'+Math.round(p.d),dm:p.d+18,n:7});
    if(p.k==='ravito'){out.push({id:'r'+Math.round(p.d),dm:p.d-26,n:3+Math.floor(hs(p.d)*3)});out.push({id:'s'+Math.round(p.d),dm:p.d+30,n:2+Math.floor(hs(p.d*3)*3)})}
  }
  const C=70;
  for(let c=Math.floor((a-20)/C);c<=Math.ceil((b+20)/C);c++){
    const dm=c*C+hs(c*2.3)*C*.6,bi=leg(dm).b,pr=['ville','vieilleville'].includes(bi)?.18:bi==='prairie'||bi==='plage'?.08:.035;
    if(hs(c*4.7)<pr)out.push({id:'c'+c,dm,n:hs(c*9.1)<.6?1:2});
  }
  return out.filter(g=>g.dm>=a-30&&g.dm<=b+30);
}

/* ---------- grande arche de départ et grands refuges ---------- */
const FONT={D:['110','101','101','101','110'],E:['111','100','110','100','111'],É:['010','111','100','110','111'],P:['110','101','110','100','100'],A:['010','101','111','101','101'],
  R:['110','101','110','101','101'],T:['111','010','010','010','010'],F:['111','100','110','100','100'],U:['101','101','101','101','111'],G:['011','100','101','101','011'],
  S:['011','100','010','001','110'],N:['101','111','111','101','101'],I:['111','010','010','010','111'],L:['100','100','100','100','111'],O:['010','101','101','101','010']};
function pxText(pb,txt,x,y,col,sc=1){let cx=x;for(const ch of txt){const g=FONT[ch];if(g)for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(g[r][c]==='1')pb.r(cx+c*sc,y+r*sc,sc,sc,col);cx+=4*sc}return cx-x-sc}
function bigArch(){
  const K=ZOOMS[ZOOM].k,R=Math.round(30*K),T=Math.max(4,Math.round(5*K)),w=2*R+T*2+4,h=R+T+Math.round(6*K)+4,cx=Math.floor(w/2),by=h-2;
  const cv=spr(w,h,pb=>{
    const red=c32('#d8402e'),redD=c32('#a82a20'),redL=c32('#f06a50'),wh=c32('#f6f2ea'),sh=c32('#c8c0b0'),blue=c32('#2a4ab0'),blueD=c32('#1a3080'),yel=c32('#f2c84a');
    // le boudin gonflable : bandes rouges et blanches, éclairé en haut
    for(let a=-4;a<=184;a+=.5){const t=a*Math.PI/180,seg=Math.floor((a+4)/16)%2;
      for(let k=0;k<T;k++){const rr=R+k,x=cx+Math.cos(t)*rr,y=by-Math.max(0,Math.sin(t))*rr*1.02-(a<0||a>180?0:0);
        const lit=k<T*.35,dark=k>T*.75;pb.p(x,y,seg?(lit?wh:dark?sh:wh):(lit?redL:dark?redD:red))}}
    // pieds lestés
    for(const sx of[cx-R-T,cx+R]){pb.r(sx-1,by-Math.round(3*K),T+2,Math.round(3*K)+2,c32('#5a5a62'));pb.r(sx-1,by-Math.round(3*K),T+2,1,c32('#7a7a84'))}
    // bannière bleue « DÉPART »
    const bw=Math.round(R*1.25),bh=Math.max(9,Math.round(9*K)),bx=cx-Math.round(bw/2),bty=by-Math.round(R*.78);
    pb.r(bx,bty,bw,bh,blue);pb.r(bx,bty+bh-1,bw,1,blueD);pb.r(bx,bty,bw,1,c32('#4a6ad8'));
    const sc=K>1.7?2:1,tw=6*4*sc-sc,tx=cx-Math.floor(tw/2),ty=bty+Math.floor((bh-5*sc)/2);pxText(pb,'DÉPART',tx,ty,wh,sc);
    // cordes de la bannière
    for(let i=0;i<Math.round(R*.25);i++){pb.p(bx-1-i,bty-1-i*.6,sh);pb.p(bx+bw+i,bty-1-i*.6,sh)}
    // petits fanions au sommet
    for(let i=-3;i<=3;i++){const a=(90+i*14)*Math.PI/180,x=cx+Math.cos(a)*(R+T+1),y=by-Math.sin(a)*(R+T+1)*1.02;pb.p(x,y-1,[yel,blue,red][(i+3)%3]);pb.p(x,y-2,[yel,blue,red][(i+3)%3])}
  });
  return{cv:outlineCv(cv,'#2a1c1c',.45),ox:cx+1,oy:h};
}
function bigRefuge(){
  const K=ZOOMS[ZOOM].k,W2=Math.round(46*K),wallH=Math.round(14*K),upH=Math.round(9*K),roofH=Math.round(14*K),ov=Math.round(4*K);
  const w=W2+ov*2+Math.round(14*K),h=wallH+upH+roofH+Math.round(10*K),x0=ov,by=h-1;
  const cv=spr(w,h,pb=>{
    const st1=c32('#a49e94'),st2=c32('#8a847a'),st3=c32('#6e6a62'),wd1=c32('#9a6a40'),wd2=c32('#7a5032'),wd3=c32('#5a3a24'),rf1=c32('#6a6a72'),rf2=c32('#54545c'),rf3=c32('#82828c');
    const win=c32('#f2c860'),winD=c32('#3a4250'),shR=c32('#c8402e'),shW=c32('#f4efe6'),door=c32('#4a3020');
    // rez-de-chaussée en pierre (moellons)
    for(let y=0;y<wallH;y++)for(let x=0;x<W2;x++){const row=Math.floor(y/Math.max(2,Math.round(2.5*K))),off=(row%2)*3,bx=Math.floor((x+off)/Math.max(3,Math.round(4*K)));
      const edge=(y%Math.max(2,Math.round(2.5*K))===0)||((x+off)%Math.max(3,Math.round(4*K))===0);pb.p(x0+x,by-y,edge?st3:hs2(bx,row)<.4?st2:st1)}
    // étage en bois (planches verticales)
    for(let y=0;y<upH;y++)for(let x=0;x<W2;x++)pb.p(x0+x,by-wallH-y,x%3===0?wd3:(hs2(x,1)<.5?wd1:wd2));
    pb.r(x0,by-wallH-upH+1,W2,1,wd3);pb.r(x0,by-wallH,W2,1,wd3);
    // grand toit à deux pans, débord, rangs de lauzes
    for(let j=0;j<roofH;j++){const hw=Math.round((W2/2+ov)*(j+1)/roofH);const y=by-wallH-upH-roofH+j+1;
      for(let i=-hw;i<=hw;i++){const xx=x0+W2/2+i;pb.p(xx,y,j===roofH-1?rf3:(j%2===0&&((i+hw)%3===0))?rf2:(i<0?rf3:rf1))}}
    // cheminée + fumée
    const chx=x0+Math.round(W2*.7);pb.r(chx,by-wallH-upH-roofH+Math.round(roofH*.35),Math.round(3*K),Math.round(roofH*.45),st2);pb.r(chx-1,by-wallH-upH-roofH+Math.round(roofH*.35),Math.round(3*K)+2,1,st3);
    for(let i=0;i<5;i++)pb.p(chx+1+Math.round(Math.sin(i)*1.5)+i,by-wallH-upH-roofH+Math.round(roofH*.3)-2-i*2,c32('#d8dce4'));
    // fenêtres à volets (rouge et blanc) aux deux niveaux
    const ww=Math.max(2,Math.round(3*K)),wh=Math.max(2,Math.round(4*K));
    for(const fx of[.18,.42,.78]){const wx=x0+Math.round(W2*fx);
      for(const wy of[by-Math.round(wallH*.75),by-wallH-Math.round(upH*.85)]){pb.r(wx,wy,ww,wh,win);pb.r(wx,wy,ww,1,winD);
        for(let k=0;k<wh;k++){pb.p(wx-1,wy+k,(k%2)?shW:shR);pb.p(wx+ww,wy+k,(k%2)?shW:shR)}}}
    // porte
    const dx=x0+Math.round(W2*.58),dw=Math.max(3,Math.round(4*K)),dh=Math.round(wallH*.7);pb.r(dx,by-dh+1,dw,dh,door);pb.p(dx+dw-2,by-Math.round(dh/2),win);
    // panneau « REFUGE »
    const sc=K>1.7?2:1,tw=6*4*sc-sc,sx=x0+Math.round(W2/2-tw/2),sy=by-wallH-Math.round(upH*.45)-Math.round(3*sc);pb.r(sx-2,sy-2,tw+4,5*sc+4,wd3);pxText(pb,'REFUGE',sx,sy,shW,sc);
    // drapeau sur un mât
    const mx=x0+W2+ov+Math.round(6*K),mh=Math.round((wallH+upH+roofH*.6));pb.r(mx,by-mh,1,mh,c32('#c8c8cc'));
    const fw=Math.round(7*K),fh=Math.round(4.5*K);for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)pb.p(mx+1+x,by-mh+y,x<fw/3?c32('#2a4ab0'):x<2*fw/3?shW:shR);
    // terrasse : table, banc, parasol
    const tx=x0+W2+Math.round(1*K);pb.r(tx,by-Math.round(3*K),Math.round(5*K),1,wd2);pb.r(tx+1,by-Math.round(3*K)+1,1,Math.round(3*K),wd3);pb.r(tx+Math.round(5*K)-2,by-Math.round(3*K)+1,1,Math.round(3*K),wd3);
  });
  return{cv:outlineCv(cv,'#1e1a1a',.45),ox:Math.round(w*.4),oy:h};
}

/* ---------- grands animaux dessinés à leur vraie taille (pixels nets à chaque zoom) ---------- */
function cropCv(pb){let x0=pb.w,y0=pb.h,x1=-1,y1=-1;for(let y=0;y<pb.h;y++)for(let x=0;x<pb.w;x++)if(pb.b[y*pb.w+x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)return canvasOf(1,1)[0];const[c,g]=canvasOf(x1-x0+1,y1-y0+1);const[t,tg]=canvasOf(pb.w,pb.h);tg.putImageData(pb.img,0,0);g.drawImage(t,-x0,-y0);return c}
// quadrupède vu de profil, tourné vers la droite ; Q = proportions en fractions de la hauteur totale
function quad(Q,H,ph=null){
  H=Math.max(4,Math.round(H));const u=H,R=v=>Math.max(1,Math.round(v*u));
  const pb=PB(Math.round(H*3.4)+12,H+8),gy=H+6,C=k=>c32(Q.c[k]||Q.c.b);
  const bL=R(Q.bL),bH=R(Q.bH),lH=R(Q.lH),lW=Math.max(1,Math.round(u*(Q.lW||.07))),x0=Math.round(H*(Q.tail||.3))+3,yb=gy-lH-bH;
  const P=(x,y,k)=>pb.p(x,y,typeof k==='number'?k:C(k));
  const pat=(x,y,k)=>{ // motifs de pelage
    if(Q.pat==='stripes'&&((x+Math.round(y*.35))%3===0))return 'p';
    if(Q.pat==='spots'){const cx=Math.floor((x+(Math.floor(y/3)%2)*1.5)/3),cy=Math.floor(y/3);if(((x+(Math.floor(y/3)%2)*1.5)%3)>.6&&(y%3)>0&&hs2(cx,cy)<.95)return 'p'}
    if(Q.pat==='rosettes'&&hs2(x,y)<.16)return 'p';
    if(Q.pat==='patches'&&hs2(Math.floor(x/Math.max(2,bH*.6)),Math.floor(y/Math.max(2,bH*.5)))<.35)return 'p';
    return k};
  const line=(xa,ya,xb,yb2,w,k)=>{const n=Math.max(1,Math.ceil(Math.hypot(xb-xa,yb2-ya)));for(let i=0;i<=n;i++){const x=Math.round(lerp(xa,xb,i/n)),y=Math.round(lerp(ya,yb2,i/n));for(let a=0;a<w;a++)P(x+a,y,pat(x+a,y,k))}};
  // pattes : celles du fond plus sombres, avec un léger pas si ph est donné
  const legs=[[x0+bL*.16,1],[x0+bL*.8,0]];
  const leg=(lx,far,off)=>{const sw=ph==null?0:Math.sin(ph+off)*lH*.35,hx=Math.round(lx+(far?1:0)),fx=Math.round(hx+sw);
    for(let w=0;w<lW;w++)line(hx+w,yb+bH-1,fx+w,gy-1,1,far?'d':'b');for(let w=0;w<lW;w++)P(fx+w,gy-1,'k');
    if(Q.sock)for(let w=0;w<lW;w++)for(let j=2;j<Math.max(2,lH*.35);j++)P(fx+w+Math.round(-sw*j/lH),gy-j,'w')};
  for(const[lx,f]of legs)leg(lx,1,f?0:Math.PI);
  // queue
  const tl=R(Q.tail||.3);if(Q.tailUp)line(x0+1,yb+1,x0-Math.round(tl*.6),yb-Math.round(tl*.6),1,'d');else line(x0+1,yb+1,x0-Math.round(tl*.35),yb+Math.round(tl),1,'d');
  if(Q.tuft){P(x0-Math.round(tl*.35),yb+Math.round(tl)+1,'k');P(x0-Math.round(tl*.35)-1,yb+Math.round(tl),'k')}
  // corps aux bouts arrondis, éclairé dessus, plus sombre dessous
  for(let j=0;j<bH;j++){const t=(j-(bH-1)/2)/(bH/2),ins=Math.round((1-Math.sqrt(Math.max(0,1-t*t)))*bH*.55);
    for(let x=x0+ins;x<x0+bL-ins;x++){let k=j===0?'l':j>=bH-Math.max(1,Math.round(bH*.28))?(Q.belly?'w':'d'):'b';P(x,yb+j,pat(x,yb+j,k))}}
  // bosse
  if(Q.hump){const hx=x0+bL*.45,hr=R(Q.hump);for(let j=0;j<hr;j++){const hw=Math.round(Math.sqrt(1-(j/hr)**2)*hr*1.4);for(let x=-hw;x<=hw;x++)P(Math.round(hx+x),yb-j,j===hr-1?'l':'b')}}
  // cou et tête
  const nL=R(Q.nL||0),a=(Q.nA||30)*Math.PI/180,nW=Math.max(1,Math.round(u*(Q.nW||.12)));
  const nx0=x0+bL-Math.round(bL*.12),ny0=yb+Math.round(bH*.3),nx1=nx0+Math.round(Math.cos(a)*nL),ny1=ny0-Math.round(Math.sin(a)*nL);
  if(nL>0)for(let w=0;w<nW;w++)line(nx0-w,ny0+w*.3,nx1-w,ny1+w*.3,1,w===0?'l':'b');
  if(Q.mane&&nL>0)line(nx0-nW,ny0-1,nx1-nW+1,ny1-1,1,'m');
  const hW=R(Q.hW||.3),hH=R(Q.hH||.25),hx=nx1+Math.round(hW*.15),hy=ny1;
  if(Q.lionMane){const mr=Math.round(hH*1.25);for(let y=-mr;y<=mr;y++)for(let x=-mr;x<=Math.round(mr*.6);x++)if(x*x+y*y<=mr*mr)P(hx+x,hy+y+1,hs2(x,y)<.3?'k':'m')}
  for(let y=-Math.floor(hH/2);y<=Math.floor(hH/2);y++)for(let x=-Math.floor(hW/2);x<=Math.ceil(hW/2);x++){if((x*x)/(hW*hW/4+.5)+(y*y)/(hH*hH/4+.5)>1.05)continue;P(hx+x,hy+y,y===-Math.floor(hH/2)?'l':pat(hx+x,hy+y,'b'))}
  const mz=R(Q.muz||.12),my=hy+Math.max(0,Math.floor(hH/4));for(let x=1;x<=mz;x++)for(let y=0;y<Math.max(1,Math.round(hH*.45));y++)P(hx+Math.ceil(hW/2)+x-1,my+y,x===mz&&y===0?'k':(Q.snout?'n':'b'));
  P(hx+Math.round(hW*.15),hy-Math.max(0,Math.round(hH*.15)),'e');
  // oreilles
  const ex=hx-Math.round(hW*.2),ey=hy-Math.ceil(hH/2);P(ex,ey,'b');P(ex,ey-1,Q.earTuft?'k':'b');if(Q.bigEars)for(let y=0;y<R(.18);y++)P(ex-1,ey-y,'b');
  // cornes, bois, ossicones, défenses
  const hd=ey;
  if(Q.horn==='small'){P(ex+1,hd-1,'w');P(ex+2,hd-2,'w')}
  if(Q.horn==='hook'){for(let j=1;j<=R(.12);j++)P(ex+1,hd-j,'k');P(ex,hd-R(.12)-1,'k')}
  if(Q.horn==='ibex'){const L=R(.45);for(let j=0;j<L;j++){const t=j/L;P(Math.round(ex+1-Math.sin(t*1.9)*L*.55),Math.round(hd-Math.cos(t*1.6)*L*.6),j%2?'w':'g')}}
  if(Q.horn==='antlers'){const L=R(Q.antL||.35);for(let j=0;j<L;j++){const x=Math.round(ex+1-j*.35),y=hd-j;P(x,y,'a');if(j>L*.35&&j%Math.max(2,Math.round(L/3))===0){for(let t=1;t<=Math.max(1,Math.round(L*.3));t++)P(x+t,y-t,'a')}}}
  if(Q.horn==='ossi'){P(ex+1,hd-1,'k');P(ex+1,hd-2,'k');P(ex+3,hd-1,'k')}
  if(Q.tusk){P(hx+Math.ceil(hW/2)+1,my+Math.round(hH*.45),'w');P(hx+Math.ceil(hW/2)+2,my+Math.round(hH*.45)-1,'w')}
  if(Q.beard){P(hx+Math.ceil(hW/2)-1,hy+Math.ceil(hH/2)+1,'d');P(hx+Math.ceil(hW/2)-1,hy+Math.ceil(hH/2)+2,'d')}
  if(Q.udder){P(x0+Math.round(bL*.62),yb+bH,'n');P(x0+Math.round(bL*.66),yb+bH,'n')}
  return cropCv(pb);
}
// éléphant : grosse tête, oreille, trompe jusqu'au sol, défense
function elephant(H){
  H=Math.max(8,Math.round(H));const pb=PB(Math.round(H*2.2)+8,H+6),gy=H+5,c={b:c32('#8a8a92'),l:c32('#a8a8b0'),d:c32('#6a6a72'),k:c32('#4a4a52'),w:c32('#f0ece0'),e:c32('#1e1e22'),r:c32('#76767e')};
  const bL=Math.round(H*1.25),bH=Math.round(H*.52),lH=Math.round(H*.4),lW=Math.max(2,Math.round(H*.15)),x0=4,yb=gy-lH-bH;
  for(const[lx,f]of[[x0+bL*.12,1],[x0+bL*.7,1],[x0+bL*.2,0],[x0+bL*.78,0]])for(let w=0;w<lW;w++)for(let y=yb+bH-2;y<gy;y++)pb.p(Math.round(lx)+w+(f?1:0),y,y===gy-1?c.k:f?c.d:(w===0?c.l:c.b));
  for(let j=0;j<bH;j++){const t=(j-(bH-1)/2)/(bH/2),ins=Math.round((1-Math.sqrt(Math.max(0,1-t*t)))*bH*.5);for(let x=x0+ins;x<x0+bL-ins;x++)pb.p(x,yb+j,j<2?c.l:j>bH*.75?c.d:(hs2(x,j)<.08?c.r:c.b))}
  const hr=Math.round(H*.24),hx=x0+bL-Math.round(hr*.3),hy=yb+Math.round(hr*.7);
  for(let y=-hr;y<=hr;y++)for(let x=-hr;x<=hr;x++)if(x*x+y*y<=hr*hr)pb.p(hx+x,hy+y,y<-hr*.6?c.l:c.b);
  const er=Math.round(hr*.85);for(let y=-er;y<=er;y++)for(let x=-er;x<=Math.round(er*.4);x++)if(x*x/1.3+y*y<=er*er)pb.p(hx-Math.round(hr*.35)+x,hy+y+1,x===Math.round(er*.4)||y===er?c.k:c.d);
  for(let j=0;j<Math.round(H*.55);j++){const x=hx+hr-1+Math.round(Math.sin(j/(H*.55)*1.4)*H*.08),y=hy+Math.round(hr*.3)+j;pb.p(x,y,c.b);pb.p(x+1,y,j%3?c.b:c.d)}
  for(let t=0;t<Math.round(H*.18);t++)pb.p(hx+hr-2+t,hy+Math.round(hr*.55)+Math.round(t*.4),c.w);
  pb.p(hx+Math.round(hr*.35),hy-Math.round(hr*.25),c.e);pb.p(x0,yb+3,c.d);pb.p(x0-1,yb+4,c.d);pb.p(x0-1,yb+5,c.k);
  return cropCv(pb);
}
// grand oiseau en vol plané, ailes déployées, rémiges sombres
function bigBird(B,H){
  const span=Math.max(9,Math.round(H*(B.span||2.4))),pb=PB(span+6,Math.round(span*.5)+6),cx=Math.round(pb.w/2),cy=Math.round(pb.h*.45),C=k=>c32(B.c[k]);
  const half=Math.floor(span/2),ww=Math.max(2,Math.round(span*.13));
  for(let s of[-1,1])for(let i=0;i<=half;i++){const t=i/half,w=Math.max(1,Math.round(ww*(1-t*.55))),dy=Math.round(-Math.sin(t*Math.PI*.9)*span*.06+t*t*span*(B.droop||.04));
    for(let j=0;j<w;j++){const fing=t>.78&&j===w-1&&i%2;pb.p(cx+s*i,cy+dy+j,fing?0:t>.72?C('t'):j===0?C('l'):C('w'))}}
  const bl=Math.max(3,Math.round(span*.28));for(let i=-Math.round(bl*.45);i<=Math.round(bl*.55);i++)for(let j=0;j<Math.max(2,Math.round(ww*.9));j++)pb.p(cx+i,cy+j,j===0?C('l'):C('b'));
  const hx=cx+Math.round(bl*.55)+1;pb.p(hx,cy,C('h'));pb.p(hx+1,cy,C('h'));pb.p(hx,cy+1,C('h'));pb.p(hx+2,cy+1,C('k'));if(B.pouch){pb.p(hx+2,cy+2,C('k'));pb.p(hx+3,cy+1,C('k'))}
  for(let i=1;i<=Math.round(bl*.25);i++)pb.p(cx-Math.round(bl*.45)-i,cy+1,C('t'));
  return cropCv(pb);
}
const COMPQ={
  chien:{bL:1.35,bH:.42,lH:.45,lW:.08,nL:.18,nA:35,nW:.2,hW:.32,hH:.26,muz:.16,tail:.55,tailUp:1,belly:1,sock:1,c:{b:'#2a2626',l:'#3e3838',d:'#1e1a1a',k:'#141212',w:'#f0ece4',e:'#0a0808'}},
  chevre:{bL:1,bH:.42,lH:.42,lW:.07,nL:.24,nA:50,nW:.14,hW:.24,hH:.2,muz:.1,tail:.08,tailUp:1,horn:'hook',beard:1,c:{b:'#e8e0d0',l:'#fffaf0',d:'#c8bca8',k:'#3a2a1a',w:'#f4f0e8',e:'#1e1410'}}
};
const BIGQ={
  vache:{bL:1.55,bH:.46,lH:.36,lW:.09,nL:.14,nA:15,nW:.2,hW:.28,hH:.26,muz:.08,snout:1,tail:.45,tuft:1,horn:'small',udder:1,c:{b:'#9a6038',l:'#b8784a',d:'#7a4a2a',k:'#3a2a20',w:'#ece2cc',n:'#e8c4b4',e:'#1e1410'}},
  cerf:{bL:.95,bH:.36,lH:.5,lW:.06,nL:.36,nA:62,nW:.12,hW:.22,hH:.16,muz:.1,tail:.12,horn:'antlers',antL:.42,c:{b:'#8a5a32',l:'#a8784a',d:'#6a4226',k:'#2a1e16',a:'#d8c8a8',e:'#1e1410',m:'#5a3a22'},mane:1},
  chevreuil:{bL:.9,bH:.34,lH:.5,lW:.06,nL:.32,nA:62,nW:.11,hW:.22,hH:.18,muz:.1,tail:.06,horn:'antlers',antL:.16,c:{b:'#a86a3a',l:'#c88a52',d:'#7a4a28',k:'#2a1e16',a:'#c8b898',e:'#1e1410'}},
  chamois:{bL:.95,bH:.4,lH:.45,lW:.07,nL:.26,nA:55,nW:.14,hW:.22,hH:.2,muz:.08,tail:.08,horn:'hook',c:{b:'#6a4a32',l:'#8a6448',d:'#4a3222',k:'#1e1410',w:'#e8dcc8',e:'#1e1410'}},
  bouquetin:{bL:1.05,bH:.45,lH:.38,lW:.08,nL:.2,nA:45,nW:.16,hW:.24,hH:.22,muz:.08,tail:.08,horn:'ibex',beard:1,c:{b:'#8a7a62',l:'#a8987a',d:'#6a5a46',k:'#3a3226',w:'#c8b898',g:'#a89878',e:'#1e1410'}},
  sanglier:{bL:1.45,bH:.55,lH:.3,lW:.1,nL:.04,nA:-5,nW:.3,hW:.36,hH:.36,muz:.16,snout:1,tail:.18,tusk:1,mane:1,c:{b:'#4a3a2e',l:'#6a5444',d:'#33281f',k:'#1e1814',n:'#6a5048',w:'#f0e8d8',m:'#2a201a',e:'#0e0a08'}},
  chevre:{bL:1,bH:.42,lH:.4,lW:.07,nL:.24,nA:50,nW:.14,hW:.24,hH:.2,muz:.1,tail:.08,tailUp:1,horn:'hook',beard:1,c:{b:'#7a4a2a',l:'#9a6238',d:'#5a341c',k:'#2a1a10',w:'#e8dcc8',e:'#1e1410'}},
  dromadaire:{bL:.85,bH:.3,lH:.56,lW:.06,nL:.42,nA:28,nW:.1,hW:.2,hH:.13,muz:.1,tail:.18,hump:.18,c:{b:'#c89a62',l:'#e0b47a',d:'#a87e4a',k:'#6a5034',e:'#2a1e14'}},
  girafe:{bL:.42,bH:.2,lH:.4,lW:.04,nL:.42,nA:72,nW:.06,hW:.12,hH:.07,muz:.05,tail:.14,tuft:1,horn:'ossi',pat:'spots',c:{b:'#e8b860',l:'#f4cc80',d:'#c89848',k:'#5a3a22',p:'#9a5a2a',e:'#2a1e14'}},
  zebre:{bL:1.3,bH:.42,lH:.42,lW:.07,nL:.32,nA:50,nW:.16,hW:.3,hH:.2,muz:.12,tail:.3,tuft:1,mane:1,pat:'stripes',c:{b:'#f4f4ee',l:'#ffffff',d:'#d8d8d0',k:'#1e1e22',p:'#1e1e22',m:'#1e1e22',e:'#0e0e10'}},
  lion:{bL:1.5,bH:.42,lH:.36,lW:.09,nL:.12,nA:20,nW:.2,hW:.34,hH:.3,muz:.12,tail:.55,tuft:1,lionMane:1,c:{b:'#d8a858',l:'#ecc070',d:'#b8883e',k:'#5a3a1e',m:'#8a5a2a',e:'#2a1a0e'}},
  jaguar:{bL:1.8,bH:.46,lH:.34,lW:.1,nL:.08,nA:10,nW:.24,hW:.36,hH:.32,muz:.1,tail:.8,pat:'rosettes',c:{b:'#e0a848',l:'#f0c060',d:'#c08838',k:'#3a2a1a',p:'#3a2618',e:'#1e140a'}},
  lynx:{bL:1.3,bH:.46,lH:.46,lW:.1,nL:.08,nA:15,nW:.24,hW:.36,hH:.32,muz:.08,tail:.12,earTuft:1,pat:'rosettes',c:{b:'#c8a070',l:'#dcb888',d:'#a8845a',k:'#2a2420',p:'#8a6a4a',e:'#1e1814'}},
  coyote:{bL:1.35,bH:.4,lH:.45,lW:.07,nL:.15,nA:30,nW:.2,hW:.3,hH:.22,muz:.18,tail:.55,c:{b:'#a89070',l:'#c8ac88',d:'#887256',k:'#3a3026',e:'#1e1814'}}
};
const BIGB={aigle:{span:2.6,c:{b:'#5a3e28',w:'#6a4a30',l:'#8a6a48',t:'#2a1e14',h:'#c89a48',k:'#e8b840'}},
  gypaete:{span:2.8,c:{b:'#c88a48',w:'#3a3434',l:'#5a5050',t:'#1e1a1a',h:'#f0d8b0',k:'#2a2420'}},
  vautour:{span:2.8,droop:.06,c:{b:'#8a6a4a',w:'#4a3a2a',l:'#6a5440',t:'#1e1814',h:'#e8dcc8',k:'#c8b8a0'}},
  fregate:{span:2.4,c:{b:'#1e1e24',w:'#1e1e24',l:'#3a3a44',t:'#0e0e12',h:'#2a2a30',k:'#d83a2a'}},
  pelican:{span:2.4,pouch:1,c:{b:'#8a7a6a',w:'#9a8a78',l:'#c8b8a4',t:'#3a3430',h:'#e8e0d0',k:'#e8b040'}},
  ara:{span:2,c:{b:'#d8302a',w:'#d8302a',l:'#f0c030',t:'#2a5ad0',h:'#d8302a',k:'#f4f0e8'}}};
