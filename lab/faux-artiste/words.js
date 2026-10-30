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
