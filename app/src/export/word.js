// Word export: the HTML document wrapped as an MHTML file (multipart/related)
// with images as separate parts. Word opens it as a .doc.
export function wordMhtml(docHtml) {
  const html = docHtml.replace('<html>', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">');
  const parts = []; let k = 0;
  const body = html.replace(/src="data:image\/(\w+);base64,([^"]+)"/g, (m0, ext, b64) => { k++; const loc = 'file:///C:/vn_files/image' + k + '.' + (ext === 'jpeg' ? 'jpg' : ext); parts.push({ loc: loc, type: 'image/' + ext, b64: b64 }); return 'src="' + loc + '"'; });
  const wrap = (s) => s.replace(/(.{76})/g, '$1\r\n');
  const utf8b64 = btoa(unescape(encodeURIComponent(body)));
  const BD = '----=_NextPart_VisualNotebook';
  let mh = 'MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="' + BD + '"; type="text/html"\r\n\r\n--' + BD + '\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/vn.htm\r\n\r\n' + wrap(utf8b64) + '\r\n';
  parts.forEach(p => { mh += '\r\n--' + BD + '\r\nContent-Location: ' + p.loc + '\r\nContent-Transfer-Encoding: base64\r\nContent-Type: ' + p.type + '\r\n\r\n' + wrap(p.b64) + '\r\n'; });
  mh += '\r\n--' + BD + '--\r\n';
  return mh;
}
