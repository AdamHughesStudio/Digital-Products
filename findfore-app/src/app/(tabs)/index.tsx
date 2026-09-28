import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard, GolferFreeCard } from '@/components/cards';
import { CreditBadge } from '@/components/credits';
import { ForYou } from '@/components/for-you';
import { useToast } from '@/components/toast';
import { Button, EmptyState, IconButton, Row, Sheet, T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { PRO_MONTHLY_CREDITS, PRO_PRICE, useStore } from '@/data/store';
import { haptic } from '@/lib/haptics';
import type { Game, LookingPost } from '@/data/types';
import { buildFeed } from '@/lib/selectors';

const GAMES_SHOWN = 8;
const CARD_W = 300;

export default function Discover() {
  const insets = useSafeAreaInsets();
  const { state, me, updateProfile, startPro } = useStore();
  const [proSheet, setProSheet] = useState(false);
  const isPro = !!state.credits?.pro;
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const unread = state.notifications.some((n) => !n.read);

  // Discover sorts itself into plain sections, so there's nothing to choose before you see what's on
  const feed = useMemo(() => {
    if (!me) return null;
    const all = buildFeed(state, me);
    const near = all.filter((i) => i.miles <= me.radiusMiles);
    const games = near.filter((i) => i.kind === 'game').map((i) => (i as { game: Game }).game);
    return {
      games,
      golfers: near.filter((i) => i.kind === 'looking').map((i) => (i as { post: LookingPost }).post),
      furtherMiles: all.filter((i) => i.kind === 'game' && i.miles > me.radiusMiles).map((i) => i.miles),
    };
  }, [state, me]);

  if (!me || !feed) return null;

  const nothingNear = feed.games.length === 0;
  // a wider radius that would actually bring more games into view
  const wider = [25, 50, 100].find((m) => m > me.radiusMiles && feed.furtherMiles.some((mi) => mi <= m));

  const applyWiden = () => {
    if (!wider) return;
    const before = me.radiusMiles;
    updateProfile({ radiusMiles: wider });
    toast(`Now showing games within ${wider} miles`, { icon: 'navigate', action: { label: 'Undo', onPress: () => updateProfile({ radiusMiles: before }) } });
  };

  // searching further afield is a Pro feature: members widen straight away, everyone else sees the upgrade
  const widen = () => {
    if (isPro) applyWiden();
    else setProSheet(true);
  };
  const extraGames = wider ? feed.furtherMiles.filter((mi) => mi <= wider).length : 0;

  const joinPro = () => {
    startPro();
    haptic.success();
    setProSheet(false);
    applyWiden();
  };

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast('You’re up to date', { icon: 'refresh' });
    }, 800);
  };

  return (
    <View style={ui.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} colors={[colors.ink]} />}>
        <View style={[ui.contentWidth, ui.padded]}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Image source={require('@/assets/images/logo-dark.png')} style={styles.logo} contentFit="contain" accessibilityLabel="FindFore" />
            <Row gap={8}>
              <IconButton icon="map-outline" label="Map of games near you" onPress={() => router.push('/map')} />
              <CreditBadge />
              <IconButton icon="notifications-outline" label={unread ? 'Notifications, new' : 'Notifications'} badge={unread} onPress={() => router.push('/notifications')} />
            </Row>
          </Row>
          <T variant="title" accessibilityRole="header" style={{ marginTop: space.lg }}>Hi {me.firstName}, fancy a game?</T>
          <Pressable onPress={() => router.push('/profile/edit')} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Within ${me.radiusMiles} miles of ${me.location.name}. Change area`} style={styles.area}>
            <Ionicons name="location" size={14} color={colors.textMuted} />
            <T variant="small" color={colors.textMuted}>Within {me.radiusMiles} miles of {me.location.name}</T>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>

          <View style={{ marginTop: space.lg }}>
            <ForYou />
          </View>

          {nothingNear ? (
            <EmptyState
              icon="golf-outline"
              title="No games nearby yet"
              body="Be the first. Post a game you want players for, or let golfers know you’re free to play."
              action="Post something"
              onAction={() => router.push('/post')}
            />
          ) : null}

        </View>

        {feed.games.length > 0 ? (
          <>
            <View style={[ui.contentWidth, ui.padded]}>
              <Section title="Games near you" detail={`${feed.games.length} with spaces free`} onSeeAll={() => router.push('/search?kind=games')} onMap={() => router.push('/map')} />
            </View>
            <Carousel>
              {feed.games.slice(0, GAMES_SHOWN).map((g) => (
                <View key={g.id} style={{ width: CARD_W }}>
                  <GameCard game={g} compact />
                </View>
              ))}
              <Pressable onPress={() => router.push('/map')} style={({ pressed }) => [styles.mapTile, pressed && ui.pressed]} accessibilityRole="button" accessibilityLabel="See every game on the map">
                <View style={styles.mapTileIcon}>
                  <Ionicons name="map" size={22} color={colors.ink} />
                </View>
                <T variant="subheading" color={colors.onInk} style={{ textAlign: 'center' }}>See them all{'\n'}on the map</T>
              </Pressable>
            </Carousel>
          </>
        ) : null}

        {feed.golfers.length > 0 ? (
          <>
            <View style={[ui.contentWidth, ui.padded]}>
              <Section title="Golfers free to play" detail="Invite them to your game, or say hello" onSeeAll={() => router.push('/search?kind=golfers')} />
            </View>
            <Carousel snap={200}>
              {feed.golfers.map((p) => (
                <GolferFreeCard key={p.id} post={p} />
              ))}
            </Carousel>
          </>
        ) : null}

        <View style={[ui.contentWidth, ui.padded]}>
          {wider && feed.games.length < GAMES_SHOWN ? (
            <Pressable onPress={widen} style={({ pressed }) => [styles.widen, pressed && ui.pressed]} accessibilityRole="button">
              <View style={styles.widenIcon}>
                <Ionicons name="navigate" size={16} color={colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">Want more to choose from?</T>
                <T variant="small" color={colors.textMuted}>Search within {wider} miles instead of {me.radiusMiles}</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <Sheet visible={proSheet} onClose={() => setProSheet(false)}>
        <View style={styles.proHead}>
          <View style={styles.proTag}>
            <T variant="label" color={colors.ink}>Pro</T>
          </View>
        </View>
        <T variant="title" style={{ marginTop: space.md }}>Search further with Pro</T>
        <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>
          {extraGames > 0
            ? `${extraGames} more game${extraGames === 1 ? ' is' : 's are'} within ${wider} miles of ${me.location.name}. Widening your search is a Pro feature.`
            : `Widening your search beyond ${me.radiusMiles} miles is a Pro feature.`}
        </T>
        <View style={{ gap: space.md, marginTop: space.lg }}>
          {[
            { icon: 'navigate' as const, text: 'Search up to 100 miles from home' },
            { icon: 'repeat' as const, text: `${PRO_MONTHLY_CREDITS} credits added every month` },
            { icon: 'ribbon' as const, text: 'Pro badge on your profile' },
          ].map((b) => (
            <Row key={b.text} gap={space.md}>
              <View style={styles.proIcon}>
                <Ionicons name={b.icon} size={15} color={colors.lime} />
              </View>
              <T variant="bodyStrong">{b.text}</T>
            </Row>
          ))}
        </View>
        <Button title={`Start Pro  ·  ${PRO_PRICE} a month`} onPress={joinPro} style={{ marginTop: space.xl }} />
        <Row gap={space.sm} style={{ marginTop: space.sm }}>
          <Button title="What’s included" kind="ghost" size="md" onPress={() => { setProSheet(false); router.push('/pro'); }} style={{ flex: 1 }} />
          <Button title="Not now" kind="ghost" size="md" onPress={() => setProSheet(false)} style={{ flex: 1 }} />
        </Row>
        <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>Preview build: no payment is taken. Cancel any time.</T>
      </Sheet>
    </View>
  );
}

function Section({ title, detail, onSeeAll, onMap }: { title: string; detail: string; onSeeAll?: () => void; onMap?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md }} align="flex-end">
      <View style={{ flex: 1 }}>
        <T variant="heading" accessibilityRole="header">{title}</T>
        <T variant="small" color={colors.textMuted}>{detail}</T>
      </View>
      {onMap ? (
        <Pressable onPress={onMap} hitSlop={10} accessibilityRole="button" accessibilityLabel="Show on the map" style={[styles.seeAll, { marginRight: space.sm }]}>
          <Ionicons name="map-outline" size={14} color={colors.text} />
          <T variant="smallStrong">Map</T>
        </Pressable>
      ) : null}
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={10} accessibilityRole="button" accessibilityLabel={`See all ${title.toLowerCase()}`} style={styles.seeAll}>
          <T variant="smallStrong">See all</T>
          <Ionicons name="chevron-forward" size={14} color={colors.text} />
        </Pressable>
      ) : null}
    </Row>
  );
}

function Carousel({ children, snap = CARD_W }: { children: React.ReactNode; snap?: number }) {
  return (
    <View style={ui.contentWidth}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snap + space.md}
        snapToAlignment="start"
        contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg }}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 140, height: 26 },
  area: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  mapTile: { width: 150, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', gap: space.md, marginBottom: space.md, padding: space.lg },
  mapTileIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  widen: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, marginTop: space.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  proHead: { flexDirection: 'row' },
  proTag: { backgroundColor: colors.lime, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  proIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  widenIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
