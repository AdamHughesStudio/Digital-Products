import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CreditCoin, useCredits } from '@/components/credits';
import { Button, Row, Screen, SectionHeader, T, TopBar, styles as ui, type IconName } from '@/components/ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { useStore } from '@/data/store';
import { timeAgo } from '@/lib/format';

const RULES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'flag', title: 'Host and earn', body: 'Post a game and earn 1 credit for every golfer who joins it.' },
  { icon: 'golf', title: 'Play for 1 credit', body: 'Joining a game uses 1 credit, taken only when the host accepts.' },
  { icon: 'time', title: 'Held while you wait', body: 'A request holds a credit until the host replies, so you can’t overbook.' },
  { icon: 'refresh', title: 'Fair if plans change', body: 'Withdraw or get declined and the credit is free again. Cancel a game you host and the credits you earned go back.' },
];

export default function Credits() {
  const { state } = useStore();
  const { balance, held, available } = useCredits();
  const history = state.credits?.history ?? [];

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
              Enough for {balance} game{balance === 1 ? '' : 's'}. Host to earn more.
            </T>
          )}
        </View>

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
  ruleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg, ...shadow },
  row: { paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
