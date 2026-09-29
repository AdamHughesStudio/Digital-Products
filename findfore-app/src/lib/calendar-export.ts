import { Platform } from 'react-native';

import type { CalendarItem } from './calendar';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

/** Local date and time, with no time zone so it lands at the same clock time wherever the phone is */
function stamp(d: Date, time: string, addMinutes = 0) {
  const [h, m] = time.split(':').map(Number);
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m + addMinutes);
  return `${ymd(x)}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
}

const nextDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function utcNow() {
  const n = new Date();
  return `${n.getUTCFullYear()}${pad(n.getUTCMonth() + 1)}${pad(n.getUTCDate())}T${pad(n.getUTCHours())}${pad(n.getUTCMinutes())}${pad(n.getUTCSeconds())}Z`;
}

/** An .ics file with every item. iPhone offers to add it straight to Calendar, and Google can import it. */
export function buildIcs(items: CalendarItem[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FindFore//Calendar//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:FindFore'];
  for (const it of items) {
    lines.push('BEGIN:VEVENT', `UID:${it.id}@findfore.app`, `DTSTAMP:${utcNow()}`, `SUMMARY:${esc(it.title)}`, `DESCRIPTION:${esc(it.subtitle)}`);
    if (it.location) lines.push(`LOCATION:${esc(it.location)}`);
    if (it.time) {
      lines.push(`DTSTART:${stamp(it.date, it.time)}`, `DTEND:${stamp(it.date, it.time, it.minutes ?? 240)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(it.title)}`, 'TRIGGER:-P1D', 'END:VALARM');
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ymd(it.date)}`, `DTEND;VALUE=DATE:${ymd(nextDay(it.date))}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(it.title)}`, 'TRIGGER:PT9H', 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Link that opens Google Calendar with this one item filled in, ready to save */
export function googleLink(it: CalendarItem) {
  const dates = it.time ? `${stamp(it.date, it.time)}/${stamp(it.date, it.time, it.minutes ?? 240)}` : `${ymd(it.date)}/${ymd(nextDay(it.date))}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: it.title, dates, details: `${it.subtitle}\n\nAdded from FindFore` });
  if (it.location) q.set('location', it.location);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Saves the .ics file (web only). Returns false where downloads aren't available. */
export function downloadIcs(items: CalendarItem[]) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  const blob = new Blob([buildIcs(items)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'findfore.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
