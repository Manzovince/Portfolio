//========================
// Default bookmarks
//========================
//
// Seed data only. Once anything is added or removed the list lives in
// localStorage under `trmnl.bookmarks.v1` and this file is no longer read —
// the `reset` command is the way back here.
//
// Tags are derived from these entries; there is no separate tag list to keep
// in sync. The vocabulary is kept small on purpose — every tag below groups at
// least two entries, and a tag that stops earning its place should be spent
// rather than kept:
//
//   Tool       something you operate
//   Design     visual craft
//   Code       writing or shipping software
//   Reference  looked up, not read through
//   Read       read through, not looked up
//   Science    the subject matter, whatever the format
//   Media      video, audio, images
//
// Reference and Read deliberately split on *how* a site is used rather than
// what is on it, which is why Wikipedia carries both.

export const seedBookmarks = [
    //--- Tools ---
    {
        title: 'Figma',
        url: 'https://figma.com',
        tags: ['Design', 'Tool'],
    },
    {
        title: 'XZ/fonts',
        url: 'https://docs.xz.style/fonts',
        tags: ['Design', 'Tool'],
    },
    {
        title: 'Numbr.dev',
        url: 'https://numbr.dev',
        tags: ['Tool'],
    },
    {
        title: 'Wolfram Alpha',
        url: 'https://www.wolframalpha.com',
        tags: ['Tool', 'Science'],
    },

    //--- Code & reference ---
    {
        title: 'GitHub',
        url: 'https://github.com',
        tags: ['Code', 'Tool'],
    },
    {
        title: 'MDN Web Docs',
        url: 'https://developer.mozilla.org',
        tags: ['Code', 'Reference'],
    },
    {
        title: 'Stack Overflow',
        url: 'https://stackoverflow.com',
        tags: ['Code', 'Reference'],
    },
    {
        title: 'Can I Use',
        url: 'https://caniuse.com',
        tags: ['Code', 'Reference'],
    },
    {
        title: 'Hacker News',
        url: 'https://news.ycombinator.com',
        tags: ['Code', 'Read'],
    },
    {
        title: 'Wikipedia',
        url: 'https://en.wikipedia.org',
        tags: ['Reference', 'Read'],
    },
    {
        title: 'Internet Archive',
        url: 'https://archive.org',
        tags: ['Reference', 'Media'],
    },

    //--- Science ---
    {
        title: 'Quanta Magazine',
        url: 'https://www.quantamagazine.org',
        tags: ['Science', 'Read'],
    },
    {
        title: 'arXiv',
        url: 'https://arxiv.org',
        tags: ['Science', 'Reference'],
    },
    {
        title: 'Nature',
        url: 'https://www.nature.com',
        tags: ['Science', 'Read'],
    },
    {
        title: 'NASA',
        url: 'https://www.nasa.gov',
        tags: ['Science', 'Media'],
    },
    {
        title: 'Our World in Data',
        url: 'https://ourworldindata.org',
        tags: ['Science', 'Reference'],
    },

    //--- Media ---
    {
        title: 'YouTube',
        url: 'https://youtube.com',
        tags: ['Media'],
    },
    {
        title: 'Spotify',
        url: 'https://open.spotify.com',
        tags: ['Media'],
    },
    {
        title: 'Netflix',
        url: 'https://netflix.com',
        tags: ['Media'],
    },
    {
        title: 'Twitch',
        url: 'https://www.twitch.tv',
        tags: ['Media'],
    },
];
