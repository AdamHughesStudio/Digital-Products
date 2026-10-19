import type { Game, Golfer, HandicapPreference, JoinRequest } from '@/data/types';
import { fromRow, type ProfileRow } from '@/lib/cloud';
import { supabase } from '@/lib/supabase';

/**
 * Friends and shared games. The app keeps working from its on-phone state; this loads the real
 * golfers, games and requests from the account into it, and sends changes back. Anything with a
 * uuid for an id is real; the demo golfers and games keep their short ids.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isCloudId = (id: string | undefined | null) => !!id && UUID.test(id);

export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------- who is signed in ----------

let myCloudId: string | null = null;
/** Set by the sync as people sign in and out. The store reads it to decide where a change goes. */
export function setCloudUser(id: string | null) {
  myCloudId = id;
}
export const cloudUser = () => myCloudId;

// ---------- small event hub: ask for a refresh, report failures ----------

type Listener<T> = (v: T) => void;
const syncListeners = new Set<Listener<void>>();
const errorListeners = new Set<Listener<string>>();

export function onSyncRequested(fn: () => void) {
  syncListeners.add(fn);
  return () => void syncListeners.delete(fn);
}
export function requestSync() {
  syncListeners.forEach((fn) => fn());
}
export function onCloudError(fn: (message: string) => void) {
  errorListeners.add(fn);
  return () => void errorListeners.delete(fn);
}

function friendlyError(message?: string) {
  if (!message) return 'That didn’t go through. Try again.';
  if (/fetch|network/i.test(message)) return 'No connection, so that didn’t go through.';
  return message;
}

/** Run a change against the account, then reload so the phone matches what the server decided */
async function send(run: () => PromiseLike<{ error: { message: string } | null }>) {
  try {
    const { error } = await run();
    if (error) errorListeners.forEach((fn) => fn(friendlyError(error.message)));
  } catch (e) {
    errorListeners.forEach((fn) => fn(friendlyError((e as Error)?.message)));
  }
  requestSync();
}

// ---------- loading ----------

interface GameRow {
  id: string;
  host_id: string;
  course_id: string;
  tee_time: string;
  spaces_total: number;
  cost_per_golfer: number | string | null;
  visitor_fee: number | string | null;
  member_host: boolean;
  handicap: HandicapPreference | null;
  description: string;
  cancelled: boolean;
  created_at: string;
}

interface RequestRow {
  id: string;
  game_id: string;
  golfer_id: string;
  kind: 'request' | 'invite';
  status: JoinRequest['status'];
  message: string | null;
  created_at: string;
}

interface FriendshipRow {
  requester: string;
  addressee: string;
  status: 'pending' | 'accepted';
  note: string | null;
  created_at: string;
}

export interface CloudFriends {
  friends: string[];
  incoming: { golferId: string; createdAt: string; note?: string }[];
  outgoing: string[];
}

export interface CloudSnapshot {
  golfers: Golfer[];
  games: Game[];
  requests: JoinRequest[];
  friends: CloudFriends;
}

/** The local id for a cloud golfer: the signed in golfer is always 'me' on the phone */
const local = (id: string, me: string, ME: string) => (id === me ? ME : id);
const num = (v: number | string | null) => (v === null || v === undefined ? undefined : Number(v));

