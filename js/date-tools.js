// Her final screen: countdown maths and "add to calendar" (an .ics file made on her phone, or a Google Calendar link).
// Times are "floating" local times (no time zone): the date means the same wall-clock time on her phone.
import { pad } from './common.js';

export const HOURS = 2;   // how long the date is in her calendar

// '2026-10-24' + '19:30' → a local Date
export function startOf(iso, time) {
  const [y, m, d] = iso.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi);
}

// milliseconds left → { days, hours, minutes, seconds }
export function countdownParts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor(s / 3600) % 24, minutes: Math.floor(s / 60) % 60, seconds: s % 60 };
}

const stamp = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);

// Calendar lines may be at most 75 bytes; longer ones go on the next line after a space (Cyrillic letters are 2 bytes).
function fold(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

// ev = { title, start: Date, place, details, uid }
export function icsFile(ev, now = new Date()) {
  const end = new Date(ev.start.getTime() + HOURS * 3600e3);
  const utc = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maktubim//Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${ev.uid}@maktubim.uz`, `DTSTAMP:${utc}`, `DTSTART:${stamp(ev.start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(ev.title)}`, ev.place ? `LOCATION:${esc(ev.place)}` : '', ev.details ? `DESCRIPTION:${esc(ev.details)}` : '',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(ev.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).map(fold).join('\r\n') + '\r\n';
}

export function googleCalUrl(ev) {
  const end = new Date(ev.start.getTime() + HOURS * 3600e3);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates: `${stamp(ev.start)}/${stamp(end)}` });
  if (ev.details) q.set('details', ev.details);
  if (ev.place) q.set('location', ev.place);
  return 'https://calendar.google.com/calendar/render?' + q;
}
