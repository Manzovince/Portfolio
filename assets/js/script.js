// Languages
const translations = {
  en: {
    navProcess: "Methodology",
    navProjects: "Work",
    navPersonal: "Experiments",
    navAbout: "About me",
    introText: "<span class=\"dict-word\">Vincent</span><span class=\"dict-meta\">n.</span><span class=\"dict-def\">Product designer who listens to people, sketches screens and brings sparks to life.</span><span class=\"nowrap intro-fields\">Cognitive sciences&nbsp;· Computer science&nbsp;· <em>(Sea)</em></span>",
    methodologyText: "After earning a master's in psychology, I became interested in how cognitive sciences can shape technology. <br><br> My scientific approach lets me test hypotheses rigorously, while my technical knowledge helps me communicate effectively with engineering teams. <br><br> I approach problems by visualizing ideas through sketches and diagrams, and breaking down complex issues into simple, understandable steps.",
    proProjectText: "Discover my vision of design through some of my professional and personal projects.",
    tagPhoto: "Photography",
    tagDesign: "Design",
    tagDev: "Dev",
    tagResearch: "Research",
    tagMusic: "Music",
    tagGame: "Game",
    tagGenerative: "Generative",
    sealensDesc: "An aquatic immersive exposition",
    iso20022Desc: "Helping clients transition to a new financial standard",
    popinDesc: "The chatbot that makes babies and parents sleep",
    sgmDesignDesc: "Redesign and migration of a product design team website",
    persoProjectText: "Beside, I also like to capture pixels and play with 0 and 1s.",
    projectPlaceholder: "Coming soon !",
    projectAccessText: "Explore the site",
    sealens1: "Sealens is a photographic exhibition about the Mediterranean Sea, which invites you to explore the underwater landscapes and meet its inhabitants during a freedive.",
    sealens2: "I was born near the Mediterranean Sea, and I have always been fascinated by the underwater world. <br><br> After a few years of capturing hidden moments of underwater life, I wanted to share that experience online in a way that felt like a dive. <br><br> Inspired by the children's books where you are the hero, I designed and built the website to recreate a snorkelling or freediving session: each dive is short and unique, made of five random choices that reveal new pictures. Agathe Couturier led the art direction.",
    sealens3: "Our project was born from a simple conviction: understanding is key to better protection. <br><br> Each image is a testimony, each view an invitation to become aware of the richness and vulnerability of our maritime heritage. <br><br> It's an ode to the ocean, a visual journey that awakens as much as it amazes. Through our pictures, we seek to capture the essence of a vibrant world, shaped by thousands of years of history.",
    sealens4: "Whether you're a seasoned diver or simply curious, Sealens invites you to immerse yourself in the magic of these hidden worlds. Together, let's imagine a future where harmony between man and the sea is not a dream, but a reality.",
    sgmIsoTitle: "A new financial standard",
    sgmIso1: "ISO 20022 is the new standard for payment messages between financial institutions. Its XML files are long and strict: one wrong tag and a payment is rejected. <br><br> Born from a design challenge, this service lets corporate clients and Societe Generale's own teams check their files against the standard before sending them, and understand exactly what to fix.",
    sgmIso2: "The home page introduces the ISO 20022 standard, gives tips for a smooth migration, and offers an upload area for one or more files. <br><br> Files are parsed locally, in the browser, and displayed in a human-readable way: the errors only, or the whole file. Each error is highlighted where it occurs, with an explanation and a link to the section of the standard that tells how to fix it.",
    sgmIso3: "We started from a short brief and a proof of concept: a page where you could upload a file and see it raw, with errors in red. It worked for experts, but the XML structure is hard to read for everyone else. We kept that view for advanced users and designed a simplified one, focused on finding and fixing errors quickly. <br><br> After an ideation phase, we chose a layout that mirrors the file itself: payment batches as tabs, transactions in a side panel, and the selected transaction laid out in the centre, block by block. <br><br> Then we tested every day. In short dailies with internal users, people who handle these files, we showed the latest version, watched them use it and adjusted the design before the next session. Wrong assumptions were caught within a day instead of at the end of the project.",
    sgmDesign1: "SG Markets Design is the website of Societe Generale's product design team. I migrated it to the latest version of our design system, and built the complete redesign of its <i>Join us</i> page: the page meant to make designers want to join the team.",
    sgmDesign2: "The redesign started at a team event, with the whole design team. In small groups we ran Crazy 8s: eight ideas in eight minutes, sketched on paper, then shared and discussed. The exercise produced a wide range of directions in very little time, and the final page brings several of them together. <br><br> I then took the page from those sketches to production, with a focus on engaging interactions.",
    sgmDesign3: "The hardest part, for me, was the technology: I learned React on this project. Components, a responsive layout and CSS animations, then everything needed to ship: the deployment configuration, and an audit after release to keep the page fast. <br><br> It gave me a much better sense of what front-end developers deal with every day, and made our conversations easier ever since.",
    popin1: "When a child is born, two adults are transformed into parents. In a way, it is the child who makes the parents. Becoming a parent is life changing, in every way possible. <br><br> From happiness to frustration, we want the best for our children, and this can very quickly become stressful. Elodie Hughes, mother of 4 children and entrepreneur, has put together a small team to find a solution.",
    popin2: "Child development is a complex process. Parents need to learn a lot of things, and the web is a wide source of knowledge, but informations often contradicts. To provide clear and concise facts and tips to parents, and in the new era of human-like interaction with technology, we found that creating a chatbot was a fun and powerful way to educate. <br><br> We made a corpus of the most asked questions asked by parents, and there are a lot of subjects about babies: alimentation, health, sleep... Babies need a lot of sleep (approx. 20 hours per day as a newborn) and parents too. But it often doesn't work as we want, because babies don't have the same sleep cycle, and they need to embody the circadian rythm of day and night. <br><br> We decided to give only science-based facts, and link them with practical tips and advices when it was possible.",
    popin3: "Once we had everything we needed (personas, user flows, question-and-answer content and a new face for Pop-in), we had to structure a conversation that made clear who Pop-in is, what she does and how to talk to her. I tried several platforms before finding the right one, which was also how I learned how chatbots work. We settled on DialogFlow for natural language understanding, and ManyChat to run the bot on Facebook Messenger, where parents already were. <br><br> We also needed a website to present our goals and values. After drawing the sitemap, I designed prototypes in Adobe XD to show parents and coaches how the platform would let them start a coaching programme, then launched it with Wix.",
    popin4: "Our chatbot could answer more than 100 questions about sleep and baby health, and parents found answers quickly. But was that enough? Every child is different, and a scripted bot could not give truly personal advice. <br><br> Who is best placed to understand and solve a child's sleep problems? Specialists. Sleep coaches are common in many countries but little known in France, so we decided to bring baby sleep professionals into Pop-in, to guide parents when the chatbot reached its limits.",
    factRole: "Role",
    factTeam: "Team",
    factUsers: "Users",
    factMethods: "Methods",
    factArtDirection: "Art direction",
    caseContext: "Context",
    caseProcess: "Process",
    caseSolution: "Solution",
    caseOutcome: "Outcome",
    caseLearned: "What I learned",
    caseHindsight: "Looking back",
    caseResearch: "Research",
    caseDesignBuild: "Design and build",
    caseBeyond: "Beyond the chatbot",
    isoRole: "UX designer: research, interface design and front-end",
    isoUsers: "Corporate clients and internal teams",
    isoMethods: "Ideation, prototyping, daily tests with internal users",
    sgmIsoLearned: "Testing every day with the people who would use the tool turned testing into a habit rather than a phase. Small, frequent sessions kept the design grounded in real files and real errors, not in the specification alone.",
    sgmDesignRole: "Designer and front-end developer",
    sgmDesignTeam: "The whole design team for the ideation, then me for the build",
    sgmDesignOutcome: "The new page was well received: it was complimented on social networks, and the team saw spontaneous applications go up after it went live. <br><br> To see it in motion, visit <a href='https://design.sgmarkets.com/' target='_blank' rel='noopener' class='link'>SG Markets Design</a>.",
    popinRole: "UX designer and developer",
    popinTeam: "An entrepreneur, a psychologist and me",
    popinHindsight: "Pop-in was built in 2019, before large language models. AI has progressed so much since then that a general assistant now answers these questions better than our scripted chatbot ever could. <br><br> Some of the work still holds, though: grounding every answer in science, designing a conversation people can trust, and knowing when to hand over to a human expert. These are exactly the questions designers face with AI assistants today.",
    sealensRole: "UX design and development",
    sealensArt: "Agathe Couturier",
    aboutTitle: "About me",
    aboutText: "I am a lifelong learner, and I enjoy experimenting with ideas that blend my skills in photography, music, science or education, continually pushing my creative boundaries. <br><br> The rest of the time, I love pretending to be a bird with my drone, or a fish with my mask and snorkel!",
    experienceTitle: "Experience",
    yearNow: "Now",
    expScalianText: "UX designer consultant at Scalian, on assignment for the French Ministry of the Armed Forces, working specifically on operational IT systems.",
    expUXText: "Designer of multiple services across various business lines, and co-lead of the Design System team. Find out more at <a href='https://info.sgmarkets.com/' class='link'>SG Markets</a> and also our <a href='https://design.sgmarkets.com/' class='link'>design team website</a>.",
    expTeacherTitle: "UX Design teacher",
    expTeacherText: "Lectures and workshops with students from the Multimedia and Internet professions program. These courses concluded in end-of-year projects ranging from user research to website development.",
    expPopinTitle: "UX designer &amp; developer",
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
    webPianoDesc: "Octave: a piano, an FM synth and a teacher, in the browser",
    webPianoIntro: "Octave is a piano in the browser that has grown up: a sampled grand piano and a six-operator FM synthesizer, a mode that teaches songs and chords, and a mode to design your own sounds. It works by touch on a phone or a tablet, with the computer keyboard, or with a MIDI keyboard.",
    webPianoOpen: "Play Octave",
    webPianoStory: "It started with a simple idea: what if the piano keys I play could light up a strip of LEDs in real time? At the time, I had never touched an Arduino and barely knew what MIDI looked like under the hood. The first version was a single octave and a sine wave drawn on the screen. <br><br> It became a web piano that named chords, wrote them on a staff and drove an LED strip through an ESP32. Meanwhile I built Phase, an FM synthesizer for my two ROLI LUMI keyboards. Octave is both, rebuilt from scratch around one question: what should the screen show when your hands are on the keys?",
    webPianoPrototypeAlt: "First prototype: a sine wave drawn above a one-octave keyboard",
    webPianoPrototypeCaption: "Octave v0.1: a sine wave over a one-octave keyboard.",
    webPianoPlayTitle: "Play",
    webPianoPlay: "Notes rise from the keys as you play them, over a faint oscilloscope of the sound. Above, the chord is named the way a musician would spell it, with its inversion: E♭ in C minor, D♯ in B major. <br><br> The keyboard can be split in two, one sound per hand or per LUMI block, each with its own colour. An arpeggiator and a sixteen-step pattern sit one tap away, and a second view writes what you play on a grand staff, ready to download as an image or a MIDI file.",
    webPianoAppAlt: "Octave's Play screen: a G major seventh chord named above rising notes, with a grand piano on the left half of the keyboard and an FM electric piano on the right",
    webPianoLearnTitle: "Learn",
    webPianoLearn: "Open a song, from the examples or any MIDI file, and its notes fall onto the keys, left and right hand in two colours, with the staff turning above. Choose a hand: the song plays the other one and waits on each chord until you find it, at full speed or slower. <br><br> Exercises ask for chords and scales, from major triads to sevenths, and light the keys to play on screen and, if you like, on the LUMI itself.",
    webPianoLearnAlt: "Learning Ode to Joy: notes falling onto the keyboard below the staff, the next key to play glowing",
    webPianoCreateTitle: "Create",
    webPianoCreate: "The sound engine comes from Phase: six operators following the DX7's rules, thirty-two algorithms, envelopes and keyboard scaling, running in an AudioWorklet. Thirty-five original sounds, from electric pianos to bells, and DX7 banks (.syx) can be imported and exported. <br><br> The graph of operators is animated by the sound itself: each line glows with the level of the modulator feeding it, so you can see why a sound is bright or soft.",
    webPianoCreateAlt: "The FM editor: the graph of six operators on the left, the settings and envelope of operator 1 on the right",
    webPianoTouchTitle: "Made for fingers",
    webPianoTouch: "Everything is sized for touch: large buttons, sliders you drag anywhere along their length, a keyboard docked at the bottom of every screen that fits its width and plays with several fingers at once. On a phone, the panels fold under the stage; on a desktop, they sit beside it.",
    webPianoPhonesAlt: "Octave on two phones: the Play screen with a grand piano, and a chord exercise with its notes lit on the keys",
    webPianoLearnedTitle: "What I learned",
    webPianoLearned: "Merging two apps meant deciding what each screen is for, rather than adding features. Three modes, one keyboard always in the same place, and every setting that is not about playing moved into a single panel. <br><br> Octave works best in Chrome or Edge, which support Web MIDI. On an iPhone or iPad, open it in the Web MIDI Browser app to play with a keyboard. Without one, the on-screen keys and the computer keyboard work everywhere.",
    apneaDesc: "A breath-hold trainer for static apnea",
    ikeaDesc: "A small quiz on IKEA product names, vibe-coded just for fun",
    topographyDesc: "Procedural contour maps, animated and exportable",
    lagonDesc: "Water caustics that change with the time of day",
    ikeaIntro: "A small quiz on IKEA product names, vibe-coded just for fun. Guess what a KALLAX or a DUKTIG is, spot the made-up names and crack the logic behind them. In French, made for a phone.",
    ikeaOpen: "Play the quiz",
    ikeaAppAlt: "Three screens of IKEA guesser: the menu of game modes, a question asking what DUKTIG is, and a real-or-invented question",
    ikeaStory: "Everyone has stood in a showroom wondering what on earth a FJÄLLBO is. This quiz grew out of that joke, and it was vibe-coded without much of a plan: describe a game mode, try it, keep what is fun.",
    ikeaModesTitle: "Six ways to play",
    ikeaModes: "Guess the object behind a Swedish name, or the name behind an object. Tell real products from invented ones that sound just as Swedish. Translate names with a little dictionary (BLÅHAJ means blue shark). Work out the naming code: why beds get Norwegian place names and rugs Danish ones. Or mix everything in a 60-second race against the clock. <br><br> Each round of ten questions ends with a rank, from <em>lost in the showroom</em> to <em>flat-pack master</em>.",
    ikeaModesAlt: "Two screens of the quiz: the Swedish dictionary asking what LURVIG means, and the naming code asking which products get which names",
    ikeaNoteTitle: "Take it lightly",
    ikeaNote: "The names, translations and fun facts were written quickly and have not all been checked against the catalogue, so take the trivia with a pinch of salt. This is a fan quiz, not affiliated with IKEA; the drawings are simple pictograms, not product photos.",
    topographyIntro: "A generator of procedural topographic maps: contour lines drawn from noise, animated, with palettes, layered fills, and exports to PNG, SVG and video.",
    topographyOpen: "Open Topography",
    topographyAppAlt: "Topography with its settings panel on the left and a sand-coloured island drawn in layered contour lines",
    topographyStory: "Contour lines make a beautiful pattern on their own, far from any map. Topography draws endless terrains of them, to use as backgrounds or posters, or just to watch them move.",
    topographyHowTitle: "From noise to lines",
    topographyHow: "Each map starts from a seed. Layers of simplex noise build a height field, which is shaped into hills, ridges, terraces or islands, with an optional sea level. The marching squares algorithm then traces the contour lines through that field, and they are smoothed before being drawn. <br><br> The animation moves through the noise itself: the terrain slowly morphs, drifts across the screen, or keeps still while its lines flow uphill.",
    topographyStyleTitle: "Styles and exports",
    topographyStyle: "Seven palettes, from paper to neon, a layered or gradient fill with hillshading, a pixelated render, and a randomise button for happy accidents. Every map can be saved as a PNG, a vector SVG, a WebM video of the animation, or even as ASCII text.",
    topographyLooksAlt: "Four maps made with Topography: a paper island, green terraced hills, purple neon lines and a blueprint",
    lifeCalendarDesc: "Tiny squares, entire journey",
    vivantDesc: "A pixel lost in the Game of Life",
    crabesDesc: "A crab battle on a board of hidden tiles",
    fauxArtisteDesc: "A drawing party game where one player is bluffing",
    effortlessDesc: "The worst sign-up form ever designed, on purpose",
    workTitle: "From paper to screen",
    themeToDark: "Switch to dark mode",
    themeToLight: "Switch to light mode",
    backToWork: "Back to work",
    nextProject: "Next project",
    backToPortfolio: "Back to the portfolio",
    backToExperiments: "Back to experiments",
    workLead: "Discover my vision of design through my professional and personal projects.",
    personalTitle: "Pixels, zeros and ones",
    personalLead: "What I build on my own time: music, games, water and maps.",
    personalTeaser: "Beyond these projects, I keep another playground: ideas built for the fun of it, with no brief and no deadline. <a href=\"./experiments.html\" class=\"link\">See the experiments&nbsp;→</a>",
    landSeaDesc: "Aerial photography",
    landSeaIntro: "Since 2023, I've been exploring the world from above, capturing landscapes I thought I knew in a new dimension.",
    landSeaBoatsAlt: "Aerial drone photo of fishing boats along a Mediterranean coastline",
    landSeaIslandAlt: "Aerial drone photo of a rocky coastal headland with waves breaking against the shore",
    landSeaSeaAlt: "Aerial drone photo of two circular clifftop viewpoints above crashing waves",
    lifeCalendarIntro: "A whole life drawn as a grid of tiny squares, one for each week. Enter a date of birth, and the weeks already lived fill in, up to the one happening right now.",
    lifeCalendarOpen: "Open Life calendar",
    lifeCalendarStory: "The idea comes from Tim Urban's \"Your Life in Weeks\": ninety rows of fifty-two squares fit on a single page, and seeing them all at once changes how a week feels. I wanted my own version, one I could fill with the chapters of my life.",
    lifeCalendarHowTitle: "Chapters and moments",
    lifeCalendarHow: "Chapters colour a stretch of squares: school, a city, a job, still going on or long finished. Moments circle a single square, for the dates worth remembering. Hovering a square tells its age and dates, and the grid can switch to months or years for a calmer view. <br><br> Everything stays in the browser, and the calendar prints as a poster.",
    lagonIntro: "A living poster of light on water: caustics rippling across a pool floor, in step with the real time of day. Golden at sunrise, bright blue at noon, pink at dusk and almost black at night.",
    lagonOpen: "Open Lagon",
    lagonAppAlt: "Lagon at golden hour: warm streaks of light rippling over deep blue water",
    lagonStory: "Lagon is meant to stay open on a spare screen or a tablet, like a window onto a swimming pool. It reads the clock and nothing else: no buttons, no sound, just the water changing slowly with the day.",
    lagonDayTitle: "Light through the day",
    lagonDay: "The day is described by a dozen key moments, each with its own water tint, light colour and caustic strength, from deep night to the two golden hours. The page blends between them minute by minute. <br><br> The sun travels from east to west, and the lower it is, the more the pattern stretches in its direction, like real light grazing the water.",
    lagonDayAlt: "Four slices of Lagon at different hours: golden morning, bright noon, pink dusk and dark night",
    lagonLookTitle: "A screen-printed look",
    lagonLook: "Everything is drawn by a single WebGL shader. The caustics are thin ridges in warped noise, flattened into a few tones like a screen print, with a slight colour split and some grain. It renders below the screen's resolution, which keeps the image soft and phones cool. <br><br> Add <code>?debug</code> to the address, or press D, to scrub through the day.",
    apneaIntro: "A web app to train and track static apnea: max holds with contraction markers, CO₂ and O₂ tables, breathing exercises and progress charts. It installs on a phone, works offline and keeps everything on the device.",
    apneaOpen: "Open Apnea",
    apneaAppAlt: "Three screens of Apnea: the training menu with the personal best, a max hold in progress with contraction marks on the ring, and the progress chart",
    apneaStory: "Most freediving progress happens on dry land, lying on a couch with a stopwatch. The trouble is that a stopwatch only tells you how long you held. It says nothing about when the urge to breathe started, how the hold felt, or whether last month's training made any difference. <br><br> Apnea started as a better stopwatch and grew into a small training companion, built for one-handed use with your eyes closed.",
    apneaHoldTitle: "Listening to the contractions",
    apneaHold: "A max hold has three phases: a guided relaxation, the hold itself, and a recovery. During the hold, the whole bottom of the screen becomes one big button: tap it at each diaphragm contraction. Each tap leaves a mark on the ring. <br><br> Afterwards, the app separates the calm part of the hold from the <em>fight phase</em>, the time between the first contraction and the end. Over the weeks, watching that first contraction arrive later is often a better sign of progress than the record itself.",
    apneaTablesTitle: "Tables, breathing and dives",
    apneaTables: "CO₂ tables keep the same hold and shorten the rest each round; O₂ tables do the opposite. Both can be built from your personal best, and the whole plan is shown before you start. A breathing section offers box breathing, 4-7-8, coherence or your own pattern, with an animated ring and voice cues. <br><br> Dives from a Garmin watch can be imported straight from a <code>.fit</code> or <code>.csv</code> file. I wrote the FIT decoder from scratch, so the app still has no dependency at all.",
    apneaLogbookAlt: "The CO₂ table setup screen next to the logbook, with holds, tables, breathing sessions and an imported freedive",
    apneaLearnedTitle: "What I learned",
    apneaLearned: "Timing turned out to be the hard part. A browser happily slows down a hidden tab, so the timers follow the wall clock rather than counting frames, and the screen is kept awake during a session. Voice and sound cues let you train with your eyes closed. <br><br> Everything is stored in your browser: no account, no server, no tracking. <br><br> <strong>Safety first:</strong> this app is made for dry training. Never hold your breath in or near water without a trained buddy watching you.",
    eduMasterTitle: "Psychology & neurosciences of movement",
    eduMasterText: "My academic foundation in Psychology, paired with extensive research into intelligent systems, has deepened my understanding of how cognitive processes and embodied experiences shape human consciousness. <br><br> Discovering the exciting world of scientific research, this interdisciplinary approach ended with a dissertation exploring the intersection of sensory integration and body awareness, using the famous <i>Rubber hand illusion</i>."
  },
  fr: {
    navProcess: "Méthodologie",
    navProjects: "Projets",
    navPersonal: "Expérimentations",
    navAbout: "A propos de moi",
    introText: "<span class=\"dict-word\">Vincent</span><span class=\"dict-meta\">n. m.</span><span class=\"dict-def\">Product designer qui écoute les gens, esquisse des écrans et donne vie aux élans.</span><span class=\"nowrap intro-fields\">Sciences cognitives&nbsp;· Informatique&nbsp;· <em>(Mer)</em></span>",
    methodologyText: "Après un master en psychologie, je me suis intéressé à la manière dont les sciences cognitives peuvent façonner les nouvelles technologies. <br><br> Mon approche scientifique me permet de tester rigoureusement des hypothèses, et mes connaissances techniques m'aident à communiquer efficacement avec les ingénieurs. <br><br> J'aborde les problèmes en visualisant des idées à travers des croquis et des diagrammes, et en décomposant les problèmes complexes en étapes simples et compréhensibles.",
    proProjectText: "Découvrez ma vision du design à travers mes projets professionels et personnels.",
    tagPhoto: "Photographie",
    tagDesign: "Design",
    tagDev: "Développement",
    tagResearch: "Recherche",
    tagMusic: "Musique",
    tagGame: "Jeu",
    tagGenerative: "Génératif",
    sealensDesc: "Une exposition aquatique immersive",
    iso20022Desc: "Aider les clients à passer à un nouveau standard financier",
    popinDesc: "Le chatbot qui fait dormir les bébés et les parents",
    sgmDesignDesc: "Redesign et migration du site de l'équipe design",
    persoProjectText: "À côté, j'aime aussi capturer des pixels et jouer avec des 0 et des 1.",
    projectPlaceholder: "Bientôt disponible !",
    projectAccessText: "Voir le site",
    sealens1: "Sealens est une exposition photographique sur la mer Méditerranée, qui vous invite à explorer les paysages sous-marins et à rencontrer ses habitants le temps d'une plongée.",
    sealens2: "Je suis né près de la mer Méditerranée, et j'ai toujours été fasciné par le monde sous-marin. <br><br> Après quelques années à capturer des moments cachés de la vie sous-marine, je voulais partager cette expérience en ligne, d'une manière qui ressemble à une plongée. <br><br> Inspiré par les livres dont vous êtes le héros, j'ai conçu et développé le site pour recréer une sortie en snorkeling ou en apnée : chaque plongée est courte, unique, composée de rencontres aléatoires et inattendues. Agathe Couturier a assuré la direction artistique.",
    sealens3: "Notre projet est né d'une conviction simple : comprendre est la clé d'une meilleure protection. <br><br> Chaque image est un témoignage, chaque paysage une invitation à prendre conscience de la richesse et de la vulnérabilité de notre patrimoine maritime. <br><br> C'est une ode à l'océan, un voyage visuel qui éveille autant qu'il émerveille. À travers nos images, nous cherchons à capturer l'essence d'un monde vibrant, façonné par des milliers d'années d'histoire.",
    sealens4: "Que vous soyez un plongeur chevronné ou simplement curieux, <a href='https://sealens.art' target='_blank' class='link'>Sealens</a> vous invite à plonger dans la magie de ces mondes cachés. Ensemble, imaginons un avenir où l'harmonie entre l'homme et la mer n'est pas un rêve, mais une réalité. <br><br> ",
    sgmIsoTitle: "Un nouveau standard financier",
    sgmIso1: "ISO 20022 est le nouveau standard des messages de paiement entre institutions financières. Ses fichiers XML sont longs et stricts : une balise erronée, et le paiement est rejeté. <br><br> Né d'un challenge de design, ce service permet aux clients corporate et aux équipes de Société Générale de vérifier leurs fichiers avant de les envoyer, et de comprendre précisément quoi corriger.",
    sgmIso2: "La page d'accueil présente la norme ISO 20022, donne des conseils pour réussir sa migration, et propose une zone pour déposer un ou plusieurs fichiers. <br><br> Les fichiers sont analysés localement, dans le navigateur, et affichés de manière lisible : uniquement les erreurs, ou le fichier complet. Chaque erreur est mise en évidence là où elle se trouve, avec une explication et un lien vers la section de la norme qui indique comment la corriger.",
    sgmIso3: "Nous sommes partis d'un brief court et d'un proof of concept : une page où l'on pouvait déposer un fichier et le voir brut, avec les erreurs en rouge. Cela fonctionnait pour les experts, mais la structure XML reste difficile à lire pour tous les autres. Nous avons gardé cette vue pour les utilisateurs avancés, et conçu une vue simplifiée, centrée sur la recherche et la correction rapide des erreurs. <br><br> Après une phase d'idéation, nous avons choisi une interface qui reprend la structure du fichier : les batchs de paiement en onglets, les transactions dans un panneau latéral, et la transaction sélectionnée détaillée au centre, bloc par bloc. <br><br> Puis nous avons testé tous les jours. Lors de dailys courts avec des utilisateurs internes, ceux qui manipulent ces fichiers au quotidien, nous montrions la dernière version, les regardions s'en servir, et ajustions le design avant la session suivante. Une hypothèse fausse était corrigée en une journée, et non à la fin du projet.",
    sgmDesign1: "SG Markets Design est le site de l'équipe product design de Société Générale. Je l'ai migré vers la dernière version de notre design system, et j'ai développé le redesign complet de sa page <i>Rejoignez-nous</i> : celle qui doit donner envie aux designers de rejoindre l'équipe.",
    sgmDesign2: "Le redesign a commencé lors d'un évènement d'équipe, avec toute l'équipe design. En petits groupes, nous avons fait des Crazy 8 : huit idées en huit minutes, esquissées sur papier, puis partagées et discutées. L'exercice a fait émerger beaucoup de pistes en très peu de temps, et la page finale en réunit plusieurs. <br><br> J'ai ensuite mené la page de ces croquis jusqu'à la production, en mettant l'accent sur des interactions engageantes.",
    sgmDesign3: "Le plus difficile, pour moi, a été la technique : j'ai appris React sur ce projet. Les composants, une mise en page responsive et les animations CSS, puis tout ce qu'il faut pour mettre en production : la configuration du déploiement, et un audit après la mise en ligne pour garder une page rapide. <br><br> J'ai beaucoup mieux compris le quotidien des développeurs front-end, et nos échanges n'en ont été que plus simples.",
    popin1: "En naissant, un enfant transforme deux adultes en parents. D'une certaine manière, c'est l'enfant qui fait les parents. Devenir parent est un changement de vie, à tous les niveaux. Du bonheur à la frustration, nous voulons le meilleur pour nos enfants, et cela peut très vite devenir stressant, au point d'impacter notre vie. Elodie Hughes, mère de 4 enfants, et entrepreneuse, nous a réuni pour trouver une solution.",
    popin2: "Le développement de l'enfant est un processus complexe. Les parents doivent apprendre beaucoup de choses, et même si le web est une source de connaissances, les informations se contredisent souvent. Pour fournir des faits et des conseils clairs et concis aux parents, et dans la nouvelle ère de l'interaction humaine avec la technologie, nous avons trouvé que la création d'un chatbot était un moyen amusant et puissant d'éduquer. <br><br> Nous avons donc constitué un corpus des questions les plus posées par les parents, et il y a beaucoup de sujets sur les bébés : alimentation, santé, sommeil... Les bébés ont besoin de beaucoup de sommeil (environ 20 heures par jour en tant que nouveau-né) et les parents aussi. Mais cela ne fonctionne souvent pas comme nous le voulons, car les bébés n'ont pas le même cycle de sommeil, et ils doivent se synchroniser sur le rythme circadien du jour et de la nuit. <br><br> Nous avons décidé de donner uniquement des faits basés sur la science, et de les lier à des conseils pratiques quand cela était possible.",
    popin3: "Une fois que nous avions tout ce qu'il fallait (personas, user flows, contenu questions-réponses et un nouveau visage pour Pop-in), il fallait structurer une conversation qui fasse comprendre qui est Pop-in, ce qu'elle fait et comment lui parler. J'ai testé plusieurs plateformes avant de trouver la bonne, ce qui m'a aussi appris comment fonctionnent les chatbots. Nous avons choisi DialogFlow pour la compréhension du langage naturel, et ManyChat pour faire vivre le bot sur Facebook Messenger, là où les parents étaient déjà. <br><br> Il nous fallait aussi un site pour présenter nos objectifs et nos valeurs. Après avoir construit la sitemap, j'ai conçu des prototypes dans Adobe XD pour montrer aux parents et aux coachs comment la plateforme leur permettrait de démarrer un coaching, puis je l'ai lancé avec Wix.",
    popin4: "Notre chatbot pouvait répondre à plus de 100 questions sur le sommeil et la santé des bébés, et les parents trouvaient vite leurs réponses. Mais est-ce que cela suffisait ? Chaque enfant est différent, et un bot scripté ne pouvait pas donner de conseils vraiment personnalisés. <br><br> Qui est le mieux placé pour comprendre et résoudre les problèmes de sommeil d'un enfant ? Les spécialistes. Les coachs du sommeil sont courants dans de nombreux pays mais peu connus en France : nous avons donc décidé de faire entrer des professionnels du sommeil des bébés dans Pop-in, pour accompagner les parents là où le chatbot atteignait ses limites.",
    factRole: "Rôle",
    factTeam: "Équipe",
    factUsers: "Utilisateurs",
    factMethods: "Méthodes",
    factArtDirection: "Direction artistique",
    caseContext: "Contexte",
    caseProcess: "Démarche",
    caseSolution: "Solution",
    caseOutcome: "Résultats",
    caseLearned: "Ce que j'ai appris",
    caseHindsight: "Avec le recul",
    caseResearch: "Recherche",
    caseDesignBuild: "Conception et développement",
    caseBeyond: "Au-delà du chatbot",
    isoRole: "UX designer : recherche, conception de l'interface et front-end",
    isoUsers: "Clients corporate et équipes internes",
    isoMethods: "Idéation, prototypage, tests quotidiens avec des utilisateurs internes",
    sgmIsoLearned: "Tester chaque jour avec les personnes qui allaient utiliser l'outil a fait des tests une habitude plutôt qu'une étape. Des sessions courtes et fréquentes ont gardé le design ancré dans de vrais fichiers et de vraies erreurs, pas seulement dans la spécification.",
    sgmDesignRole: "Designer et développeur front-end",
    sgmDesignTeam: "Toute l'équipe design pour l'idéation, puis moi pour le développement",
    sgmDesignOutcome: "La nouvelle page a été bien accueillie : elle a reçu des compliments sur les réseaux sociaux, et l'équipe a vu les candidatures spontanées augmenter après sa mise en ligne. <br><br> Pour la voir en mouvement, rendez-vous sur <a href='https://design.sgmarkets.com/' target='_blank' rel='noopener' class='link'>SG Markets Design</a>.",
    popinRole: "UX designer et développeur",
    popinTeam: "Une entrepreneuse, une psychologue et moi",
    popinHindsight: "Pop-in a été conçu en 2019, avant les grands modèles de langage. L'IA a tellement progressé depuis qu'un assistant généraliste répond aujourd'hui mieux à ces questions que notre chatbot scripté ne l'a jamais fait. <br><br> Une partie du travail reste pourtant valable : appuyer chaque réponse sur la science, concevoir une conversation à laquelle on peut faire confiance, et savoir quand passer la main à un expert humain. Ce sont exactement les questions que se posent aujourd'hui les designers d'assistants IA.",
    sealensRole: "UX design et développement",
    sealensArt: "Agathe Couturier",
    aboutTitle: "A propos de moi",
    aboutText: "Je suis un éternel curieux, et j'aime expérimenter avec des idées qui mélangent mes compétences en photographie, sciences et éducation, repoussant continuellement mes limites créatives. <br><br> Le reste du temps, j'aime me prendre pour un oiseau avec mon drone, ou pour un poisson avec mon masque et mon tuba !",
    experienceTitle: "Expérience",
    yearNow: "Auj.",
    expScalianText: "Consultant UX designer chez Scalian, en mission pour le ministère des Armées, spécifiquement sur les systèmes informatiques opérationnels.",
    expUXText: "Designer référent sur plusieurs services à travers différentes lignes de métier, et co-lead de l'équipe Design System. Pour en savoir plus, rendez-vous sur <a href='https://info.sgmarkets.com/' class='link'>SG Markets</a> ainsi que notre <a href='https://design.sgmarkets.com/' class='link'>site d'équipe</a>.",
    expTeacherTitle: "Enseignant en UX Design",
    expTeacherText: "J'ai donné des cours magistraux et animer des ateliers avec des étudiants du programme Métiers du Multimédia et de l'Internet. Ces cours se sont terminés par des projets de fin d'année allant de la recherche utilisateur à la création de sites web.",
    expPopinTitle: "UX designer &amp; développeur",
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
    webPianoDesc: "Octave : un piano, un synthé FM et un prof, dans le navigateur",
    webPianoIntro: "Octave, c'est un piano dans le navigateur qui a grandi : un piano à queue échantillonné et un synthétiseur FM à six opérateurs, un mode qui apprend les morceaux et les accords, et un mode pour créer ses propres sons. Il se joue du bout des doigts sur téléphone ou tablette, au clavier de l'ordinateur, ou avec un clavier MIDI.",
    webPianoOpen: "Jouer avec Octave",
    webPianoStory: "Tout est parti d'une idée simple : et si les touches du piano que je joue pouvaient allumer un ruban de LED en temps réel ? À l'époque, je n'avais jamais touché à un Arduino et je savais à peine à quoi ressemblait le MIDI sous le capot. La première version tenait sur une octave, avec une onde sinusoïdale dessinée à l'écran. <br><br> C'est devenu un piano web qui nommait les accords, les écrivait sur une portée et pilotait un ruban LED via un ESP32. En parallèle, j'ai construit Phase, un synthé FM pour mes deux claviers ROLI LUMI. Octave réunit les deux, refait de zéro autour d'une question : que doit montrer l'écran quand on a les mains sur le clavier ?",
    webPianoPrototypeAlt: "Premier prototype : une onde sinusoïdale dessinée au-dessus d'un clavier d'une octave",
    webPianoPrototypeCaption: "La v0.1 d'Octave : une onde sinusoïdale au-dessus d'un clavier d'une octave.",
    webPianoPlayTitle: "Jouer",
    webPianoPlay: "Les notes montent des touches à mesure qu'on les joue, sur un léger oscilloscope du son. Au-dessus, l'accord est nommé comme l'écrirait un musicien, renversement compris : Mi♭ en Do mineur, Ré♯ en Si majeur. <br><br> Le clavier se coupe en deux, un son par main ou par bloc LUMI, chacun dans sa couleur. Un arpégiateur et un motif de seize pas sont à un geste, et une seconde vue écrit ce que l'on joue sur une double portée, à télécharger en image ou en fichier MIDI.",
    webPianoAppAlt: "L'écran Jouer d'Octave : un accord de Sol majeur septième nommé au-dessus des notes qui montent, un piano à queue sur la moitié gauche du clavier et un piano électrique FM sur la droite",
    webPianoLearnTitle: "Apprendre",
    webPianoLearn: "On ouvre un morceau, parmi les exemples ou n'importe quel fichier MIDI, et ses notes tombent sur les touches, main gauche et main droite en deux couleurs, avec la partition qui défile au-dessus. On choisit une main : le morceau joue l'autre et attend sur chaque accord qu'on le trouve, à pleine vitesse ou plus lentement. <br><br> Les exercices demandent des accords et des gammes, des triades majeures aux septièmes, et allument les touches à jouer à l'écran et, si on le souhaite, sur le LUMI lui-même.",
    webPianoLearnAlt: "Apprendre l'Ode à la joie : les notes tombent sur le clavier sous la partition, la prochaine touche à jouer s'illumine",
    webPianoCreateTitle: "Créer",
    webPianoCreate: "Le moteur sonore vient de Phase : six opérateurs qui suivent les règles du DX7, trente-deux algorithmes, enveloppes et échelle de clavier, le tout dans un AudioWorklet. Trente-cinq sons originaux, des pianos électriques aux cloches, et les banques DX7 (.syx) s'importent et s'exportent. <br><br> Le graphe des opérateurs s'anime avec le son lui-même : chaque liaison brille selon le niveau du modulateur qui l'alimente, pour voir pourquoi un son est brillant ou doux.",
    webPianoCreateAlt: "L'éditeur FM : le graphe des six opérateurs à gauche, les réglages et l'enveloppe de l'opérateur 1 à droite",
    webPianoTouchTitle: "Pensé pour les doigts",
    webPianoTouch: "Tout est dimensionné pour le toucher : de grands boutons, des curseurs qu'on fait glisser n'importe où sur leur longueur, un clavier ancré en bas de chaque écran qui s'adapte à sa largeur et se joue à plusieurs doigts. Sur téléphone, les panneaux se replient sous la scène ; sur ordinateur, ils se posent à côté.",
    webPianoPhonesAlt: "Octave sur deux téléphones : l'écran Jouer avec un piano à queue, et un exercice d'accord avec ses notes allumées sur les touches",
    webPianoLearnedTitle: "Ce que j'ai appris",
    webPianoLearned: "Fusionner deux applis, c'était décider à quoi sert chaque écran plutôt qu'ajouter des fonctions. Trois modes, un clavier toujours au même endroit, et tout réglage qui ne sert pas à jouer rangé dans un seul panneau. <br><br> Octave fonctionne au mieux dans Chrome ou Edge, qui prennent en charge le Web MIDI. Sur iPhone ou iPad, ouvrez-le dans l'app Web MIDI Browser pour jouer avec un clavier. Sans clavier, les touches à l'écran et le clavier de l'ordinateur marchent partout.",
    apneaDesc: "Un entraîneur d'apnée statique",
    ikeaDesc: "Un petit quiz sur les noms IKEA, vibe-codé juste pour le fun",
    topographyDesc: "Des cartes topographiques procédurales, animées et exportables",
    lagonDesc: "Des reflets d'eau qui changent avec l'heure de la journée",
    ikeaIntro: "Un petit quiz sur les noms des produits IKEA, vibe-codé juste pour le fun. Devinez ce qu'est un KALLAX ou un DUKTIG, repérez les noms inventés et percez la logique qui se cache derrière. En français, pensé pour le téléphone.",
    ikeaOpen: "Jouer au quiz",
    ikeaAppAlt: "Trois écrans d'IKEA guesser : le menu des modes de jeu, une question demandant ce qu'est DUKTIG, et une question vrai ou inventé",
    ikeaStory: "Tout le monde s'est déjà demandé, au détour d'un showroom, ce que pouvait bien être un FJÄLLBO. Ce quiz est né de cette blague, et il a été vibe-codé sans vraiment de plan : décrire un mode de jeu, l'essayer, garder ce qui est drôle.",
    ikeaModesTitle: "Six façons de jouer",
    ikeaModes: "Retrouver l'objet derrière un nom suédois, ou le nom derrière un objet. Distinguer les vrais produits des noms inventés, qui sonnent tout aussi suédois. Traduire les noms grâce à un petit dico (BLÅHAJ veut dire requin bleu). Percer le code des noms : pourquoi les lits portent des noms de lieux norvégiens et les tapis des noms danois. Ou tout mélanger dans une course de 60 secondes contre la montre. <br><br> Chaque partie de dix questions se termine par un rang, de <em>perdu dans le showroom</em> à <em>maître du flatpack</em>.",
    ikeaModesAlt: "Deux écrans du quiz : le petit dico suédois demandant ce que veut dire LURVIG, et le code secret demandant quels produits portent quels noms",
    ikeaNoteTitle: "À prendre à la légère",
    ikeaNote: "Les noms, les traductions et les anecdotes ont été écrits rapidement et n'ont pas tous été vérifiés dans le catalogue : à prendre avec des pincettes. C'est un quiz de fan, sans lien avec IKEA ; les dessins sont de simples pictogrammes, pas des photos de produits.",
    topographyIntro: "Un générateur de cartes topographiques procédurales : des courbes de niveau tirées du bruit, animées, avec des palettes, des remplissages étagés et des exports en PNG, SVG et vidéo.",
    topographyOpen: "Ouvrir Topography",
    topographyAppAlt: "Topography avec son panneau de réglages à gauche et une île couleur sable dessinée en courbes de niveau étagées",
    topographyStory: "Les courbes de niveau font un très beau motif à elles seules, loin de toute carte. Topography en dessine des terrains à l'infini, pour en faire des fonds d'écran, des affiches, ou simplement pour les regarder bouger.",
    topographyHowTitle: "Du bruit aux lignes",
    topographyHow: "Chaque carte part d'une graine. Des couches de bruit simplex construisent un champ d'altitude, façonné en collines, en crêtes, en terrasses ou en îles, avec un niveau de la mer en option. L'algorithme des marching squares trace ensuite les courbes de niveau dans ce champ, puis elles sont lissées avant d'être dessinées. <br><br> L'animation se déplace dans le bruit lui-même : le terrain se transforme lentement, dérive à travers l'écran, ou reste immobile pendant que ses lignes remontent la pente.",
    topographyStyleTitle: "Styles et exports",
    topographyStyle: "Sept palettes, du papier au néon, un remplissage étagé ou en dégradé avec ombrage du relief, un rendu pixélisé, et un bouton aléatoire pour les heureux accidents. Chaque carte s'enregistre en PNG, en SVG vectoriel, en vidéo WebM de l'animation, ou même en texte ASCII.",
    topographyLooksAlt: "Quatre cartes faites avec Topography : une île sur papier, des collines vertes en terrasses, des lignes néon violettes et un plan bleu",
    lifeCalendarDesc: "De petits carrés, toute une vie",
    vivantDesc: "Un pixel perdu dans le Jeu de la vie",
    crabesDesc: "Une bataille de crabes sur un plateau de tuiles cachées",
    fauxArtisteDesc: "Un jeu de dessin entre amis, dont l’un bluffe",
    effortlessDesc: "Le pire formulaire d’inscription jamais conçu, exprès",
    workTitle: "Du papier à l’écran",
    themeToDark: "Passer en mode sombre",
    themeToLight: "Passer en mode clair",
    backToWork: "Retour aux projets",
    nextProject: "Projet suivant",
    backToPortfolio: "Retour au portfolio",
    backToExperiments: "Retour aux expérimentations",
    workLead: "Découvrez ma vision du design à travers mes projets professionnels et personnels.",
    personalTitle: "Des pixels, des 0 et des 1",
    personalLead: "Ce que je construis sur mon temps libre : musique, jeux, eau et cartes.",
    personalTeaser: "En dehors de ces projets, je garde un autre terrain de jeu : des idées construites pour le plaisir, sans brief ni deadline. <a href=\"./experiments.html\" class=\"link\">Voir les expérimentations&nbsp;→</a>",
    landSeaDesc: "Photographie aérienne",
    landSeaIntro: "Depuis 2023, j'explore le monde vu d'en haut, pour saisir sous un nouvel angle des paysages que je croyais connaître.",
    landSeaBoatsAlt: "Photo aérienne prise au drone : des barques de pêche le long d'une côte méditerranéenne",
    landSeaIslandAlt: "Photo aérienne prise au drone : un cap rocheux où les vagues se brisent sur le rivage",
    landSeaSeaAlt: "Photo aérienne prise au drone : deux belvédères circulaires en haut d'une falaise, au-dessus des vagues",
    lifeCalendarIntro: "Une vie entière dessinée en une grille de petits carrés, un par semaine. On entre une date de naissance, et les semaines déjà vécues se remplissent, jusqu'à celle qui se passe en ce moment.",
    lifeCalendarOpen: "Ouvrir Life calendar",
    lifeCalendarStory: "L'idée vient de « Your Life in Weeks » de Tim Urban : quatre-vingt-dix lignes de cinquante-deux carrés tiennent sur une seule page, et les voir toutes d'un coup change la façon dont on ressent une semaine. Je voulais ma propre version, à remplir avec les chapitres de ma vie.",
    lifeCalendarHowTitle: "Chapitres et moments",
    lifeCalendarHow: "Les chapitres colorent une suite de carrés : l'école, une ville, un travail, en cours ou terminés depuis longtemps. Les moments entourent un seul carré, pour les dates à retenir. Survoler un carré donne l'âge et les dates, et la grille passe aux mois ou aux années pour une vue plus calme. <br><br> Tout reste dans le navigateur, et le calendrier s'imprime en affiche.",
    lagonIntro: "Une affiche vivante de lumière sur l'eau : des reflets qui ondulent au fond d'une piscine, au rythme de l'heure réelle. Dorés au lever du soleil, bleu vif à midi, roses au crépuscule et presque noirs la nuit.",
    lagonOpen: "Ouvrir Lagon",
    lagonAppAlt: "Lagon à l'heure dorée : des traînées de lumière chaude qui ondulent sur une eau bleu profond",
    lagonStory: "Lagon est fait pour rester ouvert sur un écran ou une tablette qui traîne, comme une fenêtre sur une piscine. Il lit l'heure et rien d'autre : pas de bouton, pas de son, juste l'eau qui change doucement au fil de la journée.",
    lagonDayTitle: "La lumière au fil du jour",
    lagonDay: "La journée est décrite par une douzaine de moments clés, chacun avec sa teinte d'eau, sa couleur de lumière et l'intensité de ses reflets, de la nuit profonde aux deux heures dorées. La page passe de l'un à l'autre minute après minute. <br><br> Le soleil voyage d'est en ouest, et plus il est bas, plus le motif s'étire dans sa direction, comme une vraie lumière rasante sur l'eau.",
    lagonDayAlt: "Quatre tranches de Lagon à différentes heures : matin doré, midi lumineux, crépuscule rose et nuit sombre",
    lagonLookTitle: "Un rendu sérigraphié",
    lagonLook: "Tout est dessiné par un seul shader WebGL. Les reflets sont de fines crêtes dans un bruit déformé, aplaties en quelques tons comme une sérigraphie, avec un léger décalage des couleurs et un peu de grain. Le rendu se fait sous la résolution de l'écran, ce qui garde l'image douce et les téléphones au frais. <br><br> Ajoutez <code>?debug</code> à l'adresse, ou appuyez sur D, pour faire défiler la journée.",
    apneaIntro: "Une application web pour s'entraîner et suivre ses progrès en apnée statique : apnées max avec marqueurs de contractions, tables CO₂ et O₂, exercices de respiration et courbes de progression. Elle s'installe sur un téléphone, fonctionne hors ligne et garde tout sur l'appareil.",
    apneaOpen: "Ouvrir Apnea",
    apneaAppAlt: "Trois écrans d'Apnea : le menu d'entraînement avec le record personnel, une apnée max en cours avec les contractions marquées sur l'anneau, et la courbe de progression",
    apneaStory: "En apnée, l'essentiel de la progression se fait à sec, allongé sur un canapé avec un chronomètre. Le problème, c'est qu'un chronomètre dit seulement combien de temps on a tenu. Il ne dit rien du moment où l'envie de respirer est arrivée, de la façon dont l'apnée s'est passée, ni de ce que le mois d'entraînement a vraiment changé. <br><br> Apnea est d'abord né comme un meilleur chronomètre, puis il est devenu un petit compagnon d'entraînement, pensé pour être utilisé d'une main, les yeux fermés.",
    apneaHoldTitle: "À l'écoute des contractions",
    apneaHold: "Une apnée max se déroule en trois temps : une relaxation guidée, l'apnée elle-même, puis une récupération. Pendant l'apnée, tout le bas de l'écran devient un grand bouton : on le touche à chaque contraction du diaphragme, et chaque appui laisse une marque sur l'anneau. <br><br> Ensuite, l'application distingue la partie calme de l'apnée de la <em>phase de lutte</em>, entre la première contraction et la fin. Au fil des semaines, voir cette première contraction arriver plus tard est souvent un meilleur signe de progrès que le record lui-même.",
    apneaTablesTitle: "Tables, respiration et plongées",
    apneaTables: "Les tables CO₂ gardent la même apnée et raccourcissent la récupération à chaque tour ; les tables O₂ font l'inverse. Toutes deux peuvent être calculées à partir du record personnel, et tout le programme s'affiche avant de commencer. Une partie respiration propose la respiration carrée, le 4-7-8, la cohérence cardiaque ou un rythme personnalisé, avec un anneau animé et des indications vocales. <br><br> Les plongées d'une montre Garmin s'importent directement depuis un fichier <code>.fit</code> ou <code>.csv</code>. J'ai écrit le décodeur FIT de zéro, si bien que l'application n'a toujours aucune dépendance.",
    apneaLogbookAlt: "L'écran de réglage d'une table CO₂ à côté du carnet, avec des apnées, des tables, des séances de respiration et une plongée importée",
    apneaLearnedTitle: "Ce que j'ai appris",
    apneaLearned: "Le plus délicat a été la mesure du temps. Un navigateur ralentit volontiers un onglet en arrière-plan : les minuteurs suivent donc l'horloge réelle plutôt que de compter les images, et l'écran reste allumé pendant une séance. Les signaux sonores et vocaux permettent de s'entraîner les yeux fermés. <br><br> Tout est enregistré dans le navigateur : pas de compte, pas de serveur, pas de suivi. <br><br> <strong>La sécurité d'abord :</strong> cette application est faite pour l'entraînement à sec. Ne retenez jamais votre souffle dans l'eau ou près de l'eau sans un binôme formé qui vous surveille.",
    eduMasterTitle: "Psychologie & neurosciences du mouvement",
    eduMasterText: "Ma formation académique en psychologie, associée à des recherches approfondies sur les systèmes intelligents, a approfondi ma compréhension de la manière dont les processus cognitifs et les expériences incarnées façonnent la conscience humaine. <br><br> Découvrant le monde passionnant de la recherche scientifique, cette approche interdisciplinaire s'est terminée par un mémoire explorant l'intersection de l'intégration sensorielle et de la conscience corporelle, utilisant le célèbre <i>Rubber hand illusion</i>."
  }
};

