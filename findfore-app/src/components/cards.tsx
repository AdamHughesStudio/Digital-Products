import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { AvatarStack, Avatar, Pill, Row, T, styles as ui, type IconName } from './ui';
import { colors, fonts, hairline, radius, shadow, space } from '@/constants/theme';
import { coursePhotos } from '@/data/course-photos';
import { courseById } from '@/data/courses';
import { acceptedFor, isFull, spacesLeft, useStore } from '@/data/store';
import type { Course, Game, GameType, LookingPost } from '@/data/types';
import {
  displayName,
  distanceMiles,
  formatTime,
  fromIsoDate,
  gameTypeLabels,
  handicapLabel, hcpText,
  milesLabel,
  priceLabel,
  relativeDay,
  timeOfDayShort,
} from '@/lib/format';

/**
 * The quiet line above a course name: status, then the game type. Casual rounds are the norm,
 * so they carry no label and the line only appears when it says something.
 */
export function gameEyebrow(game: Game, opts: { mine?: boolean; full?: boolean; always?: boolean } = {}) {
  const parts: string[] = [];
  if (opts.mine) parts.push('Your game');
  if (opts.full) parts.push('Full');
  if (game.type !== 'casual' || opts.always) parts.push(gameTypeLabels[game.type]);
  return parts.join('  ·  ');
}

export const gameTypeIcon: Record<GameType, IconName> = {
  casual: 'people-outline',
  member_guest: 'pricetag-outline',
  competition: 'trophy-outline',
  society: 'ribbon-outline',
  open: 'flag-outline',
};

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
  const photo = course ? coursePhotos[course.id] : undefined;
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
      <Ionicons name={icon} size={19} color={colors.lime} style={{ marginTop: 1 }} />
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
  const photo = course ? coursePhotos[course.id] : undefined;
  const eyebrow = gameEyebrow(game, { mine: isMine, full });
  // member guest games lead with what you save on the visitor rate
  const saving = game.type === 'member_guest' && game.visitorFee && game.costPerGolfer !== undefined && game.visitorFee > game.costPerGolfer ? game.visitorFee - game.costPerGolfer : 0;

  return (
    <Pressable
      onPress={() => router.push(`/game/${game.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${gameTypeLabels[game.type]} at ${course?.name ?? 'a golf course'}, ${relativeDay(date)} at ${formatTime(date)}. ${full ? 'Full' : `${left} space${left === 1 ? '' : 's'} left`}. ${priceLabel(game.costPerGolfer)}${isMine ? '. Your game' : ''}${miles !== undefined ? `. ${milesLabel(miles)} away` : ''}.`}
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
            <T variant="label" color={colors.lime} numberOfLines={1} style={[cardStyles.eyebrow, photo ? cardStyles.photoText : undefined]}>
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
        <Row gap={space.sm}>
          <Meta icon="calendar-outline" top={relativeDay(date)} bottom={formatTime(date)} />
          <Meta icon="people-outline" top={full ? 'Full' : `${left} space${left === 1 ? '' : 's'}`} bottom={full ? 'None left' : 'Free'} />
          <Meta icon="pricetag-outline" top={priceLabel(game.costPerGolfer)} bottom={saving ? `Save £${saving}` : game.type === 'competition' ? 'Entry' : 'Each'} />
        </Row>
      </View>
    </Pressable>
  );
}

