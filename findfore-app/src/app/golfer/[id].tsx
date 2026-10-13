import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GameCard } from '@/components/cards';
import { FriendButton } from '@/components/friend-button';
import { InviteToGameSheet } from '@/components/invite';
import { GameRow, ProfileHeader } from '@/components/profile';
import { SafetySheet } from '@/components/safety';
import { Button, EmptyState, IconButton, Row, Screen, SectionHeader, T, TopBar, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { friendStatus, useFriends } from '@/data/friends';
import { acceptedFor, directChatId, isFull, isPast, ME, useStore } from '@/data/store';

export default function GolferProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, me, openDirect } = useStore();
  const friends = useFriends();
  const [menu, setMenu] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const g = state.golfers[id];
  if (!g || !me) {
    return (
      <View style={ui.screen}>
        <TopBar />
        <EmptyState icon="person-outline" title="Golfer not found" body="This profile is no longer available." />
      </View>
    );
  }
  if (id === ME) {
    router.replace('/profile');
    return null;
  }

  const blocked = state.blockedIds.includes(g.id);
  const isFriend = friendStatus(friends, g.id) === 'friend';
  const inGame = (gameId: string, who: string) => state.games[gameId]?.hostId === who || acceptedFor(state, gameId).some((r) => r.golferId === who);
  const together = Object.values(state.games).filter((x) => !x.cancelled && inGame(x.id, ME) && inGame(x.id, g.id));
  const pastTogether = together.filter(isPast);
  const theirOpen = Object.values(state.games)
    .filter((x) => x.hostId === g.id && !x.cancelled && !isPast(x) && !isFull(state, x))
    .sort((a, b) => a.teeTime.localeCompare(b.teeTime));
  return (
    <View style={ui.screen}>
      <TopBar right={<IconButton icon="ellipsis-horizontal" label="More" onPress={() => setMenu(true)} />} />
      <Screen
        footer={
          blocked ? (
            <Button title="You’ve blocked this golfer" disabled />
          ) : isFriend ? (
            <Row gap={space.sm}>
              <FriendButton golfer={g} iconOnly />
              <Button title="Message" kind="ghost" icon="chatbubble-outline" onPress={() => router.push(`/chat/${openDirect(g.id)}`)} style={{ flex: 1 }} />
              <Button title="Invite" icon="calendar-outline" onPress={() => setInviteOpen(true)} style={{ flex: 1 }} />
            </Row>
          ) : (
            <FriendButton golfer={g} size="lg" />
          )
        }>
        <ProfileHeader golfer={g} />
        {!isFriend && !blocked ? (
          <T variant="caption" color={colors.textFaint} style={{ marginTop: space.md }}>
            Add {g.firstName} as a friend to message them or invite them to a game.
          </T>
        ) : null}

        {theirOpen.length > 0 ? (
          <>
            <SectionHeader title={`${g.firstName}’s games`} />
            {theirOpen.map((x) => (
              <GameCard key={x.id} game={x} compact />
            ))}
          </>
        ) : null}

        {pastTogether.length > 0 ? (
          <>
            <SectionHeader title="Played together" />
            <View style={ui.panel}>
              {pastTogether.map((x, i) => (
                <View key={x.id} style={i > 0 ? ui.panelDivider : undefined}>
                  <GameRow game={x} />
                </View>
              ))}
            </View>
          </>
        ) : null}
      </Screen>
      <SafetySheet golfer={g} visible={menu} onClose={() => setMenu(false)} />
      <InviteToGameSheet golfer={g} visible={inviteOpen} onClose={() => setInviteOpen(false)} />
    </View>
  );
}

const s = StyleSheet.create({
});
