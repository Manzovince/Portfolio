// Plan THP40 · appli d’entraînement et de course (Trail de Haute Provence, 38,8 km, +1 279 m)
(function(){
"use strict";
var $=function(id){return document.getElementById(id);};

// ---------- constantes ----------
var START=Date.UTC(2026,10,9);                 // lundi 9 novembre 2026, semaine 1
var KEY="thp40v2";
var DEF_JSON="https://raw.githubusercontent.com/mathildevans-collab/trail/main/activities.json";
var DOW=["lun","mar","mer","jeu","ven","sam","dim"], DOWL=["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"], DL=["L","M","M","J","V","S","D"];
var MON=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
var TOTAL=38.8, DPLUS=1279, RACEKE=TOTAL+DPLUS/100;
var CP=[{km:9.5,n:"Ongles",up:306,dn:259},{km:19.9,n:"Saint-Étienne-les-Orgues",up:367,dn:310},{km:29,n:"Fontienne",up:273,dn:233},{km:38.8,n:"Arrivée",up:319,dn:488}];
var ADV=[[10,"Départ prudent en zone 2-3, jamais plus vite que l’allure course, même si le peloton part vite."],
[15,"Longue montée : marche dès que ta FC dépasse 165 bpm. Mange avant le sommet."],
[28,"Rythme régulier, 60 g de glucides par heure."],
[32.6,"Descente à −13 % : petits pas, jambes souples, épargne tes quadriceps."],
[35.6,"Montée à +12 % : marche active, mains sur les cuisses."],
[39,"Ça descend jusqu’à l’arrivée : lâche ce qu’il te reste."]];
var WHY={"Côtes":"Les montées répétées construisent la force dont tu auras besoin dans la grande montée des km 10 à 15.","Tempo long":"Tenir longtemps une allure soutenue, c’est ce qui fera la différence entre le km 15 et le km 28.","Côtes courtes":"Des efforts brefs et vifs : puissance et foulée en montée, sans fatigue durable.","Côtes enchaînées":"Repartir fort quand les jambes chauffent, comme au km 34.","Descentes":"Tes quadriceps apprennent à freiner : c’est ce qui protège tes jambes dans la descente du km 30.","Fartlek nature":"Changer de rythme sur sentier réveille la vitesse sans la rigueur de la piste.","Progressif":"Du volume facile qui finit un peu plus vite, sans fatigue.","Endurance + renfo":"La zone 2 construit le moteur, le renfo protège les articulations et prépare les descentes.","Club · piste":"La séance du club apporte la vitesse. Le plan ne la juge pas, il en tient compte.","Sortie longue":"La séance qui prépare le plus directement les 38,8 km : endurance, dénivelé, ravitaillement.","Sortie club · dimanche":"Le volume du week-end en groupe : régularité et dénivelé.","Jour 2 du bloc":"Courir sur des jambes déjà fatiguées, c’est répéter la seconde moitié de la course.","Rappel":"Garder les jambes vives sans fatigue avant le jour J.","Footing":"Juste bouger. La forme est faite, il faut la garder fraîche.","Club allégé":"Garder le rythme du club sans te fatiguer.","Activation":"Réveiller les jambes la veille, sans les fatiguer.","Jour J":"Le jour pour lequel tu t’es entraînée.","Récupération":"Bouger doucement aide à récupérer plus vite."};
var KIT=KITL;

// ---------- état (localStorage) ----------
function blank(){return {v:2,done:{},actual:{},ci:{},adj:{},cycle:{on:false,start:"",len:28},kit:{},todo:{},
  set:{theme:"auto",goal:295,raceDate:"2027-05-08",raceTime:"08:00",json:DEF_JSON,gel:35,water:15,vib:true,checkin:true,fake:""},
  race:null,practice:null,result:null,sync:{t:0,upd:"",runs:[],err:""},gpx:null};}
var NULLABLE={race:1,practice:1,result:1,gpx:1};
function load(){
  var o=blank();
  try{var r=JSON.parse(localStorage.getItem(KEY)||"null"); if(r&&typeof r==="object")merge(o,r);}catch(e){}
  return o;
}
function merge(o,r){for(var k in o){if(r[k]==null)continue; if(!NULLABLE[k]&&o[k]&&typeof o[k]==="object"&&!Array.isArray(o[k]))Object.assign(o[k],r[k]); else o[k]=r[k];}}
var D=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(D));}catch(e){toast("Mémoire du téléphone pleine : données non enregistrées.");}}

// ---------- dates ----------
var QS=new URLSearchParams(location.search);
function isoOk(s){return typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+"T00:00:00Z"));}
function fakeDate(){var f=QS.get("date"); if(isoOk(f))return f; return isoOk(D.set.fake)?D.set.fake:"";}
function todayUTC(){var f=fakeDate(); if(f)return Date.parse(f+"T00:00:00Z"); var t=new Date(); return Date.UTC(t.getFullYear(),t.getMonth(),t.getDate());}
function raceUTC(){return Date.parse((isoOk(D.set.raceDate)?D.set.raceDate:"2027-05-08")+"T00:00:00Z");}
function todayIdx(){return Math.floor((todayUTC()-START)/864e5);}
function nowWeek(){var i=todayIdx(); return i<0?1:Math.min(26,Math.floor(i/7)+1);}
function dateOf(w,dow){return new Date(START+((w-1)*7+dow)*864e5);}
function iso(d){return d.getUTCFullYear()+"-"+pz(d.getUTCMonth()+1)+"-"+pz(d.getUTCDate());}
function daysToRace(){return Math.round((raceUTC()-todayUTC())/864e5);}
function phase(){var j=daysToRace(); return j<0?"after":j===0?"race":j<=7?"taper":"prep";}
function raceDow(){var d=Math.round((raceUTC()-dateOf(26,0).getTime())/864e5); return d>=0&&d<=6?d:5;}
function startMin(){var m=/^(\d{1,2}):(\d{2})$/.exec(D.set.raceTime||""); return m?(+m[1])*60+(+m[2]):480;}
function raceStartTs(){var d=new Date(raceUTC()); return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),0,startMin()).getTime();}

// ---------- formats ----------
function pz(n){return (n<10?"0":"")+n;}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function kmS(x){return String(Math.round(x*10)/10).replace(".",",");}
function nb(x){return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g," ");}
function hm(m){m=Math.round(m); var h=Math.floor(m/60); return h+" h "+pz(m-h*60);}
function hmc(m){m=Math.round(m); var h=Math.floor(m/60); return h+"h"+pz(m-h*60);}
function hms(s){s=Math.max(0,Math.floor(s)); return Math.floor(s/3600)+":"+pz(Math.floor(s/60)%60)+":"+pz(s%60);}
function dur(sec){var h=Math.floor(sec/3600), m=Math.round((sec%3600)/60); if(m===60){h++;m=0;} return h>0?h+" h "+pz(m):m+" min";}
function mmss(x){x=Math.round(x); var m=Math.floor(x/60); return m+":"+pz(x-m*60);}
function sgn(m){m=Math.round(m); return (m>0?"+":m<0?"−":"±")+Math.abs(m)+" min";}
function tod(min){var t=Math.round(startMin()+min); return Math.floor(t/60)%24+":"+pz(t%60);}
function fmtS(d){return d.getUTCDate()+" "+MON[d.getUTCMonth()];}
function fmtL(d){var s=DOWL[(d.getUTCDay()+6)%7]; return s.charAt(0).toUpperCase()+s.slice(1)+" "+d.getUTCDate()+" "+MON[d.getUTCMonth()];}
function jx(){var j=daysToRace(); return j>0?"J-"+j:j===0?"Jour J":"J+"+(-j);}
function num(x){if(typeof x==="number")return x; if(x==null)return NaN; var s=String(x).trim().replace(/\s/g,""); if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replace(/,/g,""); else s=s.replace(",","."); return parseFloat(s);}
function parseDur(x){if(x==null||x==="")return 0; x=String(x).trim().replace(/\s*h\s*/i,":"); if(x.indexOf(":")>=0){var p=x.split(":"),t=0; if(p.length===2&&p[1].length<=2&&!/\./.test(x))p.push("0"); p.forEach(function(v){t=t*60+(parseFloat(v)||0);}); return t;} var n=num(x); return n>0?n*60:0;}

// ---------- modèle de course ----------
function goal(){return D.set.goal||295;}
function eff(){return goal()*60/RACEKE;}
function cumMin(km){var f=goal()/285,Pp=[[0,0]].concat(PASS),i=1; km=Math.max(0,Math.min(km,TOTAL)); while(i<Pp.length-1&&Pp[i][0]<km)i++; var a=Pp[i-1],b=Pp[i]; return (a[1]+(b[1]-a[1])*(km-a[0])/(b[0]-a[0]))*f;}
function kmAt(min){var lo=0,hi=TOTAL; if(min<=0)return 0; for(var k=0;k<32;k++){var m=(lo+hi)/2; if(cumMin(m)<min)lo=m; else hi=m;} return lo;}
var RAWUP=0; (function(){for(var i=1;i<PROFILE.length;i++){var d=PROFILE[i][1]-PROFILE[i-1][1]; if(d>0)RAWUP+=d;}})();
function dplus(a,b){var s=0; for(var i=1;i<PROFILE.length;i++){var p=PROFILE[i-1],q=PROFILE[i]; if(q[0]<=a||p[0]>=b)continue; var d=q[1]-p[1]; if(d<=0)continue; var lo=Math.max(a,p[0]),hi=Math.min(b,q[0]); s+=d*(hi-lo)/(q[0]-p[0]);} return Math.round(s*DPLUS/RAWUP);}
function elevAt(k){for(var i=1;i<PROFILE.length;i++){if(PROFILE[i][0]>=k){var a=PROFILE[i-1],b=PROFILE[i]; return a[1]+(b[1]-a[1])*(k-a[0])/(b[0]-a[0]);}} return PROFILE[PROFILE.length-1][1];}

// ---------- construction du plan (repris de l’appli d’origine) ----------
function phaseOf(w){return w<=8?"Base":w<=16?"Construction":w<=23?"Spécifique":"Affûtage";}
function renfoOf(w){return w>=24?"D":(w<=8?"A":w<=16?"B":"C")+(w%2===1?"1":"2");}
function rpace(km,dp){return eff()*(1+(km?dp/km/100:0));}
function tempoPace(w,km,dp){var flat=w<=8?335:(w<=16?328:320), c=flat*(1+0.033*(dp/km/10)); return {c:c,lo:c-8,hi:c+8,flat:flat};}
function tuesday(w){
  var t=TS[w-1], T=t[0], n=t[1];
  if(T==="cotes") return {tag:"q",type:"Côtes",km:n+4,dp:n*CLIMB_D,txt:"Échauffement 15 min, puis "+n+" montées de 500 m (+"+CLIMB_D+" m chacune) en zone 4, descente en trot facile. Total : +"+(n*CLIMB_D)+" m."};
  if(T==="tempo"){var km=Math.round((25+n)/6.4), dpT=Math.round(km*18), tp=tempoPace(w,km,dpT); return {tag:"q",type:"Tempo long",km:km,dp:dpT,pace:mmss(tp.lo)+" à "+mmss(tp.hi)+"/km · "+mmss(tp.flat)+" à plat",txt:"15 min d’échauffement, puis "+n+" min de tempo continu, 10 min de retour au calme. Allure : "+mmss(tp.lo)+" à "+mmss(tp.hi)+"/km (environ "+mmss(tp.flat)+" à plat). Si ta FC dépasse 167 bpm, ralentis."};}
  if(T==="courtes") return {tag:"q",type:"Côtes courtes",km:8,dp:n*20,txt:"Échauffement 15 min, puis "+n+" côtes courtes de 30 s (pente de 8 à 12 %), effort vif, descente en marchant, 2 min de récupération. Environ +20 m chacune."};
  if(T==="paires") return {tag:"q",type:"Côtes enchaînées",km:2*n+4,dp:n*2*CLIMB_D,txt:"Échauffement 15 min, puis "+n+" paires de montées de 500 m enchaînées (+"+(2*CLIMB_D)+" m par paire), 3 min de récupération entre les paires. Z3-Z4, marche active si la FC dépasse 175 bpm."};
  if(T==="desc") return {tag:"q",type:"Descentes",km:n+4,dp:n*CLIMB_D,txt:"Échauffement 15 min, puis "+n+" descentes de 500 m contrôlées (foulée courte, souple), remontée en marchant. Ça prépare tes quadriceps à la descente du km 30."};
  if(T==="fartlek") return {tag:"q",type:"Fartlek nature",km:9,dp:100,txt:"Footing 15 min, puis "+n+" × 2 min en zone 4 avec 2 min en zone 2 sur sentier, retour au calme 10 min."};
  return {tag:"e",type:"Progressif",km:Math.round(n/6.2),dp:100,txt:n+" min en progressif : démarre en zone 1-2 et finis en zone 3 basse. Facile et fluide."};
}
function build(w){
  var ph=phaseOf(w), rec=!!REC[w];
  if(w===26){
    var rd=raceDow(), rk=DOW[rd]==="dim"?"sun":"sat", S=[
      {k:"tue",dow:1,tag:"q",type:"Rappel",km:6,dp:0,nut:"quality",txt:"6 km en Z2, puis 4 × 20 s à allure course."},
      {k:"wed",dow:2,tag:"e",type:"Footing",km:4,dp:0,nut:"easy",txt:"4 km très faciles. Prépare ton sac, ta tenue et ton ravitaillement."},
      {k:"thu",dow:3,tag:"e",type:"Club allégé",km:5,dp:0,nut:"easy",txt:"Au club : échauffement et lignes droites seulement, pas de séance dure."}];
    if(rk==="sun")S.push({k:"sat",dow:5,tag:"e",type:"Activation",km:3,dp:0,nut:"b2b",txt:"15 min très faciles et 3 lignes droites. Prépare tout ce soir, couche-toi tôt."});
    S.push({k:rk,dow:rd,tag:"l",type:"Jour J",km:TOTAL,dp:DPLUS,nut:"race",race:true,txt:"THP40 : 38,8 km, +1 279 m, objectif "+hm(goal())+". Départ à "+D.set.raceTime+"."});
    if(rk==="sat")S.push({k:"sun",dow:6,tag:"e",type:"Récupération",km:0,dp:0,nut:"rest",txt:"Marche de 30 min et étirements doux."});
    return {n:w,km:0,dp:0,ph:ph,rec:false,s:S};
  }
  var d=R[w-1], wed=d[1], sk=d[3], sd=d[4], uk=Math.max(15,d[5]), ud=Math.max(500,d[6]);
  if(ph!=="Base"){if(sk>=18)sd=Math.min(sd,Math.round(sk*36)); if(uk>=18)ud=Math.min(ud,Math.round(uk*36));}
  var tu=tuesday(w), r=renfoOf(w), b2b=w===14||w===18||w===21;
  var S2=[
   {k:"tue",dow:1,tag:tu.tag,type:tu.type,km:tu.km,dp:tu.dp,nut:"quality",pace:tu.pace,txt:tu.txt},
   {k:"wed",dow:2,tag:"e",type:"Endurance + renfo",km:wed,dp:0,nut:"easy",pace:"6:00 à 6:25/km",pacel:"Allure facile",renfo:r,txt:wed+" km en zone 2 (135 à 150 bpm) "+WEDV[(w-1)%4]+", puis 20 à 25 min de renforcement à la maison ("+RENFO[r].name+")."},
   {k:"thu",dow:3,tag:"q",type:"Club · piste",km:rec?7:9,dp:0,nut:"quality",txt:"Séance du club, rien de prévu par le plan : fais ce que propose ton coach du club"+(rec?", en version allégée (échauffement et moitié du volume)":"")+"."},
   {k:"sat",dow:5,tag:"l",type:"Sortie longue",km:sk,dp:sd,nut:b2b?"b2b":"long",txt:sk+" km de trail, +"+sd+" m. "+SAT_T[w-1]},
   {k:"sun",dow:6,tag:"l",type:b2b?"Jour 2 du bloc":"Sortie club · dimanche",km:uk,dp:ud,nut:"long",club:true,txt:"Sortie du club, minimum 15 km, 2 h et +500 m. Prévu aujourd’hui : "+uk+" km, +"+ud+" m. "+SUN_T[w-1]}];
  S2.forEach(function(x){if(x.km&&/allure course/i.test(x.txt)&&x.k!=="thu")x.txt+=" Allure course : environ "+mmss(rpace(x.km,x.dp))+"/km sur ce relief.";});
  var km=0,dp=0; S2.forEach(function(s){km+=s.km;dp+=s.dp;});
  return {n:w,km:Math.round(km),dp:Math.round(dp),ph:ph,rec:rec,s:S2};
}
var PLAN=[], BYDATE={};
function rebuild(){PLAN=[];BYDATE={}; for(var w=1;w<=26;w++)PLAN.push(build(w)); PLAN.forEach(function(p){p.s.forEach(function(s){BYDATE[iso(dateOf(p.n,s.dow))]={w:p.n,s:s};});});}
rebuild();
function sessOf(p,dow){for(var i=0;i<p.s.length;i++)if(p.s[i].dow===dow)return p.s[i]; return null;}
function weekDone(p){var c=0; p.s.forEach(function(s){if(D.done[p.n+"-"+s.k])c++;}); return c;}
function totals(){var t=0,d=0; PLAN.forEach(function(p){t+=p.s.length; d+=weekDone(p);}); return {t:t,d:d};}
function estDur(s){if(!s.km)return 0; var f=s.tag==="l"?1.12:s.tag==="e"?1.12:1.0; return (s.km+s.dp/100)*eff()*f;}

