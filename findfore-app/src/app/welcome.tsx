import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseHandicap, PlacePicker, RadiusPicker, ToggleRow } from '@/components/form';
import { Button, Field, FormLabel, IconButton, Row, T, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { places } from '@/data/courses';
import { useStore } from '@/data/store';
import type { Place } from '@/data/types';

const STEPS = 4;

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const [firstName, setFirst] = useState('');
  const [lastName, setLast] = useState('');
  const [hcp, setHcp] = useState('');
  const [homeClub, setHomeClub] = useState('');
  const [place, setPlace] = useState<Place>(places[0]);
  const [radius, setRadius] = useState(25);
  const [bio, setBio] = useState('');
  const [showSurname, setShowSurname] = useState(true);
  const [showHomeClub, setShowHomeClub] = useState(true);

  const handicap = parseHandicap(hcp);
  const canNext = step === 1 ? firstName.trim().length > 0 && lastName.trim().length > 0 : step === 2 ? handicap !== undefined : true;

  const finish = () => {
    completeOnboarding({ firstName, lastName, handicap: handicap ?? 18, location: place, radiusMiles: radius, homeClub, bio, showSurname, showHomeClub });
    router.replace('/');
  };

  const demo = () => {
    completeOnboarding({
      firstName: 'Adam',
      lastName: 'Hughes',
      handicap: 12.4,
      location: places[0],
      radiusMiles: 25,
      homeClub: 'Haggs Castle Golf Club',
      bio: 'Glasgow based, playing most weekends. Always keen to try new courses and meet new people.',
    });
    router.replace('/');
  };

  if (step === 0) {
    return (
      <View style={ui.screen}>
        <LinearGradient colors={['#1F3D1F', '#0F1F0F', colors.ink]} locations={[0, 0.45, 0.85]} style={StyleSheet.absoluteFill} />
        <View style={[ui.contentWidth, ui.padded, { flex: 1, paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
          <Image source={require('@/assets/images/logo-light.png')} style={{ width: 170, height: 32 }} contentFit="contain" accessibilityLabel="FindFore" />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <T variant="display" style={{ fontSize: 52, lineHeight: 52 }}>
              Find your{'\n'}next game{'\n'}<T variant="display" color={colors.lime} style={{ fontSize: 52, lineHeight: 52 }}>of golf.</T>
            </T>
            <T variant="body" color={colors.textMuted} style={{ marginTop: space.lg, fontSize: 17, lineHeight: 25, maxWidth: 360 }}>
              Fill the spaces in your tee time, find a game when you’re free, and play with golfers near you.
            </T>
            <View style={{ marginTop: space.xl, gap: space.sm }}>
              {['Post a tee time in under a minute', 'Request to join games nearby', 'Chat once you’re in'].map((t) => (
                <Row key={t} gap={10}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.lime} />
                  <T variant="bodyStrong">{t}</T>
                </Row>
              ))}
            </View>
          </View>
          <Button title="Create your profile" onPress={() => setStep(1)} />
          <Button title="Explore with a demo profile" kind="ghost" onPress={demo} style={{ marginTop: space.sm }} />
        </View>
      </View>
    );
  }

  return (
    <View style={ui.screen}>
      <View style={[ui.contentWidth, ui.padded, { paddingTop: insets.top + 8 }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon="chevron-back" label="Back" onPress={() => setStep(step - 1)} />
          <T variant="smallStrong" color={colors.textMuted}>Step {step} of {STEPS}</T>
          <View style={{ width: 40 }} />
        </Row>
        <View style={s.progress}>
          <View style={[s.progressFill, { width: `${(step / STEPS) * 100}%` }]} />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[ui.contentWidth, ui.padded]}>
          {step === 1 ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>What’s your name?</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>Golfers see this when you post or request a game.</T>
              <View style={{ gap: space.lg, marginTop: space.xl }}>
                <Field label="First name" value={firstName} onChangeText={setFirst} placeholder="First name" autoCapitalize="words" autoComplete="given-name" autoFocus />
                <Field label="Surname" value={lastName} onChangeText={setLast} placeholder="Surname" autoCapitalize="words" autoComplete="family-name" />
              </View>
              <ToggleRow label="Show my full surname" detail={`Off shows you as ${firstName.trim() || 'Adam'} ${lastName.trim().charAt(0) || 'H'}.`} value={showSurname} onChange={setShowSurname} />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>Your golf</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>Every standard is welcome. Your handicap just helps hosts plan the game.</T>
              <View style={{ gap: space.lg, marginTop: space.xl }}>
                <Field label="Handicap index" value={hcp} onChangeText={setHcp} placeholder="e.g. 14.2" keyboardType="numbers-and-punctuation" hint="Use + for a plus handicap. Verification comes later, for now it shows as self reported." />
                <Field label="Home club (optional)" value={homeClub} onChangeText={setHomeClub} placeholder="e.g. Haggs Castle Golf Club" autoCapitalize="words" />
              </View>
              {homeClub.trim() ? <ToggleRow label="Show my home club" value={showHomeClub} onChange={setShowHomeClub} /> : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>Where do you play?</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>We only show your approximate area, never an exact location.</T>
              <FormLabel>Your area</FormLabel>
              <PlacePicker value={place} onChange={setPlace} />
              <FormLabel>How far will you travel?</FormLabel>
              <RadiusPicker value={radius} onChange={setRadius} />
            </>
          ) : null}

          {step === 4 ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>A bit about you</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>A line or two helps golfers know what kind of game to expect.</T>
              <View style={{ marginTop: space.xl }}>
                <Field value={bio} onChangeText={setBio} placeholder="Weekend golfer, love links courses, always up for a pint after." multiline maxLength={240} hint={`${bio.length}/240`} />
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      <View style={[ui.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={ui.contentWidth}>
          <Button title={step === STEPS ? 'Start finding games' : 'Continue'} disabled={!canNext} onPress={() => (step === STEPS ? finish() : setStep(step + 1))} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  progress: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigh, marginTop: space.md, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.lime },
});
