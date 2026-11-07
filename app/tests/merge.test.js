import { describe, it, expect } from 'vitest';
import { mergePull, pushPlan, afterPush, mergeIndex } from '../src/sync/merge.js';

const P = 'visual-notebook.';
const view = (store) => ({ keys: () => Object.keys(store).filter(k => k.startsWith(P)), get: (k) => (k in store ? store[k] : null) });
const meta = (m) => Object.assign({ t: {}, dirty: {}, synced: {} }, m);
const apply = (store, r) => { r.sets.forEach(([k, v]) => { store[k] = v; }); r.removes.forEach(k => { delete store[k]; }); return store; };
const now = () => 9999;

describe('mergePull', () => {
  it('takes a newer server row', () => {
    const store = { [P + 'a']: 'old' }, m = meta({ t: { [P + 'a']: 100 }, synced: { [P + 'a']: 1 } });
    const r = mergePull(m, [{ key: P + 'a', value: 'new', updated_at: 200 }], view(store), false, now);
    expect(r.sets).toEqual([[P + 'a', 'new']]);
    expect(r.changed).toBe(true);
    expect(r.meta.t[P + 'a']).toBe(200);
  });
  it('keeps a local change that is newer and not pushed yet', () => {
    const store = { [P + 'a']: 'mine' }, m = meta({ t: { [P + 'a']: 300 }, dirty: { [P + 'a']: 300 } });
    const r = mergePull(m, [{ key: P + 'a', value: 'server', updated_at: 200 }], view(store), false, now);
    expect(r.sets).toEqual([]);
    expect(r.meta.dirty[P + 'a']).toBe(300);
  });
  it('an unpushed local change loses to a newer server row', () => {
    const store = { [P + 'a']: 'mine' }, m = meta({ t: { [P + 'a']: 100 }, dirty: { [P + 'a']: 100 } });
    const r = mergePull(m, [{ key: P + 'a', value: 'server', updated_at: 200 }], view(store), false, now);
    expect(r.sets).toEqual([[P + 'a', 'server']]);
    expect(r.meta.dirty).toEqual({});
  });
  it('writes keys that exist only on the server', () => {
    const r = mergePull(meta(), [{ key: P + 'map.m3', value: '{}', updated_at: 5 }], view({}), false, now);
    expect(r.sets).toEqual([[P + 'map.m3', '{}']]);
    expect(r.meta.synced[P + 'map.m3']).toBe(1);
  });
  it('does not count an identical value as a change', () => {
    const r = mergePull(meta(), [{ key: P + 'a', value: 'same', updated_at: 5 }], view({ [P + 'a']: 'same' }), false, now);
    expect(r).toMatchObject({ sets: [], changed: false });
    expect(r.meta.t[P + 'a']).toBe(5);
  });
  it('deletes a synced key that was deleted on another device', () => {
    const m = meta({ t: { [P + 'gone']: 1 }, synced: { [P + 'gone']: 1 } });
    const r = mergePull(m, [{ key: P + 'x', value: '1', updated_at: 1 }], view({ [P + 'gone']: 'v' }), false, now);
    expect(r.removes).toEqual([P + 'gone']);
    expect(r.meta.synced[P + 'gone']).toBeUndefined();
  });
  it('marks a never-synced local key dirty so it gets pushed', () => {
    const r = mergePull(meta(), [{ key: P + 'x', value: '1', updated_at: 1 }], view({ [P + 'new']: 'v' }), false, now);
    expect(r.removes).toEqual([]);
    expect(r.meta.dirty[P + 'new']).toBe(9999);
  });
  it('first sync into an empty account pushes everything local', () => {
    const r = mergePull(meta(), [], view({ [P + 'a']: '1', [P + 'b']: '2', 'other.key': 'x' }), true, now);
    expect(Object.keys(r.meta.dirty).sort()).toEqual([P + 'a', P + 'b']);
  });
  it('only looks at keys with the sync prefix', () => {
    const r = mergePull(meta(), [{ key: P + 'x', value: '1', updated_at: 1 }], view({ 'vn.textScale': '1.5', [P + 'x']: '1' }), false, now);
    expect(Object.keys(r.meta.dirty)).toEqual([]);
  });
});

describe('push', () => {
  it('upserts dirty keys that exist and deletes the ones that were removed', () => {
    const m = meta({ t: { [P + 'a']: 10 }, dirty: { [P + 'a']: 10, [P + 'b']: 11 } });
    expect(pushPlan(m, view({ [P + 'a']: 'A' }), 'u1', now)).toEqual({
      keys: [P + 'a', P + 'b'],
      ups: [{ user_id: 'u1', key: P + 'a', value: 'A', updated_at: 10 }],
      dels: [P + 'b']
    });
  });
  it('after a push, keeps keys dirty that changed again meanwhile', () => {
    const before = meta({ dirty: { [P + 'a']: 10, [P + 'b']: 11 } });
    const current = meta({ dirty: { [P + 'a']: 10, [P + 'b']: 12 } });
    const m = afterPush(current, before, [P + 'a', P + 'b'], view({ [P + 'a']: 'A', [P + 'b']: 'B' }), 'u1');
    expect(m.dirty).toEqual({ [P + 'b']: 12 });
    expect(m.synced).toEqual({ [P + 'a']: 1, [P + 'b']: 1 });
    expect(m.user).toBe('u1');
  });
});

