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
// daily-limit, map-only, no-space, network, unknown.
import { checkCreate } from './shared/validate.js';
import { lockVerdict } from './shared/lock.js';

export class StoreError extends Error {
  constructor(reason, extra = {}) { super(reason); this.reason = reason; Object.assign(this, extra); }
}

// Firebase is served from our own site (public/vendor/, see its README), so no code is loaded from an outside server.
const SDK = new URL('../vendor/firebase-10.12.2/', import.meta.url).href;
let fbPromise = null;
function fb() {
  fbPromise ??= (async () => {
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
  fb().then(({ A, auth }) => A.onAuthStateChanged(auth, u => cb(mapUser(u)))).catch(() => cb(null));
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
export const linkKey = () => (DEMO ? demo.linkKey() : callFn('linkKey', {}));
export const fakePay = (tx, cancel = false) => (DEMO ? demo.fakePay(tx, cancel) : callFn('fakePay', { tx, cancel }));

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
export const openLetter = (id, pin) => (DEMO ? demo.openLetter(id, pin) : callFn('openLetter', { id, pin }, { auth: false }));
export const submitAnswer = (id, pin, answer) => (DEMO ? demo.submitAnswer(id, pin, answer) : callFn('submitAnswer', { id, pin, answer }, { auth: false }));

// ---------- demo mode: the server rules, in this browser ----------
const demo = (() => {
  const KEY = 'cupidon.demo.v2', UKEY = 'cupidon.demo.user';
  const PRICE = 15000;   // the demo always shows the payment step
  const watchers = new Set();
  const empty = () => ({ letters: {}, payments: {} });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || empty(); } catch { return empty(); } };
  const save = all => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { throw new StoreError('no-space'); } };
  const rid = n => { const a = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return [...crypto.getRandomValues(new Uint8Array(n))].map(x => a[x % a.length]).join(''); };
  const user = () => { try { return JSON.parse(localStorage.getItem(UKEY)); } catch { return null; } };
  const pause = () => new Promise(r => setTimeout(r, 250));   // feels like a real server

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
    linkKey() {
      let key = localStorage.getItem('cupidon.demo.linkKey');
      if (!key) { key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))); localStorage.setItem('cupidon.demo.linkKey', key); }
      return { key };
    },
    async createLetter(input) {
      await pause();
      let d;
      try { d = checkCreate(input); }   // the very same checks as the server
      catch (e) { throw new StoreError(e.details?.reason || 'invalid', e.details || {}); }
      const all = load();
      const id = rid(20), now = Date.now();
      all.letters[id] = {
        invite: { ownerUid: 'demo', createdAt: now, lang: d.lang, hint: d.hint, status: 'unpaid', price: PRICE, currency: 'UZS', answered: false, locked: false, openedAt: null, lastTx: null },
        content: d.content,
        meta: { ...d.meta, dishes: d.meta.dishes.map(({ name, place }) => ({ name, place })), pin: d.pin, lang: d.lang, salt: d.content.salt, answer: null, answeredAt: null },
        lock: { fails: 0, totalFails: 0, pausedUntil: 0 }
      };
      save(all);
      return { id, status: 'unpaid', price: PRICE, currency: 'UZS' };
    },
    async listMine() {
      return Object.entries(load().letters).map(([id, l]) => ({ id, ...l.invite, meta: l.meta })).sort((a, b) => b.createdAt - a.createdAt);
    },
    async deleteLetter(id) { const all = load(); delete all.letters[id]; save(all); return { ok: true }; },
    async unlockLetter(id) { const all = load(); const l = own(all, id); l.lock = { fails: 0, totalFails: 0, pausedUntil: 0 }; l.invite.locked = false; save(all); return { ok: true }; },
    async startPayment(id) {
      await pause();
      const all = load(); const l = own(all, id);
      if (l.invite.status === 'active') return { alreadyPaid: true };
      const tx = crypto.randomUUID();
      all.payments[tx] = { inviteId: id, amount: l.invite.price, status: 'created' };
      l.invite.lastTx = tx;
      save(all);
      return { payUrl: new URL('pay-test.html#' + tx, location.href).href };
    },
    async fakePay(tx, cancel) {
      await pause();
      const all = load(); const p = all.payments[tx];
      if (!p) throw new StoreError('not-found');
      p.status = cancel ? 'canceled' : 'succeeded';
      if (!cancel && all.letters[p.inviteId]) all.letters[p.inviteId].invite.status = 'active';
      save(all);
      return { status: p.status, inviteId: p.inviteId };
    },
    async checkPayment(id) {
      const all = load(); const l = own(all, id);
      return { status: l.invite.status, payment: all.payments[l.invite.lastTx]?.status || '' };
    },
    async getCard(id) { const l = load().letters[id]; return l ? { lang: l.invite.lang, hint: l.invite.hint || '', status: l.invite.status } : null; },
    async openLetter(id, pin) {
      await pause();
      const all = load(); const l = checkCode(all, id, pin);
      if (!l.invite.openedAt) { l.invite.openedAt = Date.now(); save(all); }
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
