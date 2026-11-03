// Turns the arrows of a map into a forest for the layout engines:
// kids[id] = ordered child ids, roots = [mainId, ...other root ids].
// Tree edges are followed first; boxes reached only through cross-links or
// against the arrow direction are attached afterwards ("lenient" pass).
export function buildForest(nodes, edges, TI, mode, opt, random = Math.random) {
  const main = nodes.find(n => n.main) || nodes[0];
  const adj = {}; nodes.forEach(n => adj[n.id] = []);
  edges.forEach(e => { if (adj[e.from] && adj[e.to]) { adj[e.from].push(e.to); if (e.both) adj[e.to].push(e.from); } });
  const und = {}; nodes.forEach(n => und[n.id] = []);
  edges.forEach(e => { if (und[e.from] && und[e.to]) { und[e.from].push(e.to); und[e.to].push(e.from); } });
  const byY = (a, b) => { const A = nodes.find(n => n.id === a), B = nodes.find(n => n.id === b); return mode === 'down' ? (A.x - B.x) : (A.y - B.y); };
  const seen = new Set(), kids = {}, tkids = {};
  nodes.forEach(n => tkids[n.id] = []);
  edges.forEach(e => { if (!TI.cross.has(e.id) && tkids[e.from] && tkids[e.to]) { if (TI.pe[e.to] === e) tkids[e.from].push(e.to); else if (e.both && !TI.pe[e.to]) tkids[e.from].push(e.to); } });
  let lenient = false;
  const build = (root) => {
    const q = [root]; seen.add(root);
    while (q.length) {
      const c = q.shift(); kids[c] = kids[c] || [];
      const nb = lenient ? adj[c].filter(x => !seen.has(x)).concat(und[c].filter(x => !seen.has(x) && !adj[c].includes(x))) : tkids[c].filter(x => !seen.has(x));
      const sorted = [...new Set(nb)].sort(byY); if (opt.shuffle) for (let i = sorted.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [sorted[i], sorted[j]] = [sorted[j], sorted[i]]; }
      sorted.forEach(x => { if (!seen.has(x)) { seen.add(x); kids[c].push(x); q.push(x); } });
    }
  };
  build(main.id);
  lenient = true;
  { let grew = true; while (grew) { grew = false; Array.from(seen).forEach(id => { const nb = und[id].filter(x => !seen.has(x)); if (nb.length) { grew = true; nb.forEach(x => { if (!seen.has(x)) { seen.add(x); kids[id].push(x); } }); nb.forEach(x => { if (!kids[x]) build(x); }); } }); } }
  const roots = [main.id];
  lenient = false;
  nodes.forEach(n => { if (!seen.has(n.id)) { build(n.id); roots.push(n.id); } });
  nodes.forEach(n => { kids[n.id] = kids[n.id] || []; });
  return { kids: kids, roots: roots, main: main };
}
