// Where to put a new child box on the map (used when a box is added from the
// notebook view). Beside the parent, in the column of its other children and
// below them; for the main topic on the side with fewer branches. Moved down
// until it does not overlap any box.
import { NW, NH } from '../model/constants.js';

export function placeChild(nodes, edges, parent, grandparent, size) {
  const byId = {}; nodes.forEach(n => { byId[n.id] = n; });
  const ps = size(parent), mid = (n) => n.x + size(n).w / 2, pc = mid(parent);
  const kids = edges.filter(e => e.from === parent.id).map(e => byId[e.to]).filter(n => n && !n.main);
  let dir;
  if (parent.main) { const right = kids.filter(k => mid(k) >= pc).length; dir = right <= kids.length - right ? 1 : -1; }
  else dir = grandparent && mid(grandparent) > pc ? -1 : 1;
  const x = dir > 0 ? parent.x + ps.w + 90 : parent.x - NW - 90;
  const side = kids.filter(k => (mid(k) >= pc ? 1 : -1) === dir);
  let y = side.length ? Math.max(...side.map(k => k.y + size(k).h)) + 24 : parent.y + ps.h / 2 - NH / 2;
  const gap = 16;
  const hits = (yy) => nodes.some(n => { const z = size(n); return x < n.x + z.w + gap && n.x < x + NW + gap && yy < n.y + z.h + gap && n.y < yy + NH + gap; });
  for (let i = 0; i < 400 && hits(y); i++) y += 24;
  return { x: Math.round(x), y: Math.round(y) };
}
