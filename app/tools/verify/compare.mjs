// Side-by-side check of the port against the deployed reference build.
//
// Loads claude_code_handoff/source/index.html (the old, live app) and app/dist
// (the new build) in Chromium with identical localStorage, a frozen clock and a
// seeded Math.random, drives both through the same scenarios and compares
//   1. the normalised DOM under #dc-root, and
//   2. screenshots, pixel by pixel.
// It also checks that share links (#view=) made by either version open in both.
//
// Usage (after `npm run build`): node tools/verify/compare.mjs [scenario-name-filter]
// Output: tools/verify/out/<scenario>-{old,new,diff}.png and a summary on stdout.
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { storage as FIXTURE, T0 } from './fixture.mjs';

const { chromium } = createRequire(import.meta.url)('playwright'); // from the environment, not an app dependency
const here = dirname(fileURLToPath(import.meta.url));
const OLD_DIR = join(here, '../../../claude_code_handoff/source');
const NEW_DIR = join(here, '../../dist');
const OUT = join(here, 'out');
mkdirSync(OUT, { recursive: true });
const filter = process.argv[2] || '';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.map': 'application/json', '.svg': 'image/svg+xml' };
const serve = (dir, port) => new Promise((res) => {
  const srv = createServer((req, rsp) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = join(dir, p);
    if (!f.startsWith(dir) || !existsSync(f) || !statSync(f).isFile()) { rsp.writeHead(404); rsp.end(); return; }
    rsp.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    rsp.end(readFileSync(f));
  }).listen(port, () => res(srv));
});

// Runs in the page before any app code: same data, same time, same randomness.
const initScript = ({ storage, T0, seed }) => {
  if (!sessionStorage.getItem('__seeded')) {
    localStorage.clear();
    Object.entries(storage).forEach(([k, v]) => localStorage.setItem(k, v));
    sessionStorage.setItem('__seeded', '1');
  }
  const RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(T0); } static now() { return T0; } }
  FD.UTC = RD.UTC; FD.parse = RD.parse;
  window.Date = FD;
  let t = seed >>> 0;
  // Libraries may draw random numbers at start-up a different number of times,
  // so scenarios re-seed right before they run (window.__reseed).
  window.__reseed = (s) => { t = s >>> 0; };
  Math.random = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; };
};

const normDom = () => {
  const root = document.querySelector('#dc-root');
  if (!root) return '(no #dc-root)';
  const out = [];
  const walk = (n, d) => {
    if (n.nodeType === 3) { if (n.nodeValue.trim()) out.push('  '.repeat(d) + JSON.stringify(n.nodeValue)); return; }
    if (n.nodeType !== 1) return;
    const attrs = [...n.attributes].filter(a => a.name !== 'data-dc-tpl' && a.name !== 'data-sc-name').map(a => {
      if (a.name === 'class') { const v = a.value.split(/\s+/).filter(c => c && c !== 'sc-interp').join(' '); return v ? 'class=' + JSON.stringify(v) : null; }
      return a.name + '=' + JSON.stringify(a.value);
    }).filter(Boolean).sort();
    out.push('  '.repeat(d) + '<' + n.localName + (attrs.length ? ' ' + attrs.join(' ') : '') + '>');
    [...n.childNodes].forEach(c => walk(c, d + 1));
  };
  walk(root, 0);
  return out.join('\n');
};

const settle = async (page, ms = 700) => {
  await page.waitForSelector('.sc-host', { timeout: 15000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(ms);
};

const node = (page, label) => page.locator('[data-node]', { hasText: label }).first();
const tidy = (label) => async (p) => { await p.getByText('Tidy ▾').click(); await p.getByText(label).click(); await p.waitForTimeout(600); };
const exportItem = (label) => async (p) => { await p.getByText('Export ▾').click(); await p.getByText(label).click(); };

const aiUpload = (name, text) => async (p) => {
  await exportItem('Import mind map from AI…')(p);
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByText('Upload .json file…').click()]);
  await fc.setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
  await p.waitForTimeout(1200);
};
const AI_JSON = JSON.stringify({ title: 'Wool', categories: ['Fibres', 'Craft'], children: [
  { label: 'Fibres', subtitle: 'Where wool comes from', category: 'Fibres', tabs: [{ name: 'Overview', notes: '- Sheep\n- Alpaca\nSee [[Knitting]].', references: ['Doe J. Wool. 2019.'] }], children: [{ label: 'Merino', notes: 'Soft' }, { label: 'Shetland' }] },
  { label: 'Craft', category: 'Craft', children: [{ label: 'Knitting' }, { label: 'Felting', references: ['10.1000/felt'] }] },
  { label: 'Care', children: [{ label: 'Washing' }] }, { label: 'History' }],
  links: [{ from: 'Merino', to: 'Knitting', both: true, strength: 'thick' }] });
