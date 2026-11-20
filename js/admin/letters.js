// Letters tab: the table and the letter drawer.
import * as store from '../store.js';
import { $, h, fmtDate, fmtTime, money, toast, twoTap, openDrawer, closeDrawer, stillOpen, block, facts, chip, rowOpen } from './ui.js';
import { state, answers, actions, build, filters, chips, STATES, lettersName } from './data.js';
import { payChip } from './payments.js';
import { tashkentDay } from '../shared/stats.js';
import { sortRows, sortable, toCsv, download } from './table.js';

function answerText(l) {
  const a = answers.get(l.id), m = l.meta || {};
  if (!m.answer) return m.ask === 'none' ? 'Letter only' : '';
  if (a === 'unreadable' || !a) return 'Answered (unreadable)';
  const dish = m.dishes?.[a.dish]?.name || `Dish ${a.dish + 1}`;
  return a.date ? `${dish} · ${a.date} ${a.time}` : `${dish} · day later`;
}
const GIFT = { credit: 'Free letter (credit)', admin: 'Sent for free' };
const ASK = { full: 'Dish + day', dish: 'Dish only (day later)', none: 'Only the letter' };
// Sorting + CSV: the rows as shown are what gets exported (never her code).
const SORT = {
  sealed: l => l.invite.createdAt, name: l => lettersName(l), state: l => l.state.label, answer: l => answerText(l), customer: l => l.account?.email || ''
};
const sort = sortable($('#letterTable'), () => renderLetters());
let shown = [];
const iso = ms => (typeof ms === 'number' && ms > 0 ? new Date(ms).toISOString() : '');

export function renderLetters() {
  const { view } = state;
  const q = $('#letterSearch').value.trim().toLowerCase();
  const counts = Object.fromEntries(STATES.map(([k]) => [k, k === 'all' ? view.letters.length : view.letters.filter(l => l.state.key === k).length]));
  chips($('#letterFilters'), 'letter', STATES.filter(([k]) => k === 'all' || counts[k]).map(([k, label]) => [k, label, counts[k]]));
  const rows = view.letters.filter(l => (filters.letter === 'all' || l.state.key === filters.letter) && (!q || l.search.includes(q)));
  shown = sort.key ? sortRows(rows, SORT[sort.key], sort.dir) : rows;
  $('#letterCsv').disabled = !shown.length;
  $('#letterTable tbody').replaceChildren(...shown.map(l => {
    const m = l.meta || {};
    return rowOpen(h('tr', {},
      h('td', { class: 't-num' }, fmtDate(l.invite.createdAt), h('span', { class: 't-sub', text: l.invite.lang?.toUpperCase() })),
      h('td', {}, h('button', { type: 'button', class: 'ad-row-btn', onclick: () => actions.open.letter(l.id), text: `${m.from || '?'} → ${m.girlName || '?'}` }), l.invite.hint ? h('span', { class: 't-sub', text: l.invite.hint }) : null),
      h('td', {}, chip(l.state), l.gift ? chip({ label: 'Gift', tone: 'good' }) : null),
      h('td', { class: 't-code', text: m.pin || '' }),
      h('td', { text: answerText(l) }),
      h('td', {}, l.account?.email || h('span', { class: 't-sub', text: l.invite.ownerUid?.slice(0, 8) }))
    ), () => actions.open.letter(l.id));
  }));
  $('#letterEmpty').hidden = rows.length > 0;
}
$('#letterCsv').addEventListener('click', () => download(`maktubim-letters-${tashkentDay(Date.now())}.csv`, toCsv(shown, [
  { title: 'Sealed', value: l => iso(l.invite.createdAt) }, { title: 'From', value: l => l.meta?.from }, { title: 'To', value: l => l.meta?.girlName },
  { title: 'State', value: l => l.state.label }, { title: 'Language', value: l => l.invite.lang }, { title: 'Kind', value: l => ASK[l.meta?.ask || 'full'] },
  { title: 'Opened', value: l => iso(l.invite.openedAt) }, { title: 'Answered', value: l => iso(l.meta?.answeredAt) },
  { title: 'Customer email', value: l => l.account?.email }, { title: 'Id', value: l => l.id },
  { title: 'Gift', value: l => GIFT[l.gift] || '' }
])));
$('#letterSearch').addEventListener('input', () => state.view && renderLetters());

