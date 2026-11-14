import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { InterestedStrip } from './interested-friends';
import { useToast } from './toast';
import { SavedSheet, dateLine } from './competition-sheets';
import { T, styles as ui } from './ui';
import { colors, fonts, hair, radius, space } from '@/constants/theme';
import { eventSummary, eventTitle, feeLabel, type ClubEvent } from '@/data/club-events';
import { courseById } from '@/data/courses';
import { addDays, ENTRY_URL, toggleReminder, useReminders } from '@/data/events';
import { clubEventItem } from '@/lib/calendar';
import { milesLabel, shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

/**
 * A club open as a row in a list: what it is, when and what it costs, then who it is for, with
 * save and Enter at the right. `showClub` adds the club and how far away it is, for lists that mix
 * clubs; a club's own page leaves it off rather than repeat its name on every row.
 */
export function ClubEventCard({ event, miles, width, showClub, first }: { event: ClubEvent; miles: number; width?: number; showClub?: boolean; first?: boolean }) {
  const toast = useToast();
  const isSaved = useReminders().includes(event.id);
  const isNew = event.listedDaysAgo <= 7;
  const title = eventTitle(event);
  const course = courseById(event.courseId);
  const [confirm, setConfirm] = useState(false);
  if (!course) return null;

  const item = clubEventItem(event);
  const when = dateLine(addDays(event.playedIn), event.start);
  const day = shortDate(addDays(event.playedIn));
  const who = [eventSummary(event), event.maxHandicap !== undefined ? `Max handicap ${event.maxHandicap}` : ''].filter(Boolean).join(' · ');

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
    <View style={[s.row, first && s.first, width ? { width } : null]}>
      <Pressable
        onPress={() => router.push(`/open/${event.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${title} at ${course.name}. ${day}${event.start ? ` from ${event.start}` : ''}. ${feeLabel(event)}. ${who}${isNew ? '. New' : ''}. Details`}
        style={({ pressed }) => [s.main, pressed && ui.pressed]}>
        <T variant="subheading" numberOfLines={2}>{title}</T>
        {showClub ? <T variant="small" color={colors.textMuted} numberOfLines={1}>{course.name} · {milesLabel(miles)}</T> : null}
        <T variant="small" tabular numberOfLines={1}>
          {day}
          {event.start ? ` from ${event.start}` : ''} · {feeLabel(event)}
        </T>
        <T variant="small" color={colors.textMuted} numberOfLines={1}>
          {isNew ? <T variant="small" style={{ fontFamily: fonts.bold }}>New · </T> : null}
          {who}
        </T>
        <InterestedStrip eventId={event.id} style={{ marginTop: space.sm }} />
      </Pressable>

      <Pressable onPress={save} hitSlop={{ top: 11, bottom: 11, left: 8, right: 4 }} accessibilityRole="button" accessibilityState={{ selected: isSaved }} accessibilityLabel={isSaved ? 'Saved. Tap to remove' : 'Save to my calendar'} style={({ pressed }) => [s.save, pressed && { opacity: 0.5 }]}>
        <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={22} color={isSaved ? colors.sageDeep : colors.text} />
      </Pressable>
      <Pressable onPress={() => Linking.openURL(event.entryUrl ?? ENTRY_URL)} hitSlop={{ top: 6, bottom: 6, right: 6 }} accessibilityRole="link" accessibilityLabel={event.real ? `Enter ${title} on the club's website` : `Enter ${title}, opens the entry page`} style={({ pressed }) => [s.enter, pressed && { opacity: 0.85 }]}>
        <T variant="smallStrong" color={colors.onInk} style={s.enterText}>Enter</T>
        <Ionicons name="open-outline" size={14} color={colors.onInk} />
      </Pressable>

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
  // a row on the page, ruled off from the one above
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 14, borderTopWidth: hair, borderTopColor: colors.borderStrong },
  first: { borderTopWidth: 0 },
  main: { flex: 1, minWidth: 0, gap: 1 },
  save: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  enter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.sageDeep },
  enterText: { fontSize: 14, lineHeight: 18 },
});
