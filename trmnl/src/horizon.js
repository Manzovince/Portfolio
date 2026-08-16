//========================
// Horizon — a task board bucketed by time horizon
//========================
//
// Tasks are markdown documents: the `# heading` is the title shown in the
// list, everything after it is the note body. Storage is localStorage under
// `horizon-tasks`; the key and shape are unchanged from the standalone app,
// so an existing board carries over.

const STORAGE_KEY = 'horizon-tasks';
const AI_KEY_STORAGE = 'horizon-ai-key';
const AI_MODEL = 'claude-haiku-4-5-20251001';

const COLUMNS = ['today', 'week', 'month', 'year', 'someday'];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    return escapeHtml(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\n/g, '<br>');
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

//========================
// Wiring
//========================

export function initHorizon({ root }) {
    const $ = (selector) => root.querySelector(selector);

    const form = $('#task-form');
    const input = $('#task-input');
    const columnSelect = $('#task-column');
    const aiToggle = $('#ai-toggle');
    const board = $('.board');

    let tasks = loadTasks();
    let aiEnabled = false;

    const expandedIds = new Set();
    const editingIds = new Set();

    //========================
    // Rendering
    //========================

    function createTaskElement(task) {
        const li = document.createElement('li');
        li.className = 'task' + (task.done ? ' done' : '');
        li.dataset.id = task.id;

        const row = document.createElement('div');
        row.className = 'task-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.done;
        checkbox.setAttribute('aria-label', 'Mark as done');

        const label = document.createElement('span');
        label.textContent = extractTitle(task.content);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-icon delete-btn';
        deleteBtn.setAttribute('aria-label', 'Delete task');
        deleteBtn.append(icon('i-close'));

        row.append(checkbox, label, deleteBtn);
        li.append(row);

        if (expandedIds.has(task.id)) {
            const details = document.createElement('div');
            details.className = 'task-details';

            if (editingIds.has(task.id)) {
                const textarea = document.createElement('textarea');
                textarea.className = 'task-notes';
                textarea.placeholder = '# Title\n\nDetails (markdown)…';
                textarea.value = task.content || '';
                details.append(textarea);
            } else {
                const body = extractBody(task.content);
                const hasBody = body.trim().length > 0;
                const preview = document.createElement('div');
                preview.className = 'task-preview' + (hasBody ? '' : ' empty');
                if (hasBody) preview.innerHTML = renderMarkdown(body);
                else preview.textContent = 'Add a note…';
                details.append(preview);
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

        $('[data-meta="today"]').textContent =
            `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)} · ` +
            `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

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

    const getAiKey = () => localStorage.getItem(AI_KEY_STORAGE);

    function promptAiKey() {
        const key = window.prompt(
            'Anthropic API key (kept in this browser only):',
            getAiKey() || ''
        );
        if (key === null) return;
        if (key.trim()) localStorage.setItem(AI_KEY_STORAGE, key.trim());
        else localStorage.removeItem(AI_KEY_STORAGE);
    }

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
                    weeks.push(`Week of ${pad2(cursor.getDate())}/${pad2(monthIdx + 1)}`);
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

    function buildAiPrompt(title, column, date) {
        const periods = getRemainingPeriods(column, date);
        if (periods && periods.length) {
            return `Task: "${title}". Write a markdown checkbox list, one line per item below, ` +
                `in the format "- [ ] Name — short theme (2-5 words)":\n${periods.join('\n')}\n` +
                `Reply with the list only, no text before or after.`;
        }
        return `Task: "${title}". Write a short markdown checkbox list (3 to 6 steps) to get this ` +
            `done, in the format "- [ ] step". Reply with the list only, no text before or after.`;
    }

    async function generateAiPlan(title, column, date) {
        const apiKey = getAiKey();
        if (!apiKey) throw new Error('No AI API key set.');

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
                messages: [{ role: 'user', content: buildAiPrompt(title, column, date) }],
            }),
        });

        if (!res.ok) {
            throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
        }

        const data = await res.json();
        return (data.content?.[0]?.text ?? '').trim();
    }

    async function appendAiPlan(id, column) {
        const task = tasks.find((t) => t.id === id);
        if (!task) return;

        aiToggle.classList.add('loading');
        try {
            const plan = await generateAiPlan(extractTitle(task.content), column, new Date());
            if (plan) {
                task.content = `${task.content}\n\n${plan}`;
                saveTasks(tasks);
                expandedIds.add(id);
                render();
            }
        } catch (err) {
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

    $('#ai-key-btn').addEventListener('click', promptAiKey);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        const column = columnSelect.value;
        const id = addTask(text, column);

        input.value = '';
        input.focus();

        if (aiEnabled) {
            if (!getAiKey()) promptAiKey();
            if (getAiKey()) await appendAiPlan(id, column);
        }
    });

    function openColumnAdd(wrapper) {
        const addBtn = wrapper.querySelector('.column-add-btn');
        const addForm = wrapper.querySelector('.column-add-form');
        if (addBtn.hidden) return;
        addBtn.hidden = true;
        addForm.hidden = false;
        addForm.querySelector('.column-add-input').focus();
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

        if (event.target.closest('.task-preview')) {
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
