// Overview tab: numbers for a chosen period (with the change vs the period before), charts, speed, split, "Needs you".
import * as store from '../store.js';
import { dayNumbers, shiftDay, tashkentDay } from '../shared/stats.js';
import { $, DAY, h, dayOf, fmtNum, pct, toast } from './ui.js';
import { state, answers, setFilter, cleanupLate } from './data.js';
import { barChart, hBars, bucketize, fmtDay } from './charts.js';

const RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['all', 'All']];
const MAX_DAYS = 400;   // the longest span the server answers in one go
let range = '30';
try { const r = sessionStorage.getItem('cupidon.admin.range'); if (RANGES.some(([k]) => k === r)) range = r; } catch { /* a private window: the default is fine */ }

// ---------- the numbers behind everything: one object per loaded overview, thrown away on the next load ----------
let ctx = null;
const ZERO = () => ({ sealed: 0, sent: 0, gifted: 0, opened: 0, answered: 0, paidCount: 0, paidSum: 0, refunded: 0, byLang: { uz: 0, ru: 0, en: 0 }, byAsk: { full: 0, dish: 0, none: 0 } });
function getCtx() {
  const { data } = state;
  if (ctx?.data === data) return ctx;
  const stats = new Map([...older, ...(data.stats || []).map(d => [d.day, d])]);
  // The days on which anything happened in the letters we still hold: other days need no counting at all.
  const busy = new Set();
  for (const l of data.letters) for (const ms of [l.invite.createdAt, l.invite.openedAt, l.meta?.answeredAt]) if (typeof ms === 'number' && ms > 0) busy.add(tashkentDay(ms));
  for (const p of data.payments) for (const ms of [p.paidAt, p.refundedAt]) if (typeof ms === 'number' && ms > 0) busy.add(tashkentDay(ms));
  const accounts = new Map();
  for (const a of data.accounts || []) if (a.createdAt) { const d = tashkentDay(a.createdAt); accounts.set(d, (accounts.get(d) || 0) + 1); }
  ctx = { data, stats, busy, accounts, nums: new Map(), longFailed: false, today: tashkentDay(Date.now()) };
  return ctx;
}
// Today has no saved doc yet, and a day the server has not saved (yet) is counted from the letters we still hold.
function numbersOf(day) {
  const c = getCtx();
  if (c.nums.has(day)) return c.nums.get(day);
  let n = day !== c.today && c.stats.get(day);
  if (!n) n = c.busy.has(day) ? dayNumbers({ letters: c.data.letters, payments: c.data.payments }, day) : ZERO();
  c.nums.set(day, n);
  return n;
}
const daysEndingToday = n => { const t = getCtx().today; return [...Array(n)].map((_, i) => shiftDay(t, i - (n - 1))); };

// The days of the chosen period and of the equal period before it (none for "All").
function periods() {
  const c = getCtx();
  if (range !== 'all') { const n = Number(range); return { cur: daysEndingToday(n), prev: daysEndingToday(2 * n).slice(0, n) }; }
  const firsts = [...c.stats.keys()];
  for (const l of c.data.letters) if (l.invite.createdAt) firsts.push(tashkentDay(l.invite.createdAt));
  for (const a of c.data.accounts || []) if (a.createdAt) firsts.push(tashkentDay(a.createdAt));
  const first = firsts.sort()[0] || c.today;
  const n = Math.min(MAX_DAYS, Math.max(7, Math.round((Date.parse(c.today) - Date.parse(first)) / DAY) + 1));
  return { cur: daysEndingToday(n), prev: null };
}

