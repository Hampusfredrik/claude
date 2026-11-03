// Automatic layout (Tidy) and snapping while dragging. The engines are pure
// functions in this folder; these methods connect them to the app state.
import { computeTidy } from './tidy.js';
import { treeInfo } from './treeInfo.js';
import { snapCache, snapGuides } from './snap.js';

export const layoutMethods = {
  tidy(mode, opt) {
    const s = this.state; if (!s.nodes.length) return;
    opt = opt || {};
    const r = computeTidy(s, (n) => this.size(n), this.treeInfo(), mode, opt);
    this.lastTidy = { mode: r.mode, seed: r.seed };
    if (r.shape) this._lastShape = r.shape;
    this.setState({ nodes: r.nodes, tidyOpen: !!opt.stayOpen }, () => { if (!opt.noFit) setTimeout(() => this.fitView && this.fitView(), 30); });
  },
  treeInfo() {
    const es = this.state.edges;
    if (this._tiEdges === es) return this._ti;
    this._tiEdges = es; this._ti = treeInfo(es);
    return this._ti;
  },
  snapGuides(id, x, y, ex) {
    const me = this.state.nodes.find(n => n.id === id); if (!me) return { x: x, y: y, guides: [] };
    ex = ex || new Set([id]);
    const b = this.boxOf(me);
    let cache = this.drag && this.drag.snapCache;
    if (!cache) {
      cache = snapCache(this.state.nodes, ex, this.collapseInfo().hidden, (n) => this.boxOf(n));
      if (this.drag) this.drag.snapCache = cache;
    }
    return snapGuides(cache, b, x, y, this.state.scale);
  }
};
