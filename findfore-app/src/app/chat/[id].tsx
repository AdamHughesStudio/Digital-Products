import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GifPicker } from '@/components/gif-picker';
import { SafetySheet } from '@/components/safety';
import { useToast } from '@/components/toast';
import { Avatar, AvatarStack, EmptyState, IconButton, T, TopBar, styles as ui } from '@/components/ui';
import { colors, fonts, hairline, radius, shadowSoft, space } from '@/constants/theme';
import { courseById, gameCourseName } from '@/data/courses';
import { isPast, ME, useStore } from '@/data/store';
import type { Message } from '@/data/types';
import { haptic } from '@/lib/haptics';
import { useVisibleArea } from '@/lib/keyboard';
import { cloudConvKey, gifsEnabled, useTypingChannel } from '@/lib/social';
import { dayDiff, displayName, formatTime, longDate, relativeDay } from '@/lib/format';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, typing, sendMessage, react, markRead, showTyping } = useStore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);
  const [menu, setMenu] = useState(false);
  const scroll = useRef<ScrollView>(null);
  // holding a message opens the reactions over it, so each bubble's place on screen is needed
  const bubbles = useRef(new Map<string, View>());
  const [picked, setPicked] = useState<Picked | null>(null);
  // replying to one message, as in WhatsApp: swipe it right, or hold it and pick Reply
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  // where each message sits in the chat, so tapping a quote can jump back to the original
  const rowY = useRef(new Map<string, number>());
  const [flash, setFlash] = useState<string | null>(null);
  // GIFs show once the server has a KLIPY key and you're signed in
  const [gifsOn, setGifsOn] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  useEffect(() => {
    gifsEnabled().then(setGifsOn);
  }, []);
  // on the web app the chat is pinned to the area above the keyboard, so the header stays put
  const area = useVisibleArea();
  // typing: the message box has focus or the keyboard is up. Either way, make room for the conversation
  const [focused, setFocused] = useState(false);
  const typingNow = focused || !!area?.keyboard;

  const c = state.conversations[id];
  const msgs = state.messages.filter((m) => m.conversationId === id);
  const count = msgs.length;

  useEffect(() => {
    if (c) markRead(id);
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: count > 0 }), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, count, typing[id]]);

  // when the keyboard opens or closes, keep the latest message in view
  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 30);
    return () => clearTimeout(t);
  }, [typingNow, area?.height]);

  // while the chat is open, keep it marked as read, so new messages here don't also buzz the phone
  useEffect(() => {
    if (!c) return;
    const t = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') markRead(id);
    }, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!c]);

  // with real golfers, each side sees "typing" as the other writes
  const notifyTyping = useTypingChannel(cloudConvKey(c, ME), (who) => showTyping(id, who));

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
  const title = isGroup ? (game && gameCourseName(game)) ?? 'Game chat' : others[0] ? displayName(others[0]) : 'Chat';
  const blocked = others.length > 0 && others.every((o) => state.blockedIds.includes(o.id));
  const single = !isGroup && others.length === 1 ? others[0] : undefined;
  const typingWho = typing[id];
  // "Seen" goes under my latest message once someone else has read it, until they reply
  const lastMineIndex = msgs.length > 0 && msgs[msgs.length - 1].senderId === ME ? msgs.length - 1 : -1;
  const seen =
    lastMineIndex >= 0 && others.some((o) => (c.lastReadAt[o.id] ?? '') >= msgs[lastMineIndex].createdAt);

  const openPicker = (m: Message) => {
    const v = bubbles.current.get(m.id);
    if (!v || blocked) return;
    haptic.select();
    const mine = m.senderId === ME;
    const prev = msgs[msgs.findIndex((x) => x.id === m.id) - 1];
    const name = isGroup && !mine && (!prev || prev.senderId !== m.senderId) ? state.golfers[m.senderId]?.firstName : undefined;
    v.measureInWindow((x, y, w, h) => {
      noteOpened();
      setPicked({ m, mine, name, x, y, w, h });
    });
  };

  const startReply = (m: Message) => {
    if (blocked) return;
    haptic.select();
    setPicked(null);
    setReplyTo(m);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  /** The quote shown above a reply: who wrote the original and how it began */
  const quoteFor = (m: Message): Quote | undefined => {
    if (!m.replyTo) return undefined;
    const q = state.messages.find((x) => x.id === m.replyTo);
    if (!q) return undefined;
    return { id: q.id, name: q.senderId === ME ? 'You' : state.golfers[q.senderId]?.firstName ?? 'Golfer', text: q.gif ? 'GIF' : q.body, gif: !!q.gif };
  };
  const jumpTo = (msgId: string) => {
    const y = rowY.current.get(msgId);
    if (y === undefined) return;
    haptic.select();
    scroll.current?.scrollTo({ y: Math.max(0, y + space.lg - 120), animated: true });
    setFlash(msgId);
    setTimeout(() => setFlash((f) => (f === msgId ? null : f)), 1400);
  };

  // @mentions: typing @ in a game chat offers the people in it
  const at = isGroup ? /(?:^|\s)@([^\s@]*)$/.exec(text) : null;
  const mentionable = at ? others.filter((o) => o.firstName.toLowerCase().startsWith(at[1].toLowerCase())).slice(0, 6) : [];
  const pickMention = (g: (typeof others)[number]) => {
    haptic.select();
    const next = text.replace(/@([^\s@]*)$/, `@${g.firstName} `);
    setText(next);
    setMentionIds((ids) => (ids.includes(g.id) ? ids : [...ids, g.id]));
    // tapping the name takes focus from the message box: put it back, with the cursor after the name
    setTimeout(() => {
      const box = inputRef.current as unknown as { focus?: () => void; setSelection?: (a: number, b: number) => void; setSelectionRange?: (a: number, b: number) => void } | null;
      box?.focus?.();
      if (box?.setSelectionRange) box.setSelectionRange(next.length, next.length);
      else box?.setSelection?.(next.length, next.length);
    }, 0);
  };
  /** Highlighting for a message's mentions: the names to pick out, and whether you're one of them */
  const mentionInfo = (m: Message) => {
    const names = (m.mentions ?? []).map((g) => state.golfers[g]?.firstName).filter((n): n is string => !!n);
    return { mentionNames: names, mentionsMe: !!m.mentions?.includes(ME) && m.senderId !== ME };
  };

  const send = (body = text) => {
    if (!body.trim()) return;
    haptic.tap();
    // only the mentions still in the message once it's sent
    const mentions = mentionIds.filter((g) => state.golfers[g] && body.includes(`@${state.golfers[g].firstName}`));
    sendMessage(id, body, undefined, mentions.length ? mentions : undefined, replyTo?.id);
    setText('');
    setMentionIds([]);
    setReplyTo(null);
  };

  // one tap replies for the things golfers say most
  const quick = !game
    ? ['Hi! Fancy a game soon?', 'When are you free?', 'Where do you usually play?']
    : game.cancelled
      ? ['No worries, another time', 'Fancy rearranging?']
      : isPast(game)
        ? ['Thanks for the game!', 'Would love to play again', 'Same time next week?']
        : ['See you on the first tee', 'Running 5 mins late', 'Where shall we meet?', 'Buggy or walking?'];

  return (
    <KeyboardAvoidingView
      style={[
        ui.screen,
        // like WhatsApp: the screen shrinks to the space above the keyboard instead of Safari sliding it up
        area && ({ position: 'fixed', top: area.top, left: 0, right: 0, height: area.height, flex: 0 } as object),
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title={title} right={single ? <IconButton icon="ellipsis-horizontal" label="More" onPress={() => setMenu(true)} /> : undefined} />
      {game ? (
        <Pressable onPress={() => router.push(`/game/${game.id}`)} style={({ pressed }) => [s.gameBar, pressed && ui.pressed]}>
          <View style={[ui.contentWidth, s.gameBarInner]}>
            <AvatarStack golfers={others.slice(0, 3)} size={26} />
            <View style={{ flex: 1 }}>
              <T variant="smallStrong" numberOfLines={1}>{isGroup ? others.map((o) => o.firstName).join(', ') + ' and you' : game && gameCourseName(game)}</T>
              <T variant="caption" color={colors.textMuted}>{relativeDay(new Date(game.teeTime))} at {formatTime(new Date(game.teeTime))}{game.cancelled ? '  ·  Cancelled' : ''}</T>
            </View>
            <T variant="smallStrong" color={colors.text}>View game</T>
          </View>
        </Pressable>
      ) : null}

      <ScrollView ref={scroll} style={noSelect} contentContainerStyle={[{ paddingVertical: space.lg }, noSelect]} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded]}>
          {msgs.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: space.xxxl, gap: space.sm }}>
              {others.length > 1 ? <AvatarStack golfers={others.slice(0, 3)} size={56} /> : <Avatar golfer={others[0]} size={64} />}
              <T variant="subheading" style={{ textAlign: 'center' }}>Say hello to {greetNames(others.map((o) => o.firstName))}</T>
              <T variant="small" color={colors.textMuted} style={{ textAlign: 'center' }}>Sort out where to meet, buggies or anything else before the round.</T>
            </View>
          ) : null}
          {msgs.map((m, i) => {
            const mine = m.senderId === ME;
            const prev = msgs[i - 1];
            const d = new Date(m.createdAt);
            const newDay = !prev || dayDiff(d, new Date(prev.createdAt)) !== 0;
            const showName = isGroup && !mine && (newDay || prev?.senderId !== m.senderId);
            // messages in a run from the same golfer sit close together, like WhatsApp
            const run = !newDay && prev?.senderId === m.senderId;
            // a message above with reactions needs room for them to hang below it
            const gap = (i === 0 ? 0 : run ? 2 : 8) + (prev?.reactions ? 16 : 0);
            const quote = quoteFor(m);
            return (
              <View key={m.id} style={{ marginTop: gap }} onLayout={(e) => rowY.current.set(m.id, e.nativeEvent.layout.y)}>
                {newDay ? <T variant="caption" color={colors.textFaint} style={s.day}>{dayDiff(new Date(), d) === 0 ? 'Today' : longDate(d)}</T> : null}
                <View style={[s.bubbleRow, mine && { justifyContent: 'flex-end' }, flash === m.id && s.flash]}>
                  <Holdable
                    ref={(v) => {
                      if (v) bubbles.current.set(m.id, v);
                      else bubbles.current.delete(m.id);
                    }}
                    onHold={() => openPicker(m)}
                    onSwipe={blocked ? undefined : () => startReply(m)}
                    style={s.bubbleWrap}>
                    <Bubble m={m} mine={mine} name={showName ? state.golfers[m.senderId]?.firstName : undefined} quote={quote} onQuote={quote ? () => jumpTo(quote.id) : undefined} {...mentionInfo(m)} />
                    {m.reactions ? <ReactionPill reactions={m.reactions} onPress={() => openPicker(m)} /> : null}
                  </Holdable>
                </View>
                {i === lastMineIndex && seen ? (
                  <T variant="caption" color={colors.textFaint} style={{ alignSelf: 'flex-end', marginTop: m.reactions ? 19 : 3, marginRight: 4 }}>
                    Seen
                  </T>
                ) : null}
              </View>
            );
          })}
          {typingWho ? <TypingBubble name={isGroup ? state.golfers[typingWho]?.firstName : undefined} gap={msgs[msgs.length - 1]?.reactions ? 24 : 8} /> : null}
          {/* room for reactions hanging off the last message */}
          {!typingWho && msgs[msgs.length - 1]?.reactions && !seen ? <View style={{ height: 16 }} /> : null}
        </View>
      </ScrollView>

      <View style={[s.composer, typingNow ? { paddingTop: 6, paddingBottom: 6 } : { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {blocked ? (
          <T variant="small" color={colors.textMuted} style={{ textAlign: 'center', flex: 1 }}>You’ve blocked this golfer. Unblock them from your profile to message.</T>
        ) : (
          <View style={ui.contentWidth}>
            {replyTo ? (
              <View style={s.replyBar}>
                <View style={s.replyLine} />
                <View style={{ flex: 1 }}>
                  <T variant="smallStrong" color={colors.sageDeep} numberOfLines={1}>
                    {replyTo.senderId === ME ? 'Replying to yourself' : `Replying to ${state.golfers[replyTo.senderId]?.firstName ?? 'Golfer'}`}
                  </T>
                  <T variant="small" color={colors.textMuted} numberOfLines={1}>{replyTo.gif ? 'GIF' : replyTo.body}</T>
                </View>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel reply" style={({ pressed }) => [s.replyClose, pressed && ui.pressed]}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null}
            {mentionable.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: space.sm, paddingBottom: space.sm }}>
                {mentionable.map((g) => (
                  <Pressable key={g.id} onPress={() => pickMention(g)} accessibilityRole="button" accessibilityLabel={`Mention ${g.firstName}`} style={({ pressed }) => [s.mentionChip, pressed && ui.pressed]}>
                    <Avatar golfer={g} size={26} />
                    <T variant="smallStrong">{g.firstName}</T>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {/* suggestions make way for the conversation while you're typing */}
            {!text && !typingNow && !replyTo ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm, paddingBottom: space.sm }}>
                {quick.map((q) => (
                  <Pressable key={q} onPress={() => send(q)} style={({ pressed }) => [s.quick, pressed && ui.pressed]} accessibilityRole="button" accessibilityLabel={`Send: ${q}`}>
                    <T variant="smallStrong">{q}</T>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          <View style={s.composerInner}>
            {gifsOn ? (
              <Pressable onPress={() => { haptic.select(); setGifOpen(true); }} accessibilityRole="button" accessibilityLabel="Send a GIF" style={({ pressed }) => [s.gifBtn, typingNow && s.gifBtnCompact, pressed && ui.pressed]}>
                <Text style={s.gifBtnText}>GIF</Text>
              </Pressable>
            ) : null}
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={(v) => {
                setText(v);
                if (v.trim()) notifyTyping();
              }}
              placeholder="Message"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.ink}
              style={[s.input, typingNow && s.inputCompact]}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              multiline
              numberOfLines={1}
              onSubmitEditing={() => send()}
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
            <Pressable onPress={() => send()} disabled={!text.trim()} style={[s.send, typingNow && s.sendCompact, !text.trim() && { opacity: 0.4 }]} accessibilityLabel="Send">
              <Ionicons name="arrow-up" size={22} color={colors.ink} />
            </Pressable>
          </View>
          </View>
        )}
      </View>
      <SafetySheet golfer={single} visible={menu} onClose={() => setMenu(false)} />
      <GifPicker
        visible={gifOpen}
        onClose={() => setGifOpen(false)}
        onPick={(gif) => {
          setGifOpen(false);
          sendMessage(id, 'GIF', gif, undefined, replyTo?.id);
          setReplyTo(null);
        }}
      />
      <ReactionPicker
        picked={picked}
        names={(id) => (id === ME ? 'You' : state.golfers[id]?.firstName ?? 'Golfer')}
        onPick={(emoji) => {
          if (!picked) return;
          haptic.tap();
          react(picked.m.id, emoji);
          setPicked(null);
        }}
        quote={picked ? quoteFor(picked.m) : undefined}
        onReply={() => picked && startReply(picked.m)}
        onCopied={() => {
          setPicked(null);
          toast('Message copied', { icon: 'copy-outline' });
        }}
        onClose={() => setPicked(null)}
      />
    </KeyboardAvoidingView>
  );
}

/** "Mark", "Mark and Kieran", "Mark, Kieran and Jamie" or "Mark, Kieran and 2 others" */
function greetNames(names: string[]) {
  if (names.length === 0) return 'your playing partner';
  if (names.length === 1) return names[0];
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;
}

// the reactions on offer, as in WhatsApp, plus a flag for the golf
const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '⛳'];

// holding a message on the web shouldn't select its text or bring up Safari's own menu
const noSelect = { userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as object;
const HOLD_MS = 350;

// Whether a finger (or mouse button) is down, and when it last came up. The reactions open while the
// thumb is still on the glass; when it lifts, the phone taps whatever is under it, which by then is
// the dimmed backdrop or an emoji. So the reactions only take taps once the thumb has lifted and that
// tap has passed.
let fingerDown = false;
let liftedAt = 0;
// when the thumb that opened the reactions came up (0 while it's still down)
let openingLift = 0;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const down = () => (fingerDown = true);
  const up = () => {
    fingerDown = false;
    liftedAt = Date.now();
    if (!openingLift) openingLift = liftedAt;
  };
  window.addEventListener('touchstart', down, { capture: true, passive: true });
  window.addEventListener('mousedown', down, true);
  ['touchend', 'touchcancel', 'mouseup'].forEach((t) => window.addEventListener(t, up, true));
}
/** Call as the reactions open */
const noteOpened = () => {
  openingLift = fingerDown ? 0 : liftedAt || 1;
};
const fingerSettled = () => Platform.OS !== 'web' || (openingLift > 0 && Date.now() - openingLift > 350);
const canCopy = () => Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.clipboard;

type WebPress = { nativeEvent: { pageX: number; pageY: number; touches?: { pageX: number; pageY: number }[] }; preventDefault: () => void };

// how far a message has to be pulled right before letting go replies to it
const SWIPE_REPLY = 56;

/**
 * Something to hold for a moment, like a message to react to, and pull right to reply to, as in
 * WhatsApp. Native uses its own long press and a pan. On the web this watches the finger (or mouse)
 * directly, as the web press handling inside a scrolling list misses a held finger; moving more than
 * a few pixels is a scroll or a swipe, not a hold. A right click does the same as a hold on a computer.
 */
function Holdable({ onHold, onSwipe, style, children, ref }: { onHold: () => void; onSwipe?: () => void; style: object; children: ReactNode; ref: (v: View | null) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });
  // when a hold last opened the reactions, so the finger lifting or a long press menu straight after is ignored
  const heldAt = useRef(0);
  const justHeld = () => Date.now() - heldAt.current < 1000;
  // the swipe: how far the message has been pulled, and whether it's past the point of replying
  const pullX = useRef(new Animated.Value(0)).current;
  const swiping = useRef(false);
  const armed = useRef(false);
  const onSwipeRef = useRef(onSwipe);
  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);
  const pullTo = (dx: number) => {
    // it follows the finger, then gets heavier past the reply point
    const x = dx <= SWIPE_REPLY ? Math.max(0, dx) : SWIPE_REPLY + (dx - SWIPE_REPLY) * 0.3;
    pullX.setValue(Math.min(x, 90));
    const nowArmed = dx >= SWIPE_REPLY;
    if (nowArmed && !armed.current) haptic.select();
    armed.current = nowArmed;
  };
  const release = () => {
    if (armed.current) onSwipeRef.current?.();
    swiping.current = false;
    armed.current = false;
    Animated.spring(pullX, { toValue: 0, friction: 7, tension: 120, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => !!onSwipeRef.current && g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => pullTo(g.dx),
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    }),
  ).current;
  const a11y = {
    accessibilityHint: onSwipe ? 'Hold to react, swipe right to reply' : 'Hold to react',
    accessibilityActions: [{ name: 'longpress', label: 'React' }, ...(onSwipe ? [{ name: 'activate', label: 'Reply' }] : [])],
    onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => (e.nativeEvent.actionName === 'activate' ? onSwipe?.() : onHold()),
  };
  // the reply arrow fades in behind the message as it's pulled across
  const arrow = onSwipe ? (
    <Animated.View pointerEvents="none" style={[s.swipeArrow, { opacity: pullX.interpolate({ inputRange: [12, SWIPE_REPLY], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: pullX.interpolate({ inputRange: [12, SWIPE_REPLY], outputRange: [0.6, 1], extrapolate: 'clamp' }) }] }]}>
      <Ionicons name="arrow-undo" size={16} color={colors.text} />
    </Animated.View>
  ) : null;
  const moving = <Animated.View style={{ transform: [{ translateX: pullX }] }}>{children}</Animated.View>;
  if (Platform.OS !== 'web') {
    return (
      <Pressable ref={ref} onLongPress={onHold} delayLongPress={HOLD_MS} style={style} {...a11y} {...pan.panHandlers}>
        {arrow}
        {moving}
      </Pressable>
    );
  }
  const point = (e: WebPress) => e.nativeEvent.touches?.[0] ?? e.nativeEvent;
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const down = (e: WebPress) => {
    const p = point(e);
    start.current = { x: p.pageX, y: p.pageY };
    swiping.current = false;
    armed.current = false;
    cancel();
    timer.current = setTimeout(() => {
      timer.current = null;
      heldAt.current = Date.now();
      onHold();
    }, HOLD_MS);
  };
  const move = (e: WebPress) => {
    const p = point(e);
    const dx = p.pageX - start.current.x;
    const dy = p.pageY - start.current.y;
    if (Math.hypot(dx, dy) > 10) cancel();
    // a mostly sideways pull to the right is a swipe to reply; anything else is the chat scrolling
    if (!swiping.current && onSwipe && !justHeld() && dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) swiping.current = true;
    if (swiping.current) pullTo(dx);
  };
  // after a hold, lifting the finger mustn't also tap whatever has opened underneath it
  const up = (e: WebPress) => {
    cancel();
    if (swiping.current) release();
    if (justHeld()) e.preventDefault();
  };
  const handlers = {
    onTouchStart: down,
    onTouchMove: move,
    onTouchEnd: up,
    onTouchCancel: (e: WebPress) => {
      cancel();
      if (swiping.current) release();
      void e;
    },
    onMouseDown: (e: WebPress & { nativeEvent: { button?: number } }) => e.nativeEvent.button === 0 && down(e),
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onContextMenu: (e: WebPress) => {
      e.preventDefault();
      if (!justHeld()) onHold();
    },
  } as object;
  return (
    // pan-y: the browser keeps scrolling the chat up and down, and leaves sideways pulls to us
    <View ref={ref} style={[style, noSelect, { touchAction: 'pan-y' } as object]} {...a11y} {...handlers}>
      {arrow}
      {moving}
    </View>
  );
}

/** The message a reply answers, as shown above it */
interface Quote {
  id: string;
  name: string;
  text: string;
  gif: boolean;
}

interface Picked {
  m: Message;
  mine: boolean;
  name?: string;
  /** where the message sits on screen, so it can be lifted out above the dimmed chat */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A message bubble. The time tucks into the end of the last line when there's room, as in WhatsApp. */
function Bubble({ m, mine, name, quote, onQuote, mentionNames, mentionsMe }: { m: Message; mine: boolean; name?: string; quote?: Quote; onQuote?: () => void; mentionNames?: string[]; mentionsMe?: boolean }) {
  const d = new Date(m.createdAt);
  const quoted = quote ? <QuoteBlock quote={quote} mine={mine} onPress={onQuote} /> : null;
  if (m.gif) {
    // a GIF fills its bubble at its own shape, with the time on a small dark tab in the corner
    const w = Math.min(240, m.gif.width >= m.gif.height ? 240 : (240 * m.gif.width) / m.gif.height);
    const h = Math.min(260, (w * m.gif.height) / m.gif.width);
    return (
      <View style={[s.gifBubble, mine ? s.gifMine : s.gifTheirs]}>
        {name ? <T variant="caption" color={colors.textMuted} style={s.gifName}>{name}</T> : null}
        {quoted ? <View style={{ marginBottom: 4, width: w }}>{quoted}</View> : null}
        <Image source={{ uri: m.gif.url }} style={{ width: w, height: h, borderRadius: 14 }} contentFit="cover" autoplay accessibilityLabel="GIF" />
        <View style={s.gifTime}>
          <Text style={s.gifTimeText}>{formatTime(d)}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[s.bubble, s.bubbleFull, mine ? s.mine : s.theirs, mentionsMe && s.mentionMe]}>
      {name ? <T variant="caption" color={colors.textMuted} style={{ marginBottom: 1 }}>{name}</T> : null}
      {quoted ? <View style={{ marginTop: 2, marginBottom: 5, marginHorizontal: -6 }}>{quoted}</View> : null}
      {/* an invisible copy of the time holds the space, and the real one sits in the corner */}
      <T variant="body" color={mine ? colors.onInk : colors.text}>
        {withMentions(m.body, mentionNames, mine)}
        <Text style={s.timeSpace}>{'   '}{formatTime(d)}</Text>
      </T>
      <T variant="caption" color={mine ? colors.onInkMuted : colors.textFaint} style={s.time}>{formatTime(d)}</T>
    </View>
  );
}

/** The quoted message inside a reply: who wrote it and how it began. Tapping it jumps back to it. */
function QuoteBlock({ quote, mine, onPress }: { quote: Quote; mine: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" accessibilityLabel={`Reply to ${quote.name}: ${quote.text}. Tap to see it`} style={({ pressed }) => [s.quote, mine ? s.quoteMine : s.quoteTheirs, pressed && ui.pressed]}>
      <View style={[s.quoteLine, { backgroundColor: mine ? colors.accent : colors.sage }]} />
      <View style={{ flexShrink: 1, paddingVertical: 5, paddingRight: 10 }}>
        <T variant="smallStrong" color={mine ? colors.accent : colors.sageDeep} numberOfLines={1}>{quote.name}</T>
        <T variant="small" color={mine ? colors.onInkMuted : colors.textMuted} numberOfLines={2}>
          {quote.gif ? '🎞️ GIF' : quote.text}
        </T>
      </View>
    </Pressable>
  );
}

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The message text with each @mention picked out in bold sage */
function withMentions(body: string, names: string[] | undefined, mine: boolean): ReactNode {
  if (!names?.length) return body;
  const re = new RegExp(`(@(?:${names.map(escapeRe).join('|')}))`, 'g');
  return body.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={[s.mention, { color: mine ? colors.accent : colors.sageDeep }]}>{part}</Text>
    ) : (
      part
    ),
  );
}

/** The reactions on a message, hanging off its bottom left corner clear of the time: each emoji once, and a count past one */
function ReactionPill({ reactions, onPress }: { reactions: Record<string, string>; onPress?: () => void }) {
  const all = Object.values(reactions);
  const unique = [...new Set(all)].slice(0, 3);
  const label = `Reactions: ${all.join(' ')}`;
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label} style={s.pill}>
      <Text style={s.pillEmoji}>{unique.join('')}</Text>
      {all.length > 1 ? <T variant="caption" color={colors.textMuted} style={{ marginLeft: 3 }}>{all.length}</T> : null}
    </Pressable>
  );
}

