import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarStack, Row, T, styles as ui } from './ui';
import { colors, radius, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { acceptedFor, actionNeeded, gameChatId, isPast, myGames, ME, useStore } from '@/data/store';
import { formatTime, relativeDay } from '@/lib/format';

/** Banner for my next confirmed game, plus a nudge when requests or invites need a reply */
export function UpNext() {
  const { state } = useStore();
  const next = myGames(state)
    .filter((g) => !isPast(g))
    .sort((a, b) => a.teeTime.localeCompare(b.teeTime))[0];
  const pending = actionNeeded(state).length;

  if (!next && pending === 0) return null;

  return (
    <View style={{ gap: space.sm, marginTop: space.sm }}>
      {pending > 0 ? (
        <Pressable onPress={() => router.push('/messages?tab=requests')} style={({ pressed }) => [s.nudge, pressed && ui.pressed]}>
          <View style={s.nudgeIcon}>
            <Ionicons name="mail-unread-outline" size={18} color={colors.ink} />
          </View>
          <T variant="smallStrong" style={{ flex: 1 }}>
            {pending === 1 ? 'You have 1 request or invite waiting' : `You have ${pending} requests or invites waiting`}
          </T>
          <Ionicons name="chevron-forward" size={18} color={colors.lime} />
        </Pressable>
      ) : null}
      {next ? <NextGame gameId={next.id} /> : null}
    </View>
  );
}

function NextGame({ gameId }: { gameId: string }) {
  const { state } = useStore();
  const g = state.games[gameId];
  const c = courseById(g.courseId);
  const d = new Date(g.teeTime);
  const players = [g.hostId, ...acceptedFor(state, g.id).map((r) => r.golferId)].map((id) => state.golfers[id]).filter(Boolean);
  const hasChat = !!state.conversations[gameChatId(g.id)];
  return (
    <Pressable onPress={() => router.push(`/game/${g.id}`)} style={({ pressed }) => [s.card, pressed && ui.pressed]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="label" color={colors.ink}>Up next</T>
        <T variant="smallStrong" color={colors.ink}>{g.hostId === ME ? 'You’re hosting' : 'You’re playing'}</T>
      </Row>
      <T variant="heading" color={colors.ink} numberOfLines={1} style={{ marginTop: 6 }}>{c?.name}</T>
      <T variant="bodyStrong" color={colors.ink}>{relativeDay(d)} at {formatTime(d)}</T>
      <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
        <AvatarStack golfers={players.slice(0, 4)} size={28} />
        {hasChat ? (
          <Pressable onPress={() => router.push(`/chat/${gameChatId(g.id)}`)} style={({ pressed }) => [s.chat, pressed && ui.pressed]} hitSlop={6}>
            <Ionicons name="chatbubble-ellipses" size={16} color={colors.lime} />
            <T variant="smallStrong" color={colors.lime}>Group chat</T>
          </Pressable>
        ) : null}
      </Row>
    </Pressable>
  );
}

const s = StyleSheet.create({
  nudge: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.limeSoft, borderWidth: 1, borderColor: colors.limeBorder },
  nudgeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.lime, borderRadius: radius.lg, padding: space.lg },
  chat: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill },
});
