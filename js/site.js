// Site-wide settings that are public on purpose, and the footer under every page.

// Support chat in Telegram. Put the bot's address here once the bot exists, for example
// 'https://t.me/maktubim_support_bot'. While it is empty, the "Support" links stay hidden.
export const SUPPORT_TG = '';

// Only a t.me address is accepted, so a typo can never turn the link into something else.
export const supportUrl = () => (/^https:\/\/t\.me\/[A-Za-z0-9_]{5,64}$/.test(SUPPORT_TG) ? SUPPORT_TG : '');

// Fills the footer: the support link (or keeps it hidden) and the current year.
// The footer's words are [data-t] texts, so each page's applyI18n() translates them with the rest of the page.
export function mountFooter(doc = document) {
  const url = supportUrl();
  doc.querySelectorAll('[data-support]').forEach(a => {
    if (url) { a.href = url; a.hidden = false; } else a.hidden = true;
  });
  doc.querySelectorAll('[data-support-wrap]').forEach(e => { e.hidden = !url; });
  doc.querySelectorAll('[data-support-missing]').forEach(e => { e.hidden = !!url; });
  const year = doc.getElementById('footYear');
  if (year) year.textContent = String(new Date().getFullYear());
  // The privacy page opens in the language this page is showing now.
  doc.querySelectorAll('a[data-privacy]').forEach(a => {
    a.addEventListener('click', () => { a.hash = doc.documentElement.lang || ''; });
  });
}

if (typeof document !== 'undefined') mountFooter();
