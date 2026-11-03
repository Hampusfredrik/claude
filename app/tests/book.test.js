import { describe, it, expect } from 'vitest';
import { buildBook, searchBook, cleanLabel } from '../src/book/buildBook.js';
import { inlineHtml, blockHtml } from '../src/book/bookMarkdown.js';

const n = (id, label, x, y, extra) => Object.assign({ id, label, x, y, notes: '', refs: '' }, extra);
const e = (id, from, to, extra) => Object.assign({ id, from, to, both: false, strength: 'thin' }, extra);
const map = () => ({
  nodes: [
    n('m', 'Wool', 0, 0, { main: true, notes: 'Intro to **wool**. See [[k]].' }),
    n('a', 'Fibres', 300, -100, { cat: 'c1', sub: 'Where wool comes from' }),
    n('a1', 'Merino', 600, -150, { notes: 'Soft [1] and warm [2]. Again [1].', refs: 'Doe J. Merino. 2019.\nhttps://example.org/fine' }),
    n('a2', 'Shetland', 600, -50, { pages: [{ id: 'p0', name: 'Overview', notes: 'Hardy.', refs: '' }, { id: 'p1', name: 'History', notes: 'Old breed.', refs: '' }], pageIdx: 0, notes: 'Hardy.' }),
    n('b', 'Craft', 300, 100),
    n('k', 'Knitting', 600, 100, { notes: '- needles\n  - circular\n1. cast on' })
  ],
  edges: [e('1', 'm', 'a'), e('2', 'a', 'a1'), e('3', 'a', 'a2'), e('4', 'm', 'b'), e('5', 'b', 'k'), e('x', 'a1', 'k', { notes: 'Merino is great for knitting.' })],
  cats: [{ id: 'c1', name: 'Animals', color: '#5f8a6e' }]
});

describe('buildBook', () => {
  const book = buildBook(map());
  it('makes the main topic page 0 and one chapter per main branch', () => {
    expect(book.title).toBe('Wool');
    expect(book.pages.map(p => [p.num, p.title])).toEqual([['', 'Wool'], ['1', 'Fibres'], ['2', 'Craft']]);
    expect(book.pageOf).toEqual({ m: 0, a: 1, a1: 1, a2: 1, b: 2, k: 2 });
  });
  it('numbers the boxes of a chapter as sections and lists them under "On this page"', () => {
    expect(book.pages[1].toc.map(t => [t.num, t.title, t.level])).toEqual([['1.1', 'Merino', 2], ['1.2', 'Shetland', 2], ['', 'Connections', 2], ['', 'References', 2]]);
    expect(book.pages[1].html).toContain('<section class="bk-sec bk-l2" id="bk-a1">');
  });
  it('links the chapters from the first page', () => {
    expect(book.pages[0].html).toContain('data-page="1"');
    expect(book.pages[0].html).toContain('Where wool comes from');
  });
  it('numbers references per chapter in order of citation and links the citations', () => {
    const h = book.pages[1].html;
    expect(h.match(/<sup class="bk-cite"><a href="#" data-ref="(\d)">/g)).toHaveLength(3);
    expect(h).toContain('<li id="bk-ref-1-1">Doe J. Merino. 2019.</li>');
    expect(h).toContain('<li id="bk-ref-1-2"><a href="https://example.org/fine"');
  });
  it('shows a box with several tabs as tabs, with the active tab\'s text', () => {
    const h = book.pages[1].html;
    expect(h).toContain('<button type="button" role="tab" data-tab="0" class="on">Overview</button><button type="button" role="tab" data-tab="1">History</button>');
    expect(h).toContain('<div class="bk-body"><p>Hardy.</p></div>');
    const m = map(); Object.assign(m.nodes[3], { pageIdx: 1, notes: 'Old breed.' });
    expect(buildBook(m).pages[1].blocks.find(b => b.id === 'a2')).toMatchObject({ active: 1, bodyHtml: '<p>Old breed.</p>' });
  });
  it('gives the view one block per box, so a single box can become an editor', () => {
    const blocks = book.pages[1].blocks;
    expect(blocks.filter(b => b.type === 'box').map(b => [b.id, b.level, b.num, b.add])).toEqual([['a', 1, '1', 'Section'], ['a1', 2, '1.1', 'Subsection'], ['a2', 2, '1.2', 'Subsection']]);
    expect(book.pages[0].blocks[0]).toMatchObject({ id: 'm', add: 'Chapter', label: 'Wool' });
    expect(blocks[0].sub).toBe('Where wool comes from');
  });
  it('keeps the subtitle exactly as typed (spaces included) for editing', () => {
    const m = map(); m.nodes[1].sub = 'Move ';
    const b = buildBook(m).pages[1].blocks[0];
    expect(b.sub).toBe('Move ');
    expect(buildBook(m).pages[1].html).toContain('<p class="bk-sub">Move</p>');
  });
  it('lists arrows with notes as connections and turns [[box]] into a link to its section', () => {
    expect(book.pages[1].html).toContain('Merino</a> → <a href="#" class="bk-xref" data-box="k">Knitting</a>');
    expect(book.pages[0].html).toContain('data-box="k">Knitting</a>');
  });
  it('shows the category of a chapter', () => {
    expect(book.pages[1].html).toContain('<span class="bk-cat"><i style="background:#5f8a6e"></i>Animals</span>');
  });
  it('returns null for an empty map', () => {
    expect(buildBook({ nodes: [], edges: [], cats: [] })).toBeNull();
  });
});

