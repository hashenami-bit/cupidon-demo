// Daily numbers for the admin dashboard and the limits of the customer notes (CRM).
// Used by the server (functions/src/stats.js, admin.js) and by the browser (demo store, admin panel),
// so both count a day the very same way.

// The day in Tashkent (UTC+5), e.g. "2026-11-18".
export const tashkentDay = ms => new Date(ms + 5 * 3600 * 1000).toISOString().slice(0, 10);
// The day before / after a "YYYY-MM-DD" day.
export const shiftDay = (day, by) => new Date(Date.parse(day + 'T00:00:00Z') + by * 86400000).toISOString().slice(0, 10);

const inDay = (ms, day) => typeof ms === 'number' && ms > 0 && tashkentDay(ms) === day;

// The numbers of one Tashkent day, counted from an admin snapshot
// ({ letters: [{ invite, meta }], payments: [{ status, paidAt, amount, refundedAt }] }).
//   sealed    letters made that day            sent      of those, the ones that went to her (paid or free)
//   gifted    of those sent, the ones with a gift mark (free credit or "send for free"); not money
//   opened    she opened it that day           answered  she answered that day
//   paidCount / paidSum   payments that succeeded that day and were not refunded
//   refunded  payments marked refunded that day
//   stored    letters in the database when counted
export function dayNumbers(snapshot, day) {
  const letters = snapshot?.letters || [], payments = snapshot?.payments || [];
  const n = {
    day, sealed: 0, sent: 0, gifted: 0, opened: 0, answered: 0, paidCount: 0, paidSum: 0, refunded: 0,
    stored: letters.length, byLang: { uz: 0, ru: 0, en: 0 }, byAsk: { full: 0, dish: 0, none: 0 }
  };
  for (const l of letters) {
    const inv = l.invite || {}, m = l.meta || {};
    if (inDay(inv.createdAt, day)) {
      n.sealed++;
      if (inv.status === 'active') { n.sent++; if (inv.gift) n.gifted++; }
      if (Object.hasOwn(n.byLang, inv.lang)) n.byLang[inv.lang]++;
      const ask = m.ask || 'full';
      if (Object.hasOwn(n.byAsk, ask)) n.byAsk[ask]++;
    }
    if (inDay(inv.openedAt, day)) n.opened++;
    if (inDay(m.answeredAt, day)) n.answered++;
  }
  for (const p of payments) {
    if (p.status === 'succeeded' && !p.refundedAt && inDay(p.paidAt, day)) { n.paidCount++; n.paidSum += Number(p.amount) || 0; }
    if (inDay(p.refundedAt, day)) n.refunded++;
  }
  return n;
}

// Most free letters one account can hold (the admin gives them from the panel).
export const MAX_FREE = 100;

// Customer notes (CRM): one place for the limits and the allowed stages.
export const STAGES = ['', 'reply', 'waiting', 'solved'];   // '' = none, reply = needs our reply, waiting = waiting for them
export const MAX_NOTE = 2000, MAX_TAGS = 12, MAX_TAG = 24;
export const MAX_LOG = 200, MAX_LOG_TEXT = 1000;
export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
// A real calendar day ("2026-02-31" is not one).
export const validDay = d => typeof d === 'string' && DAY_RE.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')) && shiftDay(d, 0) === d;
