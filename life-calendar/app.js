// Life calendar: a whole life as a grid of squares (one per week, month or year).
// Dates are handled as UTC day numbers so daylight saving never shifts a square.

const STORE_KEY = 'lifeCalendar';
// Symbols a moment can be drawn with; the shapes themselves live in styles.css
const SYMBOLS = ['ring', 'dot', 'star', 'diamond', 'heart'];
const SYMBOL_CHARS = { ring: '○', dot: '●', star: '★', diamond: '◆', heart: '♥' };
const COLORS = ['#4f8fba', '#7aa36f', '#d9a441', '#b5679e', '#5fa8a0', '#c4614f', '#8a7fc0'];

const STRINGS = {
    en: {
        back: '← About this project',
        title: 'Life calendar',
        tagline: 'Tiny squares, entire journey.',
        birth: 'Date of birth',
        lifespan: 'Life expectancy',
        yearsSuffix: 'y',
        weeks: 'Weeks',
        months: 'Months',
        years: 'Years',
        chapters: 'Chapters',
        chaptersHint: 'Periods of your life, like school, a city or a job. Leave the end empty if it is still going on.',
        addChapter: '+ Add a chapter',
        chapterPlaceholder: 'University, Paris, first job…',
        moments: 'Moments',
        momentsHint: 'Single dates worth marking, each with its own symbol.',
        addMoment: '+ Add a moment',
        momentPlaceholder: 'First dive, a birth, a trip…',
        to: 'to',
        remove: 'Remove',
        symbol: 'Symbol',
        size: 'Size',
        hidePanel: 'Hide settings',
        lightTheme: 'Light theme',
        darkTheme: 'Dark theme',
        showPanel: 'Show settings',
        symbolNames: { ring: 'Circle', dot: 'Dot', star: 'Star', diamond: 'Diamond', heart: 'Heart' },
        print: 'Print as a poster',
        privacy: 'Everything stays in this browser. Nothing is sent anywhere.',
        posterTitle: 'A life in {unit}',
        empty: 'Enter your date of birth to draw your life.',
        unitWords: { weeks: 'weeks', months: 'months', years: 'years' },
        unitOne: { weeks: 'week', months: 'month', years: 'year' },
        stats: '<b>{lived}</b> {unit} lived · <b>{left}</b> to go · <b>{pct}%</b> of {span} years',
        statsBeyond: '<b>{lived}</b> {unit} lived, {over} past the {span} years drawn here. Well done.',
        axis: { weeks: 'Week of the year →', months: 'Month of the year →', years: 'Year →' },
        ageLabel: 'Age {age}',
        cellTitle: { weeks: 'Age {age} · week {n}', months: 'Age {age} · month {n}', years: 'Age {age}' },
        now: { weeks: 'This week', months: 'This month', years: 'This year' },
        lived: 'Lived',
        ahead: 'Ahead',
        today: 'Now'
    },
    fr: {
        back: '← À propos du projet',
        title: 'Life calendar',
        tagline: 'De petits carrés, toute une vie.',
        birth: 'Date de naissance',
        lifespan: 'Espérance de vie',
        yearsSuffix: 'ans',
        weeks: 'Semaines',
        months: 'Mois',
        years: 'Années',
        chapters: 'Chapitres',
        chaptersHint: 'Les périodes de ta vie : l\'école, une ville, un travail. Laisse la fin vide si ça dure encore.',
        addChapter: '+ Ajouter un chapitre',
        chapterPlaceholder: 'Université, Paris, premier job…',
        moments: 'Moments',
        momentsHint: 'Des dates à marquer, chacune avec son symbole.',
        addMoment: '+ Ajouter un moment',
        momentPlaceholder: 'Première plongée, une naissance, un voyage…',
        to: 'à',
        remove: 'Supprimer',
        symbol: 'Symbole',
        size: 'Taille',
        hidePanel: 'Masquer les réglages',
        lightTheme: 'Thème clair',
        darkTheme: 'Thème sombre',
        showPanel: 'Afficher les réglages',
        symbolNames: { ring: 'Cercle', dot: 'Point', star: 'Étoile', diamond: 'Losange', heart: 'Cœur' },
        print: 'Imprimer en affiche',
        privacy: 'Tout reste dans ce navigateur. Rien n\'est envoyé nulle part.',
        posterTitle: 'Une vie en {unit}',
        empty: 'Entre ta date de naissance pour dessiner ta vie.',
        unitWords: { weeks: 'semaines', months: 'mois', years: 'années' },
        unitOne: { weeks: 'semaine', months: 'mois', years: 'année' },
        livedWord: { weeks: 'vécues', months: 'vécus', years: 'vécues' },
        stats: '<b>{lived}</b> {unit} {livedWord} · <b>{left}</b> à venir · <b>{pct} %</b> de {span} ans',
        statsBeyond: '<b>{lived}</b> {unit} {livedWord}, {over} au-delà des {span} ans dessinés ici. Bravo.',
        axis: { weeks: 'Semaine de l\'année →', months: 'Mois de l\'année →', years: 'Année →' },
        ageLabel: '{age} ans',
        cellTitle: { weeks: '{age} ans · semaine {n}', months: '{age} ans · mois {n}', years: '{age} ans' },
        now: { weeks: 'Cette semaine', months: 'Ce mois-ci', years: 'Cette année' },
        lived: 'Vécu',
        ahead: 'À venir',
        today: 'Maintenant'
    }
};

