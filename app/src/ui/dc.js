// Small helpers that give JSX the same semantics the old dc-runtime template had.
import { createElement, isValidElement, Fragment } from 'react';

// style="a:b;{{ dyn }}" → React style object (same parsing as the runtime's cssToObj).
const kebabToCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
export const css = (text) => {
  const o = {};
  for (const decl of text.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith('--') ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
  }
  return o;
};

// A {{ hole }} inside an attribute string: null/undefined become ''.
export const str = (x) => x ?? '';

// A {{ hole }} in text: strings and numbers were wrapped in a <span>,
// elements/arrays rendered as-is, null/undefined/booleans rendered nothing.
export const iv = (x) => {
  if (x === undefined || x === null || typeof x === 'boolean') return null;
  if (isValidElement(x) || Array.isArray(x)) return createElement(Fragment, null, x);
  return createElement('span', null, String(x));
};

// <sc-for list="{{ x }}">: anything that is not an array renders nothing.
export const list = (x) => (Array.isArray(x) ? x : []);

// value="{{ x }}" / checked="{{ x }}": undefined became '' / false (controlled inputs).
export const val = (x) => (x === undefined ? '' : x);
export const checked = (x) => (x === undefined ? false : x);