// Older days (for 90 days with its comparison, and for All) come from one extra request. Finished days never change,
// so what was fetched once is kept across reloads: every Save or Refresh redraws this tab, and reading a year of
// numbers each time would eat the free plan's daily reads. Only the missing older part is asked for.
const older = new Map();   // day → saved numbers
let olderFrom = null;      // the earliest day already fetched
let olderBusy = false;
const longFrom = () => shiftDay(getCtx().today, range === 'all' ? -(MAX_DAYS - 1) : -179);
const longDone = () => !!olderFrom && olderFrom <= longFrom();
function ensureLong() {
  const c = getCtx();
  if (longDone() || olderBusy || c.longFailed || $('#tab-overview').hidden) return;
  olderBusy = true;
  const from = longFrom();
  const to = olderFrom ? shiftDay(olderFrom, -1) : shiftDay(c.today, -88);   // newer days come with every overview
  store.admin('Stats', { from, to }).then(r => {
    for (const d of r.stats || []) older.set(d.day, d);
    olderFrom = from;
    const now = getCtx();   // a reload may have swapped the numbers meanwhile
    for (const [day, d] of older) if (!now.stats.has(day)) now.stats.set(day, d);
    now.nums.clear();
  }, () => { c.longFailed = true; toast('Could not load the older days.'); })   // tried again after the next Refresh
    .finally(() => { olderBusy = false; if (state.data) renderOverview(); });
}

const sum = (days, f) => days.reduce((s, d) => s + f(numbersOf(d)), 0);

// ---------- change vs the period before ----------
// "+12%" when the earlier number is 10 or more, "−3" when it is small, "new" when the earlier period was empty, nothing when both are 0.
function delta(cur, prev) {
  if (!cur && !prev) return null;
  if (!prev) return { text: 'new', cls: 'kd-new' };
  const diff = cur - prev;
  if (!diff) return { text: '= no change', cls: 'kd-flat' };
  const mark = diff > 0 ? '▲ +' : '▼ −';
  return { text: mark + (prev < 10 ? fmtNum(Math.abs(diff)) : Math.abs(Math.round((diff / prev) * 100)) + '%'), cls: diff > 0 ? 'kd-up' : 'kd-down' };
}

