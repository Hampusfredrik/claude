// One-off port tool (step 2 of PLAN.md).
// Turns the template tree from extract-tree.mjs into JSX that renders the same
// React element tree as the old dc-runtime did (support.js compile.ts), and the
// style-hover/style-focus rules into a CSS file with the same class names.
//
// Usage: node tools/port/gen-jsx.mjs <tree.json> <out.jsx> <out.css>
import { readFileSync, writeFileSync } from 'node:fs';

const [treeFile, outJsx, outCss] = process.argv.slice(2);
const tree = JSON.parse(readFileSync(treeFile, 'utf8'));

// ---- helpers copied from support.js so the output matches it exactly ----
const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const cssToObj = (css) => {
  const o = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }
  return o;
};
// The pseudo-state CSS in this template has no comments, strings or url(),
// so support.js importantify() reduces to: split on ';' and add !important.
const importantify = (css) => css.split(';').map(d => d.trim()).filter(Boolean)
  .map(d => /!\s*important$/i.test(d) ? d : d + ' !important').join(';');

// Pseudo classes are numbered in document order, as the runtime did at compile time.
const pseudo = new Map();
const pseudoRules = [];
const pseudoClass = (state, css) => {
  const k = state + '|' + css;
  if (pseudo.has(k)) return pseudo.get(k);
  const cls = 'scp' + (pseudo.size).toString(36);
  pseudo.set(k, cls);
  const isEl = state === 'before' || state === 'after';
  pseudoRules.push('.' + cls + (isEl ? '::' : ':') + state + '{' + (isEl ? css : importantify(css)) + '}');
  return cls;
};

