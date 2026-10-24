
export type HandicapPreference = { kind: 'any' } | { kind: 'max'; max: number } | { kind: 'range'; min: number; max: number };

export type TimeOfDay = 'early' | 'morning' | 'afternoon' | 'evening' | 'any';

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

/** One course at a club, e.g. the Allander at Hilton Park */
export interface Layout {
  name: string;
  holes?: number;
}

export interface Course {
  id: string;
  name: string;
  town: string;
  region: string;
  lat: number;
  lng: number;
  visitorFee?: number;
  /** Home nation. Anything not marked is treated as Scotland or England by region. */
  country?: 'scotland' | 'england' | 'ireland' | 'wales';
  website?: string;
  phone?: string;
  holes?: number;
  /** The club's courses, where it has more than one. Written up by us, never by golfers. */
  layouts?: Layout[];
  /** An older or other name the club is known by, e.g. Castle Stuart for Cabot Highlands. Searched and matched, never shown. */
  aka?: string;
  /** Where the details came from: our own notes, or OpenStreetMap */
  source?: 'plusfore' | 'osm';
}

export interface Golfer {
  id: string;
  firstName: string;
  lastName: string;
  /** Unique handle, searched for as @username */
  username: string;
  handicap: number;
  handicapVerified: boolean;
  location: Place;
  radiusMiles: number;
  homeClub?: string;
  bio: string;
  avatar?: string; // key into the bundled demo avatars
  /** A photo the golfer chose themselves; wins over the demo avatar */
  photoUri?: string;
  /** How many friends they have on PlusFore: a sign of how active they are, not a score */
  friendCount?: number;
  gamesPlayed: number;
  memberSince: number;
  showSurname: boolean;
  showHomeClub: boolean;
}

export interface Game {
  id: string;
  hostId: string;
  courseId: string;
  /** Which course at the club, for clubs with more than one */
  layout?: string;
  teeTime: string; // ISO date time
  spacesTotal: number; // spaces offered to other golfers
  costPerGolfer?: number;
  /** The host is a member at this club, so the price is a guest rate rather than the visitor fee */
  memberHost?: boolean;
  visitorFee?: number;
  handicap: HandicapPreference;
  description: string;
  createdAt: string;
  cancelled?: boolean;
}


export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface JoinRequest {
  id: string;
  gameId: string;
  golferId: string; // the golfer who wants a space
  kind: 'request' | 'invite'; // request: golfer asked the host. invite: host asked the golfer
  status: RequestStatus;
  message?: string;
  createdAt: string;
  /** Set when the host took a confirmed player out of the game (the request then reads declined) */
  removedAt?: string;
}

export interface Gif {
  url: string;
  width: number;
  height: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  /** Golfers @mentioned in the message, by id ('me' for you) */
  mentions?: string[];
  /** A GIF from KLIPY, sent in place of text (the text then just says "GIF") */
  gif?: Gif;
  /** Emoji reactions, one per golfer, by golfer id */
  reactions?: Record<string, string>;
}

export interface Conversation {
  id: string;
  gameId?: string;
  participantIds: string[];
  lastReadAt: Record<string, string>;
}

export type NotificationKind =
  | 'request_received'
  | 'request_accepted'
  | 'request_declined'
  | 'invited'
  | 'match_found'
  | 'message'
  | 'game_tomorrow'
  | 'space_available'
  | 'friend_request'
  | 'friend_accepted';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
}

export type ReportReason = 'no_show' | 'inappropriate' | 'spam' | 'misuse' | 'other';

export interface Report {
  id: string;
  golferId: string;
  reason: ReportReason;
  note?: string;
  createdAt: string;
}

/** Private post round feedback about a playing partner */
export interface RoundFeedback {
  gameId: string;
  golferId: string;
  showedUp?: boolean;
  thumbs?: 'up' | 'down';
  createdAt: string;
}

export interface AppState {
  version: number;
  meId: string | null;
  golfers: Record<string, Golfer>;
  games: Record<string, Game>;
  requests: Record<string, JoinRequest>;
  conversations: Record<string, Conversation>;
  messages: Message[];
  notifications: AppNotification[];
  savedGolferIds: string[];
  blockedIds: string[];
  reports: Report[];
  feedback?: RoundFeedback[];
  roundsDone?: string[]; // past games already checked in on
  dismissedTips?: string[];
  /** When games and friends were last loaded from the account; notifications only fire after the first load */
  cloudSyncedAt?: string;
  /** Chats deleted from this golfer's list: messages up to this time are hidden */
  clearedAt?: Record<string, string>;
}
