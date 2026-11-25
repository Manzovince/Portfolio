// Categories and secret words, as [fr, en] pairs. Picked to be drawable in a few strokes.
window.CATEGORIES = [
  { id: 'animaux', fr: 'Animaux', en: 'Animals', words: [
    ['chat','cat'],['éléphant','elephant'],['girafe','giraffe'],['serpent','snake'],['pieuvre','octopus'],['escargot','snail'],
    ['papillon','butterfly'],['pingouin','penguin'],['lapin','rabbit'],['crocodile','crocodile'],['tortue','turtle'],['araignée','spider'],
    ['requin','shark'],['hibou','owl'],['kangourou','kangaroo'],['cochon','pig'],['poisson','fish'],['dromadaire','camel'] ] },
  { id: 'nourriture', fr: 'Nourriture', en: 'Food', words: [
    ['pizza','pizza'],['banane','banana'],['croissant','croissant'],['hamburger','hamburger'],['glace','ice cream'],['ananas','pineapple'],
    ['carotte','carrot'],['œuf au plat','fried egg'],['fromage','cheese'],['spaghetti','spaghetti'],['gâteau d\'anniversaire','birthday cake'],['pomme','apple'],
    ['sushi','sushi'],['baguette','baguette'],['champignon','mushroom'],['pastèque','watermelon'],['popcorn','popcorn'],['hot-dog','hot dog'] ] },
  { id: 'objets', fr: 'Objets', en: 'Objects', words: [
    ['parapluie','umbrella'],['lunettes','glasses'],['ciseaux','scissors'],['clé','key'],['ampoule','light bulb'],['horloge','clock'],
    ['téléphone','phone'],['bougie','candle'],['marteau','hammer'],['sablier','hourglass'],['appareil photo','camera'],['cadenas','padlock'],
    ['brosse à dents','toothbrush'],['ballon de baudruche','balloon'],['échelle','ladder'],['couronne','crown'],['loupe','magnifying glass'],['enveloppe','envelope'] ] },
  { id: 'metiers', fr: 'Métiers', en: 'Jobs', words: [
    ['pompier','firefighter'],['cuisinier','chef'],['astronaute','astronaut'],['pirate','pirate'],['médecin','doctor'],['peintre','painter'],
    ['policier','police officer'],['magicien','magician'],['facteur','postman'],['plongeur','diver'],['jardinier','gardener'],['boulanger','baker'],
    ['clown','clown'],['pilote','pilot'],['dentiste','dentist'],['coiffeur','hairdresser'],['photographe','photographer'],['chevalier','knight'] ] },
  { id: 'sports', fr: 'Sports', en: 'Sports', words: [
    ['tennis','tennis'],['ski','skiing'],['natation','swimming'],['basket','basketball'],['golf','golf'],['surf','surfing'],
    ['boxe','boxing'],['cyclisme','cycling'],['bowling','bowling'],['tir à l\'arc','archery'],['escalade','climbing'],['football','soccer'],
    ['voile','sailing'],['plongée','diving'],['ping-pong','table tennis'],['patinage','ice skating'],['haltérophilie','weightlifting'],['judo','judo'] ] },
  { id: 'lieux', fr: 'Lieux', en: 'Places', words: [
    ['plage','beach'],['château','castle'],['phare','lighthouse'],['pyramide','pyramid'],['tour Eiffel','Eiffel Tower'],['igloo','igloo'],
    ['volcan','volcano'],['cinéma','cinema'],['piscine','swimming pool'],['église','church'],['désert','desert'],['île déserte','desert island'],
    ['cirque','circus'],['prison','prison'],['ferme','farm'],['aéroport','airport'],['bibliothèque','library'],['grotte','cave'] ] },
  { id: 'transports', fr: 'Transports', en: 'Transport', words: [
    ['vélo','bicycle'],['avion','plane'],['bateau','boat'],['fusée','rocket'],['hélicoptère','helicopter'],['train','train'],
    ['montgolfière','hot-air balloon'],['sous-marin','submarine'],['trottinette','scooter'],['tracteur','tractor'],['skateboard','skateboard'],['voiture','car'],
    ['ambulance','ambulance'],['camion de pompiers','fire truck'],['téléphérique','cable car'],['voilier','sailboat'],['moto','motorbike'],['tapis volant','flying carpet'] ] },
  { id: 'nature', fr: 'Nature', en: 'Nature', words: [
    ['arbre','tree'],['soleil','sun'],['arc-en-ciel','rainbow'],['nuage','cloud'],['montagne','mountain'],['fleur','flower'],
    ['cactus','cactus'],['éclair','lightning'],['vague','wave'],['lune','moon'],['tornade','tornado'],['palmier','palm tree'],
    ['flocon de neige','snowflake'],['cascade','waterfall'],['étoile filante','shooting star'],['feuille','leaf'],['champignon vénéneux','toadstool'],['coquillage','seashell'] ] },
  { id: 'maison', fr: 'Maison', en: 'Home', words: [
    ['lit','bed'],['baignoire','bathtub'],['canapé','sofa'],['réfrigérateur','fridge'],['lampe','lamp'],['escalier','stairs'],
    ['cheminée','fireplace'],['fenêtre','window'],['toilettes','toilet'],['télévision','television'],['chaise','chair'],['machine à laver','washing machine'],
    ['grille-pain','toaster'],['aspirateur','vacuum cleaner'],['miroir','mirror'],['douche','shower'],['porte','door'],['bureau','desk'] ] },
  { id: 'vetements', fr: 'Vêtements', en: 'Clothing', words: [
    ['chapeau','hat'],['chaussette','sock'],['cravate','tie'],['robe','dress'],['écharpe','scarf'],['botte','boot'],
    ['casquette','cap'],['gant','glove'],['maillot de bain','swimsuit'],['pyjama','pyjamas'],['nœud papillon','bow tie'],['sac à main','handbag'],
    ['tutu','tutu'],['bonnet','beanie'],['ceinture','belt'],['tongs','flip-flops'],['manteau','coat'],['talons hauts','high heels'] ] },
  { id: 'musique', fr: 'Musique', en: 'Music', words: [
    ['guitare','guitar'],['piano','piano'],['batterie','drums'],['violon','violin'],['trompette','trumpet'],['micro','microphone'],
    ['harpe','harp'],['accordéon','accordion'],['casque audio','headphones'],['saxophone','saxophone'],['flûte','flute'],['note de musique','musical note'],
    ['chef d\'orchestre','conductor'],['tambourin','tambourine'],['xylophone','xylophone'],['disque vinyle','vinyl record'],['cornemuse','bagpipes'],['maracas','maracas'] ] },
  { id: 'fiction', fr: 'Imaginaire', en: 'Fantasy', words: [
    ['dragon','dragon'],['licorne','unicorn'],['fantôme','ghost'],['sirène','mermaid'],['robot','robot'],['extraterrestre','alien'],
    ['sorcière','witch'],['vampire','vampire'],['zombie','zombie'],['père Noël','Santa Claus'],['fée','fairy'],['dinosaure','dinosaur'],
    ['soucoupe volante','flying saucer'],['baguette magique','magic wand'],['momie','mummy'],['coffre au trésor','treasure chest'],['bonhomme de neige','snowman'],['super-héros','superhero'] ] },
];

