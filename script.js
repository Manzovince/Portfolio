// Load components
// Navbar
class NavComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.currentPageName = '';
  }

  static get observedAttributes() {
    return ['page-name'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'page-name' && newValue) {
      this.currentPageName = newValue;
      this.updatePageNameDisplay();
    }
  }

  connectedCallback() {
    // HTML content for the navigation
    this.shadowRoot.innerHTML = `     
      <style>
        @import url('./styles.css');
      </style>
      <nav id="nav">
        <div class="page-path">
          <a id="path" href="./index.html#introduction">
              <div>Vincent Manzoni</div>
          </a>
          <div id="page-name-container" style="display: none;">
            <div class="path-separator">/</div>
            <div id="current-page"></div>
          </div>
        </div>
        <input id="nav-checkbox" type="checkbox">
        <label id="nav-container" for="nav-checkbox">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0 L16 0 L16 16 L16 16 Z" fill="currentColor" />
            </svg>
        </label>
        <ul id="nav-list">
            <li>
                <a href="./index.html#featured" onclick="this.getRootNode().host.closeMenu()" 
                    data-i18n="navProjects">Projects</a>
            </li>
            <li>
                <a href="./index.html#personal" onclick="this.getRootNode().host.closeMenu()"
                    data-i18n="navPersonal">Experiments</a>
            </li>
            <li>
                <a href="./index.html#about" onclick="this.getRootNode().host.closeMenu()"
                    data-i18n="navAbout">About me</a>
            </li>
        </ul>
      </nav>
    `;
    
    // Initialize page name if attribute is already set
    if (this.hasAttribute('page-name')) {
      this.currentPageName = this.getAttribute('page-name');
      this.updatePageNameDisplay();
    }
  }
  
  // Method to close the mobile menu
  closeMenu() {
    const checkbox = this.shadowRoot.getElementById('nav-checkbox');
    if (checkbox) {
      checkbox.checked = false;
    }
  }
  
  // Method to update the page name display
  updatePageNameDisplay() {
    const pageNameContainer = this.shadowRoot.getElementById('page-name-container');
    const currentPage = this.shadowRoot.getElementById('current-page');
    
    if (pageNameContainer && currentPage && this.currentPageName) {
      currentPage.textContent = this.currentPageName;
      pageNameContainer.style.display = 'flex';
    } else if (pageNameContainer) {
      pageNameContainer.style.display = 'none';
    }
  }
  
  // Convenience setter method for page name
  set pageName(value) {
    this.setAttribute('page-name', value);
  }
}

// Footer
class FooterComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // HTML content for the footer
    this.shadowRoot.innerHTML = `     
      <style>
        @import url('./styles.css');
      </style>
      <footer>
        <div class="footer-item">
          <div class="footer-label">Contact</div>
          <a href="mailto:hello@manzovince.com" class="footer-content">hello@manzovince.com</a>
        </div>
        <div class="footer-item">
          <div class="footer-label">Location</div>
          <div class="footer-content">48.8575° N, 2.3514° E</div>
        </div>
        <div class="footer-item">
          <div class="footer-label">Copyright</div>
          <div class="footer-content">&copy; ${new Date().getFullYear()} Vincent Manzoni.</div>
        </div>
        <div class="footer-socials">
          <a href="https://www.linkedin.com/in/vincent-manzoni/" target="_blank" rel="noopener noreferrer">
            <svg
              id="linkedin" 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="32" 
              viewBox="0 0 24 24"
              fill="none" 
              stroke="currentColor" 
              stroke-width="1" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            >
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
              <rect width="4" height="12" x="2" y="9"></rect>
              <circle cx="4" cy="4" r="2"></circle>
            </svg>
          </a>
          <a href="https://www.instagram.com/manzovince/" target="_blank" rel="noopener noreferrer">
            <svg
              id="instagram" 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="32" 
              viewBox="0 0 24 24"
              fill="none" 
              stroke="currentColor" 
              stroke-width="1" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
            </svg>
          </a>
          <a href="https://github.com/Manzovince" target="_blank" rel="noopener noreferrer">
            <svg 
              id="github"
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none"
              stroke="currentColor" 
              stroke-width="1" 
              stroke-linecap="round" 
              stroke-linejoin="round"
              data-lucide="github"
            >
              <path
                d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4">
              </path>
              <path d="M9 18c-4.51 2-5-2-7-2"></path>
            </svg>
          </a>
        </div>
      </footer>
    `;
  }
}

