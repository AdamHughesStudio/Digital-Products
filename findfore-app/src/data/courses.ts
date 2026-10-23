import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { Course, Game, Layout, Place } from './types';
import { distanceMiles } from '@/lib/format';
import { supabase } from '@/lib/supabase';

// Clubs we've written up ourselves, with visitor fees (illustrative) for member guest comparisons.
// Every other club in the UK and Ireland comes from OpenStreetMap and is added by loadClubs below.
const CURATED: Course[] = [
  { id: 'haggs-castle', name: 'Haggs Castle Golf Club', town: 'Glasgow', region: 'Glasgow', lat: 55.8337, lng: -4.3141, visitorFee: 75 },
  { id: 'pollok', name: 'Pollok Golf Club', town: 'Glasgow', region: 'Glasgow', lat: 55.8203, lng: -4.3322, visitorFee: 95 },
  { id: 'cathkin-braes', name: 'Cathkin Braes Golf Club', town: 'Glasgow', region: 'Glasgow', lat: 55.7964, lng: -4.2016, visitorFee: 60 },
  { id: 'cawder', name: 'Cawder Golf Club', town: 'Bishopbriggs', region: 'Glasgow', lat: 55.9197, lng: -4.2104, visitorFee: 55, layouts: [{ name: 'Cawder Course', holes: 18 }, { name: 'Keir Course', holes: 18 }] },
  { id: 'east-renfrewshire', name: 'East Renfrewshire Golf Club', town: 'Newton Mearns', region: 'Glasgow', lat: 55.7539, lng: -4.3622, visitorFee: 70 },
  { id: 'buchanan-castle', name: 'Buchanan Castle Golf Club', town: 'Drymen', region: 'Stirlingshire', lat: 56.0598, lng: -4.4556, visitorFee: 80 },
  { id: 'carrick', name: 'The Carrick at Cameron House', town: 'Loch Lomond', region: 'Dunbartonshire', lat: 56.0147, lng: -4.5946, visitorFee: 150, layouts: [{ name: 'The Carrick', holes: 18 }, { name: 'The Wee Demon', holes: 9 }] },
  { id: 'loch-lomond', name: 'Loch Lomond Golf Club', town: 'Luss', region: 'Dunbartonshire', lat: 56.0366, lng: -4.6103 },
  { id: 'royal-troon', name: 'Royal Troon Golf Club', town: 'Troon', region: 'Ayrshire', lat: 55.5270, lng: -4.6475, visitorFee: 325, layouts: [{ name: 'Old Course', holes: 18 }, { name: 'Portland Course', holes: 18 }, { name: 'Craigend', holes: 9 }] },
  { id: 'western-gailes', name: 'Western Gailes Golf Club', town: 'Irvine', region: 'Ayrshire', lat: 55.5850, lng: -4.6618, visitorFee: 225 },
  { id: 'dundonald', name: 'Dundonald Links', town: 'Irvine', region: 'Ayrshire', lat: 55.5747, lng: -4.6524, visitorFee: 195 },
  { id: 'kilmarnock-barassie', name: 'Kilmarnock (Barassie) Golf Club', town: 'Troon', region: 'Ayrshire', lat: 55.5608, lng: -4.6514, visitorFee: 160, layouts: [{ name: 'Barassie', holes: 18 }, { name: 'Hillhouse', holes: 9 }] },
  { id: 'prestwick', name: 'Prestwick Golf Club', town: 'Prestwick', region: 'Ayrshire', lat: 55.5006, lng: -4.6206, visitorFee: 280 },
  { id: 'turnberry', name: 'Trump Turnberry', town: 'Turnberry', region: 'Ayrshire', lat: 55.3150, lng: -4.8330, visitorFee: 450, layouts: [{ name: 'Ailsa', holes: 18 }, { name: 'King Robert the Bruce', holes: 18 }, { name: 'Arran', holes: 9 }] },
  { id: 'belleisle', name: 'Belleisle Golf Course', town: 'Ayr', region: 'Ayrshire', lat: 55.4431, lng: -4.6361, visitorFee: 35 },
  { id: 'kilmacolm', name: 'Kilmacolm Golf Club', town: 'Kilmacolm', region: 'Renfrewshire', lat: 55.8948, lng: -4.6300, visitorFee: 55 },
  { id: 'bruntsfield', name: 'Bruntsfield Links Golfing Society', town: 'Edinburgh', region: 'Edinburgh', lat: 55.9658, lng: -3.2803, visitorFee: 140 },
  { id: 'royal-burgess', name: 'Royal Burgess Golfing Society', town: 'Edinburgh', region: 'Edinburgh', lat: 55.9612, lng: -3.2863, visitorFee: 150 },
  { id: 'braids', name: 'Braid Hills Golf Course', town: 'Edinburgh', region: 'Edinburgh', lat: 55.9137, lng: -3.2011, visitorFee: 30 },
  { id: 'gullane', name: 'Gullane Golf Club', town: 'Gullane', region: 'East Lothian', lat: 56.0366, lng: -2.8316, visitorFee: 220, layouts: [{ name: 'No. 1 Course', holes: 18 }, { name: 'No. 2 Course', holes: 18 }, { name: 'No. 3 Course', holes: 18 }] },
  { id: 'north-berwick', name: 'North Berwick Golf Club', town: 'North Berwick', region: 'East Lothian', lat: 56.0580, lng: -2.7336, visitorFee: 210 },
  { id: 'dunbar', name: 'Dunbar Golf Club', town: 'Dunbar', region: 'East Lothian', lat: 56.0005, lng: -2.5160, visitorFee: 120 },
  { id: 'old-course', name: 'St Andrews Links', aka: 'The Old Course', town: 'St Andrews', region: 'Fife', lat: 56.3431, lng: -2.8027, visitorFee: 340, layouts: [{ name: 'Old Course', holes: 18 }, { name: 'New Course', holes: 18 }, { name: 'Jubilee Course', holes: 18 }, { name: 'Eden Course', holes: 18 }, { name: 'Strathtyrum Course', holes: 18 }, { name: 'Castle Course', holes: 18 }, { name: 'Craigtoun Course', holes: 18 }, { name: 'Balgove Course', holes: 9 }] },
  { id: 'muirfield', name: 'Muirfield', aka: 'The Honourable Company of Edinburgh Golfers', town: 'Gullane', region: 'East Lothian', lat: 56.0437, lng: -2.8209, holes: 18 },
  { id: 'kingsbarns', name: 'Kingsbarns Golf Links', town: 'Kingsbarns', region: 'Fife', lat: 56.3025, lng: -2.6536, visitorFee: 395 },
  { id: 'crail', name: 'Crail Golfing Society', town: 'Crail', region: 'Fife', lat: 56.2644, lng: -2.5980, visitorFee: 110, layouts: [{ name: 'Balcomie', holes: 18 }, { name: 'Craighead', holes: 18 }] },
  { id: 'lundin', name: 'Lundin Golf Club', town: 'Lundin Links', region: 'Fife', lat: 56.2112, lng: -2.9612, visitorFee: 115 },
  { id: 'gleneagles', name: 'Gleneagles', town: 'Auchterarder', region: 'Perthshire', lat: 56.2842, lng: -3.7517, visitorFee: 260, layouts: [{ name: "King's Course", holes: 18 }, { name: "Queen's Course", holes: 18 }, { name: 'PGA Centenary Course', holes: 18 }] },
  { id: 'blairgowrie', name: 'Blairgowrie Golf Club', town: 'Blairgowrie', region: 'Perthshire', lat: 56.5731, lng: -3.3431, visitorFee: 150, layouts: [{ name: 'Rosemount', holes: 18 }, { name: 'Lansdowne', holes: 18 }, { name: 'Wee Course', holes: 9 }] },
  { id: 'carnoustie', name: 'Carnoustie Golf Links', town: 'Carnoustie', region: 'Angus', lat: 56.4981, lng: -2.7197, visitorFee: 325, layouts: [{ name: 'Championship Course', holes: 18 }, { name: 'Burnside Course', holes: 18 }, { name: 'Buddon Links', holes: 18 }] },
  { id: 'royal-aberdeen', name: 'Royal Aberdeen Golf Club', town: 'Aberdeen', region: 'Aberdeenshire', lat: 57.1813, lng: -2.0808, visitorFee: 230, layouts: [{ name: 'Balgownie', holes: 18 }, { name: 'Silverburn', holes: 18 }] },
  { id: 'cruden-bay', name: 'Cruden Bay Golf Club', town: 'Cruden Bay', region: 'Aberdeenshire', lat: 57.4136, lng: -1.8519, visitorFee: 190, layouts: [{ name: 'Championship Course', holes: 18 }, { name: 'St Olaf', holes: 9 }] },
  { id: 'castle-stuart', name: 'Cabot Highlands', aka: 'Castle Stuart Golf Links', town: 'Inverness', region: 'Highlands', lat: 57.5345, lng: -4.0917, visitorFee: 350, layouts: [{ name: 'Castle Stuart', holes: 18 }, { name: 'Old Petty', holes: 18 }] },
  { id: 'askernish', name: 'Askernish Golf Club', aka: 'Raon Goilf Aisgernis', town: 'South Uist', region: 'Outer Hebrides', lat: 57.1881, lng: -7.4118, holes: 18 },
  { id: 'powfoot', name: 'Powfoot Golf Club', town: 'Annan', region: 'Dumfries and Galloway', lat: 54.9768, lng: -3.3369, holes: 18 },
  { id: 'royal-dornoch', name: 'Royal Dornoch Golf Club', town: 'Dornoch', region: 'Highlands', lat: 57.8762, lng: -4.0223, visitorFee: 295, layouts: [{ name: 'Championship Course', holes: 18 }, { name: 'Struie Course', holes: 18 }] },
  { id: 'machrihanish', name: 'Machrihanish Golf Club', town: 'Campbeltown', region: 'Argyll', lat: 55.4264, lng: -5.7278, visitorFee: 110 },
  { id: 'st-georges-hill', name: "St George's Hill Golf Club", town: 'Weybridge', region: 'Surrey', lat: 51.3606, lng: -0.4617, visitorFee: 250 },
  { id: 'wentworth', name: 'Wentworth Club', town: 'Virginia Water', region: 'Surrey', lat: 51.3977, lng: -0.5874, layouts: [{ name: 'West Course', holes: 18 }, { name: 'East Course', holes: 18 }, { name: 'Edinburgh Course', holes: 18 }] },
  { id: 'sunningdale', name: 'Sunningdale Golf Club', town: 'Sunningdale', region: 'Berkshire', lat: 51.3862, lng: -0.6273, visitorFee: 320, layouts: [{ name: 'Old Course', holes: 18 }, { name: 'New Course', holes: 18 }] },
  { id: 'royal-birkdale', name: 'Royal Birkdale Golf Club', town: 'Southport', region: 'Merseyside', lat: 53.6259, lng: -3.0305, visitorFee: 350 },
  { id: 'formby', name: 'Formby Golf Club', town: 'Formby', region: 'Merseyside', lat: 53.5652, lng: -3.0795, visitorFee: 240 },
  { id: 'alwoodley', name: 'The Alwoodley Golf Club', town: 'Leeds', region: 'West Yorkshire', lat: 53.8599, lng: -1.5421, visitorFee: 175 },
  { id: 'woodhall-spa', name: 'Woodhall Spa', town: 'Woodhall Spa', region: 'Lincolnshire', lat: 53.1560, lng: -0.2100, visitorFee: 200, country: 'england', layouts: [{ name: 'Hotchkin', holes: 18 }, { name: 'Bracken', holes: 18 }] },
  { id: 'royal-cinque-ports', name: 'Royal Cinque Ports Golf Club', town: 'Deal', region: 'Kent', lat: 51.2258, lng: 1.4028, visitorFee: 190, country: 'england' },
  { id: 'royal-porthcawl', name: 'Royal Porthcawl Golf Club', town: 'Porthcawl', region: 'Bridgend', lat: 51.4818, lng: -3.7042, visitorFee: 175, country: 'wales' },
  { id: 'pyle-kenfig', name: 'Pyle and Kenfig Golf Club', town: 'Pyle', region: 'Bridgend', lat: 51.5205, lng: -3.7091, visitorFee: 95, country: 'wales' },
  { id: 'portmarnock', name: 'Portmarnock Golf Club', town: 'Portmarnock', region: 'Dublin', lat: 53.4247, lng: -6.1310, visitorFee: 300, country: 'ireland' },
  { id: 'royal-county-down', name: 'Royal County Down Golf Club', town: 'Newcastle', region: 'County Down', lat: 54.2170, lng: -5.8908, visitorFee: 350, country: 'ireland', layouts: [{ name: 'Championship Links', holes: 18 }, { name: 'Annesley Links', holes: 18 }] },
];

