// The small markdown dialect used in notes and labels → HTML / React elements.
import { LINK_RE, linkLbl, links } from './links.js';
import React from 'react';
export const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|https?:\/\/[^\s<>"]+|\[\[[A-Za-z0-9_-]+\]\]|\[\d+\])/g;
export const escH = (t) => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const inlineHtml = (t, refs) => {
  let s = escH(t);
  s = s.replace(LINK_RE, (m, id) => '<span data-link="' + id + '" contenteditable="false" title="Click to open">' + escH(linkLbl(id)) + '</span>');
  s = s.replace(/https?:\/\/[^\s<>"]+/g, u => { const hh = u.replace(/[.,;)]+$/, ''); return '<a href="' + hh + '" title="Ctrl/Cmd+click to open">' + hh + '</a>' + u.slice(hh.length); });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*\s][^*]*)\*/g, '<i>$1</i>');
  s = s.replace(/\[(\d+)\]/g, (m, d) => { const r = refs[d - 1]; return '<sup data-cite="' + d + '" contenteditable="false"' + (r ? '' : ' data-missing="1"') + ' title="' + (r ? escH(r.text) : 'No reference with this number') + '">[' + d + ']</sup>'; });
  return s;
};
export const olLabel = (n, lv) => { n = +n; const k = lv % 3; if (k === 1) { let s = ''; while (n > 0) { n--; s = String.fromCharCode(97 + n % 26) + s; n = Math.floor(n / 26); } return s; } if (k === 2) { const R = [[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']]; let s = ''; R.forEach(([v, c]) => { while (n >= v) { s += c; n -= v; } }); return s; } return String(n); };
export const mdToHtml = (md, imgs, refs) => {
  if (!md) return '';
  const out = [], st = [];
  const pop = () => out.push('</li></' + st.pop() + '>');
  const closeAll = () => { while (st.length) pop(); };
  md.split('\n').forEach(l => {
    const im = l.match(IMG_RE), hm = l.match(/^(#{1,3})\s+(.*)$/), b0 = l.match(/^(\s*)(?:[-\u2022]|(\d+)[.)])\s+(.*)$/), b = b0 ? [b0[0], b0[1], b0[3], b0[2] ? 'ol' : 'ul'] : null;
    if (!b) closeAll();
    if (im) { const o = imgs && imgs[im[1]]; out.push('<div data-img="' + im[1] + '" contenteditable="false"' + (o && o.pct ? ' style="width:' + o.pct + '%"' : '') + '>' + (o ? '<img src="' + o.d + '" alt=""><span data-rz="1" title="Drag to resize"></span>' : '<span style="color:#a2a4b4;font-size:12px">Image missing</span>') + '</div>'); }
    else if (hm) { const lv = hm[1].length; out.push('<h' + lv + '>' + (inlineHtml(hm[2], refs) || '<br>') + '</h' + lv + '>'); }
    else if (b) {
      const target = Math.min(Math.floor(b[1].replace(/\t/g, '  ').length / 2) + 1, st.length + 1);
      while (st.length > target) pop();
      if (st.length === target && st[target - 1] !== b[3]) pop();
      if (target > st.length) { out.push('<' + b[3] + '>'); st.push(b[3]); }
      else out.push('</li>');
      out.push('<li>' + (inlineHtml(b[2], refs) || '<br>'));
    }
    else out.push('<div>' + (inlineHtml(l, refs) || '<br>') + '</div>');
  });
  closeAll();
  return out.join('');
};
export const IMG_RE = /^\s*\[image:([a-z0-9]+)\]\s*$/i;
export const rich = (text, k) => {
  const h = React.createElement, out = [];
  let last = 0, m, i = 0;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0], key = (k || '') + '-' + (i++);
    if (t.startsWith('**')) out.push(h('strong', { key: key, style: { fontWeight: 700 } }, t.slice(2, -2)));
    else if (t.startsWith('*')) out.push(h('em', { key: key }, t.slice(1, -1)));
    else if (t.startsWith('[[')) { const id = t.slice(2, -2); out.push(h('a', { key: key, href: '#', title: 'Open box', onClick: (e) => { e.preventDefault(); e.stopPropagation(); if (links.openNode) links.openNode(id); }, style: { color: '#2f6f5e', textDecoration: 'none', borderBottom: '1px dashed #2f6f5e', cursor: 'pointer' } }, '\u2197\u00a0' + linkLbl(id))); }
    else if (t.startsWith('[')) { const r = links.citeRefs[parseInt(t.slice(1, -1), 10) - 1]; out.push(h(r && r.href ? 'a' : 'sup', { key: key, title: r ? r.text : 'No reference with this number', href: r && r.href ? r.href : undefined, target: r && r.href ? '_blank' : undefined, rel: 'noopener noreferrer', onClick: (e) => e.stopPropagation(), style: { fontSize: '.72em', verticalAlign: 'super', lineHeight: 0, color: r ? '#2f6f5e' : '#b4532a', fontWeight: 600, textDecoration: 'none', cursor: 'help', padding: '0 1px' } }, t)); }
    else { const href = t.replace(/[.,;)]+$/, ''); out.push(h('a', { key: key, href: href, target: '_blank', rel: 'noopener noreferrer', onClick: (e) => e.stopPropagation(), style: { color: '#2f6f5e', overflowWrap: 'anywhere' } }, href)); if (href.length < t.length) out.push(t.slice(href.length)); }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};
export const richLabel = (t) => React.createElement(React.Fragment, null, rich(t || '', 'l'));
export const richBlock = (text, imgs) => {
  const h = React.createElement, lines = (text || '').split('\n'), blocks = [];
  let list = null;
  const HS = { 1: { fontFamily: 'Karla,system-ui,sans-serif', fontSize: '22px', lineHeight: 1.25, fontWeight: 600, margin: '14px 0 6px' }, 2: { fontFamily: 'Karla,system-ui,sans-serif', fontSize: '18px', lineHeight: 1.3, fontWeight: 600, margin: '12px 0 4px' }, 3: { fontSize: '15px', fontWeight: 700, margin: '10px 0 2px' } };
  lines.forEach((ln, i) => {
    const im = ln.match(IMG_RE);
    if (im) { list = null; const o = imgs && imgs[im[1]]; blocks.push(o ? h('img', { key: 'g' + i, src: o.d, alt: '', style: { display: 'block', maxWidth: '100%', width: o.pct ? o.pct + '%' : undefined, height: 'auto', borderRadius: '8px', margin: '8px 0', border: '1px solid #e0e1ea' } }) : h('div', { key: 'g' + i, style: { fontSize: '12px', color: '#a2a4b4', margin: '6px 0' } }, 'Image missing')); return; }
    const hm = ln.match(/^(#{1,3})\s+(.*)$/);
    if (hm) { list = null; const lv = hm[1].length; blocks.push(h('h' + lv, { key: 'h' + i, style: HS[lv] }, rich(hm[2], 'h' + i))); return; }
    const b0 = ln.match(/^(\s*)(?:[-•]|(\d+)[.)])\s+(.*)$/), b = b0 ? [b0[0], b0[1], b0[3]] : null;
    if (b) { const lv = Math.floor(b[1].length / 2); if (!list) { list = []; blocks.push(h('ul', { key: 'u' + i, style: { margin: '2px 0 8px', paddingLeft: '22px' } }, list)); } list.push(h('li', { key: 'i' + i, style: { margin: '2px 0 2px ' + (lv * 22) + 'px', listStyleType: b0[2] ? '"' + olLabel(b0[2], lv) + '. "' : ['disc', 'circle', 'square'][lv % 3] } }, rich(b[2], 'i' + i))); return; }
    list = null;
    if (!ln.trim()) blocks.push(h('div', { key: 'b' + i, style: { height: '10px' } }));
    else blocks.push(h('div', { key: 'p' + i }, rich(ln, 'p' + i)));
  });
  return h(React.Fragment, null, blocks);
};
