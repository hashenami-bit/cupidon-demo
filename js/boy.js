// His side: sign in, write a letter, get the link, see her answers.
// Two languages here: `ui` is the language of these pages (corner switch),
// the letter language is picked in the form and only sets the romantic letter.
import * as store from './store.js';
import { deriveKey, encryptJSON, decryptJSON, randomSalt, randomLinkSecret, newAnswerKey, answerKeyFrom, cryptoReady } from './crypto.js';
import { LETTERS, FONTS, SECRET_IDEAS, THEMES, OPENINGS, renderLetter, renderOwn } from './letters.js';
import { LANGS, tr, applyI18n, langSwitch, savedLang, saveLang, guessLang, dayName, validLang } from './i18n.js';
import { compressImage, COUPLE_PHOTO } from './image.js';
import { saveDraft, loadDraft, deleteDraft } from './draft.js';
import { openPhotos } from './lightbox.js';
import { kaptar } from './kaptar.js';
import { $, $$, pinInput, toast, copyText, fmtDM, fmtMs, seenParts, parseISO, inviteLink, siteUrl, isUrl, isMapUrl, linkParam, inAppBrowser, wait, isImageData, downloadBlob, answerShapeOk } from './common.js';
import { startOf, saveIcs } from './date-tools.js';
import { drawQR, qrBlob } from './qr.js';
import { TERMS_VERSION } from './shared/terms.js';

const UI_KEY = 'cupidon.ui';
// /uz/ and /ru/ are the same page with that language written in (for search engines). His own saved choice wins;
// a first visit there takes the page's language and keeps it (so the payment page and the way back stay in it).
const pageLang = validLang(document.documentElement.dataset.pageLang) ? document.documentElement.dataset.pageLang : null;
let ui = savedLang(UI_KEY) || pageLang || guessLang();
if (pageLang && !savedLang(UI_KEY)) saveLang(UI_KEY, pageLang);
const LANG_PAGE = { en: '', uz: 'uz/', ru: 'ru/' };
// The visitors' page is in the HTML as it is shown to a visitor (search engines read it). Someone who was signed in
// last time sees "Loading…" instead until his account is known.
const WAS_IN = 'cupidon.wasIn';
try { if (localStorage.getItem(WAS_IN)) { $('#view-login').hidden = true; $('#view-loading').hidden = false; } } catch { /* private mode */ }
const t = (k, v) => tr(ui, k, v);

let user;            // undefined = still loading, null = signed out
let lastSealed = null;

// The link secret of each letter is kept only on this device (it is never sent to the server), locked with
// a key the server gives only to him after sign-in (store.linkKey). After sign-out the next person on a
// shared computer finds only locked data, while his own device still shows his links when he signs in again.
// Before 2026-10-18 the secrets were kept unlocked in 'cupidon.links': each is moved into the locked store
// when its owner's letter list loads (so a different account never takes them over).
const OLD_LINKS_KEY = 'cupidon.links';
const readJSON = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
let links = {}, linksUid = null, linksLock = null, linksOpened = false, linksReady = Promise.resolve();
const linkSecretOf = id => links[id] || readJSON(OLD_LINKS_KEY)?.[id] || '';
async function getLinksLock() {
  if (!linksLock) {
    const uid = linksUid;
    try {
      const key = await answerKeyFrom((await store.linkKey()).key);
      if (uid === linksUid) linksLock = key;   // a key fetched for someone who has signed out meanwhile is thrown away
    } catch { /* offline */ }
  }
  return linksLock;
}
// Reads the saved (locked) secrets into `links` once. False while the key can't be had: then nothing may be saved,
// or the saved secrets would be overwritten by an almost empty list.
async function mergeStored() {
  if (linksOpened) return true;
  const uid = linksUid, box = readJSON('cupidon.links.' + uid);
  if (box && !await getLinksLock()) return false;
  let saved = {};
  if (box) { try { saved = await decryptJSON(linksLock, box); } catch { /* unreadable: start again */ } }
  if (uid !== linksUid) return false;   // signed out meanwhile
  links = { ...saved, ...links };
  return (linksOpened = true);
}
async function openLinks(uid) { links = {}; linksUid = uid; linksLock = null; linksOpened = false; await mergeStored(); }
function closeLinks() { links = {}; linksUid = null; linksLock = null; linksOpened = false; linksReady = Promise.resolve(); }
async function saveLinks() {
  if (!linksUid || !await mergeStored()) return false;
  try { localStorage.setItem('cupidon.links.' + linksUid, JSON.stringify(await encryptJSON(linksLock || await getLinksLock(), links))); return true; }
  catch { return false; }   // no key, private mode or full: the secret stays in memory only (never unlocked on disk)
}
const saveOld = old => { try { Object.keys(old).length ? localStorage.setItem(OLD_LINKS_KEY, JSON.stringify(old)) : localStorage.removeItem(OLD_LINKS_KEY); } catch { /* nothing to do */ } };
// Secrets that could not be locked yet: kept in memory only, and he is asked to copy the link (security scan 2026-11-14:
// a plain-text fallback in localStorage would hand the link to the next person on a shared computer).
const unsavedLinks = new Set();
// Returns true once the secret is locked on this device. Tries the account key three times (offline / busy server).
async function keepLinkSecret(id, secret) {
  await linksReady;
  if (secret) { links[id] = secret; unsavedLinks.add(id); } else { delete links[id]; unsavedLinks.delete(id); }
  const old = readJSON(OLD_LINKS_KEY) || {};
  if (id in old) { delete old[id]; saveOld(old); }   // never left behind in the old unlocked store
  for (const pause of [0, 1000, 3000]) {
    if (pause) await wait(pause);
    if (await saveLinks()) { unsavedLinks.clear(); return true; }   // everything in memory is locked now
  }
  return !secret;
}
// Moves his own letters' secrets out of the old unlocked store.
async function adoptOldLinks(ids) {
  const old = readJSON(OLD_LINKS_KEY);
  const mine = old ? ids.filter(id => old[id]) : [];
  if (!mine.length) return;
  mine.forEach(id => { links[id] = old[id]; });
  if (!await saveLinks()) return;
  unsavedLinks.clear();
  mine.forEach(id => { delete old[id]; });
  saveOld(old);
}
// New letters (with an answer key) need the secret for a working link; old ones open with the id alone.
const linkFor = (id, needsSecret) => { const s = linkSecretOf(id); return !needsSecret || s ? inviteLink(id, s) : ''; };
let formError = null; // { key, vars } so it can be re-translated
let payErrKey = null;  // same for the message under the payment button
const setPayError = key => { payErrKey = key; $('#payError').textContent = key ? t(key) : ''; };
const dishes = [{}, {}, {}];
const couple = [null, null, null];   // optional photos for her (data URLs)

$$('#lettersEmpty [data-kaptar], #view-terms [data-kaptar]').forEach(el => (el.innerHTML = kaptar(el.dataset.kaptar)));   // Kaptar waits on the empty letters list and the terms step
if (store.DEMO) {
  $('#demoRibbon').hidden = false;
  $('#signInLabel').dataset.t = 'tryDemo';
}
// Google blocks sign-in inside app browsers (Telegram, Instagram, Facebook, Android web views).
$('#inAppNote').hidden = store.DEMO || !inAppBrowser();

const priceText = (price, lang = ui) => tr(lang, 'priceFmt', { p: new Intl.NumberFormat('ru-RU').format(price || 0) });

// ---------- interface language ----------
function applyUi() {
  document.documentElement.lang = ui;
  document.title = t('pageTitle');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('pageDesc'));
  applyI18n(ui);
  updateRequired();
  refreshPreview();
  stepBar();
  refreshPhone();
  if (step === 5) buildSummary();
  $$('.photo-drop').forEach(d => (d.dataset.busy = t('preparing')));
  $('#formError').textContent = formError ? t(formError.key, formError.vars) : '';
  $('#payError').textContent = payErrKey ? t(payErrKey) : '';
  $$('#pin input').forEach((e, i) => e.setAttribute('aria-label', t('digitN', { n: i + 1 })));
  fillAgree();
  if (!$('#view-home').hidden) loadHome();
  if (!$('#view-done').hidden && lastSealed) showDone();
}
langSwitch($('#uiLang'), ui, lang => {
  ui = lang; saveLang(UI_KEY, lang);
  // On the visitors' page the address follows the language (/, /uz/, /ru/), as search engines list them.
  const there = siteUrl(LANG_PAGE[lang]);
  if (!$('#view-login').hidden && new URL(there).pathname !== location.pathname) { location.assign(there); return; }
  applyUi();
});

