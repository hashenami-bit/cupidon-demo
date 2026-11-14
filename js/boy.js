// His side: sign in, write a letter, get the link, see her answers.
// Two languages here: `ui` is the language of these pages (corner switch),
// the letter language is picked in the form and only sets the romantic letter.
import * as store from './store.js';
import { deriveKey, encryptJSON, decryptJSON, randomSalt, randomLinkSecret, newAnswerKey, answerKeyFrom, cryptoReady } from './crypto.js';
import { LETTERS, FONTS, SECRET_IDEAS, THEMES, OPENINGS, renderLetter, renderOwn } from './letters.js';
import { LANGS, tr, applyI18n, langSwitch, savedLang, saveLang, guessLang, dayName } from './i18n.js';
import { compressImage, COUPLE_PHOTO } from './image.js';
import { openPhotos } from './lightbox.js';
import { $, $$, pinInput, toast, copyText, fmtDM, fmtMs, seenParts, parseISO, inviteLink, isUrl, isMapUrl, linkParam, inAppBrowser } from './common.js';

const UI_KEY = 'cupidon.ui';
let ui = savedLang(UI_KEY) || guessLang();
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
  catch { return false; }   // no key, private mode or full: the caller keeps it the old way
}
const saveOld = old => { try { Object.keys(old).length ? localStorage.setItem(OLD_LINKS_KEY, JSON.stringify(old)) : localStorage.removeItem(OLD_LINKS_KEY); } catch { /* nothing to do */ } };
async function keepLinkSecret(id, secret) {
  await linksReady;
  if (secret) links[id] = secret; else delete links[id];
  const old = readJSON(OLD_LINKS_KEY) || {};
  if (await saveLinks()) { if (id in old) { delete old[id]; saveOld(old); } return; }
  // No key right now (offline): keep it the old way so the link is never lost; it gets locked on the next list load.
  if (secret) old[id] = secret; else delete old[id];
  saveOld(old);
}
// Moves his own letters' secrets out of the old unlocked store.
async function adoptOldLinks(ids) {
  const old = readJSON(OLD_LINKS_KEY);
  const mine = old ? ids.filter(id => old[id]) : [];
  if (!mine.length) return;
  mine.forEach(id => { links[id] = old[id]; });
  if (!await saveLinks()) return;
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
  applyI18n(ui);
  updateRequired();
  refreshPreview();
  $$('.photo-drop').forEach(d => (d.dataset.busy = t('preparing')));
  $('#formError').textContent = formError ? t(formError.key, formError.vars) : '';
  $('#payError').textContent = payErrKey ? t(payErrKey) : '';
  $$('#pin input').forEach((e, i) => e.setAttribute('aria-label', t('digitN', { n: i + 1 })));
  if (!$('#view-home').hidden) loadHome();
  if (!$('#view-done').hidden && lastSealed) showDone();
}
langSwitch($('#uiLang'), ui, lang => { ui = lang; saveLang(UI_KEY, lang); applyUi(); });

// ---------- views ----------
function showView(name) {
  $$('.view').forEach(v => (v.hidden = v.id !== 'view-' + name));
  window.scrollTo(0, 0);
}

function route() {
  if (user === undefined) return;
  if (!user) return showView('login');
  if (location.hash === '#new') { showView('create'); refreshPreview(); return; }
  if (location.hash === '#sealed' && lastSealed) { showDone(); return; }
  showView('home');
  loadHome();
}

