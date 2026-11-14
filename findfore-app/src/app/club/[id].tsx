import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavSpace } from '@/components/bottom-nav';
import { Facts, GameCard, HeroButton, PageHero, PhotoCredit } from '@/components/cards';
import { PlaceMap } from '@/components/place-map';
import { ClubEventCard } from '@/components/club-event-card';
import { EventCard } from '@/components/event-card';
import { SuggestCourseSheet } from '@/components/suggest-course';
import { Top100Card, Top100Tag } from '@/components/top100';
import { useToast } from '@/components/toast';
import { Avatar, Button, EmptyState, Field, IconButton, Row, SectionHeader, Sheet, T, styles as ui, type IconName } from '@/components/ui';
import { colors, hair, radius, space } from '@/constants/theme';
import { SITE_HOST, SITE_URL } from '@/constants/site';
import { coursePath, layoutsFor, useClubsVersion } from '@/data/courses';
import { useClubEvents } from '@/data/club-events';
import { clubProfile, guestRateAt, memberGamesAt, membersAt, nationalsAt, opensAt, SEED_REVIEWS } from '@/data/clubs';
import { addReview, ENTRY_URL, useMyReviews } from '@/data/events';
import { useStore } from '@/data/store';
import { top100AtClub, top100For } from '@/data/top100';
import { displayName, distanceMiles, hcpText, milesLabel } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const STYLE_LABEL: Record<string, string> = { links: 'Links', parkland: 'Parkland', heathland: 'Heathland', moorland: 'Moorland', downland: 'Downland', 'inland links': 'Inland links' };

/**
 * A club's home on PlusFore: what it is, what it costs, the cheapest way in (a member's guest rate),
 * and everything happening there.
 */
