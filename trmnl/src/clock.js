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
            date.textContent = dateFormat.format(now);
        }

        // Re-align to the top of the minute instead of drifting on a fixed delay.
        setTimeout(render, msUntilNextMinute(now));
    }

    render();
}

function blink() {
    const span = document.createElement('span');
    span.className = 'blink';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = '·';
    return span;
}
