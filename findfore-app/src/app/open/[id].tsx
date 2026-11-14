import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavSpace } from '@/components/bottom-nav';
import { CourseArt, PhotoCredit } from '@/components/cards';
import { ClubEventCard } from '@/components/club-event-card';
import { SavedSheet, dateLine } from '@/components/competition-sheets';
import { InterestedSection } from '@/components/interested-friends';
import { PlaceMap } from '@/components/place-map';
import { useToast } from '@/components/toast';
import { Button, EmptyState, IconButton, Row, SectionHeader, T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
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
        <View style={[s.heroWrap, { marginTop: insets.top + 6 }]}>
          <CourseArt course={c} height={230}>
            <View style={s.topBar}>
              <IconButton icon="chevron-back" label="Back" color={colors.onInk} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.glass} />
              <IconButton icon="share-outline" label="Share this open" color={colors.onInk} onPress={share} style={s.glass} />
            </View>
            <View style={s.hero}>
              <T variant="label" color={colors.white} style={s.eyebrow}>Club open{isNew ? ' · New' : ''}</T>
              <T variant="title" color={colors.onInk} style={s.heroTitle}>{title}</T>
              <T variant="small" color={colors.onInkMuted}>{c.name}</T>
            </View>
          </CourseArt>
        </View>
        <PhotoCredit course={c} />

        <View style={[ui.contentWidth, ui.padded]}>
          <View style={[ui.card, s.facts]}>
            {[
              { top: shortDate(day), bottom: lastDay ? `to ${shortDate(lastDay)}` : e.start ? `from ${e.start}` : 'tee times from club' },
              { top: e.fee !== undefined ? `£${Number.isInteger(e.fee) ? e.fee : e.fee.toFixed(2)}` : 'See club', bottom: e.fee === undefined ? 'to enter' : e.feeBasis === 'per pair' ? 'a pair to enter' : e.feeBasis === 'per team' ? 'a team to enter' : 'to enter' },
              { top: e.holes ? `${e.holes}` : '–', bottom: 'holes' },
            ].map((f, i) => (
              <View key={f.bottom} style={{ flex: 1, flexDirection: 'row' }}>
                {i > 0 ? <View style={s.divider} /> : null}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <T variant="heading">{f.top}</T>
                  <T variant="caption" color={colors.textMuted}>{f.bottom}</T>
                </View>
              </View>
            ))}
          </View>

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
          <View style={ui.panel}>
            {details.map((d, i) => (
              <View key={d.label} style={[ui.panelRow, i > 0 && ui.panelDivider]}>
                <View style={s.icon}><Ionicons name={d.icon} size={16} color={colors.ink} /></View>
                <T variant="body" color={colors.textMuted} style={{ flex: 1 }}>{d.label}</T>
                <T variant="bodyStrong">{d.value}</T>
              </View>
            ))}
          </View>

          <SectionHeader title="The club" />
          <Pressable onPress={() => router.push(`/club/${c.id}`)} accessibilityRole="button" accessibilityLabel={`${c.name} club profile`} style={({ pressed }) => [ui.card, s.clubRow, pressed && ui.pressed]}>
            <View style={{ flex: 1 }}>
              <T variant="heading">{c.name}</T>
              <T variant="small" color={colors.textMuted}>{c.town === c.region ? c.town : `${c.town}, ${c.region}`} · {milesLabel(miles)} from {me.location.name}</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
          <View style={{ marginTop: space.lg }}>
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
  heroWrap: { marginHorizontal: space.md, borderRadius: radius.panel, overflow: 'hidden', backgroundColor: colors.ink },
  topBar: { position: 'absolute', top: 12, left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  glass: { backgroundColor: 'rgba(15,26,20,0.55)', borderColor: 'rgba(255,255,255,0.12)' },
  hero: { position: 'absolute', bottom: space.xl, left: 0, right: 0, paddingHorizontal: space.xl },
  heroTitle: { marginTop: space.xs, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 10 },
  eyebrow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  facts: { marginTop: space.lg, flexDirection: 'row', paddingVertical: space.lg },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: radius.pill },
  save: { flex: 1, backgroundColor: colors.bg },
  saveOn: { backgroundColor: colors.accentSoft },
  enter: { flex: 1.6, backgroundColor: colors.sageDeep },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
