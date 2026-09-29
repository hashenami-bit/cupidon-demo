// Her side: code → envelope → letter → dish → day and time → invitation.
// `ui` = language of buttons and screens (she can switch it in the corner).
// `letterLang` = language he chose for the romantic letter (fixed).
import * as store from './store.js';
import { deriveKey, decryptJSON, encryptJSON, cryptoReady } from './crypto.js';
import { renderLetter } from './letters.js';
import { tr, dates, dayName, monthYear, guessLang, validLang, applyI18n, langSwitch, savedLang, saveLang } from './i18n.js';
import { $, $$, pinInput, fmtDM, toISO, pad, parseISO, mapsUrl, isUrl, reducedMotion, wait, linkParam } from './common.js';
import { makeBanner, saveCanvas } from './banner.js';

const id = linkParam('i', '', '[A-Za-z0-9]{16,40}');
const UI_KEY = 'cupidon.ui.her';
const herChoice = savedLang(UI_KEY);
let ui = herChoice || guessLang();
let letterLang = 'en';
let inv = null, key = null, c = null, answer = null;
const pick = { dish: null, date: null, time: null };
const t = (k, v) => tr(ui, k, v);
const weekday = iso => dayName(ui, parseISO(iso));

function applyLang() {
  document.documentElement.lang = ui;
  applyI18n(ui);
  document.title = t('pinTitle');
  switcher.set(ui);
}
const switcher = langSwitch($('#uiLang'), ui, l => { ui = l; saveLang(UI_KEY, l); rerender(); });

// Re-draws everything that was built with the old interface language.
function rerender() {
  applyLang();
  $('#pinError').textContent = '';
  if (inv?.hint) $('#pinHint').textContent = t('hint', { hint: inv.hint });
  if (!c) return;
  $$('[data-dear]').forEach(e => (e.textContent = t('dear', { name: c.girlName })));
  $$('.postmark').forEach(pm => { const [a, b] = pm.querySelectorAll('text'); a.textContent = t('chosen'); b.textContent = t('withLoveShort'); });
  renderCalendar();
  if (answer) renderFinal();
}

function show(name) {
  $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === 's-' + name));
  window.scrollTo(0, 0);
  $('#s-' + name).focus({ preventScroll: true });
}

// ---------- 1. code ----------
// The server checks the code and counts wrong tries (5 in a row = 10 min pause, 30 = locked).
let checking = false;
let code = '';                     // kept in memory to send her answer later
const pinBox = $('#pin');
const pin = pinInput(pinBox, tryCode);

function codeError(e) {
  switch (e?.reason) {
    case 'wrong-code': return t('wrongLeft', { n: e.triesLeft });
    case 'paused': return t('paused', { m: Math.max(1, Math.ceil((e.waitSec || 60) / 60)) });
    case 'locked': return t('lockedHard');
    case 'not-paid': return t('notReadyText');
    case 'not-found': return t('missingText');
    default: return t('netFail');
  }
}

async function tryCode(entered) {
  if (checking) return;
  checking = true;
  pinBox.classList.add('is-checking');
  pin.setDisabled(true);
  $('#pinError').textContent = t('checking');
  try {
    const r = await store.openLetter(id, entered);
    key = await deriveKey(entered, r.content.salt);
    c = await decryptJSON(key, r.content);
    code = entered;
    answer = null;
    if (r.answer) { try { answer = await decryptJSON(key, r.answer); } catch { answer = null; } }
    $('#pinError').textContent = '';
    fillLetter();
    if (answer) { renderFinal(); show('final'); } else show('envelope');
  } catch (e) {
    $('#pinError').textContent = codeError(e);
    pinBox.classList.remove('shake'); void pinBox.offsetWidth; pinBox.classList.add('shake');
    pin.setDisabled(false);
    pin.clear();
  } finally {
    checking = false;
    pinBox.classList.remove('is-checking');
    pin.setDisabled(false);
  }
}

