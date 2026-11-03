// Tree layouts: 'both' (mind map with branches on both sides of the main
// topic), 'right' (left to right) and 'down' (top to bottom).
// Leaf groups of 3+ boxes are staggered in two columns to save height.
export function mindMapLayout(nodes, kids, roots, sz, main, sf, mode, jit) {
  const down = mode === 'down';
  const GAP_D = (down ? 80 : 90) * sf, GAP_S = (down ? 28 : 22) * sf;
  const brk = (id) => down ? sz[id].w : sz[id].h;
  const dep = (id) => down ? sz[id].h : sz[id].w;
  const span = {}, GAP_G = GAP_S * 2.4, stag = {}; let stagCount = 0;
  const gp = (a, b) => (kids[a].length || kids[b].length) ? GAP_G : GAP_S;
  const gapSum = (k) => { let t = 0; for (let i = 1; i < k.length; i++) t += gp(k[i - 1], k[i]); return t; };
  const stepOf = (k) => (Math.max(...k.map(brk)) + GAP_S) * 0.62;
  const measure = (id) => { const k = kids[id]; const own = brk(id); if (!k.length) return span[id] = own;
    if (!down && k.length >= 3 && k.every(c => !kids[c].length)) { stag[id] = true; k.forEach(c => span[c] = brk(c)); return span[id] = Math.max(own, (k.length - 1) * stepOf(k) + Math.max(...k.map(brk))); }
    const t = k.reduce((a, c) => a + measure(c), 0) + gapSum(k); return span[id] = Math.max(own, t); };
  const levelDepth = [];
  const depthOf = {};
  const walkD = (id, d) => { depthOf[id] = d; levelDepth[d] = Math.max(levelDepth[d] || 0, dep(id)); kids[id].forEach(c => walkD(c, d + 1)); };
  const pos = {};
  const place = (id, start, depthPos, sign) => {
    const sp = span[id];
    const mid = start + sp / 2;
    pos[id] = { b: mid - brk(id) / 2, d: sign > 0 ? depthPos : depthPos - dep(id) };
    const k = kids[id]; if (!k.length) return;
    const next = sign > 0 ? depthPos + levelDepth[depthOf[id]] + GAP_D : depthPos - levelDepth[depthOf[id]] - GAP_D;
    if (stag[id]) {
      const step = stepOf(k), tot = (k.length - 1) * step + Math.max(...k.map(brk)), st0 = mid - tot / 2;
      const ph = (stagCount++) % 2;
      const wA = Math.max(...k.filter((c, i) => (i + ph) % 2 === 0).map(dep));
      k.forEach((c, i) => { const off = (i + ph) % 2 ? wA + 40 * sf : 0; place(c, st0 + i * step, sign > 0 ? next + off : next - off, sign); });
      return;
    }
    const t = k.reduce((a, c) => a + span[c], 0) + gapSum(k);
    let st = mid - t / 2;
    k.forEach((c, i) => { place(c, st, next, sign); st += span[c] + (i < k.length - 1 ? gp(c, k[i + 1]) : 0); });
  };
  let cursor = 0;
  roots.forEach((rid, ri) => {
    if (mode === 'both' && ri === 0 && kids[rid].length > 1) {
      const all = kids[rid];
      all.forEach(c => measure(c));
      const total = all.reduce((a, c) => a + span[c], 0);
      let acc = 0; const right = [], left = [];
      all.forEach(c => { if (acc + span[c] / 2 <= total / 2 || !right.length) { right.push(c); acc += span[c]; } else left.push(c); });
      const rootW = sz[rid].w, rootH = sz[rid].h;
      span[rid] = rootH;
      depthOf[rid] = 0; levelDepth.length = 0; levelDepth[0] = rootW;
      const side = (list, sign) => {
        const lvl = [];
        const wd = (id, d) => { depthOf[id] = d; lvl[d] = Math.max(lvl[d] || 0, sz[id].w); kids[id].forEach(c => wd(c, d + 1)); };
        list.forEach(c => wd(c, 1));
        const saved = levelDepth.slice(); for (let i = 1; i < lvl.length; i++) levelDepth[i] = lvl[i];
        const t = list.reduce((a, c) => a + span[c], 0) + gapSum(list);
        let st = rootH / 2 - t / 2;
        const startD = sign > 0 ? rootW + GAP_D : -GAP_D;
        list.forEach((c, i) => { place(c, st, startD, sign); st += span[c] + (i < list.length - 1 ? gp(c, list[i + 1]) : 0); });
        levelDepth.length = 0; saved.forEach((v, i) => levelDepth[i] = v);
      };
      pos[rid] = { b: 0, d: 0 };
      side(right, 1); side(left.slice().reverse(), -1);
      let lo = Infinity, hi = -Infinity;
      Object.keys(pos).forEach(id => { lo = Math.min(lo, pos[id].b); hi = Math.max(hi, pos[id].b + brk(id)); });
      const shift = cursor - lo; Object.keys(pos).forEach(id => pos[id].b += shift);
      cursor += (hi - lo) + 80;
      return;
    }
    measure(rid);
    levelDepth.length = 0; walkD(rid, 0);
    place(rid, cursor, 0, 1);
    cursor += span[rid] + 80;
  });
  const m0 = pos[main.id];
  const ox = main.x - (down ? m0.b : m0.d), oy = main.y - (down ? m0.d : m0.b);
  return nodes.map(n => { const p = pos[n.id]; if (!p) return n; const q = n.id === main.id ? (x => x) : jit; return Object.assign({}, n, down ? { x: Math.round(q(p.b + ox)), y: Math.round(q(p.d + oy)) } : { x: Math.round(q(p.d + ox)), y: Math.round(q(p.b + oy)) }); });
}
