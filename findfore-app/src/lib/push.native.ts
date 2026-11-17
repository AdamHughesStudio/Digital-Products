import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { cloudUser } from '@/lib/social';
import { supabase } from '@/lib/supabase';

// The iPhone and Android apps' notifications, through Expo's push service. The web app's version,
// with the same functions, is push.ts.

export const VAPID_PUBLIC_KEY = '';

export type PushState = 'unsupported' | 'needs-home-screen' | 'off' | 'on' | 'blocked';

// remembers that the golfer turned notifications off in PlusFore, even though the phone still allows them
const OFF_KEY = 'findfore:push-off';

// show a notification that arrives while the app is open, as the phone would anyway
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
});

/** Nothing to register on the apps; kept so the app's start up reads the same everywhere */
export function registerServiceWorker() {}

async function token(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

async function channel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', { name: 'PlusFore', importance: Notifications.AndroidImportance.HIGH });
}

/** Where this phone stands with notifications right now */
export async function pushState(): Promise<PushState> {
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status === 'denied') return 'blocked';
  if (perm.status !== 'granted') return 'off';
  return (await AsyncStorage.getItem(OFF_KEY)) ? 'off' : 'on';
}

/** Ask permission (after a tap) and link this phone to the account. Returns the new state */
export async function turnOnPush(): Promise<PushState> {
  await channel();
  const perm = await Notifications.requestPermissionsAsync();
  if (perm.status !== 'granted') return perm.status === 'denied' ? 'blocked' : 'off';
  await AsyncStorage.removeItem(OFF_KEY);
  await linkPhoneToAccount();
  return 'on';
}

export async function turnOffPush(): Promise<PushState> {
  await AsyncStorage.setItem(OFF_KEY, '1');
  await unlinkPhoneFromAccount();
  return 'off';
}

/** Tell the account where this phone's notifications go. Safe to call any time. */
export async function linkPhoneToAccount() {
  if (!cloudUser() || (await AsyncStorage.getItem(OFF_KEY))) return;
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') return;
  await channel();
  const t = await token();
  if (!t) return;
  try {
    await supabase.rpc('save_push_device', { p_token: t, p_platform: Platform.OS === 'ios' ? 'ios' : 'android' });
  } catch {
    // tried again next time the app opens
  }
}

/** Stop this phone getting the signed in golfer's notifications, for turning off and signing out */
export async function unlinkPhoneFromAccount() {
  if (!cloudUser()) return;
  const t = await token();
  if (!t) return;
  try {
    await supabase.rpc('remove_push_device', { p_token: t });
  } catch {
    // nothing to remove
  }
}

/** The number on the app icon */
export function setIconBadge(count: number) {
  Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => {});
}

/** Send this phone a notification straight away, through Expo's push service */
export async function sendTestPush(): Promise<{ ok: boolean; error?: string }> {
  const t = await token();
  if (!t) return { ok: false, error: 'Notifications are not turned on' };
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: t, title: 'PlusFore', body: 'Notifications are on. You’ll hear about requests, replies and messages here.', sound: 'default', data: { url: '/settings/notifications' } }),
    });
    return res.ok ? { ok: true } : { ok: false, error: 'Something went wrong' };
  } catch {
    return { ok: false, error: 'Couldn’t reach the server' };
  }
}

/** Call back with the page a tapped notification points to, including the one that opened the app */
export function onNotificationTap(go: (url: string) => void) {
  const open = (r: Notifications.NotificationResponse | null) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) go(url);
  };
  open(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
