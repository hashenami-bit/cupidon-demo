// Stand-in for the Octo card page while PAYMENT_PROVIDER=fake (or in demo mode). No money moves.
import * as store from './store.js';
import { tr, applyI18n, langSwitch, savedLang, saveLang, guessLang } from './i18n.js';
import { $, linkParam } from './common.js';

const UI_KEY = 'cupidon.ui';
let ui = savedLang(UI_KEY) || guessLang();
const t = k => tr(ui, k);
const apply = () => { document.documentElement.lang = ui; applyI18n(ui); document.title = t('testPayT'); };
langSwitch($('#uiLang'), ui, l => { ui = l; saveLang(UI_KEY, l); apply(); });
apply();

const tx = linkParam('tx', '', '[0-9a-f-]{36}');
const buttons = [$('#okBtn'), $('#cancelBtn')];
buttons.forEach(b => (b.disabled = true));

async function pay(cancel) {
  buttons.forEach(b => (b.disabled = true));
  $('#msg').textContent = '';
  try {
    const r = await store.fakePay(tx, cancel);
    $('#msg').textContent = t('testPayDone');
    location.href = 'index.html#paid-' + encodeURIComponent(r.inviteId);
  } catch {
    $('#msg').textContent = t('testPayMissing');
    buttons.forEach(b => (b.disabled = false));
  }
}
$('#okBtn').addEventListener('click', () => pay(false));
$('#cancelBtn').addEventListener('click', () => pay(true));

// The test payment needs his sign-in (the server checks it is his letter).
store.onUser(u => {
  buttons.forEach(b => (b.disabled = !u || !/^[0-9a-f-]{36}$/i.test(tx)));
  if (!u) $('#msg').textContent = t('testPayMissing');
});
