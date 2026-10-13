import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { photoFor } from '@/data/course-photos';
import { ProfileButton } from '@/components/profile-button';
import { FeedCard } from '@/components/feed-card';
import { ForYou } from '@/components/for-you';
import { useToast } from '@/components/toast';
import { Image } from 'expo-image';
import { Avatar, AvatarStack, Button, EmptyState, IconButton, Row, Sheet, T, styles as ui, type IconName } from '@/components/ui';
import { colors, fonts, hairline, maxContentWidth, radius, shadowSoft, space } from '@/constants/theme';
import { clubEventsNear, courseCountry, eventSummary, eventTitle } from '@/data/club-events';
import { courseById, courses } from '@/data/courses';
import { addDays, associationById, entryStatus, toggleReminder, upcomingEvents, useReminders } from '@/data/events';
import { useFriends } from '@/data/friends';
import { toggleSavedGame, useSavedGames } from '@/data/saved-games';
import { acceptedFor, ME, spacesLeft, useStore } from '@/data/store';
import type { Course, Game, Golfer, LookingPost } from '@/data/types';
import { dayDiff, displayName, distanceMiles, formatTime, gameTypeLabels, priceLabel, shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { buildFeed } from '@/lib/selectors';
import { shareLink } from '@/lib/share';
import { setStatusBarOverride } from '@/lib/status-bar';

type When = 'upcoming' | 'today' | 'tomorrow' | 'weekend';
type Category = 'all' | 'games' | 'guest' | 'opens' | 'nationals' | 'saved';

const WHEN: { id: When; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'weekend', label: 'Weekend' },
];

const CATEGORIES: { id: Category; label: string; icon: IconName; on: IconName }[] = [
  { id: 'all', label: 'Everything', icon: 'sparkles-outline', on: 'sparkles' },
  { id: 'games', label: 'Games', icon: 'people-outline', on: 'people' },
  { id: 'guest', label: 'Guest rates', icon: 'pricetag-outline', on: 'pricetag' },
  { id: 'opens', label: 'Club opens', icon: 'trophy-outline', on: 'trophy' },
  { id: 'nationals', label: 'Championships', icon: 'flag-outline', on: 'flag' },
  { id: 'saved', label: 'Saved', icon: 'heart-outline', on: 'heart' },
];

const EMPTY_WHEN: Record<When, string> = { upcoming: 'coming up', today: 'on today', tomorrow: 'on tomorrow', weekend: 'on this weekend' };

/** Fits the chosen window: today, tomorrow or the coming Saturday and Sunday */
function inWindow(d: Date, when: When) {
  const diff = dayDiff(d, new Date());
  if (diff < 0) return false;
  if (when === 'today') return diff === 0;
  if (when === 'tomorrow') return diff === 1;
  if (when === 'weekend') return diff <= 6 && (d.getDay() === 6 || d.getDay() === 0);
  return true;
}

/** "Today · 10:20", "Tomorrow · 13:10" or "Sat 11 Oct · 09:40" */
function whenLine(d: Date, time?: string) {
  const diff = dayDiff(d, new Date());
  const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : shortDate(d);
  return time ? `${day} · ${time}` : day;
}

type Item =
  | { kind: 'game'; key: string; date: Date; game: Game; miles: number }
  | { kind: 'open'; key: string; date: Date; e: ReturnType<typeof clubEventsNear>[number]['e']; miles: number }
  | { kind: 'national'; key: string; date: Date; e: ReturnType<typeof upcomingEvents>[number] };

