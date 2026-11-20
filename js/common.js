export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export const pad = n => String(n).padStart(2, '0');
export const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
export const fmtDM = iso => { const d = parseISO(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
export const weekday = iso => parseISO(iso).toLocaleDateString('en-GB', { weekday: 'long' });
export const fmtMs = ms => { const d = new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
export const fmtTime = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
// The small "opened · tried No" line in his list, as [text key, values]. Letters made before opens were tracked
// have no openedAt at all (not null): say nothing about them. `answer` is her unlocked answer or null.
export function seenParts(row, answer) {
  const out = [];
  if (row.status === 'active') {
    if (typeof row.openedAt === 'number') out.push(['rowOpened', { date: fmtMs(row.openedAt), time: fmtTime(row.openedAt) }]);
    else if (row.openedAt === null && !row.meta?.answer) out.push(['rowNotOpened', {}]);
  }
  const tries = answer?.no;
  if (Number.isInteger(tries) && tries > 0) out.push(['rowNoTries', { n: Math.min(tries, 99) }]);
  return out;
}

// One copy of the map-link rules, shared with the server (public/js/shared/validate.js).
// Imported first (a bare `export … from` would not make them usable inside this file, e.g. in mapsUrl).
import { isMapUrl, looksLikeUrl as isUrl } from './shared/validate.js';
export { isMapUrl, isUrl };

export function mapsUrl(place, location) {
  const loc = (location || '').trim();
  if (isUrl(loc)) return isMapUrl(loc) ? loc : '';
  const q = [place, loc].filter(Boolean).join(', ');
  return q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
}

// Her link: invite.html#<id>.<secret> (old letters: no secret). The part after # never reaches any server or log.
// An address from the site root, made from this file's own address (js/ → root): right on every page, also /uz/
// and /ru/, and on the GitHub demo's sub-folder.
export const siteUrl = path => new URL('../' + path, import.meta.url).href;
export const inviteLink = (id, secret = '') => siteUrl('invite.html#' + id + (secret ? '.' + secret : ''));
// His own try of her page: the same link with "?preview=1" before the "#" (not part of the secret). Her page then asks the
// server not to mark the letter as opened and never sends an answer. The link he copies or shares stays the plain one.
export const previewLink = link => link.replace('#', '?preview=1#');
// Is this page load a preview? Only when HIS device says so: the address has "?preview=1" AND he pressed the real "Open it like
// she will" button a moment ago (a marker in his localStorage, younger than 10 minutes), OR this tab is already a preview (a
// sessionStorage flag, so a reload keeps it). An address alone is never enough: if he sends her that address by mistake, she
// still gets the real page and her answer is sent.
export const PREVIEW_MARK_MS = 10 * 60 * 1000;
export function isPreview({ search = '', markedAt = null, session = false, now = Date.now() } = {}) {
  if (session === true) return true;
  if (new URLSearchParams(search).get('preview') !== '1') return false;
  const age = now - Number(markedAt);
  return markedAt != null && Number.isFinite(age) && age >= -1000 && age < PREVIEW_MARK_MS;
}
// Reads { id, secret } from her link: "#<id>.<secret>", "#<id>" or the old "?i=<id>".
export function readInviteLink() {
  const m = location.hash.match(/^#([A-Za-z0-9]{16,40})(?:\.([A-Za-z0-9_-]{16,64}))?/);
  if (m) return { id: m[1], secret: m[2] || '' };
  return { id: new URLSearchParams(location.search).get('i') || '', secret: '' };
}
// Reads an id from "#<prefix><id>" (new links) or "?<name>=<id>" (old links, Octo return address).
export function linkParam(name, prefix, pattern) {
  const m = location.hash.match(new RegExp('^#' + prefix + '(' + pattern + ')'));
  if (m) return m[1];
  return new URLSearchParams(location.search).get(name) || '';
}
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const wait = ms => new Promise(r => setTimeout(r, ms));
// Only plain image data (our own resized photos) is ever shown: her pop-up photos, his draft.
export const isImageData = p => typeof p === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p);
// Browsers inside Telegram, Instagram, Facebook, Line and Android web views: downloads and Google sign-in often don't work there.
export const inAppBrowser = () => /Telegram|Instagram|FBAN|FBAV|Line\/|; wv\)/i.test(navigator.userAgent);
// Saves a file the plain way (a temporary download link).
export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

let toastTimer;
export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2200);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select(); ta.setSelectionRange(0, text.length);   // iOS needs the explicit range
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

// Four one-digit boxes. Calls onComplete(code) when all four are filled.
export function pinInput(container, onComplete) {
  const boxes = $$('input', container);
  const full = () => boxes.every(b => /^\d$/.test(b.value));
  const value = () => boxes.map(b => b.value).join('');
  const check = () => {
    container.classList.toggle('is-full', full());
    if (full() && onComplete) onComplete(value());
  };
  const fill = (digits, from) => {
    for (let k = 0; k < digits.length && from + k < 4; k++) boxes[from + k].value = digits[k];
    boxes[Math.min(3, from + digits.length)].focus();
    check();
  };
  boxes.forEach((b, i) => {
    b.addEventListener('input', () => {
      const d = b.value.replace(/\D/g, '');
      if (d.length > 1) { fill(d, i); return; }
      b.value = d;
      if (d && i < 3) boxes[i + 1].focus();
      check();
    });
    b.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !b.value && i > 0) { e.preventDefault(); boxes[i - 1].value = ''; boxes[i - 1].focus(); check(); }
      else if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
      else if (e.key === 'ArrowRight' && i < 3) boxes[i + 1].focus();
    });
    b.addEventListener('paste', e => {
      const d = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
      if (d) { e.preventDefault(); fill(d, i); }
    });
    b.addEventListener('focus', () => b.select());
  });
  return {
    value, full,
    clear() { boxes.forEach(b => (b.value = '')); container.classList.remove('is-full'); boxes[0].focus(); },
    // Puts saved digits back (his draft) without moving focus or calling onComplete.
    set(v) { boxes.forEach((b, k) => (b.value = /^\d$/.test(v?.[k] || '') ? v[k] : '')); container.classList.toggle('is-full', full()); },
    focus() { boxes[0].focus(); },
    setDisabled(v) { boxes.forEach(b => (b.disabled = v)); }
  };
}

