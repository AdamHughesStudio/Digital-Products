import type { StyleProp, ViewStyle } from 'react-native';

import { useToast } from './toast';
import { Button } from './ui';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  friendStatus,
  removeFriend,
  restoreFriend,
  sendFriendRequest,
  useFriends,
} from '@/data/friends';
import type { Golfer } from '@/data/types';
import { haptic } from '@/lib/haptics';

/**
 * One button for every stage of a friendship: Add friend, Requested (tap to cancel),
 * Accept (they asked you) and Friends (tap to remove, with undo).
 */
export function FriendButton({ golfer, size = 'sm', style, compact, noIcon }: { golfer: Golfer; size?: 'sm' | 'md' | 'lg'; style?: StyleProp<ViewStyle>; compact?: boolean; noIcon?: boolean }) {
  const friends = useFriends();
  const toast = useToast();
  const status = friendStatus(friends, golfer.id);
  const name = golfer.firstName;

  if (status === 'friend') {
    return (
      <Button
        title="Friends"
        icon={noIcon ? undefined : 'checkmark-circle'}
        kind="ghost"
        size={size}
        style={style}
        onPress={() => {
          removeFriend(golfer.id);
          toast(`${name} removed from your friends`, { icon: 'person-remove-outline', action: { label: 'Undo', onPress: () => restoreFriend(golfer.id) } });
        }}
      />
    );
  }
  if (status === 'requested') {
    return (
      <Button
        title={compact ? 'Sent' : 'Requested'}
        icon={noIcon ? undefined : 'time-outline'}
        kind="ghost"
        size={size}
        style={style}
        onPress={() => {
          cancelFriendRequest(golfer.id);
          toast(`Request to ${name} cancelled`, { icon: 'close-circle-outline' });
        }}
      />
    );
  }
  if (status === 'incoming') {
    return (
      <Button
        title="Accept"
        icon={noIcon ? undefined : 'person-add'}
        size={size}
        style={style}
        onPress={() => {
          acceptFriendRequest(golfer.id);
          haptic.success();
          toast(`You and ${name} are now friends`, { icon: 'people' });
        }}
      />
    );
  }
  return (
    <Button
      title={compact ? 'Add' : 'Add friend'}
      icon={noIcon ? undefined : 'person-add-outline'}
      kind={compact ? 'ghost' : 'dark'}
      size={size}
      style={style}
      onPress={() => {
        sendFriendRequest(golfer.id);
        haptic.success();
        toast(`Friend request sent to ${name}`, { icon: 'paper-plane-outline' });
      }}
    />
  );
}
