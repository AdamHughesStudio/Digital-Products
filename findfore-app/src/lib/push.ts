import { Platform } from 'react-native';

import { cloudUser } from '@/lib/social';
import { supabase } from '@/lib/supabase';

/** The public half of the push key pair. The private half lives only on the server */
export const VAPID_PUBLIC_KEY = 'BJ4OfRqsYrjGkxFHtFaZooxUCCx7LAMrfOoJR0gOrR9WlLfIZpjYINBYeEulUitnPiuOiuf2peddMHqcwvXMAtM';

export type PushState = 'unsupported' | 'needs-home-screen' | 'off' | 'on' | 'blocked';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
const standalone = () =>
  isWeb && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** Register the service worker once, early, so a push can arrive even before settings are opened */
export function registerServiceWorker() {
  if (!isWeb || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function keyBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Where this phone stands with push right now */
export async function pushState(): Promise<PushState> {
  if (!isWeb) return 'unsupported';
  const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  // iPhone only offers push to apps opened from the Home Screen
  if (!capable) return /iPhone|iPad/.test(navigator.userAgent) && !standalone() ? 'needs-home-screen' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  return (await currentSubscription()) ? 'on' : 'off';
}

/** Ask permission (must follow a tap) and subscribe this phone. Returns the new state */
export async function turnOnPush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (!existing) await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  await linkPhoneToAccount();
  return 'on';
}

export async function turnOffPush(): Promise<PushState> {
  await unlinkPhoneFromAccount();
  const sub = await currentSubscription();
  await sub?.unsubscribe();
  return 'off';
}

/**
 * Tell the account this phone can receive notifications, so the server knows where to send them.
 * Safe to call any time: it does nothing unless signed in with notifications on.
 */
export async function linkPhoneToAccount() {
  if (!isWeb || !cloudUser() || !('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
  try {
    const sub = (await currentSubscription())?.toJSON();
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;
    await supabase.rpc('save_push_subscription', { p_endpoint: sub.endpoint, p_p256dh: sub.keys.p256dh, p_auth: sub.keys.auth, p_user_agent: navigator.userAgent });
  } catch {
    // tried again next time the app opens
  }
}

/** Stop this phone getting the signed in golfer's notifications, for turning off and signing out */
export async function unlinkPhoneFromAccount() {
  if (!isWeb || !cloudUser() || !('serviceWorker' in navigator)) return;
  try {
    const sub = await currentSubscription();
    if (sub) await supabase.rpc('remove_push_subscription', { p_endpoint: sub.endpoint });
  } catch {
    // nothing to remove
  }
}

/** The number on the Home Screen icon, where the phone supports it */
export function setIconBadge(count: number) {
  if (!isWeb) return;
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  if (count > 0) nav.setAppBadge?.(count).catch(() => {});
  else nav.clearAppBadge?.().catch(() => {});
}

/** Ask the server to send this phone a notification straight away */
export async function sendTestPush(): Promise<{ ok: boolean; error?: string }> {
  const sub = await currentSubscription();
  if (!sub) return { ok: false, error: 'Notifications are not turned on' };
  try {
    const res = await fetch('/api/push-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), title: 'FindFore', body: 'Notifications are on. You’ll hear about requests, replies and messages here.', url: '/settings/notifications' }),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: json.error ?? 'Something went wrong' };
  } catch {
    return { ok: false, error: 'Couldn’t reach the server' };
  }
}
