// The loaded data and what is derived from it. `state` is one object so every module always sees the fresh
// data/view (they are replaced on every load). `actions` is a small registry filled by admin.js: modules call
// each other (drawer → drawer, button → reload) through it, so no module imports another one at top level.
import { answerKeyFrom, deriveKey, decryptJSON, cryptoReady } from '../crypto.js';
import { answerShapeOk } from '../common.js';
import { h } from './ui.js';
import { tashkentDay } from '../shared/stats.js';

export const state = {
  data: null,   // the overview from the server
  view: null    // derived: letters, customers, payments with everything joined
};
// The server runs a cleanup every night (old letters, unpaid letters, login counters). No record, or one older than
// 36 hours, means the night job is not running: letters pile up and nothing is deleted on time.
const CLEANUP_LATE_MS = 36 * 3600 * 1000;
export const cleanupLate = () => typeof state.data?.lastCleanupAt !== 'number' || Date.now() - state.data.lastCleanupAt > CLEANUP_LATE_MS;
export const answers = new Map();   // letter id → decrypted answer | 'unreadable'

// actions.load(fresh) reloads; actions.open.letter(id) / .customer(uid) / .payment(tx) open a drawer;
// actions.render.letter() / .cust() / .pay() redraw one table; actions.renderAll() redraws every tab from state.
export const actions = { load: async () => false, renderAll: () => {}, open: {}, render: {} };

export async function readAnswer(l) {
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
export function letterState(l) {
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
export const STATES = [['all', 'All'], ['unpaid', 'Not paid'], ['notOpened', 'Not opened'], ['opened', 'Opened'], ['read', 'Letter only'], ['dish', 'Picked a dish'], ['yes', 'Said yes + day'], ['locked', 'Locked'], ['waiting', 'Old']];


// Customer stages (the owner's own marks): word + chip colour. '' = none.
export const STAGE_LABEL = { reply: 'Needs reply', waiting: 'Waiting for them', solved: 'Solved' };
export const STAGE_TONE = { reply: 'warn', waiting: '', solved: 'good' };

export const lettersName = l => `${l.meta?.from || '?'} → ${l.meta?.girlName || '?'}`;

export function build() {
  const { data } = state;
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
  // A payment that lands on a letter sent for free is the first success but still needs a refund.
  const giftOf = new Map(data.letters.filter(l => l.invite.gift).map(l => [l.id, l.invite.gift]));
  const payments = data.payments.map(p => {
    // p.refundReason is written by the server when the payment lands on a letter that was already on: it still says so
    // after the letter (and with it the other clues) has been deleted.
    const second = p.status === 'succeeded' && (firstSuccess.get(p.inviteId) !== p.tx || p.refundReason === 'second');
    const giftPaid = p.status === 'succeeded' && (giftOf.has(p.inviteId) || p.refundReason === 'gift');
    const refund = !p.refundedAt && (p.status === 'paid-no-letter' || p.status === 'amount-mismatch' || second || giftPaid);
    // Card transfer: he sent a receipt and nobody has confirmed or refused it yet.
    const waiting = p.provider === 'manual' && !!p.receiptAt && !p.refusedAt && !['succeeded', 'canceled', 'failed', 'expired', 'paid-no-letter', 'amount-mismatch'].includes(p.status);
    return { ...p, second, giftPaid, refund, waiting, account: accounts.get(p.ownerUid) };
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const letters = data.letters.map(l => {
    const m = l.meta || {};
    const account = accounts.get(l.invite.ownerUid);
    const state = letterState(l);
    const gift = l.invite.gift || '';
    const search = [m.girlName, m.from, account?.email, account?.name, m.pin, l.id, l.invite.hint, gift && 'gift free'].filter(Boolean).join(' ').toLowerCase();
    return { ...l, gift, state, account, payments: payByLetter.get(l.id) || [], search };
  }).sort((a, b) => (b.invite.createdAt || 0) - (a.invite.createdAt || 0));

  const uids = new Set([...accounts.keys(), ...crm.keys(), ...letters.map(l => l.invite.ownerUid)]);
  const today = tashkentDay(Date.now());
  const customers = [...uids].map(uid => {
    const a = accounts.get(uid) || { uid, email: '', name: '' };
    const c = crm.get(uid) || {};
    const mine = letters.filter(l => l.invite.ownerUid === uid);
    const paid = payments.filter(p => p.ownerUid === uid && p.status === 'succeeded' && !p.refundedAt).reduce((s, p) => s + (p.amount || 0), 0);
    const tags = c.crm?.tags || [];
    const note = c.crm?.note || '';
    const search = [a.email, a.name, uid, tags.join(' '), note].join(' ').toLowerCase();
    // Old records have no stage / follow-up / log; `due` = a follow-up day is set and it is today or earlier (Tashkent).
    const stage = c.crm?.stage || '', followUp = c.crm?.followUp || '', log = Array.isArray(c.crm?.log) ? c.crm.log : [];
    return { uid, account: a, terms: c.terms || null, free: Number.isInteger(c.freeLetters) && c.freeLetters > 0 ? c.freeLetters : 0, tags, note, noteAt: c.crm?.updatedAt || null, stage, followUp, log, due: !!followUp && followUp <= today, letters: mine, paid, search };
  }).sort((a, b) => (b.account.lastSignIn || b.account.createdAt || 0) - (a.account.lastSignIn || a.account.createdAt || 0));

  state.view = { letters, customers, payments, byId: new Map(letters.map(l => [l.id, l])), byUid: new Map(customers.map(c => [c.uid, c])) };
}

// ---------- filters ----------
export const filters = { letter: 'all', cust: 'all', pay: 'all' };
export function setFilter(kind, value) {
  filters[kind] = value;
  actions.render[kind]();
}
export function chips(box, kind, options) {
  box.replaceChildren(...options.map(([key, label, n]) => h('button', {
    type: 'button', class: 'ad-chip', 'aria-pressed': String(filters[kind] === key), onclick: () => setFilter(kind, key)
  }, label, n != null ? h('small', { text: n }) : null)));
}
