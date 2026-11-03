// Import a mind map an AI wrote. Parsing and building are pure (parse.js,
// buildMap.js); these methods read the file and open the new map.
import { mk } from '../model/constants.js';
import { parseAiText } from './parse.js';
import { buildAiMap } from './buildMap.js';

export const aiMethods = {
  pickAiFile() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,.txt,.md,application/json,text/plain';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) f.text().then(t => this.setState({ aiText: t, aiErr: '' }, () => this.aiImport())).catch(() => this.setState({ aiErr: 'Could not read that file.' })); };
    inp.click();
  },
  aiParse(text) { return parseAiText(text); },
  aiImport() {
    const m = this.aiParse(this.state.aiText);
    if (!m || typeof m !== 'object') { this.setState({ aiErr: 'Could not read this file. Make sure it is the .json file the AI created.' }); return; }
    const base = Date.now(), el = this.surfRef.current;
    const built = buildAiMap(m, base, el ? el.getBoundingClientRect() : null);
    if (built.error) { this.setState({ aiErr: built.error }); return; }
    const title = built.title;
    const maps0 = this.saveNow(), id = 'm' + base;
    try { localStorage.setItem(mk(id), JSON.stringify(built.map)); }
    catch (err) { this.setState({ aiErr: 'Not enough storage space to save this map.' }); return; }
    this.undoStack = []; this.redoStack = [];
    this.setState({ aiOpen: false, aiText: '', aiErr: '' });
    this.openMap(id, [{ id: id, title: title, updated: base, folder: null }].concat(maps0));
    setTimeout(() => { if (this.state.currentId === id) { this.measure(); this.tidy('both'); setTimeout(() => { this.measure(); if (this.state.currentId === id) this.tidy('both'); }, 200); } }, 250);
  }
};
