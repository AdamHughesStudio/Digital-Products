import { courseById, places } from './courses';
import type { Place } from './types';
import { addDays } from './events';
import { distanceMiles } from '@/lib/format';

export type Gender = 'men' | 'women' | 'mixed';
export type CompFormat = 'stableford' | 'stroke' | 'scramble' | 'greensomes' | 'fourball' | 'matchplay';
export type EntryType = 'individual' | 'pairs' | 'teams';

export const GENDERS: { id: Gender; label: string; short: string; icon: 'man' | 'woman' | 'male-female' }[] = [
  { id: 'men', label: 'Gents’', short: 'Gents', icon: 'man' },
  { id: 'women', label: 'Ladies’', short: 'Ladies', icon: 'woman' },
  { id: 'mixed', label: 'Mixed', short: 'Mixed', icon: 'male-female' },
];
export const FORMATS: { id: CompFormat; label: string }[] = [
  { id: 'stableford', label: 'Stableford' },
  { id: 'stroke', label: 'Stroke play' },
  { id: 'scramble', label: 'Texas scramble' },
  { id: 'greensomes', label: 'Greensomes' },
  { id: 'fourball', label: 'Four ball betterball' },
  { id: 'matchplay', label: 'Matchplay' },
];
export const ENTRIES: { id: EntryType; label: string }[] = [
  { id: 'individual', label: 'Individual' },
  { id: 'pairs', label: 'Pairs' },
  { id: 'teams', label: 'Teams of 4' },
];

export const genderById = (id: Gender) => GENDERS.find((g) => g.id === id)!;
export const formatLabel = (id: CompFormat) => FORMATS.find((f) => f.id === id)!.label;
export const entryLabel = (id: EntryType) => ENTRIES.find((e) => e.id === id)!.label;

export interface ClubEvent {
  id: string;
  courseId: string;
  gender: Gender;
  seniors?: boolean;
  format: CompFormat;
  holes: 9 | 18 | 36;
  entry: EntryType;
  /** Days from today that it is played */
  playedIn: number;
  /** First tee time, 24 hour clock */
  start: string;
  fee: number;
  placesLeft: number;
  /** Highest handicap allowed, if the club sets a limit */
  maxHandicap?: number;
}

/** "Gents’ open", "Ladies’ seniors open", "Texas scramble" */
export function eventTitle(e: ClubEvent) {
  const g = genderById(e.gender).label;
  if (e.format === 'scramble') return `${g} Texas scramble`;
  return `${g} ${e.seniors ? 'seniors’ open' : 'open'}`;
}

export function eventSummary(e: ClubEvent) {
  return [...(e.format === 'scramble' ? [] : [formatLabel(e.format)]), `${e.holes} holes`, entryLabel(e.entry)].join(' · ');
}

const ev = (
  id: number,
  courseId: string,
  gender: Gender,
  format: CompFormat,
  holes: 9 | 18 | 36,
  entry: EntryType,
  playedIn: number,
  start: string,
  fee: number,
  placesLeft: number,
  extra: Partial<ClubEvent> = {},
): ClubEvent => ({ id: `ce-${id}`, courseId, gender, format, holes, entry, playedIn, start, fee, placesLeft, ...extra });

