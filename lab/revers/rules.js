// Règles illustrées : sections courtes, vraies cartes dessinées dans le style choisi.
import { faceHTML, backHTML } from './cards.js?v=3';

const card = (id, extra = '') => faceHTML(id, extra);
const back = t => backHTML(t);

// ids de cartes (voir engine.js : 12 par terre dans l'ordre P, F, M, A ; puis Blasons 48-51)
const FORET1 = 12, PLAINE3 = 5, FORET2 = 14, MONT4 = 33, MONT5 = 34;
const ECLAIREUR = 23, BRUME = 47, BASTION = 35, CAVALIER = 11, SOUV = 48, OMBRE = 50;

export const SECTIONS = [
  ['bref', 'En bref'], ['cartes', 'Les cartes'], ['table', 'La table'], ['tour', 'Un tour'],
  ['frapper', 'Frapper'], ['climat', 'Climat'], ['blasons', 'Blasons'], ['specs', 'Spécialistes'], ['fin', 'Fin'],
];

export function rulesHTML() {
  return `
<section id="r-bref" class="lead">
  <div class="goal">
    <div class="goal-cards">${back('B')}${card(SOUV)}</div>
    <div>
      <h3>Capturez le Souverain adverse.</h3>
      <p>Il est caché dans la Garde adverse, au milieu d’un leurre, l’Ombre. Les deux ont le même dos : à vous de trouver le bon.</p>
    </div>
  </div>
  <ol class="steps3">
    <li><b>Puiser</b> une carte.</li>
    <li><b>Agir</b> : poser, frapper ou manœuvrer.</li>
    <li>Passer la main.</li>
  </ol>
</section>

<section id="r-cartes">
  <h3><span class="n">1</span> Les cartes ont deux vies</h3>
  <p>La <b>face</b> sert quand vous jouez la carte. Le <b>dos</b> sert quand elle est cachée, ou au sommet de la pioche.</p>
  <div class="anatomy">
    <div class="anat-card">${card(FORET1)}</div>
    <ul class="legend">
      <li><i class="dot red"></i><b>Flèches d’attaque</b> ↖ ↑ ↗ : les cases que l’unité peut frapper. Allumées ou éteintes.</li>
      <li><i class="dot blue"></i><b>Soutiens</b> ◂ ▸ : +1 en défense à la voisine vers laquelle ils pointent.</li>
      <li><i class="dot ink"></i><b>Force</b> (1 à 5) : sert en attaque, en défense, et au décompte final.</li>
      <li><i class="dot gold"></i><b>Terre</b> d’origine : +1 quand le climat est le même.</li>
    </ul>
  </div>
  <p class="tip">Plus une carte est forte, moins elle a de flèches. Un 5 ne frappe que droit devant ; un 1 frappe dans les trois directions et soutient ses deux voisines.</p>
  <h4>Les dos : quatre terres</h4>
  <div class="cards-row backs">
    <figure>${back('P')}<figcaption>Plaine<br><small>défense 1</small></figcaption></figure>
    <figure>${back('F')}<figcaption>Forêt<br><small>défense 2</small></figcaption></figure>
    <figure>${back('M')}<figcaption>Montagne<br><small>défense 3</small></figcaption></figure>
    <figure>${back('A')}<figcaption>Marais<br><small>défense 2</small></figcaption></figure>
    <figure>${back('B')}<figcaption>Blason<br><small>défense 2</small></figcaption></figure>
  </div>
  <p class="tip">Une carte posée face cachée défend avec la valeur de son dos. L’adversaire voit les dos de votre main : il connaît vos terres, pas vos unités.</p>
</section>

<section id="r-table">
  <h3><span class="n">2</span> La table</h3>
  <div class="mini-table">
    <div class="mt-side them"><span>Garde adverse</span><span>Front adverse</span></div>
    <div class="mt-grid">
      <div class="mt-row g">${'<i></i>'.repeat(5)}</div>
      <div class="mt-row f">${'<i></i>'.repeat(5)}</div>
      <div class="mt-mid">pioche · marché</div>
      <div class="mt-row f me">${'<i></i>'.repeat(5)}</div>
      <div class="mt-row g me"><i></i><i class="bl">♛</i><i></i><i class="bl">☾</i><i></i></div>
    </div>
    <div class="mt-side"><span>Votre Front</span><span>Votre Garde</span></div>
  </div>
  <ul class="bul">
    <li>Chaque joueur a <b>5 colonnes</b> et <b>2 rangées</b> : le <b>Front</b> devant, la <b>Garde</b> derrière.</li>
    <li>On commence avec son <b>Souverain ♛</b> et son <b>Ombre ☾</b> cachés dans la Garde.</li>
    <li>Une carte au Front <b>protège</b> la Garde de sa colonne : on ne peut pas frapper derrière elle.</li>
  </ul>
</section>

<section id="r-tour">
  <h3><span class="n">3</span> Un tour</h3>
  <div class="phase">
    <div class="ph-n">①</div>
    <div><b>Puiser</b> : prenez une carte du <b>marché</b> (face visible), ou le sommet de la <b>pioche</b> à l’aveugle (vous voyez seulement sa terre).
      <p class="small">Le premier joueur ne puise pas à son premier tour. Avec 7 cartes en main, on ne puise plus : le sommet de la pioche part à la défausse.</p></div>
  </div>
  <div class="phase">
    <div class="ph-n">②</div>
    <div><b>Une action</b>, au choix :
      <div class="acts">
        <div class="act"><b>Déployer</b><span>poser une carte face visible</span></div>
        <div class="act"><b>Enfouir</b><span>poser une carte face cachée</span></div>
        <div class="act"><b>Frapper</b><span>attaquer avec une unité</span></div>
        <div class="act"><b>Manœuvrer</b><span>échanger deux de vos cases voisines</span></div>
      </div>
    </div>
  </div>
  <div class="phase bonus">
    <div class="ph-n">+</div>
    <div><b>Embuscade</b> (gratuite, une fois par tour) : retournez une de vos cartes cachées pour en faire une unité.</div>
  </div>
</section>

<section id="r-frapper">
  <h3><span class="n">4</span> Frapper</h3>
  <div class="duel">
    <figure>${card(PLAINE3)}<figcaption>attaque <b>3</b></figcaption></figure>
    <div class="vs">≥</div>
    <figure>${card(FORET2)}<figcaption>défense <b>2</b></figcaption></figure>
    <div class="res ok">capturée</div>
  </div>
  <ul class="bul">
    <li>Une unité visible frappe selon ses <b>flèches</b> : la carte d’en face, ou en diagonale.</li>
    <li>Si le Front de la colonne visée est vide, la frappe atteint la <b>Garde</b>.</li>
    <li>Si l’attaque est <b>au moins égale</b> à la défense, la cible est capturée et va <b>dans votre main</b> : vous pourrez la rejouer.</li>
    <li><b>Élan</b> : après une capture, la même unité peut frapper une seconde fois.</li>
  </ul>
  <h4>La défense</h4>
  <div class="duel">
    <figure>${card(MONT4)}<figcaption>soutien ▸</figcaption></figure>
    <div class="plus">+</div>
    <figure>${card(FORET2)}<figcaption>2 + 1 = <b>3</b></figcaption></figure>
  </div>
  <p class="tip">Une unité visible défend avec sa force, +1 par voisine dont le soutien pointe vers elle. Dans le jeu, le calcul s’affiche sur chaque cible (« 4 contre 3 »).</p>
</section>

<section id="r-climat">
  <h3><span class="n">5</span> Le climat</h3>
  <p>Le dos visible au sommet de la pioche donne le <b>climat</b>. Il change chaque fois qu’on puise.</p>
  <div class="climats">
    <div class="cl">${back('P')}<div><b>Plaine</b><span>Aucun effet.</span></div></div>
    <div class="cl">${back('F')}<div><b>Forêt</b><span>Les flèches diagonales ne portent pas.</span></div></div>
    <div class="cl">${back('M')}<div><b>Montagne</b><span>Toutes les défenses +1.</span></div></div>
    <div class="cl">${back('A')}<div><b>Marais</b><span>Manœuvre interdite.</span></div></div>
  </div>
  <p class="tip"><b>Chez soi</b> : une unité de la même terre que le climat gagne +1. Puiser à l’aveugle sert aussi à changer le climat.</p>
</section>

<section id="r-blasons">
  <h3><span class="n">6</span> Souverain et Ombre</h3>
  <div class="two">
    <figure>${card(SOUV)}<figcaption><b>Souverain</b>Frappé avec succès alors qu’il est caché, il est <b>démasqué</b> (échec) : il défend ensuite à 3 + soutiens. Une deuxième frappe réussie le capture : <b>victoire</b>.</figcaption></figure>
    <figure>${card(OMBRE)}<figcaption><b>Ombre</b>Un piège. Si vous la frappez avec succès, votre attaquant passe chez l’adversaire. Mais vous savez alors où est le vrai Souverain.</figcaption></figure>
  </div>
</section>

<section id="r-specs">
  <h3><span class="n">7</span> Les spécialistes</h3>
  <p>Un par terre. Leur pouvoir agit quand ils sont posés face visible, ou retournés en embuscade.</p>
  <div class="specs">
    <figure>${card(ECLAIREUR)}<figcaption><b>Éclaireur</b>Regarde une carte cachée adverse.</figcaption></figure>
    <figure>${card(BRUME)}<figcaption><b>Brume</b>Échange vos deux Blasons en secret, ou fait semblant.</figcaption></figure>
    <figure>${card(BASTION)}<figcaption><b>Bastion</b>Force 4, les diagonales ne peuvent pas le viser.</figcaption></figure>
    <figure>${card(CAVALIER)}<figcaption><b>Cavalier</b>Manœuvre avec n’importe quelle case, même sous Marais.</figcaption></figure>
  </div>
</section>

<section id="r-fin">
  <h3><span class="n">8</span> Fin de partie</h3>
  <ul class="bul">
    <li><b>Victoire</b> immédiate en capturant le Souverain adverse.</li>
    <li>Si la pioche est vide : encore <b>2 tours</b>, puis le joueur qui a la plus grosse <b>force visible</b> sur la table gagne. Les cartes cachées ne comptent pas.</li>
  </ul>
  <div class="mono-tip">${card(MONT5, 'tiny')}<p>Conseil : gardez votre Garde couverte, comptez les terres dans la main adverse, et n’attaquez un Blason qu’en sachant ce que vous risquez.</p></div>
</section>`;
}
