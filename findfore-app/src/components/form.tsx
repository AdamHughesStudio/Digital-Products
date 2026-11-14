import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Chip, ChipRow, Row, T } from './ui';
import { colors, radius, space } from '@/constants/theme';
import { places } from '@/data/courses';
import type { Place } from '@/data/types';
import { haptic } from '@/lib/haptics';

export const RADII = [5, 10, 15, 25, 50];

export function PlacePicker({ value, onChange }: { value?: Place; onChange: (p: Place) => void }) {
  return (
    <ChipRow>
      {places.map((p) => (
        <Chip key={p.name} label={p.name} selected={value?.name === p.name} onPress={() => onChange(p)} />
      ))}
    </ChipRow>
  );
}

export function RadiusPicker({ value, onChange, options = RADII }: { value: number; onChange: (m: number) => void; options?: number[] }) {
  return (
    <ChipRow>
      {options.map((m) => (
        <Chip key={m} label={`${m} miles`} selected={value === m} onPress={() => onChange(m)} />
      ))}
    </ChipRow>
  );
}

/**
 * The browser's own switch is a thin Material track, so the web app draws one with the proportions
 * of the iPhone's. It is only the picture: the row around it takes the tap and is the switch that
 * screen readers find.
 */
function WebSwitch({ value }: { value: boolean }) {
  const [on] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.timing(on, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [on, value]);
  return (
    <Animated.View pointerEvents="none" style={[s.track, { backgroundColor: on.interpolate({ inputRange: [0, 1], outputRange: [colors.surfaceHigh, colors.sageDeep] }) }]}>
      <Animated.View style={[s.thumb, { transform: [{ translateX: on.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
    </Animated.View>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  if (Platform.OS === 'web') return <WebSwitch value={value} />;
  return <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.sageDeep, false: colors.surfaceHigh }} ios_backgroundColor={colors.surfaceHigh} thumbColor={colors.white} />;
}

export function ToggleRow({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  const change = (v: boolean) => {
    haptic.select();
    onChange(v);
  };
  return (
    <Pressable onPress={() => change(!value)} style={s.toggle} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong">{label}</T>
        {detail ? <T variant="small" color={colors.textMuted}>{detail}</T> : null}
      </View>
      <Toggle value={value} onChange={change} />
    </Pressable>
  );
}

/** Accepts "12.4", "12" or "+2.1" (plus handicaps). Returns undefined when not a sensible handicap */
export function parseHandicap(text: string) {
  const t = text.trim().replace(',', '.');
  if (!t) return undefined;
  const plus = t.startsWith('+');
  const n = Number(plus ? t.slice(1) : t);
  if (Number.isNaN(n)) return undefined;
  const v = plus ? -n : n;
  if (v < -10 || v > 54) return undefined;
  return Math.round(v * 10) / 10;
}

export function Hint({ children }: { children: string }) {
  return (
    <Row gap={6} style={{ marginTop: space.sm }}>
      <T variant="caption" color={colors.textFaint}>{children}</T>
    </Row>
  );
}

const s = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md, minHeight: 52 },
  track: { width: 51, height: 31, borderRadius: radius.pill, padding: 2 },
  // the thumb's shadow is part of the control, as on the iPhone's own switch
  thumb: { width: 27, height: 27, borderRadius: radius.pill, backgroundColor: colors.white, shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
});
