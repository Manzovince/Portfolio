//========================
// Commands
//========================
//
// Each command is data, not a closure. A site is resolved against its args by
// `target()` below, which picks a strategy in this order:
//
//   routes  ->  fixed sub-pages, keyed by the first arg   (hn new -> /newest)
//   path    ->  args become URL path segments             (gh user/repo)
//   query   ->  args become a search string               (g some words)
//   run     ->  full custom control, returns a URL
//
// A command with none of those is "go only": it always opens its base url.
// `group` only decides where the command lands on the help screen.
//
// A command carrying `action` instead of `url` does not navigate at all: the
// name is handed to the page, which runs whatever it has registered under it.

export const sites = {
    //--- This page ---
    hz: { group: 'Page', name: 'Horizon board', url: '#horizon' },
    bm: { group: 'Page', name: 'Bookmarks', url: '#bookmarks' },
    reset: { group: 'Page', name: 'Restore the default bookmarks', action: 'reset' },

    //--- Search ---
    g: { group: 'Search', name: 'Google', url: 'https://google.com', query: '/search?q=' },
    dg: { group: 'Search', name: 'DuckDuckGo', url: 'https://duckduckgo.com', query: '/?q=' },
    qw: { group: 'Search', name: 'Qwant', url: 'https://www.qwant.com', query: '/?l=fr&q=' },
    bra: { group: 'Search', name: 'Brave Search', url: 'https://search.brave.com', query: '/search?q=' },
    img: { group: 'Search', name: 'Google Images', url: 'https://google.com', query: '/search?tbm=isch&q=' },
    map: { group: 'Search', name: 'Google Maps', url: 'https://google.com/maps', query: '/search/' },
    sch: { group: 'Search', name: 'Google Scholar', url: 'https://scholar.google.com', query: '/scholar?q=' },
    wb: {
        group: 'Search',
        name: 'Wayback Machine',
        url: 'https://web.archive.org',
        args: 'url',
        run: (url, [target]) => (target ? `${url}/web/2/${target}` : url),
    },

    //--- AI ---
    c: { group: 'AI', name: 'Claude', url: 'https://claude.ai', query: '/new?q=' },
    cgpt: { group: 'AI', name: 'ChatGPT', url: 'https://chatgpt.com', query: '/?q=' },
    pplx: { group: 'AI', name: 'Perplexity', url: 'https://www.perplexity.ai', query: '/search?q=' },

    //--- Reference ---
    w: { group: 'Reference', name: 'Wikipedia', url: 'https://en.wikipedia.org', query: '/w/index.php?search=' },
    wikt: { group: 'Reference', name: 'Wiktionary', url: 'https://en.wiktionary.org', query: '/w/index.php?search=' },
    dict: { group: 'Reference', name: 'Dictionary', url: 'https://dictionary.com', query: '/browse/' },
    thes: { group: 'Reference', name: 'Thesaurus', url: 'https://thesaurus.com', query: '/browse/' },
    wr: { group: 'Reference', name: 'WordReference FR↔EN', url: 'https://www.wordreference.com', query: '/fren/' },
    tr: { group: 'Reference', name: 'Google Translate', url: 'https://translate.google.com', query: '/?sl=auto&tl=fr&text=' },
    wa: { group: 'Reference', name: 'Wolfram Alpha', url: 'https://www.wolframalpha.com', query: '/input?i=' },
    arx: { group: 'Reference', name: 'arXiv', url: 'https://arxiv.org', query: '/search/?searchtype=all&query=' },
    doi: { group: 'Reference', name: 'DOI resolver', url: 'https://doi.org', path: '/' },

    //--- Code ---
    gh: { group: 'Code', name: 'GitHub', url: 'https://github.com', path: '/' },
    gist: { group: 'Code', name: 'GitHub Gist', url: 'https://gist.github.com', path: '/' },
    so: { group: 'Code', name: 'Stack Overflow', url: 'https://stackoverflow.com', query: '/search?q=' },
    mdn: { group: 'Code', name: 'MDN web docs', url: 'https://developer.mozilla.org', query: '/search?q=' },
    dd: { group: 'Code', name: 'DevDocs', url: 'https://devdocs.io', query: '/#q=' },
    npm: { group: 'Code', name: 'npm', url: 'https://www.npmjs.com', query: '/search?q=' },
    pypi: { group: 'Code', name: 'PyPI', url: 'https://pypi.org', query: '/search/?q=' },
    crates: { group: 'Code', name: 'crates.io', url: 'https://crates.io', query: '/search?q=' },
    ciu: { group: 'Code', name: 'Can I Use', url: 'https://caniuse.com', query: '/?search=' },
    re: { group: 'Code', name: 'regex101', url: 'https://regex101.com' },
    lh: {
        group: 'Code',
        name: 'localhost',
        url: 'http://localhost',
        args: 'port — defaults to 3000',
        run: (url, [port = '3000', ...rest]) => {
            const base = /^\d{1,5}$/.test(port) ? `${url}:${port}` : `${url}:3000`;
            return rest.length > 0 ? `${base}/${rest.join('/')}` : base;
        },
    },

    //--- Design ---
    f: { group: 'Design', name: 'Figma', url: 'https://www.figma.com/files/recent' },
    dr: { group: 'Design', name: 'Dribbble', url: 'https://dribbble.com', query: '/search/' },
    be: { group: 'Design', name: 'Behance', url: 'https://www.behance.net', query: '/search/projects?search=' },
    gf: { group: 'Design', name: 'Google Fonts', url: 'https://fonts.google.com', query: '/?query=' },
    ico: { group: 'Design', name: 'Lucide icons', url: 'https://lucide.dev', query: '/icons/?search=' },
    co: { group: 'Design', name: 'Coolors', url: 'https://coolors.co/generate' },
    us: { group: 'Design', name: 'Unsplash', url: 'https://unsplash.com', query: '/s/photos/' },

    //--- Media ---
    y: {
        group: 'Media',
        name: 'YouTube',
        url: 'https://youtube.com',
        query: '/results?search_query=',
        routes: { subs: '/feed/subscriptions', s: '/feed/subscriptions' },
    },
    n: { group: 'Media', name: 'Netflix', url: 'https://netflix.com', query: '/search?q=' },
    imdb: { group: 'Media', name: 'IMDb', url: 'https://www.imdb.com', query: '/find/?q=' },
    lb: { group: 'Media', name: 'Letterboxd', url: 'https://letterboxd.com', query: '/search/' },
    spo: { group: 'Media', name: 'Spotify', url: 'https://open.spotify.com', query: '/search/' },
    sc: { group: 'Media', name: 'SoundCloud', url: 'https://soundcloud.com', query: '/search?q=' },
    bc: { group: 'Media', name: 'Bandcamp', url: 'https://bandcamp.com', query: '/search?q=' },
    tv: { group: 'Media', name: 'Twitch', url: 'https://www.twitch.tv', query: '/search?term=' },

    //--- Social ---
    r: {
        group: 'Social',
        name: 'Reddit',
        url: 'https://reddit.com',
        args: 'sub; sort; range',
        // r; askreddit; top; week
        run: (url, [sub, sort, range]) => {
            const sorts = ['hot', 'new', 'rising', 'controversial', 'top', 'gilded', 'wiki', 'promoted'];
            const ranges = ['day', 'week', 'month', 'year', 'all'];
            if (!sub) return url;

            let dest = `${url}/r/${encodeURIComponent(sub)}`;
            if (sort && sorts.includes(sort)) dest += `/${sort}`;
            if (range && ranges.includes(range) && ['top', 'controversial'].includes(sort)) {
                dest += `?t=${range}`;
            }
            return dest;
        },
    },
    hn: {
        group: 'Social',
        name: 'Hacker News',
        url: 'https://news.ycombinator.com',
        routes: {
            new: '/newest',
            comments: '/newcomments',
            show: '/show',
            ask: '/ask',
            jobs: '/jobs',
            submit: '/submit',
        },
    },
    t: { group: 'Social', name: 'X (Twitter)', url: 'https://x.com', query: '/search?q=' },
    li: { group: 'Social', name: 'LinkedIn', url: 'https://www.linkedin.com', query: '/search/results/all/?keywords=' },
    m: { group: 'Social', name: 'Messenger', url: 'https://www.messenger.com' },

    //--- Google ---
    mail: { group: 'Google', name: 'Gmail', url: 'https://mail.google.com', query: '/mail/u/0/#search/' },
    gc: { group: 'Google', name: 'Google Calendar', url: 'https://calendar.google.com' },
    gd: { group: 'Google', name: 'Google Drive', url: 'https://drive.google.com', query: '/drive/search?q=' },
    k: { group: 'Google', name: 'Google Keep', url: 'https://keep.google.com' },
    meet: { group: 'Google', name: 'Google Meet', url: 'https://meet.google.com' },
    gdoc: { group: 'Google', name: 'Google Docs', url: 'https://docs.google.com/document/u/0/' },
    gsh: { group: 'Google', name: 'Google Sheets', url: 'https://docs.google.com/spreadsheets/u/0/' },

    //--- Life ---
    a: { group: 'Life', name: 'Amazon', url: 'https://amazon.fr', query: '/s/?field-keywords=' },
    lbc: { group: 'Life', name: 'Leboncoin', url: 'https://www.leboncoin.fr', query: '/recherche?text=' },
    idf: { group: 'Life', name: 'Île-de-France Mobilités', url: 'https://www.iledefrance-mobilites.fr' },
    cm: { group: 'Life', name: 'Citymapper Paris', url: 'https://citymapper.com/paris' },
    lm: { group: 'Life', name: 'Le Monde', url: 'https://www.lemonde.fr', query: '/recherche/?search_keywords=' },
};

