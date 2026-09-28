import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Chip, ChipRow, Row, T } from './ui';
import { colors, space } from '@/constants/theme';
import { places } from '@/data/courses';
import type { Place } from '@/data/types';

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

export function ToggleRow({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={s.toggle} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong">{label}</T>
        {detail ? <T variant="caption" color={colors.textMuted}>{detail}</T> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.lime, false: colors.surfaceHigh }} thumbColor={value ? colors.ink : colors.textMuted} {...({ activeThumbColor: colors.ink } as object)} />
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
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});
