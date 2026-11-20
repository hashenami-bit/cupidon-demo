// Customers tab (CRM): the table, the groups, and the customer drawer (status, notes, timeline).
// Everything typed by people (names, tags, notes) goes in through textContent / h() only.
import * as store from '../store.js';
import { $, h, DAY, fmtDate, fmtTime, ago, money, toast, twoTap, openDrawer, stillOpen, block, facts, chip, rowOpen } from './ui.js';
import { state, actions, build, filters, chips, lettersName, STAGE_LABEL, STAGE_TONE } from './data.js';
import { sortRows, sortable, toCsv, download } from './table.js';
import { STAGES, MAX_LOG_TEXT, MAX_NOTE, tashkentDay } from '../shared/stats.js';

// The groups above the table, computed here in the browser. [key, label, test].
const QUIET_MS = 30 * DAY;
const GROUPS = [
  ['all', 'All', () => true],
  ['followup', 'Follow-up due', c => c.due],
  ['reply', 'Needs reply', c => c.stage === 'reply'],
  ['noLetter', 'Never wrote', c => !c.letters.length],
  ['paying', 'Paid', c => c.paid > 0],
  ['unpaid', 'Did not pay', c => c.letters.some(l => l.invite.status === 'unpaid')],
  ['waitingHer', 'Waiting for her', c => c.letters.some(l => l.state.key === 'notOpened')],
  ['answered', 'Got an answer', c => c.letters.some(l => l.meta?.answer)],
  ['repeat', 'Repeat sender', c => c.letters.length >= 2],
  ['free', 'Has free letters', c => c.free > 0],
  ['quiet', 'Quiet 30 days', c => { const t = c.account.lastSignIn || c.account.createdAt; return !!t && Date.now() - t > QUIET_MS; }]
];
const inGroup = (c, f) => (f.startsWith('tag:') ? c.tags.includes(f.slice(4)) : (GROUPS.find(g => g[0] === f) || GROUPS[0])[2](c));

// Column heads → the value to sort by.
const SORT = {
  customer: c => c.account.email || c.uid, joined: c => c.account.createdAt, seen: c => c.account.lastSignIn,
  letters: c => c.letters.length, paid: c => c.paid, stage: c => STAGE_LABEL[c.stage] || '', follow: c => c.followUp
};
const sort = sortable($('#custTable'), () => renderCustomers());
let shown = [];   // the rows on screen = what "Export CSV" saves
const iso = ms => (ms ? new Date(ms).toISOString() : '');
const stageChip = s => (s ? chip({ label: STAGE_LABEL[s] || s, tone: STAGE_TONE[s] || '' }) : null);
const followText = c => (c.followUp ? fmtDate(Date.parse(c.followUp + 'T00:00:00Z')) : '');