// ---------- 2. envelope ----------
$('#sealBtn').addEventListener('click', async () => {
  $('#envelope').classList.add('is-open');
  await wait(reducedMotion() ? 150 : 2000);
  show('letter');
});

// ---------- 3. letter ----------
function fillLetter() {
  $$('[data-name]').forEach(e => (e.textContent = c.girlName));
  $$('[data-dear]').forEach(e => (e.textContent = t('dear', { name: c.girlName })));
  const L = renderLetter(letterLang, c.letter, c.girlName);
  $('.letter').lang = letterLang;
  $('#lGreeting').textContent = L.greeting;
  const body = $('#lBody');
  body.innerHTML = '';
  L.body.forEach(p => body.append(Object.assign(document.createElement('p'), { textContent: p })));
  $('#lNote').hidden = !c.note;
  $('#lNote').textContent = c.note ? 'P.S. ' + c.note : '';
  $('#lClosing').textContent = L.closing;
  $('#lSign').textContent = c.from;
  buildStamps();
}
$('#toDishes').addEventListener('click', () => show(answer ? 'final' : 'dishes'));

// ---------- 4. dishes ----------
function postmark() {
  const svg = `<svg class="postmark" viewBox="0 0 160 110" aria-hidden="true" fill="none" stroke="currentColor">
    <circle cx="55" cy="55" r="44" stroke-width="3"/><circle cx="55" cy="55" r="34" stroke-width="1.5"/>
    <path d="M104 35c8-6 16 6 24 0s16 6 24 0M104 55c8-6 16 6 24 0s16 6 24 0M104 75c8-6 16 6 24 0s16 6 24 0" stroke-width="3"/>
    <text x="55" y="50" text-anchor="middle" fill="currentColor" stroke="none" font-family="Cormorant Garamond, serif" font-weight="700" font-size="14"></text>
    <text x="55" y="72" text-anchor="middle" fill="currentColor" stroke="none" font-family="Pinyon Script, Great Vibes, cursive" font-size="19"></text>
  </svg>`;
  const tpl = document.createElement('template');
  tpl.innerHTML = svg.trim();
  const el = tpl.content.firstChild;
  const [a, b] = el.querySelectorAll('text');
  a.textContent = t('chosen'); b.textContent = t('withLoveShort');
  return el;
}

function buildStamps() {
  const box = $('#stamps');
  box.innerHTML = '';
  box.classList.remove('has-choice');
  c.dishes.forEach((d, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stamp';
    b.innerHTML = '<span class="stamp-in"><span class="stamp-photo"><img alt=""></span><span class="stamp-name"></span><span class="stamp-place"></span></span>';
    b.querySelector('img').src = d.photo;
    b.querySelector('.stamp-photo').append(postmark());
    b.querySelector('.stamp-name').textContent = d.name;
    b.querySelector('.stamp-place').textContent = d.place || '';
    b.addEventListener('click', () => chooseDish(i, b));
    box.append(b);
  });
}
async function chooseDish(i, btn) {
  pick.dish = i;
  const box = $('#stamps');
  box.classList.add('has-choice');
  $$('.stamp', box).forEach(s => { s.classList.toggle('is-chosen', s === btn); s.disabled = true; });
  await wait(reducedMotion() ? 200 : 1100);
  $$('.stamp', box).forEach(s => (s.disabled = false));
  show('date');
  renderCalendar();
}
$('#backToDishes').addEventListener('click', () => {
  $('#stamps').classList.remove('has-choice');
  $$('.stamp').forEach(s => s.classList.remove('is-chosen'));
  show('dishes');
});

// ---------- 5. calendar ----------
const today = new Date(); today.setHours(0, 0, 0, 0);
const lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + 120);
let month = new Date(today.getFullYear(), today.getMonth(), 1);
const SLOTS = [];
for (let m = 11 * 60; m <= 22 * 60; m += 30) SLOTS.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
const slotOk = (iso, time) => {
  if (iso !== toISO(today)) return true;
  const [h, mm] = time.split(':').map(Number);
  const now = new Date();
  return h * 60 + mm >= now.getHours() * 60 + now.getMinutes() + 60;   // at least one hour from now
};
const dayOk = d => d >= today && d <= lastDay && SLOTS.some(s => slotOk(toISO(d), s));

