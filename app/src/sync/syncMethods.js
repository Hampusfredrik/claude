// Supabase sync: localStorage is the cache, every "visual-notebook.*" key is
// mirrored as a row in notebook_items (user_id, key, value, updated_at).
import { IDX, SYNC_META, SYNC_PREFIX, mk } from '../model/constants.js';
import { blankMap, findUnlistedMaps, loadCats, migrateCats, readJSON } from '../model/storage.js';
import { createClient } from '@supabase/supabase-js';
import { SB_KEY, SB_URL } from './config.js';
import { pushPlan, afterPush, mergePull, mergeIndex } from './merge.js';
// localStorage seen through the sync prefix (see merge.js).
const localView = () => ({
  keys: () => Object.keys(window.localStorage).filter(k => k.startsWith(SYNC_PREFIX)),
  get: (k) => window.localStorage.getItem(k)
});

export const syncMethods = {
  readMeta() { try { return JSON.parse(window.localStorage.getItem(SYNC_META)) || { t: {}, dirty: {}, synced: {} }; } catch (e) { return { t: {}, dirty: {}, synced: {} }; } },
  writeMeta(m) { try { this._rawSet(SYNC_META, JSON.stringify(m)); } catch (e) {} },
  initSync() {
    const ls = window.localStorage, proto = Object.getPrototypeOf(ls);
    if (!window.__vnPatched) {
      window.__vnPatched = true;
      const set = proto.setItem, rem = proto.removeItem;
      window.__vnRawSet = (k, v) => set.call(ls, k, v);
      window.__vnRawRem = (k) => rem.call(ls, k);
      proto.setItem = function (k, v) { set.call(this, k, v); if (this === ls && window.__vnOnWrite && String(k).startsWith(SYNC_PREFIX)) window.__vnOnWrite(k); };
      proto.removeItem = function (k) { rem.call(this, k); if (this === ls && window.__vnOnWrite && String(k).startsWith(SYNC_PREFIX)) window.__vnOnWrite(k); };
    }
    this._rawSet = window.__vnRawSet; this._rawRem = window.__vnRawRem;
    window.__vnOnWrite = (k) => {
      const m = this.readMeta(); const t = Date.now();
      m.t[k] = t; m.dirty[k] = t; this.writeMeta(m);
      clearTimeout(this.pushT); this.pushT = setTimeout(() => this.pushDirty(), 1500);
      if (this.state.syncUser && this.state.syncStatus !== 'Saving…') this.setState({ syncStatus: 'Saving…' });
    };
    // An invitation link from Supabase signs the person in (#...type=invite);
    // they then choose a password, like after a password-reset link.
    let invited = /(^|[#&])type=invite(&|$)/.test(location.hash);
    const start = () => {
      this.sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } });
      this.sb.auth.onAuthStateChange((ev, session) => {
        if (!this.state.authReady) this.setState({ authReady: true });
        if (ev === 'PASSWORD_RECOVERY') this.setState({ recovering: true, recoverKind: 'reset', sidebarOpen: true });
        if (invited && session) { invited = false; this.setState({ recovering: true, recoverKind: 'invite', sidebarOpen: true }); }
        const u = session && session.user;
        const prev = this.state.syncUser && this.state.syncUser.id;
        this.setState({ syncUser: u ? { id: u.id, email: u.email } : null, syncStatus: u ? this.state.syncStatus : '' });
        if (u && prev !== u.id) setTimeout(() => this.pullAll(true), 0);
      });
    };
    this.authFallback = setTimeout(() => { if (!this.state.authReady) this.setState({ authReady: true }); }, 4000);
    start();
    this.onFocusSync = () => { if (document.visibilityState === 'visible' && this.state.syncUser) this.pullAll(false); };
    document.addEventListener('visibilitychange', this.onFocusSync);
    window.addEventListener('online', () => { if (this.state.syncUser) { this.pushDirty(); this.pullAll(false); } });
    this.syncTimer = setInterval(() => { if (this.state.syncUser && document.visibilityState === 'visible') this.pullAll(false); }, 60000);
  },
  async pushDirty() {
    if (!this.sb || !this.state.syncUser || this.pushing) return;
    if (!navigator.onLine) { this.setState({ syncStatus: 'Offline · will sync later' }); return; }
    this.pushing = true;
    try {
      const m = this.readMeta(), uid = this.state.syncUser.id;
      if (m.user && m.user !== uid) { this.pushing = false; return; }
      const { keys, ups, dels } = pushPlan(m, localView(), uid);
      if (ups.length) { const { error } = await this.sb.from('notebook_items').upsert(ups, { onConflict: 'user_id,key' }); if (error) throw error; }
      if (dels.length) { const { error } = await this.sb.from('notebook_items').delete().eq('user_id', uid).in('key', dels); if (error) throw error; }
      const m2 = afterPush(this.readMeta(), m, keys, localView(), uid);
      this.writeMeta(m2);
      this.setState({ syncStatus: 'Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      if (Object.keys(m2.dirty).length) { clearTimeout(this.pushT); this.pushT = setTimeout(() => this.pushDirty(), 1500); }
    } catch (err) {
      this.setState({ syncStatus: /relation|does not exist|schema cache/i.test(err.message || '') ? 'Setup needed: run the SQL in Supabase' : 'Sync error · retrying' });
      clearTimeout(this.pushT); this.pushT = setTimeout(() => this.pushDirty(), 15000);
    }
    this.pushing = false;
  },
  async pullAll(first) {
    if (!this.sb || !this.state.syncUser || this.pulling || !navigator.onLine) return;
    this.pulling = true;
    try {
      const uid = this.state.syncUser.id;
      const { data, error } = await this.sb.from('notebook_items').select('key,value,updated_at').eq('user_id', uid);
      if (error) throw error;
      let m = this.readMeta();
      if (m.user && m.user !== uid) {
        const keep = window.confirm('This browser has maps from a different account. Copy them into ' + (this.state.syncUser.email || 'this account') + ' as well?\n\nOK = copy them in · Cancel = replace them with this account\'s maps');
        if (!keep) Object.keys(window.localStorage).filter(k => k.startsWith(SYNC_PREFIX)).forEach(k => this._rawRem(k));
        m = { t: {}, dirty: {}, synced: {}, user: uid };
        if (keep) Object.keys(window.localStorage).filter(k => k.startsWith(SYNC_PREFIX)).forEach(k => { m.t[k] = Date.now(); m.dirty[k] = m.t[k]; });
      }
      m.user = uid;
      // The map list is merged, not replaced: a device that started with empty
      // storage must never hide maps or folders that are in the account. Its own
      // untouched placeholder map ("Main topic", nothing else) is dropped then.
      const dropped = [];
      const combine = { [IDX]: (localText, remoteText) => {
        let L, R; try { L = JSON.parse(localText); R = JSON.parse(remoteText); } catch (e) { return null; }
        if (!L || !R || !Array.isArray(L.maps) || !Array.isArray(R.maps) || !R.maps.length) return mergeIndex(localText, remoteText);
        const inRemote = new Set(R.maps.map(x => x.id));
        const blank = (d) => !!d && Array.isArray(d.nodes) && d.nodes.length === 1 && !(d.edges || []).length && !(d.frames || []).length && d.nodes[0].label === 'Main topic' && !d.nodes[0].notes && !d.nodes[0].refs && !d.nodes[0].pages;
        L.maps.forEach(x => { if (!inRemote.has(x.id) && blank(readJSON(mk(x.id)))) dropped.push(x.id); });
        return mergeIndex(JSON.stringify(Object.assign({}, L, { maps: L.maps.filter(x => dropped.indexOf(x.id) < 0) })), remoteText);
      } };
      const r = mergePull(m, data, localView(), first, Date.now, combine);
      r.sets.forEach(([k, v]) => this._rawSet(k, v));
      r.removes.forEach(k => this._rawRem(k));
      dropped.forEach(id => { this._rawRem(mk(id)); delete m.dirty[mk(id)]; delete m.t[mk(id)]; delete m.synced[mk(id)]; });
      const changed = r.changed;
      this.writeMeta(m);
      // Put maps back in the list if they are stored but not listed (see findUnlistedMaps).
      const idx = readJSON(IDX), lost = findUnlistedMaps(Object.keys(window.localStorage), idx, readJSON, (k) => m.t[k]);
      if (idx && idx.maps && lost.length) { window.localStorage.setItem(IDX, JSON.stringify(Object.assign({}, idx, { maps: idx.maps.concat(lost) }))); this.reloadFromStorage(); }
      else if (changed) this.reloadFromStorage();
      this.setState({ syncStatus: 'Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      if (Object.keys(m.dirty).length) this.pushDirty();
    } catch (err) {
      this.setState({ syncStatus: /relation|does not exist|schema cache/i.test(err.message || '') ? 'Setup needed: run the SQL in Supabase' : 'Sync error · ' + (err.message || '').slice(0, 40) });
    }
    this.pulling = false;
  },
  reloadFromStorage() {
    const idx = readJSON(IDX);
    if (!idx || !idx.maps || !idx.maps.length) return;
    const cur = idx.maps.some(m => m.id === this.state.currentId) ? this.state.currentId : (idx.maps.some(m => m.id === idx.current) ? idx.current : idx.maps[0].id);
    const d = readJSON(mk(cur)) || blankMap();
    this.restoring = true;
    this.histPrev = null;
    this.suppressSave = true;
    this.setState({ maps: idx.maps, folders: idx.folders || [], currentId: cur, nodes: d.nodes || [], edges: d.edges || [], frames: d.frames || [], cats: d.cats ? migrateCats(d.cats) : loadCats(), selNode: null, selEdge: null, editingId: null, modalId: null });
  },
  // mode: 'login' or 'reset'. There is no sign-up: accounts are invited in Supabase.
  async passwordAuth(mode) {
    const email = (this.state.loginEmail || '').trim(), pw = this.state.loginPw || '';
    if (!/^\S+@\S+\.\S+$/.test(email)) { this.setState({ loginMsg: 'Enter a valid email address.' }); return; }
    if (!this.sb) { this.setState({ loginMsg: 'Could not reach the sync service. Check your connection.' }); return; }
    if (mode !== 'reset' && pw.length < 6) { this.setState({ loginMsg: 'Password must be at least 6 characters.' }); return; }
    this.setState({ loginBusy: true, loginMsg: '' });
    const redirect = window.location.origin + window.location.pathname;
    let res;
    if (mode === 'reset') res = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    else res = await this.sb.auth.signInWithPassword({ email: email, password: pw });
    let msg = '';
    if (res.error) msg = /confirm/i.test(res.error.message) ? 'Your email is not confirmed yet. Click the link in the confirmation email (on any device), then log in here.' : (/invalid login/i.test(res.error.message) ? 'Wrong email or password.' : res.error.message);
    else if (mode === 'reset') msg = 'We emailed you a link to set a new password. Open it on this computer.';
    this.setState({ loginBusy: false, loginMsg: msg, loginPw: res.error ? pw : '', loginOpen: !!msg || !!res.error });
  },
  async setNewPassword() {
    const pw = this.state.newPw || '';
    if (pw.length < 6) { this.setState({ loginMsg: 'Password must be at least 6 characters.' }); return; }
    const { error } = await this.sb.auth.updateUser({ password: pw });
    this.setState({ recovering: !!error, loginMsg: error ? error.message : 'Password updated.', newPw: '' });
  },
  async signOut() {
    if (!this.sb) return;
    await this.pushDirty();
    await this.sb.auth.signOut();
    this.setState({ syncUser: null, syncStatus: '', accountOpen: false });
  }
};
