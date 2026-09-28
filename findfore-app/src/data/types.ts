export type GameType = 'casual' | 'member_guest' | 'competition' | 'society' | 'open';

export type HandicapPreference = { kind: 'any' } | { kind: 'max'; max: number } | { kind: 'range'; min: number; max: number };

export type TimeOfDay = 'early' | 'morning' | 'afternoon' | 'evening' | 'any';

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

export interface Course {
  id: string;
  name: string;
  town: string;
  region: string;
  lat: number;
  lng: number;
  visitorFee?: number;
}

export interface Golfer {
  id: string;
  firstName: string;
  lastName: string;
  handicap: number;
  handicapVerified: boolean;
  location: Place;
  radiusMiles: number;
  homeClub?: string;
  bio: string;
  avatar?: string; // key into the bundled demo avatars
  rating: number; // share of "would play again", 0 to 5 scale for display
  gamesPlayed: number;
  memberSince: number;
  showSurname: boolean;
  showHomeClub: boolean;
}

export interface Game {
  id: string;
  hostId: string;
  courseId: string;
  teeTime: string; // ISO date time
  spacesTotal: number; // spaces offered to other golfers
  costPerGolfer?: number;
  visitorFee?: number; // shown on member guest games for comparison
  type: GameType;
  handicap: HandicapPreference;
  description: string;
  createdAt: string;
  cancelled?: boolean;
}

export interface LookingPost {
  id: string;
  golferId: string;
  location: Place;
  radiusMiles: number;
  dates: string[]; // ISO dates (yyyy-mm-dd)
  timeOfDay: TimeOfDay;
  budget?: number;
  message: string;
  createdAt: string;
  closed?: boolean;
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
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
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
  | 'space_available';

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

/** One line in the credits history. Positive amounts are earned, negative are spent */
export interface CreditEntry {
  id: string;
  amount: number;
  reason: string;
  gameId?: string;
  createdAt: string;
}

export interface ProPlan {
  since: string;
  renewsAt: string; // next date monthly credits are added
}

export interface Credits {
  balance: number;
  history: CreditEntry[];
  pro?: ProPlan;
}

export interface AppState {
  version: number;
  meId: string | null;
  golfers: Record<string, Golfer>;
  games: Record<string, Game>;
  looking: Record<string, LookingPost>;
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
  credits?: Credits;
}
