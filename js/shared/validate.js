// Checks everything the browser sends before it is saved. Never trust the page.
import { AppError } from './errors.js';

export const LANGS = ['uz', 'ru', 'en'];
export const STYLES = ['tender', 'poetic', 'playful', 'honest', 'classic'];
// What she does after reading: choose a dish and a day ('full'), only a dish ('dish'), or just read ('none').
export const ASKS = ['full', 'dish', 'none'];

// Exact domain endings only: "maps.google.com.evil.io" must NOT pass.
const GOOGLE_TLD = '(com|uz|ru|kz|co\\.uk|de|com\\.tr|ae)';
const MAP_HOSTS = [
  new RegExp(`^(www\\.)?google\\.${GOOGLE_TLD}$`),   // google.com/maps, google.uz/maps …
  new RegExp(`^maps\\.google\\.${GOOGLE_TLD}$`),
  /^maps\.app\.goo\.gl$/,
  /^goo\.gl$/,                          // goo.gl/maps/…
  /^(www\.)?yandex\.(uz|ru|com|kz)$/,   // yandex.uz/maps
  /^(www\.)?(2gis\.(uz|ru|kz|com)|go\.2gis\.com)$/
];

export const looksLikeUrl = s => /^[a-z][a-z0-9+.-]*:/i.test((s || '').trim()) || /^www\./i.test((s || '').trim());

// Only real map links are allowed, so a letter can't send her to a fake website.
export function isMapUrl(s) {
  let u;
  try { u = new URL((s || '').trim()); } catch { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!MAP_HOSTS.some(re => re.test(host))) return false;
  if (/^(www\.)?google\./.test(host) || host === 'goo.gl') return u.pathname.startsWith('/maps');
  if (/yandex\./.test(host)) return u.pathname.startsWith('/maps');
  return true;
}

const str = (v, max, field, { required = false } = {}) => {
  if (v === undefined || v === null) v = '';
  if (typeof v !== 'string') throw new AppError('invalid-argument', `${field} must be text`);
  const s = v.trim();
  if (required && !s) throw new AppError('invalid-argument', `${field} is required`);
  if (s.length > max) throw new AppError('invalid-argument', `${field} is too long`);
  return s;
};

export function checkPin(pin) {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) throw new AppError('invalid-argument', 'The code must be 4 digits');
  return pin;
}

export function checkId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{16,40}$/.test(id)) throw new AppError('not-found', 'Letter not found');
  return id;
}

export function checkBox(box, maxData, field) {
  if (!box || typeof box !== 'object') throw new AppError('invalid-argument', `${field} is missing`);
  const iv = str(box.iv, 64, `${field}.iv`, { required: true });
  if (!/^[A-Za-z0-9+/=]{4,64}$/.test(iv)) throw new AppError('invalid-argument', `${field}.iv is not valid`);
  const data = typeof box.data === 'string' ? box.data : '';
  if (!data || data.length > maxData || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new AppError('invalid-argument', `${field} is not valid`);
  // salt: random value used with the code to make the key (only the letter has one)
  if (box.salt === undefined) return { iv, data };
  if (typeof box.salt !== 'string' || !/^[A-Za-z0-9+/=]{8,64}$/.test(box.salt)) throw new AppError('invalid-argument', `${field}.salt is not valid`);
  return { iv, data, salt: box.salt };
}

// The whole "create a letter" request.
export function checkCreate(input) {
  const d = input || {};
  const lang = LANGS.includes(d.lang) ? d.lang : null;
  if (!lang) throw new AppError('invalid-argument', 'Unknown language');
  const pin = checkPin(d.pin);
  const hint = str(d.hint, 60, 'hint');
  const content = checkBox(d.content, 1000000, 'content');
  if (!content.salt) throw new AppError('invalid-argument', 'content.salt is required');   // without it nobody could unlock the letter
  const m = d.meta || {};
  const girlName = str(m.girlName, 30, 'girlName', { required: true });
  const from = str(m.from, 30, 'from', { required: true });
  const pickup = m.pickup === true;
  // Old pages send no `ask`: that means the full flow.
  if (m.ask !== undefined && !ASKS.includes(m.ask)) throw new AppError('invalid-argument', 'Unknown ask');
  const ask = m.ask || 'full';
  if (!Array.isArray(m.dishes) || m.dishes.length !== (ask === 'none' ? 0 : 3)) {
    throw new AppError('invalid-argument', ask === 'none' ? 'A letter-only letter has no dishes' : 'Exactly 3 dishes are needed');
  }
  const dishes = m.dishes.map((x, i) => {
    const dish = x || {};
    const name = str(dish.name, 40, `dish ${i + 1} name`, { required: true });
    const place = str(dish.place, 60, `dish ${i + 1} place`, { required: !pickup });
    const location = str(dish.location, 300, `dish ${i + 1} location`, { required: !pickup });
    if (looksLikeUrl(location) && !isMapUrl(location)) throw new AppError('invalid-argument', 'Only Google Maps, Yandex Maps or 2GIS links are allowed', { reason: 'map-only', dish: i });
    return { name, place, location };
  });
  // Random key for her answer (base64 of 32 bytes); old pages send none.
  if (m.answerKey !== undefined && (typeof m.answerKey !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(m.answerKey))) throw new AppError('invalid-argument', 'answerKey is not valid');
  const meta = { girlName, from, pickup: ask === 'none' ? false : pickup, ask, dishes };
  if (m.answerKey) meta.answerKey = m.answerKey;
  return { lang, pin, hint, content, meta };
}
