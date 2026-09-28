import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Row, T, styles as ui } from './ui';
import { colors, radius, space } from '@/constants/theme';
import { creditBalance, creditsAvailable, creditsHeld, useStore } from '@/data/store';

export function useCredits() {
  const { state } = useStore();
  return { balance: creditBalance(state), held: creditsHeld(state), available: creditsAvailable(state) };
}

/** The credit coin: a lime disc with a forward triangle, echoing the F */
export function CreditCoin({ size = 20 }: { size?: number }) {
  return (
    <View style={[s.coin, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="play" size={size * 0.52} color={colors.ink} style={{ marginLeft: size * 0.06 }} />
    </View>
  );
}

/** Balance pill for headers. Tap to see how credits work and your history */
export function CreditBadge() {
  const { balance } = useCredits();
  return (
    <Pressable
      onPress={() => router.push('/credits')}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${balance} credit${balance === 1 ? '' : 's'}. See how credits work`}
      style={({ pressed }) => [s.badge, pressed && ui.pressed]}>
      <CreditCoin size={20} />
      <T variant="smallStrong" color={colors.onInk}>{balance}</T>
    </Pressable>
  );
}

/** Shown when someone tries to join without a free credit */
export function NeedCredits({ held }: { held: number }) {
  return (
    <View style={s.need}>
      <Row gap={space.md} align="flex-start">
        <CreditCoin size={28} />
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong" color={colors.onInk}>You need a credit to join</T>
          <T variant="small" color={colors.onInkMuted} style={{ marginTop: 2 }}>
            {held > 0
              ? `Your credits are held by ${held} request${held === 1 ? '' : 's'} waiting on a host. Host a game and earn 1 credit for every golfer who joins.`
              : 'Host a game and earn 1 credit for every golfer who joins.'}
          </T>
        </View>
      </Row>
    </View>
  );
}

const s = StyleSheet.create({
  coin: { backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingLeft: 10, paddingRight: 14, borderRadius: radius.pill, backgroundColor: colors.ink },
  need: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space.lg },
});