export function renderCustomers() {
  const { view } = state;
  const q = $('#custSearch').value.trim().toLowerCase();
  const tagCount = new Map();
  for (const c of view.customers) for (const t of c.tags) tagCount.set(t, (tagCount.get(t) || 0) + 1);
  const f = filters.cust;
  // A group with nobody in it is hidden, unless it is the one chosen right now (it would vanish under the finger).
  const opts = [];
  for (const [key, label, test] of GROUPS) {
    const n = view.customers.filter(test).length;
    if (key === 'all' || n || f === key) opts.push([key, label, n]);
  }
  for (const [t, n] of [...tagCount].sort((a, b) => b[1] - a[1])) opts.push(['tag:' + t, '#' + t, n]);
  if (f.startsWith('tag:') && !tagCount.has(f.slice(4))) opts.push([f, '#' + f.slice(4), 0]);
  chips($('#custFilters'), 'cust', opts);

  const rows = view.customers.filter(c => inGroup(c, f) && (!q || c.search.includes(q)));
  shown = sort.key ? sortRows(rows, SORT[sort.key], sort.dir) : rows;
  $('#custCsv').disabled = !shown.length;
  $('#custTable tbody').replaceChildren(...shown.map(c => rowOpen(h('tr', {},
    h('td', {}, h('button', { type: 'button', class: 'ad-row-btn', onclick: () => actions.open.customer(c.uid), text: c.account.email || c.uid.slice(0, 10) }), c.account.name ? h('span', { class: 't-sub', text: c.account.name }) : null),
    h('td', { class: 't-num', text: fmtDate(c.account.createdAt) }),
    h('td', { class: 't-num', text: ago(c.account.lastSignIn) }),
    h('td', { class: 't-num' }, String(c.letters.length), c.letters.length ? h('span', { class: 't-sub', text: `${c.letters.filter(l => l.meta?.answer).length} answered` }) : null, c.free ? h('span', { class: 't-sub', text: `${c.free} free left` }) : null),
    h('td', { class: 't-num', text: c.paid ? money(c.paid) : '—' }),
    h('td', {}, stageChip(c.stage)),
    h('td', { class: 't-num' }, followText(c), c.due ? h('span', { class: 'st st-bad crm-due', text: 'due' }) : null),
    h('td', {}, ...c.tags.map(t => h('span', { class: 'tag', text: t })), c.note ? h('span', { class: 't-sub', text: c.note.length > 70 ? c.note.slice(0, 70) + '…' : c.note }) : null)
  ), () => actions.open.customer(c.uid))));
  $('#custEmpty').hidden = shown.length > 0;
}
$('#custSearch').addEventListener('input', () => state.view && renderCustomers());
$('#custCsv').addEventListener('click', () => download(`maktubim-customers-${tashkentDay(Date.now())}.csv`, toCsv(shown, [
  { title: 'Email', value: c => c.account.email }, { title: 'Name', value: c => c.account.name }, { title: 'Uid', value: c => c.uid },
  { title: 'Joined', value: c => iso(c.account.createdAt) }, { title: 'Last sign-in', value: c => iso(c.account.lastSignIn) },
  { title: 'Letters', value: c => c.letters.length }, { title: 'Answered', value: c => c.letters.filter(l => l.meta?.answer).length },
  { title: 'Paid', value: c => c.paid }, { title: 'Stage', value: c => STAGE_LABEL[c.stage] || '' }, { title: 'Follow-up', value: c => c.followUp },
  { title: 'Tags', value: c => c.tags.join(' ') }, { title: 'Pinned note', value: c => c.note },
  { title: 'Free letters', value: c => c.free }
])));

// One list by time, newest first: joined, terms, letters, payments, notes. Events without a time are skipped.
function timelineOf(c) {
  const { view } = state;
  const ev = [];
  const add = (at, text, open) => { if (typeof at === 'number' && at > 0) ev.push({ at, text, open }); };
  add(c.account.createdAt, 'Joined');
  add(c.terms?.at, `Accepted the Terms (version ${c.terms?.version})`);
  for (const l of c.letters) {
    const open = () => actions.open.letter(l.id), name = lettersName(l);
    add(l.invite.createdAt, `Sealed a letter: ${name}`, open);
    add(l.invite.openedAt, `Opened: ${name}`, open);
    add(l.meta?.answeredAt, `Answered: ${name}`, open);
  }
  for (const p of view.payments.filter(x => x.ownerUid === c.uid)) {
    const open = () => actions.open.payment(p.tx);
    if (p.status === 'succeeded') add(p.paidAt, `Paid ${money(p.amount)}`, open);
    add(p.refundedAt, `Refunded ${money(p.amount)}`, open);
  }
  for (const n of c.log) add(n.at, 'Note: ' + (n.text.length > 80 ? n.text.slice(0, 80) + '…' : n.text.replace(/\s+/g, ' ')));
  return ev.sort((a, b) => b.at - a.at);
}

