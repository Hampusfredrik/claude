// Reads what the AI produced: a JSON object (possibly inside ``` fences or with
// text around it) or, as a fallback, a markdown outline (# headings / - bullets).
export function parseAiText(text) {
  let t = (text || '').trim().replace(/^\`\`\`[a-z]*\s*/i, '').replace(/\`\`\`\s*$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (err) {} }
  const lines = t.split('\n').filter(l => l.trim()); if (!lines.length) return null;
  const root = { title: '', children: [] }, stack = [{ lv: -1, n: root }];
  lines.forEach(l => {
    const h = l.match(/^(#{1,6})\s+(.*)/), bl = l.match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.*)/);
    let lv, label;
    if (h) { lv = h[1].length - 1; label = h[2]; } else if (bl) { lv = 10 + bl[1].replace(/\t/g, '  ').length / 2; label = bl[2]; } else { const top = stack[stack.length - 1].n; if (top !== root) top.notes = (top.notes ? top.notes + '\n' : '') + l.trim(); return; }
    label = label.replace(/\*\*/g, '').trim();
    if (!root.title && stack.length === 1) { root.title = label; stack.push({ lv: lv, n: root }); return; }
    while (stack.length > 1 && stack[stack.length - 1].lv >= lv) stack.pop();
    const node = { label: label, children: [] }; (stack[stack.length - 1].n.children = stack[stack.length - 1].n.children || []).push(node); stack.push({ lv: lv, n: node });
  });
  return root.title ? root : null;
}
