import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedCard } from '@/components/feed-card';
import { GamesMap } from '@/components/games-map';
import type { MapArea } from '@/components/games-map.types';
import { InterestedStrip } from '@/components/interested-friends';
import { useToast } from '@/components/toast';
import { AvatarStack, EmptyState, IconButton, Row, T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { CLUB_EVENTS, eventSummary, eventTitle, type ClubEvent } from '@/data/club-events';
import { courseById, gameCourseName, courses, useClubsVersion } from '@/data/courses';
import { photoFor } from '@/data/course-photos';
import { addDays, toggleReminder, useReminders } from '@/data/events';
import { toggleSavedGame, useSavedGames } from '@/data/saved-games';
import { acceptedFor, spacesLeft, useStore } from '@/data/store';
import type { Course, Game } from '@/data/types';
import { dayDiff, distanceMiles, formatTime, priceLabel, shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { openGames } from '@/lib/selectors';
import { shareLink } from '@/lib/share';

type Show = 'all' | 'weekend' | 'week';
type Layer = 'games' | 'events' | 'clubs';
/** Most club pins to show at once, nearest first */
const MAX_CLUBS = 150;
/** Inside the area, optionally grown by a share of its size so pins don't pop in at the edges */
const inArea = (p: { lat: number; lng: number }, a: MapArea, grow = 0) => {
  const dLat = (a.north - a.south) * grow;
  const dLng = (a.east - a.west) * grow;
  return p.lat <= a.north + dLat && p.lat >= a.south - dLat && p.lng >= a.west - dLng && p.lng <= a.east + dLng;
};
const shortName = (name: string) => name.replace(/\s+(Golf\s+)?(Club|Course|Links|Centre)$/i, '').replace(/\s+Golf$/i, '');
type Snap = 'full' | 'half' | 'peek';

const SHOWS: { id: Show; label: string }[] = [
  { id: 'all', label: 'Any date' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'week', label: 'Next 7 days' },
];
/** How much of the results sheet is visible when it is tucked down */
const PEEK = 112;

/** Saturday or Sunday in the next 8 days */
const isWeekend = (d: Date) => (d.getDay() === 6 || d.getDay() === 0) && d.getTime() - Date.now() < 8 * 86400000;
const whenLine = (d: Date, time: string) => {
  const diff = dayDiff(d, new Date());
  return `${diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : shortDate(d)} · ${time}`;
};

/**
 * The map, with the results in a sheet over it: drag the sheet up for a full list, down to see
 * the whole map. Tapping a pin brings that listing to the top of the sheet.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const params = useLocalSearchParams<{ focus?: string; show?: string; layer?: string }>();
  const [layer, setLayer] = useState<Layer>(params.layer === 'events' || params.layer === 'clubs' ? params.layer : 'games');
  const clubsVersion = useClubsVersion();
  const { state, me } = useStore();
  const toast = useToast();
  const savedGames = useSavedGames();
  const reminders = useReminders();
  const [show, setShow] = useState<Show>(params.show === 'weekend' || params.show === 'week' ? params.show : 'all');
  const [selected, setSelected] = useState<string | undefined>(params.focus);
  // what the golfer can see on the map; results follow it as they pan and pinch
  const [area, setArea] = useState<MapArea | null>(null);
  const list = useRef<ScrollView>(null);

  // ---------- the sheet ----------
  const topGap = insets.top + 128; // room for the search pill and chips above a fully open sheet
  const sheetH = H - topGap;
  const snaps: Record<Snap, number> = { full: 0, half: Math.round(sheetH * 0.52), peek: sheetH - PEEK - Math.max(insets.bottom, 8) };
  const [snap, setSnap] = useState<Snap>('half');
  const y = useRef(new Animated.Value(snaps.half)).current;
  const yNow = useRef(snaps.half);
  useEffect(() => {
    const id = y.addListener(({ value }) => (yNow.current = value));
    return () => y.removeListener(id);
  }, [y]);
  const goTo = (to: Snap) => {
    setSnap(to);
    Animated.spring(y, { toValue: snaps[to], useNativeDriver: false, damping: 26, stiffness: 260, mass: 0.9 }).start();
  };
  const start = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        y.stopAnimation();
        start.current = yNow.current;
      },
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, Math.min(snapsRef.current.peek, start.current + g.dy))),
      onPanResponderRelease: (_, g) => {
        const s = snapsRef.current;
        // a tap on the handle moves one step; a flick follows its direction; otherwise snap to the nearest
        if (Math.abs(g.dy) < 4 && Math.abs(g.vy) < 0.1) return goToRef.current(snapRef.current === 'full' ? 'half' : snapRef.current === 'half' ? 'full' : 'half');
        const at = start.current + g.dy;
        const order: Snap[] = ['full', 'half', 'peek'];
        if (g.vy < -0.6) return goToRef.current(order[Math.max(0, order.findIndex((k) => s[k] >= at) - 1)] ?? 'full');
        if (g.vy > 0.6) return goToRef.current(order.find((k) => s[k] > at) ?? 'peek');
        const nearest = order.reduce((best, k) => (Math.abs(s[k] - at) < Math.abs(s[best] - at) ? k : best), 'half' as Snap);
        goToRef.current(nearest);
      },
    }),
  ).current;
  // the responder is made once, so it reads the latest values through refs
  const snapsRef = useRef(snaps);
  snapsRef.current = snaps;
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  // ---------- results ----------
  const games = useMemo(() => {
    if (!me) return [] as { g: Game; c: Course; miles: number }[];
    const weekEnd = Date.now() + 7 * 86400000;
    return openGames(state)
      .filter((g) => (show === 'weekend' ? isWeekend(new Date(g.teeTime)) : show === 'week' ? new Date(g.teeTime).getTime() < weekEnd : true))
      .filter((g) => courseById(g.courseId))
      .map((g) => ({ g, c: courseById(g.courseId)!, miles: distanceMiles(courseById(g.courseId)!, me.location) }))
      .filter((x) => (area ? inArea(x.c, area, 0.25) : x.miles <= Math.max(me.radiusMiles * 2, 40)))
      .sort((a, b) => a.g.teeTime.localeCompare(b.g.teeTime));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, me, show, area, clubsVersion]);

  const events = useMemo(() => {
    if (!me) return [] as { e: ClubEvent; c: Course; miles: number }[];
    return CLUB_EVENTS.filter((e) => courseById(e.courseId))
      .map((e) => ({ e, c: courseById(e.courseId)!, miles: distanceMiles(courseById(e.courseId)!, me.location) }))
      .filter((x) => (area ? inArea(x.c, area, 0.25) : x.miles <= Math.max(me.radiusMiles * 2, 40)))
      .filter((x) => (show === 'weekend' ? (() => { const d = addDays(x.e.playedIn); return d.getDay() === 0 || d.getDay() === 6; })() : show === 'week' ? x.e.playedIn <= 7 : true))
      .sort((a, b) => a.e.playedIn - b.e.playedIn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, show, area, clubsVersion]);

  // clubs in view, nearest the middle of the map first; zoomed far out, only the nearest show
  const allClubs = useMemo(() => {
    if (!me) return [] as { c: Course; miles: number }[];
    const centre = area?.centre ?? me.location;
    return courses
      .filter((c) => (area ? inArea(c, area, 0.25) : distanceMiles(c, me.location) <= Math.max(me.radiusMiles * 2, 40)))
      .map((c) => ({ c, miles: distanceMiles(c, me.location), fromCentre: distanceMiles(c, centre) }))
      .sort((a, b) => a.fromCentre - b.fromCentre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, area, clubsVersion]);
  const clubs = allClubs.slice(0, MAX_CLUBS);

  const pins = useMemo(
    () =>
      layer === 'clubs'
        ? clubs.map(({ c }) => ({ id: c.id, lat: c.lat, lng: c.lng, label: shortName(c.name) }))
        : layer === 'events'
        ? events.map(({ e }) => {
            const c = courseById(e.courseId)!;
            return { id: e.id, lat: c.lat, lng: c.lng, label: `£${e.fee}` };
          })
        : games.map(({ g }) => {
            const c = courseById(g.courseId)!;
            const p = priceLabel(g.costPerGolfer);
            return { id: g.id, lat: c.lat, lng: c.lng, label: p === 'Cost TBC' ? 'TBC' : p };
          }),
    [games, events, clubs, layer],
  );

  if (!me) return null;
  const ids = layer === 'clubs' ? clubs.map((x) => x.c.id) : layer === 'events' ? events.map((x) => x.e.id) : games.map((x) => x.g.id);
  const active = selected && ids.includes(selected) ? selected : undefined;

  const select = (id: string) => {
    setSelected(id);
    haptic.select();
    if (snap === 'peek' || snap === 'full') goTo('half');
    list.current?.scrollTo({ y: 0, animated: true });
  };

  const share = async (title: string, path: string) => {
    if ((await shareLink(title, path)) === 'copied') toast('Link copied', { icon: 'link' });
  };

  // the list is what's actually on screen (pins also cover a margin, so they don't pop in);
  // the tapped pin's listing comes first
  const visible = <X extends { c: Course }>(xs: X[]) => (area ? xs.filter((x) => inArea(x.c, area)) : xs);
  const first = <X,>(xs: X[], id: (x: X) => string) => (active ? [...xs].sort((a, b) => Number(id(b) === active) - Number(id(a) === active)) : xs);
  const orderedGames = first(visible(games), (x) => x.g.id);
  const orderedEvents = first(visible(events), (x) => x.e.id);
  const orderedClubs = first(visible(clubs), (x) => x.c.id);
  const count = layer === 'clubs' ? orderedClubs.length : layer === 'events' ? orderedEvents.length : orderedGames.length;
  // zoomed far out, there are more clubs than is useful to show
  const moreClubs = layer === 'clubs' && allClubs.length > MAX_CLUBS;
  const noun = layer === 'clubs' ? (count === 1 ? 'club' : 'clubs') : layer === 'events' ? (count === 1 ? 'open' : 'opens') : count === 1 ? 'game' : 'games';

  return (
    <View style={s.screen}>
      <GamesMap me={me.location} radiusMiles={me.radiusMiles} pins={pins} noun={layer === 'clubs' ? 'clubs' : layer === 'events' ? 'opens' : 'games'} selectedId={active} onSelect={select} bottomInset={sheetH - snaps[snap === 'full' ? 'half' : snap]} topInset={topGap} onAreaChange={setArea} />

      {/* top: one search style pill, then the filters */}
      <View style={[s.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={s.pill}>
          <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.back} />
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong" numberOfLines={1}>{layer === 'clubs' ? 'Golf clubs' : layer === 'events' ? 'Club opens' : 'Games'} in this area</T>
            <T variant="small" color={colors.textMuted} numberOfLines={1}>{layer === 'clubs' ? 'Move the map to search' : `${SHOWS.find((x) => x.id === show)?.label} · move the map to search`}</T>
          </View>
          <View style={s.segment} accessibilityRole="tablist">
            {(['games', 'events', 'clubs'] as const).map((k) => (
              <Pressable key={k} onPress={() => { setLayer(k); setSelected(undefined); haptic.select(); }} accessibilityRole="tab" accessibilityState={{ selected: layer === k }} accessibilityLabel={k === 'games' ? 'Games' : k === 'events' ? 'Club opens' : 'Golf clubs'} style={[s.segItem, layer === k && s.segOn]}>
                <Ionicons name={k === 'games' ? 'people' : k === 'events' ? 'trophy' : 'flag'} size={16} color={layer === k ? colors.white : colors.text} />
              </Pressable>
            ))}
          </View>
        </View>
        {layer !== 'clubs' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.sm, marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
          {SHOWS.map((x) => (
            <Pressable key={x.id} onPress={() => { setShow(x.id); haptic.select(); }} accessibilityRole="button" accessibilityState={{ selected: show === x.id }} style={({ pressed }) => [s.chip, show === x.id && s.chipOn, pressed && ui.pressed]}>
              <T variant="smallStrong" color={show === x.id ? colors.white : colors.text}>{x.label}</T>
            </Pressable>
          ))}
        </ScrollView>
        ) : null}
      </View>

      {/* the results sheet */}
      <Animated.View style={[s.sheet, { top: topGap, height: sheetH, transform: [{ translateY: y }] }]}>
        <View {...pan.panHandlers} style={s.grab} accessibilityRole="adjustable" accessibilityLabel={`${count} ${noun}. Drag up for the full list`}>
          <View style={s.handle} />
          <T variant="subheading" style={{ marginTop: space.md }}>{moreClubs ? `${MAX_CLUBS}+ clubs` : `${count} ${noun}`}</T>
          {moreClubs ? <T variant="caption" color={colors.textMuted}>Showing those nearest the middle. Zoom in for more.</T> : null}
        </View>
        {count === 0 ? (
          layer === 'clubs' ? (
            <EmptyState icon="flag-outline" title="No clubs in this area" body="Move or zoom out the map to see more." />
          ) : layer === 'events' ? (
            <EmptyState icon="map-outline" title="No opens in this area" body="Try another date, or move the map to look further afield." />
          ) : (
            <EmptyState icon="map-outline" title="No games in this area" body="Move the map, try another date, or post your own game." action="Post a game" onAction={() => router.push('/post/game')} />
          )
        ) : (
          <ScrollView ref={list} scrollEnabled={snap !== 'peek'} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: (snap === 'full' ? 0 : snaps[snap]) + 120 }}>
            {layer === 'clubs'
              ? orderedClubs.map(({ c, miles }) => (
                  <Pressable
                    key={c.id}
                    onPress={() => router.push(`/club/${c.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name}, ${c.town}, ${Math.max(1, Math.round(miles))} miles away`}
                    style={({ pressed }) => [s.clubRow, c.id === active && s.clubRowOn, pressed && ui.pressed]}
                  >
                    <Image source={photoFor(c.id)} style={s.clubThumb} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <T variant="bodyStrong" numberOfLines={1}>{c.name}</T>
                      <T variant="small" color={colors.textMuted} numberOfLines={1}>
                        {c.town} · {Math.max(1, Math.round(miles))} mi{c.layouts && c.layouts.length > 1 ? ` · ${c.layouts.length} courses` : ''}
                      </T>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                  </Pressable>
                ))
              : layer === 'events'
              ? orderedEvents.map(({ e, miles }, idx) => {
                  const c = courseById(e.courseId);
                  const title = eventTitle(e);
                  const d = addDays(e.playedIn);
                  return (
                    <FeedCard
                      key={e.id}
                      course={c}
                      index={idx}
                      date={d}
                      isNew={e.listedDaysAgo <= 7}
                      kicker={`Club open · from ${e.start}`}
                      title={title}
                      place={`${c?.name ?? ''} · ${Math.max(1, Math.round(miles))} mi away`}
                      price={`£${e.fee}`}
                      saved={reminders.includes(e.id)}
                      onPress={() => router.push(`/open/${e.id}`)}
                      onSave={() => { const on = toggleReminder(e.id); haptic.select(); toast(on ? 'Saved to My season' : 'Removed from My season', { icon: on ? 'heart' : 'heart-outline' }); }}
                      onShare={() => share(`${title} at ${c?.name ?? 'a club near you'}`, `/open/${e.id}`)}
                      label={`${title} at ${c?.name}. ${whenLine(d, `from ${e.start}`)}. £${e.fee} entry`}
                      footer={<InterestedStrip eventId={e.id} fallback={<T variant="small" color={colors.textMuted}>{eventSummary(e)}</T>} />}
                    />
                  );
                })
              : orderedGames.map(({ g, miles }, idx) => {
                  const c = courseById(g.courseId);
                  const d = new Date(g.teeTime);
                  const players = [state.golfers[g.hostId], ...acceptedFor(state, g.id).map((r) => state.golfers[r.golferId])].filter(Boolean);
                  const left = spacesLeft(state, g);
                  const name = gameCourseName(g) ?? 'Golf course';
                  return (
                    <FeedCard
                      key={g.id}
                      course={c}
                      index={idx}
                      date={d}
                      kicker={`Game · ${formatTime(d)}${g.memberHost ? ' · Members’ guest rate' : ''}`}
                      title={name}
                      place={`${c?.town ?? ''} · ${Math.max(1, Math.round(miles))} mi away`}
                      price={priceLabel(g.costPerGolfer) === 'Cost TBC' ? 'TBC' : priceLabel(g.costPerGolfer)}
                      saved={savedGames.includes(g.id)}
                      onPress={() => router.push(`/game/${g.id}`)}
                      onSave={() => { const on = toggleSavedGame(g.id); haptic.select(); toast(on ? `Saved ${name}` : 'Removed from saved', { icon: on ? 'heart' : 'heart-outline' }); }}
                      onShare={() => share(`Game at ${name}`, `/game/${g.id}`)}
                      label={`Game at ${name}, ${whenLine(d, formatTime(d))}. ${left} space${left === 1 ? '' : 's'} left`}
                      footer={
                        <Row gap={space.sm}>
                          <AvatarStack golfers={players.slice(0, 3)} size={28} />
                          <T variant="smallStrong">{players.length} going</T>
                          <T variant="small" color={colors.textMuted}>· {left} space{left === 1 ? '' : 's'} left</T>
                        </Row>
                      }
                    />
                  );
                })}
          </ScrollView>
        )}
      </Animated.View>

      {/* with the list fully open, a quick way back to the map */}
      {snap === 'full' ? (
        <View pointerEvents="box-none" style={[s.mapWrap, { bottom: Math.max(insets.bottom, 12) + 16 }]}>
          <Pressable onPress={() => goTo('peek')} accessibilityRole="button" accessibilityLabel="Show the map" style={({ pressed }) => [s.mapPill, pressed && ui.pressed]}>
            <Ionicons name="map-outline" size={18} color={colors.white} />
            <T variant="bodyStrong" color={colors.onInk}>Map</T>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: space.lg, zIndex: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: 8, paddingLeft: 8, paddingRight: 8, shadowColor: '#0F1A14', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  back: { borderWidth: 0, shadowOpacity: 0, backgroundColor: colors.mist },
  segment: { flexDirection: 'row', backgroundColor: colors.mist, borderRadius: radius.pill, padding: 3 },
  segItem: { width: 38, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.ink },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, shadowColor: '#0F1A14', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  chipOn: { backgroundColor: colors.ink },
  sheet: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, zIndex: 2, shadowColor: '#0F1A14', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  grab: { alignItems: 'center', paddingTop: 10, paddingBottom: space.md, cursor: 'grab', userSelect: 'none', touchAction: 'none' } as object,
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: radius.lg },
  clubRowOn: { backgroundColor: colors.mist },
  clubThumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.mist },
  mapWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 4 },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.pill, backgroundColor: colors.ink, shadowColor: '#0F1A14', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
