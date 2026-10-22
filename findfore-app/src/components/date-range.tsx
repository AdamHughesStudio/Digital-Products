import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { T } from '@/components/ui';
import { colors, fonts, radius, space } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { isoDate, shortDate } from '@/lib/format';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A day from its 2026-11-14 form, at local midnight */
export const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** "Sat 14 Nov to Sun 22 Nov", "From Sat 14 Nov" or "Up to Sun 22 Nov" */
export function rangeLabel(from?: string, to?: string) {
  if (from && to) return from === to ? shortDate(fromIso(from)) : `${shortDate(fromIso(from))} to ${shortDate(fromIso(to))}`;
  if (from) return `From ${shortDate(fromIso(from))}`;
  if (to) return `Up to ${shortDate(fromIso(to))}`;
  return 'Any dates';
}

/**
 * Pick a start and an end day on one calendar, as when booking a stay: the first tap sets the start,
 * the second the end (or a new start, if it's earlier). Weeks start on Monday and past days are
 * greyed out.
 */
export function DateRangePicker({ from, to, onChange }: { from?: string; to?: string; onChange: (from?: string, to?: string) => void }) {
  const today = isoDate(new Date());
  const [month, setMonth] = useState(() => {
    const d = from ? fromIso(from) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const canGoBack = month > thisMonth;

  // the month's days, padded to start on a Monday
  const lead = (month.getDay() + 6) % 7;
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => isoDate(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  while (cells.length % 7) cells.push(null);

  const tap = (day: string) => {
    haptic.select();
    // start again once a full range is chosen, or when the new day comes before the start
    if (!from || (from && to) || day < from) onChange(day, undefined);
    else onChange(from, day);
  };
  const move = (by: number) => {
    haptic.select();
    setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
  };

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Pressable onPress={() => move(-1)} disabled={!canGoBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Previous month" style={[s.arrow, !canGoBack && { opacity: 0.3 }]}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <T variant="bodyStrong" accessibilityRole="header">{MONTHS[month.getMonth()]} {month.getFullYear()}</T>
        <Pressable onPress={() => move(1)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Next month" style={s.arrow}>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>
      <View style={s.row}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={s.cell}>
            <T variant="caption" color={colors.textFaint}>{w}</T>
          </View>
        ))}
      </View>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {cells.map((day, i) => {
          if (!day) return <View key={`x${i}`} style={s.cell} />;
          const past = day < today;
          const isStart = day === from;
          const isEnd = day === to;
          const between = !!from && !!to && day > from && day < to;
          const end = isStart || isEnd;
          return (
            <View key={day} style={s.cell}>
              {/* the band joining the start and end runs behind the days in between */}
              {between || (isStart && to && to !== from) ? <View style={[s.band, isStart && { left: '50%' }]} /> : null}
              {isEnd && from && from !== to ? <View style={[s.band, { right: '50%' }]} /> : null}
              <Pressable
                onPress={() => tap(day)}
                disabled={past}
                accessibilityRole="button"
                accessibilityState={{ selected: end, disabled: past }}
                accessibilityLabel={`${shortDate(fromIso(day))}${isStart ? ', start' : isEnd ? ', end' : ''}`}
                style={[s.day, end && s.dayOn]}>
                <Text style={[s.num, past && { color: colors.textFaint, opacity: 0.5 }, end && { color: colors.onInk }, day === today && !end && s.today]}>{Number(day.slice(8))}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <T variant="caption" color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.sm }}>
        {!from ? 'Tap a start date' : !to ? 'Now tap an end date, or the same day for one day' : rangeLabel(from, to)}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md, marginTop: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist },
  row: { flexDirection: 'row' },
  cell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: 4, bottom: 4, backgroundColor: colors.accentSoft },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.sageDeep },
  num: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  today: { textDecorationLine: 'underline' },
});