const DESKTOP = { width: 1400, height: 900 }, MOBILE = { width: 390, height: 844 };
const scenarios = [
  { name: 'initial' },
  { name: 'sidebar', run: (p) => p.getByText('☰ Maps').click() },
  { name: 'sidebar-search', run: async (p) => { await p.getByText('☰ Maps').click(); await p.getByPlaceholder('Search all maps').fill('sleep'); } },
  { name: 'dark', run: async (p) => { await p.getByText('☰ Maps').click(); await p.getByText('Dark mode').click(); } },
  { name: 'help', run: (p) => p.getByText('? Tips').click() },
  { name: 'tidy-menu', run: (p) => p.getByText('Tidy ▾').click() },
  { name: 'export-menu', run: (p) => p.getByText('Export ▾').click() },
  { name: 'legend', run: (p) => p.getByText('Categories').click() },
  { name: 'select-node', run: (p) => node(p, 'Light exposure').click() },
  { name: 'expand-collapsed', run: (p) => p.locator('[title="Expand downstream boxes"]').click() },
  { name: 'modal-notes', run: (p) => node(p, 'Sleep').dblclick() },
  { name: 'modal-refs', run: async (p) => { await node(p, 'Sleep').dblclick(); await p.locator('[data-float="modal"] button', { hasText: /^References$/ }).click(); } },
  { name: 'modal-tabs', run: (p) => node(p, 'Psychology').dblclick() },
  { name: 'edge-panel', run: (p) => p.locator('circle[r="8"]').first().dispatchEvent('pointerdown') },
  { name: 'map-search', run: async (p) => { await p.keyboard.press('Control+f'); await p.waitForTimeout(100); await p.keyboard.type('stress'); } },
  { name: 'refs-panel', run: (p) => p.locator('button', { hasText: /^References$/ }).first().click() },
  { name: 'ai-dialog', run: exportItem('Import mind map from AI…') },
  { name: 'ai-import-json', run: aiUpload('mindmap.json', AI_JSON) },
  { name: 'ai-import-outline', run: aiUpload('outline.md', '# Garden\n## Vegetables\n- Tomato\n- Bean\n  - Runner\n## Flowers\nNotes about flowers\n- Rose') },
  { name: 'follow-link', run: (p) => p.getByText('↪ Social life').click() },
  { name: 'tidy-both', run: tidy('⟷  Mind map (both sides)') },
  { name: 'tidy-right', run: tidy('→  Left to right') },
  { name: 'tidy-down', run: tidy('↓  Top to bottom') },
  { name: 'tidy-radial', run: tidy('◎  Radial') },
  { name: 'tidy-random', run: tidy('⚄  Random shape') },
  // Mouse stays pressed, so the screenshot shows snapping guides mid-drag.
  { name: 'drag-snap', run: async (p) => { const b = await node(p, 'Family').boundingBox(); await p.mouse.move(b.x + 40, b.y + 20); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(b.x + 40 + i * 3, b.y + 20 - i * 6.1); await p.waitForTimeout(20); } } },
  { name: 'drag-drop', run: async (p) => { const b = await node(p, 'Exercise').boundingBox(); await p.mouse.move(b.x + 40, b.y + 20); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(b.x + 40 + i * 20, b.y + 20 - i * 3); await p.waitForTimeout(20); } await p.mouse.up(); } },
  { name: 'marquee-select', run: async (p) => { await p.keyboard.down('Shift'); await p.mouse.move(100, 450); await p.mouse.down(); await p.mouse.move(300, 720, { steps: 8 }); await p.mouse.up(); await p.keyboard.up('Shift'); } },
  { name: 'add-box', run: async (p) => { await p.getByText('Add box').click(); await p.keyboard.type('Hello'); await p.keyboard.press('Enter'); } },
  { name: 'undo-after-tidy', run: async (p) => { await tidy('↓  Top to bottom')(p); await p.getByTitle('Undo (Ctrl+Z)').click(); await p.waitForTimeout(300); } },
  { name: 'welcome', storage: (s) => { const c = { ...s }; delete c['visual-notebook.welcomeSkip']; return c; }, wait: 1500 },
  { name: 'mobile', viewport: MOBILE },
  { name: 'mobile-sidebar', viewport: MOBILE, run: (p) => p.getByText('☰ Maps').click() },
  { name: 'mobile-tools', viewport: MOBILE, run: (p) => p.getByText('Tools ▾').click() },
  { name: 'mobile-modal', viewport: MOBILE, run: (p) => node(p, 'Biology').dblclick() }
].filter(s => s.name.includes(filter));

