// Talks to the server. Live: POST /api/<action> on this same site (Netlify functions, see
// netlify/lib/http.mjs) + Firebase for Google login and reading his letters.
// DEMO MODE (no Firebase settings, or on localhost): the same rules, kept in this browser only.
import { firebaseConfig, authOnSite } from './config.js';

// Demo mode: no Firebase settings, or running on this computer (node serve.mjs).
const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
export const DEMO = !firebaseConfig.apiKey || LOCAL;
export const validId = id => /^[A-Za-z0-9]{16,40}$/.test(id || '');

// Every failure becomes a StoreError with a short `reason` the pages translate:
// not-found, not-paid, wrong-code (triesLeft), paused (waitSec), locked, already-answered,
// daily-limit, map-only, no-space, network, unknown. Admin gifts add: not-unpaid, already-paid, invalid-argument.
import { checkCreate } from './shared/validate.js';
import { lockVerdict } from './shared/lock.js';
import { TERMS_VERSION } from './shared/terms.js';
import { tashkentDay, shiftDay, dayNumbers, MAX_FREE, STAGES, MAX_NOTE, MAX_TAGS, MAX_TAG, MAX_LOG, MAX_LOG_TEXT, validDay } from './shared/stats.js';

export class StoreError extends Error {
  constructor(reason, extra = {}) { super(reason); this.reason = reason; Object.assign(this, extra); }
}

