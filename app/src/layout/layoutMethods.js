// Automatic layout (Tidy) and snapping while dragging.
export const layoutMethods = {
  tidy(mode, opt) {
    const s = this.state; if (!s.nodes.length) return;
    opt = opt || {};
    if (mode === 'random') { mode = 'creative'; opt.seed = opt.seed || (Math.floor(Math.random() * 1e9) + 1); }
    this.lastTidy = { mode: mode, seed: opt.seed };
    const sf = s.tidySpace || 1;
    const main = s.nodes.find(n => n.main) || s.nodes[0];
    const adj = {}; s.nodes.forEach(n => adj[n.id] = []);
    s.edges.forEach(e => { if (adj[e.from] && adj[e.to]) { adj[e.from].push(e.to); if (e.both) adj[e.to].push(e.from); } });
    const und = {}; s.nodes.forEach(n => und[n.id] = []);
    s.edges.forEach(e => { if (und[e.from] && und[e.to]) { und[e.from].push(e.to); und[e.to].push(e.from); } });
    const order = {}; s.nodes.forEach((n, i) => order[n.id] = n.y * 0.001 + n.x * 0.000001 + i * 1e-9);
    const byY = (a, b) => { const A = s.nodes.find(n => n.id === a), B = s.nodes.find(n => n.id === b); return mode === 'down' ? (A.x - B.x) : (A.y - B.y); };
    const seen = new Set(), kids = {}, TI = this.treeInfo(), tkids = {};
    s.nodes.forEach(n => tkids[n.id] = []);
    s.edges.forEach(e => { if (!TI.cross.has(e.id) && tkids[e.from] && tkids[e.to]) { if (TI.pe[e.to] === e) tkids[e.from].push(e.to); else if (e.both && !TI.pe[e.to]) tkids[e.from].push(e.to); } });
    let lenient = false;
    const build = (root) => {
      const q = [root]; seen.add(root);
      while (q.length) {
        const c = q.shift(); kids[c] = kids[c] || [];
        const nb = lenient ? adj[c].filter(x => !seen.has(x)).concat(und[c].filter(x => !seen.has(x) && !adj[c].includes(x))) : tkids[c].filter(x => !seen.has(x));
        const sorted = [...new Set(nb)].sort(byY); if (opt.shuffle) for (let i = sorted.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sorted[i], sorted[j]] = [sorted[j], sorted[i]]; }
        sorted.forEach(x => { if (!seen.has(x)) { seen.add(x); kids[c].push(x); q.push(x); } });
      }
    };
    build(main.id);
    lenient = true;
    { let grew = true; while (grew) { grew = false; Array.from(seen).forEach(id => { const nb = und[id].filter(x => !seen.has(x)); if (nb.length) { grew = true; nb.forEach(x => { if (!seen.has(x)) { seen.add(x); kids[id].push(x); } }); nb.forEach(x => { if (!kids[x]) build(x); }); } }); } }
    const roots = [main.id];
    lenient = false;
    s.nodes.forEach(n => { if (!seen.has(n.id)) { build(n.id); roots.push(n.id); } });
    s.nodes.forEach(n => { kids[n.id] = kids[n.id] || []; });
    if (mode !== 'creative' && !opt.shuffle) {
      this.orderByLinks(kids, main.id, mode === 'both');
      const catOf = {}; s.nodes.forEach(n => catOf[n.id] = n.cat || '');
      const catRank = {}; (s.cats || []).forEach((c, i) => catRank[c.id] = i);
      const domCat = {}; const dc = (id) => { const cnt = {}; const walk = (x) => { if (catOf[x]) cnt[catOf[x]] = (cnt[catOf[x]] || 0) + 1; kids[x].forEach(walk); }; walk(id); let b = '', bn = 0; Object.keys(cnt).forEach(k => { if (cnt[k] > bn) { bn = cnt[k]; b = k; } }); return domCat[id] = catOf[id] || b; };
      Object.keys(kids).forEach(pid => { const k = kids[pid]; if (k.length < 2) return; k.forEach(dc);
        const first = {}; k.forEach((x, i) => { const c = domCat[x]; if (first[c] == null) first[c] = i; });
        const pos = {}; k.forEach((x, i) => pos[x] = i);
        kids[pid] = k.slice().sort((p, q) => (first[domCat[p]] - first[domCat[q]]) || (pos[p] - pos[q])); });
    }
    const sz = {}; s.nodes.forEach(n => sz[n.id] = this.size(n));
    const done = (nodes) => this.setState({ nodes: nodes, tidyOpen: !!opt.stayOpen }, () => { if (!opt.noFit) setTimeout(() => this.fitView && this.fitView(), 30); });
    if (mode === 'creative') return done(this.creativeLayout(kids, roots, sz, main, sf, opt.seed));
    const jit = (v) => opt.jitter ? v + (Math.random() - 0.5) * 24 * sf : v;
    if (mode === 'radial') {
      const leaves = {}; const lf = (id) => leaves[id] = kids[id].length ? kids[id].reduce((a, c) => a + lf(c), 0) : 1;
      const dims = s.nodes.map(n => Math.max(sz[n.id].w, sz[n.id].h * 2));
      const avg = dims.reduce((a, b) => a + b, 0) / dims.length;
      const step = (Math.max(...s.nodes.map(n => sz[n.id].w)) * 0.75 + 70) * sf;
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
      const m0 = out[main.id], ox = main.x - m0.x, oy = main.y - m0.y;
      return done(s.nodes.map(n => { const p = out[n.id]; if (!p) return n; return Object.assign({}, n, { x: Math.round(n.id === main.id ? main.x : jit(p.x + ox)), y: Math.round(n.id === main.id ? main.y : jit(p.y + oy)) }); }));
    }
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
    const nodes = s.nodes.map(n => { const p = pos[n.id]; if (!p) return n; const q = n.id === main.id ? (x => x) : jit; return Object.assign({}, n, down ? { x: Math.round(q(p.b + ox)), y: Math.round(q(p.d + oy)) } : { x: Math.round(q(p.d + ox)), y: Math.round(q(p.b + oy)) }); });
    done(nodes);
  },
  orderByLinks(kids, mainId, cyclic) {
    const top = kids[mainId]; if (!top || top.length < 3) return;
    const br = {}, leaves = {};
    const lf = (id) => leaves[id] = kids[id].length ? kids[id].reduce((a, c) => a + lf(c), 0) : 1;
    top.forEach((b, i) => { lf(b); const mark = (x) => { br[x] = i; kids[x].forEach(mark); }; mark(b); });
    const n = top.length, W = top.map(() => top.map(() => 0)); let any = 0;
    this.state.edges.forEach(e => { const a = br[e.from], b = br[e.to]; if (a == null || b == null || a === b) return; W[a][b]++; W[b][a]++; any++; });
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
    const partnersY = (x, acc) => { this.state.edges.forEach(e => { const o = e.from === x ? e.to : e.to === x ? e.from : null; if (o == null || br[o] == null || br[o] === br[x]) return; acc.push(yOf(br[o])); }); kids[x].forEach(k => partnersY(k, acc)); return acc; };
    top.forEach((b, bi) => {
      const k = kids[b]; if (k.length < 2) return;
      const yb = yOf(bi), sp = leaves[b], flip = cyclic && c[bi] > T / 2 ? -1 : 1;
      const keyed = k.map((x, i) => { const ys = partnersY(x, []); return { x: x, key: ys.length ? ys.reduce((a, v) => a + v, 0) / ys.length : yb + (i / (k.length - 1) - 0.5) * sp * flip }; });
      keyed.sort((p, q) => (p.key - q.key) * flip);
      kids[b] = keyed.map(p => p.x);
    });
  },
  treeInfo() {
    const es = this.state.edges;
    if (this._tiEdges === es) return this._ti;
    const pe = {}, incoming = {};
    es.forEach(e => { if (e.from === e.to) return; if (!e.both && !pe[e.to]) pe[e.to] = e; });
    const cross = new Set();
    es.forEach(e => { if (e.from === e.to) return; if (!e.both) { if (pe[e.to] !== e) cross.add(e.id); } else if (pe[e.to] && pe[e.from]) cross.add(e.id); });
    const inc = {}; es.forEach(e => { if (!cross.has(e.id)) return; [e.from, e.to].forEach(x => (inc[x] = inc[x] || []).push(e.id)); });
    Object.keys(inc).forEach(k => inc[k].sort((p, q) => String(p) < String(q) ? -1 : String(p) > String(q) ? 1 : 0));
    this._tiEdges = es; this._ti = { pe: pe, cross: cross, inc: inc };
    return this._ti;
  },
  creativeLayout(kids, roots, sz, main, sf, seed) {
    let t = seed >>> 0; const rnd = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; };
    const R = (a, b) => a + rnd() * (b - a), pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const s = this.state, ids = s.nodes.map(n => n.id), TAU = Math.PI * 2;
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
      organic: () => { const L0 = unit * R(0.9, 1.3); ids.forEach(id => { pc[id] = { x: R(-1, 1) * unit * 3, y: R(-1, 1) * unit * 3 }; }); pc[main.id] = { x: 0, y: 0 }; const E = s.edges.filter(e => pc[e.from] && pc[e.to]); for (let it = 0; it < 260; it++) { const f = {}; ids.forEach(id => f[id] = { x: -pc[id].x * 0.004, y: -pc[id].y * 0.004 }); for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const A = pc[ids[i]], B = pc[ids[j]]; let dx = A.x - B.x, dy = A.y - B.y, d2 = dx * dx + dy * dy + 1; const k = unit * unit * 0.6 / d2; f[ids[i]].x += dx * k; f[ids[i]].y += dy * k; f[ids[j]].x -= dx * k; f[ids[j]].y -= dy * k; } E.forEach(e => { const A = pc[e.from], B = pc[e.to], dx = B.x - A.x, dy = B.y - A.y, dd = Math.hypot(dx, dy) || 1, k = (dd - L0) / dd * 0.06; f[e.from].x += dx * k; f[e.from].y += dy * k; f[e.to].x -= dx * k; f[e.to].y -= dy * k; }); const cool = 1 - it / 300; ids.forEach(id => { if (id === main.id) return; const v = f[id], m = Math.hypot(v.x, v.y), cap = unit * 0.5 * cool; const sc = m > cap ? cap / m : 1; pc[id].x += v.x * sc; pc[id].y += v.y * sc; }); } }
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
    this._lastShape = name;
    const m0 = pc[main.id], cx = main.x + sz[main.id].w / 2 - m0.x, cy = main.y + sz[main.id].h / 2 - m0.y;
    return s.nodes.map(n => n.id === main.id ? n : Object.assign({}, n, { x: Math.round(pc[n.id].x + cx - sz[n.id].w / 2), y: Math.round(pc[n.id].y + cy - sz[n.id].h / 2) }));
  },
  spacingPairs(others, A) {
    const out = [];
    others.forEach(a => {
      let best = null;
      others.forEach(o => { if (o === a || o[A.p] < a[A.p] + a[A.s] - 0.5) return; if (o[A.q] >= a[A.q] + a[A.t] || o[A.q] + o[A.t] <= a[A.q]) return; if (!best || o[A.p] < best[A.p]) best = o; });
      if (best) out.push({ a: a, b: best, g: best[A.p] - (a[A.p] + a[A.s]) });
    });
    return out;
  },
  spacingSnap(me, others, pairs, A, th) {
    const row = others.filter(o => o[A.q] < me[A.q] + me[A.t] && o[A.q] + o[A.t] > me[A.q]);
    let L = null, R = null;
    row.forEach(o => { if (o[A.p] + o[A.s] <= me[A.p] + 1 && (!L || o[A.p] + o[A.s] > L[A.p] + L[A.s])) L = o; if (o[A.p] >= me[A.p] + me[A.s] - 1 && (!R || o[A.p] < R[A.p])) R = o; });
    const cands = [];
    if (L && R) { const v = (L[A.p] + L[A.s] + R[A.p] - me[A.s]) / 2; if (v >= L[A.p] + L[A.s]) cands.push(v); }
    pairs.forEach(pr => { if (pr.g < 2) return; if (L) cands.push(L[A.p] + L[A.s] + pr.g); if (R) cands.push(R[A.p] - pr.g - me[A.s]); });
    let best = null;
    cands.forEach(v => { const d = v - me[A.p]; if (Math.abs(d) <= th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d: d, v: v }; });
    if (!best) return null;
    return { d: best.d, finish: (m) => {
      const segs = [], gL = L ? m[A.p] - (L[A.p] + L[A.s]) : null, gR = R ? R[A.p] - (m[A.p] + m[A.s]) : null;
      const hasG = (v) => v != null && pairs.some(pr => Math.abs(pr.g - v) < 0.6);
      const g = (gL != null && gR != null && Math.abs(gL - gR) < 0.6) || hasG(gL) ? gL : hasG(gR) ? gR : (gL != null ? gL : gR);
      if (L && Math.abs(gL - g) < 0.6) segs.push([L, m]);
      if (R && Math.abs(gR - g) < 0.6) segs.push([m, R]);
      pairs.forEach(pr => { if (Math.abs(pr.g - g) < 0.6) segs.push([pr.a, pr.b]); });
      return segs;
    } };
  },
  snapGuides(id, x, y, ex) {
    const me = this.state.nodes.find(n => n.id === id); if (!me) return { x: x, y: y, guides: [] };
    ex = ex || new Set([id]);
    const b = this.boxOf(me), th = 6 / this.state.scale, sc = this.state.scale;
    const AX = { p: 'x', s: 'w', q: 'y', t: 'h' }, AY = { p: 'y', s: 'h', q: 'x', t: 'w' };
    let cache = this.drag && this.drag.snapCache;
    if (!cache) {
      const hidden = this.collapseInfo().hidden;
      const os = this.state.nodes.filter(n => !ex.has(n.id) && !hidden.has(n.id)).map(n => { const z = this.boxOf(n); return { x: n.x, y: n.y, w: z.w, h: z.h }; });
      cache = { others: os, hp: this.spacingPairs(os, AX), vp: this.spacingPairs(os, AY) };
      if (this.drag) this.drag.snapCache = cache;
    }
    const others = cache.others;
    let bx = null, by = null;
    const mx = [0, b.w / 2, b.w], my = [0, b.h / 2, b.h];
    others.forEach(o => {
      [o.x, o.x + o.w / 2, o.x + o.w].forEach((v, i) => mx.forEach((m, j) => { if ((i === 1) !== (j === 1)) return; const dd = v - (x + m); if (Math.abs(dd) <= th && (!bx || Math.abs(dd) < Math.abs(bx.d))) bx = { d: dd, v: v }; }));
      [o.y, o.y + o.h / 2, o.y + o.h].forEach((v, i) => my.forEach((m, j) => { if ((i === 1) !== (j === 1)) return; const dd = v - (y + m); if (Math.abs(dd) <= th && (!by || Math.abs(dd) < Math.abs(by.d))) by = { d: dd, v: v }; }));
    });
    const spX = this.spacingSnap({ x: x, y: y, w: b.w, h: b.h }, others, cache.hp, AX, th);
    const spY = this.spacingSnap({ x: x, y: y, w: b.w, h: b.h }, others, cache.vp, AY, th);
    const useSX = spX && (!bx || Math.abs(spX.d) < Math.abs(bx.d) - 0.01), useSY = spY && (!by || Math.abs(spY.d) < Math.abs(by.d) - 0.01);
    if (useSX) { x += spX.d; bx = null; } else if (bx) x += bx.d;
    if (useSY) { y += spY.d; by = null; } else if (by) y += by.d;
    const guides = [], pad = 14, cap = 5 / sc, fin = { x: x, y: y, w: b.w, h: b.h };
    const segLines = (segs, A, key) => segs.forEach((sg, i) => {
      const a = sg[0], c = sg[1], p1 = a[A.p] + a[A.s], p2 = c[A.p];
      const q = (Math.max(a[A.q], c[A.q]) + Math.min(a[A.q] + a[A.t], c[A.q] + c[A.t])) / 2;
      const ln = (k, pa, qa, pb, qb) => guides.push(A.p === 'x' ? { key: key + i + k, x1: pa, y1: qa, x2: pb, y2: qb, solid: true } : { key: key + i + k, x1: qa, y1: pa, x2: qb, y2: pb, solid: true });
      ln('m', p1, q, p2, q); ln('a', p1, q - cap, p1, q + cap); ln('b', p2, q - cap, p2, q + cap);
    });
    if (useSX) segLines(spX.finish(fin), AX, 'sx');
    if (useSY) segLines(spY.finish(fin), AY, 'sy');
    if (bx) { const hits = others.filter(o => [o.x, o.x + o.w / 2, o.x + o.w].some(v => Math.abs(v - bx.v) < 0.5)); const ys = hits.map(o => o.y).concat([y]), ye = hits.map(o => o.y + o.h).concat([y + b.h]); guides.push({ key: 'v', x1: bx.v, x2: bx.v, y1: Math.min.apply(null, ys) - pad, y2: Math.max.apply(null, ye) + pad }); }
    if (by) { const hits = others.filter(o => [o.y, o.y + o.h / 2, o.y + o.h].some(v => Math.abs(v - by.v) < 0.5)); const xs = hits.map(o => o.x).concat([x]), xe = hits.map(o => o.x + o.w).concat([x + b.w]); guides.push({ key: 'h', y1: by.v, y2: by.v, x1: Math.min.apply(null, xs) - pad, x2: Math.max.apply(null, xe) + pad }); }
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, guides: guides };
  }
};
