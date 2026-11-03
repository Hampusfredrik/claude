// Export to Word (.doc), PDF and HTML, plus backup/restore of everything.
import { DEFAULT_CATS, IDX, SYNC_META, SYNC_PREFIX, mk } from '../model/constants.js';
import { pagesOf, readJSON, titleOf } from '../model/storage.js';
import { LINK_RE, linkLbl, linkPlain, links, plain } from '../text/links.js';
import { IMG_RE, olLabel } from '../text/markdown.js';
import { parseRefs, refBank } from '../text/refs.js';
export const exportMethods = {
  exportMap() {
    const D = this.mapViewData(true), title = D.title;
    const html = this.viewerHtml(D, false);
    const name = (title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'map') + '.html';
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this.setState({ saved: 'Exported ' + name });
    } catch (err) { window.alert('Export failed: ' + err.message); }
  },
  docMaps(all) {
    const s = this.state;
    const list = all ? this.allMapsData() : [{ id: s.currentId, title: titleOf(s.nodes), nodes: s.nodes, edges: s.edges }];
    return list.map(m => Object.assign({}, m, { cats: m.id === s.currentId ? s.cats : ((readJSON(mk(m.id)) || {}).cats || DEFAULT_CATS) }));
  },
  docTree(nodes, edges, mi, multi) {
    const main = nodes.find(n => n.main) || nodes[0];
    if (!main) return { main: null, items: [] };
    const byId = {}; nodes.forEach(n => { byId[n.id] = n; });
    const outs = (id) => { const o = []; edges.forEach(e => { const nx = e.from === id ? e.to : (e.both && e.to === id ? e.from : null); if (nx && byId[nx] && o.indexOf(nx) < 0) o.push(nx); }); return o; };
    const seen = {}, ch = {};
    const grow = (root) => { seen[root] = 1; const q = [root]; while (q.length) { const id = q.shift(); outs(id).forEach(nx => { if (!seen[nx]) { seen[nx] = 1; (ch[id] = ch[id] || []).push(nx); q.push(nx); } }); } };
    grow(main.id);
    const roots = (ch[main.id] || []).slice();
    const hasIn = {}; edges.forEach(e => { hasIn[e.to] = 1; if (e.both) hasIn[e.from] = 1; });
    nodes.filter(n => !seen[n.id] && !hasIn[n.id]).concat(nodes).forEach(n => { if (!seen[n.id]) { roots.push(n.id); grow(n.id); } });
    const pos = (a, b) => (byId[a].y - byId[b].y) || (byId[a].x - byId[b].x);
    const pre = multi ? (mi + 1) + '.' : '', items = [];
    const walk = (id, depth, num) => { items.push({ n: byId[id], depth: depth, num: num, key: 'b' + mi + '_' + id }); (ch[id] || []).slice().sort(pos).forEach((c, i) => walk(c, depth + 1, num + '.' + (i + 1))); };
    roots.forEach((r, i) => walk(r, 1, pre + (i + 1)));
    return { main: main, items: items };
  },
  docTrees(maps) {
    const multi = maps.length > 1;
    return maps.map((m, mi) => { const tr = this.docTree(m.nodes, m.edges, mi, multi), byId = {}; m.nodes.forEach(n => { byId[n.id] = n; }); return { m: m, main: tr.main, items: tr.items, byId: byId, mk: 'm' + mi, conn: m.edges.filter(e => e.notes && e.notes.trim()) }; });
  },
  docHtml(maps, single) {
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
    this.refreshLabels();
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
      const multi = maps.length > 1, trees = this.docTrees(maps);
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
  },
  exportDoc(kind, scope) {
    this.setState({ exportOpen: false });
    const s = this.state;
    let doc;
    if (scope === 'box') { const n = s.nodes.find(x => x.id === s.modalId); if (!n) return; doc = this.docHtml(this.docMaps(false), n); }
    else doc = this.docHtml(this.docMaps(scope === 'all'), null);
    const base = doc.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'notebook';
    if (kind === 'word') {
      const html = doc.html.replace('<html>', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">');
      const parts = []; let k = 0;
      const body = html.replace(/src="data:image\/(\w+);base64,([^"]+)"/g, (m0, ext, b64) => { k++; const loc = 'file:///C:/vn_files/image' + k + '.' + (ext === 'jpeg' ? 'jpg' : ext); parts.push({ loc: loc, type: 'image/' + ext, b64: b64 }); return 'src="' + loc + '"'; });
      const wrap = (s) => s.replace(/(.{76})/g, '$1\r\n');
      const utf8b64 = btoa(unescape(encodeURIComponent(body)));
      const BD = '----=_NextPart_VisualNotebook';
      let mh = 'MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="' + BD + '"; type="text/html"\r\n\r\n--' + BD + '\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/vn.htm\r\n\r\n' + wrap(utf8b64) + '\r\n';
      parts.forEach(p => { mh += '\r\n--' + BD + '\r\nContent-Location: ' + p.loc + '\r\nContent-Transfer-Encoding: base64\r\nContent-Type: ' + p.type + '\r\n\r\n' + wrap(p.b64) + '\r\n'; });
      mh += '\r\n--' + BD + '--\r\n';
      const blob = new Blob([mh], { type: 'application/msword' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = base + '.doc'; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this.setState({ saved: 'Exported ' + base + '.doc' });
      return;
    }
    this.exportPdf(scope, base).catch(err => window.alert('PDF export failed: ' + err.message));
  },
  loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      sc.onload = () => res(window.jspdf.jsPDF);
      sc.onerror = () => rej(new Error('Could not load the PDF tool. Check your connection.'));
      document.head.appendChild(sc);
    });
  },
  docBlocks(maps, single) {
    const B = [];
    this.refreshLabels();
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
      const multi = maps.length > 1, trees = this.docTrees(maps), toc = [];
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
  },
  async exportPdf(scope, base) {
    const s = this.state;
    let d;
    if (scope === 'box') { const n = s.nodes.find(x => x.id === s.modalId); if (!n) return; d = this.docBlocks(this.docMaps(false), n); }
    else d = this.docBlocks(this.docMaps(scope === 'all'), null);
    this.setState({ saved: 'Preparing PDF…' });
    const PDF = await this.loadJsPdf();
    const doc = new PDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 64, CW = W - 2 * M;
    let y = M;
    const clean = (t) => String(t || '').replace(/\u2192/g, '->').replace(/\u2194/g, '<->').replace(/\u2190/g, '<-').replace(/[^\u0000-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]/g, '');
    const ensure = (h) => { if (y + h > H - M) { doc.addPage(); y = M; } };
    const segs = (t) => { const out = []; String(t).split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/).forEach(p => { if (!p) return; if (/^\*\*[^*]+\*\*$/.test(p)) out.push({ s: p.slice(2, -2), b: 1 }); else if (/^\*[^*\s][^*]*\*$/.test(p)) out.push({ s: p.slice(1, -1), i: 1 }); else out.push({ s: p }); }); return out; };
    const styleOf = (base, sg) => { const b = sg.b || base === 'bold', i = sg.i || base === 'italic'; return b && i ? 'bolditalic' : b ? 'bold' : i ? 'italic' : 'normal'; };
    const rich = (t, o) => {
      const toks = [];
      segs(clean(t)).forEach(sg => sg.s.split(/(\s+)/).forEach(w => {
        if (!w) return;
        const st = styleOf(o.style || 'normal', sg);
        doc.setFont(o.font, st); doc.setFontSize(o.size);
        const sp = /^\s+$/.test(w);
        const tw = doc.getTextWidth(sp ? ' ' : w);
        if (!sp && tw > o.w) doc.splitTextToSize(w, o.w).forEach((p, k) => toks.push({ w: p, st: st, tw: doc.getTextWidth(p), brk: k > 0 }));
        else toks.push({ w: sp ? ' ' : w, st: st, tw: tw, sp: sp });
      }));
      const lines = []; let cur = [], cw = 0;
      toks.forEach(tk => {
        if (tk.sp) { if (cur.length) { cur.push(tk); cw += tk.tw; } return; }
        if ((cw + tk.tw > o.w || tk.brk) && cur.length) { while (cur.length && cur[cur.length - 1].sp) cw -= cur.pop().tw; lines.push(cur); cur = []; cw = 0; }
        cur.push(tk); cw += tk.tw;
      });
      if (cur.length) lines.push(cur);
      lines.forEach((ln, li) => {
        ensure(o.lh);
        if (li === 0 && o.onFirst) o.onFirst();
        let x = o.x;
        const by = y + (o.lh - o.size) / 2 + o.size * 0.78;
        ln.forEach(tk => { if (!tk.sp) { doc.setFont(o.font, tk.st); doc.setFontSize(o.size); doc.setTextColor(o.color || '#2a2724'); doc.text(tk.w, x, by); } x += tk.tw; });
        if (o.link) doc.link(o.x, y, x - o.x, o.lh, { url: o.link });
        y += o.lh;
      });
    };
    const ink = '#2a2724', grey = '#6a6c7e', green = '#2f6f5e';
    let prev = null;
    const dest = {}, tocPos = [];
    const mark = (k) => () => { if (k) dest[k] = doc.getNumberOfPages(); };
    d.blocks.forEach(b => {
      if (b.t === 'break') { if (y > M) { doc.addPage(); y = M; } }
      else if (b.t === 'cover') { y += 120; rich(b.text, { font: 'helvetica', size: 34, lh: 40, x: M, w: CW, color: ink }); y += 24; }
      else if (b.t === 'tochead') { y += 10; ensure(40); rich('CONTENTS', { font: 'helvetica', style: 'bold', size: 8.5, lh: 14, x: M, w: CW, color: grey }); y += 6; }
      else if (b.t === 'toc') { const ix = b.lvl * 18, sz = b.lvl === 0 ? 12.5 : 11.5, lh = b.lvl === 0 ? 21 : 17; if (b.lvl === 0 && prev === 'toc') y += 4; rich(b.text, { font: 'helvetica', style: b.lvl === 0 ? 'bold' : 'normal', size: sz, lh: lh, x: M + ix, w: CW - ix - 36, color: ink, onFirst: () => tocPos.push({ key: b.key, page: doc.getNumberOfPages(), y: y, lh: lh, sz: sz }) }); }
      else if (b.t === 'gap') { y += 18; }
      else if (b.t === 'hd' && b.lvl === 1) { y += prev === 'h1' || prev === 'gap' ? 4 : 18; ensure(70); doc.setDrawColor('#dcdee6'); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 12; rich(b.text, { font: 'helvetica', style: 'bold', size: 16, lh: 21, x: M, w: CW, color: ink, onFirst: mark(b.key) }); y += 4; }
      else if (b.t === 'hd' && b.lvl === 2) { y += 14; ensure(56); rich(b.text, { font: 'helvetica', style: 'bold', size: 13.5, lh: 19, x: M, w: CW, color: ink, onFirst: mark(b.key) }); y += 3; }
      else if (b.t === 'hd') { y += 10; ensure(48); rich(b.text, { font: 'helvetica', style: 'bolditalic', size: 12, lh: 17, x: M, w: CW, color: ink, onFirst: mark(b.key) }); y += 2; }
      else if (b.t === 'tab') { y += 10; ensure(44); rich(b.text, { font: 'helvetica', style: 'italic', size: 12.5, lh: 18, x: M, w: CW, color: ink }); y += 2; }
      else if (b.t === 'kicker') { rich(String(b.text).toUpperCase(), { font: 'helvetica', size: 8.5, lh: 14, x: M, w: CW, color: grey }); y += 2; }
      else if (b.t === 'h1') { ensure(80); rich(b.text, { font: 'helvetica', size: 24, lh: 30, x: M, w: CW, color: ink, onFirst: mark(b.key) }); y += 10; }
      else if (b.t === 'h2') { y += prev === 'h1' ? 4 : 18; ensure(70); doc.setDrawColor('#dcdee6'); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 12; rich(b.text, { font: 'helvetica', size: 16, lh: 21, x: M, w: CW, color: ink }); y += 4; }
      else if (b.t === 'h3') { y += 10; ensure(50); rich(b.text, { font: 'helvetica', style: 'bold', size: 12, lh: 17, x: M, w: CW, color: ink }); y += 2; }
      else if (b.t === 'h4') { y += 8; ensure(40); rich(b.text.toUpperCase(), { font: 'helvetica', style: 'bold', size: 7.5, lh: 13, x: M, w: CW, color: grey }); y += 2; }
      else if (b.t === 'cat') { ensure(16); doc.setFillColor(b.color || grey); doc.roundedRect(M, y + 4, 7, 7, 1.5, 1.5, 'F'); rich(b.text, { font: 'helvetica', size: 9, lh: 15, x: M + 12, w: CW - 12, color: grey }); y += 6; }
      else if (b.t === 'img') { const maxH = H - 2 * M; let w = Math.min(CW, b.img.w * 0.75), h = b.img.h * w / b.img.w; if (h > maxH) { w = w * maxH / h; h = maxH; } y += 6; ensure(h); try { doc.addImage(b.img.d, 'JPEG', M, y, w, h); } catch (err) {} y += h + 10; }
      else if (b.t === 'nh1') { y += 10; ensure(40); rich(b.text, { font: 'helvetica', size: 15, lh: 20, x: M, w: CW, color: ink }); y += 3; }
      else if (b.t === 'nh2') { y += 8; ensure(36); rich(b.text, { font: 'helvetica', size: 13, lh: 18, x: M, w: CW, color: ink }); y += 2; }
      else if (b.t === 'nh3') { y += 6; ensure(32); rich(b.text, { font: 'helvetica', style: 'bold', size: 11.5, lh: 17, x: M, w: CW, color: ink }); y += 1; }
      else if (b.t === 'p') { rich(b.text, { font: 'helvetica', size: 11.5, lh: 17, x: M, w: CW, color: ink }); y += 5; }
      else if (b.t === 'li') { const ix = (b.lvl || 0) * 16; rich(b.text, { font: 'helvetica', size: 11.5, lh: 17, x: M + 16 + ix, w: CW - 16 - ix, color: ink, onFirst: () => { if (b.num) { doc.setFont('helvetica', 'normal'); doc.setFontSize(11.5); doc.setTextColor(ink); doc.text(olLabel(b.num, b.lvl || 0) + '.', M + ix, y + 12.5); } else { doc.setFillColor(ink); doc.circle(M + 5 + ix, y + 8.5, 1.6, 'F'); } } }); y += 3; }
      else if (b.t === 'ref') { rich(b.text, { font: 'helvetica', size: 10.5, lh: 15, x: M + 18, w: CW - 18, color: b.href ? green : ink, link: b.href || null, onFirst: () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(grey); doc.text(b.num + '.', M, y + 11); } }); y += 3; }
      prev = b.t;
    });
    tocPos.forEach(p => { const pg = dest[p.key]; if (!pg) return; doc.setPage(p.page); doc.setFont('helvetica', 'normal'); doc.setFontSize(p.sz); doc.setTextColor(grey); doc.text(String(pg), W - M, p.y + (p.lh - p.sz) / 2 + p.sz * 0.78, { align: 'right' }); doc.link(M, p.y, CW, p.lh, { pageNumber: pg }); });
    const total = doc.getNumberOfPages(), ft = clean(d.title);
    for (let i = 1; i <= total; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor('#a2a4b4');
      doc.text(ft, M, H - 32); doc.text(i + ' / ' + total, W - M, H - 32, { align: 'right' });
    }
    doc.save(base + '.pdf');
    this.setState({ saved: 'Exported ' + base + '.pdf' });
  },
  backupAll() {
    this.saveNow();
    const items = {};
    Object.keys(window.localStorage).filter(k => k.startsWith(SYNC_PREFIX) && k !== SYNC_META).forEach(k => { items[k] = window.localStorage.getItem(k); });
    const d = new Date(), stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const blob = new Blob([JSON.stringify({ app: 'visual-notebook', version: 1, created: d.toISOString(), maps: (this.state.maps || []).length, items: items })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'notebook-backup-' + stamp + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    this.setState({ saved: 'Backup downloaded' });
  },
  legacyCopy(t) { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); },
  pickBackup() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) f.text().then(t => this.restoreBackup(t)).catch(() => window.alert('Could not read that file.')); };
    inp.click();
  },
  restoreBackup(text) {
    let b; try { b = JSON.parse(text); } catch (err) { b = null; }
    if (!b || b.app !== 'visual-notebook' || !b.items) { window.alert('That file is not a notebook backup.'); return; }
    let bi; try { bi = JSON.parse(b.items[IDX] || 'null'); } catch (err) { bi = null; }
    const bMaps = (bi && bi.maps) || [];
    if (!window.confirm('Restore ' + bMaps.length + ' map' + (bMaps.length === 1 ? '' : 's') + ' from this backup?\n\nMaps in the backup replace their current versions. Maps you have made since the backup are kept.')) return;
    this.saveNow();
    const cur = readJSON(IDX) || { maps: this.state.maps, folders: this.state.folders };
    Object.keys(b.items).forEach(k => { if (k !== IDX && k !== SYNC_META && k.startsWith(SYNC_PREFIX)) { try { window.localStorage.setItem(k, b.items[k]); } catch (err) {} } });
    const maps = bMaps.concat((cur.maps || []).filter(m => !bMaps.some(x => x.id === m.id)));
    const bf = (bi && bi.folders) || [], folders = bf.concat((cur.folders || []).filter(f => !bf.some(x => x.id === f.id)));
    const id = maps.some(m => m.id === this.state.currentId) ? this.state.currentId : (maps[0] && maps[0].id);
    this.undoStack = []; this.redoStack = [];
    this.setState({ folders: folders }, () => { if (id) this.openMap(id, maps); this.writeIndex(maps, id, folders); this.setState({ saved: 'Backup restored' }); });
  }
};
