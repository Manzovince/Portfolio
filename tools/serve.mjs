// Local preview server: serves the repo with the same URL routing as .htaccess.
// Usage: node tools/serve.mjs [port]   (default 8940)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 8940);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4',
  '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.glb': 'model/gltf-binary',
};

const isFile = (p) => stat(join(ROOT, p)).then((s) => s.isFile(), () => false);
const isDir = (p) => stat(join(ROOT, p)).then((s) => s.isDirectory(), () => false);

// Returns { redirect } or { file } (repo-relative path) or null for a 404.
async function route(path) {
  let m;
  if ((m = path.match(/^\/dictee(\/.*)?$/))) return { redirect: '/salve/' };
  if ((m = path.match(/^\/recif-hexagonal(\/.*)?$/))) return { redirect: '/recif/' };
  if ((m = path.match(/^\/+(?:pages|apps|lab)\/(.*)$/))) return { redirect: '/' + m[1] };
  if (/^\/(?:tools\/|README\.md$|package\.json$|\.git)/.test(path)) return null;

  if ((m = path.match(/^\/assets\/([^/]+)$/))) {
    if (await isFile(`assets/img/${m[1]}`)) return { redirect: `/assets/img/${m[1]}` };
    if (await isFile(`assets/icons/${m[1]}`)) return { redirect: `/assets/icons/${m[1]}` };
  }
  if ((m = path.match(/^\/([\w-]+)\.html$/)) && (await isFile(`pages/${m[1]}.html`))) return { file: `pages/${m[1]}.html` };

  if ((m = path.match(/^\/([\w-]+)$/)) && ((await isDir(`apps/${m[1]}`)) || (await isDir(`lab/${m[1]}`)))) {
    return { redirect: `/${m[1]}/` };
  }
  let file = path.slice(1);
  if ((m = path.match(/^\/([\w-]+)\/(.*)$/))) {
    if (await isDir(`apps/${m[1]}`)) file = `apps/${m[1]}/${m[2]}`;
    else if (await isDir(`lab/${m[1]}`)) file = `lab/${m[1]}/${m[2]}`;
  }
  if (file === '' || file.endsWith('/')) file += 'index.html';
  return (await isFile(file)) ? { file } : null;
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = normalize(decodeURIComponent(url.pathname));
  const hit = await route(path);
  if (hit?.redirect) {
    res.writeHead(301, { Location: hit.redirect + url.search }).end();
  } else {
    const file = hit?.file ?? 'pages/404.html';
    res.writeHead(hit ? 200 : 404, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(join(ROOT, file)));
  }
  console.log(res.statusCode, req.url);
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
