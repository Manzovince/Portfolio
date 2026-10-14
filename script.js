// Languages
const translations = {
  en: {
    navProcess: "Methodology",
    navProjects: "Work",
    navPersonal: "Experiments",
    navAbout: "About me",
    introText: "I'm Vincent, a product designer with a background in <span>cognitive</span> and <span>computer sciences</span>, driven by a research-backed methodology.",
    methodologyText: "After earning a master's in psychology, I became fascinated by how cognitive sciences can shape technology. <br><br> My scientific mindset lets me test hypotheses rigorously, while my technical knowledge helps me communicate effectively with engineering teams. <br><br> I'm a visual thinker - I tend to approach problems by visualizing ideas through sketches and diagrams, and breaking down complex issues into simple, understandable steps.",
    proProjectText: "Discover my vision of design through some of my professional and personal projects.",
    tagPhoto: "Photography",
    tagDesign: "Design",
    tagDev: "Dev",
    tagResearch: "Research",
    sealensDesc: "An aquatic immersive exposition",
    iso20022Desc: "Helping clients transition to a new financial standard",
    popinDesc: "The chatbot that makes babies and parents sleep",
    sgmDesignDesc: "Redesign and migration of a product design team website",
    persoProjectText: "Beside, I also like to capture pixels and play with 0 and 1s.",
    projectPlaceholder: "Coming soon !",
    projectAccessText: "Explore the site",
    sealens1: "Sealens is a photographic exhibition about the Mediterranean Sea, which invites you to explore the underwater landscapes and meet its inhabitants during a freedive.",
    sealens2: "I was born near the Mediterranean Sea, and I have always been fascinated by the underwater world. <br><br> Capturing hidden moments of the submarine life since a few years, I wanted to share this experience on the digital media in a similar way. <br><br> Inspired by our children books where we are the hero, I developped this website to show what happens when we do snorkeling or freediving: each dive is short and unique, consisting of 5 random choices to display new pictures.",
    sealens3: "Our project was born from a simple conviction: understanding is key to better protection. <br><br> Each image is a testimony, each view an invitation to become aware of the richness and vulnerability of our maritime heritage. <br><br> It's an ode to the ocean, a visual journey that awakens as much as it amazes. Through our pictures, we seek to capture the essence of a vibrant world, shaped by thousands of years of history.",
    sealens4: "Whether you're a seasoned diver or simply curious, Sealens invites you to immerse yourself in the magic of these hidden worlds. Together, let's imagine a future where harmony between man and the sea is not a dream, but a reality.",
    sgmIsoTitle: "A new financial standard",
    sgmIso1: "This service was created from a design challenge for a new request to help clients check their payment transactions file format against the ISO standard (ISO20022) for electronic data interchange between financial institutions.",
    sgmIso2: "We created an homepage that introduce the new ISO 20022 standard, along with some tips on how to do a successful migration, and an upload area to add one or more files. <br><br> After submitting a file, the document is parsed locally and enable clients to preview all informations in a human readable way, with highlights when errors are detected, and each one is accompanied with details on how to resolve it.",
    sgmIso3: "Starting with a short brief from the team requesting this new service, we were introduced to a proof of concept website where we can upload and preview a document, with highlighted errors in red. The XML file format is based on a specific tag structure, and each element must follow a specific format. <br><br> After an ideation phase, we decided to make an interface that allows to quickly navigate between batches (as tabs) and transactions (in a sidepanel). The elements of a transaction can then articulate in the center of the screen, with details on the transaction. <br><br> For each error detected, a message is displayed next to it, with a link to the ISO standard section that explains how to resolve this error.",
    sgmDesign1: "I worked on the migration of the SG Markets Design page to the latest version of the Design system, and implemented a complete redesign of the <i>Join us</i> page.",
    sgmDesign2: "During a team event, we embarked on a collaborative redesign project of the 'Join us' page. I then had the goal of developing this new page with a focus on engaging interactions.",
    sgmDesign3: "This project allowed me to better understand the challenges of a front-end developer, with the use of React components, the implementation of a responsive page and CSS animations. In addition, I learned how to master the steps required to publish a service in production with deployment configuration, as well as auditing the service after deployment to maintain optimal performance.",
    popin1: "When a child is born, two adults are transformed into parents. In a way, it is the child who makes the parents. Becoming a parent is life changing, in every way possible. <br><br> From happiness to frustration, we want the best for our children, and this can very quickly become stressful. Elodie Hughes, mother of 4 children and entrepreneur, has put together a small team to find a solution.",
    popin2: "Child development is a complex process. Parents need to learn a lot of things, and the web is a wide source of knowledge, but informations often contradicts. To provide clear and concise facts and tips to parents, and in the new era of human-like interaction with technology, we found that creating a chatbot was a fun and powerful way to educate. <br><br> We made a corpus of the most asked questions asked by parents, and there are a lot of subjects about babies: alimentation, health, sleep... Babies need a lot of sleep (approx. 20 hours per day as a newborn) and parents too. But it often doesn't work as we want, because babies don't have the same sleep cycle, and they need to embody the circadian rythm of day and night. <br><br> We decided to give only science-based facts, and link them with practical tips and advices when it was possible.",
    popin3: "When we had all we need : personas, user flows, Q/A content, and a new face for Pop-in, we needed to structure a discussion to make users understand who Pop-in is, what she does and how to talk to her. I tested multiple platforms before finding the write one. It was a way for me to learn how chatbots works, and to quickly get parents interested. Our final solution was to use DialogFlow for a good Natural Language Understanding, and ManyChat, a chatbot development plateform for Facebook Messenger. <br><br> We also needed a website to showcase our goals and values. After making the sitemap, I designed a few prototypes of the website in Adobe XD, to show to parents and coachs how a platform enables them to start a coaching, and launched it using Wix.",
    popin4: "Our chatbot can answer more than 100 questions about sleep and baby health, but is this enough ? Parents can have access to information quickly, and some of our elaborate answers provide an great source of help. But are we missing something ? <br><br> Science facts and tips are great, but to really help parents, they need more than a chatbot. And because every child is different, it was impossible for us to give super personalized answers with Pop-in. And who is the best placed to understand and resolve child's sleep problems ? Specialists ! Around the world, their are a lot a sleep coachs, but in France, it's not well known. And we had to change this. That's why we decided to bring professionals of babies sleep to help parents in their journey.",
    aboutTitle: "About me",
    aboutText: "I am a lifelong learner who values design that positively impacts society. <br><br> That's why in my free time, I enjoy experimenting with ideas that blend my skills in photography, music, science or education, continually pushing my creative boundaries. <br><br> The rest of the time, I love pretending to be a bird with my drone, or a fish with my mask and snorkel!",
    experienceTitle: "Experience",
    yearNow: "Now",
    expScalianText: "UX designer consultant at Scalian, on assignment for the French Ministry of the Armed Forces, working specifically on operational IT systems.",
    expUXText: "Designer of multiple services across various business lines, and co-lead of the Design System team. Find out more at <a href='https://info.sgmarkets.com/' class='link'>SG Markets</a> and also our <a href='https://design.sgmarkets.com/' class='link'>design team website</a>.",
    expTeacherTitle: "UX Design teacher",
    expTeacherText: "Lectures and workshops with students from the Multimedia and Internet professions program. These courses concluded in end-of-year projects ranging from user research to website development.",
    expPopinTitle: "UX designer and developer",
    expPopinText: "Alongside an entrepreneur and a psychologist, I contributed to the development of Pop-in, one of the first chatbots designed to help young children (and their parents) have more restful nights, offering advice and a sleep support program.",
    talksTitle: "Talks & articles",
    talkDslTitle: "Speaker",
    talkDslText: "Talk at Design System London #13, held in Paris for the first time: the story of how a money input, which looked like a quick task, became a three-month journey for the Societe Generale CIB design system. <a href='https://www.youtube.com/watch?v=SCVH-78vFsU' target='_blank' rel='noopener' class='link'>Watch the talk</a> on YouTube.",
    articleMoneyInputTitle: "The unexpected odyssey of building a money input",
    articleMoneyInputText: "What does it really take to create a design system component that serves new projects and replaces legacy ones? Formatting, keyboard shortcuts, currencies and alignment, and everything that turned out more complex than planned. <a href='https://medium.com/societe-generale-design/the-unexpected-odyssey-of-building-a-money-input-a1930b4baf21' target='_blank' rel='noopener' class='link'>Read the article</a> on Societe Generale Design's Medium.",
    educationTitle: "Education",
    eduEMText: "One-year apprenticeship, learning user research, UI design, and the principles that underpin effective digital experiences.",
    edu42Title: "Developer",
    edu42Title: "Developer",
    edu42Text: "At 42 Paris, I embraced a unique education model, immersing myself in computer science through hands-on projects, from shell scripts to programs in C and Machine learning.",
    webPianoDesc: "A piano that names your chords and lights up the keys",
    webPianoIntro: "A piano in the browser that names the chords you play, writes them on a staff and lights up an LED strip above the keys. It works with a MIDI keyboard, a computer keyboard or a touch screen.",
    webPianoOpen: "Play the piano",
    webPianoStory: "It started with a simple idea: what if the piano keys I play could light up a strip of LEDs in real time? <br><br> At the time, I had never touched an Arduino, never flashed an ESP32, and barely knew what MIDI looked like under the hood. I just wanted to visualise what I was playing, to make music feel a bit more alive, more tangible. <br><br> So I gave it a shot. The first version was a single octave and a sine wave drawn on the screen.",
    webPianoPrototypeAlt: "First prototype: a sine wave drawn above a one-octave keyboard",
    webPianoLightsTitle: "From the keys to the lights",
    webPianoLights: "The digital piano sends every note over MIDI. The browser reads it with the Web MIDI API, plays it back, and sends a colour for each key over a WebSocket to an ESP32 microcontroller, which drives an LED strip running along the keyboard, two LEDs per key. <br><br> Each note has its own colour and shines brighter when it is played harder. A ripple mode lets a note spill its light onto its neighbours, and the sustain pedal keeps the lights on as long as the sound rings.",
    webPianoLearnTitle: "A tool to learn",
    webPianoLearn: "Once the notes were in the browser, the screen became just as interesting as the lights. The piano recognises chords and their inversions, spells every note the way a musician would (E♭ in C minor, D♯ in B major), and writes what you play on a grand staff, note lengths included, at the tempo you choose. <br><br> A scale guide marks the notes of a scale on the keys and lights them softly on the strip, so you can see where your fingers should go before you play. Names can be read in English (C D E) or in solfège (Do Ré Mi).",
    webPianoAppAlt: "The web piano naming a chord above the keyboard, with the notes written on a grand staff",
    webPianoScaleAlt: "Settings panel of the web piano, with the scale guide marking the notes of a scale on the keys",
    webPianoLearnedTitle: "What I learned",
    webPianoLearned: "This project was my first step into microcontrollers and into MIDI. It taught me to design for real time: a note has to sound, light up and be named within a few milliseconds, whichever device it comes from, and must never get stuck when a key, a pedal or a finger lets go. <br><br> The piano works best in Chrome or Edge, which support Web MIDI. Without a MIDI keyboard, you can play it with your computer keys, or by touch on a phone.",
    eduMasterTitle: "Psychology & neurosciences of movement",
    eduMasterText: "My academic foundation in Psychology, paired with extensive research into intelligent systems, has deepened my understanding of how cognitive processes and embodied experiences shape human consciousness. <br><br> Discovering the exciting world of scientific research, this interdisciplinary approach ended with a dissertation exploring the intersection of sensory integration and body awareness, using the famous <i>Rubber hand illusion</i>."
  },
  fr: {
    navProcess: "Méthodologie",
    navProjects: "Projets",
    navPersonal: "Expérimentations",
    navAbout: "A propos de moi",
    introText: "Moi, c'est Vincent, un <span>product designer</span> avec une formation en sciences cognitives et en informatique, guidé par une méthodologie basée sur la recherche.",
    methodologyText: "Après un master en psychologie, je me suis passionné par la manière dont les sciences cognitives peuvent façonner les nouvelles technologie. <br><br> Mon esprit scientifique me permet de tester rigoureusement des hypothèses, et mes connaissances techniques m'aident à communiquer efficacement avec les ingénieurs. <br><br> J'ai tendance à aborder les problèmes en visualisant des idées à travers des croquis et des diagrammes, et en décomposant les problèmes complexes en étapes simples et compréhensibles.",
    proProjectText: "Découvrez ma vision du design à travers mes projets professionels et personnels.",
    tagPhoto: "Photographie",
    tagDesign: "Design",
    tagDev: "Développement",
    tagResearch: "Recherche",
    sealensDesc: "Une exposition aquatique immersive",
    iso20022Desc: "Aider les clients à passer à un nouveau standard financier",
    popinDesc: "Le chatbot qui fait dormir les bébés et les parents",
    sgmDesignDesc: "Redesign et migration du site de l'équipe design",
    persoProjectText: "À côté, j'aime aussi capturer des pixels et jouer avec des 0 et des 1.",
    projectPlaceholder: "Bientôt disponible !",
    projectAccessText: "Voir le site",
    sealens1: "Sealens est une exposition photographique sur la mer Méditerranée, qui vous invite à explorer les paysages sous-marins et à rencontrer ses habitants le temps d'une plongée.",
    sealens2: "Je suis né près de la mer Méditerranée, et j'ai toujours été fasciné par le monde sous-marin. <br><br> Capturant des moments cachés de la vie sous-marine depuis quelques années, je voulais partager cette expérience sur le média numérique de manière similaire. <br><br> Inspiré par nos livres où nous sommes le héros, j'ai développé ce site pour montrer ce qui se passe lorsque nous faisons du snorkeling ou de l'apnée : chaque plongée est courte, unique, composée de rencontres aléatoires et inattendues.",
    sealens3: "Notre projet est né d'une conviction simple : comprendre est la clé d'une meilleure protection. <br><br> Chaque image est un témoignage, chaque paysage une invitation à prendre conscience de la richesse et de la vulnérabilité de notre patrimoine maritime. <br><br> C'est une ode à l'océan, un voyage visuel qui éveille autant qu'il émerveille. À travers nos images, nous cherchons à capturer l'essence d'un monde vibrant, façonné par des milliers d'années d'histoire.",
    sealens4: "Que vous soyez un plongeur chevronné ou simplement curieux, <a href='https://sealens.art' target='_blank' class='link'>Sealens</a> vous invite à plonger dans la magie de ces mondes cachés. Ensemble, imaginons un avenir où l'harmonie entre l'homme et la mer n'est pas un rêve, mais une réalité. <br><br> ",
    sgmIsoTitle: "Un nouveau standard financier",
    sgmIso1: "Ce service a été créé lors d'un challenge sur une journée, pour concevoir un service qui permet aux clients de vérifier le format de leur fichier de transactions de paiement par rapport à la norme ISO (ISO20022) pour l'échange de données électroniques entre les institutions financières.",
    sgmIso2: "Nous avons créé une page d'accueil qui présente la nouvelle norme ISO 20022, ainsi que quelques conseils sur la manière de réussir une migration, et une zone de téléchargement pour ajouter un ou plusieurs fichiers. <br><br> Après l'upload d'un fichier, le document est analysé localement et permet aux clients de prévisualiser toutes les informations de manière lisible, soit en se focalisant uniquement sur les erreurs s'il y en a, soit avec tout les éléments du fichier. Chaque erreur est mise en évidence lorsqu'elle est détectée, et est accompagnée de détails sur la manière de la résoudre. <br><br>",
    sgmIso3: "À partir d'un bref résumé, nous avons été introduits à un site web Proof-of-Concept où nous pouvions télécharger et prévisualiser un document. Nous avons décidé de conserver cette vue pour les utilisateurs avancés, mais parce que le format de fichier XML est complexe, nous avons également travailler sur une vue simplifiée qui permet de traiter rapidement les erreurs. <br><br> Après une phase d'idéation, nous avons décidé de faire une interface qui permet de naviguer rapidement entre les batchs de paiement (sous forme d'onglets) et les transaction (dans un panneau sur le côté). Les éléments d'une transaction peuvent alors s'articuler au centre de l'écran, avec des détails sur chaque bloc d'information.",
    sgmDesign1: "J'ai travaillé sur la migration de la page Design de SG Markets vers la dernière version du Design system, et implémenté un redesign complet de la page <i>Rejoignez-nous</i>.",
    sgmDesign2: "Lors d'un évènement d'équipe, nous nous sommes lancés dans un projet de redesign collaboratif de la page. J'ai ensuite eu pour objectif de développer cette nouvelle page en mettant l'accent sur des interactions engageantes.",
    sgmDesign3: "Ce projet m'a permis de mieux comprendres les enjeux d'un développeur front-end, avec l'utilisation des composants React, la mise en place d'une page responsive et les animations CSS. <br><br> De plus, j'ai appris à maîtriser les étapes requises pour publier un service en production avec la configuration de déploiement, ainsi que l'audit du service après déploiement pour maintenir des performances optimales. <br><br> Pour apprécier l'expérience complète, je vous invite à aller sur le site <a href='https://design.sgmarkets.com/' target='_blank' class='link'>SG Markets Design</a>.",
    popin1: "En naissant, un enfant transforme deux adultes en parents. D'une certaine manière, c'est l'enfant qui fait les parents. Devenir parent est un changement de vie, à tous les niveaux. Du bonheur à la frustration, nous voulons le meilleur pour nos enfants, et cela peut très vite devenir stressant, au point d'impacter notre vie. Elodie Hughes, mère de 4 enfants, et entrepreneuse, nous a réuni pour trouver une solution.",
    popin2: "Le développement de l'enfant est un processus complexe. Les parents doivent apprendre beaucoup de choses, et même si le web est une source de connaissances, les informations se contredisent souvent. Pour fournir des faits et des conseils clairs et concis aux parents, et dans la nouvelle ère de l'interaction humaine avec la technologie, nous avons trouvé que la création d'un chatbot était un moyen amusant et puissant d'éduquer. <br><br> Nous avons donc constitué un corpus des questions les plus posées par les parents, et il y a beaucoup de sujets sur les bébés : alimentation, santé, sommeil... Les bébés ont besoin de beaucoup de sommeil (environ 20 heures par jour en tant que nouveau-né) et les parents aussi. Mais cela ne fonctionne souvent pas comme nous le voulons, car les bébés n'ont pas le même cycle de sommeil, et ils doivent se synchroniser sur le rythme circadien du jour et de la nuit. <br><br> Nous avons décidé de donner uniquement des faits basés sur la science, et de les lier à des conseils pratiques quand cela était possible.",
    popin3: "Lorsque nous avions tout ce dont nous avions besoin : personas, user flows, contenu Q/A, et un nouveau visage pour Pop-in, nous devions structurer une discussion pour faire comprendre aux utilisateurs qui est Pop-in, ce qu'elle fait et comment lui parler. J'ai testé plusieurs plateformes avant de trouver la bonne. C'était un moyen pour moi d'apprendre comment fonctionnent les chatbots, et de rapidement intéresser les parents. Notre solution finale a été d'utiliser DialogFlow pour une bonne compréhension du langage naturel, et ManyChat, une plateforme de développement de chatbot pour Facebook Messenger. <br><br> Nous avions également besoin d'un site web pour présenter nos objectifs et nos valeurs. Après la construction d'une sitemap, j'ai conçu quelques prototypes du site web dans Adobe XD, pour montrer aux parents et aux coachs comment une plateforme leur permet de commencer un coaching, et l'ai lancé en utilisant Wix.",
    popin4: "Notre chatbot peut répondre à plus de 100 questions sur le sommeil et la santé des bébés, mais est-ce suffisant ? Les parents peuvent accéder rapidement à des informations, et certaines de nos réponses élaborées fournissent une grande source d'aide. Mais manquons-nous quelque chose ? Les faits scientifiques et les conseils sont excellents, mais pour vraiment aider les parents, ils ont besoin de plus qu'un chatbot. Et parce que chaque enfant est différent, il nous était impossible de donner des réponses super personnalisées avec Pop-in. Et qui est le mieux placé pour comprendre et résoudre les problèmes de sommeil des enfants ? Les spécialistes ! Dans le monde entier, il y a beaucoup de coachs du sommeil, mais en France, ce n'est pas bien connu. Et nous devions changer cela. C'est pourquoi nous avons décidé de faire venir des professionnels du sommeil des bébés pour aider les parents dans leur parcours.",
    aboutTitle: "A propos de moi",
    aboutText: "Je suis un éternel curieux qui accorde une grande importance au design ayant un impact positif sur la société. <br><br> C'est pourquoi pendant mon temps libre, j'aime expérimenter avec des idées qui mélangent mes compétences en photographie, sciences et éducation, repoussant continuellement mes limites créatives. <br><br> Le reste du temps, j'aime me prendre pour un oiseau avec mon drone, ou pour un poisson avec mon masque et mon tuba !",
    experienceTitle: "Expérience",
    yearNow: "Auj.",
    expScalianText: "Consultant UX designer chez Scalian, en mission pour le ministère des Armées, spécifiquement sur les systèmes informatiques opérationnels.",
    expUXText: "Designer référent sur plusieurs services à travers différentes lignes de métier, et co-lead de l'équipe Design System. Pour en savoir plus, rendez-vous sur <a href='https://info.sgmarkets.com/' class='link'>SG Markets</a> ainsi que notre <a href='https://design.sgmarkets.com/' class='link'>site d'équipe</a>.",
    expTeacherTitle: "Enseignant en UX Design",
    expTeacherText: "J'ai donné des cours magistraux et animer des ateliers avec des étudiants du programme Métiers du Multimédia et de l'Internet. Ces cours se sont terminés par des projets de fin d'année allant de la recherche utilisateur à la création de sites web.",
    expPopinTitle: "UX designer et développeur",
    expPopinText: "Aux côtés d'une entrepreneuse et d'une psychologue, j'ai contribué au développement de Pop-in, l'un des premiers chatbots conçu pour aider les jeunes enfants (et leurs parents) à passer de meilleures nuits, en offrant des conseils et un programme de soutien au sommeil.",
    talksTitle: "Conférences & articles",
    talkDslTitle: "Speaker",
    talkDslText: "Talk au Design System London #13, organisé pour la première fois à Paris : comment un champ de saisie de montant, qui semblait être une tâche rapide, est devenu un projet de trois mois pour le design system de Société Générale CIB. <a href='https://www.youtube.com/watch?v=SCVH-78vFsU' target='_blank' rel='noopener' class='link'>Voir le talk</a> (en anglais) sur YouTube.",
    articleMoneyInputTitle: "The unexpected odyssey of building a money input",
    articleMoneyInputText: "Que faut-il vraiment pour créer un composant de design system qui serve les nouveaux projets et remplace les anciens ? Formatage, raccourcis clavier, devises et alignement, et tout ce qui s'est révélé plus complexe que prévu. <a href='https://medium.com/societe-generale-design/the-unexpected-odyssey-of-building-a-money-input-a1930b4baf21' target='_blank' rel='noopener' class='link'>Lire l'article</a> (en anglais) sur le Medium de Société Générale Design.",
    educationTitle: "Formation",
    eduEMText: "J'ai suivi une formation en aprentissage sur un an, pour monter en compétence sur la recherche utilisateur, le design UI et les principes qui sous-tendent des expériences numériques efficaces.",
    edu42Title: "Développeur",
    edu42Text: "À 42 Paris, j'ai adopté un modèle éducatif unique, m'immergeant dans l'informatique à travers des projets pratiques, des scripts shell aux programmes en C, ainsi qu'au Machine learning et plus généralement l'intelligence artificielle.",
    webPianoDesc: "Un piano qui nomme vos accords et illumine les touches",
    webPianoIntro: "Un piano dans le navigateur qui nomme les accords que vous jouez, les écrit sur une portée et allume un ruban LED au-dessus des touches. Il fonctionne avec un clavier MIDI, le clavier de l'ordinateur ou un écran tactile.",
    webPianoOpen: "Jouer du piano",
    webPianoStory: "Tout est parti d'une idée simple : et si les touches du piano que je joue pouvaient allumer un ruban de LED en temps réel ? <br><br> À l'époque, je n'avais jamais touché à un Arduino, jamais programmé d'ESP32, et je savais à peine à quoi ressemblait le MIDI sous le capot. Je voulais simplement visualiser ce que je jouais, pour rendre la musique un peu plus vivante, plus tangible. <br><br> Alors je me suis lancé. La première version tenait sur une seule octave, avec une onde sinusoïdale dessinée à l'écran.",
    webPianoPrototypeAlt: "Premier prototype : une onde sinusoïdale dessinée au-dessus d'un clavier d'une octave",
    webPianoLightsTitle: "Des touches à la lumière",
    webPianoLights: "Le piano numérique envoie chaque note en MIDI. Le navigateur la lit grâce à l'API Web MIDI, la joue, puis envoie une couleur pour chaque touche via un WebSocket à un microcontrôleur ESP32, qui pilote un ruban LED posé le long du clavier, à raison de deux LED par touche. <br><br> Chaque note a sa propre couleur et brille d'autant plus qu'elle est jouée fort. Un mode « onde » laisse la lumière d'une note déborder sur ses voisines, et la pédale de sustain garde les lumières allumées tant que le son résonne.",
    webPianoLearnTitle: "Un outil pour apprendre",
    webPianoLearn: "Une fois les notes dans le navigateur, l'écran est devenu aussi intéressant que les lumières. Le piano reconnaît les accords et leurs renversements, écrit chaque note comme le ferait un musicien (Mi♭ en Do mineur, Ré♯ en Si majeur) et transcrit ce que vous jouez sur une double portée, durée des notes comprise, au tempo de votre choix. <br><br> Un guide de gamme marque les notes d'une gamme sur les touches et les allume doucement sur le ruban, pour voir où poser les doigts avant de jouer. Les notes peuvent s'afficher en solfège (Do Ré Mi) ou en notation anglaise (C D E).",
    webPianoAppAlt: "Le web piano nommant un accord au-dessus du clavier, avec les notes écrites sur une double portée",
    webPianoScaleAlt: "Panneau de réglages du web piano, avec le guide de gamme qui marque les notes d'une gamme sur les touches",
    webPianoLearnedTitle: "Ce que j'ai appris",
    webPianoLearned: "Ce projet a été mon premier pas dans les microcontrôleurs et dans le MIDI. Il m'a appris à concevoir pour le temps réel : une note doit sonner, s'allumer et être nommée en quelques millisecondes, quel que soit l'appareil d'où elle vient, et ne jamais rester bloquée quand une touche, une pédale ou un doigt se relève. <br><br> Le piano fonctionne au mieux dans Chrome ou Edge, qui prennent en charge le Web MIDI. Sans clavier MIDI, on peut aussi jouer avec les touches de l'ordinateur, ou du bout des doigts sur un téléphone.",
    eduMasterTitle: "Psychologie & neurosciences du mouvement",
    eduMasterText: "Ma formation académique en psychologie, associée à des recherches approfondies sur les systèmes intelligents, a approfondi ma compréhension de la manière dont les processus cognitifs et les expériences incarnées façonnent la conscience humaine. <br><br> Découvrant le monde passionnant de la recherche scientifique, cette approche interdisciplinaire s'est terminée par un mémoire explorant l'intersection de l'intégration sensorielle et de la conscience corporelle, utilisant le célèbre <i>Rubber hand illusion</i>."
  }
};