// ---------- views ----------
function showView(name) {
  closePreview(false);
  $$('.view').forEach(v => (v.hidden = v.id !== 'view-' + name));
  window.scrollTo(0, 0);
}

function route() {
  if (user === undefined) return;
  if (!user) return showView('login');
  if (!termsOk) return showView('terms');
  if (location.hash === '#new') { showView('create'); enterForm(); refreshPreview(); restoreDraft(); return; }
  if (location.hash === '#sealed' && lastSealed) { showDone(); return; }
  showView('home');
  loadHome();
}

// ---------- "I have read the terms" ----------
// The box must be ticked before signing in. The server records the date and version per account (/api/terms);
// an account that never ticked the current version (signed in before the box existed, another person on this
// computer, or the terms changed) sees the "One more step" screen instead of its letters.
const TERMS_TICK = 'cupidon.termsTick';               // this tab: ticked just before a sign-in that may reload the page
const TERMS_DEVICE = 'cupidon.termsDevice';           // someone on this device accepted this version: the home page hides the box
const termsKey = uid => 'cupidon.terms.' + uid;       // this account accepted this version (saves a server call per visit)
const tryGet = (s, k) => { try { return s.getItem(k); } catch { return null; } };
const trySet = (s, k, v) => { try { if (v == null) s.removeItem(k); else s.setItem(k, v); } catch { /* private mode */ } };
let termsOk = false;
const LEGAL = { terms: siteUrl('terms.html'), offer: siteUrl('offer.html'), privacy: siteUrl('privacy.html') };
const LEGAL_WORD = { terms: 'agreeTerms', offer: 'agreeOffer', privacy: 'agreePrivacy' };
function fillAgree() {
  const words = t('agreeText', { terms: '{terms}', offer: '{offer}', privacy: '{privacy}' }).split(/\{(terms|offer|privacy)\}/);
  $$('.agree-text').forEach(box => box.replaceChildren(...words.map((part, i) => {
    if (i % 2 === 0) return document.createTextNode(part);
    const a = document.createElement('a');   // a new tab, so the page (and the tick) stays
    Object.assign(a, { href: `${LEGAL[part]}#${ui}`, target: '_blank', rel: 'noopener', textContent: t(LEGAL_WORD[part]) });
    return a;
  })));
}
$('#agreeBox').hidden = tryGet(localStorage, TERMS_DEVICE) === TERMS_VERSION;
function termsSaved(uid) {
  trySet(localStorage, termsKey(uid), TERMS_VERSION);
  trySet(localStorage, TERMS_DEVICE, TERMS_VERSION);
  trySet(sessionStorage, TERMS_TICK, null);
}
// After sign-in: true when this account has accepted the current terms (records the home-page tick first).
async function confirmTerms(uid) {
  if (tryGet(localStorage, termsKey(uid)) === TERMS_VERSION) return true;
  const ticked = tryGet(sessionStorage, TERMS_TICK) === TERMS_VERSION;
  try {
    const r = ticked ? await store.acceptTerms(TERMS_VERSION) : await store.termsStatus();
    if (r?.accepted === TERMS_VERSION) { termsSaved(uid); return true; }
  } catch {
    if (ticked) { $('#termsGateOk').checked = true; $('#termsGateError').textContent = t('termsSaveFail'); }
  }
  return false;
}
$('#termsOk').addEventListener('change', () => {
  $('#agreeBox').classList.remove('is-missing');
  if ($('#termsOk').checked) $('#signInError').textContent = '';
});
$('#termsGateBtn').addEventListener('click', async () => {
  const err = $('#termsGateError'), button = $('#termsGateBtn');
  if (!$('#termsGateOk').checked) { err.textContent = t('termsTick'); $('#termsGateOk').focus(); return; }
  if (!user) return;
  err.textContent = '';
  button.disabled = true;
  try {
    const r = await store.acceptTerms(TERMS_VERSION);
    if (r?.accepted !== TERMS_VERSION) throw new Error('not saved');
    termsSaved(user.uid);
    termsOk = true;
    afterSignIn();
  } catch { err.textContent = t('termsSaveFail'); }
  finally { button.disabled = false; }
});

$('#signInBtn').addEventListener('click', async () => {
  $('#signInError').textContent = '';
  if (!$('#agreeBox').hidden) {
    if (!$('#termsOk').checked) {
      $('#signInError').textContent = t('termsFirst');
      $('#agreeBox').classList.add('is-missing');
      $('#agreeBox').scrollIntoView({ block: 'center' });   // the second button sits at the end of the page
      $('#termsOk').focus({ preventScroll: true });
      return;
    }
    trySet(sessionStorage, TERMS_TICK, TERMS_VERSION);
  }
  try { await store.signIn(); }
  catch (e) {
    trySet(sessionStorage, TERMS_TICK, null);
    $('#signInError').textContent = t(e.code === 'auth/unauthorized-domain' ? 'signInDomain' : 'signInFail');
  }
});
$('#signOutBtn').addEventListener('click', async () => {
  if (draftTimer) await Promise.race([queueSave(), wait(1500)]);   // his last words are saved (locked) first, but offline never holds up sign-out
  store.signOut();
});

// ---------- his letters ----------
let homeRun = 0;
async function loadHome() {
  const run = ++homeRun;
  const list = $('#letters');
  $('#homeError').textContent = '';
  let rows;
  try { rows = await store.listMine(); }
  catch { if (run === homeRun) { list.innerHTML = ''; $('#homeError').textContent = t('homeFail'); } return; }
  await linksReady;
  await adoptOldLinks(rows.map(r => r.id));
  const items = await Promise.all(rows.map(letterRow));   // answers are unlocked in parallel
  if (run !== homeRun) return;   // a newer reload (e.g. language switch) already started
  list.replaceChildren(...items);
  $('#lettersEmpty').hidden = rows.length > 0;
}

const answers = new Map();   // id → { sig, a }: an answer is unlocked once, not on every reload and language switch (the key takes a moment to make)
async function answerOf(id, m) {
  const sig = m.answer.iv + m.answer.data;
  const hit = answers.get(id);
  if (hit?.sig === sig) return hit.a;
  const key = m.answerKey ? await answerKeyFrom(m.answerKey) : await deriveKey(m.pin, m.salt);
  const a = await decryptJSON(key, m.answer);
  if (!answerShapeOk(a)) throw new Error('bad-answer');   // shown as "unreadable"
  answers.set(id, { sig, a });
  return a;
}

// Each letter is in one of 8 states (a coloured label on its row), and has one main button for that state.
// unpaid · notOpened · opened · waiting (old letters: no "opened" record) · yes (dish + day) · dish (dish, day together)
// · letterOnly · locked
function rowState(r, m, a) {
  if (r.status !== 'active') return 'unpaid';
  if (m.answer) return a && !a.date ? 'dish' : 'yes';
  if (r.locked) return 'locked';   // before "letter only": a locked letter-only letter still needs its Unlock button
  if (m.ask === 'none') return 'letterOnly';
  if (typeof r.openedAt === 'number') return 'opened';
  return r.openedAt === null ? 'notOpened' : 'waiting';
}

// "Add to calendar" for him: the same kind of .ics file she gets, made on his device.
function hisCalendar(r, m, a) {
  const d = (m.dishes || [])[a.dish] || {};
  saveIcs({
    uid: `${r.id}-${a.date}-his`,
    title: t('himCalTitle', { name: m.girlName || '' }),
    start: startOf(a.date, a.time),
    place: d.place || '',
    details: [d.name, d.location].filter(Boolean).join('\n')
  }, `maktubim-${a.date}.ics`);
}

