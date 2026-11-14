import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { T, styles as ui } from '@/components/ui';
import { colors, hair, radius, space, tabularNums } from '@/constants/theme';
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
          <T variant="bodyStrong" tabular>
            {one ? `Ranked No. ${one.rank} in Scotland` : `${entries.length} courses in Scotland’s Top 100`}
          </T>
          <T variant="small" color={colors.textMuted}>
            {one ? 'Scotland’s Top 100, as ranked by the NCG Top 100s' : 'As ranked by the NCG Top 100s'}
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
              style={({ pressed }) => [s.row, s.rowDivider, pressed && ui.pressed]}>
              <T variant="bodyStrong" color={colors.sageDeep} style={s.rank}>No. {e.rank}</T>
              <T variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{e.course}</T>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.xs, backgroundColor: colors.sageDeep },
  tagText: { ...tabularNums },
  // a ruled band on the page: the badge is the only ornament
  card: { marginTop: space.lg, borderTopWidth: hair, borderBottomWidth: hair, borderColor: colors.borderStrong },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  badge: { width: 44, height: 44 },
  list: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44, paddingVertical: 10 },
  rowDivider: { borderTopWidth: hair, borderTopColor: colors.borderStrong },
  rank: { width: 58, ...tabularNums },
});