const $ = id => document.getElementById(id);

// ---------- State ----------

// Square size in pixels for each view: the slider's range and its starting value
const SIZES = {
    weeks: { min: 4, max: 24, start: 13 },
    months: { min: 8, max: 56, start: 32 },
    years: { min: 16, max: 96, start: 48 }
};

const defaults = { birth: '', lifespan: 90, unit: 'weeks', sizes: {}, panelCollapsed: false, theme: 'auto', chapters: [], moments: [] };

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY));
        return saved ? { ...defaults, ...saved } : { ...defaults };
    } catch {
        return { ...defaults };
    }
}

let state = load();
let saveTimer;
function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
    }, 200);
}

// Shares the portfolio's language choice (same origin, same key)
function initialLang() {
    try {
        const saved = localStorage.getItem('selectedLanguage');
        if (saved === 'en' || saved === 'fr') return saved;
    } catch { /* ignore */ }
    return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
let lang = initialLang();
const t = () => STRINGS[lang];

function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');
}

// ---------- Dates ----------

const DAY = 864e5;

function parseDay(str) {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d) / DAY;
}

function todayDay() {
    const now = new Date();
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY;
}

// The same day of month, n months after the birth month; clamped so 31 Jan + 1 month is 28/29 Feb
function monthsAfter(birth, n) {
    const last = new Date(Date.UTC(birth.y, birth.m + n + 1, 0)).getUTCDate();
    return Date.UTC(birth.y, birth.m + n, Math.min(birth.d, last)) / DAY;
}

function formatDay(day) {
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(day * DAY));
}

// Every square of the calendar with its first and last day
function buildCells(birthStr, lifespan, unit) {
    const [y, m, d] = birthStr.split('-').map(Number);
    const birth = { y, m: m - 1, d };
    const cells = [];

    if (unit === 'weeks') {
        // Tim Urban's convention: each row is one year of age, cut into 52 weeks;
        // the last week of the row takes the leftover day or two.
        for (let age = 0; age < lifespan; age++) {
            const rowStart = monthsAfter(birth, age * 12);
            const nextRow = monthsAfter(birth, (age + 1) * 12);
            for (let w = 0; w < 52; w++) {
                const start = rowStart + w * 7;
                const end = w === 51 ? nextRow - 1 : start + 6;
                cells.push({ row: age, age, n: w + 1, start, end });
            }
        }
    } else if (unit === 'months') {
        for (let k = 0; k < lifespan * 12; k++) {
            cells.push({
                row: Math.floor(k / 12), age: Math.floor(k / 12), n: (k % 12) + 1,
                start: monthsAfter(birth, k), end: monthsAfter(birth, k + 1) - 1
            });
        }
    } else {
        for (let age = 0; age < lifespan; age++) {
            cells.push({
                row: Math.floor(age / 10), age, n: age + 1,
                start: monthsAfter(birth, age * 12), end: monthsAfter(birth, (age + 1) * 12) - 1
            });
        }
    }
    return cells;
}

