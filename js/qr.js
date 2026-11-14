// A QR code of her link, drawn on his device (the link never leaves it). The QR maker is kept on our own site
// (public/vendor/README.md): the page's security rules allow no outside scripts.
import qrcode from '../vendor/qrcode-generator-2.0.4/qrcode.js';

const INK = '#4B1727', PAPER = '#FFFFFF';   // claret on white: dark enough for every phone camera
const MARGIN = 4;                            // the quiet border scanners need, in squares

function matrix(text) {
  const qr = qrcode(0, 'M');   // 0 = the smallest size that fits; M = still reads with a small smudge
  qr.addData(text);            // the link is plain ASCII (https://…/invite.html#id.secret)
  qr.make();
  return qr;
}

// Draws the code on a canvas, `scale` pixels per square.
export function drawQR(canvas, text, scale = 8) {   // drawn large and shown small: sharp on every screen
  const qr = matrix(text), n = qr.getModuleCount(), size = (n + MARGIN * 2) * scale;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = INK;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.isDark(r, c)) ctx.fillRect((c + MARGIN) * scale, (r + MARGIN) * scale, scale, scale);
  }
  return canvas;
}

// A big PNG of the code, sharp enough to print on a card.
export function qrBlob(text) {
  const canvas = drawQR(document.createElement('canvas'), text, 16);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('no-picture'))), 'image/png'));
}
