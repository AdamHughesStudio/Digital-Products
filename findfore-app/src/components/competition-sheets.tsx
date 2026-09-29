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
 * Shown after saving or entering: confirms it is on the FindFore calendar, says an email reminder is
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
      <View style={s.tick}>
        <Ionicons name="checkmark" size={30} color={colors.ink} />
      </View>
      <T variant="title" style={{ marginTop: space.lg }}>{heading}</T>
      <T variant="body" color={colors.textMuted} style={{ marginTop: space.xs }}>{summary}</T>

      <View style={s.points}>
        <Point icon="calendar" text="Added to your FindFore calendar" />
        <Point icon="mail" text={emailNote} />
      </View>

      <T variant="smallStrong" color={colors.textMuted} style={{ marginTop: space.xl, marginBottom: space.sm }}>Also add it to</T>
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

      <Button title="View my calendar" kind="dark" icon="calendar-outline" onPress={() => { onClose(); router.push('/calendar'); }} style={{ marginTop: space.lg }} />
      <Button title="Done" kind="ghost" onPress={onClose} style={{ marginTop: space.xs }} />
    </Sheet>
  );
}

function Point({ icon, text }: { icon: 'calendar' | 'mail'; text: string }) {
  return (
    <Row gap={space.md} align="flex-start">
      <View style={s.pointIcon}>
        <Ionicons name={icon} size={15} color={colors.lime} />
      </View>
      <T variant="bodyStrong" style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

/** Review and confirm an entry */
export function EnterSheet({ visible, onClose, onConfirm, title, rows, fee, note }: { visible: boolean; onClose: () => void; onConfirm: () => void; title: string; rows: [string, string][]; fee?: string; note: string }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <T variant="title">Enter competition</T>
      <T variant="body" color={colors.textMuted} style={{ marginTop: space.xs }}>{title}</T>
      <View style={s.table}>
        {rows.map(([k, v]) => (
          <View key={k} style={s.tableRow}>
            <T variant="small" color={colors.textMuted}>{k}</T>
            <T variant="bodyStrong" style={{ flex: 1, textAlign: 'right' }}>{v}</T>
          </View>
        ))}
      </View>
      <Button title={fee ? `Confirm entry  ·  ${fee}` : 'Confirm entry'} onPress={() => { haptic.success(); onConfirm(); }} style={{ marginTop: space.lg }} />
      <Button title="Not now" kind="ghost" onPress={onClose} style={{ marginTop: space.xs }} />
      <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>{note}</T>
    </Sheet>
  );
}

export const dateLine = (d: Date, time?: string) => `${shortDate(d)}${time ? ` · ${time}` : ''}`;

const s = StyleSheet.create({
  tick: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  points: { gap: space.md, marginTop: space.lg },
  pointIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  cal: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  table: { marginTop: space.lg, backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: space.md },
  tableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingVertical: 12 },
});
