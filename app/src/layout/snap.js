// Snapping while a box is dragged: align edges/centres with other boxes and
// match the gaps between neighbours ("equal spacing"), with guide lines.
const AX = { p: 'x', s: 'w', q: 'y', t: 'h' }, AY = { p: 'y', s: 'h', q: 'x', t: 'w' };

// Neighbour pairs along one axis and the gap between them.
export function spacingPairs(others, A) {
  const out = [];
  others.forEach(a => {
    let best = null;
    others.forEach(o => { if (o === a || o[A.p] < a[A.p] + a[A.s] - 0.5) return; if (o[A.q] >= a[A.q] + a[A.t] || o[A.q] + o[A.t] <= a[A.q]) return; if (!best || o[A.p] < best[A.p]) best = o; });
    if (best) out.push({ a: a, b: best, g: best[A.p] - (a[A.p] + a[A.s]) });
  });
  return out;
}

// Position that makes the gap to the nearest neighbour equal to an existing gap.
export function spacingSnap(me, others, pairs, A, th) {
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
}

// The other boxes (and their gaps) once per drag.
export function snapCache(nodes, exclude, hidden, boxOf) {
  const os = nodes.filter(n => !exclude.has(n.id) && !hidden.has(n.id)).map(n => { const z = boxOf(n); return { x: n.x, y: n.y, w: z.w, h: z.h }; });
  return { others: os, hp: spacingPairs(os, AX), vp: spacingPairs(os, AY) };
}

// b = size of the dragged box, (x, y) = its unsnapped position.
// Returns the snapped position and the guide lines to draw.
export function snapGuides(cache, b, x, y, scale) {
  const th = 6 / scale, sc = scale;
  const others = cache.others;
  let bx = null, by = null;
  const mx = [0, b.w / 2, b.w], my = [0, b.h / 2, b.h];
  others.forEach(o => {
    [o.x, o.x + o.w / 2, o.x + o.w].forEach((v, i) => mx.forEach((m, j) => { if ((i === 1) !== (j === 1)) return; const dd = v - (x + m); if (Math.abs(dd) <= th && (!bx || Math.abs(dd) < Math.abs(bx.d))) bx = { d: dd, v: v }; }));
    [o.y, o.y + o.h / 2, o.y + o.h].forEach((v, i) => my.forEach((m, j) => { if ((i === 1) !== (j === 1)) return; const dd = v - (y + m); if (Math.abs(dd) <= th && (!by || Math.abs(dd) < Math.abs(by.d))) by = { d: dd, v: v }; }));
  });
  const spX = spacingSnap({ x: x, y: y, w: b.w, h: b.h }, others, cache.hp, AX, th);
  const spY = spacingSnap({ x: x, y: y, w: b.w, h: b.h }, others, cache.vp, AY, th);
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
