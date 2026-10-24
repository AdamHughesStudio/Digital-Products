import { useEffect, useRef } from 'react';

import { gameCourseName } from '@/data/courses';
import type { Game, Gif, Golfer, HandicapPreference, JoinRequest, Message } from '@/data/types';
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
  layout: string | null;
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
  removed_at?: string | null;
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
  messages: Message[];
  /** Direct chats that have messages, so they show in the inbox */
  directChats: { id: string; other: string }[];
  /** How far each golfer has read each conversation, for unread counts and "Seen" */
  reads: { conversationId: string; golferId: string; at: string; clearedAt?: string }[];
}

/** How the phone names conversations; passed in so this file doesn't depend on the store */
export interface ChatIds {
  ME: string;
  gameChatId: (gameId: string) => string;
  directChatId: (a: string, b: string) => string;
}

export interface MessageRow {
  id: string;
  sender_id: string;
  game_id: string | null;
  dm_low: string | null;
  dm_high: string | null;
  body: string;
  created_at: string;
  conv: string;
  gif?: Gif | null;
  mentions?: string[] | null;
}

/** A message from the account as the phone keeps it, plus which conversation it belongs to */
export function toLocalMessage(r: MessageRow, ids: ChatIds): { message: Message; gameId?: string; other?: string } | null {
  const me = myCloudId;
  if (!me) return null;
  const sender = r.sender_id === me ? ids.ME : r.sender_id;
  const gif = r.gif && typeof r.gif.url === 'string' ? { gif: { url: r.gif.url, width: Number(r.gif.width), height: Number(r.gif.height) } } : {};
  const extra = { ...gif, ...(r.mentions?.length ? { mentions: r.mentions.map((id) => (id === me ? ids.ME : id)) } : {}) };
  if (r.game_id) {
    return { message: { id: r.id, conversationId: ids.gameChatId(r.game_id), senderId: sender, body: r.body, createdAt: r.created_at, ...extra }, gameId: r.game_id };
  }
  const other = r.dm_low === me ? r.dm_high : r.dm_low;
  if (!other) return null;
  return { message: { id: r.id, conversationId: ids.directChatId(ids.ME, other), senderId: sender, body: r.body, createdAt: r.created_at, ...extra }, other };
}

/** The account's key for a conversation on the phone, or null if it isn't a real one */
export function cloudConvKey(c: { gameId?: string; participantIds: string[] } | undefined, ME: string): string | null {
  const me = myCloudId;
  if (!c || !me) return null;
  if (c.gameId) return isCloudId(c.gameId) ? `game:${c.gameId}` : null;
  const other = c.participantIds.find((p) => p !== ME);
  if (!other || !isCloudId(other)) return null;
  const [low, high] = [me, other].sort();
  return `dm:${low}:${high}`;
}

/** The local id for a cloud golfer: the signed in golfer is always 'me' on the phone */
const local = (id: string, me: string, ME: string) => (id === me ? ME : id);
const num = (v: number | string | null) => (v === null || v === undefined ? undefined : Number(v));

