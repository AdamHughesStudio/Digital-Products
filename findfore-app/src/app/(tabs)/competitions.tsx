import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertSheet } from '@/components/alerts';
import { ClubEventCard } from '@/components/club-event-card';
import { EventCard } from '@/components/event-card';
import { ProfileButton } from '@/components/credits';
import { Button, Chip, ChipRow, EmptyState, Row, Sheet, T, styles as ui } from '@/components/ui';
import { colors, fonts, hairline, radius, shadowSoft, space } from '@/constants/theme';
import { defaultCompFilters, ENTRIES, FORMATS, GENDERS, searchCompetitions, type Collection, type CompFilters, type DateWindow, type Show, type Sort } from '@/data/club-events';
import { ASSOCIATIONS, useEntered, useReminders, type Association } from '@/data/events';
import { useStore } from '@/data/store';

const DISTANCES: (number | undefined)[] = [undefined, 10, 25, 50, 100];
const SHOWS: { key: Show; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'national', label: 'National championships' },
  { key: 'club', label: 'Club opens' },
];
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
const COLLECTIONS: { key: Collection; label: string; icon: 'sparkles' | 'star' | 'snow' }[] = [
  { key: 'new', label: 'New this week', icon: 'sparkles' },
  { key: 'top100', label: 'Top 100 courses', icon: 'star' },
  { key: 'winter', label: 'Winter opens', icon: 'snow' },
];
const holesLabel = (h: number) => (h === 36 ? '36+ holes' : `${h} holes`);

