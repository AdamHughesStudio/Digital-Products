import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Keyboard, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { photoFor } from '@/data/course-photos';
import { ProfileButton } from '@/components/profile-button';
import { AlertSheet } from '@/components/alerts';
import { activeCompFilters, CompetitionFilters, compFiltersName } from '@/components/competition-filters';
import { FeedCard } from '@/components/feed-card';
import { ForYou } from '@/components/for-you';
import { InterestedStrip } from '@/components/interested-friends';
import { useToast } from '@/components/toast';
import { Image } from 'expo-image';
import { Avatar, AvatarStack, Button, EmptyState, IconButton, Row, Sheet, T, styles as ui, type IconName } from '@/components/ui';
import { colors, fonts, hairline, maxContentWidth, radius, shadowSoft, space } from '@/constants/theme';
import { courseCountry, defaultCompFilters, eventSummary, eventTitle, searchCompetitions, type ClubEvent, type CompFilters, type Show } from '@/data/club-events';
import { clubShortName, courseById, coursePath, courses, layoutsFor, searchCourses, useClubsVersion, type CourseResult } from '@/data/courses';
import { addDays, ASSOCIATIONS, associationById, entryStatus, toggleReminder, useReminders, type AmateurEvent } from '@/data/events';
import { useFriends } from '@/data/friends';
import { addRecentSearch, clearRecentSearches, removeRecentSearch, useRecentSearches, type RecentSearch } from '@/data/recent-searches';
import { toggleSavedGame, useSavedGames } from '@/data/saved-games';
import { acceptedFor, ME, spacesLeft, useStore } from '@/data/store';
import type { Course, Game, Golfer } from '@/data/types';
import { dayDiff, displayName, formatTime, priceLabel, shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { requestSync } from '@/lib/social';
import { buildFeed } from '@/lib/selectors';
import { shareLink } from '@/lib/share';
import { setStatusBarOverride } from '@/lib/status-bar';

type When = 'upcoming' | 'today' | 'tomorrow' | 'weekend' | 'nextweek' | 'later';
type Category = 'all' | 'games' | 'competitions' | 'saved';

const WHEN: { id: When; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'weekend', label: 'Weekend' },
  { id: 'nextweek', label: 'Next week' },
  { id: 'later', label: 'Later' },
];

const CATEGORIES: { id: Category; label: string; icon: IconName; on: IconName }[] = [
  { id: 'all', label: 'Everything', icon: 'sparkles-outline', on: 'sparkles' },
  { id: 'competitions', label: 'Competitions', icon: 'trophy-outline', on: 'trophy' },
  { id: 'games', label: 'Games', icon: 'people-outline', on: 'people' },
  { id: 'saved', label: 'Saved', icon: 'heart-outline', on: 'heart' },
];

const EMPTY_WHEN: Record<When, string> = { upcoming: 'coming up', today: 'on today', tomorrow: 'on tomorrow', weekend: 'on this weekend', nextweek: 'on next week', later: 'further ahead' };

/** Fits the chosen window: today, tomorrow or the coming Saturday and Sunday */
function inWindow(d: Date, when: When) {
  const diff = dayDiff(d, new Date());
  if (diff < 0) return false;
  if (when === 'today') return diff === 0;
  if (when === 'tomorrow') return diff === 1;
  if (when === 'weekend') return diff <= 6 && (d.getDay() === 6 || d.getDay() === 0);
  // next week runs from the coming Monday for seven days; later is anything after that
  const toMonday = (8 - new Date().getDay()) % 7 || 7;
  if (when === 'nextweek') return diff >= toMonday && diff < toMonday + 7;
  if (when === 'later') return diff >= toMonday + 7;
  return true;
}

/** "Today · 10:20", "Tomorrow · 13:10" or "Sat 11 Oct · 09:40" */
function whenLine(d: Date, time?: string) {
  const diff = dayDiff(d, new Date());
  const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : shortDate(d);
  return time ? `${day} · ${time}` : day;
}

/** Feed section for a date: Today, Tomorrow, This weekend, This week, Next week, then the month */
/** How far the feed has to be pulled before letting go refreshes it */
const PULL_TRIGGER = 72;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function dayBucket(d: Date) {
  const diff = dayDiff(d, new Date());
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  const day = d.getDay();
  if (diff <= 6 && (day === 6 || day === 0)) return 'This weekend';
  const toMonday = (8 - new Date().getDay()) % 7 || 7;
  if (diff < toMonday) return 'This week';
  if (diff < toMonday + 7) return 'Next week';
  return d.getMonth() === new Date().getMonth() ? 'Later this month' : MONTH_NAMES[d.getMonth()];
}

type Item =
  | { kind: 'game'; key: string; date: Date; game: Game; miles: number }
  | { kind: 'open'; key: string; date: Date; e: ClubEvent; miles: number }
  | { kind: 'national'; key: string; date: Date; e: AmateurEvent };