// Close-word pairs for the forger (Faux artiste) and "Même mot ?": different words that start out
// drawn the same way (same outline, the difference is in a detail). c = a category id from above, or
// a [fr, en] label shared by both words when they sit in different categories (both cards show it).
window.PAIRS = [
  ['animaux', ['chat','cat'], ['chien','dog']], ['animaux', ['lion','lion'], ['tigre','tiger']],
  ['animaux', ['cheval','horse'], ['zèbre','zebra']], ['animaux', ['âne','donkey'], ['cheval','horse']],
  ['animaux', ['requin','shark'], ['dauphin','dolphin']], ['animaux', ['escargot','snail'], ['limace','slug']],
  ['animaux', ['abeille','bee'], ['guêpe','wasp']], ['animaux', ['papillon','butterfly'], ['libellule','dragonfly']],
  ['animaux', ['crocodile','crocodile'], ['lézard','lizard']], ['animaux', ['lapin','rabbit'], ['souris','mouse']],
  ['animaux', ['canard','duck'], ['poule','hen']], ['animaux', ['mouton','sheep'], ['chèvre','goat']],
  ['animaux', ['vache','cow'], ['cochon','pig']], ['animaux', ['ours','bear'], ['panda','panda']],
  ['animaux', ['renard','fox'], ['loup','wolf']], ['animaux', ['phoque','seal'], ['morse','walrus']],
  ['animaux', ['araignée','spider'], ['fourmi','ant']], ['animaux', ['corbeau','crow'], ['perroquet','parrot']],
  ['nourriture', ['citron','lemon'], ['orange','orange']], ['nourriture', ['fraise','strawberry'], ['framboise','raspberry']],
  ['nourriture', ['tarte','pie'], ['pizza','pizza']], ['nourriture', ['pomme','apple'], ['tomate','tomato']],
  ['nourriture', ['hamburger','hamburger'], ['sandwich','sandwich']], ['nourriture', ['croissant','croissant'], ['banane','banana']],
  ['nourriture', ['carotte','carrot'], ['radis','radish']], ['nourriture', ['poire','pear'], ['avocat','avocado']],
  ['nourriture', ['cerise','cherry'], ['raisin','grapes']], ['nourriture', ['glace','ice cream'], ['sucette','lollipop']],
  ['nourriture', ['œuf','egg'], ['citron','lemon']],
  ['objets', ['lunettes','glasses'], ['jumelles','binoculars']], ['objets', ['marteau','hammer'], ['hache','axe']],
  ['objets', ['parapluie','umbrella'], ['parasol','beach umbrella']], ['objets', ['bougie','candle'], ['crayon','pencil']],
  ['objets', ['ciseaux','scissors'], ['pince','pliers']], ['objets', ['horloge','clock'], ['boussole','compass']],
  ['objets', ['téléphone','phone'], ['télécommande','remote control']], ['objets', ['livre','book'], ['ordinateur portable','laptop']],
  ['objets', ['valise','suitcase'], ['sac à main','handbag']],
  ['maison', ['lit','bed'], ['canapé','sofa']], ['maison', ['fenêtre','window'], ['tableau','painting']],
  ['maison', ['frigo','fridge'], ['armoire','wardrobe']], ['maison', ['four','oven'], ['télévision','television']],
  ['vetements', ['chaussette','sock'], ['botte','boot']], ['vetements', ['t-shirt','T-shirt'], ['robe','dress']],
  ['vetements', ['chapeau','hat'], ['casquette','cap']], ['vetements', ['gant','glove'], ['moufle','mitten']],
  ['vetements', ['jupe','skirt'], ['short','shorts']], ['vetements', ['écharpe','scarf'], ['cravate','tie']],
  ['lieux', ['maison','house'], ['église','church']], ['lieux', ['tente','tent'], ['pyramide','pyramid']],
  ['lieux', ['château','castle'], ['prison','prison']], ['lieux', ['phare','lighthouse'], ['moulin','windmill']],
  ['transports', ['voiture','car'], ['camion','truck']], ['transports', ['fusée','rocket'], ['avion','plane']],
  ['transports', ['vélo','bicycle'], ['moto','motorbike']], ['transports', ['bateau','boat'], ['sous-marin','submarine']],
  ['transports', ['bus','bus'], ['train','train']], ['transports', ['montgolfière','hot-air balloon'], ['parachute','parachute']],
  ['musique', ['guitare','guitar'], ['violon','violin']], ['musique', ['trompette','trumpet'], ['saxophone','saxophone']],
  ['sports', ['ski','skiing'], ['snowboard','snowboarding']], ['sports', ['golf','golf'], ['hockey','hockey']],
  ['nature', ['soleil','sun'], ['fleur','flower']], ['nature', ['montagne','mountain'], ['volcan','volcano']],
  ['nature', ['étoile','star'], ['étoile de mer','starfish']], ['nature', ['arbre','tree'], ['sapin','fir tree']],
  ['fiction', ['dragon','dragon'], ['dinosaure','dinosaur']], ['fiction', ['sorcière','witch'], ['fée','fairy']],
  ['fiction', ['fantôme','ghost'], ['bonhomme de neige','snowman']], ['fiction', ['vampire','vampire'], ['zombie','zombie']],
  [['Créatures','Creatures'], ['licorne','unicorn'], ['cheval','horse']], [['Créatures','Creatures'], ['sirène','mermaid'], ['poisson','fish']],
  [['Rond','Round'], ['ballon','ball'], ['lune','moon']], [['Rond','Round'], ['donut','donut'], ['pneu','tyre']],
  [['Vert','Green'], ['arbre','tree'], ['brocoli','broccoli']], [['Tout doux','Fluffy'], ['nuage','cloud'], ['mouton','sheep']],
  [['Jaune','Yellow'], ['lune','moon'], ['banane','banana']], [['Ça ondule','Wavy'], ['vague','wave'], ['serpent','snake']],
  [['Sous la pluie','In the rain'], ['parapluie','umbrella'], ['champignon','mushroom']], [['En forme de goutte','Drop-shaped'], ['ampoule','light bulb'], ['poire','pear']],
  [['Tout en hauteur','Tall things'], ['phare','lighthouse'], ['fusée','rocket']], [['Se tient à la main','Handheld'], ['cornet de glace','ice cream cone'], ['micro','microphone']],
  [['Cylindres','Cylinders'], ['tambour','drum'], ['gâteau','cake']], [['Dômes','Domes'], ['igloo','igloo'], ['tortue','turtle']],
  [['Arches','Arches'], ['arc-en-ciel','rainbow'], ['pont','bridge']],
];

