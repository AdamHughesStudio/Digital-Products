import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard, LookingCard } from '@/components/cards';
import { ClubCard } from '@/components/club-card';
import { clubsNear } from '@/data/clubs';
import { GamesMap } from '@/components/games-map';
import { Button, Chip, ChipRow, EmptyState, FormLabel, Row, Sheet, T, styles as ui } from '@/components/ui';
import { colors, fonts, hairline, radius, shadowSoft, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import { courseById } from '@/data/courses';
import type { Game, GameType, TimeOfDay } from '@/data/types';
import { gameTypeLabels, priceLabel, timeOfDayShort } from '@/lib/format';
import { applyFilters, buildFeed, defaultFilters, type DateFilter, type Filters, type Kind } from '@/lib/selectors';

const KINDS: { key: Kind; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'games', label: 'Games' },
  { key: 'golfers', label: 'Golfers' },
];
// Game types live in the filters panel rather than the main chips
const TYPES: GameType[] = ['casual', 'member_guest', 'competition', 'society', 'open'];
const isType = (k: Kind): k is GameType => (TYPES as string[]).includes(k);
const DATES: { key: DateFilter; label: string }[] = [
  { key: 'any', label: 'Any date' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'weekend', label: 'This weekend' },
  { key: 'week', label: 'Next 7 days' },
];
const FILTERS_KEY = 'findfore:search-filters';
const TIMES: TimeOfDay[] = ['any', 'early', 'morning', 'afternoon', 'evening'];
const DISTANCES = [5, 10, 25, 50, 100];
const PRICES: (number | undefined)[] = [undefined, 0, 25, 50, 100];

