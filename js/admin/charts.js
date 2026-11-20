// Plain SVG charts (the page CSP allows no outside scripts) and the small labelled bars of the split card.
import { h, svg, fmtNum } from './ui.js';
import { shiftDay } from '../shared/stats.js';

export const fmtDay = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const MAX_DAY_BARS = 45;   // more days than this are added up per week, or the bars get too thin to read

// Monday of the week a "YYYY-MM-DD" day belongs to (weeks start on Monday).
const weekStart = day => shiftDay(day, -((new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7));

// Days (oldest first) + one array of numbers per series → the same shape, but per week when there are many days.
export function bucketize(days, series) {
  if (days.length <= MAX_DAY_BARS) return { days, series, unit: 'day' };
  const starts = [], index = new Map();
  days.forEach(d => { const w = weekStart(d); if (!index.has(w)) { index.set(w, starts.length); starts.push(w); } });
  const sums = series.map(vals => {
    const out = Array(starts.length).fill(0);
    vals.forEach((v, i) => { out[index.get(weekStart(days[i]))] += v; });
    return out;
  });
  return { days: starts, series: sums, unit: 'week' };
}

// One or two bar series, side by side per day (or week). `days` = the start day of every bar.
// Bars are only a picture: the aria-label carries the totals and every bar has a <title> tooltip.
export function barChart(box, days, series, names, fmt, { unit = 'day', span = '' } = {}) {
  const W = 600, H = 180, pad = { l: 38, r: 6, t: 10, b: 22 };
  const max = Math.max(1, ...series.flat());
  const totals = series.map(vals => vals.reduce((a, b) => a + b, 0));
  const what = names.map((n, i) => `${n} ${fmt(totals[i])}`).join(', ');
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${names.join(' and ')} per ${unit}${span ? ', ' + span : ''}. Total: ${what}. Highest ${unit}: ${fmt(max)}.` });
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b, slot = iw / days.length, bw = Math.max(1.5, (slot - (slot > 8 ? 3 : 1)) / series.length);
  for (const v of [0, max]) {
    const y = pad.t + ih - (v / max) * ih;
    s.append(svg('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, class: 'c-axis' }));
    const t = svg('text', { x: pad.l - 6, y: y + 4, 'text-anchor': 'end' }); t.textContent = fmt(v); s.append(t);
  }
  series.forEach((vals, si) => vals.forEach((v, i) => {
    if (!v) return;
    const bh = (v / max) * ih;
    const r = svg('rect', { x: pad.l + i * slot + (slot - bw * series.length) / 2 + si * bw, y: pad.t + ih - bh, width: bw, height: bh, rx: Math.min(1.5, bw / 2), class: si ? 'c-bar c-bar-2' : 'c-bar' });
    const tip = svg('title'); tip.textContent = `${unit === 'week' ? 'Week of ' : ''}${fmtDay(days[i])}: ${fmt(v)} ${names[si]}`; r.append(tip);
    s.append(r);
  }));
  if (!totals.some(Boolean)) {
    const t = svg('text', { x: pad.l + iw / 2, y: pad.t + ih / 2, 'text-anchor': 'middle', class: 'c-empty' }); t.textContent = 'Nothing in this period'; s.append(t);
  }
  const last = days.length - 1;
  for (const i of new Set([0, Math.floor(last / 2), last])) {
    const t = svg('text', { x: pad.l + i * slot + slot / 2, y: H - 6, 'text-anchor': i === 0 && last ? 'start' : i === last && last ? 'end' : 'middle' });
    t.textContent = fmtDay(days[i]);
    s.append(t);
  }
  const legend = series.length > 1 ? h('div', { class: 'ad-legend' }, ...names.map((n, i) => h('span', {}, h('i', { class: i ? 's2' : '' }), n))) : null;
  box.replaceChildren(s, legend || '');
}

// Labelled horizontal bars: rows = [[label, count]]. Each row says its count and share in words, so colour is never the only signal.
export function hBars(box, title, rows) {
  const total = rows.reduce((a, [, n]) => a + n, 0);
  const list = h('ul', { class: 'ad-hbars', 'aria-label': title }, ...rows.map(([label, n]) => {
    const fill = h('i', {});
    const share = total ? (n / total) * 100 : 0;
    requestAnimationFrame(() => { fill.style.width = share + '%'; });
    return h('li', {}, h('span', { class: 'hb-name', text: label }), h('div', { class: 'hb-bar', 'aria-hidden': 'true' }, fill),
      h('span', { class: 'hb-num' }, fmtNum(n), h('small', { text: total ? Math.round(share) + '%' : '—' })));
  }));
  box.replaceChildren(h('h3', { class: 'hb-title', text: title }), list);
}
