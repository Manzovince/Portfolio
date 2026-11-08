'use strict';
/* ---------- équipement, ravito, entraînement ---------- */
// spd vitesse, grip boue/pluie, rock rochers/neige, life km, cap litres, slots nourriture
const GEAR={
  route:{s:'shoes',n:'Chaussures de route',p:0,col:'#9a9aa4',spd:1,grip:0,rock:0,life:300,d:'Le début de tout. Glissent sur la boue et les cailloux.'},
  trail:{s:'shoes',n:'Trail polyvalentes',p:120,col:'#e8603a',spd:1.04,grip:.5,rock:.4,life:500,d:'+4 % de vitesse, accroche correcte partout.'},
  boue:{s:'shoes',n:'Crampons de boue',p:350,col:'#3aa86a',spd:1.03,grip:1,rock:.3,life:450,d:'Insensibles à la pluie et aux sentiers gras.'},
  montagne:{s:'shoes',n:'Montagne Vibram',p:600,col:'#e8c03a',spd:1.05,grip:.6,rock:1,life:700,d:'Rois des crêtes, des falaises et de la neige.'},
  carbone:{s:'shoes',n:'Plaque carbone',p:1500,col:'#f04ab0',spd:1.12,grip:.6,rock:.5,life:400,d:'+12 % de vitesse, mais s’usent vite.'},
  tshirt:{s:'top',n:'T-shirt coton',p:0,col:'#5a8ad0',water:1.08,d:'Garde la sueur : boit 8 % de plus.'},
  technique:{s:'top',n:'Maillot technique',p:80,col:'#e86a3a',water:.9,d:'Respirant : −10 % d’eau.'},
  merinos:{s:'top',n:'Mérinos manches longues',p:250,col:'#8a5ac8',water:.95,cold:1,d:'Plus de coup de froid au-dessus de 2 000 m ou la nuit.'},
  coupevent:{s:'top',n:'Coupe-vent imperméable',p:400,col:'#3ab0a0',water:1,rain:1,wind:1,d:'Pluie et vent sur les crêtes ne te ralentissent plus.'},
  doudoune:{s:'top',n:'Doudoune légère',p:800,col:'#d8443a',water:1.05,cold:1,rain:1,wind:1,d:'Froid, pluie et vent : rien ne passe. Chaude au soleil.'},
  casquette:{s:'head',n:'Casquette',p:60,col:'#f2f0e8',heat:.85,d:'−15 % d’eau en plein soleil.'},
  bandeau:{s:'head',n:'Bandeau',p:40,col:'#e8c03a',heat:.93,d:'La sueur ne coule plus dans les yeux.'},
  bonnet:{s:'head',n:'Bonnet',p:150,col:'#c84a3a',cold:.5,d:'Moitié moins de froid en altitude.'},
  lunettes:{s:'eyes',n:'Lunettes glacier',p:90,col:'#2a2a30',snow:1.05,sun:1.03,d:'+5 % sur la neige et la glace, +3 % au grand soleil.'},
  solaires:{s:'eyes',n:'Solaires effet miroir',p:60,col:'#f08a2a',sun:1.04,d:'+4 % au grand soleil.'},
  aviateur:{s:'eyes',n:'Aviateur doré',p:180,col:'#d8b040',hot:1.06,d:'+6 % dans le désert, le canyon et la savane.'},
  masque:{s:'eyes',n:'Masque de ski',p:300,col:'#5ac0e8',snow:1.09,wind:1,d:'+9 % sur la neige et la glace, plus gêné par le vent.'},
  piscine:{s:'eyes',n:'Lunettes de piscine',p:80,col:'#3a8ae0',rain:1,d:'La pluie ne te ralentit plus du tout.'},
  nocturne:{s:'eyes',n:'Vision nocturne',p:450,col:'#3ad84a',night:1,d:'Moitié moins de pénalité la nuit, même sans frontale.'},
  coeur:{s:'eyes',n:'Lunettes en cœur',p:120,col:'#f04a8a',photo:1.25,d:'+25 % de pièces sur chaque photo d’animal.'},
  gourde:{s:'bag',n:'Gourde à main',p:0,cap:.5,slots:3,d:'0,5 L et trois poches.'},
  ceinture:{s:'bag',n:'Ceinture porte-bidon',p:100,cap:.75,slots:5,d:'0,75 L, cinq aliments.'},
  gilet5:{s:'bag',n:'Gilet 5 L',p:300,cap:1.2,slots:8,vest:1,d:'Deux flasques : 1,2 L, huit aliments.'},
  gilet12:{s:'bag',n:'Gilet 12 L',p:700,cap:2,slots:12,vest:1,d:'2 L, douze aliments. L’ultra commence.'},
  sac20:{s:'bag',n:'Sac 20 L',p:1400,cap:3,slots:18,vest:1,spd:.98,d:'3 L et dix-huit aliments, un peu lourd (−2 %).'},
  alu:{s:'poles',n:'Bâtons alu',p:200,hike:1.1,d:'+10 % dans les montées en marche.'},
  fibre:{s:'poles',n:'Bâtons carbone',p:500,hike:1.18,d:'+18 % dans les montées en marche.'},
  frontale:{s:'lamp',n:'Frontale 300 lm',p:150,night:.93,d:'La nuit ne coûte plus que 7 %.'},
  frontalePro:{s:'lamp',n:'Frontale 1 000 lm',p:600,night:1,d:'Comme en plein jour.'},
  classique:{s:'style',n:'Foulée classique',p:0,d:'Bras à 90°, buste droit. Rien à signaler.'},
  ninja:{s:'style',n:'Bandeau ninja',p:250,down:1.04,d:'Bras tendus en arrière, buste penché, bandeau au vent : +4 % en descente.'},
  heros:{s:'style',n:'Cape de super-héros',p:400,up:1.03,d:'Poing tendu vers le ciel, cape qui claque : +3 % en montée.'},
  genoux:{s:'style',n:'Short rétro de sprinteur',p:300,flat:1.03,d:'Montées de genoux et bras qui pompent : +3 % sur le plat.'},
  moulin:{s:'style',n:'Bandeau éponge années 80',p:200,coin:1.05,d:'Bras en moulinet : +5 % de pièces.'},
  robot:{s:'style',n:'Combinaison de robot',p:350,endu:.95,d:'Raide comme un piquet, mouvements économes : −5 % d’énergie.'},
  gambade:{s:'style',n:'Chaussettes à fleurs',p:150,fauna:1.15,d:'Sautille gaiement : les animaux se montrent plus souvent (+15 %).'},
  zombie:{s:'style',n:'Maquillage de zombie',p:280,nightS:1.06,d:'Bras tendus, démarche traînante, teint verdâtre : +6 % la nuit.'},
  pingouin:{s:'style',n:'Costume de pingouin',p:500,cold:1,d:'Se dandine, ne craint ni le froid ni la neige.'},
  // bivouac : quand la course s'arrête (plus d'eau, d'énergie ou de chaussures), on récupère sur place ; rest = minutes pour récupérer à 100 %
  sac:{s:'biv',n:'Sac de couchage',p:0,rest:45,col:'#c8402e',d:'Récupération en 45 min. Pluie, froid et vent la ralentissent.'},
  tarp:{s:'biv',n:'Tarp et matelas',p:180,rest:35,rain:1,col:'#4a7a4a',d:'35 min. À l’abri de la pluie.'},
  tente:{s:'biv',n:'Tente légère 1 place',p:450,rest:27,rain:1,cold:.5,col:'#e8782a',d:'27 min. Pluie, et le froid ne mord plus autant.'},
  tente4:{s:'biv',n:'Tente 4 saisons',p:1100,rest:20,rain:1,cold:1,wind:1,col:'#e8c03a',d:'20 min. Rien ne passe : pluie, froid, vent.'},
  hamac:{s:'biv',n:'Hamac moustiquaire',p:350,rest:40,fav:['jungle','plage','savane','gorges'],fr:15,rain:1,col:'#3a9a8a',d:'15 min dans la jungle, à la plage, en savane et dans les gorges ; 40 ailleurs.'},
  igloo:{s:'biv',n:'Scie à neige (igloo)',p:700,rest:45,fav:['sommet','glacier','foretneige','crete'],fr:12,cold:1,wind:1,col:'#d8e8f4',d:'12 min dans la neige, bien au chaud ; 45 ailleurs.'},
  garde:{s:'biv',n:'Nuitée en refuge gardé',p:2600,rest:12,rain:1,cold:1,wind:1,meal:1,col:'#8a6a4a',d:'12 min. Dîner chaud et pique-nique : sac d’encas refait gratuitement.'},
  van:{s:'biv',n:'Van aménagé',p:4000,rest:10,rain:1,cold:1,wind:1,col:'#f2f0e8',d:'10 min partout, au chaud. Le van t’attend au bord du chemin.'}
};
const SLOTS=[['style','Style de course'],['biv','Bivouac'],['shoes','Chaussures'],['top','Haut'],['head','Tête'],['eyes','Yeux'],['bag','Portage'],['poles','Bâtons'],['lamp','Frontale']];
const FOOD={
  gel:{n:'Gel',e:12,p:3,ic:'🧪'},
  compote:{n:'Compote',e:14,p:4,ic:'🍏'},
  banane:{n:'Banane',e:16,p:4,ic:'🍌'},
  pate:{n:'Pâte de fruits',e:18,p:5,ic:'🍬'},
  barre:{n:'Barre de céréales',e:22,p:6,ic:'🍫'},
  sandwich:{n:'Sandwich jambon-beurre',e:40,p:12,ic:'🥪'},
  tarte:{n:'Tarte aux myrtilles',e:35,p:14,ic:'🥧',reg:'alpes'},
  fougasse:{n:'Fougasse aux olives',e:35,p:14,ic:'🥖',reg:'med'},
  dattes:{n:'Dattes de l’oasis',e:30,p:12,ic:'🌴',reg:'exo'},
  mangue:{n:'Mangue',e:26,p:10,ic:'🥭',reg:'exo'}
};
const FLASK={l:.5,p:25,max:3},FILTRE={p:150},BUVP=30;
// entraînement : arbre de compétences en 4 branches ; t = palier (colonne), req = [[parent,niveau]]
const BRANCH=[['vit','Vitesse','#e8603a'],['endu','Endurance','#3f9a5a'],['mont','Montagne','#3d7fc4'],['vie','Vie de coureur','#9a5cc0']];
const pct=n=>Math.round(n)+' %';
const UPG={
  vma:{br:'vit',t:0,ic:'⚡',n:'Fractionné (VMA)',d:'Plus rapide partout.',fx:l=>'+'+pct(4*l)+' de vitesse',b:60,max:8},
  seuil:{br:'vit',t:1,ic:'⏱',n:'Allure seuil',d:'Tient l’allure sur le plat.',fx:l=>'+'+pct(5*l)+' sur le plat',b:140,max:3,req:[['vma',2]]},
  descente:{br:'vit',t:1,ic:'⤵',n:'Descente technique',d:'Lâche les freins dans les pentes.',fx:l=>'+'+pct(5*l)+' en descente',b:70,max:8,req:[['vma',1]]},
  nuit:{br:'vit',t:2,ic:'🌙',n:'Sorties de nuit',d:'L’habitude de courir sans voir loin.',fx:l=>'−'+pct(25*l)+' de pénalité la nuit',b:220,max:3,req:[['seuil',1]]},
  endu:{br:'endu',t:0,ic:'🔋',n:'Sortie longue',d:'Le moteur diesel.',fx:l=>'−'+pct(6*l)+' d’énergie dépensée',b:50,max:8},
  thermo:{br:'endu',t:1,ic:'☀',n:'Acclimatation',d:'Transpire moins, boit moins.',fx:l=>'−'+pct(6*l)+' d’eau bue',b:50,max:8,req:[['endu',1]]},
  estomac:{br:'endu',t:1,ic:'🍽',n:'Estomac d’acier',d:'Digère tout, même en côte.',fx:l=>'+'+pct(10*l)+' d’énergie par encas',b:160,max:3,req:[['endu',2]]},
  rustic:{br:'endu',t:2,ic:'🧊',n:'Rusticité',d:'Le froid et la pluie, même pas mal.',fx:l=>'−'+pct(30*l)+' de pénalité froid et pluie',b:240,max:3,req:[['thermo',2]]},
  mental:{br:'endu',t:2,ic:'🧠',n:'Mental d’ultra',d:'Avance quand plus rien ne va.',fx:l=>'−'+pct(25*l)+' de pénalité à sec ou sans énergie',b:300,max:3,req:[['estomac',1]]},
  grimpe:{br:'mont',t:0,ic:'⛰',n:'Côtes',d:'Les répétitions en montée.',fx:l=>'+'+pct(5*l)+' en montée',b:70,max:8},
  marche:{br:'mont',t:1,ic:'🥾',n:'Marche active',d:'Mains sur les cuisses, ça avance.',fx:l=>'+'+pct(6*l)+' en marche dans les raidillons',b:120,max:3,req:[['grimpe',1]]},
  techn:{br:'mont',t:1,ic:'🪨',n:'Pied sûr',d:'Pierriers, racines, neige.',fx:l=>'−'+pct(20*l)+' de pénalité terrain technique',b:150,max:3,req:[['grimpe',2]]},
  semelle:{br:'mont',t:2,ic:'👟',n:'Foulée légère',d:'Use moins ses chaussures.',fx:l=>'−'+pct(12*l)+' d’usure des semelles',b:200,max:3,req:[['techn',1]]},
  sponsor:{br:'vie',t:0,ic:'🪙',n:'Sponsor',d:'Un logo sur le t-shirt.',fx:l=>'+'+pct(10*l)+' de pièces',b:120,max:8},
  bivouac:{br:'vie',t:1,ic:'💤',n:'Sommeil',d:'Continue de courir quand l’onglet est fermé.',fx:l=>'+'+l+' h de course hors onglet',b:150,max:6,req:[['sponsor',1]]},
  oeil:{br:'vie',t:1,ic:'👁',n:'Œil de lynx',d:'Repère les bêtes de loin.',fx:l=>'+'+pct(15*l)+' d’animaux',b:130,max:3,req:[['sponsor',1]]},
  recup:{br:'vie',t:2,ic:'⛺',n:'Récupération',d:'Dort mieux au bivouac.',fx:l=>'−'+pct(12*l)+' de temps de repos',b:200,max:3,req:[['bivouac',1]]},
  patience:{br:'vie',t:2,ic:'📷',n:'Patience',d:'Attend le bon cadrage.',fx:l=>'+'+pct(20*l)+' de pièces par photo',b:180,max:3,req:[['oeil',1]]}
};
// compagnons : on les rencontre dans un biome (b), puis on les adopte en boutique
const COMP={
  chien:{n:'Pastou, border collie',ic:'🐕',b:'alpage',p:250,mv:'run',fauna:1.35,spd:1.02,d:'Repère les animaux (+35 % d’apparitions), +2 % de moral.',meet:'Le berger de l’alpage cherche quelqu’un pour promener son chien…'},
  chat:{n:'Minou, chat de gouttière',ic:'🐈',b:'ville',p:150,mv:'run',coin:1.05,d:'Trouve des pièces dans les caniveaux : +5 % de pièces.',meet:'Un chat des parcs de la ville te suit du regard…'},
  marmotte:{n:'Siffleuse, marmotte',ic:'🐹',b:'lac',p:200,mv:'hop',biv:1,d:'Experte en sieste : +1 h de course hors onglet.',meet:'Une marmotte siffle près du lac d’altitude…'},
  chevre:{n:'Biquette, chèvre du Rove',ic:'🐐',b:'gorges',p:300,mv:'run',up:1.04,tech:.5,d:'Pied sûr : +4 % en montée, moitié moins gênée par le terrain technique.',meet:'Une chèvre gambade sur les rochers des gorges…'},
  fennec:{n:'Sahel, fennec',ic:'🦊',b:'desert',p:350,mv:'run',water:.85,d:'Connaît chaque point d’ombre : −15 % d’eau.',meet:'Deux grandes oreilles dépassent d’une dune…'},
  suricate:{n:'Vigie, suricate',ic:'🦦',b:'savane',p:300,mv:'run',rare:2,d:'Fait le guet : les animaux rares se montrent deux fois plus.',meet:'Un suricate monte la garde dans la savane…'},
  ara:{n:'Coco, ara rouge',ic:'🦜',b:'jungle',p:400,mv:'fly',photo:1.2,d:'Vole au-dessus de toi : +20 % de pièces sur les photos.',meet:'Un ara bavard te suit à travers la jungle…'}
};
const comp=()=>G.comp&&COMP[G.comp]||{};
const upCost=(k,l)=>Math.round(UPG[k].b*Math.pow(1.6,l));
// défis par catégorie ; t = progression, goal = objectif, r = pièces
const km=g=>(g.odo||g.d)/1000,wkm=k=>g=>(g.st.wx[k]||0)/1000,nsp=g=>Object.keys(g.seen).length,upl=g=>Object.values(g.up).reduce((a,b)=>a+b,0);
const QCAT=[['dist','Distance','📏'],['deniv','Dénivelé','⛰'],['mont','Montagne et mer','🏔'],['nat','Nature','📷'],['meteo','Nuit et météo','🌙'],['vie','Vie de coureur','🎒']];
const QUESTS=[
  {c:'dist',id:'km1',n:'Premier kilomètre',t:km,goal:1,r:15},
  {c:'dist',id:'km5',n:'5 bornes',t:km,goal:5,r:30},
  {c:'dist',id:'km10',n:'10 bornes',t:km,goal:10,r:60},
  {c:'dist',id:'semi',n:'Semi-marathon',t:km,goal:21.1,r:120},
  {c:'dist',id:'mara',n:'Marathon',t:km,goal:42.195,r:250},
  {c:'dist',id:'km80',n:'Ultra 80 km',t:km,goal:80,r:450},
  {c:'dist',id:'km100',n:'Ultra 100 km',t:km,goal:100,r:600},
  {c:'dist',id:'miles',n:'100 miles',t:km,goal:160.9,r:1200},
  {c:'dist',id:'km250',n:'250 km',t:km,goal:250,r:1800},
  {c:'dist',id:'km500',n:'Traversée des Alpes (500 km)',t:km,goal:500,r:3500},
  {c:'dist',id:'km1000',n:'1 000 km',t:km,goal:1000,r:8000},
  {c:'deniv',id:'dp1',n:'1 000 m de D+',t:g=>g.dp,goal:1000,r:80},
  {c:'deniv',id:'dp25',n:'2 500 m de D+',t:g=>g.dp,goal:2500,r:180},
  {c:'deniv',id:'dp5',n:'5 000 m de D+',t:g=>g.dp,goal:5000,r:350},
  {c:'deniv',id:'dp10',n:'Everest (8 849 m de D+)',t:g=>g.dp,goal:8849,r:800},
  {c:'deniv',id:'dp20',n:'20 000 m de D+',t:g=>g.dp,goal:20000,r:1800},
  {c:'deniv',id:'dp50',n:'50 000 m de D+',t:g=>g.dp,goal:50000,r:5000},
  {c:'deniv',id:'dn5',n:'5 000 m de D− (les quadris chauffent)',t:g=>g.dn,goal:5000,r:350},
  {c:'mont',id:'alt25',n:'Passer les 2 500 m',t:g=>g.st.maxAlt,goal:2500,r:120},
  {c:'mont',id:'top1',n:'Premier sommet',t:g=>g.st.tops,goal:1,r:100},
  {c:'mont',id:'top3',n:'Trois sommets',t:g=>g.st.tops,goal:3,r:300},
  {c:'mont',id:'top10',n:'Dix sommets',t:g=>g.st.tops,goal:10,r:1000},
  {c:'mont',id:'mer',n:'Voir la mer',t:g=>g.st.mer,goal:1,r:80},
  {c:'mont',id:'mer5',n:'Cinq fois la côte',t:g=>g.st.mer,goal:5,r:400},
  {c:'mont',id:'bio',n:`Traverser les ${Object.keys(BI).length} paysages`,t:g=>Object.keys(g.st.bio).length,goal:Object.keys(BI).length,r:400},
  {c:'mont',id:'cimemer',n:'De la cime à la mer',t:g=>g.st.tops>0&&g.st.mer>0?1:0,goal:1,r:200,txt:'Un sommet et la mer'},
  {c:'nat',id:'ph1',n:'Première photo',t:g=>g.st.photos,goal:1,r:15},
  {c:'nat',id:'sp5',n:'Photographier 5 espèces',t:nsp,goal:5,r:80},
  {c:'nat',id:'sp12',n:'Photographier 12 espèces',t:nsp,goal:12,r:300},
  {c:'nat',id:'spall',n:`Tout le carnet (${Object.keys(FAUNA).length} espèces)`,t:nsp,goal:Object.keys(FAUNA).length,r:1500},
  {c:'nat',id:'ph50',n:'50 photos',t:g=>g.st.photos,goal:50,r:300},
  {c:'nat',id:'gyp',n:'Apercevoir le gypaète barbu',t:g=>g.seen.gypaete?1:0,goal:1,r:400},
  {c:'nat',id:'dauph',n:'Un dauphin au large',t:g=>g.seen.dauphin?1:0,goal:1,r:300},
  {c:'nat',id:'chien',n:'Rencontrer le berger',t:g=>g.st.alpage,goal:1,r:0,txt:'Atteindre un alpage · débloque un compagnon'},
  {c:'meteo',id:'nuit',n:'5 km de nuit',t:g=>g.st.nuit/1000,goal:5,r:90},
  {c:'meteo',id:'nuit30',n:'30 km de nuit',t:g=>g.st.nuit/1000,goal:30,r:400},
  {c:'meteo',id:'pluie',n:'3 km sous la pluie',t:g=>g.st.pluie/1000,goal:3,r:70},
  {c:'meteo',id:'pluie20',n:'20 km sous la pluie',t:g=>g.st.pluie/1000,goal:20,r:350},
  {c:'meteo',id:'brume',n:'5 km dans le brouillard',t:wkm('brume'),goal:5,r:150},
  {c:'meteo',id:'vent',n:'5 km de vent fort',t:wkm('vent'),goal:5,r:150},
  {c:'meteo',id:'chaud',n:'10 km de canicule',t:wkm('chaleur'),goal:10,r:250},
  {c:'meteo',id:'gel',n:'5 km sous 0 °C',t:g=>g.st.froid/1000,goal:5,r:200},
  {c:'meteo',id:'neige',n:'Courir sous la neige',t:g=>g.st.neige/1000,goal:1,r:200},
  {c:'vie',id:'rav',n:'10 ravitos',t:g=>g.st.rav,goal:10,r:120},
  {c:'vie',id:'rav50',n:'50 ravitos',t:g=>g.st.rav,goal:50,r:700},
  {c:'vie',id:'fon',n:'Remplir 20 fois à une fontaine',t:g=>g.st.fon,goal:20,r:200},
  {c:'vie',id:'eat',n:'Avaler 50 encas',t:g=>g.st.eaten,goal:50,r:200},
  {c:'vie',id:'h10',n:'10 h de course',t:g=>g.t/3600,goal:10,r:250},
  {c:'vie',id:'h100',n:'100 h de course',t:g=>g.t/3600,goal:100,r:2500},
  {c:'vie',id:'own8',n:'Huit équipements dans le placard',t:g=>g.own.length,goal:8,r:250},
  {c:'vie',id:'up10',n:'10 séances d’entraînement',t:upl,goal:10,r:400},
  {c:'vie',id:'shoe',n:'User une paire jusqu’à la corde',t:g=>g.st.worn,goal:1,r:100},
  {c:'vie',id:'coins',n:'Gagner 5 000 pièces',t:g=>g.tot,goal:5000,r:500},
  {c:'vie',id:'dog',n:'Adopter un compagnon',t:g=>(g.comps||[]).length,goal:1,r:150},
  {c:'vie',id:'zoo',n:'Ménagerie : quatre compagnons',t:g=>(g.comps||[]).length,goal:4,r:600},
  {c:'vie',id:'zoo7',n:'Toute la troupe (sept compagnons)',t:g=>(g.comps||[]).length,goal:7,r:1500}
];

