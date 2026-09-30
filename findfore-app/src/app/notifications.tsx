import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, Screen, T, TopBar, styles as ui, type IconName } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import type { NotificationKind } from '@/data/types';
import { timeAgo } from '@/lib/format';

const ICONS: Record<NotificationKind, IconName> = {
  request_received: 'hand-right',
  request_accepted: 'checkmark-circle',
  request_declined: 'close-circle',
  invited: 'mail',
  match_found: 'sparkles',
  message: 'chatbubble',
  game_tomorrow: 'alarm',
  space_available: 'flag',
};

export default function Notifications() {
  const { state, markNotificationsRead } = useStore();
  const list = state.notifications;
  const unread = list.some((n) => !n.read);

  // mark as read when leaving, so new ones stay highlighted while the screen is open
  useEffect(() => () => markNotificationsRead(), [markNotificationsRead]);

  return (
    <View style={ui.screen}>
      <TopBar title="Notifications" right={unread ? <Pressable onPress={markNotificationsRead} hitSlop={8}><T variant="smallStrong" color={colors.text}>Read all</T></Pressable> : undefined} />
      <Screen>
        {list.length === 0 ? (
          <EmptyState icon="notifications-outline" title="Nothing yet" body="Requests, invites, matches and reminders will appear here." />
        ) : (
          <View style={ui.panel}>
          {list.map((n, i) => (
            <Pressable key={n.id} onPress={() => n.href && router.push(n.href)} style={({ pressed }) => [s.row, i > 0 && ui.panelDivider, pressed && ui.pressed]}>
              <View style={[s.icon, !n.read && { backgroundColor: colors.lime }]}>
                <Ionicons name={ICONS[n.kind]} size={20} color={n.read ? colors.textMuted : colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{n.title}</T>
                <T variant="small" color={colors.textMuted}>{n.body}</T>
                <T variant="caption" color={colors.textFaint} style={{ marginTop: 3 }}>{timeAgo(n.createdAt)}</T>
              </View>
              {!n.read ? <View style={s.dot} /> : null}
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
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.ink, marginTop: 6 },
});