export default function Search() {
  const insets = useSafeAreaInsets();
  const { state, me } = useStore();
  const [filters, setFilters] = useState<Filters | null>(null);

  const params = useLocalSearchParams<{ kind?: string; tab?: string }>();
  const [tab, setTab] = useState<'games' | 'clubs'>(params.tab === 'clubs' ? 'clubs' : 'games');
  const [clubQuery, setClubQuery] = useState('');
  const linkedKind = KINDS.some((k) => k.key === params.kind) || isType(params.kind as Kind) ? (params.kind as Kind) : undefined;

  // remember the last filters between visits (the typed query starts fresh each time).
  // Arriving from a See all link picks that section instead.
  useEffect(() => {
    AsyncStorage.getItem(FILTERS_KEY)
      .then((raw) => {
        if (!me) return;
        const saved = raw ? { ...defaultFilters(me), ...JSON.parse(raw), query: '' } : null;
        if (saved && !isType(saved.kind)) saved.kind = 'games';
        if (saved || linkedKind) setFilters({ ...(saved ?? defaultFilters(me)), ...(linkedKind ? { kind: linkedKind } : {}) });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedKind]);
  useEffect(() => {
    if (filters) AsyncStorage.setItem(FILTERS_KEY, JSON.stringify({ ...filters, query: '' })).catch(() => {});
  }, [filters]);
  const [open, setOpen] = useState(false);
  const f = filters ?? (me ? defaultFilters(me) : null);

  const results = useMemo(() => (me && f ? applyFilters(buildFeed(state, me), f, me, state) : []), [state, me, f]);
  const mapPins = useMemo(
    () =>
      results
        .filter((it) => it.kind === 'game')
        .map((it) => {
          const g = (it as { game: Game }).game;
          const c = courseById(g.courseId)!;
          const p = priceLabel(g.costPerGolfer);
          return { id: g.id, lat: c.lat, lng: c.lng, label: p === 'Cost TBC' ? 'TBC' : p };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results.map((it) => (it.kind === 'game' ? it.game.id : it.post.id)).join(',')],
  );
  const clubs = useMemo(() => (me ? clubsNear(state, me.location, clubQuery) : []), [state, me, clubQuery]);
  if (!me || !f) return null;

  const set = (patch: Partial<Filters>) => setFilters({ ...f, ...patch });
  const def = defaultFilters(me);
  const active =
    (f.maxMiles !== def.maxMiles ? 1 : 0) +
    (f.date !== 'any' ? 1 : 0) +
    (f.time !== 'any' ? 1 : 0) +
    (f.minSpaces > 1 ? 1 : 0) +
    (f.maxPrice !== undefined ? 1 : 0) +
    (f.fitsHandicap ? 1 : 0) +
    (isType(f.kind) ? 1 : 0);

  return (
    <View style={ui.screen}>
      <View style={[ui.contentWidth, ui.padded, { paddingTop: insets.top + 12 }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="title" accessibilityRole="header">Play</T>
          <View style={s.segment} accessibilityRole="tablist">
            {(['games', 'clubs'] as const).map((k) => (
              <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={[s.segItem, tab === k && s.segOn]}>
                <T variant="smallStrong" color={tab === k ? colors.lime : colors.text}>{k === 'games' ? 'Games' : 'Clubs'}</T>
              </Pressable>
            ))}
          </View>
        </Row>
        <Row gap={space.sm} style={{ marginTop: space.md }}>
          <View style={s.search}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={tab === 'games' ? f.query : clubQuery}
              onChangeText={(query) => (tab === 'games' ? set({ query }) : setClubQuery(query))}
              placeholder={tab === 'games' ? 'Course or town' : 'Club, town or region'}
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.ink}
              style={s.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {(tab === 'games' ? f.query : clubQuery) ? (
              <Pressable onPress={() => (tab === 'games' ? set({ query: '' }) : setClubQuery(''))} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.textFaint} />
              </Pressable>
            ) : null}
          </View>
          {tab === 'games' ? (
            <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [s.filterBtn, active > 0 && s.filterBtnOn, pressed && ui.pressed]} accessibilityRole="button" accessibilityLabel={active > 0 ? `Filters, ${active} on` : 'Filters'}>
              <Ionicons name="options-outline" size={20} color={active > 0 ? colors.lime : colors.text} />
              {active > 0 ? <T variant="smallStrong" color={colors.lime}>{active}</T> : null}
            </Pressable>
          ) : null}
        </Row>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tab === 'games' ? (
          <>
        {/* the map leads: a still preview of what matches, tap to explore */}
        <View style={[ui.contentWidth, ui.padded, { paddingTop: space.md }]}>
          <Pressable
            onPress={() => router.push(f.date === 'week' ? '/map?show=week' : f.date === 'weekend' ? '/map?show=weekend' : '/map')}
            accessibilityRole="button"
            accessibilityLabel={`Open the map. ${mapPins.length} game${mapPins.length === 1 ? '' : 's'} shown`}
            style={({ pressed }) => [s.mapCard, pressed && ui.pressed]}>
            <GamesMap me={me.location} radiusMiles={f.maxMiles} pins={mapPins} onSelect={() => {}} interactive={false} topInset={4} bottomInset={44} />
            <View style={s.mapBar} pointerEvents="none">
              <View style={s.mapCount}>
                <T variant="smallStrong">{mapPins.length} game{mapPins.length === 1 ? '' : 's'} on the map</T>
              </View>
              <View style={s.mapOpen}>
                <Ionicons name="expand" size={14} color={colors.ink} />
                <T variant="smallStrong" color={colors.ink}>Open map</T>
              </View>
            </View>
          </Pressable>
        </View>
        <View style={[ui.contentWidth, ui.padded]}>
          <T variant="small" color={colors.textMuted} style={{ marginBottom: space.md }}>
            {results.length} result{results.length === 1 ? '' : 's'} within {f.maxMiles} miles of {me.location.name}
          </T>
          {results.length === 0 ? (
            <EmptyState icon="search-outline" title="No matches" body="Try a wider distance, a different date or fewer filters." action="Reset filters" onAction={() => setFilters(defaultFilters(me))} />
          ) : (
            results.map((it) => (it.kind === 'game' ? <GameCard key={it.game.id} game={it.game} /> : <LookingCard key={it.post.id} post={it.post} />))
          )}
        </View>
          </>
        ) : (
          <View style={[ui.contentWidth, ui.padded, { paddingTop: space.md }]}>
            <View style={s.clubsIntro}>
              <View style={s.clubsDot} />
              <T variant="small" color={colors.textMuted} style={{ flex: 1 }}>Every club has a profile. A lime dot means a member is offering a guest rate, cheaper than the visitor green fee.</T>
            </View>
            <T variant="small" color={colors.textMuted} style={{ marginBottom: space.md }}>
              <T variant="smallStrong">{clubs.length} club{clubs.length === 1 ? '' : 's'}</T>  ·  nearest to {me.location.name} first
            </T>
            {clubs.length === 0 ? (
              <EmptyState icon="flag-outline" title="No clubs match" body="Try a town or region instead. The full UK directory arrives with launch." />
            ) : (
              clubs.map((l) => <ClubCard key={l.profile.course.id} listing={l} />)
            )}
          </View>
        )}
      </ScrollView>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Filters">
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <T variant="smallStrong" color={colors.textMuted}>Type of game</T>
          <View style={s.group}>
            <ChipRow>
              <Chip label="Any" selected={!isType(f.kind)} onPress={() => set({ kind: isType(f.kind) ? 'games' : f.kind })} />
              {TYPES.map((t) => (
                <Chip key={t} label={gameTypeLabels[t]} selected={f.kind === t} onPress={() => set({ kind: t })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Distance</T>
          <View style={s.group}>
            <ChipRow>
              {DISTANCES.map((m) => (
                <Chip key={m} label={`${m} mi`} selected={f.maxMiles === m} onPress={() => set({ maxMiles: m })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Date</T>
          <View style={s.group}>
            <ChipRow>
              {DATES.map((d) => (
                <Chip key={d.key} label={d.label} selected={f.date === d.key} onPress={() => set({ date: d.key })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Time of day</T>
          <View style={s.group}>
            <ChipRow>
              {TIMES.map((t) => (
                <Chip key={t} label={timeOfDayShort[t]} selected={f.time === t} onPress={() => set({ time: t })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Spaces available</T>
          <View style={s.group}>
            <ChipRow>
              {[1, 2, 3].map((n) => (
                <Chip key={n} label={n === 1 ? 'Any' : `${n}+`} selected={f.minSpaces === n} onPress={() => set({ minSpaces: n })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Price per golfer</T>
          <View style={s.group}>
            <ChipRow>
              {PRICES.map((p) => (
                <Chip key={String(p)} label={p === undefined ? 'Any price' : p === 0 ? 'Free' : `Up to £${p}`} selected={f.maxPrice === p} onPress={() => set({ maxPrice: p })} />
              ))}
            </ChipRow>
          </View>
          <FormLabel>Handicap</FormLabel>
          <Chip label="Only games that suit my handicap" icon={f.fitsHandicap ? 'checkmark' : 'golf-outline'} selected={f.fitsHandicap} onPress={() => set({ fitsHandicap: !f.fitsHandicap })} />
        </ScrollView>
        <Row gap={space.sm} style={{ marginTop: space.xl }}>
          <Button title="Reset" kind="ghost" onPress={() => setFilters({ ...defaultFilters(me), query: f.query, kind: f.kind })} style={{ flex: 1 }} />
          <Button title={`Show ${results.length}`} onPress={() => setOpen(false)} style={{ flex: 2 }} />
        </Row>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, borderRadius: radius.pill, paddingHorizontal: 16, height: 48, ...shadowSoft },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 16, height: '100%' },
  filterBtn: { flexDirection: 'row', gap: 4, height: 48, minWidth: 48, paddingHorizontal: 12, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  sticky: { backgroundColor: colors.bg },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 3, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  segItem: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.ink },
  clubsIntro: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.md, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  clubsDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime, borderWidth: 1, borderColor: colors.ink },
  mapCard: { height: 170, borderRadius: radius.panel, overflow: 'hidden', backgroundColor: colors.mist, borderWidth: 1, borderColor: hairline },
  mapBar: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapCount: { backgroundColor: colors.surface, paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill },
  mapOpen: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.lime, paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill },
  filterBtnOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  group: { marginTop: space.sm, marginBottom: space.xl },
});
