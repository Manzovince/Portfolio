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

const terminal = initTerminal({
    form: $('#terminal'),
    input,
    message: $('#message'),
});

initBookmarks({
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
        horizon: $('#view-horizon'),
    },
    onShow: (name) => {
        if (name === 'start') input.focus();
        else horizon.focus();
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

// Typing anywhere goes to the prompt; `/` jumps to the bookmark search. Both
// only apply on the start view — the board has fields of its own.
document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const active = document.activeElement;
    const inField =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;
    if (inField || dialog.open) return;

    // On the board, Escape is the way back to the prompt.
    if (tabs.current() !== 'start') {
        if (event.key === 'Escape') {
            event.preventDefault();
            tabs.show('start');
        }
        return;
    }

    if (event.key === '/') {
        event.preventDefault();
        searchbar.focus();
        return;
    }
    if (event.key.length === 1) input.focus();
});

input.focus();
