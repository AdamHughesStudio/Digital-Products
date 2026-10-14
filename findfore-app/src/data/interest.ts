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
  // club opens
  'ce-1': [{ golferId: 'g-tom', daysAgo: 1 }, { golferId: 'g-ryan', daysAgo: 3 }, { golferId: 'g-james', daysAgo: 6 }],
  'ce-10': [{ golferId: 'g-jamie', daysAgo: 0 }, { golferId: 'g-ryan', daysAgo: 2 }],
  'ce-2': [{ golferId: 'g-james', daysAgo: 4 }],
  'ce-4': [{ golferId: 'g-ryan', daysAgo: 1 }, { golferId: 'g-hannah', daysAgo: 2 }],
  'ce-6': [{ golferId: 'g-jamie', daysAgo: 5 }, { golferId: 'g-james', daysAgo: 5 }, { golferId: 'g-ryan', daysAgo: 7 }, { golferId: 'g-tom', daysAgo: 8 }],
  'ce-7': [{ golferId: 'g-tom', daysAgo: 3 }],
  'ce-8': [{ golferId: 'g-hannah', daysAgo: 1 }],
  'ce-21': [{ golferId: 'g-ryan', daysAgo: 0 }],
  'ce-34': [{ golferId: 'g-jamie', daysAgo: 2 }, { golferId: 'g-james', daysAgo: 3 }],
  'ce-35': [{ golferId: 'g-james', daysAgo: 1 }, { golferId: 'g-ryan', daysAgo: 1 }, { golferId: 'g-jamie', daysAgo: 4 }],
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