// Register the web component
customElements.define('site-nav', NavComponent);
customElements.define('site-footer', FooterComponent);


// Languages
const translations = {
  en: {
    navProcess: "Methodology",
    navProjects: "Work",
    navPersonal: "Experiments",
    navAbout: "About me",
    introText: "I'm Vincent, a <span>product designer</span> with a background in cognitive and computer sciences, driven by a research-backed methodology.",
    proProjectText: "Discover my vision of design through my professional and personal projects, in the financial space and health.",
    persoProjectText: "Beside, I also like to capture pixels and play with 0 and 1s.",
    projectPlaceholder: "Coming soon !",
    projectAccessText: "Go to website",
    sgmIsoTitle: "A new financial standard",
    sgmIso1: "This service was created from a design challenge for a new request to help clients check their payment transactions file format against the ISO standard (ISO20022) for electronic data interchange between financial institutions.",
    sgmIso2: "We created an homepage that introduce the new ISO 20022 standard, along with some tips on how to do a successful migration, and an upload area to add one or more files. <br><br> After submitting a file, the document is parsed locally and enable clients to preview all informations in a human readable way, with highlights when errors are detected, and each one is accompanied with details on how to resolve it.",
    sgmIso3: "Starting with a short brief from the team requesting this new service, we were introduced to a proof of concept website where we can upload and preview a document, with highlighted errors in red. The XML file format is based on a specific tag structure, and each element must follow a specific format. <br><br> After an ideation phase, we decided to make an interface that allows to quickly navigate between batches (as tabs) and transactions (in a sidepanel). The elements of a transaction can then articulate in the center of the screen, with details on the transaction. <br><br> For each error detected, a message is displayed next to it, with a link to the ISO standard section that explains how to resolve this error.",
    sgmDesign1: "I worked on the migration of the SG Markets Design page to the latest version of the Design system, and implemented a complete redesign of the 'Join us' page.",
    sgmDesign2: "During a team event, we embarked on a collaborative redesign project of the 'Join us' page. I then had the goal of developing this new page with a focus on engaging interactions.",
    sgmDesign3: "This project allowed me to better understand the challenges of a front-end developer, with the use of React components, the implementation of a responsive page and CSS animations. In addition, I learned how to master the steps required to publish a service in production with deployment configuration, as well as auditing the service after deployment to maintain optimal performance.",
    popin1: "When a child is born, two adults are transformed into parents. In a way, it is the child who makes the parents. Becoming a parent is life changing, in every way possible. <br><br> From happiness to frustration, we want the best for our children, and this can very quickly become stressful. Elodie Hughes, mother of 4 children and entrepreneur, has put together a small team to find a solution.",
    popin2: "Child development is a complex process. Parents need to learn a lot of things, and the web is a wide source of knowledge, but informations often contradicts. To provide clear and concise facts and tips to parents, and in the new era of human-like interaction with technology, we found that creating a chatbot was a fun and powerful way to educate. <br><br> We made a corpus of the most asked questions asked by parents, and there are a lot of subjects about babies: alimentation, health, sleep... Babies need a lot of sleep (approx. 20 hours per day as a newborn) and parents too. But it often doesn't work as we want, because babies don't have the same sleep cycle, and they need to embody the circadian rythm of day and night. <br><br> We decided to give only science-based facts, and link them with practical tips and advices when it was possible.",
    popin3: "When we had all we need : personas, user flows, Q/A content, and a new face for Pop-in, we needed to structure a discussion to make users understand who Pop-in is, what she does and how to talk to her. I tested multiple platforms before finding the write one. It was a way for me to learn how chatbots works, and to quickly get parents interested. Our final solution was to use DialogFlow for a good Natural Language Understanding, and ManyChat, a chatbot development plateform for Facebook Messenger. <br><br> We also needed a website to showcase our goals and values. After making the sitemap, I designed a few prototypes of the website in Adobe XD, to show to parents and coachs how a platform enables them to start a coaching, and launched it using Wix.",
    popin4: "Our chatbot can answer more than 100 questions about sleep and baby health, but is this enough ? Parents can have access to information quickly, and some of our elaborate answers provide an great source of help. But are we missing something ? <br><br> Science facts and tips are great, but to really help parents, they need more than a chatbot. And because every child is different, it was impossible for us to give super personalized answers with Pop-in. And who is the best placed to understand and resolve child's sleep problems ? Specialists ! Around the world, their are a lot a sleep coachs, but in France, it's not well known. And we had to change this. That's why we decided to bring professionals of babies sleep to help parents in their journey.",
    aboutTitle: "About me",
    aboutText: "I am a lifelong learner, dedicated in making the product and services that surround us more human-centered. Experience has taught me where to focus my energy to make the best out of a project. Designing the things that surround us, I value design that has a positive impact on society. Besides, I enjoy running, swimming and climbing!"
  },
  fr: {
    navProcess: "Méthodologie",
    navProjects: "Projets",
    navPersonal: "Expérimentations",
    navAbout: "A propos",
    introText: "Moi, c'est Vincent, un <span>product designer</span> avec une formation en sciences cognitives et informatiques, guidé par une méthodologie basée sur la recherche.",
    proProjectText: "Découvrez ma vision du design à travers mes projets professionels, de la finance à la santé.",
    persoProjectText: "À côté, j'aime aussi capturer des pixels et jouer avec des 0 et des 1.",
    projectPlaceholder: "Bientôt disponible !",
    projectAccessText: "Voir le site",
    sgmIsoTitle: "Un nouveau standard financier",
    sgmIso1: "Ce service a été créé lors d'un challenge, pour permettre aux clients de vérifier le format de leur fichier de transactions de paiement par rapport à la norme ISO (ISO20022) pour l'échange de données électroniques entre les institutions financières.",
    sgmIso2: "Nous avons créé une page d'accueil qui présente la nouvelle norme ISO 20022, ainsi que quelques conseils sur la manière de réussir une migration, et une zone de téléchargement pour ajouter un ou plusieurs fichiers. <br><br> Après l'upload d'un fichier, le document est analysé localement et permet aux clients de prévisualiser toutes les informations de manière lisible, soit en se focalisant uniquement sur les erreurs s'il y en a, soit avec tout les éléments du fichier. Chaque erreur est mises en évidence lorsqu'elles sont détectées, et est accompagnée de détails sur la manière de la résoudre. <br><br>",
    sgmIso3: "À partir d'un bref résumé, nous avons été introduits à un site web proof of concept où nous pouvions télécharger et prévisualiser un document. Nous avons décidé de conserver cette vue pour les utilisateurs avancés, mais le format de fichier XML étant complexe car il se base sur une structure spécifiques, nous avons également travailler sur une vue simplifiée. <br><br> Après une phase d'idéation, nous avons décidé de faire une interface qui permet de naviguer rapidement entre les batchs (sous forme d'onglets) et les transaction (dans un sidepanel). Les éléments d'une transaction peuvent alors s'articuler au centre de l'écran, avec des détails sur la transaction.",
    sgmDesign1: "J'ai travaillé sur la migration de la page Design de SG Markets vers la dernière version du Design system, et implémenté un redesign complet de la page Rejoignez-nous.",
    sgmDesign2: "Lors d'un évènement d'équipe, nous nous sommes lancés dans un projet de redesign collaboratif de la page 'Rejoignez-nous'. J'ai ensuite eu pour objectif de développer cette nouvelle page en mettant l'accent sur des interactions engageantes.",
    sgmDesign3: "Ce projet m'a permis de mieux comprendres les enjeux d'un développeur front-end, avec l'utilisation des composants React, la mise en place d'une page responsive et les animations CSS. <br><br> De plus, j'ai appris à maîtriser les étapes requises pour publier un service en production avec la configuration de déploiement, ainsi que l'audit du service après déploiement pour maintenir des performances optimales.",
    popin1: "En naissant, un enfant transforme deux adultes en parents. D'une certaine manière, c'est l'enfant qui fait les parents. Devenir parent est un changement de vie, à tous les niveaux. Du bonheur à la frustration, nous voulons le meilleur pour nos enfants, et cela peut très vite devenir stressant, au point d'impacter notre vie. Elodie Hughes, mère de 4 enfants, et entrepreneuse, nous a réuni pour trouver une solution.",
    popin2: "Le développement de l'enfant est un processus complexe. Les parents doivent apprendre beaucoup de choses, et le web est une source de connaissances, mais les informations se contredisent souvent. Pour fournir des faits et des conseils clairs et concis aux parents, et dans la nouvelle ère de l'interaction humaine avec la technologie, nous avons trouvé que la création d'un chatbot était un moyen amusant et puissant d'éduquer. <br><br> Nous avons constitué un corpus des questions les plus posées par les parents, et il y a beaucoup de sujets sur les bébés : alimentation, santé, sommeil... Les bébés ont besoin de beaucoup de sommeil (environ 20 heures par jour en tant que nouveau-né) et les parents aussi. Mais cela ne fonctionne souvent pas comme nous le voulons, car les bébés n'ont pas le même cycle de sommeil, et ils doivent incarner le rythme circadien du jour et de la nuit. <br><br> Nous avons décidé de donner uniquement des faits basés sur la science, et de les lier à des conseils pratiques et des conseils quand cela était possible.",
    popin3: "Lorsque nous avions tout ce dont nous avions besoin : personas, user flows, contenu Q/A, et un nouveau visage pour Pop-in, nous devions structurer une discussion pour faire comprendre aux utilisateurs qui est Pop-in, ce qu'elle fait et comment lui parler. J'ai testé plusieurs plateformes avant de trouver la bonne. C'était un moyen pour moi d'apprendre comment fonctionnent les chatbots, et de rapidement intéresser les parents. Notre solution finale a été d'utiliser DialogFlow pour une bonne compréhension du langage naturel, et ManyChat, une plateforme de développement de chatbot pour Facebook Messenger. <br><br> Nous avions également besoin d'un site web pour présenter nos objectifs et nos valeurs. Après la construction d'une sitemap, j'ai conçu quelques prototypes du site web dans Adobe XD, pour montrer aux parents et aux coachs comment une plateforme leur permet de commencer un coaching, et l'ai lancé en utilisant Wix.",
    popin4: "Notre chatbot peut répondre à plus de 100 questions sur le sommeil et la santé des bébés, mais est-ce suffisant ? Les parents peuvent accéder rapidement à des informations, et certaines de nos réponses élaborées fournissent une grande source d'aide. Mais manquons-nous quelque chose ? Les faits scientifiques et les conseils sont excellents, mais pour vraiment aider les parents, ils ont besoin de plus qu'un chatbot. Et parce que chaque enfant est différent, il nous était impossible de donner des réponses super personnalisées avec Pop-in. Et qui est le mieux placé pour comprendre et résoudre les problèmes de sommeil des enfants ? Les spécialistes ! Dans le monde entier, il y a beaucoup de coachs du sommeil, mais en France, ce n'est pas bien connu. Et nous devions changer cela. C'est pourquoi nous avons décidé de faire venir des professionnels du sommeil des bébés pour aider les parents dans leur parcours.",
    aboutTitle: "A propos de moi",
    aboutText: "Je suis un éternel curieux, dédié à rendre les produits et services qui nous entourent plus centrés sur l'humain. L'expérience m'a appris où concentrer mon énergie pour tirer le meilleur parti d'un projet. En concevant les choses qui nous entourent, je valorise le design qui a un impact positif. En dehors de cela, j'aime courir, nager et grimper !"
  }
};