export function LookingCard({ post }: { post: LookingPost }) {
  const { state, me } = useStore();
  const g = state.golfers[post.golferId];
  if (!g) return null;
  const miles = me ? distanceMiles(post.location, me.location) : undefined;
  const dates = post.dates.map((d) => relativeDay(fromIsoDate(d))).join(', ');
  const isMine = post.golferId === 'me';
  return (
    <Pressable
      onPress={() => router.push(`/looking/${post.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${isMine ? 'You are' : `${g.firstName} is`} looking for a game. ${dates}. ${timeOfDayShort[post.timeOfDay]}. Within ${post.radiusMiles} miles of ${post.location.name}.`}
      style={({ pressed }) => [cardStyles.card, cardStyles.lookingCard, pressed && ui.pressed]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="label" color={colors.textMuted}>{isMine ? 'You’re looking for a game' : 'Looking for a game'}</T>
        <T variant="caption" color={colors.textFaint}>{miles !== undefined && !isMine ? `${milesLabel(miles)} away` : ''}</T>
      </Row>
      <Row gap={space.md} style={{ marginTop: space.md }}>
        <Avatar golfer={g} size={52} />
        <View style={{ flex: 1 }}>
          <T variant="subheading" numberOfLines={1}>{isMine ? 'You' : displayName(g)}</T>
          <T variant="small" color={colors.textMuted}>
            {hcpText(g.handicap)}  ·  {post.location.name}
          </T>
        </View>
      </Row>
      <Row gap={6} style={{ flexWrap: 'wrap', marginTop: space.md }}>
        <Tag icon="calendar-outline" text={dates} />
        <Tag icon="time-outline" text={timeOfDayShort[post.timeOfDay]} />
        <Tag icon="navigate-outline" text={`${post.location.name} + ${post.radiusMiles} mi`} />
        {post.budget !== undefined ? <Tag icon="cash-outline" text={`Up to £${post.budget}`} /> : null}
      </Row>
      {post.message ? (
        <T variant="small" color={colors.textMuted} numberOfLines={2} style={{ marginTop: space.md }}>
          {'“'}{post.message}{'”'}
        </T>
      ) : null}
    </Pressable>
  );
}

/** Small card for a golfer who's free to play, sized for a sideways row */
export function GolferFreeCard({ post }: { post: LookingPost }) {
  const { state, me } = useStore();
  const g = state.golfers[post.golferId];
  if (!g) return null;
  const miles = me ? distanceMiles(post.location, me.location) : undefined;
  const first = post.dates.map(fromIsoDate).sort((a, b) => a.getTime() - b.getTime())[0];
  const when = `${relativeDay(first)}${post.dates.length > 1 ? ` +${post.dates.length - 1}` : ''}`;
  return (
    <Pressable
      onPress={() => router.push(`/looking/${post.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${g.firstName} is free to play ${when}, ${timeOfDayShort[post.timeOfDay].toLowerCase()}. ${hcpText(g.handicap)}.`}
      style={({ pressed }) => [cardStyles.card, cardStyles.mini, pressed && ui.pressed]}>
      <Row gap={space.md}>
        <Avatar golfer={g} size={44} />
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong" numberOfLines={1}>{g.firstName}</T>
          <T variant="caption" color={colors.textMuted} numberOfLines={1}>{hcpText(g.handicap)}</T>
        </View>
      </Row>
      <View style={{ marginTop: space.md, gap: 4 }}>
        <Row gap={6}>
          <Ionicons name="calendar-outline" size={14} color={colors.text} />
          <T variant="smallStrong" numberOfLines={1}>{when}  ·  {timeOfDayShort[post.timeOfDay]}</T>
        </Row>
        <Row gap={6}>
          <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
          <T variant="small" color={colors.textMuted} numberOfLines={1}>{miles !== undefined ? `${milesLabel(miles)} away` : post.location.name}</T>
        </Row>
      </View>
    </Pressable>
  );
}

function Tag({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={cardStyles.tag}>
      <Ionicons name={icon} size={13} color={colors.text} />
      <Text style={cardStyles.tagText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: hairline, overflow: 'hidden', marginBottom: space.md, ...shadow },
  dark: { backgroundColor: colors.ink, borderColor: colors.ink },
  eyebrow: { marginBottom: 4, fontSize: 10.5, letterSpacing: 1.4 },
  titleBlock: { position: 'absolute', left: 16, right: 16, bottom: 12 },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg },
  lookingCard: { padding: space.lg },
  photoText: { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  mini: { width: 200, padding: space.md, marginBottom: space.md },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10, maxWidth: '100%' },
  tagText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12 },
});
