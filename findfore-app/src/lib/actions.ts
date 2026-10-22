import { useMatchNotice } from '@/components/match-notice';
import { useToast } from '@/components/toast';
import { gameCourseName } from '@/data/courses';
import { ME, useStore } from '@/data/store';
import type { JoinRequest } from '@/data/types';
import { relativeDay } from './format';
import { haptic } from './haptics';

/** Request and invite actions with confirmation toasts, haptics and Undo where it makes sense */
export function useRequestActions() {
  const { state, respond, withdrawRequest, restoreRequest, requestToJoin } = useStore();
  const toast = useToast();
  const confirmMatch = useMatchNotice();

  const otherName = (r: JoinRequest) => {
    const g = state.games[r.gameId];
    const otherId = r.golferId === ME ? g?.hostId : r.golferId;
    return (otherId && state.golfers[otherId]?.firstName) || 'them';
  };

  return {
    request(gameId: string, message?: string) {
      const id = requestToJoin(gameId, message);
      const host = state.golfers[state.games[gameId]?.hostId]?.firstName ?? 'the host';
      haptic.success();
      if (!id) return;
      toast(`Request sent to ${host}. We’ll tell you when they reply.`, {
        icon: 'paper-plane',
        action: { label: 'Undo', onPress: () => withdrawRequest(id) },
      });
    },
    accept(r: JoinRequest) {
      const go = () => {
        respond(r.id, true);
        haptic.success();
        toast(r.kind === 'invite' ? 'You’re in! The group chat is open.' : `${otherName(r)} is in, and you’re now friends.`, { icon: 'checkmark-circle' });
      };
      // invites only go between friends; accepting someone's request makes you friends, so say so first
      if (r.kind !== 'request') return go();
      const g = state.games[r.gameId];
      confirmMatch(state.golfers[r.golferId], g ? `${gameCourseName(g) ?? 'the course'}, ${relativeDay(new Date(g.teeTime))}` : '', go);
    },
    decline(r: JoinRequest) {
      respond(r.id, false);
      haptic.warn();
      toast(r.kind === 'invite' ? 'Invite declined' : `Request from ${otherName(r)} declined`, {
        icon: 'close-circle',
        action: { label: 'Undo', onPress: () => restoreRequest(r.id) },
      });
    },
    withdraw(r: JoinRequest) {
      withdrawRequest(r.id);
      haptic.warn();
      toast('Request withdrawn', { icon: 'arrow-undo', action: { label: 'Undo', onPress: () => restoreRequest(r.id) } });
    },
  };
}
