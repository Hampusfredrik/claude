// The notebook as one HTML document (used for Word export).
// links.labels must be current (refreshLabels) before calling.
import { IMG_RE, olLabel } from '../text/markdown.js';
import { linkPlain, plain } from '../text/links.js';
import { pagesOf } from '../model/storage.js';
import { parseRefs, refBank } from '../text/refs.js';
import { docTrees } from './docTree.js';

export function docHtml(maps, single) {
  const esc = (t) => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inl = (t) => esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*\s][^*]*)\*/g, '<i>$1</i>');
  const lab = (t) => inl(String(t || 'Untitled').replace(/\s*\n\s*/g, ' '));
  const block = (t, imgs) => {
    let h = '', list = false;
    (t || '').split('\n').forEach(l => {
      const n0 = l.match(/^(\s*)(\d+)[.)]\s+(.*)/);
      if (n0) { if (list) { h += '</ul>'; list = false; } const nl = Math.floor(n0[1].length / 2); h += '<p style="margin:0 0 0 ' + (1.6 + nl * 1.4) + 'em;text-indent:-1.6em">' + olLabel(n0[2], nl) + '.&nbsp;&nbsp;' + inl(n0[3]) + '</p>'; return; }
      const m0 = l.match(/^(\s*)[•\-*]\s+(.*)/), m = m0 ? [m0[0], m0[2]] : null, lv = m0 ? Math.floor(m0[1].length / 2) : 0;
      const im = l.match(IMG_RE);
      if (im) { if (list) { h += '</ul>'; list = false; } const o = imgs && imgs[im[1]]; if (o) { const w = Math.round(Math.min(520, o.w) * (o.pct ? Math.min(100, o.pct * 520 / Math.min(520, o.w)) / 100 : 1)); h += '<p><img src="' + o.d + '" width="' + w + '" height="' + Math.round(o.h * w / o.w) + '" style="max-width:100%;height:auto"></p>'; } return; }
      const hm = l.match(/^(#{1,3})\s+(.*)$/);
      if (hm) { if (list) { h += '</ul>'; list = false; } const lv = hm[1].length; h += '<p class="nh' + lv + '">' + inl(hm[2]) + '</p>'; return; }
      if (m) { if (!list) { h += '<ul>'; list = true; } h += '<li' + (lv ? ' style="margin-left:' + (lv * 1.4) + 'em;list-style-type:' + ['disc', 'circle', 'square'][lv % 3] + '"' : '') + '>' + inl(m[1]) + '</li>'; return; }
      if (list) { h += '</ul>'; list = false; }
      if (l.trim()) h += '<p>' + inl(l) + '</p>';
    });
    return h + (list ? '</ul>' : '');
  };
  const bank = refBank();
  const hasRefs = maps.some(m => (single ? [single] : m.nodes).some(n => pagesOf(n).some(p => parseRefs(p.refs).length)));
  const one = (nt, rf, imgs) => block(bank.map(linkPlain(nt), rf), imgs);
  const content = (n) => { const ps = pagesOf(n); if (ps.length > 1) return ps.map(p => { const h = one(p.notes, p.refs, n.images); return (p.notes || '').trim() ? '<p class="tab">' + esc(p.name) + '</p>' + h : ''; }).join(''); return one(n.notes, n.refs, n.images); };
  const refsSection = () => bank.list.length ? '<h2><a name="refs"></a>References</h2><ol class="refs">' + bank.list.map(x => '<li>' + (x.href ? '<a href="' + esc(x.href) + '">' + esc(x.text) + '</a>' : esc(x.text)) + '</li>').join('') + '</ol>' : '';
  const catHtml = () => '';
  let body = '', title;
  if (single) {
    title = plain(single.label) || 'Untitled';
    body = '<div class="kicker">' + esc(maps[0].title) + '</div><h1>' + lab(single.label) + '</h1>' + catHtml(single, maps[0].cats) + content(single) + refsSection();
  } else {
    const multi = maps.length > 1, trees = docTrees(maps);
    title = multi ? 'All notebooks' : plain(maps[0].title);
    let toc = '', nToc = 0;
    trees.forEach((T, mi) => {
      if (multi) toc += '<p class="toc0"><a href="#' + T.mk + '">' + (mi + 1) + '&nbsp;&nbsp;' + esc(T.m.title) + '</a></p>';
      T.items.forEach(it => { nToc++; toc += '<p class="toc' + Math.min(4, it.depth - (multi ? 0 : 1)) + '"><a href="#' + it.key + '">' + it.num + '&nbsp;&nbsp;' + lab(it.n.label) + '</a></p>'; });
      if (T.conn.length) { nToc++; toc += '<p class="toc' + (multi ? 1 : 0) + '"><a href="#' + T.mk + 'c">Connections</a></p>'; }
    });
    if (hasRefs) { nToc++; toc += '<p class="toc0"><a href="#refs">References</a></p>'; }
    toc = '<div class="tocw"><p class="toch">Contents</p>' + toc + '</div>';
    if (multi) body += '<h1 class="cover">All notebooks</h1>' + toc;
    trees.forEach((T, mi) => {
      body += '<section' + (multi ? ' class="brk"' : '') + '><h1><a name="' + T.mk + '"></a>' + (multi ? (mi + 1) + '&nbsp;&nbsp;' : '') + esc(T.m.title) + '</h1>';
      if (!multi && nToc) body += toc;
      if (T.main) body += content(T.main);
      T.items.forEach(it => { const tg = 'h' + Math.min(4, it.depth + 1); body += '<' + tg + '><a name="' + it.key + '"></a>' + it.num + '&nbsp;&nbsp;' + lab(it.n.label) + '</' + tg + '>' + catHtml(it.n, T.m.cats) + content(it.n); });
      if (T.conn.length) body += '<h2><a name="' + T.mk + 'c"></a>Connections</h2>' + T.conn.map(e => '<p class="tab">' + lab(T.byId[e.from] && T.byId[e.from].label) + (e.both ? ' ↔ ' : ' → ') + lab(T.byId[e.to] && T.byId[e.to].label) + '</p>' + block(e.notes)).join('');
      body += '</section>';
    });
    const rs = refsSection(); if (rs) body += multi ? '<section class="brk">' + rs + '</section>' : rs;
  }
  const css = 'body{font-family:Karla,Calibri,Arial,sans-serif;color:#2a2724;font-size:12pt;line-height:1.55;max-width:42em;margin:2em auto;padding:0 1em}h1{font-size:22pt;font-weight:normal;margin:0 0 .6em}h1.cover{font-size:28pt}h2{font-size:16pt;font-weight:bold;margin:1.6em 0 .3em;padding-top:.6em;border-top:1px solid #dcdee6}h3{font-size:13.5pt;font-weight:bold;margin:1.4em 0 .25em}h4{font-size:12pt;font-weight:bold;font-style:italic;margin:1.2em 0 .2em}.tab{font-style:italic;font-size:12.5pt;margin:1.1em 0 .25em}.rh{font-family:Arial,sans-serif;font-size:8pt;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#6a6c7e;margin:1em 0 .3em}p{margin:0 0 .6em}ul,ol{margin:0 0 .6em 1.4em;padding:0}.refs{font-size:10.5pt}a{color:#2f6f5e}.tocw{margin:.4em 0 2.2em}.toch{font-family:Arial,sans-serif;font-size:8.5pt;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#6a6c7e;margin:0 0 .6em}.tocw a{color:#2a2724;text-decoration:none}.toc0{font-size:12.5pt;font-weight:bold;margin:.5em 0 .15em}.toc1{margin:.15em 0 .15em 1.4em}.toc2{margin:.1em 0 .1em 2.8em;font-size:11pt}.toc3,.toc4{margin:.1em 0 .1em 4.2em;font-size:11pt}.cat{font-family:Arial,sans-serif;font-size:9pt;color:#6a6c7e;margin:-.1em 0 .5em}.cat span{display:inline-block;width:8pt;height:8pt;border-radius:2pt;margin-right:5pt;vertical-align:-1pt}.kicker{font-family:Arial,sans-serif;font-size:9pt;letter-spacing:.06em;text-transform:uppercase;color:#6a6c7e;margin-bottom:.4em}.brk{page-break-before:always}.nh1{font-size:15pt;margin:1em 0 .3em}.nh2{font-size:13pt;margin:.9em 0 .25em}.nh3{font-size:12pt;font-weight:bold;margin:.8em 0 .2em}@media print{body{margin:0;max-width:none}}';
  return { title: title, html: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + css + '</style></head><body>' + body + '</body></html>' };
}