function translate(lang) {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerHTML = translations[lang][key] || el.innerHTML;
  });
}

// Initial load
translate('en');

// Language selector
// document.getElementById('lang').addEventListener('change',
//   e => translate(e.target.value)
// );


// Wave line
class WaterLineAnimation {
  constructor(selector, config = {}) {
    this.svg = document.querySelector(selector);
    this.path = this.svg.querySelector('path');

    this.config = {
      width: 100,
      baseHeight: 50,
      numPoints: 100,
      waveLength: 60,
      baseSpeed: 5,
      spring: 0.12,
      damping: 0.9,
      hoverIntensity: 1,
      scrollSensitivity: 10,
      ...config
    };

    this.state = {
      points: [],
      time: 0,
      mouseX: 0,
      lastMouseX: 0,
      lastMouseY: 0,
      scrollY: 0,
      mouseSpeed: 0,
      scrollSpeed: 0,
      isMoving: false,
      isScrolling: false,
      hoverIntensity: 0,
      scrollIntensity: 0,
      isAnimating: false,
      animationFrameId: null
    };

    this.initPoints();
    this.bindEvents();
  }

  initPoints() {
    const { width, baseHeight, numPoints } = this.config;
    this.state.points = Array.from({ length: numPoints }, (_, i) => ({
      x: (width / (numPoints - 1)) * i,
      y: baseHeight,
      targetY: baseHeight,
      velocity: 0,
      phase: Math.random() * Math.PI * 2
    }));
  }

