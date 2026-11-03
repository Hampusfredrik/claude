// Export to Word (.doc), PDF and HTML, plus backup/restore of everything.
// Document building is pure (docTree, docHtml, docBlocks, word, pdf); these
// methods collect the data and download the files.
import { DEFAULT_CATS, IDX, SYNC_META, SYNC_PREFIX, mk } from '../model/constants.js';
import { readJSON, titleOf } from '../model/storage.js';
import { docTree, docTrees } from './docTree.js';
import { docHtml } from './docHtml.js';
import { docBlocks } from './docBlocks.js';
import { wordMhtml } from './word.js';
import { renderPdf } from './pdf.js';
export const exportMethods = {
  exportMap() {
    const D = this.mapViewData(true), title = D.title;
    const html = this.viewerHtml(D, false);
    const name = (title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'map') + '.html';
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this.setState({ saved: 'Exported ' + name });
    } catch (err) { window.alert('Export failed: ' + err.message); }
  },
  docMaps(all) {
    const s = this.state;
    const list = all ? this.allMapsData() : [{ id: s.currentId, title: titleOf(s.nodes), nodes: s.nodes, edges: s.edges }];
    return list.map(m => Object.assign({}, m, { cats: m.id === s.currentId ? s.cats : ((readJSON(mk(m.id)) || {}).cats || DEFAULT_CATS) }));
  },
  docTree(nodes, edges, mi, multi) { return docTree(nodes, edges, mi, multi); },
  docTrees(maps) { return docTrees(maps); },
  docHtml(maps, single) { this.refreshLabels(); return docHtml(maps, single); },
  exportDoc(kind, scope) {
    this.setState({ exportOpen: false });
    const s = this.state;
    let doc;
    if (scope === 'box') { const n = s.nodes.find(x => x.id === s.modalId); if (!n) return; doc = this.docHtml(this.docMaps(false), n); }
    else doc = this.docHtml(this.docMaps(scope === 'all'), null);
    const base = doc.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'notebook';
    if (kind === 'word') {
      const mh = wordMhtml(doc.html);
      const blob = new Blob([mh], { type: 'application/msword' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = base + '.doc'; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this.setState({ saved: 'Exported ' + base + '.doc' });
      return;
    }
    this.exportPdf(scope, base).catch(err => window.alert('PDF export failed: ' + err.message));
  },
  loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      sc.onload = () => res(window.jspdf.jsPDF);
      sc.onerror = () => rej(new Error('Could not load the PDF tool. Check your connection.'));
      document.head.appendChild(sc);
    });
  },
  docBlocks(maps, single) { this.refreshLabels(); return docBlocks(maps, single); },
  async exportPdf(scope, base) {
    const s = this.state;
    let d;
    if (scope === 'box') { const n = s.nodes.find(x => x.id === s.modalId); if (!n) return; d = this.docBlocks(this.docMaps(false), n); }
    else d = this.docBlocks(this.docMaps(scope === 'all'), null);
    this.setState({ saved: 'Preparing PDF…' });
    const PDF = await this.loadJsPdf();
    const doc = renderPdf(PDF, d);
    doc.save(base + '.pdf');
    this.setState({ saved: 'Exported ' + base + '.pdf' });
  },
  backupAll() {
    this.saveNow();
    const items = {};
    Object.keys(window.localStorage).filter(k => k.startsWith(SYNC_PREFIX) && k !== SYNC_META).forEach(k => { items[k] = window.localStorage.getItem(k); });
    const d = new Date(), stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const blob = new Blob([JSON.stringify({ app: 'visual-notebook', version: 1, created: d.toISOString(), maps: (this.state.maps || []).length, items: items })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'notebook-backup-' + stamp + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    this.setState({ saved: 'Backup downloaded' });
  },
  legacyCopy(t) { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); },
  pickBackup() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) f.text().then(t => this.restoreBackup(t)).catch(() => window.alert('Could not read that file.')); };
    inp.click();
  },
  restoreBackup(text) {
    let b; try { b = JSON.parse(text); } catch (err) { b = null; }
    if (!b || b.app !== 'visual-notebook' || !b.items) { window.alert('That file is not a notebook backup.'); return; }
    let bi; try { bi = JSON.parse(b.items[IDX] || 'null'); } catch (err) { bi = null; }
    const bMaps = (bi && bi.maps) || [];
    if (!window.confirm('Restore ' + bMaps.length + ' map' + (bMaps.length === 1 ? '' : 's') + ' from this backup?\n\nMaps in the backup replace their current versions. Maps you have made since the backup are kept.')) return;
    this.saveNow();
    const cur = readJSON(IDX) || { maps: this.state.maps, folders: this.state.folders };
    Object.keys(b.items).forEach(k => { if (k !== IDX && k !== SYNC_META && k.startsWith(SYNC_PREFIX)) { try { window.localStorage.setItem(k, b.items[k]); } catch (err) {} } });
    const maps = bMaps.concat((cur.maps || []).filter(m => !bMaps.some(x => x.id === m.id)));
    const bf = (bi && bi.folders) || [], folders = bf.concat((cur.folders || []).filter(f => !bf.some(x => x.id === f.id)));
    const id = maps.some(m => m.id === this.state.currentId) ? this.state.currentId : (maps[0] && maps[0].id);
    this.undoStack = []; this.redoStack = [];
    this.setState({ folders: folders }, () => { if (id) this.openMap(id, maps); this.writeIndex(maps, id, folders); this.setState({ saved: 'Backup restored' }); });
  }
};