function translate(lang, root = document) {
  const elements = root.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerHTML = translations[lang][key] || el.innerHTML;
  });
  // Image descriptions follow the language too
  root.querySelectorAll('[data-i18n-alt]').forEach(el => {
    el.alt = translations[lang][el.getAttribute('data-i18n-alt')] || el.alt;
  });
}

// Detect the user's preferred language
function getPreferredLanguage() {
  const userLang = navigator.language || navigator.userLanguage; // Get the browser's language
  if (userLang.startsWith('fr')) {
    return 'fr'; // Use French if the language starts with 'fr'
  }
  return 'en'; // Default to English
}

// Read back a language the visitor picked on an earlier visit
function getStoredLanguage() {
  try {
    const saved = localStorage.getItem('selectedLanguage');
    return saved === 'en' || saved === 'fr' ? saved : null;
  } catch (err) {
    return null; // Storage blocked (private browsing) - fall back to the browser
  }
}

function saveLanguage(lang) {
  try {
    localStorage.setItem('selectedLanguage', lang);
  } catch (err) {
    // Nothing to persist to - the page still translates for this visit
  }
}

// A choice made with the toggle wins over the browser's preference, so it
// survives a reload and a move to another page.
let currentLanguage = getStoredLanguage() || getPreferredLanguage();
translate(currentLanguage); // Apply translations to the main document

