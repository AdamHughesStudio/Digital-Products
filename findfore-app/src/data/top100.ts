/**
 * Scotland's Top 100 golf courses, as ranked by the NCG Top 100s. Each entry is a club, and the
 * course at that club where it has more than one (the course name matches the club's own list).
 * Ranked clubs and courses carry the Top 100 badge on their profiles.
 */
export interface Top100Entry {
  rank: number;
  club: string;
  /** The course at a club with several, e.g. the Old Course at St Andrews Links */
  course?: string;
  /** The name as it appears in the ranking */
  name: string;
}

export const TOP_100_SCOTLAND: Top100Entry[] = [
  { rank: 1, club: 'old-course', course: 'Old Course', name: 'St Andrews Links (The Old Course)' },
  { rank: 2, club: 'muirfield', name: 'Muirfield' },
  { rank: 3, club: 'turnberry', course: 'Ailsa', name: 'Trump Turnberry Resort (Ailsa)' },
  { rank: 4, club: 'royal-dornoch', course: 'Championship Course', name: 'Royal Dornoch Golf Club (Championship)' },
  { rank: 5, club: 'carnoustie', course: 'Championship Course', name: 'Carnoustie Golf Links (Championship)' },
  { rank: 6, club: 'north-berwick', name: 'North Berwick Golf Club (West Links)' },
  { rank: 7, club: 'kingsbarns', name: 'Kingsbarns Golf Links' },
  { rank: 8, club: 'osm-w1381984507', name: 'Ardfin' },
  { rank: 9, club: 'castle-stuart', course: 'Castle Stuart', name: 'Cabot Highlands Castle Stuart' },
  { rank: 10, club: 'cruden-bay', course: 'Championship Course', name: 'Cruden Bay Golf Club (Championship)' },
  { rank: 11, club: 'osm-w204317950', course: 'Old Course', name: 'Trump International Golf Links (Old Course)' },
  { rank: 12, club: 'royal-aberdeen', course: 'Balgownie', name: 'Royal Aberdeen Golf Club (Balgownie)' },
  { rank: 13, club: 'prestwick', name: 'Prestwick Golf Club' },
  { rank: 14, club: 'machrihanish', name: 'Machrihanish Golf Club (Championship)' },
  { rank: 15, club: 'royal-troon', course: 'Old Course', name: 'Royal Troon Golf Club (Old)' },
  { rank: 16, club: 'western-gailes', name: 'Western Gailes Golf Club' },
  { rank: 17, club: 'loch-lomond', name: 'Loch Lomond Golf Club' },
  { rank: 18, club: 'gleneagles', course: "King's Course", name: "Gleneagles (King's)" },
  { rank: 19, club: 'osm-w116597015', name: 'Nairn Golf Club (Championship)' },
  { rank: 20, club: 'castle-stuart', course: 'Old Petty', name: 'Cabot Highlands Old Petty' },
  { rank: 21, club: 'osm-w112530297', name: 'The Golf House Club, Elie' },
  { rank: 22, club: 'gullane', course: 'No. 1 Course', name: 'Gullane Golf Club (No.1)' },
  { rank: 23, club: 'osm-w264432772', name: 'Brora Golf Club' },
  { rank: 24, club: 'osm-w204317950', course: 'MacLeod Course', name: 'Trump International Golf Links (New Course)' },
  { rank: 25, club: 'osm-r12323582', name: 'Skibo Castle (Carnegie Links)' },
  { rank: 26, club: 'old-course', course: 'New Course', name: 'St Andrews Links (New)' },
  { rank: 27, club: 'osm-w161230026', name: 'The Renaissance Club' },
  { rank: 28, club: 'osm-w735220025', name: 'Dumbarnie Links' },
  { rank: 29, club: 'osm-w1018772807', name: 'Another Place, The Machrie' },
  { rank: 30, club: 'osm-w43655011', name: 'Machrihanish Dunes' },
  { rank: 31, club: 'gleneagles', course: "Queen's Course", name: "Gleneagles (Queen's)" },
  { rank: 32, club: 'osm-w147535152', name: 'Boat of Garten Golf Club' },
  { rank: 33, club: 'osm-w117500566', course: 'Old Course', name: 'Lanark Golf Club' },
  { rank: 34, club: 'osm-w204317949', course: 'Murcar Course', name: 'Murcar Links Golf Club' },
  { rank: 35, club: 'osm-w26236148', name: 'Panmure Golf Club' },
  { rank: 36, club: 'osm-r14290747', name: 'Southerness Golf Club' },
  { rank: 37, club: 'dunbar', name: 'Dunbar Golf Club' },
  { rank: 38, club: 'osm-w102611542', course: 'Old Course', name: 'Moray Golf Club (Old)' },
  { rank: 39, club: 'dundonald', name: 'Dundonald Links' },
  { rank: 40, club: 'blairgowrie', course: 'Rosemount', name: 'Blairgowrie Golf Club (Rosemount)' },
  { rank: 41, club: 'old-course', course: 'Jubilee Course', name: 'St Andrews Links (Jubilee)' },
  { rank: 42, club: 'askernish', name: 'Askernish Golf Club' },
  { rank: 43, club: 'lundin', name: 'Lundin Golf Club' },
  { rank: 44, club: 'osm-w41275225', name: 'Glasgow Golf Club (Gailes Links)' },
  { rank: 45, club: 'osm-w249921355', name: 'Luffness New Golf Club' },
  { rank: 46, club: 'osm-r19023633', name: 'Golspie Golf Club' },
  { rank: 47, club: 'old-course', course: 'Castle Course', name: 'St Andrews Links (Castle)' },
  { rank: 48, club: 'osm-w1245335145', course: 'Medal Course', name: 'Monifieth Golf Links (Medal)' },
  { rank: 49, club: 'gullane', course: 'No. 2 Course', name: 'Gullane Golf Club (No.2)' },
  { rank: 50, club: 'osm-w264889578', course: '1562 Course', name: 'Montrose Golf Links (1562)' },
  { rank: 51, club: 'osm-w96897204', name: 'Longniddry Golf Club' },
  { rank: 52, club: 'kilmarnock-barassie', course: 'Barassie', name: 'Kilmarnock (Barassie) Golf Club' },
  { rank: 53, club: 'osm-w939545275', name: 'Kilspindie Golf Club' },
  { rank: 54, club: 'osm-w264893033', course: 'Corbiehill Course', name: 'Fraserburgh Golf Club (Corbiehill)' },
  { rank: 55, club: 'osm-r10616520', name: 'Downfield Golf Club' },
  { rank: 56, club: 'osm-w483675566', name: 'Irvine Golf Club' },
  { rank: 57, club: 'crail', course: 'Balcomie', name: 'Crail Golfing Society (Balcomie)' },
  { rank: 58, club: 'osm-w86866031', name: 'Pitlochry Golf Course' },
  { rank: 59, club: 'gullane', course: 'No. 3 Course', name: 'Gullane Golf Club (No.3)' },
  { rank: 60, club: 'crail', course: 'Craighead', name: 'Crail Golfing Society (Craighead)' },
  { rank: 61, club: 'osm-w122403613', name: 'The West Kilbride Golf Club' },
  { rank: 62, club: 'old-course', course: 'Eden Course', name: 'St Andrews Links (Eden)' },
  { rank: 63, club: 'osm-w161228170', course: 'Fidra Links', name: 'Archerfield (Fidra Links)' },
  { rank: 64, club: 'osm-r19698190', name: 'Ladybank Golf Club' },
  { rank: 65, club: 'osm-r16662964', name: 'Scotscraig Golfing Club' },
  { rank: 66, club: 'osm-w114097704', name: 'Durness Golf Club' },
  { rank: 67, club: 'osm-w249130496', name: 'Craigielaw Golf Club' },
  { rank: 68, club: 'osm-w263222466', name: 'Tain Golf Club' },
  { rank: 69, club: 'osm-w116597021', name: 'Nairn Dunbar Golf Club' },
  { rank: 70, club: 'osm-w134223324', name: 'Leven Links' },
  { rank: 71, club: 'turnberry', course: 'King Robert the Bruce', name: 'Trump Turnberry (King Robert the Bruce)' },
  { rank: 72, club: 'osm-w31312516', name: 'Fortrose & Rosemarkie Golf Club' },
  { rank: 73, club: 'osm-r18996518', name: 'Spey Valley Golf' },
  { rank: 74, club: 'osm-w43546577', name: 'Prestwick St Nicholas Golf Club' },
  { rank: 75, club: 'osm-w252136957', name: 'Shiskine Golf Club' },
  { rank: 76, club: 'powfoot', name: 'Powfoot Golf Club' },
  { rank: 77, club: 'osm-w116586104', course: 'Old Course', name: 'Peterhead Golf Club (Craigewan Links)' },
  { rank: 78, club: 'blairgowrie', course: 'Lansdowne', name: 'Blairgowrie Golf Club (Lansdowne)' },
  { rank: 79, club: 'royal-troon', course: 'Portland Course', name: 'Royal Troon Golf Club (Portland)' },
  { rank: 80, club: 'osm-r3463808', name: 'Dunaverty Golf Club' },
  { rank: 81, club: 'osm-w161228170', course: 'Dirleton Links', name: 'Archerfield (Dirleton Links)' },
  { rank: 82, club: 'osm-r14941183', name: 'Reay Golf Club' },
  { rank: 83, club: 'old-course', course: 'Craigtoun Course', name: "St Andrews Links (Craigtoun, formerly Duke's)" },
  { rank: 84, club: 'braids', name: 'Braid Hills Golf Course' },
  { rank: 85, club: 'osm-w269353312', name: 'Auchterarder Golf Club' },
  { rank: 86, club: 'osm-w24574363', name: 'Paisley Golf Club' },
  { rank: 87, club: 'osm-w397026530', course: 'Edzell Course', name: 'Edzell Golf Club (Old)' },
  { rank: 88, club: 'east-renfrewshire', name: 'The East Renfrewshire Golf Club' },
  { rank: 89, club: 'osm-r3346234', name: 'Kings Golf Club' },
  { rank: 90, club: 'bruntsfield', name: 'Bruntsfield Links Golfing Society' },
  { rank: 91, club: 'osm-r11561412', name: 'Forfar Golf Club' },
  { rank: 92, club: 'osm-w264882305', name: 'Arbroath Golf Links' },
  { rank: 93, club: 'carnoustie', course: 'Burnside Course', name: 'Carnoustie Golf Links (Burnside)' },
  { rank: 94, club: 'osm-r2858120', name: 'Musselburgh Links (Old Course)' },
  { rank: 95, club: 'osm-r3351883', name: 'Royal Musselburgh Golf Club' },
  { rank: 96, club: 'osm-w6175767', name: 'Duddingston Golf Club' },
  { rank: 97, club: 'gleneagles', course: 'PGA Centenary Course', name: 'Gleneagles (PGA Centenary)' },
  { rank: 98, club: 'kilmacolm', name: 'Kilmacolm Golf Club' },
  { rank: 99, club: 'osm-w6825675', course: 'Hawkshill Course', name: 'Newmachar Golf Club (Hawkshill)' },
  { rank: 100, club: 'osm-w264906766', name: 'Spey Bay Golf Club' },
];

const byClub = new Map<string, Top100Entry[]>();
TOP_100_SCOTLAND.forEach((e) => byClub.set(e.club, [...(byClub.get(e.club) ?? []), e]));

/** Every ranked entry at a club, best first */
export const top100AtClub = (clubId: string) => byClub.get(clubId) ?? [];

/** The ranking for one course at a club, or for the club itself where it has one course */
export const top100For = (clubId: string, course?: string) =>
  top100AtClub(clubId).find((e) => (course ? e.course === course : !e.course));

/** Clubs with at least one ranked course */
export const TOP_100_CLUBS = new Set(byClub.keys());