/* ---------- état sauvegardé ---------- */
const NEW=()=>({v:1,d:0,dp:0,dn:0,t:0,coins:30,tot:0,water:.5,energy:100,wear:0,
  stock:{gel:2,banane:1},gear:{shoes:'route',top:'tshirt',head:null,eyes:null,bag:'gourde',poles:null,lamp:null,biv:'sac'},own:['route','tshirt','gourde','sac'],
  up:{},xp:0,odo:0,camp:{ok:[],best:{},place:{},fin:{}},race:null,lastRes:null,home:1,train:null,lastTrain:null,trainPos:0,dog:0,seen:{},q:[],st:{tops:0,mer:0,nuit:0,pluie:0,rav:0,alpage:0,photos:0,maxAlt:0,eaten:0,wx:{},bio:{},froid:0,neige:0,fon:0,worn:0},
  auto:{eat:40,restock:{gel:3,barre:2}},last:Date.now(),sess:{d:0,dp:0}});
const SV0=store.get('save',{});let G=Object.assign(NEW(),SV0);
G.st=Object.assign(NEW().st,G.st);if(!G.spare)G.spare={};if(G.flask==null)G.flask=0;if(G.xp==null)G.xp=0;if(SV0.v&&SV0.odo==null)G.odo=SV0.d||0;if(!G.camp)G.camp=NEW().camp;if(SV0.v&&SV0.home==null){G.trainPos=SV0.d||0;G.home=G.race&&G.race.st!=='bib'?0:1;if(G.home)G.d=HOME_D}if(!G.comps){G.comps=G.dog?['chien']:[];G.comp=G.dog?'chien':null}if(!G.gear.style)G.gear.style='classique';if(!G.gear.biv)G.gear.biv='sac';if(!G.own.includes('sac'))G.own.push('sac');if(!G.own.includes('classique'))G.own.push('classique');if(G.qSeen==null)G.qSeen=G.q.length;G.auto=Object.assign(NEW().auto,G.auto);
if(Q.has('km')){G.d=parseFloat(Q.get('km'))*1000;G.last=Date.now();Q.delete('km');history.replaceState(null,'',location.pathname+(Q.toString()?'?'+Q:''))}
if(Q.has('tout')){G.coins+=99999;history.replaceState(null,'',location.pathname)}
let RESET=0;   // « Tout recommencer » : plus aucune sauvegarde avant le rechargement
const save=()=>{if(RESET)return;G.last=Date.now();store.set('save',G)};
/* ---------- campagne : courses officielles ---------- */
// legs = [biome, km, altitude d'arrivée de l'étape, options] ; rav = ravitos officiels (km) ;
// fee = dossard ; goal = chrono à battre pour débloquer la suivante ; med/n = peloton fictif ; req = matériel obligatoire
const RACES={
  v5:{n:'Les 5 km de la Vallée',ic:'🌼',e0:820,legs:[['prairie',5,840]],rav:[2.5],fee:15,goal:33*60,med:31.5*60,nb:180,prize:60,
    d:'La course du village, tout plat entre les prés. Idéal pour un premier dossard.'},
  v10:{n:'10 km des Parcs',ic:'🏙',e0:450,legs:[['ville',10,455]],rav:[5],fee:30,goal:62*60,med:58*60,nb:900,prize:120,
    d:'Deux boucles dans les parcs de la ville, sous les platanes.'},
  semi:{n:'Semi des Vignobles',ic:'🍇',e0:590,legs:[['vieilleville',3,575],['vignes',8,470],['lavande',7,620],['vieilleville',3.1,590]],rav:[5,10,15,20],fee:60,goal:2*3600+15*60,med:2*3600+10*60,nb:1500,prize:250,
    d:'De la vieille ville aux domaines, puis le plateau de lavande.',req:[]},
  mara:{n:'Marathon de la Côte',ic:'🌊',e0:420,legs:[['garrigue',10,320],['falaise',6,160],['cote',16,15],['cote',10.2,20]],rav:[5,10,15,20,25,30,35,40],fee:100,goal:4*3600+30*60,med:4*3600+25*60,nb:2500,prize:450,
    d:'42,195 km des collines à la mer, le long des calanques.',req:['eau1']},
  trail:{n:'Trail des Alpages',ic:'⛰',e0:820,legs:[['prairie',3,900],['hetraie',4,1250],['foret',6,1800],['alpage',5,2150],['lac',2,2170],['crete',3,2450],['alpage',3,2050],['foret',5,1300],['prairie',1.5,840]],
    rav:[8,15,24],fee:180,goal:4*3600+45*60,med:5*3600,nb:800,prize:700,d:'La première vraie montagne : forêts, alpages, crête, et la longue descente.',req:['trail','eau1','veste']},
  ultra:{n:'Ultra-Trail des Cimes',ic:'🏔',e0:820,legs:[['prairie',3,900],['hetraie',4,1250],['foret',6,1800],['alpage',5,2150],['crete',3,2450],['glacier',3,2600],['sommet',4,2500,{shape:'peak',ep:2920,top:'Dôme des Neiges'}],
    ['crete',3,2250],['foretneige',4,1900],['alpage',4,1800],['lac',3,1850],['alpage',5,2100],['crete',4,2350],['sommet',4,2300,{shape:'peak',ep:2760,top:'Tête Blanche'}],['foretneige',5,1800],['foret',9,1200],['hetraie',4,900],['prairie',4,830]],
    rav:[10,20,30,40,50,60,70],fee:400,goal:11*3600,med:13*3600,nb:600,prize:2000,d:'Deux sommets, un glacier, une nuit dehors. Le grand voyage.',req:['trail','eau2','veste','frontale','chaud']}
};
const CAMP=Object.keys(RACES);
const REQ={
  trail:{n:'Chaussures de trail',ok:()=>GEAR[G.gear.shoes].rock>0,slot:'shoes'},
  eau1:{n:'Réserve d’eau d’au moins 1 L',ok:()=>capL()>=1,slot:'bag'},
  eau2:{n:'Réserve d’eau d’au moins 2 L',ok:()=>capL()>=2,slot:'bag'},
  veste:{n:'Veste imperméable',ok:()=>!!GEAR[G.gear.top].rain,slot:'top'},
  frontale:{n:'Frontale',ok:()=>!!G.gear.lamp,slot:'lamp'},
  chaud:{n:'Couche chaude (bonnet ou haut chaud)',ok:()=>!!(GEAR[G.gear.top].cold||(G.gear.head&&GEAR[G.gear.head].cold)),slot:'head'}
};
const raceOpen=id=>{const i=CAMP.indexOf(id);return i===0||G.camp.ok.includes(CAMP[i-1])};
const racing=()=>!!(G.race&&G.race.st==='run');
const onRace=()=>!!(G.race&&(G.race.st==='run'||G.race.st==='fin'));
const reqMissing=id=>(RACES[id].req||[]).filter(k=>!REQ[k].ok());
// peloton fictif : temps d'arrivée répartis autour de la médiane
const FIELD={};
function field(id){if(FIELD[id])return FIELD[id];const C=RACES[id],r=rng(CAMP.indexOf(id)*7919+11),a=[];
  for(let i=0;i<C.nb;i++){const z=Math.sqrt(-2*Math.log(r()+1e-9))*Math.cos(2*Math.PI*r());a.push(C.med*Math.exp(.17*z))}return FIELD[id]=a.sort((x,y)=>x-y)}