const OLD = 'http://localhost:8101/index.html', NEW = 'http://localhost:8102/';
const browser = await chromium.launch();

// PDF export loads jsPDF 2.5.1 from cdnjs. If JSPDF points to a local copy of that
// file (e.g. from `npm pack jspdf@2.5.1`), both versions get it from there.
const JSPDF = process.env.JSPDF;
const open = async (url, sc) => {
  const ctx = await browser.newContext({ viewport: sc.viewport || DESKTOP, locale: 'sv-SE', timezoneId: 'Europe/Stockholm', deviceScaleFactor: 1 });
  if (JSPDF) await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(JSPDF) }));
  await ctx.addInitScript(initScript, { storage: sc.storage ? sc.storage(FIXTURE) : FIXTURE, T0, seed: 12345 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await settle(page, sc.wait);
  return { ctx, page, errors };
};

// Pixel diff in the browser (no extra npm dependencies needed).
const diffPage = await (await browser.newContext()).newPage();
const pixelDiff = (a, b) => diffPage.evaluate(async ({ a, b }) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  if (ia.width !== ib.width || ia.height !== ib.height) return { size: true, count: -1 };
  const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
  const x = c.getContext('2d');
  x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height);
  x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height);
  const out = x.createImageData(c.width, c.height); let count = 0;
  for (let i = 0; i < da.data.length; i += 4) {
    const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
    if (d > 8) { count++; out.data[i] = 255; out.data[i + 3] = 255; } else { out.data[i] = out.data[i + 1] = out.data[i + 2] = da.data[i] / 3 + 170; out.data[i + 3] = 255; }
  }
  x.putImageData(out, 0, 0);
  return { count, png: c.toDataURL('image/png').split(',')[1] };
}, { a: a.toString('base64'), b: b.toString('base64') });

const firstDiff = (a, b) => {
  const A = a.split('\n'), B = b.split('\n');
  for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) return 'line ' + (i + 1) + '\n  old: ' + (A[i] || '(end)').slice(0, 300) + '\n  new: ' + (B[i] || '(end)').slice(0, 300);
  return null;
};

const s1 = await serve(OLD_DIR, 8101), s2 = await serve(NEW_DIR, 8102);
let failures = 0;
for (const sc of scenarios) {
  const res = {};
  for (const [k, url] of [['old', OLD], ['new', NEW]]) {
    const o = await open(url, sc);
    try { await o.page.evaluate(() => window.__reseed(777)); if (sc.run) await sc.run(o.page); } catch (err) { o.errors.push('scenario step failed: ' + err.message.split('\n')[0]); }
    await o.page.waitForTimeout(400);
    res[k] = { dom: await o.page.evaluate(normDom), shot: await o.page.screenshot(), errors: o.errors };
    writeFileSync(join(OUT, sc.name + '-' + k + '.png'), res[k].shot);
    await o.ctx.close();
  }
  const domDiff = firstDiff(res.old.dom, res.new.dom);
  const px = await pixelDiff(res.old.shot, res.new.shot);
  if (px.png) writeFileSync(join(OUT, sc.name + '-diff.png'), Buffer.from(px.png, 'base64'));
  const ok = !domDiff && px.count === 0 && !res.new.errors.length;
  if (!ok) failures++;
  console.log((ok ? 'OK  ' : 'FAIL') + ' ' + sc.name.padEnd(18) + ' dom:' + (domDiff ? 'DIFF' : 'same') + ' pixels:' + px.count + (res.new.errors.length ? ' errors(new): ' + res.new.errors.join(' | ') : '') + (res.old.errors.length ? ' errors(old): ' + res.old.errors.join(' | ') : ''));
  if (domDiff) console.log('     ' + domDiff.replace(/\n/g, '\n     '));
}