export default function Home() {
  const insets = useSafeAreaInsets();
  const { state, me, updateProfile } = useStore();
  const toast = useToast();
  const reminders = useReminders();
  const savedGames = useSavedGames();
  const [when, setWhen] = useState<When>('upcoming');
  const [cat, setCat] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
  const onScroll = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = Math.max(0, e.nativeEvent.contentOffset.y);
    const dy = y - lastY.current;
    if (y < 24) setFolded(false);
    else if (dy > 10) setFolded(true);
    else if (dy < -10) setFolded(false);
    lastY.current = y;
  };
  // the black header runs behind the clock too: turn the status bar black while Home is showing
  useFocusEffect(
    useCallback(() => {
      setStatusBarOverride(colors.ink, colors.surface);
      return () => setStatusBarOverride(null, colors.surface);
    }, []),
  );
  const unread = state.notifications.some((n) => !n.read);

  const feed = useMemo(() => {
    if (!me) return null;
    const all = buildFeed(state, me);
    const near = all.filter((i) => i.kind === 'game' && i.miles <= me.radiusMiles) as { kind: 'game'; game: Game; miles: number }[];
    return {
      games: near.map((i) => ({ game: i.game, miles: i.miles })),
      golfers: all.filter((i) => i.kind === 'looking').map((i) => (i as { post: LookingPost }).post),
      furtherMiles: all.filter((i) => i.kind === 'game' && i.miles > me.radiusMiles).map((i) => i.miles),
    };
  }, [state, me]);

  const base = useMemo(() => {
    if (!me || !feed) return [] as Item[];
    const list: Item[] = [
      ...feed.games.map(({ game, miles }) => ({ kind: 'game' as const, key: game.id, date: new Date(game.teeTime), game, miles })),
      ...clubEventsNear(me.location, me.radiusMiles).map(({ e, miles }) => {
        const d = addDays(e.playedIn);
        const [h, m] = e.start.split(':').map(Number);
        d.setHours(h, m);
        return { kind: 'open' as const, key: e.id, date: d, e, miles };
      }),
      ...upcomingEvents().map((e) => ({ kind: 'national' as const, key: e.id, date: addDays(e.playedIn), e })),
    ];
    return list.filter((i) => inWindow(i.date, 'upcoming')).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [me, feed]);

  const items = useMemo(() => {
    return base
      .filter((i) => {
        if (cat === 'games') return i.kind === 'game';
        if (cat === 'guest') return i.kind === 'game' && i.game.type === 'member_guest';
        if (cat === 'opens') return i.kind === 'open';
        if (cat === 'nationals') return i.kind === 'national';
        if (cat === 'saved') return i.kind === 'game' ? savedGames.includes(i.key) : reminders.includes(i.key);
        return true;
      })
      .filter((i) => inWindow(i.date, when));
  }, [base, cat, when, savedGames, reminders]);

  // search looks through everything upcoming, whatever filters the feed has, and also finds golfers
  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return { listings: [] as Item[], people: [] as Golfer[], clubs: [] as { c: Course; miles: number }[] };
    const listings = base
      .filter((i) => {
        // every word typed has to appear somewhere in the listing: club, town, host, event or venue
        let text = '';
        if (i.kind === 'game') {
          const c = courseById(i.game.courseId);
          const h = state.golfers[i.game.hostId];
          text = [c?.name, c?.town, c?.region, c ? associationById(courseCountry(c)).short : '', h?.firstName, h?.lastName, gameTypeLabels[i.game.type]].join(' ');
        } else if (i.kind === 'open') {
          const c = courseById(i.e.courseId);
          text = [c?.name, c?.town, c?.region, c ? associationById(courseCountry(c)).short : '', eventTitle(i.e), eventSummary(i.e), 'open'].join(' ');
        } else {
          text = [i.e.title, i.e.venue, associationById(i.e.association).name, associationById(i.e.association).short, 'championship'].join(' ');
        }
        text = text.toLowerCase();
        return words.every((w) => text.includes(w));
      });
    const clubs = courses.filter((c) => words.every((w) => `${c.name} ${c.town} ${c.region}`.toLowerCase().includes(w))).map((c) => ({ c, miles: distanceMiles(c, me!.location) })).sort((a, b) => a.miles - b.miles).slice(0, 6);
    const people = Object.values(state.golfers).filter((g) => g.id !== ME && !state.blockedIds.includes(g.id) && words.every((w) => `${g.firstName} ${g.lastName} ${g.homeClub ?? ''} ${g.location.name}`.toLowerCase().includes(w)));
    return { listings, people, clubs };
  }, [base, query, state.golfers, state.blockedIds, me]);

  if (!me || !feed) return null;

  // a wider radius that would actually bring more games into view
  const wider = [25, 50, 100].find((m) => m > me.radiusMiles && feed.furtherMiles.some((mi) => mi <= m));
  const widen = () => {
    if (!wider) return;
    const before = me.radiusMiles;
    updateProfile({ radiusMiles: wider });
    toast(`Now showing games within ${wider} miles`, { icon: 'navigate', action: { label: 'Undo', onPress: () => updateProfile({ radiusMiles: before }) } });
  };
  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast('You’re up to date', { icon: 'refresh' });
    }, 800);
  };

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
    toast(on ? 'Saved to your calendar. We’ll remind you before entries close' : 'Removed from your calendar', { icon: on ? 'heart' : 'heart-outline', action: on ? { label: 'Calendar', onPress: () => router.push('/calendar') } : { label: 'Undo', onPress: () => toggleReminder(id) } });
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
      return { key: i.key, photo: photoFor(c?.id), title: c?.name ?? 'Golf course', sub: `Game · ${whenLine(i.date, formatTime(i.date))} · ${Math.max(1, Math.round(i.miles))} mi`, go: () => router.push(`/game/${i.game.id}`) };
    }
    if (i.kind === 'open') {
      const c = courseById(i.e.courseId);
      return { key: i.key, photo: photoFor(c?.id), title: `${eventTitle(i.e)}, ${c?.name ?? ''}`, sub: `Club open · ${whenLine(i.date, `from ${i.e.start}`)} · ${Math.max(1, Math.round(i.miles))} mi`, go: () => router.push(`/open/${i.e.id}`) };
    }
    const venue = courses.find((c) => c.name.toLowerCase().startsWith(i.e.venue.toLowerCase()));
    return { key: i.key, photo: photoFor(venue?.id), title: i.e.title, sub: `Championship · ${shortDate(i.date)} · ${i.e.venue}`, go: () => router.push(`/championship/${i.e.id}`) };
  };
  const nearbyClubs = courses.map((c) => ({ c, miles: distanceMiles(c, me.location) })).sort((a, b) => a.miles - b.miles).slice(0, 6);
  const hasQuery = query.trim().length > 0;

  const renderItem = (i: Item) => {
    if (i.kind === 'game') {
          const g = i.game;
          const course = courseById(g.courseId);
          const host = state.golfers[g.hostId];
          const players = [host, ...acceptedFor(state, g.id).map((r) => state.golfers[r.golferId])].filter(Boolean);
          const left = spacesLeft(state, g);
          const name = course?.name ?? 'Golf course';
          const saving = g.type === 'member_guest' && g.visitorFee && g.costPerGolfer !== undefined && g.visitorFee > g.costPerGolfer ? g.visitorFee - g.costPerGolfer : 0;
          return (
            <FeedCard
              key={i.key}
              course={course}
              title={name}
              when={`${saving ? 'Member’s guest' : 'Game'} · ${whenLine(i.date, formatTime(i.date))}`}
              meta={`${Math.max(1, Math.round(i.miles))} mi away`}
              saved={savedGames.includes(g.id)}
              onPress={() => router.push(`/game/${g.id}`)}
              onSave={() => saveGame(g, name)}
              onShare={() => share(`Game at ${name}`, `/game/${g.id}`)}
              label={`${gameTypeLabels[g.type]} at ${name}, ${whenLine(i.date, formatTime(i.date))}. ${left > 0 ? `${left} space${left === 1 ? '' : 's'} left` : 'Full'}. ${priceLabel(g.costPerGolfer)}`}
              footer={
                <Row gap={space.sm}>
                  <AvatarStack golfers={players.slice(0, 3)} size={28} />
                  <T variant="smallStrong">{players.length} going</T>
                  <T variant="small" color={colors.textMuted}>{left > 0 ? `${left} space${left === 1 ? '' : 's'} left` : 'Full'} · {priceLabel(g.costPerGolfer)}{saving ? ` (visitors pay £${g.visitorFee})` : ''}</T>
                </Row>
              }
            />
          );
        }
        if (i.kind === 'open') {
          const e = i.e;
          const course = courseById(e.courseId);
          const title = eventTitle(e);
          const isNew = e.listedDaysAgo <= 7;
          return (
            <FeedCard
              key={i.key}
              course={course}
              title={`${title}, ${course?.name ?? ''}`}
              when={`${isNew ? 'New club open' : 'Club open'} · ${whenLine(i.date, `from ${e.start}`)}`}
              meta={`${Math.max(1, Math.round(i.miles))} mi away`}
              saved={reminders.includes(e.id)}
              onPress={() => router.push(`/open/${e.id}`)}
              onSave={() => saveEvent(e.id)}
              onShare={() => share(`${title} at ${course?.name ?? 'a club near you'}`, `/club/${e.courseId}`)}
              label={`${title} at ${course?.name}. ${whenLine(i.date, `from ${e.start}`)}. £${e.fee} entry, ${e.placesLeft} places left`}
              footer={
                <Row gap={space.sm}>
                  <T variant="smallStrong">£{e.fee} entry</T>
                  <T variant="small" color={colors.textMuted}>{e.placesLeft} places left</T>
                </Row>
              }
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
            course={venue}
            title={e.title}
            when={`${assoc.short} championship · ${shortDate(i.date)} to ${shortDate(end)}`}
            meta={e.venue}
            saved={reminders.includes(e.id)}
            onPress={() => router.push(`/championship/${e.id}`)}
            onSave={() => saveEvent(e.id)}
            onShare={() => share(e.title, `/competitions?country=${e.association}&show=national`)}
            label={`${e.title} at ${e.venue}. Entry ${st.text.toLowerCase()}`}
            footer={
              <Row gap={space.sm}>
                <View style={[s.dot, { backgroundColor: st.kind === 'closing' ? '#F5A524' : st.kind === 'open' ? '#3DBE5C' : colors.lime }]} />
                <T variant="bodyStrong">Entry {st.text.toLowerCase()}</T>
              </Row>
            }
          />
        );
  };

  const showExtras = when === 'upcoming' && cat === 'all';
  const mapPath = cat === 'opens' || cat === 'nationals' ? '/map?layer=events' : '/map';
  const tabBarClear = Math.max(insets.bottom - 6, 10) + 66 + 6;

  return (
    <View style={[ui.screen, { backgroundColor: colors.surface }]}>
        <View pointerEvents="box-none" style={s.headerWrap}>
         {/* the date chips and category tabs sit on their own black layer behind the search row and slide up under it, moved by the native driver so scrolling stays smooth */}
         <Animated.View
          onLayout={(e) => setFiltersH(Math.round(e.nativeEvent.layout.height))}
          style={[s.filtersLayer, { top: searchH, transform: [{ translateY: fold.interpolate({ inputRange: [0, 1], outputRange: [-filtersH, 0] }) }] }]}>
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.09)']} style={s.edgeGlow} />
          <View pointerEvents="none" style={s.edgeLip} />
          <View style={[ui.contentWidth, s.filters]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.md, marginHorizontal: -space.xl }} contentContainerStyle={{ gap: 6, paddingHorizontal: space.xl }}>
            {WHEN.map((w) => {
              const on = when === w.id;
              return (
                <Pressable key={w.id} onPress={() => { haptic.select(); setWhen(w.id); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => [s.chip, on && s.chipOn, pressed && ui.pressed]}>
                  <T variant="smallStrong" color={on ? colors.ink : colors.white}>{w.label}</T>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={s.tabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ gap: space.xl, paddingHorizontal: space.xl }}>
            {CATEGORIES.map((c) => {
              const on = cat === c.id;
              return (
                <Pressable key={c.id} onPress={() => { haptic.select(); setCat(c.id); }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={c.label} style={s.tab}>
                  <View style={s.tabIcon}>
                    <Ionicons name={on ? c.on : c.icon} size={20} color={on ? colors.lime : colors.onInkMuted} />
                  </View>
                  <T variant={on ? 'smallStrong' : 'small'} color={on ? colors.white : colors.onInkMuted}>{c.label}</T>
                  <View style={[s.tabLine, on && s.tabLineOn]} />
                </Pressable>
              );
            })}
          </ScrollView>
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
                placeholder="Clubs, competitions or golfers"
                placeholderTextColor={colors.onInkMuted}
                accessibilityLabel="Search games, opens and championships"
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                enterKeyHint="search"
                inputMode="search"
                onSubmitEditing={() => Keyboard.dismiss()}
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
          <LinearGradient colors={['rgba(11,11,11,0.30)', 'rgba(11,11,11,0)']} style={StyleSheet.absoluteFill} />
          <View style={s.foldLip} />
         </Animated.View>
        </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: searchH + filtersH, paddingBottom: tabBarClear + 90 }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} colors={[colors.ink]} />}>
        <View style={[ui.contentWidth, ui.padded, { paddingTop: space.lg }]}>
          {showExtras ? (
            <View style={{ marginBottom: space.xl }}>
              <ForYou limit={1} />
            </View>
          ) : null}

          {items.length === 0 ? (
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
                {idx === 2 && showExtras && friendGames.length > 0 ? (
                  <View style={{ marginBottom: 44 }}>
                    <T variant="heading">Friends are playing</T>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl, marginTop: space.md }} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.xl }}>
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
                {renderItem(i)}
              </View>
            ))
          )}

          {wider && cat !== 'saved' && cat !== 'nationals' ? (
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
        </View>
      </ScrollView>

      {searching ? (
        <View style={s.searchPage}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: searchH + space.md, paddingBottom: 120 }}>
            <View style={[ui.contentWidth, ui.padded]}>
              {!hasQuery ? (
                <>
                  <T variant="label" color={colors.textMuted} style={s.group}>CLUBS NEAR YOU</T>
                  {nearbyClubs.map(({ c, miles }) => (
                    <Pressable key={c.id} onPress={() => router.push(`/club/${c.id}`)} accessibilityRole="button" accessibilityLabel={`${c.name} club profile`} style={({ pressed }) => [s.line, pressed && ui.pressed]}>
                      <Image source={photoFor(c.id)} style={s.lineThumb} contentFit="cover" accessibilityIgnoresInvertColors />
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong" numberOfLines={1}>{c.name}</T>
                        <T variant="small" color={colors.textMuted} numberOfLines={1}>{c.town} · {Math.max(1, Math.round(miles))} mi{c.visitorFee ? ` · visitors £${c.visitorFee}` : ''}</T>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                    </Pressable>
                  ))}
                </>
              ) : results.listings.length === 0 && results.people.length === 0 && results.clubs.length === 0 ? (
                <View style={{ paddingVertical: space.xxxl }}>
                  <T variant="heading">Nothing matches “{query.trim()}”</T>
                  <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>Try a club, a town, an event or a golfer’s name.</T>
                </View>
              ) : (
                <>
                  {results.clubs.length > 0 ? <T variant="label" color={colors.textMuted} style={s.group}>CLUBS</T> : null}
                  {results.clubs.map(({ c, miles }) => (
                    <Pressable key={c.id} onPress={() => router.push(`/club/${c.id}`)} accessibilityRole="button" accessibilityLabel={`${c.name} club profile`} style={({ pressed }) => [s.line, pressed && ui.pressed]}>
                      <Image source={photoFor(c.id)} style={s.lineThumb} contentFit="cover" accessibilityIgnoresInvertColors />
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong" numberOfLines={1}>{c.name}</T>
                        <T variant="small" color={colors.textMuted} numberOfLines={1}>{c.town} · {Math.max(1, Math.round(miles))} mi{c.visitorFee ? ` · visitors £${c.visitorFee}` : ''}</T>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                    </Pressable>
                  ))}
                  {results.listings.length > 0 ? <T variant="label" color={colors.textMuted} style={[s.group, results.clubs.length > 0 && { marginTop: space.xl }]}>GAMES AND COMPETITIONS</T> : null}
                  {results.listings.map((i) => {
                    const r = resultLine(i);
                    return (
                      <Pressable key={r.key} onPress={r.go} accessibilityRole="button" accessibilityLabel={`${r.title}. ${r.sub}`} style={({ pressed }) => [s.line, pressed && ui.pressed]}>
                        <Image source={r.photo} style={s.lineThumb} contentFit="cover" accessibilityIgnoresInvertColors />
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
                    <Pressable key={g.id} onPress={() => router.push(`/golfer/${g.id}`)} accessibilityRole="button" accessibilityLabel={`${g.firstName} ${g.lastName}`} style={({ pressed }) => [s.line, pressed && ui.pressed]}>
                      <Avatar golfer={g} size={44} />
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong" numberOfLines={1}>{g.firstName} {g.lastName}</T>
                        <T variant="small" color={colors.textMuted} numberOfLines={1}>{g.homeClub ? `${g.homeClub} · ` : ''}{g.location.name}</T>
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
  searchPage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, zIndex: 5 },
  group: { marginTop: space.md, marginBottom: space.sm, letterSpacing: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(11,11,11,0.1)' },
  lineThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.mist },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  filtersLayer: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.ink, shadowColor: '#0B0B0B', shadowOpacity: 0.32, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
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
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.white },
  tabsWrap: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.inkBorder },
  tab: { alignItems: 'center', gap: 6, paddingTop: 2 },
  tabIcon: { width: 40, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabLine: { height: 3, alignSelf: 'stretch', borderRadius: 2, marginTop: 6, backgroundColor: 'transparent' },
  pal: { width: 188, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.mist },
  tabLineOn: { backgroundColor: colors.lime },
  footIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  widen: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  mapWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: colors.ink, shadowColor: '#0B0B0B', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