function renderCalendar() {
  $('#calMonth').textContent = monthYear(ui, month);
  $('#calPrev').disabled = month <= new Date(today.getFullYear(), today.getMonth(), 1);
  $('#calNext').disabled = month >= new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
  const grid = $('#calGrid');
  grid.innerHTML = '';
  dates(ui).short.forEach(w => grid.append(Object.assign(document.createElement('span'), { className: 'cal-dow', textContent: w })));
  const offset = (month.getDay() + 6) % 7;
  for (let k = 0; k < offset; k++) grid.append(document.createElement('span'));
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let n = 1; n <= days; n++) {
    const d = new Date(month.getFullYear(), month.getMonth(), n);
    const iso = toISO(d);
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'cal-day', textContent: n });
    b.disabled = !dayOk(d);
    b.setAttribute('aria-label', `${dayName(ui, d)}, ${fmtDM(iso)}`);
    if (iso === toISO(today)) b.classList.add('is-today');
    if (iso === pick.date) { b.classList.add('is-picked'); b.setAttribute('aria-pressed', 'true'); }
    b.addEventListener('click', () => {
      pick.date = iso;
      if (pick.time && !slotOk(iso, pick.time)) pick.time = null;
      renderCalendar();
    });
    grid.append(b);
  }
  renderTimes();
  renderSummary();
}
$('#calPrev').addEventListener('click', () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); renderCalendar(); });
$('#calNext').addEventListener('click', () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); renderCalendar(); });

function renderTimes() {
  const box = $('#times');
  box.innerHTML = '';
  if (!pick.date) { box.append(Object.assign(document.createElement('p'), { className: 'muted-ink', textContent: t('dayFirst') })); return; }
  const groups = [['daytime', s => s < '17:00'], ['evening', s => s >= '17:00']];
  for (const [label, test] of groups) {
    const g = document.createElement('div');
    g.className = 'time-group';
    g.append(Object.assign(document.createElement('p'), { textContent: t(label) }));
    const list = document.createElement('div');
    list.className = 'time-list';
    SLOTS.filter(test).forEach(s => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'time', textContent: s });
      b.disabled = !slotOk(pick.date, s);
      if (s === pick.time) { b.classList.add('is-picked'); b.setAttribute('aria-pressed', 'true'); }
      b.addEventListener('click', () => { pick.time = s; renderTimes(); renderSummary(); });
      list.append(b);
    });
    g.append(list);
    box.append(g);
  }
}
function renderSummary() {
  const s = $('#dateSummary');
  if (!pick.date) s.textContent = t('noDay');
  else {
    const day = `${weekday(pick.date)}, ${fmtDM(pick.date)}`;
    s.textContent = pick.time ? t('dayTime', { day, time: pick.time }) : t('dayNoTime', { day });
  }
  $('#dateDone').disabled = !(pick.date && pick.time);
}

$('#dateDone').addEventListener('click', async () => {
  const btn = $('#dateDone');
  btn.disabled = true; btn.textContent = t('sending');
  $('#saveError').textContent = '';
  try {
    const a = { dish: pick.dish, date: pick.date, time: pick.time };
    await store.submitAnswer(id, code, await encryptJSON(key, a));
    answer = a;
    renderFinal();
    show('final');
  } catch (e) {
    if (e?.reason === 'already-answered' && await showSavedAnswer()) return;
    $('#saveError').textContent = e?.reason === 'already-answered' ? t('alreadyAnswered')
      : ['wrong-code', 'paused', 'locked', 'not-paid'].includes(e?.reason) ? codeError(e) : t('sendFail');
    btn.disabled = false;
  } finally {
    btn.textContent = t('done');
  }
});

