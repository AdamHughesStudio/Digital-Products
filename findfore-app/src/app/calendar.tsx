import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, Screen, T, TopBar, styles as ui } from '@/components/ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { useReminders } from '@/data/events';
import { useStore } from '@/data/store';
import { buildCalendar, dayKey, type CalendarItem, type CalendarKind } from '@/lib/calendar';
import { dayDiff, longDate, startOfDay } from '@/lib/format';

const AMBER = '#FFC53D';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOT: Record<CalendarKind, string> = { game: '#7BB300', requested: colors.textFaint, competition: colors.ink, entry: AMBER };
const ICON: Record<CalendarKind, 'golf' | 'hourglass' | 'trophy' | 'alarm'> = { game: 'golf', requested: 'hourglass', competition: 'trophy', entry: 'alarm' };

type View_ = 'month' | 'list';

export default function CalendarScreen() {
  const { state } = useStore();
  const saved = useReminders();
  const [view, setView] = useState<View_>('month');
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const items = useMemo(() => buildCalendar(state, saved), [state, saved]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items) m.set(dayKey(it.date), [...(m.get(dayKey(it.date)) ?? []), it]);
    return m;
  }, [items]);

  const shift = (n: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + n, 1);
    setMonth(next);
    setSelected(next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear() ? today : next);
  };

  // month grid, weeks start on Monday
  const lead = (month.getDay() + 6) % 7;
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);

  const upcoming = items.filter((it) => !it.past && dayDiff(it.date, today) >= 0);
  const selectedItems = byDay.get(dayKey(selected)) ?? [];

  return (
    <View style={ui.screen}>
      <TopBar title="Calendar" />
      <Screen>
        <View style={s.segment} accessibilityRole="tablist">
          {(['month', 'list'] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} accessibilityRole="tab" accessibilityState={{ selected: view === v }} style={[s.segItem, view === v && s.segOn]}>
              <Ionicons name={v === 'month' ? 'calendar-outline' : 'list'} size={16} color={view === v ? colors.lime : colors.text} />
              <T variant="bodyStrong" color={view === v ? colors.lime : colors.text}>{v === 'month' ? 'Month' : 'List'}</T>
            </Pressable>
          ))}
        </View>

        {view === 'month' ? (
          <>
            <View style={s.monthBar}>
              <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Previous month" style={s.arrow}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>
              <T variant="heading" accessibilityRole="header">{MONTHS[month.getMonth()]} {month.getFullYear()}</T>
              <Pressable onPress={() => shift(1)} hitSlop={10} accessibilityLabel="Next month" style={s.arrow}>
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </Pressable>
            </View>

            <View style={s.grid}>
              <View style={s.week}>
                {WEEKDAYS.map((w) => (
                  <View key={w} style={s.cell}>
                    <T variant="caption" color={colors.textMuted}>{w}</T>
                  </View>
                ))}
              </View>
              {Array.from({ length: cells.length / 7 }, (_, r) => (
                <View key={r} style={s.week}>
                  {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                    if (!d) return <View key={i} style={s.cell} />;
                    const its = byDay.get(dayKey(d)) ?? [];
                    const isToday = dayKey(d) === dayKey(today);
                    const isSel = dayKey(d) === dayKey(selected);
                    const kinds = [...new Set(its.map((x) => x.kind))].slice(0, 3);
                    return (
                      <Pressable key={i} onPress={() => setSelected(d)} style={s.cell} accessibilityRole="button" accessibilityState={{ selected: isSel }} accessibilityLabel={`${longDate(d)}${its.length ? `, ${its.length} item${its.length === 1 ? '' : 's'}` : ''}`}>
                        <View style={[s.day, isSel && s.daySel, !isSel && isToday && s.dayToday]}>
                          <T variant="smallStrong" color={isSel ? colors.lime : colors.text}>{d.getDate()}</T>
                        </View>
                        <View style={s.dots}>
                          {kinds.map((k) => (
                            <View key={k} style={[s.dot, { backgroundColor: DOT[k] }]} />
                          ))}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <Legend />

            <T variant="subheading" style={{ marginTop: space.xl, marginBottom: space.md }}>{longDate(selected)}</T>
            {selectedItems.length === 0 ? (
              <View>
                <T variant="body" color={colors.textMuted}>Nothing on this day.</T>
                {upcoming[0] ? (
                  <Pressable onPress={() => { setMonth(new Date(upcoming[0].date.getFullYear(), upcoming[0].date.getMonth(), 1)); setSelected(upcoming[0].date); }} accessibilityRole="button" style={s.jump}>
                    <T variant="smallStrong">Jump to your next date, {longDate(upcoming[0].date)}</T>
                    <Ionicons name="arrow-forward" size={14} color={colors.text} />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              selectedItems.map((it) => <Row_ key={it.id} item={it} />)
            )}
          </>
        ) : upcoming.length === 0 ? (
          <EmptyState icon="calendar-outline" title="Nothing coming up" body="Games you join and competitions you save will appear here." action="Find a game" onAction={() => router.push('/')} />
        ) : (
          <>
            {upcoming.map((it, i) => {
              const newDay = i === 0 || dayKey(upcoming[i - 1].date) !== dayKey(it.date);
              return (
                <View key={it.id}>
                  {newDay ? <T variant="smallStrong" color={colors.textMuted} style={{ marginTop: i === 0 ? space.xl : space.lg, marginBottom: space.sm }}>{dayDiff(it.date, today) === 0 ? 'Today' : dayDiff(it.date, today) === 1 ? 'Tomorrow' : longDate(it.date)}</T> : null}
                  <Row_ item={it} />
                </View>
              );
            })}
          </>
        )}
      </Screen>
    </View>
  );
}

function Legend() {
  const rows: [CalendarKind, string][] = [['game', 'Games'], ['requested', 'Requested'], ['competition', 'Competitions'], ['entry', 'Entry opens']];
  return (
    <View style={s.legend}>
      {rows.map(([k, label]) => (
        <View key={k} style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: DOT[k] }]} />
          <T variant="caption" color={colors.textMuted}>{label}</T>
        </View>
      ))}
    </View>
  );
}

function Row_({ item }: { item: CalendarItem }) {
  return (
    <Pressable onPress={() => item.href && router.push(item.href as never)} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.subtitle}${item.time ? `. ${item.time}` : ''}`} style={({ pressed }) => [s.row, item.past && { opacity: 0.6 }, pressed && ui.pressed]}>
      <View style={[s.rowIcon, { backgroundColor: item.kind === 'entry' ? AMBER : item.kind === 'game' ? colors.lime : colors.ink }]}>
        <Ionicons name={ICON[item.kind]} size={17} color={item.kind === 'competition' ? colors.lime : colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" numberOfLines={2}>{item.title}</T>
        <T variant="small" color={colors.textMuted} numberOfLines={2}>{item.time ? `${item.time} · ` : ''}{item.subtitle}</T>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: colors.border },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.ink },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.md },
  arrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  grid: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: space.sm, paddingHorizontal: 4, ...shadow },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center' },
  day: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: colors.ink },
  dayToday: { borderWidth: 1.5, borderColor: colors.ink },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  jump: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: space.md, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.sm, ...shadow },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