export default function Competitions() {
  const insets = useSafeAreaInsets();
  const { me } = useStore();
  const params = useLocalSearchParams<{ country?: string; show?: string }>();
  const [filters, setFilters] = useState<CompFilters>(defaultCompFilters());
  const [open, setOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const saved = useReminders();
  const entered = useEntered();
  const f = filters;

  // links from Home can arrive with a country or a type already chosen
  useEffect(() => {
    const country = ASSOCIATIONS.find((a) => a.id === params.country)?.id;
    const show = SHOWS.find((x) => x.key === params.show)?.key;
    if (country || show) setFilters((cur) => ({ ...cur, country: country ?? cur.country, show: show ?? cur.show }));
  }, [params.country, params.show]);

  const all = useMemo(() => (me ? searchCompetitions(f, me.location, me.handicap, me.radiusMiles) : []), [me, f]);
  const season = useMemo(() => [...new Set([...entered, ...saved])], [entered, saved]);
  const results = useMemo(() => {
    if (!savedOnly) return all;
    // your season: what you've entered first, then what you've saved
    return all.filter((l) => season.includes(l.id)).sort((a, b) => Number(entered.includes(b.id)) - Number(entered.includes(a.id)));
  }, [all, savedOnly, season, entered]);
  const enteredCount = results.filter((l) => entered.includes(l.id)).length;
  if (!me) return null;

  const set = (patch: Partial<CompFilters>) => setFilters({ ...f, ...patch });
  const active =
    (f.show !== 'all' ? 1 : 0) +
    (f.maxMiles !== undefined ? 1 : 0) +
    (f.gender ? 1 : 0) +
    (f.format ? 1 : 0) +
    (f.holes ? 1 : 0) +
    (f.entry ? 1 : 0) +
    (f.date !== 'any' ? 1 : 0) +
    (f.maxFee !== undefined ? 1 : 0) +
    (f.placesOnly ? 1 : 0) +
    (f.fitsHandicap ? 1 : 0) +
    (f.seniorsOnly ? 1 : 0) +
    (f.sort !== 'soonest' ? 1 : 0) +
    (f.collection ? 1 : 0);
  const countryName = ASSOCIATIONS.find((a) => a.id === f.country)?.short;
  const alertName = [f.gender ? GENDERS.find((g) => g.id === f.gender)?.label : '', f.format ? FORMATS.find((x) => x.id === f.format)?.label.toLowerCase() : '', f.show === 'national' ? 'championships' : 'opens', countryName ? `in ${countryName}` : `near ${me.location.name}`].filter(Boolean).join(' ').replace(/^./, (ch) => ch.toUpperCase());
  const scope = savedOnly ? (enteredCount ? `${enteredCount} entered, ${results.length - enteredCount} saved` : 'saved to your calendar') : countryName ? `in ${countryName}` : f.maxMiles !== undefined ? `within ${f.maxMiles} miles of ${me.location.name}` : `near ${me.location.name} and national`;

  return (
    <View style={ui.screen}>
      <View style={[ui.contentWidth, ui.padded, { paddingTop: insets.top + 12 }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="title" accessibilityRole="header">Events</T>
          <ProfileButton />
        </Row>
        <Row gap={space.sm} style={{ marginTop: space.md }}>
          <View style={s.search}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={f.query}
              onChangeText={(query) => set({ query })}
              placeholder="Club, event or place"
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
              <Chip label="All" selected={!f.country} onPress={() => set({ country: undefined })} />
              {ASSOCIATIONS.map((a) => (
                <Chip key={a.id} label={a.short} selected={f.country === a.id} onPress={() => set({ country: f.country === a.id ? undefined : (a.id as Association) })} />
              ))}
              <Chip label={season.length ? `My season (${season.length})` : 'My season'} icon={savedOnly ? 'bookmark' : 'bookmark-outline'} selected={savedOnly} onPress={() => setSavedOnly((v) => !v)} />
            </ChipRow>
            <View style={{ marginTop: space.sm }}>
              <ChipRow scroll>
                {COLLECTIONS.map((c) => (
                  <Chip key={c.key} label={c.label} icon={c.icon} selected={f.collection === c.key} onPress={() => set({ collection: f.collection === c.key ? undefined : c.key })} style={s.smallChip} />
                ))}
              </ChipRow>
            </View>
          </View>
        </View>

        <View style={[ui.contentWidth, ui.padded]}>
          <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginBottom: space.sm }}>
            <T variant="smallStrong">{results.length} event{results.length === 1 ? '' : 's'}</T>  ·  {scope}
          </T>
          {!savedOnly ? (
            <Pressable onPress={() => setAlertOpen(true)} accessibilityRole="button" style={({ pressed }) => [s.alertRow, pressed && ui.pressed]}>
              <View style={s.alertIcon}><Ionicons name="notifications" size={15} color={colors.ink} /></View>
              <View style={{ flex: 1 }}>
                <T variant="smallStrong" color={colors.onInk}>Email me new events like these</T>
                <T variant="caption" color={colors.onInkMuted} numberOfLines={1}>{alertName}. Hear first, before they fill.</T>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.onInkMuted} />
            </Pressable>
          ) : null}
          {results.length === 0 ? (
            savedOnly ? (
              <EmptyState icon="bookmark-outline" title="Your season starts here" body="Save an event to shortlist it, or mark one as entered, and it lands here and on your calendar." action="Show everything" onAction={() => setSavedOnly(false)} />
            ) : (
              <EmptyState icon="trophy-outline" title="No events found" body="Try another country, another date or fewer filters." action="Reset filters" onAction={() => setFilters(defaultCompFilters())} />
            )
          ) : (
            results.map((l) => (l.kind === 'club' ? <ClubEventCard key={l.id} event={l.e} miles={l.miles} /> : <EventCard key={l.id} event={l.e} />))
          )}
          <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>Preview listings. Every UK open and championship arrives with launch.</T>
        </View>
      </ScrollView>

      <AlertSheet visible={alertOpen} onClose={() => setAlertOpen(false)} suggestedName={alertName} filters={{ country: f.country, show: f.show, gender: f.gender, format: f.format, holes: f.holes, entry: f.entry, maxMiles: f.maxMiles, collection: f.collection }} />

      <Sheet visible={open} onClose={() => setOpen(false)} title="Filters">
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <T variant="smallStrong" color={colors.textMuted}>Show</T>
          <View style={s.group}>
            <ChipRow>
              {SHOWS.map((x) => (
                <Chip key={x.key} label={x.label} selected={f.show === x.key} onPress={() => set({ show: x.key })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Distance from {me.location.name}</T>
          <View style={s.group}>
            <ChipRow>
              {DISTANCES.map((m) => (
                <Chip key={String(m)} label={m === undefined ? 'Any' : `${m} mi`} selected={f.maxMiles === m} onPress={() => set({ maxMiles: m })} />
              ))}
            </ChipRow>
            <T variant="caption" color={colors.textFaint} style={{ marginTop: space.sm }}>Only club opens have a distance, so this hides national championships.</T>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Who can play</T>
          <View style={s.group}>
            <ChipRow scroll>
              <Chip label="Anyone" selected={!f.gender} onPress={() => set({ gender: undefined })} />
              {GENDERS.map((g) => (
                <Chip key={g.id} label={g.short} selected={f.gender === g.id} onPress={() => set({ gender: g.id })} />
              ))}
              <Chip label="Seniors" icon={f.seniorsOnly ? 'checkmark' : undefined} selected={f.seniorsOnly} onPress={() => set({ seniorsOnly: !f.seniorsOnly })} />
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Format</T>
          <View style={s.group}>
            <ChipRow scroll>
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
            <ChipRow scroll>
              {DATES.map((d) => (
                <Chip key={d.key} label={d.label} selected={f.date === d.key} onPress={() => set({ date: d.key })} />
              ))}
            </ChipRow>
          </View>
          <T variant="smallStrong" color={colors.textMuted}>Entry fee</T>
          <View style={s.group}>
            <ChipRow scroll>
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
          <Button title="Reset" kind="ghost" onPress={() => setFilters({ ...defaultCompFilters(), query: f.query, country: f.country })} style={{ flex: 1 }} />
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
  filterBtnOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  sticky: { backgroundColor: colors.bg },
  group: { marginTop: space.sm, marginBottom: space.lg },
  smallChip: { paddingVertical: 6, paddingHorizontal: 11 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: space.md, marginBottom: space.md },
  alertIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
});
