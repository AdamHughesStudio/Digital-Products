import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from './toast';
import { Button, EmptyState, Row, Screen, Sheet, T, TopBar, styles as ui } from './ui';
import { colors, fonts, hairline, radius, shadow, shadowSoft, space } from '@/constants/theme';
import { useEntered, useReminders } from '@/data/events';
import { useStore } from '@/data/store';
import { buildCalendar, dayKey, type CalendarItem, type CalendarKind } from '@/lib/calendar';
import { downloadIcs, googleLink } from '@/lib/calendar-export';
import { dayDiff, longDate, shortDate, startOfDay } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const AMBER = '#D9A441';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// Labels on the month grid, one colour per kind, like a calendar app
const CHIP: Record<CalendarKind, { bg: string; fg: string }> = {
  game: { bg: colors.sageDeep, fg: colors.onInk },
  requested: { bg: colors.surfaceHigh, fg: colors.text },
  competition: { bg: colors.ink, fg: colors.onInk },
  entry: { bg: AMBER, fg: colors.ink },
};
const DOT: Record<CalendarKind, string> = { game: CHIP.game.bg, requested: CHIP.requested.bg, competition: CHIP.competition.bg, entry: CHIP.entry.bg };
// month grid sizes: the date, then up to three labels a day, then a "+2 more" line
// Labels are cut off at the edge, like a calendar app, rather than ending in "…", which costs letters.
// React Native for the web always adds the "…" with numberOfLines, so the web stops wrapping instead.
const CLIP = Platform.OS === 'web' ? {} : ({ numberOfLines: 1, ellipsizeMode: 'clip' } as const);
const CLIP_STYLE = Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as object) : null;
const DATE_H = 26;
const LANE_H = 19;
const LANES = 3;
const WEEK_H = DATE_H + LANES * LANE_H + 16;

/** The days an entry covers: one, or several for a championship */
const spanOf = (it: CalendarItem) => Math.max(1, it.days ?? 1);
const addDaysTo = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** The month in whole weeks, Monday to Sunday: from the week with the 1st to the week with the last
 *  day, so neighbouring months only fill out those two weeks. Four to six weeks depending on the month */
const weeksOf = (m: Date) => {
  const lead = (m.getDay() + 6) % 7;
  const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const start = addDaysTo(m, -lead);
  return Array.from({ length: Math.ceil((lead + daysIn) / 7) }, (_, w) => Array.from({ length: 7 }, (_, i) => addDaysTo(start, w * 7 + i)));
};
const gridHeight = (m: Date) => weeksOf(m).length * WEEK_H;
const monthKey = (m: Date) => m.getFullYear() * 12 + m.getMonth();
const ICON: Record<CalendarKind, 'golf' | 'hourglass' | 'trophy' | 'alarm'> = { game: 'golf', requested: 'hourglass', competition: 'trophy', entry: 'alarm' };

type View_ = 'month' | 'list';

/**
 * Your season: games you're playing and competitions you've saved, as a list or a month view.
 * Shown as the My season tab, and as a pushed screen with a back button from elsewhere.
 */
