import { CLUB_EVENTS, eventSummary, eventTitle, type ClubEvent } from '@/data/club-events';
import { courseById } from '@/data/courses';
import { addDays, associationById, EVENTS, type AmateurEvent } from '@/data/events';
import { isPast, ME, myGames } from '@/data/store';
import type { AppState } from '@/data/types';
import { formatTime, isoDate, startOfDay } from '@/lib/format';

function courseLocation(id: string) {
  const c = courseById(id);
  return c ? `${c.name}, ${c.town}` : undefined;
}

export type CalendarKind = 'game' | 'requested' | 'competition' | 'entry';

export interface CalendarItem {
  id: string;
  kind: CalendarKind;
  date: Date;
  /** Time of day, when there is one */
  time?: string;
  title: string;
  subtitle: string;
  href?: string;
  past?: boolean;
  location?: string;
  /** How long it runs, for calendar entries with a time */
  minutes?: number;
}

/** Everything on my calendar: games I'm in or hosting, requests waiting, and saved competitions */
export function buildCalendar(s: AppState, saved: string[]): CalendarItem[] {
  const items: CalendarItem[] = [];

  for (const g of myGames(s)) {
    const d = new Date(g.teeTime);
    items.push({
      id: `game-${g.id}`,
      kind: 'game',
      date: startOfDay(d),
      time: formatTime(d),
      title: courseById(g.courseId)?.name ?? 'Game',
      subtitle: g.hostId === ME ? 'You’re hosting' : 'You’re playing',
      href: `/game/${g.id}`,
      past: isPast(g),
      location: courseLocation(g.courseId),
      minutes: 270,
    });
  }

  for (const r of Object.values(s.requests)) {
    if (r.golferId !== ME || r.kind !== 'request' || r.status !== 'pending') continue;
    const g = s.games[r.gameId];
    if (!g || g.cancelled || isPast(g)) continue;
    const d = new Date(g.teeTime);
    items.push({ id: `req-${r.id}`, kind: 'requested', date: startOfDay(d), time: formatTime(d), title: courseById(g.courseId)?.name ?? 'Game', subtitle: 'Requested, waiting for the host', href: `/game/${g.id}`, location: courseLocation(g.courseId), minutes: 270 });
  }

  for (const e of CLUB_EVENTS) {
    if (saved.includes(e.id)) items.push(clubEventItem(e));
  }

  for (const e of EVENTS) {
    if (saved.includes(e.id)) items.push(...nationalEventItems(e));
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime() || (a.time ?? '').localeCompare(b.time ?? ''));
}

/** A club competition as a calendar entry */
export function clubEventItem(e: ClubEvent): CalendarItem {
  return {
    id: `comp-${e.id}`,
    kind: 'competition',
    date: addDays(e.playedIn),
    time: e.start,
    title: `${eventTitle(e)} at ${courseById(e.courseId)?.name ?? 'the club'}`,
    subtitle: `Saved · ${eventSummary(e)}`,
    href: '/competitions',
    location: courseLocation(e.courseId),
    minutes: e.holes === 9 ? 150 : e.holes === 36 ? 540 : 300,
  };
}

/** A national event: the day entry opens (if still to come) and the event itself */
export function nationalEventItems(e: AmateurEvent): CalendarItem[] {
  const assoc = associationById(e.association);
  const out: CalendarItem[] = [];
  if (e.opensIn > 0) out.push({ id: `open-${e.id}`, kind: 'entry', date: addDays(e.opensIn), title: `Entry opens: ${e.title}`, subtitle: assoc.name, href: `/competitions?country=${e.association}&show=national` });
  out.push({ id: `nat-${e.id}`, kind: 'competition', date: addDays(e.playedIn), title: e.title, subtitle: `Saved · ${assoc.short} · ${e.venue}`, location: e.venue, href: `/competitions?country=${e.association}&show=national` });
  return out;
}

export const dayKey = (d: Date) => isoDate(d);
