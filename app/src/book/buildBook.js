// The current map as a book (the "Read as notebook" view):
//   page 0      the main topic (its notes and a list of chapters)
//   page 1..n   one chapter per main branch; the boxes below it are numbered
//               sections (1.1, 1.1.1, …), a box's tabs become a tabset,
//               arrows with notes are listed under "Connections" and the
//               references cited in the chapter are numbered at its end.
// Pure: map data in, HTML strings and tables of contents out.
import { docTree } from '../export/docTree.js';
import { pagesOf, pageIdxOf, allNotes } from '../model/storage.js';
import { parseRefs, refKey } from '../text/refs.js';
import { LINK_RE } from '../text/links.js';
import { escH } from '../text/markdown.js';
import { inlineHtml, blockHtml, catHtml } from './bookMarkdown.js';

export const cleanLabel = (t) => String(t || '').replace(LINK_RE, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\s][^*]*)\*/g, '$1').replace(/\s+/g, ' ').trim() || 'Untitled';
const oneLine = (t) => String(t || 'Untitled').replace(/\s*\n\s*/g, ' ');
const num = (s) => (s ? '<span class="bk-num">' + escH(s) + '</span>' : '');

// Read-only HTML of one block (the view renders the same markup with React,
// so it can turn a box into an editor).
export function blockToHtml(b) {
  if (b.type === 'html') return b.html;
  const tag = 'h' + b.level, open = b.level === 1 ? '<header class="bk-title" id="bk-' + escH(b.id) + '">' : '<section class="bk-sec bk-l' + b.level + '" id="bk-' + escH(b.id) + '">';
  const tabs = b.tabs ? '<div class="bk-tabs" role="tablist">' + b.tabs.map(t => '<button type="button" role="tab" data-tab="' + t.i + '"' + (t.i === b.active ? ' class="on"' : '') + '>' + escH(t.name) + '</button>').join('') + '</div>' : '';
  return open + '<' + tag + ' class="bk-h">' + num(b.num) + '<span>' + b.titleHtml + '</span></' + tag + '>' + b.catHtml + (b.sub.trim() ? '<p class="bk-sub">' + escH(b.sub.trim()) + '</p>' : '')
    + (b.level === 1 ? '</header>' : '') + tabs + '<div class="bk-body">' + b.bodyHtml + '</div>' + (b.level === 1 ? '' : '</section>');
}

