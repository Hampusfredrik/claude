// The script inside a downloaded notebook (.html). It runs on its own in the
// reader's browser, so it must not use anything from outside this function.
// D = { title, pages: [{ num, title, html, toc: [{ id, num, title, level }] }],
//       pageOf: { boxId: page }, search: [{ page, anchor, num, title, text }] }
export function bookRuntime(D) {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const main = $('.bk-main'), content = $('#bk-page'), toc = $('#bk-toc'), nav = $('#bk-nav'), results = $('#bk-results'), q = $('#bk-q'), root = $('.bk');
  let pg = 0; const open = {};
  const name = (p) => (p.num ? p.num + ' ' : '') + p.title;

  function renderNav() {
    nav.innerHTML = D.pages.map((p, i) => {
      const subs = p.toc.filter((t) => t.num), isOpen = open[i] != null ? open[i] : i === pg;
      return '<div class="bk-chapter-group"><div class="bk-chapter-row' + (i === pg ? ' on' : '') + '"><span class="bk-grip-space"></span>'
        + '<a href="#p' + i + '" class="bk-chapter' + (i === pg ? ' on' : '') + '" data-go="' + i + '">' + (p.num ? '<span class="bk-chapter-num">' + esc(p.num) + '</span>' : '') + '<span>' + esc(p.title) + '</span></a>'
        + (subs.length ? '<button type="button" class="bk-toggle' + (isOpen ? ' open' : '') + '" data-toggle="' + i + '" aria-expanded="' + isOpen + '">›</button>' : '') + '</div>'
        + (subs.length && isOpen ? '<div class="bk-subchapters">' + subs.map((t) => '<div class="bk-subrow bk-sub-l' + t.level + '"><span class="bk-grip-space"></span><a href="#p' + i + '/' + t.id + '" class="bk-subchapter" data-go="' + i + '" data-to="' + t.id + '"><span class="bk-chapter-num">' + esc(t.num) + '</span><span>' + esc(t.title) + '</span></a></div>').join('') + '</div>' : '')
        + '</div>';
    }).join('');
  }
  function renderPage() {
    const p = D.pages[pg], prev = D.pages[pg - 1], next = D.pages[pg + 1];
    content.innerHTML = p.html + '<nav class="bk-pager">'
      + (prev ? '<a href="#p' + (pg - 1) + '" class="bk-prev" data-go="' + (pg - 1) + '"><small>Previous</small>' + esc(name(prev)) + '</a>' : '<span></span>')
      + (next ? '<a href="#p' + (pg + 1) + '" class="bk-next" data-go="' + (pg + 1) + '"><small>Next</small>' + esc(name(next)) + '</a>' : '<span></span>') + '</nav>';
    toc.innerHTML = p.toc.length ? '<div class="bk-toc-h">On this page</div>' + p.toc.map((t) => '<a href="#p' + pg + '/' + t.id + '" class="bk-toc-l' + t.level + '" data-go="' + pg + '" data-to="' + t.id + '">' + (t.num ? '<span class="bk-num">' + esc(t.num) + '</span>' : '') + esc(t.title) + '</a>').join('') : '';
    toc.style.display = p.toc.length ? '' : 'none';
    $('#bk-mtitle').textContent = name(p);
    document.title = (pg ? name(p) + ' – ' : '') + D.title;
  }
  function go(p, to, push) {
    p = Math.max(0, Math.min(D.pages.length - 1, p | 0));
    const changed = p !== pg; pg = p;
    if (changed || !content.innerHTML) { renderPage(); renderNav(); }
    root.classList.remove('bk-nav-open');
    const el = to && content.querySelector('[id="' + to + '"]');
    if (el) main.scrollTop += el.getBoundingClientRect().top - main.getBoundingClientRect().top - 16; else if (changed) main.scrollTop = 0;
    if (push !== false) history.replaceState(null, '', '#p' + p + (to ? '/' + to : ''));
    spy();
  }
  function spy() {
    const top = main.getBoundingClientRect().top + 90; let a = null;
    D.pages[pg].toc.forEach((t) => { const h = content.querySelector('[id="' + t.id + '"]'); if (h && h.getBoundingClientRect().top <= top) a = t.id; });
    toc.querySelectorAll('a').forEach((x) => x.classList.toggle('on', x.getAttribute('data-to') === a));
  }
  function search() {
    const s = q.value.trim().toLowerCase();
    nav.style.display = s ? 'none' : ''; results.style.display = s ? '' : 'none';
    if (!s) return;
    const out = [];
    D.search.forEach((r) => { if (out.length >= 40) return; const t = r.text.replace(/\s+/g, ' '), i = t.toLowerCase().indexOf(s); if (i < 0) return; const a = Math.max(0, i - 40); out.push({ r, snip: (a ? '…' : '') + t.slice(a, i + s.length + 60) + (i + s.length + 60 < t.length ? '…' : '') }); });
    results.innerHTML = out.length ? out.map((o) => '<a href="#" class="bk-result" data-go="' + o.r.page + '" data-to="' + o.r.anchor + '"><span class="bk-result-t">' + esc((o.r.num ? o.r.num + ' ' : '') + o.r.title) + '</span><span class="bk-result-s">' + esc(o.snip) + '</span></a>').join('') : '<div class="bk-noresults">No matches.</div>';
  }
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest ? ev.target : null; if (!t) return;
    const g = t.closest('[data-go]'), tog = t.closest('[data-toggle]'), box = t.closest('[data-box]'), ref = t.closest('[data-ref]'), pl = t.closest('[data-page]'), tab = t.closest('[data-tab]'), menu = t.closest('#bk-menu');
    if (menu) { root.classList.toggle('bk-nav-open'); return; }
    if (tog) { const i = +tog.getAttribute('data-toggle'); open[i] = !(open[i] != null ? open[i] : i === pg); renderNav(); return; }
    if (g) { ev.preventDefault(); go(+g.getAttribute('data-go'), g.getAttribute('data-to')); return; }
    if (pl) { ev.preventDefault(); go(+pl.getAttribute('data-page')); return; }
    if (box) { ev.preventDefault(); const id = box.getAttribute('data-box'), p = D.pageOf[id]; if (p != null) go(p, 'bk-' + id); return; }
    if (ref) { ev.preventDefault(); go(pg, 'bk-ref-' + pg + '-' + ref.getAttribute('data-ref')); return; }
    if (tab) {
      const set = tab.closest('.bk-tabset'), i = tab.getAttribute('data-tab');
      set.querySelectorAll('.bk-tabs [data-tab]').forEach((b) => b.classList.toggle('on', b === tab));
      set.querySelectorAll('.bk-panel').forEach((x) => { x.hidden = x.getAttribute('data-panel') !== i; });
    }
  });
  main.addEventListener('scroll', spy, { passive: true });
  q.addEventListener('input', search);
  $('.bk-booktitle').addEventListener('click', (e) => { e.preventDefault(); go(0); });
  const h = (location.hash.match(/^#p(\d+)(?:\/(.+))?$/) || []);
  pg = -1; go(h[1] ? +h[1] : 0, h[2] ? decodeURIComponent(h[2]) : null, false);
}