// ---- expressions: every hole in this template is a plain dotted path ----
const expr = (src, scope) => {
  const p = src.trim();
  if (p === 'true' || p === 'false' || p === 'null') return p;
  if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(p)) throw new Error('Unsupported expression: ' + p);
  const [head, ...rest] = p.split('.');
  // The runtime resolved paths null-safely; optional chaining does the same.
  return (scope.has(head) ? head : 'v.' + head) + rest.map(r => '?.' + r).join('');
};
const HOLE = /\{\{([\s\S]+?)\}\}/g;
const wholeHole = (s) => { const m = s.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/); return m ? m[1] : null; };
const interp = (s, scope) => '`' + s.split(HOLE).map((part, i) => i & 1 ? '${str(' + expr(part, scope) + ')}' : part.replace(/[`\\$]/g, (c) => '\\' + c)).join('') + '`';

const jsStr = (s) => JSON.stringify(s);
const ATTR_NAME = { class: 'className', for: 'htmlFor', autocomplete: 'autoComplete' };
const attrName = (k) => ATTR_NAME[k] || (/^(data|aria)-/.test(k) ? k : k.includes('-') ? kebabToCamel(k) : k);
const objLiteral = (o) => '{ ' + Object.entries(o).map(([k, v]) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : jsStr(k)) + ': ' + jsStr(v)).join(', ') + ' }';

const attrsOf = (n, scope) => {
  const out = [], classes = [];
  for (const [k, raw] of n.attrs) {
    if (k === 'sc-name' || k === 'hint-size') continue;
    if (k.startsWith('style-')) { classes.push(pseudoClass(k.slice(6), raw)); continue; }
    const name = attrName(k);
    const whole = wholeHole(raw);
    let val;
    if (k === 'style') {
      val = raw.includes('{{') ? 'css(' + interp(raw, scope) + ')' : objLiteral(cssToObj(raw));
    } else if (whole != null) {
      val = expr(whole, scope);
      if (k === 'value' || k === 'checked') val = (k === 'value' ? 'val(' : 'checked(') + val + ')';
    } else if (raw.includes('{{')) {
      val = interp(raw, scope);
    } else {
      out.push(name + '=' + (/^[^"&\\{}\n]*$/.test(raw) ? '"' + raw + '"' : '{' + jsStr(raw) + '}'));
      continue;
    }
    out.push(name + '={' + val + '}');
  }
  if (classes.length) out.push('className="' + classes.join(' ') + '"');
  return out;
};

const isWs = (t) => !t.trim();
const staticDisplay = (n) => { const s = (n.attrs.find(a => a[0] === 'style') || [])[1] || ''; const m = s.replace(/\{\{[\s\S]*?\}\}/g, '').match(/(?:^|;)\s*display\s*:\s*([a-z-]+)/); return m ? m[1] : null; };
const SVG = new Set(['svg', 'g', 'path', 'polygon', 'circle', 'line', 'rect']);

// Plain JSX text is only used where JSX keeps the string unchanged.
const lit = (s) => /^[^\s{}<>&"'`\\][^{}<>&\n\\]*$/.test(s) && !/\s$/.test(s) && !/\s\s/.test(s) ? s : '{' + jsStr(s) + '}';
const textNode = (t, scope, pad) => {
  if (!t.value.includes('{{')) return [[pad + lit(t.value)]];
  const parts = t.value.split(HOLE);
  return parts.map((p, i) => i & 1 ? [pad + '{iv(' + expr(p, scope) + ')}'] : p === '' ? null : [pad + '{' + jsStr(p) + '}']).filter(Boolean);
};

// parent: the closest real element (for whitespace decisions)
const children = (kids, scope, depth, parent) => {
  const pad = '  '.repeat(depth);
  const out = [];
  for (const c of kids) {
    if (c.type === 'helmet') continue; // moved to index.html / global.css
    if (c.type === 'text') {
      // support.js walkText(): whitespace without a space character is dropped.
      if (isWs(c.value) && !c.value.includes(' ')) continue;
      if (isWs(c.value)) {
        // Whitespace-only text renders nothing in flex/grid containers, SVG and
        // <select>; elsewhere it collapses to one space (no pre-* white-space
        // contexts contain whitespace-only text in this template).
        const d = parent && staticDisplay(parent);
        if (!parent || SVG.has(parent.tag) || parent.tag === 'select' || /flex|grid/.test(d || '')) continue;
        out.push([pad + '{" "}']);
        continue;
      }
      out.push(...textNode(c, scope, pad));
      continue;
    }
    const el = element(c, scope, depth, parent);
    if (el.length) out.push(el);
  }
  return out;
};

const element = (n, scope, depth, parent) => {
  const pad = '  '.repeat(depth);
  if (n.tag === 'sc-if') {
    const cond = expr(wholeHole(n.attrs.find(a => a[0] === 'value')[1]), scope);
    const items = children(n.children, scope, depth + 2, parent);
    if (!items.length) return [];
    if (items.length === 1 && items[0][0].trim().startsWith('<')) return [pad + '{' + cond + ' ? (', ...items[0].map(l => l.slice(2)), pad + ') : null}'];
    return [pad + '{' + cond + ' ? (', pad + '  <>', ...items.flat(), pad + '  </>', pad + ') : null}'];
  }
  if (n.tag === 'sc-for') {
    const list = expr(wholeHole(n.attrs.find(a => a[0] === 'list')[1]), scope);
    const as = (n.attrs.find(a => a[0] === 'as') || [])[1] || 'item';
    const sub = new Set(scope); sub.add(as);
    const body = children(n.children, sub, depth + 2, parent).flat();
    return [pad + '{list(' + list + ').map((' + as + ', $i) => (', pad + '  <Fragment key={$i}>', ...body, pad + '  </Fragment>', pad + '))}'];
  }
  const attrs = attrsOf(n, scope);
  const open = pad + '<' + n.tag + (attrs.length ? ' ' + attrs.join(' ') : '');
  const body = children(n.children, scope, depth + 1, n).flat();
  if (!body.length) return [open + ' />'];
  return [open + '>', ...body, pad + '</' + n.tag + '>'];
};

const root = tree.filter(n => n.type === 'el');
if (root.length !== 1) throw new Error('expected one root element');
const body = element(root[0], new Set(), 2, null);

const jsx = `// GENERATED by tools/port/gen-jsx.mjs from "Visual Notebook.dc.html" (step 2 of PLAN.md).
// It renders the same element tree as the old dc-runtime template did.
import { Fragment } from 'react';
import { css, iv, list, val, checked, str } from './dc.js';

export default function Template({ v }) {
  return (
${body.join('\n')}
  );
}
`;
writeFileSync(outJsx, jsx);
writeFileSync(outCss, '/* GENERATED by tools/port/gen-jsx.mjs: style-hover / style-focus rules from the template,\n   with the same class names and order as the old dc-runtime produced. */\n' + pseudoRules.join('\n') + '\n');
console.log('wrote', outJsx, 'and', outCss, '(' + pseudoRules.length + ' pseudo rules)');
