// "Download as HTML" in the notebook view: the book (book/buildBook.js) as one
// self-contained .html file with the same look, that opens in any browser and
// works offline. Nothing is loaded from the internet; images are embedded.
import bookCss from '../styles/book.css?raw';
import { escH } from '../text/markdown.js';
import { bookRuntime } from './bookRuntime.js';

// A box with several tabs: all tabs are included and switched in the page.
function staticBlock(b) {
  if (b.type === 'html') return b.html;
  const num = b.num ? '<span class="bk-num">' + escH(b.num) + '</span>' : '';
  const head = '<h' + b.level + ' class="bk-h">' + num + '<span>' + b.titleHtml + '</span></h' + b.level + '>' + b.catHtml + (b.sub.trim() ? '<p class="bk-sub">' + escH(b.sub.trim()) + '</p>' : '');
  const shown = b.tabs ? b.tabs.filter(t => b.tabBodies[t.i]) : [];
  const body = shown.length > 1
    ? '<div class="bk-tabset"><div class="bk-tabs" role="tablist">' + shown.map(t => '<button type="button" role="tab" data-tab="' + t.i + '"' + (t.i === (shown.some(x => x.i === b.active) ? b.active : shown[0].i) ? ' class="on"' : '') + '>' + escH(t.name) + '</button>').join('') + '</div>'
      + shown.map(t => '<div class="bk-panel" data-panel="' + t.i + '"' + (t.i === (shown.some(x => x.i === b.active) ? b.active : shown[0].i) ? '' : ' hidden') + '>' + b.tabBodies[t.i] + '</div>').join('') + '</div>'
    : (shown.length === 1 ? b.tabBodies[shown[0].i] : b.bodyHtml);
  const id = 'bk-' + escH(b.id);
  return b.level === 1
    ? '<header class="bk-title" id="' + id + '">' + head + '</header>' + body
    : '<section class="bk-sec bk-l' + b.level + '" id="' + id + '">' + head + body + '</section>';
}

export function bookHtml(book) {
  const D = {
    title: book.title,
    pages: book.pages.map(p => ({ num: p.num, title: p.title, html: p.blocks.map(staticBlock).join(''), toc: p.toc.map(t => ({ id: t.id, num: t.num, title: t.title, level: t.level })) })),
    pageOf: book.pageOf,
    search: [].concat(...book.pages.map((p, i) => p.search.map(s => ({ page: i, anchor: s.anchor, num: s.num, title: s.title, text: s.text }))))
  };
  const data = JSON.stringify(D).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const extra = 'html,body{margin:0;height:100%;overflow:hidden}.bk{position:fixed}.bk-panel[hidden]{display:none}.bk-tabset{margin:0 0 1.2rem}.bk-tabs button{font-family:inherit}.bk-booktitle{text-decoration:none}';
  const SC = 'scr' + 'ipt';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + escH(book.title) + '</title><style>' + bookCss + extra + '</style></head><body>'
    + '<div class="bk"><aside class="bk-side"><a href="#p0" class="bk-booktitle">' + escH(book.title) + '</a>'
    + '<input class="bk-search" id="bk-q" type="search" placeholder="Search" aria-label="Search this notebook">'
    + '<div class="bk-results" id="bk-results" style="display:none"></div><nav class="bk-chapters" id="bk-nav"></nav></aside>'
    + '<div class="bk-mobilebar"><button type="button" id="bk-menu" aria-label="Chapters">☰</button><span id="bk-mtitle"></span></div>'
    + '<main class="bk-main"><article class="bk-content" id="bk-page"></article><nav class="bk-toc" id="bk-toc"></nav></main></div>'
    + '<' + SC + '>(' + bookRuntime.toString() + ')(' + data + ');</' + SC + '></body></html>';
}
