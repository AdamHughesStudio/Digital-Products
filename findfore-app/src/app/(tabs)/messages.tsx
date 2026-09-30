import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, EmptyState, Row, T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { CreditCoin, useCredits } from '@/components/credits';
import { useRequestActions } from '@/lib/actions';
import { hostCreditEarned, actionNeeded, ME, unreadCount, useStore } from '@/data/store';
import type { JoinRequest } from '@/data/types';
import { chatTime, displayName, formatTime, hcpText, plural, relativeDay, timeAgo } from '@/lib/format';

/**
 * Everything in one place, in the order it needs you: replies first, then your chats,
 * then the requests you're waiting on.
 */
export default function Messages() {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const pending = actionNeeded(state).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sent = Object.values(state.requests)
    .filter((r) => r.kind === 'request' && r.golferId === ME && r.status === 'pending')
    .filter((r) => state.games[r.gameId] && !state.games[r.gameId].cancelled);
  const convs = Object.values(state.conversations)
    .map((c) => {
      const msgs = state.messages.filter((m) => m.conversationId === c.id);
      return { c, last: msgs[msgs.length - 1] };
    })
    .filter((x) => x.last && !x.c.participantIds.every((p) => p === ME || state.blockedIds.includes(p)))
    .sort((a, b) => b.last!.createdAt.localeCompare(a.last!.createdAt));
  const empty = pending.length === 0 && sent.length === 0 && convs.length === 0;

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded]}>
          <T variant="title" accessibilityRole="header">Messages</T>

          {empty ? (
            <EmptyState icon="chatbubbles-outline" title="Nothing here yet" body="Chats open once you request a game, get accepted or invite someone to play." action="Find a game" onAction={() => router.push('/search')} />
          ) : null}

          {pending.length > 0 ? (
            <>
              <Label text={pending.length === 1 ? 'Needs your reply' : `${pending.length} need your reply`} />
              <View style={{ gap: space.md }}>
                {pending.map((r) => (
                  <RequestCard key={r.id} r={r} />
                ))}
              </View>
            </>
          ) : null}

          {convs.length > 0 ? (
            <>
              <Label text="Chats" />
              <View style={ui.panel}>
                {convs.map(({ c, last }, i) => {
                  const others = c.participantIds.filter((p) => p !== ME).map((p) => state.golfers[p]).filter(Boolean);
                  const game = c.gameId ? state.games[c.gameId] : undefined;
                  const course = game ? courseById(game.courseId) : undefined;
                  const title = game ? course?.name ?? 'Game chat' : others[0] ? displayName(others[0]) : 'Chat';
                  const unread = unreadCount(state, c.id);
                  const sender = last!.senderId === ME ? 'You' : state.golfers[last!.senderId]?.firstName;
                  const when = game ? `${relativeDay(new Date(game.teeTime))} ${formatTime(new Date(game.teeTime))}` : '';
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => router.push(`/chat/${c.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`${title}${unread ? `, ${unread} unread` : ''}. ${sender}: ${last!.body}`}
                      style={({ pressed }) => [ui.panelRow, i > 0 && ui.panelDivider, pressed && ui.pressed]}>
                      <Avatar golfer={others[0]} size={50} />
                      <View style={{ flex: 1 }}>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <T variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{title}</T>
                          <T variant="caption" color={unread ? colors.text : colors.textFaint} style={unread ? { fontWeight: '700' } : undefined}>{chatTime(last!.createdAt)}</T>
                        </Row>
                        {game ? (
                          <T variant="caption" color={colors.textMuted} numberOfLines={1}>
                            {others.map((o) => o.firstName).join(', ')}  ·  {when}
                          </T>
                        ) : null}
                        <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
                          <T variant="small" color={unread ? colors.text : colors.textMuted} numberOfLines={1} style={[{ flex: 1 }, unread ? { fontWeight: '600' } : null]}>
                            {sender}: {last!.body}
                          </T>
                          {unread ? (
                            <View style={s.unread}>
                              <T variant="caption" color={colors.ink} style={{ fontWeight: '800' }}>{unread}</T>
                            </View>
                          ) : null}
                        </Row>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {sent.length > 0 ? (
            <>
              <Label text="Waiting on the host" />
              <View style={ui.panel}>
                {sent.map((r, i) => (
                  <SentRow key={r.id} r={r} divider={i > 0} />
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <T variant="label" color={colors.textMuted} style={{ marginTop: space.xl, marginBottom: space.sm }}>{text}</T>;
}

function RequestCard({ r }: { r: JoinRequest }) {
  const { state } = useStore();
  const act = useRequestActions();
  const { available } = useCredits();
  const g = state.games[r.gameId];
  const c = courseById(g.courseId);
  const d = new Date(g.teeTime);
  const other = state.golfers[r.kind === 'invite' ? g.hostId : r.golferId];
  const invite = r.kind === 'invite';
  const note = invite ? (available >= 1 ? 'Accepting uses 1 credit' : 'You need a free credit to accept') : hostCreditEarned(state, r.gameId) ? 'Accept to confirm their space' : 'Accept and earn 1 credit for hosting';

  return (
    <View style={[ui.card, { gap: space.md }]}>
      <Pressable onPress={() => router.push(`/golfer/${other.id}`)} accessibilityRole="button" accessibilityLabel={`${displayName(other)}'s profile`}>
        <Row gap={space.md}>
          <Avatar golfer={other} size={48} />
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{invite ? `${other.firstName} invited you to play` : `${other.firstName} wants to join`}</T>
            <T variant="caption" color={colors.textMuted}>
              {hcpText(other.handicap)}  ·  {plural(other.gamesPlayed, 'game')}  ·  {timeAgo(r.createdAt)}
            </T>
          </View>
        </Row>
      </Pressable>
      <Pressable onPress={() => router.push(`/game/${g.id}`)} accessibilityRole="button" style={({ pressed }) => [s.gameBox, pressed && ui.pressed]}>
        <Ionicons name="flag" size={16} color={colors.lime} />
        <T variant="smallStrong" color={colors.onInk} numberOfLines={1} style={{ flex: 1 }}>{c?.name}</T>
        <T variant="caption" color={colors.onInkMuted}>{relativeDay(d)} {formatTime(d)}</T>
        <Ionicons name="chevron-forward" size={14} color={colors.onInkMuted} />
      </Pressable>
      {r.message ? <T variant="small" color={colors.textMuted}>“{r.message}”</T> : null}
      <Row gap={space.sm}>
        <Button title="Decline" kind="ghost" size="md" onPress={() => act.decline(r)} style={{ flex: 1 }} />
        <Button title="Accept" size="md" disabled={invite && available < 1} onPress={() => act.accept(r)} style={{ flex: 1.3 }} />
      </Row>
      <Row gap={6} style={{ justifyContent: 'center' }}>
        <CreditCoin size={13} />
        <T variant="caption" color={colors.textMuted}>{note}</T>
      </Row>
    </View>
  );
}

function SentRow({ r, divider }: { r: JoinRequest; divider?: boolean }) {
  const { state } = useStore();
  const act = useRequestActions();
  const g = state.games[r.gameId];
  const c = courseById(g.courseId);
  const host = state.golfers[g.hostId];
  const d = new Date(g.teeTime);
  return (
    <Pressable onPress={() => router.push(`/game/${g.id}`)} accessibilityRole="button" style={({ pressed }) => [ui.panelRow, divider && ui.panelDivider, pressed && ui.pressed]}>
      <Avatar golfer={host} size={44} />
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" numberOfLines={1}>{c?.name}</T>
        <T variant="caption" color={colors.textMuted}>{relativeDay(d)} {formatTime(d)}  ·  {host.firstName} hasn’t replied yet</T>
      </View>
      <Pressable onPress={() => act.withdraw(r)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Withdraw request" style={({ pressed }) => [s.withdraw, pressed && ui.pressed]}>
        <T variant="caption" color={colors.textMuted}>Withdraw</T>
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  unread: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  gameBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 10, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.ink },
  withdraw: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.bg },
});
