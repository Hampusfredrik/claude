// Sibling order before a tree/mind-map layout.

// Reorders the main branches so that branches joined by cross-links sit next to
// each other (cyclic = both-sides mind map, where the first and last branch
// meet), then orders each branch's children towards their link partners.
// Mutates kids.
export function orderByLinks(kids, mainId, cyclic, edges) {
  const top = kids[mainId]; if (!top || top.length < 3) return;
  const br = {}, leaves = {};
  const lf = (id) => leaves[id] = kids[id].length ? kids[id].reduce((a, c) => a + lf(c), 0) : 1;
  top.forEach((b, i) => { lf(b); const mark = (x) => { br[x] = i; kids[x].forEach(mark); }; mark(b); });
  const n = top.length, W = top.map(() => top.map(() => 0)); let any = 0;
  edges.forEach(e => { const a = br[e.from], b = br[e.to]; if (a == null || b == null || a === b) return; W[a][b]++; W[b][a]++; any++; });
  if (!any) return;
  const sizes = top.map(b => leaves[b] + 1.5);
  const centers = (ord) => { const c = new Array(n); let acc = 0; ord.forEach(i => { c[i] = acc + sizes[i] / 2; acc += sizes[i]; }); return { c: c, T: acc }; };
  const cost = (ord) => { const { c, T } = centers(ord); let t = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (W[i][j]) { let dd = Math.abs(c[i] - c[j]); if (cyclic) dd = Math.min(dd, T - dd); t += W[i][j] * dd; } return t; };
  let ord = top.map((b, i) => i), best = cost(ord);
  for (let round = 0; round < 40; round++) {
    let improved = false;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i === j) continue; const o = ord.slice(); const [x] = o.splice(i, 1); o.splice(j, 0, x); const c = cost(o); if (c < best - 1e-9) { best = c; ord = o; improved = true; } }
    if (!improved) break;
  }
  kids[mainId] = ord.map(i => top[i]);
  const { c, T } = centers(ord);
  const yOf = (bi) => cyclic ? (c[bi] <= T / 2 ? c[bi] : T - c[bi]) : c[bi];
  const partnersY = (x, acc) => { edges.forEach(e => { const o = e.from === x ? e.to : e.to === x ? e.from : null; if (o == null || br[o] == null || br[o] === br[x]) return; acc.push(yOf(br[o])); }); kids[x].forEach(k => partnersY(k, acc)); return acc; };
  top.forEach((b, bi) => {
    const k = kids[b]; if (k.length < 2) return;
    const yb = yOf(bi), sp = leaves[b], flip = cyclic && c[bi] > T / 2 ? -1 : 1;
    const keyed = k.map((x, i) => { const ys = partnersY(x, []); return { x: x, key: ys.length ? ys.reduce((a, v) => a + v, 0) / ys.length : yb + (i / (k.length - 1) - 0.5) * sp * flip }; });
    keyed.sort((p, q) => (p.key - q.key) * flip);
    kids[b] = keyed.map(p => p.x);
  });
}

// Groups siblings by (dominant) category, keeping the first appearance order
// of each category and the existing order within a category. Mutates kids.
export function groupByCategory(kids, nodes, cats) {
  const catOf = {}; nodes.forEach(n => catOf[n.id] = n.cat || '');
  const catRank = {}; (cats || []).forEach((c, i) => catRank[c.id] = i);
  const domCat = {}; const dc = (id) => { const cnt = {}; const walk = (x) => { if (catOf[x]) cnt[catOf[x]] = (cnt[catOf[x]] || 0) + 1; kids[x].forEach(walk); }; walk(id); let b = '', bn = 0; Object.keys(cnt).forEach(k => { if (cnt[k] > bn) { bn = cnt[k]; b = k; } }); return domCat[id] = catOf[id] || b; };
  Object.keys(kids).forEach(pid => { const k = kids[pid]; if (k.length < 2) return; k.forEach(dc);
    const first = {}; k.forEach((x, i) => { const c = domCat[x]; if (first[c] == null) first[c] = i; });
    const pos = {}; k.forEach((x, i) => pos[x] = i);
    kids[pid] = k.slice().sort((p, q) => (first[domCat[p]] - first[domCat[q]]) || (pos[p] - pos[q])); });
}