export default function ClubPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  // room for the bottom bar, which stays on this page
  const nav = useNavSpace();
  const { state, me } = useStore();
  const toast = useToast();
  const mine = useMyReviews();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [stars, setStars] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [reviewText, setReviewText] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  // looked up again when the full club list or the opens arrive, which can be after this page opens
  const clubsVersion = useClubsVersion();
  const events = useClubEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const profile = useMemo(() => clubProfile(id), [id, clubsVersion]);
  if (!profile || !me) {
    return (
      <View style={ui.screen}>
        <View style={{ paddingTop: insets.top }}><IconButton icon="chevron-back" label="Back" onPress={() => router.back()} style={{ marginLeft: space.md }} /></View>
        <EmptyState icon="flag-outline" title="Club not found" body="This club isn’t on PlusFore yet." />
      </View>
    );
  }
  const c = profile.course;
  const miles = distanceMiles(c, me.location);
  const games = memberGamesAt(state, c.id);
  const guest = guestRateAt(state, c.id);
  const opens = opensAt(c.id, events);
  const nationals = nationalsAt(c);
  const members = membersAt(state, c);
  const isMine = me.homeClub === c.name;
  const reviews = [
    ...mine.filter((r) => r.courseId === c.id).map((r) => ({ name: 'You', rating: r.rating, text: r.text, event: r.eventTitle ?? 'Your review', mine: true })),
    ...(SEED_REVIEWS[c.id] ?? []).map((r) => ({ ...r, mine: false })),
  ];
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  const layouts = layoutsFor(c);
  // Scotland's Top 100: the club itself, or any of its courses
  const ranked = top100AtClub(c.id);
  const totalHoles = layouts.every((l) => l.holes) ? layouts.reduce((n, l) => n + (l.holes ?? 0), 0) : 0;
  const facts: { icon: IconName; top: string; bottom: string }[] = [
    profile.known
      ? { icon: 'pricetag', top: c.visitorFee ? `£${c.visitorFee}` : 'Members only', bottom: c.visitorFee ? 'Visitor green fee' : 'No visitor rate' }
      : { icon: 'pricetag', top: 'Ask the club', bottom: 'Visitor green fee' },
    layouts.length
      ? { icon: 'golf', top: `${layouts.length} courses`, bottom: totalHoles ? `${totalHoles} holes` : 'At this club' }
      : profile.known
        ? { icon: 'golf', top: STYLE_LABEL[profile.style], bottom: `${profile.holes} holes` }
        : { icon: 'golf', top: c.holes ? `${c.holes} holes` : 'Golf club', bottom: c.holes ? 'Course' : 'Course details to come' },
    { icon: 'navigate', top: milesLabel(miles), bottom: `from ${me.location.name}` },
  ];

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 + nav }} showsVerticalScrollIndicator={false}>
        <PageHero course={c} inset>
          {(onPhoto) => (
            <>
              <HeroButton icon="chevron-back" label="Back" onPhoto={onPhoto} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
              {c.website || profile.known ? <HeroButton icon="open-outline" label="Club website" onPhoto={onPhoto} onPress={() => Linking.openURL(c.website ?? ENTRY_URL)} /> : <View />}
            </>
          )}
        </PageHero>

        <View style={[ui.contentWidth, ui.padded]}>
          <View style={s.titleBlock}>
            <T variant="title" accessibilityRole="header">{c.name}</T>
            <T variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>
              {c.town === c.region ? c.town : `${c.town}, ${c.region}`}
              {profile.founded ? ` · Est. ${profile.founded}` : ''}
              {isMine ? <T variant="smallStrong"> · Your club</T> : null}
            </T>
            <PhotoCredit course={c} />
          </View>

          <Facts style={{ marginTop: space.lg }} items={facts.map((f) => ({ value: f.top, label: f.bottom }))} />

          <Top100Card entries={ranked} clubId={c.id} />

          <T variant="body" color={colors.textMuted} style={{ marginTop: space.lg }}>{profile.blurb}</T>
          {/* OpenStreetMap credit is left off while this is a private prototype; it's required once PlusFore is public */}

          {layouts.length ? (
            <>
              <SectionHeader title="The courses" />
              <View style={ui.panel}>
                {layouts.map((l, i) => (
                  <Pressable key={l.name} onPress={() => router.push(coursePath(c.id, l.name) as never)} accessibilityRole="button" accessibilityLabel={`${l.name}${l.holes ? `, ${l.holes} holes` : ''}, course page`} style={({ pressed }) => [ui.panelRow, { gap: space.md }, i > 0 && ui.panelDivider, pressed && ui.pressed]}>
                    <Ionicons name="flag-outline" size={20} color={colors.text} />
                    <T variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{l.name}</T>
                    {top100For(c.id, l.name) ? <Top100Tag rank={top100For(c.id, l.name)!.rank} /> : null}
                    {l.holes ? <T variant="small" color={colors.textMuted}>{l.holes} holes</T> : null}
                    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <Pressable onPress={() => setSuggestOpen(true)} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: space.md }}>
            <T variant="small" color={colors.textMuted}>{layouts.length ? 'Missing a course?' : 'More than one course here?'} <T variant="smallStrong" color={colors.text}>Tell us</T></T>
          </Pressable>

          {/* the reason to be here: a cheaper way onto the course */}
          {guest !== undefined && c.visitorFee ? (
            <View style={s.deal}>
              <View style={{ flex: 1 }}>
                <T variant="label" color={colors.ink}>Play here for less</T>
                <T variant="heading" color={colors.ink} style={{ marginTop: 4 }}>£{guest} as a member’s guest</T>
                <T variant="small" color={colors.ink}>Visitors pay £{c.visitorFee}. Join a member’s game below and save £{c.visitorFee - guest}.</T>
              </View>
            </View>
          ) : null}

          <SectionHeader title="Games here" />
          {games.length === 0 ? (
            <View>
              <T variant="body" color={colors.textMuted}>
                No member games posted yet.{' '}
                {members.length ? `${members.map((m) => m.firstName).join(' and ')} ${members.length === 1 ? 'is a member' : 'are members'} here. Say hello and ask about a guest game.` : 'Members who post a guest tee time will show here. Ask to be told when one does.'}
              </T>
              <Button
                title={isMine ? 'Post a guest game here' : 'Tell me when one is posted'}
                kind="dark"
                size="md"
                icon={isMine ? 'add' : 'notifications-outline'}
                style={{ marginTop: space.md, alignSelf: 'flex-start' }}
                onPress={() => {
                  if (isMine) return router.push('/post/game?member=1');
                  haptic.success();
                  toast(`We’ll tell you when a member posts a game at ${c.name.split(' Golf')[0]}`, { icon: 'notifications' });
                }}
              />
            </View>
          ) : (
            games.map((g) => <GameCard key={g.id} game={g} compact />)
          )}

          <SectionHeader title="Open competitions" />
          {opens.length === 0 ? (
            <T variant="body" color={colors.textMuted}>No opens listed. When {c.name.split(' Golf')[0]} lists an open, it will show here.</T>
          ) : (
            opens.map((e) => <ClubEventCard key={e.id} event={e} miles={miles} />)
          )}

          {nationals.length > 0 ? (
            <>
              <SectionHeader title="Championships played here" />
              {nationals.map((e) => <EventCard key={e.id} event={e} onPress={() => router.push(`/championship/${e.id}`)} />)}
            </>
          ) : null}

          <SectionHeader title="Where it is" />
          <PlaceMap course={c} />

          {members.length > 0 ? (
            <>
              <SectionHeader title="Members on PlusFore" />
              <View style={ui.panel}>
                {members.map((m, i) => (
                  <Pressable key={m.id} onPress={() => router.push(`/golfer/${m.id}`)} accessibilityRole="button" style={({ pressed }) => [ui.panelRow, i > 0 && ui.panelDivider, pressed && ui.pressed]}>
                    <Avatar golfer={m} size={40} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T variant="bodyStrong" numberOfLines={1}>{displayName(m)}</T>
                      <T variant="small" color={colors.textMuted} tabular numberOfLines={1}>{hcpText(m.handicap)} · {m.gamesPlayed} games on PlusFore</T>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title="What golfers say" action="Write a review" onAction={() => setReviewOpen(true)} />
          {reviews.length === 0 ? (
            <T variant="body" color={colors.textMuted}>No reviews yet. Played an open or a game here? Yours would be the first.</T>
          ) : (
            <>
              <Row gap={space.sm} style={{ marginBottom: space.md }}>
                <Row gap={2}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons key={n} name={n <= Math.round(avg) ? 'star' : 'star-outline'} size={16} color={colors.text} />
                  ))}
                </Row>
                <T variant="smallStrong">{avg.toFixed(1)}</T>
                <T variant="small" color={colors.textMuted}>from {reviews.length} review{reviews.length === 1 ? '' : 's'}</T>
              </Row>
              <View style={ui.panel}>
                {reviews.map((r, i) => (
                  <View key={i} style={[{ paddingVertical: 14 }, i > 0 && ui.panelDivider]}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <T variant="bodyStrong">{r.name}</T>
                      <Row gap={2}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={12} color={colors.text} />
                        ))}
                      </Row>
                    </Row>
                    <T variant="small" color={colors.text} style={{ marginTop: 4 }}>{r.text}</T>
                    <T variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>{r.event}</T>
                  </View>
                ))}
              </View>
            </>
          )}

          <Pressable onPress={() => Linking.openURL(ENTRY_URL)} accessibilityRole="link" style={({ pressed }) => [s.site, pressed && ui.pressed]}>
            <Ionicons name="globe-outline" size={20} color={colors.text} />
            <T variant="bodyStrong" style={{ flex: 1 }}>Club website and tee booking</T>
            <Ionicons name="open-outline" size={16} color={colors.sageDeep} />
          </Pressable>
          <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>Preview build: club details are examples and links go to {SITE_HOST} for now.</T>
        </View>
      </ScrollView>

      <SuggestCourseSheet visible={suggestOpen} onClose={() => setSuggestOpen(false)} club={c} />
      <Sheet visible={reviewOpen} onClose={() => setReviewOpen(false)} title={`Review ${c.name.split(' Golf')[0]}`}>
        <T variant="body" color={colors.textMuted}>A line or two helps other golfers find the well run opens and the courses worth the drive.</T>
        <Row gap={6} style={{ marginTop: space.lg }}>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <Pressable key={n} onPress={() => { haptic.select(); setStars(n); }} accessibilityRole="button" accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`} hitSlop={4}>
              <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={32} color={colors.text} />
            </Pressable>
          ))}
        </Row>
        <View style={{ marginTop: space.lg }}>
          <Field value={reviewText} onChangeText={setReviewText} placeholder="Course condition, how the open was run, the food, the pace." multiline maxLength={280} />
        </View>
        <Button
          title="Post review"
          disabled={reviewText.trim().length < 10}
          style={{ marginTop: space.xl }}
          onPress={() => {
            addReview({ courseId: c.id, rating: stars, text: reviewText.trim() });
            haptic.success();
            toast('Thanks. Your review is live', { icon: 'star' });
            setReviewText('');
            setReviewOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  titleBlock: { marginTop: space.md },
  deal: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.accent, borderRadius: radius.xl, padding: space.lg, marginTop: space.lg },
  site: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, marginTop: space.xxl, borderTopWidth: hair, borderBottomWidth: hair, borderColor: colors.borderStrong },
});
