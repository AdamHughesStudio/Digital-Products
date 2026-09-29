import { courseById } from '@/data/courses';
import { isFull, isPast, ME } from '@/data/store';
import type { AppState, Game, GameType, Golfer, LookingPost, TimeOfDay } from '@/data/types';
import { distanceMiles, fromIsoDate, handicapFits, isoDate, startOfDay, timeOfDayFor } from './format';

export type FeedItem = { kind: 'game'; game: Game; miles: number; at: number } | { kind: 'looking'; post: LookingPost; miles: number; at: number };

/** Open games from other golfers that are still in the future and have space */
export function openGames(s: AppState) {
  return Object.values(s.games).filter(
    (g) => !g.cancelled && !isPast(g) && g.hostId !== ME && !s.blockedIds.includes(g.hostId) && !isFull(s, g),
  );
}

export function activeLooking(s: AppState) {
  const today = isoDate(new Date());
  return Object.values(s.looking).filter(
    (l) => !l.closed && l.golferId !== ME && !s.blockedIds.includes(l.golferId) && l.dates.some((d) => d >= today),
  );
}

export function buildFeed(s: AppState, me: Golfer): FeedItem[] {
  const items: FeedItem[] = [];
  openGames(s).forEach((g) => {
    const c = courseById(g.courseId);
    if (!c) return;
    items.push({ kind: 'game', game: g, miles: distanceMiles(c, me.location), at: new Date(g.teeTime).getTime() });
  });
  activeLooking(s).forEach((l) => {
    const first = l.dates.map(fromIsoDate).sort((a, b) => a.getTime() - b.getTime())[0];
    items.push({ kind: 'looking', post: l, miles: distanceMiles(l.location, me.location), at: first.getTime() + 9 * 3600000 });
  });
  return items.sort((a, b) => a.at - b.at);
}

export type DateFilter = 'any' | 'today' | 'tomorrow' | 'weekend' | 'week';
export type Kind = 'all' | 'games' | 'golfers' | GameType;

export interface Filters {
  query: string;
  kind: Kind;
  maxMiles: number;
  date: DateFilter;
  time: TimeOfDay;
  minSpaces: number;
  maxPrice?: number;
  fitsHandicap: boolean;
}

export const defaultFilters = (me: Golfer): Filters => ({
  query: '',
  kind: 'games',
  maxMiles: me.radiusMiles,
  date: 'any',
  time: 'any',
  minSpaces: 1,
  maxPrice: undefined,
  fitsHandicap: false,
});

function dateMatches(d: Date, f: DateFilter) {
  if (f === 'any') return true;
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (f === 'today') return diff === 0;
  if (f === 'tomorrow') return diff === 1;
  if (f === 'week') return diff >= 0 && diff < 7;
  // weekend: the coming Saturday and Sunday (or today, if it is the weekend)
  const dow = d.getDay();
  return (dow === 6 || dow === 0) && diff >= 0 && diff < 8;
}

export function applyFilters(items: FeedItem[], f: Filters, me: Golfer, s: AppState) {
  const q = f.query.trim().toLowerCase();
  return items.filter((it) => {
    if (it.miles > f.maxMiles) return false;
    if (it.kind === 'game') {
      const g = it.game;
      if (f.kind !== 'all' && f.kind !== 'games' && g.type !== f.kind) return false;
      const d = new Date(g.teeTime);
      if (!dateMatches(d, f.date)) return false;
      if (f.time !== 'any' && timeOfDayFor(d) !== f.time) return false;
      const left = g.spacesTotal - Object.values(s.requests).filter((r) => r.gameId === g.id && r.status === 'accepted').length;
      if (left < f.minSpaces) return false;
      if (f.maxPrice !== undefined && (g.costPerGolfer ?? 0) > f.maxPrice) return false;
      if (f.fitsHandicap && !handicapFits(g.handicap, me.handicap)) return false;
      if (q) {
        const c = courseById(g.courseId);
        const host = s.golfers[g.hostId];
        const hay = `${c?.name} ${c?.town} ${c?.region} ${host?.firstName} ${g.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }
    // golfers no longer advertise themselves: search lists games only
    return false;
  });
}
