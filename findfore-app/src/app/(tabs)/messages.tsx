import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, EmptyState, Row, T, styles as ui } from '@/components/ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { CreditCoin, useCredits } from '@/components/credits';
import { useRequestActions } from '@/lib/actions';
import { actionNeeded, ME, unreadCount, useStore } from '@/data/store';
import type { JoinRequest } from '@/data/types';
import { chatTime, displayName, formatTime, handicapLabel, hcpText, plural, relativeDay, timeAgo } from '@/lib/format';

export default function Messages() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'inbox' | 'requests'>(params.tab === 'requests' ? 'requests' : 'inbox');
  const { state } = useStore();
  const pending = actionNeeded(state);

  useEffect(() => {
    if (params.tab === 'requests') setTab('requests');
  }, [params.tab]);

  return (
    <View style={ui.screen}>
      <View style={[ui.contentWidth, ui.padded, { paddingTop: insets.top + 12 }]}>
        <T variant="title" accessibilityRole="header">Messages</T>
        <View style={s.segment}>
          {(['inbox', 'requests'] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[s.segmentItem, tab === k && s.segmentOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
              <T variant="smallStrong" color={tab === k ? colors.onInk : colors.textMuted}>
                {k === 'inbox' ? 'Inbox' : `Requests${pending.length ? ` (${pending.length})` : ''}`}
              </T>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded]}>{tab === 'inbox' ? <Inbox /> : <Requests />}</View>
      </ScrollView>
    </View>
  );
}

function Inbox() {
  const { state } = useStore();
  const convs = Object.values(state.conversations)
    .map((c) => {
      const msgs = state.messages.filter((m) => m.conversationId === c.id);
      return { c, last: msgs[msgs.length - 1] };
    })
    .filter((x) => x.last && !x.c.participantIds.every((p) => p === ME || state.blockedIds.includes(p)))
    .sort((a, b) => b.last!.createdAt.localeCompare(a.last!.createdAt));

  if (convs.length === 0) {
    return <EmptyState icon="chatbubbles-outline" title="No messages yet" body="Chats open once you request a game, get accepted or invite someone to play." />;
  }

  return (
    <View>
      {convs.map(({ c, last }) => {
        const others = c.participantIds.filter((p) => p !== ME).map((p) => state.golfers[p]).filter(Boolean);
        const game = c.gameId ? state.games[c.gameId] : undefined;
        const course = game ? courseById(game.courseId) : undefined;
        const title = game ? course?.name ?? 'Game chat' : others[0] ? displayName(others[0]) : 'Chat';
        const unread = unreadCount(state, c.id);
        const sender = last!.senderId === ME ? 'You' : state.golfers[last!.senderId]?.firstName;
        return (
          <Pressable key={c.id} onPress={() => router.push(`/chat/${c.id}`)} style={({ pressed }) => [s.row, pressed && ui.pressed]}>
            <Avatar golfer={others[0]} size={52} />
            <View style={{ flex: 1 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{title}</T>
                <T variant="caption" color={unread ? colors.text : colors.textFaint}>{chatTime(last!.createdAt)}</T>
              </Row>
              {game ? (
                <T variant="caption" color={colors.textMuted} numberOfLines={1}>
                  {others.map((o) => o.firstName).join(', ')}  ·  {relativeDay(new Date(game.teeTime))} {formatTime(new Date(game.teeTime))}
                </T>
              ) : null}
              <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
                <T variant="small" color={unread ? colors.text : colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>
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
  );
}

function Requests() {
  const { state } = useStore();
  const pending = actionNeeded(state).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sent = Object.values(state.requests)
    .filter((r) => r.kind === 'request' && r.golferId === ME && r.status === 'pending')
    .filter((r) => state.games[r.gameId] && !state.games[r.gameId].cancelled);

  if (pending.length === 0 && sent.length === 0) {
    return <EmptyState icon="mail-open-outline" title="All caught up" body="Requests to join your games and invites from other golfers appear here." />;
  }

  return (
    <View style={{ gap: space.md }}>
      {pending.map((r) => (
        <RequestCard key={r.id} r={r} />
      ))}
      {sent.length > 0 ? (
        <>
          <T variant="label" color={colors.textMuted} style={{ marginTop: space.lg }}>Waiting on the host</T>
          {sent.map((r) => (
            <RequestCard key={r.id} r={r} sent />
          ))}
        </>
      ) : null}
    </View>
  );
}

function RequestCard({ r, sent }: { r: JoinRequest; sent?: boolean }) {
  const { state } = useStore();
  const act = useRequestActions();
  const { available } = useCredits();
  const g = state.games[r.gameId];
  const c = courseById(g.courseId);
  const d = new Date(g.teeTime);
  const other = state.golfers[r.kind === 'invite' || sent ? g.hostId : r.golferId];
  const headline = sent
    ? `You asked ${other.firstName} to join`
    : r.kind === 'invite'
      ? `${other.firstName} invited you to play`
      : `${other.firstName} wants to join your game`;

  return (
    <View style={[ui.card, { gap: space.md }]}>
      <Pressable onPress={() => router.push(`/golfer/${other.id}`)}>
        <Row gap={space.md}>
          <Avatar golfer={other} size={46} />
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{headline}</T>
            <T variant="caption" color={colors.textMuted}>
              {hcpText(other.handicap)}  ·  {plural(other.gamesPlayed, 'game')}  ·  {timeAgo(r.createdAt)}
            </T>
          </View>
        </Row>
      </Pressable>
      <Pressable onPress={() => router.push(`/game/${g.id}`)} style={s.gameBox}>
        <Ionicons name="flag" size={18} color={colors.text} />
        <View style={{ flex: 1 }}>
          <T variant="smallStrong" numberOfLines={1}>{c?.name}</T>
          <T variant="caption" color={colors.textMuted}>{relativeDay(d)} at {formatTime(d)}</T>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </Pressable>
      {r.message ? <T variant="small" color={colors.textMuted}>{r.message}</T> : null}
      {sent ? (
        <>
          <Row gap={6}>
            <CreditCoin size={14} />
            <T variant="caption" color={colors.textMuted}>1 credit held until {other.firstName} replies</T>
          </Row>
          <Button title="Withdraw request" kind="ghost" size="md" onPress={() => act.withdraw(r)} />
        </>
      ) : (
        <>
          <Row gap={6}>
            <CreditCoin size={14} />
            <T variant="caption" color={colors.textMuted}>
              {r.kind === 'invite' ? (available >= 1 ? 'Accepting uses 1 credit' : 'You need a free credit to accept. Host a game to earn one.') : 'Accept and you earn 1 credit'}
            </T>
          </Row>
          <Row gap={space.sm}>
            <Button title="Decline" kind="ghost" size="md" onPress={() => act.decline(r)} style={{ flex: 1 }} />
            <Button title="Accept" size="md" disabled={r.kind === 'invite' && available < 1} onPress={() => act.accept(r)} style={{ flex: 1 }} />
          </Row>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4, marginTop: space.md, marginBottom: space.lg, borderWidth: 1, borderColor: colors.border },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  segmentOn: { backgroundColor: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, marginBottom: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow },
  unread: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  gameBox: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
});
