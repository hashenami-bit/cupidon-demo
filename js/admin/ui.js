// Small helpers shared by every part of the admin panel: elements, dates, numbers, toast, the side drawer.
export const $ = s => document.querySelector(s);
export const DAY = 86400000;
const TZ = 'Asia/Tashkent';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}
export const svg = (tag, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
export const dayOf = ms => new Date(ms + 5 * 3600 * 1000).toISOString().slice(0, 10);   // Tashkent day
export const fmtDate = ms => (ms ? new Date(ms).toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtTime = ms => (ms ? new Date(ms).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtNum = n => new Intl.NumberFormat('en-US').format(n || 0).replace(/,/g, ' ');
export const money = n => fmtNum(n) + ' so‘m';
export const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
export const ago = ms => {
  if (!ms) return '—';
  const d = Date.now() - ms;
  if (d < 3600e3) return Math.max(1, Math.round(d / 60e3)) + ' min ago';
  if (d < DAY) return Math.round(d / 3600e3) + ' h ago';
  if (d < 30 * DAY) return Math.round(d / DAY) + ' days ago';
  return fmtDate(ms);
};
let toastTimer = 0;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('is-on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}
// A button that needs a second press within 4 s (delete).
export function twoTap(btn, label, armedLabel, run) {
  let armed = 0;
  btn.textContent = label;
  btn.addEventListener('click', async () => {
    if (!armed) {
      btn.classList.add('is-armed'); btn.textContent = armedLabel;
      armed = setTimeout(() => { armed = 0; btn.classList.remove('is-armed'); btn.textContent = label; }, 4000);
      return;
    }
    clearTimeout(armed); armed = 0;
    btn.disabled = true;
    try { await run(); } finally { btn.disabled = false; btn.classList.remove('is-armed'); btn.textContent = label; }
  });
  return btn;
}


// ---------- drawer ----------
let lastFocus = null;
let drawerFor = '';   // what the open drawer shows ('letter:<id>' …), so a late answer never re-opens a closed one
export const stillOpen = key => !$('#drawer').hidden && drawerFor === key;
// key = 'letter:<id>' | 'customer:<uid>' | 'payment:<tx>'
export function openDrawer(key, title, ...blocks) {
  drawerFor = key;
  if ($('#drawer').hidden) lastFocus = document.activeElement;
  $('#drawerTitle').textContent = title;
  $('#drawerBody').replaceChildren(...blocks.filter(Boolean));
  $('#drawer').hidden = false;
  document.documentElement.style.overflow = 'hidden';
  $('#drawerClose').focus();
}
export function closeDrawer() {
  drawerFor = '';
  if ($('#drawer').hidden) return;
  $('#drawer').hidden = true;
  document.documentElement.style.overflow = '';
  lastFocus?.focus?.();
}
$('#drawerClose').addEventListener('click', closeDrawer);
$('#drawerBack').addEventListener('click', closeDrawer);
addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
export const block = (title, ...kids) => h('div', { class: 'ad-block' }, h('h3', { text: title }), ...kids);
export const facts = pairs => h('dl', { class: 'ad-dl' }, ...pairs.filter(([, v]) => v != null && v !== '').flatMap(([k, v]) => [h('dt', { text: k }), h('dd', {}, v)]));
export const chip = st => h('span', { class: 'st' + (st.tone ? ' st-' + st.tone : ''), text: st.label });
export const rowOpen = (tr, open) => { tr.dataset.open = ''; tr.addEventListener('click', e => { if (!e.target.closest('button,a')) open(); }); return tr; };
