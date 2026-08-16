# trmnl

A terminal-like startpage with a task board behind it. Type a command, hit
Enter, go. No build step, no dependencies, no framework — plain HTML, CSS and
ES modules.

Two views share the page, switched from the tabs in the top-right corner:

- **start** — the clock, the command prompt and the bookmarks (scroll down).
- **horizon** — a task board bucketed by time horizon, formerly the standalone
  *horizon-system* project.

The active view is kept in the URL hash (`#horizon`) so it can be bookmarked,
and remembered in `localStorage` so the page reopens where it was left. `hz`
at the prompt jumps to the board; `Esc` on the board goes back to the prompt.

## Running it

ES modules are blocked over `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

Then point your browser's homepage / new-tab at `http://localhost:8000`.
Deploying to GitHub Pages (or any static host) works the same way.

## Using the prompt

The command is the first word. Arguments follow after a space, and `;`
separates them when a command takes more than one — `r askreddit; top; week`
and `r; askreddit; top; week` are the same thing.

| Input | Goes to |
| --- | --- |
| `how tall is everest` | Google search (anything unrecognised is searched) |
| `example.com` | that URL directly |
| `gh manzovince/trmnl` | github.com/manzovince/trmnl |
| `r askreddit; top; week` | top posts of the week in r/askreddit |
| `hn new` | Hacker News newest |
| `lh 5173` | localhost:5173 |
| `doi 10.1038/nphys1170` | resolves the DOI |
| `wb example.com` | latest Wayback snapshot |
| `y lofi` + `Shift`+`Enter` | YouTube search, in a new tab |

`?` or `help` lists every command, grouped: page, search, AI, reference, code,
design, media, social, Google, life. The *page* group holds the two that stay
on this page — `hz` for the horizon board and `bm` for the bookmarks.

### Keys

| Key | Does |
| --- | --- |
| any letter | focuses the prompt from anywhere |
| `Enter` | go |
| `Shift`+`Enter` | go, in a new tab (same as a trailing `; n`) |
| `Tab` | completes a command name |
| `↑` / `↓` | walks command history (kept in localStorage) |
| `Esc` | clears the prompt or the bookmark filter — on the board, returns to *start* |
| `/` | jumps to the bookmark filter |

## Bookmarks

Scroll down (or click *bookmarks ↓*). Filter by clicking tags — selecting
several widens the result to anything carrying **any** of them — and narrow
further with the search field, which matches titles, hostnames and tags.

`+` adds a bookmark; hovering a row reveals `×` to remove it.

Storage: [`src/seed.js`](src/seed.js) holds the starting list. The moment you
add or remove anything, the list moves to `localStorage` under
`trmnl.bookmarks.v1` and the seed is no longer read. Clearing that key restores
the seed.

Favicons are loaded from each site's own `/favicon.ico` rather than from a
favicon service, so the list of places you bookmark isn't handed to a third
party. Sites without one fall back to an initial-letter tile.

## Adding a command

Commands are data, not code — add an entry to `sites` in
[`src/commands.js`](src/commands.js):

```js
mdn: { group: 'Code', name: 'MDN web docs', url: 'https://developer.mozilla.org', query: '/search?q=' },
```

Pick one strategy: `query` (args become a search string), `path` (args become
URL path segments), `routes` (fixed sub-pages keyed by the first arg), or `run`
for full control. A command with none of them always opens its base URL.
`group` only decides which section of the help screen it lands in — add new
group names to `groupOrder` to control their order.

## Layout

```
index.html
styles.css
src/
  main.js        wiring and global key handling
  tabs.js        start / horizon view switching
  clock.js       the time and date
  terminal.js    input parsing, history, tab-completion, help
  commands.js    the command table
  bookmarks.js   rendering, filtering, the add dialog
  store.js       localStorage persistence
  seed.js        default bookmarks
  horizon.js     the task board
```

## The horizon board

Five columns — Today, Week, Month, Year, Someday — each a bucket for how far
out a task sits rather than a status. Add from the toolbar (pick the column
from the select) or from the `+ New task` button inside a column.

On a narrow screen the board gives each column the full width and snaps, so a
swipe always lands on a whole column instead of halfway between two. Wider
screens show all five side by side.

A task is a markdown document: the `# heading` is the title shown in the list,
everything under it is the note. Click a task to expand it, click the note to
edit it; new tasks are stamped with a `created:` date and a `horizon:` code
(`D20260816`, `W33`, `M08`, `Y2026`, `S`).

Tasks live in `localStorage` under `horizon-tasks` — the same key the
standalone board used, so an existing board carries over untouched.

### AI plans

The robot button, when armed, asks Claude to break a new task into a checklist
and appends it to the note. For a *Year* task that is one line per remaining
month, for *Month* one per remaining week, for *Week* one per remaining day;
anything else gets three to six steps.

It calls the Anthropic API straight from the browser with a key you paste into
*AI key* in the bottom-right. The key is stored in `localStorage`
(`horizon-ai-key`) on your machine only — but browser-side calls do expose it
to any script running on the page, so use a key you are willing to rotate.
