import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Row, T, styles as ui } from './ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import type { Game, Golfer } from '@/data/types';
import { NO_HANDICAP, displayName, formatTime, handicapLabel, shortDate } from '@/lib/format';

/**
 * Identity panel: photo, name and where they play on one dark card, with the three numbers that
 * matter along the bottom. Used for your own profile and other golfers'.
 */
export function ProfileHeader({ golfer, self, pro, onEdit }: { golfer: Golfer; self?: boolean; pro?: boolean; onEdit?: () => void }) {
  const noHcp = golfer.handicap >= NO_HANDICAP;
  return (
    <View style={s.panel}>
      <Row gap={space.lg} align="flex-start">
        <Avatar golfer={golfer} size={84} ring={pro} />
        <View style={{ flex: 1, paddingTop: 4 }}>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <T variant="title" color={colors.onInk} style={{ fontSize: 24, lineHeight: 28 }}>{displayName(golfer, self)}</T>
            {pro ? (
              <View style={s.pro} accessibilityLabel="Pro member">
                <T variant="label" color={colors.ink}>Pro</T>
              </View>
            ) : null}
          </Row>
          <Row gap={6} style={{ marginTop: 6 }}>
            <Ionicons name="location" size={14} color={colors.onInkMuted} />
            <T variant="small" color={colors.onInkMuted}>{golfer.location.name}</T>
          </Row>
          {golfer.homeClub && (self || golfer.showHomeClub) ? (
            <Row gap={6} style={{ marginTop: 2 }}>
              <Ionicons name="flag" size={14} color={colors.onInkMuted} />
              <T variant="small" color={colors.onInkMuted} numberOfLines={1}>{golfer.homeClub}</T>
            </Row>
          ) : null}
        </View>
        {onEdit ? (
          <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit profile" hitSlop={8} style={({ pressed }) => [s.edit, pressed && ui.pressed]}>
            <Ionicons name="create-outline" size={18} color={colors.onInk} />
          </Pressable>
        ) : null}
      </Row>

      <View style={s.stats}>
        <Stat value={noHcp ? 'New' : handicapLabel(golfer.handicap)} label={noHcp ? 'No handicap yet' : golfer.handicapVerified ? 'Handicap · verified' : 'Handicap'} verified={golfer.handicapVerified && !noHcp} />
        <View style={s.statDivider} />
        <Stat value={String(golfer.gamesPlayed)} label={golfer.gamesPlayed === 1 ? 'Game played' : 'Games played'} />
        <View style={s.statDivider} />
        <Stat value={golfer.rating.toFixed(1)} label="Rating" star />
      </View>

      {golfer.bio ? <T variant="body" color={colors.onInkMuted} style={{ marginTop: space.lg }}>{golfer.bio}</T> : null}
      <T variant="caption" color={colors.onInkFaint} style={{ marginTop: space.md }}>On FindFore since {golfer.memberSince}</T>
    </View>
  );
}

function Stat({ value, label, verified, star }: { value: string; label: string; verified?: boolean; star?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Row gap={4}>
        <T variant="heading" color={colors.onInk}>{value}</T>
        {star ? <Ionicons name="star" size={14} color={colors.lime} /> : null}
        {verified ? <Ionicons name="shield-checkmark" size={14} color={colors.lime} /> : null}
      </Row>
      <T variant="caption" color={colors.onInkMuted} style={{ textAlign: 'center' }}>{label}</T>
    </View>
  );
}

/** Compact game row, used for past games and small lists */
export function GameRow({ game, note }: { game: Game; note?: string }) {
  const c = courseById(game.courseId);
  const d = new Date(game.teeTime);
  return (
    <Pressable onPress={() => router.push(`/game/${game.id}`)} style={({ pressed }) => [s.gameRow, pressed && ui.pressed]}>
      <View style={s.dateBox}>
        <T variant="caption" color={colors.lime}>{shortDate(d).split(' ')[0].toUpperCase()}</T>
        <T variant="subheading" color={colors.onInk}>{d.getDate()}</T>
      </View>
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" numberOfLines={1}>{c?.name}</T>
        <T variant="caption" color={colors.textMuted}>{shortDate(d)} at {formatTime(d)}{note ? `  ·  ${note}` : ''}</T>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  panel: { backgroundColor: colors.ink, borderRadius: radius.panel, padding: space.xl, ...shadow },
  pro: { backgroundColor: colors.lime, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.pill, alignSelf: 'center' },
  edit: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.inkHigh, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', alignItems: 'flex-start', marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.inkBorder },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.inkBorder },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  dateBox: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
