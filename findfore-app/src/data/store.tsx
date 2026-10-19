import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { courseById } from './courses';
import { createSeedState, STATE_VERSION } from './seed';
import type {
  AppNotification,
  AppState,
  Game,
  Golfer,
  HandicapPreference,
  JoinRequest,
  Message,
  NotificationKind,
  Place,
  ReportReason,
  RoundFeedback,
  TimeOfDay,
} from './types';
import { dayDiff, distanceMiles, formatTime, handicapFits, isoDate, relativeDay, timeOfDayFor } from '@/lib/format';
import { suggestUsername, usernameTaken } from '@/lib/username';
import {
  cancelGameCloud,
  cloudUser,
  inviteCloud,
  isCloudId,
  newId,
  postGameCloud,
  requestToJoinCloud,
  respondCloud,
  restoreCloud,
  updateGameCloud,
  withdrawCloud,
  type CloudFriends,
  type CloudSnapshot,
  cloudConvKey,
  isUnconfirmed,
  markReadCloud,
  sendMessageCloud,
} from '@/lib/social';

const STORAGE_KEY = 'findfore:state';
export const ME = 'me';

// ---------- helpers that work on a state snapshot ----------

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const nowIso = () => new Date().toISOString();

export function acceptedFor(s: AppState, gameId: string) {
  return Object.values(s.requests).filter((r) => r.gameId === gameId && r.status === 'accepted');
}

export function spacesLeft(s: AppState, g: Game) {
  return Math.max(0, g.spacesTotal - acceptedFor(s, g.id).length);
}

export function isFull(s: AppState, g: Game) {
  return spacesLeft(s, g) === 0;
}

export function isPast(g: Game) {
  return new Date(g.teeTime).getTime() < Date.now() - 3 * 3600000;
}

