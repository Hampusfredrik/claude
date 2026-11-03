// Which arrows form the tree (parent → child) and which are cross-links.
// A box's first incoming one-way arrow is its parent edge; every other arrow
// is a cross-link (two-way arrows only when both ends already have a parent).
//   pe:    { childId: parentEdge }
//   cross: Set of cross-link edge ids
//   inc:   { nodeId: [cross-link edge ids touching it, sorted] }
export function treeInfo(edges) {
  const es = edges;
  const pe = {};
  es.forEach(e => { if (e.from === e.to) return; if (!e.both && !pe[e.to]) pe[e.to] = e; });
  const cross = new Set();
  es.forEach(e => { if (e.from === e.to) return; if (!e.both) { if (pe[e.to] !== e) cross.add(e.id); } else if (pe[e.to] && pe[e.from]) cross.add(e.id); });
  const inc = {}; es.forEach(e => { if (!cross.has(e.id)) return; [e.from, e.to].forEach(x => (inc[x] = inc[x] || []).push(e.id)); });
  Object.keys(inc).forEach(k => inc[k].sort((p, q) => String(p) < String(q) ? -1 : String(p) > String(q) ? 1 : 0));
  return { pe: pe, cross: cross, inc: inc };
}
