// His side: sign in, write a letter, get the link, see her answers.
// Two languages here: `ui` is the language of these pages (corner switch),
// the letter language is picked in the form and only sets the romantic letter.
import * as store from './store.js';
import { deriveKey, encryptJSON, decryptJSON, randomSalt, cryptoReady } from './crypto.js';
import { LETTERS, renderLetter } from './letters.js';
import { LANGS, tr, applyI18n, langSwitch, savedLang, saveLang, guessLang, dayName } from './i18n.js';
import { compressImage } from './image.js';
import { $, $$, pinInput, toast, copyText, fmtDM, fmtMs, parseISO, inviteLink, isUrl, isMapUrl, linkParam } from './common.js';

const UI_KEY = 'cupidon.ui';
let ui = savedLang(UI_KEY) || guessLang();
const t = (k, v) => tr(ui, k, v);

let user;            // undefined = still loading, null = signed out
let lastSealed = null;
let formError = null; // { key, vars } so it can be re-translated
const dishes = [{}, {}, {}];

if (store.DEMO) {
  $('#demoRibbon').hidden = false;
  $('#signInLabel').dataset.t = 'tryDemo';
}
// Google blocks sign-in inside app browsers (Telegram, Instagram, Facebook, Android web views).
$('#inAppNote').hidden = store.DEMO || !/Telegram|Instagram|FBAN|FBAV|Line\/|; wv\)/i.test(navigator.userAgent);

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
  let rows = [];
  try { rows = await store.listMine(); }
  catch { if (run === homeRun) { list.innerHTML = ''; $('#homeError').textContent = t('homeFail'); } return; }
  const items = await Promise.all(rows.map(letterRow));   // answers are unlocked in parallel
  if (run !== homeRun) return;   // a newer reload (e.g. language switch) already started
  list.replaceChildren(...items);
  $('#lettersEmpty').hidden = rows.length > 0;
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
  const link = inviteLink(r.id);

  if (r.status !== 'active') {
    status.textContent = t('rowUnpaid');
    const pay = btn(t('payAndSend'));
    pay.classList.remove('btn-ghost');
    pay.onclick = () => goPay(r.id, pay);
    actions.append(pay);
  } else if (m.answer && m.pin) {
    try {
      const a = await decryptJSON(await deriveKey(m.pin, m.salt), m.answer);
      const d = (m.dishes || [])[a.dish] || {};
      status.textContent = t('saidYes', {
        dish: d.name || '#' + (a.dish + 1),
        where: d.place ? t('whereAt', { place: d.place }) : '',
        day: `${dayName(ui, parseISO(a.date))} ${fmtDM(a.date)}`,
        time: a.time
      });
      li.classList.add('is-answered');
    } catch { status.textContent = t('unreadable'); }
  } else if (r.locked) {
    status.textContent = t('rowLocked');
    const unlock = btn(t('unlock'));
    unlock.onclick = async () => {
      unlock.disabled = true;
      try { await store.unlockLetter(r.id); toast(t('unlocked')); loadHome(); }
      catch { toast(t('actionFail')); unlock.disabled = false; }
    };
    actions.append(unlock);
  }
  main.append(name, meta, status);

  if (r.status === 'active') {
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
    try { await store.deleteLetter(r.id); li.remove(); $('#lettersEmpty').hidden = $('#letters').children.length > 0; toast(t('deleted')); }
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
radioChips(stylesBox, 'style', LETTERS.map(l => ({ id: l.id, tKey: 'style_' + l.id })), LETTERS[0].id);
const styleId = () => ($('input[name="style"]:checked') || {}).value || LETTERS[0].id;
const pickup = () => $('input[name="pickup"]:checked').value === 'yes';

function refreshPreview() {
  const lang = letterLang();
  const name = $('#girlName').value.trim() || $('#girlName').placeholder;
  const from = $('#fromName').value.trim() || $('#fromName').placeholder;
  const L = renderLetter(lang, styleId(), name);
  const box = $('#preview');
  box.lang = lang;
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
stylesBox.addEventListener('change', refreshPreview);

const PHOTO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>';
const PLACE_PH = ['Besh Qozon', 'Bella Italia', 'Sakura'];

function buildDishSlots() {
  const grid = $('#dishes');
  grid.innerHTML = '';
  dishes.forEach((d, i) => {
    const slot = document.createElement('div');
    slot.className = 'dish-slot';
    slot.innerHTML = `
      <h3 class="dish-title"></h3>
      <label class="photo-drop">
        <input type="file" accept="image/*">
        <span class="ph-empty">${PHOTO_ICON}<span data-t="addPhoto"></span></span>
      </label>
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
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      drop.classList.add('is-busy');
      setErr('photo' + i, '');
      try {
        d.photo = await compressImage(f);
        drop.classList.add('has-photo');
        drop.removeAttribute('aria-invalid');
        drop.querySelector('img')?.remove();
        drop.querySelector('.change')?.remove();
        const img = new Image(); img.alt = ''; img.src = d.photo;
        const ch = document.createElement('span');
        ch.className = 'change'; ch.dataset.t = 'changePhoto'; ch.textContent = t('changePhoto');
        drop.querySelector('.ph-empty').hidden = true;
        drop.append(img, ch);
      } catch (e) { setErr('photo' + i, e.message === 'not-image' ? 'notImage' : 'badFormat'); }
      finally { drop.classList.remove('is-busy'); file.value = ''; }
    });
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
  $$('.dish-slot').forEach(s => s.relabel?.());
}
$$('input[name="pickup"]').forEach(r => r.addEventListener('change', updateRequired));
buildDishSlots();

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
  const slots = $$('.dish-slot');
  dishes.forEach((d, i) => {
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
    return;
  }
  if (!cryptoReady()) { setFormError('needHttpsApp'); return; }
  const btn = $('#doneBtn');
  btn.disabled = true; btn.textContent = t('sealing');
  try {
    const salt = randomSalt();
    const code = pin.value();
    const lang = letterLang();
    const girlName = $('#girlName').value.trim();
    const from = $('#fromName').value.trim();
    const list = dishes.map(d => ({ name: d.name.trim(), place: (d.place || '').trim(), location: (d.location || '').trim() }));
    const content = {
      girlName, from, letter: styleId(), note: $('#note').value.trim(), pickup: pickup(),
      dishes: list.map((d, i) => ({ ...d, photo: dishes[i].photo }))
    };
    const key = await deriveKey(code, salt);
    const locked = await encryptJSON(key, content);
    if (locked.data.length > 1000000) throw new Error('too-big');
    const r = await store.createLetter({
      lang, pin: code, hint: $('#hint').value.trim(),
      content: { ...locked, salt },
      meta: { girlName, from, pickup: content.pickup, dishes: list }
    });
    lastSealed = { id: r.id, pin: code, girlName, lang, status: r.status, price: r.price };
    resetForm();
    location.hash = '#sealed';
  } catch (err) {
    const reason = err.reason || err.message;
    setFormError({ 'too-big': 'tooBig', 'no-space': 'noSpace', 'daily-limit': 'dailyLimit', 'map-only': 'mapOnly' }[reason] || 'saveFailApp');
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
  setFormError(null);
}

// ---------- sealed: pay, then the link ----------
function showDone() {
  const { id, pin: code, girlName, lang, status, price } = lastSealed;
  const paid = status === 'active';
  $('#payBox').hidden = paid;
  $('#linkPart').hidden = !paid;
  $('#doneText').textContent = paid ? t('sealedText', { name: girlName }) : '';
  $('#doneText').hidden = !paid;
  $('#payBtn').textContent = t('payBtn', { price: priceText(price) });
  if (paid) {
    const link = inviteLink(id);
    const msg = tr(lang, 'share');   // the message she receives, in the letter's language
    $('#doneLink').value = link;
    $('#donePin').textContent = code;
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
  $('#payError').textContent = '';
  try {
    const r = await store.startPayment(id, ui);
    if (r.alreadyPaid) { await afterPayment(id); return; }
    location.href = r.payUrl;
  } catch {
    $('#payError').textContent = t('payFail');
    toast(t('payFail'));
    button.disabled = false;
    button.textContent = label;
  }
}
$('#payBtn').addEventListener('click', () => lastSealed && goPay(lastSealed.id, $('#payBtn')));
$('#checkPayBtn').addEventListener('click', () => lastSealed && afterPayment(lastSealed.id));

// Back from the payment page: ask the server (which asks the payment company), then show the link.
async function afterPayment(id) {
  showView('done');
  $('#payError').textContent = t('checkingPay');
  $('#checkPayBtn').hidden = true;
  let status = 'unpaid', payment = '';
  try { ({ status, payment = '' } = await store.checkPayment(id)); } catch { /* shown below */ }
  try {
    const row = (await store.listMine()).find(r => r.id === id);
    if (row?.meta) lastSealed = { id, pin: row.meta.pin, girlName: row.meta.girlName, lang: row.meta.lang || row.lang, status: row.status, price: row.price };
  } catch { /* keep what we have */ }
  if (!lastSealed || lastSealed.id !== id) { location.hash = ''; route(); return; }
  if (status === 'active') lastSealed.status = 'active';
  showDone();
  $('#payError').textContent = status === 'active' ? '' : t(payment === 'canceled' ? 'payCanceled' : payment === 'paid-no-letter' ? 'paidNoLetter' : 'payPending');
  $('#checkPayBtn').hidden = status === 'active';
}

$('#copyBtn').addEventListener('click', async () => {
  toast(t(await copyText($('#doneLink').value) ? 'copied' : 'copyFail'));
});

// ---------- start (last, so everything above is ready) ----------
applyUi();
let paidReturn = linkParam('paid', 'paid-', '[A-Za-z0-9]{16,40}');
store.onUser(u => {
  user = u;
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
