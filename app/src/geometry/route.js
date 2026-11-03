// Arrow routing. An arrow is an orthogonal path (rounded corners) between two
// boxes that avoids other boxes, prefers short paths with few bends and does not
// run on top of other arrows. Long cross-links that would cross the map become
// "tunnels": two short stubs with labelled mouths ("to …" / "from …").
//
// routeEdge(ctx, e, a, b) with
//   ctx.nodes, ctx.edges   all boxes and arrows of the map
//   ctx.size(n)            measured size { w, h } of a box
//   ctx.TI                 treeInfo(edges) (which arrows are cross-links)
//   ctx.hidden             Set of ids hidden by collapsed branches
//   ctx.tunnels            'on' | 'off'
//   ctx.selEdge, ctx.accent  selected arrow id and accent colour
//   ctx.edgePts, ctx.edgeFrom  routes of arrows computed earlier in this
//                          render ({ id: points } / { id: from }); updated here
//   ctx.liveIds            Set of String(edge id) of existing arrows
//   ctx.onJump(id)         called when a tunnel mouth is clicked
// Returns the drawing data used by the canvas (d, head, tail, color, …).
export function routeEdge(ctx, e, a, b) {
  const size = ctx.size;
  const isCross = ctx.TI.cross.has(e.id);
  const sa = size(a), sb = size(b);
  const ax = a.x + sa.w / 2, ay = a.y + sa.h / 2, bx = b.x + sb.w / 2, by = b.y + sb.h / 2;
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const cut = (hw, hh, sx, sy, vx, vy, gap) => {
    const t = Math.min(hw / (Math.abs(vx) || 1e-6), hh / (Math.abs(vy) || 1e-6));
    return { x: sx + vx * t + (vx / len) * gap, y: sy + vy * t + (vy / len) * gap };
  };
  const twin = ctx.edges.some(o => o.from === e.to && o.to === e.from);
  const tw = twin ? (e.from < e.to ? -9 : 9) : 0;
  const gap = 6, STUB = 30, PAD = 14, HEADL = 14;
  const RA = { x0: a.x, y0: a.y, x1: a.x + sa.w, y1: a.y + sa.h }, RB = { x0: b.x, y0: b.y, x1: b.x + sb.w, y1: b.y + sb.h };
  const hidden = ctx.hidden || new Set();
  const bx0 = Math.min(RA.x0, RB.x0) - 220, bx1 = Math.max(RA.x1, RB.x1) + 220, by0 = Math.min(RA.y0, RB.y0) - 220, by1 = Math.max(RA.y1, RB.y1) + 220;
  const obs = [];
  ctx.nodes.forEach(n => {
    if (n.id === a.id || n.id === b.id || hidden.has(n.id)) return;
    const z = size(n);
    if (n.x > bx1 || n.x + z.w < bx0 || n.y > by1 || n.y + z.h < by0) return;
    obs.push({ x0: n.x - PAD, y0: n.y - PAD, x1: n.x + z.w + PAD, y1: n.y + z.h + PAD });
  });
  const hitSeg = (p, q, r) => {
    if (Math.abs(p.y - q.y) < 0.5) { const y = p.y; return y > r.y0 && y < r.y1 && Math.max(p.x, q.x) > r.x0 && Math.min(p.x, q.x) < r.x1; }
    const x = p.x; return x > r.x0 && x < r.x1 && Math.max(p.y, q.y) > r.y0 && Math.min(p.y, q.y) < r.y1;
  };
  const shrink = (r, m) => ({ x0: r.x0 - m, y0: r.y0 - m, x1: r.x1 + m, y1: r.y1 + m });
  const OA = shrink(RA, 2), OB = shrink(RB, 2);
  const port = (R, side, off) => {
    const cx = (R.x0 + R.x1) / 2 + (side === 'T' || side === 'B' ? off : 0), cy = (R.y0 + R.y1) / 2 + (side === 'L' || side === 'R' ? off : 0);
    if (side === 'R') return { p: { x: R.x1 + gap, y: cy }, v: { x: 1, y: 0 } };
    if (side === 'L') return { p: { x: R.x0 - gap, y: cy }, v: { x: -1, y: 0 } };
    if (side === 'B') return { p: { x: cx, y: R.y1 + gap }, v: { x: 0, y: 1 } };
    return { p: { x: cx, y: R.y0 - gap }, v: { x: 0, y: -1 } };
  };
  const simplify = (ps) => {
    const o = [ps[0]];
    for (let i = 1; i < ps.length; i++) {
      const q = ps[i], l = o[o.length - 1];
      if (Math.abs(q.x - l.x) < 0.5 && Math.abs(q.y - l.y) < 0.5) continue;
      if (o.length >= 2) { const k = o[o.length - 2]; if ((Math.abs(k.x - l.x) < 0.5 && Math.abs(l.x - q.x) < 0.5) || (Math.abs(k.y - l.y) < 0.5 && Math.abs(l.y - q.y) < 0.5)) { o[o.length - 1] = q; continue; } }
      o.push(q);
    }
    return o;
  };
  const score = (ps, stub) => {
    let L = 0, hits = 0, back = 0;
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i - 1], q = ps[i];
      if (Math.abs(p.x - q.x) > 0.5 && Math.abs(p.y - q.y) > 0.5) return Infinity;
      L += Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
      obs.forEach(r => { if (hitSeg(p, q, r)) hits++; });
      if (hitSeg(p, q, OA)) back++;
      if (hitSeg(p, q, OB)) back++;
    }
    const endL = (p, q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y), n = ps.length;
    const shortEnds = (n > 2 && endL(ps[n - 2], ps[n - 1]) < Math.min(26, stub - 2) ? 1 : 0) + (n > 2 && endL(ps[0], ps[1]) < Math.min(26, stub - 2) ? 1 : 0);
    return L + (ps.length - 2) * 90 + hits * 5000 + back * 8000 + shortEnds * 3000;
  };
  let best = null, bestS = Infinity;
  const others = [];
  const EP = ctx.edgePts, EF = ctx.edgeFrom;
  const TI = ctx.TI;
  Object.keys(EP).forEach(k => { if (k === String(e.id) || !ctx.liveIds.has(k) || TI.cross.has(k) || TI.cross.has(+k) || EF[k] === e.from) return; const q = EP[k]; for (let i = 1; i < q.length; i++) others.push([q[i - 1], q[i]]); });
  const overlap = (p, q) => {
    let o = 0;
    others.forEach(([u, v]) => {
      if (Math.abs(p.y - q.y) < 0.5 && Math.abs(u.y - v.y) < 0.5 && Math.abs(p.y - u.y) < 6) o += Math.max(0, Math.min(Math.max(p.x, q.x), Math.max(u.x, v.x)) - Math.max(Math.min(p.x, q.x), Math.min(u.x, v.x)));
      else if (Math.abs(p.x - q.x) < 0.5 && Math.abs(u.x - v.x) < 0.5 && Math.abs(p.x - u.x) < 6) o += Math.max(0, Math.min(Math.max(p.y, q.y), Math.max(u.y, v.y)) - Math.max(Math.min(p.y, q.y), Math.min(u.y, v.y)));
    });
    return o;
  };
  const consider = (ps, stub, va, vb) => { ps = simplify(ps); let sc = score(ps, stub || STUB);
    if (va && ps.length > 1) { const f0 = ps[0], f1 = ps[1], l0 = ps[ps.length - 2], l1 = ps[ps.length - 1];
      if ((f1.x - f0.x) * va.x + (f1.y - f0.y) * va.y <= 0 || (l1.x - l0.x) * -vb.x + (l1.y - l0.y) * -vb.y <= 0) sc = Infinity; }
    if (sc < Infinity) { let ov = 0, jog = 0; for (let i = 1; i < ps.length; i++) { ov += overlap(ps[i - 1], ps[i]); if (i > 1 && i < ps.length - 1 && Math.abs(ps[i].x - ps[i - 1].x) + Math.abs(ps[i].y - ps[i - 1].y) < 20) jog++; } sc += jog * 1500 + ov * 7; } if (sc < bestS) { bestS = sc; best = ps; } };
  const ovY0 = Math.max(RA.y0, RB.y0) + 10, ovY1 = Math.min(RA.y1, RB.y1) - 10;
  if (ovY1 > ovY0) { const y = (ovY0 + ovY1) / 2 + tw; if (RB.x0 > RA.x1 + 2 * gap) consider([{ x: RA.x1 + gap, y }, { x: RB.x0 - gap, y }]); if (RA.x0 > RB.x1 + 2 * gap) consider([{ x: RA.x0 - gap, y }, { x: RB.x1 + gap, y }]); }
  const ovX0 = Math.max(RA.x0, RB.x0) + 12, ovX1 = Math.min(RA.x1, RB.x1) - 12;
  if (ovX1 > ovX0) { const x = (ovX0 + ovX1) / 2 + tw; if (RB.y0 > RA.y1 + 2 * gap) consider([{ x, y: RA.y1 + gap }, { x, y: RB.y0 - gap }]); if (RA.y0 > RB.y1 + 2 * gap) consider([{ x, y: RA.y0 - gap }, { x, y: RB.y1 + gap }]); }
  const xs = [], ys = [];
  obs.concat([shrink(RA, PAD), shrink(RB, PAD)]).forEach(r => { xs.push(r.x0 - 4, r.x1 + 4); ys.push(r.y0 - 4, r.y1 + 4); });
  ['R', 'L', 'B', 'T'].forEach(s1 => ['R', 'L', 'B', 'T'].forEach(s2 => {
    const A = port(RA, s1, tw), B = port(RB, s2, tw);
    const sep = (A.v.x ? (A.v.x > 0 ? RB.x0 - RA.x1 : RA.x0 - RB.x1) : (A.v.y > 0 ? RB.y0 - RA.y1 : RA.y0 - RB.y1));
    const facing = A.v.x === -B.v.x && A.v.y === -B.v.y && sep > 0;
    const ST = facing ? Math.max(12, Math.min(STUB, sep / 2 - gap - 2)) : STUB;
    const a1 = { x: A.p.x + A.v.x * ST, y: A.p.y + A.v.y * ST }, b1 = { x: B.p.x + B.v.x * ST, y: B.p.y + B.v.y * ST };
    const pre = [A.p, a1], post = [b1, B.p];
    consider(pre.concat([{ x: b1.x, y: a1.y }], post), ST, A.v, B.v);
    consider(pre.concat([{ x: a1.x, y: b1.y }], post), ST, A.v, B.v);
    const mxs = [(a1.x + b1.x) / 2].concat(xs), mys = [(a1.y + b1.y) / 2].concat(ys);
    mxs.forEach(mx => consider(pre.concat([{ x: mx, y: a1.y }, { x: mx, y: b1.y }], post), ST, A.v, B.v));
    mys.forEach(my => consider(pre.concat([{ x: a1.x, y: my }, { x: b1.x, y: my }], post), ST, A.v, B.v));
  }));
  let pts = best || [{ x: ax, y: ay }, { x: bx, y: by }];
  EP[String(e.id)] = pts; EF[String(e.id)] = e.from;
  let d = 'M ' + pts[0].x + ' ' + pts[0].y;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i - 1], c = pts[i], n = pts[i + 1];
    const l1 = Math.hypot(c.x - p.x, c.y - p.y), l2 = Math.hypot(n.x - c.x, n.y - c.y);
    let r = Math.min(16, l1 / 2, l2 / 2);
    if (i === pts.length - 2) r = Math.min(r, Math.max(0, l2 - HEADL));
    if (i === 1) r = Math.min(r, Math.max(0, l1 - (e.both ? HEADL : 10)));
    if (r < 0.5) { d += ' L ' + c.x + ' ' + c.y; continue; }
    const b1 = { x: c.x - (c.x - p.x) / l1 * r, y: c.y - (c.y - p.y) / l1 * r };
    const a1 = { x: c.x + (n.x - c.x) / l2 * r, y: c.y + (n.y - c.y) / l2 * r };
    d += ' L ' + b1.x + ' ' + b1.y + ' Q ' + c.x + ' ' + c.y + ' ' + a1.x + ' ' + a1.y;
  }
  const p1 = pts[0], p2 = pts[pts.length - 1];
  { const q = pts[pts.length - 2], L2 = Math.hypot(p2.x - q.x, p2.y - q.y) || 1, k = Math.min(8, L2 / 2); d += ' L ' + (p2.x - (p2.x - q.x) / L2 * k) + ' ' + (p2.y - (p2.y - q.y) / L2 * k); }
  if (e.both && pts.length > 1) { const q = pts[1], L1 = Math.hypot(q.x - p1.x, q.y - p1.y) || 1, k = Math.min(8, L1 / 2); d = d.replace(/^M [^ ]+ [^ ]+/, 'M ' + (p1.x + (q.x - p1.x) / L1 * k) + ' ' + (p1.y + (q.y - p1.y) / L1 * k)); }
  const segs = pts.slice(1).map((q, i) => ({ a: pts[i], b: q, l: Math.hypot(q.x - pts[i].x, q.y - pts[i].y) }));
  let half = segs.reduce((t, s) => t + s.l, 0) / 2, mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  for (const s of segs) { if (half <= s.l) { const t = s.l ? half / s.l : 0; mid = { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t }; break; } half -= s.l; }
  const c1 = pts[1], mx = pts[pts.length - 2].x, my = pts[pts.length - 2].y;
  const head = (tip, from) => {
    const ang = Math.atan2(tip.y - from.y, tip.x - from.x), s = 11, sp = 0.45;
    return [tip.x + ',' + tip.y,
      (tip.x - s * Math.cos(ang - sp)) + ',' + (tip.y - s * Math.sin(ang - sp)),
      (tip.x - s * Math.cos(ang + sp)) + ',' + (tip.y - s * Math.sin(ang + sp))].join(' ');
  };
  const st = e.strength || 'thin';
  const out = {
    id: e.id,
    d: d,
    w: (st === 'thick' ? 3.6 : 1.8) + (ctx.selEdge === e.id && e.color ? 1.2 : 0),
    dash: st === 'dashed' ? '7 7' : 'none',
    color: e.color || (ctx.selEdge === e.id ? ctx.accent : (st === 'thick' ? '#6f6559' : '#7e8091')),
    custom: !!e.color,
    head: head(p2, { x: mx, y: my }),
    ox: p1.x, oy: p1.y,
    tail: e.both ? head(p1, c1) : '',
    titleA: (ctx.nodes.find(n => n.id === e.from) || {}).label,
    titleB: (ctx.nodes.find(n => n.id === e.to) || {}).label,
    both: e.both, strength: st,
    hasNotes: !!(e.notes && e.notes.trim()),
    midX: mid.x,
    midY: mid.y,
    notes: e.notes || ''
  };
  if (isCross && ctx.tunnels !== 'off' && pts.length > 1) {
    let pathLen = 0, crossN = 0; const hitSet = new Set();
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i]; pathLen += Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
      obs.forEach((r, ri) => { if (hitSeg(p, q, r)) hitSet.add(ri); });
      others.forEach(([u, v]) => { const h1 = Math.abs(p.y - q.y) < 0.5, h2 = Math.abs(u.y - v.y) < 0.5; if (h1 === h2) return; const H = h1 ? [p, q] : [u, v], V = h1 ? [u, v] : [p, q], x = V[0].x, y = H[0].y; if (x > Math.min(H[0].x, H[1].x) + 1 && x < Math.max(H[0].x, H[1].x) - 1 && y > Math.min(V[0].y, V[1].y) + 1 && y < Math.max(V[0].y, V[1].y) - 1) crossN++; });
    }
    if (Math.hypot(bx - ax, by - ay) > 360 && (pathLen > 1100 || hitSet.size >= 2 || crossN >= 4)) {
      const SL = 40;
      const stubOut = (Rr, tx, ty, nid) => { const c = { x: (Rr.x0 + Rr.x1) / 2, y: (Rr.y0 + Rr.y1) / 2 }, vx = tx - c.x, vy = ty - c.y;
        const l = TI.inc[nid] || [], li = Math.max(0, l.indexOf(e.id)), ln = l.length, raw = ln > 1 ? (li - (ln - 1) / 2) * 24 : 0, SLx = SL + (ln > 1 ? (li % 2) * 18 : 0);
        const sides = ['R', 'L', 'B', 'T'].map(sd => { const lim = sd === 'L' || sd === 'R' ? (Rr.y1 - Rr.y0) / 2 - 8 : (Rr.x1 - Rr.x0) / 2 - 12, P = port(Rr, sd, Math.max(-lim, Math.min(lim, raw))); return { P: P, dot: P.v.x * vx / (Rr.x1 - Rr.x0) + P.v.y * vy / (Rr.y1 - Rr.y0) }; }).sort((m, n) => n.dot - m.dot);
        const mk = (o) => ({ x: o.P.p.x + o.P.v.x * SLx, y: o.P.p.y + o.P.v.y * SLx });
        for (const o of sides) { const m = mk(o), pr = { x: o.P.p.x - o.P.v.x * 6, y: o.P.p.y - o.P.v.y * 6 }; if (!obs.some(r => hitSeg(o.P.p, m, r)) && overlap(pr, m) < 2 && !others.some(([u, v]) => Math.hypot(u.x - o.P.p.x, u.y - o.P.p.y) < 14 || Math.hypot(v.x - o.P.p.x, v.y - o.P.p.y) < 14)) return { p: o.P.p, v: o.P.v, m: m }; }
        for (const o of sides) { const m = mk(o); if (!obs.some(r => hitSeg(o.P.p, m, r))) return { p: o.P.p, v: o.P.v, m: m }; }
        const o = sides[0]; return { p: o.P.p, v: o.P.v, m: { x: o.P.p.x + o.P.v.x * SLx, y: o.P.p.y + o.P.v.y * SLx } }; };
      const S = stubOut(RA, bx, by, a.id), T = stubOut(RB, ax, ay, b.id);
      EP[String(e.id)] = [S.p, S.m];
      const startP = e.both ? { x: S.p.x + S.v.x * 8, y: S.p.y + S.v.y * 8 } : S.p, endP = { x: T.p.x + T.v.x * 8, y: T.p.y + T.v.y * 8 };
      out.ghostD = out.d;
      const at = (o, k) => ({ x: o.p.x + o.v.x * k, y: o.p.y + o.v.y * k }), segL = (o) => Math.hypot(o.m.x - o.p.x, o.m.y - o.p.y);
      const sA = at(S, 18), sB = at(T, 18), fA = at(S, segL(S) - 6), fB = at(T, segL(T) - 6);
      out.d = 'M ' + startP.x + ' ' + startP.y + ' L ' + sA.x + ' ' + sA.y + ' M ' + sB.x + ' ' + sB.y + ' L ' + endP.x + ' ' + endP.y;
      out.fadeD = 'M ' + sA.x + ' ' + sA.y + ' L ' + fA.x + ' ' + fA.y + ' M ' + sB.x + ' ' + sB.y + ' L ' + fB.x + ' ' + fB.y;
      out.head = head(T.p, T.m); out.tail = e.both ? head(S.p, S.m) : ''; out.ox = S.p.x; out.oy = S.p.y;
      out.midX = (S.p.x + S.m.x) / 2; out.midY = (S.p.y + S.m.y) / 2;
      const clean = (t) => { t = String(t || '').replace(/\*+/g, '').replace(/\s+/g, ' ').trim(); return t.length > 24 ? t.slice(0, 23) + '…' : t; };
      const mouth = (M, v, txt, goId) => { const horiz = Math.abs(v.x) > 0.5; return { x: M.x, y: M.y, horiz: horiz, vx: v.x, vy: v.y, rot: 'rotate(' + (Math.atan2(v.y, v.x) * 180 / Math.PI) + ' ' + M.x + ' ' + M.y + ')',
        tx: horiz ? M.x + v.x * 11 : M.x, ty: horiz ? M.y + 4 : M.y + (v.y > 0 ? 24 : -16), anchor: horiz ? (v.x > 0 ? 'start' : 'end') : 'middle', label: txt,
        go: (ev) => { ev.stopPropagation(); ctx.onJump(goId); } }; };
      out.tunnel = true;
      out.mA = mouth(S.m, S.v, 'to ' + clean(b.label), b.id);
      out.mB = mouth(T.m, T.v, 'from ' + clean(a.label), a.id);
    }
  }
  return out;
}
