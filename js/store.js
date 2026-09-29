// Talks to the server. With Firebase keys in config.js it calls the real server functions;
// without them it runs DEMO MODE: the same rules, copied here and kept in this browser only.
import { firebaseConfig } from './config.js';

export const DEMO = !firebaseConfig.apiKey;
export const REGION = 'europe-west1';
export const validId = id => /^[A-Za-z0-9]{16,40}$/.test(id || '');

// Every failure becomes a StoreError with a short `reason` the pages translate:
// not-found, not-paid, wrong-code (triesLeft), paused (waitSec), locked, already-answered,
// daily-limit, map-only, no-space, network, unknown.
export class StoreError extends Error {
  constructor(reason, extra = {}) { super(reason); this.reason = reason; Object.assign(this, extra); }
}

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
let fbPromise = null;
function fb() {
  fbPromise ??= (async () => {
    const [appM, A, F, Fn] = await Promise.all([
      import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-firestore.js'), import(SDK + 'firebase-functions.js')]);
    const app = appM.initializeApp(firebaseConfig);
    return { A, F, Fn, auth: A.getAuth(app), db: F.getFirestore(app), fns: Fn.getFunctions(app, REGION) };
  })();
  return fbPromise;
}

async function callFn(name, data) {
  const { Fn, fns } = await fb();
  try {
    const r = await Fn.httpsCallable(fns, name, { timeout: 60000 })(data);
    return r.data;
  } catch (e) {
    const code = String(e.code || '').replace('functions/', '');
    const d = e.details || {};
    if (d.reason) throw new StoreError(d.reason, d);
    if (code === 'not-found') throw new StoreError('not-found');
    if (['unavailable', 'deadline-exceeded'].includes(code) || !navigator.onLine) throw new StoreError('network');
    throw new StoreError('unknown', { code });
  }
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

export async function signOut() {
  if (DEMO) { demo.signOut(); return; }
  const { A, auth } = await fb();
  await A.signOut(auth);
}

// ---------- his side ----------
// input = { lang, pin, hint, content: {iv,data}, meta: {girlName, from, pickup, dishes} }
export const createLetter = input => (DEMO ? demo.createLetter(input) : callFn('createLetter', input));
export const deleteLetter = id => (DEMO ? demo.deleteLetter(id) : callFn('deleteLetter', { id }));
export const unlockLetter = id => (DEMO ? demo.unlockLetter(id) : callFn('unlockLetter', { id }));
export const startPayment = (id, lang) => (DEMO ? demo.startPayment(id) : callFn('startPayment', { id, lang }));
export const checkPayment = id => (DEMO ? demo.checkPayment(id) : callFn('checkLetterPayment', { id }));
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
export async function getCard(id) {
  if (!validId(id)) return null;
  if (DEMO) return demo.getCard(id);
  const { F, db } = await fb();
  try {
    const s = await F.getDoc(F.doc(db, 'cards', id));
    if (!s.exists()) return null;
    const x = s.data();
    return { lang: x.lang, hint: x.hint || '', status: x.status };
  } catch { throw new StoreError('network'); }
}
export const openLetter = (id, pin) => (DEMO ? demo.openLetter(id, pin) : callFn('openLetter', { id, pin }));
export const submitAnswer = (id, pin, answer) => (DEMO ? demo.submitAnswer(id, pin, answer) : callFn('submitAnswer', { id, pin, answer }));

// ---------- demo mode: the server rules, in this browser ----------
const demo = (() => {
  const KEY = 'cupidon.demo.v2', UKEY = 'cupidon.demo.user';
  const PRICE = 15000, IN_A_ROW = 5, PAUSE = 10 * 60 * 1000, MAX_TOTAL = 30;
  const watchers = new Set();
  const empty = () => ({ letters: {}, payments: {} });
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || empty(); } catch { return empty(); } };
  const save = all => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { throw new StoreError('no-space'); } };
  const rid = n => { const a = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return [...crypto.getRandomValues(new Uint8Array(n))].map(x => a[x % a.length]).join(''); };
  const user = () => { try { return JSON.parse(localStorage.getItem(UKEY)); } catch { return null; } };
  const pause = () => new Promise(r => setTimeout(r, 250));   // feels like a real server

  function checkCode(all, id, pin) {
    const l = all.letters[id];
    if (!l) throw new StoreError('not-found');
    if (l.invite.status !== 'active') throw new StoreError('not-paid');
    const k = l.lock, now = Date.now();
    if (k.totalFails >= MAX_TOTAL) throw new StoreError('locked');
    if (k.pausedUntil > now) throw new StoreError('paused', { waitSec: Math.ceil((k.pausedUntil - now) / 1000) });
    if (pin === l.meta.pin) { k.fails = 0; save(all); return l; }
    k.fails++; k.totalFails++;
    if (k.totalFails >= MAX_TOTAL) { l.invite.locked = true; save(all); throw new StoreError('locked'); }
    if (k.fails >= IN_A_ROW) { k.fails = 0; k.pausedUntil = now + PAUSE; save(all); throw new StoreError('paused', { waitSec: PAUSE / 1000 }); }
    save(all);
    throw new StoreError('wrong-code', { triesLeft: IN_A_ROW - k.fails });
  }
  const own = (all, id) => { const l = all.letters[id]; if (!l) throw new StoreError('not-found'); return l; };

  return {
    watchers, user,
    signIn() { localStorage.setItem(UKEY, JSON.stringify({ uid: 'demo', name: '', photo: '' })); watchers.forEach(f => f()); },
    signOut() { localStorage.removeItem(UKEY); watchers.forEach(f => f()); },
    async createLetter(d) {
      await pause();
      const all = load();
      const id = rid(20), now = Date.now();
      all.letters[id] = {
        invite: { ownerUid: 'demo', createdAt: now, lang: d.lang, hint: d.hint, status: 'unpaid', price: PRICE, currency: 'UZS', answered: false, locked: false, lastTx: null },
        content: d.content,
        meta: { ...d.meta, pin: d.pin, lang: d.lang, salt: d.content.salt, answer: null, answeredAt: null },
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
    async openLetter(id, pin) { await pause(); const all = load(); const l = checkCode(all, id, pin); return { content: l.content, answer: l.meta.answer }; },
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
