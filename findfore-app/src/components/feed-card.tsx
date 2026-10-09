import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { CourseArt } from './cards';
import { Row, T, styles as ui, type IconName } from './ui';
import { colors, radius, space } from '@/constants/theme';
import { photoFor } from '@/data/course-photos';
import type { Course } from '@/data/types';

export const FEED_IMAGE_H = 196;

/**
 * One listing in the Home feed: a big rounded course image with share and save on it, then the
 * title, when, where and who underneath on the page itself. Games, opens and championships all
 * use it so the feed reads as one list.
 */
export function FeedCard({
  course,
  badge,
  title,
  when,
  meta,
  rating,
  footer,
  saved,
  onPress,
  onSave,
  onShare,
  label,
}: {
  course?: Course;
  badge?: { icon: IconName; text: string; tone?: 'light' | 'lime' };
  title: string;
  when: string;
  meta: string;
  rating?: number;
  footer?: React.ReactNode;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
  onShare: () => void;
  label: string;
}) {
  const photo = photoFor(course?.id);
  return (
    <View style={s.wrap}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [pressed && ui.pressed]}>
        <View style={s.image}>
          {photo ? (
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
          ) : (
            <CourseArt course={course} height={FEED_IMAGE_H} />
          )}
          {badge ? (
            <View style={[s.badge, badge.tone === 'lime' && { backgroundColor: colors.lime }]}>
              <Ionicons name={badge.icon} size={13} color={colors.ink} />
              <T variant="caption" style={s.badgeText}>{badge.text}</T>
            </View>
          ) : null}
        </View>
        <T variant="heading" numberOfLines={2} style={{ marginTop: space.lg }}>{title}</T>
        <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 4 }}>
          {when}
          {meta ? `  ·  ${meta}` : ''}
          {rating !== undefined ? `  ·  ★ ${rating.toFixed(1)}` : ''}
        </T>
        {footer ? <View style={{ marginTop: space.md }}>{footer}</View> : null}
      </Pressable>
      <Row gap={8} style={s.actions}>
        <Pressable onPress={onShare} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Share ${title}`} style={({ pressed }) => [s.action, pressed && ui.pressed]}>
          <Ionicons name="share-outline" size={19} color={colors.onInk} />
        </Pressable>
        <Pressable
          onPress={onSave}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          accessibilityLabel={saved ? `Saved. Remove ${title} from saved` : `Save ${title}`}
          style={({ pressed }) => [s.action, saved && s.actionOn, pressed && ui.pressed]}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? colors.ink : colors.onInk} />
        </Pressable>
      </Row>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 44 },
  image: { height: FEED_IMAGE_H, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surfaceHigh },
  badge: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.94)', paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill },
  badgeText: { color: colors.ink, fontWeight: '800' },
  actions: { position: 'absolute', right: 12, top: 12 },
  action: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(11,11,11,0.42)', alignItems: 'center', justifyContent: 'center' },
  actionOn: { backgroundColor: colors.lime },
});
