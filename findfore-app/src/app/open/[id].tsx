import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseArt } from '@/components/cards';
import { ClubEventCard } from '@/components/club-event-card';
import { SavedSheet, dateLine } from '@/components/competition-sheets';
import { InterestedSection } from '@/components/interested-friends';
import { PlaceMap } from '@/components/place-map';
import { useToast } from '@/components/toast';
import { Button, EmptyState, IconButton, Row, SectionHeader, T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { CLUB_EVENTS, entryLabel, eventTitle, formatLabel, genderById } from '@/data/club-events';
import { courseById } from '@/data/courses';
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
  const { me } = useStore();
  const toast = useToast();
  const saved = useReminders().includes(id);
  const [confirm, setConfirm] = useState(false);
  const e = CLUB_EVENTS.find((x) => x.id === id);
  const c = e ? courseById(e.courseId) : undefined;
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
  const others = CLUB_EVENTS.filter((x) => x.courseId === c.id && x.id !== e.id);
  const isNew = e.listedDaysAgo <= 7;
  const when = dateLine(day, e.start);
  const details: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }[] = [
    { icon: genderById(e.gender).icon, label: 'Who can enter', value: `${genderById(e.gender).label}${e.seniors ? ' seniors' : ''}` },
    { icon: 'trophy-outline', label: 'Format', value: e.format === 'scramble' ? 'Texas scramble' : formatLabel(e.format) },
    { icon: 'golf-outline', label: 'Holes', value: `${e.holes} holes` },
    { icon: 'people-outline', label: 'Entry', value: entryLabel(e.entry) },
    { icon: 'speedometer-outline', label: 'Handicap limit', value: e.maxHandicap !== undefined ? `Up to ${e.maxHandicap}` : 'No limit' },
  ];

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
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={[s.heroWrap, { marginTop: insets.top + 6 }]}>
          <CourseArt course={c} height={230}>
            <View style={s.topBar}>
              <IconButton icon="chevron-back" label="Back" color={colors.onInk} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={s.glass} />
              <IconButton icon="share-outline" label="Share this open" color={colors.onInk} onPress={share} style={s.glass} />
            </View>
            <View style={s.hero}>
              <T variant="label" color={colors.white} style={s.eyebrow}>CLUB OPEN{isNew ? '  ·  NEW' : ''}</T>
              <T variant="title" color={colors.onInk} style={s.heroTitle}>{title}</T>
              <T variant="small" color={colors.onInkMuted}>{c.name}</T>
            </View>
          </CourseArt>
        </View>

        <View style={[ui.contentWidth, ui.padded]}>
          <View style={[ui.card, s.facts]}>
            {[
              { top: shortDate(day), bottom: `from ${e.start}` },
              { top: `£${e.fee}`, bottom: 'to enter' },
              { top: `${e.placesLeft}`, bottom: e.placesLeft === 1 ? 'place left' : 'places left' },
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
            <Pressable onPress={() => Linking.openURL(ENTRY_URL)} accessibilityRole="link" accessibilityLabel={`Enter ${title}, opens the entry page`} style={({ pressed }) => [s.btn, s.enter, pressed && ui.pressed]}>
              <T variant="bodyStrong" color={colors.ink}>Enter this open</T>
              <Ionicons name="open-outline" size={16} color={colors.ink} />
            </Pressable>
          </Row>

          <InterestedSection eventId={e.id} />

          <SectionHeader title="About this open" />
          <T variant="body" color={colors.textMuted}>
            {e.format === 'scramble' ? 'A Texas scramble' : `A ${formatLabel(e.format).toLowerCase()} competition`} over {e.holes} holes at {c.name}, played as {entryLabel(e.entry).toLowerCase()} entries. First tee time is {e.start} on {shortDate(day)}. {e.placesLeft <= 6 ? `Only ${e.placesLeft} places are left, so don’t wait long.` : `There are ${e.placesLeft} places left at the moment.`} Entry is £{e.fee}{e.maxHandicap !== undefined ? ` and the handicap limit is ${e.maxHandicap}` : ''}.
          </T>

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
          <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.xl }}>Preview build: listings are examples and entry goes to findfore.app for now.</T>
        </View>
      </ScrollView>

      <SavedSheet visible={confirm} onClose={() => setConfirm(false)} heading="Saved to your calendar" summary={`${title} at ${c.name}, ${when}`} emailNote="We’ll email you a reminder the day before" items={[clubEventItem(e)]} />
    </View>
  );
}

const s = StyleSheet.create({
  heroWrap: { marginHorizontal: space.md, borderRadius: radius.panel, overflow: 'hidden', backgroundColor: colors.ink },
  topBar: { position: 'absolute', top: 12, left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  glass: { backgroundColor: 'rgba(11,11,11,0.55)', borderColor: 'rgba(255,255,255,0.12)' },
  hero: { position: 'absolute', bottom: space.xl, left: 0, right: 0, paddingHorizontal: space.xl },
  heroTitle: { marginTop: space.xs, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 10 },
  eyebrow: { letterSpacing: 1.4, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  facts: { marginTop: space.lg, flexDirection: 'row', paddingVertical: space.lg },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: radius.pill },
  save: { flex: 1, backgroundColor: colors.bg },
  saveOn: { backgroundColor: colors.limeSoft },
  enter: { flex: 1.6, backgroundColor: colors.lime },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
