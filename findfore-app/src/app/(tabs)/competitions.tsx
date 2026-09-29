import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClubEventCard } from '@/components/club-event-card';
import { ProfileButton } from '@/components/credits';
import { Button, Chip, ChipRow, EmptyState, Row, Sheet, T, styles as ui } from '@/components/ui';
import { colors, fonts, radius, space } from '@/constants/theme';
import { defaultCompFilters, ENTRIES, FORMATS, GENDERS, searchClubEvents, type CompFilters, type DateWindow, type Sort } from '@/data/club-events';
import { places } from '@/data/courses';
import { useStore } from '@/data/store';

const DISTANCES = [10, 25, 50, 100];
const DATES: { key: DateWindow; label: string }[] = [
  { key: 'any', label: 'Any date' },
  { key: 'weekend', label: 'Weekends' },
  { key: 'week', label: 'Next 7 days' },
  { key: 'month', label: 'Next 30 days' },
];
const FEES: (number | undefined)[] = [undefined, 10, 20, 30, 50];
const SORTS: { key: Sort; label: string }[] = [
  { key: 'soonest', label: 'Soonest' },
  { key: 'nearest', label: 'Nearest' },
  { key: 'cheapest', label: 'Cheapest' },
];
const HOLES: (9 | 18 | 36)[] = [9, 18, 36];
const holesLabel = (h: number) => (h === 36 ? '36+ holes' : `${h} holes`);