/** Preview listings, dated relative to today. In the live app clubs would publish their own opens. */
export const CLUB_EVENTS: ClubEvent[] = [
  ev(1, 'haggs-castle', 'men', 'stableford', 18, 'individual', 5, '09:00', 15, 14, { maxHandicap: 28 }),
  ev(2, 'pollok', 'mixed', 'scramble', 18, 'teams', 8, '12:30', 20, 6),
  ev(3, 'cawder', 'women', 'stableford', 18, 'individual', 9, '10:00', 12, 18, { maxHandicap: 36 }),
  ev(4, 'cathkin-braes', 'mixed', 'fourball', 18, 'pairs', 12, '11:00', 24, 9),
  ev(5, 'east-renfrewshire', 'men', 'stableford', 18, 'individual', 14, '09:30', 18, 22, { seniors: true, maxHandicap: 28 }),
  ev(6, 'kilmacolm', 'men', 'stroke', 18, 'individual', 16, '08:30', 20, 11, { maxHandicap: 18 }),
  ev(7, 'buchanan-castle', 'mixed', 'scramble', 18, 'teams', 21, '13:00', 25, 12),
  ev(8, 'royal-troon', 'women', 'stableford', 18, 'individual', 23, '09:00', 30, 8, { maxHandicap: 36 }),
  ev(9, 'gullane', 'mixed', 'greensomes', 18, 'pairs', 26, '10:30', 40, 10),
  ev(10, 'haggs-castle', 'mixed', 'scramble', 9, 'teams', 3, '18:00', 10, 10),
  ev(11, 'pollok', 'men', 'stroke', 36, 'individual', 19, '07:30', 45, 16, { maxHandicap: 12 }),
  ev(12, 'cawder', 'men', 'matchplay', 18, 'individual', 27, '09:00', 10, 24),
  ev(13, 'cathkin-braes', 'women', 'scramble', 9, 'teams', 6, '18:30', 8, 14),
  ev(14, 'east-renfrewshire', 'women', 'greensomes', 18, 'pairs', 20, '10:00', 22, 12, { seniors: true }),
  ev(15, 'bruntsfield', 'men', 'stableford', 18, 'individual', 7, '09:00', 25, 20, { maxHandicap: 28 }),
  ev(16, 'braids', 'mixed', 'scramble', 9, 'teams', 4, '17:30', 6, 20),
  ev(17, 'royal-burgess', 'women', 'stroke', 18, 'individual', 15, '09:30', 28, 12, { maxHandicap: 24 }),
  ev(18, 'north-berwick', 'men', 'stableford', 18, 'individual', 24, '08:00', 50, 8, { maxHandicap: 24 }),
  ev(19, 'crail', 'mixed', 'fourball', 18, 'pairs', 11, '10:00', 30, 7),
  ev(20, 'lundin', 'men', 'stableford', 36, 'individual', 30, '08:00', 40, 12, { maxHandicap: 28 }),
  ev(21, 'belleisle', 'men', 'stableford', 18, 'individual', 6, '10:00', 8, 30),
  ev(22, 'prestwick', 'women', 'stableford', 18, 'individual', 22, '09:30', 45, 6, { maxHandicap: 36 }),
  ev(23, 'gleneagles', 'mixed', 'scramble', 18, 'teams', 33, '11:30', 60, 8),
  ev(24, 'royal-aberdeen', 'men', 'stroke', 36, 'individual', 29, '07:30', 55, 10, { maxHandicap: 8 }),
  ev(25, 'carnoustie', 'mixed', 'greensomes', 18, 'pairs', 18, '10:00', 50, 9),
];

export type DateWindow = 'any' | 'weekend' | 'week' | 'month';
export type Sort = 'soonest' | 'nearest' | 'cheapest';

export interface CompFilters {
  query: string;
  /** Where to search from: a named place, or undefined for the golfer's own location */
  place?: string;
  maxMiles: number;
  gender?: Gender;
  format?: CompFormat;
  /** 9, 18 or 36 (meaning 36 or more) */
  holes?: 9 | 18 | 36;
  entry?: EntryType;
  date: DateWindow;
  maxFee?: number;
  placesOnly: boolean;
  fitsHandicap: boolean;
  seniorsOnly: boolean;
  sort: Sort;
}

export const defaultCompFilters = (radius: number): CompFilters => ({
  query: '',
  maxMiles: radius,
  date: 'any',
  placesOnly: false,
  fitsHandicap: false,
  seniorsOnly: false,
  sort: 'soonest',
});

export interface CompResult {
  e: ClubEvent;
  miles: number;
}

export function searchClubEvents(f: CompFilters, home: Place, handicap: number): CompResult[] {
  const from = (f.place && places.find((p) => p.name === f.place)) || home;
  const q = f.query.trim().toLowerCase();
  const out: CompResult[] = [];
  for (const e of CLUB_EVENTS) {
    const c = courseById(e.courseId);
    if (!c) continue;
    const miles = distanceMiles(c, from);
    if (miles > f.maxMiles) continue;
    if (f.gender && e.gender !== f.gender) continue;
    if (f.format && e.format !== f.format) continue;
    if (f.holes === 36 ? e.holes < 36 : f.holes && e.holes !== f.holes) continue;
    if (f.entry && e.entry !== f.entry) continue;
    if (f.maxFee !== undefined && e.fee > f.maxFee) continue;
    if (f.placesOnly && e.placesLeft < 1) continue;
    if (f.seniorsOnly && !e.seniors) continue;
    if (f.fitsHandicap && e.maxHandicap !== undefined && handicap > e.maxHandicap) continue;
    if (f.date !== 'any') {
      const day = addDays(e.playedIn).getDay();
      if (f.date === 'weekend' && !(day === 0 || day === 6)) continue;
      if (f.date === 'week' && e.playedIn > 7) continue;
      if (f.date === 'month' && e.playedIn > 30) continue;
    }
    if (q) {
      const hay = [c.name, c.town, c.region, eventTitle(e), eventSummary(e)].join(' ').toLowerCase();
      if (!q.split(/\s+/).every((w) => hay.includes(w))) continue;
    }
    out.push({ e, miles });
  }
  return out.sort((a, b) => (f.sort === 'nearest' ? a.miles - b.miles : f.sort === 'cheapest' ? a.e.fee - b.e.fee : a.e.playedIn - b.e.playedIn));
}

/** Club events near a place, soonest first (used for the Discover carousel) */
export function clubEventsNear(place: Place, radiusMiles: number) {
  return searchClubEvents({ ...defaultCompFilters(radiusMiles) }, place, 0);
}