// Firebase is served from our own site (public/vendor/, see its README), so no code is loaded from an outside server.
const SDK = new URL('../vendor/firebase-10.12.2/', import.meta.url).href;
let fbPromise = null;
function fb() {
  fbPromise ??= (async () => {
    // Firebase looks for extra settings in a global, then in a `__FIREBASE_DEFAULTS__` cookie. We use neither, and
    // reading document.cookie shows up as a speed warning in Chrome's Issues panel, so an empty global ends the search.
    globalThis.__FIREBASE_DEFAULTS__ ??= {};
    const [appM, A, F] = await Promise.all([
      import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
    // Sign-in on our own address when it is set up (config.js → authOnSite), otherwise on firebaseapp.com.
    const authDomain = (authOnSite || []).includes(location.hostname) ? location.hostname : firebaseConfig.authDomain;
    const app = appM.initializeApp({ ...firebaseConfig, authDomain });
    return { A, F, auth: A.getAuth(app), db: F.getFirestore(app) };
  })().catch(e => { fbPromise = null; throw e; });   // a failed download must not be remembered: the next try starts fresh
  return fbPromise;
}

// AbortSignal.timeout is missing in older phones (iOS ≤ 15): fall back to a timer.
function timeoutSignal(ms) {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

// Calls a server action. Sends his Google sign-in token when he is signed in (auth: true).
// Her page calls with auth: false, so it never downloads the Firebase tools. A letter with photos is a big upload: it gets longer.
async function callFn(name, data, { fresh = false, timeoutMs = 30000, auth: withAuth = true } = {}) {
  const auth = withAuth ? (await fb()).auth : null;
  const headers = { 'Content-Type': 'application/json' };
  if (auth?.currentUser) headers.Authorization = 'Bearer ' + await auth.currentUser.getIdToken(fresh);
  let res, body;
  try { res = await fetch('/api/' + name, { method: 'POST', headers, body: JSON.stringify({ data }), signal: timeoutSignal(timeoutMs) }); }
  catch { throw new StoreError('network'); }
  try { body = await res.json(); } catch { body = null; }   // the platform's own 429 page is not JSON
  // Sign-in token refused: try once with a brand-new token, then ask him to sign in again.
  if (res.status === 401 && auth?.currentUser) {
    if (!fresh) return callFn(name, data, { fresh: true, timeoutMs, auth: withAuth });
    throw new StoreError('signin');
  }
  if (res.ok && body && 'data' in body) return body.data;
  const err = body?.error || {};
  const d = err.details || {};
  if (d.reason) throw new StoreError(d.reason, d);   // the server's own reason first: "paused" and "daily-limit" are also 429s
  if (res.status === 429) throw new StoreError('busy');
  if (err.code === 'not-found') throw new StoreError('not-found');
  if (!body || res.status >= 500 || err.code === 'unavailable') throw new StoreError('network');
  throw new StoreError('unknown', { code: err.code });
}

const mapUser = u => u ? { uid: u.uid, name: u.displayName || '', photo: u.photoURL || '' } : null;

// ---------- sign in ----------
export function onUser(cb) {
  if (DEMO) { const f = () => cb(demo.user()); demo.watchers.add(f); f(); return; }
  // A failed download is not "signed out": the 2nd argument says so, and the page shows a failure with a Retry button.
  fb().then(({ A, auth }) => A.onAuthStateChanged(auth, u => cb(mapUser(u)))).catch(() => cb(null, 'load-failed'));
}

export async function signIn() {
  if (DEMO) { demo.signIn(); return; }
  const { A, auth } = await fb();
  const provider = new A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await A.signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return A.signInWithRedirect(auth, provider);
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    throw e;
  }
}

// After a "redirect" sign-in (used when the popup is blocked) Firebase reports problems here, on the next page load.
export async function signInRedirectError() {
  if (DEMO) return null;
  try { const { A, auth } = await fb(); await A.getRedirectResult(auth); return null; }
  catch (e) { return e?.code || 'unknown'; }
}

export async function signOut() {
  if (DEMO) { demo.signOut(); return; }
  const { A, auth } = await fb();
  await A.signOut(auth);
}

// ---------- his side ----------
// input = { lang, pin, hint, content: {iv,data}, meta: {girlName, from, pickup, dishes} }
export const createLetter = input => (DEMO ? demo.createLetter(input) : callFn('createLetter', input, { timeoutMs: 90000 }));
export const deleteLetter = id => (DEMO ? demo.deleteLetter(id) : callFn('deleteLetter', { id }));
export const unlockLetter = id => (DEMO ? demo.unlockLetter(id) : callFn('unlockLetter', { id }));
export const startPayment = (id, lang) => (DEMO ? demo.startPayment(id) : callFn('startPayment', { id, lang }));
export const checkPayment = id => (DEMO ? demo.checkPayment(id) : callFn('checkLetterPayment', { id }));
// Demo only: "I sent the receipt in Telegram" (there is no real bot here).
export const demoReceipt = id => (DEMO ? demo.receipt(id) : Promise.reject(new StoreError('unknown')));
export const linkKey = () => (DEMO ? demo.linkKey() : callFn('linkKey', {}));
// "I have read the terms": termsStatus() asks which version he accepted, acceptTerms(v) records it (date + version).
export const termsStatus = () => (DEMO ? demo.terms() : callFn('terms', {}));
export const acceptTerms = version => (DEMO ? demo.terms(version) : callFn('terms', { accept: version }));
export const fakePay = (tx, cancel = false) => (DEMO ? demo.fakePay(tx, cancel) : callFn('fakePay', { tx, cancel }));
// Admin panel (admin.html): username + password → a 12-hour pass kept only in this tab (sessionStorage).
// The demo takes demo / demo. No Google sign-in here, so the page never loads Firebase.
const ADMIN_KEY = 'cupidon.admin.token';
export const adminSignedIn = () => { try { return !!sessionStorage.getItem(ADMIN_KEY); } catch { return false; } };
export function adminLogout() { adminToken = null; try { sessionStorage.removeItem(ADMIN_KEY); } catch { /* private mode */ } }
// The server gives this browser a "device" string at login; it comes back with the next login (it tells the server which
// browser is the owner's usual one). Kept in localStorage, never shown.
const DEVICE_KEY = 'cupidon.admin.device';
const readDevice = () => { try { return localStorage.getItem(DEVICE_KEY) || ''; } catch { return ''; } };
export async function adminLogin(user, password) {
  const device = readDevice();
  const r = DEMO
    ? await demo.adminLogin(user, password, device)
    : await callFn('adminLogin', { user, password, device }, { auth: false });
  if (typeof r.device === 'string' && r.device) { try { localStorage.setItem(DEVICE_KEY, r.device); } catch { /* private mode: no usual browser */ } }
  try { sessionStorage.setItem(ADMIN_KEY, r.token); } catch { /* private mode: works until the page closes */ }
  adminToken = r.token;
  return r;
}
let adminToken = null;
export async function admin(action, data = {}) {
  let token = adminToken;
  try { token = sessionStorage.getItem(ADMIN_KEY) || token; } catch { /* private mode */ }
  if (!token) throw new StoreError('admin-session');
  if (DEMO) return demo.admin(action, data, token);
  return callFn('admin' + action, { ...data, token }, { auth: false, timeoutMs: 60000 });
}

// [{ id, createdAt, status, price, currency, answered, locked, lang, meta }]
export async function listMine() {
  if (DEMO) return demo.listMine();
  const { F, db, auth } = await fb();
  try {
    const snap = await F.getDocs(F.query(F.collection(db, 'invites'), F.where('ownerUid', '==', auth.currentUser.uid)));
    const rows = await Promise.all(snap.docs.map(async d => {
      const m = await F.getDoc(F.doc(d.ref, 'private', 'meta'));
      return { id: d.id, ...d.data(), meta: m.exists() ? m.data() : null };
    }));
    return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch { throw new StoreError('network'); }
}

// ---------- her side ----------
// Public card: { lang, hint, status } or null. The letter itself needs the code.
// Her side never loads Firebase: everything goes through the server (auth: false).
export async function getCard(id) {
  if (!validId(id)) return null;
  if (DEMO) return demo.getCard(id);
  try { return await callFn('getCard', { id }, { auth: false }); }
  catch (e) { if (e.reason === 'not-found') return null; throw e; }
}
// preview: true = he is trying her page himself: everything as usual, but the letter is not marked as opened.
export const openLetter = (id, pin, { preview = false } = {}) => (DEMO ? demo.openLetter(id, pin, preview) : callFn('openLetter', { id, pin, ...(preview ? { preview: true } : {}) }, { auth: false }));
export const submitAnswer = (id, pin, answer) => (DEMO ? demo.submitAnswer(id, pin, answer) : callFn('submitAnswer', { id, pin, answer }, { auth: false }));

// ---------- demo mode: the server rules, in this browser ----------
const demo = (() => {
  const KEY = 'cupidon.demo.v2', UKEY = 'cupidon.demo.user', TKEY = 'cupidon.demo.terms';
  const PRICE = 15000;   // the demo always shows the payment step
  // The demo pays by card transfer like the live site does now. The browser tests set 'online' to use the old test page.
  const payMode = () => { try { return localStorage.getItem('cupidon.demo.payMode') === 'online' ? 'online' : 'manual'; } catch { return 'manual'; } };
  const watchers = new Set();
  const empty = () => ({ letters: {}, payments: {} });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || empty(); } catch { return empty(); } };
  const save = all => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { throw new StoreError('no-space'); } };
  const rid = n => { const a = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return [...crypto.getRandomValues(new Uint8Array(n))].map(x => a[x % a.length]).join(''); };
  const user = () => { try { return JSON.parse(localStorage.getItem(UKEY)); } catch { return null; } };
  const pause = () => new Promise(r => setTimeout(r, 250));   // feels like a real server
  // Free letters the admin gave this account (demo has one account, uid "demo").
  const FKEY = 'cupidon.demo.free', KEEP_MS = 120 * 86400e3;
  const freeCount = () => { const n = Number(localStorage.getItem(FKEY)); return Number.isInteger(n) && n > 0 ? Math.min(n, MAX_FREE) : 0; };
  const setFree = n => { try { localStorage.setItem(FKEY, String(n)); } catch { throw new StoreError('no-space'); } };

  // Same wrong-code rules as the server (shared/lock.js).
  function checkCode(all, id, pin) {
    const l = all.letters[id];
    if (!l) throw new StoreError('not-found');
    if (l.invite.status !== 'active') throw new StoreError('not-paid');
    const { lock, result } = lockVerdict(l.lock, pin === l.meta.pin, Date.now());
    l.lock = lock;
    if (result.justLocked) l.invite.locked = true;
    save(all);
    if (result.ok) return l;
    throw new StoreError(result.reason, result);
  }
  const own = (all, id) => { const l = all.letters[id]; if (!l) throw new StoreError('not-found'); return l; };

  return {
    watchers, user,
    signIn() { localStorage.setItem(UKEY, JSON.stringify({ uid: 'demo', name: '', photo: '' })); watchers.forEach(f => f()); },
    signOut() { localStorage.removeItem(UKEY); watchers.forEach(f => f()); },
    // { key, freeLetters }: the same answer as the server (the count is what the admin gave him; the demo always has a price).
    linkKey() {
      let key = localStorage.getItem('cupidon.demo.linkKey');
      if (!key) { key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))); localStorage.setItem('cupidon.demo.linkKey', key); }
      return { key, freeLetters: freeCount(), payMode: payMode() };
    },
    // Same rule as the server: only the current version can be accepted.
    async terms(accept) {
      await pause();
      if (accept !== undefined) {
        if (accept !== TERMS_VERSION) throw new StoreError('old-terms');
        if (localStorage.getItem(TKEY) !== TERMS_VERSION) localStorage.setItem(TKEY, TERMS_VERSION);
      }
      return { accepted: localStorage.getItem(TKEY), current: TERMS_VERSION };
    },
    async createLetter(input) {
      await pause();
      let d;
      try { d = checkCreate(input); }   // the very same checks as the server
      catch (e) { throw new StoreError(e.details?.reason || 'invalid', e.details || {}); }
      if (localStorage.getItem(TKEY) !== TERMS_VERSION) throw new StoreError('terms');   // same as the server: terms first
      const all = load();
      const id = rid(20), now = Date.now();
      const gift = freeCount() > 0;   // a free letter from the admin: sent at once, no payment (like the server)
      all.letters[id] = {
        invite: { ownerUid: 'demo', createdAt: now, lang: d.lang, hint: d.hint, status: gift ? 'active' : 'unpaid', price: gift ? 0 : PRICE, currency: 'UZS', answered: false, locked: false, openedAt: null, lastTx: null, ...(gift ? { gift: 'credit', expireAt: now + KEEP_MS } : {}) },
        content: d.content,
        meta: { ...d.meta, dishes: d.meta.dishes.map(({ name, place }) => ({ name, place })), pin: d.pin, lang: d.lang, salt: d.content.salt, answer: null, answeredAt: null },
        lock: { fails: 0, totalFails: 0, pausedUntil: 0 }
      };
      save(all);
      if (gift) { setFree(freeCount() - 1); return { id, status: 'active', price: 0, currency: 'UZS', gift: true }; }
      return { id, status: 'unpaid', price: PRICE, currency: 'UZS' };
    },
    async listMine() {
      return Object.entries(load().letters).map(([id, l]) => ({ id, ...l.invite, meta: l.meta })).sort((a, b) => b.createdAt - a.createdAt);
    },
    async deleteLetter(id) { const all = load(); delete all.letters[id]; save(all); return { ok: true }; },
    // Same answers as functions/src/admin.js, from this browser's demo letters.
    async adminLogin(u, p) {   // (a 3rd argument, the device string, is accepted and ignored here)
      await pause();
      if (u !== 'demo' || p !== 'demo') throw new StoreError('admin-wrong');
      return { token: 'demo-admin', expiresAt: Date.now() + 12 * 3600e3, device: 'demo-device' };
    },
    async admin(action, d, token) {
      await pause();
      if (token !== 'demo-admin') throw new StoreError('admin-session');
      const all = load();
      const CKEY = 'cupidon.demo.crm', LKEY = 'cupidon.demo.adminLog';
      let crm = {};
      try { crm = JSON.parse(localStorage.getItem(CKEY)) || {}; } catch { /* start empty */ }
      // A customer record with every field present (old records have only note + tags).
      const full = r => ({ note: '', tags: [], stage: '', followUp: '', log: [], updatedAt: 0, ...(r || {}) });
      const saveCrm = () => { try { localStorage.setItem(CKEY, JSON.stringify(crm)); } catch { throw new StoreError('no-space'); } };
      // The admin log: newest last in storage, kept to the last 500.
      const logIt = (action, target, detail = '') => {
        let list = [];
        try { list = JSON.parse(localStorage.getItem(LKEY)) || []; } catch { /* start empty */ }
        list.push({ at: Date.now(), by: 'demo', action, target: String(target || ''), detail: String(detail || '') });
        try { localStorage.setItem(LKEY, JSON.stringify(list.slice(-500))); } catch { /* the log is never worth failing an action */ }
      };
      // Daily numbers from this browser's letters, oldest day first; quiet days are left out (like the server's saved days).
      const statsFor = (from, to) => {
        const snap = { letters: Object.values(all.letters), payments: Object.values(all.payments || {}) };
        const out = [];
        for (let day = from; day <= to && out.length < 400; day = shiftDay(day, 1)) {
          const n = dayNumbers(snap, day);
          if (n.sealed || n.opened || n.answered || n.paidCount || n.refunded) out.push(n);
        }
        return out;
      };
      if (action === 'Overview') {
        const now = Date.now(), today = tashkentDay(now);
        return {
          at: now, today,
          settings: { provider: payMode() === 'manual' ? 'manual' : 'fake', price: PRICE, currency: 'UZS', maxPerDay: 0, maxTotalPerDay: 0, keepDays: 120, unpaidKeepDays: 7 },
          letters: Object.entries(all.letters).map(([id, l]) => ({ id, invite: { ownerUid: 'demo', ...l.invite }, meta: l.meta || null, lock: l.lock || null })),
          payments: Object.entries(all.payments || {}).map(([tx, p]) => ({ tx, ownerUid: 'demo', ...p })),
          customers: [{ uid: 'demo', terms: { version: localStorage.getItem(TKEY), at: null }, freeLetters: freeCount(), crm: crm.demo ? full(crm.demo) : null }],
          accounts: [{ uid: 'demo', email: 'demo@maktubim.test', name: 'Demo', createdAt: now - 864e5, lastSignIn: now, disabled: false }],
          limitsAll: null,
          lastCleanupAt: now - 5 * 3600e3,
          stats: statsFor(shiftDay(today, -89), today)
        };
      }
      if (action === 'Stats') {
        if (!validDay(d?.from) || !validDay(d?.to) || d.from > d.to || Date.parse(d.to) - Date.parse(d.from) > 400 * 86400000) throw new StoreError('invalid-argument');
        return { stats: statsFor(d.from, d.to) };
      }
      if (action === 'Unlock') { const r = await this.unlockLetter(d.id); logIt('unlock', d.id); return r; }
      if (action === 'Delete') { const r = await this.deleteLetter(d.id); logIt('delete', d.id); return r; }
      if (action === 'SaveCustomer') {
        const old = full(crm[d.uid]);
        const stage = d.stage === undefined ? old.stage : d.stage;
        const followUp = d.followUp === undefined ? old.followUp : d.followUp;
        // Like the server: a field that is not sent keeps its saved value, and the same limits apply.
        const note = d.note === undefined ? old.note : String(d.note).trim();
        const tags = d.tags === undefined ? old.tags : [...new Set((Array.isArray(d.tags) ? d.tags : []).map(t => String(t).trim().toLowerCase()).filter(Boolean))];
        if (!STAGES.includes(stage) || (followUp !== '' && !validDay(followUp)) || note.length > MAX_NOTE || tags.length > MAX_TAGS || tags.some(t => t.length > MAX_TAG)) throw new StoreError('invalid-argument');
        const rec = { ...old, note, tags, stage, followUp, updatedAt: Date.now() };
        crm[d.uid] = rec; saveCrm(); logIt('customer', d.uid);
        return rec;
      }
      if (action === 'AddNote') {
        const text = String(d.text ?? '').trim();
        if (!text || text.length > MAX_LOG_TEXT) throw new StoreError('invalid-argument');
        const rec = full(crm[d.uid]);
        if (rec.log.length >= MAX_LOG) throw new StoreError('notes-full', { code: 'failed-precondition' });
        rec.log = [...rec.log, { id: rid(12), at: Date.now(), by: 'demo', text }];
        rec.updatedAt = Date.now();
        crm[d.uid] = rec; saveCrm(); logIt('note', d.uid);
        return rec;
      }
      if (action === 'DeleteNote') {
        const rec = full(crm[d.uid]);
        if (!rec.log.some(n => n.id === d.id)) throw new StoreError('not-found');
        rec.log = rec.log.filter(n => n.id !== d.id);
        rec.updatedAt = Date.now();
        crm[d.uid] = rec; saveCrm(); logIt('noteDelete', d.uid, d.id);
        return rec;
      }
      if (action === 'Activity') {
        let list = [];
        try { list = JSON.parse(localStorage.getItem(LKEY)) || []; } catch { /* start empty */ }
        return { entries: list.slice(-100).reverse() };
      }
      if (action === 'GiveFree') {
        const add = d?.add;
        if (typeof d?.uid !== 'string' || !d.uid || !Number.isInteger(add) || add === 0 || add < -MAX_FREE || add > MAX_FREE) throw new StoreError('invalid-argument');
        const now = d.uid === 'demo' ? freeCount() : 0;
        const next = Math.min(MAX_FREE, Math.max(0, now + add));
        if (d.uid === 'demo') setFree(next);
        logIt('giveFree', d.uid, `add=${add > 0 ? '+' : ''}${add} now=${next}`);
        return { uid: d.uid, freeLetters: next };
      }
      if (action === 'SendFree') {
        const l = all.letters[d?.id];
        if (!l) throw new StoreError('not-found');
        if (l.invite.status !== 'unpaid') throw new StoreError('not-unpaid', { code: 'failed-precondition' });
        // Like the server: a payment that already went through (not yet noticed) must not get a gift mark.
        if (Object.values(all.payments || {}).some(p => p.inviteId === d.id && p.provider === 'manual' && p.receiptAt && !p.refusedAt && p.status === 'created')) throw new StoreError('receipt-waiting', { code: 'failed-precondition' });
        if (Object.values(all.payments || {}).some(p => p.inviteId === d.id && p.status === 'succeeded')) throw new StoreError('already-paid', { code: 'failed-precondition' });
        const now = Date.now();
        Object.assign(l.invite, { status: 'active', expireAt: now + KEEP_MS, gift: 'admin', giftAt: now });
        save(all); logIt('sendFree', d.id);
        return { ok: true, invite: { status: 'active', gift: 'admin', giftAt: now, expireAt: l.invite.expireAt } };
      }
      // Card-transfer payments: he sent a receipt, the admin checks the bank app (the real bot + group are the server's job).
      if (action === 'ManualConfirm' || action === 'ManualRefuse') {
        const p = all.payments?.[d?.tx];
        if (!p || p.provider !== 'manual') throw new StoreError('not-found');
        const l = all.letters[p.inviteId], now = Date.now();
        const closed = p.status === 'canceled' || !!p.refusedAt;
        if (action === 'ManualConfirm') {
          if (p.status === 'succeeded') return { status: 'succeeded', done: 'again', again: true };
          if (closed) throw new StoreError('closed', { code: 'failed-precondition' });
          if (!l) {
            Object.assign(p, { status: 'paid-no-letter', paidAt: now, confirmedAt: now, confirmedBy: 'demo', via: 'panel' });
            save(all); logIt('manualConfirm', p.inviteId);
            return { status: 'paid-no-letter', done: 'gone', again: false };
          }
          const second = l.invite.status === 'active';   // already on (paid twice or sent for free)
          Object.assign(p, { status: 'succeeded', paidAt: now, confirmedAt: now, confirmedBy: 'demo', via: 'panel', ...(second ? { refundReason: 'second' } : {}) });
          if (!second) Object.assign(l.invite, { status: 'active', expireAt: now + KEEP_MS });
          save(all); logIt('manualConfirm', p.inviteId);
          return { status: 'succeeded', done: second ? 'duplicate' : 'paid', again: false };
        }
        if (p.status === 'succeeded') throw new StoreError('paid', { code: 'failed-precondition' });
        if (closed) return { status: 'canceled', again: true };
        Object.assign(p, { status: 'canceled', refusedAt: now, refusedBy: 'demo' });
        if (l) delete l.invite.payCheck;
        save(all); logIt('manualRefuse', p.inviteId);
        return { status: 'canceled', again: false };
      }
      if (action === 'BotInfo') return { url: location.origin + '/api/tg', pending: 0, lastError: '', demo: true };
      if (action === 'BotConnect') return { ok: true, url: location.origin + '/api/tg', demo: true };
      if (action === 'MarkRefunded') {
        const p = all.payments?.[d.tx];
        if (!p) throw new StoreError('not-found');
        Object.assign(p, { refundedAt: Date.now(), refundNote: String(d.note || ''), refundedBy: 'demo' }); save(all);
        logIt('refund', d.tx, d.note ? 'with note' : '');   // never the note's text, like the server
        return p;
      }
      throw new StoreError('unknown');
    },
    async unlockLetter(id) { const all = load(); const l = own(all, id); l.lock = { fails: 0, totalFails: 0, pausedUntil: 0 }; l.invite.locked = false; save(all); return { ok: true }; },
    async startPayment(id) {
      await pause();
      const all = load(); const l = own(all, id);
      if (l.invite.status === 'active') return { alreadyPaid: true };
      if (payMode() === 'manual') {
        // Like the server: an open order is reused, so pressing again keeps the same code.
        let tx = l.invite.lastTx;
        if (!(all.payments[tx]?.provider === 'manual' && all.payments[tx].status === 'created')) {
          tx = crypto.randomUUID();
          all.payments[tx] = { inviteId: id, amount: l.invite.price, status: 'created', createdAt: Date.now(), provider: 'manual', code: 'MK-' + rid(8).toUpperCase() };
          l.invite.lastTx = tx;
          save(all);
        }
        const code = all.payments[tx].code;
        return { manual: { card: '0000 0000 0000 0000', cardName: 'DEMO', amount: l.invite.price, currency: 'UZS', code, botUrl: 'https://t.me/maktubimhelpbot?start=' + code } };
      }
      const tx = crypto.randomUUID();
      all.payments[tx] = { inviteId: id, amount: l.invite.price, status: 'created', createdAt: Date.now() };
      l.invite.lastTx = tx;
      save(all);
      return { payUrl: new URL('../pay-test.html#' + tx, import.meta.url).href };
    },
    async receipt(id) {
      await pause();
      const all = load(); const l = own(all, id);
      const p = all.payments[l.invite.lastTx];
      if (!p || p.provider !== 'manual') throw new StoreError('not-found');
      const now = Date.now();
      Object.assign(p, { receiptAt: p.receiptAt || now, receipts: (p.receipts || 0) + 1, tgUser: '@demo' });
      l.invite.payCheck = l.invite.payCheck || now;
      save(all);
      return { ok: true };
    },
    async fakePay(tx, cancel) {
      await pause();
      const all = load(); const p = all.payments[tx];
      if (!p) throw new StoreError('not-found');
      p.status = cancel ? 'canceled' : 'succeeded';
      if (!cancel) p.paidAt = Date.now();
      if (!cancel && all.letters[p.inviteId]) all.letters[p.inviteId].invite.status = 'active';
      save(all);
      return { status: p.status, inviteId: p.inviteId };
    },
    async checkPayment(id) {
      const all = load(); const l = own(all, id);
      return { status: l.invite.status, payment: all.payments[l.invite.lastTx]?.status || '' };
    },
    async getCard(id) { const l = load().letters[id]; return l ? { lang: l.invite.lang, hint: l.invite.hint || '', status: l.invite.status } : null; },
    async openLetter(id, pin, preview) {
      await pause();
      const all = load(); const l = checkCode(all, id, pin);
      if (!preview && !l.invite.openedAt) { l.invite.openedAt = Date.now(); save(all); }
      return { content: l.content, answer: l.meta.answer };
    },
    async submitAnswer(id, pin, answer) {
      await pause();
      const all = load(); const l = checkCode(all, id, pin);
      if (l.meta.answer) throw new StoreError('already-answered');
      l.meta.answer = answer; l.meta.answeredAt = Date.now(); l.invite.answered = true;
      save(all);
      return { ok: true };
    }
  };
})();