function translate(lang, root = document) {
  document.documentElement.lang = lang; // screen readers and search engines read this
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

// ------ Theme ------
// Dark by default; the light choice is saved and applied from <head>
// (see the inline script in each page) so it holds before the first paint
const THEME_COLORS = { dark: '#03121a', light: '#e7d7c0' };

function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function setTheme(theme) {
  if (theme === 'light') document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem('theme', theme); } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.dark);
  document.querySelectorAll('site-nav').forEach(nav => nav.updateThemeSwitch?.());
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
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('/assets/css/styles.css?v=20261125f');
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
        <button id="nav-icon" type="button" aria-expanded="false" aria-controls="nav-dropdown" aria-label="Menu">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M0 0 L16 0 L16 16 L16 16 Z" fill="currentColor" />
          </svg>
        </button>
        <div id="nav-dropdown">
          <ul id="nav-list">
            <li style="--i: 0">
              <a href="./index.html#featured" data-section="featured">
                <span data-i18n="navProjects"></span>
              </a>
            </li>
            <li style="--i: 1">
              <a href="./index.html#about" data-section="about">
                <span data-i18n="navAbout"></span>
              </a>
            </li>
          </ul>
          <ul id="nav-settings">
            <li class="language-switch">
              <button type="button" data-lang="fr" lang="fr" aria-label="Français">FR</button>
              <button type="button" data-lang="en" lang="en" aria-label="English">EN</button>
            </li>
            <li class="theme-switch">
              <button id="theme-btn" type="button">
                <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>
                </svg>
                <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>
                </svg>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    `;

    // Add event listeners for switching language and theme
    this.shadowRoot.querySelectorAll('.language-switch button').forEach(button => {
      button.addEventListener('click', () => this.setLanguage(button.dataset.lang));
    });
    this.shadowRoot.getElementById('theme-btn').addEventListener('click', () => {
      setTheme(currentTheme() === 'light' ? 'dark' : 'light');
    });
    this.updateThemeSwitch();

    // Menu: a real button, closed by Escape, a click outside or a link
    const navIcon = this.shadowRoot.getElementById('nav-icon');
    navIcon.addEventListener('click', () => this.toggleMenu());
    this.shadowRoot.querySelectorAll('#nav-list a').forEach(link => {
      link.addEventListener('click', () => this.closeMenu());
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.isMenuOpen()) {
        this.closeMenu();
        navIcon.focus();
      }
    });
    document.addEventListener('click', event => {
      if (this.isMenuOpen() && !event.composedPath().includes(this)) this.closeMenu();
    });

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
    this.updateThemeSwitch();
  }

  toggleLanguage() {
    this.setLanguage(currentLanguage === 'en' ? 'fr' : 'en');
  }

  // Theme button: shows the theme it switches to. The theme is mirrored on
  // #nav because :root[data-theme] can't be matched inside the shadow DOM.
  updateThemeSwitch() {
    const theme = currentTheme();
    this.shadowRoot.getElementById('nav').dataset.theme = theme;
    const label = translations[currentLanguage][theme === 'light' ? 'themeToDark' : 'themeToLight'];
    const button = this.shadowRoot.getElementById('theme-btn');
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
  }

  // ----- Menu -----
  isMenuOpen() {
    return this.shadowRoot.getElementById('nav').classList.contains('open');
  }

  toggleMenu(open = !this.isMenuOpen()) {
    this.shadowRoot.getElementById('nav').classList.toggle('open', open);
    this.shadowRoot.getElementById('nav-icon').setAttribute('aria-expanded', open);
  }

  closeMenu() {
    this.toggleMenu(false);
  }

  // Method to update the page name display
  updatePageNameDisplay() {
    const pageNameContainer = this.shadowRoot.getElementById('page-name-container');
    const currentPage = this.shadowRoot.getElementById('current-page');
    // "Portfolio" next to the logo only on sub-pages, as the way back home
    this.shadowRoot.getElementById('path-home').hidden = !this.currentPageName;
    if (pageNameContainer && currentPage && this.currentPageName) {
      currentPage.textContent = this.currentPageName;
      // a page name that follows the language (e.g. "Expérimentations")
      const key = this.getAttribute('page-name-i18n');
      if (key && translations[currentLanguage][key]) {
        currentPage.setAttribute('data-i18n', key);
        currentPage.innerHTML = translations[currentLanguage][key];
      }
      pageNameContainer.style.display = 'flex';
      pageNameContainer.classList.add('shown');
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
        @import url('/assets/css/styles.css?v=20261125f');
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

/* Project tiles on touch screens
   There is no hover, so the cover swaps from wireframe to screenshot as the tile
   nears the middle of the screen: --reveal goes 0 -> 1 -> 0 while scrolling past,
   and the CSS blends the two images and the zoom from it. */
document.addEventListener('DOMContentLoaded', () => {
  const tiles = document.querySelectorAll('.project-tile');
  if (tiles.length && window.matchMedia('(hover: none)').matches) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let queued = false;

    const update = () => {
      queued = false;
      const half = window.innerHeight / 2;
      tiles.forEach(tile => {
        const cover = tile.querySelector('.project-cover').getBoundingClientRect();
        // 0 when the cover is centred, 1 when its centre reaches the top or bottom edge
        const distance = Math.abs(cover.top + cover.height / 2 - half) / half;
        // Fully revealed near the middle of the screen, back to the wireframe near the edges
        let reveal = 1 - Math.min(1, Math.max(0, (distance - 0.2) / 0.65));
        reveal = reveal * reveal * (3 - 2 * reveal);
        if (reduceMotion) reveal = reveal > 0.5 ? 1 : 0;
        tile.style.setProperty('--reveal', reveal.toFixed(3));
      });
    };
    const queue = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
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

  // About lists: the <details> rows open and close with a short slide and fade
  // (a CSS-only version does not animate in Safari yet)
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.about-list details').forEach(details => {
      const summary = details.querySelector('summary');
      let animation = null;

      summary.addEventListener('click', event => {
        event.preventDefault();
        const opening = !details.open || details.dataset.closing === 'true';
        const from = details.offsetHeight;
        if (animation) animation.cancel();

        details.style.overflow = 'hidden';
        if (opening) {
          delete details.dataset.closing;
          details.open = true;
        } else {
          details.dataset.closing = 'true';
        }
        const to = opening ? details.scrollHeight : summary.offsetHeight;

        animation = details.animate(
          { height: [`${from}px`, `${to}px`] },
          { duration: 320, easing: 'cubic-bezier(.25, .8, .25, 1)' }
        );
        const content = [...details.children].filter(el => el !== summary);
        content.forEach(el => el.animate(
          { opacity: opening ? [0, 1] : [1, 0], transform: opening ? ['translateY(-4px)', 'none'] : ['none', 'translateY(-4px)'] },
          { duration: opening ? 320 : 200, easing: 'ease-out', fill: 'both' }
        ));

        animation.onfinish = () => {
          if (!opening) details.open = false;
          delete details.dataset.closing;
          details.style.overflow = '';
          content.forEach(el => el.getAnimations().forEach(a => a.cancel()));
          animation = null;
        };
      });
    });
  }
});