// ------ Web components ------
// Navbar
class NavComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.currentPageName = '';
    this.availableLanguages = ['English', 'Français'];
    this.availableThemes = ['Dark theme', 'Light theme'];
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('./styles.css?v=20261014l');
      </style>
      <nav id="nav">
        <div class="page-path">
          <a id="path" href="./index.html#featured">
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0 L16 0 L24 8 L32 0 L32 16 L16 16 L16 0 L0 16" fill="currentColor"/>
            </svg>
            <span id="path-home" hidden>Portfolio</span>
          </a>
          <div id="page-name-container" style="display: none;">
            <div class="path-separator">/</div>
            <div id="current-page"></div>
          </div>
        </div>
        <input id="nav-checkbox" type="checkbox">
        <label id="nav-icon" for="nav-checkbox">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 L16 0 L16 16 L16 16 Z" fill="currentColor" />
          </svg>
        </label>
        <div id="nav-dropdown">
          <ul id="nav-settings">
            <li class="language-switch">
              <button type="button" data-lang="fr" lang="fr">Français</button>
              <button type="button" data-lang="en" lang="en">English</button>
            </li>
            <li style="display:none">
              <p id="theme-toggle">Dark theme</p>
            </li>
          </ul>
          <ul id="nav-list">
            <li>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0 L4 4 L0 8Z" fill="currentColor" />
              </svg>
              <a href="./index.html#featured" onclick="this.getRootNode().host.closeMenu()"
                 data-i18n="navProjects"></a>
            </li>
            <li>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0 L4 4 L0 8Z" fill="currentColor" />
              </svg>
              <a href="./index.html#personal" onclick="this.getRootNode().host.closeMenu()"
                 data-i18n="navPersonal"></a>
            </li>
            <li>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0 L4 4 L0 8Z" fill="currentColor" />
              </svg>
              <a href="./index.html#about" onclick="this.getRootNode().host.closeMenu()"
                 data-i18n="navAbout"></a>
            </li>
          </ul>
        </div>
      </nav>
    `;

    // Add event listeners for switching language and theme
    const themeToggle = this.shadowRoot.getElementById('theme-toggle');
    this.shadowRoot.querySelectorAll('.language-switch button').forEach(button => {
      button.addEventListener('click', () => {
        this.setLanguage(button.dataset.lang);
        this.closeMenu();
      });
    });
    themeToggle.addEventListener('click', () => this.toggleTheme());

    // Highlight the language currently applied (saved choice, or browser default)
    this.updateLanguageSwitch();

    // Apply that language
    translate(currentLanguage); // Update main document
    translate(currentLanguage, this.shadowRoot); // Update shadowRoot for NavComponent

    // Set the current page name from the page-name attribute
    const pageName = this.getAttribute('page-name');
    if (pageName) {
      this.currentPageName = pageName;
      this.updatePageNameDisplay();
    }
  }

  // Underline the active language, dim the other one
  updateLanguageSwitch() {
    this.shadowRoot.querySelectorAll('.language-switch button').forEach(button => {
      button.setAttribute('aria-pressed', button.dataset.lang === currentLanguage);
    });
  }

  setLanguage(lang) {
    if (lang === currentLanguage) return;

    // Save the selected language so it holds on the next page and next visit
    currentLanguage = lang;
    saveLanguage(currentLanguage);
    this.updateLanguageSwitch();

    // Update translations for the entire page
    translate(currentLanguage); // Update main document
    translate(currentLanguage, this.shadowRoot); // Update shadowRoot for NavComponent
  }

  toggleLanguage() {
    this.setLanguage(currentLanguage === 'en' ? 'fr' : 'en');
  }

  toggleTheme() {
    const themeToggle = this.shadowRoot.getElementById('theme-toggle');
    const currentTheme = themeToggle.textContent.trim();
    const nextTheme = this.availableThemes.find(theme => theme !== currentTheme);
    themeToggle.textContent = nextTheme;

    // Update theme styles
    const isDarkTheme = nextTheme === 'Dark theme';
    document.documentElement.style.setProperty('--rgb-text', isDarkTheme ? 'var(--rgb-light)' : 'var(--rgb-dark)');
    document.documentElement.style.setProperty('--rgb-bg', isDarkTheme ? 'var(--rgb-dark)' : 'var(--rgb-light)');
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
    // "Portfolio" next to the logo only on sub-pages, as the way back home
    this.shadowRoot.getElementById('path-home').hidden = !this.currentPageName;
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
        @import url('./styles.css?v=20261014l');
      </style>
      <footer>
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

// ------ Page animations ------

/* Mobile project tile effect
   Only for small screens (width < 400px) – toggles image opacity on intersection */
document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth < 400) {
    document.querySelectorAll('.project-tile').forEach(tile => {
      const images = tile.querySelectorAll('.project-cover img');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(({ isIntersecting }) => {
          images[0].style.opacity = isIntersecting ? '1' : '0';
          images[1].style.opacity = isIntersecting ? '0' : '1';
        });
      }, { threshold: 0.8 });
      observer.observe(tile);
    });
  }

  // Methodology reveals on scroll and keeps its end state once played
  const methodologySection = document.querySelector('#methodology');
  if (methodologySection) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      methodologySection.classList.add('revealed');
    } else {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            methodologySection.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
        // Trigger once the section reaches the middle band of the viewport,
        // which holds whether the section is taller or shorter than the screen.
      }, { threshold: 0, rootMargin: '-25% 0px -25% 0px' });

      observer.observe(methodologySection);
    }
  }
});