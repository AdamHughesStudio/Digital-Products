import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { useToast } from './toast';
import { Button, Row, Sheet, T } from './ui';
import { colors, radius, space } from '@/constants/theme';
import type { CalendarItem } from '@/lib/calendar';
import { downloadIcs, googleLink } from '@/lib/calendar-export';
import { shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

/**
 * Shown after saving or entering: confirms it is on the PlusFore calendar, says an email reminder is
 * coming, and offers to add it to Apple or Google Calendar.
 */
export function SavedSheet({ visible, onClose, heading, summary, emailNote, items }: { visible: boolean; onClose: () => void; heading: string; summary: string; emailNote: string; items: CalendarItem[] }) {
  const toast = useToast();
  const first = items[0];

  const apple = () => {
    if (downloadIcs(items)) {
      haptic.success();
      toast('Tap Add to Calendar to finish', { icon: 'logo-apple' });
    } else toast('Adding to Calendar works in the web app', { icon: 'information-circle' });
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Ionicons name="checkmark-circle" size={32} color={colors.sageDeep} />
      <T variant="title" style={{ marginTop: space.sm }}>{heading}</T>
      <T variant="body" color={colors.textMuted} style={{ marginTop: space.xs }}>{summary}</T>

      <View style={s.points}>
        <Point icon="calendar" text="Added to your PlusFore calendar" />
        <Point icon="mail" text={emailNote} />
      </View>

      <T variant="label" color={colors.textMuted} style={{ marginTop: space.xl, marginBottom: space.sm }}>Also add it to</T>
      <Row gap={space.sm}>
        <Pressable onPress={apple} accessibilityRole="button" accessibilityLabel="Add to Apple Calendar" style={({ pressed }) => [s.cal, pressed && { opacity: 0.8 }]}>
          <Ionicons name="logo-apple" size={19} color={colors.text} />
          <T variant="bodyStrong">Apple</T>
        </Pressable>
        <Pressable onPress={() => first && Linking.openURL(googleLink(first))} accessibilityRole="link" accessibilityLabel="Add to Google Calendar" style={({ pressed }) => [s.cal, pressed && { opacity: 0.8 }]}>
          <Ionicons name="logo-google" size={17} color={colors.text} />
          <T variant="bodyStrong">Google</T>
        </Pressable>
      </Row>

      <Button title="View my season" kind="dark" icon="calendar-outline" onPress={() => { onClose(); router.push('/season'); }} style={{ marginTop: space.lg }} />
      <Button title="Done" kind="ghost" onPress={onClose} style={{ marginTop: space.xs }} />
    </Sheet>
  );
}

function Point({ icon, text }: { icon: 'calendar' | 'mail'; text: string }) {
  return (
    <Row gap={space.md} align="flex-start">
      <Ionicons name={`${icon}-outline`} size={20} color={colors.text} style={{ marginTop: 1 }} />
      <T variant="body" style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

export const dateLine = (d: Date, time?: string) => `${shortDate(d)}${time ? ` · ${time}` : ''}`;

const s = StyleSheet.create({
  points: { gap: space.md, marginTop: space.lg },
  cal: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
});