async function letterRow(r) {
  const li = document.createElement('li');
  li.className = 'letter-row';
  const m = r.meta || {};
  const main = document.createElement('div');
  const name = Object.assign(document.createElement('p'), { className: 'lr-name', textContent: m.girlName || '—' });
  const meta = Object.assign(document.createElement('p'), { className: 'lr-meta', textContent: t('rowMeta', { date: r.createdAt ? fmtMs(r.createdAt) : '?', pin: m.pin || '????' }) });
  const status = Object.assign(document.createElement('p'), { className: 'lr-status', textContent: t('waiting') });
  const btn = (text, cls = '') => Object.assign(document.createElement('button'), { type: 'button', className: 'btn btn-ghost btn-small ' + cls, textContent: text });
  const actions = document.createElement('div');
  actions.className = 'lr-actions';
  const link = linkFor(r.id, !!m.answerKey);
  let a = null;   // her unlocked answer
  let first = null;   // the main button of this state (filled, the others are outlined)

  if (m.answer && r.status === 'active') {
    try {
      if (!m.pin && !m.answerKey) throw new Error('no-key');
      a = await answerOf(r.id, m);
      const d = (m.dishes || [])[a.dish] || {};
      const dishText = d.name || '#' + (a.dish + 1), where = d.place ? t('whereAt', { place: d.place }) : '';
      status.textContent = !a.date ? t('saidYesNoDate', { dish: dishText, where }) : t('saidYes', {
        dish: dishText, where, day: `${dayName(ui, parseISO(a.date))} ${fmtDM(a.date)}`, time: a.time
      });
    } catch { status.textContent = t('unreadable'); }
  }
  const state = rowState(r, m, a);
  li.dataset.state = state;
  if (state === 'yes' || state === 'dish') li.classList.add('is-answered');
  const chip = Object.assign(document.createElement('span'), { className: 'state-chip', textContent: t('chip_' + state) });

  if (state === 'unpaid') {
    status.textContent = t('rowUnpaid');
    first = btn(t('payAndSend'));
    first.onclick = () => goPay(r.id, first);
  } else if (state === 'yes' && a?.date && a.time) {
    first = btn(t('himCal'));
    first.onclick = () => { try { hisCalendar(r, m, a); } catch { toast(t('actionFail')); } };
  } else if (state === 'locked') {
    status.textContent = t('rowLocked');
    const unlock = first = btn(t('unlock'));
    unlock.onclick = async () => {
      unlock.disabled = true;
      try { await store.unlockLetter(r.id); toast(t('unlocked')); loadHome(); }
      catch { toast(t('actionFail')); unlock.disabled = false; }
    };
  } else if (state === 'letterOnly') {
    status.textContent = t('rowNoReply');
  }
  main.append(chip, name, meta, status);
  if (state === 'waiting') status.hidden = true;   // the label already says it
  const seen = seenParts(r, a).filter(([key]) => !(key === 'rowNotOpened' && state === 'notOpened'))   // the label says it
    .map(([key, vals]) => t(key, vals));
  if (seen.length) main.append(Object.assign(document.createElement('p'), { className: 'lr-meta lr-seen', textContent: seen.join(' · ') }));

  if (r.status === 'active' && !link) {
    main.append(Object.assign(document.createElement('p'), { className: 'lr-meta', textContent: t('linkOtherDevice') }));
  } else if (r.status === 'active') {
    const copy = btn(t('copyLink'));
    copy.onclick = async () => toast(t(await copyText(link) ? 'copied' : 'copyFail'));
    const open = Object.assign(document.createElement('a'), { className: 'btn btn-ghost btn-small', textContent: t('open'), href: link });
    if (!first) first = copy;   // nothing else to do yet: sending the link again is the main thing
    actions.append(copy, open);
  }
  if (first) { first.classList.remove('btn-ghost'); actions.prepend(first); }
  // Two taps to delete (pop-up confirm boxes don't work everywhere, e.g. inside apps).
  const del = btn(t('del'), 'btn-del');
  let armed = null;
  del.onclick = async () => {
    if (!armed) {
      del.textContent = t('delAgain');
      armed = setTimeout(() => { armed = null; del.textContent = t('del'); }, 4000);
      return;
    }
    clearTimeout(armed);
    del.disabled = true;
    try { await store.deleteLetter(r.id); await keepLinkSecret(r.id, ''); li.remove(); $('#lettersEmpty').hidden = $('#letters').children.length > 0; toast(t('deleted')); }
    catch { toast(t('delFail')); del.disabled = false; armed = null; del.textContent = t('del'); }
  };
  actions.append(del);
  li.append(main, actions);
  return li;
}

// ---------- write a letter ----------
const pin = pinInput($('#pin'));
// The form has five steps: 1 For her, 2 Letter, 3 The date (skipped for "only the letter"), 4 Look, 5 Send.
let step = 1;      // the step on screen
let reached = 1;   // the furthest step he has opened (its stop on the step bar stays filled)

// Radio "chips". Labels come either as plain text (label) or as a translation key (tKey).
function radioChips(box, name, items, checkedId) {
  items.forEach(item => {
    const lab = document.createElement('label');
    lab.className = 'chip';
    lab.innerHTML = `<input type="radio" name="${name}" value="${item.id}" ${item.id === checkedId ? 'checked' : ''}><span></span>`;
    const span = lab.querySelector('span');
    if (item.tKey) span.dataset.t = item.tKey; else span.textContent = item.label;
    box.append(lab);
  });
}
const langsBox = $('#langs');
radioChips(langsBox, 'lang', LANGS, ui);
const letterLang = () => ($('input[name="lang"]:checked') || {}).value || ui;
langsBox.addEventListener('change', refreshPreview);

const stylesBox = $('#styles');
radioChips(stylesBox, 'style', [...LETTERS.map(l => ({ id: l.id, tKey: 'style_' + l.id })), { id: 'own', tKey: 'style_own' }], LETTERS[0].id);
const styleId = () => ($('input[name="style"]:checked') || {}).value || LETTERS[0].id;
const fontsBox = $('#fonts');
radioChips(fontsBox, 'font', FONTS.map(id => ({ id, tKey: 'font_' + id })), FONTS[0]);
$$('span', fontsBox).forEach((sp, i) => sp.classList.add('font-' + FONTS[i]));   // each name is shown in its own handwriting
const fontId = () => ($('input[name="font"]:checked') || {}).value || FONTS[0];
fontsBox.addEventListener('change', refreshPreview);
const pickup = () => $('input[name="pickup"]:checked').value === 'yes';
const themeId = () => ($('input[name="theme"]:checked') || {}).value || THEMES[0];   // her page background after the letter opens
const opening = () => ($('input[name="opening"]:checked') || {}).value || OPENINGS[0];   // how she opens it: seal | dove | ribbon | mist
const ask = () => $('input[name="ask"]:checked').value;   // 'full' | 'dish' | 'none' (just the letter)
const isOwn = () => styleId() === 'own';
const OWN_MIN = 10;

function refreshPreview() {
  const lang = letterLang();
  const name = $('#girlName').value.trim() || $('#girlName').placeholder;
  const from = $('#fromName').value.trim() || $('#fromName').placeholder;
  const own = isOwn();
  $('#ownBox').hidden = !own;
  const L = own ? renderOwn(lang, name, $('#own').value) : renderLetter(lang, styleId(), name, ask());
  const box = $('#preview');
  box.lang = lang;
  for (const el of [box, $('#own')]) { FONTS.forEach(f => el.classList.remove('font-' + f)); el.classList.add('font-' + fontId()); }
  box.innerHTML = '';
  const add = (cls, text) => { const e = document.createElement('p'); if (cls) e.className = cls; e.textContent = text; box.append(e); };
  add('lp-greeting', L.greeting);
  L.body.forEach(p => add('', p));
  const note = $('#note').value.trim();
  if (note) add('', 'P.S. ' + note);
  add('', L.closing);
  add('lp-sign', from);
  const pv = $('#pvLetter');   // the same letter on her phone (step 2)
  pv.lang = lang;
  FONTS.forEach(f => pv.classList.toggle('font-' + f, f === fontId()));
  pv.replaceChildren(...[...box.children].map(p => p.cloneNode(true)));
}
['#girlName', '#fromName', '#note'].forEach(s => $(s).addEventListener('input', refreshPreview));
let ownTimer;   // his own words have no length limit: redraw the preview when he pauses, not on every key
$('#own').addEventListener('input', () => { clearTimeout(ownTimer); ownTimer = setTimeout(refreshPreview, 200); });
stylesBox.addEventListener('change', refreshPreview);

const PHOTO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>';
const PLACE_PH = ['Besh Qozon', 'Bella Italia', 'Sakura'];