// The rules as they were written in the original pullAll()/pushDirty(),
// working directly on a localStorage-like object. mergePull/pushPlan/afterPush
// must give exactly the same result on any input.
function referencePull(store, m, data, first, now) {
  const ls = { getItem: (k) => (k in store ? store[k] : null) }, keys = () => Object.keys(store);
  const _rawSet = (k, v) => { store[k] = v; }, _rawRem = (k) => { delete store[k]; };
  const remote = {}; (data || []).forEach(row => remote[row.key] = row);
  let changed = false;
  if (!data.length && first) keys().filter(k => k.startsWith(P)).forEach(k => { if (!m.dirty[k]) { m.t[k] = m.t[k] || now(); m.dirty[k] = m.t[k]; } });
  Object.keys(remote).forEach(k => {
    const row = remote[k], lt = m.t[k] || 0;
    if (m.dirty[k] && lt >= row.updated_at) return;
    if (row.updated_at > lt || ls.getItem(k) == null) {
      if (ls.getItem(k) !== row.value) { _rawSet(k, row.value); changed = true; }
      m.t[k] = row.updated_at; delete m.dirty[k]; m.synced[k] = 1;
    }
  });
  keys().filter(k => k.startsWith(P)).forEach(k => {
    if (remote[k]) return;
    if (m.synced[k] && !m.dirty[k]) { _rawRem(k); delete m.synced[k]; changed = true; }
    else if (!m.dirty[k]) { m.t[k] = m.t[k] || now(); m.dirty[k] = m.t[k]; }
  });
  return { store, m, changed };
}

describe('mergePull equals the original rules', () => {
  it('on 3000 random situations', () => {
    let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    for (let c = 0; c < 3000; c++) {
      const keys = ['a', 'b', 'c', 'd', 'e'].map(k => P + k).concat(['other']);
      const store = {}, m = meta(), rows = [];
      keys.forEach(k => {
        if (rnd() < 0.6) store[k] = pick(['v1', 'v2', 'v3']);
        if (rnd() < 0.5) m.t[k] = pick([0, 100, 200, 300]);
        if (rnd() < 0.3) m.dirty[k] = pick([100, 200, 300]);
        if (rnd() < 0.4) m.synced[k] = 1;
        if (k !== 'other' && rnd() < 0.5) rows.push({ key: k, value: pick(['v1', 'v2', 'v4']), updated_at: pick([50, 150, 200, 250, 400]) });
      });
      const first = rnd() < 0.3, clone = (x) => JSON.parse(JSON.stringify(x));
      const ref = referencePull(clone(store), clone(m), rows, first, now);
      const got = mergePull(clone(m), rows, view(store), first, now);
      expect({ store: apply(clone(store), got), m: got.meta, changed: got.changed }).toEqual(ref);
    }
  });
});

describe('map list merge (index)', () => {
  const idx = (maps, folders, current) => JSON.stringify({ maps, current: current || (maps[0] && maps[0].id), folders: folders || [] });
  it('keeps the maps and folders of both lists', () => {
    const local = idx([{ id: 'm9', title: 'New here', updated: 50 }], []);
    const remote = idx([{ id: 'm1', title: 'Sleep', updated: 10, folder: 'f1' }, { id: 'm2', title: 'Garden', updated: 20 }], [{ id: 'f1', name: 'Work', open: true }]);
    const r = JSON.parse(mergeIndex(local, remote));
    expect(r.maps.map(m => [m.id, m.folder || null])).toEqual([['m1', 'f1'], ['m2', null], ['m9', null]]);
    expect(r.folders).toEqual([{ id: 'f1', name: 'Work', open: true }]);
    expect(r.current).toBe('m9');
  });
  it('keeps a folder from either side and the newer title', () => {
    const local = idx([{ id: 'm1', title: 'Sleep v2', updated: 30, folder: 'f2' }], [{ id: 'f2', name: 'Mine' }]);
    const remote = idx([{ id: 'm1', title: 'Sleep', updated: 10 }], []);
    const r = JSON.parse(mergeIndex(local, remote));
    expect(r.maps).toEqual([{ id: 'm1', title: 'Sleep v2', updated: 30, folder: 'f2' }]);
    expect(r.folders.map(f => f.id)).toEqual(['f2']);
  });
  it('returns null for unreadable lists', () => {
    expect(mergeIndex('{', '[]')).toBeNull();
  });
  it('mergePull merges the list instead of letting the newer one win, and pushes the result', () => {
    const K = P + 'index';
    const store = { [K]: idx([{ id: 'm9', title: 'New', updated: 900 }]) };
    const m = meta({ t: { [K]: 900 }, dirty: { [K]: 900 } });
    const rows = [{ key: K, value: idx([{ id: 'm1', title: 'Old', updated: 5, folder: 'f1' }], [{ id: 'f1', name: 'Work' }]), updated_at: 100 }];
    const r = mergePull(m, rows, view(store), false, () => 1000, { [K]: mergeIndex });
    const merged = JSON.parse(r.sets[0][1]);
    expect(merged.maps.map(x => x.id)).toEqual(['m1', 'm9']);
    expect(merged.folders.map(f => f.name)).toEqual(['Work']);
    expect(r.meta.dirty[K]).toBe(1000);
  });
  it('without unpushed local changes the server list is simply taken', () => {
    const K = P + 'index';
    const store = { [K]: idx([{ id: 'm9', title: 'New' }]) };
    const rows = [{ key: K, value: idx([{ id: 'm1', title: 'Old' }]), updated_at: 100 }];
    const r = mergePull(meta(), rows, view(store), false, now, { [K]: mergeIndex });
    expect(r.sets).toEqual([[K, rows[0].value]]);
  });
});
