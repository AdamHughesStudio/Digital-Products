import { acceptedFor, isPast, ME } from './store';
import { createLocalStore } from './local-store';
import type { AppState, Game } from './types';

/**
 * Friends: golfers you've added and who have accepted. A request has to be accepted before you're
 * friends. Kept on this device for the preview; in the live app this lives on the server.
 */
export interface FriendRequest {
  golferId: string;
  createdAt: string;
  /** Optional line from the sender, shown on the request */
  note?: string;
}

interface FriendsState {
  friends: string[];
  incoming: FriendRequest[];
  outgoing: string[];
}

const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

const store = createLocalStore<FriendsState>('findfore:friends', {
  // the demo's previous "My golfers" become friends, and two golfers are waiting on a reply
  friends: ['g-ryan', 'g-jamie', 'g-james'],
  incoming: [
    { golferId: 'g-tom', createdAt: ago(0.1), note: 'Good to meet you at Haggs. Let’s get another round in.' },
    { golferId: 'g-hannah', createdAt: ago(2) },
  ],
  outgoing: [],
});

export const useFriends = store.use;

export type FriendStatus = 'friend' | 'requested' | 'incoming' | 'none';

export function friendStatus(s: FriendsState, golferId: string): FriendStatus {
  if (s.friends.includes(golferId)) return 'friend';
  if (s.outgoing.includes(golferId)) return 'requested';
  if (s.incoming.some((r) => r.golferId === golferId)) return 'incoming';
  return 'none';
}

const without = (ids: string[], id: string) => ids.filter((x) => x !== id);

/** Send a request. In the preview the other golfer accepts a few seconds later */
export function sendFriendRequest(golferId: string) {
  const s = store.get();
  // they already asked you, so sending one back simply accepts theirs
  if (s.incoming.some((r) => r.golferId === golferId)) return acceptFriendRequest(golferId);
  if (s.friends.includes(golferId) || s.outgoing.includes(golferId)) return;
  store.set({ ...s, outgoing: [...s.outgoing, golferId] });
  setTimeout(() => {
    const now = store.get();
    if (!now.outgoing.includes(golferId)) return;
    store.set({ ...now, outgoing: without(now.outgoing, golferId), friends: [...without(now.friends, golferId), golferId] });
  }, 4000);
}

export function cancelFriendRequest(golferId: string) {
  const s = store.get();
  store.set({ ...s, outgoing: without(s.outgoing, golferId) });
}

export function acceptFriendRequest(golferId: string) {
  const s = store.get();
  store.set({ ...s, incoming: s.incoming.filter((r) => r.golferId !== golferId), friends: [...without(s.friends, golferId), golferId] });
}

export function declineFriendRequest(golferId: string) {
  const s = store.get();
  store.set({ ...s, incoming: s.incoming.filter((r) => r.golferId !== golferId) });
}

export function removeFriend(golferId: string) {
  const s = store.get();
  store.set({ ...s, friends: without(s.friends, golferId) });
}

/** Put a removed friend back, for Undo */
export function restoreFriend(golferId: string) {
  const s = store.get();
  if (!s.friends.includes(golferId)) store.set({ ...s, friends: [...s.friends, golferId] });
}

// ---------- rounds played together ----------

export interface PlayedTogether {
  count: number;
  /** Course of the most recent round together */
  lastCourseId?: string;
  lastAt?: string;
}

/**
 * Rounds the preview pretends you've already played with the demo golfers, so the list has some
 * history before you've played through the app. Real rounds from your games are added on top.
 */
const DEMO_HISTORY: Record<string, PlayedTogether> = {
  'g-ryan': { count: 3, lastCourseId: 'dundonald', lastAt: ago(12) },
  'g-james': { count: 5, lastCourseId: 'royal-troon', lastAt: ago(21) },
  'g-tom': { count: 1, lastCourseId: 'haggs-castle', lastAt: ago(1) },
  'g-hannah': { count: 1, lastCourseId: 'crail', lastAt: ago(30) },
};

const inGame = (s: AppState, g: Game, who: string) => g.hostId === who || acceptedFor(s, g.id).some((r) => r.golferId === who);

export function playedTogether(s: AppState, golferId: string): PlayedTogether {
  const real = Object.values(s.games)
    .filter((g) => !g.cancelled && isPast(g) && inGame(s, g, ME) && inGame(s, g, golferId))
    .sort((a, b) => b.teeTime.localeCompare(a.teeTime));
  const demo = DEMO_HISTORY[golferId] ?? { count: 0 };
  const latestReal = real[0];
  const useReal = latestReal && (!demo.lastAt || latestReal.teeTime > demo.lastAt);
  return {
    count: demo.count + real.length,
    lastCourseId: useReal ? latestReal.courseId : demo.lastCourseId ?? latestReal?.courseId,
    lastAt: useReal ? latestReal.teeTime : demo.lastAt ?? latestReal?.teeTime,
  };
}

/** Golfers you've played with or have a game booked with, who aren't friends yet */
export function playedWithNotFriends(s: AppState, f: FriendsState): string[] {
  const ids = new Set<string>();
  Object.values(s.games)
    .filter((g) => !g.cancelled && inGame(s, g, ME))
    .forEach((g) => [g.hostId, ...acceptedFor(s, g.id).map((r) => r.golferId)].forEach((id) => ids.add(id)));
  Object.keys(DEMO_HISTORY).forEach((id) => ids.add(id));
  ids.delete(ME);
  return [...ids].filter((id) => s.golfers[id] && !s.blockedIds.includes(id) && friendStatus(f, id) !== 'friend' && friendStatus(f, id) !== 'incoming');
}