const placeOf=(id,t)=>{const f=field(id);let i=0;while(i<f.length&&f[i]<t)i++;return i+1};
function takeBib(id){const C=RACES[id];if(G.race||!raceOpen(id)||G.coins<C.fee)return false;G.coins-=C.fee;G.race={id,st:'bib',bib:100+Math.floor(Math.random()*C.nb*1.2)};
  emit('Dossard n° '+G.race.bib,C.n+' · prépare ton matériel, puis prends le départ','🎽');return true}
function dropBib(){if(G.race&&G.race.st==='bib')G.race=null}
function startRace(){
  const R=G.race;if(!R||R.st!=='bib'||reqMissing(R.id).length)return false;
  if(ROUTE.id==='train')G.trainPos=G.d;G.train=null;G.home=0;
  Object.assign(R,{st:'run',t:0,dp0:G.dp});G.rest=null;LIVE.mode='run';
  useRoute(R.id);G.d=0;G.water=capL();G.energy=100;
  emit('Partez !',RACES[R.id].n+' · '+fmt(raceInfo(R.id).len/1000,1)+' km','🏁');if(typeof onRoute==='function')onRoute();return true;
}
function finishRace(dnf,why){
  const R=G.race,C=RACES[R.id],t=R.t,res={id:R.id,t,dnf:!!dnf,why,km:G.d/1000};
  if(!dnf){res.place=placeOf(R.id,t);res.n=C.nb+1;res.ok=t<=C.goal;const b=G.camp.best[R.id];res.pb=!b||t<b;if(res.pb)G.camp.best[R.id]=t;
    if(!G.camp.place[R.id]||res.place<G.camp.place[R.id])G.camp.place[R.id]=res.place;
    if(res.ok&&!G.camp.ok.includes(R.id)){G.camp.ok.push(R.id);res.first=1;addCoins(C.prize);const nx=CAMP[CAMP.indexOf(R.id)+1];res.next=nx}
    G.camp.fin[R.id]=(G.camp.fin[R.id]||0)+1;
    emit('Arrivée · '+C.n,tm(t)+' · '+res.place+'e sur '+res.n+(res.ok?' · objectif atteint !':''),'🏅')}
  else{G.camp.dnf=(G.camp.dnf||0)+1;emit('Abandon · '+C.n,why||'Tu rends ton dossard.','🚩')}
  G.lastRes=res;R.st='fin';if(dnf)backToTrain();
}
function backToTrain(){if(!G.race)return;G.race=null;goHome()}
/* ---------- la maison et les entraînements programmés ---------- */
// k = 'dist' (goal en m), 'time' (goal en s) ou 'libre'
function startTraining(k,goal){
  if(G.race&&G.race.st!=='bib')return false;
  useRoute('train');G.d=G.trainPos||0;G.home=0;G.rest=null;LIVE.mode='run';G.water=capL();G.energy=100;
  G.train={k,goal,t:0,d0:G.d,dp0:G.dp,xp0:G.xp,c0:G.tot};
  emit('C’est parti',k==='dist'?'Sortie de '+fmt(goal/1000,goal%1000?1:0)+' km':k==='time'?'Sortie de '+fmtT(goal):'Sortie libre, rentre quand tu veux','🏃');
  if(typeof onRoute==='function')onRoute();return true;
}
function endTraining(why){
  const T=G.train;if(!T)return;
  G.lastTrain={k:T.k,goal:T.goal,km:(G.d-T.d0)/1000,t:T.t,dp:G.dp-T.dp0,xp:G.xp-T.xp0,coins:G.tot-T.c0,done:why!=='stop',at:Date.now()};
  emit(why==='stop'?'De retour à la maison':'Séance terminée',fmt(G.lastTrain.km,2)+' km · '+fmtT(T.t)+' · +'+fmt(Math.floor(G.lastTrain.xp))+' XP','🏠');
  goHome();
}
function goHome(){
  if(ROUTE.id==='train')G.trainPos=G.d;
  G.train=null;G.home=1;G.rest=null;useRoute('home');G.d=HOME_D;G.water=capL();G.energy=100;LIVE.mode='home';
  if(typeof onRoute==='function')onRoute();
}
const fmtT=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s/60)%60;return h?h+' h'+(m?' '+String(m).padStart(2,'0'):''):m+' min'};
const lvl=k=>G.up[k]||0;
// une compétence s'achète si ses parents ont le niveau demandé (déjà entamée = toujours ouverte)
const upOpen=k=>lvl(k)>0||(UPG[k].req||[]).every(([p,n])=>lvl(p)>=n);
const upCan=k=>upOpen(k)&&lvl(k)<UPG[k].max&&G.xp>=upCost(k,lvl(k));
const capL=()=>GEAR[G.gear.bag].cap,slots=()=>GEAR[G.gear.bag].slots;
const stockN=()=>Object.values(G.stock).reduce((a,b)=>a+b,0);

