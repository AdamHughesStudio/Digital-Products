import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { AvatarStack, Avatar, Pill, Row, T, styles as ui, type IconName } from './ui';
import { colors, fonts, hairline, radius, shadow, space } from '@/constants/theme';
import { photoFor } from '@/data/course-photos';
import { courseById } from '@/data/courses';
import { acceptedFor, isFull, spacesLeft, useStore } from '@/data/store';
import type { Course, Game } from '@/data/types';
import {
  displayName,
  distanceMiles,
  formatTime,
  handicapLabel, hcpText,
  milesLabel,
  priceLabel,
  relativeDay,
} from '@/lib/format';

/**
 * The quiet line above a course name: status, then the game type. Casual rounds are the norm,
 * so they carry no label and the line only appears when it says something.
 */
export function gameEyebrow(game: Game, opts: { mine?: boolean; full?: boolean; always?: boolean } = {}) {
  const parts: string[] = [];
  if (opts.mine) parts.push('Your game');
  if (opts.full) parts.push('Full');
  if (game.memberHost) parts.push('Members’ guest rate');
  return parts.join('  ·  ');
}

/** Generated course artwork: fairway gradients and contour lines, varied per course */
/** Dark wash over course photos so white copy, lime icons and pills stay crisp */
function PhotoOverlay({ strong }: { strong?: boolean }) {
  return (
    <LinearGradient
      colors={strong ? ['rgba(11,11,11,0.3)', 'rgba(11,11,11,0.12)', 'rgba(11,11,11,0.5)', 'rgba(11,11,11,0.9)'] : ['rgba(11,11,11,0.3)', 'rgba(11,11,11,0.12)', 'rgba(11,11,11,0.85)']}
      locations={strong ? [0, 0.3, 0.6, 0.85] : [0, 0.4, 1]}
      style={StyleSheet.absoluteFill}
    />
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
          <Ellipse key={r} cx={cx} cy={cy} rx={r * 1.9} ry={r} fill="none" stroke={i === 2 ? 'rgba(199,255,0,0.22)' : 'rgba(199,255,0,0.08)'} strokeWidth={1.2} />
        ))}
        <Path d={`M${cx + 190} 200 C ${cx + 150} 150, ${cx + 230} 120, ${cx + 170} 80`} stroke="rgba(255,255,255,0.05)" strokeWidth={34} fill="none" strokeLinecap="round" />
        <Path d={`M${cx} ${cy} V ${cy - 46}`} stroke="#F3F4F6" strokeWidth={2.2} />
        <Path d={`M${cx + 1} ${cy - 46} l 24 8 l -24 8 Z`} fill={colors.lime} />
        <Ellipse cx={cx} cy={cy} rx={9} ry={3} fill="#0B0B0B" opacity={0.6} />
      </Svg>
      <LinearGradient colors={['rgba(11,11,11,0)', 'rgba(11,11,11,0.9)']} start={{ x: 0, y: 0.35 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      {children}
    </View>
  );
}

function Meta({ icon, top, bottom }: { icon: IconName; top: string; bottom: string }) {
  return (
    <Row gap={8} align="flex-start" style={{ flex: 1 }}>
      <Ionicons name={icon} size={19} color={colors.white} style={{ marginTop: 1 }} />
      <View style={{ flexShrink: 1 }}>
        <T variant="smallStrong" color={colors.onInk} numberOfLines={1}>{top}</T>
        <T variant="caption" color={colors.onInkMuted} numberOfLines={1}>{bottom}</T>
      </View>
    </Row>
  );
}

export function GameCard({ game, compact }: { game: Game; compact?: boolean }) {
  const { state, me } = useStore();
  const course = courseById(game.courseId);
  const left = spacesLeft(state, game);
  const full = isFull(state, game);
  const date = new Date(game.teeTime);
  const miles = me && course ? distanceMiles(course, me.location) : undefined;
  const isMine = game.hostId === 'me';
  const photo = photoFor(course?.id);
  const eyebrow = gameEyebrow(game, { mine: isMine, full });
  // member guest games lead with what you save on the visitor rate

  return (
    <Pressable
      onPress={() => router.push(`/game/${game.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Game at ${course?.name ?? 'a golf course'}, ${relativeDay(date)} at ${formatTime(date)}. ${full ? 'Full' : `${left} space${left === 1 ? '' : 's'} left`}. ${priceLabel(game.costPerGolfer)}${isMine ? '. Your game' : ''}${miles !== undefined ? `. ${milesLabel(miles)} away` : ''}.`}
      style={({ pressed }) => [cardStyles.card, cardStyles.dark, pressed && ui.pressed]}>
      {photo ? (
        <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" transition={200} />
          <PhotoOverlay strong />
        </View>
      ) : null}
      <CourseArt course={course} height={compact ? 110 : 140} bare={!!photo}>
        <View style={cardStyles.titleBlock}>
          {eyebrow ? (
            <T variant="label" color={colors.white} numberOfLines={1} style={[cardStyles.eyebrow, photo ? cardStyles.photoText : undefined]}>
              {eyebrow}
            </T>
          ) : null}
          <T variant="heading" color={colors.onInk} numberOfLines={1} style={photo ? cardStyles.photoText : undefined}>{course?.name ?? 'Golf course'}</T>
          <T variant="small" color={colors.onInkMuted} numberOfLines={1}>
            {course?.town}
            {miles !== undefined ? `  ·  ${milesLabel(miles)} away` : ''}
          </T>
        </View>
      </CourseArt>
      <View style={cardStyles.body}>
        <T variant="small" color={colors.onInk} numberOfLines={1}>
          {relativeDay(date)} {formatTime(date)}
          <T variant="small" color={colors.onInkMuted}>
            {'  ·  '}{full ? 'Full' : `${left} space${left === 1 ? '' : 's'}`}
            {'  ·  '}{priceLabel(game.costPerGolfer)}
          </T>
        </T>
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: hairline, overflow: 'hidden', marginBottom: space.xl, ...shadow },
  dark: { backgroundColor: colors.ink, borderColor: colors.ink },
  eyebrow: { marginBottom: 4, fontSize: 10.5, letterSpacing: 1.4 },
  titleBlock: { position: 'absolute', left: 20, right: 20, bottom: 16 },
  body: { paddingHorizontal: space.xl, paddingTop: 2, paddingBottom: space.lg },
  photoText: { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  mini: { width: 200, padding: space.md, marginBottom: space.md },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10, maxWidth: '100%' },
  tagText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12 },
});
