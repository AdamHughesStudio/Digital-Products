import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ForwardMark, HeroArt } from '@/components/hero-art';
import { SignIn } from '@/components/sign-in';
import { useToast } from '@/components/toast';
import { usePickProfilePhoto } from '@/components/photo-cropper';
import { currentUserId, fetchMyProfile, golferPatch, saveMyProfile, uploadProfilePhoto, useUsernameTaken } from '@/lib/cloud';
import { NO_HANDICAP } from '@/lib/format';
import { linkPhoneToAccount, pushState, turnOnPush, type PushState } from '@/lib/push';
import { parseHandicap, PlacePicker, RadiusPicker, ToggleRow } from '@/components/form';
import { Button, Field, FormLabel, IconButton, Row, T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { places } from '@/data/courses';
import { useStore } from '@/data/store';
import { normaliseUsername, suggestUsername, usernameError, usernameTaken } from '@/lib/username';
import type { Place } from '@/data/types';

const STEPS = 6;

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding, updateProfile } = useStore();
  const toast = useToast();
  const pickProfilePhoto = usePickProfilePhoto();
  const [step, setStep] = useState(0);
  // signing in comes before the profile steps; signedIn means the profile is saved to an account
  const [authMode, setAuthMode] = useState<'signup' | 'login' | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  // every account has a photo, so golfers know who they're meeting
  const [photo, setPhoto] = useState<string | null>(null);
  const [hero, setHero] = useState({ w: 0, h: 0 });
  const [contentTop, setContentTop] = useState(0);
  const { state } = useStore();
  const [firstName, setFirst] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [lastName, setLast] = useState('');
  const [hcp, setHcp] = useState('');
  const [noHcp, setNoHcp] = useState(false);
  const [homeClub, setHomeClub] = useState('');
  const [place, setPlace] = useState<Place>(places[0]);
  const [radius, setRadius] = useState(25);
  const [bio, setBio] = useState('');
  const [showSurname, setShowSurname] = useState(true);
  const [showHomeClub, setShowHomeClub] = useState(true);

  const handicap = noHcp ? NO_HANDICAP : parseHandicap(hcp);
  const hcpError = !noHcp && hcp.trim() !== '' && handicap === undefined;
  useEffect(() => {
    if (!usernameTouched && firstName.trim() && lastName.trim()) setUsername(suggestUsername(firstName.trim(), lastName.trim(), state));
  }, [firstName, lastName, usernameTouched, state]);
  const takenOnline = useUsernameTaken(username, signedIn);
  const usernameProblem = usernameError(username) ?? (usernameTaken(state, username) || takenOnline ? 'That one’s taken' : null);
  const canNext =
    step === 1 ? firstName.trim().length > 0 && lastName.trim().length > 0 && !usernameProblem : step === 2 ? !!photo : step === 3 ? handicap !== undefined : true;

  // the last step asks about notifications; what it offers depends on what this phone can do
  const [push, setPush] = useState<PushState | null>(null);
  useEffect(() => {
    if (step === STEPS) pushState().then(setPush);
  }, [step]);
  const enableAndFinish = async () => {
    // asked straight from the tap, as iPhone requires
    setPush(await turnOnPush());
    finish();
  };

  const choosePhoto = async () => {
    const uri = await pickProfilePhoto();
    if (uri) setPhoto(uri);
  };

  const finish = async () => {
    const profile = { firstName, lastName, username, handicap: handicap ?? 18, location: place, radiusMiles: radius, homeClub, bio, showSurname, showHomeClub };
    if (!photo) return setStep(2);
    let photoUri = photo;
    if (signedIn) {
      setSaving(true);
      const r = await saveMyProfile(profile, true);
      if (!r.ok) {
        setSaving(false);
        toast(r.error, { icon: 'alert-circle-outline' });
        if (r.code === 'taken') setStep(1);
        return;
      }
      const up = await uploadProfilePhoto(photo);
      setSaving(false);
      if (!up.ok) return toast(up.error, { icon: 'alert-circle-outline' });
      photoUri = up.value;
      // now the account exists, notifications on this phone can be tied to it
      linkPhoneToAccount();
    }
    completeOnboarding(profile);
    // keep the exact username the account has, even if a demo golfer shares it
    updateProfile(signedIn ? { username, photoUri } : { photoUri });
    router.replace('/');
  };

  // after the code is checked: returning golfers go straight in, new ones make their profile
  const afterSignIn = async () => {
    const r = await fetchMyProfile();
    if (!r.ok) return toast(r.error, { icon: 'alert-circle-outline' });
    if (r.value) {
      const p = r.value;
      completeOnboarding({ ...p });
      updateProfile(golferPatch(p));
      toast(`Welcome back, ${p.firstName}`);
      router.replace('/');
      return;
    }
    setSignedIn(true);
    setAuthMode(null);
    setStep(1);
  };

  const start = async (mode: 'signup' | 'login') => {
    // already signed in from an earlier visit that stopped part way through
    if (await currentUserId()) return afterSignIn();
    setAuthMode(mode);
  };

  if (authMode) return <SignIn mode={authMode} onBack={() => setAuthMode(null)} onSignedIn={afterSignIn} />;

  if (step === 0) {
    return (
      <View style={ui.screen}>
        <View style={[ui.contentWidth, { flex: 1, paddingHorizontal: space.md, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
          <View style={s.hero} onLayout={(e) => setHero({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <LinearGradient colors={['#1F3D1F', '#122612', '#0C140C', colors.ink]} locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />
            <HeroArt width={hero.w} height={hero.h} openTop={space.xxl + 28 + 24} openBottom={contentTop - 24} />
            <Image source={require('@/assets/images/logo-light.png')} style={{ width: 150, height: 28 }} contentFit="contain" accessibilityLabel="PlusFore" />
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <View onLayout={(e) => setContentTop(space.xxl + 28 + e.nativeEvent.layout.y)}>
                {/* short lime accent on the card edge, level with the lime line */}
                <View style={s.edgeAccent} />
                <T variant="display" color={colors.onInk} style={{ fontSize: 48, lineHeight: 48 }}>
                  Find your{'\n'}next game{'\n'}<T variant="display" color={colors.white} style={{ fontSize: 48, lineHeight: 48 }}>of golf.</T>
                </T>
              </View>
              <T variant="body" color={colors.onInkMuted} style={{ marginTop: space.lg, fontSize: 16, lineHeight: 24, maxWidth: 340 }}>
                Golfers near you who want a game. Opens and championships worth entering. And a way onto great courses that isn’t the rack rate.
              </T>
              <View style={{ marginTop: space.xl, gap: space.sm }}>
                <View style={s.forward}>
                  <ForwardMark />
                </View>
                {['Every UK open, one tap from entry', 'A nudge before entries close', 'Play as a guest, not a visitor'].map((t) => (
                  <Row key={t} gap={10}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                    <T variant="bodyStrong" color={colors.onInk}>{t}</T>
                  </Row>
                ))}
              </View>
            </View>
          </View>
          <Button title="Sign up" onPress={() => start('signup')} style={{ marginTop: space.lg }} />
          <Button title="Log in" kind="secondary" onPress={() => start('login')} style={{ marginTop: space.sm }} />
        </View>
      </View>
    );
  }

  return (
    <View style={ui.screen}>
      <View style={[ui.contentWidth, ui.padded, { paddingTop: insets.top + 8 }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon="chevron-back" label="Back" onPress={() => (step === 1 && signedIn ? setStep(0) : setStep(step - 1))} />
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
                <Field
                  label="Username"
                  value={username ? `@${username}` : ''}
                  onChangeText={(v) => { setUsernameTouched(true); setUsername(normaliseUsername(v)); }}
                  placeholder="@yourname"
                  autoCapitalize="none"
                  autoCorrect={false}
                  hint={username && usernameProblem ? usernameProblem : 'How golfers find you. Letters, numbers, dots and underscores.'}
                  error={!!username && !!usernameProblem}
                />
              </View>
              <ToggleRow label="Show my full surname" detail={`Off shows you as ${firstName.trim() || 'Adam'} ${lastName.trim().charAt(0) || 'H'}.`} value={showSurname} onChange={setShowSurname} />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>Add your photo</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>
                Every golfer on PlusFore has one, so you know who you’re meeting on the first tee. A clear photo of your face works best.
              </T>
              <Pressable onPress={choosePhoto} accessibilityRole="button" accessibilityLabel={photo ? 'Change your photo' : 'Choose a photo'} style={s.photoWrap}>
                {photo ? (
                  <Image source={{ uri: photo }} style={s.photo} contentFit="cover" />
                ) : (
                  <View style={[s.photo, s.photoEmpty]}>
                    <Ionicons name="camera" size={40} color={colors.textMuted} />
                  </View>
                )}
                <View style={s.photoBadge}>
                  <Ionicons name={photo ? 'refresh' : 'add'} size={20} color={colors.ink} />
                </View>
              </Pressable>
              <Button title={photo ? 'Choose a different photo' : 'Choose a photo'} kind={photo ? 'ghost' : 'dark'} icon="image-outline" onPress={choosePhoto} style={{ marginTop: space.xl, alignSelf: 'center' }} />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>Your golf</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>Every standard is welcome. Your handicap just helps hosts plan the game.</T>
              <View style={{ gap: space.lg, marginTop: space.xl }}>
                {!noHcp ? (
                  <Field
                    label="Handicap index"
                    value={hcp}
                    onChangeText={setHcp}
                    error={hcpError}
                    placeholder="e.g. 14.2"
                    keyboardType="numbers-and-punctuation"
                    hint={hcpError ? 'Enter a number between +10 and 54, for example 14.2' : 'Use + for a plus handicap. For now it shows as self reported.'}
                  />
                ) : null}
                <ToggleRow label="I don’t have a handicap yet" detail="No problem. Hosts will see you’re new to golf, and plenty of games welcome any standard." value={noHcp} onChange={setNoHcp} />
                <Field label="Home club (optional)" value={homeClub} onChangeText={setHomeClub} placeholder="e.g. Haggs Castle Golf Club" autoCapitalize="words" />
              </View>
              {homeClub.trim() ? <ToggleRow label="Show my home club" value={showHomeClub} onChange={setShowHomeClub} /> : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>Where do you play?</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>We only show your approximate area, never an exact location.</T>
              <FormLabel>Your area</FormLabel>
              <PlacePicker value={place} onChange={setPlace} />
              <FormLabel>How far will you travel?</FormLabel>
              <RadiusPicker value={radius} onChange={setRadius} />
            </>
          ) : null}

          {step === 5 ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>A bit about you</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>A line or two helps golfers know what kind of game to expect.</T>
              <View style={{ marginTop: space.xl }}>
                <Field value={bio} onChangeText={setBio} placeholder="Weekend golfer, love links courses, always up for a pint after." multiline maxLength={240} hint={`${bio.length}/240`} />
              </View>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <T variant="display" style={{ marginTop: space.xl }}>{push === 'on' ? 'Notifications are on' : 'Stay in the loop'}</T>
              <T variant="body" color={colors.textMuted} style={{ marginTop: space.sm }}>
                {push === 'on'
                  ? 'You’ll hear about requests, replies and invites. Change what you get any time in Settings.'
                  : push === 'blocked'
                    ? 'Notifications are turned off for PlusFore in your phone’s settings. You can turn them on there whenever you like.'
                    : push === 'needs-home-screen'
                      ? 'To get notifications on iPhone, add PlusFore to your Home Screen first: tap Share, then Add to Home Screen. You can turn them on later in Settings.'
                      : push === 'unsupported'
                        ? 'This browser can’t show notifications, but you’ll still see everything in the app.'
                        : 'Want a heads up when someone asks to join your game, replies to you or invites you to play? Nothing else, and you can change it any time in Settings.'}
              </T>
              <View style={{ gap: space.sm, marginTop: space.xl }}>
                {[
                  { title: 'Ryan wants to join your game', body: 'Haggs Castle, Saturday at 09:10' },
                  { title: 'James accepted your request', body: 'You’re in for The Carrick, Sunday at 13:10.' },
                  { title: 'Sam · Western Gailes', body: 'Meet by the pro shop 20 minutes before?' },
                ].map((n) => (
                  <View key={n.title} style={s.note}>
                    <View style={s.noteIcon}>
                      <Ionicons name="flag" size={16} color={colors.ink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <T variant="smallStrong" numberOfLines={1} style={{ flex: 1 }}>{n.title}</T>
                        <T variant="caption" color={colors.textFaint}>now</T>
                      </Row>
                      <T variant="small" color={colors.textMuted} numberOfLines={1}>{n.body}</T>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      <View style={[ui.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={ui.contentWidth}>
          {step === STEPS && push === 'off' ? (
            <View style={{ gap: space.sm }}>
              <Button title="Turn on notifications" icon="notifications-outline" loading={saving} onPress={enableAndFinish} />
              <Button title="Not now" kind="ghost" disabled={saving} onPress={finish} />
            </View>
          ) : (
            <Button title={step === STEPS ? 'Start finding games' : 'Continue'} disabled={!canNext || (step === STEPS && push === null)} loading={saving} onPress={() => (step === STEPS ? finish() : setStep(step + 1))} />
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  noteIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  photoWrap: { alignSelf: 'center', marginTop: space.xxl },
  photo: { width: 168, height: 168, borderRadius: 84 },
  photoEmpty: { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.borderStrong },
  photoBadge: { position: 'absolute', right: 6, bottom: 6, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface },
  progress: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigh, marginTop: space.md, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.ink },
  hero: { flex: 1, borderRadius: radius.panel, overflow: 'hidden', padding: space.xl, paddingTop: space.xxl, backgroundColor: colors.ink },
  edgeAccent: { position: 'absolute', left: -space.xl, bottom: 7, width: 4, height: 36, borderTopRightRadius: 2, borderBottomRightRadius: 2, backgroundColor: colors.white },
  forward: { position: 'absolute', right: 0, bottom: 4 },
});
