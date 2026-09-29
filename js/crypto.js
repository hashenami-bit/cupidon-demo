// The letter (her name, text, photos) is locked with a key made from the 4-digit code.
// The database only ever holds the locked version, so opening the link without the code shows nothing.
const enc = new TextEncoder();
const dec = new TextDecoder();
const ITERATIONS = 250000;

export function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const randomBytes = n => crypto.getRandomValues(new Uint8Array(n));

export const randomSalt = () => b64(randomBytes(16));
export const cryptoReady = () => !!(window.crypto && crypto.subtle);

export async function deriveKey(pin, saltB64) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: unb64(saltB64), iterations: ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptJSON(key, obj) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), data: b64(ct) };
}

// Throws when the key (the code) is wrong.
export async function decryptJSON(key, box) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data));
  return JSON.parse(dec.decode(pt));
}
