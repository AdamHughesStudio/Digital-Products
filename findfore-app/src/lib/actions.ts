import { useToast } from '@/components/toast';
import { ME, useStore } from '@/data/store';
import type { JoinRequest } from '@/data/types';
import { haptic } from './haptics';

/** Request and invite actions with confirmation toasts, haptics and Undo where it makes sense */
export function useRequestActions() {
  const { state, respond, withdrawRequest, restoreRequest, requestToJoin } = useStore();
  const toast = useToast();

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
      if (!id) {
        toast('You need a free credit to join. Host a game to earn one.', { icon: 'alert-circle' });
        return;
      }
      toast(`Request sent to ${host}. 1 credit is held until they reply.`, {
        icon: 'paper-plane',
        action: { label: 'Undo', onPress: () => withdrawRequest(id) },
      });
    },
    accept(r: JoinRequest) {
      respond(r.id, true);
      haptic.success();
      toast(r.kind === 'invite' ? 'You’re in! 1 credit used and the group chat is open.' : `${otherName(r)} is in. You earned 1 credit.`, { icon: 'checkmark-circle' });
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
