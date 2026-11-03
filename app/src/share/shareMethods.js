// Read-only view of a map: shared via #view= links and exported as .html.
import { FRAME_COLORS, MH, MW, NH, NW } from '../model/constants.js';
import { allNotes, pagesOf, titleOf } from '../model/storage.js';
import { countWords } from '../model/wordcount.js';
import { plain } from '../text/links.js';
import { IMG_RE } from '../text/markdown.js';
import { parseRefs } from '../text/refs.js';
import { packShare, unpackShare } from './packShare.js';
import { viewerHtml } from './viewerHtml.js';
export const shareMethods = {
  mapViewData(withImages) {
    const s = this.state, ac = this.accent();
    this.refreshLabels();
    const title = plain(titleOf(s.nodes));
    const strip = (t) => withImages ? (t || '') : (t || '').split('\n').filter(l => !IMG_RE.test(l)).join('\n');
    const TIr = this.treeInfo(), treeKid = new Set(Object.keys(TIr.pe).map(k => TIr.pe[k].from));
    const catById = {}; s.cats.forEach(c => catById[c.id] = c);
    const nodeById = {}; s.nodes.forEach(n => nodeById[n.id] = n);
    const inhCat = (n) => { if (n.cat || n.main || !treeKid.has(n.id)) return null; let x = n, k = 0; const seen = new Set(); while (TIr.pe[x.id] && !seen.has(x.id)) { seen.add(x.id); x = nodeById[TIr.pe[x.id].from]; k++; if (!x || x.main) return null; if (x.cat && catById[x.cat]) return { c: catById[x.cat], k: k }; } return null; };
    const back = {}; s.nodes.forEach(n => { const seen = new Set(); (allNotes(n).match(/\[\[([A-Za-z0-9_-]+)\]\]/g) || []).forEach(m => { const t = m.slice(2, -2); if (t !== n.id && !seen.has(t)) { seen.add(t); back[t] = (back[t] || 0) + 1; } }); });
    const hidden = this.collapseInfo().hidden;
    const nodes = s.nodes.filter(n => !hidden.has(n.id)).map(n => {
      const cat = catById[n.cat], ih = cat ? null : inhCat(n), pct = ih ? Math.max(25, 62 - (ih.k - 1) * 14) : 0;
      const el = this.els && this.els[n.id];
      const pages = pagesOf(n).map(p => ({ name: p.name || '', notes: strip(p.notes), refs: p.refs || '' }));
      const an = allNotes(n), wc = countWords(an);
      const tc = pagesOf(n).filter(p => (p.notes || '').trim()).length, rc = parseRefs(n.refs).length;
      return { id: n.id, x: n.x, y: n.y, main: !!n.main, label: n.label || 'Untitled', pages: pages, images: withImages && n.images ? n.images : null,
        w: el && el.offsetWidth ? el.offsetWidth : (n.main ? MW : NW), h: el && el.offsetHeight ? el.offsetHeight : (n.main ? MH : NH),
        color: cat ? cat.color : ih ? 'color-mix(in oklab, ' + ih.c.color + ' ' + (pct + 10) + '%, #fcfcfd)' : ac,
        tint: cat ? cat.tint : ih ? 'color-mix(in oklab, ' + ih.c.tint + ' ' + pct + '%, #fcfcfd)' : '#fcfcfd',
        cat: cat ? cat.name : '', words: an.trim() ? wc + (wc === 1 ? ' word' : ' words') : '', tabs: an.trim() ? tc + (tc === 1 ? ' tab' : ' tabs') : '',
        refs: rc ? rc + ' ref' : '', back: back[n.id] ? '↙ ' + back[n.id] : '' };
    });
    const shown = new Set(nodes.map(n => n.id));
    const frames = (s.frames || []).map(f => { const c = FRAME_COLORS[f.color] || FRAME_COLORS.sage; return { x: f.x, y: f.y, w: f.w, h: f.h, bg: c.bg, bd: c.bd, ink: c.ink, label: f.label || '' }; });
    const byId = {}; s.nodes.forEach(n => byId[n.id] = n);
    const mo = (m, id) => m ? { x: m.x, y: m.y, horiz: m.horiz, vx: m.vx, vy: m.vy, label: m.label, go: id } : null;
    const edges = s.edges.filter(e => shown.has(e.from) && shown.has(e.to)).map(e => {
      const g = this.geom(e); if (!g) return null;
      const a = byId[e.from], b = byId[e.to];
      return { d: g.d, head: g.head, tail: e.both ? (g.tail || '') : '', color: g.color || e.color || (e.strength === 'thick' ? '#6f6559' : '#7e8091'), w: g.w, dash: g.dash === 'none' ? '' : g.dash, mx: g.midX, my: g.midY,
        ox: e.both ? null : g.ox, oy: g.oy, fadeD: g.tunnel ? g.fadeD : '', mA: g.tunnel ? mo(g.mA, e.to) : null, mB: g.tunnel ? mo(g.mB, e.from) : null,
        notes: e.notes || '', title: plain(a && a.label) + (e.both ? ' ↔ ' : ' → ') + plain(b && b.label) };
    }).filter(Boolean);
    const cats = s.cats.filter(c => s.nodes.some(n => n.cat === c.id)).map(c => ({ name: c.name, color: c.color }));
    return { title: title, nodes: nodes, edges: edges, cats: cats, frames: frames };
  },
  viewerHtml(D, shared) { return viewerHtml(D, shared); },
  async shareMap() {
    this.setState({ exportOpen: false, shareOpen: true, shareUrl: '', shareNote: 'Creating link…', shareCopied: false });
    try {
      if (typeof CompressionStream === 'undefined') throw new Error('This browser cannot create share links. Try a recent Chrome, Edge, Safari or Firefox.');
      const code = await packShare(this.mapViewData(false));
      const base = location.href.split('#')[0], url = base + '#view=' + code;
      let note = '';
      if (!/^https?:/.test(location.protocol)) note = 'The link only works when the app is opened from its web address (for example GitHub Pages), not from a file on your computer.';
      else if (url.length > 60000) note = 'This map makes a very long link (' + Math.round(url.length / 1000) + ' k characters). It works in browsers, but some chat and mail apps may cut it. Images are not included.';
      else note = 'Images are not included in the link.';
      this.setState({ shareUrl: url, shareNote: note });
    } catch (err) { this.setState({ shareNote: err.message }); }
  },
  async openShared(code) {
    try {
      const D = await unpackShare(code);
      const html = this.viewerHtml(D, true);
      document.open(); document.write(html); document.close();
    } catch (err) {
      window.alert('This share link could not be opened. It may have been cut off. Ask for a new link.');
      history.replaceState(null, '', location.href.split('#')[0]); location.reload();
    }
  }
};
