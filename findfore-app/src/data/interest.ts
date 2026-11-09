import { useMemo } from 'react';

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

export interface InterestedFriend {
  golfer: Golfer;
  daysAgo: number;
}

/** Your friends who have this competition on their shortlist, most recent first */
export function useInterestedFriends(eventId: string): InterestedFriend[] {
  const { state } = useStore();
  const friends = useFriends();
  return useMemo(
    () =>
      (SAVED_BY[eventId] ?? [])
        .filter((x) => friends.friends.includes(x.golferId) && state.golfers[x.golferId] && !state.blockedIds.includes(x.golferId))
        .sort((a, b) => a.daysAgo - b.daysAgo)
        .map((x) => ({ golfer: state.golfers[x.golferId], daysAgo: x.daysAgo })),
    [eventId, friends.friends, state.golfers, state.blockedIds],
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
