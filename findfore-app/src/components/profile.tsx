import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Row, T, styles as ui } from './ui';
import { colors, radius, shadow, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import type { Game, Golfer } from '@/data/types';
import { NO_HANDICAP, displayName, formatTime, handicapLabel, shortDate } from '@/lib/format';

export function ProfileHeader({ golfer, self, pro }: { golfer: Golfer; self?: boolean; pro?: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Avatar golfer={golfer} size={104} ring />
      <Row gap={8} style={{ marginTop: space.md }}>
        <T variant="title" style={{ textAlign: 'center' }}>{displayName(golfer, self)}</T>
        {pro ? (
          <View style={s.pro} accessibilityLabel="Pro member">
            <T variant="label" color={colors.ink}>Pro</T>
          </View>
        ) : null}
      </Row>
      <Row gap={6} style={{ marginTop: 4 }}>
        <Ionicons name="location-outline" size={15} color={colors.textMuted} />
        <T variant="small" color={colors.textMuted}>{golfer.location.name}</T>
      </Row>
      {golfer.homeClub && (self || golfer.showHomeClub) ? (
        <Row gap={6} style={{ marginTop: 2 }}>
          <Ionicons name="flag-outline" size={15} color={colors.textMuted} />
          <T variant="small" color={colors.textMuted}>{golfer.homeClub}</T>
        </Row>
      ) : null}
      <View style={s.stats}>
        <Stat
          value={golfer.handicap >= NO_HANDICAP ? 'New' : handicapLabel(golfer.handicap)}
          label="Handicap"
          badge={golfer.handicap >= NO_HANDICAP ? 'No handicap yet' : golfer.handicapVerified ? 'Verified' : 'Self reported'}
          verified={golfer.handicapVerified}
        />
        <View style={s.statDivider} />
        <Stat value={String(golfer.gamesPlayed)} label="Games played" />
        <View style={s.statDivider} />
        <Stat value={golfer.rating.toFixed(1)} label="Rating" icon />
      </View>
      {golfer.bio ? <T variant="body" color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.lg, maxWidth: 420 }}>{golfer.bio}</T> : null}
      <T variant="caption" color={colors.textFaint} style={{ marginTop: space.md }}>On FindFore since {golfer.memberSince}</T>
    </View>
  );
}

function Stat({ value, label, badge, verified, icon }: { value: string; label: string; badge?: string; verified?: boolean; icon?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Row gap={4}>
        <T variant="heading" color={colors.onInk}>{value}</T>
        {icon ? <Ionicons name="star" size={15} color={colors.lime} /> : null}
      </Row>
      <T variant="caption" color={colors.onInkMuted}>{label}</T>
      {badge ? (
        <Row gap={3} style={{ marginTop: 3 }}>
          <Ionicons name={verified ? 'shield-checkmark' : 'information-circle-outline'} size={12} color={verified ? colors.lime : colors.onInkFaint} />
          <T variant="caption" color={verified ? colors.lime : colors.onInkFaint}>{badge}</T>
        </Row>
      ) : null}
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
  pro: { backgroundColor: colors.lime, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.pill },
  stats: { flexDirection: 'row', alignItems: 'flex-start', marginTop: space.xl, paddingVertical: space.xl, backgroundColor: colors.ink, borderRadius: radius.panel, width: '100%', ...shadow },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.inkBorder },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dateBox: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
