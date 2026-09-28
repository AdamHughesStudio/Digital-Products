import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PlacePicker, RadiusPicker } from '@/components/form';
import { Button, Chip, ChipRow, Field, FormLabel, Screen, T, TopBar, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import type { Place, TimeOfDay } from '@/data/types';
import { dayLabel, handicapLabel, isoDate, monthLabel, timeOfDayLabels } from '@/lib/format';

const TIMES: TimeOfDay[] = ['any', 'early', 'morning', 'afternoon', 'evening'];

export default function PostLooking() {
  const { me, postLooking } = useStore();
  const [place, setPlace] = useState<Place | undefined>(me?.location);
  const [miles, setMiles] = useState(me?.radiusMiles ?? 25);
  const [dates, setDates] = useState<string[]>([]);
  const [time, setTime] = useState<TimeOfDay>('any');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');

  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
      }),
    [],
  );

  if (!me) return null;
  const budgetNum = budget.trim() === '' ? undefined : Number(budget.replace('£', ''));
  const valid = !!place && dates.length > 0 && (budgetNum === undefined || !Number.isNaN(budgetNum));

  const toggle = (iso: string) => setDates((ds) => (ds.includes(iso) ? ds.filter((x) => x !== iso) : [...ds, iso].sort()));

  const submit = () => {
    if (!place || !valid) return;
    const id = postLooking({ location: place, radiusMiles: miles, dates, timeOfDay: time, budget: budgetNum, message: message.trim() });
    router.replace(`/looking/${id}?posted=1`);
  };

  return (
    <View style={ui.screen}>
      <TopBar title="Looking for a game" />
      <Screen footer={<Button title="Let golfers know" disabled={!valid} onPress={submit} />}>
        <T variant="body" color={colors.textMuted} style={{ marginTop: space.md }}>
          Hosts nearby will see you’re free and can invite you. We’ll also tell you when a game matches.
        </T>

        <FormLabel>When are you free?</FormLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {days.map((d, i) => {
            const iso = isoDate(d);
            const on = dates.includes(iso);
            return (
              <Pressable key={iso} onPress={() => toggle(iso)} style={[s.day, on && s.dayOn]} accessibilityState={{ selected: on }}>
                <T variant="caption" color={on ? colors.ink : colors.textMuted}>{i === 0 ? 'Today' : dayLabel(d)}</T>
                <T variant="heading" color={on ? colors.ink : colors.text}>{d.getDate()}</T>
                <T variant="caption" color={on ? colors.ink : colors.textFaint}>{monthLabel(d)}</T>
              </Pressable>
            );
          })}
        </ScrollView>
        <T variant="caption" color={colors.textFaint} style={{ marginTop: space.sm }}>Pick as many days as you like.</T>

        <FormLabel>Preferred time</FormLabel>
        <ChipRow>
          {TIMES.map((t) => (
            <Chip key={t} label={timeOfDayLabels[t]} selected={time === t} onPress={() => setTime(t)} />
          ))}
        </ChipRow>

        <FormLabel>Where from?</FormLabel>
        <PlacePicker value={place} onChange={setPlace} />

        <FormLabel>Happy to travel</FormLabel>
        <RadiusPicker value={miles} onChange={setMiles} options={[10, 15, 25, 40, 60]} />

        <FormLabel optional>Budget per round</FormLabel>
        <Field value={budget} onChangeText={setBudget} placeholder="£ e.g. 50" keyboardType="decimal-pad" />

        <FormLabel optional>Message</FormLabel>
        <Field value={message} onChangeText={setMessage} placeholder="Don’t mind where we play. Happy to join an existing game or arrange something." multiline maxLength={240} />

        <T variant="caption" color={colors.textFaint} style={{ marginTop: space.lg }}>
          Your handicap ({handicapLabel(me.handicap)}) is shown with your post.
        </T>
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  day: { width: 62, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  dayOn: { backgroundColor: colors.lime, borderColor: colors.lime },
});
