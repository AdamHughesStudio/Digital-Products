import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { AvatarStack, Avatar, Pill, Row, T, styles as ui, type IconName } from './ui';
import { colors, fonts, radius, shadow, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { acceptedFor, isFull, spacesLeft, useStore } from '@/data/store';
import type { Course, Game, GameType, LookingPost } from '@/data/types';
import {
  displayName,
  distanceMiles,
  formatTime,
  fromIsoDate,
  gameTypeLabels,
  handicapLabel,
  milesLabel,
  priceLabel,
  relativeDay,
  timeOfDayShort,
} from '@/lib/format';

export const gameTypeIcon: Record<GameType, IconName> = {
  casual: 'people-outline',
  member_guest: 'pricetag-outline',
  competition: 'trophy-outline',
  society: 'ribbon-outline',
  open: 'flag-outline',
};

/** Generated course artwork: fairway gradients and contour lines, varied per course */
export function CourseArt({ course, height = 150, children }: { course?: Course; height?: number; children?: React.ReactNode }) {
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
  const host = state.golfers[game.hostId];
  const left = spacesLeft(state, game);
  const full = isFull(state, game);
  const date = new Date(game.teeTime);
  const miles = me && course ? distanceMiles(course, me.location) : undefined;
  const players = [host, ...acceptedFor(state, game.id).map((r) => state.golfers[r.golferId])].filter(Boolean);
  const isMine = game.hostId === 'me';

  return (
    <Pressable onPress={() => router.push(`/game/${game.id}`)} style={({ pressed }) => [cardStyles.card, cardStyles.dark, pressed && ui.pressed]}>
      <CourseArt course={course} height={compact ? 110 : 140}>
        <Row style={cardStyles.topRow}>
          <Pill label={gameTypeLabels[game.type]} icon={gameTypeIcon[game.type]} />
          {full ? <Pill label="Full" tone="muted" /> : isMine ? <Pill label="Your game" tone="lime" /> : null}
        </Row>
        <View style={cardStyles.titleBlock}>
          <T variant="heading" color={colors.onInk} numberOfLines={1}>{course?.name ?? 'Golf course'}</T>
          <T variant="small" color={colors.onInkMuted} numberOfLines={1}>
            {course?.town}
            {miles !== undefined ? `  ·  ${milesLabel(miles)} away` : ''}
          </T>
        </View>
      </CourseArt>
      <View style={cardStyles.body}>
        <Row gap={space.sm}>
          <Meta icon="calendar-outline" top={relativeDay(date)} bottom={formatTime(date)} />
          <Meta icon="people-outline" top={full ? 'Full' : `${left} space${left === 1 ? '' : 's'}`} bottom={full ? 'No spaces left' : 'Looking for players'} />
          <Meta icon="pricetag-outline" top={priceLabel(game.costPerGolfer)} bottom={game.type === 'member_guest' ? 'Guest rate' : game.type === 'competition' ? 'Entry fee' : 'Per golfer'} />
        </Row>
        {!compact ? (
          <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
            <Row gap={8} style={{ flex: 1 }}>
              <AvatarStack golfers={players.slice(0, 4)} size={26} ring={colors.ink} />
              <T variant="caption" color={colors.onInkMuted} numberOfLines={1} style={{ flex: 1 }}>
                Hosted by {isMine ? 'you' : host ? displayName(host) : 'a golfer'}
              </T>
            </Row>
            <Ionicons name="chevron-forward" size={18} color={colors.onInkFaint} />
          </Row>
        ) : null}
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
    <Pressable onPress={() => router.push(`/looking/${post.id}`)} style={({ pressed }) => [cardStyles.card, cardStyles.lookingCard, pressed && ui.pressed]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pill label={isMine ? 'You’re looking for a game' : 'Looking for a game'} icon="search" tone={isMine ? 'lime' : 'light'} />
        <T variant="caption" color={colors.textFaint}>{miles !== undefined && !isMine ? `${milesLabel(miles)} away` : ''}</T>
      </Row>
      <Row gap={space.md} style={{ marginTop: space.md }}>
        <Avatar golfer={g} size={52} />
        <View style={{ flex: 1 }}>
          <T variant="subheading" numberOfLines={1}>{isMine ? 'You' : displayName(g)}</T>
          <T variant="small" color={colors.textMuted}>
            {handicapLabel(g.handicap)} HCP  ·  {post.location.name}
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

function Tag({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={cardStyles.tag}>
      <Ionicons name={icon} size={13} color={colors.text} />
      <Text style={cardStyles.tagText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: space.md, ...shadow },
  dark: { backgroundColor: colors.ink, borderColor: colors.ink },
  topRow: { position: 'absolute', top: 12, left: 12, right: 12, justifyContent: 'space-between' },
  titleBlock: { position: 'absolute', left: 16, right: 16, bottom: 12 },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg },
  lookingCard: { padding: space.lg },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surfaceRaised, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 10, maxWidth: '100%' },
  tagText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12 },
});
