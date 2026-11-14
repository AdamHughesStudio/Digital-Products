import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { T, styles as ui } from './ui';
import { colors, hair, radius, space } from '@/constants/theme';
import { ownPhoto, photoCreditFor, photoFor } from '@/data/course-photos';
import { courseById, gameCourseName } from '@/data/courses';
import { isFull, spacesLeft, useStore } from '@/data/store';
import type { Course, Game } from '@/data/types';
import { distanceMiles, formatTime, milesLabel, priceLabel, relativeDay } from '@/lib/format';

/**
 * The quiet line above a course name: status, then the game type. Casual rounds are the norm,
 * so they carry no label and the line only appears when it says something.
 */
export function gameEyebrow(game: Game, opts: { mine?: boolean; full?: boolean; always?: boolean } = {}) {
  const parts: string[] = [];
  if (opts.mine) parts.push('Your game');
  if (opts.full) parts.push('Full');
  if (game.memberHost) parts.push('Members’ guest rate');
  return parts.join(' · ');
}

/** Dark wash over a course photo that carries ivory copy, so the words stay crisp */
function PhotoOverlay({ strong }: { strong?: boolean }) {
  return (
    <LinearGradient
      colors={strong ? ['rgba(15,26,20,0.3)', 'rgba(15,26,20,0.12)', 'rgba(15,26,20,0.5)', 'rgba(15,26,20,0.9)'] : ['rgba(15,26,20,0.3)', 'rgba(15,26,20,0.12)', 'rgba(15,26,20,0.85)']}
      locations={strong ? [0, 0.3, 0.6, 0.85] : [0, 0.4, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

/** The credit an openly licensed club photo must carry, linked to the photo's licence. Nothing for our own photos. */
export function PhotoCredit({ course }: { course?: Course }) {
  const photo = photoCreditFor(course?.id);
  if (!photo) return null;
  return (
    <Pressable onPress={() => photo.page && Linking.openURL(photo.page)} accessibilityRole="link" style={({ pressed }) => [{ paddingHorizontal: space.md, paddingTop: 6 }, pressed && { opacity: 0.6 }]}>
      <T variant="caption" color={colors.textFaint} numberOfLines={1}>
        {photo.credit}
      </T>
    </Pressable>
  );
}

/** Course header: the course photo when we have one, otherwise generated artwork. `bare` leaves it see-through for a card that has its own photo */
export function CourseArt({ course, height = 150, children, bare }: { course?: Course; height?: number; children?: React.ReactNode; bare?: boolean }) {
  const photo = photoFor(course?.id);
  if (bare || photo) {
    return (
      <View style={{ height, overflow: 'hidden' }}>
        {photo && !bare ? (
          <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" transition={200} />
            <PhotoOverlay />
          </View>
        ) : null}
        {children}
      </View>
    );
  }
  const seed = (course?.id ?? 'x').split('').reduce((n, c) => n + c.charCodeAt(0), 0);
  const palettes: [string, string, string][] = [
    ['#23472A', '#16301B', '#0D1A10'],
    ['#2D4A26', '#1C3318', '#0E1A0C'],
    ['#1F3D2E', '#142A20', '#0B1712'],
    ['#344A22', '#223317', '#111A0B'],
  ];
  const [a, b, c] = palettes[seed % palettes.length];
  const cx = 60 + (seed % 220);
  const cy = 40 + (seed % 60);
  return (
    <View style={{ height, overflow: 'hidden' }}>
      <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={[a, b, c]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        {[110, 85, 62, 41, 22].map((r, i) => (
          <Ellipse key={r} cx={cx} cy={cy} rx={r * 1.9} ry={r} fill="none" stroke={i === 2 ? 'rgba(173,200,162,0.22)' : 'rgba(173,200,162,0.08)'} strokeWidth={1.2} />
        ))}
        <Path d={`M${cx + 190} 200 C ${cx + 150} 150, ${cx + 230} 120, ${cx + 170} 80`} stroke="rgba(255,255,255,0.05)" strokeWidth={34} fill="none" strokeLinecap="round" />
        <Path d={`M${cx} ${cy} V ${cy - 46}`} stroke="#E7E1DB" strokeWidth={2.2} />
        <Path d={`M${cx + 1} ${cy - 46} l 24 8 l -24 8 Z`} fill={colors.accent} />
        <Ellipse cx={cx} cy={cy} rx={9} ry={3} fill="#0F1A14" opacity={0.6} />
      </Svg>
      <LinearGradient colors={['rgba(15,26,20,0)', 'rgba(15,26,20,0.9)']} start={{ x: 0, y: 0.35 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      {children}
    </View>
  );
}

/**
 * The picture at the head of a game, open, championship, club or course page. A course we hold a
 * photo of gets it edge to edge from the very top of the screen, with one soft shade behind the
 * status bar and the buttons. A course without one gets no picture, only the buttons. The page
 * sets its title beneath, so nothing is ever written over a photo.
 */
export function PageHero({ course, height = 240, children }: { course?: Course; height?: number; children: (onPhoto: boolean) => React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const photo = ownPhoto(course);
  if (!photo) return <View style={[heroStyles.bar, { paddingTop: insets.top + 6 }]}>{children(false)}</View>;
  return (
    <View style={{ height: height + insets.top, backgroundColor: colors.mist }}>
      <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" transition={200} accessibilityIgnoresInvertColors />
        <LinearGradient pointerEvents="none" colors={['rgba(15,26,20,0.45)', 'rgba(15,26,20,0)']} style={[heroStyles.shade, { height: 96 + insets.top }]} />
      </View>
      <View style={[heroStyles.bar, heroStyles.over, { top: insets.top + 6 }]}>{children(true)}</View>
    </View>
  );
}

/** Two or three plain facts side by side, between hairlines: the figure, then what it is */
export function Facts({ items, style }: { items: { value: string; label?: string }[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[factStyles.row, style]}>
      {items.map((it, i) => (
        <View key={`${i}${it.value}`} style={[factStyles.col, i > 0 && factStyles.rule]} accessible accessibilityLabel={it.label ? `${it.value}, ${it.label}` : it.value}>
          <T variant="subheading" tabular numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{it.value}</T>
          {it.label ? <T variant="caption" color={colors.textMuted} numberOfLines={2} style={{ marginTop: 1 }}>{it.label}</T> : null}
        </View>
      ))}
    </View>
  );
}

/** A game as a row in a list: where, when, how many spaces and what it costs */
export function GameCard({ game }: { game: Game; compact?: boolean }) {
  const { state, me } = useStore();
  const course = courseById(game.courseId);
  const left = spacesLeft(state, game);
  const full = isFull(state, game);
  const date = new Date(game.teeTime);
  const miles = me && course ? distanceMiles(course, me.location) : undefined;
  const isMine = game.hostId === 'me';
  const photo = ownPhoto(course);
  const eyebrow = gameEyebrow(game, { mine: isMine, full });
  const where = [eyebrow, course?.town, miles !== undefined ? `${milesLabel(miles)} away` : ''].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() => router.push(`/game/${game.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Game at ${gameCourseName(game) ?? 'a golf course'}, ${relativeDay(date)} at ${formatTime(date)}. ${full ? 'Full' : `${left} space${left === 1 ? '' : 's'} left`}. ${priceLabel(game.costPerGolfer)}${isMine ? '. Your game' : ''}${miles !== undefined ? `. ${milesLabel(miles)} away` : ''}.`}
      style={({ pressed }) => [cardStyles.row, pressed && ui.pressed]}>
      {photo ? (
        <Image source={photo} style={cardStyles.thumb} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[cardStyles.thumb, cardStyles.tile]}>
          <Ionicons name="flag" size={18} color={colors.textFaint} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="subheading" numberOfLines={1}>{gameCourseName(game) ?? 'Golf course'}</T>
        <T variant="small" tabular numberOfLines={1}>
          {relativeDay(date)} {formatTime(date)}
          <T variant="small" color={colors.textMuted}>
            {' · '}{full ? 'Full' : `${left} space${left === 1 ? '' : 's'}`}
            {' · '}{priceLabel(game.costPerGolfer)}
          </T>
        </T>
        {where ? <T variant="small" color={colors.textMuted} numberOfLines={1}>{where}</T> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  // a row on the page, ruled off from the one above
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderTopWidth: hair, borderTopColor: colors.borderStrong },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  tile: { backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
});

const heroStyles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  over: { position: 'absolute', left: 0, right: 0 },
  shade: { position: 'absolute', left: 0, right: 0, top: 0 },
});

const factStyles = StyleSheet.create({
  row: { flexDirection: 'row', borderTopWidth: hair, borderBottomWidth: hair, borderColor: colors.borderStrong, paddingVertical: 14 },
  col: { flex: 1, minWidth: 0 },
  rule: { borderLeftWidth: hair, borderLeftColor: colors.borderStrong, paddingLeft: 14, marginLeft: 14 },
});