export function myRequestFor(s: AppState, gameId: string) {
  return Object.values(s.requests)
    .filter((r) => r.gameId === gameId && r.golferId === ME && r.status !== 'withdrawn')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function gameChatId(gameId: string) {
  return `chat-game-${gameId}`;
}

export function directChatId(a: string, b: string) {
  return `chat-dm-${[a, b].sort().join('-')}`;
}

/** Games I'm hosting or have a confirmed space in */
export function myGames(s: AppState) {
  return Object.values(s.games).filter(
    (g) => !g.cancelled && (g.hostId === ME || acceptedFor(s, g.id).some((r) => r.golferId === ME)),
  );
}

export function unreadCount(s: AppState, convId: string) {
  const c = s.conversations[convId];
  if (!c) return 0;
  const since = c.lastReadAt[ME] ?? '';
  return s.messages.filter((m) => m.conversationId === convId && m.senderId !== ME && m.createdAt > since).length;
}

export function totalUnread(s: AppState) {
  return Object.keys(s.conversations).reduce((n, id) => n + unreadCount(s, id), 0);
}

/** Rounds I played in the last fortnight that I haven't checked in on yet */
export function roundsToReview(s: AppState) {
  const done = s.roundsDone ?? [];
  return myGames(s)
    .filter((g) => isPast(g) && !done.includes(g.id) && Date.now() - new Date(g.teeTime).getTime() < 14 * 86400000)
    .sort((a, b) => b.teeTime.localeCompare(a.teeTime));
}

/** Everyone I played with in a game, excluding me and anyone blocked */
export function playingPartners(s: AppState, g: Game) {
  return [g.hostId, ...acceptedFor(s, g.id).map((r) => r.golferId)]
    .filter((id, i, a) => id !== ME && !s.blockedIds.includes(id) && a.indexOf(id) === i)
    .map((id) => s.golfers[id])
    .filter(Boolean);
}

/** Requests and invites that need me to act */
export function actionNeeded(s: AppState) {
  return Object.values(s.requests).filter((r) => {
    if (r.status !== 'pending') return false;
    const g = s.games[r.gameId];
    if (!g || g.cancelled || isPast(g)) return false;
    if (r.kind === 'request') return g.hostId === ME;
    return r.golferId === ME;
  });
}

// ---------- canned replies so the demo feels alive ----------

const BOT_REPLIES = [
  'Sounds good, see you on the first tee.',
  'Perfect. I’ll be by the putting green about 20 minutes before.',
  'Great stuff, looking forward to it.',
  'Brilliant. Car park is on the left as you come in.',
  'No bother at all. Shout if anything changes.',
  'Nice one. Fancy a quick bite in the clubhouse after?',
];

function botReplyFor(body: string, n: number) {
  const b = body.toLowerCase();
  if (b.includes('late')) return 'No bother, we’ll wait for you on the tee.';
  if (b.includes('wear') || b.includes('quarter zip') || b.includes('jumper')) return 'Good shout. I’ll be in a navy jumper and white cap.';
  if (b.includes('?')) return 'Yes, that works for me.';
  return BOT_REPLIES[n % BOT_REPLIES.length];
}

// ---------- store ----------

export interface NewGameInput {
  courseId: string;
  teeTime: string;
  spacesTotal: number;
  costPerGolfer?: number;
  visitorFee?: number;
  memberHost?: boolean;
  handicap: HandicapPreference;
  description: string;
}


export type ProfileInput = Pick<Golfer, 'firstName' | 'lastName' | 'handicap' | 'location' | 'radiusMiles' | 'bio'> &
  Partial<Pick<Golfer, 'username' | 'homeClub' | 'showSurname' | 'showHomeClub' | 'avatar'>>;

interface Store {
  ready: boolean;
  state: AppState;
  me: Golfer | null;
  typing: Record<string, string>;
  completeOnboarding: (p: ProfileInput) => void;
  updateProfile: (patch: Partial<Golfer>) => void;
  postGame: (g: NewGameInput) => string;
  cancelGame: (gameId: string) => void;
  /** Change a game you host. Everyone playing is told in the game chat */
  updateGame: (gameId: string, patch: Partial<NewGameInput>) => void;
  /** Drop out of a game you were accepted into, freeing the space */
  leaveGame: (gameId: string) => void;
  requestToJoin: (gameId: string, message?: string) => string;
  restoreRequest: (requestId: string) => void;
  withdrawRequest: (requestId: string) => void;
  respond: (requestId: string, accept: boolean) => void;
  invite: (gameId: string, golferId: string) => void;
  openDirect: (otherId: string, gameId?: string) => string;
  sendMessage: (convId: string, body: string) => void;
  markRead: (convId: string) => void;
  markNotificationsRead: () => void;
  toggleSaved: (golferId: string) => void;
  block: (golferId: string) => void;
  unblock: (golferId: string) => void;
  report: (golferId: string, reason: ReportReason, note?: string) => void;
  rateGolfer: (gameId: string, golferId: string, patch: Partial<Pick<RoundFeedback, 'showedUp' | 'thumbs'>>) => void;
  finishRound: (gameId: string) => void;
  dismissTip: (key: string) => void;
  resetDemo: () => void;
  /** Load real golfers, games and requests from the account, replacing the last load */
  mergeCloud: (snap: CloudSnapshot, prevFriends: CloudFriends | null) => void;
  /** A message that has just arrived live from the account */
  receiveCloudMessage: (m: Message, gameId?: string, other?: string) => void;
  /** Show "typing" in a conversation for a few seconds */
  showTyping: (convId: string, who: string) => void;
}

const StoreContext = createContext<Store | null>(null);

type Draft = AppState;

function notify(d: Draft, kind: NotificationKind, title: string, body: string, href?: string) {
  const n: AppNotification = { id: uid('n'), kind, title, body, href, createdAt: nowIso(), read: false };
  d.notifications.unshift(n);
}

function ensureConversation(d: Draft, id: string, participants: string[], gameId?: string) {
  if (!d.conversations[id]) {
    d.conversations[id] = { id, gameId, participantIds: [], lastReadAt: {} };
  }
  const c = d.conversations[id];
  participants.forEach((p) => {
    if (!c.participantIds.includes(p)) c.participantIds.push(p);
  });
  return c;
}

function addMessage(d: Draft, conversationId: string, senderId: string, body: string, createdAt = nowIso(), id = uid('m')) {
  if (d.messages.some((m) => m.id === id)) return;
  d.messages.push({ id, conversationId, senderId, body, createdAt });
  if (senderId === ME) {
    const c = d.conversations[conversationId];
    if (c) c.lastReadAt[ME] = createdAt;
  }
}

/** Accept a request or invite, keep the listing honest about spaces, and open the game chat. Returns true if accepted */
function acceptRequest(d: Draft, r: JoinRequest): boolean {
  const g = d.games[r.gameId];
  if (!g || r.status !== 'pending') return false;
  const taken = Object.values(d.requests).filter((x) => x.gameId === g.id && x.status === 'accepted').length;
  if (taken >= g.spacesTotal) {
    r.status = 'declined';
    return false;
  }
  r.status = 'accepted';
  const convId = gameChatId(g.id);
  ensureConversation(d, convId, [g.hostId, r.golferId], g.id);
  // the game became full: close off anyone else still waiting
  if (taken + 1 >= g.spacesTotal) {
    Object.values(d.requests).forEach((x) => {
      if (x.gameId === g.id && x.status === 'pending') {
        x.status = 'declined';
        if (x.golferId === ME) {
          notify(d, 'request_declined', 'That game is now full', `${courseById(g.courseId)?.name ?? 'The game'} filled up before your request was confirmed.`, `/game/${g.id}`);
        }
      }
    });
  }
  return true;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(createSeedState);
  const [ready, setReady] = useState(false);
  // who is typing in each conversation right now (not saved)
  const [typing, setTyping] = useState<Record<string, string>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const botReplyCount = useRef(0);
  // latest state, for deciding what demo activity to schedule outside of state updates
  const stateRef = useRef(state);
  stateRef.current = state;

  // load saved state
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as AppState;
          if (parsed.version === STATE_VERSION) {
            // demo profiles created before the profile photo was added pick it up automatically
            const me = parsed.golfers?.me;
            if (me && !me.avatar && me.firstName === 'Adam' && me.lastName === 'Hughes') me.avatar = 'adam';
            // profiles saved before usernames existed get one from their name
            Object.values(parsed.golfers ?? {}).forEach((g) => {
              if (!g.username) g.username = suggestUsername(g.firstName, g.lastName, parsed, g.id);
            });
            // one off: give the demo profile a few saved golfers so My golfers isn't empty
            if (me && (parsed.savedGolferIds ?? []).length === 0 && !(parsed.dismissedTips ?? []).includes('demo-saved-v1')) {
              parsed.savedGolferIds = ['g-ryan', 'g-jamie', 'g-james'].filter((id) => parsed.golfers?.[id]);
            }
            parsed.dismissedTips = [...(parsed.dismissedTips ?? []).filter((t) => t !== 'demo-standard-v1' && t !== 'demo-saved-v1'), 'demo-standard-v1', 'demo-saved-v1'];
            setState(parsed);
          }
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  // save on change
  useEffect(() => {
    if (!ready) return;
    const handle = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [state, ready]);

  const mutate = useCallback((fn: (d: Draft) => void) => {
    setState((prev) => {
      const next: Draft = JSON.parse(JSON.stringify(prev));
      fn(next);
      return next;
    });
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // "Your game is tomorrow" reminders, once per game
  useEffect(() => {
    if (!ready || !state.meId) return;
    const due = myGames(state).filter((g) => dayDiff(new Date(g.teeTime), new Date()) === 1);
    const missing = due.filter((g) => !state.notifications.some((n) => n.kind === 'game_tomorrow' && n.href === `/game/${g.id}`));
    if (missing.length === 0) return;
    mutate((d) => {
      missing.forEach((g) => {
        const c = courseById(g.courseId);
        notify(d, 'game_tomorrow', 'Your game is tomorrow', `${c?.name ?? 'Golf'} at ${formatTime(new Date(g.teeTime))}. Enjoy your round.`, `/game/${g.id}`);
      });
    });
  }, [ready, state, mutate]);

  const completeOnboarding = useCallback(
    (p: ProfileInput) => {
      mutate((d) => {
        d.golfers[ME] = {
          id: ME,
          firstName: p.firstName.trim(),
          lastName: p.lastName.trim(),
          username: p.username && !usernameTaken(d, p.username) ? p.username : suggestUsername(p.firstName, p.lastName, d),
          handicap: p.handicap,
          handicapVerified: false,
          location: p.location,
          radiusMiles: p.radiusMiles,
          homeClub: p.homeClub?.trim() || undefined,
          avatar: p.avatar,
          bio: p.bio.trim(),
          rating: 5,
          gamesPlayed: 1,
          memberSince: new Date().getFullYear(),
          showSurname: p.showSurname ?? true,
          showHomeClub: p.showHomeClub ?? true,
        };
        d.meId = ME;

        // A starter set of activity so every screen has something real to show
        const past: JoinRequest = { id: uid('req'), gameId: 'game-past-gailes', golferId: ME, kind: 'request', status: 'accepted', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() };
        d.requests[past.id] = past;
        const pastChat = gameChatId('game-past-gailes');
        ensureConversation(d, pastChat, ['g-jamie', ME], 'game-past-gailes');
        addMessage(d, pastChat, 'g-jamie', 'Great to meet you today. Would be happy to host again sometime.', new Date(Date.now() - 6 * 86400000 + 5 * 3600000).toISOString());
        d.conversations[pastChat].lastReadAt[ME] = nowIso();

        const upcoming: JoinRequest = { id: uid('req'), gameId: 'game-carrick', golferId: ME, kind: 'request', status: 'accepted', createdAt: new Date(Date.now() - 20 * 3600000).toISOString() };
        d.requests[upcoming.id] = upcoming;
        const chat = gameChatId('game-carrick');
        ensureConversation(d, chat, ['g-james', ME], 'game-carrick');
        const carrick = d.games['game-carrick'];
        addMessage(d, chat, 'g-james', `Welcome aboard! We’re on the tee at ${formatTime(new Date(carrick.teeTime))}. Meet by the pro shop 20 minutes before?`, new Date(Date.now() - 50 * 60000).toISOString());

        const inviteReq: JoinRequest = { id: uid('req'), gameId: 'game-buchanan', golferId: ME, kind: 'invite', status: 'pending', message: 'Saw you’re Glasgow based. Fancy a twilight nine holes plus?', createdAt: new Date(Date.now() - 35 * 60000).toISOString() };
        d.requests[inviteReq.id] = inviteReq;
        notify(d, 'invited', 'Euan invited you to a game', `Buchanan Castle, ${relativeDay(new Date(d.games['game-buchanan'].teeTime))} at ${formatTime(new Date(d.games['game-buchanan'].teeTime))}`, '/messages?tab=requests');
        notify(d, 'request_accepted', 'James accepted your request', `You’re in for The Carrick, ${relativeDay(new Date(carrick.teeTime))}.`, `/game/game-carrick`);
      });
    },
    [mutate],
  );

  const updateProfile = useCallback(
    (patch: Partial<Golfer>) => {
      mutate((d) => {
        if (d.golfers[ME]) d.golfers[ME] = { ...d.golfers[ME], ...patch, id: ME };
      });
    },
    [mutate],
  );

  const postGame = useCallback(
    (input: NewGameInput) => {
      const cloud = !!cloudUser();
      const id = cloud ? newId() : uid('game');
      mutate((d) => {
        d.games[id] = { id, hostId: ME, createdAt: nowIso(), ...input };
      });
      // signed in: the game is real, so it goes to the account and real golfers can ask to join
      if (cloud) {
        postGameCloud(id, input);
        return id;
      }
      // demo: a nearby golfer asks to join a few seconds later
      const candidates = ['g-mark', 'g-priya', 'g-tom', 'g-ryan', 'g-callum'];
      const bot = candidates[Math.floor(Math.random() * candidates.length)];
      later(6000, () => {
        mutate((d) => {
          const g = d.games[id];
          if (!g || g.cancelled || d.blockedIds.includes(bot)) return;
          const r: JoinRequest = { id: uid('req'), gameId: id, golferId: bot, kind: 'request', status: 'pending', message: 'Hi, I’d love to join if there’s still a space. Happy to fit in with whatever you’re playing.', createdAt: nowIso() };
          d.requests[r.id] = r;
          const who = d.golfers[bot];
          notify(d, 'request_received', `${who.firstName} wants to join your game`, `${courseById(g.courseId)?.name ?? 'Your game'}, ${relativeDay(new Date(g.teeTime))} at ${formatTime(new Date(g.teeTime))}`, `/game/${id}`);
        });
      });
      return id;
    },
    [mutate, later],
  );

  const updateGame = useCallback(
    (gameId: string, patch: Partial<NewGameInput>) => {
      const before = stateRef.current.games[gameId];
      if (!before || before.hostId !== ME) return;
      // never fewer spaces than golfers already confirmed
      const taken = acceptedFor(stateRef.current, gameId).length;
      const after = { ...before, ...patch, spacesTotal: Math.max(patch.spacesTotal ?? before.spacesTotal, taken) };
      const changes: string[] = [];
      if (before.teeTime !== after.teeTime) changes.push(`new tee time ${relativeDay(new Date(after.teeTime))} at ${formatTime(new Date(after.teeTime))}`);
      if (before.courseId !== after.courseId) changes.push(`now at ${courseById(after.courseId)?.name ?? 'a new course'}`);
      if (before.costPerGolfer !== after.costPerGolfer) changes.push(after.costPerGolfer === undefined ? 'cost to be sorted on the day' : `£${after.costPerGolfer} each`);
      const note = changes.length ? `I’ve updated the game: ${changes.join(', ')}.` : null;
      const cloud = isCloudId(gameId);
      const noteId = cloud ? newId() : uid('m');
      mutate((d) => {
        const g = d.games[gameId];
        if (!g) return;
        Object.assign(g, patch);
        g.spacesTotal = after.spacesTotal;
        if (!patch.memberHost) delete g.memberHost;
        const chat = d.conversations[gameChatId(gameId)];
        if (chat && note) addMessage(d, chat.id, ME, note, nowIso(), noteId);
      });
      if (cloud) {
        updateGameCloud(gameId, { ...patch, memberHost: !!patch.memberHost, spacesTotal: after.spacesTotal });
        if (note && stateRef.current.conversations[gameChatId(gameId)]) sendMessageCloud(noteId, `game:${gameId}`, note);
      }
    },
    [mutate],
  );

  const leaveGame = useCallback(
    (gameId: string) => {
      const mine = Object.values(stateRef.current.requests).find((x) => x.gameId === gameId && x.golferId === ME && x.status === 'accepted');
      const note = 'Sorry, I can’t make it any more. My space is free for someone else.';
      const cloud = !!mine && isCloudId(mine.id);
      const noteId = cloud ? newId() : uid('m');
      // say goodbye in the chat first, while still allowed to post in it
      if (mine && cloud) sendMessageCloud(noteId, `game:${gameId}`, note).then(() => withdrawCloud(mine.id));
      mutate((d) => {
        const r = Object.values(d.requests).find((x) => x.gameId === gameId && x.golferId === ME && x.status === 'accepted');
        if (!r) return;
        r.status = 'withdrawn';
        const chat = d.conversations[gameChatId(gameId)];
        if (chat) {
          addMessage(d, chat.id, ME, note, nowIso(), noteId);
          chat.participantIds = chat.participantIds.filter((p) => p !== ME);
        }
      });
    },
    [mutate],
  );

  const cancelGame = useCallback(
    (gameId: string) => {
      const note = 'Sorry, I’ve had to cancel this game.';
      const cloud = isCloudId(gameId);
      const noteId = cloud ? newId() : uid('m');
      const hasChat = !!stateRef.current.conversations[gameChatId(gameId)];
      mutate((d) => {
        const g = d.games[gameId];
        if (!g) return;
        g.cancelled = true;
        Object.values(d.requests).forEach((r) => {
          if (r.gameId === gameId && r.status === 'pending') r.status = 'declined';
        });
        const chat = d.conversations[gameChatId(gameId)];
        if (chat) addMessage(d, chat.id, ME, note, nowIso(), noteId);
      });
      if (cloud) {
        if (hasChat) sendMessageCloud(noteId, `game:${gameId}`, note);
        cancelGameCloud(gameId);
      }
    },
    [mutate],
  );

  const requestToJoin = useCallback(
    (gameId: string, message?: string) => {
      const cloud = isCloudId(gameId);
      const rid = cloud ? newId() : uid('req');
      mutate((d) => {
        d.requests[rid] = { id: rid, gameId, golferId: ME, kind: 'request', status: 'pending', message: message?.trim() || undefined, createdAt: nowIso() };
      });
      // a real game: the real host answers
      if (cloud) {
        requestToJoinCloud(gameId, rid, message?.trim() || undefined);
        return rid;
      }
      // demo: the host responds shortly after
      later(4500, () => {
        mutate((d) => {
          const r = d.requests[rid];
          const g = d.games[gameId];
          if (!r || !g || r.status !== 'pending') return;
          const ok = acceptRequest(d, r);
          const host = d.golfers[g.hostId];
          const c = courseById(g.courseId);
          if (ok) {
            notify(d, 'request_accepted', `${host.firstName} accepted your request`, `You’re in for ${c?.name ?? 'the game'}, ${relativeDay(new Date(g.teeTime))} at ${formatTime(new Date(g.teeTime))}.`, `/game/${g.id}`);
            addMessage(d, gameChatId(g.id), g.hostId, `Great to have you along! See you on the first tee at ${formatTime(new Date(g.teeTime))}.`);
          }
        });
      });
      return rid;
    },
    [mutate, later],
  );

  /** Undo a withdraw or decline, as long as the game still has room */
  const restoreRequest = useCallback(
    (requestId: string) => {
      if (isCloudId(requestId)) restoreCloud(requestId);
      mutate((d) => {
        const r = d.requests[requestId];
        const g = r && d.games[r.gameId];
        if (!r || !g || g.cancelled || (r.status !== 'declined' && r.status !== 'withdrawn')) return;
        const taken = Object.values(d.requests).filter((x) => x.gameId === g.id && x.status === 'accepted').length;
        if (taken < g.spacesTotal) r.status = 'pending';
      });
    },
    [mutate],
  );

  const withdrawRequest = useCallback(
    (requestId: string) => {
      if (isCloudId(requestId)) withdrawCloud(requestId);
      mutate((d) => {
        const r = d.requests[requestId];
        if (r) r.status = 'withdrawn';
      });
    },
    [mutate],
  );

  const respond = useCallback(
    (requestId: string, accept: boolean) => {
      const cloud = isCloudId(requestId);
      if (cloud) respondCloud(requestId, accept);
      mutate((d) => {
        const r = d.requests[requestId];
        if (!r || r.status !== 'pending') return;
        const g = d.games[r.gameId];
        if (!accept) {
          r.status = 'declined';
          return;
        }
        if (!acceptRequest(d, r) || !g || cloud) return;
        const chat = gameChatId(g.id);
        if (r.kind === 'request' && g.hostId === ME) {
          // I accepted someone into my game
          addMessage(d, chat, r.golferId, 'Thanks for having me! Looking forward to it.');
        } else if (r.kind === 'invite' && r.golferId === ME) {
          // I accepted an invite
          addMessage(d, chat, ME, 'Count me in, thanks for the invite!');
        }
      });
      // demo: the host replies when I accept their invite
      const r = stateRef.current.requests[requestId];
      const g = r && stateRef.current.games[r.gameId];
      if (!cloud && accept && r && g && r.kind === 'invite' && r.golferId === ME && r.status === 'pending') {
        later(3000, () =>
          mutate((d) => {
            if (d.requests[requestId]?.status !== 'accepted') return;
            addMessage(d, gameChatId(g.id), g.hostId, `Brilliant. Tee time is ${formatTime(new Date(g.teeTime))}, see you there.`);
          }),
        );
      }
    },
    [mutate, later],
  );

  const invite = useCallback(
    (gameId: string, golferId: string) => {
      const cloud = isCloudId(gameId);
      const rid = cloud ? newId() : uid('req');
      mutate((d) => {
        const existing = Object.values(d.requests).find((r) => r.gameId === gameId && r.golferId === golferId && (r.status === 'pending' || r.status === 'accepted'));
        if (existing) return;
        d.requests[rid] = { id: rid, gameId, golferId, kind: 'invite', status: 'pending', createdAt: nowIso() };
      });
      if (cloud) {
        inviteCloud(gameId, golferId, rid);
        return;
      }
      // demo: invited golfers say yes
      later(4000, () => {
        mutate((d) => {
          const r = d.requests[rid];
          if (!r || r.status !== 'pending') return;
          const g = d.games[gameId];
          if (!acceptRequest(d, r)) return;
          const who = d.golfers[golferId];
          notify(d, 'request_accepted', `${who.firstName} accepted your invite`, `${courseById(g.courseId)?.name ?? 'Your game'}, ${relativeDay(new Date(g.teeTime))}.`, `/game/${gameId}`);
          addMessage(d, gameChatId(gameId), golferId, 'Thanks for the invite, I’m in!');
        });
      });
    },
    [mutate, later],
  );

  const openDirect = useCallback(
    (otherId: string, gameId?: string) => {
      const id = directChatId(ME, otherId);
      mutate((d) => {
        ensureConversation(d, id, [ME, otherId], gameId);
      });
      return id;
    },
    [mutate],
  );

  const sendMessage = useCallback(
    (convId: string, body: string) => {
      const text = body.trim();
      if (!text) return;
      const key = cloudConvKey(stateRef.current.conversations[convId], ME);
      const id = key ? newId() : uid('m');
      mutate((d) => {
        addMessage(d, convId, ME, text, nowIso(), id);
      });
      if (key) {
        sendMessageCloud(id, key, text);
        return;
      }
      const s = stateRef.current;
      const who = s.conversations[convId]?.participantIds.find((p) => p !== ME && !s.blockedIds.includes(p));
      // real golfers answer for themselves
      if (!who || isCloudId(who)) return;
      const n = botReplyCount.current++;
      // demo: they read it, start typing, then reply
      later(900, () =>
        mutate((d) => {
          const c = d.conversations[convId];
          if (c) c.lastReadAt[who] = nowIso();
        }),
      );
      later(1400, () => setTyping((t) => ({ ...t, [convId]: who })));
      later(3200, () => {
        setTyping((t) => {
          const next = { ...t };
          delete next[convId];
          return next;
        });
        mutate((d) => {
          addMessage(d, convId, who, botReplyFor(text, n));
        });
      });
    },
    [mutate, later],
  );

  const markRead = useCallback(
    (convId: string) => {
      mutate((d) => {
        const c = d.conversations[convId];
        if (c) c.lastReadAt[ME] = nowIso();
      });
      const key = cloudConvKey(stateRef.current.conversations[convId], ME);
      if (key) markReadCloud(key);
    },
    [mutate],
  );

  const markNotificationsRead = useCallback(() => {
    mutate((d) => {
      d.notifications.forEach((n) => (n.read = true));
    });
  }, [mutate]);

  const toggleSaved = useCallback(
    (golferId: string) => {
      mutate((d) => {
        d.savedGolferIds = d.savedGolferIds.includes(golferId)
          ? d.savedGolferIds.filter((x) => x !== golferId)
          : [...d.savedGolferIds, golferId];
      });
    },
    [mutate],
  );

  const block = useCallback(
    (golferId: string) => {
      mutate((d) => {
        if (!d.blockedIds.includes(golferId)) d.blockedIds.push(golferId);
        d.savedGolferIds = d.savedGolferIds.filter((x) => x !== golferId);
      });
    },
    [mutate],
  );

  const unblock = useCallback(
    (golferId: string) => {
      mutate((d) => {
        d.blockedIds = d.blockedIds.filter((x) => x !== golferId);
      });
    },
    [mutate],
  );

  const report = useCallback(
    (golferId: string, reason: ReportReason, note?: string) => {
      mutate((d) => {
        d.reports.push({ id: uid('rep'), golferId, reason, note, createdAt: nowIso() });
      });
    },
    [mutate],
  );

  const rateGolfer = useCallback(
    (gameId: string, golferId: string, patch: Partial<Pick<RoundFeedback, 'showedUp' | 'thumbs'>>) => {
      mutate((d) => {
        d.feedback = d.feedback ?? [];
        let f = d.feedback.find((x) => x.gameId === gameId && x.golferId === golferId);
        if (!f) {
          f = { gameId, golferId, createdAt: nowIso() };
          d.feedback.push(f);
        }
        Object.assign(f, patch);
      });
    },
    [mutate],
  );

  const finishRound = useCallback(
    (gameId: string) => {
      mutate((d) => {
        d.roundsDone = [...(d.roundsDone ?? []).filter((x) => x !== gameId), gameId];
      });
    },
    [mutate],
  );

  const dismissTip = useCallback(
    (key: string) => {
      mutate((d) => {
        d.dismissedTips = [...(d.dismissedTips ?? []).filter((x) => x !== key), key];
      });
    },
    [mutate],
  );

  const mergeCloud = useCallback(
    (snap: CloudSnapshot, prevFriends: CloudFriends | null) => {
      mutate((d) => {
        const first = !d.cloudSyncedAt;
        const prevRequests = new Map(Object.values(d.requests).filter((r) => isCloudId(r.id)).map((r) => [r.id, r]));
        const prevCancelled = new Set(Object.values(d.games).filter((g) => isCloudId(g.id) && g.cancelled).map((g) => g.id));

        // the account is the truth for everything real; demo golfers and games stay as they are
        Object.keys(d.golfers).forEach((id) => isCloudId(id) && delete d.golfers[id]);
        Object.keys(d.games).forEach((id) => isCloudId(id) && delete d.games[id]);
        Object.keys(d.requests).forEach((id) => isCloudId(id) && delete d.requests[id]);
        snap.golfers.forEach((g) => (d.golfers[g.id] = g));
        snap.games.forEach((g) => (d.games[g.id] = g));
        snap.requests.forEach((r) => (d.requests[r.id] = r));

        // a chat for every real game I'm playing in
        snap.games.forEach((g) => {
          const players = [g.hostId, ...snap.requests.filter((r) => r.gameId === g.id && r.status === 'accepted').map((r) => r.golferId)];
          if (players.includes(ME) && players.length > 1) ensureConversation(d, gameChatId(g.id), players, g.id);
          // whoever has left drops out of the chat, me included
          const chat = d.conversations[gameChatId(g.id)];
          if (chat) chat.participantIds = players;
        });

        if (!first) {
          const name = (id: string) => d.golfers[id]?.firstName ?? 'A golfer';
          snap.requests.forEach((r) => {
            const g = d.games[r.gameId];
            if (!g) return;
            const p = prevRequests.get(r.id);
            const changed = !p || p.status !== r.status;
            if (!changed) return;
            const where = `${courseById(g.courseId)?.name ?? 'Golf'}, ${relativeDay(new Date(g.teeTime))} at ${formatTime(new Date(g.teeTime))}`;
            if (r.status === 'pending' && r.kind === 'request' && g.hostId === ME) {
              notify(d, 'request_received', `${name(r.golferId)} wants to join your game`, where, `/game/${g.id}`);
            } else if (r.status === 'pending' && r.kind === 'invite' && r.golferId === ME) {
              notify(d, 'invited', `${name(g.hostId)} invited you to a game`, where, '/messages?tab=requests');
            } else if (p?.status === 'pending' && r.status === 'accepted' && r.kind === 'request' && r.golferId === ME) {
              notify(d, 'request_accepted', `${name(g.hostId)} accepted your request`, `You’re in for ${where}.`, `/game/${g.id}`);
            } else if (p?.status === 'pending' && r.status === 'accepted' && r.kind === 'invite' && g.hostId === ME) {
              notify(d, 'request_accepted', `${name(r.golferId)} accepted your invite`, where, `/game/${g.id}`);
            } else if (p?.status === 'pending' && r.status === 'declined' && r.kind === 'request' && r.golferId === ME && !g.cancelled) {
              notify(d, 'request_declined', 'Not this time', `${name(g.hostId)}’s game at ${where} is sorted. Plenty more out there.`, `/game/${g.id}`);
            } else if (p?.status === 'accepted' && r.status === 'withdrawn' && g.hostId === ME) {
              notify(d, 'space_available', `${name(r.golferId)} can’t make it`, `A space has opened up in your game at ${where}.`, `/game/${g.id}`);
            }
          });
          snap.games.forEach((g) => {
            const inIt = snap.requests.some((r) => r.gameId === g.id && r.golferId === ME && r.status === 'accepted');
            if (g.cancelled && !prevCancelled.has(g.id) && inIt) {
              notify(d, 'request_declined', `${name(g.hostId)} cancelled the game`, `${courseById(g.courseId)?.name ?? 'Your game'}, ${relativeDay(new Date(g.teeTime))}.`, `/game/${g.id}`);
            }
          });
          if (prevFriends) {
            snap.friends.incoming
              .filter((f) => !prevFriends.incoming.some((x) => x.golferId === f.golferId))
              .forEach((f) => notify(d, 'friend_request', `${name(f.golferId)} wants to be friends`, f.note ?? 'Accept to invite each other to games and message.', '/friends'));
            snap.friends.friends
              .filter((id) => prevFriends.outgoing.includes(id))
              .forEach((id) => notify(d, 'friend_accepted', `You and ${name(id)} are now friends`, 'You can invite each other to games and message.', `/golfer/${id}`));
          }
        }
        // messages: the account's copy wins, apart from ones this phone is still sending
        d.messages = d.messages.filter((m) => !isCloudId(m.id) || isUnconfirmed(m.id));
        const have = new Set(d.messages.map((m) => m.id));
        snap.messages.forEach((m) => !have.has(m.id) && d.messages.push(m));
        d.messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        snap.directChats.forEach(({ id, other }) => ensureConversation(d, id, [ME, other]));
        snap.reads.forEach((r) => {
          const c = d.conversations[r.conversationId];
          if (c && (c.lastReadAt[r.golferId] ?? '') < r.at) c.lastReadAt[r.golferId] = r.at;
        });
        d.cloudSyncedAt = nowIso();
      });
    },
    [mutate],
  );

  const receiveCloudMessage = useCallback(
    (m: Message, gameId?: string, other?: string) => {
      mutate((d) => {
        if (d.messages.some((x) => x.id === m.id)) return;
        ensureConversation(d, m.conversationId, other ? [ME, other] : [m.senderId, ME], gameId);
        d.messages.push(m);
        if (m.senderId === ME) d.conversations[m.conversationId].lastReadAt[ME] = m.createdAt;
      });
      // their message has landed, so they've stopped typing
      setTyping((t) => {
        if (t[m.conversationId] !== m.senderId) return t;
        const next = { ...t };
        delete next[m.conversationId];
        return next;
      });
    },
    [mutate],
  );

  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const showTyping = useCallback((convId: string, who: string) => {
    setTyping((t) => (t[convId] === who ? t : { ...t, [convId]: who }));
    clearTimeout(typingTimers.current[convId]);
    typingTimers.current[convId] = setTimeout(() => {
      setTyping((t) => {
        if (!t[convId]) return t;
        const next = { ...t };
        delete next[convId];
        return next;
      });
    }, 4000);
  }, []);

  const resetDemo = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    AsyncStorage.removeItem('findfore:search-filters').catch(() => {});
    setState(createSeedState());
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      state,
      typing,
      me: state.meId ? state.golfers[state.meId] ?? null : null,
      completeOnboarding,
      updateProfile,
      postGame,
      cancelGame,
      updateGame,
      leaveGame,
      requestToJoin,
      restoreRequest,
      withdrawRequest,
      respond,
      invite,
      openDirect,
      sendMessage,
      markRead,
      markNotificationsRead,
      toggleSaved,
      block,
      unblock,
      report,
      rateGolfer,
      finishRound,
      dismissTip,
      resetDemo,
      mergeCloud,
      receiveCloudMessage,
      showTyping,
    }),
    [ready, state, typing, completeOnboarding, updateProfile, postGame, cancelGame, updateGame, leaveGame, requestToJoin, restoreRequest, withdrawRequest, respond, invite, openDirect, sendMessage, markRead, markNotificationsRead, toggleSaved, block, unblock, report, rateGolfer, finishRound, dismissTip, resetDemo, mergeCloud, receiveCloudMessage, showTyping],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
