import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { parseHandicap, PlacePicker, RadiusPicker, ToggleRow } from '@/components/form';
import { Avatar, Button, Field, FormLabel, Row, Screen, T, TopBar, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { useToast } from '@/components/toast';
import { useStore } from '@/data/store';
import { normaliseUsername, usernameError, usernameTaken } from '@/lib/username';
import { handicapLabel, NO_HANDICAP } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { pickProfilePhoto } from '@/lib/photo';
import { removeProfilePhoto, saveMyProfile, uploadProfilePhoto, useSession, useUsernameTaken } from '@/lib/cloud';

export default function EditProfile() {
  const { me, state, updateProfile } = useStore();
  const toast = useToast();
  const [firstName, setFirst] = useState(me?.firstName ?? '');
  const [lastName, setLast] = useState(me?.lastName ?? '');
  const [username, setUsername] = useState(me?.username ?? '');
  const [noHcp, setNoHcp] = useState(!!me && me.handicap >= NO_HANDICAP);
  const [hcp, setHcp] = useState(me && me.handicap < NO_HANDICAP ? handicapLabel(me.handicap) : '');
  const [homeClub, setHomeClub] = useState(me?.homeClub ?? '');
  const [place, setPlace] = useState(me?.location);
  const [radius, setRadius] = useState(me?.radiusMiles ?? 25);
  const [bio, setBio] = useState(me?.bio ?? '');
  const [showSurname, setShowSurname] = useState(me?.showSurname ?? true);
  const [showHomeClub, setShowHomeClub] = useState(me?.showHomeClub ?? true);
  const signedIn = !!useSession();
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const takenOnline = useUsernameTaken(username, signedIn, me?.username);

  if (!me) return null;
  const handicap = noHcp ? NO_HANDICAP : parseHandicap(hcp);
  const hcpError = !noHcp && hcp.trim() !== '' && handicap === undefined;
  const usernameProblem = usernameError(username) ?? (usernameTaken(state, username, me.id) || takenOnline ? 'That one’s taken' : null);
  const valid = firstName.trim() && lastName.trim() && !usernameProblem && handicap !== undefined && place;

  const hasPhoto = !!(me.photoUri || me.avatar);
  const choosePhoto = async () => {
    const uri = await pickProfilePhoto();
    if (!uri) return;
    if (signedIn) {
      setPhotoBusy(true);
      const r = await uploadProfilePhoto(uri);
      setPhotoBusy(false);
      if (!r.ok) return toast(r.error, { icon: 'alert-circle-outline' });
      updateProfile({ photoUri: r.value, avatar: undefined });
    } else {
      updateProfile({ photoUri: uri });
    }
    haptic.success();
    toast('Photo updated', { icon: 'camera' });
  };
  const removePhoto = async () => {
    if (signedIn) {
      const r = await removeProfilePhoto();
      if (!r.ok) return toast(r.error, { icon: 'alert-circle-outline' });
    }
    updateProfile({ photoUri: undefined, avatar: undefined });
    toast('Photo removed', { icon: 'trash-outline' });
  };

  const save = async () => {
    if (!valid || handicap === undefined || !place) return;
    const patch = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username,
      handicap,
      homeClub: homeClub.trim() || undefined,
      location: place,
      radiusMiles: radius,
      bio: bio.trim(),
      showSurname,
      showHomeClub,
    };
    if (signedIn) {
      setSaving(true);
      const r = await saveMyProfile(patch);
      setSaving(false);
      if (!r.ok) return toast(r.error, { icon: 'alert-circle-outline' });
    }
    updateProfile(patch);
    toast('Profile updated');
    router.back();
  };

  return (
    <View style={ui.screen}>
      <TopBar title="Edit profile" />
      <Screen footer={<Button title="Save changes" disabled={!valid} loading={saving} onPress={save} />}>
        <View style={s.photo}>
          <Pressable onPress={choosePhoto} accessibilityRole="button" accessibilityLabel={hasPhoto ? 'Change your photo' : 'Add a photo'}>
            <Avatar golfer={me} size={96} />
          </Pressable>
          <Row gap={space.sm} style={{ marginTop: space.md }}>
            <Button title={hasPhoto ? 'Change photo' : 'Add a photo'} kind="dark" size="sm" icon="camera-outline" loading={photoBusy} onPress={choosePhoto} />
            {hasPhoto ? <Button title="Remove" kind="ghost" size="sm" onPress={removePhoto} /> : null}
          </Row>
          {!hasPhoto ? <T variant="small" color={colors.textMuted} style={{ marginTop: space.sm, textAlign: 'center' }}>Hosts are much more likely to say yes when they can see who’s joining.</T> : null}
        </View>
        <View style={{ gap: space.lg, marginTop: space.lg }}>
          <Field label="First name" value={firstName} onChangeText={setFirst} autoCapitalize="words" />
          <Field label="Surname" value={lastName} onChangeText={setLast} autoCapitalize="words" />
          <Field label="Username" value={`@${username}`} onChangeText={(v) => setUsername(normaliseUsername(v))} autoCapitalize="none" autoCorrect={false} hint={usernameProblem ?? 'How golfers find you'} error={!!usernameProblem} />
          {!noHcp ? (
            <Field
              label="Handicap index"
              value={hcp}
              onChangeText={setHcp}
              error={hcpError}
              keyboardType="numbers-and-punctuation"
              hint={hcpError ? 'Enter a number between +10 and 54, for example 14.2' : me.handicapVerified ? 'Verified' : 'Self reported. Verification is coming soon.'}
            />
          ) : null}
          <ToggleRow label="I don’t have a handicap yet" value={noHcp} onChange={setNoHcp} />
          <Field label="Home club (optional)" value={homeClub} onChangeText={setHomeClub} autoCapitalize="words" />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline maxLength={240} />
        </View>

        <FormLabel>Your area</FormLabel>
        <PlacePicker value={place} onChange={setPlace} />
        <FormLabel>Search radius</FormLabel>
        <RadiusPicker value={radius} onChange={setRadius} />

        <FormLabel>Privacy</FormLabel>
        <T variant="small" color={colors.textMuted}>Your exact location is never shown, only your area.</T>
        <ToggleRow label="Show my full surname" detail={`Off shows you as ${firstName || me.firstName} ${(lastName || me.lastName).charAt(0)}.`} value={showSurname} onChange={setShowSurname} />
        <ToggleRow label="Show my home club" value={showHomeClub} onChange={setShowHomeClub} />
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  photo: { alignItems: 'center', marginTop: space.lg },
});
