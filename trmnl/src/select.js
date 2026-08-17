//========================
// Custom select — a dropdown that also opens on hover
//========================
//
// No browser lets a native <select> be told to open on mouseenter, so the
// column picker is rebuilt here as a button + listbox. Everything else about
// it (keyboard nav, closing on outside click, an accessible name) is just
// reimplementing what the native element gave for free.

const HOVER_OPEN_DELAY = 150;
const HOVER_CLOSE_DELAY = 350;

/**
 * @param {HTMLElement} root  the `.select` wrapper
 * @returns {{ readonly value: string }}
 */
export function initSelect(root) {
    const trigger = root.querySelector('.select-trigger');
    const list = root.querySelector('.select-list');
    const options = [...list.querySelectorAll('[role="option"]')];

    let openTimer = null;
    let closeTimer = null;

    function clearTimers() {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        openTimer = null;
        closeTimer = null;
    }

    function open() {
        clearTimers();
        if (!list.hidden) return;
        list.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
    }

    function close() {
        clearTimers();
        if (list.hidden) return;
        list.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
    }

    function selectOption(option) {
        for (const o of options) {
            const on = o === option;
            o.classList.toggle('is-selected', on);
            o.setAttribute('aria-selected', String(on));
        }
        trigger.textContent = option.textContent;
        // aria-label replaces the button's text for assistive tech, so it has
        // to be kept in sync by hand or the value silently drops out of it.
        trigger.setAttribute('aria-label', `Column: ${option.textContent}`);
    }

    trigger.addEventListener('click', () => (list.hidden ? open() : close()));

    trigger.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
            (options.find((o) => o.classList.contains('is-selected')) ?? options[0]).focus();
        }
    });

    // The delays let a cursor pass over the trigger on its way elsewhere
    // without popping the list open, and let it cross the small gap to the
    // list itself without the list vanishing first.
    root.addEventListener('mouseenter', () => {
        clearTimeout(closeTimer);
        closeTimer = null;
        openTimer = setTimeout(open, HOVER_OPEN_DELAY);
    });

    root.addEventListener('mouseleave', () => {
        clearTimeout(openTimer);
        openTimer = null;
        closeTimer = setTimeout(close, HOVER_CLOSE_DELAY);
    });

    list.addEventListener('click', (event) => {
        const option = event.target.closest('[role="option"]');
        if (!option) return;
        selectOption(option);
        close();
        trigger.focus();
    });

    list.addEventListener('keydown', (event) => {
        const i = options.indexOf(document.activeElement);
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            (options[i + 1] ?? options[0]).focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            (options[i - 1] ?? options[options.length - 1]).focus();
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectOption(document.activeElement);
            close();
            trigger.focus();
        } else if (event.key === 'Escape' || event.key === 'Tab') {
            close();
            if (event.key === 'Escape') trigger.focus();
        }
    });

    document.addEventListener('click', (event) => {
        if (!root.contains(event.target)) close();
    });

    for (const option of options) option.tabIndex = -1;

    return {
        get value() {
            return (options.find((o) => o.classList.contains('is-selected')) ?? options[0]).dataset.value;
        },
    };
}
