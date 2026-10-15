import { createLocalStore } from './local-store';

/** Which notifications someone wants. Kept on this device for the preview */
export interface NotificationPrefs {
  gameRequests: boolean;
  messages: boolean;
  friendRequests: boolean;
  gameReminders: boolean;
  entriesOpening: boolean;
  friendsInterested: boolean;
  weeklyEmail: boolean;
}

const store = createLocalStore<NotificationPrefs>('findfore:notification-prefs', {
  gameRequests: true,
  messages: true,
  friendRequests: true,
  gameReminders: true,
  entriesOpening: true,
  friendsInterested: true,
  weeklyEmail: false,
});

export const useNotificationPrefs = store.use;
export function setNotificationPref(key: keyof NotificationPrefs, on: boolean) {
  store.set({ ...store.get(), [key]: on });
}
