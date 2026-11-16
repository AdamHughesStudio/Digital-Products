import { useMemo, useSyncExternalStore } from 'react';

import { useFriends } from './friends';
import { useStore } from './store';
import type { Golfer } from './types';

/**
 * Who has saved each competition to their shortlist. In the preview this is a fixed list of
 * demo golfers; only the ones who are your friends are ever shown, so accepting a friend
 * request can make new faces appear on competitions.
 */
const SAVED_BY: Record<string, { golferId: string; daysAgo: number }[]> = {
  // national championships
  'sco-amateur': [{ golferId: 'g-james', daysAgo: 2 }, { golferId: 'g-jamie', daysAgo: 9 }],
  'sco-mid': [{ golferId: 'g-ryan', daysAgo: 6 }],
  'eng-open': [{ golferId: 'g-jamie', daysAgo: 3 }],
};

// In the preview, a few demo friends have also saved some of the real club opens, picked the same
// way each time from the open's id, so the friends' faces and the friends shelf have something to show
const DEMO_FRIENDS = ['g-ryan', 'g-jamie', 'g-james', 'g-tom'];
function savedFor(eventId: string): { golferId: string; daysAgo: number }[] {
  if (SAVED_BY[eventId]) return SAVED_BY[eventId];
  const h = eventId.split('').reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  if (h % 4 !== 0) return [];
  const first = { golferId: DEMO_FRIENDS[(h >>> 3) % DEMO_FRIENDS.length], daysAgo: (h >>> 5) % 9 };
  if (h % 3 !== 0) return [first];
  return [first, { golferId: DEMO_FRIENDS[((h >>> 3) + 1) % DEMO_FRIENDS.length], daysAgo: ((h >>> 7) % 9) + 1 }];
}

// ---------- real friends' saves, from the account ----------

type Saved = { golferId: string; daysAgo: number };
let accountSaves: Record<string, Saved[]> = {};
const saveListeners = new Set<() => void>();

/** Friends' saves as the last sync found them, by competition */
export function setFriendSaves(rows: { user_id: string; event_id: string; created_at: string }[], me: string) {
  const next: Record<string, Saved[]> = {};
  const now = Date.now();
  for (const r of rows) {
    if (r.user_id === me) continue;
    (next[r.event_id] ??= []).push({ golferId: r.user_id, daysAgo: Math.max(0, Math.floor((now - new Date(r.created_at).getTime()) / 86400000)) });
  }
  accountSaves = next;
  saveListeners.forEach((l) => l());
}

/** Friends' saves, read so a screen draws again when a sync brings new ones */
export function useFriendSaves() {
  return useSyncExternalStore(
    (cb) => {
      saveListeners.add(cb);
      return () => void saveListeners.delete(cb);
    },
    () => accountSaves,
    () => accountSaves,
  );
}

/** Real friends' saves first, then the preview's made up ones */
function allSaves(eventId: string, account: Record<string, Saved[]>): Saved[] {
  return [...(account[eventId] ?? []), ...savedFor(eventId)];
}

export interface InterestedFriend {
  golfer: Golfer;
  daysAgo: number;
}

/** Your friends who have this competition on their shortlist, most recent first */
export function useInterestedFriends(eventId: string): InterestedFriend[] {
  const { state } = useStore();
  const friends = useFriends();
  const account = useFriendSaves();
  return useMemo(
    () =>
      allSaves(eventId, account)
        .filter((x) => friends.friends.includes(x.golferId) && state.golfers[x.golferId] && !state.blockedIds.includes(x.golferId))
        .sort((a, b) => a.daysAgo - b.daysAgo)
        .map((x) => ({ golfer: state.golfers[x.golferId], daysAgo: x.daysAgo })),
    [eventId, account, friends.friends, state.golfers, state.blockedIds],
  );
}

/** "Ryan is interested", "Ryan and Jamie are interested", "Ryan, Jamie and 2 more are interested" */
export function interestedLine(list: InterestedFriend[]) {
  const names = list.map((x) => x.golfer.firstName);
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is interested`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are interested`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more are interested`;
}

/** Which of these friends have saved a competition, for lists that cannot use the hook */
export function savedByFriends(eventId: string, friendIds: string[], account: Record<string, Saved[]>): string[] {
  return allSaves(eventId, account).filter((x) => friendIds.includes(x.golferId)).map((x) => x.golferId);
}