const ZOOM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/></svg>';
const viewerLabels = () => ({ close: t('close'), prev: t('photoPrev'), next: t('photoNext') });
// Opens the photos of one group (dishes or couple photos) full screen, starting at slot `i`.
// list = [{ photo, caption }, ...] with empty slots left out of the viewer.
function viewGroup(list, i) {
  const shown = list.map((x, k) => ({ k, ...x })).filter(x => x.photo);
  openPhotos(shown.map(x => ({ src: x.photo, alt: x.caption || '', caption: x.caption || '' })), Math.max(0, shown.findIndex(x => x.k === i)), viewerLabels());
}

// A photo box: pick a file, shrink it, show it. onPhoto(dataUrl) stores it. opts = { maxSide, target } (default = dish photo).
// onView() opens the photo full screen: a round magnifier appears once there is a photo (pressing the box itself picks a new file).
function bindPhotoDrop(drop, errKey, opts, onPhoto, onView) {
  const file = drop.querySelector('input');
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    drop.classList.add('is-busy');
    setErr(errKey, '');
    try {
      const photo = await compressImage(f, opts?.maxSide, opts?.target);
      onPhoto(photo);
      showPhoto(drop, photo, onView);
      refreshPhone();
      scheduleDraft();
    } catch (e) { setErr(errKey, e.message === 'not-image' ? 'notImage' : 'badFormat'); }
    finally { drop.classList.remove('is-busy'); file.value = ''; }
  });
}
// Shows a photo in its box (just picked, or brought back from his draft).
function showPhoto(drop, photo, onView) {
  drop.classList.add('has-photo');
  drop.removeAttribute('aria-invalid');
  drop.querySelector('img')?.remove();
  drop.querySelector('.change')?.remove();
  const img = new Image(); img.alt = ''; img.src = photo;
  const ch = document.createElement('span');
  ch.className = 'change'; ch.dataset.t = 'changePhoto'; ch.textContent = t('changePhoto');
  drop.querySelector('.ph-empty').hidden = true;
  drop.append(img, ch);
  const wrap = drop.parentElement;
  if (onView && !wrap.querySelector('.photo-zoom')) {
    const z = document.createElement('button');
    z.type = 'button';
    z.className = 'photo-zoom';
    z.setAttribute('aria-label', t('photoZoom'));
    z.innerHTML = ZOOM_ICON;
    z.addEventListener('click', onView);
    wrap.append(z);
  }
}
const isPhoto = isImageData;

function buildDishSlots() {
  const grid = $('#dishes');
  grid.innerHTML = '';
  dishes.forEach((d, i) => {
    const slot = document.createElement('div');
    slot.className = 'dish-slot';
    // Every field has a name (Chrome's Issues panel asks for it). The words are chosen so autofill does not offer
    // his own name or home address for a dish: Title / Venue / MapLink, not name / place / address.
    slot.innerHTML = `
      <h3 class="dish-title"></h3>
      <div class="photo-wrap"><label class="photo-drop">
        <input type="file" name="dish${i + 1}Photo" accept="image/*">
        <span class="ph-empty">${PHOTO_ICON}<span data-t="addPhoto"></span></span>
      </label></div>
      <p class="field-error" data-err="photo${i}"></p>
      <label class="field"><span data-t="dishName"></span>
        <input class="input" name="dish${i + 1}Title" data-k="name" maxlength="40" data-t-ph="dishPh${i + 1}">
        <p class="field-error" data-err="name${i}"></p>
      </label>
      <label class="field"><span><span data-t="placeL"></span> <small class="req-note"></small></span>
        <input class="input" name="dish${i + 1}Venue" data-k="place" maxlength="60" placeholder="${PLACE_PH[i]}">
        <p class="field-error" data-err="place${i}"></p>
      </label>
      <label class="field"><span><span data-t="locL"></span> <small class="req-note"></small></span>
        <input class="input" name="dish${i + 1}MapLink" data-k="location" maxlength="300" data-t-ph="locPh">
        <p class="field-error" data-err="location${i}"></p>
      </label>`;
    const title = slot.querySelector('.dish-title');
    const drop = slot.querySelector('.photo-drop');
    const file = drop.querySelector('input');
    // Title and photo label depend on the number, so they are refreshed in applyUi via this hook.
    slot.relabel = () => { title.textContent = t('dishN', { n: i + 1 }); file.setAttribute('aria-label', `${t('addPhoto')}: ${t('dishN', { n: i + 1 })}`); };
    const view = () => viewGroup(dishes.map(x => ({ photo: x.photo, caption: x.name })), i);
    bindPhotoDrop(drop, 'photo' + i, undefined, photo => { d.photo = photo; }, view);
    slot.querySelectorAll('[data-k]').forEach(inp => {
      inp.value = d[inp.dataset.k] || '';   // empty after a reset, filled when his draft comes back
      inp.addEventListener('input', () => { d[inp.dataset.k] = inp.value; });
    });
    grid.append(slot);
    if (isPhoto(d.photo)) showPhoto(drop, d.photo, view);
  });
  applyI18n(ui, grid);
  $$('.photo-drop', grid).forEach(dr => (dr.dataset.busy = t('preparing')));
  updateRequired();
}
function updateRequired() {
  const req = !pickup();
  $$('.req-note').forEach(n => (n.textContent = t(req ? 'required' : 'optional')));
  $$('.dish-slot').forEach(s => s.relabel?.());   // also relabels the couple slots (they share the class)
}
$$('input[name="pickup"]').forEach(r => r.addEventListener('change', updateRequired));
// "Only the letter": no date step (3) and no secret envelope. Every letter style still works: its last paragraph changes (letters.js).
function applyAsk() {
  $('#secretPart').hidden = ask() === 'none';   // she opens it after saying yes; a letter-only letter has no last page
  refreshPreview();
  stepBar();   // step 3 (the date) is left out for "only the letter"
}
$$('input[name="ask"]').forEach(r => r.addEventListener('change', applyAsk));

// Her phone follows the step: code screen (1), the letter (2), the dishes (3), the envelope in her theme (4, 5).
// Her screens start in the letter's language, so their words come from there; the caption is in his language.
const SCENES = { 1: 'code', 2: 'letter', 3: 'dishes', 4: 'open', 5: 'open' };
let stampPhotos = [];   // the dish photos last drawn on her phone
function refreshPhone() {
  const screen = $('#phoneScreen'), scene = SCENES[step], lang = letterLang();
  screen.dataset.scene = scene;
  const th = scene === 'code' ? THEMES[0] : themeId();   // her code screen is always classic: the theme is inside the locked letter
  THEMES.forEach(x => screen.classList.toggle('theme-' + x, x === th));
  const name = $('#girlName').value.trim(), el = $('#pvName');
  if (name) { delete el.dataset.t; el.textContent = name; }
  else { el.dataset.t = 'pvName'; el.textContent = t('pvName'); }   // data-t: the language switch updates it
  $('#pvPinTitle').textContent = tr(lang, 'pinTitle');
  $('#pvPinLabel').textContent = tr(lang, 'pinLabel');
  const hint = $('#hint').value.trim();
  $('#pvHint').hidden = !hint;
  $('#pvHint').textContent = hint ? tr(lang, 'hint', { hint }) : '';
  $('#pvDishesQ').textContent = tr(lang, 'dishesQ');
  if (scene === 'dishes') {   // photos are big: drawn only while this scene shows, and again only when a photo changes
    const box = $('#pvStamps'), photos = dishes.map(d => (isPhoto(d.photo) ? d.photo : ''));
    if (photos.some((p, i) => p !== stampPhotos[i]) || !box.children.length) {
      stampPhotos = photos;
      box.replaceChildren(...photos.map(p => {
        const card = document.createElement('div');
        card.className = 'pv-stamp';
        card.append(p ? Object.assign(new Image(), { src: p, alt: '' }) : document.createElement('i'), document.createElement('b'));
        return card;
      }));
    }
    $$('b', box).forEach((b, i) => (b.textContent = (dishes[i].name || '').trim() || t('dishN', { n: i + 1 })));
  }
  $('.pv-open .ps-card').hidden = ask() === 'none';   // "only the letter" never asks her out
  $('#pvCap').textContent = t('pvCap_' + scene);
}
$('#createForm').addEventListener('input', refreshPhone);
$('#createForm').addEventListener('change', refreshPhone);

