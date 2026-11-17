import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Row, T } from './ui';
import { colors, hair, hairline, radius, space } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { findMyLocation, locationAnswer, refreshIfAllowed, sayNotNow, searchFromBase, useHere, useNotNow, type LocationAnswer } from '@/lib/here';

/**
 * Sits at the top of search. The first time, it asks whether PlusFore can search near where you
 * are (the phone then shows its own permission prompt). Once you've said yes it quietly keeps your
 * position up to date, and shows where you're searching from with a way back to your base town.
 */
export function NearHere({ base }: { base: string }) {
  const here = useHere();
  const notNow = useNotNow();
  const [answer, setAnswer] = useState<LocationAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [optedOut, setOptedOut] = useState(false);

  useEffect(() => {
    let live = true;
    locationAnswer().then((a) => {
      if (!live) return;
      setAnswer(a);
      if (a === 'granted') refreshIfAllowed();
    });
    return () => {
      live = false;
    };
  }, []);

  const useIt = async () => {
    haptic.select();
    setBusy(true);
    setOptedOut(false);
    const a = await findMyLocation();
    setBusy(false);
    setAnswer(a);
    if (a === 'granted') haptic.success();
  };

  if (answer === null) return null;

  if (here) {
    return (
      <Row gap={space.sm} style={s.line}>
        <Ionicons name="navigate" size={16} color={colors.sageDeep} />
        <T variant="small" style={{ flex: 1 }} numberOfLines={1}>
          Near you, in <T variant="smallStrong">{here.name}</T>
        </T>
        <Pressable onPress={() => { haptic.select(); setOptedOut(true); searchFromBase(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Search near ${base} instead`}>
          <T variant="smallStrong" color={colors.text}>Use {base}</T>
        </Pressable>
      </Row>
    );
  }

  // already allowed, so it's finding you, or you chose your base town for now
  if (answer === 'granted') {
    return (
      <Row gap={space.sm} style={s.line}>
        <Ionicons name="home-outline" size={16} color={colors.textMuted} />
        <T variant="small" style={{ flex: 1 }} numberOfLines={1}>Searching near <T variant="smallStrong">{base}</T></T>
        {busy && !optedOut ? (
          <ActivityIndicator size="small" color={colors.ink} />
        ) : (
          <Pressable onPress={useIt} hitSlop={10} accessibilityRole="button" accessibilityLabel="Search near where you are now">
            <T variant="smallStrong" color={colors.text}>Use where I am</T>
          </Pressable>
        )}
      </Row>
    );
  }

  if (answer === 'denied') {
    return (
      <Row gap={space.sm} style={s.line}>
        <Ionicons name="home-outline" size={16} color={colors.textMuted} />
        <T variant="small" style={{ flex: 1 }} numberOfLines={2}>Searching near <T variant="smallStrong">{base}</T>. Location is off for PlusFore.</T>
        {Platform.OS !== 'web' ? (
          <Pressable onPress={() => Linking.openSettings()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Turn on location in Settings">
            <T variant="smallStrong" color={colors.text}>Settings</T>
          </Pressable>
        ) : null}
      </Row>
    );
  }

  if (notNow) return null;

  return (
    <View style={s.card}>
      <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
        <View style={s.icon}><Ionicons name="navigate" size={18} color={colors.ink} /></View>
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">Search near where you are?</T>
          <T variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>
            Let PlusFore use your location to show games, opens and clubs close by. Otherwise we’ll search near {base}.
          </T>
        </View>
      </Row>
      <Row gap={space.sm} style={{ marginTop: space.md }}>
        <Button title="Not now" kind="ghost" size="md" onPress={() => { haptic.select(); sayNotNow(); }} style={{ flex: 1 }} />
        <Button title="Use my location" size="md" loading={busy} onPress={useIt} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, padding: space.lg, marginBottom: space.lg },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  line: { alignItems: 'center', paddingVertical: space.sm, marginBottom: space.md },
});
