import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useToast } from './toast';
import { T } from './ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { kindById, type ClubEvent } from '@/data/club-events';
import { courseById } from '@/data/courses';
import { addDays, toggleReminder, useReminders } from '@/data/events';
import { milesLabel, shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

export function ClubEventCard({ event, miles, width }: { event: ClubEvent; miles: number; width?: number }) {
  const toast = useToast();
  const saved = useReminders().includes(event.id);
  const kind = kindById(event.kind);
  const course = courseById(event.courseId);
  if (!course) return null;

  const save = () => {
    const on = toggleReminder(event.id);
    if (on) {
      haptic.success();
      toast('Saved. We’ll remind you to enter', { icon: 'bookmark', action: { label: 'Undo', onPress: () => toggleReminder(event.id) } });
    } else haptic.select();
  };

  return (
    <View style={[s.card, width ? { width } : null]} accessible accessibilityLabel={`${kind.label} at ${course.name}. ${shortDate(addDays(event.playedIn))} from ${event.start}. ${event.entry}. ${event.fee} pounds to enter. ${event.placesLeft} places left`}>
      <View style={s.head}>
        <View style={s.icon}>
          <Ionicons name={kind.icon} size={17} color={colors.lime} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{kind.label}</T>
          <T variant="caption" color={colors.textMuted}>{event.entry}</T>
        </View>
      </View>

      <T variant="subheading" numberOfLines={2} style={{ marginTop: space.md }}>{course.name}</T>
      <T variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>{course.town} · {milesLabel(miles)} away</T>

      <View style={s.line}>
        <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
        <T variant="small" color={colors.textMuted}>{shortDate(addDays(event.playedIn))} · from {event.start}</T>
      </View>
      <View style={s.line}>
        <Ionicons name="pricetag-outline" size={15} color={colors.textMuted} />
        <T variant="small" color={colors.textMuted}>£{event.fee} to enter · {event.placesLeft} places left</T>
      </View>

      <Pressable onPress={save} accessibilityRole="button" accessibilityState={{ selected: saved }} accessibilityLabel={saved ? 'Saved. Tap to remove' : 'Save event'} style={({ pressed }) => [s.btn, saved ? s.btnOn : s.btnDark, pressed && { opacity: 0.85 }]}>
        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color={saved ? colors.ink : colors.lime} />
        <T variant="bodyStrong" color={saved ? colors.ink : colors.lime}>{saved ? 'Saved' : 'Save event'}</T>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, padding: space.lg, marginBottom: space.md, ...shadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: radius.pill, marginTop: space.lg },
  btnDark: { backgroundColor: colors.ink },
  btnOn: { backgroundColor: colors.lime },
});
