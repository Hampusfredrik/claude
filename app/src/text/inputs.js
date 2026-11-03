// Keyboard helpers for plain <input>/<textarea> fields.
export const insNL = (ev, set) => { const el = ev.target, v = el.value || '', a = el.selectionStart, b = el.selectionEnd; set(v.slice(0, a) + '\n' + v.slice(b)); requestAnimationFrame(() => { try { el.setSelectionRange(a + 1, a + 1); } catch (err) {} }); };
export const wrapSel = (el, value, mark, apply) => {
  if (!el) return;
  const a = el.selectionStart, b = el.selectionEnd, m = mark.length;
  let v, s0, s1;
  if (value.slice(a - m, a) === mark && value.slice(b, b + m) === mark && !(m === 1 && value.slice(a - 2, a) === '**' && value.slice(b, b + 2) === '**')) {
    v = value.slice(0, a - m) + value.slice(a, b) + value.slice(b + m); s0 = a - m; s1 = b - m;
  } else { v = value.slice(0, a) + mark + value.slice(a, b) + mark + value.slice(b); s0 = a + m; s1 = b + m; }
  apply(v);
  requestAnimationFrame(() => { try { el.focus(); el.setSelectionRange(s0, s1); } catch (e) {} });
};
export const fmtKey = (ev, value, apply) => {
  if (!(ev.ctrlKey || ev.metaKey)) return false;
  const k = ev.key.toLowerCase();
  if (k === 'b' || k === 'i') { ev.preventDefault(); wrapSel(ev.target, value, k === 'b' ? '**' : '*', apply); return true; }
  return false;
};
