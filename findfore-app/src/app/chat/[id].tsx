import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SafetySheet } from '@/components/safety';
import { Avatar, AvatarStack, EmptyState, IconButton, T, TopBar, styles as ui } from '@/components/ui';
import { colors, fonts, radius, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { ME, useStore } from '@/data/store';
import { dayDiff, displayName, formatTime, longDate, relativeDay } from '@/lib/format';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, sendMessage, markRead } = useStore();
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const c = state.conversations[id];
  const msgs = state.messages.filter((m) => m.conversationId === id);
  const count = msgs.length;

  useEffect(() => {
    if (c) markRead(id);
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: count > 0 }), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, count]);

  if (!c) {
    return (
      <View style={ui.screen}>
        <TopBar />
        <EmptyState icon="chatbubbles-outline" title="Chat not found" body="This conversation is no longer available." />
      </View>
    );
  }

  const others = c.participantIds.filter((p) => p !== ME).map((p) => state.golfers[p]).filter(Boolean);
  const game = c.gameId ? state.games[c.gameId] : undefined;
  const course = game ? courseById(game.courseId) : undefined;
  const isGroup = !!game && c.id.startsWith('chat-game-');
  const title = isGroup ? course?.name ?? 'Game chat' : others[0] ? displayName(others[0]) : 'Chat';
  const blocked = others.length > 0 && others.every((o) => state.blockedIds.includes(o.id));
  const single = !isGroup && others.length === 1 ? others[0] : undefined;

  const send = () => {
    if (!text.trim()) return;
    sendMessage(id, text);
    setText('');
  };

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title={title} right={single ? <IconButton icon="ellipsis-horizontal" label="More" onPress={() => setMenu(true)} /> : undefined} />
      {game ? (
        <Pressable onPress={() => router.push(`/game/${game.id}`)} style={({ pressed }) => [s.gameBar, pressed && ui.pressed]}>
          <View style={[ui.contentWidth, s.gameBarInner]}>
            <AvatarStack golfers={others.slice(0, 3)} size={26} />
            <View style={{ flex: 1 }}>
              <T variant="smallStrong" numberOfLines={1}>{isGroup ? others.map((o) => o.firstName).join(', ') + ' and you' : course?.name}</T>
              <T variant="caption" color={colors.textMuted}>{relativeDay(new Date(game.teeTime))} at {formatTime(new Date(game.teeTime))}{game.cancelled ? '  ·  Cancelled' : ''}</T>
            </View>
            <T variant="smallStrong" color={colors.lime}>View game</T>
          </View>
        </Pressable>
      ) : null}

      <ScrollView ref={scroll} contentContainerStyle={{ paddingVertical: space.lg }} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded, { gap: 6 }]}>
          {msgs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: space.xxxl, gap: space.sm }}>
              <Avatar golfer={others[0]} size={64} />
              <T variant="subheading">Say hello to {others[0]?.firstName ?? 'your playing partner'}</T>
              <T variant="small" color={colors.textMuted} style={{ textAlign: 'center' }}>Sort out where to meet, buggies or anything else before the round.</T>
            </View>
          ) : null}
          {msgs.map((m, i) => {
            const mine = m.senderId === ME;
            const prev = msgs[i - 1];
            const d = new Date(m.createdAt);
            const newDay = !prev || dayDiff(d, new Date(prev.createdAt)) !== 0;
            const showName = isGroup && !mine && (newDay || prev?.senderId !== m.senderId);
            const sender = state.golfers[m.senderId];
            return (
              <View key={m.id}>
                {newDay ? <T variant="caption" color={colors.textFaint} style={s.day}>{dayDiff(new Date(), d) === 0 ? 'Today' : longDate(d)}</T> : null}
                <View style={[s.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
                  <View style={[s.bubble, mine ? s.mine : s.theirs]}>
                    {showName ? <T variant="caption" color={colors.lime} style={{ marginBottom: 2 }}>{sender?.firstName}</T> : null}
                    <T variant="body" color={mine ? colors.ink : colors.text}>{m.body}</T>
                    <T variant="caption" color={mine ? 'rgba(11,11,11,0.55)' : colors.textFaint} style={{ alignSelf: 'flex-end', marginTop: 2 }}>{formatTime(d)}</T>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {blocked ? (
          <T variant="small" color={colors.textMuted} style={{ textAlign: 'center', flex: 1 }}>You’ve blocked this golfer. Unblock them from your profile to message.</T>
        ) : (
          <View style={[ui.contentWidth, s.composerInner]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.lime}
              style={s.input}
              multiline
              onSubmitEditing={send}
              submitBehavior="submit"
              onKeyPress={(e) => {
                // web: Enter sends, Shift+Enter adds a new line
                const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
                  (e as unknown as { preventDefault: () => void }).preventDefault();
                  send();
                }
              }}
              returnKeyType="send"
            />
            <Pressable onPress={send} disabled={!text.trim()} style={[s.send, !text.trim() && { opacity: 0.4 }]} accessibilityLabel="Send">
              <Ionicons name="arrow-up" size={22} color={colors.ink} />
            </Pressable>
          </View>
        )}
      </View>
      <SafetySheet golfer={single} visible={menu} onClose={() => setMenu(false)} />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  gameBar: { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: space.lg, paddingVertical: space.sm },
  gameBarInner: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  day: { textAlign: 'center', marginVertical: space.md },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  mine: { backgroundColor: colors.lime, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 6 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingHorizontal: space.lg, paddingTop: space.sm, backgroundColor: colors.ink, flexDirection: 'row' },
  composerInner: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
});
