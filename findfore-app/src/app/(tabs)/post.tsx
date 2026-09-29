import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LookingCard } from '@/components/cards';
import { Row, T, styles as ui, type IconName } from '@/components/ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { ME, useStore } from '@/data/store';
import { isoDate } from '@/lib/format';

const OPTIONS: { icon: IconName; title: string; body: string; href: string }[] = [
  { icon: 'flag', title: 'I have a game', body: 'You have a tee time and want players to fill the spaces.', href: '/post/game' },
  { icon: 'search', title: 'I’m looking for a game', body: 'Let golfers nearby know when you’re free to play.', href: '/post/looking' },
  { icon: 'pricetag', title: 'Member guest opportunity', body: 'You’re a member and can bring a guest at the guest rate.', href: '/post/game?type=member_guest' },
];

export default function Post() {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const today = isoDate(new Date());
  const mine = Object.values(state.looking).find((l) => l.golferId === ME && !l.closed && l.dates.some((d) => d >= today));

  return (
    <View style={[ui.screen]}>
      <View style={[ui.contentWidth, ui.padded, { paddingTop: insets.top + 12, paddingBottom: 130 }]}>
        <T variant="label" color={colors.textMuted}>Post</T>
        <T variant="display" style={{ marginTop: space.sm }}>What are you{'\n'}playing?</T>
        <View style={{ marginTop: space.xxl, gap: space.md }}>
          {OPTIONS.map((o) => (
            <Pressable key={o.title} onPress={() => router.push(o.href)} style={({ pressed }) => [s.option, pressed && ui.pressed]}>
              <View style={s.icon}>
                <Ionicons name={o.icon} size={22} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="subheading">{o.title}</T>
                <T variant="small" color={colors.textMuted} style={{ marginTop: 2 }}>{o.body}</T>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>
        {mine ? (
          <View style={{ marginTop: space.xxl }}>
            <Row style={{ marginBottom: space.md }}>
              <T variant="subheading">Your availability</T>
            </Row>
            <LookingCard post={mine} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: colors.border, ...shadow },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
});
