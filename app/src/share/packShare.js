// Read-only share links: #view=<code>. The format must stay exactly the same
// so links that were already shared keep working:
//   code = "z" + base64url(deflate(JSON.stringify(mapViewData)))  (no padding)
export const b64u = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const packShare = async (obj) => { const st = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('deflate')); return 'z' + b64u(new Uint8Array(await new Response(st).arrayBuffer())); };
export const unpackShare = async (code) => { const s = code.slice(1).replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(s + '='.repeat((4 - s.length % 4) % 4)); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const st = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate')); return JSON.parse(await new Response(st).text()); };
