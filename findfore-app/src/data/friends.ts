import { acceptedFor, isPast, ME } from './store';
import { createLocalStore } from './local-store';
import type { AppState, Game } from './types';
import { useEffect, useState } from 'react';

import { acceptFriendCloud, cloudUser, endFriendCloud, fetchMutualFriendsCloud, isCloudId, sendFriendCloud, type CloudFriends } from '@/lib/social';

/**
 * Friends: golfers you've added and who have accepted, and golfers you've matched with through a
 * game (being accepted into someone's game makes you and the host friends, so you can message).
 * Kept on this device for the demo golfers; for real accounts it lives on the server.
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
  /** Accepted game requests already turned into friendships, so each match only counts once */
  matched?: string[];
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

/**
 * The friends you share with a golfer, for their profile. Real golfers ask the account, which only
 * names your own friends; the demo golfers know a steady, made up share of yours.
 */
export function useMutualFriends(golferId: string): string[] {
  const f = useFriends();
  const real = isCloudId(golferId);
  const [cloud, setCloud] = useState<string[]>([]);
  const count = f.friends.length;
  useEffect(() => {
    if (!real || !cloudUser()) return;
    let live = true;
    fetchMutualFriendsCloud(golferId).then((ids) => live && setCloud(ids));
    return () => {
      live = false;
    };
  }, [golferId, real, count]);
  if (real) return cloud.filter((id) => f.friends.includes(id));
  const knows = (id: string) => [...(golferId + id)].reduce((n, ch) => n + ch.charCodeAt(0), 0) % 3 !== 0;
  return f.friends.filter((id) => id !== golferId && !isCloudId(id) && knows(id));
}

export type FriendStatus = 'friend' | 'requested' | 'incoming' | 'none';

export function friendStatus(s: FriendsState, golferId: string): FriendStatus {
  if (s.friends.includes(golferId)) return 'friend';
  if (s.outgoing.includes(golferId)) return 'requested';
  if (s.incoming.some((r) => r.golferId === golferId)) return 'incoming';
  return 'none';
}

const without = (ids: string[], id: string) => ids.filter((x) => x !== id);

/** Swap in real friendships from the account, keeping the demo golfers' ones */
export function mergeCloudFriends(cf: CloudFriends) {
  const s = store.get();
  const keep = (ids: string[]) => ids.filter((id) => !isCloudId(id));
  store.set({
    friends: [...keep(s.friends), ...cf.friends],
    incoming: [...s.incoming.filter((r) => !isCloudId(r.golferId)), ...cf.incoming],
    outgoing: [...keep(s.outgoing), ...cf.outgoing],
  });
}

/** The real friendships as last loaded, to spot what's new */
export function cloudFriendsNow(): CloudFriends {
  const s = store.get();
  return { friends: s.friends.filter(isCloudId), incoming: s.incoming.filter((r) => isCloudId(r.golferId)), outgoing: s.outgoing.filter(isCloudId) };
}

/** Send a request. In the preview the other golfer accepts a few seconds later */
export function sendFriendRequest(golferId: string) {
  const s = store.get();
  // they already asked you, so sending one back simply accepts theirs
  if (s.incoming.some((r) => r.golferId === golferId)) return acceptFriendRequest(golferId);
  if (s.friends.includes(golferId) || s.outgoing.includes(golferId)) return;
  store.set({ ...s, outgoing: [...s.outgoing, golferId] });
  // a real golfer answers for themselves
  if (isCloudId(golferId)) return void sendFriendCloud(golferId);
  setTimeout(() => {
    const now = store.get();
    if (!now.outgoing.includes(golferId)) return;
    store.set({ ...now, outgoing: without(now.outgoing, golferId), friends: [...without(now.friends, golferId), golferId] });
  }, 4000);
}

export function cancelFriendRequest(golferId: string) {
  const s = store.get();
  store.set({ ...s, outgoing: without(s.outgoing, golferId) });
  if (isCloudId(golferId)) endFriendCloud(golferId);
}

export function acceptFriendRequest(golferId: string) {
  const s = store.get();
  store.set({ ...s, incoming: s.incoming.filter((r) => r.golferId !== golferId), friends: [...without(s.friends, golferId), golferId] });
  if (isCloudId(golferId)) acceptFriendCloud(golferId);
}

export function declineFriendRequest(golferId: string) {
  const s = store.get();
  store.set({ ...s, incoming: s.incoming.filter((r) => r.golferId !== golferId) });
  if (isCloudId(golferId)) endFriendCloud(golferId);
}

export function removeFriend(golferId: string) {
  const s = store.get();
  store.set({ ...s, friends: without(s.friends, golferId) });
  if (isCloudId(golferId)) endFriendCloud(golferId);
}

/**
 * Being accepted into a game is the match: the host and the golfer become friends. The server does
 * this for real accounts; this keeps the demo golfers in step. Each match counts once, so removing
 * the friend afterwards sticks.
 */
export function addMatchedFriends(s: AppState) {
  const f = store.get();
  const done = new Set(f.matched ?? []);
  const ids: string[] = [];
  const add = new Set<string>();
  for (const r of Object.values(s.requests)) {
    if (r.kind !== 'request' || r.status !== 'accepted' || done.has(r.id)) continue;
    const g = s.games[r.gameId];
    if (!g) continue;
    ids.push(r.id);
    const other = r.golferId === ME ? g.hostId : g.hostId === ME ? r.golferId : null;
    if (other && other !== ME && !isCloudId(other) && !f.friends.includes(other)) add.add(other);
  }
  if (ids.length === 0) return;
  store.set({
    ...f,
    matched: [...done, ...ids],
    friends: [...f.friends, ...add],
    incoming: f.incoming.filter((r) => !add.has(r.golferId)),
    outgoing: f.outgoing.filter((id) => !add.has(id)),
  });
}

/** Put a removed friend back, for Undo. A real golfer has to accept again, so it goes as a request. */
export function restoreFriend(golferId: string) {
  const s = store.get();
  if (isCloudId(golferId)) {
    if (!s.outgoing.includes(golferId)) store.set({ ...s, outgoing: [...s.outgoing, golferId] });
    sendFriendCloud(golferId);
    return;
  }
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
