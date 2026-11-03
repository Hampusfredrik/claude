// "Random shape" layout: a seeded pseudo-random pick of one of seven shapes
// (sunflower, spiral, fan, clusters, wave, orbit, organic), followed by a pass
// that pushes overlapping boxes apart. The same seed gives the same layout.
// Returns { shape, nodes }.
export function creativeLayout(nodes, edges, kids, roots, sz, main, sf, seed) {
  let t = seed >>> 0; const rnd = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; };
  const R = (a, b) => a + rnd() * (b - a), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const ids = nodes.map(n => n.id), TAU = Math.PI * 2;
  const leaves = {}, depth = {}, par = {};
  const lf = (id, dd) => { depth[id] = dd; kids[id].forEach(c => par[c] = id); return leaves[id] = kids[id].length ? kids[id].reduce((a, c) => a + lf(c, dd + 1), 0) : 1; };
  roots.forEach(r => lf(r, 0));
  const W = Math.max(...ids.map(id => sz[id].w)), unit = (W * 0.7 + 60) * sf;
  const pc = {};
  const shapes = {
    sunflower: () => { const ga = pick([2.39996, 2.39996, 2.2, 2.6, 1.9]), c = unit * R(0.42, 0.6), a0 = R(0, TAU); const order = []; const q = roots.slice(); while (q.length) { const x = q.shift(); order.push(x); q.push(...kids[x]); } order.forEach((id, i) => { const r = c * Math.sqrt(i) * 1.15, a = a0 + i * ga; pc[id] = { x: Math.cos(a) * r, y: Math.sin(a) * r }; }); },
    spiral: () => { const dir = pick([1, -1]), a0 = R(0, TAU), b = unit * R(0.16, 0.24); const order = []; const dfs = (x) => { order.push(x); kids[x].forEach(dfs); }; roots.forEach(dfs); let a = 0; order.forEach((id, i) => { if (i) { const r = Math.max(unit * 0.9, b * a); a += (unit * 0.95) / Math.max(r, 1); } const r = i ? Math.max(unit * 0.9, b * a) : 0; pc[id] = { x: Math.cos(a0 + dir * a) * r, y: Math.sin(a0 + dir * a) * r }; }); },
    fan: () => { const span = R(Math.PI * 0.8, Math.PI * 1.35), a0 = R(0, TAU), st = unit * R(1.0, 1.35); const cnt = {}; Object.keys(depth).forEach(id => cnt[depth[id]] = (cnt[depth[id]] || 0) + 1); const rad = [0]; for (let i = 1; cnt[i]; i++) rad[i] = Math.max(rad[i - 1] + st, cnt[i] * unit * 0.85 / span); const put = (id, a1, a2) => { const a = (a1 + a2) / 2; pc[id] = { x: Math.cos(a) * rad[depth[id]], y: Math.sin(a) * rad[depth[id]] }; let x = a1; kids[id].forEach(c => { const w = (a2 - a1) * leaves[c] / leaves[id]; put(c, x, x + w); x += w; }); }; roots.forEach(r => put(r, a0 - span / 2, a0 + span / 2)); },
    clusters: () => { const top = kids[main.id] || [], n = top.length || 1, a0 = R(0, TAU), R0 = unit * R(1.6, 2.2) * Math.max(1, n / 5); pc[main.id] = { x: 0, y: 0 }; top.forEach((c, i) => { const a = a0 + i * TAU / n, cx = Math.cos(a) * R0 * (1 + leaves[c] * 0.05), cy = Math.sin(a) * R0 * (1 + leaves[c] * 0.05); pc[c] = { x: cx, y: cy }; const sub = []; const dfs = (x) => kids[x].forEach(k => { sub.push(k); dfs(k); }); dfs(c); const spread = Math.min(Math.PI * 1.6, Math.PI * 0.5 + sub.length * 0.35); sub.forEach((k, j) => { const r = unit * (0.9 + 0.35 * Math.floor(j / 6)), aa = a - spread / 2 + spread * (sub.length > 1 ? j / (sub.length - 1) : 0.5) + R(-0.15, 0.15); pc[k] = { x: cx + Math.cos(aa) * r, y: cy + Math.sin(aa) * r }; }); }); },
    wave: () => { const amp = unit * R(0.6, 1.4), freq = R(0.5, 1.2), ph = R(0, TAU), vertical = rnd() < 0.4; let row = 0; const place = (id) => { const k = kids[id]; let y; if (!k.length) { y = row; row += 1; } else { k.forEach(place); y = (pc[k[0]].b + pc[k[k.length - 1]].b) / 2; } pc[id] = { b: y }; }; roots.forEach(place); ids.forEach(id => { if (!pc[id]) return; const dd = depth[id] * unit * 1.35, bb = pc[id].b * (sz[id].h + 26 * sf) * 1.15, off = Math.sin(dd / unit * freq + ph) * amp * (depth[id] ? 1 : 0); pc[id] = vertical ? { x: bb * 1.9, y: dd + off } : { x: dd, y: bb + off }; }); },
    orbit: () => { const cnt = {}; Object.keys(depth).forEach(id => (cnt[depth[id]] = cnt[depth[id]] || []).push(id)); const st = unit * R(1.0, 1.3), squash = R(0.55, 1); let r = 0; Object.keys(cnt).sort((a, b) => a - b).forEach(dd => { const list = cnt[dd]; if (+dd === 0) { list.forEach(id => pc[id] = { x: 0, y: 0 }); return; } r = Math.max(r + st, list.length * unit * 0.8 / TAU); const rot = R(0, TAU); list.forEach((id, i) => { const a = rot + i * TAU / list.length; pc[id] = { x: Math.cos(a) * r, y: Math.sin(a) * r * squash }; }); }); },
    organic: () => { const L0 = unit * R(0.9, 1.3); ids.forEach(id => { pc[id] = { x: R(-1, 1) * unit * 3, y: R(-1, 1) * unit * 3 }; }); pc[main.id] = { x: 0, y: 0 }; const E = edges.filter(e => pc[e.from] && pc[e.to]); for (let it = 0; it < 260; it++) { const f = {}; ids.forEach(id => f[id] = { x: -pc[id].x * 0.004, y: -pc[id].y * 0.004 }); for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const A = pc[ids[i]], B = pc[ids[j]]; let dx = A.x - B.x, dy = A.y - B.y, d2 = dx * dx + dy * dy + 1; const k = unit * unit * 0.6 / d2; f[ids[i]].x += dx * k; f[ids[i]].y += dy * k; f[ids[j]].x -= dx * k; f[ids[j]].y -= dy * k; } E.forEach(e => { const A = pc[e.from], B = pc[e.to], dx = B.x - A.x, dy = B.y - A.y, dd = Math.hypot(dx, dy) || 1, k = (dd - L0) / dd * 0.06; f[e.from].x += dx * k; f[e.from].y += dy * k; f[e.to].x -= dx * k; f[e.to].y -= dy * k; }); const cool = 1 - it / 300; ids.forEach(id => { if (id === main.id) return; const v = f[id], m = Math.hypot(v.x, v.y), cap = unit * 0.5 * cool; const sc = m > cap ? cap / m : 1; pc[id].x += v.x * sc; pc[id].y += v.y * sc; }); } }
  };
  const names = Object.keys(shapes), name = pick(names);
  shapes[name]();
  ids.forEach(id => { if (!pc[id] || pc[id].x == null) pc[id] = { x: R(-1, 1) * unit * 3, y: R(-1, 1) * unit * 3 }; });
  const gap = 18 * sf;
  for (let it = 0; it < 80; it++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j], A = pc[a], B = pc[b];
      const ox = (sz[a].w + sz[b].w) / 2 + gap - Math.abs(A.x - B.x), oy = (sz[a].h + sz[b].h) / 2 + gap - Math.abs(A.y - B.y);
      if (ox > 0 && oy > 0) { moved = true; const wa = a === main.id ? 0 : b === main.id ? 1 : 0.5, wb = 1 - wa;
        if (ox / (sz[a].w + sz[b].w) < oy / (sz[a].h + sz[b].h)) { const sgn = A.x < B.x ? -1 : 1; A.x += sgn * ox * wa; B.x -= sgn * ox * wb; } else { const sgn = A.y < B.y ? -1 : 1; A.y += sgn * oy * wa; B.y -= sgn * oy * wb; } }
    }
    if (!moved) break;
  }
  const m0 = pc[main.id], cx = main.x + sz[main.id].w / 2 - m0.x, cy = main.y + sz[main.id].h / 2 - m0.y;
  return { shape: name, nodes: nodes.map(n => n.id === main.id ? n : Object.assign({}, n, { x: Math.round(pc[n.id].x + cx - sz[n.id].w / 2), y: Math.round(pc[n.id].y + cy - sz[n.id].h / 2) })) };
}
