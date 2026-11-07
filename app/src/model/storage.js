// Map data model helpers and localStorage reads.
import { CATS, DEFAULT_CATS, OLD_NAMES, mk } from './constants.js';
export const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (err) { return null; } };
export const titleOf = (nodes) => { const m = (nodes || []).find(n => n.main) || (nodes || [])[0]; return (m && m.label && m.label.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\s][^*]*)\*/g, '$1').replace(/\s*\n\s*/g, ' ').trim()) || 'Untitled map'; };
export const blankMap = (label) => ({ nodes: [{ id: 'n1', label: label || 'Main topic', x: -113, y: -40, main: true, notes: '', refs: '' }], edges: [], tx: 0, ty: 0, scale: 1, cats: DEFAULT_CATS });
export const pagesOf = (n) => { const ps = n.pages && n.pages.length ? n.pages : [{ id: 'p0', name: 'Sheet 1' }]; const a = Math.min(n.pageIdx || 0, ps.length - 1); return ps.map((p, i) => i === a ? Object.assign({}, p, { notes: n.notes || '', refs: n.refs || '' }) : Object.assign({ notes: '', refs: '' }, p)); };
export const pageIdxOf = (n) => Math.max(0, Math.min(n.pageIdx || 0, (n.pages || []).length - 1));
export const allNotes = (n) => pagesOf(n).map(p => p.notes).join('\n');
export const allRefs = (n) => pagesOf(n).map(p => p.refs).join('\n');
export const migrateCats = (list) => { const out = list.map(c => { const d = DEFAULT_CATS.find(x => x.id === c.id); return d && (OLD_NAMES[c.id] || []).includes(c.name) ? Object.assign({}, c, { name: d.name }) : c; }); DEFAULT_CATS.forEach(d => { if (!out.some(c => c.id === d.id)) out.push(d); }); return out; };
export const loadCats = () => { const saved = readJSON(CATS); return saved ? migrateCats(saved) : DEFAULT_CATS; };

// Maps that are stored ("visual-notebook.map.<id>") but missing from the map
// list (index). This happens when an older or shorter list replaced the list
// in the account, for example after using the app at a new address before
// logging in. Returns list entries to append: { id, title, updated, folder }.
export const findUnlistedMaps = (keys, index, read, timeOf) => {
  const listed = new Set(((index && index.maps) || []).map(m => m.id));
  return keys.filter(k => k.indexOf(mk('')) === 0).map(k => k.slice(mk('').length)).filter(id => id && !listed.has(id)).map(id => {
    const d = read(mk(id));
    return d && Array.isArray(d.nodes) ? { id: id, title: titleOf(d.nodes), updated: timeOf(mk(id)) || 0, folder: null } : null;
  }).filter(Boolean).sort((a, b) => b.updated - a.updated);
};
