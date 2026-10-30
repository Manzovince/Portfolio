/* Crabes - illustrated tiles. The scenes come from tuiles.html (the tile
   showcase); each one is painted once into a PNG, so the board never has to
   run 61 turbulence filters. CrabesArt.url(key) gives the image or null while
   it is still being painted; CrabesArt.ensure(keys, done) paints what is missing. */
(function(){
"use strict";
var SQ=Math.sqrt(3), HR=92, FLATCLIP=false;
function hexPts(s){var a=[];for(var i=0;i<6;i++){var t=Math.PI/180*(60*i+(FLATCLIP?0:-30));a.push((s*Math.cos(t)).toFixed(2)+","+(s*Math.sin(t)).toFixed(2));}return a.join(" ");}
/* a seeded random, so every reload paints the same tiles */
function rng(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}
function f(n){return (+n).toFixed(1);}

/* ---------- small props ---------- */
function starfish(x,y,r,rot,c,c2){
  var p="";
  for(var i=0;i<10;i++){var a=Math.PI/180*(rot+i*36-90),rr=i%2?r*.42:r;p+=(i?"L":"M")+f(x+Math.cos(a)*rr)+" "+f(y+Math.sin(a)*rr);}
  var dots="";for(var j=0;j<5;j++){var b=Math.PI/180*(rot+j*72-90);for(var k=1;k<4;k++)dots+='<circle cx="'+f(x+Math.cos(b)*r*k*.22)+'" cy="'+f(y+Math.sin(b)*r*k*.22)+'" r="'+f(r*.05)+'"/>';}
  return '<path d="'+p+'Z" fill="'+c+'" stroke="'+c2+'" stroke-width="1.6" stroke-linejoin="round"/>'+
         '<g fill="#FFE1C4" opacity=".85">'+dots+'</g>';
}
function scallop(x,y,s,rot,c,c2){
  var g='<g transform="translate('+x+' '+y+') rotate('+rot+') scale('+s+')">'+
    '<path d="M0 12 L-20 -6 C-16 -18 16 -18 20 -6 Z" fill="'+c+'" stroke="'+c2+'" stroke-width="1.4" stroke-linejoin="round"/>';
  for(var i=-3;i<=3;i++)g+='<path d="M0 12 L'+(i*6)+' -15" stroke="'+c2+'" stroke-width="1" opacity=".7"/>';
  return g+'<path d="M-6 12 h12 l-2 5 h-8 z" fill="'+c2+'"/></g>';
}
function pebbles(R,n,box,cols){
  var s="";for(var i=0;i<n;i++){var x=(R()*2-1)*box,y=(R()*2-1)*box*.9,r=1.2+R()*2.6;
    s+='<ellipse cx="'+f(x)+'" cy="'+f(y)+'" rx="'+f(r*1.3)+'" ry="'+f(r)+'" fill="'+cols[i%cols.length]+'" opacity=".85"/>';}
  return s;
}
function bubbles(R,n,box){
  var s='<g fill="none" stroke="#E9FFFF" stroke-width="1.1" opacity=".65">';
  for(var i=0;i<n;i++){var x=(R()*2-1)*box,y=(R()*2-1)*box,r=1.5+R()*4;
    s+='<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+f(r)+'"/><circle cx="'+f(x-r*.35)+'" cy="'+f(y-r*.35)+'" r="'+f(r*.25)+'" fill="#fff" stroke="none"/>';}
  return s+'</g>';
}
function ripples(R,col,hi){
  var s="";
  for(var y=-92;y<=96;y+=15){
    var ph=R()*20, d="M-110 "+f(y);
    for(var x=-110;x<110;x+=26)d+=" q13 "+f(-5-R()*3)+" 26 0";
    s+='<path d="'+d+'" transform="translate('+f(ph)+' 0)" fill="none" stroke="'+col+'" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>'+
       '<path d="'+d+'" transform="translate('+f(ph)+' -2.2)" fill="none" stroke="'+hi+'" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>';
  }
  return s;
}
function seagrass(x,y,h,lean,c){
  var s="";for(var i=0;i<4;i++){var dx=(i-1.5)*5,l=h*(.7+i%2*.3);
    s+='<path d="M'+(x+dx)+' '+y+' q'+f(lean*.5+dx)+' '+f(-l*.5)+' '+f(lean+dx*1.4)+' '+f(-l)+'" fill="none" stroke="'+c+'" stroke-width="4" stroke-linecap="round"/>';}
  return s;
}

/* ---------- backgrounds ---------- */
/* each tile type sits on its own colour, so it still reads with a crab on top of it */
var PASTEL={sand:"#EFE3C6",pearl:"#F4EFE8",shark:"#25292E",rock:"#CFCDC8",jelly:"#D2BDEF",
  shrimp:"#F8C6A9",current:"#A7D6EE",whirl:"#1D3560",anemone:"#E8D8F2",
  octopus:"#F2B9B4",bottle:"#BFE6D4",wreck:"#CDB79B",sardine:"#C7D5E4",net:"#D5E3B8"};
var BG=null, BGTYPE="";   /* set by svgFor while one scene is painted */
function lum(hex){var n=parseInt(hex.slice(1),16);return (.299*(n>>16)+.587*(n>>8&255)+.114*(n&255))/255;}
function pastelBg(seed){var R=rng(seed),c=BG,dark=lum(c)<.35;
  return '<defs><radialGradient id="pbG" cx=".42" cy=".35" r=".8"><stop offset="0" stop-color="'+shade(c,dark?1.45:1.05)+'"/>'+
      '<stop offset=".7" stop-color="'+c+'"/><stop offset="1" stop-color="'+shade(c,dark?.75:.9)+'"/></radialGradient></defs>'+
    '<rect x="-100" y="-100" width="200" height="200" fill="url(#pbG)"/>'+
    '<g opacity="'+(dark?.5:.6)+'">'+ripples(R,shade(c,dark?1.6:.85),dark?shade(c,2.2):"#FFFFFF")+'</g>'+
    (BGTYPE==="pearl"?'<rect x="-100" y="-100" width="200" height="200" fill="url(#nacreG)" opacity=".45"/>':'')+
    (dark?'':'<rect x="-100" y="-100" width="200" height="200" filter="url(#grain)" opacity=".18"/>');}
function sandBg(seed){if(BG)return pastelBg(seed);var R=rng(seed);
  return '<rect x="-100" y="-100" width="200" height="200" fill="url(#sandG)"/>'+ripples(R,"#C9B482","#FBF4DF")+
    '<rect x="-100" y="-100" width="200" height="200" filter="url(#grain)" opacity=".5"/>';}
function waterBg(grad,seed){
  if(BG)return pastelBg(seed||7);
  return '<rect x="-100" y="-100" width="200" height="200" fill="url(#'+grad+')"/>'+
    '<rect x="-100" y="-100" width="200" height="200" filter="url(#caustic)" opacity=".28" style="mix-blend-mode:screen"/>';}

/* ---------- the scenes ---------- */
var SCENE={};

SCENE.sand=function(){var R=rng(11);
  var tracks="";for(var i=0;i<9;i++){var t=i/8,x=-70+t*120,y=55-Math.sin(t*3)*28-t*30,a=-20-t*40;
    tracks+='<g transform="translate('+f(x)+' '+f(y)+') rotate('+f(a)+')"><path d="M-4 -3 l3 1 M-4 3 l3 -1 M4 -3 l-3 1 M4 3 l-3 -1" stroke="#A8925E" stroke-width="1.6" stroke-linecap="round"/></g>';}
  return sandBg(3)+'<g opacity=".8">'+tracks+'</g>'+
    pebbles(R,14,70,["#B9A57A","#D9C9A2","#A39168","#E8DDC4"])+
    '<ellipse cx="-30" cy="-16" rx="22" ry="9" fill="#000" opacity=".08" filter="url(#blur1)"/>'+
    starfish(-32,-26,22,8,"#EE8550","#B85628")+
    scallop(36,22,1.15,-18,"#F2D3C4","#C49A86")+
    scallop(-48,40,.6,30,"#E9E1D0","#B5A88C")+
    '<path d="M24 -46 c6 -6 14 -4 15 3 c1 7 -8 10 -13 6" fill="none" stroke="#B8A57A" stroke-width="2" stroke-linecap="round"/>';
};

SCENE.pearl=function(){var R=rng(23),ridges="";
  for(var i=-6;i<=6;i++){var a=Math.PI/180*(-90+i*13);
    ridges+='<path d="M0 12 L'+f(Math.cos(a)*56)+' '+f(12+Math.sin(a)*50)+'" stroke="#5B4350" stroke-width="1.3" opacity=".45"/>';}
  var sparks="";[[-34,-34,1],[38,-24,.7],[26,-48,.5],[-44,8,.55]].forEach(function(p,i){
    sparks+='<path class="glint" style="animation-delay:'+(i*.6)+'s" d="M'+p[0]+' '+f(p[1]-9*p[2])+' Q'+p[0]+' '+p[1]+' '+f(p[0]+9*p[2])+' '+p[1]+' Q'+p[0]+' '+p[1]+' '+p[0]+' '+f(p[1]+9*p[2])+' Q'+p[0]+' '+p[1]+' '+f(p[0]-9*p[2])+' '+p[1]+' Q'+p[0]+' '+p[1]+' '+p[0]+' '+f(p[1]-9*p[2])+'Z" fill="#fff"/>';});
  return sandBg(5)+pebbles(R,8,72,["#B9A57A","#E8DDC4"])+
    '<ellipse cx="2" cy="38" rx="58" ry="12" fill="#5A4628" opacity=".25" filter="url(#soft)"/>'+
    /* upper valve, opened: we see its nacre */
    '<path d="M-56 14 C-64 -44 62 -50 56 14 C30 4 -30 4 -56 14 Z" fill="url(#oysterG)"/>'+
    '<path d="M-49 11 C-55 -36 54 -41 49 11 C28 3 -28 3 -49 11 Z" fill="url(#nacreG)"/>'+
    '<g clip-path="url(#hexClip)" opacity=".5">'+ridges.replace(/#5B4350/g,"#B9A6BF")+'</g>'+
    /* lower valve */
    '<path d="M-58 14 C-56 50 56 50 58 14 C40 22 -40 22 -58 14 Z" fill="url(#oysterG)" stroke="#3B2A33" stroke-width="1.4"/>'+
    '<path d="M-50 15 C-30 26 30 26 50 15 C34 19 -34 19 -50 15 Z" fill="url(#nacreG)"/>'+
    '<path d="M-46 30 q46 14 92 0" fill="none" stroke="#A88E9A" stroke-width="1.2" opacity=".6"/>'+
    '<circle cx="0" cy="0" r="40" fill="url(#glowG)"/>'+
    '<ellipse cx="2" cy="20" rx="16" ry="4" fill="#5B4350" opacity=".35"/>'+
    '<circle cx="0" cy="4" r="17" fill="url(#pearlG)"/>'+
    '<path d="M-12 12 a17 17 0 0 0 24 0" fill="none" stroke="#F5C9D9" stroke-width="2" opacity=".55"/>'+
    '<ellipse cx="-6" cy="-3" rx="6" ry="3.6" transform="rotate(-35 -6 -3)" fill="#fff" opacity=".95"/>'+
    sparks;
};

SCENE.shark=function(){var R=rng(31);
  var body="M-66 2 C-58 -11 -38 -20 -10 -22 L-2 -52 C4 -38 9 -27 16 -22 C36 -20 50 -14 58 -8 L80 -36 C75 -17 73 -6 75 2 L86 24 C70 15 62 10 55 7 C40 15 20 19 0 19 L-8 36 C-11 27 -14 22 -20 19 C-40 19 -56 14 -66 2 Z";
  var teeth="";for(var i=0;i<6;i++){var x=-60+i*3.4;teeth+='<path d="M'+f(x)+' '+f(6.5+i*.5)+' l1.6 3.4 l1.6 -3.2" fill="#fff" stroke="none"/>';}
  var fish="";[[-50,-56,1],[-36,-66,.8],[-60,-44,.7],[52,48,.8],[64,40,.6]].forEach(function(p){
    fish+='<g transform="translate('+p[0]+' '+p[1]+') scale('+p[2]+')"><path d="M-6 0 C-2 -4 4 -4 6 0 C4 4 -2 4 -6 0 Z M6 0 L11 -4 L11 4 Z" fill="#CDEFF0" opacity=".7"/></g>';});
  return waterBg("darkWaterG")+
    '<g opacity=".25"><path d="M-110 -70 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#BDF2F2" stroke-width="2"/></g>'+
    fish+bubbles(R,7,70)+
    '<g transform="translate(-6 6) scale(.86) rotate(-6)">'+
      '<path d="'+body+'" fill="#000" opacity=".3" transform="translate(4 10)" filter="url(#soft)"/>'+
      '<path d="'+body+'" fill="url(#sharkG)" stroke="#1E2F37" stroke-width="1.8" stroke-linejoin="round"/>'+
      '<path d="M-64 4 C-50 14 -30 18 0 17 C20 17 40 13 54 7 C38 11 10 12 -10 10 C-30 9 -50 8 -64 4 Z" fill="#E2EBEA"/>'+
      '<path d="M-6 -21 C10 -18 32 -14 52 -8" fill="none" stroke="#9FB8C1" stroke-width="1.4" opacity=".7"/>'+
      '<path d="M-30 -8 q-2 6 0 12 M-25 -9 q-2 6 0 12 M-20 -9 q-2 6 0 12" fill="none" stroke="#1E2F37" stroke-width="1.3" stroke-linecap="round"/>'+
      '<circle cx="-46" cy="-5" r="2.8" fill="#0B1418"/><circle cx="-46.8" cy="-5.8" r=".9" fill="#fff"/>'+
      '<path d="M-64 6 C-56 9 -48 11 -40 10" fill="none" stroke="#1E2F37" stroke-width="1.6" stroke-linecap="round"/>'+teeth+
    '</g>';
};

SCENE.rock=function(){var R=rng(41);
  var barn="";for(var i=0;i<11;i++){var x=-40+R()*80,y=-30+R()*44,r=1.6+R()*1.8;
    barn+='<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+f(r)+'" fill="#E7E1CF" stroke="#8A8472" stroke-width=".6"/><circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+f(r*.35)+'" fill="#6B6556"/>';}
  return sandBg(9)+
    '<ellipse cx="0" cy="8" rx="78" ry="64" fill="url(#wetG)"/>'+
    '<path d="M-66 30 C-74 0 -50 -50 0 -54 C50 -58 76 -10 68 26 C62 52 -56 58 -66 30 Z" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 7 10 5" stroke-linecap="round" opacity=".75"/>'+
    '<ellipse cx="4" cy="40" rx="60" ry="12" fill="#2E2A22" opacity=".35" filter="url(#soft)"/>'+
    /* back boulder */
    '<path d="M2 -40 L30 -50 L56 -30 L58 6 L28 18 L4 0 Z" fill="url(#rockG)" stroke="#3E3B33" stroke-width="1.6" stroke-linejoin="round"/>'+
    '<path d="M2 -40 L30 -50 L40 -26 L14 -20 Z" fill="#C6C0B0" opacity=".55"/>'+
    /* main boulder */
    '<path d="M-58 34 L-60 2 L-40 -32 L-12 -42 L14 -24 L22 8 L10 38 L-24 46 Z" fill="url(#rockG)" stroke="#3E3B33" stroke-width="1.8" stroke-linejoin="round"/>'+
    '<path d="M-60 2 L-40 -32 L-12 -42 L-20 -10 L-46 4 Z" fill="#D2CCBC" opacity=".55"/>'+
    '<path d="M-20 -10 L14 -24 M-20 -10 L-24 46 M-46 4 L-58 34" fill="none" stroke="#3E3B33" stroke-width="1.1" opacity=".7"/>'+
    /* pebble boulder front right */
    '<path d="M18 40 L22 18 L44 10 L62 24 L56 46 L34 52 Z" fill="url(#rockG)" stroke="#3E3B33" stroke-width="1.6" stroke-linejoin="round"/>'+
    '<path d="M22 18 L44 10 L48 22 L28 28 Z" fill="#D2CCBC" opacity=".5"/>'+
    barn+
    '<path d="M-58 30 q8 -10 4 -22 M-52 34 q10 -6 10 -18 M30 50 q4 -8 0 -14" fill="none" stroke="#4F8A4E" stroke-width="3" stroke-linecap="round"/>'+
    '<path d="M-8 44 q-6 -6 -2 -12 q6 4 2 12" fill="#6FA65C"/>';
};

SCENE.jelly=function(){var R=rng(53),tent="";
  for(var i=0;i<9;i++){var x0=-30+i*7.5,d="M"+f(x0)+" -2",amp=3+R()*3,ph=R()*6;
    for(var y=0;y<80;y+=4)d+=" L"+f(x0+Math.sin(y/9+ph)*amp*(y/40+.4))+" "+f(y);
    tent+='<path d="'+d+'" fill="none" stroke="#FFB5DB" stroke-width="'+f(1.2+R()*.8)+'" stroke-linecap="round" opacity="'+f(.45+R()*.4)+'"/>';}
  var arms="";for(var j=0;j<3;j++){var x=-10+j*10,d2="M"+x+" 0";for(var y2=0;y2<60;y2+=3)d2+=" L"+f(x+Math.sin(y2/6+j*2)*(3+y2/14))+" "+y2;
    arms+='<path d="'+d2+'" fill="none" stroke="#F06BB0" stroke-width="'+(5-j%2*1.5)+'" stroke-linecap="round" opacity=".8"/>';}
  var bolts="";[[-48,10,-20],[50,-6,25],[44,44,10]].forEach(function(b){
    bolts+='<path transform="translate('+b[0]+' '+b[1]+') rotate('+b[2]+')" d="M-2 -10 L4 -2 L-1 0 L3 10 L-5 0 L0 -2 Z" fill="#FFE45C" stroke="#9C7A00" stroke-width=".8" stroke-linejoin="round"/>';});
  var bell="M-40 -6 C-40 -60 40 -60 40 -6 C33 -1 27 -7 20 -2 C13 3 7 -3 0 1 C-7 -3 -13 3 -20 -2 C-27 -7 -33 -1 -40 -6 Z";
  return waterBg("jellyWaterG")+bubbles(R,9,72)+
    '<g class="bob" transform="translate(0 -6)">'+
    '<path d="'+bell+'" fill="#FF8CC8" opacity=".55" filter="url(#soft)"/>'+
    tent+arms+
    '<path d="'+bell+'" fill="url(#bellG)" stroke="#FFD6EC" stroke-width="1.4"/>'+
    '<g fill="#E8519B" opacity=".55"><ellipse cx="-12" cy="-22" rx="7" ry="10" transform="rotate(-30 -12 -22)"/><ellipse cx="12" cy="-22" rx="7" ry="10" transform="rotate(30 12 -22)"/>'+
      '<ellipse cx="-4" cy="-34" rx="6" ry="8"/><ellipse cx="6" cy="-34" rx="6" ry="8" opacity=".7"/></g>'+
    '<path d="M-28 -28 C-24 -44 -8 -52 6 -50" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>'+
    '<g fill="#fff" opacity=".7"><circle cx="18" cy="-40" r="1.6"/><circle cx="26" cy="-30" r="1.2"/><circle cx="-20" cy="-16" r="1.1"/></g>'+
    '</g>'+bolts;
};

SCENE.shrimp=function(){var R=rng(61);
  /* body: overlapping segments laid on an arc, tail first so the head sits on top */
  var cx=4,cy=6,rad=30,seg="",legs="",n=7;
  for(var i=0;i<n;i++){var t=i/(n-1),a=Math.PI/180*(200-t*190),w=7+t*6,
      x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad*.95,ang=a*180/Math.PI+90;
    legs+='<path d="M'+f(cx+Math.cos(a)*(rad-w))+' '+f(cy+Math.sin(a)*(rad-w))+' l'+f(-Math.cos(a)*9+3)+' '+f(-Math.sin(a)*9+3)+'" stroke="#C9531F" stroke-width="1.6" stroke-linecap="round"/>';
    seg='<g transform="translate('+f(x)+' '+f(y)+') rotate('+f(ang)+')"><ellipse rx="'+f(w*1.15)+'" ry="'+f(w)+'" fill="url(#shrimpG)" stroke="#A9441A" stroke-width="1.2"/>'+
        '<path d="M'+f(-w*.8)+' '+f(-w*.3)+' q'+f(w*.8)+' '+f(-w*.6)+' '+f(w*1.6)+' 0" fill="none" stroke="#FFE2C8" stroke-width="1.3" opacity=".8"/></g>'+seg;}
  /* the loop above paints head-last in string order; reverse paint by prepending */
  var ha=Math.PI/180*10, hx=cx+Math.cos(ha)*rad, hy=cy+Math.sin(ha)*rad*.95;
  var head='<g transform="translate('+f(hx+2)+' '+f(hy-4)+') rotate(-70)">'+
    '<path d="M-14 -10 C-4 -18 14 -14 18 -2 C20 8 8 14 -6 12 C-14 10 -18 0 -14 -10 Z" fill="url(#shrimpG)" stroke="#A9441A" stroke-width="1.4"/>'+
    '<path d="M18 -2 L34 -10 L20 2 Z" fill="#E86E36" stroke="#A9441A" stroke-width="1"/>'+
    '<path d="M-8 -8 q10 -6 20 0" fill="none" stroke="#FFE2C8" stroke-width="1.4" opacity=".8"/>'+
    '<circle cx="10" cy="-10" r="3.4" fill="#141414"/><circle cx="9" cy="-11" r="1" fill="#fff"/></g>';
  var ta=Math.PI/180*200, tx=cx+Math.cos(ta)*rad, ty=cy+Math.sin(ta)*rad*.95;
  var tail='<g transform="translate('+f(tx-2)+' '+f(ty+6)+') rotate(150)">'+
    '<path d="M0 0 C-6 8 -14 12 -18 10 C-14 4 -6 0 0 0 Z M0 0 C-4 10 -6 18 -2 22 C2 16 2 8 0 0 Z M0 0 C6 8 12 14 16 12 C12 6 6 2 0 0 Z" fill="#F7864A" stroke="#A9441A" stroke-width="1.1" stroke-linejoin="round"/></g>';
  var ant='<path d="M'+f(hx+8)+' '+f(hy-16)+' C40 -60 -10 -70 -60 -58 M'+f(hx+6)+' '+f(hy-14)+' C30 -50 -20 -50 -64 -36" fill="none" stroke="#C9531F" stroke-width="1.3" stroke-linecap="round"/>';
  var mini='<g transform="translate(-50 46) scale(.35) rotate(20)" opacity=".85"><path d="M-30 0 C-20 -24 20 -24 30 0" fill="none" stroke="#F7864A" stroke-width="14" stroke-linecap="round"/><circle cx="26" cy="-6" r="4" fill="#141414"/></g>';
  return sandBg(13)+seagrass(-58,70,60,-14,"#5E9A55")+seagrass(56,64,48,18,"#76AE62")+
    pebbles(R,9,70,["#B9A57A","#E8DDC4"])+
    '<ellipse cx="6" cy="44" rx="40" ry="8" fill="#5A4628" opacity=".25" filter="url(#soft)"/>'+
    ant+legs+tail+seg+head+mini;
};

SCENE.current=function(){var R=rng(71),lines="";
  for(var i=0;i<11;i++){var y=-80+i*16,amp=3+R()*4,d="M-110 "+y;
    for(var x=-110;x<=110;x+=8)d+=" L"+x+" "+f(y+Math.sin(x/16+i)*amp);
    lines+='<path class="flow" style="animation-duration:'+f(1.8+R()*1.4)+'s" d="'+d+'" fill="none" stroke="#DFFBF8" stroke-width="'+f(1+R()*1.4)+'" stroke-dasharray="'+f(14+R()*20)+' '+f(10+R()*14)+'" stroke-linecap="round" opacity="'+f(.25+R()*.35)+'"/>';}
  var leaf='<g transform="translate(-52 -40) rotate(18)"><path d="M-10 0 C-4 -7 6 -7 12 0 C6 7 -4 7 -10 0 Z" fill="#7AB86A" stroke="#3F7A3E" stroke-width="1"/><path d="M-10 0 H12" stroke="#3F7A3E" stroke-width=".8"/></g>';
  return waterBg("waterG")+lines+bubbles(R,6,70)+leaf+
    '<g transform="translate(4 4)">'+
      '<path d="M-62 -14 H8 V-34 L60 0 L8 34 V14 H-62 Z" fill="#073846" opacity=".4" transform="translate(3 6)" filter="url(#soft)"/>'+
      '<path d="M-62 -14 H8 V-34 L60 0 L8 34 V14 H-62 Z" fill="url(#arrowG)" stroke="#0E5664" stroke-width="2" stroke-linejoin="round"/>'+
      '<path d="M-40 -6 H16 M-30 6 H12" stroke="#7FD3D6" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>'+
    '</g>';
};

SCENE.whirl=function(){var R=rng(83),arms="",foam="";
  for(var k=0;k<5;k++){var d="",base=k*Math.PI*2/5;
    for(var th=0;th<=11;th+=.15){var r=3*Math.exp(.3*th),a=base+th;if(r>110)break;
      d+=(d?" L":"M")+f(Math.cos(a)*r)+" "+f(Math.sin(a)*r);}
    arms+='<path d="'+d+'" fill="none" stroke="#E6FFFD" stroke-width="'+f(2+k%2)+'" stroke-linecap="round" opacity=".55"/>';
    arms+='<path d="'+d+'" fill="none" stroke="#7FD9DC" stroke-width="7" stroke-linecap="round" opacity=".18"/>';}
  for(var i=0;i<40;i++){var th2=R()*10+2,r2=3*Math.exp(.3*th2),a2=Math.floor(R()*5)*Math.PI*2/5+th2+.2;if(r2>95)continue;
    foam+='<circle cx="'+f(Math.cos(a2)*r2)+'" cy="'+f(Math.sin(a2)*r2)+'" r="'+f(.8+r2/50)+'" fill="#fff" opacity=".6"/>';}
  return (BG?pastelBg(83)+'<circle r="70" fill="url(#whirlG)" opacity=".55"/>':'<rect x="-100" y="-100" width="200" height="200" fill="url(#whirlG)"/>')+
    '<rect x="-100" y="-100" width="200" height="200" filter="url(#caustic)" opacity=".18" style="mix-blend-mode:screen"/>'+
    '<g class="spin">'+arms+foam+
      '<g transform="translate(46 -30) rotate(40)"><path d="M-8 0 C-3 -5 4 -5 9 0 C4 5 -3 5 -8 0 Z" fill="#7AB86A" stroke="#3F7A3E" stroke-width=".8"/></g>'+
      '<g transform="translate(-30 52)"><ellipse rx="6" ry="2.6" fill="#C9A06A" transform="rotate(30)"/></g>'+
    '</g>'+
    '<circle r="10" fill="#01070A" opacity=".85" filter="url(#blur1)"/>';
};

SCENE.anemone=function(c,c2){var R=rng(97),back="",front="";
  for(var i=0;i<26;i++){var a=Math.PI/180*(-170+i*(160/25)),l=34+R()*14,w=5.5,
      x1=Math.cos(a)*l*1.05,y1=6+Math.sin(a)*l,mx=Math.cos(a)*l*.5+(R()*8-4),my=6+Math.sin(a)*l*.55;
    var tp='<path d="M0 10 Q'+f(mx)+' '+f(my)+' '+f(x1)+' '+f(y1)+'" fill="none" stroke-width="'+w+'" stroke-linecap="round"/>';
    if(i%2){back+=tp.replace('fill="none"','fill="none" stroke="'+c2+'"');}
    else front+=tp.replace('fill="none"','fill="none" stroke="'+c+'"')+'<circle cx="'+f(x1)+'" cy="'+f(y1)+'" r="3.4" fill="#fff" opacity=".7"/>';}
  var eggs="";for(var j=0;j<9;j++){var ex=-34+j*4+R()*6,ey=36+R()*8;
    eggs+='<circle cx="'+f(ex)+'" cy="'+f(ey)+'" r="3.2" fill="#FFD3A0" stroke="#D08A48" stroke-width=".7" opacity=".95"/><circle cx="'+f(ex-1)+'" cy="'+f(ey-1)+'" r=".9" fill="#fff"/>';}
  var clown='<g transform="translate(46 -40) rotate(-12)">'+
    '<path d="M-16 0 C-10 -10 8 -10 14 0 C8 10 -10 10 -16 0 Z" fill="#FF8A2A" stroke="#1B1B1B" stroke-width="1.4"/>'+
    '<path d="M14 0 L24 -7 Q22 0 24 7 Z" fill="#FF8A2A" stroke="#1B1B1B" stroke-width="1.2" stroke-linejoin="round"/>'+
    '<path d="M-7 -7 q-3 7 0 14 M5 -7.5 q3 7.5 0 15" fill="none" stroke="#fff" stroke-width="3.6"/>'+
    '<path d="M-7 -7 q-3 7 0 14 M5 -7.5 q3 7.5 0 15" fill="none" stroke="#1B1B1B" stroke-width=".8" opacity=".6"/>'+
    '<circle cx="-11" cy="-2" r="1.8" fill="#111"/></g>';
  return sandBg(17)+
    '<ellipse cx="0" cy="30" rx="62" ry="22" fill="#000" opacity=".2" filter="url(#soft)"/>'+
    '<path d="M-60 40 C-62 20 -36 10 -10 14 C20 6 58 14 62 40 C50 58 -48 58 -60 40 Z" fill="url(#rockG)" stroke="#3E3B33" stroke-width="1.4"/>'+
    '<g opacity=".95">'+back+'</g>'+
    '<path d="M-14 26 C-16 8 16 8 14 26 Z" fill="#8C4A3C" stroke="#5A2C22" stroke-width="1.2"/>'+
    front+eggs+clown+bubbles(R,4,60);
};

SCENE.port=function(c){var R=rng(101),planks="";
  for(var i=0;i<7;i++){var y=-42+i*12.4;
    planks+='<rect x="-50" y="'+f(y)+'" width="100" height="11" rx="1.5" fill="url(#woodG)" stroke="#5D3D1E" stroke-width="1"/>'+
      '<path d="M-44 '+f(y+4+R()*3)+' q24 '+f(R()*3-1.5)+' 50 0 t36 0" fill="none" stroke="#6E4A26" stroke-width=".8" opacity=".6"/>'+
      '<circle cx="-44" cy="'+f(y+5.5)+'" r="1.1" fill="#3B2612"/><circle cx="44" cy="'+f(y+5.5)+'" r="1.1" fill="#3B2612"/>';}
  var post=function(x,y){return '<circle cx="'+x+'" cy="'+y+'" r="8.5" fill="#6B4724" stroke="#3B2612" stroke-width="1.4"/><circle cx="'+x+'" cy="'+y+'" r="5" fill="none" stroke="#8C6136" stroke-width="1"/>'+
    '<circle cx="'+x+'" cy="'+y+'" r="10" fill="none" stroke="#E5D2A2" stroke-width="2.4" stroke-dasharray="3 1.6"/>';};
  return waterBg("waterG")+
    '<g opacity=".35" fill="none" stroke="#D8FAF6" stroke-width="1.6" stroke-linecap="round"><path d="M-80 66 q8 -4 16 0 t16 0"/><path d="M40 70 q8 -4 16 0 t16 0"/><path d="M-70 -66 q8 -4 16 0"/></g>'+
    '<rect x="-52" y="-40" width="104" height="90" fill="#000" opacity=".35" filter="url(#soft)" transform="translate(4 8)"/>'+
    planks+post(-52,-44)+post(52,-44)+post(-52,46)+post(52,46)+
    '<path d="M-52 46 C-30 62 -10 64 0 58" fill="none" stroke="#E5D2A2" stroke-width="2.4" stroke-linecap="round"/>'+
    /* pennant in the owner's colour */
    '<path d="M30 30 V-74" stroke="#3B2612" stroke-width="3" stroke-linecap="round"/>'+
    '<path d="M31 -72 L66 -62 L31 -50 Z" fill="'+c+'" stroke="#1E1209" stroke-width="1.3" stroke-linejoin="round"/>'+
    '<path d="M31 -66 L52 -61" stroke="#fff" stroke-width="1.6" opacity=".5"/>'+
    /* anchor */
    '<g transform="translate(-10 4)" fill="none" stroke="#2A2F33" stroke-width="4" stroke-linecap="round">'+
      '<circle cx="0" cy="-24" r="5"/><path d="M0 -19 V20 M-12 -10 H12 M-22 6 C-20 18 -10 22 0 22 C10 22 20 18 22 6"/>'+
      '<path d="M-22 6 l-4 5 M-22 6 l5 2 M22 6 l4 5 M22 6 l-5 2" stroke-width="3"/></g>'+
    '<g transform="translate(-10 4)" fill="none" stroke="#7E8A90" stroke-width="1.3" stroke-linecap="round" opacity=".8"><path d="M-2 -17 V18 M-10 -11 H9"/></g>'+
    /* lifebuoy */
    '<g transform="translate(-66 22)"><circle r="12" fill="none" stroke="#fff" stroke-width="7"/>'+
      '<circle r="12" fill="none" stroke="#E2453C" stroke-width="7" stroke-dasharray="9.4 9.4"/>'+
      '<circle r="15.5" fill="none" stroke="#7A2A22" stroke-width=".8" opacity=".6"/></g>';
};

/* ---------- tiles added after the showcase ---------- */
SCENE.octopus=function(){var R=rng(601),arms="",suck="";
  for(var i=0;i<8;i++){var a=Math.PI/180*(200+i*(140/7)), sx=Math.cos(a), sy=Math.sin(a),
      x0=sx*14, y0=8+sy*4, x1=sx*58, y1=26+Math.abs(sy)*30+R()*10, cx=x1+(i<4?-1:1)*18, cy=y1+16;
    var d="M"+f(x0)+" "+f(y0)+" Q"+f(sx*40)+" "+f(y0+30)+" "+f(x1)+" "+f(y1)+" q"+f((i<4?-1:1)*14)+" 14 "+f((i<4?-1:1)*4)+" 22";
    arms+='<path d="'+d+'" fill="none" stroke="#9E2F45" stroke-width="13" stroke-linecap="round"/><path d="'+d+'" fill="none" stroke="#E0607A" stroke-width="9" stroke-linecap="round"/>';
    for(var k=1;k<4;k++)suck+='<circle cx="'+f(x0+(x1-x0)*k/4)+'" cy="'+f(y0+(y1-y0)*k/4+8)+'" r="2.2" fill="#FBD3DB" stroke="#B9475E" stroke-width=".7"/>';}
  return waterBg("waterG",61)+bubbles(R,5,70)+
    '<ellipse cx="0" cy="44" rx="56" ry="12" fill="#000" opacity=".18" filter="url(#soft)"/>'+arms+suck+
    '<path d="M-34 6 C-40 -40 -20 -66 0 -66 C20 -66 40 -40 34 6 C24 18 -24 18 -34 6 Z" fill="#E0607A" stroke="#9E2F45" stroke-width="2.4"/>'+
    '<path d="M-22 -40 C-16 -56 4 -60 14 -52" fill="none" stroke="#FFC2CE" stroke-width="4" stroke-linecap="round" opacity=".8"/>'+
    '<g fill="#C24760" opacity=".6"><circle cx="-14" cy="-30" r="3"/><circle cx="12" cy="-38" r="2.4"/><circle cx="18" cy="-20" r="2"/></g>'+
    '<ellipse cx="-12" cy="-6" rx="8" ry="9" fill="#fff" stroke="#9E2F45" stroke-width="1.6"/><ellipse cx="12" cy="-6" rx="8" ry="9" fill="#fff" stroke="#9E2F45" stroke-width="1.6"/>'+
    '<rect x="-16" y="-7" width="8" height="4" rx="2" fill="#1A1210"/><rect x="8" y="-7" width="8" height="4" rx="2" fill="#1A1210"/>';
};
SCENE.bottle=function(){var R=rng(613);
  var glass="M-58 -6 C-58 -18 -48 -24 -36 -24 L22 -24 C30 -24 36 -20 42 -14 L52 -12 L52 12 L42 14 C36 20 30 24 22 24 L-36 24 C-48 24 -58 18 -58 6 Z";
  return sandBg(19)+pebbles(R,8,70,["#B9A57A","#E8DDC4"])+
    '<g transform="rotate(-24)">'+
    '<ellipse cx="0" cy="34" rx="64" ry="10" fill="#4C3A18" opacity=".25" filter="url(#soft)"/>'+
    '<path d="'+glass+'" fill="#6FC3A2" opacity=".55" stroke="#2F7A5C" stroke-width="2.2"/>'+
    '<g transform="translate(-14 0)"><rect x="-30" y="-13" width="56" height="26" rx="13" fill="#F6EDD4" stroke="#B9A57A" stroke-width="1.4"/>'+
      '<path d="M-22 -4 H16 M-22 3 H8" stroke="#8A7650" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>'+
      '<path d="M-4 -13 V13" stroke="#D9443A" stroke-width="4"/></g>'+
    '<path d="M-50 -14 C-40 -20 0 -20 30 -18" fill="none" stroke="#EFFFF8" stroke-width="4" stroke-linecap="round" opacity=".8"/>'+
    '<rect x="52" y="-9" width="16" height="18" rx="3" fill="#B0814F" stroke="#5D3D1E" stroke-width="1.6"/>'+
    '</g>';
};
SCENE.wreck=function(){var R=rng(631),coins="";
  for(var i=0;i<9;i++){var x=-30+R()*60,y=26+R()*16;coins+='<ellipse cx="'+f(x)+'" cy="'+f(y)+'" rx="5" ry="3.4" fill="#F2C14E" stroke="#8A6214" stroke-width="1"/>';}
  return waterBg("waterG",63)+
    '<g opacity=".55"><path d="M-80 -30 L-20 -60 L-14 -50 L-74 -18 Z" fill="#7A5634"/><path d="M40 -70 L80 -40 L72 -32 L34 -62 Z" fill="#6B4A2C"/></g>'+
    '<ellipse cx="0" cy="46" rx="58" ry="12" fill="#000" opacity=".22" filter="url(#soft)"/>'+
    '<circle cx="0" cy="-2" r="40" fill="url(#glowG)" opacity=".8"/>'+
    '<path d="M-44 -6 L44 -6 L40 40 L-40 40 Z" fill="#9C6B3C" stroke="#4A2E14" stroke-width="2.2" stroke-linejoin="round"/>'+
    '<path d="M-44 8 H44 M-42 24 H42" stroke="#5A3A1C" stroke-width="1.6"/>'+
    '<path d="M-46 -6 C-44 -40 44 -40 46 -6 L40 -14 C36 -30 -36 -30 -40 -14 Z" fill="#B47E48" stroke="#4A2E14" stroke-width="2.2" transform="rotate(-14 -46 -6)"/>'+
    '<path d="M-30 -8 Q0 -26 30 -8" fill="#F2C14E" stroke="#8A6214" stroke-width="1.4"/>'+
    '<circle cx="0" cy="-12" r="7" fill="url(#pearlG)"/>'+
    '<rect x="-7" y="2" width="14" height="14" rx="2" fill="#F2C14E" stroke="#7A5512" stroke-width="1.4"/><circle cx="0" cy="8" r="2" fill="#4A2E14"/>'+
    coins+bubbles(R,5,70);
};
SCENE.sardine=function(){var R=rng(641),fish="";
  var one=function(x,y,s,a){return '<g transform="translate('+f(x)+' '+f(y)+') rotate('+f(a)+') scale('+f(s)+')">'+
    '<path d="M-16 0 C-8 -7 8 -7 14 0 C8 7 -8 7 -16 0 Z" fill="#A9BED2" stroke="#4E6478" stroke-width="1.2"/>'+
    '<path d="M-12 -1 C-4 -4 6 -4 12 -1" fill="none" stroke="#3D5A78" stroke-width="2.2" opacity=".55"/>'+
    '<path d="M-10 2 C-2 4 6 4 10 2" fill="none" stroke="#fff" stroke-width="1.4" opacity=".7"/>'+
    '<path d="M14 0 L22 -6 L20 0 L22 6 Z" fill="#8FA6BC" stroke="#4E6478" stroke-width="1"/>'+
    '<circle cx="-10" cy="-1" r="1.6" fill="#1A1A1A"/></g>';};
  var pts=[];for(var i=0;i<16;i++){var a=i*2.4, r=10+i*3.6;pts.push([Math.cos(a)*r*.95,Math.sin(a)*r*.7]);}
  pts.sort(function(a,b){return a[1]-b[1];}).forEach(function(p){fish+=one(p[0],p[1],.95+R()*.35,-12+R()*10);});
  return waterBg("waterG",64)+bubbles(R,6,72)+'<g opacity=".95">'+fish+'</g>';
};
SCENE.net=function(){var R=rng(653),mesh="",knots="";
  for(var i=-6;i<=6;i++){var x=i*18;
    mesh+='<path d="M'+(x-90)+' -100 Q'+(x-40)+' 0 '+(x+20)+' 100" fill="none" stroke="#7A6A3A" stroke-width="2.6"/>'+
          '<path d="M'+(x+90)+' -100 Q'+(x+40)+' 0 '+(x-20)+' 100" fill="none" stroke="#8E7E4A" stroke-width="2.6"/>';}
  for(var k=0;k<24;k++)knots+='<circle cx="'+f((R()*2-1)*80)+'" cy="'+f((R()*2-1)*80)+'" r="2.2" fill="#5E4F28"/>';
  var buoy=function(x,y){return '<g transform="translate('+x+' '+y+')"><ellipse rx="13" ry="10" fill="#E2453C" stroke="#7A2A22" stroke-width="1.8"/>'+
    '<path d="M-13 0 H13" stroke="#fff" stroke-width="4"/><ellipse cx="-4" cy="-4" rx="4" ry="2.4" fill="#fff" opacity=".6"/></g>';};
  return sandBg(23)+'<g opacity=".9">'+mesh+'</g>'+knots+
    '<path d="M-70 -50 C-30 -70 30 -64 70 -44" fill="none" stroke="#B89A5A" stroke-width="6" stroke-linecap="round"/>'+
    '<path d="M-70 -50 C-30 -70 30 -64 70 -44" fill="none" stroke="#E2CB8E" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5"/>'+
    buoy(-44,-58)+buoy(26,-58)+buoy(60,30);
};

/* the back of a hidden tile: sunlit water seen from above, with the light
   nets (caustics) the waves throw. Four variants so the board is not a wallpaper */
var BACKS={};
BACKS.eau=function(v){var R=rng(131+v*17),sp="";
  for(var i=0;i<5;i++){var x=(R()*2-1)*62,y=(R()*2-1)*62,r=1.2+R()*1.6;
    sp+='<circle cx="'+f(x)+'" cy="'+f(y)+'" r="'+f(r)+'" fill="#fff" opacity="'+f(.35+R()*.4)+'"/>';}
  var fx=function(id,seed,bf,a){return '<filter id="'+id+'" x="0" y="0" width="100%" height="100%">'+
    '<feTurbulence type="turbulence" baseFrequency="'+bf+'" numOctaves="2" seed="'+seed+'"/>'+
    '<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -4.2 0 0 0 '+a+'"/></filter>';};
  return '<defs>'+fx("cA"+v,11+v*5,".034 .042",".7")+fx("cB"+v,29+v*3,".07 .08",".6")+
    '<radialGradient id="seaG'+v+'" cx="'+f(.3+R()*.3)+'" cy="'+f(.2+R()*.25)+'" r=".9">'+
      '<stop offset="0" stop-color="#4CC3C6"/><stop offset=".5" stop-color="#1E8C9B"/><stop offset="1" stop-color="#0D5565"/></radialGradient></defs>'+
    '<rect x="-100" y="-100" width="200" height="200" fill="url(#seaG'+v+')"/>'+
    '<rect x="-100" y="-100" width="200" height="200" filter="url(#cB'+v+')" opacity=".35"/>'+
    '<rect x="-100" y="-100" width="200" height="200" filter="url(#cA'+v+')" opacity=".75"/>'+
    '<path d="M-100 -40 C-40 -70 40 -20 100 -60 L100 -100 L-100 -100 Z" fill="#fff" opacity=".07"/>'+sp;
};

/* the same caustic filter, with a seed per variant */
function causticF(id,seed,bf,a){return '<filter id="'+id+'" x="0" y="0" width="100%" height="100%">'+
  '<feTurbulence type="turbulence" baseFrequency="'+bf+'" numOctaves="2" seed="'+seed+'"/>'+
  '<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -4.2 0 0 0 '+a+'"/></filter>';}

/* Vagues: seigaiha, the Japanese wave scales - rows of nested half-circles,
   each row laid over the one above, with a few foam crests */
BACKS.vagues=function(v){var R=rng(211+v*13),s="",r=17,cols=["#0B4F5E","#1C7E8E","#0E5D6C","#4FB2BC"];
  var tint=["#0B4F5E","#0A4757","#0C5563","#0B4A5B"][v];
  for(var row=-15;row<=15;row++){var y=row*r/2, off=(row%2?r:0)+v*6;
    for(var x=-140;x<=140;x+=2*r){var cx=x+off;
      s+='<circle cx="'+f(cx)+'" cy="'+f(y)+'" r="'+r+'" fill="'+tint+'" stroke="#06323D" stroke-width="1.2"/>';
      [r*.78,r*.56,r*.34].forEach(function(rr,k){s+='<circle cx="'+f(cx)+'" cy="'+f(y)+'" r="'+f(rr)+'" fill="none" stroke="'+cols[k+1]+'" stroke-width="'+f(r*.13)+'"/>';});
      if(R()<.12)s+='<path d="M'+f(cx-r*.7)+' '+f(y-r*.62)+' A'+r+' '+r+' 0 0 1 '+f(cx+r*.7)+' '+f(y-r*.62)+'" fill="none" stroke="#E9FFFC" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>';
    }}
  return s;
};

/* Fond marin: a quiet depth chart - nested contours round a shoal, deep blue
   bands that only lighten a little towards the top, no lettering. The shoal's
   centre, shape and scale change per variant, so tiles do not repeat */
BACKS.fond=function(v){var R=rng(307+v*19),s="";
  var cx=[-38,46,-10,30][v]+(R()*2-1)*10, cy=[30,-36,-48,42][v]+(R()*2-1)*10;
  var harm=[0,1,2].map(function(k){return {a:[.10,.06,.035][k]*(.6+R()*.8),p:R()*6.28,n:k+2};});
  var bands=["#0B2735","#0E2D3D","#113445","#143B4C","#184254","#1C4A5C","#215264","#275B6C"];
  var scale=1.05+R()*.35;
  function contour(r){var d="";
    for(var a=0;a<=72;a++){var th=a/72*Math.PI*2, rr=r;
      harm.forEach(function(h){rr+=r*h.a*Math.sin(h.n*th+h.p);});
      d+=(a?" L":"M")+f(cx+Math.cos(th)*rr)+" "+f(cy+Math.sin(th)*rr*.86);}
    return d+" Z";}
  s+='<rect x="-100" y="-100" width="200" height="200" fill="#09212D"/>';
  var lines="";
  for(var L=0;L<8;L++){var r=(150-L*18)*scale, d=contour(r), idx=L%2===0;
    s+='<path d="'+d+'" fill="'+bands[L]+'"/>';
    lines+='<path d="'+d+'" fill="none" stroke="#8FBCC8" stroke-width="'+(idx?.9:.5)+'" opacity="'+(idx?.28:.16)+'"/>';
    lines+='<path d="'+contour(r-9*scale)+'" fill="none" stroke="#8FBCC8" stroke-width=".4" opacity=".1"/>';
  }
  var grat='<g stroke="#8FBCC8" stroke-width=".5" stroke-dasharray="2 4" opacity=".14">';
  [-60,0,60].forEach(function(x){grat+='<path d="M'+(x+v*7)+' -100 V100"/><path d="M-100 '+(x-v*5)+' H100"/>';});
  grat+='</g>';
  return s+lines+'<path d="'+contour(14*scale)+'" fill="#2E6474" stroke="#8FBCC8" stroke-width=".6" stroke-opacity=".3"/>'+grat+
    '<rect x="-100" y="-100" width="200" height="200" filter="url(#grain)" opacity=".1"/>';
};

/* Varech: kelp ribbons floating at the surface, gas bladders, bubbles */
BACKS.varech=function(v){var R=rng(401+v*23),s="";
  s+='<defs><radialGradient id="vrG'+v+'" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#2E8C80"/><stop offset=".6" stop-color="#145A58"/><stop offset="1" stop-color="#0A3A3E"/></radialGradient></defs>'+
    '<rect x="-100" y="-100" width="200" height="200" fill="url(#vrG'+v+')"/>';
  for(var k=0;k<4;k++){var y0=-70+k*45+(R()*2-1)*12, a=(R()*2-1)*.6+(v%2?.3:-.3), d="", pts=[];
    for(var x=-120;x<=120;x+=10){var y=y0+x*a+Math.sin(x/18+k*2+v)*9;pts.push([x,y]);d+=(d?" L":"M")+f(x)+" "+f(y);}
    var back=k%2===0;
    s+='<path d="'+d+'" fill="none" stroke="'+(back?"#0E3A2E":"#163F2B")+'" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" opacity="'+(back?.55:.9)+'"/>'+
       '<path d="'+d+'" fill="none" stroke="'+(back?"#3C7A45":"#5A9A48")+'" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="'+(back?.6:1)+'"/>'+
       '<path d="'+d+'" fill="none" stroke="#B4D97A" stroke-width="1.4" stroke-linecap="round" opacity="'+(back?.3:.7)+'" transform="translate(0 -2)"/>';
    for(var b=2;b<pts.length;b+=5){var p=pts[b];s+='<circle cx="'+f(p[0])+'" cy="'+f(p[1]+7)+'" r="4" fill="#A3C95C" stroke="#3D6B2A" stroke-width="1"/><circle cx="'+f(p[0]-1.2)+'" cy="'+f(p[1]+5.8)+'" r="1.2" fill="#fff" opacity=".7"/>';}
  }
  return s+bubbles(R,6,70);
};

/* Nuit: dark water under the moon, its reflection broken by the swell, plankton glowing */
BACKS.nuit=function(v){var R=rng(503+v*29),s="",mx=-30+v*20;
  s+='<defs><radialGradient id="ntG'+v+'" cx="'+f(.5+mx/200)+'" cy=".2" r="1"><stop offset="0" stop-color="#2B5C86"/><stop offset=".5" stop-color="#143457"/><stop offset="1" stop-color="#071A30"/></radialGradient>'+
    '<filter id="ntB'+v+'" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>'+
    '<rect x="-100" y="-100" width="200" height="200" fill="url(#ntG'+v+')"/>';
  for(var y=-100;y<=100;y+=9){var d="M-110 "+f(y);for(var x=-110;x<110;x+=20)d+=" q10 "+f(-3-R()*2)+" 20 0";
    s+='<path d="'+d+'" fill="none" stroke="#0A2240" stroke-width="2" opacity=".6"/>';}
  s+='<ellipse cx="'+mx+'" cy="-10" rx="34" ry="90" fill="#FFE9A8" opacity=".12" filter="url(#ntB'+v+')"/>';
  for(var i=0;i<26;i++){var yy=-92+i*7+(R()*2-1)*2, spread=10+Math.abs(i-13)*1.4, n=1+(R()*3|0);
    for(var j2=0;j2<n;j2++){var w=4+R()*12, cx=mx+Math.sin(i*.9+v)*6+(R()*2-1)*spread;
      s+='<path d="M'+f(cx-w/2)+' '+f(yy)+' q'+f(w/2)+' '+f(-1.5-R()*1.5)+' '+f(w)+' 0" fill="none" stroke="#FFF1C2" stroke-width="'+f(1.4+R()*1.4)+'" stroke-linecap="round" opacity="'+f(.3+R()*.6)+'"/>';}}
  var glow="";for(var j=0;j<14;j++){var gx=(R()*2-1)*80,gy=(R()*2-1)*80,gr=1+R()*1.6;
    glow+='<circle cx="'+f(gx)+'" cy="'+f(gy)+'" r="'+f(gr*2.4)+'" fill="#5FF3E6" opacity=".35" filter="url(#ntB'+v+')"/><circle cx="'+f(gx)+'" cy="'+f(gy)+'" r="'+f(gr)+'" fill="#C9FFF8"/>';}
  return s+glow;
};

/* Écailles: the showcase card back - scales, a gold double frame and a small compass rose */
BACKS.ecailles=function(v){var scales="", tints=["#2E9AAA","#2B90A0","#33A2AE","#2A8E9E"];
  for(var row=-6;row<=7;row++)for(var col=-6;col<=6;col++){var x=col*18+(row%2?9:0)+v*3,y=row*14;
    scales+='<path d="M'+(x-9)+' '+y+' a9 9 0 0 1 18 0" fill="none" stroke="'+tints[v]+'" stroke-width="1.3" opacity=".45"/>';}
  var rose="";for(var i=0;i<8;i++){var a=i*45, L=i%2?14:26;
    rose+='<path d="M0 0 L'+f(Math.cos((a-90-14)*Math.PI/180)*6)+' '+f(Math.sin((a-90-14)*Math.PI/180)*6)+' L'+f(Math.cos((a-90)*Math.PI/180)*L)+' '+f(Math.sin((a-90)*Math.PI/180)*L)+' Z" fill="url(#goldG)" stroke="#6E4C0E" stroke-width=".6"/>';}
  return '<rect x="-100" y="-100" width="200" height="200" fill="url(#backG)"/>'+scales+
    '<rect x="-100" y="-100" width="200" height="200" filter="url(#caustic)" opacity=".16"/>'+
    '<polygon points="'+hexPts(72)+'" fill="none" stroke="url(#goldG)" stroke-width="2.4"/>'+
    '<polygon points="'+hexPts(65)+'" fill="#062A35" fill-opacity=".45" stroke="url(#goldG)" stroke-width="1" stroke-dasharray="1 3.2" stroke-linecap="round"/>'+
    '<g transform="rotate('+(v*11)+')">'+rose+'<circle r="4.5" fill="#E7B653" stroke="#6E4C0E" stroke-width=".8"/></g>'+
    '<circle r="34" fill="none" stroke="url(#goldG)" stroke-width="1" opacity=".7"/>';
};

/* arg "style:variant" (or just a variant, for the water) */
SCENE.back=function(arg){
  var a=String(arg||"").split(":");
  if(a.length<2)a=["eau",a[0]];
  return (BACKS[a[0]]||BACKS.eau)(+a[1]||0);
};
window.CRABES_BACKS=[["eau","Eau"],["vagues","Vagues"],["fond","Fond marin"],["varech","Varech"],["nuit","Nuit"],["ecailles","Écailles"]];
function shade(hex,k){var n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;
  var m=function(v){return Math.max(0,Math.min(255,Math.round(v*k)));};
  return "#"+((1<<24)|(m(r)<<16)|(m(g)<<8)|m(b)).toString(16).slice(1);}
var DEFS='<radialGradient id="sandG" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="#F6EDD4"/><stop offset=".7" stop-color="#E4D3A8"/><stop offset="1" stop-color="#CDB98A"/></radialGradient><radialGradient id="waterG" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#3AAAB5"/><stop offset=".55" stop-color="#1D7787"/><stop offset="1" stop-color="#0D4A59"/></radialGradient><radialGradient id="darkWaterG" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#1F6E7D"/><stop offset=".6" stop-color="#0F4553"/><stop offset="1" stop-color="#072833"/></radialGradient><radialGradient id="jellyWaterG" cx=".5" cy=".3" r=".85"><stop offset="0" stop-color="#3C5C9C"/><stop offset=".55" stop-color="#1D3C6A"/><stop offset="1" stop-color="#0B1E3A"/></radialGradient><radialGradient id="whirlG" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#020E14"/><stop offset=".25" stop-color="#083443"/><stop offset=".7" stop-color="#1B7686"/><stop offset="1" stop-color="#2C98A6"/></radialGradient><radialGradient id="backG" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#16697A"/><stop offset=".65" stop-color="#0B4352"/><stop offset="1" stop-color="#052530"/></radialGradient><linearGradient id="edgeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient><radialGradient id="sheenG" cx=".3" cy=".18" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><radialGradient id="vignetteG" cx=".5" cy=".5" r=".55"><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient><radialGradient id="pearlG" cx=".34" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#F6EFE2"/><stop offset=".8" stop-color="#DCCDB0"/><stop offset="1" stop-color="#A9977A"/></radialGradient><linearGradient id="nacreG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4E9F3"/><stop offset=".3" stop-color="#CFE4F1"/><stop offset=".55" stop-color="#F7EBDD"/><stop offset=".8" stop-color="#E6D2EC"/><stop offset="1" stop-color="#C6DDE6"/></linearGradient><linearGradient id="oysterG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E7480"/><stop offset="1" stop-color="#4C3843"/></linearGradient><radialGradient id="glowG"><stop offset="0" stop-color="#FFF8E6" stop-opacity=".9"/><stop offset="1" stop-color="#FFF8E6" stop-opacity="0"/></radialGradient><linearGradient id="sharkG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6F8E9B"/><stop offset=".55" stop-color="#46616D"/><stop offset="1" stop-color="#2E4651"/></linearGradient><linearGradient id="rockG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ABA698"/><stop offset=".5" stop-color="#7D786B"/><stop offset="1" stop-color="#4F4B42"/></linearGradient><radialGradient id="wetG"><stop offset=".55" stop-color="#9C8B62" stop-opacity=".55"/><stop offset="1" stop-color="#9C8B62" stop-opacity="0"/></radialGradient><radialGradient id="bellG" cx=".45" cy=".25" r=".8"><stop offset="0" stop-color="#FFE3F2" stop-opacity=".98"/><stop offset=".45" stop-color="#FF9ACD" stop-opacity=".88"/><stop offset="1" stop-color="#C2408A" stop-opacity=".7"/></radialGradient><linearGradient id="shrimpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC08E"/><stop offset=".5" stop-color="#F7864A"/><stop offset="1" stop-color="#D45A25"/></linearGradient><linearGradient id="arrowG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D3F6F2" stop-opacity=".2"/><stop offset=".5" stop-color="#E9FFFC"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient><linearGradient id="woodG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C99A62"/><stop offset="1" stop-color="#8C6136"/></linearGradient><linearGradient id="goldG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE7A3"/><stop offset=".5" stop-color="#E7B653"/><stop offset="1" stop-color="#A97A22"/></linearGradient><linearGradient id="plateG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF8E8"/><stop offset="1" stop-color="#EADCB9"/></linearGradient><radialGradient id="discG" cx=".4" cy=".32" r=".75"><stop offset="0" stop-color="#F3E3C2"/><stop offset=".75" stop-color="#D8BF8E"/><stop offset="1" stop-color="#B49760"/></radialGradient><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .32  0 0 0 0 .25  0 0 0 0 .12  1.6 0 0 0 -.95"/></filter><filter id="caustic" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency=".028 .036" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -3.4 0 0 0 .62"/></filter><filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter><filter id="blur1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4"/></filter>';

function svgFor(type,c,flat){
  FLATCLIP=!!flat;
  BG=PASTEL[type]||null; BGTYPE=type;
  var scene=type==="anemone"?SCENE.anemone(c,shade(c,.72)):type==="port"?SCENE.port(c):SCENE[type](c);
  BG=null;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="-100 -100 200 200"><defs>'+DEFS+
    '<clipPath id="hexClip"><polygon points="'+hexPts(HR)+'"/></clipPath></defs>'+
    '<g clip-path="url(#hexClip)">'+scene+
      '<rect x="-100" y="-100" width="200" height="200" fill="url(#vignetteG)"/>'+
      '<rect x="-100" y="-100" width="200" height="200" fill="url(#sheenG)"/></g>'+
    '<polygon points="'+hexPts(HR-1.5)+'" fill="none" stroke="url(#edgeG)" stroke-width="3"/></svg>';
}
var cache={}, pending={};
/* key: "type|colour|f" (f = flat-top clip); colour only matters for anemone and port */
function paint(key,done){
  var k=key.split("|"), img=new Image(), src=svgFor(k[0],k[1],k[2]==="f");
  img.onload=function(){
    try{
      var cv=document.createElement("canvas");cv.width=cv.height=256;
      cv.getContext("2d").drawImage(img,0,0,256,256);
      cache[key]=cv.toDataURL("image/png");
    }catch(e){cache[key]=img.src;}   /* a tainted canvas: the svg itself still works */
    done();
  };
  img.onerror=function(){cache[key]=null;done();};
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(src);
}
window.CrabesArt={
  url:function(key){return cache[key]||null;},
  ensure:function(keys,done){
    var todo=keys.filter(function(k){return !(k in cache)&&!pending[k];});
    if(!todo.length)return;
    var left=todo.length;
    todo.forEach(function(k){pending[k]=1;
      /* one per frame, so a slow tablet keeps answering taps while it paints */
      setTimeout(function(){paint(k,function(){delete pending[k];if(--left===0&&done)done();});},0);
    });
  }
};
})();
