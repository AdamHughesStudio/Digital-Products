import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CreditCoin, useCredits } from '@/components/credits';
import { Button, Row, Screen, SectionHeader, T, TopBar, styles as ui, type IconName } from '@/components/ui';
import { colors, hairline, radius, shadow, space } from '@/constants/theme';
import { INTRO_CREDITS, PRO_MONTHLY_CREDITS, PRO_PRICE, useStore } from '@/data/store';
import { longDate, timeAgo } from '@/lib/format';

const RULES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'golf', title: 'Play for 1 credit', body: 'Joining a game uses 1 credit, taken only when the host accepts.' },
  { icon: 'gift', title: `${INTRO_CREDITS} welcome credits`, body: 'Every new member starts with enough for a few rounds.' },
  { icon: 'flag', title: 'Host and earn', body: 'Earn 1 credit for every game you host, once a golfer joins it.' },
  { icon: 'ribbon', title: 'Or go Pro', body: `${PRO_MONTHLY_CREDITS} credits added every month for ${PRO_PRICE}. Unused credits roll over.` },
  { icon: 'time', title: 'Held while you wait', body: 'A request holds a credit until the host replies, so you can’t overbook.' },
  { icon: 'refresh', title: 'Fair if plans change', body: 'Withdraw or get declined and the credit is free again. Cancel a game you host and its hosting credit goes back.' },
];

export default function Credits() {
  const { state } = useStore();
  const { balance, held, available } = useCredits();
  const history = state.credits?.history ?? [];
  const pro = state.credits?.pro;

  return (
    <View style={ui.screen}>
      <TopBar title="Credits" />
      <Screen footer={<Button title="Host a game and earn" icon="add" onPress={() => router.push('/post/game')} />}>
        <View style={s.hero}>
          <Row gap={space.md}>
            <CreditCoin size={44} />
            <View>
              <T variant="display" color={colors.onInk} style={{ fontSize: 44, lineHeight: 46 }}>{balance}</T>
              <T variant="small" color={colors.onInkMuted}>credit{balance === 1 ? '' : 's'}</T>
            </View>
          </Row>
          {held > 0 ? (
            <T variant="small" color={colors.onInkMuted} style={{ marginTop: space.md }}>
              {held} held by request{held === 1 ? '' : 's'} waiting on a host, {available} free to use
            </T>
          ) : (
            <T variant="small" color={colors.onInkMuted} style={{ marginTop: space.md }}>
              Enough for {balance} game{balance === 1 ? '' : 's'}. Host or go Pro to get more.
            </T>
          )}
        </View>

        <Pressable onPress={() => router.push('/pro')} style={({ pressed }) => [s.pro, pro && s.proOn, pressed && ui.pressed]} accessibilityRole="button">
          <View style={s.proTag}>
            <T variant="label" color={colors.ink}>Pro</T>
          </View>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong">{pro ? 'You’re a Pro member' : `Get ${PRO_MONTHLY_CREDITS} credits every month`}</T>
            <T variant="small" color={colors.textMuted}>
              {pro ? `Next ${PRO_MONTHLY_CREDITS} credits on ${longDate(new Date(pro.renewsAt))}` : `FindFore Pro, ${PRO_PRICE} a month. Cancel any time.`}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>

        <SectionHeader title="How credits work" />
        <View style={{ gap: space.md }}>
          {RULES.map((r) => (
            <Row key={r.title} gap={space.md} align="flex-start">
              <View style={s.ruleIcon}>
                <Ionicons name={r.icon} size={16} color={colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong">{r.title}</T>
                <T variant="small" color={colors.textMuted}>{r.body}</T>
              </View>
            </Row>
          ))}
        </View>

        <SectionHeader title="History" />
        {history.length === 0 ? (
          <T variant="body" color={colors.textMuted}>Nothing yet.</T>
        ) : (
          <View style={s.list}>
            {history.map((h, i) => (
              <Row key={h.id} gap={space.md} style={[s.row, i > 0 && s.divider]}>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong" numberOfLines={2}>{h.reason}</T>
                  <T variant="caption" color={colors.textMuted}>{timeAgo(h.createdAt)}</T>
                </View>
                <T variant="subheading" color={h.amount > 0 ? colors.text : colors.textMuted}>
                  {h.amount > 0 ? `+${h.amount}` : `−${Math.abs(h.amount)}`}
                </T>
              </Row>
            ))}
          </View>
        )}
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.ink, borderRadius: radius.panel, padding: space.xl, marginTop: space.md },
  pro: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: hairline, ...shadow },
  proOn: { borderColor: colors.lime, borderWidth: 2 },
  proTag: { backgroundColor: colors.lime, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  ruleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: hairline, paddingHorizontal: space.lg, ...shadow },
  row: { paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
