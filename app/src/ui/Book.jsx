// "Read as notebook": the current map as a book in the style of a Quarto book
// (chapter list on the left, text in the middle, "On this page" on the right,
// previous/next at the bottom, search). Content comes from book/buildBook.js.
// Click a box's text to edit it with the same notes editor as the box dialog,
// click a heading to edit its title. Edits change the map's boxes directly.
import { useEffect, useMemo, useRef, useState } from 'react';
import { searchBook } from '../book/buildBook.js';
import SlashMenu from './SlashMenu.jsx';

// Caret at the clicked point once the editor has its content.
const caretAt = (el, x, y) => {
  let r = null;
  if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
  else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); } }
  const sel = window.getSelection();
  if (r && el.contains(r.startContainer)) { r.collapse(true); sel.removeAllRanges(); sel.addRange(r); return; }
  const e = document.createRange(); e.selectNodeContents(el); e.collapse(false); sel.removeAllRanges(); sel.addRange(e);
};

function BoxBlock({ b, v }) {
  const H = 'h' + b.level, editing = v.bookEditId === b.id, titling = v.bookTitleEdit === b.id;
  const sec = useRef(null), ed = useRef(null), click = useRef(null);
  const [label, setLabel] = useState(b.label);
  useEffect(() => { if (!titling) setLabel(b.label); }, [b.label, titling]);
  // When the editor appears: focus it and put the caret where the text was clicked.
  useEffect(() => {
    if (!editing || !ed.current) return;
    const el = ed.current; el.focus({ preventScroll: true });
    if (click.current) { caretAt(el, click.current.x, click.current.y); click.current = null; }
  }, [editing]);
  const stopIfLeft = () => setTimeout(() => { if (!sec.current || !sec.current.contains(document.activeElement)) v.bookStopEdit(b.id); }, 0);
  const startEdit = (ev) => {
    if (ev.target.closest && ev.target.closest('a,button,[data-box],[data-ref]')) return;
    click.current = { x: ev.clientX, y: ev.clientY };
    v.bookStartEdit(b.id);
  };
  const head = (
    <H className="bk-h">
      {b.num ? <span className="bk-num">{b.num}</span> : null}
      {titling ? (
        <textarea className="bk-title-input" autoFocus value={label} rows={Math.max(1, label.split('\n').length)} placeholder="Title"
          onChange={(e) => { setLabel(e.target.value); v.bookLabel(b.id, e.target.value); }}
          onKeyDown={(e) => v.bookLabelKey(b.id, e)} onBlur={() => setTimeout(() => { if (!sec.current || !sec.current.contains(document.activeElement)) v.bookTitleDone(b.id); }, 0)} />
      ) : (
        <span className="bk-title-text" title="Click to edit the title" onClick={(e) => { if (e.target.closest('a')) return; v.bookTitleStart(b.id); }} dangerouslySetInnerHTML={{ __html: b.titleHtml }} />
      )}
      {titling ? null : <span className="bk-tools">
        <button type="button" className="bk-tool" onClick={() => v.bookAdd(b.id)} title={'Add a ' + b.add.toLowerCase() + ' below this box (also on the map)'}>+ {b.add}</button>
        <button type="button" className="bk-tool" onClick={() => v.bookEdit(b.id)} title="Open the box dialog: category, tabs, references, images, map links">Edit</button>
      </span>}
    </H>
  );
  const meta = (
    <>
      {b.catHtml ? <span dangerouslySetInnerHTML={{ __html: b.catHtml }} /> : null}
      {titling ? (
        <input className="bk-sub-input" value={b.sub} placeholder="Subtitle (shown when hovering over the box on the map)" onChange={(e) => v.bookSub(b.id, e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }} onBlur={() => setTimeout(() => { if (!sec.current || !sec.current.contains(document.activeElement)) v.bookTitleDone(b.id); }, 0)} />
      ) : b.sub.trim() ? <p className="bk-sub" onClick={() => v.bookTitleStart(b.id)} title="Click to edit">{b.sub.trim()}</p> : null}
    </>
  );
  const tabs = b.tabs ? (
    <div className="bk-tabs" role="tablist">
      {b.tabs.map(t => <button key={t.i} type="button" role="tab" className={t.i === b.active ? 'on' : ''} onClick={() => v.bookSetTab(b.id, t.i)}>{t.name}</button>)}
    </div>
  ) : null;
  const body = editing ? (
    <div className="bk-body bk-editing">
      <div ref={(el) => { ed.current = el; v.edRef(el); }} className="bk-editor" data-ed="1" data-ph="Write your notes… Type / to link to another box" contentEditable="true" suppressContentEditableWarning spellCheck="true"
        onInput={v.onEdInput} onBlur={(e) => { v.onEdBlur(e); stopIfLeft(); }} onKeyDown={v.onEdKey} onPaste={v.onEdPaste} onClick={v.onEdClick} />
      <div className="bk-edit-hint">Ctrl+B / Ctrl+I bold and italic · “- ” or “1. ” starts a list · “/” links to a box · Esc to finish</div>
      {v.bookSlashOpen ? <SlashMenu v={v} /> : null}
    </div>
  ) : b.bodyHtml ? (
    <div className="bk-body" title="Click to edit" onClick={startEdit} dangerouslySetInnerHTML={{ __html: b.bodyHtml }} />
  ) : (
    <div className="bk-body bk-empty" onClick={startEdit}>Click to write notes…</div>
  );
  if (b.level === 1) return <div ref={sec} className="bk-pagehead"><header className="bk-title" id={'bk-' + b.id}>{head}{meta}</header>{tabs}{body}</div>;
  return <section ref={sec} className={'bk-sec bk-l' + b.level} id={'bk-' + b.id}>{head}{meta}{tabs}{body}</section>;
}