/** Every club: ours first, then OpenStreetMap's. Filled in by loadClubs, so read it at render time. */
export const courses: Course[] = [...CURATED];
const byId = new Map(courses.map((c) => [c.id, c]));
export const courseById = (id: string) => byId.get(id);

/** "Hilton Park Golf Club" becomes "Hilton Park" */
export const clubShortName = (name: string) => name.replace(/ (Golf )?(Club|Course|Links|Centre)$/i, '').replace(/ Golf$/i, '');

/** The courses a golfer chooses between when posting a game here: none for a one course club */
export const layoutsFor = (c: Course | undefined): Layout[] => (c?.layouts && c.layouts.length > 1 ? c.layouts : []);

/** "King's Course" becomes "kings-course", for the course page's web address */
export const layoutSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The page for one course at a club with more than one, e.g. /course/gleneagles/kings-course */
export const coursePath = (clubId: string, layout: string) => `/course/${clubId}/${layoutSlug(layout)}`;

/** The course a course page's address points at */
export const layoutBySlug = (c: Course | undefined, slug: string) => layoutsFor(c).find((l) => layoutSlug(l.name) === slug);

export interface CourseResult {
  club: Course;
  /** Set when the result is one course at a club with several */
  layout?: Layout;
  miles: number;
}

const plain = (t: string) => t.toLowerCase().replace(/['’]/g, '');

/**
 * Search clubs and their courses. "Gleneagles" finds the club and each of its courses, "Allander"
 * or "kings" finds the course itself. Nearest first, a club followed by its matching courses.
 */
export function searchCourses(query: string, from: { lat: number; lng: number }, limit = 10): CourseResult[] {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const has = (text: string) => {
    const t = plain(text);
    return words.every((w) => t.includes(w));
  };
  const out: CourseResult[] = [];
  for (const c of courses) {
    const where = `${c.name} ${c.aka ?? ''} ${c.town} ${c.region}`;
    const layouts = layoutsFor(c).filter((l) => has(`${where} ${l.name}`));
    if (!has(where) && layouts.length === 0) continue;
    const miles = distanceMiles(c, from);
    // a club is listed when its own name or town matches; its courses whenever they match
    if (has(where)) out.push({ club: c, miles });
    layouts.forEach((l) => out.push({ club: c, layout: l, miles }));
  }
  return out.sort((a, b) => a.miles - b.miles || (a.layout ? 1 : 0) - (b.layout ? 1 : 0)).slice(0, limit);
}

/** What a game is called everywhere: the club, plus the course at clubs with more than one, e.g. "Hilton Park · Allander" */
export function gameCourseName(g: Pick<Game, 'courseId' | 'layout'>) {
  const c = courseById(g.courseId);
  if (!c) return undefined;
  return g.layout ? `${clubShortName(c.name)} · ${g.layout}` : c.name;
}

// ---------- the full club list from OpenStreetMap ----------

const CACHE_KEY = 'findfore:clubs:v2';
// daily, so courses we add to the directory reach phones by the next day
const REFRESH_MS = 86400000;
let version = 0;
const listeners = new Set<() => void>();

/** Re-render when the club list grows */
export function useClubsVersion() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => version,
    () => version,
  );
}

