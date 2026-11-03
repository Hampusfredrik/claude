// Tidy: picks the layout engine for a mode and returns the new node positions.
//   mode: 'both' | 'right' | 'down' (mind map / trees), 'radial', 'random'
//   opt:  { seed, shuffle, jitter, a0 }   (seed: for 'random'; same seed → same shape)
//   size(node) → { w, h } measured box size
// Returns { nodes, mode, seed, shape } where mode 'random' is reported as 'creative'.
import { buildForest } from './forest.js';
import { orderByLinks, groupByCategory } from './order.js';
import { radialLayout } from './radial.js';
import { mindMapLayout } from './mindmap.js';
import { creativeLayout } from './creative.js';

export function computeTidy({ nodes, edges, cats, tidySpace }, size, TI, mode, opt, random = Math.random) {
  opt = opt || {};
  let seed = opt.seed;
  if (mode === 'random') { mode = 'creative'; seed = seed || (Math.floor(random() * 1e9) + 1); }
  const sf = tidySpace || 1;
  const { kids, roots, main } = buildForest(nodes, edges, TI, mode, opt, random);
  if (mode !== 'creative' && !opt.shuffle) {
    orderByLinks(kids, main.id, mode === 'both', edges);
    groupByCategory(kids, nodes, cats);
  }
  const sz = {}; nodes.forEach(n => sz[n.id] = size(n));
  if (mode === 'creative') { const r = creativeLayout(nodes, edges, kids, roots, sz, main, sf, seed); return { nodes: r.nodes, mode, seed, shape: r.shape }; }
  const jit = (v) => opt.jitter ? v + (random() - 0.5) * 24 * sf : v;
  if (mode === 'radial') return { nodes: radialLayout(nodes, kids, roots, sz, main, sf, opt, jit), mode, seed };
  return { nodes: mindMapLayout(nodes, kids, roots, sz, main, sf, mode, jit), mode, seed };
}
