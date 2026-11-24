// Writes the English text of every data-i18n element straight into the HTML,
// so crawlers and link previews (LinkedIn, Slack…) see the content without
// running script.js. script.js still swaps it for French on load.
// Run after editing the texts in assets/js/script.js:  npm run prefill
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const src = readFileSync(join(ROOT, 'assets/js/script.js'), 'utf8');
const start = src.indexOf('const translations = {');
const end = src.indexOf('\n};', start);
const translations = new Function(`${src.slice(start, end + 3)}; return translations;`)();
const en = translations.en;

const files = ['index.html', ...readdirSync(join(ROOT, 'pages')).filter((f) => f.endsWith('.html')).map((f) => `pages/${f}`)];
const missing = new Set();

for (const file of files) {
  const path = join(ROOT, file);
  const html = readFileSync(path, 'utf8');
  let count = 0;
  const out = html
    // Element content
    .replace(/(<(\w+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (all, open, tag, key, inner, close) => {
      if (inner.includes(`<${tag}`)) return all; // nested same tag: leave it alone
      if (!(key in en)) { missing.add(key); return all; }
      if (inner === en[key]) return all;
      count++;
      return open + en[key] + close;
    })
    // Image descriptions
    .replace(/(<img\b[^>]*\sdata-i18n-alt="([^"]+)"[^>]*>)/g, (tag, _t, key) => {
      if (!(key in en)) return tag;
      const alt = en[key].replace(/"/g, '&quot;');
      const next = tag.replace(/\salt="[^"]*"/, ` alt="${alt}"`);
      if (next !== tag) count++;
      return next;
    });
  if (out !== html) writeFileSync(path, out);
  console.log(`${file}: ${count} updated`);
}
if (missing.size) console.warn('Keys with no English text:', [...missing].join(', '));
