// localStorage keys and fixed data. Key names must never change: existing
// notebooks and the Supabase rows (notebook_items.key) use them.
export const SYNC_META = 'vn-sync.meta';
export const SYNC_PREFIX = 'visual-notebook.';
export const KEY = 'visual-notebook.v1';
export const ARROW_COLORS = [null, '#2f6f5e', '#4a6fa5', '#7a5c9e', '#b0544a', '#b8863b', '#3f8a8a', '#2a2724'];
export const IDX = 'visual-notebook.index';
export const mk = (id) => 'visual-notebook.map.' + id;
export const NW = 178, NH = 62, MW = 226, MH = 80;
export const FRAME_COLORS = {
  sage: { bg: '#e4eee9', bd: '#9dbdb0', ink: '#2f5f51' },
  sand: { bg: '#f3ecdc', bd: '#cdb98f', ink: '#6e5a2e' },
  rose: { bg: '#f6e5e2', bd: '#d6a8a0', ink: '#80443a' },
  sky: { bg: '#e3eaf4', bd: '#9fb5d0', ink: '#3a5476' },
  lilac: { bg: '#ece6f3', bd: '#b8a8d0', ink: '#584679' },
  stone: { bg: '#e9eaef', bd: '#b7bac7', ink: '#4e5163' }
};
export const CATS = 'visual-notebook.cats';
export const DEFAULT_CATS = [
  { id: 'c1', name: 'Category 1', color: '#5f8a6e', tint: '#eaf1ec' },
  { id: 'c2', name: 'Category 2', color: '#5876a0', tint: '#e8edf5' },
  { id: 'c3', name: 'Category 3', color: '#b8674a', tint: '#f7e9e2' },
  { id: 'c4', name: 'Category 4', color: '#b08a2e', tint: '#f6efdc' },
  { id: 'c5', name: 'Category 5', color: '#8a5d86', tint: '#f1e7f0' },
  { id: 'c6', name: 'Category 6', color: '#3f8a8a', tint: '#e3f0ef' },
  { id: 'c7', name: 'Category 7', color: '#b5576e', tint: '#f6e6ea' },
  { id: 'c8', name: 'Category 8', color: '#6c7a3a', tint: '#eef0e0' },
  { id: 'c9', name: 'Category 9', color: '#c47a2c', tint: '#f9ecdc' },
  { id: 'c10', name: 'Category 10', color: '#5a5f9e', tint: '#e9eaf5' },
  { id: 'c11', name: 'Category 11', color: '#4f8fb8', tint: '#e4eff6' },
  { id: 'c12', name: 'Category 12', color: '#6b6560', tint: '#eeecea' }
];
export const OLD_NAMES = { c1: ['Biological', 'Green'], c2: ['Psychological', 'Blue'], c3: ['Social', 'Rust'], c4: ['Lifestyle', 'Ochre'], c5: ['Other', 'Plum'] };
