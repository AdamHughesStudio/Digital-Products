import { courseById } from './courses';
import type { Place } from './types';
import { distanceMiles } from '@/lib/format';

export type ClubEventKind = 'gents' | 'ladies' | 'mixed' | 'scramble' | 'seniors';

export const CLUB_EVENT_KINDS: { id: ClubEventKind; label: string; short: string; icon: 'man' | 'woman' | 'male-female' | 'people' | 'ribbon' }[] = [
  { id: 'gents', label: 'Gents’ open', short: 'Gents', icon: 'man' },
  { id: 'ladies', label: 'Ladies’ open', short: 'Ladies', icon: 'woman' },
  { id: 'mixed', label: 'Mixed open', short: 'Mixed', icon: 'male-female' },
  { id: 'scramble', label: 'Texas scramble', short: 'Scramble', icon: 'people' },
  { id: 'seniors', label: 'Seniors’ open', short: 'Seniors', icon: 'ribbon' },
];

export const kindById = (id: ClubEventKind) => CLUB_EVENT_KINDS.find((k) => k.id === id)!;

export interface ClubEvent {
  id: string;
  courseId: string;
  kind: ClubEventKind;
  /** Individual, pairs or teams */
  entry: string;
  /** Days from today that it is played */
  playedIn: number;
  /** First tee time, 24 hour clock */
  start: string;
  fee: number;
  placesLeft: number;
}

/** Preview listings, dated relative to today. In the live app clubs would publish their own opens. */
export const CLUB_EVENTS: ClubEvent[] = [
  { id: 'ce-1', courseId: 'haggs-castle', kind: 'gents', entry: 'Individual', playedIn: 5, start: '09:00', fee: 15, placesLeft: 14 },
  { id: 'ce-2', courseId: 'pollok', kind: 'scramble', entry: 'Teams of 4', playedIn: 8, start: '12:30', fee: 20, placesLeft: 6 },
  { id: 'ce-3', courseId: 'cawder', kind: 'ladies', entry: 'Individual', playedIn: 9, start: '10:00', fee: 12, placesLeft: 18 },
  { id: 'ce-4', courseId: 'cathkin-braes', kind: 'mixed', entry: 'Pairs', playedIn: 12, start: '11:00', fee: 24, placesLeft: 9 },
  { id: 'ce-5', courseId: 'east-renfrewshire', kind: 'seniors', entry: 'Individual', playedIn: 14, start: '09:30', fee: 18, placesLeft: 22 },
  { id: 'ce-6', courseId: 'kilmacolm', kind: 'gents', entry: 'Individual', playedIn: 16, start: '08:30', fee: 20, placesLeft: 11 },
  { id: 'ce-7', courseId: 'buchanan-castle', kind: 'scramble', entry: 'Teams of 4', playedIn: 21, start: '13:00', fee: 25, placesLeft: 12 },
  { id: 'ce-8', courseId: 'royal-troon', kind: 'ladies', entry: 'Individual', playedIn: 23, start: '09:00', fee: 30, placesLeft: 8 },
  { id: 'ce-9', courseId: 'gullane', kind: 'mixed', entry: 'Pairs', playedIn: 26, start: '10:30', fee: 40, placesLeft: 10 },
];

/** Club events near a place, soonest first */
export function clubEventsNear(place: Place, radiusMiles: number, kind?: ClubEventKind) {
  return CLUB_EVENTS.filter((e) => !kind || e.kind === kind)
    .map((e) => ({ e, miles: courseById(e.courseId) ? distanceMiles(courseById(e.courseId)!, place) : Infinity }))
    .filter((x) => x.miles <= radiusMiles)
    .sort((a, b) => a.e.playedIn - b.e.playedIn);
}
