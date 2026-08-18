//========================
// Horizon — a task board bucketed by time horizon
//========================
//
// Tasks are markdown documents: the `# heading` is the title shown in the
// list, everything after it is the note body. Storage is localStorage under
// `horizon-tasks`; the key and shape are unchanged from the standalone app,
// so an existing board carries over.

import * as llm from './llm.js';
import { initSelect } from './select.js';

const STORAGE_KEY = 'horizon-tasks';
const AI_KEY_STORAGE = 'horizon-ai-key';
const AI_MODEL = 'claude-haiku-4-5-20251001';

const COLUMNS = ['today', 'week', 'month', 'year', 'someday'];

/**
 * Month and day names in the reader's own locale, so a French browser plans
 * in "Août" rather than "August". Built from fixed reference dates: 2000 was
 * a leap year starting on a Saturday, so every month and weekday is reachable.
 */
function localeNames(options, dates) {
    const format = new Intl.DateTimeFormat(undefined, options).format;
    // Locales that lowercase these (French, Spanish…) still want a capital
    // here, since each name opens a line of its own.
    return dates.map((d) => {
        const name = format(d);
        return name.charAt(0).toUpperCase() + name.slice(1);
    });
}

const MONTHS = localeNames(
    { month: 'long' },
    Array.from({ length: 12 }, (_, m) => new Date(2000, m, 1))
);

// 3 January 2000 was a Monday.
const DAYS = localeNames(
    { weekday: 'long' },
    Array.from({ length: 7 }, (_, d) => new Date(2000, 0, 3 + d))
);

//========================
// Storage
//========================

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        // Pre-markdown tasks stored `text` + `notes` instead of `content`.
        return parsed.map((t) =>
            'content' in t
                ? t
                : {
                    id: t.id,
                    column: t.column,
                    done: t.done,
                    content: `# ${t.text ?? ''}` + (t.notes ? `\n\n${t.notes}` : ''),
                }
        );
    } catch {
        return [];
    }
}

function saveTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
        /* storage unavailable or full — the board still works for this session */
    }
}

//========================
// Dates
//========================

const pad2 = (n) => String(n).padStart(2, '0');

const formatDateYMD = (date) =>
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;

const formatDateISO = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/** The short code stamped into a new task's metadata, e.g. `D20260816`. */
function getHorizonLine(column, date) {
    switch (column) {
        case 'today': return `D${formatDateYMD(date)}`;
        case 'week': return `W${pad2(getISOWeek(date))}`;
        case 'month': return `M${pad2(date.getMonth() + 1)}`;
        case 'year': return `Y${date.getFullYear()}`;
        default: return 'S';
    }
}

/** Dragging a task to another column stamps its `horizon:` line for the column it lands in. */
function updateHorizonMeta(content, column) {
    if (!/^horizon: /m.test(content)) return content;
    return content.replace(/^horizon: .*/m, `horizon: ${getHorizonLine(column, new Date())}`);
}

//========================
// Markdown
//========================

