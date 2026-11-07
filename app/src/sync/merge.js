// Pure parts of the Supabase sync. localStorage is the local cache; every key
// that starts with "visual-notebook." is one row in notebook_items
// (user_id, key, value, updated_at in ms). The sync metadata lives in
// localStorage under "vn-sync.meta":
//   { t: { key: last change time }, dirty: { key: time of unpushed change },
//     synced: { key: 1 if the server has it }, user: user id }
//
// `local` is a view of localStorage: { keys(): all keys with the sync prefix,
// get(key): value or null }.

// Rows to upsert and keys to delete for the dirty keys.
export function pushPlan(meta, local, uid, now = Date.now) {
  const keys = Object.keys(meta.dirty), ups = [], dels = [];
  keys.forEach(k => { const v = local.get(k); if (v == null) dels.push(k); else ups.push({ user_id: uid, key: k, value: v, updated_at: meta.t[k] || now() }); });
  return { keys: keys, ups: ups, dels: dels };
}

// After a successful push: clear dirty flags that did not change meanwhile.
// `before` is the meta the push was planned from, `meta` the current one (mutated).
export function afterPush(meta, before, keys, local, uid) {
  keys.forEach(k => { if (meta.dirty[k] === before.dirty[k]) delete meta.dirty[k]; if (local.get(k) == null) delete meta.synced[k]; else meta.synced[k] = 1; });
  meta.user = uid;
  return meta;
}

// Merges the server rows into the local cache. Mutates and returns meta.
// - A server row wins when it is newer than the local copy (or the key is
//   missing locally), unless the local copy has a newer unpushed change.
// - A key the server does not have is deleted locally if it was synced before
//   and has no unpushed change; otherwise it is marked dirty so it gets pushed.
// - On the first pull for an account with no rows, everything local is pushed.
// - combine (optional) { key: (localValue, remoteValue) → merged value or null }:
//   for those keys, an unpushed local change and a different server value are
//   merged instead of one replacing the other; the result is kept and pushed.
// Returns { meta, sets: [[key, value]], removes: [key], changed }.
export function mergePull(meta, rows, local, first, now = Date.now, combine) {
  const m = meta, sets = [], removes = [], written = {};
  const get = (k) => (k in written ? written[k] : local.get(k));
  const remote = {}; (rows || []).forEach(row => remote[row.key] = row);
  let changed = false;
  if (!rows.length && first) local.keys().forEach(k => { if (!m.dirty[k]) { m.t[k] = m.t[k] || now(); m.dirty[k] = m.t[k]; } });
  Object.keys(remote).forEach(k => {
    const row = remote[k], lt = m.t[k] || 0;
    const comb = combine && combine[k];
    if (comb && m.dirty[k] && get(k) != null && get(k) !== row.value) {
      const merged = comb(get(k), row.value);
      if (merged != null) {
        if (merged !== get(k)) { sets.push([k, merged]); written[k] = merged; changed = true; }
        m.t[k] = Math.max(now(), row.updated_at + 1); m.dirty[k] = m.t[k]; m.synced[k] = 1;
        return;
      }
    }
    if (m.dirty[k] && lt >= row.updated_at) return;
    if (row.updated_at > lt || get(k) == null) {
      if (get(k) !== row.value) { sets.push([k, row.value]); written[k] = row.value; changed = true; }
      m.t[k] = row.updated_at; delete m.dirty[k]; m.synced[k] = 1;
    }
  });
  local.keys().forEach(k => {
    if (remote[k]) return;
    if (m.synced[k] && !m.dirty[k]) { removes.push(k); delete m.synced[k]; changed = true; }
    else if (!m.dirty[k]) { m.t[k] = m.t[k] || now(); m.dirty[k] = m.t[k]; }
  });
  return { meta: m, sets: sets, removes: removes, changed: changed };
}

// Merges two map lists ("visual-notebook.index" values, as JSON text): every
// map and folder from both is kept. For a map in both, the server's entry is
// used, with the newer title, and a folder from either side if the other has
// none. Folders are matched by id. Returns JSON text, or null if unreadable.
export function mergeIndex(localText, remoteText) {
  let L, R;
  try { L = JSON.parse(localText); R = JSON.parse(remoteText); } catch (e) { return null; }
  if (!L || !R || !Array.isArray(L.maps) || !Array.isArray(R.maps)) return null;
  const maps = R.maps.map(m => Object.assign({}, m)), byId = new Map(maps.map(m => [m.id, m]));
  L.maps.forEach(lm => {
    const r = byId.get(lm.id);
    if (!r) { const c = Object.assign({}, lm); maps.push(c); byId.set(c.id, c); return; }
    if ((lm.updated || 0) > (r.updated || 0)) { if (lm.title) r.title = lm.title; r.updated = lm.updated; }
    if (!r.folder && lm.folder) r.folder = lm.folder;
  });
  const folders = (R.folders || []).map(f => Object.assign({}, f)), fids = new Set(folders.map(f => f.id));
  (L.folders || []).forEach(f => { if (!fids.has(f.id)) { folders.push(Object.assign({}, f)); fids.add(f.id); } });
  maps.forEach(m => { if (m.folder && !fids.has(m.folder)) m.folder = null; });
  const current = byId.has(L.current) ? L.current : R.current;
  return JSON.stringify({ maps: maps, current: current, folders: folders });
}
