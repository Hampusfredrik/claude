// PDF export: lays out docBlocks() output with jsPDF (A4, Helvetica): headings,
// wrapped rich text (**bold**/*italic*), lists, images, references, a linked
// table of contents and page footers. PDF is the jsPDF constructor.
import { olLabel } from '../text/markdown.js';

export function renderPdf(PDF, d) {
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
  return doc;
}
