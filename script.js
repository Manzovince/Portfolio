// Languages
const translations = {
  en: {
    navProjects: "Projects",
    navPersonal: "More",
    navAbout: "About",
    introText: "I'm Vincent, a <span>product designer</span> with a background in cognitive and computer sciences, driven by a research-backed methodology.",
    proProjectText: "Discover my vision of design through my professional projects, from the financial space to health.",
    persoProjectText: "Beside, I also like to capture pixels and play with 0 and 1s.",
    projectPlaceholder:"Coming soon !",
    projectAccessText: "Go to website",
    sgmIso1: "This service was created from a design challenge for a new request to help clients check their payment transactions file format against the ISO standard (ISO20022) for electronic data interchange between financial institutions.",
    sgmIso2: "We created an homepage that introduce the new ISO 20022 standard, along with some tips on how to do a successful migration, and an upload area to add one or more files. <br><br> After submitting a file, the document is parsed locally and enable clients to preview all informations in a human readable way, with highlights when errors are detected, and each one is accompanied with details on how to resolve it.",
    sgmIso3: "Starting with a short brief from the team requesting this new service, we were introduced to a proof of concept website where we can upload and preview a document, with highlighted errors in red. The XML file format is based on a specific tag structure, and each element must follow a specific format. <br><br> After an ideation phase, we decided to make an interface that allows to quickly navigate between batches (as tabs) and transactions (in a sidepanel). The elements of a transaction can then articulate in the center of the screen, with details on the transaction. <br><br> For each error detected, a message is displayed next to it, with a link to the ISO standard section that explains how to resolve this error.",
    sgmDesign1: "I worked on the migration of the SG Markets Design page to the latest version of the Design system, and implemented a complete redesign of the 'Join us' page.",
    sgmDesign2: "During a team event, we embarked on a collaborative redesign project of the 'Join us' page. I then had the goal of developing this new page with a focus on engaging interactions.",
    sgmDesign3: "This project allowed me to better understand the challenges of a front-end developer, with the use of React components, the implementation of a responsive page and CSS animations. In addition, I learned how to master the steps required to publish a service in production with deployment configuration, as well as auditing the service after deployment to maintain optimal performance.",
    aboutTitle: "About me",
    aboutText: "I am a lifelong learner, dedicated in making the product and services that surround us more human-centered.Experience has taught me where to focus my energy to make the best out of a project. Designing the things that surround us, I value design that has a positive impact on society.Besides, I enjoy running, swimming and climbing!"
  },
  fr: {
    navProjects: "Projets",
    navPersonal: "En plus",
    navAbout: "A propos",
    introText: "Moi, c'est Vincent, un <span>product designer</span> avec une formation en sciences cognitives et informatiques, guidé par une méthodologie basée sur la recherche.",
    proProjectText: "Découvrez ma vision du design à travers mes projets professionels, de la finance à la santé.",
    persoProjectText: "À côté, j'aime aussi capturer des pixels et jouer avec des 0 et des 1.",
    projectPlaceholder:"Bientôt disponible !",
    projectAccessText: "Voir le site",
    sgmIso1: "Ce service a été créé lors d'un challenge, pour permettre aux clients de vérifier le format de leur fichier de transactions de paiement par rapport à la norme ISO (ISO20022) pour l'échange de données électroniques entre les institutions financières.",
    sgmIso2: "Nous avons créé une page d'accueil qui présente la nouvelle norme ISO 20022, ainsi que quelques conseils sur la manière de réussir une migration, et une zone de téléchargement pour ajouter un ou plusieurs fichiers. <br><br> Après l'upload d'un fichier, le document est analysé localement et permet aux clients de prévisualiser toutes les informations de manière lisible, avec des erreurs mises en évidence lorsqu'elles sont détectées, et chacune est accompagnée de détails sur la manière de la résoudre.",
    sgmIso3: "À partir d'un bref résumé, nous avons été introduits à un site web proof of concept où nous pouvions télécharger et prévisualiser un document, avec des erreurs en rouge. Le format de fichier XML se base sur une structure de balises spécifiques, et chaque élément doit respecter un format précis. <br><br> Après une phase d'idéation, nous avons décidé de faire une interface qui permet de naviguer rapidement entre les batchs (sous forme d'onglets) et les transaction (dans un sidepanel). Les éléments d'une transaction peuvent alors s'articuler au centre de l'écran, avec des détails sur la transaction. <br><br> Pour chaque erreur détectée, un message est affiché à côté, avec un lien vers la section de la norme ISO qui explique comment résoudre cette erreur.",
    sgmDesign1: "J'ai travaillé sur la migration de la page Design de SG Markets vers la dernière version du Design system, et implémenté un redesign complet de la page Rejoignez-nous.",
    sgmDesign2: "Lors d'un évènement d'équipe, nous nous sommes lancés dans un projet de redesign collaboratif de la page 'Rejoignez-nous'. J'ai ensuite eu pour objectif de développer cette nouvelle page en mettant l'accent sur des interactions engageantes.",
    sgmDesign3: "Ce projet m'a permis de mieux comprendres les enjeux d'un développeur front-end, avec l'utilisation des composants React, la mise en place d'une page responsive et les animations CSS. De plus, j'ai appris à maîtriser les étapes requises pour publier un service en production avec la configuration de déploiement, ainsi que l'audit du service après déploiement pour maintenir des performances optimales.",
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
translate('fr');

// Language selector
document.getElementById('lang').addEventListener('change',
  e => translate(e.target.value)
);

// Wave line
class WaterLineAnimation {
  constructor(selector, config = {}) {
    this.svg = document.querySelector(selector);
    this.path = this.svg.querySelector('path');

    this.config = {
      width: 100,
      baseHeight: 50,
      numPoints: 100,
      waveLength: 40,
      baseSpeed: 5,
      spring: 0.12,
      damping: 0.9,
      scrollSensitivity: 0.3,
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

// Usage example
const waterLine = new WaterLineAnimation('.water-line', {
  width: 100,
  baseHeight: 50,
  numPoints: 100,
  scrollSensitivity: 1
});