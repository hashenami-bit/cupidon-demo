// Draws the invitation as a 1080×1350 picture (good for phone galleries and Instagram).
const C = {
  wine: '#2A0E1F', paper: '#FDF0EC', stampPaper: '#FFF9F6', ink: '#3B1626', inkSoft: '#7A5566',
  seal: '#B3122E', sealDark: '#7E0B20', blue: '#27407A', gold: '#E9B872'
};
const SCRIPT = '"Pinyon Script", "Great Vibes", cursive';   // Great Vibes covers Cyrillic
const SERIF = '"Cormorant Garamond", Georgia, serif';
const NUMS = '"Cormorant Infant", "Cormorant Garamond", Georgia, serif';   // same look, straight numbers

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

// Writes centred text, shrinking the font until it fits maxW.
function fitText(x, text, cx, y, maxW, size, font, color) {
  let s = size;
  x.font = font(s);
  while (x.measureText(text).width > maxW && s > 18) { s -= 2; x.font = font(s); }
  x.fillStyle = color;
  x.fillText(text, cx, y);
}

function drawSeal(x, cx, cy, r, letter) {
  const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#D8354F'); g.addColorStop(0.5, C.seal); g.addColorStop(1, C.sealDark);
  x.save();
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 18; x.shadowOffsetY = 6;
  x.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 18) {
    const rr = r * (1 + 0.04 * Math.sin(a * 5) + 0.025 * Math.cos(a * 7));
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    a === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
  }
  x.fillStyle = g; x.fill();
  x.restore();
  x.beginPath(); x.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  x.strokeStyle = 'rgba(255,215,200,.35)'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#FFD9CF'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `${Math.round(r * 1.05)}px ${SCRIPT}`;
  x.fillText(letter, cx, cy + r * 0.08);
  x.textBaseline = 'alphabetic';
}

function drawStamp(x, img, cx, cy, size, angle) {
  const s = size, h = s / 2, hole = 9, gap = 26, inset = 20;
  x.save();
  x.translate(cx, cy); x.rotate(angle);
  x.shadowColor = 'rgba(59,22,38,.28)'; x.shadowBlur = 24; x.shadowOffsetY = 10;
  x.fillStyle = C.stampPaper; x.fillRect(-h, -h, s, s);
  x.shadowColor = 'transparent';
  // perforation: bite small circles out of each edge
  x.fillStyle = C.paper;
  const n = Math.round(s / gap), step = s / n;
  for (let i = 0; i <= n; i++) {
    const p = -h + i * step;
    for (const [px, py] of [[p, -h], [p, h], [-h, p], [h, p]]) { x.beginPath(); x.arc(px, py, hole, 0, Math.PI * 2); x.fill(); }
  }
  const iw = s - inset * 2;
  const scale = Math.max(iw / img.width, iw / img.height);
  const sw = iw / scale, sh = iw / scale;
  x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, -h + inset, -h + inset, iw, iw);
  x.restore();
}

// o = { title, dear, line, date, when, dishName, photo, place, address, pickupLine, sign, initial } — all text already translated
export async function makeBanner(o) {
  const all = Object.values(o).filter(v => typeof v === 'string' && !v.startsWith('data:')).join(' ');
  await Promise.all([
    document.fonts.load(`120px ${SCRIPT}`, all),
    document.fonts.load(`600 60px ${SERIF}`, all),
    document.fonts.load(`500 60px ${SERIF}`, all),
    document.fonts.load(`italic 500 60px ${SERIF}`, all),
    document.fonts.load(`italic 600 60px ${SERIF}`, all),
    document.fonts.load(`600 60px ${NUMS}`, all)
  ]).catch(() => {});
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  x.fillStyle = C.wine; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W / 2, 0, 40, W / 2, 0, 1100);
  glow.addColorStop(0, '#4E1B39'); glow.addColorStop(1, 'rgba(42,14,31,0)');
  x.fillStyle = glow; x.fillRect(0, 0, W, H);

  // airmail frame
  const M = 44, B = 24;
  x.save();
  roundRect(x, M, M, W - 2 * M, H - 2 * M, 16); x.clip();
  x.fillStyle = C.paper; x.fillRect(0, 0, W, H);
  const period = 56, band = 18;
  for (let a = -H; a < W + H; a += period) {
    for (const [off, col] of [[0, C.seal], [period / 2, C.blue]]) {
      const s = a + off;
      x.beginPath(); x.moveTo(s, 0); x.lineTo(s + band, 0); x.lineTo(s + band - H, H); x.lineTo(s - H, H); x.closePath();
      x.fillStyle = col; x.fill();
    }
  }
  x.restore();
  const P = M + B;
  roundRect(x, P, P, W - 2 * P, H - 2 * P, 6);
  x.fillStyle = C.paper; x.fill();

  const cx = W / 2, maxW = W - 2 * P - 110;
  x.textAlign = 'center';

  drawSeal(x, cx, P + 4, 56, o.initial || '♥');

  fitText(x, o.title, cx, 250, maxW, 146, s => `${s}px ${SCRIPT}`, C.seal);
  fitText(x, o.dear, cx, 330, maxW, 56, s => `italic 500 ${s}px ${SERIF}`, C.ink);
  fitText(x, o.line, cx, 385, maxW, 40, s => `500 ${s}px ${SERIF}`, C.inkSoft);
  fitText(x, o.date, cx, 548, maxW, 168, s => `600 ${s}px ${NUMS}`, C.ink);
  fitText(x, o.when, cx, 616, maxW, 48, s => `600 ${s}px ${NUMS}`, C.seal);

  if (o.photo) {
    try { drawStamp(x, await loadImage(o.photo), cx, 790, 260, -0.05); } catch { /* the picture still works without the photo */ }
  }
  fitText(x, o.dishName, cx, 990, maxW, 44, s => `italic 600 ${s}px ${SERIF}`, C.ink);

  let y = 1046;
  if (o.place) { fitText(x, o.place, cx, y, maxW, 42, s => `600 ${s}px ${SERIF}`, C.ink); y += 44; }
  for (const line of [o.address, o.pickupLine].filter(Boolean)) {
    fitText(x, line, cx, y, maxW, 32, s => `500 ${s}px ${SERIF}`, C.inkSoft); y += 38;
  }
  fitText(x, o.sign, cx, Math.min(y + 64, 1224), maxW, 64, s => `${s}px ${SCRIPT}`, C.seal);
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
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return false;
}