export default function Book({ v }) {
  const book = v.book;
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [target, setTarget] = useState(null);
  const [open, setOpen] = useState({}); // chapter index → sections shown in the sidebar (default: current chapter)
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

  // A box added from the book ("+ Section"): show its page and scroll to it.
  const focus = v.bookFocus;
  useEffect(() => { if (!focus) return; const p = book.pageOf[focus.id]; if (p != null) go(p, 'bk-' + focus.id); }, [focus && focus.t]);

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
    if (t.closest('[contenteditable="true"]')) return; // clicks inside the editor are the editor's
    const box = t.closest('[data-box]'), ref = t.closest('[data-ref]'), pageLink = t.closest('[data-page]');
    if (pageLink) { ev.preventDefault(); go(+pageLink.getAttribute('data-page')); return; }
    if (box) { ev.preventDefault(); const id = box.getAttribute('data-box'), p = book.pageOf[id]; if (p != null) go(p, 'bk-' + id); return; }
    if (ref) { ev.preventDefault(); go(pg, 'bk-ref-' + pg + '-' + ref.getAttribute('data-ref')); return; }
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
            {book.pages.map((p, i) => {
              const subs = p.toc.filter(t => t.num); // sections only, not Connections/References
              const isOpen = open[i] != null ? open[i] : i === pg;
              return (
                <div key={p.id} className="bk-chapter-group">
                  <div className={'bk-chapter-row' + (i === pg ? ' on' : '')}>
                    <a href="#" className={'bk-chapter' + (i === pg ? ' on' : '')} onClick={(e) => { e.preventDefault(); go(i); }}>
                      {p.num ? <span className="bk-chapter-num">{p.num}</span> : null}<span>{p.title}</span>
                    </a>
                    {subs.length ? (
                      <button type="button" className={'bk-toggle' + (isOpen ? ' open' : '')} aria-expanded={isOpen} aria-label={(isOpen ? 'Hide' : 'Show') + ' sections of ' + p.title}
                        onClick={() => setOpen(Object.assign({}, open, { [i]: !isOpen }))}>›</button>
                    ) : null}
                  </div>
                  {subs.length && isOpen ? (
                    <div className="bk-subchapters">
                      {subs.map(t => (
                        <a key={t.id} href="#" className={'bk-subchapter bk-sub-l' + t.level + (i === pg && active === t.id ? ' on' : '')} onClick={(e) => { e.preventDefault(); go(i, t.id); }}>
                          <span className="bk-chapter-num">{t.num}</span><span>{t.title}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
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
          {cur.blocks.map((b, i) => b.type === 'box' ? <BoxBlock key={b.id} b={b} v={v} /> : <div key={'h' + i} dangerouslySetInnerHTML={{ __html: b.html }} />)}
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
