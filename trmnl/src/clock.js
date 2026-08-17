//========================
// Date and time
//========================

const timeFormat = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const dateFormat = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
});

function msUntilNextMinute(now) {
    return 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
}

/**
 * ISO-8601 week number. A week belongs to the year holding its Thursday, which
 * is why the date is shifted to that Thursday before counting — otherwise the
 * turn of the year lands on 0 or 53 depending on which weekday it falls on.
 * UTC throughout so a timezone offset cannot roll the date over.
 */
function isoWeek(now) {
    const thursday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
    const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1);
    return Math.ceil(((thursday - jan1) / 86_400_000 + 1) / 7);
}

export function initClock({ time, date }) {
    let dayStamp = '';

    function render() {
        const now = new Date();

        // Split on the separator the locale chose so the divider can blink.
        const [hh, mm] = timeFormat.format(now).split(/\D+/).filter(Boolean);
        time.replaceChildren(hh, blink(), mm);
        time.dateTime = now.toISOString();

        const today = now.toDateString();
        if (today !== dayStamp) {
            dayStamp = today;
            date.replaceChildren(dateFormat.format(now), week(now));
        }

        // Re-align to the top of the minute instead of drifting on a fixed delay.
        setTimeout(render, msUntilNextMinute(now));
    }

    render();
}

function week(now) {
    const span = document.createElement('span');
    span.className = 'week';
    span.textContent = `(W${String(isoWeek(now)).padStart(2, '0')})`;
    return span;
}

function blink() {
    const span = document.createElement('span');
    span.className = 'blink';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = '·';
    return span;
}
