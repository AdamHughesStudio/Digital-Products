import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DateRangePicker, rangeLabel } from '@/components/date-range';

import { Button, Chip, ChipRow, Row, Sheet, T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { defaultCompFilters, ENTRIES, FORMATS, GENDERS, type Collection, type CompFilters, type Show } from '@/data/club-events';
import { ASSOCIATIONS, type Association } from '@/data/events';

const DISTANCES: (number | undefined)[] = [undefined, 10, 25, 50, 100];
const SHOWS: { key: Show; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'national', label: 'National championships' },
  { key: 'club', label: 'Club opens' },
];
const FEES: (number | undefined)[] = [undefined, 10, 20, 30, 50];
const HOLES: (9 | 18 | 36)[] = [9, 18, 36];
const COLLECTIONS: { key: Collection; label: string; icon: 'sparkles' | 'star' | 'snow' }[] = [
  { key: 'new', label: 'New this week', icon: 'sparkles' },
  { key: 'top100', label: 'Top 100 courses', icon: 'star' },
  { key: 'winter', label: 'Winter opens', icon: 'snow' },
];

/** How many filters are on. A date range counts as one. */
export function activeCompFilters(f: CompFilters) {
  return (
    (f.from || f.to ? 1 : 0) +
    (f.country ? 1 : 0) +
    (f.show !== 'all' ? 1 : 0) +
    (f.maxMiles !== undefined ? 1 : 0) +
    (f.gender ? 1 : 0) +
    (f.format ? 1 : 0) +
    (f.holes ? 1 : 0) +
    (f.entry ? 1 : 0) +
    (f.maxFee !== undefined ? 1 : 0) +
    (f.fitsHandicap ? 1 : 0) +
    (f.seniorsOnly ? 1 : 0) +
    (f.collection ? 1 : 0)
  );
}

/** A short name for what's filtered, e.g. "Ladies stableford opens in Scotland" */
export function compFiltersName(f: CompFilters, near: string) {
  const country = ASSOCIATIONS.find((a) => a.id === f.country)?.short;
  return [
    f.gender ? GENDERS.find((g) => g.id === f.gender)?.label : '',
    f.format ? FORMATS.find((x) => x.id === f.format)?.label.toLowerCase() : '',
    f.show === 'national' ? 'championships' : 'opens',
    country ? `in ${country}` : `near ${near}`,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/^./, (ch) => ch.toUpperCase());
}

/**
 * Narrow the competitions on Home: by country, kind, distance, who can play, format and more. Changes
 * apply as they're made, so the count on the button is what the feed will show.
 */
export function CompetitionFilters({ visible, onClose, filters: f, onChange, count, near }: { visible: boolean; onClose: () => void; filters: CompFilters; onChange: (f: CompFilters) => void; count: number; near: string }) {
  const set = (patch: Partial<CompFilters>) => onChange({ ...f, ...patch });
  const hasDates = !!(f.from || f.to);
  const [picking, setPicking] = useState(false);
  return (
    <Sheet visible={visible} onClose={onClose} title="Filter competitions">
      <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
        <T variant="smallStrong" color={colors.textMuted}>Dates</T>
        <View style={s.group}>
          <Pressable onPress={() => setPicking((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: picking }} accessibilityLabel={`Dates: ${rangeLabel(f.from, f.to)}. ${picking ? 'Hide' : 'Choose'} dates`} style={({ pressed }) => [s.dates, hasDates && s.datesOn, pressed && ui.pressed]}>
            <Ionicons name="calendar-outline" size={18} color={hasDates ? colors.onInk : colors.text} />
            <T variant="bodyStrong" color={hasDates ? colors.onInk : colors.text} style={{ flex: 1 }} numberOfLines={1}>{rangeLabel(f.from, f.to)}</T>
            {hasDates ? (
              <Pressable onPress={() => { set({ from: undefined, to: undefined }); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear dates">
                <Ionicons name="close-circle" size={20} color={colors.onInk} />
              </Pressable>
            ) : (
              <Ionicons name={picking ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            )}
          </Pressable>
          {picking ? (
            <DateRangePicker
              from={f.from}
              to={f.to}
              onChange={(from, to) => {
                set({ from, to });
                // both ends chosen: fold the calendar away
                if (from && to) setPicking(false);
              }}
            />
          ) : null}
        </View>
        <T variant="smallStrong" color={colors.textMuted}>Country</T>
        <View style={s.group}>
          <ChipRow scroll>
            <Chip label="Anywhere" selected={!f.country} onPress={() => set({ country: undefined })} />
            {ASSOCIATIONS.map((a) => (
              <Chip key={a.id} label={a.short} selected={f.country === a.id} onPress={() => set({ country: f.country === a.id ? undefined : (a.id as Association) })} />
            ))}
          </ChipRow>
        </View>
        <T variant="smallStrong" color={colors.textMuted}>Collections</T>
        <View style={s.group}>
          <ChipRow>
            {COLLECTIONS.map((c) => (
              <Chip key={c.key} label={c.label} icon={c.icon} selected={f.collection === c.key} onPress={() => set({ collection: f.collection === c.key ? undefined : c.key })} />
            ))}
          </ChipRow>
        </View>
        <T variant="smallStrong" color={colors.textMuted}>Show</T>
        <View style={s.group}>
          <ChipRow>
            {SHOWS.map((x) => (
              <Chip key={x.key} label={x.label} selected={f.show === x.key} onPress={() => set({ show: x.key })} />
            ))}
          </ChipRow>
        </View>
        <T variant="smallStrong" color={colors.textMuted}>Distance from {near}</T>
        <View style={s.group}>
          <ChipRow scroll>
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
            <Chip label="Suits my handicap" icon={f.fitsHandicap ? 'checkmark' : 'golf-outline'} selected={f.fitsHandicap} onPress={() => set({ fitsHandicap: !f.fitsHandicap })} />
          </ChipRow>
        </View>
      </ScrollView>
      <Row gap={space.sm} style={{ marginTop: space.xl }}>
        <Button title="Reset" kind="ghost" onPress={() => onChange(defaultCompFilters())} style={{ flex: 1 }} />
        <Button title={count === 0 ? 'No matches' : `Show ${count}`} onPress={onClose} style={{ flex: 2 }} />
      </Row>
    </Sheet>
  );
}

const s = StyleSheet.create({
  group: { marginTop: space.sm, marginBottom: space.lg },
  dates: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 48, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  datesOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
});
