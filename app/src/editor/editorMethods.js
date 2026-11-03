// The notes editor in the box dialog: contentEditable editing, lists, images,
// citations, "/" box links and map-search highlighting.
import { allNotes, pageIdxOf, pagesOf } from '../model/storage.js';
import { isEdBlock, serializeEd } from '../text/editorSerialize.js';
import { linkLbl, links } from '../text/links.js';
import { mdToHtml } from '../text/markdown.js';
import { fetchRef, parseRefs, refIdOf, refKey, vancouver } from '../text/refs.js';
import { compressImage } from './images.js';
export const editorMethods = {
  // The box whose notes the rich editor edits: the box dialog's box, or the box
  // being edited in the notebook view ("Read as notebook") when no dialog is open.
  edTargetId() { return this.state.modalId || (this.state.bookOpen && this.state.bookEditId) || null; },
  // True when the rich (contentEditable) editor is the one in use.
  edIsRich() { return this.state.modalId ? this.state.tab === 'notes' : !!(this.state.bookOpen && this.state.bookEditId); },
  edLive() { return this.edEl && document.contains(this.edEl) ? this.edEl : null; },
  edSaveRange() {
    const el = this.edLive(), sel = window.getSelection();
    if (el && sel && sel.rangeCount && el.contains(sel.getRangeAt(0).startContainer)) this.edRange = sel.getRangeAt(0).cloneRange();
  },
  edRestore() {
    const el = this.edLive(); if (!el) return null;
    el.focus();
    const sel = window.getSelection();
    if (this.edRange && el.contains(this.edRange.startContainer)) { sel.removeAllRanges(); sel.addRange(this.edRange); }
    else if (!(sel.rangeCount && el.contains(sel.getRangeAt(0).startContainer))) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }
    return sel.rangeCount ? sel.getRangeAt(0) : null;
  },
  syncEditor() {
    const el = this.edLive(); if (!el) return;
    const n = this.state.nodes.find(x => x.id === this.edTargetId());
    if (!n || !this.edIsRich()) return;
    const md = n.notes || '';
    if (this.edNode === n.id && md === this.edMd) return;
    this.refreshLabels();
    el.innerHTML = mdToHtml(md, n.images, parseRefs(n.refs));
    this.edNode = n.id; this.edMd = md; this.edRange = null;
    if (this.pendingSup != null) {
      const sups = el.querySelectorAll('sup[data-cite]'), sp = sups[this.pendingSup]; this.pendingSup = null;
      if (sp) { el.focus(); const r = document.createRange(); r.setStartAfter(sp); r.collapse(true); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); this.edRange = r.cloneRange(); }
    }
  },
  edCaret(node, atEnd) {
    const sel = window.getSelection(), r = document.createRange();
    let t = node;
    if (node.nodeType === 1) {
      const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, { acceptNode: (x) => (node.tagName === 'LI' && x.parentNode.closest('li') !== node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      t = w.nextNode();
    }
    if (t && t.nodeType === 3) r.setStart(t, atEnd ? t.length : 0); else r.setStart(node, 0);
    r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
  },
  liOwn(li) { return Array.from(li.childNodes).filter(n => !(n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL'))); },
  liSubs(li) { return Array.from(li.childNodes).filter(n => n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')); },
  isBlankNodes(ns) { return !ns.some(n => (n.nodeType === 3 && n.nodeValue.replace(/[\u200b\u00a0\s]/g, '') !== '') || (n.nodeType === 1 && n.tagName !== 'BR' && ((n.textContent || '').replace(/[\u200b\u00a0\s]/g, '') !== '' || (n.matches && n.matches('img,sup,span[data-link]')) || (n.querySelector && n.querySelector('img,sup,span[data-link]'))))); },
  edAutoList() {
    const el = this.edEl, sel = window.getSelection(); if (!el || !sel || !sel.rangeCount || !sel.isCollapsed) return;
    const tn = sel.anchorNode, off = sel.anchorOffset; if (!tn || tn.nodeType !== 3 || !el.contains(tn)) return;
    let blk = tn.parentNode; while (blk && blk !== el && !isEdBlock(blk)) blk = blk.parentNode;
    if (!blk || blk.tagName === 'LI' || /^H\d$/.test(blk.tagName) || (blk.dataset && blk.dataset.img)) return;
    let top = tn; while (top.parentNode !== blk) top = top.parentNode;
    let start = top; while (start.previousSibling && start.previousSibling.nodeName !== 'BR' && !isEdBlock(start.previousSibling)) start = start.previousSibling;
    let end = top; while (end.nextSibling && end.nextSibling.nodeName !== 'BR' && !isEdBlock(end.nextSibling)) end = end.nextSibling;
    const r0 = document.createRange(); r0.setStartBefore(start); r0.setEnd(tn, off);
    const m = r0.toString().replace(/\u00a0/g, ' ').match(/^([*\-]|1[.)]) $/); if (!m) return;
    const tag = m[1] === '*' || m[1] === '-' ? 'ul' : 'ol';
    const lineR = document.createRange(); lineR.setStartBefore(start); lineR.setEndAfter(end);
    r0.deleteContents();
    const frag = lineR.extractContents();
    const li = document.createElement('li'); li.appendChild(frag);
    if (this.isBlankNodes(Array.from(li.childNodes))) { li.innerHTML = ''; li.appendChild(document.createElement('br')); }
    const nb = lineR.startContainer.childNodes[lineR.startOffset];
    if (nb && nb.nodeName === 'BR') nb.remove();
    let list;
    if (blk !== el && this.isBlankNodes(Array.from(blk.childNodes)) && !blk.querySelector('ul,ol,div,p,[data-img]')) {
      list = document.createElement(tag); blk.parentNode.replaceChild(list, blk);
    } else {
      list = document.createElement(tag); lineR.insertNode(list);
    }
    list.appendChild(li);
    const prev = list.previousElementSibling, next = list.nextElementSibling;
    if (prev && prev.tagName === list.tagName) { prev.appendChild(li); list.remove(); list = prev; }
    if (next && next.tagName === list.tagName) { while (next.firstChild) list.appendChild(next.firstChild); next.remove(); }
    this.edCaret(li, false);
  },
  edClickEnd(ev) {
    const el = this.edEl, sel = window.getSelection();
    if (!el || !sel || ev.button !== 0 || ev.detail > 1 || ev.shiftKey) return;
    const x = ev.clientX, y = ev.clientY;
    let blk = ev.target.nodeType === 1 ? ev.target : ev.target.parentNode;
    if (blk === el) { blk = Array.from(el.children).find(c => { const b = c.getBoundingClientRect(); return y >= b.top && y <= b.bottom; }) || null; }
    else { while (blk && blk.parentNode !== el && blk.tagName !== 'LI') blk = blk.parentNode; }
    if (!blk || !el.contains(blk) || (blk.dataset && blk.dataset.img)) return;
    if (blk.tagName === 'UL' || blk.tagName === 'OL') {
      const lis = Array.from(blk.querySelectorAll('li')).filter(li => { const b = li.getBoundingClientRect(); return y >= b.top && y <= b.bottom; });
      blk = lis[lis.length - 1]; if (!blk) return;
    }
    const own = blk.tagName === 'LI' ? this.liOwn(blk) : Array.from(blk.childNodes);
    if (!own.length) return;
    const r = document.createRange(); r.setStartBefore(own[0]); r.setEndAfter(own[own.length - 1]);
    const rects = Array.from(r.getClientRects()).filter(q => q.width > 0 || q.height > 0);
    const row = rects.filter(q => y >= q.top - 2 && y <= q.bottom + 2);
    if (!row.length) return;
    const right = Math.max.apply(null, row.map(q => q.right));
    if (x <= right) return;
    const lastBottom = Math.max.apply(null, rects.map(q => q.bottom));
    const nr = document.createRange();
    if (row.some(q => q.bottom >= lastBottom - 1)) {
      let t = own[own.length - 1];
      while (t && (t.nodeName === 'BR' || (t.nodeType === 3 && !t.nodeValue.length))) t = t.previousSibling;
      if (!t) return;
      while (t.nodeType === 1 && t.lastChild && !(t.dataset && (t.dataset.link || t.dataset.cite))) t = t.lastChild;
      if (t.nodeType === 3) nr.setStart(t, t.length); else nr.setStartAfter(t);
    } else {
      const cp = document.caretRangeFromPoint ? document.caretRangeFromPoint(right - 1, y) : null;
      if (!cp) return; nr.setStart(cp.startContainer, cp.startOffset);
    }
    ev.preventDefault();
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); this.edSaveRange();
  },
  edLiToDiv(li) {
    const list = li.parentNode, div = document.createElement('div');
    this.liOwn(li).forEach(n => div.appendChild(n));
    if (this.isBlankNodes(Array.from(div.childNodes))) { div.innerHTML = ''; div.appendChild(document.createElement('br')); }
    const subs = this.liSubs(li), rest = [];
    let n = li.nextSibling; while (n) { rest.push(n); n = n.nextSibling; }
    let after = list;
    list.parentNode.insertBefore(div, after.nextSibling); after = div;
    subs.forEach(s => { list.parentNode.insertBefore(s, after.nextSibling); after = s; });
    if (rest.length) { const rl = document.createElement(list.tagName.toLowerCase()); rest.forEach(x => rl.appendChild(x)); list.parentNode.insertBefore(rl, after.nextSibling); }
    li.remove(); if (!list.children.length) list.remove();
    this.edCaret(div, false);
  },
  edLiAt() {
    const el = this.edEl, sel = window.getSelection(); if (!el || !sel || !sel.rangeCount) return null;
    const c = sel.getRangeAt(0).startContainer; const e = c.nodeType === 1 ? c : c.parentNode;
    const li = e && e.closest ? e.closest('li') : null;
    return li && el.contains(li) ? li : null;
  },
  edOutdent(ev) { return this.edIndent({ shiftKey: true, preventDefault: () => ev.preventDefault(), stopPropagation: () => ev.stopPropagation() }); },
  edEnter(ev) {
    const li = this.edLiAt(); if (!li) return false;
    ev.preventDefault(); ev.stopPropagation();
    const sel = window.getSelection(); let r = sel.getRangeAt(0);
    if (!r.collapsed) { r.deleteContents(); r = sel.getRangeAt(0); }
    if (this.isBlankNodes(this.liOwn(li))) {
      if (li.parentNode.parentNode && li.parentNode.parentNode.tagName === 'LI') this.edOutdent(ev);
      else { this.edLiToDiv(li); this.edInput(); }
      return true;
    }
    const subs = this.liSubs(li);
    const tail = document.createRange(); tail.setStart(r.startContainer, r.startOffset);
    if (subs.length) tail.setEndBefore(subs[0]); else tail.setEnd(li, li.childNodes.length);
    const frag = tail.extractContents();
    const nli = document.createElement('li'); nli.appendChild(frag);
    if (this.isBlankNodes(Array.from(nli.childNodes))) { nli.innerHTML = ''; nli.appendChild(document.createElement('br')); }
    subs.forEach(s => nli.appendChild(s));
    const own = this.liOwn(li);
    if (this.isBlankNodes(own)) { own.forEach(x => x.remove()); li.insertBefore(document.createElement('br'), li.firstChild); }
    else { const lc = own[own.length - 1]; if (lc && lc.nodeType === 1 && lc.tagName !== 'BR' && !lc.textContent && !(lc.querySelector && lc.querySelector('img,sup,span[data-link]'))) lc.remove(); }
    li.parentNode.insertBefore(nli, li.nextSibling);
    this.edCaret(nli, false);
    this.edInput();
    return true;
  },
  edBack(ev) {
    const sel = window.getSelection(); if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
    const li = this.edLiAt(); if (!li) return false;
    const r = sel.getRangeAt(0), pre = document.createRange(); pre.setStart(li, 0); pre.setEnd(r.startContainer, r.startOffset);
    if (pre.toString().replace(/\u200b/g, '') !== '' || pre.cloneContents().querySelector('img,sup,span[data-link]')) return false;
    ev.preventDefault(); ev.stopPropagation();
    if (li.parentNode.parentNode && li.parentNode.parentNode.tagName === 'LI') this.edOutdent(ev);
    else { this.edLiToDiv(li); this.edInput(); }
    return true;
  },
  edInput() {
    setTimeout(() => this.markQ(), 0);
    const el = this.edLive(); if (!el) return;
    const n = this.state.nodes.find(x => x.id === this.edTargetId()); if (!n) return;
    const md = serializeEd(el);
    if (!md && !el.querySelector('img,ul,h1,h2,h3') && el.textContent === '' && el.childNodes.length) el.innerHTML = '';
    this.edMd = md; this.edNode = n.id;
    this.edSaveRange();
    if (md !== (n.notes || '')) this.patchNode(n.id, { notes: md });
  },
  edIndent(ev) {
    const el = this.edEl, sel = window.getSelection(); if (!el || !sel || !sel.rangeCount) return false;
    const r0 = sel.getRangeAt(0); let li = r0.startContainer.nodeType === 1 ? r0.startContainer : r0.startContainer.parentNode;
    li = li && li.closest ? li.closest('li') : null;
    if (!li || !el.contains(li)) return false;
    ev.preventDefault(); ev.stopPropagation();
    const sc = r0.startContainer, so = r0.startOffset, ec = r0.endContainer, eo = r0.endOffset;
    const ul = li.parentNode;
    if (!ev.shiftKey) {
      const prev = li.previousElementSibling; if (!prev || prev.tagName !== 'LI') return true;
      let sub = prev.lastElementChild; if (!sub || sub.tagName !== ul.tagName) { sub = document.createElement(ul.tagName.toLowerCase()); prev.appendChild(sub); }
      sub.appendChild(li);
      this.liSubs(li).forEach(s => { while (s.firstChild) sub.appendChild(s.firstChild); s.remove(); });
    } else {
      const pli = ul.parentNode; if (!pli || pli.tagName !== 'LI' || !el.contains(pli)) return true;
      const rest = []; let n = li.nextElementSibling; while (n) { rest.push(n); n = n.nextElementSibling; }
      if (rest.length) { let sub = li.lastElementChild; if (!sub || sub.tagName !== ul.tagName) { sub = document.createElement(ul.tagName.toLowerCase()); li.appendChild(sub); } rest.forEach(x => sub.appendChild(x)); }
      pli.parentNode.insertBefore(li, pli.nextSibling);
      if (!ul.children.length) ul.remove();
    }
    try { const r = document.createRange(); r.setStart(sc, so); r.setEnd(ec, eo); sel.removeAllRanges(); sel.addRange(r); } catch (err) {}
    this.edInput();
    return true;
  },
  edBlur(ev) {
    const rt = ev.relatedTarget;
    this.edSaveRange();
    if (rt && rt.dataset && rt.dataset.fmt) return;
    const n = this.state.nodes.find(x => x.id === this.edTargetId()); if (!n) return;
    const vv = vancouver(n.notes, n.refs), patch = {};
    if (vv.notes !== (n.notes || '')) { patch.notes = vv.notes; patch.refs = vv.refs; }
    if (n.images) { const used = {}; ((vv.notes || '') + '\n' + pagesOf(n).filter((p, i) => i !== pageIdxOf(n)).map(p => p.notes).join('\n')).replace(/\[image:([a-z0-9]+)\]/gi, (m0, id) => { used[id] = 1; return m0; }); const keys = Object.keys(n.images); if (keys.some(k => !used[k])) { const keep = {}; keys.forEach(k => { if (used[k]) keep[k] = n.images[k]; }); patch.images = keep; } }
    if (Object.keys(patch).length) this.patchNode(n.id, patch);
  },
  edPaste(ev) {
    const cd = ev.clipboardData; if (!cd) return;
    const it = Array.from(cd.items || []).find(x => x.kind === 'file' && /^image\//.test(x.type));
    ev.preventDefault();
    if (it) { this.edSaveRange(); this.insertImageFile(it.getAsFile()); return; }
    const txt = cd.getData('text/plain');
    if (txt) document.execCommand('insertText', false, this.reflowText(txt));
  },
  reflowText(t) {
    t = String(t).replace(/\r\n?/g, '\n').replace(/\u00ad/g, '');
    if (t.indexOf('\n') < 0) return t;
    const isItem = (l) => /^\s*([-•*–·▪●]|\d+[.)]|[a-z][.)])\s+/i.test(l);
    return t.split(/\n[ \t]*\n+/).map(par => {
      const lines = par.split('\n').map(l => l.trim()).filter(Boolean);
      let out = '';
      lines.forEach((l, i) => {
        if (!i) { out = l; return; }
        if (isItem(l)) { out += '\n' + l; return; }
        if (/[A-Za-zÀ-ÿ]-$/.test(out) && /^[a-zà-ÿ]/.test(l)) out = out.slice(0, -1) + l;
        else out += ' ' + l;
      });
      return out.replace(/[ \t]{2,}/g, ' ');
    }).filter(Boolean).join('\n\n');
  },
  edCmd(ev, cmd) {
    ev.preventDefault();
    if (!this.edLive()) return;
    if (document.activeElement !== this.edEl) this.edRestore();
    try { document.execCommand('defaultParagraphSeparator', false, 'div'); } catch (err) {}
    if (cmd === 'bold' || cmd === 'italic') document.execCommand(cmd);
    else if (cmd === 'list') document.execCommand('insertUnorderedList');
    else if (cmd === 'olist') document.execCommand('insertOrderedList');
    else { const cur = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, ''); document.execCommand('formatBlock', false, cur === cmd ? '<div>' : '<' + cmd + '>'); }
    this.edInput();
  },
  slashItems(q) {
    const s = this.state, ql = (q || '').trim().toLowerCase();
    this.refreshLabels();
    return s.nodes.filter(n => n.id !== this.edTargetId()).map(n => ({ id: n.id, label: links.labels[n.id] })).filter(x => !ql || x.label.toLowerCase().indexOf(ql) >= 0).slice(0, 8);
  },
  backlinksOf(id) {
    const ns = this.state.nodes || [];
    if (this._blNodes !== ns) { this._blNodes = ns; const m = {}; ns.forEach(n => { const t = allNotes(n), re = /\[\[([^\]]+)\]\]/g, seen = {}; let x; while ((x = re.exec(t))) { const k = x[1]; if (k !== n.id && !seen[k]) { seen[k] = 1; (m[k] = m[k] || []).push(n); } } }); this._blMap = m; }
    return this._blMap[id] || [];
  },
  slashClose() { this.slashRange = null; if (this.state.slash) this.setState({ slash: null }); },
  slashCheck() {
    const el = this.edEl, sel = window.getSelection();
    if (!el || !sel || !sel.rangeCount || !sel.isCollapsed) return this.slashClose();
    const r = sel.getRangeAt(0), tn = r.startContainer;
    if (tn.nodeType !== 3 || !el.contains(tn)) return this.slashClose();
    const m = tn.nodeValue.slice(0, r.startOffset).match(/(^|[\s\u00a0(])\/([^\n\/]{0,40})$/);
    if (!m) return this.slashClose();
    const q = m[2].replace(/\u00a0/g, ' '), items = this.slashItems(q);
    if (!items.length && /\s$/.test(q)) return this.slashClose();
    const st = r.startOffset - m[2].length - 1, rr = document.createRange(); rr.setStart(tn, st); rr.setEnd(tn, r.startOffset);
    const rc = rr.getBoundingClientRect(), h = 44 + Math.max(1, items.length) * 34;
    const y = rc.bottom + 6 + h > window.innerHeight ? Math.max(8, rc.top - 6 - h) : rc.bottom + 6;
    const x = Math.max(8, Math.min(rc.left, window.innerWidth - 296));
    this.slashRange = { node: tn, start: st, end: r.startOffset };
    this.setState(p => ({ slash: { q: q, x: x, y: y }, slashIdx: p.slash && p.slash.q === q ? p.slashIdx || 0 : 0 }));
  },
  slashPick(id) {
    const sr = this.slashRange, el = this.edEl; if (!sr || !el) return this.slashClose();
    const r = document.createRange();
    try { r.setStart(sr.node, sr.start); r.setEnd(sr.node, sr.end); } catch (err) { return this.slashClose(); }
    r.deleteContents();
    const sp = document.createElement('span'); sp.setAttribute('data-link', id); sp.setAttribute('contenteditable', 'false'); sp.title = 'Click to open'; sp.textContent = linkLbl(id);
    r.insertNode(sp);
    const tx = document.createTextNode('\u00a0'); sp.parentNode.insertBefore(tx, sp.nextSibling);
    el.focus();
    const r2 = document.createRange(); r2.setStart(tx, 1); r2.collapse(true);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r2);
    this.slashRange = null; this.setState({ slash: null });
    this.edInput();
  },
  edInsertCite(num) {
    const el = this.edLive(); const n = this.state.nodes.find(x => x.id === this.edTargetId());
    if (!el || !n) return false;
    const r = this.edRestore(); if (!r) return false;
    r.deleteContents();
    const sp = document.createElement('sup'); sp.setAttribute('data-cite', String(num)); sp.setAttribute('contenteditable', 'false'); sp.textContent = '[' + num + ']';
    r.insertNode(sp); r.setStartAfter(sp); r.collapse(true);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const k = Array.from(el.querySelectorAll('sup[data-cite]')).indexOf(sp);
    const md = serializeEd(el), vv = vancouver(md, n.refs);
    this.edNode = n.id; this.edMd = vv.notes === md ? md : null;
    if (vv.notes !== md) this.pendingSup = k;
    this.patchNode(n.id, vv.notes !== md ? vv : { notes: md });
    this.setState({ citeOpen: false, citeText: '' });
    return true;
  },
  imgCaretOff() { if (this.imgCaret) { this.imgCaret.removeAttribute('data-caret'); this.imgCaret = null; } },
  imgCaretOn(box) {
    const el = this.edEl; if (!el) return; this.imgCaretOff(); this.imgCaret = box; box.setAttribute('data-caret', '1');
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    const r = document.createRange(), i = Array.prototype.indexOf.call(el.childNodes, box); r.setStart(el, i + 1); r.collapse(true); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  },
  imgCaretLine() {
    const box = this.imgCaret, el = this.edEl; if (!box || !el) return; this.imgCaretOff();
    const ln = document.createElement('div'); ln.appendChild(document.createElement('br')); el.insertBefore(ln, box.nextSibling);
    this.edCaret(ln, false); this.edInput();
  },
  imgCaretKey(ev) {
    const box = this.imgCaret; if (!box) return false; const k = ev.key;
    if (k === 'Enter') { ev.preventDefault(); ev.stopPropagation(); this.imgCaretLine(); return true; }
    if (k === 'Backspace' || k === 'Delete') { ev.preventDefault(); ev.stopPropagation(); const nx = box.nextSibling, pv = box.previousSibling; this.imgCaretOff(); box.remove(); if (pv && pv.nodeType === 1) this.edCaret(pv, true); else if (nx && nx.nodeType === 1) this.edCaret(nx, false); this.edInput(); return true; }
    if (k === 'ArrowDown' || k === 'ArrowRight') { ev.preventDefault(); const nx = box.nextElementSibling; if (nx) { this.imgCaretOff(); this.edCaret(nx, false); } else this.imgCaretLine(); return true; }
    if (k === 'ArrowUp' || k === 'ArrowLeft') { ev.preventDefault(); const pv = box.previousElementSibling; this.imgCaretOff(); if (pv) this.edCaret(pv, true); return true; }
    if (k.length === 1 && !ev.metaKey && !ev.ctrlKey) { this.imgCaretLine(); return true; }
    if (k === 'Escape' || k === 'Tab') return false;
    return true;
  },
  edImgRight(e) {
    const el = this.edEl; if (!el) return false;
    const box = Array.from(el.children).find(c => c.dataset && c.dataset.img && (() => { const b = c.getBoundingClientRect(); return e.clientY >= b.top && e.clientY <= b.bottom && e.clientX > b.right - 2; })());
    if (!box) return false; this.imgCaretOn(box); return true;
  },
  edImgDown(e) {
    const img = e.target.closest && e.target.closest('[data-img] img'); if (!img || e.button) return;
    const box = img.parentNode, el = this.edEl; if (!el || box.parentNode !== el) return;
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, y0 = e.clientY; let moving = false, target, bar;
    const mv = (ev) => {
      if (!moving) { if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 5) return; moving = true; box.setAttribute('data-moving', '1');
        bar = document.createElement('div'); bar.style.cssText = 'position:fixed;height:2px;background:#2f6f5e;border-radius:2px;pointer-events:none;z-index:99999'; document.body.appendChild(bar); }
      const kids = Array.from(el.children).filter(c => c !== box); target = null;
      for (const c of kids) { const b = c.getBoundingClientRect(); if (ev.clientY < b.top + b.height / 2) { target = c; break; } }
      const er = el.getBoundingClientRect(), ref = target ? target.getBoundingClientRect().top - 4 : (kids.length ? kids[kids.length - 1].getBoundingClientRect().bottom + 4 : er.top);
      bar.style.left = er.left + 'px'; bar.style.width = er.width + 'px'; bar.style.top = ref + 'px';
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (bar) bar.remove(); box.removeAttribute('data-moving');
      if (!moving) { this.imgCaretOn(box); return; }
      if (target !== box.nextSibling) { el.insertBefore(box, target || null); if (!box.nextSibling) { const ln = document.createElement('div'); ln.appendChild(document.createElement('br')); el.appendChild(ln); } this.edInput(); }
      this.imgCaretOn(box); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  },
  edResizeStart(e) {
    const hz = e.target.closest && e.target.closest('[data-rz]'); if (!hz) return false;
    const box = hz.parentNode, el = this.edEl, id = box.getAttribute('data-img'); if (!el || !id) return;
    e.preventDefault(); e.stopPropagation();
    const cw = el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight);
    const x0 = e.clientX, w0 = box.getBoundingClientRect().width; let pct = null;
    box.setAttribute('data-rzing', '1');
    const mv = (ev) => { const w = Math.max(40, Math.min(cw, w0 + ev.clientX - x0)); pct = Math.round(w / cw * 1000) / 10; box.style.width = pct + '%'; };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); box.removeAttribute('data-rzing');
      if (pct == null) return; const n = this.state.nodes.find(x => x.id === this.edTargetId()); if (!n || !n.images || !n.images[id]) return;
      this.patchNode(n.id, { images: Object.assign({}, n.images, { [id]: Object.assign({}, n.images[id], { pct: pct >= 99.5 ? null : pct }) }) }); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    return true;
  },
  edInsertImage(id, o) {
    const el = this.edLive(); const n = this.state.nodes.find(x => x.id === this.edTargetId());
    if (!el || !n) return false;
    const r = this.edRestore(); if (!r) return false;
    const box = document.createElement('div'); box.setAttribute('data-img', id); box.setAttribute('contenteditable', 'false');
    const im = document.createElement('img'); im.src = o.d; im.alt = ''; box.appendChild(im); const hz = document.createElement('span'); hz.setAttribute('data-rz', '1'); hz.title = 'Drag to resize'; box.appendChild(hz);
    let blk = r.startContainer; while (blk && blk.parentNode !== el) blk = blk.parentNode;
    if (blk && blk !== el) el.insertBefore(box, blk.nextSibling); else r.insertNode(box);
    let after = box.nextSibling;
    if (!after) { after = document.createElement('div'); after.appendChild(document.createElement('br')); el.appendChild(after); }
    const r2 = document.createRange(); r2.setStart(after, 0); r2.collapse(true); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r2);
    const md = serializeEd(el); this.edMd = md; this.edNode = n.id; this.edSaveRange();
    this.patchNode(n.id, { notes: md, images: Object.assign({}, n.images || {}, { [id]: o }) });
    return true;
  },
  async insertImageFile(file) {
    if (!file || !/^image\//.test(file.type)) return;
    const n = this.state.nodes.find(x => x.id === this.edTargetId());
    if (!n) return;
    let o;
    try { o = await compressImage(file); } catch (err) { window.alert(err.message); return; }
    const n2 = this.state.nodes.find(x => x.id === n.id) || n;
    const id = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    if (this.edIsRich() && this.edInsertImage(id, o)) return;
    const v = n2.notes || '', p = Math.min(this.citePos == null ? v.length : this.citePos, v.length);
    const pre = v.slice(0, p), post = v.slice(p);
    const tok = (pre && !pre.endsWith('\n') ? '\n' : '') + '[image:' + id + ']' + (post.startsWith('\n') ? '' : '\n');
    this.patchNode(n2.id, { notes: pre + tok + post, images: Object.assign({}, n2.images || {}, { [id]: o }) });
    this.focusPos = p + tok.length; this.focusNotes = true; this.citePos = this.focusPos;
    this.setState({ notesEditing: true });
  },
  async addCitation(text) {
    let t = (text || '').trim();
    if (!t || this.state.citeBusy) return;
    const rid = refIdOf(t);
    if (rid) {
      this.setState({ citeBusy: true, citeMsg: 'Fetching reference…' });
      try { t = await fetchRef(rid); } catch (err) { this.setState({ citeBusy: false, citeMsg: err.message + '. Check the ID, or type the reference by hand.' }); return; }
      this.setState({ citeBusy: false, citeMsg: '' });
    }
    const n = this.state.nodes.find(x => x.id === this.edTargetId());
    if (!n) return;
    const lines = (n.refs || '').split('\n').map(l => l.trim()).filter(Boolean);
    let idx = lines.findIndex(l => l.toLowerCase() === t.toLowerCase() || refKey(l) === refKey(t));
    if (idx < 0) { lines.push(t); idx = lines.length - 1; this.patchNode(n.id, { refs: lines.join('\n') }); }
    setTimeout(() => this.insertCite(idx + 1), 0);
  },
  async fetchRefToList() {
    const s = this.state, t = (s.refFetch || '').trim(), rid = refIdOf(t);
    const n = s.nodes.find(x => x.id === s.modalId); if (!n || !t || s.refBusy) return;
    if (!rid) { this.setState({ refMsg: 'Paste a DOI (10.xxxx/…), a doi.org link, a PubMed link or a PMID.' }); return; }
    this.setState({ refBusy: true, refMsg: 'Fetching…' });
    let r; try { r = await fetchRef(rid); } catch (err) { this.setState({ refBusy: false, refMsg: err.message + '.' }); return; }
    const n2 = this.state.nodes.find(x => x.id === n.id) || n;
    const lines = (n2.refs || '').split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.some(l => refKey(l) === refKey(r))) { this.setState({ refBusy: false, refMsg: 'Already in this list.', refFetch: '' }); return; }
    this.patchNode(n2.id, { refs: lines.concat([r]).join('\n') });
    this.setState({ refBusy: false, refMsg: '', refFetch: '' });
  },
  insertCite(num) {
    const n = this.state.nodes.find(x => x.id === this.edTargetId());
    if (!n) return;
    if (this.edIsRich() && this.edInsertCite(num)) return;
    const v = n.notes || '', p = Math.min(this.citePos == null ? v.length : this.citePos, v.length);
    const pre = v.slice(0, p), tag = (pre && !/\s$/.test(pre) && !/\]$/.test(pre) ? ' ' : '') + '[' + num + ']';
    const vv = vancouver(pre + tag + v.slice(p), n.refs);
    this.patchNode(n.id, vv.refs === (n.refs || '').split('\n').map(l => l.trim()).filter(Boolean).join('\n') ? { notes: vv.notes } : vv);
    this.citePos = p + tag.length;
    this.focusPos = this.citePos;
    this.focusNotes = true;
    this.setState({ citeOpen: false, citeText: '', notesEditing: true });
  },
  markQ() {
    if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return;
    const s = this.state, q = (s.mapQ || '').trim().toLowerCase(), el = this.edLive && this.edLive();
    const key = q + '|' + s.modalId + '|' + s.tab + '|' + (el ? el.textContent.length : 0) + '|' + (this.edMd || '');
    if (key === this._markKey) return; this._markKey = key;
    CSS.highlights.delete('mapq'); CSS.highlights.delete('mapq1');
    if (!q || !el || !s.modalId) return;
    const ranges = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let tn; while ((tn = w.nextNode())) { const t = tn.nodeValue.toLowerCase(); let i = t.indexOf(q); while (i >= 0) { const r = document.createRange(); r.setStart(tn, i); r.setEnd(tn, i + q.length); ranges.push(r); i = t.indexOf(q, i + q.length); } }
    if (!ranges.length) return;
    CSS.highlights.set('mapq', new Highlight(...ranges.slice(1)));
    CSS.highlights.set('mapq1', new Highlight(ranges[0]));
    if (this._markScrolled !== s.modalId + '|' + q) { this._markScrolled = s.modalId + '|' + q;
      requestAnimationFrame(() => { const rr = ranges[0].getBoundingClientRect(); let sc = el; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement; if (sc && sc !== document.body) { const sr = sc.getBoundingClientRect(); if (rr.top < sr.top || rr.bottom > sr.bottom) sc.scrollTop += rr.top - sr.top - sr.height / 3; } }); }
  }
};