  createPath() {
    const { points } = this.state;
    const pathCommands = points.map((point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prevPoint = points[i - 1];
      const tension = 0.1;
      const dx = point.x - prevPoint.x;
      const controlPoint1X = prevPoint.x + dx * tension;
      const controlPoint2X = prevPoint.x + dx * (1 - tension);
      return `C ${controlPoint1X} ${prevPoint.y} ${controlPoint2X} ${point.y} ${point.x} ${point.y}`;
    });
    return pathCommands.join(' ');
  }

  getWaveOffset(x, time, mouseX, scrollY) {
    const { waveLength, baseSpeed, scrollSensitivity } = this.config;
    const { mouseSpeed, scrollSpeed, hoverIntensity, scrollIntensity } = this.state;

    const distanceFromMouse = Math.abs(x - mouseX);
    const speed = baseSpeed + (mouseSpeed * 0.5);
    const decay = Math.exp(-distanceFromMouse / 35) * (1 + mouseSpeed * 0.2);

    const mouseWave = Math.sin((x - mouseX) / waveLength * Math.PI * 2 + time * speed) * decay;
    const secondaryMouseWave = Math.sin((x - mouseX) / (waveLength * 1.5) * Math.PI * 2 - time * (speed * 0.7)) * decay * 0.3;
    const mouseEffect = mouseWave + secondaryMouseWave;

    const scrollWave = Math.sin((x / waveLength) * Math.PI * 2 + scrollY * scrollSensitivity) * 0.5;
    const scrollEffect = scrollWave * scrollSpeed;

    return (mouseEffect * 12 * hoverIntensity) + (scrollEffect * 8 * scrollIntensity);
  }

