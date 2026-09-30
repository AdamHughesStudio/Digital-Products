import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CourseArt } from './cards';
import { Row, T, styles as ui } from './ui';
import { colors, hairline, radius, shadow, space } from '@/constants/theme';
import type { ClubListing } from '@/data/clubs';
import { milesLabel } from '@/lib/format';

const STYLE_LABEL: Record<string, string> = { links: 'Links', parkland: 'Parkland', heathland: 'Heathland', moorland: 'Moorland', downland: 'Downland', 'inland links': 'Inland links' };

/** A club in the directory: course art, where it is, and the cheapest way to play it */
export function ClubCard({ listing, width, compact }: { listing: ClubListing; width?: number; compact?: boolean }) {
  const { profile, miles, guestRate, openGames, opens } = listing;
  const c = profile.course;
  const rack = c.visitorFee;
  const saving = guestRate !== undefined && rack ? rack - guestRate : 0;
  return (
    <Pressable
      onPress={() => router.push(`/club/${c.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${c.name}, ${c.town}, ${milesLabel(miles)} away. ${guestRate !== undefined ? `Play as a guest from £${guestRate}` : rack ? `Green fee £${rack}` : ''}`}
      style={({ pressed }) => [s.card, width ? { width } : null, pressed && ui.pressed]}>
      <CourseArt course={c} height={compact ? 96 : 120}>
        <View style={s.tag}>
          <T variant="label" color={colors.ink}>{STYLE_LABEL[profile.style]}</T>
        </View>
      </CourseArt>
      <View style={s.body}>
        <T variant="subheading" numberOfLines={1}>{c.name}</T>
        <T variant="small" color={colors.textMuted} numberOfLines={1}>{c.town}  ·  {milesLabel(miles)} away</T>
        <Row gap={space.md} style={{ marginTop: space.sm, flexWrap: 'wrap' }}>
          {guestRate !== undefined ? (
            <Row gap={5}>
              <View style={s.dot} />
              <T variant="smallStrong">Guest from £{guestRate}</T>
              {saving > 0 ? <T variant="caption" color={colors.textMuted}>save £{saving}</T> : null}
            </Row>
          ) : rack ? (
            <Row gap={5}>
              <Ionicons name="pricetag-outline" size={13} color={colors.textMuted} />
              <T variant="small" color={colors.textMuted}>£{rack} green fee</T>
            </Row>
          ) : null}
          {openGames > 0 && guestRate === undefined ? (
            <Row gap={5}>
              <Ionicons name="people-outline" size={13} color={colors.textMuted} />
              <T variant="small" color={colors.textMuted}>{openGames} game{openGames === 1 ? '' : 's'} to join</T>
            </Row>
          ) : null}
          {opens > 0 ? (
            <Row gap={5}>
              <Ionicons name="trophy-outline" size={13} color={colors.textMuted} />
              <T variant="small" color={colors.textMuted}>{opens} open{opens === 1 ? '' : 's'}</T>
            </Row>
          ) : null}
        </Row>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: hairline, overflow: 'hidden', marginBottom: space.md, ...shadow },
  body: { paddingHorizontal: space.lg, paddingVertical: space.md },
  tag: { position: 'absolute', left: 12, top: 12, backgroundColor: colors.lime, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime, borderWidth: 1, borderColor: colors.ink },
});
