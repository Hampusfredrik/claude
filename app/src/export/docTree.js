// Outline of a map for documents: boxes in reading order (breadth-first from
// the main topic, children sorted top-to-bottom), numbered 1, 1.1, 1.2, …
// orderKids(parentId, ids) → ids can reorder siblings (the notebook view uses
// it for its own order); without it the order is the default one above.
// Each item has: n (box), depth, num, key, parent (parent box id, or null for
// a box that is not connected to the main topic).
export function docTree(nodes, edges, mi, multi, orderKids) {
  const main = nodes.find(n => n.main) || nodes[0];
  if (!main) return { main: null, items: [] };
  const byId = {}; nodes.forEach(n => { byId[n.id] = n; });
  const outs = (id) => { const o = []; edges.forEach(e => { const nx = e.from === id ? e.to : (e.both && e.to === id ? e.from : null); if (nx && byId[nx] && o.indexOf(nx) < 0) o.push(nx); }); return o; };
  const seen = {}, ch = {};
  const grow = (root) => { seen[root] = 1; const q = [root]; while (q.length) { const id = q.shift(); outs(id).forEach(nx => { if (!seen[nx]) { seen[nx] = 1; (ch[id] = ch[id] || []).push(nx); q.push(nx); } }); } };
  grow(main.id);
  const mainKids = (ch[main.id] || []).slice();
  const roots = orderKids ? orderKids(main.id, mainKids) : mainKids;
  const hasIn = {}; edges.forEach(e => { hasIn[e.to] = 1; if (e.both) hasIn[e.from] = 1; });
  nodes.filter(n => !seen[n.id] && !hasIn[n.id]).concat(nodes).forEach(n => { if (!seen[n.id]) { roots.push(n.id); grow(n.id); } });
  const pos = (a, b) => (byId[a].y - byId[b].y) || (byId[a].x - byId[b].x);
  const pre = multi ? (mi + 1) + '.' : '', items = [];
  const walk = (id, depth, num, parent) => {
    items.push({ n: byId[id], depth: depth, num: num, key: 'b' + mi + '_' + id, parent: parent });
    const kids = (ch[id] || []).slice().sort(pos);
    (orderKids ? orderKids(id, kids) : kids).forEach((c, i) => walk(c, depth + 1, num + '.' + (i + 1), id));
  };
  roots.forEach((r, i) => walk(r, 1, pre + (i + 1), mainKids.indexOf(r) >= 0 ? main.id : null));
  return { main: main, items: items };
}

export function docTrees(maps) {
  const multi = maps.length > 1;
  return maps.map((m, mi) => { const tr = docTree(m.nodes, m.edges, mi, multi), byId = {}; m.nodes.forEach(n => { byId[n.id] = n; }); return { m: m, main: tr.main, items: tr.items, byId: byId, mk: 'm' + mi, conn: m.edges.filter(e => e.notes && e.notes.trim()) }; });
}