const words = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 2 && !['golf', 'club', 'course', 'courses', 'links', 'the', 'and', 'royal', 'resort', 'hotel'].includes(w));

/**
 * One of ours already covers this club: the same place, and one name's words all within the
 * other's ("St Andrews Links" and "The Old Course, St Andrews"). Sharing a single word isn't
 * enough: Glasgow Gailes and Western Gailes are neighbours but different clubs.
 */
function curatedMatch(c: Course) {
  const w = words(c.name);
  return CURATED.some((k) => {
    if (Math.abs(k.lat - c.lat) >= 0.015 || Math.abs(k.lng - c.lng) >= 0.025) return false;
    const kw = words(`${k.name} ${k.aka ?? ''}`);
    return w.length > 0 && (w.every((x) => kw.includes(x)) || words(k.name).every((x) => w.includes(x)));
  });
}

function apply(list: Course[]) {
  courses.length = 0;
  courses.push(...CURATED, ...list.filter((c) => !curatedMatch(c)));
  byId.clear();
  courses.forEach((c) => byId.set(c.id, c));
  version++;
  listeners.forEach((l) => l());
}

interface ClubRow {
  id: string;
  name: string;
  town: string | null;
  region: string | null;
  country: Course['country'] | null;
  lat: number;
  lng: number;
  website: string | null;
  phone: string | null;
  holes: number | null;
  layouts: Layout[] | null;
}