// Share links: a #view= code made by one version must open in the other.
if ('share'.includes(filter) || !filter) {
  const codes = {};
  for (const [k, url] of [['old', OLD], ['new', NEW]]) {
    const o = await open(url, { name: 'share' });
    await exportItem('Share read-only link…')(o.page);
    await o.page.waitForFunction(() => { const i = document.querySelector('input[readonly]'); return i && i.value.includes('#view='); }, null, { timeout: 10000 });
    codes[k] = (await o.page.locator('input[readonly]').inputValue()).split('#view=')[1];
    await o.ctx.close();
  }
  console.log((codes.old === codes.new ? 'OK  ' : 'FAIL') + ' share-code        identical #view= code from both versions (' + codes.old.length + ' chars)');
  if (codes.old !== codes.new) failures++;
  for (const from of ['old', 'new']) {
    const shots = {};
    for (const [k, url] of [['old', OLD], ['new', NEW]]) {
      const ctx = await browser.newContext({ viewport: DESKTOP, locale: 'sv-SE', timezoneId: 'Europe/Stockholm' });
      await ctx.addInitScript(initScript, { storage: FIXTURE, T0, seed: 1 });
      const page = await ctx.newPage();
      await page.goto(url + '#view=' + codes[from]);
      await page.waitForSelector('#surf .node', { timeout: 15000 });
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
      shots[k] = await page.screenshot();
      writeFileSync(join(OUT, 'viewer-' + from + 'code-' + k + '.png'), shots[k]);
      await ctx.close();
    }
    const px = await pixelDiff(shots.old, shots.new);
    console.log((px.count === 0 ? 'OK  ' : 'FAIL') + ' viewer(' + from + ' link) old app vs new app, pixels:' + px.count);
    if (px.count !== 0) failures++;
  }
}

// Exports: the downloaded files must be byte-identical.
if ('export'.includes(filter) || !filter) {
  const exportsToCheck = [
    ['word-map', async (p) => { await p.getByText('Export ▾').click(); await p.getByText('Word document (.doc)').first().click(); }],
    ['word-all', async (p) => { await p.getByText('Export ▾').click(); await p.getByText('Word document (.doc)').nth(1).click(); }],
    ['pdf-map', async (p) => { await p.getByText('Export ▾').click(); await p.getByText('PDF', { exact: true }).first().click(); }],
    ['pdf-all', async (p) => { await p.getByText('Export ▾').click(); await p.getByText('PDF', { exact: true }).nth(1).click(); }],
    ['html-map', (p) => exportItem('Interactive map (.html)')(p)],
    ['backup', (p) => exportItem('Download backup of everything')(p)],
    ['word-box', async (p) => { await node(p, 'Psychology').dblclick(); await p.getByTitle('Download this box as a Word document').click(); }],
    ['pdf-box', async (p) => { await node(p, 'Sleep').dblclick(); await p.getByTitle('Save this box as a PDF').click(); }]
  ].filter(([n]) => !filter || ('export-' + n).includes(filter));
  for (const [name, act] of exportsToCheck) {
    const files = {};
    for (const [k, url] of [['old', OLD], ['new', NEW]]) {
      const o = await open(url, { name });
      await o.page.evaluate(() => window.__reseed(99));
      const [dl] = await Promise.all([o.page.waitForEvent('download', { timeout: 20000 }), act(o.page)]);
      files[k] = { name: dl.suggestedFilename(), data: readFileSync(await dl.path()) };
      writeFileSync(join(OUT, 'export-' + name + '-' + k + '-' + files[k].name), files[k].data);
      await o.ctx.close();
    }
    const same = files.old.name === files.new.name && files.old.data.equals(files.new.data);
    console.log((same ? 'OK  ' : 'FAIL') + ' export-' + name.padEnd(11) + ' ' + files.new.name + ' (' + files.new.data.length + ' bytes)' + (same ? ' identical' : ' DIFFERS from old (' + files.old.name + ', ' + files.old.data.length + ' bytes)'));
    if (!same) failures++;
  }
}