function extractTitle(content) {
    const match = (content || '').match(/^#[ \t]+(.+)$/m);
    if (match) return match[1].trim();
    const firstLine = (content || '').split('\n').find((l) => l.trim().length > 0);
    return firstLine ? firstLine.trim() : 'Untitled';
}

function extractBody(content) {
    const match = (content || '').match(/^#[ \t]+.*\r?\n?/);
    if (!match) return content || '';
    return content.slice(match[0].length).replace(/^\r?\n/, '');
}

const escapeHtml = (str) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderMarkdown(text) {
    if (!text.trim()) return '';
    // Each checklist mark carries the body-relative line it came from
    // (data-line), so a click can be mapped back to that exact line in the
    // stored markdown without touching the editor. Handled per-line, and
    // before the emphasis rules below, which would otherwise read a leading
    // `*` as the start of italics.
    return text
        .split(/\r?\n/)
        .map((line, i) => escapeHtml(line)
            .replace(/^[-*] \[[xX]\]\s*/, `<span class="md-check is-done" data-line="${i}" role="checkbox" aria-checked="true" tabindex="0">☑</span> `)
            .replace(/^[-*] \[ ?\]\s*/, `<span class="md-check" data-line="${i}" role="checkbox" aria-checked="false" tabindex="0">☐</span> `)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'))
        .join('<br>');
}

/**
 * A checklist mark's `data-line` is an index into the *body* (the content
 * with its `# Title` line and the blank line after it stripped away — see
 * `extractBody`). This maps that index back to a line in the full stored
 * `content` so a click can flip `[ ]`/`[x]` in place.
 */
function bodyLineToContentLine(content, bodyLine) {
    const lines = content.split(/\r?\n/);
    const offset = lines.length > 1 && lines[1] === '' ? 2 : 1;
    return offset + bodyLine;
}

/** How many checklist lines a task's note body has, and how many are ticked. */
function getChecklistStats(content) {
    const marks = extractBody(content).match(/^[-*] \[[ xX]?\]/gm) || [];
    return { total: marks.length, done: marks.filter((m) => /\[[xX]\]/.test(m)).length };
}

//========================
// Icons
//========================

function icon(id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${id}`);
    svg.append(use);
    return svg;
}

/** A tiny conic-gradient pie standing in for the done checkbox on non-today columns. */
function createChecklistPie(done, total) {
    const pct = Math.round((done / total) * 100);
    const pie = document.createElement('div');
    pie.className = 'task-pie';
    pie.style.setProperty('--pct', pct);
    pie.setAttribute('role', 'img');
    pie.setAttribute('aria-label', `${done} of ${total} done (${pct}%)`);

    const label = document.createElement('b');
    label.className = 'task-pie-pct';
    label.textContent = pct;
    label.setAttribute('aria-hidden', 'true');
    pie.append(label);

    return pie;
}

//========================
// Wiring
//========================

export function initHorizon({ root }) {
    const $ = (selector) => root.querySelector(selector);

    const form = $('#task-form');
    const input = $('#task-input');
    const columnSelect = initSelect($('#task-column'));
    const aiToggle = $('#ai-toggle');
    const aiStatus = $('#ai-status');
    const board = $('.board');

    let tasks = loadTasks();
    let aiEnabled = false;

    const expandedIds = new Set();
    const editingIds = new Set();
    let draggingId = null;

    //========================
    // Rendering
    //========================

    function createTaskElement(task) {
        const li = document.createElement('li');
        li.className = 'task' + (task.done ? ' done' : '');
        li.dataset.id = task.id;
        // The card itself is the drag handle; interactive children opt back
        // out below so a click on them can't be mistaken for a drag start.
        li.draggable = true;

        const row = document.createElement('div');
        row.className = 'task-row';

        const label = document.createElement('span');
        label.textContent = extractTitle(task.content);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-icon delete-btn';
        deleteBtn.draggable = false;
        deleteBtn.setAttribute('aria-label', 'Delete task');
        deleteBtn.append(icon('i-close'));

        // A note with its own checklist tracks completion by that checklist,
        // so it gets the progress pie — unless every item is already ticked,
        // in which case a filled pie is just a checkmark wearing a costume.
        // Without a checklist at all, the task is done or not as a whole, so
        // it gets the plain checkbox — in every column.
        const { total, done } = getChecklistStats(task.content);
        if (total > 0 && done < total) {
            const pie = createChecklistPie(done, total);
            pie.draggable = false;
            row.append(pie);
        } else {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.draggable = false;
            checkbox.checked = total > 0 ? true : task.done;
            if (total > 0) {
                checkbox.disabled = true;
                checkbox.setAttribute('aria-label', `All ${total} done`);
            } else {
                checkbox.setAttribute('aria-label', 'Mark as done');
            }
            row.append(checkbox);
        }

        row.append(label, deleteBtn);
        li.append(row);

        if (expandedIds.has(task.id)) {
            const details = document.createElement('div');
            details.className = 'task-details';

            if (editingIds.has(task.id)) {
                const textarea = document.createElement('textarea');
                textarea.className = 'task-notes';
                textarea.draggable = false;
                textarea.placeholder = '# Title\n\nDetails (markdown)…';
                textarea.value = task.content || '';
                details.append(textarea);
            } else {
                const body = extractBody(task.content);
                const hasBody = body.trim().length > 0;
                const preview = document.createElement('div');
                preview.className = 'task-preview' + (hasBody ? '' : ' empty');
                preview.draggable = false;
                if (hasBody) preview.innerHTML = renderMarkdown(body);
                else preview.textContent = 'Add a note…';
                details.append(preview);

                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'edit-btn';
                editBtn.draggable = false;
                editBtn.textContent = 'Edit';
                details.append(editBtn);
            }

            li.append(details);
        }

        return li;
    }

    function render() {
        for (const column of COLUMNS) {
            const list = $(`[data-list="${column}"]`);
            if (!list) continue;
            list.replaceChildren(
                ...tasks.filter((t) => t.column === column).map(createTaskElement)
            );
        }
    }

    function updateDateMeta() {
        const now = new Date();

        $('[data-meta="today"]').textContent = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}`;

        $('[data-meta="week"]').textContent = `W${getISOWeek(now)}`;
        $('[data-meta="month"]').textContent = MONTHS[now.getMonth()];
        $('[data-meta="year"]').textContent = now.getFullYear();
    }

    //========================
    // Tasks
    //========================

    function addTask(text, column) {
        const now = new Date();
        const meta = `created: ${formatDateISO(now)}\nhorizon: ${getHorizonLine(column, now)}`;

        const task = {
            id: crypto.randomUUID(),
            column,
            done: false,
            content: `# ${text}\n\n${meta}`,
        };
        tasks.push(task);
        saveTasks(tasks);
        render();
        return task.id;
    }

    //========================
    // AI plan
    //========================

    // No UI sets this any more — the local model is the only path now — but a
    // key left over from before the switch still routes through the API.
    const getAiKey = () => localStorage.getItem(AI_KEY_STORAGE);

    /** The sub-periods a horizon still contains — months left in the year, and so on. */
    function getRemainingPeriods(column, date) {
        switch (column) {
            case 'year':
                return MONTHS.slice(date.getMonth());
            case 'month': {
                const weeks = [];
                const monthIdx = date.getMonth();
                const cursor = new Date(date);
                while (cursor.getMonth() === monthIdx) {
                    weeks.push(`W${pad2(getISOWeek(cursor))}`);
                    cursor.setDate(cursor.getDate() + 7);
                }
                return weeks;
            }
            case 'week':
                return DAYS.slice((date.getDay() + 6) % 7);
            default:
                return null;
        }
    }

    /**
     * The language has to be named outright. "Answer in the same language as
     * the task" was not enough: a small model reads the English example below
     * and writes English themes under French month names. Naming the target
     * language explicitly, twice, is what actually holds it.
     */
    const TARGET_LANGUAGE = (() => {
        const tag = (navigator.language || 'en').split('-')[0];
        try {
            return new Intl.DisplayNames(['en'], { type: 'language' }).of(tag) || 'English';
        } catch {
            return 'English';
        }
    })();

    /**
     * The model is asked for the themes only — never for the markdown around
     * them. Measured on a 1.5B and a 3B: asking for `- [ ] Month — theme`
     * lines gets you a missing bracket, a stray `[]{ }`, the wrong number of
     * lines, or the month names silently translated. Asking for bare themes
     * and pairing them with the periods in code removes all of that at once,
     * and leaves the model doing the one part code cannot do.
     */
    function buildAiPrompt(title, column, date) {
        const periods = getRemainingPeriods(column, date);

        if (periods && periods.length) {
            return [
                `Task: "${title}".`,
                `List exactly ${periods.length} themes, one per line, in order, so that each`,
                'builds on the one before it.',
                'Each theme is 2 to 5 words naming what to focus on.',
                'No numbering, no bullets, no dashes, no other text.',
                // Last line on purpose: the closest instruction to the answer
                // is the one a small model is most likely to actually obey.
                `Write them in ${TARGET_LANGUAGE}.`,
            ].join('\n');
        }

        return [
            `Task: "${title}".`,
            'List 3 to 6 concrete steps to get it done, one per line, in order.',
            'Each step is a short action of 2 to 6 words.',
            'No numbering, no bullets, no dashes, no other text.',
            `Write them in ${TARGET_LANGUAGE}.`,
        ].join('\n');
    }

    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    /**
     * Take the model's lines back to bare themes: drop code fences, bullets,
     * numbering, any checkbox marker it added anyway, and a repeated period
     * name at the head of the line.
     */
    function parseThemes(raw, periods, count) {
        const cleaned = raw
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('```'))
            .map((line) =>
                line
                    .replace(/^[-*+]\s*/, '')
                    .replace(/^\[[^\]]{0,3}\]\s*/, '')
                    .replace(/^\d+\s*[.)]\s*/, '')
                    .trim()
            )
            .filter(Boolean);

        return cleaned.slice(0, count).map((line, i) => {
            const period = periods?.[i];
            if (!period) return line;
            // "Août — Les bases" collapses back to "Les bases"; the period is
            // added once, by us, below.
            return line
                .replace(new RegExp(`^${escapeRegExp(period)}\\s*[—–:-]\\s*`, 'i'), '')
                .trim();
        });
    }

    /** Pair each period with its theme. The markdown shape is ours, not the model's. */
    function assemblePlan(themes, periods) {
        if (!periods) return themes.map((theme) => `- [ ] ${theme}`).join('\n');
        return periods
            .slice(0, themes.length)
            .map((period, i) => `- [ ] ${period} — ${themes[i]}`)
            .join('\n');
    }

    /**
     * Two engines, one rule: an Anthropic key set through "AI key" wins,
     * otherwise the plan is generated locally by WebLLM. The local model is
     * the default because it needs no account and no network per task; the
     * key stays supported as the better-quality escape hatch, and as the only
     * option on a browser without WebGPU.
     */
    async function generateAiPlan(title, column, date) {
        const periods = getRemainingPeriods(column, date);
        const prompt = buildAiPrompt(title, column, date);
        const apiKey = getAiKey();
        const raw = apiKey
            ? await completeRemote(prompt, apiKey)
            : await llm.complete(prompt, showModelProgress);

        const count = periods?.length ?? 6;
        const themes = parseThemes(raw, periods, count);

        // Nothing usable came back — keep the raw reply rather than appending
        // an empty plan, so the failure is visible instead of silent.
        return themes.length ? assemblePlan(themes, periods) : raw.trim();
    }

    async function completeRemote(prompt, apiKey) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: AI_MODEL,
                max_tokens: 512,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!res.ok) {
            throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
        }

        const data = await res.json();
        return (data.content?.[0]?.text ?? '').trim();
    }

    /** The first run downloads gigabytes — say so, rather than looking hung. */
    function setStatus(text) {
        aiStatus.textContent = text ?? '';
        aiStatus.hidden = !text;
    }

    // WebLLM's own progress strings ("Finish loading on WebGPU - intel") are
    // internal detail, so only the percentage is taken from it.
    function showModelProgress(progress) {
        setStatus(
            progress >= 1
                ? 'Writing the plan…'
                : `Loading the local model — ${Math.round(progress * 100)}%`
        );
    }

    async function appendAiPlan(id, column) {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;

        aiToggle.classList.add('loading');
        setStatus(getAiKey() || llm.isReady() ? 'Writing the plan…' : 'Preparing the local model…');
        try {
            const plan = await generateAiPlan(extractTitle(task.content), column, new Date());
            if (plan) {
                task.content = `${task.content}\n\n${plan}`;
                saveTasks(tasks);
                expandedIds.add(id);
                render();
            }
            setStatus(null);
        } catch (err) {
            setStatus(null);
            window.alert(err.message);
        } finally {
            aiToggle.classList.remove('loading');
        }
    }

    //========================
    // Events
    //========================

    aiToggle.addEventListener('click', () => {
        aiEnabled = !aiEnabled;
        aiToggle.setAttribute('aria-pressed', String(aiEnabled));
        aiToggle.replaceChildren(icon(aiEnabled ? 'i-robot' : 'i-robot-off'));
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        const column = columnSelect.value;
        const id = addTask(text, column);

        input.value = '';
        input.focus();

        // No key needed any more: without one the local model handles it.
        if (aiEnabled) await appendAiPlan(id, column);
    });

    function openColumnAdd(wrapper) {
        const addBtn = wrapper.querySelector('.column-add-btn');
        const addForm = wrapper.querySelector('.column-add-form');
        if (addBtn.hidden) return;
        addBtn.hidden = true;
        addForm.hidden = false;
        addForm.querySelector('.column-add-input').focus();
    }

    function toggleMdCheck(taskId, check) {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;
        const lines = task.content.split(/\r?\n/);
        const lineIdx = bodyLineToContentLine(task.content, Number(check.dataset.line));
        lines[lineIdx] = lines[lineIdx].replace(
            /^([-*] \[)[ xX]?(\])/,
            (_m, open, close) => `${open}${check.classList.contains('is-done') ? ' ' : 'x'}${close}`
        );
        task.content = lines.join('\n');
        saveTasks(tasks);
        render();
    }

    board.addEventListener('click', (event) => {
        const addBtn = event.target.closest('.column-add-btn');
        if (addBtn) {
            openColumnAdd(addBtn.closest('.column-add'));
            return;
        }

        const item = event.target.closest('.task');
        if (!item) return;
        const id = item.dataset.id;

        if (event.target.matches('input[type="checkbox"]')) {
            const task = tasks.find((t) => t.id === id);
            if (task) {
                task.done = event.target.checked;
                saveTasks(tasks);
                render();
            }
            return;
        }

        if (event.target.closest('.delete-btn')) {
            tasks = tasks.filter((t) => t.id !== id);
            expandedIds.delete(id);
            editingIds.delete(id);
            saveTasks(tasks);
            render();
            return;
        }

        const check = event.target.closest('.md-check');
        if (check) {
            toggleMdCheck(id, check);
            return;
        }

        if (event.target.closest('.edit-btn')) {
            editingIds.add(id);
            render();
            const textarea = $(`.task[data-id="${id}"] .task-notes`);
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
            return;
        }

        if (event.target.closest('.task-row')) {
            if (expandedIds.has(id)) {
                expandedIds.delete(id);
                editingIds.delete(id);
            } else {
                expandedIds.add(id);
            }
            render();
        }
    });

    board.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const check = event.target.closest('.md-check');
        if (!check) return;
        event.preventDefault();
        const id = event.target.closest('.task')?.dataset.id;
        if (id) toggleMdCheck(id, check);
    });

    //========================
    // Drag & drop between columns
    //========================

    board.addEventListener('dragstart', (event) => {
        const item = event.target.closest('.task');
        if (!item) return;
        draggingId = item.dataset.id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggingId);
        // Applied next frame so the drag ghost image is captured before the
        // card fades, instead of showing the faded state as the ghost.
        requestAnimationFrame(() => item.classList.add('dragging'));
    });

    board.addEventListener('dragend', () => {
        draggingId = null;
        board.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
        board.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    });

    board.addEventListener('dragover', (event) => {
        if (!draggingId) return;
        const column = event.target.closest('.column');
        if (!column) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (column.classList.contains('drag-over')) return;
        board.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
        column.classList.add('drag-over');
    });

    board.addEventListener('dragleave', (event) => {
        const column = event.target.closest('.column');
        if (!column || column.contains(event.relatedTarget)) return;
        column.classList.remove('drag-over');
    });

    board.addEventListener('drop', (event) => {
        const column = event.target.closest('.column');
        if (!column) return;
        event.preventDefault();
        column.classList.remove('drag-over');

        const id = draggingId || event.dataTransfer.getData('text/plain');
        const newColumn = column.dataset.column;
        const task = tasks.find((t) => t.id === id);
        if (task && task.column !== newColumn) {
            task.column = newColumn;
            task.content = updateHorizonMeta(task.content, newColumn);
            saveTasks(tasks);
            render();
        }
        draggingId = null;
    });

    board.addEventListener('submit', (event) => {
        const addForm = event.target.closest('.column-add-form');
        if (!addForm) return;
        event.preventDefault();

        const addInput = addForm.querySelector('.column-add-input');
        const text = addInput.value.trim();
        if (text) addTask(text, addForm.closest('.column').dataset.column);
        addInput.value = '';
        addInput.focus();
    });

    board.addEventListener('input', (event) => {
        if (!event.target.matches('.task-notes')) return;

        const item = event.target.closest('.task');
        const task = tasks.find((t) => t.id === item.dataset.id);
        if (!task) return;

        task.content = event.target.value;
        saveTasks(tasks);

        const label = item.querySelector('.task-row span');
        if (label) label.textContent = extractTitle(task.content);
    });

    board.addEventListener('focusout', (event) => {
        const addForm = event.target.closest('.column-add-form');
        if (addForm) {
            // Wait a frame: focus may still be moving inside the same form.
            requestAnimationFrame(() => {
                if (addForm.contains(document.activeElement)) return;
                addForm.hidden = true;
                addForm.querySelector('.column-add-input').value = '';
                addForm.closest('.column-add').querySelector('.column-add-btn').hidden = false;
            });
            return;
        }

        if (!event.target.matches('.task-notes')) return;

        const item = event.target.closest('.task');
        if (!item) return;

        editingIds.delete(item.dataset.id);
        render();
    });

    //========================
    // Start
    //========================

    render();
    updateDateMeta();
    setInterval(updateDateMeta, 30_000);

    return { focus: () => input.focus() };
}
