// Radial layout: the main topic in the centre, each level on a ring, every
// subtree gets an angle proportional to its number of leaves.
// Returns { id: {x, y} } (top-left corners, before the main box is pinned).
export function radialPositions(nodes, kids, roots, sz, sf, opt) {
  const leaves = {}; const lf = (id) => leaves[id] = kids[id].length ? kids[id].reduce((a, c) => a + lf(c), 0) : 1;
  const dims = nodes.map(n => Math.max(sz[n.id].w, sz[n.id].h * 2));
  const avg = dims.reduce((a, b) => a + b, 0) / dims.length;
  const step = (Math.max(...nodes.map(n => sz[n.id].w)) * 0.75 + 70) * sf;
  const out = {}; let cursor = 0;
  roots.forEach(rid => {
    lf(rid);
    const cnt = []; const cd = (id, dd) => { cnt[dd] = (cnt[dd] || 0) + 1; kids[id].forEach(c => cd(c, dd + 1)); }; cd(rid, 0);
    const rad = [0]; for (let i = 1; i < cnt.length; i++) rad[i] = Math.max(rad[i - 1] + step, cnt[i] * (avg * 0.62 + 24 * sf) / (2 * Math.PI));
    const pc = {};
    const put = (id, dd, a1, a2) => { const a = (a1 + a2) / 2; pc[id] = { x: Math.cos(a) * rad[dd], y: Math.sin(a) * rad[dd] }; let t = a1; kids[id].forEach(c => { const w = (a2 - a1) * leaves[c] / leaves[id]; put(c, dd + 1, t, t + w); t += w; }); };
    const a0 = opt.a0 != null ? opt.a0 : -Math.PI / 2;
    put(rid, 0, a0, a0 + Math.PI * 2);
    let lo = Infinity, hi = -Infinity; Object.keys(pc).forEach(id => { lo = Math.min(lo, pc[id].x - sz[id].w / 2); hi = Math.max(hi, pc[id].x + sz[id].w / 2); });
    const sh = cursor - lo; Object.keys(pc).forEach(id => out[id] = { x: pc[id].x + sh - sz[id].w / 2, y: pc[id].y - sz[id].h / 2 });
    cursor += hi - lo + 120;
  });
  return out;
}

// Applies radialPositions so the main box stays where it is.
export function radialLayout(nodes, kids, roots, sz, main, sf, opt, jit) {
  const out = radialPositions(nodes, kids, roots, sz, sf, opt);
  const m0 = out[main.id], ox = main.x - m0.x, oy = main.y - m0.y;
  return nodes.map(n => { const p = out[n.id]; if (!p) return n; return Object.assign({}, n, { x: Math.round(n.id === main.id ? main.x : jit(p.x + ox)), y: Math.round(n.id === main.id ? main.y : jit(p.y + oy)) }); });
}
