// Her side: code → envelope → letter → "will you come?" → dish → day and time → invitation (with a countdown and "add to calendar").
// "No" never wins: Kaptar carries it off twice, the 3rd time for good, and a hand counts 5 and presses "Yes".
// `ui` = language of buttons and screens (she can switch it in the corner).
// `letterLang` = language he chose for the romantic letter (fixed).
import * as store from './store.js';
import { deriveKey, decryptJSON, encryptJSON, answerKeyFrom, cryptoReady } from './crypto.js';
import { FONTS, THEMES, OPENINGS, fontOf, renderLetter, renderOwn } from './letters.js';
import { tr, dates, dayName, monthYear, guessLang, validLang, applyI18n, langSwitch, savedLang, saveLang } from './i18n.js';
import { $, $$, pinInput, fmtDM, toISO, pad, parseISO, mapsUrl, isUrl, reducedMotion, wait, readInviteLink, inAppBrowser, heartBurst, isImageData } from './common.js';
import { makeBanner, saveCanvas } from './banner.js';
import { openPhotos } from './lightbox.js';
import { kaptar, hand, bow } from './kaptar.js';
import { startOf, countdownParts, saveIcs, googleCalUrl } from './date-tools.js';

const { id, secret: linkSecret } = readInviteLink();   // the secret after the dot is part of her letter's key
const UI_KEY = 'cupidon.ui.her';
const herChoice = savedLang(UI_KEY);
let ui = herChoice || guessLang();
let letterLang = 'en';
let inv = null, key = null, answerKey = null, c = null, answer = null;
const pick = { dish: null, date: null, time: null };
const t = (k, v) => tr(ui, k, v);
const weekday = iso => dayName(ui, parseISO(iso));

function applyLang() {
  document.documentElement.lang = ui;
  applyI18n(ui);
  document.title = t('pinTitle');
  $$('#pin input').forEach((e, i) => e.setAttribute('aria-label', t('digitN', { n: i + 1 })));
  switcher.set(ui);
}
let switched = false;   // she used the switch on this page
const switcher = langSwitch($('#uiLang'), ui, l => { ui = l; switched = true; saveLang(UI_KEY, l); rerender(); });

// Re-draws everything that was built with the old interface language.
function rerender() {
  applyLang();
  $('#pinError').textContent = '';
  if (inv?.hint) $('#pinHint').textContent = t('hint', { hint: inv.hint });
  if (!c) return;
  $$('[data-dear]').forEach(e => (e.textContent = t('dear', { name: c.girlName })));
  $$('.memory-btn, .stamp-zoom, .stamp-edge').forEach(b => b.setAttribute('aria-label', t('photoZoom')));
  if (ask() === 'none') $('#letterEnd').textContent = t('readEnd', { from: c.from });
  renderSteps();
  const hint = $('#noHint');
  if (hint.dataset.t) hint.textContent = t(hint.dataset.t, { n: hint.dataset.n });   // the hand's countdown keeps its number
  $$('.postmark').forEach(pm => { const [a, b] = pm.querySelectorAll('text'); a.textContent = t('chosen'); b.textContent = t('withLoveShort'); });
  renderCalendar();
  if (answer) renderFinal();
}

