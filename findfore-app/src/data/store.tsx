import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { courseById } from './courses';
import { createSeedState, STATE_VERSION } from './seed';
import type {
  AppNotification,
  AppState,
  Game,
  GameType,
  Golfer,
  HandicapPreference,
  JoinRequest,
  LookingPost,
  NotificationKind,
  Place,
  ReportReason,
  RoundFeedback,
  TimeOfDay,
} from './types';
import { dayDiff, distanceMiles, formatTime, handicapFits, isoDate, relativeDay, timeOfDayFor } from '@/lib/format';

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

export function gameMatchesLooking(s: AppState, g: Game, l: LookingPost) {
  const course = courseById(g.courseId);
  if (!course || g.cancelled || isFull(s, g) || isPast(g)) return false;
  if (g.hostId === l.golferId) return false;
  if (distanceMiles(course, l.location) > l.radiusMiles) return false;
  const d = new Date(g.teeTime);
  if (!l.dates.includes(isoDate(d))) return false;
  if (l.timeOfDay !== 'any' && timeOfDayFor(d) !== l.timeOfDay) return false;
  if (l.budget !== undefined && (g.costPerGolfer ?? 0) > l.budget) return false;
  const golfer = s.golfers[l.golferId];
  if (golfer && !handicapFits(g.handicap, golfer.handicap)) return false;
  return true;
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
  type: GameType;
  handicap: HandicapPreference;
  description: string;
}

export interface NewLookingInput {
  location: Place;
  radiusMiles: number;
  dates: string[];
  timeOfDay: TimeOfDay;
  budget?: number;
  message: string;
}

export type ProfileInput = Pick<Golfer, 'firstName' | 'lastName' | 'handicap' | 'location' | 'radiusMiles' | 'bio'> &
  Partial<Pick<Golfer, 'homeClub' | 'showSurname' | 'showHomeClub'>>;

interface Store {
  ready: boolean;
  state: AppState;
  me: Golfer | null;
  completeOnboarding: (p: ProfileInput) => void;
  updateProfile: (patch: Partial<Golfer>) => void;
  postGame: (g: NewGameInput) => string;
  cancelGame: (gameId: string) => void;
  postLooking: (l: NewLookingInput) => string;
  closeLooking: (id: string) => void;
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

function addMessage(d: Draft, conversationId: string, senderId: string, body: string, createdAt = nowIso()) {
  d.messages.push({ id: uid('m'), conversationId, senderId, body, createdAt });
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
          if (parsed.version === STATE_VERSION) setState(parsed);
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
          handicap: p.handicap,
          handicapVerified: false,
          location: p.location,
          radiusMiles: p.radiusMiles,
          homeClub: p.homeClub?.trim() || undefined,
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
      const id = uid('game');
      mutate((d) => {
        d.games[id] = { id, hostId: ME, createdAt: nowIso(), ...input };
      });
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

  const cancelGame = useCallback(
    (gameId: string) => {
      mutate((d) => {
        const g = d.games[gameId];
        if (!g) return;
        g.cancelled = true;
        Object.values(d.requests).forEach((r) => {
          if (r.gameId === gameId && r.status === 'pending') r.status = 'declined';
        });
        const chat = d.conversations[gameChatId(gameId)];
        if (chat) addMessage(d, chat.id, ME, 'Sorry, I’ve had to cancel this game.');
      });
    },
    [mutate],
  );

  const postLooking = useCallback(
    (input: NewLookingInput) => {
      const id = uid('look');
      mutate((d) => {
        Object.values(d.looking).forEach((l) => {
          if (l.golferId === ME) l.closed = true; // one active availability post at a time
        });
        d.looking[id] = { id, golferId: ME, createdAt: nowIso(), ...input };
      });
      // demo: the matching layer finds a game shortly after posting
      later(5000, () => {
        mutate((d) => {
          const l = d.looking[id];
          if (!l || l.closed) return;
          const match = Object.values(d.games)
            .filter((g) => g.hostId !== ME && !d.blockedIds.includes(g.hostId) && gameMatchesLooking(d, g, l))
            .sort((a, b) => a.teeTime.localeCompare(b.teeTime))[0];
          if (match) {
            const c = courseById(match.courseId)!;
            const miles = Math.round(distanceMiles(c, l.location));
            notify(d, 'match_found', 'We found a game for you', `${c.name} matches what you’re looking for. ${relativeDay(new Date(match.teeTime))} at ${formatTime(new Date(match.teeTime))}, ${miles} miles away.`, `/game/${match.id}`);
          } else {
            notify(d, 'match_found', 'You’re visible to nearby golfers', 'No games match yet. We’ll let you know as soon as one does.', `/looking/${id}`);
          }
        });
      });
      return id;
    },
    [mutate, later],
  );

  const closeLooking = useCallback(
    (id: string) => {
      mutate((d) => {
        if (d.looking[id]) d.looking[id].closed = true;
      });
    },
    [mutate],
  );

  const requestToJoin = useCallback(
    (gameId: string, message?: string) => {
      const rid = uid('req');
      mutate((d) => {
        d.requests[rid] = { id: rid, gameId, golferId: ME, kind: 'request', status: 'pending', message: message?.trim() || undefined, createdAt: nowIso() };
      });
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
      mutate((d) => {
        const r = d.requests[requestId];
        if (r) r.status = 'withdrawn';
      });
    },
    [mutate],
  );

  const respond = useCallback(
    (requestId: string, accept: boolean) => {
      mutate((d) => {
        const r = d.requests[requestId];
        if (!r || r.status !== 'pending') return;
        const g = d.games[r.gameId];
        if (!accept) {
          r.status = 'declined';
          return;
        }
        if (!acceptRequest(d, r) || !g) return;
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
      if (accept && r && g && r.kind === 'invite' && r.golferId === ME && r.status === 'pending') {
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
      const rid = uid('req');
      mutate((d) => {
        const existing = Object.values(d.requests).find((r) => r.gameId === gameId && r.golferId === golferId && (r.status === 'pending' || r.status === 'accepted'));
        if (existing) return;
        d.requests[rid] = { id: rid, gameId, golferId, kind: 'invite', status: 'pending', createdAt: nowIso() };
      });
      // demo: invited golfers say yes
      later(4000, () => {
        mutate((d) => {
          const r = d.requests[rid];
          if (!r || r.status !== 'pending') return;
          if (!acceptRequest(d, r)) return;
          const g = d.games[gameId];
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
      mutate((d) => {
        addMessage(d, convId, ME, text);
      });
      const s = stateRef.current;
      const who = s.conversations[convId]?.participantIds.find((p) => p !== ME && !s.blockedIds.includes(p));
      if (!who) return;
      const n = botReplyCount.current++;
      later(2600, () => {
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
      me: state.meId ? state.golfers[state.meId] ?? null : null,
      completeOnboarding,
      updateProfile,
      postGame,
      cancelGame,
      postLooking,
      closeLooking,
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
    }),
    [ready, state, completeOnboarding, updateProfile, postGame, cancelGame, postLooking, closeLooking, requestToJoin, restoreRequest, withdrawRequest, respond, invite, openDirect, sendMessage, markRead, markNotificationsRead, toggleSaved, block, unblock, report, rateGolfer, finishRound, dismissTip, resetDemo],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
