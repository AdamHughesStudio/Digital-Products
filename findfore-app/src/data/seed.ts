import { places } from './courses';
import type { AppState, Game, Golfer, LookingPost } from './types';
import { isoDate } from '@/lib/format';

export const STATE_VERSION = 1;

const place = (name: string) => places.find((p) => p.name === name)!;

/** A tee time `days` from today at hh:mm, as an ISO string */
function teeTime(days: number, hh: number, mm: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600000).toISOString();
}

/** Next date (0 to 6 days away) that falls on the given weekday, 0 = Sunday */
function nextWeekday(day: number, minOffset = 1) {
  const today = new Date().getDay();
  let diff = (day - today + 7) % 7;
  if (diff < minOffset) diff += 7;
  return diff;
}

const golfer = (g: Partial<Golfer> & Pick<Golfer, 'id' | 'firstName' | 'lastName' | 'handicap'>): Golfer => ({
  handicapVerified: false,
  location: place('Glasgow'),
  radiusMiles: 25,
  bio: '',
  rating: 4.8,
  gamesPlayed: 6,
  memberSince: 2025,
  showSurname: true,
  showHomeClub: true,
  ...g,
});

export const demoGolfers: Golfer[] = [
  golfer({ id: 'g-ryan', firstName: 'Ryan', lastName: 'McCall', handicap: 9.8, handicapVerified: true, location: place('Troon'), homeClub: 'Kilmarnock (Barassie) Golf Club', avatar: 'ryan', rating: 4.9, gamesPlayed: 23, bio: 'Weekend golfer, weekday dreamer. Always up for a links game and a pint after.' }),
  golfer({ id: 'g-jamie', firstName: 'Jamie', lastName: 'Wilson', handicap: 6.2, handicapVerified: true, location: place('Troon'), homeClub: 'Western Gailes Golf Club', avatar: 'jamie', rating: 5.0, gamesPlayed: 31, bio: 'Member at Western Gailes. Happy to host guests who love proper links golf.' }),
  golfer({ id: 'g-tom', firstName: 'Tom', lastName: 'Fraser', handicap: 14.5, location: place('Glasgow'), homeClub: 'Haggs Castle Golf Club', avatar: 'tom', rating: 4.7, gamesPlayed: 12, bio: 'Competitive enough to care, not enough to ruin anyone’s afternoon.' }),
  golfer({ id: 'g-james', firstName: 'James', lastName: 'Carter', handicap: 8.4, handicapVerified: true, location: place('Troon'), homeClub: 'Royal Troon Golf Club', avatar: 'james', rating: 4.9, gamesPlayed: 42, memberSince: 2024, bio: 'Passionate golfer, always up for a round and meeting new people on the course. Usually playing midweek but flexible.' }),
  golfer({ id: 'g-sophie', firstName: 'Sophie', lastName: 'Grant', handicap: 18.3, location: place('Edinburgh'), homeClub: 'Braid Hills Golf Course', rating: 4.8, gamesPlayed: 9, bio: 'Picked the game up three years ago and completely hooked. Looking to play new courses.' }),
  golfer({ id: 'g-callum', firstName: 'Callum', lastName: 'Reid', handicap: 3.1, handicapVerified: true, location: place('Glasgow'), homeClub: 'Pollok Golf Club', rating: 4.9, gamesPlayed: 27, bio: 'Club competitions most weekends. Happy to play with any standard.' }),
  golfer({ id: 'g-priya', firstName: 'Priya', lastName: 'Shah', handicap: 22.0, location: place('Glasgow'), rating: 5.0, gamesPlayed: 4, bio: 'Relatively new to golf and keen to play more. Friendly games please!' }),
  golfer({ id: 'g-euan', firstName: 'Euan', lastName: 'MacLeod', handicap: 11.0, location: place('Stirling'), homeClub: 'Buchanan Castle Golf Club', rating: 4.6, gamesPlayed: 15, bio: 'Twilight golf is the best golf. Usually out after work in summer.' }),
  golfer({ id: 'g-hannah', firstName: 'Hannah', lastName: 'Doyle', handicap: 12.7, location: place('St Andrews'), homeClub: 'Crail Golfing Society', rating: 4.8, gamesPlayed: 18, bio: 'Fife based. Love a quick round and a coffee after.' }),
  golfer({ id: 'g-mark', firstName: 'Mark', lastName: 'Bennett', handicap: 16.4, location: place('Glasgow'), rating: 4.5, gamesPlayed: 7, bio: 'Moved to Glasgow last year and looking to meet people to play with.' }),
];

export const BOT_IDS = demoGolfers.map((g) => g.id);

