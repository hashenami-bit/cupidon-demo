// His unfinished letter, kept on this device so a closed tab or a dead battery doesn't lose it.
// IndexedDB (photos are too big for localStorage), one draft per account, always AES-GCM-locked with his
// per-account key (the same key that locks his link secrets, from /api/linkKey). Without that key nothing is saved:
// a draft is never kept unlocked. The server never sees a draft.
import { encryptJSON, decryptJSON } from './crypto.js';

const DB = 'cupidon.drafts', STORE = 'drafts', VERSION = 1;
let dbPromise = null;
// A delete that failed (storage busy or blocked) is written down, per account, and tried again at the next sign-in
// BEFORE the old draft can be offered (it would bring back a letter that was already sealed = a duplicate).
const OWED = uid => 'cupidon.draftDel.' + uid;
const owe = (uid, on) => { try { if (on) localStorage.setItem(OWED(uid), '1'); else localStorage.removeItem(OWED(uid)); } catch { /* private mode: nothing to remember */ } };
const owed = uid => { try { return !!localStorage.getItem(OWED(uid)); } catch { return false; } };

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('blocked'));
  }).catch(e => { dbPromise = null; throw e; });   // private mode or blocked: try again next time
  return dbPromise;
}

function run(mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('aborted'));
  }));
}

// Locks and stores the draft. Throws when it can't (no key, private mode, disk full): the caller says "not saved".
export async function saveDraft(uid, key, data) {
  if (!uid || !key) throw new Error('no-key');
  const box = await encryptJSON(key, data);
  await run('readwrite', s => s.put({ box, savedAt: Date.now() }, uid));
  owe(uid, false);   // a new draft replaced the old one: no delete is owed any more
}

// Returns the draft, or null when there is none or it can't be read (another key, damaged): then it is dropped.
export async function loadDraft(uid, key) {
  if (!uid || !key) return null;
  if (owed(uid)) { await deleteDraft(uid); return null; }   // a delete after sealing failed last time: retry, never offer that draft
  const row = await run('readonly', s => s.get(uid));
  if (!row?.box) return null;
  try { return await decryptJSON(key, row.box); }
  catch { await deleteDraft(uid); return null; }
}

// Returns true when the draft is gone. A failed delete is remembered (see OWED) and tried again later.
export async function deleteDraft(uid) {
  if (!uid) return true;
  try { await run('readwrite', s => s.delete(uid)); owe(uid, false); return true; }
  catch { owe(uid, true); return false; }   // storage busy or blocked
}
