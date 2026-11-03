// [[box-id]] links between boxes. `links` holds state shared by the renderers:
// current box labels, the "open box" callback and the reference list being shown.

export const links = { labels: {}, openNode: null, citeRefs: [] };
export const LINK_RE = /\[\[([A-Za-z0-9_-]+)\]\]/g;
export const linkLbl = (id) => links.labels[id] != null ? links.labels[id] : 'Deleted box';
export const plain = (t) => (t || '').replace(LINK_RE, (m, id) => linkLbl(id)).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\s][^*]*)\*/g, '$1');
export const linkPlain = (t) => (t || '').replace(LINK_RE, (m, id) => linkLbl(id));
