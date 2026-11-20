// Sorting and CSV export for the admin tables.

// Sort rows by a value: numbers as numbers, text with localeCompare, empty values always last.
export function sortRows(rows, getter, dir = 'asc') {
  const sign = dir === 'desc' ? -1 : 1;
  const empty = v => v == null || v === '' || (typeof v === 'number' && Number.isNaN(v));
  return [...rows].sort((a, b) => {
    const x = getter(a), y = getter(b);
    if (empty(x) && empty(y)) return 0;
    if (empty(x)) return 1;
    if (empty(y)) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
    return String(x).localeCompare(String(y), 'en', { numeric: true, sensitivity: 'base' }) * sign;
  });
}

// Turns every <th data-sort="key"> of the table into a sort button. Press = sort by it, press again = flip.
// Calls onSort({ key, dir }) after each press; returns the live { key, dir } ('' key = not sorted yet).
// Safe to call again after the header was rebuilt.
export function sortable(table, onSort, start = {}) {
  const cur = { key: start.key || '', dir: start.dir || 'asc' };
  const ths = [...table.querySelectorAll('thead th[data-sort]')];
  const paint = () => {
    for (const th of ths) {
      th.setAttribute('aria-sort', th.dataset.sort === cur.key ? (cur.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    }
  };
  for (const th of ths) {
    if (th.querySelector('button')) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ad-sort';
    btn.textContent = th.textContent;
    btn.addEventListener('click', () => {
      // A new column starts ascending (data-first="desc" for dates and numbers, where the biggest is wanted first).
      cur.dir = cur.key === th.dataset.sort ? (cur.dir === 'asc' ? 'desc' : 'asc') : (th.dataset.first === 'desc' ? 'desc' : 'asc');
      cur.key = th.dataset.sort;
      paint();
      onSort?.({ key: cur.key, dir: cur.dir });
    });
    th.replaceChildren(btn);
  }
  paint();
  return cur;
}

// CSV text: columns = [{ title, value: row => … }]. Quoted as RFC 4180, \r\n lines, a BOM so Excel reads Cyrillic/Uzbek.
// A cell that starts with = + - @ tab or CR gets a ' in front, so a spreadsheet never runs it as a formula.
export function toCsv(rows, columns) {
  const cell = v => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [columns.map(c => cell(c.title)).join(','), ...rows.map(r => columns.map(c => cell(c.value(r))).join(','))];
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// Hands a text to the browser as a file.
export function download(filename, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
