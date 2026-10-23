import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { T, styles as ui } from '@/components/ui';
import { colors, radius, space } from '@/constants/theme';
import { coursePath } from '@/data/courses';
import type { Top100Entry } from '@/data/top100';

const BADGE = require('@/assets/images/top100-badge.png');

/** "No. 6", for lists of courses */
export function Top100Tag({ rank }: { rank: number }) {
  return (
    <View style={s.tag} accessibilityLabel={`Number ${rank} in Scotland's Top 100`}>
      <Ionicons name="star" size={10} color={colors.onInk} />
      <T variant="caption" color={colors.onInk} style={s.tagText}>No. {rank}</T>
    </View>
  );
}

/**
 * Where a club or course sits in Scotland's Top 100. One entry reads as its rank; a club with
 * several ranked courses lists each one, linking to that course.
 */
export function Top100Card({ entries, clubId, style }: { entries: Top100Entry[]; clubId: string; style?: StyleProp<ViewStyle> }) {
  if (entries.length === 0) return null;
  const one = entries.length === 1 ? entries[0] : undefined;
  return (
    <View style={[s.card, style]}>
      <View style={s.head}>
        <Image source={BADGE} style={s.badge} contentFit="contain" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1 }}>
          <T variant="label" color={colors.accent} style={s.eyebrow}>SCOTLAND’S TOP 100</T>
          <T variant="subheading" color={colors.onInk} style={{ marginTop: 2 }}>
            {one ? `Ranked No. ${one.rank} in Scotland` : `${entries.length} courses in the Top 100`}
          </T>
          <T variant="small" color={colors.onInkMuted} style={{ marginTop: 2 }}>
            {one ? 'One of the finest golf courses in the country, as ranked by the NCG Top 100s.' : 'As ranked by the NCG Top 100s.'}
          </T>
        </View>
      </View>
      {one ? null : (
        <View style={s.list}>
          {entries.map((e, i) => (
            <Pressable
              key={e.rank}
              onPress={() => e.course && router.push(coursePath(clubId, e.course) as never)}
              accessibilityRole="button"
              accessibilityLabel={`${e.course}, number ${e.rank} in Scotland`}
              style={({ pressed }) => [s.row, i > 0 && s.rowDivider, pressed && ui.pressed]}>
              <T variant="bodyStrong" color={colors.accent} style={s.rank}>No. {e.rank}</T>
              <T variant="bodyStrong" color={colors.onInk} style={{ flex: 1 }} numberOfLines={1}>{e.course}</T>
              <Ionicons name="chevron-forward" size={16} color={colors.onInkMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.sageDeep },
  tagText: { fontVariant: ['tabular-nums'] },
  card: { backgroundColor: colors.ink, borderRadius: radius.xl, padding: space.lg, marginTop: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 64, height: 64 },
  eyebrow: { letterSpacing: 1.2 },
  list: { marginTop: space.md, borderRadius: radius.lg, backgroundColor: colors.inkHigh, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.inkBorder },
  rank: { width: 58, fontVariant: ['tabular-nums'] },
});
