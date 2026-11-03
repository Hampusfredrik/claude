// Arrow geometry: connects the pure router (route.js) to the app state and
// caches results per arrow while nothing near it changes.
import { routeEdge } from './route.js';

export const edgeMethods = {
  geom(e) {
    const ns = this.state.nodes;
    if (this._gIdxNodes !== ns) { this._gIdxNodes = ns; this._gIdx = {}; ns.forEach(n => this._gIdx[n.id] = n); }
    const a = this._gIdx[e.from], b = this._gIdx[e.to];
    if (!a || !b) return null;
    const sa = this.size(a), sb = this.size(b), hidden = this._hiddenCache || new Set();
    const bx0 = Math.min(a.x, b.x) - 234, bx1 = Math.max(a.x + sa.w, b.x + sb.w) + 234, by0 = Math.min(a.y, b.y) - 234, by1 = Math.max(a.y + sa.h, b.y + sb.h) + 234;
    let key = (this._tun || '') + '|' + a.x + ',' + a.y + ',' + sa.w + ',' + sa.h + '|' + b.x + ',' + b.y + ',' + sb.w + ',' + sb.h + '|' + a.label + '|' + b.label + '|';
    ns.forEach(n => { if (n === a || n === b || hidden.has(n.id)) return; const z = this.size(n); if (n.x > bx1 || n.x + z.w < bx0 || n.y > by1 || n.y + z.h < by0) return; key += n.x + ',' + n.y + ',' + z.w + ',' + z.h + ';'; });
    this._gCache = this._gCache || new WeakMap();
    const c = this._gCache.get(e);
    if (c && c.key === key && c.edges === this.state.edges) return Object.assign({}, c.g);
    const g = this.geomRaw(e, a, b);
    if (g) this._gCache.set(e, { key: key, edges: this.state.edges, g: Object.assign({}, g) });
    return g;
  },
  geomRaw(e, a, b) {
    if (this._tun == null) { try { this._tun = localStorage.getItem('vn.tunnels') || 'on'; } catch (er) { this._tun = 'on'; } }
    const EP = this._edgePts || (this._edgePts = {}), EF = this._edgeFrom || (this._edgeFrom = {});
    if (this._liveEdges !== this.state.edges) { this._liveEdges = this.state.edges; this._liveIds = new Set(this.state.edges.map(o => String(o.id))); }
    return routeEdge({
      nodes: this.state.nodes, edges: this.state.edges, size: (n) => this.size(n), TI: this.treeInfo(),
      hidden: this._hiddenCache, tunnels: this._tun, selEdge: this.state.selEdge, accent: this.accent(),
      edgePts: EP, edgeFrom: EF, liveIds: this._liveIds, onJump: (id) => this.jumpTo(id)
    }, e, a, b);
  }
};
