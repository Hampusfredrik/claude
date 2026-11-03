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
// Returns { meta, sets: [[key, value]], removes: [key], changed }.
export function mergePull(meta, rows, local, first, now = Date.now) {
  const m = meta, sets = [], removes = [], written = {};
  const get = (k) => (k in written ? written[k] : local.get(k));
  const remote = {}; (rows || []).forEach(row => remote[row.key] = row);
  let changed = false;
  if (!rows.length && first) local.keys().forEach(k => { if (!m.dirty[k]) { m.t[k] = m.t[k] || now(); m.dirty[k] = m.t[k]; } });
  Object.keys(remote).forEach(k => {
    const row = remote[k], lt = m.t[k] || 0;
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
