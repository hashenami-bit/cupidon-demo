// Errors: 'not-image' or 'bad-format' (the page shows them in its own language).
// Shrinks a gallery photo so everything fits in one letter (the locked letter must stay under 1,000,000 characters):
// three dish photos at 150,000 characters each (900 px) plus up to three couple photos at 65,000 (720 px)
// is about 860,000 characters once locked. `target` counts characters of the data URL, not bytes.
export const DISH_PHOTO = { maxSide: 900, target: 150000 };
export const COUPLE_PHOTO = { maxSide: 720, target: 65000 };
export async function compressImage(file, maxSide = DISH_PHOTO.maxSide, target = DISH_PHOTO.target) {
  if (!file.type.startsWith('image/')) throw new Error('not-image');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('bad-format'));
      i.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('bad-format');   // e.g. an SVG file
    let side = maxSide, q = 0.8, out = '';
    for (let tries = 0; tries < 10; tries++) {
      const s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * s));
      c.height = Math.max(1, Math.round(img.naturalHeight * s));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = 'saturate(1.06) contrast(1.03)';   // a touch of colour so food looks fresh (ignored where unsupported)
      ctx.drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL('image/jpeg', q);
      c.width = c.height = 0;   // give the canvas memory back (iOS has a small limit)
      if (!out.startsWith('data:image/jpeg')) throw new Error('bad-format');
      if (out.length <= target) break;
      if (q > 0.56) q -= 0.08; else side = Math.round(side * 0.82);
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