function demoGames(): Game[] {
  const sat = nextWeekday(6);
  const sun = nextWeekday(0);
  return [
    { id: 'game-haggs', hostId: 'g-tom', courseId: 'haggs-castle', teeTime: teeTime(1, 10, 20), spacesTotal: 1, costPerGolfer: 25, type: 'casual', handicap: { kind: 'any' }, description: 'My usual playing partner can’t make it. Looking for someone to join me for a casual round.', createdAt: hoursAgo(3) },
    { id: 'game-dundonald', hostId: 'g-ryan', courseId: 'dundonald', teeTime: teeTime(sun, 14, 10), spacesTotal: 2, costPerGolfer: 60, type: 'open', handicap: { kind: 'any' }, description: 'Two of us playing Sunday afternoon. Happy for another couple of golfers to join.', createdAt: hoursAgo(9) },
    { id: 'game-western', hostId: 'g-jamie', courseId: 'western-gailes', teeTime: teeTime(sun, 11, 30), spacesTotal: 1, costPerGolfer: 45, visitorFee: 225, type: 'member_guest', handicap: { kind: 'max', max: 24 }, description: 'I’m a member and looking for someone to join me Sunday morning. Club dress code applies.', createdAt: hoursAgo(20) },
    { id: 'game-cathkin', hostId: 'g-priya', courseId: 'cathkin-braes', teeTime: teeTime(sat, 9, 40), spacesTotal: 1, costPerGolfer: 20, type: 'casual', handicap: { kind: 'any' }, description: 'Beginner friendly. Just want a relaxed round and some good company.', createdAt: hoursAgo(1) },
    { id: 'game-carrick', hostId: 'g-james', courseId: 'carrick', teeTime: teeTime(sat, 13, 10), spacesTotal: 2, costPerGolfer: 80, visitorFee: 150, type: 'member_guest', handicap: { kind: 'any' }, description: 'Member guest rate at The Carrick. Two spaces, lunch in the clubhouse after if you fancy it.', createdAt: hoursAgo(30) },
    { id: 'game-buchanan', hostId: 'g-euan', courseId: 'buchanan-castle', teeTime: teeTime(2, 16, 40), spacesTotal: 3, costPerGolfer: 30, type: 'casual', handicap: { kind: 'any' }, description: 'Twilight round after work. Friendly game, £5 Stableford between us.', createdAt: hoursAgo(6) },
    { id: 'game-pollok', hostId: 'g-callum', courseId: 'pollok', teeTime: teeTime(sat + 7, 8, 0), spacesTotal: 3, costPerGolfer: 35, type: 'competition', handicap: { kind: 'max', max: 24 }, description: 'Gents Open at Pollok. Entering as a group, need three more to make up our team.', createdAt: hoursAgo(48) },
    { id: 'game-bruntsfield', hostId: 'g-sophie', courseId: 'braids', teeTime: teeTime(3, 8, 30), spacesTotal: 2, costPerGolfer: 30, type: 'casual', handicap: { kind: 'any' }, description: 'Early round at the Braids, great views and no pressure.', createdAt: hoursAgo(12) },
    { id: 'game-crail', hostId: 'g-hannah', courseId: 'crail', teeTime: teeTime(sun, 9, 50), spacesTotal: 1, costPerGolfer: 55, type: 'member_guest', visitorFee: 110, handicap: { kind: 'any' }, description: 'Member at Crail. One guest space for Balcomie on Sunday.', createdAt: hoursAgo(15) },
    { id: 'game-society', hostId: 'g-mark', courseId: 'east-renfrewshire', teeTime: teeTime(9, 12, 0), spacesTotal: 3, costPerGolfer: 50, type: 'society', handicap: { kind: 'range', min: 5, max: 28 }, description: 'Work society day, a few people have dropped out. Food and prizes included.', createdAt: hoursAgo(26) },
    // a round the new golfer has already played, so past games are not empty
    { id: 'game-past-gailes', hostId: 'g-jamie', courseId: 'western-gailes', teeTime: teeTime(-6, 10, 40), spacesTotal: 1, costPerGolfer: 45, visitorFee: 225, type: 'member_guest', handicap: { kind: 'any' }, description: 'Member guest morning round.', createdAt: hoursAgo(24 * 10) },
  ];
}

function demoLooking(): LookingPost[] {
  const sat = nextWeekday(6);
  const sun = nextWeekday(0);
  return [
    { id: 'look-mark', golferId: 'g-mark', location: place('Glasgow'), radiusMiles: 25, dates: [daysFromNow(sat)], timeOfDay: 'morning', message: 'Don’t mind where we play. Happy to join an existing game or arrange something.', createdAt: hoursAgo(2) },
    { id: 'look-sophie', golferId: 'g-sophie', location: place('Edinburgh'), radiusMiles: 30, dates: [daysFromNow(sun)], timeOfDay: 'any', budget: 60, message: 'Happy to play pretty much anywhere. Ideally looking to try somewhere new.', createdAt: hoursAgo(5) },
    { id: 'look-priya', golferId: 'g-priya', location: place('Glasgow'), radiusMiles: 15, dates: [daysFromNow(2), daysFromNow(3)], timeOfDay: 'evening', message: 'Keen to get out after work this week. Any course, any standard.', createdAt: hoursAgo(7) },
    { id: 'look-hannah', golferId: 'g-hannah', location: place('St Andrews'), radiusMiles: 40, dates: [daysFromNow(sat), daysFromNow(sun)], timeOfDay: 'early', message: 'Early starts please! Would love a game at Kingsbarns or Crail.', createdAt: hoursAgo(11) },
  ];
}

export function createSeedState(): AppState {
  const golfers: AppState['golfers'] = {};
  demoGolfers.forEach((g) => (golfers[g.id] = g));
  const games: AppState['games'] = {};
  demoGames().forEach((g) => (games[g.id] = g));
  const looking: AppState['looking'] = {};
  demoLooking().forEach((l) => (looking[l.id] = l));

  // other golfers already requesting or confirmed on some games, so the feed shows real activity
  const requests: AppState['requests'] = {
    'req-seed-1': { id: 'req-seed-1', gameId: 'game-dundonald', golferId: 'g-callum', kind: 'request', status: 'accepted', createdAt: hoursAgo(6) },
    'req-seed-2': { id: 'req-seed-2', gameId: 'game-pollok', golferId: 'g-tom', kind: 'request', status: 'accepted', createdAt: hoursAgo(40) },
  };

  return {
    version: STATE_VERSION,
    meId: null,
    golfers,
    games,
    looking,
    requests,
    conversations: {},
    messages: [],
    notifications: [],
    savedGolferIds: [],
    blockedIds: [],
    reports: [],
  };
}
