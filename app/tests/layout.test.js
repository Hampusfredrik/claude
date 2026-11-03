import { describe, it, expect } from 'vitest';
import { computeTidy } from '../src/layout/tidy.js';
import { treeInfo } from '../src/layout/treeInfo.js';
import { buildForest } from '../src/layout/forest.js';
import { orderByLinks } from '../src/layout/order.js';
import { snapCache, snapGuides } from '../src/layout/snap.js';

// main topic with three branches; Fibres and Craft have children; one cross-link.
const n = (id, label, x, y, extra) => Object.assign({ id, label, x, y }, extra);
const e = (id, from, to, extra) => Object.assign({ id, from, to, both: false, strength: 'thin' }, extra);
const map = () => ({
  nodes: [n('m', 'Wool', -113, -40, { main: true }), n('a', 'Fibres', 300, -200, { cat: 'c1' }), n('a1', 'Merino', 600, -260), n('a2', 'Shetland', 600, -160), n('a3', 'Alpaca', 600, -60),
    n('b', 'Craft', 300, 100, { cat: 'c2' }), n('b1', 'Knitting', 600, 60), n('b2', 'Felting', 600, 160), n('c', 'Care', -400, 0), n('c1', 'Washing', -700, 0)],
  edges: [e('1', 'm', 'a'), e('2', 'a', 'a1'), e('3', 'a', 'a2'), e('4', 'a', 'a3'), e('5', 'm', 'b'), e('6', 'b', 'b1'), e('7', 'b', 'b2'), e('8', 'm', 'c'), e('9', 'c', 'c1'), e('x', 'a1', 'b1')],
  cats: [{ id: 'c1' }, { id: 'c2' }], tidySpace: 1
});
const size = (node) => node.main ? { w: 226, h: 80 } : { w: 178, h: 62 };
const tidy = (s, mode, opt) => computeTidy(s, size, treeInfo(s.edges), mode, opt || {});
const byId = (nodes) => Object.fromEntries(nodes.map(x => [x.id, x]));
const overlaps = (nodes) => {
  const out = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const A = nodes[i], B = nodes[j], a = size(A), b = size(B);
    if (A.x < B.x + b.w && B.x < A.x + a.w && A.y < B.y + b.h && B.y < A.y + a.h) out.push(A.id + '/' + B.id);
  }
  return out;
};

describe('treeInfo', () => {
  it('takes the first incoming one-way arrow as the parent edge', () => {
    const TI = treeInfo(map().edges);
    expect(TI.pe.b1.id).toBe('6');
    expect([...TI.cross]).toEqual(['x']);
    expect(TI.inc).toEqual({ a1: ['x'], b1: ['x'] });
  });
  it('treats a two-way arrow as a cross-link only when both ends have a parent', () => {
    const es = [e('1', 'm', 'a'), e('2', 'm', 'b'), e('3', 'a', 'b', { both: true }), e('4', 'b', 'c', { both: true })];
    expect([...treeInfo(es).cross]).toEqual(['3']);
  });
  it('ignores self-loops', () => {
    expect(treeInfo([e('1', 'a', 'a')])).toEqual({ pe: {}, cross: new Set(), inc: {} });
  });
});

describe('buildForest', () => {
  it('follows tree edges from the main topic and sorts children top to bottom', () => {
    const s = map(), f = buildForest(s.nodes, s.edges, treeInfo(s.edges), 'both', {});
    expect(f.main.id).toBe('m');
    expect(f.kids.m).toEqual(['a', 'c', 'b']);
    expect(f.kids.a).toEqual(['a1', 'a2', 'a3']);
    expect(f.roots).toEqual(['m']);
  });
  it('makes unconnected boxes extra roots', () => {
    const s = map(); s.nodes.push(n('z', 'Loose', 0, 400));
    expect(buildForest(s.nodes, s.edges, treeInfo(s.edges), 'both', {}).roots).toEqual(['m', 'z']);
  });
  it('attaches boxes reached only against the arrow direction', () => {
    const s = map(); s.nodes.push(n('p', 'Points at Care', -700, 200)); s.edges.push(e('y', 'p', 'c'));
    const f = buildForest(s.nodes, s.edges, treeInfo(s.edges), 'both', {});
    expect(f.kids.c).toContain('p');
    expect(f.roots).toEqual(['m']);
  });
});

describe('orderByLinks', () => {
  it('moves branches joined by a cross-link next to each other', () => {
    const kids = { m: ['a', 'b', 'c'], a: [], b: [], c: [] };
    orderByLinks(kids, 'm', false, [e('x', 'a', 'c')]);
    expect(Math.abs(kids.m.indexOf('a') - kids.m.indexOf('c'))).toBe(1);
  });
  it('leaves the order alone without cross-links', () => {
    const kids = { m: ['a', 'b', 'c'], a: [], b: [], c: [] };
    orderByLinks(kids, 'm', false, [e('1', 'm', 'a')]);
    expect(kids.m).toEqual(['a', 'b', 'c']);
  });
});