// Sync: both versions log in against the same simulated Supabase (requests are
// intercepted, nothing reaches the network). The REST calls they make, the
// resulting localStorage and the screen must be identical.
if ('sync'.includes(filter) || !filter) {
  const SB = 'https://xkfnazerlmwfdqkntfbs.supabase.co';
  const user = { id: 'u-123', aud: 'authenticated', role: 'authenticated', email: 'test@example.com' };
  const fixIdx = JSON.parse(FIXTURE['visual-notebook.index']);
  const rows = [
    // newer on the server: replaces the local copy
    { key: 'visual-notebook.map.m2', updated_at: T0 + 5000, value: JSON.stringify({ nodes: [{ id: 'a1', label: 'Social life (server)', x: -113, y: -40, main: true }], edges: [], frames: [], tx: 600, ty: 380, scale: 1 }) },
    { key: 'visual-notebook.index', updated_at: T0 + 5000, value: JSON.stringify(Object.assign({}, fixIdx, { maps: fixIdx.maps.concat([{ id: 'm3', title: 'From phone', updated: T0 }]) })) },
    // only on the server: written locally
    { key: 'visual-notebook.map.m3', updated_at: T0 + 4000, value: JSON.stringify({ nodes: [{ id: 'b1', label: 'From phone', x: -113, y: -40, main: true }], edges: [] }) }
  ];
  const results = {};
  for (const [k, url] of [['old', OLD], ['new', NEW]]) {
    const ctx = await browser.newContext({ viewport: DESKTOP, locale: 'sv-SE', timezoneId: 'Europe/Stockholm' });
    await ctx.addInitScript(initScript, { storage: FIXTURE, T0, seed: 5 });
    const calls = [];
    await ctx.route(SB + '/**', async (route) => {
      const r = route.request(), u = new URL(r.url());
      let body = r.postData() || '';
      try { body = JSON.stringify(JSON.parse(body)); } catch (e) {}
      calls.push(r.method() + ' ' + u.pathname + u.search + (body ? ' ' + body : ''));
      if (u.pathname === '/auth/v1/token') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'x.eyJzdWIiOiJ1LTEyMyJ9.y', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(T0 / 1000) + 3600, refresh_token: 'r1', user }) });
      if (u.pathname === '/rest/v1/notebook_items' && r.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      if (u.pathname === '/rest/v1/notebook_items') return route.fulfill({ status: r.method() === 'DELETE' ? 204 : 201, contentType: 'application/json', body: r.method() === 'DELETE' ? '' : '[]' });
      return route.fulfill({ status: 404, body: '{}' });
    });
    const page = await ctx.newPage();
    await page.goto(url); await settle(page);
    await page.getByText('☰ Maps').click();
    await page.getByText('Sign in to sync').click();
    await page.getByPlaceholder('Email').fill(user.email);
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByText('Log in', { exact: true }).click();
    await page.waitForTimeout(4000);
    const store = await page.evaluate(() => Object.keys(localStorage).sort().filter(k => !k.startsWith('sb-')).map(k => k + '=' + localStorage.getItem(k)).join('\n'));
    results[k] = { calls: calls.join('\n'), store, shot: await page.screenshot() };
    writeFileSync(join(OUT, 'sync-' + k + '.png'), results[k].shot);
    await ctx.close();
  }
  const cd = firstDiff(results.old.calls, results.new.calls), sd = firstDiff(results.old.store, results.new.store);
  const px = await pixelDiff(results.old.shot, results.new.shot);
  const ok = !cd && !sd && px.count === 0 && results.new.calls.includes('POST /rest/v1/notebook_items');
  console.log((ok ? 'OK  ' : 'FAIL') + ' sync               requests:' + (cd ? 'DIFF' : 'same (' + results.new.calls.split('\n').length + ')') + ' localStorage:' + (sd ? 'DIFF' : 'same') + ' pixels:' + px.count);
  if (cd) console.log('     ' + cd.replace(/\n/g, '\n     '));
  if (sd) console.log('     ' + sd.replace(/\n/g, '\n     '));
  writeFileSync(join(OUT, 'sync-calls.txt'), results.new.calls);
  if (!ok) failures++;
}

await browser.close(); s1.close(); s2.close();
console.log(failures ? '\n' + failures + ' check(s) differ' : '\nAll checks identical');
process.exit(failures ? 1 : 0);
