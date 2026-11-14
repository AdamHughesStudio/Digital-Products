import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavSpace } from '@/components/bottom-nav';
import { Facts, HeroButton, PageHero, PhotoCredit } from '@/components/cards';
import { ClubEventCard } from '@/components/club-event-card';
import { SavedSheet, dateLine } from '@/components/competition-sheets';
import { InterestedSection } from '@/components/interested-friends';
import { PlaceMap } from '@/components/place-map';
import { useToast } from '@/components/toast';
import { Button, EmptyState, IconButton, Row, SectionHeader, T, styles as ui } from '@/components/ui';
import { colors, hair, radius, space } from '@/constants/theme';
import { SITE_HOST, SITE_URL } from '@/constants/site';
import { entryLabel, eventTitle, feeLabel, formatLabel, genderById, useClubEvents, useCompetitionsChecked } from '@/data/club-events';
import { useCourse } from '@/data/courses';
import { addDays, ENTRY_URL, toggleReminder, useReminders } from '@/data/events';
import { useStore } from '@/data/store';
import { clubEventItem } from '@/lib/calendar';
import { distanceMiles, milesLabel, shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { shareLink } from '@/lib/share';

/** The page for one club open: when and where, what it costs, the format, and how to enter. */
export default function OpenProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  // room for the bottom bar, which stays on this page
  const nav = useNavSpace();
  const { me } = useStore();
  const toast = useToast();
  const saved = useReminders().includes(id);
  const [confirm, setConfirm] = useState(false);
  // a shared link can open this screen before the opens or the full club list have loaded, so both
  // are read in a way that draws the page again when they arrive
  const events = useClubEvents();
  const checked = useCompetitionsChecked();
  const e = events.find((x) => x.id === id);
  const c = useCourse(e?.courseId);
  if ((!e || !c) && !checked) {
    return (
      <View style={[ui.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.ink} accessibilityLabel="Loading this open" />
      </View>
    );
  }
  if (!e || !c || !me) {
    return (
      <View style={ui.screen}>
        <View style={{ paddingTop: insets.top }}><IconButton icon="chevron-back" label="Back" onPress={() => router.back()} style={{ marginLeft: space.md }} /></View>
        <EmptyState icon="trophy-outline" title="Open not found" body="This open isn’t listed any more." />
      </View>
    );
  }
  const title = eventTitle(e);
  const day = addDays(e.playedIn);
  const miles = distanceMiles(c, me.location);
  const others = events.filter((x) => x.courseId === c.id && x.id !== e.id);
  const isNew = e.listedDaysAgo <= 7;
  const when = dateLine(day, e.start);
  const lastDay = e.days && e.days > 1 ? addDays(e.playedIn + e.days - 1) : undefined;
  const unknown = e.real ? 'See club' : undefined;
  const details: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }[] = [
    { icon: genderById(e.gender).icon, label: 'Who can enter', value: `${genderById(e.gender).label}${e.seniors ? ' seniors' : ''}${e.juniors ? ' juniors' : ''}` },
    { icon: 'trophy-outline', label: 'Format', value: e.format ? formatLabel(e.format) : unknown ?? 'Stableford' },
    { icon: 'golf-outline', label: 'Holes', value: e.holes ? `${e.holes} holes` : unknown ?? '18 holes' },
    { icon: 'people-outline', label: 'Entry', value: e.entry ? entryLabel(e.entry) : unknown ?? 'Individual' },
    { icon: 'speedometer-outline', label: 'Handicap limit', value: e.maxHandicap !== undefined ? `Up to ${e.maxHandicap}` : e.real ? 'Not stated' : 'No limit' },
  ];
  const about = [
    `${e.format ? (e.format === 'scramble' ? 'A Texas scramble' : `A ${formatLabel(e.format).toLowerCase()} competition`) : 'An open competition'}${e.holes ? ` over ${e.holes} holes` : ''} at ${c.name}${e.entry ? `, played as ${entryLabel(e.entry).toLowerCase()} entries` : ''}.`,
    lastDay ? `Played from ${shortDate(day)} to ${shortDate(lastDay)}.` : e.start ? `First tee time is ${e.start} on ${shortDate(day)}.` : `Played on ${shortDate(day)}.`,
    e.fee !== undefined ? `Entry is ${feeLabel(e)}${e.maxHandicap !== undefined ? ` and the handicap limit is ${e.maxHandicap}` : ''}.` : e.maxHandicap !== undefined ? `The handicap limit is ${e.maxHandicap}.` : '',
  ].filter(Boolean).join(' ');
  const enterUrl = e.entryUrl ?? ENTRY_URL;

  const save = () => {
    toggleReminder(e.id);
    if (saved) {
      haptic.select();
      toast('Removed from your calendar', { icon: 'bookmark-outline', action: { label: 'Undo', onPress: () => toggleReminder(e.id) } });
    } else {
      haptic.success();
      setConfirm(true);
    }
  };
  const share = async () => {
    const r = await shareLink(`${title} at ${c.name}`, `/open/${e.id}`);
    if (r === 'copied') toast('Link copied', { icon: 'link' });
  };

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 + nav }} showsVerticalScrollIndicator={false}>
        <PageHero course={c}>
          {(onPhoto) => (
            <>
              <HeroButton icon="chevron-back" label="Back" onPhoto={onPhoto} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
              <HeroButton icon="share-outline" label="Share this open" onPhoto={onPhoto} onPress={share} />
            </>
          )}
        </PageHero>

        <View style={[ui.contentWidth, ui.padded]}>
          <View style={s.titleBlock}>
            <T variant="title" accessibilityRole="header">{title}</T>
            <T variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>
              {isNew ? <T variant="smallStrong">New · </T> : null}
              Club open · {c.name}
            </T>
            <PhotoCredit course={c} />
          </View>

          <Facts
            style={{ marginTop: space.lg }}
            items={[
              { value: shortDate(day), label: lastDay ? `to ${shortDate(lastDay)}` : e.start ? `from ${e.start}` : 'Tee times from club' },
              { value: e.fee !== undefined ? `£${Number.isInteger(e.fee) ? e.fee : e.fee.toFixed(2)}` : 'See club', label: e.fee === undefined ? 'to enter' : e.feeBasis === 'per pair' ? 'a pair to enter' : e.feeBasis === 'per team' ? 'a team to enter' : 'to enter' },
              { value: e.holes ? `${e.holes} holes` : 'Holes', label: e.holes ? (e.format ? formatLabel(e.format) : 'to play') : 'See club' },
            ]}
          />

          <Row gap={space.sm} style={{ marginTop: space.lg }}>
            <Pressable onPress={save} accessibilityRole="button" accessibilityState={{ selected: saved }} style={({ pressed }) => [s.btn, s.save, saved && s.saveOn, pressed && ui.pressed]}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={17} color={colors.ink} />
              <T variant="bodyStrong">{saved ? 'Saved' : 'Save'}</T>
            </Pressable>
            <Pressable onPress={() => Linking.openURL(enterUrl)} accessibilityRole="link" accessibilityLabel={e.real ? `Enter ${title} on ${c.name}'s website` : `Enter ${title}, opens the entry page`} style={({ pressed }) => [s.btn, s.enter, pressed && ui.pressed]}>
              <T variant="bodyStrong" color={colors.onInk}>{e.real ? 'Enter on club site' : 'Enter this open'}</T>
              <Ionicons name="open-outline" size={16} color={colors.onInk} />
            </Pressable>
          </Row>

          <InterestedSection eventId={e.id} />

          <SectionHeader title="About this open" />
          <T variant="body" color={colors.textMuted}>
            {about}
          </T>
          {e.notes ? (
            <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>
              {e.notes}
            </T>
          ) : null}
          {e.sourceUrl ? (
            <Pressable onPress={() => Linking.openURL(e.sourceUrl!)} accessibilityRole="link" style={({ pressed }) => [{ marginTop: space.md }, pressed && ui.pressed]}>
              <T variant="small" color={colors.textMuted}>
                Listed by {e.host ?? c.name} on their website. Check the club's page for the latest details before you enter.
              </T>
            </Pressable>
          ) : null}

          <SectionHeader title="The details" />
          <View>
            {details.map((d, i) => (
              <View key={d.label} style={[s.detail, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]}>
                <T variant="body" color={colors.textMuted} style={{ flex: 1 }}>{d.label}</T>
                <T variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>{d.value}</T>
              </View>
            ))}
          </View>

          <SectionHeader title="The club" />
          <Pressable onPress={() => router.push(`/club/${c.id}`)} accessibilityRole="button" accessibilityLabel={`${c.name} club profile`} style={({ pressed }) => [s.clubRow, pressed && ui.pressed]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T variant="subheading" numberOfLines={1}>{c.name}</T>
              <T variant="small" color={colors.textMuted}>{c.town === c.region ? c.town : `${c.town}, ${c.region}`} · {milesLabel(miles)} from {me.location.name}</T>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
          <View style={{ marginTop: space.md }}>
            <PlaceMap course={c} />
          </View>

          {others.length > 0 ? (
            <>
              <SectionHeader title={`More at ${c.name.split(' Golf')[0]}`} />
              {others.map((x) => <ClubEventCard key={x.id} event={x} miles={miles} />)}
            </>
          ) : null}
          <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.xl }}>Preview build: listings are examples and entry goes to {SITE_HOST} for now.</T>
        </View>
      </ScrollView>

      <SavedSheet visible={confirm} onClose={() => setConfirm(false)} heading="Saved to your calendar" summary={`${title} at ${c.name}, ${when}`} emailNote="We’ll email you a reminder the day before" items={[clubEventItem(e)]} />
    </View>
  );
}

const s = StyleSheet.create({
  titleBlock: { marginTop: space.md },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: radius.md },
  save: { flex: 1, backgroundColor: colors.bg },
  saveOn: { backgroundColor: colors.accentSoft },
  enter: { flex: 1.6, backgroundColor: colors.sageDeep },
  detail: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44, paddingVertical: 10, borderTopWidth: hair, borderTopColor: colors.borderStrong },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
});
