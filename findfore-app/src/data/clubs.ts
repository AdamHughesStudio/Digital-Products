import { CLUB_EVENTS, courseCountry, eventTitle, type ClubEvent } from './club-events';
import { courseById, courses } from './courses';
import { EVENTS, associationById, type AmateurEvent } from './events';
import type { AppState, Course, Game, Golfer, Place } from './types';
import { isFull, isPast } from './store';
import { distanceMiles } from '@/lib/format';

export type CourseStyle = 'links' | 'parkland' | 'heathland' | 'moorland' | 'downland' | 'inland links';

/** Editorial detail for the club profiles. Anything not listed falls back to sensible defaults. */
const DETAILS: Record<string, { style: CourseStyle; blurb: string; founded?: number; holes?: number }> = {
  'haggs-castle': { style: 'parkland', founded: 1910, blurb: 'Mature parkland on the south side of Glasgow with a long history of hosting Scottish Golf events.' },
  pollok: { style: 'parkland', founded: 1892, blurb: 'A classic Colt design along the White Cart, wooded and quiet, ten minutes from the city centre.' },
  'cathkin-braes': { style: 'moorland', founded: 1888, blurb: 'High moorland with views over the whole city. Plays firm and fast in summer.' },
  cawder: { style: 'parkland', founded: 1933, blurb: 'Two courses on the north edge of Glasgow. The Cawder is the championship test.' },
  'buchanan-castle': { style: 'parkland', founded: 1936, blurb: 'Set in the grounds of the old castle at Drymen with the Campsie Fells as the backdrop.' },
  'royal-troon': { style: 'links', founded: 1878, blurb: 'Open Championship venue. The Postage Stamp is the most photographed short hole in golf.' },
  'western-gailes': { style: 'links', founded: 1897, blurb: 'Pure Ayrshire links between the railway and the sea. Regularly in the world top 100.' },
  dundonald: { style: 'links', founded: 2003, blurb: 'Modern links by Kyle Phillips, host of the Scottish Open and Women’s Scottish Open.' },
  'kilmarnock-barassie': { style: 'links', founded: 1887, blurb: 'Twenty seven holes of links golf at Troon. A regular Open qualifying venue.' },
  prestwick: { style: 'links', founded: 1851, blurb: 'Where the Open began in 1860. Blind shots, sleepered bunkers and the Cardinal.' },
  'royal-aberdeen': { style: 'links', founded: 1780, blurb: 'The sixth oldest club in the world. The front nine through the dunes is as good as links golf gets.' },
  carnoustie: { style: 'links', founded: 1842, blurb: 'The toughest of the Open venues. Finish over the Barry Burn if you can.' },
  'north-berwick': { style: 'links', founded: 1832, blurb: 'The original Redan and a wall across the 13th green. Golf as it was meant to be played.' },
  gullane: { style: 'links', founded: 1882, blurb: 'Three courses over Gullane Hill with views across the Forth. Number 1 is the championship course.' },
  'old-course': { style: 'links', blurb: 'The Home of Golf. Ballot for a tee time, or find a member who can get you on.' },
  kingsbarns: { style: 'links', founded: 2000, blurb: 'Every hole with a view of the sea. Co-host of the Dunhill Links.' },
  gleneagles: { style: 'moorland', founded: 1919, blurb: 'The King’s is James Braid at his best, set among the Perthshire hills.' },
  'royal-dornoch': { style: 'links', founded: 1877, blurb: 'Worth the drive north every time. Plateau greens and gorse in full bloom by June.' },
  'castle-stuart': { style: 'links', founded: 2009, blurb: 'Wide fairways above the Moray Firth. Host of the Scottish Open four times.' },
  'woodhall-spa': { style: 'heathland', founded: 1905, blurb: 'Home of England Golf. The Hotchkin has the deepest bunkers in the country.' },
  'royal-birkdale': { style: 'links', founded: 1889, blurb: 'Fairways that run in the valleys between the dunes. Ten Opens and counting.' },
  sunningdale: { style: 'heathland', founded: 1900, blurb: 'The Old is the finest heathland course in the world. Heather, pine and sand.' },
  'royal-porthcawl': { style: 'links', founded: 1891, blurb: 'The sea in view from every hole. Wales’ championship links.' },
  portmarnock: { style: 'links', founded: 1894, blurb: 'A peninsula of links golf north of Dublin, a regular Irish Open host.' },
  carrick: { style: 'parkland', founded: 2007, blurb: 'Loch Lomond on one side, the Highland line on the other. The back nine climbs into the hills.' },
  'loch-lomond': { style: 'parkland', founded: 1993, blurb: 'Private and members only, but a member can bring you as a guest. Worth asking.' },
  'east-renfrewshire': { style: 'moorland', founded: 1922, blurb: 'A Braid course on the moor above Newton Mearns. Windy, honest and quick to drain.' },
  kilmacolm: { style: 'moorland', founded: 1891, blurb: 'Short, tight and full of character. One of the best value days out in the west.' },
  belleisle: { style: 'parkland', founded: 1927, blurb: 'A Braid municipal in Ayr that most private clubs would be proud of.' },
  bruntsfield: { style: 'parkland', founded: 1761, blurb: 'The fourth oldest club in the world, tucked between Davidson’s Mains and the Forth.' },
  'royal-burgess': { style: 'parkland', founded: 1735, blurb: 'The oldest golfing society in the world. Immaculate parkland on the edge of Edinburgh.' },
  braids: { style: 'moorland', founded: 1889, blurb: 'Edinburgh’s municipal on the hill, with the castle in view. A brilliant walk for the money.' },
  dunbar: { style: 'links', founded: 1856, blurb: 'A strip of links between the sea wall and the shore. Open qualifying venue.' },
  crail: { style: 'links', founded: 1786, blurb: 'The seventh oldest club in the world. Balcomie is Old Tom Morris, Craighead is Gil Hanse.' },
  lundin: { style: 'links', founded: 1868, blurb: 'Links out, parkland back, and the railway line running through the middle.' },
  blairgowrie: { style: 'heathland', founded: 1889, blurb: 'Rosemount runs through pine and silver birch. Heather everywhere in August.' },
  'cruden-bay': { style: 'links', founded: 1899, blurb: 'Huge dunes and blind shots on the Buchan coast. Golf as theatre.' },
  machrihanish: { style: 'links', founded: 1876, blurb: 'The best opening tee shot in golf, over the beach. Worth the drive down the Mull.' },
  'st-georges-hill': { style: 'heathland', founded: 1913, blurb: 'Harry Colt heathland in the Surrey sandbelt. Rhododendrons in May.' },
  wentworth: { style: 'heathland', founded: 1926, blurb: 'The West Course, home of the PGA Championship. Members only, so find a member.' },
  formby: { style: 'links', founded: 1884, blurb: 'Links through the pines on the Sefton coast. Home of the Formby Hare.' },
  alwoodley: { style: 'heathland', founded: 1907, blurb: 'Alister MacKenzie’s first course, north of Leeds. Heather, gorse and huge greens.' },
  'royal-cinque-ports': { style: 'links', founded: 1892, blurb: 'Two Opens and the toughest back nine into the wind on the Kent coast.' },
  'pyle-kenfig': { style: 'links', founded: 1922, blurb: 'Next door to Porthcawl and every bit as good through the dunes on the back nine.' },
  'royal-county-down': { style: 'links', founded: 1889, blurb: 'The Mournes behind, the sea beside, and blind shots over the dunes. Often ranked the best course in the world.' },
};