// ---------- Rendering ----------

let cells = [];
let gridKey = '';

function renderGrid() {
    const grid = $('grid');
    const birth = parseDay(state.birth);
    const valid = birth !== null && birth <= todayDay();

    $('empty').hidden = valid;
    document.querySelector('.grid-wrap').hidden = !valid;
    $('stats').hidden = !valid;
    document.querySelector('.progress').hidden = !valid;
    $('legend').hidden = !valid;
    if (!valid) { grid.innerHTML = ''; gridKey = ''; return; }

    const key = `${state.birth}|${state.lifespan}|${state.unit}`;
    if (key !== gridKey) {
        gridKey = key;
        cells = buildCells(state.birth, state.lifespan, state.unit);

        const cols = state.unit === 'weeks' ? 52 : state.unit === 'months' ? 12 : 10;
        const frag = document.createDocumentFragment();
        let rowEl = null;
        cells.forEach((cell, i) => {
            if (!rowEl || rowEl._row !== cell.row) {
                rowEl = document.createElement('div');
                rowEl._row = cell.row;
                rowEl.className = 'row';
                rowEl.style.setProperty('--cols', cols);
                rowEl.style.setProperty('--r', cell.row);
                // In weeks and months a row is a year: leave a gap between decades
                if (state.unit !== 'years' && cell.row % 10 === 0) rowEl.classList.add('decade');
                const label = document.createElement('span');
                label.className = 'row-label';
                const rowAge = state.unit === 'years' ? cell.row * 10 : cell.row;
                label.textContent = state.unit === 'years' || rowAge % 5 === 0 ? rowAge : '';
                rowEl.appendChild(label);
                frag.appendChild(rowEl);
            }
            const el = document.createElement('div');
            el.className = 'cell';
            el.dataset.i = i;
            cell.el = el;
            rowEl.appendChild(el);
        });
        grid.replaceChildren(frag);
        // Replays the row fade-in (switched off by the CSS under reduced motion)
        grid.classList.remove('intro');
        void grid.offsetWidth;
        grid.classList.add('intro');
    }
    paint();
}

