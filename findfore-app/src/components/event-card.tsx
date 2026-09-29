import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { useToast } from './toast';
import { T } from './ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { addDays, associationById, entryStatus, toggleReminder, useReminders, type AmateurEvent } from '@/data/events';
import { shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const AMBER = '#FFC53D';

export function EventCard({ event, width, onPress }: { event: AmateurEvent; width?: number; onPress?: () => void }) {
  const toast = useToast();
  const reminders = useReminders();
  const assoc = associationById(event.association);
  const status = entryStatus(event);
  const isOpen = status.kind === 'open' || status.kind === 'closing';
  const on = reminders.includes(event.id);

  const played = addDays(event.playedIn);
  const last = addDays(event.playedIn + event.days - 1);
  const dates = event.days > 1 ? `${shortDate(played)} to ${shortDate(last)}` : shortDate(played);

  const remind = () => {
    const nowOn = toggleReminder(event.id);
    if (nowOn) {
      haptic.success();
      toast('We’ll remind you when entry opens', { icon: 'notifications', action: { label: 'Undo', onPress: () => toggleReminder(event.id) } });
    } else {
      haptic.select();
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${event.title}, ${assoc.name}. ${status.kind === 'open' || status.kind === 'closing' ? 'Entry ' + status.text.toLowerCase() : 'Entry ' + status.text.toLowerCase()}. Played ${dates} at ${event.venue}`}
      style={({ pressed }) => [s.card, width ? { width } : null, pressed && { opacity: 0.92 }]}>
      <View style={s.top}>
        <View style={s.assoc}>
          <T variant="label" color={colors.lime}>{assoc.short}</T>
        </View>
        <View style={s.status}>
          <View style={[s.dot, { backgroundColor: status.kind === 'soon' || status.kind === 'closing' ? AMBER : isOpen ? '#2FB344' : colors.borderStrong }]} />
          <T variant="smallStrong">{status.text}</T>
        </View>
      </View>

      <T variant="subheading" numberOfLines={2} style={{ marginTop: space.md }}>{event.title}</T>
      <T variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>{event.venue}</T>

      <View style={s.dates}>
        <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
        <T variant="small" color={colors.textMuted}>{dates}</T>
      </View>

      {isOpen ? (
        <Pressable onPress={() => Linking.openURL(assoc.site)} accessibilityRole="link" accessibilityLabel={`Enter on ${assoc.name}`} style={({ pressed }) => [s.btn, s.btnLime, pressed && { opacity: 0.85 }]}>
          <T variant="bodyStrong" color={colors.ink}>Enter on {assoc.name}</T>
          <Ionicons name="open-outline" size={15} color={colors.ink} />
        </Pressable>
      ) : (
        <Pressable onPress={remind} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? 'Reminder set. Tap to remove' : 'Remind me when entry opens'} style={({ pressed }) => [s.btn, on ? s.btnOn : s.btnDark, pressed && { opacity: 0.85 }]}>
          <Ionicons name={on ? 'checkmark-circle' : 'notifications-outline'} size={17} color={on ? colors.ink : colors.lime} />
          <T variant="bodyStrong" color={on ? colors.ink : colors.lime}>{on ? 'Reminder set' : 'Remind me'}</T>
        </Pressable>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, padding: space.lg, marginBottom: space.md, ...shadow },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  assoc: { backgroundColor: colors.ink, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dates: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: radius.pill, marginTop: space.lg },
  btnDark: { backgroundColor: colors.ink },
  btnLime: { backgroundColor: colors.lime },
  btnOn: { backgroundColor: colors.lime },
});
