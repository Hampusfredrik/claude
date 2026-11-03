import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { packShare, unpackShare, b64u } from '../src/share/packShare.js';

// A real link code made by the deployed app (claude_code_handoff/source/index.html)
// for a three-box map. Links people already shared look like this and must keep opening.
const DEPLOYED_CODE = readFileSync(new URL('./fixtures/share-code-from-deployed-app.txt', import.meta.url), 'utf8').trim();

describe('#view= share codes', () => {
  it('opens a code made by the deployed app', async () => {
    const D = await unpackShare(DEPLOYED_CODE);
    expect(D.title).toBe('Garden');
    expect(D.nodes.map(n => n.label)).toEqual(['Garden', 'Tomato ☀', 'Bean']);
    expect(D.nodes[1].pages[0].notes).toBe('Åkerjord, crème brûlée — 日本');
    expect(D.nodes[0]).toMatchObject({ id: 'n1', main: true, words: '6 words', refs: '1 ref' });
    expect(D.edges).toHaveLength(2);
    expect(D.edges[1]).toMatchObject({ notes: 'Climbs', title: 'Garden ↔ Bean' });
    expect(D.frames).toEqual([expect.objectContaining({ label: 'Beds', bg: '#e4eee9', bd: '#9dbdb0' })]);
    expect(Object.keys(D)).toEqual(['title', 'nodes', 'edges', 'cats', 'frames']);
  });

  it('keeps the format: "z" + unpadded base64url of zlib deflate', async () => {
    const code = await packShare({ a: 1 });
    expect(code[0]).toBe('z');
    expect(code).toMatch(/^z[A-Za-z0-9_-]+$/);
    const bin = Buffer.from(code.slice(1).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    expect(bin[0]).toBe(0x78); // zlib header, i.e. CompressionStream('deflate')
    expect(DEPLOYED_CODE.slice(0, 3)).toBe('zeJ');
  });

  it('round-trips any map data, including unicode and long text', async () => {
    const D = { title: 'Ünïcødé ✓ 漢字 🙂', nodes: Array.from({ length: 300 }, (_, i) => ({ id: 'n' + i, label: 'Box ' + i, notes: 'x'.repeat(i) })), edges: [], cats: [], frames: [] };
    expect(await unpackShare(await packShare(D))).toEqual(D);
  });

  it('re-encodes the deployed code to data that decodes the same', async () => {
    const D = await unpackShare(DEPLOYED_CODE);
    expect(await unpackShare(await packShare(D))).toEqual(D);
  });

  it('b64u is base64url without padding', () => {
    expect(b64u(new Uint8Array([251, 255, 254]))).toBe('-__-');
    expect(b64u(new Uint8Array([1]))).toBe('AQ');
  });

  it('rejects a cut-off code', async () => {
    await expect(unpackShare(DEPLOYED_CODE.slice(0, 200))).rejects.toThrow();
  });
});