export default function Home() {
  const insets = useSafeAreaInsets();
  const { state, me, updateProfile } = useStore();
  // the full club list arrives after the app opens
  const clubsVersion = useClubsVersion();
  const toast = useToast();
  const reminders = useReminders();
  const recents = useRecentSearches();
  const savedGames = useSavedGames();
  const [when, setWhen] = useState<When>('upcoming');
  const [cat, setCat] = useState<Category>('all');
  // competition filters: they narrow the competitions in the feed, and games are left as they are
  const [compFilters, setCompFilters] = useState<CompFilters>(defaultCompFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const filterCount = activeCompFilters(compFilters);
  // links from elsewhere can open the competitions with a country or a type already chosen
  const params = useLocalSearchParams<{ cat?: string; country?: string; show?: string }>();
  useEffect(() => {
    if (params.cat !== 'competitions' && !params.country && !params.show) return;
    setCat('competitions');
    const country = ASSOCIATIONS.find((a) => a.id === params.country)?.id;
    const show = (['all', 'national', 'club'] as Show[]).find((x) => x === params.show);
    if (country || show) setCompFilters({ ...defaultCompFilters(), country, show: show ?? 'all' });
  }, [params.cat, params.country, params.show]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedNonce, setFeedNonce] = useState(0);
  const pull = useRef(new Animated.Value(0)).current;
  const pullStart = useRef<number | null>(null);
  const pullNow = useRef(0);
  const pullStateRef = useRef<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const friends = useFriends();
  // the date chips and category tabs fold away as you scroll down and slide back when you scroll up,
  // so only the search row stays pinned and the feed gets the room
  const [filtersH, setFiltersH] = useState(0);
  const [searchH, setSearchH] = useState(0);
  const fold = useRef(new Animated.Value(1)).current;
  const folded = useRef(false);
  const lastY = useRef(0);
  const setFolded = (hide: boolean) => {
    if (folded.current === hide) return;
    folded.current = hide;
    Animated.timing(fold, { toValue: hide ? 0 : 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const openSearch = () => {
    setSearching(true);
    setFolded(true);
  };
  const closeSearch = () => {
    setSearching(false);
    setQuery('');
    Keyboard.dismiss();
    setFolded(false);
  };
  const hasMe = !!me;
  const pullHandlers = useRef({ start: (_y: number) => {}, move: (_y: number) => {}, end: () => {} });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (feedRef.current as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.();
    if (!node) return;
    const start = (e: TouchEvent) => pullHandlers.current.start(e.touches[0].pageY);
    const move = (e: TouchEvent) => pullHandlers.current.move(e.touches[0].pageY);
    const end = () => pullHandlers.current.end();
    node.addEventListener('touchstart', start, { passive: true });
    node.addEventListener('touchmove', move, { passive: true });
    node.addEventListener('touchend', end);
    node.addEventListener('touchcancel', end);
    return () => {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchmove', move);
      node.removeEventListener('touchend', end);
      node.removeEventListener('touchcancel', end);
    };
  }, [hasMe]);

  // tapping Home in the tab bar always lands at the top of the feed, filters showing and search closed
  const feedRef = useRef<ScrollView>(null);
  const navigation = useNavigation();
  useEffect(() => {
    // the tab bar's own event, so it is not in the generic navigation event map
    const unsub = (navigation as unknown as { addListener: (e: string, cb: () => void) => () => void }).addListener('tabPress', () => {
      feedRef.current?.scrollTo({ y: 0, animated: true });
      setSearching(false);
      setQuery('');
      Keyboard.dismiss();
      setFolded(false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);
  const onScroll = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = Math.max(0, e.nativeEvent.contentOffset.y);
    const dy = y - lastY.current;
    if (y < 24) setFolded(false);
    else if (dy > 10) setFolded(true);
    else if (dy < -10) setFolded(false);
    lastY.current = y;
  };
  // the forest header runs behind the clock too: turn the status bar forest while Home is showing
  useFocusEffect(
    useCallback(() => {
      setStatusBarOverride(colors.ink, colors.page);
      return () => setStatusBarOverride(null, colors.page);
    }, []),
  );
  const unread = state.notifications.some((n) => !n.read);

  const feed = useMemo(() => {
    if (!me) return null;
    const all = buildFeed(state, me);
    const near = all.filter((i) => i.kind === 'game' && i.miles <= me.radiusMiles) as { kind: 'game'; game: Game; miles: number }[];
    return {
      games: near.map((i) => ({ game: i.game, miles: i.miles })),
      furtherMiles: all.filter((i) => i.kind === 'game' && i.miles > me.radiusMiles).map((i) => i.miles),
    };
  }, [state, me]);

  // everything upcoming: games near you, club opens within your radius and national championships,
  // with the competitions narrowed by the filters
  const listFor = (f: CompFilters) => {
    if (!me || !feed) return [] as Item[];
    const list: Item[] = [
      ...feed.games.map(({ game, miles }) => ({ kind: 'game' as const, key: game.id, date: new Date(game.teeTime), game, miles })),
      ...searchCompetitions(f, me.location, me.handicap, me.radiusMiles).map((l): Item => {
        if (l.kind === 'national') return { kind: 'national', key: l.id, date: addDays(l.e.playedIn), e: l.e };
        const d = addDays(l.e.playedIn);
        const [h, m] = l.e.start.split(':').map(Number);
        d.setHours(h, m);
        return { kind: 'open', key: l.id, date: d, e: l.e, miles: l.miles };
      }),
    ];
    return list.filter((i) => inWindow(i.date, 'upcoming')).sort((a, b) => a.date.getTime() - b.date.getTime());
  };
  const base = useMemo(() => listFor(compFilters), [me, feed, compFilters]); // eslint-disable-line react-hooks/exhaustive-deps
  // search looks through everything, whatever the filters
  const everything = useMemo(() => listFor(defaultCompFilters()), [me, feed]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => {
    return base
      .filter((i) => {
        if (cat === 'games') return i.kind === 'game';
        if (cat === 'competitions') return i.kind !== 'game';
        if (cat === 'saved') return i.kind === 'game' ? savedGames.includes(i.key) : reminders.includes(i.key);
        return true;
      })
      .filter((i) => inWindow(i.date, when));
  }, [base, cat, when, savedGames, reminders]);

  // search looks through everything upcoming, whatever filters the feed has, and also finds golfers
  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return { listings: [] as Item[], people: [] as Golfer[], clubs: [] as CourseResult[] };
    const listings = everything
      .filter((i) => {
        // every word typed has to appear somewhere in the listing: club, town, host, event or venue
        let text = '';
        if (i.kind === 'game') {
          const c = courseById(i.game.courseId);
          const h = state.golfers[i.game.hostId];
          text = [c?.name, c?.town, c?.region, c ? associationById(courseCountry(c)).short : '', h?.firstName, h?.lastName, i.game.memberHost ? 'member guest' : ''].join(' ');
        } else if (i.kind === 'open') {
          const c = courseById(i.e.courseId);
          text = [c?.name, c?.town, c?.region, c ? associationById(courseCountry(c)).short : '', eventTitle(i.e), eventSummary(i.e), 'open'].join(' ');
        } else {
          text = [i.e.title, i.e.venue, associationById(i.e.association).name, associationById(i.e.association).short, 'championship'].join(' ');
        }
        text = text.toLowerCase();
        return words.every((w) => text.includes(w));
      });
    // clubs, and each course at clubs with more than one: "Gleneagles" lists the club and its courses
    const clubs = searchCourses(query, me!.location, 10);
    const people = Object.values(state.golfers).filter((g) => g.id !== ME && !state.blockedIds.includes(g.id) && words.every((w) => `${g.firstName} ${g.lastName} @${g.username} ${g.username} ${g.homeClub ?? ''} ${g.location.name}`.toLowerCase().includes(w)));
    return { listings, people, clubs };
  }, [everything, query, state.golfers, state.blockedIds, me, clubsVersion]);

  if (!me || !feed) return null;

  // a wider radius that would actually bring more games into view
  const wider = [25, 50, 100].find((m) => m > me.radiusMiles && feed.furtherMiles.some((mi) => mi <= m));
  const widen = () => {
    if (!wider) return;
    const before = me.radiusMiles;
    updateProfile({ radiusMiles: wider });
    toast(`Now showing games within ${wider} miles`, { icon: 'navigate', action: { label: 'Undo', onPress: () => updateProfile({ radiusMiles: before }) } });
  };
  const refresh = (done?: () => void) => {
    setRefreshing(true);
    // load the latest real games and friends from the account
    requestSync();
    setTimeout(() => {
      setRefreshing(false);
      // a new key replays the cards' entrance, so the refresh is felt as well as seen
      setFeedNonce((n) => n + 1);
      haptic.success();
      toast('You’re up to date', { icon: 'refresh' });
      done?.();
    }, 900);
  };

  // pull to refresh for the web app, where the native control isn't available
  const onPullStart = (pageY: number) => {
    pullStart.current = !refreshing && lastY.current <= 0 ? pageY : null;
  };
  const onPullMove = (pageY: number) => {
    if (pullStart.current === null) return;
    if (lastY.current > 0) {
      pullStart.current = null;
      return;
    }
    const d = Math.max(0, Math.min(130, (pageY - pullStart.current) * 0.45));
    pullNow.current = d;
    pull.setValue(d);
    const next = d >= PULL_TRIGGER ? 'ready' : d > 0 ? 'pulling' : 'idle';
    if (next !== pullStateRef.current) {
      if (next === 'ready') haptic.select();
      pullStateRef.current = next;
      setPullState(next);
    }
  };
  const onPullEnd = () => {
    if (pullStart.current === null) return;
    pullStart.current = null;
    if (pullNow.current >= PULL_TRIGGER) {
      pullStateRef.current = 'refreshing';
      setPullState('refreshing');
      Animated.spring(pull, { toValue: 60, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
      refresh(() => {
        Animated.timing(pull, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        pullStateRef.current = 'idle';
        setPullState('idle');
      });
    } else {
      Animated.spring(pull, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 0 }).start();
      pullStateRef.current = 'idle';
      setPullState('idle');
    }
    pullNow.current = 0;
  };
  pullHandlers.current = { start: onPullStart, move: onPullMove, end: onPullEnd };

  const share = async (title: string, path: string) => {
    const r = await shareLink(title, path);
    if (r === 'copied') toast('Link copied', { icon: 'link' });
  };

  const saveGame = (g: Game, name: string) => {
    const on = toggleSavedGame(g.id);
    haptic.select();
    toast(on ? `Saved ${name}` : 'Removed from saved', { icon: on ? 'heart' : 'heart-outline', action: on ? { label: 'View', onPress: () => setCat('saved') } : { label: 'Undo', onPress: () => toggleSavedGame(g.id) } });
  };
  const saveEvent = (id: string) => {
    const on = toggleReminder(id);
    haptic.select();
    toast(on ? 'Saved to your calendar. We’ll remind you before entries close' : 'Removed from your calendar', { icon: on ? 'heart' : 'heart-outline', action: on ? { label: 'Calendar', onPress: () => router.push('/season') } : { label: 'Undo', onPress: () => toggleReminder(id) } });
  };

  const friendGames = items
    .filter((i): i is Extract<Item, { kind: 'game' }> => i.kind === 'game')
    .map((i) => {
      const going = [i.game.hostId, ...acceptedFor(state, i.game.id).map((r) => r.golferId)];
      const pals = going.filter((id) => id !== ME && friends.friends.includes(id)).map((id) => state.golfers[id]).filter(Boolean);
      return { i, pals };
    })
    .filter((x) => x.pals.length > 0)
    .slice(0, 6);
  /** One compact line in the search results */
  const resultLine = (i: Item) => {
    if (i.kind === 'game') {
      const c = courseById(i.game.courseId);
      return { key: i.key, photoId: c?.id, title: c?.name ?? 'Golf course', sub: `Game · ${whenLine(i.date, formatTime(i.date))} · ${Math.max(1, Math.round(i.miles))} mi`, path: `/game/${i.game.id}` };
    }
    if (i.kind === 'open') {
      const c = courseById(i.e.courseId);
      return { key: i.key, photoId: c?.id, title: `${eventTitle(i.e)}, ${c?.name ?? ''}`, sub: `Club open · ${whenLine(i.date, `from ${i.e.start}`)} · ${Math.max(1, Math.round(i.miles))} mi`, path: `/open/${i.e.id}` };
    }
    const venue = courses.find((c) => c.name.toLowerCase().startsWith(i.e.venue.toLowerCase()));
    return { key: i.key, photoId: venue?.id, title: i.e.title, sub: `Championship · ${shortDate(i.date)} · ${i.e.venue}`, path: `/championship/${i.e.id}` };
  };
  const hasQuery = query.trim().length > 0;
  // open something from search, and remember it for next time
  const openResult = (r: RecentSearch) => {
    addRecentSearch(r);
    if (r.path) router.push(r.path as never);
  };
  const openRecent = (r: RecentSearch) => {
    if (r.kind === 'query') {
      haptic.select();
      setQuery(r.title);
      addRecentSearch(r);
      return;
    }
    openResult(r);
  };

  const renderItem = (i: Item, index: number) => {
    if (i.kind === 'game') {
      const g = i.game;
      const course = courseById(g.courseId);
      const host = state.golfers[g.hostId];
      const players = [host, ...acceptedFor(state, g.id).map((r) => state.golfers[r.golferId])].filter(Boolean);
      const left = spacesLeft(state, g);
      const name = course?.name ?? 'Golf course';
      const p = priceLabel(g.costPerGolfer);
      return (
        <FeedCard
          key={i.key}
          index={index}
          course={course}
          date={i.date}
          kicker={`Game · ${formatTime(i.date)}${g.memberHost ? ' · Members’ guest rate' : ''}`}
          title={name}
          place={`${course?.town ?? ''} · ${Math.max(1, Math.round(i.miles))} mi away`}
          price={p === 'Cost TBC' ? 'TBC' : p}
          saved={savedGames.includes(g.id)}
          onPress={() => router.push(`/game/${g.id}`)}
          onSave={() => saveGame(g, name)}
          onShare={() => share(`Game at ${name}`, `/game/${g.id}`)}
          label={`Game at ${name}, ${whenLine(i.date, formatTime(i.date))}. ${left > 0 ? `${left} space${left === 1 ? '' : 's'} left` : 'Full'}. ${p}`}
          footer={
            <Row gap={space.sm}>
              <AvatarStack golfers={players.slice(0, 3)} size={26} />
              <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>
                <T variant="smallStrong">{players.length} going</T>
                <T variant="small" color={colors.textMuted}>{'  ·  '}{left > 0 ? `${left} space${left === 1 ? '' : 's'} left` : 'Full'}</T>
              </T>
            </Row>
          }
        />
      );
    }
    if (i.kind === 'open') {
      const e = i.e;
      const course = courseById(e.courseId);
      const title = eventTitle(e);
      return (
        <FeedCard
          key={i.key}
          index={index}
          course={course}
          date={i.date}
          isNew={e.listedDaysAgo <= 7}
          kicker={`Club open · from ${e.start}`}
          title={title}
          place={`${course?.name ?? ''} · ${Math.max(1, Math.round(i.miles))} mi away`}
          price={`£${e.fee}`}
          saved={reminders.includes(e.id)}
          onPress={() => router.push(`/open/${e.id}`)}
          onSave={() => saveEvent(e.id)}
          onShare={() => share(`${title} at ${course?.name ?? 'a club near you'}`, `/open/${e.id}`)}
          label={`${title} at ${course?.name}. ${whenLine(i.date, `from ${e.start}`)}. £${e.fee} entry`}
          footer={<InterestedStrip eventId={e.id} fallback={<T variant="small" color={colors.textMuted}>{eventSummary(e)}</T>} />}
        />
      );
    }
    const e = i.e;
    const assoc = associationById(e.association);
    const st = entryStatus(e);
    const venue = courses.find((c) => c.name.toLowerCase().startsWith(e.venue.toLowerCase()));
    const end = addDays(e.playedIn + e.days - 1);
    return (
      <FeedCard
        key={i.key}
        index={index}
        course={venue}
        date={i.date}
        kicker={`${assoc.short} championship · ${e.days} days`}
        title={e.title}
        place={`${e.venue} · ${shortDate(i.date)} to ${shortDate(end)}`}
        saved={reminders.includes(e.id)}
        onPress={() => router.push(`/championship/${e.id}`)}
        onSave={() => saveEvent(e.id)}
        onShare={() => share(e.title, `/championship/${e.id}`)}
        label={`${e.title} at ${e.venue}. Entry ${st.text.toLowerCase()}`}
        footer={
          <InterestedStrip
            eventId={e.id}
            fallback={
              <Row gap={space.sm}>
                <View style={[s.dot, { backgroundColor: st.kind === 'closing' || st.kind === 'soon' ? '#D9A441' : st.kind === 'open' ? '#6B8F7B' : colors.borderStrong }]} />
                <T variant="smallStrong">Entry {st.text.toLowerCase()}</T>
              </Row>
            }
          />
        }
      />
    );
  };

  const showExtras = when === 'upcoming' && cat === 'all';
  const mapPath = cat === 'competitions' ? '/map?layer=events' : '/map';
  const tabBarClear = Math.max(insets.bottom - 6, 10) + 66 + 6;

  return (
    <View style={ui.screen}>
        <View pointerEvents="box-none" style={s.headerWrap}>
         {/* the date chips and category tabs sit on their own black layer behind the search row and slide up under it, moved by the native driver so scrolling stays smooth */}
         <Animated.View
          onLayout={(e) => setFiltersH(Math.round(e.nativeEvent.layout.height))}
          style={[s.filtersLayer, { top: searchH, transform: [{ translateY: fold.interpolate({ inputRange: [0, 1], outputRange: [-filtersH, 0] }) }] }]}>
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.09)']} style={s.edgeGlow} />
          <View pointerEvents="none" style={s.edgeLip} />
          <View style={[ui.contentWidth, s.filters]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.md, marginHorizontal: -space.xl }} contentContainerStyle={{ gap: 6, paddingHorizontal: space.xl }}>
            {filterCount > 0 ? (
              <View style={[s.chip, s.filterChip]}>
                <Pressable onPress={() => { haptic.select(); setFiltersOpen(true); }} accessibilityRole="button" accessibilityLabel={`Competition filters, ${filterCount} on. Change them`} style={s.filterChipLabel}>
                  <Ionicons name="options-outline" size={15} color={colors.ink} />
                  <T variant="smallStrong" color={colors.ink}>Filters · {filterCount}</T>
                </Pressable>
                <Pressable onPress={() => { haptic.select(); setCompFilters(defaultCompFilters()); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear competition filters" style={s.filterChipX}>
                  <Ionicons name="close" size={16} color={colors.ink} />
                </Pressable>
              </View>
            ) : null}
            {WHEN.map((w) => {
              const on = when === w.id;
              return (
                <Pressable key={w.id} onPress={() => { haptic.select(); setWhen(w.id); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => [s.chip, on && s.chipOn, pressed && ui.pressed]}>
                  <T variant="smallStrong" color={on ? colors.ink : colors.onInk}>{w.label}</T>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={s.tabsWrap}>
          <View style={{ flexDirection: 'row' }}>
            {CATEGORIES.map((c) => {
              const on = cat === c.id;
              return (
                <Pressable key={c.id} onPress={() => { haptic.select(); setCat(c.id); }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={c.label} style={s.tab}>
                  <View style={s.tabIcon}>
                    <Ionicons name={on ? c.on : c.icon} size={20} color={on ? colors.accent : colors.onInkMuted} />
                  </View>
                  <T variant={on ? 'smallStrong' : 'small'} color={on ? colors.white : colors.onInkMuted}>{c.label}</T>
                  <View style={[s.tabLine, on && s.tabLineOn]} />
                </Pressable>
              );
            })}
          </View>
          </View>
          </View>
         </Animated.View>
         <View onLayout={(e) => setSearchH(Math.round(e.nativeEvent.layout.height))} style={s.searchLayer}>
          <View style={[ui.contentWidth, s.header, { paddingTop: insets.top + space.md }]}>
          <Row gap={space.sm}>
            <View style={s.search}>
              <Ionicons name="search" size={20} color={colors.onInkMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onFocus={openSearch}
                placeholder="Clubs, golfers, games"
                placeholderTextColor={colors.onInkMuted}
                accessibilityLabel="Search games, opens and championships"
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                enterKeyHint="search"
                inputMode="search"
                onSubmitEditing={() => {
                  const q = query.trim();
                  if (q) addRecentSearch({ key: `query:${q.toLowerCase()}`, kind: 'query', title: q });
                  Keyboard.dismiss();
                }}
                style={s.searchInput}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={20} color={colors.onInkMuted} />
                </Pressable>
              ) : null}
            </View>
            {searching ? (
              <Pressable onPress={closeSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel search" style={s.cancel}>
                <T variant="bodyStrong" color={colors.white}>Cancel</T>
              </Pressable>
            ) : (
              <>
                <IconButton icon="notifications-outline" label={unread ? 'Notifications, new' : 'Notifications'} badge={unread} onDark color={colors.white} style={s.darkIconButton} onPress={() => router.push('/notifications')} />
                <ProfileButton onDark />
              </>
            )}
          </Row>

          </View>
         </View>
         {/* soft shadow and lit lip under the search row, shown once the filters have folded away */}
         <Animated.View pointerEvents="none" style={[s.foldEdge, { top: searchH, opacity: fold.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          <LinearGradient colors={['rgba(15,26,20,0.30)', 'rgba(15,26,20,0)']} style={StyleSheet.absoluteFill} />
          <View style={s.foldLip} />
         </Animated.View>
        </View>

      <ScrollView
        ref={feedRef}
        contentContainerStyle={{ paddingTop: searchH + filtersH, paddingBottom: tabBarClear + 90 }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={Platform.OS === 'web' ? ({ overscrollBehaviorY: 'none' } as object) : undefined}
        refreshControl={Platform.OS === 'web' ? undefined : <RefreshControl refreshing={refreshing} onRefresh={() => refresh()} tintColor={colors.ink} colors={[colors.ink]} />}>
        <Animated.View key={feedNonce} style={[ui.contentWidth, ui.padded, { paddingTop: space.lg, transform: [{ translateY: pull }] }]}>
          {cat === 'competitions' && filterCount === 0 ? (
            <Pressable onPress={() => { haptic.select(); setFiltersOpen(true); }} accessibilityRole="button" style={({ pressed }) => [s.directory, pressed && ui.pressed]}>
              <Ionicons name="options-outline" size={18} color={colors.ink} />
              <T variant="bodyStrong" style={{ flex: 1 }}>Filter by country, format, who can play and more</T>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ) : null}

          {showExtras ? (
            <View style={{ marginBottom: space.xl }}>
              <ForYou limit={1} />
            </View>
          ) : null}

          {items.length === 0 && filterCount > 0 && cat === 'competitions' ? (
            <EmptyState icon="trophy-outline" title="No competitions match" body="Try another date, or fewer filters." action="Clear filters" onAction={() => setCompFilters(defaultCompFilters())} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={cat === 'saved' ? 'heart-outline' : 'golf-outline'}
              title={cat === 'saved' ? 'Nothing saved yet' : `Nothing ${EMPTY_WHEN[when]}`}
              body={cat === 'saved' ? 'Tap the heart on a game, open or championship to keep it here.' : 'Try another day, or post a game and let golfers come to you.'}
              action={cat === 'saved' || when !== 'upcoming' ? 'Show everything upcoming' : 'Post a game'}
              onAction={() => (cat === 'saved' || when !== 'upcoming' ? (setCat('all'), setWhen('upcoming')) : router.push('/post'))}
            />
          ) : (
            items.map((i, idx) => (
              <View key={i.key}>
                {idx === 0 || dayBucket(items[idx - 1].date) !== dayBucket(i.date) ? (
                  <View style={[s.dayHead, idx === 0 && { marginTop: 0 }]}>
                    <Text style={s.dayTitle}>{dayBucket(i.date)}</Text>
                    <View style={s.dayRule} />
                  </View>
                ) : null}
                {idx === 2 && showExtras && friendGames.length > 0 ? (
                  <View style={{ marginBottom: 40 }}>
                    <View style={[s.dayHead, { marginTop: 0 }]}>
                      <Text style={s.dayTitle}>Friends are playing</Text>
                      <View style={s.dayRule} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.xl }}>
                      {friendGames.map(({ i: fi, pals }) => {
                        const fc = courseById(fi.game.courseId);
                        return (
                          <Pressable key={fi.key} onPress={() => router.push(`/game/${fi.game.id}`)} accessibilityRole="button" accessibilityLabel={`${displayName(pals[0])} is playing at ${fc?.name}`} style={({ pressed }) => [s.pal, pressed && ui.pressed]}>
                            <Avatar golfer={pals[0]} size={44} />
                            <T variant="bodyStrong" numberOfLines={1} style={{ marginTop: space.md }}>{pals[0].firstName}{pals.length > 1 ? ` and ${pals.length - 1} more` : ''}</T>
                            <T variant="small" color={colors.textMuted} numberOfLines={2}>{fc?.name}</T>
                            <T variant="small" color={colors.textMuted}>{whenLine(fi.date, formatTime(fi.date))}</T>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
                {renderItem(i, idx)}
              </View>
            ))
          )}

          {items.length > 0 ? (
            <View style={s.endMark}>
              <Ionicons name="flag-outline" size={16} color={colors.textFaint} />
              <T variant="small" color={colors.textFaint}>That’s everything {when === 'upcoming' ? 'coming up' : EMPTY_WHEN[when]}</T>
            </View>
          ) : null}

          {cat === 'competitions' && filterCount > 0 && items.length > 0 ? (
            <Pressable onPress={() => setAlertOpen(true)} accessibilityRole="button" style={({ pressed }) => [s.alertRow, pressed && ui.pressed]}>
              <View style={s.alertIcon}><Ionicons name="notifications" size={15} color={colors.ink} /></View>
              <View style={{ flex: 1 }}>
                <T variant="smallStrong" color={colors.onInk}>Email me new competitions like these</T>
                <T variant="caption" color={colors.onInkMuted} numberOfLines={1}>{compFiltersName(compFilters, me.location.name)}. Hear first, before they fill.</T>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.onInkMuted} />
            </Pressable>
          ) : null}

          {wider && cat !== 'saved' ? (
            <Pressable onPress={widen} style={({ pressed }) => [s.widen, pressed && ui.pressed]} accessibilityRole="button">
              <View style={s.footIcon}>
                <Ionicons name="navigate" size={15} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">Want more to choose from?</T>
                <T variant="small" color={colors.textMuted}>Search within {wider} miles instead of {me.radiusMiles}</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* the pull to refresh indicator, revealed as the feed is pulled down */}
      {Platform.OS === 'web' ? (
        <Animated.View
          pointerEvents="none"
          style={[s.pullWrap, { top: searchH + filtersH + 6, opacity: pull.interpolate({ inputRange: [0, 30, 60], outputRange: [0, 0.6, 1], extrapolate: 'clamp' }), transform: [{ scale: pull.interpolate({ inputRange: [0, PULL_TRIGGER], outputRange: [0.6, 1], extrapolate: 'clamp' }) }] }]}>
          <View style={s.pullBubble}>
            {pullState === 'refreshing' ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Animated.View style={{ transform: [{ rotate: pull.interpolate({ inputRange: [0, PULL_TRIGGER], outputRange: ['0deg', '180deg'], extrapolate: 'clamp' }) }] }}>
                <Ionicons name="arrow-down" size={18} color={pullState === 'ready' ? colors.ink : colors.textMuted} />
              </Animated.View>
            )}
          </View>
        </Animated.View>
      ) : null}

      {searching ? (
        <View style={s.searchPage}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: searchH + space.md, paddingBottom: 120 }}>
            <View style={[ui.contentWidth, ui.padded]}>
              {!hasQuery ? (
                <>
                  {recents.length === 0 ? (
                    <View style={s.recentEmpty}>
                      <View style={s.recentEmptyIcon}><Ionicons name="search" size={22} color={colors.ink} /></View>
                      <T variant="subheading" style={{ marginTop: space.md }}>Search PlusFore</T>
                      <T variant="body" color={colors.textMuted} style={{ marginTop: space.xs, textAlign: 'center' }}>Find a club, a course, a golfer or a game. Your recent searches will show here.</T>
                    </View>
                  ) : (
                    <>
                      <Row style={[s.group, { justifyContent: 'space-between' }]}>
                        <T variant="label" color={colors.textMuted} style={{ letterSpacing: 1 }}>RECENT</T>
                        <Pressable onPress={() => { haptic.select(); clearRecentSearches(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear recent searches">
                          <T variant="smallStrong" color={colors.text}>Clear</T>
                        </Pressable>
                      </Row>
                      {recents.map((r) => {
                        const golfer = r.golferId ? state.golfers[r.golferId] : undefined;
                        return (
                          <View key={r.key} style={s.line}>
                            <Pressable onPress={() => openRecent(r)} accessibilityRole="button" accessibilityLabel={r.kind === 'query' ? `Search for ${r.title}` : `${r.title}${r.sub ? `. ${r.sub}` : ''}`} style={({ pressed }) => [s.recentMain, pressed && ui.pressed]}>
                              {r.kind === 'query' ? (
                                <View style={s.courseIcon}><Ionicons name="time-outline" size={18} color={colors.ink} /></View>
                              ) : r.kind === 'golfer' ? (
                                <Avatar golfer={golfer} size={44} />
                              ) : r.kind === 'course' ? (
                                <View style={s.courseIcon}><Ionicons name="flag" size={16} color={colors.ink} /></View>
                              ) : (
                                <Image source={photoFor(r.photoId)} style={s.lineThumb} contentFit="cover" accessibilityIgnoresInvertColors />
                              )}
                              <View style={{ flex: 1 }}>
                                <T variant="bodyStrong" numberOfLines={1}>{r.title}</T>
                                {r.sub ? <T variant="small" color={colors.textMuted} numberOfLines={1}>{r.sub}</T> : null}
                              </View>
                            </Pressable>
                            <Pressable onPress={() => { haptic.select(); removeRecentSearch(r.key); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${r.title} from recent searches`} style={s.recentRemove}>
                              <Ionicons name="close" size={18} color={colors.textFaint} />
                            </Pressable>
                          </View>
                        );
                      })}
                    </>
                  )}
                </>
              ) : results.listings.length === 0 && results.people.length === 0 && results.clubs.length === 0 ? (
                <View style={{ paddingVertical: space.xxxl }}>
                  <T variant="heading">Nothing matches “{query.trim()}”</T>
                  <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>Try a club, a town, an event or a golfer’s name.</T>
                </View>
              ) : (
                <>
                  {results.clubs.length > 0 ? <T variant="label" color={colors.textMuted} style={s.group}>CLUBS AND COURSES</T> : null}
                  {results.clubs.map(({ club: c, layout, miles }) => {
                    const title = layout ? `${clubShortName(c.name)} · ${layout.name}` : c.name;
                    const n = layoutsFor(c).length;
                    const sub = layout
                      ? `${layout.holes ? `${layout.holes} holes · ` : ''}${c.town} · ${Math.max(1, Math.round(miles))} mi`
                      : `${n ? `${n} courses · ` : ''}${c.town} · ${Math.max(1, Math.round(miles))} mi${c.visitorFee ? ` · visitors £${c.visitorFee}` : ''}`;
                    return (
                      <Pressable key={`${c.id}:${layout?.name ?? ''}`} onPress={() => openResult(layout ? { key: `course:${c.id}:${layout.name}`, kind: 'course', title, sub: `${layout.holes ? `${layout.holes} holes · ` : ''}${c.town}`, path: coursePath(c.id, layout.name), photoId: c.id } : { key: `club:${c.id}`, kind: 'club', title, sub: c.town, path: `/club/${c.id}`, photoId: c.id })} accessibilityRole="button" accessibilityLabel={`${title}, ${layout ? 'course' : 'club'} profile`} style={({ pressed }) => [s.line, layout && s.courseLine, pressed && ui.pressed]}>
                        {layout ? (
                          <View style={s.courseIcon}><Ionicons name="flag" size={16} color={colors.ink} /></View>
                        ) : (
                          <Image source={photoFor(c.id)} style={s.lineThumb} contentFit="cover" accessibilityIgnoresInvertColors />
                        )}
                        <View style={{ flex: 1 }}>
                          <T variant="bodyStrong" numberOfLines={1}>{title}</T>
                          <T variant="small" color={colors.textMuted} numberOfLines={1}>{sub}</T>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                      </Pressable>
                    );
                  })}
                  {results.listings.length > 0 ? <T variant="label" color={colors.textMuted} style={[s.group, results.clubs.length > 0 && { marginTop: space.xl }]}>GAMES AND COMPETITIONS</T> : null}
                  {results.listings.map((i) => {
                    const r = resultLine(i);
                    return (
                      <Pressable key={r.key} onPress={() => openResult({ key: `listing:${r.key}`, kind: 'listing', title: r.title, sub: r.sub.split(' · ')[0], path: r.path, photoId: r.photoId })} accessibilityRole="button" accessibilityLabel={`${r.title}. ${r.sub}`} style={({ pressed }) => [s.line, pressed && ui.pressed]}>
                        <Image source={photoFor(r.photoId)} style={s.lineThumb} contentFit="cover" accessibilityIgnoresInvertColors />
                        <View style={{ flex: 1 }}>
                          <T variant="bodyStrong" numberOfLines={1}>{r.title}</T>
                          <T variant="small" color={colors.textMuted} numberOfLines={1}>{r.sub}</T>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                      </Pressable>
                    );
                  })}
                  {results.people.length > 0 ? <T variant="label" color={colors.textMuted} style={[s.group, results.listings.length > 0 && { marginTop: space.xl }]}>GOLFERS</T> : null}
                  {results.people.map((g) => (
                    <Pressable key={g.id} onPress={() => openResult({ key: `golfer:${g.id}`, kind: 'golfer', title: `${g.firstName} ${g.lastName}`, sub: `@${g.username}`, path: `/golfer/${g.id}`, golferId: g.id })} accessibilityRole="button" accessibilityLabel={`${g.firstName} ${g.lastName}`} style={({ pressed }) => [s.line, pressed && ui.pressed]}>
                      <Avatar golfer={g} size={44} />
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong" numberOfLines={1}>{g.firstName} {g.lastName}</T>
                        <T variant="small" color={colors.textMuted} numberOfLines={1}>@{g.username}{g.homeClub ? ` · ${g.homeClub}` : ` · ${g.location.name}`}</T>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                    </Pressable>
                  ))}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      ) : null}

      <CompetitionFilters
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={compFilters}
        onChange={(f) => {
          setCompFilters(f);
          // chosen dates take over from the date chips, so they don't fight
          if ((f.from || f.to) && when !== 'upcoming') setWhen('upcoming');
          // filtering is about competitions, so show them
          if (cat === 'games') setCat('competitions');
        }}
        count={base.filter((i) => i.kind !== 'game' && inWindow(i.date, when)).length}
        near={me.location.name}
      />
      <AlertSheet
        visible={alertOpen}
        onClose={() => setAlertOpen(false)}
        suggestedName={compFiltersName(compFilters, me.location.name)}
        filters={{ country: compFilters.country, show: compFilters.show, gender: compFilters.gender, format: compFilters.format, holes: compFilters.holes, entry: compFilters.entry, maxMiles: compFilters.maxMiles, collection: compFilters.collection }}
      />

      <View pointerEvents="box-none" style={[s.mapWrap, searching && { display: 'none' }, { bottom: tabBarClear + 14 }]}>
        <Pressable onPress={() => router.push(mapPath)} accessibilityRole="button" accessibilityLabel="Show on the map" style={({ pressed }) => [s.mapPill, pressed && ui.pressed]}>
          <Ionicons name="map-outline" size={18} color={colors.white} />
          <T variant="bodyStrong" color={colors.onInk}>Map</T>
        </Pressable>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  // The black top of the screen: full width, square edged, from the very top (behind the clock) down past the tabs.
  // It sits above the scrolling feed, so it stays put while the feed moves beneath it
  // zIndex lifts it above the feed so its shadow falls on the cards beneath
  cancel: { paddingHorizontal: space.sm, height: 48, justifyContent: 'center' },
  searchPage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.page, zIndex: 5 },
  group: { marginTop: space.md, marginBottom: space.sm, letterSpacing: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(15,26,20,0.1)' },
  lineThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.mist },
  // a course sits indented under its club in search results
  courseLine: { paddingLeft: space.lg },
  recentMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  recentRemove: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  recentEmpty: { alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.lg },
  recentEmptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  courseIcon: { width: 32, height: 32, borderRadius: 16, marginHorizontal: 6, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  directory: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.mist, marginBottom: space.xl },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  filtersLayer: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.ink, shadowColor: '#0F1A14', shadowOpacity: 0.32, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  searchLayer: { backgroundColor: colors.ink },
  filters: { paddingHorizontal: space.xl, paddingBottom: space.md },
  foldEdge: { position: 'absolute', left: 0, right: 0, height: 16 },
  foldLip: { position: 'absolute', left: 0, right: 0, top: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  edgeGlow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 36 },
  edgeLip: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  header: { paddingHorizontal: space.xl, paddingBottom: space.md },
  darkIconButton: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  search: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)' },
  // 16px keeps iPhone Safari from zooming the page when the field is focused
  searchInput: { flex: 1, minWidth: 0, width: '100%', height: '100%', fontFamily: fonts.medium, fontSize: 16, color: colors.white, outlineStyle: 'none' } as object,
  // outlined on forest, light sage when chosen, as in the brand guideline's Home example
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(231,225,219,0.28)' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  // the filters chip: tap the words to change them, the cross to clear them
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, paddingHorizontal: 0, backgroundColor: colors.surface, borderColor: colors.surface },
  filterChipLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingLeft: 12, paddingRight: 4 },
  filterChipX: { paddingVertical: 6, paddingLeft: 4, paddingRight: 10 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: space.md, marginBottom: space.xl },
  alertIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tabsWrap: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.inkBorder },
  tab: { flex: 1, alignItems: 'center', gap: 6, paddingTop: 2 },
  tabIcon: { width: 40, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabLine: { height: 3, width: 44, borderRadius: 2, marginTop: 6, backgroundColor: 'transparent' },
  pal: { width: 176, padding: space.lg, borderRadius: 20, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm, marginBottom: space.lg },
  dayTitle: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink },
  dayRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  pullWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  pullBubble: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong, shadowColor: '#0F1A14', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  endMark: { alignItems: 'center', gap: 6, paddingTop: space.sm, paddingBottom: space.xl },
  tabLineOn: { backgroundColor: colors.accent },
  footIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  widen: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  mapWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: colors.ink, shadowColor: '#0F1A14', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
