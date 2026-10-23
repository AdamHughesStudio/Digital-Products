import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavSpace } from '@/components/bottom-nav';
import { CourseArt, GameCard } from '@/components/cards';
import { ClubEventCard } from '@/components/club-event-card';
import { EventCard } from '@/components/event-card';
import { PlaceMap } from '@/components/place-map';
import { Top100Card, Top100Tag } from '@/components/top100';
import { useToast } from '@/components/toast';
import { Button, EmptyState, IconButton, Row, SectionHeader, T, styles as ui, type IconName } from '@/components/ui';
import { colors, hairline, radius, shadow, space } from '@/constants/theme';
import { nationalsAt, opensAt } from '@/data/clubs';
import { clubShortName, courseById, coursePath, layoutBySlug, layoutsFor, useClubsVersion } from '@/data/courses';
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
  useClubsVersion();
  const club = courseById(clubId);
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
  const opens = opensAt(club.id);
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
        <View style={[s.heroWrap, { marginTop: insets.top + 6 }]}>
          <CourseArt course={club} height={240}>
            <View style={[s.topBar, { top: 12 }]}>
              <IconButton icon="chevron-back" label="Back" color={colors.onInk} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.glass} />
              <IconButton icon="share-outline" label="Share this course" color={colors.onInk} onPress={share} style={s.glass} />
            </View>
            <View style={s.hero}>
              <T variant="label" color={colors.white} style={s.eyebrow}>{`Course at ${short}`}</T>
              <T variant="title" color={colors.onInk} style={s.heroTitle}>{layout.name}</T>
              <T variant="small" color={colors.onInkMuted}>{club.name} · {club.town}</T>
            </View>
          </CourseArt>
        </View>

        <View style={[ui.contentWidth, ui.padded]}>
          <View style={[ui.card, s.facts]}>
            <Row gap={0} align="flex-start">
              {facts.map((f, i) => (
                <View key={f.top} style={{ flex: 1, flexDirection: 'row' }}>
                  {i > 0 ? <View style={s.factDivider} /> : null}
                  <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
                    <View style={s.factIcon}><Ionicons name={f.icon} size={15} color={colors.ink} /></View>
                    <T variant="bodyStrong" numberOfLines={1} style={{ marginTop: space.sm }}>{f.top}</T>
                    <T variant="caption" color={colors.textMuted} numberOfLines={2} style={{ textAlign: 'center' }}>{f.bottom}</T>
                  </View>
                </View>
              ))}
            </Row>
          </View>

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
            <View style={ui.card}>
              <T variant="bodyStrong">No games posted yet</T>
              <T variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>Be the first to post a game on the {layout.name} and golfers nearby will see it.</T>
            </View>
          ) : (
            games.map((g) => <GameCard key={g.id} game={g} compact />)
          )}

          <SectionHeader title={`Competitions at ${short}`} />
          {opens.length === 0 && nationals.length === 0 ? (
            <View style={ui.card}>
              <T variant="bodyStrong">No competitions listed</T>
              <T variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>When {short} lists an open, it will show here.</T>
            </View>
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
                    <View style={s.factIcon}><Ionicons name="flag" size={14} color={colors.ink} /></View>
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
            <View style={s.clubIcon}><Ionicons name="business-outline" size={18} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" numberOfLines={1}>About {club.name}</T>
              <T variant="small" color={colors.textMuted} numberOfLines={1}>Green fees, opens and members on PlusFore</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  heroWrap: { marginHorizontal: space.md, borderRadius: radius.panel, overflow: 'hidden', backgroundColor: colors.ink },
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  glass: { backgroundColor: 'rgba(15,26,20,0.55)', borderColor: 'rgba(255,255,255,0.12)' },
  hero: { position: 'absolute', bottom: space.xl, left: 0, right: 0, paddingHorizontal: space.xl },
  heroTitle: { marginTop: space.xs, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 10 },
  eyebrow: { letterSpacing: 1.4, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  facts: { marginTop: space.lg, paddingHorizontal: space.md, paddingVertical: space.lg },
  factIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  factDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: hairline, padding: space.lg, marginTop: space.xl, ...shadow },
  clubIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
});
