// The notebook as a flat list of typed blocks (headings, paragraphs, list items,
// images, references, table of contents) that the PDF renderer lays out.
// links.labels must be current (refreshLabels) before calling; labels of boxes in
// other maps are added to it.
import { IMG_RE } from '../text/markdown.js';
import { LINK_RE, linkLbl, linkPlain, links, plain } from '../text/links.js';
import { pagesOf } from '../model/storage.js';
import { parseRefs, refBank } from '../text/refs.js';
import { docTrees } from './docTree.js';

export function docBlocks(maps, single) {
  const B = [];
  (maps || []).forEach(mp => ((mp && (mp.nodes || (mp.data && mp.data.nodes))) || []).forEach(x => { if (x && links.labels[x.id] == null) links.labels[x.id] = plain(String(x.label || '')).replace(/\s+/g, ' ').trim() || 'Untitled'; }));
  const notes = (t, imgs) => (t || '').replace(LINK_RE, (m0, id) => linkLbl(id)).split('\n').forEach(l => { const im = l.match(IMG_RE); if (im) { const o = imgs && imgs[im[1]]; if (o) B.push({ t: 'img', img: o }); return; } const hm = l.match(/^(#{1,3})\s+(.*)$/); if (hm) { B.push({ t: 'nh' + hm[1].length, text: hm[2] }); return; } const nm = l.match(/^(\s*)(\d+)[.)]\s+(.*)/); if (nm) { B.push({ t: 'li', text: nm[3], lvl: Math.floor(nm[1].length / 2), num: nm[2] }); return; } const m = l.match(/^(\s*)[\u2022\-*]\s+(.*)/); if (m) B.push({ t: 'li', text: m[2], lvl: Math.floor(m[1].length / 2) }); else if (l.trim()) B.push({ t: 'p', text: l }); });
  const refs = (t) => { const r = parseRefs(t); if (!r.length) return; B.push({ t: 'h4', text: 'References' }); r.forEach((x, i) => B.push({ t: 'ref', text: x.text, href: x.href, num: i + 1 })); };
  const lab = (t) => String(t || 'Untitled').replace(/\s*\n\s*/g, ' ');
  const bank = refBank();
  const hasRefs = maps.some(m => (single ? [single] : m.nodes).some(n => pagesOf(n).some(p => parseRefs(p.refs).length)));
  const one = (nt, rf, imgs) => notes(bank.map(linkPlain(nt), rf), imgs);
  const content = (n) => { const ps = pagesOf(n); if (ps.length > 1) ps.forEach(p => { if ((p.notes || '').trim()) { B.push({ t: 'tab', text: p.name }); one(p.notes, p.refs, n.images); } else bank.map('', p.refs); }); else one(n.notes, n.refs, n.images); };
  const refsSection = () => { if (!bank.list.length) return; B.push({ t: 'hd', lvl: 1, text: 'References', key: 'refs' }); bank.list.forEach((x, i) => B.push({ t: 'ref', text: x.text, href: x.href, num: i + 1 })); };
  const cat = () => {};
  let title;
  if (single) {
    title = plain(single.label) || 'Untitled';
    B.push({ t: 'kicker', text: maps[0].title });
    B.push({ t: 'h1', text: lab(single.label) }); cat(single, maps[0].cats); content(single); refsSection();
  } else {
    const multi = maps.length > 1, trees = docTrees(maps), toc = [];
    title = multi ? 'All notebooks' : plain(maps[0].title);
    trees.forEach((T, mi) => {
      if (multi) toc.push({ t: 'toc', lvl: 0, text: (mi + 1) + '  ' + T.m.title, key: T.mk });
      T.items.forEach(it => toc.push({ t: 'toc', lvl: Math.min(3, it.depth - (multi ? 0 : 1)), text: it.num + '  ' + lab(it.n.label), key: it.key }));
      if (T.conn.length) toc.push({ t: 'toc', lvl: multi ? 1 : 0, text: 'Connections', key: T.mk + 'c' });
    });
    if (hasRefs) toc.push({ t: 'toc', lvl: 0, text: 'References', key: 'refs' });
    const hasToc = toc.some(x => x.lvl > 0 || !multi);
    if (multi) { B.push({ t: 'cover', text: 'All notebooks' }); B.push({ t: 'tochead' }); toc.forEach(x => B.push(x)); }
    trees.forEach((T, mi) => {
      if (multi) B.push({ t: 'break' });
      B.push({ t: 'h1', text: (multi ? (mi + 1) + '  ' : '') + T.m.title, key: T.mk });
      if (!multi && hasToc) { B.push({ t: 'tochead' }); toc.forEach(x => B.push(x)); B.push({ t: 'gap' }); }
      if (T.main) content(T.main);
      T.items.forEach(it => { B.push({ t: 'hd', lvl: Math.min(3, it.depth), text: it.num + '  ' + lab(it.n.label), key: it.key }); cat(it.n, T.m.cats); content(it.n); });
      if (T.conn.length) { B.push({ t: 'hd', lvl: 1, text: 'Connections', key: T.mk + 'c' }); T.conn.forEach(e => { B.push({ t: 'tab', text: lab(T.byId[e.from] && T.byId[e.from].label) + (e.both ? ' <-> ' : ' -> ') + lab(T.byId[e.to] && T.byId[e.to].label) }); notes(e.notes); }); }
    });
    if (bank.list.length && multi) B.push({ t: 'break' });
    refsSection();
  }
  return { title: title, blocks: B };
}