// Secret envelope: "Need an idea?" fills in one of ours (in the letter's language), never over his own words.
let ideaAt = -1;
const secretBox = $('#secret');
const isIdea = v => Object.values(SECRET_IDEAS).some(list => list.includes(v));
const showIdeaBtn = () => ($('#secretIdea').hidden = !!secretBox.value.trim() && !isIdea(secretBox.value));
$('#secretIdea').addEventListener('click', () => {
  const list = SECRET_IDEAS[letterLang()] || SECRET_IDEAS.en;
  ideaAt = (ideaAt + 1) % list.length;
  secretBox.value = list[ideaAt];
  secretBox.focus();
  scheduleDraft();
});
secretBox.addEventListener('input', showIdeaBtn);
buildDishSlots();

// Optional photos for her: up to three, shown with a little pop-up when she opens the letter.
function buildCouple() {
  const grid = $('#couple');
  grid.innerHTML = '';
  couple.fill(null);
  for (let i = 0; i < couple.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'dish-slot couple-slot';
    slot.innerHTML = `
      <h3 class="dish-title"></h3>
      <div class="photo-wrap"><label class="photo-drop">
        <input type="file" name="memory${i + 1}" accept="image/*">
        <span class="ph-empty">${PHOTO_ICON}<span data-t="addPhoto"></span></span>
      </label></div>
      <p class="field-error" data-err="couple${i}"></p>`;
    const title = slot.querySelector('.dish-title');
    const file = slot.querySelector('input');
    slot.relabel = () => { title.textContent = t('photoN', { n: i + 1 }); file.setAttribute('aria-label', `${t('addPhoto')}: ${t('photoN', { n: i + 1 })}`); };
    const view = () => viewGroup(couple.map(p => ({ photo: p })), i);
    bindPhotoDrop(slot.querySelector('.photo-drop'), 'couple' + i, COUPLE_PHOTO, photo => { couple[i] = photo; }, view);
    slot.showSaved = photo => { couple[i] = photo; showPhoto(slot.querySelector('.photo-drop'), photo, view); };
    grid.append(slot);
  }
  applyI18n(ui, grid);
  $$('.photo-drop', grid).forEach(dr => (dr.dataset.busy = t('preparing')));
  $$('.couple-slot').forEach(s => s.relabel());
}
buildCouple();
$('#withPhotos').addEventListener('change', () => { $('#couple').hidden = !$('#withPhotos').checked; setErr('couple', ''); });

// Field errors keep their translation key in data-t, so switching language re-translates them.
function setErr(key, msgKey) {
  const p = $(`[data-err="${key}"]`);
  if (!p) return;
  if (msgKey) { p.dataset.t = msgKey; p.textContent = t(msgKey); }
  else { delete p.dataset.t; p.textContent = ''; }
}
function setFormError(key, vars) {
  formError = key ? { key, vars } : null;
  $('#formError').textContent = key ? t(key, vars) : '';
}
// Checks one step and marks what is missing there. Returns the fields with a problem (first one first).
function checkStep(n) {
  const sec = $(`.step[data-step="${n}"]`);
  $$('.field-error', sec).forEach(p => { delete p.dataset.t; p.textContent = ''; });
  $$('[aria-invalid]', sec).forEach(e => e.removeAttribute('aria-invalid'));
  const bad = [];
  const flag = (el, key, msgKey) => { el.setAttribute('aria-invalid', 'true'); setErr(key, msgKey); bad.push(el); };
  if (n === 1) {
    if (!$('#girlName').value.trim()) flag($('#girlName'), 'girlName', 'errGirl');
    if (!$('#fromName').value.trim()) flag($('#fromName'), 'fromName', 'errFrom');
    if (!pin.full()) flag($('#pin'), 'pin', 'errPin');
  }
  if (n === 2) {
    if (isOwn() && $('#own').value.trim().length < OWN_MIN) flag($('#own'), 'own', 'errOwn');
    if ($('#withPhotos').checked && !couple.some(Boolean)) flag($('#couple').querySelector('.photo-drop'), 'couple', 'errCouple');
  }
  if (n === 3 && ask() !== 'none') {
    const slots = $$('#dishes .dish-slot');
    dishes.forEach((d, i) => {
      const sl = slots[i];
      if (!d.photo) flag(sl.querySelector('.photo-drop'), 'photo' + i, 'errPhoto');
      if (!(d.name || '').trim()) flag(sl.querySelector('[data-k="name"]'), 'name' + i, 'errDish');
      if (!pickup()) {
        if (!(d.place || '').trim()) flag(sl.querySelector('[data-k="place"]'), 'place' + i, 'errPlace');
        if (!(d.location || '').trim()) flag(sl.querySelector('[data-k="location"]'), 'location' + i, 'errLoc');
      }
      const loc = (d.location || '').trim();
      if (loc && isUrl(loc) && !isMapUrl(loc) && !sl.querySelector('[data-k="location"]').hasAttribute('aria-invalid')) {
        flag(sl.querySelector('[data-k="location"]'), 'location' + i, 'mapOnly');
      }
    });
  }
  return bad;
}
// The whole letter: the first step with a problem, or null when everything is fine.
function checkAll() {
  for (const n of stepList()) { const bad = checkStep(n); if (bad.length) return { n, bad }; }
  return null;
}
// Says how many things need fixing and takes him (and screen readers) to the first one.
function showBad(bad) {
  setFormError(bad.length === 1 ? 'missing1' : 'missingN', { n: bad.length });
  bad[0].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  (bad[0].matches('input, textarea') ? bad[0] : bad[0].querySelector('input, textarea'))?.focus({ preventScroll: true });
}

// ---------- steps: Next checks only this step; the phone's Back button goes one step back ----------
// Every step he moves forward adds a browser history entry ({ form, step, idx, base }), so the phone's Back button
// (popstate) goes one step back. idx = place of the step in stepList(); base = the lowest idx reachable inside the form
// by going back in history. The address hash is never touched: it picks his views (#new, #sealed, #paid-…).
const stepList = () => [1, 2, 3, 4, 5].filter(n => n !== 3 || ask() !== 'none');
const histState = () => (history.state?.form ? history.state : null);
let pendingStep = 0;   // a step to show once a history jump (history.go) has landed
let jumping = 0;       // a history jump is on its way: step buttons wait for it (a quick double tap would land on the wrong step)
let entryState = null; // the history entry's step as it was when the form opened (a reload keeps it): his draft goes back there

