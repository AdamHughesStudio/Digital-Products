import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { GameCard } from '@/components/cards';
import { InviteToGameSheet } from '@/components/invite';
import { GameRow, ProfileHeader } from '@/components/profile';
import { SafetySheet } from '@/components/safety';
import { Button, EmptyState, IconButton, Row, Screen, SectionHeader, T, TopBar, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { acceptedFor, directChatId, isFull, isPast, ME, useStore } from '@/data/store';

export default function GolferProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, me, toggleSaved, openDirect } = useStore();
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
  const saved = state.savedGolferIds.includes(g.id);
  const inGame = (gameId: string, who: string) => state.games[gameId]?.hostId === who || acceptedFor(state, gameId).some((r) => r.golferId === who);
  const together = Object.values(state.games).filter((x) => !x.cancelled && inGame(x.id, ME) && inGame(x.id, g.id));
  const pastTogether = together.filter(isPast);
  const theirOpen = Object.values(state.games)
    .filter((x) => x.hostId === g.id && !x.cancelled && !isPast(x) && !isFull(state, x))
    .sort((a, b) => a.teeTime.localeCompare(b.teeTime));
  // messaging needs a reason: a shared game, an invite or request between us, or an existing chat
  const linked =
    together.length > 0 ||
    !!state.conversations[directChatId(ME, g.id)] ||
    Object.values(state.requests).some((r) => {
      const game = state.games[r.gameId];
      if (!game || r.status === 'withdrawn') return false;
      return (r.golferId === ME && game.hostId === g.id) || (r.golferId === g.id && game.hostId === ME);
    });

  return (
    <View style={ui.screen}>
      <TopBar right={<IconButton icon="ellipsis-horizontal" label="More" onPress={() => setMenu(true)} />} />
      <Screen
        footer={
          blocked ? (
            <Button title="You’ve blocked this golfer" disabled />
          ) : (
            <Row gap={space.sm}>
              <Button title={saved ? 'Saved' : 'Save'} kind={saved ? 'secondary' : 'ghost'} icon={saved ? 'star' : 'star-outline'} onPress={() => toggleSaved(g.id)} style={{ flex: 1 }} />
              {linked ? (
                <Button title="Message" kind="ghost" icon="chatbubble-outline" onPress={() => router.push(`/chat/${openDirect(g.id)}`)} style={{ flex: 1 }} />
              ) : null}
              <Button title="Invite" icon="person-add" onPress={() => setInviteOpen(true)} style={{ flex: 1.2 }} />
            </Row>
          )
        }>
        <ProfileHeader golfer={g} />
        {!linked && !blocked ? (
          <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.lg }}>
            Messaging opens once you’ve requested a game, sent an invite or played together.
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
            {pastTogether.map((x) => (
              <GameRow key={x.id} game={x} />
            ))}
          </>
        ) : null}
      </Screen>
      <SafetySheet golfer={g} visible={menu} onClose={() => setMenu(false)} />
      <InviteToGameSheet golfer={g} visible={inviteOpen} onClose={() => setInviteOpen(false)} />
    </View>
  );
}