  animate(timestamp) {
    const { baseHeight, spring, damping } = this.config;
    const { points } = this.state;

    this.state.time = timestamp * 0.001;

    // Smooth intensity transitions
    const targetMouseIntensity = this.state.isMoving ? 1 : 0;
    this.state.hoverIntensity += (targetMouseIntensity - this.state.hoverIntensity) * 0.5;

    const targetScrollIntensity = this.state.isScrolling ? 1 : 0;
    this.state.scrollIntensity += (targetScrollIntensity - this.state.scrollIntensity) * 0.5;

    // Calculate mouse and scroll speeds
    this.state.mouseSpeed = Math.abs(this.state.mouseX - this.state.lastMouseX) * 0.01;
    this.state.mouseSpeed = Math.min(this.state.mouseSpeed, 10);
    this.state.lastMouseX = this.state.mouseX;

    let needsUpdate =
      Math.abs(this.state.hoverIntensity) > 0.001 ||
      Math.abs(this.state.scrollIntensity) > 0.001;

    // Update points with wave physics
    points.forEach((point, i) => {
      const waveOffset = this.getWaveOffset(
        point.x,
        this.state.time,
        this.state.mouseX,
        this.state.scrollY
      );
      point.targetY = baseHeight + waveOffset;

      const acceleration = (point.targetY - point.y) * spring;
      point.velocity += acceleration;
      point.velocity *= damping;

      if (Math.abs(point.velocity) > 0.01 || Math.abs(point.targetY - point.y) > 0.01) {
        point.y += point.velocity;
        needsUpdate = true;
      }
    });

    // Update path or stop animation
    if (needsUpdate) {
      this.path.setAttribute('d', this.createPath());
      this.state.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    } else {
      this.state.isAnimating = false;
      this.state.animationFrameId = null;
      this.state.isMoving = false;
      this.state.isScrolling = false;
    }
  }

