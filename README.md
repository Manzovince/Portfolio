# manzovince.com

Vincent Manzoni's portfolio and web experiments. Static site, no build step:
Hostinger deploys `main` to the web root within a minute of a push.

## Structure

```
.htaccess          URL routing (see below)
index.html         home page
robots.txt, sitemap.xml
assets/
  css/             site stylesheet
  js/              i18n + shared components (script.js), animations
  img/             project covers, showcase and og: images
  icons/           favicons, web manifest
pages/             project write-ups (apnea.html, web-piano.html, …) and 404.html
apps/              projects shown on the home page (apnea, web-piano, topography, …)
lab/               URL-only projects, listed behind a password at /coulisses
tools/serve.mjs    local preview server
```

Each folder in `apps/` and `lab/` is a self-contained app with its own
`index.html` and relative paths.

## URLs

Public URLs stay flat whatever folder a file lives in; `.htaccess` maps them:

| URL              | File                   |
| ---------------- | ---------------------- |
| `/apnea.html`    | `pages/apnea.html`     |
| `/apnea/…`       | `apps/apnea/…`         |
| `/crabes/…`      | `lab/crabes/…`         |

Direct hits on `/pages/…`, `/apps/…`, `/lab/…` redirect to the public URL, and
`tools/`, `README.md`, `package.json` return 404.

## Local preview

```bash
npm run dev
```

Serves on http://localhost:8940 with the same routing (`tools/serve.mjs`
mirrors `.htaccess`: change both together).

## Adding a project

1. Copy the app into `apps/<name>/` (home page) or `lab/<name>/` (URL-only).
   It is served at `/<name>/` straight away.
2. Home page project: add `pages/<name>.html`, its texts in
   `assets/js/script.js` (EN then FR), a tile in `#personal` of `index.html`,
   and both URLs in `sitemap.xml`.
3. Lab project: add it to the encrypted `/coulisses` list (source and build
   script live outside this public repo) and keep it out of the sitemap.

## Caching

Hostinger caches JS/CSS for 7 days: bump the `?v=` query on a stylesheet or
script, in every page that loads it, whenever its content changes.
