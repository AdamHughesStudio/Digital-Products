import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseArt, GameCard } from '@/components/cards';
import { ClubEventCard } from '@/components/club-event-card';
import { EventCard } from '@/components/event-card';
import { useToast } from '@/components/toast';
import { Avatar, Button, EmptyState, Field, IconButton, Row, SectionHeader, Sheet, T, styles as ui, type IconName } from '@/components/ui';
import { colors, hairline, radius, shadow, space } from '@/constants/theme';
import { clubProfile, guestRateAt, memberGamesAt, membersAt, nationalsAt, opensAt, SEED_REVIEWS } from '@/data/clubs';
import { addReview, ENTRY_URL, useMyReviews } from '@/data/events';
import { useStore } from '@/data/store';
import { displayName, distanceMiles, hcpText, milesLabel } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const STYLE_LABEL: Record<string, string> = { links: 'Links', parkland: 'Parkland', heathland: 'Heathland', moorland: 'Moorland', downland: 'Downland', 'inland links': 'Inland links' };

/**
 * A club's home on FindFore: what it is, what it costs, the cheapest way in (a member's guest rate),
 * and everything happening there.
 */
export default function ClubPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, me } = useStore();
  const toast = useToast();
  const mine = useMyReviews();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [stars, setStars] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [reviewText, setReviewText] = useState('');
  const profile = clubProfile(id);
  if (!profile || !me) {
    return (
      <View style={ui.screen}>
        <View style={{ paddingTop: insets.top }}><IconButton icon="chevron-back" label="Back" onPress={() => router.back()} style={{ marginLeft: space.md }} /></View>
        <EmptyState icon="flag-outline" title="Club not found" body="This club isn’t on FindFore yet." />
      </View>
    );
  }
  const c = profile.course;
  const miles = distanceMiles(c, me.location);
  const games = memberGamesAt(state, c.id);
  const guest = guestRateAt(state, c.id);
  const opens = opensAt(c.id);
  const nationals = nationalsAt(c);
  const members = membersAt(state, c);
  const isMine = me.homeClub === c.name;
  const reviews = [
    ...mine.filter((r) => r.courseId === c.id).map((r) => ({ name: 'You', rating: r.rating, text: r.text, event: r.eventTitle ?? 'Your review', mine: true })),
    ...(SEED_REVIEWS[c.id] ?? []).map((r) => ({ ...r, mine: false })),
  ];
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  const facts: { icon: IconName; top: string; bottom: string }[] = [
    { icon: 'pricetag', top: c.visitorFee ? `£${c.visitorFee}` : 'Members only', bottom: c.visitorFee ? 'Visitor green fee' : 'No visitor rate' },
    { icon: 'golf', top: STYLE_LABEL[profile.style], bottom: `${profile.holes} holes` },
    { icon: 'navigate', top: milesLabel(miles), bottom: `from ${me.location.name}` },
  ];

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={[s.heroWrap, { marginTop: insets.top + 6 }]}>
          <CourseArt course={c} height={240}>
            <View style={[s.topBar, { top: 12 }]}>
              <IconButton icon="chevron-back" label="Back" color={colors.onInk} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.glass} />
              <IconButton icon="open-outline" label="Club website" color={colors.onInk} onPress={() => Linking.openURL(ENTRY_URL)} style={s.glass} />
            </View>
            <View style={s.hero}>
              <T variant="label" color={colors.lime} style={s.eyebrow}>{profile.countryName}{profile.founded ? `  ·  Est. ${profile.founded}` : ''}{isMine ? '  ·  Your club' : ''}</T>
              <T variant="title" color={colors.onInk} style={s.heroTitle}>{c.name}</T>
              <T variant="small" color={colors.onInkMuted}>{c.town === c.region ? c.town : `${c.town}, ${c.region}`}</T>
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
                    <View style={s.factIcon}><Ionicons name={f.icon} size={15} color={colors.lime} /></View>
                    <T variant="bodyStrong" numberOfLines={1} style={{ marginTop: space.sm }}>{f.top}</T>
                    <T variant="caption" color={colors.textMuted} numberOfLines={2} style={{ textAlign: 'center' }}>{f.bottom}</T>
                  </View>
                </View>
              ))}
            </Row>
          </View>

          <T variant="body" color={colors.textMuted} style={{ marginTop: space.lg }}>{profile.blurb}</T>

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

          <SectionHeader title={games.length ? 'Play here with a member' : 'Play here'} />
          {games.length === 0 ? (
            <View style={ui.card}>
              <T variant="bodyStrong">No member games posted yet</T>
              <T variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>
                {members.length ? `${members.map((m) => m.firstName).join(' and ')} ${members.length === 1 ? 'is a member' : 'are members'} here. Say hello and ask about a guest game.` : 'Members who post a guest tee time will show here. Ask to be told when one does.'}
              </T>
              <Button
                title={isMine ? 'Post a guest game here' : 'Tell me when one is posted'}
                kind="dark"
                size="md"
                icon={isMine ? 'add' : 'notifications-outline'}
                style={{ marginTop: space.md }}
                onPress={() => {
                  if (isMine) return router.push('/post/game?type=member_guest');
                  haptic.success();
                  toast(`We’ll tell you when a member posts a game at ${c.name.split(' Golf')[0]}`, { icon: 'notifications' });
                }}
              />
            </View>
          ) : (
            games.map((g) => <GameCard key={g.id} game={g} compact />)
          )}

          {members.length > 0 ? (
            <>
              <SectionHeader title="Members on FindFore" />
              <View style={ui.panel}>
                {members.map((m, i) => (
                  <Pressable key={m.id} onPress={() => router.push(`/golfer/${m.id}`)} accessibilityRole="button" style={({ pressed }) => [ui.panelRow, i > 0 && ui.panelDivider, pressed && ui.pressed]}>
                    <Avatar golfer={m} size={44} />
                    <View style={{ flex: 1 }}>
                      <T variant="bodyStrong">{displayName(m)}</T>
                      <T variant="caption" color={colors.textMuted}>{hcpText(m.handicap)}  ·  {m.gamesPlayed} games on FindFore</T>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {opens.length > 0 || nationals.length > 0 ? (
            <>
              <SectionHeader title="Events here" />
              {nationals.map((e) => <EventCard key={e.id} event={e} />)}
              {opens.map((e) => <ClubEventCard key={e.id} event={e} miles={miles} />)}
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
            <Ionicons name="globe-outline" size={18} color={colors.text} />
            <T variant="bodyStrong" style={{ flex: 1 }}>Club website and tee booking</T>
            <Ionicons name="open-outline" size={16} color={colors.textFaint} />
          </Pressable>
          <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.md }}>Preview build: club details are examples and links go to findfore.app for now.</T>
        </View>
      </ScrollView>

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
  heroWrap: { marginHorizontal: space.md, borderRadius: radius.panel, overflow: 'hidden', backgroundColor: colors.ink },
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  glass: { backgroundColor: 'rgba(11,11,11,0.55)', borderColor: 'rgba(255,255,255,0.12)' },
  hero: { position: 'absolute', bottom: space.lg, left: 0, right: 0, paddingHorizontal: space.lg },
  heroTitle: { marginTop: space.xs, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 10 },
  eyebrow: { letterSpacing: 1.4, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  facts: { marginTop: space.lg, paddingHorizontal: space.md, paddingVertical: space.lg },
  factIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  factDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  deal: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.lime, borderRadius: radius.xl, padding: space.lg, marginTop: space.lg },
  site: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: hairline, padding: space.lg, marginTop: space.xl, ...shadow },
});
