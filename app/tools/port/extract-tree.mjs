// One-off port tool (step 2 of PLAN.md).
// Parses the <x-dc> template of "Visual Notebook.dc.html" in a real browser,
// using the same pre-processing as the old dc-runtime (support.js: encodeCase),
// and writes the resulting element tree as JSON. gen-jsx.mjs turns it into JSX.
//
// Usage: node tools/port/extract-tree.mjs <path to .dc.html> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
// Playwright is not an app dependency; it is resolved from the environment.
const { chromium } = createRequire(import.meta.url)('playwright');

const [src, out] = process.argv.slice(2);
const html = readFileSync(src, 'utf8');
const open = /<x-dc(?:\s[^>]*)?>/.exec(html);
const template = html.slice(open.index + open[0].length, html.lastIndexOf('</x-dc>'));

// Same steps as support.js encodeCase(): helmet rename, camelCase attribute
// encoding (the HTML parser lower-cases attribute names) and raw-wrapping of
// table/select tags (so <sc-for> inside <select> survives parsing).
const CAMEL_ATTR = 'sc-camel-';
const RAW_WRAP = { select: 'sc-raw-select', table: 'sc-raw-table', tbody: 'sc-raw-tbody', thead: 'sc-raw-thead', tfoot: 'sc-raw-tfoot', tr: 'sc-raw-tr', td: 'sc-raw-td', th: 'sc-raw-th', caption: 'sc-raw-caption' };
let enc = template;
enc = enc.replace(/<helmet(\s|>)/gi, '<sc-helmet$1').replace(/<\/helmet\s*>/gi, '</sc-helmet>');
enc = enc.replace(/(\s)([a-z]+[A-Z][A-Za-z0-9]*)(\s*=)/g, (_, sp, name, eq) => sp + CAMEL_ATTR + name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + eq);
for (const [real, alias] of Object.entries(RAW_WRAP)) enc = enc.replace(new RegExp('(</?)' + real + '(?=[\\s>])', 'gi'), '$1' + alias);

const browser = await chromium.launch();
const page = await browser.newPage();
const tree = await page.evaluate(({ enc, CAMEL_ATTR, RAW_WRAP }) => {
  const unwrap = Object.fromEntries(Object.entries(RAW_WRAP).map(([k, v]) => [v, k]));
  const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const tpl = document.createElement('template');
  tpl.innerHTML = enc;
  const walk = (n) => {
    if (n.nodeType === Node.TEXT_NODE) return { type: 'text', value: n.nodeValue };
    if (n.nodeType !== Node.ELEMENT_NODE) return null;
    const tag = unwrap[n.localName] || n.localName;
    const attrs = [...n.attributes].map(a => [a.name.startsWith(CAMEL_ATTR) ? camel(a.name.slice(CAMEL_ATTR.length)) : a.name, a.value]);
    if (tag === 'sc-helmet') return { type: 'helmet', html: n.innerHTML };
    return { type: 'el', tag, attrs, children: [...n.childNodes].map(walk).filter(Boolean) };
  };
  return [...tpl.content.childNodes].map(walk).filter(Boolean);
}, { enc, CAMEL_ATTR, RAW_WRAP });
await browser.close();
writeFileSync(out, JSON.stringify(tree, null, 1));
console.log('wrote', out);
