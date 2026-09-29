import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { useToast } from './toast';
import { SavedSheet, dateLine } from './competition-sheets';
import { Row, T } from './ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { eventSummary, eventTitle, genderById, type ClubEvent } from '@/data/club-events';
import { courseById } from '@/data/courses';
import { addDays, ENTRY_URL, toggleReminder, useReminders } from '@/data/events';
import { clubEventItem } from '@/lib/calendar';
import { milesLabel, shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

export function ClubEventCard({ event, miles, width }: { event: ClubEvent; miles: number; width?: number }) {
  const toast = useToast();
  const isSaved = useReminders().includes(event.id);
  const title = eventTitle(event);
  const icon = event.format === 'scramble' ? 'people' : genderById(event.gender).icon;
  const course = courseById(event.courseId);
  if (!course) return null;

  const [confirm, setConfirm] = useState(false);
  const item = clubEventItem(event);
  const when = dateLine(addDays(event.playedIn), event.start);

  const save = () => {
    if (isSaved) {
      toggleReminder(event.id);
      haptic.select();
      toast('Removed from your calendar', { icon: 'bookmark-outline', action: { label: 'Undo', onPress: () => toggleReminder(event.id) } });
      return;
    }
    toggleReminder(event.id);
    haptic.success();
    setConfirm(true);
  };
  return (
    <View style={[s.card, width ? { width } : null]} accessibilityLabel={`${title} at ${eventSummary(event)}. Course: ${course.name}. ${shortDate(addDays(event.playedIn))} from ${event.start}. $${event.fee} pounds to enter. ${event.placesLeft} places left`}>
      <View style={s.head}>
        <View style={s.icon}>
          <Ionicons name={icon} size={17} color={colors.lime} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{title}</T>
          <T variant="caption" color={colors.textMuted}>{eventSummary(event)}</T>
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
        <T variant="small" color={colors.textMuted}>£{event.fee} to enter · {event.placesLeft} places left{event.maxHandicap !== undefined ? ` · Max hcp ${event.maxHandicap}` : ''}</T>
      </View>

      <Row gap={space.sm} style={{ marginTop: space.lg }}>
        <Pressable onPress={save} accessibilityRole="button" accessibilityState={{ selected: isSaved }} accessibilityLabel={isSaved ? 'Saved. Tap to remove' : 'Save to my calendar'} style={({ pressed }) => [s.btn, s.save, isSaved && s.saveOn, pressed && { opacity: 0.85 }]}>
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={16} color={colors.ink} />
          <T variant="bodyStrong">{isSaved ? 'Saved' : 'Save'}</T>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(ENTRY_URL)} accessibilityRole="link" accessibilityLabel={`Enter ${title}, opens the entry page`} style={({ pressed }) => [s.btn, s.enter, pressed && { opacity: 0.85 }]}>
          <T variant="bodyStrong" color={colors.ink}>Enter</T>
          <Ionicons name="open-outline" size={15} color={colors.ink} />
        </Pressable>
      </Row>

      <SavedSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        heading="Saved to your calendar"
        summary={`${title} at ${course.name}, ${when}`}
        emailNote="We’ll email you a reminder the day before"
        items={[item]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, padding: space.lg, marginBottom: space.md, ...shadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: radius.pill },
  save: { flex: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  saveOn: { backgroundColor: colors.limeSoft ?? '#EDFFB0', borderColor: colors.lime },
  enter: { flex: 1.2, backgroundColor: colors.lime },
});
