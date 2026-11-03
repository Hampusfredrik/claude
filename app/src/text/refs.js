// References: parsing, DOI/PubMed lookup, numbering (Vancouver style).
export const URL_RE = /(https?:\/\/[^\s<>"]+)|\b(10\.\d{4,9}\/[^\s<>"]+)/i;
export const parseRefs = (txt) => (txt || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
  const m = l.match(URL_RE);
  const href = m ? (m[1] || ('https://doi.org/' + m[2])).replace(/[.,;)]+$/, '') : null;
  return { text: l, href: href };
});
export const decEnt = (t) => { const d = document.createElement('textarea'); d.innerHTML = String(t || '').replace(/<[^>]+>/g, ''); return d.value.replace(/\s+/g, ' ').trim(); };
export const initials = (g) => String(g || '').split(/[\s\-.]+/).filter(Boolean).map(x => x[0].toUpperCase()).join('');
export const vancAuthors = (a) => { a = a.filter(Boolean); if (!a.length) return ''; return (a.length > 6 ? a.slice(0, 6).join(', ') + ', et al' : a.join(', ')) + '. '; };
export const refIdOf = (t) => {
  const s = String(t || '').trim(); let m;
  if ((m = s.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)) || (m = s.match(/^(?:PMID:?\s*)?(\d{5,9})$/i))) return { pmid: m[1] };
  if (/\s/.test(s.replace(/^doi:\s*/i, ''))) return null;
  if ((m = s.match(/(10\.\d{4,9}\/[^\s"<>]+)/))) return { doi: decodeURIComponent(m[1]).replace(/[.,;)]+$/, '') };
  return null;
};
export const fetchRef = async (id) => {
  let s;
  if (id.pmid) {
    let r; try { r = await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=' + id.pmid); } catch (err) { throw new Error('Could not reach PubMed'); }
    if (!r.ok) throw new Error('PubMed did not answer');
    const j = await r.json(), d = j.result && j.result[id.pmid];
    if (!d || d.error) throw new Error('No PubMed article with ID ' + id.pmid);
    const doi = ((d.articleids || []).find(x => x.idtype === 'doi') || {}).value;
    const yr = (String(d.pubdate || '').match(/\d{4}/) || [''])[0];
    s = vancAuthors((d.authors || []).map(a => a.name)) + decEnt(d.title).replace(/\.$/, '') + '. ' + (d.source ? decEnt(d.source) + '. ' : '') + yr + (d.volume ? ';' + d.volume : '') + (d.issue ? '(' + d.issue + ')' : '') + (d.pages ? ':' + d.pages : '') + '.' + (doi ? ' doi:' + doi + '.' : '') + ' PMID: ' + id.pmid + '.';
  } else {
    let r; try { r = await fetch('https://api.crossref.org/works/' + id.doi.split('/').map(encodeURIComponent).join('/')); } catch (err) { throw new Error('Could not reach Crossref'); }
    if (!r.ok) throw new Error(r.status === 404 ? 'DOI not found' : 'Crossref did not answer');
    const m = (await r.json()).message || {};
    const au = (m.author || []).map(a => a.family ? decEnt(a.family) + ' ' + initials(decEnt(a.given)) : decEnt(a.name)).map(x => x.trim());
    const jr = decEnt((m['short-container-title'] || [])[0] || (m['container-title'] || [])[0] || '');
    const dp = (m['published-print'] || m['published-online'] || m.issued || {})['date-parts'];
    const yr = dp && dp[0] && dp[0][0] ? dp[0][0] : '';
    s = vancAuthors(au) + decEnt((m.title || [])[0] || 'Untitled').replace(/\.$/, '') + '. ' + (jr ? jr + '. ' : (m.publisher ? decEnt(m.publisher) + '; ' : '')) + yr + (m.volume ? ';' + m.volume : '') + (m.issue ? '(' + m.issue + ')' : '') + (m.page ? ':' + m.page : '') + '.' + ' doi:' + (m.DOI || id.doi) + '.';
  }
  return s.replace(/\.\s*\./g, '.').replace(/\s+/g, ' ').trim();
};
export const refKey = (t) => { const m = String(t).match(/10\.\d{4,9}\/[^\s"<>]+/); if (m) return 'doi:' + m[0].replace(/[.,;)]+$/, '').toLowerCase(); const p = String(t).match(/PMID:?\s*(\d+)/i); if (p) return 'pmid:' + p[1]; return 't:' + String(t).toLowerCase().replace(/[^a-z0-9]+/g, ''); };
export const refBank = () => {
  const list = [], idx = {};
  return { list: list, map: (notes, refsTxt) => {
    const loc = parseRefs(refsTxt), gmap = {};
    const assign = (i) => { const r = loc[i]; if (!r) return null; const k = refKey(r.text); if (idx[k] == null) { idx[k] = list.length; list.push(r); } return idx[k] + 1; };
    (notes || '').replace(/\[(\d+)\]/g, (m, d) => { const i = +d - 1; if (gmap[i] == null) { const g = assign(i); if (g) gmap[i] = g; } return m; });
    loc.forEach((r, i) => { if (gmap[i] == null) gmap[i] = assign(i); });
    return (notes || '').replace(/\[(\d+)\]/g, (m, d) => gmap[+d - 1] ? '[' + gmap[+d - 1] + ']' : m);
  } };
};
export const vancouver = (notes, refsTxt) => {
  const lines = (refsTxt || '').split('\n').map(l => l.trim()).filter(Boolean);
  const map = {}, order = [];
  (notes || '').replace(/\[(\d+)\]/g, (m, d) => { const i = parseInt(d, 10) - 1; if (i >= 0 && i < lines.length && map[i] == null) { map[i] = order.length; order.push(i); } return m; });
  lines.forEach((l, i) => { if (map[i] == null) { map[i] = order.length; order.push(i); } });
  const newNotes = (notes || '').replace(/\[(\d+)\]/g, (m, d) => { const i = parseInt(d, 10) - 1; return map[i] != null ? '[' + (map[i] + 1) + ']' : m; });
  return { notes: newNotes, refs: order.map(i => lines[i]).join('\n') };
};