// She already answered (e.g. on another phone): load that answer and show her invitation.
async function showSavedAnswer() {
  try {
    const r = await store.openLetter(id, code);
    if (!r.answer) return false;
    answer = await decryptJSON(key, r.answer);
    renderFinal();
    show('final');
    return true;
  } catch { return false; }
}

// ---------- 6. invitation ----------
function finalData() {
  const d = c.dishes[answer.dish] || c.dishes[0];
  const loc = (d.location || '').trim();
  const hasPlace = !!(d.place || loc);
  return {
    d, loc,
    date: fmtDM(answer.date),
    when: t('when', { weekday: weekday(answer.date), time: answer.time }),
    place: d.place ? t('atPlace', { place: d.place }) : '',
    address: loc && !isUrl(loc) ? loc : '',
    pickupLine: !hasPlace ? t('takeYou') : (c.pickup ? t('pickUp') : '')
  };
}
function renderFinal() {
  const f = finalData();
  $('#invSeal span').textContent = (c.from || '♥').charAt(0).toUpperCase();
  $('#invDate').textContent = f.date;
  $('#invWhen').textContent = f.when;
  $('#invPhoto').src = f.d.photo;
  $('#invDish').textContent = f.d.name;
  $('#invPlace').textContent = f.place;
  $('#invPlace').hidden = !f.place;
  $('#invAddr').textContent = f.address;
  $('#invAddr').hidden = !f.address;
  $('#invPickup').textContent = f.pickupLine;
  $('#invPickup').hidden = !f.pickupLine;
  const map = $('#invMap');
  const mapHref = f.loc ? mapsUrl(f.d.place, f.loc) : '';
  map.hidden = !mapHref;
  if (mapHref) map.href = mapHref;
  $('#invSign').textContent = t('sign', { from: c.from });
  $('#finalNote').textContent = t('finalNote', { from: c.from });
}
$('#saveBanner').addEventListener('click', async () => {
  const btn = $('#saveBanner');
  btn.disabled = true; btn.textContent = t('making');
  try {
    const f = finalData();
    const cv = await makeBanner({
      title: t('invTitle'), dear: t('dear', { name: c.girlName }), line: t('invLine'),
      date: f.date, when: f.when, dishName: f.d.name, photo: f.d.photo,
      place: f.place, address: f.address, pickupLine: f.pickupLine,
      sign: t('sign', { from: c.from }), initial: (c.from || '♥').charAt(0).toUpperCase()
    });
    const shared = await saveCanvas(cv, `invitation-${answer.date}.png`, t('invTitle'));
    // Also show the picture: where downloads are blocked (app browsers), she can press and hold it to save.
    if (!shared) {
      $('#pictureImg').src = cv.toDataURL('image/png');
      $('#pictureImg').alt = t('invTitle');
      $('#pictureSheet').hidden = false;
      $('#pictureClose').focus();
    }
  } catch {
    $('#finalNote').textContent = t('saveFail');
  } finally {
    btn.disabled = false; btn.textContent = t('save');
  }
});
$('#reread').addEventListener('click', () => show('letter'));
$('#pictureClose').addEventListener('click', () => { $('#pictureSheet').hidden = true; $('#saveBanner').focus(); });

// ---------- start ----------
(async () => {
  applyLang();
  if (!cryptoReady()) {
    $('#missingText').dataset.t = 'needHttps';
    $('#missingText').textContent = t('needHttps');
    return show('missing');
  }
  try { inv = await store.getCard(id); }
  catch {
    $('#missingText').dataset.t = 'netFail';   // stays right when she switches language
    $('#missingText').textContent = t('netFail');
    return show('missing');
  }
  if (!inv) return show('missing');
  if (validLang(inv.lang)) {
    letterLang = inv.lang;
    if (!herChoice) { ui = letterLang; applyLang(); }   // start in the letter's language unless she picked one before
  }
  if (inv.status !== 'active') return show('notready');
  if (inv.hint) { $('#pinHint').hidden = false; $('#pinHint').textContent = t('hint', { hint: inv.hint }); }
  show('pin');
  pin.focus();
})();