export async function fetchSnapshot(ids: ChatIds): Promise<CloudSnapshot | null> {
  const { ME } = ids;
  const me = myCloudId;
  if (!me) return null;
  const since = new Date(Date.now() - 60 * 86400000).toISOString();
  const [profiles, games, requests, friendships, messages, reads, reactions, friendCounts] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('games').select('*').gte('tee_time', since).order('tee_time').limit(1000),
    supabase.from('game_requests').select('*').limit(5000),
    supabase.from('friendships').select('*'),
    supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(3000),
    supabase.from('conversation_reads').select('*'),
    supabase.from('message_reactions').select('message_id,user_id,emoji').not('emoji', 'is', null).order('created_at', { ascending: false }).limit(5000),
    supabase.rpc('friend_counts'),
  ]);
  const friendsOf = new Map(((friendCounts.data ?? []) as { golfer: string; friends: number }[]).map((r) => [r.golfer, r.friends]));
  const failed = profiles.error ?? games.error ?? requests.error ?? friendships.error ?? messages.error ?? reads.error;
  if (failed) throw new Error(failed.message);

  // reactions by message; a missing table just means none yet
  const reactionsBy = new Map<string, Record<string, string>>();
  ((reactions.data ?? []) as { message_id: string; user_id: string; emoji: string }[]).forEach((r) => {
    const who = local(r.user_id, me, ME);
    reactionsBy.set(r.message_id, { ...reactionsBy.get(r.message_id), [who]: r.emoji });
  });
  // my reactions still on their way to the account win over the copy just loaded
  pendingReactions.forEach((emoji, messageId) => {
    const all = { ...reactionsBy.get(messageId) };
    if (emoji) all[ME] = emoji;
    else delete all[ME];
    reactionsBy.set(messageId, all);
  });

  const messageRows = (messages.data ?? []) as MessageRow[];
  const mapped = messageRows.map((r) => {
    const m = toLocalMessage(r, ids);
    const reacted = reactionsBy.get(r.id);
    if (m && reacted && Object.keys(reacted).length) m.message.reactions = reacted;
    return m;
  });
  const msgs = mapped.filter((x) => x !== null);
  const directChats = new Map<string, string>();
  msgs.forEach((m) => m.other && directChats.set(m.message.conversationId, m.other));
  const convByKey = new Map<string, string>();
  messageRows.forEach((r, i) => {
    const m = mapped[i];
    if (m) convByKey.set(r.conv, m.message.conversationId);
  });
  // a game chat with no messages yet still needs its key matched
  ((games.data ?? []) as GameRow[]).forEach((g) => convByKey.set(`game:${g.id}`, ids.gameChatId(g.id)));

  const gameRows = (games.data ?? []) as GameRow[];
  const requestRows = ((requests.data ?? []) as RequestRow[]).filter((r) => gameRows.some((g) => g.id === r.game_id));
  const isPastGame = (g: GameRow) => new Date(g.tee_time).getTime() < Date.now() && !g.cancelled;

  const golfers: Golfer[] = ((profiles.data ?? []) as ProfileRow[])
    .filter((p) => p.id !== me)
    .map((p) => {
      const played = gameRows.filter((g) => isPastGame(g) && (g.host_id === p.id || requestRows.some((r) => r.game_id === g.id && r.golfer_id === p.id && r.status === 'accepted'))).length;
      return { id: p.id, gamesPlayed: played, friendCount: friendsOf.get(p.id) ?? 0, ...fromRow(p) };
    });

  return {
    golfers,
    games: gameRows.map((g) => ({
      id: g.id,
      hostId: local(g.host_id, me, ME),
      courseId: g.course_id,
      layout: g.layout ?? undefined,
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
      removedAt: r.removed_at ?? undefined,
    })),
    friends: {
      friends: (friendships.data as FriendshipRow[]).filter((f) => f.status === 'accepted').map((f) => (f.requester === me ? f.addressee : f.requester)),
      incoming: (friendships.data as FriendshipRow[])
        .filter((f) => f.status === 'pending' && f.addressee === me)
        .map((f) => ({ golferId: f.requester, createdAt: f.created_at, note: f.note ?? undefined })),
      outgoing: (friendships.data as FriendshipRow[]).filter((f) => f.status === 'pending' && f.requester === me).map((f) => f.addressee),
    },
    messages: msgs.map((m) => m.message).reverse(),
    directChats: [...directChats].map(([id, other]) => ({ id, other })),
    reads: ((reads.data ?? []) as { user_id: string; conv: string; last_read_at: string; cleared_at: string | null }[])
      .filter((r) => convByKey.has(r.conv))
      .map((r) => ({
        conversationId: convByKey.get(r.conv)!,
        golferId: r.user_id === me ? ME : r.user_id,
        at: r.last_read_at,
        clearedAt: r.user_id === me ? r.cleared_at ?? undefined : undefined,
      })),
  };
}

// ---------- games ----------

type GameFields = Pick<Game, 'courseId' | 'layout' | 'teeTime' | 'spacesTotal' | 'costPerGolfer' | 'visitorFee' | 'memberHost' | 'handicap' | 'description'>;

