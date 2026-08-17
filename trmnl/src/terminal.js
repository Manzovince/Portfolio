//========================
// Terminal
//========================

import { sites, aliases, canonical, lookup, target, directory, FALLBACK } from './commands.js';

const HISTORY_KEY = 'trmnl.history.v1';
const HISTORY_MAX = 50;

// A bare hostname: at least one dot, a plausible TLD, and no whitespace.
const URL_RE = /^(https?:\/\/)?(www\.)?[-\w@:%._+~#=]{1,256}\.[a-z]{2,24}\b([-\w@:%_+.~#?&/=]*)$/i;

export function looksLikeURL(value) {
    return typeof value === 'string' && value !== '' && !/\s/.test(value) && URL_RE.test(value);
}

/** Prepend https:// when no protocol is present. */
export function normalizeURL(url) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Split raw input into a command and its arguments.
 *
 * `;` separates arguments when present (`r; askreddit; top; week`); otherwise
 * the first run of whitespace splits the command from a single argument
 * (`g some search terms`).
 */
export function parse(raw) {
    const input = raw.trim();
    if (input === '') return null;

    // The command is the leading token, ended by whitespace or `;` — either
    // separator works, so `r askreddit; top` and `r; askreddit; top` agree.
    const [, command, tail] = input.match(/^([^\s;]+)\s*;?\s*([\s\S]*)$/);

    let args = [];
    if (tail !== '') {
        args = tail.includes(';') ? tail.split(';').map((p) => p.trim()) : [tail];
    }

    let newTab = false;
    if (args.at(-1) === 'n') {
        newTab = true;
        args.pop();
    }

    return { command: command.toLowerCase(), args, newTab };
}

/**
 * Turn parsed input into an action.
 * @returns {{type:'navigate', url:string, newTab:boolean}
 *          | {type:'help'}
 *          | {type:'action', name:string}
 *          | null}
 */
export function evaluate(raw) {
    const parsed = parse(raw);
    if (!parsed) return null;

    const { command, args, newTab } = parsed;

    if (canonical(command) === 'help') return { type: 'help' };

    const site = lookup(command);
    // Commands that do something to this page rather than leaving it.
    if (site?.action) return { type: 'action', name: site.action };
    if (site) return { type: 'navigate', url: target(site, args), newTab };

    // Not a command: a bare URL goes straight there, anything else is searched.
    if (args.length === 0 && looksLikeURL(command)) {
        return { type: 'navigate', url: normalizeURL(command), newTab };
    }
    return {
        type: 'navigate',
        url: target(sites[FALLBACK], [command, ...args]),
        newTab,
    };
}

//========================
// History
//========================

function loadHistory() {
    try {
        const stored = JSON.parse(localStorage.getItem(HISTORY_KEY));
        return Array.isArray(stored) ? stored.filter((e) => typeof e === 'string') : [];
    } catch {
        return [];
    }
}

function saveHistory(entries) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-HISTORY_MAX)));
    } catch {
        /* storage unavailable or full — history is a nicety, not a feature */
    }
}

//========================
// Wiring
//========================

/**
 * `actions` maps the `action` name of a command to a handler. A handler may
 * return a string to print where the help screen goes; returning nothing
 * leaves the panel alone.
 */
export function initTerminal({ form, input, message, actions = {} }) {
    const history = loadHistory();
    let cursor = history.length;
    let draft = '';

    const clear = () => {
        message.replaceChildren();
        message.hidden = true;
    };

    const show = (node) => {
        message.replaceChildren(node);
        message.hidden = false;
    };

    const go = (url, newTab) => {
        if (newTab) window.open(url, '_blank', 'noopener');
        else window.location.href = url;
    };

    function run({ forceNewTab = false } = {}) {
        const raw = input.value;
        const action = evaluate(raw);
        if (!action) return;

        if (history.at(-1) !== raw.trim()) history.push(raw.trim());
        saveHistory(history);
        cursor = history.length;
        draft = '';
        input.value = '';

        if (action.type === 'help') {
            show(helpScreen());
        } else if (action.type === 'action') {
            const note = actions[action.name]?.();
            if (typeof note === 'string' && note !== '') show(notice(note));
            else clear();
        } else {
            clear();
            go(action.url, action.newTab || forceNewTab);
        }
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        run();
    });

    input.addEventListener('keydown', (event) => {
        // Shift+Enter is the quick equivalent of the trailing `; n` flag.
        if (event.key === 'Enter' && event.shiftKey) {
            event.preventDefault();
            run({ forceNewTab: true });
            return;
        }

        // Tab-complete the command against known commands and aliases.
        if (event.key === 'Tab' && !input.value.includes(';')) {
            const prefix = input.value.trim().toLowerCase();
            if (prefix === '') return;
            const keys = [...Object.keys(sites), ...Object.keys(aliases)];
            const matches = keys.filter((k) => k.startsWith(prefix)).sort();
            if (matches.length > 0) {
                event.preventDefault();
                input.value = matches.length === 1 ? `${matches[0]} ` : commonPrefix(matches);
                if (matches.length > 1) show(chips(matches));
            }
            return;
        }

        if (event.key === 'Escape') {
            input.value = '';
            clear();
            return;
        }

        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        if (history.length === 0) return;
        event.preventDefault();

        if (cursor === history.length) draft = input.value;
        cursor += event.key === 'ArrowUp' ? -1 : 1;
        cursor = Math.max(0, Math.min(history.length, cursor));
        input.value = cursor === history.length ? draft : history[cursor];
        input.setSelectionRange(input.value.length, input.value.length);
    });

    return { clear, showHelp: () => show(helpScreen()) };
}

function commonPrefix(words) {
    let prefix = words[0];
    for (const word of words.slice(1)) {
        while (!word.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    return prefix;
}

function notice(text) {
    const p = document.createElement('p');
    p.className = 'message-notice';
    p.textContent = text;
    return p;
}

function chips(matches) {
    const wrap = document.createElement('div');
    wrap.className = 'message-chips';
    for (const match of matches) {
        const chip = document.createElement('code');
        chip.textContent = match;
        wrap.append(chip);
    }
    return wrap;
}

function helpScreen() {
    const wrap = document.createElement('div');
    wrap.className = 'help';

    const intro = document.createElement('p');
    intro.className = 'help-intro';
    intro.textContent =
        'Type a command, then a query — separated by a space or a “;”. Anything unrecognised is searched on Google. Shift+Enter (or a trailing “; n”) opens in a new tab. ↑/↓ for history, Tab to complete, Esc to clear.';
    wrap.append(intro);

    // Groups flow into columns, so each one stays whole (see .help-section).
    const columns = document.createElement('div');
    columns.className = 'help-sections';

    for (const [group, entries] of directory()) {
        const section = document.createElement('section');
        section.className = 'help-section';

        const heading = document.createElement('h2');
        heading.className = 'help-group';
        heading.textContent = group;

        const table = document.createElement('dl');
        table.className = 'help-grid';

        for (const entry of entries) {
            const dt = document.createElement('dt');
            dt.textContent = [entry.key, ...entry.aliases].join(', ');

            const dd = document.createElement('dd');
            dd.textContent = entry.args ? `${entry.name} · ${entry.args}` : entry.name;

            table.append(dt, dd);
        }
        section.append(heading, table);
        columns.append(section);
    }

    wrap.append(columns);
    return wrap;
}