// ---------- coach : bilan d’une séance ----------
function review(s,ac){
  var L=[],lvl=0,fast=false; function bump(n){if(n>lvl)lvl=n;}
  if(s.k==="thu"){L.push("Séance du club enregistrée. Elle compte dans ta semaine, rien à comparer avec le plan."); return {lvl:0,lines:L,fast:false};}
  if(s.race){L.push("Course enregistrée : "+kmS(ac.km)+" km"+(ac.t?" en "+dur(ac.t):"")+"."); return {lvl:0,lines:L,fast:false};}
  if(s.km>0){var r=ac.km/s.km;
    if(r>1.15){bump(1);L.push("Plus long que prévu : "+kmS(ac.km)+" km pour "+kmS(s.km)+" prévus. Garde de la fraîcheur pour la suite.");}
    else if(r>=0.9)L.push("Distance dans la cible : "+kmS(ac.km)+" km pour "+kmS(s.km)+" prévus.");
    else if(r>=0.75){bump(1);L.push("Un peu court : "+kmS(ac.km)+" km pour "+kmS(s.km)+" prévus.");}
    else{bump(2);L.push("Nettement en dessous : "+kmS(ac.km)+" km pour "+kmS(s.km)+" prévus. Si c’était de la fatigue, tu as bien fait. Sinon, ne rattrape pas d’un coup.");}}
  if(s.dp>=100&&ac.dp>0){var dr=ac.dp/s.dp;
    if(dr<0.75){bump(dr<0.5?2:1);L.push("Il manque du dénivelé : +"+ac.dp+" m pour +"+s.dp+" m prévus. C’est lui qui prépare le THP40.");}
    else if(dr>1.3)L.push("Beaucoup de dénivelé : +"+ac.dp+" m pour +"+s.dp+" m prévus. Bien, si tu récupères correctement.");
    else L.push("Dénivelé dans la cible : +"+ac.dp+" m pour +"+s.dp+" m prévus.");}
  if((s.tag==="e"||s.tag==="l")&&ac.t>0&&ac.km>0){var e=ac.t/(ac.km+ac.dp/100);
    if(e<eff()*0.97){fast=true;bump(1);L.push("Trop rapide pour une sortie facile : "+mmss(e)+" par km-effort, plus vite que ton allure de course ("+mmss(eff())+"). Ralentis pour rester en zone 2.");}}
  return {lvl:lvl,lines:L,fast:fast};
}
var BADGE=[["ok","En cible"],["warn","À ajuster"],["off","Hors cible"]];
function weekStats(p){
  var n=0,pk=0,ak=0,pd=0,ad=0,fast=0,c=[0,0,0];
  p.s.forEach(function(s){var ac=D.actual[p.n+"-"+s.k]; if(!ac||s.race)return; n++; var r=review(s,ac); c[r.lvl]++; if(r.fast)fast++; if(s.km){pk+=s.km;ak+=ac.km;} if(s.dp>=100){pd+=s.dp;ad+=ac.dp;}});
  return {n:n,pk:pk,ak:ak,pd:pd,ad:ad,fast:fast,c:c,pc:pk?Math.round(ak/pk*100):0};
}

// ---------- cycle (facultatif) ----------
function cycleDay(t){var c=D.cycle; if(!c.on||!isoOk(c.start))return 0; var d=Math.floor((t-Date.parse(c.start+"T00:00:00Z"))/864e5); if(d<0)return 0; return (d%(c.len||28))+1;}
function inPeriod(t){var c=cycleDay(t); return c>=1&&c<=5;}
function weekHasPeriod(w){for(var i=0;i<7;i++)if(inPeriod(dateOf(w,i).getTime()))return true; return false;}
function cycleBanner(w,dow,s){
  if(!inPeriod(dateOf(w,dow).getTime()))return "";
  var opt="";
  if(s&&s.k!=="thu"&&s.tag==="q")opt=" Option : une version allégée aujourd’hui (quelques répétitions de moins, ou un tempo raccourci de 10 min).";
  else if(s&&s.tag==="l"&&s.km&&!s.race)opt=" Option : réduire cette sortie de 10 à 15 %, soit environ "+kmS(s.km*0.87)+" km.";
  return '<div class="banner">Tu es en phase menstruelle. C’est normal de se sentir un peu moins forte ou plus fatiguée. Tu peux garder le plan, ou baisser légèrement l’intensité aujourd’hui ou demain.'+opt+'</div>';
}

// ---------- ajustement hebdomadaire ----------
var LIGHT=0.82, MICRO=0.88;
function adjFor(w){
  if(w<2||w>25)return null;
  var st=weekStats(P(w-1)), c=D.ci[w]||{}, pv=D.ci[w-1]||{};
  var ok=st.n>=3, pc=st.pc, legs=c.legs==="lourdes", sleep=c.sleep==="mauvais", feel2=(c.feel==="trop"&&pv.feel==="trop"), hasCi=!!(c.sleep||c.legs||c.feel);
  var cip=[]; if(legs)cip.push("des jambes lourdes"); if(sleep)cip.push("un mauvais sommeil"); if(c.feel==="trop")cip.push("une semaine passée « trop dure »"); else if(c.feel==="dur")cip.push("une semaine passée « dure »");
  var reasons=[];
  if(ok)reasons.push({k:"Volume réalisé",v:pc+" % du prévu ("+kmS(st.ak)+" km sur "+kmS(st.pk)+" km)",r:"Moins de 75 % : semaine allégée. 90 à 115 % : plan normal. Plus de 120 % : micro-récupération."});
  if(ok&&st.fast>0)reasons.push({k:"Sorties faciles",v:st.fast+" trop rapide"+(st.fast>1?"s":""),r:"À partir de 2 sorties trop rapides : Zone 2 stricte."});
  reasons.push(hasCi?{k:"Check-in du lundi",v:cip.length?"tu indiques "+cip.join(", "):"jambes, sommeil et ressenti corrects",r:cip.length?"Des jambes lourdes ou un mauvais sommeil renforcent une proposition d’allègement.":"Rien d’inquiétant côté récupération."}:{k:"Check-in du lundi",v:"pas encore rempli",r:"Remplis-le plus bas : il affine la proposition."});
  var volTxt=ok?"Tu as fait "+pc+" % du volume prévu":"", ciTxt=cip.length?"ton check-in indique "+cip.join(" et "):"";
  var mode=null,lead,prop,effx=[],base=PLAN[w-1],sat=sessOf(base,5),sun=sessOf(base,6),tue=sessOf(base,1);
  function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
  if(feel2||(ok&&pc>120)){
    mode="micro"; lead=cap((ok&&pc>120?"volume à "+pc+" %":"")+(ok&&pc>120&&feel2?" + ":"")+(feel2?"sensation « trop dure » deux semaines de suite":"")+".");
    prop="Je te propose une micro-récupération (environ −12 %).";
    effx=["Mardi : footing progressif de 40 min à la place de « "+tue.type.toLowerCase()+" ».","Mercredi et samedi : environ −12 % (samedi "+kmS(sat.km)+" → "+kmS(sat.km*MICRO)+" km).","Dimanche (club) : "+kmS(sun.km)+" → "+kmS(Math.max(15,sun.km*MICRO))+" km, jamais sous le minimum du club.","Jeudi : club, inchangé."];
  }else if((ok&&pc<75)||(ok&&pc<90&&(legs||sleep))||(legs&&sleep)){
    mode="light"; lead=cap(volTxt+(volTxt&&ciTxt?" + ":"")+ciTxt+".");
    prop="Je te propose une semaine allégée (−18 %).";
    effx=["Mardi, mercredi, samedi : −18 % en distance et en dénivelé.","Samedi : "+kmS(sat.km)+" → "+kmS(sat.km*LIGHT)+" km.","Dimanche (club) : "+kmS(sun.km)+" → "+kmS(Math.max(15,sun.km*LIGHT))+" km, jamais sous le minimum du club.","Jeudi : club, inchangé."];
  }else if(ok&&st.fast>=2){
    mode="z2"; lead=st.fast+" sorties faciles trop rapides la semaine dernière."; prop="Cette semaine, on passe en Zone 2 stricte.";
    effx=["Sorties faciles et longues : sous 150 bpm, même si ça paraît lent.","Marche dès que la FC dépasse 150 bpm dans les côtes.","Le volume ne change pas."];
  }else if(ok){
    mode="normal"; lead=volTxt+(hasCi&&!cip.length?" et ton check-in est bon":"")+"."; prop="On garde le plan normal."; effx=["Aucun changement cette semaine."];
  }
  if(!mode)return null;
  return {mode:mode,lead:lead,prop:prop,reasons:reasons,eff:effx};
}
function P(w){
  var p=PLAN[w-1]; if(!p||w<2||D.adj[w]!=="on")return p;
  var a=adjFor(w); if(!a||(a.mode!=="light"&&a.mode!=="micro"))return p;
  var f=a.mode==="light"?LIGHT:MICRO, lab=a.mode==="light"?"Allégée −18 %":"Micro-récup. −12 %";
  var S=p.s.map(function(s){var c=Object.assign({},s); if(s.k==="thu")return c; c.km=Math.round(s.km*f*10)/10; c.dp=Math.round(s.dp*f); c.adjusted=true;
    if(s.k==="sun"){c.km=Math.max(15,c.km); c.dp=Math.max(500,c.dp);} c.txt=s.txt+" Version allégée : vise "+kmS(c.km)+" km"+(c.dp?" et +"+c.dp+" m":"")+"."; return c;});
  if(a.mode==="micro")S[0]={k:"tue",dow:1,tag:"e",type:"Progressif",km:7,dp:100,nut:"easy",adjusted:true,txt:"Micro-récupération : 40 min en progressif, zone 1-2 puis 3 basse. Pas de séance de qualité aujourd’hui."};
  var km=0,dp=0; S.forEach(function(x){km+=x.km;dp+=x.dp;});
  return {n:p.n,km:Math.round(km),dp:Math.round(dp),ph:p.ph,rec:p.rec,s:S,adjLabel:lab};
}

