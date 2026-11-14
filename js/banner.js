// Draws the invitation as a 1080×1350 picture (good for phone galleries and Instagram).
// Same look as the website: blush page, ivory stationery, gold hairline, painted flowers in the corners.
import { downloadBlob } from './common.js';

const C = {
  blush: '#F8E3DE', blush2: '#F3CFCB', ivory: '#FFFAF4', claret: '#4B1727', inkSoft: '#7A4D59',
  rose: '#A8394F', roseDeep: '#7E2538', gold: '#C4912F', rosePaper: '#E8A1AB', blue: '#8FA9C6'
};
const SCRIPT = '"Great Vibes", "Marck Script", cursive';   // titles, name, signature (Latin + Cyrillic)
const HAND = '"Marck Script", "Great Vibes", cursive';     // the date, handwritten lines
const SERIF = '"Lora", Georgia, serif';
const DOODLES = ['garland', 'flourish', 'heart', 'sparkle'];

function loadImage(src) {
  return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
}

function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

// Writes centred text, shrinking the font until it fits maxW; a line that is still too long is cut with … (never runs off the card).
function fitText(x, text, cx, y, maxW, size, font, color) {
  let s = size;
  x.font = font(s);
  while (x.measureText(text).width > maxW && s > 18) { s -= 2; x.font = font(s); }
  if (x.measureText(text).width > maxW) {
    const chars = [...text];
    while (chars.length > 1 && x.measureText(chars.join('') + '…').width > maxW) chars.pop();
    text = chars.join('').trimEnd() + '…';
  }
  x.fillStyle = color;
  x.fillText(text, cx, y);
}

function drawSeal(x, cx, cy, r, letter) {
  const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#D2606F'); g.addColorStop(0.5, '#A93049'); g.addColorStop(1, '#6F1B2D');
  x.save();
  x.shadowColor = 'rgba(60,10,25,.45)'; x.shadowBlur = 22; x.shadowOffsetY = 8;
  x.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 18) {
    const rr = r * (1 + 0.04 * Math.sin(a * 5) + 0.025 * Math.cos(a * 7));
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    a === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.fillStyle = g; x.fill();
  x.restore();
  x.beginPath(); x.arc(cx, cy, r * 1.07, 0, Math.PI * 2);
  x.strokeStyle = 'rgba(232,193,120,.8)'; x.lineWidth = 3; x.stroke();
  x.beginPath(); x.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  x.strokeStyle = 'rgba(255,215,200,.4)'; x.lineWidth = 2.5; x.stroke();
  x.fillStyle = '#FBDDD6'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `${Math.round(r * 1.25)}px ${SCRIPT}`;
  x.fillText(letter, cx, cy + r * 0.14);
  x.textBaseline = 'alphabetic';
}

// A dish photo as a postage stamp, with a gentle film grade (colour boost, warm tint, soft vignette).
function drawStamp(x, img, cx, cy, size, angle) {
  const s = size, h = s / 2, hole = 9, gap = 26, inset = 20;
  x.save();
  x.translate(cx, cy); x.rotate(angle);
  x.shadowColor = 'rgba(110,45,60,.38)'; x.shadowBlur = 26; x.shadowOffsetY = 12;
  x.fillStyle = '#FFFFFF'; x.fillRect(-h, -h, s, s);
  x.shadowColor = 'transparent';
  // perforation: bite small circles out of each edge
  x.fillStyle = C.ivory;
  const n = Math.round(s / gap), step = s / n;
  for (let i = 0; i <= n; i++) {
    const p = -h + i * step;
    for (const [px, py] of [[p, -h], [p, h], [-h, p], [h, p]]) { x.beginPath(); x.arc(px, py, hole, 0, Math.PI * 2); x.fill(); }
  }
  const iw = s - inset * 2, ix = -h + inset, iy = -h + inset;
  const scale = Math.max(iw / img.width, iw / img.height);
  const sw = iw / scale, sh = iw / scale;
  x.save();
  x.imageSmoothingQuality = 'high';
  try { x.filter = 'saturate(1.08) contrast(1.04) brightness(1.02)'; } catch { /* older browsers skip the grade */ }
  x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, ix, iy, iw, iw);
  x.restore();
  const warm = x.createLinearGradient(ix, iy, ix + iw, iy + iw);
  warm.addColorStop(0, 'rgba(255,214,190,.2)'); warm.addColorStop(1, 'rgba(255,150,165,.1)');
  x.fillStyle = warm; x.fillRect(ix, iy, iw, iw);
  const vig = x.createRadialGradient(0, -h * 0.1, iw * 0.3, 0, 0, iw * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(88,28,42,.28)');
  x.fillStyle = vig; x.fillRect(ix, iy, iw, iw);
  x.strokeStyle = 'rgba(196,145,47,.55)'; x.lineWidth = 2; x.strokeRect(-h + 8, -h + 8, s - 16, s - 16);
  x.restore();
}

function drawPainted(x, im, px, py, w, flipX, flipY, alpha = 1) {
  if (!im) return;
  const h = w * (im.height / im.width);
  x.save();
  x.globalAlpha = alpha;
  x.translate(px, py); x.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  x.drawImage(im, 0, 0, w, h);
  x.restore();
}