function stepBar() {
  const list = stepList(), at = list.indexOf(step);
  $$('#stepbar li').forEach(li => {
    const n = +li.dataset.step, b = li.querySelector('button');
    li.hidden = !list.includes(n);
    li.querySelector('.sb-dot').textContent = list.indexOf(n) + 1;   // numbered by place: "only the letter" has 4 steps
    li.classList.toggle('is-now', n === step);
    li.classList.toggle('is-done', n !== step && n <= reached);
    if (n === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    b.setAttribute('aria-label', `${t('stepOf', { n: list.indexOf(n) + 1, total: list.length })}: ${t('st' + n)}`);
  });
  $('#stepCount').textContent = t('stepOf', { n: at + 1, total: list.length });
  $('#stepTitle').dataset.t = 'st' + step;
  $('#stepTitle').textContent = t('st' + step);
  $('#backBtn').hidden = at <= 0;
  $('#nextBtn').hidden = step === 5;
  $('#doneBtn').hidden = step !== 5;
}

// Shows step n (no history change). focus = move keyboard / screen-reader focus to the step's title.
function showStep(n, focus = false) {
  const list = stepList();
  if (!list.includes(n)) n = n === 3 ? 2 : list[0];   // "only the letter" has no step 3
  const changed = n !== step;
  step = n;
  reached = Math.max(reached, n);
  $$('#createForm .step').forEach(sec => (sec.hidden = +sec.dataset.step !== n));
  stepBar();
  refreshPhone();
  if (n === 5) buildSummary();
  if (!changed) return;
  setFormError(null);
  closePreview(false);
  const top = $('#stepbar').getBoundingClientRect().top;
  if (top < 0) window.scrollBy(0, top - 12);   // the new step starts at its top
  if (focus) $('#stepTitle').focus({ preventScroll: true });
}
const writeState = (how, n, base) => {
  const idx = stepList().indexOf(n);
  history[how === 'push' ? 'pushState' : 'replaceState']({ form: 1, step: n, idx, base: Math.min(base, idx) }, '');
};
// Forward: checks every step on the way and stops at the first one with a problem.
function forwardTo(n) {
  const list = stepList(), from = list.indexOf(step), to = list.indexOf(n);
  const base = histState()?.base ?? from;
  for (let i = from; i < to; i++) {
    const bad = checkStep(list[i]);
    if (bad.length) {
      for (let k = from + 1; k <= i; k++) writeState('push', list[k], base);
      showStep(list[i], true);
      showBad(bad);
      return;
    }
  }
  for (let k = from + 1; k <= to; k++) writeState('push', list[k], base);
  setFormError(null);
  showStep(n, true);
}
// Back to an earlier step: through the browser history where it has the entries, so the phone's Back stays in step.
function backTo(n, focus = true) {
  const list = stepList(), cur = histState(), from = list.indexOf(step), to = list.indexOf(n);
  showStep(n, focus);
  if (!cur || cur.idx !== from) { writeState('replace', n, to); return; }
  const land = Math.max(to, cur.base);
  if (land < from) {
    if (land > to) pendingStep = n;
    clearTimeout(jumping);
    jumping = setTimeout(() => { jumping = 0; }, 1000);   // in case the browser never reports the jump
    history.go(land - from);
  }
  else writeState('replace', n, to);   // no form entry behind this one: this entry becomes step n
}
function goStep(n) { if (jumping) return; if (n > step) forwardTo(n); else if (n < step) backTo(n); }
$('#stepbar').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) goStep(+b.dataset.go); });
$('#nextBtn').addEventListener('click', () => { const list = stepList(); goStep(list[list.indexOf(step) + 1]); });
$('#backBtn').addEventListener('click', () => { const list = stepList(); const prev = list[list.indexOf(step) - 1]; if (prev) goStep(prev); });
addEventListener('popstate', () => {
  clearTimeout(jumping); jumping = 0;
  if ($('#pvCol').classList.contains('is-open') && !history.state?.preview) { closePreview(true, true); return; }   // Back closes her phone first
  if (location.hash !== '#new' || $('#view-create').hidden) { pendingStep = 0; return; }   // leaving the form: route() handles it
  const s = histState();
  if (pendingStep) { const n = pendingStep; pendingStep = 0; writeState('replace', n, stepList().indexOf(n)); if (n !== step) showStep(n, true); return; }
  if (s && s.step !== step) showStep(s.step, true);
});
// Opening the form: a fresh form starts at step 1; a form he already started stays on its step.
function enterForm() {
  const s = histState();
  entryState = formDirty ? null : s;
  const n = formDirty ? (s && stepList().includes(s.step) ? s.step : step) : 1;
  if (!formDirty) reached = 1;
  showStep(n);
  writeState('replace', step, stepList().indexOf(step));
}

// Step 5: everything at a glance, each part with an Edit button.
const cut = (v, max = 90) => (v.length > max ? v.slice(0, max - 1).trimEnd() + '…' : v);
function buildSummary() {
  const box = $('#summary');
  const group = (n, rows) => {
    const g = document.createElement('div');
    g.className = 'sum-group';
    const head = document.createElement('div');
    head.className = 'sum-head';
    const edit = Object.assign(document.createElement('button'), { type: 'button', className: 'link-btn', textContent: t('sumEdit') });
    edit.setAttribute('aria-label', `${t('sumEdit')}: ${t('st' + n)}`);
    edit.addEventListener('click', () => goStep(n));
    head.append(Object.assign(document.createElement('h3'), { textContent: t('st' + n) }), edit);
    const dl = document.createElement('dl');
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      const dd = Object.assign(document.createElement('dd'), { textContent: value || t('sumNone') });
      if (!value) dd.className = 'is-empty';
      row.append(Object.assign(document.createElement('dt'), { textContent: label }), dd);
      dl.append(row);
    });
    g.append(head, dl);
    return g;
  };
  const none = ask() === 'none';
  const groups = [
    group(1, [
      [t('herName'), $('#girlName').value.trim()], [t('yourName'), $('#fromName').value.trim()],
      [t('code'), pin.value()], [t('hintL'), cut($('#hint').value.trim())],
      [t('letterLangT'), (LANGS.find(l => l.id === letterLang()) || {}).label],
      [t('dateT'), t({ full: 'dateYes', dish: 'dateNo', none: 'dateNone' }[ask()])]
    ]),
    group(2, [
      [t('sumStyle'), t('style_' + styleId())], [t('fontL'), t('font_' + fontId())],
      [t('noteL'), cut($('#note').value.trim())],
      [t('photosT'), $('#withPhotos').checked && couple.some(Boolean) ? t('sumPhotos', { n: couple.filter(Boolean).length }) : '']
    ])
  ];
  if (!none) groups.push(group(3, [[t('sumTrip'), t(pickup() ? 'pickupYes' : 'pickupNo')], [t('sumDishes'), dishes.map(d => (d.name || '').trim()).filter(Boolean).join(', ')]]));
  groups.push(group(4, [[t('openT'), t('open_' + opening())], [t('themeT'), t('theme_' + themeId())], ...(none ? [] : [[t('secretT'), cut(secretBox.value.trim())]])]));
  box.replaceChildren(...groups);
}

// Her phone as a pop-up on smaller screens (beside the form on wide ones).
function openPreview() {
  const col = $('#pvCol');
  col.classList.add('is-open');
  col.setAttribute('role', 'dialog');
  col.setAttribute('aria-modal', 'true');
  $('#pvOpen').setAttribute('aria-expanded', 'true');
  document.documentElement.style.overflow = 'hidden';
  $('#pvClose').focus();
  if (!history.state?.preview) history.pushState({ ...history.state, preview: 1 }, '');   // the phone's Back closes it
}
// fromHistory = the phone's Back already left the pop-up's history entry.
function closePreview(refocus = true, fromHistory = false) {
  const col = $('#pvCol');
  if (!col.classList.contains('is-open')) return;
  if (!fromHistory && history.state?.preview) history.back();
  col.classList.remove('is-open');
  col.removeAttribute('role');
  col.removeAttribute('aria-modal');
  $('#pvOpen').setAttribute('aria-expanded', 'false');
  document.documentElement.style.overflow = '';
  if (refocus) $('#pvOpen').focus();
}
$('#pvOpen').addEventListener('click', openPreview);
$('#pvClose').addEventListener('click', () => closePreview());
$('#pvCol').addEventListener('click', e => { if (e.target === e.currentTarget) closePreview(); });   // a tap outside the phone
$('#pvCol').addEventListener('keydown', e => {
  if (!$('#pvCol').classList.contains('is-open')) return;
  if (e.key === 'Escape') { e.preventDefault(); closePreview(); }
  if (e.key === 'Tab') { e.preventDefault(); $('#pvClose').focus(); }   // the close button is the only control inside
});
addEventListener('resize', () => { if (matchMedia('(min-width: 1000px)').matches) closePreview(false); });

$('#createForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (step !== 5) { $('#nextBtn').click(); return; }   // Enter in a field before the last step = Next
  setFormError(null);
  const problem = checkAll();
  if (problem) {   // takes him to the first step with something missing
    backTo(problem.n, false);
    showBad(problem.bad);
    return;
  }
  if (!cryptoReady()) { setFormError('needHttpsApp'); return; }
  const btn = $('#doneBtn');
  btn.disabled = true; btn.textContent = t('sealing');
  try {
    const salt = randomSalt();
    const secret = randomLinkSecret();   // only in the link and on this device
    const answerKey = newAnswerKey();    // her answer is locked with this; he keeps a copy to read it anywhere
    const code = pin.value();
    const lang = letterLang();
    const girlName = $('#girlName').value.trim();
    const from = $('#fromName').value.trim();
    const letterOnly = ask() === 'none';
    const list = letterOnly ? [] : dishes.map(d => ({ name: d.name.trim(), place: (d.place || '').trim(), location: (d.location || '').trim() }));
    const content = {
      girlName, from, letter: styleId(), note: $('#note').value.trim(), pickup: !letterOnly && pickup(), ask: ask(), font: fontId(), opening: opening(), theme: themeId(),
      dishes: list.map((d, i) => ({ ...d, photo: dishes[i].photo }))
    };
    content.answerKey = answerKey;
    if (isOwn()) content.own = $('#own').value.trim();
    if ($('#withPhotos').checked) content.photos = couple.filter(Boolean);
    if (!letterOnly && secretBox.value.trim()) content.secret = secretBox.value.trim();
    const key = await deriveKey(code, salt, secret);
    const locked = await encryptJSON(key, content);
    if (locked.data.length > 1000000) throw new Error('too-big');
    const r = await store.createLetter({
      lang, pin: code, hint: $('#hint').value.trim(),
      content: { ...locked, salt },
      meta: { girlName, from, pickup: content.pickup, ask: content.ask, dishes: list, answerKey }
    });
    await keepLinkSecret(r.id, secret);
    dropDraft();   // sealed: the draft has done its job
    lastSealed = { id: r.id, pin: code, girlName, lang, status: r.status, price: r.price, link: inviteLink(r.id, secret) };
    resetForm();
    location.hash = '#sealed';
  } catch (err) {
    const reason = err.reason || err.message;
    if (reason === 'terms' && user) {   // no record of his tick on the server: ask again, the draft keeps his letter
      trySet(localStorage, termsKey(user.uid), null);
      termsOk = false;
      $('#termsGateError').textContent = t('termsAgain');
      route();
    }
    setFormError({ 'too-big': 'tooBig', 'no-space': 'noSpace', 'daily-limit': 'dailyLimit', 'daily-total': 'dailyLimitAll', 'unpaid-limit': 'unpaidLimit', 'map-only': 'mapOnly', signin: 'signInAgain', busy: 'tooFast', terms: 'termsAgain' }[reason] || 'saveFailApp');
  } finally {
    btn.disabled = false; btn.textContent = t('done');
  }
});

