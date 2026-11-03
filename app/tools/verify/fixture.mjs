// Test data for the side-by-side comparison: two maps in localStorage that use
// most features (categories, inherited colours, tabs, references, citations,
// box links, linked copies, collapsed branches, frames, cross-links/tunnels).
const n = (id, label, x, y, extra) => Object.assign({ id, label, x, y, notes: '', refs: '' }, extra || {});
const e = (id, from, to, extra) => Object.assign({ id, from, to, both: false, strength: 'thin' }, extra || {});

const nodes = [
  n('n1', 'Sleep', -113, -40, { main: true, notes: 'Sleep is a **core** process.\n\n- Regulates mood\n- Supports memory [1]\n  - Consolidation\n1. First\n2. Second\n\nSee [[n4]] for light.', refs: 'Walker M. Why We Sleep. Scribner; 2017.\nhttps://doi.org/10.1000/xyz123' }),
  n('n2', 'Biology', 260, -260, { cat: 'c1', sub: 'How the body runs sleep' }),
  n('n3', 'Circadian rhythm', 560, -330, { notes: 'The ~24 h clock.' }),
  n('n4', 'Light exposure', 560, -220, { notes: 'Morning light *shifts* the clock earlier.', refs: '10.1038/nature12345' }),
  n('n5', 'Melatonin', 860, -300, { collapsed: true }),
  n('n6', 'Dose', 1120, -330),
  n('n7', 'Psychology', 260, 160, { cat: 'c2', pages: [{ id: 'p0', name: 'Overview', notes: 'Mood and sleep.', refs: '' }, { id: 'p1', name: 'Details', notes: 'Anxiety delays sleep onset.', refs: 'Smith J. Anxiety. J Sleep. 2020;1:1-10.' }], pageIdx: 0, notes: 'Mood and sleep.' }),
  n('n8', 'Stress', 560, 120, { twin: 't1', notes: 'Shared text' }),
  n('n9', 'Rumination', 560, 240),
  n('n10', 'Social', -520, -200, { cat: 'c3', link: 'm2' }),
  n('n11', 'Work shifts', -820, -260),
  n('n12', 'Family', -820, -140),
  n('n13', 'Lifestyle', -520, 200, { cat: 'c4' }),
  n('n14', 'Caffeine', -820, 160, { notes: 'Half-life ~5 h.' }),
  n('n15', 'Stress', -820, 300, { twin: 't1', notes: 'Shared text' }),
  n('n16', 'Exercise', -820, 420)
];
const edges = [
  e('e1', 'n1', 'n2'), e('e2', 'n2', 'n3'), e('e3', 'n2', 'n4'), e('e4', 'n3', 'n5'), e('e5', 'n5', 'n6'),
  e('e6', 'n1', 'n7', { strength: 'thick' }), e('e7', 'n7', 'n8'), e('e8', 'n7', 'n9', { strength: 'dashed' }),
  e('e9', 'n1', 'n10'), e('e10', 'n10', 'n11'), e('e11', 'n10', 'n12', { color: '#4a6fa5' }),
  e('e12', 'n1', 'n13'), e('e13', 'n13', 'n14'), e('e14', 'n13', 'n15'), e('e15', 'n13', 'n16'),
  // cross-links (not parent → child), one long enough to become a tunnel
  e('e16', 'n14', 'n4', { notes: 'Caffeine blocks adenosine; light timing matters too.' }),
  e('e17', 'n9', 'n12', { both: true }),
  e('e18', 'n16', 'n3', { strength: 'thick' })
];
const frames = [
  { id: 'f1', x: 520, y: -380, w: 420, h: 260, color: 'sky', label: 'Clock' },
  { id: 'f2', x: -870, y: 120, w: 300, h: 380, color: 'sand', label: '' }
];
const map1 = { nodes, edges, frames, tx: 640, ty: 400, scale: 0.62, cats: undefined };
delete map1.cats;
const map2 = { nodes: [n('a1', 'Social life', -113, -40, { main: true }), n('a2', 'Friends', 200, -40)], edges: [e('x1', 'a1', 'a2')], frames: [], tx: 600, ty: 380, scale: 1 };

export const T0 = Date.UTC(2026, 10, 2, 9, 30, 0);
export const storage = {
  'visual-notebook.index': JSON.stringify({ maps: [{ id: 'm1', title: 'Sleep', updated: T0 - 3600e3 }, { id: 'm2', title: 'Social life', updated: T0 - 86400e3 * 40, folder: 'f1' }], current: 'm1', folders: [{ id: 'f1', name: 'Projects', open: true }] }),
  'visual-notebook.map.m1': JSON.stringify(map1),
  'visual-notebook.map.m2': JSON.stringify(map2),
  'visual-notebook.cats': JSON.stringify([{ id: 'c1', name: 'Biological', color: '#5f8a6e', tint: '#eaf1ec' }, { id: 'c2', name: 'Mind', color: '#5876a0', tint: '#e8edf5' }]),
  'visual-notebook.welcomeSkip': 'true'
};
