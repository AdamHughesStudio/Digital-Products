import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T, styles as ui, type IconName } from '@/components/ui';
import { colors, radius, shadow, space } from '@/constants/theme';

const OPTIONS: { icon: IconName; title: string; body: string; href: string }[] = [
  { icon: 'flag', title: 'I have a game', body: 'Fill the spaces in your tee time. Members can offer a guest rate on their own course.', href: '/post/game' },
  { icon: 'golf', title: 'Find a game', body: 'Games near you, and clubs you can play as a member’s guest.', href: '/search' },
];

export default function Post() {
  const insets = useSafeAreaInsets();

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
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: colors.border, ...shadow },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
});
