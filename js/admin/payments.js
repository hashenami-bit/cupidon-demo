// Payments tab: the table and the payment drawer.
import * as store from '../store.js';
import { $, h, fmtTime, money, toast, openDrawer, stillOpen, block, facts, chip, rowOpen, twoTap } from './ui.js';
import { tashkentDay } from '../shared/stats.js';
import { state, actions, filters, chips, lettersName } from './data.js';
import { sortRows, sortable, toCsv, download } from './table.js';

const PAY_STATE = {
  succeeded: ['Paid', 'good'], created: ['Started', ''], pending: ['Waiting', 'warn'], canceled: ['Canceled', ''], failed: ['Card declined', 'warn'],
  expired: ['Expired', ''], 'amount-mismatch': ['Wrong amount', 'bad'], 'paid-no-letter': ['Paid, letter gone', 'bad']
};
function payStatus(p) {
  if (p.waiting) return { label: 'Waiting for check', tone: 'warn' };
  if (p.refusedAt) return { label: 'Refused', tone: '' };
  if (p.refundedAt) return { label: 'Refunded', tone: '' };
  if (p.giftPaid) return { label: 'Paid after it was sent for free', tone: 'bad' };
  if (p.second) return { label: 'Paid twice', tone: 'bad' };
  const [label, tone] = PAY_STATE[p.status] || [p.status, ''];
  return { label, tone };
}
export const payChip = p => chip(payStatus(p));

// Sorting + CSV: the rows as shown (after search, filter and sort) are what gets exported.
const SORT = {
  started: p => p.createdAt, amount: p => p.amount, state: p => payStatus(p).label,
  letter: p => { const l = state.view.byId.get(p.inviteId); return l ? lettersName(l) : ''; }, customer: p => p.account?.email || ''
};
const sort = sortable($('#payTable'), () => renderPayments());
let shown = [];
const manualToast = (action, r, done) => {
  if (action === 'ManualRefuse') return r?.again ? 'It was already refused' : done;
  if (r?.done === 'duplicate') return 'The letter was already on: this is a second payment. Refund needed.';
  if (r?.done === 'gone') return 'The letter was deleted. Refund needed.';
  if (r?.done === 'again' || r?.again) return 'It was already confirmed';
  return done;
};
const manualFail = err => (err.reason === 'closed' ? 'This order was already refused' : err.reason === 'paid' ? 'Already confirmed, can’t refuse' : 'Failed: ' + (err.code || err.reason));
let firstLook = true;   // the first time the tab is drawn, receipts waiting for a check are shown first
// Confirm / Refuse a card transfer (two taps). The server answers; then the data is loaded fresh and the drawer redrawn.
function checkButtons(p) {
  const run = (action, done) => async () => {
    try {
      const r = await store.admin(action, { tx: p.tx });
      toast(manualToast(action, r, done));
      await actions.load(true);
      if (stillOpen('payment:' + p.tx)) openPayment(p.tx);
    } catch (err) { toast(manualFail(err)); await actions.load(true); }
  };
  return h('span', { class: 'ad-actions' },
    twoTap(h('button', { type: 'button', class: 'ad-btn ad-btn-main' }), 'Confirm', 'Press again: he paid', run('ManualConfirm', 'Confirmed. His letter is on.')),
    twoTap(h('button', { type: 'button', class: 'ad-btn ad-btn-danger' }), 'Refuse', 'Press again: refuse', run('ManualRefuse', 'Refused. He was told.')));
}
const iso = ms => (ms ? new Date(ms).toISOString() : '');
export function renderPayments() {
  const { view } = state;
  const q = $('#paySearch').value.trim().toLowerCase();
  const P = view.payments;
  if (firstLook) { firstLook = false; if (P.some(p => p.waiting)) filters.pay = 'check'; }
  chips($('#payFilters'), 'pay', [['all', 'All', P.length], ['check', 'Waiting for check', P.filter(p => p.waiting).length], ['refund', 'Needs refund', P.filter(p => p.refund).length], ['succeeded', 'Paid', P.filter(p => p.status === 'succeeded').length], ['open', 'Not finished', P.filter(p => !['succeeded', 'paid-no-letter', 'amount-mismatch'].includes(p.status)).length]]);
  const f = filters.pay;
  const rows = P.filter(p => (f === 'all' || (f === 'check' && p.waiting) || (f === 'refund' && p.refund) || (f === 'succeeded' && p.status === 'succeeded') || (f === 'open' && !['succeeded', 'paid-no-letter', 'amount-mismatch'].includes(p.status)))
    && (!q || [p.tx, p.code, p.inviteId, p.account?.email].join(' ').toLowerCase().includes(q)));
  shown = sort.key ? sortRows(rows, SORT[sort.key], sort.dir) : rows;
  $('#payCsv').disabled = !shown.length;
  $('#payTable tbody').replaceChildren(...shown.map(p => rowOpen(h('tr', {},
    h('td', { class: 't-num' }, fmtTime(p.createdAt), h('span', { class: 't-sub', text: (p.code || p.tx.slice(0, 8)) + ' · ' + (p.provider || '') })),
    h('td', { class: 't-num', text: money(p.amount) }),
    h('td', {}, payChip(p), p.receiptAt ? h('span', { class: 't-sub', text: 'Receipt ' + fmtTime(p.receiptAt) + (p.tgUser ? ' · ' + p.tgUser : '') }) : null),
    h('td', {}, view.byId.has(p.inviteId) ? h('button', { type: 'button', class: 'ad-row-btn', onclick: () => actions.open.letter(p.inviteId), text: lettersName(view.byId.get(p.inviteId)) }) : h('span', { class: 't-sub', text: 'deleted' })),
    h('td', { text: p.account?.email || '' }),
    h('td', {}, p.waiting ? checkButtons(p) : p.refund ? h('button', { type: 'button', class: 'ad-btn', onclick: () => actions.open.payment(p.tx), text: 'Mark refunded' }) : null)
  ), () => actions.open.payment(p.tx))));
  $('#payEmpty').hidden = rows.length > 0;
}
$('#payCsv').addEventListener('click', () => download(`maktubim-payments-${tashkentDay(Date.now())}.csv`, toCsv(shown, [
  { title: 'Started', value: p => iso(p.createdAt) }, { title: 'Paid', value: p => iso(p.paidAt) }, { title: 'Amount', value: p => p.amount },
  { title: 'State', value: p => payStatus(p).label }, { title: 'Provider', value: p => p.provider }, { title: 'Letter id', value: p => p.inviteId },
  { title: 'Customer email', value: p => p.account?.email }, { title: 'Payment id', value: p => p.tx },
  { title: 'Refunded', value: p => iso(p.refundedAt) }, { title: 'Refund note', value: p => p.refundNote }
])));
$('#paySearch').addEventListener('input', () => state.view && renderPayments());

