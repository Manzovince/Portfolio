//========================
// Default bookmarks
//========================
//
// Seed data only. Once anything is added or removed the list lives in
// localStorage under `trmnl.bookmarks.v1` and this file is no longer read.
// Tags are derived from these entries — there is no separate tag list to
// keep in sync.

export const seedBookmarks = [
    {
        title: 'Figma',
        url: 'https://figma.com',
        tags: ['Design', 'Tool'],
    },
    {
        title: 'YouTube',
        url: 'https://youtube.com',
        tags: ['Video', 'Watch'],
    },
    {
        title: 'Navigo annuel',
        url: 'https://www.iledefrance-mobilites.fr/titres-et-tarifs/detail/forfait-navigo-annuel',
        tags: ['Todo', '💸', 'Transport'],
    },
    {
        title: 'Quanta Magazine',
        url: 'https://www.quantamagazine.org',
        tags: ['Science', 'Journal', 'Mathematics', 'Physics'],
    },
    {
        title: 'XZ/fonts',
        url: 'https://docs.xz.style/fonts',
        tags: ['Tool', 'Design', 'Fonts'],
    },
    {
        title: 'Numbr.dev',
        url: 'https://numbr.dev',
        tags: ['Mathematics', 'Tool'],
    },
];
