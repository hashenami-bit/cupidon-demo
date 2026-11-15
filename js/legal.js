// Terms of Use, Public offer and Privacy policy pages: shows the article in the chosen language and keeps the
// UZ / RU / EN switch in step. The language comes from the link (terms.html#ru, set by the links that open
// these pages), else the saved choice, else the browser. The page title key is on <body data-title>.
import { applyI18n, guessLang, langSwitch, savedLang, tr, validLang } from './i18n.js';
import './site.js';

const KEY = 'cupidon.ui';
const titleKey = document.body.dataset.title || 'privacyTitle';
const fromLink = location.hash.slice(1);
let lang = validLang(fromLink) ? fromLink : savedLang(KEY) || guessLang();

function show(l) {
  lang = l;
  document.documentElement.lang = l;
  document.querySelectorAll('article[data-lang]').forEach(a => { a.hidden = a.dataset.lang !== l; });
  applyI18n(l);
  document.title = tr(l, titleKey);
}

// A switch here goes into the address (#ru), not into saved settings: the link's language wins on reload,
// and her visit must not change his page's saved language (`cupidon.ui`).
const sw = langSwitch(document.getElementById('uiLang'), lang, l => { history.replaceState(null, '', `#${l}`); show(l); });
show(lang);
addEventListener('hashchange', () => {
  const l = location.hash.slice(1);
  if (validLang(l) && l !== lang) { sw.set(l); show(l); }
});
