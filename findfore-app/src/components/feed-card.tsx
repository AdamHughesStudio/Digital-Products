import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { T } from './ui';
import { colors, fonts, hair, hairline, radius, tabularNums } from '@/constants/theme';
import { ownPhoto } from '@/data/course-photos';
import type { Course } from '@/data/types';

export const FEED_IMAGE_H = 168;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The day as a small calendar leaf: weekday, date, month */
function DateTile({ date, outlined }: { date: Date; outlined?: boolean }) {
  return (
    <View style={[s.dateTile, outlined && s.dateTileOutlined]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={s.dateWord} maxFontSizeMultiplier={1.2}>{DAYS[date.getDay()]}</Text>
      <Text style={s.dateNum} maxFontSizeMultiplier={1.2}>{date.getDate()}</Text>
      <Text style={s.dateWord} maxFontSizeMultiplier={1.2}>{MONTHS[date.getMonth()]}</Text>
    </View>
  );
}

/**
 * One listing in the Home feed. A course we hold a photo of leads with it: the photo, a calendar
 * leaf and save and share on it, then the title and where. A course without one is a plain row, so
 * the feed never shows a picture of somewhere else. Games, opens and championships all use it so
 * the feed reads as one list.
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
}: {
  course?: Course;
  title: string;
  /** small line above the title, for example "Game · 10:20" */
  kicker?: string;
  /** shows a calendar leaf */
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
  /** position in the list */
  index?: number;
}) {
  const photo = ownPhoto(course);

  // a quick fade as the card arrives
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [enter]);

  const kickerLine =
    kicker || isNew ? (
      <T variant="smallStrong" color={colors.textMuted} tabular numberOfLines={1} style={{ flexShrink: 1 }}>
        {isNew ? <T variant="smallStrong" style={{ fontFamily: fonts.bold }}>New{kicker ? ' · ' : ''}</T> : null}
        {kicker}
      </T>
    ) : null;

  const placeLine = place ? (
    <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>{place}</T>
  ) : when ? (
    <T variant="small" color={colors.textMuted} tabular numberOfLines={1} style={{ marginTop: 2 }}>
      {when}
      {meta ? ` · ${meta}` : ''}
    </T>
  ) : null;

  const footerRow =
    footer || price ? (
      <View style={s.footer}>
        <View style={{ flex: 1, minWidth: 0 }}>{footer}</View>
        {price ? <Text style={s.price} maxFontSizeMultiplier={1.3}>{price}</Text> : null}
      </View>
    ) : null;

  const saveLabel = saved ? `Saved. Remove ${title} from saved` : `Save ${title}`;

  if (photo) {
    return (
      <Animated.View style={[s.wrap, { opacity: enter }]}>
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => pressed && s.pressed}>
          <View style={s.image}>
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
            {/* a hairline inner edge so a pale photo still has a crisp border */}
            <View pointerEvents="none" style={s.edge} />
            {date ? <View style={s.onPhotoDate}><DateTile date={date} /></View> : null}
          </View>
          <View style={s.text}>
            {kickerLine}
            <T variant="heading" numberOfLines={2} style={kickerLine ? { marginTop: 2 } : null}>{title}</T>
            {placeLine}
            {footerRow}
          </View>
        </Pressable>

        <View style={s.actions}>
          <Pressable onPress={onShare} hitSlop={5} accessibilityRole="button" accessibilityLabel={`Share ${title}`} style={({ pressed }) => [s.disc, pressed && { opacity: 0.7 }]}>
            <Ionicons name="share-outline" size={17} color={colors.ink} />
          </Pressable>
          <Pressable onPress={onSave} hitSlop={5} accessibilityRole="button" accessibilityState={{ selected: saved }} accessibilityLabel={saveLabel} style={({ pressed }) => [s.disc, pressed && { opacity: 0.7 }]}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? colors.sageDeep : colors.ink} />
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.rowWrap, { opacity: enter }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.row, pressed && s.pressed]}>
        {date ? <DateTile date={date} outlined /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* the first line leaves room for save and share, which sit beside it */}
          <View style={s.rowKicker}>{kickerLine}</View>
          <T variant="subheading" numberOfLines={2} style={s.rowTitle}>{title}</T>
          {placeLine}
          {footerRow}
        </View>
      </Pressable>

      <View style={s.rowActions}>
        <Pressable onPress={onShare} hitSlop={{ top: 11, bottom: 11, left: 6, right: 2 }} accessibilityRole="button" accessibilityLabel={`Share ${title}`} style={({ pressed }) => [s.bare, pressed && { opacity: 0.5 }]}>
          <Ionicons name="share-outline" size={21} color={colors.text} />
        </Pressable>
        <Pressable onPress={onSave} hitSlop={{ top: 11, bottom: 11, left: 2, right: 8 }} accessibilityRole="button" accessibilityState={{ selected: saved }} accessibilityLabel={saveLabel} style={({ pressed }) => [s.bare, pressed && { opacity: 0.5 }]}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? colors.sageDeep : colors.text} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  pressed: { opacity: 0.85 },

  // with a photo
  wrap: { paddingTop: 14, paddingBottom: 16, borderBottomWidth: hair, borderBottomColor: colors.borderStrong },
  image: { height: FEED_IMAGE_H, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.mist },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline },
  onPhotoDate: { position: 'absolute', left: 10, top: 10 },
  text: { paddingTop: 10 },
  actions: { position: 'absolute', right: 10, top: 24, flexDirection: 'row', gap: 8 },
  disc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,249,246,0.92)' },

  // without one
  rowWrap: { borderBottomWidth: hair, borderBottomColor: colors.borderStrong },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  rowKicker: { minHeight: 22, justifyContent: 'center', paddingRight: 76 },
  rowTitle: { fontSize: 17, lineHeight: 22, marginTop: 2 },
  rowActions: { position: 'absolute', right: 0, top: 14, flexDirection: 'row', gap: 12 },
  bare: { width: 26, height: 22, alignItems: 'center', justifyContent: 'center' },

  dateTile: { width: 46, height: 59, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  dateTileOutlined: { borderWidth: hair, borderColor: colors.borderStrong },
  dateWord: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.textMuted },
  dateNum: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, color: colors.text, letterSpacing: -0.3, ...tabularNums },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  price: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.text, letterSpacing: -0.2, ...tabularNums },
});