// "Le bluff des titres": the drawer gets one subject + one situation, as [fr, en] pairs.
// Situations are worded so they never need to agree with the subject's gender.
window.BLUFF = {
  who: [
    ['un chat','a cat'],['une girafe','a giraffe'],['un grille-pain','a toaster'],['un dinosaure','a dinosaur'],['une pieuvre','an octopus'],
    ['un robot','a robot'],['une grand-mère','a grandma'],['un fantôme','a ghost'],['un pingouin','a penguin'],['une banane','a banana'],
    ['un cactus','a cactus'],['un chevalier','a knight'],['une vache','a cow'],['un escargot','a snail'],['un pirate','a pirate'],
    ['une licorne','a unicorn'],['un hamster','a hamster'],['un astronaute','an astronaut'],['une sorcière','a witch'],['un requin','a shark'],
    ['un bonhomme de neige','a snowman'],['un éléphant','an elephant'],['une tortue','a turtle'],['un vampire','a vampire'],['un pompier','a firefighter'],
    ['une poule','a hen'],['un ours','a bear'],['un extraterrestre','an alien'],['un crocodile','a crocodile'],['une baleine','a whale'],
  ],
  what: [
    ['qui fait du ski','skiing'],['en vacances','on vacation'],['sur la Lune','on the Moon'],['qui a peur du noir','afraid of the dark'],['au restaurant','at a restaurant'],
    ['en colère','who is angry'],['qui fait la vaisselle','doing the dishes'],['à la plage','at the beach'],['qui joue de la guitare','playing the guitar'],['dans une baignoire','in a bathtub'],
    ['qui fait du vélo','riding a bike'],['sous la pluie','in the rain'],['à un mariage','at a wedding'],['qui passe l\'aspirateur','vacuuming'],['chez le dentiste','at the dentist'],
    ['qui fait du yoga','doing yoga'],['en prison','in jail'],['qui mange des spaghettis','eating spaghetti'],['au cinéma','at the cinema'],['qui fait un selfie','taking a selfie'],
    ['en pyjama','in pajamas'],['qui danse','dancing'],['sur un skateboard','on a skateboard'],['qui pêche','fishing'],['dans un ascenseur','in an elevator'],
    ['qui fait un gâteau','baking a cake'],['qui a le hoquet','with the hiccups'],['au sommet d\'une montagne','on a mountaintop'],['qui promène son chien','walking the dog'],['qui fait du karaoké','doing karaoke'],
  ],
};
