import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, Screen, T, TopBar, styles as ui, type IconName } from '@/components/ui';
import { colors, hair, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import type { NotificationKind } from '@/data/types';
import { timeAgo } from '@/lib/format';

const ICONS: Record<NotificationKind, IconName> = {
  request_received: 'hand-right-outline',
  request_accepted: 'checkmark-circle-outline',
  request_declined: 'close-circle-outline',
  invited: 'mail-outline',
  match_found: 'sparkles-outline',
  message: 'chatbubble-outline',
  game_tomorrow: 'alarm-outline',
  space_available: 'flag-outline',
  friend_request: 'person-add-outline',
  friend_accepted: 'people-outline',
};

export default function Notifications() {
  const { state, markNotificationsRead } = useStore();
  const list = state.notifications;
  const unread = list.some((n) => !n.read);

  // mark as read when leaving, so new ones stay highlighted while the screen is open
  useEffect(() => () => markNotificationsRead(), [markNotificationsRead]);

  return (
    <View style={ui.screen}>
      <TopBar title="Notifications" right={unread ? <Pressable onPress={markNotificationsRead} hitSlop={8}><T variant="smallStrong" color={colors.sageDeep}>Read all</T></Pressable> : undefined} />
      <Screen>
        {list.length === 0 ? (
          <EmptyState icon="notifications-outline" title="Nothing yet" body="Requests, invites, matches and reminders will appear here." />
        ) : (
          <View>
          {list.map((n, i) => (
            <Pressable key={n.id} onPress={() => n.href && router.push(n.href)} accessibilityRole="button" accessibilityLabel={`${n.read ? '' : 'New. '}${n.title}. ${n.body}. ${timeAgo(n.createdAt)}`} style={({ pressed }) => [s.row, i > 0 && s.divider, pressed && ui.pressed]}>
              <Ionicons name={ICONS[n.kind]} size={22} color={n.read ? colors.textMuted : colors.sageDeep} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T variant={n.read ? 'body' : 'bodyStrong'}>{n.title}</T>
                <T variant="small" color={colors.textMuted}>{n.body}</T>
              </View>
              <View style={s.side}>
                <T variant="caption" color={colors.textFaint} tabular>{timeAgo(n.createdAt)}</T>
                {!n.read ? <View style={s.dot} /> : null}
              </View>
            </Pressable>
          ))}
          </View>
        )}
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingVertical: 14, alignItems: 'flex-start' },
  divider: { borderTopWidth: hair, borderTopColor: colors.borderStrong },
  side: { alignItems: 'flex-end', gap: 6, paddingTop: 3 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.sageDeep },
});