export function openPayment(tx) {
  const { view } = state;
  const p = view.payments.find(x => x.tx === tx);
  if (!p) return;
  let form = null;
  if (p.refund) {
    const note = h('input', { class: 'ad-input', id: 'refundNote', maxlength: '500', placeholder: 'e.g. refund id from the Rahmat cabinet' });
    const btn = h('button', { type: 'submit', class: 'ad-btn ad-btn-main', text: 'Mark refunded' });
    form = h('form', { class: 'ad-form', onsubmit: async e => {
      e.preventDefault(); btn.disabled = true;
      try { await store.admin('MarkRefunded', { tx, note: note.value }); toast('Marked refunded'); await actions.load(true); if (stillOpen('payment:' + tx)) openPayment(tx); }
      catch (err) { toast('Failed: ' + (err.code || err.reason)); btn.disabled = false; }
    } },
    h('p', { class: 'ad-hint', text: 'First send the money back in the payment company’s cabinet. Then mark it here so it leaves the list.' }),
    h('label', { for: 'refundNote', text: 'Refund note' }), note, h('div', { class: 'ad-actions' }, btn));
  }
  const why = p.giftPaid ? 'This letter was sent for free, and then this payment came in. Give the money back.' : p.status === 'paid-no-letter' ? 'Paid after the letter was deleted.' : p.status === 'amount-mismatch' ? 'The company reported a different amount than the price.' : p.second ? 'A second payment for a letter that was already paid.' : null;
  openDrawer('payment:' + tx, 'Payment ' + (p.code || tx.slice(0, 8)),
    h('p', {}, payChip(p)),
    p.waiting ? block('Check the transfer', h('p', { class: 'ad-hint', text: 'Look in the bank app for ' + money(p.amount) + ' from this customer. The receipt picture is in the Telegram group.' }), checkButtons(p)) : null,
    why ? h('p', { class: 'ad-error', text: why }) : null,
    block('Details', facts([
      ['Amount', money(p.amount)], ['Company', p.provider], ['Order code', p.code], ['Started', fmtTime(p.createdAt)],
      ['Receipt sent', p.receiptAt ? fmtTime(p.receiptAt) + (p.receipts > 1 ? ` (${p.receipts} receipts)` : '') : null], ['Telegram', p.tgUser],
      ['Paid', p.paidAt ? fmtTime(p.paidAt) : null],
      ['Confirmed', p.confirmedAt ? `${fmtTime(p.confirmedAt)} by ${p.confirmedBy || '?'}${p.via ? ' (' + p.via + ')' : ''}` : null],
      ['Refused', p.refusedAt ? `${fmtTime(p.refusedAt)} by ${p.refusedBy || '?'}` : null],
      ['Refunded', p.refundedAt ? `${fmtTime(p.refundedAt)}${p.refundNote ? ' — ' + p.refundNote : ''}` : null],
      ['Customer', p.account?.email], ['Payment id', h('span', { class: 't-sub', text: tx })]
    ])),
    view.byId.has(p.inviteId) ? block('Letter', h('ul', { class: 'ad-mini' }, h('li', {}, h('button', { type: 'button', onclick: () => actions.open.letter(p.inviteId), text: lettersName(view.byId.get(p.inviteId)) }), chip(view.byId.get(p.inviteId).state)))) : block('Letter', h('p', { class: 'ad-hint', text: 'Deleted' })),
    form ? block('Refund', form) : null
  );
}