// Colours the squares: lived, now, chapters and moments
function paint() {
    const today = todayDay();
    const chapters = state.chapters
        .map(c => ({ ...c, s: parseDay(c.start), e: c.end ? parseDay(c.end) : today }))
        .filter(c => c.s !== null && c.e !== null && c.e >= c.s);
    const moments = state.moments
        .map(m => ({ ...m, day: parseDay(m.date) }))
        .filter(m => m.day !== null);

    let lived = 0, nowIndex = -1;
    cells.forEach((cell, i) => {
        const el = cell.el;
        const past = cell.end < today;
        const now = cell.start <= today && today <= cell.end;
        if (past) lived++;
        if (now) nowIndex = i;

        // The last chapter in the list wins where chapters overlap
        let chapter = null;
        for (const c of chapters) if (c.s <= cell.end && c.e >= cell.start) chapter = c;
        const moment = moments.find(m => m.day >= cell.start && m.day <= cell.end);

        el.className = 'cell' + (past ? ' past' : '') + (now ? ' now' : '') +
            (chapter ? ' tint' : '') + (moment ? ' moment' : '');
        if (chapter) el.style.setProperty('--c', chapter.color); else el.style.removeProperty('--c');
        if (moment) {
            el.style.setProperty('--m', moment.color);
            el.dataset.sym = moment.symbol || 'ring';
        } else {
            el.style.removeProperty('--m');
            delete el.dataset.sym;
        }
        cell.chapter = chapter;
        cell.moments = moments.filter(m => m.day >= cell.start && m.day <= cell.end);
    });

    const s = t();
    const unitWord = s.unitWords[state.unit];
    const total = cells.length;
    const birth = parseDay(state.birth);
    const lifeEnd = cells[cells.length - 1].end + 1;
    const fmt = n => n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB');

    if (today >= lifeEnd) {
        $('stats').innerHTML = fill(s.statsBeyond, {
            lived: fmt(lived), unit: unitWord, livedWord: s.livedWord?.[state.unit], span: state.lifespan,
            over: fmt(Math.floor((today - lifeEnd) / 365.25)) + ' ' + s.unitWords.years
        });
        $('progress').style.width = '100%';
    } else {
        const pct = (today - birth) / (lifeEnd - birth) * 100;
        $('stats').innerHTML = fill(s.stats, {
            lived: fmt(lived), left: fmt(total - lived - (nowIndex >= 0 ? 1 : 0)), unit: unitWord,
            livedWord: s.livedWord?.[state.unit],
            pct: pct.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 }),
            span: state.lifespan
        });
        $('progress').style.width = pct.toFixed(2) + '%';
    }

    renderLegend(chapters, moments);
}

function renderLegend(chapters, moments) {
    const s = t();
    const items = [
        `<li><i style="--c: var(--cell-past)"></i>${s.lived}</li>`,
        `<li><i style="--c: var(--accent)"></i>${s.today}</li>`,
        `<li><i style="--b: var(--cell-border)"></i>${s.ahead}</li>`
    ];
    chapters.forEach(c => {
        if (c.label) items.push(`<li><i style="--c: ${c.color}"></i>${escapeHtml(c.label)}</li>`);
    });
    moments.forEach(m => {
        if (m.label) items.push(`<li><i class="sym" data-sym="${m.symbol || 'ring'}" style="--c: ${m.color}"></i>${escapeHtml(m.label)}</li>`);
    });
    $('legend').innerHTML = items.join('');
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// ---------- Chapters and moments editor ----------

function nextColor(list) {
    const used = list.map(e => e.color);
    return COLORS.find(c => !used.includes(c)) || COLORS[list.length % COLORS.length];
}

function renderEntries() {
    const s = t();
    renderList($('chapters'), state.chapters, entry => `
        <button type="button" class="swatch" style="--c:${entry.color}" data-act="color" aria-label="Colour"></button>
        <input type="text" data-field="label" value="${escapeHtml(entry.label)}" placeholder="${s.chapterPlaceholder}">
        <button type="button" class="remove" data-act="remove" aria-label="${s.remove}">×</button>
        <div class="dates">
            <input type="date" data-field="start" value="${entry.start}" aria-label="Start">
            <span>${s.to}</span>
            <input type="date" data-field="end" value="${entry.end}" aria-label="End">
        </div>`);
    renderList($('moments'), state.moments, entry => `
        <button type="button" class="swatch sym" data-sym="${entry.symbol || 'ring'}" style="--c:${entry.color}" data-act="color" aria-label="Colour"></button>
        <input type="text" data-field="label" value="${escapeHtml(entry.label)}" placeholder="${s.momentPlaceholder}">
        <button type="button" class="remove" data-act="remove" aria-label="${s.remove}">×</button>
        <div class="dates dates--moment">
            <input type="date" data-field="date" value="${entry.date}" aria-label="Date">
            <div class="symbols" role="radiogroup" aria-label="${s.symbol}">
                ${SYMBOLS.map(sym => `<button type="button" class="sym-pick" role="radio" data-act="symbol" data-value="${sym}"
                    aria-checked="${(entry.symbol || 'ring') === sym}" title="${s.symbolNames[sym]}" aria-label="${s.symbolNames[sym]}"
                    ><i class="sym" data-sym="${sym}"></i></button>`).join('')}
            </div>
        </div>`);
}

function renderList(ul, list, template) {
    ul.innerHTML = list.map((entry, i) => `<li class="entry" data-i="${i}">${template(entry)}</li>`).join('');
}

function bindList(ul, getList) {
    ul.addEventListener('input', e => {
        const li = e.target.closest('.entry');
        const field = e.target.dataset.field;
        if (!li || !field) return;
        getList()[li.dataset.i][field] = e.target.value;
        save();
        if (cells.length) paint();
    });
    ul.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const list = getList();
        const i = Number(btn.closest('.entry').dataset.i);
        if (btn.dataset.act === 'remove') {
            list.splice(i, 1);
            renderEntries();
        } else if (btn.dataset.act === 'symbol') {
            const entryEl = btn.closest('.entry');
            list[i].symbol = btn.dataset.value;
            entryEl.querySelectorAll('.sym-pick').forEach(b => b.setAttribute('aria-checked', b === btn));
            entryEl.querySelector('.swatch').dataset.sym = btn.dataset.value;
        } else {
            const idx = COLORS.indexOf(list[i].color);
            list[i].color = COLORS[(idx + 1) % COLORS.length];
            btn.style.setProperty('--c', list[i].color);
        }
        save();
        if (cells.length) paint();
    });
}

