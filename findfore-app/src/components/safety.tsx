import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, ChipRow, Field, Sheet, SheetOption, T } from './ui';
import { colors, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import { haptic } from '@/lib/haptics';
import type { Golfer, ReportReason } from '@/data/types';

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'no_show', label: 'Didn’t show up' },
  { key: 'inappropriate', label: 'Inappropriate behaviour' },
  { key: 'spam', label: 'Spam or fake profile' },
  { key: 'misuse', label: 'Misusing member guest' },
  { key: 'other', label: 'Something else' },
];

/** Report and block options for another golfer. Extra options (such as cancel game) can be passed in */
export function SafetySheet({ golfer, visible, onClose, children }: { golfer?: Golfer; visible: boolean; onClose: () => void; children?: React.ReactNode }) {
  const { report, block } = useStore();
  const [mode, setMode] = useState<'menu' | 'report' | 'done' | 'blocked'>('menu');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');

  const close = () => {
    onClose();
    setTimeout(() => {
      setMode('menu');
      setReason(null);
      setNote('');
    }, 300);
  };

  if (!golfer) return null;

  return (
    <Sheet visible={visible} onClose={close} title={mode === 'report' ? `Report ${golfer.firstName}` : mode === 'done' ? 'Thanks for telling us' : mode === 'blocked' ? `${golfer.firstName} is blocked` : undefined}>
      {mode === 'menu' ? (
        <View>
          {children}
          <SheetOption icon="flag-outline" label={`Report ${golfer.firstName}`} detail="Our team reviews every report" onPress={() => setMode('report')} />
          <SheetOption
            icon="ban-outline"
            label={`Block ${golfer.firstName}`}
            detail="They won’t see your posts or be able to message you"
            destructive
            onPress={() => {
              block(golfer.id);
              haptic.warn();
              setMode('blocked');
            }}
          />
        </View>
      ) : null}

      {mode === 'report' ? (
        <View style={{ gap: space.lg }}>
          <ChipRow>
            {REASONS.map((r) => (
              <Chip key={r.key} label={r.label} selected={reason === r.key} onPress={() => setReason(r.key)} />
            ))}
          </ChipRow>
          <Field value={note} onChangeText={setNote} placeholder="Anything else we should know? (optional)" multiline />
          <Button
            title="Send report"
            disabled={!reason}
            onPress={() => {
              if (!reason) return;
              report(golfer.id, reason, note.trim() || undefined);
              setMode('done');
            }}
          />
        </View>
      ) : null}

      {mode === 'done' ? (
        <View style={{ gap: space.lg }}>
          <T variant="body" color={colors.textMuted}>We’ll look into it. If you don’t want to hear from {golfer.firstName} again, you can block them too.</T>
          <Button
            title={`Block ${golfer.firstName}`}
            kind="danger"
            onPress={() => {
              block(golfer.id);
              setMode('blocked');
            }}
          />
          <Button title="Done" kind="ghost" onPress={close} />
        </View>
      ) : null}

      {mode === 'blocked' ? (
        <View style={{ gap: space.lg }}>
          <T variant="body" color={colors.textMuted}>You won’t see {golfer.firstName}’s games or messages. You can unblock them from your profile at any time.</T>
          <Button
            title="Done"
            onPress={() => {
              close();
              if (router.canGoBack()) router.back();
            }}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
