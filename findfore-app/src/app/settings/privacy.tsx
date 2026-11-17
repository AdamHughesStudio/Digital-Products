import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ToggleRow } from '@/components/form';
import { useToast } from '@/components/toast';
import { Button, Row, Screen, SectionHeader, T, TopBar, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { setPrivacyChoice, usePrivacyChoices } from '@/data/privacy-choices';
import { useStore } from '@/data/store';
import { saveMyProfile, useSession } from '@/lib/cloud';
import { haptic } from '@/lib/haptics';
import { findMyLocation, locationAnswer, searchFromBase, useHere, type LocationAnswer } from '@/lib/here';

/**
 * Profile, then Privacy: what other golfers see, the phone's location, and the analytics and
 * advert choices. Analytics and adverts aren't in the app yet, so both start off and the screen
 * says so; when they arrive they read these choices before doing anything.
 */
export default function PrivacySettings() {
  const { me, updateProfile } = useStore();
  const session = useSession();
  const toast = useToast();
  const choices = usePrivacyChoices();
  const here = useHere();
  const [location, setLocation] = useState<LocationAnswer | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    locationAnswer().then(setLocation);
  }, []);

  if (!me) return null;

  // name and home club save to the account straight away, as the switch moves
  const profileSwitch = async (patch: { showSurname?: boolean; showHomeClub?: boolean }) => {
    const before = { showSurname: me.showSurname, showHomeClub: me.showHomeClub };
    updateProfile(patch);
    if (!session) return;
    const r = await saveMyProfile(patch);
    if (!r.ok) {
      updateProfile(before);
      toast(r.error, { icon: 'alert-circle-outline' });
    }
  };

  const allowLocation = async () => {
    setBusy(true);
    const a = await findMyLocation();
    setBusy(false);
    setLocation(a);
    if (a === 'granted') {
      haptic.success();
      toast('Searching near where you are', { icon: 'navigate' });
    }
  };

  const LOCATION_COPY: Record<LocationAnswer, { title: string; body: string }> = {
    granted: {
      title: 'Location is on',
      body: here
        ? `Searches and the map work from where you are now, near ${here.name}. Your location stays on this phone: it isn’t sent to PlusFore or shown to anyone.`
        : 'PlusFore can use where you are when you search. Your location stays on this phone: it isn’t sent to PlusFore or shown to anyone.',
    },
    undetermined: {
      title: 'Location isn’t on',
      body: `Searches work from ${me.location.name}, your base town. Turn location on to search near wherever you are instead. It stays on this phone.`,
    },
    denied: {
      title: 'Location is off',
      body: `Searches work from ${me.location.name}, your base town. ${Platform.OS === 'web' ? 'To change this, allow location for this site in your browser’s settings.' : 'To change this, turn on location for PlusFore in your phone’s Settings.'}`,
    },
  };
  const loc = location ? LOCATION_COPY[location] : null;

  return (
    <View style={ui.screen}>
      <TopBar title="Privacy" />
      <Screen>
        <SectionHeader title="What other golfers see" />
        <View style={ui.panel}>
          <ToggleRow label="Show my full surname" detail={`Off shows you as ${me.firstName} ${me.lastName.charAt(0)}.`} value={me.showSurname} onChange={(v) => profileSwitch({ showSurname: v })} />
          <View style={ui.panelDivider}>
            <ToggleRow label="Show my home club" detail={me.homeClub ? `Off hides ${me.homeClub} from your profile.` : 'You haven’t added a home club.'} value={me.showHomeClub} onChange={(v) => profileSwitch({ showHomeClub: v })} />
          </View>
        </View>
        <T variant="small" color={colors.textMuted} style={s.note}>
          Golfers always see your first name, username, photo, handicap and the town you play from. Nobody sees your email address.
        </T>

        <SectionHeader title="Location" />
        {loc ? (
          <View style={[s.card, location === 'granted' && s.cardOn]}>
            <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
              <View style={s.icon}>
                <Ionicons name={location === 'granted' ? 'navigate' : 'navigate-outline'} size={18} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{loc.title}</T>
                <T variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>{loc.body}</T>
              </View>
            </Row>
            {location === 'undetermined' ? (
              <Button title="Use my location" icon="navigate" size="md" loading={busy} onPress={allowLocation} style={{ marginTop: space.lg }} />
            ) : null}
            {location === 'granted' && here ? (
              <Button title={`Search from ${me.location.name} instead`} kind="ghost" size="md" onPress={() => { haptic.select(); searchFromBase(); }} style={{ marginTop: space.lg }} />
            ) : null}
            {location === 'granted' && !here ? (
              <Button title="Search near where I am" kind="ghost" size="md" loading={busy} onPress={allowLocation} style={{ marginTop: space.lg }} />
            ) : null}
            {location !== 'undetermined' && Platform.OS !== 'web' ? (
              <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" hitSlop={8} style={{ marginTop: space.md, alignSelf: 'flex-start' }}>
                <T variant="smallStrong" color={colors.text}>{location === 'granted' ? 'Turn off in Settings' : 'Open Settings'}</T>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <SectionHeader title="Analytics and adverts" />
        <View style={ui.panel}>
          <ToggleRow
            label="Help improve PlusFore"
            detail="Share which screens you use and any crashes, so we can fix problems and make the app better. Never your messages."
            value={choices.analytics}
            onChange={(v) => setPrivacyChoice('analytics', v)}
          />
          <View style={ui.panelDivider}>
            <ToggleRow
              label="Personalised adverts"
              detail="Show adverts picked using how you use apps and websites. Off, you still see adverts, just not ones chosen for you."
              value={choices.personalisedAds}
              onChange={(v) => setPrivacyChoice('personalisedAds', v)}
            />
          </View>
        </View>
        <T variant="small" color={colors.textMuted} style={s.note}>
          PlusFore doesn’t use analytics or show adverts yet. Both stay off unless you turn them on, and we’ll follow your choice here when we add them.
        </T>

        <SectionHeader title="Your information" />
        <View style={ui.panel}>
          <LinkRow icon="lock-closed-outline" label="Privacy policy" onPress={() => router.push('/legal/privacy' as never)} />
          <LinkRow icon="document-text-outline" label="Terms of use" onPress={() => router.push('/legal/terms' as never)} divider />
          <LinkRow icon="trash-outline" label="Delete your account" detail="From Profile, under Account. Removes everything." onPress={() => router.push('/profile' as never)} divider />
        </View>
      </Screen>
    </View>
  );
}

function LinkRow({ icon, label, detail, onPress, divider }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail?: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [ui.panelRow, divider && ui.panelDivider, pressed && ui.pressed]}>
      <Row gap={space.md} style={{ alignSelf: 'stretch', width: '100%' }}>
        <Ionicons name={icon} size={20} color={colors.text} />
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{label}</T>
          {detail ? <T variant="small" color={colors.textMuted}>{detail}</T> : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </Row>
    </Pressable>
  );
}

const s = StyleSheet.create({
  note: { marginTop: space.sm, marginHorizontal: space.xs },
  card: { backgroundColor: colors.mist, borderRadius: radius.lg, padding: space.lg },
  cardOn: { backgroundColor: colors.accentSoft },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
