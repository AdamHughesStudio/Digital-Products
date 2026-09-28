import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { gameTypeIcon } from '@/components/cards';
import { Button, Chip, ChipRow, Field, FormLabel, Row, Screen, Stepper, T, TopBar, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { courses } from '@/data/courses';
import { useStore } from '@/data/store';
import type { Course, GameType, HandicapPreference } from '@/data/types';
import { dayLabel, distanceMiles, gameTypeLabels, milesLabel, monthLabel, placeLabel, priceLabel } from '@/lib/format';

const TYPES: GameType[] = ['casual', 'member_guest', 'competition', 'society', 'open'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6);
const MINUTES = [0, 10, 20, 30, 40, 50];
const HCP: { label: string; value: HandicapPreference }[] = [
  { label: 'Any handicap', value: { kind: 'any' } },
  { label: 'Under 10', value: { kind: 'max', max: 10 } },
  { label: 'Under 18', value: { kind: 'max', max: 18 } },
  { label: 'Under 28', value: { kind: 'max', max: 28 } },
];

export default function PostGame() {
  const params = useLocalSearchParams<{ type?: string }>();
  const { me, postGame } = useStore();
  const [type, setType] = useState<GameType>(params.type === 'member_guest' ? 'member_guest' : 'casual');
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [dayOffset, setDayOffset] = useState(1);
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [spaces, setSpaces] = useState(1);
  const [cost, setCost] = useState('');
  const [visitorFee, setVisitorFee] = useState('');
  const [hcp, setHcp] = useState(0);
  const [description, setDescription] = useState('');

  const days = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
      }),
    [],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = courses
      .filter((c) => !q || `${c.name} ${c.town} ${c.region}`.toLowerCase().includes(q))
      .map((c) => ({ c, miles: me ? distanceMiles(c, me.location) : 0 }))
      .sort((a, b) => a.miles - b.miles);
    return list.slice(0, q ? 8 : 5);
  }, [query, me]);

  if (!me) return null;

  const costNum = cost.trim() === '' ? undefined : Number(cost.replace('£', ''));
  const feeNum = visitorFee.trim() === '' ? course?.visitorFee : Number(visitorFee.replace('£', ''));
  const teeDate = new Date(days[dayOffset]);
  teeDate.setHours(hour, minute, 0, 0);
  const inPast = teeDate.getTime() < Date.now();
  const valid = !!course && !inPast && (costNum === undefined || !Number.isNaN(costNum));

  const submit = () => {
    if (!course || !valid) return;
    const id = postGame({
      courseId: course.id,
      teeTime: teeDate.toISOString(),
      spacesTotal: spaces,
      costPerGolfer: costNum,
      visitorFee: type === 'member_guest' ? feeNum : undefined,
      type,
      handicap: HCP[hcp].value,
      description: description.trim(),
    });
    router.replace(`/game/${id}?posted=1`);
  };

  return (
    <View style={ui.screen}>
      <TopBar title={type === 'member_guest' ? 'Member guest' : 'Post a game'} />
      <Screen footer={<Button title="Post game" disabled={!valid} onPress={submit} />}>
        <FormLabel>Type of game</FormLabel>
        <ChipRow>
          {TYPES.map((t) => (
            <Chip key={t} label={gameTypeLabels[t]} icon={gameTypeIcon[t]} selected={type === t} onPress={() => setType(t)} />
          ))}
        </ChipRow>

        <FormLabel>Course</FormLabel>
        {course ? (
          <Pressable onPress={() => setCourse(null)} style={[s.course, s.courseOn]}>
            <Ionicons name="flag" size={20} color={colors.lime} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" color={colors.onInk}>{course.name}</T>
              <T variant="caption" color={colors.onInkMuted}>{placeLabel(course)}</T>
            </View>
            <T variant="smallStrong" color={colors.lime}>Change</T>
          </Pressable>
        ) : (
          <>
            <Field value={query} onChangeText={setQuery} placeholder="Search for a course" autoCorrect={false} />
            <View style={{ marginTop: space.sm }}>
              {matches.map(({ c, miles }) => (
                <Pressable key={c.id} onPress={() => { setCourse(c); setQuery(''); }} style={({ pressed }) => [s.course, pressed && ui.pressed]}>
                  <Ionicons name="flag-outline" size={20} color={colors.text} />
                  <View style={{ flex: 1 }}>
                    <T variant="bodyStrong" numberOfLines={1}>{c.name}</T>
                    <T variant="caption" color={colors.textMuted}>{c.town}  ·  {milesLabel(miles)}</T>
                  </View>
                </Pressable>
              ))}
              {matches.length === 0 ? <T variant="small" color={colors.textMuted}>No courses found. The full course list arrives with launch.</T> : null}
            </View>
          </>
        )}

        <FormLabel>Date</FormLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {days.map((d, i) => {
            const on = i === dayOffset;
            return (
              <Pressable key={i} onPress={() => setDayOffset(i)} style={[s.day, on && s.dayOn]}>
                <T variant="caption" color={on ? colors.onInkMuted : colors.textMuted}>{i === 0 ? 'Today' : dayLabel(d)}</T>
                <T variant="heading" color={on ? colors.lime : colors.text}>{d.getDate()}</T>
                <T variant="caption" color={on ? colors.onInkMuted : colors.textFaint}>{monthLabel(d)}</T>
              </Pressable>
            );
          })}
        </ScrollView>

        <FormLabel>Tee time</FormLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {HOURS.map((h) => (
            <Chip key={h} label={`${String(h).padStart(2, '0')}`} selected={hour === h} onPress={() => setHour(h)} />
          ))}
        </ScrollView>
        <View style={{ marginTop: space.sm }}>
          <ChipRow>
            {MINUTES.map((m) => (
              <Chip key={m} label={`:${String(m).padStart(2, '0')}`} selected={minute === m} onPress={() => setMinute(m)} />
            ))}
          </ChipRow>
        </View>
        <T variant="small" color={inPast ? colors.danger : colors.textMuted} style={{ marginTop: space.sm }}>
          {inPast ? 'That time has already passed. Pick a later tee time.' : `Tee off at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
        </T>

        <FormLabel>Spaces available</FormLabel>
        <Stepper value={spaces} min={1} max={3} onChange={setSpaces} suffix={spaces === 1 ? 'golfer' : 'golfers'} />

        <FormLabel optional>{type === 'member_guest' ? 'Guest rate per golfer' : type === 'competition' ? 'Entry fee per golfer' : 'Cost per golfer'}</FormLabel>
        <Field value={cost} onChangeText={setCost} placeholder="£ e.g. 40" keyboardType="decimal-pad" hint="Leave blank if you’d rather sort it on the day. Payment happens off the app." />

        {type === 'member_guest' ? (
          <>
            <FormLabel optional>Standard visitor price</FormLabel>
            <Field value={visitorFee} onChangeText={setVisitorFee} placeholder={course?.visitorFee ? `£${course.visitorFee}` : '£'} keyboardType="decimal-pad" hint="Shown next to your guest rate so golfers can see the saving." />
            {costNum !== undefined && feeNum ? (
              <Row gap={8} style={s.saving}>
                <Ionicons name="pricetag" size={16} color={colors.ink} />
                <T variant="smallStrong" color={colors.ink}>
                  Guests pay {priceLabel(costNum)} instead of {priceLabel(feeNum)}
                </T>
              </Row>
            ) : null}
          </>
        ) : null}

        <FormLabel>Handicap preference</FormLabel>
        <ChipRow>
          {HCP.map((h, i) => (
            <Chip key={h.label} label={h.label} selected={hcp === i} onPress={() => setHcp(i)} />
          ))}
        </ChipRow>

        <FormLabel optional>Description</FormLabel>
        <Field value={description} onChangeText={setDescription} placeholder="Relaxed round, happy to play with anyone. Buggy optional." multiline maxLength={300} />
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  course: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.md, borderRadius: radius.md },
  courseOn: { backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: space.lg },
  day: { width: 62, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  dayOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  saving: { marginTop: space.md, backgroundColor: colors.lime, borderRadius: radius.md, padding: space.md },
});
