// Wrong-code rules, shared by the server (functions/src/core.js) and the demo store (public/js/store.js).
export const MAX_IN_A_ROW = 5;             // wrong codes before a pause
export const PAUSE_MS = 10 * 60 * 1000;    // pause length
export const MAX_TOTAL = 30;               // wrong codes in total before the letter locks until he unlocks it

// lock = saved counters (or null), codeOk = whether the typed code was right, now = time in ms.
// Returns { lock, result }: the counters to save, and { ok: true } or { reason, triesLeft | waitSec, justLocked }.
export function lockVerdict(lock, codeOk, now) {
  const l = { fails: 0, totalFails: 0, pausedUntil: 0, ...(lock || {}) };
  if (l.totalFails >= MAX_TOTAL) return { lock: l, result: { reason: 'locked' } };
  if (l.pausedUntil > now) return { lock: l, result: { reason: 'paused', waitSec: Math.ceil((l.pausedUntil - now) / 1000) } };
  if (codeOk) return { lock: { ...l, fails: 0 }, result: { ok: true } };
  l.fails += 1;
  l.totalFails += 1;
  if (l.totalFails >= MAX_TOTAL) return { lock: l, result: { reason: 'locked', justLocked: true } };
  if (l.fails >= MAX_IN_A_ROW) {
    l.fails = 0;
    l.pausedUntil = now + PAUSE_MS;
    return { lock: l, result: { reason: 'paused', waitSec: PAUSE_MS / 1000 } };
  }
  return { lock: l, result: { reason: 'wrong-code', triesLeft: MAX_IN_A_ROW - l.fails } };
}