export function openLetter(id) {
  const { view } = state;
  const l = view.byId.get(id);
  if (!l) return;
  const m = l.meta || {}, inv = l.invite, a = answers.get(id), lock = l.lock || {};
  const btns = h('div', { class: 'ad-actions' });
  if (inv.locked || lock.fails || lock.totalFails) {
    btns.append(h('button', { type: 'button', class: 'ad-btn', text: 'Unlock (reset wrong codes)', onclick: async e => {
      e.target.disabled = true;
      try { await store.admin('Unlock', { id }); toast('Letter unlocked'); await actions.load(true); if (stillOpen('letter:' + id)) openLetter(id); }
      catch (err) { toast('Unlock failed: ' + (err.code || err.reason)); e.target.disabled = false; }
    } }));
  }
  // Not for an unpaid letter past its 7 days: the server refuses it (the nightly cleanup is about to delete it).
  if (inv.status === 'unpaid' && !(inv.expireAt <= Date.now())) {
    // Turns the letter on without a payment. Patches the loaded data from the answer; no full reload.
    btns.append(twoTap(h('button', { type: 'button', class: 'ad-btn ad-btn-main' }), 'Send for free', 'Press again to send it for free', async () => {
      try {
        const r = await store.admin('SendFree', { id });
        const row = state.data.letters.find(x => x.id === id);
        if (row) Object.assign(row.invite, r.invite);
        build(); actions.renderAll();
        toast('Sent for free');
        if (stillOpen('letter:' + id)) openLetter(id);
      } catch (err) {
        toast(err.reason === 'receipt-waiting' ? 'A receipt is waiting for this letter: confirm or refuse it in Payments instead.' : err.reason === 'already-paid' ? 'He already paid for it. Reloading.' : err.reason === 'not-unpaid' ? 'It is not waiting for payment any more (paid, sent or past its 7 days). Reloading.' : 'Failed: ' + (err.code || err.reason));
        if (err.reason === 'already-paid' || err.reason === 'not-unpaid') { await actions.load(true); if (stillOpen('letter:' + id)) openLetter(id); }
      }
    }));
  }
  btns.append(h('button', { type: 'button', class: 'ad-btn ad-btn-quiet', text: 'Copy id', onclick: () => navigator.clipboard?.writeText(id).then(() => toast('Id copied')) }));
  btns.append(twoTap(h('button', { type: 'button', class: 'ad-btn ad-btn-danger' }), 'Delete letter', 'Press again to delete for good', async () => {
    try { await store.admin('Delete', { id }); toast('Letter deleted'); closeDrawer(); await actions.load(true); }
    catch (err) { toast('Delete failed: ' + (err.code || err.reason)); }
  }));

  openDrawer('letter:' + id, lettersName(l),
    h('p', {}, chip(l.state), l.gift ? chip({ label: 'Gift', tone: 'good' }) : null),
    block('Letter', facts([
      ['Her code', h('span', { class: 't-code', text: m.pin || '—' })], ['Hint', inv.hint], ['Language', inv.lang?.toUpperCase()],
      ['After reading', ASK[m.ask || 'full']], ['Pick-up offered', m.ask === 'none' ? null : (m.pickup ? 'Yes' : 'No')],
      ['Price', l.gift ? (inv.price ? `Free (${money(inv.price)} waived)` : 'Free (gift)') : (inv.price ? money(inv.price) : 'Free')],
      ['Gift', l.gift === 'credit' ? 'Free letter from his credit' : l.gift === 'admin' ? `Sent for free${inv.giftAt ? ' on ' + fmtTime(inv.giftAt) : ''}` : null], ['Id', h('span', { class: 't-sub', text: id })]
    ])),
    block('Timeline', facts([
      ['Sealed', fmtTime(inv.createdAt)], ['Opened', typeof inv.openedAt === 'number' ? fmtTime(inv.openedAt) : (inv.openedAt === null ? 'Not yet' : 'Not tracked (old letter)')],
      ['Answered', m.answeredAt ? fmtTime(m.answeredAt) : null], ['Deleted on', fmtDate(inv.expireAt)]
    ])),
    m.dishes?.length ? block('Dishes', h('ol', { class: 'ad-dishes' }, ...m.dishes.map((d, i) => h('li', { class: a && a !== 'unreadable' && a.dish === i ? 'is-picked' : '' }, d.name, d.place ? ` — ${d.place}` : '', a && a !== 'unreadable' && a.dish === i ? ' ✓' : '')))) : null,
    m.answer ? block('Her answer', a === 'unreadable' ? h('p', { text: 'Saved, but it can’t be unlocked here (an old letter or a damaged answer).' }) : facts([
      ['Dish', m.dishes?.[a.dish]?.name], ['Day', a.date ? `${a.date} at ${a.time}` : 'They pick the day together'], ['Pressed “No”', Number.isInteger(a.no) ? `${a.no} time${a.no === 1 ? '' : 's'}` : null]
    ])) : null,
    block('Wrong codes', facts([['In a row', String(lock.fails || 0)], ['In total', `${lock.totalFails || 0} of 30`], ['Paused until', lock.pausedUntil > Date.now() ? fmtTime(lock.pausedUntil) : null], ['Locked', inv.locked ? 'Yes' : 'No']])),
    l.payments.length ? block('Payments', h('ul', { class: 'ad-mini' }, ...l.payments.map(p => h('li', {}, h('button', { type: 'button', onclick: () => actions.open.payment(p.tx), text: fmtTime(p.createdAt) }), payChip(view.payments.find(x => x.tx === p.tx) || p))))) : null,
    block('Customer', h('ul', { class: 'ad-mini' }, h('li', {}, h('button', { type: 'button', onclick: () => actions.open.customer(inv.ownerUid), text: l.account?.email || inv.ownerUid }), h('span', { class: 't-sub', text: `${view.byUid.get(inv.ownerUid)?.letters.length || 0} letters` })))),
    block('Actions', btns)
  );
}
