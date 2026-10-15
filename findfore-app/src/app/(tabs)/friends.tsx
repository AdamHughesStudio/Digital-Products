import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendButton } from '@/components/friend-button';
import { useToast } from '@/components/toast';
import { Avatar, Button, EmptyState, Row, T, styles as ui } from '@/components/ui';
import { colors, fonts, hairline, radius, shadowSoft, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { acceptFriendRequest, declineFriendRequest, friendStatus, playedTogether, playedWithNotFriends, useFriends } from '@/data/friends';
import { ME, useStore } from '@/data/store';
import type { Golfer } from '@/data/types';
import { distanceMiles, handicapLabel, NO_HANDICAP } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { shareMyProfile } from '@/lib/invite';

/** "today", "yesterday", "3 days ago", "2 weeks ago", "4 months ago" */
function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  const m = Math.floor(days / 30);
  return `${m} month${m === 1 ? '' : 's'} ago`;
}

const hcp = (g: Golfer) => (g.handicap >= NO_HANDICAP ? 'New to golf' : `${handicapLabel(g.handicap)} hcp`);
const shortClub = (name?: string) => name?.replace(/ Golf (Club|Course|Links)$/, '').replace(/ Golfing Society$/, '');

export default function Friends() {
  const insets = useSafeAreaInsets();
  const { state, me, openDirect } = useStore();
  const friends = useFriends();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const invite = async () => {
    if (!me) return;
    if ((await shareMyProfile(me)) === 'copied') toast('Your profile link is copied. Paste it to your golf friends.', { icon: 'link' });
  };

  // the preview accepts requests after a moment: say so when it happens
  const prevOutgoing = useRef(friends.outgoing);
  useEffect(() => {
    prevOutgoing.current
      .filter((id) => !friends.outgoing.includes(id) && friends.friends.includes(id))
      .forEach((id) => {
        const g = state.golfers[id];
        if (g) toast(`${g.firstName} accepted your friend request`, { icon: 'people' });
      });
    prevOutgoing.current = friends.outgoing;
  }, [friends, state.golfers, toast]);

  const list = useMemo(() => {
    const live = (id: string) => !!state.golfers[id] && !state.blockedIds.includes(id) && id !== ME;
    const mine = friends.friends
      .filter(live)
      .map((id) => ({ g: state.golfers[id], played: playedTogether(state, id) }))
      .sort((a, b) => (b.played.lastAt ?? '').localeCompare(a.played.lastAt ?? '') || b.played.count - a.played.count);
    const playedWith = playedWithNotFriends(state, friends).map((id) => state.golfers[id]);
    const shown = new Set([...friends.friends, ...friends.incoming.map((r) => r.golferId), ...playedWith.map((g) => g.id)]);
    const near = me
      ? Object.values(state.golfers)
          .filter((g) => live(g.id) && !shown.has(g.id))
          .map((g) => ({ g, miles: distanceMiles(g.location, me.location) }))
          .sort((a, b) => a.miles - b.miles)
          .slice(0, 3)
      : [];
    return { mine, playedWith, near, requests: friends.incoming.filter((r) => live(r.golferId)) };
  }, [state, friends, me]);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return Object.values(state.golfers)
      .filter((g) => g.id !== ME && !state.blockedIds.includes(g.id))
      .filter((g) => {
        const text = [g.firstName, g.lastName, `@${g.username}`, g.username, g.homeClub, g.location.name].join(' ').toLowerCase();
        return words.every((w) => text.includes(w));
      });
  }, [query, state]);

  if (!me) return null;

  const playedLine = (id: string) => {
    const p = playedTogether(state, id);
    if (p.count === 0) return 'Not played together yet';
    const where = p.lastCourseId ? shortClub(courseById(p.lastCourseId)?.name) : undefined;
    const times = p.count === 1 ? 'Played once' : `Played ${p.count} rounds`;
    return `${times}${where ? ` · last at ${where}` : ''}${p.lastAt ? `, ${ago(p.lastAt)}` : ''}`;
  };

  const message = (g: Golfer) => router.push(`/chat/${openDirect(g.id)}`);

  return (
    <View style={[ui.screen, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded]}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <T variant="title" accessibilityRole="header">Friends</T>
              <T variant="small" color={colors.textMuted}>
                {list.mine.length} friend{list.mine.length === 1 ? '' : 's'}
                {list.requests.length ? ` · ${list.requests.length} request${list.requests.length === 1 ? '' : 's'}` : ''}
              </T>
            </View>
            <Pressable onPress={invite} accessibilityRole="button" accessibilityLabel="Invite friends to FindFore" style={({ pressed }) => [s.invite, pressed && ui.pressed]}>
              <Ionicons name="person-add-outline" size={16} color={colors.ink} />
              <T variant="smallStrong">Invite</T>
            </Pressable>
          </Row>

          <View style={s.search}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by @username, name or club"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Find golfers by name or club"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              enterKeyHint="search"
              style={s.searchInput}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={20} color={colors.textFaint} />
              </Pressable>
            ) : null}
          </View>

          {query.trim() ? (
            results.length === 0 ? (
              <EmptyState icon="search-outline" title={`No golfers match “${query.trim()}”`} body="Try a first name, a surname or a home club." action="Clear search" onAction={() => setQuery('')} />
            ) : (
              <>
                <Heading title="Golfers" />
                <View style={ui.panel}>
                  {results.map((g, i) => (
                    <PersonRow key={g.id} golfer={g} line={`${hcp(g)}${g.homeClub ? ` · ${shortClub(g.homeClub)}` : ''}`} sub={friendStatus(friends, g.id) === 'friend' ? playedLine(g.id) : `${hcp(g)}${g.homeClub ? ` · ${shortClub(g.homeClub)}` : ''}`} divider={i > 0} right={<FriendButton golfer={g} compact />} />
                  ))}
                </View>
              </>
            )
          ) : (
            <>
              {list.requests.length > 0 ? (
                <>
                  <Heading title="Friend requests" count={list.requests.length} />
                  {list.requests.map((r) => {
                    const g = state.golfers[r.golferId];
                    return (
                      <View key={r.golferId} style={s.request}>
                        <Pressable onPress={() => router.push(`/golfer/${g.id}`)} accessibilityRole="button" accessibilityLabel={`${g.firstName} ${g.lastName}, view profile`}>
                          <Row gap={space.md} align="flex-start">
                            <Avatar golfer={g} size={52} />
                            <View style={{ flex: 1 }}>
                              <T variant="subheading">{g.firstName} {g.lastName}</T>
                              <T variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>{playedLine(g.id)}</T>
                            </View>
                          </Row>
                        </Pressable>
                        {r.note ? <T variant="body" style={s.note}>“{r.note}”</T> : null}
                        <Row gap={space.sm} style={{ marginTop: space.md }}>
                          <Button title="Accept" icon="checkmark" size="md" style={{ flex: 1 }} onPress={() => { acceptFriendRequest(g.id); haptic.success(); toast(`You and ${g.firstName} are now friends`, { icon: 'people' }); }} />
                          <Button title="Decline" kind="ghost" size="md" style={{ flex: 1 }} onPress={() => { declineFriendRequest(g.id); toast('Request declined', { icon: 'close-circle-outline' }); }} />
                        </Row>
                      </View>
                    );
                  })}
                </>
              ) : null}

              <Heading title="Your friends" count={list.mine.length} />
              {list.mine.length === 0 ? (
                <T variant="body" color={colors.textMuted}>Add the golfers you’ve played with and they’ll appear here, ready to message or invite to your next round.</T>
              ) : (
                <View style={ui.panel}>
                  {list.mine.map(({ g }, i) => (
                    <PersonRow
                      key={g.id}
                      golfer={g}
                      line={`${hcp(g)}${g.homeClub ? ` · ${shortClub(g.homeClub)}` : ''}`}
                      sub={playedLine(g.id)}
                      divider={i > 0}
                      right={
                        <Pressable onPress={() => message(g)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Message ${g.firstName}`} style={({ pressed }) => [s.chat, pressed && ui.pressed]}>
                          <Ionicons name="chatbubble-outline" size={18} color={colors.ink} />
                        </Pressable>
                      }
                    />
                  ))}
                </View>
              )}

              {friends.outgoing.filter((id) => state.golfers[id]).length > 0 ? (
                <>
                  <Heading title="Waiting for a reply" />
                  <View style={ui.panel}>
                    {friends.outgoing.filter((id) => state.golfers[id]).map((id, i) => {
                      const g = state.golfers[id];
                      return <PersonRow key={id} golfer={g} line={`${hcp(g)}${g.homeClub ? ` · ${shortClub(g.homeClub)}` : ''}`} sub="Request sent" divider={i > 0} right={<FriendButton golfer={g} compact />} />;
                    })}
                  </View>
                </>
              ) : null}

              {list.playedWith.filter((g) => friendStatus(friends, g.id) === 'none').length > 0 ? (
                <>
                  <Heading title="You’ve played with" />
                  <View style={ui.panel}>
                    {list.playedWith
                      .filter((g) => friendStatus(friends, g.id) === 'none')
                      .map((g, i) => (
                        <PersonRow key={g.id} golfer={g} line={`${hcp(g)}${g.homeClub ? ` · ${shortClub(g.homeClub)}` : ''}`} sub={playedLine(g.id)} divider={i > 0} right={<FriendButton golfer={g} compact />} />
                      ))}
                  </View>
                </>
              ) : null}

              {list.near.length > 0 ? (
                <>
                  <Heading title={`Golfers near ${me.location.name}`} />
                  <View style={ui.panel}>
                    {list.near.map(({ g, miles }, i) => (
                      <PersonRow key={g.id} golfer={g} line={`${hcp(g)}${g.homeClub ? ` · ${shortClub(g.homeClub)}` : ''}`} sub={`${hcp(g)} · ${Math.max(1, Math.round(miles))} mi away`} divider={i > 0} right={<FriendButton golfer={g} compact />} />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Heading({ title, count, detail }: { title: string; count?: number; detail?: string }) {
  return (
    <View style={{ marginTop: space.xl, marginBottom: space.md }}>
      <Row gap={8}>
        <T variant="heading" accessibilityRole="header">{title}</T>
        {count ? (
          <View style={s.count}>
            <T variant="caption" color={colors.white} style={{ fontFamily: fonts.extrabold }}>{count}</T>
          </View>
        ) : null}
      </Row>
      {detail ? <T variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>{detail}</T> : null}
    </View>
  );
}

function PersonRow({ golfer, line, sub, right, divider }: { golfer: Golfer; line: string; sub: string; right?: React.ReactNode; divider?: boolean }) {
  return (
    <Row gap={space.md} style={[ui.panelRow, divider && ui.panelDivider]}>
      <Pressable onPress={() => router.push(`/golfer/${golfer.id}`)} accessibilityRole="button" accessibilityLabel={`${golfer.firstName} ${golfer.lastName}. ${line}. ${sub}`} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }, pressed && ui.pressed]}>
        <Avatar golfer={golfer} size={48} />
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong" numberOfLines={1}>{golfer.firstName} {golfer.lastName} <T variant="small" color={colors.textMuted}>@{golfer.username}</T></T>
          <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>{sub}</T>
        </View>
      </Pressable>
      {right}
    </Row>
  );
}

const s = StyleSheet.create({
  invite: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.lime },
  search: { marginTop: space.lg, height: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, ...shadowSoft },
  // 16px keeps iPhone Safari from zooming the page when the field is focused
  searchInput: { flex: 1, minWidth: 0, width: '100%', height: '100%', fontFamily: fonts.medium, fontSize: 16, color: colors.text, outlineStyle: 'none' } as object,
  request: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: hairline, padding: space.lg, marginBottom: space.md, ...shadowSoft },
  note: { marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.mist },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  chat: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
});