export async function fetchSnapshot(ME: string): Promise<CloudSnapshot | null> {
  const me = myCloudId;
  if (!me) return null;
  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  const [profiles, games, requests, friendships] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('games').select('*').gte('tee_time', since).order('tee_time').limit(1000),
    supabase.from('game_requests').select('*').limit(5000),
    supabase.from('friendships').select('*'),
  ]);
  const failed = profiles.error ?? games.error ?? requests.error ?? friendships.error;
  if (failed) throw new Error(failed.message);

  const gameRows = (games.data ?? []) as GameRow[];
  const requestRows = ((requests.data ?? []) as RequestRow[]).filter((r) => gameRows.some((g) => g.id === r.game_id));
  const isPastGame = (g: GameRow) => new Date(g.tee_time).getTime() < Date.now() && !g.cancelled;

  const golfers: Golfer[] = ((profiles.data ?? []) as ProfileRow[])
    .filter((p) => p.id !== me)
    .map((p) => {
      const played = gameRows.filter((g) => isPastGame(g) && (g.host_id === p.id || requestRows.some((r) => r.game_id === g.id && r.golfer_id === p.id && r.status === 'accepted'))).length;
      return { id: p.id, rating: 5, gamesPlayed: played, ...fromRow(p) };
    });

  return {
    golfers,
    games: gameRows.map((g) => ({
      id: g.id,
      hostId: local(g.host_id, me, ME),
      courseId: g.course_id,
      teeTime: g.tee_time,
      spacesTotal: g.spaces_total,
      costPerGolfer: num(g.cost_per_golfer),
      visitorFee: num(g.visitor_fee),
      memberHost: g.member_host || undefined,
      handicap: g.handicap ?? { kind: 'any' },
      description: g.description,
      createdAt: g.created_at,
      cancelled: g.cancelled || undefined,
    })),
    requests: requestRows.map((r) => ({
      id: r.id,
      gameId: r.game_id,
      golferId: local(r.golfer_id, me, ME),
      kind: r.kind,
      status: r.status,
      message: r.message ?? undefined,
      createdAt: r.created_at,
    })),
    friends: {
      friends: (friendships.data as FriendshipRow[]).filter((f) => f.status === 'accepted').map((f) => (f.requester === me ? f.addressee : f.requester)),
      incoming: (friendships.data as FriendshipRow[])
        .filter((f) => f.status === 'pending' && f.addressee === me)
        .map((f) => ({ golferId: f.requester, createdAt: f.created_at, note: f.note ?? undefined })),
      outgoing: (friendships.data as FriendshipRow[]).filter((f) => f.status === 'pending' && f.requester === me).map((f) => f.addressee),
    },
  };
}

// ---------- games ----------

type GameFields = Pick<Game, 'courseId' | 'teeTime' | 'spacesTotal' | 'costPerGolfer' | 'visitorFee' | 'memberHost' | 'handicap' | 'description'>;

function gameRow(g: Partial<GameFields>) {
  const row: Record<string, unknown> = {};
  if (g.courseId !== undefined) row.course_id = g.courseId;
  if (g.teeTime !== undefined) row.tee_time = g.teeTime;
  if (g.spacesTotal !== undefined) row.spaces_total = g.spacesTotal;
  if ('costPerGolfer' in g) row.cost_per_golfer = g.costPerGolfer ?? null;
  if ('visitorFee' in g) row.visitor_fee = g.visitorFee ?? null;
  if ('memberHost' in g) row.member_host = !!g.memberHost;
  if (g.handicap !== undefined) row.handicap = g.handicap;
  if (g.description !== undefined) row.description = g.description;
  return row;
}

export const postGameCloud = (id: string, g: GameFields) => send(() => supabase.from('games').insert({ id, ...gameRow(g) }));
export const updateGameCloud = (id: string, patch: Partial<GameFields>) => send(() => supabase.from('games').update(gameRow(patch)).eq('id', id));
export const cancelGameCloud = (id: string) => send(() => supabase.rpc('cancel_game', { game: id }));

// ---------- requests and invites ----------

export const requestToJoinCloud = (gameId: string, requestId: string, note?: string) =>
  send(() => supabase.rpc('request_to_join', { game: gameId, request_id: requestId, note: note ?? null }));
export const inviteCloud = (gameId: string, golferId: string, requestId: string) =>
  send(() => supabase.rpc('invite_to_game', { game: gameId, golfer: golferId, request_id: requestId }));
export const respondCloud = (requestId: string, accept: boolean) => send(() => supabase.rpc('respond_to_request', { request: requestId, accept }));
export const withdrawCloud = (requestId: string) => send(() => supabase.rpc('withdraw_request', { request: requestId }));
export const restoreCloud = (requestId: string) => send(() => supabase.rpc('restore_request', { request: requestId }));

// ---------- friends ----------

/** Sends a request, or accepts theirs if they've already asked */
export const sendFriendCloud = (golferId: string, note?: string) => send(() => supabase.rpc('send_friend_request', { target: golferId, note: note ?? null }));
export const acceptFriendCloud = sendFriendCloud;
/** Decline, cancel or unfriend: whichever way round, the friendship row goes */
export const endFriendCloud = (golferId: string) => {
  if (!isCloudId(golferId) || !isCloudId(myCloudId)) return Promise.resolve();
  return send(() => supabase.from('friendships').delete().or(`and(requester.eq.${myCloudId},addressee.eq.${golferId}),and(requester.eq.${golferId},addressee.eq.${myCloudId})`));
};
