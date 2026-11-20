// Health tab: meters, server settings, the admin activity list (loaded only when asked: it costs reads).
import * as store from '../store.js';
import { $, h, dayOf, fmtNum, fmtTime, money, toast } from './ui.js';
import { state, cleanupLate } from './data.js';

const WORDS = { manualConfirm: 'Confirmed a card payment', manualRefuse: 'Refused a card payment', unlock: 'Unlocked letter', giveFree: 'Changed free letters', sendFree: 'Sent a letter for free', delete: 'Deleted letter', refund: 'Marked payment refunded', customer: 'Saved customer', note: 'Added a note', noteDelete: 'Deleted a note' };
const short = t => { const s = String(t ?? ''); return s.length > 12 ? s.slice(0, 8) + '…' : s; };

async function loadActivity() {
  const btn = $('#activityBtn');
  btn.disabled = true;
  try {
    const { entries } = await store.admin('Activity');
    $('#activityList').replaceChildren(...(entries.length ? entries.map(e => h('li', {},
      h('span', { text: `${fmtTime(e.at)} · ${e.by || '?'} · ${WORDS[e.action] || e.action} · ${short(e.target)}` }),
      e.detail ? h('small', { class: 'ad-hint', text: String(e.detail) }) : null)) : [h('li', { text: 'Nothing yet.' })]));
    btn.textContent = 'Refresh';
  } catch { toast('Could not load the activity.'); }
  finally { btn.disabled = false; }
}

// Payment bot (card-transfer receipts): is Telegram sending its messages to us? Asked only when the tab is drawn on a server in manual mode.
let botSheet = null;
async function loadBot(line, btn) {
  line.textContent = 'Asking Telegram…';
  try {
    const r = await store.admin('BotInfo');
    const url = r.url || '', pending = r.pending ?? r.pending_update_count ?? 0, err = r.lastError ?? r.last_error_message ?? '';
    line.className = url && !err ? '' : 'ad-late';
    line.textContent = url
      ? `Connected to ${url}. Waiting messages: ${pending}.${err ? ' Last error: ' + err : ''}`
      : 'Not connected yet. Press Connect bot (after the bot settings are on the server).';
  } catch (e) { line.className = 'ad-late'; line.textContent = 'Could not ask Telegram (' + (e.code || e.reason || 'error') + ').'; }
  btn.disabled = false;
}
function renderBot() {
  if (!botSheet) {
    const line = h('p', { id: 'botLine' });
    const btn = h('button', { type: 'button', class: 'ad-btn ad-btn-main', id: 'botConnect', text: 'Connect bot' });
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await store.admin('BotConnect'); toast('Bot connected'); }
      catch (e) { toast('Failed: ' + (e.code || e.reason)); }
      await loadBot(line, btn);
    });
    botSheet = h('div', { class: 'ad-sheet', id: 'botSheet' }, h('h2', { text: 'Payment bot' }),
      h('p', { class: 'ad-hint', text: 'Receipts of card transfers arrive through the Telegram bot. Connect it once, and again after a new bot token.' }), line, h('div', { class: 'ad-actions' }, btn));
    $('#cleanupLine').closest('.ad-sheet').before(botSheet);
    botSheet.line = line; botSheet.btn = btn;
  }
  const manual = state.data.settings.provider === 'manual';
  botSheet.hidden = !manual;
  if (manual) loadBot(botSheet.line, botSheet.btn);
}

export function renderHealth() {
  renderBot();
  const { data, view } = state;
  const late = cleanupLate();
  $('#cleanupLine').className = late ? 'ad-late' : '';
  $('#cleanupLine').textContent = typeof data.lastCleanupAt === 'number'
    ? `Last nightly cleanup: ${fmtTime(data.lastCleanupAt)}${late ? '. That is more than 36 hours ago: check the Netlify function logs (cleanup).' : '.'}`
    : 'Last nightly cleanup: no record. The nightly job may not be running: check the Netlify function logs (cleanup).';
  const s = data.settings, today = dayOf(Date.now()), lim = data.limitsAll;
  $('#activitySheet').hidden = false;
  const ab = $('#activityBtn');
  if (!ab.dataset.bound) { ab.dataset.bound = '1'; ab.addEventListener('click', loadActivity); }
  const todayCount = lim?.day === today ? lim.count : view.letters.filter(l => dayOf(l.invite.createdAt || 0) === today).length;
  const meter = (title, value, of, text) => {
    const share = of ? Math.min(1, value / of) : 0;
    const fill = h('div', { class: 'm-fill' + (share >= 0.9 ? ' is-bad' : share >= 0.7 ? ' is-warn' : '') });
    fill.style.width = share * 100 + '%';
    return h('div', { class: 'ad-sheet ad-meter' }, h('h2', { text: title }), h('b', { text: of ? `${fmtNum(value)} of ${fmtNum(of)}` : fmtNum(value) }),
      h('div', { class: 'm-bar', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(of || 1), 'aria-valuenow': String(value), 'aria-label': title }, fill), h('p', { text }));
  };
  const reads = view.letters.length * 3 + view.payments.length + data.customers.length + (data.stats?.length || 0) + 1;
  $('#meters').replaceChildren(
    meter('Letters today, everybody', todayCount, s.maxTotalPerDay || 0, s.maxTotalPerDay ? 'New letters stop for the day at the limit (MAX_LETTERS_PER_DAY_TOTAL).' : 'No daily limit for everybody is set.'),
    meter('Letters stored', view.letters.length, 1500, 'The free database (1 GB) holds about 1,500 letters with photos.'),
    meter('Reads per Refresh here', reads, 50000, 'This panel reads the whole database, plus the saved daily numbers. Free plan: 50,000 reads a day for the whole site.'),
    meter('Locked letters', view.letters.filter(l => l.invite.locked).length, 0, 'Locked after 30 wrong codes. Unlock one from its letter page.')
  );
  const dl = [['Payments', s.provider === 'fake' ? 'Test payments (fake)' : s.provider], ['Price per letter', s.price > 0 ? money(s.price) : 'Free (0)'],
    ['Letters per person per day', s.maxPerDay || '—'], ['Letters per day, everybody', s.maxTotalPerDay || 'no limit'],
    ['Unpaid letters kept', s.unpaidKeepDays + ' days'], ['Sent letters kept', s.keepDays + ' days']];
  $('#settings').replaceChildren(...dl.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: String(v) })]));
}
