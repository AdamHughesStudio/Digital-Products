import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { FeedCard } from './feed-card';
import { T, styles as ui } from './ui';
import { colors, fonts, hair, hairline, radius, shadowSoft, space, tabularNums } from '@/constants/theme';
import { ownPhoto } from '@/data/course-photos';
import type { Course } from '@/data/types';

type CardProps = Parameters<typeof FeedCard>[0];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// deep greens from the brand, one picked per club so a run of clubs without photos is not all one colour
const TONES: [string, string][] = [
  ['#2A4234', '#15241B'],
  ['#334A2C', '#1A2915'],
  ['#2B4440', '#14231F'],
  ['#3B4A33', '#1E2818'],
];
const seedOf = (id = 'x') => id.split('').reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);

/** An organic closed line, like a contour on a course survey map */
function contour(cx: number, cy: number, r: number, seed: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = (i / 60) * Math.PI * 2;
    const w = 1 + 0.08 * Math.sin(3 * t + seed) + 0.05 * Math.cos(5 * t + seed * 1.7);
    pts.push(`${i === 0 ? 'M' : 'L'}${(cx + Math.cos(t) * r * w).toFixed(1)} ${(cy + Math.sin(t) * r * w * 0.7).toFixed(1)}`);
  }
  return pts.join(' ') + 'Z';
}

/**
 * The picture for a club we hold no photo of: a deep green panel with survey contours, the club's
 * name set large, and the one figure that matters most. Drawn, so it never pretends to be the course.
 */
export function ClubArt({ course, big, small, style, plain }: { course?: Course; big?: string; small?: string; style?: object; /** contours only, for a card that sets its own words */ plain?: boolean }) {
  const seed = seedOf(course?.id);
  const [a, b] = TONES[seed % TONES.length];
  const cx = 220 + (seed % 120);
  const cy = 40 + ((seed >>> 4) % 60);
  const name = (course?.name ?? 'Golf club').replace(/ Golf (Club|Course|Links)$/i, '');
  return (
    <View style={[StyleSheet.absoluteFill, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" viewBox="0 0 340 180" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        {[150, 120, 92, 66, 42, 20].map((r, i) => (
          <Path key={r} d={contour(cx, cy, r, seed % 7)} fill="none" stroke={i === 3 ? 'rgba(173,200,162,0.30)' : 'rgba(173,200,162,0.12)'} strokeWidth={1.1} />
        ))}
      </Svg>
      {plain ? null : <View style={art.text}>
        {big ? <Text style={art.big} maxFontSizeMultiplier={1.2}>{big}</Text> : null}
        {small ? <Text style={art.small} maxFontSizeMultiplier={1.2}>{small}</Text> : null}
        <Text style={art.name} numberOfLines={2} maxFontSizeMultiplier={1.2}>{name}</Text>
      </View>}
    </View>
  );
}

/** A course photo where we hold one, otherwise the drawn panel */
export function Picture({ course, big, small }: { course?: Course; big?: string; small?: string }) {
  const photo = ownPhoto(course);
  if (photo) return <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />;
  return <ClubArt course={course} big={big} small={small} />;
}

// frosted glass on the web app; a dark tint on native until a blur module is added
const frost =
  Platform.OS === 'web'
    ? ({ backgroundColor: 'rgba(15,26,20,0.32)', backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)' } as object)
    : { backgroundColor: 'rgba(15,26,20,0.5)' };

const dayWord = (d?: Date) => (d ? `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` : undefined);

function Heart({ saved, title, onSave, onDark }: { saved: boolean; title: string; onSave: () => void; onDark?: boolean }) {
  return (
    <Pressable
      onPress={onSave}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? `Saved. Remove ${title} from saved` : `Save ${title}`}
      style={({ pressed }) => [mod.heart, onDark && mod.heartOnDark, pressed && { opacity: 0.6 }]}>
      <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={onDark ? (saved ? colors.accent : colors.onInk) : saved ? colors.sageDeep : colors.text} />
    </Pressable>
  );
}

/**
 * A club's paid highlight: the course photo across the whole card, darkened towards the foot so
 * the words sit cleanly on it, with a quiet frosted Promoted tag. A club we hold no photo of gets
 * the drawn panel instead.
 */
