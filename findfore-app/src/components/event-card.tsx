import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { useToast } from './toast';
import { SavedSheet } from './competition-sheets';
import { Row, T } from './ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { addDays, associationById, ENTRY_URL, entryStatus, toggleReminder, useReminders, type AmateurEvent } from '@/data/events';
import { nationalEventItems } from '@/lib/calendar';
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

  const [confirm, setConfirm] = useState(false);
  const items = nationalEventItems(event);

  const remind = () => {
    if (on) {
      toggleReminder(event.id);
      haptic.select();
      toast('Reminder removed', { icon: 'notifications-off-outline', action: { label: 'Undo', onPress: () => toggleReminder(event.id) } });
      return;
    }
    toggleReminder(event.id);
    haptic.success();
    setConfirm(true);
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${event.title}, ${assoc.name}. ${status.text}. Played ${dates} at ${event.venue}`}
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

      <Row gap={space.sm} style={{ marginTop: space.lg }}>
        <Pressable onPress={remind} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? 'Saved. Tap to remove' : isOpen ? 'Save to my calendar' : 'Remind me when entry opens'} style={({ pressed }) => [s.btn, s.save, on && s.saveOn, pressed && { opacity: 0.85 }]}>
          <Ionicons name={on ? 'checkmark-circle' : isOpen ? 'bookmark-outline' : 'notifications-outline'} size={16} color={colors.ink} />
          <T variant="bodyStrong">{on ? 'Saved' : isOpen ? 'Save' : 'Remind me'}</T>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(ENTRY_URL)} accessibilityRole="link" accessibilityLabel={isOpen ? `Enter on ${assoc.name}` : `Entry details on ${assoc.name}`} style={({ pressed }) => [s.btn, s.enter, pressed && { opacity: 0.85 }]}>
          <T variant="bodyStrong" color={colors.ink}>{isOpen ? 'Enter' : 'Details'}</T>
          <Ionicons name="open-outline" size={15} color={colors.ink} />
        </Pressable>
      </Row>

      <SavedSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        heading={isOpen ? 'Saved to your calendar' : 'Reminder set'}
        summary={`${event.title}, ${dates}`}
        emailNote={isOpen ? 'We’ll email you a reminder before it closes' : `We’ll email you the moment entry opens (${shortDate(addDays(event.opensIn))})`}
        items={items}
      />
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
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: radius.pill },
  save: { flex: 1.2, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  saveOn: { backgroundColor: colors.limeSoft, borderColor: colors.lime },
  enter: { flex: 1, backgroundColor: colors.lime },
});
