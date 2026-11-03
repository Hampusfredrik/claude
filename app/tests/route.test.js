import { describe, it, expect } from 'vitest';
import { routeEdge } from '../src/geometry/route.js';
import { treeInfo } from '../src/layout/treeInfo.js';

const size = (n) => n.main ? { w: 226, h: 80 } : { w: 178, h: 62 };
const box = (id, x, y, extra) => Object.assign({ id, label: id, x, y }, extra);
const arrow = (id, from, to, extra) => Object.assign({ id, from, to, both: false, strength: 'thin' }, extra);
const route = (nodes, edges, id, opts) => {
  const ctx = Object.assign({ nodes, edges, size, TI: treeInfo(edges), hidden: new Set(), tunnels: 'on', selEdge: null, accent: '#2f6f5e', edgePts: {}, edgeFrom: {}, liveIds: new Set(edges.map(x => String(x.id))), onJump: () => {} }, opts);
  const e = edges.find(x => x.id === id), by = Object.fromEntries(nodes.map(n => [n.id, n]));
  return { g: routeEdge(ctx, e, by[e.from], by[e.to]), ctx };
};
// Polyline of the route (corners), as stored for other arrows to avoid.
const pts = (r, id) => r.ctx.edgePts[id];
const crosses = (p, q, b) => { const s = size(b), x0 = b.x, x1 = b.x + s.w, y0 = b.y, y1 = b.y + s.h;
  if (Math.abs(p.y - q.y) < 0.5) return p.y > y0 && p.y < y1 && Math.max(p.x, q.x) > x0 && Math.min(p.x, q.x) < x1;
  return p.x > x0 && p.x < x1 && Math.max(p.y, q.y) > y0 && Math.min(p.y, q.y) < y1; };

describe('arrow routing', () => {
  it('draws a straight line between boxes side by side, 6 px from each box', () => {
    const r = route([box('a', 0, 0), box('b', 400, 0)], [arrow('1', 'a', 'b')], '1');
    expect(pts(r, '1')).toEqual([{ x: 184, y: 31 }, { x: 394, y: 31 }]);
    expect(r.g.d).toBe('M 184 31 L 386 31');      // stops 8 px early for the arrow head
    expect(r.g.head.split(' ')[0]).toBe('394,31');  // head tip at the target
    expect(r.g.tail).toBe('');
    expect([r.g.ox, r.g.oy]).toEqual([184, 31]);    // origin dot
    expect([r.g.midX, r.g.midY]).toEqual([289, 31]);
  });

  it('uses only horizontal and vertical segments', () => {
    const r = route([box('a', 0, 0), box('b', 500, 300)], [arrow('1', 'a', 'b')], '1');
    const p = pts(r, '1');
    for (let i = 1; i < p.length; i++) expect(Math.abs(p[i].x - p[i - 1].x) < 0.5 || Math.abs(p[i].y - p[i - 1].y) < 0.5).toBe(true);
    expect(r.g.d).toMatch(/ Q /); // rounded corner
  });

  it('goes around a box that is in the way', () => {
    const nodes = [box('a', 0, 0), box('b', 600, 0), box('o', 300, -20)];
    const p = pts(route(nodes, [arrow('1', 'a', 'b')], '1'), '1');
    expect(p.length).toBeGreaterThan(2);
    for (let i = 1; i < p.length; i++) expect(crosses(p[i - 1], p[i], nodes[2])).toBe(false);
  });

  it('two-way arrows get a head at both ends', () => {
    const r = route([box('a', 0, 0), box('b', 400, 0)], [arrow('1', 'a', 'b', { both: true })], '1');
    expect(r.g.tail.split(' ')[0]).toBe('184,31');
    expect(r.g.d.startsWith('M 192 31')).toBe(true);
  });

  it('style: thick, dashed, custom colour and selection', () => {
    const nodes = [box('a', 0, 0), box('b', 400, 0)];
    expect(route(nodes, [arrow('1', 'a', 'b', { strength: 'thick' })], '1').g).toMatchObject({ w: 3.6, dash: 'none', color: '#6f6559' });
    expect(route(nodes, [arrow('1', 'a', 'b', { strength: 'dashed' })], '1').g).toMatchObject({ w: 1.8, dash: '7 7', color: '#7e8091' });
    expect(route(nodes, [arrow('1', 'a', 'b')], '1', { selEdge: '1' }).g.color).toBe('#2f6f5e');
    expect(route(nodes, [arrow('1', 'a', 'b', { color: '#b0544a' })], '1', { selEdge: '1' }).g).toMatchObject({ color: '#b0544a', w: 3, custom: true });
  });

  it('two arrows in opposite directions are drawn apart', () => {
    const nodes = [box('a', 0, 0), box('b', 400, 0)], edges = [arrow('1', 'a', 'b'), arrow('2', 'b', 'a')];
    expect(pts(route(nodes, edges, '1'), '1')[0].y).not.toBe(pts(route(nodes, edges, '2'), '2')[0].y);
  });
});

describe('tunnels for long cross-links', () => {
  // A tree with a cross-link from the far left to the far right through a wall of boxes.
  const nodes = [box('m', 0, 0, { main: true }), box('l', -900, 0), box('r', 900, 0),
    box('w1', 300, -120), box('w2', 300, 0), box('w3', 300, 120), box('w4', -300, -120), box('w5', -300, 0), box('w6', -300, 120)];
  const edges = [arrow('t1', 'm', 'l'), arrow('t2', 'm', 'r'), arrow('t3', 'm', 'w1'), arrow('t4', 'm', 'w2'), arrow('t5', 'm', 'w3'), arrow('t6', 'm', 'w4'), arrow('t7', 'm', 'w5'), arrow('t8', 'm', 'w6'), arrow('x', 'l', 'r')];

  it('becomes two stubs with labelled mouths that jump to the other end', () => {
    const jumps = [];
    const { g } = route(nodes, edges, 'x', { onJump: (id) => jumps.push(id) });
    expect(g.tunnel).toBe(true);
    expect(g.mA.label).toBe('to r');
    expect(g.mB.label).toBe('from l');
    expect(g.d.match(/M /g)).toHaveLength(2);   // two separate stubs
    expect(g.ghostD).toMatch(/^M /);             // full route, shown when selected
    g.mA.go({ stopPropagation() {} }); g.mB.go({ stopPropagation() {} });
    expect(jumps).toEqual(['r', 'l']);
  });

  it('stays a full line when tunnels are switched off', () => {
    expect(route(nodes, edges, 'x', { tunnels: 'off' }).g.tunnel).toBeUndefined();
  });

  it('tree edges never become tunnels', () => {
    expect(route(nodes, edges, 't2').g.tunnel).toBeUndefined();
  });
});
