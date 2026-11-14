import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavSpace } from '@/components/bottom-nav';
import { HeroButton, PageHero, PhotoCredit } from '@/components/cards';
import { SavedSheet } from '@/components/competition-sheets';
import { EventCard } from '@/components/event-card';
import { InterestedSection } from '@/components/interested-friends';
import { PlaceMap } from '@/components/place-map';
import { useToast } from '@/components/toast';
import { EmptyState, IconButton, Row, SectionHeader, T, styles as ui } from '@/components/ui';
import { colors, hair, radius, space } from '@/constants/theme';
import { courses } from '@/data/courses';
import { addDays, associationById, EVENTS, entryStatus, toggleReminder, useReminders } from '@/data/events';
import { nationalEventItems } from '@/lib/calendar';
import { shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { shareLink } from '@/lib/share';


/** The page for one national championship: the dates that matter, where it is played, and how to enter. */
export default function ChampionshipProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  // room for the bottom bar, which stays on this page
  const nav = useNavSpace();
  const toast = useToast();
  const saved = useReminders().includes(id);
  const [confirm, setConfirm] = useState(false);
  const e = EVENTS.find((x) => x.id === id);
  if (!e) {
    return (
      <View style={ui.screen}>
        <View style={{ paddingTop: insets.top }}><IconButton icon="chevron-back" label="Back" onPress={() => router.back()} style={{ marginLeft: space.md }} /></View>
        <EmptyState icon="flag-outline" title="Championship not found" body="This championship isn’t listed any more." />
      </View>
    );
  }
  const assoc = associationById(e.association);
  const status = entryStatus(e);
  const isOpen = status.kind === 'open' || status.kind === 'closing';
  const venue = courses.find((c) => c.name.toLowerCase().startsWith(e.venue.toLowerCase()));
  const first = addDays(e.playedIn);
  const last = addDays(e.playedIn + e.days - 1);
  const dates = e.days > 1 ? `${shortDate(first)} to ${shortDate(last)}` : shortDate(first);
  const others = EVENTS.filter((x) => x.association === e.association && x.id !== e.id);
  const timeline: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; done: boolean }[] = [
    { icon: 'lock-open-outline', label: 'Entry opens', value: e.opensIn <= 0 ? 'Open now' : shortDate(addDays(e.opensIn)), done: e.opensIn <= 0 },
    { icon: 'time-outline', label: 'Entry closes', value: shortDate(addDays(e.closesIn)), done: false },
    { icon: 'flag-outline', label: 'Played', value: dates, done: false },
  ];

  const remind = () => {
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
    const r = await shareLink(e.title, `/championship/${e.id}`);
    if (r === 'copied') toast('Link copied', { icon: 'link' });
  };

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 + nav }} showsVerticalScrollIndicator={false}>
        <PageHero course={venue}>
          {(onPhoto) => (
            <>
              <HeroButton icon="chevron-back" label="Back" onPhoto={onPhoto} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
              <HeroButton icon="share-outline" label="Share this championship" onPhoto={onPhoto} onPress={share} />
            </>
          )}
        </PageHero>

        <View style={[ui.contentWidth, ui.padded]}>
          <View style={s.titleBlock}>
            <T variant="title" accessibilityRole="header">{e.title}</T>
            <T variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>{assoc.short} championship · {e.venue}</T>
            <PhotoCredit course={venue} />
          </View>

          <View style={s.status}>
            <View style={[s.dot, { backgroundColor: status.kind === 'closing' || status.kind === 'soon' ? '#D9A441' : isOpen ? colors.sage : colors.borderStrong }]} />
            <T variant="subheading" style={{ flex: 1 }}>{status.text}</T>
            <T variant="small" color={colors.textMuted} tabular>{e.days} day{e.days === 1 ? '' : 's'}</T>
          </View>

          <Row gap={space.sm} style={{ marginTop: space.lg }}>
            <Pressable onPress={remind} accessibilityRole="button" accessibilityState={{ selected: saved }} style={({ pressed }) => [s.btn, s.save, saved && s.saveOn, pressed && ui.pressed]}>
              <Ionicons name={saved ? 'checkmark-circle' : isOpen ? 'bookmark-outline' : 'notifications-outline'} size={17} color={colors.ink} />
              <T variant="bodyStrong">{saved ? 'Saved' : isOpen ? 'Save' : 'Remind me'}</T>
            </Pressable>
            <Pressable onPress={() => Linking.openURL(assoc.site)} accessibilityRole="link" accessibilityLabel={`${isOpen ? 'Enter' : 'Details'} on ${assoc.name}`} style={({ pressed }) => [s.btn, s.enter, pressed && ui.pressed]}>
              <T variant="bodyStrong" color={colors.onInk}>{isOpen ? 'Enter this championship' : 'Entry details'}</T>
              <Ionicons name="open-outline" size={16} color={colors.onInk} />
            </Pressable>
          </Row>

          <InterestedSection eventId={e.id} />

          <SectionHeader title="Key dates" />
          <View>
            {timeline.map((d, i) => (
              <View key={d.label} style={[s.detail, i === 0 && { borderTopWidth: 0, paddingTop: 0 }]} accessible accessibilityLabel={`${d.label}, ${d.value}${d.done ? ', passed' : ''}`}>
                <T variant="body" color={colors.textMuted} style={{ flex: 1 }}>{d.label}</T>
                {d.done ? <Ionicons name="checkmark" size={16} color={colors.sageDeep} /> : null}
                <T variant="bodyStrong" tabular>{d.value}</T>
              </View>
            ))}
          </View>

          <SectionHeader title="About" />
          <T variant="body" color={colors.textMuted}>
            The {e.title}, run by {assoc.name}, is played over {e.days} days at {e.venue}. It is one of the national amateur championships that golfers from across the country enter, so look at the entry conditions on the {assoc.short} site before you apply.
          </T>

          <SectionHeader title="Where it is played" />
          {venue ? (
            <>
              <Pressable onPress={() => router.push(`/club/${venue.id}`)} accessibilityRole="button" accessibilityLabel={`${venue.name} club profile`} style={({ pressed }) => [s.clubRow, pressed && ui.pressed]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T variant="subheading" numberOfLines={1}>{venue.name}</T>
                  <T variant="small" color={colors.textMuted}>{venue.town === venue.region ? venue.town : `${venue.town}, ${venue.region}`}</T>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
              <View style={{ marginTop: space.md }}><PlaceMap course={venue} /></View>
            </>
          ) : (
            <T variant="body" color={colors.textMuted}>
              <T variant="bodyStrong">{e.venue}. </T>
              The venue’s club profile and map are coming to PlusFore soon.
            </T>
          )}

          {others.length > 0 ? (
            <>
              <SectionHeader title={`More from ${assoc.short}`} />
              {others.map((x) => <EventCard key={x.id} event={x} onPress={() => router.push(`/championship/${x.id}`)} />)}
            </>
          ) : null}
          <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.xl }}>Preview build: dates are examples. Entry goes to the association’s own site.</T>
        </View>
      </ScrollView>

      <SavedSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        heading={isOpen ? 'Saved to your calendar' : 'Reminder set'}
        summary={`${e.title}, ${dates}`}
        emailNote={isOpen ? 'We’ll email you a reminder before it closes' : `We’ll email you the moment entry opens (${shortDate(addDays(e.opensIn))})`}
        items={nationalEventItems(e)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  titleBlock: { marginTop: space.md },
  // whether entry is open, between two rules
  status: { marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 14, borderTopWidth: hair, borderBottomWidth: hair, borderColor: colors.borderStrong },
  dot: { width: 8, height: 8, borderRadius: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: radius.md },
  save: { flex: 1, backgroundColor: colors.bg },
  saveOn: { backgroundColor: colors.accentSoft },
  enter: { flex: 1.6, backgroundColor: colors.sageDeep },
  detail: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, paddingVertical: 10, borderTopWidth: hair, borderTopColor: colors.borderStrong },
  clubRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
});