// ---------- icônes ----------
function sv(p,o){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+((o&&o.w)||2)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';}
var I={
 gear:sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
 check:sv('<path d="M5 12l5 5 9-10"/>',{w:3}),
 play:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
 back:sv('<path d="M15 5l-7 7 7 7"/>',{w:2.4}),
 sync:sv('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
 heart:sv('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
 moon:sv('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
 phone:sv('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>'),
 cycle:sv('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
 bell:sv('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>'),
 flag:sv('<path d="M5 21V4h11l-2 4 2 4H5"/>'),
 gel:sv('<path d="M9 3h6v4l2 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l2-3z"/>'),
 drop:sv('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
 vib:sv('<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4 8v8M20 8v8"/>'),
 up:sv('<path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
 down:sv('<path d="M12 3v12M7 10l5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>'),
 trash:sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
 cal:sv('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
 clock:sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
 map:sv('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
 help:sv('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01"/>'),
 dumb:sv('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>'),
 leaf:sv('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19l7-7"/>'),
 pin:sv('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
 book:sv('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>')
};

// ---------- petits blocs ----------
function header(eyebrow,title,noGear){return '<div class="top"><div><span class="eyebrow">'+eyebrow+'</span><h2>'+title+'</h2></div>'+(noGear?'':'<button class="ibtn" data-go="settings" aria-label="Réglages">'+I.gear+'</button>')+'</div>';}
function todoBtn(key,label,store){var on=!!(store||D.todo)[key]; return '<button class="todo" data-todo="'+key+'"'+(store?' data-store="kit"':'')+' aria-pressed="'+on+'"><span class="box">'+(on?I.check:"")+'</span><span class="t">'+label+'</span></button>';}
function exHTML(list){return list.map(function(e){return '<div class="ex"><span>'+esc(e[0])+'</span><span>'+esc(e[1])+'</span></div>';}).join("");}
function nutHTML(k){var n=NUT[k]; if(!n)return ""; var h='<dl class="nut"><dt>'+esc(n.t)+'</dt><dd>Glucides ≈ '+n.c+' g sur la journée ('+n.cg+'). Protéines ≈ '+n.p+' g, en 4 prises de 25 à 30 g.</dd>';
  if(n.pre)h+='<dt>Avant</dt><dd>'+esc(n.pre)+'</dd>'; if(n.dur)h+='<dt>Pendant</dt><dd>'+esc(n.dur)+'</dd>'; if(n.post)h+='<dt>Après</dt><dd>'+esc(n.post)+'</dd>'; return h+'<dt>Astuce</dt><dd>'+esc(n.tip)+'</dd></dl>';}
var LOCAL_OKT={"Endurance + renfo":1,"Sortie longue":1,"Sortie club · dimanche":1,"Jour 2 du bloc":1,"Tempo long":1,"Fartlek nature":1,"Progressif":1};
function loopHTML(o){var link=o.src==="Komoot"?"Chercher « "+o.n+" » sur Komoot":"Voir le tracé sur "+o.src;
  return '<div class="loop"><div class="lh"><b>'+esc(o.a)+' · '+esc(o.n)+'</b><span class="chip">'+esc(o.t)+'</span></div><div class="muted num">'+kmS(o.km)+' km · +'+o.dp+' m</div><p>'+esc(o.d)+'</p><a href="'+o.u+'" target="_blank" rel="noopener noreferrer">'+esc(link)+'</a></div>';}
function localHTML(s){
  if(!LOCAL_OKT[s.type]||s.km<5)return "";
  var pool=s.dp<100?LOCAL.filter(function(o){return o.dp<=150;}):LOCAL;
  var best=pool.map(function(o){return {o:o,v:Math.abs(s.km-o.km)/s.km+(s.dp>=100?Math.abs(s.dp-o.dp)/s.dp:0)};}).sort(function(a,b){return a.v-b.v;}).slice(0,2);
  var h='<details><summary>'+I.pin+' Où courir près de chez toi</summary><div class="in"><p class="muted small">Les 2 boucles les plus proches de '+kmS(s.km)+' km'+(s.dp>=100?' et +'+s.dp+' m':'')+'.</p>'+best.map(function(x){return loopHTML(x.o);}).join("");
  if(s.km>16.5)h+='<p class="muted small" style="margin-top:8px">Pour atteindre '+kmS(s.km)+' km, enchaîne deux boucles voisines, ou ajoute des allers-retours de côtes de 500 m (+73 m).</p>';
  return h+'<p class="muted xs" style="margin-top:8px">Distances et dénivelés tels que publiés par chaque site. Vérifie le tracé avant de partir.</p></div></details>';
}
function syncLine(){
  var s=D.sync, st=syncing?["warn","Synchronisation…"]:s.err?["off","Strava : "+s.err]:s.t?["ok","Strava à jour · "+ago(s.t)]:["","Strava pas encore synchronisé"];
  return '<div class="syncline"><span class="dot '+st[0]+'"></span><span>'+esc(st[1])+'</span><button data-act="sync"'+(syncing?" disabled":"")+'>Actualiser</button></div>';
}
function ago(t){var m=Math.round((Date.now()-t)/60000); if(m<1)return "à l’instant"; if(m<60)return "il y a "+m+" min"; var h=Math.round(m/60); if(h<24)return "il y a "+h+" h"; return "le "+fmtS(new Date(Date.UTC(new Date(t).getFullYear(),new Date(t).getMonth(),new Date(t).getDate())));}
function banners(){
  var h="", f=fakeDate();
  if(f)h+='<div class="banner warn"><b>Date simulée : '+fmtL(new Date(todayUTC())).toLowerCase()+'</b>. L’appli se comporte comme si on était ce jour-là.'+(QS.get("date")?'':' <button class="btn sm" data-act="unfake" style="margin-top:8px">Revenir à aujourd’hui</button>')+'</div>';
  return h;
}

// ---------- profil du parcours ----------
function profileSVG(o){
  o=o||{}; var W=360,H=o.h||170,top=o.top||26,bot=H-22,X=function(k){return 10+k/TOTAL*(W-20);},Y=function(e){return bot-(e-490)/(920-490)*(bot-top);};
  var dark=o.dark, line=dark?"#B3A6FF":"var(--brand)", trap=dark?"#F08A98":"var(--off)", txt=dark?"#93A39A":"var(--muted)", grid=dark?"#26342B":"var(--line)";
  var pts=function(arr){return arr.map(function(p,i){return (i?"L":"M")+X(p[0]).toFixed(1)+","+Y(p[1]).toFixed(1);}).join(" ");};
  var d=pts(PROFILE);
  var s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="Profil du THP40"'+(o.id?' id="'+o.id+'" style="touch-action:none;cursor:crosshair"':'')+'>';
  if(!o.small)[500,700,900].forEach(function(e){s+='<line x1="10" x2="'+(W-10)+'" y1="'+Y(e)+'" y2="'+Y(e)+'" stroke="'+grid+'" stroke-width="1"/><text x="'+(W-10)+'" y="'+(Y(e)-3)+'" text-anchor="end" font-size="9">'+e+' m</text>';});
  s+='<path d="'+d+' L'+X(TOTAL)+','+bot+' L'+X(0)+','+bot+'Z" fill="'+line+'" fill-opacity="'+(dark?.16:.14)+'"/>';
  if(o.pos!=null){var cut=PROFILE.filter(function(p){return p[0]<=o.pos;}); cut.push([o.pos,elevAt(o.pos)]); s+='<path d="'+pts(cut)+' L'+X(o.pos)+','+bot+' L'+X(0)+','+bot+'Z" fill="'+line+'" fill-opacity=".4"/>';}
  s+='<path d="'+d+'" fill="none" stroke="'+line+'" stroke-width="2.4" stroke-linejoin="round"/>';
  [[30,32.6],[33.9,35.6]].forEach(function(t){s+='<path d="'+pts(PROFILE.filter(function(p){return p[0]>=t[0]&&p[0]<=t[1];}))+'" fill="none" stroke="'+trap+'" stroke-width="3.6" stroke-linecap="round"/>';});
  CP.slice(0,3).forEach(function(c,i){s+='<line x1="'+X(c.km)+'" x2="'+X(c.km)+'" y1="'+(top-8)+'" y2="'+bot+'" stroke="'+txt+'" stroke-dasharray="2 3" stroke-width="1"/><text x="'+X(c.km)+'" y="'+(top-11)+'" text-anchor="middle" font-size="10" font-weight="700" fill="'+txt+'">R'+(i+1)+'</text>';});
  if(o.pos!=null)s+='<circle cx="'+X(o.pos)+'" cy="'+Y(elevAt(o.pos))+'" r="6" fill="'+line+'" stroke="'+(dark?"#0B0F0D":"var(--card)")+'" stroke-width="3"/>';
  [0,10,20,30,TOTAL].forEach(function(k){s+='<text x="'+Math.min(W-14,Math.max(14,X(k)))+'" y="'+(H-6)+'" text-anchor="middle" font-size="10" fill="'+txt+'">'+(k===TOTAL?"38,8":k)+'</text>';});
  if(o.id)s+='<line id="profcur" x1="0" x2="0" y1="'+(top-8)+'" y2="'+bot+'" stroke="'+line+'" stroke-width="1.5" style="display:none"/><circle id="profdot" r="5" fill="'+line+'" stroke="var(--card)" stroke-width="2" style="display:none"/>';
  return s+'</svg>';
}
function bindProfile(){
  var svg=$("profsvg"); if(!svg)return; var cur=$("profcur"),dot=$("profdot"),info=$("profinfo");
  var W=360,H=170,top=26,bot=H-22,Y=function(e){return bot-(e-490)/(920-490)*(bot-top);};
  function at(cx){var r=svg.getBoundingClientRect(), x=(cx-r.left)/r.width*W, km=Math.max(0,Math.min(TOTAL,(x-10)/(W-20)*TOTAL));
    var sx=10+km/TOTAL*(W-20); cur.setAttribute("x1",sx); cur.setAttribute("x2",sx); cur.style.display=""; dot.setAttribute("cx",sx); dot.setAttribute("cy",Y(elevAt(km))); dot.style.display="";
    var nx=CP.filter(function(c){return c.km>km+0.05;})[0];
    info.textContent="Km "+kmS(km)+" · "+Math.round(elevAt(km))+" m · +"+dplus(0,km)+" m depuis le départ · passage visé "+hm(cumMin(km))+(nx&&nx.km<TOTAL?" · ravito "+nx.n+" dans "+kmS(nx.km-km)+" km":"");
    info.classList.remove("muted");}
  function hide(){cur.style.display="none";dot.style.display="none";info.textContent="Touche le profil : km, altitude, D+ et passage visé.";info.classList.add("muted");}
  svg.addEventListener("pointermove",function(e){at(e.clientX);});
  svg.addEventListener("pointerdown",function(e){at(e.clientX);});
  svg.addEventListener("pointerleave",function(e){if(e.pointerType==="mouse")hide();});
}

// ---------- vues ----------
var editRes=false, tab="today", cur=nowWeek(), sel=defaultSel(), browsing=false, openWk=null, prevTab="today", resetArmed=false;
function defaultSel(){var i=todayIdx(); return i<0?1:i<182?i%7:raceDow();}
function goNow(){cur=nowWeek(); sel=defaultSel(); browsing=false;}

function vToday(){
  var ph=phase();
  if(browsing||ph==="prep")return vPrep();
  if(ph==="taper")return vTaper();
  if(ph==="race")return vRaceDay();
  return vAfter();
}

function vPrep(){
  var p=P(cur), ti=todayIdx(), tw=ti>=0?Math.floor(ti/7)+1:0, td=ti>=0?ti%7:-1;
  var selD=dateOf(cur,sel), isToday=iso(selD)===iso(new Date(todayUTC()));
  var h=header(fmtL(new Date(todayUTC()))+" · "+jx(), isToday?"Aujourd’hui":fmtL(selD));
  h+=banners();
  if(ti<0)h+='<div class="banner">Le plan démarre le lundi 9 novembre, dans '+(-ti)+' jour'+(-ti>1?"s":"")+'. Tu peux déjà parcourir les semaines.</div>';
  if(browsing&&phase()!=="prep")h+='<div class="banner">Tu consultes le plan. <button class="btn sm" data-act="now" style="margin-top:8px">Revenir à aujourd’hui</button></div>';
  h+=syncLine();
  h+='<div class="wknav"><button data-act="wk" data-d="-1" aria-label="Semaine précédente"'+(cur<=1?" disabled":"")+'>‹</button><div><span class="eyebrow">Semaine '+cur+' sur 26 · '+p.ph+(p.rec?' · allégée':'')+'</span><b>'+fmtS(dateOf(cur,0))+' – '+fmtS(dateOf(cur,6))+'</b></div><button data-act="wk" data-d="1" aria-label="Semaine suivante"'+(cur>=26?" disabled":"")+'>›</button></div>';
  h+='<div class="strip" role="group" aria-label="Jours de la semaine">';
  for(var i=0;i<7;i++){var s0=sessOf(p,i), dn=s0&&D.done[cur+"-"+s0.k], tdy=cur===tw&&i===td;
    h+='<button class="day'+(s0?" has":"")+(dn?" done":"")+(tdy?" today":"")+'" data-day="'+i+'" aria-pressed="'+(sel===i)+'" aria-label="'+DOWL[i]+' '+dateOf(cur,i).getUTCDate()+(s0?", "+esc(s0.type):", repos")+(dn?", faite":"")+'"><span>'+DL[i]+'</span><b>'+dateOf(cur,i).getUTCDate()+'</b><i></i></button>';}
  h+='</div>';
  h+=adjHTML(cur);
  var s=sessOf(p,sel); h+=cycleBanner(cur,sel,s);
  if(!s){
    h+='<div class="card"><span class="eyebrow">Semaine '+cur+' · '+p.ph+'</span><h3 style="font-size:26px;margin:4px 0 8px">Repos</h3><p>Pas de course aujourd’hui. Dix minutes de mobilité suffisent.</p><details open><summary>'+I.leaf+' Routine de mobilité</summary><div class="in">'+exHTML(MOB)+'</div></details><details><summary>Nutrition d’un jour de repos</summary><div class="in">'+nutHTML("rest")+'</div></details></div>';
  }else{
    h+=sessionHero(p,s)+sessionExtras(p,s);
  }
  h+=weekCard(p);
  h+=ciHTML(cur);
  if(NOTES[cur])h+='<div class="coach"><span class="eyebrow">Le mot du coach · semaine '+cur+'</span>'+esc(NOTES[cur])+'</div>';
  h+=weekReport(p);
  return h;
}
function sessionHero(p,s){
  var k=p.n+"-"+s.k, dn=!!D.done[k], z=(ZONE[s.type]||"").split(" · ")[0], ed=estDur(s);
  var h='<div class="card hero"><span class="eyebrow">'+fmtL(dateOf(p.n,s.dow))+'</span><h2>'+esc(s.type)+'</h2>';
  var tags=[]; if(s.adjusted&&p.adjLabel)tags.push(p.adjLabel); if(s.club)tags.push("Club : 15 km, 2 h, +500 m minimum");
  if(tags.length)h+='<div class="tagline">'+tags.map(function(t){return '<span class="chip">'+esc(t)+'</span>';}).join("")+'</div>';
  h+='<div class="facts num">'+(s.km?'<span>'+kmS(s.km)+' km</span>':'')+(s.dp?'<span>+'+nb(s.dp)+' m</span>':'')+(z?'<span>'+esc(z)+'</span>':'')+(ed&&s.k!=="thu"&&!s.race?'<span>≈ '+dur(ed)+'</span>':'')+'</div>';
  if(WHY[s.type])h+='<div class="why"><b>Pourquoi :</b> '+esc(WHY[s.type])+'</div>';
  if(s.pace)h+='<p><b>'+esc(s.pacel||"Allure tempo")+' :</b> '+esc(s.pace)+'</p>';
  h+='<p>'+esc(s.txt)+'</p>';
  var a=adjFor(p.n); if(a&&a.mode==="z2"&&(s.tag==="e"||s.tag==="l"))h+='<p><b>Zone 2 stricte cette semaine :</b> reste sous 150 bpm, marche si besoin.</p>';
  if(s.tag==="l"&&s.km>=14&&!s.race)h+='<p>À tester aujourd’hui : 40 à 60 g de glucides par heure (un gel de 22 g toutes les 30 à 40 min).</p>';
  if(s.race){h+='<button class="btn" data-go="today-race">'+I.play+' Voir le jour J</button>';}
  else h+='<button class="btn'+(dn?" isdone":"")+'" data-done="'+k+'">'+I.check+(dn?' Faite · toucher pour annuler':' C’est fait')+'</button><p class="sub">'+(D.actual[k]?'Chiffres reçus : le bilan est plus bas.':'Le bilan arrive tout seul quand Strava reçoit ta sortie.')+'</p>';
  return h+'</div>';
}
function sessionExtras(p,s){
  if(s.race)return "";
  var k=p.n+"-"+s.k, ac=D.actual[k], h="";
  if(ac){var r=review(s,ac), b=BADGE[r.lvl];
    h+='<div class="card review"><div class="verdict"><h3>Bilan du coach</h3><span class="chip '+b[0]+'">'+b[1]+'</span></div>'+
      '<div class="stats num"><div class="stat"><b>'+kmS(ac.km)+'</b><span>km · prévu '+kmS(s.km)+'</span></div><div class="stat"><b>+'+nb(ac.dp||0)+'</b><span>m · prévu '+nb(s.dp)+'</span></div><div class="stat"><b>'+(ac.t?mmss(ac.t/ac.km):"–")+'</b><span>/km'+(ac.t?' · '+dur(ac.t):'')+'</span></div></div>'+
      '<ul>'+r.lines.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ul><p class="muted xs" style="margin:8px 0 0">Source : '+(ac.src==="manual"?'saisie à la main · <button class="rm-ghost" style="color:var(--brand);min-height:0;padding:0" data-act="delactual" data-k="'+k+'">effacer</button>':ac.src==="csv"?'import CSV':'Strava')+'</p></div>';}
  h+='<div class="card"><h3>Pour cette séance</h3>';
  if(s.renfo){var rf=RENFO[s.renfo]; h+='<details><summary>'+I.dumb+' '+esc(rf.name)+'</summary><div class="in"><p class="muted small">'+esc(rf.tours)+'</p>'+exHTML(rf.ex)+'<h4>Mobilité après la séance</h4>'+exHTML(MOB.slice(0,4))+'</div></details>';}
  h+=localHTML(s);
  h+='<details><summary>'+I.leaf+' Nutrition du jour</summary><div class="in">'+nutHTML(s.nut)+'</div></details>';
  h+='<details><summary>'+I.up+' '+(ac&&ac.src==="manual"?'Corriger mes chiffres':'Saisir mes chiffres à la main')+'</summary><div class="in"><p class="muted small">Sans Strava, ou pour corriger. Le coach compare avec le prévu.</p><div class="fields"><label class="field">Km<input inputmode="decimal" id="mKm" value="'+(ac?kmS(ac.km):"")+'" placeholder="'+kmS(s.km)+'"></label><label class="field">D+ (m)<input inputmode="numeric" id="mDp" value="'+(ac&&ac.dp?ac.dp:"")+'" placeholder="'+(s.dp||0)+'"></label><label class="field">Durée<input id="mT" value="'+(ac&&ac.t?Math.floor(ac.t/3600)+":"+pz(Math.round(ac.t%3600/60)):"")+'" placeholder="1:05"></label></div><button class="btn primary" data-act="manual" data-k="'+k+'">Enregistrer</button></div></details>';
  return h+'</div>';
}
function weekCard(p){
  var pk=0,ak=0; p.s.forEach(function(s){if(s.race)return; pk+=s.km; var ac=D.actual[p.n+"-"+s.k]; if(ac)ak+=ac.km; else if(D.done[p.n+"-"+s.k])ak+=s.km;});
  var n=weekDone(p), sc=p.s.length;
  var h='<div class="card"><div class="sb"><h3 style="margin:0">Ta semaine</h3><span class="chip'+(n===sc?" ok":"")+'">'+n+' / '+sc+' séances</span></div><div class="sb num small" style="margin:8px 0 6px"><span>'+kmS(ak)+' / '+kmS(pk)+' km</span><span class="muted">+'+nb(p.dp)+' m prévus</span></div><div class="bar"><i style="width:'+Math.min(100,pk?ak/pk*100:0)+'%"></i></div><div style="margin-top:8px">';
  p.s.forEach(function(s){var k=p.n+"-"+s.k, on=!!D.done[k]; h+='<button class="link" data-day="'+s.dow+'"><span class="ico'+(on?" ok":"")+'">'+(on?I.check:DOW[s.dow])+'</span><span class="tx"><b>'+esc(s.type)+'</b><small>'+DOWL[s.dow]+' '+dateOf(p.n,s.dow).getUTCDate()+(s.km?' · '+kmS(s.km)+' km':'')+(s.dp?' · +'+nb(s.dp)+' m':'')+'</small></span><span class="chev">›</span></button>';});
  return h+'</div></div>';
}
function ciHTML(w){
  if(!D.set.checkin)return ""; var ti=todayIdx(); if(ti<0||ti>=175||w!==nowWeek()||w<2)return "";
  var c=D.ci[w]||{};
  function row(f,label,list){return '<div class="ci-row"><span>'+label+'</span><div class="opts">'+list.map(function(x){return '<button data-ci="'+f+'" data-v="'+x[0]+'" aria-pressed="'+(c[f]===x[0])+'">'+x[1]+'</button>';}).join("")+'</div></div>';}
  var filled=c.sleep||c.legs||c.feel;
  return '<div class="card"><h3>Check-in de la semaine</h3><p class="small muted">'+(filled?'Merci. Le coach ajuste la semaine avec tes réponses (carte en haut).':'10 secondes, idéalement le lundi. Le coach s’en sert pour ajuster la semaine.')+'</p>'+
    row("sleep","Sommeil",[["bien","Bien"],["moyen","Moyen"],["mauvais","Mauvais"]])+row("legs","Jambes",[["legeres","Légères"],["normales","Normales"],["lourdes","Lourdes"]])+row("feel","Semaine passée",[["ok","Ça va"],["dur","Dure"],["trop","Trop dure"]])+'</div>';
}
function adjHTML(w){
  var a=adjFor(w); if(!a)return "";
  var B={normal:["ok","Plan normal"],light:["warn","Semaine allégée"],z2:["warn","Zone 2 stricte"],micro:["warn","Micro-récupération"]}[a.mode], st=D.adj[w], dec=(a.mode==="light"||a.mode==="micro");
  var body='<h4>Pourquoi</h4><ul class="pts">'+a.reasons.map(function(r){return '<li><b>'+esc(r.k)+'</b> · '+esc(r.v)+'<br><span class="muted">'+esc(r.r)+'</span></li>';}).join("")+'</ul><h4>Ce que ça change</h4><ul class="pts">'+a.eff.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ul>';
  var head='<div class="verdict"><h3>Ajustement du coach</h3><span class="chip '+B[0]+'">'+B[1]+'</span></div>';
  if(dec&&st!=="on"&&st!=="off")return '<div class="card">'+head+'<p><b>'+esc(a.lead)+'</b> '+esc(a.prop)+'</p>'+body+'<div class="row" style="margin-top:10px"><button class="btn primary sm" data-adj="on">Appliquer</button><button class="btn sm" data-adj="off">Garder le plan normal</button></div></div>';
  var state=dec?(st==="on"?"Ajustement appliqué à cette semaine.":"Plan normal gardé."):(a.mode==="z2"?"Actif automatiquement cette semaine.":"");
  var act=dec?(st==="on"?'<button class="btn sm" data-adj="off">Annuler l’ajustement</button>':'<button class="btn sm" data-adj="reset">Revoir la proposition</button>'):"";
  return '<div class="card">'+head+'<p class="small">'+esc(a.lead)+' '+esc(a.prop)+(state?' <b>'+esc(state)+'</b>':'')+'</p><details><summary>Voir pourquoi</summary><div class="in">'+body+'</div></details>'+(act?'<div class="row" style="margin-top:4px">'+act+'</div>':'')+'</div>';
}
function weekReport(p){
  var st=weekStats(p), n=st.n; if(!n)return "";
  var msg, sc=p.s.filter(function(s){return !s.race;}).length;
  if(st.fast>=2)msg="Tes sorties faciles sont trop rapides. Elles doivent rester en zone 2 : c’est là que tu construis l’endurance sans t’abîmer.";
  else if(st.pc<75)msg="Volume en retrait cette semaine. Ne rattrape pas tout d’un coup : reprends le plan à la prochaine séance.";
  else if(st.pd&&st.ad/st.pd<0.75)msg="Il manque du dénivelé. Privilégie les côtes mardi et le sentier le week-end.";
  else if(st.pc>120)msg="Tu as fait plus que prévu. Garde de la fraîcheur, la progression vient de la régularité.";
  else msg="Semaine dans la cible. Continue comme ça.";
  var cyc=(D.cycle.on&&weekHasPeriod(p.n))?'<p class="small">Cette semaine coïncidait avec ta phase menstruelle : si certaines séances ont paru plus dures, c’est cohérent.</p>':"";
  return '<div class="card"><h3>Bilan de la semaine</h3><div class="stats num"><div class="stat"><b>'+n+' / '+sc+'</b><span>séances lues</span></div><div class="stat"><b>'+st.pc+' %</b><span>du volume prévu</span></div><div class="stat"><b>'+st.c[0]+'</b><span>en cible</span></div></div><p class="small">'+esc(msg)+'</p>'+cyc+(n<sc?'<p class="muted xs">Bilan provisoire : '+n+' séance'+(n>1?'s':'')+' sur '+sc+'.</p>':'')+'</div>';
}

// --- semaine de course ---
function vTaper(){
  var j=daysToRace(), rd=new Date(raceUTC());
  var h=header(fmtL(new Date(todayUTC()))+" · semaine de course","Affûtage");
  h+=banners();
  h+='<div class="card"><div class="count"><b class="num">J-'+j+'</b><span><b style="font-family:var(--display);font-size:20px">THP40</b><br><span class="muted small">'+fmtL(rd).toLowerCase()+' · '+D.set.raceTime+' · Forcalquier</span></span></div><p class="small" style="margin:10px 0 0">Volume au plus bas, même intensité. Les jambes doivent se sentir légères le jour J.</p></div>';
  var ti=todayIdx(), w=Math.min(26,Math.floor(ti/7)+1), p=P(w), s=ti>=0&&ti<182?sessOf(p,ti%7):null;
  if(s&&!s.race){var k=w+"-"+s.k, dn=!!D.done[k]; h+='<div class="card"><div class="sb"><span class="eyebrow">Séance du jour</span>'+(dn?'<span class="chip ok">Faite</span>':'')+'</div><h3 style="margin:4px 0">'+esc(s.type)+(s.km?' · '+kmS(s.km)+' km':'')+'</h3><p class="small">'+esc(s.txt)+'</p><div class="row"><button class="btn sm'+(dn?'':' primary')+'" data-done="'+k+'">'+(dn?'Annuler':'C’est fait')+'</button><button class="btn sm" data-act="browse" data-w="'+w+'" data-d="'+(ti%7)+'">Détails</button></div></div>';}
  var bk=Object.keys(D.kit).filter(function(x){return D.kit[x];}).length;
  var T=[[-7,["Sortie test avec la tenue complète","Valider gels et sac sur 1 h 30"]],[-5,["Mobilité 10 min","Relire le règlement 2027 et la liste du matériel","Confirmer le jour et l’heure de départ"]],[-4,["Rappel : 6 km Z2 + 4 × 20 s allure course"]],[-2,["Charger la montre, y mettre la trace GPX","Ouvrir cette appli une fois : elle marche ensuite hors ligne"]],[-1,["Retrait du dossard à Forcalquier","≈ 480 g de glucides, peu de fibres","Préparer le sac : matériel "+bk+" / "+KIT.length]],[0,["Petit-déjeuner 3 h avant","Arriver 1 h avant le départ"]]];
  h+='<div class="card"><h3>D’ici le jour J</h3><ul class="tl">'+T.map(function(t){var dd=new Date(raceUTC()+t[0]*864e5), cls=-j>t[0]?"past":-j===t[0]?"now":"";
    return '<li class="'+cls+'"><h4>'+(t[0]?"J"+t[0]:"Jour J")+'<span>'+(cls==="now"?"aujourd’hui":fmtL(dd).toLowerCase())+'</span></h4>'+t[1].map(function(x,ii){return todoBtn("t"+t[0]+"-"+ii,esc(x));}).join("")+'</li>';}).join("")+'</ul></div>';
  h+=kitCard();
  h+='<div class="card"><h3>Tes repères</h3>'+cpTable()+'</div>';
  return h;
}
function kitCard(open){
  var bk=Object.keys(D.kit).filter(function(x){return D.kit[x];}).length;
  return '<div class="card"><h3>Matériel obligatoire</h3><div class="sb num small" style="margin-bottom:6px"><span>'+bk+' / '+KIT.length+' prêts</span><span class="muted">règlement 2025, à revérifier</span></div><div class="bar"><i style="width:'+Math.round(bk/KIT.length*100)+'%"></i></div><details'+(open?" open":"")+' id="kitd"><summary>Voir la liste</summary><div class="in">'+KIT.map(function(x,i){return todoBtn(String(i),esc(x),D.kit);}).join("")+'</div></details></div>';
}
function cpTable(){return '<table class="tbl num"><tr><th>Ravito</th><th>Km</th><th>Passage</th></tr>'+CP.map(function(c){return '<tr><td>'+c.n+'</td><td>'+kmS(c.km)+'</td><td><b>'+hm(cumMin(c.km))+'</b><br><span class="muted xs">vers '+tod(cumMin(c.km))+'</span></td></tr>';}).join("")+'</table>';}

// --- jour J ---
function vRaceDay(){
  var h=header(fmtL(new Date(todayUTC())),"Jour J");
  h+=banners();
  var R0=D.race, running=R0&&R0.t0&&!R0.done;
  if(R0&&R0.done)return h+resultsHTML(true);
  h+='<div class="card hero"><span class="eyebrow">THP40 · Forcalquier · départ '+D.set.raceTime+'</span><h2>'+(running?"Tu es en course.":"C’est aujourd’hui.")+'</h2><div class="facts num"><span>38,8 km</span><span>+1 279 m</span><span>objectif '+hm(goal())+'</span></div>'+
     '<div class="why">Départ prudent, mange avant d’avoir faim, garde des jambes pour le km 30.</div>'+
     '<button class="btn" data-race="race" style="min-height:64px;font-size:18px">'+I.play+(running?' Reprendre le mode Course · '+hms((Date.now()-R0.t0)/1000):' Lancer le mode Course')+'</button>'+
     '<p class="sub">Fonctionne sans réseau. L’écran reste allumé tant que le mode est ouvert.</p></div>';
  h+='<div class="card"><h3>Ce matin</h3>'+["Petit-déjeuner pris (3 h avant)","Dossard épinglé, puce vérifiée","Gels dans les poches avant","Montre : trace lancée, GPS fixé","Téléphone chargé, cette appli ouverte une fois"].map(function(x,i){return todoBtn("rd"+i,x);}).join("")+'</div>';
  h+='<div class="card"><h3>Tes repères</h3>'+cpTable()+'</div>';
  h+=kitCard();
  return h;
}

// --- après la course ---
function vAfter(){
  var j=-daysToRace(), h=header(fmtL(new Date(todayUTC()))+" · J+"+j, D.result?"Bilan de course":"Après la course");
  h+=banners();
  return h+resultsHTML(false);
}
function stravaRace(){var d=D.set.raceDate; return (D.sync.runs||[]).filter(function(r){return r.date===d&&r.km>=25;})[0]||null;}
function resultsHTML(today){
  var h="", Rr=D.result, sr=stravaRace(), editing=!Rr||editRes;
  if(Rr&&Rr.splits&&Rr.splits.length){
    var S=Rr.splits, fin=S[S.length-1], full=S.length===4, d=fin-goal();
    h+='<div class="card"><span class="eyebrow">THP40 · terminé</span><div class="count" style="margin-top:6px;flex-wrap:wrap"><b class="num" style="font-size:52px">'+hmc(fin)+'</b><span class="chip '+(d<=0?"ok":d<=10?"warn":"off")+'">'+sgn(d)+' sur l’objectif ('+hm(goal())+')</span></div>'+(sr?'<p class="small muted" style="margin:8px 0 0">Strava : '+kmS(sr.km)+' km · +'+nb(sr.dp)+' m · '+dur(sr.t)+'</p>':'')+(full?'':'<p class="small muted" style="margin:8px 0 0">Ajoute tes temps aux ravitos pour voir le détail section par section.</p>')+'</div>';
    if(full){
      var prev=0,prevT=0,worst=-1,wv=-1e9;
      var rows=CP.map(function(c,i){var plan=cumMin(c.km)-cumMin(prev),real=S[i]-prevT,diff=real-plan; if(diff>wv){wv=diff;worst=i;} var r={c:c,plan:plan,real:real,diff:diff}; prev=c.km; prevT=S[i]; return r;});
      var mx=Math.max.apply(null,rows.map(function(r){return Math.max(r.plan,r.real);}));
      h+='<div class="card"><h3>Section par section</h3>'+rows.map(function(r,i){return '<div style="padding:8px 0;border-top:'+(i?'1px solid var(--line)':'0')+'"><div class="sb small"><b>'+SECT[i].n+'</b><span class="chip '+(r.diff<=0.5?"ok":r.diff<=3?"warn":"off")+'">'+sgn(r.diff)+'</span></div>'+
        '<div style="margin-top:6px;display:grid;gap:3px"><div class="bar" style="height:6px;background:none"><i style="width:'+(r.plan/mx*100)+'%;background:var(--line)"></i></div><div class="bar" style="height:6px;background:none"><i style="width:'+(r.real/mx*100)+'%"></i></div></div>'+
        '<div class="small muted num" style="margin-top:4px">prévu '+hm(r.plan)+' · réel '+hm(r.real)+' · +'+r.c.up+' / −'+r.c.dn+' m</div></div>';}).join("")+
        '<div class="legend"><span><i style="background:var(--line)"></i>Prévu</span><span><i style="background:var(--brand)"></i>Réel</span></div></div>';
      h+='<div class="card"><h3>Là où ça a basculé</h3><p style="margin:0">'+(wv>2?'Tu as perdu le plus de temps entre '+(worst?CP[worst-1].n:"le départ")+' et '+(worst===3?"l’arrivée":CP[worst].n)+' ('+sgn(wv)+')'+(worst===3?', là où se trouvent la descente raide du km 30 et la montée du km 34. Pour la prochaine course : plus de descentes techniques en phase spécifique.':'.'):'Course très régulière : aucune section ne s’écarte de plus de 2 min du plan.')+'</p></div>';
    }
    if(!editing)h+='<button class="btn sm" data-act="editres" style="margin:0 auto 12px">'+(full?'Corriger mes temps':'Ajouter mes temps de passage')+'</button>';
  }
  if(editing){
    var S2=(Rr&&Rr.splits)||[], val=function(i){var m=S2.length===4?S2[i]:(i===3&&S2.length===1?S2[0]:(i===3&&sr&&!Rr?sr.t/60:null)); return m==null?"":hmc(m).replace("h",":");};
    h+='<div class="card"><h3>'+(Rr?"Mes temps":"Ton temps")+'</h3><p class="small muted">'+(sr&&!Rr?'Strava a reçu '+kmS(sr.km)+' km en '+dur(sr.t)+'. ':'')+'Temps depuis le départ, en heures:minutes. Remplis les quatre, ou seulement l’arrivée.</p>'+
      CP.map(function(c,i){return '<div class="fields" style="margin:4px 0"><label class="field">'+(i<3?c.n+' · km '+kmS(c.km):'Arrivée · 38,8 km')+'<input id="rs'+i+'" inputmode="numeric" placeholder="'+hmc(cumMin(c.km)).replace("h",":")+'" value="'+val(i)+'"></label></div>';}).join("")+
      '<div class="row" style="margin-top:8px"><button class="btn primary" data-act="saveres">Enregistrer</button>'+(Rr?'<button class="btn" data-act="canceres">Annuler</button>':'')+'</div></div>';
  }
  h+='<div class="card"><h3>Récupération</h3>'+[["J+1 à J+3","Marche, mobilité douce, pas de course."],["J+4 à J+7","Footings de 30 min en zone 1-2 si les jambes sont bonnes."],["J+8","Retour au club, sans séance dure."]].map(function(x){return '<div class="ex"><span><b>'+x[0]+'</b></span><span style="max-width:62%">'+x[1]+'</span></div>';}).join("")+'</div>';
  var t=totals();
  h+='<div class="card"><h3>Ta préparation</h3><div class="stats num"><div class="stat"><b>'+t.d+'</b><span>séances faites sur '+t.t+'</span></div><div class="stat"><b>'+kmS(sumKm())+'</b><span>km courus (Strava)</span></div><div class="stat"><b>'+nb(sumDp())+'</b><span>m de D+</span></div></div><button class="btn sm" data-act="export" style="margin-top:6px">Exporter mes données</button></div>';
  return h;
}
function planRuns(){var a=dateOf(1,0).getTime(), b=raceUTC(); return (D.sync.runs||[]).filter(function(r){var t=Date.parse(r.date+"T00:00:00Z"); return t>=a&&t<b;});}
function sumKm(){return planRuns().reduce(function(s,r){return s+r.km;},0);}
function sumDp(){return planRuns().reduce(function(s,r){return s+(r.dp||0);},0);}

// --- onglet Plan ---
function vPlan(){
  var cw=nowWeek(), ti=todayIdx(), t=totals();
  var h=header("26 semaines · 9 nov. → "+fmtS(new Date(raceUTC())),"Le plan");
  var Ph=[["Base",8,"#B3A6FF"],["Construction",8,"#8C79F0"],["Spécifique",7,"#5B47C9"],["Affûtage",3,"#2E2373"]];
  h+='<div class="card"><div class="phases">'+Ph.map(function(p){return '<div style="flex:'+p[1]+';background:'+p[2]+'"></div>';}).join("")+'</div><div class="phlab">'+Ph.map(function(p){return '<span>'+p[0]+'</span>';}).join("")+'</div>'+
    '<p class="small" style="margin:10px 0 6px">'+(ti<0?'Le plan démarre lundi 9 novembre.':ti>=182?'Plan terminé. Bravo.':'Tu es en semaine <b>'+cw+'</b>, phase <b>'+phaseOf(cw).toLowerCase()+'</b>.')+'</p><div class="sb small num"><span>'+t.d+' / '+t.t+' séances faites</span><span class="muted">'+Math.round(t.d/t.t*100)+' %</span></div><div class="bar" style="margin-top:6px"><i style="width:'+(t.d/t.t*100)+'%"></i></div></div>';
  var mx=0; PLAN.forEach(function(p){mx=Math.max(mx,P(p.n).km);});
  h+='<div class="card" style="padding-top:6px">'; var last="";
  PLAN.forEach(function(p0){var p=P(p0.n), w=p.n, isCur=w===cw&&ti>=0&&ti<182;
    if(p.ph!==last){h+='<span class="eyebrow" style="padding:12px 0 4px">'+p.ph+'</span>';last=p.ph;}
    var km=w===26?TOTAL:p.km;
    h+='<button class="wk'+(isCur?" cur":"")+(p.rec?" rec":"")+'" data-wk="'+w+'" aria-expanded="'+(openWk===w)+'"><span class="n">'+w+'</span><span><span class="d">'+fmtS(dateOf(w,0))+' – '+fmtS(dateOf(w,6))+(p.rec?' · allégée':'')+(p.adjLabel?' · <b style="color:var(--warn)">'+esc(p.adjLabel)+'</b>':'')+(isCur?' · <b style="color:var(--brand)">en cours</b>':'')+'</span><div class="b" style="width:'+(w===26?20:p.km/mx*100)+'%"></div></span><span class="k num">'+(w===26?'Course':p.km+' km')+'<small>'+weekDone(p)+'/'+p.s.length+' faites</small></span></button>';
    if(openWk===w){h+='<div class="wkx">'+p.s.map(function(s){var on=!!D.done[w+"-"+s.k]; return '<button class="ses" data-goto="'+w+'-'+s.dow+'"><span class="ck'+(on?" on":"")+'">'+(on?I.check:"")+'</span><span class="dw">'+DOW[s.dow]+'</span><span class="ty">'+esc(s.type)+'</span><span class="num muted">'+(s.km?kmS(s.km)+' km':'')+(s.dp?' · +'+nb(s.dp):'')+'</span></button>';}).join("")+(NOTES[w]?'<p class="small muted" style="margin:6px 0 0">'+esc(NOTES[w])+'</p>':'')+'</div>';}
  });
  return h+'</div>';
}

// --- onglet Ma course ---
var RJsel=0;
function vCourse(){
  var rd=new Date(raceUTC()), h=header("Ta course","Ma course");
  h+='<div class="race"><span class="tag">A</span><span style="flex:1"><b style="font-family:var(--display);font-size:19px">THP40 · Trail de Haute Provence</b><br><span class="small muted">'+fmtL(rd).toLowerCase()+' · '+D.set.raceTime+' · 38,8 km · +1 279 m</span></span><span class="chip">'+jx()+'</span></div>';
  h+='<div class="card"><h3>Objectif</h3><div class="goal"><b class="num" id="goalv">'+hm(goal())+'</b><input type="range" id="goal" min="240" max="360" step="5" value="'+goal()+'" aria-label="Objectif de temps"></div><p class="small muted" style="margin:0">'+projRange()+'Temps de passage, allures et mode Course suivent cet objectif.</p></div>';
  h+='<div class="card"><h3>Le parcours</h3>'+profileSVG({id:"profsvg"})+'<div id="profinfo" class="profinfo muted">Touche le profil : km, altitude, D+ et passage visé.</div><div class="legend"><span><i style="background:var(--brand)"></i>Profil</span><span><i style="background:var(--off)"></i>Pièges km 30 et 34</span><span>R = ravito</span></div><ul class="pts" style="margin-top:10px"><li><b>Km 0 à 10</b> · vallonné, reste prudente.</li><li><b>Km 10 à 15</b> · longue montée jusqu’à environ 890 m.</li><li><b>Km 15 à 28</b> · alternance de montées et descentes.</li><li><b>Km 30</b> · piège 1 : descente à environ −13 %.</li><li><b>Km 34</b> · piège 2 : montée à environ +12 %, jambes fatiguées.</li><li><b>Fin</b> · ça descend jusqu’à Forcalquier.</li></ul><p class="muted xs" style="margin:6px 0 0">D’après la trace de l’édition 2026. Parcours et postes 2027 à confirmer dans le roadbook.</p></div>';
  h+='<div class="card"><h3>Temps de passage</h3><div id="passwrap">'+passHTML()+'</div></div>';
  h+='<div class="card"><h3>Stratégie</h3><div id="stratwrap">'+stratHTML()+'</div></div>';
  h+='<div class="card"><h3>Nutrition et hydratation</h3><ul class="pts"><li>Glucides : 40 à 60 g par heure, par exemple un gel de 22 g toutes les 30 à 40 min, complété par le solide des ravitaillements.</li><li>Eau : bois régulièrement et à chaque ravitaillement, davantage s’il fait chaud. 1,5 L minimum sur toi, c’est obligatoire.</li><li>Sel : à ajouter par temps chaud, comme tu l’auras testé.</li><li>Rien de nouveau le jour J.</li></ul></div>';
  h+=projCard();
  h+=kitCard();
  h+='<div class="card"><h3>Répéter le mode Course</h3><p class="small muted">Essaie l’écran de course pendant une sortie longue : chrono, ravitos, rappels de gel. Rien n’est gardé dans ton bilan.</p><button class="btn" data-race="practice">'+I.play+' Essayer le mode Course</button></div>';
  return h;
}
function projOf(a){var ke=a.km+(a.dp||0)/100, pk=a.t/ke; return pk*RACEKE/60;}
function projRuns(){var lim=todayUTC()-56*864e5; return (D.sync.runs||[]).filter(function(r){return r.km>=10&&r.t>0&&Date.parse(r.date+"T00:00:00Z")>=lim;});}
function projRange(){var p=projRuns().map(projOf); if(p.length<2)return ""; p.sort(function(a,b){return a-b;}); return 'Projection brute d’après tes sorties des 8 dernières semaines : '+hm(p[0])+' à '+hm(p[p.length-1])+'. ';}
function projCard(){
  var runs=(D.sync.runs||[]).filter(function(r){return r.km>=10&&r.t>0;}).slice().reverse();
  var h='<div class="card"><h3>Ton allure vs objectif</h3>';
  if(!runs.length)return h+'<p class="small">Synchronise Strava (ou importe un CSV dans Réglages) pour comparer tes sorties de 10 km et plus à ton objectif.</p><button class="btn sm" data-act="sync">'+I.sync+' Synchroniser</button></div>';
  var i=Math.min(RJsel,runs.length-1), a=runs[i], tot=projOf(a), diff=goal()-tot, pk=a.t/(a.km+(a.dp||0)/100);
  h+='<label class="field" style="margin-bottom:10px">Sortie comparée<select id="rjsel">'+runs.slice(0,20).map(function(r,k){return '<option value="'+k+'"'+(k===i?" selected":"")+'>'+fmtS(new Date(r.date+"T00:00:00Z"))+' · '+kmS(r.km)+' km · +'+nb(r.dp||0)+' m</option>';}).join("")+'</select></label>';
  h+='<div class="stats num"><div class="stat"><b>'+mmss(pk)+'</b><span>par km-effort</span></div><div class="stat"><b>'+mmss(eff())+'</b><span>cible '+hm(goal())+'</span></div><div class="stat"><b>'+mmss(a.t/a.km)+'</b><span>par km</span></div></div>';
  h+='<p class="small"><b>À ce rythme, le THP40 prendrait '+hm(tot)+'</b>, soit '+(diff>=0?Math.round(diff)+' min d’avance':Math.round(-diff)+' min de retard')+' sur l’objectif.</p><p class="muted xs" style="margin:0">Projection brute, sans la fatigue d’une course de 38,8 km'+(a.km<20?' (sortie de '+kmS(a.km)+' km seulement, à prendre avec prudence)':'')+'. 1 km-effort = 1 km + 100 m de D+.</p></div>';
  return h;
}
function passHTML(){
  var h='<p class="small" style="margin:0 0 8px">Allure moyenne : <b>'+mmss(goal()*60/TOTAL)+'/km</b>, soit <b>'+mmss(eff())+' par km-effort</b>.</p><table class="tbl num"><tr><th>Section</th><th>D+ / D−</th><th>Passage</th></tr>';
  SECT.forEach(function(x){var t1=cumMin(x.b), dm=t1-cumMin(x.a); h+='<tr><td>'+esc(x.n)+'<br><span class="muted xs">'+kmS(x.b-x.a)+' km · '+mmss(dm*60/(x.b-x.a))+'/km</span></td><td>+'+x.up+' / −'+x.dn+'</td><td><b>'+hm(t1)+'</b><br><span class="muted xs">vers '+tod(t1)+'</span></td></tr>';});
  h+='</table><details style="margin-top:6px"><summary>Passages tous les 5 km</summary><div class="in"><table class="tbl num"><tr><th>Km</th><th>Passage</th><th>Allure moy.</th></tr>'+PASS.map(function(q){var m=cumMin(q[0]); return '<tr><td>'+(q[0]===TOTAL?"Arrivée":q[0])+'</td><td>'+hm(m)+'</td><td>'+mmss(m*60/q[0])+'/km</td></tr>';}).join("")+'</table></div></details><p class="muted xs" style="margin:6px 0 0">Première moitié prudente, seconde plus exigeante. Heures calculées pour un départ à '+D.set.raceTime+'.</p>';
  return h;
}
function stratHTML(){return STRAT.map(function(g){return '<div class="strat"><b>'+g[0]+'</b><span class="muted small">cible au km '+kmS(g[2])+' : '+hm(cumMin(g[2]))+'</span><p class="small">'+esc(g[1])+'</p></div>';}).join("");}

// --- réglages ---
function sitem(ic,t,sub,right,attr,cls){return '<button class="sitem'+(cls?" "+cls:"")+'"'+(attr||"")+'><span class="ico">'+I[ic]+'</span><span class="tx"><b>'+t+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span>'+(right==null?'<span class="chev">›</span>':right)+'</button>';}
function srow(ic,t,sub,ctrl){return '<div class="sitem"><span class="ico">'+I[ic]+'</span><span class="tx"><b>'+t+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span>'+ctrl+'</div>';}
function swItem(ic,t,sub,key,on,dis){return '<div class="sitem" role="switch" tabindex="'+(dis?-1:0)+'" aria-checked="'+!!on+'" data-sw="'+key+'"'+(dis?' aria-disabled="true"':' style="cursor:pointer"')+'><span class="ico">'+I[ic]+'</span><span class="tx"><b>'+t+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span><span class="sw" aria-checked="'+!!on+'"></span></div>';}
function group(t,inner){return '<div class="sgroup"><span class="eyebrow">'+t+'</span><div class="slist">'+inner+'</div></div>';}
function vSettings(){
  var th=D.set.theme;
  var h='<button class="back" data-go="back">'+I.back+'Retour</button><h2 style="font-size:30px;margin-bottom:16px">Réglages</h2>';
  h+=group("Apparence",swItem("phone","Suivre le téléphone","Clair le jour, sombre le soir","auto",th==="auto")+swItem("moon","Thème sombre",th==="auto"?"Réglé par le téléphone ("+(sysDark()?"sombre":"clair")+")":"Choisi à la main","dark",isDark(),th==="auto")+
    '<div class="pv"><div style="background:#F5F6F3;color:#15221A;border-color:'+(isDark()?"#DDE3DD":"#5B47C9")+'">Clair<i style="background:#5B47C9"></i></div><div style="background:#0F1612;color:#E9F0EB;border-color:'+(isDark()?"#B3A6FF":"#26342B")+'">Sombre<i style="background:#B3A6FF"></i></div></div>');
  var s=D.sync;
  h+=group("Strava",sitem("sync","Synchroniser maintenant",syncing?"Synchronisation…":s.err?"Dernière tentative : "+esc(s.err):s.t?"Dernière synchro "+ago(s.t)+(s.upd?" · données Strava du "+esc(fmtUpd(s.upd)):"")+" · "+(s.runs||[]).length+" sorties":"Jamais synchronisé",syncing?'<span class="chip warn">…</span>':s.err?'<span class="chip off">Erreur</span>':s.t?'<span class="chip ok">Actif</span>':'',' data-act="sync"')+
    sitem("up","Importer un CSV","Export Garmin Connect ou Strava (activities.csv)",null,' data-act="csv"')+
    '<div class="spad"><details><summary class="small">Source des sorties Strava</summary><div class="in"><p class="small muted">Fichier activities.json écrit toutes les 2 h par l’Action GitHub du dépôt trail. Il ne contient que date, km, D+ et durée.</p><label class="field">Adresse<input id="jsonurl" value="'+esc(D.set.json)+'" inputmode="url" autocomplete="off"></label><div class="row" style="margin-top:8px"><button class="btn sm" data-act="jsonsave">Enregistrer</button><button class="btn sm" data-act="jsondef">Par défaut</button></div></div></details></div>');
  h+=group("Course",srow("cal","Jour de la course","Le plan et le compte à rebours suivent ce jour",'<select id="racedate"><option value="2027-05-08"'+(D.set.raceDate==="2027-05-08"?" selected":"")+'>sam. 8 mai</option><option value="2027-05-09"'+(D.set.raceDate==="2027-05-09"?" selected":"")+'>dim. 9 mai</option></select>')+
    srow("clock","Heure de départ","Pour les heures de passage",'<input type="time" id="racetime" value="'+esc(D.set.raceTime)+'">')+
    sitem("flag","Objectif de temps",hm(goal())+" · réglable dans Ma course",null,' data-go="course"')+
    sitem("map","Trace GPX du parcours",D.gpx?esc(D.gpx.name||"trace")+" · "+kmS(D.gpx.total)+" km · le GPS du mode Course se cale dessus":"Facultatif : permet au GPS de te situer au km près",D.gpx?'<span class="chip ok">Chargée</span>':null,' data-act="gpx"')+
    (D.gpx?sitem("trash","Retirer la trace",null,"",' data-act="gpxdel"',"danger"):""));
  h+=group("Coach",swItem("bell","Check-in de la semaine","Sommeil, jambes, ressenti : le coach ajuste la semaine","checkin",D.set.checkin)+swItem("cycle","Suivi du cycle","Ajustements légers pendant les règles","cycle",D.cycle.on)+
    (D.cycle.on?'<div class="spad"><div class="fields"><label class="field">Début des dernières règles<input type="date" id="cydate" value="'+esc(D.cycle.start||"")+'"></label><label class="field">Durée du cycle<select id="cylen">'+(function(){var o="";for(var i=21;i<=38;i++)o+='<option value="'+i+'"'+((D.cycle.len||28)===i?" selected":"")+'>'+i+' jours</option>';return o;})()+'</select></label></div><p class="muted xs" style="margin:0">Mets la date à jour à chaque cycle. Ces données restent sur ce téléphone.</p></div>':'')+
    '<div class="spad"><details><summary class="small">Comment le coach juge</summary><div class="in"><ul class="pts"><li>Distance : en cible entre 90 et 115 % du prévu.</li><li>Dénivelé : en cible au-dessus de 75 % du prévu.</li><li>Sorties faciles : trop rapides si l’allure par km-effort dépasse celle de l’objectif ('+mmss(eff())+').</li><li>Séance du jeudi (club) : enregistrée, jamais jugée.</li><li>Chaque semaine : volume, sorties trop rapides et check-in donnent une proposition d’ajustement, que tu acceptes ou non.</li></ul></div></details></div>');
  h+=group("Mode Course",srow("gel","Rappel de gel","Vibration et alerte à l’écran",'<select id="gelmin">'+[0,25,30,35,40,45].map(function(v){return '<option value="'+v+'"'+(D.set.gel===v?" selected":"")+'>'+(v?"toutes les "+v+" min":"désactivé")+'</option>';}).join("")+'</select>')+
    srow("drop","Rappel d’eau","Petite vibration",'<select id="watermin">'+[0,10,15,20,30].map(function(v){return '<option value="'+v+'"'+(D.set.water===v?" selected":"")+'>'+(v?"toutes les "+v+" min":"désactivé")+'</option>';}).join("")+'</select>')+
    swItem("vib","Vibrations","Au ravito et pour les rappels (Android ; l’iPhone ne vibre pas depuis le web)","vib",D.set.vib)+
    (D.race?sitem("trash","Réinitialiser le chrono de course",D.race.done?"Course terminée, temps gardés dans le bilan":"Chrono "+(D.race.t0?"lancé":"prêt"),"",' data-act="racereset"',"danger"):""));
  h+=group("Guide",'<div class="spad"><details><summary class="small">'+I.leaf+' Mobilité · 10 min</summary><div class="in">'+exHTML(MOB)+'</div></details>'+["A1","A2","B1","B2","C1","C2","D"].map(function(k){var r=RENFO[k]; return '<details><summary class="small">'+I.dumb+' '+esc(r.name)+'</summary><div class="in"><p class="muted small">'+esc(r.tours)+'</p>'+exHTML(r.ex)+'</div></details>';}).join("")+
    '<details><summary class="small">'+I.heart+' Zones de fréquence cardiaque</summary><div class="in"><table class="tbl num"><tr><th>Zone</th><th>bpm</th><th>Usage</th></tr><tr><td>Z1</td><td>&lt; 127</td><td>Récupération</td></tr><tr><td>Z2</td><td>135-150</td><td>Endurance</td></tr><tr><td>Z3</td><td>153-167</td><td>Allure course</td></tr><tr><td>Z4</td><td>169-180</td><td>Seuil, côtes</td></tr><tr><td>Z5</td><td>&gt; 180</td><td>Court et très dur</td></tr></table><p class="muted xs" style="margin:6px 0 0">FC max 196 bpm.</p></div></details></div>');
  h+=group("Données",sitem("down","Exporter mes données","Séances, check-ins, bilans, temps de course (fichier .json)",null,' data-act="export"')+sitem("up","Importer une sauvegarde","Remplace les données de ce téléphone",null,' data-act="import"')+
    sitem("trash",resetArmed?"Toucher encore pour tout effacer":"Tout effacer","Séances cochées, check-ins, temps de course","",' data-act="reset"',"danger"));
  h+=group("Tester une date",'<div class="spad"><p class="small muted" style="margin:0 0 8px">Pour voir l’appli comme un autre jour (semaine de course, jour J, après). Les vraies données ne changent pas.</p><div class="fields"><label class="field">Date simulée<input type="date" id="fake" value="'+esc(D.set.fake||"")+'"></label></div><div class="row"><button class="btn sm" data-act="fakeset">Appliquer</button><button class="btn sm" data-act="unfake"'+(D.set.fake?"":" disabled")+'>Aujourd’hui</button></div></div>');
  h+='<p class="foot">Plan THP40 · v2 · données gardées sur ce téléphone</p>';
  return h;
}
function fmtUpd(u){var d=new Date(u); if(isNaN(d))return u; return fmtS(new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())))+" à "+pz(d.getHours())+":"+pz(d.getMinutes());}

// ---------- thème ----------
var MQ=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null;
function sysDark(){return !!(MQ&&MQ.matches);}
function isDark(){return D.set.theme==="dark"||(D.set.theme==="auto"&&sysDark());}
function applyTheme(){
  if(D.set.theme==="auto")document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme",D.set.theme);
  var m=document.querySelector('meta[name="theme-color"]'); if(m)m.setAttribute("content",$("rm")&&!$("rm").hidden?"#0B0F0D":isDark()?"#0F1612":"#F5F6F3");
}
applyTheme();
if(MQ&&MQ.addEventListener)MQ.addEventListener("change",function(){applyTheme(); if(tab==="settings")render();});

// ---------- rendu ----------
function render(keep){
  var y=window.scrollY, v;
  if(tab==="today")v=vToday(); else if(tab==="plan")v=vPlan(); else if(tab==="course")v=vCourse(); else v=vSettings();
  $("view").innerHTML=v;
  document.querySelectorAll("#tabs button").forEach(function(b){b.setAttribute("aria-current",b.dataset.t===tab?"page":"false");});
  var g=$("goal"); if(g){g.addEventListener("input",function(){D.set.goal=+g.value; $("goalv").textContent=hm(goal()); $("passwrap").innerHTML=passHTML(); $("stratwrap").innerHTML=stratHTML();}); g.addEventListener("change",function(){rebuild(); save(); render(true);});}
  bindProfile();
  if(keep)window.scrollTo(0,y); else window.scrollTo(0,0);
}
function setTab(t){if(t!=="settings")prevTab=t; tab=t; resetArmed=false; if(t==="today"&&!browsing)goNow(); render();}

// ---------- interactions ----------
$("tabs").addEventListener("click",function(e){var b=e.target.closest("button[data-t]"); if(!b)return; if(b.dataset.t==="today")browsing=false; setTab(b.dataset.t);});
$("view").addEventListener("click",function(e){
  var t=e.target;
  var swi=t.closest("[data-sw]"); if(swi&&!swi.hasAttribute("aria-disabled")){toggleSw(swi.dataset.sw); return;}
  var b=t.closest("button"); if(!b)return;
  var ds=b.dataset;
  if(ds.go){ if(ds.go==="settings"){prevTab=tab;tab="settings";render();} else if(ds.go==="back"){setTab(prevTab||"today");} else if(ds.go==="today-race"){browsing=false;setTab("today");} else setTab(ds.go); return;}
  if(ds.day!=null&&b.classList.contains("day")||ds.day!=null&&b.classList.contains("link")){sel=+ds.day; if(b.classList.contains("link")){render(); return;} render(true); return;}
  if(ds.done){if(D.done[ds.done])delete D.done[ds.done]; else D.done[ds.done]=1; save(); if(D.done[ds.done]&&navigator.vibrate&&D.set.vib)try{navigator.vibrate(30);}catch(x){} render(true); return;}
  if(ds.ci){var o=D.ci[cur]||(D.ci[cur]={}); o[ds.ci]=o[ds.ci]===ds.v?"":ds.v; save(); render(true); return;}
  if(ds.adj){if(ds.adj==="reset")delete D.adj[cur]; else D.adj[cur]=ds.adj; save(); render(true); return;}
  if(ds.todo!=null){var st=ds.store==="kit"?D.kit:D.todo; st[ds.todo]=!st[ds.todo]; if(!st[ds.todo])delete st[ds.todo]; save(); var kd=$("kitd"), op=kd&&kd.open; render(true); if(op&&$("kitd"))$("kitd").open=true; return;}
  if(ds.wk){var w=+ds.wk; openWk=openWk===w?null:w; render(true); return;}
  if(ds.goto){var p=ds.goto.split("-"); cur=+p[0]; sel=+p[1]; browsing=true; tab="today"; render(); return;}
  if(ds.race){openRace(ds.race==="practice"); return;}
  if(ds.act)act(ds.act,b);
});
$("view").addEventListener("keydown",function(e){var swi=e.target.closest&&e.target.closest("[data-sw]"); if(swi&&(e.key===" "||e.key==="Enter")){e.preventDefault(); if(!swi.hasAttribute("aria-disabled"))toggleSw(swi.dataset.sw);}});
$("view").addEventListener("change",function(e){
  var id=e.target.id, v=e.target.value;
  if(id==="racedate"){D.set.raceDate=v; rebuild(); save(); toast("Jour de course : "+fmtL(new Date(raceUTC())).toLowerCase()); render(true);}
  else if(id==="racetime"){if(/^\d{1,2}:\d{2}$/.test(v)){D.set.raceTime=v; rebuild(); save();}}
  else if(id==="gelmin"){D.set.gel=+v; save();}
  else if(id==="watermin"){D.set.water=+v; save();}
  else if(id==="cydate"){D.cycle.start=v; save(); render(true);}
  else if(id==="cylen"){D.cycle.len=+v; save(); render(true);}
  else if(id==="rjsel"){RJsel=+v; render(true);}
});
function toggleSw(k){
  if(k==="auto")D.set.theme=D.set.theme==="auto"?(sysDark()?"dark":"light"):"auto";
  else if(k==="dark")D.set.theme=isDark()?"light":"dark";
  else if(k==="cycle")D.cycle.on=!D.cycle.on;
  else D.set[k]=!D.set[k];
  applyTheme(); save(); render(true);
}
function act(a,b){
  if(a==="sync"){sync(true);}
  else if(a==="wk"){cur=Math.max(1,Math.min(26,cur+(+b.dataset.d))); var ti=todayIdx(); sel=(ti>=0&&Math.floor(ti/7)+1===cur)?ti%7:1; browsing=phase()!=="prep"||cur!==nowWeek(); render();}
  else if(a==="now"){goNow(); render();}
  else if(a==="browse"){cur=+b.dataset.w; sel=+b.dataset.d; browsing=true; render();}
  else if(a==="manual"){var k=b.dataset.k, km=num($("mKm").value), dp=num($("mDp").value)||0, t=parseDur($("mT").value);
    if(!(km>0)){toast("Indique au moins les kilomètres.");return;}
    D.actual[k]={km:Math.round(km*100)/100,dp:Math.round(dp),t:Math.round(t),src:"manual"}; D.done[k]=1; save(); toast("Chiffres enregistrés."); render(true);}
  else if(a==="delactual"){delete D.actual[b.dataset.k]; save(); render(true);}
  else if(a==="csv")$("fileCsv").click();
  else if(a==="gpx")$("fileGpx").click();
  else if(a==="gpxdel"){D.gpx=null; save(); toast("Trace retirée."); render(true);}
  else if(a==="import")$("fileJson").click();
  else if(a==="export")exportData();
  else if(a==="jsonsave"){var u=$("jsonurl").value.trim(); if(u&&!/^https?:\/\//.test(u)){toast("Adresse invalide.");return;} D.set.json=u; save(); sync(true);}
  else if(a==="jsondef"){D.set.json=DEF_JSON; save(); sync(true);}
  else if(a==="reset"){if(!resetArmed){resetArmed=true; render(true); setTimeout(function(){if(resetArmed){resetArmed=false; if(tab==="settings")render(true);}},5000); return;}
    var keep=D.set, gpx=D.gpx, sy=D.sync; D=blank(); D.set=keep; D.gpx=gpx; D.sync=sy; resetArmed=false; applyActs(D.sync.runs||[],true); save(); toast("Données effacées. Les sorties Strava ont été relues."); render(true);}
  else if(a==="racereset"){if(!confirm("Réinitialiser le chrono de course ? Les temps déjà pointés seront perdus (sauf ceux déjà gardés dans le bilan)."))return; D.race=null; save(); render(true);}
  else if(a==="fakeset"){var f=$("fake").value; if(!isoOk(f)){toast("Choisis une date.");return;} D.set.fake=f; save(); goNow(); toast("Date simulée : "+fmtL(new Date(todayUTC())).toLowerCase()); setTab("today");}
  else if(a==="unfake"){D.set.fake=""; save(); goNow(); toast("Retour à aujourd’hui."); render(true);}
  else if(a==="editres"){editRes=true; render(true);}
  else if(a==="canceres"){editRes=false; render(true);}
  else if(a==="saveres"){
    var sp=[]; for(var i=0;i<4;i++){var v=$("rs"+i).value.trim(); sp.push(v?parseDur(v)/60:null);}
    if(sp[3]==null||!(sp[3]>60)){toast("Indique au moins ton temps d’arrivée (ex. 4:52).");return;}
    var n=sp.filter(function(x){return x!=null;}).length;
    if(n===4&&!sp.every(function(x,i){return !i||x>sp[i-1];})){toast("Les temps doivent augmenter d’un ravito à l’autre.");return;}
    if(n>1&&n<4){toast("Remplis les quatre temps, ou seulement l’arrivée.");return;}
    D.result={splits:n===4?sp:[sp[3]],goal:goal(),manual:true}; editRes=false; save(); toast("Temps enregistrés."); render(true);}
}
// ---------- toast ----------
var toastT=null;
function toast(m){var t=$("toast"); t.textContent=m; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(function(){t.hidden=true;},3200);}

// ---------- Strava (activities.json public) ----------
var syncing=false;
function sync(manual){
  if(syncing)return; if(!D.set.json){if(manual)toast("Aucune source Strava réglée."); return;}
  syncing=true; if(tab==="settings"||tab==="today")render(true);
  var u=D.set.json+(D.set.json.indexOf("?")>=0?"&":"?")+"t="+Date.now();
  fetch(u,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status===404?"fichier introuvable":"erreur "+r.status); return r.json();}).then(function(j){
    if(!j||!Array.isArray(j.runs))throw new Error("format inattendu");
    var runs=j.runs.filter(function(r){return r&&isoOk(String(r.date))&&+r.km>0;}).map(function(r){return {date:r.date,km:+r.km,dp:Math.round(+r.dp||0),t:Math.round(+r.t||0)};}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;});
    D.sync={t:Date.now(),upd:j.updated||"",runs:runs,err:""};
    var n=applyActs(runs);
    if(manual)toast(runs.length+" sorties lues · "+n+" séance"+(n>1?"s":"")+" du plan");
  }).catch(function(err){
    D.sync.err=navigator.onLine===false?"hors ligne":String(err&&err.message||"échec");
    if(manual)toast("Synchro impossible ("+D.sync.err+").");
  }).then(function(){syncing=false; save(); if(tab!=="course"||manual)render(true);});
}
function applyActs(acts,quiet){
  var byDay={},n=0;
  acts.forEach(function(a){if(!a.date||!(a.km>0))return; var o=byDay[a.date]||(byDay[a.date]={km:0,dp:0,t:0,src:a.src||"strava"}); o.km+=a.km; o.dp+=a.dp||0; o.t+=a.t||0;});
  Object.keys(byDay).forEach(function(dt){var m=BYDATE[dt]; if(!m)return; var o=byDay[dt]; if(o.km<3)return; var k=m.w+"-"+m.s.k;
    if(D.actual[k]&&D.actual[k].src==="manual")return;
    D.actual[k]={km:Math.round(o.km*100)/100,dp:Math.round(o.dp),t:Math.round(o.t),src:o.src};
    if(m.s.km&&o.km>=0.6*m.s.km)D.done[k]=1; n++;});
  return n;
}
function autoSync(){if(!syncing&&Date.now()-(D.sync.t||0)>10*60*1000)sync(false);}

// ---------- fichiers ----------
function readFile(input,cb){var f=input.files&&input.files[0]; if(!f)return; var rd=new FileReader(); rd.onerror=function(){toast("Lecture du fichier impossible.");}; rd.onload=function(){try{cb(String(rd.result),f);}catch(err){toast("Ce fichier n’a pas pu être lu.");} input.value="";}; rd.readAsText(f);}
function parseCsv(t){var rows=[],row=[],f="",q=false,i,c,sep=(t.split("\n")[0].split(";").length>t.split("\n")[0].split(",").length)?";":",";
  for(i=0;i<t.length;i++){c=t[i]; if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c==='"')q=true; else if(c===sep){row.push(f);f="";}
    else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++; row.push(f);f=""; if(row.length>1||row[0]!=="")rows.push(row); row=[];} else f+=c;}
  if(f!==""||row.length){row.push(f);rows.push(row);} return rows;}
$("fileCsv").addEventListener("change",function(){readFile(this,function(txt){
  var rows=parseCsv(txt.replace(/^﻿/,"")); if(rows.length<2){toast("Fichier vide.");return;}
  var H=rows[0].map(function(x){return x.toLowerCase().trim();}), ix=function(n){for(var a=0;a<n.length;a++){var j=H.indexOf(n[a]); if(j>=0)return j;} return -1;};
  var iD=ix(["date","activity date","date de l'activité","date de l’activité"]), iK=ix(["distance"]), iA=ix(["ascension totale","elevation gain","dénivelé positif"]), iT=ix(["type d'activité","type d’activité","activity type","type"]), iM=ix(["temps de déplacement","moving time","durée","duration","temps"]);
  if(iD<0||iK<0){toast("Colonnes Date et Distance introuvables.");return;}
  var acts=[];
  rows.slice(1).forEach(function(r){var ty=iT>=0?(r[iT]||"").toLowerCase():"course"; if(!/course|trail|run/.test(ty))return;
    var ds=(r[iD]||"").trim(), dt=null; if(/^\d{4}-\d{2}-\d{2}/.test(ds))dt=ds.slice(0,10); else{var pd=new Date(ds); if(!isNaN(pd))dt=pd.getFullYear()+"-"+pz(pd.getMonth()+1)+"-"+pz(pd.getDate());}
    var km=num(r[iK]); if(km>1000)km=km/1000; if(!dt||!(km>0))return;
    acts.push({date:dt,km:km,dp:iA>=0?(num(r[iA])||0):0,t:iM>=0?parseDur(r[iM]):0,src:"csv"});});
  var n=applyActs(acts);
  var have={}; (D.sync.runs||[]).forEach(function(r){have[r.date+"|"+Math.round(r.km*10)]=1;});
  acts.forEach(function(a){if(!have[a.date+"|"+Math.round(a.km*10)])D.sync.runs.push({date:a.date,km:a.km,dp:Math.round(a.dp),t:Math.round(a.t)});});
  D.sync.runs.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;});
  save(); toast(acts.length+" sorties lues, "+n+" correspondent au plan."); render(true);
});});
$("fileJson").addEventListener("change",function(){readFile(this,function(txt){
  var o=JSON.parse(txt); if(!o||typeof o!=="object"||!o.done||!o.set){toast("Ce n’est pas une sauvegarde Plan THP40.");return;}
  if(!confirm("Remplacer les données de ce téléphone par cette sauvegarde ?"))return;
  var n=blank(); merge(n,o); D=n; rebuild(); applyTheme(); save(); goNow(); toast("Sauvegarde importée."); render();
});});
$("fileGpx").addEventListener("change",function(){readFile(this,function(txt,f){
  var doc=new DOMParser().parseFromString(txt,"application/xml"), pts=doc.getElementsByTagName("trkpt"); if(!pts.length)pts=doc.getElementsByTagName("rtept");
  if(pts.length<20){toast("Aucune trace trouvée dans ce fichier.");return;}
  var raw=[],cum=0,prev=null;
  for(var i=0;i<pts.length;i++){var la=+pts[i].getAttribute("lat"),lo=+pts[i].getAttribute("lon"); if(isNaN(la)||isNaN(lo))continue; if(prev)cum+=distM(prev[0],prev[1],la,lo); raw.push([la,lo,cum]); prev=[la,lo];}
  var total=cum/1000; if(total<20||total>60){toast("Trace de "+kmS(total)+" km : ce n’est pas le THP40 ?");return;}
  var sc=TOTAL*1000/cum, out=[], last=-1e9;
  raw.forEach(function(p,i){if(p[2]-last>=40||i===raw.length-1){out.push([Math.round(p[0]*1e5)/1e5,Math.round(p[1]*1e5)/1e5,Math.round(p[2]*sc)/1000]); last=p[2];}});
  var nm=doc.getElementsByTagName("name")[0];
  D.gpx={name:(nm&&nm.textContent.trim().slice(0,60))||f.name,total:total,pts:out}; save(); toast("Trace chargée : "+kmS(total)+" km, "+out.length+" points."); render(true);
});});
function distM(a,b,c,d){var R=6371000,toR=Math.PI/180,x=(d-b)*toR*Math.cos((a+c)/2*toR),y=(c-a)*toR; return Math.sqrt(x*x+y*y)*R;}
function exportData(){
  var blob=new Blob([JSON.stringify(D,null,1)],{type:"application/json"}), a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download="plan-thp40-"+iso(new Date(Date.now()-new Date().getTimezoneOffset()*6e4))+".json"; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href); a.remove();},500);
}

// ---------- mode Course ----------
var cpArmed=false, RS=null, rmTimer=null, wake=null, gpsWatch=null, holdT=null, undoArmed=false;
function newRS(pr){return {t0:null,splits:[],gels:0,lastGel:null,lastWater:null,gelAlerted:null,done:false,practice:!!pr,gpsKm:null,gpsT:0,shift:0};}
function openRace(pr){
  if(pr){if(!D.practice||D.practice.done)D.practice=newRS(true); RS=D.practice;}
  else{if(!D.race)D.race=newRS(false); RS=D.race;}
  save(); $("rm").hidden=false; document.body.style.overflow="hidden"; applyTheme(); rmRender(); clearInterval(rmTimer); rmTimer=setInterval(rmTick,1000); askWake();
  try{history.pushState({rm:1},"");}catch(e){}
}
function closeRace(){
  $("rm").hidden=true; document.body.style.overflow=""; clearInterval(rmTimer); stopGps(); try{wake&&wake.release();}catch(e){} wake=null; RS=null; applyTheme(); render(true);
}
window.addEventListener("popstate",function(){if(!$("rm").hidden)closeRace();});
function askWake(){try{if(navigator.wakeLock&&!$("rm").hidden)navigator.wakeLock.request("screen").then(function(w){wake=w; w.addEventListener&&w.addEventListener("release",function(){wake=null;}); var c=$("rmWake"); if(c)c.textContent="Écran allumé";}).catch(function(){});}catch(e){}}
document.addEventListener("visibilitychange",function(){if(document.hidden)return; if(!$("rm").hidden){askWake(); rmTick();} else autoSync();});
function nowMs(){return Date.now()+(RS&&RS.shift?RS.shift:0);}
function vib(p){if(D.set.vib&&navigator.vibrate)try{navigator.vibrate(p);}catch(e){}}
function rmModel(){
  var now=nowMs(), t=(now-RS.t0)/60000, i=RS.splits.length, ni=Math.min(i,3);
  var lastDelta=i?RS.splits[i-1]-cumMin(CP[i-1].km):0, lo=i?CP[i-1].km:0, hi=CP[ni].km-0.1;
  var est=Math.max(lo,Math.min(kmAt(t-lastDelta),hi));
  var gpsOk=RS.gpsKm!=null&&Date.now()-RS.gpsT<180000, pos=gpsOk?Math.max(lo,Math.min(RS.gpsKm,TOTAL)):est;
  var delta=gpsOk&&pos>0.5?t-cumMin(pos):lastDelta, nx=CP[ni];
  var gelBase=RS.lastGel||RS.t0, gelLeft=D.set.gel?D.set.gel-(now-gelBase)/60000:null;
  return {t:t,i:i,pos:pos,gpsOk:gpsOk,delta:delta,nx:nx,left:Math.max(0,nx.km-pos),up:dplus(pos,nx.km),target:cumMin(nx.km),eta:cumMin(nx.km)+delta,proj:goal()+delta,adv:(ADV.filter(function(a){return a[0]>pos;})[0]||ADV[ADV.length-1])[1],gelLeft:gelLeft,gelBase:gelBase};
}
function dcls(d){return d<=0?"ahead":d<=8?"late":"bad";}
function rmRender(){
  var el=$("rmIn"), pr=RS.practice, h;
  undoArmed=false;
  if(RS.done){
    var fin=RS.splits[3], d=fin-goal();
    h='<div class="rm-top"><span>'+(pr?"Essai":"THP40")+' · terminé</span></div><div class="rm-spacer"></div><div class="rm-big"><span class="eyebrow" style="color:#93A39A">Arrivée</span><div class="clock" style="font-size:80px">'+hmc(fin)+'</div><span class="delta '+dcls(d)+'">'+sgn(d)+'</span><p style="margin:16px 0 0">'+(pr?"Essai terminé. Rien n’est gardé dans ton bilan.":"Bravo. Bois, mange, marche un peu.<br>Le bilan détaillé t’attend dans l’appli.")+'</p></div><div class="rm-spacer"></div>'+
      (pr?'':'<button class="rm-go" data-rm="bilan">Voir le bilan</button>')+'<button class="rm-ghost" data-rm="undo">Annuler l’arrivée</button><button class="rm-quit" data-rm="close">Fermer</button>';
    el.innerHTML=h; return;
  }
  if(!RS.t0){
    var isRace=!pr&&daysToRace()===0, st=raceStartTs(), now=Date.now(), sinceStart=(now-st)/60000;
    h='<div class="rm-top"><span class="chips"><span class="chip">'+(pr?"Essai":"THP40")+'</span><span class="chip" id="rmWake">'+(wake?"Écran allumé":"Écran : garde-le allumé")+'</span></span><span>objectif '+hm(goal())+'</span></div>'+
      '<div class="rm-spacer"></div><div class="rm-big"><span class="eyebrow" style="color:#93A39A">'+(isRace&&sinceStart<0?"Départ dans":"Prête ?")+'</span><div class="clock" id="rmCount">'+(isRace&&sinceStart<0?hms(-sinceStart*60):"0:00:00")+'</div><p>'+(pr?"Lance le chrono au début de ta sortie. Touche « Je suis au ravito » aux km 9,5, 19,9 et 29 pour voir l’écran évoluer.":"Touche « Départ » au coup de pistolet. Le chrono continue même si tu fermes l’appli.")+'</p></div><div class="rm-spacer"></div>'+
      '<div class="rm-prof">'+profileSVG({dark:true,pos:0,h:96,top:20,small:true})+'</div>'+
      '<button class="rm-go" data-rm="start">Départ<small>chrono lancé maintenant</small></button>'+
      (isRace&&sinceStart>0&&sinceStart<240?'<button class="rm-go" style="background:#1B2620;color:#F1F5F2;min-height:60px;font-size:18px" data-rm="startoff">Départ donné à '+D.set.raceTime+'<small>il y a '+Math.round(sinceStart)+' min</small></button>':'')+
      '<button class="rm-quit" data-rm="close">Fermer</button>';
    el.innerHTML=h; return;
  }
  var i=RS.splits.length;
  h='<div class="rm-top" id="rmTop"></div><div class="clock" id="rmClock"></div><div id="rmLive" style="display:flex;flex-direction:column;gap:10px"></div><div class="rm-spacer"></div>'+
    '<div class="rm-row"><button data-rm="gel" id="rmGel">Gel pris<small id="rmGelSub"></small></button><button data-rm="gps" id="rmGps" class="'+(gpsWatch!=null?"on":"")+'">'+(gpsWatch!=null?"GPS actif":"Me situer")+'<small id="rmGpsSub">'+(gpsWatch!=null?"toucher pour couper":D.gpx?"GPS sur la trace":"sans trace : voir Réglages")+'</small></button></div>'+
    (pr?'<div class="rm-row"><button data-rm="ff">+10 min<small>avancer l’essai</small></button></div>':'')+
    '<button class="rm-go" data-rm="cp">'+(i<3?"Je suis au ravito":"Je franchis l’arrivée")+'<small>'+(i<3?CP[i].n+" · km "+kmS(CP[i].km):"38,8 km")+'</small></button>'+
    (i?'<button class="rm-ghost" data-rm="undo" id="rmUndo">Annuler le dernier pointage ('+(CP[i-1].n)+')</button>':'')+
    '<button class="rm-quit" data-rm="quit"><i></i>Maintenir pour quitter · le chrono continue</button>';
  el.innerHTML=h; rmTick();
}
function rmTick(){
  if(!RS)return;
  if(!RS.t0){var c=$("rmCount"); if(c&&!RS.practice&&daysToRace()===0){var s=(raceStartTs()-Date.now())/1000; if(s>0)c.textContent=hms(s); else if(c.textContent!=="0:00:00")rmRender();} return;}
  if(RS.done)return;
  var m=rmModel(), i=m.i;
  // rappels
  if(m.gelLeft!=null&&m.gelLeft<=0&&RS.gelAlerted!==m.gelBase){RS.gelAlerted=m.gelBase; vib([200,100,200,100,200]); save();}
  if(D.set.water){var wb=RS.lastWater||RS.t0; if(nowMs()-wb>=D.set.water*60000){RS.lastWater=nowMs(); vib(150); toast("Bois quelques gorgées."); save();}}
  var top=$("rmTop"); if(!top)return;
  top.innerHTML='<span class="chips"><span class="chip">'+(RS.practice?"Essai":navigator.onLine===false?"Hors ligne":"THP40")+'</span><span class="chip" id="rmWake">'+(wake?"Écran allumé":"Écran : garde-le allumé")+'</span></span><span class="num">km '+kmS(m.pos)+(m.gpsOk?" · GPS":" · estimé")+'</span>';
  $("rmClock").innerHTML=hms(m.t*60)+'<small>temps de course · objectif '+hm(goal())+(RS.practice?'':' · heure '+new Date().getHours()+':'+pz(new Date().getMinutes()))+'</small>';
  var gelDue=m.gelLeft!=null&&m.gelLeft<=0;
  $("rmLive").innerHTML=(gelDue?'<div class="rm-card alert"><span class="eyebrow">Rappel</span><div class="rm-next">Prends un gel maintenant</div><span>Puis touche « Gel pris ». Bois un peu avec.</span></div>':'')+
    '<div class="rm-card"><span class="eyebrow">'+(i<3?"Prochain ravito":"Dernière section")+'</span><div class="rm-next">'+(i<3?m.nx.n:"Arrivée")+'</div><div class="rm-grid num"><div><b>'+kmS(m.left)+'</b>km</div><div><b>+'+m.up+'</b>m D+</div><div><b>'+hmc(m.eta)+'</b>prévu '+hmc(m.target)+'</div></div></div>'+
    '<div class="rm-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><span class="eyebrow">Arrivée estimée</span><div style="font-family:var(--display);font-size:28px;font-weight:800" class="num">'+hm(m.proj)+'</div></div><span class="delta '+dcls(m.delta)+'">'+sgn(m.delta)+'</span></div>'+
    '<div class="rm-card rm-advice">'+m.adv+'</div>'+
    '<div class="rm-prof">'+profileSVG({dark:true,pos:m.pos,h:96,top:20,small:true})+'</div>';
  var g=$("rmGel"), gs=$("rmGelSub"); if(g){g.className=gelDue?"due":""; gs.textContent=(RS.gels?RS.gels+" pris · ":"")+(m.gelLeft==null?"rappel coupé":gelDue?"c’est l’heure":"prochain dans "+Math.max(1,Math.ceil(m.gelLeft))+" min");}
}
$("rm").addEventListener("click",function(e){
  var b=e.target.closest("[data-rm]"); if(!b||!RS)return; var a=b.dataset.rm;
  if(a==="start"){RS.t0=Date.now(); RS.shift=0; vib(80); save(); rmRender();}
  else if(a==="startoff"){RS.t0=raceStartTs(); save(); rmRender();}
  else if(a==="cp"){var t=(nowMs()-RS.t0)/60000, ci_=RS.splits.length; if(ci_&&t-RS.splits[ci_-1]<2){toast("Pointage déjà fait il y a moins de 2 min.");return;}
    if(t<cumMin(CP[ci_].km)*0.6&&!cpArmed){cpArmed=true; b.firstChild.textContent="Si tôt ? Toucher encore"; setTimeout(function(){cpArmed=false; if(RS&&!RS.done)rmRender();},3000); return;}
    cpArmed=false;
    RS.splits.push(t); RS.gpsKm=null; vib([120,60,120]);
    if(RS.splits.length===4){RS.done=true; if(!RS.practice){D.result={splits:RS.splits.slice(),goal:goal()};}}
    else toast(CP[RS.splits.length-1].n+" : "+hmc(t)+" ("+sgn(t-cumMin(CP[RS.splits.length-1].km))+")");
    save(); rmRender();}
  else if(a==="undo"){if(!undoArmed){undoArmed=true; b.textContent="Toucher encore pour annuler"; setTimeout(function(){undoArmed=false; var u=$("rmUndo"); if(u&&RS&&RS.splits.length)u.textContent="Annuler le dernier pointage ("+CP[RS.splits.length-1].n+")";},3000); return;}
    RS.splits.pop(); if(RS.done){RS.done=false; if(!RS.practice)D.result=null;} save(); rmRender();}
  else if(a==="gel"){RS.gels++; RS.lastGel=nowMs(); vib(40); save(); rmTick();}
  else if(a==="gps"){if(gpsWatch!=null){stopGps(); rmRender(); return;} startGps();}
  else if(a==="ff"){RS.shift=(RS.shift||0)+600000; rmTick();}
  else if(a==="close"){closeRace(); try{if(history.state&&history.state.rm)history.back();}catch(x){}}
  else if(a==="bilan"){closeRace(); try{if(history.state&&history.state.rm)history.back();}catch(x){} browsing=false; setTab("today");}
});
$("rm").addEventListener("pointerdown",function(e){var b=e.target.closest('[data-rm="quit"]'); if(!b)return; b.classList.add("hold"); holdT=setTimeout(function(){b.classList.remove("hold"); closeRace(); try{if(history.state&&history.state.rm)history.back();}catch(x){}},950);});
["pointerup","pointerleave","pointercancel"].forEach(function(ev){$("rm").addEventListener(ev,function(){clearTimeout(holdT); var q=document.querySelector(".rm-quit.hold"); if(q)q.classList.remove("hold");});});
$("rm").addEventListener("keydown",function(e){if(e.key==="Escape"&&RS&&(!RS.t0||RS.done))closeRace();});

// GPS : se cale sur la trace GPX si elle est chargée
function startGps(){
  if(!navigator.geolocation){toast("Pas de GPS sur cet appareil.");return;}
  if(!D.gpx){toast("Charge la trace GPX dans Réglages pour te situer au GPS.");return;}
  gpsWatch=navigator.geolocation.watchPosition(onPos,function(err){toast(err.code===1?"Localisation refusée.":"GPS indisponible pour l’instant."); stopGps(); if(RS)rmRender();},{enableHighAccuracy:true,maximumAge:15000,timeout:30000});
  rmRender(); toast("Recherche du GPS…");
}
function stopGps(){if(gpsWatch!=null){try{navigator.geolocation.clearWatch(gpsWatch);}catch(e){}} gpsWatch=null;}
function onPos(p){
  if(!RS||!D.gpx)return; var la=p.coords.latitude, lo=p.coords.longitude, m=rmModel(), est=m.pos;
  var best=null, bd=1e9; D.gpx.pts.forEach(function(q){if(q[2]<est-3||q[2]>est+8)return; var d=distM(la,lo,q[0],q[1]); if(d<bd){bd=d;best=q;}});
  if(!best||bd>400){D.gpx.pts.forEach(function(q){var d=distM(la,lo,q[0],q[1]); if(d<bd){bd=d;best=q;}});}
  var sub=$("rmGpsSub");
  if(best&&bd<=400){RS.gpsKm=best[2]; RS.gpsT=Date.now(); if(sub)sub.textContent="km "+kmS(best[2])+" · ±"+Math.round(p.coords.accuracy)+" m"; rmTick();}
  else if(sub)sub.textContent="hors de la trace ("+Math.round(bd/1000*10)/10+" km)";
}

// ---------- démarrage ----------
render();
if(D.race&&D.race.t0&&!D.race.done&&daysToRace()===0)openRace(false);
setTimeout(autoSync,400);
window.addEventListener("online",autoSync);
setInterval(function(){if(!$("rm").hidden)return; var j=todayIdx(); if(j!==lastIdx){lastIdx=j; goNow(); render(true);}},60000);
var lastIdx=todayIdx();
})();
