import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small, consistent haptic vocabulary. Silent on the web, where there is no taptic engine.
const on = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  /** light tap for buttons */
  tap: () => on && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** selection tick for chips and pickers */
  select: () => on && Haptics.selectionAsync().catch(() => {}),
  /** something worked: posted, accepted, sent */
  success: () => on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** something needs care: cancel, block, decline */
  warn: () => on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
