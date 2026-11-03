// Notes markdown → HTML for the notebook view. Same dialect as the editor
// (text/markdown.js): **bold**, *italic*, links, [[box]] links, [n] citations,
// # headings, - / 1. lists (nested by indentation) and [image:id] lines.
// Everything that comes from the map is escaped.
import { escH, IMG_RE } from '../text/markdown.js';

const TOKEN_RE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|https?:\/\/[^\s<>"]+|\[\[[A-Za-z0-9_-]+\]\]|\[\d+\])/g;
const safeColor = (c) => (/^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : '#7e8091');

// ctx: { label(id) → text, has(id) → bool, cite(n) → { num, missing } }
export function inlineHtml(text, ctx) {
  const t = String(text || '');
  let out = '', last = 0, m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(t))) {
    out += escH(t.slice(last, m.index));
    const s = m[0];
    if (s.startsWith('**')) out += '<strong>' + escH(s.slice(2, -2)) + '</strong>';
    else if (s.startsWith('*')) out += '<em>' + escH(s.slice(1, -1)) + '</em>';
    else if (s.startsWith('[[')) {
      const id = s.slice(2, -2);
      out += ctx.has(id) ? '<a href="#" class="bk-xref" data-box="' + escH(id) + '">' + escH(ctx.label(id)) + '</a>' : '<span class="bk-xref missing">' + escH(ctx.label(id)) + '</span>';
    } else if (s.startsWith('[')) {
      const c = ctx.cite(parseInt(s.slice(1, -1), 10));
      out += c ? '<sup class="bk-cite"><a href="#" data-ref="' + c + '">[' + c + ']</a></sup>' : '<sup class="bk-cite missing" title="No reference with this number">' + escH(s) + '</sup>';
    } else {
      const href = s.replace(/[.,;)]+$/, '');
      out += '<a href="' + escH(href) + '" target="_blank" rel="noopener noreferrer">' + escH(href) + '</a>' + escH(s.slice(href.length));
    }
    last = m.index + s.length;
  }
  return out + escH(t.slice(last));
}

export function blockHtml(md, imgs, ctx) {
  if (!md) return '';
  const out = [], st = [];
  const pop = () => out.push('</li></' + st.pop() + '>');
  const closeAll = () => { while (st.length) pop(); };
  String(md).split('\n').forEach(l => {
    const im = l.match(IMG_RE), hm = l.match(/^(#{1,3})\s+(.*)$/), b0 = l.match(/^(\s*)(?:[-•]|(\d+)[.)])\s+(.*)$/);
    if (!b0) closeAll();
    if (im) {
      const o = imgs && imgs[im[1]];
      if (o && /^data:image\//.test(o.d || '')) out.push('<figure class="bk-fig"><img src="' + escH(o.d) + '" alt=""' + (o.pct ? ' style="width:' + (+o.pct) + '%"' : '') + '></figure>');
    } else if (hm) out.push('<p class="bk-nh bk-nh' + hm[1].length + '">' + inlineHtml(hm[2], ctx) + '</p>');
    else if (b0) {
      const tag = b0[2] ? 'ol' : 'ul';
      const target = Math.min(Math.floor(b0[1].replace(/\t/g, '  ').length / 2) + 1, st.length + 1);
      while (st.length > target) pop();
      if (st.length === target && st[target - 1] !== tag) pop();
      if (target > st.length) { out.push('<' + tag + '>'); st.push(tag); } else out.push('</li>');
      out.push('<li>' + inlineHtml(b0[3], ctx));
    } else if (l.trim()) out.push('<p>' + inlineHtml(l, ctx) + '</p>');
  });
  closeAll();
  return out.join('');
}

export function catHtml(cat) {
  return cat ? '<span class="bk-cat"><i style="background:' + safeColor(cat.color) + '"></i>' + escH(cat.name) + '</span>' : '';
}
