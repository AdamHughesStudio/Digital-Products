import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Sheet, SheetOption, T } from './ui';
import { colors, space } from '@/constants/theme';
import { courseById } from '@/data/courses';
import { isFull, isPast, ME, useStore } from '@/data/store';
import type { Golfer } from '@/data/types';
import { formatTime, relativeDay } from '@/lib/format';

/** Pick one of my open games to invite a golfer to */
export function InviteToGameSheet({ golfer, visible, onClose }: { golfer: Golfer; visible: boolean; onClose: () => void }) {
  const { state, invite } = useStore();
  const [sent, setSent] = useState(false);
  const close = () => {
    onClose();
    setTimeout(() => setSent(false), 300);
  };
  const taken = new Set(Object.values(state.requests).filter((r) => r.golferId === golfer.id && (r.status === 'pending' || r.status === 'accepted')).map((r) => r.gameId));
  const mine = Object.values(state.games)
    .filter((x) => x.hostId === ME && !x.cancelled && !isPast(x) && !isFull(state, x))
    .sort((a, b) => a.teeTime.localeCompare(b.teeTime));

  return (
    <Sheet visible={visible} onClose={close} title={sent ? 'Invite sent' : `Invite ${golfer.firstName}`}>
      {sent ? (
        <>
          <T variant="body" color={colors.textMuted}>{golfer.firstName} will get a notification and can accept straight away. A group chat opens as soon as they do.</T>
          <Button title="Done" style={{ marginTop: space.xl }} onPress={close} />
        </>
      ) : mine.length === 0 ? (
        <>
          <T variant="body" color={colors.textMuted}>You don’t have an open game right now. Post one, then invite {golfer.firstName} from it.</T>
          <Button title="Post a game" style={{ marginTop: space.xl }} onPress={() => { close(); router.push('/post/game'); }} />
        </>
      ) : (
        mine.map((x) => {
          const c = courseById(x.courseId);
          const d = new Date(x.teeTime);
          const already = taken.has(x.id);
          return (
            <SheetOption
              key={x.id}
              icon={already ? 'checkmark-circle' : 'flag'}
              label={c?.name ?? 'Your game'}
              detail={`${relativeDay(d)} at ${formatTime(d)}${already ? '  ·  Already invited' : ''}`}
              onPress={() => {
                if (already) return;
                invite(x.id, golfer.id);
                setSent(true);
              }}
            />
          );
        })
      )}
    </Sheet>
  );
}