$('#signInBtn').addEventListener('click', async () => {
  $('#signInError').textContent = '';
  try { await store.signIn(); }
  catch (e) { $('#signInError').textContent = t(e.code === 'auth/unauthorized-domain' ? 'signInDomain' : 'signInFail'); }
});
$('#signOutBtn').addEventListener('click', () => store.signOut());

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
  answers.set(id, { sig, a });
  return a;
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

  if (r.status !== 'active') {
    status.textContent = t('rowUnpaid');
    const pay = btn(t('payAndSend'));
    pay.classList.remove('btn-ghost');
    pay.onclick = () => goPay(r.id, pay);
    actions.append(pay);
  } else if (m.answer && m.pin) {
    try {
      a = await answerOf(r.id, m);
      const d = (m.dishes || [])[a.dish] || {};
      const dishText = d.name || '#' + (a.dish + 1), where = d.place ? t('whereAt', { place: d.place }) : '';
      status.textContent = !a.date ? t('saidYesNoDate', { dish: dishText, where }) : t('saidYes', {
        dish: dishText, where, day: `${dayName(ui, parseISO(a.date))} ${fmtDM(a.date)}`, time: a.time
      });
      li.classList.add('is-answered');
    } catch { status.textContent = t('unreadable'); }
  } else if (r.locked) {   // checked before "letter only": a locked letter-only letter still needs its Unlock button
    status.textContent = t('rowLocked');
    const unlock = btn(t('unlock'));
    unlock.onclick = async () => {
      unlock.disabled = true;
      try { await store.unlockLetter(r.id); toast(t('unlocked')); loadHome(); }
      catch { toast(t('actionFail')); unlock.disabled = false; }
    };
    actions.append(unlock);
  } else if (m.ask === 'none') {
    status.textContent = t('rowNoReply');
  }
  main.append(name, meta, status);
  const seen = seenParts(r, a).map(([key, vals]) => t(key, vals));
  if (seen.length) main.append(Object.assign(document.createElement('p'), { className: 'lr-meta lr-seen', textContent: seen.join(' · ') }));

  if (r.status === 'active' && !link) {
    main.append(Object.assign(document.createElement('p'), { className: 'lr-meta', textContent: t('linkOtherDevice') }));
  } else if (r.status === 'active') {
    const copy = btn(t('copyLink'));
    copy.onclick = async () => toast(t(await copyText(link) ? 'copied' : 'copyFail'));
    const open = Object.assign(document.createElement('a'), { className: 'btn btn-ghost btn-small', textContent: t('open'), href: link });
    actions.append(copy, open);
  }
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
    } catch (e) { setErr(errKey, e.message === 'not-image' ? 'notImage' : 'badFormat'); }
    finally { drop.classList.remove('is-busy'); file.value = ''; }
  });
}