describe('escaping', () => {
  const ctx = { label: (id) => 'Box ' + id, has: (id) => id === 'ok', cite: () => null };
  it('escapes everything that comes from the map', () => {
    const map = { nodes: [n('m', '<img src=x onerror=alert(1)>', 0, 0, { main: true, notes: '<script>x</script> "q"', sub: '<b>' })], edges: [], cats: [{ id: 'c', name: 'x', color: 'red;background:url(x)' }] };
    map.nodes[0].cat = 'c';
    const h = buildBook(map).pages[0].html;
    expect(h).not.toMatch(/<img|<script|<b>/);
    expect(h).toContain('&lt;script&gt;x&lt;/script&gt; &quot;q&quot;');
    expect(h).toContain('background:#7e8091'); // unsafe colour replaced
  });
  it('only allows http(s) links and data:image pictures', () => {
    expect(inlineHtml('javascript:alert(1) and https://a.b/c.', ctx)).toBe('javascript:alert(1) and <a href="https://a.b/c" target="_blank" rel="noopener noreferrer">https://a.b/c</a>.');
    expect(blockHtml('[image:i1]', { i1: { d: 'javascript:x' } }, ctx)).toBe('');
  });
  it('marks links to boxes that are gone', () => {
    expect(inlineHtml('[[gone]]', ctx)).toBe('<span class="bk-xref missing">Box gone</span>');
  });
});

describe('markdown', () => {
  const ctx = { label: (id) => id, has: () => true, cite: (k) => (k === 1 ? 4 : null) };
  it('nests lists by indentation and mixes bullet and numbered lists', () => {
    expect(blockHtml('- a\n  - b\n- c\n1. d', null, ctx)).toBe('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul><ol><li>d</li></ol>');
  });
  it('renders headings in notes, paragraphs, bold and italic', () => {
    expect(blockHtml('# Head\nSome **b** and *i*\n\nNext', null, ctx)).toBe('<p class="bk-nh bk-nh1">Head</p><p>Some <strong>b</strong> and <em>i</em></p><p>Next</p>');
  });
  it('maps citation numbers to the chapter numbering', () => {
    expect(inlineHtml('x [1] y [2]', ctx)).toBe('x <sup class="bk-cite"><a href="#" data-ref="4">[4]</a></sup> y <sup class="bk-cite missing" title="No reference with this number">[2]</sup>');
  });
  it('cleans labels for the sidebar', () => {
    expect(cleanLabel('**Big**\n *idea* [[n1]]')).toBe('Big idea');
    expect(cleanLabel('')).toBe('Untitled');
  });
});

describe('searchBook', () => {
  const book = buildBook(map());
  it('finds text in notes, titles and connections with a snippet', () => {
    const r = searchBook(book, 'knitting');
    expect(r.map(x => [x.page, x.anchor])).toEqual([[0, 'bk-m'], [1, 'bk-conn-1'], [2, 'bk-k']]);
    expect(r[0].snippet).toContain('See Knitting');
  });
  it('returns nothing for an empty query', () => {
    expect(searchBook(book, '  ')).toEqual([]);
  });
});
