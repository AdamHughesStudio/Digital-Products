import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard, LookingCard } from '@/components/cards';
import { Chip, EmptyState, IconButton, Row, SectionHeader, T, styles as ui } from '@/components/ui';
import { RoundCheckIn } from '@/components/round-check-in';
import { useToast } from '@/components/toast';
import { UpNext } from '@/components/up-next';
import { colors, radius, shadow, space } from '@/constants/theme';
import { roundsToReview, useStore } from '@/data/store';
import { applyFilters, buildFeed, type Kind } from '@/lib/selectors';

const KINDS: { key: Kind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'games', label: 'Games with spaces' },
  { key: 'golfers', label: 'Golfers free to play' },
  { key: 'member_guest', label: 'Member guest' },
  { key: 'competition', label: 'Competitions' },
];

export default function Discover() {
  const insets = useSafeAreaInsets();
  const { state, me, updateProfile, dismissTip } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>('all');
  const [refreshing, setRefreshing] = useState(false);
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

  const review = roundsToReview(state)[0];
  const showGuide = !(state.dismissedTips ?? []).includes('how-it-works');
  // a wider radius that would actually bring more into view
  const wider = [25, 50, 100].find((m) => m > me.radiusMiles && further.some((i) => i.miles <= m));

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
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} colors={[colors.ink]} />}>
        <View style={[ui.contentWidth, ui.padded]}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Image source={require('@/assets/images/logo-dark.png')} style={styles.logo} contentFit="contain" accessibilityLabel="FindFore" />
            <Row gap={10}>
              <IconButton icon="search" label="Search" onPress={() => router.push('/search')} />
              <IconButton icon="notifications-outline" label="Notifications" badge={unread} onPress={() => router.push('/notifications')} />
            </Row>
          </Row>
          <T variant="title" accessibilityRole="header" style={{ marginTop: space.xl }}>Hi {me.firstName}, fancy a game?</T>
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
          {showGuide ? <HowItWorks onClose={() => dismissTip('how-it-works')} /> : null}
          {review ? (
            <View style={{ marginTop: space.sm }}>
              <RoundCheckIn game={review} />
            </View>
          ) : null}
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
          {wider && nearby.length < 4 ? (
            <Pressable onPress={widen} style={({ pressed }) => [styles.widen, pressed && ui.pressed]} accessibilityRole="button">
              <View style={styles.widenIcon}>
                <Ionicons name="navigate" size={16} color={colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{nearby.length === 0 ? 'Nothing within your radius yet' : 'Want more to choose from?'}</T>
                <T variant="small" color={colors.textMuted}>Search within {wider} miles instead of {me.radiusMiles}</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}

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

function HowItWorks({ onClose }: { onClose: () => void }) {
  const steps: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }[] = [
    { icon: 'flag', title: 'Got a tee time?', body: 'Post it and golfers nearby can ask to join.' },
    { icon: 'search', title: 'Free to play?', body: 'Request a space in a game, or post when you’re free.' },
    { icon: 'chatbubbles', title: 'Then chat', body: 'Messages open once a host says yes.' },
  ];
  return (
    <View style={styles.guide}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="subheading">How FindFore works</T>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss guide">
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </Row>
      <View style={{ gap: space.md, marginTop: space.md }}>
        {steps.map((st) => (
          <Row key={st.title} gap={space.md} align="flex-start">
            <View style={styles.guideIcon}>
              <Ionicons name={st.icon} size={16} color={colors.lime} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{st.title}</T>
              <T variant="small" color={colors.textMuted}>{st.body}</T>
            </View>
          </Row>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guide: { backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: colors.border, padding: space.lg, marginTop: space.sm, marginBottom: space.sm, ...shadow },
  guideIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  widen: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, marginBottom: space.md, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  widenIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 140, height: 26 },
  sticky: { backgroundColor: colors.bg, paddingVertical: space.md, marginTop: space.md },
});
