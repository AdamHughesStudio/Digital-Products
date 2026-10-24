import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Chip, ChipRow, T, styles as ui } from './ui';
import { colors, fonts, radius, shadow, space } from '@/constants/theme';
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

/**
 * A typed tee time as minutes after midnight, or null if it can't be read.
 * Takes 8:47, 08.47, 0847, 847, 8 or 14, with an optional am or pm.
 */
export function parseTeeTime(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, '');
  const m = t.match(/^(\d{1,4})(?:[:.h](\d{1,2}))?(am|pm|a|p)?$/);
  if (!m) return null;
  let h: number;
  let min: number;
  if (m[2] !== undefined) {
    if (m[1].length > 2) return null;
    h = Number(m[1]);
    min = Number(m[2].padEnd(2, '0'));
  } else if (m[1].length <= 2) {
    h = Number(m[1]);
    min = 0;
  } else {
    h = Number(m[1].slice(0, -2));
    min = Number(m[1].slice(-2));
  }
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    if (m[3].startsWith('p') && h < 12) h += 12;
    if (m[3].startsWith('a') && h === 12) h = 0;
  }
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Tee time as minutes after midnight: quick presets, 10 minute steps, or tap the time to type any minute */
export function TeeTimePicker({ value, onChange }: { value: number; onChange: (mins: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const input = useRef<TextInput>(null);

  const step = (d: number) => {
    const next = Math.max(MIN, Math.min(MAX, value + d));
    if (next !== value) {
      haptic.select();
      setError(null);
      onChange(next);
    }
  };

  const startEditing = () => {
    setDraft('');
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (!draft.trim()) return;
    const mins = parseTeeTime(draft);
    if (mins === null) {
      setError('Type the time as 08:47 or 0847');
      return;
    }
    if (mins < MIN || mins > MAX) {
      setError(`Tee times can be from ${fmtMins(MIN)} to ${fmtMins(MAX)}`);
      return;
    }
    setError(null);
    haptic.select();
    onChange(mins);
  };

  return (
    <View style={{ gap: space.md }}>
      <View style={[s.card, error && { borderColor: colors.danger }]}>
        <StepButton icon="remove" label="10 minutes earlier" disabled={value <= MIN} onPress={() => step(-STEP)} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          {editing ? (
            <TextInput
              ref={input}
              value={draft}
              onChangeText={(t) => setDraft(t.replace(/[^0-9:.apmAPM ]/g, '').slice(0, 7))}
              placeholder={fmtMins(value)}
              placeholderTextColor={colors.textMuted}
              autoFocus
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
              inputMode={Platform.OS === 'web' ? 'numeric' : undefined}
              returnKeyType="done"
              maxLength={7}
              onSubmitEditing={commit}
              onBlur={commit}
              accessibilityLabel="Type the tee time"
              style={s.input}
            />
          ) : (
            <Pressable onPress={startEditing} accessibilityRole="button" accessibilityLabel={`Tee time ${fmtMins(value)}. Tap to type a different time`} hitSlop={6} style={({ pressed }) => [s.time, pressed && ui.pressed]}>
              <T variant="display" style={{ fontSize: 40, lineHeight: 44, textTransform: 'none' }}>
                {fmtMins(value)}
              </T>
              <Ionicons name="pencil" size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
            </Pressable>
          )}
          <T variant="caption" color={error ? colors.danger : colors.textMuted} style={{ textAlign: 'center' }}>
            {error ?? (editing ? 'Type any time, e.g. 0847, then tap Done' : 'Tap the time to type in any minute')}
          </T>
        </View>
        <StepButton icon="add" label="10 minutes later" disabled={value >= MAX} onPress={() => step(STEP)} />
      </View>
      <ChipRow>
        {PRESETS.map((p) => (
          <Chip key={p.label} label={`${p.label} ${fmtMins(p.mins)}`} selected={value === p.mins} onPress={() => { setError(null); onChange(p.mins); }} />
        ))}
      </ChipRow>
    </View>
  );
}

function StepButton({ icon, label, onPress, disabled }: { icon: 'add' | 'remove'; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [s.step, disabled && { opacity: 0.35 }, pressed && ui.pressed]}>
      <Ionicons name={icon} size={24} color={colors.white} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: colors.border, padding: space.md, ...shadow },
  step: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  time: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong, paddingBottom: 2, marginBottom: 2 },
  input: { width: 150, textAlign: 'center', fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.9, color: colors.text, borderBottomWidth: 1.5, borderColor: colors.ink, paddingVertical: 0, paddingBottom: 2, marginBottom: 2 },
});
