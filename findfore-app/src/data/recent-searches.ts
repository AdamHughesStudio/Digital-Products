import { createLocalStore } from './local-store';

/**
 * Recent searches, kept on this phone: what you opened from search (a club, a course, a golfer, a
 * game or competition) and anything you typed and searched for. Newest first.
 */
export interface RecentSearch {
  /** One entry per thing, e.g. "club:gleneagles" or "query:troon" */
  key: string;
  kind: 'club' | 'course' | 'golfer' | 'listing' | 'query';
  title: string;
  sub?: string;
  /** Where tapping it goes; a query fills the search box instead */
  path?: string;
  /** The club whose photo to show */
  photoId?: string;
  golferId?: string;
}

const MAX = 8;
const store = createLocalStore<RecentSearch[]>('findfore:recent-searches', []);

export const useRecentSearches = store.use;

export function addRecentSearch(r: RecentSearch) {
  store.update((list) => [r, ...list.filter((x) => x.key !== r.key)].slice(0, MAX));
}
export const removeRecentSearch = (key: string) => store.update((list) => list.filter((x) => x.key !== key));
export const clearRecentSearches = () => store.set([]);