function resetForm() {
  const from = $('#fromName').value;
  const lang = letterLang();
  $('#createForm').reset();
  $('#fromName').value = from;
  $(`input[name="lang"][value="${lang}"]`).checked = true;   // keep his letter language for the next one
  pin.clear(); document.activeElement?.blur();
  dishes.forEach(d => { for (const k of Object.keys(d)) delete d[k]; });
  buildDishSlots();
  buildCouple();
  $('#couple').hidden = true;
  ideaAt = -1;
  showIdeaBtn();
  refreshPhone();
  applyAsk();
  setFormError(null);
  formDirty = false;
  draftState(null);
  $('#draftNote').hidden = true;
  disarmStartOver();
  reached = 1;
  showStep(1);
}

// ---------- draft (his unfinished letter, locked on this device; draft.js) ----------
let draftTimer = 0, draftQuiet = false, formDirty = false, draftChain = Promise.resolve();
let lastSaved = '';     // the draft as last stored: an unchanged form is not locked and written again (photos make it ~1 MB)
let draftLoad = null;  // { uid, promise }: his stored draft, read once after sign-in (so the key is fetched before he opens the form)
// The line under "Done": 'draftSaved' | 'draftNotSaved' | null. "Start over" shows while there is something to clear.
function draftState(key) {
  const s = $('#draftState');
  s.hidden = !key;
  if (key) { s.dataset.t = key; s.textContent = t(key); } else { delete s.dataset.t; s.textContent = ''; }
  $('#startOver').hidden = !key;
}
const radioVal = name => ($(`input[name="${name}"]:checked`) || {}).value;
function collectDraft() {
  return {
    v: 1, lang: letterLang(), girlName: $('#girlName').value, fromName: $('#fromName').value, pin: pin.value(), hint: $('#hint').value,
    opening: opening(), theme: themeId(), style: styleId(), font: fontId(), own: $('#own').value, note: $('#note').value,
    ask: ask(), pickup: radioVal('pickup'),
    dishes: dishes.map(d => ({ name: d.name || '', place: d.place || '', location: d.location || '', photo: d.photo || '' })),
    withPhotos: $('#withPhotos').checked, photos: couple.map(p => p || ''), secret: secretBox.value, step
  };
}
// Nothing worth keeping (his name alone is filled in from his Google account).
const draftEmpty = d => !d.girlName.trim() && !d.pin && !d.hint.trim() && !d.own.trim() && !d.note.trim() && !d.secret.trim() &&
  !d.dishes.some(x => x.photo || x.name.trim() || x.place.trim() || x.location.trim()) && !d.photos.some(Boolean);

async function saveDraftNow() {
  clearTimeout(draftTimer); draftTimer = 0;
  const uid = user?.uid;
  if (!uid || !formDirty) return;
  draftLoad = null;   // storage is about to change: the form on screen is the truth now
  const d = collectDraft();
  if (draftEmpty(d)) { await deleteDraft(uid); lastSaved = ''; draftState(null); return; }
  const json = JSON.stringify(d);
  if (json === lastSaved) return;
  try {
    const key = await getLinksLock();
    if (uid !== user?.uid) return;   // signed out meanwhile
    await saveDraft(uid, key, d);
    lastSaved = json;
    draftState('draftSaved');
  } catch { if (uid === user?.uid) draftState('draftNotSaved'); }   // no key (offline) or no storage: never kept unlocked
}
// Saves run one after another, so an older save can never land after a newer one.
const queueSave = () => (draftChain = draftChain.then(saveDraftNow, saveDraftNow));
function dropDraft() {
  clearTimeout(draftTimer); draftTimer = 0;
  draftLoad = null; lastSaved = '';
  const uid = user?.uid;
  draftChain = draftChain.then(() => deleteDraft(uid), () => deleteDraft(uid));
}
function scheduleDraft() {
  if (draftQuiet || !user) return;
  formDirty = true;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(queueSave, 1000);
}
$('#createForm').addEventListener('input', scheduleDraft);
$('#createForm').addEventListener('change', scheduleDraft);
// Leaving the page or switching apps: save now instead of waiting for the pause.
document.addEventListener('visibilitychange', () => { if (document.hidden && draftTimer) queueSave(); });
addEventListener('pagehide', () => { if (draftTimer) queueSave(); });

function applyDraft(d) {
  draftQuiet = true;
  try {
    const setRadio = (name, v) => { const r = typeof v === 'string' && $(`input[name="${name}"][value="${CSS.escape(v)}"]`); if (r) r.checked = true; };
    ['lang', 'opening', 'theme', 'style', 'font', 'ask', 'pickup'].forEach(n => setRadio(n, d[n]));
    const text = v => (typeof v === 'string' ? v : '');
    $('#girlName').value = text(d.girlName).slice(0, 30);
    if (text(d.fromName)) $('#fromName').value = text(d.fromName).slice(0, 30);
    $('#hint').value = text(d.hint).slice(0, 60);
    $('#own').value = text(d.own);
    $('#note').value = text(d.note).slice(0, 400);
    secretBox.value = text(d.secret).slice(0, 600);
    pin.set(text(d.pin));
    dishes.forEach((x, i) => {
      const s = (Array.isArray(d.dishes) && d.dishes[i]) || {};
      Object.assign(x, { name: text(s.name), place: text(s.place), location: text(s.location) });
      if (isPhoto(s.photo)) x.photo = s.photo; else delete x.photo;
    });
    buildDishSlots();
    buildCouple();
    (Array.isArray(d.photos) ? d.photos : []).forEach((p, i) => { if (isPhoto(p)) $$('.couple-slot')[i]?.showSaved(p); });
    $('#withPhotos').checked = !!d.withPhotos;
    $('#couple').hidden = !d.withPhotos;
    ideaAt = -1;
    showIdeaBtn();
    refreshPhone();
    applyAsk();
    updateRequired();
  } finally { draftQuiet = false; }
}

// Reads his stored draft through the same queue as saves and deletes, so it never sees a half-finished change.
// Started at sign-in: by the time he opens the form the key is usually here, so there is no gap to type into.
function preloadDraft(uid) {
  const promise = draftChain.then(async () => {
    try { const key = await getLinksLock(); return key && uid === user?.uid ? await loadDraft(uid, key) : null; }
    catch { return null; }   // this browser keeps no drafts (private mode): the form simply starts empty
  });
  draftChain = promise.then(() => {}, () => {});
  draftLoad = { uid, promise };
}
// Opening the form: bring back his unfinished letter, unless he has already started typing (then the newer words win).
async function restoreDraft() {
  if (formDirty || !user) return;
  const uid = user.uid;
  if (draftLoad?.uid !== uid) preloadDraft(uid);
  const load = draftLoad;
  try {
    const d = await load.promise;
    if (!d || draftLoad !== load || formDirty || uid !== user?.uid || location.hash !== '#new') return;
    draftLoad = null;
    applyDraft(d);
    // Back on the step he was on: after a reload the history entry knows it (and the entries behind it are his
    // earlier steps, so the phone's Back keeps working); on another visit the draft does.
    const prev = entryState?.form && !entryState.preview && entryState.idx === stepList().indexOf(entryState.step) ? entryState : null;
    const back = prev ? prev.step : d.step;
    if (step === 1 && [2, 3, 4, 5].includes(back) && stepList().includes(back)) {
      reached = back;
      showStep(back);
      writeState('replace', step, prev ? prev.base : stepList().indexOf(step));
    }
    lastSaved = JSON.stringify(collectDraft());
    formDirty = true;
    $('#draftNote').hidden = false;
    draftState('draftSaved');
  } catch { /* nothing to bring back */ }
}

