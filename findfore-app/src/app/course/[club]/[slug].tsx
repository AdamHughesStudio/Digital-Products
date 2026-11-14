import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavSpace } from '@/components/bottom-nav';
import { Facts, GameCard, HeroButton, PageHero, PhotoCredit } from '@/components/cards';
import { ClubEventCard } from '@/components/club-event-card';
import { EventCard } from '@/components/event-card';
import { PlaceMap } from '@/components/place-map';
import { Top100Card, Top100Tag } from '@/components/top100';
import { useToast } from '@/components/toast';
import { Button, EmptyState, IconButton, Row, SectionHeader, T, styles as ui, type IconName } from '@/components/ui';
import { colors, hair, space } from '@/constants/theme';
import { nationalsAt, opensAt } from '@/data/clubs';
import { useClubEvents } from '@/data/club-events';
import { clubShortName, coursePath, layoutBySlug, layoutsFor, useCourse } from '@/data/courses';
import { isFull, isPast, useStore } from '@/data/store';
import { top100For } from '@/data/top100';
import { distanceMiles, milesLabel } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { shareLink } from '@/lib/share';

/**
 * One course at a club with more than one, e.g. the King's Course at Gleneagles: what it is, the
 * games on it, the club's other courses, and a quick way to post a game here.
 */
export default function CoursePage() {
  const { club: clubId, slug } = useLocalSearchParams<{ club: string; slug: string }>();
  const insets = useSafeAreaInsets();
  // room for the bottom bar, which stays on this page
  const nav = useNavSpace();
  const { state, me } = useStore();
  const toast = useToast();
  // looked up again when the full club list or the opens arrive, which can be after this page opens
  const club = useCourse(clubId);
  const events = useClubEvents();
  const layout = layoutBySlug(club, slug);

  if (!club || !layout || !me) {
    return (
      <View style={ui.screen}>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: space.lg }}>
          <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
        <EmptyState icon="flag-outline" title="Course not found" body="This course isn’t on PlusFore yet." />
      </View>
    );
  }

  const short = clubShortName(club.name);
  const ranked = top100For(club.id, layout.name);
  const others = layoutsFor(club).filter((l) => l.name !== layout.name);
  const miles = distanceMiles(club, me.location);
  // competitions belong to the club rather than one course, so a course page shows the club's
  const opens = opensAt(club.id, events);
  const nationals = nationalsAt(club);
  const games = Object.values(state.games)
    .filter((g) => g.courseId === club.id && g.layout === layout.name && !g.cancelled && !isPast(g) && !isFull(state, g))
    .sort((a, b) => a.teeTime.localeCompare(b.teeTime));
  const facts: { icon: IconName; top: string; bottom: string }[] = [
    { icon: 'golf', top: layout.holes ? `${layout.holes} holes` : 'Course', bottom: layout.holes === 9 ? 'A nine' : 'At this club' },
    { icon: 'flag', top: `${layoutsFor(club).length} courses`, bottom: `At ${short}` },
    { icon: 'navigate', top: milesLabel(miles), bottom: `from ${me.location.name}` },
  ];

  const share = async () => {
    const r = await shareLink(`${short} · ${layout.name}`, coursePath(club.id, layout.name));
    if (r === 'copied') toast('Link copied', { icon: 'link' });
  };

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 + nav }} showsVerticalScrollIndicator={false}>
        <PageHero course={club} inset>
          {(onPhoto) => (
            <>
              <HeroButton icon="chevron-back" label="Back" onPhoto={onPhoto} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
              <HeroButton icon="share-outline" label="Share this course" onPhoto={onPhoto} onPress={share} />
            </>
          )}
        </PageHero>

        <View style={[ui.contentWidth, ui.padded]}>
          <View style={s.titleBlock}>
            <T variant="title" accessibilityRole="header">{layout.name}</T>
            <T variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>Course at {club.name} · {club.town}</T>
            <PhotoCredit course={club} />
          </View>

          <Facts style={{ marginTop: space.lg }} items={facts.map((f) => ({ value: f.top, label: f.bottom }))} />

          {ranked ? <Top100Card entries={[ranked]} clubId={club.id} /> : null}

          <Button
            title="Post a game on this course"
            icon="add"
            style={{ marginTop: space.lg }}
            onPress={() => {
              haptic.tap();
              router.push(`/post/game?club=${encodeURIComponent(club.id)}&course=${encodeURIComponent(layout.name)}` as never);
            }}
          />

          <SectionHeader title="Games on this course" />
          {games.length === 0 ? (
            <T variant="body" color={colors.textMuted}>No games posted yet. Be the first to post a game on the {layout.name} and golfers nearby will see it.</T>
          ) : (
            games.map((g) => <GameCard key={g.id} game={g} compact />)
          )}

          <SectionHeader title={`Competitions at ${short}`} />
          {opens.length === 0 && nationals.length === 0 ? (
            <T variant="body" color={colors.textMuted}>No competitions listed. When {short} lists an open, it will show here.</T>
          ) : (
            <>
              {opens.map((e) => <ClubEventCard key={e.id} event={e} miles={miles} />)}
              {nationals.map((e) => <EventCard key={e.id} event={e} onPress={() => router.push(`/championship/${e.id}`)} />)}
            </>
          )}

          {others.length ? (
            <>
              <SectionHeader title={`Also at ${short}`} />
              <View style={ui.panel}>
                {others.map((l, i) => (
                  <Pressable key={l.name} onPress={() => router.push(coursePath(club.id, l.name) as never)} accessibilityRole="button" accessibilityLabel={`${l.name}${l.holes ? `, ${l.holes} holes` : ''}`} style={({ pressed }) => [ui.panelRow, i > 0 && ui.panelDivider, pressed && ui.pressed]}>
                    <Ionicons name="flag-outline" size={20} color={colors.text} />
                    <T variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{l.name}</T>
                    {top100For(club.id, l.name) ? <Top100Tag rank={top100For(club.id, l.name)!.rank} /> : null}
                    {l.holes ? <T variant="small" color={colors.textMuted}>{l.holes} holes</T> : null}
                    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title="Where it is" />
          <PlaceMap course={club} />

          <Pressable onPress={() => router.push(`/club/${club.id}` as never)} accessibilityRole="button" accessibilityLabel={`${club.name} club profile`} style={({ pressed }) => [s.clubRow, pressed && ui.pressed]}>
            <Ionicons name="business-outline" size={20} color={colors.text} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T variant="bodyStrong" numberOfLines={1}>About {club.name}</T>
              <T variant="small" color={colors.textMuted} numberOfLines={1}>Green fees, opens and members on PlusFore</T>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  titleBlock: { marginTop: space.md },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, marginTop: space.xxl, borderTopWidth: hair, borderBottomWidth: hair, borderColor: colors.borderStrong },
});
