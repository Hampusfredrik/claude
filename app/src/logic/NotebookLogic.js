// Visual Notebook: state, editing, history and the view model the UI renders.
// Feature areas live in their own modules and are mixed into this class.
import React from 'react';
import { DCLogic } from './DCLogic.js';
import { syncMethods } from '../sync/syncMethods.js';
import { shareMethods } from '../share/shareMethods.js';
import { exportMethods } from '../export/exportMethods.js';
import { aiMethods } from '../ai/aiMethods.js';
import { layoutMethods } from '../layout/layoutMethods.js';
import { edgeMethods } from '../geometry/edgeMethods.js';
import { editorMethods } from '../editor/editorMethods.js';
import { AI_SPEC } from '../ai/spec.js';
import { ARROW_COLORS, DEFAULT_CATS, FRAME_COLORS, IDX, KEY, MH, MW, NH, NW, OLD_NAMES, mk } from '../model/constants.js';
import { allNotes, allRefs, blankMap, loadCats, migrateCats, pageIdxOf, pagesOf, readJSON, titleOf } from '../model/storage.js';
import { countWords } from '../model/wordcount.js';
import { fmtKey, insNL } from '../text/inputs.js';
import { LINK_RE, links, plain } from '../text/links.js';
import { richBlock, richLabel } from '../text/markdown.js';
import { parseRefs, vancouver } from '../text/refs.js';
import { buildBook } from '../book/buildBook.js';
import { placeChild } from '../layout/place.js';
import { bookHtml } from '../export/bookHtml.js';

