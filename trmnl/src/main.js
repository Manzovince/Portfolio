//========================
// trmnl — bootstrap
//========================

import { initClock } from './clock.js';
import { initTerminal } from './terminal.js';
import { initBookmarks } from './bookmarks.js';
import { initHorizon } from './horizon.js';
import { initTabs } from './tabs.js';

const $ = (selector) => document.querySelector(selector);

const input = $('#input');
const searchbar = $('#searchbar');
const dialog = $('#modal-addbookmark');

initClock({ time: $('#time'), date: $('#date') });

const bookmarks = initBookmarks({
    tagList: $('#tag-list'),
    urlList: $('#url-list'),
    searchbar,
    count: $('#bookmark-count'),
    dialog,
    form: $('#form-addbookmark'),
    addButton: $('#btn-add'),
});

const horizon = initHorizon({ root: $('#view-horizon') });

const tabs = initTabs({
    tablist: $('#tabs'),
    views: {
        start: $('#view-start'),
        bookmarks: $('#view-bookmarks'),
        horizon: $('#view-horizon'),
    },
    onShow: (name) => {
        if (name === 'start') input.focus();
        else if (name === 'bookmarks') searchbar.focus();
        else horizon.focus();
    },
});

// Built last: `reset` needs the bookmark list that already exists.
const terminal = initTerminal({
    form: $('#terminal'),
    input,
    message: $('#message'),
    actions: {
        // Wiping a list someone has curated is not undoable, so it asks first.
        reset: () => {
            const stored = bookmarks.count();
            if (!window.confirm(
                `Replace the current ${stored} bookmarks with the defaults? Anything added here is lost.`,
            )) {
                return 'Left alone.';
            }
            return `Restored ${bookmarks.reset()} default bookmarks — “bm” to see them.`;
        },
    },
});

$('#btn-help').addEventListener('click', () => {
    input.focus();
    terminal.showHelp();
});

// Clicking anywhere in the header returns focus to the prompt, but not when
// the click was a text selection or landed on a control of its own.
$('#header').addEventListener('click', (event) => {
    if (event.target.closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    input.focus();
});

// Typing goes to whichever field the current view is built around: the prompt
// on start, the filter on bookmarks. The board has fields of its own, so it
// only answers to Escape.
document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const active = document.activeElement;
    const inField =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;
    if (inField || dialog.open) return;

    const view = tabs.current();

    // Away from start, Escape is the way back to the prompt.
    if (view !== 'start') {
        if (event.key === 'Escape') {
            event.preventDefault();
            tabs.show('start');
            return;
        }
        if (view === 'bookmarks' && event.key.length === 1) searchbar.focus();
        return;
    }

    // `/` still reaches the bookmark filter - it now opens that view first.
    if (event.key === '/') {
        event.preventDefault();
        tabs.show('bookmarks');
        return;
    }
    if (event.key.length === 1) input.focus();
});

input.focus();