describe('Tidy: mind map and trees', () => {
  for (const mode of ['both', 'right', 'down']) {
    it(mode + ': keeps the main topic in place and boxes do not overlap', () => {
      const s = map(), r = tidy(s, mode);
      const m = byId(r.nodes).m;
      expect([m.x, m.y]).toEqual([-113, -40]);
      expect(overlaps(r.nodes)).toEqual([]);
      expect(r.nodes.map(x => x.id)).toEqual(s.nodes.map(x => x.id));
      r.nodes.forEach(x => { expect(Number.isInteger(x.x) && Number.isInteger(x.y)).toBe(true); });
    });
  }
  it('right: every child is to the right of its parent', () => {
    const P = byId(tidy(map(), 'right').nodes);
    for (const [p, c] of [['m', 'a'], ['a', 'a1'], ['m', 'c'], ['c', 'c1'], ['b', 'b2']]) expect(P[c].x).toBeGreaterThan(P[p].x + size(P[p]).w);
  });
  it('down: every child is below its parent', () => {
    const P = byId(tidy(map(), 'down').nodes);
    for (const [p, c] of [['m', 'a'], ['a', 'a1'], ['m', 'c'], ['c', 'c1'], ['b', 'b2']]) expect(P[c].y).toBeGreaterThan(P[p].y + size(P[p]).h);
  });
  it('both: main branches go to both sides of the main topic', () => {
    const P = byId(tidy(map(), 'both').nodes), m = P.m;
    const sides = ['a', 'b', 'c'].map(id => Math.sign(P[id].x - m.x));
    expect(sides).toContain(1);
    expect(sides).toContain(-1);
    expect(Math.sign(P.a1.x - m.x)).toBe(Math.sign(P.a.x - m.x));
  });
  it('spacing: Airy spreads the map more than Tight', () => {
    const extent = (sp) => { const s = map(); s.tidySpace = sp; const ns = tidy(s, 'right').nodes; return Math.max(...ns.map(x => x.x)) - Math.min(...ns.map(x => x.x)) + Math.max(...ns.map(x => x.y)) - Math.min(...ns.map(x => x.y)); };
    expect(extent(1.6)).toBeGreaterThan(extent(1));
    expect(extent(1)).toBeGreaterThan(extent(0.65));
  });
  it('does not change the layout of this map unnoticed', () => {
    // Snapshot of the current engine. tools/verify/compare.mjs checks the engines
    // against the deployed index.html in a browser; this catches later changes.
    expect(tidy(map(), 'right').nodes.map(x => [x.id, x.x, x.y])).toMatchSnapshot();
    expect(tidy(map(), 'both').nodes.map(x => [x.id, x.x, x.y])).toMatchSnapshot();
  });
});

describe('Tidy: radial', () => {
  it('puts deeper levels on larger rings around the main topic', () => {
    const P = byId(tidy(map(), 'radial').nodes), c = (x) => ({ x: x.x + size(x).w / 2, y: x.y + size(x).h / 2 });
    const m = c(P.m), d = (id) => Math.hypot(c(P[id]).x - m.x, c(P[id]).y - m.y);
    expect([P.m.x, P.m.y]).toEqual([-113, -40]);
    for (const [p, k] of [['a', 'a1'], ['b', 'b2'], ['c', 'c1']]) expect(d(k)).toBeGreaterThan(d(p));
    expect(Math.abs(d('a') - d('b'))).toBeLessThan(1);
  });
});

describe('Tidy: random shape', () => {
  it('is reproducible from its seed and reports the shape', () => {
    const r1 = tidy(map(), 'random', { seed: 42 }), r2 = tidy(map(), 'random', { seed: 42 });
    expect(r1.mode).toBe('creative');
    expect(r1.seed).toBe(42);
    expect(['sunflower', 'spiral', 'fan', 'clusters', 'wave', 'orbit', 'organic']).toContain(r1.shape);
    expect(r1.nodes).toEqual(r2.nodes);
    expect(byId(r1.nodes).m).toEqual(map().nodes[0]);
  });
  it('picks a seed when none is given, and re-running it (e.g. after a spacing change) repeats the layout', () => {
    const r = tidy(map(), 'random', {}, () => 0.5);
    expect(r.seed).toBeGreaterThan(0);
    expect(tidy(map(), 'creative', { seed: r.seed }).nodes).toEqual(r.nodes);
  });
  it('different seeds give different layouts', () => {
    const shapes = new Set(), layouts = new Set();
    for (let seed = 1; seed <= 30; seed++) { const r = tidy(map(), 'random', { seed }); shapes.add(r.shape); layouts.add(JSON.stringify(r.nodes)); }
    expect(layouts.size).toBe(30);
    expect(shapes.size).toBeGreaterThan(3);
  });
});

describe('snapping while dragging', () => {
  const others = [n('o1', 'A', 0, 0), n('o2', 'B', 300, 0)];
  const cache = snapCache(others, new Set(), new Set(), size);
  it('snaps to the left edge of a box within 6 screen px', () => {
    const r = snapGuides(cache, { w: 178, h: 62 }, 4, 200, 1);
    expect(r.x).toBe(0);
    expect(r.guides.some(g => g.key === 'v' && g.x1 === 0)).toBe(true);
  });
  it('does not snap further away than the threshold', () => {
    expect(snapGuides(cache, { w: 178, h: 62 }, 20, 200, 1)).toEqual({ x: 20, y: 200, guides: [] });
  });
  it('the threshold is in screen pixels (scales with zoom)', () => {
    expect(snapGuides(cache, { w: 178, h: 62 }, 10, 200, 0.5).x).toBe(0);
  });
  it('snaps to equal spacing between neighbours', () => {
    const row = [n('l', 'L', 0, 0), n('r', 'R', 500, 0)];
    // L ends at 178 and R starts at 500, so a 178 wide box is centred at x = 250.
    const r = snapGuides(snapCache(row, new Set(), new Set(), size), { w: 178, h: 62 }, 246, 0, 1);
    expect(r.x).toBe(250);
    expect(r.guides.filter(g => g.solid).length).toBeGreaterThan(0);
  });
});