// o = { title, dear, line, date, when, dishName, photo, place, address, pickupLine, sign, initial } — all text already translated
export async function makeBanner(o) {
  const all = Object.values(o).filter(v => typeof v === 'string' && !v.startsWith('data:')).join(' ');
  await Promise.all([
    document.fonts.load(`120px ${SCRIPT}`, all),
    document.fonts.load(`120px ${HAND}`, all),
    document.fonts.load(`500 60px ${SERIF}`, all),
    document.fonts.load(`600 60px ${SERIF}`, all),
    document.fonts.load(`700 60px ${SERIF}`, all),
    document.fonts.load(`italic 500 60px ${SERIF}`, all)
  ]).catch(() => {});
  const doodles = {};
  await Promise.all(DOODLES.map(async n => { try { doodles[n] = await loadImage(new URL(`../img/doodle/${n}.svg`, import.meta.url).href); } catch { /* the picture works without doodles */ } }));
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  // blush page with a warm and a sage glow
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FBE9E3'); bg.addColorStop(1, '#F5D5D1');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  for (const [gx, gy, col] of [[W, 0, 'rgba(255,238,214,.95)'], [0, H, 'rgba(207,226,201,.85)'], [W, H * 0.62, 'rgba(186,205,228,.5)']]) {
    const glow = x.createRadialGradient(gx, gy, 20, gx, gy, 760);
    glow.addColorStop(0, col); glow.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = glow; x.fillRect(0, 0, W, H);
  }

  // airmail frame (dusty rose and dusty blue stripes) around ivory stationery
  const M = 44, B = 24;
  x.save();
  x.shadowColor = 'rgba(110,45,60,.35)'; x.shadowBlur = 36; x.shadowOffsetY = 14;
  roundRect(x, M, M, W - 2 * M, H - 2 * M, 14); x.fillStyle = C.ivory; x.fill();
  x.restore();
  x.save();
  roundRect(x, M, M, W - 2 * M, H - 2 * M, 14); x.clip();
  x.fillStyle = C.ivory; x.fillRect(0, 0, W, H);
  const period = 56, band = 18;
  for (let a = -H; a < W + H; a += period) {
    for (const [off, col] of [[0, C.rosePaper], [period / 2, C.blue]]) {
      const s = a + off;
      x.beginPath(); x.moveTo(s, 0); x.lineTo(s + band, 0); x.lineTo(s + band - H, H); x.lineTo(s - H, H); x.closePath();
      x.fillStyle = col; x.fill();
    }
  }
  x.restore();
  const P = M + B;
  roundRect(x, P, P, W - 2 * P, H - 2 * P, 6);
  x.fillStyle = C.ivory; x.fill();
  roundRect(x, P + 14, P + 14, W - 2 * P - 28, H - 2 * P - 28, 4);
  x.strokeStyle = 'rgba(196,145,47,.55)'; x.lineWidth = 2; x.stroke();

  // painted flowers: top-left and top-right corners, bottom corners mirrored
  const G = 250;
  drawPainted(x, doodles.garland, P + 2, P + 2, G, false, false);
  drawPainted(x, doodles.garland, W - P - 2, P + 2, G, true, false);
  drawPainted(x, doodles.garland, P + 2, H - P - 2, G, false, true);
  drawPainted(x, doodles.garland, W - P - 2, H - P - 2, G, true, true);

  const cx = W / 2, maxW = W - 2 * P - 120;
  x.textAlign = 'center';

  drawSeal(x, cx, P + 6, 56, o.initial || '♥');

  fitText(x, o.title, cx, 262, maxW - 380, 150, s => `${s}px ${SCRIPT}`, C.rose);
  drawPainted(x, doodles.flourish, cx - 130, 282, 260, false, false);
  fitText(x, o.dear, cx, 366, maxW - 200, 64, s => `${s}px ${HAND}`, C.claret);
  fitText(x, o.line, cx, 418, maxW - 120, 38, s => `italic 500 ${s}px ${SERIF}`, C.inkSoft);
  if (o.date) fitText(x, o.date, cx, 572, maxW - 120, 190, s => `${s}px ${HAND}`, C.claret);
  else drawPainted(x, doodles.heart, cx - 105, 430, 210, false, false);   // no date chosen: a painted heart instead
  fitText(x, o.when, cx, 640, maxW - 120, 46, s => `700 ${s}px ${SERIF}`, C.rose);

  if (o.photo) {
    try { drawStamp(x, await loadImage(o.photo), cx, 826, 260, -0.05); } catch { /* the picture still works without the photo */ }
  }
  fitText(x, o.dishName, cx, 1010, maxW - 140, 56, s => `${s}px ${HAND}`, C.claret);

  let y = 1062;
  if (o.place) { fitText(x, o.place, cx, y, maxW - 140, 38, s => `700 ${s}px ${SERIF}`, C.claret); y += 44; }
  for (const line of [o.address, o.pickupLine].filter(Boolean)) {
    fitText(x, line, cx, y, maxW - 140, 30, s => `italic 500 ${s}px ${SERIF}`, C.inkSoft); y += 38;
  }
  fitText(x, o.sign, cx, Math.min(y + 72, 1226), maxW - 420, 92, s => `${s}px ${SCRIPT}`, C.rose);
  return cv;
}

// Returns true when the phone's share sheet took the picture; false after a download try.
export async function saveCanvas(canvas, filename, title = 'Invitation') {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], filename, { type: 'image/png' });
  // On phones the share sheet has "Save image", which puts it straight into the gallery.
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return true; }
    catch (e) { if (e.name === 'AbortError') return true; }
  }
  downloadBlob(blob, filename);
  return false;
}
