import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip, ChipRow, T, styles as ui } from './ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

const MIN = 5 * 60;
const MAX = 21 * 60;
const STEP = 10;

const PRESETS = [
  { label: 'Early', mins: 7 * 60 + 30 },
  { label: 'Morning', mins: 9 * 60 + 30 },
  { label: 'Midday', mins: 12 * 60 },
  { label: 'Afternoon', mins: 14 * 60 + 30 },
  { label: 'Twilight', mins: 17 * 60 },
];

export const fmtMins = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Tee time as minutes after midnight: quick presets, then fine tune in 10 minute steps */
export function TeeTimePicker({ value, onChange }: { value: number; onChange: (mins: number) => void }) {
  const step = (d: number) => {
    const next = Math.max(MIN, Math.min(MAX, value + d));
    if (next !== value) {
      haptic.select();
      onChange(next);
    }
  };
  return (
    <View style={{ gap: space.md }}>
      <View style={s.card}>
        <StepButton icon="remove" label="10 minutes earlier" disabled={value <= MIN} onPress={() => step(-STEP)} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <T variant="display" style={{ fontSize: 40, lineHeight: 44, textTransform: 'none' }} accessibilityLabel={`Tee time ${fmtMins(value)}`}>
            {fmtMins(value)}
          </T>
          <T variant="caption" color={colors.textMuted}>Tap − or + to adjust by 10 minutes</T>
        </View>
        <StepButton icon="add" label="10 minutes later" disabled={value >= MAX} onPress={() => step(STEP)} />
      </View>
      <ChipRow>
        {PRESETS.map((p) => (
          <Chip key={p.label} label={`${p.label} ${fmtMins(p.mins)}`} selected={value === p.mins} onPress={() => onChange(p.mins)} />
        ))}
      </ChipRow>
    </View>
  );
}

function StepButton({ icon, label, onPress, disabled }: { icon: 'add' | 'remove'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [s.step, disabled && { opacity: 0.35 }, pressed && ui.pressed]}>
      <Ionicons name={icon} size={24} color={colors.lime} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: colors.border, padding: space.md, ...shadow },
  step: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
