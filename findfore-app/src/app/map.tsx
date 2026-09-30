import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard } from '@/components/cards';
import { ClubEventCard } from '@/components/club-event-card';
import { GamesMap } from '@/components/games-map';
import { CLUB_EVENTS, type ClubEvent } from '@/data/club-events';
import { Chip, EmptyState, IconButton, Row, T } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { useStore } from '@/data/store';
import type { Game } from '@/data/types';
import { distanceMiles, priceLabel } from '@/lib/format';
import { openGames } from '@/lib/selectors';

const CARD_W = 300;
const GAP = 12;
const CARD_ROW_H = 300;

type Show = 'all' | 'weekend' | 'week';
type Layer = 'games' | 'events';

/** Saturday or Sunday in the next 8 days */
const isWeekend = (d: Date) => (d.getDay() === 6 || d.getDay() === 0) && d.getTime() - Date.now() < 8 * 86400000;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ focus?: string; show?: string; layer?: string }>();
  const [layer, setLayer] = useState<Layer>(params.layer === 'events' ? 'events' : 'games');
  const { state, me } = useStore();
  const [show, setShow] = useState<Show>(params.show === 'weekend' || params.show === 'week' ? params.show : 'all');
  const [selected, setSelected] = useState<string | undefined>(params.focus);
  const row = useRef<ScrollView>(null);

  const games = useMemo(() => {
    if (!me) return [] as Game[];
    const weekEnd = Date.now() + 7 * 86400000;
    return openGames(state)
      .filter((g) => (show === 'weekend' ? isWeekend(new Date(g.teeTime)) : show === 'week' ? new Date(g.teeTime).getTime() < weekEnd : true))
      .map((g) => ({ g, miles: distanceMiles(courseById(g.courseId)!, me.location) }))
      .filter((x) => x.miles <= Math.max(me.radiusMiles * 2, 40))
      .sort((a, b) => a.miles - b.miles)
      .map((x) => x.g);
  }, [state, me, show]);

  const events = useMemo(() => {
    if (!me) return [] as { e: ClubEvent; miles: number }[];
    return CLUB_EVENTS.map((e) => ({ e, miles: distanceMiles(courseById(e.courseId)!, me.location) }))
      .filter((x) => x.miles <= Math.max(me.radiusMiles * 2, 40))
      .filter((x) => (show === 'weekend' ? (() => { const d = new Date(); d.setDate(d.getDate() + x.e.playedIn); return d.getDay() === 0 || d.getDay() === 6; })() : show === 'week' ? x.e.playedIn <= 7 : true))
      .sort((a, b) => a.e.playedIn - b.e.playedIn);
  }, [me, show]);

  const pins = useMemo(
    () =>
      layer === 'events'
        ? events.map(({ e }) => {
            const c = courseById(e.courseId)!;
            return { id: e.id, lat: c.lat, lng: c.lng, label: `£${e.fee}` };
          })
        : games.map((g) => {
        const c = courseById(g.courseId)!;
        const p = priceLabel(g.costPerGolfer);
        return { id: g.id, lat: c.lat, lng: c.lng, label: p === 'Cost TBC' ? 'TBC' : p };
      }),
    [games, events, layer],
  );

  if (!me) return null;
  const ids = layer === 'events' ? events.map((x) => x.e.id) : games.map((g) => g.id);
  const active = selected && ids.includes(selected) ? selected : ids[0];

  const select = (id: string) => {
    setSelected(id);
    const i = ids.indexOf(id);
    if (i >= 0) row.current?.scrollTo({ x: i * (CARD_W + GAP), animated: true });
  };

  const onSwipe = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP));
    const id = ids[Math.max(0, Math.min(ids.length - 1, i))];
    if (id && id !== active) setSelected(id);
  };

  const bottom = CARD_ROW_H + Math.max(insets.bottom, 12);

  return (
    <View style={s.screen}>
      <GamesMap me={me.location} radiusMiles={me.radiusMiles} pins={pins} noun={layer === 'events' ? 'opens' : 'games'} selectedId={active} onSelect={select} bottomInset={bottom} topInset={insets.top + 100} />

      {/* top: back, title and a simple filter */}
      <View style={[s.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Row gap={space.sm}>
          <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <View style={s.title}>
            <T variant="bodyStrong" numberOfLines={1}>{layer === 'events' ? `${events.length} open${events.length === 1 ? '' : 's'}` : `${games.length} game${games.length === 1 ? '' : 's'}`} near {me.location.name}</T>
          </View>
          <View style={s.segment} accessibilityRole="tablist">
            {(['games', 'events'] as const).map((k) => (
              <Pressable key={k} onPress={() => { setLayer(k); setSelected(undefined); }} accessibilityRole="tab" accessibilityState={{ selected: layer === k }} style={[s.segItem, layer === k && s.segOn]}>
                <T variant="caption" color={layer === k ? colors.lime : colors.text} style={{ fontWeight: '700' }}>{k === 'games' ? 'Games' : 'Opens'}</T>
              </Pressable>
            ))}
          </View>
        </Row>
        <Row gap={space.sm} style={{ marginTop: space.sm }}>
          <Chip label="All" selected={show === 'all'} onPress={() => setShow('all')} />
          <Chip label="This weekend" selected={show === 'weekend'} onPress={() => setShow('weekend')} />
          <Chip label="Next 7 days" selected={show === 'week'} onPress={() => setShow('week')} />
        </Row>
      </View>

      {/* bottom: swipe through the games, kept in step with the pins */}
      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
        {ids.length === 0 ? (
          <View style={s.empty}>
            {layer === 'events' ? (
              <EmptyState icon="map-outline" title="No opens here yet" body="Try another filter, or widen your search area." />
            ) : (
              <EmptyState icon="map-outline" title="No games here yet" body="Try another filter, or post your own game." action="Post a game" onAction={() => router.push('/post/game')} />
            )}
          </View>
        ) : (
          <ScrollView
            ref={row}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + GAP}
            decelerationRate="fast"
            onMomentumScrollEnd={onSwipe}
            onScrollEndDrag={onSwipe}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: space.lg, gap: GAP }}>
            {layer === 'events'
              ? events.map(({ e, miles }) => (
                  <View key={e.id} style={{ width: CARD_W }}>
                    <ClubEventCard event={e} miles={miles} />
                  </View>
                ))
              : games.map((g) => (
                  <View key={g.id} style={{ width: CARD_W }}>
                    <GameCard game={g} compact />
                  </View>
                ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 3, borderWidth: 1, borderColor: colors.border },
  segItem: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.ink },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: space.lg },
  title: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  empty: { marginHorizontal: space.lg, backgroundColor: colors.surface, borderRadius: radius.panel },
});
