import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Row, Sheet, T } from './ui';
import { colors, space } from '@/constants/theme';
import { useStore } from '@/data/store';

type Point = { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string };

const INTROS: Record<'game' | 'competition', { key: string; title: string; lead: string; points: Point[] }> = {
  game: {
    key: 'intro-game-v1',
    title: 'What’s a game?',
    lead: 'A round a golfer has booked, with space for others to join.',
    points: [
      { icon: 'flag-outline', title: 'A golfer’s own tee time', body: 'They’ve booked the round and posted the spaces they have left. Some hosts are members, so you play at their guest rate.' },
      { icon: 'hand-right-outline', title: 'Ask for a space', body: 'Tap Request to join. The host sees your profile and handicap, then says yes or no.' },
      { icon: 'chatbubbles-outline', title: 'Sort the rest in chat', body: 'Once you’re in, a group chat opens for meeting times and anything else.' },
      { icon: 'cash-outline', title: 'Pay at the club', body: 'You pay the green fee at the club on the day.' },
    ],
  },
  competition: {
    key: 'intro-competition-v1',
    title: 'What’s a competition?',
    lead: 'An event you enter and play for a result, against a field of other golfers.',
    points: [
      { icon: 'trophy-outline', title: 'Opens and championships', body: 'Clubs open their competitions to visiting golfers. Championships are run by the national golf unions.' },
      { icon: 'open-outline', title: 'Enter with the club', body: 'Tap Enter to go to the club’s own entry page. PlusFore finds them for you; the club takes the entry.' },
      { icon: 'bookmark-outline', title: 'Save it to your season', body: 'Saved competitions go on My season, and we remind you before the day.' },
      { icon: 'people-outline', title: 'Bring your friends', body: 'Invite friends to it, and see which of them are interested.' },
    ],
  },
};

/**
 * Explains what a game or a competition is, the first time a golfer opens one. Shown once per kind,
 * remembered with the golfer's other dismissed tips.
 */
export function FirstTimeIntro({ kind }: { kind: 'game' | 'competition' }) {
  const { state, dismissTip } = useStore();
  const intro = INTROS[kind];
  const seen = (state.dismissedTips ?? []).includes(intro.key);
  const [open, setOpen] = useState(false);
  // a moment after the page appears, so it reads as a welcome rather than a block
  useEffect(() => {
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [seen]);
  const close = () => {
    setOpen(false);
    dismissTip(intro.key);
  };
  if (seen && !open) return null;
  return (
    <Sheet visible={open} onClose={close} title={intro.title}>
      <T variant="body" color={colors.textMuted} style={{ marginTop: -space.xs }}>{intro.lead}</T>
      <View style={{ gap: space.lg, marginTop: space.xl }}>
        {intro.points.map((p) => (
          <Row key={p.title} gap={space.md} align="flex-start">
            <Ionicons name={p.icon} size={22} color={colors.sageDeep} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{p.title}</T>
              <T variant="small" color={colors.textMuted}>{p.body}</T>
            </View>
          </Row>
        ))}
      </View>
      <Button title="Got it" onPress={close} style={{ marginTop: space.xl }} />
    </Sheet>
  );
}
