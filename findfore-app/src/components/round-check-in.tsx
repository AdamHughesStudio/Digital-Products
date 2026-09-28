import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useToast } from './toast';
import { Avatar, Button, Row, T, styles as ui, type IconName } from './ui';
import { colors, radius, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { playingPartners, useStore } from '@/data/store';
import type { Game } from '@/data/types';
import { relativeDay, timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';

/** After a round: did they show up, thumbs up or down, and save them to My Golfers. Private to you */
export function RoundCheckIn({ game, compact }: { game: Game; compact?: boolean }) {
  const { state, rateGolfer, finishRound, toggleSaved } = useStore();
  const toast = useToast();
  const course = courseById(game.courseId);
  const partners = playingPartners(state, game);
  const fb = (id: string) => (state.feedback ?? []).find((f) => f.gameId === game.id && f.golferId === id);

  if (partners.length === 0) return null;

  const done = () => {
    finishRound(game.id);
    haptic.success();
    toast('Thanks. Your feedback is private and helps keep games friendly.', { icon: 'heart' });
  };

  return (
    <View style={s.card}>
      <Row style={{ justifyContent: 'space-between' }} align="flex-start">
        <View style={{ flex: 1 }}>
          <T variant="label" color={colors.lime}>After your round</T>
          <T variant="heading" color={colors.onInk} style={{ marginTop: 4 }}>How was {course?.name.split(' (')[0]}?</T>
          <T variant="small" color={colors.onInkMuted}>{relativeDay(new Date(game.teeTime)) === 'Today' ? 'Today' : timeAgo(game.teeTime)}  ·  Only you can see this</T>
        </View>
        {!compact ? (
          <Pressable onPress={() => finishRound(game.id)} hitSlop={10} accessibilityLabel="Skip">
            <T variant="smallStrong" color={colors.onInkFaint}>Skip</T>
          </Pressable>
        ) : null}
      </Row>

      <View style={{ gap: space.md, marginTop: space.lg }}>
        {partners.map((p) => {
          const f = fb(p.id);
          const saved = state.savedGolferIds.includes(p.id);
          return (
            <View key={p.id} style={s.person}>
              <Pressable onPress={() => router.push(`/golfer/${p.id}`)}>
                <Row gap={space.md}>
                  <Avatar golfer={p} size={40} />
                  <T variant="bodyStrong" color={colors.onInk} style={{ flex: 1 }}>{p.firstName}</T>
                  <Toggle icon={f?.thumbs === 'up' ? 'thumbs-up' : 'thumbs-up-outline'} label="Would play again" on={f?.thumbs === 'up'} onPress={() => rateGolfer(game.id, p.id, { thumbs: 'up' })} />
                  <Toggle icon={f?.thumbs === 'down' ? 'thumbs-down' : 'thumbs-down-outline'} label="Would not play again" on={f?.thumbs === 'down'} onPress={() => rateGolfer(game.id, p.id, { thumbs: 'down' })} />
                  <Toggle
                    icon={saved ? 'star' : 'star-outline'}
                    label={saved ? `${p.firstName} is in My Golfers` : `Save ${p.firstName} to My Golfers`}
                    on={saved}
                    onPress={() => {
                      toggleSaved(p.id);
                      haptic.select();
                    }}
                  />
                </Row>
              </Pressable>
              <Row gap={space.sm} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
                <T variant="small" color={colors.onInkMuted} style={{ marginRight: 2 }}>Did they show up?</T>
                <Choice label="Yes" on={f?.showedUp === true} onPress={() => rateGolfer(game.id, p.id, { showedUp: true })} />
                <Choice label="No" on={f?.showedUp === false} onPress={() => rateGolfer(game.id, p.id, { showedUp: false })} />
              </Row>
            </View>
          );
        })}
      </View>
      <Button title="Done" size="md" onPress={done} style={{ marginTop: space.lg }} />
    </View>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [s.choice, on && s.choiceOn, pressed && ui.pressed]}>
      <T variant="smallStrong" color={on ? colors.ink : colors.onInk}>{label}</T>
    </Pressable>
  );
}

function Toggle({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [s.toggle, on && s.toggleOn, pressed && ui.pressed]}>
      <Ionicons name={icon} size={18} color={on ? colors.ink : colors.onInk} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.ink, borderRadius: radius.panel, padding: space.xl },
  person: { backgroundColor: colors.inkRaised, borderRadius: radius.lg, padding: space.md },
  choice: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.inkBorder },
  choiceOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  toggle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.inkBorder, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.lime, borderColor: colors.lime },
});
