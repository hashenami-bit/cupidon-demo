// The visitors' home page (index.html, signed out): a small phone plays a sample invitation like a short clip
// (sealed envelope → the seal breaks → "Will you go on a date with me?") and lets people try the runaway "No".
// Words are [data-t] keys in i18n-app.js, so the page's own applyI18n() translates them.
import { kaptar } from './kaptar.js';
import { tr } from './i18n.js';
import { reducedMotion, heartBurst } from './common.js';

const lang = () => document.documentElement.lang || 'en';

function demoPhone(phone) {
  const screen = phone.querySelector('.lp-screen');
  const envelope = phone.querySelector('.lp-scene-env .envelope');
  const yes = phone.querySelector('.lp-yes');
  const no = phone.querySelector('.lp-no');
  const hint = phone.querySelector('.lp-hint');
  let timer = 0, tries = 0, base = null;

  const show = scene => { screen.dataset.scene = scene; };
  const later = (ms, fn) => { clearTimeout(timer); timer = setTimeout(fn, ms); };
  const drawDove = pose => phone.querySelectorAll(`[data-lp-kaptar="${pose}"]`).forEach(b => { b.innerHTML = kaptar(pose); });

  function resetNo() {
    tries = 0; base = null;
    no.style.transform = '';
    hint.textContent = ''; delete hint.dataset.t;
  }

  // The clip: envelope, the seal breaks and the letter rises, then the question. Reduced motion: the question at once.
  function play() {
    resetNo();
    drawDove('shy');
    envelope.classList.remove('is-open');
    if (reducedMotion()) { show('ask'); return; }
    show('env');
    later(1400, () => {
      envelope.classList.add('is-open');
      later(2300, () => show('ask'));
    });
  }

  // "No" jumps to a random free spot on the screen (moved with transform, so "Yes" never shifts).
  function dodge() {
    tries++;
    const key = tries === 1 ? 'lpNo1' : tries === 2 ? 'lpNo2' : 'lpNo3';
    hint.dataset.t = key;
    hint.textContent = tr(lang(), key);
    const s = screen.getBoundingClientRect(), b = no.getBoundingClientRect(), y = yes.getBoundingClientRect();
    if (!base) base = { x: b.left - s.left, y: b.top - s.top };
    const now = { x: b.left - s.left, y: b.top - s.top };
    for (let i = 0; i < 20; i++) {
      const x = 10 + Math.random() * (s.width - b.width - 20);
      const top = 70 + Math.random() * (s.height - b.height - 150);
      const onYes = x < y.right - s.left + 10 && x + b.width > y.left - s.left - 10 &&
        top < y.bottom - s.top + 10 && top + b.height > y.top - s.top - 10;
      const tooClose = Math.abs(x - now.x) < 50 && Math.abs(top - now.y) < 40;
      if (!onYes && !tooClose) { no.style.transform = `translate(${x - base.x}px, ${top - base.y}px)`; return; }
    }
  }

  no.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') dodge(); });
  no.addEventListener('pointerdown', e => { e.preventDefault(); dodge(); });
  // Keyboard (Enter / Space) clicks have detail 0; mouse and finger clicks were already handled on pointerdown.
  no.addEventListener('click', e => { e.preventDefault(); if (e.detail === 0) dodge(); });
  yes.addEventListener('click', () => {
    heartBurst(yes);
    drawDove('dance');
    show('yes');
    if (!reducedMotion()) later(4500, play);
  });
  phone.querySelector('.lp-again').addEventListener('click', () => { clearTimeout(timer); play(); });

  // Start the clip when the phone is first on screen (signed-in people never see it).
  let started = false;
  new IntersectionObserver((entries, obs) => {
    if (!started && entries.some(e => e.isIntersecting)) { started = true; obs.disconnect(); play(); }
  }, { threshold: 0.35 }).observe(phone);
}

const phone = document.getElementById('lpPhone');
if (phone) demoPhone(phone);

// The second "Continue with Google" button at the end of the page presses the first one (same sign-in code).
const mainLabel = document.getElementById('signInLabel');
document.querySelectorAll('[data-signin]').forEach(b => {
  const span = b.querySelector('span');
  if (mainLabel && span) { span.dataset.t = mainLabel.dataset.t; span.textContent = mainLabel.textContent; }
  b.addEventListener('click', () => document.getElementById('signInBtn')?.click());
});

// Top bar links: scroll to a section (buttons, not #links: the # part of this page's address picks the view).
document.querySelectorAll('[data-scroll]').forEach(b => b.addEventListener('click', () => {
  document.getElementById(b.dataset.scroll)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}));