export interface ClubProfile {
  course: Course;
  style: CourseStyle;
  blurb: string;
  founded?: number;
  holes: number;
  country: ReturnType<typeof courseCountry>;
  countryName: string;
}

export function clubProfile(id: string): ClubProfile | undefined {
  const course = courseById(id);
  if (!course) return undefined;
  const d = DETAILS[id];
  const country = courseCountry(course);
  return {
    course,
    style: d?.style ?? (course.name.toLowerCase().includes('links') ? 'links' : 'parkland'),
    blurb: d?.blurb ?? `${course.name} in ${course.town}, ${course.region}.`,
    founded: d?.founded,
    holes: d?.holes ?? 18,
    country,
    countryName: associationById(country).short,
  };
}

/** Games hosted at this club by members, open to guests, soonest first */
export function memberGamesAt(s: AppState, courseId: string): Game[] {
  return Object.values(s.games)
    .filter((g) => g.courseId === courseId && !g.cancelled && !isPast(g) && !isFull(s, g))
    .sort((a, b) => a.teeTime.localeCompare(b.teeTime));
}

/** The cheapest member guest rate on offer at this club right now, if any */
export function guestRateAt(s: AppState, courseId: string): number | undefined {
  const rates = memberGamesAt(s, courseId)
    .filter((g) => g.type === 'member_guest' && g.costPerGolfer !== undefined)
    .map((g) => g.costPerGolfer as number);
  return rates.length ? Math.min(...rates) : undefined;
}

export function opensAt(courseId: string): ClubEvent[] {
  return CLUB_EVENTS.filter((e) => e.courseId === courseId).sort((a, b) => a.playedIn - b.playedIn);
}

/** National events played at this venue, matched on the venue name */
export function nationalsAt(course: Course): AmateurEvent[] {
  const key = course.name.split(' (')[0].replace(/ Golf (Club|Links|Course)$/, '').toLowerCase();
  return EVENTS.filter((e) => e.venue.toLowerCase().includes(key) || key.includes(e.venue.toLowerCase()));
}

export function membersAt(s: AppState, course: Course): Golfer[] {
  return Object.values(s.golfers).filter((g) => g.id !== 'me' && g.homeClub === course.name && g.showHomeClub);
}

export interface ClubListing {
  profile: ClubProfile;
  miles: number;
  guestRate?: number;
  openGames: number;
  opens: number;
}

/** Clubs for the directory, nearest first */
export function clubsNear(s: AppState, from: Place, query = ''): ClubListing[] {
  const q = query.trim().toLowerCase();
  return courses
    .filter((c) => !q || `${c.name} ${c.town} ${c.region}`.toLowerCase().includes(q))
    .map((c) => {
      const profile = clubProfile(c.id)!;
      return { profile, miles: distanceMiles(c, from), guestRate: guestRateAt(s, c.id), openGames: memberGamesAt(s, c.id).length, opens: opensAt(c.id).length };
    })
    .sort((a, b) => a.miles - b.miles);
}

export const clubEventLabel = eventTitle;
