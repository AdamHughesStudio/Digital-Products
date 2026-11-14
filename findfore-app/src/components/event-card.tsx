import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { InterestedStrip } from './interested-friends';
import { useToast } from './toast';
import { SavedSheet } from './competition-sheets';
import { T, styles as ui } from './ui';
import { colors, hair, radius, space } from '@/constants/theme';
import { addDays, associationById, ENTRY_URL, entryStatus, toggleReminder, useReminders, type AmateurEvent } from '@/data/events';
import { nationalEventItems } from '@/lib/calendar';
import { shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const AMBER = '#D9A441';

/**
 * A national championship as a row in a list: whether entry is open and who runs it, the title,
 * then where and when, with save (or a reminder for when entry opens) and the entry link at the right.
 */
export function EventCard({ event, width, onPress: onPressProp, first }: { event: AmateurEvent; width?: number; onPress?: () => void; first?: boolean }) {
  const onPress = onPressProp ?? (() => router.push(`/championship/${event.id}`));
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
    <View style={[s.row, first && s.first, width ? { width } : null]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${event.title}, ${assoc.name}. ${status.text}. Played ${dates} at ${event.venue}`}
        style={({ pressed }) => [s.main, pressed && ui.pressed]}>
        <View style={s.status}>
          <View style={[s.dot, { backgroundColor: status.kind === 'soon' || status.kind === 'closing' ? AMBER : isOpen ? colors.sage : colors.borderStrong }]} />
          <T variant="smallStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {status.text}
            <T variant="small" color={colors.textMuted}> · {assoc.short}</T>
          </T>
        </View>
        <T variant="subheading" numberOfLines={2}>{event.title}</T>
        <T variant="small" color={colors.textMuted} tabular numberOfLines={1}>{event.venue} · {dates}</T>
        <InterestedStrip eventId={event.id} style={{ marginTop: space.sm }} />
      </Pressable>

      <Pressable onPress={remind} hitSlop={{ top: 11, bottom: 11, left: 8, right: 4 }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? 'Saved. Tap to remove' : isOpen ? 'Save to my calendar' : 'Remind me when entry opens'} style={({ pressed }) => [s.save, pressed && { opacity: 0.5 }]}>
        <Ionicons name={isOpen ? (on ? 'bookmark' : 'bookmark-outline') : on ? 'notifications' : 'notifications-outline'} size={22} color={on ? colors.sageDeep : colors.text} />
      </Pressable>
      <Pressable onPress={() => Linking.openURL(ENTRY_URL)} hitSlop={{ top: 6, bottom: 6, right: 6 }} accessibilityRole="link" accessibilityLabel={isOpen ? `Enter on ${assoc.name}` : `Entry details on ${assoc.name}`} style={({ pressed }) => [s.enter, pressed && { opacity: 0.85 }]}>
        <T variant="smallStrong" color={colors.onInk} style={s.enterText}>{isOpen ? 'Enter' : 'Details'}</T>
        <Ionicons name="open-outline" size={14} color={colors.onInk} />
      </Pressable>

      {/* beside the row, not inside its pressable, so a tap on the sheet never opens the page beneath */}
      <SavedSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        heading={isOpen ? 'Saved to your calendar' : 'Reminder set'}
        summary={`${event.title}, ${dates}`}
        emailNote={isOpen ? 'We’ll email you a reminder before it closes' : `We’ll email you the moment entry opens (${shortDate(addDays(event.opensIn))})`}
        items={items}
      />
    </View>
  );
}

const s = StyleSheet.create({
  // a row on the page, ruled off from the one above
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 14, borderTopWidth: hair, borderTopColor: colors.borderStrong },
  first: { borderTopWidth: 0 },
  main: { flex: 1, minWidth: 0, gap: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  save: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  enter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.sageDeep },
  enterText: { fontSize: 14, lineHeight: 18 },
});