export function openCustomer(uid, draft = null) {
  const { view } = state;
  const c = view.byUid.get(uid);
  if (!c) return;
  // The server answers every change with the whole saved record: put it into the loaded data and redraw from that.
  // (A reload would read the whole database again, and another warm server copy could answer with a 30-second-old
  // overview, hiding the note that was just added.) keepForm = the Save form's unsaved typing survives the redraw.
  const redraw = (msg, keepForm) => {
    // An unsent history note always survives the redraw; the Save form's typing only when that form was not just saved.
    const typed = { ...(keepForm && { stage: stage.value, follow: follow.value, tags: tags.value, note: note.value }), addNote: text.value };
    build(); actions.renderAll();
    toast(msg);
    if (stillOpen('customer:' + uid)) openCustomer(uid, typed);
  };
  const applied = (rec, msg, keepForm) => {
    const row = state.data.customers.find(x => x.uid === uid);
    if (row) row.crm = rec; else state.data.customers.push({ uid, terms: null, freeLetters: 0, crm: rec });
    redraw(msg, keepForm);
  };
  // Free letters: the server answers with the new count; put it in the loaded data and redraw (like a note).
  let giving = false;   // "add" is a change, not a total: a double click must not give twice
  const give = async add => {
    if (giving) return;
    giving = true;
    for (const b of document.querySelectorAll('.crm-free button')) b.disabled = true;
    try {
      const r = await store.admin('GiveFree', { uid, add });
      const row = state.data.customers.find(x => x.uid === uid);
      if (row) row.freeLetters = r.freeLetters; else state.data.customers.push({ uid, terms: null, freeLetters: r.freeLetters, crm: null });
      redraw(add > 0 ? 'Free letters added' : 'Free letters taken back', true);
    } catch (err) {
      toast('Failed: ' + (err.code || err.reason));
      giving = false;
      for (const b of document.querySelectorAll('.crm-free button')) b.disabled = false;
    }
  };

  // ---- status, tags, pinned note: one Save ----
  const stage = h('select', { class: 'ad-input', id: 'crmStage' }, ...STAGES.map(s => h('option', { value: s, text: STAGE_LABEL[s] || 'No status' })));
  stage.value = c.stage;
  const follow = h('input', { class: 'ad-input', id: 'crmFollow', type: 'date', value: c.followUp });
  const clear = h('button', { type: 'button', class: 'ad-btn ad-btn-quiet', text: 'Clear', 'aria-label': 'Clear the follow-up date', onclick: () => { follow.value = ''; follow.focus(); } });
  const tags = h('input', { class: 'ad-input', id: 'crmTags', value: c.tags.join(', '), placeholder: 'vip, support, friend', autocomplete: 'off' });
  const note = h('textarea', { class: 'ad-input', id: 'crmNote', maxlength: String(MAX_NOTE), placeholder: 'What you know about this customer: questions, complaints, promises.' });
  note.value = c.note;
  if (draft?.stage !== undefined) { stage.value = draft.stage; follow.value = draft.follow; tags.value = draft.tags; note.value = draft.note; }
  const save = h('button', { type: 'submit', class: 'ad-btn ad-btn-main', text: 'Save' });
  const form = h('form', { class: 'ad-form', onsubmit: async e => {
    e.preventDefault();
    save.disabled = true;
    try {
      applied(await store.admin('SaveCustomer', { uid, note: note.value, tags: tags.value.split(','), stage: stage.value, followUp: follow.value }), 'Note saved', false);
    } catch (err) { toast('Save failed: ' + (err.code || err.reason)); save.disabled = false; }
  } },
  h('label', { for: 'crmStage', text: 'Status' }), stage,
  h('label', { for: 'crmFollow', text: 'Follow-up date' }), h('div', { class: 'crm-row' }, follow, clear),
  h('label', { for: 'crmTags', text: 'Tags (comma between them)' }), tags,
  h('label', { for: 'crmNote', text: 'Pinned note' }), note,
  c.noteAt ? h('p', { class: 'ad-hint', text: 'Last saved ' + fmtTime(c.noteAt) }) : null,
  h('div', { class: 'ad-actions' }, save));

  // ---- note history ----
  const text = h('textarea', { class: 'ad-input', id: 'crmAddNote', maxlength: String(MAX_LOG_TEXT), placeholder: 'What happened or what you promised. It stays in the history with the date.' });
  // A plain button (not a second submit button) so the Save form above stays the drawer's only submit.
  const add = h('button', { type: 'button', class: 'ad-btn', text: 'Add note', onclick: async () => {
    if (!text.value.trim()) { toast('Write something first'); text.focus(); return; }
    add.disabled = true;
    try { const rec = await store.admin('AddNote', { uid, text: text.value }); text.value = ''; applied(rec, 'Note added', true); }   // sent: not kept in the box
    catch (err) {
      toast(err.reason === 'notes-full' ? 'The note history is full. Delete an old note first.' : 'Could not add: ' + (err.code || err.reason));
      add.disabled = false;
    }
  } });
  if (draft?.addNote) text.value = draft.addNote;
  const addForm = h('div', { class: 'ad-form' }, h('label', { for: 'crmAddNote', text: 'Add a note' }), text, h('div', { class: 'ad-actions' }, add));
  const history = c.log.length
    ? h('ul', { class: 'crm-notes', 'aria-label': 'Note history, newest first' }, ...[...c.log].reverse().map(n => h('li', {},
      h('div', { class: 'crm-note-head' }, h('span', { class: 't-sub', text: `${fmtTime(n.at)} · ${n.by || 'admin'}` }),
        twoTap(h('button', { type: 'button', class: 'ad-btn ad-btn-quiet crm-del', 'aria-label': 'Delete this note' }), 'Delete', 'Press again to delete', async () => {
          try { applied(await store.admin('DeleteNote', { uid, id: n.id }), 'Note deleted', true); }
          catch (err) { toast('Delete failed: ' + (err.code || err.reason)); }
        })),
      h('p', { class: 'crm-note-text', text: n.text }))))
    : h('p', { class: 'ad-hint', text: 'No notes yet.' });

  // ---- timeline ----
  const events = timelineOf(c);
  const timeline = events.length
    ? h('ol', { class: 'crm-timeline' }, ...events.slice(0, 100).map(e => h('li', {},
      h('time', { class: 't-sub', text: fmtTime(e.at) }),
      e.open ? h('button', { type: 'button', onclick: e.open, text: e.text }) : h('span', { text: e.text }))),
    events.length > 100 ? h('li', { class: 'ad-hint', text: `Showing the newest 100 of ${events.length}.` }) : null)
    : h('p', { class: 'ad-hint', text: 'Nothing with a date yet.' });

  const a = c.account;
  openDrawer('customer:' + uid, a.email || 'Customer',
    block('Account', facts([
      ['Name', a.name], ['Email', a.email], ['Joined', fmtTime(a.createdAt)], ['Last sign-in', fmtTime(a.lastSignIn)],
      ['Terms accepted', c.terms?.at ? `${fmtDate(c.terms.at)} (version ${c.terms.version})` : (c.terms?.version ? `version ${c.terms.version}` : 'Not yet')],
      ['Paid', c.paid ? money(c.paid) : '—'], ['Blocked', a.disabled ? 'Yes (in Firebase)' : null], ['Uid', h('span', { class: 't-sub', text: uid })]
    ]), a.email ? h('div', { class: 'ad-actions crm-copy' }, h('button', { type: 'button', class: 'ad-btn ad-btn-quiet', text: 'Copy email', onclick: () => {
      navigator.clipboard?.writeText(a.email).then(() => toast('Email copied'), () => toast('Could not copy'));
    } })) : null),
    block('Free letters', h('p', { class: 'ad-hint', id: 'freeCount', text: c.free ? `${c.free} free letter${c.free === 1 ? '' : 's'} left. He sends them without paying.` : 'None. Each free letter lets him send one letter without paying.' }),
      h('div', { class: 'ad-actions crm-free' },
        h('button', { type: 'button', class: 'ad-btn', text: '+1', 'aria-label': 'Give 1 free letter', onclick: () => give(1) }),
        h('button', { type: 'button', class: 'ad-btn', text: '+3', 'aria-label': 'Give 3 free letters', onclick: () => give(3) }),
        h('button', { type: 'button', class: 'ad-btn ad-btn-quiet', text: '−1', 'aria-label': 'Take back 1 free letter', disabled: c.free < 1, onclick: () => give(-1) }),
        c.free ? twoTap(h('button', { type: 'button', class: 'ad-btn ad-btn-quiet crm-del' }), 'Take all back', 'Press again to take all back', () => give(-c.free)) : null)),
    block('Status, tags and pinned note', form),
    block(`Notes (${c.log.length})`, addForm, history),
    block('Timeline', timeline),
    block(`Letters (${c.letters.length})`, c.letters.length ? h('ul', { class: 'ad-mini' }, ...c.letters.map(l => h('li', {}, h('button', { type: 'button', onclick: () => actions.open.letter(l.id), text: `${lettersName(l)} · ${fmtDate(l.invite.createdAt)}` }), chip(l.state)))) : h('p', { class: 'ad-hint', text: 'No letters in the database (never wrote one, or they were deleted after their time).' }))
  );
}