export function buildBook({ nodes, edges, cats }) {
  nodes = nodes || []; edges = edges || [];
  const byId = {}; nodes.forEach(n => { byId[n.id] = n; });
  const catById = {}; (cats || []).forEach(c => { catById[c.id] = c; });
  // The notebook's own sibling order: a box may store bookOrder = [child ids].
  // Children not in that list keep the default order, after the listed ones.
  // Positions on the map are not used for this, so the map never changes.
  const orderKids = (pid, ids) => {
    const o = byId[pid] && byId[pid].bookOrder;
    if (!Array.isArray(o) || !o.length) return ids;
    const rank = (x) => { const i = o.indexOf(x); return i < 0 ? Infinity : i; };
    return ids.slice().sort((a, b) => (rank(a) - rank(b)) || (ids.indexOf(a) - ids.indexOf(b)));
  };
  const tree = docTree(nodes, edges, 0, false, orderKids);
  if (!tree.main) return null;

  // Split the reading order into pages: each depth-1 item starts a chapter.
  const pages = [{ box: tree.main, num: '', items: [], parent: null }];
  tree.items.forEach(it => { if (it.depth === 1) pages.push({ box: it.n, num: it.num, items: [], parent: it.parent }); else pages[pages.length - 1].items.push(it); });
  const pageOf = {};
  pages.forEach((p, i) => { pageOf[p.box.id] = i; p.items.forEach(it => { pageOf[it.n.id] = i; }); });

  const label = (id) => (byId[id] ? cleanLabel(byId[id].label) : 'Deleted box');
  const has = (id) => pageOf[id] != null;
  const searchText = (t) => String(t || '').replace(LINK_RE, (m, id) => label(id));

  const built = pages.map((p, pi) => {
    // References are numbered per page, in order of first citation.
    const bank = [], seen = {};
    const add = (r) => { const k = refKey(r.text); if (seen[k] == null) { seen[k] = bank.length + 1; bank.push(r); } return seen[k]; };
    const ctxFor = (refsTxt) => { const loc = parseRefs(refsTxt); return { label, has, cite: (n) => (loc[n - 1] ? add(loc[n - 1]) : null), rest: () => loc.forEach(add) }; };
    const noRefs = { label, has, cite: () => null };

    const blocks = [], toc = [], search = [];
    const boxBlock = (n, level, numStr, addKind) => {
      const tabs = pagesOf(n), active = pageIdxOf(n);
      // All tabs are rendered so their references get numbers; the active tab is shown.
      const htmls = tabs.map(t => { const c = ctxFor(t.refs); const h = blockHtml(t.notes, n.images, c); c.rest(); return h; });
      blocks.push({
        type: 'box', id: n.id, level, num: numStr, label: n.label || '', sub: n.sub || '', add: addKind,
        titleHtml: inlineHtml(oneLine(n.label), noRefs), catHtml: catHtml(catById[n.cat]),
        tabs: tabs.length > 1 ? tabs.map((t, i) => ({ i, name: t.name || 'Tab ' + (i + 1) })) : null,
        active, bodyHtml: htmls[active] || ''
      });
      search.push({ anchor: 'bk-' + n.id, num: numStr, title: label(n.id), text: [label(n.id), n.sub || '', searchText(allNotes(n))].join('\n') });
    };

    boxBlock(p.box, 1, p.num, pi === 0 ? 'Chapter' : 'Section');
    if (pi === 0 && pages.length > 1) {
      blocks.push({ type: 'html', html: '<nav class="bk-contents"><h2>Chapters</h2><ol>' + pages.slice(1).map((c, ci) => '<li><a href="#" data-page="' + (ci + 1) + '">' + num(c.num) + '<span>' + escH(label(c.box.id)) + '</span></a>' + (c.box.sub ? '<span class="bk-contents-sub">' + escH(c.box.sub) + '</span>' : '') + '</li>').join('') + '</ol></nav>' });
    }
    p.items.forEach(it => {
      const lvl = Math.min(4, it.depth);
      boxBlock(it.n, lvl, it.num, 'Subsection');
      toc.push({ id: 'bk-' + it.n.id, box: it.n.id, parent: it.parent, num: it.num, title: label(it.n.id), level: lvl });
    });

    const conn = edges.filter(e => e.notes && e.notes.trim() && pageOf[e.from] === pi && byId[e.to]);
    if (conn.length) {
      const id = 'bk-conn-' + pi;
      const ref = (x) => '<a href="#" class="bk-xref" data-box="' + escH(x) + '">' + escH(label(x)) + '</a>';
      blocks.push({ type: 'html', html: '<section class="bk-sec bk-l2" id="' + id + '"><h2 class="bk-h">Connections</h2>' + conn.map(e => '<div class="bk-conn"><p class="bk-conn-t">' + ref(e.from) + (e.both ? ' ↔ ' : ' → ') + ref(e.to) + '</p>' + blockHtml(e.notes, null, noRefs) + '</div>').join('') + '</section>' });
      toc.push({ id, num: '', title: 'Connections', level: 2 });
      conn.forEach(e => search.push({ anchor: id, num: '', title: label(e.from) + (e.both ? ' ↔ ' : ' → ') + label(e.to), text: e.notes }));
    }
    if (bank.length) {
      const id = 'bk-refs-' + pi;
      blocks.push({ type: 'html', html: '<section class="bk-sec bk-l2 bk-refs" id="' + id + '"><h2 class="bk-h">References</h2><ol>' + bank.map((r, i) => '<li id="bk-ref-' + pi + '-' + (i + 1) + '">' + (r.href ? '<a href="' + escH(r.href) + '" target="_blank" rel="noopener noreferrer">' + escH(r.text) + '</a>' : escH(r.text)) + '</li>').join('') + '</ol></section>' });
      toc.push({ id, num: '', title: 'References', level: 2 });
      bank.forEach(r => search.push({ anchor: id, num: '', title: 'References', text: r.text }));
    }
    return { id: p.box.id, parent: p.parent, num: p.num, title: label(p.box.id), blocks, html: blocks.map(blockToHtml).join(''), toc, search };
  });

  return { title: label(tree.main.id), pages: built, pageOf };
}

// Matches in all pages: [{ page, anchor, num, title, snippet }].
export function searchBook(book, query, limit = 40) {
  const q = String(query || '').trim().toLowerCase();
  if (!book || !q) return [];
  const out = [];
  book.pages.forEach((p, page) => p.search.forEach(s => {
    if (out.length >= limit) return;
    const t = s.text.replace(/\s+/g, ' '), i = t.toLowerCase().indexOf(q);
    if (i < 0) return;
    const a = Math.max(0, i - 40);
    out.push({ page, anchor: s.anchor, num: s.num, title: s.title, snippet: (a ? '…' : '') + t.slice(a, i + q.length + 60) + (i + q.length + 60 < t.length ? '…' : '') });
  }));
  return out;
}
