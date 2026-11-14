import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Facts } from './cards';
import { Avatar, Row, T, styles as ui } from './ui';
import { colors, radius, space } from '@/constants/theme';
import { courseById, gameCourseName, courses } from '@/data/courses';
import { useFriends } from '@/data/friends';
import type { Game, Golfer } from '@/data/types';
import { NO_HANDICAP, displayName, formatTime, handicapLabel, shortDate } from '@/lib/format';

/**
 * Who a golfer is: photo, name and where they play, then handicap, games played and friends on one
 * line. No public rating: how a round went stays private to each golfer. Used for your own profile
 * and other golfers'.
 */
export function ProfileHeader({ golfer, self, onEdit, onShare }: { golfer: Golfer; self?: boolean; onEdit?: () => void; onShare?: () => void }) {
  const noHcp = golfer.handicap >= NO_HANDICAP;
  // your own count comes from your friends list; other golfers' from the account
  const mine = useFriends().friends.length;
  const friends = self ? mine : golfer.friendCount ?? 0;
  return (
    <View>
      <Row gap={space.lg} align="flex-start">
        {onEdit ? (
          <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Change your photo">
            <Avatar golfer={golfer} size={72} />
          </Pressable>
        ) : (
          <Avatar golfer={golfer} size={72} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="title" accessibilityRole="header">{displayName(golfer, self)}</T>
          <T variant="small" color={colors.textMuted} style={{ marginTop: 1 }} selectable>@{golfer.username}</T>
          <Row gap={5} style={{ marginTop: 6 }}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <T variant="small" color={colors.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>{golfer.location.name}</T>
          </Row>
          {golfer.homeClub && (self || golfer.showHomeClub) ? (
            <Pressable
              onPress={() => {
                const club = courses.find((c) => c.name === golfer.homeClub);
                if (club) router.push(`/club/${club.id}`);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Home club, ${golfer.homeClub}`}
              hitSlop={6}
              style={({ pressed }) => pressed && ui.pressed}>
              <Row gap={5} style={{ marginTop: 2 }}>
                <Ionicons name="flag-outline" size={14} color={colors.text} />
                <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>{golfer.homeClub}</T>
                <Ionicons name="chevron-forward" size={12} color={colors.textFaint} />
              </Row>
            </Pressable>
          ) : null}
        </View>
        {onEdit || onShare ? (
          <View style={{ marginTop: -6, marginRight: -8 }}>
            {onEdit ? (
              <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit profile" hitSlop={4} style={({ pressed }) => [s.edit, pressed && { opacity: 0.5 }]}>
                <Ionicons name="create-outline" size={22} color={colors.text} />
              </Pressable>
            ) : null}
            {onShare ? (
              <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share your profile" hitSlop={4} style={({ pressed }) => [s.edit, pressed && { opacity: 0.5 }]}>
                <Ionicons name="share-outline" size={22} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Row>

      <Facts
        style={{ marginTop: space.lg }}
        items={[
          { value: noHcp ? 'New' : handicapLabel(golfer.handicap), label: noHcp ? 'No handicap yet' : golfer.handicapVerified ? 'Handicap · verified' : 'Handicap' },
          { value: String(golfer.gamesPlayed), label: golfer.gamesPlayed === 1 ? 'Game played' : 'Games played' },
          { value: String(friends), label: friends === 1 ? 'Friend' : 'Friends' },
        ]}
      />

      {golfer.bio ? <T variant="body" style={{ marginTop: space.md }}>{golfer.bio}</T> : null}
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
        <T variant="caption" color={colors.textMuted}>{shortDate(d).split(' ')[0]}</T>
        <T variant="subheading" tabular>{d.getDate()}</T>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="bodyStrong" numberOfLines={1}>{c ? gameCourseName(game) : null}</T>
        <T variant="small" color={colors.textMuted} tabular numberOfLines={1}>{shortDate(d)} at {formatTime(d)}{note ? ` · ${note}` : ''}</T>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  edit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, minHeight: 60 },
  dateBox: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' },
});
