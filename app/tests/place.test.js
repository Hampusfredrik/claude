import { describe, it, expect } from 'vitest';
import { placeChild } from '../src/layout/place.js';

const size = (n) => (n.main ? { w: 226, h: 80 } : { w: 178, h: 62 });
const box = (id, x, y, extra) => Object.assign({ id, label: id, x, y }, extra);
const arrow = (from, to) => ({ id: from + to, from, to });
const overlaps = (p, nodes) => nodes.some(n => { const z = size(n); return p.x < n.x + z.w && n.x < p.x + 178 && p.y < n.y + z.h && n.y < p.y + 62; });

describe('placeChild', () => {
  it('puts a new chapter on the side of the main topic with fewer branches', () => {
    const nodes = [box('m', 0, 0, { main: true }), box('r1', 320, -100), box('r2', 320, 100), box('l1', -270, 0)];
    const p = placeChild(nodes, [arrow('m', 'r1'), arrow('m', 'r2'), arrow('m', 'l1')], nodes[0], null, size);
    expect(p.x).toBeLessThan(0);
    expect(p.y).toBeGreaterThan(0 + 62);
    expect(overlaps(p, nodes)).toBe(false);
  });
  it('puts a section below its siblings, on the side away from the grandparent', () => {
    const nodes = [box('m', 0, 0, { main: true }), box('a', -400, 0), box('a1', -700, -50), box('a2', -700, 40)];
    const p = placeChild(nodes, [arrow('m', 'a'), arrow('a', 'a1'), arrow('a', 'a2')], nodes[1], nodes[0], size);
    expect(p).toEqual({ x: -400 - 178 - 90, y: 40 + 62 + 24 });
  });
  it('moves down until it does not overlap another box', () => {
    const nodes = [box('m', 0, 0, { main: true }), box('blocker', 316, 9), box('blocker2', 316, 90)];
    const p = placeChild(nodes, [], nodes[0], null, size);
    expect(p.x).toBe(316);
    expect(overlaps(p, nodes)).toBe(false);
    expect(p.y).toBeGreaterThan(90 + 62);
  });
});