/** Order the help screen prints its sections in. */
export const groupOrder = ['Page', 'Search', 'AI', 'Reference', 'Code', 'Design', 'Media', 'Social', 'Google', 'Life'];

export const aliases = {
    cal: 'gc',
    gk: 'k',
    gm: 'map',
    gmail: 'mail',
    git: 'gh',
    ddg: 'dg',
    x: 't',
    claude: 'c',
    gpt: 'cgpt',
    yt: 'y',
    wiki: 'w',
    '?': 'help',
    h: 'help',
    horizon: 'hz',
    board: 'hz',
};

/** The command run when the input matches nothing else. */
export const FALLBACK = 'g';

/** Resolve an alias to its underlying command key. */
export function canonical(key) {
    return Object.hasOwn(aliases, key) ? aliases[key] : key;
}

export function lookup(key) {
    const resolved = canonical(key);
    return Object.hasOwn(sites, resolved) ? sites[resolved] : null;
}

/** Build the destination URL for a site given its parsed arguments. */
export function target(site, args = []) {
    const rest = args.filter((a) => a !== '');

    if (site.run) return site.run(site.url, rest);
    if (rest.length === 0) return site.url;

    if (site.routes && Object.hasOwn(site.routes, rest[0])) {
        return site.url + site.routes[rest[0]];
    }
    if (site.path) {
        // `gh user/repo` is one arg holding a path — keep its slashes as separators.
        const segments = rest
            .flatMap((arg) => arg.split('/'))
            .filter(Boolean)
            .map(encodeURIComponent);
        return site.url + site.path + segments.join('/');
    }
    if (site.query) {
        return site.url + site.query + encodeURIComponent(rest.join(' '));
    }
    return site.url;
}

/** Commands grouped for the help screen, with aliases folded in. */
export function directory() {
    const aliasesFor = new Map();
    for (const [alias, cmd] of Object.entries(aliases)) {
        if (!aliasesFor.has(cmd)) aliasesFor.set(cmd, []);
        aliasesFor.get(cmd).push(alias);
    }

    const groups = new Map(groupOrder.map((name) => [name, []]));
    for (const [key, site] of Object.entries(sites)) {
        const group = site.group ?? 'Other';
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push({
            key,
            name: site.name,
            aliases: aliasesFor.get(key) ?? [],
            args: site.args ?? (site.routes ? Object.keys(site.routes).join(' | ') : site.query ? 'query' : site.path ? 'path' : ''),
        });
    }

    return [...groups].filter(([, entries]) => entries.length > 0);
}