const toCourse = (r: ClubRow): Course => ({
  id: r.id,
  name: r.name,
  town: r.town ?? r.region ?? '',
  region: r.region ?? '',
  lat: r.lat,
  lng: r.lng,
  country: r.country ?? undefined,
  website: r.website ?? undefined,
  phone: r.phone ?? undefined,
  holes: r.holes ?? undefined,
  layouts: r.layouts?.length ? r.layouts : undefined,
  source: 'osm',
});

let loading = false;
/**
 * Fill the club list: straight away from the copy kept on the phone, then from the account once
 * a day (the list rarely changes). About 3,000 clubs, a few hundred kilobytes.
 */
export async function loadClubs() {
  if (loading) return;
  loading = true;
  let fetchedAt = 0;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { at: number; clubs: Course[] };
      fetchedAt = saved.at;
      apply(saved.clubs);
    }
  } catch {
    // no copy yet
  }
  if (Date.now() - fetchedAt < REFRESH_MS) return;
  try {
    const all: ClubRow[] = [];
    // the server hands back at most 1,000 rows at a time
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, town, region, country, lat, lng, website, phone, holes, layouts')
        .eq('active', true)
        .order('id')
        .range(from, from + 999);
      if (error) throw error;
      all.push(...((data ?? []) as ClubRow[]));
      if (!data || data.length < 1000) break;
    }
    if (all.length === 0) return;
    const list = all.map(toCourse);
    apply(list);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), clubs: list })).catch(() => {});
  } catch {
    // offline: the phone's copy, or our own clubs, will do until next time
  } finally {
    loading = false;
  }
}

// Places golfers can choose as their base. A full build would use device location and a places search.
export const places: Place[] = [
  { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
  { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
  { name: 'Ayr', lat: 55.4586, lng: -4.6292 },
  { name: 'Troon', lat: 55.5436, lng: -4.6607 },
  { name: 'Stirling', lat: 56.1165, lng: -3.9369 },
  { name: 'Perth', lat: 56.3950, lng: -3.4308 },
  { name: 'St Andrews', lat: 56.3398, lng: -2.7967 },
  { name: 'Dundee', lat: 56.4620, lng: -2.9707 },
  { name: 'Aberdeen', lat: 57.1497, lng: -2.0943 },
  { name: 'Inverness', lat: 57.4778, lng: -4.2247 },
  { name: 'Newcastle', lat: 54.9783, lng: -1.6178 },
  { name: 'Leeds', lat: 53.8008, lng: -1.5491 },
  { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
  { name: 'Liverpool', lat: 53.4084, lng: -2.9916 },
  { name: 'London', lat: 51.5072, lng: -0.1276 },
];
