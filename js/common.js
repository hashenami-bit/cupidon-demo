export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export const pad = n => String(n).padStart(2, '0');
export const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
export const fmtDM = iso => { const d = parseISO(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
export const weekday = iso => parseISO(iso).toLocaleDateString('en-GB', { weekday: 'long' });
export const fmtMs = ms => { const d = new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };

export const isUrl = s => /^[a-z][a-z0-9+.-]*:/i.test((s || '').trim()) || /^www\./i.test((s || '').trim());

// Same list as the server (functions/src/validate.js) — a server test checks both agree. Only real map sites, so a letter
// can't send her to a fake page. "maps.google.com.evil.io" does NOT pass.
const GOOGLE_TLD = '(com|uz|ru|kz|co\\.uk|de|com\\.tr|ae)';
const MAP_HOSTS = [
  new RegExp(`^(www\\.)?google\\.${GOOGLE_TLD}$`),
  new RegExp(`^maps\\.google\\.${GOOGLE_TLD}$`),
  /^maps\.app\.goo\.gl$/,
  /^goo\.gl$/,
  /^(www\.)?yandex\.(uz|ru|com|kz)$/,
  /^(www\.)?(2gis\.(uz|ru|kz|com)|go\.2gis\.com)$/
];
export function isMapUrl(s) {
  let u;
  try { u = new URL((s || '').trim()); } catch { return false; }
  if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!MAP_HOSTS.some(re => re.test(host))) return false;
  if (/^(www\.)?google\./.test(host) || host === 'goo.gl' || /yandex\./.test(host)) return u.pathname.startsWith('/maps');
  return true;
}

// Map button target: his map link if it is a real map link, otherwise a Google Maps search
// for the typed address. Any other link gives no button ('').
export function mapsUrl(place, location) {
  const loc = (location || '').trim();
  if (isUrl(loc)) return isMapUrl(loc) ? loc : '';
  const q = [place, loc].filter(Boolean).join(', ');
  return q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
}

// Her link: invite.html#<id>. The part after # never reaches any server or log.
export const inviteLink = id => new URL('invite.html#' + id, location.href).href;
// Reads an id from "#<prefix><id>" (new links) or "?<name>=<id>" (old links, Octo return address).
export function linkParam(name, prefix, pattern) {
  const m = location.hash.match(new RegExp('^#' + prefix + '(' + pattern + ')'));
  if (m) return m[1];
  return new URLSearchParams(location.search).get(name) || '';
}
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const wait = ms => new Promise(r => setTimeout(r, ms));

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
    document.body.append(ta); ta.select();
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
    focus() { boxes[0].focus(); },
    setDisabled(v) { boxes.forEach(b => (b.disabled = v)); }
  };
}
