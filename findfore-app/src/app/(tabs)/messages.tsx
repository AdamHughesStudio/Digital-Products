import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeRow } from '@/components/swipe-row';
import { useToast } from '@/components/toast';
import { Avatar, Button, EmptyState, Row, T, styles as ui } from '@/components/ui';
import { colors, fonts, hair, radius, space } from '@/constants/theme';
import { courseById, gameCourseName } from '@/data/courses';
import { useRequestActions } from '@/lib/actions';
import { actionNeeded, ME, unreadCount, useStore } from '@/data/store';
import type { JoinRequest } from '@/data/types';
import { chatTime, displayName, formatTime, hcpText, plural, relativeDay, timeAgo } from '@/lib/format';

/**
 * Everything in one place, in the order it needs you: replies first, then your chats,
 * then the requests you're waiting on.
 */
export default function Messages() {
  const insets = useSafeAreaInsets();
  const { state, deleteChat, restoreChat } = useStore();
  const toast = useToast();
  // the chat row swiped open to show Delete; only one at a time
  const [openChat, setOpenChat] = useState<string | null>(null);
  const removeChat = (convId: string) => {
    setOpenChat(null);
    const deleted = deleteChat(convId);
    toast('Chat deleted', { icon: 'trash-outline', action: { label: 'Undo', onPress: () => restoreChat(deleted) } });
  };
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
            <EmptyState icon="chatbubbles-outline" title="Nothing here yet" body="Chats open once you request a game, get accepted or invite someone to play." action="Find a game" onAction={() => router.push('/')} />
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
              <View style={[ui.panel, s.chatPanel]}>
                {convs.map(({ c, last }, i) => {
                  const others = c.participantIds.filter((p) => p !== ME).map((p) => state.golfers[p]).filter(Boolean);
                  const game = c.gameId ? state.games[c.gameId] : undefined;
                  const course = game ? courseById(game.courseId) : undefined;
                  const title = game ? (course && gameCourseName(game)) ?? 'Game chat' : others[0] ? displayName(others[0]) : 'Chat';
                  const unread = unreadCount(state, c.id);
                  const sender = last!.senderId === ME ? 'You' : state.golfers[last!.senderId]?.firstName;
                  const when = game ? `${relativeDay(new Date(game.teeTime))} ${formatTime(new Date(game.teeTime))}` : '';
                  return (
                    <SwipeRow
                      key={c.id}
                      open={openChat === c.id}
                      onOpenChange={(o) => setOpenChat(o ? c.id : null)}
                      onDelete={() => removeChat(c.id)}
                      deleteLabel="Delete"
                    >
                    <Pressable
                      // tapping an open row just closes it
                      onPress={() => (openChat ? setOpenChat(null) : router.push(`/chat/${c.id}`))}
                      accessibilityRole="button"
                      accessibilityLabel={`${title}${unread ? `, ${unread} unread` : ''}. ${sender}: ${last!.body}`}
                      accessibilityActions={[{ name: 'delete', label: 'Delete chat' }]}
                      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && removeChat(c.id)}
                      style={({ pressed }) => [s.chatRow, pressed && ui.pressed]}>
                    <View style={[ui.panelRow, i > 0 && ui.panelDivider, { flex: 1 }]}>
                      <Avatar golfer={others[0]} size={48} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Row style={{ justifyContent: 'space-between' }}>
                          <T variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{title}</T>
                          <T variant="caption" tabular color={unread ? colors.sageDeep : colors.textFaint} style={unread ? { fontFamily: fonts.semibold } : undefined}>{chatTime(last!.createdAt)}</T>
                        </Row>
                        {game ? (
                          <T variant="small" color={colors.textMuted} tabular numberOfLines={1}>
                            {others.map((o) => o.firstName).join(', ')} · {when}
                          </T>
                        ) : null}
                        <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
                          <T variant={unread ? 'smallStrong' : 'small'} color={unread ? colors.text : colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>
                            {sender}: {last!.body}
                          </T>
                          {unread ? (
                            <View style={s.unread}>
                              <T variant="caption" tabular color={colors.onInk} style={{ fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 }}>{unread}</T>
                            </View>
                          ) : null}
                        </Row>
                      </View>
                    </View>
                    </Pressable>
                    </SwipeRow>
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
  const g = state.games[r.gameId];
  const c = courseById(g.courseId);
  const d = new Date(g.teeTime);
  const other = state.golfers[r.kind === 'invite' ? g.hostId : r.golferId];
  const invite = r.kind === 'invite';

  return (
    <View style={[ui.card, { gap: space.md }]}>
      <Pressable onPress={() => router.push(`/golfer/${other.id}`)} accessibilityRole="button" accessibilityLabel={`${displayName(other)}'s profile`}>
        <Row gap={space.md}>
          <Avatar golfer={other} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="bodyStrong" numberOfLines={1}>{invite ? `${other.firstName} invited you to play` : `${other.firstName} wants to join`}</T>
            <T variant="small" color={colors.textMuted} tabular numberOfLines={1}>
              {hcpText(other.handicap)} · {plural(other.gamesPlayed, 'game')} · {timeAgo(r.createdAt)}
            </T>
          </View>
        </Row>
      </Pressable>
      <Pressable onPress={() => router.push(`/game/${g.id}`)} accessibilityRole="button" style={({ pressed }) => [s.gameBox, pressed && ui.pressed]}>
        <Ionicons name="flag-outline" size={18} color={colors.text} />
        <T variant="smallStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{c ? gameCourseName(g) : null}</T>
        <T variant="small" color={colors.textMuted} tabular numberOfLines={1} style={{ flex: 1 }}>{relativeDay(d)} {formatTime(d)}</T>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </Pressable>
      {r.message ? <T variant="body">“{r.message}”</T> : null}
      <Row gap={space.sm}>
        <Button title="Decline" kind="ghost" size="md" onPress={() => act.decline(r)} style={{ flex: 1 }} />
        <Button title="Accept" size="md" onPress={() => act.accept(r)} style={{ flex: 1 }} />
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
      <Avatar golfer={host} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="bodyStrong" numberOfLines={1}>{c ? gameCourseName(g) : null}</T>
        <T variant="small" color={colors.textMuted} tabular numberOfLines={1}>{relativeDay(d)} {formatTime(d)} · {host.firstName} hasn’t replied yet</T>
      </View>
      <Pressable onPress={() => act.withdraw(r)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Withdraw request" style={({ pressed }) => [s.withdraw, pressed && ui.pressed]}>
        <T variant="smallStrong" color={colors.sageDeep}>Withdraw</T>
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  // rows run the full width of the panel so the Delete button sits flush with its edge
  chatPanel: { paddingHorizontal: 0, overflow: 'hidden' },
  chatRow: { paddingHorizontal: space.xl },
  unread: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: colors.sageDeep, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  // which game the request is about: a ruled line inside the card, not a box of its own
  gameBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, borderTopWidth: hair, borderBottomWidth: hair, borderColor: colors.borderStrong },
  withdraw: { minHeight: 32, justifyContent: 'center', paddingLeft: 8 },
});
