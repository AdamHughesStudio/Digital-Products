import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { parseHandicap, PlacePicker, RadiusPicker, ToggleRow } from '@/components/form';
import { Button, Field, FormLabel, Screen, T, TopBar, styles as ui } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import { handicapLabel } from '@/lib/format';

export default function EditProfile() {
  const { me, updateProfile } = useStore();
  const [firstName, setFirst] = useState(me?.firstName ?? '');
  const [lastName, setLast] = useState(me?.lastName ?? '');
  const [hcp, setHcp] = useState(me ? handicapLabel(me.handicap) : '');
  const [homeClub, setHomeClub] = useState(me?.homeClub ?? '');
  const [place, setPlace] = useState(me?.location);
  const [radius, setRadius] = useState(me?.radiusMiles ?? 25);
  const [bio, setBio] = useState(me?.bio ?? '');
  const [showSurname, setShowSurname] = useState(me?.showSurname ?? true);
  const [showHomeClub, setShowHomeClub] = useState(me?.showHomeClub ?? true);

  if (!me) return null;
  const handicap = parseHandicap(hcp);
  const valid = firstName.trim() && lastName.trim() && handicap !== undefined && place;

  const save = () => {
    if (!valid || handicap === undefined || !place) return;
    updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      handicap,
      homeClub: homeClub.trim() || undefined,
      location: place,
      radiusMiles: radius,
      bio: bio.trim(),
      showSurname,
      showHomeClub,
    });
    router.back();
  };

  return (
    <View style={ui.screen}>
      <TopBar title="Edit profile" />
      <Screen footer={<Button title="Save changes" disabled={!valid} onPress={save} />}>
        <View style={{ gap: space.lg, marginTop: space.lg }}>
          <Field label="First name" value={firstName} onChangeText={setFirst} autoCapitalize="words" />
          <Field label="Surname" value={lastName} onChangeText={setLast} autoCapitalize="words" />
          <Field label="Handicap index" value={hcp} onChangeText={setHcp} keyboardType="numbers-and-punctuation" hint={me.handicapVerified ? 'Verified' : 'Self reported. Verification is coming soon.'} />
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
