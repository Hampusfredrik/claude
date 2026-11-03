import { describe, it, expect } from 'vitest';
import { buildBook } from '../src/book/buildBook.js';
import { bookHtml } from '../src/export/bookHtml.js';

const n = (id, label, extra) => Object.assign({ id, label, x: 0, y: 0, notes: '', refs: '' }, extra);
const map = {
  nodes: [n('m', 'Wool </script><b>', { main: true, notes: 'Intro' }),
    n('a', 'Fibres', { pages: [{ id: 'p0', name: 'One', notes: 'First tab', refs: '' }, { id: 'p1', name: 'Two', notes: 'Second tab', refs: '' }], pageIdx: 0, notes: 'First tab' })],
  edges: [{ id: '1', from: 'm', to: 'a' }], cats: []
};

describe('notebook as one .html file', () => {
  const html = bookHtml(buildBook(map));
  it('is a complete page that loads nothing from the internet', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).not.toMatch(/<(link|img|script)[^>]+(href|src)="https?:/i);
    expect(html).not.toMatch(/@import|fonts\.googleapis/);
  });
  it('contains every tab of a box, not only the active one', () => {
    expect(html).toContain('First tab');
    expect(html).toContain('Second tab');
  });
  it('cannot be broken out of by text in the map', () => {
    expect(html.match(/<\/script>/g)).toHaveLength(1); // only the real closing tag
    expect(html).toContain('<title>Wool &lt;/script&gt;&lt;b&gt;</title>');
  });
});
