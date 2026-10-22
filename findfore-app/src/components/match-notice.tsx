import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Row, Sheet, T } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { createLocalStore } from '@/data/local-store';
import type { Golfer } from '@/data/types';
import { haptic } from '@/lib/haptics';

// "Don't show this again", remembered on this phone. Read through a use-named hook, as the other
// stores are: the React Compiler treats a bare .use() call as React's use() and memoises it away.
const hidden = createLocalStore<boolean>('findfore:hide-match-notice', false);
const useHidden = hidden.use;

type Confirm = (golfer: Golfer | undefined, where: string, onConfirm: () => void) => void;
const MatchNoticeContext = createContext<Confirm>((_g, _w, onConfirm) => onConfirm());

/** Ask before accepting someone into your game, unless the host has said not to show it again */
export const useMatchNotice = () => useContext(MatchNoticeContext);

/**
 * Accepting someone into your game makes you friends, so they can message you and invite you to
 * games. This tells the host that before they accept, with a "don't show again" for next time.
 */
export function MatchNoticeProvider({ children }: { children: ReactNode }) {
  const hide = useHidden();
  const [open, setOpen] = useState<{ golfer?: Golfer; where: string } | null>(null);
  const [dontShow, setDontShow] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const confirm = useCallback<Confirm>(
    (golfer, where, onConfirm) => {
      if (hide) return onConfirm();
      pending.current = onConfirm;
      setDontShow(false);
      setOpen({ golfer, where });
    },
    [hide],
  );

  const close = () => {
    pending.current = null;
    setOpen(null);
  };
  const accept = () => {
    if (dontShow) hidden.set(true);
    const go = pending.current;
    pending.current = null;
    setOpen(null);
    go?.();
  };

  const name = open?.golfer?.firstName ?? 'them';
  return (
    <MatchNoticeContext.Provider value={confirm}>
      {children}
      <Sheet visible={!!open} onClose={close} title={`Accept ${name}?`}>
        <Row gap={space.md} style={{ marginBottom: space.lg }}>
          <Avatar golfer={open?.golfer} size={48} />
          <T variant="body" color={colors.textMuted} style={{ flex: 1 }}>
            {name} will join your game{open?.where ? ` at ${open.where}` : ''}.
          </T>
        </Row>
        <View style={s.note}>
          <Ionicons name="people" size={20} color={colors.sageDeep} />
          <T variant="body" style={{ flex: 1 }}>
            You’ll also become friends, so you can message each other and invite each other to games. You can remove a friend at any time.
          </T>
        </View>
        <Pressable onPress={() => { haptic.select(); setDontShow((v) => !v); }} accessibilityRole="checkbox" accessibilityState={{ checked: dontShow }} style={s.check}>
          <View style={[s.box, dontShow && s.boxOn]}>{dontShow ? <Ionicons name="checkmark" size={15} color={colors.onInk} /> : null}</View>
          <T variant="bodyStrong">Don’t show this again</T>
        </Pressable>
        <Button title={`Accept and add ${name}`} icon="checkmark" onPress={accept} />
        <Button title="Not yet" kind="secondary" onPress={close} style={{ marginTop: space.sm }} />
      </Sheet>
    </MatchNoticeContext.Provider>
  );
}

const s = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: space.lg },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
});
