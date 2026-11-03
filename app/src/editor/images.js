// Images pasted or picked into notes are downscaled and stored as JPEG data URLs.
export const compressImage = (file) => new Promise((res, rej) => {
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url); res({ d: c.toDataURL('image/jpeg', 0.82), w: w, h: h });
  };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image.')); };
  img.src = url;
});