export default class NotebookLogic extends DCLogic {
  undoStack = [];
  redoStack = [];
  notesRef = React.createRef();
  snap() { const s = this.state; return { nodes: s.nodes, edges: s.edges, cats: s.cats, frames: s.frames || [] }; }
  patchFrame(id, p) { this.setState({ frames: (this.state.frames || []).map(f => f.id === id ? Object.assign({}, f, p) : f) }); }
  deleteFrame() { const id = this.state.selFrame; if (id) this.setState({ frames: (this.state.frames || []).filter(f => f.id !== id), selFrame: null }); }
  undo() {
    const h = this.undoStack.pop(); if (!h) return;
    this.redoStack.push(this.snap()); this.restoring = true; this.lastPush = 0;
    this.setState(Object.assign({}, h, { selNode: null, selEdge: null, editingId: null, modalId: null, histN: (this.state.histN || 0) + 1 }));
  }
  redo() {
    const h = this.redoStack.pop(); if (!h) return;
    this.undoStack.push(this.snap()); this.restoring = true; this.lastPush = 0;
    this.setState(Object.assign({}, h, { selNode: null, selEdge: null, editingId: null, modalId: null, histN: (this.state.histN || 0) + 1 }));
  }
  constructor(props) {
    super(props);
    this.surfRef = React.createRef();
    let idx = readJSON(IDX);
    if (!idx || !idx.maps || !idx.maps.length) {
      const old = readJSON(KEY);
      const id = 'm' + Date.now();
      const data = old && old.nodes && old.nodes.length ? old : blankMap();
      try { localStorage.setItem(mk(id), JSON.stringify(data)); } catch (err) {}
      idx = { maps: [{ id: id, title: titleOf(data.nodes), updated: Date.now() }], current: id };
      try { localStorage.setItem(IDX, JSON.stringify(idx)); } catch (err) {}
    }
    const cur = idx.maps.some(m => m.id === idx.current) ? idx.current : idx.maps[0].id;
    const saved = readJSON(mk(cur));
    this.hadSaved = !!(saved && saved.nodes && saved.nodes.length && (saved.tx || saved.ty));
    const d = saved && saved.nodes ? saved : blankMap();
    this.state = {
      maps: idx.maps, folders: idx.folders || [], currentId: cur, sidebarOpen: false, mobile: window.innerWidth < 760,
      nodes: d.nodes, edges: d.edges || [], frames: d.frames || [],
      tx: d.tx || 0, ty: d.ty || 0, scale: d.scale || 1,
      // Start page with all maps: shown when the site is opened (once per tab, so a
      // reload while working stays in the map). Never for #view= share links.
      startOpen: (() => { try { if (/^#view=/.test(location.hash) || sessionStorage.getItem('vn-start-shown')) return false; sessionStorage.setItem('vn-start-shown', '1'); } catch (err) {} return true; })(),
      selNode: null, selEdge: null, modalId: null, tab: 'notes', dark: (() => { let d = false; try { d = localStorage.getItem('visual-notebook.theme') === 'dark'; } catch (err) {} document.documentElement.dataset.theme = d ? 'dark' : 'light'; return d; })(),
      linkFrom: null, linkPt: null, editingId: null, saved: 'Saved',
      cats: d.cats ? migrateCats(d.cats) : loadCats(), query: '', editCat: null
    };
    this.drag = null;
    this.mapQRef = React.createRef();
  }
  setCats(cats) { this.setState({ cats: cats }); }
  titleFor(id) {
    if (id === this.state.currentId) { const m = this.state.nodes.find(n => n.main) || this.state.nodes[0]; return m ? m.label : ''; }
    return (this.state.maps.find(m => m.id === id) || {}).title || '';
  }
  renameMap(id, name) {
    const s = this.state;
    if (id === s.currentId) {
      const main = s.nodes.find(n => n.main) || s.nodes[0];
      if (main) this.patchNode(main.id, { label: name });
      return;
    }
    const d = readJSON(mk(id)) || blankMap();
    const main = (d.nodes || []).find(n => n.main) || (d.nodes || [])[0];
    if (main) main.label = name;
    try { localStorage.setItem(mk(id), JSON.stringify(d)); } catch (err) {}
    const maps = s.maps.map(m => m.id === id ? Object.assign({}, m, { title: name }) : m);
    this.writeIndex(maps, s.currentId);
    this.setState({ maps: maps });
  }
  allMapsData() {
    const s = this.state;
    return s.maps.map(m => {
      const d = m.id === s.currentId ? { nodes: s.nodes, edges: s.edges } : (readJSON(mk(m.id)) || { nodes: [], edges: [] });
      return { id: m.id, title: m.id === s.currentId ? titleOf(s.nodes) : m.title, nodes: d.nodes || [], edges: d.edges || [] };
    });
  }
  goToMap(id, focusId) {
    if (id === this.state.currentId) { if (focusId) this.focusNode(focusId); return; }
    const maps = this.saveNow();
    if (!maps.some(m => m.id === id)) return;
    this.openMap(id, maps);
    if (focusId) setTimeout(() => this.focusNode(focusId), 0);
  }
  downstream(id, edges) {
    const out = new Set(), q = [id];
    while (q.length) {
      const c = q.shift();
      edges.forEach(e => { if (e.from === c && e.to !== id && !out.has(e.to)) { out.add(e.to); q.push(e.to); } });
    }
    return out;
  }
  collapseInfo() {
    const s = this.state, hidden = new Set(), counts = {};
    const mainId = (s.nodes.find(n => n.main) || {}).id;
    s.nodes.forEach(n => {
      if (!n.collapsed) return;
      const d = this.downstream(n.id, s.edges);
      d.delete(mainId);
      counts[n.id] = d.size;
      d.forEach(x => hidden.add(x));
    });
    return { hidden: hidden, counts: counts };
  }
  boxOf(n) {
    const el = this.els && this.els[n.id], z = this.size(n);
    return { w: el && el.offsetWidth ? el.offsetWidth : z.w, h: el && el.offsetHeight ? el.offsetHeight : z.h };
  }
  mapMatches() {
    const s = this.state, q = (s.mapQ || '').trim().toLowerCase();
    if (!q) return null;
    if (this._mq && this._mq.q === q && this._mq.nodes === s.nodes) return this._mq;
    const ids = s.nodes.filter(n => [n.label || '', n.sub || '', allNotes(n), allRefs(n)].some(h => h.toLowerCase().includes(q))).sort((a, b) => (a.y - b.y) || (a.x - b.x)).map(n => n.id);
    this._mq = { q: q, nodes: s.nodes, ids: ids, set: new Set(ids) };
    return this._mq;
  }
  mapQStep(d) {
    const m = this.mapMatches(); if (!m || !m.ids.length) return;
    const cur = this.state.mapQIdx == null ? -1 : this.state.mapQIdx;
    const i = cur < 0 ? (d > 0 ? 0 : m.ids.length - 1) : (cur + d + m.ids.length) % m.ids.length;
    this.setState({ mapQIdx: i }); this.focusNode(m.ids[i]);
  }
  openMapSearch() {
    if (this.state.mapSearch) { const el = this.mapQRef.current; if (el) { el.focus(); el.select(); } return; }
    this.setState({ mapSearch: true });
  }
  focusNode(id) {
    if (this.collapseInfo().hidden.has(id)) {
      const nodes = this.state.nodes.map(x => x.collapsed && this.downstream(x.id, this.state.edges).has(id) ? Object.assign({}, x, { collapsed: false }) : x);
      this.setState({ nodes: nodes }, () => this.focusNode(id));
      return;
    }
    const n = this.state.nodes.find(x => x.id === id);
    const el = this.surfRef.current;
    if (!n || !el) return;
    const r = el.getBoundingClientRect(), z = this.size(n), sc = Math.max(this.state.scale, 0.9);
    this.setState({ scale: sc, tx: r.width / 2 - (n.x + z.w / 2) * sc, ty: r.height / 2 - (n.y + z.h / 2) * sc, selNode: id, selEdge: null });
  }
  mapFromNode(nodeId) {
    const n = this.state.nodes.find(x => x.id === nodeId);
    if (!n) return;
    const id = 'm' + Date.now();
    try { localStorage.setItem(mk(id), JSON.stringify(blankMap(n.label))); } catch (err) {}
    const nodes = this.state.nodes.map(x => x.id === nodeId ? Object.assign({}, x, { link: id }) : x);
    this.setState({ nodes: nodes, maps: [{ id: id, title: n.label, updated: Date.now() }].concat(this.state.maps) }, () => this.goToMap(id));
  }
  floatStart(ev, key, mode) {
    if (ev.button != null && ev.button !== 0) return;
    ev.preventDefault(); ev.stopPropagation();
    const el = ev.currentTarget.closest('[data-float]');
    if (!el) return;
    const host = key === 'modalRect' ? el.parentElement : el.offsetParent;
    if (!host) return;
    const pr = host.getBoundingClientRect(), er = el.getBoundingClientRect();
    const r0 = { x: er.left - pr.left, y: er.top - pr.top, w: er.width, h: er.height }, sx = ev.clientX, sy = ev.clientY;
    const minW = key === 'modalRect' ? 360 : 220, minH = key === 'modalRect' ? 260 : 200;
    const move = (e) => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      let r;
      if (mode === 'move') r = { x: Math.max(-r0.w + 80, Math.min(pr.width - 80, r0.x + dx)), y: Math.max(0, Math.min(pr.height - 40, r0.y + dy)), w: r0.w, h: r0.h };
      else r = { x: r0.x, y: r0.y, w: Math.max(minW, Math.min(pr.width - r0.x, r0.w + dx)), h: Math.max(minH, Math.min(pr.height - r0.y, r0.h + dy)) };
      r = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
      this.setState(key === 'modalRect' ? { modalRect: r, modalMax: false } : { [key]: r });
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      try { if (this.state[key]) localStorage.setItem('visual-notebook.' + key, JSON.stringify(this.state[key])); if (key === 'modalRect') localStorage.setItem('visual-notebook.modalMax', ''); } catch (err) {}
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  floatReset(key) {
    try { localStorage.removeItem('visual-notebook.' + key); } catch (err) {}
    this.setState({ [key]: null });
  }
  textScale() {
    if (this._ts == null) { let v = 1; try { v = parseFloat(localStorage.getItem('vn.textScale')) || 1; } catch (er) {} this._ts = v; }
    return this._ts;
  }
  refreshLabels() {
    const L = {}; (this.state.nodes || []).forEach(n => { L[n.id] = plain(String(n.label || '').replace(LINK_RE, '')).replace(/\s+/g, ' ').trim() || 'Untitled'; });
    links.labels = L;
    links.openNode = (id) => { if (!this.state.nodes.some(n => n.id === id)) return; this.slashRange = null; this.setState({ modalId: id, selNode: id, tab: 'notes', notesEditing: false, slash: null }); };
  }
  writeIndex(maps, current, folders) {
    const fs = folders || (this.state && this.state.folders) || [];
    try { localStorage.setItem(IDX, JSON.stringify({ maps: maps, current: current, folders: fs })); } catch (err) {}
  }
  createMap(folder) {
    const maps0 = this.saveNow();
    const id = 'm' + Date.now();
    const item = { id: id, title: 'Main topic', updated: Date.now(), folder: folder || null };
    if (folder) {
      const fs = (this.state.folders || []).map(f => f.id === folder ? Object.assign({}, f, { open: true }) : f);
      this.setState({ folders: fs });
      this.openMap(id, maps0.concat([item]));
    } else this.openMap(id, [item].concat(maps0));
  }
  saveNow() {
    clearTimeout(this.saveT);
    const s = this.state;
    try {
      localStorage.setItem(mk(s.currentId), JSON.stringify({ nodes: s.nodes, edges: s.edges, frames: s.frames || [], tx: s.tx, ty: s.ty, scale: s.scale, cats: s.cats }));
      const t = titleOf(s.nodes);
      const maps = s.maps.map(m => m.id === s.currentId ? Object.assign({}, m, { title: t, updated: Date.now() }) : m);
      this.writeIndex(maps, s.currentId);
      this.setState({ maps: maps, saved: 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      return maps;
    } catch (err) { this.setState({ saved: 'Could not save' }); return s.maps; }
  }
  openMap(id, maps) {
    const d = readJSON(mk(id)) || blankMap();
    const el = this.surfRef.current;
    const r = el ? el.getBoundingClientRect() : { width: 0, height: 0 };
    const fresh = !(d.tx || d.ty);
    this.skipSave = true;
    this.writeIndex(maps, id);
    this.setState({
      maps: maps, currentId: id,
      nodes: d.nodes || [], edges: d.edges || [], frames: d.frames || [],
      cats: d.cats ? migrateCats(d.cats) : loadCats(),
      tx: fresh ? r.width / 2 : d.tx, ty: fresh ? r.height / 2 : d.ty, scale: d.scale || 1,
      selNode: null, selEdge: null, modalId: null, editingId: null, linkFrom: null, linkPt: null, saved: 'Saved', startOpen: false
    });
  }
  componentDidMount() {
    this._prevState = this.state;
    if (/^#view=/.test(location.hash)) { this.openShared(location.hash.slice(6)); return; }
    this.initSync();
    const el = this.surfRef.current;
    this.onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect(), v = this.liveView();
      const k = Math.exp(-e.deltaY * 0.0015);
      const s = Math.min(2.5, Math.max(0.25, v.scale * k));
      const f = s / v.scale;
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      this.setView({ scale: s, tx: cx - (cx - v.tx) * f, ty: cy - (cy - v.ty) * f });
    };
    if (el._wheelFn) el.removeEventListener('wheel', el._wheelFn);
    el.addEventListener('wheel', this.onWheel, { passive: false }); el._wheelFn = this.onWheel;
    this.onResize = () => { const m = window.innerWidth < 760; if (m !== this.state.mobile) this.setState(m ? { mobile: m, sidebarOpen: false } : { mobile: m }); };
    window.addEventListener('resize', this.onResize);
    this.onFocusOut = () => setTimeout(() => { const a = document.activeElement; if (!a || !/INPUT|TEXTAREA/.test(a.tagName) && !a.isContentEditable) { if (window.scrollX || window.scrollY) window.scrollTo(0, 0); document.documentElement.scrollLeft = 0; document.body.scrollLeft = 0; } }, 60);
    document.addEventListener('focusout', this.onFocusOut);
    this.onWinScroll = () => { if (window.scrollX && !document.activeElement.matches('input,textarea,[contenteditable]')) window.scrollTo(0, window.scrollY); };
    window.addEventListener('scroll', this.onWinScroll);
    const tdist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    this.onTouchStart = (e) => {
      if (e.touches.length === 2) {
        clearTimeout(this.pressT); this.drag = null;
        const r = el.getBoundingClientRect();
        const v0 = this.liveView();
        this.pinch = { d: tdist(e.touches), s: v0.scale, tx: v0.tx, ty: v0.ty,
          cx: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, cy: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top };
      }
    };
    this.onTouchMove = (e) => {
      if (!this.pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const p = this.pinch, r = el.getBoundingClientRect();
      const s = Math.min(2.5, Math.max(0.25, p.s * tdist(e.touches) / p.d)), f = s / p.s;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left, cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
      this.setView({ scale: s, tx: cx - (p.cx - p.tx) * f, ty: cy - (p.cy - p.ty) * f }, 400);
    };
    this.onTouchEnd = (e) => { if (e.touches.length < 2) { if (this.pinch) this.commitView(); this.pinch = null; } };
    el.addEventListener('touchstart', this.onTouchStart, { passive: true });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd);
    this.onMove = (e) => {
      if (this.drag && this.drag.type !== 'pan' && !this.state.linkFrom) { this._mvEv = { clientX: e.clientX, clientY: e.clientY, altKey: e.altKey, pointerType: e.pointerType }; if (!this._mvRaf) this._mvRaf = requestAnimationFrame(() => { this._mvRaf = 0; const ev = this._mvEv; this._mvEv = null; if (ev) this.onMoveNow(ev); }); return; }
      this.onMoveNow(e);
    };
    this.onMoveNow = (e) => {
      const d = this.drag;
      if (this.state.linkFrom || (d && d.moved)) { const sl = window.getSelection && window.getSelection(); if (sl && sl.rangeCount && !document.activeElement.isContentEditable && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) sl.removeAllRanges(); }
      if (this.state.linkFrom) this.setState({ linkPt: this.world(e) });
      if (!d) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (Math.abs(dx) + Math.abs(dy) > (e.pointerType === 'touch' ? 8 : 4)) { d.moved = true; clearTimeout(this.pressT); }
      if (this.pinch) return;
      if (d.type === 'pan') this.setView({ tx: d.tx + dx, ty: d.ty + dy, scale: this.liveView().scale }, 1000);
      else if (d.type === 'node') {
        const s = this.state.scale;
        let x = d.nx + dx / s, y = d.ny + dy / s, guides = [];
        if (!e.altKey) { const g = this.snapGuides(d.id, x, y, d.group ? new Set(d.group.map(q => q.id)) : null); x = g.x; y = g.y; guides = g.guides; }
        if (d.group) {
          const ddx = x - d.nx, ddy = y - d.ny, pos = {}; d.group.forEach(q => pos[q.id] = q);
          this.setState({ nodes: this.state.nodes.map(n => pos[n.id] ? Object.assign({}, n, { x: Math.round((pos[n.id].x + ddx) * 10) / 10, y: Math.round((pos[n.id].y + ddy) * 10) / 10 }) : n), guides: guides });
        } else this.setState({ nodes: this.state.nodes.map(n => n.id === d.id ? Object.assign({}, n, { x: x, y: y }) : n), guides: guides });
      } else if (d.type === 'marquee') {
        const p = this.world(e); this.setState({ marquee: { x1: d.wx, y1: d.wy, x2: p.x, y2: p.y } });
      } else if (d.type === 'frameDraw') {
        const p = this.world(e); this.setState({ frameDraft: { x1: d.wx, y1: d.wy, x2: p.x, y2: p.y } });
      } else if (d.type === 'frame') {
        const sc = this.state.scale, ddx = Math.round(dx / sc), ddy = Math.round(dy / sc), pos = {};
        d.inner.forEach(q => pos[q.id] = q);
        const up = { frames: (this.state.frames || []).map(f => f.id === d.id ? Object.assign({}, f, { x: d.fx + ddx, y: d.fy + ddy }) : f) };
        if (d.inner.length) up.nodes = this.state.nodes.map(n => pos[n.id] ? Object.assign({}, n, { x: pos[n.id].x + ddx, y: pos[n.id].y + ddy }) : n);
        this.setState(up);
      } else if (d.type === 'frameSize') {
        const sc = this.state.scale;
        this.patchFrame(d.id, { w: Math.max(80, Math.round(d.fw + dx / sc)), h: Math.max(60, Math.round(d.fh + dy / sc)) });
      }
    };
    this.onUp = (e) => {
      if (this._mvRaf) { cancelAnimationFrame(this._mvRaf); this._mvRaf = 0; const ev = this._mvEv; this._mvEv = null; if (ev) this.onMoveNow(ev); }
      const d = this.drag;
      this.drag = null;
      if (this.view && !this.pinch) this.commitView();
      document.body.style.userSelect = ''; document.body.style.webkitUserSelect = '';
      if (this.state.guides && this.state.guides.length) this.setState({ guides: [] });
      if (d && d.clearSel && !d.moved && !this.pinch) { const st = this.state; if (st.selNode || st.selEdge || (st.multi && st.multi.length)) this.setState({ selNode: null, selEdge: null, multi: [] }); }
      if (d && (d.type === 'frame' || d.type === 'frameSize')) return;
      if (d && d.pickFrame && !d.moved) { this.setState({ selFrame: d.pickFrame }); if (e.pointerType !== 'touch') return; }
      if (d && d.type === 'frameDraw') {
        const m = this.state.frameDraft;
        if (m && d.moved) {
          const x = Math.round(Math.min(m.x1, m.x2)), y = Math.round(Math.min(m.y1, m.y2)), w = Math.round(Math.abs(m.x2 - m.x1)), h = Math.round(Math.abs(m.y2 - m.y1));
          if (w > 30 && h > 30) { const id = 'f' + Date.now(); this.setState({ frames: (this.state.frames || []).concat([{ id: id, x: x, y: y, w: w, h: h, color: this.lastFrameColor || 'sage', label: '' }]), selFrame: id, frameDraft: null, frameMode: false }); return; }
        }
        this.setState({ frameDraft: null });
        return;
      }
      if (d && d.type === 'marquee') {
        const m = this.state.marquee, h = this.collapseInfo().hidden;
        if (m && d.moved) {
          const x1 = Math.min(m.x1, m.x2), x2 = Math.max(m.x1, m.x2), y1 = Math.min(m.y1, m.y2), y2 = Math.max(m.y1, m.y2);
          const ids = this.state.nodes.filter(n => { if (h.has(n.id)) return false; const z = this.boxOf(n); return n.x < x2 && n.x + z.w > x1 && n.y < y2 && n.y + z.h > y1; }).map(n => n.id);
          const base = d.add ? (this.state.multi || []) : [];
          const all = Array.from(new Set(base.concat(ids)));
          this.setState({ marquee: null, multi: all, selNode: all.length === 1 ? all[0] : null });
        } else this.setState({ marquee: null, multi: d.add ? this.state.multi : [] });
        return;
      }
      if (d && d.group && !d.moved && !d.toggled) this.setState({ multi: [] });
      if (this.state.linkFrom) {
        const t = e.target && e.target.closest ? e.target.closest('[data-node]') : null;
        const id = t ? this.nodeIdAt(e) : null;
        if (id && id !== this.state.linkFrom) this.addEdge(this.state.linkFrom, id);
        this.setState({ linkFrom: null, linkPt: null });
        return;
      }
      clearTimeout(this.pressT);
      if (d && d.pressed) return;
      if (d && !d.moved && d.type === 'node') { const mq = this.mapMatches(); if (mq && mq.set.has(d.id)) { clearTimeout(this.editT); const qi = mq.ids.indexOf(d.id); this.setState({ modalId: d.id, tab: 'notes', notesEditing: false, editingId: null, selEdge: null, mapQIdx: qi }); return; } }
      if (d && !d.moved && e.pointerType === 'touch') {
        const now = Date.now(), lt = this.lastTap;
        this.lastTap = { t: now, x: e.clientX, y: e.clientY, id: d.type === 'node' ? d.id : null };
        if (lt && now - lt.t < 320 && Math.hypot(lt.x - e.clientX, lt.y - e.clientY) < 30 && lt.id === this.lastTap.id) {
          this.lastTap = null; clearTimeout(this.editT);
          if (d.type === 'node') this.setState({ modalId: d.id, tab: 'notes', notesEditing: false, editingId: null, selEdge: null });
          else { const p = this.world(e); this.spawn(p.x - NW / 2, p.y - NH / 2); }
          return;
        }
      }
      if (d && d.type === 'node' && !d.moved && this.state.editingId !== d.id) {
        const wasSel = d.wasSel;
        this.setState({ selNode: d.id, selEdge: null });
        clearTimeout(this.editT);
        const id = d.id;
        if (wasSel) this.editT = setTimeout(() => { if (!this.state.modalId && this.state.selNode === id) this.setState({ editingId: id }); }, 260);
      }
    };
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    this.onPopDown = (e) => {
      const t = e.target, inside = (k) => t && t.closest && t.closest('[data-pop="' + k + '"]');
      const up = {};
      if (this.state.exportOpen && !inside('export')) up.exportOpen = false;
      if (this.state.tidyOpen && !inside('tidy')) up.tidyOpen = false;
      if (this.state.refsOpen && !inside('refs') && !(t && t.closest && t.closest('[data-node]'))) up.refsOpen = false;
      if (this.state.mapSearch && !inside('search') && !(t && t.closest && (t.closest('[title^="Search this map"]') || t.closest('[data-node]') || t.closest('[data-modal]'))) && !this.state.modalId) Object.assign(up, { mapSearch: false, mapQ: '', mapQIdx: null });
      if (Object.keys(up).length) this.setState(up);
    };
    document.addEventListener('pointerdown', this.onPopDown, true);
    this.onKey = (e) => {
      // In the notebook view the map shortcuts are off. Esc stops editing, or
      // goes back to the map; Ctrl+Z / Ctrl+Shift+Z undo outside text fields.
      if (this.state.startOpen && !this.state.modalId) {
        const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
        if (e.key === 'Escape' && !typing) this.setState({ startOpen: false });
        return;
      }
      if (this.state.bookOpen && !this.state.modalId) {
        const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (typing || this.state.bookEditId || this.state.bookTitleEdit) { if (t && t.blur) t.blur(); this.setState({ bookEditId: null, bookTitleEdit: null }); } else this.setState({ bookOpen: false }); return; }
        if (!typing && (e.ctrlKey || e.metaKey) && ((e.key || '').toLowerCase() === 'z' || (e.key || '').toLowerCase() === 'y')) { e.preventDefault(); if ((e.key || '').toLowerCase() === 'y' || e.shiftKey) this.redo(); else this.undo(); }
        return;
      }
      const k = (e.key || '').toLowerCase();
      const code = e.code || '';
      if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'y' || code === 'KeyZ' || code === 'KeyY')) {
        const t = e.target, tag = t && t.tagName;
        const boxEdit = t && t.dataset && t.dataset.boxedit;
        if (!boxEdit && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable))) return;
        if (boxEdit) { this.restoring = false; t.blur(); }
        e.preventDefault();
        e.stopPropagation();
        if (k === 'y' || code === 'KeyY' || e.shiftKey) this.redo(); else this.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (k === 'f' || code === 'KeyF') && !this.state.modalId) { e.preventDefault(); this.openMapSearch(); return; }
      if (this.state.modalId) { if (e.key === 'Escape') this.setState({ modalId: null }); return; }
      if (this.state.editingId) return;
      const tg = e.target && e.target.tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      if (e.key === 'Escape') this.setState({ selNode: null, selEdge: null, linkFrom: null, linkPt: null, multi: [], selectMode: false, refsOpen: false, selFrame: null, frameMode: false, frameDraft: null });
      if ((e.ctrlKey || e.metaKey) && k === 'a') { e.preventDefault(); const h = this.collapseInfo().hidden; this.setState({ multi: this.state.nodes.filter(n => !h.has(n.id)).map(n => n.id), selNode: null, selEdge: null }); return; }
      if (e.key === 'F2' && this.state.selNode) { e.preventDefault(); this.setState({ editingId: this.state.selNode }); return; }
      if (e.key === 'Tab' && this.state.selNode && !this.state.modalId) { e.preventDefault(); this.addLinked(this.state.selNode); return; }
      if (e.key === 'Enter' && this.state.selNode && !this.state.modalId) {
        e.preventDefault();
        if (e.shiftKey) { this.setState({ editingId: this.state.selNode }); return; }
        const p = this.parentOf(this.state.selNode);
        this.addLinked(p || this.state.selNode);
        return;
      }
      if (/^Arrow/.test(e.key) && !this.state.modalId && !e.ctrlKey && !e.metaKey) {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (d) { e.preventDefault(); this.moveSel(d[0], d[1]); return; }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.state.selFrame) { e.preventDefault(); this.deleteFrame(); }
        else if (this.state.selEdge) { e.preventDefault(); this.deleteEdge(); }
        else if ((this.state.multi || []).length > 1) { e.preventDefault(); this.removeMany(this.state.multi); }
        else if (this.state.selNode) this.confirmRemove(this.state.selNode);
      }
    };
    window.addEventListener('keydown', this.onKey, true);
    { const mr = readJSON('visual-notebook.modalRect'), er = readJSON('visual-notebook.edgeRect'); let mx = false; try { mx = localStorage.getItem('visual-notebook.modalMax') === '1'; } catch (err) {} if (mr || er || mx) this.setState({ modalRect: mr || null, edgeRect: er || null, modalMax: mx }); }
    setTimeout(() => this.measure(), 0);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.measured = {}; this.measure(); });
    if (!this.hadSaved) {
      const r = el.getBoundingClientRect();
      this.setState({ tx: r.width / 2, ty: r.height / 2 });
    }
  }
  componentWillUnmount() {
    const el = this.surfRef.current;
    if (el) { el.removeEventListener('wheel', this.onWheel); if (el._wheelFn === this.onWheel) el._wheelFn = null; }
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    document.removeEventListener('pointerdown', this.onPopDown, true);
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onFocusSync);
    clearInterval(this.syncTimer);
  }
  componentDidUpdate() {
    const wel = this.surfRef && this.surfRef.current;
    if (wel && this.onWheel && wel._wheelFn !== this.onWheel) { if (wel._wheelFn) wel.removeEventListener('wheel', wel._wheelFn); wel.addEventListener('wheel', this.onWheel, { passive: false }); wel._wheelFn = this.onWheel; }
    const s = this.state;
    const ps = this._prevState || s;
    this._prevState = s;
    this.syncEditor();
    this.markQ();
    this.measure();
    if (s.modalId && s.modalId !== ps.modalId) {
      requestAnimationFrame(() => {
        if (this.modalScrollEl) this.modalScrollEl.scrollTop = 0;
        try { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch (e) {}
        if (s.mobile && document.activeElement && document.activeElement.blur) document.activeElement.blur();
      });
    }
    if (this.suppressSave) { this.suppressSave = false; clearTimeout(this.saveT); return; }
    if (ps.currentId !== s.currentId) { this.skipSave = false; this.undoStack = []; this.redoStack = []; this.lastPush = 0; return; }
    if (ps.nodes !== s.nodes || ps.edges !== s.edges || ps.frames !== s.frames || ps.cats !== s.cats || ps.tx !== s.tx || ps.ty !== s.ty || ps.scale !== s.scale) {
      clearTimeout(this.saveT);
      const later = () => { if (this.drag) { this.saveT = setTimeout(later, 300); return; } this.saveNow(); };
      this.saveT = setTimeout(later, 500);
    }
  }
  accent() { return '#2f6f5e'; }
  fitView() {
    const s = this.state, el = this.surfRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    if (!s.nodes.length) return this.setState({ tx: 0, ty: 0, scale: 1 });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    s.nodes.forEach(n => { const z = this.size(n); x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + z.w); y1 = Math.max(y1, n.y + z.h); });
    const pad = 90;
    const sc = Math.min(1.4, Math.max(0.25, Math.min((r.width - pad * 2) / Math.max(1, x1 - x0), (r.height - pad * 2) / Math.max(1, y1 - y0))));
    this.setState({ scale: sc, tx: r.width / 2 - ((x0 + x1) / 2) * sc, ty: r.height / 2 - ((y0 + y1) / 2) * sc });
  }
  size(n) {
    const m = this.measured && this.measured[n.id];
    if (m) return m;
    return n.main ? { w: MW, h: MH } : { w: NW, h: NH };
  }
  measure() {
    if (!this.els || (this.drag && this.drag.moved && this.drag.type !== 'frameSize')) return;
    this.measured = this.measured || {};
    let changed = false;
    Object.keys(this.els).forEach(id => {
      const el = this.els[id];
      if (!el || !el.isConnected) { delete this.els[id]; return; }
      const w = el.offsetWidth, h = el.offsetHeight, o = this.measured[id];
      if (!o || Math.abs(o.w - w) > 0.5 || Math.abs(o.h - h) > 0.5) { this.measured[id] = { w: w, h: h }; changed = true; }
    });
    if (changed) this.forceUpdate();
  }
  world(e) {
    const r = this.surfRef.current.getBoundingClientRect(), v = this.liveView();
    return { x: (e.clientX - r.left - v.tx) / v.scale, y: (e.clientY - r.top - v.ty) / v.scale };
  }
  liveView() { return this.view || { tx: this.state.tx, ty: this.state.ty, scale: this.state.scale }; }
  setView(v, delay) {
    this.view = v;
    if (!this.viewRaf) this.viewRaf = requestAnimationFrame(() => { this.viewRaf = 0; const w = this.worldRef && this.worldRef.current, q = this.view; if (w && q) { if (w.style.willChange !== 'transform') w.style.willChange = 'transform'; } if (w && q) w.style.transform = 'translate(' + q.tx + 'px,' + q.ty + 'px) scale(' + q.scale + ')'; });
    clearTimeout(this.viewT); this.viewT = setTimeout(() => this.commitView(), delay == null ? 160 : delay);
  }
  commitView() {
    clearTimeout(this.viewT); const v = this.view; if (!v) return; this.view = null;
    if (this.viewRaf) { cancelAnimationFrame(this.viewRaf); this.viewRaf = 0; }
    this.setState({ tx: v.tx, ty: v.ty, scale: v.scale }, () => { const w = this.worldRef && this.worldRef.current; if (w) w.style.willChange = 'auto'; });
  }
  nodeIdAt(e) {
    const p = this.world(e);
    for (let i = this.state.nodes.length - 1; i >= 0; i--) {
      const n = this.state.nodes[i], s = this.size(n);
      if (p.x >= n.x - 12 && p.x <= n.x + s.w + 12 && p.y >= n.y - 12 && p.y <= n.y + s.h + 12) return n.id;
    }
    return null;
  }
  addEdge(from, to) {
    if (this.state.edges.some(e => e.from === from && e.to === to)) return;
    this.setState({ edges: this.state.edges.concat([{ id: 'e' + Date.now(), from: from, to: to, both: false, strength: 'thin' }]) });
  }
  confirmRemove(id) {
    const s = this.state, n = s.nodes.find(x => x.id === id);
    if (!n) return;
    const mainId = (s.nodes.find(x => x.main) || {}).id;
    const down = this.downstream(id, s.edges); down.delete(mainId); down.delete(id);
    const info = [];
    if (allNotes(n).trim()) info.push('notes');
    if (parseRefs(allRefs(n)).length) info.push('references');
    if (n.link) info.push('a map link');
    const reasons = [];
    if (down.size) reasons.push(down.size + ' box' + (down.size > 1 ? 'es' : '') + ' downstream (they will stay, but lose this connection)');
    if (info.length) reasons.push(info.join(', ').replace(/, ([^,]*)$/, ' and $1'));
    if (reasons.length && !window.confirm('Are you sure you want to delete "' + (n.label || 'Untitled') + '"?\n\nIt has ' + reasons.join(', and ') + '.')) return;
    this.removeNode(id);
  }
  removeNode(id) {
    this.setState({
      nodes: this.state.nodes.filter(n => n.id !== id),
      edges: this.state.edges.filter(e => e.from !== id && e.to !== id),
      selNode: null, modalId: null
    });
  }
  mapRefList() {
    const s = this.state;
    if (this._refL && this._refL.nodes === s.nodes) return this._refL.list;
    const byKey = {}, list = [];
    s.nodes.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)).forEach(n => {
      parseRefs(allRefs(n)).forEach(r => {
        const k = (r.href || r.text).toLowerCase().replace(/\s+/g, ' ');
        let it = byKey[k];
        if (!it) { it = byKey[k] = { key: k, text: r.text, href: r.href || '', hasHref: !!r.href, noHref: !r.href, boxes: [] }; list.push(it); }
        if (!it.boxes.some(b => b.id === n.id)) it.boxes.push({ id: n.id, label: plain(n.label) || 'Untitled', onGo: () => { this.focusNode(n.id); if (this.state.mobile) this.setState({ refsOpen: false }); } });
      });
    });
    list.sort((a, b) => a.text.localeCompare(b.text));
    list.forEach((it, i) => it.num = i + 1);
    this._refL = { nodes: s.nodes, list: list };
    return list;
  }
  deleteEdge() { const id = this.state.selEdge; if (id) this.setState({ edges: this.state.edges.filter(e => e.id !== id), selEdge: null }); }
  removeMany(ids) {
    const set = new Set(ids); if (!set.size) return;
    if (!window.confirm('Delete ' + set.size + ' selected boxes?')) return;
    this.setState({ nodes: this.state.nodes.filter(n => !set.has(n.id)), edges: this.state.edges.filter(e => !set.has(e.from) && !set.has(e.to)), selNode: null, multi: [], modalId: null });
  }
  modalNode() { return this.state.nodes.find(x => x.id === this.state.modalId); }
  setPage(i) {
    const n = this.modalNode(); if (!n || i === pageIdxOf(n)) return;
    const ps = pagesOf(n);
    this.edNode = null; this.citePos = null;
    this.patchNode(n.id, { pages: ps, pageIdx: i, notes: ps[i].notes, refs: ps[i].refs });
    this.setState({ citeOpen: false, pageEdit: null });
  }
  addPage() {
    const n = this.modalNode(); if (!n) return;
    const ps = pagesOf(n), name = 'Sheet ' + (ps.length + 1);
    ps.push({ id: 'p' + Date.now().toString(36), name: name, notes: '', refs: '' });
    this.edNode = null; this.citePos = null;
    this.patchNode(n.id, { pages: ps, pageIdx: ps.length - 1, notes: '', refs: '' });
    this.setState({ citeOpen: false, pageEdit: { id: n.id, i: ps.length - 1 }, pageName: name });
  }
  commitPageName() {
    const pe = this.state.pageEdit; if (!pe) return;
    const n = this.state.nodes.find(x => x.id === pe.id);
    if (n) { const ps = pagesOf(n), nm = (this.state.pageName || '').trim(); if (ps[pe.i] && nm && nm !== ps[pe.i].name) { ps[pe.i].name = nm; this.patchNode(n.id, { pages: ps }); } }
    this.setState({ pageEdit: null });
  }
  pageDown(ev, i) {
    if (ev.button) return;
    const sx = ev.clientX, sy = ev.clientY; let on = false, to = i;
    const move = (e) => {
      if (!on && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
      on = true;
      const els = Array.from(document.querySelectorAll('[data-page-tab]'));
      to = els.length - 1;
      for (let k = 0; k < els.length; k++) { const r = els[k].getBoundingClientRect(); if (e.clientY < r.bottom + 4 && e.clientX < r.left + r.width / 2) { to = k; break; } if (e.clientY < r.top - 4) { to = k; break; } }
      if (to > i && els[to] && e.clientX < els[to].getBoundingClientRect().left + els[to].getBoundingClientRect().width / 2) to = Math.max(i, to - 1);
      this.setState({ pageDrag: { on: true, from: i, to: to } });
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (!on) return;
      this.pageDragged = true; setTimeout(() => { this.pageDragged = false; }, 0);
      this.setState({ pageDrag: null });
      if (to !== i) this.movePage(i, to);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  movePage(from, to) {
    const n = this.modalNode(); if (!n) return;
    const ps = pagesOf(n), activeId = ps[pageIdxOf(n)].id;
    const [it] = ps.splice(from, 1); ps.splice(to, 0, it);
    this.patchNode(n.id, { pages: ps, pageIdx: ps.findIndex(p => p.id === activeId) });
  }
  deletePage(i) {
    const n = this.modalNode(); if (!n) return;
    const ps = pagesOf(n); if (ps.length < 2) return;
    if ((ps[i].notes.trim() || ps[i].refs.trim()) && !window.confirm('Delete the tab "' + ps[i].name + '" and its notes?')) return;
    const a = pageIdxOf(n); ps.splice(i, 1);
    const ni = a > i ? a - 1 : Math.min(a, ps.length - 1);
    this.edNode = null; this.citePos = null;
    this.patchNode(n.id, { pages: ps, pageIdx: ni, notes: ps[ni].notes, refs: ps[ni].refs });
  }
  patchNode(id, patch) {
    const me = this.state.nodes.find(n => n.id === id), tw = me && me.twin;
    let shared = null;
    if (tw) { shared = {}; ['label', 'sub', 'notes', 'refs', 'pages', 'pageIdx', 'images'].forEach(k => { if (k in patch) shared[k] = patch[k]; }); if (!Object.keys(shared).length) shared = null; }
    this.setState({ nodes: this.state.nodes.map(n => n.id === id ? Object.assign({}, n, patch) : shared && n.twin === tw ? Object.assign({}, n, shared) : n) });
  }
  twinsOf(id) {
    const s = this.state, me = s.nodes.find(n => n.id === id);
    return me && me.twin ? s.nodes.filter(n => n.twin === me.twin && n.id !== id) : [];
  }
  makeTwin(id) {
    const s = this.state, src = s.nodes.find(n => n.id === id); if (!src) return;
    const tw = src.twin || ('t' + Date.now()), nid = 'n' + Date.now(), z = this.size(src);
    const copy = { id: nid, twin: tw, x: src.x + z.w + 60, y: src.y + z.h + 40, cat: src.cat };
    ['label', 'sub', 'notes', 'refs', 'pages', 'pageIdx', 'images'].forEach(k => { if (src[k] !== undefined) copy[k] = src[k]; });
    this.setState({ nodes: s.nodes.map(n => n.id === id && !n.twin ? Object.assign({}, n, { twin: tw }) : n).concat([copy]), modalId: null, pageEdit: null, selNode: nid, selEdge: null, multi: [] });
  }
  unTwin(id) {
    const s = this.state, me = s.nodes.find(n => n.id === id); if (!me || !me.twin) return;
    const left = s.nodes.filter(n => n.twin === me.twin && n.id !== id);
    this.setState({ nodes: s.nodes.map(n => n.id === id || (left.length === 1 && n.id === left[0].id) ? Object.assign({}, n, { twin: undefined }) : n) });
  }
  patchEdge(patch) {
    this.setState({ edges: this.state.edges.map(e => e.id === this.state.selEdge ? Object.assign({}, e, patch) : e) });
  }
  parentOf(id) {
    const s = this.state, mainId = (s.nodes.find(n => n.main) || {}).id;
    if (id === mainId) return null;
    const e = s.edges.find(e => e.to === id) || s.edges.find(e => e.both && e.from === id);
    return e ? (e.to === id ? e.from : e.to) : null;
  }
  addLinked(parentId, editLabel) {
    const s = this.state, p = s.nodes.find(n => n.id === parentId); if (!p) return;
    const ps = this.size(p);
    const gp = this.parentOf(parentId), g = gp && s.nodes.find(n => n.id === gp);
    const dir = g && (g.x + this.size(g).w / 2) > (p.x + ps.w / 2) ? -1 : 1;
    const kids = s.edges.filter(e => e.from === parentId).map(e => s.nodes.find(n => n.id === e.to)).filter(n => n && !n.main);
    const x = dir > 0 ? p.x + ps.w + 90 : p.x - NW - 90;
    let y;
    if (kids.length) { const last = kids.reduce((a, b) => (b.y + this.size(b).h > a.y + this.size(a).h ? b : a)); y = last.y + this.size(last).h + 24; }
    else y = p.y + ps.h / 2 - NH / 2;
    const id = 'n' + Date.now();
    this.setState({
      nodes: s.nodes.concat([{ id: id, label: '', x: x, y: y, notes: '', refs: '', cat: p.main ? undefined : p.cat }]),
      edges: s.edges.concat([{ id: 'e' + Date.now(), from: parentId, to: id, both: false, strength: 'thin' }]),
      selNode: id, selEdge: null, editingId: editLabel === false ? null : id
    });
    return id;
  }
  moveSel(dx, dy) {
    const s = this.state, cur = s.nodes.find(n => n.id === s.selNode);
    if (!cur) { const m = s.nodes.find(n => n.main) || s.nodes[0]; if (m) this.setState({ selNode: m.id }); return; }
    const c = this.size(cur), cx = cur.x + c.w / 2, cy = cur.y + c.h / 2;
    const hidden = this.collapseInfo().hidden;
    let best = null, bd = Infinity;
    s.nodes.forEach(n => {
      if (n.id === cur.id || hidden.has(n.id)) return;
      const z = this.size(n), vx = n.x + z.w / 2 - cx, vy = n.y + z.h / 2 - cy;
      const along = vx * dx + vy * dy; if (along <= 4) return;
      const across = Math.abs(vx * dy - vy * dx);
      const d = along + across * 2;
      if (d < bd) { bd = d; best = n; }
    });
    if (best) this.setState({ selNode: best.id, selEdge: null });
  }
  spawn(x, y) {
    const id = 'n' + Date.now();
    this.setState({ nodes: this.state.nodes.concat([{ id: id, label: '', x: x, y: y, notes: '', refs: '' }]), editingId: id, selNode: id });
  }
  jumpTo(id) {
    const n = this.state.nodes.find(q => q.id === id), el = this.surfRef.current; if (!n || !el) return;
    const r = el.getBoundingClientRect(), z = this.size(n), from = this.liveView();
    const to = { tx: r.width / 2 - (n.x + z.w / 2) * from.scale, ty: r.height / 2 - (n.y + z.h / 2) * from.scale };
    this.setState({ selNode: id, selEdge: null, multi: [] });
    const t0 = performance.now(); const stepF = (t) => { const k = Math.min(1, (t - t0) / 520), q = 1 - Math.pow(1 - k, 3); this.setView({ tx: from.tx + (to.tx - from.tx) * q, ty: from.ty + (to.ty - from.ty) * q, scale: from.scale }, 3000); if (k < 1) requestAnimationFrame(stepF); else this.commitView(); };
    requestAnimationFrame(stepF);
  }
  trackHistory() {
    const s = this.state, p = this.histPrev;
    if (!this.undoStack) { this.undoStack = []; this.redoStack = []; }
    if (!p || p.mapId !== s.currentId) { this.undoStack = []; this.redoStack = []; this.lastPush = 0; }
    else if (p.nodes !== s.nodes || p.edges !== s.edges || p.cats !== s.cats || p.frames !== s.frames) {
      if (this.restoring) this.restoring = false;
      else {
        const now = Date.now();
        if (!this.lastPush || now - this.lastPush > 700) {
          this.undoStack.push({ nodes: p.nodes, edges: p.edges, cats: p.cats, frames: p.frames || [] });
          if (this.undoStack.length > 100) this.undoStack.shift();
          this.redoStack = [];
        }
        this.lastPush = now;
      }
    }
    this.histPrev = { mapId: s.currentId, nodes: s.nodes, edges: s.edges, cats: s.cats, frames: s.frames };
  }
  // A new box below parentId, placed so it fits the map (layout/place.js).
  addChildPlaced(parentId) {
    const s = this.state, p = s.nodes.find(n => n.id === parentId); if (!p) return null;
    const gpId = this.parentOf(parentId), gp = gpId && s.nodes.find(n => n.id === gpId);
    const at = placeChild(s.nodes, s.edges, p, gp, (n) => this.size(n));
    const id = 'n' + Date.now();
    this.setState({
      nodes: s.nodes.concat([{ id: id, label: '', x: at.x, y: at.y, notes: '', refs: '', cat: p.main ? undefined : p.cat }]),
      edges: s.edges.concat([{ id: 'e' + Date.now(), from: parentId, to: id, both: false, strength: 'thin' }]),
      selNode: id, selEdge: null, editingId: null
    });
    return id;
  }
  // Download the notebook view of the current map as one .html file.
  exportBook() {
    const book = this.bookData(); if (!book) return;
    const name = (book.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'notebook') + '-notebook.html';
    try {
      const url = URL.createObjectURL(new Blob([bookHtml(book)], { type: 'text/html' })), a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this.setState({ saved: 'Exported ' + name });
    } catch (err) { window.alert('Export failed: ' + err.message); }
  }
  bookData() {
    const s = this.state, c = this._book;
    if (c && c.nodes === s.nodes && c.edges === s.edges && c.cats === s.cats) return c.book;
    this._book = { nodes: s.nodes, edges: s.edges, cats: s.cats, book: buildBook(s) };
    return this._book.book;
  }
  renderVals() {
    this.trackHistory();
    const s = this.state, ac = this.accent();
    if (s.cats.some(c => (OLD_NAMES[c.id] || []).includes(c.name))) setTimeout(() => this.setCats(migrateCats(this.state.cats)), 0);
    const pill = (on) => on ? 'background:' + ac + ';color:#fcfcfd;border-color:' + ac : 'background:#fcfcfd;color:#2a2724';
    const ci = this.collapseInfo();
    this._hiddenCache = ci.hidden;
    const focusId = s.selNode;
    if (this._xm == null) { try { this._xm = localStorage.getItem('vn.xlinkMode') || 'normal'; } catch (er) { this._xm = 'normal'; } }
    const xMode = s.xlinkMode || this._xm;
    const famN = new Set(), famE = new Set();
    if (focusId) {
      famN.add(focusId);
      const pe = {}; s.edges.forEach(e => { if (!e.both && e.from !== e.to && !pe[e.to]) pe[e.to] = e; });
      let x = focusId; const up = new Set([x]); while (pe[x] && !up.has(pe[x].from)) { famE.add(pe[x].id); x = pe[x].from; up.add(x); famN.add(x); }
      const q = [focusId], seen = new Set([focusId]); while (q.length) { const y = q.shift(); s.edges.forEach(e => { if (pe[e.to] === e && e.from === y && !seen.has(e.to)) { seen.add(e.to); famE.add(e.id); famN.add(e.to); q.push(e.to); } }); }
      s.edges.forEach(e => { if (e.from === focusId || e.to === focusId) { famE.add(e.id); famN.add(e.from); famN.add(e.to); } });
    }
    const edges = s.edges.filter(e => !ci.hidden.has(e.from) && !ci.hidden.has(e.to)).map(e => {
      const g = this.geom(e);
      if (!g) return null;
      const touches = focusId && (e.from === focusId || e.to === focusId);
      if (touches) { if (!g.custom) g.color = ac; g.w = g.w + 0.8; }
      g.opacity = focusId && !famE.has(e.id) && s.selEdge !== e.id ? 0.3 : 1;
      if (this.treeInfo().cross.has(e.id)) {
        const on = touches || s.selEdge === e.id;
        if (!on && xMode !== 'normal') g.opacity = xMode === 'select' ? 0 : (focusId ? 0.12 : 0.38);
      }
      g.showGhost = !!g.tunnel && (touches || s.selEdge === e.id);
      g.tunnelVis = !!g.tunnel && g.opacity > 0;
      g.hitW = g.opacity === 0 ? 0 : 18;
      g.showNoteDot = g.hasNotes && g.opacity > 0;
      g.showOrigin = !e.both;
      g.onSelect = (ev) => { ev.stopPropagation(); this.setState({ selEdge: e.id, selNode: null }); };
      return g;
    }).filter(Boolean);

    const hasKidSet = new Set(s.edges.map(e => e.from));
    const TIr = this.treeInfo(), treeKid = new Set(Object.keys(TIr.pe).map(k => TIr.pe[k].from));
    const catById = {}; s.cats.forEach(c => catById[c.id] = c);
    const nodeById = {}; s.nodes.forEach(n => nodeById[n.id] = n);
    const inhCat = (n) => { if (n.cat || n.main || !treeKid.has(n.id)) return null; let x = n, k = 0; const seen = new Set(); while (TIr.pe[x.id] && !seen.has(x.id)) { seen.add(x.id); x = nodeById[TIr.pe[x.id].from]; k++; if (!x || x.main) return null; if (x.cat && catById[x.cat]) return { c: catById[x.cat], k: k }; } return null; };
    const mqAll = this.mapMatches();
    this._cc = this._cc || new WeakMap();
    const content = (n) => { let c = this._cc.get(n); if (c) return c; const an = allNotes(n), w = countWords(an), tc = pagesOf(n).filter(p => (p.notes || '').trim()).length, rc = parseRefs(n.refs).length;
      c = { hasNotes: !!an.trim(), wordCount: w + (w === 1 ? ' word' : ' words'), tabCount: tc + (tc === 1 ? ' tab' : ' tabs'), refCount: rc, labelRich: richLabel(n.label || 'Untitled') }; this._cc.set(n, c); return c; };
    const nodes = s.nodes.filter(n => !ci.hidden.has(n.id)).map(n => {
      const sz = n.main ? { w: MW, h: MH } : { w: NW, h: NH };
      const cc = content(n);
      const kids = hasKidSet.has(n.id);
      const col = !!n.collapsed && kids;
      const sel = s.selNode === n.id || (s.multi || []).includes(n.id);
      const mq = mqAll, hit = mq && mq.set.has(n.id), curHit = hit && mq.ids[s.mapQIdx] === n.id;
      const ring = mq && hit ? '0 0 0 3px #f1f2f6, 0 0 0 ' + (curHit ? '6px #c98a12' : '5px #e5b84a') : sel ? '0 0 0 3px #f1f2f6, 0 0 0 5px ' + (((s.cats.find(c => c.id === n.cat) || {}).color) || ac) : (n.main ? '0 3px 14px rgba(42,39,36,.10)' : '0 2px 8px rgba(42,39,36,.06)');
      return {
        id: n.id,
        label: n.label || 'Untitled',
        boxRef: (el) => { this.els = this.els || {}; if (el) this.els[n.id] = el; },
        editing: s.editingId === n.id,
        showLabel: s.editingId !== n.id,
        editValue: n.label || '',
        editSize: Math.max(8, Math.min(n.main ? 30 : 28, (n.label || '').length + 1)),
        inputRef: (el) => { if (el && document.activeElement !== el) { el.focus(); el.select(); } },
        onEditChange: (ev) => this.patchNode(n.id, { label: ev.target.value }),
        onEditDone: () => { if (!(n.label || '').trim()) this.patchNode(n.id, { label: 'New topic' }); this.setState({ editingId: null }); },
        onEditKey: (ev) => {
          if (fmtKey(ev, n.label || '', (v) => this.patchNode(n.id, { label: v }))) return;
          if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey || ev.shiftKey)) { ev.preventDefault(); ev.stopPropagation(); insNL(ev, (v) => this.patchNode(n.id, { label: v })); return; }
          if (ev.key === 'Tab') { ev.preventDefault(); ev.stopPropagation(); ev.target.blur(); setTimeout(() => this.addLinked(n.id), 0); return; }
          if (ev.key === 'Enter' && !ev.shiftKey && this.state.editingId === n.id && (n.label || '').trim()) { ev.preventDefault(); ev.stopPropagation(); ev.target.blur(); this.setState({ selNode: n.id }); return; }
          if (ev.key === 'Enter' || ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); ev.target.blur(); }
        },
        labelRich: cc.labelRich,
        editRows: Math.max(1, (n.label || '').split('\n').length),
        sub: n.sub || '',
        showSub: s.hoverId === n.id && !!(n.sub || '').trim() && s.editingId !== n.id && !s.modalId,
        onEnter: (ev) => { if (ev.pointerType !== 'mouse' || !(n.sub || '').trim()) return; clearTimeout(this.hoverT); this.hoverT = setTimeout(() => { if (!this.drag) this.setState({ hoverId: n.id }); }, 1000); },
        onLeave: () => { clearTimeout(this.hoverT); if (this.state.hoverId === n.id) this.setState({ hoverId: null }); },
        onOpen: (ev) => { ev.stopPropagation(); clearTimeout(this.editT); this.setState({ modalId: n.id, tab: 'notes', notesEditing: false, editingId: null, selEdge: null }); },
        canCollapse: kids,
        collapseLabel: col ? '+' + (ci.counts[n.id] || 0) : '−',
        collapseTitle: col ? 'Expand downstream boxes' : 'Collapse downstream boxes',
        collapseDyn: (s.mobile ? 'height:30px;min-width:30px;right:-15px;bottom:-15px;font-size:14px;' : '') + (col ? 'background:' + ac + ';color:#fcfcfd;border-color:' + ac + ';min-width:22px;padding:0 6px;' : 'background:#fcfcfd;color:#7e8091;width:' + (s.mobile ? 30 : 22) + 'px;'),
        onCollapse: (ev) => { ev.stopPropagation(); this.patchNode(n.id, { collapsed: !col }); },
        hasNotes: cc.hasNotes,
        backCount: (() => { const c = this.backlinksOf(n.id).length; return c ? '↩ ' + c : ''; })(),
        backTitle: (() => { const c = this.backlinksOf(n.id).length; return 'Mentioned in ' + c + (c === 1 ? ' box' : ' boxes'); })(),
        twinN: n.twin ? this.twinsOf(n.id).length : 0,
        hasTwin: !!n.twin && this.twinsOf(n.id).length > 0,
        twinTitle: (() => { const c = n.twin ? this.twinsOf(n.id).length : 0; return 'Linked copy: same text in ' + (c + 1) + ' places. Click to go to the next one.'; })(),
        onTwin: (ev) => { ev.stopPropagation(); const all = s.nodes.filter(q => q.twin === n.twin); const i = all.findIndex(q => q.id === n.id); const nx = all[(i + 1) % all.length]; if (nx && nx.id !== n.id) this.jumpTo(nx.id); },
        wordCount: cc.wordCount,
        tabCount: cc.tabCount,
        refCount: cc.refCount,
        hasRefs: cc.refCount > 0,
        hasLink: !!(n.link && s.maps.some(m => m.id === n.link)),
        linkTitle: n.link ? ((s.maps.find(m => m.id === n.link) || {}).title || '') : '',
        onFollow: (ev) => { ev.stopPropagation(); this.goToMap(n.link); },
        dyn: (() => {
          const cat = s.cats.find(c => c.id === n.cat), ih = cat ? null : inhCat(n);
          const pct = ih ? Math.max(25, 62 - (ih.k - 1) * 14) : 0;
          const bg = cat ? cat.tint : ih ? 'color-mix(in oklab, ' + ih.c.tint + ' ' + pct + '%, #fcfcfd)' : '#fcfcfd';
          const bd = (n.main ? '2px solid ' : '1.5px solid ') + (cat ? cat.color : ih ? 'color-mix(in oklab, ' + ih.c.color + ' ' + (pct + 10) + '%, #fcfcfd)' : ac);
          const tf = this.textScale(), mf = 1 + (tf - 1) * 0.6;
          return 'left:' + n.x + 'px;top:' + n.y + 'px;width:max-content;min-width:' + sz.w + 'px;max-width:' + Math.round((n.main ? 380 : 320) * mf) + 'px;min-height:' + sz.h + 'px;overflow-wrap:anywhere;'
            + 'background:' + bg + ';border:' + bd + ';'
            + (n.main ? 'font-family:Karla,sans-serif;font-size:' + Math.round(18 * tf) + 'px;font-weight:600;' : 'font-family:Karla,sans-serif;font-size:' + Math.round(15 * tf) + 'px;')
            + 'box-shadow:' + ring + ';' + ((mq && !hit) || (focusId && !famN.has(n.id)) ? 'opacity:.3;' : '') + 'transition:opacity .2s;';
        })(),
        dotColor: (s.cats.find(c => c.id === n.cat) || {}).color || ac,
        handleDyn: 'background:#fcfcfd;border:1px solid ' + (s.linkFrom === n.id ? ac : '#d1d3de') + ';color:' + (s.linkFrom === n.id ? ac : '#7e8091') + ';' + (s.mobile ? 'width:34px;height:34px;right:-17px;margin-top:-17px;font-size:15px;' : ''),
        onDown: (ev) => {
          ev.stopPropagation();
          if (s.linkFrom && s.linkFrom !== n.id) { this.addEdge(s.linkFrom, n.id); this.setState({ linkFrom: null, linkPt: null }); return; }
          const ms = this.state.multi || [];
          if (ev.shiftKey || ev.ctrlKey || ev.metaKey || this.state.selectMode) {
            let cur = ms.length ? ms.slice() : (this.state.selNode ? [this.state.selNode] : []);
            cur = cur.includes(n.id) ? cur.filter(x => x !== n.id) : cur.concat([n.id]);
            this.setState({ multi: cur, selNode: cur.length === 1 ? cur[0] : null, selEdge: null, editingId: null });
            return;
          }
          if (ms.length > 1 && ms.includes(n.id)) {
            const set = new Set(ms);
            this.setState({ selEdge: null, editingId: null });
            this.drag = { type: 'node', id: n.id, sx: ev.clientX, sy: ev.clientY, nx: n.x, ny: n.y, moved: false, wasSel: false, group: this.state.nodes.filter(q => set.has(q.id)).map(q => ({ id: q.id, x: q.x, y: q.y })) };
            return;
          }
          const wasSel = this.state.selNode === n.id;
          this.setState({ selNode: n.id, selEdge: null, multi: [] });
          this.drag = { type: 'node', id: n.id, sx: ev.clientX, sy: ev.clientY, nx: n.x, ny: n.y, moved: false, wasSel: wasSel };
          if (ev.pointerType === 'touch') { clearTimeout(this.pressT); const dr = this.drag; this.pressT = setTimeout(() => { if (this.drag === dr && !dr.moved) { dr.pressed = true; clearTimeout(this.editT); this.setState({ modalId: n.id, tab: 'notes', notesEditing: false, editingId: null }); } }, 550); }
        },
        onLink: (ev) => { ev.stopPropagation(); if (ev.cancelable) ev.preventDefault(); try { window.getSelection().removeAllRanges(); } catch (er) {} document.body.style.userSelect = 'none'; document.body.style.webkitUserSelect = 'none'; this.setState({ linkFrom: n.id, linkPt: null, selNode: n.id }); }
      };
    });

    const tunnelLabels = [];
    edges.forEach(g => { if (!g.tunnelVis) return; [g.mA, g.mB].forEach((m, i) => {
      const tf = m.horiz ? (m.vx > 0 ? 'translate(10px,-50%)' : 'translate(calc(-100% - 10px),-50%)') : (m.vy > 0 ? 'translate(-50%,10px)' : 'translate(-50%,calc(-100% - 10px))');
      tunnelLabels.push({ key: g.id + '_' + i, label: m.label, go: m.go, dyn: 'left:' + m.x + 'px;top:' + m.y + 'px;transform:' + tf + ';opacity:' + g.opacity + ';' }); }); });
    let linkPreview = '';
    if (s.linkFrom && s.linkPt) {
      const a = s.nodes.find(n => n.id === s.linkFrom);
      if (a) { const sa = this.size(a); linkPreview = 'M ' + (a.x + sa.w / 2) + ' ' + (a.y + sa.h / 2) + ' L ' + s.linkPt.x + ' ' + s.linkPt.y; }
    }

    const se = edges.find(e => e.id === s.selEdge);
    const mNode = s.nodes.find(n => n.id === s.modalId);
    const tabStyle = (on) => on ? 'color:#2a2724;border-bottom:2px solid ' + ac + ';margin-bottom:-1px' : 'color:#7e8091;border-bottom:2px solid transparent;margin-bottom:-1px';

    const fmt = (t) => {
      if (!t) return '';
      const d = new Date(t), now = new Date();
      return d.toDateString() === now.toDateString()
        ? 'Today ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
    };
    const liveTitle = titleOf(s.nodes);
    const folders = s.folders || [];
    const fIds = new Set(folders.map(f => f.id));
    const fOf = (m) => (m.folder && fIds.has(m.folder)) ? m.folder : null;
    const endDrag = { dragMapFrom: null, dragFolderFrom: null, dragOver: null };
    const putMap = (mid, folder, beforeId) => {
      if (mid === beforeId) return;
      const maps = s.maps.slice();
      const i = maps.findIndex(x => x.id === mid); if (i < 0) return;
      const it = Object.assign({}, maps[i], { folder: folder || null });
      maps.splice(i, 1);
      let j = beforeId ? maps.findIndex(x => x.id === beforeId) : -1;
      if (j < 0) j = maps.length;
      maps.splice(j, 0, it);
      const fs = folder ? folders.map(f => f.id === folder ? Object.assign({}, f, { open: true }) : f) : folders;
      this.writeIndex(maps, s.currentId, fs);
      this.setState({ maps: maps, folders: fs });
    };
    const putFolder = (fid, beforeId) => {
      if (fid === beforeId) return;
      const fs = folders.slice(), i = fs.findIndex(f => f.id === fid); if (i < 0) return;
      const [it] = fs.splice(i, 1);
      let j = fs.findIndex(f => f.id === beforeId); if (j < 0) j = fs.length;
      fs.splice(j, 0, it);
      this.writeIndex(s.maps, s.currentId, fs);
      this.setState({ folders: fs });
    };
    const setFolders = (fs) => { this.writeIndex(s.maps, s.currentId, fs); this.setState({ folders: fs }); };
    const outline = 'outline:2px dashed ' + ac + ';outline-offset:-2px;';
    const mapRow = (m, indent) => {
      const on = m.id === s.currentId;
      const renaming = s.renamingMap === m.id;
      const dragOver = s.dragOver === 'm:' + m.id && (s.dragMapFrom ? s.dragMapFrom !== m.id : false);
      return {
        key: 'm' + m.id, isMap: true, isFolder: false, isZone: false,
        draggable: !renaming,
        onDragStart: (ev) => { ev.stopPropagation(); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', m.id); } catch (e) {} this.setState({ dragMapFrom: m.id, dragFolderFrom: null }); },
        onDragOver: (ev) => { if (!s.dragMapFrom) return; ev.preventDefault(); if (s.dragOver !== 'm:' + m.id) this.setState({ dragOver: 'm:' + m.id }); },
        onDrop: (ev) => { ev.preventDefault(); const f = this.state.dragMapFrom; this.setState(endDrag); if (f) putMap(f, fOf(m), m.id); },
        onDragEnd: () => this.setState(endDrag),
        id: m.id,
        renaming: renaming,
        notRenaming: !renaming,
        onStartRename: (ev) => { ev.stopPropagation(); this.setState({ renamingMap: m.id, renameDraft: on ? liveTitle : m.title }); },
        renameRef: (el) => { if (el && document.activeElement !== el) { el.focus(); el.select(); } },
        onRenameChange: (ev) => { const v = ev.target.value; this.setState({ renameDraft: v }); this.renameMap(m.id, v.trim() ? v : ''); },
        onRenameDone: () => { const v = (s.renameDraft || '').trim(); this.renameMap(m.id, v || 'Untitled map'); this.setState({ renamingMap: null, renameDraft: null }); },
        renameValue: renaming ? (s.renameDraft != null ? s.renameDraft : (on ? liveTitle : m.title)) : '',
        onRenameKey: (ev) => { if (ev.key === 'Enter' || ev.key === 'Escape') { ev.preventDefault(); ev.target.blur(); } },
        title: on ? liveTitle : m.title,
        meta: fmt(m.updated),
        // Each map is a card (tinted green, see Sidebar.jsx); the open map is white and outlined.
        dyn: (indent ? 'margin-left:14px;' : '') + (on ? 'background:#fcfcfd;border-color:' + ac + ';box-shadow:inset 3px 0 0 ' + ac + ',0 1px 4px rgba(42,39,36,.08);' : '') + (dragOver ? outline : '') + (s.dragMapFrom === m.id ? 'opacity:0.45;' : ''),
        titleDyn: on ? 'font-weight:600;' : 'font-weight:500;',
        onOpen: () => { if (this.state.mobile) this.setState({ sidebarOpen: false }); if (this.state.startOpen) this.setState({ startOpen: false }); if (on) return; const maps = this.saveNow(); this.openMap(m.id, maps); },
        onDelete: (ev) => {
          ev.stopPropagation();
          if (!window.confirm('Delete "' + (on ? liveTitle : m.title) + '"? This cannot be undone.')) return;
          try { localStorage.removeItem(mk(m.id)); } catch (err) {}
          let maps = s.maps.filter(x => x.id !== m.id);
          if (!maps.length) {
            const id = 'm' + Date.now();
            maps = [{ id: id, title: 'Main topic', updated: Date.now() }];
            this.openMap(id, maps);
          } else if (on) this.openMap(maps[0].id, maps);
          else { this.writeIndex(maps, s.currentId); this.setState({ maps: maps }); }
        }
      };
    };
    const rows = [];
    folders.forEach(f => {
      const inF = s.maps.filter(m => fOf(m) === f.id);
      const renaming = s.renamingFolder === f.id;
      const over = s.dragOver === 'f:' + f.id && (s.dragMapFrom || (s.dragFolderFrom && s.dragFolderFrom !== f.id));
      rows.push({
        key: 'f' + f.id, isFolder: true, isMap: false, isZone: false,
        fName: f.name || 'Untitled folder',
        fCount: inF.length ? String(inF.length) : '',
        fArrow: f.open === false ? '▸' : '▾',
        fClosed: f.open === false, fOpen: f.open !== false,
        fRenaming: renaming, fNotRenaming: !renaming,
        fRenameValue: renaming ? (s.folderDraft != null ? s.folderDraft : f.name) : '',
        fDraggable: !renaming,
        renameRef: (el) => { if (el && document.activeElement !== el) { el.focus(); el.select(); } },
        fDyn: (over ? outline : '') + (s.dragFolderFrom === f.id ? 'opacity:0.45;' : ''),
        onToggle: () => setFolders(folders.map(x => x.id === f.id ? Object.assign({}, x, { open: x.open === false }) : x)),
        onFStartRename: (ev) => { ev.stopPropagation(); this.setState({ renamingFolder: f.id, folderDraft: f.name || '' }); },
        onFRenameChange: (ev) => this.setState({ folderDraft: ev.target.value }),
        onFRenameDone: () => { const v = (this.state.folderDraft || '').trim() || 'Untitled folder'; setFolders(folders.map(x => x.id === f.id ? Object.assign({}, x, { name: v }) : x)); this.setState({ renamingFolder: null, folderDraft: null }); },
        onFRenameKey: (ev) => { if (ev.key === 'Enter' || ev.key === 'Escape') { ev.preventDefault(); ev.target.blur(); } },
        onFAdd: (ev) => { ev.stopPropagation(); this.createMap(f.id); },
        onFDelete: (ev) => {
          ev.stopPropagation();
          if (inF.length && !window.confirm('Delete folder "' + (f.name || 'Untitled folder') + '"? Its ' + inF.length + ' map' + (inF.length > 1 ? 's' : '') + ' will move out of the folder, not be deleted.')) return;
          const fs = folders.filter(x => x.id !== f.id);
          const maps = s.maps.map(m => m.folder === f.id ? Object.assign({}, m, { folder: null }) : m);
          this.writeIndex(maps, s.currentId, fs);
          this.setState({ maps: maps, folders: fs });
        },
        onFDragStart: (ev) => { ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', f.id); } catch (e) {} this.setState({ dragFolderFrom: f.id, dragMapFrom: null }); },
        onFDragOver: (ev) => { if (!s.dragMapFrom && !s.dragFolderFrom) return; ev.preventDefault(); if (s.dragOver !== 'f:' + f.id) this.setState({ dragOver: 'f:' + f.id }); },
        onFDrop: (ev) => { ev.preventDefault(); const st = this.state; this.setState(endDrag); if (st.dragMapFrom) putMap(st.dragMapFrom, f.id, null); else if (st.dragFolderFrom) putFolder(st.dragFolderFrom, f.id); },
        onDragEnd: () => this.setState(endDrag)
      });
      if (f.open !== false) inF.forEach(m => rows.push(mapRow(m, true)));
      if (f.open !== false && !inF.length) rows.push({ key: 'e' + f.id, isZone: true, isFolder: false, isMap: false, zoneText: 'Empty. Drag maps here.', zDyn: 'margin-left:14px;border-left:2px solid #cacdda;border-radius:0;font-style:italic;', onZOver: (ev) => { if (s.dragMapFrom) ev.preventDefault(); }, onZDrop: (ev) => { ev.preventDefault(); const fm = this.state.dragMapFrom; this.setState(endDrag); if (fm) putMap(fm, f.id, null); } });
    });
    const loose = s.maps.filter(m => !fOf(m));
    // Start page: every map as a card, by folder.
    let start = null;
    if (s.startOpen) {
      const sq = (s.startQ || '').trim().toLowerCase();
      const card = (m) => {
        const on = m.id === s.currentId, d = on ? { nodes: s.nodes } : (readJSON(mk(m.id)) || {}), title = on ? liveTitle : m.title;
        return { id: m.id, title: title || 'Untitled map', meta: fmt(m.updated), boxes: (d.nodes || []).length, current: on };
      };
      const match = (c) => !sq || c.title.toLowerCase().indexOf(sq) >= 0;
      const groups = folders.map(f => ({ id: f.id, name: f.name || 'Untitled folder', maps: s.maps.filter(m => fOf(m) === f.id).map(card).filter(match) })).filter(g => g.maps.length);
      const rest = loose.map(card).filter(match);
      if (rest.length) groups.push({ id: '', name: folders.length ? 'Not in a folder' : '', maps: rest });
      start = { groups: groups, query: s.startQ || '', count: s.maps.length, empty: !groups.length };
    }
    if (folders.length && (loose.length || s.dragMapFrom)) {
      const over = s.dragOver === 'z' && !!s.dragMapFrom;
      rows.push({ key: 'zone', isZone: true, isFolder: false, isMap: false, zoneText: 'Not in a folder', zDyn: 'margin-top:16px;border-top:1px solid #dcdee6;border-radius:0;padding-top:12px;text-transform:uppercase;letter-spacing:.05em;font-size:11px;' + (over ? outline : ''),
        onZOver: (ev) => { if (!s.dragMapFrom) return; ev.preventDefault(); if (s.dragOver !== 'z') this.setState({ dragOver: 'z' }); },
        onZDrop: (ev) => { ev.preventDefault(); const fm = this.state.dragMapFrom; this.setState(endDrag); if (fm) putMap(fm, null, null); } });
    }
    loose.forEach(m => rows.push(mapRow(m, false)));

    const q = s.query.trim().toLowerCase();
    let results = [];
    if (q) {
      const snip = (t) => { const i = t.toLowerCase().indexOf(q); if (i < 0) return ''; const a = Math.max(0, i - 30); return (a ? '…' : '') + t.slice(a, i + q.length + 50).replace(/\s+/g, ' ') + '…'; };
      this.allMapsData().forEach(m => {
        m.nodes.forEach(n => {
          const hay = [n.label || '', allNotes(n), allRefs(n)];
          if (!hay.some(h => h.toLowerCase().includes(q))) return;
          const where = (n.label || '').toLowerCase().includes(q) ? '' : snip(allNotes(n)) || snip(allRefs(n));
          results.push({ key: m.id + n.id, map: m.title, label: plain(n.label) || 'Untitled', snippet: where, hasSnippet: !!where, onOpen: () => { this.setState({ query: '' }); this.goToMap(m.id, n.id); } });
        });
        m.edges.forEach(e => {
          if (!(e.notes || '').toLowerCase().includes(q)) return;
          const a = m.nodes.find(n => n.id === e.from) || {}, b = m.nodes.find(n => n.id === e.to) || {};
          results.push({ key: m.id + e.id, map: m.title, label: (plain(a.label) || '?') + ' → ' + (plain(b.label) || '?'), snippet: snip(e.notes), hasSnippet: true, onOpen: () => { this.setState({ query: '' }); this.goToMap(m.id, e.from); } });
        });
      });
      results = results.slice(0, 60);
    }

    const usedCats = s.cats.filter(c => s.nodes.some(n => n.cat === c.id));
    const legend = usedCats.map(c => ({
      id: c.id, name: c.name, color: c.color,
      onRename: (ev) => this.setCats(s.cats.map(x => x.id === c.id ? Object.assign({}, x, { name: ev.target.value }) : x))
    }));

    const modalCats = mNode ? [{ id: null, name: 'None', color: '#d1d3de', tint: '#fcfcfd' }].concat(s.cats).map(c => ({
      id: c.id || 'none', name: c.name,
      swatch: 'background:' + c.tint + ';border:1.5px solid ' + c.color + ';' + (((mNode.cat || null) === c.id) ? 'box-shadow:0 0 0 2px #fcfcfd, 0 0 0 4px ' + c.color + ';' : ''),
      onPick: () => this.patchNode(mNode.id, { cat: c.id })
    })) : [];
    const linkOptions = mNode ? s.maps.filter(m => m.id !== s.currentId).map(m => ({ id: m.id, title: m.title })) : [];

    return {
      rows: rows,
      newFolder: () => {
        const id = 'f' + Date.now();
        setFolders(folders.concat([{ id: id, name: 'New folder', open: true }]));
        this.setState({ renamingFolder: id, folderDraft: 'New folder' });
      },
      query: s.query,
      onQuery: (ev) => this.setState({ query: ev.target.value }),
      clearQuery: () => this.setState({ query: '' }),
      mapSearchOpen: !!s.mapSearch, mapSearchClosed: !s.mapSearch,
      openMapSearch: () => this.openMapSearch(),
      closeMapSearch: () => this.setState({ mapSearch: false, mapQ: '', mapQIdx: null }),
      mapQRef: this.mapQRef,
      mapQ: s.mapQ || '',
      onMapQ: (ev) => this.setState({ mapQ: ev.target.value, mapQIdx: null }),
      onMapQKey: (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); this.mapQStep(ev.shiftKey ? -1 : 1); } else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.setState({ mapSearch: false, mapQ: '', mapQIdx: null }); } },
      mapQPrev: () => this.mapQStep(-1), mapQNext: () => this.mapQStep(1),
      mapQCount: (() => { const m = this.mapMatches(); if (!m) return ''; if (!m.ids.length) return '0'; return (s.mapQIdx == null ? '' : (s.mapQIdx + 1) + '/') + m.ids.length; })(),
      searching: !!q,
      notSearching: !q,
      results: results,
      noResults: !!q && !results.length,
      legend: legend,
      hasLegend: legend.length > 0,
      modalCats: modalCats,
      linkOptions: linkOptions,
      modalLinkValue: mNode ? (mNode.link && s.maps.some(m => m.id === mNode.link) ? mNode.link : '') : '',
      onLinkPick: (ev) => { const v = ev.target.value; if (v === '__new') this.mapFromNode(s.modalId); else this.patchNode(s.modalId, { link: v || null }); },
      modalHasLink: !!(mNode && mNode.link && s.maps.some(m => m.id === mNode.link)),
      followModalLink: () => this.goToMap(mNode.link),
      refsList: mNode ? parseRefs(mNode.refs).map((r, i) => ({ key: i, num: i + 1, text: r.text, href: r.href || '', isLink: !!r.href, isText: !r.href })) : [],
      isRefsTab: !!mNode && s.tab === 'refs',
      hasRefsList: !!mNode && s.tab === 'refs' && parseRefs(mNode.refs).length > 0,
      textareaH: (mNode && s.tab === 'refs' && parseRefs(mNode.refs).length) ? '120px' : (s.tab === 'notes' ? Math.max(300, s.notesEditH || 0) + 'px' : '300px'),
      textareaGrow: s.tab === 'notes' ? '1 0 auto' : 'none',
      onEdgeNotes: (ev) => this.patchEdge({ notes: ev.target.value }),
      exportOpen: !!s.exportOpen,
      toggleExport: () => this.setState({ exportOpen: !s.exportOpen }),
      expMapHtml: () => { this.setState({ exportOpen: false }); this.exportMap(); },
      expMapWord: () => this.exportDoc('word', 'map'),
      expMapPdf: () => this.exportDoc('pdf', 'map'),
      expAllWord: () => this.exportDoc('word', 'all'),
      expAllPdf: () => this.exportDoc('pdf', 'all'),
      backupAll: () => { this.setState({ exportOpen: false }); this.backupAll(); },
      restoreBackup: () => { this.setState({ exportOpen: false }); this.pickBackup(); },
      openAiImport: () => this.setState({ exportOpen: false, aiOpen: true, aiErr: '', aiCopied: false }),
      aiOpen: !!s.aiOpen, aiText: s.aiText || '', aiErr: s.aiErr || '',
      aiCopyLabel: s.aiCopied ? 'Copied' : 'Copy instructions for AI',
      onAiText: (ev) => this.setState({ aiText: ev.target.value, aiErr: '' }),
      closeAi: () => this.setState({ aiOpen: false }),
      pickAiFile: () => this.pickAiFile(),
      doAiImport: () => this.aiImport(),
      copyAiSpec: () => { const done = () => this.setState({ aiCopied: true }); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(AI_SPEC).then(done, () => { this.legacyCopy(AI_SPEC); done(); }); else { this.legacyCopy(AI_SPEC); done(); } },
      expBoxWord: () => this.exportDoc('word', 'box'),
      expBoxPdf: () => this.exportDoc('pdf', 'box'),
      sidebarOpen: s.sidebarOpen,
      sidebarClosed: !s.sidebarOpen,
      toggleSidebar: () => this.setState({ sidebarOpen: !s.sidebarOpen }),
      newMap: () => this.createMap(null),
      surfRef: this.surfRef,
      showGrid: this.props.showGrid !== false,
      tunnelLabels: tunnelLabels,
      worldRef: this.worldRef || (this.worldRef = React.createRef()),
      viewTransform: 'translate(' + s.tx + 'px,' + s.ty + 'px) scale(' + s.scale + ')',
      surfCursor: s.linkFrom || s.selectMode || s.frameMode ? 'crosshair' : 'grab',
      zoomLabel: Math.round(s.scale * 100) + '%',
      savedLabel: s.saved,
      nodes: nodes, edges: edges, linkPreview: linkPreview, hasLinkPreview: !!linkPreview,
      guides: (s.guides || []).map(g => Object.assign({}, g, { dash: g.solid ? 'none' : (4 / s.scale) + ' ' + (3 / s.scale), color: g.solid ? '#c0398a' : '#d0583f' })), guideW: 1 / s.scale,
      frames: (s.frames || []).map(f => {
        const c = FRAME_COLORS[f.color] || FRAME_COLORS.sage, sel = s.selFrame === f.id;
        const fr = {
          id: f.id, sel: sel, notSel: !sel, nameText: f.label || '', hasName: !!f.label && !sel, label: f.label || '',
          onBodyDown: (ev) => {
            if (s.linkFrom || s.frameMode || s.selectMode) return;
            if (this.state.selFrame === f.id) { fr.onDown(ev); return; }
            if (ev.shiftKey) return;
            ev.stopPropagation();
            this.setState({ selNode: null, selEdge: null, multi: [] });
            this.drag = { type: 'pan', sx: ev.clientX, sy: ev.clientY, tx: this.liveView().tx, ty: this.liveView().ty, moved: false, pickFrame: f.id };
          },
          dyn: 'left:' + f.x + 'px;top:' + f.y + 'px;width:' + f.w + 'px;height:' + f.h + 'px;background:' + c.bg + '99;border:1.5px solid ' + c.bd + ';' + (sel ? 'box-shadow:0 0 0 3px #f1f2f6,0 0 0 5px ' + c.bd + ';' : ''),
          inkDyn: 'color:' + c.ink + ';',
          barDyn: 'border:1px solid ' + c.bd + ';',
          onDown: (ev) => {
            ev.stopPropagation();
            this.setState({ selFrame: f.id, selNode: null, selEdge: null, multi: [], editingId: null });
            const inner = !ev.shiftKey ? [] : this.state.nodes.filter(n => { const z = this.boxOf(n), cx = n.x + z.w / 2, cy = n.y + z.h / 2; return cx > f.x && cx < f.x + f.w && cy > f.y && cy < f.y + f.h; }).map(n => ({ id: n.id, x: n.x, y: n.y }));
            this.drag = { type: 'frame', id: f.id, sx: ev.clientX, sy: ev.clientY, fx: f.x, fy: f.y, inner: inner, moved: false };
          },
          onResize: (ev) => { ev.stopPropagation(); this.drag = { type: 'frameSize', id: f.id, sx: ev.clientX, sy: ev.clientY, fw: f.w, fh: f.h, moved: false }; },
          onLabel: (ev) => this.patchFrame(f.id, { label: ev.target.value }),
          onLabelKey: (ev) => { ev.stopPropagation(); if (ev.key === 'Enter' || ev.key === 'Escape') ev.target.blur(); },
          labelSize: Math.max(14, (f.label || '').length + 2),
          inputDyn: 'color:' + c.ink + ';border-color:' + c.bd + ';',
          onDelete: (ev) => { ev.stopPropagation(); this.setState({ frames: (this.state.frames || []).filter(x => x.id !== f.id), selFrame: null }); },
          swatches: Object.keys(FRAME_COLORS).map(k => ({ key: k, dyn: 'background:' + FRAME_COLORS[k].bg + ';border:2px solid ' + (f.color === k || (!f.color && k === 'sage') ? FRAME_COLORS[k].ink : FRAME_COLORS[k].bd) + ';', onPick: (ev) => { ev.stopPropagation(); this.lastFrameColor = k; this.patchFrame(f.id, { color: k }); } }))
        };
        return fr;
      }),
      hasFrameDraft: !!s.frameDraft,
      fd: s.frameDraft ? { x: Math.min(s.frameDraft.x1, s.frameDraft.x2), y: Math.min(s.frameDraft.y1, s.frameDraft.y2), w: Math.abs(s.frameDraft.x2 - s.frameDraft.x1), h: Math.abs(s.frameDraft.y2 - s.frameDraft.y1) } : { x: 0, y: 0, w: 0, h: 0 },
      frameBtnDyn: s.frameMode ? 'background:#2f6f5e;color:#fcfcfd;border-color:#2f6f5e;' : 'background:#fcfcfd;color:#2a2724;',
      toggleFrame: () => this.setState({ frameMode: !s.frameMode, selectMode: false }),
      hasMarquee: !!s.marquee,
      mq: s.marquee ? { x: Math.min(s.marquee.x1, s.marquee.x2), y: Math.min(s.marquee.y1, s.marquee.y2), w: Math.abs(s.marquee.x2 - s.marquee.x1), h: Math.abs(s.marquee.y2 - s.marquee.y1) } : { x: 0, y: 0, w: 0, h: 0 },
      mqStroke: 1 / s.scale, mqDash: (5 / s.scale) + ' ' + (4 / s.scale),
      selectDyn: s.selectMode ? 'background:#2f6f5e;color:#fcfcfd;border-color:#2f6f5e;' : 'background:#fcfcfd;color:#2a2724;',
      toggleSelect: () => this.setState({ selectMode: !s.selectMode, frameMode: false }),
      multiCount: (s.multi || []).length, hasMulti: (s.multi || []).length > 1,
      multiLabel: (s.multi || []).length + ' boxes selected',
      deleteMulti: () => this.removeMany(s.multi || []),
      clearMulti: () => this.setState({ multi: [], selectMode: false }),
      refsOpen: !!s.refsOpen,
      refsDyn: s.mobile ? 'left:12px;right:12px;top:64px;bottom:12px;width:auto;' : '',
      start: start,
      openStart: () => { if (this.state.mobile) this.setState({ sidebarOpen: false }); this.setState({ startOpen: true, startQ: '', bookOpen: false, refsOpen: false, tidyOpen: false, exportOpen: false, selEdge: null, multi: [], editingId: null, modalId: null }); },
      closeStart: () => this.setState({ startOpen: false }),
      startQuery: (ev) => this.setState({ startQ: ev.target.value }),
      startOpenMap: (id) => { if (id !== this.state.currentId) { const maps = this.saveNow(); this.openMap(id, maps); } this.setState({ startOpen: false }); },
      startNewMap: () => { this.createMap(null); this.setState({ startOpen: false }); },
      book: s.bookOpen ? this.bookData() : null,
      openBook: () => this.setState({ bookOpen: true, refsOpen: false, tidyOpen: false, exportOpen: false, mapSearch: false, mapQ: '', mapQIdx: null, selEdge: null, multi: [], editingId: null, toolsOpen: false }),
      exportBook: () => { this.setState({ exportOpen: false }); this.exportBook(); },
      closeBook: () => this.setState({ bookOpen: false, bookEditId: null, bookTitleEdit: null, slash: null }),
      bookEdit: (id) => this.setState({ modalId: id, selNode: id, tab: 'notes', notesEditing: false, editingId: null, selEdge: null, bookEditId: null, bookTitleEdit: null }),
      // Editing in the notebook view: the same boxes as the map (patchNode), so
      // every change is on the map at once and is saved and synced as usual.
      bookEditId: s.bookOpen && !s.modalId ? s.bookEditId || null : null,
      bookTitleEdit: s.bookOpen && !s.modalId ? s.bookTitleEdit || null : null,
      bookStartEdit: (id) => { if (this.state.bookEditId !== id) { this.edNode = null; this.slashRange = null; } this.setState({ bookEditId: id, bookTitleEdit: null, selNode: id, slash: null }); },
      bookStopEdit: (id) => { if (this.state.bookEditId === id) this.setState({ bookEditId: null, slash: null }); },
      bookTitleStart: (id) => this.setState({ bookTitleEdit: id, bookEditId: null, selNode: id, slash: null }),
      bookTitleDone: (id) => { const n = this.state.nodes.find(x => x.id === id); if (n && !(n.label || '').trim()) this.patchNode(id, { label: 'New topic' }); if (this.state.bookTitleEdit === id) this.setState({ bookTitleEdit: null }); },
      bookLabel: (id, label) => this.patchNode(id, { label: label }),
      bookLabelKey: (id, ev) => {
        if (fmtKey(ev, (this.state.nodes.find(x => x.id === id) || {}).label || '', (val) => this.patchNode(id, { label: val }))) return;
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey || ev.shiftKey)) { ev.preventDefault(); insNL(ev, (val) => this.patchNode(id, { label: val })); return; }
        if (ev.key === 'Enter') { ev.preventDefault(); ev.target.blur(); }
      },
      bookSub: (id, sub) => this.patchNode(id, { sub: sub }),
      bookSetTab: (id, i) => {
        const n = this.state.nodes.find(x => x.id === id); if (!n || i === pageIdxOf(n)) return;
        const ps = pagesOf(n);
        if (this.edNode === id) this.edNode = null;
        this.patchNode(id, { pages: ps, pageIdx: i, notes: ps[i].notes, refs: ps[i].refs });
      },
      bookAdd: (parentId) => { const id = this.addChildPlaced(parentId); if (id) this.setState({ bookTitleEdit: id, bookEditId: null, bookFocus: { id: id, t: Date.now() } }); },
      bookFocus: s.bookFocus || null,
      // Order of a box's children in the notebook only (the map is not moved).
      bookReorder: (parentId, ids) => this.patchNode(parentId, { bookOrder: ids }),
      toggleRefs: () => this.setState({ refsOpen: !s.refsOpen, tidyOpen: false, exportOpen: false }),
      closeRefs: () => this.setState({ refsOpen: false }),
      refList: s.refsOpen ? this.mapRefList() : [],
      refEmpty: !!s.refsOpen && !this.mapRefList().length,
      refCountLabel: s.refsOpen ? this.mapRefList().length + ' references' : '',
      copyRefs: () => { const t = this.mapRefList().map((r, i) => (i + 1) + '. ' + r.text).join('\n'); try { navigator.clipboard.writeText(t); this.setState({ refsCopied: true }); setTimeout(() => this.setState({ refsCopied: false }), 1400); } catch (err) {} },
      copyRefsLabel: s.refsCopied ? 'Copied' : 'Copy list',

      onSurfaceDown: (ev) => {
        if (s.linkFrom) { this.setState({ linkFrom: null, linkPt: null }); return; }
        if (s.frameMode) {
          const p = this.world(ev);
          this.setState({ selEdge: null, selNode: null, selFrame: null, multi: [] });
          this.drag = { type: 'frameDraw', sx: ev.clientX, sy: ev.clientY, wx: p.x, wy: p.y, moved: false };
          return;
        }
        if (s.selFrame) this.setState({ selFrame: null });
        if (ev.shiftKey || s.selectMode) {
          const p = this.world(ev);
          this.setState({ selEdge: null, selNode: ev.shiftKey ? s.selNode : null });
          this.drag = { type: 'marquee', sx: ev.clientX, sy: ev.clientY, wx: p.x, wy: p.y, moved: false, add: ev.shiftKey };
          return;
        }
        this.drag = { type: 'pan', sx: ev.clientX, sy: ev.clientY, tx: this.liveView().tx, ty: this.liveView().ty, moved: false, clearSel: true };
      },
      onSurfaceDblClick: (ev) => { const p = this.world(ev); this.spawn(p.x - NW / 2, p.y - NH / 2); },
      addNode: () => {
        const r = this.surfRef.current.getBoundingClientRect();
        const cx = (r.width / 2 - s.tx) / s.scale, cy = (r.height / 2 - s.ty) / s.scale;
        this.spawn(cx - NW / 2 + (Math.random() * 120 - 60), cy - NH / 2 + (Math.random() * 120 - 60));
      },
      zoomIn: () => this.setState({ scale: Math.min(2.5, s.scale * 1.2) }),
      zoomOut: () => this.setState({ scale: Math.max(0.25, s.scale / 1.2) }),
      exportMap: () => this.exportMap(),
      undo: () => this.undo(),
      mobileMenuBtn: !!s.mobile && !s.sidebarOpen && !s.bookOpen && !s.startOpen,
      menuDot: s.syncUser ? '#2f6f5e' : '#b8863b',
      toolbarWrapDyn: s.mobile ? 'left:12px;top:64px;' : 'right:' + (usedCats.length ? 230 : 20) + 'px;',
      modalScrollRef: (el) => { this.modalScrollEl = el; },
      isMobile: !!s.mobile, notMobile: !s.mobile,
      mobileBackdrop: !!s.mobile && s.sidebarOpen,
      sidebarDyn: s.mobile ? 'position:fixed;left:0;top:0;bottom:0;z-index:31;width:min(86vw,320px);box-shadow:8px 0 30px rgba(42,39,36,.18);' : '',
      toolbarDyn: s.mobile ? 'width:auto;max-width:calc(100vw - 24px);flex-wrap:wrap;white-space:normal;' : 'width:auto;max-width:100%;flex-wrap:wrap;row-gap:6px;',
      toolsShown: !s.mobile || !!s.toolsOpen,
      toolsLabel: s.toolsOpen ? 'Tools ▴' : 'Tools ▾',
      toggleTools: () => this.setState({ toolsOpen: !s.toolsOpen, tidyOpen: false, exportOpen: false }),
      legendDyn: s.mobile ? 'top:auto;bottom:10px;right:10px;max-width:calc(100% - 20px);max-height:calc(100% - 140px);overflow-y:auto;box-sizing:border-box;' : '',
      edgePanelDyn: s.mobile ? 'left:12px;right:12px;bottom:12px;width:auto;' : (s.edgeRect ? (() => { const r = s.edgeRect, w = 'min(' + r.w + 'px,calc(100% - 24px))', h = 'min(' + r.h + 'px,calc(100% - 24px))'; return 'left:clamp(12px,' + r.x + 'px,calc(100% - ' + w + ' - 12px));top:clamp(12px,' + r.y + 'px,calc(100% - ' + h + ' - 12px));right:auto;bottom:auto;width:' + w + ';height:' + h + ';'; })() : 'max-height:calc(100% - 36px);overflow-y:auto;'),
      canFloat: !s.mobile,
      modalDrag: (ev) => this.floatStart(ev, 'modalRect', 'move'),
      modalResize: (ev) => this.floatStart(ev, 'modalRect', 'size'),
      modalReset: () => this.floatReset('modalRect'),
      edgeDrag: (ev) => this.floatStart(ev, 'edgeRect', 'move'),
      edgeResize: (ev) => this.floatStart(ev, 'edgeRect', 'size'),
      edgeReset: () => this.floatReset('edgeRect'),
      modalWrapDyn: s.mobile ? 'position:fixed;inset:0;z-index:40;padding:0;align-items:stretch;' : '',
      modalDyn: s.mobile ? 'width:100%;max-height:none;height:100%;border-radius:0;border:none;' : s.modalMax ? 'position:absolute;left:max(16px,2.5vw);right:max(16px,2.5vw);top:max(16px,3vh);bottom:max(16px,3vh);width:auto;height:auto;max-height:none;' : (s.modalRect ? (() => { const r = s.modalRect, w = 'min(' + r.w + 'px,100%)', h = 'min(' + r.h + 'px,100%)'; return 'position:absolute;left:clamp(0px,' + r.x + 'px,calc(100% - ' + w + '));top:clamp(0px,' + r.y + 'px,calc(100% - ' + h + '));width:' + w + ';height:' + h + ';max-height:none;'; })() : ''),
      modalMax: !!s.modalMax, modalNotMax: !s.modalMax,
      modalMaxTitle: s.modalMax ? 'Restore default size' : 'Expand to almost full screen',
      toggleModalMax: () => { const v = !this.state.modalMax; try { localStorage.setItem('visual-notebook.modalMax', v ? '1' : ''); } catch (err) {} if (!v) this.floatReset('modalRect'); this.setState({ modalMax: v }); },
      signedIn: !!s.syncUser, signedOut: !s.syncUser,
      syncEmail: s.syncUser ? s.syncUser.email : '',
      syncStatusLabel: s.syncStatus || 'Connecting…',
      syncDot: /error|Setup/i.test(s.syncStatus || '') ? '#b0544a' : (/Offline|Saving/.test(s.syncStatus || '') ? '#b8863b' : '#2f6f5e'),
      signOut: () => { try { localStorage.removeItem('visual-notebook.welcomeSkip'); } catch (err) {} this.setState({ welcomeSkip: false }); this.signOut(); },
      loginOpen: !!s.loginOpen, loginClosed: !s.loginOpen,
      showWelcome: !!s.authReady && !s.syncUser && !s.recovering && !s.welcomeSkip && !readJSON('visual-notebook.welcomeSkip'),
      welcomeIntro: s.signupMode ? 'Create an account to keep your maps in sync on your phone and computer.' : 'Log in to pick up your maps where you left off, on any device.',
      welcomeSwitch: s.signupMode ? 'I already have an account' : 'Create an account',
      skipWelcome: () => { try { localStorage.setItem('visual-notebook.welcomeSkip', 'true'); } catch (err) {} this.setState({ welcomeSkip: true, loginMsg: '' }); },
      openLogin: () => this.setState({ loginOpen: true, loginMsg: '' }),
      closeLogin: () => this.setState({ loginOpen: false, loginMsg: '' }),
      loginEmail: s.loginEmail || '',
      onLoginEmail: (ev) => this.setState({ loginEmail: ev.target.value }),
      onLoginKey: (ev) => { if (ev.key === 'Enter') this.passwordAuth(s.signupMode ? 'signup' : 'login'); },
      loginPw: s.loginPw || '',
      onLoginPw: (ev) => this.setState({ loginPw: ev.target.value }),
      pwAutocomplete: s.signupMode ? 'new-password' : 'current-password',
      loginPrimary: () => this.passwordAuth(s.signupMode ? 'signup' : 'login'),
      loginBtn: s.loginBusy ? 'Please wait…' : (s.signupMode ? 'Create account' : 'Log in'),
      loginIntro: s.signupMode ? 'Create an account to sync your notebook across devices.' : 'Log in to sync your notebook across devices.',
      switchLabel: s.signupMode ? 'I have an account' : 'Create account',
      toggleSignup: () => this.setState({ signupMode: !s.signupMode, loginMsg: '' }),
      forgotPw: () => this.passwordAuth('reset'),
      recovering: !!s.recovering,
      newPw: s.newPw || '',
      onNewPw: (ev) => this.setState({ newPw: ev.target.value }),
      setNewPassword: () => this.setNewPassword(),
      hasLoginMsg: !!s.loginMsg, loginMsg: s.loginMsg || '',
      helpOpen: !!s.helpOpen,
      helpLabel: s.helpOpen ? 'Hide tips' : '? Tips',
      toggleHelp: () => this.setState({ helpOpen: !s.helpOpen }),
      legendOpen: !!s.legendOpen,
      legendArrow: s.legendOpen ? '▴' : '▾',
      toggleLegend: () => this.setState({ legendOpen: !s.legendOpen }),
      legendDots: legend.slice(0, 5).map(c => React.createElement('i', { key: c.id, style: { width: 8, height: 8, borderRadius: 2, background: c.color, display: 'inline-block' } })),
      redo: () => this.redo(),
      undoDyn: this.undoStack.length ? 'opacity:1;cursor:pointer;' : 'opacity:.35;cursor:default;',
      redoDyn: this.redoStack.length ? 'opacity:1;cursor:pointer;' : 'opacity:.35;cursor:default;',
      tidyOpen: !!s.tidyOpen,
      toggleTidy: () => this.setState({ tidyOpen: !s.tidyOpen }),
      tidyRight: () => this.tidy('right'),
      tidyDown: () => this.tidy('down'),
      tidyBoth: () => this.tidy('both'),
      tidyRadial: () => this.tidy('radial'),
      tidyRandom: () => this.tidy('random', { stayOpen: true }),
      textSizes: [['Normal', 1], ['Large', 1.25], ['Larger', 1.5], ['Huge', 1.8]].map(([label, v]) => ({ label: label, dyn: this.textScale() === v ? 'background:#2f6f5e;color:#fcfcfd;border-color:#2f6f5e;' : 'background:#fcfcfd;color:#2a2724;', pick: () => { this._ts = v; try { localStorage.setItem('vn.textScale', String(v)); } catch (er) {} this.forceUpdate(); setTimeout(() => this.measure(), 30); } })),
      tunnelModes: [['Tunnel', 'on'], ['Full line', 'off']].map(([label, v]) => ({ label: label, dyn: (this._tun || 'on') === v ? 'background:#2f6f5e;color:#fcfcfd;border-color:#2f6f5e;' : 'background:#fcfcfd;color:#2a2724;', pick: () => { this._tun = v; try { localStorage.setItem('vn.tunnels', v); } catch (er) {} this.forceUpdate(); } })),
      xlinkModes: [['Normal', 'normal'], ['Subtle', 'subtle'], ['On select', 'select']].map(([label, v]) => ({ label: label, dyn: (s.xlinkMode || this._xm || 'normal') === v ? 'background:#2f6f5e;color:#fcfcfd;border-color:#2f6f5e;' : 'background:#fcfcfd;color:#2a2724;', pick: () => { this._xm = v; try { localStorage.setItem('vn.xlinkMode', v); } catch (er) {} this.setState({ xlinkMode: v }); } })),
      tidySpaces: [['Tight', 0.65], ['Normal', 1], ['Airy', 1.6]].map(([label, v]) => ({ label: label, dyn: (s.tidySpace || 1) === v ? 'background:#2f6f5e;color:#fcfcfd;border-color:#2f6f5e;' : 'background:#fcfcfd;color:#2a2724;', pick: () => this.setState({ tidySpace: v }, () => { const lt = this.lastTidy || { mode: 'both' }; this.tidy(lt.mode, { stayOpen: true, seed: lt.seed, noFit: true }); }) })),
      tidyShapeNote: this.lastTidy && this.lastTidy.mode === 'creative' && this._lastShape ? 'Shape: ' + this._lastShape + '. Click again for a new one.' : '',
      resetView: () => this.fitView(),

      selEdgeData: se ? {
        title: (se.titleA || '') + (se.both ? '  ↔  ' : '  →  ') + (se.titleB || ''),
        notes: se.notes,
        oneStyle: pill(!se.both), bothStyle: pill(se.both),
        thinStyle: pill(se.strength === 'thin'), thickStyle: pill(se.strength === 'thick'), dashedStyle: pill(se.strength === 'dashed'),
        swatches: ARROW_COLORS.map((c, i) => {
          const cur = (s.edges.find(x => x.id === s.selEdge) || {}).color || null;
          const on = cur === c;
          return { key: 'c' + i, title: c ? 'Arrow colour' : 'Default grey', onPick: () => this.patchEdge({ color: c }),
            dyn: 'background:' + (c || '#7e8091') + ';' + (on ? 'box-shadow:0 0 0 2px #fcfcfd, 0 0 0 4px ' + (c || '#7e8091') + ';' : '') };
        })
      } : false,
      setDirOne: () => this.patchEdge({ both: false }),
      setDirBoth: () => this.patchEdge({ both: true }),
      setThin: () => this.patchEdge({ strength: 'thin' }),
      setThick: () => this.patchEdge({ strength: 'thick' }),
      setDashed: () => this.patchEdge({ strength: 'dashed' }),
      deleteEdge: () => this.setState({ edges: s.edges.filter(e => e.id !== s.selEdge), selEdge: null }),

      modal: mNode ? {
        label: mNode.label,
        labelRows: Math.max(1, (mNode.label || '').split('\n').length),
        sub: mNode.sub || '',
        text: s.tab === 'notes' ? (mNode.notes || '') : (mNode.refs || ''),
        placeholder: s.tab === 'notes' ? 'In-depth notes on this topic…' : 'One reference per line — papers, links, page numbers…',
        notesTab: tabStyle(s.tab === 'notes'), refsTab: tabStyle(s.tab === 'refs')
      } : false,
      pageTabs: mNode ? pagesOf(mNode).map((p, i, arr) => { const act = i === pageIdxOf(mNode), ed = !!s.pageEdit && s.pageEdit.id === mNode.id && s.pageEdit.i === i; return { key: p.id, name: p.name, editing: ed, notEditing: !ed,
        style: (act ? 'background:#fffefb;color:#2f6f5e;font-weight:700;border:1px solid #dcdee6;border-top:1px solid #fffefb;border-bottom:3px solid #2f6f5e;' : 'background:#eceef3;color:#5e6072;font-weight:400;border:1px solid #dcdee6;') + (s.pageDrag && s.pageDrag.on && s.pageDrag.from === i ? 'opacity:.45;' : '') + (s.pageDrag && s.pageDrag.on && s.pageDrag.to === i && s.pageDrag.from !== i ? 'box-shadow:' + (s.pageDrag.to > s.pageDrag.from ? '3px' : '-3px') + ' 0 0 #2f6f5e;' : ''),
        idx: i, onDown: (ev) => this.pageDown(ev, i),
        canDelete: act && arr.length > 1, onPick: () => { if (this.pageDragged) { this.pageDragged = false; return; } this.setPage(i); }, onRename: () => this.setState({ pageEdit: { id: mNode.id, i: i }, pageName: p.name }),
        onDelete: (ev) => { ev.stopPropagation(); this.deletePage(i); } }; }) : [],
      pageName: s.pageName || '',
      onPageName: (ev) => this.setState({ pageName: ev.target.value }),
      onPageKey: (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); this.commitPageName(); } else if (ev.key === 'Escape') { ev.preventDefault(); this.setState({ pageEdit: null }); } },
      onPageBlur: () => this.commitPageName(),
      addPage: () => this.addPage(),
      themeFilter: s.dark ? 'invert(0.84) hue-rotate(180deg)' : 'none',
      themeLabel: s.dark ? 'Light mode' : 'Dark mode',
      toggleTheme: () => { const d = !s.dark; try { localStorage.setItem('visual-notebook.theme', d ? 'dark' : 'light'); } catch (err) {} document.documentElement.dataset.theme = d ? 'dark' : 'light'; this.setState({ dark: d }); },
      tabNotes: () => this.setState({ tab: 'notes' }),
      tabRefs: () => this.setState({ tab: 'refs' }),
      onSubChange: (ev) => this.patchNode(s.modalId, { sub: ev.target.value }),
      onLabelChange: (ev) => this.patchNode(s.modalId, { label: ev.target.value }),
      onLabelKey: (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); if (ev.ctrlKey || ev.metaKey || ev.shiftKey) insNL(ev, (v) => this.patchNode(s.modalId, { label: v })); return; } fmtKey(ev, mNode ? mNode.label || '' : '', (v) => this.patchNode(s.modalId, { label: v })); },
      notesRef: this.notesRef,
      notesView: false,
      notesEditBox: !!mNode && s.tab !== 'notes',
      isNotesTab: !!mNode && s.tab === 'notes',
      edPlaceholder: 'Write your notes… Type / to link to another box',
      slashOpen: !!(s.slash && mNode && s.tab === 'notes'),
      bookSlashOpen: !!(s.slash && !mNode && s.bookOpen && s.bookEditId),
      slashX: s.slash ? s.slash.x : 0,
      slashY: s.slash ? s.slash.y : 0,
      slashMouseDown: (ev) => ev.preventDefault(),
      slashEmpty: !!s.slash && !this.slashItems(s.slash.q).length,
      slashList: s.slash ? this.slashItems(s.slash.q).map((it, i) => ({ label: it.label, bg: i === (s.slashIdx || 0) ? '#e6efe9' : 'transparent', pick: (ev) => { ev.preventDefault(); this.slashPick(it.id); }, hover: () => { if ((this.state.slashIdx || 0) !== i) this.setState({ slashIdx: i }); } })) : [],
      edRef: (el) => { if (!el) return; if (el !== this.edEl) { this.edEl = el; this.edNode = null; el.addEventListener('pointerdown', (e) => { this.imgCaretOff(); if (!this.edResizeStart(e)) this.edImgDown(e); }, true); el.addEventListener('mousedown', (e) => { if (e.target.closest && (e.target.closest('[data-rz]') || e.target.closest('[data-img]'))) { e.preventDefault(); return; } if (this.edImgRight(e)) { e.preventDefault(); return; } this.edClickEnd(e); }); el.addEventListener('beforeinput', (e) => { if (this.imgCaret) { if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') { e.preventDefault(); this.imgCaretLine(); return; } if (/^insert/.test(e.inputType)) this.imgCaretLine(); } if ((e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') && !this.state.slash && this.edLiAt()) { if (e.inputType === 'insertLineBreak' && this.edShift) return; this.edEnter(e); } }); } this.syncEditor(); },
      onEdInput: () => { this.edAutoList(); this.edInput(); this.slashCheck(); },
      onEdBlur: (ev) => { this.imgCaretOff(); this.slashClose(); this.edBlur(ev); },
      onEdKey: (ev) => {
        if (this.imgCaret && this.imgCaretKey(ev)) return;
        if (this.state.slash) {
          const its = this.slashItems(this.state.slash.q), k = ev.key, i = this.state.slashIdx || 0;
          if (k === 'ArrowDown' || k === 'ArrowUp') { ev.preventDefault(); if (its.length) this.setState({ slashIdx: (i + (k === 'ArrowDown' ? 1 : its.length - 1)) % its.length }); return; }
          if ((k === 'Enter' || k === 'Tab') && its.length) { ev.preventDefault(); ev.stopPropagation(); this.slashPick(its[Math.min(i, its.length - 1)].id); return; }
          if (k === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.slashClose(); return; }
        } if (ev.key === 'Tab' && this.edIndent(ev)) return;
        this.edShift = ev.key === 'Enter' && ev.shiftKey;
        if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && this.edEnter(ev)) return;
        if (ev.key === 'Backspace' && this.edBack(ev)) return; if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); ev.target.blur(); } },
      onEdPaste: (ev) => this.edPaste(ev),
      onEdClick: (ev) => { const lk = ev.target.closest && ev.target.closest('span[data-link]'); if (lk) { ev.preventDefault(); this.refreshLabels(); if (links.openNode) links.openNode(lk.dataset.link); return; } this.slashCheck(); const a = ev.target.closest && ev.target.closest('a[href]'); if (a && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); window.open(a.href, '_blank', 'noopener'); } },
      backlinks: mNode ? (this.refreshLabels(), this.backlinksOf(mNode.id).map(b => ({ label: links.labels[b.id] || 'Untitled', open: () => links.openNode && links.openNode(b.id) }))) : [],
      hasBacklinks: !!mNode && s.tab === 'notes' && this.backlinksOf(mNode.id).length > 0,
      isNotesEditing: !!mNode && s.tab === 'notes',
      notesRich: mNode && s.tab === 'notes' ? (links.citeRefs = parseRefs(mNode.refs), this.refreshLabels(), richBlock(mNode.notes || '', mNode.images)) : null,
      citeOpen: !!s.citeOpen && s.tab === 'notes',
      citeText: s.citeText || '',
      onCiteText: (ev) => this.setState({ citeText: ev.target.value, citeMsg: '' }),
      onCiteKey: (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); this.addCitation(s.citeText); } if (ev.key === 'Escape') { ev.preventDefault(); this.setState({ citeOpen: false, citeText: '' }); } },
      openCite: (ev) => { ev.preventDefault(); this.edSaveRange(); const el = this.notesRef.current; this.citePos = el && document.contains(el) ? el.selectionEnd : (mNode ? (mNode.notes || '').length : 0); this.setState({ citeOpen: !s.citeOpen, citeText: '' }); },
      closeCite: () => this.setState({ citeOpen: false, citeText: '' }),
      citeAdd: () => this.addCitation(s.citeText),
      citeAddLabel: s.citeBusy ? 'Fetching…' : 'Add',
      citeMsg: s.citeMsg || '',
      refFetch: s.refFetch || '',
      refBtnLabel: s.refBusy ? 'Fetching…' : 'Fetch',
      refMsg: s.refMsg || '',
      onRefFetch: (ev) => this.setState({ refFetch: ev.target.value, refMsg: '' }),
      onRefFetchKey: (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); this.fetchRefToList(); } },
      doRefFetch: () => this.fetchRefToList(),
      shareOpen: !!s.shareOpen,
      shareUrl: s.shareUrl || '',
      shareNote: s.shareNote || '',
      shareCopyLabel: s.shareCopied ? 'Copied' : 'Copy link',
      shareMap: () => this.shareMap(),
      closeShare: () => this.setState({ shareOpen: false }),
      selectAll: (ev) => ev.target.select(),
      copyShare: () => { const u = this.state.shareUrl; if (!u) return; const done = () => this.setState({ shareCopied: true }); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, () => { window.prompt('Copy this link:', u); }); else window.prompt('Copy this link:', u); },
      citeExisting: mNode ? parseRefs(mNode.refs).map((r, i) => ({ num: i + 1, text: r.text, pick: () => this.insertCite(i + 1) })) : [],
      hasCiteExisting: !!mNode && parseRefs(mNode.refs).length > 0,
      citeShared: (() => {
        if (!mNode) return [];
        const own = {}; parseRefs(mNode.refs).forEach(r => { own[r.text.toLowerCase()] = 1; });
        const out = [], q = (s.citeText || '').trim().toLowerCase();
        s.nodes.forEach(n => { if (n.id === mNode.id) return; parseRefs(n.refs).forEach(r => { const k = r.text.toLowerCase(); if (own[k]) return; own[k] = 1; if (q && k.indexOf(q) < 0) return; out.push({ key: k, text: r.text, from: plain(n.label) || 'Untitled', pick: () => this.addCitation(r.text) }); }); });
        return out.slice(0, 30);
      })(),
      get hasCiteShared() { return this.citeShared.length > 0; },
      startNotesEdit: (ev) => { const h = ev && ev.currentTarget ? ev.currentTarget.offsetHeight : 0; this.focusNotes = true; this.setState({ notesEditing: true, notesEditH: h }); },
      notesAreaRef: (el) => { this.notesRef.current = el; if (el && this.focusNotes) { this.focusNotes = false; const fp = this.focusPos != null ? this.focusPos : el.value.length; this.focusPos = null; el.focus(); el.setSelectionRange(fp, fp); } },
      onNotesBlur: (ev) => { const rt = ev.relatedTarget; this.citePos = ev.target.selectionEnd; if (rt && rt.dataset && rt.dataset.fmt) return; if (s.tab === 'notes' && mNode) { const vv = vancouver(mNode.notes, mNode.refs); if (vv.notes !== (mNode.notes || '')) this.patchNode(mNode.id, vv); if (mNode.images) { const used = {}; (vv.notes || '').replace(/\[image:([a-z0-9]+)\]/gi, (m0, id) => { used[id] = 1; return m0; }); const keys = Object.keys(mNode.images); if (keys.some(k2 => !used[k2])) { const keep = {}; keys.forEach(k2 => { if (used[k2]) keep[k2] = mNode.images[k2]; }); setTimeout(() => this.patchNode(mNode.id, { images: keep }), 0); } } } if (s.tab === 'notes') this.setState({ notesEditing: false }); },
      onNotesKey: (ev) => { if (s.tab !== 'notes' || !mNode) return; if (fmtKey(ev, mNode.notes || '', (v) => this.patchNode(s.modalId, { notes: v }))) return;
        if (ev.key === 'Enter' && !ev.shiftKey) {
          const el = ev.target, val = mNode.notes || '', a = el.selectionStart;
          const ls = val.lastIndexOf('\n', a - 1) + 1, line = val.slice(ls, a), m = line.match(/^(\s*)[-•]\s/);
          if (m) {
            ev.preventDefault();
            let v, pos;
            if (!line.slice(m[0].length).trim()) { v = val.slice(0, ls) + val.slice(a); pos = ls; }
            else { v = val.slice(0, a) + '\n' + m[1] + '• ' + val.slice(el.selectionEnd); pos = a + 1 + m[1].length + 2; }
            this.patchNode(s.modalId, { notes: v });
            requestAnimationFrame(() => { try { el.setSelectionRange(pos, pos); } catch (e) {} });
            return;
          }
        } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); ev.target.blur(); } },
      fmtH1: (ev) => this.edCmd(ev, 'h1'),
      imgInputRef: (el) => { this.imgInput = el; },
      fmtImage: (ev) => { ev.preventDefault(); this.edSaveRange(); const el = this.notesRef.current; if (el && document.contains(el)) this.citePos = el.selectionEnd; else if (mNode) this.citePos = (mNode.notes || '').length; if (this.imgInput) { this.imgInput.value = ''; this.imgInput.click(); } },
      onImgFile: (ev) => { const fl = ev.target.files && ev.target.files[0]; if (fl) this.insertImageFile(fl); },
      onNotesPaste: (ev) => { const it = ev.clipboardData && Array.from(ev.clipboardData.items || []).find(x => x.kind === 'file' && /^image\//.test(x.type)); if (!it) { const txt = ev.clipboardData && ev.clipboardData.getData('text/plain'); if (txt && txt.indexOf('\n') >= 0) { const r = this.reflowText(txt); if (r !== txt) { ev.preventDefault(); document.execCommand('insertText', false, r); } } return; } ev.preventDefault(); this.citePos = ev.target.selectionEnd; this.insertImageFile(it.getAsFile()); },
      fmtH2: (ev) => this.edCmd(ev, 'h2'),
      fmtH3: (ev) => this.edCmd(ev, 'h3'),
      fmtBold: (ev) => this.edCmd(ev, 'bold'),
      fmtItalic: (ev) => this.edCmd(ev, 'italic'),
      fmtList: (ev) => this.edCmd(ev, 'list'),
      fmtOList: (ev) => this.edCmd(ev, 'olist'),
      onTextChange: (ev) => { if (s.tab === 'notes') { const h = ev.target.scrollHeight + 2; const up = {}; if (h > Math.max(300, s.notesEditH || 0)) up.notesEditH = h; if (!s.notesEditing) up.notesEditing = true; if (Object.keys(up).length) this.setState(up); } this.patchNode(s.modalId, s.tab === 'notes' ? { notes: ev.target.value } : { refs: ev.target.value }); },
      closeModal: () => this.setState({ modalId: null, pageEdit: null }),
      deleteNode: () => this.confirmRemove(s.modalId),
      makeTwin: () => this.makeTwin(s.modalId),
      modalTwinN: s.modalId ? this.twinsOf(s.modalId).length : 0,
      modalHasTwin: !!s.modalId && this.twinsOf(s.modalId).length > 0,
      modalTwinLabel: (() => { const c = s.modalId ? this.twinsOf(s.modalId).length : 0; return 'Linked to ' + c + (c === 1 ? ' other copy' : ' other copies'); })(),
      unTwin: () => this.unTwin(s.modalId),
      stop: (ev) => ev.stopPropagation()
    };
  }
}

Object.assign(NotebookLogic.prototype, syncMethods, shareMethods, exportMethods, aiMethods, layoutMethods, edgeMethods, editorMethods);
