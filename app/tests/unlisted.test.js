import { describe, it, expect } from 'vitest';
import { findUnlistedMaps } from '../src/model/storage.js';

const store = {
  'visual-notebook.index': JSON.stringify({ maps: [{ id: 'm3', title: 'New' }], current: 'm3' }),
  'visual-notebook.map.m1': JSON.stringify({ nodes: [{ id: 'n1', label: 'Sleep **notes**', main: true }] }),
  'visual-notebook.map.m2': JSON.stringify({ nodes: [{ id: 'n1', label: 'Garden', main: true }] }),
  'visual-notebook.map.m3': JSON.stringify({ nodes: [{ id: 'n1', label: 'New', main: true }] }),
  'visual-notebook.map.broken': 'not json',
  'visual-notebook.cats': '[]'
};
const read = (k) => { try { return JSON.parse(store[k]); } catch (e) { return null; } };
const times = { 'visual-notebook.map.m1': 100, 'visual-notebook.map.m2': 200 };

describe('findUnlistedMaps', () => {
  it('finds stored maps that are missing from the list, newest first', () => {
    expect(findUnlistedMaps(Object.keys(store), read(['visual-notebook.index'][0]), read, (k) => times[k])).toEqual([
      { id: 'm2', title: 'Garden', updated: 200, folder: null },
      { id: 'm1', title: 'Sleep notes', updated: 100, folder: null }
    ]);
  });
  it('finds nothing when every map is listed', () => {
    const idx = { maps: ['m1', 'm2', 'm3'].map(id => ({ id })) };
    expect(findUnlistedMaps(Object.keys(store), idx, read, () => 0)).toEqual([]);
  });
});
