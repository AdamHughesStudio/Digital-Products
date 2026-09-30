import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameCard } from '@/components/cards';
import { ProfileButton } from '@/components/credits';
import { ClubCard } from '@/components/club-card';
import { ClubEventCard } from '@/components/club-event-card';
import { EventCard } from '@/components/event-card';
import { ForYou } from '@/components/for-you';
import { useToast } from '@/components/toast';
import { Avatar, Button, EmptyState, IconButton, Row, Sheet, T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { clubEventsNear } from '@/data/club-events';
import { clubsNear } from '@/data/clubs';
import { entryStatus } from '@/data/events';
import { upcomingEvents } from '@/data/events';
import { PRO_MONTHLY_CREDITS, PRO_PRICE, useStore } from '@/data/store';
import { haptic } from '@/lib/haptics';
import type { Game, LookingPost } from '@/data/types';
import { buildFeed } from '@/lib/selectors';

const GAMES_SHOWN = 8;
const CARD_W = 300;
const EVENT_W = 270;

export default function Discover() {
  const insets = useSafeAreaInsets();
  const { state, me, updateProfile, startPro } = useStore();
  const [proSheet, setProSheet] = useState(false);
  const isPro = !!state.credits?.pro;
  const clubEvents = me ? clubEventsNear(me.location, me.radiusMiles) : [];
  // clubs worth the trip: a member's guest rate first, then whatever is nearest
  const clubs = me ? clubsNear(state, me.location).sort((a, b) => Number(b.guestRate !== undefined) - Number(a.guestRate !== undefined) || a.miles - b.miles).slice(0, 6) : [];
  // entries about to open or close, so nobody misses a ballot
  const deadlines = upcomingEvents()
    .map((e) => ({ e, st: entryStatus(e) }))
    .filter(({ st }) => st.kind === 'soon' || st.kind === 'closing')
    .slice(0, 6);
  const saved = state.savedGolferIds.map((id) => state.golfers[id]).filter(Boolean);
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
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} colors={[colors.ink]} />}>
        <View style={[ui.contentWidth, ui.padded]}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Image source={require('@/assets/images/logo-dark.png')} style={styles.logo} contentFit="contain" accessibilityLabel="FindFore" />
            <Row gap={12}>
              <IconButton icon="calendar-outline" label="Calendar" onPress={() => router.push('/calendar')} />
              <IconButton icon="notifications-outline" label={unread ? 'Notifications, new' : 'Notifications'} badge={unread} onPress={() => router.push('/notifications')} />
              <ProfileButton />
            </Row>
          </Row>
          <T variant="title" accessibilityRole="header" style={{ marginTop: space.xxxl + space.md }}>Hi {me.firstName}, where next?</T>

          <View style={{ marginTop: space.xl }}>
            <ForYou />
          </View>

          {deadlines.length > 0 ? (
            <>
              <T variant="label" color={colors.textMuted} style={{ marginTop: space.xl, marginBottom: space.sm }}>Don’t miss</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -space.lg }} contentInset={{ left: space.lg }}>
                <View style={{ width: space.lg - space.sm }} />
                {deadlines.map(({ e, st }) => (
                  <Pressable key={e.id} onPress={() => router.push(`/competitions?country=${e.association}&show=national`)} accessibilityRole="button" accessibilityLabel={`${e.title}. Entry ${st.text.toLowerCase()}`} style={({ pressed }) => [styles.deadline, pressed && ui.pressed]}>
                    <Row gap={6}>
                      <View style={[styles.deadlineDot, { backgroundColor: st.kind === 'closing' ? '#FFC53D' : colors.lime }]} />
                      <T variant="caption" color={colors.onInkMuted}>Entry {st.text.toLowerCase()}</T>
                    </Row>
                    <T variant="smallStrong" color={colors.onInk} numberOfLines={2} style={{ marginTop: 6 }}>{e.title}</T>
                    <T variant="caption" color={colors.onInkMuted} numberOfLines={1}>{e.venue}</T>
                  </Pressable>
                ))}
                <View style={{ width: space.sm }} />
              </ScrollView>
            </>
          ) : null}

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
              <Section title="Games near you" detail={`Within ${me.radiusMiles} miles of ${me.location.name}`} onDetail={() => router.push('/profile/edit')} onSeeAll={() => router.push('/search?kind=games')} onMap={() => router.push('/map')} />
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

        <View style={[ui.contentWidth, ui.padded]}>
          <Section title="My golfers" detail="Invite people you’ve enjoyed playing with" />
          {saved.length === 0 ? (
            <T variant="body" color={colors.textMuted}>Save golfers you enjoy playing with and they’ll appear here, ready to invite again.</T>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.lg }}>
              {saved.map((g) => (
                <Pressable key={g.id} onPress={() => router.push(`/golfer/${g.id}`)} accessibilityRole="button" accessibilityLabel={`${g.firstName}, saved golfer`} style={{ alignItems: 'center', width: 72 }}>
                  <Avatar golfer={g} size={60} />
                  <T variant="smallStrong" numberOfLines={1} style={{ marginTop: 6 }}>{g.firstName}</T>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={[ui.contentWidth, ui.padded]}>
          <Section title="Courses worth the trip" detail="Play as a member’s guest and skip the visitor rate" onSeeAll={() => router.push('/search?tab=clubs')} />
        </View>
        <Carousel snap={250}>
          {clubs.map((l) => (
            <ClubCard key={l.profile.course.id} listing={l} width={250} compact />
          ))}
        </Carousel>

        {clubEvents.length > 0 ? (
          <>
            <View style={[ui.contentWidth, ui.padded]}>
              <Section title="Opens near you" detail="Club opens and scrambles you can enter" onSeeAll={() => router.push('/competitions?show=club')} />
            </View>
            <Carousel snap={EVENT_W}>
              {clubEvents.slice(0, 6).map(({ e, miles }) => (
                <ClubEventCard key={e.id} event={e} miles={miles} width={EVENT_W} />
              ))}
            </Carousel>
          </>
        ) : null}

        <View style={[ui.contentWidth, ui.padded]}>
          <Section title="National championships" detail="Set a reminder and we’ll tell you when entry opens" onSeeAll={() => router.push('/competitions?show=national')} />
        </View>
        <Carousel snap={EVENT_W}>
          {upcomingEvents().slice(0, 6).map((e) => (
            <EventCard key={e.id} event={e} width={EVENT_W} onPress={() => router.push(`/competitions?country=${e.association}&show=national`)} />
          ))}
        </Carousel>

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

function Section({ title, detail, onSeeAll, onMap, onDetail }: { title: string; detail: string; onSeeAll?: () => void; onMap?: () => void; onDetail?: () => void }) {
  return (
    <View style={{ marginTop: space.xxl, marginBottom: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading" accessibilityRole="header" style={{ flex: 1 }}>{title}</T>
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
      {onDetail ? (
        <Pressable onPress={onDetail} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${detail}. Change area`} style={styles.area}>
          <Ionicons name="location" size={14} color={colors.textMuted} />
          <T variant="small" color={colors.textMuted}>{detail}</T>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
      ) : (
        <T variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>{detail}</T>
      )}
    </View>
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
  deadline: { width: 210, backgroundColor: colors.ink, borderRadius: radius.lg, padding: space.md },
  deadlineDot: { width: 7, height: 7, borderRadius: 4 },
  area: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 2 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  mapTile: { width: 150, borderRadius: 28, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', gap: space.md, marginBottom: space.md, padding: space.lg },
  mapTileIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  widen: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, marginTop: space.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  proHead: { flexDirection: 'row' },
  proTag: { backgroundColor: colors.lime, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  proIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  widenIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