export function SeasonView({ asTab }: { asTab?: boolean }) {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const toast = useToast();
  const [googleOpen, setGoogleOpen] = useState(false);
  const saved = useReminders();
  const entered = useEntered();
  const [view, setView] = useState<View_>('month');
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const items = useMemo(() => buildCalendar(state, saved, entered), [state, saved, entered]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items) {
      for (let i = 0; i < spanOf(it); i++) {
        const k = dayKey(addDaysTo(it.date, i));
        m.set(k, [...(m.get(k) ?? []), it]);
      }
    }
    return m;
  }, [items]);

  // months to pick from: two back, a year ahead
  const months = useMemo(() => Array.from({ length: 15 }, (_, i) => new Date(today.getFullYear(), today.getMonth() - 2 + i, 1)), [today.getFullYear(), today.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickMonth = (m: Date) => {
    haptic.select();
    setMonth(m);
    setSelected(m.getMonth() === today.getMonth() && m.getFullYear() === today.getFullYear() ? today : m);
  };

  // Swipe the grid left for next month, right for last month, like a calendar app. Last month, this
  // month and next month sit side by side, so the next one is in view the whole way through the swipe.
  const slide = useRef(new Animated.Value(0)).current;
  const [gridW, setGridW] = useState(0);
  const widthRef = useRef(0);
  widthRef.current = gridW;
  const step = useRef<(n: number) => void>(() => {});
  step.current = (n: number) => pickMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  // once the new month is in the middle, the strip is back in its resting place, before the screen paints
  useLayoutEffect(() => slide.setValue(0), [month, slide]);
  const swipe = useMemo(
    () => {
      // not the native driver: the grid's height follows the swipe too, which only the JS driver can animate
      const native = false;
      const settle = () => Animated.spring(slide, { toValue: 0, useNativeDriver: native, speed: 18, bounciness: 2 }).start();
      return PanResponder.create({
        // only a clearly sideways drag, so the page still scrolls and labels still tap
        onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => slide.stopAnimation(),
        // the grid follows the finger exactly
        onPanResponderMove: (_e, g) => slide.setValue(g.dx),
        onPanResponderRelease: (_e, g) => {
          const w = widthRef.current;
          const dir = g.dx < -w * 0.22 || g.vx < -0.35 ? 1 : g.dx > w * 0.22 || g.vx > 0.35 ? -1 : 0;
          if (!dir || !w) return settle();
          // carry on at the finger's pace: a quick flick finishes quickly, a slow drag glides in
          const left = w - Math.abs(g.dx);
          const speed = Math.max(Math.abs(g.vx), 0.8);
          Animated.timing(slide, { toValue: -dir * w, duration: Math.min(320, Math.max(120, left / speed)), easing: Easing.out(Easing.cubic), useNativeDriver: native }).start(({ finished }) => {
            if (finished) step.current(dir);
          });
        },
        onPanResponderTerminate: settle,
      });
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const panels = [-1, 0, 1].map((n) => new Date(month.getFullYear(), month.getMonth() + n, 1));
  // months run to four, five or six weeks: as you swipe, the grid eases to the incoming month's height
  const height = gridW
    ? slide.interpolate({ inputRange: [-gridW, 0, gridW], outputRange: [gridHeight(panels[2]), gridHeight(panels[1]), gridHeight(panels[0])], extrapolate: 'clamp' })
    : undefined;
  const panel = (m: Date) => (
    <View key={monthKey(m)} style={gridW ? { width: gridW } : { flex: 1 }}>
      {weeksOf(m).map((days, w) => (
        <Week key={w} days={days} month={m} today={today} selected={selected} items={items} byDay={byDay} onSelect={(d) => { haptic.select(); setSelected(d); }} />
      ))}
    </View>
  );

  const upcoming = items.filter((it) => !it.past && dayDiff(it.date, today) >= 0);
  const addApple = () => {
    if (upcoming.length === 0) return toast('Nothing to add yet', { icon: 'calendar-outline' });
    if (downloadIcs(upcoming)) {
      haptic.success();
      toast('Calendar file ready. Tap Add to Calendar', { icon: 'logo-apple' });
    } else toast('Adding to Calendar works in the web app', { icon: 'information-circle' });
  };
  const addAllGoogle = () => {
    if (downloadIcs(upcoming)) toast('File saved. Import it in Google Calendar', { icon: 'download' });
    Linking.openURL('https://calendar.google.com/calendar/u/0/r/settings/export').catch(() => {});
  };
  const selectedItems = byDay.get(dayKey(selected)) ?? [];
  const syncRow = (
    <>
      <T variant="smallStrong" color={colors.textMuted} style={{ marginTop: space.xl, marginBottom: space.sm }}>Add to your calendar</T>
      <Row gap={space.sm}>
        <Pressable onPress={addApple} accessibilityRole="button" accessibilityLabel="Add to Apple Calendar" style={({ pressed }) => [s.syncBtn, pressed && ui.pressed]}>
          <Ionicons name="logo-apple" size={19} color={colors.text} />
          <T variant="bodyStrong">Apple</T>
        </Pressable>
        <Pressable onPress={() => setGoogleOpen(true)} accessibilityRole="button" accessibilityLabel="Add to Google Calendar" style={({ pressed }) => [s.syncBtn, pressed && ui.pressed]}>
          <Ionicons name="logo-google" size={17} color={colors.text} />
          <T variant="bodyStrong">Google</T>
        </Pressable>
      </Row>
    </>
  );

  return (
    <View style={ui.screen}>
      {asTab ? null : <TopBar title="My season" />}
      <Screen style={asTab ? { paddingTop: insets.top + 12, paddingBottom: 130 } : undefined}>
        {asTab ? (
          <Row style={{ justifyContent: 'space-between', marginBottom: space.lg }}>
            <T variant="title" accessibilityRole="header">My season</T>
            <Pressable onPress={() => router.push('/competitions')} accessibilityRole="button" style={({ pressed }) => [s.find, pressed && ui.pressed]}>
              <Ionicons name="search" size={15} color={colors.text} />
              <T variant="smallStrong">Find competitions</T>
            </Pressable>
          </Row>
        ) : null}
        <View style={s.segment} accessibilityRole="tablist">
          {(['list', 'month'] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} accessibilityRole="tab" accessibilityState={{ selected: view === v }} style={[s.segItem, view === v && s.segOn]}>
              <Ionicons name={v === 'month' ? 'calendar-outline' : 'list'} size={16} color={view === v ? colors.white : colors.text} />
              <T variant="bodyStrong" color={view === v ? colors.white : colors.text}>{v === 'month' ? 'Month' : 'List'}</T>
            </Pressable>
          ))}
        </View>

        {view === 'month' ? (
          <>
            <View style={s.monthBar}>
              <T variant="heading" accessibilityRole="header">{MONTHS[month.getMonth()]} {month.getFullYear()}</T>
              <Pressable onPress={() => pickMonth(new Date(today.getFullYear(), today.getMonth(), 1))} accessibilityRole="button" accessibilityLabel="Go to today" style={({ pressed }) => [s.todayBtn, pressed && ui.pressed]}>
                <Ionicons name="today-outline" size={16} color={colors.text} />
                <T variant="smallStrong">Today</T>
              </Pressable>
            </View>
            <MonthStrip months={months} month={month} onPick={pickMonth} />

            <View style={[s.grid, Platform.OS === 'web' && ({ touchAction: 'pan-y' } as object)]} onLayout={(e) => setGridW(Math.round(e.nativeEvent.layout.width))} {...swipe.panHandlers}>
              <View style={s.weekdays}>
                {WEEKDAYS.map((w, i) => (
                  <Text key={i} maxFontSizeMultiplier={1.2} style={[s.weekday, i === (today.getDay() + 6) % 7 && month.getMonth() === today.getMonth() && { color: colors.sageDeep }]}>{w}</Text>
                ))}
              </View>
              {gridW ? (
                <Animated.View style={{ height, overflow: 'hidden' }}>
                  <Animated.View style={{ flexDirection: 'row', alignItems: 'flex-start', width: gridW * 3, marginLeft: -gridW, transform: [{ translateX: slide }] }}>
                    {panels.map(panel)}
                  </Animated.View>
                </Animated.View>
              ) : (
                panel(month)
              )}
            </View>

            <Legend />

            {syncRow}

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
          <EmptyState icon="calendar-outline" title="Your season starts here" body="Games you join and competitions you save will appear here." action="Find competitions" onAction={() => router.push('/competitions')} />
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
            {syncRow}
          </>
        )}
      </Screen>

      <Sheet visible={googleOpen} onClose={() => setGoogleOpen(false)} title="Add to Google Calendar">
        <T variant="body" color={colors.textMuted}>Add items one at a time, or save a file with everything and import it into Google Calendar.</T>
        <View style={{ maxHeight: 300, marginTop: space.md }}>
          {upcoming.length === 0 ? (
            <T variant="body" color={colors.textMuted}>Nothing coming up yet.</T>
          ) : (
            <View style={{ gap: space.sm }}>
              {upcoming.slice(0, 6).map((it) => (
                <Pressable key={it.id} onPress={() => Linking.openURL(googleLink(it))} accessibilityRole="link" accessibilityLabel={`Add ${it.title} to Google Calendar`} style={({ pressed }) => [s.gRow, pressed && ui.pressed]}>
                  <View style={{ flex: 1 }}>
                    <T variant="bodyStrong" numberOfLines={1}>{it.title}</T>
                    <T variant="small" color={colors.textMuted}>{shortDate(it.date)}{it.time ? ` · ${it.time}` : ''}</T>
                  </View>
                  <Ionicons name="add-circle" size={26} color={colors.ink} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <Button title="Save a file with everything" kind="dark" icon="download-outline" onPress={addAllGoogle} disabled={upcoming.length === 0} style={{ marginTop: space.lg }} />
        <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>Preview build: this adds a copy. It doesn’t stay in step automatically yet.</T>
      </Sheet>
    </View>
  );
}

/** Scrollable row of months, like a calendar app, with the year marked where it changes */
function MonthStrip({ months, month, onPick }: { months: Date[]; month: Date; onPick: (m: Date) => void }) {
  const ref = useRef<ScrollView>(null);
  const xs = useRef<Record<number, number>>({});
  const at = months.findIndex((m) => m.getMonth() === month.getMonth() && m.getFullYear() === month.getFullYear());
  // keep the chosen month in view
  useEffect(() => {
    const x = xs.current[at];
    if (x !== undefined) ref.current?.scrollTo({ x: Math.max(0, x - 24), animated: true });
  }, [at]);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl, marginBottom: space.md }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.xl, alignItems: 'center' }}>
      {months.map((m, i) => {
        const on = i === at;
        const newYear = i > 0 && m.getMonth() === 0;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }} onLayout={(e) => (xs.current[i] = e.nativeEvent.layout.x)}>
            {newYear ? <T variant="bodyStrong" color={colors.textMuted}>{m.getFullYear()}</T> : null}
            <Pressable onPress={() => onPick(m)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${MONTHS[m.getMonth()]} ${m.getFullYear()}`} style={({ pressed }) => [s.monthPill, on && s.monthPillOn, pressed && ui.pressed]}>
              <T variant="bodyStrong" color={on ? colors.onInk : colors.text}>{MONTHS[m.getMonth()].slice(0, 3)}</T>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

/**
 * One week of the month grid. Each day shows its entries as labels, a championship runs as one bar
 * across the days it covers, and anything that doesn't fit becomes "+2 more".
 */
function Week({ days, month, today, selected, items, byDay, onSelect }: { days: Date[]; month: Date; today: Date; selected: Date; items: CalendarItem[]; byDay: Map<string, CalendarItem[]>; onSelect: (d: Date) => void }) {
  const first = days[0].getTime();
  const last = days[6].getTime();
  // entries touching this week, longest first so the bars stack neatly above single days
  const here = items
    .filter((it) => it.date.getTime() <= last && addDaysTo(it.date, spanOf(it) - 1).getTime() >= first)
    .sort((a, b) => spanOf(b) - spanOf(a) || a.date.getTime() - b.date.getTime() || (a.time ?? '').localeCompare(b.time ?? ''));
  const taken: boolean[][] = [];
  const placed: { it: CalendarItem; col: number; span: number; lane: number }[] = [];
  const hidden = Array(7).fill(0);
  for (const it of here) {
    const col = Math.max(0, Math.round((it.date.getTime() - first) / 86400000));
    const end = Math.min(6, Math.round((addDaysTo(it.date, spanOf(it) - 1).getTime() - first) / 86400000));
    let lane = 0;
    while (taken[lane]?.slice(col, end + 1).some(Boolean)) lane++;
    if (lane >= LANES) {
      for (let c = col; c <= end; c++) hidden[c]++;
      continue;
    }
    taken[lane] = taken[lane] ?? Array(7).fill(false);
    for (let c = col; c <= end; c++) taken[lane][c] = true;
    placed.push({ it, col, span: end - col + 1, lane });
  }

  return (
    <View style={s.weekRow}>
      {days.map((d, i) => {
        const inMonth = d.getMonth() === month.getMonth();
        const isToday = dayKey(d) === dayKey(today);
        const isSel = dayKey(d) === dayKey(selected);
        const count = (byDay.get(dayKey(d)) ?? []).length;
        return (
          <Pressable key={i} onPress={() => onSelect(d)} style={[s.dayCell, i > 0 && s.dayDivider, isSel && s.dayCellSel]} accessibilityRole="button" accessibilityState={{ selected: isSel }} accessibilityLabel={`${longDate(d)}${count ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}>
            <View style={[s.dateNum, isToday && s.dateToday]}>
              <Text maxFontSizeMultiplier={1.2} style={[s.dateText, !inMonth && { color: colors.textFaint }, isToday && { color: colors.onInk }]}>{d.getDate()}</Text>
            </View>
            {hidden[i] > 0 ? <Text maxFontSizeMultiplier={1.1} style={s.more}>+{hidden[i]} more</Text> : null}
          </Pressable>
        );
      })}
      {placed.map(({ it, col, span, lane }) => {
        const c = CHIP[it.kind];
        return (
          // the slot spans the day columns; the label sits inside it with a small gap either side
          <View key={it.id} style={[s.chipSlot, { left: `${(col / 7) * 100}%`, width: `${(span / 7) * 100}%`, top: DATE_H + lane * LANE_H }]}>
            <Pressable
              onPress={() => (it.href ? router.push(it.href as never) : onSelect(it.date))}
              accessibilityRole="button"
              accessibilityLabel={`${it.title}, ${longDate(it.date)}${it.time ? ` at ${it.time}` : ''}`}
              style={({ pressed }) => [s.chip, { backgroundColor: c.bg }, it.past && { opacity: 0.55 }, pressed && { opacity: 0.75 }]}>
              <Text maxFontSizeMultiplier={1.1} {...CLIP} style={[s.chipText, { color: c.fg }, CLIP_STYLE]}>{it.short}</Text>
            </Pressable>
          </View>
        );
      })}
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
      <View style={[s.rowIcon, { backgroundColor: item.kind === 'entry' ? AMBER : item.kind === 'game' ? colors.accent : colors.ink }]}>
        <Ionicons name={ICON[item.kind]} size={17} color={item.kind === 'competition' ? colors.white : colors.ink} />
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
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: radius.pill },
  segOn: { backgroundColor: colors.ink },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.md },
  todayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  monthPill: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong },
  monthPillOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  // the grid runs edge to edge, like a calendar app
  grid: { marginHorizontal: -space.xl, overflow: 'hidden', backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  weekdays: { flexDirection: 'row', paddingVertical: 8 },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  weekRow: { flexDirection: 'row', height: WEEK_H, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  dayCell: { flex: 1, alignItems: 'center', paddingTop: 3 },
  dayDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
  dayCellSel: { backgroundColor: colors.accentSoft },
  dateNum: { minWidth: 22, height: 22, paddingHorizontal: 3, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dateToday: { backgroundColor: colors.sageDeep },
  dateText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.text },
  more: { position: 'absolute', bottom: 3, fontFamily: fonts.semibold, fontSize: 10, color: colors.textMuted },
  chipSlot: { position: 'absolute', height: LANE_H - 3, paddingHorizontal: 2 },
  chip: { flex: 1, borderRadius: 4, paddingHorizontal: 3, justifyContent: 'center', overflow: 'hidden' },
  chipText: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 13 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  syncBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  gRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.bg, borderRadius: radius.lg, padding: space.md },
  jump: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: space.md, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  find: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: hairline, padding: space.md, marginBottom: space.sm, ...shadow },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
