//========================
// View tabs — start / bookmarks / horizon
//========================
//
// Three top-level views share the page. The active one is reflected in the URL
// hash so a view can be bookmarked, and remembered in localStorage so the page
// reopens where it was left. Only a hash naming a known view switches anything,
// which is also what makes the `bm` and `hz` terminal commands work.

const KEY = 'trmnl.view.v1';
const DEFAULT_VIEW = 'start';

export function initTabs({ tablist, views, onShow }) {
    const names = Object.keys(views);
    const tabs = [...tablist.querySelectorAll('.tab')];

    const isView = (name) => names.includes(name);

    function show(name, { updateHash = true } = {}) {
        if (!isView(name)) name = DEFAULT_VIEW;

        for (const [view, element] of Object.entries(views)) {
            element.hidden = view !== name;
        }
        for (const tab of tabs) {
            tab.setAttribute('aria-selected', String(tab.dataset.view === name));
        }
        document.body.dataset.view = name;

        try {
            localStorage.setItem(KEY, name);
        } catch {
            /* remembering the view is a nicety, not a feature */
        }

        if (updateHash) {
            // replaceState keeps the back button meaningful for real navigation.
            const hash = name === DEFAULT_VIEW ? '' : `#${name}`;
            history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
        }

        onShow?.(name);
    }

    for (const tab of tabs) {
        tab.addEventListener('click', () => show(tab.dataset.view));
    }

    function cycle(delta) {
        const index = names.indexOf(document.body.dataset.view);
        show(names[(index + delta + names.length) % names.length]);
    }

    window.addEventListener('hashchange', () => {
        const name = location.hash.slice(1);
        if (isView(name)) show(name, { updateHash: false });
    });

    const fromHash = location.hash.slice(1);
    let stored = null;
    try {
        stored = localStorage.getItem(KEY);
    } catch {
        /* private mode — fall through to the default */
    }

    const initial = isView(fromHash) ? fromHash : (isView(stored) ? stored : DEFAULT_VIEW);
    show(initial, { updateHash: isView(fromHash) === false });

    return { show, current: () => document.body.dataset.view, cycle };
}