// ---------- Tooltip ----------

const tip = $('tip');

function showTip(cellEl) {
    const cell = cells[cellEl.dataset.i];
    if (!cell) return;
    const s = t();
    const today = todayDay();
    let html = `<strong>${fill(s.cellTitle[state.unit], { age: cell.age, n: cell.n })}</strong>`;
    html += `<span>${cell.start === cell.end ? formatDay(cell.start) : formatDay(cell.start) + ' – ' + formatDay(cell.end)}</span>`;
    if (cell.start <= today && today <= cell.end) html += `<em>${s.now[state.unit]}</em>`;
    if (cell.chapter && cell.chapter.label) html += `<em>${escapeHtml(cell.chapter.label)}</em>`;
    cell.moments.forEach(m => { if (m.label) html += `<em>${SYMBOL_CHARS[m.symbol || 'ring']} ${escapeHtml(m.label)}</em>`; });
    tip.innerHTML = html;
    tip.hidden = false;

    const r = cellEl.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2;
    let y = r.top - th - 8;
    if (y < 8) y = r.bottom + 8;
    x = Math.max(8, Math.min(x, innerWidth - tw - 8));
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

const grid = $('grid');
grid.addEventListener('pointerover', e => {
    if (e.target.classList.contains('cell')) showTip(e.target);
});
grid.addEventListener('pointerleave', () => { tip.hidden = true; });
grid.addEventListener('click', e => {
    if (e.target.classList.contains('cell')) showTip(e.target);
});
document.addEventListener('pointerdown', e => {
    if (!e.target.classList.contains('cell')) tip.hidden = true;
});
addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

// ---------- Language ----------

function applyLang() {
    const s = t();
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.dataset.t;
        if (key === 'posterTitle') el.textContent = fill(s.posterTitle, { unit: s.unitWords[state.unit] });
        else if (typeof s[key] === 'string') el.textContent = s[key];
    });
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
    $('axis').textContent = s.axis[state.unit];
    applyPanel();
    applyTheme();
    renderEntries();
    if (cells.length) paint();
}

document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
        lang = btn.dataset.lang;
        try { localStorage.setItem('selectedLanguage', lang); } catch { /* ignore */ }
        applyLang();
    });
});

// ---------- Controls ----------

const birthInput = $('birth');
const lifespanInput = $('lifespan');
birthInput.max = new Date().toISOString().slice(0, 10);
birthInput.value = state.birth;
lifespanInput.value = state.lifespan;

birthInput.addEventListener('change', () => {
    state.birth = birthInput.value;
    save();
    renderGrid();
});