// "Start over": two taps (pop-up confirm boxes don't work everywhere), then an empty form and no draft.
let overArmed = null;
function disarmStartOver() {
  clearTimeout(overArmed); overArmed = null;
  const b = $('#startOver');
  b.dataset.t = 'startOver'; b.textContent = t('startOver');
}
$('#startOver').addEventListener('click', () => {
  if (!overArmed) {
    const b = $('#startOver');
    b.dataset.t = 'startOverAgain'; b.textContent = t('startOverAgain');
    overArmed = setTimeout(disarmStartOver, 4000);
    return;
  }
  dropDraft();
  if (step !== 1) backTo(1, false);   // the phone's Back must not lead into the old steps
  resetForm();
  toast(t('draftCleared'));
  window.scrollTo(0, 0);
});

// ---------- sealed: pay, then the link ----------
function showDone() {
  const { pin: code, girlName, lang, status, price, link } = lastSealed;
  const paid = status === 'active';
  // A link that could not be locked on this device lives only in this page: show it even before payment
  // (she can't open it until it is paid), because going to the payment page would lose it.
  const unsaved = !!link && unsavedLinks.has(lastSealed.id);
  const showLink = paid || unsaved;
  $('#payBox').hidden = paid;
  $('#linkPart').hidden = !showLink;
  $('#doneText').textContent = paid ? t('sealedText', { name: girlName }) : '';
  $('#doneText').hidden = !paid;
  $('#payBtn').textContent = t('payBtn', { price: priceText(price) });
  $('#linkMissing').hidden = !paid || !!link;
  $('#linkUnsaved').hidden = !unsaved;   // not locked on this device: copy it now
  $('#donePin').textContent = code;
  $('#linkBox').hidden = !link;   // made on another device: only the code can be shown here
  if (showLink && link) {
    // The QR only once she can open the letter: a printed code must not lead to an unpaid letter.
    try { drawQR($('#qrCanvas'), link); $('.qr-row').hidden = !paid; } catch { $('.qr-row').hidden = true; }
    const msg = tr(lang, 'share');   // the message she receives, in the letter's language
    $('#doneLink').value = link;
    $('#doneOpen').href = link;
    $('#shareTg').href = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`;
    $('#shareWa').href = `https://wa.me/?text=${encodeURIComponent(msg + ' ' + link)}`;
    const more = $('#shareMore');
    more.hidden = !navigator.share;
    more.onclick = () => navigator.share({ title: tr(lang, 'pinTitle'), text: msg, url: link }).catch(() => {});
  }
  showView('done');
}

// Opens the payment page (Rahmat/Octo, or the test page). He comes back to index.html?paid=<id> (Rahmat/Octo) or #paid-<id> (test page).
async function goPay(id, button) {
  button.disabled = true;
  const label = button.textContent;
  button.textContent = t('openingPay');
  setPayError(null);
  try {
    const r = await store.startPayment(id, ui);
    if (r.alreadyPaid) { button.disabled = false; button.textContent = label; await afterPayment(id); return; }
    location.href = r.payUrl;
  } catch (e) {
    const key = e?.reason === 'too-many-payments' ? 'payTooMany' : 'payFail';
    setPayError(key);
    toast(t(key));
    button.disabled = false;
    button.textContent = label;
  }
}
$('#payBtn').addEventListener('click', () => lastSealed && goPay(lastSealed.id, $('#payBtn')));
$('#checkPayBtn').addEventListener('click', () => lastSealed && afterPayment(lastSealed.id));

// Back from the payment page: ask the server (which asks the payment company), then show the link.
async function afterPayment(id) {
  // Show the "checking" line (inside the payment box) at once; the link part stays hidden until the payment is confirmed.
  $('#payBox').hidden = false;
  $('#linkPart').hidden = true;
  $('#doneText').hidden = true;
  showView('done');
  setPayError('checkingPay');
  $('#checkPayBtn').hidden = true;
  let status = 'unpaid', payment = '';
  try { ({ status, payment = '' } = await store.checkPayment(id)); } catch { /* shown below */ }
  try {
    const row = (await store.listMine()).find(r => r.id === id);
    await linksReady;
    if (row?.meta) lastSealed = { id, pin: row.meta.pin, girlName: row.meta.girlName, lang: row.meta.lang || row.lang, status: row.status, price: row.price, link: linkFor(id, !!row.meta.answerKey) };
  } catch { /* keep what we have */ }
  if (!lastSealed || lastSealed.id !== id) { location.hash = ''; route(); return; }
  if (status === 'active') lastSealed.status = 'active';
  const active = lastSealed.status === 'active';   // the list may already say "active" even if the check call failed
  showDone();
  setPayError(active ? null : ((payment === 'canceled' || payment === 'failed') ? 'payCanceled' : payment === 'paid-no-letter' ? 'paidNoLetter' : 'payPending'));
  $('#checkPayBtn').hidden = active;
}

$('#copyBtn').addEventListener('click', async () => {
  toast(t(await copyText($('#doneLink').value) ? 'copied' : 'copyFail'));
});
// The QR as a big PNG, e.g. to print on a card.
$('#qrSave').addEventListener('click', async () => {
  try { downloadBlob(await qrBlob($('#doneLink').value), 'maktubim-qr.png'); }
  catch { toast(t('actionFail')); }
});

// ---------- start (last, so everything above is ready) ----------
applyUi();
store.signInRedirectError().then(code => {
  if (code) $('#signInError').textContent = t(code === 'auth/unauthorized-domain' ? 'signInDomain' : 'signInFail');
});
let paidReturn = linkParam('paid', 'paid-', '[A-Za-z0-9]{16,40}');
store.onUser(u => {
  // Signed out (button, another tab or an expired session): start the page again from nothing, so no list row,
  // link or code of the last person stays in the page (security scan 2026-11-14, F1). Another tab can also switch
  // straight from one account to another with no sign-out in between: treated the same (scan 2026-11-14 #2, F2).
  if (user && u?.uid !== user.uid) { location.replace(location.pathname); return; }
  user = u;
  trySet(localStorage, WAS_IN, u ? '1' : null);
  if (!u) { lastSealed = null; answers.clear(); resetForm(); $('#fromName').value = ''; closeLinks(); draftLoad = null; lastSaved = ''; }   // a shared computer must not show the last person's link, code or draft
  else if (u.uid !== linksUid) { linksReady = openLinks(u.uid); preloadDraft(u.uid); }
  $('#userBox').hidden = !u;
  if (u) {
    $('#userName').textContent = store.DEMO ? 'Demo' : (u.name.split(' ')[0] || '');
    if (u.photo) $('#userPhoto').src = u.photo; else $('#userPhoto').removeAttribute('src');
    const from = $('#fromName');
    if (!from.value && u.name) from.value = u.name.split(' ')[0];
  }
  termsOk = !!u && tryGet(localStorage, termsKey(u.uid)) === TERMS_VERSION;
  if (u && !termsOk) {
    showView('loading');
    confirmTerms(u.uid).then(ok => { if (user !== u) return; termsOk = ok; afterSignIn(); });
    return;
  }
  afterSignIn();
});
// Signed in and the terms are accepted (or signed out): back from payment, else the view the address asks for.
function afterSignIn() {
  if (user && termsOk && paidReturn && store.validId(paidReturn)) {
    const id = paidReturn;
    paidReturn = null;   // only once
    history.replaceState(null, '', location.pathname + '#sealed');
    afterPayment(id);
    return;
  }
  route();
}
window.addEventListener('hashchange', route);
// Back from the payment page can restore this page from memory with a dead button: start fresh.
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
