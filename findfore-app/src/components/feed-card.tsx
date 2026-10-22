import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CourseArt } from './cards';
import { T } from './ui';
import { colors, fonts, space } from '@/constants/theme';
import { photoFor } from '@/data/course-photos';
import type { Course } from '@/data/types';

export const FEED_IMAGE_H = 228;
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// frosted glass on the web app; a near solid white on native until a blur module is added
const frost =
  Platform.OS === 'web'
    ? ({ backgroundColor: 'rgba(251,249,246,0.8)', backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)' } as object)
    : { backgroundColor: 'rgba(251,249,246,0.94)' };

/**
 * One listing in the Home feed: a tall course photo with a calendar tile and frosted save and
 * share buttons, then a quiet label, the title, where, and a footer with the price on the right.
 * Games, opens and championships all use it so the feed reads as one list.
 */
export function FeedCard({
  course,
  title,
  kicker,
  date,
  place,
  price,
  isNew,
  when,
  meta,
  footer,
  saved,
  onPress,
  onSave,
  onShare,
  label,
  index = 0,
}: {
  course?: Course;
  title: string;
  /** small line above the title, for example "Game · Tomorrow 10:20" */
  kicker?: string;
  /** shows a calendar tile on the photo */
  date?: Date;
  /** where, under the title */
  place?: string;
  /** right hand side of the footer */
  price?: string;
  isNew?: boolean;
  /** older two line layout, still used by the map */
  when?: string;
  meta?: string;
  footer?: React.ReactNode;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
  onShare: () => void;
  label: string;
  /** position in the list, for a gentle staggered entrance */
  index?: number;
}) {
  const photo = photoFor(course?.id);

  // press: a soft spring scale; enter: fade and rise, staggered for the first few cards
  const scale = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 420, delay: Math.min(index, 5) * 70, useNativeDriver: true }).start();
  }, [enter, index]);
  const press = (to: number) => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: to === 1 ? 6 : 0 }).start();

  return (
    <Animated.View style={[s.wrap, { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale }] }]}>
      <Pressable onPress={onPress} onPressIn={() => press(0.98)} onPressOut={() => press(1)} accessibilityRole="button" accessibilityLabel={label}>
        <View style={s.image}>
          {photo ? (
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityIgnoresInvertColors />
          ) : (
            <CourseArt course={course} height={FEED_IMAGE_H} />
          )}
          {/* a soft fall of shade at the foot of the photo gives it depth */}
          <LinearGradient pointerEvents="none" colors={['rgba(15,26,20,0)', 'rgba(15,26,20,0.28)']} style={s.scrim} />
          {/* a hairline inner edge so the photo sits crisply on white */}
          <View pointerEvents="none" style={s.edge} />
          {date ? (
            <View style={[s.dateTile, frost]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={s.dateDay}>{DAYS[date.getDay()]}</Text>
              <Text style={s.dateNum}>{date.getDate()}</Text>
              <Text style={s.dateMonth}>{MONTHS[date.getMonth()]}</Text>
            </View>
          ) : null}
          {isNew ? (
            <View style={s.newTag}>
              <Text style={s.newText}>NEW</Text>
            </View>
          ) : null}
        </View>

        <View style={s.text}>
          {kicker ? <T variant="label" color={colors.textMuted} numberOfLines={1} style={s.kicker}>{kicker}</T> : null}
          <T variant="heading" numberOfLines={2} style={s.title}>{title}</T>
          {place ? (
            <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 3 }}>{place}</T>
          ) : when ? (
            <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 4 }}>
              {when}
              {meta ? `  ·  ${meta}` : ''}
            </T>
          ) : null}
          {footer || price ? (
            <View style={s.footer}>
              <View style={{ flex: 1, minWidth: 0 }}>{footer}</View>
              {price ? <Text style={s.price}>{price}</Text> : null}
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={s.actions}>
        <Pressable onPress={onShare} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Share ${title}`} style={({ pressed }) => [s.action, frost, pressed && { transform: [{ scale: 0.92 }] }]}>
          <Ionicons name="share-outline" size={18} color={colors.ink} />
        </Pressable>
        <Pressable
          onPress={onSave}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          accessibilityLabel={saved ? `Saved. Remove ${title} from saved` : `Save ${title}`}
          style={({ pressed }) => [s.action, saved ? s.actionOn : frost, pressed && { transform: [{ scale: 0.92 }] }]}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={colors.ink} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 40 },
  image: { height: FEED_IMAGE_H, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.mist },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(15,26,20,0.08)' },
  dateTile: { position: 'absolute', left: 14, top: 14, width: 54, borderRadius: 16, paddingTop: 6, paddingBottom: 7, alignItems: 'center', shadowColor: '#0F1A14', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  dateDay: { fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 1, color: colors.textMuted },
  dateNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: colors.ink, marginTop: 1 },
  dateMonth: { fontFamily: fonts.extrabold, fontSize: 9.5, letterSpacing: 1, color: colors.textMuted },
  newTag: { position: 'absolute', left: 14, bottom: 14, backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  newText: { fontFamily: fonts.extrabold, fontSize: 10.5, letterSpacing: 1.1, color: colors.ink },
  text: { paddingHorizontal: 2, paddingTop: space.lg },
  kicker: { fontSize: 10.5, letterSpacing: 1.3, marginBottom: 6 },
  title: { fontSize: 21, lineHeight: 26, letterSpacing: -0.4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  price: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink, letterSpacing: -0.2 },
  actions: { position: 'absolute', right: 14, top: 14, flexDirection: 'row', gap: 8 },
  action: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F1A14', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  actionOn: { backgroundColor: colors.accent },
});