export default function Competitions() {
  const insets = useSafeAreaInsets();
  const { me } = useStore();
  const [filters, setFilters] = useState<CompFilters | null>(null);
  const [open, setOpen] = useState(false);
  const f = filters ?? (me ? defaultCompFilters(me.radiusMiles) : null);
  const results = useMemo(() => (me && f ? searchClubEvents(f, me.location, me.handicap) : []), [me, f]);
  if (!me || !f) return null;

  const set = (patch: Partial<CompFilters>) => setFilters({ ...f, ...patch });
  const def = defaultCompFilters(me.radiusMiles);
  const active =
    (f.place ? 1 : 0) +
    (f.maxMiles !== def.maxMiles ? 1 : 0) +
    (f.gender ? 1 : 0) +
    (f.format ? 1 : 0) +
    (f.holes ? 1 : 0) +
    (f.entry ? 1 : 0) +
    (f.date !== 'any' ? 1 : 0) +
    (f.maxFee !== undefined ? 1 : 0) +
    (f.placesOnly ? 1 : 0) +
    (f.fitsHandicap ? 1 : 0) +
    (f.seniorsOnly ? 1 : 0) +
    (f.sort !== 'soonest' ? 1 : 0);
  const where = f.place ?? me.location.name;

  return (
    <View style={ui.screen}>
      <View style={[ui.contentWidth, ui.padded, { paddingTop: insets.top + 12 }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="title" accessibilityRole="header">Competitions</T>
          <ProfileButton />
        </Row>
        <Row gap={space.sm} style={{ marginTop: space.md }}>
          <View style={s.search}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={f.query}
              onChangeText={(query) => set({ query })}
              placeholder="Club, town or format"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.ink}
              style={s.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {f.query ? (
              <Pressable onPress={() => set({ query: '' })} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.textFaint} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [s.filterBtn, active > 0 && s.filterBtnOn, pressed && ui.pressed]} accessibilityRole="button" accessibilityLabel={active > 0 ? `Filters, ${active} on` : 'Filters'}>
            <Ionicons name="options-outline" size={20} color={active > 0 ? colors.lime : colors.text} />
            {active > 0 ? <T variant="smallStrong" color={colors.lime}>{active}</T> : null}
          </Pressable>
        </Row>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        <View style={s.sticky}>
          <View style={[ui.contentWidth, { paddingLeft: space.lg, paddingVertical: space.md }]}>
            <ChipRow scroll>
              {GENDERS.map((g) => (
                <Chip key={g.id} label={g.short} selected={f.gender === g.id} onPress={() => set({ gender: f.gender === g.id ? undefined : g.id })} />
              ))}
              <Chip label="Scramble" selected={f.format === 'scramble'} onPress={() => set({ format: f.format === 'scramble' ? undefined : 'scramble' })} />
              {HOLES.map((h) => (
                <Chip key={h} label={holesLabel(h)} selected={f.holes === h} onPress={() => set({ holes: f.holes === h ? undefined : h })} />
              ))}
            </ChipRow>
          </View>
        </View>

        <View style={[ui.contentWidth, ui.padded]}>
          <Pressable onPress={() => router.push('/events')} accessibilityRole="button" style={({ pressed }) => [s.national, pressed && ui.pressed]}>
            <View style={s.nationalIcon}>
              <Ionicons name="trophy" size={16} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" color={colors.onInk}>National championships</T>
              <T variant="small" color={colors.onInkMuted}>Scottish, English, Irish and Welsh events</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onInkMuted} />
          </Pressable>

          <T variant="small" color={colors.textMuted} style={{ marginBottom: space.md }}>
            {results.length} competition{results.length === 1 ? '' : 's'} within {f.maxMiles} miles of {where}
          </T>
          {results.length === 0 ? (
            <EmptyState icon="trophy-outline" title="No competitions found" body="Try a wider distance, another date or fewer filters." action="Reset filters" onAction={() => setFilters(defaultCompFilters(me.radiusMiles))} />
          ) : (
            results.map(({ e, miles }) => <ClubEventCard key={e.id} event={e} miles={miles} />)
          )}
          <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>Preview listings. Dates and prices are examples only.</T>
        </View>
      </ScrollView>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Filters">
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <T variant="smallStrong" color={colors.textMuted}>Location</T>
          <View style={s.group}>
            <ChipRow scroll>
              <Chip label={`Near me (${me.location.name})`} selected={!f.place} onPress={() => set({ place: undefined })} />
              {places
                .filter((p) => p.name !== me.location.name)
                .map((p) => (
                  <Chip key={p.name} label={p.name} selected={f.place === p.name} onPress={() => set({ place: p.name })} />
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
          <T variant="smallStrong" color={colors.textMuted}>Who can play</T>
          <View style={s.group}>
            <ChipRow>
              <Chip label="Anyone" selected={!f.gender} onPress={() => set({ gender: undefined })} />
              {GENDERS.map((g) => (
                <Chip key={g.id} label={g.short} selected={f.gender === g.id} onPress={() => set({ gender: g.id })} />
              ))}
              <Chip label="Seniors" icon={f.seniorsOnly ? 'checkmark' : undefined} selected={f.seniorsOnly} onPress={() => set({ seniorsOnly: !f.seniorsOnly })} />
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Format</T>
          <View style={s.group}>
            <ChipRow>
              <Chip label="Any" selected={!f.format} onPress={() => set({ format: undefined })} />
              {FORMATS.map((x) => (
                <Chip key={x.id} label={x.label} selected={f.format === x.id} onPress={() => set({ format: x.id })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Number of holes</T>
          <View style={s.group}>
            <ChipRow>
              <Chip label="Any" selected={!f.holes} onPress={() => set({ holes: undefined })} />
              {HOLES.map((h) => (
                <Chip key={h} label={h === 36 ? '36+' : String(h)} selected={f.holes === h} onPress={() => set({ holes: h })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Entry</T>
          <View style={s.group}>
            <ChipRow>
              <Chip label="Any" selected={!f.entry} onPress={() => set({ entry: undefined })} />
              {ENTRIES.map((x) => (
                <Chip key={x.id} label={x.label} selected={f.entry === x.id} onPress={() => set({ entry: x.id })} />
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
          <T variant="smallStrong" color={colors.textMuted}>Entry fee</T>
          <View style={s.group}>
            <ChipRow>
              {FEES.map((p) => (
                <Chip key={String(p)} label={p === undefined ? 'Any price' : `Up to £${p}`} selected={f.maxFee === p} onPress={() => set({ maxFee: p })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Good to know</T>
          <View style={s.group}>
            <ChipRow>
              <Chip label="Places available" icon={f.placesOnly ? 'checkmark' : undefined} selected={f.placesOnly} onPress={() => set({ placesOnly: !f.placesOnly })} />
              <Chip label="Suits my handicap" icon={f.fitsHandicap ? 'checkmark' : 'golf-outline'} selected={f.fitsHandicap} onPress={() => set({ fitsHandicap: !f.fitsHandicap })} />
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Sort by</T>
          <View style={s.group}>
            <ChipRow>
              {SORTS.map((x) => (
                <Chip key={x.key} label={x.label} selected={f.sort === x.key} onPress={() => set({ sort: x.key })} />
              ))}
            </ChipRow>
          </View>
        </ScrollView>
        <Row gap={space.sm} style={{ marginTop: space.xl }}>
          <Button title="Reset" kind="ghost" onPress={() => setFilters({ ...defaultCompFilters(me.radiusMiles), query: f.query })} style={{ flex: 1 }} />
          <Button title={`Show ${results.length}`} onPress={() => setOpen(false)} style={{ flex: 2 }} />
        </Row>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, height: 48 },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 16, height: '100%' },
  filterBtn: { flexDirection: 'row', gap: 4, height: 48, minWidth: 48, paddingHorizontal: 12, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterBtnOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  sticky: { backgroundColor: colors.bg },
  group: { marginTop: space.sm, marginBottom: space.xl },
  national: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.ink, borderRadius: radius.lg, padding: space.md, marginBottom: space.lg },
  nationalIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
});
