# Apnea — breath-hold training

Static web app (HTML/CSS/JS, no build) to train and track dry static apnea.
Everything is stored in `localStorage` — no account, no network, works offline
once loaded.

## Run

```bash
npx serve .
```

Then open `http://localhost:3000`. On iOS, "Add to Home Screen" gives a
full-screen app with the tab bar and a screen wake lock during timers.

## What's in it

**Max hold** — relaxation phase (default 2:00, adjustable, skippable) → open-ended
hold → recovery phase (default 2:00). During the hold, a full-width **Contraction**
button records a marker each time you tap it; markers show as ticks on the ring
and as a timeline in the summary and logbook. The summary reports hold time,
first-spasm time and *fight phase* (hold minus first spasm).

**CO₂ table** — fixed hold, rest shrinking each round. **O₂ table** — fixed rest,
hold growing each round. Both are fully configurable, can be seeded from your
personal best, preview the whole plan before you start, and take contraction
markers per round.

**Apnea walk** — the same runner as a max hold (`#/hold?mode=walk`), with distance
and steps collected in the summary.

**Relaxation** — box breathing, 4-7-8, coherence 5-5, long exhale, or a custom
four-phase pattern, with an animated ring and voice cues.

**Manual entry** — log anything you did away from the app, backdate it, seed a PB
you already had, or edit/correct any saved session (`#/entry`, `#/entry?id=…`).
Covers every type including dynamic apnea (DYN/DNF/DYNB).

**Dive watch import** — Settings takes a `.fit` or `.csv` exported from Garmin
Connect and turns each dive into a logged hold with its depth. In Connect, open a
single freedive activity and use **Export Original** (`.fit`) or export its splits
as CSV; the whole-account *activity list* CSV is a different file and is rejected
with a message saying so. Re-importing an activity is a no-op — every session
carries an `importId` derived from the device and start time.

**Progress** — personal best, max-hold curve with first-contraction onset overlaid,
**contraction onset as a share of the hold**, weekly hold volume, table
progression, freedive session times and max depth, distance for dynamic and walks,
breathing practice. Filterable by range; every chart has a data-table fallback.

**History** — logbook grouped by day, expandable per session, with a contraction
timeline per hold (fight phase shaded, tick per marker), edit and delete.
Settings has JSON export/import.

**Offline** — a service worker caches the shell network-first, so the app runs with
no connection and still updates when online. Settings shows storage durability and
can request permanent storage.

## Notes

Confirmations use an in-app `<dialog>`, not `window.confirm()` — native dialogs
are suppressed in standalone/PWA contexts and once the browser offers "prevent
additional dialogs", where they silently return `false` and the button appears
dead.

`js/fit.js` is a from-scratch FIT decoder (~200 lines, no dependency): header,
definition/data records, both endiannesses, base-type invalid sentinels, arrays,
developer fields, compressed timestamps and chained files. Only the messages the
app uses carry field names; the rest are stepped over by width.

CSV import sniffs its own header row, because Garmin Connect exports in the
account's language and the column set varies. When the words fail, columns are
identified by what they contain. That inference is deliberately bounded — a dive
over 20 minutes or deeper than 200 m means the wrong column was read, and the
import fails loudly instead of storing a calorie count as a depth.

A freedive's dives count toward *best hold anywhere* and weekly hold volume, but
never toward the static personal best: a wet dive is not a max attempt, and the
CO₂/O₂ table suggestions scale off that PB.

Layout is mobile-first and verified at 320px through desktop. The runner screens
cap the ring against viewport height (`min(76vw, 310px, 42vh)`) so the controls
always stay above the fold, and switch to a two-column layout in landscape.

## Layout

```
index.html
sw.js          offline shell cache (network-first)
manifest.webmanifest
css/style.css
js/
  main.js      hash router, shell, service worker + install prompt
  store.js     localStorage schema, personal best, storage durability, export/import
  timer.js     drift-free Ticker (wall clock, not frame count) + wake lock
  audio.js     WebAudio beeps + speech cues
  chart.js     SVG line/bar charts and the hold timeline, hover + table fallback
  ui.js        el(), stepper, segmented, text field, dial, modal confirm, toast
  format.js    time/date/distance formatting and parsing
  fit.js       Garmin/ANT FIT binary decoder
  dives.js     .fit and .csv -> freedive sessions, with plausibility guards
  views/       home, hold, tables, relax, entry, progress, history, settings
```

Durations are stored in seconds everywhere. Session shapes are documented at the
top of `js/store.js`.

## Safety

Never breath-hold in or near water without a trained buddy watching — shallow
water blackout gives no warning. Do not hyperventilate before a hold. This app is
built for dry training.