// Hearts fly out from an element (her "Yes" and the home page demo). Skipped for reduced motion.
export function heartBurst(from) {
  if (reducedMotion()) return;
  const r = from.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const box = Object.assign(document.createElement('div'), { className: 'heart-burst' });
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const img = Object.assign(new Image(), { alt: '', src: siteUrl(`img/doodle/${i % 2 ? 'heart-blush' : 'heart'}.svg`) });
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4, dist = 90 + Math.random() * 90, size = 16 + Math.random() * 16;
    Object.assign(img.style, { left: `${cx - size / 2}px`, top: `${cy - size / 2}px`, width: `${size}px` });
    img.animate([
      { transform: 'translate(0, 0) scale(.3)', opacity: 0 },
      { transform: `translate(${Math.cos(a) * dist * 0.7}px, ${Math.sin(a) * dist * 0.7}px) scale(1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${Math.cos(a) * dist}px, ${Math.sin(a) * dist + 40}px) scale(.9)`, opacity: 0 }
    ], { duration: 1500 + Math.random() * 500, delay: 120 + Math.random() * 160, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'both' });
    box.append(img);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 2600);
}

// Her answer is locked by her page, but anyone with her link + code can lock anything: only a dish number and a
// plain date/time (or none) are used here, so nothing odd reaches his calendar file (security scan 2026-11-14, F1).
export function answerShapeOk(a) {
  if (!a || typeof a !== 'object' || !Number.isInteger(a.dish) || a.dish < 0 || a.dish > 2) return false;
  // Anyone with the link and code can write the answer: an odd "No" count (e.g. an object) once stopped the admin
  // panel from opening that letter. Old answers have no count at all.
  if (a.no != null && !(Number.isInteger(a.no) && a.no >= 0 && a.no <= 9999)) return false;
  if (a.date == null) return a.time == null;
  return typeof a.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.date) && typeof a.time === 'string' && /^\d{2}:\d{2}$/.test(a.time);
}

