import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Avatar, styles as ui } from './ui';
import { useStore } from '@/data/store';

/** Your photo in the corner of Home: taps through to your profile */
export function ProfileButton({ onDark: _onDark }: { onDark?: boolean } = {}) {
  const { me } = useStore();
  if (!me) return null;
  return (
    <Pressable onPress={() => router.push('/profile')} hitSlop={6} accessibilityRole="button" accessibilityLabel="Your profile" style={({ pressed }) => [{ width: 44, height: 44 }, pressed && ui.pressed]}>
      <Avatar golfer={me} size={44} />
    </Pressable>
  );
}
