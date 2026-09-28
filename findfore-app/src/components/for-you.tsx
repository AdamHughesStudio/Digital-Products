import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { T, styles as ui, type IconName } from './ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { actionNeeded, isPast, ME, myGames, roundsToReview, useStore } from '@/data/store';
import { formatTime, relativeDay } from '@/lib/format';

type Item = { key: string; icon: IconName; title: string; detail: string; href: string; accent?: boolean };

/** One compact panel for the things that need you: next game, replies waiting, a round to rate */
export function ForYou() {
  const { state } = useStore();
  const items: Item[] = [];

  const next = myGames(state)
    .filter((g) => !isPast(g))
    .sort((a, b) => a.teeTime.localeCompare(b.teeTime))[0];
  if (next) {
    const d = new Date(next.teeTime);
    items.push({
      key: 'next',
      icon: 'calendar',
      title: `Up next: ${courseById(next.courseId)?.name ?? 'your game'}`,
      detail: `${relativeDay(d)} at ${formatTime(d)}  ·  ${next.hostId === ME ? 'You’re hosting' : 'You’re playing'}`,
      href: `/game/${next.id}`,
      accent: true,
    });
  }

  const waiting = actionNeeded(state);
  if (waiting.length > 0) {
    const invites = waiting.filter((r) => r.kind === 'invite').length;
    const requests = waiting.length - invites;
    const parts = [
      invites ? `${invites} invite${invites === 1 ? '' : 's'}` : '',
      requests ? `${requests} request${requests === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    items.push({ key: 'waiting', icon: 'mail-unread', title: `${parts.join(' and ')} waiting`, detail: 'Tap to reply', href: '/messages?tab=requests' });
  }

  const review = roundsToReview(state)[0];
  if (review) {
    const name = courseById(review.courseId)?.name.split(' (')[0] ?? 'your round';
    items.push({ key: 'review', icon: 'thumbs-up', title: `How was ${name}?`, detail: 'Rate your round, it takes 10 seconds', href: `/game/${review.id}` });
  }

  if (items.length === 0) return null;

  return (
    <View style={s.panel}>
      {items.map((it, i) => (
        <Pressable
          key={it.key}
          onPress={() => router.push(it.href)}
          accessibilityRole="button"
          accessibilityLabel={`${it.title}. ${it.detail}`}
          style={({ pressed }) => [s.row, i > 0 && s.divider, pressed && ui.pressed]}>
          <View style={[s.icon, it.accent && { backgroundColor: colors.lime }]}>
            <Ionicons name={it.icon} size={16} color={it.accent ? colors.ink : colors.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong" numberOfLines={1}>{it.title}</T>
            <T variant="small" color={colors.textMuted} numberOfLines={1}>{it.detail}</T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.md, marginTop: space.xs, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