function gameRow(g: Partial<GameFields>) {
  const row: Record<string, unknown> = {};
  if (g.courseId !== undefined) {
    row.course_id = g.courseId;
    row.layout = g.layout ?? null;
    // what notifications call the game, e.g. "Hilton Park · Allander"
    row.course_name = gameCourseName({ courseId: g.courseId, layout: g.layout }) ?? null;
  }
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
/** The host takes a confirmed player out of their game */
export const removeFromGameCloud = (requestId: string) => send(() => supabase.rpc('remove_from_game', { request: requestId }));

// ---------- friends ----------

/** Sends a request, or accepts theirs if they've already asked */
export const sendFriendCloud = (golferId: string, note?: string) => send(() => supabase.rpc('send_friend_request', { target: golferId, note: note ?? null }));
export const acceptFriendCloud = sendFriendCloud;
/** Decline, cancel or unfriend: whichever way round, the friendship row goes */
export const endFriendCloud = (golferId: string) => {
  if (!isCloudId(golferId) || !isCloudId(myCloudId)) return Promise.resolve();
  return send(() => supabase.from('friendships').delete().or(`and(requester.eq.${myCloudId},addressee.eq.${golferId}),and(requester.eq.${golferId},addressee.eq.${myCloudId})`));
};

// ---------- messages ----------

/** Messages sent from this phone that the account hasn't confirmed yet, kept through reloads */
const unconfirmed = new Set<string>();
export const isUnconfirmed = (id: string) => unconfirmed.has(id);

export function sendMessageCloud(id: string, key: string, body: string, gif?: Gif, mentions?: string[]) {
  const me = myCloudId;
  if (!me) return Promise.resolve();
  const row: Record<string, unknown> = { id, body };
  if (gif) row.gif = gif;
  // only real golfers can be told they were mentioned
  const real = (mentions ?? []).filter(isCloudId);
  if (real.length) row.mentions = real;
  if (key.startsWith('game:')) row.game_id = key.slice(5);
  else {
    const [low, high] = key.slice(3).split(':');
    row.dm_low = low;
    row.dm_high = high;
  }
  unconfirmed.add(id);
  return send(() => supabase.from('messages').insert(row)).finally(() => unconfirmed.delete(id));
}

// reactions sent from this phone that the account hasn't confirmed yet, kept through reloads
const pendingReactions = new Map<string, string | null>();

/** React to a message, or take my reaction off with null. One reaction each; a new one swaps it. */
export function reactCloud(messageId: string, emoji: string | null) {
  const me = myCloudId;
  if (!me) return Promise.resolve();
  pendingReactions.set(messageId, emoji);
  return send(() =>
    supabase.from('message_reactions').upsert({ message_id: messageId, user_id: me, emoji, created_at: new Date().toISOString() }, { onConflict: 'message_id,user_id' }),
  ).finally(() => {
    if (pendingReactions.get(messageId) === emoji) pendingReactions.delete(messageId);
  });
}

// one write per conversation every few seconds is plenty for read receipts
const lastReadWrite = new Map<string, number>();
const readTimers = new Map<string, ReturnType<typeof setTimeout>>();
export function markReadCloud(key: string) {
  const me = myCloudId;
  if (!me) return;
  const write = () => {
    lastReadWrite.set(key, Date.now());
    supabase
      .from('conversation_reads')
      .upsert({ user_id: me, conv: key, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,conv' })
      .then(() => {});
  };
  const wait = 3000 - (Date.now() - (lastReadWrite.get(key) ?? 0));
  if (wait <= 0) return write();
  if (!readTimers.has(key)) readTimers.set(key, setTimeout(() => {
    readTimers.delete(key);
    write();
  }, wait));
}

// ---------- live updates ----------

/**
 * Listens for new messages and for any change to games, requests, friends, read receipts or reactions.
 * Messages are handed over straight away; everything else asks for a reload. The database only
 * sends what this golfer is allowed to see.
 */
export function subscribeLive(onMessage: (row: MessageRow) => void) {
  const channel = supabase.channel(`live-${myCloudId}`);
  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => onMessage(p.new as MessageRow));
  ['games', 'game_requests', 'friendships', 'conversation_reads', 'message_reactions'].forEach((table) =>
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => requestSync()),
  );
  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** "Typing…" between phones in a conversation. Returns a function to call as the golfer types. */
export function useTypingChannel(key: string | null, onTyping: (golferId: string) => void) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSent = useRef(0);
  const handler = useRef(onTyping);
  handler.current = onTyping;
  useEffect(() => {
    if (!key) return;
    const channel = supabase.channel(`typing-${key}`, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const who = (payload as { who?: string })?.who;
      if (who && isCloudId(who) && who !== myCloudId) handler.current(who);
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [key]);
  return () => {
    if (!channelRef.current || !myCloudId || Date.now() - lastSent.current < 2500) return;
    lastSent.current = Date.now();
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { who: myCloudId } });
  };
}

// ---------- GIFs ----------

export interface GifResult extends Gif {
  id: string;
  /** A smaller copy for the picker grid */
  preview: string;
  title?: string;
}

let gifsOn: Promise<boolean> | null = null;
/** Whether GIFs are switched on: the server has a KLIPY key and someone is signed in */
export function gifsEnabled(): Promise<boolean> {
  if (!myCloudId) return Promise.resolve(false);
  gifsOn =
    gifsOn ??
    fetch('/api/gifs?check=1')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((j: { enabled?: boolean }) => !!j.enabled)
      .catch(() => false);
  return gifsOn;
}

/** Trending GIFs, or a search when there's a query */
export async function fetchGifs(query: string, page = 1): Promise<{ gifs: GifResult[]; more: boolean }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in to send GIFs');
  const params = new URLSearchParams({ page: String(page) });
  if (query.trim()) params.set('q', query.trim());
  const res = await fetch(`/api/gifs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Couldn’t load GIFs. Try again.');
  return { gifs: body.gifs ?? [], more: !!body.more };
}

// ---------- mutual friends ----------

/** The friends I share with another golfer. The account only ever names golfers who are my friends. */
export async function fetchMutualFriendsCloud(golferId: string): Promise<string[]> {
  if (!myCloudId || !isCloudId(golferId)) return [];
  const { data, error } = await supabase.rpc('mutual_friends', { other: golferId });
  if (error || !Array.isArray(data)) return [];
  return (data as (string | { mutual_friends: string })[]).map((r) => (typeof r === 'string' ? r : r.mutual_friends));
}

// ---------- notification settings ----------

/** Copy the golfer's notification switches to the account, where the server checks them */
export async function savePrefsCloud(prefs: object) {
  const me = myCloudId;
  if (!me) return;
  await supabase.from('notification_prefs').upsert({ user_id: me, prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

/**
 * Delete a chat from this golfer's list on every device, or bring it back (at null). The other
 * golfers keep their copy, and a new message brings the chat back with just that message.
 */
export async function clearChatCloud(key: string, at: string | null) {
  const me = myCloudId;
  if (!me) return;
  const row: Record<string, unknown> = { user_id: me, conv: key, cleared_at: at };
  if (at) row.last_read_at = at;
  await supabase.from('conversation_reads').upsert(row, { onConflict: 'user_id,conv' });
}
