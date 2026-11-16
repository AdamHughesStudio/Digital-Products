import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { T } from './ui';
import { colors, fonts, hair, hairline, radius, shadowSoft, space, tabularNums } from '@/constants/theme';
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
 * the feed never shows a picture of somewhere else. Save is on the card; sharing is on the page itself. Games, opens and championships all use it so
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
  /** sharing lives on the listing's own page; kept so callers need not change */
  onShare?: () => void;
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
        <Pressable onPress={onSave} hitSlop={{ top: 11, bottom: 11, left: 9, right: 8 }} accessibilityRole="button" accessibilityState={{ selected: saved }} accessibilityLabel={saveLabel} style={({ pressed }) => [s.bare, pressed && { opacity: 0.5 }]}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? colors.sageDeep : colors.text} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  pressed: { opacity: 0.85 },

  // with a photo
  // every listing is a card of its own, so one never runs into the next
  wrap: { marginBottom: 12, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, ...shadowSoft },
  image: { height: FEED_IMAGE_H, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.mist },
  edge: { display: 'none' },
  onPhotoDate: { position: 'absolute', left: 10, top: 10 },
  text: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  actions: { position: 'absolute', right: 10, top: 10, flexDirection: 'row', gap: 8 },
  disc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,249,246,0.92)' },

  // without one
  rowWrap: { marginBottom: 12, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, ...shadowSoft },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  rowKicker: { minHeight: 22, justifyContent: 'center', paddingRight: 36 },
  rowTitle: { fontSize: 17, lineHeight: 22, marginTop: 2 },
  rowActions: { position: 'absolute', right: 14, top: 14, flexDirection: 'row', gap: 12 },
  bare: { width: 26, height: 22, alignItems: 'center', justifyContent: 'center' },

  dateTile: { width: 46, height: 59, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  dateTileOutlined: { borderWidth: hair, borderColor: colors.borderStrong, backgroundColor: colors.page },
  dateWord: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.textMuted },
  dateNum: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, color: colors.text, letterSpacing: -0.3, ...tabularNums },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  price: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.text, letterSpacing: -0.2, ...tabularNums },
});

export const SHELF_CARD_W = 268;

/**
 * A short, titled row of listings that scrolls sideways, with a link to the full list. Home is
 * made of these, so it stays a few screens long however many listings there are.
 */
export function Shelf({ title, detail, action = 'See all', onAction, children }: { title: string; detail?: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <View style={sh.shelf}>
      <View style={sh.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="heading" accessibilityRole="header" numberOfLines={1}>{title}</T>
          {detail ? <T variant="small" color={colors.textMuted} numberOfLines={1}>{detail}</T> : null}
        </View>
        {onAction ? (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${action}: ${title}`} style={({ pressed }) => [sh.action, pressed && { opacity: 0.6 }]}>
            <T variant="smallStrong" color={colors.sageDeep}>{action}</T>
            <Ionicons name="chevron-forward" size={12} color={colors.sageDeep} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SHELF_CARD_W + 12}
        decelerationRate="fast"
        style={{ marginHorizontal: -space.xl }}
        contentContainerStyle={{ gap: 12, paddingHorizontal: space.xl, paddingBottom: 4 }}>
        {children}
      </ScrollView>
    </View>
  );
}

/** A listing on a shelf: the course photo, or a plain forest panel where we hold none, then what, where and the price */
export function ShelfCard({ course, title, kicker, date, place, price, isNew, footer, saved, onPress, onSave, label }: Parameters<typeof FeedCard>[0]) {
  const photo = ownPhoto(course);
  return (
    <View style={sh.card}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [{ flex: 1 }, pressed && s.pressed]}>
        <View style={sh.image}>
          {photo ? (
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
          ) : (
            <LinearGradient colors={['#2A4234', '#16301B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, sh.art]}>
              <Ionicons name="flag-outline" size={30} color="rgba(173,200,162,0.55)" />
            </LinearGradient>
          )}
          {date ? <View style={s.onPhotoDate}><DateTile date={date} /></View> : null}
        </View>
        <View style={sh.text}>
          <T variant="smallStrong" color={colors.textMuted} tabular numberOfLines={1}>
            {isNew ? <T variant="smallStrong" style={{ fontFamily: fonts.bold, color: colors.text }}>New{kicker ? ' · ' : ''}</T> : null}
            {kicker}
          </T>
          <T variant="subheading" numberOfLines={2} style={{ marginTop: 2 }}>{title}</T>
          {place ? <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>{place}</T> : null}
          {footer || price ? (
            <View style={[s.footer, { marginTop: 'auto', paddingTop: 10 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>{footer}</View>
              {price ? <Text style={s.price} maxFontSizeMultiplier={1.3}>{price}</Text> : null}
            </View>
          ) : null}
        </View>
      </Pressable>
      <View style={s.actions}>
        <Pressable onPress={onSave} hitSlop={5} accessibilityRole="button" accessibilityState={{ selected: saved }} accessibilityLabel={saved ? `Saved. Remove ${title} from saved` : `Save ${title}`} style={({ pressed }) => [s.disc, pressed && { opacity: 0.7 }]}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? colors.sageDeep : colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const sh = StyleSheet.create({
  shelf: { marginTop: 28 },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginBottom: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 3 },
  card: { width: SHELF_CARD_W, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, ...shadowSoft },
  image: { height: 140, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.mist },
  art: { alignItems: 'flex-end', justifyContent: 'flex-end', padding: 14 },
  text: { flex: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
});
