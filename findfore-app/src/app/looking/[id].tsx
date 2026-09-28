import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameCard } from '@/components/cards';
import { InviteToGameSheet } from '@/components/invite';
import { SafetySheet } from '@/components/safety';
import { Avatar, Button, EmptyState, IconButton, Row, Screen, SectionHeader, T, TopBar, styles as ui, type IconName } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { gameMatchesLooking, ME, useStore } from '@/data/store';
import { displayName, distanceMiles, fromIsoDate, handicapLabel, milesLabel, plural, shortDate, relativeDay, timeAgo, timeOfDayLabels } from '@/lib/format';

export default function LookingDetail() {
  const { id, posted } = useLocalSearchParams<{ id: string; posted?: string }>();
  const { state, me, closeLooking, openDirect } = useStore();
  const [menu, setMenu] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const l = state.looking[id];
  if (!l || !me) {
    return (
      <View style={ui.screen}>
        <TopBar />
        <EmptyState icon="search-outline" title="Post not found" body="This golfer may have found a game already." />
      </View>
    );
  }
  const g = state.golfers[l.golferId];
  const isMine = l.golferId === ME;
  const matches = Object.values(state.games)
    .filter((x) => x.hostId !== ME && !state.blockedIds.includes(x.hostId) && gameMatchesLooking(state, x, l))
    .sort((a, b) => a.teeTime.localeCompare(b.teeTime));

  const message = () => {
    const chat = openDirect(g.id);
    router.push(`/chat/${chat}`);
  };

  return (
    <View style={ui.screen}>
      <TopBar title={isMine ? 'Your availability' : 'Looking for a game'} right={!isMine ? <IconButton icon="ellipsis-horizontal" label="More" onPress={() => setMenu(true)} /> : undefined} />
      <Screen
        footer={
          isMine ? (
            l.closed ? <Button title="Post new availability" onPress={() => router.replace('/post/looking')} /> : <Button title="I’ve found a game" kind="ghost" icon="checkmark" onPress={() => closeLooking(l.id)} />
          ) : (
            <Row gap={space.sm}>
              <Button title="Message" kind="ghost" icon="chatbubble-outline" onPress={message} style={{ flex: 1 }} />
              <Button title="Invite to a game" icon="person-add" onPress={() => setInviteOpen(true)} style={{ flex: 1.4 }} />
            </Row>
          )
        }>
        {posted ? (
          <View style={s.posted}>
            <Ionicons name="checkmark-circle" size={22} color={colors.ink} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" color={colors.ink}>You’re visible to golfers nearby</T>
              <T variant="small" color={colors.ink}>We’ll notify you when a game matches or a host invites you.</T>
            </View>
          </View>
        ) : null}
        {l.closed ? (
          <View style={[s.posted, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="checkmark-done" size={22} color={colors.text} />
            <T variant="bodyStrong" style={{ flex: 1 }}>This post is closed</T>
          </View>
        ) : null}

        <Pressable onPress={() => router.push(isMine ? '/profile' : `/golfer/${g.id}`)} style={({ pressed }) => [s.person, pressed && ui.pressed]}>
          <Avatar golfer={g} size={72} ring />
          <View style={{ flex: 1 }}>
            <T variant="heading">{isMine ? 'You' : displayName(g)}</T>
            <T variant="small" color={colors.textMuted}>{handicapLabel(g.handicap)} HCP  ·  {plural(g.gamesPlayed, 'game')}  ·  {g.rating.toFixed(1)} rating</T>
            <T variant="caption" color={colors.textFaint} style={{ marginTop: 2 }}>Posted {timeAgo(l.createdAt).toLowerCase()}</T>
          </View>
        </Pressable>

        {l.message ? <T variant="body" style={{ marginTop: space.lg }}>{l.message}</T> : null}

        <View style={{ gap: space.sm, marginTop: space.xl }}>
          <Line icon="calendar" text={l.dates.map((d) => dateText(fromIsoDate(d))).join(', ')} />
          <Line icon="time" text={timeOfDayLabels[l.timeOfDay]} />
          <Line icon="navigate" text={`Within ${l.radiusMiles} miles of ${l.location.name}${isMine ? '' : `  ·  ${milesLabel(distanceMiles(l.location, me.location))} from you`}`} />
          {l.budget !== undefined ? <Line icon="cash" text={`Budget up to £${l.budget}`} /> : null}
        </View>

        {isMine && !l.closed ? (
          <>
            <SectionHeader title="Games that match" />
            {matches.length === 0 ? (
              <T variant="body" color={colors.textMuted}>Nothing matches yet. We’ll let you know as soon as a game comes up.</T>
            ) : (
              matches.map((x) => <GameCard key={x.id} game={x} compact />)
            )}
          </>
        ) : null}
      </Screen>

      <SafetySheet golfer={g} visible={menu} onClose={() => setMenu(false)} />
      <InviteToGameSheet golfer={g} visible={inviteOpen} onClose={() => setInviteOpen(false)} />
    </View>
  );
}

function dateText(d: Date) {
  const r = relativeDay(d);
  return r === 'Today' || r === 'Tomorrow' ? `${r}, ${shortDate(d)}` : shortDate(d);
}

function Line({ icon, text }: { icon: IconName; text: string }) {
  return (
    <Row gap={space.md} style={s.line}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <T variant="bodyStrong" style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

const s = StyleSheet.create({
  posted: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', backgroundColor: colors.lime, padding: space.lg, borderRadius: radius.panel, marginTop: space.md },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.xl },
  line: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md },
});
