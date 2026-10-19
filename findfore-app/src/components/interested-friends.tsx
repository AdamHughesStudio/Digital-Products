import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, AvatarStack, Row, SectionHeader, T, styles as ui } from './ui';
import { colors, space } from '@/constants/theme';
import { interestedLine, useInterestedFriends } from '@/data/interest';
import { useStore } from '@/data/store';

/** Small overlapping faces and a line, for competition cards in a list */
export function InterestedStrip({ eventId, style, fallback }: { eventId: string; style?: object; fallback?: React.ReactNode }) {
  const list = useInterestedFriends(eventId);
  if (list.length === 0) return fallback ? <>{fallback}</> : null;
  const shown = list.slice(0, 3);
  return (
    <View style={[s.strip, style]} accessible accessibilityLabel={interestedLine(list)}>
      <AvatarStack golfers={shown.map((x) => x.golfer)} size={22} extra={list.length - shown.length} />
      <T variant="smallStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{interestedLine(list)}</T>
    </View>
  );
}

/** The fuller list on a competition's own page: who, and when they saved it */
export function InterestedSection({ eventId }: { eventId: string }) {
  const list = useInterestedFriends(eventId);
  const { openDirect } = useStore();
  if (list.length === 0) return null;
  const when = (d: number) => (d === 0 ? 'Saved today' : d === 1 ? 'Saved yesterday' : `Saved ${d} days ago`);
  return (
    <>
      <SectionHeader title="Friends interested" />
      <T variant="small" color={colors.textMuted} style={{ marginTop: -space.sm, marginBottom: space.md }}>
        {list.length === 1 ? 'One of your friends has' : `${list.length} of your friends have`} this on their shortlist.
      </T>
      <View style={ui.panel}>
        {list.map(({ golfer, daysAgo }, i) => (
          <Row key={golfer.id} gap={space.md} style={[ui.panelRow, i > 0 && ui.panelDivider]}>
            <Pressable onPress={() => router.push(`/golfer/${golfer.id}`)} accessibilityRole="button" accessibilityLabel={`${golfer.firstName} ${golfer.lastName}, ${when(daysAgo).toLowerCase()}`} style={({ pressed }) => [s.who, pressed && ui.pressed]}>
              <Avatar golfer={golfer} size={44} />
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong" numberOfLines={1}>{golfer.firstName} {golfer.lastName}</T>
                <T variant="small" color={colors.textMuted} numberOfLines={1}>{when(daysAgo)}</T>
              </View>
            </Pressable>
            <Pressable onPress={() => router.push(`/chat/${openDirect(golfer.id)}`)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Message ${golfer.firstName}`} style={({ pressed }) => [s.chat, pressed && ui.pressed]}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.ink} />
            </Pressable>
          </Row>
        ))}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  chat: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
});
