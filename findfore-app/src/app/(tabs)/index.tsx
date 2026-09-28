import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard, LookingCard } from '@/components/cards';
import { Chip, EmptyState, IconButton, Row, SectionHeader, T, styles as ui } from '@/components/ui';
import { UpNext } from '@/components/up-next';
import { colors, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import { applyFilters, buildFeed, type Kind } from '@/lib/selectors';

const KINDS: { key: Kind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'games', label: 'Looking for players' },
  { key: 'golfers', label: 'Golfers free to play' },
  { key: 'member_guest', label: 'Member guest' },
  { key: 'competition', label: 'Competitions' },
];

export default function Discover() {
  const insets = useSafeAreaInsets();
  const { state, me } = useStore();
  const [kind, setKind] = useState<Kind>('all');
  const unread = state.notifications.some((n) => !n.read);

  const { nearby, further } = useMemo(() => {
    if (!me) return { nearby: [], further: [] };
    const all = buildFeed(state, me);
    const base = { query: '', kind, maxMiles: 10000, date: 'any' as const, time: 'any' as const, minSpaces: 1, fitsHandicap: false };
    const filtered = applyFilters(all, base, me, state);
    return {
      nearby: filtered.filter((i) => i.miles <= me.radiusMiles),
      further: filtered.filter((i) => i.miles > me.radiusMiles).sort((a, b) => a.miles - b.miles).slice(0, 4),
    };
  }, [state, me, kind]);

  if (!me) return null;

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        <View style={[ui.contentWidth, ui.padded]}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Image source={require('@/assets/images/logo-light.png')} style={styles.logo} contentFit="contain" accessibilityLabel="FindFore" />
            <Row gap={10}>
              <IconButton icon="search" label="Search" onPress={() => router.push('/search')} />
              <IconButton icon="notifications-outline" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />
            </Row>
          </Row>
          <T variant="title" style={{ marginTop: space.xl }}>Hi {me.firstName}, fancy a game?</T>
          <T variant="body" color={colors.textMuted} style={{ marginTop: 2 }}>
            Games and golfers within {me.radiusMiles} miles of {me.location.name}
          </T>
        </View>

        <View style={styles.sticky}>
          <View style={[ui.contentWidth, { paddingLeft: space.lg }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
              {KINDS.map((k) => (
                <Chip key={k.key} label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} />
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={[ui.contentWidth, ui.padded]}>
          <UpNext />

          <SectionHeader title="Near you" />
          {nearby.length === 0 ? (
            <EmptyState
              icon="golf-outline"
              title="Nothing nearby yet"
              body="Be the first. Post a game you want players for, or let golfers know you are free to play."
              action="Post something"
              onAction={() => router.push('/post')}
            />
          ) : (
            nearby.map((it) => (it.kind === 'game' ? <GameCard key={it.game.id} game={it.game} /> : <LookingCard key={it.post.id} post={it.post} />))
          )}

          {further.length > 0 ? (
            <>
              <SectionHeader title="Further afield" />
              {further.map((it) => (it.kind === 'game' ? <GameCard key={it.game.id} game={it.game} compact /> : <LookingCard key={it.post.id} post={it.post} />))}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 150, height: 28 },
  sticky: { backgroundColor: colors.ink, paddingVertical: space.md, marginTop: space.md },
});
