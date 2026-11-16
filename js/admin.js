// Admin panel (admin.html): dashboard, letters, customers (CRM), payments, health.
// Data comes from /api/adminOverview (functions/src/admin.js), only with the pass from the username + password login.
// Her answers are unlocked here in the browser with the answer key from his summary (same as his list in boy.js).
import * as store from './store.js';
import { answerKeyFrom, deriveKey, decryptJSON, cryptoReady } from './crypto.js';
import { answerShapeOk } from './common.js';

const $ = s => document.querySelector(s);
const DAY = 86400000;
const TZ = 'Asia/Tashkent';

// ---------- small helpers ----------
function h(tag, attrs = {}, ...kids) {
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
const svg = (tag, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const dayOf = ms => new Date(ms + 5 * 3600 * 1000).toISOString().slice(0, 10);   // Tashkent day
const fmtDate = ms => (ms ? new Date(ms).toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtTime = ms => (ms ? new Date(ms).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtNum = n => new Intl.NumberFormat('en-US').format(n || 0).replace(/,/g, ' ');
const money = n => fmtNum(n) + ' so‘m';
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
const ago = ms => {
  if (!ms) return '—';
  const d = Date.now() - ms;
  if (d < 3600e3) return Math.max(1, Math.round(d / 60e3)) + ' min ago';
  if (d < DAY) return Math.round(d / 3600e3) + ' h ago';
  if (d < 30 * DAY) return Math.round(d / DAY) + ' days ago';
  return fmtDate(ms);
};
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('is-on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}
// A button that needs a second press within 4 s (delete).
function twoTap(btn, label, armedLabel, run) {
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

// ---------- data ----------
let data = null;          // the overview from the server
let view = null;          // derived: letters, customers, payments with everything joined
const answers = new Map();   // letter id → decrypted answer | 'unreadable'

async function readAnswer(l) {
  const m = l.meta;
  if (!m?.answer || answers.has(l.id)) return;
  try {
    if (!cryptoReady()) throw new Error('no crypto');
    const key = m.answerKey ? await answerKeyFrom(m.answerKey) : await deriveKey(m.pin, m.salt);
    const a = await decryptJSON(key, m.answer);
    answers.set(l.id, answerShapeOk(a) ? a : 'unreadable');
  } catch { answers.set(l.id, 'unreadable'); }
}

// What a letter shows as its state (same words as his list where they exist).
function letterState(l) {
  const inv = l.invite, m = l.meta || {};
  if (inv.status === 'unpaid') return { key: 'unpaid', label: 'Not paid', tone: 'warn' };
  if (inv.locked) return { key: 'locked', label: 'Locked (wrong codes)', tone: 'bad' };
  if (m.answer || inv.answered) {
    const a = answers.get(l.id);
    if (a && a !== 'unreadable' && a.date) return { key: 'yes', label: 'Said yes + day', tone: 'good' };
    return { key: 'dish', label: 'Picked a dish', tone: 'good' };
  }
  if (typeof inv.openedAt === 'number') return m.ask === 'none' ? { key: 'read', label: 'Read (letter only)', tone: 'good' } : { key: 'opened', label: 'Opened', tone: 'main' };
  if (inv.openedAt === null) return { key: 'notOpened', label: 'Not opened yet', tone: '' };
  return { key: 'waiting', label: 'Sent (old letter)', tone: '' };
}
const STATES = [['all', 'All'], ['unpaid', 'Not paid'], ['notOpened', 'Not opened'], ['opened', 'Opened'], ['read', 'Letter only'], ['dish', 'Picked a dish'], ['yes', 'Said yes + day'], ['locked', 'Locked'], ['waiting', 'Old']];

function build() {
  const accounts = new Map(data.accounts.map(a => [a.uid, a]));
  const crm = new Map(data.customers.map(c => [c.uid, c]));
  const payByLetter = new Map();
  for (const p of data.payments) {
    if (!payByLetter.has(p.inviteId)) payByLetter.set(p.inviteId, []);
    payByLetter.get(p.inviteId).push(p);
  }
  // A payment needs a refund: paid but no letter, wrong amount, or a second success for one letter.
  const firstSuccess = new Map();
  for (const p of [...data.payments].filter(p => p.status === 'succeeded').sort((a, b) => (a.paidAt || 0) - (b.paidAt || 0))) {
    if (!firstSuccess.has(p.inviteId)) firstSuccess.set(p.inviteId, p.tx);
  }
  const payments = data.payments.map(p => {
    const second = p.status === 'succeeded' && firstSuccess.get(p.inviteId) !== p.tx;
    const refund = !p.refundedAt && (p.status === 'paid-no-letter' || p.status === 'amount-mismatch' || second);
    return { ...p, second, refund, account: accounts.get(p.ownerUid) };
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const letters = data.letters.map(l => {
    const m = l.meta || {};
    const account = accounts.get(l.invite.ownerUid);
    const state = letterState(l);
    const search = [m.girlName, m.from, account?.email, account?.name, m.pin, l.id, l.invite.hint].filter(Boolean).join(' ').toLowerCase();
    return { ...l, state, account, payments: payByLetter.get(l.id) || [], search };
  }).sort((a, b) => (b.invite.createdAt || 0) - (a.invite.createdAt || 0));

  const uids = new Set([...accounts.keys(), ...crm.keys(), ...letters.map(l => l.invite.ownerUid)]);
  const customers = [...uids].map(uid => {
    const a = accounts.get(uid) || { uid, email: '', name: '' };
    const c = crm.get(uid) || {};
    const mine = letters.filter(l => l.invite.ownerUid === uid);
    const paid = payments.filter(p => p.ownerUid === uid && p.status === 'succeeded' && !p.refundedAt).reduce((s, p) => s + (p.amount || 0), 0);
    const tags = c.crm?.tags || [];
    const note = c.crm?.note || '';
    const search = [a.email, a.name, uid, tags.join(' '), note].join(' ').toLowerCase();
    return { uid, account: a, terms: c.terms || null, tags, note, noteAt: c.crm?.updatedAt || null, letters: mine, paid, search };
  }).sort((a, b) => (b.account.lastSignIn || b.account.createdAt || 0) - (a.account.lastSignIn || a.account.createdAt || 0));

  view = { letters, customers, payments, byId: new Map(letters.map(l => [l.id, l])), byUid: new Map(customers.map(c => [c.uid, c])) };
}

async function load(fresh = false) {
  $('#refreshBtn').disabled = true;
  $('#loadError').hidden = true;
  try {
    data = await store.admin('Overview', { fresh });
    await Promise.all(data.letters.map(readAnswer));
    build();
    $('#stamp').textContent = 'Updated ' + fmtTime(data.at);
    if (data.accountsError) { $('#loadError').textContent = 'Emails are missing: the server could not list Google accounts (' + data.accountsError + '). Its key needs the Firebase Authentication Viewer role.'; $('#loadError').hidden = false; }
    $('#cntLetters').textContent = view.letters.length;
    $('#cntCustomers').textContent = view.customers.length;
    const refunds = view.payments.filter(p => p.refund).length;
    $('#cntRefund').textContent = refunds || '';
    renderAll();
    return true;
  } catch (e) {
    if (e.reason === 'admin-session' || e.code === 'unauthenticated' || e.code === 'permission-denied') {
      store.adminLogout();
      showGate('Your session ended. Log in again.');
      return 'session';
    }
    $('#loadError').textContent = e.reason === 'network' ? 'Could not reach the server. Check the connection and press Refresh.' : 'Loading failed (' + (e.code || e.reason || e.message) + '). Press Refresh to try again.';
    $('#loadError').hidden = false;
    return false;
  } finally { $('#refreshBtn').disabled = false; }
}

// ---------- tabs ----------
const TABS = ['overview', 'letters', 'customers', 'payments', 'health'];
function showTab() {
  const tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  for (const t of TABS) $('#tab-' + t).hidden = t !== tab;
  for (const a of document.querySelectorAll('.ad-tabs a')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  closeDrawer();
}
addEventListener('hashchange', showTab);

function renderAll() {
  renderOverview();
  renderLetters();
  renderCustomers();
  renderPayments();
  renderHealth();
}

// ---------- overview ----------
function renderOverview() {
  const L = view.letters, now = Date.now(), today = dayOf(now);
  const sent = L.filter(l => l.invite.status === 'active');
  const opened = L.filter(l => typeof l.invite.openedAt === 'number' || l.meta?.answer);
  const answered = L.filter(l => l.meta?.answer || l.invite.answered);
  const withDay = answered.filter(l => answers.get(l.id)?.date);
  const paidSum = view.payments.filter(p => p.status === 'succeeded' && !p.refundedAt).reduce((s, p) => s + (p.amount || 0), 0);
  const sealedToday = L.filter(l => dayOf(l.invite.createdAt || 0) === today).length;
  const newCustomers = view.customers.filter(c => c.account.createdAt && now - c.account.createdAt < 7 * DAY).length;

  const kpi = (num, label, sub) => h('div', { class: 'ad-kpi' }, h('b', { text: num }), h('span', { text: label }), sub ? h('small', { text: sub }) : null);
  $('#kpis').replaceChildren(
    kpi(fmtNum(L.length), 'Letters in the database', sealedToday ? `+${sealedToday} today` : 'none today'),
    kpi(fmtNum(sent.length), 'Sent to her'),
    kpi(pct(opened.length, sent.length), 'Opened by her', `${opened.length} of ${sent.length}`),
    kpi(pct(answered.length, opened.filter(l => l.meta?.ask !== 'none').length), 'Said yes', `${answered.length} answers`),
    kpi(fmtNum(view.customers.length), 'Customers', newCustomers ? `+${newCustomers} this week` : ''),
    kpi(data.settings.price > 0 || paidSum ? fmtNum(paidSum) : 'Free', paidSum || data.settings.price > 0 ? 'So‘m earned' : 'Earned', data.settings.price > 0 ? 'after refunds' : 'letters are free now')
  );

  const steps = [['Sealed', L.length], ['Sent (paid)', sent.length], ['Opened', opened.length], ['Picked a dish', answered.length], ['Set a day', withDay.length]];
  const top = Math.max(1, L.length);
  $('#journey').replaceChildren(...steps.map(([name, n], i) => {
    const fill = h('div', { class: 'j-fill' });
    requestAnimationFrame(() => { fill.style.width = (n / top) * 100 + '%'; });
    return h('li', {}, h('span', { class: 'j-name', text: name }), h('div', { class: 'j-bar', 'aria-hidden': 'true' }, fill),
      h('span', { class: 'j-num' }, fmtNum(n), i ? h('small', { text: pct(n, steps[i - 1][1]) }) : null));
  }));

  const days = [...Array(30)].map((_, i) => dayOf(now - (29 - i) * DAY));
  const count = days.map(d => L.filter(l => dayOf(l.invite.createdAt || 0) === d).length);
  const ans = days.map(d => L.filter(l => l.meta?.answeredAt && dayOf(l.meta.answeredAt) === d).length);
  barChart($('#chartLetters'), days, [count, ans], ['Sealed', 'Answered'], fmtNum);
  if (data.settings.price > 0 || view.payments.some(p => p.status === 'succeeded')) {
    const sums = days.map(d => view.payments.filter(p => p.status === 'succeeded' && !p.refundedAt && (p.paidAt || p.createdAt) && dayOf(p.paidAt || p.createdAt) === d).reduce((s, p) => s + (p.amount || 0), 0));
    barChart($('#chartMoney'), days, [sums], ['so‘m'], n => fmtNum(n));
    $('#moneyLead').textContent = 'Paid letters, last 30 days';
  } else {
    $('#chartMoney').replaceChildren(h('p', { class: 'ad-empty', text: 'Letters are free right now (PRICE_UZS = 0). Money shows here once payments are on.' }));
    $('#moneyLead').textContent = '';
  }

  const todo = [];
  const refunds = view.payments.filter(p => p.refund);
  if (refunds.length) todo.push(['bad', `${refunds.length} payment${refunds.length > 1 ? 's need' : ' needs'} a refund`, () => { location.hash = '#payments'; setFilter('pay', 'refund'); }]);
  const locked = L.filter(l => l.invite.locked);
  if (locked.length) todo.push(['warn', `${locked.length} letter${locked.length > 1 ? 's are' : ' is'} locked after 30 wrong codes`, () => { location.hash = '#letters'; setFilter('letter', 'locked'); }]);
  const stale = sent.filter(l => l.invite.openedAt === null && now - (l.invite.createdAt || now) > 3 * DAY);
  if (stale.length) todo.push(['warn', `${stale.length} sent letter${stale.length > 1 ? 's' : ''} not opened after 3 days`, () => { location.hash = '#letters'; setFilter('letter', 'notOpened'); }]);
  const lim = data.limitsAll, max = data.settings.maxTotalPerDay;
  if (max && lim?.day === today && lim.count >= max * 0.8) todo.push(['bad', `Today's letters for everybody: ${lim.count} of ${max}`, () => { location.hash = '#health'; }]);
  if (L.length > 1200) todo.push(['bad', `${L.length} letters stored: the free database holds about 1,500 with photos. Move to Blaze soon.`, () => { location.hash = '#health'; }]);
  if (!todo.length) todo.push(['ok', 'Nothing needs you right now.', null]);
  $('#todo').replaceChildren(...todo.map(([tone, text, go]) => h('li', { class: 'is-' + tone }, go ? h('button', { type: 'button', onclick: go, text }) : text)));
}

// One or two bar series, side by side per day. Plain SVG, no library (the page CSP allows no outside scripts).
function barChart(box, days, series, names, fmt) {
  const W = 600, H = 180, pad = { l: 34, r: 6, t: 10, b: 22 };
  const max = Math.max(1, ...series.flat());
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${names.join(' and ')} per day, last 30 days; highest ${fmt(max)}` });
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, slot = iw / days.length, bw = Math.max(2, (slot - 3) / series.length);
  for (const v of [0, max]) {
    const y = pad.t + ih - (v / max) * ih;
    s.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, class: 'c-axis' }));
    const t = svg('text', { x: pad.l - 6, y: y + 4, 'text-anchor': 'end' }); t.textContent = fmt(v); s.append(t);
  }
  series.forEach((vals, si) => vals.forEach((v, i) => {
    if (!v) return;
    const bh = (v / max) * ih;
    const r = svg('rect', { x: pad.l + i * slot + 1.5 + si * bw, y: pad.t + ih - bh, width: bw, height: bh, rx: 1.5, class: si ? 'c-bar c-bar-2' : 'c-bar' });
    const tip = svg('title'); tip.textContent = `${days[i]}: ${fmt(v)} ${names[si]}`; r.append(tip);
    s.append(r);
  }));
  for (const i of [0, 14, 29]) {
    const t = svg('text', { x: pad.l + i * slot + slot / 2, y: H - 6, 'text-anchor': i === 0 ? 'start' : i === 29 ? 'end' : 'middle' });
    t.textContent = new Date(days[i] + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    s.append(t);
  }
  const legend = series.length > 1 ? h('div', { class: 'ad-legend' }, ...names.map((n, i) => h('span', {}, h('i', { class: i ? 's2' : '' }), n))) : null;
  box.replaceChildren(s, legend || '');
}

// ---------- filters ----------
const filters = { letter: 'all', cust: 'all', pay: 'all' };
function setFilter(kind, value) {
  filters[kind] = value;
  ({ letter: renderLetters, cust: renderCustomers, pay: renderPayments })[kind]();
}
function chips(box, kind, options) {
  box.replaceChildren(...options.map(([key, label, n]) => h('button', {
    type: 'button', class: 'ad-chip', 'aria-pressed': String(filters[kind] === key), onclick: () => setFilter(kind, key)
  }, label, n != null ? h('small', { text: n }) : null)));
}
const chip = st => h('span', { class: 'st' + (st.tone ? ' st-' + st.tone : ''), text: st.label });
const rowOpen = (tr, open) => { tr.dataset.open = ''; tr.addEventListener('click', e => { if (!e.target.closest('button,a')) open(); }); return tr; };

// ---------- letters ----------
function answerText(l) {
  const a = answers.get(l.id), m = l.meta || {};
  if (!m.answer) return m.ask === 'none' ? 'Letter only' : '';
  if (a === 'unreadable' || !a) return 'Answered (unreadable)';
  const dish = m.dishes?.[a.dish]?.name || `Dish ${a.dish + 1}`;
  return a.date ? `${dish} · ${a.date} ${a.time}` : `${dish} · day later`;
}
function renderLetters() {
  const q = $('#letterSearch').value.trim().toLowerCase();
  const counts = Object.fromEntries(STATES.map(([k]) => [k, k === 'all' ? view.letters.length : view.letters.filter(l => l.state.key === k).length]));
  chips($('#letterFilters'), 'letter', STATES.filter(([k]) => k === 'all' || counts[k]).map(([k, label]) => [k, label, counts[k]]));
  const rows = view.letters.filter(l => (filters.letter === 'all' || l.state.key === filters.letter) && (!q || l.search.includes(q)));
  $('#letterTable tbody').replaceChildren(...rows.map(l => {
    const m = l.meta || {};
    return rowOpen(h('tr', {},
      h('td', { class: 't-num' }, fmtDate(l.invite.createdAt), h('span', { class: 't-sub', text: l.invite.lang?.toUpperCase() })),
      h('td', {}, h('button', { type: 'button', class: 'ad-row-btn', onclick: () => openLetter(l.id), text: `${m.from || '?'} → ${m.girlName || '?'}` }), l.invite.hint ? h('span', { class: 't-sub', text: l.invite.hint }) : null),
      h('td', {}, chip(l.state)),
      h('td', { class: 't-code', text: m.pin || '' }),
      h('td', { text: answerText(l) }),
      h('td', {}, l.account?.email || h('span', { class: 't-sub', text: l.invite.ownerUid?.slice(0, 8) }))
    ), () => openLetter(l.id));
  }));
  $('#letterEmpty').hidden = rows.length > 0;
}
$('#letterSearch').addEventListener('input', () => view && renderLetters());

// ---------- customers ----------
function renderCustomers() {
  const q = $('#custSearch').value.trim().toLowerCase();
  const tagCount = new Map();
  for (const c of view.customers) for (const t of c.tags) tagCount.set(t, (tagCount.get(t) || 0) + 1);
  const opts = [['all', 'All', view.customers.length], ['paying', 'Paid', view.customers.filter(c => c.paid > 0).length], ['noLetter', 'No letter yet', view.customers.filter(c => !c.letters.length).length],
    ...[...tagCount].sort((a, b) => b[1] - a[1]).map(([t, n]) => ['tag:' + t, '#' + t, n])];
  chips($('#custFilters'), 'cust', opts);
  const f = filters.cust;
  const rows = view.customers.filter(c => (f === 'all' || (f === 'paying' && c.paid > 0) || (f === 'noLetter' && !c.letters.length) || (f.startsWith('tag:') && c.tags.includes(f.slice(4)))) && (!q || c.search.includes(q)));
  $('#custTable tbody').replaceChildren(...rows.map(c => rowOpen(h('tr', {},
    h('td', {}, h('button', { type: 'button', class: 'ad-row-btn', onclick: () => openCustomer(c.uid), text: c.account.email || c.uid.slice(0, 10) }), c.account.name ? h('span', { class: 't-sub', text: c.account.name }) : null),
    h('td', { class: 't-num', text: fmtDate(c.account.createdAt) }),
    h('td', { class: 't-num', text: ago(c.account.lastSignIn) }),
    h('td', { class: 't-num' }, String(c.letters.length), c.letters.length ? h('span', { class: 't-sub', text: `${c.letters.filter(l => l.meta?.answer).length} answered` }) : null),
    h('td', { class: 't-num', text: c.paid ? money(c.paid) : '—' }),
    h('td', {}, ...c.tags.map(t => h('span', { class: 'tag', text: t })), c.note ? h('span', { class: 't-sub', text: c.note.length > 70 ? c.note.slice(0, 70) + '…' : c.note }) : null)
  ), () => openCustomer(c.uid))));
  $('#custEmpty').hidden = rows.length > 0;
}
$('#custSearch').addEventListener('input', () => view && renderCustomers());

// ---------- payments ----------
const PAY_STATE = {
  succeeded: ['Paid', 'good'], created: ['Started', ''], pending: ['Waiting', 'warn'], canceled: ['Canceled', ''], failed: ['Card declined', 'warn'],
  expired: ['Expired', ''], 'amount-mismatch': ['Wrong amount', 'bad'], 'paid-no-letter': ['Paid, letter gone', 'bad']
};
function payChip(p) {
  if (p.refundedAt) return chip({ label: 'Refunded', tone: '' });
  if (p.second) return chip({ label: 'Paid twice', tone: 'bad' });
  const [label, tone] = PAY_STATE[p.status] || [p.status, ''];
  return chip({ label, tone });
}
function renderPayments() {
  const q = $('#paySearch').value.trim().toLowerCase();
  const P = view.payments;
  chips($('#payFilters'), 'pay', [['all', 'All', P.length], ['refund', 'Needs refund', P.filter(p => p.refund).length], ['succeeded', 'Paid', P.filter(p => p.status === 'succeeded').length], ['open', 'Not finished', P.filter(p => !['succeeded', 'paid-no-letter', 'amount-mismatch'].includes(p.status)).length]]);
  const f = filters.pay;
  const rows = P.filter(p => (f === 'all' || (f === 'refund' && p.refund) || (f === 'succeeded' && p.status === 'succeeded') || (f === 'open' && !['succeeded', 'paid-no-letter', 'amount-mismatch'].includes(p.status)))
    && (!q || [p.tx, p.inviteId, p.account?.email].join(' ').toLowerCase().includes(q)));
  $('#payTable tbody').replaceChildren(...rows.map(p => rowOpen(h('tr', {},
    h('td', { class: 't-num' }, fmtTime(p.createdAt), h('span', { class: 't-sub', text: p.tx.slice(0, 8) + ' · ' + (p.provider || '') })),
    h('td', { class: 't-num', text: money(p.amount) }),
    h('td', {}, payChip(p)),
    h('td', {}, view.byId.has(p.inviteId) ? h('button', { type: 'button', class: 'ad-row-btn', onclick: () => openLetter(p.inviteId), text: lettersName(view.byId.get(p.inviteId)) }) : h('span', { class: 't-sub', text: 'deleted' })),
    h('td', { text: p.account?.email || '' }),
    h('td', {}, p.refund ? h('button', { type: 'button', class: 'ad-btn', onclick: () => openPayment(p.tx), text: 'Mark refunded' }) : null)
  ), () => openPayment(p.tx))));
  $('#payEmpty').hidden = rows.length > 0;
}
$('#paySearch').addEventListener('input', () => view && renderPayments());
const lettersName = l => `${l.meta?.from || '?'} → ${l.meta?.girlName || '?'}`;

// ---------- health ----------
function renderHealth() {
  const s = data.settings, today = dayOf(Date.now()), lim = data.limitsAll;
  const todayCount = lim?.day === today ? lim.count : view.letters.filter(l => dayOf(l.invite.createdAt || 0) === today).length;
  const meter = (title, value, of, text) => {
    const share = of ? Math.min(1, value / of) : 0;
    const fill = h('div', { class: 'm-fill' + (share >= 0.9 ? ' is-bad' : share >= 0.7 ? ' is-warn' : '') });
    fill.style.width = share * 100 + '%';
    return h('div', { class: 'ad-sheet ad-meter' }, h('h2', { text: title }), h('b', { text: of ? `${fmtNum(value)} of ${fmtNum(of)}` : fmtNum(value) }),
      h('div', { class: 'm-bar', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(of || 1), 'aria-valuenow': String(value), 'aria-label': title }, fill), h('p', { text }));
  };
  const reads = view.letters.length * 3 + view.payments.length + data.customers.length + 1;
  $('#meters').replaceChildren(
    meter('Letters today, everybody', todayCount, s.maxTotalPerDay || 0, s.maxTotalPerDay ? 'New letters stop for the day at the limit (MAX_LETTERS_PER_DAY_TOTAL).' : 'No daily limit for everybody is set.'),
    meter('Letters stored', view.letters.length, 1500, 'The free database (1 GB) holds about 1,500 letters with photos.'),
    meter('Reads per Refresh here', reads, 50000, 'This panel reads the whole database. Free plan: 50,000 reads a day for the whole site.'),
    meter('Locked letters', view.letters.filter(l => l.invite.locked).length, 0, 'Locked after 30 wrong codes. Unlock one from its letter page.')
  );
  const dl = [['Payments', s.provider === 'fake' ? 'Test payments (fake)' : s.provider], ['Price per letter', s.price > 0 ? money(s.price) : 'Free (0)'],
    ['Letters per person per day', s.maxPerDay || '—'], ['Letters per day, everybody', s.maxTotalPerDay || 'no limit'],
    ['Unpaid letters kept', s.unpaidKeepDays + ' days'], ['Sent letters kept', s.keepDays + ' days']];
  $('#settings').replaceChildren(...dl.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: String(v) })]));
}

// ---------- drawer ----------
let lastFocus = null;
let drawerFor = '';   // what the open drawer shows ('letter:<id>' …), so a late answer never re-opens a closed one
const stillOpen = key => !$('#drawer').hidden && drawerFor === key;
function openDrawer(title, ...blocks) {
  if ($('#drawer').hidden) lastFocus = document.activeElement;
  $('#drawerTitle').textContent = title;
  $('#drawerBody').replaceChildren(...blocks.filter(Boolean));
  $('#drawer').hidden = false;
  document.documentElement.style.overflow = 'hidden';
  $('#drawerClose').focus();
}
function closeDrawer() {
  drawerFor = '';
  if ($('#drawer').hidden) return;
  $('#drawer').hidden = true;
  document.documentElement.style.overflow = '';
  lastFocus?.focus?.();
}
$('#drawerClose').addEventListener('click', closeDrawer);
$('#drawerBack').addEventListener('click', closeDrawer);
addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
const block = (title, ...kids) => h('div', { class: 'ad-block' }, h('h3', { text: title }), ...kids);
const facts = pairs => h('dl', { class: 'ad-dl' }, ...pairs.filter(([, v]) => v != null && v !== '').flatMap(([k, v]) => [h('dt', { text: k }), h('dd', {}, v)]));

const ASK = { full: 'Dish + day', dish: 'Dish only (day later)', none: 'Only the letter' };
function openLetter(id) {
  const l = view.byId.get(id);
  if (!l) return;
  const m = l.meta || {}, inv = l.invite, a = answers.get(id), lock = l.lock || {};
  const actions = h('div', { class: 'ad-actions' });
  if (inv.locked || lock.fails || lock.totalFails) {
    actions.append(h('button', { type: 'button', class: 'ad-btn', text: 'Unlock (reset wrong codes)', onclick: async e => {
      e.target.disabled = true;
      try { await store.admin('Unlock', { id }); toast('Letter unlocked'); await load(); if (stillOpen('letter:' + id)) openLetter(id); }
      catch (err) { toast('Unlock failed: ' + (err.code || err.reason)); e.target.disabled = false; }
    } }));
  }
  actions.append(h('button', { type: 'button', class: 'ad-btn ad-btn-quiet', text: 'Copy id', onclick: () => navigator.clipboard?.writeText(id).then(() => toast('Id copied')) }));
  actions.append(twoTap(h('button', { type: 'button', class: 'ad-btn ad-btn-danger' }), 'Delete letter', 'Press again to delete for good', async () => {
    try { await store.admin('Delete', { id }); toast('Letter deleted'); closeDrawer(); await load(); }
    catch (err) { toast('Delete failed: ' + (err.code || err.reason)); }
  }));

  drawerFor = 'letter:' + id;
  openDrawer(lettersName(l),
    h('p', {}, chip(l.state)),
    block('Letter', facts([
      ['Her code', h('span', { class: 't-code', text: m.pin || '—' })], ['Hint', inv.hint], ['Language', inv.lang?.toUpperCase()],
      ['After reading', ASK[m.ask || 'full']], ['Pick-up offered', m.ask === 'none' ? null : (m.pickup ? 'Yes' : 'No')],
      ['Price', inv.price ? money(inv.price) : 'Free'], ['Id', h('span', { class: 't-sub', text: id })]
    ])),
    block('Timeline', facts([
      ['Sealed', fmtTime(inv.createdAt)], ['Opened', typeof inv.openedAt === 'number' ? fmtTime(inv.openedAt) : (inv.openedAt === null ? 'Not yet' : 'Not tracked (old letter)')],
      ['Answered', m.answeredAt ? fmtTime(m.answeredAt) : null], ['Deleted on', fmtDate(inv.expireAt)]
    ])),
    m.dishes?.length ? block('Dishes', h('ol', { class: 'ad-dishes' }, ...m.dishes.map((d, i) => h('li', { class: a && a !== 'unreadable' && a.dish === i ? 'is-picked' : '' }, d.name, d.place ? ` — ${d.place}` : '', a && a !== 'unreadable' && a.dish === i ? ' ✓' : '')))) : null,
    m.answer ? block('Her answer', a === 'unreadable' ? h('p', { text: 'Saved, but it can’t be unlocked here (an old letter or a damaged answer).' }) : facts([
      ['Dish', m.dishes?.[a.dish]?.name], ['Day', a.date ? `${a.date} at ${a.time}` : 'They pick the day together'], ['Pressed “No”', a.no != null ? `${a.no} time${a.no === 1 ? '' : 's'}` : null]
    ])) : null,
    block('Wrong codes', facts([['In a row', String(lock.fails || 0)], ['In total', `${lock.totalFails || 0} of 30`], ['Paused until', lock.pausedUntil > Date.now() ? fmtTime(lock.pausedUntil) : null], ['Locked', inv.locked ? 'Yes' : 'No']])),
    l.payments.length ? block('Payments', h('ul', { class: 'ad-mini' }, ...l.payments.map(p => h('li', {}, h('button', { type: 'button', onclick: () => openPayment(p.tx), text: fmtTime(p.createdAt) }), payChip(view.payments.find(x => x.tx === p.tx) || p))))) : null,
    block('Customer', h('ul', { class: 'ad-mini' }, h('li', {}, h('button', { type: 'button', onclick: () => openCustomer(inv.ownerUid), text: l.account?.email || inv.ownerUid }), h('span', { class: 't-sub', text: `${view.byUid.get(inv.ownerUid)?.letters.length || 0} letters` })))),
    block('Actions', actions)
  );
}

function openCustomer(uid) {
  const c = view.byUid.get(uid);
  if (!c) return;
  const tags = h('input', { class: 'ad-input', id: 'crmTags', value: c.tags.join(', '), placeholder: 'vip, support, friend', autocomplete: 'off' });
  const note = h('textarea', { class: 'ad-input', id: 'crmNote', maxlength: '2000', placeholder: 'What you know about this customer: questions, complaints, promises.' });
  note.value = c.note;
  const save = h('button', { type: 'submit', class: 'ad-btn ad-btn-main', text: 'Save note' });
  const form = h('form', { class: 'ad-form', onsubmit: async e => {
    e.preventDefault();
    save.disabled = true;
    try {
      await store.admin('SaveCustomer', { uid, note: note.value, tags: tags.value.split(',') });
      toast('Note saved'); await load(); if (stillOpen('customer:' + uid)) openCustomer(uid);
    } catch (err) { toast('Save failed: ' + (err.code || err.reason)); save.disabled = false; }
  } },
  h('label', { for: 'crmTags', text: 'Tags (comma between them)' }), tags,
  h('label', { for: 'crmNote', text: 'Note' }), note,
  c.noteAt ? h('p', { class: 'ad-hint', text: 'Last saved ' + fmtTime(c.noteAt) }) : null,
  h('div', { class: 'ad-actions' }, save));

  const a = c.account;
  drawerFor = 'customer:' + uid;
  openDrawer(a.email || 'Customer',
    block('Account', facts([
      ['Name', a.name], ['Email', a.email], ['Joined', fmtTime(a.createdAt)], ['Last sign-in', fmtTime(a.lastSignIn)],
      ['Terms accepted', c.terms?.at ? `${fmtDate(c.terms.at)} (version ${c.terms.version})` : (c.terms?.version ? `version ${c.terms.version}` : 'Not yet')],
      ['Paid', c.paid ? money(c.paid) : '—'], ['Blocked', a.disabled ? 'Yes (in Firebase)' : null], ['Uid', h('span', { class: 't-sub', text: uid })]
    ])),
    block('Notes and tags', form),
    block(`Letters (${c.letters.length})`, c.letters.length ? h('ul', { class: 'ad-mini' }, ...c.letters.map(l => h('li', {}, h('button', { type: 'button', onclick: () => openLetter(l.id), text: `${lettersName(l)} · ${fmtDate(l.invite.createdAt)}` }), chip(l.state)))) : h('p', { class: 'ad-hint', text: 'No letters in the database (never wrote one, or they were deleted after their time).' }))
  );
}

function openPayment(tx) {
  const p = view.payments.find(x => x.tx === tx);
  if (!p) return;
  let form = null;
  if (p.refund) {
    const note = h('input', { class: 'ad-input', id: 'refundNote', maxlength: '500', placeholder: 'e.g. refund id from the Rahmat cabinet' });
    const btn = h('button', { type: 'submit', class: 'ad-btn ad-btn-main', text: 'Mark refunded' });
    form = h('form', { class: 'ad-form', onsubmit: async e => {
      e.preventDefault(); btn.disabled = true;
      try { await store.admin('MarkRefunded', { tx, note: note.value }); toast('Marked refunded'); await load(); if (stillOpen('payment:' + tx)) openPayment(tx); }
      catch (err) { toast('Failed: ' + (err.code || err.reason)); btn.disabled = false; }
    } },
    h('p', { class: 'ad-hint', text: 'First send the money back in the payment company’s cabinet. Then mark it here so it leaves the list.' }),
    h('label', { for: 'refundNote', text: 'Refund note' }), note, h('div', { class: 'ad-actions' }, btn));
  }
  const why = p.status === 'paid-no-letter' ? 'Paid after the letter was deleted.' : p.status === 'amount-mismatch' ? 'The company reported a different amount than the price.' : p.second ? 'A second payment for a letter that was already paid.' : null;
  drawerFor = 'payment:' + tx;
  openDrawer('Payment ' + tx.slice(0, 8),
    h('p', {}, payChip(p)),
    why ? h('p', { class: 'ad-error', text: why }) : null,
    block('Details', facts([
      ['Amount', money(p.amount)], ['Company', p.provider], ['Started', fmtTime(p.createdAt)], ['Paid', p.paidAt ? fmtTime(p.paidAt) : null],
      ['Refunded', p.refundedAt ? `${fmtTime(p.refundedAt)}${p.refundNote ? ' — ' + p.refundNote : ''}` : null],
      ['Customer', p.account?.email], ['Payment id', h('span', { class: 't-sub', text: tx })]
    ])),
    view.byId.has(p.inviteId) ? block('Letter', h('ul', { class: 'ad-mini' }, h('li', {}, h('button', { type: 'button', onclick: () => openLetter(p.inviteId), text: lettersName(view.byId.get(p.inviteId)) }), chip(view.byId.get(p.inviteId).state)))) : block('Letter', h('p', { class: 'ad-hint', text: 'Deleted' })),
    form ? block('Refund', form) : null
  );
}

// ---------- log in (username + password, functions/src/admin-auth.js) ----------
function showGate(text = 'Log in to see letters, customers and payments.') {
  closeDrawer();
  $('#app').hidden = true; $('#who').hidden = true; $('#gate').hidden = false;
  $('#gateText').textContent = text;
  $('#adminPass').value = '';
  (store.DEMO ? $('#adminUser') : ($('#adminUser').value ? $('#adminPass') : $('#adminUser'))).focus();
}
async function enter() {
  $('#gate').hidden = true;
  $('#who').hidden = false;
  const ok = await load();
  if (ok === 'session') return;
  $('#app').hidden = false;
  showTab();
}
const LOGIN_ERRORS = {
  'admin-wrong': 'Wrong username or password.',
  'admin-locked': 'Too many wrong tries. The login is closed for 15 minutes.',
  'admin-off': 'The admin login is not set up on the server yet (ADMIN_USER, ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET).',
  network: 'Could not reach the server. Check the connection.',
  busy: 'The server is busy. Try again in a minute.'
};
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#gateError').textContent = '';
  $('#loginBtn').disabled = true;
  try {
    await store.adminLogin($('#adminUser').value.trim(), $('#adminPass').value);
    $('#adminPass').value = '';
    await enter();
  } catch (err) {
    $('#gateError').textContent = LOGIN_ERRORS[err.reason] || 'Log in failed (' + (err.code || err.reason) + ').';
    $('#adminPass').select();
  } finally { $('#loginBtn').disabled = false; }
});
$('#signOutBtn').addEventListener('click', () => { store.adminLogout(); location.replace(location.pathname); });   // nothing stays on screen
$('#refreshBtn').addEventListener('click', async () => { if (await load(true) === true) toast('Up to date'); });

$('#demoNote').hidden = !store.DEMO;
if (store.DEMO) $('#gateText').textContent = 'Demo: username demo, password demo.';
if (store.adminSignedIn()) enter(); else showGate(store.DEMO ? 'Demo: username demo, password demo.' : undefined);