  bindEvents() {
    let moveTimer;
    let scrollTimer;

    const handleMouseMove = (e) => {
      const rect = this.svg.getBoundingClientRect();
      const svgWidth = rect.width;
      const currentMouseX = (e.clientX - rect.left) / svgWidth * this.config.width;
      const currentMouseY = e.clientY - rect.top;

      // Check if mouse has actually moved
      if (currentMouseX !== this.state.lastMouseX || currentMouseY !== this.state.lastMouseY) {
        this.state.mouseX = currentMouseX;
        this.state.isMoving = true;

        // Clear any existing timer
        clearTimeout(moveTimer);

        // Set a timer to stop animation if no movement
        moveTimer = setTimeout(() => {
          this.state.isMoving = false;
        }, 100);

        if (!this.state.isAnimating) {
          this.state.isAnimating = true;
          this.animate(performance.now());
        }

        this.state.lastMouseX = currentMouseX;
        this.state.lastMouseY = currentMouseY;
      }
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      this.state.scrollSpeed = Math.abs(currentScrollY - this.state.scrollY) * 0.01;
      this.state.scrollSpeed = Math.min(this.state.scrollSpeed, 10);
      this.state.scrollY = currentScrollY;

      this.state.isScrolling = true;

      // Clear any existing scroll timer
      clearTimeout(scrollTimer);

      // Set a timer to stop scroll animation
      scrollTimer = setTimeout(() => {
        this.state.isScrolling = false;
      }, 200);

      if (!this.state.isAnimating) {
        this.state.isAnimating = true;
        this.animate(performance.now());
      }
    };

    this.svg.addEventListener('mousemove', handleMouseMove);
    this.svg.addEventListener('mouseenter', handleMouseMove);
    this.svg.addEventListener('mouseleave', () => {
      this.state.isMoving = false;
    });

    window.addEventListener('scroll', handleScroll);
  }
}

const waterLine = new WaterLineAnimation('.water-line', {
  width: 100,
  baseHeight: 50,
  numPoints: 100,
  scrollSensitivity: 1
});

// Mobile project tile effect
document.addEventListener('DOMContentLoaded', function() {
  if (window.innerWidth < 400) {
      const projectTiles = document.querySelectorAll('.project-tile');

      projectTiles.forEach(tile => {
          const images = tile.querySelectorAll('.project-cover img');

          const observer = new IntersectionObserver(entries => {
              entries.forEach(entry => {
                  if (entry.isIntersecting) {
                      images[0].style.opacity = '1';
                      images[1].style.opacity = '0';
                  } else {
                      images[0].style.opacity = '0';
                      images[1].style.opacity = '1';
                  }
              });
          }, {
              threshold: 0.5 // Adjust threshold as needed
          });

          observer.observe(tile);
      });
  }
});

// Grid effect
const grid = document.getElementById('grid');

// Calculate number of rows and columns based on viewport size
function setupGrid() {
  // Clear existing grid
  grid.innerHTML = '';

  // Calculate grid dimensions based on viewport and minimum cell size (50px + 1px gap)
  const cellSize = 61;
  const cols = Math.floor(window.innerWidth / cellSize);
  const rows = Math.floor(window.innerHeight / cellSize);

  // Update grid template
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  // Create grid cells
  for (let i = 0; i < rows * cols; i++) {
    const square = document.createElement('div');
    square.className = 'square';
    square.dataset.row = Math.floor(i / cols);
    square.dataset.col = i % cols;
    grid.appendChild(square);
  }

  // Get all squares
  const squares = document.querySelectorAll('.square');

  // Fixed radius of 8
  const radius = 8;

  // Hover effect function
  function handleMouseEvents(event) {
    const isEnter = event.type === 'mouseenter';

    // Get current square coordinates
    const row = parseInt(this.dataset.row);
    const col = parseInt(this.dataset.col);

    // Apply effect to squares in radius
    squares.forEach(square => {
      const squareRow = parseInt(square.dataset.row);
      const squareCol = parseInt(square.dataset.col);

      // Calculate distance (Manhattan distance for simplicity)
      const distance = Math.abs(row - squareRow) + Math.abs(col - squareCol);

      // Apply effect if within radius
      if (distance <= radius) {
        if (isEnter) {
          // Calculate border radius based on distance (closer = more circular)
          const borderRadiusPercent = 50 * (1 - distance / (radius + 1));
          square.style.borderRadius = `${borderRadiusPercent}%`;
        } else {
          square.style.borderRadius = '0%';
        }
      }
    });
  }

  // Add event listeners to all squares
  squares.forEach(square => {
    square.addEventListener('mouseenter', handleMouseEvents);
    square.addEventListener('mouseleave', handleMouseEvents);
  });
}

// Initial setup
setupGrid();

// Resize handling
window.addEventListener('resize', setupGrid);