import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CreditCoin } from '@/components/credits';
import { useToast } from '@/components/toast';
import { Button, Row, Screen, Sheet, T, TopBar, styles as ui, type IconName } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { PRO_MONTHLY_CREDITS, PRO_PRICE, useStore } from '@/data/store';
import { longDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const PERKS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'repeat', title: `${PRO_MONTHLY_CREDITS} credits every month`, body: 'Added to your balance the day you join, then every month after.' },
  { icon: 'albums', title: 'Credits roll over', body: 'Quiet month? Unused credits stay in your balance.' },
  { icon: 'ribbon', title: 'Pro badge', body: 'Shows on your profile so hosts know you’re a regular.' },
  { icon: 'close-circle', title: 'Cancel any time', body: 'Keep every credit you’ve already been given.' },
];

export default function Pro() {
  const { state, startPro, cancelPro } = useStore();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const pro = state.credits?.pro;

  const join = () => {
    startPro();
    haptic.success();
    toast(`Welcome to Pro. ${PRO_MONTHLY_CREDITS} credits added.`, { icon: 'ribbon' });
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={ui.screen}>
      <TopBar title="FindFore Pro" />
      <Screen
        footer={
          pro ? (
            <Button title="Cancel Pro" kind="ghost" onPress={() => setConfirmCancel(true)} />
          ) : (
            <View style={{ gap: space.sm }}>
              <Button title={`Start Pro  ·  ${PRO_PRICE} a month`} onPress={join} />
              <T variant="caption" color={colors.textFaint} style={{ textAlign: 'center' }}>Preview build: no payment is taken.</T>
            </View>
          )
        }>
        <View style={s.hero}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={s.proTag}>
              <T variant="label" color={colors.ink}>Pro</T>
            </View>
            <CreditCoin size={36} />
          </Row>
          <T variant="display" color={colors.onInk} style={{ marginTop: space.lg }}>
            Play more,{'\n'}<T variant="display" color={colors.lime}>host less.</T>
          </T>
          {pro ? (
            <T variant="body" color={colors.onInkMuted} style={{ marginTop: space.md }}>
              You’re Pro. Your next {PRO_MONTHLY_CREDITS} credits arrive on {longDate(new Date(pro.renewsAt))}.
            </T>
          ) : (
            <T variant="body" color={colors.onInkMuted} style={{ marginTop: space.md }}>
              {PRO_MONTHLY_CREDITS} credits every month for {PRO_PRICE}. That’s {PRO_MONTHLY_CREDITS} more rounds without needing to host.
            </T>
          )}
        </View>

        <View style={{ gap: space.lg, marginTop: space.xl }}>
          {PERKS.map((p) => (
            <Row key={p.title} gap={space.md} align="flex-start">
              <View style={s.perkIcon}>
                <Ionicons name={p.icon} size={16} color={colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{p.title}</T>
                <T variant="small" color={colors.textMuted}>{p.body}</T>
              </View>
            </Row>
          ))}
        </View>

        <T variant="small" color={colors.textMuted} style={{ marginTop: space.xl }}>
          Prefer not to pay? You can always earn credits by hosting: 1 for every game you host once a golfer joins.
        </T>
      </Screen>

      <Sheet visible={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel Pro?">
        <T variant="body" color={colors.textMuted}>You’ll keep every credit you have. Monthly credits stop, and you can rejoin any time.</T>
        <Row gap={space.sm} style={{ marginTop: space.xl }}>
          <Button title="Keep Pro" kind="ghost" onPress={() => setConfirmCancel(false)} style={{ flex: 1 }} />
          <Button
            title="Cancel Pro"
            kind="danger"
            onPress={() => {
              cancelPro();
              setConfirmCancel(false);
              toast('Pro cancelled. Your credits are still yours.', { icon: 'close-circle' });
            }}
            style={{ flex: 1 }}
          />
        </Row>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.ink, borderRadius: radius.panel, padding: space.xl, marginTop: space.md },
  proTag: { backgroundColor: colors.lime, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  perkIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
