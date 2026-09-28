import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard, GolferFreeCard } from '@/components/cards';
import { ForYou } from '@/components/for-you';
import { useToast } from '@/components/toast';
import { EmptyState, IconButton, Row, T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import type { Game, LookingPost } from '@/data/types';
import { buildFeed } from '@/lib/selectors';

const GAMES_SHOWN = 4;

export default function Discover() {
  const insets = useSafeAreaInsets();
  const { state, me, updateProfile } = useStore();
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
      games: games.filter((g) => g.type !== 'member_guest'),
      memberGuest: games.filter((g) => g.type === 'member_guest'),
      golfers: near.filter((i) => i.kind === 'looking').map((i) => (i as { post: LookingPost }).post),
      furtherMiles: all.filter((i) => i.kind === 'game' && i.miles > me.radiusMiles).map((i) => i.miles),
    };
  }, [state, me]);

  if (!me || !feed) return null;

  const nothingNear = feed.games.length + feed.memberGuest.length === 0;
  // a wider radius that would actually bring more games into view
  const wider = [25, 50, 100].find((m) => m > me.radiusMiles && feed.furtherMiles.some((mi) => mi <= m));

  const widen = () => {
    if (!wider) return;
    const before = me.radiusMiles;
    updateProfile({ radiusMiles: wider });
    toast(`Now showing games within ${wider} miles`, { icon: 'navigate', action: { label: 'Undo', onPress: () => updateProfile({ radiusMiles: before }) } });
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
            <IconButton icon="notifications-outline" label={unread ? 'Notifications, new' : 'Notifications'} badge={unread} onPress={() => router.push('/notifications')} />
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

          {feed.games.length > 0 ? (
            <>
              <Section title="Games you can join" detail="Tee times near you with spaces free" onSeeAll={() => router.push('/search?kind=games')} />
              {feed.games.slice(0, GAMES_SHOWN).map((g) => (
                <GameCard key={g.id} game={g} />
              ))}
            </>
          ) : null}
        </View>

        {feed.memberGuest.length > 0 ? (
          <>
            <View style={[ui.contentWidth, ui.padded]}>
              <Section title="Member guest spots" detail="Play private clubs at the guest rate" onSeeAll={() => router.push('/search?kind=member_guest')} />
            </View>
            <Carousel>
              {feed.memberGuest.map((g) => (
                <View key={g.id} style={{ width: 326 }}>
                  <GameCard game={g} compact />
                </View>
              ))}
            </Carousel>
          </>
        ) : null}

        {feed.golfers.length > 0 ? (
          <>
            <View style={[ui.contentWidth, ui.padded]}>
              <Section title="Golfers free to play" detail="Invite them to your game, or say hello" onSeeAll={() => router.push('/search?kind=golfers')} />
            </View>
            <Carousel>
              {feed.golfers.map((p) => (
                <GolferFreeCard key={p.id} post={p} />
              ))}
            </Carousel>
          </>
        ) : null}

        <View style={[ui.contentWidth, ui.padded]}>
          {wider && feed.games.length + feed.memberGuest.length < GAMES_SHOWN ? (
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
    </View>
  );
}

function Section({ title, detail, onSeeAll }: { title: string; detail: string; onSeeAll?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md }} align="flex-end">
      <View style={{ flex: 1 }}>
        <T variant="heading" accessibilityRole="header">{title}</T>
        <T variant="small" color={colors.textMuted}>{detail}</T>
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={10} accessibilityRole="button" accessibilityLabel={`See all ${title.toLowerCase()}`} style={styles.seeAll}>
          <T variant="smallStrong">See all</T>
          <Ionicons name="chevron-forward" size={14} color={colors.text} />
        </Pressable>
      ) : null}
    </Row>
  );
}

function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <View style={ui.contentWidth}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md }}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 140, height: 26 },
  area: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  widen: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, marginTop: space.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  widenIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
