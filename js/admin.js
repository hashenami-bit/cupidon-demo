// Admin panel (admin.html): dashboard, letters, customers (CRM), payments, health.
// Data comes from /api/adminOverview (functions/src/admin.js), only with the pass from the username + password login.
// Her answers are unlocked here in the browser with the answer key from his summary (same as his list in boy.js).
// This file = login, tabs and loading; each tab lives in admin/*.js (see admin/data.js for how they reach each other).
import * as store from './store.js';
import { $, fmtTime, toast, closeDrawer } from './admin/ui.js';
import { state, actions, readAnswer, build } from './admin/data.js';
import { renderOverview } from './admin/overview.js';
import { renderLetters, openLetter } from './admin/letters.js';
import { renderCustomers, openCustomer } from './admin/customers.js';
import { renderPayments, openPayment } from './admin/payments.js';
import { renderHealth } from './admin/health.js';

async function load(fresh = false) {
  $('#refreshBtn').disabled = true;
  $('#loadError').hidden = true;
  try {
    const data = await store.admin('Overview', { fresh });
    state.data = data;
    await Promise.all(data.letters.map(readAnswer));
    build();
    const view = state.view;
    $('#stamp').textContent = 'Updated ' + fmtTime(data.at);
    if (data.accountsError) { $('#loadError').textContent = 'Emails are missing: the server could not list Google accounts (' + data.accountsError + '). Its key needs the Firebase Authentication Viewer role.'; $('#loadError').hidden = false; }
    $('#cntLetters').textContent = view.letters.length;
    $('#cntCustomers').textContent = view.customers.length;
    // Payments that need a person: refunds, and card-transfer receipts waiting for a check.
    const todo = view.payments.filter(p => p.refund || p.waiting).length;
    $('#cntRefund').textContent = todo || '';
    renderAll();
    return true;
  } catch (e) {
    if (e.reason === 'admin-session' || e.code === 'unauthenticated' || e.code === 'permission-denied') {
      store.adminLogout();
      showGate('Your session ended. Log in again.');
      return 'session';
    }
    $('#loadError').textContent = e.reason === 'network' ? 'Could not reach the server. Check the connection and press Refresh.' : 'Loading failed (' + (e.code || e.reason || e.message) + '). Press Refresh to try again.';
    $('#loadError').hidden = false;
    return false;
  } finally { $('#refreshBtn').disabled = false; }
}

// ---------- tabs ----------
const TABS = ['overview', 'letters', 'customers', 'payments', 'health'];
function showTab() {
  const tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  for (const t of TABS) $('#tab-' + t).hidden = t !== tab;
  for (const a of document.querySelectorAll('.ad-tabs a')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  closeDrawer();
  if (tab === 'overview' && state.data) renderOverview();   // its older days are only fetched while the tab is on screen
}
addEventListener('hashchange', showTab);

function renderAll() {
  renderOverview();
  renderLetters();
  renderCustomers();
  renderPayments();
  renderHealth();
}

// How the parts reach each other (see admin/data.js).
actions.load = load;
actions.renderAll = renderAll;
actions.open = { letter: openLetter, customer: openCustomer, payment: openPayment };
actions.render = { letter: renderLetters, cust: renderCustomers, pay: renderPayments };

// ---------- log in (username + password, functions/src/admin-auth.js) ----------
function showGate(text = 'Log in to see letters, customers and payments.') {
  closeDrawer();
  $('#app').hidden = true; $('#who').hidden = true; $('#gate').hidden = false;
  $('#gateText').textContent = text;
  $('#adminPass').value = '';
  (store.DEMO ? $('#adminUser') : ($('#adminUser').value ? $('#adminPass') : $('#adminUser'))).focus();
}
async function enter() {
  $('#gate').hidden = true;
  $('#who').hidden = false;
  const ok = await load();
  if (ok === 'session') return;
  $('#app').hidden = false;
  showTab();
}
const LOGIN_ERRORS = {
  'admin-wrong': 'Wrong username or password.',
  'admin-locked': 'Too many wrong tries. The login is closed for a while (15 minutes, up to 2 hours after many tries).',
  'admin-off': 'The admin login is not set up on the server yet (ADMIN_USER, ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET).',
  network: 'Could not reach the server. Check the connection.',
  busy: 'The server is busy. Try again in a minute.'
};
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#gateError').textContent = '';
  $('#loginBtn').disabled = true;
  try {
    await store.adminLogin($('#adminUser').value.trim(), $('#adminPass').value);
    $('#adminPass').value = '';
    await enter();
  } catch (err) {
    $('#gateError').textContent = LOGIN_ERRORS[err.reason] || 'Log in failed (' + (err.code || err.reason) + ').';
    $('#adminPass').select();
  } finally { $('#loginBtn').disabled = false; }
});
$('#signOutBtn').addEventListener('click', () => { store.adminLogout(); location.replace(location.pathname); });   // nothing stays on screen
$('#refreshBtn').addEventListener('click', async () => { if (await load(true) === true) toast('Up to date'); });

$('#demoNote').hidden = !store.DEMO;
if (store.DEMO) $('#gateText').textContent = 'Demo: username demo, password demo.';
if (store.adminSignedIn()) enter(); else showGate(store.DEMO ? 'Demo: username demo, password demo.' : undefined);