/* ---------- simulation d'un pas de temps ---------- */
const LIVE={v:0,hr:62,mode:'run',grade:0,why:[],cad:0,ev:[]};
function emit(t1,t2,ic){LIVE.ev.push({t1,t2,ic})}
function condAt(date,dm){
  const wx=weatherAt(date),alt=elevMacro(dm),T=tempAt(date,alt,wx),e=sunElev(date);
  return{wx,alt,T,night:e<-4,sun:e>8&&WX[wx].cloud<.5};
}
// bivouac : pourquoi on s'arrête, combien de minutes il faut pour récupérer ici
const RESTWHY={eau:['Plus une goutte d’eau','💧'],energie:['Plus d’énergie, plus d’encas','⚡'],chaussures:['Semelles finies, pas de paire de rechange','👟']};
function restMin(date=now(),dm=G.d){
  const B=GEAR[G.gear.biv]||GEAR.sac,L=leg(dm),c=condAt(date,dm),pen=[];let m=(B.fav&&B.fav.includes(L.b)?B.fr:B.rest)*(1-.12*lvl('recup'));
  if(WX[c.wx].rain&&!B.rain){m*=1.6;pen.push('pluie')}
  if((c.T<4||c.night&&c.alt>1800)&&(B.cold||0)<1){m*=1+.5*(1-(B.cold||0));pen.push('froid')}
  if(WX[c.wx].wind&&['crete','sommet','falaise','glacier'].includes(L.b)&&!B.wind){m*=1.3;pen.push('vent')}
  return{m,pen};
}
const shoesOk=()=>G.wear<=GEAR[G.gear.shoes].life||(G.spare[G.gear.shoes]||0)>0;
const canGo=()=>G.rest&&G.rest.p>=1&&shoesOk();
function restStep(dt,date){
  const R=G.rest,{m}=restMin(date);
  R.p=Math.min(1,R.p+dt/(m*60));
  G.water=Math.max(G.water,capL()*R.p);G.energy=Math.max(G.energy,100*R.p);
  LIVE.hr=lerp(LIVE.hr,52,1-Math.exp(-dt/30));
  Object.assign(LIVE,{v:0,mode:'rest',grade:gradeAt(G.d),why:[],c:condAt(date,G.d),cad:0});
  if(R.p>=1&&!R.done){R.done=1;emit('Bien reposé',shoesOk()?'Clique sur « Repartir » quand tu veux.':'Il te faut une paire de chaussures pour repartir.','⛺')}
}
function stopRun(why){
  if(racing())return finishRace(1,RESTWHY[why][0]);
  G.rest={why,p:0,d:G.d,t:Date.now()};G.st.biv=(G.st.biv||0)+1;
  emit('Bivouac · '+RESTWHY[why][0],GEAR[G.gear.biv].n+' : récupération en '+Math.round(restMin().m)+' min','⛺');
}
function restart(){
  if(!canGo())return false;
  const B=GEAR[G.gear.biv];G.rest=null;LIVE.mode='run';G.water=capL();G.energy=100;
  if(B.meal)for(const[id,n]of Object.entries(G.auto.restock)){if(!FOOD[id])continue;while((G.stock[id]||0)<n&&stockN()<slots())G.stock[id]=(G.stock[id]||0)+1}
  emit('C’est reparti !',B.meal?'Le gardien t’a refait ton sac d’encas':'Bidons pleins, jambes neuves','🏃');return true;
}
function step(dt,date){
  if(G.home){G.water=capL();G.energy=100;LIVE.hr=lerp(LIVE.hr,58,1-Math.exp(-dt/30));Object.assign(LIVE,{v:0,mode:'home',grade:0,why:[],c:condAt(date,G.d),cad:0});return}
  if(G.rest)return restStep(dt,date);
  const s0=G.d,L=leg(s0),B=BI[L.b],c=condAt(date,s0),gr=gradeAt(s0);
  const sh=GEAR[G.gear.shoes],top=GEAR[G.gear.top],hd=G.gear.head&&GEAR[G.gear.head],why=[];
  let v0=9.2*(1+.04*lvl('vma'))*sh.spd*(GEAR[G.gear.bag].spd||1)*(G.wear>sh.life?.88:1);
  if(G.wear>sh.life)why.push('chaussures usées');
  let mode='run',v;
  if(gr>.14){mode='hike';v=4.6*(G.gear.poles?GEAR[G.gear.poles].hike:1)*(1+.05*lvl('grimpe'))*(1+.06*lvl('marche'))/(1+(gr-.14)*3)}
  else if(gr>0)v=v0*(1+.05*lvl('grimpe')*Math.min(1,gr*8))/(1+gr*8);
  else{const d=-gr;v=v0*(1+Math.min(d,.1)*2.5-Math.max(0,d-.16)*3)*(1+.05*lvl('descente')*Math.min(1,d*8))}
  let k=1;
  const snowy=L.b==='sommet'||L.b==='glacier',tech0=lerp(lerp(B.tech,1,sh.rock*.85),1,snowy&&G.gear.style==='pingouin'?.6:0),tech=lerp(lerp(tech0,1,(G.comp&&COMP[G.comp].tech)||0),1,Math.min(1,.2*lvl('techn')));if(tech<.99)why.push(L.b==='sommet'?'neige':'terrain technique');k*=tech;
  const E0=(G.gear.eyes&&GEAR[G.gear.eyes])||{};
  if(WX[c.wx].rain&&!E0.rain){const f=1-(.1*(1-sh.grip)+(top.rain?0:.05))*(1-.3*lvl('rustic'));if(f<1)why.push('pluie');k*=f}
  if(WX[c.wx].wind&&(L.b==='crete'||L.b==='sommet'||L.b==='falaise')&&!top.wind&&!E0.wind){k*=.9;why.push('vent')}
  const cold=c.T<4;if(cold){const p=Math.max(top.cold||0,(hd&&hd.cold)||0,(GEAR[G.gear.style]||{}).cold||0);if(p<1){k*=1-.08*(1-p)*(1-.3*lvl('rustic'));why.push('froid')}}
  if(c.night){let n=G.gear.lamp?GEAR[G.gear.lamp].night:.72;if(E0.night)n=1-(1-n)/2;n=1-(1-n)*Math.max(0,1-.25*lvl('nuit'));if(n<1)why.push('nuit');k*=n}
  const ey=G.gear.eyes&&GEAR[G.gear.eyes];
  if(ey){if(ey.snow&&(L.b==='sommet'||L.b==='glacier'))k*=ey.snow;if(ey.sun&&c.sun)k*=ey.sun;if(ey.hot&&['desert','canyon','savane'].includes(L.b))k*=ey.hot}
  if(G.boost&&G.boost.t>Date.now())k*=G.boost.k;
  const CP=comp();if(CP.spd)k*=CP.spd;if(CP.up&&gr>.02)k*=CP.up;
  const sty=GEAR[G.gear.style]||{};if(sty.nightS&&c.night)k*=sty.nightS;if(sty.up&&gr>.02)k*=sty.up;if(sty.down&&gr<-.02)k*=sty.down;if(sty.flat&&Math.abs(gr)<=.02)k*=sty.flat;if(Math.abs(gr)<=.03)k*=1+.05*lvl('seuil');
  const mt=Math.min(1,.25*lvl('mental'));if(G.water<=0){k*=lerp(.62,1,mt);why.push('déshydraté')}
  if(G.energy<=0){k*=lerp(.5,1,mt);mode='hike';why.push('coup de barre')}
  v=v*k/3.6;
  const eff=mode==='hike'?1.1:gr>0?1+gr*3:Math.max(.75,1+gr*1.5);
  // consommation
  const hot=c.T>24||c.wx==='chaleur';
  let wr=.48*eff*(hot?1.5:1)*(1+B.heat*.5)*top.water*(hot&&c.sun&&hd&&hd.heat?hd.heat:1)*(1-.06*lvl('thermo'))*((G.comp&&COMP[G.comp].water)||1)*(c.wx==='chaleur'&&G.gear.top==='doudoune'?1.2:1);
  G.water=Math.max(0,G.water-wr*dt/3600);
  if(G.water<=0&&G.flask>0){G.flask--;G.water=Math.min(capL(),FLASK.l);emit('Gourde de secours','+'+fmt(FLASK.l,1)+' L · encore '+G.flask+' dans le sac','🧴')}
  G.energy=Math.max(0,G.energy-27*eff*(1-.06*lvl('endu'))*((GEAR[G.gear.style]||{}).endu||1)*dt/3600);
  if(G.energy<G.auto.eat)autoEat();
  // déplacement
  const s1=s0+v*dt,de=elevMacro(s1)-elevMacro(s0);
  G.d=s1;G.t+=dt;G.odo+=v*dt;if(G.train){const T=G.train;T.t+=dt;if(T.k==='dist'&&G.d-T.d0>=T.goal||T.k==='time'&&T.t>=T.goal){endTraining('done');return}}
  if(racing())G.race.t+=dt;else if(G.race&&G.race.st==='fin'&&G.d>raceInfo(G.race.id).len+220)backToTrain();G.wear+=v*dt/1000*(1-.12*lvl('semelle'));G.sess.d+=v*dt;
  // semelle usée : on enfile une paire de rechange du même modèle s'il en reste
  if(G.wear>sh.life&&(G.spare[G.gear.shoes]||0)>0){G.spare[G.gear.shoes]--;G.wear=0;emit('Nouvelle paire enfilée',`${sh.n} · encore ${G.spare[G.gear.shoes]} en réserve`,'👟')}
  if(de>0){G.dp+=de;G.sess.dp+=de}else G.dn-=de;
  // expérience : 10 par km, 1 par 10 m de D+ (sert à l'entraînement)
  if(!onRace()&&!G.home)G.xp+=v*dt/100+Math.max(0,de)/10;
  G.st.maxAlt=Math.max(G.st.maxAlt,elevMacro(s1));
  if(c.night)G.st.nuit+=v*dt;if(WX[c.wx].rain)G.st.pluie+=v*dt;G.st.wx[c.wx]=(G.st.wx[c.wx]||0)+v*dt;if(c.T<0)G.st.froid+=v*dt;if(WX[c.wx].rain&&(c.alt>2100||c.T<1))G.st.neige+=v*dt;if(G.wear>sh.life&&!G._worn){G._worn=1;G.st.worn++}else if(G.wear<sh.life)G._worn=0;
  // pièces : 1 tous les 100 m (× biome), 1 tous les 10 m de D+
  const mult=B.coin*(1+.1*lvl('sponsor'))*((G.comp&&COMP[G.comp].coin)||1)*((GEAR[G.gear.style]||{}).coin||1);
  const n=Math.floor(s1/100)-Math.floor(s0/100);
  if(n>0)addCoins(n*mult);
  if(de>0){G._dpc=(G._dpc||0)+de;if(G._dpc>=10){addCoins(Math.floor(G._dpc/10)*mult);G._dpc%=10}}
  for(const p of poisIn(s0,s1))passPoi(p);
  // à bout : bivouac sur place
  if(G.water<=0&&!G.flask)stopRun('eau');
  else if(G.energy<=0&&!stockN())stopRun('energie');
  else if(G.wear>sh.life&&!(G.spare[G.gear.shoes]>0))stopRun('chaussures');
  // fréquence cardiaque et cadence (affichage)
  const inten=mode==='hike'?.72+Math.max(0,gr-.14)*.6:gr>0?.68+gr*1.6:Math.max(.55,.68+gr*.8);
  const hrT=58+122*clamp(inten,0,1)+(hot?6:0)+(G.water<=0?10:0)+(c.alt>2200?5:0)-(G.energy<=0?12:0);
  LIVE.hr=lerp(LIVE.hr,hrT,1-Math.exp(-dt/20));
  Object.assign(LIVE,{v,mode,grade:gr,why,c,cad:mode==='hike'?108+Math.round(gr*40):168+Math.round(v*2)});
}
function addCoins(n){n=Math.round(n*100)/100;G.coins+=n;G.tot+=n}
function autoEat(){
  const ids=Object.keys(G.stock).filter(k=>G.stock[k]>0);if(!ids.length)return;
  const need=100-G.energy;
  ids.sort((a,b)=>Math.abs(FOOD[a].e-need*.6)-Math.abs(FOOD[b].e-need*.6));
  eat(ids[0],true);
}
function eat(id,auto){if(!G.stock[id])return;G.stock[id]--;if(!G.stock[id])delete G.stock[id];const e=Math.round(FOOD[id].e*(1+.1*lvl('estomac')));G.energy=Math.min(100,G.energy+e);G.st.eaten++;if(!auto)emit(FOOD[id].n,'+'+e+' d’énergie',FOOD[id].ic)}
function passPoi(p){
  const L=leg(p.d);
  if(p.k==='arrivee'){if(racing())finishRace(0);return}
  if(p.k==='ravito'&&p.race){if(!racing())return;G.water=capL();G.energy=Math.min(100,G.energy+25);G.st.rav++;emit(p.n,'Bidons pleins, +25 d’énergie','🥤');return}
  if(p.k==='ravito'){
    G.water=capL();G.energy=Math.min(100,G.energy+15);G.st.rav++;
    let bought=[];
    for(const[id,n]of Object.entries(G.auto.restock)){const f=FOOD[id];if(!f||(f.reg&&f.reg!==BI[L.b].reg))continue;
      while((G.stock[id]||0)<n&&stockN()<slots()&&G.coins>=f.p){G.coins-=f.p;G.stock[id]=(G.stock[id]||0)+1;bought.push(f.ic)}}
    emit(p.refuge?p.n:'Ravito · '+p.n,'Bidons pleins, +15 d’énergie'+(bought.length?' · réassort '+bought.join(''):''),'⛺');
  }else if(p.k==='ruisseau'){
    if(G.own.includes('filtre')){if(G.water<capL()-.05){G.water=capL();G.st.ruis=(G.st.ruis||0)+1;emit(p.n,'Bidons remplis au filtre','🏞')}}
    else if(G.water<capL()*.3)emit(p.n,'Sans filtre à eau, tu passes sans remplir (Boutique → Ravito).','🏞');
  }else if(p.k==='buvette'||p.k==='cafe'){
    const pr=BUVP;if((G.water<capL()*.7||G.energy<70)&&G.coins>=pr){G.coins-=pr;G.water=capL();G.energy=Math.min(100,G.energy+20);G.st.buv=(G.st.buv||0)+1;
      emit(p.n,(p.k==='cafe'?'Café et croissant':'Sirop et part de tarte')+' : bidons pleins, +20 d’énergie · −'+pr,p.k==='cafe'?'☕':'🏠')}
  }else if(p.k==='fontaine'){if(G.water<capL()-.05){G.water=capL();G.st.fon++;emit(p.n,'Bidons remplis','💧')}}
  else if(p.k==='sommet'){G.st.tops++;G.tops=G.tops||[];G.tops.push({n:p.n,alt:p.alt,d:Date.now()});addCoins(50);emit(p.n+' · '+fmt(p.alt)+' m','Sommet atteint ! +50','⛰')}
  else if(p.k==='panneau'){
    if(L.b==='cote')G.st.mer++;
    if(!G.st.bio[L.b]){const cm=Object.entries(COMP).find(([,c])=>c.b===L.b);if(cm&&!(G.comps||[]).includes(cm[0]))emit('Rencontre · '+cm[1].ic,cm[1].meet+' À adopter dans la boutique.','💛')}
    G.st.bio[L.b]=1;
    if(L.b==='alpage')G.st.alpage++;
    emit(BI[L.b].n,'Nouveau paysage','🪧');
  }
}
function checkQuests(){
  for(const q of QUESTS){if(G.q.includes(q.id))continue;if(q.t(G)>=q.goal){G.q.push(q.id);if(q.r)addCoins(q.r);emit('Défi réussi · '+q.n,(q.r?'+'+q.r+' pièces':'')+(q.txt?' · '+q.txt:''),'🏅')}}
}
// rattrapage quand l'onglet était fermé (plafonné)
function catchUp(sec){
  const cap=(4+lvl('bivouac')+((G.comp&&COMP[G.comp].biv)||0))*3600,run=Math.min(sec,cap),d0=G.d,dp0=G.dp,c0=G.tot,start=Date.now()-sec*1000;
  const evs=LIVE.ev.length;
  for(let t=0;t<run;t+=5)step(Math.min(5,run-t),new Date(start+t*1000));
  LIVE.ev.length=evs;
  checkQuests();
  return{sec:run,capped:sec>cap,km:(G.d-d0)/1000,dp:G.dp-dp0,coins:G.tot-c0};
}
// une course en cours reprend sur son tracé
if(G.race&&(G.race.st==='run'||G.race.st==='fin'))useRoute(G.race.id);
else if(G.home){useRoute('home');G.d=HOME_D}