/**
 * Hold a message to react: the chat dims, the message lifts out, and a row of emoji appears above
 * it. Picking one adds it or swaps yours for it; picking yours again takes it off. Below, who has
 * reacted with what.
 */
function ReactionPicker({ picked, names, quote, onPick, onReply, onCopied, onClose }: { picked: Picked | null; names: (id: string) => string; quote?: Quote; onPick: (emoji: string | null) => void; onReply: () => void; onCopied: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (!picked) return;
    scale.setValue(0.6);
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 160, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [picked, scale]);
  if (!picked) return null;

  // the thumb that opened this is still down; lifting it mustn't tap whatever is now underneath
  const press = (fn: () => void) => () => {
    if (fingerSettled()) fn();
  };
  const { m, mine, x, y, w, h } = picked;
  const copy = canCopy()
    ? () => {
        (navigator as Navigator).clipboard.writeText(m.body).catch(() => {});
        onCopied();
      }
    : undefined;
  const screen = Dimensions.get('window');
  const mineNow = m.reactions?.[ME];
  const others = Object.entries(m.reactions ?? {});
  const barW = EMOJIS.length * 42 + 12;
  // the row sits above the message, or below it when the message is near the top
  const above = y - 64 > insets.top + 8;
  const barTop = above ? y - 60 : y + h + 10;
  const barLeft = Math.min(Math.max(12, mine ? x + w - barW : x), screen.width - barW - 12);
  const listTop = above ? y + h + (m.reactions ? 26 : 12) : barTop + 60;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={press(onClose)} accessibilityLabel="Close" style={[s.dim, noSelect]} />
      <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: w }}>
        <Bubble m={m} mine={mine} name={picked.name} quote={quote} />
        {m.reactions ? <ReactionPill reactions={m.reactions} /> : null}
      </View>
      <Animated.View style={[s.bar, { top: barTop, left: barLeft, width: barW, transform: [{ scale }] }]}>
        {EMOJIS.map((e) => (
          <Pressable
            key={e}
            onPress={press(() => onPick(e === mineNow ? null : e))}
            accessibilityRole="button"
            accessibilityState={{ selected: e === mineNow }}
            accessibilityLabel={e === mineNow ? `Remove ${e}` : `React ${e}`}
            style={({ pressed }) => [s.emojiBtn, e === mineNow && s.emojiOn, pressed && { transform: [{ scale: 1.2 }] }]}>
            <Text style={s.emoji}>{e}</Text>
          </Pressable>
        ))}
      </Animated.View>
      <View style={[s.who, noSelect, { top: listTop }, mine ? { right: Math.max(12, screen.width - x - w) } : { left: Math.max(12, x) }]}>
        {others.map(([id, e]) => (
          <Pressable key={id} disabled={id !== ME} onPress={press(() => onPick(null))} accessibilityRole={id === ME ? 'button' : undefined} style={s.whoRow}>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" numberOfLines={1}>{names(id)}</T>
              {id === ME ? <T variant="caption" color={colors.textMuted}>Tap to remove</T> : null}
            </View>
            <Text style={s.emoji}>{e}</Text>
          </Pressable>
        ))}
        <Pressable onPress={press(onReply)} accessibilityRole="button" style={({ pressed }) => [s.whoRow, others.length > 0 && s.menuDivider, pressed && ui.pressed]}>
          <T variant="bodyStrong" style={{ flex: 1 }}>Reply</T>
          <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
        </Pressable>
        {copy ? (
          <Pressable onPress={press(copy)} accessibilityRole="button" style={({ pressed }) => [s.whoRow, s.menuDivider, pressed && ui.pressed]}>
            <T variant="bodyStrong" style={{ flex: 1 }}>Copy</T>
            <Ionicons name="copy-outline" size={20} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

/** Three softly pulsing dots while the other golfer is typing */
function TypingBubble({ name, gap }: { name?: string; gap: number }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: false }),
          Animated.timing(v, { toValue: 0.3, duration: 320, useNativeDriver: false }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);
  return (
    <View style={[s.bubbleRow, { marginTop: gap }]} accessibilityLiveRegion="polite" accessibilityLabel={`${name ?? 'They'} ${name ? 'is' : 'are'} typing`}>
      <View style={[s.bubble, s.theirs, { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 14 }]}>
        {name ? <T variant="caption" color={colors.textMuted} style={{ marginRight: 4 }}>{name}</T> : null}
        {dots.map((v, i) => (
          <Animated.View key={i} style={[s.dot, { opacity: v }]} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
  gameBar: { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: space.xl, paddingVertical: space.md },
  gameBarInner: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  day: { textAlign: 'center', marginVertical: space.md },
  bubbleRow: { flexDirection: 'row' },
  bubbleWrap: { maxWidth: '82%' },
  mention: { fontFamily: fonts.bold },
  // the original message, briefly lit up after jumping to it from a reply
  flash: { backgroundColor: colors.accentSoft, marginHorizontal: -space.xl, paddingHorizontal: space.xl, paddingVertical: 4, marginVertical: -4 },
  swipeArrow: { position: 'absolute', left: -2, top: '50%', marginTop: -15, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline },
  quote: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', minWidth: 140 },
  quoteMine: { backgroundColor: 'rgba(255,255,255,0.10)' },
  quoteTheirs: { backgroundColor: 'rgba(15,26,20,0.05)' },
  quoteLine: { width: 4, marginRight: 8 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm, paddingRight: 6, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, overflow: 'hidden', ...shadowSoft },
  replyLine: { width: 4, alignSelf: 'stretch', backgroundColor: colors.sage, marginRight: 4 },
  replyClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  // a message that mentions you stands out from the rest
  mentionMe: { backgroundColor: colors.accentSoft, borderColor: colors.sage, borderWidth: 1.5 },
  mentionChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 5, paddingRight: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  gifBubble: { padding: 4, borderRadius: 18 },
  gifMine: { backgroundColor: colors.ink, borderBottomRightRadius: 6 },
  gifTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: hairline },
  gifName: { marginLeft: 8, marginTop: 2, marginBottom: 4 },
  gifTime: { position: 'absolute', right: 12, bottom: 12, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(15,26,20,0.6)' },
  gifTimeText: { fontFamily: fonts.medium, fontSize: 11, color: colors.onInk },
  gifBtn: { height: 44, minWidth: 48, paddingHorizontal: 10, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline },
  gifBtnCompact: { height: 40 },
  gifBtnText: { fontFamily: fonts.extrabold, fontSize: 13, letterSpacing: 0.5, color: colors.text },
  // the wrapper keeps it to 82% of the row
  bubbleFull: { maxWidth: '100%' },
  pill: { position: 'absolute', bottom: -20, left: 10, flexDirection: 'row', alignItems: 'center', height: 26, paddingHorizontal: 7, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  pillEmoji: { fontSize: 14, lineHeight: 18 },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,26,20,0.45)' },
  bar: { position: 'absolute', height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderRadius: 25, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, shadowColor: '#0F1A14', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  emojiBtn: { width: 42, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emojiOn: { backgroundColor: colors.mist },
  emoji: { fontSize: 24, lineHeight: 30 },
  who: { position: 'absolute', minWidth: 200, maxWidth: 280, paddingVertical: space.xs, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  menuDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 18 },
  time: { position: 'absolute', right: 12, bottom: 6, fontSize: 11 },
  // holds the time's space on the last line; invisible, slightly wider than the time itself
  timeSpace: { fontSize: 11, color: 'transparent' },
  mine: { backgroundColor: colors.ink, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingHorizontal: space.xl, paddingTop: space.sm, backgroundColor: colors.bg, flexDirection: 'row' },
  quick: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  composerInner: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: hairline, ...shadowSoft, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  inputCompact: { minHeight: 40, paddingTop: 9, paddingBottom: 9 },
  sendCompact: { width: 40, height: 40, borderRadius: 20 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