function buildDishSlots() {
  const grid = $('#dishes');
  grid.innerHTML = '';
  dishes.forEach((d, i) => {
    const slot = document.createElement('div');
    slot.className = 'dish-slot';
    slot.innerHTML = `
      <h3 class="dish-title"></h3>
      <div class="photo-wrap"><label class="photo-drop">
        <input type="file" accept="image/*">
        <span class="ph-empty">${PHOTO_ICON}<span data-t="addPhoto"></span></span>
      </label></div>
      <p class="field-error" data-err="photo${i}"></p>
      <label class="field"><span data-t="dishName"></span>
        <input class="input" data-k="name" maxlength="40" data-t-ph="dishPh${i + 1}">
        <p class="field-error" data-err="name${i}"></p>
      </label>
      <label class="field"><span><span data-t="placeL"></span> <small class="req-note"></small></span>
        <input class="input" data-k="place" maxlength="60" placeholder="${PLACE_PH[i]}">
        <p class="field-error" data-err="place${i}"></p>
      </label>
      <label class="field"><span><span data-t="locL"></span> <small class="req-note"></small></span>
        <input class="input" data-k="location" maxlength="300" data-t-ph="locPh">
        <p class="field-error" data-err="location${i}"></p>
      </label>`;
    const title = slot.querySelector('.dish-title');
    const drop = slot.querySelector('.photo-drop');
    const file = drop.querySelector('input');
    // Title and photo label depend on the number, so they are refreshed in applyUi via this hook.
    slot.relabel = () => { title.textContent = t('dishN', { n: i + 1 }); file.setAttribute('aria-label', `${t('addPhoto')}: ${t('dishN', { n: i + 1 })}`); };
    bindPhotoDrop(drop, 'photo' + i, undefined, photo => { d.photo = photo; },
      () => viewGroup(dishes.map(x => ({ photo: x.photo, caption: x.name })), i));
    slot.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('input', () => { d[inp.dataset.k] = inp.value; }));
    grid.append(slot);
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
// "Only the letter": no dishes and no trip question.
// "Only the letter": no dishes and no trip question. Every letter style still works: its last paragraph changes (letters.js).
function applyAsk() {
  const none = ask() === 'none';
  $('#tripPart').hidden = none;
  $('#dishesPart').hidden = none;
  $('#secretPart').hidden = none;   // she opens it after saying yes; a letter-only letter has no last page
  refreshPreview();
}
$$('input[name="ask"]').forEach(r => r.addEventListener('change', applyAsk));

// The phone preview shows her page in the chosen theme, with her name.
function refreshPhone() {
  const screen = $('#phoneScreen');
  THEMES.forEach(th => screen.classList.toggle('theme-' + th, th === themeId()));
  const name = $('#girlName').value.trim(), el = $('#pvName');
  if (name) { delete el.dataset.t; el.textContent = name; }
  else { el.dataset.t = 'pvName'; el.textContent = t('pvName'); }   // data-t: the language switch updates it
}
$$('input[name="theme"]').forEach(r => r.addEventListener('change', refreshPhone));
$('#girlName').addEventListener('input', refreshPhone);
refreshPhone();

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
        <input type="file" accept="image/*">
        <span class="ph-empty">${PHOTO_ICON}<span data-t="addPhoto"></span></span>
      </label></div>
      <p class="field-error" data-err="couple${i}"></p>`;
    const title = slot.querySelector('.dish-title');
    const file = slot.querySelector('input');
    slot.relabel = () => { title.textContent = t('photoN', { n: i + 1 }); file.setAttribute('aria-label', `${t('addPhoto')}: ${t('photoN', { n: i + 1 })}`); };
    bindPhotoDrop(slot.querySelector('.photo-drop'), 'couple' + i, COUPLE_PHOTO, photo => { couple[i] = photo; },
      () => viewGroup(couple.map(p => ({ photo: p })), i));
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
function validate() {
  $$('.field-error').forEach(p => { delete p.dataset.t; p.textContent = ''; });
  $$('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
  const bad = [];
  const flag = (el, key, msgKey) => { el.setAttribute('aria-invalid', 'true'); setErr(key, msgKey); bad.push(el); };
  if (!$('#girlName').value.trim()) flag($('#girlName'), 'girlName', 'errGirl');
  if (!$('#fromName').value.trim()) flag($('#fromName'), 'fromName', 'errFrom');
  if (!pin.full()) flag($('#pin'), 'pin', 'errPin');
  if (isOwn() && $('#own').value.trim().length < OWN_MIN) flag($('#own'), 'own', 'errOwn');
  if ($('#withPhotos').checked && !couple.some(Boolean)) flag($('#couple').querySelector('.photo-drop'), 'couple', 'errCouple');
  const slots = $$('.dish-slot');
  if (ask() !== 'none') dishes.forEach((d, i) => {
    const s = slots[i];
    if (!d.photo) flag(s.querySelector('.photo-drop'), 'photo' + i, 'errPhoto');
    if (!(d.name || '').trim()) flag(s.querySelector('[data-k="name"]'), 'name' + i, 'errDish');
    if (!pickup()) {
      if (!(d.place || '').trim()) flag(s.querySelector('[data-k="place"]'), 'place' + i, 'errPlace');
      if (!(d.location || '').trim()) flag(s.querySelector('[data-k="location"]'), 'location' + i, 'errLoc');
    }
    const loc = (d.location || '').trim();
    if (loc && isUrl(loc) && !isMapUrl(loc) && !s.querySelector('[data-k="location"]').hasAttribute('aria-invalid')) {
      flag(s.querySelector('[data-k="location"]'), 'location' + i, 'mapOnly');
    }
  });
  return bad;
}

$('#createForm').addEventListener('submit', async e => {
  e.preventDefault();
  setFormError(null);
  const bad = validate();
  if (bad.length) {
    setFormError(bad.length === 1 ? 'missing1' : 'missingN', { n: bad.length });
    bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    (bad[0].matches('input, textarea') ? bad[0] : bad[0].querySelector('input, textarea'))?.focus({ preventScroll: true });   // screen readers land on the problem
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
    lastSealed = { id: r.id, pin: code, girlName, lang, status: r.status, price: r.price, link: inviteLink(r.id, secret) };
    resetForm();
    location.hash = '#sealed';
  } catch (err) {
    const reason = err.reason || err.message;
    setFormError({ 'too-big': 'tooBig', 'no-space': 'noSpace', 'daily-limit': 'dailyLimit', 'daily-total': 'dailyLimitAll', 'unpaid-limit': 'unpaidLimit', 'map-only': 'mapOnly', signin: 'signInAgain', busy: 'tooFast' }[reason] || 'saveFailApp');
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
}

// ---------- sealed: pay, then the link ----------
function showDone() {
  const { pin: code, girlName, lang, status, price, link } = lastSealed;
  const paid = status === 'active';
  $('#payBox').hidden = paid;
  $('#linkPart').hidden = !paid;
  $('#doneText').textContent = paid ? t('sealedText', { name: girlName }) : '';
  $('#doneText').hidden = !paid;
  $('#payBtn').textContent = t('payBtn', { price: priceText(price) });
  $('#linkMissing').hidden = !paid || !!link;
  $('#donePin').textContent = code;
  $$('#linkPart .linkbox, #linkPart .share-row').forEach(e => (e.hidden = !link));
  if (paid && link) {
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

// Opens the payment page (Octo, or the test page). He comes back to index.html?paid=<id> (Octo) or #paid-<id> (test page).
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
  setPayError(active ? null : (payment === 'canceled' ? 'payCanceled' : payment === 'paid-no-letter' ? 'paidNoLetter' : 'payPending'));
  $('#checkPayBtn').hidden = active;
}

$('#copyBtn').addEventListener('click', async () => {
  toast(t(await copyText($('#doneLink').value) ? 'copied' : 'copyFail'));
});

// ---------- start (last, so everything above is ready) ----------
applyUi();
store.signInRedirectError().then(code => {
  if (code) $('#signInError').textContent = t(code === 'auth/unauthorized-domain' ? 'signInDomain' : 'signInFail');
});
let paidReturn = linkParam('paid', 'paid-', '[A-Za-z0-9]{16,40}');
store.onUser(u => {
  user = u;
  if (!u) { lastSealed = null; answers.clear(); resetForm(); $('#fromName').value = ''; closeLinks(); }   // a shared computer must not show the last person's link, code or draft
  else if (u.uid !== linksUid) linksReady = openLinks(u.uid);
  $('#userBox').hidden = !u;
  if (u) {
    $('#userName').textContent = store.DEMO ? 'Demo' : (u.name.split(' ')[0] || '');
    if (u.photo) $('#userPhoto').src = u.photo; else $('#userPhoto').removeAttribute('src');
    const from = $('#fromName');
    if (!from.value && u.name) from.value = u.name.split(' ')[0];
  }
  if (u && paidReturn && store.validId(paidReturn)) {
    const id = paidReturn;
    paidReturn = null;   // only once
    history.replaceState(null, '', location.pathname + '#sealed');
    afterPayment(id);
    return;
  }
  route();
});
window.addEventListener('hashchange', route);
// Back from the payment page can restore this page from memory with a dead button: start fresh.
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
