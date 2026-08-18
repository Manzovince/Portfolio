//========================
// Bookmarks
//========================

import { load, save, reset, tagsOf, hostOf, withProtocol } from './store.js';

/**
 * A bookmark matches when it carries at least one selected tag (or nothing is
 * selected) AND its title, host or tags contain the search query. Selected tags
 * union rather than intersect, so combining two of them widens the list.
 */
export function matches(bookmark, { query, selected }) {
    if (selected.size > 0 && !bookmark.tags.some((tag) => selected.has(tag))) {
        return false;
    }
    if (query === '') return true;

    const haystack = [bookmark.title, hostOf(bookmark.url) ?? bookmark.url, ...bookmark.tags]
        .join(' ')
        .toLowerCase();
    return haystack.includes(query);
}

export function initBookmarks({ tagList, urlList, searchbar, dialog, form, addButton }) {
    let bookmarks = load();
    const state = { query: '', selected: new Set() };

    //--- Rendering ---

    /**
     * A plain click filters by that tag alone; holding a modifier combines it
     * with what is already selected. Clicking the only selected tag clears the
     * filter, which is what makes the exclusive mode escapable without a
     * separate "all" chip.
     */
    function toggleTag(tag, { additive }) {
        const wasOnlySelection = state.selected.size === 1 && state.selected.has(tag);

        if (additive) {
            if (state.selected.has(tag)) state.selected.delete(tag);
            else state.selected.add(tag);
        } else if (wasOnlySelection) {
            state.selected.clear();
        } else {
            state.selected.clear();
            state.selected.add(tag);
        }

        syncTags();
        renderList();
    }

    // The chips are rebuilt only when the bookmarks change. Selecting one just
    // syncs the checkboxes in place, so keyboard focus survives a click.
    const tagInputs = new Map();

    function syncTags() {
        for (const [tag, input] of tagInputs) input.checked = state.selected.has(tag);
    }

    function renderTags() {
        tagInputs.clear();
        const nodes = tagsOf(bookmarks).map(({ tag, count: n }) => {
            const li = document.createElement('li');
            li.className = 'tag';

            const label = document.createElement('label');
            label.title = `Show ${tag} — hold ⌘/Ctrl to combine tags`;

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'tag-input';
            input.checked = state.selected.has(tag);
            // `click` rather than `change`: it carries the modifier keys, and it
            // fires for Space on a focused checkbox too.
            input.addEventListener('click', (event) => {
                toggleTag(tag, { additive: event.metaKey || event.ctrlKey || event.shiftKey });
            });
            tagInputs.set(tag, input);

            const span = document.createElement('span');
            span.append(tag);

            const badge = document.createElement('em');
            badge.textContent = n;
            span.append(badge);

            label.append(input, span);
            li.append(label);
            return li;
        });
        tagList.replaceChildren(...nodes);

        // Deleting the last bookmark carrying a tag would otherwise leave it
        // selected but with no chip left to switch it back off.
        const live = new Set(tagInputs.keys());
        for (const tag of state.selected) {
            if (!live.has(tag)) state.selected.delete(tag);
        }
    }

    function renderList() {
        const visible = bookmarks.filter((bookmark) => matches(bookmark, state));

        if (visible.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'url-empty';
            empty.textContent = bookmarks.length === 0
                ? 'No bookmarks yet — add one with +'
                : 'Nothing matches that filter.';
            urlList.replaceChildren(empty);
        } else {
            urlList.replaceChildren(...visible.map(row));
        }
    }

    function row(bookmark) {
        const li = document.createElement('li');
        li.className = 'url-item';

        const link = document.createElement('a');
        link.className = 'url';
        link.href = bookmark.url;
        link.rel = 'noopener noreferrer';
        link.append(favicon(bookmark), bookmark.title);

        const host = document.createElement('span');
        host.className = 'url-host';
        host.textContent = hostOf(bookmark.url) ?? '';
        link.append(host);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'url-delete';
        remove.textContent = '×';
        remove.title = `Remove ${bookmark.title}`;
        remove.setAttribute('aria-label', `Remove ${bookmark.title}`);
        remove.addEventListener('click', () => {
            bookmarks = bookmarks.filter((b) => b !== bookmark);
            persist();
        });

        li.append(link, remove);
        return li;
    }

    /**
     * Favicons are fetched from each site's own origin rather than a favicon
     * service, so browsing habits are not handed to a third party. Sites
     * without a root favicon.ico fall back to an initial-letter tile.
     */
    function favicon(bookmark) {
        const host = hostOf(bookmark.url);
        const letter = document.createElement('span');
        letter.className = 'url-favicon url-favicon-fallback';
        letter.setAttribute('aria-hidden', 'true');
        letter.textContent = (bookmark.title[0] ?? '?').toUpperCase();
        if (!host) return letter;

        const img = document.createElement('img');
        img.className = 'url-favicon';
        img.alt = '';
        img.loading = 'lazy';
        img.width = 16;
        img.height = 16;
        img.src = `${new URL(bookmark.url).origin}/favicon.ico`;
        img.addEventListener('error', () => img.replaceWith(letter), { once: true });
        return img;
    }

    function persist() {
        save(bookmarks);
        renderTags();
        renderList();
    }

    //--- Search ---

    searchbar.addEventListener('input', () => {
        state.query = searchbar.value.trim().toLowerCase();
        renderList();
    });

    searchbar.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        searchbar.value = '';
        state.query = '';
        renderList();
    });

    //--- Add dialog ---

    addButton.addEventListener('click', () => {
        form.reset();
        form.elements.url.setCustomValidity('');
        dialog.showModal();
        form.elements.url.focus();
    });

    dialog.addEventListener('close', () => form.reset());

    // Clicking the backdrop (outside the dialog's own box) dismisses it.
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });

    form.addEventListener('submit', (event) => {
        if (event.submitter?.value === 'cancel') return;
        event.preventDefault();

        const url = withProtocol(form.elements.url.value);
        if (!hostOf(url)) {
            form.elements.url.setCustomValidity('That does not look like a URL.');
            form.elements.url.reportValidity();
            return;
        }

        bookmarks = [
            ...bookmarks,
            {
                title: form.elements.title.value.trim() || hostOf(url),
                url,
                tags: form.elements.tags.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean),
            },
        ];
        persist();
        dialog.close();
    });

    form.elements.url.addEventListener('input', () => form.elements.url.setCustomValidity(''));

    renderTags();
    renderList();

    return {
        /** How many bookmarks are stored, filter ignored. */
        count: () => bookmarks.length,

        /**
         * Restore the seed list, dropping anything stored locally. The filter
         * is cleared too — landing on the defaults behind a stale search would
         * look like the reset had failed.
         * @returns {number} how many bookmarks the seed put back.
         */
        reset() {
            bookmarks = reset();
            state.selected.clear();
            state.query = '';
            searchbar.value = '';
            renderTags();
            renderList();
            return bookmarks.length;
        },
    };
}