lifespanInput.addEventListener('change', () => {
    const n = Math.round(Number(lifespanInput.value));
    state.lifespan = Math.min(120, Math.max(1, Number.isFinite(n) && n > 0 ? n : 90));
    lifespanInput.value = state.lifespan;
    save();
    renderGrid();
});

const sizeInput = $('size');

function applySize() {
    const range = SIZES[state.unit];
    const size = state.sizes[state.unit] ?? range.start;
    sizeInput.min = range.min;
    sizeInput.max = range.max;
    sizeInput.value = size;
    $('grid').style.setProperty('--size', size + 'px');
}

sizeInput.addEventListener('input', () => {
    state.sizes = { ...state.sizes, [state.unit]: Number(sizeInput.value) };
    $('grid').style.setProperty('--size', sizeInput.value + 'px');
    tip.hidden = true;
    save();
});

// ---------- Theme ----------

// 'auto' follows the system; the button switches to the opposite of what is showing and remembers it
const systemDark = matchMedia('(prefers-color-scheme: dark)');

function isDark() {
    return state.theme === 'dark' || (state.theme === 'auto' && systemDark.matches);
}

function applyTheme() {
    const root = document.documentElement;
    if (state.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = state.theme;
    const dark = isDark();
    root.toggleAttribute('data-dark', dark);
    document.querySelector('meta[name="theme-color"]').content = dark ? '#0b1a22' : '#f6f5f0';
    const label = dark ? t().lightTheme : t().darkTheme;
    $('theme-toggle').title = label;
    $('theme-toggle').setAttribute('aria-label', label);
}

$('theme-toggle').addEventListener('click', () => {
    state.theme = isDark() ? 'light' : 'dark';
    applyTheme();
    save();
});
systemDark.addEventListener('change', applyTheme);

// ---------- Settings panel fold ----------

function applyPanel() {
    const s = t();
    const collapsed = state.panelCollapsed;
    document.querySelector('.app').classList.toggle('collapsed', collapsed);
    $('panel-toggle').setAttribute('aria-expanded', !collapsed);
    $('panel-toggle').title = collapsed ? s.showPanel : s.hidePanel;
    $('panel-toggle').setAttribute('aria-label', $('panel-toggle').title);
    $('panel-open').title = s.showPanel;
    $('panel-open').setAttribute('aria-label', s.showPanel);
}

function togglePanel(collapsed) {
    state.panelCollapsed = collapsed;
    applyPanel();
    save();
}
$('panel-toggle').addEventListener('click', () => togglePanel(!state.panelCollapsed));
$('panel-open').addEventListener('click', () => togglePanel(false));

function setUnit(unit) {
    state.unit = unit;
    applySize();
    document.querySelectorAll('#unit [data-unit]').forEach(b => b.setAttribute('aria-checked', b.dataset.unit === unit));
    $('grid').dataset.unit = unit;
    save();
    applyLang();
    renderGrid();
}
document.querySelectorAll('#unit [data-unit]').forEach(btn => btn.addEventListener('click', () => setUnit(btn.dataset.unit)));

$('add-chapter').addEventListener('click', () => {
    state.chapters.push({ label: '', start: '', end: '', color: nextColor(state.chapters) });
    renderEntries();
    save();
    $('chapters').lastElementChild.querySelector('input').focus();
});

$('add-moment').addEventListener('click', () => {
    state.moments.push({ label: '', date: '', color: nextColor(state.moments), symbol: 'ring' });
    renderEntries();
    save();
    $('moments').lastElementChild.querySelector('input').focus();
});

bindList($('chapters'), () => state.chapters);
bindList($('moments'), () => state.moments);

$('print').addEventListener('click', () => print());

// Redraw at midnight so "now" moves on its own when the page stays open
function scheduleMidnight() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    setTimeout(() => { if (cells.length) paint(); scheduleMidnight(); }, next - now);
}

setUnit(state.unit);
scheduleMidnight();