export function PromotedCard({ course, title, date, place, price, kicker, saved, onPress, onSave, label }: CardProps) {
  const photo = ownPhoto(course);
  return (
    <View style={mod.promo}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Promoted. ${label}`} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.94 }]}>
        {photo ? (
          <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessibilityIgnoresInvertColors />
        ) : (
          <ClubArt course={course} plain />
        )}
        {/* a soft shade at the top for the tag and heart, and a deep one at the foot for the words */}
        <LinearGradient pointerEvents="none" colors={['rgba(10,18,13,0.45)', 'rgba(10,18,13,0)']} style={mod.promoTopShade} />
        <LinearGradient pointerEvents="none" colors={['rgba(10,18,13,0)', 'rgba(10,18,13,0.55)', 'rgba(10,18,13,0.92)']} locations={[0, 0.32, 1]} style={mod.promoShade} />
        <View style={mod.promoBody}>
          <View style={[mod.promoTag, frost]}>
            <Ionicons name="sparkles" size={11} color={colors.accent} />
            <Text style={mod.promoTagText}>Promoted</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={mod.promoKicker} numberOfLines={1}>{kicker}</Text>
          <Text style={mod.promoTitle} numberOfLines={2} maxFontSizeMultiplier={1.2}>{title}</Text>
          <Text style={mod.promoPlace} numberOfLines={1}>{place}</Text>
          <View style={mod.promoRule} />
          <View style={mod.promoFoot}>
            <View>
              <Text style={mod.promoFactLabel}>Played</Text>
              <Text style={mod.promoFactValue}>{dayWord(date)}</Text>
            </View>
            {price ? (
              <View style={mod.promoFactSplit}>
                <Text style={mod.promoFactLabel}>To enter</Text>
                <Text style={mod.promoFactValue}>{price}</Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            <View style={mod.promoCta}>
              <Text style={mod.promoCtaText}>View</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.ink} />
            </View>
          </View>
        </View>
        {/* a fine light edge, so the card reads as one crisp object on the page */}
        <View pointerEvents="none" style={mod.promoEdge} />
      </Pressable>
      <View style={mod.promoHeart}>
        <Pressable
          onPress={onSave}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          accessibilityLabel={saved ? `Saved. Remove ${title} from saved` : `Save ${title}`}
          style={({ pressed }) => [mod.promoHeartBtn, frost, pressed && { opacity: 0.7 }]}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={19} color={saved ? colors.accent : colors.onInk} />
        </Pressable>
      </View>
    </View>
  );
}

/** A small text led card for a sideways row: date block, title, where, price */
export function MiniCard({ course, title, date, place, price, isNew, saved, onPress, onSave, label }: CardProps) {
  return (
    <View style={mod.mini}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [{ flex: 1, padding: 14 }, pressed && ui.pressed]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 30 }}>
          {date ? (
            <View style={mod.miniDate}>
              <Text style={mod.miniDateWord}>{DAYS[date.getDay()]}</Text>
              <Text style={mod.miniDateNum}>{date.getDate()}</Text>
            </View>
          ) : null}
          <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>{date ? MONTHS[date.getMonth()] : ''}{isNew ? ' · New' : ''}</T>
        </View>
        <T variant="subheading" numberOfLines={2} style={{ marginTop: 10 }}>{title}</T>
        <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>{place ?? course?.name}</T>
        {price ? <T variant="bodyStrong" tabular style={{ marginTop: 'auto', paddingTop: 10 }}>{price}</T> : null}
      </Pressable>
      <View style={{ position: 'absolute', top: 8, right: 8 }}><Heart saved={saved} title={title} onSave={onSave} /></View>
    </View>
  );
}

/** One line of a short list in a panel: date tile, title and where, heart at the right */
export function ListRow({ title, date, place, kicker, isNew, footer, saved, onPress, onSave, label, first }: CardProps & { first?: boolean }) {
  return (
    <View style={[mod.row, !first && mod.rowDivider]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [mod.rowMain, pressed && ui.pressed]}>
        {date ? (
          <View style={mod.rowDate}>
            <Text style={mod.miniDateWord}>{MONTHS[date.getMonth()]}</Text>
            <Text style={mod.miniDateNum}>{date.getDate()}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="small" color={colors.textMuted} numberOfLines={1}>
            {isNew ? <T variant="smallStrong">New · </T> : null}
            {kicker}
          </T>
          <T variant="bodyStrong" numberOfLines={1}>{title}</T>
          <T variant="small" color={colors.textMuted} numberOfLines={1}>{place}</T>
          {footer ? <View style={{ marginTop: 6 }}>{footer}</View> : null}
        </View>
      </Pressable>
      <Heart saved={saved} title={title} onSave={onSave} />
    </View>
  );
}

/** A panel of short rows, for a list that is better read than swiped */
export function ListPanel({ children }: { children: React.ReactNode }) {
  return <View style={mod.panel}>{children}</View>;
}

/** A championship as a wide drawn banner: who runs it, where, and whether entry is open */
export function ChampionCard({ course, title, kicker, place, footer, saved, onPress, onSave, label }: CardProps) {
  return (
    <View style={mod.champ}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.92 }]}>
        <View style={mod.champArt}>
          <ClubArt course={course} />
        </View>
        <View style={{ padding: 14, flex: 1 }}>
          <T variant="small" color={colors.textMuted} numberOfLines={1}>{kicker}</T>
          <T variant="subheading" numberOfLines={2} style={{ marginTop: 2 }}>{title}</T>
          <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>{place}</T>
          {footer ? <View style={{ marginTop: 'auto', paddingTop: 10 }}>{footer}</View> : null}
        </View>
      </Pressable>
      <View style={{ position: 'absolute', top: 8, right: 8 }}><Heart saved={saved} title={title} onSave={onSave} onDark /></View>
    </View>
  );
}

export const MINI_W = 196;
export const CHAMP_W = 300;

const art = StyleSheet.create({
  text: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  big: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 32, color: colors.onInk, letterSpacing: -0.6, ...tabularNums },
  small: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.accent, marginTop: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.onInkMuted, marginTop: 6 },
});

const mod = StyleSheet.create({
  heart: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,249,246,0.92)' },
  heartOnDark: { backgroundColor: 'rgba(15,26,20,0.45)' },

  promo: { height: 300, marginTop: 28, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.ink, shadowColor: '#0F1A14', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  promoTopShade: { position: 'absolute', left: 0, right: 0, top: 0, height: 90 },
  promoShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '82%' },
  promoBody: { flex: 1, padding: 18 },
  promoTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', height: 26, paddingHorizontal: 9, borderRadius: radius.sm, borderWidth: hair, borderColor: 'rgba(251,249,246,0.22)' },
  promoTagText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.onInk, letterSpacing: 0.1 },
  promoKicker: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.accent, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  promoTitle: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 31, letterSpacing: -0.7, color: '#FFFFFF', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  promoPlace: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: 'rgba(244,240,234,0.82)', marginTop: 4 },
  promoRule: { height: hair, backgroundColor: 'rgba(251,249,246,0.22)', marginTop: 14, marginBottom: 12 },
  promoFoot: { flexDirection: 'row', alignItems: 'center' },
  promoFactSplit: { marginLeft: 16, paddingLeft: 16, borderLeftWidth: hair, borderLeftColor: 'rgba(251,249,246,0.22)' },
  promoFactValue: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: '#FFFFFF', ...tabularNums },
  promoFactLabel: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: 'rgba(244,240,234,0.7)' },
  promoCta: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.accent },
  promoCtaText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  promoEdge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.xl, borderWidth: hair, borderColor: 'rgba(255,255,255,0.14)' },
  promoHeart: { position: 'absolute', top: 14, right: 14 },
  promoHeartBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: hair, borderColor: 'rgba(251,249,246,0.22)' },

  mini: { width: MINI_W, minHeight: 168, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, ...shadowSoft },
  miniDate: { width: 40, height: 44, borderRadius: radius.sm, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
  miniDateWord: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13, color: colors.textMuted },
  miniDateNum: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 21, color: colors.text, ...tabularNums },

  panel: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, paddingHorizontal: 14, ...shadowSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  rowDivider: { borderTopWidth: hair, borderTopColor: colors.borderStrong },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  rowDate: { width: 44, height: 48, borderRadius: radius.sm, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },

  champ: { width: CHAMP_W, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, overflow: 'hidden', ...shadowSoft },
  champArt: { height: 110 },
});
