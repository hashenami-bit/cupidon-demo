// Errors: 'not-image' or 'bad-format' (the page shows them in its own language).
// Shrinks a gallery photo so three of them fit in one letter (about 150 KB each).
export async function compressImage(file, maxSide = 900, target = 150000) {
  if (!file.type.startsWith('image/')) throw new Error('not-image');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('bad-format'));
      i.src = url;
    });
    let side = maxSide, q = 0.8, out = '';
    for (let tries = 0; tries < 10; tries++) {
      const s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * s));
      c.height = Math.max(1, Math.round(img.naturalHeight * s));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL('image/jpeg', q);
      if (out.length <= target) break;
      if (q > 0.56) q -= 0.08; else side = Math.round(side * 0.82);
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