function median(list) {
  if (list.length < 3) return null;
  const s = [...list].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function span(ms) {
  if (ms == null) return '—';
  if (ms < 3600e3) return Math.max(1, Math.round(ms / 60e3)) + ' min';
  if (ms < 36 * 3600e3) return Math.round(ms / 3600e3) + ' h';
  const d = Math.round(ms / DAY);
  return d + (d === 1 ? ' day' : ' days');
}

function chips() {
  const box = $('#rangeChips');
  if (!box.children.length) {
    box.replaceChildren(...RANGES.map(([key, label]) => h('button', {
      type: 'button', class: 'ad-chip', 'data-range': key, onclick: () => {
        range = key;
        try { sessionStorage.setItem('cupidon.admin.range', key); } catch { /* optional */ }
        renderOverview();
      }
    }, label)));
  }
  for (const b of box.children) b.setAttribute('aria-pressed', String(b.dataset.range === range));
}

const unhide = el => { el.closest('.ad-sheet').hidden = false; };
const setSheet = (box, title, lead) => {
  const sheet = box.closest('.ad-sheet');
  sheet.hidden = false;
  if (title) sheet.querySelector('h2').textContent = title;
  sheet.querySelector('.ad-lead').textContent = lead;
};

export function renderOverview() {
  const { data, view } = state;
  const c = getCtx();
  const L = view.letters, now = Date.now(), today = dayOf(now);
  const needsLong = range === '90' || range === 'all';
  if (needsLong) ensureLong();
  chips();

  const { cur, prev } = periods();
  const compare = !!prev && !(needsLong && !longDone());   // no comparison until the older days are really here
  const label = range === 'all' ? 'All time' : `Last ${range} days`;
  const sub = `vs the ${range} days before`;

  // ----- six numbers -----
  const T = f => sum(cur, f), P = f => (compare ? sum(prev, f) : 0);
  const accountsIn = days => days.reduce((s, d) => s + (c.accounts.get(d) || 0), 0);
  const sealed = T(n => n.sealed), sent = T(n => n.sent), gifted = T(n => n.gifted || 0), opened = T(n => n.opened), answered = T(n => n.answered), earned = T(n => n.paidSum);
  const newAcc = accountsIn(cur);
  const kpi = (num, name, note, d) => h('div', { class: 'ad-kpi' }, h('b', { text: num }), h('span', { text: name }),
    note ? h('small', { text: note }) : null,
    compare && d ? h('small', { class: 'kd ' + d.cls, text: d.text + (d.cls === 'kd-flat' ? '' : ' ' + sub) }) : null);
  const free = data.settings.price <= 0 && !earned;
  $('#kpis').replaceChildren(
    kpi(fmtNum(sealed), 'Sealed', label, delta(sealed, P(n => n.sealed))),
    kpi(fmtNum(sent), 'Sent to her', pct(sent, sealed) + ' of sealed' + (gifted ? ` · incl. ${fmtNum(gifted)} gift${gifted === 1 ? '' : 's'}` : ''), delta(sent, P(n => n.sent))),
    kpi(fmtNum(opened), 'Opened by her', pct(opened, sent) + ' of sent', delta(opened, P(n => n.opened))),
    kpi(fmtNum(answered), 'Answered', pct(answered, opened) + ' of opened', delta(answered, P(n => n.answered))),
    kpi(fmtNum(newAcc), 'New accounts', label, delta(newAcc, compare ? accountsIn(prev) : 0)),
    kpi(free ? 'Free' : fmtNum(earned), free ? 'Earned' : 'So‘m earned', free ? 'letters are free now' : 'after refunds', free ? null : delta(earned, P(n => n.paidSum)))
  );

  // ----- notes about the data -----
  const notes = [];
  if (!(data.stats || []).length) notes.push('History starts after the first night; older days come from letters still stored.');
  const lastPartial = cur.filter(d => c.stats.get(d)?.partial).sort().pop();
  if (lastPartial) notes.push(`Days before ${fmtDay(shiftDay(lastPartial, 1))} are incomplete (unpaid letters from then were already deleted).`);
  $('#rangeNote').textContent = notes.join(' ');
  $('#rangeNote').hidden = !notes.length;

  // ----- journey: about the database right now, not the period -----
  const sentNow = L.filter(l => l.invite.status === 'active');
  const openedNow = L.filter(l => typeof l.invite.openedAt === 'number' || l.meta?.answer);
  const answeredNow = L.filter(l => l.meta?.answer || l.invite.answered);
  const withDay = answeredNow.filter(l => answers.get(l.id)?.date);
  $('#journey').previousElementSibling.textContent = 'Every letter in the database right now, by how far it got. This does not depend on the period chosen above.';
  const steps = [['Sealed', L.length], ['Sent to her', sentNow.length], ['Opened', openedNow.length], ['Picked a dish', answeredNow.length], ['Set a day', withDay.length]];
  const top = Math.max(1, L.length);
  $('#journey').replaceChildren(...steps.map(([name, n], i) => {
    const fill = h('div', { class: 'j-fill' });
    requestAnimationFrame(() => { fill.style.width = (n / top) * 100 + '%'; });
    return h('li', {}, h('span', { class: 'j-name', text: name }), h('div', { class: 'j-bar', 'aria-hidden': 'true' }, fill),
      h('span', { class: 'j-num' }, fmtNum(n), i ? h('small', { text: pct(n, steps[i - 1][1]) }) : null));
  }));

  // ----- charts -----
  const series = f => cur.map(d => f(numbersOf(d)));
  const lead = (unit) => `${label}, Tashkent time${unit === 'week' ? '. Added up per week (weeks start on Monday).' : ''}`;
  const draw = (box, title, names, vals, fmt) => {
    const b = bucketize(cur, vals);
    setSheet(box, title(b.unit), lead(b.unit));
    barChart(box, b.days, b.series, names, fmt, { unit: b.unit, span: label.toLowerCase() });
    return b.unit;
  };
  draw($('#chartLetters'), u => `Letters sealed per ${u}`, ['Sealed', 'Answered'], [series(n => n.sealed), series(n => n.answered)], fmtNum);
  draw($('#chartOpened'), u => `Letters opened per ${u}`, ['Opened'], [series(n => n.opened)], fmtNum);
  draw($('#chartAccounts'), u => `New accounts per ${u}`, ['New accounts'], [cur.map(d => c.accounts.get(d) || 0)], fmtNum);
  if (data.settings.price > 0 || earned || view.payments.some(p => p.status === 'succeeded')) {
    draw($('#chartMoney'), u => `Money per ${u}`, ['so‘m'], [series(n => n.paidSum)], n => fmtNum(n));
    $('#moneyLead').textContent = 'Paid letters, ' + label.toLowerCase() + ', after refunds';
  } else {
    $('#chartMoney').replaceChildren(h('p', { class: 'ad-empty', text: 'Letters are free right now (PRICE_UZS = 0). Money shows here once payments are on.' }));
    $('#moneyLead').textContent = '';
  }

  // ----- speed: from the letters still in the database -----
  const toOpen = L.filter(l => typeof l.invite.openedAt === 'number' && l.invite.createdAt && l.invite.openedAt >= l.invite.createdAt).map(l => l.invite.openedAt - l.invite.createdAt);
  const toAnswer = L.filter(l => typeof l.invite.openedAt === 'number' && l.meta?.answeredAt >= l.invite.openedAt).map(l => l.meta.answeredAt - l.invite.openedAt);
  const speedCell = (name, list) => h('div', { class: 'ad-speed' }, h('b', { text: span(median(list)) }), h('span', { text: name }), h('small', { text: `${list.length} letter${list.length === 1 ? '' : 's'}` }));
  unhide($('#speed'));
  $('#speed').replaceChildren(speedCell('Sealed → opened', toOpen), speedCell('Opened → answered', toAnswer));
  $('#speed').previousElementSibling.textContent = 'Middle time (median), from the letters still in the database. Shows a dash under 3 letters.';

  // ----- split: letters of the period by language and kind -----
  unhide($('#split'));
  $('#split').previousElementSibling.textContent = label + ': letters by language and by kind.';
  const lang = k => T(n => n.byLang[k] || 0), ask = k => T(n => n.byAsk[k] || 0);
  const box = $('#split');
  const a = h('div', {}), b2 = h('div', {});
  hBars(a, 'Language', [['Uzbek', lang('uz')], ['Russian', lang('ru')], ['English', lang('en')]]);
  hBars(b2, 'Kind', [['Dish + day', ask('full')], ['Dish only', ask('dish')], ['Letter only', ask('none')]]);
  box.replaceChildren(a, b2);

  // ----- needs you -----
  const todo = [];
  const refunds = view.payments.filter(p => p.refund);
  if (refunds.length) todo.push(['bad', `${refunds.length} payment${refunds.length > 1 ? 's need' : ' needs'} a refund`, () => { location.hash = '#payments'; setFilter('pay', 'refund'); }]);
  const checking = view.payments.filter(p => p.waiting);
  if (checking.length) todo.unshift(['bad', `${checking.length} receipt${checking.length > 1 ? 's are' : ' is'} waiting for your check`, () => { location.hash = '#payments'; setFilter('pay', 'check'); }]);
  const due = view.customers.filter(x => x.due);
  if (due.length) todo.push(['warn', `${due.length} customer${due.length > 1 ? 's have' : ' has'} a follow-up due`, () => { location.hash = '#customers'; setFilter('cust', 'followup'); }]);
  const locked = L.filter(l => l.invite.locked);
  if (locked.length) todo.push(['warn', `${locked.length} letter${locked.length > 1 ? 's are' : ' is'} locked after 30 wrong codes`, () => { location.hash = '#letters'; setFilter('letter', 'locked'); }]);
  const stale = sentNow.filter(l => l.invite.openedAt === null && now - (l.invite.createdAt || now) > 3 * DAY);
  if (stale.length) todo.push(['warn', `${stale.length} sent letter${stale.length > 1 ? 's' : ''} not opened after 3 days`, () => { location.hash = '#letters'; setFilter('letter', 'notOpened'); }]);
  const lim = data.limitsAll, max = data.settings.maxTotalPerDay;
  if (max && lim?.day === today && lim.count >= max * 0.8) todo.push(['bad', `Today's letters for everybody: ${lim.count} of ${max}`, () => { location.hash = '#health'; }]);
  if (cleanupLate()) todo.push(['warn', 'The nightly cleanup has not run for more than 36 hours (or has no record)', () => { location.hash = '#health'; }]);
  if (L.length > 1200) todo.push(['bad', `${L.length} letters stored: the free database holds about 1,500 with photos. Move to Blaze soon.`, () => { location.hash = '#health'; }]);
  if (!todo.length) todo.push(['ok', 'Nothing needs you right now.', null]);
  $('#todo').replaceChildren(...todo.map(([tone, text, go]) => h('li', { class: 'is-' + tone }, go ? h('button', { type: 'button', onclick: go, text }) : text)));
}
