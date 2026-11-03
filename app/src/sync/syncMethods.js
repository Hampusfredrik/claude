// Supabase sync: localStorage is the cache, every "visual-notebook.*" key is
// mirrored as a row in notebook_items (user_id, key, value, updated_at).
import { IDX, SYNC_META, SYNC_PREFIX, mk } from '../model/constants.js';
import { blankMap, loadCats, migrateCats, readJSON } from '../model/storage.js';
import { SB_KEY, SB_URL } from './config.js';
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
    const start = () => {
      if (!window.supabase || !window.supabase.createClient) return false;
      this.sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } });
      this.sb.auth.onAuthStateChange((ev, session) => {
        if (!this.state.authReady) this.setState({ authReady: true });
        if (ev === 'PASSWORD_RECOVERY') this.setState({ recovering: true, sidebarOpen: true });
        const u = session && session.user;
        const prev = this.state.syncUser && this.state.syncUser.id;
        this.setState({ syncUser: u ? { id: u.id, email: u.email } : null, syncStatus: u ? this.state.syncStatus : '' });
        if (u && prev !== u.id) setTimeout(() => this.pullAll(true), 0);
      });
      return true;
    };
    this.authFallback = setTimeout(() => { if (!this.state.authReady) this.setState({ authReady: true }); }, 4000);
    if (!start()) { let n = 0; this.sbWait = setInterval(() => { if (start() || ++n > 40) clearInterval(this.sbWait); }, 250); }
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
      const m = this.readMeta(), keys = Object.keys(m.dirty), uid = this.state.syncUser.id;
      if (m.user && m.user !== uid) { this.pushing = false; return; }
      const ups = [], dels = [];
      keys.forEach(k => { const v = window.localStorage.getItem(k); if (v == null) dels.push(k); else ups.push({ user_id: uid, key: k, value: v, updated_at: m.t[k] || Date.now() }); });
      if (ups.length) { const { error } = await this.sb.from('notebook_items').upsert(ups, { onConflict: 'user_id,key' }); if (error) throw error; }
      if (dels.length) { const { error } = await this.sb.from('notebook_items').delete().eq('user_id', uid).in('key', dels); if (error) throw error; }
      const m2 = this.readMeta();
      keys.forEach(k => { if (m2.dirty[k] === m.dirty[k]) delete m2.dirty[k]; if (window.localStorage.getItem(k) == null) delete m2.synced[k]; else m2.synced[k] = 1; });
      m2.user = uid; this.writeMeta(m2);
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
      const remote = {}; (data || []).forEach(row => remote[row.key] = row);
      let changed = false;
      if (!data.length && first) Object.keys(window.localStorage).filter(k => k.startsWith(SYNC_PREFIX)).forEach(k => { if (!m.dirty[k]) { m.t[k] = m.t[k] || Date.now(); m.dirty[k] = m.t[k]; } });
      Object.keys(remote).forEach(k => {
        const row = remote[k], lt = m.t[k] || 0;
        if (m.dirty[k] && lt >= row.updated_at) return;
        if (row.updated_at > lt || window.localStorage.getItem(k) == null) {
          if (window.localStorage.getItem(k) !== row.value) { this._rawSet(k, row.value); changed = true; }
          m.t[k] = row.updated_at; delete m.dirty[k]; m.synced[k] = 1;
        }
      });
      Object.keys(window.localStorage).filter(k => k.startsWith(SYNC_PREFIX)).forEach(k => {
        if (remote[k]) return;
        if (m.synced[k] && !m.dirty[k]) { this._rawRem(k); delete m.synced[k]; changed = true; }
        else if (!m.dirty[k]) { m.t[k] = m.t[k] || Date.now(); m.dirty[k] = m.t[k]; }
      });
      this.writeMeta(m);
      if (changed) this.reloadFromStorage();
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
  async passwordAuth(mode) {
    const email = (this.state.loginEmail || '').trim(), pw = this.state.loginPw || '';
    if (!/^\S+@\S+\.\S+$/.test(email)) { this.setState({ loginMsg: 'Enter a valid email address.' }); return; }
    if (!this.sb) { this.setState({ loginMsg: 'Could not reach the sync service. Check your connection.' }); return; }
    if (mode !== 'reset' && pw.length < 6) { this.setState({ loginMsg: 'Password must be at least 6 characters.' }); return; }
    this.setState({ loginBusy: true, loginMsg: '' });
    const redirect = window.location.origin + window.location.pathname;
    let res;
    if (mode === 'signup') res = await this.sb.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: redirect } });
    else if (mode === 'reset') res = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    else res = await this.sb.auth.signInWithPassword({ email: email, password: pw });
    let msg = '';
    if (res.error) msg = /confirm/i.test(res.error.message) ? 'Your email is not confirmed yet. Click the link in the confirmation email (on any device), then log in here.' : (/invalid login/i.test(res.error.message) ? 'Wrong email or password.' : res.error.message);
    else if (mode === 'signup') msg = res.data && res.data.session ? '' : 'Account created. Click the confirmation link we emailed you (phone is fine), then come back and log in here.';
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
