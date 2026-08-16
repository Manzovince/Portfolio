//========================
// Bookmark storage
//========================

import { seedBookmarks } from './seed.js';

const KEY = 'trmnl.bookmarks.v1';

function isBookmark(value) {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof value.url === 'string' &&
        value.url !== ''
    );
}

function sanitize(entry) {
    return {
        title: typeof entry.title === 'string' && entry.title.trim() !== ''
            ? entry.title.trim()
            : hostOf(entry.url) ?? entry.url,
        url: entry.url.trim(),
        tags: Array.isArray(entry.tags)
            ? [...new Set(entry.tags.map((t) => String(t).trim()).filter(Boolean))]
            : [],
    };
}

/** Hostname without `www.`, or null if the URL cannot be parsed. */
export function hostOf(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

/** Prepend https:// when no protocol is present. */
export function withProtocol(url) {
    const trimmed = url.trim();
    return /^[a-z][\w+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function load() {
    let stored;
    try {
        stored = JSON.parse(localStorage.getItem(KEY));
    } catch {
        stored = null;
    }
    if (!Array.isArray(stored)) return seedBookmarks.map(sanitize);
    return stored.filter(isBookmark).map(sanitize);
}

export function save(bookmarks) {
    try {
        localStorage.setItem(KEY, JSON.stringify(bookmarks));
        return true;
    } catch {
        return false;
    }
}

export function reset() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* nothing to clear */
    }
    return seedBookmarks.map(sanitize);
}

/** Every tag in use, with its count, most-used first. */
export function tagsOf(bookmarks) {
    const counts = new Map();
    for (const bookmark of bookmarks) {
        for (const tag of bookmark.tags) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([tag, count]) => ({ tag, count }));
}
