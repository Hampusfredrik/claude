// "Read as notebook": the current map as a book in the style of a Quarto book
// (chapter list on the left, text in the middle, "On this page" on the right,
// previous/next at the bottom, search). Content comes from book/buildBook.js.
import { useEffect, useMemo, useRef, useState } from 'react';
import { searchBook } from '../book/buildBook.js';

export default function Book({ v }) {
  const book = v.book;
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [target, setTarget] = useState(null);
  const main = useRef(null);
  const pg = Math.min(page, book.pages.length - 1);
  const cur = book.pages[pg];
  const results = useMemo(() => searchBook(book, q), [book, q]);

  const go = (p, anchor) => { setPage(p); setTarget(anchor || 'top:' + p + ':' + Date.now()); setNavOpen(false); };

  // Scroll to the requested place after a page change (or to the top).
  useEffect(() => {
    const el = main.current; if (!el || !target) return;
    const t = !target.startsWith('top:') && el.querySelector('[id="' + target + '"]');
    if (t) el.scrollTop += t.getBoundingClientRect().top - el.getBoundingClientRect().top - 16; else el.scrollTop = 0;
    setTarget(null);
  }, [target, pg]);

  // "On this page": highlight the section being read.
  useEffect(() => {
    const el = main.current; if (!el) return;
    const spy = () => {
      const top = el.getBoundingClientRect().top + 90;
      let a = null;
      cur.toc.forEach(t => { const h = el.querySelector('[id="' + t.id + '"]'); if (h && h.getBoundingClientRect().top <= top) a = t.id; });
      setActive(a);
    };
    spy();
    el.addEventListener('scroll', spy, { passive: true });
    return () => el.removeEventListener('scroll', spy);
  }, [cur]);

  const onClick = (ev) => {
    const t = ev.target.closest ? ev.target : null; if (!t) return;
    const box = t.closest('[data-box]'), ref = t.closest('[data-ref]'), tab = t.closest('[data-tab]'), edit = t.closest('[data-edit]'), pageLink = t.closest('[data-page]');
    if (edit) { ev.preventDefault(); v.bookEdit(edit.getAttribute('data-edit')); return; }
    if (pageLink) { ev.preventDefault(); go(+pageLink.getAttribute('data-page')); return; }
    if (box) { ev.preventDefault(); const id = box.getAttribute('data-box'), p = book.pageOf[id]; if (p != null) go(p, 'bk-' + id); return; }
    if (ref) { ev.preventDefault(); go(pg, 'bk-ref-' + pg + '-' + ref.getAttribute('data-ref')); return; }
    if (tab) {
      const set = tab.closest('.bk-tabset'), i = tab.getAttribute('data-tab');
      set.querySelectorAll(':scope > .bk-tabs > [data-tab]').forEach(b => b.classList.toggle('on', b === tab));
      set.querySelectorAll(':scope > .bk-panel').forEach(p => { p.hidden = p.getAttribute('data-panel') !== i; });
    }
  };

  const prev = pg > 0 ? book.pages[pg - 1] : null, next = pg < book.pages.length - 1 ? book.pages[pg + 1] : null;
  const pageName = (p) => (p.num ? p.num + ' ' : '') + p.title;

  return (
    <div className={'bk' + (navOpen ? ' bk-nav-open' : '')}>
      <aside className="bk-side">
        <div className="bk-side-top">
          <button type="button" className="bk-back" onClick={v.closeBook} title="Back to the map (Esc)">← Back to map</button>
        </div>
        <a href="#" className="bk-booktitle" onClick={(e) => { e.preventDefault(); go(0); }}>{book.title}</a>
        <input className="bk-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search this notebook" />
        {q.trim() ? (
          <div className="bk-results">
            {results.length ? results.map((r, i) => (
              <a key={i} href="#" className="bk-result" onClick={(e) => { e.preventDefault(); go(r.page, r.anchor); }}>
                <span className="bk-result-t">{(r.num ? r.num + ' ' : '') + r.title}</span>
                <span className="bk-result-s">{r.snippet}</span>
              </a>
            )) : <div className="bk-noresults">No matches.</div>}
          </div>
        ) : (
          <nav className="bk-chapters">
            {book.pages.map((p, i) => (
              <a key={p.id} href="#" className={'bk-chapter' + (i === pg ? ' on' : '')} onClick={(e) => { e.preventDefault(); go(i); }}>
                {p.num ? <span className="bk-chapter-num">{p.num}</span> : null}<span>{p.title}</span>
              </a>
            ))}
          </nav>
        )}
      </aside>
      <div className="bk-mobilebar">
        <button type="button" onClick={() => setNavOpen(!navOpen)} aria-label="Chapters">☰</button>
        <span>{pageName(cur)}</span>
        <button type="button" onClick={v.closeBook} title="Back to the map">Map</button>
      </div>
      <main className="bk-main" ref={main} onClick={onClick}>
        <article className="bk-content">
          <div dangerouslySetInnerHTML={{ __html: cur.html }} />
          <nav className="bk-pager">
            {prev ? <a href="#" className="bk-prev" onClick={(e) => { e.preventDefault(); go(pg - 1); }}><small>Previous</small>{pageName(prev)}</a> : <span />}
            {next ? <a href="#" className="bk-next" onClick={(e) => { e.preventDefault(); go(pg + 1); }}><small>Next</small>{pageName(next)}</a> : <span />}
          </nav>
        </article>
        {cur.toc.length ? (
          <nav className="bk-toc">
            <div className="bk-toc-h">On this page</div>
            {cur.toc.map(t => (
              <a key={t.id} href="#" className={'bk-toc-l' + t.level + (active === t.id ? ' on' : '')} onClick={(e) => { e.preventDefault(); go(pg, t.id); }}>
                {t.num ? <span className="bk-num">{t.num}</span> : null}{t.title}
              </a>
            ))}
          </nav>
        ) : null}
      </main>
    </div>
  );
}