// A short shower of rose petals when she sends her answer (skipped when she prefers less motion).
function petals() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'petals';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 22; i++) {
    const img = new Image();
    img.alt = '';
    img.src = `img/doodle/petal-${(i % 3) + 1}.svg`;
    img.style.setProperty('--x', `${Math.round(Math.random() * 100)}vw`);
    img.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 180)}px`);
    img.style.setProperty('--r', `${Math.round((Math.random() - 0.5) * 900)}deg`);
    img.style.setProperty('--s', `${Math.round(20 + Math.random() * 20)}px`);
    img.style.setProperty('--d', `${(3.4 + Math.random() * 2.4).toFixed(1)}s`);
    img.style.setProperty('--delay', `${(Math.random() * 1.4).toFixed(2)}s`);
    box.append(img);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 7500);
}

function show(name) {
  if (name !== 'letter') stopUnfold();
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
    case 'busy': return t('tooFast');
    case 'link-incomplete': return t('linkIncomplete');
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
    key = await deriveKey(entered, r.content.salt, linkSecret);
    // The server already said the code is right, so a failure here means the link was cut off.
    try { c = await decryptJSON(key, r.content); } catch { throw { reason: 'link-incomplete' }; }
    answerKey = c.answerKey ? await answerKeyFrom(c.answerKey) : key;   // old letters lock the answer with the letter key
    code = entered;
    answer = null;
    if (r.answer) { try { answer = await decryptJSON(answerKey, r.answer); } catch { answer = null; } }
    $('#pinError').textContent = '';
    fillLetter();
    applyTheme();
    if (answer) { renderFinal(); show('final'); } else { setupOpening(); show('envelope'); startOpening(); }
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

// ---------- his theme ----------
// Her page background after the letter opens (c.theme, inside the locked letter; old letters = classic).
const THEME_BAR = { classic: '#F8E3DE', garden: '#F3D6D2', night: '#1B1F3B', atlas: '#FBEDE6', blossom: '#FCEFEE' };   // the phone's top bar
function applyTheme() {
  const theme = THEMES.includes(c.theme) ? c.theme : 'classic';
  THEMES.forEach(th => document.body.classList.toggle('theme-' + th, th === theme && th !== 'classic'));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BAR[theme]);
}

// ---------- 2. envelope ----------
// He chose how she opens it (c.opening, inside the locked letter): break the wax seal (default), take it from
// Kaptar the dove, untie an atlas silk ribbon, or wipe a misty window. All four end by opening the envelope.
const HINTS = { seal: 'openHint', dove: 'doveHint', ribbon: 'ribbonHint', mist: 'mistHint' };
let envOpened = false;
async function openEnvelope() {
  if (envOpened) return;
  envOpened = true;
  stopTilt();
  $('#envelope').classList.add('is-open');
  await wait(reducedMotion() ? 150 : 2000);
  show('letter');
  unfoldLetter();
}

// The envelope leans toward her finger or mouse (up to TILT degrees) and sways a little by itself (CSS env-sway).
// Only .env-body and the ribbon move; the mist, Kaptar and the bouquets stay still. No phone-motion sensor:
// that needs a permission prompt on iPhones. Off when she asks for less motion or the browser can't animate
// registered CSS properties (then the envelope just stays flat).
const TILT = 9;
let tiltFrame = 0, tiltAt = null;
function canTilt() {
  if (reducedMotion() || !window.CSS?.registerProperty) return false;
  for (const name of ['--tx', '--ty', '--sx', '--sy']) {
    try { CSS.registerProperty({ name, syntax: '<number>', inherits: name[2] === 't', initialValue: '0' }); }
    catch (e) { if (e?.name !== 'InvalidModificationError') return false; }   // already registered = fine
  }
  return true;
}
function setupTilt() { $('#envStage').classList.toggle('can-tilt', canTilt()); }
function tiltTo(e) {
  const stage = $('#envStage');
  if (envOpened || !stage.classList.contains('can-tilt')) return;
  if (e.pointerType !== 'mouse' && e.type === 'pointermove' && !e.buttons) return;   // a finger only leans it while it touches
  tiltAt = { x: e.clientX, y: e.clientY };
  if (tiltFrame) return;
  tiltFrame = requestAnimationFrame(() => {
    tiltFrame = 0;
    if (!tiltAt || envOpened) return;
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const clamp = v => Math.max(-1, Math.min(1, v));
    const nx = clamp((tiltAt.x - r.left - r.width / 2) / (r.width / 2));
    const ny = clamp((tiltAt.y - r.top - r.height / 2) / (r.height / 2));
    stage.classList.add('is-tilting');
    stage.style.setProperty('--tx', (-ny * TILT).toFixed(2));   // finger near the top: the top leans away
    stage.style.setProperty('--ty', (nx * TILT).toFixed(2));
  });
}
function tiltBack() {
  tiltAt = null;
  const stage = $('#envStage');
  stage.classList.remove('is-tilting');   // the slow transition takes it back to flat
  stage.style.setProperty('--tx', '0');
  stage.style.setProperty('--ty', '0');
}
function stopTilt() {
  cancelAnimationFrame(tiltFrame);
  tiltFrame = 0;
  tiltBack();
  $('#envStage').classList.add('is-still');
}
{
  const stage = $('#envStage');
  stage.addEventListener('pointermove', tiltTo);
  stage.addEventListener('pointerdown', tiltTo);
  stage.addEventListener('pointerleave', tiltBack);
  ['pointerup', 'pointercancel'].forEach(ev => stage.addEventListener(ev, e => { if (e.pointerType !== 'mouse') tiltBack(); }));
}

// ---------- 3. letter unfolds ----------
// A blank sheet of a fixed size (as tall as the letter, at most most of the screen) opens from three folds,
// then the real paper grows down from it and the words fade in. Only the first time, right after the envelope.
const UNFOLD_MS = 1300, REVEAL_MS = 2400;
let unfoldTimers = [];
function unfoldLetter() {
  if (reducedMotion()) return;
  const screen = $('#s-letter'), paper = screen.querySelector('.letter');
  stopUnfold();
  const h = Math.round(Math.min(paper.offsetHeight, window.innerHeight * 0.62, 520));
  if (h < 120) return;   // nothing sensible to fold
  paper.style.setProperty('--sheet-h', h + 'px');
  screen.classList.add('unfold');
  paper.classList.add('is-unfolding');
  unfoldTimers.push(setTimeout(() => {
    paper.classList.replace('is-unfolding', 'is-revealing');
    unfoldTimers.push(setTimeout(() => paper.classList.remove('is-revealing'), REVEAL_MS));
  }, UNFOLD_MS));
}
function stopUnfold() {
  unfoldTimers.forEach(clearTimeout);
  unfoldTimers = [];
  const screen = $('#s-letter');
  screen.classList.remove('unfold');
  screen.querySelector('.letter').classList.remove('is-unfolding', 'is-revealing');
}
function setupOpening() {
  const mode = OPENINGS.includes(c.opening) ? c.opening : 'seal';
  const stage = $('#envStage');
  OPENINGS.forEach(m => stage.classList.toggle('mode-' + m, m === mode));
  $('#openHint').dataset.t = HINTS[mode];
  $('#openHint').textContent = t(HINTS[mode]);
  const seal = $('#sealBtn');
  if (mode !== 'seal') {   // the seal stays on the envelope as a picture; something else opens it
    seal.tabIndex = -1;
    seal.setAttribute('aria-hidden', 'true');
    const label = seal.querySelector('span');
    delete label.dataset.t;
    label.textContent = '♥';
  }
  $('#ribbon').hidden = mode !== 'ribbon';
  $('#doveBtn').hidden = mode !== 'dove';
  $('#mist').hidden = mode !== 'mist';
  $('#mistSkip').hidden = mode !== 'mist';
  if (mode === 'ribbon') $('#ribbonBtn').innerHTML = bow();
  if (mode === 'dove') $('#doveBtn').innerHTML = `<span class="kaptar">${kaptar('fly')}</span>`;
  setupTilt();
}
// The opening screen is shown now: the mist has to be painted at its real size.
function startOpening() { if (c.opening === 'mist') paintMist(); }

$('#sealBtn').addEventListener('click', () => { if ($('#envStage').classList.contains('mode-seal')) openEnvelope(); });

// The dove: flies in with the letter (CSS), she taps him, he drops it and flies off.
$('#doveBtn').addEventListener('click', async () => {
  const dove = $('#doveBtn');
  if (dove.classList.contains('is-leaving')) return;
  dove.innerHTML = `<span class="kaptar">${kaptar('grab')}</span>`;   // the letter has left his beak
  dove.classList.add('is-leaving');
  $('#envStage').classList.add('is-dropped');
  await wait(reducedMotion() ? 0 : 700);
  openEnvelope();
});

// The ribbon: the bow comes undone, the bands slide off.
$('#ribbonBtn').addEventListener('click', async () => {
  $('#ribbon').classList.add('is-untied');
  await wait(reducedMotion() ? 0 : 950);
  $('#ribbon').hidden = true;
  openEnvelope();
});

// The misty window: a canvas of fog over the envelope; where her finger goes, the fog goes (more than half → it opens).
const mist = $('#mist');
let mistCtx = null, wiping = false, last = null, moves = 0;
function paintMist() {
  const r = { width: mist.offsetWidth, height: mist.offsetHeight }, dpr = Math.min(2, window.devicePixelRatio || 1);   // offset*: not changed by the screen's entrance animation
  mist.width = Math.round(r.width * dpr); mist.height = Math.round(r.height * dpr);
  const x = mistCtx = mist.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.fillStyle = 'rgba(246, 240, 242, .93)';
  x.fillRect(0, 0, r.width, r.height);
  for (let i = 0; i < 70; i++) {   // soft clouds
    const cx = Math.random() * r.width, cy = Math.random() * r.height, rad = 20 + Math.random() * 60;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, 'rgba(255, 255, 255, .35)'); g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 26; i++) {   // drops on the glass
    const cx = Math.random() * r.width, cy = Math.random() * r.height, rad = 1.5 + Math.random() * 3;
    x.fillStyle = 'rgba(190, 170, 180, .35)'; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255, 255, 255, .9)'; x.beginPath(); x.arc(cx - rad * 0.35, cy - rad * 0.35, rad * 0.35, 0, Math.PI * 2); x.fill();
  }
  // someone already drew a little heart on the window: it shows her what to do
  x.globalCompositeOperation = 'destination-out';
  x.lineWidth = 6; x.lineCap = 'round'; x.lineJoin = 'round';
  const hx = r.width * 0.78, hy = r.height * 0.24, k = Math.min(r.width, r.height) / 260;
  x.beginPath();
  x.moveTo(hx, hy + 22 * k);
  x.bezierCurveTo(hx - 30 * k, hy, hx - 22 * k, hy - 22 * k, hx, hy - 8 * k);
  x.bezierCurveTo(hx + 22 * k, hy - 22 * k, hx + 30 * k, hy, hx, hy + 22 * k);
  x.stroke();
  x.lineWidth = 48; x.shadowColor = '#000'; x.shadowBlur = 14;   // her finger: soft edges
}
function wipe(p) {
  const r = mist.getBoundingClientRect(), k = mist.offsetWidth / r.width;
  const pt = { x: (p.clientX - r.left) * k, y: (p.clientY - r.top) * k };
  mistCtx.beginPath();
  mistCtx.moveTo((last || pt).x, (last || pt).y);
  mistCtx.lineTo(pt.x + 0.1, pt.y);
  mistCtx.stroke();
  last = pt;
  if (++moves % 6 === 0 && clearedShare() > 0.5) clearMist();
}
const probe = Object.assign(document.createElement('canvas'), { width: 40, height: 27 });
function clearedShare() {   // measured on a tiny copy: cheap enough to do while she wipes
  const x = probe.getContext('2d', { willReadFrequently: true });
  x.clearRect(0, 0, 40, 27);
  x.drawImage(mist, 0, 0, 40, 27);
  const d = x.getImageData(0, 0, 40, 27).data;
  let clear = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 70) clear++;
  return clear / (40 * 27);
}
function clearMist() {
  if (mist.classList.contains('is-clear')) return;
  wiping = false;
  mist.classList.add('is-clear');
  $('#envStage').classList.add('is-clear');
  $('#mistSkip').hidden = true;
  setTimeout(openEnvelope, reducedMotion() ? 0 : 700);
}
mist.addEventListener('pointerdown', e => { if (!mistCtx) return; wiping = true; last = null; mist.setPointerCapture(e.pointerId); wipe(e); });
mist.addEventListener('pointermove', e => { if (wiping) wipe(e); });
['pointerup', 'pointercancel'].forEach(ev => mist.addEventListener(ev, () => { wiping = false; last = null; }));
$('#mistSkip').addEventListener('click', clearMist);
let mistResize = 0;
window.addEventListener('resize', () => {   // phone turned: the canvas has a new size, so the fog is painted again
  clearTimeout(mistResize);
  mistResize = setTimeout(() => { if (mistCtx && !mist.hidden && !mist.classList.contains('is-clear') && $('#s-envelope').classList.contains('is-active')) paintMist(); }, 200);
});

// ---------- 3. letter ----------
function fillLetter() {
  $$('[data-name]').forEach(e => (e.textContent = c.girlName));
  $$('[data-dear]').forEach(e => (e.textContent = t('dear', { name: c.girlName })));
  const L = c.letter === 'own' ? renderOwn(letterLang, c.girlName, c.own) : renderLetter(letterLang, c.letter, c.girlName, ask());
  $('.letter').lang = letterLang;
  FONTS.forEach(f => $('.letter').classList.remove('font-' + f));
  $('.letter').classList.add('font-' + fontOf(c.font));   // the handwriting he picked
  $('#lGreeting').textContent = L.greeting;
  renderSteps();
  const body = $('#lBody');
  body.innerHTML = '';
  L.body.forEach(p => body.append(Object.assign(document.createElement('p'), { textContent: p })));
  $('#lNote').hidden = !c.note;
  $('#lNote').textContent = c.note ? 'P.S. ' + c.note : '';
  $('#lClosing').textContent = L.closing;
  $('#lSign').textContent = c.from;
  buildMemories();
  buildStamps();
  const readOnly = ask() === 'none';   // no question for her: the letter is the end
  $('#toDishes').hidden = readOnly;
  $('#letterEnd').hidden = !readOnly;
  $('#letterEnd').textContent = t('readEnd', { from: c.from });
}
const safePhoto = p => (isImageData(p) ? p : '');   // only plain image data is ever shown
const viewerLabels = () => ({ close: t('close'), prev: t('photoPrev'), next: t('photoNext') });

// His photos pop up above the letter when she opens it (only plain image data is accepted).
function buildMemories() {
  const box = $('#memories');
  box.innerHTML = '';
  const list = (Array.isArray(c.photos) ? c.photos : []).filter(isImageData).slice(0, 3);
  box.hidden = !list.length;
  box.dataset.n = list.length;
  list.forEach((src, i) => {
    const fig = document.createElement('figure');
    fig.className = 'memory';
    fig.style.setProperty('--i', i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'memory-btn';
    btn.setAttribute('aria-label', t('photoZoom'));
    btn.addEventListener('click', () => openPhotos(list.map(s => ({ src: s, alt: t('ourPhoto') })), i, viewerLabels()));
    const img = new Image();
    img.alt = '';
    img.src = src;
    btn.append(img);
    fig.append(btn);
    box.append(fig);
  });
}
const ask = () => c.ask || 'full';   // 'full' = dish + day and time, 'dish' = only the dish, 'none' = she just reads
const hasDate = () => ask() === 'full';

// Step dots above dish → day → invitation: 1/3 · 2/3 · 3/3 (only 2 steps without the calendar).
const HEART_DOT = '<svg viewBox="-10 -9 20 17" aria-hidden="true"><path d="M0 6C-8 0-9-6-4.5-7.5C-2-8.3 0-6.5 0-5C0-6.5 2-8.3 4.5-7.5C9-6 8 0 0 6Z"/></svg>';
function renderSteps() {
  const total = hasDate() ? 3 : 2;
  $$('.steps').forEach(el => {
    const n = el.dataset.step === 'last' ? total : Math.min(Number(el.dataset.step), total);
    const dots = Array.from({ length: total }, (_, i) =>
      i + 1 === n ? `<span class="step-dot is-now">${HEART_DOT}</span>` : `<span class="step-dot${i + 1 < n ? ' is-done' : ''}"></span>`).join('');
    el.innerHTML = `<span class="sr-only"></span><span class="step-dots" aria-hidden="true">${dots}</span><span class="step-n" aria-hidden="true">${n}/${total}</span>`;
    el.firstChild.textContent = t('stepOf', { n, total });
  });
}
$('#toDishes').addEventListener('click', () => (answer ? show('final') : openAsk()));

// ---------- 3b. will you come? ----------
// "No" is carried off by Kaptar: twice to a new spot, the 3rd time away for good. Then a hand counts down 5 → 1
// (folding a finger each second) and presses "Yes" itself, unless she presses it first.
const askArea = $('#askArea'), carrier = $('#noCarrier'), noDove = $('.no-dove'), yesHand = $('#yesHand');
yesHand.innerHTML = hand();
let noTries = 0, flying = false, countRun = 0;   // countRun: a new number cancels a running countdown
// All her "No" presses, also after coming back to this screen or a reload; sent (locked) with her answer for his list.
const NO_KEY = 'cupidon.no.' + id;
let noTotal = 0;
try { noTotal = Number(sessionStorage.getItem(NO_KEY)) || 0; } catch { /* private mode: count from 0 */ }
function openAsk() {
  noTries = 0;
  countRun++;
  carrier.style.transform = '';
  carrier.style.visibility = '';
  yesHand.hidden = true;
  $('#askYes').classList.remove('is-pressed');
  const hint = $('#noHint');
  delete hint.dataset.t;
  hint.textContent = '';
  show('ask');
}
const overlaps = (a, b, pad = 14) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
function newSpot() {   // a spot inside the ask area away from "Yes", as an offset from where the button normally sits
  const area = askArea.getBoundingClientRect(), yes = $('#askYes').getBoundingClientRect();
  const home = { x: carrier.offsetLeft, y: carrier.offsetTop }, w = carrier.offsetWidth, h = carrier.offsetHeight;
  const yesBox = { x: yes.left - area.left, y: yes.top - area.top, w: yes.width, h: yes.height };
  const now = new DOMMatrix(getComputedStyle(carrier).transform);
  let best = null, bestGap = -1;
  for (let k = 0; k < 40; k++) {
    const x = Math.random() * Math.max(0, area.width - w), y = 70 + Math.random() * Math.max(0, area.height - h - 70);   // 70px: room for the dove above
    if (overlaps({ x, y, w, h }, yesBox)) continue;
    const gap = Math.min(Math.hypot(x - home.x - now.e, y - home.y - now.f), Math.hypot(x - home.x, y - home.y));   // away from where it is and from home
    if (gap >= 80) return { x: x - home.x, y: y - home.y };
    if (gap > bestGap) { bestGap = gap; best = { x: x - home.x, y: y - home.y }; }
  }
  return best || { x: 0, y: -60 };   // tiny screens: the farthest free spot found, or at least up
}
const play = (el, frames, ms, easing = 'ease-in-out') => el.animate(frames, { duration: ms, easing, fill: 'forwards' }).finished;
const setHint = (key, n = '') => { const h = $('#noHint'); h.dataset.t = key; h.dataset.n = n; h.textContent = t(key, { n }); };
$('#askNo').addEventListener('click', async () => {
  if (flying || noTries >= 3) return;
  noTries++;
  noTotal++;
  try { sessionStorage.setItem(NO_KEY, String(noTotal)); } catch { /* not kept: only the count gets smaller */ }
  const away = noTries === 3;
  const to = away ? { x: window.innerWidth, y: -260 } : newSpot();
  const target = `translate(${Math.round(to.x)}px, ${Math.round(to.y)}px)`;
  if (reducedMotion()) {
    carrier.style.transform = target;
  } else {
    flying = true;
    const from = getComputedStyle(carrier).transform;
    try {
      await play(noDove, [{ opacity: 0, transform: 'translate(70px, -90px) rotate(-10deg)' }, { opacity: 1, transform: 'none' }], 420, 'ease-out');
      await play(carrier, [{ transform: from === 'none' ? 'none' : from }, { transform: `translate(${Math.round(to.x / 2)}px, ${Math.round(to.y / 2) - 46}px) rotate(-4deg)` }, { transform: target }], away ? 1000 : 760);
      carrier.style.transform = target;
      carrier.getAnimations().forEach(a => a.cancel());
      if (!away) await play(noDove, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate(80px, -100px) rotate(8deg)' }], 420, 'ease-in');
    } finally {
      noDove.getAnimations().forEach(a => a.cancel());
      flying = false;
    }
  }
  if (!away) { setHint('no' + noTries); return; }
  carrier.style.visibility = 'hidden';   // keeps its place, so "Yes" doesn't move
  countToYes();
});

const FOLD = ['f-pinky', 'f-ring', 'f-middle', 'f-thumb'];   // 5 → 1: the index finger stays up to press "Yes"
async function countToYes() {
  const run = ++countRun;
  $$('.k-finger', yesHand).forEach(f => f.classList.remove('is-down'));
  yesHand.style.left = `${carrier.offsetLeft + (carrier.offsetWidth - 96) / 2}px`;
  yesHand.hidden = false;
  for (let n = 5; n >= 1; n--) {
    FOLD.slice(0, 5 - n).forEach(cls => $('.' + cls, yesHand).classList.add('is-down'));
    setHint('no3', n);
    await wait(1000);
    if (run !== countRun) return;   // she pressed "Yes" herself or left this screen
  }
  const yes = $('#askYes').getBoundingClientRect(), h = yesHand.getBoundingClientRect();
  if (!reducedMotion()) {
    await play(yesHand, [{ transform: 'none' }, { transform: `translate(${Math.round(yes.left + yes.width * 0.6 - h.left - 30)}px, ${Math.round(yes.top + yes.height * 0.5 - h.top - 14)}px) rotate(-18deg)` }], 650, 'cubic-bezier(.4, 0, .2, 1)');
  }
  if (run !== countRun) return;
  $('#askYes').classList.add('is-pressed');
  await wait(260);
  if (run === countRun) sayYes();
}
function sayYes() {
  countRun++;
  yesHand.getAnimations().forEach(a => a.cancel());
  show('yes');
  heartBurst($('.kaptar-yes'));
}
$('#askYes').addEventListener('click', sayYes);
$('#yesGo').addEventListener('click', () => show('dishes'));

// ---------- 4. dishes ----------
function postmark() {
  const svg = `<svg class="postmark" viewBox="0 0 160 110" aria-hidden="true" fill="none" stroke="currentColor">
    <circle cx="55" cy="55" r="44" stroke-width="3"/><circle cx="55" cy="55" r="34" stroke-width="1.5"/>
    <path d="M104 35c8-6 16 6 24 0s16 6 24 0M104 55c8-6 16 6 24 0s16 6 24 0M104 75c8-6 16 6 24 0s16 6 24 0" stroke-width="3"/>
    <text x="55" y="50" text-anchor="middle" fill="currentColor" stroke="none" font-family="Lora, serif" font-weight="700" font-size="12.5"></text>
    <text x="55" y="72" text-anchor="middle" fill="currentColor" stroke="none" font-family="Great Vibes, cursive" font-weight="400" font-size="24"></text>
  </svg>`;
  const tpl = document.createElement('template');
  tpl.innerHTML = svg.trim();
  const el = tpl.content.firstChild;
  const [a, b] = el.querySelectorAll('text');
  a.textContent = t('chosen'); b.textContent = t('withLoveShort');
  return el;
}

const ZOOM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/></svg>';

function buildStamps() {
  const box = $('#stamps');
  box.innerHTML = '';
  box.classList.remove('has-choice');
  c.dishes.forEach((d, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stamp';
    b.innerHTML = '<span class="stamp-in"><span class="stamp-photo"><img alt=""></span><span class="stamp-name"></span><span class="stamp-place"></span></span>';
    b.querySelector('img').src = safePhoto(d.photo);
    b.querySelector('.stamp-photo').append(postmark());
    b.querySelector('.stamp-name').textContent = d.name;
    b.querySelector('.stamp-place').textContent = d.place || '';
    b.addEventListener('click', () => chooseDish(i, b));
    // The stamp itself chooses the dish, so a separate round button opens the photo full screen.
    const zoom = document.createElement('button');
    zoom.type = 'button';
    zoom.className = 'stamp-zoom';
    zoom.setAttribute('aria-label', t('photoZoom'));
    zoom.innerHTML = ZOOM_ICON;
    zoom.addEventListener('click', () => openPhotos(c.dishes.map(x => ({ src: safePhoto(x.photo), alt: x.name, caption: [x.name, x.place].filter(Boolean).join(' · ') })).filter(x => x.src), i, viewerLabels()));
    const wrap = document.createElement('div');
    wrap.className = 'stamp-wrap';
    wrap.append(b, zoom);
    box.append(wrap);
  });
}
async function chooseDish(i, btn) {
  pick.dish = i;
  const box = $('#stamps');
  box.classList.add('has-choice');
  $$('.stamp', box).forEach(s => { s.classList.toggle('is-chosen', s === btn); s.disabled = true; });
  await wait(reducedMotion() ? 200 : 1100);
  if (hasDate()) {
    $$('.stamp', box).forEach(s => (s.disabled = false));
    show('date');
    renderCalendar();
    return;
  }
  // No calendar: choosing the dish is her whole answer.
  if (!await sendAnswer($('#dishError'))) {
    box.classList.remove('has-choice');
    $$('.stamp', box).forEach(s => { s.classList.remove('is-chosen'); s.disabled = false; });
  }
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
  const todayIso = toISO(new Date());   // fresh each time: she may keep the page open past midnight
  if (iso < todayIso) return false;
  if (iso !== todayIso) return true;
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
      $('#calGrid .is-picked')?.focus();   // the old button was replaced: keep keyboard focus on the new one
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
      b.addEventListener('click', () => { pick.time = s; renderTimes(); renderSummary(); $('#times .is-picked')?.focus(); });
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

// Sends her answer (locked with the same key). Returns true when she is done; otherwise writes the reason into errEl.
async function sendAnswer(errEl) {
  errEl.textContent = '';
  const dated = hasDate();
  if (dated && !slotOk(pick.date, pick.time)) {   // the time she picked has passed while she was deciding
    pick.time = null;
    renderCalendar();
    errEl.textContent = t('timePassed');
    return false;
  }
  const a = { dish: pick.dish, date: dated ? pick.date : null, time: dated ? pick.time : null, no: noTotal };
  try {
    await store.submitAnswer(id, code, await encryptJSON(answerKey, a));
  } catch (e) {
    if (e?.reason === 'already-answered' && await showSavedAnswer()) return true;
    errEl.textContent = e?.reason === 'already-answered' ? t('alreadyAnswered')
      : ['wrong-code', 'paused', 'locked', 'not-paid'].includes(e?.reason) ? codeError(e) : t('sendFail');
    return false;
  }
  // Sent. From here on nothing may say "not sent": a drawing problem must not hide that her answer arrived.
  answer = a;
  show('final');
  try { renderFinal(); } catch (e) { console.error('invitation', e); }
  petals();
  return true;
}

$('#dateDone').addEventListener('click', async () => {
  const btn = $('#dateDone');
  btn.disabled = true; btn.textContent = t('sending');
  const ok = await sendAnswer($('#saveError'));
  btn.textContent = t('done');
  if (!ok) btn.disabled = false;
});

// She already answered (e.g. on another phone): load that answer and show her invitation.
async function showSavedAnswer() {
  try {
    const r = await store.openLetter(id, code);
    if (!r.answer) return false;
    answer = await decryptJSON(answerKey, r.answer);
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
    dated: !!answer.date,
    date: answer.date ? fmtDM(answer.date) : '',
    when: answer.date ? t('when', { weekday: weekday(answer.date), time: answer.time }) : t('daySoon'),
    place: d.place ? t('atPlace', { place: d.place }) : '',
    address: loc && !isUrl(loc) ? loc : '',
    pickupLine: !hasPlace ? t('takeYou') : (c.pickup ? t('pickUp') : '')
  };
}
const initialOf = name => ([...String(name || '')][0] || '♥').toUpperCase();   // spread: an emoji is not cut in half

function renderFinal() {
  const f = finalData();
  $('#invSeal span').textContent = initialOf(c.from);
  $('#invDate').textContent = f.date;
  $('#invDate').classList.toggle('is-heart', !f.dated);   // no date: a painted heart takes its place
  $('#invWhen').textContent = f.when;
  $('#invLine').dataset.t = f.dated ? 'invLine' : 'invLineNoDate';
  $('#invLine').textContent = t(f.dated ? 'invLine' : 'invLineNoDate');
  $('#invPhoto').src = safePhoto(f.d.photo);
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
  renderCountdown();
  renderSecret();
}

// Live countdown to the date + "add to calendar". Without a date only the dancing dove shows.
let countdownTimer = 0;
const PAST_SHOWN = 12 * 3600e3;   // "It's time" stays this long after the start, then the countdown hides
function calEvent() {
  const f = finalData();
  const mapHref = f.loc ? mapsUrl(f.d.place, f.loc) : '';
  return {
    uid: `${id}-${answer.date}`,
    title: t('calEvent', { from: c.from }),
    start: startOf(answer.date, answer.time),
    place: [f.d.place, f.address].filter(Boolean).join(', '),
    details: [f.d.name, f.pickupLine, mapHref, t('sign', { from: c.from })].filter(Boolean).join('\n')
  };
}
function renderCountdown() {
  clearInterval(countdownTimer);
  const start = answer?.date && answer.time ? startOf(answer.date, answer.time) : null;
  const shown = !!start && Date.now() - start < PAST_SHOWN;
  $('#cdMain').hidden = !shown;
  $('#countdown').classList.toggle('is-dove-only', !shown);
  if (!shown) return;
  $('#calGoogle').href = googleCalUrl(calEvent());
  const draw = () => {
    const left = start - Date.now();
    const now = left <= 0;
    $('#cdTitle').textContent = t(now ? 'countNow' : 'countTitle');
    $('#cdTimer').hidden = now;
    $('#cdCal').hidden = now;
    if (now) { clearInterval(countdownTimer); return; }
    const p = countdownParts(left);
    $('#cdDays').textContent = p.days;
    $('#cdHours').textContent = pad(p.hours);
    $('#cdMinutes').textContent = pad(p.minutes);
    $('#cdSeconds').textContent = pad(p.seconds);
  };
  draw();
  countdownTimer = setInterval(draw, 1000);
}
// Secret envelope: his extra note, closed until she taps it (it opens like the first envelope, smaller).
function renderSecret() {
  const text = typeof c.secret === 'string' ? c.secret.trim() : '';
  $('#secretBox').hidden = !text;
  if (!text) return;
  $('#secretText').textContent = text;
  $('#secretSign').textContent = t('sign', { from: c.from });
  const note = $('#secretNote');
  note.lang = letterLang;
  FONTS.forEach(f => note.classList.remove('font-' + f));
  note.classList.add('font-' + fontOf(c.font));   // his handwriting, like the letter
}
$('#secretOpen').addEventListener('click', async () => {
  const btn = $('#secretOpen');
  if (btn.getAttribute('aria-expanded') === 'true') return;
  btn.setAttribute('aria-expanded', 'true');
  btn.querySelector('.envelope').classList.add('is-open');
  await wait(reducedMotion() ? 0 : 1700);
  $('#secretNote').hidden = false;
  $('#secretNote').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
});

$('#calFile').addEventListener('click', () => {
  let ok = true;
  try { saveIcs(calEvent(), `maktubim-${answer.date}.ics`); }
  catch { ok = false; }
  // Inside Telegram or Instagram the download usually does nothing and says nothing: point her to the other ways.
  if (!ok || inAppBrowser()) $('#finalNote').textContent = t('calFileFail');
});
$('#saveBanner').addEventListener('click', async () => {
  const btn = $('#saveBanner');
  btn.disabled = true; btn.textContent = t('making');
  try {
    const f = finalData();
    const cv = await makeBanner({
      title: t('invTitle'), dear: t('dear', { name: c.girlName }), line: t(f.dated ? 'invLine' : 'invLineNoDate'),
      date: f.date, when: f.when, dishName: f.d.name, photo: safePhoto(f.d.photo),
      place: f.place, address: f.address, pickupLine: f.pickupLine,
      sign: t('sign', { from: c.from }), initial: initialOf(c.from)
    });
    const shared = await saveCanvas(cv, `invitation-${answer.date || 'maktubim'}.png`, t('invTitle'));
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
const invPhoto = $('.inv-dish .stamp-edge');
const openInvPhoto = () => {
  if (!answer) return;
  const d = finalData().d;
  if (safePhoto(d.photo)) openPhotos([{ src: safePhoto(d.photo), alt: d.name, caption: d.name }], 0, viewerLabels());
};
invPhoto.addEventListener('click', openInvPhoto);
invPhoto.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInvPhoto(); } });
$('#reread').addEventListener('click', () => show('letter'));
$('#pictureClose').addEventListener('click', () => { $('#pictureSheet').hidden = true; $('#saveBanner').focus(); });

// ---------- start ----------
(async () => {
  applyLang();
  $$('[data-kaptar]').forEach(el => (el.innerHTML = kaptar(el.dataset.kaptar)));
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
    if (!herChoice && !switched) { ui = letterLang; applyLang(); }   // start in the letter's language unless she picked one before
  }
  if (inv.status !== 'active') return show('notready');
  if (inv.hint) { $('#pinHint').hidden = false; $('#pinHint').textContent = t('hint', { hint: inv.hint }); }
  show('pin');
  pin.focus();
})();
