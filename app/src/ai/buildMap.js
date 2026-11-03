import { DEFAULT_CATS, MH, MW, NH, NW } from '../model/constants.js';

// Builds a new map from the parsed AI object (see AI_SPEC): boxes are placed as a
// two-sided mind map, categories and [[label]] links are resolved, and the view
// is fitted to `rect` (the canvas size). `base` (a timestamp) makes the ids.
// Returns { error } or { title, map } where map is what is stored in localStorage.
export function buildAiMap(m, base, rect) {
  const title = String(m.title || m.label || m.topic || 'Imported map');
  const catNames = (Array.isArray(m.categories) ? m.categories : []).map(c => String(typeof c === 'string' ? c : (c && c.name) || '')).filter(Boolean).slice(0, DEFAULT_CATS.length);
  const cats = DEFAULT_CATS.map((c, i) => catNames[i] ? Object.assign({}, c, { name: catNames[i] }) : c);
  const catId = (name) => { const i = catNames.findIndex(c => c.toLowerCase() === String(name || '').toLowerCase()); return i >= 0 ? cats[i].id : undefined; };
  let k = 0; const nid = () => 'n' + base + '_' + (k++);
  const nodes = [], edges = [], byLabel = {}, raw = [];
  const kidsOf = (o) => (Array.isArray(o.children) ? o.children : Array.isArray(o.nodes) ? o.nodes : []).filter(c => c && typeof c === 'object');
  const mkNode = (o, main) => {
    const refList = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map(r => String(typeof r === 'object' && r ? (r.text || r.citation || '') : r).trim()).filter(Boolean);
    const tabs = (Array.isArray(o.tabs) && o.tabs.length ? o.tabs : [{ name: 'Sheet 1', notes: o.notes || '' }]).map((p, i) => ({ id: 'p' + i, name: String(p.name || ('Sheet ' + (i + 1))), notes: String(p.notes || p.text || ''), refs: refList(p.references || p.refs).join('\n') }));
    const boxRefs = refList(o.references || o.refs); if (boxRefs.length) tabs[0].refs = tabs[0].refs ? tabs[0].refs + '\n' + boxRefs.join('\n') : boxRefs.join('\n');
    const refs = tabs[0].refs;
    const n = { id: nid(), label: main ? title : String(o.label || o.title || 'Untitled'), x: 0, y: 0, notes: tabs[0].notes, refs: refs, cat: main ? undefined : catId(o.category) };
    const subT = o.subtitle || o.sub || o.summary; if (subT) n.sub = String(subT).trim();
    if (main) n.main = true;
    if (tabs.length > 1 || o.tabs) n.pages = tabs;
    nodes.push(n); raw.push(n); byLabel[n.label.toLowerCase()] = byLabel[n.label.toLowerCase()] || n.id; return n;
  };
  const ROW = NH + 26, COL = NW + 92;
  const leaves = (o) => { const ks = kidsOf(o); return ks.length ? ks.reduce((s, c) => s + leaves(c), 0) : 1; };
  const place = (o, parent, depth, dir, top) => {
    const n = mkNode(o, false), span = leaves(o) * ROW;
    n._rc = n.cat; if (n.cat && n.cat === parent._rc) n.cat = undefined;
    n.x = dir > 0 ? MW / 2 + 90 + (depth - 1) * COL : -MW / 2 - 90 - NW - (depth - 1) * COL;
    n.y = top + span / 2 - NH / 2 - 40 + MH / 2;
    edges.push({ id: 'e' + base + '_' + (k++), from: parent.id, to: n.id, both: false, strength: 'thin' });
    let t = top; kidsOf(o).forEach(c => { place(c, n, depth + 1, dir, t); t += leaves(c) * ROW; });
  };
  const main = mkNode(m, true); main.x = -MW / 2; main.y = -40;
  const top = kidsOf(m), tot = top.reduce((s, c) => s + leaves(c), 0);
  let acc = 0, cut = top.length; for (let i = 0; i < top.length; i++) { if (acc >= tot / 2 && i > 0) { cut = i; break; } acc += leaves(top[i]); }
  if (top.length < 4) cut = top.length;
  [[top.slice(0, cut), 1], [top.slice(cut), -1]].forEach(([grp, dir]) => { const h = grp.reduce((s, c) => s + leaves(c), 0) * ROW; let t = -h / 2; grp.forEach(c => { place(c, main, 1, dir, t); t += leaves(c) * ROW; }); });
  const fix = (s) => String(s || '').replace(/\[\[([^\]]+)\]\]/g, (w, l) => byLabel[l.trim().toLowerCase()] ? '[[' + byLabel[l.trim().toLowerCase()] + ']]' : l);
  nodes.forEach(n => { delete n._rc; n.notes = fix(n.notes); if (n.pages) n.pages = n.pages.map(p => Object.assign({}, p, { notes: fix(p.notes) })); });
  (Array.isArray(m.links) ? m.links : []).forEach(l => { const a = byLabel[String(l.from || '').toLowerCase()], b = byLabel[String(l.to || '').toLowerCase()]; if (a && b && a !== b) edges.push({ id: 'e' + base + '_' + (k++), from: a, to: b, both: !!l.both, strength: ['thin', 'medium', 'thick'].indexOf(l.strength) >= 0 ? l.strength : 'thin' }); });
  if (nodes.length < 2 && !main.notes) return { error: 'No boxes found. The JSON needs a "children" list.' };
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y), r = rect || { width: 1000, height: 700 };
  const w = Math.max(...xs) + NW - Math.min(...xs), h = Math.max(...ys) + NH - Math.min(...ys);
  const scale = Math.max(0.25, Math.min(1, (r.width - 80) / w, (r.height - 80) / h));
  const cx = (Math.max(...xs) + NW + Math.min(...xs)) / 2, cy = (Math.max(...ys) + NH + Math.min(...ys)) / 2;
  return { title: title, map: { nodes: nodes, edges: edges, frames: [], tx: r.width / 2 - cx * scale, ty: r.height / 2 - cy * scale, scale: scale, cats: cats } };
}
