// contentEditable notes editor DOM → markdown.
export const ED_BLOCK = /^(DIV|P|H1|H2|H3|H4|H5|H6|UL|OL|LI|BLOCKQUOTE|PRE|SECTION|ARTICLE|HEADER|FOOTER|TABLE|TBODY|TR)$/;
export const isEdBlock = (n) => n.nodeType === 1 && (ED_BLOCK.test(n.tagName) || !!(n.dataset && n.dataset.img));
export const serInline = (node) => {
  if (node.nodeType === 3) return node.nodeValue.replace(/\u00a0/g, ' ').replace(/\u200b/g, '').replace(/\n/g, ' ');
  if (node.nodeType !== 1) return '';
  const t = node.tagName;
  if (t === 'BR') return '\n';
  if (t === 'SPAN' && node.dataset.link) return '[[' + node.dataset.link + ']]';
  if (t === 'SUP' && node.dataset.cite) return '[' + node.dataset.cite + ']';
  if (t === 'IMG' || t === 'STYLE' || t === 'SCRIPT') return '';
  let inner = Array.from(node.childNodes).map(serInline).join('');
  const st = node.style || {};
  const wrap = (s, m) => { const mm = s.match(/^(\s*)([\s\S]*?)(\s*)$/); return mm[2] && mm[2].indexOf('\n') < 0 && mm[2].indexOf('*') < 0 ? mm[1] + m + mm[2] + m + mm[3] : s; };
  if (t === 'B' || t === 'STRONG' || /^(bold|[6-9]00)$/.test(st.fontWeight || '')) inner = wrap(inner, '**');
  if (t === 'I' || t === 'EM' || st.fontStyle === 'italic') inner = wrap(inner, '*');
  return inner;
};
export const serBlocks = (kids, lines, depth) => {
  depth = depth || 0;
  let buf = '';
  const flush = () => { if (buf === '') return; buf.replace(/\n$/, '').split('\n').forEach(x => lines.push(x)); buf = ''; };
  Array.from(kids).forEach(c => {
    if (!isEdBlock(c)) { buf += serInline(c); return; }
    flush();
    const t = c.tagName;
    if (c.dataset && c.dataset.img) lines.push('[image:' + c.dataset.img + ']');
    else if (/^H[1-6]$/.test(t)) { const tx = serInline(c).replace(/\n/g, ' ').trim(); lines.push(tx ? '#'.repeat(Math.min(3, +t[1])) + ' ' + tx : ''); }
    else if (t === 'UL' || t === 'OL') { let k = 0; Array.from(c.children).forEach(li => {
      if (li.tagName === 'UL' || li.tagName === 'OL') { serBlocks([li], lines, depth + 1); return; }
      const subs = Array.from(li.childNodes).filter(n => n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL'));
      const txt = Array.from(li.childNodes).filter(n => subs.indexOf(n) < 0).map(serInline).join('').replace(/\n+$/, '').replace(/\n/g, ' ');
      lines.push('  '.repeat(depth) + (t === 'OL' ? (++k) + '. ' : '- ') + txt.trim());
      subs.forEach(n => serBlocks([n], lines, depth + 1));
    }); }
    else if (t === 'LI') lines.push('- ' + serInline(c).replace(/\n/g, ' ').trim());
    else if (Array.from(c.childNodes).some(isEdBlock)) serBlocks(c.childNodes, lines);
    else { const tx = serInline(c); if (tx === '') lines.push(''); else tx.replace(/\n$/, '').split('\n').forEach(x => lines.push(x)); }
  });
  flush();
};
export const serializeEd = (el) => { const lines = []; serBlocks(el.childNodes, lines); while (lines.length && !lines[lines.length - 1].trim()) lines.pop(); return lines.join('\n'); };
