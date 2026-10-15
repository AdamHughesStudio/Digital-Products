import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ToggleRow } from '@/components/form';
import { TeeTimePicker, fmtMins } from '@/components/time-picker';
import { haptic } from '@/lib/haptics';
import { Button, Chip, ChipRow, Field, FormLabel, Row, Screen, Stepper, T, TopBar, styles as ui } from '@/components/ui';
import { colors, hairline, radius, shadowSoft, space } from '@/constants/theme';
import { courseById, courses } from '@/data/courses';
import { acceptedFor, useStore } from '@/data/store';
import { useToast } from '@/components/toast';
import type { Course, HandicapPreference } from '@/data/types';
import { dayDiff, dayLabel, distanceMiles, handicapPrefLabel, longDate, milesLabel, monthLabel, placeLabel, priceLabel } from '@/lib/format';

const HCP: { label: string; value: HandicapPreference }[] = [
  { label: 'Any handicap', value: { kind: 'any' } },
  { label: 'Under 10', value: { kind: 'max', max: 10 } },
  { label: 'Under 18', value: { kind: 'max', max: 18 } },
  { label: 'Under 28', value: { kind: 'max', max: 28 } },
];
const STEPS = ['Where and when', 'Who’s it for', 'Cost and details'];

/** Posting a game in three short steps, with a review before it goes live */
export default function PostGame() {
  const params = useLocalSearchParams<{ member?: string; edit?: string }>();
  const { me, state, postGame, updateGame } = useStore();
  // editing an existing game starts from its current details
  const editing = params.edit ? state.games[params.edit] : undefined;
  const editTee = editing ? new Date(editing.teeTime) : undefined;
  const taken = editing ? acceptedFor(state, editing.id).length : 0;
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [member, setMember] = useState(editing ? !!editing.memberHost : params.member === '1');
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState<Course | null>(editing ? courseById(editing.courseId) ?? null : null);
  const [dayOffset, setDayOffset] = useState(editTee ? Math.max(0, Math.min(20, dayDiff(editTee, new Date()))) : 1);
  const [teeMins, setTeeMins] = useState(editTee ? editTee.getHours() * 60 + editTee.getMinutes() : 10 * 60);
  const [spaces, setSpaces] = useState(editing?.spacesTotal ?? 1);
  const [cost, setCost] = useState(editing?.costPerGolfer !== undefined ? String(editing.costPerGolfer) : '');
  const [visitorFee, setVisitorFee] = useState(editing?.visitorFee !== undefined ? String(editing.visitorFee) : '');
  const [hcp, setHcp] = useState(editing ? Math.max(0, HCP.findIndex((h) => JSON.stringify(h.value) === JSON.stringify(editing.handicap))) : 0);
  const [description, setDescription] = useState(editing?.description ?? '');

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
  teeDate.setHours(Math.floor(teeMins / 60), teeMins % 60, 0, 0);
  const inPast = teeDate.getTime() < Date.now();
  const costOk = costNum === undefined || !Number.isNaN(costNum);
  const stepOk = [!!course && !inPast, true, costOk][step];
  const last = step === STEPS.length - 1;

  const next = () => {
    if (!stepOk) return;
    haptic.select();
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => {
    if (step === 0) return router.canGoBack() ? router.back() : router.replace('/');
    setStep((s) => s - 1);
  };
  const submit = () => {
    if (!course || !stepOk) return;
    if (editing) {
      updateGame(editing.id, {
        courseId: course.id,
        teeTime: teeDate.toISOString(),
        spacesTotal: spaces,
        costPerGolfer: costNum,
        visitorFee: member ? feeNum : undefined,
        memberHost: member || undefined,
        handicap: HCP[hcp].value,
        description: description.trim(),
      });
      haptic.success();
      toast(taken ? 'Game updated. Everyone playing has been told.' : 'Game updated', { icon: 'checkmark-circle' });
      router.back();
      return;
    }
    const id = postGame({
      courseId: course.id,
      teeTime: teeDate.toISOString(),
      spacesTotal: spaces,
      costPerGolfer: costNum,
      visitorFee: member ? feeNum : undefined,
      memberHost: member || undefined,
      handicap: HCP[hcp].value,
      description: description.trim(),
    });
    haptic.success();
    router.replace(`/game/${id}?posted=1`);
  };

  return (
    <View style={ui.screen}>
      <TopBar title={editing ? 'Edit game' : 'Post a game'} onBack={back} />
      <View style={[ui.contentWidth, ui.padded]}>
        <Progress step={step} />
      </View>
      <Screen
        footer={
          <Row gap={space.sm}>
            {step > 0 ? <Button title="Back" kind="ghost" onPress={back} style={{ flex: 1 }} /> : null}
            <Button title={last ? (editing ? 'Save changes' : 'Post game') : 'Continue'} icon={last ? 'checkmark' : undefined} disabled={!stepOk} onPress={last ? submit : next} style={{ flex: 2 }} />
          </Row>
        }>
        <T variant="caption" color={colors.textMuted} style={{ marginTop: space.lg }}>Step {step + 1} of {STEPS.length}</T>
        <T variant="title" accessibilityRole="header">{STEPS[step]}</T>

        {step === 0 ? (
          <>
            <FormLabel>Course</FormLabel>
            {course ? (
              <Pressable onPress={() => setCourse(null)} accessibilityRole="button" accessibilityLabel={`${course.name}. Change course`} style={[s.course, s.courseOn]}>
                <View style={s.courseIcon}>
                  <Ionicons name="flag" size={18} color={colors.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong" color={colors.onInk}>{course.name}</T>
                  <T variant="caption" color={colors.onInkMuted}>{placeLabel(course)}</T>
                </View>
                <T variant="smallStrong" color={colors.white}>Change</T>
              </Pressable>
            ) : (
              <>
                <Field value={query} onChangeText={setQuery} placeholder="Search for a course" autoCorrect={false} />
                <View style={[ui.panel, { marginTop: space.sm }]}>
                  {matches.map(({ c, miles }, i) => (
                    <Pressable key={c.id} onPress={() => { setCourse(c); setQuery(''); haptic.select(); }} accessibilityRole="button" style={({ pressed }) => [ui.panelRow, i > 0 && ui.panelDivider, pressed && ui.pressed]}>
                      <Ionicons name="flag-outline" size={18} color={colors.text} />
                      <View style={{ flex: 1 }}>
                        <T variant="bodyStrong" numberOfLines={1}>{c.name}</T>
                        <T variant="caption" color={colors.textMuted}>{c.town}  ·  {milesLabel(miles)}</T>
                      </View>
                    </Pressable>
                  ))}
                  {matches.length === 0 ? <T variant="small" color={colors.textMuted} style={{ paddingVertical: space.md }}>No courses found. The full course list arrives with launch.</T> : null}
                </View>
              </>
            )}

            <FormLabel>Date</FormLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {days.map((d, i) => {
                const on = i === dayOffset;
                return (
                  <Pressable key={i} onPress={() => { setDayOffset(i); haptic.select(); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={longDate(d)} style={[s.day, on && s.dayOn]}>
                    <T variant="caption" color={on ? colors.onInkMuted : colors.textMuted}>{i === 0 ? 'Today' : dayLabel(d)}</T>
                    <T variant="heading" color={on ? colors.white : colors.text}>{d.getDate()}</T>
                    <T variant="caption" color={on ? colors.onInkMuted : colors.textFaint}>{monthLabel(d)}</T>
                  </Pressable>
                );
              })}
            </ScrollView>

            <FormLabel>Tee time</FormLabel>
            <TeeTimePicker value={teeMins} onChange={setTeeMins} />
            {inPast ? (
              <T variant="small" color={colors.danger} style={{ marginTop: space.sm }}>That time has already passed today. Pick a later tee time or another day.</T>
            ) : null}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <FormLabel>Spaces available</FormLabel>
            <Stepper value={spaces} min={Math.max(1, taken)} max={3} onChange={setSpaces} suffix={spaces === 1 ? 'golfer' : 'golfers'} />

            <FormLabel>Handicap preference</FormLabel>
            <ChipRow>
              {HCP.map((h, i) => (
                <Chip key={h.label} label={h.label} selected={hcp === i} onPress={() => setHcp(i)} />
              ))}
            </ChipRow>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <ToggleRow label={course ? `I’m a member at ${course.name.replace(/ Golf (Club|Course|Links)$/i, '')}` : 'I’m a member at this club'} detail="Golfers will see your price is a members’ guest rate." value={member} onChange={setMember} />

            <FormLabel optional>{member ? 'Guest rate per golfer' : 'Cost per golfer'}</FormLabel>
            <Field value={cost} onChangeText={setCost} placeholder="£ e.g. 40" keyboardType="decimal-pad" hint="Leave blank if you’d rather sort it on the day. Payment happens off the app." error={!costOk} />

            {member ? (
              <>
                <FormLabel optional>Standard visitor price</FormLabel>
                <Field value={visitorFee} onChangeText={setVisitorFee} placeholder={course?.visitorFee ? `£${course.visitorFee}` : '£'} keyboardType="decimal-pad" hint="Shown next to your guest rate so golfers can see the saving." />
                {costNum !== undefined && feeNum ? (
                  <Row gap={8} style={s.saving}>
                    <Ionicons name="pricetag" size={16} color={colors.ink} />
                    <T variant="smallStrong" color={colors.ink}>Guests pay {priceLabel(costNum)} instead of {priceLabel(feeNum)}</T>
                  </Row>
                ) : null}
              </>
            ) : null}

            <FormLabel optional>A note for golfers</FormLabel>
            <Field value={description} onChangeText={setDescription} placeholder="Relaxed round, happy to play with anyone. Buggy optional." multiline maxLength={300} />

            <T variant="label" color={colors.textMuted} style={{ marginTop: space.xxl, marginBottom: space.sm }}>Ready to post</T>
            <View style={s.review}>
              <ReviewRow icon="flag" text={course?.name ?? ''} sub={course ? placeLabel(course) : ''} onPress={() => setStep(0)} />
              <ReviewRow icon="calendar" text={`${longDate(teeDate)} at ${fmtMins(teeMins)}`} onPress={() => setStep(0)} divider />
              <ReviewRow icon="people" text={`${spaces} space${spaces === 1 ? '' : 's'}`} sub={handicapPrefLabel(HCP[hcp].value)} onPress={() => setStep(1)} divider />
              <ReviewRow icon="pricetag" text={priceLabel(costNum)} sub={costNum === undefined ? 'Sorted on the day' : member ? 'Members’ guest rate, paid at the club' : 'Per golfer, paid at the club'} onPress={() => {}} divider />
            </View>
          </>
        ) : null}
      </Screen>
    </View>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <View accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`} style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
      {STEPS.map((_, i) => (
        <View key={i} style={[s.bar, i <= step && s.barOn]} />
      ))}
    </View>
  );
}

function ReviewRow({ icon, text, sub, onPress, divider }: { icon: 'flag' | 'calendar' | 'people' | 'pricetag'; text: string; sub?: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.reviewRow, divider && s.reviewDivider, pressed && ui.pressed]}>
      <Ionicons name={icon} size={16} color={colors.white} />
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" color={colors.onInk} numberOfLines={1}>{text}</T>
        {sub ? <T variant="caption" color={colors.onInkMuted}>{sub}</T> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.onInkFaint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigh },
  barOn: { backgroundColor: colors.lime },
  course: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.md, borderRadius: radius.md },
  courseOn: { backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: space.md },
  courseIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  day: { width: 62, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: hairline, backgroundColor: colors.surface, ...shadowSoft },
  dayOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  saving: { marginTop: space.md, backgroundColor: colors.lime, borderRadius: radius.md, padding: space.md },
  review: { backgroundColor: colors.ink, borderRadius: radius.lg, paddingHorizontal: space.lg },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  reviewDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.inkBorder },
});
